const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-feedback-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-feedback-tests';
const express = require('express');
const { query } = require('../dist/config/db');
const { signToken } = require('../dist/middleware/auth');
const app = express();
app.use(express.json());
app.use('/api/user', require('../dist/routes/user').userRouter);
app.use('/api/admin', require('../dist/routes/admin').adminRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('feedback reaches the owner with a private, validated admin reply', async t => {
  const makeUser = async (name, admin = 0) => (await query('INSERT INTO users (username,email,password_hash,email_verified,is_admin) VALUES (?, ?, ?, 1, ?)', [name, `${name}@test.invalid`, 'unused', admin])).insertId;
  const ownerId = await makeUser('owner');
  const otherId = await makeUser('other');
  const adminId = await makeUser('admin', 1);
  const owner = signToken({ userId: ownerId, plan: 'free' });
  const other = signToken({ userId: otherId, plan: 'free' });
  const admin = signToken({ userId: adminId, plan: 'free' });
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  async function api(url, token, method = 'GET', body, expected = 200) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${url}: ${JSON.stringify(data)}`);
    return data;
  }
  let feedbackId;
  await t.test('authentication and input validation reject malformed or empty feedback', async () => {
    await api('/user/feedback', null, 'GET', undefined, 401);
    await api('/user/feedback', null, 'POST', { subject: 'test', message: 'test' }, 401);
    for (const body of [{ subject: ' ', message: 'ok' }, { subject: {}, message: 'ok' }, { subject: 'x'.repeat(201), message: 'ok' }, { subject: 'ok', message: ' ' }, { subject: 'ok', message: {} }, { subject: 'ok', message: 'x'.repeat(2001) }]) await api('/user/feedback', owner, 'POST', body, 400);
    assert.equal((await api('/user/feedback', owner)).total, 0);
  });
  await t.test('concurrent duplicate sends create one pending feedback', async () => {
    const responses = await Promise.all([1, 2, 3].map(() => fetch(base + '/user/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner}` }, body: JSON.stringify({ subject: '  草稿问题  ', message: '  保存后如何找回？  ' }) })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409, 409]);
    const result = await api('/user/feedback', owner);
    assert.equal(result.total, 1);
    const item = result.feedbacks[0]; feedbackId = item.id;
    assert.equal(item.subject, '草稿问题'); assert.equal(item.message, '保存后如何找回？');
    assert.equal(item.reply, ''); assert.equal(item.is_read, 0);
  });
  await t.test('users see only their own history and cannot spoof identity or reply', async () => {
    await api('/user/feedback', other, 'POST', { subject: '别人的反馈', message: '私有内容', user_id: ownerId });
    const ownerList = await api(`/user/feedback?user_id=${otherId}`, owner);
    assert.equal(ownerList.total, 1); assert.equal(ownerList.feedbacks[0].id, feedbackId);
    assert.equal((await api('/user/feedback', other)).total, 1);
    for (const field of ['email', 'password_hash', 'user_id']) assert.equal(field in ownerList.feedbacks[0], false);
    await api(`/admin/feedback/${feedbackId}/reply`, owner, 'POST', { reply: '越权回复' }, 403);
    await api(`/admin/feedback/${feedbackId}/reply`, null, 'POST', { reply: '未登录回复' }, 401);
  });
  await t.test('admin reply is validated, recorded and visible only to the owner', async () => {
    for (const reply of [' ', {}, 'x'.repeat(2001)]) await api(`/admin/feedback/${feedbackId}/reply`, admin, 'POST', { reply }, 400);
    await api('/admin/feedback/999999/reply', admin, 'POST', { reply: '不存在' }, 404);
    await api(`/admin/feedback/${feedbackId}/read`, admin, 'POST');
    assert.equal((await api('/user/feedback', owner)).feedbacks[0].reply, '');
    await api(`/admin/feedback/${feedbackId}/reply`, admin, 'POST', { reply: '  请回到投稿页继续草稿。  ' });
    const result = (await api('/user/feedback', owner)).feedbacks[0];
    assert.equal(result.reply, '请回到投稿页继续草稿。'); assert.equal(result.is_read, 1); assert.ok(result.replied_at);
    assert.equal((await api('/user/feedback', other)).feedbacks.some(f => f.id === feedbackId), false);
    assert.equal((await query("SELECT COUNT(*) AS n FROM admin_logs WHERE action='reply_feedback' AND target_id=?", [feedbackId]))[0].n, 1);
    assert.equal((await api('/user/me', owner)).contribution_points, 0);
  });
  await t.test('history pagination keeps stable ordering and validates page bounds', async () => {
    for (let i = 0; i < 12; i++) await query('INSERT INTO feedbacks (user_id,subject,message) VALUES (?, ?, ?)', [ownerId, `历史反馈${i}`, '内容']);
    const first = await api('/user/feedback?limit=10&page=1', owner);
    const second = await api('/user/feedback?limit=10&page=2', owner);
    assert.equal(first.total, 13); assert.equal(first.feedbacks.length, 10); assert.equal(second.feedbacks.length, 3);
    assert.equal(new Set([...first.feedbacks, ...second.feedbacks].map(f => f.id)).size, 13);
    await api('/user/feedback?page=0', owner, 'GET', undefined, 400);
    await api('/admin/feedback?limit=-1', admin, 'GET', undefined, 400);
    await query('UPDATE users SET is_banned=1 WHERE id=?', [ownerId]);
    await api('/user/feedback', owner, 'GET', undefined, 403);
  });
});
