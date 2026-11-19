(() => {
  'use strict';
  const $ = id => document.getElementById(id), J = window.Journey, key = 'portfolio-phase2-connected-v1';
  const node = (tag, text) => {const item = document.createElement(tag); if (text !== undefined) item.textContent = text; return item;};
  const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', {style: 'currency', currency, currencyDisplay: 'code'}).format(value / 100);
  let epoch = 0, model = null, entry = new URLSearchParams(location.search).get('invoice'), missingEntry = false;
  function link(text, href) {const item = node('a', text); item.href = href; return item;}
  function pairs(values) {const list = node('dl'); for (const [label, value] of values) list.append(node('dt', label), node('dd', String(value))); return list;}
  function unavailable(message) {model = null; $('invoice-trail-content').hidden = true; $('invoice-trail-download').disabled = true; $('invoice-trail-status').textContent = message;}
  async function refresh() {
    const ticket = ++epoch; unavailable('Validating the selected source invoice…');
    try {
      const raw = sessionStorage.getItem(key), selected = $('journey-document-select').value;
      if (raw === null) throw Error('No saved purchasing progress. Use the document inbox after creating an approved PO.');
      if (J.serialize(window.JourneyUI.getState()) !== J.serialize(J.restore(raw))) throw Error('The displayed workflow and saved purchasing differ. Reload saved progress before following invoice evidence.');
      if (entry) {
        const requested = entry; entry = null;
        if (!window.JourneyUI.getState().documents.some(row => row.id === requested)) {missingEntry = true; throw Error('The linked invoice was not found. No substitute is shown in this trail; explicitly choose a document in the existing workflow controls.');}
        $('journey-document-select').value = requested;
        $('journey-document-select').dispatchEvent(new Event('change', {bubbles: true})); return;
      }
      if (missingEntry) throw Error('The linked invoice was not found. Explicitly select a document before following another invoice trail.');
      if (!selected) throw Error('Stage an original invoice in the document inbox, then select it in purchasing to follow its evidence.');
      const result = await window.InvoiceTrail.build(raw, selected);
      if (ticket !== epoch) return;
      if (sessionStorage.getItem(key) !== raw || J.serialize(window.JourneyUI.getState()) !== result.checkpoint || $('journey-document-select').value !== selected) throw Error('Purchasing or its selection changed during validation. Refresh the invoice trail.');
      model = result; render();
    } catch (failure) {if (ticket === epoch) unavailable(failure.message);}
  }
  function render() {
    const d = model.document, f = model.financial;
    $('invoice-trail-status').textContent = d.supplierId + ' / ' + d.number + ' · ' + d.status + ' · saved revision ' + model.revision + '. Read-only invoice evidence.';
    $('invoice-trail-source').replaceChildren(pairs([['Document', d.id], ['Original source SHA-256', model.receipt.sourceSha256], ['Origin checkpoint SHA-256', model.receipt.contextSha256], ['Original / current net', money(model.receipt.originalImport.declaredNetCents, model.receipt.originalImport.currency) + ' / ' + money(d.declaredNetCents, d.currency)], ['Current retained version', d.currentVersion]]));
    $('invoice-trail-coding').replaceChildren(...model.lines.map(line => {
      const item = node('li'); item.append(node('strong', line.poLineId), node('p', line.account ? line.sourceRequestId + ' → ' + line.workOrder + ' → ' + line.account : 'PO coding unresolved. No expense bucket is inferred.'));
      for (const allocation of line.allocations) item.append(node('p', allocation.costCenter ? allocation.costCenter + ' · current invoice-line allocation ' + money(allocation.netCents, allocation.currency) : 'Unmapped invoice line; owned review required.'));
      if (line.policy) item.append(node('small', 'Approved PO snapshot: ' + line.policy.ruleId + ' v' + line.policy.ruleVersion + ' · ' + line.policy.masterVersion));
      return item;
    }));
    $('invoice-trail-action').replaceChildren(node('strong', model.next.owner), node('p', model.next.message));
    if (model.next.target) $('invoice-trail-action').append(link('Inspect the existing purchasing control →', model.next.target));
    $('invoice-trail-financial').replaceChildren(pairs([['Unposted calculated line value', money(f.pending.calculatedNetCents, f.pending.currency)], ['This invoice · posted USD', money(f.postedNetCents)], ['This invoice · unpaid USD', money(f.unpaidNetCents)], ['This invoice · paid USD', money(f.paidNetCents)]]), link('Open this invoice in the BI report →', model.report.href), node('p', model.report.scope));
    $('invoice-trail-content').hidden = false; $('invoice-trail-download').disabled = false;
  }
  $('invoice-trail-refresh').addEventListener('click', refresh);
  $('invoice-trail-download').addEventListener('click', () => {
    if (!model) return;
    try {
      if (sessionStorage.getItem(key) !== model.savedRaw || J.serialize(window.JourneyUI.getState()) !== model.checkpoint || $('journey-document-select').value !== model.document.id) throw Error('Purchasing changed. Refresh the trail before downloading evidence.');
      const url = URL.createObjectURL(new Blob([JSON.stringify(model, null, 2) + '\n'], {type: 'application/json'})), anchor = link('', url);
      anchor.download = 'fictional-source-invoice-trail.json'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {epoch++; unavailable(failure.message);}
  });
  document.addEventListener('journey:render', refresh);
  $('journey-document-select').addEventListener('change', () => {if (missingEntry) {missingEntry = false; refresh();}});
  window.addEventListener('focus', refresh);
  refresh();
})();
