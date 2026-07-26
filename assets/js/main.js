/* =====================================================================
   de Vries Galabau — main.js  ·  v7 „Schicht für Schicht"
   Vanilla Motion-/Interaktions-Engine (eine IIFE). Alles guarded.

   Aufbau:
     1  Grundlagen & Sicherheitsnetz      8  Kontextcursor
     2  Aktiver Navigationslink           9  Formulare
     3  Lenis Smooth-Scroll              10  Leistungs-Scrollytelling
     4  Reveals (IntersectionObserver)   11  Signatur „Plan wird Garten" (GSAP)
     5  Scroll-Schleife (rAF, Parallax)  12  Filmstreifen (GSAP + nativ)
     6  Mobile-Navigation (Dialog)       13  Referenzen: Filter + Lightbox
     7  Kleinteile (Cookie, Karte, …)    14  Seitenübergang / Prefetch

   Regeln:
     - Nur transform/opacity/clip-path animieren.
     - Im Scroll-Frame ERST alle Layouts lesen, DANN alle schreiben.
     - Jede Bewegung achtet prefers-reduced-motion.
     - GSAP nur für die beiden Signatur-Momente, sonst IO + CSS.
   ===================================================================== */
(function () {
  "use strict";

  /* ── 1 · Grundlagen ─────────────────────────────────────────────── */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = mqReduce.matches;
  var isTouch = window.matchMedia("(hover: none)").matches;
  var isFinePointer = window.matchMedia("(pointer: fine)").matches;
  var isNarrow = window.matchMedia("(max-width: 860px)").matches;
  var root = document.documentElement;

  /* Sicherheitsnetz: Das Inline-Head-Script setzt html.js und blendet damit
     alle [data-reveal] aus. Kommt main.js so weit, sind wir handlungsfähig —
     das im Head gesetzte Not-Timeout darf wieder abgeräumt werden. */
  if (window.__dvgFailsafe) { clearTimeout(window.__dvgFailsafe); window.__dvgFailsafe = null; }
  root.classList.remove("motion-failed");

  var MAIL_TO = "info@devries-galabau.de";
  var SUBMIT_ENDPOINT = null; // z.B. "https://formspree.io/f/XXXX" — dann POST statt mailto

  /* ── 2 · Aktiver Navigationslink ────────────────────────────────── */
  (function activeNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    $$(".nav__links a, .mnav__link").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href && href === path) a.setAttribute("aria-current", "page");
    });
  })();

  /* ── 3 · Lenis Smooth-Scroll (einziges Smooth-Scroll-System) ────── */
  var lenis = null;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  if (!reduce && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, smoothTouch: false });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var lraf = function (t) { lenis.raf(t); requestAnimationFrame(lraf); };
      requestAnimationFrame(lraf);
    }
  }
  /* Ankerlinks: mit Lenis weich, sonst nativ — in beiden Fällen mit
     Versatz für die klebende Navigation. */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var el = $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -80 });
      else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: reduce ? "auto" : "smooth" });
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    });
  });

  /* ── 4 · Reveals ────────────────────────────────────────────────── */

  /* Wort-Splitter für maskierte Headline-Reveals (DOM-basiert, XSS-sicher). */
  $$(".reveal-words").forEach(function (el) {
    if (el.dataset.split) return;
    if (el.children.length > 0) { el.classList.add("is-in"); return; } // inneres Markup (<em>) erhalten
    el.dataset.split = "1";
    var full = el.textContent.trim();
    el.textContent = "";

    /* Der Originaltext bleibt als visuell verborgener Knoten erhalten und
       traegt den zugaenglichen Namen. Frueher stand hier aria-label direkt
       auf dem <span> — das ist ohne gueltige Rolle laut ARIA unzulaessig
       (axe: aria-prohibited-attr) und wurde von Screenreadern ignoriert. */
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = full;
    el.appendChild(sr);

    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    full.split(/\s+/).forEach(function (w, i) {
      var outer = document.createElement("span");
      outer.className = "word";
      var inner = document.createElement("span");
      inner.style.setProperty("--wi", i);
      inner.textContent = w;
      outer.appendChild(inner);
      vis.appendChild(outer);
      vis.appendChild(document.createTextNode(" "));
    });
    el.appendChild(vis);
  });

  var REVEAL_SEL = "[data-reveal],[data-stagger],.reveal-words,.tnode,.clip-reveal,.img-reveal";
  var revealTargets = $$(REVEAL_SEL);

  if ("IntersectionObserver" in window && !reduce) {
    $$("[data-stagger]").forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--i", i); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach(function (t) { io.observe(t); });
  } else {
    revealTargets.forEach(function (t) { t.classList.add("is-in"); });
  }

  /* Marquee außerhalb des Viewports anhalten (Dauerläufer kostet sonst
     dauerhaft Frames, auch ungesehen). */
  if ("IntersectionObserver" in window) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-paused", !en.isIntersecting); });
    }, { threshold: 0 });
    $$(".marquee").forEach(function (m) { mio.observe(m); });
  }

  /* ── 5 · Scroll-Schleife ────────────────────────────────────────────
     Ein einziger rAF-Frame für alles. Wichtig: erst sämtliche Layout-
     Werte LESEN, danach erst SCHREIBEN — sonst erzwingt jeder Schreib-
     vorgang ein neues Layout für das nächste Lesen (Layout-Thrashing). */
  var nav = $("#nav"), prog = $("#scrollProg"), sticky = $("#stickyCta");
  var layerEls = $$("[data-layer]");
  var ticking = false;
  var vh = window.innerHeight;

  function applyScroll() {
    ticking = false;
    var y = window.pageYOffset;
    var docH = document.documentElement.scrollHeight - vh;

    /* --- Lesephase --- */
    var reads = null;
    if (!reduce && layerEls.length) {
      reads = layerEls.map(function (el) {
        var r = el.getBoundingClientRect();
        return (r.top + r.height / 2 - vh / 2) / vh; // -1 … +1 über den Viewport
      });
    }

    /* --- Schreibphase --- */
    if (prog) prog.style.transform = "scaleX(" + (docH > 0 ? y / docH : 0) + ")";
    if (nav) nav.classList.toggle("is-scrolled", y > 24);
    if (sticky) sticky.classList.toggle("is-shown", y > vh * 0.7);
    if (reads) {
      for (var i = 0; i < layerEls.length; i++) {
        var el = layerEls[i];
        var dist = parseFloat(getComputedStyle(el).getPropertyValue("--plx")) || 0;
        el.style.setProperty("--py", (-reads[i] * dist).toFixed(2) + "px");
      }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; onScroll(); }, { passive: true });
  applyScroll();

  /* ── 6 · Mobile-Navigation als echter Dialog ────────────────────── */
  var burger = $("#navBurger"), mnav = $("#mobileNav"), mclose = $("#mobileClose");

  /* Gemeinsamer Fokus-Trap für Mobile-Nav und Lightbox. */
  function focusTrap(container) {
    var SEL = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function onKey(e) {
      if (e.key !== "Tab") return;
      var items = $$(SEL, container).filter(function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return {
      on: function () { document.addEventListener("keydown", onKey, true); },
      off: function () { document.removeEventListener("keydown", onKey, true); }
    };
  }

  /* Hintergrund für assistive Technik ausblenden, solange ein Overlay offen ist. */
  var BG_SEL = ".topbar, .nav, main, .footer, .sticky-cta, .cookie";
  function setBackgroundInert(on, except) {
    $$(BG_SEL).forEach(function (el) {
      if (except && (el === except || el.contains(except))) return;
      if (on) { el.setAttribute("aria-hidden", "true"); el.setAttribute("inert", ""); }
      else { el.removeAttribute("aria-hidden"); el.removeAttribute("inert"); }
    });
  }

  if (burger && mnav) {
    var mTrap = focusTrap(mnav);
    var lastNavFocus = null;

    mnav.setAttribute("role", "dialog");
    mnav.setAttribute("aria-modal", "true");
    mnav.setAttribute("aria-label", "Hauptmenü");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "mobileNav");

    var openNav = function () {
      lastNavFocus = document.activeElement;
      mnav.classList.add("is-open");
      document.body.style.overflow = "hidden";
      burger.setAttribute("aria-expanded", "true");
      if (lenis) lenis.stop();
      setBackgroundInert(true, mnav);
      mTrap.on();
      var f = mclose || $(".mnav__link", mnav);
      if (f) f.focus();
    };
    var closeNav = function () {
      if (!mnav.classList.contains("is-open")) return;
      mnav.classList.remove("is-open");
      document.body.style.overflow = "";
      burger.setAttribute("aria-expanded", "false");
      if (lenis) lenis.start();
      setBackgroundInert(false);
      mTrap.off();
      if (lastNavFocus) lastNavFocus.focus();
    };

    burger.addEventListener("click", openNav);
    if (mclose) mclose.addEventListener("click", closeNav);
    $$("a[href]", mnav).forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ── 7 · Kleinteile ─────────────────────────────────────────────── */

  /* Magnetische Buttons — nur Desktop, rAF-gedrosselt, und ohne fremde
     Transforms zu überschreiben (wir schreiben nur --mx/--my). */
  if (!isTouch && !reduce && isFinePointer) {
    $$("[data-magnetic]").forEach(function (el) {
      var str = parseFloat(el.getAttribute("data-magnetic")) || 0.25;
      var pending = false, mx = 0, my = 0;
      var write = function () { pending = false; el.style.setProperty("--mx", mx.toFixed(1) + "px"); el.style.setProperty("--my", my.toFixed(1) + "px"); };
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        mx = (e.clientX - r.left - r.width / 2) * str;
        my = (e.clientY - r.top - r.height / 2) * str;
        if (!pending) { pending = true; requestAnimationFrame(write); }
      });
      el.addEventListener("mouseleave", function () { mx = 0; my = 0; if (!pending) { pending = true; requestAnimationFrame(write); } });
    });
  }

  /* Cookie-Hinweis (rein informativ — kein Dialog, keine Einwilligungsabfrage). */
  var cookie = $("#cookie");
  if (cookie) {
    if (!localStorage.getItem("dvg-cookie-ok")) {
      setTimeout(function () { cookie.classList.add("is-shown"); }, 1200);
    }
    $$("[data-cookie-accept]", cookie).forEach(function (b) {
      b.addEventListener("click", function () {
        localStorage.setItem("dvg-cookie-ok", "1");
        cookie.classList.remove("is-shown");
      });
    });
  }

  /* Karte erst nach ausdrücklicher Zustimmung laden (DSGVO). */
  var mapConsent = $("#mapConsent");
  if (mapConsent) {
    mapConsent.addEventListener("click", function () {
      var wrap = mapConsent.parentNode;
      var f = document.createElement("iframe");
      f.src = mapConsent.getAttribute("data-map");
      f.loading = "lazy";
      f.title = "Karte Salzhemmendorf";
      f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      wrap.appendChild(f);
      mapConsent.remove();
    });
  }

  /* Zähler — nur belegte Zahlen. */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    if (reduce) { el.textContent = target.toLocaleString("de-DE"); return; }
    var start = null, dur = 1200;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("de-DE");
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { cio.observe(el); });
  } else {
    $$("[data-count]").forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* Jahreszahl im Footer. */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ── 8 · Kontextcursor ──────────────────────────────────────────────
     Kein globaler Ersatzcursor: der Systemcursor bleibt überall sichtbar.
     Nur über Medienflächen mit [data-cursor] tritt ein beschriftetes
     Plättchen hinzu, das sagt, was ein Klick bewirkt. */
  if (!isTouch && !reduce && isFinePointer) {
    var cursorZones = $$("[data-cursor]");
    if (cursorZones.length) {
      var cc = document.createElement("div");
      cc.className = "ccur";
      cc.setAttribute("aria-hidden", "true");
      var ccLabel = document.createElement("span");
      cc.appendChild(ccLabel);
      document.body.appendChild(cc);

      var cx = 0, cy = 0, ccPending = false, ccActive = false;
      var ccWrite = function () { ccPending = false; cc.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%) scale(" + (ccActive ? 1 : 0.6) + ")"; };
      var onMove = function (e) {
        cx = e.clientX; cy = e.clientY;
        if (!ccPending) { ccPending = true; requestAnimationFrame(ccWrite); }
      };
      document.addEventListener("mousemove", onMove, { passive: true });

      cursorZones.forEach(function (z) {
        z.addEventListener("mouseenter", function () {
          ccLabel.textContent = z.getAttribute("data-cursor") || "Ansehen";
          ccActive = true; cc.classList.add("is-on");
        });
        z.addEventListener("mouseleave", function () { ccActive = false; cc.classList.remove("is-on"); });
      });
      window.addEventListener("blur", function () { ccActive = false; cc.classList.remove("is-on"); });
    }
  }

  /* ── 9 · Formulare ──────────────────────────────────────────────── */
  function setErr(field, msg) {
    field.classList.add("invalid");
    var e = $(".field__err", field);
    if (e) { e.textContent = msg; }
    var input = $("input,textarea,select", field);
    if (input) input.setAttribute("aria-invalid", "true");
  }
  function clearErr(field) {
    field.classList.remove("invalid");
    var input = $("input,textarea,select", field);
    if (input) input.removeAttribute("aria-invalid");
  }
  function validField(field) {
    var input = $("input,textarea,select", field);
    if (!input) return true;
    var v = (input.value || "").trim();
    if (input.hasAttribute("required") && !v) { setErr(field, "Bitte ausfüllen."); return false; }
    if (input.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr(field, "Bitte gültige E-Mail eingeben."); return false; }
    if (input.type === "tel" && v && !/^[0-9()#&+*\-=.\s/]{5,}$/.test(v)) { setErr(field, "Bitte gültige Telefonnummer eingeben."); return false; }
    clearErr(field);
    return true;
  }
  function buildMailto(subject, lines) {
    return "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  /* Kopier-Rückfalllösung: Wer kein Mailprogramm eingerichtet hat, sieht
     sonst gar keine Reaktion und die Anfrage geht verloren. */
  function offerCopy(status, lines) {
    if (!status) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "form__copy";
    btn.textContent = "Angaben kopieren";
    btn.addEventListener("click", function () {
      var txt = lines.join("\n");
      var done = function () { btn.textContent = "Kopiert ✓"; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
      else { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(ta); }
    });
    status.appendChild(document.createElement("br"));
    status.appendChild(btn);
  }

  var cform = $("#contactForm");
  if (cform) {
    cform.setAttribute("novalidate", "");
    cform.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$(".field", cform).forEach(function (f) { if (!validField(f)) ok = false; });
      var consent = $("#c-consent");
      var status = $(".form__status", cform);
      if (consent && !consent.checked) {
        ok = false;
        if (status) { status.className = "form__status err"; status.textContent = "Bitte stimmen Sie der Datenschutzerklärung zu."; }
      }
      if (!ok) {
        var firstBad = $(".field.invalid input,.field.invalid textarea", cform);
        if (firstBad) firstBad.focus();
        return;
      }
      var g = function (n) { var el = cform.elements[n]; return el ? el.value.trim() : ""; };
      var lines = [
        "Name: " + g("name"), "E-Mail: " + g("email"), "Betreff: " + g("subject"),
        "", "Nachricht:", g("message"), "", "— gesendet über devries-galabau.de"
      ];
      if (status) {
        status.className = "form__status ok";
        status.textContent = "Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht. Passiert nichts, schreiben Sie bitte direkt an " + MAIL_TO + ".";
        offerCopy(status, lines);
      }
      window.location.href = buildMailto("Kontaktanfrage: " + (g("subject") || "Website"), lines);
    });
    $$(".field input,.field textarea", cform).forEach(function (i) {
      i.addEventListener("blur", function () { validField(i.closest(".field")); });
    });
  }

  var aform = $("#anfrageForm");
  if (aform) {
    aform.setAttribute("novalidate", "");
    var steps = $$(".step", aform);
    var fill = $(".steps__fill", aform);
    var count = $(".steps__count", aform);
    var cur = 0;

    function showStep(i) {
      steps.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle("is-active", on);
        s.setAttribute("aria-hidden", on ? "false" : "true");
      });
      if (fill) fill.style.width = ((i + 1) / steps.length * 100) + "%";
      if (count) count.textContent = "Schritt " + (i + 1) + " / " + steps.length;
      cur = i;
      var head = steps[i].querySelector(".step__title, h2, h3");
      if (head && i > 0) { head.setAttribute("tabindex", "-1"); setTimeout(function () { head.focus({ preventScroll: true }); }, 60); }
    }
    function validateStep(i) {
      var s = steps[i], ok = true;
      var radios = $$('input[type="radio"]', s);
      if (radios.length) {
        var names = {};
        radios.forEach(function (r) { names[r.name] = names[r.name] || false; if (r.checked) names[r.name] = true; });
        Object.keys(names).forEach(function (n) { if (!names[n]) ok = false; });
        var re = $(".step__err", s);
        if (re) re.style.display = ok ? "none" : "block";
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
      var val = function (n) {
        var el = aform.elements[n];
        if (!el) return "";
        if (el.length && el[0] && el[0].type === "radio") {
          for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value;
          return "";
        }
        return (el.value || "").trim();
      };
      var lines = [
        "Art: " + val("art"), "Bereich: " + val("bereich"),
        "", "Beschreibung:", val("beschreibung"),
        "", "Zeitraum: " + val("zeitraum"),
        "", "Name: " + val("name"), "E-Mail: " + val("email"),
        "Telefon: " + val("telefon"), "Erreichbar: " + val("erreichbar"),
        "", "— gesendet über devries-galabau.de"
      ];
      var status = $(".form__status", aform);
      if (status) {
        status.className = "form__status ok";
        status.textContent = "Ihr E-Mail-Programm öffnet sich mit allen Angaben. Bitte dort noch auf „Senden“ klicken. Passiert nichts, kopieren Sie Ihre Angaben und schreiben an " + MAIL_TO + ".";
        offerCopy(status, lines);
      }
      /* Bewusst KEINE automatische Weiterleitung auf danke.html:
         Sie hätte auch dann „Danke" gemeldet, wenn nichts versendet wurde. */
      window.location.href = buildMailto("Kostenlose Anfrage — " + (val("bereich") || "Gartenprojekt"), lines);
    });
    showStep(0);
  }

  /* ── 10 · Leistungen: Sticky-Scrollytelling ──────────────────────────
     Ersetzt den reinen Hover-Index (auf Touch unbedienbar). Der Text
     bleibt stehen, das Bild wechselt mit dem Scroll — auf jedem Gerät. */
  var svcIndex = $(".svc-index");
  if (svcIndex) {
    var svcBgs = $$(".svc-index__bg", svcIndex);
    var svcRows = $$(".svc-row", svcIndex);

    var svcShow = function (idx) {
      svcIndex.classList.add("is-lit");
      svcBgs.forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-bg") === String(idx)); });
      svcRows.forEach(function (r) { r.classList.toggle("is-current", r.getAttribute("data-bg") === String(idx)); });
    };

    /* Desktop mit Zeigegerät: Hover/Fokus führt. */
    if (!isTouch && isFinePointer) {
      var svcList = $("#svcList");
      svcRows.forEach(function (r) {
        var lit = function () { svcShow(r.getAttribute("data-bg")); };
        r.addEventListener("mouseenter", lit);
        r.addEventListener("focus", lit);
      });
      var unlit = function () {
        svcIndex.classList.remove("is-lit");
        svcBgs.forEach(function (b) { b.classList.remove("is-active"); });
        svcRows.forEach(function (r) { r.classList.remove("is-current"); });
      };
      if (svcList) svcList.addEventListener("mouseleave", unlit);
      svcRows.forEach(function (r) { r.addEventListener("blur", unlit); });
    }

    /* Touch / schmale Viewports: die Zeile in Bildschirmmitte führt. */
    if ((isTouch || isNarrow) && "IntersectionObserver" in window && !reduce) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) svcShow(en.target.getAttribute("data-bg")); });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      svcRows.forEach(function (r) { sio.observe(r); });
    }
  }

  /* ── 11 · Signatur „Plan wird Garten" ────────────────────────────────
     Leitmotiv: Ein Garten entsteht Schicht für Schicht.
     Schicht 1  Raster       — das leere Grundstück
     Schicht 2  Planlinien   — zeichnen sich (stroke-dashoffset)
     Schicht 3  Maße/Labels  — die Planung wird konkret
     Schicht 4  Foto         — öffnet sich und löst den Plan ab
     Alles an EINE gescrubte Timeline gebunden, damit die Schichten
     nachvollziehbar aufeinander folgen statt gleichzeitig zu passieren. */
  var planSec = $(".reveal-pin");
  if (planSec) {
    var planPhoto = $("#pinPhoto", planSec);
    var planLines = $$(".plan-draw__line", planSec);

    /* Pfadlängen setzen, damit sich die Linien zeichnen lassen. */
    planLines.forEach(function (p) {
      try {
        var len = Math.ceil(p.getTotalLength());
        p.style.setProperty("--len", len);
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = reduce ? 0 : len;
      } catch (e) {}
    });

    if (hasGsap && !reduce) {
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: planSec,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onToggle: function (self) {
            /* will-change nur solange die Sequenz wirklich läuft. */
            if (planPhoto) planPhoto.classList.toggle("is-live", self.isActive);
          }
        }
      });
      tl.to(".plan-draw__grid", { opacity: 1, duration: 0.6 }, 0)
        .to(planLines, { strokeDashoffset: 0, duration: 2.4, stagger: 0.25, ease: "none" }, 0.3)
        .to(".plan-draw__tag", { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, 1.8)
        /* fromTo mit vier expliziten Werten auf BEIDEN Seiten: die CSS-Kurzform
           inset(45%) wird sonst als EIN Wert gelesen und nur die obere Kante
           animiert — das Bild klappte dann nur nach unten auf. */
        .fromTo(planPhoto,
          { clipPath: "inset(45% 45% 45% 45%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease: "power2.inOut" }, 2.6)
        .to(".plan-draw", { opacity: 0, duration: 1.1 }, 3.4)
        .to(".reveal-pin__cap", { opacity: 1, y: 0, duration: 0.9 }, 3.8);
    } else if (planPhoto) {
      planPhoto.style.clipPath = "none";
    }
  }

  /* ── 12 · Filmstreifen ───────────────────────────────────────────────
     Grundlage bleibt natives Scroll-Snapping (funktioniert mit Tastatur,
     Trackpad und Touch). Auf Desktop legt sich die GSAP-Choreografie
     additiv darüber; erhält ein Element darin den Fokus, wird die
     Timeline mitgezogen, damit der Fokus sichtbar bleibt. */
  var film = $(".filmstrip"), filmTrack = $("#filmTrack"), filmVp = $("#filmViewport");
  if (film && filmTrack && filmVp) {
    var filmItems = $$(".film-item", filmTrack);
    var counter = $(".filmstrip__counter");

    var updateCounter = function (i) {
      if (counter) counter.textContent = String(i + 1).padStart(2, "0") + " / " + String(filmItems.length).padStart(2, "0");
    };
    updateCounter(0);

    if (hasGsap && !reduce && window.matchMedia("(min-width: 861px)").matches) {
      var filmDist = function () { return Math.max(0, filmTrack.scrollWidth - filmVp.clientWidth); };
      filmVp.style.overflow = "hidden";
      var filmTween = gsap.to(filmTrack, {
        x: function () { return -filmDist(); },
        ease: "none",
        scrollTrigger: {
          trigger: film,
          start: "top top",
          end: function () { return "+=" + filmDist(); },
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: function (self) { updateCounter(Math.min(filmItems.length - 1, Math.round(self.progress * (filmItems.length - 1)))); }
        }
      });
      /* Fokus im gepinnten Bereich: an die passende Stelle der Timeline springen. */
      filmItems.forEach(function (it, i) {
        it.addEventListener("focus", function () {
          var st = filmTween.scrollTrigger;
          if (!st) return;
          var target = st.start + (st.end - st.start) * (i / Math.max(1, filmItems.length - 1));
          if (lenis) lenis.scrollTo(target, { immediate: true });
          else window.scrollTo({ top: target, behavior: "auto" });
        });
      });
    } else if (!reduce && "IntersectionObserver" in window) {
      /* Mobile/Touch: natives Snap-Scrolling mit eigener Fortschrittsanzeige. */
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) updateCounter(filmItems.indexOf(en.target)); });
      }, { root: filmVp, threshold: 0.6 });
      filmItems.forEach(function (it) { fio.observe(it); });
    }
  }

  /* ── 13 · Referenzen: Filter + Lightbox ─────────────────────────── */
  var filterbar = $("#filterbar");
  if (filterbar) {
    var gitems = $$(".gitem");
    var liveCount = $("#galleryCount");
    filterbar.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      $$(".chip", filterbar).forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", "true");
      var cat = chip.getAttribute("data-filter");
      var shown = 0;
      gitems.forEach(function (it) {
        var show = cat === "all" || (it.getAttribute("data-cat") || "").split(" ").indexOf(cat) > -1;
        it.classList.toggle("is-hidden", !show);
        if (show) shown++;
      });
      /* Screenreader erfahren das Ergebnis der Filterung. */
      if (liveCount) liveCount.textContent = shown + (shown === 1 ? " Projekt" : " Projekte") + " werden angezeigt.";
    });
  }

  var lb = $("#lightbox");
  if (lb) {
    var lbImg = $(".lightbox__img", lb), lbCap = $(".lightbox__cap", lb);
    var lbItems = $$(".gitem[data-full]"), lbIdx = 0, lbLastFocus = null;
    var lbTrap = focusTrap(lb);

    var openLb = function (i) {
      lbIdx = i;
      var it = lbItems[i];
      lbImg.src = it.getAttribute("data-full");
      lbImg.alt = it.getAttribute("data-alt") || "";
      if (lbCap) lbCap.textContent = it.getAttribute("data-alt") || "";
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      setBackgroundInert(true, lb);
      lbTrap.on();
      $(".lightbox__close", lb).focus();
    };
    var closeLb = function () {
      if (!lb.classList.contains("is-open")) return;
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      setBackgroundInert(false);
      lbTrap.off();
      if (lbLastFocus) lbLastFocus.focus();
    };
    var stepLb = function (d) {
      var vis = lbItems.filter(function (g) { return !g.classList.contains("is-hidden"); });
      if (!vis.length) return;
      var here = vis.indexOf(lbItems[lbIdx]);
      openLb(lbItems.indexOf(vis[(here + d + vis.length) % vis.length]));
    };

    lbItems.forEach(function (it, i) {
      it.setAttribute("role", "button");
      it.setAttribute("tabindex", "0");
      it.setAttribute("aria-label", (it.getAttribute("data-alt") || "Projekt") + " – groß ansehen");
      it.addEventListener("click", function () { lbLastFocus = it; openLb(i); });
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lbLastFocus = it; openLb(i); }
      });
    });
    $(".lightbox__close", lb).addEventListener("click", closeLb);
    var pv = $(".lightbox__prev", lb), nx = $(".lightbox__next", lb);
    if (pv) pv.addEventListener("click", function () { stepLb(-1); });
    if (nx) nx.addEventListener("click", function () { stepLb(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.stopPropagation(); closeLb(); }
      if (e.key === "ArrowLeft") stepLb(-1);
      if (e.key === "ArrowRight") stepLb(1);
    });
  }

  /* ── 14 · Seitenübergang / Prefetch ──────────────────────────────────
     Der Übergang selbst läuft über die View-Transitions-API (reines CSS).
     Hier wird nur die nächste Seite vorgeladen, sobald sich abzeichnet,
     dass der Nutzer sie ansteuert — das macht den Wechsel schnell,
     ohne die Navigation künstlich zu verzögern. */
  (function prefetch() {
    if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""))) return;
    var done = {};
    var warm = function (href) {
      if (!href || done[href]) return;
      done[href] = 1;
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      l.as = "document";
      document.head.appendChild(l);
    };
    var handler = function (e) {
      var a = e.target.closest && e.target.closest('a[href$=".html"]');
      if (!a || a.target === "_blank" || a.origin !== location.origin) return;
      warm(a.getAttribute("href"));
    };
    document.addEventListener("mouseover", handler, { passive: true });
    document.addEventListener("touchstart", handler, { passive: true });
  })();

  /* ── Nachjustierung: Layout ändert sich nach Bildern und Webfonts ── */
  if (hasGsap) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  /* Wechselt der Nutzer die Bewegungseinstellung, neu laden statt
     einen halbgaren Mischzustand zu zeigen. */
  var onMqChange = function () { location.reload(); };
  if (mqReduce.addEventListener) mqReduce.addEventListener("change", onMqChange);
  else if (mqReduce.addListener) mqReduce.addListener(onMqChange);
})();
