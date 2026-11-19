/* Current-source receipt discovery. No hold-queue or financial-measure changes. */
(function(root, factory) {
  const api = typeof module === 'object' && module.exports ? factory(require('./journey-rules.js'), require('./inbox-context.js'), require('./inbox-receipts.js')) : factory(root.Journey, root.InboxContext, root.InboxReceipts);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ManagementSourceInvoices = api;
})(typeof window !== 'undefined' ? window : globalThis, function(J, C, Receipts) {
  'use strict';
  async function build(context) {
    if (context?.source !== 'current') throw Error('Guided management examples are separate from saved source invoices. Choose My saved journals explicitly.');
    if (context.status !== 'available' || context.savedRaw === null) throw Error('Saved purchasing is unavailable; no source-invoice count or example is substituted.');
    const saved = J.restore(context.savedRaw), checkpoint = J.serialize(saved), captured = J.serialize(J.restore(JSON.stringify(context.checkpoint)));
    if (checkpoint !== captured) throw Error('Saved purchasing differs from the management snapshot. Refresh the management overview before following invoice evidence.');
    const receipts = await Receipts.inspect(context.savedRaw);
    return {format: 'SIMULATED-MANAGEMENT-SOURCE-INVOICES', version: 1, fictional: true,
      savedRaw: context.savedRaw, checkpoint, checkpointSha256: await C.hash(checkpoint), revision: saved.revision,
      documents: receipts.map(receipt => {
        const document = saved.documents.find(row => row.id === receipt.documentId);
        return {documentId: document.id, supplierId: document.header.supplierId, number: document.header.number,
          status: document.status, currentVersion: document.versions.length, currentDeclaredNetCents: document.header.netCents,
          currency: document.header.currency, importedRevision: receipt.importedRevision, sourceSha256: receipt.sourceSha256,
          originCheckpointSha256: receipt.contextSha256,
          purchasingHref: 'connected-journey.html?invoice=' + encodeURIComponent(document.id) + '#invoice-trail',
          reportHref: 'business-report.html?source=current&invoice=' + encodeURIComponent(document.id) + '&measure=' + (document.status === 'Paid' ? 'paid' : document.postedInvoiceId ? 'unpaid' : 'openCommitment') + '#report-document-detail'};
      }).sort((a, b) => b.importedRevision - a.importedRevision),
      boundary: 'One retained source receipt per document, across held/ready/posted/authorized/paid/withdrawn states. This index is separate from the owner-filtered hold queue and financial totals. Current declared invoice net is not a financial measure. Links open the selected document in saved purchasing/BI; target views show their current source revision. Fingerprints do not archive original files or prove production authentication.'};
  }
  return Object.freeze({build});
});
