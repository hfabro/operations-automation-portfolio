import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.TEST_PORT || '4190';
const base = process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if (!process.env.SITE_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview exited ${code}`)));});
}
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  for (const width of [375, 1440]) {
    for (const scan of ['[data-scan]', '[data-phone-scan]']) {
      const page = await browser.newPage({viewport: {width, height: 812}});
      await page.goto(base + '/demos/digital-kanban/');
      assert.equal(await page.evaluate(() => Boolean(document.querySelector('#kanban-console').compareDocumentPosition(document.querySelector('.physical-signal')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
      await page.locator('.demo-jump-link').click();
      assert.equal(new URL(page.url()).hash, '#kanban-console');
      await page.locator('[data-guide-start]').click();
      await page.locator('[data-guide-find]').click();
      await page.waitForTimeout(650);
      assert.equal(await page.evaluate(() => document.activeElement.matches('[data-scan]')), true);
      assert.equal(await page.locator('[data-scan]').evaluate(e => { const r=e.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight; }), true);
      await page.locator(scan).click();
      await page.waitForFunction(() => document.querySelector('[data-guide-step-title]').textContent === 'Select an eligible item');
      await page.waitForSelector('[data-item][data-blocked="false"]');
      assert.equal(await page.locator('[data-guide-count]').innerText(), 'Step 2 of 4');
      await page.close();
    }
  }
  console.log('PASS: both QR scan controls advance the guide at phone and desktop widths; jump and find-control point to the console');
} finally {
  await browser.close();
  if (server) server.kill();
}
