-- =====================================================================
-- Benachrichtigung bei neuer Anfrage
--
-- Nach dem Einfuegen einer Zeile in public.galabau_anfragen ruft dieser
-- Trigger die Edge Function anfrage-mail auf, die per SMTP ueber das
-- eigene Postfach benachrichtigt.
--
-- VOR DEM AUSFUEHREN: unten <TOKEN-HIER-EINSETZEN> durch dasselbe
-- Geheimnis ersetzen, das als Secret ANFRAGE_TOKEN gesetzt wurde.
-- Ohne Uebereinstimmung antwortet die Funktion 401 und verschickt nichts.
--
-- pg_net arbeitet asynchron: der Aufruf wird eingereiht, das Einfuegen
-- wartet nicht darauf. Scheitert der Versand, bleibt die Zeile trotzdem
-- in der Tabelle — die Anfrage geht also nie verloren.
-- =====================================================================

-- pg_net legt sein eigenes Schema net an; ein anderes Zielschema wird
-- ignoriert und fuehrt beim Aufruf zu "cross-database references".
create extension if not exists pg_net;

create or replace function public.galabau_anfrage_benachrichtigen()
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
    body    := jsonb_build_object('record', to_jsonb(new)),
    headers := jsonb_build_object(
                 'Content-Type',    'application/json',
                 'x-anfrage-token', token
               ),
    timeout_milliseconds := 8000
  );
  return new;
end;
$$;

-- Nur der Eigentuemer darf die Funktion ausfuehren; anon und
-- authenticated brauchen das nicht, der Trigger laeuft ohnehin
-- mit den Rechten des Definierers.
revoke all on function public.galabau_anfrage_benachrichtigen() from public, anon, authenticated;

drop trigger if exists galabau_anfragen_benachrichtigung on public.galabau_anfragen;
create trigger galabau_anfragen_benachrichtigung
  after insert on public.galabau_anfragen
  for each row
  execute function public.galabau_anfrage_benachrichtigen();

-- ---------------------------------------------------------------------
-- Gegenprobe nach dem Einrichten:
--
--   insert into public.galabau_anfragen (quelle, name, email, nachricht)
--     values ('pruefung', 'Test', 'test@example.org', 'Probelauf');
--
--   -- kurz warten, dann die Antwort des Aufrufs ansehen:
--   select status_code, content from net._http_response order by created desc limit 1;
--
--   -- 200 = verschickt · 401 = Token stimmt nicht · 503 = Secrets fehlen
--   delete from public.galabau_anfragen where quelle = 'pruefung';
-- ---------------------------------------------------------------------
