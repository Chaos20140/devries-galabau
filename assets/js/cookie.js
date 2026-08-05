/* Einwilligungsabfrage fuer die Google-Maps-Karte.
   ------------------------------------------------------------------
   Bis v44 gab es hier bewusst KEIN Banner: Die Karte lud erst auf Klick
   ("Zwei-Klick"), und weil nichts gespeichert wurde, setzte die Seite
   auch nichts auf dem Geraet ab. Der Betreiber wollte eine Abfrage
   gleich am Anfang — die verlangt, dass die Entscheidung ueberdauert,
   sonst waere sie bei jedem Seitenwechsel neu zu treffen.

   Damit legt die Seite erstmals einen Eintrag auf dem Endgeraet ab:
   genau einen, unter "dvg-karte". Er haelt nur fest, wie entschieden
   wurde. Das Speichern der Entscheidung selbst ist nach § 25 Abs. 2
   TDDDG unbedingt erforderlich — ohne den Eintrag koennte ein "Nein"
   nicht geachtet werden. Die drei Saetze der Datenschutzerklaerung, die
   bis v69 das Gegenteil behaupteten, sind im selben Schritt berichtigt.

   Bewusst KEINE Scrollsperre und KEIN modaler Dialog: Eine haengende
   Sperre macht die Seite unbedienbar (Lehre aus v33), und die Karte ist
   kein Grund, jemandem den Weg zum Impressum zu verstellen. Der Banner
   liegt ueber dem Inhalt, laesst sich aber ueberspringen.

   Bewusst ZWEI GLEICHWERTIGE Knoepfe: "Ablehnen" ist so gross, so
   erreichbar und so deutlich wie "Zulassen". Ein Banner, der das Nein
   versteckt, ist keine Einwilligung.

   Die Zwei-Klick-Loesung bleibt bestehen. Wer ablehnt oder gar nicht
   entscheidet, bekommt weiterhin die eigene Vorschau mit dem Knopf
   "Karte laden" — dieser eine Klick gilt dann nur fuer den Aufruf und
   wird nicht gespeichert. Der Banner nimmt also nichts weg, er erspart
   nur den wiederholten Klick.

   Die Texte stehen hier und NICHT in rahmen-texte.js: Der Server
   erzeugt jene Datei bei jedem Speichern von Menue und Fusszeile
   vollstaendig neu und kennt nur die dort festgelegte Struktur — ein
   zusaetzlicher Schluessel waere beim naechsten Menue-Speichern
   wortlos verschwunden. */
(function () {
  'use strict';

  var SCHLUESSEL = 'dvg-karte';
  var JA = 'ja', NEIN = 'nein';

  /* localStorage wirft, wenn der Browser Speicher fuer diese Herkunft
     sperrt (privater Modus mancher Browser, strenge Einstellungen).
     Dann verhaelt sich die Seite wie vor v70: kein Banner, Zwei-Klick. */
  function lesen() {
    try { return window.localStorage.getItem(SCHLUESSEL); } catch (e) { return null; }
  }
  function schreiben(wert) {
    try { window.localStorage.setItem(SCHLUESSEL, wert); return true; }
    catch (e) { return false; }
  }
  function loeschen() {
    try { window.localStorage.removeItem(SCHLUESSEL); } catch (e) {}
  }
  function nutzbar() {
    try {
      window.localStorage.setItem(SCHLUESSEL + '-test', '1');
      window.localStorage.removeItem(SCHLUESSEL + '-test');
      return true;
    } catch (e) { return false; }
  }

  var horcher = [];

  var API = {
    erlaubt: function () { return lesen() === JA; },
    entschieden: function () { return lesen() === JA || lesen() === NEIN; },
    /* Widerruf: Eintrag weg, Banner wieder da. Die bereits eingebettete
       Karte wird NICHT von selbst entfernt — sie ist Teil der aktuellen
       Seite, und ein Neuladen beendet sie ohnehin. Der Aufrufer sagt
       das dem Besucher (kontakt.js). */
    widerrufen: function () { loeschen(); melden(null); zeigen(); },
    /* Fuer kontakt.js: erfahren, wenn sich die Lage aendert. */
    beiAenderung: function (fn) { horcher.push(fn); }
  };
  function melden(wert) {
    for (var i = 0; i < horcher.length; i++) { try { horcher[i](wert); } catch (e) {} }
  }
  window.dvgKarte = API;

  /* Im Bearbeitungsmodus stoert der Banner die Werkzeugleiste und haette
     dort auch keinen Zweck — der Betreiber bearbeitet, er besucht nicht. */
  function bearbeitungsmodus() {
    try { return new URLSearchParams(location.search).get('bearbeiten') === '1'; }
    catch (e) { return false; }
  }

  var kasten = null;

  function el(tag, stil, text) {
    var n = document.createElement(tag);
    if (stil) n.setAttribute('style', stil);
    if (text != null) n.textContent = text;
    return n;
  }

  var KNOPF = 'appearance:none;cursor:pointer;font:600 15px/1.2 Outfit,system-ui,sans-serif;' +
              'border-radius:999px;padding:13px 22px;min-height:46px;flex:1 1 auto;' +
              'transition:background-color .15s cubic-bezier(.4,0,.2,1),border-color .15s cubic-bezier(.4,0,.2,1)';

  function zeigen() {
    if (kasten || bearbeitungsmodus()) return;

    kasten = el('div', 'position:fixed;z-index:60;left:50%;transform:translateX(-50%);' +
      'bottom:clamp(12px,3vw,26px);width:min(calc(100vw - 24px),560px);' +
      'border-radius:18px;padding:20px 22px;' +
      'background:rgba(255,255,255,.96);backdrop-filter:blur(26px) saturate(1.4);' +
      'border:1px solid rgba(12,29,20,.14);box-shadow:0 30px 70px -34px rgba(12,29,20,.5)');
    kasten.setAttribute('role', 'dialog');
    kasten.setAttribute('aria-labelledby', 'dvg-karte-titel');
    kasten.setAttribute('aria-describedby', 'dvg-karte-text');

    /* Bewusst KURZ und ohne Zweckangabe — so hat der Betreiber es
       gewollt. Der Text bleibt trotzdem wahr: "nur wenn Sie zustimmen"
       stimmt, weil ohne Zustimmung nichts geladen und nichts gesetzt
       wird. Wozu die Zustimmung dient, steht ausfuehrlich in der
       Datenschutzerklaerung; der Verweis darauf ist deshalb Pflicht und
       nicht Zierde. */
    var h = el('h2', 'margin:0 0 8px;font:600 17px/1.3 Outfit,system-ui,sans-serif;color:#0C1D14',
      'Cookies');
    h.id = 'dvg-karte-titel';
    h.tabIndex = -1;

    var p = el('p', 'margin:0 0 16px;font:400 14px/1.55 Outfit,system-ui,sans-serif;color:#26382E',
      'Wir setzen Cookies nur ein, wenn Sie zustimmen. Ihre Entscheidung ' +
      'merken wir uns auf diesem Gerät.');
    p.id = 'dvg-karte-text';

    var reihe = el('div', 'display:flex;flex-wrap:wrap;gap:10px;align-items:center');

    var nein = el('button', KNOPF + ';background:#fff;color:#26382E;border:1px solid rgba(12,29,20,.28)',
      'Ablehnen');
    nein.type = 'button';
    nein.id = 'dvg-karte-nein';

    var ja = el('button', KNOPF + ';background:#2C6E49;color:#fff;border:1px solid #2C6E49', 'Zustimmen');
    ja.type = 'button';
    ja.id = 'dvg-karte-ja';

    reihe.appendChild(nein);
    reihe.appendChild(ja);

    var link = el('p', 'margin:12px 0 0;font:400 13px/1.5 Outfit,system-ui,sans-serif;color:#41564A');
    var a = el('a', 'color:#2C6E49;text-decoration:underline', 'Datenschutzerklärung');
    a.href = (location.pathname.indexOf('/admin/') > -1 ? '../' : '') + 'datenschutz.html#karte';
    link.appendChild(el('span', null, 'Mehr in der '));
    link.appendChild(a);
    link.appendChild(el('span', null, '.'));

    kasten.appendChild(h);
    kasten.appendChild(p);
    kasten.appendChild(reihe);
    kasten.appendChild(link);

    /* Als ERSTES Kind von <body>: So liegt der Banner in der
       Tabreihenfolge vorn und ist mit der Tastatur sofort erreichbar,
       statt hinter der ganzen Seite. Sichtbar sitzt er trotzdem unten,
       weil er fest positioniert ist. */
    document.body.insertBefore(kasten, document.body.firstChild);

    /* Fokus auf die Ueberschrift, damit Screenreader ansagen, worum es
       geht — aber preventScroll, sonst springt die Seite. Kein
       Fokus-Kaefig: der Banner ist nicht modal, man kommt an ihm vorbei. */
    try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }

    nein.addEventListener('click', function () { entscheiden(NEIN); });
    ja.addEventListener('click', function () { entscheiden(JA); });
  }

  function verbergen() {
    if (!kasten) return;
    var k = kasten; kasten = null;
    k.remove();
  }

  function entscheiden(wert) {
    /* Laesst sich nichts speichern, ist eine Abfrage sinnlos — sie kaeme
       auf der naechsten Seite wieder. Dann gilt die Entscheidung fuer
       diesen Aufruf und der Banner verschwindet trotzdem. */
    schreiben(wert);
    verbergen();
    melden(wert);
  }

  function start() {
    if (bearbeitungsmodus()) return;
    if (!nutzbar()) return;          /* kein Speicher -> kein Banner, Zwei-Klick bleibt */
    var w = lesen();
    if (w !== JA && w !== NEIN) zeigen();

    /* Widerrufs-Schaltflaechen einsammeln (kontakt.html, datenschutz.html).
       Sichtbar gemacht wird die HUELLE, nicht der Knopf: dessen eigenes
       display im style-Attribut ueberstimmt sonst das [hidden] des
       Browsers, und der Knopf bliebe sichtbar, obwohl er ohne
       JavaScript nichts tut (dieselbe Falle wie in v45). */
    var knoepfe = document.querySelectorAll('[data-karte-widerruf]');
    for (var i = 0; i < knoepfe.length; i++) {
      (function (b) {
        var huelle = b.closest('[data-karte-huelle]');
        if (huelle) huelle.hidden = false;
        b.addEventListener('click', function () { API.widerrufen(); });
      })(knoepfe[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
