-- REVIEW BEFORE RUNNING: this file has NOT been applied to the live database.
-- Audit existing policies, column-level grants, views and sequence permissions first.
begin;
alter table public.landing_waitlist
  add column if not exists privacy_consent boolean,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_consent_at timestamptz;
-- Historic registrations remain null: never manufacture retrospective consent.
create or replace function public.stamp_waitlist_consent()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.privacy_consent is distinct from true
     or new.privacy_notice_version is null
     or char_length(new.privacy_notice_version) not between 1 and 64 then
    raise exception 'Valid notice version and affirmative consent required';
  end if;
  new.privacy_consent_at := now();
  return new;
end;
$$;
drop trigger if exists stamp_waitlist_consent on public.landing_waitlist;
create trigger stamp_waitlist_consent before insert on public.landing_waitlist
for each row execute function public.stamp_waitlist_consent();
alter table public.landing_waitlist enable row level security;
-- Restrict browser roles to submissions; administration uses a secure server role.
revoke all on public.landing_waitlist from anon, authenticated;
grant insert on public.landing_waitlist to anon;
drop policy if exists collup_waitlist_insert on public.landing_waitlist;
create policy collup_waitlist_insert on public.landing_waitlist
for insert to anon with check (
  privacy_consent = true and char_length(privacy_notice_version) between 1 and 64
  and role in ('creator', 'business')
  and char_length(email) between 3 and 254
  and char_length(name) between 1 and 200
);
commit;
-- Follow-up: test anonymous read/update/delete denials and permitted submissions.
-- Review all other existing insert policies (permissive policies combine with OR).
-- Add server-side abuse controls before high-volume acquisition.
