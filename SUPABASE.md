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
| Benachrichtigung | die E-Mail **ist** die Benachrichtigung | über die Edge Function `anfrage-mail`, eingerichtet |
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

## Benachrichtigung per E-Mail

Eingerichtet und geprüft — es fehlt nur noch **ein Befehl von dir.**

Beim Einfügen einer Zeile ruft ein Trigger die Edge Function `anfrage-mail` auf, die über das
**eigene Postfach** verschickt. Kein weiterer Dienstleister, kein zusätzlicher Absatz in der
Datenschutzerklärung.

### Der eine Befehl

Aus diesem Projektordner, mit den Zugangsdaten des Postfachs bei Strato:

```bash
supabase secrets set SMTP_USER=info@devries-galabau.de SMTP_PASS='DEIN-POSTFACH-PASSWORT'
```

Ich habe diese Zugangsdaten bewusst nicht angefasst. Sie liegen danach ausschließlich in den
Secrets des Supabase-Projekts — serverseitig, nie im Browser, nie im Repository.

Voreingestellt sind `smtp.strato.de`, Port 465 und Empfänger `info@devries-galabau.de`.
Weicht davon etwas ab, im selben Befehl ergänzen: `SMTP_HOST=…`, `SMTP_PORT=…`, `MAIL_TO=…`,
`MAIL_FROM=…`.

### Gegenprobe danach

```sql
insert into public.galabau_anfragen (quelle, name, email, nachricht)
  values ('pruefung', 'Test', 'test@example.org', 'Probelauf');
select status_code, content from net._http_response order by created desc limit 1;
delete from public.galabau_anfragen where quelle = 'pruefung';
```

`200` = Mail ist raus · `401` = Token stimmt nicht · `503` = SMTP-Secrets fehlen noch ·
`502` = Strato hat den Versand abgelehnt, der genaue Grund steht in `content`.

### Stand 31.07.2026: Strato lehnt die Anmeldung ab

Die Secrets sind gesetzt, die Kette läuft bis zum letzten Schritt. Der Server antwortet:

```
535 5.7.8 Authentication failed: wrong user/password [MSG0037]
```

Nachgeprüft und in Ordnung: `smtpin.rzone.de` als MX der Domain — das Postfach liegt
tatsächlich bei Strato, `smtp.strato.de:465` ist der richtige Server. Benutzername ist die
vollständige Adresse mit `@devries-galabau.de`, ohne überzählige Leerzeichen. Absenderdomain
passt. Die **Form** stimmt also; abgelehnt wird der Passwortwert selbst.

Zwei Ursachen kommen dafür in Frage, beide nur im Strato-Kundenbereich zu klären:

1. **Verwechselte Passwörter.** Für SMTP gilt das *Postfach*-Passwort (Strato-Kundenbereich →
   E-Mail → Passwort verwalten), nicht das Passwort des Kundenkontos. Das ist der mit Abstand
   häufigste Fall.
2. **Von der Shell verschluckte Sonderzeichen.** `$`, `!` oder ein Backtick werden ohne
   einfache Anführungszeichen von der Kommandozeile ersetzt. Deshalb im Befehl oben
   `SMTP_PASS='…'` mit einfachen Anführungszeichen — dann bleibt der Wert unangetastet.

Wiederholen lässt sich der Versuch mit demselben Befehl; er überschreibt das Secret. Danach
die Gegenprobe von oben. Falls Strato Port 465 sperrt, geht auch
`supabase secrets set SMTP_PORT=587` (STARTTLS).

**Was währenddessen passiert:** nichts geht verloren. Die Anfrage wird gespeichert, bevor die
Mail überhaupt versucht wird, und steht in `verwaltung.html`. Es fehlt nur die Benachrichtigung.

### Was bereits läuft

| | |
|---|---|
| Edge Function `anfrage-mail` | deployt, läuft ohne JWT-Prüfung |
| Schutz der Funktion | gemeinsames Geheimnis im Kopf `x-anfrage-token`; ohne → 401, geprüft |
| `ANFRAGE_TOKEN` | von mir zufällig erzeugt und gesetzt, steht nicht im Repository |
| Trigger | `galabau_anfragen_benachrichtigung`, aktiv, geprüft |
| Entkopplung | scheitert der Versand, **bleibt die Zeile trotzdem** — geprüft mit 503 |

Der Token in `supabase/webhook.sql` steht dort als Platzhalter. Wer die Datei erneut ausführt,
muss ihn ersetzen — oder den Trigger einfach so lassen, er ist bereits eingerichtet.

### Warum die Funktion die Kopfzeilen putzt

Name und E-Mail des Absenders wandern in Betreff und `Reply-To`. Ohne Bereinigung könnte
jemand über `Name
Bcc: opfer@example.org` eigene Kopfzeilen einschleusen und die
Benachrichtigung an Dritte umleiten. Zeilenumbrüche und Tabulatoren werden deshalb entfernt,
Längen begrenzt, und in `Reply-To` kommt nur eine Adresse, die wie eine Adresse aussieht.
Zehn Fälle durchgespielt, alle bestanden.

### Kein Versand ohne Mail-Konto

Ohne `SMTP_USER`/`SMTP_PASS` antwortet die Funktion `503` und verschickt nichts. Sie fällt
also geschlossen aus, statt stillschweigend nichts zu tun.

---

## Wo die Anfragen sonst noch liegen

Im Supabase-Dashboard → *Table Editor* → `galabau_anfragen`. Der Table Editor läuft über
`service_role` und umgeht RLS, deshalb braucht es dafür keine Leseregel.

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
