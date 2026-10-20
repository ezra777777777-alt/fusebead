const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('terms, privacy, rules and help stay public pages without content fetches', () => {
  for (const page of ['src/app/terms/page.tsx', 'src/app/privacy/page.tsx', 'src/app/rules/page.tsx', 'src/app/help/page.tsx']) {
    const source = read(page);
    assert.equal(source.includes('"use client"'), false, page);
    assert.equal(source.includes('/projects'), false, page);
    assert.equal(source.includes('/patterns'), false, page);
    assert.equal(source.includes('ContentLoginPrompt'), false, page);
  }
  const help = read('src/app/help/page.tsx');
  assert.equal(help.includes('浏览作品不需要账号'), false);
  assert.equal(help.includes('登录后才能查看作品'), true);
});

test('home approved-works entry is a door, not a thumbnail or title list', () => {
  const home = read('src/components/landing/cyber-home.tsx');
  const entry = home.slice(home.indexOf('data-approved-works'), home.indexOf('data-approved-works-end'));
  assert.equal(entry.includes('已审核作品'), true);
  assert.equal(entry.includes('href="/works"'), true);
  assert.equal(entry.includes('<img'), false);
  assert.equal(entry.includes('thumbnail'), false);
  assert.equal(entry.includes('cover_url'), false);
  assert.equal(entry.includes('/projects/'), false);
  assert.equal(entry.includes('openAuth'), true);
});

test('sitemap and robots do not publish individual works', () => {
  const sitemap = read('src/app/sitemap.ts');
  const robots = read('src/app/robots.ts');
  assert.equal(sitemap.includes('/projects/'), false);
  assert.equal(sitemap.includes('/gallery'), false);
  assert.equal(robots.includes('allow: "/"'), true);
  for (const page of ['help', 'rules', 'privacy', 'terms']) assert.equal(sitemap.includes(page), true);
});
