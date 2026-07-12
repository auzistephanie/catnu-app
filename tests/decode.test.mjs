import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('DECODE has exactly 5 categories, each with 4-6 entries', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.DECODE.length, 5);
  for (const cat of Catnu.DECODE) {
    assert.ok(cat.category && Array.isArray(cat.items));
    assert.ok(cat.items.length >= 4 && cat.items.length <= 6, `${cat.category} item count`);
    for (const item of cat.items) {
      assert.ok(item.icon && item.signal && item.meaning && item.response);
    }
  }
});
