import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.TEST_PORT || '4189';
const base = process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if (!process.env.SITE_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview exited ${code}`)));});
}
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 812}});
  for (const width of [375, 1440]) {
    await page.setViewportSize({width, height: 812});
    for (const slug of ['electrical-analytics', 'forklift-fleet', 'ehs-control']) {
    await page.goto(base + '/demos/' + slug + '/');
    for (const key of ['Enter', 'Space']) {
      const tab = page.locator('[data-tab="1"]');
      await tab.focus();
      await page.keyboard.press(key);
      assert.equal(await tab.getAttribute('aria-pressed'), 'true', slug + ' view selection');
      assert.equal(await tab.evaluate(el => el === document.activeElement), true, slug + ' focus after ' + key);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('[data-tab="2"]').evaluate(el => el === document.activeElement), true, slug + ' next Tab');
    }
    if (slug === 'ehs-control') await page.locator('[data-tab="2"]').click();
    const filters = slug === 'electrical-analytics'
      ? [['#energy-meter', 'Support', '#energy-type']]
      : slug === 'forklift-fleet'
        ? [['#fleet-truck', null, '#fleet-period']]
        : [['#task-select', '1', '#task-owner']];
    for (const [selector, value, next] of filters) {
      const filter = page.locator(selector);
      await filter.focus();
      const selected = value ?? await filter.locator('option').nth(1).getAttribute('value');
      await filter.selectOption(selected);
      assert.equal(await filter.inputValue(), selected, slug + ' filter selection');
      assert.equal(await filter.evaluate(el => el === document.activeElement), true, slug + ' filter focus');
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(next).evaluate(el => el === document.activeElement), true, slug + ' next Tab after filter');
    }
    }
  }
  console.log('PASS: keyboard view selection, filter focus, and next Tab in three operational reports');
} finally {
  await browser.close();
  if (server) server.kill();
}
