import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('matchQuiz: returns top 3 sorted descending by score', () => {
  const Catnu = loadCatnu();
  const answers = [0, 0, 0, 0, 0, 0, 0];
  const top3 = Catnu.matchQuiz(answers, { mode: 'first' });
  assert.equal(top3.length, 3);
  assert.ok(top3[0].score >= top3[1].score && top3[1].score >= top3[2].score);
});

test('scoreAllBreeds: wanting a clingy cat raises Ragdoll\'s score vs wanting an independent cat', () => {
  const Catnu = loadCatnu();
  const clingyAnswers = [1, 1, 0, 1, 2, 1, 1];
  const independentAnswers = [1, 1, 2, 1, 2, 1, 1];
  const a = Catnu.scoreAllBreeds(clingyAnswers, { mode: 'first' });
  const b = Catnu.scoreAllBreeds(independentAnswers, { mode: 'first' });
  const ragdollClingy = a.find(x => x.breed.id === 'ragdoll').score;
  const ragdollIndependent = b.find(x => x.breed.id === 'ragdoll').score;
  assert.ok(ragdollClingy > ragdollIndependent);
});

test('scoreAllBreeds: mode addCat + high existing-cat negative rate lowers a high-active/low-multiCatFriendly breed like Bengal', () => {
  const Catnu = loadCatnu();
  const answers = [1, 1, 1, 1, 2, 1, 1];
  const modeFirst = Catnu.scoreAllBreeds(answers, { mode: 'first' });
  const modeAdd = Catnu.scoreAllBreeds(answers, { mode: 'addCat', existingCat: { id: 'c1' }, existingCatNegativeRate: 0.8 });
  const bengalFirst = modeFirst.find(x => x.breed.id === 'bengal').score;
  const bengalAdd = modeAdd.find(x => x.breed.id === 'bengal').score;
  assert.ok(bengalAdd < bengalFirst);
});
