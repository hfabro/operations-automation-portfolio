const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const F=require('./bi-prototype/preview/finance-resolution-rules.js'),J=require('./bi-prototype/preview/journey-rules.js'),P=require('./bi-prototype/preview/policy-review-rules.js'),S=require('./bi-prototype/preview/management-scenarios.js'),R=require('./bi-prototype/preview/report-model.js');
const checks=[],test=(name,fn)=>{fn();checks.push(name);},copy=value=>JSON.parse(JSON.stringify(value)),seed=S.example().purchasing,checkpoint=J.serialize(seed),origin=seed.requests.find(row=>row.id==='MGMT-CODING-HOLD');
const fresh=()=>F.create(checkpoint,origin.id,'current');
const proposal=(state=fresh(),overrides={})=>F.dispatch(state,{id:'FIN-PROPOSE',type:'propose',actor:{role:'Finance analyst',personId:'PERSON-A'},businessDate:'2026-11-16',payload:{proposalId:'MAP-001',itemId:origin.input.itemId,purposeId:origin.input.purposeId,account:'6105 · Equipment repairs',allocations:[{costCenter:'FAC-100',basisPoints:7000},{costCenter:'PROD-200',basisPoints:3000}],effectiveFrom:'2026-11-17',effectiveToExclusive:'2026-12-01',reason:'Fictional reviewed engineering work-purpose mapping',...overrides}});
const decide=(state,type='approve',person='PERSON-B')=>F.dispatch(state,{id:'FIN-'+type.toUpperCase(),type,actor:{role:'Finance approver',personId:person},businessDate:'2026-11-16',payload:{proposalId:'MAP-001',reason:'Independent fictional Finance decision'}});
const approved=decide(proposal()),newId='MGMT-REVIEWED-001';
test('Published v1 journals and Finance evidence preserve exact legacy outcomes',()=>{
 const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'bi-prototype/fixtures/legacy-finance-context.json'),'utf8')),restored=J.restore(JSON.stringify(golden.purchasingCheckpoint));
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(restored)).digest('hex'),golden.purchasingStateSha256);assert.deepEqual(R.select(R.compile(restored)).totals,golden.financialTotals);
 assert.deepEqual(P.evidence(P.restoreEvidence(JSON.stringify(golden.financeEvidence)).state,'2026-11-18',golden.financeEvidence.viewSelection),golden.financeEvidence);
});
test('Source selection retains the exact held request, quantity and checkpoint',()=>{const result=F.inspect(fresh(),'2026-11-18');assert.deepEqual(result.original,origin);assert.equal(result.evaluation.result.status,'held');assert.equal(JSON.stringify(fresh().source.checkpoint),checkpoint);});
test('Only declared missing-mapping holds can enter the workbench',()=>{for(const id of ['MISSING',seed.requests[0].id])assert.throws(()=>F.create(checkpoint,id,'current'));assert.throws(()=>F.create(checkpoint,origin.id,'silent-example'));});
test('Pending, rejected, future and expired proposals cannot create purchasing drafts',()=>{
 for(const state of [fresh(),proposal(),decide(proposal(),'reject')])assert.throws(()=>F.draft(state,'2026-11-18',newId));
 for(const date of ['2026-11-16','2026-12-01'])assert.throws(()=>F.draft(approved,date,newId));
});
test('Independent approval is enforced after a role switch',()=>{const pending=proposal();assert.throws(()=>decide(pending,'approve','PERSON-A'));assert.equal(F.inspect(pending,'2026-11-18').proposals[0].status,'Pending');});
test('Overlaps, invalid shares, unapproved accounts and retroactive dates remain blocked',()=>{
 for(const overrides of [{allocations:[{costCenter:'FAC-100',basisPoints:9999}]},{account:'FREE TEXT'},{effectiveFrom:'2026-11-15'},{itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR'}])assert.throws(()=>proposal(fresh(),overrides));
});
test('A valid rule for another request cannot resolve the captured hold',()=>{const other=decide(proposal(fresh(),{purposeId:'WORK-REPAIR'}));assert.equal(F.inspect(other,'2026-11-18').evaluation.result.status,'held');assert.throws(()=>F.draft(other,'2026-11-18',newId));});
test('Reviewed draft is coded without creating or approving a PO',()=>{
 const next=F.draft(approved,'2026-11-18',newId),request=next.requests.at(-1);assert.equal(request.status,'Coded');assert.equal(request.poLineId,null);assert.equal(next.erp.lines.length,seed.erp.lines.length);assert.deepEqual(next.requests.find(row=>row.id===origin.id),origin);assert.equal(request.result.ruleId,'FIN-MAP-001');assert.equal(request.result.evaluatedOn,'2026-11-18');assert.equal(request.input.quantity,origin.input.quantity);assert.equal(J.serialize(seed),checkpoint);
});
test('Purchasing command retry is idempotent and conflicting or duplicate replacements fail',()=>{
 const next=F.draft(approved,'2026-11-18',newId),command=next.commands.at(-1);assert.deepEqual(J.dispatch(next,command),next);assert.throws(()=>J.dispatch(next,{...command,payload:{...command.payload,newRequestId:'OTHER'}}));assert.throws(()=>J.dispatch(next,{...command,id:'ANOTHER-COMMAND',payload:{...command.payload,newRequestId:'OTHER'}}));
 assert.throws(()=>J.dispatch(seed,{...command,expectedRevision:0}));assert.throws(()=>J.dispatch(seed,{...command,actor:'AP'}));assert.throws(()=>F.create(J.serialize(next),origin.id,'current'));
});
test('Reviewed draft and Finance journal replay exactly; modified derived coding is rejected',()=>{
 const next=F.draft(approved,'2026-11-18',newId);assert.deepEqual(J.restore(J.serialize(next)),next);
 for(const change of [state=>state.requests.at(-1).result.coding.account='Other',state=>state.requests.at(-1).policySource.proposalIds=['OTHER']]){const changed=copy(next);change(changed);assert.throws(()=>J.serialize(changed));}
 const changed=JSON.parse(J.serialize(next));changed.commands.at(-1).payload.financeCheckpoint.commands[1].actor.personId='PERSON-A';assert.throws(()=>J.restore(JSON.stringify(changed)));
});
test('Complete current-source content changes are detected even with the same revision',()=>{
 const state=fresh();assert.equal(F.sameCurrentSource(state,checkpoint),true);const changed=JSON.parse(checkpoint);changed.commands.find(command=>command.type==='receive').payload.receiptReference='CHANGED-SAME-REVISION';assert.equal(F.sameCurrentSource(state,JSON.stringify(changed)),false);assert.throws(()=>F.sameCurrentSource(state,null));assert.throws(()=>F.sameCurrentSource(state,''));
});
test('Workbench and coding-hold evidence restore through replay; altered outcomes fail',()=>{
 const data=F.evidence(approved,'2026-11-18',newId,true);assert.deepEqual(F.restoreEvidence(JSON.stringify(data)).state,approved);assert.equal(F.evidence(approved,'2026-11-18',newId).purchasingCheckpoint,null);
 for(const change of [value=>value.inspection.original.input.quantity=99,value=>value.inspection.evaluation.result.coding.account='Other',value=>value.purchasingCheckpoint.commands.at(-1).payload.evaluatedOn='2026-11-16']){const changed=copy(data);change(changed);assert.throws(()=>F.restoreEvidence(JSON.stringify(changed)));}
 const held={format:'SIMULATED-CODING-HOLD-EVIDENCE',version:1,fictional:true,request:origin,source:{journalRevision:seed.revision,checkpoint:JSON.parse(checkpoint)}};assert.equal(F.fromCodingHold(JSON.stringify(held)).source.choice,'imported');held.request=copy(origin);held.request.input.quantity=99;assert.throws(()=>F.fromCodingHold(JSON.stringify(held)));
});
test('Reviewed coding remains unchanged through separate PO, receipt, invoice and payment controls',()=>{
 let state=F.draft(approved,'2026-11-18',newId);const act=(type,payload)=>{state=J.dispatch(state,{id:'RESOLUTION-'+state.revision,type,actor:J.roles[type],payload});};
 act('approve',{requestId:newId,reason:'Separate fictional Purchasing approval'});const po=state.erp.lines.at(-1);assert.equal(po.codingPolicy.ruleId,'FIN-MAP-001');assert.equal(po.codingPolicy.evaluatedOn,'2026-11-18');assert.deepEqual(po.allocations,state.requests.at(-1).result.coding.allocations);
 act('import',{documentId:'REVIEWED-INVOICE',poLineId:po.id,supplierId:po.supplier,number:'REVIEWED-INVOICE',quantity:po.quantity,priceCents:po.priceCents,currency:'USD'});assert.equal(state.documents.at(-1).status,'Held');assert.throws(()=>J.dispatch(state,{id:'EARLY-POST',type:'post',actor:J.roles.post,payload:{documentId:'REVIEWED-INVOICE'}}));
 act('receive',{poLineId:po.id,receiptReference:'REVIEWED-ACCEPTANCE',quantity:po.quantity});assert.equal(state.documents.at(-1).status,'Ready');for(const type of ['post','authorize','pay'])act(type,{documentId:'REVIEWED-INVOICE'});
 const totals=R.select(R.compile(state)).totals,before=R.select(R.compile(seed)).totals;assert.equal(totals.paid,before.paid+po.quantity*po.priceCents);assert.equal(totals.invoiced,totals.unpaid+totals.paid);assert.deepEqual(state.requests.find(row=>row.id===origin.id),origin);assert.deepEqual(state.erp.lines.slice(0,seed.erp.lines.length),seed.erp.lines);assert.deepEqual(J.restore(J.serialize(state)),state);const recheck=state.audit.find(event=>event.type==='stagePolicyRequest');assert.ok(recheck.simulatedAt.startsWith('2026-11-18'));assert.ok(state.audit.every((event,index)=>index===0||Date.parse(event.simulatedAt)>Date.parse(state.audit[index-1].simulatedAt)));
});
test('A non-unit captured quantity is derived without caller-supplied coding',()=>{
 const source=J.dispatch(J.create(),{id:'QUANTITY-SOURCE',type:'stage',actor:J.roles.stage,payload:{requestId:'QUANTITY-HOLD',itemId:origin.input.itemId,purposeId:origin.input.purposeId,quantity:3}}),state=decide(proposal(F.create(J.serialize(source),'QUANTITY-HOLD','current'))),next=F.draft(state,'2026-11-18','QUANTITY-REVIEWED');
 assert.equal(next.requests.at(-1).input.quantity,3);assert.equal(next.requests.at(-1).result.coding.netCents,600000);const command=next.commands.at(-1);assert.throws(()=>J.dispatch(source,{...command,payload:{...command.payload,account:'Guessed account'}}));
});
test('Management separates retained original holds from actionable missing mappings',()=>{
 const G=require('./bi-prototype/preview/management-model.js'),snapshot=G.compile({...S.example(),purchasing:F.draft(approved,'2026-11-18',newId)});
 assert.equal(snapshot.procurement.codingHolds.length,0);assert.deepEqual(snapshot.procurement.retainedCodingHolds.map(hold=>[hold.id,hold.replacementRequestId]),[[origin.id,newId]]);assert.deepEqual(snapshot.finance.totals,R.select(R.compile(seed)).totals);
});
test('Guarded handoff distinguishes same, changed, absent, damaged and already-applied saved sources',()=>{
 const planned=F.handoffPlan(approved,'2026-11-18',newId,checkpoint);assert(!planned.replaceRequired);assert(!planned.alreadyApplied);assert(F.handoffPlan(approved,'2026-11-18',newId,planned.serialized).alreadyApplied);
 for(const raw of [null,'','{broken',J.serialize(J.create())])assert.throws(()=>F.handoffPlan(approved,'2026-11-18',newId,raw));
 const guided=copy(approved);guided.source.choice='example';assert(F.handoffPlan(guided,'2026-11-18',newId,J.serialize(J.create())).replaceRequired);assert(!F.handoffPlan(guided,'2026-11-18',newId,null).replaceRequired);assert.throws(()=>F.handoffPlan(guided,'2026-11-18',newId,''));assert.equal(J.serialize(seed),checkpoint);
});
console.log('PASS '+checks.length+' connected Finance groups: legacy parity, exact held source, independent dated approval, replay, stale/duplicate guards and end-to-end PO/invoice/payment coding.');
