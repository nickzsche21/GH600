-- Premium bank v2: 300-scenario tiered pack (free_diagnostic/founder/pro),
-- mirrored verbatim from the validated import package (see
-- docs/history/schema-migrations.md). Replaces public.scenarios as the Pro
-- lab's content source; public.scenarios is kept (harmless) but deprecated.

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
