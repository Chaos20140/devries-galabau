/* Kopfzeile — übernommen aus dem Design-Projekt (garden-header.js).
   Angepasst gegenüber der Design-Fassung:
   · Links auf die Dateinamen dieses Projekts statt auf *.dc.html
   · Logo lokal statt von der alten WordPress-Installation
   · Datenschutz im Untermenü ergänzt (in Deutschland Pflichtangabe)
   · aria-expanded am Burger, aria-current am aktiven Link, Escape schließt */
(function () {
  const LOGO = 'assets/img/rg-logo.webp';
  const MAIN = [
    ['index.html', 'Rundgang'],
    ['gartengestaltung.html', 'Gestaltung'],
    ['gartenplanung.html', 'Planung'],
    ['gartenpflege.html', 'Pflege'],
    ['bepflanzung.html', 'Bepflanzung']
  ];
  const MORE = [
    ['ueber-uns.html', 'Über uns'],
    ['referenzen.html', 'Referenzen'],
    ['kontakt.html', 'Kontakt'],
    ['stellenangebote.html', 'Stellenangebote'],
    ['impressum.html', 'Impressum'],
    ['datenschutz.html', 'Datenschutz']
  ];

  class GardenHeader extends HTMLElement {
    connectedCallback() {
      if (this.__built) return;
      this.__built = true;
      const active = this.getAttribute('active') || '';
      /* cta landet in einem href innerhalb von innerHTML. Der Wert stammt aus
         unserem eigenen Markup, wird aber trotzdem entschaerft — so kann die
         Komponente auch dann nichts ausfuehren, wenn sie spaeter einmal mit
         fremden Daten befuellt wird. */
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
      const cta = esc(this.getAttribute('cta') || 'kontakt.html');
      const on = l => active === l;
      const cur = l => (on(l) ? ' aria-current="page"' : '');
      const pill = (h, l) => '<a href="' + h + '"' + cur(l) + ' class="gh-link' + (on(l) ? ' gh-on' : '') + '">' + l + '</a>';
      const item = (h, l) => '<a href="' + h + '"' + cur(l) + ' class="gh-item' + (on(l) ? ' gh-on2' : '') + '">' + l + '</a>';
      const big = (h, l) => '<a href="' + h + '"' + cur(l) + ' class="gh-big' + (on(l) ? ' gh-onBig' : '') + '">' + l + '</a>';
      const moreActive = MORE.some(m => on(m[1]));

      const root = this.attachShadow({ mode: 'open' });
      this.root = root;
      root.innerHTML =
        '<style>' +
        ':host{display:block}' +
        '*{box-sizing:border-box}' +
        'a{text-decoration:none}' +
        '@keyframes ghHalo{0%,100%{transform:scale(.9);opacity:.5}50%{transform:scale(1.1);opacity:.95}}' +
        '@keyframes ghBreathe{0%,100%{transform:scale(.85);opacity:.75}50%{transform:scale(1.2);opacity:1}}' +
        '.gh-head{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;gap:clamp(10px,2vw,26px);padding:14px clamp(14px,3vw,34px);transition:padding .5s cubic-bezier(.16,1,.3,1)}' +
        '.gh-head.gh-tight{padding:8px clamp(12px,2.4vw,26px)}' +
        '.gh-brand{flex:none;display:flex;align-items:center;gap:13px;color:#0B1A11;padding:9px 20px 9px 9px;border-radius:999px;background:linear-gradient(150deg,rgba(255,255,255,.9),rgba(255,255,255,.7));backdrop-filter:blur(22px) saturate(1.8);border:1px solid rgba(255,255,255,.9);box-shadow:0 12px 34px -14px rgba(9,26,17,.55), inset 0 1px 0 rgba(255,255,255,1)}' +
        '.gh-mark{position:relative;width:40px;height:40px;display:block;flex:none}' +
        '.gh-mark i{position:absolute;left:-6px;top:-6px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle,rgba(142,207,79,.5),rgba(142,207,79,0) 70%);animation:ghHalo 3.2s ease-in-out infinite}' +
        '.gh-mark img{position:relative;width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 0 0 2px rgba(255,255,255,.95), 0 4px 14px -4px rgba(9,26,17,.5)}' +
        '.gh-wm{display:flex;flex-direction:column;line-height:1.04}' +
        '.gh-wm b{font-size:19px;font-weight:700;letter-spacing:-.022em}' +
        '.gh-wm s{font-size:10px;font-weight:700;letter-spacing:.26em;color:#2C6E49;text-decoration:none}' +
        '.gh-nav{flex:1;display:flex;align-items:center;justify-content:center;gap:4px}' +
        '.gh-pill{display:flex;align-items:center;gap:4px;padding:7px;border-radius:999px;background:linear-gradient(150deg,rgba(255,255,255,.88),rgba(255,255,255,.66));backdrop-filter:blur(22px) saturate(1.8);border:1px solid rgba(255,255,255,.88);box-shadow:0 12px 34px -14px rgba(9,26,17,.5), inset 0 1px 0 rgba(255,255,255,1)}' +
        '.gh-link{color:#0F2418;font-size:14px;font-weight:600;padding:10px 17px;border-radius:999px;transition:background .3s ease,color .3s ease;white-space:nowrap}' +
        '.gh-link:hover{background:#1F5637;color:#F4F9F0}' +
        '.gh-on{background:#1F5637;color:#F4F9F0}' +
        '.gh-more{position:relative}' +
        '.gh-tog{font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:7px;color:#0F2418;font-size:14px;font-weight:600;padding:10px 15px;border-radius:999px;background:none;border:none;transition:background .3s ease,color .3s ease;white-space:nowrap}' +
        '.gh-tog:hover,.gh-more:hover .gh-tog,.gh-more.gh-open .gh-tog{background:#1F5637;color:#F4F9F0}' +
        '.gh-tog.gh-on{background:rgba(31,86,55,.14)}' +
        '.gh-tog span{font-size:9px;opacity:.75;transition:transform .3s ease}' +
        '.gh-more:hover .gh-tog span,.gh-more.gh-open .gh-tog span{transform:rotate(180deg)}' +
        '.gh-drop{position:absolute;right:0;top:calc(100% + 10px);min-width:216px;display:flex;flex-direction:column;padding:8px;border-radius:20px;background:linear-gradient(155deg,rgba(255,255,255,.96),rgba(255,255,255,.86));backdrop-filter:blur(26px) saturate(1.7);border:1px solid rgba(255,255,255,.9);box-shadow:0 26px 56px -22px rgba(9,26,17,.5);opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .3s ease,transform .3s ease,visibility .3s}' +
        '.gh-more:hover .gh-drop,.gh-more.gh-open .gh-drop,.gh-more:focus-within .gh-drop{opacity:1;visibility:visible;transform:none}' +
        '.gh-item{color:#0F2418;font-size:14.5px;font-weight:500;padding:11px 15px;border-radius:13px;transition:background .25s ease,color .25s ease;white-space:nowrap}' +
        '.gh-item:hover{background:rgba(31,86,55,.1);color:#1B4332}' +
        '.gh-on2{background:rgba(31,86,55,.12);font-weight:600;color:#1B4332}' +
        '.gh-burger{display:none;flex:none;align-items:center;justify-content:center;width:48px;height:48px;border-radius:999px;border:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.86);box-shadow:0 12px 34px -14px rgba(9,26,17,.5);cursor:pointer;padding:0}' +
        '.gh-burger i{display:flex;flex-direction:column;gap:5px;align-items:center}' +
        '.gh-burger b{display:block;width:20px;height:2px;border-radius:2px;background:#0F2418;transition:transform .4s ease,opacity .3s ease}' +
        '.gh-cta{flex:none;position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:10px;background:linear-gradient(140deg,#2A6E42,#123324);color:#F4F9F0;font-size:15px;font-weight:700;padding:15px 26px;border-radius:999px;border:1px solid rgba(255,255,255,.2);box-shadow:0 16px 38px -14px rgba(18,51,36,.85), inset 0 1px 0 rgba(255,255,255,.28);white-space:nowrap}' +
        '.gh-cta em{position:absolute;inset:0;background:linear-gradient(115deg,transparent 36%,rgba(255,255,255,.34) 50%,transparent 64%);transform:translateX(-120%);transition:transform .9s ease}' +
        '.gh-cta:hover em{transform:translateX(120%)}' +
        '.gh-cta i{position:relative;width:8px;height:8px;border-radius:50%;background:#8ECF4F;box-shadow:0 0 12px rgba(142,207,79,.9);display:block;animation:ghBreathe 2.2s ease-in-out infinite}' +
        /* Menue: eigene Kopfleiste mit Logo und Schliessen-Knopf, weil das
           Overlay die Kopfzeile der Seite verdeckt. Ohne die kam man nicht
           zurueck und sah das Logo nicht.
           Aufbau in drei Zonen (Kopf · scrollbare Mitte · fester Fuss),
           damit Anfrage-Knopf und Telefonnummer IMMER sichtbar bleiben —
           vorher rutschten sie bei 844 px Hoehe unten aus dem Bild. */
        '.gh-menu{position:fixed;inset:0;z-index:45;display:none;flex-direction:column;background:linear-gradient(160deg,#F6F9F4,#E2EEDE);opacity:0;transition:opacity .4s ease}' +
        '.gh-mtop{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(16px,5vw,28px);border-bottom:1px solid rgba(16,35,26,.09)}' +
        '.gh-mbrand{display:flex;align-items:center;gap:11px;min-width:0}' +
        '.gh-mbrand img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.95)}' +
        '.gh-mbrand b{display:block;font-size:16px;font-weight:700;letter-spacing:-.02em;color:#0F2418;line-height:1.1}' +
        '.gh-mbrand s{display:block;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:.22em;color:#2C6E49}' +
        '.gh-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:999px;border:1px solid rgba(16,35,26,.14);background:rgba(255,255,255,.9);cursor:pointer;padding:0}' +
        '.gh-close svg{width:18px;height:18px;stroke:#0F2418;stroke-width:2.2;fill:none;stroke-linecap:round}' +
        '.gh-inner{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px clamp(16px,5vw,28px) 8px}' +
        '.gh-big{display:flex;align-items:center;min-height:52px;font-size:19px;font-weight:600;letter-spacing:-.025em;color:#0F2418;border-bottom:1px solid rgba(16,35,26,.08)}' +
        '.gh-onBig{color:#2C6E49}' +
        /* Ordner als <details>: aufklappbar ohne eigenes JavaScript, mit
           Tastatur bedienbar und vom Screenreader korrekt angesagt. */
        '.gh-fold{border-bottom:1px solid rgba(16,35,26,.08)}' +
        '.gh-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;'
          + 'min-height:52px;font-size:19px;font-weight:600;letter-spacing:-.025em;color:#0F2418;'
          + 'cursor:pointer;list-style:none;-webkit-tap-highlight-color:transparent}' +
        '.gh-fold>summary::-webkit-details-marker{display:none}' +
        '.gh-fold>summary i{flex:none;width:26px;height:26px;display:flex;align-items:center;'
          + 'justify-content:center;border-radius:50%;background:rgba(31,86,55,.1);font-style:normal;'
          + 'font-size:11px;color:#1F5637;transition:transform .3s ease}' +
        '.gh-fold[open]>summary i{transform:rotate(180deg)}' +
        '.gh-sub{padding:0 0 10px 2px;display:flex;flex-direction:column}' +
        '.gh-sub a{display:flex;align-items:center;min-height:46px;font-size:16.5px;font-weight:500;color:#26382E;border-bottom:none}' +
        '.gh-sub a.gh-onBig{font-weight:600}' +
        '.gh-rechts{display:flex;gap:18px;padding:14px 0 4px;font-size:14px}' +
        '.gh-rechts a{color:#4A5F52}' +
        '.gh-mcta{flex:none;display:flex;flex-direction:column;gap:9px;padding:12px clamp(16px,5vw,28px) calc(14px + env(safe-area-inset-bottom));border-top:1px solid rgba(16,35,26,.09);background:rgba(255,255,255,.5)}' +
        '.gh-mcta a{display:inline-flex;align-items:center;justify-content:center;min-height:50px;font-size:16px;font-weight:700;padding:0 24px;border-radius:999px}' +
        /* Sichtbarer Fokusring — im Design nicht vorhanden, fuer die
           Tastaturbedienung aber notwendig. */
        '.gh-link:focus-visible,.gh-item:focus-visible,.gh-big:focus-visible,.gh-tog:focus-visible,.gh-burger:focus-visible,.gh-cta:focus-visible,.gh-brand:focus-visible{outline:3px solid #1F5637;outline-offset:3px}' +
        '@media (max-width:940px){.gh-nav{display:none}.gh-burger{display:inline-flex;margin-left:auto}.gh-cta{font-size:14px;padding:13px 18px}}' +
        '@media (max-width:560px){.gh-ctaword{display:none}.gh-cta{padding:13px 15px}.gh-wm b{font-size:17px}}' +
        '@media (prefers-reduced-motion:reduce){.gh-mark i,.gh-cta i{animation:none}.gh-head,.gh-menu,.gh-drop,.gh-cta em{transition:none}}' +
        '</style>' +
        '<header class="gh-head" part="head">' +
          '<a class="gh-brand" href="index.html">' +
            '<span class="gh-mark"><i></i><img src="' + LOGO + '" alt="" width="40" height="40"></span>' +
            '<span class="gh-wm"><b>de Vries</b><s>GALABAU</s></span>' +
          '</a>' +
          '<nav class="gh-nav" aria-label="Hauptmenü"><span class="gh-pill">' +
            MAIN.map(m => pill(m[0], m[1])).join('') +
            '<span class="gh-more" data-more>' +
              '<button class="gh-tog' + (moreActive ? ' gh-on' : '') + '" type="button" aria-expanded="false" aria-label="Weitere Seiten">Unternehmen <span aria-hidden="true">▾</span></button>' +
              '<span class="gh-drop">' + MORE.map(m => item(m[0], m[1])).join('') + '</span>' +
            '</span>' +
          '</span></nav>' +
          '<button class="gh-burger" type="button" aria-label="Menü öffnen" aria-expanded="false"><i><b></b><b></b><b></b></i></button>' +
          '<a class="gh-cta" href="' + cta + '"><em></em><i></i><span class="gh-ctalabel"><span class="gh-ctaword">Kostenlos </span>anfragen</span></a>' +
        '</header>' +
        '<div class="gh-menu" role="dialog" aria-modal="true" aria-label="Menü">' +
          '<div class="gh-mtop">' +
            '<a class="gh-mbrand" href="index.html">' +
              '<img src="' + LOGO + '" alt="" width="38" height="38">' +
              '<span><b>de Vries</b><s>GALABAU</s></span>' +
            '</a>' +
            '<button class="gh-close" type="button" aria-label="Menü schließen">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="gh-inner">' +
            /* Ordner "Leistungen" — die fuenf Seiten dahinter sind der Kern,
               muessen aber nicht dauerhaft die halbe Hoehe belegen. Auf der
               jeweiligen Unterseite steht er offen. */
            '<details class="gh-fold"' + (MAIN.some(x => on(x[1])) ? ' open' : '') + '>' +
              '<summary>Leistungen<i aria-hidden="true">▾</i></summary>' +
              '<div class="gh-sub">' + MAIN.map(m => big(m[0], m[1])).join('') + '</div>' +
            '</details>' +
            /* Direkt sichtbar, weil am haeufigsten gesucht. */
            big('ueber-uns.html', 'Über uns') +
            big('kontakt.html', 'Kontakt') +
            big('stellenangebote.html', 'Stellenangebote') +
            '<details class="gh-fold"' + (on('Impressum') || on('Datenschutz') ? ' open' : '') + '>' +
              '<summary>Rechtliches<i aria-hidden="true">▾</i></summary>' +
              '<div class="gh-sub">' +
                big('impressum.html', 'Impressum') +
                big('datenschutz.html', 'Datenschutz') +
              '</div>' +
            '</details>' +
            /* Referenzen steht in der Fusszeile; das Menue bleibt schlank. */
          '</div>' +
          '<div class="gh-mcta">' +
            '<a href="' + cta + '" style="background:linear-gradient(140deg,#2A6E42,#123324);color:#F4F9F0">Kostenlos anfragen</a>' +
            '<a href="tel:051531552" style="border:1px solid rgba(16,35,26,.18);color:#0F2418">05153 1552</a>' +
          '</div>' +
        '</div>';

      this.head = root.querySelector('.gh-head');
      this.menu = root.querySelector('.gh-menu');
      this.burger = root.querySelector('.gh-burger');
      this.bars = Array.from(root.querySelectorAll('.gh-burger b'));
      this.more = root.querySelector('[data-more]');
      this.tog = this.more.querySelector('.gh-tog');
      this.open = false;

      /* <details> kann seine Hoehe nicht von allein animieren: beim
         Schliessen ist der Inhalt sofort weg, beim Oeffnen sofort da.
         Deshalb den Klick abfangen, die Hoehe selbst fahren und open
         erst danach umsetzen. Bei reduzierter Bewegung ohne Animation. */
      const RUHIG = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const falteAnimieren = (det) => {
        const sub = det.querySelector('.gh-sub');
        if (!sub) return;
        const summary = det.querySelector('summary');
        summary.addEventListener('click', (e) => {
          if (RUHIG || det.__laeuft) return;
          e.preventDefault();
          det.__laeuft = true;
          const auf = !det.open;
          if (auf) det.open = true;
          const ziel = sub.scrollHeight;
          sub.style.overflow = 'hidden';
          sub.style.height = (auf ? 0 : ziel) + 'px';
          sub.style.opacity = auf ? '0' : '1';
          /* Erzwingt einen Layout-Durchlauf, sonst springt es ohne Uebergang. */
          void sub.offsetHeight;
          sub.style.transition = 'height .34s cubic-bezier(.16,1,.3,1), opacity .28s ease';
          sub.style.height = (auf ? ziel : 0) + 'px';
          sub.style.opacity = auf ? '1' : '0';
          const fertig = () => {
            sub.style.transition = ''; sub.style.height = '';
            sub.style.overflow = ''; sub.style.opacity = '';
            if (!auf) det.open = false;
            det.__laeuft = false;
          };
          sub.addEventListener('transitionend', function h(ev) {
            if (ev.propertyName !== 'height') return;
            sub.removeEventListener('transitionend', h); fertig();
          });
          /* Sicherheitsnetz, falls transitionend ausbleibt. */
          setTimeout(() => { if (det.__laeuft) fertig(); }, 600);
        });
      };
      Array.from(root.querySelectorAll('.gh-fold')).forEach(falteAnimieren);

      const setOpen = (v) => {
        this.open = v;
        this.burger.setAttribute('aria-expanded', v ? 'true' : 'false');
        this.burger.setAttribute('aria-label', v ? 'Menü schließen' : 'Menü öffnen');
        if (v) {
          this.menu.style.display = 'flex';
          requestAnimationFrame(() => { this.menu.style.opacity = '1'; });
          document.documentElement.style.overflow = 'hidden';
          this.bars[0].style.transform = 'translateY(7px) rotate(45deg)';
          this.bars[1].style.opacity = '0';
          this.bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
          const first = this.menu.querySelector('a');
          if (first) first.focus();
        } else {
          this.menu.style.opacity = '0';
          setTimeout(() => { if (!this.open) this.menu.style.display = 'none'; }, 400);
          document.documentElement.style.overflow = '';
          this.bars.forEach(b => { b.style.transform = 'none'; b.style.opacity = '1'; });
        }
      };

      this.burger.addEventListener('click', () => setOpen(!this.open));
      /* Schliessen-Knopf in der Menue-Kopfleiste: das Overlay verdeckt den
         Burger der Seite, ohne ihn gibt es keinen Weg zurueck. */
      const closeBtn = root.querySelector('.gh-close');
      if (closeBtn) closeBtn.addEventListener('click', () => { setOpen(false); this.burger.focus(); });
      this.menu.addEventListener('click', e => {
        if (e.target.closest('a') && this.open) setOpen(false);
      });
      this.tog.addEventListener('click', e => {
        e.preventDefault();
        const openNow = !this.more.classList.contains('gh-open');
        this.more.classList.toggle('gh-open', openNow);
        this.tog.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      });
      document.addEventListener('click', e => {
        if (!this.contains(e.target)) {
          this.more.classList.remove('gh-open');
          this.tog.setAttribute('aria-expanded', 'false');
        }
      });
      /* Escape schliesst beides — im Design fehlte das. */
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (this.open) { setOpen(false); this.burger.focus(); }
        this.more.classList.remove('gh-open');
        this.tog.setAttribute('aria-expanded', 'false');
      });

      this.onScroll = () => {
        const y = window.scrollY;
        if ((y > 40) !== this.tight) { this.tight = y > 40; this.head.classList.toggle('gh-tight', this.tight); }
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
      document.documentElement.style.overflow = '';
    }
  }
  if (!window.customElements.get('garden-header')) window.customElements.define('garden-header', GardenHeader);
})();
