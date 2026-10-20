const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  approvedWorksOnly,
  errorState,
  failureReason,
  isPublicApprovedWork,
  loadingState,
  readyState,
  runRequest,
} = require('../src/lib/load-state.ts');

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

  const retried = await runRequest(async () => approvedWorksOnly(await request()));
  assert.equal(calls, 2);
  assert.equal(retried.phase, 'ready');
  assert.equal(retried.skeleton, false);
  assert.equal(retried.canRetry, false);
  assert.deepEqual(readyState(retried.data).phase, 'ready');
  assert.deepEqual(retried.data.map(item => item.id), [1, 7]);
  assert.equal(retried.data.some(item => item.status === 'pending' || item.status === 'rejected' || Number(item.is_deleted) === 1), false);
});
