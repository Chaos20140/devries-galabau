# de Vries Galabau — Website

Statische Website für **de Vries Garten- und Landschaftsbau**, Salzhemmendorf.
Kein Framework, kein Build-Step, keine externen Aufrufe zur Laufzeit.

**Stand:** v7 (`?v=7`) · 2026-07-27

---

## Schnellstart

Es gibt nichts zu installieren. Ein beliebiger statischer Server genügt:

```bash
python -m http.server 5177
```

Danach `http://localhost:5177` öffnen.

Alternativen, falls kein Python vorhanden ist:

```bash
npx serve .
```

**Warum ein Server und kein Doppelklick auf `index.html`?**
Über `file://` greifen die Content-Security-Policy, `fetch`-basierte Funktionen und die
relativen Schriftpfade nicht zuverlässig.

---

## Produktions-Build

**Es gibt keinen.** Der Ordner wird so hochgeladen, wie er ist.
Vor dem Deployment sind lediglich diese Verzeichnisse auszuschließen
(sie stehen bereits in `.gitignore`):

```
.planning/            Analyse- und Arbeitsstände
assets/img/raw/       Originaldateien der Bilder
docs/                 Audit-Screenshots und Messdaten
*.md                  interne Dokumentation
```

### Aktuelles Deployment: GitHub Pages

**Live:** <https://chaos20140.github.io/devries-galabau/>
Repository: `Chaos20140/devries-galabau`, Branch `main`, Quellordner `/` (Repository-Wurzel).

Veröffentlichen heißt hier schlicht: auf `main` committen und pushen.
GitHub Pages baut automatisch neu, das dauert etwa eine Minute.

```bash
git add -A && git commit -m "..." && git push
```

Zwei Dinge sind auf GitHub Pages zu beachten:

- **`.nojekyll` darf nicht gelöscht werden.** Ohne diese Datei behandelt GitHub Pages das
  Repository als Jekyll-Projekt und ignoriert alle Dateien, deren Name mit einem Unterstrich
  beginnt — hier `_redirects`.
- **Eigene HTTP-Header sind nicht möglich.** Die CSP im `<meta>`-Tag greift weiterhin
  (`script-src`, `style-src`, `img-src`, `form-action`, `object-src`, `base-uri`), aber
  `frame-ancestors` und `X-Frame-Options` lassen sich dort nicht setzen. Beim späteren
  Wechsel auf Strato/Apache übernimmt das die beiliegende `.htaccess`.

Kompression stellt GitHub Pages selbst bereit — gemessen: `style.css` 17,9 statt 64 KB,
`main.js` 11,7 statt 35 KB.

### Umstellung auf die eigene Domain

Die Seite läuft bewusst noch **ohne** Custom Domain, weil `devries-galabau.de` derzeit auf
die alte WordPress-Seite zeigt. Für den Live-Gang:

1. Beim Registrar die DNS-Einträge setzen —
   `A` auf `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   und `CNAME` für `www` auf `chaos20140.github.io`.
2. Im Repository eine Datei `CNAME` (ohne Endung) anlegen, Inhalt eine Zeile:
   ```
   devries-galabau.de
   ```
3. In den Repository-Einstellungen unter *Pages* die Domain eintragen und
   *Enforce HTTPS* aktivieren, sobald das Zertifikat ausgestellt ist.

Erst danach stimmen die bereits gesetzten `canonical`- und Open-Graph-URLs mit der
tatsächlichen Adresse überein. Vorher schaden sie nicht — sie verhindern sogar, dass die
Vorschau-URL indexiert wird.

### Andere Hoster

| Hoster | Was zu tun ist |
|---|---|
| **Strato / Apache** | Ordner hochladen. `.htaccess` aktiviert Kompression, Caching, Sicherheitsheader, HTTPS- und www-Weiterleitung sowie die Weiterleitungen der alten WordPress-URLs. |
| **Netlify / Cloudflare Pages** | Ordner hochladen. `_redirects` wird automatisch ausgewertet, Kompression ist Standard. |

**Kompression ist nicht optional.** Ohne sie wird `style.css` mit 64 statt 18 KB
ausgeliefert. Gemessen entspricht das auf der Startseite mobil dem Unterschied zwischen
Lighthouse-Performance 86 und 95 — bei identischem Code.

### Gemessen auf der Live-Seite

Lighthouse gegen <https://chaos20140.github.io/devries-galabau/>,
Mobil mit Slow-4G und 4-facher CPU-Drosselung:

| Seite | Gerät | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| Startseite | Desktop | 99 | 100 | 100 | 100 | 0,8 s | 0 |
| Startseite | Mobil | 93 | 100 | 100 | 100 | 2,3 s | 0 |
| Referenzen | Mobil | 100 | 100 | 100 | 100 | 1,7 s | 0 |
| Kontakt | Mobil | 100 | 100 | 100 | 100 | 1,7 s | 0 |

---

## Projektstruktur

```
.
├── index.html                    Startseite
├── ueber-uns.html
├── gartengestaltung.html · gartenplanung.html · gartenpflege.html · bepflanzung.html
├── referenzen.html               Galerie mit Filter + Lightbox, 6 Projekt-Stories
├── kontakt.html                  Adressen, Formular, Karte nach Einwilligung
├── anfrage.html                  5-Schritt-Anfrage mit Fortschrittsbalken
├── danke.html                    Erfolgsseite (noindex)
├── stellenangebote.html
├── impressum.html · datenschutz.html    Rechtstexte, verbatim
├── 404.html
│
├── assets/
│   ├── css/style.css             komplettes Stylesheet, §-nummeriert
│   ├── js/main.js                Motion- und Interaktions-Engine (eine IIFE)
│   ├── js/gsap.min.js            nur für die beiden Signatur-Momente
│   ├── js/ScrollTrigger.min.js
│   ├── js/lenis.min.js           Smooth-Scroll
│   ├── fonts/                    4 × woff2, self-hosted
│   └── img/                      optimierte WebP + raw/ (Originale, nicht deployen)
│
├── .htaccess                     Apache: Kompression, Caching, Weiterleitungen
├── _redirects                    Netlify: Weiterleitungen
├── robots.txt · sitemap.xml
│
├── CLAUDE.md                     Bauanleitung für künftige Arbeitssitzungen
├── CONTENT_INVENTORY.md          Inhalte und Fakten (Quelle der Wahrheit)
├── IMAGE_SOURCES.md              Bildherkunft und Lizenzen
├── DESIGN-AND-MOTION-SYSTEM.md   Farben, Typografie, Raster, Motion-Tokens
├── AUDIT-BEFORE-UPGRADE.md       Befunde vor dem v7-Upgrade
├── TOOLING-DECISIONS.md          Werkzeugwahl und Begründung
├── CHANGELOG-AWWWARDS-UPGRADE.md v6 → v7 mit Messwerten
│
├── docs/audit-before/            Screenshots + Rohdaten vor dem Upgrade
├── docs/audit-after/             dieselben Aufnahmen danach
└── .planning/                    vollständige Analyse der alten WordPress-Seite
```

Die Unterordner mit Namen alter WordPress-URLs (`/gartengestaltung/`, `/blogs/` usw.)
enthalten je eine `index.html` mit Meta-Refresh — sie halten die alten Links am Leben.

---

## Environment-Variablen

**Keine.** Die Seite ist vollständig statisch.

Die einzige konfigurierbare Stelle steht am Anfang von `assets/js/main.js`:

```js
var MAIL_TO = "info@devries-galabau.de";
var SUBMIT_ENDPOINT = null;   // z. B. "https://formspree.io/f/XXXX"
```

Solange `SUBMIT_ENDPOINT` auf `null` steht, öffnen beide Formulare das E-Mail-Programm
des Nutzers mit einer fertig ausgefüllten Nachricht (`mailto:`) und bieten zusätzlich eine
Kopier-Rückfalllösung an. Wird ein Endpoint eingetragen, ist das die einzige Stelle,
die dafür geändert werden muss.

---

## Verwendete Bibliotheken

| Bibliothek | Größe (roh / gzip) | Wofür |
|---|---|---|
| GSAP | 71 / 27 KB | nur die zwei gescrubten Signatur-Momente |
| ScrollTrigger | 42 / 17 KB | Pinning und Scrub |
| Lenis | 13 / 4 KB | Smooth-Scroll (einziges System) |

Alles Weitere — Reveals, Stagger, Masken, Parallax, Lightbox, Formulare, Mobile-Navigation —
läuft mit IntersectionObserver und CSS-Transitions ohne zusätzliche Bibliothek.

**Kein CDN, keine Google Fonts, kein Tracking.** Alle Schriften und Skripte liegen im Projekt.
Externe Inhalte (die Karte auf `kontakt.html`) werden erst nach ausdrücklicher Zustimmung geladen.

---

## Verwendete Claude-Code-Plugins

Marketplace: [`freshtechbro/claudedesignskills`](https://github.com/freshtechbro/claudedesignskills)

```text
/plugin marketplace add freshtechbro/claudedesignskills
/plugin install core-3d-animation
/plugin install meta-skills
/plugin install animation-components
```

Genutzte Skills: `modern-web-design`, `gsap-scrolltrigger`, `web3d-integration-patterns`.
Das Bundle `extended-3d-scroll` wurde bewusst **nicht** installiert — Begründung in
`TOOLING-DECISIONS.md`.

---

## Bilder austauschen

1. Originaldatei nach `assets/img/raw/` legen.
2. Vier Varianten erzeugen — Namensschema `name-400.webp`, `name-800.webp`, `name-1600.webp`:

   ```bash
   npx --yes sharp-cli -i assets/img/raw/name.jpg -o assets/img/name-400.webp  resize 400  -- format webp --quality 68
   npx --yes sharp-cli -i assets/img/raw/name.jpg -o assets/img/name-800.webp  resize 800  -- format webp --quality 74
   npx --yes sharp-cli -i assets/img/raw/name.jpg -o assets/img/name-1600.webp resize 1600 -- format webp --quality 78
   ```

3. Im Markup einsetzen — **immer mit `srcset`, `sizes`, `width`, `height` und deutschem `alt`**:

   ```html
   <img src="assets/img/name-800.webp"
        srcset="assets/img/name-400.webp 400w,
                assets/img/name-800.webp 800w,
                assets/img/name-1600.webp 1600w"
        sizes="(max-width: 860px) 92vw, 46vw"
        width="800" height="600"
        alt="Beschreibung dessen, was zu sehen ist"
        loading="lazy">
   ```

**`sizes` nach der tatsächlichen Anzeigebreite setzen, nicht pauschal `100vw`.**
Auf einem 390-px-Display mit doppelter Pixeldichte entscheidet das über den Faktor 5 beim
Datenvolumen. Faustregel: gewünschte Anzeigebreite in CSS-Pixeln angeben — der Browser
multipliziert selbst mit der Pixeldichte.

Die Maße gehören in `assets/img/img-manifest.json`, damit sie auffindbar bleiben.
`loading="lazy"` überall außer beim Hero-Bild — das trägt `fetchpriority="high"`.

---

## Inhalte bearbeiten

- **Sachdaten** (Leistungen, Adressen, Öffnungszeiten, Projekte, Kundenstimmen) stammen aus
  `CONTENT_INVENTORY.md` und `.planning/ingest/`. **Nichts erfinden** — keine Auszeichnungen,
  Zertifikate, Mitarbeiterzahlen, Preise oder Bewertungen.
- **Rechtstexte** (`impressum.html`, `datenschutz.html`) sind wörtlich übernommen und werden
  nicht eigenmächtig geändert.
- **Kontaktdaten** stehen auf allen 14 Seiten. Bei Änderungen global suchen und ersetzen:
  `05153 1552`, `tel:051531552`, `info@devries-galabau.de`, `An den Flachsrotten 2`.
- **Navigation und Footer** sind auf jeder Seite kopiert (kein Include).
  Quelle der Wahrheit ist `index.html` — Änderungen dort auf allen anderen Seiten nachziehen.
- **Nach jeder Änderung an CSS oder JS** den Versionsparameter `?v=N` auf **allen** Seiten
  hochzählen, sonst sehen wiederkehrende Besucher die alte Fassung.

---

## Vor dem Ausliefern prüfen

- [ ] Alle Seiten laden ohne Konsolenfehler
- [ ] Kein horizontaler Overflow bei 360, 390, 768, 1024, 1440, 1920 px
- [ ] Mobile-Menü: öffnet, Fokus bleibt darin, Escape schließt, Fokus kehrt zurück
- [ ] Lightbox: öffnet, Pfeiltasten, Escape
- [ ] Beide Formulare: Pflichtfelder, Einwilligung, Fehlermeldungen
- [ ] Reduced-Motion-Fassung (Systemeinstellung „Bewegung reduzieren")
- [ ] Tastaturdurchlauf mit sichtbarem Fokusring
- [ ] `?v=N` überall gleich hochgezählt

---

## Weiterführend

- `CLAUDE.md` — Bauanleitung, Designvertrag, technische Lehren aus der Qualitätssicherung
- `DESIGN-AND-MOTION-SYSTEM.md` — Tokens, Motion-Regeln, Reduced Motion, Mobile Motion
- `CHANGELOG-AWWWARDS-UPGRADE.md` — was sich in v7 geändert hat, mit Messwerten
