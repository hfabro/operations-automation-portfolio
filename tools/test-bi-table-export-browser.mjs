import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {selectBrowser} from './browser-engine.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const selection=selectBrowser(require(process.env.PLAYWRIGHT_MODULE||'playwright')),E=require('./bi-prototype/preview/data-methods-export.js'),J=require('./bi-prototype/preview/journey-rules.js'),S=require('./bi-prototype/preview/report-scenarios.js'),I=require('./bi-prototype/preview/invoice-rules.js');
const axe=await readFile(process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js'),'utf8'),port=process.env.TEST_PORT||'4481',url=`http://127.0.0.1:${port}/operations-automation-portfolio/business-intelligence/data-and-methods.html`;
const output=resolve(root,'tmp/bi-table-export',selection.name),keys=['portfolio-phase2-connected-v1','portfolio-phase2-machines-v1','portfolio-phase2-work-v1'];
const report={passed:false,engine:selection.name,checks:[],layouts:[],errors:[]},check=name=>report.checks.push(name),sha=text=>createHash('sha256').update(text).digest('hex');
const ready=page=>page.waitForFunction(()=>document.getElementById('handoff-controls').getAttribute('aria-busy')==='false'&&!document.getElementById('methods-tables').disabled);
async function download(page,id){const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#'+id).click()]);return {name:file.suggestedFilename(),bytes:await readFile(await file.path())};}
async function bundle(page){return JSON.parse((await download(page,'methods-tables')).bytes.toString('utf8'));}
let browser,server;
await mkdir(output,{recursive:true});
try{
 server=spawn(process.execPath,[resolve(root,'tools/serve.mjs')],{cwd:root,env:{...process.env,PORT:port,BASE_PATH:'/operations-automation-portfolio'},stdio:['ignore','pipe','pipe']});
 await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('Preview exited '+code)));});
 browser=await selection.type.launch(selection.options);report.browser=browser.version();
 for(const theme of ['light','dark']){
  const context=await browser.newContext({acceptDownloads:true,reducedMotion:'reduce',colorScheme:theme});
  await context.addInitScript(({theme,keys})=>{localStorage.setItem('portfolio-theme',theme);for(const key of keys)sessionStorage.setItem(key,'preserve-handoff-'+key);},{theme,keys});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  assert.equal((await page.goto(url)).status(),200);await ready(page);
  const expected=await E.prepare(S.checkpoints().held,'held');assert.deepEqual(await bundle(page),expected);
  const manifestFile=await download(page,'methods-manifest');assert.equal(manifestFile.name,expected.manifestFilename);assert.deepEqual(JSON.parse(manifestFile.bytes.toString('utf8')),expected.manifest);
  for(const table of expected.manifest.tables){
   await page.selectOption('#methods-table',table.id);const file=await download(page,'methods-csv'),source=expected.files.find(row=>row.tableId===table.id);
   assert.equal(file.name,table.filename);assert.equal(sha(file.bytes),table.sha256);assert.equal(file.bytes.length,table.byteLength);assert.deepEqual(file.bytes,Buffer.from(source.content));
   assert.match(await page.locator('#handoff-table-summary').innerText(),new RegExp('all '+table.rowCount+' rows'));assert.match(await page.locator('#handoff-table-summary').innerText(),new RegExp('revision '+S.checkpoints().held.revision));assert.doesNotMatch(await page.locator('#handoff-table-summary').innerText(),/undefined/);
  }
  check(theme+': complete browser/Node bundle parity, six exact CSV downloads and schema/hash/file identity');
  await page.locator('#handoff-controls').scrollIntoViewIfNeeded();await page.getByText('Import without changing what the records mean',{exact:true}).click();
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,theme+' '+width);
   if([375,1440].includes(width)){
    await page.evaluate(axe);assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(row=>({id:row.id,targets:row.nodes.map(node=>node.target)}))),[]);
    await page.screenshot({path:resolve(output,theme+'-'+width+'.png'),fullPage:true});
   }
   report.layouts.push({theme,width});
  }
  check(theme+': five responsive layouts, accessible expanded import guidance and native controls');
  await page.selectOption('#methods-source','settled');await ready(page);const settled=await bundle(page);assert.equal(settled.manifest.source.choice,'settled');assert.equal(settled.manifest.totals.paid,375000);
  await page.selectOption('#methods-measure','paid');await page.selectOption('#methods-table','costRows');const csv=await download(page,'methods-csv');assert.equal(sha(csv.bytes),settled.manifest.tables.find(row=>row.id==='costRows').sha256,'Stage display cannot silently filter a complete table');
  assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),keys),keys.map(key=>'preserve-handoff-'+key));
  check(theme+': source changes replace all export identity/totals; displayed stage does not filter tables; journals remain untouched');
  await context.close();
 }
 const context=await browser.newContext({acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 let state=J.create();for(let index=0;index<15;index++)state=J.dispatch(state,{id:'EXPORT-CMD-'+index,type:'importDocument',actor:J.roles.importDocument,payload:{documentId:'EXPORT-DOC-'+index,supplierId:'SYN-SUP-01',number:'EXPORT-REF-'+index,currency:'USD',declaredNetCents:100,sourceLabel:'Fictional full-table coverage',lines:[{poLineId:'UNKNOWN-PO',quantity:1,priceCents:100}]}});
 const raw=J.serialize(state);await context.addInitScript(raw=>sessionStorage.setItem('portfolio-phase2-connected-v1',raw),raw);
 await page.goto(url+'?source=current');await ready(page);await page.selectOption('#methods-table','documents');assert.equal(await page.locator('#model-records tbody tr').count(),12);
 const full=await bundle(page),documents=full.manifest.tables.find(row=>row.id==='documents'),csv=await download(page,'methods-csv');
 assert.equal(documents.rowCount,15);assert.equal(I.parseCSV(csv.bytes.toString('utf8'),documents.columns.map(row=>row.name)).length,15);assert.equal(await page.evaluate(()=>sessionStorage.getItem('portfolio-phase2-connected-v1')),raw);
 check('Current journal exports all fifteen documents beyond its twelve-row preview with unchanged saved evidence');
 await page.evaluate(()=>{window.originalTableExport=window.DataMethodsExport.prepare;window.DataMethodsExport.prepare=(state,choice)=>choice==='held'?new Promise((resolve,reject)=>{window.releaseHeldExport=()=>window.originalTableExport(state,choice).then(value=>{resolve(value);return value;},reject);}):window.originalTableExport(state,choice);});
 await page.selectOption('#methods-source','held');await page.waitForFunction(()=>typeof window.releaseHeldExport==='function');
 assert.equal(await page.locator('#methods-csv').isDisabled(),true);await page.selectOption('#methods-source','settled');await ready(page);await page.evaluate(()=>window.releaseHeldExport());
 assert.equal((await bundle(page)).manifest.source.choice,'settled');
 check('A delayed older source export cannot replace a newer selected checkpoint');
 await page.selectOption('#methods-source','held');await page.waitForFunction(()=>document.getElementById('handoff-controls').getAttribute('aria-busy')==='true');
 await page.evaluate(()=>sessionStorage.setItem('portfolio-phase2-connected-v1','{invalid checkpoint'));await page.selectOption('#methods-source','current');await page.evaluate(()=>window.releaseHeldExport());
 assert.equal(await page.locator('#methods-content').isVisible(),false);for(const id of ['methods-csv','methods-manifest','methods-tables'])assert.equal(await page.locator('#'+id).isDisabled(),true);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('portfolio-phase2-connected-v1')),'{invalid checkpoint');
 check('Corrupt source clears every export; delayed prior completion cannot revive stale files or overwrite storage');
 await page.evaluate(()=>sessionStorage.setItem('portfolio-phase2-connected-v1',''));await page.locator('#methods-refresh').click();assert.match(await page.locator('#methods-status').innerText(),/Source unavailable:/);assert.equal(await page.locator('#methods-content').isVisible(),false);for(const id of ['methods-download','methods-csv','methods-manifest','methods-tables'])assert.equal(await page.locator('#'+id).isDisabled(),true);assert.equal(await page.evaluate(()=>sessionStorage.getItem('portfolio-phase2-connected-v1')),'');
 check('A saved empty string is damaged data, not an absent or valid empty journal; inspection and every export remain held');
 await page.evaluate(()=>{window.DataMethodsExport.prepare=window.originalTableExport;sessionStorage.removeItem('portfolio-phase2-connected-v1');});await page.locator('#methods-refresh').click();await ready(page);
 const empty=await bundle(page);assert(empty.manifest.tables.every(table=>table.rowCount===0));assert(empty.manifest.checks.every(row=>row.status==='empty'));
 await page.selectOption('#methods-table','documents');assert.equal((await download(page,'methods-csv')).bytes.toString('utf8').split('\r\n').length,2);
 check('Empty current journal exports explicit headers/zero counts without substituting examples');await context.close();
 const failure=await browser.newContext();await failure.route('**/data-methods-export.js',route=>route.fulfill({contentType:'text/javascript',body:'window.DataMethodsExport={prepare:async()=>{throw Error("Export dependency unavailable for this explicit test");}};'}));
 const failed=await failure.newPage();await failed.goto(url);await failed.waitForFunction(()=>document.getElementById('handoff-status').textContent.includes('Table handoff unavailable:'));
 assert.equal(await failed.locator('#methods-content').isVisible(),true);assert.equal(await failed.locator('#methods-download').isEnabled(),true);assert.equal(await failed.locator('#methods-csv').isDisabled(),true);await failure.close();
 check('Unavailable export dependency leaves the original model inspection/download intact without substitute files');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error.message.slice(0,1800));}
finally{await browser?.close();server?.kill();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(report.passed)console.log('PASS '+selection.name+': '+report.layouts.length+' table-handoff layouts and '+report.checks.length+' source/download/race/recovery groups.');}
