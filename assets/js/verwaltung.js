/* =====================================================================
   Verwaltung — Backoffice der Website

   Aufbau nach dem Vorbild der Schwesterseite: Anmeldung, Kachel-
   Uebersicht mit Zaehlern, Liste mit Suche und Statusfiltern,
   Detailansicht mit Status, Notiz, Archiv und Loeschen, CSV-Export.

   Wichtig zur Sicherheit:
   · Im Quelltext dieser Seite steht KEIN Geheimnis. Das Passwort geht
     bei jeder Anfrage mit und wird ausschliesslich serverseitig in der
     Edge Function geprueft.
   · Gelesen wird nie direkt aus der Datenbank — der oeffentliche
     Schluessel darf das gar nicht. Alles laeuft ueber die Funktion.
   · Das Passwort liegt nur im Speicher dieser Seite, nicht in
     localStorage. Ein Neuladen bedeutet neu anmelden. Das ist Absicht:
     auf einem fremden Rechner bleibt nichts zurueck.
   ===================================================================== */
(function () {
  "use strict";

  var BASIS = 'https://pvcbgwzqjnzzpehwuywi.supabase.co/functions/v1/verwaltung';
  /* Das Passwort geht genau EINMAL ueber die Leitung — bei der Anmeldung.
     Danach arbeitet die Seite mit einem Kennzeichen, das der Server
     ausstellt und das nach acht Stunden verfaellt.

     Abgelegt in sessionStorage, nicht in localStorage: ein Neuladen
     behaelt die Anmeldung, das Schliessen des Reiters beendet sie. Genau
     dieses Verhalten will man an einem Rechner, der auch anderen
     zugaenglich ist. */
  var SCHLUESSEL = 'dvg-verwaltung-sitzung';
  var pw = '';
  var sitzung = '';

  function sitzungLesen() {
    try { return window.sessionStorage.getItem(SCHLUESSEL) || ''; } catch (e) { return ''; }
  }
  function sitzungMerken(wert) {
    try {
      if (wert) window.sessionStorage.setItem(SCHLUESSEL, wert);
      else window.sessionStorage.removeItem(SCHLUESSEL);
    } catch (e) { /* ohne Speicher laeuft alles weiter, nur ohne Merken */ }
  }
  var daten = { anfragen: null, bewerbungen: null };
  var bereich = 'anfragen';
  var filter = 'alle';
  var suche = '';
  var offen = null;
  /* Zahlen vom Server (Antwort auf "anmelden"). Sie gelten fuer Bereiche,
     die in dieser Sitzung noch nicht geladen wurden — sonst zeigte die
     Kachel beim Ruecksprung aus einer Liste hart "0 neu" an, obwohl dort
     ungelesene Eintraege liegen. */
  var serverNeu = { anfragen: 0, bewerbungen: 0 };
  /* Voller Stand vom Server: neu, gesamt und letzter Eingang je Bereich. */
  var stand = { anfragen: null, bewerbungen: null };
  var uhr = null;

  function uebernehmeStand(s) {
    if (!s) return;
    stand = s;
    serverNeu = { anfragen: (s.anfragen || {}).neu || 0, bewerbungen: (s.bewerbungen || {}).neu || 0 };
  }

  /* Solange die Seite offen ist, alle 60 s nachsehen, ob etwas
     hinzugekommen ist. Das ersetzt keine Mail-Benachrichtigung, macht die
     Verwaltung aber zu etwas, das man nebenher offen lassen kann.
     Angehalten, wenn der Reiter im Hintergrund liegt — sonst laeuft die
     Abfrage nachts durch, ohne dass jemand hinsieht. */
  function startUhr() {
    stopUhr();
    uhr = window.setInterval(function () {
      if (document.hidden || !sitzung && !pw) return;
      ruf({ was: 'stand' })
        .then(function (a) {
          var vorher = serverNeu.anfragen + serverNeu.bewerbungen;
          uebernehmeStand(a.stand);
          var jetzt = serverNeu.anfragen + serverNeu.bewerbungen;
          if (jetzt > vorher) zeigeNeuHinweis(jetzt - vorher);
          if ($('.vw-kacheln')) zeigeUebersicht(zaehleNeu());
        })
        .catch(function () { /* stiller Fehlversuch, beim naechsten Mal wieder */ });
    }, 60000);
  }
  function stopUhr() { if (uhr) { window.clearInterval(uhr); uhr = null; } }

  function zeigeNeuHinweis(anzahl) {
    var alt = $('#vw-neu');
    if (alt) alt.remove();
    var d = document.createElement('div');
    d.id = 'vw-neu';
    d.className = 'vw-neu';
    d.setAttribute('role', 'status');
    d.innerHTML = '<span>' + anzahl + (anzahl === 1 ? ' neuer Eintrag' : ' neue Einträge') +
      ' eingegangen</span><button class="vw-neu__knopf" id="vw-neu-laden">Anzeigen</button>' +
      '<button class="vw-neu__zu" aria-label="Hinweis schließen">✕</button>';
    document.body.appendChild(d);
    d.querySelector('.vw-neu__zu').addEventListener('click', function () { d.remove(); });
    $('#vw-neu-laden').addEventListener('click', function () {
      d.remove();
      daten = { anfragen: null, bewerbungen: null };
      offen = null;
      zeigeUebersicht(zaehleNeu());
    });
  }
  /* Zuletzt geloeschter Eintrag, damit "Rueckgaengig" ihn zurueckholen
     kann. Bewusst nur im Speicher dieser Seite: "endgueltig loeschen"
     soll auch endgueltig heissen — nach dem Verlassen der Seite ist der
     Eintrag wirklich fort, es gibt keinen Papierkorb in der Datenbank. */
  var papierkorb = null;
  /* Waehrend eines Sprungs ueber die Zurueck-Taste keinen neuen
     Verlaufseintrag anlegen, sonst kaeme man nie rueckwaerts heraus. */
  var verlaufAus = false;
  var gekappt = { anfragen: false, bewerbungen: false };
  /* Was gerade im Notizfeld steht, aber noch nicht gespeichert ist. Ohne
     das war jede getippte Notiz weg, sobald man Status oder Archiv
     anklickte — die Detailansicht wird dabei komplett neu gezeichnet. */
  var notizEntwurf = null;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function ruf(auftrag) {
    /* Kennzeichen bevorzugen; das Passwort nur bei der Anmeldung. */
    if (sitzung) auftrag.sitzung = sitzung; else auftrag.passwort = pw;
    return fetch(BASIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auftrag)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var f = new Error(j && j.fehler ? j.fehler : 'Fehler ' + r.status);
          /* 401 MITTEN IN DER SITZUNG heisst: das Passwort gilt nicht mehr
             (geaendert, oder die Seite lag lange offen). Vorher stand dann
             nur "Passwort falsch" an einer Karte, waehrend die Oberflaeche
             weiter so tat, als sei man angemeldet.
             Bei der Anmeldung selbst ist 401 dagegen der Normalfall einer
             Falscheingabe — dort NICHT abmelden, sonst ueberschreibt die
             Meldung die eigentliche Fehlermeldung. */
          if (r.status === 401 && auftrag.was !== 'anmelden') {
            f.abgemeldet = true;
            pw = ''; sitzung = ''; sitzungMerken('');
            daten = { anfragen: null, bewerbungen: null };
            offen = null; notizEntwurf = null; papierkorb = null;
            zeigePapierkorb();
            zeigeAnmeldung('Die Anmeldung gilt nicht mehr. Bitte melden Sie sich erneut an.');
          }
          throw f;
        }
        return j;
      });
    });
  }

  var FELDER = {
    anfragen: [
      ['name', 'Name'], ['email', 'E-Mail'], ['telefon', 'Telefon'], ['ort', 'Ort'],
      ['art', 'Auftraggeber'], ['bereich', 'Bereich'], ['zeitraum', 'Zeitraum'],
      ['quelle', 'Seite'], ['nachricht', 'Nachricht']
    ],
    bewerbungen: [
      ['name', 'Name'], ['email', 'E-Mail'], ['telefon', 'Telefon'],
      ['stelle', 'Stelle'], ['verfuegbar_ab', 'Verfügbar ab'], ['nachricht', 'Nachricht']
    ]
  };
  var STATUS = [['neu', 'Neu'], ['in_arbeit', 'In Arbeit'], ['erledigt', 'Erledigt']];

  /* Die Unterlagen einer Bewerbung — neue Spalte bevorzugt, alte
     Einzelspalten als Rueckfall. Es gibt Zeilen aus der Zeit vor der
     Mehrfach-Auswahl, die nur "datei"/"datei_name" tragen.
     Die Reihenfolge ist massgeblich: Der Server bekommt beim Oeffnen die
     NUMMER und schlaegt den Pfad in derselben Reihenfolge nach. */
  function unterlagen(z) {
    if (!z) return [];
    if (Array.isArray(z.dateien) && z.dateien.length) {
      return z.dateien
        .filter(function (u) { return u && u.pfad; })
        .map(function (u) { return { name: String(u.name || 'Unterlage.pdf') }; });
    }
    if (z.datei) return [{ name: String(z.datei_name || 'Lebenslauf.pdf') }];
    return [];
  }

  function datum(s) {
    try {
      var d = new Date(s);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(s || ''); }
  }

  /* ---------- Verlauf ----------
     Ohne das fuehrt die Zurueck-Taste aus der Verwaltung heraus — und weil
     das Passwort nur im Speicher liegt, bedeutet ein Zurueck-und-wieder-vor
     eine vollstaendige Neuanmeldung. Die Ansichten bekommen deshalb eigene
     Verlaufseintraege; die Zurueck-Knoepfe in der Seite loesen dieselbe
     Bewegung aus wie die des Browsers. */
  function verlaufSetz(z, ersetzen) {
    if (verlaufAus) return;
    try {
      if (ersetzen) history.replaceState(z, '');
      else history.pushState(z, '');
    } catch (e) { /* ohne Verlauf funktioniert alles weiter */ }
  }

  window.addEventListener('popstate', function (e) {
    if (!pw && !sitzung) return;            // nicht angemeldet: nichts zu tun
    var z = e.state || { ansicht: 'uebersicht' };
    verlaufAus = true;
    try {
      if (z.ansicht === 'detail' && z.bereich) {
        bereich = z.bereich;
        var f = (daten[bereich] || []).filter(function (r) { return r.id === z.id; })[0];
        notizEntwurf = null;
        if (f) { offen = f; zeigeDetail(); } else { offen = null; zeigeListe(false); }
      } else if (z.ansicht === 'liste' && z.bereich) {
        bereich = z.bereich; offen = null; notizEntwurf = null; zeigeListe(false);
      } else if (z.ansicht === 'seiten') {
        offen = null; notizEntwurf = null; zeigeSeiten();
      } else if (z.ansicht === 'sicherungen') {
        /* false: die Liste liegt schon im Speicher. Beim Zurueckgehen
           erneut zu laden hiesse, fuer jeden Stand einen neuen
           unterschriebenen Verweis erzeugen zu lassen — unnoetig. */
        offen = null; notizEntwurf = null; zeigeSicherungen(false);
      } else {
        offen = null; notizEntwurf = null; zeigeUebersicht(zaehleNeu());
      }
    } finally { verlaufAus = false; }
  });

  /* Nach jedem Ansichtswechsel den Einstiegspunkt setzen. Ohne das landet
     die Tastaturbedienung wieder ganz oben am Seitenanfang, und ein
     Screenreader liest nicht vor, wo man gelandet ist. */
  function fokusAufUeberschrift() {
    var h = $('#vw-app h1');
    if (!h) return;
    h.setAttribute('tabindex', '-1');
    try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
  }

  /* ---------- Anmeldung ---------- */
  function zeigeAnmeldung(meldung) {
    $('#vw-app').innerHTML =
      '<div class="vw-mitte vw-anmeldung">' +
        '<div class="vw-karte" style="max-width:420px;margin:0 auto">' +
          '<p class="vw-eyebrow">de Vries Galabau</p>' +
          '<h1 class="vw-h1">Verwaltung</h1>' +
          '<p class="vw-hint" style="margin:10px 0 20px">Bitte melden Sie sich an.</p>' +
          '<form id="vw-login">' +
            '<label class="vw-label" for="vw-pw">Passwort</label>' +
            '<input class="vw-input" id="vw-pw" type="password" autocomplete="current-password" required>' +
            (meldung ? '<p class="vw-fehler" role="alert">' + esc(meldung) + '</p>' : '') +
            '<button class="vw-btn vw-btn--voll" type="submit">Anmelden</button>' +
          '</form>' +
        '</div>' +
      '</div>';
    $('#vw-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var knopf = e.target.querySelector('button');
      knopf.disabled = true; knopf.textContent = 'Prüfe …';
      pw = $('#vw-pw').value;
      ruf({ was: 'anmelden' })
        .then(function (a) {
          if (a.sitzung) { sitzung = a.sitzung; sitzungMerken(sitzung); pw = ''; }
          uebernehmeStand(a.stand);
          verlaufSetz({ ansicht: 'uebersicht' }, true);
          zeigeUebersicht(zaehleNeu());
        })
        .catch(function (f) { pw = ''; zeigeAnmeldung(verstaendlich(f)); });
    });
    $('#vw-pw').focus();
  }

  /* ---------- Uebersicht ---------- */
  function zeigeUebersicht(neu) {
    neu = neu || { anfragen: 0, bewerbungen: 0 };
    var kachel = function (schl, titel, symbol) {
      var s = stand[schl] || {};
      var zeile2 = (s.gesamt != null ? ' von ' + s.gesamt : '');
      var letzter = s.letzter
        ? '<span class="vw-kachel__zeit">zuletzt ' + esc(datum(s.letzter)) + '</span>'
        : (s.gesamt === 0 ? '<span class="vw-kachel__zeit">noch nichts eingegangen</span>' : '');
      return '<button class="vw-kachel" data-geh="' + schl + '">' +
        '<span class="vw-kachel__kopf"><span class="vw-symbol" aria-hidden="true">' + symbol + '</span>' +
        '<span class="vw-kachel__titel">' + titel + '</span></span>' +
        '<span class="vw-kachel__zahl"><b>' + neu[schl] + '</b> neu' + zeile2 + '</span>' +
        letzter + '</button>';
    };
    $('#vw-app').innerHTML =
      '<div class="vw-mitte">' +
        '<div class="vw-kopf">' +
          '<div><p class="vw-eyebrow">de Vries Galabau</p><h1 class="vw-h1">Verwaltung</h1></div>' +
          '<button class="vw-btn vw-btn--leer" id="vw-abmelden">Abmelden</button>' +
        '</div>' +
        '<div class="vw-kacheln">' +
          kachel('anfragen', 'Anfragen', '✉') +
          kachel('bewerbungen', 'Bewerbungen', '📄') +
          /* Bearbeiten braucht Auswahl, Cursor und eine Werkzeugleiste —
             auf dem Telefon ist das nicht sinnvoll bedienbar. Die Kachel
             erscheint deshalb erst ab Rechnerbreite. Das ist eine
             Bedienentscheidung, keine Sicherheitsgrenze. */
          (amRechner()
            ? '<button class="vw-kachel" data-seiten="1">' +
                '<span class="vw-kachel__kopf"><span class="vw-symbol" aria-hidden="true">✍️</span>' +
                '<span class="vw-kachel__titel">Seiten bearbeiten</span></span>' +
                '<span class="vw-kachel__zahl">Texte ändern</span>' +
                '<span class="vw-kachel__zeit">direkt auf der Seite</span>' +
              '</button>'
            : '') +
          /* Sicherungen: am Telefon nur ansehen und herunterladen —
             das ist sinnvoll bedienbar, anders als das Bearbeiten. */
          '<button class="vw-kachel" data-sicherungen="1">' +
            '<span class="vw-kachel__kopf"><span class="vw-symbol" aria-hidden="true">💾</span>' +
            '<span class="vw-kachel__titel">Sicherungen</span></span>' +
            '<span class="vw-kachel__zahl">Stand herunterladen</span>' +
            '<span class="vw-kachel__zeit">automatisch jede Nacht</span>' +
          '</button>' +
        '</div>' +
        '<p class="vw-hint vw-nurGross" style="margin-top:22px">' +
          'Die vollständige Verwaltung steht am Rechner zur Verfügung. Auf dem Telefon ' +
          'sehen Sie Anfragen und Bewerbungen, können Status und Notiz aber nicht ändern.</p>' +
      '</div>';
    $('#vw-abmelden').addEventListener('click', abmelden);
    fokusAufUeberschrift();
    startUhr();
    var sichKnopf = document.querySelector('[data-sicherungen]');
    if (sichKnopf) sichKnopf.addEventListener('click', function () {
      verlaufSetz({ ansicht: 'sicherungen' });
      zeigeSicherungen(true);
    });
    var seitenKnopf = document.querySelector('[data-seiten]');
    if (seitenKnopf) seitenKnopf.addEventListener('click', function () {
      verlaufSetz({ ansicht: 'seiten' });
      zeigeSeiten();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-geh]'), function (b) {
      b.addEventListener('click', function () {
        bereich = b.getAttribute('data-geh'); filter = 'alle'; suche = ''; offen = null;
        verlaufSetz({ ansicht: 'liste', bereich: bereich });
        zeigeListe(true);
      });
    });
  }

  /* Ab dieser Breite gilt "Rechner". Dieselbe Grenze benutzt editor.js —
     sonst gaebe es einen Streifen, in dem die Kachel erscheint, der
     Editor sich aber weigert. */
  function amRechner() { return window.innerWidth >= 1024; }

  /* Welche Seiten sind fuer den Editor vorbereitet?
     "vorbereitet" heisst: das Markup traegt die data-ed-Kennungen, ohne
     die der Server nicht weiss, welche Stelle er ersetzen soll. Die
     Liste steht hier bewusst im Klartext statt geraten zu werden — eine
     Seite faelschlich als bearbeitbar anzubieten fuehrt zu einem Editor
     ohne einzige bearbeitbare Stelle, und das sieht aus wie ein Fehler. */
  var SEITEN = [
    { datei: 'index.html',          titel: 'Startseite',          bereit: true  },
    { datei: 'ueber-uns.html',      titel: 'Über uns',            bereit: true  },
    { datei: 'gartengestaltung.html', titel: 'Gartengestaltung',    bereit: true  },
    { datei: 'gartenplanung.html',  titel: 'Gartenplanung',       bereit: true  },
    { datei: 'gartenpflege.html',   titel: 'Gartenpflege',        bereit: true  },
    { datei: 'bepflanzung.html',    titel: 'Bepflanzung',         bereit: true  },
    { datei: 'referenzen.html',     titel: 'Referenzen',          bereit: true  },
    { datei: 'kontakt.html',        titel: 'Kontakt',             bereit: true  },
    { datei: 'anfrage.html',        titel: 'Kostenlose Anfrage',  bereit: true  },
    { datei: 'stellenangebote.html', titel: 'Stellenangebote',     bereit: true  },
    { datei: 'impressum.html',      titel: 'Impressum',           bereit: true  },
    { datei: 'datenschutz.html',    titel: 'Datenschutz',         bereit: true  },
    { datei: 'danke.html',          titel: 'Danke-Seite',         bereit: true  },
    { datei: '404.html',            titel: 'Fehlerseite 404',     bereit: true  },
  ];


  function zeigeSeiten() {
    /* Der Editor liest sein Anmeldekennzeichen aus dem sessionStorage
       DIESES Reiters. Deshalb darf der Verweis kein target="_blank"
       tragen — ein neuer Reiter hat den Speicher nicht. */
    var wurzel = location.pathname.replace(/admin\/?$/, '');
    var karten = SEITEN.map(function (s) {
      /* Bewusst die vorhandenen Zeilenklassen benutzen statt neue zu
         erfinden — sonst haette die Verwaltung zwei fast gleiche
         Zeilenbilder, die bei jeder Designaenderung auseinanderlaufen. */
      var innen =
        '<span class="vw-zeile__haupt">' +
          '<span class="vw-zeile__name">' + esc(s.titel) + '</span>' +
          '<span class="vw-zeile__meta">' + esc(s.datei) + '</span>' +
        '</span>';
      if (!s.bereit) {
        return '<div class="vw-zeile vw-zeile--aus">' + innen +
          '<span class="vw-zeile__meta">noch nicht vorbereitet</span></div>';
      }
      return '<a class="vw-zeile" href="' + esc(wurzel + s.datei) + '?bearbeiten=1">' + innen +
        '<span class="vw-zeile__meta">bearbeiten →</span></a>';
    }).join('');

    $('#vw-app').innerHTML =
      '<div class="vw-mitte">' +
        '<button class="vw-zurueck" id="vw-zurueck">← Übersicht</button>' +
        '<h1 class="vw-h1">Seiten bearbeiten</h1>' +
        '<p class="vw-hint" style="margin:10px 0 20px;max-width:62ch">' +
          'Wählen Sie eine Seite. Sie öffnet sich ganz normal — bearbeitbare Stellen sind ' +
          'gestrichelt umrandet. Anklicken, tippen, unten speichern. Nach dem Speichern ' +
          'dauert es etwa eine Minute, bis die Änderung für alle sichtbar ist.</p>' +
        '<div class="vw-karte vw-karte--liste"><div class="vw-liste">' + karten + '</div></div>' +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () {
      verlaufSetz({ ansicht: 'uebersicht' });
      zeigeUebersicht(zaehleNeu());
    });
    fokusAufUeberschrift();
  }

  /* ---------- Sicherungen ----------
     Warum das hier ueberhaupt steht: Der Seiten-Editor schreibt auf einer
     LIVEN Seite. Git haelt jede Textaenderung — aber weder die Anfragen
     und Bewerbungen noch die hochgeladenen Unterlagen. Genau die kann
     niemand neu tippen. */
  var sicherungen = null;

  function groesse(b) {
    b = Number(b) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* Der Verweis kommt zwar aus unserer eigenen Funktion, wird aber als
     href eingesetzt. Ein Wert, der als Adresse gerendert wird, gehoert
     geprueft — sonst haenge die Sicherheit daran, dass sich der Server
     nie irrt. Erlaubt ist genau der Speicherbereich dieses Projekts. */
  function verweisOk(u) {
    return typeof u === 'string' &&
      u.indexOf('https://pvcbgwzqjnzzpehwuywi.supabase.co/storage/v1/') === 0;
  }

  function zeigeSicherungen(neuLaden) {
    $('#vw-app').innerHTML =
      '<div class="vw-mitte">' +
        '<button class="vw-zurueck" id="vw-zurueck">← Übersicht</button>' +
        '<h1 class="vw-h1">Sicherungen</h1>' +
        '<p class="vw-hint" style="margin:10px 0 14px;max-width:66ch">' +
          'Eine Sicherung enthält den kompletten Stand der Website, alle Anfragen und ' +
          'Bewerbungen sowie die hochgeladenen Unterlagen — als eine ZIP-Datei. ' +
          'Automatisch wird <b>jede Nacht</b> gesichert; aufbewahrt werden die letzten ' +
          '<b id="vw-behalten">sieben</b> Stände, ältere fallen weg.</p>' +
        '<p class="vw-hint" style="margin:0 0 20px;max-width:66ch">' +
          '<b>Bitte beachten:</b> Die Datei enthält personenbezogene Daten. Sicher ' +
          'aufbewahren und nicht weitergeben. Zugangsdaten und Passwörter sind bewusst ' +
          '<b>nicht</b> enthalten — die gehören getrennt notiert.</p>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">' +
          '<button class="vw-btn vw-btn--voll" id="vw-sich-neu">Jetzt sichern</button>' +
        '</div>' +
        '<p class="vw-hint" id="vw-sich-meldung" role="status" style="margin:0 0 18px"></p>' +
        '<div class="vw-karte vw-karte--liste"><div class="vw-liste" id="vw-sich-liste">' +
          '<div class="vw-zeile"><span class="vw-zeile__meta">Wird geladen …</span></div>' +
        '</div></div>' +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () {
      verlaufSetz({ ansicht: 'uebersicht' });
      zeigeUebersicht(zaehleNeu());
    });
    $('#vw-sich-neu').addEventListener('click', sicherungErstellen);
    fokusAufUeberschrift();
    if (neuLaden || !sicherungen) ladeSicherungen();
    else zeichneSicherungen();
  }

  function sichSage(text, istFehler) {
    var m = $('#vw-sich-meldung');
    if (!m) return;
    m.textContent = text || '';
    m.className = istFehler ? 'vw-fehler' : 'vw-hint';
    m.setAttribute('role', istFehler ? 'alert' : 'status');
  }

  function ladeSicherungen() {
    ruf({ was: 'sicherungen' }).then(function (a) {
      sicherungen = a.sicherungen || [];
      var b = $('#vw-behalten');
      if (a.behalten && b) b.textContent = String(a.behalten);
      zeichneSicherungen();
    }).catch(function (f) {
      var l = $('#vw-sich-liste');
      if (l) {
        l.innerHTML = '';
        var z = document.createElement('div');
        z.className = 'vw-zeile';
        var t = document.createElement('span');
        t.className = 'vw-zeile__meta';
        t.textContent = verstaendlich(f);
        z.appendChild(t); l.appendChild(z);
      }
    });
  }

  function zeichneSicherungen() {
    var l = $('#vw-sich-liste');
    if (!l) return;
    if (!sicherungen.length) {
      l.innerHTML = '<div class="vw-zeile"><span class="vw-zeile__meta">' +
        'Noch keine Sicherung vorhanden. Mit „Jetzt sichern“ die erste anlegen — ' +
        'sonst geschieht es automatisch in der kommenden Nacht.</span></div>';
      return;
    }
    l.innerHTML = sicherungen.map(function (s) {
      var i = s.inhalt || {};
      var teile = [];
      if (i.dateien) teile.push(i.dateien + ' Dateien');
      if (i.anfragen != null) teile.push(i.anfragen + ' Anfragen');
      if (i.bewerbungen != null) teile.push(i.bewerbungen + ' Bewerbungen');
      if (i.unterlagen) teile.push(i.unterlagen + ' Unterlagen');
      return '<div class="vw-zeile">' +
        '<span class="vw-zeile__haupt">' +
          '<span class="vw-zeile__name">' + esc(datum(s.erstellt_am)) + ' Uhr</span>' +
          '<span class="vw-zeile__meta">' + esc(groesse(s.groesse_bytes)) + ' · ' +
            esc(s.art === 'automatisch' ? 'automatisch' : 'von Hand') +
            (teile.length ? ' · ' + esc(teile.join(' · ')) : '') + '</span>' +
        '</span>' +
        (verweisOk(s.verweis)
          ? '<a class="vw-btn" href="' + esc(s.verweis) + '" download rel="noopener">Herunterladen</a>'
          : '<span class="vw-zeile__meta">Verweis nicht verfügbar</span>') +
        '<button class="vw-btn vw-btn--leer" data-sich-weg="' + esc(s.id) + '">Löschen</button>' +
      '</div>';
    }).join('');
    Array.prototype.forEach.call(l.querySelectorAll('[data-sich-weg]'), function (b) {
      b.addEventListener('click', function () {
        /* Bewusst OHNE „Rückgängig“: Anders als bei einem Datensatz gibt
           es hier nichts im Speicher zu halten, die Datei ist zu gross.
           Deshalb eine Rueckfrage, die das Datum nennt. */
        var id = b.getAttribute('data-sich-weg');
        var s = null;
        for (var k = 0; k < sicherungen.length; k++) {
          if (String(sicherungen[k].id) === id) { s = sicherungen[k]; break; }
        }
        if (!window.confirm('Die Sicherung vom ' + (s ? datum(s.erstellt_am) : '') +
            ' Uhr endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
        b.disabled = true;
        sichSage('Wird gelöscht …', false);
        ruf({ was: 'sicherung-loeschen', id: id }).then(function () {
          sichSage('Sicherung gelöscht.', false);
          ladeSicherungen();
        }).catch(function (f) {
          b.disabled = false;
          sichSage(verstaendlich(f), true);
        });
      });
    });
  }

  function sicherungErstellen() {
    var k = $('#vw-sich-neu');
    if (k) { k.disabled = true; k.textContent = 'Wird erstellt …'; }
    /* Das dauert: das ganze Repository wird geholt, gepackt und abgelegt.
       Ohne diesen Satz haelt man es nach zehn Sekunden fuer haengen. */
    sichSage('Die Sicherung wird erstellt. Das dauert bis zu einer Minute — bitte das Fenster offen lassen.', false);
    ruf({ was: 'sicherung-erstellen' }).then(function (a) {
      sichSage('Sicherung erstellt.' +
        (a.entfernt ? ' Die ' + a.entfernt + ' ältesten wurden dabei entfernt.' : ''), false);
      ladeSicherungen();
    }).catch(function (f) {
      sichSage(verstaendlich(f), true);
    }).then(function () {
      if (k) { k.disabled = false; k.textContent = 'Jetzt sichern'; }
    });
  }

  function abmelden() {
    pw = ''; sitzung = ''; sitzungMerken('');
    daten = { anfragen: null, bewerbungen: null };
    notizEntwurf = null; papierkorb = null; zeigePapierkorb();
    stopUhr();
    zeigeAnmeldung('');
  }

  /* Die Meldungen von fetch sind englisch und sagen dem Betreiber nichts
     ("Failed to fetch", "Load failed"). Die Meldungen der Funktion selbst
     sind bereits deutsch und werden durchgereicht. */
  function verstaendlich(f) {
    var m = (f && f.message) || '';
    if (/failed to fetch|load failed|networkerror/i.test(m)) {
      return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und es noch einmal versuchen.';
    }
    return m || 'Unbekannter Fehler.';
  }

  /* ---------- Liste ---------- */
  function zeigeListe(neuLaden) {
    if (neuLaden || !daten[bereich]) {
      $('#vw-app').innerHTML = '<div class="vw-mitte"><p class="vw-hint">lädt …</p></div>';
      ruf({ was: 'liste', bereich: bereich })
        .then(function (a) { daten[bereich] = a.zeilen || []; gekappt[bereich] = !!a.gekappt; zeichneListe(); })
        .catch(function (f) {
          if (f && f.abgemeldet) return;
          /* Vorher ersetzte der Fehler die gesamte Oberflaeche durch eine
             Zeile — ohne Rueckweg, ohne zweiten Versuch. Der einzige
             Ausweg war Neuladen, und weil das Passwort nur im Speicher
             liegt, hiess das: komplett neu anmelden. */
          $('#vw-app').innerHTML =
            '<div class="vw-mitte"><div class="vw-karte">' +
              '<h1 class="vw-h1 vw-h1--klein">Liste konnte nicht geladen werden</h1>' +
              '<p class="vw-fehler" role="alert">' + esc(verstaendlich(f)) + '</p>' +
              '<div class="vw-aktionen">' +
                '<button class="vw-btn vw-btn--voll" id="vw-nochmal">Erneut versuchen</button>' +
                '<button class="vw-btn vw-btn--leer" id="vw-zurueck">← Übersicht</button>' +
              '</div>' +
            '</div></div>';
          $('#vw-nochmal').addEventListener('click', function () { zeigeListe(true); });
          $('#vw-zurueck').addEventListener('click', function () { zeigeUebersicht(zaehleNeu()); });
        });
      return;
    }
    zeichneListe();
  }

  function gefiltert() {
    var q = suche.trim().toLowerCase();
    return (daten[bereich] || []).filter(function (z) {
      if (filter === 'archiviert') { if (!z.archiviert) return false; }
      else {
        if (z.archiviert) return false;
        if (filter !== 'alle' && (z.status || 'neu') !== filter) return false;
      }
      if (!q) return true;
      return JSON.stringify(z).toLowerCase().indexOf(q) > -1;
    });
  }

  function zeichneListe() {
    var titel = bereich === 'anfragen' ? 'Anfragen' : 'Bewerbungen';
    var zeilen = gefiltert();
    var filterKnopf = function (w, l) {
      return '<button class="vw-chip' + (filter === w ? ' vw-chip--an' : '') + '" data-filter="' + w + '">' + l + '</button>';
    };
    var eintrag = function (z) {
      var st = z.status || 'neu';
      return '<li><button class="vw-zeile" data-id="' + esc(z.id) + '">' +
        '<span class="vw-zeile__haupt">' +
          '<span class="vw-zeile__name">' + esc(z.name || '(ohne Namen)') + '</span>' +
          '<span class="vw-zeile__meta">' + esc(datum(z.eingegangen_am)) +
            (z.bereich ? ' · ' + esc(z.bereich) : '') + (z.stelle ? ' · ' + esc(z.stelle) : '') + '</span>' +
        '</span>' +
        '<span class="vw-marke vw-marke--' + st + '">' + (st === 'in_arbeit' ? 'In Arbeit' : st === 'erledigt' ? 'Erledigt' : 'Neu') + '</span>' +
      '</button></li>';
    };
    $('#vw-app').innerHTML =
      '<div class="vw-mitte">' +
        '<button class="vw-zurueck" id="vw-zurueck">← Übersicht</button>' +
        '<div class="vw-kopf">' +
          '<h1 class="vw-h1 vw-h1--klein">' + titel + '</h1>' +
          '<button class="vw-btn vw-btn--leer" id="vw-csv">CSV-Export</button>' +
        '</div>' +
        '<div class="vw-werkzeuge">' +
          '<input class="vw-input vw-suche" id="vw-suche" type="search" placeholder="Suchen …" ' +
            'aria-label="Suchen" value="' + esc(suche) + '">' +
          '<div class="vw-chips">' + filterKnopf('alle', 'Alle') + filterKnopf('neu', 'Neu') +
            filterKnopf('in_arbeit', 'In Arbeit') + filterKnopf('erledigt', 'Erledigt') +
            filterKnopf('archiviert', 'Archiv') + '</div>' +
        '</div>' +
        '<div class="vw-karte vw-karte--liste" id="vw-listenkoerper">' + koerper(zeilen, eintrag) + '</div>' +
        (gekappt[bereich]
          ? '<p class="vw-hint" style="margin-top:14px">Es werden die neuesten 500 Einträge angezeigt. ' +
            'Ältere sind über den CSV-Export erreichbar.</p>'
          : '') +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () { history.back(); });
    $('#vw-csv').addEventListener('click', csv);


    /* Nur den Listenkoerper neu zeichnen, nicht die ganze Ansicht. Vorher
       wurde bei jedem Tastendruck auch das Suchfeld neu erzeugt — die
       Schreibmarke sprang damit ans Ende und eine Korrektur mitten im
       Wort war unmoeglich. */
    var neuZeichnen = function () {
      $('#vw-listenkoerper').innerHTML = koerper(gefiltert(), eintrag);
      bindeZeilen();
    };
    $('#vw-suche').addEventListener('input', function (e) { suche = e.target.value; neuZeichnen(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter]'), function (b) {
      b.addEventListener('click', function () {
        filter = b.getAttribute('data-filter');
        Array.prototype.forEach.call(document.querySelectorAll('[data-filter]'), function (x) {
          x.classList.toggle('vw-chip--an', x.getAttribute('data-filter') === filter);
        });
        neuZeichnen();
      });
    });
    bindeZeilen();
    fokusAufUeberschrift();
  }

  /* EINMAL registriert, nicht je Ansicht — ein Handler, der sich selbst
     abmeldet, sobald gerade keine Liste da ist, wirkt danach nirgends
     mehr. Er entscheidet stattdessen bei jedem Tastendruck neu, wo er
     ist. In Eingabefeldern gilt nur Escape; dort tippt man. */
  function tasten(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!pw && !sitzung) return;                      // nicht angemeldet
    var el = document.activeElement || {};
    var imFeld = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '');

    if (e.key === 'Escape') {
      if (imFeld && el.blur) { el.blur(); return; }   // erst das Feld verlassen
      if ($('#vw-listenkoerper') || $('#vw-drucken')) { e.preventDefault(); history.back(); }
      return;
    }
    if (imFeld) return;
    if (!$('#vw-listenkoerper')) return;              // Pfeile nur in der Liste

    var zeilen = Array.prototype.slice.call(document.querySelectorAll('.vw-zeile'));
    if (!zeilen.length) return;
    var jetzt = zeilen.indexOf(el);
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      zeilen[Math.min(zeilen.length - 1, jetzt + 1)].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      zeilen[jetzt <= 0 ? 0 : jetzt - 1].focus();
    }
  }

  function koerper(zeilen, eintrag) {
    return zeilen.length
      ? '<ul class="vw-liste">' + zeilen.map(eintrag).join('') + '</ul>'
      : '<p class="vw-hint" style="padding:22px">Keine Einträge.</p>';
  }

  function bindeZeilen() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-id]'), function (b) {
      b.addEventListener('click', function () {
        offen = (daten[bereich] || []).filter(function (z) { return z.id === b.getAttribute('data-id'); })[0];
        if (offen) {
          notizEntwurf = null;
          verlaufSetz({ ansicht: 'detail', bereich: bereich, id: offen.id });
          zeigeDetail();
        }
      });
    });
  }

  /* Fuer geladene Bereiche aus dem Zwischenspeicher rechnen — dort ist die
     Zahl aktueller als die vom Anmelden. Fuer noch nicht geladene die
     Server-Zahl behalten, NICHT null zu 0 machen. */
  function zaehleNeu() {
    var z = function (b) {
      return (daten[b] || []).filter(function (r) { return (r.status || 'neu') === 'neu' && !r.archiviert; }).length;
    };
    return {
      anfragen: daten.anfragen ? z('anfragen') : (serverNeu.anfragen || 0),
      bewerbungen: daten.bewerbungen ? z('bewerbungen') : (serverNeu.bewerbungen || 0)
    };
  }

  /* ---------- Detail ---------- */
  function zeigeDetail() {
    var z = offen;
    var klein = window.matchMedia('(max-width: 860px)').matches;
    var zeile = function (paar) {
      var w = z[paar[0]];
      if (!w) return '';
      return '<div class="vw-feld"><div class="vw-feld__label">' + esc(paar[1]) + '</div>' +
        '<div class="vw-feld__wert">' + esc(w).replace(/\n/g, '<br>') + '</div></div>';
    };
    $('#vw-app').innerHTML =
      '<div class="vw-mitte">' +
        '<button class="vw-zurueck" id="vw-zurueck">← ' + (bereich === 'anfragen' ? 'Anfragen' : 'Bewerbungen') + '</button>' +
        '<div class="vw-karte">' +
          '<p class="vw-eyebrow">' + esc(datum(z.eingegangen_am)) + '</p>' +
          '<h1 class="vw-h1 vw-h1--klein">' + esc(z.name || '(ohne Namen)') + '</h1>' +
          '<div class="vw-felder">' + FELDER[bereich].map(zeile).join('') + '</div>' +
          (bereich === 'bewerbungen'
            ? '<div class="vw-feld"><div class="vw-feld__label">Unterlagen</div><div class="vw-feld__wert">' +
                (unterlagen(z).length
                  ? '<div style="display:grid;gap:8px;justify-items:start">' +
                      unterlagen(z).map(function (u, i) {
                        return '<button class="vw-btn vw-btn--leer vw-datei" data-nr="' + i +
                          '" style="min-height:40px">' + esc(u.name) + ' öffnen</button>';
                      }).join('') + '</div>'
                  : '<span class="vw-hint">Keine Unterlagen mitgeschickt.</span>') +
              '</div></div>'
            : '') +
          '<div class="vw-aktionen">' +
            '<a class="vw-btn vw-btn--voll" href="mailto:' + esc(z.email) + '">Antworten</a>' +
            '<button class="vw-btn vw-btn--leer" id="vw-drucken">Drucken</button>' +
            (z.telefon ? '<a class="vw-btn vw-btn--leer" href="tel:' + esc(String(z.telefon).replace(/\s/g, '')) + '">Anrufen</a>' : '') +
          '</div>' +
          (klein
            ? '<p class="vw-hint" style="margin-top:20px">Status, Notiz und Archiv lassen sich am Rechner bearbeiten.</p>'
            : '<div class="vw-bearbeiten">' +
                '<div class="vw-feld__label">Status</div>' +
                '<div class="vw-chips">' + STATUS.map(function (s) {
                  return '<button class="vw-chip' + ((z.status || 'neu') === s[0] ? ' vw-chip--an' : '') +
                    '" data-status="' + s[0] + '">' + s[1] + '</button>';
                }).join('') + '</div>' +
                '<label class="vw-feld__label" for="vw-notiz" style="margin-top:16px;display:block">Interne Notiz</label>' +
                '<textarea class="vw-input" id="vw-notiz" rows="3">' +
                  esc(notizEntwurf !== null ? notizEntwurf : (z.notiz || '')) + '</textarea>' +
                '<div class="vw-aktionen" style="margin-top:12px">' +
                  '<button class="vw-btn vw-btn--leer" id="vw-notiz-speichern">Notiz speichern</button>' +
                  '<button class="vw-btn vw-btn--leer" id="vw-archiv">' + (z.archiviert ? 'Aus dem Archiv holen' : 'Archivieren') + '</button>' +
                  '<button class="vw-btn vw-btn--warnung" id="vw-loeschen">Löschen</button>' +
                '</div>' +
                '<p class="vw-hint" id="vw-status-meldung" role="status" aria-live="polite" style="margin-top:10px"></p>' +
              '</div>') +
        '</div>' +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () { history.back(); });
    fokusAufUeberschrift();
    /* Zum Mitnehmen an den Ortstermin. Die Druckregeln in der Seite
       blenden Knoepfe und Hintergruende aus. */
    if ($('#vw-drucken')) $('#vw-drucken').addEventListener('click', function () { window.print(); });

    /* Der Link wird bei jedem Klick neu geholt und gilt nur zwei Minuten.
       Er steht deshalb nirgends im Markup und landet nicht im Verlauf. */
    [].slice.call(document.querySelectorAll('.vw-datei')).forEach(function (dateiKnopf) {
      dateiKnopf.addEventListener('click', function () {
        var k = this, alt = k.textContent;
        k.disabled = true; k.textContent = 'öffnet …';
        /* Der Server bekommt die NUMMER, nicht den Pfad — er schlaegt ihn
           selbst in der Zeile nach. Sonst liesse sich ueber diesen Weg
           eine fremde Datei unterschreiben. */
        ruf({ was: 'dateilink', bereich: bereich, id: z.id, nr: Number(k.getAttribute('data-nr')) })
          .then(function (a) {
            k.disabled = false; k.textContent = alt;
            var w = window.open(a.link, '_blank', 'noopener');
            if (!w) k.textContent = 'Bitte Pop-ups erlauben';
          })
          .catch(function (f) {
            if (f && f.abgemeldet) return;
            k.disabled = false;
            k.textContent = f && /kein Anhang/.test(f.message)
              ? 'Datei nicht mehr vorhanden' : 'Fehler: ' + verstaendlich(f);
          });
      });
    });

    /* Die Grenze haengt an der Fensterbreite, nicht am Geraet — am Rechner
       ist sie bei schmalem Fenster oder 150 % Vergroesserung ebenfalls
       unterschritten. Wird die Breite geaendert, muss die Ansicht deshalb
       nachziehen; vorher blieb der einmal gewaehlte Zustand stehen.
       Das ist reine Ergonomie, KEINE Schutzmassnahme: die Funktion nimmt
       Aenderungen von jedem Geraet an, denn es ist dasselbe Passwort. */
    if (!zeigeDetail._beobachtet) {
      var mq = window.matchMedia('(max-width: 860px)');
      var reagiere = function () { if (offen) zeigeDetail(); };
      if (mq.addEventListener) mq.addEventListener('change', reagiere);
      else if (mq.addListener) mq.addListener(reagiere);
      zeigeDetail._beobachtet = true;
    }
    if (klein) return;

    var feld = $('#vw-status-meldung');
    var melde = function (t, istFehler) {
      feld.textContent = t;
      feld.className = istFehler ? 'vw-fehler' : 'vw-hint';
      feld.setAttribute('role', istFehler ? 'alert' : 'status');
    };
    /* Waehrend des Speicherns passierte sichtbar nichts — bei einem
       Kaltstart der Funktion ein bis drei Sekunden lang. */
    var laeuft = function (knopf, an, text) {
      if (!knopf) return;
      knopf.disabled = an;
      if (an) { knopf.dataset.alt = knopf.textContent; knopf.textContent = text; }
      else if (knopf.dataset.alt) { knopf.textContent = knopf.dataset.alt; }
    };

    $('#vw-notiz').addEventListener('input', function (e) { notizEntwurf = e.target.value; });

    Array.prototype.forEach.call(document.querySelectorAll('[data-status]'), function (b) {
      b.addEventListener('click', function () {
        var s = b.getAttribute('data-status');
        /* Was im Notizfeld steht, vor dem Neuzeichnen sichern. */
        var stand = $('#vw-notiz');
        if (stand) notizEntwurf = stand.value;
        laeuft(b, true, 'ändert …');
        ruf({ was: 'aendern', bereich: bereich, id: z.id, status: s })
          .then(function () { z.status = s; zeigeDetail(); })
          .catch(function (f) { laeuft(b, false); melde(verstaendlich(f), true); });
      });
    });
    $('#vw-notiz-speichern').addEventListener('click', function () {
      var knopf = this;
      var n = $('#vw-notiz').value;
      laeuft(knopf, true, 'speichert …');
      ruf({ was: 'aendern', bereich: bereich, id: z.id, notiz: n })
        .then(function () {
          z.notiz = n; notizEntwurf = null;
          laeuft(knopf, false); melde('Notiz gespeichert.', false);
        })
        .catch(function (f) { laeuft(knopf, false); melde(verstaendlich(f), true); });
    });
    $('#vw-archiv').addEventListener('click', function () {
      var knopf = this;
      var neu = !z.archiviert;
      var stand = $('#vw-notiz');
      if (stand) notizEntwurf = stand.value;
      laeuft(knopf, true, 'ändert …');
      ruf({ was: 'aendern', bereich: bereich, id: z.id, archiviert: neu })
        .then(function () { z.archiviert = neu; zeigeDetail(); })
        .catch(function (f) { laeuft(knopf, false); melde(verstaendlich(f), true); });
    });
    $('#vw-loeschen').addEventListener('click', function () {
      var knopf = this;
      if (!window.confirm('Diesen Eintrag endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
      laeuft(knopf, true, 'löscht …');
      var weg = bereich;
      ruf({ was: 'loeschen', bereich: bereich, id: z.id })
        .then(function () {
          daten[weg] = (daten[weg] || []).filter(function (r) { return r.id !== z.id; });
          /* Vollstaendige Kopie merken, damit "Rueckgaengig" den Eintrag
             mit derselben Kennung zurueckschreiben kann — Notiz, Status
             und Eingangszeit bleiben so erhalten. */
          papierkorb = { bereich: weg, zeile: z, beschriftung: z.name || 'Eintrag' };
          offen = null; notizEntwurf = null;
          zeichneListe();
          zeigePapierkorb();
        })
        .catch(function (f) {
          if (f && f.abgemeldet) return;
          laeuft(knopf, false); melde(verstaendlich(f), true);
        });
    });
  }

  /* ---------- Papierkorb: Rueckgaengig nach dem Loeschen ----------
     Loeschen ist die einzige Handlung hier, die sich nicht durch eine
     zweite Handlung aufheben laesst. Ein Bestaetigungsdialog hilft nur
     gegen Unachtsamkeit, nicht gegen Irrtum: wer den falschen Eintrag
     offen hat, bestaetigt ihn genauso ueberzeugt. Deshalb dieser
     Streifen — er sagt zugleich ehrlich, wie lange das Zurueckholen
     moeglich ist. */
  function zeigePapierkorb() {
    var alt = $('#vw-papierkorb');
    if (alt) alt.remove();
    if (!papierkorb) return;
    var s = document.createElement('div');
    s.id = 'vw-papierkorb';
    s.className = 'vw-papierkorb';
    s.setAttribute('role', 'status');
    s.innerHTML =
      '<span class="vw-papierkorb__text">' + esc(papierkorb.beschriftung) +
        ' gelöscht <span class="vw-papierkorb__zusatz">· nur solange diese Seite offen ist wiederherstellbar</span></span>' +
      '<button class="vw-papierkorb__knopf" id="vw-zurueckholen">Rückgängig</button>' +
      '<button class="vw-papierkorb__zu" id="vw-pk-zu" aria-label="Hinweis schließen">✕</button>';
    document.body.appendChild(s);
    $('#vw-pk-zu').addEventListener('click', function () { papierkorb = null; zeigePapierkorb(); });
    $('#vw-zurueckholen').addEventListener('click', function () {
      var knopf = this;
      var p = papierkorb;
      knopf.disabled = true; knopf.textContent = 'holt zurück …';
      ruf({ was: 'zurueckholen', bereich: p.bereich, satz: p.zeile })
        .then(function (a) {
          if (!daten[p.bereich]) daten[p.bereich] = [];
          /* Kam der Lebenslauf nicht mit zurueck, den Verweis entfernen —
             sonst boete die Verwaltung einen Knopf an, der ins Leere geht. */
          if (a && a.anhang === false) { p.zeile.datei = null; p.zeile.dateien = []; }
          daten[p.bereich].push(p.zeile);
          daten[p.bereich].sort(function (a, b) {
            return String(b.eingegangen_am).localeCompare(String(a.eingegangen_am));
          });
          papierkorb = null;
          zeigePapierkorb();
          if (bereich === p.bereich && !offen) zeichneListe();
        })
        .catch(function (f) {
          if (f && f.abgemeldet) return;
          knopf.disabled = false; knopf.textContent = 'Rückgängig';
          var t = s.querySelector('.vw-papierkorb__text');
          if (t) t.textContent = 'Zurückholen fehlgeschlagen: ' + verstaendlich(f);
        });
    });
  }

  /* ---------- CSV ---------- */
  function csv() {
    var zeilen = gefiltert();
    /* Vorher passierte hier kommentarlos nichts — der Betreiber haette
       auf einen kaputten Knopf getippt statt auf eine leere Auswahl. */
    if (!zeilen.length) {
      var k = $('#vw-csv');
      if (k) {
        var alt = k.textContent;
        k.textContent = 'Nichts zu exportieren';
        setTimeout(function () { k.textContent = alt; }, 2200);
      }
      return;
    }
    var spalten = ['eingegangen_am', 'status', 'archiviert']
      .concat(FELDER[bereich].map(function (p) { return p[0]; }))
      .concat(bereich === 'bewerbungen' ? ['datei_name'] : [])
      .concat(['notiz']);
    /* Anfuehrungszeichen allein genuegen NICHT. Excel und LibreOffice
       werten den ausgepackten Inhalt aus, sobald er mit = + - oder @
       beginnt — und alle Werte hier stammen aus dem oeffentlichen
       Formular. Ein Name wie =HYPERLINK("http://…";"Rechnung") wuerde
       beim Oeffnen der Datei zu einem anklickbaren Link. Das vorangestellte
       Apostroph macht daraus wieder Text; Excel zeigt es nicht an. */
    var zelle = function (w) {
      var s = String(w == null ? '' : w);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    /* "datei_name" traegt nur die erste Unterlage. Im Export sollen alle
       stehen — sonst sieht der Betreiber in der Tabelle nicht, dass eine
       Bewerbung drei Dokumente hatte. */
    var wert = function (z, s) {
      if (s === 'datei_name') return unterlagen(z).map(function (u) { return u.name; }).join(', ');
      return z[s];
    };
    var text = '﻿' + spalten.join(';') + '\n' +
      zeilen.map(function (z) {
        return spalten.map(function (s) { return zelle(wert(z, s)); }).join(';');
      }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'devries-' + bereich + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* Beim Laden: gibt es ein gemerktes Kennzeichen, gleich weitermachen.
     Ist es abgelaufen, faellt die Seite auf die Anmeldung zurueck — ohne
     Fehlermeldung, denn abgelaufen ist kein Fehler des Benutzers. */
  function start() {
    var gemerkt = sitzungLesen();
    if (!gemerkt) { zeigeAnmeldung(''); return; }
    sitzung = gemerkt;
    $('#vw-app').innerHTML = '<div class="vw-mitte"><p class="vw-hint">lädt …</p></div>';
    ruf({ was: 'anmelden' })
      .then(function (a) {
        uebernehmeStand(a.stand);
        verlaufSetz({ ansicht: 'uebersicht' }, true);
        zeigeUebersicht(zaehleNeu());
      })
      .catch(function () {
        sitzung = ''; sitzungMerken('');
        zeigeAnmeldung('');
      });
  }

  document.addEventListener('keydown', tasten);
  document.addEventListener('DOMContentLoaded', start);
})();
