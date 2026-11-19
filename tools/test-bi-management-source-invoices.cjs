'use strict';
const assert = require('node:assert/strict');
const J = require('./bi-prototype/preview/journey-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const C = require('./bi-prototype/preview/inbox-context.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const Index = require('./bi-prototype/preview/management-source-invoices-rules.js'), G = require('./bi-prototype/preview/management-model.js');
const checks = [], check = async (name, run) => {await run(); checks.push(name);};
const context = raw => ({source: 'current', status: 'available', savedRaw: raw, checkpoint: JSON.parse(J.serialize(J.restore(raw)))});
(async () => {
 const base = S.journal(), baseline = J.serialize(base), source = C.example(await C.capture(baseline), base.erp.lines[0].id)[0];
 const second = {...source, id: 'HELD', order: 1, content: source.content.replace(/^Invoice: .*$/m, 'Invoice: HELD-SOURCE').replace('Net-Total: 1250.00','Net-Total: 1300.00')};
 const staged = await Inbox.stage(await Inbox.prepareCurrent([source,second],baseline),baseline,'AP');let state = J.restore(staged.checkpoint);
 const ready = state.documents.find(row=>row.status==='Ready').id, held = state.documents.find(row=>row.status==='Held').id;
 for(const type of ['post','authorize','pay'])state=J.dispatch(state,{id:'PAID-'+type,type,actor:J.roles[type],payload:{documentId:ready}});
 const raw=J.serialize(state), input=context(raw), original=JSON.stringify(input), model=await Index.build(input);
 await check('All receipted financial states are discoverable separately from the held owner queue',async()=>{
  assert.equal(model.documents.length,2);assert.deepEqual(new Set(model.documents.map(row=>row.status)),new Set(['Held','Paid']));
  assert.equal(G.compile({purchasing:state}).finance.heldInvoiceCount,1);assert.equal(G.compile({purchasing:state}).finance.totals.paid,125000);
  assert.equal(model.documents.find(row=>row.documentId===ready).status,'Paid');assert.equal(model.documents.find(row=>row.documentId===held).status,'Held');
 });
 await check('Native destinations carry the exact document and an appropriate existing report measure',async()=>{
  for(const document of model.documents){const purchasing=new URL(document.purchasingHref,'https://example.test/'),report=new URL(document.reportHref,'https://example.test/');
   assert.equal(purchasing.searchParams.get('invoice'),document.documentId);assert.equal(purchasing.hash,'#invoice-trail');
   assert.equal(report.searchParams.get('source'),'current');assert.equal(report.searchParams.get('invoice'),document.documentId);
   assert.equal(report.searchParams.get('measure'),document.status==='Paid'?'paid':'openCommitment');}
 });
 await check('Snapshot identity, receipt hashes and imported sequence remain replayable and immutable',async()=>{
  assert.equal(model.savedRaw,raw);assert.equal(model.checkpoint,raw);assert.equal(model.checkpointSha256,await C.hash(raw));
  assert.equal(JSON.stringify(input),original);assert.equal(J.serialize(state),raw);
  assert(model.documents[0].importedRevision>model.documents[1].importedRevision);
  const receipts=await Inbox.receipts(raw);for(const document of model.documents)assert.equal(document.sourceSha256,receipts.find(row=>row.documentId===document.documentId).sourceSha256);
 });
 await check('Guided mode, absent sources and damaged purchasing never become an empty saved index',async()=>{
  await assert.rejects(Index.build({...input,source:'example'}),/Guided management examples/);
  for(const status of ['absent','unavailable'])await assert.rejects(Index.build({...input,status}),/unavailable/);
  for(const savedRaw of [null,'','{}','damaged'])await assert.rejects(Index.build({...input,savedRaw}));
 });
 await check('A saved journal differing from captured management is rejected, including same-revision command changes',async()=>{
  const altered=JSON.parse(raw);altered.commands.find(row=>row.type==='receive').payload.receiptReference='CHANGED-REFERENCE';
  await assert.rejects(Index.build({...input,savedRaw:JSON.stringify(altered)}),/differs from the management snapshot/);
  const newer=J.dispatch(state,{id:'NEW-REQUEST',type:'stage',actor:'Requester',payload:{requestId:'AFTER',itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',quantity:1}});
  await assert.rejects(Index.build({...input,savedRaw:J.serialize(newer)}),/differs from the management snapshot/);
 });
 await check('Exact raw formatting remains observable while an explicitly refreshed equivalent snapshot is valid',async()=>{
  const pretty=JSON.stringify(JSON.parse(raw),null,2),next=await Index.build({...input,savedRaw:pretty});
  assert.equal(next.savedRaw,pretty);assert.equal(next.checkpointSha256,model.checkpointSha256);assert.deepEqual(next.documents,model.documents);
 });
 await check('Valid empty purchasing and legacy non-receipted invoices yield a known empty subset only',async()=>{
  assert.equal((await Index.build(context(J.serialize(J.create())))).documents.length,0);
  const legacy=J.restore(JSON.stringify((await Inbox.prepare([source],base)).sources.proposedCheckpoint));
  assert.equal(legacy.documents.length,1);assert.equal((await Index.build(context(J.serialize(legacy)))).documents.length,0);
 });
 await check('Current reviewed amount/version remain distinct from retained original source identity',async()=>{
  let corrected=J.dispatch(state,{id:'PROPOSE',type:'proposeCorrection',actor:'AP',payload:{documentId:held,expectedVersion:1,pricesCents:[125000],declaredNetCents:125000,reason:'Fictional corrected header',sourceLabel:'Fictional supplier revision'}});
  corrected=J.dispatch(corrected,{id:'APPROVE',type:'reviewCorrection',actor:'Purchasing approver',payload:{documentId:held,decision:'approve',reason:'Fictional independent review'}});
  const next=(await Index.build(context(J.serialize(corrected)))).documents.find(row=>row.documentId===held);
  assert.equal(next.currentVersion,2);assert.equal(next.currentDeclaredNetCents,125000);assert.equal(next.sourceSha256,model.documents.find(row=>row.documentId===held).sourceSha256);
 });
 await check('Malformed retained receipt evidence is unavailable without altering financial state',async()=>{
  const altered=JSON.parse(raw);altered.commands.find(row=>row.id.startsWith('SOURCE-INBOX:')).payload.sourceLabel='Edited fingerprint';
  const changed=JSON.stringify(altered);assert(G.compile({purchasing:J.restore(changed)}).finance);
  await assert.rejects(Index.build(context(changed)),/Source receipt/);
 });
 console.log('PASS '+checks.length+' management source-invoice discovery groups.');
})().catch(error=>{console.error(error);process.exitCode=1;});
