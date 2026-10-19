const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-lifecycle-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'resource-lifecycle-isolated-test-secret';
process.env.RESOURCE_REGISTRY_KEY = 'resource-lifecycle-isolated-test-secret-12345';
process.env.RESOURCE_REGISTRY_SITE_PROJECT = 'PRJ-0008';
process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE = 'yes';
const express = require('express');
const { query } = require('../dist/config/db');
require('../dist/config/db').enableResourceRegistryMigration();
const { signToken } = require('../dist/middleware/auth');
const { checkResource } = require('../dist/routes/resource-registry');
const app = express();
app.use(express.json());
app.use('/projects', require('../dist/routes/projects').projectsRouter);
app.use('/admin', require('../dist/routes/admin').adminRouter);
app.use('/registry', require('../dist/routes/resource-registry').resourceRegistryRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('unpublished website-only reservations release safely; published and bot reservations remain', async t => {
  await require('../dist/resource-backfill').backfillResources('PRJ-0008', '网站', [], true);
  const user = async (name, admin = 0) => {
    const { insertId } = await query('INSERT INTO users (username,email,password_hash,email_verified,is_admin) VALUES (?, ?, ?, 1, ?)', [name, `${name}@example.invalid`, 'unused', admin]);
    return signToken({ userId: insertId, plan: 'free' });
  };
  const one = await user('one'), two = await user('two'), three = await user('three'), four = await user('four'), admin = await user('admin', 1);
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  const request = async (url, token, method = 'GET', body) => {
    const response = await fetch(base + url, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const draft = url => ({ title: '资源', summary: '介绍资源', category: 'GitHub 实用项目', repoUrl: url, acceptedRules: true });
  const oldUrl = 'https://github.com/owner/old', newUrl = 'https://github.com/owner/new';
  const made = await request('/projects', one, 'POST', draft(oldUrl));
  assert.equal(made.status, 201);
  assert.equal((await request(`/projects/${made.data.id}`, one, 'PUT', { ...draft(newUrl), revision: 1 })).status, 200);
  assert.equal((await request('/projects', two, 'POST', draft(oldUrl))).status, 201, '未公开的旧来源修改后可重新投稿');
  assert.equal((await query("SELECT action FROM resource_events WHERE action = 'changed'")).length, 1);
  await assert.rejects(checkResource({ requestId: `website:${made.data.id}:1`, project: 'PRJ-0008', channel: '网站', url: oldUrl }), /原登记已释放/);

  let updated = (await request(`/projects/${made.data.id}`, one)).data;
  assert.equal((await request(`/admin/projects/${made.data.id}`, admin, 'PUT', { action: 'reject', note: '请补充', revision: updated.revision })).status, 200);
  assert.equal((await request('/projects', three, 'POST', draft(newUrl))).status, 201, '退回的未公开来源可重新投稿');
  assert.equal((await query("SELECT action FROM resource_events WHERE action = 'rejected'")).length, 1);

  const visible = await request('/projects', two, 'POST', draft('https://github.com/owner/published'));
  assert.equal(visible.status, 201);
  assert.equal((await request(`/admin/projects/${visible.data.id}`, admin, 'PUT', { action: 'approve', revision: 1 })).status, 200);
  updated = (await request(`/projects/${visible.data.id}`, two)).data;
  assert.equal((await request(`/projects/${visible.data.id}/withdraw`, two, 'POST', { revision: updated.revision })).status, 200);
  const checked = await request('/registry/check', process.env.RESOURCE_REGISTRY_KEY, 'POST', { requestId: 'published-check', project: 'PRJ-0008', channel: '其他频道', url: 'https://github.com/owner/published' });
  assert.equal(checked.data.duplicate, true, '曾经公开的记录必须保留');

  const reservedUrl = 'https://github.com/owner/bot-reserved';
  const reserved = await request('/registry/check', process.env.RESOURCE_REGISTRY_KEY, 'POST', { requestId: 'cli:reserved', project: 'PRJ-0008', channel: '其他频道', url: reservedUrl });
  assert.equal(reserved.data.duplicate, false);
  assert.equal((await request('/projects', three, 'POST', draft(reservedUrl))).status, 409, '其他频道已登记的来源不能重复投稿');
  assert.equal((await request('/registry/check', process.env.RESOURCE_REGISTRY_KEY, 'POST', { requestId: 'bot-check', project: 'PRJ-0008', channel: '其他频道', url: reservedUrl })).data.duplicate, true, '其他频道登记必须保留');

  const importedUrl = 'https://github.com/owner/imported';
  const importedProject = await request('/projects', four, 'POST', draft(importedUrl));
  assert.equal(importedProject.status, 201);
  const [importedEntry] = await query('SELECT id FROM resource_entries WHERE website_project_id = ?', [importedProject.data.id]);
  await query('INSERT INTO resource_imports (source_id, fingerprint, entry_id) VALUES (?, ?, ?)', ['local-dedup:99', 'test-fingerprint', importedEntry.id]);
  assert.equal((await request(`/projects/${importedProject.data.id}/withdraw`, four, 'POST', { revision: 1 })).status, 200);
  assert.equal((await request('/registry/check', process.env.RESOURCE_REGISTRY_KEY, 'POST', { requestId: 'import-check', project: 'PRJ-0008', channel: '其他频道', url: importedUrl })).data.duplicate, true, '历史导入记录不能被网站单方面释放');
});
