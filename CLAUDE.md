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
> - Cache-Busting weiterhin `?v=N` auf allen Seiten gleichzeitig hochzählen (aktuell `v=11`).
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
│   ├── js/formular.js      # EINE Stelle fuer den Formularversand (mailto / Supabase)
│   ├── js/<seite>.js       # Seitenlogik, eine Datei je Seite
│   ├── js/three.min.js     # nur index.html
│   ├── fonts/              # outfit-300/400/500/600/700, instrument-serif (+italic), woff2
│   └── img/                # optimierte WebP (‑1600/‑800), logo, favicons, og; raw/ = Originale (nicht deployen)
├── supabase/schema.sql     # Tabelle + RLS, NICHT deployen (nur Arbeits-Branch)
├── SUPABASE.md             # Anleitung + offene Entscheidungen, NICHT deployen
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
- **Entwürfe bringen Autorenwerkzeug mit — auf einer Livesite ist das eine Lücke.**
  Die Startseite hatte einen Seiten-Editor (`setupAdmin`, `#rg-admin`), zu öffnen mit `#admin`,
  `?admin` **oder Alt + A**, also von jedem Besucher. Er machte Texte über `contentEditable`
  änderbar und spielte Gespeichertes aus `localStorage` per `innerHTML` zurück — damit ist
  alles in diesem Speicherplatz ausführbares Markup. Entfernt. **Achtung beim Entfernen:** der
  Formularversand der Startseite hing im selben Block und musste als `setupForm()` bleiben.
- **Wortwahl aus dem Entwurf gegen das Fachvokabular prüfen.** „Fünf Gewerke: Weg, Mauer, Beet,
  Wasser, Platz" — das sind Bauteile, keine Gewerke, und Garten- und Landschaftsbau ist selbst
  *ein* Gewerk. Auf der Seite eines Handwerksmeisters fällt so etwas dem auf, der die Leistung
  einkauft. Jetzt „Fünf Bereiche".
- **CSP nach dem Umbau nachziehen.** `data:`, `blob:` und `frame-src` auf Google-Domains
  stammten aus dem alten Aufbau (SVG-Masken, Consent-Karte). Erst prüfen (keine
  `data:`-Bildquelle, kein `createObjectURL`, kein `iframe` im Baum), dann streichen.
  `frame-ancestors` gehört **nicht** ins `<meta>` — dort wirkt es nicht, es steht in `.htaccess`.
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

- **2026-07-30 · v8 „Gartenrundgang" (`?v=9`, Branch `redesign/gartenrundgang`).** Auf Wunsch
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

- **2026-07-30 · v9 (Nacharbeit am selben Tag).** Vier Punkte, alle auf `redesign/gartenrundgang`:
  **1.** Die Bildschleife des Gartenrundgangs ist jetzt das **Original** statt eines Nachbaus —
  vordere Hälfte aus der abgeschnittenen Design-Datei, hintere vom Auftraggeber nachgereicht,
  zusammengesetzt bei `const yaw = Math.atan`.
  **2.** `prefers-reduced-motion` ergänzt (das Design fragte es nie ab): führt `props.motion`,
  Tiere zusätzlich an `MO > 0`, Reveals ohne Versatz mit `.35s`.
  **3.** „Fünf Gewerke" → **„Fünf Bereiche"** an vier Stellen der Startseite; Weg, Mauer, Beet,
  Wasser und Platz sind Bauteile, keine Gewerke.
  **4. Sicherheitsdurchgang:** Der aus dem Entwurf mitgebrachte **Seiten-Editor ist entfernt**
  (`setupAdmin`, `#rg-admin`, `data-edit`/`data-optional`/`data-add`) — er ließ sich mit Alt + A
  von jedem Besucher öffnen und spielte `localStorage` per `innerHTML` zurück. Der
  Formularversand blieb als `setupForm()`. **CSP enger gefasst** auf allen 14 Seiten:
  `data:`, `blob:` und `frame-src` auf Google-Domains gestrichen, nachdem geprüft war, dass
  nichts davon mehr gebraucht wird. Geprüft und unauffällig: keine DOM-Injektion mit
  eingesetzten Werten, alle `mailto:`-Felder über `encodeURIComponent`, keine Geheimnisse,
  kein `target="_blank"` ohne `noopener`, kein Formular mit fremdem `action`, keine externe
  Einbindung außer den Verweisen im Rechtstext.
  **QA:** 13 Unterseiten × 2 Viewports ohne Befund; Startseite Desktop und Mobil je 0
  Konsolenfehler, 0 HTTP-Fehler, 0 Überlauf; Alt + A und `#admin` bewirken nichts mehr.

- **2026-07-30 · v10 — Deployment und Formular-Anbindung.**
  **Veröffentlicht:** `main` trägt jetzt den Gartenrundgang; live geprüft, alle 15 Routen im
  neuen Design, Kompression aktiv (`index.js` 145 → 37 KB, `three.min.js` 589 → 147 KB),
  0 Konsolenfehler auf Startseite, Kontakt und Impressum. Beim Deployment aus dem
  öffentlichen Baum genommen: die 19 Recherche-Screenshots fremder Studioseiten sowie
  `CLAUDE.md`, `CONTENT_INVENTORY.md`, `DESIGN-AND-MOTION-SYSTEM.md`, `IMAGE_SOURCES.md`.
  `main` ist ein Orphan-Branch ohne gemeinsamen Vorfahren — gesetzt wird er per
  `git read-tree --reset -u redesign/gartenrundgang`, dann die internen Unterlagen aus dem
  Index nehmen und committen.
  **Supabase vorbereitet, nicht aktiv:** neue Datei `assets/js/formular.js` als **einzige**
  Stelle für den Versand; alle sieben Formulare laufen darüber. Zugangsdaten leer →
  Verhalten unverändert `mailto`, kein Aufruf nach außen. `supabase/schema.sql` legt die
  Tabelle mit Row Level Security an: `anon` darf **nur** einfügen, es gibt bewusst keine
  `select`-Regel — sonst könnte jeder Besucher alle Kundenanfragen lesen, denn der
  Schlüssel steht im Quelltext. Offen und in `SUPABASE.md` festgehalten: Projekt anlegen
  (Region Frankfurt), AVV, Absatz in der Datenschutzerklärung, `connect-src` in der CSP.
  Geprüft gegen einen lokalen Nachbau der REST-Schnittstelle: normaler Fall speichert und
  leitet auf `danke.html`, Fehler 500 fällt auf `mailto` zurück, Honigtopf und Zeitschwelle
  greifen — beide **ohne** stilles Verwerfen, die Nachricht geht per `mailto` trotzdem raus.

- **2026-07-31 · Supabase eingerichtet, bewusst noch nicht veröffentlicht.**
  Zugang kam über die lokal angemeldete Supabase-CLI — kein Token ging durch den Chat.
  **Erst falsch abgebogen:** Tabelle im Projekt `de-vries` angelegt, das aber zur
  Pflege-Seite gehört (sechs `devries_*`-Tabellen: Bewerbungen mit Geburtsdatum,
  Terminbuchungen, Kontakte). Auf Zuruf sofort zurückgebaut — Tabelle gedroppt, Konfiguration
  und CSP zurückgesetzt, Projekt exakt im Vorzustand. **Lehre: vor dem ersten `create table`
  prüfen, wem das Projekt gehört, nicht nur ob es passend heißt.**
  **Dann richtig:** eigenes Projekt `devries-galabau` (Ref `pvcbgwzqjnzzpehwuywi`, Frankfurt),
  Tabelle `public.galabau_anfragen`, RLS an **und erzwungen**, genau eine Policy (`insert`
  für `anon`), keine `select`-Regel. Gegenprobe mit dem echten öffentlichen Schlüssel gegen
  die Live-Schnittstelle: einfügen 201, lesen 401, ändern 401, löschen 401, Nachricht über
  5000 Zeichen 400, E-Mail ohne @ 400. Browsertest Ende zu Ende: POST 201, Zeile mit allen
  Feldern und korrekten Umlauten, weiter zu `danke.html`, keine CSP-Verletzung.
  **Nicht deployt**, weil zwei Dinge fehlen, die nur der Betreiber erledigen kann: der
  Auftragsverarbeitungsvertrag mit Supabase und der Absatz in der Datenschutzerklärung.
  Freischalten und den Rechtstext nachziehen hieße, in der Zwischenzeit Kontaktdaten ohne
  Grundlage weiterzugeben; einen Text einzusetzen, der einen ungeschlossenen Vertrag
  behauptet, wäre ebenso falsch. Details in `SUPABASE.md`.
  **Nebenbefund am fremden Projekt (nicht geändert):** die sechs `devries_*`-Tabellen haben
  RLS an, aber **null Policies** und trotzdem `anon`-Grants für SELECT und INSERT. Aktuell
  dicht — geprüft, alle liefern `[]`. Wer dort je eine freizügige Policy ergänzt oder RLS
  abschaltet, öffnet damit sofort den Lesezugriff auf Bewerbungsdaten. Die Grants gehören
  entzogen.
  **`supabase/.temp/` steht jetzt in `.gitignore`** — dort liegen Verbindungszeichenfolgen.

- **2026-07-31 · Mail-Benachrichtigung über das eigene Postfach.**
  Ohne sie wäre der Umstieg auf Supabase ein Rückschritt gewesen: die Anfrage hätte nur noch
  in einer Tabelle gelegen, die jemand aktiv öffnen muss. Jetzt ruft ein Trigger auf
  `galabau_anfragen` die Edge Function `anfrage-mail` auf, die per SMTP über
  `info@devries-galabau.de` benachrichtigt — **kein weiterer Auftragsverarbeiter**, deshalb
  auch kein zusätzlicher Absatz in der Datenschutzerklärung.
  **Bewusst entkoppelt:** `pg_net` arbeitet asynchron. Scheitert der Versand, bleibt die Zeile
  trotzdem in der Tabelle — nachgewiesen mit einer Antwort `503` bei fehlenden SMTP-Secrets.
  Eine Anfrage geht nie verloren, weil ein Mailserver hustet.
  **Schutz der Funktion:** sie läuft ohne JWT-Prüfung, damit der Trigger keinen Dienstschlüssel
  hinterlegen muss. Stattdessen ein gemeinsames Geheimnis im Kopf `x-anfrage-token`. Ohne oder
  mit falschem Token: 401, geprüft. Der Token wurde zufällig erzeugt, ist als Secret gesetzt
  und steht **nicht** im Repository — in `supabase/webhook.sql` bleibt ein Platzhalter.
  **Kopfzeilen-Einschleusung abgewehrt:** Name und E-Mail wandern in Betreff und `Reply-To`.
  Ohne Bereinigung ginge `Name\r\nBcc: opfer@…` als eigene Kopfzeile durch. Umbrüche und
  Tabulatoren werden entfernt, Längen begrenzt, `Reply-To` nur bei plausibler Adresse.
  Zehn Fälle durchgespielt, alle bestanden.
  **Falle, die eine halbe Stunde gekostet hat:** `create extension pg_net with schema
  extensions` wird ignoriert — pg_net legt immer sein eigenes Schema `net` an. Der Aufruf
  `extensions.net.http_post` scheitert dann mit *cross-database references are not
  implemented*, und weil das im Trigger passiert, **schlug jedes Einfügen fehl** (HTTP 400).
  Richtig ist `net.http_post` mit `search_path = public, net`. Merke: nach dem Anlegen eines
  Triggers immer einen echten Datensatz durchschicken, nicht nur die Existenz prüfen.
  **Offen für den Betreiber:** ein Befehl, `supabase secrets set SMTP_USER=… SMTP_PASS=…`.
  Die Postfach-Zugangsdaten habe ich bewusst nicht angefasst.

- **2026-07-31 · Handy-Regie überarbeitet (Nutzerbefund an Screenshots).**
  **Menü:** Das Overlay (`z-index:45`) verdeckte die Kopfzeile (`40`) — es gab weder Logo noch
  Rückweg, und bei 868 px Inhalt in 844 px Fenster rutschten Anfrage-Knopf und Telefonnummer
  unten raus. Jetzt eigene Kopfleiste im Overlay (Logo links, ✕ rechts), deckender Hintergrund
  und **drei Zonen**: fester Kopf, scrollbare Mitte, fester Fuß. Zweitrangige Seiten
  zweispaltig. 844 px ohne Scrollen, alle elf Seiten erreichbar.
  **Fußzeile:** 1216 → 762 px (32 → 23 % der Seite). Die gezeichnete Gartenszene (230-px-
  Blumenband + 104-px-Band) fällt unter 760 px weg. **Falle:** Das Design setzt sämtliche
  Abstände als **Inline-Style** — ohne `!important` greift keine einzige Regel aus dem
  Stylesheet. Erst gemessen (185 px Kopfpolster blieben stehen), dann verstanden.
  **Ablauf-Abschnitt war defekt, nicht nur unschön:** vier gestapelte Karten (1108 px) in
  einer Box mit `sticky` + `height:100vh` + `overflow:hidden` → abgeschnitten, während der
  Container 300 vh hoch blieb. 1400 px Leerlauf, Laufleiste zählte 01→03 durch, obwohl
  dieselbe Karte im Bild stand, Karte 04 nie erreichbar. Auf Mobil jetzt normaler Fluss ohne
  `sticky`, Laufleiste aus, `padding-top:120px` des Filmstreifens entfernt.
  **Merke:** `offsetTop` ist relativ zum `offsetParent`. Bei der ersten Diagnose lagen alle
  Scrollpositionen noch im Rundgang, und der Abschnitt wirkte fälschlich in Ordnung. Für
  absolute Positionen `getBoundingClientRect().top + scrollY` nehmen.
  **three.js wird nachgeladen statt fest eingebunden.** Gepackt 146 KB — 85 % des
  Ladegewichts der Startseite. Am Desktop sofort, auf dem Handy erst auf „Rundgang starten".
  Vorher steht ein Standbild (Foto + die vorhandene Begrüßungstafel des Entwurfs, **kein
  zweiter eigener Text** — der lag unter der Tafel und war unleserlich), die Bahn ist nur
  112 vh statt 1000. Nach dem Start 400 vh statt 1000 — vier Bildschirmhöhen statt zehn.
  Belegt: vor dem Tippen **null** Aufrufe von `three.min.js`, Seite 15432 statt 22557 px.
  **Merke:** an `body` angehängte Elemente erben die Schriftfamilie nicht — die sitzt am
  inneren Container, sonst fällt alles auf die Serifenschrift zurück.
  **Mailziel** vorübergehend auf eine Abnahmeadresse, zentral in `formular.js` (`EMPFAENGER`)
  und als Secret `MAIL_TO`. Angezeigte Adressen unverändert. **Vor dem Livegang zurückstellen.**

- **2026-07-31 · v26 — Supabase live, Bewerbungen, Mail-Vorlagen, Verwaltung.**
  Der Nutzer hat dreimal bestätigt, ohne weitere Rückfrage zum Auftragsverarbeitungsvertrag
  fortzufahren. Die Anbindung ist damit **aktiv ausgeliefert**; der Datenschutzabsatz nennt
  Supabase und die Auftragsverarbeitung.
  **Zweite Tabelle `galabau_bewerbungen`** samt Formular auf `stellenangebote.html`. Gleiche
  Rechtelage wie bei den Anfragen: RLS an und erzwungen, `anon` darf **nur** einfügen.
  Nachgeprüft: Lesen mit dem öffentlichen Schlüssel liefert 401 für beide Tabellen.
  **Verwaltungsfelder** `status`, `notiz`, `archiviert` auf beiden Tabellen — beschreibbar
  ausschließlich über die Edge Function.
  **Mail-Vorlagen** in `supabase/functions/anfrage-mail/vorlage.ts`: eine Gestaltung, zwei
  Fassungen (Anfrage/Bewerbung), als Tabellen-Layout mit Inline-Styles gebaut, weil
  Mailprogramme modernes CSS ignorieren. Jede Mail geht zusätzlich als reiner Text raus.
  Alle eingesetzten Werte laufen durch `maskieren()`.
  **Backoffice `verwaltung.html`** im Aufbau der Schwesterseite CuraDoma (Anmeldung,
  Kachelübersicht mit Zählern, Liste mit Suche und Statusfiltern, Detail mit Status, Notiz,
  Archiv, Löschen, CSV-Export) — aber in unserer Palette und **ohne Build-Schritt**, weil
  CuraDoma React/Vite nutzt und dieses Projekt bewusst statisch bleibt.
  **Sicherheit:** Das Passwort wird ausschließlich serverseitig geprüft, im Quelltext der
  Seite steht kein Geheimnis. Gelesen wird nie direkt aus der Datenbank — der öffentliche
  Schlüssel darf das nicht. Die Funktion arbeitet intern mit `service_role`, der den Server
  nie verlässt. Bereichsnamen laufen über eine Erlaubnisliste (Versuch mit `pg_user` → 400),
  schreibbar sind nur drei Felder, `status` gegen eine feste Liste geprüft (Versuch mit
  `boese` → 400). Falsches Passwort: 401 nach 900 ms Verzögerung. `verwaltung.html` steht
  auf `noindex` und in `robots.txt`.
  **Auf dem Telefon nur lesen** — Anfragen und Bewerbungen einsehen, Status und Notiz nur am
  Rechner. Nachgeprüft in beiden Breiten.
  **Merke:** Umlaute in `curl -d` werden von dieser Shell falsch kodiert und erzeugen ein
  irreführendes `PGRST102 Empty or invalid json`. Aus dem Browser geht dasselbe durch.

- **2026-07-31 · Anmeldebremse fuer die Verwaltung.** Das gewuenschte Passwort ist Firmenname
  plus Jahreszahl — genau das Muster, das beim Durchprobieren zuerst drankommt. Statt nur zu
  warnen, waechst die Antwortzeit jetzt mit der Zahl der Fehlversuche der letzten 15 Minuten
  (0,9 s → bis 8 s, Tabelle `verwaltung_versuche`, nur ueber `service_role` erreichbar).
  **Bewusst KEINE harte Sperre:** die liesse sich von aussen ausloesen, um den Betreiber
  auszusperren. Ein richtiges Passwort kommt sofort durch und setzt die Zaehlung zurueck.
  Gemessen: 1,6 → 1,8 → 2,6 → 4,1 → 6,2 s bei fuenf Fehlversuchen, richtiges Passwort 0,38 s.

- **2026-07-31 · Mailkette geprüft, Bewerbungen waren stumm, Logo in die Vorlagen.**
  **1. SMTP:** Secrets sind gesetzt, die Kette läuft bis zum letzten Schritt, dort weist
  Strato ab: `535 5.7.8 Authentication failed [MSG0037]`. Bevor das dem Passwort
  zugeschrieben wurde, sind die Alternativen ausgeschlossen worden — MX der Domain ist
  `smtpin.rzone.de` (also wirklich Strato), Benutzername ist die vollständige Adresse ohne
  Randleerzeichen, Absenderdomain passt. Bleibt der Passwortwert; das ist Sache des
  Betreibers. **Merke:** Diese CLI-Fassung hat keinen `functions logs`-Befehl. Den Grund
  bekommt man, indem die Funktion ihn im `502` zurückgibt — das landet nur in
  `net._http_response` und die ist ausschließlich über `service_role` lesbar.
  **Falle dabei:** ein zusätzlicher Verbindungsversuch auf Port 587 in der Diagnose ließ
  die Funktion in die Zeitgrenze laufen; die Plattform antwortete dann mit `503` **ohne
  Inhalt**, was wie „SMTP-Secrets fehlen" aussah. Diagnosen schlank halten.
  **2. Bewerbungen wurden nie gespeichert.** `galabau_bewerbungen` kannte weder `quelle`
  noch `betreff`, `formular.js` schickt beide bei **jedem** Versand mit → PostgREST
  `PGRST204`, HTTP 400, stiller Rückfall auf `mailto`. Aufgefallen erst, weil ein Testlauf
  denselben Datensatz wie das echte Formular schickte. **Merke: mit dem echten Datensatz
  testen, nicht mit einem selbst gebauten Mindestbeispiel.** Zusätzlich baut die Mail-
  Funktion den Betreff aus `betreff` — ohne die Spalte trüge jede Bewerbungsmail
  „Neue Anfrage über die Website". Beide Spalten ergänzt, mit nachziehendem `ALTER`, weil
  `create table if not exists` eine vorhandene Tabelle unberührt lässt.
  **3. Markenlogo in beiden Mail-Vorlagen**, als **CID-Anhang**: entfernte Bilder sind in
  Mailprogrammen standardmäßig blockiert (leerer Kasten bis zum Klick), jeder Abruf verrät
  den Lesezeitpunkt, und ein Verweis auf die Website bräche beim Domainwechsel. **PNG statt
  WebP** (versteht kaum ein Mailprogramm), runder Ausschnitt und weißer Ring **ins Bild
  gebacken**, weil Outlook mit der Word-Engine rendert und `border-radius` ignoriert.
  Kopfbalken als Tabelle mit zwei Spalten, aus demselben Grund. 128 × 128 für 58 px
  Anzeige, 2610 Bytes.
  **Nebenbefund:** eine lange E-Mail-Adresse zwang die Mailkarte auf 347 px Mindestbreite —
  auf einem 320-px-Telefon stand sie schief. Mit Umbruch im Wort sind es 224 px. **Der
  zuerst vermutete Grund war falsch:** die 150 px breite Beschriftungsspalte wurde ohnehin
  auf 109 px gestaucht und war nie die Ursache. Erst messen, dann behaupten.
  **4. „Verwaltung nicht erreichbar"** war kein Fehler: Seite (200), Skript (200) und
  Anmeldung (200) arbeiten einwandfrei unter
  `https://chaos20140.github.io/devries-galabau/verwaltung.html`. Versucht worden war
  offenbar `devries-galabau.de/verwaltung.html` — diese Domain liefert weiterhin die alte
  WordPress-Seite aus (Apache/PHP, Elementor), daher 404. Adresse steht jetzt im README.

- **2026-07-31 · Zwei stumme Fehler im Bewerbungsformular (v27).**
  Der Reihe nach gefunden, weil ein Test über den **echten** Weg lief statt über `curl`:
  **1. Die CSP blockierte den Versand.** `stellenangebote.html` trug als **einzige** der acht
  Formularseiten `connect-src 'self'` ohne die Supabase-Adresse. Der Browser unterband jeden
  Aufruf. Zusammen mit den fehlenden Spalten `quelle`/`betreff` heißt das: das
  Bewerbungsformular hat **nie** etwas gespeichert — auch nach der Spaltenkorrektur nicht.
  **Merke: bei „Formular tut nichts" zuerst `connect-src` DIESER Seite prüfen.** Die CSP steht
  je Seite im `<meta>`, es gibt keine gemeinsame Quelle, also fällt eine vergessene Seite
  niemandem auf. Prüfbefehl:
  `for f in *.html; do grep -q dvFormular "$f" && { printf "%-24s " "$f"; grep -oE "connect-src [^;\"]*" "$f"; }; done`
  **2. Der Rückfall war völlig stumm.** `formular.js` setzt bei einem Fehler
  `window.location.href` auf eine `mailto:`-Adresse. Ist **kein E-Mail-Programm hinterlegt** —
  auf vielen Rechnern und in **jedem** Testbrowser der Fall — passiert daraufhin sichtbar
  **nichts**: keine Fehlermeldung, keine Weiterleitung, keine Zeile in der Datenbank. Genau
  das hat Fehler 1 verdeckt. Der Rückfall nennt jetzt den Grund im Protokoll (Serverantwort,
  Zeitüberschreitung, fehlgeschlagene Verbindung samt CSP-Hinweis) und zeigt dem Besucher
  nach 1,2 s eine Zeile mit Mailadresse und Telefonnummer. Dort steht **immer** die Adresse
  des Betriebs, nie die vorübergehende Abnahmeadresse.
  **3. Falle beim Prüfen:** `curl` holte die neue Seite, der Browser nahm die **alte aus dem
  Zwischenspeicher** — CSP `'self'`, Skripte noch `v=26`. Das `?v=` schützt nur die Skripte,
  die HTML-Seite selbst trägt keine Kennung. Nach einem Deployment mit einem Zusatz in der
  Adresse laden (`?frisch=1`), sonst prüft man den alten Stand.
  **Geprüft, live:** Bewerbung über das echte Formular → `danke.html`, Zeile vollständig mit
  Umlauten, `<b>` in der Nachricht erscheint in der Verwaltung als Text (0 gerenderte
  Elemente). Bei künstlich blockierter CSP erscheint der Hinweis und es wird nichts
  gespeichert. Kontaktformular nach dem Umbau von `senden()` unverändert in Ordnung.

- **2026-07-31 · Gegenprüfung mit vier Blickwinkeln: 11 Befunde behoben (v28).**
  56 Prüfagenten über Mail-Vorlagen, Edge Functions und Verwaltung; jeder Befund von zwei
  Gegeninstanzen auf Widerlegung geprüft. 11 bestätigt, 15 widerlegt. Der CSP-Fehler auf
  `stellenangebote.html` wurde dabei unabhängig noch einmal gefunden — er steht unter
  „widerlegt", weil er zwischenzeitlich behoben war.
  **Der schwerste Befund — die Anmeldebremse war keine.** Sie ließ nur die *Antwort* langsamer
  werden. Ein `setTimeout` innerhalb einer Anfrage blockiert keine andere: bei 200 parallelen
  Verbindungen und 8 s Obergrenze waren das rund 25 Rateversuche je Sekunde, also 90 000 pro
  Stunde. Gegen ein Passwort aus Firmenname und Jahreszahl reicht das in Minuten. Meine
  dokumentierte Begründung („keine harte Sperre, sonst sperrt man den Betreiber aus") deckte
  nur eine **globale** Sperre ab — pro Anschluss besteht das Problem nicht.
  **Behoben in drei Anläufen, jeder gemessen:**
  1. Grenze je Anschluss, oberhalb davon 429 **ohne Passwortvergleich**. Sequentiell wirksam
     (ab dem 13. Versuch 429 in 0,28 s), aber bei 30 gleichzeitigen kamen 22 durch.
  2. Zusätzlicher Zähler im Arbeitsspeicher, der **ohne `await`** hochläuft. Besser, aber von
     40 gleichzeitigen kamen 26 durch: Supabase startet unter Last **mehrere Instanzen**, jede
     mit eigenem Speicher — die Grenze vervielfacht sich mit ihrer Zahl.
  3. **Richtig:** Eintragen und Zählen in *einem* SQL-Aufruf mit `pg_advisory_xact_lock` auf
     dem Anschluss (`public.verwaltung_versuch`). Damit ist die Reihenfolge dort seriell, wo
     sie es wirklich ist. Gemessen: **genau 12 von 40** gleichzeitigen Versuchen erreichen den
     Vergleich. Statt 90 000 Rateversuchen je Stunde sind es 48.
  **Merke: eine Wartezeit ist keine Begrenzung.** Wer nebenläufig arbeitet, wartet parallel.
  Und ein Zähler im Arbeitsspeicher einer Funktion, die mehrfach gestartet wird, zählt
  mehrfach. Serialisieren muss man dort, wo es genau eine Instanz gibt — in der Datenbank.
  **Ehrlich zum Preis:** oberhalb der Grenze kommt auch das *richtige* Passwort nicht durch,
  weil es nicht mehr verglichen wird. Beides zusammen geht nicht. Getroffen wird nur der
  eigene Anschluss, die Sperre läuft nach 15 Minuten ab, und wer nicht warten will, löscht die
  Zeilen in `verwaltung_versuche`. Nachgewiesen: Sperre → richtiges Passwort 429 → Zeilen
  gelöscht → sofort wieder 200. Normales Arbeiten bleibt unbeeinträchtigt, weil **jede**
  erfolgreiche Anfrage die Zählung löscht (20 Aktionen nacheinander ohne Sperre).
  **Weitere behobene Befunde:** Zählabfrage holte ALLE Zeilen des Zeitfensters statt nur der
  Anzahl (`count=exact` + `Range: 0-0`) — unter Last richtete sich die Bremse gegen die eigene
  Datenbank · alte Zeilen wurden nur bei erfolgreicher Anmeldung aufgeräumt, also nie während
  eines Angriffs · ein `catch {}` setzte die Wartezeit bei Zählfehlern auf den Anfangswert
  **zurück**, die Abwehr wurde also unter genau der Last schwächer, die ein Angreifer erzeugt
  (jetzt: Zählfehler → abweisen) · **CSV-Export** entschärft führende `= + - @` (ein Name wie
  `=HYPERLINK(…)` wurde beim Öffnen in Excel zur Formel; Anführungszeichen schützen davor
  nicht) · **Betreff mit Umlaut** war nicht regelkonform: denomailer packt den *ganzen*
  Betreff samt Leerzeichen in ein `=?utf-8?Q?…?=`, was RFC 2047 verbietet — jetzt eigene
  Kodierung in mehrere kurze Wörter, 5/5 Fälle rundlaufend geprüft · **Eingangszeit** stand
  als roher UTC-Zeitstempel in der Mail, im Sommer zwei Stunden daneben · getippte **Notiz
  ging beim Statusklick verloren**, weil die Ansicht neu gezeichnet wurde · **Kachel zeigte
  „0 neu"** für einen Bereich, der in der Sitzung noch nicht geladen war, und überschrieb
  damit die Zahl vom Server · **Schreibmarke sprang** bei jedem Tastendruck ans Ende des
  Suchfelds, weil die ganze Ansicht neu gebaut wurde (jetzt nur der Listenkörper) ·
  **Ladefehler war eine Sackgasse** ohne Rückweg, mit englischer Rohmeldung · **fehlgeschlagenes
  Speichern sah aus wie erfolgreiches** (gleiche graue Schrift, kein `role`) · **„nur am
  Rechner"** hing an der Fensterbreite und wurde bei Größenänderung nie neu geprüft.

- **2026-07-31 · Verwaltung ausgebaut (v29).** Abgleich mit der CuraDoma-Verwaltung, an der sich
  der Aufbau orientieren sollte: strukturell haben wir dasselbe (Anmeldung, Kacheln, Liste mit
  Suche und Filtern, Detail, CSV). Drei Dinge fehlten, eines davon wichtig.
  **1. Rückgängig nach dem Löschen.** Löschen war die einzige Handlung, die sich nicht durch eine
  zweite aufheben lässt. Ein Bestätigungsdialog hilft gegen Unachtsamkeit, aber nicht gegen
  Irrtum: wer den falschen Eintrag offen hat, bestätigt ihn genauso überzeugt. Jetzt erscheint
  nach dem Löschen ein Streifen am unteren Rand mit „Rückgängig" — wie bei CuraDoma, aber in
  unserer Palette. **Bewusst KEIN Papierkorb in der Datenbank:** „endgültig löschen" soll auch
  endgültig heißen, sonst stimmt der Bestätigungstext nicht mehr und es lägen gelöschte
  Kundendaten weiter herum. Der Eintrag liegt nur im Speicher der offenen Seite; der Streifen
  sagt das ausdrücklich. Zurückgeschrieben wird mit **derselben Kennung**, damit Notiz, Status
  und Eingangszeit erhalten bleiben (nachgemessen).
  **Serverseitig eine Spalten-Erlaubnisliste**, denn der Browser schickt den Datensatz zurück —
  und was der Browser schickt, ist nie vertrauenswürdig. Geprüft: ein untergeschobenes
  `boese_spalte` wird verworfen (Antwort 200), dieselbe Nutzlast direkt an PostgREST scheitert
  mit `PGRST204`. Ohne Kennung 400, unbekannter Bereich 400, ohne Passwort 401.
  **2. Zurück-Taste.** Vorher führte sie aus der Verwaltung heraus — und weil das Passwort nur
  im Speicher liegt, bedeutete das eine vollständige Neuanmeldung. Jetzt haben Übersicht, Liste
  und Detail eigene Verlaufseinträge; die Zurück-Knöpfe in der Seite lösen dieselbe Bewegung aus
  wie die des Browsers. Geprüft: Detail → Liste → Übersicht.
  **3. Abgelaufene Anmeldung.** Eine 401 mitten in der Sitzung stand vorher nur als „Passwort
  falsch" an einer Karte, während die Oberfläche weiter so tat, als sei man angemeldet. Jetzt
  sauber zurück zur Anmeldung mit Begründung. **Wichtig dabei:** bei der Anmeldung selbst ist
  401 der Normalfall einer Falscheingabe — dort darf der Weg nicht greifen, sonst überschreibt
  er die eigentliche Fehlermeldung.
  **Kleinere Stille beseitigt:** die Liste war stillschweigend auf 500 Zeilen gekappt (der
  Server holt jetzt eine mehr, um es überhaupt zu merken, und die Seite sagt es) · der
  CSV-Knopf tat bei leerer Auswahl kommentarlos nichts (jetzt „Nichts zu exportieren") · nach
  jedem Ansichtswechsel bekommt die Überschrift den Fokus, sonst landet die Tastaturbedienung
  wieder am Seitenanfang.
  **Falle beim Einbauen:** Im 401-Zweig hatte ich `verlaufAus = true` gesetzt und nicht
  zurückgenommen — der Verlauf wäre nach einer Neuanmeldung tot gewesen. Solche Schalter immer
  im `finally` oder gar nicht.
  **Geprüft, 1280 px und 390 px:** Verlauf über drei Ebenen, Löschen mit Zurückholen (Zeile
  vollständig zurück, gleiche Eingangszeit), Streifen 367 px breit bei 390 px Fenster ohne
  Überlauf, Bedienelemente 44 px hoch, Handy-Detail weiterhin nur lesend.

- **2026-07-31 · Testdurchlauf beider Formulare, dabei Lebenslauf-Upload gebaut (v30).**
  Aufgabe war, je eine Kontaktanfrage und eine Bewerbung mit PDF über die Live-Seite zu
  schicken. Der zweite Teil ging nicht: **das Bewerbungsformular hatte kein Dateifeld**,
  und Supabase Storage war gar nicht eingerichtet. Nach Rückfrage gebaut.
  **Rechtelage — der Kern der Sache.** Der öffentliche Schlüssel steht im Quelltext jeder
  ausgelieferten Seite. Er darf im Speicherbereich deshalb **genau eines**: unter `eingang/`
  ablegen. Sieben Sonden von außen: hochladen 200 · herunterladen 400 · auflisten `[]`
  **obwohl die Datei nachweislich daliegt** (die Zeilenrechte filtern sie weg) · öffentlicher
  Pfad 400 · löschen 400 · Ablegen außerhalb von `eingang/` 400 · andere Dateiart 400.
  Heruntergeladen wird nur aus der Verwaltung über einen Link, der **zwei Minuten** gilt und
  bei jedem Klick neu erzeugt wird; ohne Unterschrift 400.
  **Der Dateiname aus dem Netz wird nie als Pfad benutzt** — gespeichert wird unter einer
  erzeugten Kennung, der Originalname steht getrennt als reiner Anzeigewert daneben.
  Größen- und Typgrenze (5 MB, nur PDF) setzt **Supabase selbst** durch, nicht der Browser:
  eine Prüfung im Browser lässt sich umgehen, die dort nicht.
  **Löschen und Rückgängig zusammengedacht:** Beim Löschen wandert die Datei nach
  `papierkorb/`, damit „Rückgängig" auch den Lebenslauf zurückholt — sonst wäre die Zusage
  nur halb wahr. Aufgeräumt wird bei jeder Anmeldung, alles älter als 24 Stunden. Kommt die
  Datei nicht mit zurück, wird der Verweis entfernt statt ein toter Knopf angeboten.
  **Merke (zum zweiten Mal dieselbe Falle beinahe):** `datei` und `datei_name` mussten in
  `MAX` von `formular.js` eingetragen werden — `kuerzen()` übernimmt **nur** bekannte
  Schlüssel. Genau daran ist `quelle`/`betreff` schon einmal gescheitert.
  **Datenschutzabsatz** ergänzt: Freiwilligkeit, Bitte um Verzicht auf entbehrliche Angaben
  (Gesundheit, Religion, Foto), § 26 Abs. 1 BDSG, technische Beschränkung, Löschung samt
  24-Stunden-Zwischenbereich und Sechsmonatsfrist.
  **Ende zu Ende live geprüft:** Kontaktanfrage → `danke.html`, Zeile vollständig mit
  Umlauten · Bewerbung mit PDF → `danke.html`, Datensatz mit Pfad und Anzeigename, Datei
  1981 Bytes im Speicher · Verwaltung zeigt „Lebenslauf … öffnen", Link liefert 200,
  `application/pdf`, beginnt mit `%PDF` · Löschen verschiebt die Datei, Zurückholen bringt
  sie samt funktionierendem Link wieder. **Merke:** Dateien nie per `delete from
  storage.objects` entfernen — das löscht nur den Verweis, nicht die Datei. Über die
  Speicher-Schnittstelle gehen.

- **2026-07-31 · Verwaltung nach `/admin/` umgezogen und ausgebaut (v31).**
  **Umzug:** `verwaltung.html` → `admin/index.html`, damit die Adresse `…/admin/` lautet.
  Relative Pfade eine Ebene tiefer nachgezogen (`../assets/…`). Am alten Ort steht eine
  Weiterleitung für vorhandene Lesezeichen; sie kann später entfallen. `robots.txt` sperrt
  jetzt `/admin/` **und** die alte Adresse, README nachgezogen.
  **1. Sitzung statt Passwort im Speicher.** Bisher ging das Passwort bei *jeder* Anfrage mit
  und musste die ganze Zeit in der Seite liegen; ein Neuladen bedeutete Neuanmeldung. Jetzt
  stellt der Server nach der Anmeldung ein Kennzeichen aus — `Ablaufzeitpunkt.Signatur`, HMAC
  über Dienstschlüssel **und** Passwort, acht Stunden gültig. Das ist zugleich **sicherer**:
  das Passwort wandert genau einmal über die Leitung. Serverseitig muss nichts gespeichert
  werden, und ein geändertes Passwort entwertet sofort alle Kennzeichen.
  Abgelegt in `sessionStorage`, nicht `localStorage`: Neuladen behält die Anmeldung, das
  Schließen des Reiters beendet sie.
  **Ein gültiges Kennzeichen umgeht die Anmeldebremse** — es wird ja nichts geraten. Ein
  abgelaufenes führt deshalb auch **nicht** zur Sperre, sonst wäre man nach zwölf Neuladen
  ausgesperrt. Geprüft: ausgedacht, abgelaufen, ohne Signatur, ein Zeichen geändert → alle 401;
  echtes Kennzeichen → 200.
  **Falle dabei, teuer wenn übersehen:** der `popstate`-Wächter prüfte weiter auf `pw`, das
  jetzt leer ist. Damit wäre die **Zurück-Taste für jeden mit gemerkter Sitzung tot** gewesen.
  Merke: Wird eine Anmeldung auf einen zweiten Träger umgestellt, **alle** Abfragen auf den
  alten durchsuchen (`grep "!pw"`), nicht nur die offensichtliche.
  **2. Blick auf Neues, während die Seite offen liegt.** Alle 60 s eine schlanke
  Zahlen-Abfrage (`stand`, nur Anzahlen, keine Datensätze). Kommt etwas hinzu, erscheint oben
  ein Streifen „1 neuer Eintrag eingegangen" mit „Anzeigen". Pausiert, solange der Reiter im
  Hintergrund liegt — sonst läuft die Abfrage nachts durch, ohne dass jemand hinsieht.
  Das ersetzt die Mail-Benachrichtigung nicht, macht die Seite aber zu etwas, das man
  nebenher offen lassen kann — solange der SMTP-Zugang klemmt, ist das der einzige Weg,
  von einer Anfrage zu erfahren, ohne aktiv nachzusehen.
  **Merke beim Prüfen:** Der Vorschaubereich meldet `document.hidden === true`, also genau
  die Bedingung, unter der die Abfrage absichtlich pausiert. Ohne `Object.defineProperty` auf
  `document.hidden` sieht man nie etwas und hält die Uhr fälschlich für kaputt.
  **3. Kacheln sagen mehr:** „2 neu von 2" plus „zuletzt 31.07.2026 · 19:22". Die Zahlen
  kommen über `count=exact` mit `Range: 0-0`, holen also keine Zeilen.
  **4. Drucken** einer Einzelansicht — zum Mitnehmen an den Ortstermin. Eigene `@media
  print`-Regeln blenden Bedienelemente, Verläufe und Schatten aus und hängen die Mailadresse
  hinter den Link.
  **5. Tastaturbedienung** in der Liste: ↑/↓ (auch j/k) bewegen, Eingabe öffnet, Escape geht
  eine Ebene zurück. **Falle:** Ein Handler, der sich abmeldet, sobald gerade keine Liste da
  ist, wirkt danach nirgends mehr — erst registrierte ich ihn je Liste, Escape war im Detail
  wirkungslos. Jetzt einmal global, entscheidet bei jedem Tastendruck neu.
  **Geprüft, 1280 px:** Anmeldung → Kennzeichen gemerkt, Passwort nicht mehr in der Seite ·
  Neuladen bleibt angemeldet · Pfeil setzt Fokus auf die Zeile · Escape Detail → Liste →
  Übersicht · neuer Eintrag erschien nach 75 s von selbst, „Anzeigen" lud ihn in die Liste.

- **2026-07-31 · Startseite: Standbild zuerst, 3D danach — PageSpeed brach vorher ab (v32).**
  Nutzerbefund: PageSpeed zeigte **alle** Kategorien rot mit „!" — auch SEO und Best
  Practices. Das ist kein Wert 0, sondern ein **Abbruch des ganzen Laufs**.
  **Zwei Messartefakte, an denen ich mich fast verrannt hätte — beide notiert, weil sie
  wiederkommen:** (1) Der Vorschaubereich lädt Seiten in einem *versteckten* Reiter. Chrome
  meldet dann **grundsätzlich kein** `first-contentful-paint`. Mein „FCP = KEINS" war
  wertlos. (2) Im selben Zustand stehen CSS-Animationen bei `currentTime: 0` still.
  **Merke: vor jeder Aussage über Farbwerte, Sichtbarkeit oder Zeitpunkte erst
  `document.hidden` prüfen.** Die PageSpeed-Schnittstelle hätte den echten Fehlercode
  geliefert, war aber bei der Tagesquote (429, ohne Schlüssel).
  **Hart belegt und behoben:** Am Rechner wurde three.js **während** des Ladens angefordert
  und die Szene sofort gebaut. Das erste, was ein Besucher sah, war eine WebGL-Leinwand — und
  eine Leinwand zählt für den Browser **nicht** als Inhalt. Schlimmer: scheiterte WebGL, stand
  im `catch` nur `console.error`, der Besucher sah eine **schwarze Fläche**.
  **Jetzt:** Standbild sofort (echtes Foto, echter Text, Logo), three.js erst **nach** dem
  Ladeereignis über `requestIdleCallback`. Gemessen: Ladeereignis 253 ms, three.js 258 ms —
  vorher lief es mittendrin.
  **Fähigkeitsprüfung vor dem Laden:** kein WebGL oder Software-Rendering (SwiftShader,
  llvmpipe, Basic Render) → Standbild bleibt, three.js wird **gar nicht** geladen, die Bahn
  schrumpft von 1800vh auf 112vh. Mit vorgetäuschtem SwiftShader geprüft: 148 KB gespart,
  Seite 12 786 statt 24 940 px, ehrlicher Hinweis statt schwarzer Fläche.
  **Zum gewünschten Vorspann:** ein vorgeschalteter Ladeschirm wäre hier genau falsch — er
  verdeckt das erste Inhaltsbild. Dieses Projekt hatte einen (v7) und hat ihn deswegen
  entfernt. Der Vorspann liegt jetzt **auf** dem Standbild.
  **Und die Animation entscheidet nie über Sichtbarkeit:** Der Text wird nur *bewegt*
  (`translateY`), nicht eingeblendet. Nur das Logo blendet auf, weil es Schmuck ist
  (`alt=""`). Eine Einblendung beginnt bei `opacity: 0` — läuft sie nicht, ist der ganze
  Vorspann unsichtbar, und *das* erzeugt erst recht „kein erstes Inhaltsbild". Nachgewiesen
  bei stehenden Animationen: Text auf `opacity: 1`, nur das Logo auf 0.
  **Zweiter Einstieg nicht vergessen:** `applyMobile()` baute beim Wechsel aufs Breitbild die
  Szene direkt und entfernte das Standbild sofort — also am neuen Weg vorbei. Läuft jetzt
  ebenfalls über `planeAutostart()`.

- **2026-07-31 · Vorspann im Stil eines Ladeschirms (v33).** Auf Wunsch nach einer
  Referenzabbildung: dunkler Vollbildschirm, Haarlinie, Kleinlabel links, mitlaufende Ziffern
  rechts, riesige Wortmarke, füllender Balken. In unseren Farben: Grund `#0B1A11`, Ziffern
  und Balken in `#8ECF4F`, Wortmarke „de Vries" in Outfit 700 mit „GaLa-Bau" in der
  Instrument-Serif-Kursiven mit Grünverlauf.
  **Ich hatte davon abgeraten** (ein vorgeschalteter Schirm verdeckt das erste Inhaltsbild —
  genau deshalb flog der Loader in v7 raus). Der Nutzer hat das gehört und ihn trotzdem
  gewollt; damit ist es seine Entscheidung. Gebaut ist er deshalb so, dass er möglichst
  wenig kostet:
  **Er steht im HTML, nicht im Skript.** Die Skripte liegen am Seitenende — ein per
  JavaScript erzeugter Schirm käme *nach* dem ersten Bild und würde aufblitzen. So ist
  umgekehrt sein Text das erste Inhaltsbild: Text auf einfarbigem Grund, schneller geht es
  nicht.
  **Er löst sich per CSS-Animation von selbst auf** (0,86 s halten, 0,42 s ausblenden). Das
  ist die entscheidende Absicherung: fällt das Skript aus, bleibt die Seite trotzdem
  bedienbar. Das Skript zählt nur die Ziffern und räumt den Knoten weg — plus eine Notbremse
  nach 2,6 s, falls die Animation selbst still steht (im Hintergrund geladene Reiter halten
  Animationen an; genau das ist mir beim Prüfen begegnet).
  **Nur einmal je Sitzung:** ein winziges Skript im `<head>` setzt vor dem ersten Bild eine
  Klasse, wenn der Vorspann schon lief. Ohne diesen Vorgriff blitzte er bei jeder Navigation
  erneut auf.
  **Unter 820 px ausgeblendet** — auf dem Handy zählt jede Zehntelsekunde. `prefers-reduced-motion`
  kürzt auf 0,2 s ohne Balkenlauf.
  **Bewusst KEINE Scrollsperre** während des Vorspanns: eine hängengebliebene Sperre macht die
  Seite unbedienbar. Der Preis ist ein 15 px schmaler Streifen an der Bildlaufleiste.
  **Merke:** `[id^="rg-vorspann"]` traf auch den Stilblock des Standbilds, der zufällig
  ähnlich hieß — beim Prüfen sah das nach einem Überbleibsel aus. Der Block heißt jetzt
  `rg-standbild-stil`.

- **2026-07-31 · Vorspann wieder entfernt, Startbild durch ein echtes Foto ersetzt (v34).**
  **Ladeschirm raus** — auf Zuruf am selben Tag wieder rückgängig gemacht, samt Kopf-Skript
  und Stilblock. Rückstände geprüft: 0 Treffer für `rg-vorspann`/`dvg-vorspann`.
  **Das eigentliche Problem war das Bild.** `rg-start` ist ein **Abzug der 3D-Szene** im
  Hochformat (800 × 1731). Auf einem breiten Bildschirm wurde daraus ein beschnittener,
  unscharfer Ausschnitt — und inhaltlich zeigte die Startseite eines Gartenbaubetriebs eine
  Zeichentrickgrafik statt seiner Arbeit. Jetzt `hero-header` (1920 × 1080): echtes
  Projektfoto, Holzsteg am Teich, Terrakotta — dasselbe Bild, mit dem der Betrieb bisher
  schon aufgemacht hat.
  **Zwei Fehler, die ich mir dabei selbst gebaut und gemessen behoben habe:**
  1. Erst `image-set` mit `1x`/`2x` benutzt. Das wählt nach **Pixeldichte**, nicht nach
     Fensterbreite — auf einem 1280 px breiten Schirm mit einfacher Dichte nahm es die 800er
     Datei und zog sie auf 1280. Also **wieder unscharf**, genau das Problem von vorher.
     Die Größe gehört über eine **Medienabfrage** gewählt; das geht nur im Stilblock, nicht
     im Inline-Stil.
  2. Dann `(min-resolution:1.5dppx)` allein — zu grob: ein 390-px-Telefon mit doppelter
     Dichte hat 780 echte Bildpunkte, dort passt die 800er Datei genau, geladen wurde aber
     die 329-KB-Datei. Jetzt zweistufig:
     `(min-width:800px), (min-width:500px) and (min-resolution:1.5dppx)`.
     Gemessen: 390 px bei Dichte 2 → 85 KB · 1280 px bei Dichte 1 → 329 KB.
  **Kontrast über dem Foto nachgerechnet**, nicht geschätzt: Bild in eine Leinwand gezeichnet,
  den Schleier wie im CSS darübergelegt, 27 Punkte hinter der Überschrift abgetastet —
  schlechtester Wert 9,67 : 1, Median 12,27 : 1.
  **Merke:** `image-set` ist für Pixeldichte da, nicht für Bildgrößen nach Viewport. Wer
  Dateigrößen nach der Fensterbreite staffeln will, braucht Medienabfragen — und muss dabei
  Breite **mal** Dichte rechnen, nicht eines von beidem.

- **2026-07-31 · Standbild blendet aus statt zu verschwinden; Schleier neu aufgebaut (v35).**
  Nutzerbefund am Screenshot: der Wechsel zum Rundgang war ein harter Schnitt, und das Foto
  verschwand nach unten ins Weiße.
  **1. Übergang.** Vorher entfernte `entferneStandbild()` das Standbild schlagartig — auf
  schneller Leitung war es nach Sekundenbruchteilen weg. Jetzt: **Mindeststandzeit 2,4 s** ab
  dem Zeitpunkt, an dem es steht (`standbildSeit`), danach 0,9 s Blende über
  Deckkraft, leichten Zoom und Weichzeichner. Zwei Bedingungen dabei: die Szene läuft
  **vorher** schon (sonst blendet man auf eine leere Leinwand), und die Stationstafeln kommen
  erst am **Ende** der Blende zurück, sonst lägen zwei Textebenen übereinander. Während der
  Blende `pointer-events:none` — sonst startet ein Klick auf den halb durchsichtigen Knopf
  noch einmal. `prefers-reduced-motion`: 0,6 s stehen, 0,26 s Blende, ohne Zoom und Weichzeichner.
  **2. Der Schleier war falsch gebaut.** Ein *gleichmäßiger* Schleier muss so dicht sein, wie
  es der **schwächste** Punkt verlangt — und der liegt hinter dem 12-px-Kleinlabel. Deckt man
  damit das ganze Bild ab, verschwindet das Foto. Gemessen: bei .24/.62/.80 kam das Kleinlabel
  auf **2,31 : 1**. Jetzt zwei Schichten: ein weicher heller Fleck **nur hinter der Textsäule**
  (Radialverlauf) über einem sehr zurückhaltenden Gesamtschleier (.20/.34/.56). Am Rand bleibt
  das Foto kräftig.
  **Alle vier Textgrößen nachgemessen** (Bild in eine Leinwand gezeichnet, beide Schichten wie
  im CSS darübergelegt, punktweise abgetastet) — erst da fiel auf, dass die Hinweiszeile
  seitlich aus dem hellen Fleck ragte. Nach Weitung des Flecks und Abdunkeln der Zeile
  (`#3C5145` → `#26382E`): Kleinlabel 4,97 · Überschrift 13,1 · Fließtext 9,52 ·
  Hinweiszeile 7,0 — schlechtester Punkt je Element, alle bestanden.
  **Merke zum Prüfen:** Der Werkzeugaufruf setzt in dieser Umgebung erst **55 s** nach
  Seitenstart an — ein Zeitfenster von drei Sekunden ist so nie zu beobachten. Lösung: eine
  Testfassung, die im `<head>` selbst mitschreibt und deren Protokoll man hinterher ausliest.

- **2026-07-31 · Leere Fläche unter dem Standbild (v36).** Nutzerbefund am Screenshot: unter
  dem Standbild eine große leere Fläche. Ursache war eine **Folge der Blende von v35**: Die
  Scrollbahn stand am Rechner sofort auf `1800vh` — 14 400 px — obwohl die Szene noch gar
  nicht lief. Solange das Standbild nur Sekundenbruchteile stand, fiel das niemandem auf;
  mit der neuen Standzeit von 2,4 s hat der Besucher Zeit zu scrollen und fällt in achtzehn
  Bildschirmhöhen Nichts.
  **Zwei Änderungen, die zusammengehören:**
  1. `bahnHoehe()` gibt jetzt **immer** `112vh` zurück, solange der Rundgang nicht läuft —
     auch am Rechner, nicht nur auf dem Handy. Die Bahn wächst erst, wenn die Szene steht.
  2. **Kein Selbststart, wenn schon gescrollt wurde** (> 0,3 Bildschirmhöhen). Sonst zöge der
     Start die Bahn von 112vh auf 1800vh unter dem Text auf und schöbe den Lesenden mitten in
     die Szene. Standbild und Knopf bleiben stehen; wer zurück nach oben geht, startet von Hand.
  **Gemessen, beide Fälle:** früh gescrollt → Rundgang startet nicht, three.js wird **gar
  nicht** geladen, Seite 13 519 px statt 27 023 px · nicht gescrollt → Szene läuft, Standbild
  weg, Leinwand deckt das Fenster, Stationstafeln zurück, Seite 27 023 px.
  **Merke:** Eine Änderung an der Anzeigedauer ändert, wie viel Zeit der Besucher zum Handeln
  hat. Was vorher nur theoretisch erreichbar war, wird damit zum Normalfall — bei jeder
  Verlängerung einer Einblendung durchgehen, was in dieser Zeit sonst noch passieren kann.
