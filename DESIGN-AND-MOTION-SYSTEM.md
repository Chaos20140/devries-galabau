# DESIGN-AND-MOTION-SYSTEM — de Vries Galabau

**Stand:** 2026-07-27 · `?v=7` · gültig für `assets/css/style.css` + `assets/js/main.js`

---

## 1. Leitidee

> **Ein Garten entsteht Schicht für Schicht.**

Das ist keine Metapher für die Textseite, sondern die Bauanleitung für die Gestaltung.
Jede Sektion der Startseite entspricht einer Schicht des Entstehungsprozesses:

| Schicht | Sektion | Was sie zeigt |
|---|---|---|
| Der Ort | Hero | Ein fertiger Garten, ruhig, ohne Versprechen. Beim Weiterscrollen wächst das Bild langsam und dunkelt ab — man sinkt in die Seite hinein |
| Die Haltung | Statement + Materialschichtung | Weg · Stein · Pflanze · Wasser als vier Bänder |
| Das Handwerk | Leistungen (Scrollytelling) | Das Bild bleibt stehen, der Text läuft vorbei — vier Disziplinen auf dunklem Waldgrün |
| **Der Übergang** | **Signature Moment** | **Planlinien zeichnen sich und lösen sich in das Foto auf** |
| Das Material | Makro-Raster | Nahaufnahmen von Stein, Holz, Pflaster, Wasser |
| Das Ergebnis | Filmstreifen | Sechs echte Projekte, horizontal |
| Der Ablauf | Prozess-Timeline | Fünf Schritte, editorial statt Karten |
| Die Herkunft | Zahlen & Region | Nur belegte Angaben |

**Grundregel, aus drei verworfenen Versuchen gelernt:** *Fotos führen. Gezeichnete Grafiken
erklären höchstens.* Die v3-Fassung scheiterte an einem freihändigen Plan-SVG. Der jetzige
Signature Moment dreht das Verhältnis um: das echte Projektfoto ist die Hauptsache, die
Planlinien sind eine dünne Vermessungsebene darüber, die wieder verschwindet.

---

## 2. Farbe

Tokens in `:root`, `assets/css/style.css` §1.

| Token | Wert | Rolle | Kontrast auf `--paper` |
|---|---|---|---|
| `--ink` | `#181611` | Haupttext, dunkle Flächen | 15,9 : 1 |
| `--ink-2` | `#453f35` | Fließtext auf hellem Grund | 8,7 : 1 |
| `--muted` | `#6a6152` | Sekundärtext, Bildunterschriften | **5,25 : 1** |
| `--pine` | `#141a12` | dunkelste Fläche (Signatur-Bühne) | – |
| `--rust` | `#a9491b` | einziger Akzent: Eyebrows, Links, CTA | **4,95 : 1** |
| `--rust-deep` | `#8f3d14` | Fehlermeldungen | 6,4 : 1 |
| `--rust-soft` | `#e6c9b3` | Akzent auf dunklem Grund | – |
| `--paper` | `#f1eee4` | Hauptlesefläche | – |
| `--paper-2` | `#e9e5d8` | alternierende Sektionen | – |
| `--chalk` | `#faf8f1` | hellste Fläche | – |
| `--line` / `--line-2` | `rgba(24,22,17,.14/.24)` | Haarlinien | – |

**Geändert gegenüber v4:** `--muted` (war `#877d6c`) und `--rust` (war `#b4501e`) wurden
minimal abgedunkelt. Gemessen lagen sie bei 3,49 bzw. 4,40 : 1 — beide unter WCAG AA.
Da beide fast ausschließlich für **kleine** Schrift verwendet werden (Eyebrows, Mono-Labels,
Bildunterschriften), war das ein echter Mangel und keine Formalie. Der Farbeindruck ist
praktisch unverändert.

**Regeln**
- Ein Akzent. `--rust` und sonst nichts. Grün bleibt dem Logo vorbehalten.
- Auf dunklem Grund (`--ink`, `--pine`, `.filmstrip`) wird der Akzent zu `--rust-soft`.
- Information nie allein über Farbe. Aktiver Navigationslink trägt zusätzlich `aria-current`
  und eine Unterstreichung, Formularfehler zusätzlich Text und `aria-invalid`.

---

## 3. Typografie

| Rolle | Schrift | Einsatz |
|---|---|---|
| Display | **Instrument Serif** (self-hosted, regular + kursiv) | Alle Überschriften, große Zahlen, Zitate |
| Fließtext | **Manrope** (variabel 200–800) | Absätze, Formulare, Navigation |
| Mikro-Labels | **JetBrains Mono** | Eyebrows, Maßangaben, Bildunterschriften, Buttons, Zähler |

Die Mono-Schrift kodiert das Planungs-Thema — sie steht überall dort, wo im Garten- und
Landschaftsbau gemessen und beschriftet wird.

**Fluid-Skala** (`clamp()`, ⚠ immer Leerzeichen um `+`/`-`):

```
--fs-micro  .72rem                              Eyebrows, Labels
--fs-body   clamp(1rem, .96rem + .25vw, 1.18rem)
--fs-lead   clamp(1.2rem, 1rem + .9vw, 1.7rem)
--fs-h3     clamp(1.7rem, 1.2rem + 2vw, 3rem)
--fs-h2     clamp(2.4rem, 1.4rem + 4.4vw, 5.5rem)
--fs-h1     clamp(3rem, 1.4rem + 8vw, 9rem)
--fs-giant  clamp(3.4rem, .5rem + 13vw, 16rem)  Hero, Footer-Wortmarke
```

**Regeln**
- Überschriftenebene folgt der Struktur, Größe kommt aus einer Klasse.
  Beispiel: Footer-Spalten sind `<h2 class="footer__h">` und trotzdem 0,72 rem groß.
  Genau umgekehrt war es vorher — und erzeugte auf jeder Seite H2→H4-Sprünge.
- `text-wrap: balance` auf Überschriften, `pretty` auf Absätzen.
- Textbreiten: Fließtext max. 52–56 ch, Statement-Headline max. 20 ch.

**Ladeverhalten:** Drei Schriften werden per `preload` geholt — Serif regular, Serif kursiv,
Mono. Alle drei stehen oberhalb der Falz. Der Mono-Preload ist nicht optional: ohne ihn
wächst der Topbar-Kontaktblock beim Schriftwechsel von 22 px auf 68 px und schiebt den
gesamten Hero nach unten (**gemessen: CLS 0,094 statt 0**). Manrope wird ebenfalls
vorgeladen; alle nutzen `font-display: swap`.

---

## 4. Raster und Abstände

```
--wrap        1360px    Standardcontainer
--wrap-narrow  820px    Formulare, Rechtstexte
--gut         clamp(1.2rem, .7rem + 2vw, 3rem)   Seitenrand
--sp          clamp(5rem, 3rem + 8vw, 12rem)     Sektionsabstand
--r            2px      technische Radien
--r-img        6px      Bildradien
```

**Breakpoints:** 1080 px (Navigation klappt ein) · 860 px (Layout einspaltig, Mobile-Motion) ·
620 px (Topbar zweizeilig) · 560 px (Galerie einspaltig).

**⚠ Fallstrick, der bereits zweimal aufgetreten ist:** `.wrap` setzt
`width: min(100% - 2 * var(--gut), var(--wrap))`. In einem **Flex-Container** löst diese
Prozentangabe nicht gegen die Containerbreite auf, sondern inhaltsbasiert — der Hero war
dadurch 688 px statt 1345 px breit und klebte am Rand. `.chapter` ist deshalb ein
**Grid** mit `align-items: end`. Keine `.wrap`-Instanz darf direktes Flex-Item sein.

---

## 5. Bildsprache

- Ausschließlich echte Projektfotos des Betriebs. Kein Stockmaterial, keine Illustrationen,
  keine KI-Bilder.
- Vier Größen je Motiv: `-400` (Raster, Bänder), `-800` (Standard), `-1600` (Vollbild),
  `-bg-700`/`-bg-1400` (nur die vier Leistungs-Hintergründe, 16:10 zugeschnitten und stark
  komprimiert, weil sie unter einem 62-%-Dunkelschleier liegen).
- Jedes `<img>` trägt `width`/`height` (aus `assets/img/img-manifest.json`), einen deutschen
  `alt`-Text und – außer dem Hero – `loading="lazy"`.
- `sizes` wird nach **tatsächlicher Anzeigebreite** gesetzt, nicht pauschal auf `100vw`.
  Auf einem 390-px-Display mit doppelter Pixeldichte entscheidet das über Faktor 5 beim
  Datenvolumen (gemessen: Startseite 1657 KB → 879 KB).

---

## 6. Motion-System

### 6.1 Tokens — die einzige Quelle für Dauer und Kurve

```
--dur-xs  .18s    Fokusring, Farbwechsel
--dur-s   .32s    Hover, Unterstreichung, Chips, Kontextcursor
--dur-m   .70s    Reveals, Text-Aufstieg
--dur-l   1.10s   Bild-Masken, Clip-Reveals
--dur-xl  1.50s   Signatur-Momente, Bild-Zoom
--stag    70ms    Grundschritt jedes Staggers

--ease-out    cubic-bezier(.16, 1, .3, 1)    Standard: kommt an und bleibt
--ease-soft   cubic-bezier(.22, 1, .36, 1)   Reveals, weicher Einlauf
--ease-micro  cubic-bezier(.2, 0, .2, 1)     kurze UI-Reaktionen
```

**Regel:** Keine Komponente definiert eigene Dauern oder Kurven. Vorher hatte praktisch jede
Komponente ihre eigenen Werte (.9 s / .8 s / 1.2 s / 1.5 s / 55 ms / 80 ms) — deshalb fühlten
sich die Bewegungen nicht verwandt an.

### 6.2 Bewegungsarten

| Typ | Auslöser | Technik | Dauer |
|---|---|---|---|
| Text-Reveal | IntersectionObserver | Wörter steigen aus einer Maske (`overflow:hidden` je Wort) | `--dur-m`, Stagger `--stag` |
| Block-Reveal | IntersectionObserver | `opacity` + `translateY(26px)` | `--dur-m` |
| Stagger-Gruppe | IntersectionObserver | Kinder mit `--i`-Index | `--dur-m` + `i × --stag` |
| Bild-Reveal | IntersectionObserver | `scale(1.12) → 1` im beschnittenen Rahmen | `--dur-xl` |
| Clip-Reveal | IntersectionObserver | `clip-path: inset(0 0 100% 0) → 0` | `--dur-l` |
| Parallax | rAF-Scrollschleife | `translate3d(0, --py, 0)` | scrollgebunden |
| Signatur | GSAP ScrollTrigger (scrub) | siehe 6.4 | scrollgebunden |
| Filmstreifen | GSAP ScrollTrigger (pin+scrub) | `x` des Tracks | scrollgebunden |
| Hover | CSS | `transform`/`opacity`/Farbe | `--dur-s` |
| Magnetisch | Maus, rAF-gedrosselt | `--mx`/`--my` → `translate` | `--dur-s` Rückweg |

Animiert werden ausschließlich `transform`, `opacity` und `clip-path`.
Nie `top`, `left`, `width`, `height`. (Der Skip-Link war die letzte Ausnahme und wurde
auf `transform` umgestellt.)

### 6.3 Parallax — drei Tiefenstufen

```
--plx-far   26px   Hintergrund (Hero-Foto)
--plx-mid   16px   Bildebene in beschnittenen Containern (Material, Region)
--plx-near   9px   Vordergrunddetails (Filmstreifen-Bilder)
```

Der Wert ist die **maximale Wegstrecke in Pixeln**, nicht ein Geschwindigkeitsfaktor —
dadurch bleibt die Bewegung unabhängig von der Seitenlänge klein und berechenbar.

Ein `.plx-frame` ist immer um `2 × --plx-far` höher als sein Rahmen und um `--plx-far`
nach oben versetzt, damit die Bewegung in keiner Richtung eine Kante freilegt.

**Die Scrollschleife trennt Lesen und Schreiben:** erst werden alle
`getBoundingClientRect()` gesammelt, danach alle Transforms gesetzt. Im Wechsel gelesen und
geschrieben (so war es vorher) erzwingt jeder Schreibvorgang ein neues Layout.

### 6.4 Signature Moment „Plan wird Garten"

Eine einzige gescrubte GSAP-Timeline über 250 vh (mobil 190 vh), vier klar getrennte Schichten:

| Zeit | Schicht | Was passiert |
|---|---|---|
| 0,0 – 0,6 | Raster | Blueprint-Raster blendet auf dunklem Grund auf |
| 0,3 – 2,7 | Linien | 11 Vermessungspfade zeichnen sich (`stroke-dashoffset`), gestaffelt |
| 1,8 – 2,4 | Beschriftung | Fünf Mono-Labels steigen auf |
| 2,6 – 4,8 | Foto | Das Projektfoto öffnet sich aus der Mitte (`clip-path: inset`) |
| 3,4 – 4,5 | Auflösung | Die Planebene blendet aus |
| 3,8 – 4,7 | Aussage | Die Headline erscheint |

Die Linien sind **keine freie Zeichnung**. Der `viewBox` entspricht mit `1600 × 1200` exakt
dem Bildformat, `preserveAspectRatio="xMidYMid slice"` verhält sich identisch zu
`object-fit: cover`. Dadurch liegen die Pfade in jeder Fenstergröße auf denselben
Bildelementen: Natursteineinfassung, Bestandsbaum mit Kronenradius, zwei Formschnitte,
Staudengruppe, Blühgruppe, Maßlinie über die Beetbreite.

`will-change: clip-path` wird nur gesetzt, solange der ScrollTrigger aktiv ist
(`onToggle` → Klasse `.is-live`), nicht dauerhaft.

⚠ `clipPath` muss mit `gsap.fromTo()` und **vier expliziten Werten auf beiden Seiten**
animiert werden. Die CSS-Kurzform `inset(45%)` wird sonst als ein Wert gelesen, und das
Bild klappt nur nach unten auf statt sich aus der Mitte zu öffnen.

### 6.4b Leistungen — gepinntes Scrollytelling

**Ab 861 px:** GSAP pinnt die gesamte Sektion. Der Scroll blättert Schritt für Schritt
durch die vier Disziplinen — sichtbar ist immer **genau ein Text rechts und ein Bild links**.
Die Strecke beträgt 0,85 Bildschirmhöhen je Schritt, damit sich das Blättern zügig anfühlt.
Inaktive Schritte sind `visibility: hidden`, tauchen also weder im Tab-Fokus noch im
Screenreader auf; die vier Leistungen sind ohnehin in Hauptnavigation und Footer verlinkt.

Im gepinnten Zustand muss alles zusammen in eine Bildschirmhöhe passen — deshalb ist der
Sektionskopf dort deutlich kompakter (`.svcs.is-pinned .section__head`). Geprüft bei
1280 × 720, 1440 × 900 und 1920 × 1080.

**Unter 861 px:** kein Pinning. Die Bühne klebt unter der Navigation, der jeweils mittige
Schritt führt (`rootMargin: -48% 0 -48%`) — vertikales Scrollen bleibt normal.

**Bei Reduced Motion:** kein Pinning, alle vier Schritte gleichzeitig sichtbar, die Bilder
als ruhiges 2×2-Raster darüber.

Beides über `gsap.matchMedia()`, damit ein Wechsel der Fenstergröße oder der
Bewegungseinstellung die jeweils andere Fassung sauber auf- und abbaut.

**Kontrast statt Kontrastarmut:** Inaktive Schritte werden nur auf 0,72 abgedunkelt, nicht
auf die optisch reizvolleren 0,34. Auf `--forest #26361f` ergibt der Fließtext dann noch
4,7 : 1 — bei 0,34 wären es rund 1,9 : 1 gewesen.

### 6.4d Die Seite als eine Erzählung

Die Startseite ist nicht eine Folge von Sektionen mit Reveals, sondern ein durchgehender
Ablauf. Was das konkret heißt:

| Kapitel | Was der Scroll auslöst |
|---|---|
| Hero | Beim Laden gestaffelter Einlauf; beim Weiterscrollen wächst das Bild auf 1,12, eine dunkle Ebene zieht auf 0,55 auf, der Text driftet mit — man sinkt hinein |
| Haltung | Die Statement-Headline steigt **scrollgebunden** Wort für Wort auf (`scrub`), nicht auf einen Schlag |
| Handwerk | Gepinnt, vier Disziplinen nacheinander (6.4b) |
| Schicht für Schicht | Gepinnt, vier Schichten: Raster → Linien → Beschriftung → Foto (6.4) |
| Material | Die Kacheln laufen mit versetzter Tiefe durch, das Raster atmet |
| Projekte | Gepinnter Filmstreifen mit Zähler |
| Ablauf | Die Schiene zeichnet sich mit, die Punkte füllen sich der Reihe nach |
| Zahlen | Steigen scrollgebunden auf, Zähler laufen hoch |
| Ihr Projekt | Closing-Headline wie die erste, scrollgebunden |

Dazu die **Kapitelspur** rechts (ab 1180 px): sechs Ankerpunkte, der aktive wächst und
zeigt seinen Namen, die Spur färbt sich auf dunklen Abschnitten um. Bewusst als echte
`<nav>` mit Ankerlinks und `aria-current` — sie ist Orientierung und Navigation zugleich,
nicht Dekoration.

**⚠ Regel bei Übernahmen:** Was GSAP steuert, muss vorher aus der CSS-Reveal-Steuerung
entlassen werden (`data-reveal`/`data-stagger` entfernen, `.is-scrubbed` setzen). Sonst
schreiben Transition und Scrub gleichzeitig auf dieselbe `transform`-Eigenschaft und die
Bewegung stockt sichtbar.

### 6.4c Galerie — editorialer Raster-Rhythmus

Sechs-Spalten-Raster mit `grid-auto-flow: dense` und einem Muster über je sieben Elemente:
zwei breite 4:3-Panels, drei hochformatige bzw. quadratische Einschübe, ein 16:9-Vollbild.
Jedes Bild zieht beim Hereinscrollen per `clip-path` von unten auf.

**⚠ Die Maske liegt auf dem `<img>`, nicht auf `.gitem`.** `clip-path: inset(0 0 100% 0)` auf
dem *beobachteten* Element klippt es auf Höhe 0 — und der IntersectionObserver rechnet
Clipping mit ein. Das Element meldet dann dauerhaft `intersectionRatio: 0` und kann sich
nie selbst einblenden. Gemessen und verifiziert. `.clip-reveal` hatte dieselbe latente
Falle und wurde ebenfalls auf das Kind umgestellt.

### 6.5 Mikrointeraktionen

- **Buttons:** dünne Rechtecke, Farbe wischt von unten herein (`::before`, `translateY`).
  `:active` skaliert auf 0,97.
- **Magnetische Buttons:** nur Desktop mit Zeigegerät, rAF-gedrosselt, schreiben ausschließlich
  `--mx`/`--my` — so wird keine fremde Transform überschrieben.
- **Kontextcursor:** **kein globaler Ersatzcursor.** Der Systemcursor bleibt überall sichtbar.
  Nur über Flächen mit `[data-cursor]` (Galeriebilder, Filmstreifen) tritt ein beschriftetes
  Plättchen hinzu — „Projekt ansehen". Dort ist `cursor: none` unbedenklich: keine
  Textauswahl, keine Eingabefelder. Auf Touch entfällt der Cursor vollständig.
- **Links:** Unterstreichung wächst von links (`scaleX`, `transform-origin: left`).
- **Formulare:** Fehler erscheinen inline, setzen `aria-invalid` und fokussieren das erste
  fehlerhafte Feld.

### 6.6 Seitenübergänge

Über die native **View-Transitions-API** (`@view-transition { navigation: auto }`).
Topbar und Navigation erhalten eigene `view-transition-name` und bleiben dadurch stehen,
während der Seiteninhalt überblendet (aus 0,28 s, ein 0,42 s).

Browser ohne Unterstützung navigieren einfach sofort — sauberes Progressive Enhancement.
Zusätzlich werden interne Ziele bei Hover bzw. Touch per `<link rel="prefetch">` vorgeladen
(nicht bei aktiviertem Datensparmodus oder 2G).

Der frühere JS-Vorhang ist entfernt: er verzögerte **jede** interne Navigation um 480 ms,
bevor der Browser überhaupt zu laden begann.

---

## 7. Reduced Motion

Keine pauschale Reduktion auf `duration: 0`. Was Beschwerden auslöst, ist Ortsveränderung —
nicht Deckkraft. Entsprechend gibt es eine **eigene, bewusst vereinfachte Fassung**:

| Bereich | Normal | Bei `prefers-reduced-motion: reduce` |
|---|---|---|
| Reveals | Aufstieg + Blende, 0,7 s | reine Blende, 0,2 s, ohne Versatz |
| Wort-Reveal | Wörter steigen aus Maske | sofort sichtbar, keine Bewegung |
| Parallax | drei Tiefenstufen | aus |
| Signatur | 250 vh gepinnte Timeline | Standbild, Foto ungeclippt, Pin aufgelöst |
| Filmstreifen | horizontal gepinnt | **vertikales Raster** |
| Marquee | Dauerlauf 38 s | steht, umgebrochen als Textzeile |
| Filmkorn | Blend-Layer | aus |
| Kontextcursor | aktiv | entfällt |
| Seitenübergang | Überblendung | sofort |
| Mobile-Menü | Kreis-Clip | reine Blende, 0,2 s |
| Zustandswechsel | – | **bleiben sichtbar** (Fokus, Hover, Fehler, Menü) |

**Messbare Folge:** Die Startseite ist in dieser Fassung 14 442 px statt 17 662 px lang —
das Erlebnis ist nicht nur ruhiger, sondern auch kürzer.

Ein Wechsel der Systemeinstellung lädt die Seite neu, statt einen halbgaren Mischzustand
zu zeigen.

---

## 8. Mobile Motion

Mobile ist eine eigene Regie, keine abgeschaltete Desktopfassung.

| Maßnahme | Wert |
|---|---|
| Parallax-Distanzen | auf ~35 % (`--plx-far: 9px`, `mid: 6px`, `near: 3px`) |
| Dauern | `--dur-l` 0,85 s, `--dur-xl` 1,1 s, Stagger 50 ms |
| Signatur-Pin | 190 vh statt 250 vh |
| Filmstreifen | natives Snap-Scrolling mit eigenem Zähler statt GSAP-Pin |
| Leistungsindex | Bildwechsel über Scrollposition statt Hover |
| Horizontale Reveals | auf vertikalen Versatz umgestellt |
| Bild-Zoom im Reveal | `scale(1.07)` statt `1.12` |
| Filmkorn | aus (teuerster Blend-Layer im Stylesheet) |
| Kontextcursor, magnetische Buttons | entfallen |
| Sticky-CTA | ab 70 % Viewporthöhe eingeblendet |

---

## 9. Z-Index

```
scroll-prog 90 · topbar 60 · nav 70 · sticky-cta 65 · mobile-nav 100
cookie 110 · lightbox 120 · Filmkorn 997 · Kontextcursor 9999
```

---

## 10. Was bewusst NICHT eingesetzt wird

| Verzichtet auf | Begründung |
|---|---|
| WebGL / Three.js / R3F | Der Nutzen wäre dekorativ, die Kosten real (≥160 KB, eigener Render-Loop, Mobile-Downscaling, statischer Fallback, Kontextverlust-Behandlung). Die Bildsprache lebt von echten Projektfotos; eine 3D-Pflanze würde davon ablenken. Tiefe entsteht hier durch Parallax und Masken. |
| Locomotive Scroll | Lenis ist bereits da. Zwei Smooth-Scroll-Systeme konkurrieren um dasselbe Ereignis. |
| Barba.js | Die View-Transitions-API leistet dasselbe nativ, ohne Router, ohne Bytes, ohne Fokus- und Screenreader-Verwaltung selbst nachzubauen. |
| Lottie / Rive | Für zwei gezeichnete Linien eine Laufzeitbibliothek plus Autorenwerkzeug — unverhältnismäßig. `stroke-dasharray` genügt. |
| Framer Motion / React Spring | React-spezifisch, das Projekt nutzt kein Framework. |
| Intro-Loader | Verdeckte das LCP-Element für über 2,5 s und sperrte solange das Scrollen. |
| Globaler Ersatzcursor | Ersetzte den Systemcursor auch in Formularen; der nachlaufende Ring war auf mittleren Grautönen unsichtbar. |
| Partikel, Blätterschwarm, Auto-Play-Video | Wurden bereits in v5/v6 verworfen. Kein lizenziertes, self-hostbares Material vorhanden; widerspricht Performance und DSGVO-Aufbau. |
