(function () {
  "use strict";

  var demos = [
    { slug: "ladder-inspection", short: "Inspection", title: "Digital Ladder Inspection", anchor: "ladder-inspection" },
    { slug: "compliance-workflow", short: "Compliance", title: "Compliance Workflow", anchor: "compliance" },
    { slug: "telemetry-explorer", short: "Telemetry", title: "Telemetry & Energy Explorer", anchor: "telemetry" },
    { slug: "cmms-lifecycle", short: "CMMS", title: "CMMS Lifecycle Control", anchor: "cmms" },
    { slug: "digital-kanban", short: "Kanban", title: "QR Digital Kanban", anchor: "kanban" },
    { slug: "connected-operations", short: "Connected Ops", title: "Connected Operations", anchor: "connected-operations" },
    { slug: "building-operations", short: "Building Ops", title: "Building Operations", anchor: "building-operations" },
    { slug: "smart-factory-roadmap", short: "Roadmap", title: "Smart Factory Roadmap", anchor: "smart-factory-program" }
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
    '<div class="demo-series-center"><span>Interactive proof lab</span><strong>' + String(index + 1).padStart(2, "0") + ' / ' + String(demos.length).padStart(2, "0") + ' · ' + current.short + '</strong><a href="../">View all demos</a></div>' +
    '<a class="series-next" href="' + demoUrl(next) + '" aria-label="Next demo: ' + next.title + '">' +
      '<span class="demo-series-link-copy"><span>Next demo</span><strong>' + next.short + '</strong></span><span class="demo-series-direction" aria-hidden="true">→</span>' +
    '</a>';

  if (header && header.nextSibling) header.parentNode.insertBefore(nav, header.nextSibling);
  else main.parentNode.insertBefore(nav, main);
})();
