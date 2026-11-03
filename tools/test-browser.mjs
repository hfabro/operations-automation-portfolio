// Optional development check; the published site has no runtime dependencies.
// Use an existing Playwright installation via PLAYWRIGHT_MODULE, or install it locally.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/browser-quality');
const port=process.env.TEST_PORT || '4174';
const base=`http://127.0.0.1:${port}`;
const report={browser:'',checks:[],pages:[],errors:[],screenshots:[]};
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  report.browser=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push({url:page.url(),message:error.message}));
  page.on('console',message=>{if(message.type()==='error')report.errors.push({url:page.url(),message:message.text()});});
  page.on('response',response=>{if(response.status()>=400)report.errors.push({url:response.url(),status:response.status()});});
  async function check(label,fn){await fn();report.checks.push(label);console.log('PASS '+label);}
  async function screenshot(name){await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});report.screenshots.push(name+'.png');}
  async function go(route){const response=await page.goto(base+route);if(response)assert.equal(response.status(),200,route);}
  async function visibleCards(){return page.locator('[data-work-kind]:visible').count();}

  await check('Work discovery: maturity, search, empty state, reset, URL, and browser history',async()=>{
    await go('/work/');
    assert.equal(await visibleCards(),13);
    await page.locator('[data-work-filter="implemented"]').click();
    assert.equal(await visibleCards(),5);
    await page.locator('[data-work-filter="analytics"]').click();
    assert.equal(await visibleCards(),2);
    assert.match(page.url(),/maturity=analytics/);
    await page.locator('[data-work-search]').fill('unmatched-term');
    assert.equal(await visibleCards(),0);
    assert.equal(await page.locator('[data-work-empty]').isVisible(),true);
    await page.locator('[data-work-reset]').click();
    assert.equal(await visibleCards(),13);
    assert.equal(await page.locator('[data-work-search]').evaluate(el=>el===document.activeElement),true);
    await page.locator('[data-work-search]').fill('forklift');
    assert.equal(await visibleCards(),1);
    assert.match(await page.locator('[data-work-kind]:visible').innerText(),/Telemetry/);
    await page.reload();
    assert.equal(await visibleCards(),1);
    await page.goto(base+'/about/');
    await page.goBack();
    assert.equal(await visibleCards(),1);
    await go('/work/?maturity=architecture');
    assert.equal(await visibleCards(),6);
    await go('/work/?maturity=invalid');
    assert.equal(await visibleCards(),13);
  });
  await check('Contents navigation returns after mobile-to-desktop resize',async()=>{
    await page.setViewportSize({width:375,height:812});
    await go('/work/');
    assert.equal(await page.locator('details.page-toc').getAttribute('open'),null);
    await page.setViewportSize({width:1440,height:1000});
    await page.waitForFunction(()=>document.querySelector('details.page-toc').open);
    assert.equal(await page.locator('details.page-toc a').first().isVisible(),true);
  });
  await check('Mobile menu: keyboard entry, Escape, focus departure, and landscape scroll',async()=>{
    await page.setViewportSize({width:375,height:812});
    await go('/');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
    await page.locator('[data-nav-toggle]').click();
    assert.equal(await page.locator('[data-nav] a').first().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('[data-nav-toggle]').evaluate(el=>el===document.activeElement),true);
    await page.locator('[data-nav-toggle]').click();
    await page.locator('.hero-actions a').first().focus();
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'false');
    await page.setViewportSize({width:667,height:320});
    await page.locator('[data-nav-toggle]').click();
    const bounds=await page.locator('[data-nav]').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,viewport:innerHeight,overflow:getComputedStyle(el).overflowY}));
    assert.ok(bounds.bottom<=bounds.viewport+1);
    assert.equal(bounds.overflow,'auto');
    await page.keyboard.press('Escape');
  });
  await check('Theme persists, invalid preference falls back, and malformed hash is safe',async()=>{
    await page.setViewportSize({width:1440,height:1000});
    await go('/#%E0%A4%A');
    await page.reload();
    await page.locator('[data-theme-toggle]').click();
    const theme=await page.locator('html').getAttribute('data-theme');
    await go('/work/');
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    await page.evaluate(()=>localStorage.setItem('portfolio-theme','invalid'));
    await page.reload();
    assert.ok(['light','dark'].includes(await page.locator('html').getAttribute('data-theme')));
    await page.evaluate(()=>localStorage.removeItem('portfolio-theme'));
  });
  await check('No-JavaScript work library remains complete and readable',async()=>{
    const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
    const fallback=await noJs.newPage();
    await fallback.goto(base+'/work/');
    assert.equal(await fallback.locator('[data-work-kind]:visible').count(),13);
    assert.equal(await fallback.locator('[data-work-controls]').isVisible(),false);
    await fallback.goto(base+'/work/facilities-decision-support/');
    assert.equal(await fallback.locator('.decision-lab details').count(),3);
    assert.equal(await fallback.locator('[data-ledger]').isVisible(),false);
    await noJs.close();
  });
  await check('Synthetic decision examples open with keyboard and preserve evidence boundaries',async()=>{
    await page.setViewportSize({width:375,height:812});
    await go('/work/facilities-decision-support/');
    const choices=page.locator('.decision-lab details');
    assert.equal(await choices.count(),3);
    await choices.first().locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.notEqual(await choices.first().getAttribute('open'),null);
    assert.match(await choices.first().innerText(),/Program-calculated energy, estimated cost/);
    await choices.nth(1).locator('summary').click();
    assert.match(await choices.nth(1).innerText(),/overstate/);
    await page.locator('[data-ledger-item="schedule-a"]').check();
    await page.locator('[data-ledger-item="schedule-b"]').check();
    assert.match(await page.locator('[data-ledger-status]').innerText(),/Overlap warning/);
    await page.locator('[data-ledger-item="schedule-b"]').uncheck();
    assert.match(await page.locator('[data-ledger-status]').innerText(),/No alternative overlap/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  });
  await check('Ladder QR/manual identity and bounded device modes remain intact',async()=>{
    await page.setViewportSize({width:375,height:812});
    await go('/demos/ladder-inspection/');
    for(const mode of ['phone','tablet','system']) {
      await page.locator(`[data-preview-mode="${mode}"]`).click();
      assert.equal(await page.locator('#ladder-device').getAttribute('data-device-mode'),mode);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(mode!=='system') {
        const size=await page.locator('#ladder-device .device-surface').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));
        assert.ok(size.height>0&&size.height<=812);
        assert.ok(size.scroll>size.height);
        assert.equal(size.overflow,'auto');
      }
    }
    await page.locator('[data-qr-scan]').click();
    assert.equal(await page.locator('[data-screen="inspect"]').isVisible(),true);
    assert.match(await page.locator('[data-screen="inspect"]').innerText(),/LAD-104/);
    await page.reload();
    await page.locator('[data-found="LAD-104"]').click();
    assert.equal(await page.locator('[data-screen="inspect"]').isVisible(),true);
    assert.match(await page.locator('[data-screen="inspect"]').innerText(),/LAD-104/);
  });

  await check('Connected Operations chart colors agree with its state legend',async()=>{
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:900});
      await go('/demos/connected-operations/');
      const scenarios=page.locator('[data-scenarios] button');
      for(let index=0;index<await scenarios.count();index++) {
        await scenarios.nth(index).click();
        const result=await page.evaluate(()=>{
          const canvas=document.querySelector('[data-output-chart]'), rect=canvas.getBoundingClientRect();
          const ctx=canvas.getContext('2d'), ratio=window.devicePixelRatio||1;
          const cells=[...document.querySelectorAll('[data-timeline] span')], step=(rect.width-70)/cells.length;
          const mismatches=[];let sampled=0;
          cells.forEach((cell,i)=>{
            const state=[...cell.classList].find(name=>name.startsWith('state-')).slice(6);
            const legend=getComputedStyle(document.querySelector('.legend .'+state)).backgroundColor;
            const timeline=getComputedStyle(cell).backgroundColor;
            if(legend!==timeline)mismatches.push(state+': legend and timeline differ');
            const pixel=ctx.getImageData(Math.floor((52+i*step+step/2)*ratio),Math.floor((rect.height-51)*ratio),1,1).data;
            if(pixel[3]===255){sampled++;const chart=`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;if(chart!==legend)mismatches.push(state+': chart '+chart+' vs '+legend);}
          });
          return {sampled,mismatches};
        });
        assert.ok(result.sampled>0,`No chart bars sampled at ${width}px`);
        assert.deepEqual(result.mismatches,[],`State colors at ${width}px, scenario ${index}`);
      }
    }
  });

  async function htmlFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const results=await Promise.all(entries.filter(e=>!['.git','tmp','references-private'].includes(e.name)).map(e=>e.isDirectory()?htmlFiles(resolve(dir,e.name)):e.name.endsWith('.html')?[resolve(dir,e.name)]:[]));return results.flat();}
  const routes=(await htmlFiles(root)).map(file=>'/'+relative(root,file).replaceAll('\\','/').replace(/index\.html$/,''));
  await check('Case-study headings fit narrow screens with a wider fallback font',async()=>{
    for(const width of [320,375]) {
      await page.setViewportSize({width,height:1000});
      for(const slug of ['digital-kanban','ladder-inspection','compliance-automation','telemetry-energy','facilities-digital-operations','facilities-decision-support','toolbox-talks']) {
        await go(`/work/${slug}/`);
        await page.evaluate(()=>{document.body.style.fontFamily='Verdana, sans-serif';});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Fallback font overflow: ${slug} ${width}`);
      }
    }
  });
  await check('Every page loads at desktop/mobile widths in light and dark themes',async()=>{
    for(const theme of ['light','dark']) {
      await page.emulateMedia({colorScheme:theme});
      await page.evaluate(value=>localStorage.setItem('portfolio-theme',value),theme);
      for(const width of [375,1440]) {
        await page.setViewportSize({width,height:1000});
        for(const route of routes) {
          await go(route);
          if(await page.locator('[data-theme-toggle]').count())assert.equal(await page.locator('html').getAttribute('data-theme'),theme,route);
          const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length}));
          report.pages.push({route,width,theme,...state});
          assert.equal(state.overflow,false,`Horizontal overflow: ${route} ${width} ${theme}`);
          assert.equal(state.h1,1,route);
          assert.equal(state.main,1,route);
        }
      }
    }
  });
  await check('Home and Work fit 320px and tablet widths; visual evidence captured',async()=>{
    for(const theme of ['light','dark']) {
      await page.emulateMedia({colorScheme:theme});
      await page.evaluate(value=>localStorage.setItem('portfolio-theme',value),theme);
      for(const width of [320,768,1440]) {
        await page.setViewportSize({width,height:1000});
        for(const route of ['/','/work/']) {
          await go(route);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
          await screenshot(`${route==='/'?'home':'work'}-${width}-${theme}`);
          if(width===1440)await page.screenshot({path:resolve(output,`${route==='/'?'home':'work'}-viewport-${theme}.png`)});
        }
      }
    }
  });
  assert.deepEqual(report.errors,[],'Console, page, or HTTP errors');
  report.passed=true;
} catch(error) {
  report.passed=false;report.failure=error.stack;process.exitCode=1;console.error(error);
} finally {
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  server.kill();
  console.log(`Evidence: ${output}`);
}
