import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('index.html exposes window.Catnu with no DOM errors', () => {
  const Catnu = loadCatnu();
  assert.equal(typeof Catnu, 'object');
});
