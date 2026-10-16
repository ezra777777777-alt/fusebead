const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-auth-test-'));
process.env.DB_PATH = path.join(temporary, 'auth.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-auth-tests-only';
process.env.MAIL_DELIVERY = 'local';
process.env.LOCAL_MAIL_DIR = path.join(temporary, 'mail');
const express = require('express');
const { query } = require('../dist/config/db');
const codes = require('../dist/models/verificationCode');
const users = require('../dist/models/user');
const mailer = require('../dist/utils/mailer');
const { authMiddleware, optionalAuth } = require('../dist/middleware/auth');
const actualDelivery = mailer.sendVerificationCode;
const messages = [];
let failMail = false;
require('nodemailer').createTransport = () => { throw new Error('Tests must never contact SMTP'); };
mailer.sendVerificationCode = async (email, code, type) => {
  if (failMail) throw new Error('simulated delivery failure');
  await actualDelivery(email, code, type);
  messages.push({ email, code, type });
};
const app = express();
app.use(express.json());
app.use('/api/auth', require('../dist/routes/verification').verificationRouter, require('../dist/routes/auth').authRouter);
app.use('/api/user', require('../dist/routes/user').userRouter);
app.get('/protected', authMiddleware, (req, res) => res.json({ id: req.user.userId }));
app.get('/optional', optionalAuth, (req, res) => res.json({ id: req.user?.userId || null }));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('registration, mail verification and recovery', async t => {
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  async function api(route, body, expected = 200, token, method = 'POST') {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, expected, `${route}: ${JSON.stringify(data)}`);
    return data;
  }
  let sequence = 0;
  async function captcha() {
    const captchaId = `auth-test-${++sequence}`;
    await codes.create({ email: captchaId, code: 'TEST', type: 'captcha' });
    return { captchaId, captchaText: 'TEST' };
  }
  const password = 'Local-Initial-Password-2026';
  const nextPassword = 'Local-Changed-Password-2026';
  const email = 'flow@test.invalid';
  const latest = (address, type) => messages.filter(m => m.email === address && m.type === type).at(-1).code;
  const register = async (address, more = {}) => api('/api/auth/register', { username: '邮箱测试', email: address, password, acceptedTerms: true, ...await captcha(), ...more }, 201);
  const login = async (address, pass = password, status = 200) => api('/api/auth/login', { email: address, password: pass, ...await captcha() }, status);
  const releaseCooldown = address => query("UPDATE verification_codes SET created_at = datetime('now', '-61 seconds') WHERE email = ?", [address]);
  let token;
  await t.test('registration validates agreement, password bytes and normalized duplicate emails', async () => {
    const cap = await captcha();
    const body = { username: '邮箱测试', email: ' Flow@Test.Invalid ', password, ...cap };
    await api('/api/auth/register', body, 400);
    await api('/api/auth/register', { ...body, acceptedTerms: true, password: 'short' }, 400);
    await api('/api/auth/register', { ...body, acceptedTerms: true, password: '密'.repeat(25) }, 400);
    const result = await api('/api/auth/register', { ...body, acceptedTerms: true }, 201);
    assert.equal(result.email, email);
    assert.equal(result.emailSent, true);
    assert.equal(result.token, undefined);
    assert.equal((await users.findByEmail(email)).email_verified, 0);
    await api('/api/auth/register', { ...body, acceptedTerms: true, ...await captcha() }, 409);
    const pending = await login(email, password, 403);
    assert.equal(pending.code, 'EMAIL_UNVERIFIED');
  });
  await t.test('local email contains real template, recipient and code, without SMTP', async () => {
    const files = fs.readdirSync(process.env.LOCAL_MAIL_DIR);
    assert.equal(files.length, 1);
    const filename = path.join(process.env.LOCAL_MAIL_DIR, files[0]);
    const mail = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(mail.to, email);
    assert.match(mail.subject, /赛博搬屎.*邮箱验证码/);
    assert.ok(mail.html.includes(latest(email, 'email_verify')));
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { await assert.rejects(actualDelivery(email, '123456'), /non-production/); }
    finally { if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv; }
  });
  await t.test('resend cooldown and replacement invalidate the old code', async () => {
    const old = latest(email, 'email_verify');
    await api('/api/auth/send-code', { email, ...await captcha() }, 429);
    await releaseCooldown(email);
    const crypto = require('node:crypto');
    const randomInt = crypto.randomInt;
    let draws = 0;
    crypto.randomInt = () => draws++ === 0 ? Number(old) : (Number(old) === 999999 ? 100000 : Number(old) + 1);
    try { await api('/api/auth/send-code', { email, ...await captcha() }); }
    finally { crypto.randomInt = randomInt; }
    const fresh = latest(email, 'email_verify');
    assert.notEqual(fresh, old);
    await api('/api/auth/verify-code', { email, code: old }, 400);
    const verified = await api('/api/auth/verify-code', { email: 'FLOW@Test.Invalid', code: fresh });
    token = verified.token;
    assert.equal(verified.user.contribution_points, 0);
    await api('/api/auth/verify-code', { email, code: fresh }, 400);
    assert.equal((await api('/protected', undefined, 200, token, 'GET')).id, verified.user.id);
  });
  await t.test('verified and unknown addresses cannot request new activation codes', async () => {
    const count = messages.length;
    await api('/api/auth/send-code', { email, ...await captcha() });
    await api('/api/auth/send-code', { email: 'missing@test.invalid', ...await captcha() });
    assert.equal(messages.length, count);
    await codes.create({ email, code: '123456', type: 'email_verify' });
    await api('/api/auth/verify-code', { email, code: '123456' }, 400);
  });
  await t.test('expired codes, five wrong guesses and banned activation are rejected', async () => {
    const address = 'expiry@test.invalid';
    await register(address);
    const expired = latest(address, 'email_verify');
    await query("UPDATE verification_codes SET expires_at = datetime('now', '-1 seconds') WHERE email = ?", [address]);
    await api('/api/auth/verify-code', { email: address, code: expired }, 400);
    await codes.create({ email: address, code: '123456', type: 'email_verify' });
    for (let i = 0; i < 5; i++) await api('/api/auth/verify-code', { email: address, code: '000000' }, 400);
    await api('/api/auth/verify-code', { email: address, code: '123456' }, 400);
    assert.equal((await query("SELECT attempts FROM verification_codes WHERE email = ? AND type = 'email_verify'", [address]))[0].attempts, 5);
    await query('UPDATE users SET is_banned = 1 WHERE email = ?', [address]);
    await codes.create({ email: address, code: '654321', type: 'email_verify' });
    await api('/api/auth/verify-code', { email: address, code: '654321' }, 400);
    assert.equal((await users.findByEmail(address)).email_verified, 0);
  });
  await t.test('concurrent resend sends a single message', async () => {
    const address = 'concurrent@test.invalid';
    await register(address); await releaseCooldown(address);
    const count = messages.length;
    const bodies = await Promise.all([1, 2, 3].map(async () => ({ email: address, ...await captcha() })));
    const responses = await Promise.all(bodies.map(body => fetch(base + '/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 429, 429]);
    assert.equal(messages.length, count + 1);
  });
  await t.test('mail failure is recoverable without phantom codes or a false sent notice', async () => {
    const address = 'delivery@test.invalid';
    failMail = true;
    try {
      assert.equal((await register(address)).emailSent, false);
      assert.equal((await query('SELECT COUNT(*) AS count FROM verification_codes WHERE email = ?', [address]))[0].count, 0);
      await api('/api/auth/send-code', { email: address, ...await captcha() }, 503);
      await api('/api/auth/forgot-password', { email: address });
    } finally { failMail = false; }
    await api('/api/auth/send-code', { email: address, ...await captcha() });
    await api('/api/auth/verify-code', { email: address, code: latest(address, 'email_verify') });
  });
  await t.test('forgot password response does not reveal account existence or send duplicates', async () => {
    const missing = await api('/api/auth/forgot-password', { email: 'missing@test.invalid' });
    assert.deepEqual(await api('/api/auth/forgot-password', { email }), missing);
    const count = messages.length;
    assert.deepEqual(await api('/api/auth/forgot-password', { email }), missing);
    assert.equal(messages.length, count);
  });
  await t.test('reset validates code, password and atomically rolls back on storage failure', async () => {
    const code = latest(email, 'password_reset');
    await api('/api/auth/reset-password', { email, code, password: 'short' }, 400);
    await api('/api/auth/reset-password', { email, code, password: 'a'.repeat(73) }, 400);
    await api('/api/auth/reset-password', { email, code: '000000', password: nextPassword }, 400);
    const update = users.updatePassword;
    users.updatePassword = async () => { throw new Error('simulated write failure'); };
    try { await api('/api/auth/reset-password', { email, code, password: nextPassword }, 500); }
    finally { users.updatePassword = update; }
    assert.ok((await login(email)).token);
    await api('/api/auth/reset-password', { email, code, password: nextPassword });
    await api('/api/auth/reset-password', { email, code, password: 'Different-New-Password' }, 400);
    await login(email, password, 401);
    const session = await login(email, nextPassword);
    await api('/protected', undefined, 401, token, 'GET');
    await api('/api/user/me/refresh-token', undefined, 401, token);
    assert.equal((await api('/optional', undefined, 200, token, 'GET')).id, null);
    await api('/api/user/me', undefined, 200, session.token, 'GET');
    const refreshed = await api('/api/user/me/refresh-token', undefined, 200, session.token);
    await api('/protected', undefined, 200, refreshed.token, 'GET');
    assert.equal((await query('SELECT COUNT(*) AS count FROM verification_codes WHERE email = ?', [email]))[0].count, 0);
  });
  await t.test('reset expiry, attempt lockout and concurrent consumption are enforced', async () => {
    await codes.create({ email, code: '123456', type: 'password_reset', ttlMinutes: -1 });
    await api('/api/auth/reset-password', { email, code: '123456', password }, 400);
    await codes.create({ email, code: '123456', type: 'password_reset' });
    for (let i = 0; i < 5; i++) await api('/api/auth/reset-password', { email, code: '000000', password }, 400);
    await api('/api/auth/reset-password', { email, code: '123456', password }, 400);
    await codes.create({ email, code: '654321', type: 'password_reset' });
    const results = await Promise.all([1, 2].map(() => fetch(base + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: '654321', password }) })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
    assert.ok((await login(email)).token);
  });
  await t.test('malformed authentication payloads return validation errors', async () => {
    for (const route of ['register', 'login', 'forgot-password', 'send-code', 'verify-code', 'reset-password']) {
      await api(`/api/auth/${route}`, { email: {}, code: [], password: {} }, 400);
    }
  });
  await t.test('database reopen preserves verification attempts and session versions', async () => {
    await query("UPDATE verification_codes SET attempts = 4 WHERE email = 'expiry@test.invalid'");
    const expected = (await users.findByEmail(email)).token_version;
    const output = execFileSync(process.execPath, ['-e', "const {query}=require('./dist/config/db'); Promise.all([query(\"SELECT token_version FROM users WHERE email='flow@test.invalid'\"), query(\"SELECT attempts FROM verification_codes WHERE email='expiry@test.invalid'\")]).then(x=>process.stdout.write(JSON.stringify(x)))"], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8' });
    assert.equal(JSON.parse(output)[0][0].token_version, expected);
    assert.equal(JSON.parse(output)[1][0].attempts, 4);
  });
});
