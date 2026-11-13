import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.TEST_PORT||'4209',base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server,browser;
try {
  if(!process.env.SITE_URL){
    server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
    await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error(`Preview exited ${code}`)));});
  }
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  for(const width of [375,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const record=async()=>JSON.parse(await page.locator('[data-record-json]').textContent());
    const submit=()=>page.locator('[data-inspection-form] button[type="submit"]').click();
    const confirm=()=>page.locator('[data-canvas-confirm]:visible').click();
    await page.goto(base+'/demos/ladder-inspection/');
    assert.equal((await record()).notificationGenerated,false);
    await page.locator('[data-qr-scan]').click();
    await page.locator('[data-scenario="exception"]').click();
    assert.equal((await record()).status,'In progress');
    assert.equal((await record()).exception,true);
    assert.equal((await record()).notificationGenerated,false,'Evaluation must not claim a completed notification');
    await page.locator('[data-certify]').check();await submit();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal((await record()).notificationGenerated,false,'Cancel must not produce a notification');
    await submit();await confirm();
    await page.locator('[data-screen="result"]:visible').waitFor();
    assert.equal((await record()).notificationGenerated,true);
    assert.equal((await record()).status,'Removed from service');
    await page.locator('[data-reset]').click();
    assert.equal((await record()).notificationGenerated,false);
    await page.locator('[data-qr-scan]').click();
    await page.locator('[data-scenario="safe"]').click();
    await page.locator('[data-certify]').check();await submit();await confirm();
    await page.locator('[data-screen="result"]:visible').waitFor();
    assert.equal((await record()).exception,false);
    assert.equal((await record()).notificationGenerated,false,'Passing submissions must skip notification');
    await page.close();
  }
  console.log('PASS: notification stays pending through draft/cancel, appears only after exception submission, clears on reset, and is skipped for passing inspections at 375/1440px');
}finally{if(browser)await browser.close();if(server)server.kill();}
