import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={window:{}};
runInNewContext(readFileSync(new URL('../scripts/operations-data.js',import.meta.url),'utf8'),context);
const {intervals,trucks}=context.window.OPS_DATA;
assert.equal(intervals.length,28*48);
assert.equal(new Set(intervals.map(r=>r.date+'|'+r.slot)).size,intervals.length);
for(const r of intervals){assert.equal(r.kwh,r.kw*.5);assert(r.kw>0);assert(r.slot>=0&&r.slot<48);}
assert.equal(intervals.reduce((s,r)=>s+r.kwh,0),203813);
assert.equal(Math.max(...intervals.map(r=>r.kw)),498);
assert.equal(trucks.length,5);assert.equal(new Set(trucks.map(r=>r.id)).size,5);
for(const t of trucks){assert(t.soc>=0&&t.soc<=100);assert(t.age>=0);}
for(const selected of [trucks,...trucks.map(t=>[t])])for(const coverage of [1,.5]){
 const kwh=selected.reduce((s,t)=>s+(100-t.soc)*.36,0)*coverage;
 const charging=Array.from({length:48},(_,slot)=>slot>=14&&slot<=19?kwh/3:0);
 assert(Math.abs(charging.reduce((s,kw)=>s+kw*.5,0)-kwh)<1e-8);
}
console.log('Synthetic data tests passed: unique intervals, energy/demand consistency, five trucks, and modeled charging integration.');
runInNewContext(readFileSync(new URL('../scripts/workflow-contracts.js',import.meta.url),'utf8'),context);
const C=context.window.WORKFLOW_CONTRACTS;
assert.equal(C.cells.length,11);assert(!C.cells.some(c=>c.id==='D3'));
for(const c of C.cells){assert(c.x>=30&&c.y>=30);assert(c.x+c.width<=570);assert(c.y+c.height<=330);if(c.y>=215)assert(c.x+c.width<=415);if(c.x>=415)assert(c.y+c.height<=215);}
for(const topic of C.topics){assert.equal(topic.questions.length,5);for(const lang of ['en','es']){assert(topic.material[lang]);for(const q of topic.questions){assert(q[lang]);assert.equal(q.choices[lang].length,2);}}assert.equal(C.score(topic,topic.questions.map(q=>q.correct)),100);assert.equal(C.score(topic,topic.questions.map(q=>1-q.correct)),0);assert.equal(C.score(topic,[0,0,null,0,0]),null);}
const first=C.freshTopic(),second=C.freshTopic();first.answers[0]=1;first.opened.en=true;assert.equal(second.answers[0],null);assert.equal(second.opened.en,false);
const live=[{department:'Operations',complete:false,score:null,attempts:0},{department:'Operations',complete:true,score:80,attempts:1}];
const frozen=JSON.parse(JSON.stringify(live));live[0]={department:'Operations',complete:true,score:60,attempts:2};
assert.equal(C.metrics(frozen).employees,1);assert.equal(C.metrics(live).employees,2);assert.equal(C.metrics(live).completed,1);assert.equal(C.metrics(live).average,70);
console.log('Workflow contract tests passed: footprint-aligned cells, bilingual five-question fixtures, scoring, topic isolation and snapshot metrics.');
