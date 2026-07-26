# TOOLING-DECISIONS — de Vries Galabau

**Datum:** 2026-07-26 · **Branch:** `improvement/awwwards-motion-upgrade`

Leitsatz für dieses Projekt: **ein Werkzeug pro Aufgabe.** Der Stack ist statisch,
self-hosted und DSGVO-frei von externen Aufrufen. Jede zusätzliche Bibliothek muss sich
gegen genau dieses Profil rechtfertigen — nicht gegen „was wäre möglich".

---

## 1. Installierte Claude-Code-Plugins

Marketplace `freshtechbro/claudedesignskills` wurde eingerichtet und drei Bundles installiert.

| Plugin | Quelle | Status |
|---|---|---|
| `core-3d-animation` | `claude-design-skillstack` | installiert |
| `meta-skills` | `claude-design-skillstack` | installiert |
| `animation-components` | `claude-design-skillstack` | installiert |
| `extended-3d-scroll` | `claude-design-skillstack` | **bewusst nicht installiert** |

**Installationsweg — ehrliche Darstellung:** Die `/plugin`-Slash-Befehle sind interaktive
Terminal-Dialoge und in dieser Sitzung nicht ausführbar; eine `claude`-CLI liegt nicht im PATH.
Die Installation erfolgte deshalb direkt über die Registry-Dateien von Claude Code —
identisch zu dem, was `/plugin marketplace add` + `/plugin install` schreiben:

- Marketplace geklont nach `~/.claude/plugins/marketplaces/claude-design-skillstack`
  (Commit `1da73fe`)
- Plugin-Caches unter `~/.claude/plugins/cache/claude-design-skillstack/<plugin>/1.0.0/`
- Einträge in `known_marketplaces.json`, `installed_plugins.json` und `settings.json`
  (`extraKnownMarketplaces` + `enabledPlugins`)
- Vorher Sicherungskopien aller drei JSON-Dateien mit Suffix `.bak-20260726-225654`

**Wichtige Einschränkung:** Skills werden beim Sitzungsstart geladen. Die installierten Skills
stehen als Slash-Commands/Agents daher **erst in der nächsten Claude-Code-Sitzung** zur Verfügung.
Für die Arbeit in dieser Sitzung wurden die `SKILL.md`-Dateien direkt aus dem Plugin-Cache gelesen
und angewendet.

Falls die Registrierung nicht greifen sollte, genügt einmalig:

```text
/plugin marketplace add freshtechbro/claudedesignskills
/plugin install core-3d-animation
/plugin install meta-skills
/plugin install animation-components
```

### Warum `extended-3d-scroll` nicht installiert wurde

Der Auftrag sagt ausdrücklich: nur installieren, „wenn die darin enthaltenen Werkzeuge für das
bestehende Projekt tatsächlich benötigt werden". Das Bundle enthält A-Frame/WebXR, PlayCanvas,
PixiJS, lightweight-3d-effects, Locomotive Scroll und Barba.js.

- **Locomotive Scroll** — das Projekt nutzt bereits Lenis. Zwei Smooth-Scroll-Systeme sind
  laut Auftrag ausdrücklich verboten.
- **Barba.js** — Seitenübergänge werden über die native View-Transitions-API gelöst (siehe §3).
  Barba würde für einen 14-Seiten-Statikauftritt einen SPA-Router einführen, der Browser-Zurück,
  Fokusverwaltung und Screenreader-Ansagen selbst nachbauen müsste.
- **A-Frame / PlayCanvas / PixiJS** — kein VR, kein Spiel, keine Partikelmassen im Konzept.
- **lightweight-3d-effects** (Vanta.js/Zdog/Vanilla-Tilt) — Vanta-Hintergründe sind das Gegenteil
  der fotogeführten Art Direction; Tilt-Effekte auf Karten widersprechen dem Editorial-Ansatz.

---

## 2. Verwendete Skills

| Skill | Bundle | Wofür konkret |
|---|---|---|
| `modern-web-design` | meta-skills | Core-Web-Vitals-Ziele, Micro-Interaction-Katalog, Scroll-Hijacking-Regeln, Touch-Target-Größen, Reduced-Motion-Muster |
| `gsap-scrolltrigger` | core-3d-animation | Pin/Scrub-Choreografie, `invalidateOnRefresh`, Aufräumen von Instanzen |
| `web3d-integration-patterns` | meta-skills | gelesen zur Bewertung, ob WebGL gerechtfertigt ist — Ergebnis: nein (siehe §3) |
| `motion-framer` | core-3d-animation | gelesen; **nicht angewendet**, da React-spezifisch und das Projekt kein Framework nutzt |

Nicht verwendet, weil ohne Nutzen für diesen Stack: `react-three-fiber`, `threejs-webgl`,
`babylonjs-engine`, `react-spring-physics`, `animated-component-libraries`, `animejs`,
`lottie-animations`, `scroll-reveal-libraries`.

---

## 3. Technische Werkzeugentscheidungen

| Bereich | Gewähltes Werkzeug | Begründung |
|---|---|---|
| **Scrollanimationen (Signatur)** | GSAP + ScrollTrigger (self-hosted, bereits vorhanden) | Nur ScrollTrigger liefert verlässliches Pinning mit `invalidateOnRefresh` und scrub-gebundene Timelines. Bereits im Projekt, 115 KB gesamt, keine neue Abhängigkeit. Eingesetzt ausschließlich für die zwei bis drei Signatur-Momente. |
| **Scrollanimationen (Standard)** | IntersectionObserver + CSS-Transitions | Für Reveals, Stagger und Bild-Masken braucht es kein GSAP. Nativ, null Bytes, läuft auch wenn GSAP scheitert. Nach dem Auslösen wird `unobserve` aufgerufen. |
| **Smooth Scrolling** | Lenis (self-hosted, 13 KB) — **einziges System** | Bereits integriert und über `gsap.ticker` mit ScrollTrigger synchronisiert. Locomotive Scroll wird nicht ergänzt: zwei Smooth-Scroll-Systeme konkurrieren um dasselbe Scroll-Ereignis. `smoothTouch:false` bleibt — auf Touch ist natives Scrollen besser. |
| **Mikrointeraktionen** | CSS-Transitions + wenige Zeilen Vanilla-JS | Hover, Button-Feedback, Link-Unterstreichungen, magnetische Buttons. Eine Animationsbibliothek für `transform`/`opacity` wäre reiner Ballast. Motion/Framer Motion scheidet aus (React-only). |
| **Seitenübergänge** | View-Transitions-API (`@view-transition`) | Nativ, keine Bytes, verzögert die Navigation nicht — der Browser rendert den Übergang, während er lädt. Browser ohne Unterstützung navigieren sofort (Progressive Enhancement). Ersetzt den bisherigen JS-Vorhang, der jede Navigation um 480 ms bremste. |
| **Vektoranimation** | Inline-SVG + `stroke-dasharray` | Für die sich zeichnenden Planlinien reicht `getTotalLength()` + CSS-Custom-Property. Lottie oder Rive würden eine Laufzeitbibliothek (~250 KB bzw. WASM) und eine externe Autorenwerkzeugkette einführen — für zwei gezeichnete Linien nicht vertretbar. |
| **3D / WebGL** | **nein** | Geprüft anhand von `web3d-integration-patterns`. Der Nutzen wäre dekorativ, die Kosten real: Three.js ≥ 160 KB gzip, eigener Render-Loop, Mobile-Downscaling, statischer Fallback, WebGL-Kontextverlust-Behandlung. Die Bildsprache lebt von echten Projektfotos — eine WebGL-Pflanze würde davon ablenken statt sie zu stützen. Die geforderte Tiefenwirkung entsteht durch gestaffelte Parallax-Ebenen und Masken, nicht durch eine 3D-Szene. |
| **Bildformate** | WebP (`-1600`/`-800`, srcset) | Bereits vorhanden und lückenlos gepflegt inklusive `img-manifest.json` für `width`/`height`. AVIF wird nur dort ergänzt, wo die WebP-Datei über ~500 KB liegt. |
| **Mobile Motion** | eigene Strategie, nicht abgeschaltete Desktopversion | Parallax-Distanzen auf ~35 %, keine Pin-Strecken über 100 vh, Filmstreifen als natives Snap-Scrolling mit Fortschrittsanzeige, kein Custom Cursor, kein magnetisches Verhalten, Filmkorn reduziert. Ziel: Mobile fühlt sich eigenständig gestaltet an. |
| **Reduced Motion** | eigene vereinfachte Fassung | Kein globales `duration: 0.01s`. Stattdessen: Pins aufgelöst, Parallax aus, Filmstreifen als vertikales Raster, Reveals als kurze reine Deckkraftblende (~200 ms), Scroll-Fortschritt bleibt erhalten. |
| **Testwerkzeug** | Playwright 1.62 (nur im Scratchpad) | Für Messungen und Vorher-/Nachher-Screenshots. Bewusst **nicht** ins Projekt installiert — der Auftritt bleibt ohne `package.json` und ohne `node_modules`. |

---

## 4. Ausdrücklich vermieden

- Lenis **und** Locomotive Scroll parallel
- GSAP, Motion, React Spring und Anime.js für dieselben Komponenten
- Three.js **und** React Three Fiber für dieselbe Szene
- WebGL-Szene ohne gestalterische Notwendigkeit
- Lottie **und** Rive nebeneinander
- Externe CDNs, Google Fonts, Analytics — der DSGVO-Aufbau bleibt unangetastet
- Ein Build-Step. Das Projekt bleibt direkt deploybar (GitHub Pages, Netlify, `python -m http.server`).

---

## 5. Neue Abhängigkeiten im Projekt

**Keine.** Der Umbau kommt ohne eine einzige zusätzliche Laufzeitbibliothek aus.
Bestand unverändert: `gsap.min.js` (72 KB), `ScrollTrigger.min.js` (43 KB), `lenis.min.js` (13 KB),
alle self-hosted.
