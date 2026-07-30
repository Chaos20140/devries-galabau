/* Seitenlogik, uebernommen aus dem Design-Projekt.
   Dort lief sie in der Design-Composer-Laufzeit; hier wird die Klasse
   unveraendert instanziiert und componentDidMount nach DOMContentLoaded
   aufgerufen. Die Props waren im Design Regler und stehen jetzt auf den
   dort hinterlegten Vorgabewerten. */
(function () {
  "use strict";

  /* Systemeinstellung "Bewegung reduzieren" — im Design nicht vorgesehen. */
  var __reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


  /* Minimale Nachbildung der Basisklasse der Design-Laufzeit. */
  class DCLogic {
    constructor(props) { this.props = props || {}; }
    setState() { /* im statischen Aufbau ohne Wirkung */ }
  }

class Component extends DCLogic {
  renderVals() { return {}; }
  componentDidMount() {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.92) {
        el.style.opacity = '0';
        /* Bei reduzierter Bewegung nur blenden, nicht schieben. */
        if (!__reduce) el.style.transform = 'translateY(26px)';
      }
      el.style.transition = __reduce
        ? 'opacity .35s ease'
        : 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)';
    });
    this.io = new IntersectionObserver(en => {
      en.forEach((e, i) => {
        if (!e.isIntersecting) return;
        const t = e.target;
        setTimeout(() => { t.style.opacity = '1'; t.style.transform = 'none'; }, i * 70);
        this.io.unobserve(t);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    els.forEach(el => this.io.observe(el));
    setTimeout(() => els.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; }), 6000);

    const form = document.querySelector('form[data-contact]');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const body = ['Name: ' + (d.get('name') || ''), 'E-Mail: ' + (d.get('email') || ''), 'Telefon: ' + (d.get('tel') || ''), '', d.get('text') || ''].join('\n');
      window.location.href = 'mailto:' + ((window.dvFormular && window.dvFormular.empfaenger) || 'info@devries-galabau.de') + '?subject=' + encodeURIComponent('Anfrage') + '&body=' + encodeURIComponent(body);
    });
  }
  componentWillUnmount() { if (this.io) this.io.disconnect(); }
}

  var __props = {};
  var __page = new Component(__props);

  function __start() {
    try { __page.componentDidMount(); }
    catch (err) { console.error('Seitenlogik konnte nicht starten:', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __start);
  else __start();

  window.addEventListener('pagehide', function () {
    if (typeof __page.componentWillUnmount === 'function') __page.componentWillUnmount();
  });
})();
