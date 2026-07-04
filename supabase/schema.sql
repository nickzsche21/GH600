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
