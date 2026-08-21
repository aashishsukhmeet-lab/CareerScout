/**
 * Renders public/ icons from scripts/icon.svg using the Chromium that
 * Playwright already ships, so there is no image-toolchain dependency.
 *
 *   node scripts/make-icons.mjs
 *
 * Regenerate and commit the PNGs whenever icon.svg changes.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(here, 'icon.svg'), 'utf8');
const out = (name) => resolve(here, '..', 'public', name);

const EXECUTABLE =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/**
 * `artScale` shrinks the bowl inside a full-bleed background — scaling the
 * whole SVG instead would shrink its background too and leave a seam.
 */
function scaleArt(source, artScale) {
  if (artScale === 1) return source;
  const about = `translate(256 256) scale(${artScale}) translate(-256 -256) `;
  const scaled = source.replace('id="art" transform="', `id="art" transform="${about}`);
  if (scaled === source) throw new Error('icon.svg has no <g id="art" transform="...">');
  return scaled;
}

async function render(page, { size, artScale = 1, name }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${scaleArt(svg, artScale)}`,
  );
  writeFileSync(out(name), await page.screenshot());
  console.log(`  public/${name}  ${size}x${size}`);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const page = await browser.newPage({ deviceScaleFactor: 1 });

await render(page, { size: 192, name: 'icon-192.png' });
await render(page, { size: 512, name: 'icon-512.png' });
// Maskable: Android crops to a circle, so the bowl pulls into the safe zone
// while the background still reaches every edge.
await render(page, { size: 512, artScale: 0.7, name: 'icon-maskable-512.png' });
// iOS ignores the manifest and rounds its own corners off an opaque square.
await render(page, { size: 180, name: 'apple-touch-icon.png' });
await render(page, { size: 32, name: 'favicon.png' });

await browser.close();
