import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4197',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/connected-operations/');
  assert.match(await page.locator('.kpi-grid + p').innerText(),/scenario assumptions shared by both assets/i);
  for(const asset of ['PKG-04','PRS-02']){
   await page.locator('[data-asset]').selectOption(asset);
   for(const [scenario,status] of [['stable','No escalation'],['microstops','Review triggered'],['quality','Review triggered'],['starved','Review triggered']]){
    await page.locator(`[data-scenario="${scenario}"]`).click();
    assert.equal(await page.locator('[data-rule-status]').innerText(),status);
    assert.equal(await page.locator('[data-table-body] tr').count(),12);
    const numbers=await Promise.all(['availability','performance','quality','oee'].map(k=>page.locator(`[data-kpi-${k}]`).innerText()));
    const [a,p,q,o]=numbers.map(parseFloat);assert.equal((a*p*q/10000).toFixed(1),o.toFixed(1));
   }
  }
  await page.locator('[data-asset]').selectOption('PKG-04');
  await page.evaluate(()=>{window.CONNECTED_OPERATIONS_DATA.scenarios.find(x=>x.id==='quality').signals.fill(0)});
  await page.locator('[data-scenario="quality"]').click();
  assert.equal(await page.locator('[data-rule-status]').innerText(),'No escalation');
  await page.evaluate(()=>{window.CONNECTED_OPERATIONS_DATA.scenarios.find(x=>x.id==='quality').signals[0]=null});
  await page.locator('[data-scenario="quality"]').click();
  assert.equal(await page.locator('[data-rule-status]').innerText(),'Insufficient data');
  assert.match(await page.locator('[data-table-body] tr').first().textContent(),/—/);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: two assets, four scenarios, OEE arithmetic, evaluated signal rule, and missing-sample state at 375/1440px');
}finally{await browser.close();if(server)server.kill();}
