(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./journey-rules.js'),require('./batch-rules.js')):factory(root.Journey,root.InvoiceBatch);if(typeof module==='object'&&module.exports)module.exports=api;else root.BatchScenarios=api;})(typeof window!=='undefined'?window:globalThis,function(J,B){
 'use strict';function example(){let journey=J.create();const act=(type,payload)=>{journey=J.dispatch(journey,{id:'CSV-EXAMPLE-'+(journey.revision+1),type,actor:J.roles[type],payload});};
  for(const [requestId,itemId,purposeId,quantity]of [['CSV-REPAIR','ITEM-PUMP','WORK-REPAIR',4],['CSV-UPGRADE','ITEM-PUMP','WORK-CAP',2],['CSV-FILTER','ITEM-FILTER','WORK-FILTER',4]]){act('stage',{requestId,itemId,purposeId,quantity});act('approve',{requestId,reason:'Fictional purchasing authorization for batch demonstration'});}
  for(const [index,quantity]of [[0,4],[1,1],[2,2]])act('receive',{poLineId:journey.erp.lines[index].id,receiptReference:'CSV-ACCEPT-'+index,quantity});
  const [repair,upgrade,filter]=journey.erp.lines.map(l=>l.id),rows=[],add=(id,supplier,ref,header,line,po,qty,price,currency='USD')=>rows.push({documentId:id,entityId:'SYN-CO-01',supplierId:supplier,invoiceReference:ref,currency,headerNet:header,lineNumber:String(line),poLineId:po,quantity:String(qty),unitPrice:price});
  add('BATCH-MULTI','SYN-SUP-01','BATCH-MULTI-1','2500.00',1,repair,1,'1250.00');add('BATCH-MULTI','SYN-SUP-01','BATCH-MULTI-1','2500.00',2,upgrade,1,'1250.00');
  add('BATCH-PRICE','SYN-SUP-01','BATCH-PRICE-1','1350.00',1,repair,1,'1350.00');
  add('BATCH-NO-PO','SYN-SUP-01','BATCH-NO-PO-1','100.00',1,'',1,'100.00');
  add('BATCH-DUP-A','SYN-SUP-01','BATCH-DUPLICATE','1250.00',1,repair,1,'1250.00');add('BATCH-DUP-B','SYN-SUP-01','BATCH-DUPLICATE','1250.00',1,repair,1,'1250.00');
  add('BATCH-COMPETE-A','SYN-SUP-02','BATCH-FILTER-A','100.00',1,filter,2,'50.00');add('BATCH-COMPETE-B','SYN-SUP-02','BATCH-FILTER-B','50.00',1,filter,1,'50.00');
  add('BATCH-FX','SYN-SUP-01','BATCH-FX-1','1250.00',1,repair,1,'1250.00','EUR');
  return {journey,rows,csv:B.toCSV(rows),batchId:'SIM-BATCH-01'};
 }
 return {example};
});
