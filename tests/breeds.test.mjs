import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('BREEDS has exactly 16 entries with unique ids', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.BREEDS.length, 16);
  assert.equal(new Set(Catnu.BREEDS.map(b => b.id)).size, 16);
});

test('british-longhair has deepDive; mixed has approachGuide instead of traits', () => {
  const Catnu = loadCatnu();
  const bl = Catnu.BREEDS.find(b => b.id === 'british-longhair');
  assert.ok(bl.deepDive && bl.traits && typeof bl.traits.holdOk === 'number');
  const mixed = Catnu.BREEDS.find(b => b.id === 'mixed');
  assert.equal(mixed.mixedBreed, true);
  assert.equal(mixed.traits, null);
  assert.ok(Array.isArray(mixed.approachGuide) && mixed.approachGuide.length >= 4);
});

test('every breed has multiCatFriendly 0-100 and a non-empty breedRules array', () => {
  const Catnu = loadCatnu();
  for (const b of Catnu.BREEDS) {
    assert.ok(b.multiCatFriendly >= 0 && b.multiCatFriendly <= 100, `${b.id} multiCatFriendly`);
    assert.ok(Array.isArray(b.breedRules) && b.breedRules.length >= 1, `${b.id} breedRules`);
    for (const rule of b.breedRules) {
      assert.ok(['negativeWarning', 'positiveFinding', 'noRecentAction'].includes(rule.when), `${b.id} rule.when`);
      assert.ok(Catnu.ACTIONS.some(a => a.id === rule.action), `${b.id} rule.action must be a real action id`);
    }
  }
});
