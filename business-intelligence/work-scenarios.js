(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./machine-rules.js'),require('./journey-rules.js')):factory(root.Machines,root.Journey);if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkScenarios=api;})(typeof window!=='undefined'?window:globalThis,function(M,J){
 'use strict';function ready(){const caseId=M.analyze().cases[0].id;let maintenance=M.dispatch(M.create(),{id:'WORK-EXAMPLE-REVIEW',type:'review',actor:M.roles.review,payload:{caseId,decision:'release',note:'Fictional condition reviewed for the approved routine repair work package.'}});const h=M.handoff(maintenance,caseId,J.create());maintenance=h.maintenance;let journey=h.journey;
  for(const [type,payload]of [['approve',{requestId:journey.requests[0].id,reason:'Fictional purchasing approval for the reviewed repair'}]])journey=J.dispatch(journey,{id:'WORK-EXAMPLE-'+type,type,actor:J.roles[type],payload});
  journey=J.dispatch(journey,{id:'WORK-EXAMPLE-ACCEPT',type:'receive',actor:J.roles.receive,payload:{poLineId:journey.erp.lines[0].id,receiptReference:'WORK-MATERIAL-ACCEPT',quantity:1}});return {caseId,maintenance,journey};
 }
 return {ready};
});
