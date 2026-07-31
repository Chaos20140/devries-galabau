-- =====================================================================
-- Lebenslauf als PDF zur Bewerbung
--
-- Rechtelage wie ueberall in diesem Projekt: der oeffentliche Schluessel
-- steht im Quelltext der Website und darf deshalb GENAU EINE Sache
-- koennen — hier: eine Datei ablegen. Lesen, Auflisten, Aendern und
-- Loeschen sind ihm verwehrt. Wer eine Bewerbung herunterladen will,
-- geht ueber die Edge Function; die arbeitet mit service_role und gibt
-- einen zeitlich begrenzten Link heraus.
--
-- Ohne diese Trennung koennte jeder Besucher saemtliche Lebenslaeufe
-- abrufen — der Schluessel dazu stuende in jeder ausgelieferten
-- JavaScript-Datei.
-- =====================================================================

-- Nicht oeffentlich, nur PDF, hoechstens 5 MB. Die beiden letzten
-- Grenzen setzt Supabase selbst durch; sie sind damit nicht umgehbar,
-- anders als eine Pruefung im Browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bewerbungen', 'bewerbungen', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- Aufraeumen, falls eine fruehere Fassung Regeln hinterlassen hat.
drop policy if exists bewerbung_datei_ablegen on storage.objects;
drop policy if exists bewerbung_datei_lesen   on storage.objects;

-- Ablegen ja — und nur unterhalb von "eingang/", damit nichts in den
-- Papierkorbbereich geschrieben werden kann.
create policy bewerbung_datei_ablegen
  on storage.objects for insert to anon
  with check (bucket_id = 'bewerbungen' and name like 'eingang/%');

-- Bewusst KEINE Leseregel fuer anon. Fehlt sie, ist der Zugriff dicht;
-- service_role umgeht RLS und kommt weiterhin heran.

-- ---------------------------------------------------------------------
-- Verweis auf die Datei am Datensatz. Der Anzeigename wird getrennt
-- gespeichert, weil der Pfad aus Sicherheitsgruenden neu vergeben wird
-- (ein Dateiname aus dem Netz ist nie vertrauenswuerdig).
-- ---------------------------------------------------------------------
alter table public.galabau_bewerbungen
  add column if not exists datei      text,
  add column if not exists datei_name text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'galabau_bewerbungen_datei_check') then
    alter table public.galabau_bewerbungen
      add constraint galabau_bewerbungen_datei_check
      check (datei is null or (char_length(datei) <= 300 and datei like 'eingang/%'));
  end if;
  if not exists (select 1 from pg_constraint
                 where conname = 'galabau_bewerbungen_datei_name_check') then
    alter table public.galabau_bewerbungen
      add constraint galabau_bewerbungen_datei_name_check
      check (datei_name is null or char_length(datei_name) <= 200);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Bekannte Restrisiken, bewusst in Kauf genommen (siehe SUPABASE.md):
--
-- · Es gibt keine Begrenzung, wie viele Dateien abgelegt werden koennen.
--   Dieselbe Lage besteht schon beim Formular selbst; die Groessen- und
--   Typgrenze deckelt den Schaden auf 5 MB je Datei. Wer sehen will, wie
--   viel liegt: Storage im Supabase-Dashboard.
-- · Der Pfad wird im Browser erzeugt (Zufallsanteil). Er ist kein
--   Geheimnis — geschuetzt wird ueber die fehlende Leseregel, nicht
--   ueber die Unkenntnis des Pfades.
-- ---------------------------------------------------------------------
