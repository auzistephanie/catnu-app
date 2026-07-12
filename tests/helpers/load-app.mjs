import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, '..', '..', 'index.html');

export function loadCatnu(storageSeed = {}) {
  const html = readFileSync(INDEX_PATH, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no <script> block found in index.html');
  const scriptSrc = match[1];

  const store = new Map(Object.entries(storageSeed));
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const stubWindow = { addEventListener() {}, localStorage };
  const stubDocument = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {} }; },
  };
  const context = {
    window: stubWindow,
    document: stubDocument,
    localStorage,
    console,
    Date,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(scriptSrc, context, { filename: 'index.html#inline-script' });
  return context.window.Catnu;
}
