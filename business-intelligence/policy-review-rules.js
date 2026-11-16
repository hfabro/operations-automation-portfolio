/* Independent fictional Finance change journal. Never mutates the shared ERP master or saved journeys. */
(function(root, factory) {
 const api = typeof module === 'object' && module.exports ? factory(require('./coding-rules.js')) : factory(root.Coding);
 if (typeof module === 'object' && module.exports) module.exports = api; else root.PolicyReview = api;
})(typeof window !== 'undefined' ? window : globalThis, function(C) {
 'use strict';
 const clone = value => JSON.parse(JSON.stringify(value));
 const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
 const same = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
 const roles = {propose: 'Finance analyst', approve: 'Finance approver', reject: 'Finance approver'};
 const request = {itemId: 'ITEM-ENGINEERING', purposeId: 'WORK-REPAIR', quantity: 1};
 function fail(message) {throw Error('Finance policy review: ' + message);}
 function closed(value, keys, label) {if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key))) fail(label + ' has missing or unsupported fields.');}
 function date(value) {if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T00:00:00Z')) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) fail('Use valid ISO business dates.'); return value;}
 function id(value) {if (typeof value !== 'string' || !/^[A-Z][A-Z0-9-]{0,39}$/.test(value)) fail('Use bounded canonical IDs.');}
 function reason(value) {if (typeof value !== 'string' || value.trim().length < 3 || value.length > 160) fail('A 3–160 character decision reason is required.');}
 function overlap(a, b) {return a.itemId === b.itemId && a.purposeId === b.purposeId && a.effectiveFrom < b.effectiveToExclusive && b.effectiveFrom < a.effectiveToExclusive;}
 function create() {return {format: 'SIMULATED-FINANCE-POLICY', version: 1, baseline: C.master(), commands: []};}
 function project(state) {
  closed(state, ['format', 'version', 'baseline', 'commands'], 'Journal');
  const base = C.master();
  if (state.format !== 'SIMULATED-FINANCE-POLICY' || state.version !== 1 || !same(state.baseline, base) || !Array.isArray(state.commands) || state.commands.length > 40) fail('Unsupported or modified baseline/journal.');
  const proposals = [], ids = new Set(); let previousDate = base.evaluationDate;
  for (const command of state.commands) {
   closed(command, ['id', 'type', 'actor', 'businessDate', 'payload'], 'Command'); id(command.id);
   if (ids.has(command.id) || !Object.hasOwn(roles, command.type)) fail('Repeated command or unsupported action.'); ids.add(command.id);
   closed(command.actor, ['role', 'personId'], 'Actor'); id(command.actor.personId);
   if (command.actor.role !== roles[command.type]) fail('The independent Finance role is required.');
   date(command.businessDate); if (command.businessDate < previousDate || command.businessDate > '2026-12-31') fail('Commands cannot backdate or leave the declared 2026 teaching window.'); previousDate = command.businessDate;
   const p = command.payload;
   if (command.type === 'propose') {
    closed(p, ['proposalId', 'itemId', 'purposeId', 'account', 'allocations', 'effectiveFrom', 'effectiveToExclusive', 'reason'], 'Proposal');
    id(p.proposalId); reason(p.reason); date(p.effectiveFrom); date(p.effectiveToExclusive);
    if (proposals.some(proposal => proposal.id === p.proposalId) || proposals.length >= 10) fail('Proposal identity repeats or exceeds the bounded journal.');
    if (!base.items.some(item => item.id === p.itemId) || !base.purposes.some(purpose => purpose.id === p.purposeId) || !base.accounts.includes(p.account)) fail('Choose admitted catalog, work-purpose and account references.');
    if (p.effectiveFrom < command.businessDate || p.effectiveToExclusive <= p.effectiveFrom || p.effectiveToExclusive > '2027-01-01') fail('Use a future/current nonempty effective interval within the declared policy window.');
    if (!Array.isArray(p.allocations) || p.allocations.length < 1 || p.allocations.length > 3) fail('Use 1–3 approved cost centers.');
    const allocations = p.allocations.map(row => {closed(row, ['costCenter', 'basisPoints'], 'Allocation'); if (!Object.hasOwn(base.centers, row.costCenter) || !Number.isSafeInteger(row.basisPoints) || row.basisPoints <= 0) fail('Invalid approved cost center or allocation share.'); return {...clone(row), department: base.centers[row.costCenter]};});
    if (new Set(allocations.map(row => row.costCenter)).size !== allocations.length || allocations.reduce((sum, row) => sum + row.basisPoints, 0) !== 10000) fail('Unique allocation shares must total exactly 10,000 basis points.');
    const rule = {id: 'FIN-' + p.proposalId, version: 1, itemId: p.itemId, purposeId: p.purposeId, account: p.account,
     allocations, treatment: 'Independently reviewed fictional Finance mapping', status: 'Proposed', effectiveFrom: p.effectiveFrom, effectiveToExclusive: p.effectiveToExclusive, owner: base.owner};
    if (base.rules.some(existing => existing.status === 'Approved' && overlap(rule, existing))) fail('The proposal overlaps an existing approved mapping; this additive workbench does not replace rules.');
    proposals.push({id: p.proposalId, rule, status: 'Pending', proposedBy: clone(command.actor), proposedOn: command.businessDate, proposalCommandId: command.id, reason: p.reason, review: null});
   } else {
    closed(p, ['proposalId', 'reason'], 'Review'); id(p.proposalId); reason(p.reason);
    const proposal = proposals.find(proposal => proposal.id === p.proposalId);
    if (!proposal || proposal.status !== 'Pending') fail('Choose an existing pending proposal.');
    if (proposal.proposedBy.personId === command.actor.personId) fail('The proposer cannot approve or reject their own proposal, even after switching roles.');
    if (command.type === 'approve' && command.businessDate > proposal.rule.effectiveFrom) fail('Approval cannot create retroactive effectiveness; propose a future interval.');
    if (command.type === 'approve' && proposals.some(other => other !== proposal && other.status === 'Approved' && overlap(proposal.rule, other.rule))) fail('Another approved mapping overlaps; Finance must resolve the conflict.');
    proposal.status = command.type === 'approve' ? 'Approved' : 'Rejected';
    proposal.rule.status = proposal.status;
    proposal.review = {commandId: command.id, actor: clone(command.actor), businessDate: command.businessDate, reason: p.reason};
   }
  }
  return {proposals, commandCount: state.commands.length, baselineVersion: base.version};
 }
 function dispatch(state, command) {
  project(state); const existing = state.commands.find(existing => existing.id === command.id);
  if (existing) {if (!same(existing, command)) fail('Command ID was reused with different content.'); return clone(state);}
  const next = clone(state); next.commands.push(clone(command)); project(next); return next;
 }
 function evaluate(state, on) {
  date(on); if (on < '2026-11-15' || on > '2026-12-31') fail('Test dates must be within November 15–December 31, 2026.');
  const view = project(state), approved = view.proposals.filter(proposal => proposal.status === 'Approved' && proposal.review.businessDate <= on);
  const master = clone(state.baseline); master.evaluationDate = on;
  master.rules.push(...approved.map(proposal => clone(proposal.rule)));
  master.version = state.baseline.version + (approved.length ? '+FIN-' + approved.map(proposal => proposal.id).join('-') : '');
  const result = C.resolve(clone(request), master);
  return {format: 'SIMULATED-FINANCE-POLICY-RESULT', version: 1, fictional: true, scenarioId: 'SYN-POLICY-REVIEW-1', on,
   request: clone(request), result, testedPolicy: master,
   capturedBeforeChange: {on: state.baseline.evaluationDate, request: clone(request), result: C.resolve(clone(request), clone(state.baseline))},
   proposals: clone(view.proposals), appliedProposalIds: approved.filter(proposal => proposal.rule.effectiveFrom <= on && on < proposal.rule.effectiveToExclusive).map(proposal => proposal.id),
   journal: clone(state), boundaries: 'Independent fictional additive policy review. Original held request, ERP master and saved journals remain unchanged. New evaluations are requisition drafts, not POs or posting. No production authentication or accounting-policy determination.'};
 }
 function serialize(state) {project(state); return JSON.stringify(state);}
 function restore(text) {const state = JSON.parse(text); project(state); return clone(state);}
 function impact(state, on) {
  const evaluation = evaluate(state, on), proposal = evaluation.proposals[0];
  if (!proposal) return {hypothetical: true, referenceContexts: 0, changedContexts: 0, rows: []};
  const before = clone(state.baseline); before.evaluationDate = on;
  const candidate = clone(before); candidate.version += '+PREVIEW-' + proposal.id; candidate.rules.push({...clone(proposal.rule), status: 'Approved'});
  const rows = before.items.flatMap(item => before.purposes.map(purpose => {
   const input = {itemId: item.id, purposeId: purpose.id, quantity: 1}, prior = C.resolve(input, before), proposed = C.resolve(input, candidate);
   const signature = result => result.status === 'ready' ? JSON.stringify(result.coding) : result.code;
   return {input, prior, proposed, changed: signature(prior) !== signature(proposed)};
  }));
  return {hypothetical: proposal.status !== 'Approved' || proposal.review.businessDate > on, proposalId: proposal.id, referenceContexts: rows.length, changedContexts: rows.filter(row => row.changed).length, rows};
 }
 function evidence(state, on, view) {
  closed(view, ['role', 'personId'], 'View selection');
  if (!['Finance analyst', 'Finance approver'].includes(view.role) || !['PERSON-A', 'PERSON-B'].includes(view.personId)) fail('Unsupported workbench view identity.');
  const result = evaluate(state, on);
  if (result.proposals.length > 1 || result.proposals.some(proposal => proposal.id !== 'MAP-001') || state.commands.some(command => !['PERSON-A', 'PERSON-B'].includes(command.actor.personId))) fail('This interactive evidence format supports the single MAP-001 / Person A/B workbench.');
  return {...result, impact: impact(state, on), viewSelection: clone(view)};
 }
 function restoreEvidence(text) {
  if (typeof text !== 'string' || text.length > 131072) fail('Use a bounded workbench evidence JSON file.');
  const data = JSON.parse(text), state = restore(JSON.stringify(data.journal)), rebuilt = evidence(state, data.on, data.viewSelection);
  if (!same(rebuilt, data)) fail('Evidence differs from its replayed sources and calculations.');
  return {state, on: data.on, viewSelection: clone(data.viewSelection)};
 }
 return {create, project, dispatch, evaluate, impact, evidence, restoreEvidence, serialize, restore, roles: clone(roles)};
});
