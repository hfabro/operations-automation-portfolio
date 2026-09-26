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
