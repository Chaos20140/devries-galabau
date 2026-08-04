/* Fußzeile — übernommen aus dem Design-Projekt (garden-footer.js).
   Baut zwei gezeichnete Bäume, rankende Triebe, Blüten und Schmetterlinge
   als SVG und animiert sie scrollabhängig.
   Angepasst gegenüber der Design-Fassung:
   · Links auf die Dateinamen dieses Projekts statt auf *.dc.html
   · Logo lokal statt von der alten WordPress-Installation
   · Datenschutz ergänzt (in Deutschland Pflichtangabe)
   · prefers-reduced-motion: die Dauerbewegung steht still, die Szene bleibt */
(function () {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class GardenFooter extends HTMLElement {
    connectedCallback() {
      if (!this.__built) {
        this.__built = true;
        this.build();
      }
      this.start();
    }

    build() {
      const active = this.getAttribute('active') || '';
      const R = this.attachShadow({ mode: 'open' });
      this.R = R;
      this.style.cssText = 'position:relative;display:block';
      R.innerHTML =
        '<style>' +
        ':host{display:block;position:relative}' +
        'a{text-decoration:none}' +
        'a:focus-visible{outline:3px solid #1B4332;outline-offset:3px;border-radius:6px}' +
        '@keyframes gfSway{0%,100%{transform:rotate(-1.7deg)}50%{transform:rotate(1.7deg)}}' +
        '@media (prefers-reduced-motion:reduce){*{animation:none !important}}' +
        '@media (max-width: 900px){.gf-pad{padding-left:clamp(18px,5vw,40px);padding-right:clamp(18px,5vw,40px)}.gf-tree{display:none}}' +
        /* Handy: die gezeichnete Gartenszene traegt hier nicht. Sie kostete
           1216 px Fusszeile — knapp ein Drittel der ganzen Seite — und wirkte
           bei dieser Breite wie Clipart. Bleibt am Desktop, faellt hier weg. */
        /* ⚠ Alle Abstaende stehen im Design als Inline-Style. Der schlaegt
           jede Regel aus dem Stylesheet — ohne !important passiert hier
           nichts. Nachgemessen: 185 px Kopfpolster blieben stehen. */
        '@media (max-width: 760px){' +
          '.gf-pad{padding:40px clamp(16px,5vw,24px) 26px !important}' +
          '[data-meadow],[data-band]{display:none !important}' +
          '.gf-card{border-radius:20px !important;padding:20px 18px !important;box-shadow:0 18px 40px -30px rgba(12,29,20,.35) !important}' +
          '.gf-name{font-size:24px !important}' +
          /* Auf dem Handy sind die Linkspalten Ordner. <details> bringt das
             Auf- und Zuklappen mit, ohne eigenes JavaScript und mit
             Tastaturbedienung. */
          '.gf-fold>summary{display:flex !important;align-items:center;justify-content:space-between;'
            + 'gap:10px;min-height:44px;cursor:pointer;list-style:none;font-size:12px;font-weight:700;'
            + 'letter-spacing:.18em;text-transform:uppercase;color:#46761F;'
            + 'border-bottom:1px solid rgba(16,35,26,.1)}' +
          '.gf-fold>summary::-webkit-details-marker{display:none}' +
          '.gf-fold>summary i{font-style:normal;font-size:10px;transition:transform .3s ease}' +
          '.gf-fold[open]>summary i{transform:rotate(180deg)}' +
          '.gf-sub{display:flex;flex-direction:column;gap:2px;padding:6px 0 10px}' +
          '.gf-sub a{min-height:40px;display:flex;align-items:center}' +
          '.gf-lead{display:none !important}' +
          '.gf-social{margin-top:14px !important}' +
        '}' +
        '.gf-wrap{container-type:inline-size}' +
        '.gf-fold{min-width:0}' +
        '.gf-fold>summary{display:block;font-size:11px;font-weight:600;letter-spacing:.2em;'
          + 'text-transform:uppercase;color:#46761F;margin-bottom:11px;list-style:none}' +
        '.gf-fold>summary::-webkit-details-marker{display:none}' +
        '.gf-fold>summary i{display:none}' +
        '.gf-sub{display:flex;flex-direction:column;gap:11px;min-width:0}' +
        '.gf-fold>summary:focus-visible{outline:3px solid #1B4332;outline-offset:3px}' +
        '.gf-row{display:grid;grid-template-columns:minmax(min-content,2fr) repeat(3,minmax(min-content,.9fr));gap:clamp(14px,1.6vw,36px);align-items:start}' +
        '@container (max-width: 760px){.gf-row{grid-template-columns:repeat(2,minmax(min-content,1fr))}.gf-row>:first-child{grid-column:1/-1}}' +
        '@container (max-width: 430px){.gf-row{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 14px}.gf-row>:first-child{grid-column:1/-1}}' +
        '</style>' +
        '<footer class="gf-pad" style="position:relative;z-index:4;padding:clamp(150px,22vh,270px) clamp(20px,9vw,190px) 96px;background:linear-gradient(180deg,rgba(237,243,232,0) 0%,#EDF3E8 12%,#E6EEE0 100%)">' +
          '<div data-meadow style="position:absolute;left:0;right:0;bottom:-14px;height:230px;pointer-events:none;z-index:2;overflow:visible">' +
            '<svg viewBox="0 0 1600 230" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"></svg>' +
          '</div>' +
          '<div style="position:absolute;left:0;right:0;bottom:-14px;height:104px;pointer-events:none;z-index:6;overflow:visible" data-band>' +
            '<svg viewBox="0 0 1600 104" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"></svg>' +
          '</div>' +
          '<div class="gf-tree" style="position:absolute;left:0;top:-210px;bottom:-14px;width:clamp(140px,13vw,190px);pointer-events:none;z-index:1;overflow:hidden">' +
            '<svg viewBox="0 0 290 900" preserveAspectRatio="xMinYMax meet" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden"></svg>' +
          '</div>' +
          '<div class="gf-tree" style="position:absolute;right:0;top:-210px;bottom:-14px;width:clamp(140px,13vw,190px);pointer-events:none;z-index:1;overflow:hidden">' +
            '<svg viewBox="0 0 290 900" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden"></svg>' +
          '</div>' +
          '<div class="gf-wrap" style="position:relative;z-index:5;max-width:1280px;margin:0 auto">' +
            '<div class="gf-card" style="position:relative;overflow:hidden;border-radius:clamp(24px,3vw,36px);padding:clamp(26px,3.4vw,48px);background:linear-gradient(155deg,rgba(255,255,255,.72),rgba(255,255,255,.42));backdrop-filter:blur(26px) saturate(1.7);border:1px solid rgba(255,255,255,.72);box-shadow:0 30px 60px -34px rgba(12,29,20,.4), inset 0 1px 0 rgba(255,255,255,.92), inset 0 -1px 0 rgba(255,255,255,.35)">' +
            '<div class="gf-row">' +
            '<div style="min-width:0">' +
            '<div style="display:flex;align-items:center;gap:clamp(12px,1.6vw,20px)">' +
            '<img src="assets/img/rg-logo.webp" alt="" width="84" height="84" style="flex:none;width:clamp(52px,6vw,84px);height:clamp(52px,6vw,84px);border-radius:50%;object-fit:cover;display:block;border:2px solid rgba(255,255,255,.85);box-shadow:0 14px 30px -16px rgba(12,29,20,.45)">' +
            '<div class="gf-name" style="font-size:clamp(28px,4vw,54px);line-height:.94;font-weight:600;letter-spacing:-.045em;background:linear-gradient(120deg,#1B4332,#46761F);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent"><span style="display:block;white-space:nowrap">de Vries</span><span style="display:block;white-space:nowrap">GaLa-Bau</span></div>' +
            '</div>' +
            '<p class="gf-lead" style="margin:16px 0 0;font-size:14.5px;line-height:1.6;color:#3C5145;max-width:32ch">Garten- und Landschaftsbau in Salzhemmendorf. Gestaltung, Planung, Bepflanzung und Pflege — seit 1998 aus einer Hand.</p>' +
            '<div class="gf-social" style="display:flex;gap:10px;margin-top:20px">' +
            '<a href="https://www.instagram.com/dv_devries/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:600;color:#1B4332;background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.7)">Instagram</a>' +
            '<a href="https://www.facebook.com/devriesdienstleistungen" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:600;color:#1B4332;background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.7)">Facebook</a>' +
            '</div>' +
            '</div>' +
            '<details class="gf-fold" open><summary>Leistungen<i aria-hidden="true">▾</i></summary><div class="gf-sub">' +
            '<a href="gartengestaltung.html" style="font-size:15px;color:#26382E;text-decoration:none">Gartengestaltung</a>' +
            '<a href="gartenplanung.html" style="font-size:15px;color:#26382E;text-decoration:none">Gartenplanung</a>' +
            '<a href="gartenpflege.html" style="font-size:15px;color:#26382E;text-decoration:none">Gartenpflege</a>' +
            '<a href="bepflanzung.html" style="font-size:15px;color:#26382E;text-decoration:none">Bepflanzung</a>' +
            '</div></details>' +
            '<details class="gf-fold" open><summary>Ansichten<i aria-hidden="true">▾</i></summary><div class="gf-sub">' +
                        '<a href="stellenangebote.html" style="font-size:15px;color:#26382E;text-decoration:none">Stellenangebote</a>' +
            '<a href="datenschutz.html" style="font-size:15px;color:#26382E;text-decoration:none">Datenschutz</a>' +
            '<a href="referenzen.html" style="font-size:15px;color:#26382E;text-decoration:none">Referenzen</a>' +
            '<a href="impressum.html" style="font-size:15px;color:#26382E;text-decoration:none">Impressum</a>' +
'<a href="index.html" style="font-size:15px;color:#26382E;text-decoration:none">Rundgang</a>' +
            '<a href="ueber-uns.html" style="font-size:15px;color:#26382E;text-decoration:none">Über uns</a>' +
            '<a href="kontakt.html" style="font-size:15px;color:#26382E;text-decoration:none">Kontakt</a>' +
            '</div></details>' +
            '<div style="display:flex;flex-direction:column;gap:11px;min-width:0">' +
            '<div style="font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#46761F">Kontakt</div>' +
            '<a href="tel:051531552" style="font-size:19px;font-weight:600;color:#1B4332;letter-spacing:-.01em">05153 1552</a>' +
            '<a href="mailto:info@devries-galabau.de" style="font-size:15px;color:#26382E;text-decoration:none">info@devries-galabau.de</a>' +
            '<div style="font-size:14.5px;line-height:1.6;color:#3C5145">Mo–Fr 8:00–16:00<br>Salzhemmendorf, Niedersachsen</div>' +
            '</div>' +
            '</div>' +
            '<div style="margin-top:clamp(24px,3.4vh,40px);padding-top:20px;border-top:1px solid rgba(16,35,26,.1);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;font-size:13px;color:#4A5D51">' +
            '<span>© <span data-year>2026</span> de Vries Galabau · Garten- und Landschaftsbau</span>' +
            '<span>Salzhemmendorf · Hameln · Hildesheim</span>' +
            /* Der einzige Verweis nach aussen auf dieser Seite. "noopener"
               ist Pflicht: ohne das bekaeme die geoeffnete Seite ueber
               window.opener Zugriff auf dieses Fenster. */
            '<span>Webdesign &amp; Hosting: ' +
            '<a href="https://axion-studio.de" target="_blank" rel="noopener" ' +
            'style="color:#2C6E49;font-weight:600;text-decoration:none">Axion Studio</a></span>' +
            '</div>' +
            '</div>' +
          '</div>' +
        '</footer>';

      const ft = R.querySelector('footer');
      const L = Array.from(ft.children);
      this.$fvines = L[0];
      this.$vine = L[0].firstElementChild;
      this.$front = L[1].firstElementChild;
      this.$trunkL = L[2].firstElementChild;
      this.$trunkR = L[3].firstElementChild;
      this.$row = R.querySelector('.gf-row');

      Array.from(R.querySelectorAll('[data-year]')).forEach(el => { el.textContent = new Date().getFullYear(); });

      /* Die Linkspalten sind <details>. Am Desktop stehen sie offen und
         sehen aus wie zuvor; auf dem Handy sind sie zu, sonst waere die
         Fusszeile laenger als vorher statt kuerzer. */
      const mq = window.matchMedia('(max-width: 760px)');
      const falten = () => {
        Array.from(R.querySelectorAll('.gf-fold')).forEach(d => { d.open = !mq.matches; });
      };
      falten();
      if (mq.addEventListener) mq.addEventListener('change', falten);
      else if (mq.addListener) mq.addListener(falten);

      /* <details> kann seine Hoehe nicht von allein animieren: beim
         Schliessen ist der Inhalt sofort weg, beim Oeffnen sofort da.
         Deshalb den Klick abfangen, die Hoehe selbst fahren und open
         erst danach umsetzen. Bei reduzierter Bewegung ohne Animation. */
      const RUHIG = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const falteAnimieren = (det) => {
        const sub = det.querySelector('.gf-sub');
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
      Array.from(R.querySelectorAll('.gf-fold')).forEach(falteAnimieren);

      const mark = () => {
        Array.from(R.querySelectorAll('a')).forEach(a => {
          /* Dateiname ODER Beschriftung — siehe garden-header.js.
             Der Dateiname ueberlebt eine Umbenennung im Editor, die
             Beschriftung nicht. Beides zu pruefen haelt vorhandene Seiten
             lauffaehig und macht neue unabhaengig vom Text. */
          const ziel = (a.getAttribute('href') || '').split('/').pop();
          if ((a.textContent || '').trim() === active || (ziel && ziel === active)) {
            a.style.color = '#2C6E49';
            a.style.fontWeight = '600';
            a.setAttribute('aria-current', 'page');
          }
        });
      };
      mark();
      this.setupVines();
    }

    setupVines() {
      const R = this.R;
      this.fvines = this.$fvines;
      const vsvg = this.$vine;
      this.blooms = [];
      this.trunks = [];
      this.fbf = [];
      this.canopy = [];
      const frontClr = this.$front;
      if (vsvg) vsvg.innerHTML = '';
      if (frontClr) frontClr.innerHTML = '';
      if (!vsvg) return;

      const ns2 = 'http://www.w3.org/2000/svg';
      const front = this.$front;
      const flowerHost = front || vsvg;
      const petalSets = [
        { p: '#FFFFFF', c: '#E8A81F', n: 8, r: 15, ry: 6.4 },
        { p: '#F6D46A', c: '#D08A22', n: 7, r: 13, ry: 5.8 },
        { p: '#F3B8C8', c: '#E0A93C', n: 6, r: 14, ry: 6.2 },
        { p: '#C9E3F7', c: '#E8A81F', n: 6, r: 12, ry: 5.4 }
      ];
      for (let k = 0; k < 26; k++) {
        const x = 30 + (k / 26) * 1560 + (Math.random() - 0.5) * 26;
        const baseY = 106;
        const h = 30 + Math.random() * 46;
        const lean = (Math.random() - 0.5) * 26;
        const g0 = document.createElementNS(ns2, 'g');
        g0.setAttribute('opacity', '0');
        flowerHost.appendChild(g0);
        const stem = document.createElementNS(ns2, 'path');
        stem.setAttribute('d', 'M 0 0 C ' + (lean * 0.3).toFixed(1) + ' ' + (-h * 0.4) + ' ' + (lean * 0.8).toFixed(1) + ' ' + (-h * 0.7) + ' ' + lean.toFixed(1) + ' ' + (-h).toFixed(1));
        stem.setAttribute('fill', 'none');
        stem.setAttribute('stroke', k % 3 ? '#3E8B45' : '#2A6E42');
        stem.setAttribute('stroke-width', '3');
        stem.setAttribute('stroke-linecap', 'round');
        g0.appendChild(stem);
        for (let j = 0; j < 2; j++) {
          const lf = document.createElementNS(ns2, 'ellipse');
          const sz = 11 - j * 2;
          lf.setAttribute('rx', String(sz));
          lf.setAttribute('ry', String(sz * 0.44));
          lf.setAttribute('fill', j ? '#5FAC2C' : '#3E8B45');
          const ly = -h * (0.34 + j * 0.24);
          lf.setAttribute('transform', 'translate(' + (lean * (0.3 + j * 0.3)).toFixed(1) + ',' + ly.toFixed(1) + ') rotate(' + (j ? 34 : -142) + ') translate(' + sz + ',0)');
          g0.appendChild(lf);
        }
        const set = petalSets[k % petalSets.length];
        const head = document.createElementNS(ns2, 'g');
        head.setAttribute('transform', 'translate(' + lean.toFixed(1) + ',' + (-h).toFixed(1) + ')');
        for (let q = 0; q < set.n; q++) {
          const pet = document.createElementNS(ns2, 'ellipse');
          pet.setAttribute('rx', String(set.r));
          pet.setAttribute('ry', String(set.ry));
          pet.setAttribute('cx', String(set.r));
          pet.setAttribute('fill', set.p);
          pet.setAttribute('transform', 'rotate(' + (q * (360 / set.n)) + ')');
          head.appendChild(pet);
        }
        const core = document.createElementNS(ns2, 'circle');
        core.setAttribute('r', String(set.r * 0.34));
        core.setAttribute('fill', set.c);
        head.appendChild(core);
        g0.appendChild(head);
        g0.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + baseY + ')');
        this.blooms.push({ el: g0, head: head, delay: 0.04 + (k % 9) * 0.03, ph: Math.random() * 6.28, x: x, lean: lean, h: h });
      }

      [this.$trunkL, this.$trunkR].forEach((tsvg, ti) => {
        if (!tsvg) return;
        tsvg.innerHTML = '';
        let seed = ti ? 8731 : 2411;
        const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        const g = document.createElementNS(ns2, 'g');
        if (ti) g.setAttribute('transform', 'translate(290,0) scale(-1,1)');
        tsvg.appendChild(g);

        const barks = ['#3A2C1E', '#4B3826', '#5C4630'];
        const leafCols = ['#25562F', '#2F6E38', '#3E8B45', '#4C9A3C'];
        const tips = [];

        const taper = (x0, y0, x1, y1, cx, cy, w0, w1) => {
          const N = 12, Lp = [], Rr = [];
          for (let i = 0; i <= N; i++) {
            const u = i / N, iu = 1 - u;
            const px = iu * iu * x0 + 2 * iu * u * cx + u * u * x1;
            const py = iu * iu * y0 + 2 * iu * u * cy + u * u * y1;
            const dx = 2 * iu * (cx - x0) + 2 * u * (x1 - cx);
            const dy = 2 * iu * (cy - y0) + 2 * u * (y1 - cy);
            const m = Math.hypot(dx, dy) || 1;
            const nx = -dy / m, ny = dx / m;
            const w = (w0 + (w1 - w0) * u) * 0.5;
            Lp.push([px + nx * w, py + ny * w]);
            Rr.push([px - nx * w, py - ny * w]);
          }
          let d = 'M ' + Lp[0][0].toFixed(1) + ' ' + Lp[0][1].toFixed(1);
          for (let i = 1; i <= N; i++) d += ' L ' + Lp[i][0].toFixed(1) + ' ' + Lp[i][1].toFixed(1);
          for (let i = N; i >= 0; i--) d += ' L ' + Rr[i][0].toFixed(1) + ' ' + Rr[i][1].toFixed(1);
          return d + ' Z';
        };

        const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const branch = (x0, y0, ang, len, w, depth) => {
          const spread = (rnd() - 0.5) * 0.34;
          const a1 = ang + spread * 0.5;
          const x1 = cl(x0 + Math.cos(a1) * len, 12, 244);
          const y1 = cl(y0 + Math.sin(a1) * len, 56, 880);
          const cx = x0 + Math.cos(ang - 0.26) * len * 0.55;
          const cy = y0 + Math.sin(ang - 0.26) * len * 0.55;
          const p = document.createElementNS(ns2, 'path');
          p.setAttribute('d', taper(x0, y0, x1, y1, cx, cy, w, Math.max(1.6, w * 0.34)));
          p.setAttribute('fill', barks[depth % 3]);
          g.appendChild(p);
          if (depth >= 2 || len < 46) { tips.push([x1, y1, 40 + rnd() * 24]); return; }
          const kids = depth === 0 ? 3 : (rnd() > 0.55 ? 2 : 1);
          for (let k = 0; k < kids; k++) {
            const off = (k - (kids - 1) / 2) * (0.55 + rnd() * 0.22);
            branch(x1 * 0.96 + x0 * 0.04, y1 * 0.96 + y0 * 0.04, a1 + off, len * (0.62 + rnd() * 0.16), w * 0.56, depth + 1);
          }
        };

        const spine = document.createElementNS(ns2, 'path');
        spine.setAttribute('d', taper(24, 910, 96, 300, 40, 600, 78, 26));
        spine.setAttribute('fill', barks[1]);
        g.appendChild(spine);
        const shade = document.createElementNS(ns2, 'path');
        shade.setAttribute('d', taper(46, 910, 104, 306, 60, 600, 30, 11));
        shade.setAttribute('fill', barks[0]);
        shade.setAttribute('opacity', '.55');
        g.appendChild(shade);
        [[-30, 918, 30, 856, 42], [86, 920, 52, 862, 34], [24, 924, 8, 872, 24]].forEach(r => {
          const rp = document.createElementNS(ns2, 'path');
          rp.setAttribute('d', taper(r[0], r[1], r[2], r[3], (r[0] + r[2]) / 2, r[1] - 6, r[4], 12));
          rp.setAttribute('fill', barks[1]);
          g.insertBefore(rp, spine);
        });
        for (let k = 0; k < 6; k++) {
          const u = k / 6;
          const fx = 30 + u * 62 + (rnd() - 0.5) * 8;
          const fy = 900 - u * 580;
          const fp = document.createElementNS(ns2, 'path');
          fp.setAttribute('d', 'M ' + fx + ' ' + fy + ' q ' + (5 + rnd() * 6) + ' -' + (30 + rnd() * 26) + ' ' + (2 + rnd() * 8) + ' -' + (62 + rnd() * 30));
          fp.setAttribute('fill', 'none');
          fp.setAttribute('stroke', k % 2 ? barks[0] : barks[2]);
          fp.setAttribute('stroke-width', String(2 + rnd() * 2));
          fp.setAttribute('opacity', '.4');
          fp.setAttribute('stroke-linecap', 'round');
          g.appendChild(fp);
        }

        branch(92, 316, -1.18, 150, 26, 0);
        branch(74, 452, -0.62, 118, 17, 1);
        branch(62, 588, -0.44, 96, 14, 1);
        branch(88, 372, -1.78, 120, 15, 1);
        branch(84, 404, -1.0, 126, 16, 1);
        branch(68, 520, -0.3, 104, 13, 1);

        this.trunks = this.trunks || [];
        this.canopy = this.canopy || [];
        tips.forEach((tp, ci) => {
          const cluster = document.createElementNS(ns2, 'g');
          cluster.setAttribute('opacity', '0');
          g.appendChild(cluster);
          const n = 18 + Math.floor(rnd() * 8);
          for (let k = 0; k < n; k++) {
            const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.6) * tp[2];
            const lx = cl(tp[0] + Math.cos(a) * r, 6, 252), ly = cl(tp[1] + Math.sin(a) * r * 0.78, 40, 890);
            const sz = 21 + rnd() * 16;
            const lf = document.createElementNS(ns2, 'path');
            lf.setAttribute('d', 'M 0 0 C ' + (sz * 0.3) + ' ' + (-sz * 0.42) + ' ' + (sz * 0.72) + ' ' + (-sz * 0.34) + ' ' + (sz * 1.1) + ' 0 C ' + (sz * 0.72) + ' ' + (sz * 0.34) + ' ' + (sz * 0.3) + ' ' + (sz * 0.42) + ' 0 0 Z');
            lf.setAttribute('fill', leafCols[Math.floor(rnd() * leafCols.length)]);
            lf.setAttribute('opacity', String(0.82 + rnd() * 0.18));
            lf.setAttribute('transform', 'translate(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ') rotate(' + (rnd() * 360).toFixed(1) + ')');
            cluster.appendChild(lf);
          }
          cluster.style.transformBox = 'fill-box';
          cluster.style.transformOrigin = '50% 90%';
          if (!REDUCE) cluster.style.animation = 'gfSway ' + (5.4 + rnd() * 2.6).toFixed(2) + 's ease-in-out ' + (rnd() * 3).toFixed(2) + 's infinite';
          cluster.style.transition = 'opacity .8s ease';
          this.canopy.push({ el: cluster, delay: 0.02 + ci * 0.05 });
        });

        const tendrils = [
          { d: 'M 84 372 C 148 396 198 442 244 500 C 290 558 322 620 366 668', w: 4.6, nl: 13, delay: 0.3 },
          { d: 'M 70 486 C 138 512 186 560 228 618 C 270 676 300 736 344 780', w: 3.6, nl: 11, delay: 0.42 },
          { d: 'M 58 612 C 124 640 172 686 212 742 C 250 794 278 846 318 880', w: 3, nl: 10, delay: 0.52 }
        ];
        tendrils.forEach(td => {
          const tp = document.createElementNS(ns2, 'path');
          tp.setAttribute('d', td.d);
          tp.setAttribute('fill', 'none');
          tp.setAttribute('stroke', '#2A6E42');
          tp.setAttribute('stroke-width', String(td.w));
          tp.setAttribute('stroke-linecap', 'round');
          g.appendChild(tp);
          const tlen = tp.getTotalLength();
          tp.style.strokeDasharray = tlen;
          tp.style.strokeDashoffset = tlen;
          const lv = [];
          for (let k = 0; k < td.nl; k++) {
            const fr = 0.1 + (k / td.nl) * 0.88;
            const pt = tp.getPointAtLength(tlen * fr);
            const p2 = tp.getPointAtLength(Math.min(tlen, tlen * fr + 6));
            const ang = Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180 / Math.PI;
            const lf = document.createElementNS(ns2, 'ellipse');
            const sz = 14 - (k % 3) * 3;
            lf.setAttribute('rx', String(sz));
            lf.setAttribute('ry', String(sz * 0.46));
            lf.setAttribute('fill', k % 3 === 0 ? '#4C9A3C' : (k % 3 === 1 ? '#2F6E38' : '#6FB52B'));
            lf.setAttribute('opacity', '0');
            g.appendChild(lf);
            lv.push({ el: lf, fr: fr, x: pt.x, y: pt.y, side: k % 2 ? 1 : -1, ang: ang, ph: rnd() * 6.28 });
          }
          this.trunks.push({ path: tp, len: tlen, delay: td.delay, leaves: lv });
        });

        this.fbf = this.fbf || [];
        const cols = [['#FFFFFF', '#E7EFE2'], ['#F6D46A', '#E0A93C'], ['#F3B8C8', '#DE93AA']];
        for (let k = 0; k < 2; k++) {
          const bf = document.createElementNS(ns2, 'g');
          const cc = cols[(ti * 2 + k) % 3];
          const wl = document.createElementNS(ns2, 'ellipse');
          const wr = document.createElementNS(ns2, 'ellipse');
          [wl, wr].forEach((w, q) => {
            w.setAttribute('rx', '11'); w.setAttribute('ry', '7.4');
            w.setAttribute('cx', q ? '9' : '-9');
            w.setAttribute('fill', cc[q]);
            w.setAttribute('opacity', '.95');
            bf.appendChild(w);
          });
          const bd = document.createElementNS(ns2, 'ellipse');
          bd.setAttribute('rx', '2.4'); bd.setAttribute('ry', '7');
          bd.setAttribute('fill', '#2E3B2E');
          bf.appendChild(bd);
          bf.setAttribute('opacity', '0');
          g.appendChild(bf);
          this.fbf.push({ el: bf, wl: wl, wr: wr, ph: (ti * 2 + k) * 1.9, sp: 0.2 + k * 0.07, cx: 150 + k * 60, cy: 520 + k * 140, rx: 100 + k * 32, ry: 130 + k * 40 });
        }
      });

      this.vineHost = vsvg;
      if (this.vmx == null) { this.vmx = -999; this.vmy = -999; }
      if (!this.vineMouseBound && !REDUCE) {
        this.vineMouseBound = true;
        window.addEventListener('mousemove', e => {
          const host = this.vineHost;
          if (!host) return;
          const b = host.getBoundingClientRect();
          if (!b.width) return;
          this.vmx = ((e.clientX - b.left) / b.width) * 1600;
          this.vmy = ((e.clientY - b.top) / b.height) * 230;
        }, { passive: true });
      }
      this.vinesReady = true;
    }

    start() {
      cancelAnimationFrame(this.raf);
      const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); };
      this.raf = requestAnimationFrame(loop);
    }

    disconnectedCallback() { cancelAnimationFrame(this.raf); }

    frame() {
      if (!this.fvines) return;
      /* Bei reduzierter Bewegung wird die Szene einmal in den Endzustand
         gesetzt und die Schleife dann angehalten — sichtbar bleibt alles. */
      const t = REDUCE ? 0 : performance.now() * 0.001;

      if (this.trunks && this.fvines) {
        const tr0 = this.fvines.getBoundingClientRect();
        const tp = REDUCE ? 1 : Math.min(1, Math.max(0, (window.innerHeight + 120 - tr0.top) / (window.innerHeight * 0.8)));
        for (const tk of this.trunks) {
          const v = Math.min(1, Math.max(0, (tp - tk.delay) / 0.55));
          const ez = v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
          tk.path.style.strokeDashoffset = (tk.len * (1 - ez)).toFixed(1);
          for (const lf of tk.leaves) {
            const lvv = Math.min(1, Math.max(0, (ez - lf.fr * 0.9) / 0.16));
            if (lvv <= 0.004) { if (lf.el.getAttribute('opacity') !== '0') lf.el.setAttribute('opacity', '0'); continue; }
            const sway = Math.sin(t * 0.7 + lf.ph) * 7;
            lf.el.setAttribute('opacity', (lvv * 0.96).toFixed(3));
            lf.el.setAttribute('transform', 'translate(' + lf.x.toFixed(1) + ',' + lf.y.toFixed(1) + ') rotate(' + ((lf.ang || 0) + lf.side * 42 + sway).toFixed(1) + ') scale(' + lvv.toFixed(3) + ')');
          }
        }
      }

      if (this.canopy && this.canopy.length && this.fvines) {
        const cr0 = this.fvines.getBoundingClientRect();
        const cp0 = REDUCE ? 1 : Math.min(1, Math.max(0, (window.innerHeight + 160 - cr0.top) / (window.innerHeight * 0.8)));
        for (const cl of this.canopy) {
          const on = cp0 > cl.delay;
          if (cl.__on === on) continue;
          cl.__on = on;
          cl.el.setAttribute('opacity', on ? '1' : '0');
        }
      }

      if (this.fbf && this.fbf.length && this.fvines) {
        const bv = REDUCE ? 1 : Math.min(1, Math.max(0, (window.innerHeight + 60 - this.fvines.getBoundingClientRect().top) / (window.innerHeight * 0.6)));
        for (const bf of this.fbf) {
          if (bv < 0.05) { if (bf.el.getAttribute('opacity') !== '0') bf.el.setAttribute('opacity', '0'); continue; }
          const a2 = t * bf.sp + bf.ph;
          const bx = bf.cx + Math.cos(a2) * bf.rx + Math.sin(a2 * 2.1) * 12;
          const by = bf.cy + Math.sin(a2 * 1.3) * bf.ry * 0.5 + Math.cos(a2 * 3.3) * 10;
          const dir = Math.cos(a2) > 0 ? 1 : -1;
          const flap = 0.3 + Math.abs(Math.sin(t * 7.4 + bf.ph)) * 0.7;
          bf.wl.setAttribute('transform', 'scale(' + flap.toFixed(3) + ',1)');
          bf.wr.setAttribute('transform', 'scale(' + flap.toFixed(3) + ',1)');
          bf.el.setAttribute('opacity', (bv * 0.95).toFixed(3));
          bf.el.setAttribute('transform', 'translate(' + bx.toFixed(1) + ',' + by.toFixed(1) + ') rotate(' + (Math.sin(t * 1.3 + bf.ph) * 12).toFixed(1) + ') scale(' + dir + ',1)');
        }
      }

      if (this.fvines && this.blooms && this.blooms.length) {
        const fr = this.fvines.getBoundingClientRect();
        const vh2 = window.innerHeight;
        const fp = REDUCE ? 1 : Math.min(1, Math.max(0, (vh2 + 60 - fr.top) / (vh2 * 0.7)));
        for (const bl of this.blooms) {
          const v = Math.min(1, Math.max(0, (fp - bl.delay) / 0.42));
          const ez = v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
          if (ez <= 0.004) { if (bl.el.getAttribute('opacity') !== '0') bl.el.setAttribute('opacity', '0'); continue; }
          let near = 0;
          if (this.vmx > -900) {
            const dx = this.vmx - bl.x, dy = (this.vmy - (106 - bl.h)) * 1.4;
            near = Math.max(0, 1 - Math.hypot(dx, dy) / 170);
          }
          const sway = Math.sin(t * 0.9 + bl.ph) * 3.4 + near * 7;
          bl.el.setAttribute('opacity', ez.toFixed(3));
          bl.el.setAttribute('transform', 'translate(' + bl.x.toFixed(1) + ',106) rotate(' + sway.toFixed(2) + ') scale(' + (0.6 + ez * 0.4).toFixed(3) + ')');
          bl.head.setAttribute('transform', 'translate(' + bl.lean.toFixed(1) + ',' + (-bl.h).toFixed(1) + ') rotate(' + (t * 8 + bl.ph * 20).toFixed(1) + ') scale(' + (0.9 + near * 0.22).toFixed(3) + ')');
        }
      }

      /* Reduzierte Bewegung: ein Durchlauf genügt, danach anhalten. */
      if (REDUCE) cancelAnimationFrame(this.raf);
    }
  }
  if (!window.customElements.get('garden-footer')) window.customElements.define('garden-footer', GardenFooter);
})();
