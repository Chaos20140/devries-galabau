# Supabase — Stand, Betrieb und was noch fehlt

**Eingerichtet und geprüft, aber NICHT veröffentlicht.**

| | |
|---|---|
| Projekt | `devries-galabau` (Ref `pvcbgwzqjnzzpehwuywi`), Organisation *Reel Rebel* |
| Region | Central EU — Frankfurt |
| Tabelle | `public.galabau_anfragen`, RLS an und erzwungen, eine Policy (nur `insert`) |
| Im Code | `assets/js/formular.js` ist gefüllt, `connect-src` auf sieben Seiten geöffnet |
| Live | **nein** — `main` liefert weiter den `mailto`-Stand |

Das Projekt liegt bewusst **getrennt** von `de-vries`: dort liegen sechs `devries_*`-Tabellen
einer anderen Website (Bewerbungen, Terminbuchungen). Die werden hier nicht angefasst.

**Das Datenbank-Passwort wurde zufällig erzeugt und nirgends gespeichert.** Die Website braucht
es nicht — sie spricht nur die REST-Schnittstelle mit dem öffentlichen Schlüssel an. Wer eine
direkte Postgres-Verbindung will, setzt im Dashboard unter *Settings → Database* ein eigenes.

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

## Was noch fehlt — und warum es noch nicht live ist

Zwei Dinge, beide nur von dir zu erledigen:

1. **Auftragsverarbeitungsvertrag mit Supabase.** Im Dashboard unter *Organization → Legal →
   DPA* bestätigen. Ohne den ist die Verarbeitung personenbezogener Daten durch einen
   Dienstleister nicht zulässig — daran ändert auch der beste Datenschutztext nichts.
2. ~~Absatz in der Datenschutzerklärung.~~ **Erledigt** — steht in `datenschutz.html` als
   eigener Abschnitt „Supabase (Speicherung der Formularanfragen)“ zwischen „Kontaktformular“
   und „Anfrage per E-Mail“. Er behauptet allerdings, der AVV sei geschlossen. Das ist erst
   nach Punkt 1 wahr — deshalb hängt die Veröffentlichung weiter daran.

**Deshalb steht die Anbindung fertig, aber unveröffentlicht.** Sie erst freizuschalten und den
Rechtstext später nachzuziehen hieße, in der Zwischenzeit Kontaktdaten von Privatpersonen ohne
Grundlage weiterzugeben. Einen Datenschutztext von mir einzusetzen, der einen noch nicht
geschlossenen Vertrag behauptet, wäre ebenso falsch.

Sobald Punkt 1 erledigt ist: sag Bescheid, dann veröffentliche ich Code und Rechtstext
zusammen. Der Live-Gang ist dann ein Deployment, keine Bastelei —
Konfiguration und CSP stehen bereits im Branch.

---

## Wo die Anfragen landen

Im Supabase-Dashboard → *Table Editor* → `galabau_anfragen`. Der Table Editor läuft über
`service_role` und umgeht RLS, deshalb braucht es dafür keine Leseregel.

Es gibt **keine** Benachrichtigung per E-Mail. Wer eine will, braucht zusätzlich eine Edge
Function auf einem Datenbank-Webhook plus einen Mailversender. Solange das fehlt, muss jemand
die Tabelle aktiv öffnen — das ist der Grund, warum `mailto` für den reinen Posteingang
weiterhin die schlichtere Lösung ist.

---

## Wie es sich dann verhält

- Formular abgeschickt → Datensatz in `galabau_anfragen`, danach `danke.html`
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
grant select, update on public.galabau_anfragen to authenticated;
create policy galabau_anfragen_select_intern
  on public.galabau_anfragen for select to authenticated using (true);
```

Zum bloßen Nachsehen reicht der Table-Editor im Supabase-Dashboard — der läuft über
`service_role` und braucht gar keine Regel.
