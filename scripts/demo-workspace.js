/* Shared help and a deliberate full-session restart. Workflow-specific resets remain with their applications. */
(function () {
  'use strict';
  var tasks = {
    'plant-operations-hub': 'Choose an employee tool or a facilities report. The destination opens its own fictional workflow.',
    'facility-leaks': 'Choose a map cell, describe a condition, then use the Facilities queue to assign and verify its response.',
    'ladder-inspection': 'Choose an inspection cycle and resolve a ladder. Complete the checks or load the safety-exception scenario, then certify and submit.',
    'digital-kanban': 'Scan a synthetic stock point, select an eligible item, submit a request, and switch to the restocker role to confirm refill.',
    'toolbox-talks': 'Choose a topic and language, open the reading, answer all five questions, and acknowledge participation. Refresh the administration snapshot to see the updated completion.',
    'ehs-control': 'Open a scheduled task, record its status and evidence, then refresh the management snapshot to review the saved result.',
    'electrical-analytics': 'Choose a date window and report view. Compare energy and demand with the interval table, and keep modeled delivery cost separate from a full utility bill.',
    'forklift-fleet': 'Choose a truck and evidence window. Compare readiness and energy views, then evaluate the charging pilot with an explicit charge threshold.',
    'cmms-lifecycle': 'Generate a PM packet or load an exception. Review the task responses, submit the packet, and choose a human disposition in Review.',
    'connected-operations': 'Choose an asset and operating scenario. Compare modeled production, losses, and events before interpreting a review trigger.',
    'smart-factory-roadmap': 'Choose a fictional plant and strategic priority. Compare the readiness gaps, ranked use cases, and resulting roadmap.',
    'compliance-workflow': 'Generate an occurrence, assign an owner, and record completion evidence or an exception. Validate the update to inspect its separate history.',
    'telemetry-explorer': 'Select an equipment profile and metric. Use the chart or arrow keys to inspect intervals and compare the operating question.',
    'building-operations': 'Choose a building or machine view. Select a report, assign a response, and record verification before resolving work.',
    'service-intake': 'Use fictional location, category, and description details to submit a request. The attachment control adds only a simulated reference.'
  };
  var parts=window.location.pathname.split('/').filter(Boolean);
  var slug=parts[parts.length-1]==='index.html'?parts[parts.length-2]:parts[parts.length-1];
  var intro=document.querySelector('.demo-intro, .ops-intro, main > .hero');
  if(!intro || !tasks[slug] || document.querySelector('.demo-support')) return;
  var mount=intro.querySelector('.hero-copy, .intro-grid > div, .hero-grid > div') || intro;
  var tools=document.createElement('div'); tools.className='demo-support';
  var help=document.createElement('details');
  var summary=document.createElement('summary'); summary.textContent='How to try this demo';
  var instructions=document.createElement('p'); instructions.textContent=tasks[slug];
  var boundary=document.createElement('p'); boundary.textContent='Use fictional information. Restart clears this demonstration’s session; it does not contact an employer system.';
  help.append(summary,instructions,boundary);
  var restart=document.createElement('button'); restart.type='button'; restart.textContent='Restart demo';
  restart.addEventListener('click',function(){
    if(window.confirm('Restart this demo? Current entries and session history will be cleared.')) window.location.reload();
  });
  tools.append(help,restart); mount.appendChild(tools);
})();
