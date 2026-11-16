/* Authored fictional UBL subset examples; independent of the default text inbox. */
(function(root, factory) {
 const api = factory();
 if (typeof module === 'object' && module.exports) module.exports = api; else root.UBLInvoiceSamples = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
 'use strict';
 const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
 function invoice({number = 'UBL-MULTI-1', supplier = 'SYN-SUP-01', buyer = 'SYN-CO-01', currency = 'USD', net = '2500.00', note = '', tax = null,
   lines = [{po: 'SYN-PO-0001/001', quantity: 1, price: '1250.00'}, {po: 'SYN-PO-0002/001', quantity: 1, price: '1250.00'}]} = {}) {
  const money = (name, value) => '<cbc:' + name + ' currencyID="' + escape(currency) + '">' + escape(value) + '</cbc:' + name + '>';
  const party = (name, id) => '<cac:' + name + '><cac:Party><cac:PartyIdentification><cbc:ID>' + escape(id) + '</cbc:ID></cac:PartyIdentification></cac:Party></cac:' + name + '>';
  return ['<?xml version="1.0" encoding="UTF-8"?>',
   '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
   '<cbc:UBLVersionID>2.1</cbc:UBLVersionID>', '<cbc:ID>' + escape(number) + '</cbc:ID>', '<cbc:IssueDate>2026-11-15</cbc:IssueDate>', '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>',
   ...(note ? ['<cbc:Note>' + escape(note) + '</cbc:Note>'] : []), '<cbc:DocumentCurrencyCode>' + escape(currency) + '</cbc:DocumentCurrencyCode>',
   party('AccountingSupplierParty', supplier), party('AccountingCustomerParty', buyer), ...(tax !== null ? ['<cac:TaxTotal>' + money('TaxAmount', tax) + '</cac:TaxTotal>'] : []),
   '<cac:LegalMonetaryTotal>' + ['LineExtensionAmount','TaxExclusiveAmount','TaxInclusiveAmount','PayableAmount'].map(name => money(name, net)).join('') + '</cac:LegalMonetaryTotal>',
   ...lines.map((line, index) => '<cac:InvoiceLine><cbc:ID>' + (index + 1) + '</cbc:ID><cbc:InvoicedQuantity unitCode="' + escape(line.unit || 'EA') + '">' + escape(line.quantity) + '</cbc:InvoicedQuantity>' +
    money('LineExtensionAmount', line.net ?? (Number(line.quantity) * Number(line.price)).toFixed(2)) + '<cac:OrderLineReference><cbc:LineID>' + escape(line.po) + '</cbc:LineID></cac:OrderLineReference>' +
    '<cac:Item><cbc:Name>Fictional approved PO item</cbc:Name></cac:Item><cac:Price>' + money('PriceAmount', line.price) + '<cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity></cac:Price></cac:InvoiceLine>'),
   '</Invoice>', ''].join('\n');
 }
 function sources() {
  const rows = [], add = (id, content) => rows.push({id, name: id.toLowerCase() + '.xml', content, mediaType: 'application/xml',
   receivedAt: '2026-11-16T13:' + String(rows.length).padStart(2, '0') + ':00.000Z', receivedAtUnknownReason: null, order: rows.length});
  const ready = invoice(); add('UBL-READY', ready); add('UBL-COPY', ready);
  add('UBL-UNIT', invoice({number: 'UBL-UNIT', lines: [{po: 'SYN-PO-0001/001', quantity: 1, price: '1250.00', unit: 'KGM'}], net: '1250.00'}));
  add('UBL-RECEIPT', invoice({number: 'UBL-RECEIPT', supplier: 'SYN-SUP-02', net: '250.00', lines: [{po: 'SYN-PO-0003/001', quantity: 5, price: '50.00'}]}));
  add('UBL-TOTAL', invoice({number: 'UBL-TOTAL', net: '2600.00'}));
  add('UBL-FX', invoice({number: 'UBL-EUR', currency: 'EUR', net: '1250.00', lines: [{po: 'SYN-PO-0001/001', quantity: 1, price: '1250.00'}]}));
  add('UBL-TAX', invoice({number: 'UBL-TAX', tax: '20.00'}));
  for (const [id, note] of [['UBL-DUP-A', 'Original delivery'], ['UBL-DUP-B', 'Resent with changed note']]) add(id, invoice({number: 'UBL-DUPLICATE', supplier: 'SYN-SUP-02', net: '50.00', note, lines: [{po: 'SYN-PO-0003/001', quantity: 1, price: '50.00'}]}));
  return rows;
 }
 return {invoice, sources};
});
