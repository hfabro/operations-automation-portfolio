import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const selection = selectBrowser(require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
const J = require('./bi-prototype/preview/journey-rules.js'), S = require('./bi-prototype/preview/inbox-samples.js');
const C = require('./bi-prototype/preview/inbox-context.js'), Inbox = require('./bi-prototype/preview/inbox-rules.js');
const Trail = require('./bi-prototype/preview/invoice-trail-rules.js');
const axe = await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const port = process.env.TEST_PORT || '4457', prefix = process.env.BI_BASE_URL || `http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/`;
const output = resolve(root, 'tmp/bi-invoice-trail', selection.name), key = 'portfolio-phase2-connected-v1', others = ['portfolio-phase2-machines-v1','portfolio-phase2-work-v1'];
const base = S.journal(), baseline = J.serialize(base), context = await C.capture(baseline), sample = C.example(context, base.erp.lines[0].id)[0];
const pair = [sample, {...sample, id: 'OTHER', order: 1, content: sample.content.replace(/^Invoice: .*$/m,'Invoice: OTHER-INVOICE')}];
const imported = await Inbox.stage(await Inbox.prepareCurrent(pair, baseline), baseline, 'AP'); let state = J.restore(imported.checkpoint);
const target = state.documents.at(-1).id, other = state.documents[0].id;
for (const type of ['post','authorize','pay']) state = J.dispatch(state, {id: 'OTHER-' + type, type, actor: J.roles[type], payload: {documentId: other}});
const initial = J.serialize(state), url = prefix + 'connected-journey.html?invoice=' + encodeURIComponent(target) + '#invoice-trail';
const report = {passed: false, engine: selection.name, checks: [], layouts: [], errors: []}, checked = name => report.checks.push(name);
const saved = page => page.evaluate(key => window.nativeGet.call(sessionStorage,key),key);
const setSaved = (page,raw) => page.evaluate(({key,raw}) => raw === null ? window.nativeRemove.call(sessionStorage,key) : window.nativeSet.call(sessionStorage,key,raw),{key,raw});
const ready = (page,status='Ready') => page.waitForFunction(status => !document.getElementById('invoice-trail-content').hidden && !document.getElementById('invoice-trail-download').disabled && document.getElementById('invoice-trail-status').textContent.includes(' · '+status+' · saved revision '),status);
async function evidence(page,id='invoice-trail-download') {const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#'+id).click()]);return JSON.parse(await readFile(await file.path(),'utf8'));}
async function init(ctx,theme) {
 await ctx.addInitScript(({key,initial,others,theme}) => {
  localStorage.setItem('portfolio-theme',theme);
  if(!sessionStorage.getItem('__trail-seeded')) {sessionStorage.setItem(key,initial);for(const k of others)sessionStorage.setItem(k,'preserve-'+k);sessionStorage.setItem('__trail-seeded','yes');}
  window.nativeSet=Storage.prototype.setItem;window.nativeGet=Storage.prototype.getItem;window.nativeRemove=Storage.prototype.removeItem;window.trailWrites=[];
  Storage.prototype.setItem=function(k,v){if(this===sessionStorage)window.trailWrites.push(k);return window.nativeSet.call(this,k,v);};
 },{key,initial,others,theme});
}
function watch(page) {page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.errors.push(response.url()+' '+response.status());});}
let browser,server;
await mkdir(output,{recursive:true});
try {
 if(!process.env.BI_BASE_URL) {server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port,BASE_PATH:'/operations-automation-portfolio'},stdio:['ignore','pipe','pipe']});await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});}
 browser=await selection.type.launch(selection.options);report.browser=browser.version();
 for(const theme of ['light','dark']) {
  const ctx=await browser.newContext({colorScheme:theme,reducedMotion:'reduce',acceptDownloads:true});await init(ctx,theme);
  const page=await ctx.newPage();watch(page);await page.goto(url);await ready(page);
  assert.equal(await page.locator('#journey-document-select').inputValue(),target);
  const model=await evidence(page),expected=await Trail.build(initial,target);assert.deepEqual(model,expected);
  assert.equal(model.financial.paidNetCents,0);assert.equal(model.financial.pending.calculatedNetCents,125000);assert.equal(await saved(page),initial);
  assert.deepEqual(await page.evaluate(()=>window.trailWrites),[]);checked(theme+': non-first linked document selected through native controls with read-only model parity');
  for(const width of [320,1440]) {
   await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.evaluate(axe);
   const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(row=>({id:row.id,nodes:row.nodes.map(n=>n.target)})));
   assert.deepEqual(violations,[],theme+' '+width);await page.screenshot({path:resolve(output,theme+'-'+width+'.png'),fullPage:true});report.layouts.push({theme,width});
  }
  checked(theme+': responsive light/dark invoice trail, keyboard controls and accessible native workflow');
  await page.locator('#journey-role').selectOption('AP');await page.locator('#journey-post').click();await ready(page,'Posted');
  assert.equal((await evidence(page)).financial.unpaidNetCents,125000);
  await page.locator('#journey-role').selectOption('Payment approver');await page.locator('#journey-authorize').click();await ready(page,'Authorized');
  assert.equal((await evidence(page)).financial.paidNetCents,0);
  await page.locator('#journey-role').selectOption('Treasury');await page.locator('#journey-pay').click();await ready(page,'Paid');
  const paid=await evidence(page);assert.equal(paid.financial.paidNetCents,125000);assert.equal(paid.financial.unpaidNetCents,0);
  const paidRaw=await saved(page);assert.equal(J.restore(paidRaw).documents.filter(row=>row.status==='Paid').length,2);
  assert.deepEqual(await page.evaluate(()=>window.trailWrites),[key,key,key]);checked(theme+': native post/authorize/pay refresh invoice progress without combining financial stages');
  await page.getByRole('link',{name:'Open this invoice in the BI report →',exact:true}).click();await page.waitForURL('**/business-report.html?*');
  await page.waitForFunction(()=>!document.getElementById('report-invoice-entry').hidden);
  assert.match(await page.locator('#report-document-detail').innerText(),new RegExp(target));
  assert.match(await page.locator('#report-invoice-entry').innerText(),/whole current journal/);
  assert.match(await page.locator('[data-measure=paid]').innerText(),/2,500/);
  const bi=await evidence(page,'download-bi-model');assert.equal(bi.sourceCheckpoint.commands.length,J.restore(paidRaw).revision);
  assert.equal(bi.reportSelection.measure,'paid');assert.equal(await saved(page),paidRaw);assert.deepEqual(await page.evaluate(()=>window.trailWrites),[]);
  await page.locator('#report-workflow').focus();await page.keyboard.press('Enter');await page.waitForURL('**/connected-journey.html?*');await ready(page,'Paid');
  assert.equal(await page.locator('#journey-document-select').inputValue(),target);assert.equal(await saved(page),paidRaw);
  checked(theme+': selected-invoice BI detail keeps wider KPI totals and returns to the same purchasing document');
  const changed=JSON.stringify(JSON.parse(paidRaw),null,2);await setSaved(page,changed);await page.locator('#invoice-trail-download').click();
  await page.waitForFunction(()=>document.getElementById('invoice-trail-download').disabled);assert.equal(await page.locator('#invoice-trail-content').isVisible(),false);assert.equal(await saved(page),changed);
  checked(theme+': stale raw source blocks trail evidence download without replacing purchasing');
  await setSaved(page,paidRaw);await page.goto(prefix+'connected-journey.html?invoice=MISSING#invoice-trail');
  await page.waitForFunction(()=>document.getElementById('invoice-trail-status').textContent.includes('linked invoice was not found'));
  await page.locator('#journey-role').selectOption('AP');await page.waitForFunction(()=>document.getElementById('invoice-trail-status').textContent.includes('linked invoice was not found'));
  assert.equal(await page.locator('#invoice-trail-content').isVisible(),false);
  await page.locator('#journey-document-select').selectOption(target);await ready(page,'Paid');
  checked(theme+': missing linked invoice never substitutes a trail until explicit native document selection');
  await page.goto(prefix+'business-report.html?source=current&invoice=MISSING');
  await page.waitForFunction(()=>!document.getElementById('report-invoice-entry').hidden);
  assert.match(await page.locator('#report-invoice-entry').innerText(),/No other document detail is substituted/);assert.equal((await page.locator('#report-document-detail').innerText()).trim(),'');
  for(const raw of [null,'damaged']) {await setSaved(page,raw);await page.goto(prefix+'business-report.html?source=current&invoice='+encodeURIComponent(target));await page.waitForFunction(()=>document.getElementById('report-source').textContent.includes('unavailable'));assert.equal(await page.locator('#financial-heading').isVisible(),false);assert.equal(await page.locator('#download-bi-model').isDisabled(),true);assert.equal(await saved(page),raw);}
  checked(theme+': missing target and absent/damaged journal show explicit unavailable states without guided substitution');
  await setSaved(page,initial);await page.goto(url);await ready(page);
  await page.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);let first=true;window.hashPaused=false;crypto.subtle.digest=async(...args)=>{if(first){first=false;window.hashPaused=true;await new Promise(resolve=>{window.releaseHash=resolve;});}return digest(...args);};});
  await page.locator('#invoice-trail-refresh').click();await page.waitForFunction(()=>window.hashPaused);
  await setSaved(page,initial+'\n');await page.evaluate(()=>window.releaseHash());
  await page.waitForFunction(()=>document.getElementById('invoice-trail-status').textContent.includes('changed during validation'));
  assert.equal(await page.locator('#invoice-trail-content').isVisible(),false);assert.equal(await saved(page),initial+'\n');
  checked(theme+': async trail validation rejects changed source and preserves the newer raw value');
  for(const otherKey of others)assert.equal(await page.evaluate(k=>window.nativeGet.call(sessionStorage,k),otherKey),'preserve-'+otherKey);
  checked(theme+': unrelated maintenance/work journals preserved');await ctx.close();
 }
 const ctx=await browser.newContext({acceptDownloads:true,reducedMotion:'reduce'});await init(ctx,'light');const page=await ctx.newPage();watch(page);
 await page.goto(prefix+'document-inbox.html');await page.waitForFunction(()=>!document.getElementById('inbox-results').hidden);await setSaved(page,baseline);
 await page.locator('#inbox-capture').click();await page.waitForFunction(()=>!document.getElementById('inbox-captured').hidden);
 await page.locator('#inbox-context-example').click();await page.waitForFunction(()=>!document.getElementById('inbox-results').hidden && !document.getElementById('inbox-stage-button').disabled);
 await page.locator('#inbox-stage-button').click();await page.waitForFunction(()=>!document.getElementById('inbox-invoice-handoffs').hidden);
 const source=await evidence(page,'inbox-download'),selected=source.staging.documentIds[0];
 const card=page.locator('#inbox-invoice-handoffs>div').first(),reportHref=await card.getByRole('link',{name:'Open this invoice in the BI report →',exact:true}).getAttribute('href');
 assert.equal(new URL(reportHref,prefix).searchParams.get('invoice'),selected);
 const box=await card.boundingBox();await card.click({position:{x:box.width-10,y:10}});await page.waitForURL('**/connected-journey.html?*');await ready(page);
 assert.equal(await page.locator('#journey-document-select').inputValue(),selected);assert.equal((await evidence(page)).receipt.sourceSha256,source.sourceItems[0].sha256);
 checked('full inbox handoff card opens the exact new document and preserves its independent BI destination');await ctx.close();
 assert.deepEqual(report.errors,[]);report.passed=true;console.log('PASS '+selection.name+': '+report.checks.length+' invoice-walkthrough browser groups; '+report.layouts.length+' accessible layouts.');
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)server.kill();}
