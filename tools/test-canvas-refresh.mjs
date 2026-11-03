import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.TEST_PORT || '4188';
const base = process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if (!process.env.SITE_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Preview exited ${code}`)));});
}
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const toast = root => root.locator('[data-canvas-toast-region] p');

  await page.goto(base + '/demos/ladder-inspection/');
  const ladder = page.locator('[data-canvas-title="LADDER INSPECTION APP"]');
  assert.match(await ladder.locator('[data-canvas-action="refresh"]').innerText(), /Reset inspection/);
  await page.locator('[data-qr-scan]').click();
  await page.locator('[data-screen="inspect"]:visible').waitFor();
  await ladder.locator('[data-canvas-action="refresh"]').click();
  assert.equal(await page.locator('[data-screen="identify"]').isVisible(), true);
  assert.equal(await toast(ladder).textContent(), 'Inspection entry cleared. Recorded history remains.');
  await page.locator('[data-missing="LAD-104"]').click();
  await ladder.locator('[data-canvas-action="refresh"]').click();
  assert.match(await page.locator('[data-missing="LAD-104"]').locator('xpath=../..').innerText(), /Not found · not inspected/);
  await page.locator('[data-qr-scan]').click();
  await page.locator('[data-screen="inspect"]:visible').waitFor();
  await ladder.locator('[data-canvas-action="home"]').click();
  assert.equal(await page.locator('[data-screen="identify"]').isVisible(), true);
  assert.match(await toast(ladder).textContent(), /Inspection entry cleared; recorded history remains/);

  await page.goto(base + '/demos/compliance-workflow/');
  const compliance = page.locator('[data-canvas-title="Compliance Operations"]');
  assert.match(await compliance.locator('[data-canvas-action="refresh"]').innerText(), /Reset workflow/);
  await page.locator('[data-generate]').click();
  await page.locator('[data-screen="occurrence"]:visible').waitFor();
  await compliance.locator('[data-canvas-action="refresh"]').click();
  assert.equal(await page.locator('[data-screen="master"]').isVisible(), true);
  assert.equal(await toast(compliance).textContent(), 'Workflow reset. Current entry cleared.');
  await page.locator('[data-generate]').click();
  await page.locator('[data-screen="occurrence"]:visible').waitFor();
  await compliance.locator('[data-canvas-action="home"]').click();
  assert.equal(await page.locator('[data-screen="master"]').isVisible(), true);
  assert.match(await toast(compliance).textContent(), /Current entry cleared/);

  await page.goto(base + '/demos/digital-kanban/');
  const requester = page.locator('[data-canvas-title="Replenishment Request"]');
  const restocker = page.locator('[data-canvas-title="Restocker Queue"]');
  assert.match(await requester.locator('[data-canvas-action="refresh"]').innerText(), /Reset scenario/);
  await page.locator('[data-phone-scan]').click();
  await page.locator('[data-item][data-blocked="false"]').first().waitFor();
  await page.locator('[data-item][data-blocked="false"]').first().click();
  assert.equal(await page.locator('[data-submit]').isEnabled(), true);
  await requester.locator('[data-canvas-action="refresh"]').click();
  assert.equal(await page.locator('[data-phone-scan]').isVisible(), true);
  assert.equal(await page.locator('[data-submit]').isDisabled(), true);
  assert.equal(await toast(requester).textContent(), 'Scenario reset to sample data.');
  await page.locator('[data-phone-scan]').click();
  await page.locator('[data-item][data-blocked="false"]').first().waitFor();
  await requester.locator('[data-canvas-action="home"]').click();
  assert.equal(await page.locator('[data-phone-scan]').isVisible(), true);
  assert.match(await toast(requester).textContent(), /Scenario reset to sample data/);

  await page.locator('[data-preview-mode="tablet"]').click();
  assert.match(await restocker.locator('[data-canvas-action="refresh"]').innerText(), /Refresh/);
  const previousCount = Number(await page.locator('[data-kpi-open]').textContent());
  await restocker.locator('[data-complete]').first().click();
  await restocker.locator('[data-canvas-confirm]').click();
  await page.waitForFunction(count => Number(document.querySelector('[data-kpi-open]').textContent) === count - 1, previousCount);
  await restocker.locator('[data-canvas-action="refresh"]').click();
  assert.equal(Number(await page.locator('[data-kpi-open]').textContent()), previousCount - 1);
  assert.equal(await toast(restocker).textContent(), 'Queue refreshed from synthetic session state.');

  await page.goto(base + '/demos/cmms-lifecycle/');
  const cmms = page.locator('#cmms-device');
  assert.match(await cmms.locator('[data-canvas-action="refresh"]').innerText(), /Refresh/);
  await cmms.locator('[data-asset-index="1"]').click();
  await cmms.locator('[data-canvas-action="refresh"]').click();
  assert.equal(await cmms.locator('[data-asset-index="1"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await toast(cmms).textContent(), 'View refreshed from the current synthetic session state.');

  console.log('PASS: resetting demos describe cleared changes; queue and default refresh preserve current session state');
} finally {
  await browser.close();
  if (server) server.kill();
}
