/* Recorded work and independent review; payment or normal readings cannot close work alone. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./machine-rules.js'),require('./journey-rules.js'),require('./work-samples.js')):factory(root.Machines,root.Journey,root.WorkSamples);if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkExecution=api;})(typeof window!=='undefined'?window:globalThis,function(M,J,S){
 'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),stable=x=>JSON.stringify(sort(x));
 function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;}
 const policy={version:'SYN-WORK-1',sourceSnapshotId:'SYN-WORK-OBSERVATIONS-1',requiredGoodMinutes:30,rule:'Record work only after the linked material acceptance. Close only after a separate verification decision and the complete fictional post-work quality window.'},roles={execute:'Maintenance technician',verify:'Maintenance verifier'};
 const iso=t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t)&&Number.isFinite(Date.parse(t))&&new Date(t).toISOString()===t;
 function text(value,name,max=250){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(name+' is required (1–'+max+' characters).');return value.trim();}
 function create(){return {schemaVersion:1,policyVersion:policy.version,revision:0,commands:[],work:[],reviews:[]};}
 function readiness(maintenance,journey,caseId){
  M.serialize(maintenance);J.assertState(journey);const h=M.bridge(maintenance,journey).find(h=>h.caseId===caseId);
  if(!h)return {ready:false,reason:'Release the condition and stage its governed requisition first.'};
  const request=journey.requests.find(r=>r.id===h.requestId),po=journey.erp.lines.find(p=>p.id===request?.poLineId);
  if(!po)return {ready:false,reason:'Purchasing must approve the linked requisition and create its PO.',...h};
  const receipts=journey.receipts.filter(r=>r.poLineId===po.id),accepted=receipts.reduce((n,r)=>n+r.quantity,0);
  return {...h,ready:accepted>=h.quantity,reason:accepted>=h.quantity?'Linked material is accepted; work can be recorded.':'Record the linked material acceptance before work completion.',acceptedQuantity:accepted,requiredQuantity:h.quantity,receipts:clone(receipts),latestAcceptedAt:receipts.map(r=>journey.audit.find(a=>a.sequence===r.revision)?.simulatedAt).filter(Boolean).sort().at(-1)||null};
 }
 function latest(s,caseId){return s.work.filter(w=>w.caseId===caseId).at(-1);}
 function status(s,caseId){const work=latest(s,caseId);if(!work)return 'No completion recorded';const review=s.reviews.find(r=>r.workId===work.id);return !review?'Awaiting independent verification':review.decision==='accept'?'Verified complete in simulation':'Returned for rework';}
 function dispatch(state,command){
  const c=clone(command),p=c.payload;
  if(!c||!roles[c.type]||roles[c.type]!==c.actor||typeof c.id!=='string'||!c.id.trim()||c.id.length>150||Object.keys(c).some(k=>!['id','type','actor','payload'].includes(k))||!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid work command or demonstration role.');
  const existing=state.commands.find(x=>x.id===c.id);if(existing){if(stable(existing)!==stable(c))throw Error('Work command ID reused with different content.');return clone(state);}
  if(state.commands.length>=100)throw Error('Work journal is limited to 100 commands.');
  const s=clone(state),previous=latest(s,p.caseId);
  if(c.type==='execute'){
   if(Object.keys(p).some(k=>!['caseId','completionReference','performedAt','note','maintenanceCheckpoint','purchasingCheckpoint'].includes(k)))throw Error('Work context must come from the linked validated journals.');
   const reference=text(p.completionReference,'Completion reference',80),note=text(p.note,'Work performed note');
   if(!iso(p.performedAt))throw Error('Use an explicit canonical UTC completion timestamp.');
   if(previous&&status(s,p.caseId)!=='Returned for rework')throw Error('The latest work is awaiting verification or already verified complete.');
   if(s.work.some(w=>w.reference.toUpperCase()===reference.toUpperCase()))throw Error('Completion reference already recorded.');
   const maintenance=M.restore(JSON.stringify(p.maintenanceCheckpoint)),journey=J.restore(JSON.stringify(p.purchasingCheckpoint)),ready=readiness(maintenance,journey,p.caseId);
   if(!ready.ready)throw Error(ready.reason);
   if(!ready.latestAcceptedAt||p.performedAt<ready.latestAcceptedAt)throw Error('Work time must be on or after the recorded material acceptance.');
   s.work.push({id:'WORK-'+String(s.work.length+1).padStart(4,'0'),caseId:p.caseId,reference,performedAt:p.performedAt,note,actor:c.actor,revision:s.revision+1,asset:ready.asset,requestId:ready.requestId,poLineId:ready.poLineId,workOrder:ready.workOrder,receiptEvidence:ready.receipts,sourcePurchasingRevision:journey.revision,sourceMaintenanceRevision:maintenance.revision});
  }else{
   if(Object.keys(p).some(k=>!['caseId','workId','decision','reason','sourceSnapshotId'].includes(k))||!['accept','return'].includes(p.decision))throw Error('Choose accept or return for the current work record.');
   if(!previous||previous.id!==p.workId)throw Error('Verification must identify the latest recorded work.');
   if(s.reviews.some(r=>r.workId===previous.id))throw Error('This work version already has a verification decision.');
   const reason=text(p.reason,'Verification reason');let evidence=null;
   if(p.decision==='accept'){
    if(p.sourceSnapshotId!==policy.sourceSnapshotId)throw Error('Choose the admitted fictional verification snapshot.');
    const model=M.analyze(S.snapshot()),measure=model.measures.find(m=>m.asset===previous.asset),vibration=model.visible.filter(r=>r.asset===previous.asset&&r.tag==='vibration');
    if(model.start<previous.performedAt)throw Error('Verification observations must start after recorded work completion.');
    if(!measure||measure.unknownMs||measure.stopMs||measure.windowMs!==policy.requiredGoodMinutes*60000||vibration.length!==policy.requiredGoodMinutes||vibration.some(r=>r.quality!=='Good'||r.value>M.policy.threshold)||model.quarantine.some(q=>q.observation?.asset===previous.asset))throw Error('The complete good post-work observation window is required.');
    evidence={snapshotId:model.snapshotId,start:model.start,end:model.end,goodMinutes:policy.requiredGoodMinutes,peakVibration:Math.max(...vibration.map(r=>r.value)),unit:'mm/s RMS',sourceIds:model.visible.filter(r=>r.asset===previous.asset&&['state','vibration'].includes(r.tag)).map(r=>r.id)};
   }else if(p.sourceSnapshotId!==null)throw Error('A returned review does not claim an accepted verification snapshot.');
   s.reviews.push({workId:previous.id,caseId:p.caseId,decision:p.decision,reason,actor:c.actor,revision:s.revision+1,evidence});
  }
  s.commands.push(c);s.revision++;return s;
 }
 function restore(value){if(typeof value!=='string'||value.length>2097152)throw Error('Work checkpoint exceeds 2 MiB.');const p=JSON.parse(value);if(p.format!=='SYN-WORK-JOURNAL'||p.schemaVersion!==1||stable(p.policySnapshot)!==stable(policy)||!Array.isArray(p.commands)||p.commands.length>100)throw Error('Unsupported work checkpoint or policy snapshot.');let s=create();for(const c of p.commands){if(s.commands.some(x=>x.id===c.id))throw Error('Repeated work command ID.');s=dispatch(s,c);}return s;}
 function serialize(s){const value=JSON.stringify({format:'SYN-WORK-JOURNAL',schemaVersion:1,policySnapshot:policy,commands:s.commands});if(stable(restore(value))!==stable(s))throw Error('Work state differs from its replayed commands.');return value;}
 return {policy:clone(policy),roles:clone(roles),create,readiness,latest,status,dispatch,restore,serialize};
});
