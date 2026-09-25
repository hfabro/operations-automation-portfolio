(function () {
  "use strict";

  var data = window.LADDER_DEMO_DATA;
  if (!data) return;

  var state = {
    step: "identify",
    assetResolved: false,
    responses: {},
    notes: "",
    evidence: false,
    submitted: false,
    events: [{ label: "Waiting", text: "Simulate the QR scan to begin.", tone: "pending" }]
  };

  var screens = Array.prototype.slice.call(document.querySelectorAll("[data-screen]"));
  var indicators = Array.prototype.slice.call(document.querySelectorAll("[data-step-indicator]"));
  var checklistRoot = document.querySelector("[data-checklist]");
  var form = document.querySelector("[data-inspection-form]");
  var notesField = document.querySelector("[data-notes]");
  var notesRequirement = document.querySelector("[data-notes-requirement]");
  var errorSummary = document.querySelector("[data-error-summary]");
  var errorList = document.querySelector("[data-error-list]");
  var eventStream = document.querySelector("[data-event-stream]");
  var recordJson = document.querySelector("[data-record-json]");
  var canvasRoot = document.querySelector("[data-canvas-app]");

  function canvasNotify(message, tone) {
    if (window.CanvasSim) window.CanvasSim.notify(canvasRoot, message, tone);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character];
    });
  }

  function renderChecklist() {
    checklistRoot.innerHTML = data.checklist.map(function (item, index) {
      var options = item.options.map(function (option) {
        return '<label class="response-option"><input type="radio" name="' + item.id + '" value="' + option + '"><span>' + option + "</span></label>";
      }).join("");
      return '<fieldset class="inspection-item" data-item="' + item.id + '"><legend><span>' + String(index + 1).padStart(2, "0") + '</span><strong>' + escapeHtml(item.label) + '</strong>' + (item.critical ? '<small>Safety critical</small>' : "") + '</legend><div class="response-options">' + options + "</div></fieldset>";
    }).join("");

    checklistRoot.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.responses[input.name] = input.value;
        var fieldset = input.closest("fieldset");
        if (fieldset) fieldset.classList.remove("is-invalid");
        updateLiveState();
      });
    });
  }

  function renderArchitecture() {
    var root = document.querySelector("[data-architecture-flow]");
    if (!root) return;
    root.innerHTML = data.architecture.map(function (node, index) {
      var arrow = index < data.architecture.length - 1 ? '<span class="architecture-arrow" aria-hidden="true">→</span>' : "";
      return '<div class="architecture-node"><span>0' + (index + 1) + '</span><strong>' + escapeHtml(node.name) + '</strong><small>' + escapeHtml(node.detail) + "</small></div>" + arrow;
    }).join("");
  }

  function renderPreviousHistory() {
    var root = document.querySelector("[data-previous-history]");
    if (!root) return;
    root.innerHTML = data.previousHistory.map(function (record) {
      return '<div class="history-row" role="row"><strong role="cell">' + escapeHtml(record.id) + '</strong><span role="cell">' + escapeHtml(record.date) + '</span><span role="cell">' + escapeHtml(record.status) + '</span><span role="cell">' + escapeHtml(record.note) + "</span></div>";
    }).join("");
  }

  function focusScreen(step) {
    var heading = document.querySelector('[data-screen="' + step + '"] h3');
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  function setStep(step, shouldFocus) {
    state.step = step;
    var order = ["identify", "inspect", "result"];
    var activeIndex = order.indexOf(step);
    screens.forEach(function (screen) { screen.hidden = screen.getAttribute("data-screen") !== step; });
    indicators.forEach(function (indicator) {
      var indicatorIndex = order.indexOf(indicator.getAttribute("data-step-indicator"));
      indicator.classList.toggle("active", indicatorIndex === activeIndex);
      indicator.classList.toggle("complete", indicatorIndex < activeIndex);
    });
    if (window.CanvasSim) window.CanvasSim.setActive(canvasRoot, step === "result" ? "history" : step);
    if (shouldFocus) focusScreen(step);
  }

  function addEvent(label, text, tone) {
    state.events.push({ label: label, text: text, tone: tone || "complete" });
    renderEvents();
  }

  function setEvents(events) {
    state.events = events;
    renderEvents();
  }

  function renderEvents() {
    eventStream.innerHTML = state.events.map(function (event) {
      return '<li class="' + escapeHtml(event.tone || "complete") + '"><span>' + escapeHtml(event.label) + "</span><p>" + escapeHtml(event.text) + "</p></li>";
    }).join("");
  }

  function getEvaluation() {
    var answered = data.checklist.filter(function (item) { return Boolean(state.responses[item.id]); });
    var exceptions = data.checklist.filter(function (item) {
      var response = state.responses[item.id];
      return response === "Fail" || response === "Review" || (item.id === "removeFromService" && response === "Yes");
    });
    var criticalExceptions = exceptions.filter(function (item) {
      var response = state.responses[item.id];
      return item.critical && (response === "Fail" || response === "Yes");
    });
    var hasFail = exceptions.some(function (item) { return state.responses[item.id] === "Fail"; });
    return {
      answered: answered.length,
      complete: answered.length === data.checklist.length,
      exceptions: exceptions,
      hasException: exceptions.length > 0,
      critical: criticalExceptions.length > 0,
      correctiveAction: criticalExceptions.length > 0 || hasFail,
      notesRequired: exceptions.length > 0
    };
  }

  function buildRecord(status, evaluation) {
    return {
      inspectionId: data.inspection.inspectionId,
      assetId: state.assetResolved ? data.asset.assetId : null,
      inspectionType: data.inspection.inspectionType,
      inspector: data.inspection.inspector,
      performedAt: "Synthetic demo session",
      status: status,
      responsesCaptured: evaluation.answered,
      responses: state.responses,
      notes: state.notes.trim() || null,
      evidence: state.evidence ? ["photo-lad-017-demo.jpg"] : [],
      exception: evaluation.hasException,
      correctiveActionRequired: evaluation.correctiveAction,
      notificationGenerated: evaluation.hasException
    };
  }

  function updateRecordPreview(statusOverride) {
    var evaluation = getEvaluation();
    var status = statusOverride || (state.submitted ? "Submitted" : state.assetResolved ? "In progress" : "Not started");
    recordJson.textContent = JSON.stringify(buildRecord(status, evaluation), null, 2);
  }

  function updateLiveState() {
    var evaluation = getEvaluation();
    document.querySelector("[data-state-asset]").textContent = state.assetResolved ? data.asset.assetId + " resolved" : "Pending scan";
    document.querySelector("[data-state-responses]").textContent = evaluation.answered + " / " + data.checklist.length;
    document.querySelector("[data-progress-text]").textContent = evaluation.answered + " of " + data.checklist.length + " responses captured";
    document.querySelector("[data-progress-bar]").style.width = Math.round((evaluation.answered / data.checklist.length) * 100) + "%";

    var exceptionText = "Not evaluated";
    if (evaluation.answered > 0 && !evaluation.complete) exceptionText = "Awaiting responses";
    if (evaluation.complete && !evaluation.hasException) exceptionText = "No exception";
    if (evaluation.complete && evaluation.hasException) exceptionText = evaluation.critical ? "Critical exception" : "Follow-up required";
    document.querySelector("[data-state-exception]").textContent = exceptionText;
    document.querySelector("[data-state-history]").textContent = state.submitted ? "Occurrence preserved" : "Pending submission";
    notesRequirement.textContent = evaluation.notesRequired ? "Required because an exception is selected" : "Optional unless an exception is identified";
    notesField.toggleAttribute("aria-required", evaluation.notesRequired);
    updateRecordPreview();
  }

  function resolveAsset() {
    state.assetResolved = true;
    setEvents([
      { label: "Identity", text: "QR value resolved to governed asset LAD-017.", tone: "complete" },
      { label: "Source record", text: "Location, department, class, and frequency loaded from the asset master.", tone: "complete" },
      { label: "Occurrence", text: "A new synthetic inspection instance is ready for required responses.", tone: "active" }
    ]);
    updateLiveState();
    setStep("inspect", true);
  }

  function applyScenario(mode) {
    data.checklist.forEach(function (item) {
      var value = mode === "safe" ? item.safe : item.safe;
      if (mode === "exception" && item.id === "hardware") value = "Fail";
      if (mode === "exception" && item.id === "removeFromService") value = "Yes";
      state.responses[item.id] = value;
      var input = form.querySelector('input[name="' + item.id + '"][value="' + value + '"]');
      if (input) input.checked = true;
    });
    state.notes = mode === "exception" ? "Hardware movement observed during inspection. Ladder isolated for follow-up." : "";
    notesField.value = state.notes;
    state.evidence = mode === "exception";
    renderEvidence();
    clearValidation();
    updateLiveState();
  }

  function clearValidation() {
    errorSummary.hidden = true;
    errorList.innerHTML = "";
    checklistRoot.querySelectorAll(".is-invalid").forEach(function (field) { field.classList.remove("is-invalid"); });
    notesField.classList.remove("is-invalid");
    notesField.removeAttribute("aria-invalid");
  }

  function validateInspection() {
    clearValidation();
    state.notes = notesField.value;
    var evaluation = getEvaluation();
    var errors = [];
    data.checklist.forEach(function (item) {
      if (!state.responses[item.id]) {
        errors.push(item.label + " requires a response.");
        var field = checklistRoot.querySelector('[data-item="' + item.id + '"]');
        if (field) field.classList.add("is-invalid");
      }
    });
    if (evaluation.notesRequired && state.notes.trim().length < 8) {
      errors.push("Inspection notes are required when an exception is selected.");
      notesField.classList.add("is-invalid");
      notesField.setAttribute("aria-invalid", "true");
    }
    if (errors.length) {
      errorList.innerHTML = errors.map(function (error) { return "<li>" + escapeHtml(error) + "</li>"; }).join("");
      errorSummary.hidden = false;
      errorSummary.focus();
      return null;
    }
    return evaluation;
  }

  function renderEvidence() {
    document.querySelector("[data-evidence-chip]").hidden = !state.evidence;
    document.querySelector("[data-evidence]").hidden = state.evidence;
  }

  function renderResult(evaluation) {
    var status = evaluation.critical ? "Removed from service" : evaluation.hasException ? "Follow-up required" : "Passed";
    var explanation = evaluation.critical
      ? "A safety-critical response triggered asset isolation, corrective action, notification, and reporting updates."
      : evaluation.hasException
        ? "The inspection was preserved with a review exception and routed for follow-up."
        : "All required responses passed. The completed occurrence was preserved in inspection history.";

    state.submitted = true;
    document.querySelector("[data-result-status]").textContent = status;
    document.querySelector("[data-result-explanation]").textContent = explanation;
    document.querySelector("[data-result-action]").textContent = evaluation.correctiveAction ? "CA-DEMO-011 created" : "Not required";
    document.querySelector("[data-result-notification]").textContent = evaluation.hasException ? "Exception notice generated" : "Not required";
    var banner = document.querySelector("[data-result-banner]");
    banner.className = "result-banner " + (evaluation.critical ? "critical" : evaluation.hasException ? "follow-up" : "passed");

    var currentHistory = document.querySelector("[data-current-history]");
    currentHistory.innerHTML = '<div class="history-row current" role="row"><strong role="cell">' + data.inspection.inspectionId + '</strong><span role="cell">Demo session</span><span role="cell">' + escapeHtml(status) + '</span><span role="cell">' + (state.evidence ? "1 synthetic file" : "No attachment") + "</span></div>";

    setEvents([
      { label: "Occurrence", text: data.inspection.inspectionId + " created separately from asset LAD-017.", tone: "complete" },
      { label: "Validation", text: "Six required responses and exception-note rules passed.", tone: "complete" },
      { label: evaluation.correctiveAction ? "Corrective action" : "Control result", text: evaluation.correctiveAction ? "CA-DEMO-011 created and linked to the inspection occurrence." : "No corrective action was required.", tone: evaluation.correctiveAction ? "alert" : "complete" },
      { label: "Notification", text: evaluation.hasException ? "A synthetic exception notice was generated for the responsible owner." : "Notification workflow was correctly skipped.", tone: evaluation.hasException ? "alert" : "complete" },
      { label: "Reporting", text: "History and management reporting state updated from the same governed record.", tone: "complete" }
    ]);
    document.querySelector("[data-state-history]").textContent = "Occurrence preserved";
    updateRecordPreview(status);
    setStep("result", true);
  }

  function resetDemo() {
    state.step = "identify";
    state.assetResolved = false;
    state.responses = {};
    state.notes = "";
    state.evidence = false;
    state.submitted = false;
    form.reset();
    notesField.value = "";
    clearValidation();
    renderEvidence();
    setEvents([{ label: "Waiting", text: "Simulate the QR scan to begin.", tone: "pending" }]);
    updateLiveState();
    setStep("identify", true);
  }

  renderChecklist();
  renderArchitecture();
  renderPreviousHistory();
  renderEvents();
  renderEvidence();
  updateLiveState();

  document.querySelector("[data-scan]").addEventListener("click", function () {
    if (!window.CanvasSim) { resolveAsset(); return; }
    window.CanvasSim.busy(canvasRoot, "Resolving synthetic asset record…", resolveAsset, 460).then(function () {
      canvasNotify("Asset LAD-017 loaded from the synthetic asset register.", "success");
    });
  });
  document.querySelectorAll("[data-scenario]").forEach(function (button) {
    button.addEventListener("click", function () {
      var mode = button.getAttribute("data-scenario");
      applyScenario(mode);
      canvasNotify(mode === "safe" ? "Pass scenario loaded for review." : "Safety-exception scenario loaded for review.", mode === "safe" ? "success" : "warning");
    });
  });
  notesField.addEventListener("input", function () { state.notes = notesField.value; updateRecordPreview(); });
  document.querySelector("[data-evidence]").addEventListener("click", function () { state.evidence = true; renderEvidence(); updateRecordPreview(); canvasNotify("Synthetic evidence reference attached.", "success"); });
  document.querySelector("[data-remove-evidence]").addEventListener("click", function () { state.evidence = false; renderEvidence(); updateRecordPreview(); canvasNotify("Synthetic evidence reference removed.", "info"); });
  document.querySelector("[data-back]").addEventListener("click", function () { state.assetResolved = false; updateLiveState(); setStep("identify", true); });
  document.querySelector("[data-edit]").addEventListener("click", function () { state.submitted = false; updateLiveState(); setStep("inspect", true); });
  document.querySelector("[data-reset]").addEventListener("click", resetDemo);
  canvasRoot.addEventListener("canvas:navigate", function (event) {
    var action = event.detail.action;
    if (action === "home" || action === "refresh" || action === "identify") {
      resetDemo();
      canvasNotify(action === "refresh" ? "Demo session refreshed." : "Returned to asset identification.", "info");
    } else if (action === "inspect") {
      if (state.assetResolved) setStep("inspect", true);
      else canvasNotify("Scan the synthetic asset before opening the inspection.", "warning");
    } else if (action === "history") {
      if (state.submitted) setStep("result", true);
      else canvasNotify("Inspection history is available after a validated submission.", "info");
    }
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var evaluation = validateInspection();
    if (!evaluation) { canvasNotify("Review the highlighted required fields.", "error"); return; }
    if (!window.CanvasSim) { renderResult(evaluation); return; }
    window.CanvasSim.confirm(canvasRoot, {
      title: evaluation.hasException ? "Submit inspection with exception?" : "Submit completed inspection?",
      message: evaluation.hasException ? "The synthetic record will create the demonstrated exception and follow-up path." : "The synthetic record will be validated and added to inspection history.",
      confirmLabel: "Submit inspection"
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.CanvasSim.busy(canvasRoot, "Validating inspection controls…", function () { renderResult(evaluation); }, 520).then(function () {
        canvasNotify(evaluation.hasException ? "Inspection saved with a governed exception." : "Inspection passed and history was updated.", evaluation.hasException ? "warning" : "success");
      });
    });
  });
})();
