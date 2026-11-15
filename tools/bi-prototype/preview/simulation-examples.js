(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./journey-rules.js')):factory(root.Journey);if(typeof module==='object'&&module.exports)module.exports=api;else root.SimulationExamples=api;})(typeof window!=='undefined'?window:globalThis,function(J){
 'use strict';
 function multiLine(){let s=J.create();const act=(type,payload)=>{s=J.dispatch(s,{id:'EXAMPLE-'+(s.revision+1),type,actor:J.roles[type],payload});};
  act('stage',{requestId:'REQ-UPGRADE',itemId:'ITEM-PUMP',purposeId:'WORK-CAP',quantity:2});act('approve',{requestId:'REQ-UPGRADE',reason:'Simulated purchasing authorization for upgrade'});
  act('stage',{requestId:'REQ-REPAIR',itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR',quantity:1});act('approve',{requestId:'REQ-REPAIR',reason:'Simulated purchasing authorization for routine repair'});
  act('receive',{poLineId:s.erp.lines[0].id,receiptReference:'UPGRADE-PART-1',quantity:1});act('receive',{poLineId:s.erp.lines[1].id,receiptReference:'REPAIR-ACCEPT-1',quantity:1});
  act('importDocument',{documentId:'DOC-MULTI-001',supplierId:'SYN-SUP-01',number:'SIM-MULTI-001',currency:'USD',declaredNetCents:385000,sourceLabel:'Simulated original invoice',lines:[{poLineId:s.erp.lines[0].id,quantity:2,priceCents:125000},{poLineId:s.erp.lines[1].id,quantity:1,priceCents:135000}]});return s;
 }
 return {multiLine};
});
