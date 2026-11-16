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
const U = require('./bi-prototype/preview/ubl-invoice-samples.js'), S = require('./bi-prototype/preview/inbox-samples.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4451', origin = `http://127.0.0.1:${port}`, url = origin + '/operations-automation-portfolio/business-intelligence/document-inbox.html';
const output = resolve(root, 'tmp/bi-ubl', selection.name), report = {passed: false, engine: selection.name, checks: [], layouts: [], errors: [], requests: []};
const checked = name => report.checks.push(name), sha = value => createHash('sha256').update(value).digest('hex');
const ready = page => page.waitForFunction(() => !document.getElementById('inbox-results').hidden && document.getElementById('inbox-results').getAttribute('aria-busy') === 'false');
async function download(page, id = 'inbox-download') {
 const [file] = await Promise.all([page.waitForEvent('download'), page.locator('#' + id).click()]);
 return readFile(await file.path());
}
const evidence = async page => JSON.parse((await download(page)).toString('utf8'));
let browser, server;
await mkdir(output, {recursive: true});
try {
 server = spawn(process.execPath, [resolve(root, 'tools/serve.mjs')], {cwd: root, env: {...process.env, PORT: port, BASE_PATH: '/operations-automation-portfolio'}, stdio: ['ignore', 'pipe', 'pipe']});
 await new Promise((yes, no) => {server.stdout.once('data', yes); server.once('error', no); server.once('exit', code => no(Error('Preview exited ' + code)));});
 browser = await selection.type.launch(selection.options); report.browser = browser.version();
 const context = await browser.newContext({acceptDownloads: true, reducedMotion: 'reduce', colorScheme: 'light'}), page = await context.newPage();
 const keys = ['portfolio-phase2-connected-v1','portfolio-phase2-machines-v1','portfolio-phase2-work-v1'];
 await page.addInitScript(keys => {for (const key of keys) sessionStorage.setItem(key, 'preserve-ubl-' + key);}, keys);
 page.on('pageerror', error => report.errors.push(error.message));
 page.on('request', request => {if (!request.url().startsWith(origin + '/')) report.requests.push(request.url());});
 assert.equal((await page.goto(url)).status(), 200); await ready(page);
 assert.equal(await page.locator('[data-inbox-measure=sources] strong').innerText(), '13');
 await page.locator('#inbox-ubl-example').click(); await ready(page);
 const model = await evidence(page);
 assert.deepEqual(model.counts, {sourceItems: 9, exactCopies: 1, extractionReviews: 2, revisionReviews: 0, pendingCorrections: 0, documents: 6, readyDocuments: 1, heldDocuments: 5});
 assert.equal(model.sourceItems.find(row => row.id === 'UBL-COPY').relatedSourceIds.includes('UBL-READY'), true);
 const parsed = model.sourceItems.find(row => row.id === 'UBL-READY').extraction;
 const plain = Inbox.parse(S.invoice({number: 'UBL-MULTI-1'}));
 assert.deepEqual(parsed.normalized, plain.normalized, 'Independent known text payload and XML adapter normalize identically');
 for (const row of model.sourceItems) assert.equal(row.sha256, sha(Buffer.from(row.content)), row.id + ' exact bytes');
 const plainModel = await Inbox.prepare([{...(await S.sources())[0], id: 'UBL-READY', content: S.invoice({number: 'UBL-MULTI-1'})}], S.journal());
 const actualDoc = model.documents.find(row => row.sourceIds.includes('UBL-READY'));
 assert.deepEqual(actualDoc.header, plainModel.documents[0].header);
 assert.deepEqual(actualDoc.evaluation, plainModel.documents[0].evaluation, 'Existing PO, receipt, amount and coding controls agree independently of source format');
 assert.equal(model.documents.find(row => row.sourceIds.includes('UBL-RECEIPT')).evaluation.queue, 'receipt');
 assert.equal(model.documents.find(row => row.sourceIds.includes('UBL-TOTAL')).evaluation.queue, 'data');
 assert.equal(model.documents.find(row => row.sourceIds.includes('UBL-FX')).evaluation.queue, 'identity');
 for (const id of ['UBL-DUP-A','UBL-DUP-B']) assert.equal(model.documents.find(row => row.sourceIds.includes(id)).evaluation.queue, 'duplicate');
 checked('Nine-source XML batch, exact copies, six documents and independently verified financial/control parity');
 const base = U.invoice();
 const accepted = [
  ['prefix-independent', base.replace(/xmlns:cac=/g, 'xmlns:a=').replace(/xmlns:cbc=/g, 'xmlns:b=').replace(/(<\/?)(cac:)/g, '$1a:').replace(/(<\/?)(cbc:)/g, '$1b:')],
  ['alternate default namespace', base.replace('<Invoice ', '<u:Invoice xmlns:u="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ').replace('</Invoice>', '</u:Invoice>')],
  ['whole decimal quantity', base.replace('>1</cbc:InvoicedQuantity>', '>1.000</cbc:InvoicedQuantity>')],
  ['zero tax', U.invoice({tax: '0.00'})],
  ['decoded safe metadata', U.invoice({note: '<img src=x onerror=alert(1)> & literal'})],
 ];
 for (const [name, xml] of accepted) {
  const value = await page.evaluate(xml => window.UBLInvoice.parse(xml), xml);
  assert.deepEqual(value.normalized, parsed.normalized, name); assert.deepEqual(value.issues, [], name);
 }
 checked('Namespace-aware parsing, alternate prefixes, whole decimal quantities, zero tax and inert escaped metadata');
 const rejected = [
  ['malformed', base.slice(0, -20)],
  ['wrong root', base.replace(/\bInvoice\b/g, 'CreditNote')],
  ['wrong namespace', base.replace('xsd:Invoice-2', 'xsd:Invoice-99')],
  ['DTD', base.replace('<Invoice ', '<!DOCTYPE Invoice SYSTEM "https://invalid.example/external.dtd"><Invoice ')],
  ['entity', base.replace('<Invoice ', '<!DOCTYPE Invoice [<!ENTITY xxe SYSTEM "file:///private">]><Invoice ')],
  ['processing instruction', base.replace('<Invoice ', '<?instruction value?><Invoice ')],
  ['non-UTF8 declaration', base.replace('UTF-8', 'ISO-8859-1')],
  ['foreign XInclude', base.replace('</Invoice>', '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="https://invalid.example/data"/></Invoice>')],
  ['external schema attribute', base.replace('<Invoice ', '<Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="remote.xsd" ')],
  ['tax', U.invoice({tax: '20.00'})],
  ['allowance', base.replace('</Invoice>', '<cac:AllowanceCharge/></Invoice>')],
  ['attachment', base.replace('</Invoice>', '<cac:AdditionalDocumentReference/></Invoice>')],
  ['supplier revision reference', base.replace('</Invoice>', '<cac:BillingReference/></Invoice>')],
  ['unit', base.replace('unitCode="EA"', 'unitCode="KGM"')],
  ['fraction', base.replace('>1</cbc:InvoicedQuantity>', '>1.5</cbc:InvoicedQuantity>')],
  ['zero quantity', base.replace('>1</cbc:InvoicedQuantity>', '>0</cbc:InvoicedQuantity>')],
  ['quantity limit', base.replace('>1</cbc:InvoicedQuantity>', '>1001</cbc:InvoicedQuantity>')],
  ['base quantity', base.replace('>1</cbc:BaseQuantity>', '>2</cbc:BaseQuantity>')],
  ['missing price base', base.replace(/<cbc:BaseQuantity[^>]*>.*?<\/cbc:BaseQuantity>/, '')],
  ['missing line quantity', base.replace(/<cbc:InvoicedQuantity[^>]*>.*?<\/cbc:InvoicedQuantity>/, '')],
  ['missing PO', base.replace(/<cac:OrderLineReference>.*?<\/cac:OrderLineReference>/, '')],
  ['repeated invoice ID', base.replace('<cbc:ID>UBL-MULTI-1</cbc:ID>', '<cbc:ID>UBL-MULTI-1</cbc:ID><cbc:ID>UBL-MULTI-1</cbc:ID>')],
  ['repeated currency', base.replace('<cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode>', '<cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode><cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode>')],
  ['repeated PO', base.replace('</cac:OrderLineReference>', '</cac:OrderLineReference><cac:OrderLineReference><cbc:LineID>SYN-PO-0001/001</cbc:LineID></cac:OrderLineReference>')],
  ['duplicate line ID', base.replace('<cbc:ID>2</cbc:ID>', '<cbc:ID>1</cbc:ID>')],
  ['missing supplier ID', base.replace('<cbc:ID>SYN-SUP-01</cbc:ID>', '')],
  ['foreign buyer', U.invoice({buyer: 'OTHER-CO'})],
  ['identifier scheme', base.replace('<cbc:ID>SYN-SUP-01', '<cbc:ID schemeID="UNKNOWN">SYN-SUP-01')],
  ['currency disagreement', base.replace('currencyID="USD"', 'currencyID="EUR"')],
  ['header disagreement', base.replace('>2500.00</cbc:PayableAmount>', '>2600.00</cbc:PayableAmount>')],
  ['line disagreement', base.replace('>1250.00</cbc:LineExtensionAmount>', '>1251.00</cbc:LineExtensionAmount>')],
  ['nested value', base.replace('>UBL-MULTI-1</cbc:ID>', '><cbc:Name>UBL-MULTI-1</cbc:Name></cbc:ID>')],
  ['aggregate character data', base.replace('<cac:Price>', '<cac:Price>silent instruction')],
  ['unsupported element attribute', base.replace('<cbc:ID>UBL-MULTI-1', '<cbc:ID unitCode="EA">UBL-MULTI-1')],
  ['invalid date', base.replace('2026-11-15', '2026-02-30')],
  ['amount precision', base.replace('>1250.00</cbc:PriceAmount>', '>1250.001</cbc:PriceAmount>')],
  ['amount overflow', base.replace('>1250.00</cbc:PriceAmount>', '>9007199254740991.00</cbc:PriceAmount>')],
  ['missing required total', base.replace(/<cbc:TaxExclusiveAmount[^>]*>.*?<\/cbc:TaxExclusiveAmount>/, '')],
  ['wrong type', base.replace('>380</cbc:InvoiceTypeCode>', '>381</cbc:InvoiceTypeCode>')],
  ['wrong version', base.replace('>2.1</cbc:UBLVersionID>', '>2.3</cbc:UBLVersionID>')],
  ['element bound', base.replace('</Invoice>', '<cbc:Note/>'.repeat(513) + '</Invoice>')],
  ['line count bound', base.replace('</Invoice>', base.match(/<cac:InvoiceLine>.*?<\/cac:InvoiceLine>/s)[0].repeat(20) + '</Invoice>')],
  ['depth bound', base.replace('</Invoice>', '<cac:Item>'.repeat(13) + '</cac:Item>'.repeat(13) + '</Invoice>')],
  ['attribute bound', base.replace('<Invoice ', '<Invoice ' + Array.from({length: 13}, (_, i) => `a${i}="v"`).join(' ') + ' ')],
 ];
 for (const [name, xml] of rejected) {
  const result = await page.evaluate(async xml => {
   const extraction = window.DocumentInbox.parse(xml, 'application/xml');
   const model = await window.DocumentInbox.prepare([{id: 'TEST-XML', name: 'test.xml', mediaType: 'application/xml', content: xml, receivedAt: null, receivedAtUnknownReason: 'Unknown local capture time.', order: 0}], window.InboxSamples.journal());
   return {extraction, counts: model.counts, owner: model.sourceItems[0].owner, disposition: model.sourceItems[0].disposition};
  }, xml);
  assert.equal(result.extraction.normalized, null, name); assert.ok(result.extraction.issues.length, name);
  assert.equal(result.counts.documents, 0, name); assert.equal(result.disposition, 'Extraction review', name);
  assert.equal(result.owner, name === 'foreign buyer' ? 'AP entity review' : 'AP document review', name);
 }
 checked(rejected.length + ' malformed, ambiguous, monetary, identity, unit, namespace and resource-bound cases route to owned review without staging');
 await page.getByRole('button', {name: 'ubl-ready.xml', exact: true}).click();
 await page.getByRole('button', {name: 'lines[1].poLineId', exact: true}).click();
 assert.equal(await page.locator('#inbox-xml-source').isVisible(), true);
 assert.match(await page.locator('#inbox-xml-path').innerText(), /cac:InvoiceLine\[2\].*cbc:LineID\[1\]/);
 assert.match(await page.locator('#inbox-xml-fragment').innerText(), /SYN-PO-0002\/001/);
 assert.equal(await page.locator('#inbox-xml-fragment *').count(), 0, 'XML excerpt is inert text');
 assert.equal(await page.locator('.inbox-source-line.is-selected').count(), 0, 'No fabricated XML line location');
 const attributeField = parsed.fields.find(row => row.path === 'lines[0].unitCode');
 assert.equal(attributeField.sourceAttribute, 'unitCode'); assert.equal(attributeField.sourceLine, null);
 assert.equal(parsed.fields.find(row => row.path === 'revision').valueOrigin, 'adapter-scope');
 checked('XML source lineage uses namespace paths and attributes; DOM excerpt remains separate from exact bytes and derived revision');
 for (const theme of ['light','dark']) {
  if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) await page.locator('[data-theme-toggle]').click();
  await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), theme === 'dark' ? 'rgb(237, 244, 238)' : 'rgb(25, 46, 42)', 'Native theme foreground');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#inbox-queue-heading')).color), theme === 'dark' ? 'rgb(237, 244, 238)' : 'rgb(25, 46, 42)', 'Native inherited heading color');
  for (const width of [320,375,768,1024,1440]) {
   await page.setViewportSize({width, height: 1000});
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, theme + ' ' + width);
   if ([375,1440].includes(width)) {
    await page.evaluate(axe);
    assert.deepEqual(await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(row => ({id: row.id, nodes: row.nodes.map(node => ({target: node.target, summary: node.failureSummary}))}))), [], theme + ' ' + width);
    await page.screenshot({path: resolve(output, theme + '-' + width + '.png'), fullPage: true});
   }
   report.layouts.push({theme,width});
  }
 }
 checked('Ten XML-detail layouts, both themes, bounded source navigation and four WCAG scans');
 const raw = Buffer.from('\uFEFF' + base.replace(/\n/g, '\r\n'));
 await page.getByText('Try supported local text or XML files', {exact: true}).click();
 await page.locator('#inbox-files').setInputFiles({name: 'bom-crlf.xml', mimeType: 'application/xml', buffer: raw});
 await page.locator('#inbox-extract').click(); await ready(page);
 const upload = await evidence(page), item = upload.sourceItems[0];
 assert.equal(item.sha256, sha(raw)); assert.equal(item.byteLength, raw.length); assert.equal(item.receivedAt, null);
 assert.deepEqual(item.extraction.normalized, parsed.normalized);
 await page.getByRole('button', {name: 'bom-crlf.xml', exact: true}).click();
 assert.deepEqual(await download(page, 'inbox-source-download'), raw);
 checked('Real XML File upload preserves BOM/CRLF SHA-256, byte length and exact source download; capture time remains unknown');
 await page.locator('#inbox-files').setInputFiles([{name: 'same.xml', mimeType: 'text/xml', buffer: Buffer.from(base)}, {name: 'same.txt', mimeType: 'text/plain', buffer: Buffer.from(S.invoice({number: 'UBL-MULTI-1'}))}]);
 await page.locator('#inbox-extract').click(); await ready(page);
 const mixed = await evidence(page);
 assert.equal(mixed.counts.documents, 2); assert.equal(mixed.counts.exactCopies, 0); assert.equal(mixed.counts.heldDocuments, 2);
 assert.ok(mixed.documents.every(row => row.evaluation.queue === 'duplicate'));
 checked('Different XML/text source bytes with the same normalized supplier/invoice identity trigger business duplicates in both directions');
 const crossRevision = S.invoice({number: 'UBL-MULTI-1', revision: 2, supersedes: sha(Buffer.from(base)), net: '2600.00', lines: ['SYN-PO-0001/001 | 1 | 1300.00', 'SYN-PO-0002/001 | 1 | 1300.00']});
 const correction = await page.evaluate(async ({base, crossRevision}) => {
  const envelope = (id, mediaType, content, order) => ({id, name: id, mediaType, content, receivedAt: null, receivedAtUnknownReason: 'Unknown local capture.', order});
  return window.DocumentInbox.prepare([envelope('XML-ORIGINAL','application/xml',base,0), envelope('TEXT-REVISION','text/plain',crossRevision,1)], window.InboxSamples.journal());
 }, {base, crossRevision});
 assert.equal(correction.counts.revisionReviews, 1); assert.equal(correction.counts.pendingCorrections, 0);
 assert.equal(correction.documents.length, 1); assert.equal(correction.documents[0].header.netCents, 250000); assert.equal(correction.documents[0].versions.length, 1);
 assert.equal(correction.sourceItems[1].owner, 'AP revision review');
 assert.match(correction.documents[0].versions[0].sourceLabel, /UBL XML source/);
 checked('XML originals retain accurate source labels and cannot enter the text-only correction path through a cross-format revision');
 for (const [name, mimeType, buffer] of [['bad.xml','application/xml', Buffer.from([0xff,0xfe,0x61])], ['bad.pdf','application/pdf', Buffer.from('PDF')], ['large.xml','application/xml', Buffer.alloc(32769, 97)]]) {
  await page.locator('#inbox-files').setInputFiles({name,mimeType,buffer}); await page.locator('#inbox-extract').click();
  await page.waitForFunction(() => !document.getElementById('inbox-error').hidden); await ready(page);
  assert.deepEqual((await evidence(page)).sourceItems, mixed.sourceItems, name + ' preserves prior inbox');
 }
 checked('Bad UTF-8, unsupported file types and oversize files preserve the previous validated temporary inbox');
 const ambiguous = base.replace('<cbc:ID>UBL-MULTI-1</cbc:ID>', '<cbc:ID>UBL-MULTI-1</cbc:ID><cbc:ID>UBL-MULTI-1</cbc:ID>');
 await page.locator('#inbox-files').setInputFiles({name: 'ambiguous.xml', mimeType: 'application/xml', buffer: Buffer.from(ambiguous)});
 await page.locator('#inbox-extract').click(); await ready(page); const ambiguousModel = await evidence(page);
 assert.equal(ambiguousModel.counts.documents, 0); assert.equal(ambiguousModel.sourceItems[0].extraction.fields.find(row => row.path === 'number').status, 'ambiguous');
 await page.getByRole('button', {name: 'ambiguous.xml', exact: true}).click();
 await page.getByRole('button', {name: 'Locate XML occurrence 2 · number', exact: true}).click();
 assert.match(await page.locator('#inbox-xml-path').innerText(), /cbc:ID\[2\]$/);
 assert.match(await page.locator('#inbox-fields').innerText(), /Ambiguous — inspect repeated elements/);
 checked('Repeated XML values remain ambiguous and each captured occurrence has an inspectable source path');
 await page.locator('#inbox-example').click(); await ready(page);
 const reset = await evidence(page), {viewSelection, ...actual} = reset;
 assert.deepEqual(actual, await Inbox.prepare(await S.sources(), S.journal()), 'Default text inbox parity preserved after XML workflows');
 assert.deepEqual(await page.evaluate(keys => keys.map(key => sessionStorage.getItem(key)), keys), keys.map(key => 'preserve-ubl-' + key));
 assert.deepEqual(report.requests, [], 'No external XML/schema/entity fetches'); assert.deepEqual(report.errors, []);
 checked('Default text reset, source/controller recovery, unchanged workflow journals and no external requests or browser errors');
 await context.close(); report.passed = true;
} catch (error) {report.failure = error.stack; process.exitCode = 1; console.error(error.message.slice(0, 1800));}
finally {
 await browser?.close(); server?.kill();
 await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
 if (report.passed) console.log('PASS ' + selection.name + ': ' + report.layouts.length + ' UBL layouts, ' + report.checks.length + ' source/control groups, 44 owned-review cases and native theme switching.');
}
