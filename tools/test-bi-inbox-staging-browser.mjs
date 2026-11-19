import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const selection = selectBrowser(require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
const J = require('./bi-prototype/preview/journey-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const C = require('./bi-prototype/preview/inbox-context.js');
const U = require('./bi-prototype/preview/ubl-invoice-samples.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4455', prefix = process.env.BI_BASE_URL || `http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`;
const output = resolve(root, 'tmp/bi-inbox-staging', selection.name), url = prefix + 'document-inbox.html';
const key = 'portfolio-phase2-connected-v1', others = ['portfolio-phase2-machines-v1', 'portfolio-phase2-work-v1'];
const raw = J.serialize(S.journal()), context = await C.capture(raw), sample = C.example(context, S.journal().erp.lines[0].id)[0];
const report = {passed: false, engine: selection.name, checks: [], layouts: [], errors: []}, checked = name => report.checks.push(name);
const idle = page => page.waitForFunction(() => !document.getElementById('inbox-results').hidden && document.getElementById('inbox-results').getAttribute('aria-busy') === 'false');
const capture = async page => {await page.locator('#inbox-capture').click(); await page.waitForFunction(() => !document.getElementById('inbox-captured').hidden);};
const saved = page => page.evaluate(key => window.nativeGet.call(sessionStorage, key), key);
const setSaved = (page, value) => page.evaluate(({key, value}) => window.nativeSet.call(sessionStorage, key, value), {key, value});
async function upload(page, content = sample.content, name = 'original.txt') {
 if (!await page.locator('#inbox-files').isVisible()) await page.getByText('Try supported local text or XML files', {exact: true}).click();
 await page.locator('#inbox-files').setInputFiles({name, mimeType: name.endsWith('.xml') ? 'application/xml' : 'text/plain', buffer: Buffer.from(content)});
 await page.locator('#inbox-extract').click(); await idle(page);
 await page.getByText('Try supported local text or XML files', {exact: true}).click();
}
async function evidence(page, id = 'inbox-download') {
 const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#' + id).click()]);
 return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function stage(page) {
 await page.locator('#inbox-stage-button').click();
 await page.waitForFunction(() => /original invoices saved|Existing imports verified/.test(document.getElementById('inbox-stage-summary').textContent));
}
async function pauseHash(page) {
 await page.evaluate(() => {const digest = crypto.subtle.digest.bind(crypto.subtle); let first = true; window.hashPaused = false;
  crypto.subtle.digest = async (...args) => {if (first) {first = false; window.hashPaused = true; await new Promise(resolve => {window.releaseHash = resolve;});} return digest(...args);};});
}
let browser, server;
await mkdir(output, {recursive: true});
try {
 if (!process.env.BI_BASE_URL) {
  server = spawn(process.execPath, [resolve(root, 'tools/serve.mjs')], {cwd: root, env: {...process.env, PORT: port, BASE_PATH: '/operations-automation-portfolio'}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((yes, no) => {server.stdout.once('data', yes); server.once('error', no); server.once('exit', code => no(Error('Preview exited ' + code)));});
 }
 browser = await selection.type.launch(selection.options); report.browser = browser.version();
 for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({colorScheme: theme, reducedMotion: 'reduce', acceptDownloads: true});
  await ctx.addInitScript(({key, raw, others, theme}) => {
   localStorage.setItem('portfolio-theme', theme);
   if (!sessionStorage.getItem('__stage-test-seeded')) {sessionStorage.setItem(key, raw); for (const other of others) sessionStorage.setItem(other, 'preserve-' + other); sessionStorage.setItem('__stage-test-seeded', 'yes');}
   window.nativeSet = Storage.prototype.setItem; window.nativeGet = Storage.prototype.getItem; window.testWrites = [];
   Storage.prototype.setItem = function(k, v) {if (this === sessionStorage) {window.testWrites.push(k); if (window.blockWrite) throw Error('Simulated quota failure');} const result = window.nativeSet.call(this, k, v); if (this === sessionStorage && k === key && window.failVerification) window.blockRead = true; return result;};
   Storage.prototype.getItem = function(k) {if (this === sessionStorage && k === key && window.blockRead) throw Error('Simulated read failure'); return window.nativeGet.call(this, k);};
  }, {key, raw, others, theme});
  const page = await ctx.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) report.errors.push(response.url() + ' ' + response.status());});
  await page.goto(url); await idle(page); await capture(page); await upload(page);
  assert.equal(await saved(page), raw); assert.deepEqual(await page.evaluate(() => window.testWrites), []);
  await page.locator('#inbox-stage-role').selectOption('Treasury'); assert.equal(await page.locator('#inbox-stage-button').isDisabled(), true);
  await page.locator('#inbox-stage-role').selectOption('AP');
  await page.locator('#inbox-stage-button').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('inbox-stage-summary').textContent.includes('original invoices saved'));
  const first = await saved(page), state = J.restore(first); assert.equal(state.documents.length, 1); assert.equal(state.documents[0].status, 'Ready');
  assert.match(await page.locator('#inbox-existing-boundary').innerText(), /explicit AP stage saved/);
  assert.deepEqual(state.erp, J.restore(raw).erp); assert.deepEqual(await page.evaluate(() => window.testWrites), [key]);
  const exported = await evidence(page); assert.equal(exported.staging.newDocuments, 1); assert.equal(exported.sourceItems[0].content, sample.content);
  assert.equal(exported.staging.receipts[0].sourceSha256, exported.sourceItems[0].sha256);
  checked(theme + ': keyboard AP stage, one journal write, complete source evidence and no financial posting');
  await page.getByText('Inspect retained fingerprint receipts', {exact: true}).click(); await page.locator('#inbox-receipts button').first().click();
  assert.match(await page.locator('#inbox-receipt-detail').innerText(), /Original file bytes/);
  const receiptFile = await evidence(page, 'inbox-receipts-download'); assert.equal(receiptFile.receipts.length, 1);
  for (const width of [320, 1440]) {
   await page.setViewportSize({width, height: 1000}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
   await page.evaluate(axe);
   const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(row => ({id: row.id, nodes: row.nodes.map(node => node.target)})));
   assert.deepEqual(violations, [], theme + ' ' + width); await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true}); report.layouts.push({theme, width});
  }
  checked(theme + ': inspectable/exportable fingerprint receipts and accessible staged-result layouts');
  await page.reload(); await idle(page); assert.equal(await saved(page), first);
  await capture(page); await upload(page); const repeat = await evidence(page);
  assert.equal(repeat.counts.documents, 0); assert.equal(repeat.counts.alreadyStagedSources, 1); assert.equal(repeat.sourceItems[0].disposition, 'Already staged');
  await stage(page); assert.equal(await saved(page), first); assert.deepEqual(await page.evaluate(() => window.testWrites), []);
  checked(theme + ': journal reload and reattachment verify existing import without a duplicate or write');
  await page.getByRole('link', {name: 'Review saved invoices in purchasing →', exact: true}).click(); await page.waitForURL('**/business-intelligence/connected-journey.html');
  await page.locator('#journey-role').selectOption('AP'); await page.locator('#journey-document-select').selectOption(state.documents[0].id); await page.locator('#journey-post').click();
  assert.equal(J.restore(await saved(page)).documents[0].status, 'Posted');
  await page.locator('#journey-role').selectOption('Payment approver'); await page.locator('#journey-authorize').click();
  assert.equal(J.restore(await saved(page)).documents[0].status, 'Authorized');
  await page.locator('#journey-role').selectOption('Treasury'); await page.locator('#journey-pay').click();
  assert.equal(J.restore(await saved(page)).documents[0].status, 'Paid');
  await page.goto(url); await idle(page); await capture(page); await upload(page);
  assert.equal((await evidence(page)).sourceReceipts[0].currentStatus, 'Paid');
  checked(theme + ': native purchasing handoff, separate post/authorize/settle actions and retained paid receipt');
  await setSaved(page, raw); await capture(page);
  const xml = U.invoice({number: 'STAGED-XML', net: '1250.00', lines: [{po: 'SYN-PO-0001/001', quantity: 1, price: '1250.00'}]});
  await upload(page, xml, 'original.xml'); await stage(page); const xmlSaved = await saved(page);
  assert.equal(J.restore(xmlSaved).documents[0].header.number, 'STAGED-XML');
  await capture(page); await upload(page, xml, 'renamed.xml');
  assert.equal((await evidence(page)).sourceItems[0].disposition, 'Already staged');
  await stage(page); assert.equal(await saved(page), xmlSaved);
  checked(theme + ': UBL XML originals stage and reattach through the same durable receipt path');
  await setSaved(page, raw); await capture(page); await upload(page);
  await page.evaluate(() => {window.blockWrite = true;}); await page.locator('#inbox-stage-button').click();
  await page.waitForFunction(() => document.getElementById('inbox-error').textContent.includes('Simulated quota failure'));
  assert.equal(await saved(page), raw); assert.equal(await page.locator('#inbox-results').isVisible(), true);
  await page.evaluate(() => {window.blockWrite = false;}); await stage(page); assert.equal(J.restore(await saved(page)).documents.length, 1);
  checked(theme + ': failed storage write retains valid preview and retries safely');
  await setSaved(page, raw); await capture(page); await upload(page); await pauseHash(page);
  await page.locator('#inbox-stage-button').click(); await page.waitForFunction(() => window.hashPaused);
  const changed = JSON.stringify(JSON.parse(raw), null, 2); await setSaved(page, changed); await page.evaluate(() => window.releaseHash());
  await page.waitForFunction(() => document.getElementById('inbox-context-status').textContent.includes('changed'));
  assert.equal(await saved(page), changed); assert.equal(await page.locator('#inbox-results').isVisible(), false);
  checked(theme + ': same-revision raw source change during async staging is preserved');
  await setSaved(page, raw); await capture(page); await upload(page); await pauseHash(page);
  await page.locator('#inbox-stage-button').click(); await page.waitForFunction(() => window.hashPaused);
  await page.locator('#inbox-example').click(); await page.evaluate(() => window.releaseHash()); await idle(page);
  assert.equal((await evidence(page)).format, 'SIMULATED-DOCUMENT-INBOX'); assert.equal(await saved(page), raw);
  checked(theme + ': context switch cancels late staging before any journal write');
  await capture(page); await upload(page, sample.content + 'Account: guessed\n');
  assert.equal(await page.locator('#inbox-stage-button').isDisabled(), true); assert.equal(await saved(page), raw);
  checked(theme + ': extraction-review items cannot be staged through the UI');
  await capture(page); await upload(page); await page.evaluate(() => {window.failVerification = true;});
  await page.locator('#inbox-stage-button').click();
  await page.waitForFunction(() => document.getElementById('inbox-error').textContent.includes('A write occurred'));
  assert.equal(J.restore(await saved(page)).documents.length, 1); assert.equal(await page.locator('#inbox-results').isVisible(), false);
  await page.evaluate(() => {window.blockRead = false; window.failVerification = false;});
  checked(theme + ': post-write read failure reports an unconfirmed save without false unchanged/success claims');
  for (const other of others) assert.equal(await page.evaluate(key => window.nativeGet.call(sessionStorage, key), other), 'preserve-' + other);
  checked(theme + ': maintenance and work journals preserved throughout'); await ctx.close();
 }
 assert.deepEqual(report.errors, []); report.passed = true;
 console.log('PASS ' + selection.name + ': ' + report.checks.length + ' source staging browser groups; ' + report.layouts.length + ' accessible layouts.');
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error);}
finally {await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); if (browser) await browser.close(); if (server) server.kill();}
