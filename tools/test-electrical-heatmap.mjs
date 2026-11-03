import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.TEST_PORT || '4192';
const base=process.env.SITE_URL || `http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){
  server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});
}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
  for(const width of [375,1440]){
    const page=await browser.newPage({viewport:{width,height:812}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/demos/electrical-analytics/');
    const view=page.locator('[data-tab="1"]');
    await view.focus();
    await page.keyboard.press('Enter');
    assert.equal(await view.getAttribute('aria-pressed'),'true');
    assert.equal(await view.evaluate(e=>document.activeElement===e),true);
    const matrix=page.locator('.ops-heat-matrix');
    const wrap=page.locator('.ops-heat-wrap');
    const legend=page.locator('#ops-matrix-explainer');
    assert.match(await matrix.locator('caption').innerText(),/average kW/i);
    assert.match(await legend.innerText(),/darker is higher within selected filters/i);
    assert.equal(await wrap.getAttribute('aria-describedby'),'ops-matrix-explainer');
    assert.equal(await matrix.locator('tbody tr').count(),48);
    assert.equal(await matrix.locator('tbody td').count(),336);
    assert.equal(await matrix.locator('.ops-heat-missing').count(),0);
    const cell=(time,day)=>matrix.locator('tbody tr').filter({has:page.locator('th[scope="row"]',{hasText:time})}).locator('td').nth(day);
    assert.equal(Number(await cell('09:30',1).innerText()),427);
    assert.equal(Number(await cell('06:00',0).innerText()),228);
    assert.equal(Number(await cell('13:30',5).innerText()),434.8);
    const colors=await Promise.all([cell('09:30',1),cell('06:00',0)].map(c=>c.evaluate(e=>getComputedStyle(e).backgroundColor)));
    assert.notEqual(colors[0],colors[1],'high and low values should be shaded differently');
    const campusLegend=await legend.innerText();
    if(width===375){
      assert.ok(await wrap.evaluate(e=>e.scrollWidth>e.clientWidth),'mobile matrix should have a horizontal scroll region');
      await wrap.focus();
      assert.equal(await wrap.evaluate(e=>document.activeElement===e),true);
      assert.ok(await wrap.evaluate(e=>e.scrollHeight>e.clientHeight),'matrix should have a vertical scroll region');
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(350);
      await page.keyboard.up('ArrowDown');
      assert.ok(await wrap.evaluate(e=>e.scrollTop>0),'keyboard should vertically scroll the matrix');
      const header=matrix.locator('thead th').first();
      assert.ok(await header.evaluate(e=>{const h=e.getBoundingClientRect(),w=e.closest('.ops-heat-wrap').getBoundingClientRect();return h.top>=w.top-1&&h.bottom<=w.bottom+1}),'weekday headers should stay visible');
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(350);
      await page.keyboard.up('ArrowRight');
      assert.ok(await wrap.evaluate(e=>e.scrollLeft>0),'keyboard should horizontally scroll the matrix');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'matrix should not overflow the document');
    }
    await page.locator('#energy-meter').selectOption('Support');
    assert.equal(Number(await cell('09:30',1).innerText()),119.6);
    assert.equal(Number(await cell('06:00',0).innerText()),63.8);
    assert.notEqual(await legend.innerText(),campusLegend,'legend should reflect selected meter values');
    assert.equal(await page.locator('#energy-meter').evaluate(e=>document.activeElement===e),true);
    await page.locator('#energy-dow').selectOption('1');
    assert.equal(await matrix.locator('tbody td:not(.ops-heat-missing)').count(),48);
    assert.equal(await matrix.locator('.ops-heat-missing').count(),288);
    assert.equal(await cell('09:30',0).innerText(),'—');
    assert.equal(Number(await cell('09:30',1).innerText()),119.6);
    await page.locator('#energy-type').selectOption('Weekend');
    assert.equal(await matrix.count(),0);
    assert.match(await page.locator('.ops-notice').first().innerText(),/No intervals match/i);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  // A flat, independently supplied fixture exercises the zero-range color scale.
  const flatContext=await browser.newContext({viewport:{width:375,height:812}});
  const flatPage=await flatContext.newPage(),flatErrors=[];
  flatPage.on('pageerror',e=>flatErrors.push(e.message));
  await flatPage.route('**/scripts/operations-data.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.OPS_DATA={intervals:Array.from({length:48},(_,slot)=>({date:'2026-09-07',dow:1,slot,temperature:70,kw:250,kwh:125,working:true,weekend:false})),trucks:[]};`}));
  await flatPage.goto(base+'/demos/electrical-analytics/');
  await flatPage.locator('[data-tab="1"]').click();
  assert.equal(await flatPage.locator('.ops-heat-matrix .ops-heat-2').count(),48);
  assert.equal(await flatPage.locator('.ops-heat-matrix .ops-heat-missing').count(),288);
  assert.match(await flatPage.locator('#ops-matrix-explainer').innerText(),/250–250 kW/);
  assert.equal(await flatPage.locator('.ops-heat-matrix [class*="NaN"]').count(),0);
  assert.deepEqual(flatErrors,[]);
  await flatContext.close();
  console.log('PASS: 30-minute averages, relative shading, filtering, zero-range and missing data, keyboard navigation and mobile matrix scrolling at 375/1440px');
}finally{
  await browser.close();
  if(server)server.kill();
}
