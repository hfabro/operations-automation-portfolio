(function () {
  "use strict";
  var source = window.TELEMETRY_DEMO_DATA;
  if (!source) return;

  var state = { equipmentId: source.equipment[0].id, metric: "soc", showPeak: true, activeIndex: 12 };
  var select = document.querySelector("[data-equipment]");
  var canvas = document.querySelector("[data-chart]");
  var context = canvas.getContext("2d");
  var peakToggle = document.querySelector("[data-peak]");
  var resizeFrame = null;
  var currentSeries = [];

  function escapeHtml(value) { return String(value).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function inRanges(index, ranges) { return ranges.some(function (range) { return index >= range[0] && index < range[1]; }); }

  function buildSeries(profile) {
    var soc = profile.initialSoc;
    return source.intervals.map(function (time, index) {
      var charging = index >= profile.chargeRange[0] && index < profile.chargeRange[1];
      var active = !charging && inRanges(index, profile.activeRanges);
      if (charging) soc = Math.min(100, soc + 4.6);
      else if (active) soc = Math.max(8, soc - 3.1);
      else soc = Math.max(8, soc - .35);
      var demand = charging ? profile.peakDemand * (.82 + (index % 3) * .07) : 0;
      return { time: time, state: charging ? "Charging" : active ? "Active" : "Idle", soc: Math.round(soc * 10) / 10, activity: active ? 100 : charging ? 35 : 0, demand: Math.round(demand * 10) / 10, peak: index >= source.peakWindow.startIndex && index <= source.peakWindow.endIndex };
    });
  }

  function currentProfile() { return source.equipment.find(function (item) { return item.id === state.equipmentId; }) || source.equipment[0]; }
  function metricConfig() {
    return {
      soc: { key: "soc", label: "State of charge", unit: "%", max: 100, color: "#164f3d", type: "line" },
      activity: { key: "activity", label: "Active use", unit: "% state", max: 100, color: "#3d789b", type: "bar" },
      demand: { key: "demand", label: "Charging demand", unit: "kW", max: 14, color: "#d75e38", type: "bar" }
    }[state.metric];
  }

  function setupControls() {
    select.innerHTML = source.equipment.map(function (profile) { return '<option value="' + profile.id + '">' + escapeHtml(profile.label) + "</option>"; }).join("");
    select.value = state.equipmentId;
    document.querySelectorAll("[data-metric]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.metric = button.getAttribute("data-metric");
        document.querySelectorAll("[data-metric]").forEach(function (candidate) {
          var active = candidate === button;
          candidate.classList.toggle("active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
        render();
      });
    });
    select.addEventListener("change", function () { state.equipmentId = select.value; render(); });
    peakToggle.addEventListener("change", function () { state.showPeak = peakToggle.checked; render(); });
    canvas.addEventListener("pointermove", function (event) { selectInterval(event.clientX); });
    canvas.addEventListener("pointerdown", function (event) { selectInterval(event.clientX); });
    canvas.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      state.activeIndex = Math.max(0, Math.min(source.intervals.length - 1, state.activeIndex + (event.key === "ArrowRight" ? 1 : -1)));
      drawChart(currentSeries);
      renderInspector(currentSeries);
    });
  }

  function selectInterval(clientX) {
    var rect = canvas.getBoundingClientRect();
    var usable = Math.max(1, rect.width - 66);
    var relative = Math.max(0, Math.min(usable, clientX - rect.left - 48));
    var next = Math.max(0, Math.min(source.intervals.length - 1, Math.floor(relative / usable * source.intervals.length)));
    if (next === state.activeIndex) return;
    state.activeIndex = next;
    drawChart(currentSeries);
    renderInspector(currentSeries);
  }

  function drawChart(series) {
    var config = metricConfig();
    var rect = canvas.getBoundingClientRect();
    var ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var width = rect.width;
    var height = rect.height;
    var margin = { top: 24, right: 18, bottom: 46, left: 48 };
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    var step = plotWidth / series.length;
    context.clearRect(0, 0, width, height);

    if (state.showPeak) {
      var peakX = margin.left + source.peakWindow.startIndex * step;
      var peakWidth = (source.peakWindow.endIndex - source.peakWindow.startIndex + 1) * step;
      context.fillStyle = "rgba(215,94,56,.12)";
      context.fillRect(peakX, margin.top, peakWidth, plotHeight);
    }

    context.font = "11px system-ui, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (var gridIndex = 0; gridIndex <= 4; gridIndex++) {
      var y = margin.top + (plotHeight / 4) * gridIndex;
      var value = config.max - (config.max / 4) * gridIndex;
      context.strokeStyle = "#d9e0dc";
      context.lineWidth = 1;
      context.beginPath(); context.moveTo(margin.left, y); context.lineTo(width - margin.right, y); context.stroke();
      context.fillStyle = "#66736d";
      context.fillText(Math.round(value) + (config.unit === "%" ? "%" : config.unit === "kW" ? " kW" : ""), margin.left - 8, y);
    }

    context.textAlign = "center";
    context.textBaseline = "top";
    series.forEach(function (point, index) {
      if (index % 4 === 0 || index === series.length - 1) {
        context.fillStyle = "#66736d";
        context.fillText(point.time, margin.left + index * step + step / 2, height - margin.bottom + 12);
      }
    });

    if (config.type === "line") {
      context.strokeStyle = config.color;
      context.lineWidth = 3;
      context.beginPath();
      series.forEach(function (point, index) {
        var x = margin.left + index * step + step / 2;
        var y = margin.top + plotHeight - (point[config.key] / config.max) * plotHeight;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke();
      series.forEach(function (point, index) {
        var x = margin.left + index * step + step / 2;
        var y = margin.top + plotHeight - (point[config.key] / config.max) * plotHeight;
        context.fillStyle = config.color; context.beginPath(); context.arc(x, y, 2.7, 0, Math.PI * 2); context.fill();
      });
    } else {
      series.forEach(function (point, index) {
        var value = point[config.key];
        var barHeight = (value / config.max) * plotHeight;
        context.fillStyle = config.color;
        context.fillRect(margin.left + index * step + 2, margin.top + plotHeight - barHeight, Math.max(3, step - 4), barHeight);
      });
    }
    var activePoint = series[state.activeIndex];
    if (activePoint) {
      var activeX = margin.left + state.activeIndex * step + step / 2;
      var activeY = margin.top + plotHeight - (activePoint[config.key] / config.max) * plotHeight;
      context.strokeStyle = "#d75e38"; context.lineWidth = 1.5; context.setLineDash([4, 4]);
      context.beginPath(); context.moveTo(activeX, margin.top); context.lineTo(activeX, margin.top + plotHeight); context.stroke(); context.setLineDash([]);
      context.fillStyle = "#fff"; context.strokeStyle = "#d75e38"; context.lineWidth = 3; context.beginPath(); context.arc(activeX, activeY, 6, 0, Math.PI * 2); context.fill(); context.stroke();
    }
  }

  function renderInspector(series) {
    var point = series[state.activeIndex];
    var config = metricConfig();
    if (!point) return;
    document.querySelector("[data-inspector-time]").textContent = point.time + (point.peak ? " · modeled peak" : " · interval");
    document.querySelector("[data-inspector-value]").textContent = point[config.key].toFixed(config.key === "activity" ? 0 : 1) + (config.key === "demand" ? " kW" : "%");
    document.querySelector("[data-inspector-state]").textContent = point.state + " · SOC " + point.soc.toFixed(1) + "% · demand " + point.demand.toFixed(1) + " kW";
  }

  function renderKpis(profile, series) {
    document.querySelector("[data-kpi-soc]").textContent = Math.round(series[series.length - 1].soc) + "%";
    document.querySelector("[data-kpi-utilization]").textContent = profile.utilization + "%";
    document.querySelector("[data-kpi-energy]").textContent = profile.chargingEnergy.toFixed(1) + " kWh";
    document.querySelector("[data-kpi-demand]").textContent = profile.peakDemand.toFixed(1) + " kW";
  }

  function renderInsights(profile) {
    var level = profile.offPeakOpportunity;
    var title = level + " off-peak opportunity";
    var decision = level === "High" ? "Can this charging session move without reducing equipment availability?" : level === "Medium" ? "Can the session start after the modeled peak window?" : "Is the current charging window already operationally appropriate?";
    var decisionText = level === "High" ? "Validate shift demand, minimum state-of-charge requirements, charger capacity, and the facility tariff before changing the schedule." : level === "Medium" ? "A small timing change may reduce coincident demand, but the operating constraint should be tested first." : "The synthetic pattern shows limited coincident demand; process changes may add complexity without meaningful benefit.";
    document.querySelector("[data-pattern-title]").textContent = title;
    document.querySelector("[data-pattern-text]").textContent = profile.note;
    document.querySelector("[data-decision-title]").textContent = decision;
    document.querySelector("[data-decision-text]").textContent = decisionText;
  }

  function renderTable(profile, series) {
    document.querySelector("[data-table-caption]").textContent = "Synthetic interval data for " + profile.label;
    document.querySelector("[data-table-body]").innerHTML = series.map(function (point) {
      return "<tr><td>" + point.time + "</td><td>" + point.state + "</td><td>" + point.soc.toFixed(1) + "%</td><td>" + point.demand.toFixed(1) + " kW</td><td>" + (point.peak ? "Yes" : "No") + "</td></tr>";
    }).join("");
  }

  function renderComparison() {
    document.querySelector("[data-comparison-rows]").innerHTML = source.equipment.map(function (profile) {
      var label = "Select " + profile.label + ", " + profile.utilization + "% utilization, " + profile.chargingEnergy.toFixed(1) + " kilowatt-hours charging energy, " + profile.peakDemand.toFixed(1) + " kilowatts peak exposure, " + profile.offPeakOpportunity + " opportunity";
      return '<button class="comparison-row comparison-data' + (profile.id === state.equipmentId ? " active" : "") + '" type="button" aria-label="' + label + '" data-profile="' + profile.id + '"><strong>' + profile.label + '</strong><span>' + profile.utilization + '%</span><span>' + profile.chargingEnergy.toFixed(1) + ' kWh</span><span>' + profile.peakDemand.toFixed(1) + ' kW</span><span class="opportunity-' + profile.offPeakOpportunity.toLowerCase() + '">' + profile.offPeakOpportunity + "</span></button>";
    }).join("");
    document.querySelectorAll("[data-profile]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.equipmentId = button.getAttribute("data-profile");
        select.value = state.equipmentId;
        render();
        document.querySelector("[data-equipment]").focus({ preventScroll: true });
      });
    });
  }

  function renderArchitecture() {
    document.querySelector("[data-architecture-flow]").innerHTML = source.architecture.map(function (node, index) {
      return '<div class="architecture-node"><span>0' + (index + 1) + '</span><strong>' + node.name + '</strong><small>' + node.detail + "</small></div>" + (index < source.architecture.length - 1 ? '<span class="architecture-arrow" aria-hidden="true">→</span>' : "");
    }).join("");
  }

  function render() {
    var profile = currentProfile();
    var series = buildSeries(profile);
    currentSeries = series;
    var config = metricConfig();
    document.querySelector("[data-chart-title]").textContent = profile.label + " · " + config.label;
    document.querySelector("[data-legend-metric]").textContent = config.label;
    document.querySelector(".metric-dot").style.backgroundColor = config.color;
    var description = profile.label + " synthetic " + config.label.toLowerCase() + " across 24 thirty-minute intervals. " + (state.showPeak ? source.peakWindow.label + " is highlighted. " : "") + profile.note;
    document.querySelector("[data-chart-description]").textContent = description;
    canvas.setAttribute("aria-label", description);
    renderKpis(profile, series);
    renderInsights(profile);
    renderTable(profile, series);
    renderComparison();
    drawChart(series);
    renderInspector(series);
  }

  setupControls();
  renderArchitecture();
  render();
  window.addEventListener("resize", function () {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(render);
  });
})();
