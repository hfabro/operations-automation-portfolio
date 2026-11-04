import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.TEST_PORT||'4196',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try {
 for(const width of [375,1440]){
  const context=await browser.newContext({viewport:{width,height:812},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/facility-leaks/');
  await page.locator('#continue').click();assert.match(await page.locator('#ops-live').innerText(),/Select a reporting grid/);
  await page.locator('[data-cell="A1"]').click();await page.locator('#continue').click();
  assert.equal(await page.locator('#leak-area').inputValue(),'');assert.equal(await page.locator('#leak-type').inputValue(),'');
  await page.locator('#leak-form textarea').fill('Fictional leak discovered during inspection.');
  await page.locator('#leak-form button[type=submit]').click();
  assert.equal(await page.locator('#leak-area').evaluate(e=>e.validity.valueMissing),true);
  assert.equal(await page.locator('#leak-form').count(),1);
  await page.locator('#leak-area').selectOption('Utilities');await page.locator('#leak-form button[type=submit]').click();
  assert.equal(await page.locator('#leak-type').evaluate(e=>e.validity.valueMissing),true);
  await page.locator('#leak-type').selectOption('Water');await page.locator('#leak-form [name=hazard]').check();
  await page.locator('#leak-form button[type=submit]').click();
  assert.match(await page.locator('#system').innerText(),/LEAK-DEMO-03/);assert.match(await page.locator('#system').innerText(),/Hazard/);
  const note=page.locator('#response-note');
  await note.fill('short');await page.locator('#assign').click();assert.match(await page.locator('#ops-live').innerText(),/meaningful note/);assert.equal(await note.inputValue(),'short');
  await note.fill('Draft for the newly created report.');
  await page.locator('.ops-queue [data-report="1"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#report-detail-title').evaluate(e=>document.activeElement===e),true);assert.equal(await note.inputValue(),'');
  await note.fill('Draft for the earlier facilities report.');await page.locator('.ops-queue [data-report="0"]').click();assert.equal(await note.inputValue(),'Draft for the newly created report.');
  await page.locator('[data-tab="0"]').click();await page.locator('[data-tab="1"]').click();assert.equal(await note.inputValue(),'Draft for the newly created report.');
  await page.locator('.ops-queue [data-report="1"]').click();assert.equal(await note.inputValue(),'Draft for the earlier facilities report.');
  await page.locator('.ops-queue [data-report="0"]').click();
  await page.locator('#assign').focus();await page.keyboard.press('Enter');assert.equal(await note.inputValue(),'');assert.equal(await note.evaluate(e=>document.activeElement===e),true);
  await note.fill('Repair completed using fictional materials.');await page.locator('#repair').focus();await page.keyboard.press('Enter');assert.equal(await note.inputValue(),'');assert.equal(await note.evaluate(e=>document.activeElement===e),true);
  await note.fill('Verified leak repair and safe condition.');await page.locator('#close').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#report-detail-title').evaluate(e=>document.activeElement===e),true);
  assert.match(await page.locator('#system').innerText(),/Verified closure recorded/);assert.match(await page.locator('#system').innerText(),/Draft for the newly created report/);assert.match(await page.locator('#system').innerText(),/Repair completed using fictional materials/);
  await page.locator('[data-tab="0"]').click();await page.locator('[data-cell="A1"]').click();await page.locator('#continue').click();assert.equal(await page.locator('#leak-area').inputValue(),'');assert.equal(await page.locator('#leak-type').inputValue(),'');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: required categories, isolated drafts, keyboard focus and full leak lifecycle at 375/1440px');
}finally{await browser.close();if(server)server.kill();}
