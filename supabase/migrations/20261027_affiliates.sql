-- ============================================================================
-- CollUp · Programa de afiliados (portal oculto)
-- REVIEW BEFORE RUNNING: this file has NOT been applied to the live database.
--
-- What it creates
--   * affiliate_settings      single-row program settings (portal_open = false by default)
--   * affiliate_admins        users allowed to use the admin panel
--   * affiliates              one row per affiliate (id = auth.users.id) with a unique, self-chosen code
--   * affiliate_referrals     each affiliate's "cartera" of businesses / creators
--   * affiliate_payouts       payments to affiliates
--   * affiliate_collaborations collaborations of referred users + commission per collaboration
--   * landing_waitlist.referral_code + trigger that files waitlist signups into the right cartera
--   * RPC functions (all SECURITY DEFINER, search_path = '') used by the portal
--
-- Security model
--   * Browser roles can only SELECT their own rows (RLS) and call the RPCs below.
--   * Every write goes through an RPC that validates input and ownership.
--   * Admin = a row in affiliate_admins. Create it AFTER registering your own account:
--       insert into public.affiliate_admins (user_id)
--       select id from auth.users where email = 'YOUR-EMAIL' on conflict do nothing;
--   * The portal stays closed (no public signups) until you run:
--       select public.affiliate_admin_set_settings(true, null, null, null, null);   -- or use the admin panel
--
-- Before going live (Supabase dashboard): enable email confirmation, set the Site URL
-- and redirect URLs for collup.info, and review rate limits for auth endpoints.
-- ============================================================================
begin;

-- ---------------------------------------------------------------- settings --
create table if not exists public.affiliate_settings (
  id boolean primary key default true check (id),
  portal_open boolean not null default false,
  commission_rate numeric(5,4) not null default 0.2000 check (commission_rate between 0 and 1),
  commission_months integer not null default 12 check (commission_months between 1 and 60),
  min_payout numeric(10,2) not null default 25 check (min_payout >= 0),
  launch_label text not null default 'Enero–febrero 2027' check (char_length(launch_label) <= 60),
  updated_at timestamptz not null default now()
);
insert into public.affiliate_settings default values on conflict do nothing;

create table if not exists public.affiliate_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_affiliate_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.affiliate_admins where user_id = auth.uid());
$$;

-- -------------------------------------------------------------- affiliates --
create table if not exists public.affiliates (
  id uuid primary key references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{2,19}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  status text not null default 'active' check (status in ('active', 'suspended')),
  commission_rate numeric(5,4) check (commission_rate between 0 and 1),  -- null = program default
  payout_method text check (payout_method in ('transfer', 'stripe', 'bizum')),
  payout_details text check (char_length(payout_details) <= 120),
  accepted_terms_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists affiliates_code_key on public.affiliates (code);

-- --------------------------------------------------------------- referrals --
create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  kind text not null check (kind in ('business', 'creator')),
  name text not null check (char_length(name) between 1 and 200),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  business_type text check (char_length(business_type) <= 80),
  city text check (char_length(city) <= 80),
  notes text check (char_length(notes) <= 1000),
  source text not null default 'manual' check (source in ('link', 'manual')),
  -- prospect: in the affiliate's cartera but has not signed up yet
  -- waiting:  on the CollUp waitlist (pre-launch)    registered: has an account in the app
  -- active:   has completed at least one collaboration   lost: discarded
  status text not null default 'prospect' check (status in ('prospect', 'waiting', 'registered', 'active', 'lost')),
  waitlist_id text,
  first_collab_at timestamptz,
  commission_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- First affiliate to register a person keeps it.
create unique index if not exists affiliate_referrals_email_key
  on public.affiliate_referrals (lower(email)) where email is not null;
create index if not exists affiliate_referrals_affiliate_idx on public.affiliate_referrals (affiliate_id, status);

-- ----------------------------------------------------------------- payouts --
create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  method text check (method in ('transfer', 'stripe', 'bizum')),
  reference text check (char_length(reference) <= 120),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists affiliate_payouts_affiliate_idx on public.affiliate_payouts (affiliate_id, created_at desc);

-- ----------------------------------------------------------- collaborations --
create table if not exists public.affiliate_collaborations (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.affiliate_referrals(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  collab_ref text unique check (char_length(collab_ref) <= 80),
  description text check (char_length(description) <= 200),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),    -- what the business pays
  collup_income numeric(12,2) not null check (collup_income >= 0),  -- what CollUp earns
  commission_rate numeric(5,4) not null check (commission_rate between 0 and 1),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  -- pending: being measured (commission shown as projected) · collected: CollUp has been paid
  -- paid: commission paid out · cancelled: refunded / void
  status text not null default 'pending' check (status in ('pending', 'collected', 'paid', 'cancelled')),
  collected_at timestamptz,
  paid_at timestamptz,
  payout_id uuid references public.affiliate_payouts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_collabs_affiliate_idx on public.affiliate_collaborations (affiliate_id, status);
create index if not exists affiliate_collabs_referral_idx on public.affiliate_collaborations (referral_id);

-- Commission rules: rate is snapshotted on insert; commission only counts for collaborations
-- collected within `commission_months` of the referral's first collected collaboration.
create or replace function public.affiliate_collab_calc()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.affiliate_referrals%rowtype;
  v_rate numeric;
  v_months integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into r from public.affiliate_referrals where id = new.referral_id;
  if not found then raise exception 'referral_not_found'; end if;
  new.affiliate_id := r.affiliate_id;
  select coalesce(a.commission_rate, s.commission_rate), s.commission_months
    into v_rate, v_months
    from public.affiliates a cross join public.affiliate_settings s where a.id = r.affiliate_id;
  if tg_op = 'INSERT' then new.commission_rate := v_rate; end if;

  if new.status in ('collected', 'paid') then
    if new.collected_at is null then new.collected_at := now(); end if;
    if r.first_collab_at is null then
      v_start := new.collected_at;
      v_end := v_start + make_interval(months => v_months);
      update public.affiliate_referrals
         set first_collab_at = v_start, commission_ends_at = v_end, status = 'active', updated_at = now()
       where id = r.id;
    else
      v_start := r.first_collab_at; v_end := r.commission_ends_at;
      if r.status <> 'active' then
        update public.affiliate_referrals set status = 'active', updated_at = now() where id = r.id;
      end if;
    end if;
    new.commission_amount := case when new.collected_at between v_start and v_end
                                  then round(new.collup_income * new.commission_rate, 2) else 0 end;
  elsif new.status = 'cancelled' then
    new.commission_amount := 0;
  else
    new.commission_amount := round(new.collup_income * new.commission_rate, 2); -- projected
  end if;
  return new;
end;
$$;
drop trigger if exists affiliate_collab_calc on public.affiliate_collaborations;
create trigger affiliate_collab_calc before insert or update of status, collup_income, collected_at
  on public.affiliate_collaborations for each row execute function public.affiliate_collab_calc();

-- ------------------------------------------------------- waitlist attribution --
alter table public.landing_waitlist add column if not exists referral_code text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'landing_waitlist_referral_code_fmt') then
    alter table public.landing_waitlist add constraint landing_waitlist_referral_code_fmt
      check (referral_code is null or referral_code ~ '^[A-Za-z0-9-]{3,20}$');
  end if;
end $$;

create or replace function public.affiliate_attribute_waitlist()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_aff uuid;
  v_json jsonb := to_jsonb(new);
begin
  begin
    update public.affiliate_referrals
       set status = 'waiting', waitlist_id = v_json->>'id', updated_at = now()
     where lower(email) = lower(new.email) and status = 'prospect';
    if new.referral_code is not null then
      select id into v_aff from public.affiliates where code = upper(new.referral_code) and status = 'active';
      if v_aff is not null then
        insert into public.affiliate_referrals (affiliate_id, kind, name, email, business_type, source, status, waitlist_id)
        values (v_aff, case when new.role = 'business' then 'business' else 'creator' end,
                new.name, new.email, v_json->>'business_type', 'link', 'waiting', v_json->>'id')
        on conflict do nothing;
      end if;
    end if;
  exception when others then
    null; -- attribution must never block a waitlist signup
  end;
  return new;
end;
$$;
drop trigger if exists affiliate_attribute_waitlist on public.landing_waitlist;
create trigger affiliate_attribute_waitlist after insert on public.landing_waitlist
  for each row execute function public.affiliate_attribute_waitlist();

-- ----------------------------------------------------------------- RLS ------
alter table public.affiliate_settings enable row level security;
alter table public.affiliate_admins enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_collaborations enable row level security;

revoke all on public.affiliate_settings, public.affiliate_admins, public.affiliates,
  public.affiliate_referrals, public.affiliate_payouts, public.affiliate_collaborations
  from anon, authenticated;
grant select on public.affiliates, public.affiliate_referrals, public.affiliate_payouts,
  public.affiliate_collaborations to authenticated;

drop policy if exists affiliates_select on public.affiliates;
create policy affiliates_select on public.affiliates for select to authenticated
  using (id = auth.uid() or public.is_affiliate_admin());
drop policy if exists affiliate_referrals_select on public.affiliate_referrals;
create policy affiliate_referrals_select on public.affiliate_referrals for select to authenticated
  using (affiliate_id = auth.uid() or public.is_affiliate_admin());
drop policy if exists affiliate_payouts_select on public.affiliate_payouts;
create policy affiliate_payouts_select on public.affiliate_payouts for select to authenticated
  using (affiliate_id = auth.uid() or public.is_affiliate_admin());
drop policy if exists affiliate_collabs_select on public.affiliate_collaborations;
create policy affiliate_collabs_select on public.affiliate_collaborations for select to authenticated
  using (affiliate_id = auth.uid() or public.is_affiliate_admin());

-- ----------------------------------------------------------- helper (private) --
create or replace function public.affiliate_normalize_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select upper(btrim(coalesce(p_code, '')));
$$;

create or replace function public.affiliate_code_problem(p_code text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare c text := public.affiliate_normalize_code(p_code);
begin
  if c !~ '^[A-Z0-9][A-Z0-9-]{2,19}$' then return 'format'; end if;
  if c in ('COLLUP','ADMIN','AFILIADOS','AFILIADO','SOPORTE','SUPPORT','TEST','PRUEBA','NULL','UNDEFINED','APP','WEB','INFO','HOLA') then return 'reserved'; end if;
  if exists (select 1 from public.affiliates where code = c) then return 'taken'; end if;
  return null;
end;
$$;

-- ------------------------------------------------------------ public RPCs ----
create or replace function public.affiliate_portal_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('open', portal_open, 'commission_rate', commission_rate,
         'commission_months', commission_months, 'min_payout', min_payout, 'launch_label', launch_label)
  from public.affiliate_settings;
$$;

create or replace function public.affiliate_code_available(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('available', public.affiliate_code_problem(p_code) is null,
                            'reason', public.affiliate_code_problem(p_code),
                            'code', public.affiliate_normalize_code(p_code));
$$;

create or replace function public.affiliate_signup(p_code text, p_name text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_code text := public.affiliate_normalize_code(p_code);
  v_problem text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not (select portal_open from public.affiliate_settings) and not public.is_affiliate_admin() then
    raise exception 'portal_closed';
  end if;
  if p_accept is distinct from true then raise exception 'terms_required'; end if;
  if exists (select 1 from public.affiliates where id = v_uid) then raise exception 'already_affiliate'; end if;
  v_problem := public.affiliate_code_problem(v_code);
  if v_problem is not null then raise exception 'code_%', v_problem; end if;
  insert into public.affiliates (id, code, display_name, email) values (v_uid, v_code, btrim(p_name), v_email);
  return jsonb_build_object('code', v_code);
exception when unique_violation then
  raise exception 'code_taken';
end;
$$;

-- ----------------------------------------------------------- affiliate RPCs ----
create or replace function public.affiliate_change_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text := public.affiliate_normalize_code(p_code); v_problem text;
begin
  if not exists (select 1 from public.affiliates where id = v_uid and status = 'active') then raise exception 'not_affiliate'; end if;
  if exists (select 1 from public.affiliate_referrals where affiliate_id = v_uid) then raise exception 'code_locked'; end if;
  v_problem := public.affiliate_code_problem(v_code);
  if v_problem is not null then raise exception 'code_%', v_problem; end if;
  update public.affiliates set code = v_code where id = v_uid;
  return jsonb_build_object('code', v_code);
exception when unique_violation then raise exception 'code_taken';
end;
$$;

create or replace function public.affiliate_update_profile(p_name text, p_method text, p_details text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.affiliates where id = auth.uid()) then raise exception 'not_affiliate'; end if;
  update public.affiliates
     set display_name = btrim(p_name), payout_method = nullif(p_method, ''), payout_details = nullif(btrim(p_details), '')
   where id = auth.uid();
end;
$$;

create or replace function public.affiliate_add_lead(
  p_kind text, p_name text, p_email text, p_phone text, p_business_type text, p_city text, p_notes text, p_consent boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.affiliates where id = auth.uid() and status = 'active') then raise exception 'not_affiliate'; end if;
  if p_consent is distinct from true then raise exception 'consent_required'; end if;
  if p_kind not in ('business', 'creator') then raise exception 'invalid_kind'; end if;
  if p_email is not null and btrim(p_email) <> '' and btrim(p_email) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'invalid_email'; end if;
  insert into public.affiliate_referrals (affiliate_id, kind, name, email, phone, business_type, city, notes, source, status)
  values (auth.uid(), p_kind, btrim(p_name), nullif(lower(btrim(p_email)), ''), nullif(btrim(p_phone), ''),
          nullif(btrim(p_business_type), ''), nullif(btrim(p_city), ''), nullif(btrim(p_notes), ''), 'manual', 'prospect')
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already_registered';
end;
$$;

create or replace function public.affiliate_update_lead(p_id uuid, p_notes text, p_lost boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.affiliate_referrals
     set notes = nullif(btrim(p_notes), ''),
         status = case when status not in ('prospect', 'waiting', 'lost') then status
                       when p_lost then 'lost'
                       when source = 'manual' and waitlist_id is null then 'prospect' else 'waiting' end,
         updated_at = now()
   where id = p_id and affiliate_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- --------------------------------------------------------------- admin RPCs ----
create or replace function public.affiliate_admin_get_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  return (select to_jsonb(s) from public.affiliate_settings s);
end;
$$;

create or replace function public.affiliate_admin_set_settings(
  p_open boolean, p_rate numeric, p_months integer, p_min numeric, p_launch text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  update public.affiliate_settings set
    portal_open = coalesce(p_open, portal_open),
    commission_rate = coalesce(p_rate, commission_rate),
    commission_months = coalesce(p_months, commission_months),
    min_payout = coalesce(p_min, min_payout),
    launch_label = coalesce(nullif(btrim(p_launch), ''), launch_label),
    updated_at = now();
  return (select to_jsonb(s) from public.affiliate_settings s);
end;
$$;

create or replace function public.affiliate_admin_set_affiliate(p_id uuid, p_status text, p_rate numeric, p_clear_rate boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  if p_status is not null and p_status not in ('active', 'suspended') then raise exception 'invalid_status'; end if;
  update public.affiliates set
    status = coalesce(p_status, status),
    commission_rate = case when p_clear_rate then null else coalesce(p_rate, commission_rate) end
  where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$$;

create or replace function public.affiliate_admin_set_referral(p_id uuid, p_status text, p_affiliate_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  if p_status is not null and p_status not in ('prospect', 'waiting', 'registered', 'active', 'lost') then raise exception 'invalid_status'; end if;
  update public.affiliate_referrals set
    status = coalesce(p_status, status),
    affiliate_id = coalesce(p_affiliate_id, affiliate_id),
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if p_affiliate_id is not null then
    update public.affiliate_collaborations set affiliate_id = p_affiliate_id where referral_id = p_id and status <> 'paid';
  end if;
end;
$$;

create or replace function public.affiliate_admin_add_collab(
  p_referral_id uuid, p_ref text, p_description text, p_gross numeric, p_income numeric, p_status text default 'pending')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('pending', 'collected') then raise exception 'invalid_status'; end if;
  insert into public.affiliate_collaborations (referral_id, affiliate_id, collab_ref, description, gross_amount, collup_income, commission_rate, status)
  select r.id, r.affiliate_id, nullif(btrim(p_ref), ''), nullif(btrim(p_description), ''), p_gross, p_income, 0, p_status
    from public.affiliate_referrals r where r.id = p_referral_id
  returning id into v_id;
  if v_id is null then raise exception 'not_found'; end if;
  return v_id;
exception when unique_violation then raise exception 'duplicate_collab_ref';
end;
$$;

create or replace function public.affiliate_admin_set_collab(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('pending', 'collected', 'cancelled') then raise exception 'invalid_status'; end if;
  update public.affiliate_collaborations set status = p_status
   where id = p_id and status <> 'paid' and payout_id is null;
  if not found then raise exception 'not_editable'; end if;
end;
$$;

create or replace function public.affiliate_admin_create_payout(p_affiliate_id uuid, p_method text default null, p_force boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_total numeric; v_min numeric; v_id uuid; v_method text;
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  select min_payout into v_min from public.affiliate_settings;
  select coalesce(sum(commission_amount), 0) into v_total from public.affiliate_collaborations
   where affiliate_id = p_affiliate_id and status = 'collected' and payout_id is null and commission_amount > 0;
  if v_total <= 0 then raise exception 'nothing_to_pay'; end if;
  if v_total < v_min and not p_force then raise exception 'below_minimum'; end if;
  select coalesce(p_method, payout_method) into v_method from public.affiliates where id = p_affiliate_id;
  insert into public.affiliate_payouts (affiliate_id, amount, method, created_by)
  values (p_affiliate_id, v_total, v_method, auth.uid()) returning id into v_id;
  update public.affiliate_collaborations set payout_id = v_id
   where affiliate_id = p_affiliate_id and status = 'collected' and payout_id is null and commission_amount > 0;
  return v_id;
end;
$$;

create or replace function public.affiliate_admin_mark_payout_paid(p_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  update public.affiliate_payouts set status = 'paid', paid_at = now(), reference = nullif(btrim(p_reference), '')
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_editable'; end if;
  update public.affiliate_collaborations set status = 'paid', paid_at = now() where payout_id = p_id;
end;
$$;

-- ------------------------------------------------------------ function grants ----
-- Only the functions created here are touched; existing functions of the project are left as they are.
revoke execute on function
  public.is_affiliate_admin(), public.affiliate_normalize_code(text), public.affiliate_code_problem(text),
  public.affiliate_portal_status(), public.affiliate_code_available(text),
  public.affiliate_signup(text, text, boolean), public.affiliate_change_code(text),
  public.affiliate_update_profile(text, text, text),
  public.affiliate_add_lead(text, text, text, text, text, text, text, boolean),
  public.affiliate_update_lead(uuid, text, boolean),
  public.affiliate_admin_get_settings(), public.affiliate_admin_set_settings(boolean, numeric, integer, numeric, text),
  public.affiliate_admin_set_affiliate(uuid, text, numeric, boolean), public.affiliate_admin_set_referral(uuid, text, uuid),
  public.affiliate_admin_add_collab(uuid, text, text, numeric, numeric, text), public.affiliate_admin_set_collab(uuid, text),
  public.affiliate_admin_create_payout(uuid, text, boolean), public.affiliate_admin_mark_payout_paid(uuid, text),
  public.affiliate_collab_calc(), public.affiliate_attribute_waitlist()
  from public, anon, authenticated;
grant execute on function public.affiliate_portal_status() to anon, authenticated;
grant execute on function public.affiliate_code_available(text) to anon, authenticated;
grant execute on function public.is_affiliate_admin() to authenticated;
grant execute on function public.affiliate_signup(text, text, boolean) to authenticated;
grant execute on function public.affiliate_change_code(text) to authenticated;
grant execute on function public.affiliate_update_profile(text, text, text) to authenticated;
grant execute on function public.affiliate_add_lead(text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.affiliate_update_lead(uuid, text, boolean) to authenticated;
grant execute on function public.affiliate_admin_get_settings() to authenticated;
grant execute on function public.affiliate_admin_set_settings(boolean, numeric, integer, numeric, text) to authenticated;
grant execute on function public.affiliate_admin_set_affiliate(uuid, text, numeric, boolean) to authenticated;
grant execute on function public.affiliate_admin_set_referral(uuid, text, uuid) to authenticated;
grant execute on function public.affiliate_admin_add_collab(uuid, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.affiliate_admin_set_collab(uuid, text) to authenticated;
grant execute on function public.affiliate_admin_create_payout(uuid, text, boolean) to authenticated;
grant execute on function public.affiliate_admin_mark_payout_paid(uuid, text) to authenticated;

commit;
-- Follow-up: test signup/login with the portal closed, anonymous reads (must be denied),
-- cross-affiliate reads (must be denied) and one full cycle: lead -> collaboration -> payout.
