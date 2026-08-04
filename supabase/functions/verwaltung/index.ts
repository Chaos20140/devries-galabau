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
    "datei", "datei_name",
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
  /* Der erste Eintrag in x-forwarded-for ist der urspruengliche Absender.
     Er ist faelschbar — deshalb ist die Grenze je Herkunft auch nur die
     erste Verteidigungslinie und nicht der einzige Schutz: das Passwort
     wird weiterhin serverseitig geprueft, jeder Fehlversuch kostet
     zusaetzlich Wartezeit, und ohne Treffer gibt es keine Daten. */
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff && xff.trim()) return xff.split(",")[0].trim();
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

      /* Erst vollstaendig pruefen, dann schreiben. Ein Marker, den es
         nicht gibt, ist ein Fehler — nicht ein stilles Ueberspringen. */
      const stand: { branch: string; inhalt: string; sha: string }[] = [];
      for (const branch of BRANCHES) {
        const { text, sha } = await ghHole(datei, branch);
        let neu = text;
        const fehlend: string[] = [];
        for (const k of kennungen) {
          const erg = textErsetzen(neu, k, String((texte as Record<string, string>)[k]));
          if (erg === null) fehlend.push(k); else neu = erg;
        }
        if (fehlend.length) {
          return json({ fehler: "marker_nicht_gefunden", kennungen: fehlend, branch }, 409);
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

      /* Der Stand kommt aus dem Netz — nur echte Commit-Kennungen. */
      const sha = String(körper.sha ?? "");
      if (!/^[0-9a-f]{7,40}$/.test(sha)) return json({ fehler: "sha_ungueltig" }, 400);

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
      let datei = "";
      if (bereich === "bewerbungen") {
        const treffer = await db(
          tabelle + "?select=datei&id=eq." + encodeURIComponent(id) + "&limit=1",
        );
        if (Array.isArray(treffer) && treffer[0]?.datei) datei = String(treffer[0].datei);
      }

      await db(tabelle + "?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });

      /* Erst in den Papierkorbbereich, damit "Rueckgaengig" auch den
         Lebenslauf zurueckholen kann. Scheitert das, ist der Datensatz
         trotzdem fort — das ist der wichtigere Teil. */
      if (datei.startsWith("eingang/")) {
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
        tabelle + "?select=datei,datei_name&id=eq." + encodeURIComponent(id) + "&limit=1",
      );
      const datei = Array.isArray(treffer) && treffer[0]?.datei ? String(treffer[0].datei) : "";
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
      const pfad = String(satz.datei ?? "");
      if (pfad.startsWith("eingang/")) {
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
          try {
            await db(tabelle + "?id=eq." + encodeURIComponent(String(satz.id)), {
              method: "PATCH",
              body: JSON.stringify({ datei: null }),
              headers: { Prefer: "return=minimal" },
            });
          } catch { /* dann bleibt der Verweis stehen, der Link meldet 404 */ }
        }
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
