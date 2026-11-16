/* Structured multi-line CSV -> preview -> atomic staging, using the current purchasing journal. */
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./invoice-rules.js'),require('./journey-rules.js'),require('./document-rules.js')):factory(root.InvoiceIntake,root.Journey,root.InvoiceDocuments);if(typeof module==='object'&&module.exports)module.exports=api;else root.InvoiceBatch=api;})(typeof window!=='undefined'?window:globalThis,function(I,J,D){
 'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase(),columns=['documentId','entityId','supplierId','invoiceReference','currency','headerNet','lineNumber','poLineId','quantity','unitPrice'];
 function reference(value,name,max=80){const id=norm(value);if(!id||id.length>max)throw Error(name+' must contain 1–'+max+' characters.');return id;}
 function parse(text){
  const rows=I.parseCSV(text,columns,200),groups=new Map();
  rows.forEach((row,index)=>{
   const id=reference(row.documentId,'Document ID');if(Object.values(row).some(v=>v.length>100))throw Error('Fields are limited to 100 characters at data row '+(index+1));
   if(norm(row.entityId)!=='SYN-CO-01')throw Error('Entity must be SYN-CO-01 at data row '+(index+1));
   const header={supplierId:reference(row.supplierId,'Supplier ID'),number:reference(row.invoiceReference,'Invoice reference'),currency:reference(row.currency,'Currency'),netCents:I.cents(row.headerNet)};
   if(header.netCents===null)throw Error('Header net must be a positive exact-cent amount.');
   const lineNumber=/^\d+$/.test(row.lineNumber)?Number(row.lineNumber):NaN,quantity=/^\d+$/.test(row.quantity)?Number(row.quantity):NaN,priceCents=I.cents(row.unitPrice);
   if(!Number.isSafeInteger(lineNumber)||lineNumber<1||lineNumber>20||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||priceCents===null||!Number.isSafeInteger(quantity*priceCents))throw Error('Use line numbers 1–20, whole quantities 1–1,000 and positive exact-cent prices.');
   if(!groups.has(id))groups.set(id,{id,header,lines:[],sourceRows:[]});const group=groups.get(id);
   if(JSON.stringify(group.header)!==JSON.stringify(header))throw Error('Conflicting header fields for '+id+'.');
   group.lines.push({ordinal:lineNumber,poLineId:norm(row.poLineId)||'UNMATCHED-PO',quantity,priceCents});group.sourceRows.push({dataRow:index+1,input:clone(row)});
  });
  if(groups.size>50)throw Error('Use no more than 50 invoice documents per batch.');
  const documents=[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id));
  for(const d of documents){d.lines.sort((a,b)=>a.ordinal-b.ordinal);if(d.lines.some((l,i)=>l.ordinal!==i+1))throw Error('Document '+d.id+' needs unique contiguous line numbers starting at 1.');D.validLines(d.lines.map(({ordinal,...line})=>line));}
  return {format:'SIMULATED-INVOICE-CSV',version:1,entityId:'SYN-CO-01',rowCount:rows.length,documents};
 }
 function commands(parsed,batchId){
  const id=reference(batchId,'Batch reference',40);if(!parsed||parsed.format!=='SIMULATED-INVOICE-CSV'||parsed.version!==1||!Array.isArray(parsed.documents)||!parsed.documents.length||parsed.documents.length>50)throw Error('Unsupported parsed batch.');
  return parsed.documents.map(d=>({id:'CSV-IMPORT:'+id+':'+d.id,type:'importDocument',actor:J.roles.importDocument,payload:{documentId:d.id,supplierId:d.header.supplierId,number:d.header.number,currency:d.header.currency,declaredNetCents:d.header.netCents,sourceLabel:'Simulated CSV batch '+id,lines:d.lines.map(({ordinal,...line})=>clone(line))}}));
 }
 function prepare(journal,text,batchId){
  // Replay the source checkpoint, not a caller-supplied derived balance.
  const source=J.restore(J.serialize(journal)),parsed=parse(text),planned=commands(parsed,batchId);let proposed=source;
  for(const command of planned)proposed=J.dispatch(proposed,command);
  const results=parsed.documents.map(d=>{const actual=proposed.documents.find(x=>x.id===d.id),e=actual.evaluations.at(-1);return {documentId:d.id,status:actual.status,queue:actual.postedInvoiceId?'posted':e?.queue||null,owner:actual.postedInvoiceId?null:e?.owner||null,reasons:clone(e?.reasons||[]),lineCount:actual.lines.length,declaredNetCents:actual.header.netCents,calculatedNetCents:actual.lines.reduce((n,l)=>n+l.quantity*l.priceCents,0),currency:actual.header.currency,lines:clone(e?.lines||[]),sourceRows:clone(d.sourceRows)};});
  const affectedExisting=source.documents.filter(d=>!parsed.documents.some(p=>p.id===d.id)).flatMap(d=>{const next=proposed.documents.find(p=>p.id===d.id),before=d.evaluations.at(-1),after=next.evaluations.at(-1);return d.status!==next.status||JSON.stringify(before?.reasons)!==JSON.stringify(after?.reasons)?[{documentId:d.id,before:d.status,after:next.status,reasons:clone(after?.reasons||[])}]:[];});
  return {format:'SIMULATED-INVOICE-BATCH-PREVIEW',version:1,batchId:reference(batchId,'Batch reference',40),sourceRevision:source.revision,sourceCheckpoint:J.serialize(source),parsed,commands:planned,results,affectedExisting,proposedCheckpoint:J.serialize(proposed),counts:{documents:results.length,lines:parsed.rowCount,ready:results.filter(r=>r.status==='Ready').length,held:results.filter(r=>r.status==='Held').length},alreadyStaged:planned.every(c=>source.commands.some(p=>p.id===c.id))};
 }
 function stage(preview,current){
  if(!preview||preview.format!=='SIMULATED-INVOICE-BATCH-PREVIEW'||preview.version!==1)throw Error('Create a valid batch preview first.');
  const source=J.restore(J.serialize(current)),already=preview.commands.every(c=>source.commands.some(p=>p.id===c.id));
  if(!already&&J.serialize(source)!==preview.sourceCheckpoint)throw Error('Purchasing journal changed. Preview this batch again before staging.');
  // Rebuild from source rows to reject edited preview commands or derived results.
  const csv=toCSV(preview.parsed.documents.flatMap(d=>d.sourceRows).sort((a,b)=>a.dataRow-b.dataRow).map(r=>r.input)),rebuilt=prepare(J.restore(preview.sourceCheckpoint),csv,preview.batchId);
  if(JSON.stringify(rebuilt)!==JSON.stringify(preview))throw Error('Batch preview differs from its source and calculations.');
  let result=source;for(const command of rebuilt.commands)result=J.dispatch(result,command);return result;
 }
 function toCSV(rows){const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';return [columns.join(','),...rows.map(row=>columns.map(key=>quote(row[key]??'')).join(','))].join('\r\n')+'\r\n';}
 return {columns:clone(columns),parse,prepare,stage,toCSV};
});
