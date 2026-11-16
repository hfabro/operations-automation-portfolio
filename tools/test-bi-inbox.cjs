'use strict';
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const Inbox = require('./bi-prototype/preview/inbox-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const J = require('./bi-prototype/preview/journey-rules.js');
const clone = value => JSON.parse(JSON.stringify(value)), checks = [];
const check = async (name, action) => {await action(); checks.push(name);};
(async () => {
 const sources = await S.sources(), baseline = S.journal(), originalSources = JSON.stringify(sources), originalBaseline = J.serialize(baseline);
 const model = await Inbox.prepare(sources, baseline), source = id => model.sourceItems.find(row => row.id === id);
 const review = (sourceId, decision = 'approve') => ({sourceId, sha256: source(sourceId).sha256, decision, actor: 'Purchasing approver', reason: 'Fictional independent review of the exact supplier revision.'});
 await check('Known SHA-256 and exact original bytes, including BOM and line endings', async () => {
   assert.equal(await Inbox.fingerprint('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
   for (const text of [sources[0].content, '\uFEFF' + sources[0].content, sources[0].content.replaceAll('\n', '\r\n')])
     assert.equal(await Inbox.fingerprint(text), crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex'));
   assert.notEqual(await Inbox.fingerprint(sources[0].content), await Inbox.fingerprint(sources[0].content.replaceAll('\n', '\r\n')));
 });
 await check('Exact source/document grains and authored queue goldens', async () => {
   assert.deepEqual(model.counts, {sourceItems: 13, exactCopies: 1, extractionReviews: 2, revisionReviews: 1, pendingCorrections: 1, documents: 8, readyDocuments: 1, heldDocuments: 7});
   assert.equal(source('SRC-COPY').documentId, null); assert.equal(source('SRC-COPY').sha256, source('SRC-MULTI').sha256);
   assert.equal(source('SRC-COPY').relatedSourceIds[0], 'SRC-MULTI');
   assert.deepEqual(model.documents.map(doc => doc.evaluation.queue), ['ready', 'correction', 'duplicate', 'duplicate', 'receipt', 'data', 'identity', 'reference']);
 });
 await check('Executed field extraction retains exact source lines and normalized values', async () => {
   const extraction = source('SRC-MULTI').extraction;
   assert.equal(extraction.fields.find(field => field.path === 'supplierId').sourceLine, 3);
   assert.deepEqual(extraction.fields.find(field => field.path === 'lines[1].priceCents'), {path: 'lines[1].priceCents', raw: ' 1250.00', normalized: 125000, sourceLine: 10, status: 'extracted'});
   assert.equal(extraction.normalized.declaredNetCents, 250000); assert.equal(extraction.normalized.lines.length, 2);
 });
 await check('Missing and repeated fields never get guessed, including equal duplicate labels', async () => {
   assert.equal(source('SRC-MISSING').extraction.normalized, null);
   assert.equal(source('SRC-MISSING').extraction.fields.find(field => field.path === 'currency').status, 'missing');
   assert(source('SRC-AMBIGUOUS').extraction.issues.some(issue => issue.code === 'AMBIGUOUS_FIELD'));
   const text = sources[0].content.replace('Currency: USD', 'Currency: USD\nCurrency: USD');
   assert.equal(Inbox.parse(text).normalized, null);
 });
 await check('Unrecognized instructions and inherited header names are explicit source-review issues', async () => {
   for (const line of ['Account: 6100', 'toString: USD', '__proto__: USD', '<script>alert(1)</script>']) {
     const result = Inbox.parse(sources[0].content + line + '\n');
     assert.equal(result.normalized, null); assert(result.issues.some(issue => issue.code === 'UNRECOGNIZED_SOURCE'));
   }
 });
 await check('Company, invalid dates, numeric notation, zero/unsafe amounts and line order fail extraction', async () => {
   for (const [old, replacement] of [['Entity: SYN-CO-01', 'Entity: OTHER-CO'], ['2026-11-15', '2026-02-30'], ['1250.00', '1e3'], ['1250.00', '0.00'], ['1250.00', '9007199254740992.00'], ['Line 2:', 'Line 3:'], ['Line 2:', 'Line 1:']])
     assert.equal(Inbox.parse(sources[0].content.replace(old, replacement)).normalized, null, replacement);
 });
 await check('Business-identity duplicates use the existing document evaluator and hold both originals', async () => {
   assert.notEqual(source('SRC-DUP-A').sha256, source('SRC-DUP-B').sha256);
   for (const id of ['INBOX-SRC-DUP-A', 'INBOX-SRC-DUP-B']) {
     const doc = model.documents.find(doc => doc.id === id); assert.equal(doc.evaluation.queue, 'duplicate'); assert.equal(doc.evaluation.owner, 'AP duplicate review');
   }
 });
 await check('Receipt, total, currency and missing PO holds reuse current rules with distinct owners', async () => {
   assert.equal(source('SRC-RECEIPT').owner, 'Receiving / service owner');
   assert.equal(source('SRC-TOTAL').owner, 'AP document review'); assert.equal(source('SRC-FX').owner, 'AP intake');
   assert.equal(source('SRC-NO-PO').owner, 'AP / Purchasing');
   assert.equal(model.sources.proposedCheckpoint.commands.some(command => ['post', 'authorize', 'pay'].includes(command.type)), false);
 });
 await check('Approved PO coding and split allocations remain source-derived', async () => {
   const doc = model.documents.find(doc => doc.id === 'INBOX-SRC-MULTI');
   assert.equal(doc.evaluation.lines[0].coding.account, '6105 · Equipment repairs');
   assert.equal(doc.evaluation.lines[1].coding.allocations.length, 2);
   assert.equal(doc.evaluation.lines[1].coding.allocations.reduce((sum, row) => sum + row.basisPoints, 0), 10000);
 });
 await check('A proposed supplier revision retains original values until an independent decision', async () => {
   const doc = model.documents.find(doc => doc.id === 'INBOX-SRC-PRICE');
   assert.equal(doc.header.netCents, 135000); assert.equal(doc.versions.length, 1);
   assert.equal(doc.pendingCorrection.declaredNetCents, 125000); assert.equal(doc.evaluation.queue, 'correction');
   assert.equal(source('SRC-REVISION').documentId, doc.id); assert.equal(source('SRC-ORPHAN').documentId, null);
 });
 await check('Approval keeps both source fingerprints and invoice versions and reruns existing match controls', async () => {
   const next = await Inbox.prepare(sources, baseline, [review('SRC-REVISION')]), doc = next.documents.find(doc => doc.id === 'INBOX-SRC-PRICE');
   assert.equal(doc.header.netCents, 125000); assert.equal(doc.versions.length, 2); assert.equal(doc.versions[0].header.netCents, 135000);
   assert.equal(doc.correctionHistory[0].actor, 'Purchasing approver'); assert.equal(doc.status, 'Ready');
   assert.equal(next.counts.readyDocuments, 2); assert.equal(next.sourceItems[3].disposition, 'Approved revision');
   assert.equal(next.sourceItems[2].content, sources[2].content); assert.equal(next.sourceItems[3].sha256, source('SRC-REVISION').sha256);
 });
 await check('Rejection preserves original content and prices, with an owned price hold', async () => {
   const next = await Inbox.prepare(sources, baseline, [review('SRC-REVISION', 'reject')]), doc = next.documents.find(doc => doc.id === 'INBOX-SRC-PRICE');
   assert.equal(doc.header.netCents, 135000); assert.equal(doc.versions.length, 1); assert.equal(doc.evaluation.queue, 'price');
   assert.equal(next.sourceItems[3].disposition, 'Rejected revision');
 });
 await check('Wrong role, altered fingerprint, orphan target, duplicate review and unsupported decision fail', async () => {
   for (const item of [{...review('SRC-REVISION'), actor: 'AP'}, {...review('SRC-REVISION'), sha256: '0'.repeat(64)}, review('SRC-ORPHAN'), {...review('SRC-REVISION'), decision: 'post'}, {...review('SRC-REVISION'), reason: 'x'.repeat(81)}])
     await assert.rejects(Inbox.prepare(sources, baseline, [item]));
   await assert.rejects(Inbox.prepare(sources, baseline, [review('SRC-REVISION'), review('SRC-REVISION')]));
 });
 await check('Revisions cannot guess another invoice, change quantity/PO/date or predate their original', async () => {
   for (const [index, change] of [[3, row => row.content = row.content.replace('INBOX-PRICE-1', 'OTHER-INVOICE')], [3, row => row.content = row.content.replace('| 1 |', '| 2 |')],
     [3, row => row.content = row.content.replace('SYN-PO-0001/001', 'SYN-PO-0002/001')], [3, row => row.content = row.content.replace('2026-11-15', '2026-11-14')],
     [2, row => row.order = 100], [3, row => row.receivedAt = '2026-11-15T12:00:00.000Z']]) {
     const data = clone(sources); change(data[index]);
     const next = await Inbox.prepare(data, baseline); assert.equal(next.sourceItems.find(row => row.id === 'SRC-REVISION').disposition, 'Revision review');
   }
 });
 await check('Competing nonidentical revision files remain owned review instead of choosing a winner', async () => {
   const extra = {...clone(sources[3]), id: 'SRC-REVISION-OTHER', name: 'another-revision.txt', order: 99, content: sources[3].content + 'Memo: Competing revision\n'};
   const next = await Inbox.prepare([...sources, extra], baseline);
   assert.equal(next.counts.revisionReviews, 3); assert.equal(next.counts.pendingCorrections, 0);
 });
 await check('Source envelope, IDs, size, encoding and review arrays are bounded and closed', async () => {
   for (const mutate of [row => row.extra = 'ignored', row => row.mediaType = 'application/pdf', row => row.content = 'x'.repeat(32769), row => row.content = '\uD800',
     row => row.receivedAt = 'not-a-date', row => row.receivedAtUnknownReason = 'Contradictory known date', row => row.order = -1]) {
     const data = clone(sources); mutate(data[0]); await assert.rejects(Inbox.prepare(data, baseline));
   }
   await assert.rejects(Inbox.prepare([...sources, clone(sources[0])], baseline)); await assert.rejects(Inbox.prepare(null, baseline));
   assert.throws(() => Inbox.parse('')); assert.throws(() => Inbox.parse('x'.repeat(32769)));
 });
 await check('Explicit empty inbox and unknown capture dates stay honest', async () => {
   const next = await Inbox.prepare([], baseline); assert.equal(next.counts.sourceItems, 0); assert.equal(next.counts.documents, 0);
   const item = {...clone(sources[0]), receivedAt: null, receivedAtUnknownReason: 'Local file has no admitted inbox capture timestamp.'};
   const uploaded = await Inbox.prepare([item], baseline); assert.equal(uploaded.sourceItems[0].receivedAt, null); assert.equal(uploaded.counts.readyDocuments, 1);
 });
 await check('Order, replay, deterministic output and original-source immutability are preserved', async () => {
   assert.equal(JSON.stringify(sources), originalSources); assert.equal(J.serialize(baseline), originalBaseline);
   assert.deepEqual(await Inbox.prepare([...sources].reverse(), baseline), model);
   assert.equal(J.serialize(J.restore(JSON.stringify(model.sources.proposedCheckpoint))), J.serialize(J.restore(JSON.stringify((await Inbox.prepare(sources, baseline)).sources.proposedCheckpoint))));
   assert.equal(J.restore(JSON.stringify(model.sources.proposedCheckpoint)).erp.lines.reduce((sum, line) => sum + line.invoices.length, 0), 0);
 });
 console.log('PASS ' + checks.length + ' document-inbox groups: executed extraction, fingerprints, distinct duplicates, source versions, governed matching, independent review and immutable replay.');
})().catch(error => {console.error(error); process.exitCode = 1;});
