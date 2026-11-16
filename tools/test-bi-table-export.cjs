'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const J=require('./bi-prototype/preview/journey-rules.js'),D=require('./bi-prototype/preview/data-methods-model.js'),S=require('./bi-prototype/preview/report-scenarios.js'),E=require('./bi-prototype/preview/data-methods-export.js');
const sha=text=>createHash('sha256').update(text).digest('hex'),project=(rows,columns)=>rows.map(row=>Object.fromEntries(columns.map(column=>[column.name,row[column.name]])));
const batches=[],checks=[];const check=async(name,run)=>{await run();checks.push(name);};
(async()=>{
 const states=S.checkpoints();
 await check('Complete source-derived tables, exact hashes, known totals, metadata and immutable journals',async()=>{
  for(const [choice,state] of Object.entries(states)){
   const before=J.serialize(state),a=await E.prepare(state,choice),inspection=D.inspect(state);
   assert.equal(J.serialize(state),before);assert.equal(a.manifest.source.checkpointSha256,sha(JSON.stringify(inspection.model.sourceCheckpoint)));assert.equal(a.manifest.source.journalRevision,state.revision);assert.equal(J.restore(JSON.stringify(a.manifest.sourceCheckpoint)).revision,state.revision);
   assert.deepEqual(a.manifest.totals,inspection.totals);assert.equal(a.manifest.documentCount,1);assert.equal(a.files.length,6);
   assert.equal(a.manifest.totals.paid,choice==='settled'?375000:0);
   for(const table of a.manifest.tables){const file=a.files.find(file=>file.tableId===table.id);assert.equal(table.rowCount,inspection.tables[table.id].length);assert.equal(table.sha256,sha(file.content));assert.equal(table.byteLength,Buffer.byteLength(file.content));assert.equal(file.content.charCodeAt(0),0xfeff);assert.ok(file.content.endsWith('\r\n'));assert.equal(table.key,D.contracts.find(row=>row.id===table.id).key);batches.push({table,content:file.content,expected:project(inspection.tables[table.id],table.columns)});}
   assert.deepEqual(await E.prepare(state,choice),a,'No clock/random filenames or output drift');
  }
 });
 await check('Empty snapshots export headers and zero populations rather than fabricated rows',async()=>{
  const a=await E.prepare(J.create(),'current');assert.equal(a.manifest.documentCount,0);assert(a.manifest.checks.every(row=>row.status==='empty'));
  for(const table of a.manifest.tables){assert.equal(table.rowCount,0);const file=a.files.find(file=>file.tableId===table.id);assert.equal(file.content.split('\r\n').length,2);batches.push({table,content:file.content,expected:[]});}
 });
 await check('Unmapped foreign-currency invoices retain null coding, their currency and owned review checks',async()=>{
  let state=J.create();state=J.dispatch(state,{id:'EXPORT-UNMAPPED',type:'importDocument',actor:J.roles.importDocument,payload:{documentId:'EXPORT-NO-PO',supplierId:'SYN-SUP-01',number:'UNKNOWN',currency:'EUR',declaredNetCents:100,sourceLabel:'Fictional export review',lines:[{poLineId:'UNKNOWN',quantity:1,priceCents:100}]}});
  const a=await E.prepare(state,'current'),inspection=D.inspect(state);assert.equal(a.manifest.totals.invoiced,0);assert.equal(a.manifest.heldDocumentCount,1);assert(a.manifest.checks.some(row=>row.status==='held'));
  for(const table of a.manifest.tables)batches.push({table,content:a.files.find(row=>row.tableId===table.id).content,expected:project(inspection.tables[table.id],table.columns)});
 });
 await check('Context identity uses full checkpoint contents rather than revision numbers or source labels',async()=>{
  const state=states.held,a=await E.prepare(state,'held'),b=await E.prepare(state,'current');assert.equal(a.manifest.source.checkpointSha256,b.manifest.source.checkpointSha256);assert.notEqual(a.manifestFilename,b.manifestFilename);assert.notEqual(a.manifest.source.kind,b.manifest.source.kind);
  const checkpoint=JSON.parse(J.serialize(state));checkpoint.commands.find(row=>row.type==='receive').payload.receiptReference='SAME-REVISION-OTHER-RECEIPT';const changed=J.restore(JSON.stringify(checkpoint)),c=await E.prepare(changed,'current');assert.equal(state.revision,changed.revision);assert.notEqual(c.manifest.source.checkpointSha256,a.manifest.source.checkpointSha256);
 });
 await check('CSV escaping is reversible for formulas, apostrophes, null tokens, empty strings, Unicode and embedded delimiters/newlines',async()=>{
  const values=['=1+2','+1','-1','@SUM(A1)','  =1','\tvalue','\rvalue','\nvalue','＝1','＋1','－1','＠1',"'literal","''two",'\\N','',null,'quoted,"value"\r\nsecond line','München 工場'];
  const rows=values.map((reference,index)=>({id:'ROW-'+index,supplier:'SYN-SUP-01',reference,currency:'USD',status:'Held',version:1,headerNetCents:100,lineCount:1,reasons:['Comma, "quotes" and\nnewline']}));
  const encoded=E.tableCSV('documents',rows);assert(encoded.escapedTextCells.length>=15);assert.deepEqual(encoded.nullCells,[{row:17,column:'reference'}]);
  batches.push({table:{...encoded,content:undefined,rowCount:rows.length},content:encoded.content,expected:project(rows,encoded.columns)});
  const source=J.dispatch(J.create(),{id:'ADVERSARIAL',type:'importDocument',actor:J.roles.importDocument,payload:{documentId:'=FORMULA-ID',supplierId:'SYN-SUP-01',number:'=1+2',currency:'USD',declaredNetCents:100,sourceLabel:'Fictional literal data',lines:[{poLineId:'UNKNOWN',quantity:1,priceCents:100}]}});
  const a=await E.prepare(source,'current');assert(a.manifest.tables.find(row=>row.id==='documents').escapedTextCells.some(row=>row.column==='id'));
 });
 await check('Invalid table shapes, keys, types, Unicode and resource limits reject without truncating',async()=>{
  const row=D.inspect(states.held).tables.invoiceAllocations[0];
  for(const [column,value]of [['netCents',1.5],['netCents',Number.MAX_SAFE_INTEGER+1],['active','false'],['account','\ud800'],['account','x'.repeat(32769)]])assert.throws(()=>E.tableCSV('invoiceAllocations',[{...row,[column]:value}]));
  assert.throws(()=>E.tableCSV('missing',[]));assert.throws(()=>E.tableCSV('invoiceAllocations',[row,row]));assert.throws(()=>E.tableCSV('invoiceAllocations',[{}]));assert.throws(()=>E.tableCSV('invoiceAllocations',Array(10001).fill(row)));
  const rows=Array.from({length:1000},(_,i)=>({...row,id:'LARGE-'+i,account:'x'.repeat(2000)}));assert.throws(()=>E.tableCSV('invoiceAllocations',rows),/1 MiB/);
  assert.throws(()=>E.tableCSV('poLines',[{...D.inspect(states.held).tables.poLines[0],policy:'not structured'}]));
  await assert.rejects(()=>E.prepare({...states.held,revision:999},'held'));await assert.rejects(()=>E.prepare(states.held,'other'));
 });
 await check('Standard-library CSV decoder independently reconstructs all typed records and null/escape distinctions',async()=>{
  const code=`import csv,io,json,sys\nfor batch in json.load(sys.stdin):\n t=batch['table']; rows=list(csv.DictReader(io.StringIO(batch['content'].removeprefix('\\ufeff'),newline='')))\n assert len(rows)==t['rowCount']\n nulls={(x['row'],x['column']) for x in t['nullCells']}; escapes={(x['row'],x['column']) for x in t['escapedTextCells']}\n result=[]\n for i,row in enumerate(rows,1):\n  restored={}\n  for c in t['columns']:\n   name=c['name']; value=row[name]; kind=c['type']\n   if value=='\\\\N':\n    assert (i,name) in nulls; value=None\n   elif kind=='text':\n    if value.startswith("'"):\n     assert (i,name) in escapes; value=value[1:]\n    else: assert (i,name) not in escapes\n   elif kind=='integer': value=int(value)\n   elif kind=='boolean':\n    assert value in ('true','false'); value=value=='true'\n   elif kind=='json': value=json.loads(value)\n   restored[name]=value\n  result.append(restored)\n assert result==batch['expected'],result\nprint('PASS independent Python csv decoder: '+str(${batches.length})+' complete table exports')`;
  const run=spawnSync(process.env.PYTHON_COMMAND||(process.platform==='win32'?'python':'python3'),['-c',code],{input:JSON.stringify(batches),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});assert.equal(run.status,0,run.stderr||run.error);console.log(run.stdout.trim());
 });
 console.log('PASS '+checks.length+' BI table-handoff groups: complete records, provenance, typed round trips, exact file hashes, preserved sources, nulls and bounded escaping.');
})().catch(error=>{console.error(error);process.exitCode=1;});
