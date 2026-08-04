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

  /* Schutz gegen Clickjacking — nur im Bearbeitungsmodus. Ein
     fremdes Dokument koennte die Seite sonst unsichtbar ueberlagern
     und einem angemeldeten Betreiber Klicks auf "Speichern"
     unterschieben. Fuer normale Besucher aendert sich nichts: ohne
     ?bearbeiten=1 ist diese Datei schon zwei Zeilen darueber fertig. */
  if (window.top !== window.self) { window.top.location = window.self.location; return; }

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
  var verlauf = null;
  var seo = null, seoMeldung = null, seoSpeichern = null;
  var seoWerte = {}, seoStart = null;
  var bild = null, bildMeldung = null, bildSpeichern = null, bildNeu = null;
  var rahmen = null, rahmenMeldung = null, rahmenSpeichern = null;
  var rahmenNeu = null, rahmenStand = null;
  var bloecke = null, bloeckeMeldung = null, bloeckeSpeichern = null;
  var bloeckeNeu = null, bloeckeStand = null;

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
    Array.prototype.forEach.call(document.querySelectorAll('[data-ed-img]'), bildBereitmachen);
    leisteBauen();
    /* Rechtstexte sind bearbeitbar wie jede andere Seite — das ist
       richtig, der Betreiber muss seine eigene Anschrift aendern
       koennen. Ein Hinweis gehoert aber dazu: eine unbedacht
       geaenderte Pflichtangabe ist ein Rechtsmangel, kein Tippfehler. */
    if (/^(impressum|datenschutz)\.html$/.test(dateiname())) {
      melde('Achtung: Das ist ein Rechtstext. Pflichtangaben wie Anschrift, '
        + 'Vertretung und USt-IdNr. müssen stimmen — im Zweifel nichts ändern.', 'fehler');
    }
    document.documentElement.classList.add('dvg-bearbeiten');

    /* Im Bearbeitungsmodus ist die Seite zum LESEN und TIPPEN da, nicht
       zum Bedienen. Stillgelegt werden deshalb:

       · Verweise — ein Klick auf "Kontakt aufnehmen →", der selbst eine
         bearbeitbare Beschriftung traegt, kostete sonst alle
         ungespeicherten Aenderungen.
       · Absende-Knoepfe — acht davon tragen einen Marker. Ein Klick
         verschickte eine ECHTE Anfrage aus dem Formular des Betriebs.
       · alle uebrigen Knoepfe — "Karte laden" auf der Kontaktseite
         entfernt die Vorschau aus dem Dokument, und mit ihr sechs
         bearbeitbare Textstellen. Der Absenden-Weg schreibt ausserdem
         die Statuszeile neu, in der ein Marker sitzt.

       Ausgenommen ist nur die Werkzeugleiste des Editors selbst. */
    var stillLegen = function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest('.dvg-leiste') || t.closest('.dvg-hinweis') || t.closest('.dvg-schublade')) return;
      var ziel = t.closest('a[href], button, input[type="submit"], input[type="button"], input[type="file"]');
      if (!ziel) return;
      ev.preventDefault();
      ev.stopPropagation();
      melde(ziel.tagName === 'A'
        ? 'Verweise sind beim Bearbeiten stillgelegt — sonst wären Ihre Änderungen weg.'
        : 'Knöpfe sind beim Bearbeiten stillgelegt, damit nichts versehentlich abgeschickt wird.', null);
    };
    document.addEventListener('click', stillLegen, true);
    /* Der Griff ueber die Tastatur (Enter/Leertaste im Formular) laeuft
       nicht zwingend ueber click — deshalb zusaetzlich am submit. */
    document.addEventListener('submit', function (ev) {
      ev.preventDefault();
      /* stopImmediatePropagation, nicht nur preventDefault: die Seite hat
         EIGENE submit-Horcher (kontakt.js, anfrage.js, stellen-form.js),
         die den Versand selbst ausloesen. preventDefault verhindert nur
         die eingebaute Formularabsendung — die Horcher laufen trotzdem.
         Gemessen: ohne diese Zeile ging beim Test eine echte Anfrage an
         den Server. */
      ev.stopImmediatePropagation();
      melde('Formulare sind beim Bearbeiten stillgelegt — es wird nichts abgeschickt.', null);
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

    if (document.querySelector('[data-ed-zone]')) {
      var bloeckeKnopf = el('button', 'dvg-knopf dvg-knopf-still', 'Stellenanzeigen');
      bloeckeKnopf.type = 'button';
      bloeckeKnopf.id = 'dvg-bloecke';
      bloeckeKnopf.title = 'Offene Stellen anlegen, ändern, entfernen';
      bloeckeKnopf.addEventListener('click', bloeckeUmschalten);
      rechts.appendChild(bloeckeKnopf);
    }

    var rahmenKnopf = el('button', 'dvg-knopf dvg-knopf-still', 'Menü & Fußzeile');
    rahmenKnopf.type = 'button';
    rahmenKnopf.id = 'dvg-rahmen';
    rahmenKnopf.title = 'Beschriftungen, die auf allen Seiten gleich sind';
    rahmenKnopf.addEventListener('click', rahmenUmschalten);
    rechts.appendChild(rahmenKnopf);

    var seoKnopf = el('button', 'dvg-knopf dvg-knopf-still', 'Titel & Beschreibung');
    seoKnopf.type = 'button';
    seoKnopf.id = 'dvg-seo';
    seoKnopf.title = 'Wie diese Seite in Suchergebnissen erscheint';
    seoKnopf.addEventListener('click', seoUmschalten);
    rechts.appendChild(seoKnopf);

    var verlaufKnopf = el('button', 'dvg-knopf dvg-knopf-still', 'Frühere Fassung');
    verlaufKnopf.type = 'button';
    verlaufKnopf.id = 'dvg-verlauf';
    verlaufKnopf.title = 'Einen früheren Stand dieser Seite wiederherstellen';
    verlaufKnopf.addEventListener('click', verlaufUmschalten);
    rechts.appendChild(verlaufKnopf);

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
    ladenSchliessen('verborgen');
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

  /* Es gibt fuenf Laden, und alle liegen an derselben Stelle ueber der
     Werkzeugleiste. Statt in jeder Lade die vier anderen einzeln zu
     schliessen — dabei vergisst man verlaesslich eine Kombination —
     macht das eine Stelle. */
  function ladenSchliessen(ausser) {
    if (schublade && ausser !== 'verborgen') {
      schublade.remove(); schublade = null;
      if (schubladeKnopf) schubladeKnopf.setAttribute('aria-expanded', 'false');
    }
    if (verlauf && ausser !== 'verlauf') { verlauf.remove(); verlauf = null; }
    if (seo && ausser !== 'seo') { seo.remove(); seo = null; }
    if (bild && ausser !== 'bild') { bild.remove(); bild = null; }
    if (rahmen && ausser !== 'rahmen') { rahmen.remove(); rahmen = null; }
    if (bloecke && ausser !== 'bloecke') { bloecke.remove(); bloecke = null; }
  }

  /* ---- Blöcke in einer Zone ----------------------------------------
     Zurzeit gibt es genau eine Blockart: die Stellenanzeige. Das ist
     Absicht — was der Betreiber nicht braucht, kann er auch nicht falsch
     einsetzen, und jede weitere Art verdoppelt eine Stilvorlage im
     Server, die bei jeder Designaenderung nachzuziehen ist. */

  function bloeckeLesen(zone) {
    /* Der Server erzeugt die Bloecke in fester Form — deshalb laesst sich
       aus dem Markup verlaesslich zurueckgelesen werden. */
    return [].slice.call(zone.querySelectorAll('article')).map(function (a) {
      var marke = a.querySelector('span');
      return {
        art: 'stelle',
        titel: (a.querySelector('h3') || {}).textContent || '',
        umfang: marke ? marke.textContent.trim() : '',
        text: (a.querySelector('p') || {}).textContent || '',
        punkte: [].slice.call(a.querySelectorAll('li')).map(function (l) { return l.textContent; })
      };
    });
  }

  function bloeckeUmschalten() {
    if (bloecke) { bloecke.remove(); bloecke = null; return; }
    ladenSchliessen();

    var zone = document.querySelector('[data-ed-zone]');
    if (!zone) return;
    bloeckeNeu = bloeckeLesen(zone);
    bloeckeStand = JSON.stringify(bloeckeNeu);

    bloecke = el('div', 'dvg-schublade');
    bloecke.setAttribute('role', 'group');
    bloecke.setAttribute('aria-label', 'Stellenanzeigen');
    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Stellenanzeigen'));
    kopf.appendChild(el('span', null,
      'Hier stehen die offenen Stellen. Solange keine eingetragen ist, sagt die Karte ' +
      'darüber, dass gerade keine Stelle frei ist — sobald Sie eine anlegen, passen Sie ' +
      'diesen Text bitte an. Automatisch geht das nicht: nur Sie wissen, wie es dann ' +
      'heißen soll.'));
    bloecke.appendChild(kopf);
    document.body.appendChild(bloecke);
    bloeckeZeichnen();
  }

  function bloeckeZeichnen() {
    /* Alles ausser dem Kopf neu aufbauen. */
    while (bloecke.children.length > 1) bloecke.removeChild(bloecke.lastChild);

    bloeckeNeu.forEach(function (b, i) {
      var g = el('div', 'dvg-gruppe');
      var kopf = el('div', 'dvg-gruppe-kopf');
      kopf.appendChild(el('div', 'dvg-gruppe-titel', 'Stelle ' + (i + 1)));
      var werkzeuge = el('div', 'dvg-block-werkzeuge');
      [['↑', 'nach oben', i > 0, function () { tausche(i, i - 1); }],
       ['↓', 'nach unten', i < bloeckeNeu.length - 1, function () { tausche(i, i + 1); }],
       ['✕', 'entfernen', true, function () {
          if (!window.confirm('Diese Stellenanzeige entfernen?')) return;
          bloeckeNeu.splice(i, 1); bloeckeZeichnen();
       }]
      ].forEach(function (w) {
        var k = el('button', 'dvg-knopf dvg-knopf-still dvg-mini', w[0]);
        k.type = 'button';
        k.setAttribute('aria-label', w[1]);
        k.disabled = !w[2];
        k.addEventListener('click', w[3]);
        werkzeuge.appendChild(k);
      });
      kopf.appendChild(werkzeuge);
      g.appendChild(kopf);

      var feld = function (beschriftung, schl, zeilen, hinweis) {
        var z = el('label', 'dvg-zeile');
        z.appendChild(el('span', 'dvg-zeile-kennung', beschriftung));
        var r = el('div', 'dvg-seo-feld');
        var f = document.createElement('textarea');
        f.className = 'dvg-feld';
        f.rows = zeilen;
        f.value = schl === 'punkte' ? (b.punkte || []).join('\n') : (b[schl] || '');
        f.addEventListener('input', function () {
          if (schl === 'punkte') {
            b.punkte = f.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
          } else {
            b[schl] = f.value.replace(/[\r\n]+/g, ' ');
            if (b[schl] !== f.value) f.value = b[schl];
          }
          bloeckeKnopfStand();
        });
        r.appendChild(f);
        if (hinweis) r.appendChild(el('span', 'dvg-ampel', hinweis));
        z.appendChild(r);
        return z;
      };

      g.appendChild(feld('Stellenbezeichnung', 'titel', 1));
      g.appendChild(feld('Umfang', 'umfang', 1, 'Zum Beispiel „Vollzeit" oder „Ausbildung ab August". Darf leer bleiben.'));
      g.appendChild(feld('Beschreibung', 'text', 4));
      g.appendChild(feld('Stichpunkte', 'punkte', 4, 'Eine Zeile je Punkt. Darf leer bleiben.'));
      bloecke.appendChild(g);
    });

    if (!bloeckeNeu.length) {
      bloecke.appendChild(el('div', 'dvg-ampel', 'Zurzeit ist keine Stelle eingetragen.'));
    }

    var leiste = el('div', 'dvg-seo-aktionen');
    var neu = el('button', 'dvg-knopf dvg-knopf-still', '+ Stelle hinzufügen');
    neu.type = 'button';
    neu.addEventListener('click', function () {
      bloeckeNeu.push({ art: 'stelle', titel: '', umfang: '', text: '', punkte: [] });
      bloeckeZeichnen();
      var felder = bloecke.querySelectorAll('.dvg-feld');
      if (felder.length) felder[felder.length - 4].focus();
    });
    bloeckeMeldung = el('span', 'dvg-meldung');
    bloeckeMeldung.setAttribute('role', 'status');
    bloeckeSpeichern = el('button', 'dvg-knopf dvg-knopf-voll', 'Stellen speichern');
    bloeckeSpeichern.type = 'button';
    bloeckeSpeichern.addEventListener('click', bloeckeSenden);
    leiste.appendChild(neu); leiste.appendChild(bloeckeMeldung); leiste.appendChild(bloeckeSpeichern);
    bloecke.appendChild(leiste);
    bloeckeKnopfStand();
  }

  function tausche(a, b) {
    var t = bloeckeNeu[a]; bloeckeNeu[a] = bloeckeNeu[b]; bloeckeNeu[b] = t;
    bloeckeZeichnen();
  }

  function bloeckeKnopfStand() {
    if (!bloeckeSpeichern) return;
    var anders = JSON.stringify(bloeckeNeu) !== bloeckeStand;
    var luecke = bloeckeNeu.some(function (b) {
      return !String(b.titel || '').trim() || !String(b.text || '').trim();
    });
    bloeckeSpeichern.disabled = !anders || luecke;
    if (luecke) bloeckeSage('Bezeichnung und Beschreibung sind bei jeder Stelle nötig.', 'fehler');
    else if (anders) bloeckeSage('', null);
  }

  function bloeckeSenden() {
    bloeckeSpeichern.disabled = true;
    bloeckeSage('Wird gespeichert …', null);
    ruf({ was: 'bloecke-speichern', datei: dateiname(), zone: 'stellen', bloecke: bloeckeNeu })
      .then(function (a) {
        if (a.s === 401) { bloeckeSage('Die Anmeldung ist abgelaufen. Bitte neu anmelden.', 'fehler'); return; }
        if (a.d && a.d.teilweise) {
          bloeckeSage('Gespeichert, aber noch nicht veröffentlicht. Bitte melden Sie das.', 'fehler'); return;
        }
        if (a.s !== 200 || !a.d || !a.d.ok) {
          bloeckeSpeichern.disabled = false;
          bloeckeSage('Speichern fehlgeschlagen (' + a.s +
            (a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') + ').', 'fehler');
          return;
        }
        bloeckeStand = JSON.stringify(bloeckeNeu);
        bloeckeKnopfStand();
        bloeckeSage('Gespeichert. In etwa einer Minute sichtbar — die Seite lädt gleich neu.', 'ok');
        setTimeout(function () { location.reload(); }, 3000);
      })
      .catch(function (e) {
        bloeckeSpeichern.disabled = false;
        bloeckeSage('Keine Verbindung (' + (e && e.message) + '). Der Zustand ist unbekannt — ' +
          'bitte die Seite neu laden und nachsehen.', 'fehler');
      });
  }

  function bloeckeSage(text, art) {
    if (!bloeckeMeldung) return;
    bloeckeMeldung.textContent = text;
    bloeckeMeldung.className = 'dvg-meldung' + (art ? ' dvg-meldung-' + art : '');
  }

  /* ---- Menü und Fußzeile -------------------------------------------
     Diese Texte stehen auf ALLEN Seiten. Deshalb sagt die Lade das
     ausdruecklich — wer hier tippt, aendert nicht nur die Seite, auf der
     er gerade steht. */

  function rahmenUmschalten() {
    if (rahmen) { rahmen.remove(); rahmen = null; return; }
    ladenSchliessen();

    rahmen = el('div', 'dvg-schublade');
    rahmen.setAttribute('role', 'group');
    rahmen.setAttribute('aria-label', 'Menü und Fußzeile');
    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Menü und Fußzeile'));
    kopf.appendChild(el('span', null,
      'Diese Beschriftungen erscheinen auf ALLEN Seiten. Eine Änderung hier ' +
      'wirkt überall — die Ziele der Verweise bleiben unverändert.'));
    rahmen.appendChild(kopf);
    rahmen.appendChild(el('div', 'dvg-ampel', 'Wird geladen …'));
    document.body.appendChild(rahmen);

    /* Der aktuelle Stand steht im Fenster — die Datendatei ist ja
       geladen. Kein Serverweg noetig, um ihn zu zeigen. */
    var T = window.RAHMEN_TEXTE;
    if (!T || typeof T !== 'object') {
      rahmen.lastChild.className = 'dvg-ampel dvg-ampel-rot';
      rahmen.lastChild.textContent =
        'Die Datei mit den Texten ist auf dieser Seite nicht geladen. ' +
        'Kopf- und Fußzeile laufen dann mit ihren eingebauten Werten.';
      return;
    }
    rahmen.removeChild(rahmen.lastChild);

    /* Tiefe Kopie als Arbeitsstand — der Betreiber soll verwerfen koennen. */
    rahmenStand = JSON.parse(JSON.stringify(T));
    rahmenNeu = JSON.parse(JSON.stringify(T));

    var feldZeile = function (beschriftung, lies, schreib, max) {
      var z = el('label', 'dvg-zeile');
      z.appendChild(el('span', 'dvg-zeile-kennung', beschriftung));
      var r = el('div', 'dvg-seo-feld');
      var f = document.createElement('textarea');
      f.className = 'dvg-feld';
      f.rows = max > 120 ? 3 : 1;
      f.value = lies();
      f.addEventListener('input', function () {
        var t = f.value.replace(/[\r\n]+/g, ' ');
        if (t !== f.value) f.value = t;
        schreib(t);
        f.classList.toggle('dvg-feld-neu', t !== lies.ausgang);
        rahmenKnopfStand();
      });
      lies.ausgang = lies();
      r.appendChild(f);
      z.appendChild(r);
      return z;
    };

    var gruppe = function (titel) {
      var g = el('div', 'dvg-gruppe');
      g.appendChild(el('div', 'dvg-gruppe-titel', titel));
      rahmen.appendChild(g);
      return g;
    };

    var menueGruppe = gruppe('Menü oben · ' + rahmenNeu.menue.length);
    rahmenNeu.menue.forEach(function (e, i) {
      menueGruppe.appendChild(feldZeile(e.datei,
        function () { return rahmenStand.menue[i].text; },
        function (v) { rahmenNeu.menue[i].text = v; }, 80));
    });

    var mehrGruppe = gruppe('Untermenü „' + rahmenNeu.menueMehrTitel + '" · ' + rahmenNeu.menueMehr.length);
    mehrGruppe.appendChild(feldZeile('Titel des Untermenüs',
      function () { return rahmenStand.menueMehrTitel; },
      function (v) { rahmenNeu.menueMehrTitel = v; }, 60));
    rahmenNeu.menueMehr.forEach(function (e, i) {
      mehrGruppe.appendChild(feldZeile(e.datei,
        function () { return rahmenStand.menueMehr[i].text; },
        function (v) { rahmenNeu.menueMehr[i].text = v; }, 80));
    });

    var knopfGruppe = gruppe('Knopf oben rechts');
    knopfGruppe.appendChild(feldZeile('Beschriftung',
      function () { return rahmenStand.knopf; },
      function (v) { rahmenNeu.knopf = v; }, 60));

    rahmenNeu.fussSpalten.forEach(function (sp, i) {
      var g = gruppe('Fußzeile · Spalte ' + (i + 1));
      g.appendChild(feldZeile('Überschrift',
        function () { return rahmenStand.fussSpalten[i].titel; },
        function (v) { rahmenNeu.fussSpalten[i].titel = v; }, 60));
      sp.links.forEach(function (l, j) {
        g.appendChild(feldZeile(l.datei,
          function () { return rahmenStand.fussSpalten[i].links[j].text; },
          function (v) { rahmenNeu.fussSpalten[i].links[j].text = v; }, 80));
      });
    });

    var fg = gruppe('Fußzeile · Text');
    [['Absatz oben', 'fussAbsatz', 400], ['Überschrift Kontakt', 'fussKontaktTitel', 60],
     ['Öffnungszeiten', 'fussZeiten', 80], ['Ort', 'fussOrt', 80],
     ['Zeile unten links', 'fussRechts', 160], ['Zeile unten rechts', 'fussGebiet', 160]
    ].forEach(function (p) {
      fg.appendChild(feldZeile(p[0],
        function () { return rahmenStand[p[1]]; },
        function (v) { rahmenNeu[p[1]] = v; }, p[2]));
    });

    var leisteR = el('div', 'dvg-seo-aktionen');
    rahmenMeldung = el('span', 'dvg-meldung');
    rahmenMeldung.setAttribute('role', 'status');
    rahmenSpeichern = el('button', 'dvg-knopf dvg-knopf-voll', 'Menü und Fußzeile speichern');
    rahmenSpeichern.type = 'button';
    rahmenSpeichern.addEventListener('click', rahmenSenden);
    leisteR.appendChild(rahmenMeldung); leisteR.appendChild(rahmenSpeichern);
    rahmen.appendChild(leisteR);
    rahmenKnopfStand();
    var erstes = rahmen.querySelector('textarea');
    if (erstes) erstes.focus();
  }

  function rahmenKnopfStand() {
    if (!rahmenSpeichern) return;
    var anders = JSON.stringify(rahmenNeu) !== JSON.stringify(rahmenStand);
    var leer = JSON.stringify(rahmenNeu).indexOf('""') >= 0;
    rahmenSpeichern.disabled = !anders || leer;
    if (leer) rahmenSage('Ein Feld ist leer — bitte ausfüllen.', 'fehler');
  }

  function rahmenSenden() {
    rahmenSpeichern.disabled = true;
    rahmenSage('Wird gespeichert …', null);
    ruf({ was: 'rahmen-speichern', texte: rahmenNeu }).then(function (a) {
      if (a.s === 401) { rahmenSage('Die Anmeldung ist abgelaufen. Bitte neu anmelden.', 'fehler'); return; }
      if (a.d && a.d.teilweise) {
        rahmenSage('Gespeichert, aber noch nicht veröffentlicht. Bitte melden Sie das.', 'fehler'); return;
      }
      if (a.s !== 200 || !a.d || !a.d.ok) {
        rahmenSpeichern.disabled = false;
        rahmenSage('Speichern fehlgeschlagen (' + a.s +
          (a.d && a.d.grund ? ' · ' + a.d.grund : a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') +
          (a.d && a.d.feld ? ' · Feld: ' + a.d.feld : '') + ').', 'fehler');
        return;
      }
      rahmenStand = JSON.parse(JSON.stringify(rahmenNeu));
      Array.prototype.forEach.call(rahmen.querySelectorAll('.dvg-feld'), function (x) {
        x.classList.remove('dvg-feld-neu');
      });
      rahmenKnopfStand();
      rahmenSage('Gespeichert. Die Änderung wirkt auf allen Seiten — in etwa einer Minute sichtbar.', 'ok');
    }).catch(function (e) {
      rahmenSpeichern.disabled = false;
      rahmenSage('Keine Verbindung (' + (e && e.message) + '). Der Zustand ist unbekannt — ' +
        'bitte die Seite neu laden und nachsehen.', 'fehler');
    });
  }

  function rahmenSage(text, art) {
    rahmenMeldung.textContent = text;
    rahmenMeldung.className = 'dvg-meldung' + (art ? ' dvg-meldung-' + art : '');
  }

  /* ---- Bilder ersetzen ---------------------------------------------

     Die drei Groessen entstehen im Browser, nicht auf dem Server: so
     bleibt der Bestand (400/800/1600 als WebP) erhalten, ohne dass eine
     Bildbibliothek in die Edge Function muss.

     Bewusst OHNE data:- oder blob:-Adressen. Die CSP dieser Seiten
     erlaubt nur img-src 'self'; eine Vorschau ueber eine solche Adresse
     waere blockiert, und die CSP dafuer zu lockern waere der falsche
     Preis. createImageBitmap nimmt die Datei direkt entgegen, gezeichnet
     wird auf eine <canvas> — beides unterliegt img-src nicht. */

  var BILD_GROESSEN = [400, 800, 1600];

  function bildBereitmachen(img) {
    img.classList.add('dvg-bild');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Bild ersetzen: ' + kurz(img.getAttribute('alt') || ''));
    var oeffne = function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      bildUmschalten(img);
    };
    img.addEventListener('click', oeffne);
    img.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') oeffne(ev);
    });
  }

  function bildUmschalten(img) {
    if (bild) { bild.remove(); bild = null; }
    ladenSchliessen('bild');

    var kennung = img.getAttribute('data-ed-img');
    bildNeu = null;

    bild = el('div', 'dvg-schublade');
    bild.setAttribute('role', 'group');
    bild.setAttribute('aria-label', 'Bild ersetzen');
    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Bild ersetzen'));
    kopf.appendChild(el('span', null,
      'Wählen Sie ein Foto von Ihrem Rechner. Die drei Größen für Handy, ' +
      'Tablet und großen Bildschirm werden hier erzeugt — Sie brauchen nur eine Datei. ' +
      'Am besten quer und mindestens 1600 Pixel breit.'));
    bild.appendChild(kopf);

    /* Auswahl */
    var zeileD = el('label', 'dvg-zeile');
    zeileD.appendChild(el('span', 'dvg-zeile-kennung', 'Neues Foto'));
    var rechtsD = el('div', 'dvg-seo-feld');
    var eingabe = document.createElement('input');
    eingabe.type = 'file';
    eingabe.accept = 'image/jpeg,image/png,image/webp';
    eingabe.className = 'dvg-datei';
    var stand = el('span', 'dvg-ampel', 'Noch kein Foto gewählt.');
    var leinwand = document.createElement('canvas');
    leinwand.className = 'dvg-vorschau';
    leinwand.hidden = true;
    rechtsD.appendChild(eingabe); rechtsD.appendChild(stand); rechtsD.appendChild(leinwand);
    zeileD.appendChild(rechtsD); bild.appendChild(zeileD);

    /* Alt-Text */
    var zeileA = el('label', 'dvg-zeile');
    zeileA.appendChild(el('span', 'dvg-zeile-kennung', 'Bildbeschreibung'));
    var rechtsA = el('div', 'dvg-seo-feld');
    var altFeld = document.createElement('textarea');
    altFeld.className = 'dvg-feld';
    altFeld.rows = 2;
    altFeld.value = img.getAttribute('alt') || '';
    var altAmpel = el('span', 'dvg-ampel');
    var altPruef = function () {
      var t = altFeld.value.replace(/[\r\n]+/g, ' ');
      if (t !== altFeld.value) altFeld.value = t;
      var n = t.trim().length;
      altAmpel.className = 'dvg-ampel dvg-ampel-' + (n === 0 ? 'rot' : n < 15 ? 'gelb' : 'gruen');
      altAmpel.textContent = n === 0
        ? 'Was ist auf dem Bild zu sehen? Ohne Beschreibung ist es für blinde Besucher und für Google unsichtbar.'
        : n < 15 ? 'Sehr knapp — ein ganzer Satz hilft mehr.'
        : 'Gut.';
      bildKnopfStand();
    };
    altFeld.addEventListener('input', altPruef);
    rechtsA.appendChild(altFeld); rechtsA.appendChild(altAmpel);
    zeileA.appendChild(rechtsA); bild.appendChild(zeileA);

    var leisteB = el('div', 'dvg-seo-aktionen');
    bildMeldung = el('span', 'dvg-meldung');
    bildMeldung.setAttribute('role', 'status');
    bildSpeichern = el('button', 'dvg-knopf dvg-knopf-voll', 'Bild speichern');
    bildSpeichern.type = 'button';
    bildSpeichern.addEventListener('click', function () { bildSenden(img, kennung, altFeld); });
    leisteB.appendChild(bildMeldung); leisteB.appendChild(bildSpeichern);
    bild.appendChild(leisteB);

    eingabe.addEventListener('change', function () {
      var f = eingabe.files && eingabe.files[0];
      if (!f) return;
      stand.className = 'dvg-ampel';
      stand.textContent = 'Wird umgerechnet …';
      bildUmrechnen(f, leinwand)
        .then(function (erg) {
          bildNeu = erg;
          leinwand.hidden = false;
          stand.className = 'dvg-ampel dvg-ampel-gruen';
          stand.textContent = 'Bereit: ' + erg.breite + ' × ' + erg.hoehe + ' Pixel, ' +
            BILD_GROESSEN.map(function (g, i) { return g + 'px ≈ ' + Math.round(erg.groessen[i] / 1024) + ' KB'; }).join(' · ');
          bildKnopfStand();
        })
        .catch(function (e) {
          bildNeu = null;
          leinwand.hidden = true;
          stand.className = 'dvg-ampel dvg-ampel-rot';
          stand.textContent = e && e.message ? e.message : 'Das Bild ließ sich nicht verarbeiten.';
          bildKnopfStand();
        });
    });

    document.body.appendChild(bild);
    altPruef();
    eingabe.focus();
  }

  function bildKnopfStand() {
    if (!bildSpeichern) return;
    var altOk = bild && bild.querySelector('textarea') &&
      bild.querySelector('textarea').value.trim().length > 0;
    bildSpeichern.disabled = !bildNeu || !altOk;
  }

  /* Datei -> drei WebP. Ohne Adressen: createImageBitmap nimmt den Blob
     direkt, gezeichnet wird auf eine Leinwand. */
  function bildUmrechnen(datei, vorschau) {
    if (datei.size > 25 * 1024 * 1024) {
      return Promise.reject(new Error('Die Datei ist größer als 25 MB.'));
    }
    if (!window.createImageBitmap) {
      return Promise.reject(new Error('Dieser Browser kann Bilder nicht umrechnen. Bitte einen aktuellen Browser verwenden.'));
    }
    return createImageBitmap(datei).then(function (bmp) {
      if (bmp.width < 800) {
        throw new Error('Das Bild ist nur ' + bmp.width + ' Pixel breit. Mindestens 1600 wären gut, unter 800 wird es unscharf.');
      }
      /* Vorschau: kleine Fassung, direkt auf die Leinwand — keine
         Bildadresse, also auch kein CSP-Problem. */
      var vb = 320, vh = Math.round(vb * bmp.height / bmp.width);
      vorschau.width = vb; vorschau.height = vh;
      vorschau.getContext('2d').drawImage(bmp, 0, 0, vb, vh);

      var aufgaben = BILD_GROESSEN.map(function (breite) {
        var w = Math.min(breite, bmp.width);
        var h = Math.round(w * bmp.height / bmp.width);
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(bmp, 0, 0, w, h);
        return new Promise(function (loese, brich) {
          c.toBlob(function (blob) {
            if (!blob) { brich(new Error('Das Umrechnen ist fehlgeschlagen.')); return; }
            /* ⚠ Nicht jeder Browser kann WebP schreiben — manche liefern
               still ein PNG zurueck. Das waere eine PNG-Datei unter einem
               .webp-Namen: funktioniert zwar, sprengt aber die Groesse und
               bricht mit der Konvention des Projekts. Deshalb pruefen. */
            if (blob.type !== 'image/webp') {
              brich(new Error('Dieser Browser kann kein WebP erzeugen (er liefert ' +
                (blob.type || 'ein unbekanntes Format') + '). Bitte Chrome, Edge oder Firefox verwenden.'));
              return;
            }
            var leser = new FileReader();
            leser.onload = function () {
              loese({ b64: String(leser.result).split(',')[1], bytes: blob.size });
            };
            leser.onerror = function () { brich(new Error('Die Datei ließ sich nicht lesen.')); };
            leser.readAsDataURL(blob);
          }, 'image/webp', 0.82);
        });
      });

      return Promise.all(aufgaben).then(function (teile) {
        var dateien = {};
        BILD_GROESSEN.forEach(function (g, i) { dateien[g] = teile[i].b64; });
        return { dateien: dateien, groessen: teile.map(function (t) { return t.bytes; }),
                 breite: bmp.width, hoehe: bmp.height };
      });
    });
  }

  function bildSenden(img, kennung, altFeld) {
    bildSpeichern.disabled = true;
    bildMeldung.className = 'dvg-meldung';
    bildMeldung.textContent = 'Wird gespeichert — Bilder brauchen einen Moment …';
    /* Aus dem bisherigen Dateinamen einen lesbaren Namensteil ableiten,
       damit die Mediathek spaeter nicht aus Zufallszeichen besteht. */
    var quelle = (img.getAttribute('src') || '').split('/').pop() || 'bild';
    var basis = quelle.replace(/-\d+\.webp$/, '').replace(/\.[a-z]+$/, '');

    ruf({ was: 'bild-speichern', datei: dateiname(), kennung: kennung,
          basis: basis, alt: altFeld.value.trim(), dateien: bildNeu.dateien })
      .then(function (a) {
        if (a.s === 401) { bildSage('Die Anmeldung ist abgelaufen. Bitte neu anmelden.', 'fehler'); return; }
        if (a.d && a.d.teilweise) {
          bildSage('Gespeichert, aber noch nicht veröffentlicht. Bitte melden Sie das.', 'fehler'); return;
        }
        if (a.s !== 200 || !a.d || !a.d.ok) {
          bildSpeichern.disabled = false;
          bildSage('Speichern fehlgeschlagen (' + a.s +
            (a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') + ').', 'fehler');
          return;
        }
        bildSage('Gespeichert. In etwa einer Minute ist das neue Bild sichtbar — ' +
          'die Seite lädt gleich neu.', 'ok');
        setTimeout(function () { location.reload(); }, 3000);
      })
      .catch(function (e) {
        bildSpeichern.disabled = false;
        bildSage('Keine Verbindung (' + (e && e.message) + '). Der Zustand ist unbekannt — ' +
          'bitte die Seite neu laden und nachsehen.', 'fehler');
      });
  }

  function bildSage(text, art) {
    bildMeldung.textContent = text;
    bildMeldung.className = 'dvg-meldung' + (art ? ' dvg-meldung-' + art : '');
  }

  /* ---- Titel und Google-Beschreibung -------------------------------
     Beurteilt wird in Klartext, nicht mit einem Zeichenzähler. „58 von
     60" sagt einem Handwerksmeister nichts; „Google schneidet den Titel
     wahrscheinlich ab" schon. */

  function seoUmschalten() {
    if (seo) { seo.remove(); seo = null; return; }
    ladenSchliessen('seo');

    var titelJetzt = document.title;
    var m = document.querySelector('meta[name="description"]');
    var beschrJetzt = m ? m.getAttribute('content') || '' : '';
    seoStart = { titel: titelJetzt, beschreibung: beschrJetzt };

    seo = el('div', 'dvg-schublade');
    seo.setAttribute('role', 'group');
    seo.setAttribute('aria-label', 'Titel und Google-Beschreibung');
    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Titel und Google-Beschreibung'));
    kopf.appendChild(el('span', null,
      'So erscheint diese Seite in den Suchergebnissen und beim Teilen. ' +
      'Die Adresse der Seite (canonical) lässt sich hier bewusst nicht ändern — ' +
      'ein falscher Wert nähme die Seite aus dem Suchindex.'));
    seo.appendChild(kopf);

    var felderSeo = [
      { schl: 'titel', beschriftung: 'Titel', wert: titelJetzt, zeilen: 2,
        kurz: 30, lang: 60,
        zuKurz: 'Der Titel ist sehr kurz — mit Ort und Leistung findet Google Sie besser.',
        zuLang: 'Der Titel ist zu lang, Google schneidet ihn in der Ergebnisliste wahrscheinlich ab.',
        gut: 'Gute Länge.' },
      { schl: 'beschreibung', beschriftung: 'Beschreibung', wert: beschrJetzt, zeilen: 4,
        kurz: 70, lang: 160,
        zuKurz: 'Die Beschreibung ist kurz — ein bis zwei ganze Sätze wirken in der Ergebnisliste besser.',
        zuLang: 'Die Beschreibung ist zu lang und wird in der Ergebnisliste abgeschnitten.',
        gut: 'Gute Länge.' }
    ];

    felderSeo.forEach(function (fd) {
      var zeile = el('label', 'dvg-zeile');
      zeile.appendChild(el('span', 'dvg-zeile-kennung', fd.beschriftung));
      var rechts = el('div', 'dvg-seo-feld');
      var feld = document.createElement('textarea');
      feld.className = 'dvg-feld';
      feld.rows = fd.zeilen;
      feld.value = fd.wert;
      var ampel = el('span', 'dvg-ampel');
      var werte = function () {
        var t = feld.value.replace(/[\r\n]+/g, ' ');
        if (t !== feld.value) feld.value = t;
        seoWerte[fd.schl] = t;
        var n = t.trim().length;
        var art = n === 0 ? 'rot' : n < fd.kurz ? 'gelb' : n > fd.lang ? 'gelb' : 'gruen';
        ampel.className = 'dvg-ampel dvg-ampel-' + art;
        ampel.textContent = n === 0 ? 'Darf nicht leer bleiben.'
          : n < fd.kurz ? fd.zuKurz : n > fd.lang ? fd.zuLang : fd.gut;
        feld.classList.toggle('dvg-feld-neu', t !== fd.wert);
        seoKnopfStand();
      };
      feld.addEventListener('input', werte);
      rechts.appendChild(feld); rechts.appendChild(ampel);
      zeile.appendChild(rechts);
      seo.appendChild(zeile);
      seoWerte[fd.schl] = fd.wert;
      werte();
    });

    var leisteSeo = el('div', 'dvg-seo-aktionen');
    seoMeldung = el('span', 'dvg-meldung');
    seoMeldung.setAttribute('role', 'status');
    seoSpeichern = el('button', 'dvg-knopf dvg-knopf-voll', 'Titel und Beschreibung speichern');
    seoSpeichern.type = 'button';
    seoSpeichern.addEventListener('click', seoSenden);
    leisteSeo.appendChild(seoMeldung); leisteSeo.appendChild(seoSpeichern);
    seo.appendChild(leisteSeo);

    document.body.appendChild(seo);
    seoKnopfStand();
    var erstes = seo.querySelector('textarea');
    if (erstes) erstes.focus();
  }

  function seoKnopfStand() {
    if (!seoSpeichern) return;
    var geaendertSeo = seoStart &&
      (seoWerte.titel !== seoStart.titel || seoWerte.beschreibung !== seoStart.beschreibung);
    var vollstaendig = String(seoWerte.titel || '').trim() && String(seoWerte.beschreibung || '').trim();
    seoSpeichern.disabled = !geaendertSeo || !vollstaendig;
  }

  function seoSenden() {
    seoSpeichern.disabled = true;
    seoMeldung.textContent = 'Wird gespeichert …';
    seoMeldung.className = 'dvg-meldung';
    ruf({ was: 'seo-speichern', datei: dateiname(),
          titel: seoWerte.titel, beschreibung: seoWerte.beschreibung,
          vorher: seoStart })
      .then(function (a) {
        if (a.s === 401) { seoSage('Die Anmeldung ist abgelaufen. Bitte neu anmelden.', 'fehler'); return; }
        if (a.d && a.d.teilweise) {
          seoSage('Gespeichert, aber noch nicht veröffentlicht. Bitte melden Sie das.', 'fehler');
          return;
        }
        if (a.s !== 200 || !a.d || !a.d.ok) {
          seoSpeichern.disabled = false;
          seoSage('Speichern fehlgeschlagen (' + a.s +
            (a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') + ').', 'fehler');
          return;
        }
        seoStart = { titel: seoWerte.titel, beschreibung: seoWerte.beschreibung };
        document.title = seoWerte.titel;
        var mm = document.querySelector('meta[name="description"]');
        if (mm) mm.setAttribute('content', seoWerte.beschreibung);
        Array.prototype.forEach.call(seo.querySelectorAll('.dvg-feld'), function (x) {
          x.classList.remove('dvg-feld-neu');
        });
        seoSage('Gespeichert. In etwa einer Minute ist es für alle sichtbar. ' +
          'Bis Google die Änderung übernimmt, können einige Tage vergehen.', 'ok');
      })
      .catch(function (e) {
        seoSpeichern.disabled = false;
        seoSage('Keine Verbindung (' + (e && e.message) + '). Der Zustand ist unbekannt — ' +
          'bitte die Seite neu laden und nachsehen.', 'fehler');
      });
  }

  function seoSage(text, art) {
    seoMeldung.textContent = text;
    seoMeldung.className = 'dvg-meldung' + (art ? ' dvg-meldung-' + art : '');
  }

  /* ---- Frühere Fassungen ------------------------------------------
     Git haelt die Staende ohnehin — der Betreiber soll sie sehen, ohne
     von Commits wissen zu muessen. Beschriftet wird deshalb mit Datum
     und Uhrzeit, nicht mit einer Kennung. */

  function verlaufUmschalten() {
    if (verlauf) { verlauf.remove(); verlauf = null; return; }
    ladenSchliessen('verlauf');
    verlauf = el('div', 'dvg-schublade');
    verlauf.setAttribute('role', 'group');
    verlauf.setAttribute('aria-label', 'Frühere Fassungen dieser Seite');
    var kopf = el('div', 'dvg-schublade-kopf');
    kopf.appendChild(el('strong', null, 'Frühere Fassungen'));
    kopf.appendChild(el('span', null, 'Wird geladen …'));
    verlauf.appendChild(kopf);
    document.body.appendChild(verlauf);

    ruf({ was: 'staende', datei: dateiname() }).then(function (a) {
      if (!verlauf) return;
      if (!a.d || !a.d.ok) {
        kopf.lastChild.textContent =
          a.s === 401 ? 'Die Anmeldung ist abgelaufen. Bitte im Verwaltungsbereich neu anmelden.'
          : a.s === 501 ? 'Dafür fehlt dem Server noch das Schreibrecht am Repository.'
          : 'Die Liste ließ sich nicht laden (' + a.s + ').';
        return;
      }
      var staende = a.d.staende || [];
      kopf.lastChild.textContent = staende.length
        ? 'Jede Zeile ist ein gespeicherter Stand dieser Seite. Beim Wiederherstellen geht nichts verloren — der Schritt selbst lässt sich genauso zurücknehmen.'
        : 'Für diese Seite gibt es noch keine früheren Stände.';

      staende.forEach(function (s, i) {
        var z = el('div', 'dvg-stand');
        var links = el('div', 'dvg-stand-text');
        links.appendChild(el('strong', null, zeitpunkt(s.datum) + (i === 0 ? ' · aktueller Stand' : '')));
        links.appendChild(el('span', null, s.nachricht));
        z.appendChild(links);
        if (i > 0) {
          var k = el('button', 'dvg-knopf dvg-knopf-still', 'Wiederherstellen');
          k.type = 'button';
          k.addEventListener('click', function () { zurueckAuf(s, k); });
          z.appendChild(k);
        }
        verlauf.appendChild(z);
      });
    }).catch(function (e) {
      if (verlauf) kopf.lastChild.textContent = 'Keine Verbindung (' + (e && e.message) + ').';
    });
  }

  function zurueckAuf(s, knopf) {
    if (geaendert.size && !window.confirm(
      'Sie haben ' + geaendert.size + ' ungespeicherte Änderung(en). Beim Wiederherstellen gehen die verloren. Fortfahren?')) return;
    if (!window.confirm('Diese Seite auf den Stand vom ' + zeitpunkt(s.datum) + ' zurücksetzen?')) return;
    knopf.disabled = true; knopf.textContent = 'Wird zurückgesetzt …';
    ruf({ was: 'stand-zurueck', datei: dateiname(), sha: s.sha }).then(function (a) {
      if (a.d && a.d.fehler === 'stand_zu_alt') {
        knopf.disabled = false; knopf.textContent = 'Wiederherstellen';
        window.alert(a.d.hinweis);
        return;
      }
      if (a.d && a.d.teilweise) {
        knopf.textContent = 'Teilweise';
        melde('Zurückgesetzt, aber noch nicht veröffentlicht. Auf der Live-Seite steht der ' +
          'alte Stand noch. Bitte melden Sie das.', 'fehler');
        return;
      }
      if (a.s !== 200 || !a.d || !a.d.ok) {
        knopf.disabled = false; knopf.textContent = 'Wiederherstellen';
        melde('Zurücksetzen fehlgeschlagen (' + a.s +
          (a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') + ').', 'fehler');
        return;
      }
      knopf.textContent = 'Zurückgesetzt';
      melde('Zurückgesetzt. In etwa einer Minute ist der Stand für alle sichtbar — die Seite lädt gleich neu.', 'ok');
      /* Neu laden, damit der Betreiber den wiederhergestellten Text
         wirklich vor sich hat statt der alten Fassung im Fenster. */
      geaendert.clear();
      setTimeout(function () { location.reload(); }, 2500);
    }).catch(function (e) {
      knopf.disabled = false; knopf.textContent = 'Wiederherstellen';
      melde('Keine Verbindung (' + (e && e.message) + ').', 'fehler');
    });
  }

  /* Gemeinsamer Aufruf — dieselbe Form wie im uebrigen
     Verwaltungsbereich: { was, sitzung, … } im Rumpf. */
  function ruf(nutzlast) {
    nutzlast.sitzung = kennzeichen;
    return fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nutzlast)
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
        .then(function (d) { return { s: r.status, d: d }; });
    });
  }

  function zeitpunkt(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    } catch (e) { return String(iso || '').slice(0, 16); }
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
    /* Ein leer gemachtes Feld verschwindet auf der Seite spurlos — die
       Ueberschrift ist dann fort, und beim naechsten Bearbeiten gibt es
       nichts mehr anzuklicken, was man wieder fuellen koennte. Deshalb
       nachfragen statt es geschehen zu lassen. */
    var leere = [];
    geaendert.forEach(function (wert, kennung) { if (!String(wert).trim()) leere.push(kennung); });
    if (leere.length && !window.confirm(
      leere.length + ' Stelle(n) sind jetzt leer und verschwinden damit von der Seite. ' +
      'Sie lassen sich später nur noch über „Frühere Fassung" zurückholen. Trotzdem speichern?')) {
      speichernEl.disabled = false;
      melde('Nicht gespeichert. Die leeren Stellen sind orange markiert.', null);
      return;
    }

    /* "vorher" ist der Wert, den DIESES Fenster beim Oeffnen vorgefunden
       hat. Der Server vergleicht ihn mit dem, was inzwischen in der Datei
       steht — sonst ueberschreiben sich zwei offene Editorfenster
       lautlos, und der erste erfaehrt nie davon. */
    var nutzlast = { was: 'texte-speichern', datei: dateiname(), texte: {}, vorher: {} };
    geaendert.forEach(function (wert, kennung) { nutzlast.texte[kennung] = wert; });
    felder.forEach(function (f) {
      if (geaendert.has(f.kennung)) nutzlast.vorher[f.kennung] = f.alt;
    });

    ruf(nutzlast).then(function (a) {
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
      /* Teilerfolg ist NICHT dasselbe wie Scheitern. Der Server sagt
         ausdruecklich, wenn der Arbeitsstand die Aenderung schon traegt,
         die veroeffentlichte Fassung aber nicht. Wer hier "fehlgeschlagen"
         liest, haelt es fuer folgenlos und geht — und beim naechsten
         Veroeffentlichen geht die geglaubt-verworfene Aenderung
         ungeprueft live. Der Knopf bleibt gesperrt, damit nicht doppelt
         committet wird. */
      if (a.d && a.d.teilweise) {
        melde('Gespeichert, aber noch nicht veröffentlicht. Die Änderung ist gesichert (' +
          (a.d.geschrieben || []).join(', ') + '), auf der Live-Seite steht sie noch nicht. ' +
          'Bitte melden Sie das — erneutes Speichern hilft hier nicht.', 'fehler');
        return;
      }
      if (a.s !== 200 || !a.d || !a.d.ok) {
        /* Welche Stelle schuld ist, weiss der Server — ein blosser Code
           laesst den Betreiber unter bis zu 200 Feldern suchen. */
        var wo = a.d && (a.d.kennung || (a.d.kennungen || []).join(', '));
        melde('Speichern fehlgeschlagen (' + a.s +
          (a.d && a.d.fehler ? ' · ' + klartext(a.d.fehler) : '') +
          (wo ? ' · betrifft: ' + wo : '') + ').', 'fehler');
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

  /* Die Fehlerworte des Servers sind fuer Entwickler geschrieben. */
  function klartext(f) {
    var karte = {
      steuerzeichen: 'unerlaubtes Sonderzeichen im Text',
      text_zu_lang: 'Text zu lang (höchstens 2000 Zeichen)',
      wert_kein_text: 'ungültiger Wert',
      kennung_ungueltig: 'ungültige Kennung',
      zu_viele_texte: 'zu viele Änderungen auf einmal',
      marker_nicht_gefunden: 'diese Stelle gibt es in der Datei nicht mehr — bitte die Seite neu laden',
      seite_nicht_freigegeben: 'diese Seite ist für den Editor nicht freigegeben',
      stand_nicht_angeboten: 'diese Fassung gehört nicht zum Verlauf dieser Seite',
      nicht_gespeichert: 'der Server konnte nicht schreiben',
      inzwischen_geaendert: 'diese Stelle wurde zwischenzeitlich anderswo geändert — bitte die Seite neu laden',
      titel_leer: 'der Titel darf nicht leer sein',
      beschreibung_leer: 'die Beschreibung darf nicht leer sein',
      titel_zu_lang: 'der Titel ist zu lang',
      beschreibung_zu_lang: 'die Beschreibung ist zu lang',
      feld_nicht_gefunden: 'ein SEO-Feld fehlt im Markup dieser Seite',
      alt_leer: 'die Bildbeschreibung darf nicht leer sein',
      bild_zu_gross: 'das Bild ist zu groß',
      bild_nicht_gefunden: 'dieses Bild gibt es in der Datei nicht mehr — bitte neu laden',
      rahmen_ungueltig: 'eine Angabe für Menü oder Fußzeile ist nicht gültig',
      erzeugung_fehlgeschlagen: 'die Datei ließ sich nicht erzeugen — nichts wurde gespeichert',
      zone_nicht_gefunden: 'der Bereich für Stellen fehlt in der Datei — bitte neu laden',
      block_titel_fehlt: 'eine Stelle hat keine Bezeichnung',
      block_text_fehlt: 'eine Stelle hat keine Beschreibung',
      zu_viele_bloecke: 'höchstens 20 Stellen'
    };
    return karte[f] || f;
  }

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

      /* Bloecke */
      '.dvg-gruppe-kopf{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.dvg-block-werkzeuge{display:flex;gap:6px}',
      '.dvg-mini{min-height:30px;padding:4px 11px;font-size:14px;line-height:1}',

      /* Bilder */
      '.dvg-bearbeiten .dvg-bild{outline:2px dashed rgba(44,110,73,.5);outline-offset:4px;cursor:pointer;',
      '  transition:outline-color .15s cubic-bezier(.4,0,.2,1)}',
      '.dvg-bearbeiten .dvg-bild:hover,.dvg-bearbeiten .dvg-bild:focus{outline:3px solid #2C6E49}',
      '.dvg-datei{font:inherit;font-size:14px;color:var(--ink)}',
      '.dvg-vorschau{max-width:320px;width:100%;height:auto;border-radius:8px;',
      '  border:1px solid rgba(16,35,26,.16);margin-top:4px}',

      /* Titel und Beschreibung */
      '.dvg-seo-feld{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.dvg-ampel{font-size:12.5px;line-height:1.45}',
      '.dvg-ampel-gruen{color:#2C6E49}',
      '.dvg-ampel-gelb{color:#8A5A12}',
      '.dvg-ampel-rot{color:var(--rot);font-weight:600}',
      '.dvg-seo-aktionen{display:flex;align-items:center;justify-content:flex-end;gap:16px;',
      '  flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid rgba(16,35,26,.1)}',

      /* Liste der frueheren Staende */
      '.dvg-stand{display:flex;align-items:center;justify-content:space-between;gap:16px;',
      '  padding:12px 0;border-top:1px solid rgba(16,35,26,.09)}',
      '.dvg-stand-text{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.dvg-stand-text strong{font-size:14.5px;font-weight:600;color:var(--ink)}',
      '.dvg-stand-text span{font-size:12.5px;color:var(--mut);overflow-wrap:anywhere}',
      '.dvg-stand .dvg-knopf{flex:none;min-height:36px;padding:8px 16px;font-size:13.5px}',

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
