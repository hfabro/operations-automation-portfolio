(function () {
  "use strict";

  var library = document.querySelector("[data-work-library]");
  if (!library) return;
  var controls = library.querySelector("[data-work-controls]");
  var search = library.querySelector("[data-work-search]");
  var focus = library.querySelector("[data-work-focus]");
  var buttons = Array.from(library.querySelectorAll("[data-work-filter]"));
  var cards = Array.from(library.querySelectorAll("[data-work-kind]"));
  var groups = Array.from(library.querySelectorAll("[data-work-group]"));
  var count = library.querySelector("[data-work-count]");
  var empty = library.querySelector("[data-work-empty]");
  var reset = library.querySelector("[data-work-reset]");
  var kinds = buttons.map(function (button) { return button.dataset.workFilter; });
  var activeKind = "all";
  var activeFocus = "all";
  var focuses = Array.from(focus.options).map(function (option) { return option.value; });
  var searchable = cards.map(function (card) { return card.textContent.toLowerCase(); });

  function applyFilter(updateUrl) {
    var words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var visible = 0;
    cards.forEach(function (card, index) {
      var matchesKind = activeKind === "all" || card.dataset.workKind === activeKind;
      var matchesFocus = activeFocus === "all" || (card.dataset.workFocuses || "").split(" ").includes(activeFocus);
      var matchesText = words.every(function (word) { return searchable[index].includes(word); });
      card.hidden = !(matchesKind && matchesFocus && matchesText);
      if (!card.hidden) visible += 1;
    });
    groups.forEach(function (group) {
      group.hidden = !Array.from(group.querySelectorAll("[data-work-kind]")).some(function (card) { return !card.hidden; });
      var contentsLink = document.querySelector('[data-section-nav] a[href="#' + group.id + '"]');
      if (contentsLink) contentsLink.hidden = group.hidden;
    });
    buttons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.workFilter === activeKind)); });
    count.textContent = visible + " of " + cards.length + " projects shown";
    empty.hidden = visible !== 0;
    reset.disabled = activeKind === "all" && activeFocus === "all" && search.value === "";
    if (updateUrl) {
      var url = new URL(window.location.href);
      if (activeKind === "all") url.searchParams.delete("maturity");
      else url.searchParams.set("maturity", activeKind);
      if (search.value.trim()) url.searchParams.set("q", search.value.trim());
      else url.searchParams.delete("q");
      if (activeFocus === "all") url.searchParams.delete("focus");
      else url.searchParams.set("focus", activeFocus);
      window.history.replaceState(null, "", url);
    }
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    activeKind = kinds.includes(params.get("maturity")) ? params.get("maturity") : "all";
    activeFocus = focuses.includes(params.get("focus")) ? params.get("focus") : "all";
    focus.value = activeFocus;
    search.value = (params.get("q") || "").slice(0, 100);
    applyFilter(false);
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeKind = button.dataset.workFilter;
      applyFilter(true);
    });
  });
  search.addEventListener("input", function () { applyFilter(true); });
  focus.addEventListener("change", function () {
    activeFocus = focus.value;
    applyFilter(true);
  });
  reset.addEventListener("click", function () {
    activeKind = "all";
    activeFocus = "all";
    focus.value = "all";
    search.value = "";
    applyFilter(true);
    search.focus();
  });
  window.addEventListener("popstate", readUrl);
  readUrl();
  controls.hidden = false;
})();
