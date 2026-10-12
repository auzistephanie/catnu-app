import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();

test('catArt maps preset + mood to the webp art file', () => {
  assert.equal(Catnu.catArt('grey', 'purr'), 'images/cats/grey-purr.webp');
  assert.equal(Catnu.catArt('calico'), 'images/cats/calico-happy.webp');
});

test('catArt falls back to the first preset and happy for unknown input', () => {
  assert.equal(Catnu.catArt('unicorn', 'angry'), `images/cats/${Catnu.AVATAR_PRESETS[0]}-happy.webp`);
  assert.equal(Catnu.catArt(null, null), `images/cats/${Catnu.AVATAR_PRESETS[0]}-happy.webp`);
});

test('every preset x mood has a mood listed in CAT_MOODS', () => {
  assert.deepEqual([...Catnu.CAT_MOODS], ['happy', 'sleepy', 'shy', 'purr']);
});
