import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const source=fileURLToPath(new URL('./build-system-pages.mjs',import.meta.url));
const checked=spawnSync(process.execPath,[source,'--check'],{encoding:'utf8'});
assert.equal(checked.status,0,checked.stderr);
const parent=resolve(tmpdir());
const temporary=mkdtempSync(join(parent,'portfolio-system-pages-'));
try{
  mkdirSync(join(temporary,'tools'));const generator=join(temporary,'tools/build-system-pages.mjs');copyFileSync(source,generator);
  const run=(...args)=>spawnSync(process.execPath,[generator,...args],{encoding:'utf8'});
  assert.equal(run().status,0);
  const slugs=readdirSync(join(temporary,'demos'));assert.equal(slugs.length,7);
  for(const slug of slugs){const html=readFileSync(join(temporary,'demos',slug,'index.html'),'utf8');assert.match(html,/class="demo-workspace-page"/);assert.match(html,/data-series-position="footer"/);assert.match(html,/scripts\/demo-workspace\.js/);}
  assert.equal(run('--check').status,0);
  const page=join(temporary,'demos/electrical-analytics/index.html');
  const expected=readFileSync(page,'utf8');const damaged=expected.replace('class="demo-workspace-page"','class="missing-workspace"');writeFileSync(page,damaged);
  const stale=run('--check');assert.equal(stale.status,1);assert.match(stale.stderr,/electrical-analytics/);assert.equal(readFileSync(page,'utf8'),damaged,'Check mode must not overwrite edited output');
  assert.equal(run().status,0);assert.equal(readFileSync(page,'utf8'),expected);assert.equal(run('--check').status,0);
  console.log('PASS: generated pages match source; rebuild retains shared framing/help; drift is rejected without writes; regeneration restores output.');
}finally{
  // Delete only this test's newly created, verified temporary directory.
  const target=resolve(temporary);
  assert.equal(dirname(target),parent);assert.ok(basename(target).startsWith('portfolio-system-pages-'));
  rmSync(target,{recursive:true,force:true});
}
