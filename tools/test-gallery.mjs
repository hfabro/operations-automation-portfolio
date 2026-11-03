// Targeted gallery checks; uses the same development-only tools as the existing CI.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const axe=await readFile(process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js'),'utf8');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/gallery-quality');
const port=process.env.TEST_PORT || '4184';
const base=`http://127.0.0.1:${port}`;
const report={checks:[],screens:[],errors:[],accessibility:[]};
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  report.browser=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)report.errors.push(response.url()+' '+response.status());});
  const visible=()=>page.locator('[data-work-kind]:visible').count();
  async function check(label,fn){await fn();report.checks.push(label);console.log('PASS '+label);}
  await page.goto(base+'/work/');
  await check('All projects and seven illustrated cases are present; platform leads',async()=>{
    assert.equal(await visible(),13);
    assert.equal(await page.locator('.gallery-preview').count(),7);
    assert.match(await page.locator('.gallery-card h3').first().innerText(),/Facilities Digital Operations/);
    const links=await page.locator('.gallery-card h3 a,.gallery-card .card-links a').evaluateAll(nodes=>nodes.map(n=>n.href));
    for(const url of new Set(links)) assert.equal((await context.request.get(url)).status(),200,url);
  });
  await check('The featured card surface opens its interactive demo',async()=>{
    const preview=page.locator('.gallery-card-lead .gallery-preview');
    await preview.scrollIntoViewIfNeeded();
    const box=await preview.boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await page.waitForURL('**/demos/plant-operations-hub/');
    await page.goto(base+'/work/');
  });
  await check('Case details expand and collapse with the keyboard',async()=>{
    const details=page.locator('.gallery-card details.gallery-proof');
    assert.equal(await details.count(),7);
    const first=details.first();
    assert.equal(await first.locator('dt').first().isVisible(),false);
    await first.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await first.locator('dt').first().isVisible(),true);
    await page.keyboard.press('Enter');
    assert.equal(await first.locator('dt').first().isVisible(),false);
  });
  await check('Operational focus intersects maturity and text; reset restores all projects',async()=>{
    for(const [focus,count] of [['facilities',8],['assurance',4],['analytics',4],['reliability',9]]){
      await page.locator('[data-work-focus]').selectOption(focus);
      assert.equal(await visible(),count,focus);
      assert.match(page.url(),new RegExp('focus='+focus));
    }
    await page.locator('[data-work-focus]').selectOption('analytics');
    await page.locator('[data-work-filter="implemented"]').click();
    assert.equal(await visible(),0);
    assert.equal(await page.locator('[data-work-empty]').isVisible(),true);
    assert.equal(await page.locator('[data-section-nav] a[href="#featured-work"]').isVisible(),false);
    await page.locator('[data-work-filter="analytics"]').click();
    assert.equal(await visible(),2);
    await page.locator('[data-work-search]').fill('capital');
    assert.equal(await visible(),1);
    await page.reload();
    assert.equal(await visible(),1);
    assert.equal(await page.locator('[data-work-focus]').inputValue(),'analytics');
    await page.goto(base+'/about/');await page.goBack();
    assert.equal(await visible(),1);
    await page.locator('[data-work-reset]').click();
    assert.equal(await visible(),13);
    assert.equal(await page.locator('[data-work-focus]').inputValue(),'all');
    assert.equal(await page.locator('[data-work-search]').evaluate(el=>el===document.activeElement),true);
    assert.equal(new URL(page.url()).search,'');
  });
  await check('Deep links, invalid values, keyboard selection, and mobile navigation',async()=>{
    await page.goto(base+'/work/?focus=assurance&maturity=implemented');
    assert.equal(await visible(),4);
    await page.goto(base+'/work/?focus=unknown&maturity=unknown');
    assert.equal(await visible(),13);
    await page.locator('[data-work-focus]').focus();
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-work-focus]').inputValue(),'facilities');
    assert.equal(await visible(),8);
    await page.setViewportSize({width:375,height:812});
    await page.locator('[data-nav-toggle]').click();
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'false');
    await page.locator('[data-work-reset]').click();
  });
  await check('Light/dark layouts fit 320, 375, 768, and 1440px; accessibility screening',async()=>{
    for(const theme of ['light','dark']) {
      await page.evaluate(value=>localStorage.setItem('portfolio-theme',value),theme);
      for(const width of [320,375,768,1440]) {
        await page.setViewportSize({width,height:1000});await page.goto(base+'/work/');
        await page.evaluate(()=>document.fonts.ready);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${theme} ${width}`);
        assert.equal(await visible(),13);
        if(width===375 || width===1440) {
          await page.screenshot({path:resolve(output,`gallery-${width}-${theme}.png`)});
          await page.locator('.gallery-card-lead').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
          await page.screenshot({path:resolve(output,`gallery-lead-${width}-${theme}.png`)});
          await page.locator('.gallery-card').nth(1).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
          await page.screenshot({path:resolve(output,`gallery-cases-${width}-${theme}.png`)});
        }
        await page.evaluate(axe);
        const audit=await page.evaluate(async()=>{
          const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
          return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:r.incomplete.map(v=>v.id)};
        });
        report.accessibility.push({theme,width,...audit});
        assert.deepEqual(audit.violations,[],`${theme} ${width}`);
        report.screens.push({theme,width,overflow:false});
      }
    }
  });
  await check('No-JavaScript gallery retains every case and functional links',async()=>{
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
    const p=await nojs.newPage();await p.goto(base+'/work/?focus=analytics');
    assert.equal(await p.locator('[data-work-kind]:visible').count(),13);
    assert.equal(await p.locator('[data-work-controls]').isVisible(),false);
    await p.locator('.gallery-card details.gallery-proof summary').first().click();
    assert.equal(await p.locator('.gallery-card details.gallery-proof dt').first().isVisible(),true);
    await p.locator('.gallery-card h3 a').first().click();
    assert.ok(p.url().endsWith('/demos/plant-operations-hub/'));
    await nojs.close();
  });
  assert.deepEqual(report.errors,[]);
  report.passed=true;
} catch(error) {
  report.passed=false;report.failure=error.stack;process.exitCode=1;console.error(error);
} finally {
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();server.kill();
  console.log(`Evidence: ${output}`);
}
