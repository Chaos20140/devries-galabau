# AUDIT-BEFORE-UPGRADE — de Vries Galabau

**Datum:** 2026-07-26
**Projektpfad:** `C:\Users\Tolun\DeVries Galabau`
**Ausgangsstand:** v6 (`?v=6`), statisches HTML/CSS/JS, kein Build-Step
**Branch:** `improvement/awwwards-motion-upgrade` (Basis-Commit `chore: save website before awwwards upgrade`)
**Sicherung:** Vollkopie unter `C:\Users\Tolun\DeVries Galabau_BACKUP_2026-07-26`

## Erhebungsmethode

Alle Befunde stammen aus **tatsächlicher Messung**, nicht aus Codelektüre allein:

- Lokaler Server `python -m http.server 5177`, Chromium via Playwright 1.62.
- 14 Seiten × 2 Viewports (1440×900, 390×844) automatisiert geladen und vermessen.
- Erhoben je Seite: Konsolenmeldungen, `pageerror`, fehlgeschlagene Requests, HTTP-Status ≥ 400,
  Dokumenthöhe, horizontaler Overflow, Überschriftenfolge, Bildattribute, Meta/SEO-Tags.
- Rohdaten: `docs/audit-before/audit-raw.json`, Screenshots: `docs/audit-before/*.jpg`.

### Was ausdrücklich in Ordnung ist

Damit der Bericht ehrlich bleibt — folgende Punkte wurden geprüft und sind **fehlerfrei**:

- **0 JavaScript-Fehler, 0 Konsolenwarnungen** auf allen 14 Seiten in beiden Viewports.
- **0 fehlgeschlagene Requests, 0 HTTP-Fehler ≥ 400** — kein einziges fehlendes Asset.
- **Keine defekten Bilder.** Ein erster automatischer Lauf meldete 12 Bilder mit `naturalWidth === 0`;
  eine Nachprüfung mit vollständigem Durchscrollen ergab: reines Lazy-Loading-Artefakt, alle Bilder laden.
  (Dieser Falschbefund wird hier bewusst dokumentiert, statt ihn als Fehler auszugeben.)
- **Kein horizontaler Scrollbalken** auf irgendeiner Seite oder Viewportbreite (`scrollWidth === clientWidth`).
- **Alle Bilder haben `alt`** (Dekobilder korrekt mit `alt=""`), **alle haben `width`/`height`** bis auf
  das leere Lightbox-`<img>` (technisch korrekt).
- **Genau eine `<h1>` pro Seite**, `lang="de"`, Canonical, Description, OG/Twitter auf allen Seiten.
- CSP als `<meta>` auf allen Seiten, keine externen CDNs/Fonts/Tracker — DSGVO-Aufbau ist solide.

---

# 1. Kritische Fehler

### K-1 · Hero-Inhalt bricht aus dem Container aus

```
Problem:          .chapter__inner{width:100%} (style.css:173) überschreibt .wrap
                  (style.css:62, gleiche Spezifität 0-1-0, spätere Regel gewinnt).
                  Gemessen: .chapter__inner x=0, Breite 1425px bei 1425px Viewport —
                  Seitenrand 0px. Zum Vergleich .nav__inner: x=40, Breite 1345px.
Priorität:        kritisch
Betroffene Seite: index.html (Startseite, Hero)
Betroffene Datei: assets/css/style.css:173
Auswirkung:       Kicker, H1, Lead und beide CTA-Buttons kleben randlos am Viewport.
                  Auf 390px wird die Headline rechts abgeschnitten („…mit de|m").
                  Die wichtigste Fläche der Website wirkt dadurch defekt.
                  Exakt der Fehler, den CLAUDE.md §17 für .hero__inner festhält —
                  beim Rename auf .chapter__inner wieder eingebaut.
Empfohlene Lösung: width:100% ersatzlos entfernen; .wrap regelt die Breite.
                  Regressionstest: gemessener x-Offset von .chapter__inner muss == .nav__inner sein.
```

### K-2 · Intro-Loader blockiert den Largest Contentful Paint

```
Problem:          #loader deckt den Viewport deckend ab (z-index 9998, background:var(--ink)).
                  main.js:444 wartet auf `load`, dann setTimeout 1500ms, dann clip-path-Transition
                  1s mit .2s Verzögerung (style.css:486). Body-Scroll ist währenddessen gesperrt.
                  Effektiv frühestens ~2,7s bis der Hero sichtbar ist — und erst nach `load`,
                  also nach allen Bildern.
Priorität:        kritisch
Betroffene Seite: index.html
Betroffene Datei: assets/js/main.js:436-454, assets/css/style.css:486-494
Auswirkung:       Das LCP-Element (Hero-Bild + H1) ist bis nach der Loader-Animation verdeckt.
                  LCP < 2,5s ist mit diesem Aufbau strukturell nicht erreichbar.
                  Verstößt direkt gegen die Vorgabe „Hauptüberschrift schnell sichtbar,
                  kein langes erzwungenes Intro".
Empfohlene Lösung: Loader ersatzlos streichen. Die Marke wird über den Hero selbst
                  eingeführt, nicht über eine Wartezeit. Falls ein Auftakt gewünscht ist:
                  maskierter Headline-Reveal auf dem bereits sichtbaren Hero
                  (kein Overlay, keine Scroll-Sperre, kein Warten auf `load`).
```

### K-3 · Seitenvorhang verzögert jede interne Navigation um 480 ms

```
Problem:          main.js:461-471 fängt Klicks auf alle internen .html-Links ab,
                  ruft e.preventDefault(), blendet .curtain ein und navigiert erst
                  nach setTimeout(480ms).
Priorität:        kritisch
Betroffene Seite: alle
Betroffene Datei: assets/js/main.js:456-472
Auswirkung:       Auf jeder Seitennavigation ~0,5s künstliche Latenz, bevor der Browser
                  überhaupt zu laden beginnt. Kein Preload, kein Cross-Fade — der Nutzer
                  sieht eine schwarze Fläche und wartet. Bei langsamer Verbindung addiert
                  sich das auf die reale Ladezeit. Zusätzlich: Zurück-Navigation zeigt
                  den Vorhang teilweise (nur `pageshow`+`persisted` wird abgefangen).
Empfohlene Lösung: Auf die View-Transitions-API umstellen (@view-transition, Chrome/Edge/Safari 18+).
                  Der Übergang läuft dort im Browser-Compositor, ohne Navigation zu verzögern.
                  Browser ohne Unterstützung navigieren einfach sofort — sauberes Progressive Enhancement.
                  Zusätzlich `<link rel="prefetch">` per Hover/Touch auf interne Links.
```

---

# 2. Funktionale Fehler

### F-1 · Kein Fokus-Trap in Mobile-Navigation und Lightbox

```
Problem:          main.js:171-190 (Mobile-Nav) und main.js:376-417 (Lightbox) setzen zwar
                  Body-Scroll-Lock, Escape-Handler und Initialfokus, aber KEINEN Fokus-Trap.
                  Tab wandert aus dem offenen Overlay in die dahinterliegende Seite.
Priorität:        hoch
Betroffene Seite: alle (Mobile-Nav), referenzen.html (Lightbox)
Betroffene Datei: assets/js/main.js:171-190, 376-417
Auswirkung:       WCAG 2.2 AA 2.4.3 verletzt. Tastaturnutzer verlieren im geöffneten Menü
                  die Orientierung und bedienen unsichtbare Elemente.
                  Anmerkung: CLAUDE.md §7 behauptet „Lightbox (zugänglich: Fokus-Trap …)" —
                  diese Aussage ist nicht durch Code gedeckt.
Empfohlene Lösung: Gemeinsame trapFocus(container)-Hilfsfunktion für beide Dialoge,
                  Tab/Shift+Tab zyklisch, Fokus-Rückgabe an den Auslöser beim Schließen.
```

### F-2 · Mobile-Navigation ohne Dialog-Semantik

```
Problem:          <div class="mobile-nav" id="mobileNav"> — kein role="dialog",
                  kein aria-modal, kein aria-hidden/inert im geschlossenen Zustand.
Priorität:        hoch
Betroffene Seite: alle
Betroffene Datei: index.html:84 (+ identisch auf 13 weiteren Seiten)
Auswirkung:       Screenreader kündigen das Menü nicht als Dialog an. Im geschlossenen
                  Zustand schützt nur visibility:hidden — bei geöffnetem Menü bleibt der
                  Hintergrund für assistive Technik erreichbar.
Empfohlene Lösung: role="dialog" aria-modal="true" aria-label="Menü" + inert auf
                  Hintergrundinhalt (oder aria-hidden auf header/main/footer) beim Öffnen.
```

### F-3 · Leistungsbeschreibungen verschwinden auf Mobile

```
Problem:          style.css:542 setzt .svc-row__desc{display:none} unter 860px.
Priorität:        hoch
Betroffene Seite: index.html (Sektion „Vier Disziplinen")
Betroffene Datei: assets/css/style.css:542
Auswirkung:       Auf Mobilgeräten bleiben nur vier nackte Wörter übrig. Die inhaltliche
                  Erklärung („Naturstein · Pflaster · Treppen · Gabionen" usw.) ist für
                  Mobilnutzer und mobile Suchmaschinen-Crawler nicht vorhanden.
                  Content-Parität Desktop/Mobile ist verletzt.
Empfohlene Lösung: Umbrechen statt ausblenden — Beschreibung unter den Namen setzen,
                  linksbündig, kleinere Schriftgröße.
```

### F-4 · Sechs identische Referenz-Links im Filmstreifen

```
Problem:          index.html:223-228 — alle sechs .film-item verlinken auf referenzen.html.
Priorität:        mittel
Betroffene Seite: index.html
Betroffene Datei: index.html:223-228
Auswirkung:       Sechs Projektbilder mit sechs verschiedenen Namen führen an dieselbe
                  Stelle. Der Nutzer erwartet ein Projekt und bekommt eine Übersicht.
                  Für SEO: sechs identische interne Links mit abweichenden Ankertexten.
Empfohlene Lösung: Auf die bereits vorhandenen Projekt-Stubs bzw. Anker in referenzen.html
                  verlinken (referenzen.html#projekt-…), Ankertext = Zielinhalt.
```

### F-5 · Cookie-Hinweis mit widersprüchlicher ARIA-Semantik

```
Problem:          index.html:357 — role="dialog" UND aria-live="polite" gleichzeitig,
                  ohne Fokus-Management, ohne aria-modal.
Priorität:        niedrig
Betroffene Seite: alle
Betroffene Datei: index.html:357 (+ 13 weitere Seiten)
Auswirkung:       Ein Dialog, der nicht fokussiert wird, ist kein Dialog. Die Kombination
                  führt bei manchen Screenreadern zu doppelter oder ausbleibender Ansage.
Empfohlene Lösung: role="region" (bzw. complementary) + aria-label, aria-live entfernen.
                  Es handelt sich um einen reinen Hinweis, keine Einwilligungsabfrage.
```

---

# 3. Technische Schulden

### T-1 · Shared Blocks 14-fach dupliziert

```
Problem:          Topbar, Nav, Mobile-Nav, Footer, Cookie, Script-Tags sind auf jeder
                  der 14 Seiten kopiert (bewusste Entscheidung, kein Build-Step).
Priorität:        mittel
Betroffene Seite: alle
Betroffene Datei: *.html
Auswirkung:       Jede Änderung an Navigation, Kontaktdaten oder Cache-Busting-Parameter
                  muss 14-mal nachgezogen werden. Fehlerquelle Nr. 1 für Inkonsistenzen.
Empfohlene Lösung: Bei diesem Stack (statisch, kein Build) beibehalten, aber absichern:
                  Prüfskript, das die Shared Blocks aller Seiten gegen index.html vergleicht.
```

### T-2 · Tote Selektoren im Motion-Code

```
Problem:          main.js:71 beobachtet u.a. .plan__svg, .hero__inner, .story-band__line;
                  main.js:88-96 setzt Pfadlängen für .plan__svg .draw und .hero__sweep line.
                  Keines dieser Elemente existiert noch (in v3/v4 entfernt).
                  Ebenso ungenutzt in CSS: .tnode__dot, .timeline__prog, .plot__icon, .quote__mark.
Priorität:        niedrig
Betroffene Datei: assets/js/main.js:71,88-96 · assets/css/style.css:315,321,369,373
Auswirkung:       Irreführender Code; erschwert künftige Änderungen.
Empfohlene Lösung: Entfernen bzw. bei Wiederverwendung des Plan-Motivs neu anbinden.
```

### T-3 · Cache-Busting inkonsistent

```
Problem:          CSS/JS tragen ?v=6, Favicons ?v=1, gsap.min.js/ScrollTrigger.min.js/
                  lenis.min.js tragen gar keinen Parameter.
Priorität:        niedrig
Betroffene Datei: alle *.html
Auswirkung:       Bei einem Austausch der Vendor-Bibliotheken erhalten wiederkehrende
                  Besucher die alte Version.
Empfohlene Lösung: Einheitlicher Versionsparameter auf allen selbst gehosteten Assets.
```

---

# 4. Visuelle Schwächen

### V-1 · Kein Signature Moment vorhanden

```
Problem:          Das Leitmotiv „Vom Strich zum Garten" existiert nur noch als Bildunterschrift
                  in .reveal-pin__cap. Die SVG-Plan-Sektion wurde in v3 entfernt
                  (CLAUDE.md §18: „Abstrakte SVG-Plan-Sektion ENTFERNT") und in v4 nicht ersetzt.
                  Was blieb: ein Foto, das per clip-path aufklappt — technisch sauber,
                  aber ohne Bezug zum Garten- und Landschaftsbau.
Priorität:        hoch
Betroffene Seite: index.html (#signatur)
Betroffene Datei: index.html:183-193
Auswirkung:       Die Seite hat keinen einzigen Moment, den man sich merkt. Genau das
                  unterscheidet Awwwards-Niveau von gutem Handwerk. Der Clip-Reveal ist
                  ein generischer Effekt, den jede Portfolio-Seite verwendet.
Empfohlene Lösung: Markenspezifischer Moment aus dem Metier: Gartenplan-Linien zeichnen
                  sich beim Scrollen und lösen sich in das fertige Foto auf. Der Umweg über
                  ein „schlechtes Plan-SVG" (v3-Feedback) wird vermieden, indem der Plan
                  als präzise Vektor-Zeichnung mit echten Gartenelementen angelegt wird,
                  nicht als Doodle — und indem das Foto führt, der Plan nur die Überblendung ist.
```

### V-2 · Kein einziger Parallax-Effekt

```
Problem:          Die Engine unterstützt [data-parallax] (main.js:150-155).
                  Gemessen: 0 Vorkommen in allen 14 HTML-Dateien.
Priorität:        hoch
Betroffene Seite: alle
Auswirkung:       Alle Bildebenen bewegen sich exakt mit dem Scroll. Der Seite fehlt
                  jede räumliche Tiefe — sie liest sich flach, obwohl das Bildmaterial
                  (Gärten, Ebenen, Materialien) genau danach verlangt.
Empfohlene Lösung: Gestaffelte Tiefenebenen: Hero-Bild langsam, Sektionsbilder in
                  beschnittenen Containern, Vordergrund minimal schneller.
                  Bewegungsdistanz begrenzen, auf Mobile stark reduzieren.
```

### V-3 · Legacy-Karten-Raster auf Unterseiten

```
Problem:          .plots (2-spaltiges Kachelraster mit Deko-Index-Zahlen) und .quotes
                  (3-spaltiges Zitat-Raster) stammen aus v1 und wurden nur umgefärbt.
Priorität:        hoch
Betroffene Seite: gartengestaltung, gartenplanung, gartenpflege, bepflanzung, ueber-uns
Betroffene Datei: assets/css/style.css:359-377
Auswirkung:       Die Startseite ist editorial, die Unterseiten sind Kachelraster.
                  Der Bruch ist deutlich sichtbar und lässt die Unterseiten wie ein
                  Standardtemplate wirken — genau die Kritik aus v1–v3.
Empfohlene Lösung: Unterseiten auf dieselbe editoriale Struktursprache heben
                  (Zeilen-Index, Haarlinien, asymmetrische Feature-Reihen).
```

### V-4 · Marquee ohne inhaltlichen Bezug

```
Problem:          index.html:143-148 — Endlos-Laufband mit acht Leistungsbegriffen,
                  aria-hidden, rein dekorativ, 38s Dauerläufer.
Priorität:        mittel
Betroffene Seite: index.html
Auswirkung:       Ein Awwwards-Klischee von 2021. Trägt nichts zur Marke bei und läuft
                  dauerhaft — d.h. permanente Compositor-Last, auch außerhalb des Viewports.
Empfohlene Lösung: Entweder inhaltlich aufladen (Materialien mit Bildbezug) oder ersetzen.
                  In jedem Fall bei prefers-reduced-motion und außerhalb des Viewports anhalten.
```

### V-5 · Sehr viel ungenutzte Fläche in den Statement-Sektionen

```
Problem:          .statement ist 1006px hoch für einen Satz; .statement__big hat
                  max-width:20ch, die rechten ~45% der Fläche bleiben leer.
Priorität:        mittel
Betroffene Seite: index.html (2×)
Betroffene Datei: assets/css/style.css:189-195
Auswirkung:       Großzügigkeit kippt in Leere, weil rechts nichts passiert —
                  weder Bild, noch Linie, noch Bewegung.
Empfohlene Lösung: Die Fläche aktivieren (begleitende Detailaufnahme, Materialstreifen
                  oder eine sich zeichnende Linie), statt nur Weißraum zu vergrößern.
```

---

# 5. UX-Probleme

### U-1 · Startseite ist 20 Screens lang, ein Drittel davon sind Effekte

```
Problem:          Gemessen bei 1440×900: Dokumenthöhe 18.108px = 20,1 Bildschirmhöhen.
                  Davon .reveal-pin 2.700px (3,0 Screens, ein Clip-Reveal) und
                  der Filmstreifen-Pin-Spacer 3.730px (4,1 Screens, sechs Bilder).
                  Zusammen 6.430px = 35,5% der Seite für zwei Effekte.
Priorität:        hoch
Betroffene Seite: index.html
Betroffene Datei: assets/css/style.css:224 (height:300vh), assets/js/main.js:342-353
Auswirkung:       Der Nutzer scrollt lange durch Sektionen, in denen inhaltlich nichts
                  passiert. Das ist die Definition von „großen leeren Scrollbereichen".
                  Auf Mobile ist die Seite mit 12.378px zwar kürzer, der Filmstreifen-Pin
                  entfällt dort aber ersatzlos (nur ab 861px aktiv).
Empfohlene Lösung: Pin-Strecken deutlich kürzen und in derselben Strecke mehr erzählen
                  (gestaffelte Inhalte statt einer einzigen Transformation).
```

### U-2 · Filmstreifen bietet auf Desktop keine Tastaturbedienung

```
Problem:          main.js:344 setzt filmVp.style.overflow = "hidden" und ersetzt das
                  native Scrollen durch GSAP-Pin+Scrub.
Priorität:        hoch
Betroffene Seite: index.html
Betroffene Datei: assets/js/main.js:342-353
Auswirkung:       Der horizontale Bereich lässt sich mit Tastatur nur erreichen, indem
                  man vertikal durch die gesamte Pin-Strecke scrollt. Beim Tabben auf ein
                  Element außerhalb des Sichtbereichs springt der Browser — das Element
                  liegt aber transformiert außerhalb. Fokus geht visuell verloren.
Empfohlene Lösung: Natives Scroll-Snapping beibehalten (funktioniert bereits auf Mobile),
                  die GSAP-Choreografie nur additiv darüberlegen — oder Fokus-Events
                  abfangen und die Timeline mitziehen.
```

### U-3 · Kein Hinweis auf den Sendeweg der Formulare

```
Problem:          Beide Formulare senden per mailto:. Der Nutzer erfährt das erst,
                  wenn sich sein E-Mail-Programm öffnet.
Priorität:        mittel
Betroffene Seite: kontakt.html, anfrage.html
Betroffene Datei: assets/js/main.js:238-312
Auswirkung:       Auf Geräten ohne konfiguriertes Mailprogramm passiert scheinbar nichts.
                  Die Anfrage geht verloren, der Nutzer merkt es nicht.
                  anfrage.html navigiert zusätzlich nach 400ms zu danke.html —
                  also auch dann „Danke", wenn gar nichts versendet wurde.
Priorität-Hinweis: Ein echter Endpoint ist eine Kundenentscheidung (Kosten/DSGVO-Vertrag)
                  und wird hier NICHT eigenmächtig eingebaut.
Empfohlene Lösung: Sendeweg vorab benennen („Ihre Anfrage wird über Ihr E-Mail-Programm
                  versendet"), Kopier-Fallback mit allen Angaben anbieten,
                  Weiterleitung nach danke.html nicht mehr bedingungslos auslösen.
```

---

# 6. Responsive-Probleme

### R-1 · Hero-Headline auf 390px abgeschnitten

```
Problem:          Folge von K-1. Gemessen bei 390×844: .chapter__title beginnt bei x=0,
                  das letzte Zeichen der ersten Zeile liegt auf der Viewportkante.
Priorität:        kritisch
Betroffene Seite: index.html
Betroffene Datei: assets/css/style.css:173
Auswirkung:       Die Startseite wirkt auf dem meistgenutzten Gerätetyp fehlerhaft.
Empfohlene Lösung: siehe K-1.
```

### R-2 · Reveal-Elemente ragen im Ausgangszustand über den Viewport

```
Problem:          [data-reveal="left"]:not(.is-in) setzt translateX(-40px),
                  [data-reveal="right"] entsprechend +40px (style.css:518-519).
                  Gemessen bei 390px auf ueber-uns/gartengestaltung/gartenplanung/
                  gartenpflege/stellenangebote: Elemente bei x=-21 bzw. rechts bei 411
                  (Viewport 390).
Priorität:        mittel
Betroffene Seite: ueber-uns, gartengestaltung, gartenplanung, gartenpflege,
                  bepflanzung, kontakt, stellenangebote
Betroffene Datei: assets/css/style.css:518-519
Auswirkung:       Kein Scrollbalken (html{overflow-x:clip} fängt es ab), aber Inhalt
                  liegt bis zum Reveal teilweise außerhalb. Fällt der IntersectionObserver
                  aus, bleibt er dort. Horizontale Reveals sind auf schmalen Viewports
                  grundsätzlich das falsche Mittel.
Empfohlene Lösung: Unterhalb ~860px auf vertikalen Versatz umschalten.
```

### R-3 · Filmstreifen-Erlebnis fehlt auf Mobile ersatzlos

```
Problem:          main.js:343 aktiviert die Pin-Choreografie nur ab 861px.
                  Darunter bleibt ein einfacher horizontaler Scrollcontainer.
Priorität:        mittel
Betroffene Seite: index.html
Auswirkung:       Mobile bekommt die abgespeckte Desktopversion statt einer eigenen
                  Gestaltung — genau das, was der Auftrag ausschließt.
Empfohlene Lösung: Eigene mobile Dramaturgie (Snap + Fortschrittsanzeige + Bildzähler).
```

---

# 7. Accessibility-Probleme

### A-1 · Überschriftenhierarchie springt H2 → H4

```
Problem:          Gemessene Folgen:
                  kontakt.html    H1,H4,H4,H2,H2,H4,H4,H4   (H1 → H4)
                  index.html      H1,H2,…,H2,H4,H4,H4,H4,H4,H2,…
                  ueber-uns.html  H1,H2,H4,H4,H4,H4,H2,H2,H2,H4,H4,H4
                  Ursache: .tnode h4, .vcard h4, .infoblock h4 und die drei Footer-
                  Spaltenüberschriften <h4> werden ohne dazwischenliegende H3 verwendet.
Priorität:        hoch
Betroffene Seite: alle 14
Betroffene Datei: alle *.html, assets/css/style.css:310,318,427,459
Auswirkung:       WCAG 2.2 AA 1.3.1. Screenreader-Nutzer, die per Überschriftenliste
                  navigieren, verlieren die Gliederung.
Empfohlene Lösung: Ebenen korrigieren (H3 statt H4), Größe rein über CSS steuern.
                  Footer-Spaltenüberschriften auf H2 (eigenständiger Navigationsbereich)
                  und optisch klein halten.
```

### A-2 · Custom Cursor ersetzt den Systemcursor vollständig

```
Problem:          style.css:498 — body.has-cursor{cursor:none} plus cursor:none auf
                  a, button, input, textarea, select, label, .gitem, [data-magnetic].
                  Der Ersatz ist ein per rAF nachlaufender Ring mit mix-blend-mode:difference.
Priorität:        hoch
Betroffene Seite: alle (Desktop, pointer:fine)
Betroffene Datei: assets/css/style.css:495-499, assets/js/main.js:419-434
Auswirkung:       Der Ring läuft dem Zeiger mit 0.18-Dämpfung hinterher — bei Formularen
                  fehlt der I-Beam-Cursor, bei deaktiviertem JS-Frame bzw. auf Flächen,
                  wo difference-Blending den Ring unsichtbar macht (mittlere Grautöne),
                  sieht der Nutzer gar keinen Zeiger mehr. Direkt gegen die Vorgabe
                  „Custom Cursor dürfen den normalen Cursor nicht vollständig ersetzen,
                  wenn dadurch die Bedienbarkeit leidet".
Empfohlene Lösung: Systemcursor sichtbar lassen, den Ring nur als zusätzliche Ebene
                  führen — und ihn nur dort einsetzen, wo er Bedeutung trägt
                  (Bildergalerie: „Projekt ansehen"), nicht global.
```

### A-3 · Fokus-Trap fehlt (siehe F-1), Dialog-Rolle fehlt (siehe F-2)

### A-4 · Reduced-Motion ist nur ein Zeit-Kill-Switch

```
Problem:          style.css:557 setzt global animation-duration/transition-duration auf
                  .001ms. Das ist exakt das Muster, das der Auftrag ausschließt.
                  Immerhin korrekt: .reveal-pin wird entpinnt (style.css:561),
                  Cursor und Marquee aus, GSAP-Blöcke sind mit !reduce gegated.
Priorität:        mittel
Betroffene Seite: alle
Betroffene Datei: assets/css/style.css:556-562
Auswirkung:       Nutzer mit Bewegungsempfindlichkeit bekommen dieselbe Seite mit
                  Dauer 0 — inklusive weiterhin sticky/pinned Sektionen und der
                  vollen 20-Screen-Länge. Es fehlt eine bewusst vereinfachte Fassung.
Empfohlene Lösung: Eigene, kürzere Dramaturgie: Pins auflösen, Filmstreifen als
                  statisches Raster, Parallax aus, Reveals durch reine Deckkraft
                  (kurz, aber nicht 0), Scroll-Fortschritt bleibt.
```

### A-5 · Touch-Ziele im Topbar unter 44px

```
Problem:          .topbar a hat font-size .74rem und padding-block .3rem am Container;
                  die Trefferfläche der Telefon-/E-Mail-Links bleibt unter 44px Höhe.
Priorität:        mittel
Betroffene Seite: alle
Betroffene Datei: assets/css/style.css:104-110
Auswirkung:       WCAG 2.2 AA 2.5.8 (Target Size Minimum, 24×24 CSS-px) wird knapp
                  erreicht, die empfohlenen 44px werden verfehlt.
Empfohlene Lösung: min-height 44px mit negativem Margin-Ausgleich, damit die Leiste
                  optisch schlank bleibt.
```

---

# 8. Performance-Probleme

### P-1 · Layout-Thrashing im Scroll-Handler

```
Problem:          main.js:150-155 iteriert über Parallax-Elemente und führt je Element
                  erst getBoundingClientRect() (Layout-Lesen) und direkt danach
                  style.transform = … (Layout-Schreiben) aus. Gleiches Muster in der
                  Timeline-Schleife (main.js:157-164).
Priorität:        hoch (wird akut, sobald Parallax laut V-2 eingesetzt wird)
Betroffene Datei: assets/js/main.js:143-165
Auswirkung:       Jeder Schreibvorgang invalidiert das Layout für das nächste Lesen —
                  erzwungene Reflows pro Frame. Aktuell folgenlos, weil 0 Parallax-Elemente
                  existieren; mit der geplanten Parallax-Ebene wäre es der Haupt-Ruckelgrund.
Empfohlene Lösung: Lesen und Schreiben trennen (erst alle Rects sammeln, dann alle
                  Transforms setzen).
```

### P-2 · Filmkorn-Overlay über der gesamten Seite

```
Problem:          style.css:484 — body::after, position:fixed, inset:0, z-index:997,
                  mix-blend-mode:multiply mit einem feTurbulence-SVG als Hintergrund.
Priorität:        mittel
Betroffene Seite: alle
Betroffene Datei: assets/css/style.css:484-485
Auswirkung:       Ein bildschirmfüllender Blend-Mode-Layer zwingt den Compositor, bei
                  jedem Frame die gesamte Seite neu zu mischen. Auf schwächeren
                  Mobilgeräten ist das die teuerste Einzelregel im Stylesheet.
Empfohlene Lösung: Deckkraft und Fläche reduzieren oder auf Mobilgeräten deaktivieren.
```

### P-3 · Dauerhaftes will-change und Dauerläufer-Animation

```
Problem:          style.css:226 will-change:clip-path permanent auf .reveal-pin__photo.
                  style.css:507 marquee-Animation 38s infinite, läuft auch außerhalb
                  des Viewports weiter.
Priorität:        mittel
Betroffene Datei: assets/css/style.css:226, 507
Auswirkung:       Permanenter Compositor-Layer bzw. permanente Frame-Anforderung.
Empfohlene Lösung: will-change nur während der aktiven ScrollTrigger-Phase setzen;
                  Marquee per IntersectionObserver pausieren.
```

### P-4 · Große WebP-Dateien ohne AVIF-Alternative

```
Problem:          Mehrere ‑1600.webp über 500 KB: ref-formschnitte 628 KB,
                  ref-vorgarten2 624 KB, projekt-naturnahe-2 620 KB,
                  ref-mauergestaltung 619 KB, ref-natursteinmauer 513 KB,
                  ref-vorgarten 504 KB, projekt-pflaster-ios1 522 KB.
Priorität:        mittel
Betroffene Datei: assets/img/*-1600.webp
Auswirkung:       Auf der Referenzenseite (27 Bilder) summiert sich das erheblich.
                  Die Bilder sind lazy geladen, belasten also nicht den LCP,
                  aber das Gesamtvolumen beim Durchscrollen.
Empfohlene Lösung: Qualität der ‑1600-Varianten nachjustieren; optional AVIF
                  als <source> ergänzen (Werkzeugkette vorhanden: Originale in raw/).
```

### P-5 · Kein ScrollTrigger.refresh() nach Font-Load

```
Problem:          main.js:354 refresht nur bei window.load.
Priorität:        niedrig
Betroffene Datei: assets/js/main.js:354
Auswirkung:       Bei font-display:swap ändert der Fontwechsel die Texthöhen nach
                  dem Refresh — Pin-Start/Ende können minimal verrutschen.
Empfohlene Lösung: document.fonts.ready zusätzlich abwarten.
```

---

# 9. SEO-Probleme

### S-1 · Strukturierte Daten nur auf 7 von 14 Seiten

```
Problem:          Gemessen (Anzahl ld+json-Blöcke):
                  vorhanden: index, ueber-uns, gartengestaltung, gartenplanung,
                             gartenpflege, bepflanzung, kontakt
                  fehlt:     referenzen, anfrage, danke, stellenangebote,
                             impressum, datenschutz, 404
Priorität:        mittel
Betroffene Seite: 7 Seiten
Auswirkung:       Leistungsseiten ohne Service-Auszeichnung, Referenzen ohne
                  ImageObject/CollectionPage, Stellenangebote ohne Bezug.
Empfohlene Lösung: LocalBusiness bleibt auf index (Single Source).
                  Ergänzen: BreadcrumbList auf allen Unterseiten,
                  Service auf den vier Leistungsseiten, CollectionPage auf referenzen.
                  Keine erfundenen Angaben (keine aggregateRating, keine Preise).
```

### S-2 · Sichtbare Breadcrumbs ohne maschinenlesbares Gegenstück

```
Problem:          .phero__crumb rendert „START · REFERENZEN — UNSERE ARBEIT",
                  es gibt aber kein BreadcrumbList-Schema und keine <nav>-Auszeichnung.
Priorität:        mittel
Betroffene Seite: alle Unterseiten
Betroffene Datei: assets/css/style.css:444
Empfohlene Lösung: <nav aria-label="Brotkrumen"> + <ol> + BreadcrumbList-JSON-LD.
```

### S-3 · 404-Seite mit Self-Canonical

```
Problem:          404.html trägt canonical auf sich selbst bei robots:noindex.
Priorität:        niedrig
Betroffene Datei: 404.html
Auswirkung:       Widersprüchliche Signale; unschädlich wegen noindex, aber unsauber.
Empfohlene Lösung: Canonical auf der 404-Seite entfernen.
```

---

# 10. Motion-Probleme

### M-1 · Kein zusammenhängendes Motion-System

```
Problem:          Vier unabhängige Bewegungsquellen ohne gemeinsame Tokens:
                  CSS-Reveals (.9s, --ease-io), reveal-words (.9s, --ease, 55ms Stagger),
                  data-stagger (.8s, 80ms), GSAP-Scrub (ease:"none", scrub .5/.6),
                  Loader (1s + 1.5s Wartezeit), Curtain (.5s), Marquee (38s linear).
                  Dauern und Kurven sind pro Komponente einzeln festgelegt.
Priorität:        hoch
Betroffene Datei: assets/css/style.css, assets/js/main.js
Auswirkung:       Die Bewegungen fühlen sich nicht verwandt an. Genau das trennt ein
                  Motion-System von einer Sammlung von Effekten.
Empfohlene Lösung: Motion-Tokens (--dur-xs/s/m/l, --ease-*) definieren und ausnahmslos
                  verwenden; Stagger-Schritt vereinheitlichen.
```

### M-2 · Reveal-Zustand ist an .js gekoppelt, ohne Sicherheitsnetz

```
Problem:          style.css:516 blendet [data-reveal] auf opacity:0, sobald html.js gesetzt ist.
                  Sichtbar wird es erst durch den IntersectionObserver.
Priorität:        mittel
Betroffene Datei: assets/css/style.css:516, assets/js/main.js:70-85
Auswirkung:       Bricht main.js nach dem Inline-Script (Syntaxfehler, blockierte Datei,
                  CSP-Verstoß), bleibt der gesamte Seiteninhalt unsichtbar.
                  Der No-JS-Fall ist abgesichert, der Teilausfall-Fall nicht.
Empfohlene Lösung: Sicherheitsnetz einbauen — Reveals nach kurzer Frist ungeachtet
                  des Observers freigeben (Timeout oder @supports-Fallback).
```

### M-3 · Kein Reduced-Motion-Konzept für den Filmstreifen

```
Problem:          Bei reduce wird der GSAP-Block übersprungen. Der Filmstreifen bleibt
                  als horizontal scrollbarer Container bestehen — ohne Hinweis,
                  ohne Fortschrittsanzeige, mit ausgeblendeter Scrollbar
                  (scrollbar-width:none, style.css:242).
Priorität:        mittel
Betroffene Datei: assets/css/style.css:242, assets/js/main.js:334-357
Auswirkung:       Für Reduced-Motion-Nutzer ein Bereich, dessen Bedienbarkeit
                  nicht erkennbar ist.
Empfohlene Lösung: Bei reduce als vertikales Raster ausgeben.
```

---

# 11. Konkrete Awwwards-Potenziale

Bewertung: Die Seite ist handwerklich **überdurchschnittlich** (0 Konsolenfehler, 0 fehlende Assets,
self-hosted, DSGVO-sauber, echte Fotos, eigenständige Typografie). Was zum Awwwards-Niveau fehlt,
ist **keine weitere Politur, sondern Substanz an drei Stellen**:

| # | Potenzial | Warum es trägt |
|---|---|---|
| 1 | **Signature Moment „Plan wird Garten"** | Einziger Moment mit echtem Metier-Bezug. Ersetzt V-1. Der v3-Fehler (schlechtes Doodle-SVG) wird vermieden, indem das Foto führt und der Plan nur als präzise Überblendung darüberliegt. |
| 2 | **Leitmotiv „Schicht für Schicht" als Scrollprinzip** | Erde → Weg → Stein → Pflanze → Licht als gestaffelte Tiefenebenen. Gibt der ganzen Seite eine Klammer statt einzelner Effekte. Löst V-2 und M-1 zusammen. |
| 3 | **Leistungen als Scrollytelling statt Hover-Index** | Der Hover-Index funktioniert auf Desktop gut, auf Touch gar nicht (F-3 blendet dort sogar den Text aus). Sticky-Text mit wechselnden Bildern funktioniert auf beiden. |
| 4 | Kontextcursor „Projekt ansehen" nur in der Galerie | Ersetzt den globalen Cursor (A-2) durch einen, der Bedeutung trägt. |
| 5 | Bild-Reveals mit Maske statt Deckkraft | Vorhandene .img-reveal-Klasse wird bereits nur an 6 Stellen genutzt; systematisch einsetzen. |
| 6 | Eigene mobile Dramaturgie | Behebt R-3 und hebt Mobile vom „reduzierten Desktop" ab. |

---

# 12. Priorisierte Aufgabenliste

| Rang | Aufgabe | Befund | Aufwand |
|---|---|---|---|
| 1 | Hero-Container-Bug beheben | K-1, R-1 | minimal |
| 2 | Loader entfernen | K-2 | klein |
| 3 | Navigationsvorhang → View Transitions | K-3 | mittel |
| 4 | Fokus-Trap + Dialog-Rollen | F-1, F-2, A-3 | mittel |
| 5 | Überschriftenhierarchie korrigieren | A-1 | mittel (14 Seiten) |
| 6 | Leistungsbeschreibung auf Mobile zeigen | F-3 | minimal |
| 7 | Motion-Tokens einführen | M-1 | mittel |
| 8 | Signature Moment bauen | V-1 | groß |
| 9 | Parallax-/Tiefensystem | V-2, P-1 | mittel |
| 10 | Leistungs-Scrollytelling | Potenzial 3, F-3 | groß |
| 11 | Pin-Strecken kürzen | U-1 | klein |
| 12 | Filmstreifen tastaturfähig + mobile Fassung | U-2, R-3, M-3 | mittel |
| 13 | Custom Cursor entschärfen | A-2 | klein |
| 14 | Unterseiten-Raster auf Editorial heben | V-3 | groß |
| 15 | Reduced-Motion-Fassung | A-4 | mittel |
| 16 | Strukturierte Daten + Breadcrumbs | S-1, S-2 | mittel |
| 17 | Performance-Feinschliff | P-1…P-5 | mittel |
| 18 | Tote Selektoren, Cache-Busting | T-2, T-3 | klein |
| 19 | Formular-Sendeweg transparent machen | U-3 | klein |

Reihenfolge: **1–6 vor allem anderen** (kritisch und funktional), danach 7–12 (Kern der
gestalterischen Aufwertung), dann 13–19.
