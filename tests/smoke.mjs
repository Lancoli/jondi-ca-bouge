#!/usr/bin/env node
// Smoke test for Jondi ça bouge (run with the server running): verifies the app starts and serves its main page.
//   node tests/smoke.mjs                    http://127.0.0.1:4021
//   node tests/smoke.mjs --url http://…     custom URL
// Verifies:
//   1. /api/events responds 200 with expected structure (categories, sources, events)
//   2. the main page loads without JavaScript errors
//   3. essential interface elements are present in the DOM
// Exit code 1 on first failure. Used by the CI.

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_ = arg('url', 'http://127.0.0.1:4021');

const failures = [], ok = [];
const verif = (cond, msg) => {
  (cond ? ok : failures).push(msg);
  return cond;
};

// 1. API /api/events must respond 200 with categories, sources, events
const api = await fetch(URL_ + '/api/events')
  .then(async (r) => ({
    code: r.status,
    json: await r.json().catch(() => null)
  }))
  .catch((e) => ({ code: 0, err: e.message }));

const hasStructure = api.json
  && Array.isArray(api.json.categories)
  && Array.isArray(api.json.sources)
  && Array.isArray(api.json.events);

if (!verif(
  api.code === 200 && hasStructure,
  `API /api/events : ${api.code} · categories: ${api.json?.categories?.length || 0} · sources: ${api.json?.sources?.length || 0} · events: ${api.json?.events?.length || 0}${api.json?.error ? ' · ' + api.json.error : api.err ? ' · ' + api.err : ''}`
)) {
  fin();
}

// 2. Main page loads without errors
// We use dynamic import to avoid adding playwright-core to dependencies if not needed.
// If playwright is not available, we fallback to a simple fetch check.
let playwright;
try {
  const { createRequire } = await import('node:module');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ICI = dirname(fileURLToPath(import.meta.url));
  // Try to load playwright from the parent package.json (Hal has it, jondi_ca_boouge might not)
  playwright = createRequire(join(ICI, '..', 'package.json'))('playwright-core');
} catch {
  // playwright not available: fallback to fetch-only test
  const page = await fetch(URL_ + '/')
    .then((r) => ({ code: r.status }))
    .catch((e) => ({ code: 0, err: e.message }));
  verif(page.code === 200, `main page: ${page.code}${page.err ? ' · ' + page.err : ''}`);
  verif(true, 'playwright not available: limited test with fetch only (install playwright-core for full checks)');
  finish();
}

// Full test with playwright
const { chromium } = playwright;
const b = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));

await p.goto(URL_ + '/', { waitUntil: 'load' });
await p.waitForTimeout(1000);

verif(errors.length === 0, `JS errors on load: ${errors.length}${errors.length ? ' — ' + errors[0].slice(0, 120) : ''}`);

// 3. Essential interface elements are present
const state = await p.evaluate(() => {
  const present = (sel) => !!document.querySelector(sel);
  return {
    header: present('.masthead'),
    brand: present('.brand__name'),
    modeSwitch: present('.modeswitch'),
    explore: present('#explore'),
    map: present('#map'),
    agenda: present('#agenda'),
    filters: present('.filters'),
    search: present('#search'),
    footer: present('.footer')
  };
});

verif(state.header && state.brand, `header: ${state.header && state.brand ? 'present' : 'missing'}`);
verif(state.modeSwitch, `mode switch (Explore/List): ${state.modeSwitch ? 'present' : 'missing'}`);
verif(state.explore && state.map, `Explore section with map: ${state.explore && state.map ? 'present' : 'missing'}`);
verif(state.agenda, `Agenda section: ${state.agenda ? 'present' : 'missing'}`);
verif(state.filters, `filters panel: ${state.filters ? 'present' : 'missing'}`);
verif(state.search, `search field: ${state.search ? 'present' : 'missing'}`);
verif(state.footer, `footer: ${state.footer ? 'present' : 'missing'}`);

await b.close();
finish();

function finish() {
  for (const m of ok) console.log('✓ ' + m);
  for (const m of failures) console.log('✗ ' + m);
  console.log(failures.length ? `\n✗ smoke test: ${failures.length} failure(s)` : '\n✓ smoke test: app starts and serves its main page');
  process.exit(failures.length ? 1 : 0);
}
