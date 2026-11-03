import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4193',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server;
if(!process.env.SITE_URL){server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Preview exited ${code}`)));});}
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try {
 let visibleCount=0;
 for (const viewport of [{width:320,height:812},{width:375,height:812},{width:640,height:360}]) {
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demos/ladder-inspection/');
  const quick=page.locator('.demo-guide-quick');assert.equal(await quick.isVisible(),false);
  await page.locator('[data-guide-start]').tap();
  await page.locator('[data-qr-scan]').tap();
  await page.waitForFunction(()=>document.querySelector('[data-guide-count]').textContent.startsWith('Step 2'));
  await page.locator('[data-scenario="exception"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  if (await quick.isVisible()) {
    visibleCount++;
    assert.match(await quick.innerText(),/Step 2 of 3.*Load the exception.*Show guide/);
    const surface=page.locator('#ladder-device .device-surface');
    const canScroll=await surface.evaluate(e=>e.scrollHeight>e.clientHeight+5);
    if (canScroll) {
      await quick.evaluate(e=>e.textContent='test scroll update');
      await surface.evaluate(e=>{e.scrollTop=e.scrollTop>30?e.scrollTop-25:e.scrollTop+25});
      await page.waitForFunction(()=>document.querySelector('.demo-guide-quick').textContent!=='test scroll update');
    }
    if (await quick.isVisible()) {
      await quick.tap();
      assert.equal(await page.locator('[data-guide-find]').evaluate(e=>document.activeElement===e),true);
    }
  }
  await page.locator('[data-guide-find]').tap();
  await page.waitForTimeout(500);
  await page.locator('[data-scenario="exception"]').tap();
  await page.waitForFunction(()=>document.querySelector('[data-guide-count]').textContent.startsWith('Step 3'));
  await page.locator('[data-certify]').check();
  await page.locator('[data-inspection-form] button[type="submit"]').tap();
  const dialog=page.locator('[data-canvas-dialog-layer]');await dialog.waitFor({state:'visible'});
  assert.equal(await quick.isVisible(),false,'guide return must not obscure confirmation');
  await page.locator('[data-canvas-confirm]:visible').tap();
  await page.locator('[data-guide-complete]:visible').first().waitFor({timeout:7000});
  assert.match(await page.locator('[data-result-status]').innerText(),/Removed from service/);
  await page.locator('[data-guide-complete]:visible').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.equal(await quick.isVisible(),false,'guide return should hide once completion is visible');
  await page.locator('[data-guide-close]').click();assert.equal(await quick.isVisible(),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 assert.ok(visibleCount>0,'guide return should be available in at least one tested phone layout');
 console.log('PASS: guided Ladder progress remains reachable at 320/375px and landscape; confirmation stays unobscured and safety exception completes');
} finally {await browser.close();if(server)server.kill();}
