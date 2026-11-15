/* Structured, single-line invoice triage. Sorting never posts, approves, or pays. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./erp-rules.js'),require('./coding-rules.js')):factory(root.ERP,root.Coding);if(typeof module==='object'&&module.exports)module.exports=api;else root.InvoiceIntake=api;})(typeof window!=='undefined'?window:globalThis,function(E,C){
 'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
 const headers=['documentId','entityId','supplierId','supplierName','invoiceReference','poLineId','quantity','unitPrice','currency'];
 const queues={ready:'Ready for AP review',identity:'Supplier identity review',reference:'PO reference review',nonpo:'Non-PO policy review',duplicate:'Duplicate / multi-line review',receipt:'Receipt or acceptance review',price:'Price variance review',combined:'Combined quantity review',data:'Document data review'};
 function snapshot(){const m=C.master(),state=E.seed();const coding=C.resolve({itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR',quantity:1},m).coding;
  state.lines.push({id:'PO-26004/001',po:'PO-26004',supplier:coding.supplier,description:coding.description,unit:coding.unit,quantity:1,priceCents:coding.unitPriceCents,received:1,site:coding.site,category:coding.category,account:coding.account,treatment:coding.treatment,project:coding.project,asset:coding.asset,workOrder:coding.workOrder,allocations:copy(coding.allocations),invoices:[]});
  return {entityId:'SYN-CO-01',version:'SYN-INTAKE-SNAPSHOT-1',currency:'USD',accounts:copy(m.accounts),centers:copy(m.centers),erp:state,suppliers:[{id:'SYN-SUP-01',name:'Fictional Pump Supply',aliases:['Fictional Pump Supply','Fictional Pump Supply LLC'],approved:true},{id:'SYN-SUP-02',name:'Fictional Filter Supply',aliases:['Fictional Filter Supply'],approved:true},{id:'SYN-SUP-03',name:'Fictional Engineering Services',aliases:['Fictional Engineering Services'],approved:true}]};
 }
 function cents(value){const s=String(value);if(!/^\d+(\.\d{1,2})?$/.test(s))return null;const [a,b='']=s.split('.'),result=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));return result>0n&&result<=BigInt(Number.MAX_SAFE_INTEGER)?Number(result):null;}
 function supplier(row,s){const id=norm(row.supplierId),name=norm(row.supplierName),byName=s.suppliers.filter(v=>v.aliases.some(a=>norm(a)===name));
  if(id){const v=s.suppliers.find(v=>norm(v.id)===id);if(!v||!v.approved)return {error:'Supplier ID is unknown or not approved.'};if(name&&(!byName.some(n=>n.id===v.id)||byName.length!==1))return {error:'Supplier name and ID do not identify one approved supplier.'};return {value:v,source:'Approved supplier ID'+(name?' and exact alias':'')};}
  if(byName.length!==1||!byName[0].approved)return {error:'Supplier name must resolve to one exact approved alias. No fuzzy identification was applied.'};return {value:byName[0],source:'Exact approved supplier alias'};
 }
 function analyze(rows,s=snapshot()){
  if(!Array.isArray(rows)||rows.length>1000)throw Error('Use no more than 1,000 structured invoice rows.');
  const results=rows.map((row,index)=>{const r={index,documentId:String(row.documentId||''),input:copy(row),queue:'data',owner:'AP intake',reasons:[],coding:null,snapshotVersion:s.version};
   const set=(queue,owner,reason)=>{r.queue=queue;r.owner=owner;r.reasons.push(reason);return r;};
   if(Object.keys(row).some(k=>!headers.includes(k)))return set('data','AP intake','Unsupported fields supplied; cost coding is inherited from the PO, not the invoice file.');
   if(!norm(row.documentId)||!norm(row.invoiceReference)||Object.values(row).some(v=>String(v).length>250))return set('data','AP intake','Document ID and invoice reference are required; fields are limited to 250 characters.');
   if(norm(row.entityId)!==s.entityId)return set('data','AP intake','Entity does not match this single-entity snapshot.');
   const resolved=supplier(row,s);if(resolved.error)return set('identity','Supplier master-data owner',resolved.error);
   r.supplierId=resolved.value.id;r.supplierName=resolved.value.name;r.identitySource=resolved.source;r.reference=norm(row.invoiceReference);
   if(norm(row.currency)!==s.currency)return set('data','AP intake','Currency does not match this USD-only snapshot.');
   const quantity=typeof row.quantity==='number'?row.quantity:/^\d+$/.test(String(row.quantity))?Number(row.quantity):NaN,price=cents(row.unitPrice);
   if(!Number.isSafeInteger(quantity)||quantity<=0||price===null||!Number.isSafeInteger(quantity*price))return set('data','AP intake','Quantity must be positive whole units; price must be a positive exact-cent amount.');
   r.quantity=quantity;r.priceCents=price;r.netCents=quantity*price;
   if(!norm(row.poLineId))return set('nonpo','Procurement policy owner','No PO line supplied. An approved non-PO route must be determined; no cost code was inferred from the vendor.');
   const line=s.erp.lines.find(l=>norm(l.id)===norm(row.poLineId));if(!line)return set('reference','Purchasing','PO line does not exist in the approved snapshot.');
   if(line.supplier!==r.supplierId)return set('reference','Purchasing','Invoice supplier does not match the PO supplier.');
   r.poLineId=line.id;r.coding=copy({account:line.account,category:line.category,site:line.site,project:line.project,asset:line.asset,workOrder:line.workOrder,allocations:line.allocations,source:'Approved fictional PO line '+line.id});
   try{E.validateLine(line);if(!s.accounts.includes(line.account)||line.allocations.some(a=>s.centers[a.costCenter]!==a.department))throw Error('Account or department/cost-center mapping is not in the approved snapshot.');}catch(error){r.coding=null;return set('reference','Purchasing','PO snapshot failed its internal controls: '+error.message);}
   const posted=s.erp.lines.some(l=>l.supplier===r.supplierId&&l.invoices.some(i=>norm(i.number)===r.reference));
   if(posted)return set('duplicate','AP duplicate review','Supplier invoice reference is already present in the posted snapshot. Review the original document before further processing.');
   const match=E.match(s.erp,line.id,{number:r.reference,quantity,priceCents:price});
   if(!match.eligible){const amount=line.quantity-line.invoices.reduce((a,i)=>a+i.quantity,0);if(quantity>amount)return set('reference','Purchasing',match.reasons.join(' '));if(quantity>line.received-line.invoices.reduce((a,i)=>a+i.quantity,0))return set('receipt','Receiving / service owner',match.reasons.join(' '));return set('price','Buyer / AP',match.reasons.join(' '));}
   return set('ready','AP review','Supplier, PO coding, accepted quantity, duplicate reference, and matching tolerance passed. Posting and payment controls remain separate.');
  });
  // All occurrences of a duplicate group are held; do not make the first input row win.
  const referenceGroups=new Map(),documentGroups=new Map();
  for(const r of results){const key=r.supplierId&&r.reference?r.supplierId+'|'+r.reference:null;if(key){if(!referenceGroups.has(key))referenceGroups.set(key,[]);referenceGroups.get(key).push(r);}const doc=norm(r.documentId);if(doc){if(!documentGroups.has(doc))documentGroups.set(doc,[]);documentGroups.get(doc).push(r);}}
  for(const group of [...referenceGroups.values(),...documentGroups.values()])if(group.length>1)for(const r of group){r.queue='duplicate';r.owner='AP duplicate review';r.reasons.push('Repeated document ID or supplier invoice reference in this batch. This may be a duplicate document or an unsupported multi-line invoice; all related rows are held.');}
  const candidates=new Map();for(const r of results)if(r.queue==='ready'){if(!candidates.has(r.poLineId))candidates.set(r.poLineId,[]);candidates.get(r.poLineId).push(r);}
  for(const [id,group] of candidates){const l=s.erp.lines.find(l=>l.id===id),posted=l.invoices.reduce((sum,i)=>sum+i.quantity,0),available=Math.min(l.quantity,l.received)-posted;
   if(group.reduce((sum,r)=>sum+r.quantity,0)>available)for(const r of group){r.queue='combined';r.owner='AP / Receiving';r.reasons.push('Individually eligible invoices jointly exceed accepted uninvoiced quantity. Review all competing candidates; no row-order priority was applied.');}}
  const counts=Object.fromEntries(Object.keys(queues).map(k=>[k,results.filter(r=>r.queue===k).length]));
  return {snapshotVersion:s.version,total:results.length,counts,results,erpUnchanged:true,scope:'Structured, single-line invoice triage only. No posting, approval, payment or live ERP write.'};
 }
 function parseCSV(text){
  if(typeof text!=='string'||text.length>262144)throw Error('CSV is limited to 256 KiB of text.');text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  function emit(){row.push(field);field='';closed=false;}
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;continue;}
   if(closed&&ch!==','&&ch!=='\r'&&ch!=='\n')throw Error('Unexpected text after a quoted CSV field.');
   if(ch==='"'){if(field)throw Error('Unexpected quote in unquoted field.');quoted=true;}
   else if(ch===',')emit();else if(ch==='\r'||ch==='\n'){emit();if(row.some(v=>v!==''))rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++;}else field+=ch;
  }
  if(quoted)throw Error('Unclosed quoted CSV field.');if(field||row.length||closed){emit();if(row.some(v=>v!==''))rows.push(row);}
  if(rows.length<2)throw Error('CSV needs a header and at least one data row.');const names=rows.shift();if(names.length!==headers.length||names.some((v,i)=>v!==headers[i]))throw Error('Use the exact sample CSV column names and order.');
  if(rows.length>1000)throw Error('CSV is limited to 1,000 invoice rows.');
  return rows.map((values,index)=>{if(values.length!==headers.length)throw Error('Wrong field count at data row '+(index+1));return Object.fromEntries(headers.map((name,i)=>[name,values[i]]));});
 }
 function sample(){const row=(id,supplierId,supplierName,ref,po,quantity,unitPrice,currency='USD')=>({documentId:id,entityId:'SYN-CO-01',supplierId,supplierName,invoiceReference:ref,poLineId:po,quantity,unitPrice,currency});return [
  row('DOC-001','SYN-SUP-02','Fictional Filter Supply','FILTER-NEW-1','PO-26002/001',1,'50.00'),
  row('DOC-002','SYN-SUP-01','Fictional Pump Supply','PUMP-PARTIAL','PO-26001/001',2,'1250.00'),
  row('DOC-003','SYN-SUP-01','Fictional Pump Supply LLC','PUMP-REPAIR','PO-26004/001',1,'1250.00'),
  row('DOC-004','SYN-SUP-01','Fictional Pump Supply','NO-PO-1','',1,'100.00'),
  row('DOC-005','UNVERIFIED','New supplier','NEW-1','PO-26001/001',1,'1250.00'),
  row('DOC-006','SYN-SUP-02','Fictional Filter Supply',' demo-filter-001 ','PO-26002/001',1,'50.00'),
  row('DOC-007','SYN-SUP-03','Fictional Engineering Services','SERVICE-1','PO-26003/001',1,'2000.00'),
  row('DOC-008','SYN-SUP-02','Fictional Filter Supply','PRICE-1','PO-26002/001',1,'55.00'),
  row('DOC-009','SYN-SUP-01','Fictional Filter Supply','ID-CONFLICT','PO-26001/001',1,'1250.00'),
  row('DOC-010','SYN-SUP-02','Fictional Filter Supply','FX-1','PO-26002/001',1,'50.00','EUR'),
  row('DOC-011','SYN-SUP-02','Fictional Filter Supply','PAIR-1','PO-26002/001',1,'50.00'),
  row('DOC-012','SYN-SUP-02','Fictional Filter Supply','PAIR-1','PO-26002/001',1,'50.00'),
  row('DOC-013','SYN-SUP-02','Fictional Filter Supply','BAD-PO','PO-UNKNOWN/001',1,'50.00'),
  row('DOC-014','SYN-SUP-02','Fictional Filter Supply','WRONG-PO','PO-26001/001',1,'1250.00'),
  row('DOC-015','SYN-SUP-01','Fictional Pump Supply','PUMP-CAP','PO-26001/001',1,'1250.00')];}
 function csv(rows){const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [headers,...rows.map(r=>headers.map(h=>r[h]))].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';}
 return {queues,headers,snapshot,supplier,cents,analyze,parseCSV,sample,csv};
});
