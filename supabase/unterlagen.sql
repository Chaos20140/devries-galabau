-- Mehrere Bewerbungsunterlagen je Bewerbung.
--
-- Bis hierher gab es genau EINE Datei (Spalten "datei" und "datei_name").
-- Bewerber schicken aber Lebenslauf UND Anschreiben UND Zeugnisse.
--
-- Die alten Spalten bleiben stehen und werden weiter mitgeschrieben (mit
-- der ERSTEN Unterlage). Grund: Es gibt bereits Zeilen, die nur sie
-- tragen, und jeder Leser, der sie noch benutzt, arbeitet unveraendert
-- weiter. Neue Leser bevorzugen "dateien" und fallen auf die alten
-- Spalten zurueck, wenn dort nichts steht.
--
-- Form: [{"pfad": "eingang/<kennung>.pdf", "name": "Lebenslauf.pdf"}, ...]

alter table public.galabau_bewerbungen
  add column if not exists dateien jsonb not null default '[]'::jsonb;

-- Vorhandene Zeilen uebernehmen, damit auch sie ueber den neuen Weg
-- lesbar sind. Laeuft nur dort, wo "dateien" noch leer ist.
update public.galabau_bewerbungen
   set dateien = jsonb_build_array(
         jsonb_build_object('pfad', datei, 'name', coalesce(datei_name, 'Unterlage.pdf')))
 where datei is not null
   and datei <> ''
   and jsonb_array_length(dateien) = 0;

-- Die Pruefung gehoert in die Datenbank: Der oeffentliche Schluessel
-- schreibt direkt ueber PostgREST, eine Pruefung im Browser liesse sich
-- umgehen.
--
-- Sie steht in einer eigenen Funktion, weil ein CHECK keine Unterabfrage
-- enthalten darf ("cannot use subquery in check constraint", SQLSTATE
-- 0A000) — jsonb_array_elements ist aber genau das.
-- search_path ist festgenagelt, damit die Operatoren nicht ueber einen
-- untergeschobenen Suchpfad umgedeutet werden koennen.
create or replace function public.galabau_dateien_ok(d jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when d is null then true
    when jsonb_typeof(d) <> 'array' then false
    when jsonb_array_length(d) > 5 then false
    else (
      select coalesce(bool_and(
               jsonb_typeof(e) = 'object'
           and coalesce(e->>'pfad', '') ~ '^eingang/[0-9a-fA-F-]{36}\.pdf$'
           and coalesce(e->>'name', '') <> ''
           and length(e->>'name') <= 200
             ), true)
        from jsonb_array_elements(d) as e
    )
  end
$$;

alter table public.galabau_bewerbungen
  drop constraint if exists galabau_bewerbungen_dateien_ok;

alter table public.galabau_bewerbungen
  add constraint galabau_bewerbungen_dateien_ok
  check (public.galabau_dateien_ok(dateien));
