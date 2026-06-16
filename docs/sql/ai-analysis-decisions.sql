-- AI 분석 Portfolio Manager 최신 결론 공유 저장소.
-- history 없이 ticker 별 최신 1건만 유지한다.

create table if not exists public.ai_analysis_decisions (
  ticker text primary key,
  provider text not null check (provider in ('claude', 'codex')),
  decision jsonb not null,
  sentiment jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.ai_analysis_decisions is
  'Ticker별 최신 AI Portfolio Manager 결론 1건 저장소';

comment on column public.ai_analysis_decisions.decision is
  'FinalDecision JSON payload';

comment on column public.ai_analysis_decisions.sentiment is
  'SNS 분석가 정형 감성 payload, 없으면 null';
