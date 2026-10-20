const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-interaction-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-interaction-tests';
const express = require('express');
const { query } = require('../dist/config/db');
const { signToken } = require('../dist/middleware/auth');
const app = express();
app.use(express.json());
app.use('/api/projects', require('../dist/routes/projects').projectsRouter);
app.use('/api/user', require('../dist/routes/user').userRouter);
app.use('/api/admin', require('../dist/routes/admin').adminRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('search, comments and public profiles', async t => {
  const user = async (name, admin = 0) => (await query('INSERT INTO users (username, email, password_hash, email_verified, is_admin) VALUES (?, ?, ?, 1, ?)', [name, `${name}@test.invalid`, 'unused-test-hash', admin])).insertId;
  const authorId = await user('作品作者');
  const readerId = await user('评论读者');
  const adminId = await user('审核员', 1);
  const author = signToken({ userId: authorId, plan: 'free' });
  const reader = signToken({ userId: readerId, plan: 'free' });
  const admin = signToken({ userId: adminId, plan: 'free' });
  const ids = [];
  for (let i = 0; i < 24; i++) {
    ids.push((await query("INSERT INTO projects (user_id,title,summary,category,demo_url,tech_stack,status) VALUES (?, ?, ?, ?, ?, ?, 'approved')", [authorId, `搜索验收 ${i}${i === 0 ? ' 100%' : ''}${i === 1 ? ' under_score' : ''}${i === 2 ? ' hello!' : ''}`, i === 3 ? '精确简介检索' : '本机搜索样例', i % 2 ? '能跑就行' : '网页小玩具', 'https://example.invalid', i === 4 ? 'React' : '原生网页'])).insertId);
  }
  for (const status of ['pending', 'rejected', 'withdrawn']) await query('INSERT INTO projects (user_id,title,summary,category,demo_url,status) VALUES (?, ?, ?, ?, ?, ?)', [authorId, '隐藏验收', '', '能跑就行', 'https://example.invalid', status]);
  await query("INSERT INTO projects (user_id,title,summary,category,demo_url,status,is_deleted) VALUES (?, '隐藏验收', '', '能跑就行', 'https://example.invalid', 'approved', 1)", [authorId]);
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  async function api(url, token, method = 'GET', body, status = 200) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(data)}`);
    return data;
  }
  const search = (term, extra = '') => api(`/api/projects?search=${encodeURIComponent(term)}${extra}`, reader);
  await t.test('search matches title, summary, technology and author, with literal special characters', async () => {
    for (const term of ['100%', '_', '!', '精确简介', '  rEaCt  ']) assert.equal((await search(term)).total, 1, term);
    assert.equal((await search('作品作者')).total, 24);
    for (const term of ['未出现的关键词', "' OR 1=1 --", '隐藏验收']) assert.equal((await search(term)).total, 0, term);
    assert.equal((await search('  ')).total, 24);
  });
  await t.test('category, stable pagination and sorting keep only public results', async () => {
    const first = await search('搜索验收', '&limit=5&page=1&sort=latest');
    const second = await search('搜索验收', '&limit=5&page=2&sort=latest');
    assert.equal(first.total, 24);
    assert.deepEqual(first.projects.map(p => p.id), ids.slice(-5).reverse());
    assert.equal(new Set([...first.projects, ...second.projects].map(p => p.id)).size, 10);
    assert.equal((await search('搜索验收', '&category=' + encodeURIComponent('能跑就行'))).total, 12);
    assert.equal((await search('搜索验收', '&page=99')).projects.length, 0);
    await query('UPDATE projects SET votes_count = 3 WHERE id = ?', [ids[0]]);
    assert.equal((await api('/api/projects?sort=popular', reader)).projects[0].id, ids[0]);
    await api('/api/projects?page=0', reader, 'GET', undefined, 400);
    await api('/api/projects?search=' + 'x'.repeat(81), reader, 'GET', undefined, 400);
  });
  await t.test('profile changes trim names, preserve account privileges and keep private fields private', async () => {
    await api('/api/user/me', null, 'PUT', { username: '改名' }, 401);
    await api('/api/user/me', reader, 'PUT', { username: '  手机测试员  ', avatar_url: ' https://example.invalid/avatar.png ', is_admin: true, contribution_points: 999, email: 'changed@test.invalid' });
    const me = await api('/api/user/me', reader);
    assert.equal(me.username, '手机测试员');
    assert.equal(me.avatar_url, 'https://example.invalid/avatar.png');
    assert.equal(me.is_admin, false);
    assert.equal(me.contribution_points, 0);
    assert.equal(me.email, '评论读者@test.invalid');
    const profile = await api(`/api/user/profile/${readerId}`);
    assert.equal(profile.username, me.username);
    for (const field of ['email', 'password_hash', 'token_version', 'is_admin']) assert.equal(field in profile, false);
    assert.equal((await api(`/api/user/profile/${authorId}`)).projectCount, 24);
  });
  await t.test('invalid names and avatar URLs fail without altering saved profile', async () => {
    for (const username of ['', ' ', 'a', 'a'.repeat(41), false]) await api('/api/user/me', reader, 'PUT', { username }, 400);
    for (const avatar_url of [false, 0, {}, 'https://', 'javascript:alert(1)', 'data:image/png;base64,YQ==', 'https://user:password@example.invalid/a.png']) await api('/api/user/me', reader, 'PUT', { username: '不应保存', avatar_url }, 400);
    assert.equal((await api('/api/user/me', reader)).username, '手机测试员');
    await api('/api/user/me', reader, 'PUT', { username: '手机测试员', avatar_url: '' });
    assert.equal((await api(`/api/user/profile/${readerId}`)).avatar_url, '');
  });
  const commentUrl = `/api/projects/${ids[0]}/comments`;
  let commentId;
  await t.test('comments reject anonymous, blank, malformed and oversized submissions', async () => {
    await api(commentUrl, null, 'POST', { content: '匿名不应发表' }, 401);
    for (const content of ['   ', {}, 'x'.repeat(1001)]) await api(commentUrl, reader, 'POST', { content }, 400);
    const content = '<script>literal text</script> 中文 🙂';
    await api(commentUrl, reader, 'POST', { content: `  ${content}  ` }, 201);
    const comments = await api(commentUrl, reader);
    assert.equal(comments[0].content, content);
    assert.equal(comments[0].username, '手机测试员');
    commentId = comments[0].id;
    assert.equal((await api('/api/projects?sort=discussed', reader)).projects[0].id, ids[0]);
    assert.equal((await api('/api/user/me', reader)).contribution_points, 0);
  });
  await t.test('concurrent duplicate comments create one row and update counts once', async () => {
    const responses = await Promise.all([1, 2, 3].map(() => fetch(base + commentUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reader}` }, body: JSON.stringify({ content: '并发评论验收' }) })));
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409, 409]);
    assert.equal((await api(commentUrl, reader)).length, 2);
    assert.equal((await api(`/api/projects/${ids[0]}`, reader)).comments_count, 2);
    await api('/api/user/me', reader, 'PUT', { username: '更新后的评论昵称' });
    assert.equal((await api(commentUrl, reader))[0].username, '更新后的评论昵称');
  });
  await t.test('comment ownership, repeated deletion and moderation keep counters accurate', async () => {
    await api(`${commentUrl}/${commentId}`, author, 'DELETE');
    assert.equal((await api(commentUrl, reader)).length, 2);
    await api(`${commentUrl}/${commentId}`, reader, 'DELETE');
    await api(`${commentUrl}/${commentId}`, reader, 'DELETE');
    assert.equal((await api(`/api/projects/${ids[0]}`, reader)).comments_count, 1);
    const remaining = (await api(commentUrl, reader))[0];
    await api(`/api/admin/project-comments/${remaining.id}`, admin, 'DELETE');
    assert.equal((await api(commentUrl, reader)).length, 0);
    assert.equal((await api(`/api/projects/${ids[0]}`, reader)).comments_count, 0);
    assert.equal((await api('/api/user/me', reader)).contribution_points, 0);
  });
});
