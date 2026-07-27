# CONTENT_INVENTORY — de Vries Galabau Redesign

> Quelle der Wahrheit für Inhalte: die **Live-Seite** `https://devries-galabau.de/` (vollständig
> analysiert 21.07.2026, 21 URLs). Verbatim-Rohdaten je Seite: `.planning/ingest/pages/<slug>.json`;
> lesbarer Gesamtauszug: `.planning/ingest/DIGEST.md`; Bilder: `.planning/ingest/all-images.json`.
> Rechtstexte (Impressum/Datenschutz) werden **verbatim** aus den JSONs übernommen.
>
> **Migrationsstatus-Legende:** ⬜ geplant · 🟨 in Arbeit · ✅ migriert & im Browser erreichbar geprüft.
> Nach dem Bau jede neue Seite erneut gegen diese Liste prüfen.

## Stammdaten (überall identisch — bei Änderung global grep'en)
- **Firma:** de Vries Galabau (Wortmarke top bar „de Vries GaLa-Bau"; Langform „de Vries Garten- und Landschaftsbau")
- **Inhaber:** Andreas de Vries · **Gegründet:** 1998 · **Erfahrung:** über 25 Jahre
- **Telefon:** angezeigt `05153 1552` (Kontaktseite `05153 - 1552`) · Link `tel:051531552`
- **E-Mail:** `info@devries-galabau.de`
- **Hauptsitz/Büro:** An den Flachsrotten 2, 31020 Salzhemmendorf
- **Bauhof:** OKAL Industriepark, Salzhemmendorfer Straße 2, 31020 Salzhemmendorf
- **Öffnungszeiten:** Montag–Freitag 8:00–16:00 Uhr
- **USt-IdNr:** DE192201141 (aus Impressum) · **Einsatzgebiet:** Salzhemmendorf, Hameln, Hildesheim und Umgebung
- **Social:** Facebook `facebook.com/devriesdienstleistungen` · Instagram `instagram.com/dv_devries`
- **Schwesterseite:** `https://www.andreasdevries.de/` (Pflege/Betreuung) · **Copyright:** © 2025 de Vries Galabau

### ⚠️ Bekannte Fehler der Altseite → in Migration korrigieren (nicht übernehmen)
- **Adress-Widerspruch:** Meta/Datenschutz nennen „Schützenplatzweg 5" (verantwortliche Person Andreas de Vries privat), Impressum-Body + Kontaktseite nennen „An den Flachsrotten 2" (Firmensitz). Rechtstexte verbatim lassen; für Kontakt/Structured Data die Firmenadresse **An den Flachsrotten 2** nutzen.
- **Startseite lädt zwei zufällige Content-Varianten** (A mit H1, B ohne H1) → im Redesign EINE kuratierte Startseite (beste Copy aus beiden Varianten zusammengeführt).
- **Fehlende H1** auf `ueber-uns`, `kostenlose-anfrage`, `dankeseite`, `blogs` → im Redesign je Seite genau eine echte H1.
- **Fehlende Meta-Description** auf `ueber-uns` (u.a.) → im Redesign je Seite Title + Description.
- **Englischer Suchfeld-Platzhalter** „Enter your search" → im Redesign keine unnötige Suche / deutsch.
- **startseite:** Leistungs-Kacheln haben vertauschte Alt-Texte (Gestaltung↔Pflege) → korrekt zuordnen.
- **dankeseite** ist `index,follow` (sollte `noindex`).

---

## Seiten-Mapping (alt → neu)

| # | Alte URL | Neue Datei | Migrationsstatus |
|---|---|---|---|
| 1 | `/` + `/startseite/` (Duplikat) | `index.html` | ⬜ |
| 2 | `/ueber-uns/` | `ueber-uns.html` | ⬜ |
| 3 | `/gartengestaltung/` | `gartengestaltung.html` | ⬜ |
| 4 | `/gartenplanung/` | `gartenplanung.html` | ⬜ |
| 5 | `/gartenpflege/` | `gartenpflege.html` | ⬜ |
| 6 | `/bepflanzung/` | `bepflanzung.html` | ⬜ |
| 7 | `/referenzen/` + `/blogs/` (Projekte zusammengeführt) | `referenzen.html` | ⬜ |
| 8 | 6 Projekt-Posts | in `referenzen.html` (Lightbox/Detail) | ⬜ |
| 9 | `/kontakt/` | `kontakt.html` | ⬜ |
| 10 | `/kostenlose-anfrage/` | `anfrage.html` | ⬜ |
| 11 | `/dankeseite/` | `danke.html` (noindex) | ⬜ |
| 12 | `/stellenangebote/` | `stellenangebote.html` | ⬜ |
| 13 | `/impressum/` | `impressum.html` | ⬜ |
| 14 | `/datenschutz/` | `datenschutz.html` | ⬜ |
| — | (neu) | `404.html` | ⬜ |

**Redirects (alte URL-Struktur erhalten):** da Deploy statisch, per Ordner-Weiterleitung oder `_redirects`
(Netlify/Cloudflare) bzw. Meta-Refresh-Stubs die alten Slugs mit Trailing-Slash auf die neuen `.html`
mappen. Insb. `/kostenlose-anfrage/ → anfrage.html`, `/blogs/ → referenzen.html`, `/ueber-uns/`, alle
Service-Slugs identisch. Siehe CLAUDE.md §SEO.

---

## Inhalt je Seite (Kurzinventur — Volltext in DIGEST.md / JSON)

### 1 · index.html (Home) ⬜
- **Hero-These (aus Variante A/B zusammengeführt):** „Gartenbau mit Leidenschaft – seit 1998 in Salzhemmendorf" / „Wir gestalten Lebensräume im Grünen". Kernsatz als Leitmotiv: **„Jeder Garten erzählt eine Geschichte – wir helfen, sie sichtbar zu machen."**
- **Intro:** Seit 1998 Partner für Gartengestaltung, Bepflanzungen, Pflasterarbeiten, Sanierungen, individuelle Gartenkonzepte; >25 Jahre Erfahrung.
- **4 Leistungen (Cards → Unterseiten):** Gartengestaltung · Gartenpflege · Gartenplanung · Bepflanzung (verbatim Kurztexte in DIGEST).
- **Vorteile/„Was uns auszeichnet":** Handwerk & Qualität · Individuelle Planung · Zuverlässig · Erfahrung & Expertise (Variante B) bzw. Fachliche Kompetenz · Kundenspezifische Lösungen · Naturnahe Gestaltung · Zuverlässigkeit & Qualität (Variante A). → zu 4 kuratierten Vorteilen zusammenführen.
- **Referenzen-Teaser** (Galerie) → referenzen.html.
- **Prozess** (neu, aus Servicetexten abgeleitet, faktentreu): Beratung → Planung/Skizze → Material-/Pflanzenauswahl → Umsetzung → Pflege & Weiterentwicklung.
- **Region/Einsatzgebiet:** Salzhemmendorf, Hameln, Hildesheim und Umgebung.
- **Testimonials (3, ECHT):** Nicolas Franzmann · juliachirin · A-K M (verbatim in DIGEST — dürfen genutzt werden, sind reale Kundenbewertungen der Live-Seite).
- **Abschluss-CTA:** „Starten Sie Ihr Gartenprojekt noch heute!" → anfrage.html.
- **Bilder:** garten-teich-sitzecke, vorgarten-beet-natursteinmauer, gartenpflege, gartenplan-zeichnung, u.a.

### 2 · ueber-uns.html ⬜
- Hero „Wir gestalten Lebensräume im Grünen!"; „Weil Ihr Garten mehr ist als nur Fläche…"; „Was uns auszeichnet" (4 Punkte); „Mehr als 25 Jahre Erfahrung…" (Familienunternehmen → eingespieltes Team); „Darum entscheiden sich Kunden…" (Persönliche Beratung · Fachgerechte Umsetzung · Langfristige Qualität). Alles verbatim in DIGEST.
- **Fix:** echte H1 + Meta-Description ergänzen.

### 3 · gartengestaltung.html ⬜
- H1 „Gartengestaltung – individuell & mit Liebe zum Detail". Sektionen: Landschaftsgestaltung (Neuanlage/Umgestaltung); Leistungsliste (Hochbeete, Treppenbau, Pflasterarbeiten, Altersgerecht, Natursteinmauern→referenzen, Gabionen); Gartenbau – lebendige Gestaltung (Gräser, Bäume, Stauden, Wasserpflanzen, Wegbepflanzungen→bepflanzung, Sitzbereich-Begrünung); Gartenideen & Planung. CTA je Sektion → kontakt/anfrage. Verbatim in DIGEST.

### 4 · gartenplanung.html ⬜
- H1 „Gartenplanung – Ihr individueller Garten, perfekt durchdacht". Planung & Umsetzung (Rundum-Service); Leistungen (detaillierte Zeichnungen, Betreuung Anfang→Ende, Flexibilität); Gartenkonzept – Ihre Ideen professionell umgesetzt. Bild: **Zeichnung-Galabau (echte Gartenplan-Zeichnung → Signatur-Motiv)**. Verbatim in DIGEST.

### 5 · gartenpflege.html ⬜
- H1 „Gartenpflege – für dauerhaft schöne Gärten". Pflanzenwahl; Pflegekonzepte (Formschnitte, Rasenpflege/Mähen, Pflegekonzepte, Rollrasen, Altersgerecht); Pflegepläne (Gräser-, Baum-, Stauden-, Wasserpflanzenpflege, Wegbepflanzungen, Sitzbereich-Begrünung). Optionaler saisonaler Pflegekalender (Funktion). Verbatim in DIGEST.

### 6 · bepflanzung.html ⬜
- H1 „Vielfältige Bepflanzungen für Ihren Garten". Farbkonzepte; Bepflanzung als Herzstück; Begrünung (Gräser/Bäume/Stauden/Wasserpflanzen/Wegbepflanzungen/Sitzbereich); Pflanzplanung & Gartenpflege. Farbstärkste Seite. Einsatzgebiet Salzhemmendorf/Hameln/Hildesheim betont. Verbatim in DIGEST.

### 7 · referenzen.html ⬜ (Referenzen + Blogs zusammengeführt)
- H1 „Referenzen – Einblicke in unsere Gartenprojekte". Filterbare Galerie mit echten Kategorien: Mauergestaltung · Vorgarten · Holzterrasse · Terrassenbau · Vorgartenmauer · Formschnitte · Insektenhotel · Natursteinmauer · Pflasterfläche · Gabionen.
- **6 Projekt-Stories** (verbatim Texte je Post, in JSON): Beeteinfassung/Zierkies/Rindenmulch · Naturnahe Gestaltung (Rindenmulchwege, Natursteinmauern) · Trockenmauer/Hangabstützung · Klinkermauer · Insektenhotel/Trittplatten · Pflasterfläche/Einfahrt. Jeweils mit echten 2025-Fotos.
- **3 echte Testimonials** hier einbinden (Social Proof).

### 8 · kontakt.html ⬜
- H1 „De Vries Galabau – Unsere Adresse & Anfahrt". Hauptsitz + Bauhof (2 Adressen), Kontaktinfos (Tel/Mail), Öffnungszeiten (Mo–Fr 8–16). Datenschutzfreundliche Karte (Consent-Gate statt direktes Google-Maps-iframe).
- **Formular:** Ihr Name* · Ihre E-Mail* · Betreff* · Ihre Nachricht (optional) · Senden. Validierung + mailto-Fallback an info@devries-galabau.de.

### 9 · anfrage.html (Kostenlose Anfrage) ⬜
- H1 „Kostenlose Anfrage" / „Jetzt unkompliziert & unverbindlich anfragen". **5-Schritt-Formular mit Fortschritt:**
  1. Privat / Gewerbe (radio, Pflicht)
  2. Bereich: Gartengestaltung / Gartenplanung / Gartenpflege / Bepflanzung / Sonstiges (radio, Pflicht)
  3. Projektbeschreibung (textarea, Pflicht)
  4. Zeitraum: Nächste Woche / In einem Monat / In 2-3 Monaten / In 3-6 Monaten (radio, Pflicht)
  5. Vollständiger Name* · E-Mail* · Telefonnummer* · Beste Erreichbarkeit: 08:00–11:00 / 11:00–16:00 / 16:00–18:00 (Pflicht)
- Trust-Hinweis: „100 % sicher & unverbindlich – Ihre Angaben bleiben vertraulich." → Erfolg = danke.html.

### 10 · danke.html ⬜ (noindex)
- „Vielen Dank für Ihre Anfrage!" + „Wir haben Ihre Angaben erfolgreich erhalten. In den nächsten Tagen melden wir uns telefonisch…" + „Ihre Anfrage ist selbstverständlich unverbindlich und Ihre Daten sind bei uns sicher." (verbatim).

### 11 · stellenangebote.html ⬜
- H1 „Karriere bei de Vries Galabau – Unsere Stellenangebote". **AKTUELL KEINE offenen Stellen** (Live: „Es gibt keine zu Ihrer Suche passenden Jobangebote."). → **Keine Stellen erfinden.** Ehrlich: „Zurzeit keine offenen Stellen" + Initiativbewerbung an info@devries-galabau.de + Kategorie Garten-Landschaftsbau. Optional: Was wir suchen/bieten allgemein, faktentreu.

### 12 · impressum.html ⬜ — Body **verbatim** aus `pages/impressum.json` (§5 TMG, Kontakt, USt-IdNr DE192201141, Haftung, Urheberrecht …).
### 13 · datenschutz.html ⬜ — Body **verbatim** aus `pages/datenschutz.json` (30k Zeichen; Strato-Hosting, CF7, Social, Google Fonts …). Hinweis: bei self-hosted Fonts den Google-Fonts-Passus prüfen (wir laden KEINE Google-Fonts → ggf. anpassen, aber Rechtstext nicht verfälschen; Abweichung markieren).

---

## Nicht übernommen (bewusst, als redundant markiert)
- Cookie-Consent-Plugin-Texte der Altseite (CookieYes) → eigener schlanker Consent-Banner mit gleichwertiger Info.
- WordPress/Elementor/BeTheme-Chrome, Suchwidget, „Back to top"-Plugin, RSS-Job-Feed, doppelte `/startseite/`.
- Vecteezy-Stockfotos fremder Gärten (Butchart Gardens Vancouver, generic walkway) → durch echte Projektfotos ersetzt (Authentizität).
