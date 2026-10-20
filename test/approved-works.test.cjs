const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  approvedWorksOnly,
  errorState,
  failureReason,
  isAuthFailure,
  isPublicApprovedWork,
  loadingState,
  presentLoad,
  readyState,
  runRequest,
} = require('../src/lib/load-state.ts');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const sample = [
  { id: 1, status: 'approved', is_deleted: 0, title: '过检' },
  { id: 2, status: 'pending', is_deleted: 0, title: '待审' },
  { id: 3, status: 'rejected', is_deleted: 0, title: '需修改' },
  { id: 4, status: 'withdrawn', is_deleted: 0, title: '已撤回' },
  { id: 5, status: 'approved', is_deleted: 1, title: '已下架' },
  { id: 6, status: 'approved', is_deleted: true, title: '已删除' },
  { id: 7, status: ' approved ', is_deleted: '0', title: '空白状态名仍算通过' },
  { id: 8, status: 'published', is_deleted: 0, title: '不是本站公开状态' },
  { id: 9, title: '没有状态' },
];

test('approved-only filter keeps public approved works and drops the rest', () => {
  assert.equal(isPublicApprovedWork(null), false);
  assert.equal(isPublicApprovedWork({ status: 'pending', is_deleted: 0 }), false);
  assert.equal(isPublicApprovedWork({ status: 'approved', is_deleted: 1 }), false);
  assert.deepEqual(approvedWorksOnly(sample).map(item => item.id), [1, 7]);
  assert.deepEqual(approvedWorksOnly(null), []);
  assert.deepEqual(approvedWorksOnly(undefined), []);
  assert.equal(approvedWorksOnly(sample).some(item => ['pending', 'rejected', 'withdrawn'].includes(item.status)), false);
  assert.equal(approvedWorksOnly(sample).some(item => item.is_deleted === 1 || item.is_deleted === true), false);
});

test('async loads expose loading, a short failure reason, and retry that runs the request again', async () => {
  const loading = loadingState();
  assert.equal(loading.phase, 'loading');
  assert.equal(loading.skeleton, true);
  assert.equal(loading.canRetry, false);
  assert.equal(loading.data, null);

  assert.equal(failureReason(new Error('   服务暂时不可用  ')), '服务暂时不可用');
  assert.equal(failureReason(new Error('')), '加载失败，请稍后重试');
  assert.equal(failureReason('', '暂时无法读取投稿'), '暂时无法读取投稿');
  assert.equal(failureReason('x'.repeat(180), '备用原因').endsWith('…'), true);
  assert.equal(failureReason('x'.repeat(180)).length, 161);

  let calls = 0;
  const request = async () => {
    calls += 1;
    if (calls === 1) throw new Error('网络超时，请重试');
    return sample;
  };

  const failed = await runRequest(request, '暂时无法读取已审核作品');
  assert.equal(failed.phase, 'error');
  assert.equal(failed.skeleton, false);
  assert.equal(failed.canRetry, true);
  assert.equal(failed.error, '网络超时，请重试');
  assert.equal(failed.data, null);
  assert.deepEqual(errorState(new Error('打不开这份投稿')).error, '打不开这份投稿');
  assert.equal(presentLoad(failed, true), 'retry');

  const retried = await runRequest(async () => approvedWorksOnly(await request()));
  assert.equal(calls, 2);
  assert.equal(retried.phase, 'ready');
  assert.equal(retried.skeleton, false);
  assert.equal(retried.canRetry, false);
  assert.deepEqual(readyState(retried.data).phase, 'ready');
  assert.deepEqual(retried.data.map(item => item.id), [1, 7]);
  assert.equal(retried.data.some(item => item.status === 'pending' || item.status === 'rejected' || Number(item.is_deleted) === 1), false);
});

test('401 is a login prompt and is not retried', async () => {
  const secret = '不该出现的标题';
  const thumb = 'https://example.invalid/secret-thumb.png';
  const denied = Object.assign(new Error(`请登录后查看《${secret}》 ${thumb}`), { status: 401, code: 'AUTH_REQUIRED' });
  assert.equal(isAuthFailure(denied), true);
  assert.equal(isAuthFailure({ status: 401 }), true);
  assert.equal(isAuthFailure({ code: 'AUTH_REQUIRED' }), true);
  assert.equal(isAuthFailure(new Error('网络超时')), false);
  assert.equal(isAuthFailure({ status: 403, code: 'ACCOUNT_BANNED' }), false);
  assert.equal(isAuthFailure(null), false);

  const direct = errorState(denied, '暂时无法读取已审核作品');
  assert.equal(direct.phase, 'unauthorized');
  assert.equal(direct.canRetry, false);
  assert.equal(direct.error, '');
  assert.equal(direct.data, null);
  assert.equal(JSON.stringify(direct).includes(secret), false);

  let calls = 0;
  const request = async () => {
    calls += 1;
    throw denied;
  };
  let state = await runRequest(request, '暂时无法读取已审核作品');
  let guards = 0;
  while (state.canRetry && guards < 5) {
    guards += 1;
    state = await runRequest(request);
  }
  assert.equal(calls, 1);
  assert.equal(guards, 0);
  assert.equal(state.phase, 'unauthorized');
  assert.equal(state.skeleton, false);
  assert.equal(state.canRetry, false);
  assert.equal(state.data, null);
  assert.equal(state.error, '');
  assert.equal(JSON.stringify(state).includes(secret), false);
  assert.equal(JSON.stringify(state).includes(thumb), false);
  assert.equal(presentLoad(state, true), 'login');
  assert.equal(presentLoad(state, false), 'login');
  assert.equal(presentLoad(loadingState(), false), 'login');
  assert.equal(presentLoad(readyState([{ title: secret, cover_url: thumb }]), false), 'login');
  assert.equal(presentLoad(loadingState(), true), 'skeleton');
  assert.equal(presentLoad(errorState(new Error('网络超时，请重试')), true), 'retry');
});

test('works, home entry and nav stay behind the login gate', () => {
  const works = read('src/components/community/ApprovedWorks.tsx');
  const home = read('src/components/landing/cyber-home.tsx');
  const nav = read('src/components/shared/navbar.tsx');
  const github = read('src/components/community/GithubProjects.tsx');
  const submit = read('src/app/submit/page.tsx');
  const profile = read('src/app/user/[id]/page.tsx');

  assert.ok(works.indexOf('if (!user)') < works.indexOf('api<'), 'logged-out /works must return before requesting works');
  assert.ok(works.indexOf('view === "login"') < works.indexOf('project.title'), 'login prompt must render before any work title');
  assert.ok(works.indexOf('view === "retry"') < works.indexOf('setRetry(value => value + 1)'), 'retry stays on the ordinary failure branch');
  assert.equal(works.includes('approvedWorksOnly'), true);
  assert.equal(works.includes('ContentLoginPrompt'), true);
  assert.equal(works.includes('presentLoad'), true);

  assert.equal(nav.includes('{ href: "/works", label: "已审核作品" }'), true);
  assert.equal(nav.includes('guard(link.href)'), true);

  const entry = home.slice(home.indexOf('data-approved-works'), home.indexOf('data-approved-works-end'));
  assert.equal(entry.includes('href="/works"'), true);
  assert.equal(entry.includes('openAuth("/works")'), true);
  assert.equal(entry.includes('project.title'), false);
  assert.ok(home.indexOf('if (!user)') < home.indexOf('runRequest('), 'homepage feed must not request works while logged out');
  assert.ok(home.indexOf('listView === "login"') < home.indexOf('post.title'));
  assert.ok(home.indexOf('listView === "retry"') < home.indexOf('setRetry(value => value + 1)'));

  assert.ok(github.indexOf('if (!user)') < github.indexOf('api<{ projects'));
  assert.ok(github.indexOf('listView === "login"') < github.indexOf('project.title'));
  assert.equal(github.includes('approvedWorksOnly'), true);
  assert.ok(github.indexOf('listView === "retry"') < github.indexOf('setRetry(value => value + 1)'));

  assert.equal(submit.includes('result.phase === "unauthorized"'), true);
  assert.equal(submit.includes('data-phase="login"'), true);
  assert.equal(submit.includes('LoadFailure'), true);
  assert.ok(submit.indexOf('authDenied') < submit.indexOf('<LoadFailure'));

  assert.equal(profile.includes('approvedWorksOnly'), true);
  assert.ok(profile.indexOf('listView === "login"') < profile.indexOf('project.title'));
  assert.ok(profile.indexOf('listView === "login"') < profile.indexOf('profile.avatar_url'));
  assert.ok(profile.indexOf('listView === "retry"') < profile.indexOf('setRetry(value => value + 1)'));
});
