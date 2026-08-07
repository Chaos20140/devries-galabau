-- =====================================================================
-- Taeglicher Anstoss der Sicherung
--
-- VOR DEM AUSFUEHREN: unten <TOKEN-HIER-EINSETZEN> durch dasselbe
-- Geheimnis ersetzen, das als Secret SICHERUNG_TOKEN gesetzt wurde.
-- Ohne Uebereinstimmung antwortet die Funktion 401 und sichert nichts.
--
-- WARUM EIN EIGENES GEHEIMNIS und nicht das Verwaltungspasswort?
-- Weil der Zeitplan in der Datenbank steht. Ein Passwort dort abzulegen
-- hiesse, den Zugang zur gesamten Verwaltung an einer zweiten Stelle
-- aufzubewahren. Das Geheimnis hier kann ausschliesslich eines: eine
-- Sicherung anstossen.
--
-- WARUM TAEGLICH ANFRAGEN, ABER NUR BEI BEDARF SICHERN?
-- Die Funktion prueft selbst, wie alt die letzte Sicherung ist
-- (SICHERUNG_ABSTAND_TAGE, Vorgabe 1). Ein ausgefallener Lauf holt sich
-- damit beim naechsten Mal von selbst nach, und ein doppelt ausgeloester
-- Lauf richtet keinen Schaden an. Das ist robuster als ein Zeitplan,
-- der genau einmal treffen muss.
-- =====================================================================

create extension if not exists pg_cron;
-- pg_net legt immer sein eigenes Schema "net" an; ein anderes Zielschema
-- wird ignoriert und fuehrt beim Aufruf zu "cross-database references"
-- (das hat in diesem Projekt schon einmal eine halbe Stunde gekostet).
create extension if not exists pg_net;

-- Falls schon vorhanden: erst abmelden, sonst laufen zwei Zeitplaene.
select cron.unschedule('galabau-sicherung-taeglich')
where exists (select 1 from cron.job where jobname = 'galabau-sicherung-taeglich');

-- 02:17 UTC — also 03:17 im Winter, 04:17 im Sommer. Bewusst nachts und
-- bewusst nicht zur vollen Stunde: da draengen sich die Zeitplaene aller
-- anderen.
select cron.schedule(
  'galabau-sicherung-taeglich',
  '17 2 * * *',
  $$
  select net.http_post(
    url     := 'https://pvcbgwzqjnzzpehwuywi.supabase.co/functions/v1/verwaltung',
    body    := jsonb_build_object(
                 'was',   'sicherung-automatisch',
                 'token', '<TOKEN-HIER-EINSETZEN>'
               ),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 240000
  );
  $$
);

-- ---------------------------------------------------------------------
-- Gegenprobe nach dem Einrichten:
--
--   -- Ist der Zeitplan angemeldet?
--   select jobid, jobname, schedule, active from cron.job
--    where jobname = 'galabau-sicherung-taeglich';
--
--   -- Einmal von Hand ausloesen (macht sofort eine Sicherung, wenn die
--   -- letzte aelter als SICHERUNG_ABSTAND_TAGE ist):
--   select net.http_post(
--     url     := 'https://pvcbgwzqjnzzpehwuywi.supabase.co/functions/v1/verwaltung',
--     body    := jsonb_build_object('was','sicherung-automatisch','token','<TOKEN>'),
--     headers := jsonb_build_object('Content-Type','application/json'),
--     timeout_milliseconds := 240000);
--
--   -- Kurz warten, dann die Antwort ansehen:
--   select status_code, content from net._http_response order by created desc limit 1;
--   -- 200 mit "erstellt":true   = Sicherung liegt bereit
--   -- 200 mit "uebersprungen"   = es gab heute schon eine
--   -- 401                       = Token stimmt nicht
--   -- 503                       = Secret SICHERUNG_TOKEN fehlt
--
--   -- Und die Liste:
--   select erstellt_am, dateiname, art, groesse_bytes
--     from public.galabau_sicherungen order by erstellt_am desc;
--
--   -- Laeufe des Zeitplans:
--   select start_time, status, return_message from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'galabau-sicherung-taeglich')
--    order by start_time desc limit 10;
-- ---------------------------------------------------------------------
