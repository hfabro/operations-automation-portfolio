// Exercise the actual generated page/worker under the same restricted project-path server as Pages.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {selectBrowser} from './browser-engine.mjs';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const selection = selectBrowser(require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
const T = require('./bi-prototype/preview/business-time-rules.js');
const fixture = JSON.parse(await readFile(resolve(root, 'tools/bi-prototype/fixtures/business-time-v1.json'), 'utf8'));
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4343', mount = '/operations-automation-portfolio';
const prefix = `http://127.0.0.1:${port}${mount}/business-intelligence/`;
const url = prefix + 'business-trends.html', output = resolve(root, 'tmp/bi-trends', selection.name);
const report = {passed: false, engine: selection.name, layouts: [], checks: [], errors: [], policyViolations: [], toolPolicyViolations: []};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keys = ['portfolio-phase2-connected-v1', 'portfolio-phase2-machines-v1', 'portfolio-phase2-work-v1'];
const checked = name => report.checks.push(name);
const ready = page => page.waitForFunction(() => !document.getElementById('trend-results').hidden && document.getElementById('trend-status').textContent.startsWith('Ready:'));
async function download(page) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.locator('#trend-download').click()]);
  return JSON.parse(await readFile(await file.path(), 'utf8'));
}
async function dates(page, from, asOf) {
  await page.locator('#trend-from').fill(from); await page.locator('#trend-cutoff').fill(asOf);
  await page.locator('#trend-apply').click(); await ready(page);
}
async function audit(page, name) {
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})));
  assert.deepEqual(violations, [], name);
}
let browser, server;
await mkdir(output, {recursive: true});
try {
  server = spawn(process.execPath, [resolve(root, 'tools/serve.mjs')], {cwd: root, env: {...process.env, PORT: port, BASE_PATH: mount}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((yes, no) => {server.stdout.once('data', yes); server.once('error', no); server.once('exit', code => no(Error('Preview exited ' + code)));});
  browser = await selection.type.launch(selection.options); report.browser = browser.version();
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({colorScheme: theme, reducedMotion: 'reduce', acceptDownloads: true});
    await context.addInitScript(({theme, keys}) => {
      localStorage.setItem('portfolio-theme', theme);
      for (const key of keys) if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, 'preserve-' + key);
    }, {theme, keys});
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({url: page.url(), message: error.message, stack: error.stack}));
    page.on('response', response => {if (response.status() >= 400) report.errors.push(response.url() + ' ' + response.status());});
    await page.exposeFunction('recordTrendPolicy', item => {
      if (selection.name === 'webkit' && item.phase === 'screenshot' && item.directive === 'style-src-elem' && item.blocked === 'inline' && !item.source)
        report.toolPolicyViolations.push(item);
      else report.policyViolations.push(item);
    });
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => window.recordTrendPolicy({directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile, phase: window.__trendToolPhase || 'runtime'})));
    assert.equal((await page.goto(url)).status(), 200); await ready(page);
    assert.match(await page.locator('[data-measure=posted] strong').innerText(), /6,200\.00/);
    assert.match(await page.locator('[data-measure=paid] strong').innerText(), /4,050\.00/);
    assert.match(await page.locator('[data-measure=unpaid] strong').innerText(), /2,150\.00/);
    assert.match(await page.locator('[data-measure=open] strong').innerText(), /2,250\.00/);
    assert.match(await page.locator('[data-due=overdue] strong').innerText(), /100\.00/);
    assert.match(await page.locator('[data-due=unknown-due-date] strong').innerText(), /2,000\.00/);
    assert.equal(await page.locator('#trend-months tr').count(), 4);
    assert.match(await page.locator('#trend-held-summary').innerText(), /3 held documents.*2 known.*1 unknown/);
    assert.match(await page.locator('#trend-coding').innerText(), /6 of 6.*Held requisitions: 1/);
    checked(theme + ': closing balances, unknown partition, monthly slices and coding denominators');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
      const layout = await page.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth + 1, theme: document.documentElement.dataset.theme, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length}));
      assert.equal(layout.overflow, false, theme + ' ' + width); assert.equal(layout.theme, theme); assert.equal(layout.h1, 1); assert.equal(layout.main, 1);
      if ([375, 1440].includes(width)) await audit(page, theme + ' ' + width);
      report.layouts.push({width, theme, ...layout});
      if ([375, 1440].includes(width)) {
        await page.evaluate(() => window.__trendToolPhase = 'screenshot');
        await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {window.__trendToolPhase = 'runtime'; resolve();}))));
      }
    }
    let exported = await download(page);
    assert.equal(exported.format, 'SIMULATED-BUSINESS-TRENDS'); assert.equal(exported.fictional, true);
    assert.equal(hash(exported.model), hash(T.compile(fixture)));
    assert.equal(exported.sourceEvents.length, 52);
    assert.equal(exported.monthlySlices.reduce((sum, p) => sum + p.flows.postedCents, 0), 620000);
    assert.equal(exported.monthlySlices.reduce((sum, p) => sum + p.flows.paidCents, 0), 405000);
    assert.deepEqual(exported.monthlySlices.map(p => p.unpaidRollforward.closingCents), [30000, 250000, 210000, 215000]);
    await page.locator('#trend-evidence-table').getByRole('button', {name: 'BT-B1', exact: true}).first().click();
    assert.match(await page.locator('#trend-detail-content').innerText(), /v1.*2,700\.00.*v2.*2,500\.00/);
    assert.match(await page.locator('#trend-detail-content').innerText(), /2026-09-01/);
    assert.equal(await page.locator('#trend-detail-heading').evaluate(element => element === document.activeElement), true);
    await page.getByRole('button', {name: '2026-09-09 · reviewCorrection · BT-B1-REVIEW', exact: true}).click();
    assert.match(await page.locator('#trend-detail-content').innerText(), /BT-B1-PROPOSE/);
    await page.getByRole('button', {name: 'BT-B1-PROPOSE', exact: true}).click();
    assert.match(await page.locator('#trend-detail-heading').innerText(), /BT-B1-PROPOSE/);
    await page.locator('[data-measure=open]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#trend-evidence-heading').evaluate(element => element === document.activeElement), true);
    await page.locator('#trend-evidence-table button').first().click();
    assert.match(await page.locator('#trend-detail-content').innerText(), /SYN-MASTER-1.*CODE-003/s);
    await page.locator('[data-due=unknown-due-date]').click();
    assert.equal(await page.locator('#trend-evidence-table tbody tr').count(), 1);
    await page.locator('#trend-evidence-table').getByRole('button', {name: 'BT-D1', exact: true}).click();
    assert.match(await page.locator('#trend-detail-content').innerText(), /Unknown.*Invoice date absent/s);
    await audit(page, theme + ' expanded document source');
    checked(theme + ': native metric keyboard action, exact allocation policy, retained correction and dependency drill-through');
    await page.locator('#trend-owner').selectOption('Buyer / AP');
    assert.match(await page.locator('#trend-held').innerText(), /BT-E1.*24 calendar days/s);
    await page.locator('#trend-owner').selectOption('all'); await page.locator('#trend-age').selectOption('unknown');
    assert.equal(await page.locator('#trend-held tr').count(), 1); assert.match(await page.locator('#trend-held').innerText(), /BT-C1.*Unknown age/s);
    await page.locator('#trend-held').getByRole('button', {name: 'BT-C1', exact: true}).click();
    exported = await download(page);
    assert.equal(exported.viewSelection.ageBucket, 'unknown'); assert.equal(exported.viewSelection.record.id, 'BT-C1');
    assert.equal(await page.locator('#trend-age').inputValue(), 'unknown');
    assert.match(await page.locator('#trend-detail-heading').innerText(), /BT-C1/);
    await page.locator('#trend-age').selectOption('all');
    await page.locator('#trend-work details').first().locator('summary').click();
    await page.getByRole('button', {name: 'Inspect work source WORK-0001', exact: true}).click();
    assert.match(await page.locator('#trend-detail-heading').innerText(), /BT-W-EXECUTE-1/);
    checked(theme + ': held-owner and unknown receipt-age filters, selection-preserving export, dated work version inspection');
    await page.locator('#trend-preset').selectOption('sep'); await ready(page);
    exported = await download(page);
    assert.deepEqual(exported.model.financial.unpaidRollforward, {openingCents: 30000, postedCents: 250000, paidCents: 30000, closingCents: 250000});
    assert.equal(exported.model.financial.unpaidDuePartition.overdueCents, 0);
    assert.equal(exported.model.financial.unpaidDuePartition.notYetDueCents, 250000);
    assert.equal(exported.sourceEvents.length, 20); assert(exported.sourceEvents.every(event => event.businessDate <= '2026-09-30'));
    assert.equal(exported.model.operations.workRecords.length, 0);
    assert.match(await page.locator('#trend-work-summary').innerText(), /outside this cutoff/);
    await page.reload(); await ready(page); assert.equal(await page.locator('#trend-preset').inputValue(), 'sep');
    assert.equal(await page.locator('#trend-from').inputValue(), '2026-09-01');
    await page.locator('#trend-preset').selectOption('oct'); await ready(page);
    exported = await download(page);
    assert.deepEqual(exported.model.financial.unpaidRollforward, {openingCents: 250000, postedCents: 210000, paidCents: 250000, closingCents: 210000});
    await page.locator('#trend-preset').selectOption('nov'); await ready(page);
    exported = await download(page);
    assert.deepEqual(exported.model.financial.unpaidRollforward, {openingCents: 210000, postedCents: 130000, paidCents: 125000, closingCents: 215000});
    await dates(page, '2026-08-18', '2026-11-14'); exported = await download(page);
    assert.equal(exported.model.operations.workRecords.length, 0); assert.equal(exported.model.financial.flows.postedCents, 495000);
    assert(!exported.sourceEvents.some(event => event.domain !== 'purchasing'));
    checked(theme + ': independent monthly goldens, due-date equality, URL restoration and exclusion of future operations/events');
    await dates(page, '2026-08-19', '2026-08-19');
    assert.match(await page.locator('[data-measure=posted] strong').innerText(), /0\.00/);
    assert.match(await page.locator('[data-measure=open] strong').innerText(), /500\.00/);
    assert.match(await page.locator('#trend-evidence-table').innerText(), /No records match/);
    await page.locator('#trend-from').fill('2026-11-15'); await page.locator('#trend-cutoff').fill('2026-08-18'); await page.locator('#trend-apply').click();
    await page.locator('#trend-error').waitFor({state: 'visible'});
    assert.equal(await page.locator('#trend-results').isVisible(), false); assert.equal(await page.locator('#trend-download').isDisabled(), true);
    await page.locator('#trend-preset').selectOption('nov'); await ready(page);
    await page.goto(url + '?from=2026-09-01&asOf=2026-11-16'); await page.locator('#trend-error').waitFor({state: 'visible'});
    assert.equal(await page.locator('#trend-results').isVisible(), false);
    await page.goto(url + '?asOf=2026-09-30&asOf=2026-11-15'); await page.locator('#trend-error').waitFor({state: 'visible'});
    assert.match(await page.locator('#trend-error').innerText(), /repeated/);
    await page.goto(url + '?asOf='); await page.locator('#trend-error').waitFor({state: 'visible'});
    assert.equal(await page.locator('#trend-download').isDisabled(), true);
    await page.locator('#trend-preset').selectOption('nov'); await ready(page);
    await page.locator('#trend-preset').selectOption('sep'); await page.locator('#trend-preset').selectOption('nov'); await ready(page);
    assert.match(await page.locator('#trend-status').innerText(), /2026-11-01 through 2026-11-15/);
    await page.getByRole('link', {name: 'Management snapshot and saved journals →', exact: true}).click();
    await page.waitForURL('**/business-intelligence/management-overview.html');
    await page.goBack(); await ready(page);
    await page.locator('#trend-preset').selectOption('sep'); await ready(page);
    assert.match(await page.locator('#trend-status').innerText(), /2026-09-01 through 2026-09-30/);
    assert.deepEqual(await page.evaluate(keys => keys.map(key => sessionStorage.getItem(key)), keys), keys.map(key => 'preserve-' + key));
    checked(theme + ': zero activity versus stock, invalid/repeated/empty dates, recovery/back navigation, latest-query response and untouched journals');
    await context.close();
  }
  // A failed worker or invalid source must not look like a genuine zero-valued cohort.
  for (const mode of ['blocked-worker', 'invalid-source', 'empty-cohort']) {
    const context = await browser.newContext();
    if (mode === 'blocked-worker') await context.route('**/business-trends-worker.js', route => route.abort());
    else {
      const source = await readFile(resolve(root, 'business-intelligence/business-trends-worker.js'), 'utf8');
      const fault = mode === 'invalid-source' ? 'self.BusinessTimeFixture.version=999;' : 'self.BusinessTimeFixture.events=[];';
      await context.route('**/business-trends-worker.js', route => route.fulfill({contentType: 'text/javascript', body: source + '\n' + fault}));
    }
    const page = await context.newPage(); await page.goto(url);
    if (mode === 'empty-cohort') {
      await ready(page); assert.match(await page.locator('[data-measure=unpaid] strong').innerText(), /0\.00/);
      assert.match(await page.locator('#trend-status').innerText(), /0 source events/);
      assert.equal(await page.locator('#trend-download').isDisabled(), false);
    } else {
      await page.locator('#trend-error').waitFor({state: 'visible'}); assert.equal(await page.locator('#trend-results').isVisible(), false);
      assert.equal(await page.locator('#trend-download').isDisabled(), true);
    }
    await context.close(); checked(mode + ': explicit availability state');
  }
  const nojs = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 900}, isMobile: selection.name === 'chromium', hasTouch: true});
  const page = await nojs.newPage(); await page.goto(prefix);
  const card = page.getByRole('link', {name: /What changed, and what is still outstanding/});
  await card.scrollIntoViewIfNeeded(); const box = await card.boundingBox(); await page.touchscreen.tap(box.x + 15, box.y + box.height - 15);
  await page.waitForURL('**/business-intelligence/business-trends.html');
  assert.match(await page.locator('.bi-noscript').innerText(), /JavaScript is needed/);
  assert.equal(await page.locator('#trend-results').isVisible(), false);
  await page.getByRole('link', {name: 'Management snapshot and saved journals →', exact: true}).focus(); await page.keyboard.press('Enter');
  await page.waitForURL('**/business-intelligence/management-overview.html');
  await nojs.close(); checked('no-JavaScript native touch discovery, keyboard return and readable boundaries');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.policyViolations, []);
  report.passed = true;
  console.log('PASS ' + selection.name + ': ' + report.layouts.length + ' rendered trend layouts and ' + report.checks.length + ' source/date/export/availability checks.');
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error);}
finally {await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); if (browser) await browser.close(); if (server) server.kill();}
