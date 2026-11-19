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
const C = require('./bi-prototype/preview/inbox-context.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const U = require('./bi-prototype/preview/ubl-invoice-samples.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4453', prefix = process.env.BI_BASE_URL || `http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`;
const url = prefix + 'document-inbox.html', output = resolve(root, 'tmp/bi-inbox-context', selection.name);
const key = 'portfolio-phase2-connected-v1', otherKeys = ['portfolio-phase2-machines-v1', 'portfolio-phase2-work-v1'];
const report = {passed: false, engine: selection.name, checks: [], layouts: [], errors: []};
const checked = name => report.checks.push(name);
const base = S.journal(), context = await C.capture(J.serialize(base)), sample = C.example(context, base.erp.lines[0].id);
const n = Inbox.parse(sample[0].content).normalized;
const existing = J.dispatch(base, {id: 'BASELINE-INVOICE', type: 'importDocument', actor: 'AP', payload: {documentId: 'EXISTING-1', supplierId: n.supplierId, number: n.number, currency: n.currency, declaredNetCents: n.declaredNetCents, lines: n.lines, sourceLabel: 'Existing fictional invoice'}});
const saved = J.serialize(existing);
const idle = page => page.waitForFunction(() => !document.getElementById('inbox-results').hidden && document.getElementById('inbox-results').getAttribute('aria-busy') === 'false');
const capture = async page => {await page.locator('#inbox-capture').click(); await page.waitForFunction(() => !document.getElementById('inbox-captured').hidden);};
async function upload(page, text = sample[0].content, name = 'supported.txt') {
  if (!await page.locator('#inbox-files').isVisible()) await page.getByText('Try supported local text or XML files', {exact: true}).click();
  await page.locator('#inbox-files').setInputFiles({name, mimeType: name.endsWith('.xml') ? 'application/xml' : 'text/plain', buffer: Buffer.from(text)});
  await page.locator('#inbox-extract').click(); await idle(page);
  await page.getByText('Try supported local text or XML files', {exact: true}).click();
}
async function evidence(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#inbox-download').click()]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function setSaved(page, value) {
  await page.evaluate(({key, value}) => value === null ? window.testRemove.call(sessionStorage, key) : window.testSet.call(sessionStorage, key, value), {key, value});
}
async function gateHash(page) {
  await page.evaluate(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle); let first = true;
    crypto.subtle.digest = async (...args) => {if (first) {first = false; window.hashPaused = true; await new Promise(resolve => {window.releaseHash = resolve;});} return digest(...args);};
  });
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
    await ctx.addInitScript(({key, saved, otherKeys, theme}) => {
      localStorage.setItem('portfolio-theme', theme); sessionStorage.setItem(key, saved);
      for (const other of otherKeys) sessionStorage.setItem(other, 'preserve-' + other);
      window.testSet = Storage.prototype.setItem; window.testRemove = Storage.prototype.removeItem; window.testWrites = [];
      Storage.prototype.setItem = function(k, value) {if (this === sessionStorage) {window.testWrites.push(k); throw Error('Unexpected shared-journal write.');} return window.testSet.call(this, k, value);};
      Storage.prototype.removeItem = function(k) {if (this === sessionStorage) {window.testWrites.push(k); throw Error('Unexpected shared-journal removal.');} return window.testRemove.call(this, k);};
      const clear = Storage.prototype.clear;
      Storage.prototype.clear = function() {if (this === sessionStorage) {window.testWrites.push('*'); throw Error('Unexpected shared-journal clear.');} return clear.call(this);};
    }, {key, saved, otherKeys, theme});
    const page = await ctx.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) report.errors.push(response.url() + ' ' + response.status());});
    await page.goto(url); await idle(page);
    assert.equal((await evidence(page)).format, 'SIMULATED-DOCUMENT-INBOX');
    await capture(page);
    assert.equal(await page.locator('#inbox-results').isVisible(), false);
    await upload(page);
    const current = await evidence(page), expected = await Inbox.prepareCurrent(sample, saved);
    assert.equal(current.context.checkpointSha256, expected.context.checkpointSha256);
    assert.deepEqual(current.counts, expected.counts); assert.equal(current.counts.documents, 1);
    assert.equal(current.documents[0].evaluation.queue, 'duplicate'); assert.equal(current.affectedExisting[0].after.queue, 'duplicate');
    assert.match(await page.locator('#inbox-existing-summary').innerText(), /1 existing documents.*1 would change/);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), saved);
    checked(theme + ': explicit context, existing duplicate effects, separate grains and Node/browser parity');
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await page.getByText('Inspect captured purchasing evidence', {exact: true}).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No page overflow at ' + width);
      await page.evaluate(axe);
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(row => ({id: row.id, nodes: row.nodes.map(node => node.target)})));
      assert.deepEqual(violations, [], theme + ' ' + width);
      await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true});
      await page.getByText('Inspect captured purchasing evidence', {exact: true}).click(); report.layouts.push({theme, width});
    }
    await page.locator('#inbox-example').focus(); await page.keyboard.press('Enter'); await idle(page);
    assert.equal((await evidence(page)).format, 'SIMULATED-DOCUMENT-INBOX'); assert.equal(await page.locator('#inbox-captured').isVisible(), false);
    await capture(page); await page.locator('#inbox-context-example').click(); await idle(page);
    assert.equal((await evidence(page)).counts.documents, 1); checked(theme + ': keyboard guided reset and PO-bound sample without saved writes');
    const xml = U.invoice({number: 'CURRENT-XML', net: '1250.00', lines: [{po: base.erp.lines[0].id, quantity: 1, price: '1250.00'}]});
    await upload(page, xml, 'supported.xml');
    const xmlModel = await evidence(page); assert.equal(xmlModel.format, 'SIMULATED-CAPTURED-INBOX-PREVIEW');
    assert.equal(xmlModel.documents.length, 1); assert.equal(xmlModel.sourceItems[0].mediaType, 'application/xml');
    assert.equal(xmlModel.documents[0].evaluation.lines[0].coding.account, base.erp.lines[0].account);
    await page.locator('#inbox-items button').first().click(); assert(await page.locator('#inbox-fields button').count() > 0);
    checked(theme + ': supported XML enters captured matching with inspectable source paths and approved coding');
    await setSaved(page, JSON.stringify(JSON.parse(saved), null, 2));
    await page.locator('#inbox-download').click();
    await page.waitForFunction(() => document.getElementById('inbox-download').disabled);
    assert.match(await page.locator('#inbox-error').innerText(), /changed/); assert.equal(await page.locator('#inbox-results').isVisible(), false);
    checked(theme + ': same-revision raw source changes invalidate evidence download');
    for (const value of [null, 'damaged', J.serialize(J.create())]) {
      await setSaved(page, value); await page.locator('#inbox-capture').click();
      await page.waitForFunction(() => !document.getElementById('inbox-context-status').textContent.includes('Validating'));
      assert.equal(await page.locator('#inbox-results').isVisible(), false); assert.equal(await page.locator('#inbox-extract').isDisabled(), true);
    }
    checked(theme + ': absent, damaged and zero-PO sources never substitute examples');
    await setSaved(page, saved);
    await page.evaluate(key => {const get = Storage.prototype.getItem; window.restoreGet = () => {Storage.prototype.getItem = get;}; Storage.prototype.getItem = function(k) {if (this === sessionStorage && k === key) throw Error('Storage read unavailable'); return get.call(this, k);};}, key);
    await page.locator('#inbox-capture').click(); await page.waitForFunction(() => document.getElementById('inbox-error').textContent.includes('Storage read unavailable'));
    assert.equal(await page.locator('#inbox-results').isVisible(), false); await page.evaluate(() => window.restoreGet());
    checked(theme + ': denied storage reads show an unavailable source without a substitute');
    await setSaved(page, saved); await gateHash(page); await page.locator('#inbox-capture').click();
    await page.waitForFunction(() => window.hashPaused); await setSaved(page, saved + '\n'); await page.evaluate(() => window.releaseHash());
    await page.waitForFunction(() => document.getElementById('inbox-context-status').textContent.includes('unavailable'));
    assert.equal(await page.locator('#inbox-captured').isVisible(), false); checked(theme + ': async capture rejects changed raw ownership');
    await setSaved(page, saved); await capture(page); await gateHash(page);
    await page.locator('#inbox-context-example').click(); await page.waitForFunction(() => window.hashPaused);
    await setSaved(page, saved + '\n'); await page.evaluate(() => window.releaseHash());
    await page.waitForFunction(() => document.getElementById('inbox-context-status').textContent.includes('changed'));
    assert.equal(await page.locator('#inbox-results').isVisible(), false); checked(theme + ': async preview rejects changed raw ownership');
    // Abandon an in-flight current capture and restore the guided model; its late result must not overwrite it.
    await setSaved(page, saved); await gateHash(page); await page.locator('#inbox-capture').click();
    await page.waitForFunction(() => window.hashPaused); await page.locator('#inbox-example').click(); await page.evaluate(() => window.releaseHash()); await idle(page);
    assert.equal((await evidence(page)).format, 'SIMULATED-DOCUMENT-INBOX'); checked(theme + ': context epoch prevents a late capture replacing guided results');
    assert.deepEqual(await page.evaluate(() => window.testWrites), []);
    for (const other of otherKeys) assert.equal(await page.evaluate(key => sessionStorage.getItem(key), other), 'preserve-' + other);
    checked(theme + ': all session journals preserved, with writes/removals/clear prohibited'); await ctx.close();
  }
  assert.deepEqual(report.errors, []); report.passed = true;
  console.log('PASS ' + selection.name + ': ' + report.checks.length + ' captured-inbox browser groups; ' + report.layouts.length + ' accessible layout states.');
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error);}
finally {await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); if (browser) await browser.close(); if (server) server.kill();}
