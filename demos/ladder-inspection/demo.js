(function () {
  "use strict";

  var data = window.LADDER_DEMO_DATA;
  if (!data) return;
  var occurrenceSequence = 48;
  var inspectionMonth = "September 2026";
  var cycleDispositions = {};
  var assetHistory = { "LAD-104": data.previousHistory.slice(), "LAD-107": [], "LAD-112": [] };

  var state = {
    step: "identify",
    assetResolved: false,
    identityMethod: null,
    responses: {},
    notes: "",
    evidence: false,
    submitted: false,
    events: [{ label: "Waiting", text: "Select month and department, then scan a synthetic QR tag or mark an expected ladder FOUND or NOT FOUND.", tone: "pending" }]
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
        return '<label class="response-option"><input type="radio" name="' + item.id + '" value="' + option + '"><span>' + (option === "Pass" ? "OK" : option === "Fail" ? "DEFECT" : option) + "</span></label>";
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
    root.innerHTML = (assetHistory[data.asset.assetId] || []).filter(function (record) { return record.id !== data.inspection.inspectionId; }).map(function (record) {
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
      identityMethod: state.assetResolved ? state.identityMethod : null,
      inspectionType: data.inspection.inspectionType,
      inspectionMonth: inspectionMonth,
      department: state.assetResolved ? data.asset.department : null,
      inspector: data.inspection.inspector,
      performedAt: "Synthetic demo session",
      status: status,
      responsesCaptured: evaluation.answered,
      responses: state.responses,
      notes: state.notes.trim() || null,
      evidence: state.evidence ? ["inspection-evidence-demo.jpg"] : [],
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
    document.querySelector("[data-state-asset]").textContent = state.assetResolved ? data.asset.assetId + " resolved" : "Select expected asset";
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
    data.inspection.inspectionId = "INS-DEMO-" + String(++occurrenceSequence).padStart(4, "0");
    renderPreviousHistory();
    document.querySelector('[data-asset-id]').textContent = data.asset.assetId;
    document.querySelector('[data-asset-location]').textContent = data.asset.location;
    document.querySelector('[data-asset-department]').textContent = data.asset.department;
    state.assetResolved = true;
    document.querySelector("[data-cycle-context]").textContent = inspectionMonth + " · " + data.asset.department + " · Completed by Demo Inspector";
    document.querySelector("[data-certify]").checked = false;
    setEvents([
      { label: state.identityMethod === "QR scan" ? "QR identity" : "Identity", text: state.identityMethod === "QR scan" ? "Simulated QR tag resolved to asset " + data.asset.assetId + " and automatically applied FOUND." : "Expected gallery selection resolved to asset " + data.asset.assetId + ".", tone: "complete" },
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
    if (!document.querySelector("[data-certify]").checked) errors.push("Certify that you inspected the selected asset for this cycle.");
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
    cycleDispositions[inspectionMonth+"|"+data.asset.assetId] = "Inspected";
    document.querySelector('[data-result-id]').textContent = data.inspection.inspectionId;
    document.querySelector('[data-result-id]').closest('.result-grid').children[1].querySelector('strong').textContent = data.asset.assetId;
    document.querySelector("[data-result-status]").textContent = status;
    document.querySelector("[data-result-explanation]").textContent = explanation;
    document.querySelector("[data-result-action]").textContent = evaluation.correctiveAction ? "CA-DEMO-011 created" : "Not required";
    document.querySelector("[data-result-notification]").textContent = evaluation.hasException ? "Exception notice generated" : "Not required";
    var banner = document.querySelector("[data-result-banner]");
    banner.className = "result-banner " + (evaluation.critical ? "critical" : evaluation.hasException ? "follow-up" : "passed");

    var currentHistory = document.querySelector("[data-current-history]");
    currentHistory.innerHTML = '<div class="history-row current" role="row"><strong role="cell">' + data.inspection.inspectionId + '</strong><span role="cell">Demo session</span><span role="cell">' + escapeHtml(status) + '</span><span role="cell">' + (state.evidence ? "1 synthetic file" : "No attachment") + "</span></div>";
    var history = assetHistory[data.asset.assetId] || (assetHistory[data.asset.assetId] = []);
    if (!history.some(function (record) { return record.id === data.inspection.inspectionId; })) {
      history.unshift({id:data.inspection.inspectionId,date:inspectionMonth,status:status,note:state.notes || "Required responses captured.",snapshot:JSON.parse(JSON.stringify(buildRecord(status,evaluation)))});
    }

    renderGallery();
    setEvents([
      { label: "Occurrence", text: data.inspection.inspectionId + " created separately from asset " + data.asset.assetId + ".", tone: "complete" },
      { label: "Validation", text: "Six required responses and exception-note rules passed.", tone: "complete" },
      { label: evaluation.correctiveAction ? "Corrective action" : "Control result", text: evaluation.correctiveAction ? "CA-DEMO-011 created and linked to the inspection occurrence." : "No corrective action was required.", tone: evaluation.correctiveAction ? "alert" : "complete" },
      { label: "Notification", text: evaluation.hasException ? "A synthetic exception notice was generated for the responsible owner." : "Notification workflow was correctly skipped.", tone: evaluation.hasException ? "alert" : "complete" },
      { label: "Reporting", text: "History and management reporting state updated from the same governed record.", tone: "complete" }
    ]);
    document.querySelector("[data-state-history]").textContent = "Occurrence preserved";
    updateRecordPreview(status);
    setStep("result", true);
    document.dispatchEvent(new CustomEvent("demo:state", { detail: { signal: "inspection-submitted" } }));
  }

  function resetDemo() {
    state.step = "identify";
    state.assetResolved = false;
    state.identityMethod = null;
    state.responses = {};
    state.notes = "";
    state.evidence = false;
    state.submitted = false;
    form.reset();
    notesField.value = "";
    clearValidation();
    renderEvidence();
    setEvents([{ label: "Waiting", text: "Select month and department, then scan a synthetic QR tag or mark an expected ladder FOUND or NOT FOUND.", tone: "pending" }]);
    updateLiveState();
    setStep("identify", true);
  }

  renderChecklist();
  renderArchitecture();
  renderPreviousHistory();
  renderEvents();
  renderEvidence();
  updateLiveState();

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
  document.querySelector("[data-edit]").addEventListener("click", function () { startInspectionForAsset(register.find(function(a){return a.id===data.asset.assetId;}), state.identityMethod); });
  document.querySelector("[data-reset]").addEventListener("click", resetDemo);
  canvasRoot.addEventListener("canvas:navigate", function (event) {
    var action = event.detail.action;
    if (action === "home" || action === "refresh" || action === "identify") {
      resetDemo();
      canvasNotify(action === "refresh" ? "Demo session refreshed." : "Returned to asset identification.", "info");
    } else if (action === "inspect") {
      if (state.assetResolved) {
        if (state.submitted) { startInspectionForAsset(register.find(function(a){return a.id===data.asset.assetId;}), state.identityMethod); }
        setStep("inspect", true);
      }
      else canvasNotify("Scan a synthetic QR tag or choose FOUND in the expected-asset gallery before inspecting.", "warning");
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
      message: data.asset.assetId + " · " + inspectionMonth + " · " + data.asset.department + " · Demo Inspector. " + (evaluation.hasException ? "Exception and follow-up will be recorded." : "Passed disposition will be added to history."),
      confirmLabel: "Submit inspection"
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.CanvasSim.busy(canvasRoot, "Validating inspection controls…", function () { renderResult(evaluation); }, 520).then(function () {
        canvasNotify(evaluation.hasException ? "Inspection saved with a governed exception." : "Inspection passed and history was updated.", evaluation.hasException ? "warning" : "success");
      });
    });
  });

  // Expected-asset workflow: cycle dispositions are not physical inspections.
  var register = [
    { id: "LAD-104", department: "Shipping", location: "Demo dispatch bay" },
    { id: "LAD-107", department: "Shipping", location: "Demo packing station" },
    { id: "LAD-112", department: "Facilities", location: "Demo support room" }
  ];
  var gallery = document.querySelector('[data-department-gallery]');
  var qrButton = gallery.querySelector('[data-qr-scan]');
  function startInspectionForAsset(asset, identityMethod) {
    if (!asset) return;
    resetDemo();
    state.identityMethod = identityMethod;
    data.asset.assetId = asset.id;
    data.asset.department = asset.department;
    data.asset.location = asset.location;
    gallery.querySelector('[data-department]').value = asset.department;
    renderGallery();
    resolveAsset();
    canvasNotify(identityMethod === "QR scan" ? 'Synthetic scan: '+asset.id+' QR scanned. Asset marked FOUND for '+inspectionMonth+'.' : asset.id+' identified for '+inspectionMonth+'.', 'success');
  }
  function renderGallery() {
    var department = gallery.querySelector('[data-department]').value;
    var qrTarget = register.find(function(a){return a.department===department;});
    qrButton.dataset.qrScan = qrTarget.id;
    qrButton.setAttribute('aria-label', 'Simulate QR scan for ladder '+qrTarget.id);
    gallery.querySelector('[data-qr-asset]').textContent = qrTarget.id;
    gallery.querySelector('[data-qr-location]').textContent = qrTarget.location;
    var subtitle = canvasRoot.querySelector('.canvas-app-identity small');
    if (subtitle) subtitle.textContent = inspectionMonth + ' · ' + department;
    gallery.querySelector('[data-expected-assets]').innerHTML = register.filter(function(a){return a.department===department;}).map(function(a){
      var disposition=cycleDispositions[inspectionMonth+"|"+a.id] || "Due";
      var history=assetHistory[a.id]||[];
      return '<article class="expected-asset"><strong>'+a.id+'</strong><small>'+a.location+' · '+inspectionMonth+'</small><p>'+disposition+'</p><div><button type="button" data-found="'+a.id+'">FOUND</button><button type="button" data-missing="'+a.id+'" '+(disposition!=="Due"?'disabled':'')+'>NOT FOUND</button></div><details><summary>Asset history ('+history.length+')</summary>'+history.map(function(r){return '<p>'+escapeHtml(r.id)+' · '+escapeHtml(r.date)+' · '+escapeHtml(r.status)+'</p>';}).join('')+'</details></article>';
    }).join('');
    gallery.querySelectorAll('[data-found]').forEach(function(b){b.onclick=function(){
      var a=register.find(function(r){return r.id===b.dataset.found;});
      startInspectionForAsset(a, 'Expected asset gallery');
    };});
    gallery.querySelectorAll('[data-missing]').forEach(function(b){b.onclick=function(){
      cycleDispositions[inspectionMonth+"|"+b.dataset.missing]="Not found · not inspected";
      renderGallery();canvasNotify('Missing asset recorded for this month. No physical inspection counted.','warning');
    };});
  }
  gallery.querySelector('[data-department]').onchange=renderGallery;
  qrButton.addEventListener('click', function(){
    startInspectionForAsset(register.find(function(a){return a.id===qrButton.dataset.qrScan;}), 'QR scan');
  });
  gallery.querySelector('[data-month]').onchange=function(e){inspectionMonth=e.target.value;renderGallery();};
  renderGallery();
})();
