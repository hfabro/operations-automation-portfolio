import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.TEST_PORT||'4201';
const base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/cmms-lifecycle/');
  await page.locator('[data-guide-start]').click();
  await page.locator('[data-scenario="exception"]:visible').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-guide-count]').textContent.startsWith('Step 2'));
  const scenarioNote=await page.locator('[data-closeout-note]').inputValue();
  await page.locator('[data-scenario="exception"]:visible').first().click();
  assert.match(await page.locator('[data-validation]').innerText(),/work in progress/i);
  assert.equal(await page.locator('[data-closeout-note]').inputValue(),scenarioNote);
  assert.match(await page.locator('[data-guide-count]').innerText(),/^Step 2 of/);
  await page.locator('[data-guide-exit]').click();
  const firstId=await page.locator('[data-occurrence-id]').innerText();
  assert.match(await page.locator('[data-sign-state]').innerText(),/Signed/);
  await page.locator('[data-task-status="0"]').selectOption('N/A');
  assert.equal(await page.locator('[data-sign-state]').innerText(),'Not signed');
  await page.locator('[data-submit]').click();assert.match(await page.locator('[data-validation]').innerText(),/Apply the demo technician sign-off/);
  await page.locator('[data-sign]').click();
  await page.locator('[data-task-reading]').first().focus();await page.keyboard.press('Control+A');await page.keyboard.type('1.2');
  assert.equal(await page.locator('[data-task-reading]').first().evaluate(e=>document.activeElement===e),true);
  assert.equal(await page.locator('[data-sign-state]').innerText(),'Not signed');
  await page.locator('[data-sign]').click();await page.locator('[data-task-evidence]').first().click();
  assert.equal(await page.locator('[data-sign-state]').innerText(),'Not signed');
  await page.locator('[data-sign]').click();await page.locator('[data-closeout-note]').fill('Fictional observation for the original asset.');
  assert.equal(await page.locator('[data-sign-state]').innerText(),'Not signed');
  await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.equal(await page.locator('[data-packet-status]').innerText(),'Supervisor review');
  assert.match(await page.locator('.history-card > p').innerText(),/earlier occurrences appear as session event summaries/i);
  await page.locator('[data-guide-start]').click();
  await page.locator('[data-tab="plan"]').click();await page.locator('[data-scenario="exception"]:visible').first().click();
  assert.match(await page.locator('[data-guide-count]').innerText(),/^Step 1 of/);
  assert.equal(await page.locator('[data-occurrence-id]').innerText(),firstId);
  assert.equal(await page.locator('[data-packet-status]').innerText(),'Supervisor review');
  assert.equal(await page.locator('[data-submit]').isDisabled(),true);
  assert.equal(await page.locator('[data-task-status]').first().isDisabled(),true);
  assert.match(await page.locator('[data-validation]').innerText(),/occurrence is locked/i);
  await page.locator('[data-tab="plan"]').click();await page.locator('[data-asset-index="1"]').click();await page.locator('[data-generate]:visible').last().click();
  assert.notEqual(await page.locator('[data-occurrence-id]').innerText(),firstId);
  assert.equal(await page.locator('[data-closeout-note]').inputValue(),'');
  assert.match(await page.locator('[data-history]').innerText(),new RegExp(firstId+' submitted'));
  await page.locator('[data-scenario="exception"]:visible').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-guide-count]').textContent.startsWith('Step 2'));
  await page.locator('[data-guide-exit]').click();
  for(let i=0;i<10;i++)await page.locator('[data-sign]').click();
  const times=await page.locator('[data-history] li span').allTextContents();
  assert.ok(times.some(t=>t.startsWith('09:')));for(const time of times)assert.match(time,/^(?:[01]\d|2[0-3]):[0-5]\d$/);
  await page.reload();
  // Add a synthetic evidence requirement only in this isolated browser session.
  await page.evaluate(()=>{window.CMMS_DEMO_DATA.assets[0].tasks[2].evidence=true;});
  await page.locator('[data-generate]').first().click();
  for(const index of [0,1,2,3])await page.locator(`[data-task-status="${index}"]`).selectOption('Done');
  await page.locator('[data-task-reading="3"]').fill('0.6');
  await page.locator('[data-closeout-note]').fill('Fictional instrument unavailable; inspection blocked.');
  await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.match(await page.locator('[data-validation]').innerText(),/T03 needs a reading/);
  await page.locator('[data-task-status="2"]').selectOption('Issue found');
  await page.locator('[data-task-evidence="2"]').click();await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.match(await page.locator('[data-validation]').innerText(),/T03 needs a reading/);
  await page.locator('[data-task-status="2"]').selectOption('Blocked');await page.locator('[data-task-evidence="2"]').click();
  await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.match(await page.locator('[data-validation]').innerText(),/T03 needs simulated evidence/);
  assert.doesNotMatch(await page.locator('[data-validation]').innerText(),/T03 needs a reading/);
  await page.locator('[data-task-evidence="2"]').click();await page.locator('[data-closeout-note]').fill('');await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.match(await page.locator('[data-validation]').innerText(),/Add a closeout note/);
  await page.locator('[data-closeout-note]').fill('Fictional instrument unavailable; inspection blocked.');await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
  assert.equal(await page.locator('[data-packet-status]').innerText(),'Supervisor review');
  assert.match(await page.locator('[data-review-queue]').innerText(),/T03: Blocked/);
  for (const result of ['N/A','Blocked','Done','Issue found']) {
   await page.reload();await page.locator('[data-scenario="exception"]:visible').first().click();
   await page.locator('[data-task-status="2"]').selectOption(result);
   assert.equal(await page.locator('[data-task-reading="2"]').inputValue(),'5.8');
   if(result==='N/A'){
    await page.locator('[data-task-status="2"]').selectOption('Done');
    assert.equal(await page.locator('[data-task-reading="2"]').inputValue(),'5.8');
    await page.locator('[data-task-status="2"]').selectOption('N/A');
   }
   await page.locator('[data-sign]').click();await page.locator('[data-submit]').click();
   const review=await page.locator('[data-review-queue]').innerText();
   if(result==='N/A')assert.doesNotMatch(review,/T03:/);
   if(result==='Blocked'){assert.match(review,/T03: Blocked/);assert.doesNotMatch(review,/T03: 5\.8/);}
   if(result==='Done'||result==='Issue found')assert.match(review,/T03: 5\.8 mm\/s outside/);
  }
  await page.reload();await page.locator('[data-generate]').first().click();
  const draftId=await page.locator('[data-occurrence-id]').innerText();
  await page.locator('[data-closeout-note]').fill('Unsubmitted fictional maintenance note.');
  await page.locator('[data-guide-start]').click();
  await page.locator('[data-scenario="exception"]:visible').first().click();
  assert.match(await page.locator('[data-validation]').innerText(),/work in progress/i);
  assert.match(await page.locator('[data-guide-count]').innerText(),/^Step 1 of/);
  assert.equal(await page.locator('[data-occurrence-id]').innerText(),draftId);
  assert.equal(await page.locator('[data-closeout-note]').inputValue(),'Unsubmitted fictional maintenance note.');
  await page.locator('[data-guide-exit]').click();
  await page.locator('[data-tab="plan"]').click();await page.locator('[data-asset-index="1"]').click();
  await page.locator('[data-generate]:visible').last().click();
  await page.locator('[data-canvas-dialog-layer]').waitFor({state:'visible'});
  assert.match(await page.locator('[data-canvas-dialog-layer]').innerText(),/unsaved responses will be replaced/i);
  await page.locator('[data-canvas-cancel]:visible').click();
  assert.equal(await page.locator('[data-occurrence-id]').innerText(),draftId);
  assert.equal(await page.locator('[data-closeout-note]').inputValue(),'Unsubmitted fictional maintenance note.');
  await page.locator('[data-generate]:visible').last().click();await page.locator('[data-canvas-confirm]:visible').click();
  await page.waitForFunction(id=>document.querySelector('[data-occurrence-id]').textContent!==id,draftId);
  assert.equal(await page.locator('[data-closeout-note]').inputValue(),'');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: record locking, sign-off, note isolation, event-time rollover, blocked-reading safeguards and replacement confirmation at 375/1440px');
}finally{await browser.close();if(server)server.kill();}
