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
    url: '',            // z. B. 'https://abcdefghijkl.supabase.co' (ohne Schraegstrich am Ende)
    key: '',            // anon / publishable key
    tabelle: 'galabau_anfragen'
  };

  /* Laengen entsprechen den CHECK-Bedingungen in schema.sql. Hier wird
     nur gekuerzt, damit gar nicht erst Unsinn losgeschickt wird — die
     verbindliche Pruefung macht die Datenbank. */
  var MAX = {
    quelle: 60, betreff: 160, name: 120, email: 200, telefon: 60,
    ort: 120, art: 40, bereich: 60, zeitraum: 120, nachricht: 5000
  };

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
    if (verdaechtig(o.form) || !konfiguriert()) { o.mailto(); return; }

    /* Reihenfolge: steuer muss vor dem Zeitgeber stehen. */
    var steuer = { abgebrochen: false };
    var abbruch = setTimeout(function () { steuer.abgebrochen = true; o.mailto(); }, 8000);

    fetch(CFG.url + '/rest/v1/' + encodeURIComponent(CFG.tabelle), {
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
      else o.mailto();
    }).catch(function () {
      clearTimeout(abbruch);
      if (!steuer.abgebrochen) o.mailto();
    });
  }

  window.dvFormular = { senden: senden, konfiguriert: konfiguriert };
})();
