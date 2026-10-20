const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('normal startup does not create attachment tables; the explicit migration does', (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'attachment-migration-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const env = { ...process.env, DATABASE_URL: '', DB_PATH: path.join(temporary, 'test.db'), RESOURCE_REGISTRY_SITE_PROJECT: '' };
  const inspect = () => spawnSync(process.execPath, ['-e', "require('./dist/config/db').query(\"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_attachments'\").then(rows => console.log(rows.length))"], { env, encoding: 'utf8', cwd: path.join(__dirname, '..') });
  const before = inspect();
  assert.equal(before.status, 0, before.stderr);
  assert.equal(before.stdout.trim(), '0');
  const migration = spawnSync(process.execPath, [require.resolve('../dist/migrate-project-attachments')], { env, encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stderr);
  assert.match(migration.stdout, /帖子附件表迁移完成/);
  const after = inspect();
  assert.equal(after.status, 0, after.stderr);
  assert.equal(after.stdout.trim(), '1');
  const again = spawnSync(process.execPath, [require.resolve('../dist/migrate-project-attachments')], { env, encoding: 'utf8' });
  assert.equal(again.status, 0, again.stderr);
  const columns = spawnSync(process.execPath, ['-e', "require('./dist/config/db').query('PRAGMA table_info(project_attachments)').then(rows => console.log(rows.map(row => row.name).sort().join(',')))"], { env, encoding: 'utf8', cwd: path.join(__dirname, '..') });
  assert.equal(columns.status, 0, columns.stderr);
  assert.equal(columns.stdout.trim(), 'byte_size,created_at,id,mime,project_id,sort_order,stored_name');
});
