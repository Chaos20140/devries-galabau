/* Lader für den Seiten-Editor.
 *
 * Warum diese Datei so klein ist: Vorher stand der ganze Editor hier —
 * 76 KB, ohne "defer", auf allen 14 Seiten, für JEDEN Besucher. Gemessen
 * waren das 76 728 von 80 770 Byte Skript einer Leistungsseite, also 95 %
 * des JavaScripts für ein Werkzeug, das nur der Betreiber benutzt und das
 * ohne "?bearbeiten=1" sofort wieder aussteigt.
 *
 * Jetzt entscheidet dieser Schnipsel, und das eigentliche Werkzeug wird
 * nur nachgeladen, wenn es gebraucht wird.
 *
 * Die Kennung (?v=…) wird aus dem eigenen Script-Tag übernommen, nicht
 * fest eingetragen. Sonst müsste man beim Hochzählen an zwei Stellen
 * denken — und die zweite vergisst man.
 */
(function () {
  'use strict';
  if (!/[?&]bearbeiten=1(&|$)/.test(location.search)) return;

  var mich = document.currentScript;
  var quelle = mich ? mich.src : '';
  var version = quelle.indexOf('?') > -1 ? quelle.slice(quelle.indexOf('?')) : '';
  var basis = quelle ? quelle.split('?')[0].replace(/editor\.js$/, '') : 'assets/js/';

  var s = document.createElement('script');
  s.src = basis + 'editor-werkzeug.js' + version;
  s.defer = true;
  document.head.appendChild(s);
})();
