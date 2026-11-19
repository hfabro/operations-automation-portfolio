'use strict';
const assert = require('node:assert/strict');
const J = require('./bi-prototype/preview/journey-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const C = require('./bi-prototype/preview/inbox-context.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const Trail = require('./bi-prototype/preview/invoice-trail-rules.js'), R = require('./bi-prototype/preview/report-model.js');
const checks = [], check = async (name, run) => {await run(); checks.push(name);};
async function importSources(base, sources) {const raw = J.serialize(base), preview = await Inbox.prepareCurrent(sources, raw); return Inbox.stage(preview, raw, 'AP');}
(async () => {
 const base = S.journal(), raw = J.serialize(base), context = await C.capture(raw), sources = C.example(context, base.erp.lines[0].id);
 const imported = await importSources(base, sources), id = imported.documentIds[0], trail = await Trail.build(imported.checkpoint, id);
 await check('Read-only trail binds the exact selected receipt and approved PO snapshot', async () => {
  assert.equal(trail.document.id, id); assert.equal(trail.receipt.sourceSha256, await Inbox.fingerprint(sources[0].content));
  assert.equal(trail.lines[0].sourceRequestId, base.erp.lines[0].sourceRequestId); assert.equal(trail.lines[0].account, base.erp.lines[0].account);
  assert.deepEqual(trail.lines[0].policy, base.erp.lines[0].codingPolicy); assert.equal(trail.savedRaw, imported.checkpoint);
  assert.equal(trail.checkpointSha256, await C.hash(trail.checkpoint)); assert.equal(J.serialize(base), raw);
 });
 await check('Ready invoices remain pending, with zero posted liability or cash', async () => {
  assert.equal(trail.document.status, 'Ready'); assert.equal(trail.financial.pending.calculatedNetCents, 125000);
  assert.equal(trail.financial.postedNetCents, 0); assert.equal(trail.financial.unpaidNetCents, 0); assert.equal(trail.financial.paidNetCents, 0);
  assert.equal(trail.next.owner, 'AP'); assert.equal(trail.next.target, '#journey-post');
 });
 await check('Post, authorization and settlement keep separate owners and financial identities', async () => {
  let state = J.restore(imported.checkpoint);
  for (const [type, status, owner, unpaid, paid] of [['post','Posted','Payment approver',125000,0],['authorize','Authorized','Treasury',125000,0],['pay','Paid','No pending financial action',0,125000]]) {
   state = J.dispatch(state, {id: 'TRAIL-' + type, type, actor: J.roles[type], payload: {documentId: id}});
   const next = await Trail.build(J.serialize(state), id);
   assert.equal(next.document.status, status); assert.equal(next.next.owner, owner); assert.equal(next.financial.unpaidNetCents, unpaid); assert.equal(next.financial.paidNetCents, paid);
   assert.equal(next.financial.postedNetCents, unpaid + paid); assert.equal(next.financial.pending.calculatedNetCents, 0);
  }
 });
 await check('A selected paid invoice does not inherit another invoice payment or whole-PO totals', async () => {
  const second = {...sources[0], id: 'SECOND', order: 1, content: sources[0].content.replace(/^Invoice: .*$/m, 'Invoice: OTHER-PAID')};
  const pair = await importSources(base, [sources[0], second]); let state = J.restore(pair.checkpoint);
  for (const documentId of pair.documentIds) for (const type of ['post','authorize','pay']) state = J.dispatch(state, {id: documentId + ':' + type, type, actor: J.roles[type], payload: {documentId}});
  const one = await Trail.build(J.serialize(state), pair.documentIds[0]); assert.equal(one.financial.paidNetCents, 125000);
  assert.equal(R.select(R.compile(state)).totals.paid, 250000); assert.match(one.report.scope, /not filtered to this invoice/);
 });
 await check('Multi-PO coding and invoice-line allocation cents reconcile independently of header counts', async () => {
  const text = sources[0].content.replace('Net-Total: 1250.00', 'Net-Total: 2500.01') + 'Line 2: SYN-PO-0002/001 | 1 | 1250.01\n';
  const result = await importSources(base, [{...sources[0], content: text}]), next = await Trail.build(result.checkpoint, result.documentIds[0]);
  assert.equal(next.lines.length, 2); assert.notEqual(next.lines[0].account, next.lines[1].account);
  assert.equal(next.lines[1].allocations.length, 2);
  assert.equal(next.lines.flatMap(row => row.allocations).reduce((sum, row) => sum + row.netCents, 0), 250001);
 });
 await check('Declared header disagreement remains distinct from calculated pending line value', async () => {
  const result = await importSources(base, [{...sources[0], content: sources[0].content.replace('Net-Total: 1250.00', 'Net-Total: 1300.00')}]);
  const next = await Trail.build(result.checkpoint, result.documentIds[0]); assert.equal(next.document.declaredNetCents, 130000);
  assert.equal(next.financial.pending.calculatedNetCents, 125000); assert.equal(next.financial.postedNetCents, 0); assert.equal(next.document.status, 'Held');
 });
 await check('Reviewed price corrections retain original source identity and current version separately', async () => {
  const result = await importSources(base, [{...sources[0], content: sources[0].content.replaceAll('1250.00','1350.00')}]); let state = J.restore(result.checkpoint);
  state = J.dispatch(state, {id: 'PROPOSE', type: 'proposeCorrection', actor: 'AP', payload: {documentId: result.documentIds[0], expectedVersion: 1, pricesCents: [125000], declaredNetCents: 125000, reason: 'Fictional price correction', sourceLabel: 'Fictional reviewed revision'}});
  state = J.dispatch(state, {id: 'REVIEW', type: 'reviewCorrection', actor: 'Purchasing approver', payload: {documentId: result.documentIds[0], decision: 'approve', reason: 'Reviewed fictional source'}});
  const next = await Trail.build(J.serialize(state), result.documentIds[0]); assert.equal(next.document.currentVersion, 2);
  assert.equal(next.receipt.originalImport.declaredNetCents, 135000); assert.equal(next.document.declaredNetCents, 125000);
 });
 await check('Unmatched PO and non-USD originals keep owned holds without invented coding or USD liability', async () => {
  for (const content of [sources[0].content.replace('SYN-PO-0001/001 |', 'UNKNOWN-PO |'), sources[0].content.replace('Currency: USD', 'Currency: EUR')]) {
   const result = await importSources(base, [{...sources[0], content}]), next = await Trail.build(result.checkpoint, result.documentIds[0]);
   assert.equal(next.document.status, 'Held'); assert.equal(next.financial.postedNetCents, 0); assert(next.next.owner);
   if (content.includes('UNKNOWN-PO')) {assert.equal(next.lines[0].account, null); assert.equal(next.lines[0].sourceRequestId, null);}
   else assert.equal(next.financial.pending.currency, 'EUR');
  }
 });
 await check('Withdrawn originals retain evidence while contributing no pending or posted amount', async () => {
  const state = J.dispatch(J.restore(imported.checkpoint), {id: 'WITHDRAW', type: 'withdraw', actor: 'AP', payload: {documentId: id, reason: 'Fictional withdrawal'}});
  const next = await Trail.build(J.serialize(state), id); assert.equal(next.document.status, 'Withdrawn'); assert.equal(next.financial.pending.calculatedNetCents, 0); assert.equal(next.financial.postedNetCents, 0); assert(next.receipt);
 });
 await check('Absent, malformed, missing-document and non-receipted sources never become a substitute trail', async () => {
  for (const source of [null, '', '{}', 'damaged', raw]) await assert.rejects(Trail.build(source, id));
  const legacy = J.restore(JSON.stringify((await Inbox.prepare(sources, base)).sources.proposedCheckpoint));
  await assert.rejects(Trail.build(J.serialize(legacy), legacy.documents[0].id), /no retained source-inbox fingerprint/);
 });
 console.log('PASS ' + checks.length + ' source-invoice trail model groups.');
})().catch(error => {console.error(error); process.exitCode = 1;});
