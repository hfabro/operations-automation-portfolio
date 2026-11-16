/* Canonical authored event definitions. No random values, real-clock input or network access. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),C=require('../preview/coding-rules.js'),M=require('../preview/machine-rules.js'),W=require('../preview/work-rules.js');
const terms=require('../preview/business-time-rules.js').termsPolicy;
function fixture(){
 const events=[],companyId='SYN-CO-01',add=(id,date,type,payload,dependsOn=[],extra={})=>{const occurredAt=date.includes('T')?date:date+'T18:00:00.000Z';events.push({id,companyId,domain:'purchasing',occurredAt,recordedAt:new Date(Date.parse(occurredAt)+60000).toISOString(),businessDate:occurredAt.slice(0,10),dependsOn,command:{type,actor:require('../preview/journey-rules.js').roles[type],payload},...extra});};
 const dates=(invoiceOn,receivedOn,dueOn)=>({invoiceOn,receivedOn,dueOn,unknownReasons:{...(invoiceOn===null?{invoiceOn:'Invoice date absent from the fictional source.'}:{}),...(receivedOn===null?{receivedOn:'Inbox receipt date was not captured in the fictional source.'}:{}),...(dueOn===null?{dueOn:'A due date cannot be established without an admitted source invoice date/term.'}:{})}});
 const po=n=>'SYN-PO-'+String(n).padStart(4,'0')+'/001';
 add('BT-A-STAGE','2026-08-18','stage',{requestId:'BT-FILTER-A',itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',quantity:10});
 add('BT-A-APPROVE','2026-08-18T18:05:00.000Z','approve',{requestId:'BT-FILTER-A',reason:'Fictional scheduled filter authorization'},['BT-A-STAGE']);
 add('BT-A-RECEIVE-1','2026-08-20','receive',{poLineId:po(1),receiptReference:'BT-A-ACCEPT-1',quantity:5},['BT-A-APPROVE']);
 add('BT-A1-IMPORT','2026-08-21','import',{documentId:'BT-A1',poLineId:po(1),supplierId:'SYN-SUP-02',number:'BT-A1',quantity:6,priceCents:5000,currency:'USD'},['BT-A-APPROVE'],{invoiceDates:dates('2026-08-20','2026-08-21','2026-09-19')});
 add('BT-A-RECEIVE-2','2026-08-25','receive',{poLineId:po(1),receiptReference:'BT-A-ACCEPT-2',quantity:5},['BT-A-APPROVE','BT-A-RECEIVE-1']);
 add('BT-A1-POST','2026-08-26','post',{documentId:'BT-A1'},['BT-A1-IMPORT','BT-A-RECEIVE-2']);
 add('BT-B-STAGE','2026-08-28','stage',{requestId:'BT-CAPITAL',itemId:'ITEM-PUMP',purposeId:'WORK-CAP',quantity:2});
 add('BT-B-APPROVE','2026-08-28T18:05:00.000Z','approve',{requestId:'BT-CAPITAL',reason:'Fictional approved cooling project'},['BT-B-STAGE']);
 add('BT-B1-IMPORT','2026-09-01','import',{documentId:'BT-B1',poLineId:po(2),supplierId:'SYN-SUP-01',number:'BT-B1',quantity:2,priceCents:135000,currency:'USD'},['BT-B-APPROVE'],{invoiceDates:dates('2026-08-31','2026-09-01','2026-09-30')});
 add('BT-B-RECEIVE-1','2026-09-04','receive',{poLineId:po(2),receiptReference:'BT-B-ACCEPT-1',quantity:1},['BT-B-APPROVE']);
 add('BT-A1-AUTHORIZE','2026-09-05','authorize',{documentId:'BT-A1'},['BT-A1-POST']);
 add('BT-B1-PROPOSE','2026-09-08','proposeCorrection',{documentId:'BT-B1',expectedVersion:1,pricesCents:[125000],declaredNetCents:250000,reason:'Fictional supplier corrected quoted unit price',sourceLabel:'Fictional supplier revision 2'},['BT-B1-IMPORT']);
 add('BT-B1-REVIEW','2026-09-09','reviewCorrection',{documentId:'BT-B1',decision:'approve',reason:'Reviewed revised source against approved PO'},['BT-B1-PROPOSE']);
 add('BT-A1-PAY','2026-09-10','pay',{documentId:'BT-A1'},['BT-A1-AUTHORIZE']);
 add('BT-B-RECEIVE-2','2026-09-12','receive',{poLineId:po(2),receiptReference:'BT-B-ACCEPT-2',quantity:1},['BT-B-APPROVE','BT-B-RECEIVE-1']);
 add('BT-B1-POST','2026-09-15','post',{documentId:'BT-B1'},['BT-B1-REVIEW','BT-B-RECEIVE-2']);
 add('BT-C-STAGE','2026-09-20','stage',{requestId:'BT-SERVICE-C',itemId:'ITEM-ENGINEERING',purposeId:'WORK-CONTROLS',quantity:1});
 add('BT-C-APPROVE','2026-09-20T18:05:00.000Z','approve',{requestId:'BT-SERVICE-C',reason:'Fictional controls milestone authorization'},['BT-C-STAGE']);
 add('BT-C1-IMPORT','2026-09-22','import',{documentId:'BT-C1',poLineId:po(3),supplierId:'SYN-SUP-03',number:'BT-C1',quantity:1,priceCents:200000,currency:'USD'},['BT-C-APPROVE'],{invoiceDates:dates('2026-09-21',null,'2026-11-05')});
 add('BT-B1-AUTHORIZE','2026-09-25','authorize',{documentId:'BT-B1'},['BT-B1-POST']);
 add('BT-A2-IMPORT','2026-10-05','import',{documentId:'BT-A2',poLineId:po(1),supplierId:'SYN-SUP-02',number:'BT-A2',quantity:2,priceCents:5000,currency:'USD'},['BT-A-APPROVE'],{invoiceDates:dates('2026-10-01','2026-10-05','2026-10-31')});
 add('BT-A2-POST','2026-10-06','post',{documentId:'BT-A2'},['BT-A2-IMPORT','BT-A-RECEIVE-2']);
 add('BT-B1-PAY','2026-10-10','pay',{documentId:'BT-B1'},['BT-B1-AUTHORIZE']);
 add('BT-D-STAGE','2026-10-12','stage',{requestId:'BT-SERVICE-D',itemId:'ITEM-ENGINEERING',purposeId:'WORK-CONTROLS',quantity:1});
 add('BT-D-APPROVE','2026-10-12T18:05:00.000Z','approve',{requestId:'BT-SERVICE-D',reason:'Fictional second controls milestone'},['BT-D-STAGE']);
 add('BT-D-RECEIVE','2026-10-13','receive',{poLineId:po(4),receiptReference:'BT-D-ACCEPT',quantity:1},['BT-D-APPROVE']);
 add('BT-D1-IMPORT','2026-10-14','import',{documentId:'BT-D1',poLineId:po(4),supplierId:'SYN-SUP-03',number:'BT-D1',quantity:1,priceCents:200000,currency:'USD'},['BT-D-APPROVE'],{invoiceDates:dates(null,'2026-10-14',null)});
 add('BT-D1-POST','2026-10-15','post',{documentId:'BT-D1'},['BT-D1-IMPORT','BT-D-RECEIVE']);
 add('BT-D1-AUTHORIZE','2026-10-16','authorize',{documentId:'BT-D1'},['BT-D1-POST']);
 add('BT-E-STAGE','2026-10-20','stage',{requestId:'BT-FILTER-E',itemId:'ITEM-FILTER',purposeId:'WORK-FILTER',quantity:4});
 add('BT-E-APPROVE','2026-10-20T18:05:00.000Z','approve',{requestId:'BT-FILTER-E',reason:'Fictional additional filter requirement'},['BT-E-STAGE']);
 add('BT-E1-IMPORT','2026-10-22','import',{documentId:'BT-E1',poLineId:po(5),supplierId:'SYN-SUP-02',number:'BT-E1',quantity:4,priceCents:5500,currency:'USD'},['BT-E-APPROVE'],{invoiceDates:dates('2026-10-21','2026-10-22','2026-11-20')});
 add('BT-CODING-HOLD','2026-10-25','stage',{requestId:'BT-NO-MAPPING',itemId:'ITEM-ENGINEERING',purposeId:'WORK-FILTER',quantity:1});
 add('BT-NOPO-IMPORT','2026-10-28','import',{documentId:'BT-NOPO',poLineId:'UNMATCHED-BT',supplierId:'SYN-SUP-01',number:'BT-NOPO',quantity:1,priceCents:7500,currency:'USD'},[],{invoiceDates:dates('2026-10-27','2026-10-28','2026-11-26')});
 add('BT-E-RECEIVE','2026-11-02','receive',{poLineId:po(5),receiptReference:'BT-E-ACCEPT',quantity:4},['BT-E-APPROVE']);
 add('BT-FX-IMPORT','2026-11-04','import',{documentId:'BT-FX',poLineId:'UNMATCHED-FX',supplierId:'SYN-SUP-01',number:'BT-FX',quantity:1,priceCents:125000,currency:'EUR'},[],{invoiceDates:dates('2026-11-03','2026-11-04','2026-12-03')});
 add('BT-NOPO-WITHDRAW','2026-11-08','withdraw',{documentId:'BT-NOPO',reason:'Source PO could not be established in this scenario'},['BT-NOPO-IMPORT']);
 add('BT-A3-IMPORT','2026-11-10','import',{documentId:'BT-A3',poLineId:po(1),supplierId:'SYN-SUP-02',number:'BT-A3',quantity:1,priceCents:5000,currency:'USD'},['BT-A-APPROVE'],{invoiceDates:dates('2026-11-09',null,'2026-12-09')});
 add('BT-A3-POST','2026-11-12','post',{documentId:'BT-A3'},['BT-A3-IMPORT','BT-A-RECEIVE-2']);
 const caseId=M.analyze().cases[0].id,domain=(id,time,domain,type,actor,payload,dependsOn)=>add(id,'2026-11-15T'+time+':00.000Z',type,payload,dependsOn,{domain,command:{type,actor,payload}});
 domain('BT-M-REVIEW','08:35','maintenance','review',M.roles.review,{caseId,decision:'release',note:'Fictional review after the admitted November observation window.'},[]);
 domain('BT-M-PREPARE','08:40','maintenance','prepare',M.roles.prepare,{caseId},['BT-M-REVIEW']);
 add('BT-F-STAGE','2026-11-15T08:42:00.000Z','stage',{requestId:'REQ-'+caseId,itemId:'ITEM-PUMP',purposeId:'WORK-REPAIR',quantity:1},['BT-M-PREPARE']);
 add('BT-F-APPROVE','2026-11-15T08:45:00.000Z','approve',{requestId:'REQ-'+caseId,reason:'Fictional reviewed pump repair authorization'},['BT-F-STAGE']);
 add('BT-F-RECEIVE','2026-11-15T09:00:00.000Z','receive',{poLineId:po(6),receiptReference:'BT-F-ACCEPT',quantity:1},['BT-F-APPROVE']);
 add('BT-F1-IMPORT','2026-11-15T09:05:00.000Z','import',{documentId:'BT-F1',poLineId:po(6),supplierId:'SYN-SUP-01',number:'BT-F1',quantity:1,priceCents:125000,currency:'USD'},['BT-F-APPROVE'],{invoiceDates:dates('2026-11-15','2026-11-15','2026-12-15')});
 add('BT-F1-POST','2026-11-15T09:10:00.000Z','post',{documentId:'BT-F1'},['BT-F1-IMPORT','BT-F-RECEIVE']);
 add('BT-F1-AUTHORIZE','2026-11-15T09:15:00.000Z','authorize',{documentId:'BT-F1'},['BT-F1-POST']);
 add('BT-F1-PAY','2026-11-15T09:20:00.000Z','pay',{documentId:'BT-F1'},['BT-F1-AUTHORIZE']);
 domain('BT-W-EXECUTE-1','09:55','work','execute',W.roles.execute,{caseId,completionReference:'BT-COMPLETE-1',performedAt:'2026-11-15T09:55:00.000Z',note:'Fictional task recorded against accepted pump material.'},['BT-M-PREPARE','BT-F-RECEIVE']);
 domain('BT-W-RETURN','09:57','work','verify',W.roles.verify,{caseId,workId:'WORK-0001',decision:'return',reason:'Fictional additional task required before acceptance.',sourceSnapshotId:null},['BT-W-EXECUTE-1']);
 domain('BT-W-EXECUTE-2','09:59','work','execute',W.roles.execute,{caseId,completionReference:'BT-COMPLETE-2',performedAt:'2026-11-15T09:59:00.000Z',note:'Fictional revised completion; prior return remains retained.'},['BT-W-RETURN','BT-F-RECEIVE','BT-M-PREPARE']);
 domain('BT-W-ACCEPT','10:35','work','verify',W.roles.verify,{caseId,workId:'WORK-0002',decision:'accept',reason:'Fictional independent acceptance after the admitted evidence window.',sourceSnapshotId:W.policy.sourceSnapshotId},['BT-W-EXECUTE-2']);
 return {format:'SIMULATED-BUSINESS-TIME',version:1,scenarioId:'SYN-BUSINESS-TIME-1',companyId,currency:'USD',fictional:true,calendar:{timeZone:'America/Chicago',basis:'calendar-days',cutoff:'inclusive-business-date'},window:{start:'2026-08-18',end:'2026-11-15',defaultAsOf:'2026-11-15'},policySnapshots:{finance:C.master(),maintenance:M.policy,work:W.policy,terms},description:'Independent authored 90-day fictional cohort. Business dates are source metadata; generated core audit timestamps are diagnostic only. Not visitor history or BPI research.',events};
}
module.exports={fixture,terms};
if(require.main===module){
 const value=fixture(),json=JSON.stringify(value,null,2)+'\n';
 const browser='/* Generated by build_business_time_fixture.cjs; edit the authored definitions. */\n'+
  '(function(root){root.BusinessTimeFixture='+JSON.stringify(value)+';})(typeof window!=="undefined"?window:globalThis);\n';
 const outputs=[['../fixtures/business-time-v1.json',json],['../preview/business-time-data.js',browser]];
 for(const [relative,content]of outputs){
  const target=path.resolve(__dirname,relative);
  if(process.argv.includes('--write')){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content,'utf8');}
  else if(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replaceAll('\r\n','\n')!==content)
   throw Error('Business-time fixture/browser projection differs; review the canonical builder, then regenerate explicitly with --write.');
 }
 console.log(process.argv.includes('--write')?'Wrote deterministic business-time fixture and browser projection.':'PASS business-time fixture and browser projection rebuild consistency.');
}
