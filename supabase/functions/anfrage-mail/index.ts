/* =====================================================================
   anfrage-mail — benachrichtigt per E-Mail ueber eine neue Anfrage.

   Ausgeloest wird die Funktion von einem Trigger auf
   public.galabau_anfragen (siehe supabase/webhook.sql). Sie verschickt
   ueber das eigene Postfach des Betriebs; es kommt kein weiterer
   Dienstleister ins Spiel.

   Zugangsdaten stehen ausschliesslich in den Secrets des Projekts und
   werden nie im Browser ausgeliefert. Gesetzt werden sie vom Betreiber
   selbst, siehe SUPABASE.md.

   ⚠ Die Funktion laeuft ohne JWT-Pruefung, damit der Trigger sie ohne
   hinterlegten Dienstschluessel aufrufen kann. Geschuetzt ist sie
   stattdessen ueber ein gemeinsames Geheimnis im Kopf x-anfrage-token.
   Ohne dieses Geheimnis antwortet sie 401 und verschickt nichts —
   sonst koennte jeder ueber die oeffentliche Adresse Mails ausloesen.
   ===================================================================== */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { html, text, type Feld } from "./vorlage.ts";
import { LOGO_BASE64, LOGO_CID, LOGO_DATEI, LOGO_TYP } from "./logo.ts";

const env = (k: string, fallback = "") => Deno.env.get(k) ?? fallback;

const TOKEN = env("ANFRAGE_TOKEN");
const SMTP_HOST = env("SMTP_HOST", "smtp.strato.de");
const SMTP_PORT = Number(env("SMTP_PORT", "465"));
const SMTP_USER = env("SMTP_USER");
const SMTP_PASS = env("SMTP_PASS");
const MAIL_TO = env("MAIL_TO", "info@devries-galabau.de");
const MAIL_FROM = env("MAIL_FROM", SMTP_USER);

/* Zeilenumbrueche aus allem entfernen, was in einen Kopf wandert.
   Ohne das koennte ein Absender ueber "Name\r\nBcc: ..." eigene
   Kopfzeilen einschleusen und die Mail an Dritte umleiten. */
function kopfsicher(wert: unknown, max = 200): string {
  return String(wert ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/* Im Textkoerper sind Umbrueche erlaubt, nur die Laenge wird begrenzt. */
function textsicher(wert: unknown, max = 5000): string {
  return String(wert ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

/* Betreffzeilen mit Umlaut regelkonform kodieren (RFC 2047).

   denomailer packt bei einem einzigen Zeichen ausserhalb von ASCII den
   GESAMTEN Betreff samt Leerzeichen in EIN =?utf-8?Q?...?=. Ein
   encoded-word darf aber kein Leerzeichen enthalten; strenge Empfaenger
   zeigen dann den Rohtext ("=?utf-8?Q?Anfrage_Gartenpflege..."). Ausserdem
   bricht denomailer ab 74 Zeichen mitten im encoded-word um.

   Deshalb kodieren wir selbst: mehrere encoded-words, jedes kurz genug,
   getrennt durch ein Leerzeichen. Nach RFC 2047 werden benachbarte
   encoded-words ohne das trennende Leerzeichen zusammengesetzt. Ist der
   Text reines ASCII, bleibt er unangetastet — dann sieht denomailer
   nichts zu kodieren und reicht ihn durch. */
function betreffKodiert(text: string): string {
  if (!/[^\x20-\x7E]/.test(text)) return text;
  const enc = new TextEncoder();
  const teile: string[] = [];
  let zeichen: string[] = [];
  let bytes = 0;
  const abschliessen = () => {
    if (!zeichen.length) return;
    const b64 = btoa(String.fromCharCode(...enc.encode(zeichen.join(""))));
    teile.push("=?UTF-8?B?" + b64 + "?=");
    zeichen = [];
    bytes = 0;
  };
  /* 45 Bytes ergeben 60 Base64-Zeichen; mit "=?UTF-8?B?" und "?=" bleibt
     das encoded-word unter den erlaubten 75 Zeichen. Getrennt wird an
     Zeichengrenzen, damit kein Mehrbyte-Zeichen zerrissen wird. */
  for (const z of text) {
    const n = enc.encode(z).length;
    if (bytes + n > 45) abschliessen();
    zeichen.push(z);
    bytes += n;
  }
  abschliessen();
  return teile.join(" ");
}

/* Zeitpunkt in der Schreibweise, die der Empfaenger erwartet. Vorher stand
   der rohe UTC-Zeitstempel aus der Datenbank in der Mail
   ("2026-07-31T08:14:22.517+00:00") — im Sommer zwei Stunden daneben. */
function zeitpunkt(wert: unknown): string {
  const s = String(wert ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 40);
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d) + " Uhr";
}

/* Vergleich ohne fruehen Abbruch, damit die Laufzeit nichts verraet. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const zeile = (bez: string, wert: string) => (wert ? `${bez}: ${wert}\n` : "");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("nur POST", { status: 405 });

  if (!TOKEN || !gleich(req.headers.get("x-anfrage-token") ?? "", TOKEN)) {
    /* Bewusst ohne Begruendung — nichts ueber die Einrichtung verraten. */
    return new Response("nicht berechtigt", { status: 401 });
  }
  if (!SMTP_USER || !SMTP_PASS) {
    console.error("SMTP_USER oder SMTP_PASS fehlen — es wurde nichts verschickt.");
    return new Response("nicht eingerichtet", { status: 503 });
  }

  let satz: Record<string, unknown>;
  try {
    const rumpf = await req.json();
    satz = rumpf?.record ?? rumpf;
  } catch {
    return new Response("kein gueltiges JSON", { status: 400 });
  }

  const name = kopfsicher(satz.name, 120);
  const email = kopfsicher(satz.email, 200);
  const betreff = kopfsicher(satz.betreff, 160) || "Neue Anfrage über die Website";
  /* Nur eine plausible Adresse darf in Reply-To. */
  const antwortAn = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";

  /* Welche Tabelle den Trigger ausgeloest hat — der Webhook schickt sie mit. */
  const quelleTab = String(satz.__tabelle ?? "").includes("bewerbung") ||
    satz.stelle != null || satz.verfuegbar_ab != null ? "bewerbung" : "anfrage";

  const felder: Feld[] = quelleTab === "bewerbung"
    ? [
        ["Name", name],
        ["E-Mail", email],
        ["Telefon", kopfsicher(satz.telefon, 60)],
        ["Stelle", kopfsicher(satz.stelle, 80)],
        ["Verfügbar ab", kopfsicher(satz.verfuegbar_ab, 60)]
      ]
    : [
        ["Seite", kopfsicher(satz.quelle, 60)],
        ["Name", name],
        ["E-Mail", email],
        ["Telefon", kopfsicher(satz.telefon, 60)],
        ["Ort", kopfsicher(satz.ort, 120)],
        ["Auftraggeber", kopfsicher(satz.art, 40)],
        ["Bereich", kopfsicher(satz.bereich, 60)],
        ["Zeitraum", kopfsicher(satz.zeitraum, 120)]
      ];

  const titel = quelleTab === "bewerbung" ? "Neue Bewerbung" : "Neue Anfrage";
  const vorspann = quelleTab === "bewerbung"
    ? "Über das Bewerbungsformular auf der Website ist eine Bewerbung eingegangen."
    : "Über das Formular auf der Website ist eine neue Anfrage eingegangen.";
  const eingegangen = zeitpunkt(satz.eingegangen_am);
  const nachricht = textsicher(satz.nachricht);

  const koerperHtml = html({
    art: quelleTab === "bewerbung" ? "bewerbung" : "anfrage",
    titel, vorspann, felder, nachricht, antwortAn, eingegangen
  });
  const koerperText = text({ titel, felder, nachricht, eingegangen });

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  try {
    await client.send({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: antwortAn || undefined,
      /* Betreff des Absenders bevorzugen, er ist aussagekraeftiger. */
      /* Selbst kodiert — siehe betreffKodiert(). Ohne das macht
         denomailer aus einem Betreff mit Umlaut ein einziges
         encoded-word samt Leerzeichen, was nicht regelkonform ist. */
      subject: betreffKodiert(`${betreff || titel}: ${name || "ohne Namen"}`),
      /* Beides mitschicken: wer HTML abgeschaltet hat, bekommt den Text. */
      content: koerperText,
      html: koerperHtml,
      /* Das Logo reist als Teil der Nachricht mit und wird im HTML ueber
         cid: angesprochen. Ein Verweis auf die Website waere in den
         meisten Postfaechern zunaechst ein leerer Kasten — entfernte
         Bilder sind dort standardmaessig blockiert. */
      attachments: [{
        contentType: LOGO_TYP,
        filename: LOGO_DATEI,
        encoding: "base64",
        content: LOGO_BASE64,
        contentID: LOGO_CID,
      }],
    });
    return new Response("verschickt", { status: 200 });
  } catch (fehler) {
    /* Der Datensatz liegt bereits in der Tabelle — die Anfrage ist also
       nicht verloren, auch wenn der Versand scheitert. Sie taucht in der
       Verwaltung auf und kann von Hand beantwortet werden. */
    const grund = fehler instanceof Error ? fehler.message : String(fehler);
    console.error("Versand fehlgeschlagen:", grund);
    /* Der Grund geht nur an den Aufrufer zurueck. Das ist der Trigger, und
       dessen Antwort landet in net._http_response — ausschliesslich ueber
       service_role lesbar. Deshalb darf hier die Serverantwort stehen: sie
       ist bei der Fehlersuche das Einzige, was wirklich weiterhilft. */
    return new Response("Versand fehlgeschlagen: " + grund.slice(0, 200), { status: 502 });
  } finally {
    try { await client.close(); } catch { /* Verbindung war schon zu */ }
  }
});
