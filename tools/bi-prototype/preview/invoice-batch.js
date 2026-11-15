'use strict';
(()=>{
 const B=window.InvoiceBatch,X=window.BatchScenarios,J=window.Journey,D=window.InvoiceDocuments,$=s=>document.querySelector(s),node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;},key='portfolio-phase2-connected-v1',example=X.example();
 let source='example',preview=B.prepare(example.journey,example.csv,example.batchId),dirty=false,filter='all';$('#batch-csv').value=example.csv;
 const message=text=>{$('#batch-status').textContent=text;};
 function current(){const text=sessionStorage.getItem(key);return text?J.restore(text):J.create();}
 const sourceJournal=()=>source==='example'?example.journey:current();
 function render(){
  $('#batch-example').setAttribute('aria-pressed',String(source==='example'));$('#batch-current').setAttribute('aria-pressed',String(source==='current'));
  $('#batch-context').textContent=source==='example'?'Guided purchasing seed · revision 9 · read-only until explicitly staged. Your saved journal has not been replaced.':'Current purchasing context · preview revision '+preview.sourceRevision+' · read again before staging.';
  $('#stage-batch').disabled=dirty||$('#batch-role').value!=='AP';$('#download-batch-preview').disabled=dirty;
  $('#batch-counts').textContent=preview.counts.documents+' documents · '+preview.counts.lines+' lines · '+preview.counts.ready+' ready · '+preview.counts.held+' held';
  const choices=[['all','All documents'],...([...new Set(preview.results.map(r=>r.queue))].map(q=>[q,q==='posted'?'Already posted':D.queues[q]||q]))];if(!choices.some(([q])=>q===filter))filter='all';
  $('#batch-queues').replaceChildren(...choices.map(([queue,label])=>{const b=node('button');b.type='button';b.setAttribute('aria-pressed',String(queue===filter));b.append(node('span',label),node('strong',queue==='all'?preview.results.length:preview.results.filter(r=>r.queue===queue).length));b.onclick=()=>{filter=queue;$('#batch-document-detail').replaceChildren();render();};return b;}));
  const effects=$('#batch-existing-effects');effects.replaceChildren();if(preview.affectedExisting.length){effects.append(node('strong','This candidate batch would change existing pending-document reviews.'));const list=node('ul');preview.affectedExisting.forEach(e=>list.append(node('li',e.documentId+': '+e.before+' → '+e.after+' · '+e.reasons.join(' '))));effects.append(list);}
  const body=$('#batch-documents');body.replaceChildren();for(const result of preview.results.filter(r=>filter==='all'||r.queue===filter)){const tr=node('tr'),td=node('td'),b=node('button',result.documentId);b.type='button';b.onclick=()=>detail(result);td.append(b);tr.append(td,node('td',result.status+' · '+(result.queue==='posted'?'Already posted':D.queues[result.queue]||result.queue)),node('td',result.lineCount),node('td',(result.declaredNetCents/100).toFixed(2)+' '+result.currency),node('td',result.owner||'No unposted review owner'));body.append(tr);}
 }
 function detail(result){
  const target=$('#batch-document-detail'),dl=node('dl');target.replaceChildren(node('h3',result.documentId+' · document and line evidence'));for(const [key,value]of [['Primary queue',result.queue],['Owner',result.owner||'No unposted owner'],['Declared / calculated net',(result.declaredNetCents/100).toFixed(2)+' / '+(result.calculatedNetCents/100).toFixed(2)+' '+result.currency],['Source data rows',result.sourceRows.map(r=>r.dataRow).join(', ')]])dl.append(node('dt',key),node('dd',String(value)));const reasons=node('ul');result.reasons.forEach(r=>reasons.append(node('li',r)));target.append(dl,reasons);
  for(const line of result.lines){const section=node('section');section.className='batch-line-evidence';section.append(node('h4',line.lineId+' · '+line.poLineId));if(line.coding)section.append(node('p','Inherited account: '+line.coding.account+' · work order '+line.coding.workOrder),node('p','Cost distribution: '+line.coding.allocations.map(a=>a.costCenter+' '+a.basisPoints/100+'%').join(' / ')),node('p',line.coding.source));else section.append(node('p','No accounting code inferred. Resolve the PO/supplier reference first.'));target.append(section);}
  const details=node('details'),summary=node('summary','Original structured input rows'),pre=node('pre',JSON.stringify(result.sourceRows,null,2));details.append(summary,pre);target.append(details);
 }
 function prepare(){const next=B.prepare(sourceJournal(),$('#batch-csv').value,$('#batch-reference').value);preview=next;dirty=false;filter='all';$('#batch-document-detail').replaceChildren();message('Complete batch previewed against revision '+next.sourceRevision+'. No documents posted or payments created.');render();}
 function perform(action){try{action();}catch(e){message('Action held; prior valid preview and saved journal preserved. '+e.message);}}
 function markDirty(){dirty=true;message('Input changed. Preview the complete batch again before staging or exporting.');render();}
 $('#batch-csv').oninput=markDirty;$('#batch-reference').oninput=markDirty;$('#batch-role').onchange=render;$('#preview-batch').onclick=()=>perform(prepare);
 $('#batch-example').onclick=()=>perform(()=>{source='example';$('#batch-csv').value=example.csv;$('#batch-reference').value=example.batchId;$('#batch-file').value='';prepare();});
 $('#batch-current').onclick=()=>perform(()=>{current();source='current';prepare();});
 $('#stage-batch').onclick=()=>perform(()=>{
  if(dirty||$('#batch-role').value!=='AP')throw Error('Use AP with a current complete preview.');let base=current();
  const matches=J.serialize(base)===preview.sourceCheckpoint,already=preview.commands.every(c=>base.commands.some(x=>x.id===c.id));
  if(source==='example'&&!matches&&!already){if(base.revision&&!confirm('Stage the guided batch by replacing the current fictional purchasing journal with its example context? Maintenance/work checkpoints remain as they are and may refer to prior purchasing records. Download checkpoints you want to keep first.'))return;base=example.journey;}
  const result=B.stage(preview,base),nextPreview=B.prepare(result,$('#batch-csv').value,$('#batch-reference').value);sessionStorage.setItem(key,J.serialize(result));source='current';preview=nextPreview;dirty=false;filter='all';$('#batch-document-detail').replaceChildren();message(already?'Batch already staged. Stable action IDs prevented duplicate documents.':'Complete batch staged atomically. Review holds and post eligible documents separately in purchasing.');render();
 });
 $('#batch-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>262144)throw Error('CSV exceeds 256 KiB.');const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),next=B.prepare(sourceJournal(),text,$('#batch-reference').value);$('#batch-csv').value=text;preview=next;dirty=false;filter='all';$('#batch-document-detail').replaceChildren();message('Structured file previewed. Saved purchasing records are unchanged.');render();}catch(e){message('File rejected; previous valid preview and saved journal preserved. '+e.message);}};
 function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('#download-batch-template').onclick=()=>download('fictional-multiline-invoices.csv',example.csv,'text/csv;charset=utf-8');
 $('#download-batch-preview').onclick=()=>perform(()=>{if(dirty)throw Error('Preview the edited input first.');download('simulated-invoice-batch-preview.json',JSON.stringify(preview,null,2)+'\n','application/json');});
 message('Guided batch preview: eight invoice headers, nine lines, one ready document and seven owned holds. No saved journal has changed.');render();
})();
