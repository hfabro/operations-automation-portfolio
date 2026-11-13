import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4204',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/forklift-fleet/');await page.locator('[data-tab="3"]').click();
  await page.locator('#fleet-truck').selectOption('TRK-17');
  const guard=page.locator('#soc-guard'),notice=page.locator('.ops-notice'),error=page.locator('#guard-error');
  assert.match(await notice.innerText(),/Evaluated against 30%/);
  for(const input of ['', '0', '99', '20.5']){
   const previous=await notice.innerText();await guard.fill(input);await page.locator('#evaluate-guard').click();
   assert.equal(await guard.inputValue(),input);assert.equal(await error.isVisible(),true);assert.equal(await guard.getAttribute('aria-invalid'),'true');
   assert.equal(await guard.evaluate(e=>document.activeElement===e),true);assert.equal(await notice.innerText(),previous);
  }
  for(const [input,outcome] of [['10','passes'],['90','fails'],['75','passes']]){
   await guard.fill(input);await page.locator('#evaluate-guard').click();assert.equal(await page.locator('#soc-guard').inputValue(),input);
   assert.equal(await page.locator('#guard-error').isHidden(),true);assert.match(await page.locator('.ops-notice').innerText(),new RegExp('Evaluated against '+input+'%'));
   assert.match(await page.locator('.ops-notice').innerText(),new RegExp(outcome));
  }
  await guard.fill('99');await page.locator('#evaluate-guard').click();assert.equal(await page.locator('#ops-live').innerText(),'');assert.match(await notice.innerText(),/Evaluated against 75%/);assert.equal(await error.isVisible(),true);
  await page.goto(base+'/demos/ehs-control/');await page.locator('[data-tab="2"]').click();
  const select=page.locator('#task-select'),status=page.locator('#task-status'),owner=page.locator('#task-owner'),note=page.locator('#task-note'),evidence=page.locator('#task-evidence');
  await owner.selectOption('Records Coordinator');await status.selectOption('Complete');await note.fill('First task has an unsaved fictional note.');
  await select.selectOption('1');await status.selectOption('Exception');await note.fill('Second task has a different draft note.');
  await select.selectOption('0');assert.equal(await owner.inputValue(),'Records Coordinator');assert.equal(await status.inputValue(),'Complete');assert.equal(await note.inputValue(),'First task has an unsaved fictional note.');assert.equal(await evidence.isChecked(),false);
  await page.locator('[data-tab="3"]').click();const complete=page.locator('.ops-kpi').nth(1).locator('strong');assert.equal(await complete.innerText(),'1');await page.locator('#refresh-compliance').click();assert.equal(await complete.innerText(),'1');
  await page.locator('[data-tab="2"]').click();assert.equal(await status.inputValue(),'Complete');assert.equal(await note.inputValue(),'First task has an unsaved fictional note.');await page.locator('#task-form button[type=submit]').click();assert.match(await page.locator('#ops-live').innerText(),/Completion blocked/);
  await page.locator('[data-tab="3"]').click();await page.locator('#refresh-compliance').click();assert.equal(await complete.innerText(),'1');
  await page.locator('[data-tab="2"]').click();assert.equal(await status.inputValue(),'Complete');assert.equal(await note.inputValue(),'First task has an unsaved fictional note.');await evidence.check();await page.locator('#task-form button[type=submit]').click();assert.match(await page.locator('#ops-live').innerText(),/saved/i);
  await page.locator('[data-tab="3"]').click();assert.equal(await complete.innerText(),'1');await page.locator('#refresh-compliance').click();assert.equal(await complete.innerText(),'2');
  await page.locator('[data-tab="2"]').click();assert.equal(await status.inputValue(),'Complete');assert.equal(await owner.inputValue(),'Records Coordinator');assert.equal(await evidence.isChecked(),true);assert.equal(await note.inputValue(),'First task has an unsaved fictional note.');
  await select.selectOption('1');assert.equal(await status.inputValue(),'Exception');assert.equal(await note.inputValue(),'Second task has a different draft note.');
  await status.selectOption('In progress');await select.selectOption('0');assert.equal(await status.inputValue(),'Complete');
  await page.locator('[data-tab="3"]').click();await page.locator('#refresh-compliance').click();assert.equal(await complete.innerText(),'2');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: fleet invalid and boundary values, EHS independent drafts, evidence validation, save and snapshot behavior at 375/1440');
}finally{await browser.close();if(server)server.kill();}
