import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectBrowser} from './browser-engine.mjs';
const require=createRequire(import.meta.url),selection=selectBrowser(require(process.env.PLAYWRIGHT_MODULE||'playwright'));
const root=fileURLToPath(new URL('../',import.meta.url)),port=process.env.TEST_PORT||'4218';
const output=resolve(root,'tmp','demo-accessibility',selection.name);
const axe=await readFile(process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js'),'utf8');
const slugs=(await readdir(join(root,'demos'))).filter(s=>existsSync(join(root,'demos',s,'index.html'))).sort();
await mkdir(output,{recursive:true});
const report={engine:selection.name,browser:'',pages:[],errors:[],passed:false};let server,browser;
try {
  server=spawn(process.execPath,[join(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
  await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',c=>no(Error('Preview exited '+c)));});
  browser=await selection.type.launch(selection.options);report.browser=browser.version();
  for(const theme of ['light','dark']){
    const context=await browser.newContext({locale:'en-US',colorScheme:theme,reducedMotion:'reduce'});
    await context.addInitScript(t=>localStorage.setItem('portfolio-theme',t),theme);
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.url()+': '+r.status());});
    for(const width of [320,375,768,1440]){
      await page.setViewportSize({width,height:900});
      for(const slug of slugs){
        const response=await page.goto(`http://127.0.0.1:${port}/demos/${slug}/`);assert.equal(response.status(),200);
        await page.locator('.demo-support').waitFor();await page.evaluate(async()=>{await document.fonts.ready;});await page.evaluate(axe);
        async function audit(state){
          const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {overflow:document.documentElement.scrollWidth>innerWidth+1,version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});
          report.pages.push({slug,width,theme,state,...result});if(result.overflow||result.violations.length)console.log(JSON.stringify(report.pages.at(-1)));
        }
        await audit('entry');
        if(width===375){
          await page.locator('.demo-support summary').click();await audit('help-expanded');
          if(slug==='cmms-lifecycle'){await page.locator('.hero-actions [data-generate]').hover();await audit('help-and-generate-hover');await page.mouse.move(0,0);}
        }
      }
    }
    await context.close();
  }
  assert.deepEqual(report.errors,[],'Page or resource errors');assert.equal(report.pages.filter(p=>p.overflow||p.violations.length).length,0,'Resolve the recorded demo accessibility/layout findings');report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
finally{await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)server.kill();console.log(`${report.passed?'PASS':'FAIL'} ${selection.name}: ${report.pages.length} demo accessibility/viewport/theme/state checks. Evidence: ${output}`);}
