/* Fictional, vendor-neutral ERP teaching model. USD net amounts, integer quantities/cents. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ERP=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
 function seed(){return {currency:'USD',role:'AP',nextInvoice:2,history:[],lines:[
  {id:'PO-26001/001',po:'PO-26001',supplier:'SYN-SUP-01',description:'Cooling pump assemblies',unit:'EA',quantity:2,priceCents:125000,received:1,site:'Lakeside',category:'Equipment',account:'1600 · Equipment',treatment:'Capital-project scenario',project:'CAP-026',asset:'PUMP-04',workOrder:'WO-410',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:7000},{costCenter:'PROD-200',department:'Production',basisPoints:3000}],invoices:[]},
  {id:'PO-26002/001',po:'PO-26002',supplier:'SYN-SUP-02',description:'Air filter kits',unit:'EA',quantity:10,priceCents:5000,received:10,site:'Lakeside',category:'MRO consumables',account:'6100 · Maintenance supplies',treatment:'Operating-cost scenario',project:'',asset:'AHU-02',workOrder:'WO-411',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:10000}],invoices:[{id:'SYN-INV-1',number:'DEMO-FILTER-001',quantity:6,priceCents:5000,netCents:30000,authorized:true,paidCents:10000,postedBy:'AP'}]},
  {id:'PO-26003/001',po:'PO-26003',supplier:'SYN-SUP-03',description:'Controls engineering service',unit:'Accepted service milestone',quantity:1,priceCents:200000,received:0,site:'Lakeside',category:'Engineering services',account:'1620 · Project engineering',treatment:'Capital-project scenario',project:'CAP-026',asset:'LINE-03',workOrder:'WO-412',allocations:[{costCenter:'ENG-300',department:'Engineering',basisPoints:10000}],invoices:[]}
 ]};}
 function validateLine(line){
  if(!integer(line.quantity,1)||!integer(line.priceCents,1)||!integer(line.received)||line.received>line.quantity||!integer(line.quantity*line.priceCents))throw Error('Invalid PO quantity, receipt, or price.');
  if(!line.allocations.length||line.allocations.some(a=>!a.costCenter||!a.department||!integer(a.basisPoints,1))||line.allocations.reduce((s,a)=>s+a.basisPoints,0)!==10000)throw Error('Cost distributions must total 100%.');
  if(new Set(line.allocations.map(a=>a.costCenter)).size!==line.allocations.length)throw Error('Duplicate cost-center distribution.');
  let quantity=0;for(const i of line.invoices){if(!integer(i.quantity,1)||!integer(i.priceCents,1)||!integer(i.netCents,1)||i.netCents!==i.quantity*i.priceCents||!integer(i.paidCents)||i.paidCents>i.netCents)throw Error('Invalid posted invoice.');quantity+=i.quantity;}
  if(quantity>line.received)throw Error('Posted invoice quantity exceeds accepted receipts.');
 }
 function apportion(cents,weights){
  const denominator=weights.reduce((s,w)=>s+w,0);
  if(!integer(cents)||!integer(denominator,1)||weights.some(w=>!integer(w)))throw Error('Invalid amount or allocation.');
  // BigInt intermediate protects exact minor-unit allocation and deterministic remainder handling.
  const rows=weights.map((weight,index)=>{const product=BigInt(cents)*BigInt(weight);return {index,value:Number(product/BigInt(denominator)),remainder:product%BigInt(denominator)};});
  let remaining=cents-rows.reduce((s,r)=>s+r.value,0);const ranked=[...rows].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
  for(let n=0;n<remaining;n++)ranked[n].value++;
  return rows.map(r=>r.value);
 }
 function distribute(cents,allocations){if(allocations.reduce((s,a)=>s+a.basisPoints,0)!==10000)throw Error('Distributions must total 100%.');return apportion(cents,allocations.map(a=>a.basisPoints));}
 function totals(line){validateLine(line);const invoiceQuantity=line.invoices.reduce((s,i)=>s+i.quantity,0),invoiced=line.invoices.reduce((s,i)=>s+i.netCents,0),paid=line.invoices.reduce((s,i)=>s+i.paidCents,0);return {ordered:line.quantity*line.priceCents,openCommitment:(line.quantity-invoiceQuantity)*line.priceCents,receivedUninvoiced:(line.received-invoiceQuantity)*line.priceCents,invoiced,unpaid:invoiced-paid,paid};}
 function ledger(state,costCenter='all'){
  const rows=[];for(const line of state.lines){const t=totals(line),split=Object.fromEntries(Object.entries(t).map(([key,value])=>[key,distribute(value,line.allocations)]));
  // Allocate each invoice once, then settle against its allocated cents; derive unpaid.
  // Independently rounding invoice, paid and unpaid totals can break row-level reconciliation.
  split.invoiced=line.allocations.map(()=>0);split.paid=line.allocations.map(()=>0);
  for(const invoice of line.invoices){const net=distribute(invoice.netCents,line.allocations),paid=apportion(invoice.paidCents,net);net.forEach((v,i)=>{split.invoiced[i]+=v;split.paid[i]+=paid[i];});}
  split.unpaid=split.invoiced.map((v,i)=>v-split.paid[i]);
  line.allocations.forEach((allocation,index)=>{if(costCenter!=='all'&&allocation.costCenter!==costCenter)return;rows.push({lineId:line.id,description:line.description,site:line.site,category:line.category,account:line.account,project:line.project,asset:line.asset,workOrder:line.workOrder,...allocation,...Object.fromEntries(Object.entries(split).map(([key,values])=>[key,values[index]]))});});}
  const total=Object.fromEntries(['ordered','openCommitment','receivedUninvoiced','invoiced','unpaid','paid'].map(k=>[k,rows.reduce((s,r)=>s+r[k],0)]));return {rows,total};
 }
 function match(state,lineId,draft){
  const line=state.lines.find(l=>l.id===lineId);if(!line)throw Error('Unknown PO line.');validateLine(line);
  const reasons=[],number=String(draft.number||'').trim().toUpperCase();
  if(!number)reasons.push('Invoice reference is required.');
  if(state.lines.some(l=>l.supplier===line.supplier&&l.invoices.some(i=>i.number.trim().toUpperCase()===number)))reasons.push('Supplier invoice reference is already posted.');
  if(!integer(draft.quantity,1))reasons.push('Use a positive whole-unit quantity.');
  if(!integer(draft.priceCents,1)||!integer(draft.quantity*draft.priceCents,1))reasons.push('Use a positive price with at most two decimal places.');
  const already=line.invoices.reduce((s,i)=>s+i.quantity,0);
  if(draft.quantity>line.quantity-already)reasons.push('Quantity exceeds the unbilled PO balance.');
  if(draft.quantity>line.received-already)reasons.push('Quantity exceeds accepted, uninvoiced receipts.');
  // Fixed demonstration policy: inclusive 1% unit-price tolerance, calculated without floating-point ratios.
  if(integer(draft.priceCents,1)&&BigInt(Math.abs(draft.priceCents-line.priceCents))*10000n>BigInt(line.priceCents)*100n)reasons.push('Unit price exceeds the 1% matching tolerance.');
  return {eligible:reasons.length===0,reasons,number,netCents:integer(draft.quantity*draft.priceCents,1)?draft.quantity*draft.priceCents:null};
 }
 function act(state,action,lineId,payload={}){
  const next=copy(state),line=next.lines.find(l=>l.id===lineId);if(!line)throw Error('Unknown PO line.');
  let message;
  if(action==='receive'){if(next.role!=='Receiving')throw Error('Switch to Receiving to record acceptance.');const quantity=line.quantity-line.received;if(!quantity)throw Error('PO line is already fully received.');line.received+=quantity;message='Accepted remaining '+quantity+' unit(s).';}
  else if(action==='post'){if(next.role!=='AP')throw Error('Switch to AP to validate and post an invoice.');const result=match(next,lineId,payload);if(!result.eligible)throw Error(result.reasons.join(' '));line.invoices.push({id:'SYN-INV-'+next.nextInvoice++,number:result.number,quantity:payload.quantity,priceCents:payload.priceCents,netCents:result.netCents,authorized:false,paidCents:0,postedBy:'AP'});message='Invoice posted; separate payment authorization is required.';}
  else if(action==='authorize'){if(next.role!=='Approver')throw Error('Switch to Approver to authorize payment.');const invoice=line.invoices.find(i=>i.id===payload.invoiceId);if(!invoice||invoice.authorized)throw Error('Choose an invoice awaiting authorization.');invoice.authorized=true;message='Payment authorized; no cash movement recorded.';}
  else if(action==='pay'){if(next.role!=='Treasury')throw Error('Switch to Treasury to simulate payment.');const invoice=line.invoices.find(i=>i.id===payload.invoiceId);if(!invoice||!invoice.authorized||invoice.paidCents===invoice.netCents)throw Error('Payment requires an authorized, unpaid invoice.');invoice.paidCents=invoice.netCents;message='Simulated payment recorded; no funds were transferred.';}
  else throw Error('Unsupported action.');
  validateLine(line);next.history.push({sequence:next.history.length+1,role:next.role,lineId,action,message});return next;
 }
 return {seed,validateLine,distribute,totals,ledger,match,act};
});
