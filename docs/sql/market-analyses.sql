-- 시황 분석(market_analyses) 시계열 저장소.
-- PRD market-analysis §3.2. 생성 1건 = 1행(append, upsert 아님). Phase 4 cron(*/30)이 본격 적립.
-- 조회는 created_at 최신 1건(?mode=latest) — 인덱스로 O(1).

create table if not exists public.market_analyses (
  id bigint generated always as identity primary key,
  snapshot_as_of timestamptz,
  provider text not null default 'claude' check (provider in ('claude', 'codex')),
  analysis jsonb not null,
  data_source text check (data_source in ('live', 'partial', 'mock')),
  created_at timestamptz not null default now()
);

create index if not exists market_analyses_created_at_idx
  on public.market_analyses (created_at desc);

comment on table public.market_analyses is
  '시황 CLI 합성(MarketAnalysis) 시계열 — 생성 1건=1행 append';

comment on column public.market_analyses.analysis is
  'MarketAnalysis 전체 payload(regimeDiagnosis·leadingSectors·systemRisk·outlook·stockImplication)';

comment on column public.market_analyses.snapshot_as_of is
  '입력 MarketSnapshot 의 asOf(추적성)';

comment on column public.market_analyses.data_source is
  '입력 스냅샷 dataSource(live/partial/mock) — mock 적립 필터링용';