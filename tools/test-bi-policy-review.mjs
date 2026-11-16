import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const selection = selectBrowser(require(process.env.PLAYWRIGHT_MODULE || 'playwright')), P = require('./bi-prototype/preview/policy-review-rules.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4643', prefix = `http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`, url = prefix + 'policy-review.html';
const output = resolve(root, 'tmp/bi-policy-review', selection.name), keys = ['portfolio-phase2-connected-v1', 'portfolio-phase2-machines-v1', 'portfolio-phase2-work-v1'];
const report = {passed: false, engine: selection.name, layouts: [], checks: [], errors: [], policyViolations: [], toolPolicyViolations: []};
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(sort(value))).digest('hex');
const checked = name => report.checks.push(name);
async function exportFile(page) {const [file] = await Promise.all([page.waitForEvent('download'), page.locator('#policy-download').click()]); const bytes = await readFile(await file.path()); return {bytes, data: JSON.parse(bytes.toString('utf8'))};}
async function audit(page, label) {await page.evaluate(axe); const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)}))); assert.deepEqual(violations, [], label);}
let browser, server;
await mkdir(output, {recursive: true});
try {
 server = spawn(process.execPath, [resolve(root, 'tools/serve.mjs')], {cwd: root, env: {...process.env, PORT: port, BASE_PATH: '/operations-automation-portfolio'}, stdio: ['ignore', 'pipe', 'pipe']});
 await new Promise((yes, no) => {server.stdout.once('data', yes); server.once('error', no); server.once('exit', code => no(Error('Preview exited ' + code)));});
 browser = await selection.type.launch(selection.options); report.browser = browser.version();
 for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({colorScheme: theme, reducedMotion: 'reduce', acceptDownloads: true});
  await context.addInitScript(({theme, keys}) => {localStorage.setItem('portfolio-theme', theme); for (const key of keys) sessionStorage.setItem(key, 'preserve-policy-' + key);}, {theme, keys});
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message)); page.on('response', response => {if (response.status() >= 400) report.errors.push(response.url() + ' ' + response.status());});
  await page.exposeFunction('recordPolicyReviewViolation', item => {if (selection.name === 'webkit' && item.phase === 'screenshot' && item.directive === 'style-src-elem' && item.blocked === 'inline' && !item.source) report.toolPolicyViolations.push(item); else report.policyViolations.push(item);});
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => window.recordPolicyReviewViolation({directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile, phase: window.__policyReviewPhase || 'runtime'})));
  assert.equal((await page.goto(url)).status(), 200); await page.waitForFunction(() => document.getElementById('policy-status').textContent.startsWith('Baseline captured hold'));
  assert.match(await page.locator('#policy-original').innerText(), /NO_APPROVED_MAPPING/); assert.match(await page.locator('#policy-result').innerText(), /Held/);
  const before = (await exportFile(page)).data.capturedBeforeChange;
  for (const width of [320, 375, 768, 1024, 1440]) {
   await page.setViewportSize({width, height: 1000}); await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
   const layout = await page.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth + 1, theme: document.documentElement.dataset.theme, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length}));
   assert.equal(layout.overflow, false, theme + ' ' + width); assert.equal(layout.theme, theme); assert.equal(layout.h1, 1); assert.equal(layout.main, 1);
   if ([375, 1440].includes(width)) {await audit(page, theme + ' ' + width); await page.evaluate(() => {document.activeElement?.blur(); scrollTo(0, 0); window.__policyReviewPhase = 'screenshot';}); await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true}); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {window.__policyReviewPhase = 'runtime'; resolve();}))));}
   report.layouts.push({width, theme, ...layout});
  }
  checked(theme + ': baseline missing mapping, untouched captured decision and accessible responsive controls');
  await page.locator('#policy-allocation').selectOption('split'); await page.locator('#policy-to').fill('2026-11-20');
  await page.locator('#policy-propose').focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('#policy-proposal').innerText(), /MAP-001.*Pending/s); assert.match(await page.locator('#policy-result').innerText(), /Held/);
  assert.equal(await page.locator('#policy-account').isDisabled(), true); assert.match(await page.locator('#policy-impact-summary').innerText(), /Hypothetical.*1 of 15/);
  assert.equal(await page.locator('#policy-impact tr').count(), 1); await page.locator('#policy-impact-all').check(); assert.equal(await page.locator('#policy-impact tr').count(), 15);
  assert.match(await page.locator('#policy-impact').innerText(), /WORK-CLOSED.*PROJECT_NOT_APPROVED/s);
  await page.locator('#policy-role').selectOption('Finance approver'); assert.equal(await page.locator('#policy-approve').isDisabled(), true);
  assert.match(await page.locator('#policy-review-gate').innerText(), /proposer cannot/); await page.locator('#policy-person').selectOption('PERSON-B');
  assert.equal(await page.locator('#policy-approve').isDisabled(), false); await page.locator('#policy-review-reason').fill(''); await page.locator('#policy-approve').click();
  assert.match(await page.locator('#policy-error').innerText(), /reason/); assert.match(await page.locator('#policy-proposal').innerText(), /Pending/);
  await page.locator('#policy-review-reason').fill('Independent review of this fictional account, shares and effective interval.'); await page.locator('#policy-approve').click();
  assert.match(await page.locator('#policy-result').innerText(), /Ready.*6105.*FAC-100.*70%.*PROD-200.*30%/s);
  assert.match(await page.locator('#policy-proposal').innerText(), /PERSON-A.*PERSON-B/s);
  checked(theme + ': pending impact, unchanged project holds, person-versus-role segregation and independent approval');
  const approved = await exportFile(page); assert.deepEqual(approved.data.capturedBeforeChange, before);
  assert.equal(approved.data.result.coding.netCents, 200000); assert.equal(approved.data.result.ruleId, 'FIN-MAP-001'); assert.equal(approved.data.impact.hypothetical, false);
  assert.equal(hash(approved.data), hash(P.evidence(approved.data.journal, approved.data.on, approved.data.viewSelection)), 'Full Node/browser policy and impact parity');
  for (const [date, expected] of [['2026-11-16', /Held/], ['2026-11-17', /Ready/], ['2026-11-20', /Held/]]) {await page.locator('#policy-test-date').fill(date); await page.locator('#policy-test').click(); assert.match(await page.locator('#policy-result').innerText(), expected);}
  await page.locator('#policy-test-date').fill('2026-11-18'); await page.locator('#policy-test').click();
  await page.setViewportSize({width: 375, height: 1000}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await audit(page, theme + ' approved impact state');
  await page.setViewportSize({width: 1440, height: 1000}); checked(theme + ': effective start/end boundaries, split distributions, exact parity and preserved original hold');
  await page.locator('#policy-reset').click(); assert.match(await page.locator('#policy-result').innerText(), /Held/);
  await page.getByText('Restore exported workbench evidence', {exact: true}).click();
  await page.locator('#policy-restore-file').setInputFiles({name: 'policy-evidence.json', mimeType: 'application/json', buffer: approved.bytes}); await page.locator('#policy-restore').click();
  await page.waitForFunction(() => document.getElementById('policy-status').textContent.startsWith('Evidence replayed and restored'));
  assert.match(await page.locator('#policy-result').innerText(), /Ready/); assert.equal(await page.locator('#policy-person').inputValue(), 'PERSON-B'); assert.equal(await page.locator('#policy-allocation').inputValue(), 'split');
  const tampered = structuredClone(approved.data); tampered.result.coding.account = 'FAKE-ACCOUNT';
  await page.locator('#policy-restore-file').setInputFiles({name: 'changed-results.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(tampered))}); await page.locator('#policy-restore').click();
  await page.waitForFunction(() => !document.getElementById('policy-error').hidden && document.getElementById('policy-error').textContent.includes('differs'));
  assert.match(await page.locator('#policy-result').innerText(), /Ready.*6105/s); assert.deepEqual((await exportFile(page)).data.capturedBeforeChange, before);
  checked(theme + ': downloaded evidence recovery, source-bound recalculation and atomic rejection of changed derived data');
  await page.locator('#policy-reset').click(); await page.locator('#policy-propose').click(); await page.locator('#policy-role').selectOption('Finance approver'); await page.locator('#policy-person').selectOption('PERSON-B'); await page.locator('#policy-reject').click();
  assert.match(await page.locator('#policy-proposal').innerText(), /Rejected/); assert.match(await page.locator('#policy-result').innerText(), /Held/);
  assert.deepEqual(await page.evaluate(keys => keys.map(key => sessionStorage.getItem(key)), keys), keys.map(key => 'preserve-policy-' + key));
  assert.deepEqual((await exportFile(page)).data.capturedBeforeChange, before); checked(theme + ': rejected mappings stay inactive and saved workflow journals remain byte-identical');
  await context.close();
 }
 const nojs = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 900}, isMobile: selection.name === 'chromium', hasTouch: true});
 const page = await nojs.newPage(); await page.goto(prefix); const card = page.getByRole('link', {name: /Who can change the coding rule/}); await card.scrollIntoViewIfNeeded(); const box = await card.boundingBox(); await page.touchscreen.tap(box.x + 15, box.y + box.height - 15); await page.waitForURL('**/business-intelligence/policy-review.html'); assert.match(await page.locator('.bi-noscript').innerText(), /JavaScript is needed/);
 await page.getByRole('link', {name: 'Baseline governed purchasing →', exact: true}).focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/business-intelligence/guided-entry.html'); await nojs.close(); checked('native no-JavaScript touch and keyboard discovery preserve the separate baseline');
 assert.deepEqual(report.errors, []); assert.deepEqual(report.policyViolations, []); report.passed = true;
 console.log('PASS ' + selection.name + ': ' + report.layouts.length + ' Finance policy layouts and ' + report.checks.length + ' independent-review/date/impact/recovery groups.');
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error);}
finally {await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); if (browser) await browser.close(); if (server) server.kill();}
