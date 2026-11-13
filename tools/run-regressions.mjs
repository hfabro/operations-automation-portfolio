// One maintained entry point for the targeted workflow protections, locally and in CI.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const suites = [
  'test-connected-rules', 'test-card-links', 'test-canvas-refresh',
  'test-guided-controls', 'test-ladder-guide-quick', 'test-ladder-notification',
  'test-kanban-guide-scan', 'test-operations-focus', 'test-fleet-scenario',
  'test-electrical-heatmap', 'test-electrical-weather', 'test-leak-workflow',
  'test-cmms-record-integrity', 'test-fleet-ehs-state', 'test-toolbox-kanban',
  'test-connected-logic'
];
const failures = [];
for (const suite of suites) {
  console.log(`\nRunning ${suite}`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${suite}.mjs`, import.meta.url))], {stdio:'inherit',env:process.env});
  if (result.status !== 0) failures.push(suite);
}
console.log(`${suites.length - failures.length}/${suites.length} workflow regression suites passed.`);
if (failures.length) { console.error(`Failed: ${failures.join(', ')}`); process.exitCode = 1; }
