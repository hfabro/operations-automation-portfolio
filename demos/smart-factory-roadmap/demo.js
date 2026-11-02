(function () {
  "use strict";

  var data = window.SMART_FACTORY_DATA;
  var plantSelect = document.querySelector("[data-plant-select]");
  var priorityControls = document.querySelectorAll('input[name="priority"]');
  var state = { plant: data.plants[0], priority: "reliability" };

  data.plants.forEach(function (plant) {
    var option = document.createElement("option");
    option.value = plant.id;
    option.textContent = plant.name;
    plantSelect.appendChild(option);
  });

  function average(values) {
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function maturityLabel(score) {
    if (score < 2) return "Ad hoc";
    if (score < 3) return "Repeatable";
    if (score < 4) return "Defined";
    if (score < 4.6) return "Integrated";
    return "Adaptive";
  }

  function svgNode(name, attributes) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function point(index, radius) {
    var angle = (-90 + index * (360 / data.domains.length)) * Math.PI / 180;
    return { x: 210 + Math.cos(angle) * radius, y: 180 + Math.sin(angle) * radius };
  }

  function renderRadar() {
    var grid = document.querySelector("[data-radar-grid]");
    var pointsLayer = document.querySelector("[data-radar-points]");
    var labelsLayer = document.querySelector("[data-radar-labels]");
    grid.replaceChildren(); pointsLayer.replaceChildren(); labelsLayer.replaceChildren();

    [1, 2, 3, 4, 5].forEach(function (level) {
      var polygon = svgNode("polygon", {
        points: data.domains.map(function (_, index) { var p = point(index, level * 26); return p.x + "," + p.y; }).join(" "),
        class: "radar-grid-line"
      });
      grid.appendChild(polygon);
    });

    data.domains.forEach(function (domain, index) {
      var outer = point(index, 130);
      grid.appendChild(svgNode("line", { x1: 210, y1: 180, x2: outer.x, y2: outer.y, class: "radar-axis" }));
      var labelPoint = point(index, 154);
      var text = svgNode("text", { x: labelPoint.x, y: labelPoint.y, class: "radar-label", "text-anchor": labelPoint.x < 190 ? "end" : labelPoint.x > 230 ? "start" : "middle" });
      text.textContent = domain.label;
      labelsLayer.appendChild(text);
    });

    var shapePoints = data.domains.map(function (domain, index) {
      var p = point(index, state.plant.maturity[domain.id] * 26);
      pointsLayer.appendChild(svgNode("circle", { cx: p.x, cy: p.y, r: 4, class: "radar-point" }));
      return p.x + "," + p.y;
    });
    document.querySelector("[data-radar-shape]").setAttribute("points", shapePoints.join(" "));
  }

  function renderAssessment() {
    var scores = data.domains.map(function (domain) { return state.plant.maturity[domain.id]; });
    var mean = average(scores);
    document.querySelector("[data-plant-name]").textContent = state.plant.name;
    document.querySelector("[data-maturity-score]").textContent = mean.toFixed(1) + " / 5 · " + maturityLabel(mean);

    var ranked = data.domains.slice().sort(function (a, b) { return state.plant.maturity[a.id] - state.plant.maturity[b.id]; });
    document.querySelector("[data-gap-count]").textContent = "Top " + Math.min(3, ranked.length);
    var gapList = document.querySelector("[data-gap-list]");
    gapList.replaceChildren();
    ranked.slice(0, 3).forEach(function (domain, index) {
      var item = document.createElement("li");
      item.innerHTML = '<span>0' + (index + 1) + '</span><div><strong>' + domain.label + ' · ' + state.plant.maturity[domain.id].toFixed(1) + '</strong><p>' + domain.question + '</p></div>';
      gapList.appendChild(item);
    });

    var table = document.querySelector("[data-domain-table]");
    table.replaceChildren();
    data.domains.forEach(function (domain) {
      var row = document.createElement("tr");
      row.innerHTML = "<th>" + domain.label + "</th><td>" + state.plant.maturity[domain.id].toFixed(1) + " / 5</td><td>" + domain.question + "</td>";
      table.appendChild(row);
    });
    renderRadar();
  }

  function readiness(useCase) {
    return average(useCase.requires.map(function (domain) { return state.plant.maturity[domain]; }));
  }

  function scoreUseCase(useCase) {
    var ready = readiness(useCase);
    var alignment = useCase.alignment[state.priority];
    var effortScore = 6 - useCase.effort;
    var riskScore = 6 - useCase.risk;
    return Math.round((alignment * .30 + useCase.value * .25 + ready * .25 + effortScore * .10 + riskScore * .10) * 20);
  }

  function phaseFor(useCase, rank) {
    var ready = readiness(useCase);
    if (ready < 2.45 || useCase.risk >= 5) return "Gate / prerequisites";
    if (rank < 2 && ready >= 2.8) return "Pilot candidate";
    if (rank < 5) return "Develop next";
    return "Monitor / sequence later";
  }

  function prioritizedUseCases() {
    return data.useCases.map(function (useCase) {
      return { item: useCase, score: scoreUseCase(useCase), readiness: readiness(useCase) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function renderBacklog() {
    var backlog = document.querySelector("[data-backlog]");
    backlog.replaceChildren();
    prioritizedUseCases().forEach(function (entry, index) {
      var useCase = entry.item;
      var article = document.createElement("article");
      article.innerHTML = '<div class="rank"><span>#' + (index + 1) + '</span><strong>' + entry.score + '</strong><small>priority score</small></div><div class="use-case-copy"><div><span>' + phaseFor(useCase, index) + '</span><h3>' + useCase.name + '</h3></div><p>' + useCase.summary + '</p><ul><li>Readiness ' + entry.readiness.toFixed(1) + ' / 5</li><li>Value ' + useCase.value + ' / 5</li><li>Effort ' + useCase.effort + ' / 5</li><li>Risk ' + useCase.risk + ' / 5</li></ul></div>';
      backlog.appendChild(article);
    });
  }

  function renderRoadmap() {
    var ranked = prioritizedUseCases();
    var phases = [
      { number: "01", title: "Foundation", gate: "Readiness gate", items: ["Confirm loss baseline and owner", "Close critical data / security gaps", "Define target architecture and support model"] },
      { number: "02", title: "Validate", gate: "Pilot value gate", items: ranked.slice(0, 2).map(function (entry) { return entry.item.name; }).concat(["Test adoption, controls, and support response"]) },
      { number: "03", title: "Standardize", gate: "Scale gate", items: ["Document reusable pattern", "Confirm integration and cybersecurity controls", "Validate lifecycle cost and site prerequisites"] },
      { number: "04", title: "Scale & sustain", gate: "Benefits gate", items: ["Deploy by readiness—not calendar pressure", "Track adoption and realized benefit", "Assign operating and technical ownership"] }
    ];
    var roadmap = document.querySelector("[data-roadmap]");
    roadmap.replaceChildren();
    phases.forEach(function (phase) {
      var article = document.createElement("article");
      article.innerHTML = '<span>' + phase.number + '</span><h3>' + phase.title + '</h3><ul>' + phase.items.map(function (item) { return "<li>" + item + "</li>"; }).join("") + '</ul><strong>' + phase.gate + ' →</strong>';
      roadmap.appendChild(article);
    });
  }

  function renderContext() {
    var priority = data.priorities[state.priority];
    document.querySelector("[data-context-title]").textContent = priority.title;
    document.querySelector("[data-context-note]").textContent = state.plant.context + " Priority: " + priority.note;
  }

  function render() {
    renderContext(); renderAssessment(); renderBacklog(); renderRoadmap();
  }

  plantSelect.addEventListener("change", function () {
    state.plant = data.plants.find(function (plant) { return plant.id === plantSelect.value; }) || data.plants[0];
    render();
  });
  priorityControls.forEach(function (control) {
    control.addEventListener("change", function () { if (control.checked) { state.priority = control.value; render(); } });
  });
  render();
})();
