const { test } = require('node:test');
const assert = require('node:assert/strict');
const { errorGallery, failureReason, isAttachmentApiPath, loadingGallery, moveId, readyGallery, sortAttachments } = require('../src/lib/attachment-gallery.ts');

test('attachment gallery exposes a skeleton, a failure reason, and retry', () => {
  const loading = loadingGallery();
  assert.equal(loading.phase, 'loading');
  assert.equal(loading.skeleton, true);
  assert.equal(loading.canRetry, false);
  assert.equal(failureReason(new Error('  登录已失效，请重新登录  ')), '登录已失效，请重新登录');
  assert.equal(failureReason(new Error('')), '图片加载失败，请重试');
  const failed = errorGallery(new Error('图片内容无效'));
  assert.equal(failed.phase, 'error');
  assert.equal(failed.skeleton, false);
  assert.equal(failed.canRetry, true);
  assert.equal(failed.error, '图片内容无效');
  const ready = readyGallery([{ id: 2, sortOrder: 0 }]);
  assert.equal(ready.phase, 'ready');
  assert.equal(ready.skeleton, false);
  assert.equal(ready.canRetry, false);
});

test('thumbnails stay on authenticated attachment paths and reorder without dropping ids', () => {
  const items = sortAttachments([{ id: 3, sortOrder: 1 }, { id: 9, sortOrder: 0 }, { id: 4, sortOrder: 1 }]);
  assert.deepEqual(items.map((item) => item.id), [9, 3, 4]);
  assert.deepEqual(moveId([9, 3, 4], 4, -1), [9, 4, 3]);
  assert.deepEqual(moveId([9, 3, 4], 9, -1), [9, 3, 4]);
  assert.equal(isAttachmentApiPath('/projects/12/attachments/4'), true);
  assert.equal(isAttachmentApiPath('/projects/12/attachments/4?variant=thumbnail'), true);
  assert.equal(isAttachmentApiPath('/projects/covers/file.jpg'), false);
  assert.equal(isAttachmentApiPath('/attachments/file.png'), false);
  assert.equal(isAttachmentApiPath('/projects/12/attachments/../../secret.png'), false);
});
