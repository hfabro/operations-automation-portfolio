(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  var header = document.querySelector("[data-header]");
  var nav = document.querySelector("[data-nav]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var backToTop = document.querySelector("[data-back-to-top]");
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var storedTheme = null;

  try { storedTheme = window.localStorage.getItem("portfolio-theme"); } catch (error) { storedTheme = null; }
  var preferredTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  var activeTheme = storedTheme || preferredTheme;
  root.dataset.theme = activeTheme;

  function syncThemeControl() {
    if (!toggle) return;
    var isDark = root.dataset.theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    if (themeColor) themeColor.setAttribute("content", isDark ? "#101714" : "#eef2ed");
  }

  if (toggle) {
    syncThemeControl();
    toggle.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { window.localStorage.setItem("portfolio-theme", root.dataset.theme); } catch (error) { /* Preference remains session-only. */ }
      syncThemeControl();
    });
  }

  function syncHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 680);
  }
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  function closeNavigation() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var willOpen = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", willOpen);
      navToggle.setAttribute("aria-expanded", String(willOpen));
      document.body.classList.toggle("nav-open", willOpen);
    });
    nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeNavigation); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeNavigation(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) closeNavigation(); });
  }

  document.querySelectorAll("details.project-card").forEach(function (card) {
    card.addEventListener("toggle", function () {
      if (!card.open) return;
      document.querySelectorAll("details.project-card[open]").forEach(function (otherCard) {
        if (otherCard !== card) otherCard.open = false;
      });
    });
  });

  function openProjectTarget(target) {
    if (target && target.tagName === "DETAILS" && target.classList.contains("project-card")) target.open = true;
  }

  function openProjectFromHash() {
    if (!window.location.hash) return;
    var id = decodeURIComponent(window.location.hash.slice(1));
    openProjectTarget(document.getElementById(id));
  }

  document.querySelectorAll('.project-directory a[href^="#"], .proof-link[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function () {
      openProjectTarget(document.getElementById(link.getAttribute("href").slice(1)));
    });
  });
  window.addEventListener("hashchange", openProjectFromHash);
  openProjectFromHash();

  function isPlaceholder(value) {
    return !value || /YOUR_|example\.com|YOUR_PROFILE|YOUR_LOCATION/i.test(value);
  }

  var config = window.PORTFOLIO_CONFIG || {};
  var contact = config.contact || {};
  var contactMap = {
    email: { value: contact.email, href: contact.email ? "mailto:" + contact.email : "" },
    linkedin: { value: contact.linkedInUrl, href: contact.linkedInUrl || "" }
  };
  var hasPlaceholder = false;
  var placeholderLabels = [];

  Object.keys(contactMap).forEach(function (key) {
    var definition = contactMap[key];
    var link = document.querySelector('[data-contact-link="' + key + '"]');
    if (!link) return;
    if (isPlaceholder(definition.value)) {
      hasPlaceholder = true;
      placeholderLabels.push(key === "linkedin" ? "LinkedIn" : "Email");
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      link.classList.add("is-placeholder");
    } else {
      link.setAttribute("href", definition.href);
      if (key !== "email") {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noreferrer");
      }
      if (key === "email") {
        var emailValue = document.querySelector('[data-contact-value="email"]');
        if (emailValue) emailValue.textContent = definition.value;
      }
    }
  });

  var contactNote = document.querySelector("[data-contact-note]");
  if (contactNote) {
    if (!isPlaceholder(contact.location)) {
      var placeholderNote = placeholderLabels.length
        ? " · " + placeholderLabels.join(" and ") + (placeholderLabels.length === 1 ? " link remains" : " links remain") + " configurable."
        : "";
      contactNote.textContent = contact.location + placeholderNote;
    } else if (!hasPlaceholder) {
      contactNote.hidden = true;
    }
  }

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealTargets = document.querySelectorAll(".section-heading, .portfolio-map, .showcase-framing, .demo-proof-index, .project-directory, .feature-card, .case-detail, .project-card, .sf-hero-panel, .transformation-flow, .strategy-grid, .solutions-grid > article, .capability-grid > article, .metrics-grid > article");
  if (!reducedMotion && "IntersectionObserver" in window) {
    root.classList.add("reveal-ready");
    revealTargets.forEach(function (target) { target.setAttribute("data-reveal", ""); });
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    revealTargets.forEach(function (target) { revealObserver.observe(target); });
  }

  var navSectionLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')).map(function (link) {
    return { link: link, section: document.querySelector(link.getAttribute("href")) };
  }).filter(function (item) { return item.section; }) : [];
  var activeNavFrame = null;
  function syncActiveNavigation() {
    activeNavFrame = null;
    if (!navSectionLinks.length) return;
    var current = null;
    navSectionLinks.forEach(function (item) {
      if (item.section.getBoundingClientRect().top <= 150) current = item;
    });
    navSectionLinks.forEach(function (item) {
      if (item === current) item.link.setAttribute("aria-current", "true");
      else item.link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () {
    if (activeNavFrame) return;
    activeNavFrame = window.requestAnimationFrame(syncActiveNavigation);
  }, { passive: true });
  syncActiveNavigation();

  document.querySelectorAll("[data-current-year]").forEach(function (node) { node.textContent = String(new Date().getFullYear()); });
})();
