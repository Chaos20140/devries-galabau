# Supabase anbinden — Anleitung und offene Entscheidungen

**Stand: vorbereitet, nicht aktiv.** Der Code ist vollständig eingebaut, aber
`assets/js/formular.js` enthält noch keine Zugangsdaten. Solange das so bleibt, verhält sich
die Website exakt wie bisher: jeder Formularknopf öffnet das E-Mail-Programm (`mailto:`).
Es geht **kein** Aufruf nach außen.

---

## Vorher lesen: lohnt sich das überhaupt?

Der ehrliche Gegenwert einer Datenbank ist hier überschaubar, die Nebenkosten sind es nicht:

| | `mailto` (heute) | Supabase |
|---|---|---|
| Anfrage landet | direkt im Postfach, das ohnehin gelesen wird | in einer Tabelle, die jemand öffnen muss |
| Benachrichtigung | die E-Mail **ist** die Benachrichtigung | keine — dafür braucht es zusätzlich eine Edge Function und einen Mailversender |
| Auftragsverarbeiter | keiner | einer mehr, mit Vertrag und Eintrag in der Datenschutzerklärung |
| Missbrauch | Postfachfilter | offener Schreib-Endpunkt, siehe unten |
| Ausfall | nur wenn das Postfach ausfällt | zusätzlicher Dienst, der ausfallen kann |

Sinnvoll wird Supabase, sobald **mehr** daraus werden soll: Anfragen als Liste mit Status
„erledigt", Auswertung, mehrere Personen im Zugriff, Anbindung an ein Angebotsprogramm.
Für „die Anfrage soll ankommen" ist `mailto` die schlichtere und robustere Lösung.

Die Anbindung liegt fertig da — sie zu aktivieren ist eine Entscheidung, keine Bastelei mehr.

---

## Was noch fehlt

1. **Ein Supabase-Projekt.** Ich konnte keins anlegen: der Supabase-Zugang ist in dieser
   Sitzung nicht angemeldet.
   → Region **Frankfurt (eu-central-1)** wählen. Nicht die US-Regionen: die Daten sind
   Kontaktdaten von Privatpersonen.
2. **Projekt-URL und `anon`-Schlüssel** aus *Project Settings → API*.
3. **Der Auftragsverarbeitungsvertrag** mit Supabase (im Dashboard unter *Legal → DPA*).
   Ohne den ist der Einsatz für personenbezogene Daten nicht sauber.
4. **Ein Absatz in der Datenschutzerklärung.** Der ist rechtlich Pflicht, sobald Formulardaten
   an einen Dritten gehen. Den Rechtstext ändere ich nicht von mir aus — sag Bescheid, dann
   formuliere ich einen Vorschlag zum Gegenlesen durch jemanden mit juristischem Blick.

---

## Einrichten in vier Schritten

### 1. Tabelle anlegen

`supabase/schema.sql` im SQL-Editor des Projekts **vollständig** ausführen.

Der wichtigste Teil steht am Ende: Row Level Security ist aktiv, `anon` darf ausschließlich
`insert`. Es gibt bewusst **keine** `select`-Regel — sonst könnte jeder Besucher sämtliche
Kundenanfragen abrufen, denn der Schlüssel steht im Quelltext.

Danach im SQL-Editor gegenprüfen:

```sql
set role anon;
select * from public.anfragen;                       -- muss 0 Zeilen liefern
insert into public.anfragen (quelle, name, email)
  values ('probe', 'Test', 'test@example.org');      -- muss klappen
reset role;
```

Liefert das `select` Zeilen, ist etwas falsch — dann **nicht** weitermachen.

### 2. Zugangsdaten eintragen

In `assets/js/formular.js`:

```js
var CFG = {
  url: 'https://<projekt-ref>.supabase.co',
  key: '<anon / publishable key>',
  tabelle: 'anfragen'
};
```

Der `anon`-Schlüssel gehört in den Quelltext, er ist kein Geheimnis. **Niemals** den
`service_role`-Schlüssel eintragen — der umgeht sämtliche Regeln.

### 3. CSP öffnen

Auf den sieben Seiten mit Formular (`index`, `anfrage`, `kontakt`, `gartenplanung`,
`gartenpflege`, `bepflanzung`, `gartengestaltung`) im `<meta http-equiv="Content-Security-Policy">`:

```
connect-src 'self'   →   connect-src 'self' https://<projekt-ref>.supabase.co
```

Ohne das blockiert der Browser den Aufruf — und der `mailto`-Rückfallweg greift, ohne dass
jemand merkt, dass die Datenbank nie erreicht wurde.

### 4. Versionsnummer hochzählen

`?v=10` in allen `*.html` auf `?v=11`, sonst sehen wiederkehrende Besucher das alte Skript.

---

## Wie es sich dann verhält

- Formular abgeschickt → Datensatz in `anfragen`, danach `danke.html`
- Supabase antwortet mit Fehler, ist nicht erreichbar oder braucht länger als 8 Sekunden
  → automatisch zurück auf `mailto`, die Anfrage geht trotzdem raus
- Zugangsdaten leer → direkt `mailto`, wie heute

Die Anfrage geht also in **keinem** Fall verloren.

---

## Missbrauch: was getan ist und was nicht

Ein öffentlicher Schreib-Endpunkt ist ein Ziel. Eingebaut sind zwei einfache Bremsen:

- ein **Honigtopf**-Feld `hinweisfeld`, für Menschen unsichtbar; ausgefüllt = Roboter
- eine **Zeitschwelle**: wer in unter 2,5 Sekunden abschickt, gilt als Roboter

Beide führen **nicht** zum stillen Verwerfen, sondern auf den `mailto`-Weg. Ein Roboter folgt
keinem `mailto`; ein zu Unrecht verdächtigter Mensch bekommt seine Nachricht trotzdem los.
Stillschweigend wegzuwerfen wäre schlimmer als jeder Spam.

**Was fehlt: eine echte Begrenzung.** PostgREST hat keine. Wer die Adresse kennt, kann die
Tabelle vollschreiben. Möglichkeiten, wenn das eintritt:

- in Supabase *Attack Protection* aktivieren und die zulässigen Ursprünge einschränken
- statt direkt auf die Tabelle über eine **Edge Function** schreiben und dort pro IP begrenzen
- ein Captcha vorschalten — bringt aber wieder einen Dritten und einen Datenschutzabsatz mit

Für den Anfang genügt Beobachten: läuft Unsinn auf, ist die Edge Function der nächste Schritt.

---

## Falls jemand später Anfragen im Browser lesen soll

Dann **nicht** einfach eine `select`-Regel für `anon` ergänzen. Stattdessen einen angemeldeten
Zugang anlegen und die Regel an `authenticated` hängen:

```sql
grant select, update on public.anfragen to authenticated;
create policy anfragen_select_intern
  on public.anfragen for select to authenticated using (true);
```

Zum bloßen Nachsehen reicht der Table-Editor im Supabase-Dashboard — der läuft über
`service_role` und braucht gar keine Regel.
