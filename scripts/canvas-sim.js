(function () {
  "use strict";

  var timers = new WeakMap();
  var shellIndex = 0;

  function makeButton(label, action, symbol) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("data-canvas-action", action);
    if (symbol) button.setAttribute("data-canvas-symbol", symbol);
    return button;
  }

  function shellFor(root) {
    return root && root.matches && root.matches("[data-canvas-app]") ? root : root && root.closest ? root.closest("[data-canvas-app]") : null;
  }

  function notify(root, message, tone) {
    root = shellFor(root);
    if (!root) return;
    var region = root.querySelector("[data-canvas-toast-region]");
    var toast = region.querySelector(".canvas-toast");
    toast.className = "canvas-toast " + (tone || "success");
    toast.querySelector("p").textContent = message;
    window.clearTimeout(timers.get(root));
    window.requestAnimationFrame(function () { toast.classList.add("show"); });
    timers.set(root, window.setTimeout(function () { toast.classList.remove("show"); }, 3200));
  }

  function busy(root, label, task, delay) {
    root = shellFor(root);
    if (!root) return Promise.resolve().then(task);
    var overlay = root.querySelector("[data-canvas-busy]");
    overlay.querySelector("strong").textContent = label || "Updating the demo record…";
    overlay.hidden = false;
    root.classList.add("canvas-is-busy");
    return new Promise(function (resolve) {
      window.setTimeout(resolve, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : (delay || 420));
    }).then(function () { return task ? task() : undefined; }).finally(function () {
      overlay.hidden = true;
      root.classList.remove("canvas-is-busy");
    });
  }

  function confirmAction(root, options) {
    root = shellFor(root);
    if (!root) return Promise.resolve(true);
    options = options || {};
    var layer = root.querySelector("[data-canvas-dialog-layer]");
    var heading = layer.querySelector("h3");
    var message = layer.querySelector("p");
    var cancel = layer.querySelector("[data-canvas-cancel]");
    var confirm = layer.querySelector("[data-canvas-confirm]");
    var returnFocus = document.activeElement;
    heading.textContent = options.title || "Confirm action";
    message.textContent = options.message || "Continue with this synthetic workflow action?";
    confirm.textContent = options.confirmLabel || "Continue";
    layer.hidden = false;
    confirm.focus();
    return new Promise(function (resolve) {
      function close(value) {
        layer.hidden = true;
        cancel.removeEventListener("click", onCancel);
        confirm.removeEventListener("click", onConfirm);
        layer.removeEventListener("click", onLayer);
        document.removeEventListener("keydown", onKey);
        if (returnFocus && returnFocus.focus) returnFocus.focus();
        resolve(value);
      }
      function onCancel() { close(false); }
      function onConfirm() { close(true); }
      function onLayer(event) { if (event.target === layer) close(false); }
      function onKey(event) {
        if (event.key === "Escape") close(false);
        if (event.key === "Tab") {
          if (event.shiftKey && document.activeElement === cancel) { event.preventDefault(); confirm.focus(); }
          else if (!event.shiftKey && document.activeElement === confirm) { event.preventDefault(); cancel.focus(); }
        }
      }
      cancel.addEventListener("click", onCancel);
      confirm.addEventListener("click", onConfirm);
      layer.addEventListener("click", onLayer);
      document.addEventListener("keydown", onKey);
    });
  }

  function setActive(root, action) {
    root = shellFor(root);
    if (!root) return;
    var activeButton = null;
    root.querySelectorAll(".canvas-bottom-nav [data-canvas-action]").forEach(function (button) {
      if (button.getAttribute("data-canvas-action") === action) { button.setAttribute("aria-current", "page"); activeButton = button; }
      else button.removeAttribute("aria-current");
    });
    var nav = activeButton && activeButton.parentElement;
    if (nav && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({
        left: Math.max(0, activeButton.offsetLeft - (nav.clientWidth - activeButton.offsetWidth) / 2),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    }
  }

  function buildShell(root) {
    shellIndex += 1;
    var title = root.getAttribute("data-canvas-title") || "Operations App";
    var subtitle = root.getAttribute("data-canvas-subtitle") || "Synthetic demonstration";
    var initials = root.getAttribute("data-canvas-initials") || title.split(/\s+/).slice(0, 2).map(function (word) { return word.charAt(0); }).join("");
    var user = root.getAttribute("data-canvas-user") || "OP";
    var commands = root.getAttribute("data-canvas-commands") || "Home,Refresh";
    var nav = root.getAttribute("data-canvas-nav") || "";
    var navPosition = root.getAttribute("data-canvas-nav-position") || "bottom";
    var actionMap = {};
    (root.getAttribute("data-canvas-actions") || "").split(";").forEach(function (pair) {
      var splitAt = pair.indexOf("=");
      if (splitAt > 0) actionMap[pair.slice(0, splitAt).trim()] = pair.slice(splitAt + 1).trim();
    });

    var bar = document.createElement("header");
    bar.className = "canvas-app-bar";
    bar.innerHTML = '<span class="canvas-app-tile" aria-hidden="true"></span><span class="canvas-app-identity"><strong></strong><small></small></span><span class="canvas-app-environment">Synthetic demo</span><button class="canvas-icon-button" type="button" data-canvas-help aria-label="About this simulation">?</button><span class="canvas-user" aria-label="Demo user"></span>';
    bar.querySelector(".canvas-app-tile").textContent = initials;
    bar.querySelector(".canvas-app-identity strong").textContent = title;
    bar.querySelector(".canvas-app-identity small").textContent = subtitle;
    bar.querySelector(".canvas-user").textContent = user;

    var commandBar = document.createElement("div");
    commandBar.className = "canvas-command-bar";
    commands.split(",").map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (command, index) {
      if (index) { var divider = document.createElement("span"); divider.className = "canvas-command-divider"; divider.setAttribute("aria-hidden", "true"); commandBar.appendChild(divider); }
      commandBar.appendChild(makeButton(command === "Refresh" ? "↻  Refresh" : "⌂  " + command, command.toLowerCase()));
    });
    var context = document.createElement("span");
    context.className = "canvas-command-context";
    context.textContent = "Browser-only session · not connected";
    commandBar.appendChild(context);

    var statusBar = root.querySelector(":scope > .device-status");
    if (statusBar) {
      statusBar.after(bar);
      bar.after(commandBar);
    } else {
      root.prepend(commandBar);
      root.prepend(bar);
    }

    if (nav) {
      var navBar = document.createElement("nav");
      navBar.className = "canvas-bottom-nav" + (navPosition === "top" ? " canvas-top-nav" : "");
      navBar.setAttribute("aria-label", title + " navigation");
      var items = nav.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
      items.forEach(function (item, index) {
        var action = item.toLowerCase().replace(/\s+/g, "-");
        var symbol = index === 0 ? "⌂" : index === items.length - 1 ? "≡" : "✓";
        var button = makeButton(item, action, symbol);
        if (index === 0) button.setAttribute("aria-current", "page");
        navBar.appendChild(button);
      });
      if (navPosition === "top") commandBar.after(navBar);
      else root.appendChild(navBar);
    }

    var toastRegion = document.createElement("div");
    toastRegion.className = "canvas-toast-region";
    toastRegion.setAttribute("data-canvas-toast-region", "");
    toastRegion.setAttribute("role", "status");
    toastRegion.setAttribute("aria-live", "polite");
    toastRegion.innerHTML = '<div class="canvas-toast"><p></p></div>';
    root.appendChild(toastRegion);

    var busyLayer = document.createElement("div");
    busyLayer.className = "canvas-busy";
    busyLayer.setAttribute("data-canvas-busy", "");
    busyLayer.hidden = true;
    busyLayer.innerHTML = '<div class="canvas-busy-card" role="status"><span class="canvas-spinner" aria-hidden="true"></span><strong>Updating the demo record…</strong><small>Simulated processing only</small></div>';
    root.appendChild(busyLayer);

    var dialogLayer = document.createElement("div");
    dialogLayer.className = "canvas-dialog-layer";
    dialogLayer.setAttribute("data-canvas-dialog-layer", "");
    dialogLayer.hidden = true;
    var dialogTitleId = "canvas-dialog-title-" + shellIndex;
    dialogLayer.innerHTML = '<section class="canvas-dialog" role="dialog" aria-modal="true" aria-labelledby="' + dialogTitleId + '"><div class="canvas-dialog-copy"><span>Review action</span><h3 id="' + dialogTitleId + '">Confirm action</h3><p></p></div><div class="canvas-dialog-actions"><button type="button" data-canvas-cancel>Cancel</button><button class="canvas-confirm" type="button" data-canvas-confirm>Continue</button></div></section>';
    root.appendChild(dialogLayer);

    root.addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-canvas-action]");
      if (!actionButton || !root.contains(actionButton)) return;
      var action = actionButton.getAttribute("data-canvas-action");
      root.dispatchEvent(new CustomEvent("canvas:navigate", { detail: { action: action } }));
      if (actionMap[action]) {
        var target = document.querySelector(actionMap[action]);
        if (target) {
          if (target.matches("button, [role='button']")) target.click();
          else target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          setActive(root, action);
        }
      } else if (action === "refresh") {
        notify(root, "View refreshed from the current synthetic session state.", "success");
      }
    });
    bar.querySelector("[data-canvas-help]").addEventListener("click", function () {
      notify(root, "Canvas-style interaction simulation. All records are synthetic and nothing is saved.", "info");
    });
  }

  document.querySelectorAll("[data-canvas-app]").forEach(buildShell);
  document.documentElement.classList.add("canvas-enhanced");

  window.CanvasSim = {
    busy: busy,
    confirm: confirmAction,
    notify: notify,
    setActive: setActive
  };
})();
