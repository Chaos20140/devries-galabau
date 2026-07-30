-- =====================================================================
-- de Vries Galabau — Tabelle fuer Formularanfragen
--
-- Im SQL-Editor des Supabase-Projekts einmal komplett ausfuehren.
-- Danach assets/js/formular.js mit Projekt-URL und anon-Schluessel
-- fuellen und connect-src in der CSP ergaenzen (siehe SUPABASE.md).
--
-- Der Kern dieser Datei sind die Rechte am Ende. Die Website spricht
-- die Datenbank mit dem oeffentlichen anon-Schluessel an — jeder
-- Besucher kann ihn im Quelltext lesen. Sicher ist das nur, weil
-- anon ausschliesslich EINFUEGEN darf und nichts lesen kann.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.anfragen (
  id              uuid        primary key default gen_random_uuid(),
  eingegangen_am  timestamptz not null    default now(),
  erledigt        boolean     not null    default false,

  -- Woher kam die Anfrage (Seitenname) und mit welchem Betreff
  quelle          text        not null    check (char_length(quelle)  between 1 and 60),
  betreff         text                    check (char_length(betreff) <= 160),

  -- Kontaktdaten
  name            text        not null    check (char_length(name)  between 1 and 120),
  email           text        not null    check (char_length(email) between 3 and 200
                                                 and position('@' in email) > 1),
  telefon         text                    check (char_length(telefon) <= 60),

  -- Angaben zum Vorhaben
  ort             text                    check (char_length(ort)      <= 120),
  art             text                    check (char_length(art)      <= 40),
  bereich         text                    check (char_length(bereich)  <= 60),
  zeitraum        text                    check (char_length(zeitraum) <= 120),
  nachricht       text                    check (char_length(nachricht) <= 5000)
);

comment on table public.anfragen is
  'Anfragen aus den Formularen der Website. Schreibzugriff oeffentlich (anon), Lesezugriff nur intern.';

create index if not exists anfragen_eingang_idx
  on public.anfragen (eingegangen_am desc);

-- ---------------------------------------------------------------------
-- Rechte. Reihenfolge und Vollstaendigkeit sind hier wichtig.
-- ---------------------------------------------------------------------

alter table public.anfragen enable row level security;
-- Auch fuer den Tabelleneigentuemer erzwingen, damit keine Rolle
-- versehentlich an den Regeln vorbeikommt:
alter table public.anfragen force row level security;

-- Erst alles wegnehmen, dann gezielt zurueckgeben.
revoke all on public.anfragen from anon, authenticated;

-- anon darf einfuegen — mehr nicht. Kein select, kein update, kein delete.
grant insert on public.anfragen to anon;

drop policy if exists anfragen_insert_anon on public.anfragen;
create policy anfragen_insert_anon
  on public.anfragen
  for insert
  to anon
  with check (true);

-- ⚠ BEWUSST KEINE select-, update- oder delete-Policy fuer anon.
-- Ohne passende Policy verweigert RLS den Zugriff — genau so soll es sein.
-- Wer die Anfragen ansehen will, nimmt den Table-Editor im Supabase-Dashboard
-- (der laeuft ueber service_role und umgeht RLS) oder legt sich einen
-- angemeldeten Zugang an und ergaenzt dafuer eine eigene select-Policy:
--
--   grant select on public.anfragen to authenticated;
--   create policy anfragen_select_intern
--     on public.anfragen for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Gegenprobe nach dem Ausfuehren (im SQL-Editor):
--
--   set role anon;
--   select * from public.anfragen;   -- muss 0 Zeilen liefern
--   insert into public.anfragen (quelle, name, email)
--     values ('probe', 'Test', 'test@example.org');   -- muss klappen
--   reset role;
--
-- Liefert das select Zeilen, ist etwas falsch — dann NICHT live gehen.
-- ---------------------------------------------------------------------
