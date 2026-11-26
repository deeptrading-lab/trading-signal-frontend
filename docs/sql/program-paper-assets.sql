-- Local owner identity is the server-side SHA-256 hash of the persistent browser cookie.
begin;
create table public.program_paper_asset_events (
  id text primary key,
  owner_sub text not null,
  amount bigint not null check (amount between 0 and 9007199254740991),
  source text not null check (source in ('manual', 'session')),
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index program_paper_asset_events_owner_latest_idx
  on public.program_paper_asset_events (owner_sub, effective_at desc, created_at desc, id desc);
alter table public.program_paper_asset_events enable row level security;
revoke all on public.program_paper_asset_events from public, anon, authenticated, service_role;
grant select, insert on public.program_paper_asset_events to service_role;
commit;
