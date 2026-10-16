const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serverDate } = require('../src/lib/community.ts');

test('database UTC timestamps match explicit offsets and render in the viewer timezone', () => {
  const expected = '2026-10-16T02:57:32.000Z';
  for (const value of ['2026-10-16 02:57:32', '2026-10-16T02:57:32', expected, '2026-10-16T10:57:32+08:00']) assert.equal(serverDate(value).toISOString(), expected);
  assert.equal(serverDate('2026-10-16 02:57:32').toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }), '2026-10-15');
  assert.equal(serverDate('2026-10-16 02:57:32').toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }), '2026-10-16');
});
