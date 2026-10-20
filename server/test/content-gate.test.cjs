const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-content-gate-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-content-gate-secret';

const express = require('express');
const { query } = require('../dist/config/db');
const { signToken } = require('../dist/middleware/auth');
const app = express();
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('../dist/routes/verification').verificationRouter, require('../dist/routes/auth').authRouter);
app.use('/api/projects', require('../dist/routes/projects').projectsRouter);
app.use('/api/patterns', require('../dist/routes/patterns').patternsRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

const SECRET_WORK = '门禁作品标题-不应出现在匿名响应';
const SECRET_RESOURCE = '门禁资源标题-不应出现在匿名响应';
const SECRET_POST = '门禁帖子供述-不应出现在匿名响应';
const SECRET_COMMENT = '门禁评论正文-不应出现在匿名响应';
const SECRET_PATTERN = '门禁图纸标题-不应出现在匿名响应';
const SECRET_PATTERN_COMMENT = '门禁图纸评论-不应出现在匿名响应';
const SECRET_GRID = '#A1B2C3';
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

test('anonymous readers get no works, resources, posts, comments or images', async (t) => {
  const coverName = `${randomUUID()}.jpg`;
  const coverDir = path.join(path.dirname(process.env.DB_PATH), 'covers');
  fs.mkdirSync(coverDir, { recursive: true });
  fs.writeFileSync(path.join(coverDir, coverName), jpeg);
  const coverPath = `/projects/covers/${coverName}`;

  const userId = (await query(
    'INSERT INTO users (username, email, password_hash, email_verified) VALUES (?, ?, ?, 1)',
    ['门禁读者', 'gate@test.invalid', 'unused-test-hash'],
  )).insertId;
  const token = signToken({ userId, plan: 'free' });
  const workId = (await query(
    "INSERT INTO projects (user_id, title, summary, category, demo_url, confession, cover_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')",
    [userId, SECRET_WORK, '作品摘要密文', '网页小玩具', 'https://example.invalid/work', SECRET_POST, coverPath],
  )).insertId;
  const resourceId = (await query(
    "INSERT INTO projects (user_id, title, summary, category, demo_url, repo_url, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')",
    [userId, SECRET_RESOURCE, '资源摘要密文', 'GitHub 实用项目', 'https://github.com/example-owner/gated-tool', 'https://github.com/example-owner/gated-tool'],
  )).insertId;
  await query('INSERT INTO project_comments (project_id, user_id, content) VALUES (?, ?, ?)', [workId, userId, SECRET_COMMENT]);
  const patternId = (await query(
    'INSERT INTO patterns (user_id, title, description, category, brand, grid_size, grid_data, thumbnail_url, is_public, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)',
    [userId, SECRET_PATTERN, '图纸说明密文', 'animals', 'perler', 2, JSON.stringify([[SECRET_GRID]]), coverPath],
  )).insertId;
  await query('INSERT INTO comments (user_id, pattern_id, content) VALUES (?, ?, ?)', [userId, patternId, SECRET_PATTERN_COMMENT]);

  const server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });

  const secrets = [SECRET_WORK, SECRET_RESOURCE, SECRET_POST, SECRET_COMMENT, SECRET_PATTERN, SECRET_PATTERN_COMMENT, SECRET_GRID, coverName];

  async function raw(url, tokenValue) {
    return fetch(base + url, { headers: tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {} });
  }
  async function bodyOf(response) {
    const type = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    return { type, bytes, text: bytes.toString('utf8') };
  }
  function assertNoSecrets(payload) {
    for (const secret of secrets) assert.equal(payload.text.includes(secret), false, secret);
    assert.equal(payload.bytes.includes(jpeg), false);
    assert.equal(payload.type.includes('image/'), false);
  }

  const gated = [
    ['works list', '/api/projects', SECRET_WORK],
    ['resource area', `/api/projects?category=${encodeURIComponent('GitHub 实用项目')}`, SECRET_RESOURCE],
    ['post detail', `/api/projects/${workId}`, SECRET_POST],
    ['comments', `/api/projects/${workId}/comments`, SECRET_COMMENT],
    ['pattern works', '/api/patterns', SECRET_PATTERN],
    ['pattern detail', `/api/patterns/${patternId}`, SECRET_GRID],
    ['pattern comments', `/api/patterns/${patternId}/comments`, SECRET_PATTERN_COMMENT],
  ];

  await t.test('anonymous and invalid tokens receive 401 and no content', async () => {
    for (const [name, url] of gated) {
      for (const presented of [undefined, 'not-a-token']) {
        const response = await raw(url, presented);
        const payload = await bodyOf(response);
        assert.equal(response.status, 401, `${name} ${presented || 'anonymous'}: ${payload.text}`);
        assertNoSecrets(payload);
        assert.equal(JSON.parse(payload.text).code, 'AUTH_REQUIRED');
      }
    }
    for (const url of [`/api${coverPath}`, `/api${coverPath}?variant=thumbnail`]) {
      const response = await raw(url);
      const payload = await bodyOf(response);
      assert.equal(response.status, 401, url);
      assertNoSecrets(payload);
    }
  });

  await t.test('a logged-in reader can load every gated class', async () => {
    const list = await raw('/api/projects', token);
    const listBody = await bodyOf(list);
    assert.equal(list.status, 200);
    assert.equal(listBody.text.includes(SECRET_WORK), true);
    const resources = await raw(`/api/projects?category=${encodeURIComponent('GitHub 实用项目')}`, token);
    assert.equal((await bodyOf(resources)).text.includes(SECRET_RESOURCE), true);
    const detail = await raw(`/api/projects/${workId}`, token);
    assert.equal((await bodyOf(detail)).text.includes(SECRET_POST), true);
    const comments = await raw(`/api/projects/${workId}/comments`, token);
    assert.equal((await bodyOf(comments)).text.includes(SECRET_COMMENT), true);
    const patterns = await raw('/api/patterns', token);
    const patternText = (await bodyOf(patterns)).text;
    assert.equal(patternText.includes(SECRET_PATTERN), true);
    assert.equal(patternText.includes(SECRET_GRID), true);
    const pattern = await raw(`/api/patterns/${patternId}`, token);
    assert.equal((await bodyOf(pattern)).text.includes(coverPath), true);
    const patternComments = await raw(`/api/patterns/${patternId}/comments`, token);
    assert.equal((await bodyOf(patternComments)).text.includes(SECRET_PATTERN_COMMENT), true);
    for (const url of [`/api${coverPath}`, `/api${coverPath}?variant=thumbnail`]) {
      const image = await raw(url, token);
      const payload = await bodyOf(image);
      assert.equal(image.status, 200, url);
      assert.match(payload.type, /image\/jpeg/);
      assert.deepEqual(payload.bytes, jpeg);
      assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
      assert.match(image.headers.get('cache-control') || '', /private/);
    }
  });

  await t.test('register, login, captcha and health stay reachable without a content token', async () => {
    const health = await raw('/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    const captcha = await raw('/api/auth/captcha');
    const captchaBody = await captcha.json();
    assert.equal(captcha.status, 200);
    assert.equal(typeof captchaBody.captchaId, 'string');
    assert.equal(captchaBody.svgBase64.length > 0, true);
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(login.status, 400);
    const register = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(register.status, 400);
    const sendCode = await fetch(base + '/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(sendCode.status, 400);
    assert.equal((await raw(`/api/projects/${resourceId}`)).status, 401);
    assert.equal((await raw(`/api/projects/${resourceId}`, token)).status, 200);
  });
});
