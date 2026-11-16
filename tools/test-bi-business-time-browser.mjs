// Pure-model parity on an isolated blank page; no published route or site policy is changed.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {selectBrowser} from './browser-engine.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url)),T=require('./bi-prototype/preview/business-time-rules.js'),fixture=JSON.parse(await readFile(resolve(root,'tools/bi-prototype/fixtures/business-time-v1.json'),'utf8')),selection=selectBrowser(require(process.env.PLAYWRIGHT_MODULE||'playwright')),output=resolve(root,'tmp/business-time',selection.name);
const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value,hash=value=>createHash('sha256').update(JSON.stringify(sort(value))).digest('hex');
const report={passed:false,engine:selection.name,scope:'CommonJS/browser model parity only; no UI or deployed-state claim.',queries:[],errors:[]};await mkdir(output,{recursive:true});let browser;
try{
 browser=await selection.type.launch(selection.options);report.browser=browser.version();const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(error.message));await page.goto('about:blank');
 for(const name of ['coding-rules.js','erp-rules.js','invoice-rules.js','document-rules.js','journey-rules.js','report-model.js','machine-samples.js','machine-rules.js','work-samples.js','work-rules.js','business-time-rules.js'])await page.addScriptTag({path:resolve(root,'tools/bi-prototype/preview',name)});
 for(const query of [{asOf:'2026-08-31'},{from:'2026-09-01',asOf:'2026-09-30'},{asOf:'2026-11-01'},{from:'2026-10-01',asOf:'2026-11-15'}]){const expected=T.compile(fixture,query),actual=await page.evaluate(({fixture,query})=>{const before=JSON.stringify(fixture),result=window.BusinessTime.compile(fixture,query);if(JSON.stringify(fixture)!==before)throw Error('Browser model mutated its source.');return result;},{fixture,query});assert.equal(hash(actual),hash(expected),'Full source/measure parity for '+JSON.stringify(query));report.queries.push({query,sha256:hash(actual),unpaidCents:actual.financial.closing.unpaid,includedEvents:actual.lineage.includedEventCount});}
 assert.equal(await page.evaluate(()=>window.BusinessTime.daysBetween('2026-10-31','2026-11-02')),2);
 const invalid=await page.evaluate(fixture=>{try{window.BusinessTime.compile(fixture,{asOf:null});return false;}catch{return true;}},fixture);assert.equal(invalid,true);assert.deepEqual(report.errors,[]);report.passed=true;console.log('PASS '+selection.name+': four full business-time model parity cases, calendar-day DST, null-date rejection and source immutability.');
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();}
