/* Versand des Bewerbungsformulars. Nutzt dieselbe zentrale Stelle wie
   die Anfragen (formular.js), schreibt aber in die Bewerbungstabelle.
   Ohne hinterlegte Zugangsdaten oeffnet sich wie ueberall das
   E-Mail-Programm. */
(function () {
  "use strict";
  function start() {
    var form = document.querySelector('form[data-bewerbung]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var zeilen = [
        'Name: ' + (d.get('name') || ''),
        'E-Mail: ' + (d.get('email') || ''),
        'Telefon: ' + (d.get('telefon') || ''),
        'Stelle: ' + (d.get('stelle') || ''),
        'Verfügbar ab: ' + (d.get('verfuegbar_ab') || ''),
        '',
        d.get('nachricht') || ''
      ];
      var ziel = (window.dvFormular && window.dvFormular.empfaenger) || 'info@devries-galabau.de';
      var mailto = function () {
        window.location.href = 'mailto:' + ziel + '?subject='
          + encodeURIComponent('Initiativbewerbung Garten-Landschaftsbau')
          + '&body=' + encodeURIComponent(zeilen.join('\n'));
      };
      if (window.dvFormular) {
        window.dvFormular.senden({
          form: form,
          tabelle: 'bewerbung',
          quelle: 'stellenangebote',
          betreff: 'Bewerbung ' + (d.get('stelle') || 'Initiativ'),
          felder: {
            name: d.get('name'), email: d.get('email'), telefon: d.get('telefon'),
            stelle: d.get('stelle'), verfuegbar_ab: d.get('verfuegbar_ab'),
            nachricht: d.get('nachricht')
          },
          mailto: mailto
        });
        return;
      }
      mailto();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
