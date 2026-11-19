(() => {
  'use strict';
  const $ = id => document.getElementById(id), key = 'portfolio-phase2-connected-v1';
  const node = (tag, text) => {const item = document.createElement(tag); if (text !== undefined) item.textContent = text; return item;};
  let epoch = 0, model = null, source = null, scope = null, status = 'all';
  function clear(message) {
    model = null; $('management-source-invoice-content').hidden = true;
    $('management-source-invoice-rows').replaceChildren(); $('management-source-invoice-status').textContent = message;
  }
  function owns(captured, ticket) {
    if (ticket !== epoch || source !== 'current' || sessionStorage.getItem(key) !== captured.savedRaw) throw Error('Saved purchasing changed. Refresh the management overview before following invoice evidence.');
  }
  function guardedLink(label, href, captured, ticket, identity) {
    const link = node('a', label); link.href = href;
    link.setAttribute('aria-label', label.replace('→', '').trim() + ' for ' + identity);
    const guard = event => {try {owns(captured, ticket);} catch (failure) {event.preventDefault(); epoch++; clear(failure.message);}};
    link.addEventListener('click', guard); link.addEventListener('auxclick', guard);
    return link;
  }
  function render() {
    if (!model) return;
    const selected = model.documents.filter(row => status === 'all' || row.status === status), visible = selected.slice(0, 60), captured = model, ticket = epoch;
    $('management-source-invoice-count').textContent = model.documents.length + ' source-receipted documents across all states. Showing ' + visible.length + ' of ' + selected.length + ' for this status, newest imports first. This list is independent of the hold-owner filter and financial measure.';
    $('management-source-invoice-rows').replaceChildren(...visible.map(document => {
      const row = node('tr'), identity = node('td'), state = node('td'), destinations = node('td');
      identity.append(node('strong', document.supplierId + ' / ' + document.number), node('small', document.documentId));
      state.append(node('strong', document.status === 'Ready' ? 'Ready for AP review' : document.status), node('small', 'Current version ' + document.currentVersion + ' · import revision ' + document.importedRevision));
      const identityLabel = document.supplierId + ' / ' + document.number;
      destinations.append(guardedLink('Open purchasing trail →', document.purchasingHref, captured, ticket, identityLabel), node('br'), guardedLink('Open BI document detail →', document.reportHref, captured, ticket, identityLabel));
      row.append(identity, state, node('td', document.sourceSha256.slice(0, 16) + '…'), destinations); return row;
    }));
    if (!visible.length) {const row = node('tr'), cell = node('td', 'No retained source invoices match this status.'); cell.colSpan = 4; row.append(cell); $('management-source-invoice-rows').append(row);}
    $('management-source-invoice-status').textContent = 'Captured saved purchasing revision ' + model.revision + '. Read-only source-invoice discovery. Original bytes remain in the inbox evidence download.';
    $('management-source-invoice-content').hidden = false;
  }
  async function update(context) {
    const ticket = ++epoch; source = context.source;
    const nextScope = JSON.stringify([context.source, context.checkpoint]);
    if (nextScope !== scope) {status = 'all'; $('management-source-invoice-filter').value = 'all';} scope = nextScope;
    if (source !== 'current') {clear('Guided snapshot: its example records are separate from saved source invoices. Choose My saved journals above to inspect invoices you staged.'); return;}
    if (context.status !== 'available' || context.savedRaw === null) {clear('Saved purchasing is unavailable. No source-invoice count or guided example is substituted. Available management sections remain inspectable.'); return;}
    clear('Validating retained source fingerprints against this management snapshot…');
    try {
      const result = await window.ManagementSourceInvoices.build(context);
      if (ticket !== epoch) return;
      owns(result, ticket); model = result; render();
    } catch (failure) {if (ticket === epoch) clear('Source-invoice evidence unavailable: ' + failure.message);}
  }
  $('management-source-invoice-filter').addEventListener('change', () => {
    if (!model) return;
    try {owns(model, epoch); status = $('management-source-invoice-filter').value; render();} catch (failure) {epoch++; clear(failure.message);}
  });
  function check() {if (!model) return; try {owns(model, epoch);} catch (failure) {epoch++; clear(failure.message);}}
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) check();});
  window.ManagementSourceInvoiceView = Object.freeze({update});
})();
