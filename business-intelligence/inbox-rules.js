/* Supported invoice-text extraction and immutable source evidence over the existing invoice controls. */
(function(root, factory) {
  const api = typeof module === 'object' && module.exports
    ? factory(require('./invoice-rules.js'), require('./journey-rules.js'), require('./document-rules.js'), require('./ubl-invoice-rules.js'))
    : factory(root.InvoiceIntake, root.Journey, root.InvoiceDocuments, root.UBLInvoice);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DocumentInbox = api;
})(typeof window !== 'undefined' ? window : globalThis, function(I, J, D, UBL) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value)), encoder = new TextEncoder();
  const scenarioId = 'SYN-DOC-INBOX-1', companyId = 'SYN-CO-01';
  const headerLabels = {Entity: 'entityId', Supplier: 'supplierId', Invoice: 'number', Currency: 'currency',
    Revision: 'revision', 'Invoice-Date': 'invoiceOn', 'Net-Total': 'netCents', 'Supersedes-SHA256': 'supersedes', Memo: 'memo'};
  const required = ['entityId', 'supplierId', 'number', 'currency', 'revision', 'invoiceOn', 'netCents'];
  const identity = row => JSON.stringify([row.entityId, row.supplierId, row.number]);
  const key = (kind, id) => JSON.stringify([scenarioId, companyId, kind, id]);
  function contract(message) { throw Error('Document inbox: ' + message); }
  function closed(value, fields, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(field => !fields.includes(field)) || fields.some(field => !Object.hasOwn(value, field))) contract(label + ' has missing or unsupported fields.');
  }
  function isoDay(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  }
  function bytes(text) {
    if (typeof text !== 'string') contract('Source must be UTF-8 text.');
    const data = encoder.encode(text);
    if (data.length > 32768 || !data.length) contract('Use a nonempty source of at most 32 KiB.');
    // Reject unpaired UTF-16 surrogates instead of silently hashing replacement characters.
    if (new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(data) !== text) contract('Source contains invalid Unicode.');
    return data;
  }
  async function fingerprint(text) {
    const data = bytes(text);
    if (!globalThis.crypto?.subtle) contract('SHA-256 requires a secure browser context.');
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  function parse(text, mediaType = 'text/plain') {
    bytes(text);
    if (mediaType === 'application/xml') return UBL.parse(text);
    if (mediaType !== 'text/plain') contract('Unsupported extraction media type.');
    const sourceLines = text.split(/\r\n|\n/), fields = [], issues = [], seen = new Map(), lineEntries = [];
    const issue = (code, field, message, sourceLines = [], owner = 'AP document review') => issues.push({code, field, message, sourceLines, owner});
    if (sourceLines[0].replace(/^\uFEFF/, '') !== 'SYN-INVOICE-TEXT/1') issue('UNSUPPORTED_FORMAT', 'format', 'Use the declared SYN-INVOICE-TEXT/1 first line.', [1]);
    function field(path, raw, sourceLine, convert) {
      let value = null, status = 'extracted';
      try { value = convert(raw.trim()); if (value === null) throw Error('No valid value.'); }
      catch { status = 'invalid'; issue('INVALID_FIELD', path, 'Field has an unsupported or invalid value.', [sourceLine]); }
      const result = {path, raw, normalized: value, sourceLine, status}; fields.push(result);
      if (!seen.has(path)) seen.set(path, []); seen.get(path).push(result);
      return value;
    }
    const ref = value => /^[A-Za-z0-9][A-Za-z0-9_./:-]{0,79}$/.test(value) ? value.toUpperCase() : null;
    for (let index = 1; index < sourceLines.length; index++) {
      const line = sourceLines[index], number = index + 1;
      if (!line.trim() || line.startsWith('#')) continue;
      const item = line.match(/^Line ([1-9]\d?):[ \t]*(.*)$/);
      if (item) {
        const ordinal = Number(item[1]), parts = item[2].split('|');
        if (ordinal > 20 || parts.length !== 3) { issue('INVALID_LINE', 'lines', 'Use Line 1–20: PO | whole quantity | unit price.', [number]); continue; }
        const prefix = 'lines[' + (ordinal - 1) + ']';
        const poLineId = field(prefix + '.poLineId', parts[0], number, ref);
        const quantity = field(prefix + '.quantity', parts[1], number, value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000 ? Number(value) : null);
        const priceCents = field(prefix + '.priceCents', parts[2], number, I.cents);
        lineEntries.push({ordinal, poLineId, quantity, priceCents, sourceLine: number}); continue;
      }
      const header = line.match(/^([^:]+):[ \t]*(.*)$/), path = header && Object.hasOwn(headerLabels, header[1]) ? headerLabels[header[1]] : null;
      if (!path) { issue('UNRECOGNIZED_SOURCE', 'source', 'Unrecognized source line; no field is guessed or silently discarded.', [number]); continue; }
      const convert = path === 'netCents' ? I.cents : path === 'invoiceOn' ? value => isoDay(value) ? value : null
        : path === 'revision' ? value => /^(1|2)$/.test(value) ? Number(value) : null
        : path === 'supersedes' ? value => /^[a-f0-9]{64}$/.test(value) ? value : null
        : path === 'memo' ? value => value.length <= 200 ? value : null
        : path === 'currency' ? value => /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null : ref;
      field(path, header[2], number, convert);
    }
    for (const path of required) if (!seen.has(path)) {
      fields.push({path, raw: null, normalized: null, sourceLine: null, status: 'missing'});
      issue('MISSING_FIELD', path, 'Required source field is absent.');
    }
    for (const [path, entries] of seen) if (entries.length > 1) {
      entries.forEach(entry => entry.status = 'ambiguous');
      issue('AMBIGUOUS_FIELD', path, 'Repeated fields require review, even when values agree.', entries.map(entry => entry.sourceLine));
    }
    const value = path => seen.get(path)?.[0]?.normalized ?? null;
    if (value('entityId') !== companyId) issue('ENTITY_REVIEW', 'entityId', 'Only the declared fictional company is admitted.', seen.get('entityId')?.map(row => row.sourceLine) || [], 'AP entity review');
    if (value('revision') === 2 && !seen.has('supersedes')) issue('MISSING_REVISION_LINK', 'supersedes', 'Revision 2 must name the exact original SHA-256.', [], 'AP revision review');
    if (value('revision') === 1 && seen.has('supersedes')) issue('INVALID_REVISION_LINK', 'supersedes', 'Original invoices cannot claim to supersede another source.', [], 'AP revision review');
    lineEntries.sort((a, b) => a.ordinal - b.ordinal);
    if (!lineEntries.length || lineEntries.some((line, index) => line.ordinal !== index + 1)) issue('LINE_SEQUENCE', 'lines', 'Use unique contiguous line numbers from 1.');
    const lines = lineEntries.map(({poLineId, quantity, priceCents}) => ({poLineId, quantity, priceCents}));
    if (!issues.length) try { D.validLines(lines); } catch (error) { issue('INVALID_AMOUNT', 'lines', error.message); }
    const normalized = issues.length ? null : {entityId: value('entityId'), supplierId: value('supplierId'), number: value('number'), currency: value('currency'),
      revision: value('revision'), invoiceOn: value('invoiceOn'), declaredNetCents: value('netCents'), supersedes: value('supersedes'), lines};
    return {format: 'SUPPORTED-INVOICE-TEXT', version: 1, fields, issues, normalized, sourceLineCount: sourceLines.length};
  }
  async function prepare(sources, sourceJournal, reviews = []) {
    if (!Array.isArray(sources) || sources.length > 20) contract('Use an explicit array of at most 20 source items.');
    if (!Array.isArray(reviews) || reviews.length > 20) contract('Use a bounded review array.');
    let journal = J.restore(J.serialize(sourceJournal));
    if (journal.documents.length) contract('The independent inbox requires an unmodified baseline without invoices.');
    const baseline = J.serialize(journal), records = [], ids = new Set(), orders = new Set(); let totalBytes = 0;
    for (const source of sources) {
      closed(source, ['id', 'name', 'mediaType', 'content', 'receivedAt', 'receivedAtUnknownReason', 'order'], 'Source envelope');
      if (!/^[A-Z][A-Z0-9-]{0,39}$/.test(source.id) || ids.has(source.id)) contract('Source IDs must be unique canonical identities.');
      if (!Number.isSafeInteger(source.order) || source.order < 0 || orders.has(source.order)) contract('Source intake order must be unique and nonnegative.');
      if (typeof source.name !== 'string' || !source.name.trim() || source.name.length > 160 || !['text/plain', 'application/xml'].includes(source.mediaType)) contract('Use a bounded filename and supported text/plain or application/xml media type.');
      if (source.receivedAt === null) {
        if (typeof source.receivedAtUnknownReason !== 'string' || !source.receivedAtUnknownReason.trim() || source.receivedAtUnknownReason.length > 200) contract('Unknown capture dates need an explicit reason.');
      } else if (typeof source.receivedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(source.receivedAt) || !Number.isFinite(Date.parse(source.receivedAt)) || new Date(source.receivedAt).toISOString() !== source.receivedAt || source.receivedAtUnknownReason !== null) contract('Capture timestamps must be canonical UTC or explicitly unknown.');
      const size = bytes(source.content).length; totalBytes += size; if (totalBytes > 524288) contract('Inbox source content exceeds 512 KiB.');
      ids.add(source.id); orders.add(source.order);
      records.push({...clone(source), key: key('source', source.id), byteLength: size, sha256: await fingerprint(source.content), extraction: parse(source.content, source.mediaType),
        disposition: null, owner: null, reasons: [], documentId: null, relatedSourceIds: []});
    }
    records.sort((a, b) => a.order - b.order);
    const hashes = new Map(), roots = new Map(), reviewBySource = new Map();
    for (const review of reviews) {
      closed(review, ['sourceId', 'sha256', 'decision', 'actor', 'reason'], 'Review');
      if (reviewBySource.has(review.sourceId) || !records.some(row => row.id === review.sourceId && row.sha256 === review.sha256)) contract('Review source is missing, changed or repeated.');
      if (review.actor !== J.roles.reviewCorrection || !['approve', 'reject'].includes(review.decision) || typeof review.reason !== 'string' || review.reason.trim().length < 3 || review.reason.length > 80) contract('Independent purchasing review role, decision and 3–80 character reason are required.');
      reviewBySource.set(review.sourceId, clone(review));
    }
    const hold = (row, disposition, owner, reason) => { row.disposition = disposition; row.owner = owner; row.reasons.push(reason); };
    for (const row of records) {
      if (hashes.has(row.sha256)) {
        row.relatedSourceIds = [hashes.get(row.sha256).id];
        hold(row, 'Exact copy', 'AP duplicate review', 'Exact UTF-8 bytes already exist in this inbox. Filename does not establish a new invoice.'); continue;
      }
      hashes.set(row.sha256, row);
      if (!row.extraction.normalized) {
        hold(row, 'Extraction review', row.extraction.issues[0].owner, row.extraction.issues.map(issue => issue.message).join(' ')); continue;
      }
      const n = row.extraction.normalized;
      if (n.revision !== 1) continue;
      row.documentId = 'INBOX-' + row.id;
      if (!roots.has(identity(n))) roots.set(identity(n), []); roots.get(identity(n)).push(row);
      journal = J.dispatch(journal, {id: 'INBOX-IMPORT:' + row.id, type: 'importDocument', actor: J.roles.importDocument,
        payload: {documentId: row.documentId, supplierId: n.supplierId, number: n.number, currency: n.currency,
          declaredNetCents: n.declaredNetCents, lines: clone(n.lines), sourceLabel: (row.mediaType === 'application/xml' ? 'Fictional UBL XML source ' : 'Fictional text source ') + row.id}});
    }
    const revisions = records.filter(row => !row.disposition && row.extraction.normalized?.revision === 2);
    for (const row of revisions) {
      const n = row.extraction.normalized, original = hashes.get(n.supersedes), siblings = revisions.filter(other => other.extraction.normalized.supersedes === n.supersedes);
      if (!original?.documentId || original.extraction.normalized?.revision !== 1 || identity(original.extraction.normalized) !== identity(n) || roots.get(identity(n))?.length !== 1 || siblings.length !== 1 || original.order >= row.order || original.receivedAt && row.receivedAt && original.receivedAt > row.receivedAt) {
        hold(row, 'Revision review', 'AP revision review', 'Original fingerprint/identity must identify one original invoice and one proposed revision.'); continue;
      }
      if (original.mediaType !== 'text/plain' || row.mediaType !== 'text/plain') {
        row.relatedSourceIds = [original.id];
        hold(row, 'Revision review', 'AP revision review', 'The correction adapter admits text-format original/revision pairs only. XML originals and cross-format revisions require separate review.'); continue;
      }
      const prior = original.extraction.normalized;
      row.relatedSourceIds = [original.id]; row.documentId = original.documentId;
      if (n.currency !== prior.currency || n.lines.length !== prior.lines.length || n.lines.some((line, index) => line.poLineId !== prior.lines[index].poLineId || line.quantity !== prior.lines[index].quantity) || n.invoiceOn !== prior.invoiceOn) {
        hold(row, 'Revision review', 'AP revision review', 'This correction control supports price/header-net revisions only. Identity, date, PO and quantity changes require separate review.'); continue;
      }
      journal = J.dispatch(journal, {id: 'INBOX-PROPOSE:' + row.id, type: 'proposeCorrection', actor: J.roles.proposeCorrection,
        payload: {documentId: row.documentId, expectedVersion: 1, pricesCents: n.lines.map(line => line.priceCents), declaredNetCents: n.declaredNetCents,
          reason: 'Supplier-authored fictional text revision linked by original SHA-256.', sourceLabel: 'Fictional text revision ' + row.id}});
      const review = reviewBySource.get(row.id);
      if (review) {
        journal = J.dispatch(journal, {id: 'INBOX-REVIEW:' + row.id, type: 'reviewCorrection', actor: review.actor,
          payload: {documentId: row.documentId, decision: review.decision, reason: review.reason}});
        hold(row, review.decision === 'approve' ? 'Approved revision' : 'Rejected revision', 'No pending review', 'Independent correction decision retained; invoice matching has been rerun.');
        reviewBySource.delete(row.id);
      } else hold(row, 'Correction pending', 'Purchasing approver', 'Proposed supplier prices do not replace the original until independent approval.');
    }
    if (reviewBySource.size) contract('A review does not target an admissible price-revision proposal.');
    const evaluations = D.evaluate(journal);
    for (const row of records) if (!row.disposition) {
      const document = journal.documents.find(document => document.id === row.documentId), evaluation = evaluations.find(result => result.documentId === row.documentId);
      if (!document || !evaluation) contract('Source has no retained document evaluation.');
      hold(row, document.status === 'Ready' ? 'Ready for AP review' : 'Invoice held', evaluation.owner, evaluation.reasons.join(' '));
    }
    const documents = journal.documents.map(document => ({...clone(document), key: key('document', document.id),
      sourceIds: records.filter(row => row.documentId === document.id).map(row => row.id),
      evaluation: clone(evaluations.find(row => row.documentId === document.id))}));
    return {format: 'SIMULATED-DOCUMENT-INBOX', version: 1, fictional: true, scenarioId, companyId,
      sourceItems: records, documents, reviews: clone(reviews),
      counts: {sourceItems: records.length, exactCopies: records.filter(row => row.disposition === 'Exact copy').length,
        extractionReviews: records.filter(row => row.disposition === 'Extraction review').length,
        revisionReviews: records.filter(row => row.disposition === 'Revision review').length,
        pendingCorrections: records.filter(row => row.disposition === 'Correction pending').length,
        documents: documents.length, readyDocuments: documents.filter(document => document.status === 'Ready').length,
        heldDocuments: documents.filter(document => document.status === 'Held').length},
      sources: {baseline: JSON.parse(baseline), proposedCheckpoint: JSON.parse(J.serialize(journal))},
      boundaries: {extraction: 'Executed fixed-format UTF-8 text parsing with source-line evidence and bounded net-only UBL 2.1 XML parsing with namespace-aware paths; no full XSD/Peppol validation, PDF, image, email or OCR extraction.',
        identity: 'Exact byte copies differ from supplier/invoice business duplicates. Source revisions require fingerprint/identity links and independent review.',
        simulation: 'Independent fictional inbox; no saved-journal writes, posting, payment, real ERP or production authorization. Capture times and intake order do not establish invoice aging.'}};
  }
  return {parse, fingerprint, prepare};
});
