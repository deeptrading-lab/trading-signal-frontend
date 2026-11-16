-- Run once in the target project's SQL Editor. Program paper trading remains local.
begin;

create table if not exists public.program_paper_results (
  id text primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null check (finished_at >= started_at),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists program_paper_results_finished_idx
  on public.program_paper_results (finished_at desc, id);

create table if not exists public.program_paper_review_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.program_paper_results(id),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('evaluation', 'applied')),
  score smallint,
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  check ((kind = 'evaluation' and score is not null and score between 0 and 100)
      or (kind = 'applied' and score is null))
);
create index if not exists program_paper_review_events_session_idx
  on public.program_paper_review_events (session_id, created_at desc, id);

alter table public.program_paper_results enable row level security;
alter table public.program_paper_review_events enable row level security;
revoke all on public.program_paper_results, public.program_paper_review_events from public, anon, authenticated, service_role;
grant select, insert on public.program_paper_results, public.program_paper_review_events to service_role;

commit;
