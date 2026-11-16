'use strict';
const assert = require('node:assert/strict'), P = require('./bi-prototype/preview/policy-review-rules.js'), C = require('./bi-prototype/preview/coding-rules.js');
const copy = value => JSON.parse(JSON.stringify(value)), before = JSON.stringify(C.master());
const proposal = {id: 'CMD-PROPOSE', type: 'propose', actor: {role: 'Finance analyst', personId: 'PERSON-A'}, businessDate: '2026-11-16',
 payload: {proposalId: 'MAP-001', itemId: 'ITEM-ENGINEERING', purposeId: 'WORK-REPAIR', account: '6105 · Equipment repairs', allocations: [{costCenter: 'FAC-100', basisPoints: 10000}], effectiveFrom: '2026-11-17', effectiveToExclusive: '2027-01-01', reason: 'Fictional mapping for reviewed engineering support on routine repairs.'}};
const review = {id: 'CMD-APPROVE', type: 'approve', actor: {role: 'Finance approver', personId: 'PERSON-B'}, businessDate: '2026-11-16', payload: {proposalId: 'MAP-001', reason: 'Independent review of the account, allocation, purpose and effective dates.'}};
const empty = P.create(), pending = P.dispatch(empty, proposal), approved = P.dispatch(pending, review), checks = [];
function check(name, fn) {fn(); checks.push(name);}
check('Unmapped and pending requests stay held', () => {for (const state of [empty, pending]) assert.equal(P.evaluate(state, '2026-11-18').result.code, 'NO_APPROVED_MAPPING'); assert.equal(P.project(pending).proposals[0].rule.status, 'Proposed');});
check('Independent approval is effective only in its half-open interval', () => {
 assert.equal(P.evaluate(approved, '2026-11-15').result.status, 'held'); assert.equal(P.evaluate(approved, '2026-11-16').result.status, 'held');
 const result = P.evaluate(approved, '2026-11-17'); assert.equal(result.result.status, 'ready'); assert.equal(result.result.coding.netCents, 200000);
 assert.equal(result.result.coding.account, '6105 · Equipment repairs'); assert.equal(result.result.ruleId, 'FIN-MAP-001'); assert.deepEqual(result.appliedProposalIds, ['MAP-001']);
 const shorter = copy(proposal); shorter.payload.effectiveToExclusive = '2026-11-20'; const state = P.dispatch(P.dispatch(empty, shorter), review);
 assert.equal(P.evaluate(state, '2026-11-19').result.status, 'ready'); assert.equal(P.evaluate(state, '2026-11-20').result.code, 'NO_APPROVED_MAPPING');
});
check('Original decision and baseline remain unchanged after approval', () => {
 const captured = P.evaluate(empty, '2026-11-15').capturedBeforeChange;
 assert.deepEqual(P.evaluate(approved, '2026-11-18').capturedBeforeChange, captured); assert.equal(captured.result.status, 'held'); assert.equal(JSON.stringify(C.master()), before);
 assert.equal(empty.commands.length, 0); assert.equal(pending.commands.length, 1);
});
check('Rejection never releases a mapping and retains independent evidence', () => {
 const state = P.dispatch(pending, {...review, id: 'CMD-REJECT', type: 'reject'}); assert.equal(P.evaluate(state, '2026-11-18').result.status, 'held'); assert.equal(P.project(state).proposals[0].status, 'Rejected');
});
check('Roles and person identity both gate decisions', () => {
 assert.throws(() => P.dispatch(empty, {...proposal, actor: {role: 'Requester', personId: 'PERSON-A'}}), /role/);
 assert.throws(() => P.dispatch(pending, {...review, actor: {role: 'Finance approver', personId: 'PERSON-A'}}), /own proposal/);
 assert.throws(() => P.dispatch(pending, {...review, actor: {role: 'Finance analyst', personId: 'PERSON-B'}}), /role/);
});
check('Invalid accounts, references, allocations and source overrides fail closed', () => {
 for (const change of [p => p.account = 'GUESS', p => p.itemId = 'UNKNOWN', p => p.accountOverride = '1600', p => p.allocations[0].basisPoints = 9999,
  p => p.allocations.push(copy(p.allocations[0])), p => p.allocations[0].costCenter = '__proto__', p => p.allocations[0].department = 'Override', p => p.allocations[0].basisPoints = -1]) {
  const command = copy(proposal); change(command.payload); assert.throws(() => P.dispatch(empty, command));
 }
});
check('Split shares use approved centers and inherited departments', () => {
 const command = copy(proposal); command.payload.allocations = [{costCenter: 'FAC-100', basisPoints: 7000}, {costCenter: 'PROD-200', basisPoints: 3000}];
 const result = P.evaluate(P.dispatch(P.dispatch(empty, command), review), '2026-11-18').result;
 assert.deepEqual(result.coding.allocations.map(row => [row.department, row.basisPoints]), [['Facilities', 7000], ['Production', 3000]]);
});
check('Existing approved mappings cannot be overwritten by additive proposals', () => {
 const command = copy(proposal); command.payload.itemId = 'ITEM-PUMP'; assert.throws(() => P.dispatch(empty, command), /overlaps an existing/);
});
check('Concurrent pending proposals recheck overlap on approval', () => {
 const second = copy(proposal); second.id = 'CMD-PROPOSE-2'; second.payload.proposalId = 'MAP-002';
 let state = P.dispatch(pending, second); state = P.dispatch(state, review);
 assert.throws(() => P.dispatch(state, {...review, id: 'CMD-APPROVE-2', payload: {...review.payload, proposalId: 'MAP-002'}}), /overlaps/);
});
check('Invalid, backwards and late effective dates cannot backdate policy', () => {
 for (const change of [p => p.effectiveFrom = '2026-02-30', p => p.effectiveFrom = '2026-11-15', p => p.effectiveToExclusive = p.effectiveFrom]) {
  const command = copy(proposal); change(command.payload); assert.throws(() => P.dispatch(empty, command));
 }
 assert.throws(() => P.dispatch(pending, {...review, businessDate: '2026-11-18'}), /retroactive/);
 assert.equal(P.project(P.dispatch(pending, {...review, type: 'reject', businessDate: '2026-11-18'})).proposals[0].status, 'Rejected');
 assert.throws(() => P.evaluate(approved, '2027-01-01')); assert.throws(() => P.evaluate(approved, null));
});
check('Idempotency, changed IDs and replay protect source evidence', () => {
 assert.deepEqual(P.dispatch(approved, review), approved);
 assert.throws(() => P.dispatch(approved, {...review, payload: {...review.payload, reason: 'Different reason'}}), /reused/);
 assert.deepEqual(P.restore(P.serialize(approved)), approved);
 const tampered = copy(approved); tampered.baseline.owner = 'Other'; assert.throws(() => P.restore(JSON.stringify(tampered)));
 const altered = copy(approved); altered.commands[1].actor.personId = 'PERSON-A'; assert.throws(() => P.restore(JSON.stringify(altered)));
});
check('Repeated or unknown decisions and unsupported journal fields fail', () => {
 assert.throws(() => P.dispatch(empty, review)); assert.throws(() => P.dispatch(approved, {...review, id: 'CMD-OTHER'}));
 const command = copy(proposal); command.payload.reason = ''; assert.throws(() => P.dispatch(empty, command));
 assert.throws(() => P.project({...empty, derivedStatus: 'Approved'}));
});
check('Impact is explicitly hypothetical before approval and bounded to reference contexts', () => {
 const preview = P.impact(pending, '2026-11-18'); assert.equal(preview.hypothetical, true); assert.equal(preview.referenceContexts, 15); assert.equal(preview.changedContexts, 1);
 assert.deepEqual(preview.rows.filter(row => row.changed).map(row => row.input), [{itemId: 'ITEM-ENGINEERING', purposeId: 'WORK-REPAIR', quantity: 1}]);
 assert.equal(P.impact(approved, '2026-11-18').hypothetical, false); assert.equal(P.impact(approved, '2026-11-16').changedContexts, 0);
 assert(preview.rows.filter(row => row.input.purposeId === 'WORK-CLOSED').every(row => row.prior.code === 'PROJECT_NOT_APPROVED' && row.proposed.code === 'PROJECT_NOT_APPROVED'));
 assert.equal(P.impact(empty, '2026-11-18').referenceContexts, 0);
});
check('Workbench evidence restores state, dated results and independent view selection', () => {
 const view = {role: 'Finance approver', personId: 'PERSON-B'}, exported = P.evidence(approved, '2026-11-18', view);
 const restored = P.restoreEvidence(JSON.stringify(exported)); assert.deepEqual(restored.state, approved); assert.equal(restored.on, '2026-11-18'); assert.deepEqual(restored.viewSelection, view);
 assert.equal(P.evidence(pending, '2026-11-18', view).impact.hypothetical, true);
});
check('Modified derived outcomes, identities and source policies cannot be imported as evidence', () => {
 const exported = P.evidence(approved, '2026-11-18', {role: 'Finance approver', personId: 'PERSON-B'});
 for (const change of [data => data.result.coding.account = 'Other', data => data.impact.changedContexts = 15, data => data.viewSelection.personId = 'OTHER', data => data.journal.baseline.owner = 'Other', data => data.extra = true]) {
  const data = copy(exported); change(data); assert.throws(() => P.restoreEvidence(JSON.stringify(data)));
 }
 assert.throws(() => P.restoreEvidence('x'.repeat(131073))); assert.throws(() => P.restoreEvidence('{invalid'));
});
console.log('PASS ' + checks.length + ' Finance policy groups: independent approval, effective dates, exact shares, overlap, immutable original decisions and recovery.');
