(function () {
  "use strict";

  const data = window.CMMS_DEMO_DATA;
  const state = {
    selected: 0,
    sequence: 1842,
    packet: null,
    signed: false,
    submitted: false,
    disposition: null,
    history: [{ time: "08:00", text: "Synthetic planning session opened", tone: "neutral" }]
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setTheme(theme, persist) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    const toggle = $('[data-theme-toggle]');
    if (toggle) toggle.setAttribute("aria-label", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
    if (persist) {
      try { window.localStorage.setItem("portfolio-theme", next); } catch (error) { /* Preference remains page-only. */ }
    }
  }

  let initialTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  try {
    const storedTheme = window.localStorage.getItem("portfolio-theme");
    if (storedTheme === "light" || storedTheme === "dark") initialTheme = storedTheme;
  } catch (error) { /* Use the system preference. */ }
  setTheme(initialTheme, false);

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function eventTime() {
    const minutes = state.history.length * 7;
    return `08:${String(minutes).padStart(2, "0")}`;
  }

  function addHistory(text, tone = "neutral") {
    state.history.unshift({ time: eventTime(), text, tone });
    renderHistory();
  }

  function setTab(name) {
    $$('[data-tab]').forEach((button) => {
      const selected = button.dataset.tab === name;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    $$('[data-panel]').forEach((panel) => {
      const selected = panel.dataset.panel === name;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });
    const activePanel = $(`[data-panel="${name}"]`);
    if (activePanel) activePanel.focus({ preventScroll: true });
  }

  function renderAssets() {
    const list = $('[data-asset-list]');
    list.innerHTML = data.assets.map((asset, index) => `
      <button type="button" class="asset-row ${index === state.selected ? "selected" : ""}" data-asset-index="${index}" aria-pressed="${index === state.selected}">
        <span><b>${escapeHtml(asset.name)}</b><small>${escapeHtml(asset.id)} · ${escapeHtml(asset.area)}</small></span>
        <span><b>${escapeHtml(asset.due)}</b><small>${escapeHtml(asset.cadence)} · ${escapeHtml(asset.criticality)} criticality</small></span>
        <i aria-hidden="true">→</i>
      </button>
    `).join("");
  }

  function renderSelection() {
    const asset = data.assets[state.selected];
    $('[data-selected-name]').textContent = asset.name;
    $('[data-selected-id]').textContent = asset.id;
    $('[data-selected-template]').textContent = `${asset.template} · Rev ${asset.revision}`;
    $('[data-selected-due]').textContent = asset.due;
    $('[data-selected-hours]').textContent = `${asset.hours.toFixed(1)} hours`;
    $('[data-plan-state]').textContent = state.packet && state.packet.asset.id === asset.id ? "Occurrence generated" : "Ready to generate";
  }

  function renderCapacity() {
    $('[data-capacity]').innerHTML = data.capacity.map((week) => {
      const percentage = Math.round((week.planned / week.available) * 100);
      return `<div class="capacity-week"><div><b>${week.week}</b><span>${week.planned}h / ${week.available}h</span></div><i><span style="width:${percentage}%"></span></i><small>${percentage}% planned</small></div>`;
    }).join("");
  }

  function generatePacket() {
    const asset = data.assets[state.selected];
    const occurrenceId = `PM-SYN-${state.sequence++}`;
    state.packet = {
      id: occurrenceId,
      asset,
      status: "In progress",
      tasks: asset.tasks.map((task) => ({ ...task, status: "Not started", value: "", evidenceCaptured: false }))
    };
    state.signed = false;
    state.submitted = false;
    state.disposition = null;
    addHistory(`${occurrenceId} generated from ${asset.template} Rev ${asset.revision}`, "good");
    renderAll();
    setTab("execute");
    $('[data-validation]').textContent = "Occurrence generated. Complete every step before submission.";
  }

  function taskMarkup(task, index) {
    const reading = task.type === "reading" ? `
      <label class="reading-field">Reading
        <span><input type="number" inputmode="decimal" step="0.1" data-task-reading="${index}" value="${escapeHtml(task.value)}" aria-label="${escapeHtml(task.title)} reading"><b>${escapeHtml(task.unit)}</b></span>
        <small>Expected range ${task.min}–${task.max} ${escapeHtml(task.unit)}</small>
      </label>` : "";
    return `
      <article class="task-row ${task.status === "Issue found" ? "has-issue" : ""}" data-task-row="${index}">
        <div class="task-id"><span>${escapeHtml(task.id)}</span><small>${task.type === "reading" ? "Condition reading" : "Inspection step"}</small></div>
        <div class="task-copy"><h3>${escapeHtml(task.title)}</h3>${task.evidence ? "<p>Evidence required when an issue is recorded.</p>" : "<p>Controlled response required.</p>"}</div>
        ${reading}
        <label class="status-field">Result
          <select data-task-status="${index}" aria-label="${escapeHtml(task.title)} result">
            ${["Not started", "Done", "Issue found", "N/A", "Blocked"].map((option) => `<option ${task.status === option ? "selected" : ""}>${option}</option>`).join("")}
          </select>
        </label>
        <button class="evidence-button ${task.evidenceCaptured ? "captured" : ""}" type="button" data-task-evidence="${index}">${task.evidenceCaptured ? "Evidence captured" : "Simulate evidence"}</button>
      </article>`;
  }

  function renderPacket() {
    const empty = $('[data-empty-packet]');
    const packet = $('[data-packet]');
    if (!state.packet) {
      empty.hidden = false;
      packet.hidden = true;
      $('[data-packet-title]').textContent = "No occurrence generated";
      $('[data-packet-status]').textContent = "Awaiting plan";
      $('[data-packet-status]').className = "packet-status";
      return;
    }
    empty.hidden = true;
    packet.hidden = false;
    const { asset } = state.packet;
    $('[data-packet-title]').textContent = `${asset.name} · ${state.packet.id}`;
    $('[data-packet-status]').textContent = state.packet.status;
    $('[data-packet-status]').className = `packet-status ${state.submitted ? "submitted" : "active"}`;
    $('[data-occurrence-id]').textContent = state.packet.id;
    $('[data-occurrence-asset]').textContent = `${asset.id} · ${asset.area}`;
    $('[data-occurrence-revision]').textContent = `${asset.template} · Rev ${asset.revision}`;
    $('[data-occurrence-due]').textContent = asset.due;
    $('[data-task-list]').innerHTML = state.packet.tasks.map(taskMarkup).join("");
    $('[data-sign-state]').textContent = state.signed ? "Signed by Demo Technician" : "Not signed";
    $('[data-sign-state]').className = state.signed ? "signed" : "";
    $$('[data-task-status], [data-task-reading], [data-task-evidence], [data-sign], [data-submit]').forEach((control) => { control.disabled = state.submitted; });
    $('[data-closeout-note]').disabled = state.submitted;
  }

  function exceptionSummary() {
    if (!state.packet) return [];
    const issues = [];
    state.packet.tasks.forEach((task) => {
      if (["Issue found", "Blocked"].includes(task.status)) issues.push(`${task.id}: ${task.status}`);
      if (task.type === "reading" && task.value !== "") {
        const value = Number(task.value);
        if (value < task.min || value > task.max) issues.push(`${task.id}: ${value} ${task.unit} outside ${task.min}–${task.max}`);
      }
    });
    return issues;
  }

  function validatePacket() {
    if (!state.packet) return ["Generate an occurrence first."];
    const problems = [];
    state.packet.tasks.forEach((task) => {
      if (task.status === "Not started") problems.push(`${task.id} needs a controlled result.`);
      if (task.type === "reading" && task.status !== "N/A" && task.value === "") problems.push(`${task.id} needs a reading.`);
      if ((task.status === "Issue found" || task.status === "Blocked") && task.evidence && !task.evidenceCaptured) problems.push(`${task.id} needs simulated evidence for the exception.`);
    });
    if (exceptionSummary().length && !$('[data-closeout-note]').value.trim()) problems.push("Add a closeout note for the exception.");
    if (!state.signed) problems.push("Apply the demo technician sign-off.");
    return problems;
  }

  function submitPacket() {
    const problems = validatePacket();
    const message = $('[data-validation]');
    if (problems.length) {
      message.className = "validation-message error";
      message.innerHTML = `<strong>Submission paused.</strong><ul>${problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join("")}</ul>`;
      return;
    }
    const issues = exceptionSummary();
    state.submitted = true;
    state.packet.status = issues.length ? "Supervisor review" : "Completed";
    addHistory(`${state.packet.id} submitted${issues.length ? ` with ${issues.length} routed exception${issues.length === 1 ? "" : "s"}` : " and closed cleanly"}`, issues.length ? "warn" : "good");
    message.className = "validation-message success";
    message.innerHTML = issues.length ? "<strong>Validated.</strong> The packet is locked and routed to supervisor review." : "<strong>Validated.</strong> The packet is locked and recorded as complete.";
    renderAll();
    setTab(issues.length ? "review" : "execute");
  }

  function loadScenario(type) {
    if (!state.packet) generatePacket();
    if (type === "exception") {
      state.packet.tasks.forEach((task, index) => {
        task.status = index === 1 ? "Issue found" : "Done";
        task.evidenceCaptured = index === 1;
        if (task.type === "reading") task.value = index === 2 ? String(task.max + 1.3) : String(task.target);
      });
      state.signed = true;
      state.submitted = false;
      state.packet.status = "In progress";
      $('[data-closeout-note]').value = "Elevated condition and visible wear recorded. Asset remains available under supervisor review; corrective inspection requested.";
      addHistory("Exception scenario loaded with transparent threshold logic", "warn");
      renderAll();
      setTab("execute");
      $('[data-validation]').textContent = "Scenario loaded. Review the issue, reading, evidence, and closeout note; then submit.";
    }
  }

  function renderReview() {
    const queue = $('[data-review-queue]');
    if (!state.packet || !state.submitted || !exceptionSummary().length) {
      queue.innerHTML = `<div class="empty-review"><span>0</span><h3>No exception awaiting review.</h3><p>Submit a packet containing an issue, blocked task, or out-of-range reading to exercise the disposition controls.</p><button class="secondary" type="button" data-scenario="exception">Load exception scenario</button></div>`;
      return;
    }
    const issues = exceptionSummary();
    if (state.disposition) {
      queue.innerHTML = `<article class="review-card resolved"><div><span>Disposition recorded</span><b>${escapeHtml(state.disposition)}</b></div><h3>${escapeHtml(state.packet.id)} · ${escapeHtml(state.packet.asset.name)}</h3><p>The synthetic packet is locked. The selected disposition and audit event remain visible for the session.</p></article>`;
      return;
    }
    queue.innerHTML = `<article class="review-card"><div><span>Requires human disposition</span><b>${issues.length} routed signal${issues.length === 1 ? "" : "s"}</b></div><h3>${escapeHtml(state.packet.id)} · ${escapeHtml(state.packet.asset.name)}</h3><ul>${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul><p><b>Technician note:</b> ${escapeHtml($('[data-closeout-note]').value || "No note")}</p><div class="review-actions"><button type="button" data-disposition="Accept with monitoring">Accept + monitor</button><button type="button" data-disposition="Corrective work requested">Create corrective action</button><button type="button" data-disposition="Returned for rework">Return for rework</button></div></article>`;
  }

  function applyDisposition(value) {
    state.disposition = value;
    state.packet.status = value;
    addHistory(`${state.packet.id}: ${value}`, value.includes("rework") ? "warn" : "good");
    renderAll();
  }

  function renderHistory() {
    $('[data-history]').innerHTML = state.history.map((item) => `<li class="${item.tone}"><span>${item.time}</span><p>${escapeHtml(item.text)}</p></li>`).join("");
  }

  function renderWatchlist() {
    const ranked = data.watchlist.map((item) => ({ ...item, score: item.condition * item.criticality * item.recurrence })).sort((a, b) => b.score - a.score);
    $('[data-watchlist]').innerHTML = ranked.map((item, index) => {
      const tone = item.score >= 15 ? "high" : item.score >= 7 ? "medium" : "low";
      return `<article class="watch-row"><span class="rank">0${index + 1}</span><div><b>${escapeHtml(item.asset)}</b><small>${escapeHtml(item.reason)}</small></div><dl><div><dt>Condition</dt><dd>${item.condition}/3</dd></div><div><dt>Criticality</dt><dd>${item.criticality}/3</dd></div><div><dt>Recurrence</dt><dd>${item.recurrence}/3</dd></div></dl><strong class="score ${tone}">${item.score}</strong></article>`;
    }).join("");
  }

  function resetDemo() {
    state.packet = null;
    state.signed = false;
    state.submitted = false;
    state.disposition = null;
    state.history = [{ time: "08:00", text: "Synthetic planning session reset", tone: "neutral" }];
    $('[data-closeout-note]').value = "";
    $('[data-validation]').textContent = "";
    renderAll();
    setTab("plan");
  }

  function renderAll() {
    renderAssets();
    renderSelection();
    renderCapacity();
    renderPacket();
    renderReview();
    renderHistory();
    renderWatchlist();
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) setTab(tab.dataset.tab);
    const assetButton = event.target.closest('[data-asset-index]');
    if (assetButton) {
      state.selected = Number(assetButton.dataset.assetIndex);
      renderAssets();
      renderSelection();
    }
    if (event.target.closest('[data-generate]')) generatePacket();
    const jump = event.target.closest('[data-jump]');
    if (jump) setTab(jump.dataset.jump);
    const scenario = event.target.closest('[data-scenario]');
    if (scenario) loadScenario(scenario.dataset.scenario);
    const evidence = event.target.closest('[data-task-evidence]');
    if (evidence && state.packet && !state.submitted) {
      const task = state.packet.tasks[Number(evidence.dataset.taskEvidence)];
      task.evidenceCaptured = !task.evidenceCaptured;
      renderPacket();
    }
    if (event.target.closest('[data-sign]') && !state.submitted) {
      state.signed = true;
      addHistory(`${state.packet.id} signed by Demo Technician`, "good");
      renderPacket();
    }
    if (event.target.closest('[data-submit]')) submitPacket();
    const disposition = event.target.closest('[data-disposition]');
    if (disposition) applyDisposition(disposition.dataset.disposition);
    if (event.target.closest('[data-reset]')) resetDemo();
    if (event.target.closest('[data-theme-toggle]')) {
      const root = document.documentElement;
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next, true);
    }
  });

  document.addEventListener("change", (event) => {
    if (!state.packet || state.submitted) return;
    if (event.target.matches('[data-task-status]')) {
      state.packet.tasks[Number(event.target.dataset.taskStatus)].status = event.target.value;
      renderPacket();
    }
    if (event.target.matches('[data-task-reading]')) {
      state.packet.tasks[Number(event.target.dataset.taskReading)].value = event.target.value;
    }
  });

  renderAll();
})();
