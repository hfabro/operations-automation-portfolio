// Apply the preference before styles render to avoid an incorrect-theme flash.
(function () {
  "use strict";
  var stored = null;
  try { stored = window.localStorage.getItem("portfolio-theme"); } catch (error) { /* Storage is optional. */ }
  var preferred = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = stored === "light" || stored === "dark" ? stored : preferred;
})();
