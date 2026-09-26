(function () {
  "use strict";

  var slug = window.location.pathname.split("/").filter(Boolean).slice(-1)[0];
  if (slug === "index.html") slug = window.location.pathname.split("/").filter(Boolean).slice(-2)[0];

  var guides = {
    "ladder-inspection": {
      mount: ".workspace-heading",
      title: "Run a safety exception",
      summary: "Identify the asset, complete a controlled inspection, and see a failed condition route into corrective action without hiding the evidence trail.",
      time: "About 60 seconds",
      outcome: "Asset-specific occurrence, exception routing, and preserved history",
      steps: [
        { selector: "[data-scan]", event: "click", title: "Resolve the asset", text: "Use the simulated QR scan to load the governed identity for LAD-017." },
        { selector: '[data-scenario="exception"]', event: "click", title: "Load the exception", text: "Populate every required answer, including a failed hardware check, isolation decision, note, and synthetic evidence." },
        { selector: "[data-inspection-form]", event: "demo:state", signal: "inspection-submitted", title: "Validate and submit", text: "Submit the occurrence and inspect how deterministic rules route the failed condition." }
      ]
    },
    "compliance-workflow": {
      mount: ".workspace-heading",
      title: "Escalate a missed obligation",
      summary: "Generate one scheduled occurrence from a stable requirement, record an exception, and preserve the status and evidence as a separate historical event.",
      time: "About 60 seconds",
      outcome: "Governed recurrence, ownership, exception, and audit history",
      steps: [
        { selector: "[data-generate]", event: "click", title: "Generate the occurrence", text: "Create the due instance without changing the requirement master." },
        { selector: '[data-scenario="exception"]', event: "click", title: "Load an exception path", text: "Populate the owner, evidence, status, and notes for an obligation that needs escalation." },
        { selector: "[data-occurrence-form]", event: "demo:state", signal: "compliance-submitted", title: "Validate the lifecycle update", text: "Submit the record and inspect the owned follow-up and history response." }
      ]
    },
    "digital-kanban": {
      mount: ".section-heading",
      title: "Signal and fulfill a stockout",
      summary: "Move from a physical reorder signal on a requester phone to an owned restocker queue, then close the request and release its duplicate-control key.",
      time: "About 75 seconds",
      outcome: "Minimal request experience with visible fulfillment and closeout",
      steps: [
        { selector: "[data-phone-scan]", event: "click", title: "Scan the stock point", text: "Resolve the synthetic QR route into the correct stock point and eligible items." },
        { selector: '[data-item][data-blocked="false"]', event: "click", title: "Select an eligible item", text: "Choose one physical shortage. Items with an open request remain blocked." },
        { selector: "[data-submit]", event: "demo:state", signal: "kanban-request-created", title: "Send the replenishment signal", text: "Create one controlled request and hand it to the restocker view." },
        { selector: "[data-open-requests] [data-complete]", event: "demo:state", signal: "kanban-refill-completed", title: "Confirm the refill", text: "Close the owned request, retain the event, and release the item for a future physical signal." }
      ]
    },
    "cmms-lifecycle": {
      mount: ".device-preview-bar",
      position: "before",
      title: "Route a maintenance exception",
      summary: "Generate a revision-controlled PM occurrence, submit an out-of-range condition, and record an accountable human disposition.",
      time: "About 75 seconds",
      outcome: "Template snapshot, execution evidence, exception review, and true history",
      steps: [
        { selector: '[data-scenario="exception"]', event: "click", title: "Load the exception packet", text: "Generate a PM occurrence with controlled task responses, evidence, a condition reading, and technician sign-off." },
        { selector: "[data-submit]", event: "demo:state", signal: "pm-submitted", title: "Validate and route", text: "Lock the packet and route the deterministic exception to the review queue." },
        { selector: '[data-disposition="Corrective work requested"]', event: "demo:state", signal: "pm-disposition-recorded", title: "Create corrective action", text: "Apply the human disposition and preserve it in the synthetic audit history." }
      ]
    },
    "telemetry-explorer": {
      mount: ".section-heading",
      title: "Investigate peak charging exposure",
      summary: "Change the analytical question, interrogate a time interval, and compare another equipment profile before deciding whether action is warranted.",
      time: "About 60 seconds",
      outcome: "Operational question grounded in equipment and utility context",
      steps: [
        { selector: '[data-metric="demand"]', event: "click", title: "Change the measure", text: "Switch from state of charge to charging demand so the modeled peak window becomes decision-relevant." },
        { selector: "[data-chart]", event: ["pointerdown", "keydown"], keys: ["ArrowLeft", "ArrowRight"], title: "Inspect an interval", text: "Touch or click the chart, or use an arrow key, to inspect a specific 30-minute interval." },
        { selector: "[data-profile]:not(.active)", event: "click", title: "Compare another forklift", text: "Select a different synthetic equipment profile and compare its operating constraints before recommending a schedule change." }
      ]
    },
    "connected-operations": {
      mount: ".section-heading",
      title: "Trace a recurring production loss",
      summary: "Move from a machine-state pattern to contextualized loss, deterministic escalation, and the human question needed before action.",
      time: "About 60 seconds",
      outcome: "Signal translated into governed operating context—not an automatic command",
      steps: [
        { selector: '[data-scenario="microstops"]', event: "click", title: "Expose repeated microstops", text: "Load a performance-loss pattern that availability alone would understate." },
        { selector: "[data-asset]", event: "change", title: "Test the asset context", text: "Change the synthetic asset and see the threshold expression, units, and decision context update." },
        { selector: '[data-scenario="quality"]', event: "click", title: "Challenge the first explanation", text: "Compare a quality-drift scenario where correlation still requires human validation." }
      ]
    },
    "building-operations": {
      mount: ".section-heading",
      title: "Move from building report to machine work",
      summary: "Change the spatial lens, select a machine-level condition, and route it into an owned corrective-work state without pretending the map is a control system.",
      time: "About 60 seconds",
      outcome: "Location-aware triage with explicit ownership and lifecycle state",
      steps: [
        { selector: '[data-view="machine"]', event: "click", title: "Open the machine view", text: "Move from the synthetic building schematic to asset-level operating context." },
        { selector: '[data-select="MCH-221"]', event: "click", title: "Select a machine condition", text: "Choose a marker or queue item to connect location, asset, severity, status, and ownership." },
        { selector: '[data-action="work"]', event: "demo:state", signal: "building-work-requested", title: "Create the work request", text: "Advance the selected condition into an explicit, human-owned corrective workflow." }
      ]
    },
    "smart-factory-roadmap": {
      mount: ".studio .section-heading",
      title: "Re-prioritize a plant roadmap",
      summary: "Change the plant context and strategic objective, then watch readiness, foundational gaps, backlog rank, and roadmap sequence move together.",
      time: "About 45 seconds",
      outcome: "Portfolio decisions tied to readiness, value, effort, risk, and ownership",
      steps: [
        { selector: "[data-plant-select]", event: "change", title: "Change the plant profile", text: "Select a different synthetic plant to expose a different maturity constraint." },
        { selector: 'input[name="priority"][value="sustainability"]', event: "change", title: "Change the strategic priority", text: "Select Sustainability and observe how the use-case backlog and roadmap re-rank without changing the evidence base." }
      ]
    }
  };

  var guide = guides[slug];
  if (!guide) return;
  var mount = document.querySelector(guide.mount);
  if (!mount) return;

  var root = document.createElement("aside");
  root.id = "guided-run";
  root.className = "demo-guide";
  root.setAttribute("aria-labelledby", "demo-guide-title");
  root.innerHTML =
    '<div class="demo-guide-copy" data-guide-intro>' +
      '<span class="demo-guide-kicker">Optional guided run</span>' +
      '<h2 id="demo-guide-title">Try this scenario: ' + guide.title + '</h2>' +
      '<p>' + guide.summary + '</p>' +
      '<div class="demo-guide-meta"><span>' + guide.time + '</span><span>' + guide.steps.length + ' real interactions</span><span>No data retained</span></div>' +
    '</div>' +
    '<div class="demo-guide-actions" data-guide-intro><button class="demo-guide-primary" type="button" data-guide-start>Start guided run</button></div>' +
    '<div class="demo-guide-progress" data-guide-active hidden><span data-guide-count>Step 1</span><div class="demo-guide-progress-track" aria-hidden="true"><i data-guide-progress></i></div><strong data-guide-percent>0%</strong></div>' +
    '<div class="demo-guide-step" data-guide-active hidden><span class="demo-guide-step-number" data-guide-number>01</span><div><span class="demo-guide-kicker">Do this now</span><h3 data-guide-step-title></h3><p data-guide-step-text></p></div><div class="demo-guide-actions"><button class="demo-guide-primary" type="button" data-guide-find>Find this control</button><button class="demo-guide-exit" type="button" data-guide-exit>Exit guide</button></div></div>' +
    '<div class="demo-guide-copy" data-guide-complete hidden><span class="demo-guide-kicker">Scenario complete</span><h2>Follow the state change—not just the screen.</h2><p>' + guide.outcome + '. All records and outcomes in this experience are synthetic and remain only in this browser session.</p></div>' +
    '<div class="demo-guide-actions" data-guide-complete hidden><button class="demo-guide-primary" type="button" data-guide-restart>Restart page</button><button type="button" data-guide-close>Close guide</button></div>' +
    '<span class="sr-only" aria-live="polite" data-guide-live></span>';

  if (guide.position === "before") mount.parentNode.insertBefore(root, mount);
  else mount.insertAdjacentElement("afterend", root);

  var state = { active: false, complete: false, index: 0, target: null };
  var live = root.querySelector("[data-guide-live]");

  function setGroup(selector, hidden) {
    root.querySelectorAll(selector).forEach(function (node) { node.hidden = hidden; });
  }

  function visibleTarget(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector)).find(function (node) {
      return !node.hidden && !node.disabled && node.getClientRects().length > 0;
    }) || document.querySelector(selector);
  }

  function resolveTarget() {
    return state.active && !state.complete ? visibleTarget(guide.steps[state.index].selector) : null;
  }

  function clearTarget() {
    document.querySelectorAll(".demo-guide-target").forEach(function (node) { node.classList.remove("demo-guide-target"); });
    state.target = null;
  }

  function renderStep() {
    clearTarget();
    var step = guide.steps[state.index];
    var completed = state.index;
    var percent = Math.round((completed / guide.steps.length) * 100);
    root.querySelector("[data-guide-count]").textContent = "Step " + (state.index + 1) + " of " + guide.steps.length;
    root.querySelector("[data-guide-percent]").textContent = percent + "%";
    root.querySelector("[data-guide-progress]").style.width = percent + "%";
    root.querySelector("[data-guide-number]").textContent = String(state.index + 1).padStart(2, "0");
    root.querySelector("[data-guide-step-title]").textContent = step.title;
    root.querySelector("[data-guide-step-text]").textContent = step.text;
    window.setTimeout(function () {
      state.target = resolveTarget();
      if (state.target) state.target.classList.add("demo-guide-target");
    }, 80);
  }

  function start() {
    state.active = true;
    state.complete = false;
    state.index = 0;
    setGroup("[data-guide-intro]", true);
    setGroup("[data-guide-complete]", true);
    setGroup("[data-guide-active]", false);
    renderStep();
    live.textContent = "Guided run started. " + guide.steps[0].title + ".";
  }

  function exit() {
    clearTarget();
    state.active = false;
    state.complete = false;
    setGroup("[data-guide-active]", true);
    setGroup("[data-guide-complete]", true);
    setGroup("[data-guide-intro]", false);
    live.textContent = "Guided run closed. The demo remains available.";
  }

  function finish() {
    clearTarget();
    state.active = false;
    state.complete = true;
    setGroup("[data-guide-active]", true);
    setGroup("[data-guide-intro]", true);
    setGroup("[data-guide-complete]", false);
    live.textContent = "Guided scenario complete. " + guide.outcome + ".";
    root.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function advance() {
    clearTarget();
    if (state.index >= guide.steps.length - 1) { finish(); return; }
    state.index += 1;
    renderStep();
    live.textContent = "Step " + (state.index + 1) + ". " + guide.steps[state.index].title + ".";
  }

  function findControl() {
    var target = resolveTarget();
    if (!target) {
      live.textContent = "The next control is not available yet. Complete the current demo prerequisite or restart the page.";
      return;
    }
    clearTarget();
    state.target = target;
    target.classList.add("demo-guide-target");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.setTimeout(function () { if (typeof target.focus === "function") target.focus({ preventScroll: true }); }, 280);
    live.textContent = "The control for " + guide.steps[state.index].title + " is highlighted.";
  }

  function matchesStep(event, step) {
    var allowedEvents = Array.isArray(step.event) ? step.event : [step.event];
    if (allowedEvents.indexOf(event.type) === -1) return false;
    if (step.signal && (!event.detail || event.detail.signal !== step.signal)) return false;
    if (event.type === "keydown" && step.keys && step.keys.indexOf(event.key) === -1) return false;
    if (step.signal) return true;
    var target = event.target;
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest(step.selector));
  }

  root.querySelector("[data-guide-start]").addEventListener("click", start);
  root.querySelector("[data-guide-find]").addEventListener("click", findControl);
  root.querySelector("[data-guide-exit]").addEventListener("click", exit);
  root.querySelector("[data-guide-close]").addEventListener("click", function () { root.hidden = true; clearTarget(); });
  root.querySelector("[data-guide-restart]").addEventListener("click", function () { window.location.reload(); });

  ["click", "change", "submit", "pointerdown", "keydown", "demo:state"].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      if (!state.active || state.complete) return;
      if (matchesStep(event, guide.steps[state.index])) window.setTimeout(advance, 110);
    }, true);
  });
})();
