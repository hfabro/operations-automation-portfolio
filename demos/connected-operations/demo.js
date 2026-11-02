(function () {
  "use strict";
  var source = window.CONNECTED_OPERATIONS_DATA;
  if (!source) return;

  var state = { assetId: source.assets[0].id, scenarioId: source.scenarios[0].id };
  var assetSelect = document.querySelector("[data-asset]");
  var canvas = document.querySelector("[data-output-chart]");
  var context = canvas.getContext("2d");
  var resizeFrame = null;

  function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]; }); }
  function asset() { return source.assets.find(function (item) { return item.id === state.assetId; }) || source.assets[0]; }
  function scenario() { return source.scenarios.find(function (item) { return item.id === state.scenarioId; }) || source.scenarios[0]; }
  function oee(item) { return item.availability * item.performance * item.quality / 10000; }
  function rateFor(assetItem, percent) { return Math.round(assetItem.targetRate * percent / 100); }
  function signalFor(assetItem, rawValue) { var value = rawValue * assetItem.signalScale; return (assetItem.signalScale < 1 ? value.toFixed(1) : Math.round(value)) + " " + assetItem.signalUnit; }
  function ruleExpression(assetItem, item) {
    if (item.ruleType === "signal") return assetItem.signalLabel.toLowerCase() + " > " + assetItem.signalThreshold + " " + assetItem.signalUnit + " for 3 intervals";
    if (item.ruleType === "microstops") return "microstops ≥ 3 within 4 hours";
    return "starved minutes > 30 per shift";
  }
  function stateLabel(value) { return { run: "Run", idle: "Idle / starved", stop: "Stop / fault", planned: "Planned" }[value] || value; }

  function setupControls() {
    assetSelect.innerHTML = source.assets.map(function (item) { return '<option value="' + item.id + '">' + escapeHtml(item.label) + "</option>"; }).join("");
    document.querySelector("[data-scenarios]").innerHTML = source.scenarios.map(function (item) { return '<button type="button" data-scenario="' + item.id + '" aria-pressed="' + String(item.id === state.scenarioId) + '">' + escapeHtml(item.label) + "</button>"; }).join("");
    assetSelect.addEventListener("change", function () { state.assetId = assetSelect.value; render(); });
    document.querySelectorAll("[data-scenario]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.scenarioId = button.getAttribute("data-scenario");
        document.querySelectorAll("[data-scenario]").forEach(function (candidate) { candidate.setAttribute("aria-pressed", String(candidate === button)); });
        render();
      });
    });
  }

  function renderKpis(item) {
    document.querySelector("[data-kpi-availability]").textContent = item.availability.toFixed(1) + "%";
    document.querySelector("[data-kpi-performance]").textContent = item.performance.toFixed(1) + "%";
    document.querySelector("[data-kpi-quality]").textContent = item.quality.toFixed(1) + "%";
    document.querySelector("[data-kpi-oee]").textContent = oee(item).toFixed(1) + "%";
  }

  function renderTimeline(item) {
    document.querySelector("[data-timeline]").innerHTML = item.states.map(function (machineState, index) {
      var label = source.intervals[index] + ": " + stateLabel(machineState);
      return '<span class="state-' + machineState + '" title="' + label + '"><i>' + source.intervals[index] + "</i><b>" + stateLabel(machineState) + "</b></span>";
    }).join("");
  }

  function drawChart(assetItem, item) {
    var rect = canvas.getBoundingClientRect();
    var ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var width = rect.width;
    var height = rect.height;
    var margin = { top: 25, right: 18, bottom: 46, left: 52 };
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    var step = plotWidth / item.rates.length;
    context.clearRect(0, 0, width, height);
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (var grid = 0; grid <= 4; grid++) {
      var y = margin.top + (plotHeight / 4) * grid;
      var value = assetItem.targetRate - (assetItem.targetRate / 4) * grid;
      context.strokeStyle = "#d9e0dc"; context.lineWidth = 1; context.beginPath(); context.moveTo(margin.left, y); context.lineTo(width - margin.right, y); context.stroke();
      context.fillStyle = "#66736d"; context.fillText(Math.round(value), margin.left - 8, y);
    }
    context.setLineDash([6, 5]); context.strokeStyle = "#d75e38"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(margin.left, margin.top); context.lineTo(width - margin.right, margin.top); context.stroke(); context.setLineDash([]);
    item.rates.forEach(function (percent, index) {
      var actual = rateFor(assetItem, percent);
      var barHeight = Math.min(plotHeight, (actual / assetItem.targetRate) * plotHeight);
      var machineState = item.states[index];
      context.fillStyle = machineState === "run" ? "#2f765d" : machineState === "planned" ? "#69808f" : machineState === "idle" ? "#d8a446" : "#d75e38";
      context.fillRect(margin.left + index * step + 3, margin.top + plotHeight - barHeight, Math.max(4, step - 6), barHeight);
      if (index % 2 === 0) { context.fillStyle = "#66736d"; context.textAlign = "center"; context.textBaseline = "top"; context.fillText(source.intervals[index], margin.left + index * step + step / 2, height - margin.bottom + 12); }
    });
  }

  function renderTable(assetItem, item) {
    document.querySelector("[data-table-caption]").textContent = assetItem.label + " · " + item.label + " modeled intervals";
    document.querySelector("[data-table-body]").innerHTML = source.intervals.map(function (time, index) {
      var operationalContext = item.states[index] === "run" ? assetItem.product : item.states[index] === "planned" ? "Planned startup" : item.label;
      return "<tr><td>" + time + "</td><td>" + stateLabel(item.states[index]) + "</td><td>" + rateFor(assetItem, item.rates[index]) + " " + assetItem.rateUnit + "</td><td>" + signalFor(assetItem, item.signals[index]) + "</td><td>" + escapeHtml(operationalContext) + "</td></tr>";
    }).join("");
  }

  function renderDecision(assetItem, item) {
    document.querySelector("[data-condition-banner]").className = "condition-banner condition-" + item.id;
    document.querySelector("[data-condition-code]").textContent = item.code;
    document.querySelector("[data-condition-title]").textContent = item.title;
    document.querySelector("[data-condition-text]").textContent = item.text;
    document.querySelector("[data-rule-expression]").textContent = ruleExpression(assetItem, item);
    document.querySelector("[data-rule-status]").textContent = item.ruleStatus;
    document.querySelector("[data-rule-note]").textContent = item.ruleNote;
    document.querySelector("[data-decision-question]").textContent = item.question;
    document.querySelector("[data-decision-context]").textContent = item.decision;
    document.querySelector("[data-production-title]").textContent = assetItem.label + " · " + item.label;
    document.querySelector("[data-chart-description]").textContent = assetItem.label + " modeled output for the " + item.label.toLowerCase() + " scenario. The dashed line represents the synthetic target rate; bar color represents the contextualized machine state.";
    canvas.setAttribute("aria-label", document.querySelector("[data-chart-description]").textContent);
  }

  function renderPareto(item) {
    var max = Math.max.apply(null, item.losses.map(function (loss) { return loss.minutes; }));
    var total = item.losses.reduce(function (sum, loss) { return sum + loss.minutes; }, 0);
    document.querySelector("[data-loss-summary]").textContent = total + " modeled loss minutes classified by controlled reason.";
    document.querySelector("[data-pareto]").innerHTML = item.losses.map(function (loss, index) {
      var width = Math.round(loss.minutes / max * 100);
      return '<div class="pareto-row"><span><b>0' + (index + 1) + "</b>" + escapeHtml(loss.name) + '</span><div><i style="width:' + width + '%"></i></div><strong>' + loss.minutes + " min</strong></div>";
    }).join("");
  }

  function renderEvents(item) {
    document.querySelector("[data-event-count]").textContent = item.events.length + " modeled events";
    document.querySelector("[data-events]").innerHTML = item.events.map(function (event) { return '<li><time>' + event.time + '</time><div><span>' + escapeHtml(event.type) + '</span><p>' + escapeHtml(event.text) + "</p></div></li>"; }).join("");
  }

  function renderArchitecture() {
    document.querySelector("[data-architecture-flow]").innerHTML = source.architecture.map(function (node, index) {
      return '<div class="architecture-node"><span>0' + (index + 1) + '</span><strong>' + escapeHtml(node.name) + '</strong><small>' + escapeHtml(node.detail) + "</small></div>" + (index < source.architecture.length - 1 ? '<b class="architecture-arrow" aria-hidden="true">→</b>' : "");
    }).join("");
  }

  function render() {
    var assetItem = asset();
    var scenarioItem = scenario();
    renderKpis(scenarioItem);
    renderTimeline(scenarioItem);
    renderDecision(assetItem, scenarioItem);
    renderPareto(scenarioItem);
    renderEvents(scenarioItem);
    renderTable(assetItem, scenarioItem);
    drawChart(assetItem, scenarioItem);
  }

  setupControls();
  renderArchitecture();
  render();
  window.addEventListener("resize", function () { if (resizeFrame) window.cancelAnimationFrame(resizeFrame); resizeFrame = window.requestAnimationFrame(render); });
})();
