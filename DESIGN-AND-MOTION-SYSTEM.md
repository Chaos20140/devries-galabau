# Design- und Motion-System — de Vries Galabau

> **Stand: v8 „Gartenrundgang" (2026-07-30).** Diese Fassung beschreibt das Design, das
> tatsächlich im Repository liegt. Sie löst die v7-Fassung („Schicht für Schicht", Papier/Rust/
> Instrument-Serif-Display) vollständig ab — jenes Design wurde entfernt, nicht überarbeitet.
> Die alte Fassung liegt zum Nachschlagen unter `.planning/audit-altes-design/`.
>
> Vorlage ist das Claude-Design-Projekt *Gartenrundgang*; die Seiten sind daraus 1:1
> übernommen. Jede Abweichung ist in §9 einzeln begründet.

---

## 1. Grundidee

Ein **Rundgang durch einen Garten**. Die Startseite ist eine begehbare 3D-Szene: Man scrollt,
die Kamera geht den Gartenweg entlang, und an sieben Stationen tritt jeweils ein Text ins Bild.
Danach folgen flache, ruhige Abschnitte (Galerie, Materialien, Ablauf, Einsatzgebiet, Fragen,
Anfrage). Die Unterseiten sind bewusst still: heller Grund, Glaskarten, eine kursive
Serifen-Betonung je Überschrift.

Die Gestaltung trägt sich über **Licht und Fläche**, nicht über Effektstapel:
weiches Grün, milchige Glasflächen, große Radien, viel Luft.

---

## 2. Farbe

Die Werte stehen als Literale im `style`-Block bzw. in den Inline-Styles jeder Seite — so, wie
das Design sie angelegt hat. Es gibt bewusst **keine CSS-Variablen**: dadurch bleibt jede Seite
für sich vollständig und die Übernahme aus dem Design überprüfbar.

| Wert | Rolle |
|---|---|
| `#EDF3E8` | Grundfläche („Papier") |
| `#F3F7F0` | Text auf dunklen Bändern |
| `#0F2318` | Überschriften |
| `#12261A` | Grundtext / Body-Farbe |
| `#26382E` | Text in Karten (Adressen, Listen) |
| `#3C5145` | Fließtext |
| `#4A5F52` | Sekundärtext in Karten |
| `#5B6F63` | Bildunterschriften |
| `#1B4332` | dunkelstes Grün (Hauptknopf, große Zahlen) |
| `#245239` | Mitte des dunklen Bandes |
| `#2C6E49` | Marken- und Linkgrün, Eyebrows |
| `#46761F` | Kleinlabels und `a:hover` |
| `#8ECF4F` | Limette: Akzent, Aufzählungspunkte, heller Knopf |
| `#E8B93C` | Sterne der Bewertungen |

**Glasfläche** (auf jeder Karte identisch):

```
background: linear-gradient(155deg, rgba(255,255,255,.72), rgba(255,255,255,.42));
backdrop-filter: blur(26px) saturate(1.45);
border: 1px solid rgba(255,255,255,.6);
box-shadow: 0 26px 54px -38px rgba(12,29,20,.34);
```

**Dunkles Band** (Anfrage- und Abschlussabschnitte):
`linear-gradient(150deg, #1B4332, #245239 58%, #2C6E49)` mit einem Lichtkreis
`radial-gradient(circle, rgba(142,207,79,.4), transparent 68%)` rechts oben.

**Grundschleier** über allen Seiten (`position:fixed`, `pointer-events:none`):
zwei weiche Radialverläufe in `rgba(214,232,208,.7)` und `rgba(226,240,214,.6)`.

### Gemessene Kontraste

sRGB-Luminanz, gerechnet gegen `#EDF3E8` (Papier), `#F7FAF5` (Glas über Papier, konservativ
angenommen) bzw. `#245239` (dunkles Band):

| Paar | Verhältnis | |
|---|---|---|
| Überschrift `#0F2318` auf Papier | 14,59 : 1 | AA |
| Fließtext `#3C5145` auf Papier | 7,57 : 1 | AA |
| Kartentext `#4A5F52` auf Glas | 6,54 : 1 | AA |
| Bildunterschrift `#5B6F63` auf Papier | 4,77 : 1 | AA |
| Link `#2C6E49` auf Papier | 5,41 : 1 | AA |
| Kleinlabel `#46761F` auf Glas | 5,15 : 1 | AA |
| Text auf dunklem Band (80 % Deckung) | 5,98 : 1 | AA |
| Limette `#8ECF4F` auf dunklem Band | 4,78 : 1 | AA |
| `#F3F7F0` auf `#1B4332` (Hauptknopf) | 10,22 : 1 | AA |
| `#0F2318` auf Limette (heller Knopf) | 8,78 : 1 | AA |

> **⚠ Nicht zurückdrehen:** Das Design verwendete für die Kleinlabels `#4F8524`. Auf Glas sind
> das **4,23 : 1** — bei 11–12 px Schrift zu wenig für AA. Ersetzt durch `#46761F` (5,15 : 1),
> auf allen Seiten und in `garden-footer.js`.

---

## 3. Typografie

Beide Schriften werden **selbst ausgeliefert** (`assets/fonts/`, woff2). Das Design lud sie von
`fonts.googleapis.com`; das ginge nicht ohne Übertragung der Besucher-IP an Google.

- **Outfit** (300/400/500/600/700) — alles außer den Betonungen.
- **Instrument Serif** (regulär und kursiv) — ausschließlich das hervorgehobene Wort in jeder
  Überschrift, mit Verlaufsfüllung `linear-gradient(120deg, #2C6E49, #8ECF4F)` über
  `background-clip: text`.

Größen sind durchgehend fluid:

| Rolle | Wert |
|---|---|
| Eyebrow | `12px`, `700`, `letter-spacing:.22em`, Versalien |
| H1 | `clamp(36px, 6.4vw, 92px)`, `line-height:.96`, `letter-spacing:-.04em` |
| H2 | `clamp(25px, 3.4vw, 50px)`, `line-height:1.05` |
| H2 (Nebenspalte) | `clamp(24px, 3.2vw, 44px)` |
| Lead | `clamp(16px, 1.4vw, 20px)`, `line-height:1.6` |
| Fließtext | `16px`, `line-height:1.6–1.68` |
| Kartentext | `14.5px`, `line-height:1.55` |
| Kleinlabel | `11–12px`, `700`, `letter-spacing:.16–.2em`, Versalien |

`text-wrap: balance` auf H1, `text-wrap: pretty` auf Fließtext.

---

## 4. Raster und Form

- Inhaltsbreite `max-width: 1240px` (Bildstrecken `1300px`), zentriert.
- Seitenabstand `clamp(20px, 5vw, 68px)`, Abschnittsabstand `clamp(50px, 8vh, 110px)`.
- Kartenraster durchgehend `repeat(auto-fit, minmax(min(100%, 250px), 1fr))` —
  **das `min(100%, …)` ist der Grund, warum bei 375 px nichts überläuft.** Ohne das `min()`
  erzwingt `minmax` eine Spalte, die breiter als der Bildschirm ist.
- Radien: `24px` Karten, `26px` große Karten, `clamp(22px,3vw,32px)` Bildrahmen, `999px` Knöpfe.
- Ein Kopfabstand von `clamp(84px, 10vh, 108px)` hält den Inhalt unter der festen Kopfzeile.

---

## 5. Bewegung

Ein einziger Satz Werte, auf allen Seiten gleich:

| Zweck | Wert |
|---|---|
| Kurve | `cubic-bezier(.16, 1, .3, 1)` |
| Aufdecken | `.9s`, Versatz `translateY(26px)` |
| Staffelung | `70–80 ms` je Element |
| Kopfzeile und Menü | `.3s` |

**Aufdecken:** ein `IntersectionObserver` je Seite (`rootMargin: 0px 0px -10% 0px`,
`threshold: .1–.12`), danach `unobserve`. Ein Zeitschloss nach 6 s (Startseite 8 s) macht alles
sichtbar, falls der Observer nie auslöst — ohne JavaScript bleibt die Seite lesbar.

**Startseite, Gartenrundgang:** eine `requestAnimationFrame`-Schleife (`tick`), die

1. den Scrollfortschritt der 1800-vh-Bahn (`#rg-walk`, mobil 1000 vh) liest,
2. ihn sehr weich nachführt (`this.p += (this.tp - this.p) * 0.031`) — bei 60 Bildern/s rund
   anderthalb Sekunden Nachlauf. Das ist Absicht: der Gang klebt nicht am Mausrad,
3. die Kamera auf einer `CatmullRomCurve3` führt, mit Schrittwippen aus der Scrollgeschwindigkeit
   (`stepPhase`, `walkBob`) und Mausversatz,
4. den Blick zwischen „nach vorn" und dem Blickfang der Station mischt (`focus`, `focusMix`,
   `fpCur.lerp(…, 0.028)`); die Blickhöhe wird begrenzt, damit die Kamera nie kippt,
5. die Texttafeln ein- und ausblendet — Spanne 0,22 für die erste Station, 0,085 für alle
   weiteren, mit seitlichem Versatz je nach `data-side`,
6. die Stationsleiste ausblendet und nach rechts wegschiebt, sobald eine rechte Tafel
   erscheint (`rightVis`), und die Punkte auf erreicht/aktuell/offen umfärbt,
7. Wasserfläche, Bachlauf, Wasserfall, Sprühnebel, Dunst, Brunnenstrahl, Tropfen und Ringe
   rechnet, dazu Vögel, Enten, Falter, Bienen, Pollen und die Laternenhelligkeit,
8. das Sonnenlicht mit dem Fortschritt mitzieht und den Blendfleck (`#rg-sunglow`) über die
   projizierte Sonnenposition setzt,
9. die Leinwand ausblendet, sobald der flache Teil der Seite beginnt — ab da läuft nur noch
   `updateExtras` für Galerie, Materialband, Ablauf und Karte.

Wind in Gras und Laub läuft im Vertex-Shader (`windify`), gesteuert über zwei Uniforms
(`uTime`, `uWind`) — kein JavaScript pro Halm.

**Reduzierte Bewegung** ist keine abgeschaltete, sondern eine ruhigere Fassung. Das Design hatte
dafür einen Regler `props.motion`, der fest auf 1 stand und `prefers-reduced-motion` nirgends
abfragte. Der Regler wird jetzt von der Systemeinstellung geführt (`motion: 0`):

- still: Wind, Kamerawippen, Mausversatz, DOM-Parallaxe, Wellen auf Teich und Bach,
  Wasserfallschleier, Brunnenstrahl, Pollen, sowie Vögel, Enten, Falter und Bienen;
- weiter: der Rundgang folgt dem Scrollen, alle Texte erscheinen, Sprühnebel und Ringe behalten
  einen leisen Rest (`Math.max(0.15, MO)`) — das ist die Vorgabe des Entwurfs und bleibt so;
- Reveals auf allen Seiten: kein Versatz mehr, nur noch eine Blende über `.35s` statt `.9s`.

**Mobil** ist eigens geregelt (`applyMobile`): Bahn auf 1000 vh gekürzt, Stationsleiste aus,
Texttafeln unten über die volle Breite mit begrenzter Höhe, Filmstreifen und Ablaufband
gestapelt statt waagerecht gescrollt.

---

## 6. Bausteine

- **`garden-header`** (Web Component, Shadow DOM) — feste Kopfzeile mit Logo, Hauptnavigation,
  Mehr-Menü, Burger samt Vollbildmenü und Handlungsknopf. Der aktive Punkt kommt aus dem
  Attribut `active`, das Ziel des Knopfs aus `cta`.
- **`garden-footer`** (Web Component, Shadow DOM) — Fußzeile mit gezeichneter Gartenszene
  (Bäume, Ranken, Blüten, Falter als SVG), Kontaktblock, Rechtslinks, Jahreszahl automatisch.
- **Glaskarte**, **Pillenknopf**, **Eyebrow**, **Nummernkreis** (`01`–`06`) und
  **Punktliste** wiederholen sich seitenübergreifend als Inline-Style.

---

## 7. Dateien

```
assets/css/base.css        nur Schriftbindung, Sprungmarke, Fokusring, .sr-only
assets/js/garden-header.js Kopfzeile (auf jeder Seite)
assets/js/garden-footer.js Fußzeile (auf jeder Seite)
assets/js/three.min.js     nur Startseite
assets/js/<seite>.js       Seitenlogik, eine Datei je Seite
```

Das Aussehen steht bewusst **im `<style>`-Block und in den Inline-Styles jeder Seite** — genau
wie im Design. Dadurch ist jede Seite einzeln mit der Vorlage vergleichbar, und es gibt keine
gemeinsame Stildatei, die man versehentlich global verändern könnte.

---

## 8. Barrierefreiheit

- Eine H1 je Seite, Überschriften ohne Ebenensprung; rein visuelle Raster bekommen eine
  `.sr-only`-Überschrift (Projektraster, 404-Wege).
- Sichtbarer Fokusring `3px #2C6E49` mit `outline-offset: 3px`, global in `base.css`.
- Sprungmarke zum Inhalt (im Design nicht vorgesehen, für die Tastatur aber nötig).
- Bewertungssterne tragen `role="img"` mit `aria-label="Bewertung: 5 von 5 Sternen"`.
- Alle Bilder haben deutsche, beschreibende `alt`-Texte; im Design stand dort teils
  „Projektfoto" oder eine Arbeitsnotiz.
- Knöpfe und Navigationspunkte sind mindestens 44 px hoch.

---

## 9. Bewusste Abweichungen vom Design

| Stelle | Abweichung | Grund |
|---|---|---|
| Schriften | selbst ausgeliefert statt Google Fonts | sonst geht die Besucher-IP an Google |
| `#4F8524` | zu `#46761F` gedunkelt | 4,23 : 1 reicht bei 11 px nicht für AA |
| Impressum | Platzhalter durch echte Angaben ersetzt | § 5 TMG verlangt vollständige Angaben |
| Stellenangebote | drei erfundene Stellen durch den wahren Stand ersetzt | es gibt keine offene Stelle |
| Referenzen | verkürzte Zitate durch den Wortlaut ersetzt | die Zitate standen unter echten Namen |
| Kontakt | Öffnungszeiten 8–16 statt 7:30–17:00, echte Adresse ergänzt | belegte Angaben |
| Alt-Texte | beschreibend statt „Projektfoto" | Screenreader |
| `.sr-only`-Überschriften | ergänzt | Überschriftengliederung |
| Sprungmarke, Fokusring | ergänzt | Tastaturbedienung |
| Datenschutz, Anfrage, Danke, 404 | neu gebaut | im Design nicht vorhanden |
| `prefers-reduced-motion` | ergänzt, führt `props.motion` | das Design fragte die Einstellung nie ab |

---

## 10. Die Bildschleife der Startseite ist vollständig

`Gartenrundgang.dc.html` im Design-Projekt ist größer als das Leselimit der Schnittstelle
(256 KiB) und bricht mitten in `tick` ab, bei `const yaw = Math.atan`. Die Datei ist deshalb in
zwei Hälften übernommen worden: die vordere aus dem gelesenen Teil, die hintere vom Auftraggeber
nachgereicht. Beide Hälften stoßen exakt an dieser Zeile aneinander, die Naht ist geprüft
(Klammerbilanz, Parser, alle 48 Felder, die `tick` liest, werden vorher gesetzt).

**Im Code steht damit die Choreografie des Entwurfs, kein Nachbau.** Ein früherer, von Hand
rekonstruierter Zwischenstand wurde vollständig ersetzt.

Belegt im Browser: Stationen lösen einander in der richtigen Reihenfolge ab, die Stationsleiste
weicht rechten Tafeln aus, 0 Konsolenfehler. Nur der Nachlauf fällt in einer Testumgebung ohne
Grafikkarte auf — bei `0.031` je Bild und einem halben Bild pro Sekunde dauert eine Station
Minuten statt Sekunden. Wer dort prüft, muss entsprechend lange warten; das ist kein Fehler.
