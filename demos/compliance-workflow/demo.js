(function () {
  "use strict";
  var data = window.COMPLIANCE_DEMO_DATA;
  if (!data) return;

  var state = { step: "master", generated: false, owner: "", status: "Scheduled", completionDate: "Sep 10, 2026", evidence: false, notes: "", submitted: false, events: [{ label: "Waiting", text: "Generate an occurrence from the master.", tone: "pending" }] };
  var screens = Array.prototype.slice.call(document.querySelectorAll("[data-screen]"));
  var indicators = Array.prototype.slice.call(document.querySelectorAll("[data-step-indicator]"));
  var form = document.querySelector("[data-occurrence-form]");
  var ownerField = document.querySelector("[data-owner]");
  var statusField = document.querySelector("[data-status]");
  var dateField = document.querySelector("[data-completion-date]");
  var notesField = document.querySelector("[data-notes]");
  var errorSummary = document.querySelector("[data-error-summary]");
  var errorList = document.querySelector("[data-error-list]");
  var eventStream = document.querySelector("[data-event-stream]");
  var recordJson = document.querySelector("[data-record-json]");
  var canvasRoot = document.querySelector("[data-canvas-app]");

  function canvasNotify(message, tone) { if (window.CanvasSim) window.CanvasSim.notify(canvasRoot, message, tone); }

  function escapeHtml(value) { return String(value).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function renderOwners() {
    ownerField.insertAdjacentHTML("beforeend", data.owners.map(function (owner) { return '<option value="' + escapeHtml(owner) + '">' + escapeHtml(owner) + "</option>"; }).join(""));
  }

  function renderPreviousHistory() {
    document.querySelector("[data-previous-history]").innerHTML = data.previousOccurrences.map(function (record) {
      return '<div class="history-row" role="row"><strong role="cell">' + escapeHtml(record.id) + '</strong><span role="cell">' + escapeHtml(record.due) + '</span><span role="cell">' + escapeHtml(record.status) + '</span><span role="cell">' + escapeHtml(record.evidence) + "</span></div>";
    }).join("");
  }

  function renderArchitecture() {
    document.querySelector("[data-architecture-flow]").innerHTML = data.architecture.map(function (node, index) {
      return '<div class="architecture-node"><span>0' + (index + 1) + '</span><strong>' + escapeHtml(node.name) + '</strong><small>' + escapeHtml(node.detail) + "</small></div>" + (index < data.architecture.length - 1 ? '<span class="architecture-arrow" aria-hidden="true">→</span>' : "");
    }).join("");
  }

  function setStep(step, focus) {
    var order = ["master", "occurrence", "result"];
    var activeIndex = order.indexOf(step);
    state.step = step;
    screens.forEach(function (screen) { screen.hidden = screen.getAttribute("data-screen") !== step; });
    indicators.forEach(function (indicator) {
      var index = order.indexOf(indicator.getAttribute("data-step-indicator"));
      indicator.classList.toggle("active", index === activeIndex);
      indicator.classList.toggle("complete", index < activeIndex);
    });
    if (window.CanvasSim) window.CanvasSim.setActive(canvasRoot, step === "master" ? "requirement" : step === "result" ? "history" : "occurrence");
    if (focus) {
      var heading = document.querySelector('[data-screen="' + step + '"] h3');
      if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    }
  }

  function renderEvents() {
    eventStream.innerHTML = state.events.map(function (event) { return '<li class="' + escapeHtml(event.tone) + '"><span>' + escapeHtml(event.label) + "</span><p>" + escapeHtml(event.text) + "</p></li>"; }).join("");
  }

  function setEvents(events) { state.events = events; renderEvents(); }

  function buildRecord(statusOverride) {
    return {
      requirementId: data.requirement.requirementId,
      occurrenceId: state.generated ? data.occurrence.occurrenceId : null,
      generatedFrom: state.generated ? data.occurrence.generatedFrom : null,
      dueDate: state.generated ? data.occurrence.dueDate : null,
      owner: state.owner || null,
      status: statusOverride || (state.generated ? state.status : "Not generated"),
      completionDate: state.status === "Complete" ? state.completionDate || null : null,
      evidence: state.evidence ? ["fire-inspection-demo.pdf"] : [],
      exceptionNotes: state.status === "Exception" ? state.notes.trim() || null : null,
      followUpAction: state.submitted && state.status === "Exception" ? "EXC-DEMO-007" : null,
      auditEventsPreserved: state.submitted
    };
  }

  function updateLiveState(statusOverride) {
    state.owner = ownerField.value;
    state.status = statusField.value;
    state.completionDate = dateField.value;
    state.notes = notesField.value;
    document.querySelector("[data-state-occurrence]").textContent = state.generated ? data.occurrence.occurrenceId : "Not generated";
    document.querySelector("[data-state-lifecycle]").textContent = state.submitted ? (statusOverride || state.status) : state.generated ? state.status : "Master active";
    document.querySelector("[data-state-history]").textContent = state.submitted ? "3 occurrence records" : "2 prior records";
    document.querySelector("[data-queue-owner]").textContent = state.owner || "Unassigned";
    document.querySelector("[data-queue-status]").textContent = state.generated ? state.status : "Pending";
    document.querySelector("[data-notes-requirement]").textContent = state.status === "Exception" ? "Required for this exception" : "Required for an exception";
    recordJson.textContent = JSON.stringify(buildRecord(statusOverride), null, 2);
  }

  function generateOccurrence() {
    state.generated = true;
    setEvents([
      { label: "Master", text: "REQ-DEMO-0143 read as the stable source requirement.", tone: "complete" },
      { label: "Generation", text: "OCC-DEMO-0912 created with its own identity and due date.", tone: "complete" },
      { label: "Lifecycle", text: "Occurrence is ready for ownership and controlled execution.", tone: "active" }
    ]);
    updateLiveState();
    setStep("occurrence", true);
  }

  function renderEvidence() {
    document.querySelector("[data-evidence-chip]").hidden = !state.evidence;
    document.querySelector("[data-evidence]").hidden = state.evidence;
  }

  function clearValidation() {
    errorSummary.hidden = true;
    errorList.innerHTML = "";
    [ownerField, dateField, notesField].forEach(function (field) { field.classList.remove("is-invalid"); field.removeAttribute("aria-invalid"); });
  }

  function applyScenario(mode) {
    ownerField.value = data.requirement.defaultOwner;
    statusField.value = mode === "complete" ? "Complete" : "Exception";
    dateField.value = mode === "complete" ? "Sep 10, 2026" : "";
    notesField.value = mode === "complete" ? "Annual inspection completed and report reviewed." : "Service vendor rescheduled after access issue; owner review and new due date required.";
    state.evidence = mode === "complete";
    state.submitted = false;
    renderEvidence();
    clearValidation();
    updateLiveState();
  }

  function validateOccurrence() {
    clearValidation();
    updateLiveState();
    var errors = [];
    if (!state.owner) { errors.push("An accountable owner is required."); ownerField.classList.add("is-invalid"); ownerField.setAttribute("aria-invalid", "true"); }
    if (state.status === "Complete" && !state.completionDate.trim()) { errors.push("A completion date is required to close the occurrence."); dateField.classList.add("is-invalid"); dateField.setAttribute("aria-invalid", "true"); }
    if (state.status === "Complete" && !state.evidence) { errors.push("The required completion evidence must be attached before closure."); }
    if (state.status === "Exception" && state.notes.trim().length < 8) { errors.push("Exception notes are required to explain the unresolved obligation."); notesField.classList.add("is-invalid"); notesField.setAttribute("aria-invalid", "true"); }
    if (state.status === "Scheduled" || state.status === "In progress") { errors.push("Choose Complete or Exception to close this demonstration scenario."); }
    if (errors.length) {
      errorList.innerHTML = errors.map(function (error) { return "<li>" + escapeHtml(error) + "</li>"; }).join("");
      errorSummary.hidden = false;
      errorSummary.focus();
      return false;
    }
    return true;
  }

  function renderResult() {
    var isException = state.status === "Exception";
    state.submitted = true;
    var banner = document.querySelector("[data-result-banner]");
    banner.className = "result-banner" + (isException ? " exception" : "");
    document.querySelector("[data-result-status]").textContent = isException ? "Exception open" : "Complete";
    document.querySelector("[data-result-explanation]").textContent = isException ? "The occurrence remains visible as an unresolved obligation with ownership, explanation, follow-up action, and reminder history." : "The occurrence closed only after ownership, completion date, and required evidence were validated.";
    document.querySelector("[data-result-owner]").textContent = state.owner;
    document.querySelector("[data-result-evidence]").textContent = state.evidence ? "Demo report retained" : "Pending";
    document.querySelector("[data-result-action]").textContent = isException ? "EXC-DEMO-007 created" : "Not required";
    var row = document.querySelector("[data-current-history]");
    row.innerHTML = '<div class="history-row current' + (isException ? " exception" : "") + '" role="row"><strong role="cell">' + data.occurrence.occurrenceId + '</strong><span role="cell">' + data.occurrence.dueDate + '</span><span role="cell">' + (isException ? "Exception open" : "Complete") + '</span><span role="cell">' + (isException ? "Follow-up action linked" : "Demo report retained") + "</span></div>";
    setEvents([
      { label: "Validation", text: isException ? "Owner and exception explanation validated." : "Owner, completion date, and evidence validated.", tone: "complete" },
      { label: "Occurrence", text: "OCC-DEMO-0912 updated without modifying the requirement master.", tone: "complete" },
      { label: isException ? "Exception" : "Evidence", text: isException ? "EXC-DEMO-007 created and linked to the unresolved occurrence." : "Synthetic completion report retained with the occurrence record.", tone: isException ? "alert" : "complete" },
      { label: "Reminder", text: isException ? "A synthetic owner reminder and management flag were generated." : "Reminder workflow was correctly stopped after completion.", tone: isException ? "alert" : "complete" },
      { label: "Audit", text: "Lifecycle changes were preserved as an explicit event trail.", tone: "complete" }
    ]);
    updateLiveState(isException ? "Exception open" : "Complete");
    setStep("result", true);
  }

  function resetDemo() {
    state = { step: "master", generated: false, owner: "", status: "Scheduled", completionDate: "Sep 10, 2026", evidence: false, notes: "", submitted: false, events: [{ label: "Waiting", text: "Generate an occurrence from the master.", tone: "pending" }] };
    form.reset(); ownerField.value = ""; statusField.value = "Scheduled"; dateField.value = "Sep 10, 2026"; notesField.value = "";
    clearValidation(); renderEvidence(); renderEvents(); updateLiveState(); setStep("master", true);
  }

  renderOwners(); renderPreviousHistory(); renderArchitecture(); renderEvents(); renderEvidence(); updateLiveState();
  document.querySelector("[data-generate]").addEventListener("click", function () {
    if (!window.CanvasSim) { generateOccurrence(); return; }
    window.CanvasSim.busy(canvasRoot, "Generating scheduled occurrence…", generateOccurrence, 470).then(function () { canvasNotify("OCC-DEMO-0912 generated from the requirement master.", "success"); });
  });
  document.querySelectorAll("[data-scenario]").forEach(function (button) { button.addEventListener("click", function () { var mode = button.getAttribute("data-scenario"); applyScenario(mode); canvasNotify(mode === "complete" ? "Completion scenario loaded." : "Exception scenario loaded.", mode === "complete" ? "success" : "warning"); }); });
  [ownerField, statusField, dateField, notesField].forEach(function (field) { field.addEventListener("input", function () { state.submitted = false; updateLiveState(); }); });
  document.querySelector("[data-evidence]").addEventListener("click", function () { state.evidence = true; renderEvidence(); updateLiveState(); canvasNotify("Synthetic completion evidence attached.", "success"); });
  document.querySelector("[data-remove-evidence]").addEventListener("click", function () { state.evidence = false; renderEvidence(); updateLiveState(); canvasNotify("Synthetic evidence removed.", "info"); });
  document.querySelector("[data-back]").addEventListener("click", function () { state.generated = false; updateLiveState(); setStep("master", true); });
  document.querySelector("[data-edit]").addEventListener("click", function () { state.submitted = false; updateLiveState(); setStep("occurrence", true); });
  document.querySelector("[data-reset]").addEventListener("click", resetDemo);
  canvasRoot.addEventListener("canvas:navigate", function (event) {
    var action = event.detail.action;
    if (action === "home" || action === "refresh" || action === "requirement") { resetDemo(); canvasNotify(action === "refresh" ? "Demo session refreshed." : "Returned to the requirement master.", "info"); }
    else if (action === "occurrence") { if (state.generated) setStep("occurrence", true); else canvasNotify("Generate an occurrence from the requirement master first.", "warning"); }
    else if (action === "history") { if (state.submitted) setStep("result", true); else canvasNotify("Current history appears after lifecycle validation.", "info"); }
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateOccurrence()) { canvasNotify("Review the highlighted lifecycle requirements.", "error"); return; }
    if (!window.CanvasSim) { renderResult(); return; }
    var isException = state.status === "Exception";
    window.CanvasSim.confirm(canvasRoot, {
      title: isException ? "Open this compliance exception?" : "Close this occurrence?",
      message: isException ? "The synthetic workflow will retain the unresolved obligation and create a follow-up action." : "The occurrence will close with its owner, completion date, and evidence snapshot.",
      confirmLabel: isException ? "Open exception" : "Complete occurrence"
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.CanvasSim.busy(canvasRoot, "Applying lifecycle controls…", renderResult, 520).then(function () { canvasNotify(isException ? "Exception opened with owner and follow-up." : "Occurrence completed and retained in history.", isException ? "warning" : "success"); });
    });
  });
})();
