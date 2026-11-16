/* Read-only ancestry of recorded work against the currently available journals. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./work-rules.js'),require('./machine-rules.js'),require('./journey-rules.js')):factory(root.WorkExecution,root.Machines,root.Journey);if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkContext=api;})(typeof window!=='undefined'?window:globalThis,function(W,M,J){
 'use strict';
 const stable=value=>JSON.stringify(sort(value));
 function sort(value){return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;}
 const labels={current:'Linked to current journals',retained:'Retained earlier context',unavailable:'Current context unavailable'};
 function current(api,state){if(state===null||state===undefined)return {checkpoint:null,reason:'No readable saved journal is available.'};try{const replayed=api.restore(api.serialize(state));if(stable(replayed)!==stable(state))throw Error('State differs from replayed commands.');return {checkpoint:JSON.parse(api.serialize(replayed)),reason:null};}catch(error){return {checkpoint:null,reason:'Current journal could not be validated: '+error.message};}}
 function compare(api,captured,available){
  const source=JSON.parse(api.serialize(api.restore(JSON.stringify(captured)))),sourceCommands=source.commands;
  if(!available.checkpoint)return {relation:'unavailable',capturedRevision:sourceCommands.length,currentRevision:null,detail:available.reason};
  const target=available.checkpoint,{commands:ignoredSource,...sourceHeader}=source,{commands:ignoredTarget,...targetHeader}=target;
  const compatible=stable(sourceHeader)===stable(targetHeader)&&sourceCommands.length<=target.commands.length&&sourceCommands.every((command,index)=>stable(command)===stable(target.commands[index]));
  return {relation:compatible?(sourceCommands.length===target.commands.length?'same':'extended'):'different',capturedRevision:sourceCommands.length,currentRevision:target.commands.length,detail:compatible?'Captured source is the same journal or an exact command-history ancestor.':'Current journal does not extend the captured source; the original work evidence is retained.'};
 }
 function inspect(work,{purchasing=null,maintenance=null}={}){
  W.serialize(work);const available={purchasing:current(J,purchasing),maintenance:current(M,maintenance)},last=new Map(work.work.map(record=>[record.caseId,record.id]));
  const records=work.work.map(record=>{const command=work.commands[record.revision-1],p=compare(J,command.payload.purchasingCheckpoint,available.purchasing),m=compare(M,command.payload.maintenanceCheckpoint,available.maintenance),relations=[p.relation,m.relation],context=relations.includes('unavailable')?'unavailable':relations.includes('different')?'retained':'current',review=work.reviews.find(r=>r.workId===record.id);return {workId:record.id,caseId:record.caseId,isLatest:last.get(record.caseId)===record.id,verificationStatus:!review?'Awaiting independent verification':review.decision==='accept'?'Verified complete in simulation':'Returned for rework',context,label:labels[context],purchasing:p,maintenance:m};});
  const verified={current:0,retained:0,unavailable:0};for(const record of records)if(record.isLatest&&record.verificationStatus==='Verified complete in simulation')verified[record.context]++;
  return {format:'SIMULATED-WORK-CONTEXT',version:1,fictional:true,rule:'A captured source must equal or be an exact command-history ancestor of both current validated journals. Revision numbers or matching IDs alone do not establish lineage. Counts use only the latest work version per case.',verified,records};
 }
 return {inspect,labels};
});
