-- CollUp · Endurecimiento de seguridad (nov 2026). REVISAR ANTES DE EJECUTAR.
-- Idempotente. No toca datos. Aplicar en el SQL Editor de Supabase.
begin;

-- 1) Campañas: el anónimo solo ve columnas de escaparate (sin escrow, ni business_id, ni tarifas).
--    Comprueba antes que la landing/app no necesita otras columnas como anon.
revoke select on public.campaigns from anon;
grant select (id, title, description, niche, platform, platforms, images, content_type, status,
              deadline, application_deadline, max_applicants, requirements, audience,
              reward_type, perk_description, created_at)
  on public.campaigns to anon;

-- 2) Lista de espera: tope de longitud en campos libres (evita relleno con basura).
do $$ declare c text; begin
  for c in select column_name from information_schema.columns
           where table_schema='public' and table_name='landing_waitlist'
             and data_type in ('text','character varying')
             and column_name not in ('name','email','role','privacy_notice_version','referral_code')
  loop
    execute format('alter table public.landing_waitlist drop constraint if exists %I', 'wl_len_'||c);
    execute format('alter table public.landing_waitlist add constraint %I check (%I is null or char_length(%I) <= 300) not valid',
                   'wl_len_'||c, c, c);
  end loop;
end $$;

-- 3) Afiliados: bloquear filas al crear pagos (evita doble pago por ejecuciones simultáneas).
create or replace function public.affiliate_admin_create_payout(p_affiliate_id uuid, p_method text default null, p_force boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_total numeric; v_min numeric; v_id uuid; v_method text;
begin
  if not public.is_affiliate_admin() then raise exception 'forbidden'; end if;
  perform 1 from public.affiliates where id = p_affiliate_id for update;
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

-- 4) Afiliados: exigir email verificado al registrarse como afiliado.
create or replace function public.affiliate_signup(p_code text, p_name text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_code text := public.affiliate_normalize_code(p_code);
  v_problem text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'email_not_verified';
  end if;
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
revoke execute on function public.affiliate_admin_create_payout(uuid, text, boolean), public.affiliate_signup(text, text, boolean) from public, anon;
grant execute on function public.affiliate_admin_create_payout(uuid, text, boolean), public.affiliate_signup(text, text, boolean) to authenticated;

commit;
-- Después: probar como anon que SELECT * en campaigns falla y que la landing sigue enviando formularios.
