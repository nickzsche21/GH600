create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'unknown',
  plan_interest text,
  current_score integer,
  path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  email text,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  email text,
  score integer not null default 0,
  total_questions integer not null default 12,
  readiness_percent integer not null default 0,
  strongest_domains text[] not null default '{}',
  weakest_domains text[] not null default '{}',
  answers jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null,
  amount integer not null,
  currency text not null default 'USD',
  provider text not null default 'razorpay',
  provider_link text,
  status text not null default 'created',
  source_page text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null unique,
  plan text not null default 'founding_access',
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  path text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads (lower(email));
create index if not exists events_session_idx on public.analytics_events (session_id, created_at desc);
create index if not exists attempts_session_idx on public.diagnostic_attempts (session_id, created_at desc);
create index if not exists payment_email_idx on public.payment_intents (lower(email), created_at desc);
create index if not exists access_code_idx on public.access_codes (code) where active = true;

alter table public.leads enable row level security;
alter table public.analytics_events enable row level security;
alter table public.diagnostic_attempts enable row level security;
alter table public.payment_intents enable row level security;
alter table public.access_codes enable row level security;
alter table public.issue_reports enable row level security;

-- No public policies are intentionally created. All writes and access-code reads
-- go through the server-side Vercel functions using the Supabase service role.

-- ---------------------------------------------------------------------------
-- Phase 1: confirmed payments, entitlements, revocable sessions, paid content
-- ---------------------------------------------------------------------------

alter table public.payment_intents add column if not exists purchase_id uuid;
alter table public.payment_intents alter column provider set default 'razorpay';

-- failed_attempts/locked_until on access_codes itself locked the *whole
-- code* out for every buyer on 5 wrong-email attempts (griefable). Superseded
-- by the per-(code, email) public.access_code_attempts table below.
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

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  provider text not null check (provider in ('paddle', 'wise', 'manual')),
  provider_payment_id text not null,
  provider_order_id text,
  plan text not null,
  amount integer not null,
  currency text not null default 'USD',
  status text not null default 'paid' check (status in ('paid', 'refunded', 'chargeback')),
  paid_at timestamptz not null default now(),
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists purchases_provider_payment_idx on public.purchases (provider, provider_payment_id);
create index if not exists purchases_email_idx on public.purchases (lower(email), created_at desc);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null,
  active boolean not null default true,
  source_purchase_id uuid references public.purchases (id),
  source text not null check (source in ('paddle', 'wise', 'manual')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revocation_reason text,
  granted_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists entitlements_email_active_idx on public.entitlements (lower(email), active);

create table if not exists public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null,
  entitlement_id uuid not null references public.entitlements (id),
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  last_seen_at timestamptz
);
create index if not exists access_sessions_token_idx on public.access_sessions (token_hash) where revoked = false;
create index if not exists access_sessions_entitlement_idx on public.access_sessions (entitlement_id);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  primary_domain integer not null,
  objective text not null,
  difficulty text,
  prompt text not null,
  artifact_type text,
  artifact_content text,
  options jsonb not null,
  correct_index integer not null,
  correct_explanation text not null,
  distractor_explanations jsonb not null default '{}'::jsonb,
  decision_principle text,
  source_links jsonb not null default '[]'::jsonb,
  author text,
  reviewer text,
  review_status text not null default 'draft',
  version integer not null default 1,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scenarios_published_idx on public.scenarios (published) where published = true;

create table if not exists public.scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  email text,
  scenario_id uuid not null references public.scenarios (id),
  scenario_version integer not null,
  selected_index integer not null,
  correct boolean not null,
  duration_ms integer,
  attempt_id text,
  created_at timestamptz not null default now()
);
create index if not exists scenario_attempts_session_idx on public.scenario_attempts (session_id, created_at desc);

alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.access_sessions enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_attempts enable row level security;

-- RPCs: SECURITY DEFINER so the service role can perform atomic, race-free
-- code redemption and lockout bookkeeping in a single statement.
--
-- NOTE: the lockout identity moved to public.access_code_attempts (below,
-- keyed on (code, email)) so five wrong-*email* attempts against a shared
-- code can no longer lock out the correct buyer. See
-- docs/history/known-issues.md "code review — paid-lab pass" finding #7.

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

-- ---------------------------------------------------------------------------
-- Premium bank v2: 300-scenario tiered pack (free_diagnostic/founder/pro),
-- mirrored verbatim from the validated import package (see
-- docs/history/schema-migrations.md). Replaces public.scenarios as the Pro
-- lab's content source; public.scenarios is kept (harmless) but deprecated.
-- ---------------------------------------------------------------------------

comment on table public.scenarios is 'Deprecated: superseded by public.gh600_scenarios_v2. Kept for history; no longer seeded or queried by api/scenarios/*.js.';

create table if not exists public.gh600_scenarios_v2 (
  id text primary key,
  title text not null,
  prompt text not null,
  artifact text,
  artifact_type text,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  correct_option_index int not null check (correct_option_index between 0 and 3),
  explanation text not null,
  wrong_answer_explanations jsonb not null check (jsonb_typeof(wrong_answer_explanations) = 'object'),
  domain text not null,
  domain_code text not null check (domain_code in ('D1','D2','D3','D4','D5','D6')),
  subskill text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard','expert')),
  plan_required text not null check (plan_required in ('free_diagnostic','founder','pro')),
  mock_id text not null check (mock_id in ('DIAGNOSTIC','MOCK_1','MOCK_2','MOCK_3','MOCK_4','MOCK_5','MOCK_6','DRILL')),
  mock_position int,
  scenario_type text not null,
  objective_tags jsonb not null check (jsonb_typeof(objective_tags) = 'array'),
  source_urls jsonb not null check (jsonb_typeof(source_urls) = 'array'),
  estimated_time_seconds int not null check (estimated_time_seconds between 30 and 900),
  is_original_content boolean not null default true,
  contains_recalled_or_unauthorized_exam_content boolean not null default false,
  review_status text not null default 'needs_sme_review',
  created_version text not null default 'v2',
  notes_for_reviewer text,
  created_at timestamptz not null default now(),
  check (contains_recalled_or_unauthorized_exam_content = false)
);

create index if not exists gh600_scenarios_v2_domain_code_idx on public.gh600_scenarios_v2 (domain_code);
create index if not exists gh600_scenarios_v2_plan_required_idx on public.gh600_scenarios_v2 (plan_required);
create index if not exists gh600_scenarios_v2_mock_id_idx on public.gh600_scenarios_v2 (mock_id, mock_position);
create index if not exists gh600_scenarios_v2_difficulty_idx on public.gh600_scenarios_v2 (difficulty);
create index if not exists gh600_scenarios_v2_scenario_type_idx on public.gh600_scenarios_v2 (scenario_type);

alter table public.gh600_scenarios_v2 enable row level security;

comment on table public.gh600_scenarios_v2 is 'Private original GH600 Lab premium scenario bank. Never expose answer columns to anonymous clients.';
comment on column public.gh600_scenarios_v2.plan_required is 'Minimum content plan: free_diagnostic, founder, or pro.';
comment on column public.gh600_scenarios_v2.mock_id is 'Mock assignment or DRILL. Free diagnostic is selected by plan_required across MOCK_1 to MOCK_3.';

-- scenario_attempts now references the v2 bank's text ids, not the deprecated
-- uuid scenarios table.
alter table public.scenario_attempts drop constraint if exists scenario_attempts_scenario_id_fkey;
alter table public.scenario_attempts alter column scenario_id type text using scenario_id::text;
alter table public.scenario_attempts alter column scenario_version type text using scenario_version::text;
