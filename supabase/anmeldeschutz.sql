-- Schutz gegen Durchprobieren des Verwaltungspassworts.
--
-- ERSTE FASSUNG war zu schwach und wurde ersetzt. Sie liess die Antwort
-- mit der Zahl der Fehlversuche langsamer werden — mehr nicht. Das haelt
-- niemanden auf, der viele Versuche GLEICHZEITIG schickt: eine Wartezeit
-- innerhalb einer Anfrage blockiert keine andere. Bei 200 parallelen
-- Verbindungen und einer Obergrenze von 8 s sind das rund 25 Versuche je
-- Sekunde. Gegen ein Passwort aus Firmenname und Jahreszahl reicht das in
-- Minuten.
--
-- Jetzt gilt: ab einer Grenze wird das Passwort GAR NICHT MEHR VERGLICHEN,
-- die Anfrage bekommt sofort 429. Damit sind parallele Versuche wertlos,
-- denn keiner davon prueft noch etwas.
--
-- Gezaehlt wird je Herkunft, nicht global. Das war der Denkfehler der
-- ersten Fassung: eine globale Sperre liesse sich von aussen ausloesen,
-- um den Betreiber auszusperren — deshalb war damals gar keine Sperre
-- eingebaut. Pro Herkunft besteht dieses Problem nicht: wer den Betrieb
-- aussperren will, muesste dessen Anschluss treffen, und selbst dann
-- kommt ein richtiges Passwort weiterhin durch (die Grenze gilt nur fuer
-- Fehlversuche derselben Herkunft und wird bei Erfolg geloescht).
--
-- Gespeichert wird die Herkunft NUR als Hashwert mit Streuwert, nie die
-- Adresse selbst. Fuer das Zaehlen genuegt das, und es liegen keine
-- personenbeziehbaren Verbindungsdaten herum.

create table if not exists public.verwaltung_versuche (
  id   bigserial   primary key,
  zeit timestamptz not null default now()
);

-- Nachtrag fuer bestehende Datenbanken: "create table if not exists"
-- laesst eine vorhandene Tabelle unberuehrt.
alter table public.verwaltung_versuche
  add column if not exists herkunft text;

create index if not exists verwaltung_versuche_zeit_idx
  on public.verwaltung_versuche (zeit desc);

-- Fuer die Abfrage "wie viele Fehlversuche dieser Herkunft im Zeitfenster"
create index if not exists verwaltung_versuche_herkunft_idx
  on public.verwaltung_versuche (herkunft, zeit desc);

alter table public.verwaltung_versuche enable row level security;
alter table public.verwaltung_versuche force row level security;
revoke all on public.verwaltung_versuche from anon, authenticated;
-- Keine Policy: nur die Edge Function (service_role) kommt heran.

-- ---------------------------------------------------------------------
-- Eintragen und Zaehlen in EINEM Schritt.
--
-- Warum nicht in der Edge Function: dort liegen zwischen "zaehlen" und
-- "eintragen" zwei Netzwerkwege. Wer viele Versuche gleichzeitig
-- schickt, kommt in dieser Luecke durch — gemessen kamen von 40
-- gleichzeitigen Versuchen 26 bis zum Passwortvergleich.
--
-- Ein Zaehler im Arbeitsspeicher der Funktion reicht ebenfalls nicht:
-- Supabase startet unter Last mehrere Instanzen, jede mit eigenem
-- Speicher. Die Grenze vervielfacht sich dann mit ihrer Zahl.
--
-- pg_advisory_xact_lock macht die Versuche EINES Anschlusses seriell.
-- Damit bekommt jeder gleichzeitige Versuch eine eigene, aufsteigende
-- Nummer, und alles oberhalb der Grenze wird abgewiesen, bevor das
-- Passwort ueberhaupt verglichen wird. Andere Anschluesse blockieren
-- sich dabei nicht gegenseitig, die Sperre haengt am Hashwert.
-- ---------------------------------------------------------------------
create or replace function public.verwaltung_versuch(p_herkunft text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext(coalesce(p_herkunft, '')));

  insert into public.verwaltung_versuche (herkunft) values (p_herkunft);

  select count(*) into n
    from public.verwaltung_versuche
   where herkunft = p_herkunft
     and zeit >= now() - interval '15 minutes';

  -- Aufraeumen nur beim ersten Versuch eines Fensters: unter Last soll
  -- nicht jeder einzelne Aufruf zusaetzlich loeschen.
  if n <= 1 then
    delete from public.verwaltung_versuche where zeit < now() - interval '15 minutes';
  end if;

  return n;
end;
$$;

revoke all on function public.verwaltung_versuch(text) from public, anon, authenticated;
