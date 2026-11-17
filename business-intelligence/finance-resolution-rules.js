/* Exact-source Finance review, isolated until an explicit purchasing handoff. */
(function(root,factory){
 const api=typeof module==='object'&&module.exports?factory(require('./journey-rules.js'),require('./policy-review-rules.js')):factory(root.Journey,root.PolicyReview);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceResolution=api;
})(typeof window!=='undefined'?window:globalThis,function(J,P){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
 const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
 function fail(message){throw Error('Finance resolution: '+message);}
 function closed(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('Unsupported or missing evidence fields.');}
 function source(checkpoint,requestId,choice){
  if(!['current','example','imported'].includes(choice))fail('Choose an explicit source context.');
  const purchasing=J.restore(typeof checkpoint==='string'?checkpoint:JSON.stringify(checkpoint)),request=purchasing.requests.find(row=>row.id===requestId);
  if(!request||request.status!=='Held'||request.result.code!=='NO_APPROVED_MAPPING')fail('The source must contain this exact missing-mapping hold.');
  if(purchasing.requests.some(row=>row.policySource?.sourceRequestId===request.id))fail('This hold already has a reviewed replacement draft.');
  return {choice,requestId:request.id,checkpoint:JSON.parse(J.serialize(purchasing))};
 }
 function create(checkpoint,requestId,choice){return {format:'SIMULATED-FINANCE-RESOLUTION',version:1,source:source(checkpoint,requestId,choice),finance:P.create()};}
 function inspect(state,on){
  closed(state,['format','version','source','finance']);closed(state.source,['choice','requestId','checkpoint']);
  if(state.format!=='SIMULATED-FINANCE-RESOLUTION'||state.version!==1)fail('Unsupported workbench version.');
  const retained=source(state.source.checkpoint,state.source.requestId,state.source.choice);if(!same(retained,state.source))fail('Source differs from its canonical checkpoint.');
  const purchasing=J.restore(JSON.stringify(retained.checkpoint)),original=purchasing.requests.find(row=>row.id===retained.requestId),finance=P.restore(P.serialize(state.finance)),evaluation=P.evaluateRequest(finance,on,original.input),projected=P.project(finance);
  if(projected.proposals.length>1||projected.proposals.some(proposal=>proposal.id!=='MAP-001')||finance.commands.some(command=>!['PERSON-A','PERSON-B'].includes(command.actor.personId)))fail('This workbench supports one MAP-001 proposal with Person A/B.');
  return {original:clone(original),sourceRevision:purchasing.revision,evaluation,proposals:projected.proposals};
 }
 function dispatch(state,command){inspect(state,'2026-11-18');const next=clone(state);next.finance=P.dispatch(state.finance,command);inspect(next,'2026-11-18');return next;}
 function draft(state,on,newRequestId){
  inspect(state,on);const purchasing=J.restore(JSON.stringify(state.source.checkpoint));
  return J.dispatch(purchasing,{id:'FINANCE-RECHECK:'+state.source.requestId,type:'stagePolicyRequest',actor:J.roles.stagePolicyRequest,expectedRevision:purchasing.revision,payload:{sourceRequestId:state.source.requestId,newRequestId,financeCheckpoint:JSON.parse(P.serialize(state.finance)),evaluatedOn:on}});
 }
 function sameCurrentSource(state,raw){
  if(state.source.choice!=='current')fail('This source is not a saved-current handoff.');
  if(raw===null)fail('The captured current source is now missing.');
  const current=J.restore(raw);return J.serialize(current)===JSON.stringify(state.source.checkpoint);
 }
 function handoffPlan(state,on,newRequestId,raw){
  const serialized=J.serialize(draft(state,on,newRequestId));
  if(raw===null){if(state.source.choice==='current')fail('The captured saved source is now missing.');return {serialized,replaceRequired:false,alreadyApplied:false};}
  const current=J.serialize(J.restore(raw));if(current===serialized)return {serialized,replaceRequired:false,alreadyApplied:true};
  const sameSource=current===JSON.stringify(state.source.checkpoint);
  if(state.source.choice==='current'&&!sameSource)fail('Saved source changed after capture. Preserve it and start a fresh review.');
  return {serialized,replaceRequired:!sameSource,alreadyApplied:false};
 }
 async function fingerprint(checkpoint){
  const canonical=J.serialize(J.restore(typeof checkpoint==='string'?checkpoint:JSON.stringify(checkpoint)));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
 }
 function evidence(state,on,newRequestId,draftCreated=false){
  if(typeof newRequestId!=='string'||typeof draftCreated!=='boolean')fail('Use an explicit draft ID and creation state.');
  const inspection=inspect(state,on),checkpoint=draftCreated?JSON.parse(J.serialize(draft(state,on,newRequestId))):null;
  return {format:'SIMULATED-FINANCE-RESOLUTION-EVIDENCE',version:1,fictional:true,state:clone(state),on,newRequestId,draftCreated,inspection,purchasingCheckpoint:checkpoint};
 }
 function restoreEvidence(text){
  if(typeof text!=='string'||text.length>3145728)fail('Choose a workbench file at most 3 MiB.');
  const data=JSON.parse(text);closed(data,['format','version','fictional','state','on','newRequestId','draftCreated','inspection','purchasingCheckpoint']);
  if(!same(data,evidence(data.state,data.on,data.newRequestId,data.draftCreated)))fail('Evidence differs from replayed decisions or source content.');
  return {state:clone(data.state),on:data.on,newRequestId:data.newRequestId,draftCreated:data.draftCreated};
 }
 function fromCodingHold(text){
  if(typeof text!=='string'||text.length>2097152)fail('Choose coding-hold evidence at most 2 MiB.');const data=JSON.parse(text);
  if(data.format!=='SIMULATED-CODING-HOLD-EVIDENCE'||data.version!==1||data.fictional!==true||!data.request||!data.source?.checkpoint)fail('Choose a captured coding-hold evidence file.');
  const state=create(data.source.checkpoint,data.request.id,'imported'),checked=inspect(state,'2026-11-18');
  if(!same(checked.original,data.request)||checked.sourceRevision!==data.source.journalRevision)fail('Captured hold differs from its purchasing checkpoint.');return state;
 }
 return {create,inspect,dispatch,draft,sameCurrentSource,handoffPlan,fingerprint,evidence,restoreEvidence,fromCodingHold};
});
