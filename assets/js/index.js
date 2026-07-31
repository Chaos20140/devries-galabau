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
  p = 0; tp = 0; mx = 0; my = 0; tmx = 0; tmy = 0;
  ready = false; vel = 0; active = -1;

  renderVals() { return {}; }

  componentDidMount() {
    this.alive = true;
    this.reacquire();
    this.onMouse = e => {
      this.tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      this.tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    this.onResize = () => { this.resizeGL(); this.applyMobile(); this.measureFlowLen(); };
    window.addEventListener('mousemove', this.onMouse, { passive: true });
    window.addEventListener('resize', this.onResize);
    /* Am Desktop sofort, auf dem Handy erst auf Tippen. */
    if (window.innerWidth < 820) this.zeigeStandbild();
    else this.ladeTHREE().then(() => { if (this.alive) this.initScene(); })
      .catch(e => console.error('Rundgang:', e));
    this.raf = requestAnimationFrame(this.tick);
  }

  reacquire() {
    this.flowReady = false;
    if (this.io) { this.io.disconnect(); this.io = null; }
    if (this.countIO) { this.countIO.disconnect(); this.countIO = null; }
    this.isMobile = null; this.mW = null;
    this.walk = document.getElementById('rg-walk');
    this.stationsEl = document.getElementById('rg-stations');
    this.canvasHidden = null;
    this.head = document.getElementById('rg-head');
    this.rail = document.getElementById('rg-rail');
    this.dots = Array.from(document.querySelectorAll('[data-dot]'));
    this.dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        const wh = this.walk ? this.walk.offsetHeight - window.innerHeight : 0;
        const target = Math.round(this.stationP[i] * wh);
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
      d.addEventListener('mouseenter', () => { d.style.background = 'rgba(44,110,73,.2)'; });
      d.addEventListener('mouseleave', () => { if (this.active !== i) d.style.background = 'transparent'; });
    });
    this.panels = Array.from(document.querySelectorAll('[data-station]')).sort(
      (a, b) => +a.getAttribute('data-station') - +b.getAttribute('data-station')
    );
    this.stationP = [0.02, 0.27, 0.44, 0.57, 0.70, 0.84, 0.96];
    this.content = document.getElementById('rg-content');
    this.setupGallery();
    this.setupForm();
    this.ring = document.getElementById('rg-ring');
    this.sunGlow = document.getElementById('rg-sunglow');
    this.grows = Array.from(document.querySelectorAll('[data-grow]')).map(el => ({
      el: el, s: parseFloat(el.getAttribute('data-grow')) || 0, leaf: el.tagName === 'SPAN'
    }));
    this.pars = Array.from(document.querySelectorAll('[data-par]')).map(el => ({
      el: el, f: parseFloat(el.getAttribute('data-par')) || 0
    }));
    this.setupReveals();
    this.setupExtras();
    this.setupMobile();
    this.setupFaq();
  }

  componentDidUpdate(prev) {
    if (!this.ready) return;
    if (prev.timeOfDay !== this.props.timeOfDay) this.applyLight();
  }

  componentWillUnmount() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('mousemove', this.onMouse);
    window.removeEventListener('resize', this.onResize);
    if (this.io) this.io.disconnect();
  }

  /* three.js wird nachgeladen statt fest eingebunden. Gepackt sind das
     146 KB — 85 Prozent des Ladegewichts der Startseite. Am Desktop passiert
     das sofort, auf dem Handy erst, wenn jemand den Rundgang wirklich
     startet. Wer nur die Leistungen sucht, zahlt es nie. */
  ladeTHREE() {
    if (this.threeLaedt) return this.threeLaedt;
    this.threeLaedt = new Promise((res, rej) => {
      if (window.THREE) return res();
      const s = document.createElement('script');
      s.src = 'assets/js/three.min.js?v=27';
      s.async = true;
      s.onload = () => (window.THREE ? res() : rej(new Error('three geladen, aber nicht da')));
      s.onerror = () => rej(new Error('three konnte nicht geladen werden'));
      document.head.appendChild(s);
    });
    return this.threeLaedt;
  }

  /* Standbild statt Szene: zeigt, was einen erwartet, und startet den
     Rundgang erst auf Tippen. Wer nicht tippt, scrollt eine Bildschirmhoehe
     weiter und ist bei den Leistungen — ohne 146 KB geladen zu haben. */
  zeigeStandbild() {
    if (this.standbild || !this.walk) return;
    const wurzel = this.walk.parentElement;
    if (!wurzel) return;

    /* EIN eigenstaendiger Block, absolut im Seitenfluss verankert. Er
       scrollt weg wie jeder andere Abschnitt — kein Nachfuehren per
       Skript, kein Auftauchen an falscher Stelle.
       Die Tafelschicht des Entwurfs (#rg-stations) wird solange ganz
       ausgeblendet: sie liegt fest im Bild, und ein Umhaengen auf
       absolute erwies sich als unzuverlaessig (Hoehe blieb 0). So kann
       auch kein spaeter feuernder Zeitgeber Stationstexte ueber fremde
       Abschnitte legen. */
    const hero = document.createElement('div');
    hero.id = 'rg-standbild';
    hero.style.cssText = 'position:absolute;left:0;right:0;top:0;height:100vh;z-index:16;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:16px;text-align:center;padding:76px 26px 34px;' +
      'font-family:Outfit,Helvetica,Arial,sans-serif;' +
      "background-image:linear-gradient(180deg,rgba(246,249,244,.16),rgba(246,249,244,.62) 62%,rgba(246,249,244,.88))," +
      "url('assets/img/rg-start-800.webp');background-size:cover;background-position:center bottom";
    /* Feste Vorlage, kein eingesetzter Wert. Wortlaut wie die
       Begruessungstafel des Entwurfs. */
    hero.innerHTML =
      '<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.22em;' +
      'text-transform:uppercase;color:#2C6E49">Salzhemmendorf · seit 1998</p>' +
      '<h2 style="margin:0;font-size:clamp(30px,9vw,44px);line-height:1.02;letter-spacing:-.04em;' +
      'font-weight:600;color:#0F2318">Herzlich <span style="font-family:&quot;Instrument Serif&quot;,Georgia,serif;' +
      'font-style:italic;font-weight:400;color:#1F5637">Willkommen</span></h2>' +
      '<p style="margin:0;max-width:32ch;font-size:16px;line-height:1.55;color:#26382E">' +
      'Seit 1998 Ihr Partner für Gartengestaltung, Bepflanzung, Pflasterarbeiten und Pflege. ' +
      'Gehen Sie hindurch — der Weg führt an jeder unserer Leistungen vorbei.</p>' +
      '<button type="button" data-start style="margin-top:10px;min-height:54px;padding:0 30px;' +
      'border:none;border-radius:999px;background:linear-gradient(140deg,#2A6E42,#123324);' +
      'color:#F4F9F0;font:inherit;font-size:16px;font-weight:700;cursor:pointer;' +
      'box-shadow:0 18px 40px -16px rgba(18,51,36,.8)">Rundgang starten</button>' +
      '<p data-hinweis style="margin:0;font-size:12.5px;color:#3C5145">' +
      'Lädt einmalig die 3D-Szene · oder einfach weiterscrollen</p>';

    wurzel.appendChild(hero);
    this.standbild = hero;
    this.startLeiste = hero;

    const schicht = document.getElementById('rg-stations');
    if (schicht) schicht.style.display = 'none';

    this.walk.style.height = this.bahnHoehe();
    hero.querySelector('[data-start]').addEventListener('click', () => this.starteRundgang());
  }

  entferneStandbild() {
    if (this.standbild) { this.standbild.remove(); this.standbild = null; this.startLeiste = null; }
    const schicht = document.getElementById('rg-stations');
    if (schicht) schicht.style.display = '';
  }

  starteRundgang() {
    if (this.rundgangAn) return;
    const knopf = this.startLeiste && this.startLeiste.querySelector('[data-start]');
    const hinweis = this.startLeiste && this.startLeiste.querySelector('[data-hinweis]');
    if (knopf) { knopf.disabled = true; knopf.textContent = 'Wird geladen …'; }
    this.ladeTHREE().then(() => {
      if (!this.alive) return;
      this.rundgangAn = true;
      this.initScene();
      if (this.renderer) this.resizeGL();
      if (this.walk) this.walk.style.height = this.bahnHoehe();
      this.entferneStandbild();
      /* An den Anfang der Bahn, damit die erste Station auch kommt. */
      const y = this.walk.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }).catch((e) => {
      console.error('Rundgang:', e);
      /* Fehlschlag darf die Seite nicht blockieren — Standbild bleibt stehen. */
      this.threeLaedt = null;
      if (knopf) { knopf.disabled = false; knopf.textContent = 'Nochmal versuchen'; }
      if (hinweis) hinweis.textContent = 'Der Rundgang lässt sich gerade nicht laden.';
    });
  }

  /* Wie hoch die Scrollbahn ist. Am Desktop wie gehabt. Auf dem Handy
     nur gut eine Bildschirmhoehe, solange das Standbild steht — sonst
     scrollte man an einer leeren Leinwand vorbei. Nach dem Start vier
     Bildschirmhoehen statt der frueheren zehn. */
  bahnHoehe() {
    if (!this.isMobile) return '1800vh';
    /* Wieder die volle Laenge: bei 400vh lief der Rundgang zu schnell
     durch, die Stationen hatten keine Zeit zu wirken. */
    return this.rundgangAn ? '1000vh' : '112vh';
  }

  setupExtras() {
    this.magnets = Array.from(document.querySelectorAll('[data-magnet]')).map(el => {
      el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.32;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.36;
        el.style.transition = 'transform .12s linear';
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1)';
        el.style.transform = 'none';
      });
      return el;
    });

    this.setupFlow();

    const mats = Array.from(document.querySelectorAll('[data-mat]'));
    mats.forEach(m => {
      const txt = m.querySelector('[data-mat-text]');
      m.addEventListener('mouseenter', () => {
        mats.forEach(o => { o.style.flexGrow = o === m ? '2.6' : '0.8'; });
        if (txt) { txt.style.opacity = '1'; txt.style.transform = 'none'; }
      });
      m.addEventListener('mouseleave', () => {
        mats.forEach(o => { o.style.flexGrow = '1'; });
        if (txt) { txt.style.opacity = '0'; txt.style.transform = 'translateY(8px)'; }
      });
    });

    this.setupMap();
    if (this.countIO) { this.countIO.disconnect(); this.countIO = null; }
    this.counters = Array.from(document.querySelectorAll('[data-count]')).map(el => ({
      el: el, to: parseFloat(el.getAttribute('data-count')), suf: el.getAttribute('data-suffix') || '', done: false
    }));
    if (this.counters.length) {
      this.countIO = new IntersectionObserver(en => {
        en.forEach(e => {
          if (!e.isIntersecting) return;
          const c = this.counters.find(x => x.el === e.target);
          if (!c || c.done) return;
          c.done = true;
          const t0 = performance.now();
          const step = () => {
            const k = Math.min(1, (performance.now() - t0) / 1300);
            const e2 = 1 - Math.pow(1 - k, 3);
            c.el.textContent = Math.round(c.to * e2) + c.suf;
            if (k < 1) requestAnimationFrame(step);
          };
          step();
          this.countIO.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      this.counters.forEach(c => this.countIO.observe(c.el));
    }

    this.kin = document.getElementById('rg-kin');
    this.kin2 = document.getElementById('rg-kin2');
  }

  setupFlow() {
    const fLeafHost = document.getElementById('rg-flowleaf');
    if (fLeafHost) fLeafHost.innerHTML = '';
    this.flowLeaves = null; this.flowTip = null;
    this.mq1 = document.getElementById('rg-mq1');
    this.mq2 = document.getElementById('rg-mq2');
    [this.mq1, this.mq2].forEach(row => {
      if (!row) return;
      const src = row.querySelector('[data-mq-copy]');
      Array.from(row.querySelectorAll('[data-mq-copy]')).forEach(c => { if (c !== src) c.remove(); });
      for (let i = 0; i < 3; i++) row.appendChild(src.cloneNode(true));
      row.__w = src.getBoundingClientRect().width || 1200;
      row.__off = 0;
    });

    this.flow = document.getElementById('rg-flow');
    this.flowBar = document.getElementById('rg-flowbar');
    this.flowCap = document.getElementById('rg-flowcap');
    this.flowNum = document.getElementById('rg-flownum');
    this.flowTrack = document.getElementById('rg-flowtrack');
    this.flowLine = document.getElementById('rg-flowline');
    this.flowDot = document.getElementById('rg-flowdot');
    this.flowSteps = Array.from(document.querySelectorAll('[data-step]'));
    this.flowTitles = ['Vor Ort schauen', 'Konzept zeichnen', 'Bauen', 'Pflanzen und pflegen'];
    this.flowAt = [0.02, 0.21, 0.53, 0.84];
    this.flowSteps.forEach(s => {
      const inner = s.querySelector('[data-step-in]');
      if (inner && s.__rest == null) s.__rest = inner.style.transform;
      s.__med = s.querySelector('[data-node]');
      s.__num = s.querySelector('[data-num]');
      if (s.__num) { s.__num.style.transition = 'transform .85s cubic-bezier(.16,1,.3,1)'; s.__num.style.transform = 'translateY(-100%) scale(.62)'; }
    });
    this.flowIdx = -1;
    const fLeafG = document.getElementById('rg-flowleaf');
    this.flowLeaves = [];
    if (fLeafG && this.flowLine) {
      const ns3 = 'http://www.w3.org/2000/svg';
      const flen = this.flowLine.getTotalLength();
      fLeafG.innerHTML = '';
      for (let k = 0; k < 46; k++) {
        const fr = 0.012 + (k / 46) * 0.878;
        const pt = this.flowLine.getPointAtLength(flen * fr);
        const p2 = this.flowLine.getPointAtLength(Math.min(flen, flen * fr + 10));
        const ang = Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180 / Math.PI;
        const bloom = k % 7 === 3;
        const side = k % 2 ? 1 : -1;
        let el;
        if (bloom) {
          el = document.createElementNS(ns3, 'g');
          for (let q = 0; q < 5; q++) {
            const pet = document.createElementNS(ns3, 'ellipse');
            pet.setAttribute('rx', '7.5'); pet.setAttribute('ry', '3.6');
            pet.setAttribute('cx', '7'); pet.setAttribute('cy', '0');
            pet.setAttribute('fill', k % 14 === 3 ? '#FFFFFF' : '#F6D46A');
            pet.setAttribute('transform', 'rotate(' + (q * 72) + ')');
            el.appendChild(pet);
          }
          const mid = document.createElementNS(ns3, 'circle');
          mid.setAttribute('r', '3.2'); mid.setAttribute('fill', '#E0A93C');
          el.appendChild(mid);
        } else {
          el = document.createElementNS(ns3, 'ellipse');
          const sz = 11 - (k % 3) * 2.2;
          el.setAttribute('rx', String(sz));
          el.setAttribute('ry', String(sz * 0.44));
          el.setAttribute('fill', k % 3 === 0 ? '#5FAC2C' : (k % 3 === 1 ? '#3E8B45' : '#8ECF4F'));
        }
        el.setAttribute('opacity', '0');
        fLeafG.appendChild(el);
        this.flowLeaves.push({ el: el, fr: fr, x: pt.x, y: pt.y, ang: ang, side: side, bloom: bloom, ph: Math.random() * 6.28, off: bloom ? 16 : 12 });
      }
      const tipPt = this.flowLine.getPointAtLength(flen);
      const tip = document.createElementNS(ns3, 'g');
      tip.setAttribute('opacity', '0');
      const stemUp = document.createElementNS(ns3, 'path');
      stemUp.setAttribute('d', 'M 0 2 C -3 -14 2 -30 0 -44');
      stemUp.setAttribute('fill', 'none');
      stemUp.setAttribute('stroke', '#46761F');
      stemUp.setAttribute('stroke-width', '4');
      stemUp.setAttribute('stroke-linecap', 'round');
      tip.appendChild(stemUp);
      [[-1, -18], [1, -28]].forEach((s, si) => {
        const sl = document.createElementNS(ns3, 'ellipse');
        sl.setAttribute('rx', '13'); sl.setAttribute('ry', '5.4');
        sl.setAttribute('fill', si ? '#5FAC2C' : '#3E8B45');
        sl.setAttribute('transform', 'translate(0,' + s[1] + ') rotate(' + (s[0] > 0 ? 24 : 156) + ') translate(13,0)');
        tip.appendChild(sl);
      });
      for (let q = 0; q < 5; q++) {
        const sep = document.createElementNS(ns3, 'ellipse');
        sep.setAttribute('rx', '9'); sep.setAttribute('ry', '4');
        sep.setAttribute('cx', '9'); sep.setAttribute('cy', '-46');
        sep.setAttribute('fill', '#46761F');
        sep.setAttribute('transform', 'rotate(' + (q * 72 + 36) + ' 0 -46)');
        tip.appendChild(sep);
      }
      for (let q = 0; q < 10; q++) {
        const pet = document.createElementNS(ns3, 'path');
        pet.setAttribute('d', 'M 4 0 C 13 -8 25 -6 30 0 C 25 6 13 8 4 0 Z');
        pet.setAttribute('fill', '#FFFFFF');
        pet.setAttribute('opacity', '.96');
        pet.setAttribute('transform', 'rotate(' + (q * 36) + ' 0 -52) translate(0,-52)');
        tip.appendChild(pet);
      }
      for (let q = 0; q < 8; q++) {
        const pet = document.createElementNS(ns3, 'path');
        pet.setAttribute('d', 'M 3 0 C 10 -6 18 -5 22 0 C 18 5 10 6 3 0 Z');
        pet.setAttribute('fill', '#FBE7A4');
        pet.setAttribute('transform', 'rotate(' + (q * 45 + 18) + ' 0 -52) translate(0,-52)');
        tip.appendChild(pet);
      }
      for (let q = 0; q < 6; q++) {
        const pet = document.createElementNS(ns3, 'ellipse');
        pet.setAttribute('rx', '8'); pet.setAttribute('ry', '4.6');
        pet.setAttribute('cx', '8');
        pet.setAttribute('fill', '#F6D46A');
        pet.setAttribute('transform', 'rotate(' + (q * 60 + 30) + ' 0 -52) translate(0,-52)');
        tip.appendChild(pet);
      }
      const core = document.createElementNS(ns3, 'circle');
      core.setAttribute('r', '7.8'); core.setAttribute('cy', '-52'); core.setAttribute('fill', '#E8A81F');
      const coreIn = document.createElementNS(ns3, 'circle');
      coreIn.setAttribute('r', '4.2'); coreIn.setAttribute('cy', '-52'); coreIn.setAttribute('fill', '#C98416');
      tip.appendChild(core);
      for (let q = 0; q < 7; q++) {
        const st2 = document.createElementNS(ns3, 'circle');
        st2.setAttribute('r', '1.5');
        st2.setAttribute('fill', '#FFF3C4');
        const a2 = (q / 7) * Math.PI * 2;
        st2.setAttribute('cx', (Math.cos(a2) * 5).toFixed(1));
        st2.setAttribute('cy', (-52 + Math.sin(a2) * 5).toFixed(1));
        tip.appendChild(st2);
      }
      fLeafG.appendChild(tip);
      this.flowTip = { el: tip, x: tipPt.x, y: tipPt.y };
    }
    this.measureFlowLen();

    this.flowReady = true;
  }

  /* Fruehere setupAdmin(): Der Entwurf hatte hier ein Autorenwerkzeug, mit
     dem sich Texte im Browser aendern und Abschnitte ausblenden liessen.
     Es liess sich von jedem Besucher oeffnen, speicherte im Browser und
     spielte das Gespeicherte als Markup zurueck — auf einer Livesite ein
     Fremdkoerper und eine Einfallstelle fuer eingeschleusten Code.
     Entfernt; nur der Formularversand ist geblieben. */
  setupForm() {
    if (this.formBound) return;
    this.formBound = true;

    const form = document.getElementById('rg-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const body = ['Name: ' + (d.get('name') || ''), 'E-Mail: ' + (d.get('mail') || ''), 'Telefon: ' + (d.get('tel') || ''), 'Leistung: ' + (d.get('leistung') || ''), '', d.get('text') || ''].join('\n');
      const n = document.getElementById('rg-form-note');
      const betreff = 'Anfrage: ' + (d.get('leistung') || 'Garten');
      const mailto = () => {
        window.location.href = 'mailto:' + ((window.dvFormular && window.dvFormular.empfaenger) || 'info@devries-galabau.de') + '?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(body);
        /* Feste Vorlage, kein eingesetzter Wert — deshalb innerHTML fuer den Link. */
        if (n) n.innerHTML = 'Ihr E-Mail-Programm öffnet sich mit der fertigen Anfrage. Alternativ: <a href="tel:051531552">05153 1552</a>';
      };
      /* Zentrale Stelle: speichert, falls eingerichtet — sonst mailto. */
      if (window.dvFormular) window.dvFormular.senden({
        form: form, quelle: 'startseite', betreff: betreff,
        felder: {
          name: d.get('name'), email: d.get('mail'),
          telefon: d.get('tel'), bereich: d.get('leistung'), nachricht: d.get('text')
        },
        mailto: mailto,
        danach: () => { if (n) n.textContent = 'Vielen Dank, Ihre Anfrage ist bei uns eingegangen.'; }
      });
      else mailto();
    });
  }

  setupGallery() {
    const row = document.getElementById('rg-galrow');
    this.panels2 = [];
    if (!row) return;
    const ps = Array.from(row.querySelectorAll('[data-panel]'));
    ps.forEach(p => {
      const img = p.querySelector('[data-panel-img]');
      const scrim = p.querySelector('[data-panel-scrim]');
      const txt = p.querySelector('[data-panel-text]');
      const cta = p.querySelector('[data-panel-cta]');
      const open = (on) => {
        ps.forEach(o => { o.style.flexGrow = o === p ? (on ? '2.4' : '1') : (on ? '0.72' : '1'); });
        if (img) img.style.transform = on ? 'scale(1.06)' : 'none';
        if (scrim) scrim.style.opacity = on ? '.86' : '.66';
        if (txt) { txt.style.maxHeight = on ? '9em' : '0'; txt.style.opacity = on ? '1' : '0'; }
        if (cta) { cta.style.maxHeight = on ? '3em' : '0'; cta.style.opacity = on ? '1' : '0'; }
        p.style.boxShadow = on ? '0 46px 86px -34px rgba(12,29,20,.55)' : '0 34px 68px -34px rgba(12,29,20,.42)';
      };
      p.addEventListener('mouseenter', () => open(true));
      p.addEventListener('focus', () => open(true));
      p.addEventListener('mouseleave', () => open(false));
      p.addEventListener('blur', () => open(false));
      this.panels2.push(p);
    });
  }

  /* Die Galerie des Entwurfs oeffnet sich per mouseenter — auf dem Handy
     also nie. Fuenf Kacheln in einer Flex-Reihe wurden dort zu Schlitzen,
     in denen vom Foto nichts zu erkennen war.
     Auf Mobil daher ein wischbares Band: eine Kachel fuellt fast die
     Breite, Text steht dauerhaft, Antippen fuehrt auf die Seite. */
  galerieMobil(m) {
    const row = document.getElementById('rg-galrow');
    if (!row || !this.panels2 || !this.panels2.length) return;
    const hinweis = document.querySelector('[data-gal-hinweis]');

    if (m) {
      if (!row.dataset.dOverflow) {
        row.dataset.dOverflow = row.style.overflow || 'none';
        row.dataset.dGap = row.style.gap || '';
      }
      row.style.overflowX = 'auto';
      row.style.overflowY = 'hidden';
      row.style.scrollSnapType = 'x mandatory';
      row.style.scrollPadding = '0 5vw';
      row.style.padding = '4px 5vw 14px';
      row.style.margin = '0 -5vw';
      row.style.gap = '12px';
      row.style.scrollbarWidth = 'none';
      this.panels2.forEach((p) => {
        /* flexGrow NACH dem Kurzformat laesst die Kachel wieder schrumpfen —
           dann passen alle fuenf ins Bild und nichts ist mehr wischbar. */
        p.style.flex = '0 0 78vw';
        p.style.flexGrow = '0';
        p.style.height = 'clamp(300px,44vh,420px)';
        p.style.scrollSnapAlign = 'center';
        /* Text dauerhaft zeigen — es gibt kein Ueberfahren zum Aufklappen. */
        const txt = p.querySelector('[data-panel-text]');
        const cta = p.querySelector('[data-panel-cta]');
        const scrim = p.querySelector('[data-panel-scrim]');
        if (txt) { txt.style.maxHeight = '9em'; txt.style.opacity = '1'; }
        if (cta) { cta.style.maxHeight = '3em'; cta.style.opacity = '1'; }
        if (scrim) scrim.style.opacity = '.8';
      });
      if (hinweis) hinweis.textContent = 'Wischen Sie durch die Bilder — tippen Sie für mehr.';
    } else {
      row.style.overflowX = ''; row.style.overflowY = '';
      row.style.scrollSnapType = ''; row.style.scrollPadding = '';
      row.style.padding = ''; row.style.margin = '';
      row.style.gap = row.dataset.dGap || '';
      this.panels2.forEach((p) => {
        p.style.flex = ''; p.style.height = ''; p.style.scrollSnapAlign = ''; p.style.flexGrow = '1';
        const txt = p.querySelector('[data-panel-text]');
        const cta = p.querySelector('[data-panel-cta]');
        const scrim = p.querySelector('[data-panel-scrim]');
        if (txt) { txt.style.maxHeight = '0'; txt.style.opacity = '0'; }
        if (cta) { cta.style.maxHeight = '0'; cta.style.opacity = '0'; }
        if (scrim) scrim.style.opacity = '.66';
      });
      if (hinweis) hinweis.textContent = 'Fahren Sie über ein Bild — es öffnet sich und zeigt, was dahinter steckt.';
    }
  }

  measureFlowLen() {
    if (!this.flowLine || !this.flowLine.isConnected) return;
    this.flowLenU = this.flowLine.getTotalLength();
    const m = this.flowLine.getScreenCTM();
    let L = this.flowLenU;
    if (m) {
      L = 0;
      let px = 0, py = 0;
      for (let i = 0; i <= 260; i++) {
        const p = this.flowLine.getPointAtLength(this.flowLenU * i / 260);
        const x = m.a * p.x + m.c * p.y + m.e;
        const y = m.b * p.x + m.d * p.y + m.f;
        if (i) L += Math.hypot(x - px, y - py);
        px = x; py = y;
      }
    }
    this.flowLen = L > 1 ? L : this.flowLenU;
    this.flowLine.style.strokeDasharray = this.flowLen.toFixed(1);
    this.flowLine.style.strokeDashoffset = this.flowLen.toFixed(1);
  }

  setupMap() {
    const orbit = document.getElementById('rg-orbit');
    this.orbits = null; this.routes = null; this.mapBf = null; this.ping = null;
    if (orbit) {
      orbit.innerHTML = '';
      const rsvg0 = document.getElementById('rg-routes');
      if (rsvg0) rsvg0.innerHTML = '';
      this.orbits = [
        { n: 'Hameln', a: -1.05, r: 0.46 }, { n: 'Hildesheim', a: 0.62, r: 0.47 },
        { n: 'Alfeld', a: 1.95, r: 0.33 }, { n: 'Elze', a: 2.75, r: 0.45 },
        { n: 'Coppenbrügge', a: -2.3, r: 0.32 }, { n: 'Bad Münder', a: -0.2, r: 0.33 }
      ].map(o => {
        const wrap = document.createElement('span');
        wrap.style.cssText = 'position:absolute;left:50%;top:50%;display:flex;flex-direction:column;align-items:center;gap:5px;transform:translate(-50%,-50%);will-change:transform';
        const d = document.createElement('span');
        d.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#8ECF4F;box-shadow:0 0 0 4px rgba(142,207,79,.2)';
        const l = document.createElement('span');
        l.style.cssText = 'font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3C5145;white-space:nowrap';
        l.textContent = o.n;
        wrap.appendChild(d); wrap.appendChild(l);
        orbit.appendChild(wrap);
        return Object.assign({}, o, { el: wrap });
      });
      this.ping = document.getElementById('rg-ping');
      const rsvg = document.getElementById('rg-routes');
      if (rsvg) {
        const ns = 'http://www.w3.org/2000/svg';
        const mk = (stroke, w, dash, cap) => {
          const p = document.createElementNS(ns, 'path');
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', stroke);
          p.setAttribute('stroke-width', String(w));
          p.setAttribute('stroke-linecap', cap || 'round');
          if (dash) p.setAttribute('stroke-dasharray', dash);
          rsvg.appendChild(p);
          return p;
        };
        this.routes = this.orbits.map((o, i) => {
          const casing = mk('rgba(44,110,73,.13)', 1.4);
          const lane = mk('rgba(44,110,73,.2)', 1, '4 6');
          const mid = mk('rgba(44,110,73,0)', 0.01);
          const glow = mk('#6FB52B', 1.8);
          const c = document.createElementNS(ns, 'circle');
          c.setAttribute('r', '2.4');
          c.setAttribute('fill', '#2C6E49');
          rsvg.appendChild(c);
          return { casing: casing, lane: lane, mid: mid, glow: glow, dot: c, ph: i / this.orbits.length };
        });
      }
    }

  }

  setupFaq() {
    Array.from(document.querySelectorAll('details')).forEach(d => {
      if (d.__faq) return;
      d.__faq = true;
      const sum = d.querySelector('summary');
      if (!sum) return;
      sum.addEventListener('click', e => { e.preventDefault(); d.open = !d.open; });
    });
  }

  setupMobile() {
    this.burger = document.getElementById('rg-burger');
    this.menu = document.getElementById('rg-menu');
    this.navCap = document.querySelector('#rg-head nav');
    this.headCta = document.getElementById('rg-cta');
    this.menuOpen = false;
    if (this.burger) {
      this.burger.addEventListener('click', () => {
        this.menuOpen = !this.menuOpen;
        const bars = this.burger.querySelectorAll('[data-bar]');
        if (this.menu) {
          this.menu.style.display = 'flex';
          requestAnimationFrame(() => { this.menu.style.opacity = this.menuOpen ? '1' : '0'; });
          if (!this.menuOpen) setTimeout(() => { if (!this.menuOpen) this.menu.style.display = 'none'; }, 420);
        }
        document.documentElement.style.overflow = this.menuOpen ? 'hidden' : '';
        bars[0].style.transform = this.menuOpen ? 'translateY(7px) rotate(45deg)' : 'none';
        bars[1].style.opacity = this.menuOpen ? '0' : '1';
        bars[2].style.transform = this.menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none';
      });
    }
    if (this.menu) {
      Array.from(this.menu.querySelectorAll('a')).forEach(a => a.addEventListener('click', () => {
        this.menuOpen = false;
        this.menu.style.opacity = '0';
        document.documentElement.style.overflow = '';
        setTimeout(() => { this.menu.style.display = 'none'; }, 420);
      }));
    }
    this.applyMobile();
  }

  applyMobile() {
    const w = window.innerWidth;
    const m = w < 820;
    if (this.isMobile === m && this.mW === w) return;
    this.isMobile = m;
    this.mW = w;

    if (this.burger) this.burger.style.display = m ? 'flex' : 'none';
    if (this.navCap) this.navCap.style.display = m ? 'none' : 'flex';
    if (this.headCta) this.headCta.style.display = m ? 'none' : 'inline-flex';
    if (!m && this.menu) { this.menu.style.display = 'none'; this.menu.style.opacity = '0'; this.menuOpen = false; document.documentElement.style.overflow = ''; }
    if (this.rail) this.rail.style.display = m ? 'none' : 'flex';
    if (this.walk) this.walk.style.height = this.bahnHoehe();
    /* Beim Wechsel aufs Breitbild ohne geladene Szene nachziehen. */
    if (!m && !this.threeLaedt) {
      this.ladeTHREE().then(() => { if (this.alive) this.initScene(); })
        .catch(e => console.error('Rundgang:', e));
      this.entferneStandbild();
    }


    if (this.panels) this.panels.forEach(p => {
      if (p.getAttribute('data-side') === 'center') return;
      if (p.dataset.dLeft == null) {
        p.dataset.dLeft = p.style.left || '';
        p.dataset.dRight = p.style.right || '';
        p.dataset.dWidth = p.style.width || '';
        p.dataset.dTop = p.style.top || '';
        p.dataset.dBottom = p.style.bottom || '';
        p.dataset.dTransform = p.style.transform || '';
      }
      if (m) {
        p.style.left = '4vw'; p.style.right = '4vw'; p.style.width = 'auto';
        p.style.top = 'auto'; p.style.bottom = '5vh'; p.style.transform = 'none';
        p.style.maxHeight = 'calc(100vh - 190px)'; p.style.overflow = 'hidden';
      } else {
        p.style.left = p.dataset.dLeft; p.style.right = p.dataset.dRight; p.style.width = p.dataset.dWidth;
        p.style.top = p.dataset.dTop; p.style.bottom = p.dataset.dBottom; p.style.transform = p.dataset.dTransform;
        p.style.maxHeight = ''; p.style.overflow = '';
      }
    });

    const mats = Array.from(document.querySelectorAll('[data-mat]'));
    const matBox = document.getElementById('rg-mat');
    if (matBox) {
      matBox.style.flexWrap = m ? 'wrap' : 'nowrap';
      matBox.style.height = m ? 'auto' : '';
    }
    mats.forEach(mt => {
      mt.style.flex = m ? '1 1 100%' : '1 1 0';
      mt.style.height = m ? '52vw' : '';
      mt.style.minHeight = m ? '200px' : '';
      const tx = mt.querySelector('[data-mat-text]');
      if (tx && m) { tx.style.opacity = '1'; tx.style.transform = 'none'; }
    });

    /* ⚠ Auf dem Handy wird der Ablauf komplett aufgeloest, nicht nur
       umgestellt. Der Entwurf laesst die Karten auch dort in einer Box
       mit sticky/height:100vh/overflow:hidden stehen — vier gestapelte
       Karten sind aber 1108 px hoch und wurden bei 844 px abgeschnitten.
       Dazu lief der 300vh hohe Container weiter: man scrollte durch
       rund 1400 px Leere, waehrend die Laufleiste 01 → 02 → 03
       durchzaehlte, obwohl dieselbe Karte im Bild stand.
       Auf Mobil daher: normaler Textfluss, Ueberschrift im Fluss,
       Laufleiste weg — die Karten tragen ihre Nummer ohnehin selbst. */
    const stage = document.querySelector('[data-flow-stage]');
    const fhead = document.querySelector('[data-flow-head]');
    const fprog = document.querySelector('[data-flow-progress]');
    [stage, fhead, fprog].forEach(el => {
      if (el && el.dataset.dPos == null) {
        el.dataset.dPos = el.style.position || '';
        el.dataset.dTop = el.style.top || '';
        el.dataset.dLeft = el.style.left || '';
        el.dataset.dRight = el.style.right || '';
        el.dataset.dHeight = el.style.height || '';
        el.dataset.dOverflow = el.style.overflow || '';
      }
    });
    const zurueck = (el) => {
      if (!el) return;
      el.style.position = el.dataset.dPos; el.style.top = el.dataset.dTop;
      el.style.left = el.dataset.dLeft; el.style.right = el.dataset.dRight;
      el.style.height = el.dataset.dHeight; el.style.overflow = el.dataset.dOverflow;
      el.style.display = ''; el.style.margin = ''; el.style.padding = '';
    };
    if (m) {
      if (stage) { stage.style.position = 'static'; stage.style.height = 'auto'; stage.style.overflow = 'visible'; }
      /* left/right wirken im normalen Fluss nicht mehr — sonst klebt die
         Ueberschrift am Rand, waehrend die Karten eingerueckt sind. */
      if (fhead) { fhead.style.position = 'static'; fhead.style.margin = '0 0 18px'; fhead.style.padding = '0 5vw'; }
      if (fprog) fprog.style.display = 'none';
    } else {
      zurueck(stage); zurueck(fhead); zurueck(fprog);
    }

    if (this.flow) {
      this.flow.style.height = m ? 'auto' : '520vh';
      /* Platz fuer die feste Kopfzeile — ohne das schiebt sich die
         Ueberschrift darunter, sobald der Abschnitt oben ankommt. */
      this.flow.style.padding = m ? 'clamp(88px,12vh,116px) 0 26px' : '';
    }
    const svgs = Array.from(document.querySelectorAll('#rg-flow svg'));
    svgs.forEach(s => { s.style.display = m ? 'none' : 'block'; });
    if (this.flowDot) this.flowDot.style.display = m ? 'none' : 'block';
    if (this.flowTrack) {
      if (m) {
        this.flowTrack.style.position = 'static';
        this.flowTrack.style.width = '100%';
        this.flowTrack.style.height = 'auto';
        this.flowTrack.style.transform = 'none';
        this.flowTrack.style.display = 'flex';
        this.flowTrack.style.flexDirection = 'column';
        this.flowTrack.style.gap = '18px';
        /* 120px oben stammten vom waagerechten Filmstreifen des Entwurfs.
           Im normalen Fluss ist das eine Luecke unter der Ueberschrift. */
        this.flowTrack.style.padding = '0 5vw 8px';
        this.flowTrack.style.borderLeft = 'none';
      } else {
        this.flowTrack.style.position = 'absolute';
        this.flowTrack.style.width = '240vw';
        this.flowTrack.style.height = '100%';
        this.flowTrack.style.display = 'block';
        this.flowTrack.style.padding = '0';
      }
    }
    (this.flowSteps || []).forEach(s => {
      if (s.dataset.dLeft == null) {
        s.dataset.dLeft = s.style.left || '';
        s.dataset.dTop = s.style.top || '';
        s.dataset.dTransform = s.style.transform || '';
      }
      const num = s.querySelector('[data-num]');
      const med = s.querySelector('[data-node]');
      const tx = s.querySelector('[data-step-in]');
      if (num && num.dataset.dFont == null) num.dataset.dFont = num.style.fontSize || '';
      if (m) {
        s.style.position = 'static';
        s.style.left = 'auto'; s.style.top = 'auto';
        s.style.width = 'auto';
        s.style.transform = 'none';
        s.style.opacity = '1';
        if (num) { num.style.position = 'static'; num.style.transform = 'none'; num.style.display = 'block'; num.style.fontSize = 'clamp(38px,11vw,58px)'; num.style.marginBottom = '2px'; }
        if (med) med.style.transform = 'none';
        if (tx) tx.style.transform = 'none';
      } else {
        s.style.position = 'absolute';
        s.style.left = s.dataset.dLeft;
        s.style.top = s.dataset.dTop;
        s.style.transform = s.dataset.dTransform;
        s.style.width = 'min(30vw,392px)';
        if (num) { num.style.position = 'absolute'; num.style.display = ''; num.style.fontSize = num.dataset.dFont; num.style.marginBottom = ''; }
      }
    });
    if (m) (this.flowSteps || []).forEach(s => { s.style.opacity = '1'; s.__on = true; });

    /* Die Galerie regelt galerieMobil() weiter oben. Der Entwurf stapelte
       sie hier senkrecht und setzte flexGrow auf 1 — das hob das wischbare
       Band wieder auf, weil es NACH galerieMobil lief. Entfernt. */
    const galrow = document.getElementById('rg-galrow');
    if (galrow) galrow.style.flexDirection = 'row';
    this.galerieMobil(m);

    if (this.kinSpread == null) this.kinSpread = 120;
    this.kinSpread = m ? 40 : 120;
  }

  updateExtras(t, dt) {
    if (!this.orbits && document.getElementById('rg-orbit')) this.setupMap();
    if ((!this.flowReady || !this.flow || !this.flow.isConnected) && document.getElementById('rg-mq1')) this.setupFlow();
    const vel = this.scrollVel || 0;

    [this.mq1, this.mq2].forEach((row, i) => {
      if (!row) return;
      const dir = i === 0 ? -1 : 1;
      row.__off += dir * (i === 0 ? 0.42 : 0.3) * dt * 0.06;
      const w = row.__w;
      if (row.__off < -w) row.__off += w;
      if (row.__off > 0) row.__off -= w;
      row.style.transform = 'translate3d(' + row.__off.toFixed(1) + 'px,0,0)';
    });

    if (this.flow && this.flowTrack) {
      const r = this.flow.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const raw = Math.min(1, Math.max(0, -r.top / span));
      const p = raw < 0.06 ? 0 : raw > 0.94 ? 1 : (raw - 0.06) / 0.88;
      this.fp = this.fp == null ? p : this.fp + (p - this.fp) * 0.11;
      const q = this.fp;
      if (!this.isMobile) {
        const tw = this.flowTrack.offsetWidth || 1;
        const travel = Math.max(0, tw - window.innerWidth);
        this.flowTrack.style.transform = 'translate3d(' + (-travel * q).toFixed(1) + 'px,0,0)';
      }
      const qg = Math.min(1, q / 0.55);
      if (this.flowLine) this.flowLine.style.strokeDashoffset = (this.flowLen * (1 - qg)).toFixed(1);
      if (this.flowLeaves) {
        for (const lf of this.flowLeaves) {
          const lv = Math.min(1, Math.max(0, (qg - lf.fr - 0.02) / 0.05));
          if (lv <= 0.004) { if (lf.el.getAttribute('opacity') !== '0') lf.el.setAttribute('opacity', '0'); continue; }
          const sway = Math.sin(t * 0.85 + lf.ph) * 6;
          lf.el.setAttribute('opacity', (lv * 0.97).toFixed(3));
          lf.el.setAttribute('transform', 'translate(' + lf.x.toFixed(1) + ',' + lf.y.toFixed(1) + ') rotate(' + (lf.ang + lf.side * (lf.bloom ? 62 : 50) + sway).toFixed(1) + ') translate(' + (lf.off * lv).toFixed(1) + ',0) scale(' + lv.toFixed(3) + ')');
        }
      }
      if (this.flowTip) {
        const tv = Math.min(1, Math.max(0, (qg - 0.965) / 0.03));
        this.flowTip.el.setAttribute('opacity', tv.toFixed(3));
        const nod = Math.sin(t * 0.7) * 5;
        this.flowTip.el.setAttribute('transform', 'translate(' + this.flowTip.x.toFixed(1) + ',' + this.flowTip.y.toFixed(1) + ') rotate(' + nod.toFixed(1) + ') scale(' + (tv * 1.05).toFixed(3) + ')');
      }
      if (!this.isMobile && this.flowDot && this.flowLen) {
        const pt = this.flowLine.getPointAtLength((this.flowLenU || this.flowLen) * q);
        this.flowDot.style.left = (pt.x / 3200 * 100).toFixed(3) + '%';
        this.flowDot.style.top = (pt.y / 1000 * 100).toFixed(3) + '%';
        this.flowDot.style.transform = 'scale(' + (1 + Math.sin(t * 3.4) * 0.14).toFixed(3) + ')';
      }
      if (this.flowBar) this.flowBar.style.width = (q * 100).toFixed(1) + '%';
      let idx = 0;
      for (let i = 0; i < this.flowAt.length; i++) if (q >= this.flowAt[i] - 0.055) idx = i;
      this.flowSteps.forEach((s, i) => {
        const on = this.isMobile ? true : q >= this.flowAt[i] - 0.06;
        if (s.__on === on) return;
        s.__on = on;
        s.style.opacity = on ? '1' : '0';
        const inner = s.querySelector('[data-step-in]');
        if (inner) inner.style.transform = on ? 'translateY(0px)' : s.__rest;
        if (s.__num) s.__num.style.transform = on ? 'translateY(-100%) scale(1)' : 'translateY(-100%) scale(.62)';
        if (s.__med) {
          s.__med.style.transform = on ? 'translateY(0px)' : 'translateY(14px)';
          s.__med.style.boxShadow = on
            ? '0 34px 68px -26px rgba(12,29,20,.46),0 0 0 7px rgba(142,207,79,.2)'
            : '0 30px 62px -26px rgba(12,29,20,.42),0 0 0 0 rgba(142,207,79,.5)';
        }
      });
      if (idx !== this.flowIdx) {
        this.flowIdx = idx;
        if (this.flowCap) this.flowCap.textContent = this.flowTitles[idx];
        if (this.flowNum) this.flowNum.textContent = '0' + (idx + 1);
      }
    }

    if (this.orbits) {
      const box = document.getElementById('rg-orbit');
      const w = box ? box.clientWidth : 400;
      for (const o of this.orbits) {
        const a = o.a + t * 0.055;
        o.el.style.transform = 'translate(-50%,-50%) translate(' + (Math.cos(a) * o.r * w).toFixed(1) + 'px,' + (Math.sin(a) * o.r * w * 0.86).toFixed(1) + 'px)';
      }
      if (this.routes) {
        for (let i = 0; i < this.routes.length; i++) {
          const o = this.orbits[i], rt = this.routes[i];
          const a = o.a + t * 0.055;
          const tx = 200 + Math.cos(a) * o.r * 400;
          const ty = 200 + Math.sin(a) * o.r * 344;
          const mx2 = 200 + (tx - 200) * 0.5 - (ty - 200) * 0.18;
          const my2 = 200 + (ty - 200) * 0.5 + (tx - 200) * 0.18;
          const d = 'M 200 200 Q ' + mx2.toFixed(1) + ' ' + my2.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1);
          rt.casing.setAttribute('d', d);
          rt.lane.setAttribute('d', d);
          rt.mid.setAttribute('d', d);
          rt.glow.setAttribute('d', d);
          const len = rt.glow.getTotalLength() || 1;
          const ph2 = ((t * 0.34) + rt.ph) % 1;
          const seg = len * 0.26;
          rt.glow.setAttribute('stroke-dasharray', seg + ' ' + len);
          rt.glow.setAttribute('stroke-dashoffset', String(-(ph2 * (len + seg)) + seg));
          rt.glow.setAttribute('opacity', (0.35 + Math.sin(ph2 * Math.PI) * 0.55).toFixed(3));
          const pt2 = rt.glow.getPointAtLength(len * ph2);
          rt.dot.setAttribute('cx', pt2.x.toFixed(1));
          rt.dot.setAttribute('cy', pt2.y.toFixed(1));
          rt.dot.setAttribute('opacity', (0.3 + Math.sin(ph2 * Math.PI) * 0.7).toFixed(3));
        }
      }
      if (this.ping) {
        const ph = (t * 0.42) % 1;
        this.ping.style.transform = 'translate(-50%,-50%) scale(' + (0.4 + ph * 2.3).toFixed(3) + ')';
        this.ping.style.opacity = ((1 - ph) * 0.7).toFixed(3);
      }
    }


    if (this.kin) {
      if (Math.abs(vel) > 0.6) this.kinDir = vel > 0 ? 0 : 1;
      if (this.kinS == null) this.kinS = 1;
      this.kinS += ((this.kinDir == null ? 1 : this.kinDir) - this.kinS) * 0.055;
      const sp = this.kinS * (this.kinSpread || 120);
      this.kin.style.transform = 'translate3d(' + (-sp).toFixed(1) + 'px,0,0)';
      if (this.kin2) this.kin2.style.transform = 'translate3d(' + sp.toFixed(1) + 'px,0,0)';
    }

  }

  setupReveals() {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    /* Auf dem Handy kommen die Elemente abwechselnd von links und rechts
       herein statt alle von unten. Das gibt dem Durchscrollen einen
       Rhythmus, ohne dass jede Karte gleich aussieht.
       28 px sind bewusst wenig: mehr wuerde bei 360 px Breite trotz
       overflow-x:clip auffallen und die Seite wackeln lassen. */
    const seitlich = window.innerWidth < 820 && !__reduce;
    els.forEach((el, i) => {
      el.style.opacity = '0';
      /* 44 statt 28 px: bei 28 war die Bewegung so klein, dass sie beim
         Scrollen kaum auffiel. Mehr geht nicht, sonst wird bei 360 px
         Breite trotz overflow-x:clip die Seite unruhig. */
      if (seitlich) el.style.transform = 'translateX(' + (i % 2 ? 44 : -44) + 'px)';
      else if (!__reduce) el.style.transform = 'translateY(26px)';
      el.style.transition = __reduce
        ? 'opacity .35s ease'
        : 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)';
    });
    this.io = new IntersectionObserver(en => {
      en.forEach((e, i) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'none'; }, i * 80);
        this.io.unobserve(el);
      });
    /* -22 statt -10 Prozent: so beginnt die Bewegung erst, wenn das
       Element deutlich im Bild ist. Vorher war sie oft schon zu Ende,
       bevor man es ueberhaupt gesehen hat. */
    }, { rootMargin: '0px 0px -22% 0px', threshold: 0.05 });
    els.forEach(el => this.io.observe(el));
    setTimeout(() => els.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; }), 8000);
  }

  noise(x, y, z) {
    return Math.sin(x * 1.7 + y * 2.3) * 0.5 + Math.sin(y * 3.1 + z * 1.9) * 0.3 + Math.sin(z * 2.7 + x * 1.3) * 0.2;
  }

  rock(THREE, r, amp, detail) {
    const g = new THREE.IcosahedronGeometry(r, detail == null ? 1 : detail);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + amp * this.noise(x * 3.4 / r, y * 3.4 / r, z * 3.4 / r) * 0.5;
      p.setXYZ(i, x * n, y * n, z * n);
    }
    g.computeVertexNormals();
    return g;
  }

  leafCluster(x, y, z, r, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rad = r * 0.72 * Math.pow(Math.random(), 0.62);
      this.leafList.push({
        r: r * (0.2 + Math.random() * 0.24),
        x: x + Math.cos(a) * rad,
        y: y + (Math.random() - 0.24) * r * 0.78,
        z: z + Math.sin(a) * rad,
        light: Math.random() > 0.45
      });
    }
  }

  flowerOpenGeo(THREE) {
    const pos = [], idx = [], cl = [];
    const n = 7, Rr = 0.052, w = 0.017;
    pos.push(0, 0.005, 0); cl.push(0.72, 0.72, 0.72);
    let v = 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ma = a - 0.36, pa = a + 0.36;
      pos.push(Math.cos(ma) * w, 0.002, Math.sin(ma) * w); cl.push(0.88, 0.88, 0.88);
      pos.push(Math.cos(a) * Rr, 0.016, Math.sin(a) * Rr); cl.push(1.12, 1.12, 1.12);
      pos.push(Math.cos(pa) * w, 0.002, Math.sin(pa) * w); cl.push(0.88, 0.88, 0.88);
      idx.push(0, v, v + 1, 0, v + 1, v + 2);
      v += 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  flowerBellGeo(THREE) {
    const g = new THREE.CylinderGeometry(0.03, 0.012, 0.056, 8, 1, true);
    const p = g.attributes.position, cl = [];
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const sh = y > 0 ? 1.12 : 0.78;
      cl.push(sh, sh, sh);
      if (y > 0) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const wob = 1 + Math.sin(a * 5) * 0.16;
        p.setX(i, p.getX(i) * wob);
        p.setZ(i, p.getZ(i) * wob);
      }
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.computeVertexNormals();
    return g;
  }

  ashlarGeo(THREE) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const p = g.attributes.position;
    const key = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = [Math.round(p.getX(i) * 4), Math.round(p.getY(i) * 4), Math.round(p.getZ(i) * 4)].join(',');
      let o = key.get(k);
      if (!o) {
        o = [(Math.random() - 0.5) * 0.075, (Math.random() - 0.5) * 0.055, (Math.random() - 0.5) * 0.05];
        key.set(k, o);
      }
      p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
    }
    g.computeVertexNormals();
    return g;
  }

  leafCardGeo(THREE) {
    const pos = [], cl = [], uv = [], idx = [];
    const ring = [[0, 0, 0, 0.5], [-0.032, 0.018, 0.004, 0.6], [-0.044, 0.048, 0.009, 0.82],
      [-0.036, 0.076, 0.008, 0.98], [0, 0.092, 0.003, 1.1],
      [0.036, 0.076, 0.008, 0.98], [0.044, 0.048, 0.009, 0.82], [0.032, 0.018, 0.004, 0.6]];
    ring.forEach(p => {
      pos.push(p[0], p[1], p[2]);
      cl.push(p[3], p[3], p[3]);
      uv.push(0.5 + p[0] * 8, p[1] * 10);
    });
    for (let i = 1; i < ring.length - 1; i++) idx.push(0, i, i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  buildLeaves(THREE, garden, mat) {
    const list = this.leafList;
    const per = window.innerWidth < 760 ? 6 : 19;
    const N = list.length * per;
    const im = new THREE.InstancedMesh(this.leafCardGeo(THREE), mat, N);
    im.name = 'blaetter';
    const dm = new THREE.Object3D(), col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      for (let j = 0; j < per; j++) {
        const th = Math.acos(1 - 2 * Math.random()), ph = Math.random() * 6.283;
        const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th) * 0.8, nz = Math.sin(th) * Math.sin(ph);
        const rr = l.r * (0.86 + Math.random() * 0.3);
        dm.position.set(l.x + nx * rr, l.y + ny * rr, l.z + nz * rr);
        dm.rotation.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283);
        const s = 0.9 + Math.random() * 0.45;
        dm.scale.set(s * (0.9 + Math.random() * 0.25), s, s);
        dm.updateMatrix();
        im.setMatrixAt(k, dm.matrix);
        col.setHSL(0.29 + Math.random() * 0.07, 0.36 + Math.random() * 0.2, 0.26 + (l.light ? 0.11 : 0.01) + Math.random() * 0.1).convertSRGBToLinear();
        im.setColorAt(k, col);
        k++;
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    garden.add(im);
  }

  buildFoliage(THREE, garden, mat) {
    const list = this.leafList;
    const im = new THREE.InstancedMesh(this.rock(THREE, 1, 0.19, 1), mat, list.length);
    im.castShadow = true;
    im.name = 'laubwerk';
    const dm = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      dm.position.set(l.x, l.y, l.z);
      dm.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dm.scale.set(l.r * (0.92 + Math.random() * 0.22), l.r * (0.7 + Math.random() * 0.34), l.r * (0.92 + Math.random() * 0.22));
      dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix);
      col.setHSL(0.3 + Math.random() * 0.055, 0.32 + Math.random() * 0.15, 0.25 + (l.light ? 0.1 : 0) + Math.random() * 0.07).convertSRGBToLinear();
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    garden.add(im);
  }

  bladeGeo(THREE, h, w, curveAmt) {
    const seg = 3, pos = [], idx = [], uv = [], cl = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const hw = w * (1 - t * 0.82);
      const y = h * t * (1 - t * 0.12);
      const z = h * (curveAmt == null ? 0.34 : curveAmt) * t * t;
      pos.push(-hw, y, z, hw, y, z);
      uv.push(0, t, 1, t);
      const sh = 0.3 + 1.15 * Math.pow(t, 0.68);
      const edge = 0.9;
      cl.push(sh * edge, sh * edge, sh * edge, sh, sh, sh);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  windify(mat, refH) {
    const self = this;
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = self.uTime;
      shader.uniforms.uWind = self.uWind;
      shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        [
          'vec4 mvPosition = vec4( transformed, 1.0 );',
          '#ifdef USE_INSTANCING',
          '  mvPosition = instanceMatrix * mvPosition;',
          '#endif',
          'vec3 wpos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          'float bh = clamp(position.y / ' + refH.toFixed(3) + ', 0.0, 1.0);',
          'float gust = 0.58 + 0.42 * sin(uTime * 0.15 + wpos.x * 0.04 + wpos.z * 0.025);',
          'float wave = sin(wpos.x * 0.34 + wpos.z * 0.25 - uTime * 0.85);',
          'float amp = bh * bh * (0.05 + 0.17 * gust) * uWind;',
          'mvPosition.x += amp * (0.78 + 0.34 * wave);',
          'mvPosition.z += amp * 0.42 * wave;',
          'mvPosition = modelViewMatrix * mvPosition;',
          'gl_Position = projectionMatrix * mvPosition;'
        ].join('\n')
      );
    };
    mat.customProgramCacheKey = () => 'wind' + refH;
  }

  initScene() {
    const THREE = window.THREE;
    const canvas = document.getElementById('rg-canvas');
    if (!canvas) return;
    if (this.renderer && this.renderer.domElement === canvas) return;
    if (this.renderer && this.renderer.domElement !== canvas) { try { this.renderer.dispose(); } catch (e) {} this.renderer = null; this.ready = false; }
    const renderer = canvas.__rgRenderer || new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    canvas.__rgRenderer = renderer;
    renderer.setPixelRatio(Math.min(window.innerWidth < 820 ? 1.4 : 1.85, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    this.renderer = renderer;

    this.uTime = { value: 0 };
    this.uWind = { value: 1 };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xD3E3EC, 0.016);
    scene.fog.color.convertSRGBToLinear();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera = camera;

    const M = (c, r, extra) => {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0.02 }, extra || {}));
      m.color.convertSRGBToLinear();
      if (m.emissive) m.emissive.convertSRGBToLinear();
      m.envMapIntensity = 0.16;
      return m;
    };
    const mLawn = M(0x4C7A3C, 0.96); mLawn.vertexColors = true; mLawn.name = 'rasenboden';
    const mGrass = M(0xFFFFFF, 0.92, { side: THREE.DoubleSide, vertexColors: true }); mGrass.name = 'grashalm';
    const mMeadow = M(0xFFFFFF, 0.9, { side: THREE.DoubleSide, vertexColors: true }); mMeadow.name = 'wiese';
    const mSoil = M(0x37291B, 1.0); mSoil.name = 'erde';
    const mMulch = M(0x33241A, 1.0); mMulch.name = 'rindenmulch';
    const mStone = M(0xB8B2A2, 0.86); mStone.name = 'naturstein';
    const mStoneW = M(0xC6BCA6, 0.84); mStoneW.name = 'naturstein_warm';
    const mStoneD = M(0x9A9384, 0.9); mStoneD.name = 'naturstein_dunkel';
    const mStoneI = M(0xFFFFFF, 0.86); mStoneI.name = 'naturstein_instanz';
    const mHedge = M(0xFFFFFF, 0.94, { side: THREE.DoubleSide }); mHedge.name = 'hecke';
    const mLeaf = M(0xFFFFFF, 0.9); mLeaf.name = 'laubwerk';
    const mLeafCard = M(0xFFFFFF, 0.72, { side: THREE.DoubleSide, vertexColors: true }); mLeafCard.name = 'blatt';
    this.windify(mLeafCard, 0.1);
    const mLeafB = M(0x4A8C4A, 0.88); mLeafB.name = 'laub_hell';
    const mTrunk = M(0x584634, 0.92); mTrunk.name = 'stamm';
    const mWood = M(0xA87B4E, 0.8); mWood.name = 'holz';
    const mWoodD = M(0x7C5836, 0.84); mWoodD.name = 'holz_dunkel';
    const mMetal = M(0x3E4644, 0.4, { metalness: 0.8 }); mMetal.envMapIntensity = 0.9; mMetal.name = 'metall';
    const mWater = M(0x1C6FA8, 0.06, { metalness: 0.12, transparent: true, opacity: 0.9 }); mWater.envMapIntensity = 0.55; mWater.name = 'wasser';
    const mWaterD = M(0x1E4F63, 0.9); mWaterD.name = 'teichgrund';
    const mJet = M(0xE2F2FA, 0.05, { metalness: 0.3, transparent: true, opacity: 0.52 }); mJet.envMapIntensity = 0.95; mJet.name = 'wasserstrahl';
    const mLamp = M(0xFFF4D8, 0.4, { emissive: 0xFFD489, emissiveIntensity: 0.5 }); mLamp.name = 'leuchte';
    const mPot = M(0x8F6248, 0.92); mPot.name = 'kuebel';
    this.mLamp = mLamp; this.mJet = mJet;
    this.windify(mGrass, 0.2);
    this.windify(mLeaf, 1.6);
    this.windify(mMeadow, 0.5);

    const garden = new THREE.Group();
    scene.add(garden);
    this.garden = garden;
    this.leafList = [];

    const pathPts = [
      [0.6, 22.2], [0.45, 18.4], [0.2, 13.2], [-0.8, 10.6], [-2.0, 8.2], [-2.6, 5.6],
      [-1.8, 3.0], [-0.2, 1.0], [1.6, -0.8], [2.6, -3.2], [2.2, -5.6], [1.2, -7.2]
    ];
    this.curve = new THREE.CatmullRomCurve3(pathPts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.4);

    const streamProfile = [[5.8, 8.2], [5.1, 7.9], [4.4, 7.6], [3.7, 7.2], [3.0, 6.8], [2.4, 6.3], [1.8, 5.8], [1.25, 5.2], [0.7, 4.6], [0.15, 3.9], [-0.4, 3.2], [-0.9, 2.8], [-1.41, 2.4], [-1.9, 2.0], [-2.4, 1.6], [-2.75, 1.0], [-3.3, -0.2]];
    const streamDip = (x, z) => {
      let best = 1e9;
      for (let i = 0; i < streamProfile.length; i++) {
        const dx = x - streamProfile[i][0], dz = z - streamProfile[i][1];
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      const d = Math.sqrt(best);
      if (d > 2.2) return 0;
      if (d <= 0.95) return -0.26;
      const k = 1 - (d - 0.95) / 1.25;
      return -0.26 * k * k * (3 - 2 * k);
    };
    const hVert = (gx, gz) => this.noise(gx * 0.28, 0.4, gz * 0.28) * 0.09
      + this.noise(gx * 0.9, 1.1, gz * 0.9) * 0.025 + streamDip(gx, gz);
    const groundMesh = (x, z) => {
      const x0 = Math.floor(x), z0 = Math.floor(z);
      const fx = x - x0, fz = z - z0;
      const h00 = hVert(x0, z0), h10 = hVert(x0 + 1, z0);
      const h01 = hVert(x0, z0 + 1), h11 = hVert(x0 + 1, z0 + 1);
      const a = fx + fz < 1
        ? h00 + fx * (h10 - h00) + fz * (h01 - h00)
        : h11 + (1 - fx) * (h01 - h11) + (1 - fz) * (h10 - h11);
      const b = fz < fx
        ? h00 + fx * (h10 - h00) + fz * (h11 - h10)
        : h00 + fz * (h01 - h00) + fx * (h11 - h01);
      return Math.max(a, b);
    };
    this.groundMesh = groundMesh;
    const groundGeo = new THREE.PlaneGeometry(62, 68, 62, 68);
    groundGeo.rotateX(-Math.PI / 2);
    const gp = groundGeo.attributes.position;
    const gcol = new Float32Array(gp.count * 3), c1 = new THREE.Color();
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      gp.setY(i, this.noise(x * 0.28, 0.4, z * 0.28) * 0.09 + this.noise(x * 0.9, 1.1, z * 0.9) * 0.025 + streamDip(x, z));
      const band = Math.floor((z + 15) / 2.6) % 2;
      const n = 0.86 + band * 0.1 + this.noise(x * 1.1, 2.2, z * 1.1) * 0.09;
      c1.setRGB(n * 0.94, n, n * 0.84).convertSRGBToLinear();
      gcol[i * 3] = c1.r; gcol[i * 3 + 1] = c1.g; gcol[i * 3 + 2] = c1.b;
    }
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3));
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, mLawn);
    ground.receiveShadow = true;
    ground.name = 'rasenflaeche';
    garden.add(ground);

    const groundY = (x, z) => this.noise(x * 0.28, 0.4, z * 0.28) * 0.09 + this.noise(x * 0.9, 1.1, z * 0.9) * 0.025;
    this.groundFlat = groundY;
    this.groundY = groundY;

    const pathSamples = [];
    for (let i = 0; i <= 120; i++) {
      const pt = this.curve.getPointAt(i / 120);
      pathSamples.push([pt.x, pt.z]);
    }
    const nearPath = (x, z, r) => {
      for (let i = 0; i < pathSamples.length; i++) {
        const dx = x - pathSamples[i][0], dz = z - pathSamples[i][1];
        if (dx * dx + dz * dz < r * r) return true;
      }
      return false;
    };

    const beds = [
      { x: -6.2, z: 6.4, rx: 2.5, rz: 1.5 },
      { x: 4.6, z: 4.2, rx: 1.9, rz: 2.4 },
      { x: -5.4, z: -2.4, rx: 2.2, rz: 1.7 },
      { x: 6.4, z: -4.6, rx: 1.8, rz: 1.5 }
    ];
    const pond = { x: -3.6, z: -1.2, r: 3.0 };
    const terrace = { x: 2.4, z: -6.4, rx: 3.4, rz: 2.6 };
    const inBed = (x, z) => beds.some(b => Math.pow((x - b.x) / b.rx, 2) + Math.pow((z - b.z) / b.rz, 2) < 1);
    const inPond = (x, z) => (x - pond.x) * (x - pond.x) + (z - pond.z) * (z - pond.z) < pond.r * pond.r;
    const inTerrace = (x, z) => Math.abs(x - terrace.x) < terrace.rx && Math.abs(z - terrace.z) < terrace.rz;
    const solids = [
      [-4.5, 12.7, 0.62], [4.5, 12.7, 0.62], [-1.8, 16.4, 0.75], [2.5, 16.4, 0.75],
      [-1.85, 13.2, 1.15], [1.85, 13.2, 1.15],
      [-11.4, 13.2, 0.55], [9.6, 10.4, 0.5], [-9.2, 0.6, 0.6], [8.8, -2.4, 0.45], [-2.0, -8.4, 0.5],
      [-2.4, 11.0, 0.32], [-3.5, 6.4, 0.32], [0.9, 2.0, 0.32], [3.6, -2.0, 0.32], [1.0, -5.2, 0.32],
      [5.9, 4.6, 0.55],
      [5.8, 8.2, 1.7, 1], [6.6, 8.5, 1.5, 1], [7.3, 8.8, 1.3, 1], [5.4, 7.4, 1.3, 1],
      [6.9, 7.6, 1.4, 1], [6.2, 9.4, 1.3, 1],
      [-7.6, 6.2, 0.5], [-5.2, 5.2, 0.44], [5.2, 5.0, 0.5], [4.2, 3.2, 0.4],
      [-6.0, -1.6, 0.48], [-4.8, -3.2, 0.42], [6.8, -4.0, 0.44], [6.0, -5.4, 0.38],
      [-10.2, 4.2, 0.56], [8.2, 6.4, 0.52], [-9.0, -5.6, 0.48], [8.6, 2.0, 0.46]
    ];
    const inSolid = (x, z) => {
      for (let i = 0; i < solids.length; i++) {
        const dx = x - solids[i][0], dz = z - solids[i][1];
        if (dx * dx + dz * dz < solids[i][2] * solids[i][2]) return true;
      }
      return false;
    };
    const onFence = (x, z) => (Math.abs(Math.abs(x) - 12.5) < 0.36 && z > -10.4 && z < 14.5) || (Math.abs(z - 14.1) < 0.36 && Math.abs(x) < 12.9) || (Math.abs(z + 9.9) < 0.36 && Math.abs(x) < 12.9);
    const streamSamples = [[5.8, 8.2], [5.1, 7.9], [4.4, 7.6], [3.7, 7.2], [3.0, 6.8], [2.4, 6.3], [1.8, 5.8], [1.25, 5.2], [0.7, 4.6], [0.15, 3.9], [-0.4, 3.2], [-0.9, 2.8], [-1.41, 2.4], [-1.9, 2.0], [-2.4, 1.6], [-2.75, 1.0], [-3.3, -0.2]];
    const nearStream = (x, z, r) => {
      for (let i = 0; i < streamSamples.length; i++) {
        const dx = x - streamSamples[i][0], dz = z - streamSamples[i][1];
        if (dx * dx + dz * dz < r * r) return true;
      }
      return false;
    };
    const blocked = (x, z) => nearStream(x, z, 1.15) || nearPath(x, z, 0.95) || inBed(x, z) || inPond(x, z) || inTerrace(x, z) || inSolid(x, z) || onFence(x, z);

    const lawnBlade = this.bladeGeo(THREE, 0.2, 0.0095);
    const NG = window.innerWidth < 760 ? 26000 : 96000;
    const grass = new THREE.InstancedMesh(lawnBlade, mGrass, NG);
    grass.name = 'rasenhalme';
    const dm = new THREE.Object3D(), col = new THREE.Color();
    let gi = 0, guard = 0;
    while (gi < NG && guard < NG * 4) {
      guard++;
      const x = (Math.random() - 0.5) * 30;
      const z = 1.5 + (Math.random() - 0.5) * 48;
      if (blocked(x, z)) continue;
      dm.position.set(x, groundY(x, z) - 0.01, z);
      dm.rotation.set(0.06 + Math.random() * 0.18, Math.random() * 6.28, 0);
      dm.scale.set(0.9 + Math.random() * 0.3, 0.8 + Math.random() * 0.45, 1);
      dm.updateMatrix();
      grass.setMatrixAt(gi, dm.matrix);
      const band = Math.floor((z + 15) / 2.6) % 2;
      col.setHSL(0.25 + Math.random() * 0.05, 0.36 + band * 0.06, 0.36 + band * 0.055 + Math.random() * 0.1).convertSRGBToLinear();
      grass.setColorAt(gi, col);
      gi++;
    }
    grass.count = gi;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.instanceMatrix.needsUpdate = true;
    garden.add(grass);

    const meadowBlade = this.bladeGeo(THREE, 0.5, 0.014, 0.4);
    const NM = window.innerWidth < 760 ? 1600 : 4600;
    const meadow = new THREE.InstancedMesh(meadowBlade, mMeadow, NM);
    meadow.name = 'ziergras';
    const tufts = [[-6.4, 6.6], [4.8, 4.0], [-5.6, -2.2], [6.2, -4.4], [-3.4, 2.0], [-6.6, 1.4], [5.4, 8.0], [-4.4, -5.0], [3.2, 10.4], [-7.6, 9.4], [-9.6, 6.8], [9.2, 4.4], [-8.4, -2.6], [7.8, -7.2], [-2.6, 11.6], [4.4, 12.2], [-10.4, 1.2], [10.2, 9.6], [0.8, -9.4], [-6.2, -8.2], [8.6, 12.4], [-11.0, 10.6]];
    let mi = 0, mguard = 0;
    while (mi < NM && mguard < NM * 4) {
      mguard++;
      const tf = tufts[Math.floor(Math.random() * tufts.length)];
      const a = Math.random() * 6.28, r = Math.pow(Math.random(), 0.6) * 1.35;
      const x = tf[0] + Math.cos(a) * r, z = tf[1] + Math.sin(a) * r;
      if (nearPath(x, z, 0.8) || inPond(x, z) || inTerrace(x, z) || inSolid(x, z) || nearStream(x, z, 0.95)) continue;
      dm.position.set(x, groundY(x, z) - 0.01, z);
      dm.rotation.set(0.1 + Math.random() * 0.28, Math.random() * 6.28, 0);
      dm.scale.set(0.9 + Math.random() * 0.3, 0.72 + Math.random() * 0.5, 1);
      dm.updateMatrix();
      meadow.setMatrixAt(mi, dm.matrix);
      col.setHSL(0.24 + Math.random() * 0.06, 0.34 + Math.random() * 0.14, 0.32 + Math.random() * 0.14).convertSRGBToLinear();
      meadow.setColorAt(mi, col);
      mi++;
    }
    meadow.count = mi;
    if (meadow.instanceColor) meadow.instanceColor.needsUpdate = true;
    meadow.instanceMatrix.needsUpdate = true;
    garden.add(meadow);

    const slabGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const NS = 150;
    const slabs = new THREE.InstancedMesh(slabGeo, mStoneI, NS);
    slabs.castShadow = true; slabs.receiveShadow = true; slabs.name = 'pflastersteine';
    let si = 0;
    for (let i = 0; i < 74 && si < NS; i++) {
      const t = i / 73;
      const pt = this.curve.getPointAt(Math.min(0.999, t));
      const tan = this.curve.getTangentAt(Math.min(0.999, t));
      const ang = Math.atan2(tan.x, tan.z);
      const nx = Math.cos(ang), nz = -Math.sin(ang);
      for (let s = -1; s <= 1; s += 2) {
        if (si >= NS) break;
        const off = s * (0.42 + Math.random() * 0.06);
        const x = pt.x + nx * off, z = pt.z + nz * off;
        if ((x + 1.41) * (x + 1.41) + (z - 2.4) * (z - 2.4) < 2.25) continue;
        dm.position.set(x, groundY(x, z) + 0.055, z);
        dm.rotation.set((Math.random() - 0.5) * 0.03, ang + (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.03);
        dm.scale.set(0.78 + Math.random() * 0.1, 1, 0.62 + Math.random() * 0.14);
        dm.updateMatrix();
        slabs.setMatrixAt(si, dm.matrix);
        col.setHSL(0.09 + Math.random() * 0.02, 0.025 + Math.random() * 0.03, 0.52 + Math.random() * 0.17).convertSRGBToLinear();
        slabs.setColorAt(si, col);
        si++;
      }
    }
    slabs.count = si;
    if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;
    slabs.instanceMatrix.needsUpdate = true;
    garden.add(slabs);

    const gravel = new THREE.InstancedMesh(this.rock(THREE, 0.05, 0.5, 0), mStoneI, 900);
    gravel.name = 'kiesbett';
    for (let ri = 0; ri < 900; ri++) {
      const pt = this.curve.getPointAt(Math.random() * 0.999);
      const a = Math.random() * 6.28, r = 0.5 + Math.random() * 0.75;
      const x = pt.x + Math.cos(a) * r, z = pt.z + Math.sin(a) * r;
      const nearBridge = (x + 1.41) * (x + 1.41) + (z - 2.4) * (z - 2.4) < 2.56;
      dm.position.set(x, groundY(x, z) + 0.03, z);
      dm.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dm.scale.setScalar(nearBridge ? 0.0001 : 0.6 + Math.random() * 0.9);
      dm.updateMatrix();
      gravel.setMatrixAt(ri, dm.matrix);
      col.setHSL(0.1, 0.05 + Math.random() * 0.06, 0.55 + Math.random() * 0.18).convertSRGBToLinear();
      gravel.setColorAt(ri, col);
    }
    if (gravel.instanceColor) gravel.instanceColor.needsUpdate = true;
    gravel.instanceMatrix.needsUpdate = true;
    garden.add(gravel);

    const NW = 340;
    const wall = new THREE.InstancedMesh(this.ashlarGeo(THREE), mStoneI, NW);
    wall.castShadow = true; wall.receiveShadow = true; wall.name = 'trockenmauer';
    let wi = 0;
    const wallRun = (x0, z0, x1, z1, rows, hgt) => {
      const baseY = groundY((x0 + x1) / 2, (z0 + z1) / 2);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.ceil(len / 0.46);
      const ang = Math.atan2(z1 - z0, x1 - x0);
      for (let r = 0; r < rows; r++) {
        const inset = r * 0.035;
        for (let i = 0; i < n; i++) {
          if (wi >= NW) return;
          const fr = (i + (r % 2 ? 0.5 : 0)) / n;
          const x = x0 + (x1 - x0) * fr, z = z0 + (z1 - z0) * fr;
          dm.position.set(x, baseY + 0.12 + r * (hgt / rows), z);
          dm.rotation.set(0, ang + (Math.random() - 0.5) * 0.02, 0);
          dm.scale.set(0.42 - inset * 0.9, 0.155, 0.44 - inset * 0.8);
          dm.updateMatrix();
          wall.setMatrixAt(wi, dm.matrix);
          col.setHSL(0.085 + Math.random() * 0.05, 0.05 + Math.random() * 0.12, 0.7 + Math.random() * 0.18).convertSRGBToLinear();
          wall.setColorAt(wi, col);
          wi++;
        }
      }
    };
    wallRun(-9.6, 9.2, -4.9, 8.4, 4, 0.78);
    wallRun(5.0, 1.8, 7.8, -1.4, 3, 0.56);
    wallRun(-7.4, -3.8, -4.2, -5.6, 3, 0.5);
    wall.count = wi;
    if (wall.instanceColor) wall.instanceColor.needsUpdate = true;
    wall.instanceMatrix.needsUpdate = true;
    garden.add(wall);

    const hedgeCores = [];
    const NH = window.innerWidth < 760 ? 3200 : 8200;
    const hedge = new THREE.InstancedMesh(this.leafCardGeo(THREE), mLeafCard, NH);
    hedge.name = 'hecke';
    let hi = 0;
    const hedgeRun = (x0, z0, x1, z1, h, thick) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const count = Math.round(len * h * thick * 150);
      const ang = Math.atan2(z1 - z0, x1 - x0);
      const nx = Math.sin(ang), nz = -Math.cos(ang);
      const nCore = Math.ceil(len / 0.42);
      for (let i = 0; i < nCore; i++) {
        const fr = (i + 0.5) / nCore;
        for (let r2 = 0; r2 < 2; r2++) {
          hedgeCores.push([
            x0 + (x1 - x0) * fr + nx * (r2 ? 0.16 : -0.16),
            h * (0.3 + r2 * 0.34),
            z0 + (z1 - z0) * fr + nz * (r2 ? 0.16 : -0.16),
            thick * 0.92, h * 0.56, ang
          ]);
        }
      }
      for (let i = 0; i < count; i++) {
        if (hi >= NH) return;
        const fr = Math.random();
        const off = (Math.random() - 0.5) * thick;
        const x = x0 + (x1 - x0) * fr + nx * off, z = z0 + (z1 - z0) * fr + nz * off;
        const yr = Math.random();
        dm.position.set(x, groundY(x, z) + 0.06 + yr * h, z);
        dm.rotation.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283);
        const ls = 0.95 + Math.random() * 0.5;
        dm.scale.set(ls * (0.9 + Math.random() * 0.25), ls, ls);
        dm.updateMatrix();
        hedge.setMatrixAt(hi, dm.matrix);
        col.setHSL(0.3 + Math.random() * 0.055, 0.32 + Math.random() * 0.15, 0.25 + yr * 0.09 + Math.random() * 0.07).convertSRGBToLinear();
        hedge.setColorAt(hi, col);
        hi++;
      }
    };
    hedgeRun(-11.6, 13.0, -2.4, 13.4, 1.7, 0.75);
    hedgeRun(2.4, 13.4, 11.6, 13.0, 1.7, 0.75);
    hedgeRun(-11.8, 12.6, -11.4, -2.0, 1.5, 0.7);
    hedgeRun(11.8, 12.6, 11.4, 0.0, 1.5, 0.7);
    hedgeRun(-11.4, -8.6, -3.0, -9.2, 1.3, 0.65);
    hedge.count = hi;
    if (hedge.instanceColor) hedge.instanceColor.needsUpdate = true;
    hedge.instanceMatrix.needsUpdate = true;
    garden.add(hedge);

    const mHedgeCore = M(0xFFFFFF, 0.95);
    const core = new THREE.InstancedMesh(this.rock(THREE, 0.5, 0.16, 1), mHedgeCore, hedgeCores.length);
    core.castShadow = true; core.receiveShadow = true; core.name = 'heckenkoerper';
    for (let i = 0; i < hedgeCores.length; i++) {
      const c = hedgeCores[i];
      dm.position.set(c[0], groundY(c[0], c[2]) + c[1], c[2]);
      dm.rotation.set(0, c[5], 0);
      dm.scale.set(c[3] * 1.5, c[4] * 1.35, c[3] * 1.5);
      dm.updateMatrix();
      core.setMatrixAt(i, dm.matrix);
      col.setHSL(0.305 + Math.random() * 0.05, 0.34 + Math.random() * 0.14, 0.235 + Math.random() * 0.07).convertSRGBToLinear();
      core.setColorAt(i, col);
    }
    core.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    garden.add(core);

    const NB = 1750;
    const mPetal = M(0xFFFFFF, 0.62, { side: THREE.DoubleSide, vertexColors: true }); mPetal.name = 'blueten_blatt';
    const mCore = M(0xE8B93C, 0.62); mCore.name = 'bluetenmitte';
    const mBud = M(0xFFFFFF, 0.7); mBud.name = 'knospe';
    const open = new THREE.InstancedMesh(this.flowerOpenGeo(THREE), mPetal, NB);
    open.name = 'blueten_offen';
    const cores = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 5, 4), mCore, NB);
    cores.name = 'bluetenmitten';
    const bells = new THREE.InstancedMesh(this.flowerBellGeo(THREE), mPetal, NB);
    bells.name = 'blueten_glocken';
    const buds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 8, 6), mBud, NB);
    buds.name = 'knospen';
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.007, 0.011, 0.34, 5), M(0x4C7A3A, 0.9), NB);
    stems.name = 'stiele';
    const bcols = [0xFBF7EC, 0xF3D264, 0xA985C6, 0xD4746A, 0xEFA8BE, 0xE8E2CE, 0xC9679A, 0xF0EDE2];
    let bi = 0, oi = 0, gi2 = 0, ui = 0, bguard = 0;
    while (bi < NB && bguard < NB * 5) {
      bguard++;
      let x, z;
      if (bi % 5 === 4) {
        const pt = this.curve.getPointAt(Math.random() * 0.999);
        const ang = Math.random() * 6.28, dr = 0.62 + Math.random() * 0.5;
        x = pt.x + Math.cos(ang) * dr; z = pt.z + Math.sin(ang) * dr;
        if (nearPath(x, z, 0.58) || inSolid(x, z) || inTerrace(x, z) || inPond(x, z) || nearStream(x, z, 1.0)) continue;
      } else {
        const b = beds[Math.floor(Math.random() * beds.length)];
        const a = Math.random() * 6.28, rr = Math.sqrt(Math.random());
        x = b.x + Math.cos(a) * b.rx * rr * 0.9; z = b.z + Math.sin(a) * b.rz * rr * 0.9;
        if (nearPath(x, z, 0.6)) continue;
      }
      const gy = groundY(x, z), hh = 0.2 + Math.random() * 0.3;
      const lean = (Math.random() - 0.5) * 0.26;
      dm.position.set(x, gy + hh * 0.5, z);
      dm.rotation.set(lean, 0, (Math.random() - 0.5) * 0.2);
      dm.scale.set(1, hh / 0.34, 1);
      dm.updateMatrix();
      stems.setMatrixAt(bi, dm.matrix);

      col.setHex(bcols[Math.floor(Math.random() * bcols.length)]).convertSRGBToLinear();
      const kind = bi % 7;
      const s = 0.78 + Math.random() * 0.5;
      if (kind < 4) {
        dm.position.set(x, gy + hh, z);
        dm.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6.28, (Math.random() - 0.5) * 0.5);
        dm.scale.setScalar(s);
        dm.updateMatrix();
        open.setMatrixAt(oi, dm.matrix);
        open.setColorAt(oi, col);
        dm.scale.setScalar(s * 0.9);
        dm.updateMatrix();
        cores.setMatrixAt(oi, dm.matrix);
        oi++;
      } else if (kind < 6) {
        dm.position.set(x, gy + hh - 0.012, z);
        dm.rotation.set(Math.PI + (Math.random() - 0.5) * 0.34, Math.random() * 6.28, 0);
        dm.scale.setScalar(s);
        dm.updateMatrix();
        bells.setMatrixAt(gi2, dm.matrix);
        bells.setColorAt(gi2, col);
        gi2++;
      } else {
        dm.position.set(x, gy + hh, z);
        dm.rotation.set(0, Math.random() * 3, 0);
        dm.scale.set(s, s * 1.25, s);
        dm.updateMatrix();
        buds.setMatrixAt(ui, dm.matrix);
        buds.setColorAt(ui, col);
        ui++;
      }
      bi++;
    }
    stems.count = bi; open.count = oi; cores.count = oi; bells.count = gi2; buds.count = ui;
    [open, cores, bells, buds, stems].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      garden.add(m);
    });

    beds.forEach((b, i) => {
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.14, 26), mMulch);
      bed.scale.set(b.rx, 1, b.rz);
      bed.position.set(b.x, groundY(b.x, b.z) + 0.04, b.z);
      bed.receiveShadow = true; bed.name = 'beet_' + i;
      garden.add(bed);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 6, 34), mStoneW);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(b.rx, b.rz, 1);
      ring.position.set(b.x, groundY(b.x, b.z) + 0.1, b.z);
      ring.castShadow = true; ring.name = 'beeteinfassung_' + i;
      garden.add(ring);
    });

    const shrubs = [[-7.6, 6.2, 0.56], [-5.2, 5.2, 0.5], [5.2, 5.0, 0.58], [4.2, 3.2, 0.46],
      [-6.0, -1.6, 0.55], [-4.8, -3.2, 0.48], [6.8, -4.0, 0.5], [6.0, -5.4, 0.42],
      [-10.2, 4.2, 0.66], [8.2, 6.4, 0.6], [-9.0, -5.6, 0.54], [8.6, 2.0, 0.52]];
    shrubs.forEach(s => this.leafCluster(s[0], groundY(s[0], s[1]) + s[2] * 0.8, s[1], s[2] * 1.1, 26));

    const tree = (x, z, h, crownR, tilt) => {
      const g = new THREE.Group();
      const prof = [];
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        prof.push(new THREE.Vector2(0.185 * Math.pow(1 - t, 0.62) + 0.035, h * t));
      }
      const trunk = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), mTrunk);
      trunk.castShadow = true; trunk.receiveShadow = true; trunk.name = 'stamm';
      g.add(trunk);
      const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.26, 12), mTrunk);
      flare.position.y = 0.11;
      flare.castShadow = true; flare.name = 'wurzelanlauf';
      g.add(flare);
      const limbs = [
        [h * 0.56, tilt, 0.86, crownR * 0.78],
        [h * 0.66, tilt + 2.2, 0.78, crownR * 0.66],
        [h * 0.74, tilt + 4.3, 0.72, crownR * 0.6],
        [h * 0.84, tilt + 1.1, 0.52, crownR * 0.42]
      ];
      const tips = [];
      limbs.forEach((L, i) => {
        const len = L[2] * 1.5 + 0.3;
        const geo = new THREE.CylinderGeometry(0.03, 0.072, len, 8);
        geo.translate(0, len / 2, 0);
        const br = new THREE.Mesh(geo, mTrunk);
        br.position.set(0, L[0], 0);
        br.rotation.order = 'YXZ';
        br.rotation.y = L[1];
        br.rotation.x = L[2];
        br.castShadow = true; br.name = 'ast_' + i;
        g.add(br);
        const sinE = Math.sin(L[2]), cosE = Math.cos(L[2]);
        tips.push([Math.sin(L[1]) * sinE * len, L[0] + cosE * len, Math.cos(L[1]) * sinE * len, L[3]]);
      });
      g.position.set(x, groundY(x, z), z);
      g.rotation.z = (tilt % 1) * 0.035;
      g.name = 'baum';
      garden.add(g);
      const gyT = groundY(x, z);
      this.leafCluster(x, gyT + h + crownR * 0.24, z, crownR * 1.02, 34);
      tips.forEach(tp => this.leafCluster(x + tp[0] * 0.92, gyT + tp[1] * 0.99, z + tp[2] * 0.92, tp[3] * 1.05, 26));
    };
    const ringSpots = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + Math.random() * 0.12;
      const rad = 16.5 + Math.random() * 7;
      const rx = Math.cos(a) * rad, rz = Math.sin(a) * rad + 2;
      if (Math.abs(rx) < 4.6 && rz > 12) continue;
      if (nearPath(rx, rz, 3.6)) continue;
      ringSpots.push([rx, rz, 3.4 + Math.random() * 2.4, 1.8 + Math.random() * 1.0, Math.random() * 6.28]);
    }
    const ringProf = [];
    for (let i = 0; i <= 6; i++) {
      const tt2 = i / 6;
      ringProf.push(new THREE.Vector2(0.19 * Math.pow(1 - tt2, 0.6) + 0.04, tt2));
    }
    const ringTrunks = new THREE.InstancedMesh(new THREE.LatheGeometry(ringProf, 8), mTrunk, ringSpots.length);
    ringTrunks.castShadow = true; ringTrunks.name = 'randbaum_staemme';
    const branchGeo = new THREE.CylinderGeometry(0.035, 0.08, 1.5, 6);
    branchGeo.translate(0, 0.75, 0);
    const ringBranch = new THREE.InstancedMesh(branchGeo, mTrunk, ringSpots.length);
    ringBranch.castShadow = true; ringBranch.name = 'randbaum_aeste';
    const bq = new THREE.Quaternion(), be2 = new THREE.Euler(0, 0, 0, 'YXZ'), bs = new THREE.Vector3(1, 1, 1);
    ringSpots.forEach((s, i) => {
      dm.position.set(s[0], -0.2, s[1]);
      dm.rotation.set(0, s[4], 0);
      dm.scale.set(1, s[2], 1);
      dm.updateMatrix();
      ringTrunks.setMatrixAt(i, dm.matrix);
      be2.set(0.78, s[4], 0);
      bq.setFromEuler(be2);
      dm.matrix.compose(new THREE.Vector3(s[0], -0.2 + s[2] * 0.66, s[1]), bq, bs);
      ringBranch.setMatrixAt(i, dm.matrix);
      this.leafCluster(s[0], s[2] + s[3] * 0.16, s[1], s[3] * 0.82, 30);
      this.leafCluster(s[0] - s[3] * 0.42, s[2] - s[3] * 0.1, s[1] + s[3] * 0.3, s[3] * 0.58, 18);
      this.leafCluster(s[0] + s[3] * 0.4, s[2] - s[3] * 0.06, s[1] - s[3] * 0.34, s[3] * 0.54, 16);
    });
    ringTrunks.instanceMatrix.needsUpdate = true;
    ringBranch.instanceMatrix.needsUpdate = true;
    garden.add(ringTrunks); garden.add(ringBranch);
    tree(-11.4, 13.2, 3.2, 1.7, 0.4);
    tree(9.6, 10.4, 2.8, 1.6, 1.2);
    tree(-9.2, 0.6, 3.6, 2.1, 2.1);
    tree(8.8, -2.4, 2.4, 1.4, 0.8);
    tree(-2.0, -8.4, 3.0, 1.8, 1.6);

    const pondRim = new THREE.InstancedMesh(this.rock(THREE, 0.3, 0.25, 1), mStoneI, 46);
    pondRim.castShadow = true; pondRim.receiveShadow = true; pondRim.name = 'teichrand';
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 6.28;
      const rr = pond.r * (0.98 + Math.random() * 0.06);
      const x = pond.x + Math.cos(a) * rr, z = pond.z + Math.sin(a) * rr;
      dm.position.set(x, groundY(x, z) + 0.11, z);
      dm.rotation.set((Math.random() - 0.5) * 0.3, -a + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2);
      dm.scale.set(0.85 + Math.random() * 0.35, 0.72, 1.25 + Math.random() * 0.4);
      dm.updateMatrix();
      pondRim.setMatrixAt(i, dm.matrix);
      col.setHSL(0.1 + Math.random() * 0.025, 0.16 + Math.random() * 0.12, 0.56 + Math.random() * 0.16).convertSRGBToLinear();
      pondRim.setColorAt(i, col);
    }
    if (pondRim.instanceColor) pondRim.instanceColor.needsUpdate = true;
    pondRim.instanceMatrix.needsUpdate = true;
    garden.add(pondRim);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(pond.r * 0.96, pond.r * 0.72, 0.7, 34), mWaterD);
    basin.position.set(pond.x, groundY(pond.x, pond.z) - 0.24, pond.z);
    basin.name = 'teichgrund';
    garden.add(basin);

    const wGeo = new THREE.RingGeometry(0.001, pond.r * 0.96, 76, 18);
    wGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wGeo, mWater);
    water.position.set(pond.x, groundY(pond.x, pond.z) + 0.1, pond.z);
    water.name = 'wasserflaeche';
    this.water = water;
    this.wBase = Array.from(wGeo.attributes.position.array);
    garden.add(water);

    const fy = groundY(pond.x, pond.z);
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.44, 26), mStoneW);
    fBase.position.set(pond.x, fy + 0.32, pond.z);
    fBase.castShadow = true; fBase.name = 'brunnen_sockel';
    garden.add(fBase);
    const fCol = new THREE.Mesh(new THREE.LatheGeometry(
      [[0.2, 0], [0.14, 0.2], [0.11, 0.45], [0.14, 0.65], [0.22, 0.78]].map(v => new THREE.Vector2(v[0], v[1])), 24), mStoneD);
    fCol.position.set(pond.x, fy + 0.5, pond.z);
    fCol.castShadow = true; fCol.name = 'brunnen_saeule';
    garden.add(fCol);
    const fBowl = new THREE.Mesh(new THREE.LatheGeometry(
      [[0.12, 0], [0.34, 0.08], [0.58, 0.22], [0.6, 0.3], [0.5, 0.26], [0.24, 0.13], [0.1, 0.07]].map(v => new THREE.Vector2(v[0], v[1])), 32), mStoneW);
    fBowl.position.set(pond.x, fy + 1.24, pond.z);
    fBowl.castShadow = true; fBowl.name = 'brunnen_schale';
    garden.add(fBowl);
    const fWater = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), mWater);
    fWater.position.set(pond.x, fy + 1.44, pond.z);
    fWater.name = 'brunnen_wasser';
    garden.add(fWater);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.1, 0.8, 18, 1, true), mJet);
    jet.position.set(pond.x, fy + 1.88, pond.z);
    jet.name = 'brunnen_strahl';
    this.jet = jet;
    garden.add(jet);
    this.fountainPos = new THREE.Vector3(pond.x, fy, pond.z);

    const ND = window.innerWidth < 760 ? 200 : 420;
    this.dropData = [];
    for (let i = 0; i < ND; i++) this.dropData.push({
      a: Math.random() * 6.28, v: 1.6 + Math.random() * 1.5,
      vr: 0.3 + Math.random() * 0.9, ph: Math.random(), sp: 0.8 + Math.random() * 0.5
    });
    const mDrop = M(0xE6F4FC, 0.05, { metalness: 0.4, transparent: true, opacity: 0.9 });
    mDrop.envMapIntensity = 1.2;
    mDrop.name = 'tropfen';
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.015, 8, 6), mDrop, ND);
    this.drops.name = 'brunnen_tropfen';
    this.dropDummy = new THREE.Object3D();
    garden.add(this.drops);

    this.ripples = [];
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.13, 0.17, 40),
        new THREE.MeshBasicMaterial({ color: 0xE4F5F0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pond.x + (Math.random() - 0.5) * 1.3, fy + 0.115, pond.z + (Math.random() - 0.5) * 1.3);
      ring.userData.off = i / 8;
      ring.name = 'wellenring_' + i;
      garden.add(ring);
      this.ripples.push(ring);
    }

    const lilies = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 9), mLeafB, 26);
    lilies.name = 'seerosenblaetter';
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28, rr = pond.r * (0.55 + Math.random() * 0.32);
      const ls = 0.16 + Math.random() * 0.12;
      dm.position.set(pond.x + Math.cos(a) * rr, fy + 0.115, pond.z + Math.sin(a) * rr);
      dm.rotation.set(-Math.PI / 2, 0, Math.random() * 3);
      dm.scale.set(ls, ls, 1);
      dm.updateMatrix();
      lilies.setMatrixAt(i, dm.matrix);
    }
    lilies.instanceMatrix.needsUpdate = true;
    garden.add(lilies);

    const ty = groundY(terrace.x, terrace.z);
    const terr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.98, 0.12, 0.98), mStoneI, 35);
    terr.receiveShadow = true; terr.castShadow = true; terr.name = 'terrassenplatten';
    let tsi = 0;
    for (let ix = -3; ix <= 3; ix++) for (let iz = -2; iz <= 2; iz++) {
      const px = terrace.x + ix * 1.02, pz = terrace.z + iz * 1.02;
      dm.position.set(px, ty + 0.07, pz);
      dm.rotation.set(0, (Math.random() - 0.5) * 0.014, 0);
      dm.scale.set(1, 1, 1);
      dm.updateMatrix();
      terr.setMatrixAt(tsi, dm.matrix);
      col.setHSL(0.09 + Math.random() * 0.02, 0.03 + Math.random() * 0.03, 0.54 + ((ix + iz) % 2 ? 0.1 : 0.02) + Math.random() * 0.05).convertSRGBToLinear();
      terr.setColorAt(tsi, col);
      tsi++;
    }
    terr.instanceMatrix.needsUpdate = true;
    if (terr.instanceColor) terr.instanceColor.needsUpdate = true;
    garden.add(terr);

    const perg = new THREE.Group();
    [[-2.9, -1.9], [-2.9, 1.9], [2.9, -1.9], [2.9, 1.9]].forEach((p, i) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), mWood);
      post.position.set(p[0], 1.25, p[1]);
      post.castShadow = true; post.name = 'pergola_pfosten_' + i;
      perg.add(post);
    });
    [-1.9, 1.9].forEach((z, i) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 0.14), mWoodD);
      beam.position.set(0, 2.56, z);
      beam.castShadow = true; beam.name = 'pergola_traeger_' + i;
      perg.add(beam);
    });
    for (let i = 0; i < 11; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 4.3), mWood);
      slat.position.set(-2.8 + i * 0.56, 2.7, 0);
      slat.castShadow = true; slat.name = 'pergola_latte_' + i;
      perg.add(slat);
    }
    perg.position.set(terrace.x, ty + 0.13, terrace.z);
    perg.name = 'pergola';
    garden.add(perg);

    const makeBench = () => {
      const b = new THREE.Group();
      const plank = (w, h, d) => {
        const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i);
          p.setZ(i, z * 0.9);
          const y = p.getY(i);
          p.setY(i, y * (Math.abs(z) > d * 0.4 ? 0.82 : 1));
        }
        g.computeVertexNormals();
        return g;
      };
      const seatG = plank(1.94, 0.035, 0.105);
      for (let i = 0; i < 6; i++) {
        const pl = new THREE.Mesh(seatG, mWood);
        pl.position.set(0, 0.45, -0.26 + i * 0.115);
        pl.castShadow = true; pl.receiveShadow = true; pl.name = 'bank_sitzlatte_' + i;
        b.add(pl);
      }
      const backG = plank(1.94, 0.032, 0.1);
      for (let i = 0; i < 4; i++) {
        const bk = new THREE.Mesh(backG, mWood);
        bk.position.set(0, 0.64 + i * 0.135, -0.36 - i * 0.035);
        bk.rotation.x = -0.2;
        bk.castShadow = true; bk.name = 'bank_lehnenlatte_' + i;
        b.add(bk);
      }
      [-0.9, 0.9].forEach((x, i) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.46, 0.06), mWoodD);
        frame.position.set(x, 0.23, -0.22);
        frame.castShadow = true; frame.name = 'bank_rahmen_v_' + i;
        b.add(frame);
        const frame2 = frame.clone();
        frame2.position.set(x, 0.23, 0.26);
        b.add(frame2);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.62), mWoodD);
        foot.position.set(x, 0.022, 0.02);
        foot.castShadow = true; foot.name = 'bank_fuss_' + i;
        b.add(foot);
        const seatRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.6), mWoodD);
        seatRail.position.set(x, 0.42, 0.02);
        seatRail.castShadow = true;
        b.add(seatRail);
        const backPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.055), mWoodD);
        backPost.position.set(x, 0.72, -0.4);
        backPost.rotation.x = -0.2;
        backPost.castShadow = true; backPost.name = 'bank_lehnenpfosten_' + i;
        b.add(backPost);
        const armCurve = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.68, 10), mWood);
        armCurve.rotation.x = Math.PI / 2;
        armCurve.position.set(x, 0.7, -0.08);
        armCurve.castShadow = true; armCurve.name = 'bank_armlehne_' + i;
        b.add(armCurve);
        const armFront = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.26, 9), mWood);
        armFront.position.set(x, 0.58, 0.245);
        armFront.castShadow = true;
        b.add(armFront);
        const armKnob = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), mWood);
        armKnob.position.set(x, 0.71, 0.245);
        armKnob.castShadow = true;
        b.add(armKnob);
      });
      b.name = 'gartenbank';
      return b;
    };
    const bench = makeBench();
    bench.position.set(terrace.x - 0.2, ty + 0.13, terrace.z - 1.5);
    bench.rotation.y = 0.06;
    garden.add(bench);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 22), mWood);
    tableTop.position.set(terrace.x + 0.6, ty + 0.85, terrace.z + 0.6);
    tableTop.castShadow = true; tableTop.name = 'gartentisch';
    garden.add(tableTop);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.78, 12), mMetal);
    tableLeg.position.set(terrace.x + 0.6, ty + 0.52, terrace.z + 0.6);
    tableLeg.castShadow = true; tableLeg.name = 'tischfuss';
    garden.add(tableLeg);

    const insect = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.24), mWoodD);
    box.position.y = 0.4; box.castShadow = true; insect.add(box);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.28, 4), mWood);
    roof.position.y = 0.94; roof.rotation.y = Math.PI / 4; roof.castShadow = true; insect.add(roof);
    const tubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 6), mTrunk, 20);
    tubes.name = 'nistroehren';
    let tui = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      dm.position.set(-0.2 + c * 0.1, 0.16 + r * 0.16, 0.09);
      dm.rotation.set(Math.PI / 2, 0, 0);
      dm.scale.set(1, 1, 1);
      dm.updateMatrix();
      tubes.setMatrixAt(tui++, dm.matrix);
    }
    tubes.instanceMatrix.needsUpdate = true;
    insect.add(tubes);
    const ipost = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.09), mWoodD);
    ipost.position.y = -0.42; insect.add(ipost);
    insect.position.set(5.9, groundY(5.9, 4.6) + 0.42, 4.6);
    insect.rotation.y = -0.7;
    insect.name = 'insektenhotel';
    garden.add(insect);

    const mBoundary = M(0xFFFFFF, 0.88); mBoundary.name = 'mauerstein';
    const wBlocks = [], wCaps = [];
    const COURSES = 8, CH = 0.122;
    const boundaryRun = (x0, z0, x1, z1, gapAt) => {
      const bY = groundY((x0 + x1) / 2, (z0 + z1) / 2);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      const inGap = (px, pz, pad) => gapAt && Math.abs(px - gapAt[0]) < gapAt[1] + pad && Math.abs(pz - gapAt[2]) < 2.2;
      for (let c = 0; c < COURSES; c++) {
        const bw = 0.46;
        const n = Math.ceil(len / bw);
        for (let i = 0; i < n; i++) {
          const fr = (i + (c % 2 ? 0.5 : 0.06)) / n;
          const px = x0 + (x1 - x0) * fr, pz = z0 + (z1 - z0) * fr;
          if (inGap(px, pz, 0)) continue;
          wBlocks.push([px, pz, ang, (len / n) * 0.94, CH * 0.88, 0.34 - c * 0.012, bY + 0.07 + c * CH]);
        }
      }
      const nc = Math.ceil(len / 0.52);
      for (let i = 0; i < nc; i++) {
        const fr = (i + 0.5) / nc;
        const px = x0 + (x1 - x0) * fr, pz = z0 + (z1 - z0) * fr;
        if (inGap(px, pz, 0.2)) continue;
        wCaps.push([px, pz, ang, (len / nc) * 0.97, 0.085, 0.42, bY + 0.07 + COURSES * CH + 0.04]);
      }
    };
    boundaryRun(-12.5, 14.1, 12.5, 14.1, [0, 2.75, 14.1]);
    boundaryRun(-12.5, -9.9, 12.5, -9.9, null);
    boundaryRun(-12.5, -9.9, -12.5, 14.1, null);
    boundaryRun(12.5, -9.9, 12.5, 14.1, null);

    const blockGeo = this.ashlarGeo(THREE);
    const mMortar = M(0xFFFFFF, 0.98); mMortar.name = 'mauerfuge';
    const jMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mMortar, wBlocks.length);
    jMesh.name = 'fugenmoertel';
    const bMesh = new THREE.InstancedMesh(blockGeo, mBoundary, wBlocks.length);
    bMesh.castShadow = true; bMesh.receiveShadow = true; bMesh.name = 'grenzmauer';
    for (let i = 0; i < wBlocks.length; i++) {
      const b = wBlocks[i];
      dm.position.set(b[0], b[6], b[1]);
      dm.rotation.set(0, b[2] + (Math.random() - 0.5) * 0.015, 0);
      dm.scale.set(b[5], b[4], b[3]);
      dm.updateMatrix();
      bMesh.setMatrixAt(i, dm.matrix);
      col.setHSL(0.075 + Math.random() * 0.055, 0.06 + Math.random() * 0.13, 0.6 + Math.random() * 0.24).convertSRGBToLinear();
      bMesh.setColorAt(i, col);
      dm.scale.set(b[5] * 0.97, b[4] * 1.3, b[3] * 1.06);
      dm.updateMatrix();
      jMesh.setMatrixAt(i, dm.matrix);
      col.setHSL(0.09, 0.04 + Math.random() * 0.04, 0.42 + Math.random() * 0.06).convertSRGBToLinear();
      jMesh.setColorAt(i, col);
    }
    bMesh.instanceMatrix.needsUpdate = true;
    if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
    jMesh.instanceMatrix.needsUpdate = true;
    if (jMesh.instanceColor) jMesh.instanceColor.needsUpdate = true;
    garden.add(jMesh);
    garden.add(bMesh);

    const capMesh = new THREE.InstancedMesh(this.ashlarGeo(THREE), mBoundary, wCaps.length);
    capMesh.castShadow = true; capMesh.receiveShadow = true; capMesh.name = 'mauerabdeckung';
    for (let i = 0; i < wCaps.length; i++) {
      const c = wCaps[i];
      dm.position.set(c[0], c[6], c[1]);
      dm.rotation.set(0, c[2] + (Math.random() - 0.5) * 0.02, 0);
      dm.scale.set(c[5], c[4], c[3]);
      dm.updateMatrix();
      capMesh.setMatrixAt(i, dm.matrix);
      col.setHSL(0.085 + Math.random() * 0.04, 0.05 + Math.random() * 0.09, 0.76 + Math.random() * 0.13).convertSRGBToLinear();
      capMesh.setColorAt(i, col);
    }
    capMesh.instanceMatrix.needsUpdate = true;
    if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
    garden.add(capMesh);

    const mPillar = M(0xEFEDE5, 0.82); mPillar.name = 'torpfeiler';
    const mGate = M(0xF6F5F1, 0.35, { metalness: 0.22 }); mGate.envMapIntensity = 0.7; mGate.name = 'torfluegel';
    const gy0 = groundY(0, 14.1);
    this.gateWings = [];
    [[-2.35, 1], [2.35, -1]].forEach((cfg, i) => {
      const px = cfg[0], dir = cfg[1];
      const pil = new THREE.Group();
      const socket = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.62), mPillar);
      socket.position.y = 0.09; socket.castShadow = true; socket.receiveShadow = true;
      pil.add(socket);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.92, 0.46), mPillar);
      shaft.position.y = 1.14; shaft.castShadow = true; shaft.receiveShadow = true;
      pil.add(shaft);
      for (let b = 0; b < 4; b++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.48), mPillar);
        panel.position.y = 0.44 + b * 0.46;
        pil.add(panel);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.66), mPillar);
      cap.position.y = 2.14; cap.castShadow = true;
      pil.add(cap);
      const cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), mPillar);
      cap2.position.y = 2.23; cap2.castShadow = true;
      pil.add(cap2);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), mPillar);
      ball.position.y = 2.42; ball.castShadow = true;
      pil.add(ball);
      pil.position.set(px, gy0, 14.1);
      pil.name = 'torpfeiler_' + i;
      garden.add(pil);

      const wing = new THREE.Group();
      const W = 2.09, H = 1.36, NBar = 10;
      const arc = fr => H * (0.8 + 0.24 * Math.sin(fr * Math.PI * 0.86 + 0.24));
      const barGeo = new THREE.CylinderGeometry(0.021, 0.021, 1, 6);
      const bars = new THREE.InstancedMesh(barGeo, mGate, NBar);
      bars.name = 'torstaebe';
      for (let b = 0; b < NBar; b++) {
        const fr = b / (NBar - 1);
        const hh = arc(fr);
        dm.position.set(fr * W, hh / 2, 0);
        dm.rotation.set(0, 0, 0);
        dm.scale.set(1, hh, 1);
        dm.updateMatrix();
        bars.setMatrixAt(b, dm.matrix);
      }
      bars.instanceMatrix.needsUpdate = true;
      wing.add(bars);
      [0.1, 0.52, 1.0].forEach((hy, k) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.055, 0.05), mGate);
        rail.position.set(W / 2, hy, 0);
        rail.name = 'torriegel_' + k;
        wing.add(rail);
      });
      for (let b = 0; b < 4; b++) {
        const fr0 = b / 4, fr1 = (b + 1) / 4;
        const y0 = arc(fr0), y1 = arc(fr1);
        const seg = Math.hypot((fr1 - fr0) * W, y1 - y0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(seg * 1.06, 0.05, 0.05), mGate);
        top.position.set((fr0 + fr1) / 2 * W, (y0 + y1) / 2, 0);
        top.rotation.z = Math.atan2(y1 - y0, (fr1 - fr0) * W);
        wing.add(top);
      }
      for (let s = 0; s < 3; s++) {
        const sc = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.017, 5, 10, Math.PI * 1.5), mGate);
        sc.position.set(0.34 + s * 0.62, 0.29, 0);
        sc.rotation.z = s % 2 ? 0.6 : -0.6;
        wing.add(sc);
      }
      const kickplate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.16, 0.03), mGate);
      kickplate.position.set(W / 2, 0.08, 0);
      wing.add(kickplate);
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H + 0.12, 8), mGate);
      hinge.position.set(0, (H + 0.12) / 2, 0);
      wing.add(hinge);
      wing.scale.x = dir;
      wing.position.set(px + dir * 0.26, gy0 + 0.06, 14.1);
      wing.rotation.y = 0;
      wing.userData.dir = dir;
      wing.name = 'torfluegel_' + i;
      garden.add(wing);
      this.gateWings.push(wing);
    });

    const shCan = document.createElement('canvas');
    shCan.width = shCan.height = 128;
    const shx = shCan.getContext('2d');
    const shg = shx.createRadialGradient(64, 64, 0, 64, 64, 64);
    shg.addColorStop(0, 'rgba(0,0,0,0.5)');
    shg.addColorStop(0.45, 'rgba(0,0,0,0.3)');
    shg.addColorStop(0.78, 'rgba(0,0,0,0.08)');
    shg.addColorStop(1, 'rgba(0,0,0,0)');
    shx.fillStyle = shg;
    shx.fillRect(0, 0, 128, 128);
    const shTex = new THREE.CanvasTexture(shCan);
    const contacts = solids.filter(s => !s[3]).map(s => [s[0], s[1], s[2] * 1.9])
      .concat([[terrace.x - 0.2, terrace.z - 1.5, 1.5], [terrace.x + 0.6, terrace.z + 0.6, 0.9],
        [pond.x, pond.z, 1.2], [5.9, 4.6, 0.7], [-4.5, 12.7, 0.75], [4.5, 12.7, 0.75]]);
    const shMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.75 }),
      contacts.length
    );
    shMesh.renderOrder = -1;
    shMesh.name = 'kontaktschatten';
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      dm.position.set(c[0], groundY(c[0], c[1]) + 0.028, c[1]);
      dm.rotation.set(-Math.PI / 2, 0, Math.random() * 3);
      dm.scale.set(c[2], c[2] * (0.86 + Math.random() * 0.24), 1);
      dm.updateMatrix();
      shMesh.setMatrixAt(i, dm.matrix);
    }
    shMesh.instanceMatrix.needsUpdate = true;
    garden.add(shMesh);

    const streamPts = [[5.8, 8.2], [4.4, 7.6], [3.0, 6.8], [1.8, 5.8], [0.7, 4.6], [-0.4, 3.2], [-1.41, 2.4], [-2.4, 1.6], [-3.1, 0.4], [-3.5, -0.8]];
    const sCurve = new THREE.CatmullRomCurve3(streamPts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.4);
    const SN = 84;
    const rows = [];
    for (let i = 0; i <= SN; i++) {
      const fr = i / SN;
      const p0 = sCurve.getPointAt(fr), tn = sCurve.getTangentAt(fr);
      const nx = -tn.z, nz = tn.x;
      const w = 0.52 * (0.94 + 0.1 * Math.sin(fr * 5.3) + 0.05 * Math.sin(fr * 13));
      let hi = groundMesh(p0.x, p0.z);
      for (let k = -3; k <= 3; k++) {
        const s = (k / 3) * w * 1.02;
        const h = groundMesh(p0.x + nx * s, p0.z + nz * s);
        if (h > hi) hi = h;
      }
      const yC = hi + 0.145;
      rows.push({ x: p0.x, z: p0.z, nx: nx, nz: nz, w: w, y: yC, fr: fr });
    }
    const ribbon = (widthScale, dropY, mat, nm, flat) => {
      const pos = [], idx = [], uv = [];
      for (let i = 0; i <= SN; i++) {
        const r0 = rows[i];
        const w = r0.w * widthScale;
        const lx = r0.x + r0.nx * w, lz = r0.z + r0.nz * w;
        const rx = r0.x - r0.nx * w, rz = r0.z - r0.nz * w;
        if (flat) {
          pos.push(lx, r0.y + dropY, lz);
          pos.push(rx, r0.y + dropY, rz);
        } else {
          pos.push(lx, groundMesh(lx, lz) + dropY, lz);
          pos.push(rx, groundMesh(rx, rz) + dropY, rz);
        }
        uv.push(0, r0.fr * 8, 1, r0.fr * 8);
      }
      for (let i = 0; i < SN; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat);
      m.name = nm;
      garden.add(m);
      return m;
    };
    const mBed = M(0x4A4438, 0.98); mBed.name = 'bachbett';
    ribbon(1.04, -0.075, mBed, 'bachbett', true).receiveShadow = true;
    this.stream = ribbon(1.0, 0, mWater, 'bachlauf', true);
    this.streamBase = Array.from(this.stream.geometry.attributes.position.array);

    const wfX = 5.8, wfZ = 8.2, wfBase = groundMesh(wfX, wfZ);
    const wfDir = Math.atan2(-(7.6 - wfZ), (4.4 - wfX));
    const wf = new THREE.Group();
    wf.position.set(wfX, wfBase, wfZ);
    wf.rotation.y = wfDir;
    wf.name = 'wasserfall';
    garden.add(wf);

    const wfBlock = this.ashlarGeo(THREE);
    const wfTiers = [[0.0, 0.145, 2.3], [0.32, 0.86, 2.0], [0.62, 1.62, 1.65], [0.9, 2.34, 1.3]];
    wfTiers.forEach((tr, ti) => {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.6, tr[1] + 0.5, tr[2] * 0.94), mStoneD);
      core.position.set(-tr[0] - 0.34, (tr[1] - 0.5) / 2, 0);
      core.receiveShadow = true; core.name = 'wasserfall_kern_' + ti;
      wf.add(core);
      const n = 11 - ti;
      for (let i = 0; i < n; i++) {
        const fr2 = (i / (n - 1) - 0.5) * 1.06;
        const bl = new THREE.Mesh(wfBlock, mStone);
        bl.position.set(-tr[0] - Math.abs(fr2) * 0.26, tr[1] - 0.14, fr2 * tr[2]);
        bl.rotation.y = fr2 * 0.5 + (Math.random() - 0.5) * 0.1;
        bl.scale.set(0.78 * (0.94 + Math.random() * 0.2), 0.5, 0.62 * (0.97 + Math.random() * 0.2));
        bl.castShadow = true; bl.receiveShadow = true;
        bl.name = 'wasserfall_stein_' + ti + '_' + i;
        wf.add(bl);
      }
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, tr[2] * 0.82), mStoneW);
      lip.position.set(-tr[0] + 0.15, tr[1] + 0.08, 0);
      lip.receiveShadow = true; lip.name = 'wasserfall_kante_' + ti;
      wf.add(lip);
    });

    for (let i = 0; i < 38; i++) {
      const b = new THREE.Mesh(this.rock(THREE, 0.16 + Math.random() * 0.22, 0.3, 1), mStone);
      const side = Math.random() < 0.5 ? -1 : 1;
      const r2 = 0.95 + Math.random() * 0.65;
      b.position.set(-0.2 - Math.random() * 0.95, 0.1 + Math.random() * 2.0, side * r2);
      b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      b.castShadow = true; b.name = 'wasserfall_geroell_' + i;
      wf.add(b);
    }

    this.falls = [];
    const mFall = M(0xBFE6F5, 0.02, { metalness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    mFall.envMapIntensity = 0.8; mFall.name = 'fallwasser';
    this.mFall = mFall;
    wfTiers.forEach((tr, ti) => {
      if (ti === 0) return;
      const prev = wfTiers[ti - 1];
      const h = tr[1] - prev[1] + 0.08;
      const wIn = tr[2] * 0.72;
      const seg = 8, pos = [], idx = [], uv = [];
      for (let r = 0; r <= seg; r++) {
        const v = r / seg;
        const bulge = 1 + v * 0.42;
        const sag = -v * v * 0.14;
        pos.push(sag, -v * h, -wIn * 0.5 * bulge);
        pos.push(sag, -v * h, wIn * 0.5 * bulge);
        uv.push(0, v * 3, 1, v * 3);
      }
      for (let r = 0; r < seg; r++) { const a = r * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const gF = new THREE.BufferGeometry();
      gF.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gF.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      gF.setIndex(idx);
      gF.computeVertexNormals();
      const fall = new THREE.Mesh(gF, mFall);
      fall.position.set(-tr[0] + 0.58, tr[1] + 0.1, 0);
      fall.name = 'wasserfall_schleier_' + ti;
      fall.userData = { base: Array.from(pos), ph: ti * 1.4, h: h };
      wf.add(fall);
      this.falls.push(fall);

      const pr = Math.min(wIn * 0.72, 0.34);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(pr, 22), mWater);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-prev[0] - 0.02, prev[1] + 0.11, 0);
      pool.name = 'wasserfall_becken_' + ti;
      wf.add(pool);
    });

    const FD = window.innerWidth < 760 ? 130 : 300;
    this.fallDrops = [];
    for (let i = 0; i < FD; i++) {
      const ti = 1 + Math.floor(Math.random() * (wfTiers.length - 1));
      this.fallDrops.push({ ti: ti, z: (Math.random() - 0.5) * wfTiers[ti][2] * 0.62, ph: Math.random(), sp: 0.8 + Math.random() * 0.7, out: Math.random() });
    }
    const fdg = new THREE.BufferGeometry();
    fdg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FD * 3), 3));
    this.fallSpray = new THREE.Points(fdg, new THREE.PointsMaterial({ color: 0xF2FBFE, size: 0.038, transparent: true, opacity: 0.72, depthWrite: false }));
    this.fallSpray.name = 'wasserfall_spruehnebel';
    this.fallTiers = wfTiers;
    wf.add(this.fallSpray);

    this.fallMist = [];
    for (let i = 0; i < 9; i++) {
      const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.16, 8, 7), new THREE.MeshBasicMaterial({ color: 0xF4FBFD, transparent: true, opacity: 0, depthWrite: false }));
      m2.position.set(0.35 + Math.random() * 0.5, 0.3, (Math.random() - 0.5) * 1.5);
      m2.userData = { ph: Math.random(), y0: 0.28 + Math.random() * 0.3, x0: m2.position.x };
      m2.name = 'wasserfall_dunst_' + i;
      wf.add(m2);
      this.fallMist.push(m2);
    }

    const bankStones = new THREE.InstancedMesh(this.rock(THREE, 0.2, 0.3, 1), mStoneI, 210);
    bankStones.castShadow = true; bankStones.receiveShadow = true; bankStones.name = 'bachsteine';
    let bsi = 0;
    for (let i = 0; i <= SN && bsi < 210; i++) {
      const fr = i / SN;
      const p0 = sCurve.getPointAt(fr), tn = sCurve.getTangentAt(fr);
      const nx = -tn.z, nz = tn.x;
      for (let s = -1; s <= 1; s += 2) {
        if (bsi >= 210) break;
        const off = s * (0.72 + Math.random() * 0.34);
        const sx = p0.x + nx * off, sz = p0.z + nz * off;
        if ((sx + 1.41) * (sx + 1.41) + (sz - 2.4) * (sz - 2.4) < 2.56) continue;
        dm.position.set(sx, groundMesh(sx, sz) + 0.05, sz);
        dm.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        dm.scale.setScalar(0.7 + Math.random() * 0.95);
        dm.updateMatrix();
        bankStones.setMatrixAt(bsi, dm.matrix);
        col.setHSL(0.085 + Math.random() * 0.04, 0.05 + Math.random() * 0.1, 0.62 + Math.random() * 0.2).convertSRGBToLinear();
        bankStones.setColorAt(bsi, col);
        bsi++;
      }
    }
    bankStones.count = bsi;
    bankStones.instanceMatrix.needsUpdate = true;
    if (bankStones.instanceColor) bankStones.instanceColor.needsUpdate = true;
    garden.add(bankStones);

    const bx0 = -1.41, bz0 = 2.4, bAng = Math.atan2(2.0, 1.6);
    const steg = new THREE.Group();
    const plankGeo = new THREE.BoxGeometry(0.185, 0.055, 1.4);
    const planks = new THREE.InstancedMesh(plankGeo, mWood, 14);
    planks.castShadow = true; planks.receiveShadow = true; planks.name = 'stegbretter';
    for (let i = 0; i < 14; i++) {
      dm.position.set(-1.235 + i * 0.19, 0.2, 0);
      dm.rotation.set(0, 0, 0);
      dm.scale.set(1, 1, 1);
      dm.updateMatrix();
      planks.setMatrixAt(i, dm.matrix);
    }
    planks.instanceMatrix.needsUpdate = true;
    steg.add(planks);
    [-0.55, 0.55].forEach((zz, i) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.11, 0.13), mWoodD);
      beam.position.set(0, 0.12, zz);
      beam.castShadow = true; beam.name = 'stegtraeger_' + i;
      steg.add(beam);
    });
    const railPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.72, 0.075), mWoodD, 6);
    railPosts.castShadow = true; railPosts.name = 'stegpfosten';
    let rpi = 0;
    [-1.14, 0, 1.14].forEach(xx => {
      [-0.66, 0.66].forEach(zz => {
        dm.position.set(xx, 0.63, zz);
        dm.rotation.set(0, 0, 0);
        dm.scale.set(1, 1, 1);
        dm.updateMatrix();
        railPosts.setMatrixAt(rpi++, dm.matrix);
      });
    });
    railPosts.instanceMatrix.needsUpdate = true;
    steg.add(railPosts);
    [-0.66, 0.66].forEach((zz, i) => {
      const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.7, 8), mWood);
      hand.rotation.z = Math.PI / 2;
      hand.position.set(0, 0.88, zz);
      hand.castShadow = true; hand.name = 'handlauf_' + i;
      steg.add(hand);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.045), mWood);
      mid.position.set(0, 0.57, zz);
      mid.castShadow = true;
      steg.add(mid);
    });
    steg.position.set(bx0, groundY(bx0, bz0), bz0);
    steg.rotation.y = bAng;
    steg.name = 'steg';
    garden.add(steg);

    const mStatue = M(0xD8D6CE, 0.86); mStatue.name = 'statue';
    [[-1.8, 16.4, 1], [2.5, 16.4, -1]].forEach((s, i) => {
      const st = new THREE.Group();
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), mStatue);
      plinth.position.y = 0.06; plinth.castShadow = true; plinth.receiveShadow = true;
      st.add(plinth);
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.88, 0.56), mStatue);
      ped.position.y = 0.56; ped.castShadow = true; ped.receiveShadow = true; ped.name = 'sockel_' + i;
      st.add(ped);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.6), mStatue);
      panel.position.y = 0.56; panel.castShadow = true;
      st.add(panel);
      const abac = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.68), mStatue);
      abac.position.y = 1.05; abac.castShadow = true;
      st.add(abac);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.56), mStatue);
      slab.position.y = 1.13; slab.castShadow = true;
      st.add(slab);
      const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), mStatue);
      haunch.scale.set(1, 1.15, 1.05);
      haunch.position.set(0, 1.34, -0.07); haunch.castShadow = true; haunch.name = 'loewe_hinterteil_' + i;
      st.add(haunch);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mStatue);
      chest.scale.set(0.95, 1.5, 0.9);
      chest.position.set(0, 1.52, 0.09); chest.castShadow = true; chest.name = 'loewe_brust_' + i;
      st.add(chest);
      [-0.09, 0.09].forEach(xx => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 8), mStatue);
        leg.position.set(xx, 1.33, 0.17); leg.castShadow = true;
        st.add(leg);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.062, 9, 7), mStatue);
        paw.scale.set(1, 0.7, 1.35);
        paw.position.set(xx, 1.19, 0.23); paw.castShadow = true;
        st.add(paw);
      });
      const mane = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 12), mStatue);
      mane.scale.set(1.05, 1.1, 0.85);
      mane.position.set(0, 1.86, 0.05); mane.castShadow = true; mane.name = 'loewe_maehne_' + i;
      st.add(mane);
      for (let k = 0; k < 9; k++) {
        const a2 = (k / 9) * Math.PI * 2;
        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.062, 7, 6), mStatue);
        lock.position.set(Math.cos(a2) * 0.16, 1.86 + Math.sin(a2) * 0.16, 0.02);
        lock.scale.set(1, 1, 0.7);
        lock.castShadow = true;
        st.add(lock);
      }
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mStatue);
      muzzle.scale.set(1, 0.85, 1.1);
      muzzle.position.set(0, 1.83, 0.19); muzzle.castShadow = true; muzzle.name = 'loewe_schnauze_' + i;
      st.add(muzzle);
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 6, 14, Math.PI * 1.2), mStatue);
      tail.position.set(s[2] * 0.16, 1.36, -0.16);
      tail.rotation.set(0.5, 0, 0.6 * s[2]);
      tail.castShadow = true;
      st.add(tail);
      st.position.set(s[0], groundY(s[0], s[1]), s[1]);
      st.rotation.y = s[2] * 0.22 + Math.PI;
      st.name = 'loewenstatue_' + i;
      garden.add(st);
    });

    this.lamps = [];
    [[-2.4, 11.0], [-3.5, 6.4], [0.9, 2.0], [3.6, -2.0], [1.0, -5.2]].forEach((p, i) => {
      const gy = groundY(p[0], p[1]);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.94, 12), mMetal);
      mast.position.set(p[0], gy + 0.47, p[1]);
      mast.castShadow = true; mast.name = 'leuchte_mast_' + i;
      garden.add(mast);
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 16), mMetal);
      hood.position.set(p[0], gy + 1.08, p[1]);
      hood.castShadow = true; hood.name = 'leuchte_schirm_' + i;
      garden.add(hood);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), mLamp);
      bulb.position.set(p[0], gy + 0.97, p[1]);
      bulb.name = 'leuchte_kopf_' + i;
      garden.add(bulb);
      this.lamps.push(bulb);
    });

    [[-4.5, 12.7], [4.5, 12.7]].forEach((p, i) => {
      const gy = groundY(p[0], p[1]);
      const pot = new THREE.Mesh(new THREE.LatheGeometry(
        [[0.17, 0], [0.2, 0.03], [0.245, 0.13], [0.295, 0.3], [0.325, 0.44], [0.345, 0.5], [0.355, 0.54], [0.335, 0.53], [0.315, 0.45], [0.27, 0.28], [0.215, 0.1], [0.15, 0.02]].map(v => new THREE.Vector2(v[0], v[1])), 34), mPot);
      pot.position.set(p[0], gy, p[1]);
      pot.castShadow = true; pot.receiveShadow = true; pot.name = 'kuebel_' + i;
      garden.add(pot);
      this.leafCluster(p[0], gy + 0.8, p[1], 0.46, 24);
    });

    const mFeather = M(0xEFEAE0, 0.86); mFeather.name = 'gefieder';
    const mFeatherD = M(0x6B5B44, 0.88); mFeatherD.name = 'gefieder_dunkel';
    const mBeak = M(0xE0A93E, 0.6); mBeak.name = 'schnabel';
    const mEye = M(0x141210, 0.4); mEye.name = 'auge';
    this.ducks = [];
    [[0, 0x00, 0.5], [1, 0x01, 0.42]].forEach((cfg, i) => {
      const d = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), i ? mFeatherD : mFeather);
      body.scale.set(1.5, 0.86, 1);
      body.position.y = 0.09;
      body.castShadow = true; body.name = 'entenkoerper_' + i;
      d.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.19, 8), i ? mFeatherD : mFeather);
      tail.rotation.z = -1.15;
      tail.position.set(0.27, 0.15, 0);
      tail.castShadow = true; d.add(tail);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.19, 10), i ? mFeatherD : mFeather);
      neck.position.set(-0.15, 0.19, 0);
      neck.rotation.z = 0.24;
      neck.castShadow = true; d.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.077, 14, 12), i ? mFeatherD : mFeather);
      head.position.set(-0.19, 0.3, 0);
      head.castShadow = true; head.name = 'entenkopf_' + i;
      d.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.1, 8), mBeak);
      beak.rotation.z = 1.62;
      beak.position.set(-0.27, 0.29, 0);
      d.add(beak);
      [-0.045, 0.045].forEach(zz => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mEye);
        eye.position.set(-0.225, 0.325, zz);
        d.add(eye);
      });
      const wake = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.14, 26),
        new THREE.MeshBasicMaterial({ color: 0xDCEEF4, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
      );
      wake.rotation.x = -Math.PI / 2;
      wake.name = 'kielwelle_' + i;
      garden.add(wake);
      d.userData = { ph: i * 2.6, sp: 0.16 + i * 0.05, rad: 1.5 + i * 0.55, head: head, wake: wake };
      d.name = 'ente_' + i;
      garden.add(d);
      this.ducks.push(d);
    });

    const mPot2 = M(0xF2EEE6, 0.42); mPot2.name = 'kanne';
    const mPotLid = M(0xCBB48E, 0.5); mPotLid.name = 'kannendeckel';
    const tx = terrace.x + 0.6, tz = terrace.z + 0.6, tty = ty + 0.885;
    const pot = new THREE.Mesh(new THREE.LatheGeometry(
      [[0.02, 0], [0.075, 0.005], [0.098, 0.035], [0.105, 0.075], [0.088, 0.115], [0.062, 0.132], [0.06, 0.138], [0.056, 0.135], [0.08, 0.112], [0.096, 0.072], [0.09, 0.032], [0.06, 0.004]].map(v => new THREE.Vector2(v[0], v[1])), 24), mPot2);
    pot.position.set(tx, tty, tz);
    pot.castShadow = true; pot.name = 'teekanne';
    garden.add(pot);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), mPotLid);
    lid.scale.set(1, 0.6, 1);
    lid.position.set(tx, tty + 0.144, tz);
    lid.castShadow = true; lid.name = 'kannendeckel';
    garden.add(lid);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.019, 0.14, 8), mPot2);
    spout.position.set(tx + 0.105, tty + 0.095, tz);
    spout.rotation.z = -0.72;
    spout.castShadow = true; spout.name = 'kannenausguss';
    garden.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 6, 16, Math.PI * 1.25), mPotLid);
    handle.position.set(tx - 0.1, tty + 0.078, tz);
    handle.rotation.set(Math.PI / 2, 0, -0.4);
    handle.castShadow = true; handle.name = 'kannengriff';
    garden.add(handle);
    [[0.2, 0.1], [0.16, -0.16]].forEach((c, i) => {
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.008, 18), mPot2);
      saucer.position.set(tx + c[0], tty + 0.004, tz + c[1]);
      saucer.castShadow = true; saucer.name = 'untertasse_' + i;
      garden.add(saucer);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.052, 16, 1, true), mPot2);
      cup.position.set(tx + c[0], tty + 0.034, tz + c[1]);
      cup.castShadow = true; cup.name = 'tasse_' + i;
      garden.add(cup);
      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 16), M(0x8A5A2C, 0.2, { metalness: 0.3 }));
      tea.position.set(tx + c[0], tty + 0.052, tz + c[1]);
      tea.name = 'tee_' + i;
      garden.add(tea);
    });
    const mSteam = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.16, depthWrite: false, fog: false });
    this.steam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), mSteam, 18);
    this.steam.name = 'teedampf';
    this.steamDummy = new THREE.Object3D();
    this.steamOrigin = new THREE.Vector3(tx, tty + 0.15, tz);
    garden.add(this.steam);

    this.butterflies = [];
    const wingGeo = this.leafCardGeo(THREE);
    const wingMats = [M(0xFAF4E2, 0.5, { side: THREE.DoubleSide }), M(0xEFC061, 0.5, { side: THREE.DoubleSide }), M(0xD9A0B2, 0.5, { side: THREE.DoubleSide })];
    const mBody = M(0x3A3226, 0.7);
    for (let i = 0; i < 6; i++) {
      const bf = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.055, 6), mBody);
      body.rotation.x = Math.PI / 2;
      bf.add(body);
      const mk = wingMats[i % 3];
      const wl = new THREE.Group(), wr = new THREE.Group();
      [[0.9, 0.02], [0.62, -0.026]].forEach(s => {
        const a = new THREE.Mesh(wingGeo, mk);
        a.scale.setScalar(s[0] * 1.5);
        a.rotation.z = Math.PI / 2;
        a.position.set(0, 0, s[1]);
        wl.add(a);
        const b = new THREE.Mesh(wingGeo, mk);
        b.scale.setScalar(s[0] * 1.5);
        b.rotation.z = -Math.PI / 2;
        b.position.set(0, 0, s[1]);
        wr.add(b);
      });
      bf.add(wl); bf.add(wr);
      const anc = beds[i % beds.length];
      bf.userData = { wl: wl, wr: wr, ph: i * 1.7, sp: 0.34 + i * 0.07, ax: anc.x, az: anc.z, r: 1.1 + Math.random() * 1.3 };
      bf.name = 'schmetterling_' + i;
      garden.add(bf);
      this.butterflies.push(bf);
    }

    const NP = window.innerWidth < 760 ? 180 : 420;
    const ppos = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) {
      ppos[i * 3] = (Math.random() - 0.5) * 22;
      ppos[i * 3 + 1] = 0.4 + Math.random() * 3.4;
      ppos[i * 3 + 2] = (Math.random() - 0.5) * 26 - 2;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
    this.pollen = new THREE.Points(pgeo, new THREE.PointsMaterial({
      color: 0xFFF8DC, size: 0.028, transparent: true, opacity: 0.3, depthWrite: false
    }));
    this.pollen.name = 'pollen';
    garden.add(this.pollen);

    this.buildFoliage(THREE, garden, mLeaf);
    this.buildLeaves(THREE, garden, mLeafCard);

    const skyCan = document.createElement('canvas');
    skyCan.width = 1024; skyCan.height = 512;
    const sctx = skyCan.getContext('2d');
    const sgrad = sctx.createLinearGradient(0, 0, 0, 512);
    sgrad.addColorStop(0.00, '#12559C');
    sgrad.addColorStop(0.30, '#1B63AC');
    sgrad.addColorStop(0.385, '#2A76BE');
    sgrad.addColorStop(0.415, '#4390CE');
    sgrad.addColorStop(0.442, '#6DACDC');
    sgrad.addColorStop(0.466, '#98C5E4');
    sgrad.addColorStop(0.488, '#BCD8E9');
    sgrad.addColorStop(0.50, '#D6E4EA');
    sgrad.addColorStop(0.56, '#DDE8EB');
    sgrad.addColorStop(1.00, '#DFE9EC');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 1024, 512);
    const puff = (cx, cy, r, alpha) => {
      const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
      g.addColorStop(0.55, 'rgba(255,255,255,' + (alpha * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      sctx.fillStyle = g;
      sctx.beginPath();
      sctx.ellipse(cx, cy, r, r * 0.62, 0, 0, 6.2832);
      sctx.fill();
    };
    const shade = (cx, cy, r, alpha) => {
      const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(176,196,214,' + alpha + ')');
      g.addColorStop(1, 'rgba(176,196,214,0)');
      sctx.fillStyle = g;
      sctx.beginPath();
      sctx.ellipse(cx, cy, r, r * 0.5, 0, 0, 6.2832);
      sctx.fill();
    };
    for (let c = 0; c < 9; c++) {
      const cx = 46 + (c / 9) * 1024 + (Math.random() - 0.5) * 34;
      const cy = 202 + Math.random() * 42;
      const scale = 0.34 + Math.random() * 0.3;
      for (let k = 0; k < 4; k++) {
        shade(cx + (Math.random() - 0.5) * 52 * scale, cy + 9 * scale + (Math.random() - 0.5) * 8 * scale, (14 + Math.random() * 18) * scale, 0.24);
      }
      for (let k = 0; k < 6; k++) {
        puff(cx + (Math.random() - 0.5) * 60 * scale, cy - 3 * scale + (Math.random() - 0.5) * 14 * scale, (12 + Math.random() * 22) * scale, 0.4 + Math.random() * 0.2);
      }
    }
    for (let c = 0; c < 6; c++) puff(Math.random() * 1024, 184 + Math.random() * 22, 22 + Math.random() * 26, 0.11);
    const skyTex = new THREE.CanvasTexture(skyCan);
    skyTex.encoding = THREE.sRGBEncoding;
    skyTex.wrapS = THREE.RepeatWrapping;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(620, 48, 32),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    sky.name = 'himmel';
    scene.add(sky);

    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), M(0x74905E, 0.98));
    beyond.rotation.x = -Math.PI / 2;
    beyond.position.y = -0.28;
    beyond.name = 'umland';
    scene.add(beyond);

    const ridge = (rad, baseH, peakH, segs, low, high, snowAt, haze, freqA, freqB, name) => {
      const pos = [], cols = [], idx = [];
      const cLow = new THREE.Color(low), cHigh = new THREE.Color(high);
      const cSnow = new THREE.Color(0xF4F8FC), cHaze = new THREE.Color(haze);
      const tmp = new THREE.Color();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const n1 = this.noise(ca * freqA, 0.7, sa * freqA) * 0.5 + 0.5;
        const n2 = this.noise(ca * freqB, 1.9, sa * freqB) * 0.5 + 0.5;
        const n3 = this.noise(ca * freqB * 2.7, 3.3, sa * freqB * 2.7) * 0.5 + 0.5;
        const k = Math.max(0, Math.min(1, n1 * 0.58 + n2 * 0.3 + n3 * 0.12));
        const h = baseH + (peakH - baseH) * Math.pow(k, 1.25);
        const rr = rad * (0.94 + n2 * 0.12);
        pos.push(ca * rr, -6, sa * rr);
        tmp.copy(cHaze);
        cols.push(tmp.r, tmp.g, tmp.b);
        pos.push(ca * rr, h, sa * rr);
        const hn = (h - baseH) / Math.max(0.001, peakH - baseH);
        tmp.copy(cLow).lerp(cHigh, Math.pow(hn, 0.8));
        if (snowAt > 0 && hn > snowAt) tmp.lerp(cSnow, Math.min(1, (hn - snowAt) / (1 - snowAt) * 1.5));
        tmp.lerp(cHaze, 0.14);
        cols.push(tmp.r, tmp.g, tmp.b);
      }
      for (let i = 0; i < segs; i++) {
        const a0 = i * 2;
        idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const cf = new Float32Array(cols.length);
      for (let i = 0; i < cols.length; i += 3) {
        tmp.setRGB(cols[i], cols[i + 1], cols[i + 2]).convertSRGBToLinear();
        cf[i] = tmp.r; cf[i + 1] = tmp.g; cf[i + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cf, 3));
      g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, depthWrite: true }));
      m.name = name;
      scene.add(m);
      return m;
    };
    ridge(520, 26, 95, 200, 0x54697F, 0x8E9FAF, 0.56, 0xC4D8E8, 2.1, 5.6, 'hochgebirge');
    ridge(360, 16, 57, 180, 0x4A665E, 0x76909C, 0.8, 0xC7D9E2, 3.3, 7.9, 'mittelgebirge');
    ridge(210, 7, 25, 160, 0x2C4E33, 0x557B4E, 0, 0xB4CCBE, 4.7, 11.3, 'huegelkette');
    ridge(104, 5.5, 16, 150, 0x1D3D1C, 0x426C34, 0, 0xA4BFA8, 6.2, 14.1, 'waldrand');
    ridge(150, 4.5, 13, 150, 0x24491F, 0x4B763B, 0, 0xAEC6B0, 8.4, 17.2, 'waldrand_zwei');

    const fdm = new THREE.Object3D(), fcol = new THREE.Color();
    const coniferProf = [[0.46, 0], [0.3, 0.1], [0.44, 0.14], [0.26, 0.32], [0.38, 0.36],
      [0.21, 0.54], [0.3, 0.58], [0.15, 0.74], [0.21, 0.78], [0.08, 0.9], [0.11, 0.93], [0, 1]];
    const decidProf = [[0.04, 0], [0.05, 0.2], [0.15, 0.28], [0.28, 0.42], [0.33, 0.58],
      [0.3, 0.74], [0.21, 0.88], [0.1, 0.97], [0, 1]];
    const lathe = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 6);
    const mFar = M(0xFFFFFF, 0.96);
    mFar.name = 'ferne_vegetation';

    const band = (geo, count, name, rMin, rMax, hMin, hMax, wMin, wMax, hueLo, hueHi, litLo, litHi) => {
      const im = new THREE.InstancedMesh(geo, mFar, count);
      im.name = name;
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 30) {
        tries++;
        const a = Math.random() * Math.PI * 2;
        const rad = rMin + Math.random() * (rMax - rMin);
        const bx = Math.cos(a) * rad, bz = Math.sin(a) * rad;
        if (bx > -13.4 && bx < 13.4 && bz > -10.8 && bz < 15.2) continue;
        if (nearPath(bx, bz, 7.2)) continue;
        const i = placed;
        const hh = hMin + Math.random() * (hMax - hMin);
        const ww = (wMin + Math.random() * (wMax - wMin)) * hh;
        fdm.position.set(bx, -0.25, bz);
        fdm.rotation.set(0, Math.random() * 6.283, (Math.random() - 0.5) * 0.07);
        fdm.scale.set(ww, hh, ww);
        fdm.updateMatrix();
        im.setMatrixAt(i, fdm.matrix);
        fcol.setHSL(hueLo + Math.random() * (hueHi - hueLo), 0.24 + Math.random() * 0.2, litLo + Math.random() * (litHi - litLo)).convertSRGBToLinear();
        im.setColorAt(i, fcol);
        placed++;
      }
      im.count = placed;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      scene.add(im);
      return im;
    };

    const gCon = lathe(coniferProf), gDec = lathe(decidProf);
    band(gCon, 300, 'fichten_fern', 60, 150, 9, 22, 0.34, 0.5, 0.3, 0.35, 0.15, 0.22);
    band(gDec, 150, 'laubbaeume_fern', 62, 150, 7, 15, 0.62, 0.9, 0.3, 0.352, 0.18, 0.26);
    band(gCon, 260, 'fichten_mittel', 30, 62, 7, 17, 0.32, 0.48, 0.3, 0.35, 0.19, 0.27);
    band(gDec, 210, 'laubbaeume_mittel', 28, 62, 6, 12, 0.66, 0.95, 0.3, 0.352, 0.23, 0.32);
    band(gCon, 90, 'fichten_nah', 24, 34, 5.5, 11, 0.34, 0.5, 0.3, 0.36, 0.18, 0.27);
    band(gDec, 520, 'unterholz', 18, 78, 1.2, 3.4, 1.1, 1.7, 0.27, 0.35, 0.19, 0.3);

    const mBirdBody = M(0x38403C, 0.72); mBirdBody.name = 'vogel';
    const mBirdWing = M(0x2F3733, 0.72, { side: THREE.DoubleSide }); mBirdWing.name = 'vogelfluegel';
    const mBirdBelly = M(0xC9CFC8, 0.7); mBirdBelly.name = 'vogel_bauch';
    const wingShape = new THREE.BufferGeometry();
    wingShape.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.05, 0, 0, -0.13, 0.03, 0.24, -0.03, 0.045, 0.58,
      0.09, 0.02, 0.34, 0.07, 0, 0
    ], 3));
    wingShape.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
    wingShape.computeVertexNormals();
    const tailShape = new THREE.BufferGeometry();
    tailShape.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, -0.2, 0.005, -0.075, -0.14, 0, 0, -0.2, 0.005, 0.075
    ], 3));
    tailShape.setIndex([0, 1, 2, 0, 2, 3]);
    tailShape.computeVertexNormals();
    this.birds = [];
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mBirdBody);
      body.scale.set(2.7, 0.92, 0.92);
      b.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 9, 7), mBirdBody);
      head.position.set(0.185, 0.022, 0);
      b.add(head);
      const tail = new THREE.Mesh(tailShape, mBirdWing);
      tail.position.set(-0.185, 0.006, 0);
      b.add(tail);
      const wl = new THREE.Group(), wr = new THREE.Group();
      const inner = new THREE.Mesh(wingShape, mBirdWing);
      const innerR = new THREE.Mesh(wingShape, mBirdWing);
      innerR.scale.z = -1;
      wl.add(inner); wr.add(innerR);
      wl.position.set(0.02, 0.03, 0.045);
      wr.position.set(0.02, 0.03, -0.045);
      b.add(wl); b.add(wr);
      b.userData = { wl: wl, wr: wr, ph: (i / 7) * Math.PI * 2, sp: 0.15 + (i % 3) * 0.03, rad: 15.5 + (i % 4) * 2.8, y: 4.7 + (i % 5) * 0.44, fl: 5.4 + Math.random() * 2.6 };
      b.name = 'vogel_' + i;
      scene.add(b);
      this.birds.push(b);
    }

    const mBee = M(0xE8B33C, 0.6); mBee.name = 'biene';
    const mBeeDark = M(0x2A2318, 0.6); mBeeDark.name = 'biene_dunkel';
    const mBeeWing = M(0xF2F6F8, 0.2, { side: THREE.DoubleSide, transparent: true, opacity: 0.42 }); mBeeWing.name = 'bienenfluegel';
    this.bees = [];
    for (let i = 0; i < 16; i++) {
      const bee = new THREE.Group();
      const bd = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), mBee);
      bd.scale.set(2.1, 1, 1);
      bee.add(bd);
      const anc = beds[i % beds.length];
      bee.userData = { ph: Math.random() * 6.283, sp: 1.1 + Math.random() * 0.9, ax: anc.x, az: anc.z, r: 0.5 + Math.random() * 1.5, h: 0.28 + Math.random() * 0.4 };
      bee.name = 'biene_' + i;
      garden.add(bee);
      this.bees.push(bee);
    }

    const discCan = document.createElement('canvas');
    discCan.width = discCan.height = 256;
    const dctx = discCan.getContext('2d');
    const dgr = dctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    dgr.addColorStop(0.00, 'rgba(255,252,238,1)');
    dgr.addColorStop(0.16, 'rgba(255,246,214,0.92)');
    dgr.addColorStop(0.36, 'rgba(255,232,178,0.34)');
    dgr.addColorStop(0.68, 'rgba(255,224,164,0.09)');
    dgr.addColorStop(1.00, 'rgba(255,220,160,0)');
    dctx.fillStyle = dgr;
    dctx.fillRect(0, 0, 256, 256);
    const discTex = new THREE.CanvasTexture(discCan);
    discTex.encoding = THREE.sRGBEncoding;
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: discTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, transparent: true
    }));
    this.sunSprite.scale.set(96, 96, 1);
    this.sunSprite.name = 'sonne';
    scene.add(this.sunSprite);
    this.sunDir = new THREE.Vector3();
    this.camFwd = new THREE.Vector3();

    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 18, 14), new THREE.MeshBasicMaterial({ color: 0xDCEAE2, side: THREE.BackSide })));
    const eg = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color: 0x7E9A6C }));
    eg.rotation.x = -Math.PI / 2; eg.position.y = -1;
    env.add(eg);
    const es = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 12), new THREE.MeshBasicMaterial({ color: 0xFFF6E2 }));
    es.position.set(-18, 24, 14);
    env.add(es);
    const pm = new THREE.PMREMGenerator(renderer);
    pm.compileEquirectangularShader();
    this.envRT = pm.fromScene(env, 0.03);
    scene.environment = this.envRT.texture;
    pm.dispose();

    this.hemi = new THREE.HemisphereLight(0xCFE0CA, 0x53442E, 0.34);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xFFF0CE, 1.25);
    this.sun.position.set(-10, 15, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 1.8;
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.018;
    const sc = this.sun.shadow.camera;
    sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40;
    sc.updateProjectionMatrix();
    scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xBFD6CB, 0.2);
    this.fill.position.set(9, 7, -8);
    scene.add(this.fill);

    this.focus = [
      new THREE.Vector3(-1.2, 1.5, 9.5),
      new THREE.Vector3(-2.5, 1.2, 4.6),
      new THREE.Vector3(-6.9, 1.0, 8.7),
      new THREE.Vector3(5.2, 1.4, 6.8),
      new THREE.Vector3(pond.x, 1.45, pond.z),
      new THREE.Vector3(terrace.x, 1.5, terrace.z),
      new THREE.Vector3(-1.0, 1.75, 7.0)
    ];
    this.focusMix = [0.5, 0.55, 0.62, 0.62, 0.6, 0.55, 0.94];
    this.applyLight();
    this.ready = true;
    this.alive = true;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  applyLight() {
    const mode = this.props.timeOfDay || 'Mittag';
    const cfg = {
      'Morgen': { sun: 0xFFE7BE, si: 1.05, hemi: 0xD4E2D6, hi: 0.4, fog: 0xE4EAE2, sp: [-14, 9, 12], lamp: 0.25, exp: 0.92, sky: 0xF6E8D4 },
      'Mittag': { sun: 0xFFF6DC, si: 1.35, hemi: 0xCFE0CA, hi: 0.36, fog: 0xD3E3EC, sp: [-10, 15, 9], lamp: 0.35, exp: 0.98, sky: 0xFFFFFF },
      'Abendlicht': { sun: 0xFFC98A, si: 1.2, hemi: 0xC4CFC0, hi: 0.3, fog: 0xE6D9C4, sp: [-17, 6, -4], lamp: 1.15, exp: 0.9, sky: 0xFAD4A8 }
    }[mode];
    if (!cfg || !this.sun) return;
    this.sun.color.setHex(cfg.sun).convertSRGBToLinear();
    this.sun.intensity = cfg.si;
    this.sun.position.set(cfg.sp[0], cfg.sp[1], cfg.sp[2]);
    this.hemi.color.setHex(cfg.hemi).convertSRGBToLinear();
    this.hemi.intensity = cfg.hi;
    this.scene.fog.color.setHex(cfg.fog).convertSRGBToLinear();
    const skyM = this.scene.getObjectByName('himmel');
    if (skyM) { skyM.material.color.setHex(cfg.sky).convertSRGBToLinear(); skyM.material.needsUpdate = true; }
    this.mLamp.emissiveIntensity = cfg.lamp;
    this.renderer.toneMappingExposure = cfg.exp;
    this.lampBase = cfg.lamp;
    this.sunBaseX = cfg.sp[0];
    const look = {
      'Morgen': [-0.6, 0.28, -0.75],
      'Mittag': [-0.46, 0.33, -0.82],
      'Abendlicht': [-0.86, 0.26, -0.44]
    }[mode];
    if (this.sunDir) this.sunDir.set(look[0], look[1], look[2]).normalize();
  }

  resizeGL() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const canvas = document.getElementById('rg-canvas');
    if (!canvas) return;
    if (!this.walk || !this.walk.isConnected) {
      this.reacquire();
      if (window.THREE) this.initScene();
      if (this.renderer) this.resizeGL();
      return;
    }
    if (window.THREE && (!this.renderer || this.renderer.domElement !== canvas)) {
      this.initScene();
      if (this.renderer) this.resizeGL();
      return;
    }
    if (this.content && this.content.isConnected) {
      const ct = this.content.getBoundingClientRect().top;
      const hide = ct < 2;
      if (hide !== this.canvasHidden) {
        this.canvasHidden = hide;
        canvas.style.visibility = hide ? 'hidden' : 'visible';
        /* Solange das Standbild steht, bleibt die Tafelschicht aus —
           sonst schaltet diese Zeile sie wieder ein und die
           Stationstexte liegen ueber der halben Seite. */
        if (this.stationsEl) this.stationsEl.style.display = (hide || this.standbild) ? 'none' : '';
      }
      if (hide) {
        const nw = performance.now();
        const d2 = Math.min(40, nw - (this.lastNow || nw));
        this.lastNow = nw;
        /* ⚠ Hier stand nur ein Abklingen: scrollVel = scrollVel * 0.9.
           Dieser Zweig greift fuer den GANZEN flachen Seitenteil — also
           dort, wo Laufband, Karte und Materialband sitzen. Ohne echten
           Messwert blieb scrollVel bei 0, kinDir wurde nie gesetzt und
           die Wortmarke stand fuer immer bei ihrem Startwert. Jetzt wird
           die Scrollgeschwindigkeit auch hier gemessen. */
        const sy2 = window.scrollY;
        const roh = sy2 - (this.lastSy == null ? sy2 : this.lastSy);
        this.lastSy = sy2;
        this.scrollVel = (this.scrollVel || 0) + (roh - (this.scrollVel || 0)) * 0.22;
        this.updateExtras(nw * 0.001, d2);
        return;
      }
    }

    const MO = this.props.motion == null ? 1 : this.props.motion;
    const walkH = this.walk ? this.walk.offsetHeight - window.innerHeight : 1;    this.tp = Math.min(1, Math.max(0, window.scrollY / Math.max(1, walkH)));
    const prev = this.p;
    this.p += (this.tp - this.p) * 0.031;
    this.mx += (this.tmx - this.mx) * 0.045;
    this.my += (this.tmy - this.my) * 0.045;
    this.vel += (Math.abs(this.p - prev) * 60 - this.vel) * 0.12;

    const inWalk = window.scrollY < walkH + window.innerHeight * 0.5;

    const now = performance.now();
    const dt = Math.min(50, now - (this.lastT || now - 16));
    this.lastT = now;
    const sy = window.scrollY;
    const raw = sy - (this.lastSy == null ? sy : this.lastSy);
    this.lastSy = sy;
    this.scrollVel = (this.scrollVel || 0) + (raw - (this.scrollVel || 0)) * 0.22;
    this.updateExtras(now * 0.001, dt);

    if (this.head) {
      const compact = window.scrollY > 70;
      if (compact !== this.headCompact) {
        this.headCompact = compact;
        this.head.style.padding = compact ? '8px clamp(14px,3vw,32px)' : '12px clamp(14px,3vw,32px)';
      }
    }
    if (this.ring) this.ring.style.strokeDashoffset = (113 * (1 - this.p)).toFixed(1);

    if (this.panels) {
      let best = -1, bestD = 9, rightVis = 0;
      for (let i = 0; i < this.panels.length; i++) {
        const d = Math.abs(this.p - this.stationP[i]);
        const span = i === 0 ? 0.22 : 0.085;
        const vis = Math.max(0, 1 - d / span);
        let e = vis * vis * (3 - 2 * vis);
        if (!inWalk) e = 0;
        else if (i === this.panels.length - 1 && this.tp >= 0.999) {
          const over = (window.scrollY - walkH) / Math.max(1, window.innerHeight * 0.5);
          e *= Math.max(0, 1 - over);
        }
        const el = this.panels[i];
        el.style.opacity = e.toFixed(3);
        el.style.pointerEvents = e > 0.5 ? 'auto' : 'none';
        el.style.visibility = e > 0.004 ? 'visible' : 'hidden';
        const side = el.getAttribute('data-side');
        const slide = (1 - e) * 34;
        if (side === 'center') el.style.transform = 'translate(-50%,-50%) translateY(' + (slide * 0.5).toFixed(1) + 'px)';
        else if (this.isMobile) el.style.transform = 'translateY(' + slide.toFixed(1) + 'px)';
        else el.style.transform = 'translateY(-50%) translateX(' + (side === 'left' ? -slide : slide).toFixed(1) + 'px)';
        if (side === 'right' && e > rightVis) rightVis = e;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (this.rail) {
        const base = inWalk && this.p > 0.04 ? 1 : 0;
        const duck = Math.min(1, Math.max(0, (rightVis - 0.12) / 0.3));
        const ease = duck * duck * (3 - 2 * duck);
        const railOp = base * (1 - ease);
        this.rail.style.opacity = railOp.toFixed(3);
        this.rail.style.transform = 'translateY(-50%) translateX(' + (ease * 92).toFixed(1) + 'px)';
        this.rail.style.pointerEvents = railOp > 0.5 ? 'auto' : 'none';
        this.rail.style.visibility = railOp > 0.01 ? 'visible' : 'hidden';
      }
      if (best !== this.active) {
        this.active = best;
        this.dots.forEach((dd, i) => {
          const on = i === best;
          const done = i < best;
          dd.style.color = on ? '#1F5637' : (done ? '#46761F' : '#8DA093');
          dd.style.background = on ? 'rgba(44,110,73,.13)' : 'transparent';
          const lbl = dd.querySelector('[data-label]');
          if (lbl) lbl.style.opacity = on ? '1' : (done ? '.8' : '.5');
          const core = dd.querySelector('span span:last-child');
          if (core) core.style.transform = on ? 'scale(2.1)' : (done ? 'scale(1.4)' : 'scale(1)');
        });
      }
    }

    if (this.grows && this.grows.length && this.content) {
      const cr = this.content.getBoundingClientRect();
      const total = Math.max(1, this.content.offsetHeight - window.innerHeight * 0.5);
      const cp = Math.min(1, Math.max(0, (-cr.top + window.innerHeight * 0.7) / total));
      for (let i = 0; i < this.grows.length; i++) {
        const g = this.grows[i];
        const v = Math.min(1, Math.max(0, (cp - g.s) / 0.17));
        const e = v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
        g.el.style.transform = g.leaf ? 'scale(' + e.toFixed(3) + ')' : 'scaleY(' + e.toFixed(3) + ')';
      }
    }

    if (this.pars && this.pars.length) {
      const vh = window.innerHeight;
      for (let i = 0; i < this.pars.length; i++) {
        const it = this.pars[i];
        if (it.el.style.opacity !== '1') continue;
        const r = it.el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        const rel = (r.top + r.height / 2) - vh / 2;
        it.el.style.transform = 'translate3d(0,' + (-rel * it.f * 0.1 * MO).toFixed(1) + 'px,0)';
      }
    }

    if (!this.ready) return;
    const t = now * 0.001;
    this.uTime.value = t;
    this.uWind.value = MO;

    const tt = Math.min(0.999, Math.max(0, this.p));
    const pos = this.curve.getPointAt(tt);
    const ahead = this.curve.getPointAt(Math.min(1, tt + 0.13));
    const gy = this.groundY(pos.x, pos.z);

    this.stepPhase = (this.stepPhase || 0) + this.vel * 1.35;
    const walkBob = Math.min(1, this.vel * 26);
    const bobY = Math.sin(this.stepPhase * 2) * 0.028 * walkBob * MO;
    const bobR = Math.sin(this.stepPhase) * 0.012 * walkBob * MO;

    this.camera.position.set(pos.x + this.mx * 0.34 * MO, gy + 1.62 + bobY - this.my * 0.1 * MO, pos.z);

    const camY = gy + 1.62 + bobY;
    const fIdx = this.active < 0 ? 0 : this.active;
    if (!this.fpCur) this.fpCur = this.focus[fIdx].clone();
    this.fpCur.lerp(this.focus[fIdx], 0.028);
    const fTarget = this.fpCur;
    if (this.fMix == null) this.fMix = 0;
    this.fMix += (this.focusMix[fIdx] - this.fMix) * 0.03;
    const near = Math.max(0, 1 - Math.abs(this.p - this.stationP[fIdx]) / 0.1);
    const look = new THREE.Vector3(
      ahead.x + this.mx * 0.9 * MO,
      camY - 0.05 - this.my * 0.42 * MO,
      ahead.z
    );
    const blend = near * near * (3 - 2 * near) * this.fMix;
    look.lerp(fTarget, blend);
    const dir = look.clone().sub(this.camera.position);
    if (dir.x * dir.x + dir.z * dir.z < 0.3) dir.set(ahead.x - pos.x, dir.y, ahead.z - pos.z);
    const flat = Math.max(0.6, Math.hypot(dir.x, dir.z));
    dir.y = Math.max(-flat * 0.3, Math.min(flat * 0.26, dir.y));
    dir.normalize().multiplyScalar(9);
    look.copy(this.camera.position).add(dir);
    this.camera.lookAt(look);
    this.camera.rotateZ(bobR);

    if (this.gateWings) {
      const gp = Math.min(1, Math.max(0, (this.p - 0.05) / 0.15));
      const ge2 = gp < 0.5 ? 4 * gp * gp * gp : 1 - Math.pow(-2 * gp + 2, 3) / 2;
      for (let i = 0; i < this.gateWings.length; i++) {
        const w = this.gateWings[i];
        w.rotation.y = w.userData.dir * 1.32 * ge2;
      }
    }

    if (this.birds && MO > 0) {
      if (!this.bFwd) this.bFwd = new THREE.Vector3();
      this.camera.getWorldDirection(this.bFwd);
      this.bFwd.y = 0;
      if (this.bFwd.lengthSq() < 0.0001) this.bFwd.set(0, 0, -1);
      this.bFwd.normalize();
      const yaw = Math.atan2(this.bFwd.x, this.bFwd.z);
      const cx = this.camera.position.x, cz = this.camera.position.z;
      for (let i = 0; i < this.birds.length; i++) {
        const b = this.birds[i], u = b.userData;
        const bt = t * u.sp + u.ph;
        const ang = yaw + bt;
        b.position.set(cx + Math.sin(ang) * u.rad, u.y + Math.sin(bt * 1.7) * 0.7, cz + Math.cos(ang) * u.rad);
        b.rotation.y = ang;
        b.rotation.z = 0.2;
        const flap = Math.sin(t * u.fl + u.ph);
        u.wl.rotation.x = flap * 0.62;
        u.wr.rotation.x = -flap * 0.62;
        u.wl.rotation.y = flap * 0.16;
        u.wr.rotation.y = -flap * 0.16;
      }
    }

    if (this.water) {
      const wp = this.water.geometry.attributes.position, wb = this.wBase;
      this.wSlice = ((this.wSlice || 0) + 1) % 2;
      for (let i = this.wSlice; i < wp.count; i += 2) {
        const x = wb[i * 3], z = wb[i * 3 + 2];
        wp.setY(i, Math.sin(x * 1.55 + t * 1.15) * 0.011 * MO
          + Math.sin(z * 2.05 - t * 0.92) * 0.008 * MO
          + Math.sin((x + z) * 3.3 - t * 1.7) * 0.005 * MO);
      }
      wp.needsUpdate = true;
      if (this.wSlice === 0) this.water.geometry.computeVertexNormals();
    }

    if (this.falls) {
      for (const fl of this.falls) {
        const p3 = fl.geometry.attributes.position, bs = fl.userData.base;
        for (let i = 0; i < p3.count; i++) {
          const v = bs[i * 3 + 1] / -fl.userData.h;
          const sw = Math.sin(t * 7.5 - v * 9 + fl.userData.ph) * 0.016 * (0.3 + v) * MO;
          p3.setX(i, bs[i * 3] + sw);
          p3.setZ(i, bs[i * 3 + 2] * (1 + Math.sin(t * 5.1 - v * 6 + fl.userData.ph) * 0.05 * MO));
        }
        p3.needsUpdate = true;
      }
      this.mFall.opacity = 0.82 + Math.sin(t * 4.3) * 0.06;
    }
    if (this.fallSpray) {
      const arr = this.fallSpray.geometry.attributes.position.array;
      const tiers = this.fallTiers, g2 = 3.6;
      for (let i = 0; i < this.fallDrops.length; i++) {
        const d = this.fallDrops[i], tr = tiers[d.ti], pv = tiers[d.ti - 1];
        const life = 0.62;
        const tt = (((t * 0.9 * d.sp * Math.max(0.15, MO)) + d.ph) % 1) * life;
        arr[i * 3] = -tr[0] + 0.58 + tt * (0.35 + d.out * 0.7);
        arr[i * 3 + 1] = Math.max(pv[1] + 0.08, tr[1] + 0.08 - 0.5 * g2 * tt * tt - tt * 0.3);
        arr[i * 3 + 2] = d.z * (1 + tt * 0.9);
      }
      this.fallSpray.geometry.attributes.position.needsUpdate = true;
    }
    if (this.fallMist) {
      for (const m2 of this.fallMist) {
        const ph = ((t * 0.16 * Math.max(0.2, MO)) + m2.userData.ph) % 1;
        m2.position.y = m2.userData.y0 + ph * 0.85;
        m2.position.x = m2.userData.x0 + ph * 0.42;
        const s = 0.7 + ph * 1.5;
        m2.scale.setScalar(s);
        m2.material.opacity = Math.sin(ph * Math.PI) * 0.2;
      }
    }
    if (this.stream) {
      const sp2 = this.stream.geometry.attributes.position, sb = this.streamBase;
      for (let i = 0; i < sp2.count; i++) {
        const x = sb[i * 3], z = sb[i * 3 + 2];
        sp2.setY(i, sb[i * 3 + 1] + Math.sin((x + z) * 3.6 - t * 3.4) * 0.014 * MO + Math.sin(x * 5.2 - t * 5.1) * 0.007 * MO);
      }
      sp2.needsUpdate = true;
      this.sSlice = ((this.sSlice || 0) + 1) % 3;
      if (this.sSlice === 0) this.stream.geometry.computeVertexNormals();
    }

    if (this.jet) {
      this.jet.scale.y = 1 + Math.sin(t * 5.2) * 0.14 * MO;
      this.jet.scale.x = this.jet.scale.z = 1 + Math.sin(t * 7.1 + 1) * 0.07 * MO;
      this.jet.rotation.z = Math.sin(t * 1.4) * 0.03 * MO;
      this.mJet.opacity = 0.4 + Math.sin(t * 6.3) * 0.11;
    }

    if (this.drops) {
      const F = this.fountainPos, g = 9.1, life = 1.05, dd = this.dropDummy;
      for (let i = 0; i < this.dropData.length; i++) {
        const d = this.dropData[i];
        const pt = (((t * 0.72 * d.sp * Math.max(0.15, MO)) + d.ph) % 1) * life;
        const r = 0.04 + d.vr * pt * pt * 1.5;
        const vy = d.v - g * pt;
        const y = F.y + 2.0 + d.v * pt - 0.5 * g * pt * pt;
        const clamped = Math.max(F.y + 0.13, y);
        dd.position.set(F.x + Math.cos(d.a) * r, clamped, F.z + Math.sin(d.a) * r);
        const stretch = 1 + Math.min(0.85, Math.abs(vy) * 0.2);
        dd.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        dd.rotation.set(0, d.a, 0);
        dd.updateMatrix();
        this.drops.setMatrixAt(i, dd.matrix);
      }
      this.drops.instanceMatrix.needsUpdate = true;
    }

    if (this.ripples) {
      for (let i = 0; i < this.ripples.length; i++) {
        const ring = this.ripples[i];
        const ph = ((t * 0.5 * Math.max(0.2, MO)) + ring.userData.off) % 1;
        const s = 1 + ph * 5.2;
        ring.scale.set(s, s, 1);
        ring.material.opacity = (1 - ph) * (1 - ph) * 0.5;
      }
    }

    if (this.ducks && MO > 0) {
      const pc = this.fountainPos;
      for (let i = 0; i < this.ducks.length; i++) {
        const d = this.ducks[i], u = d.userData;
        const a = t * u.sp + u.ph;
        d.position.set(pc.x + Math.cos(a) * u.rad, pc.y + 0.1 + Math.sin(t * 1.3 + u.ph) * 0.014, pc.z + Math.sin(a * 1.15) * u.rad * 0.72);
        d.rotation.y = -a - 1.35;
        d.rotation.z = Math.sin(t * 0.9 + u.ph) * 0.045;
        if (u.head) u.head.position.y = 0.3 + Math.sin(t * 1.7 + u.ph) * 0.022;
        if (u.wake) {
          const wp2 = ((t * 0.42 + u.ph) % 1);
          u.wake.position.set(d.position.x, pc.y + 0.115, d.position.z);
          const ws = 1 + wp2 * 5.4;
          u.wake.scale.set(ws, ws, 1);
          u.wake.material.opacity = (1 - wp2) * (1 - wp2) * 0.34;
        }
      }
    }

    if (this.steam) {
      const sd = this.steamDummy, o = this.steamOrigin;
      for (let i = 0; i < 18; i++) {
        const ph = ((t * 0.22 + i / 18) % 1);
        const rise = ph * 0.56;
        sd.position.set(
          o.x + Math.sin(ph * 7 + i) * 0.035 * ph + (i % 2 ? 0.2 : 0) * 0,
          o.y + rise,
          o.z + Math.cos(ph * 5.4 + i) * 0.03 * ph
        );
        const s = (0.35 + ph * 1.5) * (1 - ph * 0.55);
        sd.scale.setScalar(Math.max(0.001, s));
        sd.updateMatrix();
        this.steam.setMatrixAt(i, sd.matrix);
      }
      this.steam.instanceMatrix.needsUpdate = true;
    }

    if (this.butterflies && MO > 0) {
      for (let i = 0; i < this.butterflies.length; i++) {
        const bf = this.butterflies[i], u = bf.userData;
        const bt = t * u.sp + u.ph;
        bf.position.set(
          u.ax + Math.sin(bt) * u.r + Math.cos(bt * 0.62) * 0.42,
          this.groundY(u.ax, u.az) + 0.62 + Math.sin(bt * 2.1) * 0.24,
          u.az + Math.cos(bt * 0.84) * u.r
        );
        bf.rotation.y = -bt * 1.1;
        bf.rotation.z = Math.sin(bt * 2.1) * 0.2;
        const flap = 0.5 + Math.sin(t * 13 + u.ph) * 0.95;
        u.wl.rotation.x = flap;
        u.wr.rotation.x = -flap;
      }
    }

    if (this.bees && MO > 0) {
      for (let i = 0; i < this.bees.length; i++) {
        const be = this.bees[i], u = be.userData;
        const bt = t * u.sp + u.ph;
        be.position.set(
          u.ax + Math.sin(bt) * u.r + Math.sin(bt * 3.7) * 0.14,
          this.groundY(u.ax, u.az) + u.h + Math.sin(bt * 4.3) * 0.09,
          u.az + Math.cos(bt * 1.31) * u.r + Math.cos(bt * 4.1) * 0.12
        );
        be.rotation.y = -bt * 1.4;
        be.rotation.z = Math.sin(bt * 3.1) * 0.24;
      }
    }

    if (this.pollen) {
      this.pollen.rotation.y = t * 0.014 * MO;
      this.pollen.position.y = Math.sin(t * 0.32) * 0.24;
    }
    if (this.mLamp) this.mLamp.emissiveIntensity = (this.lampBase || 0.35) * (0.86 + Math.sin(t * 1.25) * 0.14);

    if (this.sunSprite && this.sunDir) {
      this.sunSprite.position.copy(this.camera.position).addScaledVector(this.sunDir, 300);
      if (this.sunGlow) {
        this.camera.getWorldDirection(this.camFwd);
        const facing = Math.max(0, this.camFwd.dot(this.sunDir));
        const sp = this.sunSprite.position.clone().project(this.camera);
        const near = facing > 0.02;
        const px = near ? Math.max(-0.6, Math.min(1.6, sp.x * 0.5 + 0.5)) : 0.5;
        const py = near ? Math.max(-0.4, Math.min(1.4, -sp.y * 0.5 + 0.5)) : -0.2;
        this.sunGlow.style.left = (px * 100).toFixed(2) + '%';
        this.sunGlow.style.top = (py * 100).toFixed(2) + '%';
        this.sunGlow.style.opacity = (0.1 + 0.5 * Math.pow(facing, 1.8)).toFixed(3);
      }
    }

    this.sun.position.x = (this.sunBaseX == null ? -10 : this.sunBaseX) + this.p * 2.4;
    this.sun.target.position.set(pos.x, 0, pos.z);
    this.sun.target.updateMatrixWorld();

    this.renderer.render(this.scene, this.camera);
  };
}

  var __props = {
    "timeOfDay": "Mittag",
    /* Der Regler des Designs stand fest auf 1. Bei "Bewegung reduzieren"
       geht er auf 0: Wind, Kamerawiegen, Mausversatz, Parallaxe und
       Wellen stehen still, der Rundgang folgt dem Scrollen weiterhin. */
    "motion": __reduce ? 0 : 1
  };
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
