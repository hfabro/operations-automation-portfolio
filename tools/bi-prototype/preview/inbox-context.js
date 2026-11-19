/* Read-only purchasing snapshot identity. No storage access or journal writes. */
(function(root, factory) {
  const api = typeof module === 'object' && module.exports ? factory(require('./journey-rules.js')) : factory(root.Journey);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.InboxContext = api;
})(typeof window !== 'undefined' ? window : globalThis, function(J) {
  'use strict';
  async function hash(text) {
    if (!globalThis.crypto?.subtle) throw Error('Secure-context Web Crypto is required for purchasing capture.');
    const data = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(data)].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  async function capture(raw) {
    if (raw === null) throw Error('No saved purchasing journal. Open connected purchasing to create one, then capture it explicitly.');
    if (typeof raw !== 'string' || !raw.length) throw Error('Saved purchasing is unavailable; no example is substituted.');
    const state = J.restore(raw), checkpoint = J.serialize(state);
    const [savedValueSha256, checkpointSha256, policySnapshotSha256] = await Promise.all([hash(raw), hash(checkpoint), hash(JSON.stringify(state.master))]);
    return {format: 'SIMULATED-INBOX-CONTEXT', version: 1, fictional: true, companyIdentity: null,
      savedRaw: raw, savedValueSha256, checkpoint, checkpointSha256, policySnapshotSha256, revision: state.revision,
      approvedPOLines: state.erp.lines.map(line => ({key: checkpointSha256 + '::' + line.id, poLineId: line.id,
        sourceRequestId: line.sourceRequestId, supplierId: line.supplier, description: line.description, account: line.account,
        workOrder: line.workOrder, quantity: line.quantity, received: line.received, priceCents: line.priceCents,
        allocations: line.allocations.map(row => ({...row})), policy: {...line.codingPolicy}})),
      existingDocumentIds: state.documents.map(row => row.id),
      boundary: 'Snapshot identity qualifies this purchasing context, not a verified legal entity or a global PO identity. Read-only preview; no storage write, posting or payment.'};
  }
  function example(context, poLineId) {
    const line = context.approvedPOLines.find(row => row.poLineId === poLineId);
    if (!line) throw Error('Select an approved PO from the captured context.');
    const price = Math.floor(line.priceCents / 100) + '.' + String(line.priceCents % 100).padStart(2, '0');
    const content = ['SYN-INVOICE-TEXT/1', 'Entity: SYN-CO-01', 'Supplier: ' + line.supplierId,
      'Invoice: PREVIEW-' + line.poLineId + '-' + context.checkpointSha256.slice(0, 12), 'Currency: USD', 'Revision: 1',
      'Invoice-Date: 2026-11-19', 'Net-Total: ' + price,
      'Memo: Fictional one-unit preview; no receipt or accounting bucket is invented.', 'Line 1: ' + line.poLineId + ' | 1 | ' + price].join('\n') + '\n';
    return [{id: 'CONTEXT-EXAMPLE', name: 'fictional-captured-po-invoice.txt', mediaType: 'text/plain', content,
      receivedAt: null, receivedAtUnknownReason: 'Generated fictional sample; no inbox receipt timestamp is asserted.', order: 0}];
  }
  return Object.freeze({capture, hash, example});
});
