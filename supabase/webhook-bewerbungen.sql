-- Derselbe Trigger fuer die Bewerbungen. Die Edge Function erkennt am
-- Datensatz (Feld "stelle"), dass es eine Bewerbung ist, und waehlt die
-- passende Mail-Vorlage.
--
-- VOR DEM AUSFUEHREN: <TOKEN-HIER-EINSETZEN> durch dasselbe Geheimnis
-- ersetzen, das als Secret ANFRAGE_TOKEN gesetzt ist.

create or replace function public.galabau_bewerbung_benachrichtigen()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  ziel text := 'https://pvcbgwzqjnzzpehwuywi.supabase.co/functions/v1/anfrage-mail';
  token text := '<TOKEN-HIER-EINSETZEN>';
begin
  perform net.http_post(
    url     := ziel,
    body    := jsonb_build_object('record', to_jsonb(new) || jsonb_build_object('__tabelle','galabau_bewerbungen')),
    headers := jsonb_build_object('Content-Type','application/json','x-anfrage-token', token),
    timeout_milliseconds := 8000
  );
  return new;
end;
$$;

revoke all on function public.galabau_bewerbung_benachrichtigen() from public, anon, authenticated;

drop trigger if exists galabau_bewerbungen_benachrichtigung on public.galabau_bewerbungen;
create trigger galabau_bewerbungen_benachrichtigung
  after insert on public.galabau_bewerbungen
  for each row
  execute function public.galabau_bewerbung_benachrichtigen();
