import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('Store.load: no existing data -> fresh default state', () => {
  const Catnu = loadCatnu();
  const state = Catnu.Store.load();
  assert.equal(state.schemaVersion, 1);
  // NOT assert.deepEqual(state.cats, []) — state.cats is created inside the vm-sandboxed
  // script, so it carries that realm's Array.prototype; comparing it via deepEqual against
  // a `[]` literal written here in the outer test file fails on prototype-identity alone,
  // even though both are structurally empty arrays. Empirically verified: `vm.createContext`
  // + `assert.deepEqual([], [])` across realms throws "same structure but not
  // reference-equal" (same root cause hit and fixed the same way in Task 7's streak tests).
  assert.equal(state.cats.length, 0);
  assert.equal(state.logs.length, 0);
  assert.equal(state.streak.current, 0);
  assert.equal(state.streak.best, 0);
  assert.equal(state.streak.lastDoneDate, '');
});

test('Store.save then Store.load round-trips data', () => {
  const Catnu = loadCatnu();
  const state = Catnu.Store.load();
  state.cats.push({ id: 'c1', name: '貓A', breedId: 'british-longhair', emoji: '🐱', sex: '', birthYM: '', neutered: null, homeDate: '', notes: '' });
  Catnu.Store.save(state);
  const reloaded = Catnu.Store.load();
  assert.equal(reloaded.cats.length, 1);
  assert.equal(reloaded.cats[0].name, '貓A');
});

test('Store.load: corrupt JSON or wrong schemaVersion falls back to default', () => {
  const Catnu = loadCatnu({ 'catnu.v1': '{not json' });
  assert.equal(Catnu.Store.load().cats.length, 0);

  const Catnu2 = loadCatnu({ 'catnu.v1': JSON.stringify({ schemaVersion: 99, cats: [{ id: 'x' }] }) });
  assert.equal(Catnu2.Store.load().cats.length, 0);
});
