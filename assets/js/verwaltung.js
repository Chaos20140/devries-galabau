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
  var pw = '';
  var daten = { anfragen: null, bewerbungen: null };
  var bereich = 'anfragen';
  var filter = 'alle';
  var suche = '';
  var offen = null;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function ruf(auftrag) {
    auftrag.passwort = pw;
    return fetch(BASIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auftrag)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j && j.fehler ? j.fehler : 'Fehler ' + r.status);
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

  function datum(s) {
    try {
      var d = new Date(s);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(s || ''); }
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
        .then(function (a) { zeigeUebersicht(a.neu); })
        .catch(function (f) { pw = ''; zeigeAnmeldung(f.message); });
    });
    $('#vw-pw').focus();
  }

  /* ---------- Uebersicht ---------- */
  function zeigeUebersicht(neu) {
    neu = neu || { anfragen: 0, bewerbungen: 0 };
    var kachel = function (schl, titel, symbol) {
      return '<button class="vw-kachel" data-geh="' + schl + '">' +
        '<span class="vw-kachel__kopf"><span class="vw-symbol" aria-hidden="true">' + symbol + '</span>' +
        '<span class="vw-kachel__titel">' + titel + '</span></span>' +
        '<span class="vw-kachel__zahl">' + neu[schl] + ' neu</span></button>';
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
        '</div>' +
        '<p class="vw-hint vw-nurGross" style="margin-top:22px">' +
          'Die vollständige Verwaltung steht am Rechner zur Verfügung. Auf dem Telefon ' +
          'sehen Sie Anfragen und Bewerbungen, können Status und Notiz aber nicht ändern.</p>' +
      '</div>';
    $('#vw-abmelden').addEventListener('click', abmelden);
    Array.prototype.forEach.call(document.querySelectorAll('[data-geh]'), function (b) {
      b.addEventListener('click', function () {
        bereich = b.getAttribute('data-geh'); filter = 'alle'; suche = ''; offen = null;
        zeigeListe(true);
      });
    });
  }

  function abmelden() { pw = ''; daten = { anfragen: null, bewerbungen: null }; zeigeAnmeldung(''); }

  /* ---------- Liste ---------- */
  function zeigeListe(neuLaden) {
    if (neuLaden || !daten[bereich]) {
      $('#vw-app').innerHTML = '<div class="vw-mitte"><p class="vw-hint">lädt …</p></div>';
      ruf({ was: 'liste', bereich: bereich })
        .then(function (a) { daten[bereich] = a.zeilen || []; zeichneListe(); })
        .catch(function (f) {
          $('#vw-app').innerHTML = '<div class="vw-mitte"><p class="vw-fehler">' + esc(f.message) + '</p></div>';
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
        '<div class="vw-karte vw-karte--liste">' +
          (zeilen.length ? '<ul class="vw-liste">' + zeilen.map(eintrag).join('') + '</ul>'
            : '<p class="vw-hint" style="padding:22px">Keine Einträge.</p>') +
        '</div>' +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () { zeigeUebersicht(zaehleNeu()); });
    $('#vw-csv').addEventListener('click', csv);
    $('#vw-suche').addEventListener('input', function (e) { suche = e.target.value; zeichneListe(); $('#vw-suche').focus(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter]'), function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-filter'); zeichneListe(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-id]'), function (b) {
      b.addEventListener('click', function () {
        offen = (daten[bereich] || []).filter(function (z) { return z.id === b.getAttribute('data-id'); })[0];
        if (offen) zeigeDetail();
      });
    });
  }

  function zaehleNeu() {
    var z = function (b) {
      return (daten[b] || []).filter(function (r) { return (r.status || 'neu') === 'neu' && !r.archiviert; }).length;
    };
    return { anfragen: daten.anfragen ? z('anfragen') : 0, bewerbungen: daten.bewerbungen ? z('bewerbungen') : 0 };
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
          '<div class="vw-aktionen">' +
            '<a class="vw-btn vw-btn--voll" href="mailto:' + esc(z.email) + '">Antworten</a>' +
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
                '<textarea class="vw-input" id="vw-notiz" rows="3">' + esc(z.notiz || '') + '</textarea>' +
                '<div class="vw-aktionen" style="margin-top:12px">' +
                  '<button class="vw-btn vw-btn--leer" id="vw-notiz-speichern">Notiz speichern</button>' +
                  '<button class="vw-btn vw-btn--leer" id="vw-archiv">' + (z.archiviert ? 'Aus dem Archiv holen' : 'Archivieren') + '</button>' +
                  '<button class="vw-btn vw-btn--warnung" id="vw-loeschen">Löschen</button>' +
                '</div>' +
                '<p class="vw-hint" id="vw-status-meldung" style="margin-top:10px"></p>' +
              '</div>') +
        '</div>' +
      '</div>';
    $('#vw-zurueck').addEventListener('click', function () { offen = null; zeichneListe(); });
    if (klein) return;

    var melde = function (t) { $('#vw-status-meldung').textContent = t; };
    Array.prototype.forEach.call(document.querySelectorAll('[data-status]'), function (b) {
      b.addEventListener('click', function () {
        var s = b.getAttribute('data-status');
        ruf({ was: 'aendern', bereich: bereich, id: z.id, status: s })
          .then(function () { z.status = s; zeigeDetail(); })
          .catch(function (f) { melde(f.message); });
      });
    });
    $('#vw-notiz-speichern').addEventListener('click', function () {
      var n = $('#vw-notiz').value;
      ruf({ was: 'aendern', bereich: bereich, id: z.id, notiz: n })
        .then(function () { z.notiz = n; melde('Notiz gespeichert.'); })
        .catch(function (f) { melde(f.message); });
    });
    $('#vw-archiv').addEventListener('click', function () {
      var neu = !z.archiviert;
      ruf({ was: 'aendern', bereich: bereich, id: z.id, archiviert: neu })
        .then(function () { z.archiviert = neu; zeigeDetail(); })
        .catch(function (f) { melde(f.message); });
    });
    $('#vw-loeschen').addEventListener('click', function () {
      if (!window.confirm('Diesen Eintrag endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
      ruf({ was: 'loeschen', bereich: bereich, id: z.id })
        .then(function () {
          daten[bereich] = (daten[bereich] || []).filter(function (r) { return r.id !== z.id; });
          offen = null; zeichneListe();
        })
        .catch(function (f) { melde(f.message); });
    });
  }

  /* ---------- CSV ---------- */
  function csv() {
    var zeilen = gefiltert();
    if (!zeilen.length) return;
    var spalten = ['eingegangen_am', 'status', 'archiviert'].concat(FELDER[bereich].map(function (p) { return p[0]; })).concat(['notiz']);
    var zelle = function (w) { return '"' + String(w == null ? '' : w).replace(/"/g, '""') + '"'; };
    var text = '﻿' + spalten.join(';') + '\n' +
      zeilen.map(function (z) { return spalten.map(function (s) { return zelle(z[s]); }).join(';'); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'devries-' + bereich + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  document.addEventListener('DOMContentLoaded', function () { zeigeAnmeldung(''); });
})();
