/* Blockvorlagen des Seiten-Editors — EINE Quelle für Deno und Node.
 *
 * Warum eine eigene Datei und kein Abschnitt in index.ts:
 * Das Prüfskript .planning/werkzeug/pruefe-bloecke.js hatte diese Logik
 * nachgebaut. Ein Nachbau prüft aber nur den Nachbau. Genau daran ist ein
 * Fehler durchgerutscht — die Ein-/Ausblendung der Hinweiskarte griff auf
 * einen Namen zu, den es im Server gar nicht gibt (`bloecke.length` statt
 * `teile.length`); im Nachbau kam der Name nicht vor, also fiel nichts auf.
 * Ergebnis war HTTP 502 auf der Live-Funktion.
 *
 * Deshalb bewusst reines JavaScript ohne Typangaben: Deno lädt es per
 * `import`, Node genauso. Beide sehen denselben Code, nicht zwei Fassungen
 * davon.
 *
 * DER KERN: Hier wird niemals Markup entgegengenommen. Es kommen geprüfte
 * Daten herein und fertiges Markup heraus. Alles, was ein Betreiber tippt,
 * läuft durch htmlMaskieren.
 */

export function htmlMaskieren(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function regexMaskieren(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Einzeiliger Wert: keine Steuerzeichen, keine Umbrüche.
   Richtig für Überschriften und Marken — der Umbruch würde dort nur die
   Zeile zerreißen und ist im Markup ohnehin nicht sichtbar. */
export function sauber(v, max) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 32 || c === 127) return null;
  }
  return t;
}

/* Mehrzeiliger Wert. sauber() verwirft alles unter Zeichen 32 und schließt
   damit auch den Zeilenumbruch aus — richtig für eine Überschrift, falsch
   für einen Fließtext. Hier sind Umbrüche erlaubt; eine Leerzeile beginnt
   einen neuen Absatz. Rückgabe ist die Liste der Absätze. */
export function sauberMehr(v, max) {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n?/g, "\n").trim();
  if (!t || t.length > max) return null;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if ((c < 32 && c !== 10) || c === 127) return null;
  }
  const absaetze = t.split(/\n\s*\n/)
    .map((s) => s.replace(/\n/g, " ").trim())
    .filter(Boolean);
  if (!absaetze.length) return null;
  /* Jeder Absatz bringt rund 130 Byte Inline-Stil mit. 3000 Zeichen aus
     lauter Leerzeilen ergäben sonst über 1000 Absätze und damit ein
     Vielfaches an Markup in der ausgelieferten Seite. */
  if (absaetze.length > 30) return null;
  return absaetze;
}

/* Optionales einzeiliges Feld.
   Der Unterschied zu `sauber(v, max) ?? ""` ist der wichtige Teil: Dort
   wird ein Wert, der die Prüfung NICHT besteht, zu einem leeren Feld — der
   Betreiber tippt eine Überschrift, speichert, und sie ist wortlos weg.
   Hier heißt leer weiterhin leer, aber ein vorhandener, unbrauchbarer Wert
   wird abgelehnt und benannt. */
export function optional(v, max) {
  if (v === undefined || v === null) return { ok: true, wert: "" };
  if (typeof v !== "string") return { ok: false };
  if (!v.trim()) return { ok: true, wert: "" };
  const t = sauber(v, max);
  return t === null ? { ok: false } : { ok: true, wert: t };
}

/* Welche Blockart darf in welche Zone?
   Ohne diese Liste könnte jemand mit gültiger Anmeldung eine
   Stellenanzeige mitten in die Referenzen setzen — technisch möglich,
   inhaltlich Unsinn. Die Zone gehört zur Seite, deshalb ist der Schlüssel
   "datei|zone". */
export const ZONEN_ERLAUBT = {
  "stellenangebote.html|stellen": ["stelle"],
  "gartengestaltung.html|extra": ["absatz", "hinweis"],
  "gartenplanung.html|extra": ["absatz", "hinweis"],
  "gartenpflege.html|extra": ["absatz", "hinweis"],
  "bepflanzung.html|extra": ["absatz", "hinweis"],
  "ueber-uns.html|extra": ["absatz", "hinweis"],
  "referenzen.html|extra": ["absatz", "hinweis"],
  "kontakt.html|extra": ["absatz", "hinweis"],
};

/* Bausteine der Gestaltung. Einmal hier, damit eine Designänderung nicht
   in jeder Art einzeln nachgezogen werden muss. */
const GLAS = "border-radius:26px;padding:clamp(22px,2.6vw,36px);" +
  "background:linear-gradient(155deg,rgba(255,255,255,.72),rgba(255,255,255,.42));" +
  "backdrop-filter:blur(26px) saturate(1.45);border:1px solid rgba(255,255,255,.6);" +
  "box-shadow:0 26px 54px -38px rgba(12,29,20,.34)";
const H3 = "font-size:clamp(20px,2.4vw,30px);line-height:1.12;letter-spacing:-.03em;" +
  "font-weight:600;color:#0F2318";
const FLIESS = "max-width:62ch;font-size:16px;line-height:1.62;color:#3C5145;text-wrap:pretty";

/* data-b trägt die ART, data-b-f den FELDNAMEN. Damit liest der Editor die
   Werte exakt zurück, statt sie aus der Position im Markup zu erraten.
   Ohne das hängt das Zurückschreiben an der Reihenfolge der Tags — und die
   ändert sich mit jeder Designanpassung, lautlos und ohne Fehlermeldung. */
/* data-b-f trägt den FELDNAMEN DES EDITORS, nicht den des Bausteins.
   Die erste Fassung schrieb hier "marke" — der Editor sucht aber "umfang".
   Folge: Das Abzeichen stand sichtbar auf der Seite, kam beim Öffnen der
   Lade aber leer zurück und war nach dem nächsten Speichern weg.
   Gefunden von der Gegenprüfung, NICHT von meinem Rundlauftest — der hatte
   einen selbst geschriebenen Leser statt des echten. Genau der Fehler, vor
   dem der Kopf dieser Datei warnt, nur eine Ebene höher. */
const marke = (v) =>
  '<span data-b-f="umfang" style="display:inline-block;padding:7px 14px;border-radius:999px;' +
  "background:rgba(142,207,79,.24);font-size:11px;font-weight:700;letter-spacing:.16em;" +
  'text-transform:uppercase;color:#31611A">' + htmlMaskieren(v) + "</span>";

const liste = (ps) =>
  ps.length
    ? '<ul data-b-f="punkte" style="margin:14px 0 0;padding-left:20px;display:grid;gap:6px">' +
      ps.map((p) => '<li style="font-size:15px;line-height:1.55;color:#4A5F52">' +
        htmlMaskieren(p) + "</li>").join("") + "</ul>"
    : "";

const absaetzeMarkup = (ps, ersterAbstand) =>
  '<div data-b-f="text">' +
  ps.map((p, i) => '<p style="margin:' + (i ? "14px" : ersterAbstand) + ' 0 0;' + FLIESS + '">' +
    htmlMaskieren(p) + "</p>").join("") +
  "</div>";

/* Erzeugt den gesamten Inhalt einer Zone.
   Rückgabe: { ok: true, inhalt } oder { ok: false, fehler, ... } —
   bewusst ein Datenobjekt statt einer HTTP-Antwort, damit dieselbe
   Funktion ohne Webserver geprüft werden kann. */
export function bloeckeErzeugen(datei, zone, roh) {
  if (!Array.isArray(roh)) return { ok: false, fehler: "bloecke_fehlen" };
  if (roh.length > 20) return { ok: false, fehler: "zu_viele_bloecke" };

  const erlaubteArten = ZONEN_ERLAUBT[datei + "|" + zone];
  if (!erlaubteArten) return { ok: false, fehler: "zone_nicht_freigegeben", datei, zone };

  const teile = [];
  for (const b of roh) {
    if (!b || typeof b !== "object") return { ok: false, fehler: "block_ungueltig" };
    const x = b;
    const art = String(x.art ?? "");
    if (!erlaubteArten.includes(art)) {
      return { ok: false, fehler: "blockart_hier_nicht_erlaubt", art, zone, erlaubt: erlaubteArten };
    }

    /* Stichpunkte: bei allen Arten gleich aufgebaut. */
    const punkteRoh = Array.isArray(x.punkte) ? x.punkte : [];
    if (punkteRoh.length > 10) return { ok: false, fehler: "zu_viele_punkte" };
    const punkte = [];
    for (const p of punkteRoh) {
      const t = sauber(p, 160);
      if (!t) return { ok: false, fehler: "punkt_ungueltig" };
      punkte.push(t);
    }

    if (art === "stelle") {
      const titel = sauber(x.titel, 90);
      if (!titel) return { ok: false, fehler: "block_titel_fehlt", art };
      const uf = optional(x.umfang, 60);
      if (!uf.ok) return { ok: false, fehler: "feld_ungueltig", art, feld: "umfang" };
      const umfang = uf.wert;
      const text = sauber(x.text, 900);
      if (!text) return { ok: false, fehler: "block_text_fehlt", art };
      teile.push(
        '<article data-b="stelle" data-reveal style="' + GLAS + '">' +
        (umfang ? marke(umfang) : "") +
        '<h3 data-b-f="titel" style="margin:' + (umfang ? "14px" : "0") + " 0 0;" + H3 + '">' +
        htmlMaskieren(titel) + "</h3>" +
        '<p data-b-f="text" style="margin:12px 0 0;' + FLIESS + '">' + htmlMaskieren(text) + "</p>" +
        liste(punkte) +
        '<div style="margin-top:20px"><a href="#bewerbung" style="display:inline-flex;' +
        "align-items:center;gap:9px;background:#1B4332;color:#F3F7F0;border-radius:999px;" +
        'padding:14px 24px;font-size:15px;font-weight:600">Auf diese Stelle bewerben →</a></div>' +
        "</article>",
      );
    } else if (art === "hinweis") {
      const titel = sauber(x.titel, 120);
      if (!titel) return { ok: false, fehler: "block_titel_fehlt", art };
      const uf = optional(x.umfang, 60);
      if (!uf.ok) return { ok: false, fehler: "feld_ungueltig", art, feld: "umfang" };
      const umfang = uf.wert;
      const absaetze = sauberMehr(x.text, 1800);
      if (!absaetze) return { ok: false, fehler: "block_text_fehlt", art };
      teile.push(
        '<article data-b="hinweis" data-reveal style="' + GLAS + '">' +
        (umfang ? marke(umfang) : "") +
        '<h3 data-b-f="titel" style="margin:' + (umfang ? "14px" : "0") + " 0 0;" + H3 + '">' +
        htmlMaskieren(titel) + "</h3>" +
        absaetzeMarkup(absaetze, "12px") + liste(punkte) + "</article>",
      );
    } else if (art === "absatz") {
      /* Bewusst OHNE Karte: ein Fließtext im Seitenraster, wie die übrigen
         Textspalten. Wer eine Karte will, nimmt "hinweis". */
      const tf = optional(x.titel, 120);
      if (!tf.ok) return { ok: false, fehler: "feld_ungueltig", art, feld: "titel" };
      const titel = tf.wert;
      const absaetze = sauberMehr(x.text, 3000);
      if (!absaetze) return { ok: false, fehler: "block_text_fehlt", art };
      teile.push(
        '<div data-b="absatz" data-reveal>' +
        (titel
          ? '<h3 data-b-f="titel" style="margin:0 0 4px;' + H3 + '">' + htmlMaskieren(titel) + "</h3>"
          : "") +
        absaetzeMarkup(absaetze, titel ? "14px" : "0") + liste(punkte) + "</div>",
      );
    } else {
      /* Unerreichbar, solange ZONEN_ERLAUBT und dieser Block
         übereinstimmen — steht hier, damit ein Auseinanderlaufen auffällt
         statt still eine leere Zone zu schreiben. */
      return { ok: false, fehler: "blockart_unbekannt", art };
    }
  }
  return { ok: true, inhalt: teile.join(""), anzahl: teile.length };
}

/* Zone finden und ihren INHALT ersetzen.
   Hier wird die Verschachtelung GEZÄHLT, nicht vorausgesetzt.
   Die erste Fassung nahm den Bereich bis zum nächsten </div> mit einem
   nicht-gierigen Ausdruck. Das ging genau einmal gut: Beim ersten
   Speichern ist die Zone leer, also ist das nächste </div> auch das
   richtige. Danach steht in der Zone die Hülle des Bewerben-Knopfs — ein
   <div> —, und das nächste </div> ist ihres. Der Rest der Zone samt
   </article> wäre aus der Zone gefallen und die Seite zerschnitten.
   Gefunden von .planning/werkzeug/pruefe-bloecke.js, nicht beim Lesen. */
export function zoneSetzen(html, zone, inhalt) {
  const auf = new RegExp('<div\\b[^>]*\\sdata-ed-zone="' + regexMaskieren(zone) + '"[^>]*>');
  const start = auf.exec(html);
  if (!start) return null;
  const ab = start.index + start[0].length;
  const marken = /<div\b[^>]*>|<\/div\s*>/g;
  marken.lastIndex = ab;
  let tiefe = 1;
  let m;
  while ((m = marken.exec(html))) {
    tiefe += m[0][1] === "/" ? -1 : 1;
    if (tiefe === 0) return html.slice(0, ab) + inhalt + html.slice(m.index);
  }
  return null; /* kein passendes Ende — lieber nichts schreiben */
}

/* Liest den Inhalt einer Zone heraus (nur zum Prüfen gebraucht). */
export function zoneInhalt(html, zone) {
  const auf = new RegExp('<div\\b[^>]*\\sdata-ed-zone="' + regexMaskieren(zone) + '"[^>]*>');
  const start = auf.exec(html);
  if (!start) return null;
  const ab = start.index + start[0].length;
  const marken = /<div\b[^>]*>|<\/div\s*>/g;
  marken.lastIndex = ab;
  let tiefe = 1;
  let m;
  while ((m = marken.exec(html))) {
    tiefe += m[0][1] === "/" ? -1 : 1;
    if (tiefe === 0) return html.slice(ab, m.index);
  }
  return null;
}

/* Der Hinweis "Zurzeit sind keine Stellen ausgeschrieben" darf nicht über
   einer Liste offener Stellen stehen. Er wird deshalb genau dann
   ausgeblendet, wenn die Zone gefüllt ist — und kommt von selbst zurück,
   sobald sie wieder leer ist.
   Bewusst NICHT dem Betreiber überlassen: Wer eine Stelle einträgt, denkt
   an die Stelle, nicht an einen Satz weiter oben. Der Widerspruch wäre der
   Normalfall, nicht die Ausnahme.
   Der Text selbst bleibt bearbeitbar (data-ed) und erscheint dann in der
   Lade für nicht sichtbare Stellen. */
export function leerhinweis(html, zone, sichtbar) {
  /* An die ZONE gebunden, aus zwei Gründen:
     1. Eine Seite könnte mehrere Zonen haben; ohne Bindung schaltete das
        Speichern der einen den Hinweis der anderen um.
     2. Der Marker ohne Wert ließe sich über ein anderes Feld nachbilden.
        Die Google-Beschreibung landet als roher Text in einem
        content="…"-Attribut; "data-ed-leerhinweis" darin stünde weiter
        vorn im Dokument als die echte Karte und würde zuerst gefunden.
        attributMaskieren deckt nur & < > " ab — der Attributname bleibt
        unangetastet. Mit ="<zone>" trifft der Ausdruck das nicht mehr,
        solange keine Zone so heißt wie ein eingeschleuster Wert; und
        Zonennamen sind auf ^[a-z0-9-]{1,40}$ beschränkt. */
  const m = new RegExp(
    '<[a-zA-Z][\\w-]*\\b[^>]*\\sdata-ed-leerhinweis="' + regexMaskieren(zone) + '"[^>]*>',
  ).exec(html);
  if (!m) return html; /* Seite ohne Hinweiskarte für diese Zone */
  /* Vorhandenes data-ed-leer erst entfernen, sonst stünde es beim zweiten
     Speichern doppelt im Tag. Der Ausblick (?=[\s>]) ist nötig, weil
     "data-ed-leerhinweis" mit "data-ed-leer" ANFÄNGT — ohne ihn würde die
     Markierung selbst zerschnitten. */
  let tag = m[0].replace(/\sdata-ed-leer(="[^"]*")?(?=[\s>])/g, "");
  if (!sichtbar) {
    tag = tag.replace(/\sdata-ed-leerhinweis="/, ' data-ed-leer="aus" data-ed-leerhinweis="');
  }
  return html.slice(0, m.index) + tag + html.slice(m.index + m[0].length);
}
