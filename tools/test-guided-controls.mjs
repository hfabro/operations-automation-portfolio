import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.TEST_PORT || '4198';
const base = process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if (!process.env.SITE_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview exited ${code}`)));});
}
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 812}});
    for (const demo of [
      {slug: 'ladder-inspection', first: '[data-qr-scan]', target: '[data-inspection-form] button[type="submit"]', title: 'Validate and submit'},
      {slug: 'compliance-workflow', first: '[data-generate]', target: '[data-occurrence-form] button[type="submit"]', title: 'Validate the lifecycle update'}
    ]) {
      await page.goto(`${base}/demos/${demo.slug}/`);
      await page.locator('[data-guide-start]').click();
      await page.locator(demo.first).click();
      await page.waitForFunction(() => document.querySelector('[data-guide-count]').textContent.startsWith('Step 2'));
      await page.locator('[data-scenario="exception"]').click();
      await page.waitForFunction(title => document.querySelector('[data-guide-step-title]').textContent === title, demo.title);
      if (demo.slug === 'ladder-inspection') await page.locator('[data-certify]').check();
      await page.locator('[data-guide-find]').click();
      await page.waitForFunction(selector => {
        const target = document.querySelector(selector);
        if (document.activeElement !== target || !target.classList.contains('demo-guide-target')) return false;
        const rect = target.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth) return false;
        for (let parent = target.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (!/(auto|scroll|hidden|clip)/.test(style.overflowY)) continue;
          const clip = parent.getBoundingClientRect();
          if (rect.top < clip.top || rect.bottom > clip.bottom) return false;
        }
        return true;
      }, demo.target);
      assert.match(await page.locator('[data-guide-live]').textContent(), /highlighted/);
      await page.locator(demo.target).click();
      await page.locator('[data-canvas-confirm]:visible').click();
      try { await page.locator('[data-guide-complete]:visible').first().waitFor({timeout: 5000}); }
      catch (error) {
        throw new Error(`${demo.slug} at ${width}px did not complete: ${await page.locator('[data-error-summary]').innerText()} (${await page.locator('[data-guide-count]').textContent()})`, {cause: error});
      }
    }
    await page.close();
  }
  console.log('PASS: guided submit controls are focused, visible within device scrollports, and complete both workflows at 375px and 1440px');
} finally {
  await browser.close();
  if (server) server.kill();
}
