(function () {
  "use strict";

  var demos = [
    { slug: "plant-operations-hub", short: "Plant Operations Hub", title: "Plant Operations Hub" },
    { slug: "facility-leaks", short: "Facility Leak Management", title: "Facility Leak Management" },
    { slug: "ladder-inspection", short: "Ladder Inspection", title: "Ladder Inspection" },
    { slug: "digital-kanban", short: "Supply Kanban", title: "Supply Kanban" },
    { slug: "toolbox-talks", short: "Toolbox Talks", title: "Toolbox Talks" },
    { slug: "ehs-control", short: "EHS Compliance Control", title: "EHS Compliance Control" },
    { slug: "electrical-analytics", short: "Electrical Usage Analytics", title: "Electrical Usage Analytics" },
    { slug: "forklift-fleet", short: "Forklift Fleet & Battery", title: "Forklift Fleet & Battery" },
    { slug: "cmms-lifecycle", short: "CMMS architecture", title: "CMMS Lifecycle Architecture" },
    { slug: "connected-operations", short: "Connected operations", title: "Connected Operations Concept" },
    { slug: "smart-factory-roadmap", short: "Smart Factory roadmap", title: "Smart Factory Roadmap" },
    { slug: "compliance-workflow", short: "Requirement lifecycle", title: "Compliance Workflow Architecture" },
    { slug: "telemetry-explorer", short: "Telemetry model", title: "Telemetry Explorer" },
    { slug: "building-operations", short: "Spatial concept", title: "Building Operations Concept" }
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
  nav.setAttribute("aria-label", "Interactive demonstration series");
  nav.innerHTML =
    '<a class="series-previous" href="' + demoUrl(previous) + '" aria-label="Previous demo: ' + previous.title + '">' +
      '<span class="demo-series-direction" aria-hidden="true">←</span><span class="demo-series-link-copy"><span>Previous demo</span><strong>' + previous.short + '</strong></span>' +
    '</a>' +
    '<div class="demo-series-center"><span>Systems library</span><strong>' + String(index + 1).padStart(2, "0") + ' / ' + String(demos.length).padStart(2, "0") + ' · ' + current.short + '</strong><a href="../">View all demos</a></div>' +
    '<a class="series-next" href="' + demoUrl(next) + '" aria-label="Next demo: ' + next.title + '">' +
      '<span class="demo-series-link-copy"><span>Next demo</span><strong>' + next.short + '</strong></span><span class="demo-series-direction" aria-hidden="true">→</span>' +
    '</a>';

  if (header && header.nextSibling) header.parentNode.insertBefore(nav, header.nextSibling);
  else main.parentNode.insertBefore(nav, main);
})();
