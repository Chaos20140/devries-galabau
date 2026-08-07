# de Vries Galabau — Website

Statische Website für **de Vries Garten- und Landschaftsbau**, Salzhemmendorf.
Kein Framework, kein Build-Step, keine externen Aufrufe zur Laufzeit.

**Stand:** v9 („Gartenrundgang") · 2026-07-30

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
.planning/            Analyse, Recherche, Design-Quellen, altes Design
assets/img/raw/       Originaldateien der Bilder
.claude/              lokale Entwicklungskonfiguration
```

Ebenfalls **nicht** mit ausliefern: `CLAUDE.md`, `CONTENT_INVENTORY.md`,
`DESIGN-AND-MOTION-SYSTEM.md` und `IMAGE_SOURCES.md`. Das sind interne Arbeitsunterlagen
mit Notizen zu offenen Punkten — auf einem öffentlichen Branch haben sie nichts verloren.

### Aktuelles Deployment: GitHub Pages

**Live:** <https://chaos20140.github.io/devries-galabau/>
**Künftig:** <https://devries-galabau.de/> — Vorbereitung und Reihenfolge in `UMZUG-DOMAIN.md`
**Verwaltung:** <https://chaos20140.github.io/devries-galabau/admin/> (nach dem Umzug <https://devries-galabau.de/admin/>)
Repository: `Chaos20140/devries-galabau`, Branch `main`, Quellordner `/` (Repository-Wurzel).

Die Verwaltungsseite ist **absichtlich von nirgendwo verlinkt** und steht auf `noindex`
sowie in `robots.txt` — sie ist nur über die Adresse oben erreichbar. Unter
`devries-galabau.de/admin/` gibt es sie **nicht**: diese Domain zeigt weiterhin
auf die alte WordPress-Installation (siehe *Umstellung auf die eigene Domain*).

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

Kompression stellt GitHub Pages selbst bereit. Das ist hier wichtiger als früher: die
Startseite lädt `three.min.js` mit 589 KB und `index.js` mit 145 KB.

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

**Kompression ist nicht optional.** Die Startseite lädt `three.min.js` (589 KB) und
`index.js` (145 KB); gepackt bleibt davon etwa ein Viertel. Ohne Kompression ist sie auf
Mobilfunk unbrauchbar.

### Messwerte

Die Lighthouse-Zahlen des alten Designs sind mit v9 hinfällig — das Design wurde ersetzt,
nicht überarbeitet. **Für den Gartenrundgang liegt noch keine Messung vor.**
Erwartungsgemäß liegt die Startseite deutlich unter den früheren Werten, weil sie eine
WebGL-Szene lädt; die Unterseiten sind dagegen leichter als vorher (eine CSS-Datei mit
reiner Schriftbindung, ein Skript à 2 KB, ein Bild).

Verifiziert ist der funktionale Stand: alle 14 Seiten auf 1440 und 375 px ohne
Konsolenfehler, ohne HTTP-Fehler, ohne waagerechten Überlauf, mit je genau einer H1 und
vollständigen Alt-Texten.

---

## Projektstruktur

```
.
├── index.html                    Startseite: 3D-Gartenrundgang + flache Abschnitte
├── ueber-uns.html
├── gartengestaltung.html · gartenplanung.html · gartenpflege.html · bepflanzung.html
├── referenzen.html               6 Projektkarten + 3 Bewertungen im Wortlaut
├── kontakt.html                  Kontaktwege, Ablauf, Anfrageband
├── anfrage.html                  ein Formular (Bereich, Zeitraum, Kontaktdaten)
├── danke.html                    Erfolgsseite (noindex)
├── stellenangebote.html          derzeit keine offene Stelle + Initiativbewerbung
├── impressum.html · datenschutz.html    Rechtstexte, verbatim
├── 404.html                      (noindex)
│
├── assets/
│   ├── css/base.css              NUR Schriften, Sprungmarke, Fokusring, .sr-only
│   ├── js/garden-header.js       Kopfzeile als Web Component (Shadow DOM)
│   ├── js/garden-footer.js       Fußzeile als Web Component (Shadow DOM)
│   ├── js/<seite>.js             Seitenlogik, eine Datei je Seite
│   ├── js/three.min.js           nur index.html
│   ├── fonts/                    7 × woff2, self-hosted
│   └── img/                      optimierte WebP + raw/ (Originale, nicht deployen)
│
├── .htaccess                     Apache: Kompression, Caching, Sicherheitsheader
├── _redirects                    Netlify: Weiterleitungen
├── robots.txt · sitemap.xml
└── <alt-slug>/index.html         20 Weiterleitungs-Stubs auf die alten WordPress-URLs
```

**Das Aussehen steht bewusst in jeder Seite selbst** — im `<style>`-Block und in den
Inline-Styles, so wie im Design-Projekt angelegt. Dadurch bleibt jede Seite einzeln mit der
Vorlage vergleichbar. `base.css` bindet nur die Schriften ein. Bitte daraus **keine**
gemeinsame Stildatei destillieren, das ist kein Versehen.

Nicht im Deployment, nur im Arbeits-Branch: `CLAUDE.md`, `CONTENT_INVENTORY.md`,
`DESIGN-AND-MOTION-SYSTEM.md`, `IMAGE_SOURCES.md` und `.planning/`.

Die Unterordner mit Namen alter WordPress-URLs (`/gartengestaltung/`, `/blogs/` usw.)
enthalten je eine `index.html` mit Meta-Refresh — sie halten die alten Links am Leben.

---

## Environment-Variablen

**Keine.** Die Seite ist vollständig statisch.

Die konfigurierbare Stelle steht am Anfang von `assets/js/anfrage.js`:

```js
var SUBMIT_ENDPOINT = '';   // leer = mailto
```

Solange die Zeichenkette leer ist, öffnen die Formulare das E-Mail-Programm mit einer
fertig ausgefüllten Nachricht (`mailto:`). Wird ein Endpunkt eingetragen, geht die Anfrage
per `fetch` dorthin und `mailto` bleibt nur noch Ausweichweg.

> Ein Endpunkt bedeutet einen zusätzlichen Auftragsverarbeiter. Dann sind auch
> `connect-src` in der CSP jeder betroffenen Seite und die Datenschutzerklärung anzupassen.

---

## Verwendete Bibliotheken

| Bibliothek | Größe (roh / gzip) | Wofür |
|---|---|---|
| three.js | 589 / ~150 KB | **nur** die 3D-Szene auf der Startseite |

Alles Weitere — Aufdecken, Staffelung, Galerie, Materialband, Ablauf, Formulare,
Navigation — läuft mit IntersectionObserver, CSS-Transitions und einer eigenen
`requestAnimationFrame`-Schleife ohne zusätzliche Bibliothek.
GSAP und Lenis sind mit v9 entfallen.

**Kein CDN, keine Google Fonts, kein Tracking, kein Cookie-Banner.** Alle Schriften und
Skripte liegen im Projekt; zur Laufzeit geht kein einziger Aufruf nach außen. Die CSP
erlaubt entsprechend `connect-src 'self'` und `frame-src 'none'`.

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
- [ ] Gartenrundgang: Stationen lösen einander beim Scrollen ab, Stationsleiste weicht aus
- [ ] Menü der Kopfzeile: öffnet, Escape schließt
- [ ] Formulare auf `anfrage.html`, `kontakt.html` und der Startseite
- [ ] Reduced-Motion-Fassung (Systemeinstellung „Bewegung reduzieren")
- [ ] Tastaturdurchlauf mit sichtbarem Fokusring
- [ ] `?v=N` überall gleich hochgezählt
- [ ] Interne Arbeitsunterlagen **nicht** im Deployment-Branch

---

## Weiterführend

Beide Dateien liegen nur im Arbeits-Branch, nicht im Deployment:

- `CLAUDE.md` — Bauanleitung, technische Lehren aus der Qualitätssicherung
- `DESIGN-AND-MOTION-SYSTEM.md` — Farben mit gemessenen Kontrasten, Typografie, Raster,
  Bewegung, Abweichungen vom Entwurf
