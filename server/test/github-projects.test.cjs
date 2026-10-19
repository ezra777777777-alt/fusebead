const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-github-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-github-project-tests';
const express = require('express');
const { query } = require('../dist/config/db');
const { signToken } = require('../dist/middleware/auth');
const app = express();
app.use(express.json());
app.use('/projects', require('../dist/routes/projects').projectsRouter);
app.use('/admin', require('../dist/routes/admin').adminRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
const draft = { title: '实用仓库验收', summary: '整理数据的命令行工具', category: 'GitHub 实用项目', repoUrl: 'https://github.com/example-owner/data_tools.git/?tab=readme#usage', techStack: 'Python', acceptedRules: true };

test('GitHub sharing uses the moderated community lifecycle', async t => {
  let nextUser = 0;
  const makeUser = async (admin = 0) => {
    const id = (await query('INSERT INTO users (username,email,password_hash,email_verified,is_admin) VALUES (?, ?, ?, 1, ?)', [`分享者${++nextUser}`, `github-${nextUser}@test.invalid`, 'unused-test-hash', admin])).insertId;
    return { id, token: signToken({ userId: id, plan: 'free' }) };
  };
  const author = await makeUser();
  const admin = await makeUser(1);
  const reader = await makeUser();
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });
  async function api(url, token, method = 'GET', body, status = 200) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(data)}`);
    return data;
  }
  const list = (extra = '') => api(`/projects?category=${encodeURIComponent(draft.category)}${extra}`);
  let project;

  await t.test('rejects non-repositories, spoofed hosts, credentials and unsafe URLs', async () => {
    await api('/projects', null, 'POST', draft, 401);
    for (const repoUrl of ['', 'http://github.com/owner/repo', 'https://github.com.evil.invalid/owner/repo', 'https://github.com@evil.invalid/owner/repo', 'https://user:password@github.com/owner/repo', 'https://github.com/owner', 'https://github.com/owner/repo/issues', 'https://github.com/owner/.git', 'https://github.com:8443/owner/repo', 'javascript:alert(1)']) {
      const user = await makeUser();
      await api('/projects', user.token, 'POST', { ...draft, repoUrl }, 400);
    }
    await api('/projects', author.token, 'POST', { ...draft, acceptedRules: false }, 400);
    await api('/projects', author.token, 'POST', { ...draft, demoUrl: 'javascript:alert(1)' }, 400);
  });
  await t.test('accepts a repository without a demo and keeps pending content private', async () => {
    const created = await api('/projects', author.token, 'POST', draft, 201);
    project = await api(`/projects/${created.id}`, author.token);
    assert.equal(project.repo_url, 'https://github.com/example-owner/data_tools');
    assert.equal(project.demo_url, project.repo_url);
    assert.equal(project.status, 'pending');
    assert.equal((await list()).total, 0);
    await api(`/projects/${project.id}`, reader.token, 'GET', undefined, 404);
    assert.equal((await api('/projects/mine', author.token))[0].category, draft.category);
  });
  await t.test('return, edit, resubmit and approval publish only this category', async () => {
    await api(`/admin/projects/${project.id}`, admin.token, 'PUT', { action: 'reject', note: '补充使用方法', revision: project.revision });
    project = await api(`/projects/${project.id}`, author.token);
    assert.equal(project.status, 'rejected');
    await api(`/projects/${project.id}`, author.token, 'PUT', { ...draft, revision: project.revision, confession: '原作者 example-owner。按 README 安装后使用。' });
    project = await api(`/projects/${project.id}`, author.token);
    assert.equal(project.status, 'pending');
    await api(`/admin/projects/${project.id}`, admin.token, 'PUT', { action: 'approve', revision: project.revision });
    await query("INSERT INTO projects (user_id,title,summary,category,demo_url,status) VALUES (?, '其他分区', '不应出现在专区', '网页小玩具', 'https://example.invalid', 'approved')", [author.id]);
    assert.deepEqual((await list()).projects.map(p => p.id), [project.id]);
    for (const search of ['EXAMPLE-OWNER', 'data_tools', 'Python', '命令行']) assert.equal((await list('&search=' + encodeURIComponent(search))).total, 1);
    assert.equal((await list('&search=%25')).total, 0);
    assert.equal((await list('&search=dataXtools')).total, 0);
  });
  await t.test('votes and comments work without awarding points to the reader', async () => {
    await api(`/projects/${project.id}/vote`, reader.token, 'POST', { voted: true });
    await api(`/projects/${project.id}/vote`, reader.token, 'POST', { voted: true });
    await api(`/projects/${project.id}/comments`, reader.token, 'POST', { content: '希望补充系统要求。' }, 201);
    const published = await api(`/projects/${project.id}`);
    assert.equal(published.votes_count, 1); assert.equal(published.comments_count, 1);
    assert.equal((await query('SELECT contribution_points FROM users WHERE id = ?', [reader.id]))[0].contribution_points, 0);
  });
  await t.test('editing revalidates repository URLs and removes the item until reviewed again', async () => {
    project = await api(`/projects/${project.id}`, author.token);
    await api(`/projects/${project.id}`, author.token, 'PUT', { ...draft, revision: project.revision, repoUrl: 'https://evil.invalid/owner/repo' }, 400);
    assert.equal((await list()).total, 1);
    await api(`/projects/${project.id}`, author.token, 'PUT', { ...draft, revision: project.revision, demoUrl: 'https://example.invalid/demo' });
    assert.equal((await list()).total, 0);
    const edited = await api(`/projects/${project.id}`, author.token);
    assert.equal(edited.demo_url, 'https://example.invalid/demo');
    assert.equal(edited.status, 'pending');
    assert.equal((await query('SELECT contribution_points FROM users WHERE id = ?', [author.id]))[0].contribution_points, 10);
  });
  await t.test('more URL edge cases, other categories keep old rules, authors cannot self-approve', async () => {
    for (const repoUrl of ['https://www.github.com/owner/repo', 'data:text/html,<b>x</b>', 'https://gitlab.com/owner/repo', 'ftp://github.com/owner/repo']) {
      const user = await makeUser();
      await api('/projects', user.token, 'POST', { ...draft, repoUrl }, 400);
    }
    const cleaned = await api('/projects', (await makeUser()).token, 'POST', { ...draft, repoUrl: 'https://github.com/Owner-1/Repo.Name.git?x=1#readme' }, 201);
    assert.equal((await api(`/projects/${cleaned.id}`, admin.token)).repo_url, 'https://github.com/Owner-1/Repo.Name');
    const other = await makeUser();
    const base = { title: '普通作品', summary: '普通分区', category: '网页小玩具', acceptedRules: true };
    await api('/projects', other.token, 'POST', base, 400);
    await api('/projects', other.token, 'POST', { ...base, demoUrl: 'data:text/html,x' }, 400);
    const normal = await api('/projects', other.token, 'POST', { ...base, demoUrl: 'https://example.invalid/app', repoUrl: 'https://gitee.com/owner/repo' }, 201);
    const normalProject = await api(`/projects/${normal.id}`, other.token);
    assert.equal(normalProject.repo_url, 'https://gitee.com/owner/repo');
    const forged = await api('/projects', other.token, 'POST', { ...draft, title: '自批尝试', status: 'approved', is_featured: 1 }, 201);
    assert.equal((await api(`/projects/${forged.id}`, other.token)).status, 'pending');
    await api(`/admin/projects/${forged.id}`, other.token, 'PUT', { action: 'approve', revision: 1 }, 403);
    assert.equal((await api(`/projects/${forged.id}`, other.token)).status, 'pending');
  });
});
