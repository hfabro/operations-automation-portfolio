import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,cpSync,readFileSync,writeFileSync,rmSync,existsSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPlan,writePlan,checkPlan,BI_PAGES,BI_STORY} from './build-bi-pages.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),expected=buildPlan(root);
assert.deepEqual(checkPlan(root,expected),[],'Checked-in BI artifacts must match canonical source.');
assert.equal(BI_PAGES.length,12);assert.equal(BI_STORY.length,4);
const parent=resolve(tmpdir()),temporary=mkdtempSync(join(parent,'portfolio-bi-build-'));
try{
 mkdirSync(join(temporary,'tools/bi-prototype'),{recursive:true});
 cpSync(join(root,'tools/bi-prototype/preview'),join(temporary,'tools/bi-prototype/preview'),{recursive:true});
 copyFileSync(join(root,'tools/bi-prototype/THIRD-PARTY-DATA.md'),join(temporary,'tools/bi-prototype/THIRD-PARTY-DATA.md'));
 copyFileSync(join(root,'tools/bi-shell.css'),join(temporary,'tools/bi-shell.css'));
 const plan=buildPlan(temporary);assert.deepEqual([...plan],[...expected]);writePlan(temporary,plan);assert.deepEqual(checkPlan(temporary,plan),[]);
 for(const page of BI_PAGES){const html=readFileSync(join(temporary,'business-intelligence',page.output),'utf8');assert.match(html,/name="robots" content="index, follow"/);assert.match(html,/rel="canonical"/);assert.match(html,/primary-nav/);assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/(?:href|src)="[^\"]*tools\//);if(page.output!=='index.html')assert.match(html,/<noscript>/);}
 for(const step of BI_STORY){const html=readFileSync(join(temporary,'business-intelligence',step.route.split('?')[0]),'utf8');assert.match(html,/aria-label="Connected story steps"/);assert.equal((html.match(/aria-current="step"/g)||[]).length,1);assert.match(html,/Step [1-4] of 4/);assert.match(html,/workflows?|workflow/i);assert.match(html,/business-report\.html\?source=current&amp;measure=paid|business-report\.html\?source=current&measure=paid/);}
 const historical=readFileSync(join(temporary,'business-intelligence/historical-analysis.html'),'utf8');assert.match(historical,/creativecommons\.org\/licenses\/by\/4\.0/);assert.match(historical,/Boudewijn van Dongen/);
 const hub=readFileSync(join(temporary,'business-intelligence/index.html'),'utf8');assert.match(hub,/href="historical-analysis\.html"/);assert.doesNotMatch(hub,/href="showcase\.html"/);assert(existsSync(join(temporary,'business-intelligence/invoice-sample.csv')));
 const output=join(temporary,'business-intelligence/journey-rules.js'),original=readFileSync(output,'utf8');writeFileSync(output,original+'\n// accidental output edit\n');assert(checkPlan(temporary,plan).includes('business-intelligence/journey-rules.js'));assert.match(readFileSync(output,'utf8'),/accidental output edit/,'Check mode must not silently overwrite edited output.');writePlan(temporary,plan);assert.equal(readFileSync(output,'utf8'),original);
 const source=join(temporary,'tools/bi-prototype/preview/journey-rules.js');writeFileSync(source,readFileSync(source,'utf8')+'\n// admitted source change\n');const next=buildPlan(temporary);assert(checkPlan(temporary,next).includes('business-intelligence/journey-rules.js'));assert.equal(readFileSync(output,'utf8'),original,'Planning must not mutate generated files.');writePlan(temporary,next);assert.match(readFileSync(output,'utf8'),/admitted source change/);
 const extra=join(temporary,'business-intelligence/unreviewed.js');writeFileSync(extra,'');assert(checkPlan(temporary,next).some(p=>p.includes('Unexpected generated file')));assert(existsSync(extra),'Verification must preserve unexpected files for review.');unlinkSync(extra);
 const pageSource=join(temporary,'tools/bi-prototype/preview/showcase.html'),good=readFileSync(pageSource,'utf8');writeFileSync(pageSource,good.replace('</head>','<script src="../unapproved.js"></script></head>'));assert.throws(()=>buildPlan(temporary),/Unexpected simulation asset/);assert.match(readFileSync(output,'utf8'),/admitted source change/);
 console.log('PASS: deterministic BI projection, route remapping, metadata/license, complete downloads, drift rejection, source propagation and bounded asset admission.');
}finally{
 const target=resolve(temporary);assert.equal(dirname(target),parent);assert(basename(target).startsWith('portfolio-bi-build-'));rmSync(target,{recursive:true,force:true});
}
