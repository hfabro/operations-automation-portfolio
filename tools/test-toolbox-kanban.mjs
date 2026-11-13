import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4207',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 for(const width of [375,1440]){
  const p=await browser.newPage({viewport:{width,height:812}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const focused=locator=>locator.evaluate(e=>document.activeElement===e);
  await p.goto(base+'/demos/toolbox-talks/');
  await p.locator('[data-tab="1"]').focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('[data-tab="1"]')),true);
  await p.locator('#admin-topic').focus();await p.locator('#admin-topic').selectOption('1');assert.equal(await focused(p.locator('#admin-topic')),true);await p.locator('#admin-topic').selectOption('0');
  await p.locator('#talk-dept').focus();await p.locator('#talk-dept').selectOption('Facilities');assert.equal(await focused(p.locator('#talk-dept')),true);
  await p.locator('#refresh-talk').focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('#refresh-talk')),true);
  await p.locator('[data-tab="0"]').focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('[data-tab="0"]')),true);
  await p.locator('#talk-topic').focus();await p.locator('#talk-topic').selectOption('1');assert.equal(await focused(p.locator('#talk-topic')),true);await p.locator('#talk-topic').selectOption('0');
  await p.locator('#talk-language').focus();await p.locator('#talk-language').selectOption('es');assert.equal(await focused(p.locator('#talk-language')),true);
  await p.locator('#open-material').focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('#material h3')),true);
  await p.locator('#talk-form button[type="submit"]').click();assert.equal(await focused(p.locator('#talk-form input[name="q0"]').first()),true);
  for(let i=0;i<5;i++)await p.locator(`#talk-form input[name="q${i}"]`).first().check();await p.locator('#talk-form input[name="ack"]').check();await p.locator('#talk-form button[type="submit"]').click();assert.equal(await focused(p.locator('#talk-form .ops-success')),true);
  await p.goto(base+'/demos/digital-kanban/');
  await p.evaluate(()=>{window.__testBusy=window.CanvasSim.busy;window.CanvasSim.busy=()=>Promise.reject(new Error('synthetic scan failure'));});await p.locator('[data-phone-scan]').click();await p.waitForFunction(()=>document.querySelector('.request-panel .canvas-toast p').textContent.includes('could not be loaded'));assert.equal(await p.locator('[data-route]').isDisabled(),false);assert.equal(await p.locator('[data-submit]').isDisabled(),true);assert.equal(await p.locator('[data-phone-scan]').isVisible(),true);await p.evaluate(()=>{window.CanvasSim.busy=window.__testBusy;});
  await p.locator('[data-phone-scan]').focus();await p.keyboard.press('Enter');
  await p.locator('.request-panel [data-canvas-busy]').waitFor({state:'visible'});assert.equal(await p.locator('[data-route]').isDisabled(),true);assert.equal(await p.locator('[data-reset]').isDisabled(),true);
  await p.waitForFunction(()=>document.querySelector('[data-phone-scan]').hidden&&!document.querySelector('[data-route]').disabled);assert.equal(await focused(p.locator('#request-title')),true);assert.equal(await p.locator('[data-submit]').isDisabled(),true);
  const blocked=p.locator('[data-item="SPI-101-B"]');await blocked.focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('[data-item="SPI-101-B"]')),true);assert.equal(await p.locator('[data-kpi-blocked]').innerText(),'1');
  const item=p.locator('[data-item="SPI-101-A"]');await item.focus();await p.keyboard.press('Enter');assert.equal(await focused(p.locator('[data-item="SPI-101-A"]')),true);assert.equal(await p.locator('[data-item="SPI-101-A"]').getAttribute('aria-pressed'),'true');
  const before=await p.locator('[data-kpi-open]').innerText();await p.locator('[data-scan]').evaluate(e=>e.disabled=true);await p.locator('[data-submit]').click();await p.locator('[data-canvas-confirm]:visible').waitFor();
  assert.equal(await p.locator('[data-route]').isDisabled(),true);assert.equal(await p.locator('[data-reset]').isDisabled(),true);assert.equal(await p.locator('[data-scan]').isDisabled(),true);assert.equal(await p.locator('[data-preview-mode="tablet"]').isDisabled(),true);
  await p.locator('[data-canvas-cancel]:visible').click();await p.waitForFunction(()=>!document.querySelector('[data-route]').disabled);assert.equal(await p.locator('[data-scan]').isDisabled(),true,'pre-existing disabled control must remain disabled');await p.locator('[data-scan]').evaluate(e=>e.disabled=false);assert.equal(await p.locator('[data-kpi-open]').innerText(),before);assert.equal(await p.locator('[data-item="SPI-101-A"]').getAttribute('aria-pressed'),'true');
  await p.evaluate(()=>{window.__testBusy=window.CanvasSim.busy;window.CanvasSim.busy=()=>Promise.reject(new Error('synthetic request failure'));});await p.locator('[data-submit]').click();await p.locator('[data-canvas-confirm]:visible').click();await p.waitForFunction(()=>document.querySelector('.request-panel .canvas-toast p').textContent.includes('could not be completed'));assert.equal(await p.locator('[data-route]').isDisabled(),false);assert.equal(await p.locator('[data-kpi-open]').innerText(),before);assert.equal(await p.locator('[data-item="SPI-101-A"]').getAttribute('aria-pressed'),'true');await p.evaluate(()=>{window.CanvasSim.busy=window.__testBusy;});
  await p.locator('[data-submit]').click();await p.locator('[data-canvas-confirm]:visible').click();await p.waitForFunction(()=>document.querySelector('[data-kpi-open]').textContent==='3');await p.waitForFunction(()=>!document.querySelector('[data-route]').disabled);assert.equal(await p.locator('#kanban-device').getAttribute('data-device-mode'),'tablet');assert.equal(await focused(p.locator('[data-preview-mode="tablet"]')),true);
  await p.locator('[data-preview-mode="system"]').click();const req=p.locator('[data-complete="REQ-7001"]');await req.focus();await p.keyboard.press('Enter');
  await p.locator('.restocker-panel [data-canvas-confirm]:visible').waitFor();assert.equal(await p.locator('[data-reset]').isDisabled(),true);assert.equal(await p.locator('.request-panel [data-canvas-action="home"]').isDisabled(),true);assert.equal(await p.locator('.request-panel [data-canvas-action="refresh"]').isDisabled(),true);
  await p.locator('[data-reset]').evaluate(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await p.locator('[data-kpi-open]').innerText(),'3');
  await p.locator('.restocker-panel [data-canvas-cancel]:visible').click();await p.waitForFunction(()=>!document.querySelector('[data-reset]').disabled);assert.equal(await focused(p.locator('[data-complete="REQ-7001"]')),true);assert.equal(await p.locator('[data-kpi-open]').innerText(),'3');
  await p.evaluate(()=>{window.__testBusy=window.CanvasSim.busy;window.CanvasSim.busy=()=>Promise.reject(new Error('synthetic test failure'));});await req.click();await p.locator('.restocker-panel [data-canvas-confirm]:visible').click();await p.waitForFunction(()=>!document.querySelector('[data-reset]').disabled);assert.match(await p.locator('.restocker-panel .canvas-toast p').innerText(),/could not be completed/);assert.equal(await p.locator('[data-kpi-open]').innerText(),'3');assert.equal(await p.locator('[data-kpi-complete]').innerText(),'0');await p.evaluate(()=>{window.CanvasSim.busy=window.__testBusy;});
  await req.focus();await p.keyboard.press('Enter');await p.locator('.restocker-panel [data-canvas-confirm]:visible').click();await p.waitForFunction(()=>document.querySelector('[data-kpi-open]').textContent==='2');assert.equal(await p.locator('[data-kpi-complete]').innerText(),'1');assert.equal(await focused(p.locator('#restocker-title')),true);
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS: Toolbox focus; Kanban scan/request/refill guards, cancel, forced-error recovery and queue consistency at 375/1440px');
}finally{await browser.close();if(server)server.kill();}
