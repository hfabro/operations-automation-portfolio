import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url)),selection=selectBrowser(require(process.env.PLAYWRIGHT_MODULE||'playwright'));
const J=require('./bi-prototype/preview/journey-rules.js'),S=require('./bi-prototype/preview/inbox-samples.js'),C=require('./bi-prototype/preview/inbox-context.js'),Inbox=require('./bi-prototype/preview/inbox-rules.js');
const axe=await readFile(process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js'),'utf8');
const port=process.env.TEST_PORT||'4459',prefix=process.env.BI_BASE_URL||`http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`,url=prefix+'management-overview.html';
const output=resolve(root,'tmp/bi-management-source-invoices',selection.name),key='portfolio-phase2-connected-v1',others=['portfolio-phase2-machines-v1','portfolio-phase2-work-v1'];
const base=S.journal(),baseline=J.serialize(base),sample=C.example(await C.capture(baseline),base.erp.lines[0].id)[0];
const heldSource={...sample,id:'HELD',order:1,content:sample.content.replace(/^Invoice: .*$/m,'Invoice: MANAGEMENT-HELD').replace('Net-Total: 1250.00','Net-Total: 1300.00')};
const imported=await Inbox.stage(await Inbox.prepareCurrent([sample,heldSource],baseline),baseline,'AP');let state=J.restore(imported.checkpoint);
const paidId=state.documents.find(row=>row.status==='Ready').id,heldId=state.documents.find(row=>row.status==='Held').id;
for(const type of ['post','authorize','pay'])state=J.dispatch(state,{id:'PAID-'+type,type,actor:J.roles[type],payload:{documentId:paidId}});
const savedRaw=J.serialize(state),report={passed:false,engine:selection.name,checks:[],layouts:[],errors:[]},checked=name=>report.checks.push(name);
const indexReady=page=>page.waitForFunction(()=>!document.getElementById('management-source-invoice-content').hidden);
const saved=page=>page.evaluate(key=>window.nativeGet.call(sessionStorage,key),key);
const setSaved=(page,raw)=>page.evaluate(({key,raw})=>raw===null?window.nativeRemove.call(sessionStorage,key):window.nativeSet.call(sessionStorage,key,raw),{key,raw});
async function pauseHash(page){await page.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);let first=true;window.hashPaused=false;crypto.subtle.digest=async(...args)=>{if(first){first=false;window.hashPaused=true;await new Promise(resolve=>{window.releaseHash=resolve;});}return digest(...args);};});}
let browser,server;
await mkdir(output,{recursive:true});
try{
 if(!process.env.BI_BASE_URL){server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port,BASE_PATH:'/operations-automation-portfolio'},stdio:['ignore','pipe','pipe']});await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});}
 browser=await selection.type.launch(selection.options);report.browser=browser.version();
 for(const theme of ['light','dark']){
  const ctx=await browser.newContext({colorScheme:theme,reducedMotion:'reduce'});
  await ctx.addInitScript(({key,savedRaw,others,theme})=>{
   localStorage.setItem('portfolio-theme',theme);
   if(!sessionStorage.getItem('__management-source-seeded')){sessionStorage.setItem(key,savedRaw);for(const other of others)sessionStorage.setItem(other,'preserve-'+other);sessionStorage.setItem('__management-source-seeded','yes');}
   window.nativeSet=Storage.prototype.setItem;window.nativeGet=Storage.prototype.getItem;window.nativeRemove=Storage.prototype.removeItem;window.sessionWrites=[];
   Storage.prototype.setItem=function(k,v){if(this===sessionStorage){window.sessionWrites.push(k);throw Error('Unexpected management journal write');}return window.nativeSet.call(this,k,v);};
   Storage.prototype.getItem=function(k){if(this===sessionStorage&&k===key&&window.blockPurchasingRead)throw Error('Purchasing read denied');return window.nativeGet.call(this,k);};
  },{key,savedRaw,others,theme});
  const page=await ctx.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.errors.push(response.url()+' '+response.status());});
  await page.goto(url);const exampleFinance=await page.locator('#management-finance').innerText();
  assert.match(await page.locator('#management-source-invoice-status').innerText(),/Guided snapshot/);assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);
  assert.equal(await saved(page),savedRaw);checked(theme+': guided snapshot never projects saved source invoices into its example');
  await page.locator('#management-current').click();await indexReady(page);
  assert.equal(await page.locator('#management-source-invoice-rows tr').count(),2);assert.match(await page.locator('#management-invoice-summary').innerText(),/Invoice holds: 1/);
  assert.match(await page.locator('#management-source-invoice-count').innerText(),/2 source-receipted documents/);
  assert.equal(await page.locator('#management-download').isDisabled(),true);checked(theme+': paid and held source invoices available with purchasing alone and incomplete work sources');
  await page.locator('#management-finance [data-measure=paid]').click();await page.locator('#management-owners button').last().click();
  await page.getByRole('button',{name:'Inspect invoice '+heldId,exact:true}).click();await page.locator('#management-allocations button').first().click();
  const allocationText=await page.locator('#management-record-detail').innerText(),invoiceText=await page.locator('#management-invoice-content').innerText(),owner=await page.locator('#management-owners [aria-pressed=true]').getAttribute('data-owner');
  await page.locator('#management-source-invoice-filter').selectOption('Paid');
  assert.equal(await page.locator('#management-source-invoice-rows tr').count(),1);assert.match(await page.locator('#management-source-invoice-rows').innerText(),new RegExp(paidId));
  assert.equal(await page.locator('#management-finance [data-measure=paid]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#management-owners [aria-pressed=true]').getAttribute('data-owner'),owner);
  assert.equal(await page.locator('#management-record-detail').innerText(),allocationText);assert.equal(await page.locator('#management-invoice-content').innerText(),invoiceText);
  await page.locator('#management-refresh').click();await indexReady(page);assert.equal(await page.locator('#management-source-invoice-filter').inputValue(),'Paid');
  assert.equal(await page.locator('#management-invoice-content').innerText(),invoiceText);checked(theme+': source status filter and unchanged refresh preserve financial measure, owner, allocation and invoice evidence');
  for(const width of [320,1440]){
   await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.locator('#management-current').hover();
   await page.evaluate(axe);const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>node.target)})));
   assert.deepEqual(violations,[],theme+' '+width);await page.screenshot({path:resolve(output,theme+'-'+width+'.png'),fullPage:true});report.layouts.push({theme,width});
  }
  await page.locator('#management-owners [aria-pressed=true]').hover();
  const ownerViolations=await page.evaluate(async()=>(await axe.run(document.getElementById('management-owners'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(row=>row.id));assert.deepEqual(ownerViolations,[]);
  checked(theme+': accessible mobile/desktop source index and selected-source/owner hover states');
  await page.locator('#management-source-invoice-rows').getByRole('link',{name:/Open purchasing trail/}).click();await page.waitForURL('**/connected-journey.html?*');
  await page.waitForFunction(()=>!document.getElementById('invoice-trail-content').hidden);
  assert.equal(await page.locator('#journey-document-select').inputValue(),paidId);assert.match(await page.locator('#invoice-trail-status').innerText(),/Paid/);assert.equal(await saved(page),savedRaw);
  await page.goto(url+'?source=current');await indexReady(page);await page.locator('#management-source-invoice-filter').selectOption('Paid');
  await page.locator('#management-source-invoice-rows').getByRole('link',{name:/Open BI document detail/}).click();await page.waitForURL('**/business-report.html?*');
  await page.waitForFunction(()=>!document.getElementById('report-invoice-entry').hidden);
  assert.match(await page.locator('#report-document-detail').innerText(),new RegExp(paidId));assert.match(await page.locator('#report-invoice-entry').innerText(),/whole current journal/);assert.equal(new URL(page.url()).searchParams.get('measure'),'paid');
  assert.equal(await saved(page),savedRaw);checked(theme+': native purchasing and BI links identify the paid document without writing or normalizing saved progress');
  await page.goto(url+'?source=current');await indexReady(page);const staleLink=page.locator('#management-source-invoice-rows').getByRole('link',{name:/Open purchasing trail/}).first();await staleLink.focus();
  const pretty=JSON.stringify(JSON.parse(savedRaw),null,2);await setSaved(page,pretty);const beforeUrl=page.url();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.getElementById('management-source-invoice-status').textContent.includes('changed'));
  assert.equal(page.url(),beforeUrl);assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);assert.equal(await saved(page),pretty);
  checked(theme+': stale raw source blocks keyboard navigation and preserves the newer saved value');
  await setSaved(page,savedRaw);await page.locator('#management-refresh').click();await indexReady(page);
  await page.locator('#management-finance [data-measure=paid]').click();await page.locator('#management-source-invoice-filter').selectOption('Paid');
  await pauseHash(page);await page.locator('#management-refresh').click();await page.waitForFunction(()=>window.hashPaused);await setSaved(page,pretty);await page.evaluate(()=>window.releaseHash());
  await page.waitForFunction(()=>document.getElementById('management-source-invoice-status').textContent.includes('changed'));
  assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);assert.equal(await page.locator('#management-finance [data-measure=paid]').getAttribute('aria-pressed'),'true');assert.equal(await saved(page),pretty);
  await page.locator('#management-refresh').click();await indexReady(page);assert.equal(await page.locator('#management-source-invoice-filter').inputValue(),'Paid');
  checked(theme+': async source drift is rejected and explicit equivalent refresh preserves the source-status filter');
  await pauseHash(page);await page.locator('#management-refresh').click();await page.waitForFunction(()=>window.hashPaused);await page.locator('#management-example').click();await page.evaluate(()=>window.releaseHash());
  assert.match(await page.locator('#management-source-invoice-status').innerText(),/Guided snapshot/);assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);assert.equal(await page.locator('#management-finance').innerText(),exampleFinance);
  checked(theme+': guided switch cancels a late current-index result');
  for(const raw of [null,'damaged']){await setSaved(page,raw);await page.locator('#management-current').click();await page.waitForFunction(()=>document.getElementById('management-source-invoice-status').textContent.includes('unavailable'));assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);assert.equal(await saved(page),raw);}
  await setSaved(page,savedRaw);await page.evaluate(()=>{window.blockPurchasingRead=true;});await page.locator('#management-current').click();
  assert.match(await page.locator('#management-source-invoice-status').innerText(),/unavailable/);assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);
  await page.locator('#management-example').click();assert.match(await page.locator('#management-source-invoice-status').innerText(),/Guided snapshot/);await page.evaluate(()=>{window.blockPurchasingRead=false;});
  checked(theme+': absent, damaged and unreadable sources never become a zero count or guided substitute');
  const bad=JSON.parse(savedRaw);bad.commands.find(row=>row.id.startsWith('SOURCE-INBOX:')).payload.sourceLabel='Edited fingerprint';await setSaved(page,JSON.stringify(bad));await page.locator('#management-current').click();
  await page.waitForFunction(()=>document.getElementById('management-source-invoice-status').textContent.includes('Source-invoice evidence unavailable'));
  assert.match(await page.locator('#management-finance').innerText(),/1,250/);assert.equal(await page.locator('#management-source-invoice-content').isVisible(),false);
  checked(theme+': unverifiable receipt evidence is held while valid financial snapshot remains inspectable');
  await setSaved(page,baseline);await page.locator('#management-refresh').click();await indexReady(page);assert.match(await page.locator('#management-source-invoice-count').innerText(),/0 source-receipted documents/);
  assert.deepEqual(await page.evaluate(()=>window.sessionWrites),[]);for(const other of others)assert.equal(await page.evaluate(k=>window.nativeGet.call(sessionStorage,k),other),'preserve-'+other);
  checked(theme+': a valid receipt-free source has a known empty subset; all journals remain unchanged');await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;console.log('PASS '+selection.name+': '+report.checks.length+' management-source browser groups; '+report.layouts.length+' accessible layouts.');
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)server.kill();}
