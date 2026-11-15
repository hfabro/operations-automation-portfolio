/* Read-only observation model and reviewed maintenance-to-purchasing handoff. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./machine-samples.js'),require('./journey-rules.js'),require('./report-model.js')):factory(root.MachineSamples,root.Journey,root.BusinessReport);if(typeof module==='object'&&module.exports)module.exports=api;else root.Machines=api;})(typeof window!=='undefined'?window:globalThis,function(S,J,R){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const stable=x=>JSON.stringify(sort(x));
 function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;}
 const policy={version:'SYN-CONDITION-1',threshold:5.5,consecutive:3,sampleMs:60000,owner:'Maintenance planner',description:'Fictional teaching rule: three consecutive good one-minute vibration observations above 5.5 mm/s RMS while a fresh good state is RUN. Not a manufacturer limit or diagnostic standard.'};
 const assets=[{id:'PUMP-04',name:'Cooling circulation pump',site:'Lakeside',owner:'Maintenance planner',criticality:'High · scenario assumption',itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR',workOrder:'WO-413'},{id:'AHU-02',name:'Air handling unit',site:'Lakeside',owner:'Maintenance planner',criticality:'Medium · scenario assumption',itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',workOrder:'WO-411'}];
 const tags={state:{unit:'enum',valid:v=>['RUN','STOP'].includes(v)},vibration:{unit:'mm/s RMS',valid:v=>Number.isFinite(v)&&v>=0&&v<=1000},temperature:{unit:'degC',valid:v=>Number.isFinite(v)&&v>=-100&&v<=300}};
 const iso=t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t)&&Number.isFinite(Date.parse(t))&&new Date(t).toISOString()===t;
 function curate(snapshot){
  if(!snapshot||snapshot.fictional!==true||!iso(snapshot.start)||!iso(snapshot.end)||Date.parse(snapshot.end)-Date.parse(snapshot.start)!==1800000||!Array.isArray(snapshot.rows)||snapshot.rows.length>1000)throw Error('Expected a bounded fictional 30-minute observation snapshot.');
  const candidates=[],quarantine=[];
  const reject=(row,ordinal,reason)=>quarantine.push({sourceOrdinal:ordinal,observation:clone(row),reason});
  snapshot.rows.forEach((row,i)=>{
   let reason='';
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||row.id.length>100||Object.keys(row).some(k=>!['id','asset','tag','timestamp','sequence','value','unit','quality'].includes(k)))reason='Invalid observation schema';
   else if(!assets.some(a=>a.id===row.asset))reason='Unknown asset mapping';
   else if(!tags[row.tag])reason='Unknown tag';
   else if(!iso(row.timestamp)||row.timestamp<snapshot.start||row.timestamp>=snapshot.end)reason='Outside capture window or invalid UTC timestamp';
   else if(!Number.isSafeInteger(row.sequence)||row.sequence<1)reason='Invalid source sequence';
   else if(row.unit!==tags[row.tag].unit)reason='Unsupported unit; no implicit conversion';
   else if(!['Good','Bad','Uncertain'].includes(row.quality)||!tags[row.tag].valid(row.value))reason='Invalid quality or value';
   if(reason)reject(row,i+1,reason);else candidates.push({...clone(row),sourceOrdinal:i+1});
  });
  const groups=new Map();for(const r of candidates){if(!groups.has(r.id))groups.set(r.id,[]);groups.get(r.id).push(r);}
  const unique=[];
  for(const group of groups.values()){
   const content=r=>{const {sourceOrdinal,...rest}=r;return stable(rest);};
   if(new Set(group.map(content)).size>1){group.forEach(r=>reject(r,r.sourceOrdinal,'Conflicting observation ID; all copies quarantined'));continue;}
   unique.push(group[0]);group.slice(1).forEach(r=>reject(r,r.sourceOrdinal,'Identical duplicate observation ID'));
  }
  const moments=new Map();for(const r of unique){const k=[r.asset,r.tag,r.timestamp].join('|');if(!moments.has(k))moments.set(k,[]);moments.get(k).push(r);}
  const observations=[];
  for(const group of moments.values()){
   if(group.length>1){group.forEach(r=>reject(r,r.sourceOrdinal,'Ambiguous asset/tag/time; all observations quarantined'));continue;}
   observations.push(group[0]);
  }
  observations.sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.asset.localeCompare(b.asset)||a.tag.localeCompare(b.tag)||a.sequence-b.sequence);
  if(observations.length+quarantine.length!==snapshot.rows.length)throw Error('Observation ledger does not reconcile.');
  return {snapshotId:snapshot.id,start:snapshot.start,end:snapshot.end,sourceCount:snapshot.rows.length,observations,quarantine};
 }
 function stateAt(rows,at){const row=rows.filter(r=>Date.parse(r.timestamp)<=at).at(-1);return row&&row.quality==='Good'&&at-Date.parse(row.timestamp)<policy.sampleMs?{state:row.value,id:row.id,reason:'Fresh good state observation'}:{state:'UNKNOWN',id:row?.id||null,reason:!row?'No state observation':row.quality!=='Good'?'State quality is '+row.quality:'State observation expired'};}
 function analyze(snapshot=S.snapshot(),minute=30){
  if(!Number.isInteger(minute)||minute<0||minute>30)throw Error('Replay position must be a whole minute from 0 to 30.');
  const data=curate(snapshot),start=Date.parse(data.start),cutoff=start+minute*60000;
  const visible=data.observations.filter(r=>Date.parse(r.timestamp)<cutoff),intervals=[],cases=[];
  for(const asset of assets){
   const states=visible.filter(r=>r.asset===asset.id&&r.tag==='state'),bounds=new Set([start,cutoff]);
   for(let tick=start;tick<cutoff;tick+=policy.sampleMs)bounds.add(tick);
   for(const r of states){const time=Date.parse(r.timestamp);bounds.add(time);if(time+policy.sampleMs<cutoff)bounds.add(time+policy.sampleMs);}
   const times=[...bounds].sort((a,b)=>a-b);
   for(let i=0;i<times.length-1;i++)if(times[i+1]>times[i]){const current=stateAt(states,times[i]);intervals.push({id:asset.id+'|'+new Date(times[i]).toISOString(),asset:asset.id,start:new Date(times[i]).toISOString(),end:new Date(times[i+1]).toISOString(),durationMs:times[i+1]-times[i],state:current.state,sourceId:current.id,reason:current.reason});}
   const vibration=visible.filter(r=>r.asset===asset.id&&r.tag==='vibration');let run=[],last=null;const episodes=[];
   for(const r of vibration){const time=Date.parse(r.timestamp),operating=stateAt(states,time);if(r.quality==='Good'&&r.value>policy.threshold&&operating.state==='RUN'){
     run=last!==null&&time-last===policy.sampleMs?[...run,r]:[r];
     if(run.length===policy.consecutive)episodes.push({id:asset.id+'|'+r.timestamp,detectedAt:r.timestamp,sourceIds:run.map(x=>x.id),stateSourceIds:run.map(x=>stateAt(states,Date.parse(x.timestamp)).id),peak:Math.max(...run.map(x=>x.value))});
    }else run=[];last=time;}
   if(episodes.length)cases.push({id:'COND-'+asset.id+'-VIB-20261115',asset:asset.id,owner:asset.owner,ruleVersion:policy.version,firstDetectedAt:episodes[0].detectedAt,episodes,sourceIds:[...new Set(episodes.flatMap(e=>[...e.sourceIds,...e.stateSourceIds]))],status:'Review required'});
  }
  const measures=assets.map(a=>{const rows=intervals.filter(r=>r.asset===a.id),sum=state=>rows.filter(r=>r.state===state).reduce((n,r)=>n+r.durationMs,0),runMs=sum('RUN'),stopMs=sum('STOP'),unknownMs=sum('UNKNOWN'),windowMs=cutoff-start; if(runMs+stopMs+unknownMs!==windowMs)throw Error('State duration reconciliation failed.');return {asset:a.id,windowMs,runMs,stopMs,unknownMs,coverage:windowMs?(runMs+stopMs)/windowMs:null,observedRunShare:runMs+stopMs?runMs/(runMs+stopMs):null};});
  return {format:'SIMULATED-MACHINE-MODEL',version:1,fictional:true,policy:clone(policy),assets:clone(assets),replayMinute:minute,cutoff:new Date(cutoff).toISOString(),...data,visible,intervals,cases,measures};
 }
 function create(){return {schemaVersion:1,snapshotId:'SYN-MACHINE-1',policyVersion:policy.version,revision:0,commands:[],reviews:[],handoffs:[]};}
 const roles={review:'Maintenance reviewer',prepare:'Maintenance planner'};
 function dispatch(state,command){
  const c=clone(command),p=c.payload;
  if(typeof c.id!=='string'||!c.id.trim()||c.id.length>150||!roles[c.type]||roles[c.type]!==c.actor||Object.keys(c).some(k=>!['id','type','actor','payload'].includes(k))||!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid maintenance action or demonstration role.');
  const previous=state.commands.find(x=>x.id===c.id);
  if(previous){if(stable(previous)!==stable(c))throw Error('Maintenance action ID reused with different content.');return clone(state);}
  if(state.revision>=100)throw Error('Maintenance journal is limited to 100 actions.');
  if(!analyze().cases.some(x=>x.id===p.caseId))throw Error('Condition case is not in this fictional snapshot.');
  const s=clone(state);
  if(c.type==='review'){
   if(Object.keys(p).some(k=>!['caseId','decision','note'].includes(k))||!['release','monitor'].includes(p.decision)||typeof p.note!=='string'||!p.note.trim()||p.note.length>250)throw Error('Choose a decision and provide a 1–250 character review reason.');
   if(s.handoffs.some(x=>x.caseId===p.caseId))throw Error('A staged purchasing request retains its reviewed disposition.');
   s.reviews.push({caseId:p.caseId,decision:p.decision,note:p.note.trim(),actor:c.actor,revision:s.revision+1});
  }else{
   if(Object.keys(p).some(k=>k!=='caseId'))throw Error('Purchasing context is derived from the approved asset mapping.');
   if(s.reviews.filter(x=>x.caseId===p.caseId).at(-1)?.decision!=='release')throw Error('Maintenance must release the request before purchasing handoff.');
   if(s.handoffs.some(x=>x.caseId===p.caseId))throw Error('This condition already has a staged purchasing handoff.');
   const condition=analyze().cases.find(x=>x.id===p.caseId),asset=assets.find(a=>a.id===condition.asset);
   s.handoffs.push({caseId:p.caseId,asset:asset.id,requestId:'REQ-'+p.caseId,itemId:asset.itemId,purposeId:asset.purposeId,quantity:1,workOrder:asset.workOrder,revision:s.revision+1});
  }
  s.commands.push(c);s.revision++;return s;
 }
 function restore(text){
  if(typeof text!=='string'||text.length>262144)throw Error('Maintenance checkpoint exceeds 256 KiB.');
  const p=JSON.parse(text);if(p.format!=='SYN-MACHINE-JOURNAL'||p.schemaVersion!==1||p.snapshotId!=='SYN-MACHINE-1'||p.policyVersion!==policy.version||!Array.isArray(p.commands)||p.commands.length>100)throw Error('Unsupported maintenance checkpoint or policy.');
  let s=create();for(const c of p.commands){if(s.commands.some(x=>x.id===c.id))throw Error('Repeated maintenance command ID.');s=dispatch(s,c);}return s;
 }
 function serialize(s){const payload={format:'SYN-MACHINE-JOURNAL',schemaVersion:1,snapshotId:s.snapshotId,policyVersion:s.policyVersion,commands:s.commands};const text=JSON.stringify(payload);if(stable(restore(text))!==stable(s))throw Error('Maintenance state differs from its replayed journal.');return text;}
 function handoff(state,caseId,journey){
  serialize(state);J.assertState(journey);const existing=state.handoffs.find(h=>h.caseId===caseId);
  const next=existing?clone(state):dispatch(state,{id:'HANDOFF-'+caseId,type:'prepare',actor:roles.prepare,payload:{caseId}}),h=next.handoffs.find(h=>h.caseId===caseId);
  const result=J.dispatch(journey,{id:'MACHINE-STAGE-'+caseId,type:'stage',actor:J.roles.stage,payload:{requestId:h.requestId,itemId:h.itemId,purposeId:h.purposeId,quantity:h.quantity}});
  const request=result.requests.find(r=>r.id===h.requestId);
  if(request.result.status!=='ready'||request.result.coding.asset!==h.asset||request.result.coding.workOrder!==h.workOrder)throw Error('Approved purchasing mapping does not match the reviewed asset/work package.');
  return {maintenance:next,journey:result};
 }
 function bridge(state,journey){
  serialize(state);const model=R.compile(journey);
  return state.handoffs.map(h=>{const request=journey.requests.find(r=>r.id===h.requestId),rows=model.costRows.filter(r=>r.sourceRequestId===h.requestId);if(request&&(request.input.itemId!==h.itemId||request.input.purposeId!==h.purposeId||request.input.quantity!==h.quantity||request.result.coding?.asset!==h.asset))throw Error('Linked purchasing request differs from the maintenance handoff.');return {...clone(h),requestStatus:request?.status||'Not in current purchasing journal',account:request?.result.coding?.account||null,policy:request?.result.ruleId||null,poLineId:request?.poLineId||null,costRows:rows,totals:Object.fromEntries(Object.keys(R.measures).map(k=>[k,rows.reduce((n,r)=>n+r[k],0)]))};});
 }
 return {policy:clone(policy),assets:clone(assets),roles:clone(roles),curate,analyze,create,dispatch,serialize,restore,handoff,bridge};
});
