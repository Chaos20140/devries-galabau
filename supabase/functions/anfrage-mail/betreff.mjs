/* Betreffzeile der Benachrichtigungsmail — EINE Quelle für Deno und Node.
 *
 * Warum eine eigene Datei: Das Prüfskript soll DIESE Funktion prüfen, nicht
 * eine Abschrift davon. Reines JavaScript ohne Typangaben, damit beide
 * Laufzeiten dieselbe Datei laden.
 *
 * WARUM ASCII UND NICHT RFC 2047 — an einer echten, kaputt angekommenen
 * Mail vom 05.08.2026 gemessen:
 *
 * denomailer 1.6.0 schickt JEDEN Betreff durch quotedPrintableEncodeInline
 * (config/mail/mod.ts:94):
 *
 *     if (hasNonAsciiCharacters(data) || data.startsWith("=?"))
 *       return `=?utf-8?Q?${quotedPrintableEncode(data)}?=`;
 *
 * Beide Zweige zerstören die Nachricht:
 *  · Umlaut im Betreff  → EIN encoded-word MIT Leerzeichen darin (RFC 2047
 *    verbietet das), und ab 74 Zeichen setzt quotedPrintableEncode ein
 *    weiches Zeilenende "=\r\n". In einem KOPF ist das keine gültige
 *    Faltung — die braucht CRLF + Leerzeichen.
 *  · Betreff beginnt mit "=?" (also unsere eigene RFC-2047-Kodierung, der
 *    Versuch davor) → wird ein ZWEITES Mal eingepackt, unser "=" wird zu
 *    "=3D", danach dasselbe Zeilenproblem.
 *
 * Folge in beiden Fällen: Der Kopfblock endet mitten im Betreff. Der
 * Empfänger sieht einen nackten Base64-Rest als Betreff und darunter
 * "From:", "To:", "Date:", "Content-Type:" als Text im Nachrichtenkörper.
 *
 * Der Fehler war nie sichtbar, weil SMTP bis dahin mit 535 scheiterte —
 * es wurde schlicht nie eine Mail zugestellt.
 *
 * Ein eigener Subject-Kopf über "headers" hilft nicht: client.ts:99
 * schreibt "Subject: " immer selbst, eigene Köpfe kommen erst ab Zeile 119
 * — es gäbe zwei Subject-Zeilen. 1.6.0 ist die neueste Fassung.
 *
 * Bleibt genau ein verlässlicher Weg: reines ASCII, das nicht mit "=?"
 * beginnt und ohne Faltung in eine Kopfzeile passt. Die richtige
 * Schreibweise mit Umlauten steht vollständig IN der Mail — im Text- und
 * im HTML-Teil.
 *
 * BEIM ANHEBEN DER denomailer-FASSUNG: erst nachsehen, ob
 * quotedPrintableEncodeInline noch so aussieht.
 */

/* Zeichen ohne Groß-/Kleinschreibungsfrage. */
const UMSCHRIFT = {
  "—": "-", "–": "-",
  "„": '"', "“": '"', "”": '"',
  "‚": "'", "‘": "'", "’": "'",
  "…": "...", "·": "-", "→": "->", "€": "EUR",
};

/* Umlaute hängen vom Umfeld ab: In VERSALIEN gehört "UE" hin, nicht "Ue".
   Sonst würde aus "PRÜFEINTRAG" ein "PRUeFEINTRAG" — das sieht nach Panne
   aus, nicht nach Umschrift. Entschieden wird am nächsten Zeichen: ist es
   ein Großbuchstabe, steht das Wort in Versalien. */
const UMLAUT = { "Ä": "A", "Ö": "O", "Ü": "U", "ẞ": "S" };
const KLEIN = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" };
const ZWEITER = { "A": "E", "O": "E", "U": "E", "S": "S" };

export function betreffAscii(text) {
  const roh = Array.from(String(text ?? ""));
  let s = roh.map((z, i) => {
    if (KLEIN[z]) return KLEIN[z];
    if (UMLAUT[z]) {
      const naechstes = roh[i + 1] || "";
      const vorheriges = roh[i - 1] || "";
      const versalien = /[A-ZÄÖÜ]/.test(naechstes) ||
        (!/[a-zäöüß]/.test(naechstes) && /[A-ZÄÖÜ]/.test(vorheriges));
      const e = ZWEITER[UMLAUT[z]];
      return UMLAUT[z] + (versalien ? e : e.toLowerCase());
    }
    return UMSCHRIFT[z] ?? z;
  }).join("");
  /* Alles Übrige zerlegen (é → e) und den Rest wegwerfen.
     \p{Diacritic} statt eines Zeichenbereichs: U+0300–U+036F stünde sonst
     als unsichtbare kombinierende Zeichen in der Datei. */
  s = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  /* Nur druckbares ASCII. Das entfernt zugleich jedes Steuerzeichen —
     zweite Reihe hinter kopfsicher(), damit sich über den Betreff keine
     zweite Kopfzeile einschleusen lässt. */
  s = s.replace(/[^\x20-\x7E]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  /* Darf NICHT mit "=?" beginnen, sonst greift die Neukodierung doch.
     Führende Satzzeichen haben in einem Betreff ohnehin nichts verloren. */
  s = s.replace(/^[^A-Za-z0-9]+/, "");
  /* Und kein loses Satzzeichen am Ende: Bei einem Namen in nicht-
     lateinischer Schrift bleibt sonst ein nacktes "Anfrage:" stehen. */
  s = s.replace(/[\s:;,\-–—]+$/, "");
  /* "Subject: " sind 9 Zeichen; RFC 5322 empfiehlt höchstens 78 je Zeile.
     Ohne eigene Faltung muss der Betreff also unter 69 Zeichen bleiben. */
  if (s.length > 69) s = s.slice(0, 66).trimEnd() + "...";
  return s || "Neue Nachricht von der Website";
}
