/* Read-only consistency checks for the current authored simulation profile. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./journey-rules.js'),require('./machine-rules.js'),require('./report-model.js'),require('./work-rules.js'),require('./work-context.js'),require('./work-samples.js')):factory(root.Journey,root.Machines,root.BusinessReport,root.WorkExecution,root.WorkContext,root.WorkSamples);if(typeof module==='object'&&module.exports)module.exports=api;else root.EvidenceBundleReview=api;})(typeof window!=='undefined'?window:globalThis,function(J,M,R,W,C,S){
 'use strict';
 const maxBytes=2*1024*1024,profile='CURRENT-CONNECTED-SIMULATION-1';
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const json=value=>JSON.parse(JSON.stringify(value));
 function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(object(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';return JSON.stringify(value);}
 function review(input){
  if(!object(input))throw Error('Choose an evidence bundle object.');
  const text=JSON.stringify(input);if(text.length>maxBytes)throw Error('The supported review limit is 2 MiB.');const bundle=JSON.parse(text);
  if(bundle.format!=='SIMULATED-CONNECTED-BUSINESS-EVIDENCE'||bundle.version!==1||bundle.fictional!==true)throw Error('This file is outside the supported fictional evidence profile.');
  if(!object(bundle.journalSources))throw Error('Journal source metadata is missing. Use a current hub evidence download.');
  const definitions=[['purchasing','Purchasing','CURRENT-PURCHASING-JOURNAL',J],['maintenance','Maintenance','CURRENT-MAINTENANCE-JOURNAL',M],['work','Work','CURRENT-WORK-JOURNAL',W]],states={},sources=[],checks=[];
  for(const [name,label,namespace,api]of definitions){
   const block=bundle[name],source=bundle.journalSources[name];if(!object(block)||block.namespace!==namespace||!object(block.checkpoint)||!object(source))throw Error(label+' source or checkpoint is missing or unsupported.');
   if(!['saved','absent'].includes(source.availability))throw Error(label+' source availability is unsupported.');
   let state;try{state=api.restore(JSON.stringify(block.checkpoint));}catch(error){throw Error(label+' checkpoint cannot be replayed: '+error.message);}
   if(stable(block.checkpoint)!==stable(JSON.parse(api.serialize(state))))throw Error(label+' checkpoint differs from canonical replay.');
   if(source.availability==='saved'){
    if(!Number.isSafeInteger(source.savedRevision)||source.savedRevision!==state.revision||source.snapshotOrigin!=='validated-saved-journal')throw Error(label+' saved-source metadata differs from its checkpoint.');
   }else if(source.savedRevision!==null||source.snapshotOrigin!=='unsaved-empty-default'||stable(block.checkpoint)!==stable(JSON.parse(api.serialize(api.create()))))throw Error(label+' absent source must contain its declared unsaved empty default.');
   states[name]=state;sources.push({name,label,availability:source.availability,savedRevision:source.savedRevision,snapshotOrigin:source.snapshotOrigin});checks.push(label+' source metadata and checkpoint replay');
  }
  function match(label,provided,expected){if(provided===undefined||stable(provided)!==stable(json(expected)))throw Error(label+' does not reconcile with the supported journal/scenario replay.');checks.push(label);}
  match('Purchasing analytical model',bundle.purchasing.model,R.compile(states.purchasing));
  match('Maintenance purchasing bridge',bundle.maintenance.costBridge,M.bridge(states.maintenance,states.purchasing));
  if(!object(bundle.machine)||bundle.machine.namespace!=='SYN-MACHINE-1')throw Error('The authored machine scenario is missing or unsupported.');
  match('Authored machine scenario',bundle.machine.model,M.analyze());
  match('Work records and verification decisions',{workRecords:bundle.work.workRecords,verificationDecisions:bundle.work.verificationDecisions},{workRecords:states.work.work,verificationDecisions:states.work.reviews});
  match('Work source linkage',bundle.work.contextEvidence,C.inspect(states.work,{purchasing:bundle.journalSources.purchasing.availability==='saved'?states.purchasing:null,maintenance:bundle.journalSources.maintenance.availability==='saved'?states.maintenance:null}));
  match('Authored verification observations',bundle.work.verificationObservations,M.analyze(S.snapshot()));
  return {format:'SIMULATED-EVIDENCE-CONSISTENCY-REVIEW',version:1,fictional:true,profile,sources,checks,scope:'Consistency within the current authored simulation profile; file authorship requires separate verification.'};
 }
 return Object.freeze({review,maxBytes,profile});
});
