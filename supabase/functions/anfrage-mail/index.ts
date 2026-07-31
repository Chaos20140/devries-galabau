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
  const eingegangen = kopfsicher(satz.eingegangen_am, 40);
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
      subject: `${betreff || titel}: ${name || "ohne Namen"}`,
      /* Beides mitschicken: wer HTML abgeschaltet hat, bekommt den Text. */
      content: koerperText,
      html: koerperHtml,
    });
    return new Response("verschickt", { status: 200 });
  } catch (fehler) {
    /* Der Datensatz liegt bereits in der Tabelle — die Anfrage ist also
       nicht verloren, auch wenn der Versand scheitert. */
    console.error("Versand fehlgeschlagen:", fehler instanceof Error ? fehler.message : fehler);
    return new Response("Versand fehlgeschlagen", { status: 502 });
  } finally {
    try { await client.close(); } catch { /* Verbindung war schon zu */ }
  }
});
