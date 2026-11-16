(function(root, factory) {
  const api = typeof module === 'object' && module.exports
    ? factory(require('./journey-rules.js'), require('./inbox-rules.js')) : factory(root.Journey, root.DocumentInbox);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.InboxSamples = api;
})(typeof window !== 'undefined' ? window : globalThis, function(J, Inbox) {
  'use strict';
  function journal() {
    let value = J.create();
    const act = (type, payload) => {value = J.dispatch(value, {id: 'INBOX-BASE-' + (value.revision + 1), type, actor: J.roles[type], payload});};
    for (const [requestId, itemId, purposeId, quantity] of [
      ['INBOX-REPAIR', 'ITEM-PUMP', 'WORK-REPAIR', 4], ['INBOX-CAPITAL', 'ITEM-PUMP', 'WORK-CAP', 2], ['INBOX-FILTER', 'ITEM-FILTER', 'WORK-FILTER', 6]
    ]) {act('stage', {requestId, itemId, purposeId, quantity}); act('approve', {requestId, reason: 'Fictional inbox demonstration authorization'});}
    for (const [index, quantity] of [[0, 2], [1, 1], [2, 4]]) act('receive', {poLineId: value.erp.lines[index].id, receiptReference: 'INBOX-ACCEPT-' + index, quantity});
    return value;
  }
  function invoice({number = 'INBOX-MULTI-1', supplier = 'SYN-SUP-01', currency = 'USD', revision = 1, net = '2500.00',
    supersedes, lines = ['SYN-PO-0001/001 | 1 | 1250.00', 'SYN-PO-0002/001 | 1 | 1250.00'], memo} = {}) {
    return ['SYN-INVOICE-TEXT/1', 'Entity: SYN-CO-01', 'Supplier: ' + supplier, 'Invoice: ' + number,
      'Currency: ' + currency, 'Revision: ' + revision, 'Invoice-Date: 2026-11-15', 'Net-Total: ' + net,
      ...(supersedes ? ['Supersedes-SHA256: ' + supersedes] : []), ...(memo ? ['Memo: ' + memo] : []),
      ...lines.map((line, index) => 'Line ' + (index + 1) + ': ' + line)].join('\n') + '\n';
  }
  async function sources() {
    const rows = [], add = (id, name, content) => rows.push({id, name, content, mediaType: 'text/plain',
      receivedAt: '2026-11-16T12:' + String(rows.length).padStart(2, '0') + ':00.000Z', receivedAtUnknownReason: null, order: rows.length});
    const ready = invoice(); add('SRC-MULTI', 'fictional-multi-line-invoice.txt', ready);
    add('SRC-COPY', 'renamed-copy-of-multi-line.txt', ready);
    const original = invoice({number: 'INBOX-PRICE-1', net: '1350.00', lines: ['SYN-PO-0001/001 | 1 | 1350.00']});
    add('SRC-PRICE', 'fictional-price-original.txt', original);
    add('SRC-REVISION', 'fictional-price-revision-2.txt', invoice({number: 'INBOX-PRICE-1', revision: 2,
      supersedes: await Inbox.fingerprint(original), net: '1250.00', lines: ['SYN-PO-0001/001 | 1 | 1250.00']}));
    for (const [id, memo] of [['SRC-DUP-A', 'Original delivery'], ['SRC-DUP-B', 'Resent with changed memo']])
      add(id, id.toLowerCase() + '.txt', invoice({number: 'INBOX-DUPLICATE', supplier: 'SYN-SUP-02', net: '50.00', lines: ['SYN-PO-0003/001 | 1 | 50.00'], memo}));
    add('SRC-MISSING', 'fictional-missing-currency.txt', invoice({number: 'INBOX-MISSING'}).replace('Currency: USD\n', ''));
    add('SRC-AMBIGUOUS', 'fictional-repeated-currency.txt', invoice({number: 'INBOX-AMBIGUOUS'}).replace('Currency: USD\n', 'Currency: USD\nCurrency: EUR\n'));
    add('SRC-RECEIPT', 'fictional-awaiting-receipt.txt', invoice({number: 'INBOX-RECEIPT', supplier: 'SYN-SUP-02', net: '250.00', lines: ['SYN-PO-0003/001 | 5 | 50.00']}));
    add('SRC-TOTAL', 'fictional-total-disagreement.txt', invoice({number: 'INBOX-TOTAL', net: '2600.00'}));
    add('SRC-FX', 'fictional-unsupported-currency.txt', invoice({number: 'INBOX-EUR', currency: 'EUR', net: '1250.00', lines: ['SYN-PO-0001/001 | 1 | 1250.00']}));
    add('SRC-ORPHAN', 'fictional-unlinked-revision.txt', invoice({number: 'INBOX-ORPHAN', revision: 2, supersedes: '0'.repeat(64)}));
    add('SRC-NO-PO', 'fictional-unmatched-po.txt', invoice({number: 'INBOX-NO-PO', net: '75.00', lines: ['NO-PO | 1 | 75.00']}));
    return rows;
  }
  return {journal, invoice, sources};
});
