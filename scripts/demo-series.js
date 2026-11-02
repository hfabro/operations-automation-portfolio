(function () {
  "use strict";

  var demos = [
    { slug: "plant-operations-hub", short: "Plant Operations Hub", title: "Plant Operations Hub", category: "Implemented recreation" },
    { slug: "facility-leaks", short: "Facility Leak Management", title: "Facility Leak Management", category: "Implemented recreation" },
    { slug: "ladder-inspection", short: "Ladder Inspection", title: "Ladder Inspection", category: "Implemented recreation" },
    { slug: "digital-kanban", short: "Supply Kanban", title: "Supply Kanban", category: "Implemented recreation" },
    { slug: "toolbox-talks", short: "Toolbox Talks", title: "Toolbox Talks", category: "Implemented recreation" },
    { slug: "ehs-control", short: "EHS Compliance Control", title: "EHS Compliance Control", category: "Implemented recreation" },
    { slug: "electrical-analytics", short: "Electrical Usage Analytics", title: "Electrical Usage Analytics", category: "Implemented recreation" },
    { slug: "forklift-fleet", short: "Forklift Fleet & Battery", title: "Forklift Fleet & Battery", category: "Implemented recreation" },
    { slug: "cmms-lifecycle", short: "CMMS architecture", title: "CMMS Lifecycle Architecture", category: "Architecture concept" },
    { slug: "connected-operations", short: "Connected operations", title: "Connected Operations Concept", category: "Architecture concept" },
    { slug: "smart-factory-roadmap", short: "Smart Factory roadmap", title: "Smart Factory Roadmap", category: "Strategy concept" },
    { slug: "compliance-workflow", short: "Requirement lifecycle", title: "Requirement Lifecycle Architecture", category: "Supporting technical view" },
    { slug: "telemetry-explorer", short: "Telemetry model", title: "Telemetry Model Explorer", category: "Supporting technical view" },
    { slug: "building-operations", short: "Spatial concept", title: "Building Operations Concept", category: "Spatial concept" }
  ];

  var parts = window.location.pathname.split("/").filter(Boolean);
  var slug = parts[parts.length - 1] === "index.html" ? parts[parts.length - 2] : parts[parts.length - 1];
  var index = demos.findIndex(function (item) { return item.slug === slug; });
  if (index < 0) return;

  var previous = demos[(index - 1 + demos.length) % demos.length];
  var current = demos[index];
  var next = demos[(index + 1) % demos.length];
  var header = document.querySelector("header");
  var main = document.querySelector("main");
  if (!main) return;

  function demoUrl(item) { return "../" + item.slug + "/"; }

  var nav = document.createElement("nav");
  nav.className = "demo-series-nav";
  nav.setAttribute("aria-label", "Interactive system series");
  nav.innerHTML =
    '<a class="series-previous" href="' + demoUrl(previous) + '" aria-label="Previous system: ' + previous.title + '">' +
      '<span class="demo-series-direction" aria-hidden="true">←</span><span class="demo-series-link-copy"><span>Previous system</span><strong>' + previous.short + '</strong><small>' + previous.category + '</small></span>' +
    '</a>' +
    '<div class="demo-series-center"><span>' + current.category + '</span><strong>' + String(index + 1).padStart(2, "0") + ' / ' + String(demos.length).padStart(2, "0") + ' · ' + current.short + '</strong><a href="../">View all systems</a></div>' +
    '<a class="series-next" href="' + demoUrl(next) + '" aria-label="Next system: ' + next.title + '">' +
      '<span class="demo-series-link-copy"><span>Next system</span><strong>' + next.short + '</strong><small>' + next.category + '</small></span><span class="demo-series-direction" aria-hidden="true">→</span>' +
    '</a>';

  if (header && header.nextSibling) header.parentNode.insertBefore(nav, header.nextSibling);
  else main.parentNode.insertBefore(nav, main);
})();
