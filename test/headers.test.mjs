import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeaders, headersFor } from '../index.mjs';

const rules = parseHeaders(readFileSync(join(new URL('.', import.meta.url).pathname, '..', 'hosting/_headers'), 'utf8'));
const RELEASE = '/assets/releases/2026.09.05-abc';

test('wasm is served with the content type streaming instantiation requires', () => {
  const headers = headersFor(rules, `${RELEASE}/main.dart.wasm`);
  assert.equal(headers['content-type'], 'application/wasm');
  assert.match(headers['cache-control'], /immutable/);
});

test('the manifest is revalidated, not frozen', () => {
  const headers = headersFor(rules, `${RELEASE}/owl-manifest.json`);
  assert.match(headers['cache-control'], /max-age=60/);
  assert.ok(!headers['cache-control'].includes('immutable'), 'the pointer must be able to move');
});

test('release assets are immutable', () => {
  for (const path of [`${RELEASE}/islands.js`, `${RELEASE}/main.dart.mjs`, `${RELEASE}/app.css`]) {
    assert.match(headersFor(rules, path)['cache-control'], /immutable/, path);
  }
});

test('cross-origin isolation is scoped to app paths, never the marketing site', () => {
  assert.equal(headersFor(rules, '/app/dashboard')['cross-origin-opener-policy'], 'same-origin');
  assert.equal(headersFor(rules, '/pricing')['cross-origin-opener-policy'], undefined);
  assert.equal(headersFor(rules, `${RELEASE}/islands.js`)['cross-origin-opener-policy'], undefined);
});

test('a header before any path pattern is a parse error, not a silent no-op', () => {
  assert.throws(() => parseHeaders('  Content-Type: text/plain\n'), /before any path pattern/);
});
