(() => {
  'use strict';
  const $ = id => document.getElementById(id), Inbox = window.DocumentInbox, S = window.InboxSamples;
  let sources = [], reviews = [], model = null, selected = null, busy = false;
  const purchasingKey = 'portfolio-phase2-connected-v1';
  let mode = 'guided', captured = null, epoch = 0;
  let ownedRaw = null, committed = null, capturedReceipts = [];
  const node = (tag, text, className) => {const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;};
  const money = (value, currency) => new Intl.NumberFormat('en-US', {style: 'currency', currency, currencyDisplay: 'code'}).format(value / 100);
  function button(label, action, className = 'inbox-record') {const item = node('button', label, className); item.type = 'button'; item.addEventListener('click', () => {if (!busy) action();}); return item;}
  function lines(main, detail) {const item = node('div'); item.append(main instanceof Node ? main : node('span', main), node('small', detail)); return item;}
  function rows(target, data, cells, columns) {
    target.replaceChildren();
    if (!data.length) {const row = node('tr'), cell = node('td', 'No records match this selection.'); cell.colSpan = columns; row.append(cell); target.append(row); return;}
    for (const record of data) {const row = node('tr'); for (const value of cells(record)) {const cell = node('td'); if (value instanceof Node) cell.append(value); else cell.textContent = value; row.append(cell);} target.append(row);}
  }
  function focus(id) {$(id).focus(); $(id).scrollIntoView({block: 'nearest'});}
  function pair(list, label, value) {list.append(node('dt', label), node('dd', value));}
  function error(message) {$('inbox-error').textContent = message; $('inbox-error').hidden = false;}
  function options(id, values, first) {const prior = $(id).value; $(id).replaceChildren(new Option(first, 'all')); for (const value of values) $(id).add(new Option(value, value)); if (values.includes(prior)) $(id).value = prior;}
  function assertOwned(context = captured) {
    const expected = context === captured ? ownedRaw : context?.savedRaw;
    if (mode === 'current' && (!context || sessionStorage.getItem(purchasingKey) !== expected)) throw Error('Saved purchasing changed, was removed or is unavailable. Capture it again before previewing, staging or downloading evidence.');
  }
  function clearTemporary() {
    epoch++; busy = false; model = null; sources = []; reviews = []; selected = null; ownedRaw = null; committed = null; capturedReceipts = [];
    $('inbox-results').hidden = true; $('inbox-detail').hidden = true; $('inbox-download').disabled = true;
    $('inbox-files').value = ''; $('inbox-results').setAttribute('aria-busy', 'false');
    for (const id of ['inbox-disposition', 'inbox-owner', 'inbox-document-state']) $(id).value = 'all';
    updateReview(); updateStage();
  }
  function invalidateCurrent(message) {
    clearTemporary(); captured = null; $('inbox-captured').hidden = true;
    $('inbox-context-status').textContent = message; $('inbox-status').textContent = 'Capture saved purchasing again to continue.';
    $('inbox-extract').disabled = true;
  }
  function checkCurrent() {
    if (mode !== 'current' || !captured) return;
    try {assertOwned();} catch (failure) {invalidateCurrent(failure.message); error(failure.message);}
  }
  function guided(load, message) {
    clearTemporary(); mode = 'guided'; captured = null; $('inbox-captured').hidden = true; $('inbox-extract').disabled = false;
    $('inbox-context-status').textContent = 'Using the independent guided inbox. No saved purchasing source has been selected.';
    $('inbox-mode-boundary').textContent = 'Independent fictional inbox · SYN-DOC-INBOX-1 / SYN-CO-01. Explicit correction decisions remain separate from posting and payment. No saved-journal changes.';
    calculate(load, [], message);
  }
  async function capturePurchasing() {
    clearTemporary(); mode = 'current'; captured = null; $('inbox-captured').hidden = true; $('inbox-extract').disabled = true;
    $('inbox-error').hidden = true; const ticket = epoch;
    $('inbox-context-status').textContent = 'Validating and fingerprinting saved purchasing…';
    $('inbox-mode-boundary').textContent = 'Captured purchasing · extraction is read-only. AP can explicitly stage validated originals into the same still-owned journal. Posting and payment remain separate. Switching contexts clears temporary files and review decisions.';
    try {
      const raw = sessionStorage.getItem(purchasingKey), context = await window.InboxContext.capture(raw), receipts = await Inbox.receipts(raw);
      if (ticket !== epoch) return;
      assertOwned(context); captured = context; ownedRaw = raw; capturedReceipts = receipts; renderReceipts();
      const list = node('dl');
      for (const [label, value] of [['Revision', context.revision], ['Exact saved-value SHA-256', context.savedValueSha256], ['Canonical checkpoint SHA-256', context.checkpointSha256], ['Policy snapshot SHA-256', context.policySnapshotSha256], ['Existing invoice documents', context.existingDocumentIds.join(', ') || 'None'], ['Company identity', 'Not established; SYN-CO-01 is a fictional extraction-profile label.']]) pair(list, label, String(value));
      $('inbox-context-meta').replaceChildren(list);
      rows($('inbox-context-pos'), context.approvedPOLines, line => [lines(line.poLineId, line.sourceRequestId), lines(line.supplierId, line.workOrder + ' · ' + line.description), lines(line.account, line.allocations.map(row => row.costCenter + ' ' + row.basisPoints + ' bp').join(', ')), line.quantity + ' / ' + line.received], 4);
      $('inbox-context-po').replaceChildren(...context.approvedPOLines.map(line => new Option(line.poLineId + ' · ' + line.description, line.poLineId)));
      $('inbox-captured').hidden = false; $('inbox-context-example').disabled = !context.approvedPOLines.length;
      $('inbox-extract').disabled = !context.approvedPOLines.length;
      $('inbox-context-status').textContent = 'Captured revision ' + context.revision + ': ' + context.approvedPOLines.length + ' approved PO lines; ' + context.existingDocumentIds.length + ' existing invoice documents. Read-only snapshot.';
      $('inbox-status').textContent = context.approvedPOLines.length ? 'Choose a PO sample or supported local files to preview against this captured context.' : 'No approved PO lines. Approve a request in connected purchasing, then capture again. No substitute example is used.';
    } catch (failure) {if (ticket === epoch) {invalidateCurrent('Purchasing capture unavailable. ' + failure.message); error(failure.message);}}
  }
  async function calculate(nextSources, nextReviews, message, failureLabel = 'The attempted change was rejected: ') {
    if (busy) return;
    if (committed) {error('Capture purchasing again before creating another preview. Download evidence to retain the original files.'); return;}
    const ticket = epoch, sourceMode = mode, context = captured;
    busy = true; $('inbox-error').hidden = true; $('inbox-results').hidden = true; $('inbox-results').setAttribute('aria-busy', 'true'); $('inbox-download').disabled = true;
    $('inbox-status').textContent = 'Hashing exact source bytes, extracting fields and replaying invoice controls…';
    try {
      if (typeof nextSources === 'function') nextSources = await nextSources();
      if (ticket !== epoch) return;
      assertOwned(context);
      const result = sourceMode === 'current' ? await Inbox.prepareCurrent(nextSources, context.savedRaw) : await Inbox.prepare(nextSources, S.journal(), nextReviews);
      if (ticket !== epoch) return;
      assertOwned(context);
      if (nextSources !== sources) {
        selected = null; $('inbox-disposition').value = 'all'; $('inbox-owner').value = 'all'; $('inbox-document-state').value = 'all';
      }
      sources = nextSources; reviews = nextReviews; model = result; render();
      $('inbox-status').textContent = message + ' ' + model.counts.sourceItems + ' source items; ' + model.counts.documents + (sourceMode === 'current' ? ' new hypothetical invoice documents.' : ' distinct staged invoice documents.') + ' No financial posting or saved-journal change.';
    } catch (failure) {
      if (ticket !== epoch) return;
      if (sourceMode === 'current') {try {assertOwned(context);} catch (ownership) {invalidateCurrent(ownership.message); error(ownership.message); return;}}
      error(failureLabel + failure.message + (model ? ' The previous validated temporary inbox remains.' : ' No substitute figures are shown.'));
      $('inbox-status').textContent = model ? 'Showing the previous validated temporary inbox.' : 'Inbox unavailable.';
      if (model) render();
    } finally {if (ticket === epoch) {busy = false; $('inbox-results').setAttribute('aria-busy', 'false'); $('inbox-download').disabled = !model; updateReview(); updateStage();}}
  }
  function renderReceipts() {
    $('inbox-receipt-detail').hidden = true;
    $('inbox-receipts-summary').textContent = capturedReceipts.length + ' fingerprint receipts retained in purchasing. Reattach an original file to verify its bytes and extracted fields.';
    $('inbox-receipts-download').disabled = !capturedReceipts.length;
    rows($('inbox-receipts'), capturedReceipts, receipt => [button(receipt.originalImport.number, () => {
      const list = node('dl');
      for (const [label, value] of [['Document', receipt.documentId], ['Current status', receipt.currentStatus], ['Exact source SHA-256', receipt.sourceSha256], ['Origin checkpoint SHA-256', receipt.contextSha256], ['Imported revision', receipt.importedRevision], ['Retention boundary', receipt.retention]]) pair(list, label, String(value));
      $('inbox-receipt-detail').replaceChildren(node('h3', 'Retained fingerprint receipt'), list, node('pre', JSON.stringify(receipt.originalImport, null, 2)));
      $('inbox-receipt-detail').hidden = false; focus('inbox-receipt-detail');
    }), lines(receipt.currentStatus, receipt.originalImport.supplierId), receipt.sourceSha256.slice(0, 16) + '…'], 3);
  }
  function updateStage() {
    $('inbox-stage').hidden = mode !== 'current' || !model;
    $('inbox-existing-heading').textContent = committed ? 'Retained preview before staging.' : 'Separate the baseline from the preview.';
    $('inbox-existing-boundary').textContent = committed ? 'This section retains the pre-stage replay. The explicit AP stage saved its original invoices; capture purchasing again for a refreshed view. Counts below describe the original preview, excluding its existing baseline documents.' : 'These effects exist only in this page’s replay. The saved journal is unchanged. Counts below cover new hypothetical documents; existing documents are excluded.';
    const blocked = !model || model.sourceItems.some(row => !['Ready for AP review', 'Invoice held', 'Exact copy', 'Already staged'].includes(row.disposition));
    $('inbox-stage-button').disabled = busy || !!committed || blocked || $('inbox-stage-role').value !== 'AP' || !(model?.documents.length || model?.counts.alreadyStagedSources);
    $('inbox-stage-summary').textContent = committed ? (committed.alreadyStaged ? 'Existing imports verified; no new write was needed.' : committed.newDocuments + ' original invoices saved into purchasing.') + ' The pre-stage preview remains below. Capture again for another selection; download evidence to retain original bytes.'
      : model ? model.counts.documents + ' new originals: ' + model.counts.readyDocuments + ' ready for AP review; ' + model.counts.heldDocuments + ' held. ' + (model.counts.alreadyStagedSources || 0) + ' source items already staged.' + (blocked ? ' Extraction or revision-review items block this selection.' : ' Staging preserves these outcomes and does not post or pay.') : '';
  }
  async function stageCurrent() {
    if (busy || !model || mode !== 'current' || committed) return;
    const ticket = epoch; let wrote = false;
    try {
      assertOwned(); busy = true; updateStage(); $('inbox-error').hidden = true; $('inbox-download').disabled = true;
      const result = await Inbox.stage(model, ownedRaw, $('inbox-stage-role').value);
      if (ticket !== epoch) return;
      assertOwned();
      if (!result.alreadyStaged) {sessionStorage.setItem(purchasingKey, result.checkpoint); wrote = true;}
      if (sessionStorage.getItem(purchasingKey) !== result.checkpoint) throw Error('Saved purchasing could not be verified after staging. Inspect purchasing before retrying.');
      ownedRaw = result.checkpoint; committed = result; capturedReceipts = result.journalReceipts; renderReceipts();
      $('inbox-context-example').disabled = $('inbox-extract').disabled = true;
      $('inbox-context-status').textContent = 'Saved purchasing verified at revision ' + window.Journey.restore(result.checkpoint).revision + '. Captured pre-stage evidence remains inspectable; capture again to refresh.';
      $('inbox-status').textContent = result.alreadyStaged ? 'Fingerprint receipts verified. No duplicate import or journal write.' : result.newDocuments + ' original invoices staged and saved. Review holds and post eligible documents separately in connected purchasing. No payment was made.';
    } catch (failure) {
      if (ticket !== epoch) return;
      if (wrote) invalidateCurrent('Save verification is incomplete. Inspect purchasing before retrying.');
      else {try {assertOwned();} catch (ownership) {invalidateCurrent(ownership.message);}}
      error('Staging held: ' + failure.message + (wrote ? ' A write occurred; its final state was not confirmed.' : ' No successful save was confirmed.'));
    } finally {if (ticket === epoch) {busy = false; $('inbox-download').disabled = !model; updateStage();}}
  }
  function sourceFilter(disposition) {
    $('inbox-owner').value = 'all'; $('inbox-disposition').value = disposition; selected = null; renderQueue();
    $('inbox-detail').hidden = true; focus('inbox-queue-heading');
  }
  function metric(id, title, count, meaning, action) {
    const item = button('', action, 'inbox-metric'); item.dataset.inboxMeasure = id;
    item.append(node('span', title), node('strong', String(count)), node('small', meaning + ' · Inspect →')); return item;
  }
  function render() {
    const c = model.counts;
    $('inbox-existing').hidden = mode !== 'current';
    if (mode === 'current') {
      $('inbox-existing-summary').textContent = model.baselineDocuments.length + ' existing documents retained in matching; ' + model.affectedExisting.length + ' would change status, queue, owner or reasons. New hypothetical documents: ' + c.documents + '.';
      rows($('inbox-existing-effects'), model.affectedExisting, row => [row.documentId, lines(row.before.status, row.before.owner || 'No pending owner'), lines(row.after.status, row.after.owner || 'No pending owner'), row.after.reasons.join(' ')], 4);
    }
    $('inbox-metrics').replaceChildren(
      metric('sources', 'Source file items', c.sourceItems, 'Files, including revisions and copies', () => sourceFilter('all')),
      metric('extraction', 'Extraction review', c.extractionReviews, 'Missing, invalid or ambiguous fields', () => sourceFilter('Extraction review')),
      metric('copies', 'Exact byte copies', c.exactCopies, 'No second invoice created', () => sourceFilter('Exact copy')),
      metric('documents', mode === 'current' ? 'New hypothetical invoices' : 'Distinct invoice documents', c.documents, 'Original invoices, independent of file count', () => { $('inbox-document-state').value = 'all'; renderDocuments(); focus('inbox-documents-heading'); }),
      metric('ready', 'Ready for AP review', c.readyDocuments, 'Matching passed; unposted documents', () => { $('inbox-document-state').value = 'Ready'; renderDocuments(); focus('inbox-documents-heading'); }),
      metric('corrections', 'Corrections awaiting approval', c.pendingCorrections, 'Original values still active', () => sourceFilter('Correction pending'))
    );
    options('inbox-disposition', ['Ready for AP review', 'Invoice held', 'Already staged', 'Exact copy', 'Extraction review', 'Revision review', 'Correction pending', 'Approved revision', 'Rejected revision'], 'All dispositions');
    options('inbox-owner', [...new Set(model.sourceItems.map(row => row.owner))].sort(), 'All owners');
    renderQueue(); renderDocuments(); $('inbox-results').hidden = false; updateStage();
    if (selected && model.sourceItems.some(row => row.id === selected)) inspect(selected, false); else {$('inbox-detail').hidden = true; selected = null;}
  }
  function renderQueue() {
    if (!model) return;
    const disposition = $('inbox-disposition').value, owner = $('inbox-owner').value;
    const filtered = model.sourceItems.filter(row => (disposition === 'all' || row.disposition === disposition) && (owner === 'all' || row.owner === owner));
    $('inbox-filter-summary').textContent = 'Showing ' + filtered.length + ' of ' + model.counts.sourceItems + ' source items.';
    rows($('inbox-items'), filtered, row => [
      lines(button(row.name, () => inspect(row.id)), row.id + ' · SHA-256 ' + row.sha256.slice(0, 12) + '…'),
      lines(row.disposition, row.owner),
      lines(row.extraction.normalized ? row.extraction.normalized.supplierId + ' / ' + row.extraction.normalized.number : 'Fields require review', row.reasons.join(' '))
    ], 3);
  }
  function renderDocuments() {
    if (!model) return;
    const state = $('inbox-document-state').value, docs = model.documents.filter(doc => state === 'all' || doc.status === state);
    $('inbox-document-summary').textContent = model.counts.readyDocuments + ' ready for AP review; ' + model.counts.heldDocuments + ' held. Showing ' + docs.length + ' of ' + model.counts.documents + ' distinct documents.';
    rows($('inbox-documents'), docs, doc => {
      const files = node('div'); files.append(node('span', doc.header.supplierId + ' / ' + doc.header.number));
      for (const id of doc.sourceIds) files.append(button(id, () => inspect(id)));
      const detail = node('div'); detail.append(node('p', doc.evaluation.reasons.join(' ')));
      for (const line of doc.evaluation.lines) detail.append(node('small', line.poLineId + ' · ' + (line.coding ? line.coding.account + ' · ' + line.coding.allocations.map(row => row.costCenter + ' ' + row.basisPoints + ' bp').join(', ') : 'No approved PO coding resolved')));
      return [files, lines(doc.status === 'Ready' ? 'Ready for AP review' : 'Held', doc.evaluation.owner),
        lines(money(doc.header.netCents, doc.header.currency), doc.versions.length + ' retained invoice version(s)' + (doc.pendingCorrection ? ' · proposed ' + money(doc.pendingCorrection.declaredNetCents, doc.header.currency) : '')), detail];
    }, 4);
  }
  function locate(line) {
    document.querySelectorAll('.inbox-source-line.is-selected').forEach(item => item.classList.remove('is-selected'));
    const item = $('inbox-source-line-' + line); if (item) {item.classList.add('is-selected'); item.focus(); item.scrollIntoView({block: 'nearest', inline: 'nearest'});}
  }
  function locateXML(row, field) {
    const source = window.UBLInvoice.sourceFragment(row.content, field.sourcePath);
    $('inbox-xml-path').textContent = source.path + (field.sourceAttribute ? ' / @' + field.sourceAttribute : '');
    $('inbox-xml-fragment').textContent = source.fragment;
    $('inbox-xml-source').hidden = false; focus('inbox-xml-heading');
  }
  function inspect(id, move = true) {
    const row = model.sourceItems.find(row => row.id === id); if (!row) return;
    selected = id; $('inbox-detail').hidden = false;
    $('inbox-xml-source').hidden = true;
    $('inbox-detail-heading').textContent = 'Source ' + row.id + ' · ' + row.name;
    $('inbox-selected-summary').textContent = row.disposition + ' · ' + row.owner + '. ' + row.reasons.join(' ');
    const list = node('dl');
    pair(list, 'Qualified source identity', row.key); pair(list, 'SHA-256 · exact UTF-8 bytes', row.sha256);
    pair(list, 'Byte length / media type', row.byteLength + ' / ' + row.mediaType);
    pair(list, 'Source capture · UTC', row.receivedAt || 'Unknown — ' + row.receivedAtUnknownReason);
    pair(list, 'Declared intake order', String(row.order) + ' (not elapsed time)');
    pair(list, 'Linked invoice document', row.documentId || 'No invoice document created from this source item');
    $('inbox-source-meta').replaceChildren(list);
    if (row.relatedSourceIds.length) {
      const related = node('div'); related.append(node('p', 'Related retained source items:'));
      for (const relatedId of row.relatedSourceIds) related.append(button(relatedId, () => inspect(relatedId)));
      $('inbox-source-meta').append(related);
    }
    $('inbox-source-lines').replaceChildren(...row.content.split(/\r\n|\n/).map((line, index) => {
      const item = node('span', String(index + 1).padStart(2, ' ') + '  ' + line, 'inbox-source-line'); item.id = 'inbox-source-line-' + (index + 1); item.tabIndex = -1; return item;
    }));
    $('inbox-issues').replaceChildren(...row.extraction.issues.map(issue => {
      const item = node('div'); item.append(node('p', issue.code + ' · ' + issue.field + ': ' + issue.message + ' Owner: ' + issue.owner + '.'));
      for (const [index, path] of (issue.sourcePaths || []).entries()) item.append(button('Locate XML occurrence ' + (index + 1) + ' · ' + issue.field, () => locateXML(row, {sourcePath: path})));
      return item;
    }));
    if (!row.extraction.issues.length) $('inbox-issues').append(node('p', 'Required fields extracted. Invoice matching and independent decisions remain separate.', 'muted'));
    rows($('inbox-fields'), row.extraction.fields, field => [
      lines(field.sourceLine ? button(field.path, () => locate(field.sourceLine)) : field.sourcePath ? button(field.path, () => locateXML(row, field)) : node('span', field.path), field.sourceLine ? 'Source line ' + field.sourceLine : field.sourcePath ? 'XML element path' + (field.sourceAttribute ? ' · @' + field.sourceAttribute : '') : field.explanation || 'No unique source location'),
      field.raw === null ? field.status === 'derived' ? 'Adapter rule' : field.status === 'ambiguous' ? 'Ambiguous — inspect repeated elements' : 'Missing' : field.raw,
      lines(field.normalized === null ? 'Unknown / invalid' : String(field.normalized) + (field.path.includes('Cents') ? ' cents' : ''), field.status)
    ], 3);
    updateReview(); if (move) focus('inbox-detail-heading');
  }
  function updateReview() {
    const row = model?.sourceItems.find(row => row.id === selected), pending = row?.disposition === 'Correction pending';
    $('inbox-review-context').textContent = mode === 'current' ? 'Captured purchasing previews admit original invoices only. Supplier revisions require separate review; this preview cannot change existing invoice versions.' : pending ? 'Proposal ' + row.id + ' is bound to SHA-256 ' + row.sha256 + '. ' + row.reasons.join(' ') : 'Select a source item with Correction pending to inspect and independently approve or reject its proposed prices. Decisions already made remain in the evidence download.';
    $('inbox-approve').disabled = $('inbox-reject').disabled = busy || !pending || $('inbox-role').value !== 'Purchasing approver';
  }
  async function decide(decision) {
    const row = model?.sourceItems.find(row => row.id === selected);
    if (busy || row?.disposition !== 'Correction pending') return;
    if ($('inbox-role').value !== 'Purchasing approver') {error('Switch to the independent Purchasing approver role.'); return;}
    const item = {sourceId: row.id, sha256: row.sha256, actor: $('inbox-role').value, decision, reason: $('inbox-review-reason').value};
    await calculate(sources, [...reviews, item], 'Supplier revision decision retained; matching rerun.');
  }
  function save(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], {type})), link = node('a'); link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('inbox-example').addEventListener('click', () => guided(() => S.sources(), 'Fictional inbox loaded.'));
  $('inbox-ubl-example').addEventListener('click', () => guided(() => window.UBLInvoiceSamples.sources(), 'Fictional UBL XML inbox loaded.'));
  $('inbox-capture').addEventListener('click', capturePurchasing);
  $('inbox-context-example').addEventListener('click', () => calculate(() => window.InboxContext.example(captured, $('inbox-context-po').value), [], 'Captured PO sample previewed.'));
  $('inbox-stage-button').addEventListener('click', stageCurrent);
  $('inbox-stage-role').addEventListener('change', updateStage);
  $('inbox-receipts-download').addEventListener('click', () => {try {assertOwned(); if (!busy) save(JSON.stringify({format: 'SIMULATED-INBOX-FINGERPRINT-RECEIPTS', version: 1, receipts: capturedReceipts}, null, 2) + '\n', 'fictional-invoice-fingerprint-receipts.json', 'application/json');} catch (failure) {invalidateCurrent(failure.message); error(failure.message);}});
  window.addEventListener('focus', checkCurrent);
  window.addEventListener('storage', event => {if (event.storageArea === sessionStorage && (event.key === purchasingKey || event.key === null)) checkCurrent();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden) checkCurrent();});
  $('inbox-extract').addEventListener('click', async () => {
    if (busy) return;
    try {
      const files = [...$('inbox-files').files];
      const supported = file => /\.txt$/i.test(file.name) ? !file.type || file.type === 'text/plain' : /\.xml$/i.test(file.name) && (!file.type || ['application/xml', 'text/xml'].includes(file.type));
      if (!files.length || files.length > 20 || files.some(file => !supported(file) || file.size < 1 || file.size > 32768) || files.reduce((sum, file) => sum + file.size, 0) > 524288)
        throw Error('Choose 1–20 nonempty UTF-8 .txt or .xml files, at most 32 KiB each and 512 KiB total. PDF, image and email extraction is not supported.');
      await calculate(async () => {
        const next = [];
        for (const [index, file] of files.entries()) next.push({id: 'UPLOAD-' + String(index + 1).padStart(3, '0'), name: file.name, mediaType: /\.xml$/i.test(file.name) ? 'application/xml' : 'text/plain',
          content: new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer()), receivedAt: null,
          receivedAtUnknownReason: 'Local file has no admitted inbox capture timestamp.', order: index});
        return next;
      }, [], 'Supported local files extracted.', 'File selection rejected: ');
    } catch (failure) {error('File selection rejected: ' + failure.message + ' The existing temporary inbox remains.');}
  });
  for (const id of ['inbox-disposition', 'inbox-owner']) $(id).addEventListener('change', () => {selected = null; $('inbox-detail').hidden = true; renderQueue();});
  $('inbox-document-state').addEventListener('change', renderDocuments); $('inbox-role').addEventListener('change', updateReview);
  $('inbox-approve').addEventListener('click', () => decide('approve')); $('inbox-reject').addEventListener('click', () => decide('reject'));
  $('inbox-source-download').addEventListener('click', () => {try {assertOwned(); const row = model?.sourceItems.find(row => row.id === selected); if (row && !busy) save(row.content, row.name, row.mediaType + ';charset=utf-8');} catch (failure) {invalidateCurrent(failure.message); error(failure.message);}});
  $('inbox-download').addEventListener('click', () => {
    if (!model || busy) return;
    try {assertOwned();} catch (failure) {invalidateCurrent(failure.message); error(failure.message); return;}
    save(JSON.stringify({...model, ...(committed ? {staging: committed} : {}), viewSelection: {sourceId: selected, sourceDisposition: $('inbox-disposition').value, owner: $('inbox-owner').value, documentState: $('inbox-document-state').value}}, null, 2) + '\n', 'fictional-document-inbox-evidence.json', 'application/json');
  });
  calculate(() => S.sources(), [], 'Fictional inbox loaded.');
})();
