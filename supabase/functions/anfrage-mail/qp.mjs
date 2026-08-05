/* Umgehung eines Fehlers in denomailer 1.6.0 — EINE Quelle für Deno und Node.
 *
 * BEOBACHTUNG: In der zugestellten Mail standen zwei sichtbare "=20" im
 * Text, an Stellen, an denen im Quelltext nichts dergleichen steht.
 *
 * URSACHE, in config/mail/encoding.ts belegt:
 *
 *     export function quotedPrintableEncode(data, encLB = false) {
 *       data.replaceAll("=", "=3D");          // Ergebnis wird VERWORFEN
 *       if (!encLB) {
 *         data = data.replaceAll(" \r\n", "=20\r\n").replaceAll(" \n", "=20\n");
 *       }
 *       const encodedData = Array.from(data).map((ch) => {
 *         ...  if (code >= 32 && code <= 126 && code !== 61) return ch;   // "=" faellt durch
 *         ...  -> wird zu "=3D"
 *
 * Das Leerzeichen am Zeilenende wird also durch "=20" ersetzt, BEVOR der
 * Zeichenwandler läuft — und der macht aus dem "=" darin ein "=3D".
 * Übertragen wird "=3D20", und der Empfänger löst das zu einem
 * buchstäblichen "=20" auf.
 *
 * Ausgelöst wird es nicht von einem getippten Leerzeichen, sondern von der
 * Einrückung: Steht in der Vorlage eine Zeile, deren Inhalt zur Laufzeit
 * leer bleibt, bleibt ihre Einrückung als reine Leerzeichenzeile stehen.
 *
 * Wir können den Fehler nicht in der Bibliothek beheben (1.6.0 ist die
 * neueste Fassung). Also sorgen wir dafür, dass er nicht greifen kann:
 * keine Leerzeichen am Zeilenende. In HTML wie im Fließtext sind sie
 * ohnehin bedeutungslos.
 *
 * BEIM ANHEBEN DER denomailer-FASSUNG: erst nachsehen, ob
 * quotedPrintableEncode das immer noch so macht.
 */

import { umschreiben } from "./betreff.mjs";

/* Entfernt Leerzeichen und Tabulatoren unmittelbar vor einem Zeilenende
   und am Ende der Zeichenkette. */
export function ohneRandleerzeichen(text) {
  return String(text ?? "")
    .replace(/[ \t]+(?=\r?\n)/g, "")
    .replace(/[ \t]+$/, "");
}

/* Dateiname für einen Anhang: nur unbedenkliche Zeichen.
   Der Name kommt vom Bewerber und landet in einer MIME-Kopfzeile
   (filename="…"). Ein Anführungszeichen oder ein Zeilenumbruch darin
   würde die Kopfzeile aufbrechen. */
export function dateinameSicher(name, ersatz = "Lebenslauf.pdf") {
  /* Erst umschreiben, dann filtern — sonst fiele aus "Prüfeintrag" ein
     "Prfeintrag", weil der Umlaut beim ASCII-Filter einfach wegfiele. */
  let s = umschreiben(String(name ?? "")).split(/[\\/]/).pop() ?? "";
  s = s.replace(/[^A-Za-z0-9._ -]+/g, "_");  /* Anführungszeichen, ; , = raus */
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[._-]+/, "");
  /* Erst hier: Bleibt nichts übrig, gilt der Ersatz. Sonst käme aus einem
     leeren Namen ein ".pdf". */
  if (!s) return ersatz;
  if (s.length > 80) {
    const punkt = s.lastIndexOf(".");
    const endung = punkt > 0 ? s.slice(punkt) : "";
    s = s.slice(0, 80 - endung.length) + endung;
  }
  if (!/\.[A-Za-z0-9]{1,8}$/.test(s)) s += ".pdf";
  return s || ersatz;
}
