/* One fictional, command-replayed management snapshot; never writes browser journals. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./journey-rules.js'),require('./machine-rules.js'),require('./work-rules.js'),require('./work-scenarios.js')):factory(root.Journey,root.Machines,root.WorkExecution,root.WorkScenarios);if(typeof module==='object'&&module.exports)module.exports=api;else root.ManagementScenarios=api;})(typeof window!=='undefined'?window:globalThis,function(J,M,W,X){
 'use strict';
 function example(){const seed=X.ready();let purchasing=seed.journey;const maintenance=seed.maintenance,act=(type,payload)=>{purchasing=J.dispatch(purchasing,{id:'MGMT-'+(purchasing.revision+1),type,actor:J.roles[type],payload});};
  const invoice=(id,po,quantity,priceCents)=>act('import',{documentId:id,poLineId:po.id,supplierId:po.supplier,number:id,quantity,priceCents,currency:'USD'});
  invoice('MGMT-PUMP',purchasing.erp.lines[0],1,125000);for(const type of ['post','authorize','pay'])act(type,{documentId:'MGMT-PUMP'});
  act('stage',{requestId:'MGMT-CAPITAL',itemId:'ITEM-PUMP',purposeId:'WORK-CAP',quantity:2});act('approve',{requestId:'MGMT-CAPITAL',reason:'Fictional approved cooling upgrade'});const capital=purchasing.erp.lines.at(-1);act('receive',{poLineId:capital.id,receiptReference:'MGMT-CAPITAL-PART-1',quantity:1});invoice('MGMT-CAPITAL-INVOICE',capital,2,125000);
  act('stage',{requestId:'MGMT-FILTERS',itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',quantity:4});act('approve',{requestId:'MGMT-FILTERS',reason:'Fictional scheduled air-handler service'});const filters=purchasing.erp.lines.at(-1);act('receive',{poLineId:filters.id,receiptReference:'MGMT-FILTER-ACCEPT',quantity:4});invoice('MGMT-FILTER-PRICE',filters,2,6000);invoice('MGMT-FILTER-POSTED',filters,1,5000);act('post',{documentId:'MGMT-FILTER-POSTED'});
  act('stage',{requestId:'MGMT-CONTROLS',itemId:'ITEM-ENGINEERING',purposeId:'WORK-CONTROLS',quantity:1});act('approve',{requestId:'MGMT-CONTROLS',reason:'Fictional approved controls project'});invoice('MGMT-SERVICE-INVOICE',purchasing.erp.lines.at(-1),1,200000);
  act('stage',{requestId:'MGMT-CODING-HOLD',itemId:'ITEM-ENGINEERING',purposeId:'WORK-FILTER',quantity:1});
  const work=W.dispatch(W.create(),{id:'MGMT-EXECUTE',type:'execute',actor:W.roles.execute,payload:{caseId:seed.caseId,completionReference:'MGMT-COMPLETE-1',performedAt:'2026-11-15T09:30:00.000Z',note:'Fictional technician task recorded; independent verification is outstanding.',maintenanceCheckpoint:JSON.parse(M.serialize(maintenance)),purchasingCheckpoint:JSON.parse(J.serialize(purchasing))}});
  return {id:'SYN-MANAGEMENT-1',purchasing,maintenance,work};
 }
 return {example};
});
