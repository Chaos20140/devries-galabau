/* =====================================================================
   verwaltung — Backoffice-Schnittstelle

   Die Verwaltungsseite ist statisches HTML und darf die Datenbank NICHT
   direkt lesen. Sie spricht ausschliesslich mit dieser Funktion:

   · Das Passwort wird hier geprueft, nicht im Browser. Im Quelltext der
     Seite steht kein Geheimnis.
   · Gelesen und geschrieben wird mit dem service_role-Schluessel, den
     Supabase der Funktion als Umgebungsvariable stellt. Er verlaesst den
     Server nie.
   · Ohne gueltiges Passwort gibt es keine Daten — auch keine Hinweise
     darauf, ob die Adresse ueberhaupt stimmt.

   Gesetzt wird das Passwort vom Betreiber:
     supabase secrets set VERWALTUNG_PASSWORT='...'
   ===================================================================== */
const PASSWORT = Deno.env.get("VERWALTUNG_PASSWORT") ?? "";
const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const DIENST = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TABELLEN: Record<string, string> = {
  anfragen: "galabau_anfragen",
  bewerbungen: "galabau_bewerbungen",
};

/* Welche Spalten beim Wiederherstellen eines geloeschten Eintrags
   uebernommen werden duerfen. Ohne diese Liste koennte ueber den
   Wiederherstellen-Weg jede beliebige Spalte gesetzt werden — der
   Browser schickt den Datensatz, und was der Browser schickt, ist
   niemals vertrauenswuerdig. Alles ausserhalb der Liste wird verworfen. */
const SPALTEN: Record<string, string[]> = {
  anfragen: [
    "id", "eingegangen_am", "quelle", "betreff", "name", "email", "telefon",
    "ort", "art", "bereich", "zeitraum", "nachricht", "status", "notiz", "archiviert",
  ],
  bewerbungen: [
    "id", "eingegangen_am", "quelle", "betreff", "name", "email", "telefon",
    "stelle", "verfuegbar_ab", "nachricht", "status", "notiz", "archiviert",
    "datei", "datei_name", "dateien",
  ],
};

const LISTE_MAX = 500;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/* =====================================================================
   Seiten-Editor: Texte zurueck ins Repository schreiben
   =====================================================================

   Die Website ist statisch und liegt auf GitHub Pages. Geaenderte Texte
   werden deshalb NICHT in eine Datenbank gelegt und beim Besuch
   nachgeladen — das kostete Suchmaschinentauglichkeit und Ladezeit und
   liesse die Seite bei einem Ausfall der Datenbank leer. Stattdessen
   wird die HTML-Datei selbst geaendert und committet; Pages baut danach
   neu. Was ausgeliefert wird, ist also weiterhin fertiges HTML.
   ===================================================================== */
import { bloeckeErzeugen, zoneSetzen, zoneInhalt, leerhinweis } from "./bloecke.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

const GH_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GH_REPO = "Chaos20140/devries-galabau";

/* Reihenfolge ist Absicht: erst der Arbeitsstand, dann der
   veroeffentlichte Branch. Scheitert der erste, wurde noch nichts
   geschrieben. Scheitert der zweite, ist wenigstens die Live-Seite
   unveraendert — und der Editor sagt es.

   KONSTANTE, kein Eingabewert. Ein Branchname aus dem Netz waere ein
   Weg, in einen beliebigen Zweig des Repositories zu schreiben. */
const BRANCHES = ["redesign/gartenrundgang", "main"];

/* Die wichtigste einzelne Zeile dieser Datei.
   Der Editor darf ausschliesslich diese Dateien anfassen. Nicht in der
   Liste und mit Absicht nicht: assets/js/*.js (der Rundgang, die Web
   Components, der Formularversand), .htaccess, robots.txt, alles unter
   .github/ und supabase/. Wer hier etwas ergaenzt, gibt dem
   Verwaltungspasswort Schreibrecht darauf. */
const SEITEN_ERLAUBT = new Set([
  "index.html",
  "ueber-uns.html",
  "gartengestaltung.html",
  "gartenplanung.html",
  "gartenpflege.html",
  "bepflanzung.html",
  "referenzen.html",
  "kontakt.html",
  "anfrage.html",
  "stellenangebote.html",
  "impressum.html",
  "datenschutz.html",
  "danke.html",
  "404.html",
]);

const MAX_TEXTE = 200;
const MAX_LAENGE = 2000;

/* Der Wert kommt aus textContent des Browsers, ist also bereits
   dekodiert. Fuer den Weg zurueck ins HTML muss er wieder maskiert
   werden — sonst wuerde aus einem getippten "<b>" echtes Markup.
   Nur die drei Zeichen: es geht um Elementinhalt, nicht um ein
   Attribut, Anfuehrungszeichen sind hier bedeutungslos. */
function htmlMaskieren(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function regexMaskieren(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Ersetzt den Inhalt des Elements mit data-ed="kennung".
   Der Ausdruck verlangt zwischen Start- und Endtag ([^<]*), also KEIN
   Kindelement. Genau das garantiert der Marker-Vertrag
   (.planning/werkzeug/marker.js): data-ed sitzt nur auf Elementen mit
   genau einem Textknoten. Findet der Ausdruck nichts, wird nicht etwa
   stillschweigend nichts geaendert — der Aufrufer bekommt es gesagt. */
/* Fuer ATTRIBUTWERTE, nicht fuer Elementinhalt. Der Unterschied ist
   nicht kosmetisch: ein Anfuehrungszeichen im Text wuerde das Attribut
   vorzeitig schliessen und alles dahinter zu Markup machen. */
function attributMaskieren(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Setzt den content-Wert eines <meta>, das ueber name= oder property=
   bestimmt ist. Gibt null zurueck, wenn es das Feld nicht gibt — der
   Aufrufer soll es erfahren, nicht stillschweigend nichts tun. */
function metaSetzen(html: string, art: "name" | "property", schluessel: string, wert: string): string | null {
  const re = new RegExp(
    '(<meta\\s+' + art + '="' + regexMaskieren(schluessel) + '"[^>]*?content=")([^"]*)(")',
    "i",
  );
  if (!re.test(html)) return null;
  return html.replace(re, (_m, auf, _alt, zu) => auf + attributMaskieren(wert) + zu);
}

function metaLesen(html: string, art: "name" | "property", schluessel: string): string | null {
  const re = new RegExp(
    '<meta\\s+' + art + '="' + regexMaskieren(schluessel) + '"[^>]*?content="([^"]*)"',
    "i",
  );
  const m = re.exec(html);
  return m ? m[1] : null;
}

function titelSetzen(html: string, wert: string): string | null {
  const re = /(<title>)([^<]*)(<\/title>)/i;
  if (!re.test(html)) return null;
  return html.replace(re, (_m, auf, _alt, zu) => auf + htmlMaskieren(wert) + zu);
}

function titelLesen(html: string): string | null {
  const m = /<title>([^<]*)<\/title>/i.exec(html);
  return m ? m[1] : null;
}

/* Was steht gerade an dieser Stelle in der Datei? Gibt den ROHEN,
   maskierten Inhalt zurueck — genau so, wie er dort liegt. */
function textLesen(html: string, kennung: string): string | null {
  const re = new RegExp(
    '<([a-zA-Z][\\w-]*)\\b[^>]*\\sdata-ed="' + regexMaskieren(kennung) + '"[^>]*>([^<]*)<\\/\\1>',
  );
  const m = re.exec(html);
  return m ? m[2] : null;
}

function textErsetzen(html: string, kennung: string, neu: string): string | null {
  const re = new RegExp(
    '(<([a-zA-Z][\\w-]*)\\b[^>]*\\sdata-ed="' + regexMaskieren(kennung) + '"[^>]*>)([^<]*)(<\\/\\2>)',
  );
  if (!re.test(html)) return null;
  return html.replace(re, (_m, auf, _tag, _alt, zu) => auf + htmlMaskieren(neu) + zu);
}

async function gh(pfad: string, init: RequestInit = {}): Promise<Response> {
  return await fetch("https://api.github.com/repos/" + GH_REPO + pfad, {
    ...init,
    headers: {
      Authorization: "Bearer " + GH_TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "devries-galabau-editor",
      ...(init.headers ?? {}),
    },
  });
}

/* Pfad IMMER kodieren. Im Schwesterprojekt kodiert putFile als einzige
   der drei GitHub-Hilfsfunktionen den Pfad nicht — der Fehler wandert
   hier nicht mit. */
const pfadTeil = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function ghHole(pfad: string, branch: string): Promise<{ text: string; sha: string }> {
  const r = await gh("/contents/" + pfadTeil(pfad) + "?ref=" + encodeURIComponent(branch));
  if (!r.ok) throw new Error("lesen_fehlgeschlagen_" + r.status);
  const d = await r.json();
  if (typeof d.content !== "string") throw new Error("keine_datei");
  /* GitHub liefert base64 mit Zeilenumbruechen. */
  const bytes = Uint8Array.from(atob(d.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
  return { text: new TextDecoder().decode(bytes), sha: d.sha as string };
}

/* Mehrere Dateien in EINEM Commit — ueber die Git-Data-API.
   Die Contents-API kann nur eine Datei je Aufruf; ein Bildwechsel
   beruehrt aber vier (drei Groessen plus die HTML-Seite). Vier einzelne
   Commits waeren vier Veroeffentlichungen, und zwischen ihnen zeigte die
   Live-Seite einen halben Zustand: neues Markup, alte Bilder. */
async function ghCommitMulti(
  branch: string,
  dateien: { pfad: string; inhalt: string; base64?: boolean }[],
  nachricht: string,
): Promise<void> {
  const refA = await gh("/git/ref/heads/" + encodeURIComponent(branch));
  if (!refA.ok) throw new Error("ref_fehlgeschlagen_" + refA.status);
  const kopf = (await refA.json()).object.sha as string;

  const commitA = await gh("/git/commits/" + kopf);
  if (!commitA.ok) throw new Error("commit_lesen_fehlgeschlagen_" + commitA.status);
  const baum = (await commitA.json()).tree.sha as string;

  /* Blobs einzeln anlegen. base64 fuer Bilder, utf-8 fuer Text — sonst
     wuerden Umlaute in der HTML-Datei zerstoert. */
  const eintraege: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const d of dateien) {
    const b = await gh("/git/blobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        d.base64
          ? { content: d.inhalt, encoding: "base64" }
          : { content: d.inhalt, encoding: "utf-8" },
      ),
    });
    if (!b.ok) throw new Error("blob_fehlgeschlagen_" + b.status);
    eintraege.push({ path: d.pfad, mode: "100644", type: "blob", sha: (await b.json()).sha });
  }

  const baumA = await gh("/git/trees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baum, tree: eintraege }),
  });
  if (!baumA.ok) throw new Error("baum_fehlgeschlagen_" + baumA.status);
  const neuerBaum = (await baumA.json()).sha as string;

  const neuA = await gh("/git/commits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: nachricht, tree: neuerBaum, parents: [kopf] }),
  });
  if (!neuA.ok) throw new Error("commit_fehlgeschlagen_" + neuA.status);
  const neuerCommit = (await neuA.json()).sha as string;

  /* Ohne force: schlaegt fehl, wenn der Zweig sich inzwischen bewegt hat —
     dieselbe Sperre wie der Blob-SHA bei der Contents-API. */
  const setz = await gh("/git/refs/heads/" + encodeURIComponent(branch), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: neuerCommit, force: false }),
  });
  if (!setz.ok) throw new Error("ref_setzen_fehlgeschlagen_" + setz.status);
}

/* Welche Fassungen dieser Datei gibt es? Git haelt sie ohnehin — das
   ist der billigste denkbare Rueckweg fuer den Betreiber. */
async function ghStaende(pfad: string, branch: string): Promise<
  { sha: string; datum: string; nachricht: string }[]
> {
  const r = await gh("/commits?path=" + encodeURIComponent(pfad) +
    "&sha=" + encodeURIComponent(branch) + "&per_page=20");
  if (!r.ok) throw new Error("verlauf_fehlgeschlagen_" + r.status);
  const d = await r.json();
  if (!Array.isArray(d)) return [];
  return d.map((c: Record<string, never>) => ({
    sha: String((c as { sha?: string }).sha ?? ""),
    datum: String(
      ((c as { commit?: { committer?: { date?: string } } }).commit?.committer?.date) ?? "",
    ),
    nachricht: String(
      ((c as { commit?: { message?: string } }).commit?.message ?? "").split("\n")[0],
    ).slice(0, 120),
  })).filter((c) => c.sha);
}

async function ghSchreibe(
  pfad: string, branch: string, inhalt: string, sha: string, nachricht: string,
): Promise<void> {
  const bytes = new TextEncoder().encode(inhalt);
  let roh = "";
  for (const b of bytes) roh += String.fromCharCode(b);
  const r = await gh("/contents/" + pfadTeil(pfad), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: nachricht, content: btoa(roh), sha, branch }),
  });
  /* 409/422 heisst: jemand anders hat die Datei inzwischen geaendert.
     Der mitgeschickte SHA wirkt als Sperre — kein stiller Ueberschreiber. */
  if (!r.ok) throw new Error("schreiben_fehlgeschlagen_" + r.status);
}

const json = (daten: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(daten), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...extra },
  });

/* ---------------------------------------------------------------------
   Schutz gegen Durchprobieren.

   Die erste Fassung liess nur die ANTWORT langsamer werden. Das haelt
   niemanden auf, der viele Versuche gleichzeitig schickt: ein setTimeout
   innerhalb einer Anfrage blockiert keine andere. Bei 200 parallelen
   Verbindungen und 8 s Obergrenze waren das rund 25 Versuche je Sekunde.

   Entscheidend ist deshalb nicht die Wartezeit, sondern: ab der Grenze
   wird das Passwort GAR NICHT MEHR VERGLICHEN. Dann ist ein paralleler
   Versuch wertlos, weil er nichts mehr prueft.

   Gezaehlt wird je Herkunft, nicht global. Eine globale Sperre liesse
   sich von aussen ausloesen, um den Betreiber auszusperren — deshalb gab
   es zuerst gar keine.

   Ehrlich zum Preis: oberhalb der Grenze kommt auch das RICHTIGE Passwort
   nicht mehr durch, denn es wird ja nicht mehr verglichen. Wer sich also
   zwoelfmal vertippt, wartet fuenfzehn Minuten. Das ist der Preis dafuer,
   dass parallele Versuche nichts mehr bringen; beides zusammen geht nicht.
   Getroffen wird dabei nur der eigene Anschluss, die Sperre laeuft von
   selbst ab, und wer nicht warten will, loescht die Zeilen in
   verwaltung_versuche (dauert dann hoechstens eine weitere Minute, so
   lange haelt der Zwischenspeicher).
   --------------------------------------------------------------------- */
const FENSTER_MS = 15 * 60 * 1000;
const GRENZE = 12;          // ab so vielen Fehlversuchen je Herkunft: 429
const WARTE_MAX = 8000;

/* Schneller Weg ohne Datenbank. Die Datenbank bleibt die Wahrheit, aber
   ein Ansturm soll nicht fuer jede einzelne Anfrage dorthin durchgreifen.
   Der Speicher gilt je Instanz und geht beim Recyceln verloren — das ist
   in Ordnung, die Datenbankpruefung faengt es auf. */
const gesperrt = new Map<string, number>();

/* Die Datenbankzaehlung allein verliert einen Wettlauf: schickt jemand
   dreissig Versuche GLEICHZEITIG, fragen alle dreissig den Stand ab,
   bevor der erste Fehlversuch eingetragen ist — gemessen kamen 22 durch.
   Dieser Zaehler laeuft deshalb OHNE await hoch, gleich in der ersten
   Zeile der Anfrage. Damit sehen gleichzeitige Anfragen einander.

   Gezaehlt werden Versuche, nicht Fehlversuche — zum Zeitpunkt des
   Hochzaehlens ist noch nicht bekannt, ob das Passwort stimmt. Damit das
   den Betreiber nicht trifft, loescht JEDE erfolgreiche Anfrage den
   Zaehler: wer angemeldet arbeitet, faengt bei jedem Klick wieder bei
   null an. Nur wer daneben liegt, sammelt. */
const laufend = new Map<string, { n: number; bis: number }>();

function versuchPlus(wer: string): number {
  const jetzt = Date.now();
  const e = laufend.get(wer);
  if (!e || e.bis < jetzt) {
    laufend.set(wer, { n: 1, bis: jetzt + FENSTER_MS });
    return 1;
  }
  e.n += 1;
  return e.n;
}

function versuchWeg(wer: string): void {
  laufend.delete(wer);
}

function herkunftRoh(req: Request): string {
  /* "cf-connecting-ip" ist hier die verlaessliche Quelle, nicht nur die
     bequeme. Diese Funktion liegt hinter Cloudflare; die Kopfzeile wird
     dort gesetzt, und ein Aufrufer, der sie selbst mitschickt, kommt gar
     nicht erst durch. Gemessen am 04.08.2026 gegen die Live-Funktion:
       ohne Kopfzeile            -> 401 nach 1,31 s
       gefaelschtes cf-connecting-ip -> 403 von Cloudflare, erreicht uns nie
       gefaelschtes x-forwarded-for  -> 401 nach 1,92 s
     Der Anstieg von 1,31 auf 1,92 s belegt, dass beide Anfragen im
     SELBEN Zaehler landeten — die gefaelschte Kopfzeile hat keinen
     eigenen Eimer aufgemacht.

     ⚠ Der Rueckfall darunter nahm frueher den ERSTEN Eintrag aus
     x-forwarded-for. Cloudflare haengt die echte Adresse hinten an, der
     erste Eintrag stammt also gegebenenfalls vom Aufrufer selbst. Solange
     cf-connecting-ip da ist, laeuft dieser Zweig nie — faellt es aber je
     weg (anderer Anbieter, geaenderte Plattform), waere die Bremse
     lautlos umgehbar. Deshalb der LETZTE Eintrag: den setzt immer der
     naechstgelegene, vertrauenswuerdige Proxy. */
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff && xff.trim()) {
    const teile = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (teile.length) return teile[teile.length - 1];
  }
  /* Kein Kopf, keine Unterscheidung: dann teilen sich alle EINEN Zaehler.
     Das ist die sichere Richtung — lieber zu streng als wirkungslos. */
  return "unbekannt";
}

/* Nur der Hashwert wird gespeichert, nie die Adresse selbst: fuer das
   Zaehlen genuegt er, und es liegen keine Verbindungsdaten herum. Der
   Streuwert ist der Dienstschluessel — der verlaesst den Server ohnehin
   nie, und ohne ihn laesst sich der Hashwert nicht zurueckrechnen. */
async function herkunftHash(req: Request): Promise<string> {
  const roh = herkunftRoh(req);
  const bytes = new TextEncoder().encode(roh + "|" + DIENST.slice(0, 24));
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(h).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------------------------------------------------------------
   Sitzung.

   Bisher ging bei JEDER Anfrage das Passwort mit, und die Seite musste es
   deshalb die ganze Zeit im Speicher halten. Ein Neuladen bedeutete: neu
   anmelden.

   Jetzt stellt der Server nach erfolgreicher Anmeldung ein Kennzeichen
   aus, das eine begrenzte Zeit gilt. Das ist nicht nur bequemer, sondern
   auch sicherer: das Passwort wandert genau einmal ueber die Leitung und
   liegt danach nirgends mehr.

   Das Kennzeichen ist "Ablaufzeitpunkt.Signatur". Die Signatur haengt am
   Dienstschluessel UND am Passwort — wird das Passwort geaendert, sind
   alle ausgestellten Kennzeichen sofort ungueltig. Serverseitig muss
   dafuer nichts gespeichert werden.
   --------------------------------------------------------------------- */
const SITZUNG_MS = 8 * 60 * 60 * 1000;   // ein Arbeitstag

async function signatur(text: string): Promise<string> {
  const schluessel = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(DIENST + "|" + PASSWORT),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const roh = await crypto.subtle.sign("HMAC", schluessel, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(roh)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sitzungAusstellen(): Promise<string> {
  const bis = String(Date.now() + SITZUNG_MS);
  return bis + "." + (await signatur(bis));
}

async function sitzungGueltig(kennzeichen: string): Promise<boolean> {
  const punkt = kennzeichen.indexOf(".");
  if (punkt < 1) return false;
  const bis = kennzeichen.slice(0, punkt);
  const sig = kennzeichen.slice(punkt + 1);
  const n = Number(bis);
  if (!Number.isFinite(n) || n < Date.now()) return false;
  return gleich(sig, await signatur(bis));
}

/* Vergleich ohne fruehen Abbruch — die Laufzeit soll nichts verraten. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function db(pfad: string, init: RequestInit = {}) {
  const r = await fetch(URL_ + "/rest/v1/" + pfad, {
    ...init,
    headers: {
      apikey: DIENST,
      Authorization: "Bearer " + DIENST,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error("Datenbank " + r.status);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* Zaehlt, ohne die Zeilen zu holen: "count=exact" liefert die Zahl im
   Kopf, "Range: 0-0" verhindert, dass der Rumpf mitkommt. */
async function anzahl(pfad: string): Promise<number> {
  const r = await fetch(URL_ + "/rest/v1/" + pfad, {
    headers: {
      apikey: DIENST,
      Authorization: "Bearer " + DIENST,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!r.ok && r.status !== 206) throw new Error("Datenbank " + r.status);
  const n = Number((r.headers.get("content-range") ?? "").split("/")[1]);
  return Number.isFinite(n) ? n : 0;
}

/* Zahlen fuer die Kachelansicht. Bewusst mehr als nur "neu": wie viele
   insgesamt da sind und wann der letzte Eingang war — das beantwortet die
   Frage "ist seitdem etwas passiert?" ohne die Liste zu oeffnen. */
async function uebersicht() {
  const je = async (t: string) => {
    const [neu, gesamt, letzte] = await Promise.all([
      anzahl(t + "?select=id&status=eq.neu&archiviert=is.false"),
      anzahl(t + "?select=id&archiviert=is.false"),
      db(t + "?select=eingegangen_am&order=eingegangen_am.desc&limit=1"),
    ]);
    return {
      neu,
      gesamt,
      letzter: Array.isArray(letzte) && letzte[0] ? letzte[0].eingegangen_am : null,
    };
  };
  const [anfragen, bewerbungen] = await Promise.all([
    je(TABELLEN.anfragen),
    je(TABELLEN.bewerbungen),
  ]);
  return { anfragen, bewerbungen };
}

/* Zugriff auf den Speicherbereich. Laeuft ueber service_role und
   umgeht damit die Zeilenrechte — der oeffentliche Schluessel darf dort
   ausschliesslich ablegen, nie lesen. */
const EIMER = "bewerbungen";

async function speicher(pfad: string, init: RequestInit = {}) {
  const r = await fetch(URL_ + "/storage/v1/" + pfad, {
    ...init,
    headers: {
      apikey: DIENST,
      Authorization: "Bearer " + DIENST,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error("Speicher " + r.status + " " + txt.slice(0, 120));
  return txt ? JSON.parse(txt) : null;
}

/* Beim Loeschen wandert die Datei in den Papierkorbbereich statt sofort
   fort — sonst waere "Rueckgaengig" nur halb wahr: der Datensatz kaeme
   zurueck, der Lebenslauf nicht. Aufgeraeumt wird bei jeder Anmeldung,
   alles aelter als 24 Stunden. Damit liegt nichts unbegrenzt herum. */
/* =====================================================================
   SICHERUNGEN
   Eine Sicherung ist EINE ZIP-Datei im privaten Eimer "sicherungen":
   der komplette Stand des Repositorys, die Aenderungsgeschichte, die
   gespeicherten Anfragen und Bewerbungen sowie die hochgeladenen
   Bewerbungsunterlagen.

   Warum ueberhaupt? Der Seiten-Editor schreibt auf einer LIVEN Seite.
   Git haelt zwar jede Textaenderung, aber weder die Datenbank noch die
   Unterlagen — und genau die kann niemand neu tippen.

   Aufbewahrt werden die letzten SICHERUNG_BEHALTEN Staende. Bei
   taeglichem Rhythmus reicht das fuer einen Rueckgriff von einer Woche;
   mehr waere vor allem Speicherplatz.
   ===================================================================== */
const SICHERUNG_BEHALTEN = Math.max(1, Number(Deno.env.get("SICHERUNG_BEHALTEN") ?? "7"));
const SICHERUNG_ABSTAND_TAGE = Number(Deno.env.get("SICHERUNG_ABSTAND_TAGE") ?? "1");
const SICHERUNG_TOKEN = Deno.env.get("SICHERUNG_TOKEN") ?? "";
/* Obergrenze fuer die MITGESICHERTEN Bewerbungsunterlagen. Die Edge
   Function haelt alles im Arbeitsspeicher; ohne Deckel reisst eine
   Sicherung irgendwann das Speicherlimit — und zwar genau dann, wenn am
   meisten drinsteckt. Lieber das Wichtige vollstaendig plus eine Liste
   des Ausgelassenen. */
const SICHERUNG_MAX_ANHAENGE = 40 * 1024 * 1024;
const SICHERUNG_EIMER = "sicherungen";

/* Fuehrende = + - @ entschaerfen: sonst fuehrt Excel sie als Formel aus.
   Dieselbe Falle wie beim CSV-Export der Verwaltung (v28). */
function csvZelle(v: unknown): string {
  let s = v == null ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
  s = s.replace(/\r?\n/g, " / ");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function csv(zeilen: Record<string, unknown>[]): string {
  if (!zeilen.length) return "";
  const spalten = Object.keys(zeilen[0]);
  return "sep=;\r\n" + spalten.map(csvZelle).join(";") + "\r\n" +
    zeilen.map((z) => spalten.map((s) => csvZelle(z[s])).join(";")).join("\r\n");
}

/* Rohe Bytes aus dem Speicherbereich. speicher() taugt hier nicht: das
   erwartet JSON zurueck, hier kommen Binaerdaten. */
async function speicherBytes(pfad: string): Promise<Uint8Array | null> {
  const r = await fetch(URL_ + "/storage/v1/object/" + pfad, {
    headers: { apikey: DIENST, Authorization: "Bearer " + DIENST },
  });
  if (!r.ok) return null;
  return new Uint8Array(await r.arrayBuffer());
}

async function sicherungBauen(art: string) {
  const zip = new JSZip();
  const zahl = {
    dateien: 0, seiten: 0, assets: 0, servercode: 0,
    verlauf: 0, anfragen: 0, bewerbungen: 0,
    unterlagen: 0, unterlagen_ausgelassen: 0,
  };

  /* 1) Das GANZE Repository in einem Zug statt Datei fuer Datei.
        Damit kann nichts vergessen werden — auch keine Datei, die es
        erst kuenftig geben wird. Genommen wird der ARBEITSZWEIG: dort
        liegt alles, main ist eine Teilmenge davon. */
  /* ⚠ Der Pfad MUSS mit einem Schraegstrich beginnen: gh() haengt ihn
     direkt an ".../repos/<repo>" an. Ohne ihn entsteht
     ".../devries-galabauzipball/..." — und das ist einfach 404. */
  const zr = await gh("/zipball/" + encodeURIComponent(BRANCHES[0]));
  if (!zr.ok) throw new Error("Repository " + zr.status);
  const quelle = await JSZip.loadAsync(new Uint8Array(await zr.arrayBuffer()));
  for (const name of Object.keys(quelle.files)) {
    const e = quelle.files[name];
    if (e.dir) continue;
    const rel = name.replace(/^[^/]+\//, "");   /* GitHub-Wurzelordner abschneiden */
    if (!rel) continue;
    zip.file("website/" + rel, await e.async("uint8array"));
    zahl.dateien++;
    if (/\.html$/i.test(rel)) zahl.seiten++;
    else if (/^assets\//i.test(rel)) zahl.assets++;
    else if (/^supabase\//i.test(rel)) zahl.servercode++;
  }

  /* 2) Der .git-Ordner selbst laesst sich ueber die API nicht holen.
        Statt der Rohdaten die Commit-Liste als lesbare Datei — so bleibt
        nachvollziehbar, wann was geaendert wurde. */
  try {
    const zeilen: string[] = [];
    for (let seite = 1; seite <= 10; seite++) {
      const hr = await gh("/commits?sha=" + encodeURIComponent(BRANCHES[0]) + "&per_page=100&page=" + seite);
      if (!hr.ok) break;
      const cs = await hr.json();
      if (!Array.isArray(cs) || !cs.length) break;
      for (const c of cs) {
        const d = c.commit && c.commit.author ? String(c.commit.author.date).slice(0, 16).replace("T", " ") : "";
        const wer = c.commit && c.commit.author ? String(c.commit.author.name) : "";
        const txt = c.commit ? String(c.commit.message).split("\n")[0] : "";
        zeilen.push(d + "  " + String(c.sha).slice(0, 8) + "  " + wer + "  " + txt);
      }
      if (cs.length < 100) break;
    }
    if (zeilen.length) {
      zip.file("aenderungsgeschichte.txt",
        "Aenderungen an der Website, neueste zuerst — " + zeilen.length + " Eintraege\n" +
        "Vollstaendig im Repository " + GH_REPO + ".\n\n" + zeilen.join("\n"));
      zahl.verlauf = zeilen.length;
    }
  } catch { /* eine Sicherung ohne Verlauf ist besser als keine */ }

  /* 3) Die gespeicherten Daten — je als JSON (vollstaendig, zum
        Zurueckspielen) und als CSV (zum Ansehen in Excel). */
  for (const [name, tabelle] of Object.entries(TABELLEN)) {
    const roh = await db(tabelle + "?select=*&order=eingegangen_am.asc&limit=5000");
    const zeilen = Array.isArray(roh) ? roh as Record<string, unknown>[] : [];
    zip.file("daten/" + name + ".json", JSON.stringify(zeilen, null, 2));
    if (zeilen.length) zip.file("daten/" + name + ".csv", csv(zeilen));
    if (name === "anfragen") zahl.anfragen = zeilen.length;
    else zahl.bewerbungen = zeilen.length;
  }

  /* 4) Bewerbungsunterlagen, solange die Obergrenze haelt. Was nicht
        mitkommt, wird NAMENTLICH aufgefuehrt — stillschweigend
        auszulassen waere schlimmer, als es gar nicht zu versuchen. */
  let bytes = 0;
  const fehlt: string[] = [];
  const rohBew = await db(TABELLEN.bewerbungen + "?select=id,name,datei,datei_name,dateien&limit=5000");
  for (const b of (Array.isArray(rohBew) ? rohBew as Record<string, unknown>[] : [])) {
    const liste = Array.isArray(b.dateien) && (b.dateien as unknown[]).length
      ? b.dateien as Record<string, unknown>[]
      : (b.datei ? [{ pfad: b.datei, name: b.datei_name ?? "unterlage.pdf" }] : []);
    for (const d of liste) {
      const pfad = String(d.pfad ?? "");
      if (!pfad) continue;
      if (bytes >= SICHERUNG_MAX_ANHAENGE) { zahl.unterlagen_ausgelassen++; fehlt.push(pfad); continue; }
      const roh = await speicherBytes(EIMER + "/" + pfad);
      if (!roh) { fehlt.push(pfad + "   (nicht mehr im Speicher)"); continue; }
      if (bytes + roh.length > SICHERUNG_MAX_ANHAENGE) {
        zahl.unterlagen_ausgelassen++; fehlt.push(pfad); continue;
      }
      zip.file("unterlagen/" + String(b.id) + "/" + String(d.name ?? "unterlage.pdf"), roh);
      bytes += roh.length;
      zahl.unterlagen++;
    }
  }
  if (fehlt.length) {
    zip.file("unterlagen/NICHT-ENTHALTEN.txt",
      "Diese Unterlagen sind NICHT in dieser Sicherung:\n\n" + fehlt.join("\n"));
  }

  const jetzt = new Date();
  zip.file("LIESMICH.txt", [
    "Sicherung der Website de Vries Galabau",
    "Erstellt am : " + jetzt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) + " Uhr",
    "Art         : " + art,
    "",
    "INHALT",
    "  website/                  vollstaendige Kopie des Repositorys (" + zahl.dateien + " Dateien)",
    "                              " + zahl.seiten + " Seiten, " + zahl.assets + " Dateien unter assets/,",
    "                              " + zahl.servercode + " unter supabase/ (Serverfunktionen, Schema)",
    "  aenderungsgeschichte.txt  wer wann was geaendert hat (" + zahl.verlauf + " Eintraege)",
    "  daten/anfragen.*          " + zahl.anfragen + " Anfragen, als .json und .csv",
    "  daten/bewerbungen.*       " + zahl.bewerbungen + " Bewerbungen, als .json und .csv",
    "  unterlagen/               " + zahl.unterlagen + " Bewerbungsunterlagen" +
      (zahl.unterlagen_ausgelassen
        ? " (" + zahl.unterlagen_ausgelassen + " wegen Groesse ausgelassen, siehe NICHT-ENTHALTEN.txt)"
        : ""),
    "",
    "NICHT ENTHALTEN — mit Absicht",
    "  Zugangsdaten und Schluessel: Verwaltungspasswort, GitHub-Token,",
    "  Postfach-Passwort, Supabase-Schluessel. Die liegen ausschliesslich",
    "  in den Supabase-Secrets. In einer herunterladbaren Datei haetten sie",
    "  nichts zu suchen — wer die Sicherung haette, haette sonst alles.",
    "  Bitte getrennt an einem sicheren Ort notieren.",
    "",
    "ACHTUNG — personenbezogene Daten",
    "  Diese Datei enthaelt Namen, Anschriften, Telefonnummern, E-Mail-",
    "  Adressen und Bewerbungsunterlagen. Verschluesselt aufbewahren, nicht",
    "  weitergeben, nicht laenger behalten als noetig.",
    "",
    "WIEDERHERSTELLEN",
    "  Website        : Inhalt von website/ ins Repository zurueckspielen.",
    "  Serverfunktion : supabase/functions/... erneut veroeffentlichen",
    "                   (supabase functions deploy verwaltung --no-verify-jwt).",
    "  Datenbank      : supabase/migrations/ anwenden, danach die Dateien",
    "                   aus daten/ in die jeweilige Tabelle einspielen.",
    "  Zum Schluss die Zugangsdaten als Secrets neu setzen.",
  ].join("\n"));

  const inhalt = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  }) as Uint8Array;
  const stempel = jetzt.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return { inhalt, dateiname: "devries-galabau-sicherung-" + stempel + ".zip", zahl };
}

/* Legt die Sicherung ab und raeumt die ueberzaehligen weg.
   Reihenfolge ist Absicht: erst die Datei, dann die Zeile. Scheitert die
   Zeile, wird die Datei wieder entfernt — sonst laege eine verwaiste
   Sicherung im Eimer, die niemand mehr findet und die trotzdem
   personenbezogene Daten enthaelt. */
async function sicherungAblegen(art: string) {
  const { inhalt, dateiname, zahl } = await sicherungBauen(art);
  const pfad = crypto.randomUUID() + "/" + dateiname;

  const hoch = await fetch(URL_ + "/storage/v1/object/" + SICHERUNG_EIMER + "/" + pfad, {
    method: "POST",
    headers: {
      apikey: DIENST,
      Authorization: "Bearer " + DIENST,
      "Content-Type": "application/zip",
      "x-upsert": "false",
    },
    body: inhalt,
  });
  if (!hoch.ok) throw new Error("Ablegen " + hoch.status + " " + (await hoch.text()).slice(0, 120));

  let zeile: Record<string, unknown>;
  try {
    const r = await db("galabau_sicherungen", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ dateiname, pfad, groesse_bytes: inhalt.length, art, inhalt: zahl }),
    });
    zeile = (Array.isArray(r) ? r[0] : r) as Record<string, unknown>;
  } catch (e) {
    await fetch(URL_ + "/storage/v1/object/" + SICHERUNG_EIMER + "/" + pfad, {
      method: "DELETE",
      headers: { apikey: DIENST, Authorization: "Bearer " + DIENST },
    });
    throw e;
  }

  /* Aufraeumen. Faellt es aus, ist die Sicherung trotzdem entstanden —
     ein voller Eimer ist das kleinere Uebel als eine fehlende Sicherung. */
  let entfernt = 0;
  try {
    const alle = await db("galabau_sicherungen?select=id,pfad&order=erstellt_am.desc");
    const zuviel = (Array.isArray(alle) ? alle as Record<string, unknown>[] : []).slice(SICHERUNG_BEHALTEN);
    if (zuviel.length) {
      await fetch(URL_ + "/storage/v1/object/" + SICHERUNG_EIMER, {
        method: "DELETE",
        headers: {
          apikey: DIENST,
          Authorization: "Bearer " + DIENST,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: zuviel.map((x) => String(x.pfad)) }),
      });
      await db(
        "galabau_sicherungen?id=in.(" + zuviel.map((x) => String(x.id)).join(",") + ")",
        { method: "DELETE" },
      );
      entfernt = zuviel.length;
    }
  } catch (e) {
    console.error("Sicherungen aufraeumen:", e instanceof Error ? e.message : e);
  }
  return { zeile, entfernt };
}

/* Kurzlebiger, unterschriebener Verweis. Der Eimer ist privat; ohne
   Unterschrift kommt niemand an die Datei, auch nicht mit dem
   oeffentlichen Schluessel. Zehn Minuten reichen zum Herunterladen und
   sind kurz genug, dass ein weitergereichter Verweis nichts nutzt. */
async function sicherungVerweis(pfad: string): Promise<string | null> {
  try {
    const r = await speicher("object/sign/" + SICHERUNG_EIMER + "/" + pfad, {
      method: "POST",
      body: JSON.stringify({ expiresIn: 600 }),
    });
    const teil = r && (r as Record<string, unknown>).signedURL;
    return teil ? URL_ + "/storage/v1" + String(teil) : null;
  } catch {
    return null;
  }
}

async function papierkorbAufraeumen(): Promise<void> {
  const liste = await speicher("object/list/" + EIMER, {
    method: "POST",
    body: JSON.stringify({ prefix: "papierkorb/", limit: 1000 }),
  });
  if (!Array.isArray(liste) || !liste.length) return;
  const grenze = Date.now() - 24 * 60 * 60 * 1000;
  const alt = liste
    .filter((o) => {
      const t = Date.parse(o?.updated_at ?? o?.created_at ?? "");
      return Number.isFinite(t) && t < grenze;
    })
    .map((o) => "papierkorb/" + o.name);
  if (!alt.length) return;
  await speicher("object/" + EIMER, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: alt }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ fehler: "nur POST" }, 405);
  if (!PASSWORT || !DIENST) return json({ fehler: "nicht eingerichtet" }, 503);

  /* GANZ OBEN und OHNE await — nur so sehen gleichzeitige Anfragen
     einander. Jede Zeile darunter enthaelt ein await und gibt damit die
     Kontrolle ab; wer erst danach zaehlt, zaehlt zu spaet. */
  const anschluss = herkunftRoh(req);
  const laufenderStand = versuchPlus(anschluss);
  const zuViel = {
    fehler:
      "Zu viele Fehlversuche von diesem Anschluss. Die Sperre gilt 15 Minuten " +
      "und läuft von selbst ab; danach ist die Anmeldung wieder möglich.",
  };
  if (laufenderStand > GRENZE) {
    return json(zuViel, 429, { "Retry-After": "900" });
  }

  let körper: Record<string, unknown>;
  try { körper = await req.json(); } catch { return json({ fehler: "ungültig" }, 400); }

  /* ---- Zeitgesteuerte Sicherung -------------------------------------
     Steht BEWUSST vor der Sitzungs- und Passwortpruefung: Der Zeitplan
     hat kein Passwort und soll auch keins bekommen — sonst muesste das
     Verwaltungspasswort in der Datenbank stehen. Stattdessen ein eigenes
     Geheimnis, das nur der Zeitplan kennt (Secret SICHERUNG_TOKEN).

     Der Zeitplan darf taeglich anfragen; gesichert wird nur, wenn die
     letzte Sicherung aelter als SICHERUNG_ABSTAND_TAGE ist. Damit holt
     sich ein ausgefallener Lauf beim naechsten Mal von selbst nach, und
     ein doppelt ausgeloester Lauf richtet keinen Schaden an.

     Kein Zaehler der Anmeldebremse: hier wird nichts geraten, das
     Geheimnis ist zufaellig erzeugt. Die Verzoegerung im Fehlerfall
     bleibt trotzdem — sie kostet einen Angreifer Zeit und uns nichts. */
  if (String(körper.was ?? "") === "sicherung-automatisch") {
    if (!SICHERUNG_TOKEN) return json({ fehler: "nicht eingerichtet" }, 503);
    if (!gleich(String(körper.token ?? ""), SICHERUNG_TOKEN)) {
      await new Promise((r) => setTimeout(r, 600));
      return json({ fehler: "nicht berechtigt" }, 401);
    }
    try {
      const roh = await db("galabau_sicherungen?select=erstellt_am&order=erstellt_am.desc&limit=1");
      const letzte = Array.isArray(roh) && roh.length
        ? new Date(String((roh[0] as Record<string, unknown>).erstellt_am)).getTime()
        : 0;
      const alterTage = letzte ? (Date.now() - letzte) / 86400000 : 9999;
      if (alterTage < SICHERUNG_ABSTAND_TAGE) {
        return json({ ok: true, uebersprungen: true, alter_tage: Number(alterTage.toFixed(2)) });
      }
      const r = await sicherungAblegen("automatisch");
      return json({ ok: true, erstellt: true, sicherung: r.zeile, entfernt: r.entfernt });
    } catch (e) {
      /* Den Grund MITGEBEN. Diese Antwort bekommt nur, wer das
         Geheimnis kennt — und ohne ihn stochert man im Dunkeln:
         diese CLI-Fassung hat keinen Befehl fuer die Protokolle der
         Funktion (dieselbe Falle wie beim SMTP-Fehler 535). */
      const grund = e instanceof Error ? e.message : String(e);
      console.error("Sicherung automatisch:", grund);
      return json({ fehler: "Sicherung fehlgeschlagen", grund }, 500);
    }
  }

  /* Gueltiges Sitzungskennzeichen? Dann kein Passwortvergleich und keine
     Zaehlung — es wird ja nichts geraten. Ein Kennzeichen zu faelschen
     hiesse, HMAC-SHA256 zu brechen; das ist keine Sache des Durchprobierens.
     Ein abgelaufenes Kennzeichen fuehrt deshalb auch NICHT zur Sperre,
     sonst waere man nach zwoelf Neuladen ausgesperrt. */
  const kennzeichen = String(körper.sitzung ?? "");
  let angemeldet = false;
  if (kennzeichen) {
    if (await sitzungGueltig(kennzeichen)) {
      angemeldet = true;
      versuchWeg(anschluss);
    } else {
      return json(
        { fehler: "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.", neuAnmelden: true },
        401,
      );
    }
  }

  const wer = await herkunftHash(req);

  /* Erst die Sperre, DANN der Vergleich. Diese Reihenfolge ist der Kern:
     oberhalb der Grenze wird gar nicht mehr geprueft, ein paralleler
     Versuch bringt also nichts. */
  const bis = angemeldet ? 0 : (gesperrt.get(wer) ?? 0);
  if (bis > Date.now()) {
    return json(
      zuViel,
      429,
      { "Retry-After": String(Math.ceil((bis - Date.now()) / 1000)) },
    );
  }

  /* Eintragen und Zaehlen in EINEM Aufruf, in der Datenbank serialisiert
     (siehe supabase/anmeldeschutz.sql). Getrennte Schritte verlieren den
     Wettlauf: zwischen "zaehlen" und "eintragen" liegen zwei Netzwerkwege,
     und von 40 gleichzeitigen Versuchen kamen so 26 bis zum Vergleich. */
  let stand: number | null = null;
  if (!angemeldet) {
    try {
      const antwort = await db("rpc/verwaltung_versuch", {
        method: "POST",
        body: JSON.stringify({ p_herkunft: wer }),
      });
      stand = typeof antwort === "number" ? antwort : null;
    } catch { /* unten konservativ behandelt */ }
  }

  if (!angemeldet && (stand === null || stand > GRENZE)) {
    /* Scheitert die Zaehlung, wird abgewiesen statt durchgelassen. Sonst
       waere ein Ausfall der Zaehlung der bequemste Weg an ihr vorbei. */
    gesperrt.set(wer, Date.now() + 60_000);
    return json(zuViel, 429, { "Retry-After": "900" });
  }

  if (!angemeldet && !gleich(String(körper.passwort ?? ""), PASSWORT)) {
    /* Zusaetzlich zur Grenze: jeder Fehlversuch kostet Zeit. Das bremst
       auch die Versuche UNTERHALB der Grenze. */
    const warten = Math.min(WARTE_MAX, 900 * Math.pow(1.6, Math.max(0, (stand ?? 1) - 1)));
    await new Promise((r) => setTimeout(r, warten));
    return json({ fehler: "Passwort falsch" }, 401);
  }

  /* Richtiges Passwort: Zaehlung dieser Herkunft aufraeumen — bewusst nur
     die eigene, ein Fehlversuch von woanders soll dadurch nicht
     verschwinden. Weil JEDE erfolgreiche Anfrage das tut, sammelt
     jemand, der angemeldet arbeitet, nie Versuche an. */
  gesperrt.delete(wer);
  versuchWeg(anschluss);
  try {
    await db("verwaltung_versuche?herkunft=eq." + wer, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  } catch { /* nicht kritisch */ }

  const was = String(körper.was ?? "");
  const bereich = String(körper.bereich ?? "");
  const tabelle = TABELLEN[bereich];

  try {
    if (was === "anmelden") {
      /* Gelegenheit zum Aufraeumen. Scheitert es, ist das kein Grund,
         die Anmeldung zu verweigern. */
      try { await papierkorbAufraeumen(); } catch (e) {
        console.error("Papierkorb:", e instanceof Error ? e.message : e);
      }
      const zahlen = await uebersicht();
      return json({
        ok: true,
        stand: zahlen,
        /* Rueckwaertskompatibel: aeltere ausgelieferte Seiten lesen "neu". */
        neu: { anfragen: zahlen.anfragen.neu, bewerbungen: zahlen.bewerbungen.neu },
        /* Nur bei der Anmeldung mit Passwort ausstellen, nicht bei einer
           Anfrage, die schon ein Kennzeichen mitbringt. */
        sitzung: angemeldet ? undefined : await sitzungAusstellen(),
      });
    }

    /* Schlanke Abfrage fuer den regelmaessigen Blick "ist etwas Neues da?".
       Holt nur Zahlen, keine Datensaetze. */
    if (was === "stand") {
      return json({ ok: true, stand: await uebersicht() });
    }

    /* ---- Sicherungen ---------------------------------------------------
       Liste mit unterschriebenem Verweis je Stand. Der Verweis wird bei
       JEDEM Abruf neu erzeugt und gilt zehn Minuten — ein einmal
       kopierter Link nutzt danach nichts mehr. */
    if (was === "sicherungen") {
      const roh = await db(
        "galabau_sicherungen?select=id,erstellt_am,dateiname,pfad,groesse_bytes,art,inhalt" +
        "&order=erstellt_am.desc&limit=50",
      );
      const zeilen = Array.isArray(roh) ? roh as Record<string, unknown>[] : [];
      const liste = [];
      for (const z of zeilen) {
        liste.push({
          id: z.id,
          erstellt_am: z.erstellt_am,
          dateiname: z.dateiname,
          groesse_bytes: z.groesse_bytes,
          art: z.art,
          inhalt: z.inhalt,
          verweis: await sicherungVerweis(String(z.pfad)),
        });
      }
      return json({ ok: true, sicherungen: liste, behalten: SICHERUNG_BEHALTEN });
    }

    if (was === "sicherung-erstellen") {
      const r = await sicherungAblegen("manuell");
      return json({ ok: true, sicherung: r.zeile, entfernt: r.entfernt });
    }

    if (was === "sicherung-loeschen") {
      const id = String(körper.id ?? "");
      /* Kennung gegen die Form pruefen, nicht nur auf Vorhandensein:
         der Wert wandert in einen PostgREST-Filter. */
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ fehler: "ungültige Kennung" }, 400);
      const roh = await db("galabau_sicherungen?select=pfad&id=eq." + id);
      const zeile = Array.isArray(roh) && roh.length ? roh[0] as Record<string, unknown> : null;
      if (!zeile) return json({ fehler: "nicht gefunden" }, 404);
      await fetch(URL_ + "/storage/v1/object/" + SICHERUNG_EIMER, {
        method: "DELETE",
        headers: {
          apikey: DIENST,
          Authorization: "Bearer " + DIENST,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [String(zeile.pfad)] }),
      });
      await db("galabau_sicherungen?id=eq." + id, { method: "DELETE" });
      return json({ ok: true });
    }

    /* ---- Seiten-Editor: Texte speichern -------------------------------
       Steht bewusst VOR der Tabellenpruefung: der Editor arbeitet nicht
       auf einer Datenbanktabelle, sondern auf Dateien im Repository. */
    if (was === "texte-speichern") {
      if (!GH_TOKEN) {
        return json({ fehler: "kein_schreibrecht",
          hinweis: "Der Funktion fehlt der GitHub-Token." }, 501);
      }

      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) {
        return json({ fehler: "seite_nicht_freigegeben", datei }, 400);
      }

      const texte = körper.texte;
      if (!texte || typeof texte !== "object" || Array.isArray(texte)) {
        return json({ fehler: "texte_fehlen" }, 400);
      }
      const kennungen = Object.keys(texte as Record<string, unknown>);
      if (kennungen.length === 0) return json({ fehler: "nichts_zu_speichern" }, 400);
      if (kennungen.length > MAX_TEXTE) return json({ fehler: "zu_viele_texte" }, 400);

      for (const k of kennungen) {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(k)) {
          return json({ fehler: "kennung_ungueltig", kennung: k }, 400);
        }
        const w = (texte as Record<string, unknown>)[k];
        if (typeof w !== "string") return json({ fehler: "wert_kein_text", kennung: k }, 400);
        if (w.length > MAX_LAENGE) return json({ fehler: "text_zu_lang", kennung: k }, 400);
        /* Zeilenumbrueche und Steuerzeichen haben in einem Textknoten
           nichts verloren und wuerden die Datei unleserlich machen. */
        let steuer = false;
        for (let i = 0; i < w.length; i++) {
          const c = w.charCodeAt(i);
          if (c < 32 || c === 127) { steuer = true; break; }
        }
        if (steuer) {
          return json({ fehler: "steuerzeichen", kennung: k }, 400);
        }
      }

      /* Ausgangswerte, wie der Browser sie beim Oeffnen vorgefunden hat.
         Optional — ohne sie verhaelt sich der Aufruf wie bisher. */
      const vorher = (körper.vorher && typeof körper.vorher === "object" && !Array.isArray(körper.vorher))
        ? körper.vorher as Record<string, string>
        : null;

      /* Erst vollstaendig pruefen, dann schreiben. Ein Marker, den es
         nicht gibt, ist ein Fehler — nicht ein stilles Ueberspringen. */
      const stand: { branch: string; inhalt: string; sha: string }[] = [];
      for (const branch of BRANCHES) {
        const { text, sha } = await ghHole(datei, branch);
        let neu = text;
        const fehlend: string[] = [];
        const fremd: string[] = [];
        for (const k of kennungen) {
          /* Hat jemand anders diese Stelle inzwischen geaendert?
             Zwei offene Editorfenster schrieben sich sonst lautlos
             gegenseitig um: beide lesen dieselbe Datei, beide speichern,
             der zweite gewinnt — und der erste erfaehrt nie davon.
             Der Datei-SHA allein hilft hier nicht, er faellt nur auf,
             wenn BEIDE zwischen Lesen und Schreiben liegen. */
          if (vorher && Object.prototype.hasOwnProperty.call(vorher, k)) {
            const daSteht = textLesen(neu, k);
            if (daSteht !== null && daSteht !== htmlMaskieren(String(vorher[k]))) {
              fremd.push(k);
              continue;
            }
          }
          const erg = textErsetzen(neu, k, String((texte as Record<string, string>)[k]));
          if (erg === null) fehlend.push(k); else neu = erg;
        }
        if (fehlend.length) {
          return json({ fehler: "marker_nicht_gefunden", kennungen: fehlend, branch }, 409);
        }
        if (fremd.length) {
          return json({
            fehler: "inzwischen_geaendert", kennungen: fremd, branch,
            hinweis: "Diese Stellen wurden zwischenzeitlich anderswo geändert. " +
              "Bitte die Seite neu laden und noch einmal ansehen.",
          }, 409);
        }
        stand.push({ branch, inhalt: neu, sha });
      }

      /* Zwei Commits nacheinander statt einer GitHub-Action: nur so
         weiss der Editor, dass die Aenderung wirklich veroeffentlicht
         ist, und kann es dem Betreiber sagen. */
      const nachricht = "Seiten-Editor: Texte in " + datei + " geändert";
      const geschrieben: string[] = [];
      for (const s of stand) {
        try {
          await ghSchreibe(datei, s.branch, s.inhalt, s.sha, nachricht);
          geschrieben.push(s.branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschrieben.length === 0) {
            return json({ fehler: "nicht_gespeichert", grund }, 502);
          }
          /* Teilerfolg: der Arbeitsstand traegt die Aenderung, die
             veroeffentlichte Fassung nicht. Das MUSS gesagt werden —
             sonst glaubt der Betreiber, die Seite sei live geaendert. */
          return json({ ok: false, teilweise: true, geschrieben, grund,
            hinweis: "Gespeichert, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, datei, anzahl: kennungen.length, branches: geschrieben });
    }

    /* ---- Seiten-Editor: Blöcke in einer Zone --------------------------
       DER KERN DIESER AKTION: Der Server nimmt KEIN Markup entgegen. Er
       bekommt Daten, prueft sie, und erzeugt den gesamten Inhalt der Zone
       daraus neu. Damit gibt es keinen Weg, ueber einen Block Markup in
       die Seite zu bringen — auch nicht fuer jemanden mit gueltiger
       Anmeldung. */
    if (was === "bloecke-speichern") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);
      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) return json({ fehler: "seite_nicht_freigegeben", datei }, 400);

      const zone = String(körper.zone ?? "");
      if (!/^[a-z0-9-]{1,40}$/.test(zone)) return json({ fehler: "zone_ungueltig" }, 400);

      const roh = körper.bloecke;
      if (!Array.isArray(roh)) return json({ fehler: "bloecke_fehlen" }, 400);
      if (roh.length > 20) return json({ fehler: "zu_viele_bloecke" }, 400);

      /* Erzeugen, Zone setzen und Hinweiskarte schalten stehen in
         ./bloecke.js — EINE Quelle, die Deno und Node laden. Vorher lag
         die Logik hier und im Pruefskript als Nachbau; ein Nachbau prueft
         aber nur den Nachbau, und genau so ist "bloecke.length" (den Namen
         gibt es hier nicht) bis in die Live-Funktion gekommen. */
      const gebaut = bloeckeErzeugen(datei, zone, roh);
      if (!gebaut.ok) {
        const { ok: _weg, ...rest } = gebaut;
        return json(rest, 400);
      }
      const inhalt = gebaut.inhalt;

      /* Schutz gegen ein zweites Editorfenster.
         Diese Aktion erzeugt den GESAMTEN Zoneninhalt neu. Ohne Abgleich
         wuerde ein Fenster, das die Zone vor einer fremden Aenderung
         gelesen hat, deren Ergebnis lautlos ueberschreiben — und mit
         200 OK antworten. Der Blob-SHA faengt das nicht: er faellt nur
         auf, wenn sich die beiden Schreibvorgaenge ueberlappen.
         Der Editor schickt deshalb den Stand mit, den SEIN Fenster beim
         Oeffnen vorgefunden hat; daraus wird dasselbe Markup erzeugt und
         mit dem verglichen, was tatsaechlich in der Datei steht.
         Dieselbe Sicherung wie bei texte-speichern (v60). */
      let vorherInhalt: string | null = null;
      if (körper.vorher !== undefined) {
        const v = bloeckeErzeugen(datei, zone, körper.vorher);
        if (!v.ok) return json({ fehler: "vorher_ungueltig" }, 400);
        vorherInhalt = v.inhalt;
      }

      const geschriebenB: string[] = [];
      for (const branch of BRANCHES) {
        try {
          const stand = await ghHole(datei, branch);
          if (vorherInhalt !== null) {
            const jetzt = zoneInhalt(stand.text, zone);
            if (jetzt === null) return json({ fehler: "zone_nicht_gefunden", zone, branch }, 409);
            if (jetzt !== vorherInhalt) {
              return json({
                fehler: "fremde_aenderung", zone, branch,
                hinweis: "In der Zwischenzeit hat jemand anders diesen Bereich geändert.",
              }, 409);
            }
          }
          let neu = zoneSetzen(stand.text, zone, inhalt);
          if (neu === null) return json({ fehler: "zone_nicht_gefunden", zone, branch }, 409);
          /* gebaut.anzahl, nicht die Eingabe: massgeblich ist, was
             tatsaechlich in der Seite landet. */
          neu = leerhinweis(neu, zone, gebaut.anzahl === 0);
          if (neu === stand.text) { geschriebenB.push(branch); continue; }
          await ghSchreibe(datei, branch, neu, stand.sha,
            "Seiten-Editor: Blöcke in " + datei + " geändert");
          geschriebenB.push(branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschriebenB.length === 0) return json({ fehler: "nicht_gespeichert", grund }, 502);
          return json({ ok: false, teilweise: true, geschrieben: geschriebenB, grund,
            hinweis: "Gespeichert, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, datei, zone, anzahl: gebaut.anzahl, branches: geschriebenB });
    }

    /* ---- Seiten-Editor: Menü und Fußzeile -----------------------------
       Diese Datei wird VOLLSTAENDIG neu erzeugt, nicht geflickt. Sie
       liegt auf allen 14 Seiten und wird VOR den Komponenten geladen —
       ein Syntaxfehler darin nimmt jeder Seite Kopf- und Fusszeile.
       Deshalb: strenge Pruefung der Struktur, Erzeugung ueber
       JSON.stringify (keine Handarbeit an Anfuehrungszeichen), und vor
       dem Commit ein Probelauf mit new Function(). */
    if (was === "rahmen-speichern") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);

      const d = körper.texte;
      if (!d || typeof d !== "object" || Array.isArray(d)) return json({ fehler: "texte_fehlen" }, 400);
      const q = d as Record<string, unknown>;

      const fehlerhaft = (grund: string, wo?: string) =>
        json({ fehler: "rahmen_ungueltig", grund, feld: wo }, 400);

      const istText = (v: unknown, max = 200) =>
        typeof v === "string" && v.trim().length > 0 && v.length <= max &&
        ![...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

      /* Ein Verweisziel darf ausschliesslich eine Seite dieses Projekts
         sein. Ohne diese Schranke liesse sich ueber ein Menue ein
         "javascript:"-Ziel oder eine fremde Adresse in die Kopfzeile
         JEDER Seite setzen. */
      const istZiel = (v: unknown) =>
        typeof v === "string" && /^[a-z0-9-]{1,60}\.html$/.test(v);

      const liste = (wert: unknown, wo: string, maxN = 20) => {
        if (!Array.isArray(wert) || wert.length === 0 || wert.length > maxN) return null;
        const raus: { datei: string; text: string }[] = [];
        for (const e of wert) {
          if (!e || typeof e !== "object") return null;
          const x = e as Record<string, unknown>;
          if (!istZiel(x.datei) || !istText(x.text, 80)) return null;
          raus.push({ datei: String(x.datei), text: String(x.text) });
        }
        return raus;
      };

      const menue = liste(q.menue, "menue");
      if (!menue) return fehlerhaft("Menü unvollständig oder ein Ziel ist keine Seite", "menue");
      const menueMehr = liste(q.menueMehr, "menueMehr");
      if (!menueMehr) return fehlerhaft("Untermenü unvollständig", "menueMehr");

      if (!Array.isArray(q.fussSpalten) || q.fussSpalten.length < 1 || q.fussSpalten.length > 4) {
        return fehlerhaft("Fußzeilenspalten fehlen", "fussSpalten");
      }
      const fussSpalten: { titel: string; links: { datei: string; text: string }[] }[] = [];
      for (const sp of q.fussSpalten) {
        if (!sp || typeof sp !== "object") return fehlerhaft("Spalte ungültig", "fussSpalten");
        const x = sp as Record<string, unknown>;
        if (!istText(x.titel, 60)) return fehlerhaft("Spaltentitel fehlt", "fussSpalten");
        const l = liste(x.links, "links");
        if (!l) return fehlerhaft("Verweise einer Spalte unvollständig", "fussSpalten");
        fussSpalten.push({ titel: String(x.titel), links: l });
      }

      const einfach: [string, number][] = [
        ["menueMehrTitel", 60], ["knopf", 60], ["fussAbsatz", 400],
        ["fussKontaktTitel", 60], ["fussZeiten", 80], ["fussOrt", 80],
        ["fussRechts", 160], ["fussGebiet", 160],
      ];
      const rest: Record<string, string> = {};
      for (const [k, max] of einfach) {
        if (!istText(q[k], max)) return fehlerhaft("Feld fehlt oder ist zu lang", k);
        rest[k] = String(q[k]);
      }

      /* Erzeugen. JSON.stringify uebernimmt jede Maskierung von
         Anfuehrungszeichen und Backslashes — Handarbeit gibt es hier
         nicht. Nachgereicht werden nur die drei Zeichen, die in JSON
         gueltig, in JavaScript-Quelltext aber gefaehrlich sind:
         "<" (koennte ein </script> bilden, falls der Inhalt je inline
         landet) sowie U+2028/U+2029, die in aelteren Auslegungen als
         Zeilenende gelten und die Datei zerreissen wuerden. */
      const daten = {
        menue, menueMehr,
        menueMehrTitel: rest.menueMehrTitel,
        knopf: rest.knopf,
        fussAbsatz: rest.fussAbsatz,
        fussSpalten,
        fussKontaktTitel: rest.fussKontaktTitel,
        fussZeiten: rest.fussZeiten,
        fussOrt: rest.fussOrt,
        fussRechts: rest.fussRechts,
        fussGebiet: rest.fussGebiet,
      };
      const roh = JSON.stringify(daten, null, 2)
        .replace(/</g, "\\u003C")
        .split(String.fromCharCode(0x2028)).join("\\u2028")
        .split(String.fromCharCode(0x2029)).join("\\u2029");

      const inhalt = [
        "/* =====================================================================",
        "   Texte von Kopf- und Fusszeile",
        "   =====================================================================",
        "",
        "   ⚠ Diese Datei wird vom Seiten-Editor VOLLSTAENDIG neu erzeugt.",
        "   Von Hand geaenderte Kommentare oder Formatierungen ueberleben ein",
        "   Speichern nicht. Wer hier dauerhaft etwas aendern will, aendert den",
        "   Erzeuger in supabase/functions/verwaltung/index.ts.",
        "",
        "   Sie wird auf ALLEN Seiten geladen, VOR den Komponenten. Beide",
        "   fallen auf ihre eingebauten Werte zurueck, wenn hier etwas fehlt.",
        "   ===================================================================== */",
        "window.RAHMEN_TEXTE = " + roh + ";",
        "",
      ].join("\n");

      /* Letztes Gatter, in zwei Schritten — und BEWUSST OHNE den
         erzeugten Inhalt auszufuehren.

         Ein "new Function(inhalt)(…)" wuerde ihn laufen lassen, und zwar
         in genau dem Kontext, der den GitHub-Token und den
         Dienstschluessel sieht. Zwar kann wegen JSON.stringify kein Wert
         aus seinem Zeichenketten-Literal ausbrechen — aber diese Annahme
         als einzige Absicherung vor die wertvollsten Geheimnisse des
         Systems zu stellen, waere ein schlechter Tausch fuer eine
         Pruefung, die auch ohne Ausfuehrung zu haben ist.

         1. JSON.parse prueft die Daten — ohne jede Codeausfuehrung.
         2. new Function(...) OHNE Aufruf prueft nur die Syntax: der
            Rumpf wird uebersetzt, nicht ausgefuehrt. Damit faellt eine
            unbrauchbare Datei trotzdem vor dem Commit auf. */
      try {
        const zurueck = JSON.parse(roh) as Record<string, unknown>;
        if (!Array.isArray(zurueck.menue) || (zurueck.menue as unknown[]).length !== menue.length) {
          return json({ fehler: "erzeugung_fehlgeschlagen", grund: "Rundlauf stimmt nicht" }, 500);
        }
        new Function(inhalt);   // nur uebersetzen, nicht aufrufen
      } catch (e) {
        return json({ fehler: "erzeugung_fehlgeschlagen",
          grund: e instanceof Error ? e.message : String(e) }, 500);
      }

      const zielDatei = "assets/js/rahmen-texte.js";
      const geschriebenR: string[] = [];
      for (const branch of BRANCHES) {
        try {
          const stand = await ghHole(zielDatei, branch);
          if (stand.text === inhalt) { geschriebenR.push(branch); continue; }
          await ghSchreibe(zielDatei, branch, inhalt, stand.sha,
            "Seiten-Editor: Menü und Fußzeile geändert");
          geschriebenR.push(branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschriebenR.length === 0) return json({ fehler: "nicht_gespeichert", grund }, 502);
          return json({ ok: false, teilweise: true, geschrieben: geschriebenR, grund,
            hinweis: "Gespeichert, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, branches: geschriebenR });
    }

    /* ---- Seiten-Editor: Bild ersetzen ---------------------------------
       Der Browser liefert die drei Groessen fertig als WebP. Hier werden
       sie geschrieben und src/srcset/alt der Seite nachgezogen — alles in
       EINEM Commit je Zweig, sonst zeigte die Live-Seite zwischendurch
       neues Markup mit alten Bildern. */
    if (was === "bild-speichern") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);
      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) return json({ fehler: "seite_nicht_freigegeben", datei }, 400);

      const kennung = String(körper.kennung ?? "");
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(kennung)) return json({ fehler: "kennung_ungueltig" }, 400);

      /* Der Dateiname wird SERVERSEITIG gebaut, nicht uebernommen. Ein
         Name aus dem Netz waere ein Weg, irgendwohin zu schreiben. */
      const basisRoh = String(körper.basis ?? "bild").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (!basisRoh) return json({ fehler: "name_ungueltig" }, 400);
      const marke = Math.abs(
        [...(kennung + basisRoh + datei)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
      ).toString(36).slice(0, 6);
      const basis = basisRoh + "-" + marke;

      const alt = String(körper.alt ?? "").trim();
      if (!alt) return json({ fehler: "alt_leer" }, 400);
      if (alt.length > 300) return json({ fehler: "alt_zu_lang" }, 400);
      for (let i = 0; i < alt.length; i++) {
        const c = alt.charCodeAt(i);
        if (c < 32 || c === 127) return json({ fehler: "steuerzeichen" }, 400);
      }

      const roh = körper.dateien;
      if (!roh || typeof roh !== "object") return json({ fehler: "bilder_fehlen" }, 400);
      const groessen = [400, 800, 1600];
      const bilder: { pfad: string; inhalt: string; base64: true }[] = [];
      let summe = 0;
      for (const g of groessen) {
        const b64 = String((roh as Record<string, string>)[String(g)] ?? "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return json({ fehler: "bild_ungueltig", groesse: g }, 400);
        const bytes = Math.floor(b64.length * 3 / 4);
        if (bytes > 900_000) return json({ fehler: "bild_zu_gross", groesse: g }, 400);
        summe += bytes;
        bilder.push({ pfad: "assets/img/" + basis + "-" + g + ".webp", inhalt: b64, base64: true });
      }
      if (summe > 1_500_000) return json({ fehler: "bilder_zu_gross" }, 400);

      /* src, srcset und alt am markierten <img> nachziehen. */
      const bildSetzen = (html: string): string | null => {
        const re = new RegExp('<img\\b[^>]*\\sdata-ed-img="' + regexMaskieren(kennung) + '"[^>]*>');
        const m = re.exec(html);
        if (!m) return null;
        let tag = m[0];
        const src = "assets/img/" + basis + "-800.webp";
        const set = groessen.map((g) => "assets/img/" + basis + "-" + g + ".webp " + g + "w").join(", ");
        const ersetzeAttr = (t: string, name: string, wert: string) => {
          const r = new RegExp('(\\s' + name + '=")([^"]*)(")');
          return r.test(t) ? t.replace(r, (_x, a, _b, z) => a + attributMaskieren(wert) + z) : t;
        };
        tag = ersetzeAttr(tag, "src", src);
        tag = ersetzeAttr(tag, "srcset", set);
        tag = ersetzeAttr(tag, "alt", alt);
        return html.slice(0, m.index) + tag + html.slice(m.index + m[0].length);
      };

      const geschriebenBild: string[] = [];
      for (const branch of BRANCHES) {
        try {
          const { text } = await ghHole(datei, branch);
          const neu = bildSetzen(text);
          if (neu === null) return json({ fehler: "bild_nicht_gefunden", kennung, branch }, 409);
          await ghCommitMulti(
            branch,
            [...bilder, { pfad: datei, inhalt: neu }],
            "Seiten-Editor: Bild in " + datei + " ersetzt",
          );
          geschriebenBild.push(branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschriebenBild.length === 0) return json({ fehler: "nicht_gespeichert", grund }, 502);
          return json({ ok: false, teilweise: true, geschrieben: geschriebenBild, grund,
            hinweis: "Gespeichert, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, datei, basis, branches: geschriebenBild });
    }

    /* ---- Seiten-Editor: Titel und Google-Beschreibung ------------------
       Beide stehen je Seite an ZWEI Stellen: <title> spiegelt sich in
       og:title, description in og:description. Eine Aenderung muss beide
       treffen, sonst zeigt Google einen anderen Text als eine geteilte
       Vorschau in WhatsApp oder Facebook.

       "canonical" ist bewusst NICHT bearbeitbar: es steht fest im Markup
       und leitet sich aus dem Dateinamen ab. Ein Fehlklick dort nimmt
       eine Seite aus dem Suchindex — das ist kein Textfeld wert. */
    if (was === "seo-speichern") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);
      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) return json({ fehler: "seite_nicht_freigegeben", datei }, 400);

      const titel = String(körper.titel ?? "");
      const beschreibung = String(körper.beschreibung ?? "");
      if (!titel.trim()) return json({ fehler: "titel_leer" }, 400);
      if (!beschreibung.trim()) return json({ fehler: "beschreibung_leer" }, 400);
      /* Grosszuegige HARTE Grenzen. Was Google davon anzeigt, ist eine
         Frage der Empfehlung — die gibt die Oberflaeche als Ampel aus,
         nicht dieser Server. Verhindert werden soll nur Unsinn. */
      if (titel.length > 200) return json({ fehler: "titel_zu_lang" }, 400);
      if (beschreibung.length > 400) return json({ fehler: "beschreibung_zu_lang" }, 400);
      for (const w of [titel, beschreibung]) {
        for (let i = 0; i < w.length; i++) {
          const c = w.charCodeAt(i);
          if (c < 32 || c === 127) return json({ fehler: "steuerzeichen" }, 400);
        }
      }

      const vorherSeo = (körper.vorher && typeof körper.vorher === "object" && !Array.isArray(körper.vorher))
        ? körper.vorher as Record<string, string>
        : null;

      const stand: { branch: string; inhalt: string; sha: string }[] = [];
      for (const branch of BRANCHES) {
        const { text, sha } = await ghHole(datei, branch);

        /* Hat jemand anders inzwischen etwas geaendert? */
        if (vorherSeo) {
          const jetztTitel = titelLesen(text);
          const jetztBeschr = metaLesen(text, "name", "description");
          if ((jetztTitel !== null && jetztTitel !== htmlMaskieren(String(vorherSeo.titel ?? ""))) ||
              (jetztBeschr !== null && jetztBeschr !== attributMaskieren(String(vorherSeo.beschreibung ?? "")))) {
            return json({
              fehler: "inzwischen_geaendert", branch,
              hinweis: "Titel oder Beschreibung wurden zwischenzeitlich anderswo geändert. " +
                "Bitte die Seite neu laden.",
            }, 409);
          }
        }

        let neu: string | null = text;
        const schritte: [string, (h: string) => string | null][] = [
          ["title", (h) => titelSetzen(h, titel)],
          ["og:title", (h) => metaSetzen(h, "property", "og:title", titel)],
          ["description", (h) => metaSetzen(h, "name", "description", beschreibung)],
          ["og:description", (h) => metaSetzen(h, "property", "og:description", beschreibung)],
        ];
        const fehlend: string[] = [];
        for (const [name, tu] of schritte) {
          const erg = tu(neu as string);
          if (erg === null) fehlend.push(name); else neu = erg;
        }
        if (fehlend.length) return json({ fehler: "feld_nicht_gefunden", felder: fehlend, branch }, 409);
        stand.push({ branch, inhalt: neu as string, sha });
      }

      const nachricht = "Seiten-Editor: Titel und Beschreibung von " + datei + " geändert";
      const geschriebenSeo: string[] = [];
      for (const s of stand) {
        try {
          await ghSchreibe(datei, s.branch, s.inhalt, s.sha, nachricht);
          geschriebenSeo.push(s.branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschriebenSeo.length === 0) return json({ fehler: "nicht_gespeichert", grund }, 502);
          return json({ ok: false, teilweise: true, geschrieben: geschriebenSeo, grund,
            hinweis: "Gespeichert, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, datei, branches: geschriebenSeo });
    }

    /* ---- Seiten-Editor: frühere Fassungen ------------------------------
       Git haelt die Staende ohnehin. Ohne diesen Weg haette der Betreiber
       auf einer LIVE-Seite 802 aenderbare Textstellen und kein Zurueck —
       das ist der wichtigste Vertrauensbaustein des ganzen Editors. */
    if (was === "staende") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);
      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) return json({ fehler: "seite_nicht_freigegeben", datei }, 400);
      return json({ ok: true, datei, staende: await ghStaende(datei, BRANCHES[0]) });
    }

    if (was === "stand-zurueck") {
      if (!GH_TOKEN) return json({ fehler: "kein_schreibrecht" }, 501);
      const datei = String(körper.datei ?? "");
      if (!SEITEN_ERLAUBT.has(datei)) return json({ fehler: "seite_nicht_freigegeben", datei }, 400);

      /* ⚠ Die Kennung MUSS an die Liste gebunden werden, die der Server
         selbst angeboten hat. Eine reine Formpruefung genuegt hier NICHT:

         "texte-speichern" ist eng — es kann nur maskierten Text zwischen
         zwei Tags setzen. Dieser Zweig dagegen schreibt den geholten
         Dateiinhalt WOERTLICH zurueck. Ohne Bindung liesse sich damit
         jede Fassung einsetzen, die im Objektnetz dieses oeffentlichen
         Repositories erreichbar ist — auch eine aus einem Fork, dessen
         Commit ueber refs/pull/N/head im Ursprungsrepository landet.
         Eine so eingeschleuste Datei traegt ihre eigene CSP im <meta>
         und koennte fremdes Skript auf einer Seite mit Kontakt- und
         Bewerbungsformular ausliefern.

         Die Markerzaehlung unten ist KEIN Schutz dagegen: 234 Vorkommen
         von data-ed=" lassen sich in einem Kommentar unterbringen. Sie
         bleibt als Bedienhilfe, nicht als Sicherung. */
      const sha = String(körper.sha ?? "");
      if (!/^[0-9a-f]{40}$/.test(sha)) return json({ fehler: "sha_ungueltig" }, 400);

      const angeboten = await ghStaende(datei, BRANCHES[0]);
      if (!angeboten.some((s) => s.sha === sha)) {
        return json({ fehler: "stand_nicht_angeboten",
          hinweis: "Diese Fassung gehört nicht zum Verlauf dieser Seite." }, 400);
      }

      const alt = await ghHole(datei, sha);

      /* Sicherung gegen einen Fussangel: Faellt der Betreiber auf einen
         Stand VOR der Editor-Vorbereitung zurueck, fehlen der Datei die
         data-ed-Marker — die Seite liesse sich danach nicht mehr
         bearbeiten, und er saehe nur, dass "nichts mehr geht". Deshalb
         zaehlen und ablehnen statt es geschehen zu lassen. */
      const zaehle = (t: string) => (t.match(/data-ed="/g) ?? []).length;
      const jetzt = await ghHole(datei, BRANCHES[0]);
      if (zaehle(alt.text) < zaehle(jetzt.text)) {
        return json({
          fehler: "stand_zu_alt",
          hinweis: "Diese Fassung stammt aus der Zeit vor dem Seiten-Editor und ließe sich danach nicht mehr bearbeiten.",
          markerAlt: zaehle(alt.text), markerJetzt: zaehle(jetzt.text),
        }, 409);
      }

      /* Als NEUER Commit zurueckschreiben, nicht zurueckspulen: der
         Verlauf bleibt vollstaendig, und der Schritt selbst laesst sich
         genauso wieder rueckgaengig machen. */
      const nachricht = "Seiten-Editor: " + datei + " auf einen früheren Stand zurückgesetzt";
      const geschrieben: string[] = [];
      for (const branch of BRANCHES) {
        try {
          const stand = await ghHole(datei, branch);
          if (stand.text === alt.text) { geschrieben.push(branch); continue; }
          await ghSchreibe(datei, branch, alt.text, stand.sha, nachricht);
          geschrieben.push(branch);
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e);
          if (geschrieben.length === 0) return json({ fehler: "nicht_gespeichert", grund }, 502);
          return json({ ok: false, teilweise: true, geschrieben, grund,
            hinweis: "Zurückgesetzt, aber nicht veröffentlicht." }, 502);
        }
      }
      return json({ ok: true, datei, sha, branches: geschrieben });
    }

    if (!tabelle) return json({ fehler: "unbekannter Bereich" }, 400);

    if (was === "liste") {
      /* Eine mehr holen als angezeigt wird: nur so laesst sich sagen, ob
         es noch weitere gibt. Eine stillschweigende Kappung sieht aus wie
         Vollstaendigkeit — der Betreiber wuerde nie erfahren, dass er
         nicht alles sieht. */
      const zeilen = await db(
        tabelle + "?select=*&order=eingegangen_am.desc&limit=" + (LISTE_MAX + 1),
      );
      const alle = Array.isArray(zeilen) ? zeilen : [];
      const gekappt = alle.length > LISTE_MAX;
      return json({ ok: true, zeilen: alle.slice(0, LISTE_MAX), gekappt, grenze: LISTE_MAX });
    }

    if (was === "aendern") {
      const id = String(körper.id ?? "");
      /* Nur diese drei Felder duerfen ueberhaupt geschrieben werden —
         alles andere aus dem Aufruf wird verworfen. */
      const felder: Record<string, unknown> = {};
      if (körper.status != null) {
        const s = String(körper.status);
        if (!["neu", "in_arbeit", "erledigt"].includes(s)) return json({ fehler: "Status ungültig" }, 400);
        felder.status = s;
      }
      if (körper.notiz != null) felder.notiz = String(körper.notiz).slice(0, 2000);
      if (körper.archiviert != null) felder.archiviert = !!körper.archiviert;
      if (!id || !Object.keys(felder).length) return json({ fehler: "nichts zu ändern" }, 400);
      await db(tabelle + "?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        body: JSON.stringify(felder),
        headers: { Prefer: "return=minimal" },
      });
      return json({ ok: true });
    }

    if (was === "loeschen") {
      const id = String(körper.id ?? "");
      if (!id) return json({ fehler: "keine Kennung" }, 400);

      /* Den Dateipfad selbst nachschlagen statt ihn vom Browser
         entgegenzunehmen — sonst liesse sich ueber diesen Weg eine
         beliebige fremde Datei verschieben. */
      const dateien: string[] = [];
      if (bereich === "bewerbungen") {
        const treffer = await db(
          tabelle + "?select=datei,dateien&id=eq." + encodeURIComponent(id) + "&limit=1",
        );
        const zeile = Array.isArray(treffer) ? treffer[0] : null;
        if (Array.isArray(zeile?.dateien)) {
          for (const e of zeile.dateien as Record<string, unknown>[]) {
            const p = String(e?.pfad ?? "");
            if (p) dateien.push(p);
          }
        }
        if (!dateien.length && zeile?.datei) dateien.push(String(zeile.datei));
      }

      await db(tabelle + "?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });

      /* Erst in den Papierkorbbereich, damit "Rueckgaengig" auch die
         Unterlagen zurueckholen kann. Scheitert das, ist der Datensatz
         trotzdem fort — das ist der wichtigere Teil. */
      for (const datei of dateien) {
        if (!datei.startsWith("eingang/")) continue;
        try {
          await speicher("object/move", {
            method: "POST",
            body: JSON.stringify({
              bucketId: EIMER,
              sourceKey: datei,
              destinationKey: datei.replace(/^eingang\//, "papierkorb/"),
            }),
          });
        } catch (e) {
          console.error("Datei verschieben:", e instanceof Error ? e.message : e);
        }
      }
      return json({ ok: true });
    }

    /* Zeitlich begrenzter Link auf den Lebenslauf. Der Browser bekommt
       nie dauerhaften Zugriff; der Link gilt zwei Minuten und wird bei
       jedem Klick neu erzeugt. */
    if (was === "dateilink") {
      const id = String(körper.id ?? "");
      if (!id || bereich !== "bewerbungen") return json({ fehler: "keine Kennung" }, 400);
      const treffer = await db(
        tabelle + "?select=datei,datei_name,dateien&id=eq." + encodeURIComponent(id) + "&limit=1",
      );
      const zeile = Array.isArray(treffer) ? treffer[0] : null;
      /* Welche der Unterlagen? Der Browser schickt die Nummer, nicht den
         Pfad — der Pfad wird hier aus der Zeile geholt. Nur so kann ueber
         diesen Weg keine fremde Datei unterschrieben werden. */
      const nr = Number(körper.nr ?? 0);
      const liste: string[] = Array.isArray(zeile?.dateien)
        ? (zeile.dateien as Record<string, unknown>[])
            .map((e) => String(e?.pfad ?? "")).filter(Boolean)
        : [];
      if (!liste.length && zeile?.datei) liste.push(String(zeile.datei));
      const datei = Number.isInteger(nr) && nr >= 0 && nr < liste.length ? liste[nr] : "";
      if (!datei.startsWith("eingang/")) return json({ fehler: "kein Anhang" }, 404);
      const unterschrift = await speicher("object/sign/" + EIMER + "/" + datei, {
        method: "POST",
        body: JSON.stringify({ expiresIn: 120 }),
      });
      const pfad = String(unterschrift?.signedURL ?? "");
      if (!pfad) return json({ fehler: "Link nicht erzeugt" }, 500);
      return json({ ok: true, link: URL_ + "/storage/v1" + pfad });
    }

    /* Zurueckholen eines gerade geloeschten Eintrags. Der Browser hat ihn
       noch im Speicher und schickt ihn zurueck; die Kennung bleibt
       dieselbe, damit Notiz, Status und Eingangszeit erhalten bleiben.

       Bewusst KEIN Papierkorb in der Datenbank: "endgueltig loeschen"
       soll auch endgueltig heissen. Zurueckholen geht deshalb nur, solange
       die Seite offen ist — danach ist der Eintrag wirklich fort. */
    if (was === "zurueckholen") {
      const roh = körper.satz;
      if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
        return json({ fehler: "kein Datensatz" }, 400);
      }
      const erlaubt = SPALTEN[bereich] ?? [];
      const satz: Record<string, unknown> = {};
      for (const s of erlaubt) {
        const w = (roh as Record<string, unknown>)[s];
        if (w !== undefined) satz[s] = w;
      }
      if (!satz.id) return json({ fehler: "keine Kennung" }, 400);
      await db(tabelle, {
        method: "POST",
        body: JSON.stringify(satz),
        headers: { Prefer: "return=minimal" },
      });

      /* Den Lebenslauf aus dem Papierkorbbereich zurueckschieben. Klappt
         das nicht (etwa weil schon aufgeraeumt wurde), steht der
         Datensatz trotzdem wieder da — der Anhang fehlt dann, und die
         Verwaltung sagt das, statt einen toten Link anzubieten. */
      let anhang = true;
      const pfade: string[] = [];
      if (Array.isArray(satz.dateien)) {
        for (const e of satz.dateien as Record<string, unknown>[]) {
          const p = String(e?.pfad ?? "");
          if (p) pfade.push(p);
        }
      }
      if (!pfade.length && satz.datei) pfade.push(String(satz.datei));
      /* Jede einzeln zurueckschieben. Klappt EINE nicht, gilt der Anhang
         als unvollstaendig und die Verweise werden entfernt — lieber gar
         kein Link als ein toter. */
      for (const pfad of pfade) {
        if (!pfad.startsWith("eingang/")) continue;
        try {
          await speicher("object/move", {
            method: "POST",
            body: JSON.stringify({
              bucketId: EIMER,
              sourceKey: pfad.replace(/^eingang\//, "papierkorb/"),
              destinationKey: pfad,
            }),
          });
        } catch (e) {
          anhang = false;
          console.error("Datei zurueckschieben:", e instanceof Error ? e.message : e);
        }
      }
      if (!anhang) {
          try {
            await db(tabelle + "?id=eq." + encodeURIComponent(String(satz.id)), {
              method: "PATCH",
              body: JSON.stringify({ datei: null, dateien: [] }),
              headers: { Prefer: "return=minimal" },
            });
          } catch { /* dann bleibt der Verweis stehen, der Link meldet 404 */ }
      }
      return json({ ok: true, anhang });
    }

    return json({ fehler: "unbekannter Auftrag" }, 400);
  } catch (e) {
    /* Keine Innereien nach aussen geben. */
    console.error("verwaltung:", e instanceof Error ? e.message : e);
    return json({ fehler: "Serverfehler" }, 500);
  }
});
