/* =====================================================================
   Mail-Vorlagen — de Vries Galabau

   Zwei Fassungen, gleiche Gestaltung: eine fuer Anfragen, eine fuer
   Bewerbungen. Bewusst mit Tabellen und Inline-Styles gebaut — moderne
   CSS-Angaben werden von vielen Mailprogrammen (Outlook voran)
   ignoriert, Flexbox und Raster erst recht.

   Jede Mail geht zusaetzlich als reiner Text raus. Wer HTML abgeschaltet
   hat oder eine Uhr liest, bekommt trotzdem alles.

   ⚠ Alle eingesetzten Werte laufen durch maskieren(). Ohne das koennte
   ein Absender ueber "<script>" oder eigene Auszeichnung die Darstellung
   im Postfach manipulieren.
   ===================================================================== */

import { LOGO_CID } from "./logo.ts";

/* Ein Feld ist [Bezeichnung, Wert]. Frueher eine TypeScript-Angabe;
   die Datei ist jetzt reines JavaScript, damit das Pruefskript sie
   LADEN und die Vorlage wirklich rendern kann statt sie nachzubauen. */

const GRUEN_DUNKEL = "#1B4332";
const GRUEN = "#2C6E49";
const LIMETTE = "#8ECF4F";
const PAPIER = "#EDF3E8";
const TEXT = "#26382E";
const LABEL = "#46761F";

export function maskieren(wert) {
  return String(wert ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function zeile([bez, wert]) {
  const w = String(wert ?? "").trim();
  if (!w) return "";
  return `
        <tr>
          <!-- 118 statt 150 px: die laengste Beschriftung ("Auftraggeber")
               braucht rund 98 px, der Rest der Breite ist im Wertfeld
               besser aufgehoben. -->
          <td class="dv-label" style="padding:11px 0;border-bottom:1px solid rgba(16,35,26,.09);vertical-align:top;width:118px;
              font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${LABEL}">
            ${maskieren(bez)}
          </td>
          <!-- Ohne Umbruch im Wort zwingt eine lange E-Mail-Adresse die
               ganze Karte auf 347 px Mindestbreite; auf einem 320-px-Telefon
               steht die Mail dann schief. "word-wrap" ist die Fassung, die
               auch Outlook (Word-Engine) versteht. -->
          <td class="dv-wert" style="padding:11px 0;border-bottom:1px solid rgba(16,35,26,.09);vertical-align:top;
              word-wrap:break-word;overflow-wrap:anywhere;
              font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${TEXT}">
            ${maskieren(w).replace(/\n/g, "<br>")}
          </td>
        </tr>`;
}

/**
 * @param art       'anfrage' | 'bewerbung' — steuert Farbe der Kopfzeile und Titel
 * @param titel     Ueberschrift der Mail
 * @param vorspann  ein Satz unter der Ueberschrift
 * @param felder    Bezeichnung/Wert-Paare in der Reihenfolge der Anzeige
 * @param nachricht Freitext des Absenders (eigener Block)
 * @param antwortAn Adresse fuer den Antworten-Knopf, leer wenn unplausibel
 */
export function html(o) {
  const nachricht = String(o.nachricht ?? "").trim();
  const knopf = o.antwortAn
    ? `
          <tr><td style="padding:26px 0 0">
            <a href="mailto:${maskieren(o.antwortAn)}"
               style="display:inline-block;padding:14px 26px;border-radius:999px;background:${GRUEN_DUNKEL};
                      color:#F4F9F0;font:700 15px/1 Arial,Helvetica,sans-serif;text-decoration:none">
              Antworten
            </a>
          </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${maskieren(o.titel)}</title>
<!-- Auf schmalen Schirmen Beschriftung ÜBER den Wert statt daneben.
     Gemessen bei 320 px: Die feste 118-px-Spalte liess dem Wert nur rund
     140 px, und "Landschaftsgärtnerin" brach mitten im Wort um. Gestapelt
     steht die volle Breite zur Verfuegung.
     Ein <style>-Block wirkt nicht ueberall — Outlook mit der Word-Engine
     ignoriert Medienabfragen. Das ist hier ohne Belang: Outlook mit der
     Word-Engine ist der Rechner, und dort ist genug Platz. Faellt die
     Regel aus, bleibt das zweispaltige Layout von vorher, das ebenfalls
     ohne waagerechten Ueberlauf auskommt. -->
<style>
@media only screen and (max-width:480px) {
  td.dv-label { display:block !important; width:auto !important;
                padding:11px 0 2px !important; border-bottom:0 !important; }
  td.dv-wert  { display:block !important; width:auto !important;
                padding:0 0 11px !important; }
}
</style></head>
<body style="margin:0;padding:0;background:${PAPIER}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPIER};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:620px;background:#FFFFFF;border-radius:20px;overflow:hidden;
                    box-shadow:0 18px 44px -30px rgba(12,29,20,.4)">

        <tr><td style="padding:24px 30px;background:${GRUEN_DUNKEL};
                       background:linear-gradient(135deg,${GRUEN_DUNKEL},${GRUEN})">
          <!-- Zwei Spalten statt Flexbox: Outlook rendert mit der Word-Engine
               und kennt weder flex noch grid, Tabellen dagegen ueberall. -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 15px 0 0;vertical-align:middle" width="58">
                <img src="cid:${LOGO_CID}" alt="de Vries GaLa-Bau" width="58" height="58"
                     style="display:block;width:58px;height:58px;border:0;outline:none;
                            text-decoration:none;-ms-interpolation-mode:bicubic">
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0 0 5px;font:700 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.22em;
                          text-transform:uppercase;color:${LIMETTE}">de Vries GaLa-Bau</p>
                <h1 style="margin:0;font:600 24px/1.2 Arial,Helvetica,sans-serif;color:#F4F9F0">
                  ${maskieren(o.titel)}</h1>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:26px 30px 4px">
          <p style="margin:0 0 18px;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#4A5F52">
            ${maskieren(o.vorspann)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${o.felder.map(zeile).join("")}
          </table>
          ${nachricht ? `
          <div style="margin:22px 0 0;padding:18px 20px;border-radius:14px;background:${PAPIER}">
            <p style="margin:0 0 8px;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.12em;
                      text-transform:uppercase;color:${LABEL}">Nachricht</p>
            <!-- Umbruch im Wort ist HIER genauso noetig wie in den
                 Feldwerten daneben: Das ist der Freitext des Absenders.
                 Ein einziges langes Wort (gemessen: 158 Zeichen) gab dem
                 Absatz eine Mindestbreite von 1133 px und zog die ganze
                 Karte auf 1233 px — auf jedem Telefon musste man seitwaerts
                 scrollen. Die Regel stand bei den Feldwerten und fehlte
                 ausgerechnet an der Stelle mit dem laengsten Text. -->
            <p style="margin:0;word-wrap:break-word;overflow-wrap:anywhere;
                      font:400 15px/1.65 Arial,Helvetica,sans-serif;color:${TEXT}">
              ${maskieren(nachricht).replace(/\n/g, "<br>")}</p>
          </div>` : ""}
          <table role="presentation" cellpadding="0" cellspacing="0">${knopf}</table>
        </td></tr>

        <tr><td style="padding:24px 30px 28px">
          <p style="margin:0;padding-top:18px;border-top:1px solid rgba(16,35,26,.1);
                    font:400 12.5px/1.6 Arial,Helvetica,sans-serif;color:#5B6F63">
            Automatisch erzeugt von der Website${o.eingegangen ? " · " + maskieren(o.eingegangen) : ""}.<br>
            de Vries GaLa-Bau · An den Flachsrotten 2 · 31020 Salzhemmendorf · 05153 1552
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* Reine Textfassung — dieselben Angaben, ohne Auszeichnung. */
export function text(o) {
  const zeilen = o.felder
    .filter(([, w]) => String(w ?? "").trim())
    .map(([b, w]) => b + ": " + String(w).trim());
  return [
    o.titel,
    "".padEnd(o.titel.length, "="),
    "",
    ...zeilen,
    "",
    String(o.nachricht ?? "").trim() || "(keine Nachricht angegeben)",
    "",
    "—",
    "Automatisch erzeugt von der Website" + (o.eingegangen ? " · " + o.eingegangen : "") + ".",
    "de Vries GaLa-Bau · An den Flachsrotten 2 · 31020 Salzhemmendorf · 05153 1552"
  ].join("\n");
}
