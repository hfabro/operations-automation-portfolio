import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4195',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){
 server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});
}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/electrical-analytics/');await page.locator('[data-tab="3"]').click();
  const card=page.locator('.ops-card').filter({has:page.getByRole('heading',{name:'Mean demand by temperature band'})});
  const row=i=>card.locator('.ops-bar-row').nth(i);
  assert.match(await row(0).innerText(),/\d+(?:\.\d+)? kW/);assert.match(await row(1).innerText(),/\d+(?:\.\d+)? kW/);
  await page.locator('#energy-temp').selectOption('Warm');assert.match(await row(0).innerText(),/No data/);assert.equal(await row(0).locator('.ops-bar-fill').count(),0);assert.match(await row(1).innerText(),/\d+(?:\.\d+)? kW/);
  await page.locator('#energy-temp').selectOption('Cool');assert.match(await row(1).innerText(),/No data/);assert.equal(await row(1).locator('.ops-bar-fill').count(),0);assert.match(await row(0).innerText(),/\d+(?:\.\d+)? kW/);
  assert.deepEqual(errors,[]);await page.close();
 }
 // Replace the synthetic data only in this isolated browser context: 0 kW is observed, not missing.
 const context=await browser.newContext(),page=await context.newPage();
 await page.route('**/scripts/operations-data.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`const intervals=[];for(const [date,dow,temperature,kw] of [['2026-09-01',2,65,0],['2026-09-02',3,75,20]])for(let slot=0;slot<48;slot++)intervals.push({date,dow,slot,temperature,kw,kwh:kw/2,working:true,weekend:false});window.OPS_DATA={intervals,trucks:[]};`}));
 await page.goto(base+'/demos/electrical-analytics/');await page.locator('[data-tab="3"]').click();
 const card=page.locator('.ops-card').filter({has:page.getByRole('heading',{name:'Mean demand by temperature band'})});
 const zero=card.locator('.ops-bar-row').first();assert.match(await zero.innerText(),/0 kW/);assert.doesNotMatch(await zero.innerText(),/No data/);assert.equal(await zero.locator('.ops-bar-fill').count(),1);assert.equal(await zero.locator('.ops-bar-fill').evaluate(e=>e.style.width),'0%');
 await page.locator('#energy-temp').selectOption('Cool');assert.match(await zero.innerText(),/0 kW/);assert.equal(await zero.locator('.ops-bar-fill').evaluate(e=>e.style.width),'0%');assert.match(await card.locator('.ops-bar-row').nth(1).innerText(),/No data/);
 await page.locator('[data-tab="0"]').click();assert.match(await page.locator('.ops-kpi').last().innerText(),/Not available/);assert.doesNotMatch(await page.locator('#system').innerText(),/NaN|Infinity/);
 await page.locator('[data-tab="1"]').click();assert.match(await page.locator('.ops-kpi').last().innerText(),/Not available/);assert.doesNotMatch(await page.locator('#system').innerText(),/NaN|Infinity/);
 await context.close();
 console.log('PASS: weather bands preserve observed zero and distinguish missing groups at 375/1440px');
}finally{await browser.close();if(server)server.kill();}
