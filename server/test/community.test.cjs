const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-beta-test-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-test-secret-not-for-runtime';
const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../dist/config/db');
const { signToken } = require('../dist/middleware/auth');
const verification = require('../dist/models/verificationCode');
const mailer = require('../dist/utils/mailer');
const messages = [];
mailer.sendVerificationCode = async (email, code, type) => { messages.push({ email, code, type }); };
const { rateLimit } = require('../dist/middleware/rateLimit');
const app = express();
app.use(express.json());
app.use('/api/auth', require('../dist/routes/verification').verificationRouter, require('../dist/routes/auth').authRouter);
app.use('/api/projects', require('../dist/routes/projects').projectsRouter);
app.use('/api/user', require('../dist/routes/user').userRouter);
app.use('/api/admin', require('../dist/routes/admin').adminRouter);
app.get('/limit', rateLimit(2), (_req, res) => res.json({ ok: true }));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

const draft = { title: '公测流程测试', summary: '用于独立数据库的投稿验收', category: '网页小玩具', demoUrl: 'https://example.com/test', acceptedRules: true };
test('local public beta lifecycle and permissions', async t => {
  const hash = await bcrypt.hash('Password-For-Tests-Only', 4);
  const makeUser = async (email, admin = 0) => (await query("INSERT INTO users (username, email, password_hash, email_verified, is_admin) VALUES (?, ?, ?, 1, ?)", [email.split('@')[0], email, hash, admin])).insertId;
  const authorId = await makeUser('author@test.invalid');
  const adminId = await makeUser('reviewer@test.invalid', 1);
  const otherId = await makeUser('other@test.invalid');
  const author = signToken({ userId: authorId, plan: 'free' });
  const admin = signToken({ userId: adminId, plan: 'free' });
  const other = signToken({ userId: otherId, plan: 'free' });
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  async function api(url, token, method = 'GET', body, status = 200) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(data)}`);
    return data;
  }
  const points = async id => Number((await query('SELECT contribution_points FROM users WHERE id = ?', [id]))[0].contribution_points);
  await t.test('cover upload requires authentication and a safe image, stores only processed bytes', async () => {
    await api('/api/projects/cover', null, 'POST', { image: 'data:image/png;base64,YQ==' }, 401);
    await api('/api/projects/cover', author, 'POST', { image: 'data:image/svg+xml;base64,YQ==' }, 400);
    const processor = express();
    processor.use(express.json());
    processor.post('/prepare-cover', (req, res) => req.body.image.endsWith('YmFk') ? res.status(400).json({ error: 'bad image' }) : res.json({ image: Buffer.from([255, 216, 255, 217]).toString('base64') }));
    const upstream = await new Promise(resolve => { const running = processor.listen(0, '127.0.0.1', () => resolve(running)); });
    process.env.PROCESSOR_URL = `http://127.0.0.1:${upstream.address().port}`;
    try {
      await api('/api/projects/cover', author, 'POST', { image: 'data:image/png;base64,YmFk' }, 400);
      const uploaded = await api('/api/projects/cover', author, 'POST', { image: 'data:image/png;base64,YQ==' }, 201);
      assert.match(uploaded.path, /^\/projects\/covers\/[a-f0-9-]+\.jpg$/);
      const image = await fetch(base + '/api' + uploaded.path);
      assert.equal(image.status, 200);
      assert.match(image.headers.get('content-type'), /image\/jpeg/);
      assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from([255, 216, 255, 217]));
    } finally { await new Promise(resolve => upstream.close(resolve)); }
    await api('/api/projects/cover', author, 'POST', { image: 'data:image/png;base64,YQ==' }, 503);
  });
  let project;
  await t.test('transaction rollback preserves existing data', async () => {
    await assert.rejects(transaction(async () => { await query('UPDATE users SET contribution_points = 123 WHERE id = ?', [authorId]); throw new Error('rollback'); }));
    assert.equal(await points(authorId), 0);
  });
  await t.test('submission is private, validated and does not award points', async () => {
    await api('/api/projects', null, 'POST', draft, 401);
    await api('/api/projects', author, 'POST', { ...draft, demoUrl: 'javascript:alert(1)' }, 400);
    const created = await api('/api/projects', author, 'POST', draft, 201);
    project = await api(`/api/projects/${created.id}`, author);
    assert.equal(project.status, 'pending');
    assert.equal(await points(authorId), 0);
    assert.equal((await api('/api/projects')).total, 0);
    await api(`/api/projects/${project.id}`, null, 'GET', undefined, 404);
    await api(`/api/projects/${project.id}/comments`, other, 'GET', undefined, 404);
    await api('/api/projects', author, 'POST', draft, 409);
    await api(`/api/projects/${project.id}`, other, 'PUT', { ...draft, revision: 1 }, 404);
    await api(`/api/admin/projects/${project.id}`, author, 'PUT', { action: 'approve', revision: 1 }, 403);
  });
  await t.test('rejection reason, owner edit and stale review protection', async () => {
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'reject', revision: project.revision }, 400);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'reject', note: '补充用途和截图', revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal(project.moderation_note, '补充用途和截图');
    assert.equal(project.status, 'rejected');
    await api(`/api/projects/${project.id}`, author, 'PUT', { ...draft, summary: '已经补充用途', revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal(project.status, 'pending');
    assert.equal(project.moderation_note, '');
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: 1 }, 409);
  });
  await t.test('concurrent approval only awards once, edits require review again', async () => {
    const revision = project.revision;
    const responses = await Promise.all([1, 2].map(() => fetch(`${base}/api/admin/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` }, body: JSON.stringify({ action: 'approve', revision }) })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal(await points(authorId), 10);
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal((await api('/api/projects?search=补充')).total, 1);
    await api(`/api/projects/${project.id}`, author, 'PUT', { ...draft, revision: project.revision });
    assert.equal((await api('/api/projects')).total, 0);
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: project.revision });
    assert.equal(await points(authorId), 10);
    await api('/api/projects?page=1.5', null, 'GET', undefined, 400);
    assert.equal((await api(`/api/projects?authorId=${authorId}`)).total, 1);
  });
  await t.test('votes are idempotent and never generate points', async () => {
    const authorPoints = await points(authorId);
    await Promise.all(Array.from({ length: 4 }, () => api(`/api/projects/${project.id}/vote`, other, 'POST', { voted: true })));
    assert.equal((await api(`/api/projects/${project.id}`, other)).votes_count, 1);
    for (let i = 0; i < 3; i++) { await api(`/api/projects/${project.id}/vote`, other, 'POST', { voted: false }); await api(`/api/projects/${project.id}/vote`, other, 'POST', { voted: true }); }
    assert.equal(await points(otherId), 0);
    assert.equal(await points(authorId), authorPoints);
    assert.equal((await api(`/api/projects/${project.id}`, other)).votes_count, 1);
    assert.equal((await query('SELECT COUNT(*) AS count FROM project_votes WHERE project_id = ? AND user_id = ?', [project.id, otherId]))[0].count, 1);
  });
  await t.test('concurrent check-in awards five points exactly once', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => api('/api/user/me/check-in', other, 'POST')));
    assert.equal(results.reduce((sum, result) => sum + result.awarded, 0), 5);
    assert.equal(await points(otherId), 5);
    assert.equal((await api('/api/user/me/check-in', other)).checkedIn, true);
    assert.equal((await api('/api/user/me/check-in', other, 'POST')).awarded, 0);
    assert.equal((await query('SELECT COUNT(*) AS count FROM user_checkins WHERE user_id = ?', [otherId]))[0].count, 1);
  });
  await t.test('check-in resets at Beijing midnight, not the server timezone', async t => {
    const id = await makeUser('midnight@test.invalid');
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-16T15:59:59Z') });
    try {
      const token = signToken({ userId: id, plan: 'free' });
      assert.equal((await api('/api/user/me/check-in', token, 'POST')).awarded, 5);
      assert.equal((await api('/api/user/me/check-in', token, 'POST')).awarded, 0);
      t.mock.timers.setTime(Date.parse('2026-10-16T16:00:00Z'));
      assert.equal((await api('/api/user/me/check-in', token)).checkedIn, false);
      assert.equal((await api('/api/user/me/check-in', token, 'POST')).awarded, 5);
      assert.equal((await api('/api/user/me/check-in', token, 'POST')).awarded, 0);
      assert.equal(await points(id), 10);
      assert.deepEqual((await query('SELECT checkin_date FROM user_checkins WHERE user_id = ? ORDER BY checkin_date', [id])).map(row => row.checkin_date), ['2026-10-16', '2026-10-17']);
    } finally { t.mock.timers.reset(); }
  });
  await t.test('comments, moderation and duplicate protection', async () => {
    await api(`/api/projects/${project.id}/comments`, other, 'POST', { content: '测试评论' }, 201);
    await api(`/api/projects/${project.id}/comments`, other, 'POST', { content: '测试评论' }, 409);
    const comments = await api(`/api/projects/${project.id}/comments`);
    assert.equal(comments.length, 1);
    assert.equal(await points(otherId), 5);
    await api(`/api/admin/project-comments/${comments[0].id}`, admin, 'DELETE');
    await api(`/api/admin/project-comments/${comments[0].id}`, admin, 'DELETE');
    assert.equal((await api(`/api/projects/${project.id}`)).comments_count, 0);
  });
  await t.test('report result returns to the reporter', async () => {
    await api(`/api/projects/${project.id}/report`, other, 'POST', { reason: '危险链接', detail: '需要核实' }, 201);
    await api(`/api/projects/${project.id}/report`, other, 'POST', { reason: '危险链接' }, 409);
    const { reports } = await api('/api/admin/project-reports', admin);
    await api(`/api/admin/project-reports/${reports[0].id}`, admin, 'PUT', { status: 'resolved' }, 400);
    await api(`/api/admin/project-reports/${reports[0].id}`, admin, 'PUT', { status: 'resolved', note: '已核实链接，暂无风险' });
    const mine = await api('/api/projects/my-reports', other);
    assert.equal(mine[0].resolution_note, '已核实链接，暂无风险');
    assert.equal((await api('/api/projects/my-reports', author)).length, 0);
    await api(`/api/admin/project-reports/${reports[0].id}`, other, 'PUT', { status: 'open' }, 403);
    await api(`/api/admin/project-reports/${reports[0].id}`, admin, 'PUT', { status: 'open' });
    const reopened = await api('/api/projects/my-reports', other);
    assert.equal(reopened[0].status, 'open');
    assert.equal(reopened[0].resolution_note, '');
    await api(`/api/admin/project-reports/${reports[0].id}`, admin, 'PUT', { status: 'resolved', note: '复核完成' });
  });
  await t.test('withdrawal, resubmission and takedown preserve permissions', async () => {
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/projects/${project.id}/withdraw`, author, 'POST', { revision: project.revision });
    assert.equal((await api('/api/projects')).total, 0);
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/projects/${project.id}`, author, 'PUT', { ...draft, revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: project.revision });
    assert.equal(await points(authorId), 10);
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'softDelete', note: '测试下架', revision: project.revision });
    await api(`/api/projects/${project.id}/comments`, null, 'GET', undefined, 404);
    assert.equal((await api('/api/projects/mine', author))[0].is_deleted, 1);
  });
  await t.test('admin user settings reject malformed flags and self lockout', async () => {
    await api(`/api/admin/users/${otherId}`, admin, 'PUT', { is_banned: 'false' }, 400);
    await api(`/api/admin/users/${adminId}`, admin, 'PUT', { is_banned: true }, 400);
    await api(`/api/admin/users/${otherId}`, admin, 'PUT', { is_banned: true });
    await api('/api/user/me', other, 'GET', undefined, 403);
    await api(`/api/admin/users/${otherId}`, admin, 'PUT', { is_banned: false });
    await api('/api/user/me', other);
  });
  await t.test('login returns the same points as the personal center', async () => {
    await verification.create({ email: 'points-captcha', code: 'TEST', type: 'captcha' });
    const result = await api('/api/auth/login', null, 'POST', { email: 'author@test.invalid', password: 'Password-For-Tests-Only', captchaId: 'points-captcha', captchaText: 'TEST' });
    const profile = await api('/api/user/me', result.token);
    assert.equal(result.user.contribution_points, profile.contribution_points);
    assert.ok(result.user.contribution_points > 0);
    assert.equal(result.user.subscription_status, profile.subscription_status);
  });
  await t.test('ban takes effect on existing tokens and account login', async () => {
    await api(`/api/admin/users/${otherId}`, admin, 'PUT', { is_banned: true });
    for (const [url, method, body] of [
      ['/api/projects', 'POST', draft],
      ['/api/user/me/check-in', 'POST'],
      ['/api/user/me/refresh-token', 'POST'],
      ['/api/user/me', 'PUT', { username: '不应保存' }],
      ['/api/projects/mine', 'GET'],
      ['/api/projects/my-reports', 'GET'],
      [`/api/projects/${project.id}/vote`, 'POST', { voted: true }],
      [`/api/projects/${project.id}/comments`, 'POST', { content: '不应保存' }],
      [`/api/projects/${project.id}/report`, 'POST', { reason: '其他' }],
      ['/api/user/feedback', 'POST', { subject: '不应保存', message: '应走申诉通道' }],
    ]) {
      const rejected = await api(url, other, method, body, 403);
      assert.equal(rejected.code, 'ACCOUNT_BANNED');
    }
    assert.equal(await points(otherId), 5);
    await verification.create({ email: 'ban-captcha', code: 'TEST', type: 'captcha' });
    const result = await api('/api/auth/login', null, 'POST', { email: 'other@test.invalid', password: 'Password-For-Tests-Only', captchaId: 'ban-captcha', captchaText: 'TEST' }, 403);
    assert.equal(result.code, 'ACCOUNT_BANNED');
    await verification.create({ email: 'appeal-captcha', code: 'TEST', type: 'captcha' });
    const invalid = await api('/api/user/appeal', null, 'POST', { email: 'other@test.invalid', message: '请求复核', captchaId: 'appeal-captcha', captchaText: 'WRONG' }, 400);
    assert.match(invalid.error, /验证码/);
    await api('/api/user/appeal', null, 'POST', { email: 'other@test.invalid', message: '请求复核', captchaId: 'appeal-captcha', captchaText: 'TEST' });
    await api('/api/user/appeal', null, 'POST', { email: 'other@test.invalid', message: '请求复核', captchaId: 'appeal-captcha', captchaText: 'TEST' }, 400);
    assert.equal((await query('SELECT COUNT(*) AS count FROM feedbacks WHERE user_id = ?', [otherId]))[0].count, 1);
    await api('/api/user/me', other, 'GET', undefined, 403);
    const { feedbacks } = await api('/api/admin/feedback', admin);
    const appeal = feedbacks.find(item => item.user_id === otherId);
    assert.match(appeal.subject, /身份尚未核实/);
    await api(`/api/admin/feedback/${appeal.id}/read`, admin, 'POST');
    assert.equal((await api('/api/admin/feedback', admin)).feedbacks.find(item => item.id === appeal.id).is_read, 1);
    await api(`/api/admin/users/${otherId}`, admin, 'PUT', { is_banned: false });
    await verification.create({ email: 'restored-captcha', code: 'TEST', type: 'captcha' });
    const restored = await api('/api/auth/login', null, 'POST', { email: 'other@test.invalid', password: 'Password-For-Tests-Only', captchaId: 'restored-captcha', captchaText: 'TEST' });
    assert.equal((await api('/api/user/me', restored.token)).contribution_points, 5);
  });
  await t.test('registration, verification and password recovery with a local mail stub', async () => {
    await verification.create({ email: 'register-captcha', code: 'TEST', type: 'captcha' });
    await api('/api/auth/register', null, 'POST', { username: '新用户', email: 'new@test.invalid', password: 'New-Password-2026', captchaId: 'register-captcha', captchaText: 'TEST', acceptedTerms: true }, 201);
    const emailCode = messages.find(message => message.email === 'new@test.invalid').code;
    const activated = await api('/api/auth/verify-code', null, 'POST', { email: 'new@test.invalid', code: emailCode });
    assert.ok(activated.token);
    assert.equal(activated.user.contribution_points, 0);
    await api('/api/auth/forgot-password', null, 'POST', { email: 'new@test.invalid' });
    const reset = messages.at(-1).code;
    await api('/api/auth/reset-password', null, 'POST', { email: 'new@test.invalid', code: reset, password: 'Changed-Password-2026' });
    await api('/api/auth/reset-password', null, 'POST', { email: 'new@test.invalid', code: reset, password: 'Changed-Password-2026' }, 400);
    await verification.create({ email: 'login-captcha', code: 'TEST', type: 'captcha' });
    assert.ok((await api('/api/auth/login', null, 'POST', { email: 'new@test.invalid', password: 'Changed-Password-2026', captchaId: 'login-captcha', captchaText: 'TEST' })).token);
  });
  await t.test('rate limit rejects excess requests', async () => {
    await api('/limit'); await api('/limit'); await api('/limit', null, 'GET', undefined, 429);
  });
});
