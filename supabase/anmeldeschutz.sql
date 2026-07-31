-- Bremse gegen Durchprobieren des Verwaltungspassworts.
--
-- Nur Fehlversuche werden vermerkt. Je mehr davon in den letzten 15
-- Minuten, desto laenger wartet die Funktion vor der Antwort. Ein
-- richtiges Passwort kommt weiterhin sofort durch und loescht die
-- Zaehlung — der Betreiber kann sich also nicht selbst aussperren.
-- Eine harte Sperre waere hier gefaehrlich: sie liesse sich von aussen
-- ausloesen, um genau das zu erreichen.

create table if not exists public.verwaltung_versuche (
  id   bigserial primary key,
  zeit timestamptz not null default now()
);

create index if not exists verwaltung_versuche_zeit_idx
  on public.verwaltung_versuche (zeit desc);

alter table public.verwaltung_versuche enable row level security;
alter table public.verwaltung_versuche force row level security;
revoke all on public.verwaltung_versuche from anon, authenticated;
-- Keine Policy: nur die Edge Function (service_role) kommt heran.
