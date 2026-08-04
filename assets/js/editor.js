/* =====================================================================
   Seiten-Editor — Textbearbeitung auf der Seite selbst
   =====================================================================

   Laeuft NUR, wenn beides zutrifft:
   · in sessionStorage liegt ein gueltiges Anmeldekennzeichen aus /admin/
   · das Fenster ist mindestens BREITE_MIN Pixel breit

   Die Breitengrenze ist eine BEDIENENTSCHEIDUNG, keine Sicherheitsgrenze:
   Auf dem Telefon laesst sich ein Textfeld mit Auswahl, Cursor und
   Werkzeugleiste nicht sinnvoll bedienen, und ein halb bedienbarer
   Editor auf einer Live-Seite richtet mehr Schaden an als er nuetzt.
   Wer die Seite absichern will, tut das serverseitig — hier geht es
   darum, dem Betreiber kein unbrauchbares Werkzeug hinzustellen.

   Was hier NICHT passiert, mit Absicht:
   · kein innerHTML mit gespeicherten Inhalten. Genau daran ist der aus
     dem Entwurf mitgebrachte Editor in v9 gescheitert (er spielte
     localStorage per innerHTML zurueck, damit war alles dort
     ausfuehrbares Markup). Gelesen und geschrieben wird ausschliesslich
     ueber textContent.
   · kein Speichern ohne Rueckmeldung. Jeder Ausgang meldet sich.

   Gestaltung: Formensprache der CuraDoma-Verwaltung (Radius 10 px,
   Einblendung 600 ms cubic-bezier(.22,1,.36,1), Uebergaenge 150 ms
   cubic-bezier(.4,0,.2,1)), aber in der Palette dieses Projekts.
   ===================================================================== */
(function () {
  'use strict';

  var SITZUNG = 'dvg-verwaltung-sitzung';
  var BREITE_MIN = 1024;
  var FN = 'https://pvcbgwzqjnzzpehwuywi.supabase.co/functions/v1/verwaltung';

  /* Nur auf ausdruecklichen Wunsch: ohne ?bearbeiten=1 bleibt die Seite
     eine ganz normale Seite, auch fuer einen angemeldeten Betreiber. */
  var gewuenscht = /[?&]bearbeiten=1(&|$)/.test(location.search);
  if (!gewuenscht) return;

  var kennzeichen = null;
  try { kennzeichen = sessionStorage.getItem(SITZUNG); } catch (e) { /* Speicher gesperrt */ }
  if (!kennzeichen) { hinweisSeite('Nicht angemeldet', 'Bitte zuerst im Verwaltungsbereich anmelden — dann von dort aus die Seite zum Bearbeiten öffnen.', true); return; }

  if (window.innerWidth < BREITE_MIN) {
    hinweisSeite('Bearbeiten nur am Rechner',
      'Zum Ändern von Texten braucht es einen größeren Bildschirm. Auf dem Telefon können Sie Anfragen und Bewerbungen einsehen, Seiten aber nicht bearbeiten.', false);
    return;
  }

  /* ---------------------------------------------------------------- */

  var felder = [];            // {el, alt}
  var geaendert = new Map();  // kennung -> neuer Text
  var leiste, zaehlerEl, meldungEl, speichernEl, verwerfenEl;

  function start() {
    stilEinsetzen();
    felder = [].slice.call(document.querySelectorAll('[data-ed]')).map(function (el) {
      return { el: el, kennung: el.getAttribute('data-ed'), alt: el.textContent };
    });
    if (!felder.length) { hinweisSeite('Diese Seite ist noch nicht vorbereitet', 'Für sie wurden noch keine bearbeitbaren Stellen eingerichtet.', true); return; }
    felder.forEach(bereitmachen);
    leisteBauen();
    document.documentElement.classList.add('dvg-bearbeiten');

    /* Im Bearbeitungsmodus fuehren Verweise NICHT weg.
       Ohne das kostet ein Klick auf "Kontakt aufnehmen →" — der selbst
       eine bearbeitbare Beschriftung traegt — alle ungespeicherten
       Aenderungen. Die Werkzeugleiste ist ausgenommen, ueber sie
       verlaesst man den Modus ja absichtlich. */
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a || a.closest('.dvg-leiste') || a.closest('.dvg-hinweis')) return;
      ev.preventDefault();
      melde('Verweise sind beim Bearbeiten stillgelegt — sonst wären Ihre Änderungen weg. Zum Wechseln erst speichern oder beenden.', null);
    }, true);
  }

  function bereitmachen(f) {
    var el = f.el;
    el.classList.add('dvg-ed');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-label', 'Text bearbeiten: ' + kurz(f.alt));

    /* Zwei Wege hinein, mit Absicht. Der Fokus ist der eigentliche
       Ausloeser; pointerdown kommt dazu, weil das focus-Ereignis nicht
       in jeder Lage zuverlaessig eintrifft (im Pruefbrowser mit
       unsichtbarem Fenster etwa gar nicht — activeElement stimmt dann,
       das Ereignis fehlt aber). Ein Feld, das sich beim Anklicken nicht
       oeffnet, waere der aergerlichste denkbare Fehler. */
    var an = function () { el.contentEditable = 'true'; };
    el.addEventListener('focus', an);
    el.addEventListener('pointerdown', an);
    el.addEventListener('blur', function () {
      el.contentEditable = 'false';
      pruefe(f);
    });
    /* Zeilenumbruch im Feld waere Markup — hier ist nur Text vorgesehen. */
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); el.textContent = f.alt; el.blur(); }
    });
    /* Eingefuegter Text kommt oft mit Auszeichnung — nur das Nackte nehmen. */
    el.addEventListener('paste', function (ev) {
      ev.preventDefault();
      var t = (ev.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t.replace(/\s+/g, ' '));
    });
    el.addEventListener('input', function () { pruefe(f); });
  }

  function pruefe(f) {
    var jetzt = f.el.textContent;
    if (jetzt === f.alt) { geaendert.delete(f.kennung); f.el.classList.remove('dvg-ed-neu'); }
    else { geaendert.set(f.kennung, jetzt); f.el.classList.add('dvg-ed-neu'); }
    zaehlerAktualisieren();
  }

  function zaehlerAktualisieren() {
    var n = geaendert.size;
    zaehlerEl.textContent = n === 0 ? 'Noch nichts geändert'
      : n === 1 ? '1 Änderung' : n + ' Änderungen';
    speichernEl.disabled = n === 0;
    verwerfenEl.disabled = n === 0;
  }

  /* ---------------------------------------------------------------- */

  function leisteBauen() {
    leiste = el('div', 'dvg-leiste');

    var links = el('div', 'dvg-leiste-links');
    var punkt = el('span', 'dvg-punkt');
    var titel = el('strong', null, 'Bearbeiten');
    var seite = el('span', 'dvg-datei', dateiname());
    links.appendChild(punkt); links.appendChild(titel); links.appendChild(seite);

    zaehlerEl = el('span', 'dvg-zaehler');
    meldungEl = el('span', 'dvg-meldung');
    meldungEl.setAttribute('role', 'status');

    verwerfenEl = el('button', 'dvg-knopf dvg-knopf-still', 'Verwerfen');
    verwerfenEl.type = 'button';
    verwerfenEl.addEventListener('click', alleVerwerfen);

    speichernEl = el('button', 'dvg-knopf dvg-knopf-voll', 'Speichern');
    speichernEl.type = 'button';
    speichernEl.addEventListener('click', speichern);

    var raus = el('a', 'dvg-knopf dvg-knopf-still', 'Beenden');
    raus.href = location.pathname;

    var rechts = el('div', 'dvg-leiste-rechts');
    rechts.appendChild(zaehlerEl); rechts.appendChild(meldungEl);
    rechts.appendChild(verwerfenEl); rechts.appendChild(speichernEl); rechts.appendChild(raus);

    leiste.appendChild(links); leiste.appendChild(rechts);
    document.body.appendChild(leiste);
    zaehlerAktualisieren();

    /* Ungespeichertes nicht stillschweigend verlieren. */
    window.addEventListener('beforeunload', function (ev) {
      if (!geaendert.size) return;
      ev.preventDefault(); ev.returnValue = '';
    });
  }

  function alleVerwerfen() {
    felder.forEach(function (f) {
      if (!geaendert.has(f.kennung)) return;
      f.el.textContent = f.alt;
      f.el.classList.remove('dvg-ed-neu');
    });
    geaendert.clear();
    zaehlerAktualisieren();
    melde('Änderungen verworfen.', 'ok');
  }

  function speichern() {
    if (!geaendert.size) return;
    speichernEl.disabled = true;
    melde('Wird gespeichert …', null);

    /* Dieselbe Form wie im uebrigen Verwaltungsbereich: { was, sitzung, … }
       im RUMPF, nicht als eigene Kopfzeile.
       Das ist nicht nur Einheitlichkeit — eine selbst gewaehlte Kopfzeile
       loest eine CORS-Vorabfrage aus, die diese Funktion nicht beantwortet.
       Gemessen: der Aufruf scheiterte mit "Failed to fetch", waehrend
       derselbe Aufruf ohne die Kopfzeile sauber mit 401 antwortete. */
    var nutzlast = { was: 'texte-speichern', sitzung: kennzeichen,
                     datei: dateiname(), texte: {} };
    geaendert.forEach(function (wert, kennung) { nutzlast.texte[kennung] = wert; });

    fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nutzlast)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { s: r.status, d: d }; });
    }).then(function (a) {
      if (a.s === 401) { melde('Die Anmeldung ist abgelaufen. Bitte im Verwaltungsbereich neu anmelden.', 'fehler'); speichernEl.disabled = false; return; }
      /* Solange die Edge Function die Aktion nicht kennt, antwortet sie
         mit 400 und "unbekannter Auftrag"/"unbekannter Bereich". Das ist
         kein Fehler des Betreibers, sondern ein noch fehlender Baustein —
         ein roher Fehlercode wuerde ihn ratlos zuruecklassen. */
      var unbekannt = a.d && /unbekannt/i.test(String(a.d.fehler || ''));
      if (a.s === 501 || a.s === 400 && unbekannt || (a.d && a.d.fehler === 'kein_schreibrecht')) {
        melde('Speichern ist noch nicht freigeschaltet — dafür fehlt dem Server das Schreibrecht am Repository. Ihre Änderungen stehen noch auf dem Bildschirm, sind aber NICHT gespeichert.', 'fehler');
        speichernEl.disabled = false; return;
      }
      if (a.s !== 200 || !a.d || !a.d.ok) {
        melde('Speichern fehlgeschlagen (' + a.s + (a.d && a.d.fehler ? ' · ' + a.d.fehler : '') + ').', 'fehler');
        speichernEl.disabled = false; return;
      }
      /* Ab jetzt gilt der neue Text als Ausgangszustand. */
      felder.forEach(function (f) { if (geaendert.has(f.kennung)) { f.alt = f.el.textContent; f.el.classList.remove('dvg-ed-neu'); } });
      geaendert.clear();
      zaehlerAktualisieren();
      /* Ehrlich bleiben: GitHub Pages braucht rund eine Minute. Ein
         "gespeichert" ohne diesen Zusatz waere eine halbe Wahrheit. */
      melde('Gespeichert. Die Seite wird veröffentlicht — in etwa einer Minute ist sie für alle sichtbar.', 'ok');
    }).catch(function (e) {
      melde('Keine Verbindung zum Server (' + (e && e.message) + '). Nichts gespeichert.', 'fehler');
      speichernEl.disabled = false;
    });
  }

  /* ---------------------------------------------------------------- */

  function melde(text, art) {
    meldungEl.textContent = text;
    meldungEl.className = 'dvg-meldung' + (art ? ' dvg-meldung-' + art : '');
  }

  function dateiname() {
    var p = location.pathname.replace(/^\/+/, '');
    p = p.replace(/^devries-galabau\//, '');       // GitHub-Pages-Unterpfad
    if (!p || p.slice(-1) === '/') p += 'index.html';
    return p;
  }

  function kurz(s) { s = String(s || '').trim(); return s.length > 40 ? s.slice(0, 40) + '…' : s; }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text != null) e.textContent = text;
    return e;
  }

  function hinweisSeite(titel, text, alsFehler) {
    stilEinsetzen();
    var k = el('div', 'dvg-hinweis' + (alsFehler ? ' dvg-hinweis-fehler' : ''));
    k.appendChild(el('strong', null, titel));
    k.appendChild(el('span', null, text));
    var a = el('a', 'dvg-knopf dvg-knopf-still', 'Zur Verwaltung');
    a.href = wurzel() + 'admin/';
    k.appendChild(a);
    document.body.appendChild(k);
  }

  function wurzel() {
    var m = /^\/([^/]+)\//.exec(location.pathname);
    return (m && m[1] === 'devries-galabau') ? '/devries-galabau/' : '/';
  }

  /* ---------------------------------------------------------------- */

  function stilEinsetzen() {
    if (document.getElementById('dvg-editor-stil')) return;
    var s = document.createElement('style');
    s.id = 'dvg-editor-stil';
    s.textContent = [
      /* Formensprache der CuraDoma-Verwaltung, Palette dieses Projekts. */
      '.dvg-leiste,.dvg-hinweis{--r:10px;--gr:#1B4332;--gr2:#2C6E49;--li:#8ECF4F;',
      '  --pa:#EDF3E8;--ink:#12261A;--mut:#5B6F63;--rot:#B3261E;',
      '  font-family:Outfit,Helvetica,Arial,sans-serif}',

      '@keyframes dvgEin{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}',

      /* bearbeitbare Stellen */
      '.dvg-bearbeiten .dvg-ed{outline:1px dashed rgba(44,110,73,.42);outline-offset:3px;',
      '  border-radius:3px;cursor:text;transition:outline-color .15s cubic-bezier(.4,0,.2,1),background-color .15s cubic-bezier(.4,0,.2,1)}',
      '.dvg-bearbeiten .dvg-ed:hover{outline-color:#2C6E49;background:rgba(142,207,79,.16)}',
      '.dvg-bearbeiten .dvg-ed:focus{outline:2px solid #2C6E49;background:rgba(142,207,79,.2)}',
      '.dvg-bearbeiten .dvg-ed-neu{outline:2px solid #C77C1E;background:rgba(199,124,30,.14)}',

      /* Werkzeugleiste */
      '.dvg-leiste{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;',
      '  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;',
      '  padding:12px 16px;border-radius:var(--r);background:rgba(255,255,255,.94);',
      '  backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(16,35,26,.1);',
      '  box-shadow:0 18px 44px -20px rgba(9,26,17,.45);',
      '  animation:dvgEin 600ms cubic-bezier(.22,1,.36,1) both}',
      '@media (prefers-reduced-motion:reduce){.dvg-leiste{animation-duration:1ms}}',
      '.dvg-leiste-links,.dvg-leiste-rechts{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.dvg-leiste strong{font-size:14px;color:var(--ink)}',
      '.dvg-punkt{width:8px;height:8px;border-radius:50%;background:var(--li);flex:none}',
      '.dvg-datei{font-size:12.5px;color:var(--mut)}',
      '.dvg-zaehler{font-size:13px;color:var(--mut)}',
      '.dvg-meldung{font-size:13px;color:var(--mut);max-width:46ch}',
      '.dvg-meldung-ok{color:#2C6E49}',
      '.dvg-meldung-fehler{color:var(--rot);font-weight:600}',

      '.dvg-knopf{display:inline-flex;align-items:center;justify-content:center;min-height:40px;',
      '  padding:10px 18px;border-radius:999px;font:inherit;font-size:14px;font-weight:600;',
      '  cursor:pointer;text-decoration:none;border:1px solid transparent;',
      '  transition:background-color .15s cubic-bezier(.4,0,.2,1),color .15s cubic-bezier(.4,0,.2,1),border-color .15s cubic-bezier(.4,0,.2,1)}',
      '.dvg-knopf-voll{background:var(--gr);color:#F3F7F0}',
      '.dvg-knopf-voll:hover:not(:disabled){background:var(--gr2)}',
      '.dvg-knopf-still{background:transparent;color:var(--ink);border-color:rgba(16,35,26,.18)}',
      '.dvg-knopf-still:hover{background:rgba(16,35,26,.05)}',
      '.dvg-knopf:disabled{opacity:.42;cursor:not-allowed}',
      '.dvg-knopf:focus-visible{outline:2px solid var(--gr2);outline-offset:2px}',

      /* Hinweiskarte, wenn nicht bearbeitet werden kann */
      '.dvg-hinweis{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483000;',
      '  display:flex;flex-direction:column;gap:8px;max-width:min(92vw,420px);',
      '  padding:18px 20px;border-radius:var(--r);background:#fff;',
      '  border:1px solid rgba(16,35,26,.12);box-shadow:0 18px 44px -20px rgba(9,26,17,.45);',
      '  animation:dvgEin 600ms cubic-bezier(.22,1,.36,1) both}',
      '@media (prefers-reduced-motion:reduce){.dvg-hinweis{animation-duration:1ms}}',
      '.dvg-hinweis strong{font-size:15px;color:var(--ink)}',
      '.dvg-hinweis span{font-size:13.5px;line-height:1.5;color:var(--mut)}',
      '.dvg-hinweis .dvg-knopf{align-self:flex-start;margin-top:4px}',
      '.dvg-hinweis-fehler strong{color:var(--rot)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
