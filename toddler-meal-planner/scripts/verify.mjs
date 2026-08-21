/**
 * End-to-end check against a real browser, covering the things unit tests
 * cannot: that the screens render, that swaps and toggles survive a reload,
 * that every tap target is thumb-sized, and that the whole app still works
 * with the network pulled out.
 *
 *   npm run build && npm run verify
 *
 * Starts nothing itself — point it at a running preview server:
 *   npx vite preview --port 4173
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const EXECUTABLE =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let failures = 0;
const fail = (message) => {
  console.log(`  FAIL  ${message}`);
  failures += 1;
};
const pass = (message) => console.log(`  ok    ${message}`);

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'allow',
});
const page = await ctx.newPage();
const firstCard = () => page.locator('article').first();
const button = (name) => page.getByRole('button', { name, exact: true });

console.log('\nToday — swap, undo, made it');
await page.goto(`${BASE}/#/today`, { waitUntil: 'networkidle' });

const planned = (await firstCard().locator('h2').textContent())?.trim();
await firstCard().getByRole('button', { name: 'Swap', exact: true }).click();
await page.waitForTimeout(120);
const swappedTo = (await firstCard().locator('h2').textContent())?.trim();
if (planned === swappedTo) fail(`swap did not change the meal (still "${planned}")`);
else pass(`swap: "${planned}" -> "${swappedTo}"`);

if ((await firstCard().getByText('Swapped').count()) !== 1) fail('no "Swapped" chip after swapping');
const plannedRow = await firstCard().getByText(/^Planned:/).textContent();
if (!plannedRow?.includes(planned)) fail(`undo row does not name the planned meal: "${plannedRow}"`);

await firstCard().getByRole('button', { name: 'Made it', exact: true }).click();
await page.waitForTimeout(120);
if ((await firstCard().getByRole('button', { name: 'Made it', exact: true }).getAttribute('aria-pressed')) !== 'true')
  fail('"Made it" did not toggle on');
const counter = await page.getByText(/of 5 made/).textContent();
if (!counter?.startsWith('1 of 5')) fail(`counter did not update: "${counter}"`);
else pass('made it toggled, counter updated');

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(150);
if ((await firstCard().locator('h2').textContent())?.trim() !== swappedTo)
  fail('swap did not survive a reload');
else pass('swap and made-it survive a reload');

await firstCard().getByRole('button', { name: 'Undo', exact: true }).click();
await page.waitForTimeout(120);
if ((await firstCard().locator('h2').textContent())?.trim() !== planned)
  fail('undo did not restore the planned meal');
else pass('undo restores the planned meal in one tap');

console.log('\nWeek — routing into a single day');
await page.goto(`${BASE}/#/week`, { waitUntil: 'networkidle' });
await page.locator('button', { hasText: 'Day 4' }).first().click();
await page.waitForTimeout(200);
if (!page.url().includes('#/day/')) fail(`tapping a day did not route to a date (${page.url()})`);
else pass(`week -> ${page.url().split('#')[1]}`);
if ((await page.getByRole('button', { name: /Back to today/ }).count()) !== 1)
  fail('no "Back to today" affordance when viewing another day');

console.log('\nTrackers — milk log');
await page.goto(`${BASE}/#/trackers`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Morning/ }).click();
await page.waitForTimeout(120);
if (!(await page.locator('section').first().textContent())?.includes('6'))
  fail('milk total did not update');
else pass('milk logged, running total updated');

console.log('\nGroceries — ticks persist');
await page.goto(`${BASE}/#/groceries`, { waitUntil: 'networkidle' });
await page.locator('section li button').first().click();
await page.waitForTimeout(120);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(150);
if ((await page.locator('section li button').first().getAttribute('aria-pressed')) !== 'true')
  fail('grocery tick did not persist');
else pass('grocery tick persisted');

console.log('\nLayout — one-handed at 6am');
for (const hash of ['#/today', '#/week', '#/trackers', '#/groceries']) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .map((el) => ({ label: el.textContent.trim().slice(0, 28), height: el.getBoundingClientRect().height }))
      .filter((b) => b.height > 0 && b.height < 44),
  );
  if (small.length) fail(`${hash}: ${small.length} tap targets under 44px — ${JSON.stringify(small.slice(0, 3))}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    fail(`${hash} scrolls horizontally`);
}
pass('every tap target clears 44px, nothing scrolls sideways');

console.log('\nOffline');
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page
  .waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15000 })
  .catch(() => {});
if (!(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active)))
  fail('no active service worker');
else pass('service worker active');

await page.waitForTimeout(2500);
await ctx.setOffline(true);

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
if ((await page.locator('h1').first().textContent())?.trim() !== 'Today')
  fail('offline load did not render Today');
else if ((await page.locator('article').count()) !== 5)
  fail('offline load did not render five meal cards');
else pass('offline: Today renders with all five meals');

await page.goto(`${BASE}/#/groceries`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
const offlineItems = await page.locator('section li button').count();
if (offlineItems < 20) fail(`offline groceries rendered only ${offlineItems} items`);
else pass(`offline: groceries renders ${offlineItems} items`);

await page.goto(`${BASE}/#/today`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
// Assert the flip rather than a fixed value — earlier steps in this run may
// already have left the toggle on.
const madeButton = () => firstCard().getByRole('button', { name: 'Made it', exact: true });
const wasMade = (await madeButton().getAttribute('aria-pressed')) === 'true';
await madeButton().click();
await page.waitForTimeout(150);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const nowMade = (await madeButton().getAttribute('aria-pressed')) === 'true';
if (nowMade === wasMade) fail(`offline toggle did not persist (still ${wasMade})`);
else pass(`offline: toggles still write through (${wasMade} -> ${nowMade})`);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failures ? 1 : 0);
