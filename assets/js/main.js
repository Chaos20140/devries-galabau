/* =====================================================================
   de Vries Galabau — main.js
   Vanilla Motion-/Interaktions-Engine (eine IIFE). Alles guarded.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none)").matches;

  /* ---- E-Mail-Empfänger / optionaler Endpoint -------------------- */
  var MAIL_TO = "info@devries-galabau.de";
  var SUBMIT_ENDPOINT = null; // z.B. "https://formspree.io/f/XXXX" — dann POST statt mailto

  /* ---- Active nav link ------------------------------------------- */
  (function activeNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    $$(".nav__links a, .mnav__link").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href && href === path) a.setAttribute("aria-current", "page");
    });
  })();

  /* ---- Lenis smooth scroll --------------------------------------- */
  var lenis = null;
  var hasGsap = window.gsap && window.ScrollTrigger;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduce && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, smoothTouch: false });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var el = $(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); }
      });
    });
  }

  /* ---- reveal-words splitter (DOM-based, XSS-safe, a11y) --------- */
  $$(".reveal-words").forEach(function (el) {
    if (el.dataset.split) return;
    if (el.children.length > 0) { el.classList.add("is-in"); return; } // preserve inner markup (<em>)
    el.dataset.split = "1";
    var full = el.textContent.trim();
    el.setAttribute("aria-label", full);
    var words = full.split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var outer = document.createElement("span");
      outer.className = "word"; outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.style.setProperty("--wi", i);
      inner.textContent = w; // safe: text node, no HTML parsing
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- IntersectionObserver reveals ------------------------------ */
  var revealTargets = $$("[data-reveal],[data-stagger],.reveal-words,.plan__svg,.tnode,.hero__inner,.clip-reveal,.img-reveal,.story-band__line");
  if ("IntersectionObserver" in window && !reduce) {
    // stagger indices
    $$("[data-stagger]").forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--i", i); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach(function (t) { io.observe(t); });
  } else {
    revealTargets.forEach(function (t) { t.classList.add("is-in"); });
  }

  /* ---- Line-draw: set SVG path lengths --------------------------- */
  $$(".plan__svg .draw").forEach(function (p) {
    try { p.style.setProperty("--len", Math.ceil(p.getTotalLength())); } catch (e) {}
  });
  $$(".hero__sweep line").forEach(function (l) {
    try { l.style.setProperty("--sl", Math.ceil(l.getTotalLength())); } catch (e) {}
  });
  $$(".story-band__line line").forEach(function (l) {
    try { l.style.setProperty("--sl2", Math.ceil(l.getTotalLength())); } catch (e) {}
  });

  /* ---- Counters -------------------------------------------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    if (reduce) { el.textContent = target.toLocaleString("de-DE"); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("de-DE");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { cio.observe(el); });
  } else {
    $$("[data-count]").forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* ---- Magnetic buttons ------------------------------------------ */
  if (!isTouch && !reduce) {
    $$("[data-magnetic]").forEach(function (el) {
      var str = parseFloat(el.getAttribute("data-magnetic")) || 0.25;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * str;
        var y = (e.clientY - r.top - r.height / 2) * str;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- Batched scroll rAF --------------------------------------- */
  var nav = $("#nav"), prog = $("#scrollProg"), sticky = $("#stickyCta");
  var parallaxEls = $$("[data-parallax]");
  var timelines = $$(".timeline");
  var ticking = false;
  function applyScroll() {
    ticking = false;
    var y = window.pageYOffset, h = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    if (nav) nav.classList.toggle("is-scrolled", y > 24);
    if (sticky) sticky.classList.toggle("is-shown", y > 620);
    if (!reduce) {
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var r = el.getBoundingClientRect();
        var off = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
    }
    timelines.forEach(function (tl) {
      var r = tl.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.7 - r.top) / (r.height * 0.85);
      tl.style.setProperty("--tl", Math.max(0, Math.min(1, p)));
      var prg = $(".timeline__prog", tl);
      if (prg) prg.style.height = "calc(" + Math.max(0, Math.min(1, p)) + " * (100% - 16px))";
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  applyScroll();

  /* ---- Mobile nav ------------------------------------------------ */
  var burger = $("#navBurger"), mnav = $("#mobileNav"), mclose = $("#mobileClose");
  function openNav() {
    mnav.classList.add("is-open"); document.body.style.overflow = "hidden";
    burger.setAttribute("aria-expanded", "true"); if (lenis) lenis.stop();
    var f = $(".mnav__link", mnav); if (f) f.focus();
  }
  function closeNav() {
    mnav.classList.remove("is-open"); document.body.style.overflow = "";
    burger.setAttribute("aria-expanded", "false"); if (lenis) lenis.start();
  }
  if (burger && mnav) {
    burger.setAttribute("aria-expanded", "false");
    burger.addEventListener("click", openNav);
    if (mclose) mclose.addEventListener("click", closeNav);
    $$("a[href]", mnav).forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mnav.classList.contains("is-open")) closeNav();
    });
  }

  /* ---- Cookie banner --------------------------------------------- */
  var cookie = $("#cookie");
  if (cookie) {
    if (!localStorage.getItem("dvg-cookie-ok")) {
      setTimeout(function () { cookie.classList.add("is-shown"); }, 1400);
    }
    $$("[data-cookie-accept]", cookie).forEach(function (b) {
      b.addEventListener("click", function () {
        localStorage.setItem("dvg-cookie-ok", "1"); cookie.classList.remove("is-shown");
      });
    });
  }

  /* ---- Map consent ----------------------------------------------- */
  var mapConsent = $("#mapConsent");
  if (mapConsent) {
    mapConsent.addEventListener("click", function () {
      var wrap = mapConsent.parentNode;
      var src = mapConsent.getAttribute("data-map");
      var f = document.createElement("iframe");
      f.src = src; f.loading = "lazy"; f.title = "Karte Salzhemmendorf";
      f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      wrap.appendChild(f); mapConsent.remove();
    });
  }

  /* ---- Helpers: validation --------------------------------------- */
  function setErr(field, msg) {
    field.classList.add("invalid");
    var e = $(".field__err", field); if (e) e.textContent = msg;
  }
  function clearErr(field) { field.classList.remove("invalid"); }
  function validField(field) {
    var input = $("input,textarea,select", field);
    if (!input) return true;
    var v = (input.value || "").trim();
    if (input.hasAttribute("required") && !v) { setErr(field, "Bitte ausfüllen."); return false; }
    if (input.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr(field, "Bitte gültige E-Mail eingeben."); return false; }
    if (input.type === "tel" && v && !/^[0-9()#&+*\-=.\s/]{5,}$/.test(v)) { setErr(field, "Bitte gültige Telefonnummer eingeben."); return false; }
    clearErr(field); return true;
  }
  function buildMailto(subject, lines) {
    var body = lines.join("\n");
    return "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  /* ---- Contact form ---------------------------------------------- */
  var cform = $("#contactForm");
  if (cform) {
    cform.setAttribute("novalidate", "");
    cform.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$(".field", cform).forEach(function (f) { if (!validField(f)) ok = false; });
      var consent = $("#c-consent");
      var status = $(".form__status", cform);
      if (consent && !consent.checked) { ok = false; if (status) { status.className = "form__status err"; status.textContent = "Bitte stimmen Sie der Datenschutzerklärung zu."; } }
      if (!ok) return;
      var g = function (n) { var el = cform.elements[n]; return el ? el.value.trim() : ""; };
      var subject = "Kontaktanfrage: " + (g("subject") || "Website");
      var mailto = buildMailto(subject, [
        "Name: " + g("name"), "E-Mail: " + g("email"), "Betreff: " + g("subject"),
        "", "Nachricht:", g("message"), "", "— gesendet über devries-galabau.de"
      ]);
      if (status) { status.className = "form__status ok"; status.textContent = "Danke! Ihr E-Mail-Programm öffnet sich mit Ihrer Nachricht. Alternativ erreichen Sie uns unter " + MAIL_TO + "."; }
      window.location.href = mailto;
    });
    $$(".field input,.field textarea", cform).forEach(function (i) {
      i.addEventListener("blur", function () { validField(i.closest(".field")); });
    });
  }

  /* ---- Anfrage multi-step form ----------------------------------- */
  var aform = $("#anfrageForm");
  if (aform) {
    aform.setAttribute("novalidate", "");
    var steps = $$(".step", aform);
    var fill = $(".steps__fill", aform);
    var count = $(".steps__count", aform);
    var cur = 0;
    function showStep(i) {
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      if (fill) fill.style.width = ((i + 1) / steps.length * 100) + "%";
      if (count) count.textContent = "Schritt " + (i + 1) + " / " + steps.length;
      cur = i;
      var focusable = steps[i].querySelector("input,textarea,select,button");
      if (focusable && i > 0) setTimeout(function () { focusable.focus(); }, 60);
    }
    function validateStep(i) {
      var s = steps[i], ok = true;
      var radios = $$('input[type="radio"]', s);
      if (radios.length) {
        var names = {}; radios.forEach(function (r) { names[r.name] = names[r.name] || false; if (r.checked) names[r.name] = true; });
        Object.keys(names).forEach(function (n) { if (!names[n]) ok = false; });
        var re = $(".step__err", s); if (re) re.style.display = ok ? "none" : "block";
      }
      $$(".field", s).forEach(function (f) { if (!validField(f)) ok = false; });
      return ok;
    }
    aform.addEventListener("click", function (e) {
      var next = e.target.closest("[data-next]"), prev = e.target.closest("[data-prev]");
      if (next) { e.preventDefault(); if (validateStep(cur) && cur < steps.length - 1) showStep(cur + 1); }
      if (prev) { e.preventDefault(); if (cur > 0) showStep(cur - 1); }
    });
    aform.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateStep(cur)) return;
      var val = function (n) { var el = aform.elements[n]; if (!el) return ""; if (el.length && el[0] && el[0].type === "radio") { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ""; } return (el.value || "").trim(); };
      var mailto = buildMailto("Kostenlose Anfrage — " + (val("bereich") || "Gartenprojekt"), [
        "Art: " + val("art"), "Bereich: " + val("bereich"),
        "", "Beschreibung:", val("beschreibung"),
        "", "Zeitraum: " + val("zeitraum"),
        "", "Name: " + val("name"), "E-Mail: " + val("email"),
        "Telefon: " + val("telefon"), "Erreichbar: " + val("erreichbar"),
        "", "— gesendet über devries-galabau.de"
      ]);
      window.location.href = mailto;
      setTimeout(function () { window.location.href = "danke.html"; }, 400);
    });
    showStep(0);
  }

  /* ---- Leistungen: Hover-Reveal-Index ---------------------------- */
  var svcIndex = $(".svc-index");
  if (svcIndex) {
    var svcBgs = $$(".svc-index__bg", svcIndex);
    var svcRows = $$(".svc-row", svcIndex);
    var svcList = $("#svcList");
    var svcLit = function (idx) {
      svcIndex.classList.add("is-lit");
      svcBgs.forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-bg") === String(idx)); });
    };
    var svcUnlit = function () { svcIndex.classList.remove("is-lit"); svcBgs.forEach(function (b) { b.classList.remove("is-active"); }); };
    svcRows.forEach(function (r) {
      r.addEventListener("mouseenter", function () { svcLit(r.getAttribute("data-bg")); });
      r.addEventListener("focus", function () { svcLit(r.getAttribute("data-bg")); });
    });
    if (svcList) svcList.addEventListener("mouseleave", svcUnlit);
    svcRows.forEach(function (r) { r.addEventListener("blur", svcUnlit); });
  }

  /* ---- GSAP scroll: gepinnter Clip-Reveal + Filmstreifen --------- */
  if (hasGsap && !reduce) {
    var pinPhoto = $("#pinPhoto");
    if (pinPhoto) {
      gsap.fromTo(pinPhoto, { clipPath: "inset(44% 44% 44% 44%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", ease: "none",
        scrollTrigger: { trigger: ".reveal-pin", start: "top top", end: "bottom bottom", scrub: 0.5 }
      });
    }
    var film = $(".filmstrip"), filmTrack = $("#filmTrack"), filmVp = $("#filmViewport");
    if (film && filmTrack && filmVp && window.matchMedia("(min-width: 861px)").matches) {
      filmVp.style.overflow = "hidden";
      var filmDist = function () { return Math.max(0, filmTrack.scrollWidth - filmVp.clientWidth); };
      gsap.to(filmTrack, {
        x: function () { return -filmDist(); }, ease: "none",
        scrollTrigger: {
          trigger: film, start: "top top", end: function () { return "+=" + filmDist(); },
          pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
    }
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  } else {
    var ppFallback = $("#pinPhoto"); if (ppFallback) ppFallback.style.clipPath = "none";
  }

  /* ---- Referenzen filter ----------------------------------------- */
  var filterbar = $("#filterbar");
  if (filterbar) {
    var items = $$(".gitem");
    filterbar.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      $$(".chip", filterbar).forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", "true");
      var cat = chip.getAttribute("data-filter");
      items.forEach(function (it) {
        var show = cat === "all" || (it.getAttribute("data-cat") || "").split(" ").indexOf(cat) > -1;
        it.classList.toggle("is-hidden", !show);
      });
    });
  }

  /* ---- Lightbox -------------------------------------------------- */
  var lb = $("#lightbox");
  if (lb) {
    var lbImg = $(".lightbox__img", lb), lbCap = $(".lightbox__cap", lb);
    var gitems = $$(".gitem[data-full]"), idx = 0, lastFocus = null;
    function openLb(i) {
      idx = i; lastFocus = document.activeElement;
      var it = gitems[i];
      lbImg.src = it.getAttribute("data-full");
      lbImg.alt = it.getAttribute("data-alt") || "";
      if (lbCap) lbCap.textContent = it.getAttribute("data-alt") || "";
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden"; if (lenis) lenis.stop();
      $(".lightbox__close", lb).focus();
    }
    function closeLb() {
      lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = ""; if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus();
    }
    function step(d) {
      var vis = gitems.filter(function (g) { return !g.classList.contains("is-hidden"); });
      var here = vis.indexOf(gitems[idx]);
      var nx = vis[(here + d + vis.length) % vis.length];
      openLb(gitems.indexOf(nx));
    }
    gitems.forEach(function (it, i) {
      it.addEventListener("click", function () { openLb(i); });
      it.setAttribute("role", "button"); it.setAttribute("tabindex", "0");
      it.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(i); } });
    });
    $(".lightbox__close", lb).addEventListener("click", closeLb);
    var pv = $(".lightbox__prev", lb), nx = $(".lightbox__next", lb);
    if (pv) pv.addEventListener("click", function () { step(-1); });
    if (nx) nx.addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ---- Custom cursor (Desktop, Plot-Marker) ---------------------- */
  if (!isTouch && !reduce && window.matchMedia("(pointer: fine)").matches) {
    var cur = document.createElement("div"); cur.className = "cursor";
    var ring = document.createElement("div"); ring.className = "cursor__ring"; cur.appendChild(ring);
    var dot = document.createElement("div"); dot.className = "cursor__dot";
    document.body.appendChild(cur); document.body.appendChild(dot);
    document.body.classList.add("has-cursor");
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2, dx = cx, dy = cy;
    document.addEventListener("mousemove", function (e) { cx = e.clientX; cy = e.clientY; dot.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)"; });
    (function loop() { dx += (cx - dx) * 0.18; dy += (cy - dy) * 0.18; cur.style.transform = "translate(" + dx + "px," + dy + "px) translate(-50%,-50%)"; requestAnimationFrame(loop); })();
    var hoverSel = "a,button,.gitem,[data-magnetic],input,textarea,select,label,.chip";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hoverSel)) cur.classList.add("is-hover"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest(hoverSel)) cur.classList.remove("is-hover"); });
    document.addEventListener("mouseleave", function () { cur.style.opacity = "0"; dot.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { cur.style.opacity = "1"; dot.style.opacity = "1"; });
  }

  /* ---- Loader / Intro (nur wenn #loader vorhanden) --------------- */
  var loader = $("#loader");
  if (loader) {
    if (reduce) { loader.classList.add("is-done"); setTimeout(function () { loader.remove(); }, 50); }
    else {
      var mark = $(".loader__mark path", loader);
      if (mark) { try { mark.style.setProperty("--l", Math.ceil(mark.getTotalLength())); } catch (e) {} }
      document.body.style.overflow = "hidden"; if (lenis) lenis.stop();
      window.addEventListener("load", function () {
        setTimeout(function () {
          loader.classList.add("is-done");
          document.body.style.overflow = ""; if (lenis) lenis.start();
          setTimeout(function () { if (loader.parentNode) loader.remove(); }, 1400);
        }, 1500);
      });
      // Fallback falls 'load' schon feuerte
      setTimeout(function () { if (!loader.classList.contains("is-done")) { loader.classList.add("is-done"); document.body.style.overflow = ""; if (lenis) lenis.start(); setTimeout(function () { if (loader.parentNode) loader.remove(); }, 1400); } }, 3200);
    }
  }

  /* ---- Seiten-Übergangs-Vorhang (interne Navigation) ------------- */
  if (!reduce) {
    var curtain = document.createElement("div"); curtain.className = "curtain";
    document.body.appendChild(curtain);
    window.addEventListener("pageshow", function (e) { if (e.persisted) curtain.className = "curtain"; });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a) return;
      var href = a.getAttribute("href") || "";
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (!/\.html($|[?#])/.test(href) && href !== "index.html") return;
      if (/^https?:|^mailto:|^tel:|^#/.test(href)) return;
      if (a.origin && a.origin !== location.origin) return;
      e.preventDefault();
      curtain.classList.add("is-in");
      setTimeout(function () { window.location.href = href; }, 480);
    });
  }

  /* ---- Year in footer -------------------------------------------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
