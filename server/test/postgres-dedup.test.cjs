const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');

test('PostgreSQL shared registry serializes concurrent claims and backfills history', { skip: !process.env.PG_TEST_DATABASE_URL }, async t => {
  const url = new URL(process.env.PG_TEST_DATABASE_URL);
  assert.equal(url.hostname, 'localhost', 'Only a local disposable database is permitted');
  assert.match(url.pathname, /^\/fusebead_releasecheck_[a-z0-9_]+$/, 'Use a disposable database, never production');
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = 'isolated-postgres-registry-test-secret';
  process.env.RESOURCE_REGISTRY_KEY = 'isolated-postgres-registry-key-123456789';
  process.env.RESOURCE_REGISTRY_SITE_PROJECT = 'PRJ-0008';
  process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE = 'yes';
  const { query } = require('../dist/config/db');
  const { signToken } = require('../dist/middleware/auth');
  const { backfillResources } = require('../dist/resource-backfill');
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/registry', require('../dist/routes/resource-registry').resourceRegistryRouter);
  app.use('/projects', require('../dist/routes/projects').projectsRouter);
  app.use('/admin', require('../dist/routes/admin').adminRouter);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, body, token, method = 'POST') => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const registry = body => call('/registry/check', body, process.env.RESOURCE_REGISTRY_KEY);
  const uid = randomUUID();
  const { insertId } = await query('INSERT INTO users (username,email,password_hash,email_verified) VALUES (?, ?, ?, 1)', ['isolated', `${uid}@test.invalid`, 'unused']);
  const author = signToken({ userId: insertId, plan: 'free' });
  const legacyUrl = `https://github.com/isolated/legacy-${uid}`;
  await query("INSERT INTO projects (user_id,title,summary,category,demo_url,repo_url,status) VALUES (?, '历史测试', '测试', 'GitHub 实用项目', ?, ?, 'approved')", [insertId, legacyUrl, legacyUrl]);
  const hash = createHash('sha256').update(legacyUrl).digest('hex');
  const legacy = [{ sourceId: 'local-dedup:1', project: 'PRJ-0008', channel: '网站历史', aliases: [`url:${hash}`] }];
  assert.deepEqual(await backfillResources('PRJ-0008', '网站', legacy, false, ['网站历史']), { website: 1, legacy: 1, merged: 1 });
  assert.equal(Number((await query('SELECT COUNT(*) AS n FROM resource_entries'))[0].n), 0);
  assert.deepEqual(await backfillResources('PRJ-0008', '网站', legacy, true, ['网站历史']), { website: 1, legacy: 1, merged: 1 });
  assert.deepEqual(await backfillResources('PRJ-0008', '网站', legacy, true, ['网站历史']), { website: 1, legacy: 1, merged: 0 });
  const preview = { requestId: `feishu-preview-${uid}`, project: 'PRJ-0008', channel: '网站', url: `https://github.com/isolated/preview-${uid}`, preview: true };
  assert.deepEqual((await registry(preview)).data, { duplicate: false, preview: true });
  const previewDraft = { title: '预查后投稿', summary: '测试', category: 'GitHub 实用项目', repoUrl: preview.url, acceptedRules: true };
  assert.equal((await call('/projects', previewDraft, author)).status, 201);
  assert.equal((await registry(preview)).data.duplicate, true);

  const common = { project: 'PRJ-0008', channel: '网站', reserveWebsite: true, url: `https://github.com/isolated/race-${uid}` };
  const attempts = await Promise.all(Array.from({ length: 12 }, (_, i) => registry({ ...common, requestId: `race-${uid}-${i}` })));
  assert.equal(attempts.filter(r => r.status === 200 && !r.data.duplicate).length, 1, 'Only one concurrent request may reserve the source');
  assert.ok(attempts.every(r => r.status === 200 || r.status === 409), JSON.stringify(attempts));
  const retries = await Promise.all(attempts.map((_, i) => registry({ ...common, requestId: `race-${uid}-${i}` })));
  assert.equal(retries.filter(r => r.status === 200 && !r.data.duplicate).length, 1);
  assert.ok(retries.every(r => r.status === 200), JSON.stringify(retries));
  const repeat = { ...common, requestId: `retry-${uid}`, url: `https://example.com/retry-${uid}` };
  const repeated = await Promise.all(Array.from({ length: 8 }, () => registry(repeat)));
  assert.ok(repeated.every(r => r.status === 200 && !r.data.duplicate && r.data.id === repeated[0].data.id), JSON.stringify(repeated));
  const content = `完整内容并发查重测试，需要超过三十个字符。${uid}，相同内容来自多个不同链接。`;
  const mixed = Array.from({ length: 8 }, (_, i) => ({ ...common, requestId: `mixed-${uid}-${i}`, url: `https://example.com/${uid}/${i}`, content }));
  const mixedAttempts = await Promise.all(mixed.map(registry));
  assert.equal(mixedAttempts.filter(r => r.status === 200 && !r.data.duplicate).length, 1, JSON.stringify(mixedAttempts));
  assert.ok(mixedAttempts.every(r => r.status === 200 || r.status === 409), JSON.stringify(mixedAttempts));
  const mixedRetries = await Promise.all(mixed.map(registry));
  assert.ok(mixedRetries.every(r => r.status === 200), JSON.stringify(mixedRetries));
  assert.equal(mixedRetries.filter(r => !r.data.duplicate).length, 1);
  const winner = retries.findIndex(r => !r.data.duplicate);
  const draft = { title: '并发查重测试', summary: '独立测试', category: 'GitHub 实用项目', repoUrl: common.url, acceptedRules: true };
  const proof = { requestId: `race-${uid}-${winner}`, token: retries[winner].data.claimToken };
  const created = await call('/projects', { ...draft, registryProof: proof }, author);
  assert.equal(created.status, 201, JSON.stringify(created));
  assert.equal((await call('/projects', { ...draft, title: '重复', registryProof: proof }, author)).status, 409);
  assert.equal((await registry({ ...common, requestId: `after-${uid}`, channel: '其他频道', reserveWebsite: false })).data.duplicate, true);
  const another = await query('INSERT INTO users (username,email,password_hash,email_verified) VALUES (?, ?, ?, 1)', ['second', `second-${uid}@test.invalid`, 'unused']);
  const secondAuthor = signToken({ userId: another.insertId, plan: 'free' });
  const simultaneous = { ...draft, title: '网站与 Bot 并发测试', repoUrl: `https://github.com/isolated/competition-${uid}` };
  const competing = await Promise.all([
    call('/projects', simultaneous, author),
    call('/projects', simultaneous, secondAuthor),
    registry({ ...common, url: simultaneous.repoUrl, requestId: `competition-${uid}` }),
  ]);
  const winners = competing.slice(0, 2).filter(r => r.status === 201).length + Number(competing[2].status === 200 && !competing[2].data.duplicate);
  assert.equal(winners, 1, JSON.stringify(competing));
  assert.ok(competing.slice(0, 2).every(r => [201, 409].includes(r.status)), JSON.stringify(competing));
  assert.ok([200, 409].includes(competing[2].status), JSON.stringify(competing));
});
