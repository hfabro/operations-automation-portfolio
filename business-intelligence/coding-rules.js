/* Fictional governed coding policies. Pure rules; no guessing from descriptions or vendor names. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Coding=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';const copy=x=>JSON.parse(JSON.stringify(x));
 function master(){return {version:'SYN-MASTER-1',evaluationDate:'2026-11-15',owner:'Finance policy owner',
  sites:['Lakeside'],assets:{'PUMP-04':'Lakeside','AHU-02':'Lakeside','LINE-03':'Lakeside','PUMP-05':'Lakeside'},
  accounts:['1600 · Equipment','6105 · Equipment repairs','6100 · Maintenance supplies','1620 · Project engineering'],
  centers:{'FAC-100':'Facilities','PROD-200':'Production','ENG-300':'Engineering'},
  projects:{'CAP-026':{status:'Approved',site:'Lakeside'},'CAP-027':{status:'Closed',site:'Lakeside'}},
  suppliers:{'SYN-SUP-01':'Approved','SYN-SUP-02':'Approved','SYN-SUP-03':'Approved'},
  items:[{id:'ITEM-PUMP',name:'Cooling pump assembly',category:'Equipment',supplier:'SYN-SUP-01',priceCents:125000,unit:'EA'},{id:'ITEM-FILTER',name:'Air filter kit',category:'MRO consumables',supplier:'SYN-SUP-02',priceCents:5000,unit:'EA'},{id:'ITEM-ENGINEERING',name:'Controls engineering service',category:'Engineering services',supplier:'SYN-SUP-03',priceCents:200000,unit:'Service milestone'}],
  purposes:[{id:'WORK-CAP',name:'WO-410 · Approved cooling upgrade',site:'Lakeside',asset:'PUMP-04',workOrder:'WO-410',project:'CAP-026'},{id:'WORK-REPAIR',name:'WO-413 · Routine pump repair',site:'Lakeside',asset:'PUMP-04',workOrder:'WO-413',project:''},{id:'WORK-FILTER',name:'WO-411 · Scheduled air-handler service',site:'Lakeside',asset:'AHU-02',workOrder:'WO-411',project:''},{id:'WORK-CONTROLS',name:'WO-412 · Approved controls upgrade',site:'Lakeside',asset:'LINE-03',workOrder:'WO-412',project:'CAP-026'},{id:'WORK-CLOSED',name:'WO-414 · Closed project example',site:'Lakeside',asset:'PUMP-05',workOrder:'WO-414',project:'CAP-027'}],
  rules:[{id:'CODE-001',version:1,itemId:'ITEM-PUMP',purposeId:'WORK-CAP',account:'1600 · Equipment',treatment:'Approved capital-project scenario',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:7000},{costCenter:'PROD-200',department:'Production',basisPoints:3000}]},
   {id:'CODE-002',version:1,itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR',account:'6105 · Equipment repairs',treatment:'Routine operating-cost scenario',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:10000}]},
   {id:'CODE-003',version:1,itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',account:'6100 · Maintenance supplies',treatment:'Routine operating-cost scenario',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:10000}]},
   {id:'CODE-004',version:1,itemId:'ITEM-ENGINEERING',purposeId:'WORK-CONTROLS',account:'1620 · Project engineering',treatment:'Approved capital-project scenario',allocations:[{costCenter:'ENG-300',department:'Engineering',basisPoints:10000}]},
   {id:'CODE-005',version:1,itemId:'ITEM-PUMP',purposeId:'WORK-CLOSED',account:'1600 · Equipment',treatment:'Closed-project example',allocations:[{costCenter:'FAC-100',department:'Facilities',basisPoints:10000}]}].map(r=>({...r,status:'Approved',effectiveFrom:'2026-01-01',effectiveToExclusive:'2027-01-01',owner:'Finance policy owner'}))};}
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 function resolve(input,m){const hold=(code,reason)=>({status:'held',code,reason,owner:m.owner||'Finance policy owner',masterVersion:m.version});
  if(Object.keys(input).some(k=>!['itemId','purposeId','quantity'].includes(k)))return hold('UNSUPPORTED_INPUT','Only approved item, work request, and quantity may be supplied. Accounting assignments cannot be overridden.');
  if(!validDate(m.evaluationDate))return hold('INVALID_DATE','The policy evaluation date is invalid.');
  if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>1000)return hold('INVALID_QUANTITY','Use 1–1,000 whole units in this demonstration.');
  const item=m.items.find(i=>i.id===input.itemId),purpose=m.purposes.find(p=>p.id===input.purposeId);
  if(!item||!purpose)return hold('UNKNOWN_REFERENCE','Item or work request is not in the approved reference lists.');
  if(!m.sites.includes(purpose.site)||m.assets[purpose.asset]!==purpose.site||!purpose.workOrder)return hold('INVALID_WORK_CONTEXT','Work-request site, asset, or work-order reference is invalid.');
  if(m.suppliers[item.supplier]!=='Approved')return hold('SUPPLIER_NOT_APPROVED','The catalog supplier is not approved for purchasing.');
  if(purpose.project&&(!m.projects[purpose.project]||m.projects[purpose.project].status!=='Approved'||m.projects[purpose.project].site!==purpose.site))return hold('PROJECT_NOT_APPROVED','The project must be approved and belong to the work-request site.');
  const candidates=m.rules.filter(r=>r.itemId===item.id&&r.purposeId===purpose.id&&r.status==='Approved'&&validDate(r.effectiveFrom)&&validDate(r.effectiveToExclusive)&&r.effectiveFrom<=m.evaluationDate&&m.evaluationDate<r.effectiveToExclusive);
  if(candidates.length!==1)return hold(candidates.length?'CONFLICTING_RULES':'NO_APPROVED_MAPPING',candidates.length?'Multiple approved rules apply. Finance must resolve the conflict.':'No effective approved coding rule covers this item and work request. Finance must add or approve a mapping.');
  const rule=candidates[0],a=rule.allocations;
  if(!m.accounts.includes(rule.account)||!a?.length||a.some(x=>!Number.isSafeInteger(x.basisPoints)||x.basisPoints<=0||m.centers[x.costCenter]!==x.department)||a.reduce((s,x)=>s+x.basisPoints,0)!==10000||new Set(a.map(x=>x.costCenter)).size!==a.length)return hold('INVALID_DISTRIBUTION','The approved rule contains an invalid account or cost distribution.');
  if(!Number.isSafeInteger(item.priceCents)||item.priceCents<=0||!Number.isSafeInteger(item.priceCents*input.quantity))return hold('INVALID_CATALOG_PRICE','Catalog price or extended amount is invalid.');
  return {status:'ready',owner:rule.owner,masterVersion:m.version,ruleId:rule.id,ruleVersion:rule.version,evaluatedOn:m.evaluationDate,effectiveFrom:rule.effectiveFrom,effectiveToExclusive:rule.effectiveToExclusive,
   coding:copy({itemId:item.id,description:item.name,supplier:item.supplier,quantity:input.quantity,unit:item.unit,unitPriceCents:item.priceCents,netCents:item.priceCents*input.quantity,currency:'USD',site:purpose.site,category:item.category,account:rule.account,treatment:rule.treatment,project:purpose.project,asset:purpose.asset,workOrder:purpose.workOrder,allocations:a}),
   explanation:'Catalog supplies item, supplier, category, and price. Approved work request supplies site, asset, project, and work order. Finance policy supplies account, treatment, and cost distributions.'};
 }
 function stage(session,input,m,entryId){
  if(typeof entryId!=='string'||!entryId.trim())throw Error('A stable submission ID is required.');
  const fingerprint=JSON.stringify(Object.keys(input).sort().map(k=>[k,input[k]])),existing=session.entries.find(e=>e.entryId===entryId);
  if(existing){if(existing.fingerprint!==fingerprint)throw Error('Submission ID was reused with different input.');return copy(session);}
  const next=copy(session),result=resolve(input,m);next.entries.push({entryId,fingerprint,input:copy(input),result:copy(result)});return next;
 }
 return {master,resolve,stage};
});
