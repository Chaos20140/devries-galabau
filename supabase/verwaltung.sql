-- =====================================================================
-- Bewerbungen + Verwaltungsfelder
--
-- Ergaenzt das Schema um eine zweite Tabelle fuer Bewerbungen und um die
-- Felder, die das Backoffice braucht. Wie bei den Anfragen gilt: anon
-- darf ausschliesslich einfuegen. Gelesen wird nur ueber die Edge
-- Function, die serverseitig mit service_role arbeitet.
-- =====================================================================

create table if not exists public.galabau_bewerbungen (
  id              uuid        primary key default gen_random_uuid(),
  eingegangen_am  timestamptz not null    default now(),

  -- Beide Felder schickt formular.js bei JEDEM Versand mit, auch bei
  -- Bewerbungen. Fehlen sie hier, lehnt PostgREST den ganzen Datensatz
  -- mit PGRST204 ab und das Formular faellt auf mailto zurueck --
  -- gespeichert wuerde dann nie etwas. Ausserdem baut die Edge Function
  -- den Betreff der Benachrichtigung aus "betreff".
  quelle          text        not null    default 'stellenangebote'
                                          check (char_length(quelle)  between 1 and 60),
  betreff         text                    check (char_length(betreff) <= 160),

  name            text        not null    check (char_length(name)  between 1 and 120),
  email           text        not null    check (char_length(email) between 3 and 200
                                                 and position('@' in email) > 1),
  telefon         text                    check (char_length(telefon) <= 60),
  stelle          text                    check (char_length(stelle)  <= 80),
  verfuegbar_ab   text                    check (char_length(verfuegbar_ab) <= 60),
  nachricht       text                    check (char_length(nachricht) <= 5000)
);

-- Nachtrag fuer Datenbanken, in denen die Tabelle schon ohne diese beiden
-- Spalten steht: "create table if not exists" laesst eine vorhandene
-- Tabelle unberuehrt, aendert dort also nichts.
alter table public.galabau_bewerbungen
  add column if not exists quelle  text not null default 'stellenangebote',
  add column if not exists betreff text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'galabau_bewerbungen_quelle_check') then
    alter table public.galabau_bewerbungen
      add constraint galabau_bewerbungen_quelle_check
      check (char_length(quelle) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint
                 where conname = 'galabau_bewerbungen_betreff_check') then
    alter table public.galabau_bewerbungen
      add constraint galabau_bewerbungen_betreff_check
      check (char_length(betreff) <= 160);
  end if;
end $$;

comment on table public.galabau_bewerbungen is
  'Bewerbungen ueber das Formular. Schreibzugriff oeffentlich (anon), Lesezugriff nur serverseitig.';

create index if not exists galabau_bewerbungen_eingang_idx
  on public.galabau_bewerbungen (eingegangen_am desc);

alter table public.galabau_bewerbungen enable row level security;
alter table public.galabau_bewerbungen force row level security;
revoke all on public.galabau_bewerbungen from anon, authenticated;
grant insert on public.galabau_bewerbungen to anon;

drop policy if exists galabau_bewerbungen_insert_anon on public.galabau_bewerbungen;
create policy galabau_bewerbungen_insert_anon
  on public.galabau_bewerbungen for insert to anon with check (true);

-- ---------------------------------------------------------------------
-- Verwaltungsfelder auf beiden Tabellen. Sie werden ausschliesslich von
-- der Edge Function geschrieben, anon hat darauf keinerlei Zugriff.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['galabau_anfragen','galabau_bewerbungen'] loop
    execute format('alter table public.%I add column if not exists status text not null default ''neu''', t);
    execute format('alter table public.%I add column if not exists notiz text', t);
    execute format('alter table public.%I add column if not exists archiviert boolean not null default false', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t||'_status_chk');
    execute format('alter table public.%I add constraint %I check (status in (''neu'',''in_arbeit'',''erledigt''))', t, t||'_status_chk');
    execute format('alter table public.%I drop constraint if exists %I', t, t||'_notiz_chk');
    execute format('alter table public.%I add constraint %I check (notiz is null or char_length(notiz) <= 2000)', t, t||'_notiz_chk');
  end loop;
end $$;

-- Die alte Spalte "erledigt" der Anfragen wird durch status abgeloest.
alter table public.galabau_anfragen drop column if exists erledigt;

-- Gegenprobe:
--   set role anon;
--   select * from public.galabau_bewerbungen;   -- muss scheitern
--   insert into public.galabau_bewerbungen (name, email) values ('T','t@example.org');
--   reset role;
