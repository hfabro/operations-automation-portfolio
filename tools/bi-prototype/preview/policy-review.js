(() => {
 'use strict';
 const P = window.PolicyReview, $ = id => document.getElementById(id), node = (tag, text) => {const item = document.createElement(tag); if (text !== undefined) item.textContent = text; return item;};
 let state = P.create(), selectedDate = '2026-11-18', result;
 const actor = () => ({role: $('policy-role').value, personId: $('policy-person').value});
 const allocations = {fac: [{costCenter: 'FAC-100', basisPoints: 10000}], split: [{costCenter: 'FAC-100', basisPoints: 7000}, {costCenter: 'PROD-200', basisPoints: 3000}], eng: [{costCenter: 'ENG-300', basisPoints: 10000}]};
 function pair(list, label, value) {list.append(node('dt', label), node('dd', value));}
 function showError(error) {$('policy-error').textContent = error.message; $('policy-error').hidden = false; $('policy-status').textContent = 'Change rejected; prior policy and captured decision remain.';}
 function act(type, payload) {
  try {state = P.dispatch(state, {id: 'FIN-CMD-' + (state.commands.length + 1), type, actor: actor(), businessDate: '2026-11-16', payload}); $('policy-error').hidden = true; render(); $('policy-status').textContent = type === 'propose' ? 'Proposal retained. Independent approval is required; coding is still held.' : type === 'approve' ? 'Independent approval retained. The new rule applies only during its effective interval.' : 'Independent rejection retained. No mapping released.';}
  catch (error) {showError(error);}
 }
 function renderImpact() {
  const impact = P.impact(state, selectedDate);
  $('policy-impact-summary').textContent = !impact.referenceContexts ? 'Submit a proposal to inspect its bounded reference scope.' : (impact.hypothetical ? 'Hypothetical proposal preview' : 'Approved rule check') + ' on ' + selectedDate + ': ' + impact.changedContexts + ' of ' + impact.referenceContexts + ' defined catalog/work-purpose contexts change their coding outcome.';
  $('policy-impact').replaceChildren();
  const selected = impact.rows.filter(row => $('policy-impact-all').checked || row.changed);
  for (const row of selected) {
   const line = node('tr'), describe = value => value.status === 'ready' ? value.coding.account + ' / ' + value.coding.allocations.map(share => share.costCenter + ' ' + share.basisPoints / 100 + '%').join('; ') : 'Held / ' + value.code;
   line.append(node('td', row.input.itemId + ' / ' + row.input.purposeId), node('td', describe(row.prior)), node('td', describe(row.proposed))); $('policy-impact').append(line);
  }
  if (!selected.length) {const line = node('tr'), cell = node('td', 'No changed reference contexts on this date.'); cell.colSpan = 3; line.append(cell); $('policy-impact').append(line);}
 }
 function gates() {
  const proposal = P.project(state).proposals[0], pending = proposal?.status === 'Pending', independent = pending && actor().personId !== proposal.proposedBy.personId;
  $('policy-propose').disabled = actor().role !== 'Finance analyst' || !!proposal;
  for (const id of ['policy-account', 'policy-allocation', 'policy-from', 'policy-to', 'policy-reason']) $(id).disabled = !!proposal;
  $('policy-approve').disabled = $('policy-reject').disabled = !pending || actor().role !== 'Finance approver' || !independent;
  $('policy-review-gate').textContent = !pending ? 'No pending proposal requires a decision.' : actor().role !== 'Finance approver' ? 'Switch to Finance approver and a different person to decide.' : !independent ? 'The proposer cannot decide their own proposal. Select the independent person.' : 'Independent Finance decision available. Inspect account, shares and dates first.';
 }
 function render() {
  result = P.evaluate(state, selectedDate);
  const original = result.capturedBeforeChange.result;
  $('policy-original').replaceChildren(node('p', 'Held · ' + original.code), node('p', original.reason), node('p', 'Owner: ' + original.owner + ' · Policy: ' + original.masterVersion));
  const target = $('policy-result'), current = result.result, title = node('p', current.status === 'ready' ? 'Ready · new coding evaluation' : 'Held · ' + current.code); title.className = 'policy-decision'; target.replaceChildren(title);
  if (current.status === 'ready') {
   const list = node('dl'); pair(list, 'Account', current.coding.account); pair(list, 'Allocation', current.coding.allocations.map(row => row.costCenter + ' / ' + row.department + ' · ' + row.basisPoints / 100 + '%').join('; '));
   pair(list, 'Source policy', current.masterVersion + ' / ' + current.ruleId + ' v' + current.ruleVersion); pair(list, 'Catalog supplier / net', current.coding.supplier + ' / USD ' + (current.coding.netCents / 100).toFixed(2)); target.append(list);
  } else target.append(node('p', current.reason), node('p', 'Owner: ' + current.owner));
  const date = node('p', 'Test date: ' + selectedDate + ' · Original capture: ' + result.capturedBeforeChange.on); date.className = 'policy-meta'; target.append(date);
  const proposal = result.proposals[0];
  if (!proposal) $('policy-proposal').replaceChildren(node('p', 'No Finance proposal has been submitted. The item/work-purpose mapping remains missing.'));
  else {
   $('policy-account').value = proposal.rule.account; $('policy-from').value = proposal.rule.effectiveFrom; $('policy-to').value = proposal.rule.effectiveToExclusive; $('policy-reason').value = proposal.reason;
   const shape = proposal.rule.allocations.map(({costCenter, basisPoints}) => ({costCenter, basisPoints}));
   const profile = Object.keys(allocations).find(key => JSON.stringify(allocations[key]) === JSON.stringify(shape));
   if (!profile && !$('policy-allocation').querySelector('option[value="retained"]')) $('policy-allocation').add(new Option('Retained distribution · inspect proposal below', 'retained'));
   $('policy-allocation').value = profile || 'retained';
   const list = node('dl'); pair(list, 'Proposal / status', proposal.id + ' · ' + proposal.status); pair(list, 'Account', proposal.rule.account);
   pair(list, 'Distribution', proposal.rule.allocations.map(row => row.costCenter + ' · ' + row.basisPoints / 100 + '%').join('; '));
   pair(list, 'Effective interval', proposal.rule.effectiveFrom + ' inclusive → ' + proposal.rule.effectiveToExclusive + ' exclusive');
   pair(list, 'Proposed by / reason', proposal.proposedBy.personId + ' / ' + proposal.proposedBy.role + ' · ' + proposal.reason);
   pair(list, 'Independent decision', proposal.review ? proposal.review.actor.personId + ' / ' + proposal.review.actor.role + ' · ' + proposal.review.businessDate + ' · ' + proposal.review.reason : 'Pending; original mapping and request remain unchanged');
   $('policy-proposal').replaceChildren(list);
  }
  $('policy-journal').textContent = P.serialize(state); renderImpact(); gates();
 }
 for (const account of state.baseline.accounts) $('policy-account').add(new Option(account, account)); $('policy-account').value = '6105 · Equipment repairs';
 $('policy-form').addEventListener('submit', event => {event.preventDefault(); act('propose', {proposalId: 'MAP-001', itemId: 'ITEM-ENGINEERING', purposeId: 'WORK-REPAIR', account: $('policy-account').value, allocations: allocations[$('policy-allocation').value], effectiveFrom: $('policy-from').value, effectiveToExclusive: $('policy-to').value, reason: $('policy-reason').value});});
 $('policy-approve').addEventListener('click', () => act('approve', {proposalId: 'MAP-001', reason: $('policy-review-reason').value}));
 $('policy-reject').addEventListener('click', () => act('reject', {proposalId: 'MAP-001', reason: $('policy-review-reason').value}));
 for (const id of ['policy-role', 'policy-person']) $(id).addEventListener('change', gates);
 $('policy-impact-all').addEventListener('change', renderImpact);
 $('policy-test').addEventListener('click', () => {try {P.evaluate(state, $('policy-test-date').value); selectedDate = $('policy-test-date').value; $('policy-error').hidden = true; render(); $('policy-status').textContent = 'Explicit new coding check on ' + selectedDate + '. Original captured decision preserved.';} catch (error) {showError(error);}});
 $('policy-reset').addEventListener('click', () => {state = P.create(); selectedDate = '2026-11-18'; $('policy-test-date').value = selectedDate; $('policy-form').reset(); $('policy-account').value = '6105 · Equipment repairs'; $('policy-allocation').value = 'fac'; $('policy-impact-all').checked = false; $('policy-role').value = 'Finance analyst'; $('policy-person').value = 'PERSON-A'; $('policy-error').hidden = true; render(); $('policy-status').textContent = 'Temporary workbench reset. Shared journals and baseline master remain unchanged.';});
 $('policy-download').addEventListener('click', () => {const data = P.evidence(state, selectedDate, actor()), url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], {type: 'application/json'})), link = node('a'); link.href = url; link.download = 'fictional-finance-policy-evidence.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);});
 $('policy-restore').addEventListener('click', async () => {
  try {
   const file = $('policy-restore-file').files[0]; if (!file || !/\.json$/i.test(file.name) || file.size < 1 || file.size > 131072) throw Error('Choose one nonempty workbench JSON file, at most 128 KiB.');
   const restored = P.restoreEvidence(new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer()));
   state = restored.state; selectedDate = restored.on; $('policy-test-date').value = selectedDate;
   $('policy-role').value = restored.viewSelection.role; $('policy-person').value = restored.viewSelection.personId;
   $('policy-error').hidden = true; render(); $('policy-status').textContent = 'Evidence replayed and restored. Original captured decision and independent review preserved.';
  } catch (error) {showError(error);}
 });
 try {render(); $('policy-status').textContent = 'Baseline captured hold loaded. No Finance mapping has been proposed.';} catch (error) {showError(error); $('policy-download').disabled = true;}
})();
