# CLAUDE.md — de Vries Galabau · Bauanleitung

> **Audience = ich selbst in künftigen Sessions.** Vor jeder größeren Änderung ERST diese Datei lesen,
> dann Code hinterfragen. Nach jeder Änderung diese Datei aktualisieren (§Änderungsprotokoll).
> Schwesterprojekt (eigener Look, NICHT vermischen): `C:\Users\Tolun\Rene` = die **Pflege**-Seite
> (warmes Papier + Fraunces-Serif + **Rot**).
>
> **Aktueller Look seit v8 (2026-07-30): „Gartenrundgang".** Heller Grünton `#EDF3E8`,
> milchige Glaskarten, Outfit + Instrument Serif, Leitidee **ein Rundgang durch einen Garten**
> (begehbare 3D-Startseite). Maßgeblich ist `DESIGN-AND-MOTION-SYSTEM.md`.
> ~~Bis v7: Editorial-Natur, Grün + Erdtöne + Ton, Display-Grotesk, „Vom Strich zum Garten".~~

## 0. Selbstcheck vor jeder Änderung
1. **Was will der Nutzer?** Awwwards-Niveau, individuell, emotional, hochwertig, aber vertrauenswürdig
   & bedienbar. Keine Template-/Bootstrap-Optik, keine generischen grünen Service-Cards.
2. **Mobile ist Pflicht** — jede Section/Animation MUSS bei 360–390 px sauber sein, im selben Schritt.
3. **Bricht es den Design-Vertrag (§8)?** Wenn ja → zurück zum Briefing.
4. **Inhalt faktentreu?** Sachdaten aus `CONTENT_INVENTORY.md`/`.planning/ingest/`. Nichts erfinden
   (keine Stellen, Zahlen, Bewertungen). Rechtstexte verbatim.
5. **Performance/Perf-Budget (§11) & prefers-reduced-motion** eingehalten?

---

## 1. Projekt-Identität
- **Kunde:** de Vries Galabau (Wortmarke „de Vries GaLa-Bau"; Langform „de Vries Garten- und
  Landschaftsbau"). Inhaber **Andreas de Vries**, Familienbetrieb **seit 1998**, **Salzhemmendorf**.
  >25 Jahre Erfahrung. Schwesterbetrieb: Pflege/Betreuung unter andreasdevries.de.
- **Leistungen (real, 4 Säulen):** Gartengestaltung · Gartenplanung · Gartenpflege · Bepflanzung.
  Querschnitt: Pflasterarbeiten, Natursteinmauern, Gabionen, Treppenbau, Sanierungen, Hochbeete,
  altersgerechte Gestaltung, Trockenmauern, Klinkermauern.
- **Logo:** grüner **DV-Monogramm-Kachel** (feine weiße Linien D+V auf Grün) — Datei
  `assets/img/logo-galabau.*` (aus der Live-Seite, echtes Markenlogo). Als gerundete Kachel in Nav +
  Footer einbinden (wie Referenz). Das Linien-Monogramm passt zur Leitidee (Linie → Garten).
- **Stammkontakt (überall identisch, bei Änderung global grep'en):** siehe `CONTENT_INVENTORY.md`
  → Tel `05153 1552` (`tel:051531552`), `info@devries-galabau.de`, Büro **An den Flachsrotten 2,
  31020 Salzhemmendorf**, Bauhof **Salzhemmendorfer Straße 2**, Mo–Fr 8–16 Uhr, USt DE192201141,
  FB `devriesdienstleistungen`, IG `dv_devries`, Einsatzgebiet Salzhemmendorf/Hameln/Hildesheim.
- **Vorlage des Redesigns:** die Live-WordPress-Seite devries-galabau.de (vollständig analysiert,
  verbatim Inhalte + Bilder unter `.planning/ingest/`).

### Zielgruppe
Privatkunden (Vorgärten bis große Außenanlagen) im Raum Salzhemmendorf/Hameln/Hildesheim, teils
gewerblich; Menschen mit Interesse an Qualität, individueller & naturnaher Gestaltung, Zuverlässigkeit.

### Ziele
- **Marke:** hochwertig, naturnah, handwerklich glaubwürdig, lebendig, eigenständig.
- **Conversion:** Weg zu „Kostenlose Anfrage" (5-Schritt) und Kontakt maximal klar; Sticky-CTA.
- **Technik:** statisch, kein Build-Step, self-contained, DSGVO-konform (keine externen CDNs/Fonts/
  Tracking), gute Core Web Vitals. **Accessibility:** WCAG-orientiert (§Accessibility).

---

## 2. Quellen der Wahrheit
- **Inhalte/Kontakt/Leistungen/Referenzen:** `CONTENT_INVENTORY.md` + `.planning/ingest/pages/*.json`
  + `.planning/ingest/DIGEST.md`. Nichts erfinden. Sprachlich verbessern erlaubt, inhaltlich nicht.
- **Bilder & Lizenzen:** `IMAGE_SOURCES.md`.
- **Referenz-Engine (zur Orientierung, nicht 1:1 kopiert):** `.planning/ingest/ref-css-spec.md`,
  `ref-js-spec.md` (destillierte Specs der Pflege-Seite).
- **Rechtstexte:** verbatim aus `pages/impressum.json` / `pages/datenschutz.json`.

---

## 3. Tech-Stack & Prinzip

> **⚠ Seit v8 („Gartenrundgang") gilt ein anderer Aufbau als unten beschrieben.**
> Es gibt **keine** `style.css` und **keine** `main.js` mehr, kein GSAP, kein Lenis, keine
> Shared Blocks per Copy-Paste. Maßgeblich ist **`DESIGN-AND-MOTION-SYSTEM.md`**.
> Kurzfassung des heutigen Stands:
> - `assets/css/base.css` — **nur** Schriftbindung, Sprungmarke, Fokusring, `.sr-only`.
>   Das Aussehen steht im `<style>`-Block und den Inline-Styles **jeder Seite**, genau wie
>   im Design-Projekt. Das ist Absicht: so bleibt jede Seite einzeln mit der Vorlage
>   vergleichbar. **Keine gemeinsame Stildatei anlegen.**
> - Kopf- und Fußzeile sind **Web Components** mit Shadow DOM
>   (`assets/js/garden-header.js`, `garden-footer.js`) — kein Copy-Paste mehr, eine Quelle.
>   Aktiver Punkt über `active="…"`, CTA-Ziel über `cta="…"`.
> - Je Seite **eine** Logikdatei `assets/js/<seite>.js` (Reveals, ggf. Formular).
> - `assets/js/three.min.js` **nur** auf `index.html` (3D-Gartenrundgang).
> - Cache-Busting weiterhin `?v=N` auf allen Seiten gleichzeitig hochzählen (aktuell `v=8`).
>
> Die folgenden Absätze 3, 6.1–6.5 und 7 beschreiben den v1–v7-Stand und bleiben nur als
> Entwicklungsgeschichte stehen — **nicht** als Vorgabe.

- **Statisches HTML + eine CSS-Datei + eine Vanilla-JS-Engine + Lenis (lokal).** Kein Framework,
  kein Build. Läuft direkt (GitHub Pages / Netlify / `python -m http.server`).
- **Warum:** identisch zum bewährten Schwesterprojekt; DSGVO-sicher (alles self-hosted); schnell;
  wartbar ohne Toolchain. Lokales Projekt war leer → Neuaufbau, Stack bewusst so gewählt.
- **Shared Blocks** (head-Muster, topbar, nav, mobile-nav, footer, cookie, scripts) sind auf JEDER
  Seite **kopiert** (kein Include). **Quelle der Wahrheit = `index.html`.** Ändert sich Nav/Footer/
  Kontakt → auf ALLEN Seiten nachziehen. Aktiver Nav-Link automatisch per JS (`aria-current` aus
  `location.pathname`), nicht hardcoden.

---

## 4. Dateistruktur (Ist, Stand v8)
```
.
├── index.html              # Startseite = 3D-Gartenrundgang + flache Abschnitte
├── ueber-uns.html
├── gartengestaltung.html · gartenplanung.html · gartenpflege.html · bepflanzung.html
├── referenzen.html         # 6 Projektkarten + 3 Bewertungen im Wortlaut
├── kontakt.html            # Kontaktwege + Ablauf + Anfrageband (mailto)
├── anfrage.html            # ein Formular, Auftraggeber/Bereich/Zeitraum (mailto)
├── danke.html              # Erfolgsseite (noindex)
├── stellenangebote.html    # aktuell KEINE Stellen + Initiativbewerbung
├── impressum.html · datenschutz.html   # Rechtstexte verbatim
├── 404.html                # (noindex)
├── <alt-slug>/index.html   # 20 Weiterleitungs-Stubs auf die alten WordPress-URLs
├── assets/
│   ├── css/base.css        # NUR Schriften, Sprungmarke, Fokusring, .sr-only
│   ├── js/garden-header.js · garden-footer.js   # Web Components (Shadow DOM)
│   ├── js/<seite>.js       # Seitenlogik, eine Datei je Seite
│   ├── js/three.min.js     # nur index.html
│   ├── fonts/              # outfit-300/400/500/600/700, instrument-serif (+italic), woff2
│   └── img/                # optimierte WebP (‑1600/‑800), logo, favicons, og; raw/ = Originale (nicht deployen)
├── CLAUDE.md · CONTENT_INVENTORY.md · DESIGN-AND-MOTION-SYSTEM.md · IMAGE_SOURCES.md
├── README.md · robots.txt · sitemap.xml · _redirects · .htaccess · .nojekyll
└── .planning/              # Analyse/Arbeitsstände, Recherche, altes Design (NICHT deployen)
```

## 5. Seitenübersicht → siehe `CONTENT_INVENTORY.md` (Mapping alt→neu, Inhalt je Seite, Status).
Seit v8 tragen die **vier Leistungsseiten bewusst denselben Aufbau** (Hero · Bild · sechs
Nummernkarten · Textspalte mit Punktliste · Anfrageband) — so hat das Design es angelegt, die
Seiten unterscheiden sich über Text, Foto und Akzentwort. Eigene Dramaturgie haben:
- **Startseite:** 3D-Gartenrundgang mit sieben Stationen, danach Galerie, Materialien, Ablauf,
  Einsatzgebiet, Fragen, Anfrage.
- **Referenzen:** sechs Projektkarten mit Foto + drei Bewertungen im Wortlaut.
- **Über uns:** drei Kennzahlen, Bild, vier Gründe, Ortsliste als Chips.
- **Stellenangebote:** ehrlicher Stand (keine offene Stelle) + Initiativbewerbung.

> Die folgende Aufzählung beschreibt den v1–v7-Stand und gilt nicht mehr:
> ~~Gartenplanung mit Plan-Draw-Signatur, Gartenpflege mit Jahreszeiten-Rhythmus,
> Referenzen als Masonry mit Filter und Lightbox.~~

---

## 6. Design-System (Design-Vertrag — NICHT aufweichen)

> **⚠ Seit v4 gilt eine andere Palette und eine andere Display-Schrift als in §6.1/§6.2 unten
> beschrieben.** Die maßgebliche, gepflegte Fassung steht in **`DESIGN-AND-MOTION-SYSTEM.md`**
> (Farben mit gemessenen Kontrastwerten, Typografie, Raster, Motion-Tokens, Reduced Motion,
> Mobile Motion). Die folgenden Abschnitte 6.1–6.2 dokumentieren den v1-Stand und bleiben
> nur als Entwicklungsgeschichte stehen — **nicht** als Vorgabe.

### 6.1 Farbe — HISTORISCH (v1), ersetzt durch DESIGN-AND-MOTION-SYSTEM.md §2
| Token | Wert | Rolle |
|---|---|---|
| `--ink` | `#16211A` | Haupttext, dunkle Typo |
| `--ink-2` | `#3A473E` | Sekundärtext |
| `--muted` | `#6A7268` | gedämpfter Text (grün-grau) |
| `--pine` | `#152A1D` | dunkelste Fläche (Bänder/Hero-Overlay) |
| `--green` | `#3E7A3A` | **Markengrün** (nah am Logo), Akzent/Links/aktiv |
| `--green-deep` | `#2A5A2C` | Hover/Tiefe |
| `--leaf` | `#7A9E52` | helles Blattgrün (kleine Akzente, Blühzonen) |
| `--clay` | `#B85C34` | **Terrakotta** (CTA/Emphase, SPARSAM) |
| `--clay-deep` | `#9A4A28` | Clay-Hover |
| `--paper` | `#EEEDE3` | Haupt-Lesefläche (warmes Kalkstein-Oat mit Grün-Hauch; NICHT KI-Creme, NICHT Pflege-Papier) |
| `--paper-2` | `#E4E2D5` | zweite Fläche (Boden-/Oat-Ton), alternierende Sections |
| `--paper-3` | `#D6D7C8` | Ränder/Tertiär |
| `--chalk` | `#F6F6F0` | hellste Fläche (Cards auf Paper) |
| `--white` | `#ffffff` | |
| `--line` | `rgba(22,33,26,.12)` | Haarlinien (alpha auf ink → adaptiv) |
| `--line-strong` | `rgba(22,33,26,.22)` | stärkere Linien |
Dunkelmodus-Flächen: `--paper`-Text auf `--pine`. **Info nie nur über Farbe** transportieren.

### 6.2 Typografie — HISTORISCH (v1), ersetzt durch DESIGN-AND-MOTION-SYSTEM.md §3
- `--display: "Bricolage Grotesque", "Segoe UI", sans-serif` — Headlines, große Zahlen, Wortmarke.
  Charaktervolle variable Grotesk (klar verschieden von der Fraunces-Serif der Pflegeseite).
- `--body: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — Fließtext/UI.
- `--mono: "JetBrains Mono", ui-monospace, monospace` — **Eyebrows, Plot-/Koordinaten-Marker,
  Section-Index, Kategorie-Labels** (kodiert das „Plan"-Thema; UPPERCASE, letter-spacing ~.18em).
- Fluid-Scale (clamp — **⚠️ Leerzeichen um `+`/`-` in clamp/calc, sonst tot!**):
  `--fs-eyebrow .78rem`, `--fs-body clamp(1rem, .96rem + .2vw, 1.12rem)`, `--fs-lead clamp(1.15rem,
  1.02rem + .6vw, 1.5rem)`, `--fs-h4`, `--fs-h3`, `--fs-h2 clamp(2rem, 1.4rem + 3vw, 4rem)`,
  `--fs-h1 clamp(2.6rem, 1.5rem + 5.5vw, 7rem)`, `--fs-mega` (Hero). Werte final in style.css.

### 6.3 Layout / Struktur
- `--wrap: 1240px` Container; großzügiger Weißraum; asymmetrische, kontrollierte Editorial-Grids.
- **Struktur = Information:** Plot-Marker/Koordinaten (mono) + Haarlinien + nummerierte Prozess-
  Schritte NUR wo es echte Sequenz gibt (Arbeitsablauf, Planungsschritte). Keine Deko-Nummern.
- Radien dezent (`--r: 3px` technisch / `--r-lg: 14px` Cards/Bilder). Schatten sehr sparsam.

### 6.4 Buttons / Interaktion
- `.btn` Pille (`border-radius:999px`): primär **grün** mit Ink-Wipe-Hover; `.btn--clay` (Terrakotta,
  Haupt-CTA sparsam), `.btn--ghost`, `.btn--light` (auf dunkel). Magnetisch via `data-magnetic` (nur
  Desktop, nicht touch/reduce). `.link-arrow` für Textlinks. Fokus: sichtbarer Ring (`--green`).

### 6.5 Z-Index-System
scroll-prog 90 · topbar 60 · nav 70 · mobile-nav 100 · cookie 110 · lightbox 120.

---

## 7. Motion-System — HISTORISCH (v1–v7), ersetzt durch DESIGN-AND-MOTION-SYSTEM.md §5
> `main.js`, GSAP und Lenis existieren seit v8 nicht mehr. Bewegung läuft heute über einen
> IntersectionObserver je Seite plus die rAF-Schleife des Gartenrundgangs auf `index.html`.

### HISTORISCH: Motion-System („Vom Strich zum Garten") — `assets/js/main.js`
Adaptiert aus der bewährten Referenz-Engine; Hooks:
- **Lenis Smooth-Scroll** (lokal, guarded `typeof window.Lenis`, aus bei `reduce`, `smoothTouch:false`).
- **Reveals:** ein IntersectionObserver togglet `.is-in` auf `[data-reveal]` (Varianten `left|right|
  scale`), `[data-stagger]` (per-Kind `--i`), `.reveal-words` (Split-Text word-rise). Danach `unobserve`.
  ⚠️ `[data-reveal="left|right"]` brauchen `:not(.is-in)` für den Versatz (sonst Overflow); horizontale
  Reveals nie in schmalen Spalten.
- **Counters** `[data-count]` — NUR belegte Zahlen (1998, 25). cubic-ease, `toLocaleString('de-DE')`.
- **Magnetic Buttons** `[data-magnetic]` (Desktop only).
- **Batched Scroll rAF** (`applyScroll()` hinter rAF-Gate): Progress-Bar (`#scrollProg` scaleX),
  Nav `is-scrolled` (>24px), Parallax `[data-parallax]`, **Plan-Draw-Fortschritt** & Timeline.
- **Signatur „Plan-Draw":** SVG-Pfade mit `stroke-dasharray` (`getTotalLength()`) zeichnen sich beim
  Scrollen (`.plan-draw path`, `.dv-draw`), Beet-/Wege-Outlines → lösen sich in Fotos auf. **Eigenes,
  originales SVG** (kein fremdes Plan-Foto) → lizenzfrei, on-brand (DV-Linien-Logo).
- **Mobile-Nav** `#navBurger` → `#mobileNav` (clip-path-circle reveal, `--i`-Stagger, Body-Scroll-Lock
  + `lenis.stop()`, Esc/Close/Linkklick schließt). Flache Navigation (kein Dropdown nötig).
- **Cookie** `#cookie` nach ~1.4s, `localStorage 'dvg-cookie-ok'`.
- **Kontaktformular** `#contactForm` → Validierung → **mailto-Fallback** an info@devries-galabau.de.
- **Anfrage** `#anfrageForm` → 5 Schritte mit Fortschrittsbalken, Pro-Schritt-Validierung, Weiter/
  Zurück; Submit → mailto (alle Felder) → Erfolgs-/danke-Zustand.
- **Referenzen:** `.filter` Chips (Kategorie) + Masonry + **Lightbox** (zugänglich: Fokus-Trap, Esc,
  Pfeile, `aria`), lazy Bilder.
- Alle Animationen ehren `prefers-reduced-motion` (globaler Kill-Switch am CSS-Ende) und laufen
  performant (rAF-Gate, off-screen-Gate, keine Listener-Leaks).

---

## 8. Code-Hygiene (❌/✅)
**❌** zweite CSS-Datei/`<style>` in Seiten · Tokens umbenennen · Google-Fonts/CDN laden · Body kühles
Reinweiß · Inline-`style=` außer Motion-`--i`/`--parallax` · Inhalte erfinden · absolute alte
WordPress-Links · `scroll`-Listener ohne rAF-Gate · clamp/calc ohne Spaces um `+`/`-`.
**✅** Shared Blocks synchron · `prefers-reduced-motion` ehren · Bilder lazy (außer Hero) + deutsche
`alt` + `width`/`height` (aus `assets/img/img-manifest.json`) · relative Pfade · Cache-Busting
`?v=N` bei CSS/JS-Änderung auf ALLEN Seiten hochzählen · vor „fertig" Browser-Smoke-Test.

## 9. Formulare
- **Kontakt** (`kontakt.html` `#contactForm`): Name*, E-Mail*, Betreff*, Nachricht (optional) → Senden.
  Client-Validierung, Fehlermeldungen inline, Consent-Checkbox (Datenschutz), Erfolgszustand. Versand
  = `mailto:info@devries-galabau.de` (kein Backend). **Upgrade:** Endpoint (Formspree/Web3Forms/eigener
  Handler) in `main.js` an EINER Stelle austauschbar (`SUBMIT_ENDPOINT`), sonst mailto-Fallback.
- **Anfrage** (`anfrage.html` `#anfrageForm`): 5 Schritte (Privat/Gewerbe · Bereich · Beschreibung ·
  Zeitraum · Kontaktdaten+Erreichbarkeit), Fortschrittsbalken, Pflichtfelder, Telefon-Pattern.
  Trust-Hinweis. Submit → mailto → danke.html. Gleicher Upgrade-Pfad.

## 10. Bildverwaltung → Details in `IMAGE_SOURCES.md`.
Priorität echte Firmen-/Projektfotos. Optimiert als WebP `‑1600.webp` + `‑800.webp` (srcset), Dimensionen
in `assets/img/img-manifest.json` (für `width`/`height` gegen CLS). Lazy außer Hero/Phero. Alt deutsch,
beschreibend. Originale in `assets/img/raw/` (nicht deployen).

## 11. Performance-Budget
CSS eine Datei · JS `main.js` + `lenis.min.js` (~13 KB), keine weiteren Libs ohne Grund · Fonts 3×
woff2 self-hosted mit `preload` · Bilder WebP + lazy + Dimensionen · kein Auto-Play-Video · externes:
NUR ggf. Consent-gated Karte. rAF-gated Scroll, keine Leaks.

## 12. SEO
Pro Seite: `<title>`, `description`, `canonical`, OG/Twitter, `lang=de`. JSON-LD `LocalBusiness`
(Adresse An den Flachsrotten 2, geo Salzhemmendorf, openingHours Mo–Fr 8–16, founder Andreas de Vries,
foundingDate 1998, areaServed, sameAs FB/IG) auf `index`. `sitemap.xml` + `robots.txt`. Alte Slugs per
Redirect-Stub erhalten (`/kostenlose-anfrage/`→anfrage, `/blogs/`→referenzen, Service-Slugs identisch).
`danke.html` = `noindex`. Fehlende H1/Descriptions der Altseite überall beheben. Regionale Begriffe
(Salzhemmendorf, Hameln, Hildesheim) natürlich integrieren.

## 13. Accessibility
Semantik + eine H1/Seite + Überschriften-Hierarchie · Tastaturbedienung + sichtbarer Fokus · Kontraste
· Formular-Labels + verständliche Fehler · Alt-Texte · Skip-Link · Lightbox/Mobile-Nav als zugängliche
Dialoge (Fokus-Trap, Esc, `aria-modal`) · reduzierte Bewegung · Touch-Ziele ≥44px · Info nie nur Farbe.

## 14. Technische Entscheidungen
- **Statischer Stack** statt WordPress/React: DSGVO, Speed, Wartbarkeit, Parität zur Schwesterseite.
- **Bricolage Grotesque + Manrope + JetBrains Mono** statt Fraunces: eigenständige Garten-Identität,
  Grotesk statt Serif (kein KI-Creme-Serif-Default), Mono kodiert das Plan/Blueprint-Thema.
- **Palette Grün/Erdton/Ton** statt Rot (Pflege) und statt KI-Creme: aus echtem Hero-Foto + Logo
  abgeleitet; Terrakotta nur als sparsamer CTA-Akzent.
- **Signatur = eigenes SVG-Plan-Draw** statt fremdem Plan-Stockbild (Lizenz + Originalität).
- **Referenzen = Referenzen+Blogs zusammengeführt** (die Blogs SIND die Projekt-Referenzen).
- **Formulare mailto-Fallback** (kein Backend nötig, funktioniert sofort; Upgrade dokumentiert).

## 15. Bekannte Probleme / Risiken / offene Punkte
- Formulare senden per mailto (kein serverseitiger Empfang/Speicher) bis echter Endpoint gesetzt ist.
- Consent-Karte (Kontakt) lädt Google Maps erst nach Klick (DSGVO) — sonst statisches Karten-Bild/Link.
- Datenschutz-Passus „Google Fonts": wir laden KEINE Google-Fonts → Abweichung im Rechtstext markieren
  (Text nicht verfälschen; Hinweis-Kommentar). USt/Adresse-Widerspruch der Altseite: Firmenadresse
  An den Flachsrotten 2 kanonisch (Rechtstext verbatim, aber Structured Data konsistent).
- Bilder teils quer/hochformat gemischt → Masonry statt starres Raster.

## 16. Vorgehen bei Änderungen
1. CLAUDE.md lesen → 2. Seite/Funktion + Abhängigkeiten identifizieren → 3. bestehende Komponente
erweitern statt parallele bauen → 4. Desktop+Mobile im selben Schritt → 5. Browser-Smoke-Test →
6. Shared Blocks synchron → 7. CLAUDE.md + ggf. CONTENT_INVENTORY aktualisieren.

## 17. Wichtige technische Lehren (bei QA gefunden — NICHT zurückdrehen)
- **`.reveal-words` NIE `display:inline` geben.** Wird die Klasse direkt auf ein Block-`<h2>` gesetzt,
  macht `display:inline` die ganze Headline inline → sie fließt neben den `.eyebrow` (Überlappung).
  Klasse enthält jetzt KEIN display; als `<span>` (Hero) bleibt sie eh inline. Split passiert nur per JS
  (`main.js`), daher ist reveal-words ohne JS von selbst sichtbar (No-JS-safe).
- **`.wrap--narrow` / `.wrap--wide` brauchen `margin-inline:auto`** (nicht nur `.wrap`). Sonst kleben
  Formular/Legal-Prose am linken Rand. Werden von Agenten standalone genutzt.
- **`.steps__bar` MUSS INNERHALB `<form id="anfrageForm">` liegen** — `main.js` sucht `.steps__fill`/
  `.steps__count` mit `$(sel, aform)` (form-scoped). Außerhalb → Fortschrittsbalken/Zähler tot.
- **`.hero__inner` KEIN `width:100%`** — überschreibt sonst die `.wrap`-Breite (gleiche Spezifität,
  spätere Regel gewinnt) → Hero-Text klebt am Rand. `.wrap` regelt die Breite.
- **Reveal-Hidden-Zustand ist mit `.js` gegatet** (`html.js [data-reveal]{opacity:0}`). Inline-Head-
  Script `classList.add('js')` setzt die Klasse VOR dem CSS. Ohne JS ist alles sichtbar (SEO/A11y).
- **`clamp()`/`calc()`: immer Leerzeichen um `+`/`-`** (sonst ganze Eigenschaft ungültig). Check:
  `grep -oE '(clamp|calc)\([^)]*\)' style.css | grep -E '[a-z0-9%.]\)?[+-][0-9.]'` muss leer sein.
- **`html,body{overflow-x:clip}`** fängt die transienten `[data-reveal="right/left"]`-translateX ab →
  kein horizontaler Scroll auf Mobile (bei 375px geprüft: 0 Overflow).
- **CSP als `<meta>`** auf allen Seiten: `script-src/style-src 'self' 'unsafe-inline'` (Inline-JS-Class +
  `style="--i"`), `img-src 'self' data:` (Mask-SVGs), `frame-src https://*.google.com` (Consent-Karte),
  `form-action 'self' mailto:`. Bei neuem externen Einbund CSP anpassen.

### Neu in v7 (2026-07-27) — teuer erkauft, NICHT zurückdrehen

- **`.wrap` darf NIE direktes Flex-Item sein.** `width: min(100% - 2 * var(--gut), var(--wrap))`
  löst im Flex-Kontext **inhaltsbasiert** auf statt gegen die Containerbreite. Gemessen:
  688 px statt 1345 px — der Hero-Text klebte randlos am Viewport. `.chapter` ist deshalb
  ein **Grid** mit `align-items:end` und `.chapter__inner{grid-area:1/1}`.
  Das ist dieselbe Falle wie früher bei `.hero__inner`, nur mit anderer Ursache: damals ein
  überschreibendes `width:100%`, jetzt der Flex-Kontext selbst. **Regressionstest:**
  x-Offset von `.chapter__inner` muss gleich dem von `.nav__inner` sein.
- **`.plx-frame` setzt bewusst KEIN `position`.** `.chapter__media` ist absolut positioniert;
  ein `position:relative` von der Utility-Klasse löst es aus seiner Verankerung — das
  Hero-Bild verschwindet ersatzlos.
- **`clipPath` mit GSAP immer via `fromTo()` und vier expliziten Werten auf beiden Seiten.**
  Die CSS-Kurzform `inset(45%)` wird sonst als EIN Wert gelesen; animiert wird dann nur die
  obere Kante und das Bild klappt nach unten auf statt sich aus der Mitte zu öffnen.
- **Der Mono-Preload ist nicht optional.** Ohne ihn wächst der Topbar-Kontaktblock beim
  Schriftwechsel von 22 px auf 68 px und schiebt den Hero nach unten: CLS 0,094 statt 0.
  Die reservierte Mindesthöhe allein genügt nicht, weil der Inhalt INNERHALB umbricht.
- **`aria-label` gehört nicht auf ein `<span>` ohne Rolle** (axe: `aria-prohibited-attr`).
  Der Wort-Splitter legt den Originaltext stattdessen als `.sr-only`-Knoten daneben.
- **Kein `aria-label`, das den sichtbaren Text ersetzt** (axe: `label-content-name-mismatch`).
  Beim Telefonlink ist die sichtbare Nummer der bessere zugängliche Name.
- **`sizes` nach tatsächlicher Anzeigebreite setzen, nie pauschal `100vw`.** Der Browser
  multipliziert selbst mit der Pixeldichte. Ein 44 px hohes Materialband lud sonst eine
  263-KB-Datei; über alle Bilder machte das 1657 KB statt 879 KB aus.
- **Überschriftengröße kommt aus einer Klasse, die Ebene aus der Struktur.**
  Footer-Spalten sind `<h2 class="footer__h">` und trotzdem 0,72 rem groß. Umgekehrt
  (kleine Ebene für kleine Optik) erzeugte auf jeder Seite H2→H4-Sprünge.
- **Vor „fertig": Klassenabgleich fahren.** Alle `class="…"`-Werte aus dem Markup gegen CSS
  und JS prüfen. So kam heraus, dass `.btn--clay` in 13 Dateien benutzt, aber nirgends
  definiert war — sämtliche Haupt-CTAs waren ungestylt.
- **Kompression ist Teil der Auslieferung, nicht des Codes.** `.htaccess` liegt bei.
  Ohne sie: Performance 86 statt 95 bei identischem Code.

### Neu in v8 (2026-07-30) — Übernahme aus dem Design-Projekt, NICHT zurückdrehen

- **Das Aussehen gehört in die Seite, nicht in eine Sammeldatei.** Klingt falsch, ist hier
  aber Absicht: Die Vorlage ist ein Design-Projekt, und nur solange jede Seite ihre Styles
  selbst trägt, lässt sich Zeile für Zeile gegen die Vorlage prüfen. Wer daraus eine
  gemeinsame `style.css` destilliert, verliert genau diese Prüfbarkeit.
- **`minmax(min(100%, 250px), 1fr)` — das `min()` ist nicht schmückend.** Ohne es erzwingt
  `minmax` bei 375 px eine 250-px-Spalte plus Gaps und die Seite läuft waagerecht über.
  Das Design hat es überall; beim Umbau nicht wegkürzen.
- **`placeholder` aus `<image-slot>` taugt nicht als Alt-Text.** Dort standen Arbeitsnotizen
  („Team bei der Arbeit — Foto einsetzen") und dreimal nur „Projektfoto". Der Konverter
  übernimmt das Attribut, also muss es vorher inhaltlich stimmen.
- **Ein Entwurf ist kein Faktencheck.** Im Design standen drei erfundene Stellenanzeigen,
  gekürzte Zitate unter den Namen echter Rezensenten, falsche Öffnungszeiten und ein
  Impressum mit „bitte ergänzen". Alles davon hätte live geschadet. Vor der Übernahme jede
  Sachangabe gegen `CONTENT_INVENTORY.md` und die Livesite halten.
- **Kontraste des Entwurfs nachrechnen, nicht glauben.** `#4F8524` auf Glas sind 4,23 : 1 —
  bei 11 px Labels zu wenig. Jetzt `#46761F`.
- **`get_file` der Design-Schnittstelle kappt bei 256 KiB.** `Gartenrundgang.dc.html` ist
  größer; `tick` bricht bei `const yaw = Math.atan` ab. `write_files` ersetzt **die ganze**
  Datei — ein Zurückschreiben der gelesenen Hälfte würde den ungelesenen Rest löschen.
  Lösung war: gelesene Hälfte von der Platte (`scratchpad/design/…`, exakt 262 144 Bytes) plus
  nachgereichter Rest, an genau dieser Zeile zusammengesetzt. **Die abgeschnittene Datei auf
  der Platte nicht löschen**, sie ist die einzige Kopie der vorderen Hälfte.
- **Ein fehlendes Klassenfeld sieht aus wie ein toter Renderer.** `requestAnimationFrame(this.tick)`
  mit undefiniertem `tick` wirft, und zwar in der letzten Zeile von `componentDidMount` —
  alles davor lief bereits. Symptom war eine schwarze Leinwand bei sonst intakter Seite.
- **Software-WebGL im Testbrowser schafft 0,4–3 fps.** Zwei Fallen daraus: „0 neue
  Zeichenaufrufe" in einem kurzen Fenster heißt nicht „rendert nicht", und `this.p += … * 0.031`
  braucht dort **Minuten** statt Sekunden, um eine Station weiterzukommen. Wer mit 1,5-Sekunden-
  Wartezeiten prüft, sieht immer Station 0 und hält die Schleife fälschlich für kaputt.
  Belegen über einen Zähler auf `WebGLRenderingContext.prototype.drawElements` und lange
  Wartefenster — `page.screenshot` läuft bei einer Dauerschleife ohnehin in den Timeout.
- **`prefers-reduced-motion` fehlte im Entwurf vollständig.** Es gab nur `props.motion`, fest
  auf 1. Der Regler wird jetzt von der Systemeinstellung geführt; Vögel, Enten, Falter und
  Bienen mussten zusätzlich an `MO > 0` gehängt werden, weil sie im Original nicht daran hingen.
- **Screenshots fremder Websites gehören nicht ins Kundenrepo.** 19 Recherchebilder von
  Aesop, Terremoto, Vogt und anderen lagen im öffentlichen Repository. Liegen jetzt unter
  `.planning/recherche-screenshots/`.

## 18. Änderungsprotokoll
- **2026-07-21** — **Komplettbau v1.** Vollanalyse Live-Seite (21 URLs) + Referenz-Engine + Assets.
  Fonts (Bricolage/JetBrains Mono/Manrope self-hosted), 34 echte Bilder → WebP `‑1600/‑800` + Favicons +
  OG + Manifest. `style.css` (Designsystem/Komponenten/Motion) + `main.js` (Lenis, IO-Reveals, reveal-
  words-Split, Counter, Magnetic, batched-Scroll-rAF, Plan-Draw, Mobile-Nav, Cookie, Map-Consent, Kontakt-
  Formular mailto, 5-Schritt-Anfrage mailto, Referenzen-Filter, Lightbox). **14 Seiten** gebaut (index,
  4 Leistungen, referenzen, kontakt, anfrage, ueber-uns, stellenangebote, danke[noindex], 404[noindex],
  impressum, datenschutz — Legal verbatim). SEO: robots.txt, sitemap.xml, `_redirects` + 20 Meta-Refresh-
  Stubs für alte WordPress-URLs. **QA (Playwright, Desktop 1440 + Mobile 375):** Formular-Flow, Filter,
  Lightbox, Mobile-Nav, 0 Konsolenfehler, 0 Overflow, CSP ohne Violations. Bugs gefixt (siehe §17).
  Designrichtung „Vom Strich zum Garten" (Plan-Draw-Signatur, Grün/Erdton/Ton, Grotesk-Display).
- **2026-07-21 · v2 „Awwwards-Ausbau"** (Feedback: v1 wirkte zu sehr wie Standard-Template). Neue
  **Elevation-Layer in `style.css` §30 + `main.js`** (wirkt global, `?v=2` auf allen Seiten):
  Film-Körnung (`body::after` feTurbulence-SVG) · **eigener Plot-Cursor** (Desktop, `body.has-cursor`,
  Ring+Dot, Hover-Skalierung) · **Intro-Loader** (nur `#loader` auf index.html: DV-Monogramm zeichnet
  sich, Wipe-up) · **Seiten-Übergangs-Vorhang** (`.curtain`, JS-injiziert, interne Links) · **Material-
  Marquee** (`.marquee`) · **Outline-Typo** (`.txt-outline`, `-webkit-text-stroke`) · **Blueprint-Grid**
  im Hero (`.hero__grid-overlay`) + **auf jedem Phero** (`.phero::before`) · **HUD-Koordinaten**
  (`.hero__hud`) + Sweep-Linie · **Übergroß-Zahlen** (`.bignum`, `.plot__idx` Outline) · **Plan-Signatur
  jetzt DUNKEL** (`section.plan.bg-pine`, Blueprint in `--leaf` auf `--pine`) · Clip/Img-Reveals.
  Hero-Headline zweifarbig (Strich = Clay `#e08b52`, Garten = Leaf `#b6d68a`, riesig). Alles
  `prefers-reduced-motion`-fest (§29 erweitert). QA: Mobile 360px 0 Overflow, 0 Konsolenfehler,
  CSP ok, 506 Links ok.
- **2026-07-21 · v3 (Feedback-Korrektur, `?v=3`).** Nutzer: Loader-Logo sah nicht aus wie das echte,
  Plan-SVG „extrem schlecht". Fixes: **Loader nutzt jetzt das ECHTE Logo** (`logo-galabau.webp`, Scale/
  Fade-in + Linie + Wortmarke) statt nachgezeichnetem Monogramm. **Abstrakte SVG-Plan-Sektion ENTFERNT**
  und ersetzt durch **`.story-band`** = cinematischer Vollbild-**Foto**-Moment (echtes Vorgarten-Bild,
  Parallax, dunkler Verlauf) mit riesigem Editorial-Zitat „Jeder Garten erzählt eine Geschichte …" +
  EINER eleganten Clay-Linie (statt Doodle). Merke: **Fotos führen, keine gezeichneten Grafiken.** Auch
  Hero-Sweep-Linie `--sl` + Story-Linie `--sl2` per JS gesetzt (getTotalLength). **Cache-Bug behoben:**
  `?v` muss bei JEDER CSS/JS-Änderung hochgezählt werden, sonst sehen wiederkehrende Besucher altes CSS
  (war wohl Grund für „fast nichts verändert").
  **Offen:** echter Formular-Endpoint (aktuell mailto), ggf. Perf-Feinschliff großer `‑1600.webp`.

- **2026-07-21 · v4 „Atelier"-Neustart (`?v=4`, komplette visuelle Überarbeitung).** Feedback: v1–v3
  wirkten trotz Politur wie Standard-Template. **Recherche** (echte Landschafts-Ateliers Terremoto,
  Piet Oudolf, Vogt, Dan Pearson, Aesop + Awwwards-Techniken) ergab: Problem war die **Struktur**, nicht
  die Politur. Konsequenz — **style.css komplett neu (editorial „Atelier"):** warmes Papier `--paper
  #f1eee4`, Near-Black `--ink`, EIN Rust-Akzent `--rust #b4501e`, Grün nur noch Logo/Mini-Akzent.
  **Display = Instrument Serif** (self-hosted, ersetzt Bricolage-Grotesk als Display) + Manrope (Body) +
  JetBrains Mono (Micro-Labels). **Buttons = dünne, ungefüllte Rechtecke** (kein Pill). **KEINE Karten-
  Raster, KEINE Deko-01/02/03, KEIN Stock-Hero-mit-Overlay+Pill** (Awwwards-Antipattern). Neue Homepage
  = **Film-Kapitel** statt Blöcke: Vollbild-Hero (Riesen-Serif „Gärten, die mit dem *Leben wachsen.*")
  · Typo-Manifest · Marquee · **Leistungen als Hover-Reveal-Index** (`.svc-index`, Foto erscheint hinter
  Namen) · **gepinnter Clip-Reveal** (`.reveal-pin`, Foto öffnet sich beim Scrollen, GSAP scrub) ·
  **horizontaler Filmstreifen** (`.filmstrip`, GSAP pin+scrub) · Makro-Material-Grid · **Zahlen als Typo**
  (`.figures`) · **eine große Pull-Quote** statt Karussell · Closing-Statement. **Neu: GSAP + ScrollTrigger
  self-hosted** (`assets/js/gsap.min.js`, `ScrollTrigger.min.js`) — mit Lenis über `gsap.ticker`
  synchronisiert; nur für die 2 Signatur-Scroll-Momente (Rest = IO-Reveals/CSS). Split-Text jetzt mit
  `aria-label` (A11y). Unterseiten erben das neue System automatisch (gleiche Klassen, re-skinned;
  `.plots`/`.quotes` flach editorial). **QA:** Hero/Hover-Index/Clip-Reveal/Filmstreifen/Formular
  verifiziert, Mobil 375px 0 Overflow, 0 Konsolenfehler (1 harmloser Font-Preload-Warn auf Formularseite).
  Merke: **Fotos + Editorial-Serif + Struktur-Bruch führen — nicht Effekt-Stacking.**

- **2026-07-21 · v5 (`?v=5`) — treibendes Blatt + Regen (Landing-Page, Nutzerwunsch).** EIN elegantes
  SVG-Blatt (`#leaf`, `assets/js/main.js` GSAP-ScrollTrigger scrub über `document.body`) wandert beim
  Scrollen sanft schwankend (sin-Drift X, Rotation) die Startseite hinab; dezenter Regen (`#rain`, reine
  CSS-Animation, sichtbar v.a. über dunklen Foto-Sektionen). Beides `pointer-events:none`, unter der Nav,
  **`prefers-reduced-motion` → ausgeblendet**, nur Homepage (Element-gated). Bewusst EIN Blatt, kein
  Partikel-Schwarm (Awwwards-Antipattern). **Kein Hintergrund-Video** eingebaut: kein lizenziertes,
  self-hostbares Gartenvideo vorhanden + Auto-Play-Video widerspricht Perf/DSGVO/Antipattern — Blatt-im-
  Regen ist die leichte, markentreue Alternative. Falls echtes Video gewünscht: Clip vom Kunden nötig,
  dann Scroll-Scrubbing via GSAP. QA: 0 Konsolenfehler, 0 Overflow (Blatt fixed + pointer-none).

- **2026-07-21 · v6 (`?v=6`)** — Treibendes Blatt + Regen auf Nutzerwunsch **wieder komplett entfernt**
  (war nicht gemeint). Startseite zurück im cleanen v4-Editorial-Zustand; 0 Konsolenfehler.

- **2026-07-27 · v7 „Schicht für Schicht" (`?v=7`, Branch `improvement/awwwards-motion-upgrade`).**
  Vollaudit mit Playwright über 14 Seiten × 2 Viewports, danach Umbau. Vollständige Fassung:
  `AUDIT-BEFORE-UPGRADE.md`, `CHANGELOG-AWWWARDS-UPGRADE.md`, `DESIGN-AND-MOTION-SYSTEM.md`.
  **Kritisch behoben:** Hero-Container brach aus der `.wrap` aus (Flex→Grid, siehe §17) ·
  Intro-Loader entfernt (verdeckte das LCP-Element >2,5 s) · JS-Seitenvorhang (480 ms
  Verzögerung je Navigation) ersetzt durch die View-Transitions-API + Prefetch.
  **Neu entdeckt:** `.btn--clay` und `.btn--ghost` standen in 13 Dateien im Markup, waren
  aber nie im CSS definiert — alle Haupt-CTAs ungestylt. Ebenso `.cta-band__grid` und
  `.mnav__cta`. Tote Regelblöcke entfernt.
  **Accessibility:** Fokus-Trap für Mobile-Nav und Lightbox (existierte trotz §7 nicht),
  `inert` für den Hintergrund, Dialogrollen, Überschriftenhierarchie auf allen 14 Seiten,
  Kontraste (`--muted` 3,49→5,25 : 1, `--rust` 4,40→4,95 : 1), Touch-Ziele 44 px,
  Sicherheitsnetz falls `main.js` ausfällt. **Lighthouse Accessibility 91→100.**
  **Motion:** ein Satz Tokens für alle Dauern/Kurven · Signature Moment „Plan wird Garten"
  (Vermessungslinien folgen exakt den Kanten des Fotos, viewBox = Bildformat) ·
  Parallax-System in drei Tiefenstufen (vorher: null Parallax im gesamten Projekt) ·
  Leistungs-Scrollytelling auch auf Touch · Reduced Motion als eigene, kürzere Fassung
  statt `duration:0` · eigene Mobile-Regie.
  **Performance (gzip, identische Bedingungen vorher/nachher):** CLS überall 0,12→0 ·
  Startseite mobil 90→95, ueber-uns 81→97, gartengestaltung 87→98, referenzen 92→99 ·
  Datenvolumen Startseite mobil 1657→879 KB (dreistufiges `srcset`, `sizes` nach echter
  Anzeigebreite, eigene `-bg`-Varianten für die vier Hover-Hintergründe) · Layout-Thrashing
  in der Scrollschleife beseitigt · `.htaccess` mit Kompression und Caching ergänzt.
  **SEO:** BreadcrumbList auf 11 Seiten, `Service` auf den 4 Leistungsseiten,
  `CollectionPage` auf Referenzen; strukturierte Daten 7/14 → 12/14. Kein `JobPosting`
  (es gibt keine offenen Stellen), keine Bewertungen, keine Preise.
  **QA:** eigene Abnahmesuite, **93/93 bestanden** — Konsole, Netzwerk, 41 interne Links
  inkl. Anker, Fokus-Trap über 25 Tabs, Escape, Fokusrückgabe, Formulare, Filter, Lightbox,
  Reduced Motion, 6 Viewports, Fokusring auf 30 Elementen.
  **Offen:** Formular-Endpoint (weiterhin `mailto`, `SUBMIT_ENDPOINT` vorbereitet) ·
  Startseite mobil LCP 2,9 s statt 2,5 s · Startseite bleibt 19,6 Bildschirmhöhen lang.
  Merke: **Erst messen, dann urteilen.** Zwei der drei größten Funde (undefinierte
  Button-Klassen, Flex-Kontext der `.wrap`) waren durch reine Codelektüre nicht sichtbar.

- **2026-07-30 · v8 „Gartenrundgang" (`?v=8`, Branch `redesign/gartenrundgang`).** Auf Wunsch
  **das komplette v4–v7-Design entfernt** und durch das Claude-Design-Projekt *Gartenrundgang*
  ersetzt (1:1, Abweichungen einzeln begründet in `DESIGN-AND-MOTION-SYSTEM.md` §9).
  **Weg:** `assets/css/style.css`, `assets/js/main.js`, `gsap.min.js`, `ScrollTrigger.min.js`,
  `lenis.min.js`, die drei alten Schriftfamilien, Cookie-Banner, Karten-Consent.
  **Neu:** `assets/css/base.css` (nur Schriften + Sprungmarke + Fokusring + `.sr-only`),
  Kopf- und Fußzeile als **Web Components mit Shadow DOM**, je Seite eine Logikdatei,
  `three.min.js` nur auf der Startseite. Schriften Outfit + Instrument Serif, selbst
  ausgeliefert statt von Google.
  **Startseite** ist jetzt ein begehbarer 3D-Garten: Kamera läuft beim Scrollen eine
  `CatmullRomCurve3` entlang, sieben Stationen blenden Text ein, danach flache Abschnitte.
  Die Bildschleife (`tick`) ist **das Original**: Die Quelldatei überschreitet das Leselimit
  der Design-Schnittstelle und bricht bei `const yaw = Math.atan` ab; sie wurde aus der
  gelesenen vorderen Hälfte und dem vom Auftraggeber nachgereichten Rest an genau dieser Zeile
  zusammengesetzt (Naht geprüft: Klammerbilanz, Parser, alle 48 Felder vorher gesetzt).
  Ein zwischenzeitlicher Nachbau wurde vollständig ersetzt.
  **Reduzierte Bewegung** ergänzt: Das Design fragte `prefers-reduced-motion` nie ab: der
  Regler `props.motion` wird jetzt davon geführt, Tiere zusätzlich an `MO > 0` gehängt,
  Reveals ohne Versatz und mit `.35s` statt `.9s`.
  **14 Seiten** neu: 8 aus dem Design konvertiert, 4 selbst gebaut (Datenschutz — rechtlich
  vorgeschrieben, Text wortgleich aus dem Bestand — sowie Anfrage, Danke, 404), Impressum mit
  echten Angaben statt des Platzhalters.
  **Inhaltlich korrigiert, weil der Entwurf Erfundenes enthielt:** drei Stellenanzeigen
  (es gibt keine offene Stelle), Zitate unter echten Namen, Öffnungszeiten 7:30–17:00.
  **Barrierefreiheit:** Kleinlabel `#4F8524` → `#46761F` (4,23 → 5,15 : 1), beschreibende
  Alt-Texte, `.sr-only`-Überschriften, `role="img"` auf den Bewertungssternen, Sprungmarke,
  globaler Fokusring.
  **Aufgeräumt:** 19 Recherche-Screenshots fremder Websites und das gesamte Audit-Material des
  alten Designs aus dem öffentlichen Baum nach `.planning/` verschoben.
  **QA (Playwright, 1440 + 375 px, alle 14 Seiten):** 0 Konsolenfehler, 0 HTTP-Fehler,
  0 waagerechter Überlauf, je genau eine H1, alle Bilder geladen mit Alt-Text, alle Reveals
  lösen aus, Stationen wechseln beim Scrollen, Zeichenaufrufe der 3D-Szene belegt.
  **Offen:** Formular-Endpunkt (weiterhin `mailto`, `SUBMIT_ENDPOINT` in `anfrage.js`
  vorbereitet) · Lighthouse für das neue Design noch nicht gemessen · Projektkarten auf
  `referenzen.html` verweisen auf die Berichte unter devries-galabau.de, bis es eigene
  Detailseiten gibt · `main` trägt noch das alte Design.
