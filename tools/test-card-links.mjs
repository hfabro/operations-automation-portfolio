import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.TEST_PORT || '4186';
const base = process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if (!process.env.SITE_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview exited ${code}`)));});
}
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}, hasTouch: true});
    const page = await context.newPage();
    async function tapSurface(selector) {
      const target = typeof selector === 'string' ? page.locator(selector).first() : selector;
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      assert.ok(box);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.goto(base + '/');
    await tapSurface('.home-project h3');
    await page.waitForURL('**/work/facilities-digital-operations/');
    assert.ok(page.url().endsWith('/work/facilities-digital-operations/'));
    await page.goto(base + '/demos/');
    await tapSurface('.systems-page .work-summary-card h3');
    await page.waitForURL('**/demos/plant-operations-hub/');
    assert.ok(page.url().endsWith('/demos/plant-operations-hub/'));
    await page.goto(base + '/work/');
    for (let i = 0; i < 7; i++) {
      const card = page.locator('.gallery-card').nth(i);
      const destination = await card.locator('h3 a').getAttribute('href');
      assert.ok(destination.startsWith('../demos/'));
      const expected = new URL(destination, page.url()).href;
      await tapSurface(card.locator(i === 0 || width > 640 ? '.gallery-preview' : 'h3'));
      await page.waitForURL(expected);
      await page.goto(base + '/work/');
    }
    await page.goto(base + '/work/');
    await page.locator('.gallery-card .gallery-proof summary').first().click();
    assert.equal(await page.locator('.gallery-card .gallery-proof').first().getAttribute('open'), '');
    await page.locator('.gallery-card .card-links a').first().click();
    assert.ok(page.url().endsWith('/work/facilities-digital-operations/'));
    await page.goto(base + '/work/');
    await page.locator('.gallery-card .card-links a').last().click();
    assert.ok(page.url().includes('/demos/'));
    await context.close();
  }
  const nojs = await browser.newContext({javaScriptEnabled: false});
  const page = await nojs.newPage();
  await page.goto(base + '/demos/');
  await page.locator('.systems-page .work-summary-card > a').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/demos/plant-operations-hub/');
  assert.ok(page.url().endsWith('/demos/plant-operations-hub/'));
  await nojs.close();
  console.log('PASS: card surfaces open their links; independent controls, keyboard and no-JavaScript navigation work');
} finally { await browser.close(); if (server) server.kill(); }
