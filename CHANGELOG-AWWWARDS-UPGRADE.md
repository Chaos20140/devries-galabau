# CHANGELOG — Awwwards-Upgrade (v6 → v7)

**Zeitraum:** 2026-07-26 / 27
**Branch:** `improvement/awwwards-motion-upgrade`
**Ausgangs-Commit:** `1d30432 chore: save website before awwwards upgrade`
**Sicherung:** `C:\Users\Tolun\DeVries Galabau_BACKUP_2026-07-26` (Vollkopie, 85 MB)
**Cache-Busting:** alle Seiten auf `?v=7`, jetzt einschließlich der Vendor-Dateien

---

## Behobene Fehler

### Kritisch

**Hero-Inhalt ohne Seitenrand** — `.chapter__inner{width:100%}` überschrieb die
`.wrap`-Breite. Gemessen: Hero-Container bei x = 0 mit 1425 px Breite, während die
Navigation korrekt bei x = 40 mit 1345 px lag. Auf 390 px wurde die Headline rechts
abgeschnitten.
Die Korrektur war zweistufig: `width:100%` entfernen genügte **nicht** — als Flex-Item
löste `min(100% - 2 * var(--gut), var(--wrap))` inhaltsbasiert auf und ergab 688 px statt
1345 px. `.chapter` ist deshalb jetzt ein Grid mit `align-items: end`.
Verifiziert bei 360, 390, 768, 1024, 1440 und 1920 px: Hero-Offset exakt gleich dem der Navigation.

**Intro-Loader entfernt** — deckte den Viewport ab (z-index 9998), wartete auf `load`,
dann 1500 ms, dann 1 s Clip-Transition, und sperrte solange `body`-Scroll. Das LCP-Element
war dadurch strukturell nicht vor ~2,7 s sichtbar.

**Seitenvorhang entfernt** — fing jeden internen `.html`-Klick ab und navigierte erst nach
480 ms. Ersetzt durch die native View-Transitions-API plus `<link rel="prefetch">` bei
Hover/Touch (nicht bei Datensparmodus oder 2G).

### Funktional

- **Fokus-Trap** für Mobile-Navigation und Lightbox ergänzt (existierte trotz gegenteiliger
  Angabe in CLAUDE.md §7 nicht). Verifiziert: 25 × Tab verlässt den Dialog nicht.
- **Hintergrund wird `inert`**, solange ein Overlay offen ist; Fokus kehrt beim Schließen
  zum Auslöser zurück.
- **Mobile-Navigation** mit `role="dialog"`, `aria-modal`, `aria-controls`.
- **Leistungsbeschreibungen auf Mobile** wieder sichtbar — waren unter 860 px per
  `display:none` ausgeblendet, wodurch nur vier nackte Wörter übrig blieben.
- **Filmstreifen verlinkt sechs echte Projekte** statt sechsmal dieselbe Übersichtsseite;
  in `referenzen.html` wurden dafür Anker gesetzt.
- **Cookie-Hinweis**: `role="region"` statt der widersprüchlichen Kombination
  `role="dialog"` + `aria-live`.
- **Referenzen-Filter** meldet das Ergebnis über eine Live-Region an Screenreader.

### Neu entdeckt während der Umsetzung

Diese Punkte standen nicht im Ausgangsaudit — sie kamen bei einem systematischen Abgleich
aller im Markup verwendeten Klassen gegen CSS und JS ans Licht:

- **`.btn--clay` war in 13 Dateien in Gebrauch, aber nirgends im CSS definiert.** Sämtliche
  Haupt-CTAs („Kostenlos anfragen") hatten dadurch keinerlei Akzentgestaltung. Ursache: die
  v4-Palette benannte den Token von `clay` auf `rust` um, das Markup wurde nicht nachgezogen.
  Beide Namen sind jetzt zu einem Selektor zusammengefasst.
- **`.btn--ghost`** (13 Dateien) ebenfalls undefiniert — der „Zurück"-Button im
  Anfrageformular war optisch nicht vom Absenden-Button unterschieden.
- **`.cta-band__grid`** (7 Dateien) war ein leeres `<div>` ohne jede Regel. Es trägt jetzt
  das Planraster des Leitmotivs.
- **`.mnav__cta`** (14 Dateien) undefiniert.
- **Skip-Link animierte `top`** statt `transform` — eine Layout-Eigenschaft.
- Tote Regelblöcke entfernt: `.hero__inner`, `.plot__idx`, `.plot__media`, `.plot__icon`,
  `.tnode__dot`, `.timeline__prog`, `.quote__mark`, `.chapter__scrim--l`.

### Accessibility

- **Überschriftenhierarchie** auf allen 14 Seiten korrigiert. Vorher sprang praktisch jede
  Seite von H2 auf H4, `kontakt.html` sogar von H1 auf H4. Betroffen: Footer-Spalten,
  Timeline-Schritte, `.vcard`, `.infoblock`, die fünf Schritte des Anfrageformulars und
  die Prozessschritte auf `gartenplanung.html`. Die optische Größe kommt jetzt aus Klassen,
  nicht aus der Ebene.
- **Kontraste**: `--muted` von `#877d6c` auf `#6a6152` (3,49 → 5,25 : 1), `--rust` von
  `#b4501e` auf `#a9491b` (4,40 → 4,95 : 1). Beide lagen unter WCAG AA und werden fast
  ausschließlich für kleine Schrift verwendet. Zusätzlich `.filmstrip .eyebrow` auf
  `--rust-soft`, weil `--rust` auf dunklem Grund nur 3,14 : 1 erreichte.
- **`aria-prohibited-attr`** behoben: Der Wort-Splitter setzte `aria-label` auf ein `<span>`
  ohne Rolle. Der Originaltext liegt jetzt als visuell verborgener Knoten daneben.
- **`label-content-name-mismatch`** behoben: `aria-label="Anrufen"` auf dem Telefonlink
  verdeckte die sichtbare Nummer; das Label der Wortmarke wich vom sichtbaren Text ab.
  Beide entfernt — der sichtbare Text ist der bessere Name.
- **Touch-Ziele** in der Topbar auf 44 px (mit negativem Margin, damit die Leiste schlank bleibt).
- **Sicherheitsnetz**: Fällt `main.js` nach dem Inline-Head-Script aus, gibt ein Timeout die
  per `.js` versteckten Inhalte nach 2,5 s frei. Vorher wäre die gesamte Seite unsichtbar geblieben.

---

## Überarbeitete Seiten

| Seite | Was sich geändert hat |
|---|---|
| `index.html` | Loader entfernt · Hero-Container repariert · Statement um Materialschichtung erweitert · Signature Moment neu · Filmstreifen mit echten Zielen und Fortschrittsanzeige · Parallax-Ebenen · responsive Bildauswahl |
| `referenzen.html` | Projektanker gesetzt · Kontextcursor · Live-Region für die Filterung · dreistufiges `srcset` für 23 Bilder |
| `kontakt.html` | Überschriftenebenen · Hinweis auf den Sendeweg · Breadcrumb-Schema |
| `anfrage.html` | Schrittüberschriften auf H2 · Statusmeldung · Hinweis auf den Sendeweg · keine bedingungslose Weiterleitung mehr |
| 4 Leistungsseiten | Überschriftenebenen · `Service`-Schema · Breadcrumb · responsive Bilder |
| `ueber-uns`, `stellenangebote`, `impressum`, `datenschutz` | Überschriftenebenen · Breadcrumb-Schema · responsive Bilder |
| `404.html` | Self-Canonical entfernt (widersprach `noindex`) |
| alle 14 | Sicherheitsnetz im Head · Dialog-Semantik · Cookie-ARIA · ARIA-Namen · Font-Preload · `?v=7` |

---

## Neue Komponenten

| Komponente | Zweck |
|---|---|
| `.plan-draw` | Signature Moment: Vermessungsebene über dem Projektfoto — Raster, 11 Pfade, 5 Beschriftungen |
| `.layerstack` | Materialschichtung im Statement: vier Bildbänder Weg · Stein · Pflanze · Wasser |
| `.ccur` | Kontextcursor „Projekt ansehen" (nur über Medienflächen, nur Desktop) |
| `.filmstrip__counter` | Fortschrittsanzeige des Filmstreifens (Desktop aus der Timeline, Touch aus dem Snap-Scrolling) |
| `.form__note` / `.form__copy` | Sendeweg vorab erklären, Kopier-Rückfalllösung ohne Mailprogramm |
| `[data-layer]` / `.plx-frame` | Parallax-Tiefensystem mit drei Stufen |
| `.footer__h`, `.step__title` | Klassen, die Überschriftengröße von der Ebene entkoppeln |
| `.btn--clay`, `.btn--ghost`, `.cta-band__grid`, `.mnav__cta` | zuvor benutzte, aber undefinierte Klassen |

---

## Neue Animationen

- **Signature Moment „Plan wird Garten"** — eine gescrubte Timeline über vier Schichten
  (Raster → Linien → Beschriftung → Foto → Auflösung → Aussage). Die Pfade folgen exakt
  den Kanten des Fotos, weil der `viewBox` dem Bildformat entspricht und
  `preserveAspectRatio="slice"` sich wie `object-fit: cover` verhält.
- **Leistungs-Scrollytelling** — auf Touch und schmalen Viewports steuert die Scrollposition
  den Bildwechsel; vorher war die Sektion dort tot, weil sie ausschließlich auf Hover reagierte.
- **Parallax in drei Tiefenstufen** — vorher gab es im gesamten Projekt **null**
  `[data-parallax]`-Elemente, obwohl die Engine es unterstützte.
- **Materialschichtung** mit gestaffeltem Aufziehen der vier Bänder.
- **Seitenübergang** über die View-Transitions-API; Topbar und Navigation bleiben stehen.
- **Filmstreifen-Fortschritt** und Fokus-Nachführung: erhält ein Element im gepinnten
  Bereich den Fokus, zieht die Timeline mit.

---

## Motion-System

Alle Dauern und Kurven stammen aus einem Satz Tokens (`--dur-xs/s/m/l/xl`, `--stag`,
`--ease-out/soft/micro`). Vorher hatte fast jede Komponente eigene Werte — .9 s, .8 s,
1.2 s, 1.5 s, 55 ms, 80 ms —, weshalb die Bewegungen nicht verwandt wirkten.
Details in `DESIGN-AND-MOTION-SYSTEM.md`.

**Reduced Motion** ist keine Reduktion auf Dauer 0 mehr, sondern eine eigene Fassung:
Pins aufgelöst, Parallax aus, Filmstreifen als vertikales Raster, Marquee steht, Filmkorn
aus, Reveals als kurze reine Blende. Messbare Folge: die Startseite ist dort 14 442 px statt
17 662 px lang.

**Mobile Motion** ist eine eigene Regie: Parallax auf ~35 %, Signatur-Pin 190 vh statt 250 vh,
natives Snap-Scrolling im Filmstreifen, kein Filmkorn, kein Cursor, horizontale Reveals auf
vertikalen Versatz umgestellt.

---

## Performance

### Gemessene Lighthouse-Werte

Beide Messreihen unter identischen Bedingungen: lokaler Server **mit gzip**, Lighthouse
12.x, Desktop 1440 × 900 ohne Drosselung, Mobil 390 × 844 mit Slow-4G und 4-facher
CPU-Drosselung.

| Seite | Gerät | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| index | Desktop | 94 → **98** | 91 → **100** | 100 → 100 | 100 → 100 | 1,4 → **1,1 s** | 0,010 → **0** |
| index | Mobil | 90 → **95** | 91 → **100** | 100 → 100 | 100 → 100 | 2,9 → 2,9 s | 0,120 → **0** |
| ueber-uns | Desktop | 99 → **100** | 95 → **100** | 100 → 100 | 100 → 100 | 0,9 → **0,7 s** | 0,001 → **0** |
| ueber-uns | Mobil | 81 → **97** | 95 → **100** | 100 → 100 | 100 → 100 | 4,4 → **2,6 s** | 0,120 → **0** |
| referenzen | Desktop | 99 → 99 | 95 → **100** | 100 → 100 | 100 → 100 | 0,8 → 0,9 s | 0,002 → **0** |
| referenzen | Mobil | 92 → **99** | 95 → **100** | 100 → 100 | 100 → 100 | 2,7 → **2,0 s** | 0,120 → **0** |
| kontakt | Desktop | 100 → 100 | 95 → **100** | 100 → 100 | 100 → 100 | 0,4 → 0,4 s | 0,001 → **0** |
| kontakt | Mobil | 96 → **100** | 95 → **100** | 100 → 100 | 100 → 100 | 1,6 → 1,9 s | 0,120 → **0** |
| anfrage | Desktop | 100 → 100 | 95 → **100** | 100 → 100 | 100 → 100 | 0,4 → 0,4 s | 0,001 → **0** |
| anfrage | Mobil | 96 → **99** | 95 → **100** | 100 → 100 | 100 → 100 | 1,6 → 2,0 s | 0,120 → **0** |
| gartengestaltung | Desktop | 100 → 100 | 95 → **100** | 100 → 100 | 100 → 100 | 0,7 → 0,7 s | 0,001 → **0** |
| gartengestaltung | Mobil | 87 → **98** | 95 → **100** | 100 → 100 | 100 → 100 | 3,5 → **2,5 s** | 0,120 → **0** |

**Nicht bestandene Audits vorher:** `aria-prohibited-attr`, `color-contrast`, `heading-order`,
`label-content-name-mismatch`.
**Nachher:** keine.

**Ehrlich benannte Abstriche**
- `index.html` mobil hält LCP bei 2,9 s und liegt damit weiterhin über dem 2,5-s-Ziel.
  Ursache ist der bildschirmfüllende Hero unter 4-facher CPU-Drosselung; die Startseite
  ist die einzige Seite mit dieser Konstruktion. Alle anderen gemessenen Seiten liegen
  bei 1,9–2,6 s.
- `kontakt` und `anfrage` verlieren mobil 0,3–0,4 s LCP. Ursache ist der zusätzlich
  vorgeladene Mono-Zeichensatz. Er ist Voraussetzung dafür, dass CLS von 0,12 auf 0 fällt —
  ein bewusster Tausch zugunsten der visuellen Stabilität.
- `referenzen` desktop 99 statt 100 (0,1 s mehr LCP) — im Rahmen der Messschwankung.

### Was die Werte bewirkt hat

- **Datenvolumen der Startseite auf Mobil: 1657 KB → 879 KB.**
  Dreistufiges `srcset` (`-400`/`-800`/`-1600`) für 50 Bilder, dazu `sizes` nach
  tatsächlicher Anzeigebreite statt pauschal `100vw`. Ein 44 px hohes Materialband lud
  vorher eine 263-KB-Datei.
- **Vier neue Hintergrundvarianten** (`-bg-700`/`-bg-1400`) für die Leistungssektion:
  auf 16:10 zugeschnitten und stark komprimiert, weil sie unter einem 62-%-Dunkelschleier
  liegen. 537 KB → 146 KB auf Mobil.
- **27 neue `-400.webp`-Varianten** für Raster- und Bandbilder.
- **Unterseiten luden das 1600er-Herobild auf 390 px** (`ueber-uns.html`: 329 KB statt 86 KB) —
  behoben, dadurch dort 717 KB → 474 KB und Performance 81 → 97.
- **CLS von 0,12 auf 0**: Ursache war der Topbar-Kontaktblock, der beim Schriftwechsel von
  22 px auf 68 px wuchs und den gesamten Hero nach unten schob. Behoben durch reservierte
  Mindesthöhe **und** Preload der Mono-Schrift (die Mindesthöhe allein reichte nicht, weil
  der Inhalt innerhalb umbricht).
- **Layout-Thrashing beseitigt**: Die Scrollschleife trennt jetzt Lese- und Schreibphase.
- **`will-change`** nur noch während der aktiven ScrollTrigger-Phase statt dauerhaft.
- **Marquee** hält außerhalb des Viewports an.
- **Filmkorn** auf Mobilgeräten abgeschaltet.
- **Signatur-Pin** von 300 vh auf 250 vh gekürzt, obwohl er jetzt vier statt einer
  Transformation zeigt.

### Serverseitig

Neu: **`.htaccess`** mit gzip/Brotli, Cache-Regeln, HTTPS- und www-Weiterleitung sowie
denselben Alt-URL-Weiterleitungen wie `_redirects`.
Hintergrund: ohne Kompression liefert der Server `style.css` mit 62 statt 17 KB und
`main.js` mit 35 statt 11 KB aus. Auf der Startseite ist das mobil der Unterschied
zwischen Performance **86 und 95** — bei identischem Code.

---

## SEO

- **BreadcrumbList** auf 11 Unterseiten, sichtbare Brotkrume als `<nav aria-label="Brotkrumen">`.
- **`Service`-Schema** auf den vier Leistungsseiten, verknüpft mit der `LandscapingBusiness`
  der Startseite.
- **`CollectionPage`** auf `referenzen.html`.
- Self-Canonical der 404-Seite entfernt.
- Vorher trugen 7 von 14 Seiten strukturierte Daten, jetzt 12 von 14
  (`danke.html` und `404.html` bleiben bewusst ohne — beide `noindex`).
- **Keine erfundenen Angaben.** Insbesondere kein `JobPosting` auf `stellenangebote.html`:
  es gibt derzeit keine offenen Stellen, eine Auszeichnung wäre falsch.
  Ebenso keine `aggregateRating` und keine Preise.

---

## Abhängigkeiten

**Neu hinzugefügt: keine.**
Unverändert self-hosted: `gsap.min.js` (71 KB / 27 KB gzip), `ScrollTrigger.min.js`
(42 KB / 17 KB), `lenis.min.js` (13 KB / 4 KB).

**Entfernt:** der JS-Seitenvorhang, der Intro-Loader und der globale Ersatzcursor —
alle drei ersatzlos bzw. durch native Browserfunktionen abgelöst.

Playwright, Lighthouse und sharp wurden ausschließlich im temporären Arbeitsverzeichnis
installiert. Das Projekt bleibt ohne `package.json` und ohne `node_modules`.

---

## Prüfungen

**Abnahmesuite: 93 von 93 bestanden** (`docs/verify.mjs`-Äquivalent im Arbeitsverzeichnis).
Abgedeckt: Konsole und Netzwerk aller 14 Seiten, Überschriftenfolge, JSON-LD-Gültigkeit,
41 interne Links inklusive Anker, Mobile-Navigation (Dialogrolle, Fokus-Trap über 25 Tabs,
Escape, Fokusrückgabe, `inert`), Lightbox (dieselben Punkte plus Pfeiltasten),
Referenzenfilter mit Live-Region, Formularvalidierung beider Formulare, Schrittsteuerung
des Anfrageformulars, Reduced-Motion-Fassung, fünf Viewports und Tastaturdurchlauf mit
Prüfung des Fokusrings auf 30 Elementen.

**Durchgehend:** 0 Konsolenfehler, 0 Konsolenwarnungen, 0 HTTP-Fehler, 0 fehlende Assets,
0 horizontaler Overflow (360 / 390 / 768 / 1024 / 1440 / 1920 px).

---

## Offene Punkte

1. **Formulare senden weiterhin per `mailto:`.** Ein echter Endpoint (Formspree, Web3Forms,
   eigener Handler) ist eine Kunden- und Vertragsentscheidung (Kosten, AV-Vertrag) und wurde
   nicht eigenmächtig eingebaut. Der Umschaltpunkt ist vorbereitet: `SUBMIT_ENDPOINT` in
   `assets/js/main.js`. Bis dahin erklärt die Seite den Sendeweg vorab und bietet eine
   Kopier-Rückfalllösung.
2. **`index.html` mobil: LCP 2,9 s** statt der angestrebten 2,5 s (siehe oben).
3. **Startseite bleibt mit 19,6 Bildschirmhöhen lang.** Der gepinnte Filmstreifen belegt
   davon rund 3730 px. Das ist für eine horizontale Projektgalerie vertretbar, aber wer
   die Seite weiter straffen will, kürzt zuerst hier.
4. **`.plots` (Kachelraster) steht noch auf `gartengestaltung.html` und `404.html`** mit je
   zwei Elementen. Das Ausgangsaudit hat den Umfang dieses Legacy-Rasters überschätzt —
   es sind nur diese beiden Stellen. Eine Angleichung an die editoriale Sprache der
   Startseite ist möglich, aber kein Mangel.
5. **AVIF** wurde nicht ergänzt. WebP deckt alle Zielbrowser ab; nach der
   `sizes`-Korrektur ist der Zusatznutzen gering.
6. **Kein automatischer Abgleich der Shared Blocks.** Navigation, Footer und
   Kontaktdaten sind weiterhin auf 14 Seiten kopiert (bewusste Entscheidung gegen einen
   Build-Step). Ein Prüfskript, das alle Seiten gegen `index.html` vergleicht, wäre die
   nächste sinnvolle Absicherung.
