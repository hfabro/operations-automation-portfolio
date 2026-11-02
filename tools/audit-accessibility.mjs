// Development-only WCAG 2.2 AA screening of the shared portfolio shell.
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
const output=resolve(root,'tmp/browser-quality');
const port=process.env.TEST_PORT || '4175';
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});
const results=[];
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  for(const theme of ['light','dark']) {
    const context=await browser.newContext({reducedMotion:'reduce',colorScheme:theme});
    await context.addInitScript(value=>localStorage.setItem('portfolio-theme',value),theme);
    const page=await context.newPage();
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:1000});
      for(const route of ['/','/work/','/about/','/approach/','/smart-factory/','/demos/','/resume/','/work/ladder-inspection/','/work/compliance-automation/','/work/telemetry-energy/','/work/digital-kanban/','/work/facilities-digital-operations/','/work/facilities-decision-support/','/work/toolbox-talks/']) {
        await page.goto(`http://127.0.0.1:${port}${route}`);
        await page.evaluate(async()=>{
          await document.fonts.ready;
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        });
        await page.evaluate(axe);
        const audit=await page.evaluate(async()=>{
          const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
          return {version:result.testEngine.version,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:result.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};
        });
        results.push({route,width,theme,...audit});
        if(audit.violations.length)console.log(JSON.stringify(results.at(-1)));
      }
    }
    await context.close();
  }
  const violations=results.reduce((sum,r)=>sum+r.violations.length,0);
  console.log(`Accessibility: ${results.length} page/viewport/theme checks; ${violations} rule violations.`);
  assert.equal(violations,0,'Resolve the recorded accessibility violations');
} finally {
  await writeFile(resolve(output,'accessibility.json'),JSON.stringify(results,null,2)+'\n');
  if(browser)await browser.close();
  server.kill();
}
