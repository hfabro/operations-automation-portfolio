'use strict';
const assert = require('node:assert/strict');
const J = require('./bi-prototype/preview/journey-rules.js'), C = require('./bi-prototype/preview/inbox-context.js');
const Inbox = require('./bi-prototype/preview/inbox-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const clone = value => JSON.parse(JSON.stringify(value)), checks = [];
const check = async (name, run) => {await run(); checks.push(name);};
(async () => {
 const baseline = S.journal(), raw = J.serialize(baseline), context = await C.capture(raw);
 const sources = C.example(context, baseline.erp.lines[0].id), preview = await Inbox.prepareCurrent(sources, raw);
 const original = JSON.stringify(preview), result = await Inbox.stage(preview, raw, 'AP'), staged = J.restore(result.checkpoint);
 await check('Explicit AP stage appends only validated version-1 imports without financial actions', async () => {
  assert.equal(result.newDocuments, 1); assert.equal(result.alreadyStaged, false); assert.equal(staged.revision, baseline.revision + 1);
  assert.equal(staged.documents[0].status, 'Ready'); assert.deepEqual(staged.erp, baseline.erp);
  assert.deepEqual(JSON.parse(result.checkpoint).commands.slice(0, baseline.revision), JSON.parse(raw).commands);
  assert.equal(JSON.parse(result.checkpoint).schemaVersion, 1); assert.equal(JSON.stringify(preview), original); assert.equal(J.serialize(baseline), raw);
  assert.equal(staged.commands.at(-1).type, 'importDocument');
  for (const actor of [undefined, 'Purchasing approver', 'Treasury']) await assert.rejects(Inbox.stage(preview, raw, actor), /AP must/);
 });
 await check('Fingerprint receipt survives canonical and reformatted journal export/replay', async () => {
  for (const saved of [result.checkpoint, JSON.stringify(JSON.parse(result.checkpoint), null, 2), J.serialize(J.restore(result.checkpoint))]) {
   const receipts = await Inbox.receipts(saved); assert.equal(receipts.length, 1);
   assert.equal(receipts[0].sourceSha256, preview.sourceItems[0].sha256); assert.equal(receipts[0].contextSha256, context.checkpointSha256);
   assert.equal(receipts[0].documentId, preview.documents[0].id); assert.equal(receipts[0].originalImport.sourceLabel, 'Source SHA256 ' + preview.sourceItems[0].sha256);
   assert.equal(Object.hasOwn(receipts[0], 'content'), false); assert.match(receipts[0].retention, /Original file bytes/);
  }
 });
 await check('Immediate and later retries preserve exact newer raw journal without duplicate imports', async () => {
  const immediate = await Inbox.stage(preview, result.checkpoint, 'AP'); assert(immediate.alreadyStaged); assert.equal(immediate.checkpoint, result.checkpoint);
  let next = staged;
  for (const type of ['post', 'authorize', 'pay']) next = J.dispatch(next, {id: 'AFTER-' + type, type, actor: J.roles[type], payload: {documentId: result.documentIds[0]}});
  const newer = JSON.stringify(JSON.parse(J.serialize(next)), null, 2), retry = await Inbox.stage(preview, newer, 'AP');
  assert(retry.alreadyStaged); assert.equal(retry.newDocuments, 0); assert.equal(retry.checkpoint, newer);
  assert.equal(retry.receipts[0].currentStatus, 'Paid'); assert.equal(J.restore(newer).documents.length, 1);
 });
 await check('Reattachment after reload recognizes the durable receipt rather than adding an invoice', async () => {
  const renamed = [{...sources[0], name: 'renamed.txt', id: 'RENAMED', order: 7}], next = await Inbox.prepareCurrent(renamed, result.checkpoint);
  assert.equal(next.counts.documents, 0); assert.equal(next.counts.alreadyStagedSources, 1); assert.equal(next.sourceItems[0].disposition, 'Already staged');
  assert.equal(next.sourceItems[0].documentId, result.documentIds[0]); assert.deepEqual(next.affectedExisting, []);
  const again = await Inbox.stage(next, result.checkpoint, 'AP'); assert(again.alreadyStaged); assert.equal(again.checkpoint, result.checkpoint);
 });
 await check('Same invoice with changed bytes remains a business duplicate and owns both holds', async () => {
  const next = await Inbox.prepareCurrent([{...sources[0], content: sources[0].content + '# changed bytes\n'}], result.checkpoint);
  assert.equal(next.counts.documents, 1); assert.equal(next.counts.alreadyStagedSources, 0); assert.equal(next.documents[0].evaluation.queue, 'duplicate');
  assert.equal(next.affectedExisting[0].after.queue, 'duplicate');
  const held = J.restore((await Inbox.stage(next, result.checkpoint, 'AP')).checkpoint); assert.equal(held.documents.length, 2); assert(held.documents.every(row => row.status === 'Held'));
 });
 await check('Changed, removed, malformed and same-revision reformatted purchasing cannot be replaced', async () => {
  const changed = J.dispatch(baseline, {id: 'NEW-RECEIPT', type: 'receive', actor: 'Receiving', payload: {poLineId: baseline.erp.lines[0].id, receiptReference: 'AFTER', quantity: 1}});
  for (const current of [null, '', '{}', J.serialize(changed), JSON.stringify(JSON.parse(raw), null, 2)]) await assert.rejects(Inbox.stage(preview, current, 'AP'));
  const p = JSON.parse(raw); p.commands[0].payload.quantity = 5;
  await assert.rejects(Inbox.stage(preview, JSON.stringify(p), 'AP'), /changed after preview/);
 });
 await check('Edited preview amounts, evidence, hashes, commands and decisions fail before stage', async () => {
  for (const edit of [p => p.counts.documents++, p => p.sourceItems[0].sha256 = '0'.repeat(64), p => p.documents[0].header.netCents++, p => p.context.checkpointSha256 = '0'.repeat(64), p => p.sources.proposedCheckpoint.commands.at(-1).payload.declaredNetCents++]) {
   const altered = clone(preview); edit(altered); await assert.rejects(Inbox.stage(altered, raw, 'AP'), /Preview differs/);
  }
 });
 await check('Mixed extraction/revision failures block the whole selection; copies stage once', async () => {
  for (const content of [sources[0].content + 'Account: guessed\n', sources[0].content.replace('Revision: 1', 'Revision: 2\nSupersedes-SHA256: ' + preview.sourceItems[0].sha256)]) {
   const mixed = await Inbox.prepareCurrent([sources[0], {...sources[0], id: 'BAD', order: 1, content}], raw);
   await assert.rejects(Inbox.stage(mixed, raw, 'AP'), /Resolve extraction/);
  }
  const copies = await Inbox.prepareCurrent([sources[0], {...sources[0], id: 'COPY', order: 1}], raw);
  assert.equal((await Inbox.stage(copies, raw, 'AP')).newDocuments, 1);
  await assert.rejects(Inbox.stage(await Inbox.prepareCurrent([], raw), raw, 'AP'), /No original/);
 });
 await check('Receipt identity, origin and reattached normalization conflicts fail closed', async () => {
  for (const edit of [p => p.commands.at(-1).id = 'SOURCE-INBOX:broken', p => p.commands.at(-1).id = p.commands.at(-1).id.replace(context.checkpointSha256, '0'.repeat(64)), p => p.commands.at(-1).payload.sourceLabel = 'Edited hash']) {
   const altered = JSON.parse(result.checkpoint); edit(altered); await assert.rejects(Inbox.receipts(JSON.stringify(altered)), /Source receipt/);
  }
  const altered = JSON.parse(result.checkpoint); altered.commands.at(-1).payload.number = 'EDITED-REFERENCE';
  await assert.rejects(Inbox.prepareCurrent(sources, JSON.stringify(altered)), /disagrees with the reattached/);
 });
 await check('Partial or conflicting prior imports are not treated as successful retries', async () => {
  const two = [sources[0], {...sources[0], id: 'OTHER', order: 1, content: sources[0].content.replace(/^Invoice: .*$/m, 'Invoice: SECOND')}];
  const pair = await Inbox.prepareCurrent(two, raw), complete = await Inbox.stage(pair, raw, 'AP'), partial = JSON.parse(complete.checkpoint);
  partial.commands.pop(); await assert.rejects(Inbox.stage(pair, JSON.stringify(partial), 'AP'), /changed after preview/);
  const conflict = JSON.parse(complete.checkpoint); conflict.commands.at(-1).payload.sourceLabel = 'Changed';
  await assert.rejects(Inbox.stage(pair, JSON.stringify(conflict), 'AP'), /changed after preview/);
 });
 console.log('PASS ' + checks.length + ' guarded source-invoice staging and receipt groups.');
})().catch(error => {console.error(error); process.exitCode = 1;});
