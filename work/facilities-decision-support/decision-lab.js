(function () {
  "use strict";
  var lab = document.querySelector("[data-ledger]");
  if (!lab) return;
  var controls = Array.from(lab.querySelectorAll("[data-ledger-item]"));
  var output = lab.querySelector("[data-ledger-status]");

  function update() {
    var selected = controls.filter(function (item) { return item.checked; });
    var alternatives = selected.filter(function (item) { return item.dataset.ledgerGroup === "runtime"; });
    var count = selected.length;
    var message = count + (count === 1 ? " example selected. " : " examples selected. ");
    if (alternatives.length > 1) {
      message += "Overlap warning: the two modeled schedules are alternatives. Compare them; do not add them together.";
      lab.dataset.ledgerState = "warning";
    } else {
      message += "No alternative overlap selected. Program calculations and modeled opportunities still need separate labels and validation.";
      lab.dataset.ledgerState = "clear";
    }
    output.textContent = message;
  }
  controls.forEach(function (control) { control.addEventListener("change", update); });
  lab.hidden = false;
  update();
})();
