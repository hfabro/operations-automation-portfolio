/* Read-only document lineage; whole-journal BI measures retain their existing grain. */
(function(root, factory) {
  const api = typeof module === 'object' && module.exports ? factory(require('./journey-rules.js'), require('./inbox-context.js'), require('./inbox-receipts.js'), require('./report-model.js')) : factory(root.Journey, root.InboxContext, root.InboxReceipts, root.BusinessReport);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.InvoiceTrail = api;
})(typeof window !== 'undefined' ? window : globalThis, function(J, C, Receipts, R) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  async function build(raw, documentId) {
    if (raw === null) throw Error('No saved purchasing journal. Create purchasing progress before following a source invoice.');
    const state = J.restore(raw), checkpoint = J.serialize(state), document = state.documents.find(row => row.id === documentId);
    if (!document) throw Error('The requested invoice is not present in saved purchasing. No other invoice is substituted.');
    const receipt = (await Receipts.inspect(raw)).find(row => row.documentId === documentId);
    if (!receipt) throw Error('This document has no retained source-inbox fingerprint receipt. Its existing purchasing controls remain available.');
    const report = R.compile(state), postedRecords = document.postedLinks.map(link => state.erp.lines.find(row => row.id === link.poLineId).invoices.find(row => row.id === link.invoiceId));
    const posted = postedRecords.reduce((sum, row) => sum + row.netCents, 0), paid = postedRecords.reduce((sum, row) => sum + row.paidCents, 0);
    const total = document.lines.reduce((sum, row) => sum + row.quantity * row.priceCents, 0);
    const next = document.status === 'Held' ? {owner: document.evaluations.at(-1).owner, message: 'Resolve the owned invoice hold before posting.', target: '#journey-document-detail'}
      : document.status === 'Ready' ? {owner: 'AP', message: 'Review the invoice and explicitly post when its checks are clear.', target: '#journey-post'}
      : document.status === 'Posted' ? {owner: 'Payment approver', message: 'Posting created liability; payment authorization remains separate.', target: '#journey-authorize'}
      : document.status === 'Authorized' ? {owner: 'Treasury', message: 'Authorization has not moved cash. Record simulated settlement separately.', target: '#journey-pay'}
      : document.status === 'Paid' ? {owner: 'No pending financial action', message: 'Inspect the paid document and its wider purchasing context in the report.', target: null}
      : {owner: 'AP', message: 'The withdrawn document remains in history and is excluded from new posting.', target: '#document-version-history'};
    const reportMeasure = document.status === 'Paid' ? 'paid' : document.postedInvoiceId ? 'unpaid' : 'openCommitment';
    return {format: 'SIMULATED-SOURCE-INVOICE-TRAIL', version: 1, fictional: true, savedRaw: raw, checkpoint,
      checkpointSha256: await C.hash(checkpoint), revision: state.revision,
      document: {id: document.id, supplierId: document.header.supplierId, number: document.header.number, status: document.status,
        currentVersion: document.versions.length, declaredNetCents: document.header.netCents, currency: document.header.currency,
        reasons: clone(document.evaluations.at(-1)?.reasons || [])}, receipt, next,
      lines: document.lines.map(line => {
        const po = state.erp.lines.find(row => row.id === line.poLineId);
        return {documentLineId: line.id, poLineId: line.poLineId, quantity: line.quantity, priceCents: line.priceCents,
          sourceRequestId: po?.sourceRequestId || null, workOrder: po?.workOrder || null, account: po?.account || null,
          policy: po ? clone(po.codingPolicy) : null,
          allocations: clone(report.invoiceAllocations.filter(row => row.lineId === line.id))};
      }),
      financial: {currency: 'USD', postedNetCents: posted, unpaidNetCents: posted - paid, paidNetCents: paid,
        pending: {currency: document.header.currency, calculatedNetCents: !document.postedInvoiceId && document.status !== 'Withdrawn' ? total : 0}},
      report: {href: 'business-report.html?source=current&invoice=' + encodeURIComponent(documentId) + '&measure=' + reportMeasure + '#report-document-detail',
        scope: 'The linked report opens this document detail. Its KPI totals retain the full current journal and any explicit cost-center/account/project filters; they are not filtered to this invoice.'},
      boundary: 'One source-receipted document, its current lines and linked posted records. Pending values are not liability. Posted invoices = unpaid + paid; financial stages are not separate purchases. The receipt identifies the original source, including after reviewed corrections. Original bytes remain in the inbox evidence download. Read-only simulation; no journal writes or production authentication.'};
  }
  return Object.freeze({build});
});
