const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fusebead-attachments-'));
process.env.DB_PATH = path.join(temporary, 'test.db');
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'isolated-attachment-test-secret';
process.env.RESOURCE_REGISTRY_SITE_PROJECT = '';
const { enableProjectAttachmentsMigration, query } = require('../dist/config/db');
enableProjectAttachmentsMigration();
const { sanitizeImage } = require('../dist/utils/image-bytes');
const { resolveStoredAttachment, attachmentRoot } = require('../dist/routes/project-attachments');
const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../dist/middleware/auth');

const TINY_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==', 'base64');
const PNG_WITH_GPS = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAHWVYSWZFeGlmAABHUFNMYXRpdHVkZS1TRUNSRVQtODguOOeyo1sAAAARdEVYdENvbW1lbnQAaGVsbG8gZ3BzDCYGywAAAAxJREFUeJxj+M/AAAADAQEAyf6S7wAAAABJRU5ErkJggg==', 'base64');
const TINY_WEBP = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64');
const SECRET = 'GPSLatitude-SECRET-88.8';

function dataUrl(bytes, mime = 'application/octet-stream') {
  return `data:${mime};base64,${bytes.toString('base64')}`;
}
function withJpegExif(jpeg, secret) {
  const payload = Buffer.from(`Exif\0\0${secret}`);
  const segment = Buffer.alloc(4 + payload.length);
  segment[0] = 0xff; segment[1] = 0xe1;
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}
function withWebpExif(webp, secret) {
  const payload = Buffer.from(`Exif\0\0${secret}`);
  const header = Buffer.alloc(8);
  header.write('EXIF', 0, 4, 'ascii');
  header.writeUInt32LE(payload.length, 4);
  const chunk = Buffer.concat([header, payload, payload.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)]);
  const body = Buffer.concat([Buffer.from('WEBP'), chunk, webp.subarray(12)]);
  const out = Buffer.alloc(8 + body.length);
  out.write('RIFF', 0, 4, 'ascii');
  out.writeUInt32LE(body.length, 4);
  body.copy(out, 8);
  return out;
}
function jpegSegment(marker, payload) {
  const segment = Buffer.alloc(4 + payload.length);
  segment[0] = 0xff;
  segment[1] = marker;
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return segment;
}
function webpChunk(tag, data) {
  const header = Buffer.alloc(8);
  header.write(tag, 0, 4, 'ascii');
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)]);
}
function wrapWebp(chunks) {
  const body = Buffer.concat([Buffer.from('WEBP'), ...chunks]);
  const out = Buffer.alloc(8);
  out.write('RIFF', 0, 4, 'ascii');
  out.writeUInt32LE(body.length, 4);
  return Buffer.concat([out, body]);
}
function vp8x(flags) {
  const data = Buffer.alloc(10);
  data[0] = flags;
  return webpChunk('VP8X', data);
}
function vp8xFlags(bytes) {
  const at = bytes.indexOf('VP8X');
  assert.notEqual(at, -1);
  return bytes[at + 8];
}
function progressiveJpeg() {
  const jpeg = Buffer.from(TINY_JPEG);
  const sof = jpeg.indexOf(Buffer.from([0xff, 0xc0]));
  assert.notEqual(sof, -1);
  jpeg[sof + 1] = 0xc2;
  const sos = jpeg.lastIndexOf(Buffer.from([0xff, 0xda]));
  const headerLength = 2 + jpeg.readUInt16BE(sos + 2);
  const secondScan = Buffer.concat([jpeg.subarray(sos, sos + headerLength), Buffer.from([0x11])]);
  return Buffer.concat([
    jpeg.subarray(0, 2),
    jpegSegment(0xe1, Buffer.from(`Exif\0\0${SECRET}`)),
    jpegSegment(0xe3, Buffer.from('APP3-VENDOR-SECRET')),
    jpegSegment(0xee, Buffer.from('Adobe\0APP14-SECRET')),
    jpeg.subarray(2, jpeg.length - 2),
    secondScan,
    Buffer.from([0xff, 0xd9]),
  ]);
}

test('progressive JPEG and extended WebP keep pixels and drop metadata', () => {
  const progressive = sanitizeImage(progressiveJpeg());
  assert.equal(progressive.mime, 'image/jpeg');
  assert.equal(progressive.bytes[0], 0xff);
  assert.equal(progressive.bytes[1], 0xd8);
  assert.equal(progressive.bytes[progressive.bytes.length - 2], 0xff);
  assert.equal(progressive.bytes[progressive.bytes.length - 1], 0xd9);
  assert.equal(progressive.bytes.includes(Buffer.from([0xff, 0xc2])), true);
  const firstScan = progressive.bytes.indexOf(Buffer.from([0xff, 0xda]));
  const lastScan = progressive.bytes.lastIndexOf(Buffer.from([0xff, 0xda]));
  assert.notEqual(firstScan, -1);
  assert.notEqual(firstScan, lastScan);
  assert.equal(progressive.bytes.includes(Buffer.from('JFIF')), true);
  assert.equal(progressive.bytes.includes(Buffer.from(SECRET)), false);
  assert.equal(progressive.bytes.includes(Buffer.from('APP3-VENDOR-SECRET')), false);
  assert.equal(progressive.bytes.includes(Buffer.from('APP14-SECRET')), false);

  const icc = Buffer.from('ICC-PROFILE-KEEP');
  const withIcc = sanitizeImage(wrapWebp([vp8x(0x20), webpChunk('ICCP', icc), TINY_WEBP.subarray(12)]));
  assert.equal(withIcc.mime, 'image/webp');
  assert.equal(withIcc.bytes.includes(icc), true);
  assert.equal(vp8xFlags(withIcc.bytes) & 0x20, 0x20);
  assert.equal(vp8xFlags(withIcc.bytes) & 0x02, 0);

  const alpha = Buffer.from('ALPHA-PIXEL');
  const transparent = sanitizeImage(wrapWebp([
    vp8x(0x10 | 0x08),
    webpChunk('ALPH', alpha),
    webpChunk('EXIF', Buffer.from(`Exif\0\0${SECRET}`)),
    TINY_WEBP.subarray(12),
  ]));
  assert.equal(transparent.bytes.includes(alpha), true);
  assert.equal(transparent.bytes.includes(Buffer.from(SECRET)), false);
  assert.equal(vp8xFlags(transparent.bytes) & 0x10, 0x10);
  assert.equal(vp8xFlags(transparent.bytes) & 0x08, 0);

  assert.throws(() => sanitizeImage(wrapWebp([vp8x(0x02), TINY_WEBP.subarray(12)])), /PNG、JPEG 或 WebP/);
  assert.throws(() => sanitizeImage(wrapWebp([webpChunk('ANIM', Buffer.alloc(6)), TINY_WEBP.subarray(12)])), /PNG、JPEG 或 WebP/);
  assert.throws(() => sanitizeImage(wrapWebp([webpChunk('ANMF', Buffer.alloc(16)), TINY_WEBP.subarray(12)])), /PNG、JPEG 或 WebP/);
});

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/projects', require('../dist/routes/project-attachments').projectAttachmentsRouter);
app.use('/api/projects', require('../dist/routes/projects').projectsRouter);
app.use('/api/admin', require('../dist/routes/admin').adminRouter);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

test('post image attachments stay private until review and cannot be spoofed', async (t) => {
  const cleanPng = sanitizeImage(PNG_WITH_GPS);
  assert.equal(cleanPng.mime, 'image/png');
  assert.equal(cleanPng.bytes.includes(Buffer.from(SECRET)), false);
  assert.equal(cleanPng.bytes.includes(Buffer.from('hello gps')), false);
  const cleanJpeg = sanitizeImage(withJpegExif(TINY_JPEG, SECRET));
  assert.equal(cleanJpeg.mime, 'image/jpeg');
  assert.equal(cleanJpeg.bytes.includes(Buffer.from(SECRET)), false);
  assert.equal(cleanJpeg.bytes[0], 0xff);
  const cleanWebp = sanitizeImage(withWebpExif(TINY_WEBP, SECRET));
  assert.equal(cleanWebp.mime, 'image/webp');
  assert.equal(cleanWebp.bytes.includes(Buffer.from(SECRET)), false);
  assert.equal(resolveStoredAttachment('../secret.png'), null);
  assert.equal(resolveStoredAttachment('..\\secret.png'), null);
  assert.equal(resolveStoredAttachment('/etc/passwd'), null);
  assert.equal(resolveStoredAttachment('not-a-uuid.png'), null);
  assert.throws(() => sanitizeImage(Buffer.from('GIF89a')), /PNG、JPEG 或 WebP/);
  assert.throws(() => sanitizeImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2 * 1024 * 1024)])), /2 MB/);

  const hash = await bcrypt.hash('Password-For-Tests-Only', 4);
  const makeUser = async (email, admin = 0) => (await query('INSERT INTO users (username, email, password_hash, email_verified, is_admin) VALUES (?, ?, ?, 1, ?)', [email.split('@')[0], email, hash, admin])).insertId;
  const author = signToken({ userId: await makeUser('author-attach@test.invalid'), plan: 'free' });
  const other = signToken({ userId: await makeUser('other-attach@test.invalid'), plan: 'free' });
  const admin = signToken({ userId: await makeUser('admin-attach@test.invalid', 1), plan: 'free' });
  const server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });

  async function raw(url, token, method = 'GET', body) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const buf = Buffer.from(await response.arrayBuffer());
    return { response, buf };
  }
  async function api(url, token, method = 'GET', body, status = 200) {
    const result = await raw(url, token, method, body);
    let data = {};
    try { data = JSON.parse(result.buf.toString()); } catch { data = { raw: result.buf.toString() }; }
    assert.equal(result.response.status, status, `${method} ${url}: ${result.buf.toString()}`);
    return data;
  }
  const draft = { title: '多图附件验收', summary: '用于隔离库的图片附件', category: '网页小玩具', demoUrl: 'https://example.com/attachments', acceptedRules: true };
  const created = await api('/api/projects', author, 'POST', draft, 201);
  let project = await api(`/api/projects/${created.id}`, author);

  await t.test('rejects spoofed types, oversize files, traversal names, and anonymous reads', async () => {
    await api(`/api/projects/${project.id}/attachments`, null, 'POST', { image: dataUrl(PNG_WITH_GPS, 'image/png'), revision: project.revision }, 401);
    await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(Buffer.from('<html><script>alert(1)</script></html>'), 'image/jpeg'), filename: '../../secret.png', revision: project.revision }, 400);
    await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(Buffer.from('GIF89a-not-an-image'), 'image/png'), revision: project.revision }, 400);
    await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(Buffer.alloc(2 * 1024 * 1024 + 1, 7), 'image/png'), revision: project.revision }, 400);
    const broken = Buffer.from(PNG_WITH_GPS);
    broken[20] ^= 0xff;
    await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(broken, 'image/png'), revision: project.revision }, 400);

    const uploaded = await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(PNG_WITH_GPS, 'image/jpeg'), filename: '../../secret.png', path: '/etc/passwd', revision: project.revision }, 201);
    assert.match(uploaded.attachment.url, /^\/projects\/\d+\/attachments\/\d+$/);
    assert.equal(uploaded.attachment.url.includes('..'), false);
    assert.equal(uploaded.attachment.mime, 'image/png');
    assert.equal(fs.existsSync(path.join(path.dirname(attachmentRoot()), 'secret.png')), false);
    const names = fs.readdirSync(attachmentRoot());
    assert.equal(names.every((name) => /^[0-9a-f-]{36}\.png$/i.test(name)), true);
    assert.equal(fs.readFileSync(path.join(attachmentRoot(), names[0])).includes(Buffer.from(SECRET)), false);
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal(project.status, 'pending');

    const anon = await raw(uploaded.attachment.url.replace('/projects/', '/api/projects/'));
    assert.equal(anon.response.status, 401);
    assert.equal(JSON.parse(anon.buf.toString()).code, 'AUTH_REQUIRED');
    assert.equal(anon.response.headers.get('content-type').includes('json'), true);
    assert.notEqual(anon.buf[0], 0x89);
    const anonThumb = await raw(`${uploaded.attachment.thumbnailUrl.replace('/projects/', '/api/projects/')}`);
    assert.equal(anonThumb.response.status, 401);
    assert.equal(JSON.parse(anonThumb.buf.toString()).code, 'AUTH_REQUIRED');
    assert.equal(anonThumb.buf.includes(cleanPng.bytes), false);
    const badToken = await raw(uploaded.attachment.url.replace('/projects/', '/api/projects/'), 'not-a-token');
    assert.equal(badToken.response.status, 401);
    assert.equal(JSON.parse(badToken.buf.toString()).code, 'AUTH_REQUIRED');
    await api(`/api/projects/${project.id}/attachments`, null, 'GET', undefined, 401);
    await api(`/api/projects/${project.id}/attachments/${uploaded.attachment.id}`, other, 'GET', undefined, 404);

    const owned = await raw(uploaded.attachment.url.replace('/projects/', '/api/projects/'), author);
    assert.equal(owned.response.status, 200);
    assert.equal(owned.response.headers.get('content-type'), 'image/png');
    assert.equal(owned.response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(owned.response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(owned.buf, fs.readFileSync(path.join(attachmentRoot(), names[0])));
    const thumb = await raw(uploaded.attachment.thumbnailUrl.replace('/projects/', '/api/projects/'), author);
    assert.equal(thumb.response.status, 200);
    assert.equal(thumb.response.headers.get('content-type'), 'image/png');
    assert.equal(thumb.response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(thumb.response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(thumb.buf, owned.buf);

    const outside = path.join(path.dirname(attachmentRoot()), 'secret.png');
    fs.writeFileSync(outside, Buffer.from(`SECRET-OUTSIDE-${SECRET}`));
    const escaped = await raw(`/api/projects/${project.id}/attachments/..%2F..%2Fsecret.png`, author);
    assert.notEqual(escaped.response.status, 200);
    assert.equal(escaped.buf.includes(Buffer.from('SECRET-OUTSIDE')), false);
    const disguised = await raw(`/api/projects/covers/../attachments/${names[0]}`, author);
    assert.notEqual(disguised.response.status, 200);
    assert.equal(disguised.buf.includes(cleanPng.bytes), false);
    fs.rmSync(outside, { force: true });
  });

  await t.test('logged-in readers see approved images, and other users cannot edit them', async () => {
    const jpeg = await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(withJpegExif(TINY_JPEG, SECRET), 'image/png'), revision: project.revision }, 201);
    const webp = await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(withWebpExif(TINY_WEBP, SECRET), 'image/gif'), revision: jpeg.revision }, 201);
    project = await api(`/api/projects/${project.id}`, author);
    for (const name of fs.readdirSync(attachmentRoot())) assert.equal(fs.readFileSync(path.join(attachmentRoot(), name)).includes(Buffer.from(SECRET)), false);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal(project.status, 'approved');
    const listed = await api(`/api/projects/${project.id}/attachments`, other);
    assert.equal(listed.attachments.length, 3);
    assert.equal(JSON.stringify(listed).includes('stored_name'), false);
    const visible = await raw(listed.attachments[1].url.replace('/projects/', '/api/projects/'), other);
    assert.equal(visible.response.status, 200);
    assert.equal(visible.response.headers.get('content-type'), 'image/jpeg');
    assert.equal(visible.buf.includes(Buffer.from(SECRET)), false);

    await api(`/api/projects/${project.id}/attachments`, other, 'POST', { image: dataUrl(TINY_JPEG, 'image/jpeg'), revision: project.revision }, 403);
    await api(`/api/projects/${project.id}/attachments/${webp.attachment.id}`, other, 'DELETE', { revision: project.revision }, 403);
    await api(`/api/projects/${project.id}/attachments/order`, other, 'PUT', { ids: listed.attachments.map((item) => item.id).reverse(), revision: project.revision }, 403);
    await api(`/api/projects/${project.id}/attachments/order`, author, 'PUT', { ids: [1], revision: project.revision }, 400);

    const order = await api(`/api/projects/${project.id}/attachments/order`, author, 'PUT', { ids: listed.attachments.map((item) => item.id).reverse(), revision: project.revision });
    assert.deepEqual(order.attachments.map((item) => item.id), listed.attachments.map((item) => item.id).reverse());
    project = await api(`/api/projects/${project.id}`, author);
    assert.equal(project.status, 'approved');

    const added = await api(`/api/projects/${project.id}/attachments`, author, 'POST', { image: dataUrl(TINY_JPEG, 'image/jpeg'), revision: project.revision }, 201);
    assert.equal(added.status, 'pending');
    await api(`/api/projects/${project.id}/attachments/${added.attachment.id}`, other, 'GET', undefined, 404);
    assert.equal((await api(`/api/projects?search=${encodeURIComponent(draft.title)}`, other)).total, 0);
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);

    const filesBeforeDelete = fs.readdirSync(attachmentRoot()).length;
    const removed = await api(`/api/projects/${project.id}/attachments/${added.attachment.id}`, author, 'DELETE', { revision: project.revision });
    assert.equal(removed.status, 'pending');
    assert.equal(fs.readdirSync(attachmentRoot()).length, filesBeforeDelete - 1);
    const gone = await raw(added.attachment.url.replace('/projects/', '/api/projects/'), author);
    assert.equal(gone.response.status, 404);
    assert.equal(gone.response.headers.get('content-type').includes('json'), true);
    assert.notEqual(gone.buf[0], 0xff);
    project = await api(`/api/projects/${project.id}`, author);
    await api(`/api/admin/projects/${project.id}`, admin, 'PUT', { action: 'approve', revision: project.revision });
    project = await api(`/api/projects/${project.id}`, author);
    const beforeAdmin = (await api(`/api/projects/${project.id}/attachments`, admin)).attachments;
    const adminRemoved = await api(`/api/projects/${project.id}/attachments/${beforeAdmin[0].id}`, admin, 'DELETE', { revision: project.revision });
    assert.equal(adminRemoved.status, 'approved');
    await api(beforeAdmin[0].url.replace('/projects/', '/api/projects/'), other, 'GET', undefined, 404);
  });

  await t.test('a post stops accepting images after eight', async () => {
    const fresh = await api('/api/projects', author, 'POST', { ...draft, title: '第八张以后不行', demoUrl: 'https://example.com/attachments-limit' }, 201);
    let revision = 1;
    const ids = [];
    for (let index = 0; index < 8; index++) {
      const uploaded = await api(`/api/projects/${fresh.id}/attachments`, author, 'POST', { image: dataUrl(TINY_JPEG, 'text/plain'), revision }, 201);
      revision = uploaded.revision;
      ids.push(uploaded.attachment.id);
    }
    await api(`/api/projects/${fresh.id}/attachments`, author, 'POST', { image: dataUrl(TINY_JPEG, 'image/jpeg'), revision }, 400);
    const listed = await api(`/api/projects/${fresh.id}/attachments`, author);
    assert.equal(listed.attachments.length, 8);
    assert.deepEqual(listed.attachments.map((item) => item.id), ids);
  });

  await t.test('a tampered stored name cannot read outside the attachment directory', async () => {
    const [row] = await query('SELECT id, project_id, stored_name FROM project_attachments LIMIT 1');
    const marker = path.join(path.dirname(attachmentRoot()), 'secret.png');
    fs.writeFileSync(marker, Buffer.from('SECRET-TRAVERSAL-BYTES'));
    await query("UPDATE project_attachments SET stored_name = ? WHERE id = ?", ['../secret.png', row.id]);
    const response = await raw(`/api/projects/${row.project_id}/attachments/${row.id}`, author);
    assert.equal(response.response.status, 404);
    assert.equal(response.buf.includes(Buffer.from('SECRET-TRAVERSAL-BYTES')), false);
    fs.rmSync(marker, { force: true });
  });
});
