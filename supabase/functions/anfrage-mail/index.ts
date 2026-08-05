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
import { html, text } from "./vorlage.mjs";
/* Ein Feld ist [Bezeichnung, Wert] — die Vorlage ist reines
   JavaScript, damit sie sich pruefen laesst (siehe vorlage.mjs). */
type Feld = [string, unknown];
import { LOGO_BASE64, LOGO_CID, LOGO_DATEI, LOGO_TYP } from "./logo.ts";
import { betreffAscii } from "./betreff.mjs";
import { ohneRandleerzeichen, dateinameSicher } from "./qp.mjs";

const env = (k: string, fallback = "") => Deno.env.get(k) ?? fallback;

const TOKEN = env("ANFRAGE_TOKEN");
const SMTP_HOST = env("SMTP_HOST", "smtp.strato.de");
const SMTP_PORT = Number(env("SMTP_PORT", "465"));
const SMTP_USER = env("SMTP_USER");
const SMTP_PASS = env("SMTP_PASS");
const MAIL_TO = env("MAIL_TO", "info@devries-galabau.de");
const MAIL_FROM = env("MAIL_FROM", SMTP_USER);
/* Von Supabase automatisch gesetzt — kein zusaetzliches Secret noetig. */
const PROJEKT_URL = env("SUPABASE_URL");
const DIENSTSCHLUESSEL = env("SUPABASE_SERVICE_ROLE_KEY");
const EIMER = "bewerbungen";
/* Groesser haengen wir nicht an — der Betreiber findet die Datei dann
   weiterhin in der Verwaltung. Der Speicher laesst ohnehin nur 5 MB zu. */
const MAX_ANHANG = 8 * 1024 * 1024;

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

/* Den Lebenslauf aus dem Speicher holen, damit er der Benachrichtigung
   beiliegt. Ohne das bekaeme der Betreiber eine Mail "Neue Bewerbung",
   in der die Bewerbungsunterlage nicht einmal erwaehnt wird.

   Der Pfad kommt aus der Zeile, die den Trigger ausgeloest hat. Er wird
   trotzdem STRENG geprueft: Was ueber die Leitung kommt, ist nie
   vertrauenswuerdig — auch nicht, wenn es aus der eigenen Datenbank zu
   stammen scheint. Nur "eingang/<kennung>.pdf" ist erlaubt, also genau
   das Muster, unter dem das Formular ablegt. Damit sind Pfadwechsel
   ("../"), andere Eimer und andere Dateiarten ausgeschlossen. */
const PFAD_MUSTER = /^eingang\/[0-9a-fA-F-]{36}\.pdf$/;

async function lebenslaufHolen(
  pfad: string,
): Promise<{ base64: string; bytes: number } | null> {
  if (!PFAD_MUSTER.test(pfad)) return null;
  if (!PROJEKT_URL || !DIENSTSCHLUESSEL) return null;
  const antwort = await fetch(
    PROJEKT_URL + "/storage/v1/object/" + EIMER + "/" + pfad,
    {
      headers: {
        Authorization: "Bearer " + DIENSTSCHLUESSEL,
        apikey: DIENSTSCHLUESSEL,
      },
    },
  );
  if (!antwort.ok) {
    console.error("Lebenslauf nicht abrufbar:", antwort.status);
    return null;
  }
  const roh = new Uint8Array(await antwort.arrayBuffer());
  if (!roh.length || roh.length > MAX_ANHANG) {
    console.error("Lebenslauf uebersprungen, Groesse:", roh.length);
    return null;
  }
  /* In Bloecken umwandeln — String.fromCharCode(...) mit einigen
     hunderttausend Argumenten sprengt den Aufrufstapel. */
  let binaer = "";
  for (let i = 0; i < roh.length; i += 0x8000) {
    binaer += String.fromCharCode(...roh.subarray(i, i + 0x8000));
  }
  return { base64: btoa(binaer), bytes: roh.length };
}

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
  /* Bewusst ohne Umlaut formuliert ("von der" statt "ueber die"): Dieser
     Text landet im Betreff, und dort wird umgeschrieben. So sieht die
     Vorgabe nicht nach Umschrift aus. */
  const betreff = kopfsicher(satz.betreff, 160) || "Neue Anfrage von der Website";
  /* Nur eine plausible Adresse darf in Reply-To. */
  const antwortAn = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";

  /* Welche Tabelle den Trigger ausgeloest hat — der Webhook schickt sie mit. */
  const quelleTab = String(satz.__tabelle ?? "").includes("bewerbung") ||
    satz.stelle != null || satz.verfuegbar_ab != null ? "bewerbung" : "anfrage";

  /* Welche Unterlagen liegen an? "dateien" bevorzugen, auf die alten
     Einzelspalten zurueckfallen — es gibt Zeilen aus der Zeit vor der
     Mehrfach-Auswahl, die nur sie tragen. */
  const unterlagen: { pfad: string; name: string }[] = [];
  if (quelleTab === "bewerbung") {
    const liste = Array.isArray(satz.dateien) ? satz.dateien : [];
    for (const e of liste) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      const pfad = kopfsicher(x.pfad, 200);
      if (!pfad) continue;
      unterlagen.push({ pfad, name: dateinameSicher(kopfsicher(x.name, 200)) });
    }
    if (!unterlagen.length) {
      const alt = kopfsicher(satz.datei, 200);
      if (alt) {
        unterlagen.push({ pfad: alt, name: dateinameSicher(kopfsicher(satz.datei_name, 200)) });
      }
    }
  }
  /* Steht auch dann in der Mail, wenn ein Anhang nicht mitkonnte — dann
     weiss der Betreiber wenigstens, dass es die Unterlage gibt. */
  const unterlagenZeile = unterlagen.map((u) => u.name).join(", ");

  const felder: Feld[] = quelleTab === "bewerbung"
    ? [
        ["Name", name],
        ["E-Mail", email],
        ["Telefon", kopfsicher(satz.telefon, 60)],
        ["Stelle", kopfsicher(satz.stelle, 80)],
        ["Verfügbar ab", kopfsicher(satz.verfuegbar_ab, 60)],
        ["Unterlagen", unterlagenZeile]
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

  /* Der Lebenslauf gehoert in die Mail, nicht nur in die Verwaltung.
     Scheitert der Abruf, wird die Mail trotzdem verschickt — sie ist dann
     immer noch die Benachrichtigung, und die Datei liegt weiterhin im
     Speicher. Eine Bewerbung darf nicht daran scheitern, dass ein Anhang
     nicht geladen werden konnte. */
  /* Nacheinander holen und dabei die Gesamtgroesse mitzaehlen. Was nicht
     mehr hineinpasst oder sich nicht abrufen laesst, wird uebersprungen —
     die Mail geht trotzdem raus, und der Name steht in der Tabelle.
     Eine Bewerbung darf nicht daran scheitern, dass ein Anhang klemmt. */
  const anhaenge: { name: string; base64: string }[] = [];
  let anhangSumme = 0;
  for (const u of unterlagen.slice(0, 5)) {
    if (anhangSumme >= MAX_ANHANG) break;
    const geholt = await lebenslaufHolen(u.pfad).catch((e) => {
      console.error("Unterlage nicht abrufbar:", e);
      return null;
    });
    if (!geholt) continue;
    if (anhangSumme + geholt.bytes > MAX_ANHANG) {
      console.error("Unterlage uebersprungen, Summe zu gross:", u.name);
      continue;
    }
    anhangSumme += geholt.bytes;
    anhaenge.push({ name: u.name || "Unterlage.pdf", base64: geholt.base64 });
  }

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
      /* Reines ASCII — siehe betreffAscii(). Alles andere zerlegt
         denomailer 1.6.0 in einen kaputten Kopfblock. */
      subject: betreffAscii(`${betreff || titel}: ${name || "ohne Namen"}`),
      /* Beides mitschicken: wer HTML abgeschaltet hat, bekommt den Text. */
      /* ohneRandleerzeichen: sonst erzeugt denomailer sichtbare "=20"
         im Text — die Begruendung steht in qp.mjs. */
      content: ohneRandleerzeichen(koerperText),
      html: ohneRandleerzeichen(koerperHtml),
      /* Das Logo reist als Teil der Nachricht mit und wird im HTML ueber
         cid: angesprochen. Ein Verweis auf die Website waere in den
         meisten Postfaechern zunaechst ein leerer Kasten — entfernte
         Bilder sind dort standardmaessig blockiert. */
      attachments: [
        {
          contentType: LOGO_TYP,
          filename: LOGO_DATEI,
          encoding: "base64" as const,
          content: LOGO_BASE64,
          contentID: LOGO_CID,
        },
        /* Alle Unterlagen, die geholt werden konnten. Konnte eine nicht
           mitkommen, steht ihr Name trotzdem in der Tabelle der Mail. */
        ...anhaenge.map((a) => ({
          contentType: "application/pdf",
          filename: a.name,
          encoding: "base64" as const,
          content: a.base64,
        })),
      ],
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
