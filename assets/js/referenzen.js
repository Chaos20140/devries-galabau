/* Seitenlogik, uebernommen aus dem Design-Projekt.
   Dort lief sie in der Design-Composer-Laufzeit; hier wird die Klasse
   unveraendert instanziiert und componentDidMount nach DOMContentLoaded
   aufgerufen. Die Props waren im Design Regler und stehen jetzt auf den
   dort hinterlegten Vorgabewerten. */
(function () {
  "use strict";

  /* Systemeinstellung "Bewegung reduzieren" — im Design nicht vorgesehen. */
  var __reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var __seitlich = window.innerWidth < 820 && !__reduce;


  /* Minimale Nachbildung der Basisklasse der Design-Laufzeit. */
  class DCLogic {
    constructor(props) { this.props = props || {}; }
    setState() { /* im statischen Aufbau ohne Wirkung */ }
  }

class Component extends DCLogic {
  renderVals() { return {}; }
  componentDidMount() {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.92) {
        el.style.opacity = '0';
        /* Bei reduzierter Bewegung nur blenden, nicht schieben.
           Auf dem Handy abwechselnd von links und rechts — gleicher
           Rhythmus wie auf der Startseite. */
        if (__seitlich) el.style.transform = 'translateX(' + (i % 2 ? 44 : -44) + 'px)';
        else if (!__reduce) el.style.transform = 'translateY(26px)';
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
    }, { rootMargin: '0px 0px -22% 0px', threshold: 0.05 });
    els.forEach(el => this.io.observe(el));
    setTimeout(() => els.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; }), 6000);

    this.lupe();

    const form = document.querySelector('form[data-contact]');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const body = ['Name: ' + (d.get('name') || ''), 'E-Mail: ' + (d.get('email') || ''), 'Telefon: ' + (d.get('tel') || ''), '', d.get('text') || ''].join('\n');
      window.location.href = 'mailto:' + ((window.dvFormular && window.dvFormular.empfaenger) || 'info@devries-galabau.de') + '?subject=' + encodeURIComponent('Anfrage zu einem Projekt') + '&body=' + encodeURIComponent(body);
    });
  }
  /* Grosse Bildansicht fuer die Projektfotos (Wunsch des Betreibers,
     09/2026). Vorher fuehrte "Projekt ansehen" auf alte WordPress-Adressen,
     die seit dem Domainumzug auf diese Seite zurueckleiten — der Klick
     bewirkte sichtbar nichts.
     <dialog> mit showModal(): Escape, Fokusfalle und inerten Hintergrund
     liefert der Browser selbst. Bewusst KEINE Scrollsperre (Lehre aus v33:
     eine haengende Sperre macht die Seite unbedienbar).
     Kein innerHTML — Titel und Alt-Text kommen nur als textContent bzw.
     Attribut herein. */
  lupe() {
    const knoepfe = Array.from(document.querySelectorAll('[data-lupe]'));
    if (!knoepfe.length || typeof HTMLDialogElement !== 'function') return;

    const dlg = document.createElement('dialog');
    dlg.className = 'ref-lupe';
    dlg.setAttribute('aria-label', 'Projektfoto');
    const zu = document.createElement('button');
    zu.type = 'button';
    zu.className = 'ref-lupe-zu';
    zu.setAttribute('aria-label', 'Ansicht schließen');
    zu.textContent = '×';
    const fig = document.createElement('figure');
    const bild = document.createElement('img');
    bild.decoding = 'async';
    const unter = document.createElement('figcaption');
    fig.append(bild, unter);
    dlg.append(zu, fig);
    document.body.appendChild(dlg);

    const titelVon = k => {
      const karte = k.closest('article');
      const t = karte && karte.querySelector('[data-ed]');
      return t ? t.textContent.trim() : '';
    };
    /* Groesste Datei aus dem srcset. Dateinamen nicht umbauen: der
       Seiten-Editor vergibt beim Bildwechsel neue Namen. */
    const groesste = img => {
      const kand = (img.getAttribute('srcset') || '').split(',')
        .map(x => x.trim().split(/\s+/))
        .filter(p => p[0] && /^\d+w$/.test(p[1] || ''))
        .sort((x, y) => parseInt(y[1], 10) - parseInt(x[1], 10));
      return kand.length ? kand[0][0] : (img.currentSrc || img.src);
    };

    let ausloeser = null;
    dlg.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      bild.removeAttribute('src');
      if (ausloeser) ausloeser.focus({ preventScroll: true });
    });

    knoepfe.forEach(k => {
      const titel = titelVon(k);
      k.setAttribute('aria-label', titel ? 'Foto vergrößern: ' + titel : 'Foto vergrößern');
      k.addEventListener('click', ev => {
        /* Im Bearbeitungsmodus legt der Seiten-Editor Knoepfe per
           preventDefault still — dann keine Ansicht oeffnen. */
        if (ev.defaultPrevented || dlg.open) return;
        const img = k.querySelector('img');
        if (!img) return;
        ausloeser = k;
        bild.removeAttribute('src');
        bild.alt = img.alt || '';
        bild.src = groesste(img);
        unter.textContent = titelVon(k);
        dlg.showModal();
      });
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
