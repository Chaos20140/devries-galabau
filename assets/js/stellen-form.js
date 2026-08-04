/* Versand des Bewerbungsformulars. Nutzt dieselbe zentrale Stelle wie
   die Anfragen (formular.js), schreibt aber in die Bewerbungstabelle.
   Ohne hinterlegte Zugangsdaten oeffnet sich wie ueberall das
   E-Mail-Programm. */
(function () {
  "use strict";
  function start() {
    var form = document.querySelector('form[data-bewerbung]');
    if (!form) return;
    /* Der Knopf oben fuehrt ueber die Sprungmarke #bewerbung hierher. Das
       allein genuegt: ohne JavaScript springt der Browser selbst. Mit
       JavaScript machen wir zwei Dinge besser — sanft scrollen statt
       springen, und den Schreibfokus gleich ins erste Feld setzen, damit
       man sofort tippen kann. Ausserdem verschiebt sich die Sprungmarke,
       solange ueber ihr noch Bilder nachladen; scrollIntoView rechnet im
       Moment des Klicks. */
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#bewerbung"]'), function (a) {
      a.addEventListener('click', function (e) {
        var ziel = document.getElementById('bewerbung');
        if (!ziel) return;
        e.preventDefault();
        var sanft = !(window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        ziel.scrollIntoView({ behavior: sanft ? 'smooth' : 'auto', block: 'start' });
        /* Erst nach dem Scrollen fokussieren, sonst springt der Browser
           selbst noch einmal. */
        setTimeout(function () {
          var erstes = ziel.querySelector('[name="name"]');
          /* Bewusst OHNE preventScroll: laeuft das weiche Scrollen aus
             irgendeinem Grund nicht, holt das Fokussieren das Feld selbst
             ins Bild. Hat es geklappt, steht es ohnehin schon da und der
             Fokus bewegt nichts mehr. */
          if (erstes) erstes.focus();
        }, sanft ? 700 : 0);
      });
    });

    var hinweis = document.getElementById('bw-datei-hinweis');
    var eingabe = form.querySelector('[name="lebenslauf"]');
    var standardHinweis = hinweis ? hinweis.textContent : '';

    function sageHinweis(text, alsFehler) {
      if (!hinweis) return;
      hinweis.textContent = text || standardHinweis;
      hinweis.style.color = alsFehler ? '#FFB4A6' : 'rgba(243,247,240,.66)';
      hinweis.setAttribute('role', alsFehler ? 'alert' : 'status');
    }

    /* Sofort beim Auswaehlen pruefen, nicht erst beim Absenden — sonst
       merkt der Bewerber erst nach dem Ausfuellen, dass die Datei nicht
       passt. */
    if (eingabe) {
      eingabe.addEventListener('change', function () {
        var f = eingabe.files && eingabe.files[0];
        if (!f) { sageHinweis(null, false); return; }
        var meckern = window.dvFormular && window.dvFormular.dateiPruefen(f);
        if (meckern) { eingabe.value = ''; sageHinweis(meckern, true); return; }
        sageHinweis('Ausgewählt: ' + f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)', false);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var datei = eingabe && eingabe.files && eingabe.files[0];
      var knopf = form.querySelector('button[type="submit"]') || form.querySelector('button');

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
      if (!window.dvFormular) { mailto(); return; }

      var weiter = function (anhang) {
        window.dvFormular.senden({
          form: form,
          tabelle: 'bewerbung',
          quelle: 'stellenangebote',
          betreff: 'Bewerbung ' + (d.get('stelle') || 'Initiativ'),
          felder: {
            name: d.get('name'), email: d.get('email'), telefon: d.get('telefon'),
            stelle: d.get('stelle'), verfuegbar_ab: d.get('verfuegbar_ab'),
            nachricht: d.get('nachricht'),
            datei: anhang ? anhang.datei : null,
            datei_name: anhang ? anhang.datei_name : null
          },
          mailto: mailto
        });
      };

      if (!datei) { weiter(null); return; }

      var meckern = window.dvFormular.dateiPruefen(datei);
      if (meckern) { sageHinweis(meckern, true); return; }

      if (knopf) { knopf.disabled = true; knopf.textContent = 'Lädt hoch …'; }
      sageHinweis('Lebenslauf wird übertragen …', false);
      window.dvFormular.dateiHochladen(datei)
        .then(function (anhang) { weiter(anhang); })
        .catch(function (f) {
          /* Die Bewerbung ist wichtiger als der Anhang: sie geht trotzdem
             raus, und der Bewerber erfaehrt, dass die Datei fehlt — statt
             dass beides stillschweigend liegen bleibt. */
          if (knopf) { knopf.disabled = false; knopf.textContent = 'Bewerbung senden →'; }
          sageHinweis('Der Lebenslauf konnte nicht übertragen werden (' + (f && f.message) +
            '). Ihre Bewerbung wird trotzdem gesendet — bitte schicken Sie die Datei an ' +
            'info@devries-galabau.de nach.', true);
          zeilen.push('', 'Hinweis: Der Lebenslauf konnte nicht übertragen werden.');
          setTimeout(function () { weiter(null); }, 2500);
        });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
