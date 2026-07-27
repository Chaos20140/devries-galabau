# IMAGE_SOURCES — de Vries Galabau

> Priorität laut Briefing: **1) echte Firmen-/Projektfotos**, 2) vorhandene freigegebene Medien,
> 3) lizenzierte Stockfotos, 4) markierte Platzhalter. Diese Seite nutzt fast ausschließlich (1).

## Herkunft & Rechte
Alle Fotos stammen **von der bestehenden eigenen Website des Kunden** (`devries-galabau.de` bzw. die
Schwesterseite `andreasdevries.de`, gleicher Inhaber Andreas de Vries). Es sind die **eigenen
Unternehmens- und Projektbilder** des Kunden → Weiterverwendung im Redesign derselben Firma ist
zulässig. Rohdownloads: `assets/img/raw/` (nicht deployen). Optimiert (WebP, `‑1600`/`‑800`,
Dimensionen in `assets/img/img-manifest.json`): `assets/img/`.

## Fremdmaterial: zwei Texturen unter freier Lizenz (seit v19)

Ausnahme von der Regel „nur eigene Fotos" — bewusst und eng begrenzt. Es handelt sich
**nicht** um Projektbilder, sondern um **Materialtexturen als Hintergrund** der beiden
Kapitelbänder auf der Startseite. Sie behaupten nichts über ausgeführte Arbeiten.

| Datei | Verwendung | Lizenz | Urheber | Quelle |
|---|---|---|---|---|
| `textur-boden-mulch` (`-400`/`-800`/`-1600`.webp) | Kapitelband „Ein Garten entsteht Schicht für Schicht" (ersetzt das frühere Marquee) | **CC0** (Public Domain Dedication) | Tomwsulcer | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Surfaces_woody_mulch_broken_sticks_on_the_ground.JPG) |
| `textur-naturstein` (`-400`/`-800`/`-1600`.webp) | Kapitelband „Vom ersten Spatenstich bis zum letzten Pflasterstein" | **CC0** (Public Domain Dedication) | Joselodos | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Polygonal_sandstone_and_limestone_wall.jpg) |

**Warum Wikimedia Commons und nicht Unsplash/Pexels/Dribbble/Pinterest:**
Bei Commons ist die Lizenz je Datei maschinenlesbar hinterlegt und dauerhaft nachprüfbar —
für eine deutsche Firmenseite ist genau das der Punkt, falls jemand nachfragt.
Unsplash und Pexels brauchen für den automatisierten Bezug einen API-Schlüssel; ihre
Lizenzen sind zwar großzügig, aber nicht als Dateimetadatum abrufbar.
**Dribbble und Pinterest scheiden vollständig aus** — dort liegen fremde Arbeiten unter
vollem Urheberrecht; eine Nutzung wäre eine Rechtsverletzung zulasten des Kunden.

**CC0 verlangt keine Namensnennung.** Sie ist hier trotzdem dokumentiert, damit die
Herkunft bei künftigen Änderungen nachvollziehbar bleibt.

**Bearbeitung dieser beiden:** auf 1600/800/400 px skaliert, leicht weichgezeichnet
(`blur 0.7`) und stark komprimiert (WebP q36–52). Die Weichzeichnung ist gestalterisch
gewollt — die Bänder tragen Atmosphäre, keine Details — und senkt das Datenvolumen
um rund zwei Drittel (Boden 1600er: 542 → 244 KB).

## Bearbeitungen
Skaliert (max. 1600 px, Hero 1920 px) + Recompression zu **WebP** (q80–82) via ffmpeg; keine
inhaltlichen Manipulationen. Favicons/Logo aus dem Original-Markenlogo abgeleitet (Scale zu
16/32/180/512 px). `og-default.jpg` = zentraler Crop des Hero-Fotos (1200×630).

## Bestand (echte Fotos, Auszug — Zuordnung)
| Datei (Basis, +`-1600`/`-800`.webp) | Verwendung | Motiv / Alt-Grundlage |
|---|---|---|
| `hero-header` (1920×1080) | **Home-Hero** | Holzsteg am Teich, Teakstühle, Terrakotta, Schilf |
| `vorgarten-beet-natursteinmauer` | Home/Gestaltung | Vorgarten, farbiges Beet, Natursteinmauer |
| `gartenpflege` | Gartenpflege | Rasen/Strauchschnitt/Beetpflege |
| `gartenplan-zeichnung` | Gartenplanung (Beleg-Bild) | Garten-Planzeichnung ⚠️ enthält fremde (kyrill.) Annotationen → nur beschnitten/als Textur/klein einsetzen; **Signatur-Animation ist EIGENES SVG** |
| `bepflanzung-vorgarten` / `bepflanzung-pflanzen` / `bepflanzung-natur` | Bepflanzung | Blühbeete, Pflanzen, naturnah |
| `gartengestaltung-natursteine` | Gartengestaltung | Natursteine/Pflaster/Mauerbau |
| `treppenbau-wasser` | Gestaltung | Treppenbau mit Wassermanagement |
| `teichbau` | Pflege/Gestaltung | Teichbau Salzhemmendorf |
| `hofeinfahrt-pflaster` / `projekt-pflaster-ios1` | Gestaltung/Referenzen | Pflaster Hofeinfahrt (echte Baustellenfotos) |
| `ref-mauergestaltung, ref-vorgarten, ref-holzterrasse, ref-terrassenbau, ref-vorgartenmauer, ref-formschnitte, ref-insektenhotel-alt, ref-vorgarten2, ref-natursteinmauer, ref-pflasterflaeche, ref-gabionen` | **Referenzen-Galerie** | reale Projekte (Kategorien: Mauer, Vorgarten, Holzterrasse, Terrasse, Formschnitt, Insektenhotel, Naturstein, Pflaster, Gabionen) |
| `projekt-beeteinfassung, projekt-naturnahe-1/2, projekt-klinkermauer, projekt-insektenhotel, projekt-pflaster-einfahrt` | **6 Projekt-Stories** (Referenzen) | 2025er Projektfotos |
| `logo-galabau` (+`.webp`,`-96.webp`) | Nav/Footer-Logo | grünes DV-Monogramm |
| `favicon-16/32.png, apple-touch-icon.png, icon-512.png, og-default.jpg` | Icons/Share | aus Logo/Hero abgeleitet |

## Nicht verwendet (bewusst)
- `blog-hero-stock` (garden-2477173, generisches Stock) — nur als optionaler dunkler Hintergrund; wenn
  eingesetzt, klar als Stimmungsbild. Bevorzugt echte Projektfotos.
- **Vecteezy-Bilder der Altseite** (Butchart Gardens Vancouver, generic walkway) — **verworfen**
  (fremde Gärten, keine eigenen Projekte → Authentizität). Nicht heruntergeladen/eingebunden.
- WordPress/BeTheme-Chrome, Favicon-Duplikate, Emoji-SVG.

## Platzhalter
Aktuell **keine** Platzhalter nötig — genügend echtes Bildmaterial vorhanden. Falls später eine
Sektion ohne passendes Foto entsteht: als `TODO-Platzhalter` markieren, nicht mit Fremdbild füllen.

## Alt-Text-Regeln
Deutsch, beschreibend, motiv- + ortsbezogen wo sinnvoll (Salzhemmendorf), kein „Bild von…", keine
Keyword-Stuffing. Dekorative Bilder: `alt=""`. `width`/`height` immer aus `img-manifest.json`.
