const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-multi-url-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'multi-url-isolated-test-secret';
process.env.RESOURCE_REGISTRY_KEY = 'multi-url-isolated-registry-secret-12345';
process.env.RESOURCE_REGISTRY_SITE_PROJECT = 'PRJ-0008';
process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE = 'yes';
const express = require('express');
const { query } = require('../dist/config/db');
require('../dist/config/db').enableResourceRegistryMigration();
const { checkResource } = require('../dist/routes/resource-registry');
const { signToken } = require('../dist/middleware/auth');
const app = express();
app.use(express.json());
app.use('/projects', require('../dist/routes/projects').projectsRouter);
app.use('/admin', require('../dist/routes/admin').adminRouter);
app.use('/registry', require('../dist/routes/resource-registry').resourceRegistryRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('both website URLs are checked together and lifecycle changes preserve the right aliases', async t => {
  await require('../dist/resource-backfill').backfillResources('PRJ-0008', '网站', [], true);
  const user = async (name, admin = 0) => {
    const { insertId } = await query('INSERT INTO users (username,email,password_hash,email_verified,is_admin) VALUES (?, ?, ?, 1, ?)', [name, `${name}@example.invalid`, 'unused', admin]);
    return signToken({ userId: insertId, plan: 'free' });
  };
  const one = await user('one'), two = await user('two'), three = await user('three'), four = await user('four'), admin = await user('admin', 1);
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (url, token, method, body) => {
    const response = await fetch(base + url, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const draft = (repoUrl, demoUrl) => ({ title: '测试作品', summary: '测试简介', category: 'GitHub 实用项目', repoUrl, demoUrl, acceptedRules: true });
  const repo = 'https://github.com/example/repo', first = 'https://example.com/demo-a', second = 'https://example.com/demo-b';
  const made = await call('/projects', one, 'POST', draft(repo, first));
  assert.equal(made.status, 201);
  assert.equal((await call('/projects', two, 'POST', draft('https://github.com/example/other', first))).status, 409, '相同演示链接必须拦截');
  assert.equal((await call(`/projects/${made.data.id}`, one, 'PUT', { ...draft(repo, second), revision: 1 })).status, 200);
  await assert.rejects(checkResource({ requestId: `website:${made.data.id}:1`, project: 'PRJ-0008', channel: '网站', urls: [repo, first] }), /原登记已变化/);
  assert.equal((await call('/projects', two, 'POST', draft('https://github.com/example/other', first))).status, 201, '未公开旧演示链接应释放');
  assert.equal((await call(`/projects/${made.data.id}`, one, 'PUT', { ...draft(repo, first), revision: 2 })).status, 409, '来源冲突应回滚整个修改');
  assert.equal((await call(`/admin/projects/${made.data.id}`, admin, 'PUT', { action: 'approve', revision: 2 })).status, 200);
  assert.equal((await call(`/projects/${made.data.id}/withdraw`, one, 'POST', { revision: 3 })).status, 200);
  for (const [i, url] of [repo, second].entries()) {
    const result = await call('/registry/check', process.env.RESOURCE_REGISTRY_KEY, 'POST', { requestId: `published-${i}`, project: 'PRJ-0008', channel: '其他频道', url });
    assert.equal(result.data.duplicate, true, '已发布作品的两个来源必须保留');
  }
  const race = await Promise.all([
    call('/projects', three, 'POST', draft('https://github.com/example/race', 'https://example.com/race')),
    call('/projects', four, 'POST', draft('https://github.com/example/race-other', 'https://example.com/race')),
  ]);
  assert.deepEqual(race.map(item => item.status).sort(), [201, 409]);
});
