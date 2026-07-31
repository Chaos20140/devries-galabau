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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

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

  const wer = await herkunftHash(req);

  /* Erst die Sperre, DANN der Vergleich. Diese Reihenfolge ist der Kern:
     oberhalb der Grenze wird gar nicht mehr geprueft, ein paralleler
     Versuch bringt also nichts. */
  const bis = gesperrt.get(wer) ?? 0;
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
  try {
    const antwort = await db("rpc/verwaltung_versuch", {
      method: "POST",
      body: JSON.stringify({ p_herkunft: wer }),
    });
    stand = typeof antwort === "number" ? antwort : null;
  } catch { /* unten konservativ behandelt */ }

  if (stand === null || stand > GRENZE) {
    /* Scheitert die Zaehlung, wird abgewiesen statt durchgelassen. Sonst
       waere ein Ausfall der Zaehlung der bequemste Weg an ihr vorbei. */
    gesperrt.set(wer, Date.now() + 60_000);
    return json(zuViel, 429, { "Retry-After": "900" });
  }

  if (!gleich(String(körper.passwort ?? ""), PASSWORT)) {
    /* Zusaetzlich zur Grenze: jeder Fehlversuch kostet Zeit. Das bremst
       auch die Versuche UNTERHALB der Grenze. */
    const warten = Math.min(WARTE_MAX, 900 * Math.pow(1.6, Math.max(0, stand - 1)));
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
      const zaehl = async (t: string) => {
        const r = await db(t + "?select=id&status=eq.neu&archiviert=is.false");
        return Array.isArray(r) ? r.length : 0;
      };
      return json({
        ok: true,
        neu: { anfragen: await zaehl(TABELLEN.anfragen), bewerbungen: await zaehl(TABELLEN.bewerbungen) },
      });
    }

    if (!tabelle) return json({ fehler: "unbekannter Bereich" }, 400);

    if (was === "liste") {
      const zeilen = await db(tabelle + "?select=*&order=eingegangen_am.desc&limit=500");
      return json({ ok: true, zeilen });
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
      await db(tabelle + "?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      return json({ ok: true });
    }

    return json({ fehler: "unbekannter Auftrag" }, 400);
  } catch (e) {
    /* Keine Innereien nach aussen geben. */
    console.error("verwaltung:", e instanceof Error ? e.message : e);
    return json({ fehler: "Serverfehler" }, 500);
  }
});
