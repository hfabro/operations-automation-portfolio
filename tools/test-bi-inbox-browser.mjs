import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const selection = selectBrowser(require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
const Inbox = require('./bi-prototype/preview/inbox-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4443', prefix = `http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`;
const url = prefix + 'document-inbox.html', output = resolve(root, 'tmp/bi-inbox', selection.name);
const report = {passed: false, engine: selection.name, layouts: [], checks: [], errors: [], policyViolations: [], toolPolicyViolations: []};
const sha = data => createHash('sha256').update(data).digest('hex'), checked = name => report.checks.push(name);
const keys = ['portfolio-phase2-connected-v1', 'portfolio-phase2-machines-v1', 'portfolio-phase2-work-v1'];
const ready = page => page.waitForFunction(() => !document.getElementById('inbox-results').hidden && document.getElementById('inbox-results').getAttribute('aria-busy') === 'false');
async function download(page, id = 'inbox-download') {
  const [file] = await Promise.all([page.waitForEvent('download'), page.locator('#' + id).click()]);
  return {file, bytes: await readFile(await file.path())};
}
async function evidence(page) {return JSON.parse((await download(page)).bytes.toString('utf8'));}
async function audit(page, label) {
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(row => ({id: row.id, targets: row.nodes.map(node => node.target)})));
  assert.deepEqual(violations, [], label);
}
let browser, server;
await mkdir(output, {recursive: true});
try {
  server = spawn(process.execPath, [resolve(root, 'tools/serve.mjs')], {cwd: root, env: {...process.env, PORT: port, BASE_PATH: '/operations-automation-portfolio'}, stdio: ['ignore', 'pipe', 'pipe']});
  await new Promise((yes, no) => {server.stdout.once('data', yes); server.once('error', no); server.once('exit', code => no(Error('Preview exited ' + code)));});
  browser = await selection.type.launch(selection.options); report.browser = browser.version();
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({colorScheme: theme, reducedMotion: 'reduce', acceptDownloads: true});
    await context.addInitScript(({theme, keys}) => {localStorage.setItem('portfolio-theme', theme); for (const key of keys) sessionStorage.setItem(key, 'preserve-inbox-' + key);}, {theme, keys});
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push({url: page.url(), message: error.message}));
    page.on('response', response => {if (response.status() >= 400) report.errors.push({url: response.url(), status: response.status()});});
    await page.exposeFunction('recordInboxPolicy', item => {
      if (selection.name === 'webkit' && item.phase === 'screenshot' && item.directive === 'style-src-elem' && item.blocked === 'inline' && !item.source) report.toolPolicyViolations.push(item);
      else report.policyViolations.push(item);
    });
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => window.recordInboxPolicy({directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile, phase: window.__inboxToolPhase || 'runtime'})));
    assert.equal((await page.goto(url)).status(), 200); await ready(page); assert.equal(await page.evaluate(() => isSecureContext), true);
    assert.equal(await page.locator('[data-inbox-measure=sources] strong').innerText(), '13');
    assert.equal(await page.locator('[data-inbox-measure=documents] strong').innerText(), '8');
    assert.equal(await page.locator('[data-inbox-measure=ready] strong').innerText(), '1');
    assert.equal(await page.locator('[data-inbox-measure=corrections] strong').innerText(), '1');
    let exported = await evidence(page), expected = await Inbox.prepare(await S.sources(), S.journal());
    const {viewSelection, ...actual} = exported; assert.equal(sha(JSON.stringify(actual)), sha(JSON.stringify(expected)), 'Full browser/Node extraction, fingerprints and control parity');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
      const layout = await page.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth + 1, theme: document.documentElement.dataset.theme, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length}));
      assert.equal(layout.overflow, false, theme + ' ' + width); assert.equal(layout.theme, theme); assert.equal(layout.h1, 1); assert.equal(layout.main, 1);
      if ([375, 1440].includes(width)) {
        await audit(page, theme + ' ' + width); await page.evaluate(() => window.__inboxToolPhase = 'screenshot');
        await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {window.__inboxToolPhase = 'runtime'; resolve();}))));
      }
      report.layouts.push({width, theme, ...layout});
    }
    checked(theme + ': initial source/document grains, secure hashing, full Node parity and responsive accessible framing');
    await page.getByRole('button', {name: 'fictional-multi-line-invoice.txt', exact: true}).click();
    await page.locator('#inbox-fields').getByRole('button', {name: 'supplierId', exact: true}).click();
    assert.match(await page.locator('.inbox-source-line.is-selected').innerText(), /3.*Supplier: SYN-SUP-01/);
    assert.equal(await page.locator('#inbox-source-line-3').evaluate(element => element === document.activeElement), true);
    const original = await download(page, 'inbox-source-download');
    assert.equal(sha(original.bytes), exported.sourceItems[0].sha256); assert.equal(original.bytes.toString('utf8'), exported.sourceItems[0].content);
    exported = await evidence(page); assert.equal(exported.viewSelection.sourceId, 'SRC-MULTI');
    assert.equal(await page.locator('.inbox-source-line.is-selected').count(), 1, 'Export preserves inspected source line');
    await page.setViewportSize({width: 375, height: 1000});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Expanded field/source evidence');
    await audit(page, theme + ' expanded field/source evidence'); await page.setViewportSize({width: 1440, height: 1000});
    await page.locator('[data-inbox-measure=copies]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#inbox-queue-heading').evaluate(element => element === document.activeElement), true);
    assert.equal(await page.locator('#inbox-items tr').count(), 1);
    await page.getByRole('button', {name: 'renamed-copy-of-multi-line.txt', exact: true}).click();
    assert.match(await page.locator('#inbox-source-meta').innerText(), /No invoice document created/);
    await page.getByRole('button', {name: 'SRC-MULTI', exact: true}).first().click();
    assert.match(await page.locator('#inbox-detail-heading').innerText(), /SRC-MULTI/);
    checked(theme + ': exact source download, preserved field selection, source-line focus, copy deduplication and related original');
    await page.locator('[data-inbox-measure=extraction]').click();
    assert.equal(await page.locator('#inbox-items tr').count(), 2);
    await page.getByRole('button', {name: 'fictional-missing-currency.txt', exact: true}).click();
    assert.match(await page.locator('#inbox-issues').innerText(), /MISSING_FIELD.*currency/);
    assert.equal(await page.locator('#inbox-fields').getByRole('button', {name: 'currency', exact: true}).count(), 0);
    await page.getByRole('button', {name: 'fictional-repeated-currency.txt', exact: true}).click();
    assert.equal(await page.locator('#inbox-fields').getByRole('button', {name: 'currency', exact: true}).count(), 2);
    assert.match(await page.locator('#inbox-issues').innerText(), /AMBIGUOUS_FIELD/);
    await page.locator('[data-inbox-measure=sources]').click(); await page.locator('#inbox-owner').selectOption('AP duplicate review');
    assert.equal(await page.locator('#inbox-items tr').count(), 3); assert.equal(await page.locator('#inbox-documents tr').count(), 8);
    await page.locator('[data-inbox-measure=ready]').click();
    assert.equal(await page.locator('#inbox-documents tr').count(), 1);
    assert.match(await page.locator('#inbox-documents').innerText(), /6105.*FAC-100.*PROD-200/s);
    checked(theme + ': missing/ambiguous extraction, separate duplicate source/document counts and approved PO coding');
    await page.locator('[data-inbox-measure=corrections]').click();
    await page.getByRole('button', {name: 'fictional-price-revision-2.txt', exact: true}).click();
    assert.equal(await page.locator('#inbox-approve').isDisabled(), true); await page.locator('#inbox-role').selectOption('Purchasing approver');
    await page.locator('#inbox-review-reason').fill(''); await page.locator('#inbox-approve').click(); await ready(page);
    assert.match(await page.locator('#inbox-error').innerText(), /previous validated temporary inbox remains/);
    assert.equal(await page.locator('[data-inbox-measure=corrections] strong').innerText(), '1');
    await page.locator('#inbox-review-reason').fill('Reviewed source identity and supplier prices independently.');
    await page.locator('#inbox-approve').click(); await ready(page);
    assert.equal(await page.locator('[data-inbox-measure=ready] strong').innerText(), '2', await page.locator('#inbox-status').innerText() + ' / ' + await page.locator('#inbox-error').textContent());
    assert.equal(await page.locator('[data-inbox-measure=corrections] strong').innerText(), '0');
    exported = await evidence(page); const corrected = exported.documents.find(doc => doc.id === 'INBOX-SRC-PRICE');
    assert.deepEqual(corrected.versions.map(version => version.header.netCents), [135000, 125000]);
    assert.equal(exported.reviews[0].actor, 'Purchasing approver'); assert.equal(exported.reviews[0].sha256, exported.sourceItems.find(row => row.id === 'SRC-REVISION').sha256);
    assert.equal(exported.sourceItems.find(row => row.id === 'SRC-PRICE').content, expected.sourceItems.find(row => row.id === 'SRC-PRICE').content);
    assert.equal(corrected.status, 'Ready'); assert.equal(await page.locator('#inbox-approve').isDisabled(), true);
    await page.locator('[data-inbox-measure=corrections]').click(); assert.match(await page.locator('#inbox-items').innerText(), /No records match/);
    checked(theme + ': independent role and reason gate, retained source/versions, zero pending filter and re-evaluated matching');
    await page.locator('#inbox-example').click(); await ready(page); await page.getByRole('button', {name: 'fictional-price-revision-2.txt', exact: true}).click();
    await page.locator('#inbox-reject').click(); await ready(page); exported = await evidence(page);
    assert.equal(exported.reviews[0].decision, 'reject'); assert.equal(exported.documents.find(doc => doc.id === 'INBOX-SRC-PRICE').header.netCents, 135000);
    assert.equal(exported.documents.find(doc => doc.id === 'INBOX-SRC-PRICE').evaluation.queue, 'price');
    checked(theme + ': rejection retains original price/source and owned price hold');
    // Exercise actual File/UTF-8 decoding and download bytes, not a prefilled normalized payload.
    await page.getByText('Try supported local text or XML files', {exact: true}).click();
    const uploadedBytes = Buffer.from('\uFEFF' + S.invoice({number: 'UPLOAD-EXAMPLE'}).replaceAll('\n', '\r\n'), 'utf8');
    await page.locator('#inbox-files').setInputFiles({name: 'uploaded-invoice.txt', mimeType: 'text/plain', buffer: uploadedBytes});
    await page.locator('#inbox-extract').click(); await ready(page); exported = await evidence(page);
    assert.equal(exported.counts.sourceItems, 1); assert.equal(exported.sourceItems[0].sha256, sha(uploadedBytes)); assert.equal(exported.sourceItems[0].receivedAt, null);
    await page.getByRole('button', {name: 'uploaded-invoice.txt', exact: true}).click();
    assert.deepEqual((await download(page, 'inbox-source-download')).bytes, uploadedBytes);
    assert.match(await page.locator('#inbox-source-meta').innerText(), /Unknown.*no admitted inbox capture timestamp/s);
    checked(theme + ': real local-file extraction, exact BOM/CRLF round trip and unknown capture date');
    for (const [name, mimeType, buffer] of [['invalid-utf8.txt', 'text/plain', Buffer.from([255, 254])], ['unsupported.pdf', 'application/pdf', Buffer.from('%PDF-1.4')], ['oversized.txt', 'text/plain', Buffer.alloc(32769, 65)]]) {
      await page.locator('#inbox-files').setInputFiles({name, mimeType, buffer}); await page.locator('#inbox-extract').click();
      await page.waitForFunction(() => !document.getElementById('inbox-error').hidden && document.getElementById('inbox-error').textContent.startsWith('File selection rejected:'));
      assert.equal((await evidence(page)).sourceItems[0].sha256, sha(uploadedBytes), 'Rejected import preserves prior verified content');
    }
    const unsafeText = S.invoice({number: 'SAFE-TEXT', memo: '<img src="never-requested" onerror="alert(1)">'});
    await page.locator('#inbox-files').setInputFiles([{name: 'literal-markup.txt', mimeType: 'text/plain', buffer: Buffer.from(unsafeText)}, {name: 'literal-copy.txt', mimeType: 'text/plain', buffer: Buffer.from(unsafeText)}]);
    await page.locator('#inbox-extract').click(); await ready(page);
    exported = await evidence(page); assert.equal(exported.counts.exactCopies, 1); assert.equal(exported.counts.documents, 1);
    await page.locator('[data-inbox-measure=sources]').click(); await page.getByRole('button', {name: 'literal-markup.txt', exact: true}).click();
    assert.equal(await page.locator('#inbox-detail img').count(), 0); assert.match(await page.locator('#inbox-source-lines').innerText(), /<img src=/);
    assert.deepEqual(await page.evaluate(keys => keys.map(key => sessionStorage.getItem(key)), keys), keys.map(key => 'preserve-inbox-' + key));
    checked(theme + ': invalid encoding/type/size rejection, preserved inbox, safe literal rendering, duplicate upload and untouched journals');
    await context.close();
  }
  const failed = await browser.newContext();
  await failed.route('**/inbox-samples.js', route => route.fulfill({contentType: 'text/javascript', body: 'window.InboxSamples={sources:async()=>{throw Error("Source unavailable for this explicit failure check");}};'}));
  const failedPage = await failed.newPage(); await failedPage.goto(url); await failedPage.locator('#inbox-error').waitFor({state: 'visible'});
  assert.equal(await failedPage.locator('#inbox-results').isVisible(), false); assert.equal(await failedPage.locator('#inbox-download').isDisabled(), true);
  await failed.close(); checked('unavailable source stays unavailable without substitute zero figures');
  const nojs = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 900}, isMobile: selection.name === 'chromium', hasTouch: true});
  const page = await nojs.newPage(); await page.goto(prefix);
  const card = page.getByRole('link', {name: /Can you trace an invoice back to its original file/}); await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox(); await page.touchscreen.tap(box.x + 15, box.y + box.height - 15); await page.waitForURL('**/business-intelligence/document-inbox.html');
  assert.match(await page.locator('.bi-noscript').innerText(), /JavaScript is needed/); assert.equal(await page.locator('#inbox-results').isVisible(), false);
  await page.getByRole('link', {name: 'Multi-line purchasing controls →', exact: true}).focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/business-intelligence/invoice-batch.html');
  await nojs.close(); checked('native no-JavaScript touch discovery, keyboard related control and readable extraction boundaries');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.policyViolations, []); report.passed = true;
  console.log('PASS ' + selection.name + ': ' + report.layouts.length + ' inbox layout states and ' + report.checks.length + ' extraction/source/review/upload/availability groups.');
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error);}
finally {await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); if (browser) await browser.close(); if (server) server.kill();}
