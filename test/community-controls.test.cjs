const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

// Render the actual components with isolated session and URL hooks; no API or database access.
function render(file, name, query = '', signedIn = true) {
  const changes = [];
  const redirects = [];
  const urls = [];
  const params = new URLSearchParams(query);
  const auth = { user: signedIn ? { id: 1, username: '测试用户' } : null, loading: false, openAuth: url => redirects.push(url) };
  const output = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports: output.exports,
    require(id) {
      if (id === 'react') return { ...React, useState: initial => [name === 'Navbar' ? true : initial, value => changes.push(value)], useRef: () => ({ current: null }), useEffect() {} };
      if (id === 'next/navigation') return { useSearchParams: () => params, usePathname: () => '/' };
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === '@/lib/AuthContext') return { useAuth: () => auth };
      if (id === '@/lib/load-state') return require('../src/lib/load-state.ts');
      if (id === '@/lib/community') return require('../src/lib/community.ts');
      if (id.startsWith('@/')) return new Proxy({}, { get: () => () => null });
      return require(id);
    },
    URLSearchParams,
    window: { history: { replaceState: (_state, _title, url) => urls.push(url) } },
  });
  const tree = output.exports[name]();
  const nodes = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { nodes, changes, redirects, urls };
}

test('mobile navigation closes after signed-in navigation and still guards guests', () => {
  for (const signedIn of [true, false]) {
    const result = render('src/components/shared/navbar.tsx', 'Navbar', '', signedIn);
    const links = result.nodes.filter(node => node.props?.href === '/works');
    assert.equal(links.length, 2, 'desktop and mobile links exist');
    let prevented = false;
    links[1].props.onClick({ preventDefault() { prevented = true; } });
    assert.ok(result.changes.includes(false), 'close the mobile menu on every navigation');
    assert.equal(prevented, !signedIn);
    assert.deepEqual(result.redirects, signedIn ? [] : ['/works']);
  }
});

test('resource reset appears for sorting alone and clears search, sorting and page together', () => {
  for (const query of ['sort=popular', 'sort=discussed&search=工具&page=3']) {
    const result = render('src/components/community/GithubProjects.tsx', 'GithubProjects', query);
    const reset = result.nodes.find(node => node.type === 'button' && node.props.children === '清除筛选');
    assert.ok(reset, 'sorting alone must allow a reset');
    reset.props.onClick();
    const next = new URL(result.urls[0], 'https://example.invalid');
    assert.equal(next.pathname, '/github');
    assert.equal(next.searchParams.get('search'), null);
    assert.equal(next.searchParams.get('page'), null);
    assert.ok([null, 'latest'].includes(next.searchParams.get('sort')));
  }
});

test('resource search and sorting return to the first page without losing the other filter', () => {
  const result = render('src/components/community/GithubProjects.tsx', 'GithubProjects', 'search=旧词&sort=popular&page=3');
  result.nodes.find(node => node.props?.['aria-label'] === '搜索资源').props.onChange({ target: { value: '新词' } });
  result.nodes.find(node => node.props?.['aria-label'] === '资源排序').props.onChange({ target: { value: 'discussed' } });
  const [search, sort] = result.urls.map(url => new URL(url, 'https://example.invalid'));
  assert.equal(search.searchParams.get('search'), '新词');
  assert.equal(search.searchParams.get('sort'), 'popular');
  assert.equal(sort.searchParams.get('search'), '旧词');
  assert.equal(sort.searchParams.get('sort'), 'discussed');
  assert.equal(search.searchParams.get('page'), null);
  assert.equal(sort.searchParams.get('page'), null);
});
