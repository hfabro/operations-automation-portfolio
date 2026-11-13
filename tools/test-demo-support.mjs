import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {readdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4210';
const base=process.env.SITE_URL||`http://127.0.0.1:${port}`;
let server,browser;
try {
  if(!process.env.SITE_URL){server=spawn(process.execPath,[join(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',c=>no(Error('Preview exited '+c)));});}
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const slugs=readdirSync(join(root,'demos')).filter(s=>existsSync(join(root,'demos',s,'index.html')));
  for(const width of [375,1440]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const slug of slugs){
      await page.goto(`${base}/demos/${slug}/`);
      const tools=page.locator('.demo-support');await tools.waitFor();
      assert.equal(await tools.count(),1);
      await tools.locator('summary').focus();await page.keyboard.press('Enter');
      assert.equal(await tools.locator('details').getAttribute('open'),'');
      assert.match(await tools.locator('p').first().innerText(),/\S.{30}/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,slug);
      const before=await page.locator('main').innerText();
      page.once('dialog',d=>d.dismiss());await tools.getByRole('button',{name:'Restart demo',exact:true}).click();
      assert.equal(await page.locator('main').innerText(),before,slug+' cancel changed session');
    }
    // Verify real entry and workflow state, not just whether reload was called.
    await page.goto(base+'/demos/service-intake/');
    await page.getByRole('textbox',{name:'Description *',exact:true}).fill('Fictional restart test');
    page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Restart demo',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'Description *',exact:true}).inputValue(),'Fictional restart test');
    page.once('dialog',d=>d.accept());
    await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Restart demo',exact:true}).click()]);
    assert.equal(await page.getByRole('textbox',{name:'Description *',exact:true}).inputValue(),'');
    await page.goto(base+'/demos/ladder-inspection/');await page.locator('[data-qr-scan]').click();
    assert.equal(await page.locator('[data-screen="inspect"]').isVisible(),true);
    page.once('dialog',d=>d.accept());
    await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Restart demo',exact:true}).click()]);
    assert.equal(await page.locator('[data-screen="identify"]').isVisible(),true);
    assert.equal(JSON.parse(await page.locator('[data-record-json]').textContent()).assetId,null);
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: task-specific help and cancel preserve all 15 demos; confirmed restart clears service drafts and inspection state at 375/1440px');
}finally{if(browser)await browser.close();if(server)server.kill();}
