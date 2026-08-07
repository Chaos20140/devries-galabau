-- =====================================================================
-- Taegliche Sicherung der Website
--
-- Eine Sicherung ist EINE ZIP-Datei im PRIVATEN Eimer "sicherungen".
-- Sie enthaelt den kompletten Stand des Repositorys, die Aenderungs-
-- geschichte, die gespeicherten Anfragen und Bewerbungen sowie die
-- hochgeladenen Bewerbungsunterlagen.
--
-- RECHTELAGE — der Kern der Sache:
-- Die Tabelle hat RLS an und BEWUSST KEINE EINZIGE POLICY. Damit ist sie
-- ueber die oeffentliche Schnittstelle weder les- noch schreibbar; der
-- oeffentliche Schluessel steht im Quelltext jeder ausgelieferten Seite.
-- Heran kommt ausschliesslich die Edge Function mit dem Dienstschluessel,
-- und die verlangt vorher eine gueltige Anmeldung.
--
-- Derselbe Grund fuer den privaten Eimer: Eine Sicherung enthaelt Namen,
-- Anschriften, Telefonnummern und Bewerbungsunterlagen. Herunterladen
-- laesst sie sich nur ueber einen zeitlich begrenzten, unterschriebenen
-- Verweis, den die Verwaltung bei jedem Klick neu erzeugt.
-- =====================================================================

create table if not exists public.galabau_sicherungen (
  id            uuid primary key default gen_random_uuid(),
  erstellt_am   timestamptz not null default now(),
  dateiname     text        not null check (char_length(dateiname) between 1 and 200),
  pfad          text        not null check (char_length(pfad) between 1 and 300),
  groesse_bytes bigint      not null default 0,
  art           text        not null default 'manuell'
                            check (art in ('manuell', 'automatisch')),
  inhalt        jsonb       not null default '{}'::jsonb
);

create index if not exists galabau_sicherungen_zeit_idx
  on public.galabau_sicherungen (erstellt_am desc);

alter table public.galabau_sicherungen enable row level security;
alter table public.galabau_sicherungen force row level security;
-- BEWUSST keine Policy. Siehe Kopf.

-- Nichts fuer die oeffentlichen Rollen. Ohne diesen Entzug bliebe ein
-- Grant bestehen, der zusammen mit einer spaeter ergaenzten Policy
-- sofort Lesezugriff auf die Sicherungsliste oeffnen wuerde.
revoke all on table public.galabau_sicherungen from anon, authenticated;

-- Privater Eimer. public=false heisst: kein Abruf ueber eine oeffentliche
-- Adresse, nur ueber unterschriebene Verweise.
insert into storage.buckets (id, name, public, file_size_limit)
values ('sicherungen', 'sicherungen', false, 209715200)   -- 200 MB Obergrenze
on conflict (id) do nothing;

-- Fuer storage.objects gilt dasselbe: keine Policy fuer diesen Eimer.
-- Der oeffentliche Schluessel kommt damit weder heran noch sieht er,
-- dass es ihn gibt.
