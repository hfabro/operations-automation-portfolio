(function () {
  "use strict";
  var labels = {
    phone: ["Frontline phone", "Focused, touch-first execution for work at the point of use."],
    tablet: ["Tablet workspace", "Expanded working context for planning, review, and guided execution."],
    system: ["Full system view", "Application and governance context shown together." ]
  };

  document.querySelectorAll("[data-device-preview]").forEach(function (control) {
    var target = document.getElementById(control.getAttribute("data-target"));
    if (!target) return;
    var buttons = Array.prototype.slice.call(control.querySelectorAll("[data-preview-mode]"));
    var label = control.querySelector("[data-device-label]");
    var note = control.querySelector("[data-device-note]");
    var settleTimer = null;

    function copyFor(mode) {
      return [
        control.getAttribute("data-label-" + mode) || labels[mode][0],
        control.getAttribute("data-note-" + mode) || labels[mode][1]
      ];
    }

    function setMode(mode, focus) {
      if (!labels[mode]) mode = "system";
      target.setAttribute("data-device-mode", mode);
      buttons.forEach(function (button) {
        var selected = button.getAttribute("data-preview-mode") === mode;
        button.setAttribute("aria-pressed", String(selected));
        if (selected && focus) button.focus({ preventScroll: true });
      });
      var copy = copyFor(mode);
      if (label) label.textContent = copy[0];
      if (note) note.textContent = copy[1];
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(function () {
        target.dispatchEvent(new CustomEvent("devicepreviewchange", { detail: { mode: mode } }));
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280);
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () { setMode(button.getAttribute("data-preview-mode"), true); });
    });
    setMode(control.getAttribute("data-device-default") || "system", false);
  });
})();
