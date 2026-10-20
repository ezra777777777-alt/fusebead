const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const FormData = require('form-data');
const nodemailer = require('nodemailer');
const proxyaddr = require('proxy-addr');
const { request } = require('undici');
const { rateLimit } = require('../dist/middleware/rateLimit');

function atLeast(version, minimum) {
  const left = version.split('.').map(Number);
  const right = minimum.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

function forwardedRequest(remoteAddress, forwarded) {
  return {
    socket: { remoteAddress },
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
  };
}

test('patched proxy-addr keeps loopback trust and rejects a short mapped subnet', async (t) => {
  assert.equal(atLeast(require('proxy-addr/package.json').version, '2.0.8'), true);
  const trust = proxyaddr.compile('loopback');
  assert.equal(proxyaddr(forwardedRequest('127.0.0.1', '203.0.113.10'), trust), '203.0.113.10');
  assert.equal(proxyaddr(forwardedRequest('::1', '203.0.113.10'), trust), '203.0.113.10');
  assert.equal(proxyaddr(forwardedRequest('203.0.113.7', '198.51.100.8'), trust), '203.0.113.7');

  // GHSA-jqcg-44mw-7w3h: a short-prefix IPv4-mapped subnet must not trust every IPv4 address.
  const mapped = proxyaddr.compile('::ffff:10.0.0.0/8');
  assert.equal(mapped('8.8.8.8'), false);
  assert.equal(mapped('203.0.113.9'), false);
  assert.equal(proxyaddr(forwardedRequest('8.8.8.8', '198.51.100.9'), mapped), '8.8.8.8');
  const corrected = proxyaddr.compile('::ffff:10.0.0.0/104');
  assert.equal(corrected('10.1.2.3'), true);
  assert.equal(corrected('8.8.8.8'), false);

  const app = express();
  app.set('trust proxy', 'loopback');
  app.get('/ping', rateLimit(1), (req, res) => {
    res.json({ ip: req.ip });
  });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/ping`;
  async function hit(forwarded) {
    const response = await fetch(base, { headers: { 'X-Forwarded-For': forwarded } });
    return { status: response.status, body: await response.json() };
  }
  const first = await hit('203.0.113.10');
  assert.equal(first.status, 200);
  assert.equal(first.body.ip, '203.0.113.10');
  assert.equal((await hit('203.0.113.10')).status, 429);
  const other = await hit('203.0.113.11');
  assert.equal(other.status, 200);
  assert.equal(other.body.ip, '203.0.113.11');
});

test('nodemailer 10 keeps the verification mail APIs and local delivery stays off SMTP', async () => {
  assert.equal(atLeast(require('nodemailer/package.json').version, '10.1.7'), true);
  const fields = {
    from: 'preview@localhost.invalid',
    to: 'user@test.invalid',
    subject: '赛博搬屎 - 邮箱验证码',
    html: '<div>654321</div>',
  };
  const stream = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  const streamed = await stream.sendMail(fields);
  const raw = streamed.message.toString('utf8');
  assert.match(raw, /To: user@test\.invalid/);
  assert.match(raw, /^Subject: /m);
  assert.match(raw, /654321/);
  assert.deepEqual(streamed.envelope, { from: 'preview@localhost.invalid', to: ['user@test.invalid'] });

  const json = nodemailer.createTransport({ jsonTransport: true });
  const encoded = JSON.parse((await json.sendMail(fields)).message);
  assert.equal(encoded.from.address, 'preview@localhost.invalid');
  assert.equal(encoded.to[0].address, 'user@test.invalid');
  assert.equal(encoded.subject, fields.subject);
  assert.equal(encoded.html, fields.html);

  const smtp = nodemailer.createTransport({
    host: 'smtp.invalid',
    port: 465,
    secure: true,
    auth: { user: 'mailbox', pass: 'secret' },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  assert.equal(smtp.options.host, 'smtp.invalid');
  assert.equal(smtp.options.port, 465);
  assert.equal(smtp.options.secure, true);
  assert.equal(typeof smtp.sendMail, 'function');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-mail-'));
  const original = nodemailer.createTransport;
  nodemailer.createTransport = () => { throw new Error('Tests must never contact SMTP'); };
  process.env.MAIL_DELIVERY = 'local';
  process.env.LOCAL_MAIL_DIR = directory;
  process.env.NODE_ENV = 'test';
  try {
    const { sendVerificationCode } = require('../dist/utils/mailer');
    await sendVerificationCode('user@test.invalid', '654321', 'password_reset');
    const [filename] = fs.readdirSync(directory);
    const mail = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
    assert.equal(mail.from, 'preview@localhost.invalid');
    assert.equal(mail.to, 'user@test.invalid');
    assert.equal(mail.subject, '赛博搬屎 - 重置密码');
    assert.match(mail.html, /654321/);
  } finally {
    nodemailer.createTransport = original;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('undici and form-data still complete a local request body', async () => {
  assert.equal(atLeast(require('undici/package.json').version, '7.29.1'), true);
  assert.equal(atLeast(require('form-data/package.json').version, '4.0.6'), true);
  const form = new FormData();
  form.append('biz_content', JSON.stringify({ out_trade_no: 'local-only' }));
  const payload = form.getBuffer();
  assert.match(payload.toString('utf8'), /local-only/);
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, hasTrade: text.includes('local-only') }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/gateway`;
    const sent = await request(url, { method: 'POST', headers: form.getHeaders(), body: payload });
    assert.equal(sent.statusCode, 200);
    assert.deepEqual(await sent.body.json(), { ok: true, hasTrade: true });
    const fetched = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: 'local' }) });
    assert.equal(fetched.status, 200);
    assert.deepEqual(await fetched.json(), { ok: true, hasTrade: false });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('next is pinned to 16.4.2', () => {
  const root = path.join(__dirname, '..', '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  assert.equal(pkg.dependencies.next, '16.4.2');
  assert.equal(lock.packages[''].dependencies.next, '16.4.2');
  assert.equal(lock.packages['node_modules/next'].version, '16.4.2');
});
