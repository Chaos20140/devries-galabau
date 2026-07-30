/* Seitenlogik der Anfrageseite. Gleiches Aufdecken wie auf den uebrigen
   Seiten, dazu der Versand des Formulars.

   Versand laeuft ueber mailto, weil die Seite statisch ausgeliefert wird
   und es kein Backend gibt. Sobald ein Endpunkt existiert, muss nur
   SUBMIT_ENDPOINT gesetzt werden — dann geht die Anfrage per fetch dorthin
   und mailto bleibt nur noch Ausweichweg. */
(function () {
  "use strict";

  /* Systemeinstellung "Bewegung reduzieren" — im Design nicht vorgesehen. */
  var __reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


  var SUBMIT_ENDPOINT = '';

  function reveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.92) {
        el.style.opacity = '0';
        if (!__reduce) el.style.transform = 'translateY(26px)';
      }
      el.style.transition = __reduce
        ? 'opacity .35s ease'
        : 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)';
    });
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        var t = e.target;
        setTimeout(function () { t.style.opacity = '1'; t.style.transform = 'none'; }, i * 70);
        io.unobserve(t);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
    // Sicherheitsnetz: falls der Observer nie ausloest, bleibt nichts unsichtbar
    setTimeout(function () {
      els.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
    }, 6000);
  }

  function wireForm() {
    var form = document.querySelector('form[data-contact]');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [
        'Auftraggeber: ' + (d.get('art') || ''),
        'Bereich: ' + (d.get('bereich') || ''),
        'Zeitraum: ' + (d.get('zeitraum') || ''),
        'Ort: ' + (d.get('ort') || ''),
        '',
        'Name: ' + (d.get('name') || ''),
        'E-Mail: ' + (d.get('email') || ''),
        'Telefon: ' + (d.get('tel') || ''),
        '',
        d.get('text') || ''
      ];
      var betreff = 'Anfrage ' + (d.get('bereich') || '');

      if (SUBMIT_ENDPOINT) {
        fetch(SUBMIT_ENDPOINT, { method: 'POST', body: d })
          .then(function (r) { if (r.ok) location.href = 'danke.html'; else fallback(); })
          .catch(fallback);
        return;
      }
      fallback();

      function fallback() {
        window.location.href = 'mailto:info@devries-galabau.de?subject='
          + encodeURIComponent(betreff.trim()) + '&body=' + encodeURIComponent(lines.join('\n'));
      }
    });
  }

  function start() {
    try { reveal(); wireForm(); }
    catch (err) { console.error('Seitenlogik konnte nicht starten:', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
