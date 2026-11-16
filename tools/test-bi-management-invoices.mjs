// Invoice inspection must keep its source, owner filter and saved evidence consistent.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectBrowser} from './browser-engine.mjs';
const require=createRequire(import.meta.url),selection=selectBrowser(require(process.env.PLAYWRIGHT_MODULE||'playwright')),JourneyRules=require('./bi-prototype/preview/journey-rules.js');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4266',mount='/operations-automation-portfolio',base=`http://127.0.0.1:${port}${mount}`,url=base+'/business-intelligence/management-overview.html',output=resolve(root,'tmp/bi-management-invoices',selection.name);
const keys=['portfolio-phase2-connected-v1','portfolio-phase2-machines-v1','portfolio-phase2-work-v1'];
const report={passed:false,engine:selection.name,layouts:[],checks:[],errors:[],policyViolations:[],toolPolicyViolations:[]};
await mkdir(output,{recursive:true});const axe=await readFile(process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js'),'utf8');let browser,server;
try{
 server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port,BASE_PATH:mount},stdio:['ignore','pipe','pipe']});
 await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});
 browser=await selection.type.launch(selection.options);
 for(const theme of ['light','dark']){
  const context=await browser.newContext({colorScheme:theme,reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.exposeFunction('recordManagementPolicy',item=>{if(selection.name==='webkit'&&item.phase==='screenshot'&&item.directive==='style-src-elem'&&item.blocked==='inline'&&!item.source)report.toolPolicyViolations.push(item);else report.policyViolations.push(item);});
  await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>window.recordManagementPolicy({directive:event.violatedDirective,blocked:event.blockedURI,source:event.sourceFile,phase:window.__managementInvoicePhase||'runtime'})));
  const checked=name=>report.checks.push({theme,name});
  await page.goto(url);const totals=await page.locator('#management-finance').innerText();
  assert.equal(await page.locator('#management-invoice-detail').isVisible(),false);
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.goto(url);
   const button=page.getByRole('button',{name:'Inspect invoice MGMT-FILTER-PRICE',exact:true});
   await button.focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#management-invoice-heading').evaluate(node=>node===document.activeElement),true);
   assert.match(await page.locator('#management-invoice-content').innerText(),/Guided management example.*purchasing revision 21/);
   assert.match(await page.locator('#management-invoice-content').innerText(),/Retained invoice versions.*Evaluation history.*PO and cost allocation evidence/s);
   assert.match(await page.locator('#management-invoice-content').innerText(),/MGMT-FILTERS/);
   assert.equal(await button.getAttribute('aria-expanded'),'true');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const region=page.getByRole('region',{name:'Selected invoice allocation evidence'});await region.focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('#management-finance').innerText(),totals);
   await page.evaluate(axe);const result=await page.evaluate(async()=>{const findings=await axe.run(document.querySelector('#management-invoice-detail'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return findings.violations.map(item=>({id:item.id,impact:item.impact}));});assert.deepEqual(result,[]);
   report.layouts.push({theme,width,opened:'MGMT-FILTER-PRICE',overflow:false,accessibilityViolations:result});
  }
  await page.locator('#management-refresh').click();assert.match(await page.locator('#management-invoice-heading').innerText(),/MGMT-FILTER-PRICE/);assert.equal(await page.locator('#management-invoice-detail').isVisible(),true);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#management-download').click()]);const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(exported.viewSelection.invoiceDocumentId,'MGMT-FILTER-PRICE');assert.equal(exported.finance.heldDocuments.filter(item=>item.id==='MGMT-FILTER-PRICE').length,1);
  assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),keys),[null,null,null]);checked('Read-only example inspection, unchanged refresh and complete export preserve selection without writing journals.');
  await page.setViewportSize({width:320,height:1000});const hold=page.locator('#management-coding-holds details');await hold.locator('summary').click();
  assert.match(await hold.innerText(),/Captured quantity\s+1/);assert.match(await hold.innerText(),/SYN-MASTER-1/);assert.match(await hold.innerText(),/does not resolve this captured hold or recode saved purchases/);
  assert.equal(await hold.getByRole('link',{name:'Explore the separate Finance governance example →'}).getAttribute('href'),'policy-review.html');
  const [heldFile]=await Promise.all([page.waitForEvent('download'),hold.getByRole('button',{name:'Download coding-hold evidence MGMT-CODING-HOLD',exact:true}).click()]);const holdExport=JSON.parse(await readFile(await heldFile.path(),'utf8'));
  assert.equal(holdExport.format,'SIMULATED-CODING-HOLD-EVIDENCE');assert.equal(holdExport.inspectionSource,'example');assert.equal(holdExport.request.id,'MGMT-CODING-HOLD');assert.equal(holdExport.request.status,'Held');
  assert.deepEqual(holdExport.request,JourneyRules.restore(JSON.stringify(holdExport.source.checkpoint)).requests.find(request=>request.id===holdExport.request.id));
  assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),keys),[null,null,null]);assert.equal(await page.locator('#management-finance').innerText(),totals);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.evaluate(axe);assert.deepEqual(await page.evaluate(async()=>{const result=await axe.run(document.querySelector('#management-coding-holds'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(item=>item.id);}),[]);checked('Captured coding-hold download replays exactly, preserves the unresolved decision and clearly separates the fixed Finance example.');
  await page.getByRole('button',{name:'Receiving / service owner · 2',exact:true}).click();assert.equal(await page.locator('#management-invoice-detail').isVisible(),false);assert.equal(await page.locator('#management-invoice-content').innerText(),'');
  assert.equal(await page.locator('#management-documents [aria-expanded=true]').count(),0);checked('An owner filter that excludes the inspected invoice clears its detail and expanded state.');
  const journals=await page.evaluate(keys=>{const sample=ManagementScenarios.example(),values=[Journey.serialize(sample.purchasing),Machines.serialize(sample.maintenance),WorkExecution.serialize(sample.work)];keys.forEach((key,index)=>sessionStorage.setItem(key,values[index]));return values;},keys);
  await page.locator('#management-current').click();assert.equal(await page.locator('#management-invoice-detail').isVisible(),false);
  await page.getByRole('button',{name:'Inspect invoice MGMT-CAPITAL-INVOICE',exact:true}).click();assert.match(await page.locator('#management-invoice-content').innerText(),/My saved purchasing journal/);
  assert.match(await page.locator('#management-invoice-content').innerText(),/Receiving \/ service owner/);assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),keys),journals);
  await page.locator('#management-refresh').click();assert.equal(await page.locator('#management-invoice-detail').isVisible(),true);checked('Current-journal inspection uses declared saved-source context and does not alter any source.');
  const currentHold=page.locator('#management-coding-holds details');await currentHold.locator('summary').click();const [currentHoldFile]=await Promise.all([page.waitForEvent('download'),currentHold.getByRole('button',{name:'Download coding-hold evidence MGMT-CODING-HOLD',exact:true}).click()]);const currentHoldExport=JSON.parse(await readFile(await currentHoldFile.path(),'utf8'));
  assert.equal(currentHoldExport.inspectionSource,'current');assert.equal(JSON.stringify(currentHoldExport.source.checkpoint),journals[0]);assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),keys),journals);checked('Saved-source coding-hold evidence keeps the exact current checkpoint and all journals unchanged.');
  await page.evaluate(keys=>{const checkpoint=JSON.parse(sessionStorage.getItem(keys[0]));checkpoint.commands.find(command=>command.type==='receive').payload.receiptReference='SAME-REVISION-CHANGED-MANAGEMENT-RECEIPT';sessionStorage.setItem(keys[0],JSON.stringify(checkpoint));},keys);
  await page.locator('#management-refresh').click();assert.equal(await page.locator('#management-invoice-detail').isVisible(),false);assert.equal(await page.locator('#management-invoice-content').innerText(),'');checked('Changed command content clears source-specific invoice inspection even at the same revision.');
  await page.getByRole('button',{name:'Inspect invoice MGMT-CAPITAL-INVOICE',exact:true}).click();await page.evaluate(keys=>sessionStorage.setItem(keys[0],'INVALID-CURRENT-SOURCE'),keys);await page.locator('#management-refresh').click();
  assert.equal(await page.locator('#management-invoice-detail').isVisible(),false);assert.match(await page.locator('#management-documents').innerText(),/No readable invoice source/);assert.equal(await page.evaluate(keys=>sessionStorage.getItem(keys[0]),keys),'INVALID-CURRENT-SOURCE');checked('A damaged source hides invoice detail without replacing or deleting the saved evidence.');
  await page.locator('#management-example').click();
  const special=await page.evaluate(keys=>{let purchasing=Journey.create();const act=(id,type,payload)=>{purchasing=Journey.dispatch(purchasing,{id,type,actor:Journey.roles[type],payload});};act('MGMT-INVOICE-UNMAPPED','importDocument',{documentId:'UNMAPPED-EUR',supplierId:'SYN-SUP-01',number:'UNMAPPED-EUR',currency:'EUR',declaredNetCents:11000,sourceLabel:'<img src=x onerror=alert(1)>',lines:[{poLineId:'UNKNOWN',quantity:1,priceCents:12000}]});act('MGMT-INVOICE-CORRECTION','proposeCorrection',{documentId:'UNMAPPED-EUR',expectedVersion:1,pricesCents:[12000],declaredNetCents:12000,reason:'Fictional supplier corrects the declared header amount.',sourceLabel:'Fictional supplier version 2'});act('MGMT-INVOICE-REVIEW','reviewCorrection',{documentId:'UNMAPPED-EUR',decision:'approve',reason:'Independent review corrects header; PO and currency holds remain.'});sessionStorage.setItem(keys[0],Journey.serialize(purchasing));return Journey.serialize(purchasing);},keys);
  await page.locator('#management-current').click();await page.getByRole('button',{name:'Inspect invoice UNMAPPED-EUR',exact:true}).click();
  const detail=await page.locator('#management-invoice-content').innerText();assert.match(detail,/EUR/);assert.match(detail,/Unmapped; owned review/);assert.match(detail,/No mapped PO request/);assert.match(detail,/Version 1.*Version 2/s);assert.match(detail,/approve.*Purchasing approver/s);assert.ok(detail.includes('<img src=x onerror=alert(1)>'));assert.equal(await page.locator('#management-invoice-detail img').count(),0);
  assert.match(await page.locator('[data-measure=invoiced] strong').innerText(),/\$0\.00/);assert.equal(await page.evaluate(keys=>sessionStorage.getItem(keys[0]),keys),special);checked('Unmapped multi-reason non-USD invoices stay unposted, explicitly unmapped and rendered as inert text.');
  await page.locator('#management-example').click();await page.getByRole('button',{name:'Inspect invoice MGMT-FILTER-PRICE',exact:true}).click();
  await page.evaluate(()=>window.__managementInvoicePhase='screenshot');await page.locator('#management-invoice-detail').screenshot({path:resolve(output,'invoice-detail-'+theme+'.png')});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__managementInvoicePhase='runtime';resolve();}))));await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.policyViolations,[]);report.passed=true;console.log(`PASS ${selection.name}: ${report.layouts.length} invoice-detail layouts and ${report.checks.length} source/filter/recovery groups.`);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server?.kill();}
