'use strict';
const assert = require('node:assert/strict'), {createHash} = require('node:crypto');
const J = require('./bi-prototype/preview/journey-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const C = require('./bi-prototype/preview/inbox-context.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const R = require('./bi-prototype/preview/report-scenarios.js');
const sha = text => createHash('sha256').update(text).digest('hex'), checks = [];
const check = async (name, run) => {await run(); checks.push(name);};
(async () => {
  const base = S.journal(), raw = J.serialize(base), context = await C.capture(raw), sample = C.example(context, base.erp.lines[0].id);
  const input = JSON.stringify(sample), preview = await Inbox.prepareCurrent(sample, raw);
  await check('Exact saved value and canonical purchasing identities remain distinct', async () => {
    const spaced = JSON.stringify(JSON.parse(raw), null, 2), other = await C.capture(spaced);
    assert.equal(context.savedValueSha256, sha(raw)); assert.equal(context.checkpointSha256, sha(raw));
    assert.notEqual(other.savedValueSha256, context.savedValueSha256); assert.equal(other.checkpointSha256, context.checkpointSha256);
    assert.equal(context.policySnapshotSha256, sha(JSON.stringify(base.master)));
    assert.equal(context.companyIdentity, null); assert.equal(context.approvedPOLines[0].key, context.checkpointSha256 + '::' + base.erp.lines[0].id);
  });
  await check('Absent damaged unsupported and zero-PO sources never become guided examples', async () => {
    for (const value of [null, '', '{}', 'broken', JSON.stringify({...JSON.parse(raw), schemaVersion: 2})]) await assert.rejects(C.capture(value));
    const empty = await C.capture(J.serialize(J.create())); assert.equal(empty.approvedPOLines.length, 0);
    await assert.rejects(Inbox.prepareCurrent(sample, empty.savedRaw), /no approved PO/i);
  });
  await check('Current preview reuses approved coding, receipt rules and integer cents without mutation', async () => {
    assert.equal(preview.format, 'SIMULATED-CAPTURED-INBOX-PREVIEW'); assert.equal(preview.companyId, null);
    assert.equal(preview.documents[0].status, 'Ready'); assert.equal(preview.documents[0].evaluation.lines[0].coding.account, base.erp.lines[0].account);
    assert.deepEqual(preview.documents[0].evaluation.lines[0].coding.allocations, base.erp.lines[0].allocations);
    assert.equal(preview.documents[0].header.netCents, base.erp.lines[0].priceCents);
    assert.equal(J.serialize(base), raw); assert.equal(JSON.stringify(sample), input);
    assert.equal(preview.context.savedRaw, raw); assert.equal(preview.sourceItems[0].sha256, sha(sample[0].content));
    assert.equal(preview.sources.proposedCheckpoint.commands.length, base.commands.length + 1);
    J.restore(JSON.stringify(preview.sources.proposedCheckpoint));
  });
  await check('File renaming, source ID and order changes preserve document and command identity', async () => {
    const renamed = [{...sample[0], id: 'RENAMED', name: 'renamed.txt', order: 10}], next = await Inbox.prepareCurrent(renamed, raw);
    assert.equal(next.documents[0].id, preview.documents[0].id); assert.deepEqual(next.sources.proposedCheckpoint, preview.sources.proposedCheckpoint);
    assert.match(preview.documents[0].id, /^CTXDOC-[A-F0-9]{64}$/); assert(preview.documents[0].id.length <= 80);
    const altered = [{...sample[0], content: sample[0].content + '# retained comment\n'}];
    assert.notEqual((await Inbox.prepareCurrent(altered, raw)).documents[0].id, preview.documents[0].id);
  });
  await check('Snapshot changes qualify PO and invoice identities even when PO strings match', async () => {
    const changed = J.dispatch(base, {id: 'EXTRA-RECEIPT', type: 'receive', actor: 'Receiving', payload: {poLineId: base.erp.lines[0].id, receiptReference: 'EXTRA', quantity: 1}});
    const next = await Inbox.prepareCurrent(sample, J.serialize(changed));
    assert.notEqual(next.documents[0].id, preview.documents[0].id); assert.notEqual(next.context.approvedPOLines[0].key, context.approvedPOLines[0].key);
  });
  const original = Inbox.parse(sample[0].content).normalized;
  const existing = J.dispatch(base, {id: 'PREEXISTING', type: 'importDocument', actor: 'AP', payload: {
    documentId: 'EXISTING-1', supplierId: original.supplierId, number: original.number, currency: original.currency,
    declaredNetCents: original.declaredNetCents, lines: original.lines, sourceLabel: 'Existing fictional document'}});
  const existingRaw = J.serialize(existing);
  await check('Existing business duplicate holds both documents, counted separately from baseline', async () => {
    const next = await Inbox.prepareCurrent(sample, existingRaw);
    assert.equal(next.counts.documents, 1); assert.equal(next.documents[0].evaluation.queue, 'duplicate');
    assert.equal(next.baselineDocuments.length, 1); assert.equal(next.baselineDocuments[0].status, 'Ready');
    assert.equal(next.affectedExisting.length, 1); assert.equal(next.affectedExisting[0].documentId, 'EXISTING-1');
    assert.equal(next.affectedExisting[0].before.status, 'Ready'); assert.equal(next.affectedExisting[0].after.queue, 'duplicate');
    assert.equal(J.serialize(existing), existingRaw); assert.equal(next.sources.proposedCheckpoint.commands.length, existing.commands.length + 1);
  });
  await check('Existing quantities participate in matching without a false duplicate identity', async () => {
    const quantity = [{...sample[0], content: sample[0].content.replace(/^Invoice: .*$/m, 'Invoice: DIFFERENT-QUANTITY').replace('Net-Total: 1250.00', 'Net-Total: 2500.00').replace('| 1 |', '| 2 |')}];
    const next = await Inbox.prepareCurrent(quantity, existingRaw);
    assert.equal(next.counts.documents, 1); assert.equal(next.counts.heldDocuments, 1);
    assert.notEqual(next.documents[0].evaluation.queue, 'duplicate'); assert(next.documents[0].evaluation.reasons.some(reason => /receipt|quantity|accepted/i.test(reason)));
  });
  await check('Exact copies add no second document and imported command order is deterministic', async () => {
    const copy = {...sample[0], id: 'COPY', name: 'copy.txt', order: 1};
    const next = await Inbox.prepareCurrent([sample[0], copy], raw); assert.equal(next.counts.exactCopies, 1); assert.equal(next.counts.documents, 1);
    const different = {...copy, content: copy.content.replace(/^Invoice: .*$/m, 'Invoice: SECOND')};
    const a = await Inbox.prepareCurrent([sample[0], different], raw);
    const b = await Inbox.prepareCurrent([{...different, order: 0}, {...sample[0], order: 1}], raw);
    assert.deepEqual(a.sources.proposedCheckpoint, b.sources.proposedCheckpoint);
  });
  await check('Existing held, corrected and settled checkpoints remain intact and replayable', async () => {
    for (const baseline of Object.values(R.checkpoints())) {
      const checkpoint = J.serialize(baseline), next = await Inbox.prepareCurrent([], checkpoint);
      assert.equal(next.counts.documents, 0); assert.equal(next.baselineDocuments.length, baseline.documents.length);
      assert.deepEqual(next.affectedExisting, []); assert.equal(JSON.stringify(next.sources.proposedCheckpoint), checkpoint);
    }
  });
  await check('Supplier revisions and malformed sources stay owned review items in current mode', async () => {
    const revision = {...sample[0], content: sample[0].content.replace('Revision: 1', 'Revision: 2\nSupersedes-SHA256: ' + sha(sample[0].content))};
    const next = await Inbox.prepareCurrent([revision], existingRaw); assert.equal(next.counts.documents, 0);
    assert.equal(next.sourceItems[0].disposition, 'Revision review'); assert.equal(next.sourceItems[0].owner, 'AP revision review');
    const malformed = await Inbox.prepareCurrent([{...sample[0], content: sample[0].content + 'Account: guessed\n'}], raw);
    assert.equal(malformed.counts.extractionReviews, 1); assert.equal(malformed.counts.documents, 0);
  });
  await check('Legacy independent baseline restriction and authored outcome goldens are unchanged', async () => {
    await assert.rejects(Inbox.prepare(sample, existing), /independent inbox/);
    const guided = await Inbox.prepare(await S.sources(), S.journal());
    assert.deepEqual(guided.counts, {sourceItems: 13, exactCopies: 1, extractionReviews: 2, revisionReviews: 1, pendingCorrections: 1, documents: 8, readyDocuments: 1, heldDocuments: 7});
    assert.equal(guided.format, 'SIMULATED-DOCUMENT-INBOX'); assert.equal(Object.hasOwn(guided, 'context'), false);
  });
  console.log('PASS ' + checks.length + ' captured purchasing inbox groups.');
})().catch(error => {console.error(error); process.exitCode = 1;});
