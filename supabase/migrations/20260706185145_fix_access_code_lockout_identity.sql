-- Code review fix #7 (docs/plans/code-review-fixes-2026-07-06.md): the
-- 5-strikes/15-min lockout was keyed on access_codes.failed_attempts/
-- locked_until — the *whole code*, not the caller's identity. Five
-- wrong-email attempts against a shared code locked out the correct buyer
-- too, and a successful redemption never reset the counter. Moves the
-- lockout to a per-(code, email) table and resets it on success.

alter table public.access_codes drop column if exists failed_attempts;
alter table public.access_codes drop column if exists locked_until;

create table if not exists public.access_code_attempts (
  code text not null,
  email text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (code, email)
);
alter table public.access_code_attempts enable row level security;

create or replace function public.redeem_access_code(p_code text, p_email text)
returns table (plan text, email text) as $$
declare
  v_plan text;
begin
  update public.access_codes
  set uses = uses + 1, last_used_at = now()
  where code = p_code
    and active
    and (email = '*' or lower(email) = lower(p_email))
    and (max_uses is null or uses < max_uses)
    and (expires_at is null or expires_at > now())
    and not exists (
      select 1 from public.access_code_attempts a
      where a.code = p_code and a.email = lower(p_email)
        and a.locked_until is not null and a.locked_until > now()
    )
  returning access_codes.plan into v_plan;

  if v_plan is not null then
    delete from public.access_code_attempts where code = p_code and email = lower(p_email);
    return query select v_plan, p_email;
  end if;
  return;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.register_failed_code(p_code text, p_email text)
returns void as $$
  insert into public.access_code_attempts (code, email, failed_attempts, locked_until, updated_at)
  values (p_code, lower(p_email), 1, null, now())
  on conflict (code, email) do update
  set failed_attempts = public.access_code_attempts.failed_attempts + 1,
      locked_until = case when public.access_code_attempts.failed_attempts + 1 >= 5
                          then now() + interval '15 min' else public.access_code_attempts.locked_until end,
      updated_at = now();
$$ language sql security definer set search_path = public;
