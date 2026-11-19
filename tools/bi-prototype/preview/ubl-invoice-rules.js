/* Explicit UBL 2.1 original-invoice subset; native inert XML parsing, not XSD/Peppol validation or OCR. */
(function(root, factory) {
 const api = typeof module === 'object' && module.exports ? factory(require('./invoice-rules.js'), require('./document-rules.js')) : factory(root.InvoiceIntake, root.InvoiceDocuments);
 if (typeof module === 'object' && module.exports) module.exports = api; else root.UBLInvoice = api;
})(typeof window !== 'undefined' ? window : globalThis, function(I, D) {
 'use strict';
 const NS = Object.freeze({invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2', cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'});
 const known = new Set(Object.values(NS)), clone = value => JSON.parse(JSON.stringify(value));
 const ref = value => /^[A-Za-z0-9][A-Za-z0-9_./:-]{0,79}$/.test(value) ? value.toUpperCase() : null;
 const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value ? value : null;
 function pathOf(node) {
  const path = [];
  for (let current = node; current?.nodeType === 1; current = current.parentElement) {
   const siblings = current.parentElement ? [...current.parentElement.children].filter(sibling => sibling.namespaceURI === current.namespaceURI && sibling.localName === current.localName) : [current];
   path.unshift({namespaceURI: current.namespaceURI, localName: current.localName, index: siblings.indexOf(current) + 1});
  }
  return path;
 }
 function label(path) {return path.map(part => (part.namespaceURI === NS.cac ? 'cac:' : part.namespaceURI === NS.cbc ? 'cbc:' : '') + part.localName + '[' + part.index + ']').join(' / ');}
 function document(text) {
  if (typeof DOMParser === 'undefined') throw Error('UBL extraction requires a native browser XML parser. The plain-text path remains independent.');
  if (typeof text !== 'string' || !text.length || new TextEncoder().encode(text).length > 32768) throw Error('Use a nonempty UTF-8 XML source of at most 32 KiB.');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) return {error: 'DTD/entity declarations are outside the admitted XML profile.'};
  if (/<\?(?!xml(?:\s|\?>))/i.test(text)) return {error: 'XML processing instructions are outside the admitted profile.'};
  const encoding = text.match(/^\uFEFF?\s*<\?xml\s[^?]*encoding\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  if (encoding && !/^utf-8$/i.test(encoding)) return {error: 'The source must declare UTF-8 or omit an encoding declaration.'};
  // Some native XML parsers reject a decoded UTF-8 BOM before an XML declaration.
  // Normalize only the parser copy; fingerprints and source downloads retain text unchanged.
  const parserText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const doc = new DOMParser().parseFromString(parserText, 'application/xml');
  if (!doc.documentElement || doc.getElementsByTagNameNS('*', 'parsererror').length || doc.doctype) return {error: 'XML is not well formed or contains an unsupported declaration.'};
  const root = doc.documentElement;
  if (root.namespaceURI !== NS.invoice || root.localName !== 'Invoice') return {error: 'Expected the UBL Invoice-2 namespace and Invoice root.'};
  const nodes = [...doc.getElementsByTagName('*')];
  if (nodes.length > 512) return {error: 'XML exceeds the 512-element profile limit.'};
  if (nodes.some(node => !known.has(node.namespaceURI) || pathOf(node).length > 12)) return {error: 'Foreign namespaces or XML depth beyond 12 are not admitted.'};
  if (nodes.some(node => node.attributes.length > 12)) return {error: 'XML exceeds the per-element attribute limit.'};
  return {doc, root};
 }
 function parse(text) {
  const fields = [], issues = [], issue = (code, field, message, paths = [], owner = 'AP document review') => issues.push({code, field, message, sourceLines: [], sourcePaths: clone(paths), owner});
  const failed = message => {issue('XML_PROFILE_REVIEW', 'source', message); return result(null);};
  function result(normalized) {return {format: 'SUPPORTED-UBL-INVOICE', version: 1, profile: 'SYN-UBL-2.1-NET-1', fields, issues, normalized, sourceLineCount: text.split(/\r\n|\n/).length, sourceLocationKind: 'namespace-aware-element-path'};}
  const parsed = document(text); if (parsed.error) return failed(parsed.error);
  const {root} = parsed, children = (parent, ns, name) => parent ? [...parent.children].filter(node => node.namespaceURI === NS[ns] && node.localName === name) : [];
  function one(parent, ns, name, field, optional = false) {
   const matches = children(parent, ns, name);
   if (matches.length === 1) return matches[0];
   if (matches.length > 1) issue('AMBIGUOUS_XML_FIELD', field, 'Repeated source elements require review; no first/last value is chosen.', matches.map(pathOf));
   else if (!optional) issue('MISSING_XML_FIELD', field, 'Required profile element is absent.');
   return null;
  }
  function allowed(parent, names) {
   if (!parent) return;
   if ([...parent.childNodes].some(node => (node.nodeType === 3 || node.nodeType === 4) && node.textContent.trim())) issue('UNSUPPORTED_XML_CONTENT', label(pathOf(parent)), 'Aggregate elements may contain only admitted child elements and whitespace.', [pathOf(parent)]);
   for (const child of parent.children) if (!names.some(([ns, name]) => child.namespaceURI === NS[ns] && child.localName === name)) issue('UNSUPPORTED_XML_FEATURE', label(pathOf(child)), 'Source feature is outside the net-only profile; no financial or coding instruction is silently ignored.', [pathOf(child)]);
  }
  function field(path, node, convert, attribute = null) {
   const raw = node ? attribute ? node.getAttribute(attribute) : node.textContent : null;
   let normalized = null, status = node ? 'extracted' : issues.some(issue => issue.code === 'AMBIGUOUS_XML_FIELD' && issue.field === path) ? 'ambiguous' : 'missing';
   if (node) {
    if (node.children.length && !attribute) {status = 'invalid'; issue('INVALID_XML_VALUE', path, 'Expected character data without nested elements.', [pathOf(node)]);}
    else {try {normalized = raw === null ? null : convert(raw.trim()); if (normalized === null) throw Error('Invalid value');} catch {status = 'invalid'; issue('INVALID_XML_VALUE', path, 'Source value is invalid for the admitted profile.', [pathOf(node)]);}}
   }
   fields.push({path, raw, normalized, sourceLine: null, sourcePath: node ? pathOf(node) : null, sourceAttribute: attribute, valueOrigin: 'xml-character-data', status}); return normalized;
  }
  const cbc = (name, path, convert, parent = root, optional = false) => field(path, one(parent, 'cbc', name, path, optional), convert);
  allowed(root, [['cbc','UBLVersionID'],['cbc','ID'],['cbc','IssueDate'],['cbc','DueDate'],['cbc','InvoiceTypeCode'],['cbc','Note'],['cbc','DocumentCurrencyCode'],['cac','AccountingSupplierParty'],['cac','AccountingCustomerParty'],['cac','TaxTotal'],['cac','LegalMonetaryTotal'],['cac','InvoiceLine']]);
  for (const node of parsed.doc.getElementsByTagName('*')) {
   for (const attribute of node.attributes) {
    const namespaceDeclaration = attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/';
    if (namespaceDeclaration) continue;
    const admissible = !attribute.namespaceURI && node.namespaceURI === NS.cbc &&
      (attribute.localName === 'currencyID' && ['LineExtensionAmount','TaxExclusiveAmount','TaxInclusiveAmount','PayableAmount','TaxAmount','PriceAmount'].includes(node.localName) ||
       attribute.localName === 'unitCode' && ['InvoicedQuantity','BaseQuantity'].includes(node.localName));
    if (!admissible) issue('UNSUPPORTED_XML_ATTRIBUTE', label(pathOf(node)), 'Attribute or external schema reference is outside the declared profile.', [pathOf(node)]);
   }
  }
  const version = cbc('UBLVersionID', 'ublVersion', value => value === '2.1' ? value : null);
  const number = cbc('ID', 'number', ref), invoiceOn = cbc('IssueDate', 'invoiceOn', day);
  const type = cbc('InvoiceTypeCode', 'invoiceType', value => value === '380' ? value : null);
  const currency = cbc('DocumentCurrencyCode', 'currency', value => /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null);
  const due = one(root, 'cbc', 'DueDate', 'dueOn', true); if (due) field('dueOn', due, day);
  children(root, 'cbc', 'Note').forEach((node, index) => field('notes[' + index + ']', node, value => value.length <= 200 ? value : null));
  function party(aggregateName, path) {
   const aggregate = one(root, 'cac', aggregateName, path); allowed(aggregate, [['cac','Party']]);
   const party = one(aggregate, 'cac', 'Party', path); allowed(party, [['cac','PartyIdentification'],['cac','PartyName']]);
   const identification = one(party, 'cac', 'PartyIdentification', path); allowed(identification, [['cbc','ID']]);
   for (const name of children(party, 'cac', 'PartyName')) {allowed(name, [['cbc','Name']]); field(path + '.displayName', one(name, 'cbc', 'Name', path + '.displayName'), value => value.length <= 120 ? value : null);}
   return cbc('ID', path, ref, identification);
  }
  const supplierId = party('AccountingSupplierParty', 'supplierId'), entityId = party('AccountingCustomerParty', 'entityId');
  if (entityId !== 'SYN-CO-01') issue('ENTITY_REVIEW', 'entityId', 'Only the admitted fictional company identifier can enter the simulated journal.', [], 'AP entity review');
  function amount(node, path, allowZero = false) {
   const value = field(path, node, input => allowZero && /^0+(?:\.0{1,2})?$/.test(input) ? 0 : I.cents(input));
   const sourceCurrency = field(path + '.currency', node, input => /^[A-Za-z]{3}$/.test(input) ? input.toUpperCase() : null, 'currencyID');
   if (node && sourceCurrency !== currency) issue('XML_CURRENCY_CONFLICT', path, 'All monetary source currency attributes must equal DocumentCurrencyCode.', [pathOf(node)]);
   return value;
  }
  const totals = one(root, 'cac', 'LegalMonetaryTotal', 'monetaryTotal');
  allowed(totals, [['cbc','LineExtensionAmount'],['cbc','TaxExclusiveAmount'],['cbc','TaxInclusiveAmount'],['cbc','PayableAmount']]);
  const totalValues = ['LineExtensionAmount','TaxExclusiveAmount','TaxInclusiveAmount','PayableAmount'].map(name => amount(one(totals, 'cbc', name, 'monetaryTotal.' + name), 'monetaryTotal.' + name));
  if (new Set(totalValues.filter(value => value !== null)).size > 1) issue('UNSUPPORTED_MONETARY_BASIS', 'monetaryTotal', 'The net-only profile requires equal line-extension, tax-exclusive, tax-inclusive and payable header amounts.');
  for (const [index, tax] of children(root, 'cac', 'TaxTotal').entries()) {
   allowed(tax, [['cbc','TaxAmount']]);
   const value = amount(one(tax, 'cbc', 'TaxAmount', 'taxTotal[' + index + ']'), 'taxTotal[' + index + ']', true);
   if (value !== null && value !== 0) issue('UNSUPPORTED_TAX', 'taxTotal[' + index + ']', 'Nonzero tax requires review outside this net-only demonstration.');
  }
  const lines = [], sourceLines = children(root, 'cac', 'InvoiceLine'), lineIds = new Set();
  if (!sourceLines.length || sourceLines.length > 20) issue('XML_LINE_COUNT', 'lines', 'Use 1–20 original invoice lines.');
  sourceLines.slice(0, 20).forEach((node, index) => {
   const prefix = 'lines[' + index + ']';
   allowed(node, [['cbc','ID'],['cbc','InvoicedQuantity'],['cbc','LineExtensionAmount'],['cac','OrderLineReference'],['cac','Item'],['cac','Price']]);
   const lineId = cbc('ID', prefix + '.sourceLineId', ref, node);
   if (lineIds.has(lineId)) issue('DUPLICATE_XML_LINE_ID', prefix, 'Original invoice line identifiers must be unique.'); lineIds.add(lineId);
   const quantityNode = one(node, 'cbc', 'InvoicedQuantity', prefix + '.quantity');
   const whole = value => /^\d+(?:\.0{1,6})?$/.test(value) && BigInt(value.split('.')[0]) >= 1n && BigInt(value.split('.')[0]) <= 1000n ? Number(value.split('.')[0]) : null;
   const quantity = field(prefix + '.quantity', quantityNode, whole);
   field(prefix + '.unitCode', quantityNode, value => value === 'EA' ? value : null, 'unitCode');
   const reference = one(node, 'cac', 'OrderLineReference', prefix + '.poLineId'); allowed(reference, [['cbc','LineID']]);
   const poLineId = cbc('LineID', prefix + '.poLineId', ref, reference);
   const item = one(node, 'cac', 'Item', prefix + '.item'); allowed(item, [['cbc','Name']]);
   cbc('Name', prefix + '.name', value => value.length > 0 && value.length <= 120 ? value : null, item);
   const price = one(node, 'cac', 'Price', prefix + '.price'); allowed(price, [['cbc','PriceAmount'],['cbc','BaseQuantity']]);
   const priceCents = amount(one(price, 'cbc', 'PriceAmount', prefix + '.priceCents'), prefix + '.priceCents');
   const base = one(price, 'cbc', 'BaseQuantity', prefix + '.baseQuantity');
   if (base) {field(prefix + '.baseQuantity', base, value => whole(value) === 1 ? 1 : null); field(prefix + '.baseUnit', base, value => value === 'EA' ? value : null, 'unitCode');}
   const net = amount(one(node, 'cbc', 'LineExtensionAmount', prefix + '.declaredLineNetCents'), prefix + '.declaredLineNetCents');
   if (quantity !== null && priceCents !== null && (!Number.isSafeInteger(quantity * priceCents) || net !== quantity * priceCents)) issue('XML_LINE_TOTAL_CONFLICT', prefix, 'Declared line extension must equal whole quantity × unit price without allowances or conversion.');
   lines.push({poLineId, quantity, priceCents});
  });
  fields.push({path: 'revision', raw: null, normalized: 1, sourceLine: null, sourcePath: null, sourceAttribute: null, valueOrigin: 'adapter-scope', status: 'derived', explanation: 'This adapter admits original Invoice documents only; it does not infer a supplier revision from UBL references.'});
  if (!issues.length) try {D.validLines(lines);} catch (error) {issue('INVALID_XML_AMOUNT', 'lines', error.message);}
  const normalized = issues.length || !version || !type ? null : {entityId, supplierId, number, currency, revision: 1, invoiceOn, declaredNetCents: totalValues[1], supersedes: null, lines};
  return result(normalized);
 }
 function sourceFragment(text, path) {
  if (!Array.isArray(path) || path.length > 12 || !path.length || path.some(part => !part || !known.has(part.namespaceURI) || typeof part.localName !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(part.localName) || !Number.isInteger(part.index) || part.index < 1 || part.index > 512)) throw Error('Invalid admitted XML source path.');
  const parsed = document(text); if (parsed.error) throw Error(parsed.error);
  let node = parsed.root;
  if (node.namespaceURI !== path[0].namespaceURI || node.localName !== path[0].localName || path[0].index !== 1) throw Error('Source root does not match the captured path.');
  for (const part of path.slice(1)) {node = [...node.children].filter(child => child.namespaceURI === part.namespaceURI && child.localName === part.localName)[part.index - 1]; if (!node) throw Error('Captured XML element is absent from the exact source.');}
  return {path: label(path), characterData: node.textContent, fragment: new XMLSerializer().serializeToString(node)};
 }
 return {parse, sourceFragment, pathLabel: label, namespaces: clone(NS), profile: 'SYN-UBL-2.1-NET-1'};
});
