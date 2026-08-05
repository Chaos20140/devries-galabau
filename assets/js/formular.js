/* =====================================================================
   Zentrale Stelle fuer den Formularversand — de Vries Galabau

   Solange CFG.url oder CFG.key leer sind, verhaelt sich die Seite exakt
   wie bisher: der Knopf oeffnet das E-Mail-Programm (mailto). Erst wenn
   beide Werte gesetzt sind, geht die Anfrage zusaetzlich in die
   Supabase-Tabelle; schlaegt das fehl, greift wieder mailto.

   Es wird bewusst KEIN Supabase-SDK geladen. Die REST-Schnittstelle
   (PostgREST) laesst sich mit einem einzigen fetch bedienen — das
   erspart ein Fremdskript, einen Build-Schritt und einen CDN-Aufruf.

   ⚠ Der Schluessel unten ist der "anon"- bzw. "publishable"-Schluessel.
   Der gehoert in den Quelltext und ist KEIN Geheimnis. Er ist nur dann
   ungefaehrlich, wenn in Supabase Row Level Security so eingerichtet
   ist, wie supabase/schema.sql es vorgibt: einfuegen ja, lesen nein.
   Ohne diese Regeln koennte jeder Besucher saemtliche Kundenanfragen
   abrufen. Niemals den "service_role"-Schluessel hier eintragen.
   ===================================================================== */
(function () {
  "use strict";

  var CFG = {
    url: 'https://pvcbgwzqjnzzpehwuywi.supabase.co',
    key: 'sb_publishable_mOml55je_orXhUm5ltVnQg_xHRVi1MV',
    tabelle: 'galabau_anfragen',
    tabelleBewerbung: 'galabau_bewerbungen'
  };

  /* Empfaenger der Formularpost — die Adresse des Betriebs, dieselbe wie
     im Impressum, in der Fusszeile und auf der Kontaktseite.
     Dieser Wert gilt fuer den mailto-Rueckfall (wenn die Datenbank nicht
     erreichbar ist). Die Benachrichtigung aus der Datenbank haengt am
     Secret MAIL_TO im Supabase-Projekt und muss dort GLEICH gesetzt sein —
     bei einer Aenderung immer beide Stellen anfassen:
     supabase secrets set MAIL_TO=<adresse> --project-ref pvcbgwzqjnzzpehwuywi
     (Bis zum 5. August 2026 stand hier zur Abnahme voruebergehend eine
     andere Adresse; seitdem wieder die des Betriebs.) */
  var EMPFAENGER = 'info@devries-galabau.de';

  /* Laengen entsprechen den CHECK-Bedingungen in schema.sql. Hier wird
     nur gekuerzt, damit gar nicht erst Unsinn losgeschickt wird — die
     verbindliche Pruefung macht die Datenbank. */
  /* ⚠ Jedes Feld, das gespeichert werden soll, MUSS hier stehen —
     kuerzen() uebernimmt ausschliesslich diese Schluessel. Fehlt eines,
     wird es stillschweigend verworfen. Genau daran ist das
     Bewerbungsformular schon einmal gescheitert (quelle/betreff). */
  var MAX = {
    quelle: 60, betreff: 160, name: 120, email: 200, telefon: 60,
    ort: 120, art: 40, bereich: 60, zeitraum: 120, nachricht: 5000,
    stelle: 80, verfuegbar_ab: 60, datei: 300, datei_name: 200
  };

  /* Grenzen fuer den Lebenslauf. Sie stehen hier nur, damit der Besucher
     eine verstaendliche Meldung bekommt statt einer Fehlermeldung vom
     Server — verbindlich durchgesetzt werden sie im Speicherbereich
     selbst (nur application/pdf, hoechstens 5 MB, siehe
     supabase/bewerbungsdatei.sql). Eine Pruefung im Browser laesst sich
     umgehen, die dort nicht. */
  var DATEI = { max: 5 * 1024 * 1024, typ: 'application/pdf', eimer: 'bewerbungen' };

  var geladenUm = Date.now();

  function konfiguriert() {
    return !!(CFG.url && CFG.key);
  }

  function kuerzen(werte) {
    var raus = {};
    Object.keys(MAX).forEach(function (k) {
      var v = werte[k];
      if (v == null) return;
      v = String(v).trim();
      if (!v) return;
      raus[k] = v.length > MAX[k] ? v.slice(0, MAX[k]) : v;
    });
    return raus;
  }

  /* Einfache Abwehr gegen Formular-Roboter. Kein Ersatz fuer eine
     serverseitige Begrenzung — PostgREST hat keine; siehe SUPABASE.md. */
  function verdaechtig(form) {
    if (form) {
      /* Das Feld heisst bewusst nicht "firma" o. ae. — solche Namen fuellt
         die Autovervollstaendigung des Browsers ungefragt aus und wuerde
         echte Besucher zu Robotern erklaeren. */
      var falle = form.querySelector('[name="hinweisfeld"]');
      if (falle && falle.value) return true;
    }
    return Date.now() - geladenUm < 2500;          // zu schnell abgeschickt
  }

  /* Der Rueckfall auf mailto war bisher voellig stumm: schlaegt der Aufruf
     fehl, setzt formular.js window.location.href auf eine mailto-Adresse.
     Ist kein E-Mail-Programm hinterlegt — auf vielen Rechnern und in jedem
     Testbrowser der Fall — passiert daraufhin sichtbar NICHTS. Der Besucher
     steht vor einem Formular, das auf den Knopfdruck nicht reagiert.
     Genau so blieb unbemerkt, dass auf stellenangebote.html die CSP den
     Aufruf zu Supabase blockierte: kein Fehler, keine Meldung, keine Zeile
     in der Datenbank. Deshalb sagt der Rueckfall jetzt Bescheid. */
  var HINWEIS_ADRESSE = 'info@devries-galabau.de';   // immer die des Betriebs

  function rueckfall(o, grund) {
    if (grund && window.console && console.warn) {
      console.warn('[Formular] Direktversand nicht moeglich (' + grund + '), es wird das E-Mail-Programm geoeffnet.');
    }
    o.mailto();
    if (!o.form) return;
    /* Kurz warten: hat sich ein Mailprogramm geoeffnet, ist das in Ordnung —
       der Hinweis stoert dann nicht, er bestaetigt nur. Tut sich nichts, ist
       er die einzige Rueckmeldung, die der Besucher bekommt. */
    setTimeout(function () {
      if (o.form.querySelector('[data-versandhinweis]')) return;
      var p = document.createElement('p');
      p.setAttribute('data-versandhinweis', '');
      p.setAttribute('role', 'status');
      p.style.cssText = 'margin:14px 0 0;font-size:14.5px;line-height:1.55;color:#4A5F52';
      p.textContent = 'Ihr E-Mail-Programm sollte sich mit der fertigen Nachricht geöffnet haben. '
        + 'Falls sich nichts tut, schreiben Sie uns bitte direkt an ' + HINWEIS_ADRESSE
        + ' oder rufen Sie an: 05153 1552.';
      o.form.appendChild(p);
    }, 1200);
  }

  /**
   * @param {Object}   o
   * @param {HTMLFormElement} o.form     Formular (fuer den Honigtopf)
   * @param {string}   o.quelle          welche Seite, z. B. 'gartenplanung'
   * @param {string}   o.betreff         Betreff der Nachricht
   * @param {Object}   o.felder          die erfassten Werte
   * @param {Function} o.mailto          Rueckfallweg, oeffnet das E-Mail-Programm
   * @param {Function} [o.danach]        laeuft nach erfolgreichem Speichern
   */
  function senden(o) {
    var daten = kuerzen(Object.assign({ quelle: o.quelle, betreff: o.betreff }, o.felder || {}));

    /* Verdaechtig heisst: nicht in die Datenbank, aber trotzdem zustellen.
       Ein Roboter folgt keinem mailto — ein zu Unrecht verdaechtigter
       Mensch bekommt seine Nachricht so trotzdem los. Stillschweigend
       verwerfen waere schlimmer als jeder Spam. */
    if (verdaechtig(o.form) || !konfiguriert()) {
      /* Ohne Grund im Protokoll: das ist der geplante Weg, kein Fehler. */
      rueckfall(o, konfiguriert() ? null : 'nicht eingerichtet');
      return;
    }

    /* Reihenfolge: steuer muss vor dem Zeitgeber stehen. */
    var steuer = { abgebrochen: false };
    var abbruch = setTimeout(function () {
      steuer.abgebrochen = true;
      rueckfall(o, 'Zeitueberschreitung nach 8 s');
    }, 8000);

    var ziel = o.tabelle === 'bewerbung' ? CFG.tabelleBewerbung : CFG.tabelle;
    fetch(CFG.url + '/rest/v1/' + encodeURIComponent(ziel), {
      method: 'POST',
      headers: {
        'apikey': CFG.key,
        'Authorization': 'Bearer ' + CFG.key,
        'Content-Type': 'application/json',
        /* Nichts zurueckgeben lassen — sonst braeuchte anon Leserechte. */
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(daten)
    }).then(function (r) {
      clearTimeout(abbruch);
      if (steuer.abgebrochen) return;
      if (r.ok) { if (o.danach) o.danach(); else window.location.href = 'danke.html'; }
      else rueckfall(o, 'Server antwortete ' + r.status);
    }).catch(function (f) {
      clearTimeout(abbruch);
      /* Hier landet auch eine von der CSP blockierte Verbindung. Der Browser
         nennt den Grund nicht — deshalb steht er im Protokoll unter dem, was
         wir wissen. Erste Anlaufstelle bei "Formular tut nichts": ob
         connect-src dieser Seite die Supabase-Adresse enthaelt. */
      if (!steuer.abgebrochen) rueckfall(o, 'Verbindung fehlgeschlagen — CSP oder Netz? ' + (f && f.message));
    });
  }

  /* ---------------------------------------------------------------
     Lebenslauf ablegen.

     Der oeffentliche Schluessel darf im Speicherbereich GENAU EINES:
     etwas unter "eingang/" ablegen. Lesen, auflisten, aendern und
     loeschen sind ihm verwehrt (geprueft: 400 bzw. leere Liste). Wer
     eine Bewerbung herunterladen will, geht ueber die Verwaltung, die
     serverseitig einen zeitlich begrenzten Link erzeugt.

     Der Dateiname aus dem Netz wird NICHT als Pfad verwendet — er kaeme
     ungeprueft vom Besucher. Gespeichert wird unter einem selbst
     erzeugten Namen; der Originalname wandert als reiner Anzeigewert in
     die Tabelle.
     --------------------------------------------------------------- */
  function zufallsname() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function dateiPruefen(datei) {
    if (!datei) return null;
    if (datei.size > DATEI.max) {
      return 'Die Datei ist größer als 5 MB. Bitte schicken Sie sie uns per E-Mail an ' + HINWEIS_ADRESSE + '.';
    }
    var name = String(datei.name || '');
    var istPdf = datei.type === DATEI.typ || /\.pdf$/i.test(name);
    if (!istPdf) return 'Bitte laden Sie den Lebenslauf als PDF hoch.';
    return null;
  }

  function dateiHochladen(datei) {
    if (!datei || !konfiguriert()) return Promise.resolve(null);
    var pfad = 'eingang/' + zufallsname() + '.pdf';
    var steuer = { abgebrochen: false };
    return new Promise(function (fertig, daneben) {
      var abbruch = setTimeout(function () {
        steuer.abgebrochen = true;
        daneben(new Error('Zeitüberschreitung beim Hochladen'));
      }, 30000);
      fetch(CFG.url + '/storage/v1/object/' + DATEI.eimer + '/' + pfad, {
        method: 'POST',
        headers: {
          'apikey': CFG.key,
          'Authorization': 'Bearer ' + CFG.key,
          'Content-Type': DATEI.typ,
          'x-upsert': 'false'
        },
        body: datei
      }).then(function (r) {
        clearTimeout(abbruch);
        if (steuer.abgebrochen) return;
        if (!r.ok) { daneben(new Error('Server antwortete ' + r.status)); return; }
        fertig({
          datei: pfad,
          /* Nur Anzeigename: Pfadtrenner und Steuerzeichen raus. */
          datei_name: String(datei.name || 'lebenslauf.pdf')
            .replace(/[\\/\r\n\t]+/g, ' ').trim().slice(0, 200)
        });
      }).catch(function (f) {
        clearTimeout(abbruch);
        if (!steuer.abgebrochen) daneben(f);
      });
    });
  }

  window.dvFormular = {
    senden: senden,
    konfiguriert: konfiguriert,
    empfaenger: EMPFAENGER,
    dateiPruefen: dateiPruefen,
    dateiHochladen: dateiHochladen
  };
})();
