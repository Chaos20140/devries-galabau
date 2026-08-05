/* =====================================================================
   Texte von Kopf- und Fusszeile
   =====================================================================

   Kopf- und Fusszeile sind Web Components mit Shadow DOM. Ihre Texte
   standen bisher als Zeichenketten mitten in der Markup-Erzeugung — fuer
   den Seiten-Editor unerreichbar, weil er im Dokument arbeitet und nicht
   in den Schattenwurzeln.

   Deshalb liegen sie jetzt hier. Die Komponenten lesen von hier und
   fallen auf ihre eingebauten Werte zurueck, wenn diese Datei fehlt oder
   unvollstaendig ist — die Seite laeuft also auch dann.

   ⚠ Diese Datei wird vom Seiten-Editor VOLLSTAENDIG neu erzeugt
   (Aktion "rahmen-speichern"). Von Hand geaenderte Kommentare oder
   Formatierungen ueberleben ein Speichern nicht. Wer hier dauerhaft
   etwas aendern will, aendert den Erzeuger in der Edge Function.

   ⚠ Sie wird auf ALLEN 14 Seiten geladen, VOR den Komponenten. Ein
   Syntaxfehler nimmt jeder Seite Kopf- und Fusszeile. Der Server wertet
   den erzeugten Inhalt deshalb vor dem Commit probeweise aus.
   ===================================================================== */
window.RAHMEN_TEXTE = {
  "menue": [
    { "datei": "index.html", "text": "Start" },
    { "datei": "gartengestaltung.html", "text": "Gestaltung" },
    { "datei": "gartenplanung.html", "text": "Planung" },
    { "datei": "gartenpflege.html", "text": "Pflege" },
    { "datei": "bepflanzung.html", "text": "Bepflanzung" }
  ],
  "menueMehr": [
    { "datei": "ueber-uns.html", "text": "Über uns" },
    { "datei": "referenzen.html", "text": "Referenzen" },
    { "datei": "kontakt.html", "text": "Kontakt" },
    { "datei": "stellenangebote.html", "text": "Stellenangebote" },
    { "datei": "impressum.html", "text": "Impressum" },
    { "datei": "datenschutz.html", "text": "Datenschutz" }
  ],
  "menueMehrTitel": "Unternehmen",
  "knopf": "Kostenlos anfragen",

  "fussAbsatz": "Garten- und Landschaftsbau in Salzhemmendorf. Gestaltung, Planung, Bepflanzung und Pflege — seit 1998 aus einer Hand.",
  "fussSpalten": [
    {
      "titel": "Leistungen",
      "links": [
        { "datei": "gartengestaltung.html", "text": "Gartengestaltung" },
        { "datei": "gartenplanung.html", "text": "Gartenplanung" },
        { "datei": "gartenpflege.html", "text": "Gartenpflege" },
        { "datei": "bepflanzung.html", "text": "Bepflanzung" }
      ]
    },
    {
      "titel": "Ansichten",
      "links": [
        { "datei": "stellenangebote.html", "text": "Stellenangebote" },
        { "datei": "datenschutz.html", "text": "Datenschutz" },
        { "datei": "referenzen.html", "text": "Referenzen" },
        { "datei": "impressum.html", "text": "Impressum" },
        { "datei": "ueber-uns.html", "text": "Über uns" },
        { "datei": "kontakt.html", "text": "Kontakt" },
        { "datei": "index.html", "text": "Start" }
      ]
    }
  ],
  "fussKontaktTitel": "Kontakt",
  "fussZeiten": "Mo–Fr 8:00–16:00",
  "fussOrt": "Salzhemmendorf, Niedersachsen",
  "fussRechts": "de Vries Galabau · Garten- und Landschaftsbau",
  "fussGebiet": "Salzhemmendorf · Hameln · Hildesheim"
};
