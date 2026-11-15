'use strict';
(()=>{
 const J=window.Journey,M=window.Machines,R=window.BusinessReport,$=s=>document.querySelector(s),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
 let purchasing=null,maintenance=null,errors=[];
 function refresh(){
  errors=[];purchasing=null;maintenance=null;
  try{const raw=sessionStorage.getItem('portfolio-phase2-connected-v1');purchasing=raw?J.restore(raw):J.create();}catch(e){errors.push('Purchasing journal unavailable: '+e.message);}
  try{const raw=sessionStorage.getItem('portfolio-phase2-machines-v1');maintenance=raw?M.restore(raw):M.create();}catch(e){errors.push('Maintenance journal unavailable: '+e.message);}
  const model=purchasing?R.compile(purchasing):null,total=model?R.select(model).totals:null;
  const cards=[['Governed requisitions',purchasing?String(purchasing.requests.length):'Unavailable','connected-journey.html','Inspect request and approval history'],['Approved PO lines',purchasing?String(purchasing.erp.lines.length):'Unavailable','connected-journey.html','Inspect inherited coding and receipts'],['Reviewed conditions',maintenance?String(new Set(maintenance.reviews.map(r=>r.caseId)).size):'Unavailable','machine-intelligence.html','Inspect maintenance disposition'],['Cash paid',total?money(total.paid):'Unavailable','business-report.html','Open BI and choose My workflow journal']];
  $('#showcase-progress').replaceChildren(...cards.map(([label,value,href,hint])=>{const a=node('a');a.href=href;a.append(node('small',label),node('strong',value),node('small',hint+' →'));return a;}));
  const status=$('#showcase-status');status.classList.toggle('showcase-error',errors.length>0);status.textContent=errors.length?errors.join(' ')+' Saved copies are preserved. Recover in the relevant demonstration.':purchasing.revision||maintenance.revision?'Recovered '+purchasing.revision+' purchasing actions and '+maintenance.revision+' maintenance actions. These figures describe your saved simulation.':'Your simulation is empty. Open a journey to begin; guided examples remain separate from these figures.';
  $('#download-showcase-bundle').disabled=errors.length>0;
 }
 $('#showcase-refresh').onclick=refresh;
 $('#download-showcase-bundle').onclick=()=>{
  refresh();if(errors.length)return;
  try{const bundle={format:'SIMULATED-CONNECTED-BUSINESS-EVIDENCE',version:1,fictional:true,description:'Separate model snapshots from the current validated journals. Do not sum full-state snapshots across time or treat financial stages as separate purchases.',purchasing:{namespace:'CURRENT-PURCHASING-JOURNAL',checkpoint:JSON.parse(J.serialize(purchasing)),model:R.compile(purchasing)},maintenance:{namespace:'CURRENT-MAINTENANCE-JOURNAL',checkpoint:JSON.parse(M.serialize(maintenance)),costBridge:M.bridge(maintenance,purchasing)},machine:{namespace:'SYN-MACHINE-1',model:M.analyze()}};const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)+'\n'],{type:'application/json'})),a=node('a');a.href=url;a.download='simulated-connected-business-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('#showcase-status').textContent='Evidence export held: '+e.message+' Saved journals are preserved.';}
 };
 refresh();
})();
