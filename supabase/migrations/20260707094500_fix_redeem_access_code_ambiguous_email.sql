-- redeem_access_code's RETURNS TABLE(plan text, email text) shadows the bare
-- `email` column reference inside the function body ("column reference
-- \"email\" is ambiguous", PG 42702) — every real redemption call fails.
-- Qualify every access_codes reference with an explicit alias.

create or replace function public.redeem_access_code(p_code text, p_email text)
returns table (plan text, email text) as $$
declare
  v_plan text;
begin
  update public.access_codes ac
  set uses = ac.uses + 1, last_used_at = now()
  where ac.code = p_code
    and ac.active
    and (ac.email = '*' or lower(ac.email) = lower(p_email))
    and (ac.max_uses is null or ac.uses < ac.max_uses)
    and (ac.expires_at is null or ac.expires_at > now())
    and not exists (
      select 1 from public.access_code_attempts a
      where a.code = p_code and a.email = lower(p_email)
        and a.locked_until is not null and a.locked_until > now()
    )
  returning ac.plan into v_plan;

  if v_plan is not null then
    delete from public.access_code_attempts aca where aca.code = p_code and aca.email = lower(p_email);
    return query select v_plan, p_email;
  end if;
  return;
end;
$$ language plpgsql security definer set search_path = public;
