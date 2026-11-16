/* Read-only visitor view. BusinessTime owns dates, policy checks and every financial amount. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = (cents, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency', currency, currencyDisplay: 'code'
  }).format(cents / 100);
  const presets = {
    all: ['2026-08-18', '2026-11-15'], aug: ['2026-08-18', '2026-08-31'],
    sep: ['2026-09-01', '2026-09-30'], oct: ['2026-10-01', '2026-10-31'],
    nov: ['2026-11-01', '2026-11-15']
  };
  let worker, request = 0, bundle = null, selection = {kind: 'posted', record: null};
  const node = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  function button(label, action, className = 'trend-record') {
    const item = node('button', label, className);
    item.type = 'button'; item.addEventListener('click', action); return item;
  }
  function empty(target, message) { target.replaceChildren(node('p', message, 'muted')); }
  function focus(id) { $(id).focus(); $(id).scrollIntoView({block: 'nearest'}); }
  function pair(list, label, value) { list.append(node('dt', label), node('dd', value)); }
  function table(target, label, headings, records, cells) {
    const wrap = node('div', undefined, 'table-wrap');
    wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', label);
    const grid = node('table'), head = node('thead'), row = node('tr'), body = node('tbody');
    for (const title of headings) { const th = node('th', title); th.scope = 'col'; row.append(th); }
    head.append(row); grid.append(head, body); wrap.append(grid);
    fillRows(body, records, cells, headings.length); target.replaceChildren(wrap);
  }
  function fillRows(target, records, cells, columns) {
    target.replaceChildren();
    if (!records.length) {
      const row = node('tr'), cell = node('td', 'No records match this selection.');
      cell.colSpan = columns; row.append(cell); target.append(row); return;
    }
    for (const record of records) {
      const row = node('tr');
      for (const value of cells(record)) {
        const cell = node('td');
        if (value instanceof Node) cell.append(value); else cell.textContent = value;
        row.append(cell);
      }
      target.append(row);
    }
  }
  function twoLines(main, secondary) {
    const box = node('div'); box.append(main instanceof Node ? main : node('span', main), node('small', secondary)); return box;
  }
  function unavailable(message) {
    bundle = null; $('trend-results').hidden = true; $('trend-download').disabled = true;
    $('trend-results').setAttribute('aria-busy', 'false');
    $('trend-status').textContent = 'The selected view is unavailable; no substitute figures are shown.';
    $('trend-error').textContent = message; $('trend-error').hidden = false;
  }
  function queryDates(from, asOf, updateUrl = true) {
    $('trend-error').hidden = true; $('trend-results').hidden = true;
    $('trend-results').setAttribute('aria-busy', 'true'); $('trend-download').disabled = true;
    $('trend-status').textContent = 'Validating source history and calculating ' + from + ' through ' + asOf + '…';
    const id = ++request; selection = {kind: 'posted', record: null};
    if (!startWorker()) return;
    worker.postMessage({id, query: {from, asOf}});
    if (updateUrl) {
      const url = new URL(location.href); url.search = new URLSearchParams({from, asOf}).toString();
      history.replaceState(null, '', url);
    }
  }
  function applyPeriod(from, asOf) {
    $('trend-from').value = from; $('trend-cutoff').value = asOf;
    $('trend-preset').value = Object.keys(presets).find(key => presets[key][0] === from && presets[key][1] === asOf) || 'custom';
    queryDates(from, asOf);
  }
  function metric(kind, title, amount, meaning) {
    const item = button('', () => inspect(kind), 'trend-metric');
    item.dataset.measure = kind; item.setAttribute('aria-pressed', selection.kind === kind ? 'true' : 'false');
    item.append(node('span', title), node('strong', money(amount)), node('small', meaning + ' · Inspect sources →'));
    return item;
  }
  function render() {
    const m = bundle.model, f = m.financial;
    $('trend-scope').textContent = m.period.from + '–' + m.period.asOf + ' · ' + m.scenarioId;
    $('trend-metrics').replaceChildren(
      metric('posted', 'Posted in period', f.flows.postedCents, 'Transaction flow'),
      metric('paid', 'Paid in period', f.flows.paidCents, 'Transaction flow'),
      metric('unpaid', 'Unpaid at cutoff', f.closing.unpaid, 'Balance on ' + m.period.asOf),
      metric('open', 'Open PO commitment', f.closing.openCommitment, 'Balance on ' + m.period.asOf)
    );
    const roll = f.unpaidRollforward, list = $('trend-rollforward'); list.replaceChildren();
    pair(list, 'Opening unpaid · before ' + m.period.from, money(roll.openingCents));
    pair(list, '+ Posted in period', money(roll.postedCents));
    pair(list, '− Paid in period', money(roll.paidCents));
    pair(list, '= Closing unpaid · ' + m.period.asOf, money(roll.closingCents));
    $('trend-due').replaceChildren();
    for (const [state, label, cents] of [
      ['overdue', 'Known overdue', f.unpaidDuePartition.overdueCents],
      ['not-yet-due', 'Known not yet due', f.unpaidDuePartition.notYetDueCents],
      ['unknown-due-date', 'Unknown due date', f.unpaidDuePartition.unknownDueCents]
    ]) {
      const item = button('', () => inspect('due', state)); item.dataset.due = state;
      item.append(node('span', label), node('strong', money(cents))); $('trend-due').append(item);
    }
    renderTrends();
    const priorOwner = $('trend-owner').value;
    $('trend-owner').replaceChildren(new Option('All owners', 'all'));
    for (const owner of m.heldAging.owners) $('trend-owner').add(new Option(owner.owner + ' · ' + owner.documentCount, owner.owner));
    if ([...$('trend-owner').options].some(option => option.value === priorOwner)) $('trend-owner').value = priorOwner;
    $('trend-held-summary').textContent = m.heldAging.documentCount + ' held documents · ' + m.heldAging.knownAgeCount + ' known receipt ages · ' + m.heldAging.unknownAgeCount + ' unknown';
    renderHeld();
    const coverage = m.coding.coverage;
    $('trend-coding').textContent = 'Policy-covered approved PO lines: ' + coverage.codedLines + ' of ' + coverage.poLines + '. Held requisitions: ' + m.coding.heldRequests.length + '.';
    $('trend-coding-holds').replaceChildren();
    for (const held of m.coding.heldRequests) {
      const details = node('details'); details.append(node('summary', held.id + ' · Finance policy owner'), node('p', JSON.stringify(held.result)));
      $('trend-coding-holds').append(details);
    }
    $('trend-work-summary').textContent = (m.operations.observationsAvailable ? 'November 15 observations available.' : 'November 15 observations are outside this cutoff.') +
      ' Reviewed cases: ' + m.operations.reviewedCases + '. Handoffs: ' + m.operations.handoffs.length + '. Retained execution versions: ' + m.operations.workRecords.length + '.';
    $('trend-work').replaceChildren();
    for (const record of m.operations.workRecords) {
      const details = node('details');
      details.append(node('summary', record.id + ' · ' + (record.isLatest ? 'Latest' : 'Earlier version') + ' · ' + (record.decision || 'Awaiting verification')),
        node('p', 'Executed ' + record.businessDate + '. Decision: ' + (record.decisionBusinessDate || 'not recorded') + '. Case ' + record.caseId + '.'),
        button('Inspect work source ' + record.id, () => showEvent(m.sources.workCheckpoint.commands[record.revision - 1].id)));
      $('trend-work').append(details);
    }
    inspect('posted', null, false);
    $('trend-results').hidden = false; $('trend-results').setAttribute('aria-busy', 'false'); $('trend-download').disabled = false;
    $('trend-status').textContent = 'Ready: ' + m.period.from + ' through ' + m.period.asOf + '. ' + m.lineage.includedEventCount + ' source events at cutoff; ' +
      m.lineage.excludedFutureEventCount + ' later events excluded. Full ' + m.lineage.sourceEventsValidated + '-event source validated.';
  }
  function renderTrends() {
    const maximum = Math.max(1, ...bundle.trends.flatMap(period => [period.flows.postedCents, period.flows.paidCents]));
    $('trend-chart').replaceChildren();
    for (const period of bundle.trends) {
      const month = new Intl.DateTimeFormat('en-US', {month: 'long', timeZone: 'UTC'}).format(new Date(period.from + 'T12:00:00Z'));
      const block = node('div', undefined, 'trend-month');
      block.append(button(month + ' · ' + period.from.slice(8) + '–' + period.asOf.slice(8), () => applyPeriod(period.from, period.asOf), 'trend-period'));
      for (const [key, label] of [['postedCents', 'Posted'], ['paidCents', 'Paid']]) {
        const bar = node('div', undefined, 'trend-bar ' + (key === 'paidCents' ? 'paid' : 'posted'));
        const meter = node('meter'); meter.min = 0; meter.max = maximum / 100; meter.value = period.flows[key] / 100;
        meter.setAttribute('aria-label', month + ' ' + label + ' · USD');
        meter.textContent = money(period.flows[key]);
        bar.append(node('span', label + ' ' + money(period.flows[key])), meter); block.append(bar);
      }
      $('trend-chart').append(block);
    }
    $('trend-month-caption').textContent = 'Net USD · ' + bundle.model.period.from + ' through ' + bundle.model.period.asOf + '. Flows sum to the selected period; closing balances do not.';
    fillRows($('trend-months'), bundle.trends, period => [
      button(period.from + '–' + period.asOf, () => applyPeriod(period.from, period.asOf)),
      money(period.flows.postedCents), money(period.flows.paidCents), money(period.unpaidRollforward.closingCents)
    ], 4);
  }
  function renderHeld() {
    if (!bundle) return;
    const owner = $('trend-owner').value, age = $('trend-age').value, m = bundle.model;
    const rows = m.heldAging.rows.filter(row => (owner === 'all' || row.owner === owner) && (age === 'all' || row.bucket === age));
    $('trend-held-filtered').textContent = 'Showing ' + rows.length + ' of ' + m.heldAging.documentCount + ' held documents. Age and owner filters apply to this queue only.';
    fillRows($('trend-held'), rows, row => {
      const doc = m.financial.documents.find(document => document.id === row.documentId);
      return [twoLines(button(doc.id, () => showDocument(doc.id)), doc.supplier),
        twoLines(row.owner, doc.reasons.join(' · ')),
        twoLines(doc.dateSource.receivedOn || 'Unknown receipt date', row.ageDays === null ? 'Unknown age' : row.ageDays + ' calendar days · ' + row.bucket),
        money(doc.headerNetCents, doc.currency)];
    }, 4);
  }
  function inspect(kind, state = null, moveFocus = true) {
    if (!bundle) return;
    selection = {kind, state, record: null}; $('trend-detail').hidden = true;
    document.querySelectorAll('[data-measure]').forEach(item => item.setAttribute('aria-pressed', item.dataset.measure === kind ? 'true' : 'false'));
    const f = bundle.model.financial, target = $('trend-evidence-table');
    if (kind === 'posted' || kind === 'paid') {
      const measure = kind === 'posted' ? 'invoiced' : 'paid', rows = f.flowRows.filter(row => row.measure === measure);
      $('trend-evidence-definition').textContent = (kind === 'posted' ? 'Posted invoice' : 'Payment') + ' flows within ' + bundle.model.period.from + '–' + bundle.model.period.asOf +
        '. Grain: event × PO line × cost center. Net USD; each allocation delta counted once.';
      table(target, 'Source activity allocations', ['Business date / event', 'Document', 'PO line / cost center', 'Net USD'], rows, row => [
        twoLines(button(row.eventId, () => showEvent(row.eventId)), row.businessDate),
        row.documentId ? button(row.documentId, () => showDocument(row.documentId)) : 'No document',
        twoLines(button(row.poLineId, () => showAllocation(row.allocationKey)), row.costCenter), money(row.amountCents)
      ]);
    } else if (kind === 'open') {
      $('trend-evidence-definition').textContent = 'Open approved PO commitment at ' + bundle.model.period.asOf + '. Grain: PO line × cost center, approved quantity/price basis. Received-not-invoiced is within this balance.';
      table(target, 'Open commitment allocations', ['PO line', 'Cost center / account', 'Source request', 'Open net USD'], f.allocations.filter(row => row.openCommitment > 0), row => [
        button(row.lineId, () => showAllocation(row.key)), twoLines(row.costCenter, row.account), row.sourceRequestId, money(row.openCommitment)
      ]);
    } else {
      const rows = f.unpaidRows.filter(row => kind !== 'due' || row.state === state);
      $('trend-evidence-definition').textContent = 'Posted unpaid documents at ' + bundle.model.period.asOf + (kind === 'due' ? ' · ' + state : '') +
        '. Grain: one document, summed from its actual posted invoice links. Missing due dates remain unknown.';
      table(target, 'Unpaid source documents', ['Document', 'Due date', 'Due state / calendar days past due', 'Unpaid net USD'], rows, row => [
        button(row.documentId, () => showDocument(row.documentId)), row.dueOn || 'Unknown',
        twoLines(row.state, row.daysPastDue === null ? 'Unknown' : String(row.daysPastDue)), money(row.unpaidNetCents)
      ]);
    }
    if (moveFocus) focus('trend-evidence-heading');
  }
  function detail(title) {
    $('trend-detail').hidden = false; $('trend-detail-heading').textContent = title;
    const target = $('trend-detail-content'); target.replaceChildren(); return target;
  }
  function showDocument(id) {
    const doc = bundle.model.financial.documents.find(doc => doc.id === id); if (!doc) return;
    selection.record = {kind: 'document', id};
    const target = detail('Document ' + id), list = node('dl');
    pair(list, 'Identity / cutoff status', doc.key + ' · ' + doc.status);
    pair(list, 'Supplier / invoice reference', doc.supplier + ' / ' + doc.reference);
    pair(list, 'Declared net / unpaid posted USD', money(doc.headerNetCents, doc.currency) + ' / ' + money(doc.unpaidNetCents));
    for (const [field, label] of [['invoiceOn', 'Original invoice date'], ['receivedOn', 'Original inbox receipt'], ['dueOn', 'Due date']])
      pair(list, label, doc.dateSource[field] || 'Unknown — ' + doc.dateSource.unknownReasons[field]);
    pair(list, 'Terms provenance', doc.dateSource.termsVersion + ' / ' + (doc.dateSource.termsRuleId || 'No applicable source-date/term rule'));
    pair(list, 'Retained invoice versions', doc.versions.map(version => 'v' + version.version + ' ' + money(version.netCents, doc.currency)).join(' → '));
    pair(list, 'Current primary owner / reasons', (doc.owner || 'No active hold owner') + ' · ' + doc.reasons.join(' · '));
    target.append(list, node('h4', 'Dated document decisions through the cutoff'));
    const events = bundle.sourceEvents.filter(event => event.command.payload.documentId === id);
    for (const event of events) target.append(button(event.businessDate + ' · ' + event.command.type + ' · ' + event.id, () => showEvent(event.id)));
    const disclosure = node('details'), raw = node('pre', JSON.stringify(doc, null, 2));
    disclosure.append(node('summary', 'Inspect document projection and retained evaluation history'), raw); target.append(disclosure);
    focus('trend-detail-heading');
  }
  function showEvent(id) {
    const event = bundle.sourceEvents.find(event => event.id === id); if (!event) return;
    selection.record = {kind: 'event', id};
    const target = detail('Event ' + id), list = node('dl');
    pair(list, 'Qualified identity', JSON.stringify([bundle.model.scenarioId, event.companyId, 'event', event.id]));
    pair(list, 'Business date · America/Chicago', event.businessDate);
    pair(list, 'Occurred / recorded · UTC', event.occurredAt + ' / ' + event.recordedAt);
    pair(list, 'Decision / role', event.domain + ' · ' + event.command.type + ' / ' + event.command.actor);
    target.append(list, node('h4', 'Source dependencies'));
    if (!event.dependsOn.length) target.append(node('p', 'No prior business dependency required for this source event.', 'muted'));
    for (const dependency of event.dependsOn) target.append(button(dependency, () => showEvent(dependency)));
    target.append(node('h4', 'Original authored event'), node('pre', JSON.stringify(event, null, 2)));
    focus('trend-detail-heading');
  }
  function showAllocation(key) {
    const row = bundle.model.financial.allocations.find(row => row.key === key); if (!row) return;
    selection.record = {kind: 'allocation', key};
    const target = detail('Allocation ' + row.lineId + ' / ' + row.costCenter), list = node('dl');
    pair(list, 'Identity', row.key); pair(list, 'Source request', row.sourceRequestKey);
    pair(list, 'Cost center / account', row.costCenter + ' / ' + row.account);
    pair(list, 'Captured policy', row.policy.masterVersion + ' / ' + row.policy.ruleId + ' v' + row.policy.ruleVersion);
    pair(list, 'Allocation share', row.basisPoints + ' basis points');
    pair(list, 'Cutoff open / unpaid / paid', [row.openCommitment, row.unpaid, row.paid].map(cents => money(cents)).join(' / '));
    target.append(list, node('pre', JSON.stringify(row, null, 2)));
    const events = bundle.sourceEvents.filter(event => event.command.payload.requestId === row.sourceRequestId || event.command.payload.poLineId === row.lineId);
    for (const event of events) target.append(button(event.businessDate + ' · ' + event.id, () => showEvent(event.id)));
    focus('trend-detail-heading');
  }
  $('trend-form').addEventListener('submit', event => { event.preventDefault(); queryDates($('trend-from').value, $('trend-cutoff').value); });
  $('trend-preset').addEventListener('change', () => { const dates = presets[$('trend-preset').value]; if (dates) applyPeriod(...dates); });
  for (const id of ['trend-from', 'trend-cutoff']) $(id).addEventListener('input', () => { $('trend-preset').value = 'custom'; });
  for (const id of ['trend-owner', 'trend-age']) $(id).addEventListener('change', renderHeld);
  $('trend-download').addEventListener('click', () => {
    if (!bundle || $('trend-download').disabled) return;
    const evidence = {format: 'SIMULATED-BUSINESS-TRENDS', version: 1, fictional: true,
      query: bundle.model.period, viewSelection: {...selection, owner: $('trend-owner').value, ageBucket: $('trend-age').value},
      model: bundle.model, monthlySlices: bundle.trends, sourceEvents: bundle.sourceEvents};
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2) + '\n'], {type: 'application/json'}));
    const link = node('a'); link.href = url; link.download = 'fictional-business-trends-' + bundle.model.period.asOf + '.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  function startWorker() {
    if (worker) return true;
    try {
      worker = new Worker('business-trends-worker.js');
      worker.onmessage = ({data}) => {
        if (data.id !== request) return;
        if (data.error) { unavailable(data.error); return; }
        bundle = data;
        try { render(); } catch (error) { unavailable('The view could not render its validated result: ' + error.message); }
      };
      worker.onerror = event => { event.preventDefault(); worker.terminate(); worker = null; unavailable('The local model worker failed to load or calculate. Apply dates to try again.'); };
      return true;
    } catch (error) { worker = null; unavailable('Local calculations are unavailable: ' + error.message); return false; }
  }
  addEventListener('pagehide', () => { if (worker) worker.terminate(); worker = null; });
  const query = new URLSearchParams(location.search), allowed = ['from', 'asOf'];
  if ([...query.keys()].some(key => !allowed.includes(key)) || allowed.some(key => query.getAll(key).length > 1)) {
    unavailable('Unsupported or repeated date query. Choose dates above to calculate an explicit view.');
  } else {
    const from = query.has('from') ? query.get('from') : presets.all[0], asOf = query.has('asOf') ? query.get('asOf') : presets.all[1];
    $('trend-from').value = from; $('trend-cutoff').value = asOf;
    $('trend-preset').value = Object.keys(presets).find(key => presets[key][0] === from && presets[key][1] === asOf) || 'custom';
    queryDates(from, asOf, false);
  }
})();
