import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();

test('esc encodes the five HTML metacharacters and leaves other text', () => {
  assert.equal(Catnu.esc(null), '');
  assert.equal(Catnu.esc(undefined), '');
  assert.equal(Catnu.esc(`<img src=x onerror=alert(1)>"'`), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;');
  assert.equal(Catnu.esc('Mochi & 奶茶'), 'Mochi &amp; 奶茶');
});

test('safeDataImage keeps jpeg/png/webp data URLs and drops everything else', () => {
  const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const webp = 'data:image/webp;base64,UklGRg==';
  assert.equal(Catnu.safeDataImage(jpeg), jpeg);
  assert.equal(Catnu.safeDataImage('  ' + png + '  '), png);
  assert.equal(Catnu.safeDataImage(webp), webp);
  assert.equal(Catnu.safeDataImage('javascript:alert(1)'), '');
  assert.equal(Catnu.safeDataImage('data:image/svg+xml;base64,PHN2Zy8+'), '');
  assert.equal(Catnu.safeDataImage('data:text/html;base64,PGh0bWw+'), '');
  assert.equal(Catnu.safeDataImage(jpeg + '" onerror="alert(1)'), '');
  assert.equal(Catnu.safeDataImage(''), '');
});
