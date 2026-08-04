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
  var schublade = null, schubladeKnopf = null;

  function start() {
    stilEinsetzen();
    /* Nach Kennung gruppieren, NICHT je Element.
       Manche Stellen stehen zur Laufzeit mehrfach im Dokument: das
       Materialband der Startseite wird vom Skript geklont, damit es
       endlos laufen kann — 18 Kennungen liegen dort viermal. In der
       DATEI gibt es sie nur einmal, gespeichert wird also ohnehin
       richtig. Ohne diese Gruppierung aber bearbeitete der Betreiber
       eine Kopie, waehrend die drei anderen sichtbar stehen blieben.
       Jetzt ist die erste Kopie das Eingabefeld, die uebrigen ziehen
       mit. */
    var nachKennung = new Map();
    [].slice.call(document.querySelectorAll('[data-ed]')).forEach(function (el) {
      var k = el.getAttribute('data-ed');
      if (!nachKennung.has(k)) nachKennung.set(k, []);
      nachKennung.get(k).push(el);
    });
    felder = [];
    nachKennung.forEach(function (els, kennung) {
      var f = { el: els[0], klone: els.slice(1), kennung: kennung, alt: els[0].textContent };
      /* Nicht gerendert? Dann laesst sich die Stelle auf der Seite nicht
         anklicken — etwa die Stationstafeln des abgeschalteten Rundgangs
         oder eine eingeklappte Frage. Sie bleiben trotzdem bearbeitbar,
         nur ueber die Liste unten statt durch Klick im Text.

         getClientRects().length ist hier der belastbare Test. Ein
         Vergleich ueber Breite und Hoehe faengt auch Elemente ein, deren
         Hoehe gerade noch nicht berechnet ist — gemessen: 59 statt der
         tatsaechlichen 49. */
      f.verborgen = els[0].getClientRects().length === 0;
      felder.push(f);
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
    /* Verborgene Stellen bekommen KEINEN Fokusrahmen und keine
       Tastaturposition — man kaeme dort ohnehin nie hin, und ein
       unerreichbarer Tabstopp waere nur ein Loch in der Bedienung.
       Bearbeitet werden sie ueber die Liste. */
    if (f.verborgen) return;
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
    /* Kopien mitziehen, damit die Seite waehrend des Tippens stimmig
       bleibt. textContent, nie innerHTML — der Wert kommt aus einem
       Eingabefeld. */
    if (f.klone && f.klone.length) {
      f.klone.forEach(function (k) {
        k.textContent = jetzt;
        k.classList.toggle('dvg-ed-neu', jetzt !== f.alt);
      });
    }
    if (jetzt === f.alt) { geaendert.delete(f.kennung); f.el.classList.remove('dvg-ed-neu'); }
    else { geaendert.set(f.kennung, jetzt); f.el.classList.add('dvg-ed-neu'); }
    if (f.feld) f.feld.classList.toggle('dvg-feld-neu', jetzt !== f.alt);
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
    verwerfenEl.id = 'dvg-verwerfen';
    verwerfenEl.addEventListener('click', alleVerwerfen);

    speichernEl = el('button', 'dvg-knopf dvg-knopf-voll', 'Speichern');
    speichernEl.type = 'button';
    speichernEl.id = 'dvg-speichern';
    speichernEl.addEventListener('click', speichern);

    var raus = el('a', 'dvg-knopf dvg-knopf-still', 'Beenden');
    raus.href = location.pathname;

    var rechts = el('div', 'dvg-leiste-rechts');
    rechts.appendChild(zaehlerEl); rechts.appendChild(meldungEl);

    /* Stellen, die auf der Seite nicht angeklickt werden koennen, gehen
       sonst verloren — man sieht sie nicht und weiss nicht, dass es sie
       gibt. Der Knopf erscheint nur, wenn es welche gibt. */
    var verborgene = felder.filter(function (f) { return f.verborgen; });
    if (verborgene.length) {
      schubladeKnopf = el('button', 'dvg-knopf dvg-knopf-still',
        verborgene.length + ' nicht sichtbar');
      schubladeKnopf.type = 'button';
      schubladeKnopf.id = 'dvg-verborgen';
      schubladeKnopf.setAttribute('aria-expanded', 'false');
      schubladeKnopf.title = 'Diese Stellen gehören zur Seite, werden aber gerade nicht angezeigt.';
      schubladeKnopf.addEventListener('click', schubladeUmschalten);
      rechts.appendChild(schubladeKnopf);
    }

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

  /* ---- Schublade fuer die nicht sichtbaren Stellen ----------------- */

  function schubladeUmschalten() {
    if (schublade) {
      schublade.remove(); schublade = null;
      schubladeKnopf.setAttribute('aria-expanded', 'false');
      return;
    }
    schublade = el('div', 'dvg-schublade');
    schublade.setAttribute('role', 'group');
    schublade.setAttribute('aria-label', 'Nicht sichtbare Textstellen');

    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Gerade nicht sichtbar'));
    kopf.appendChild(el('span', null,
      'Diese Texte gehören zur Seite, werden aber im Moment nicht angezeigt — ' +
      'zum Beispiel die Tafeln des abgeschalteten Rundgangs oder eine eingeklappte Frage. ' +
      'Hier lassen sie sich trotzdem ändern.'));
    schublade.appendChild(kopf);

    /* Nach dem naechsten Vorfahren mit id gruppieren — das ist die
       verstaendlichste Ortsangabe, die das Markup hergibt. */
    var gruppen = new Map();
    felder.filter(function (f) { return f.verborgen; }).forEach(function (f) {
      var c = f.el.closest('[id]');
      var name = c ? bereichName(c.id) : 'Sonstiges';
      if (!gruppen.has(name)) gruppen.set(name, []);
      gruppen.get(name).push(f);
    });

    gruppen.forEach(function (liste, name) {
      var g = el('div', 'dvg-gruppe');
      g.appendChild(el('div', 'dvg-gruppe-titel', name + ' · ' + liste.length));
      liste.forEach(function (f) {
        var zeile = el('label', 'dvg-zeile');
        zeile.appendChild(el('span', 'dvg-zeile-kennung', f.kennung));
        var feld = document.createElement('textarea');
        feld.className = 'dvg-feld';
        feld.rows = Math.min(4, Math.ceil((f.el.textContent.length || 1) / 60));
        feld.value = f.el.textContent;
        feld.addEventListener('input', function () {
          /* Zeilenumbrueche sind hier kein gueltiger Inhalt — im Markup
             steht ein einzelner Textknoten. */
          var wert = feld.value.replace(/[\r\n]+/g, ' ');
          if (wert !== feld.value) feld.value = wert;
          f.el.textContent = wert;
          pruefe(f);
        });
        f.feld = feld;
        zeile.appendChild(feld);
        g.appendChild(zeile);
      });
      schublade.appendChild(g);
    });

    document.body.appendChild(schublade);
    schubladeKnopf.setAttribute('aria-expanded', 'true');
    var erstes = schublade.querySelector('textarea');
    if (erstes) erstes.focus();
  }

  /* Aus einer id einen Namen machen, den ein Mensch versteht. */
  function bereichName(id) {
    var karte = {
      'rg-stations': 'Tafeln des Gartenrundgangs',
      'rg-rail': 'Punkteleiste des Gartenrundgangs',
      'rg-sec-faq': 'Häufige Fragen (eingeklappt)',
      'rg-walk': 'Gartenrundgang'
    };
    return karte[id] || id;
  }

  function alleVerwerfen() {
    felder.forEach(function (f) {
      if (!geaendert.has(f.kennung)) return;
      f.el.textContent = f.alt;
      f.el.classList.remove('dvg-ed-neu');
      if (f.klone) f.klone.forEach(function (k) {
        k.textContent = f.alt; k.classList.remove('dvg-ed-neu');
      });
      /* Das Eingabefeld in der Schublade zeigt sonst weiter den
         verworfenen Text — die Seite waere zurueckgesetzt, das Feld
         nicht, und beim naechsten Tastendruck kaeme die Aenderung
         zurueck. */
      if (f.feld) { f.feld.value = f.alt; f.feld.classList.remove('dvg-feld-neu'); }
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
      felder.forEach(function (f) {
        if (!geaendert.has(f.kennung)) return;
        f.alt = f.el.textContent;
        f.el.classList.remove('dvg-ed-neu');
        if (f.klone) f.klone.forEach(function (k) { k.classList.remove('dvg-ed-neu'); });
      });
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

      /* Schublade: Stellen, die auf der Seite nicht anklickbar sind */
      '.dvg-schublade{position:fixed;left:16px;right:16px;bottom:86px;z-index:2147483000;',
      '  max-height:min(56vh,520px);overflow:auto;padding:18px 20px 20px;',
      '  border-radius:var(--r);background:rgba(255,255,255,.97);',
      '  backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(16,35,26,.12);',
      '  box-shadow:0 22px 60px -24px rgba(9,26,17,.5);',
      '  animation:dvgEin 600ms cubic-bezier(.22,1,.36,1) both}',
      '@media (prefers-reduced-motion:reduce){.dvg-schublade{animation-duration:1ms}}',
      '.dvg-schublade-kopf{display:flex;flex-direction:column;gap:5px;margin-bottom:16px;',
      '  padding-bottom:14px;border-bottom:1px solid rgba(16,35,26,.1)}',
      '.dvg-schublade-kopf strong{font-size:15px;color:var(--ink)}',
      '.dvg-schublade-kopf span{font-size:13px;line-height:1.5;color:var(--mut);max-width:82ch}',
      '.dvg-gruppe{margin-bottom:18px}',
      '.dvg-gruppe-titel{margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.16em;',
      '  text-transform:uppercase;color:#46761F}',
      '.dvg-schublade .dvg-zeile{display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr);',
      '  gap:12px;align-items:start;padding:7px 0}',
      '.dvg-zeile-kennung{font-size:12px;color:var(--mut);overflow-wrap:anywhere;padding-top:9px}',
      '.dvg-feld{width:100%;padding:9px 12px;border-radius:8px;border:1px solid rgba(16,35,26,.16);',
      '  background:#fff;color:var(--ink);font:inherit;font-size:14px;line-height:1.5;resize:vertical;',
      '  transition:border-color .15s cubic-bezier(.4,0,.2,1)}',
      '.dvg-feld:focus{outline:2px solid #2C6E49;outline-offset:1px;border-color:#2C6E49}',
      '.dvg-feld-neu{border-color:#C77C1E;background:rgba(199,124,30,.07)}',

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
