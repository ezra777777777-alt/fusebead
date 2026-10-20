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

test('submit upload copy matches the login gate', () => {
  const submit = read('src/app/submit/page.tsx');
  assert.equal(submit.includes('图片链接可直接访问'), false);
  assert.equal(submit.includes('站内图片链接需要登录才能查看'), true);
  assert.equal(submit.includes('AuthedCover'), true);
  assert.equal(submit.includes('AttachmentGallery'), true);
});

test('project detail keeps the authenticated cover and the attachment gallery', () => {
  const page = read('src/app/projects/[id]/page.tsx');
  assert.equal(page.includes('<AuthedCover'), true);
  assert.equal(page.includes('<img src={project.cover_url}'), false);
  assert.equal(page.includes('<AttachmentGallery'), true);
});

test('sitemap and robots do not publish individual works', () => {
  const sitemap = read('src/app/sitemap.ts');
  const robots = read('src/app/robots.ts');
  assert.equal(sitemap.includes('/projects/'), false);
  assert.equal(sitemap.includes('/gallery'), false);
  assert.equal(robots.includes('allow: "/"'), true);
  for (const page of ['help', 'rules', 'privacy', 'terms']) assert.equal(sitemap.includes(page), true);
});
