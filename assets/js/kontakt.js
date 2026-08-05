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

    const form = document.querySelector('form[data-contact]');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const body = ['Name: ' + (d.get('name') || ''), 'E-Mail: ' + (d.get('email') || ''), 'Telefon: ' + (d.get('tel') || ''), '', d.get('text') || ''].join('\n');
      const mailto = () => {
        window.location.href = 'mailto:' + ((window.dvFormular && window.dvFormular.empfaenger) || 'info@devries-galabau.de') + '?subject=' + encodeURIComponent('Anfrage über Kontaktformular') + '&body=' + encodeURIComponent(body);
      };
      /* Zentrale Stelle: speichert, falls eingerichtet — sonst mailto. */
      if (window.dvFormular) window.dvFormular.senden({
        form: form, quelle: 'kontakt', betreff: 'Anfrage über Kontaktformular',
        felder: {
          name: d.get('name'), email: d.get('email'),
          telefon: d.get('tel'), nachricht: d.get('text')
        },
        mailto: mailto
      });
      else mailto();
    });

    this.karte();
  }

  /* Zwei-Klick-Loesung fuer die Karte.
     Eine fest eingebettete Google-Karte laedt beim Seitenaufruf von
     Google-Servern und uebertraegt dabei die IP-Adresse jedes Besuchers
     in die USA — ohne dass er gefragt wurde. Deshalb steht zunaechst
     eine eigene Vorschau da, und erst dieser Klick ist die Einwilligung.

     Seit v70 gibt es zusaetzlich die Abfrage am Seitenanfang
     (assets/js/cookie.js). Liegt von dort eine Einwilligung vor, ist der
     Klick hier schon erteilt und die Karte erscheint gleich. Der Knopf
     bleibt trotzdem: Wer abgelehnt oder noch nicht entschieden hat, kommt
     ueber ihn an die Karte, ohne dass dafuer etwas gespeichert wird. */
  karte() {
    const knopf = document.getElementById('karte-laden');
    const buehne = document.getElementById('karte-buehne');
    if (!knopf || !buehne) return;

    /* Erst jetzt zeigen: ab hier haengt der Horcher, ab hier tut der Knopf
       auch etwas. Ohne JavaScript bleibt er verborgen. */
    const zustimmung = document.getElementById('karte-zustimmung');
    if (zustimmung) zustimmung.hidden = false;
    const widerruf = document.getElementById('karte-widerruf');

    const einbetten = (fokus) => {
      if (buehne.querySelector('iframe')) return;   /* nie zweimal */
      const vorschau = document.getElementById('karte-vorschau');
      /* Bewusst nach dem FIRMENNAMEN suchen, nicht nur nach der Anschrift.
         Sucht man allein die Adresse, setzt Google die Stecknadel auf den
         Geokodierungspunkt der Hausnummer — der liegt hier ein Stueck
         neben dem Betriebsgelaende, und der Unternehmenseintrag
         "de Vries Garten- und Landschaftsbau" stand unbeschriftet daneben.
         Mit Name + Anschrift trifft die Nadel den Eintrag selbst.
         ⚠ Dieselbe Zeichenfolge steht als Routenziel in kontakt.html
         (Link "Route planen") — beide zusammen aendern. */
      const ziel = 'de Vries Garten- und Landschaftsbau, ' +
                   'An den Flachsrotten 2, 31020 Salzhemmendorf';
      const f = document.createElement('iframe');
      /* maps.google.com leitet auf www.google.com weiter — deshalb stehen
         beide Hosts in der frame-src dieser Seite. */
      f.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(ziel) +
              '&hl=de&z=17&output=embed';
      f.title = 'Karte: ' + ziel;
      /* Bewusst OHNE loading="lazy": der Rahmen entsteht erst im Moment
         des Klicks, es gibt also nichts aufzuschieben. Umgekehrt kann
         "lazy" den Start verzoegern, wenn der Ausschnitt beim Klick
         gerade nicht im Bild steht — dann taete der Knopf sichtbar
         nichts, und genau das soll er nie. */
      f.referrerPolicy = 'no-referrer';
      f.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block');
      buehne.appendChild(f);

      /* Erst danach die Vorschau entfernen: faellt das Einsetzen aus
         irgendeinem Grund aus, bleibt wenigstens die Adresse stehen.
         Der Knoten wird aufgehoben, damit ein Widerruf ihn
         zurueckstellen kann — ohne Neuladen und ohne dass die Buehne
         leer bliebe. */
      if (vorschau) { this.vorschauKnoten = vorschau; vorschau.remove(); }
      if (zustimmung) zustimmung.hidden = true;
      if (widerruf) widerruf.hidden = false;
      /* Der gedrueckte Knopf ist jetzt weg — ohne das hier verloere die
         Tastaturbedienung ihre Stelle und spraenge an den Seitenanfang.
         Beim automatischen Einbetten NICHT den Fokus nehmen: da hat
         niemand geklickt, und ein Fokussprung beim Laden ist ein Fehler. */
      if (fokus) buehne.focus();
    };

    knopf.addEventListener('click', () => einbetten(true));

    const K = window.dvgKarte;
    if (K) {
      if (K.erlaubt()) einbetten(false);
      /* Zustimmung im Banner erteilt, waehrend die Kontaktseite offen
         liegt: Karte sofort zeigen, ohne dass jemand neu laden muss. */
      K.beiAenderung((wert) => {
        if (wert === 'ja') einbetten(true);
        else if (wert === null) this.karteZurueck(buehne, zustimmung, widerruf);
      });
    }
  }

  /* Widerruf: Rahmen raus, eigene Vorschau zurueck, Knopf wieder da.
     Der Rahmen muss weg — sonst waere der Widerruf ein Wort ohne
     Wirkung, die Karte liefe weiter und Google saehe weiter mit. */
  karteZurueck(buehne, zustimmung, widerruf) {
    const f = buehne.querySelector('iframe');
    if (f) f.remove();
    if (this.vorschauKnoten) { buehne.appendChild(this.vorschauKnoten); this.vorschauKnoten = null; }
    if (zustimmung) zustimmung.hidden = false;
    if (widerruf) widerruf.hidden = true;
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
