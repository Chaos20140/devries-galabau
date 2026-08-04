/* =====================================================================
   Das Markenlogo als eingebettetes Bild fuer die Benachrichtigungen.

   Warum als Anhang und nicht als Verweis auf die Website: Mailprogramme
   blockieren entfernte Bilder standardmaessig. Ein <img src="https://…">
   waere beim Oeffnen erst ein leerer Kasten, bis der Empfaenger
   "Bilder anzeigen" klickt — und jeder Abruf verraet dem Server, wann
   die Mail gelesen wurde. Als CID-Anhang gehoert das Bild zur Nachricht
   und ist sofort da.

   Warum PNG und nicht das WebP der Website: WebP versteht kaum ein
   Mailprogramm. Der runde Ausschnitt und der weisse Ring sind fest
   eingebacken, weil Outlook border-radius ignoriert — dort waere sonst
   ein hellgruenes Quadrat auf dem dunkelgruenen Kopfbalken zu sehen.

   Erzeugt aus assets/img/logo-galabau.jpg (512 x 512) auf 128 x 128,
   Palette mit 64 Farben. Das Original liegt daneben als logo.png.
   ===================================================================== */

export const LOGO_CID = "dvlogo";
export const LOGO_DATEI = "logo.png";
export const LOGO_TYP = "image/png";

/** 2610 Bytes als Base64 — bewusst im Quelltext, damit die Funktion ohne
 *  Dateizugriff auskommt und in einem Stueck deploybar bleibt. */
export const LOGO_BASE64 =
  "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" +
  "dGYN1Xy8AAAAAElFTkSuQmCC";
