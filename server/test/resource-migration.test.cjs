const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('normal startup does not migrate the registry; the explicit migration does', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-migration-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const env = { ...process.env, DATABASE_URL: '', DB_PATH: path.join(temporary, 'test.db') };
  const inspect = () => spawnSync(process.execPath, ['-e', "require('./dist/config/db').query(\"SELECT name FROM sqlite_master WHERE name = 'resource_entries'\").then(rows => console.log(rows.length))"], { env, encoding: 'utf8', cwd: path.join(__dirname, '..') });
  const before = inspect();
  assert.equal(before.status, 0, before.stderr);
  assert.equal(before.stdout.trim(), '0');
  const migration = spawnSync(process.execPath, [require.resolve('../dist/migrate-resource-registry')], { env, encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stderr);
  const after = inspect();
  assert.equal(after.status, 0, after.stderr);
  assert.equal(after.stdout.trim(), '1');
});
