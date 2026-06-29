-- AI 분석 Portfolio Manager 최신 결론 공유 저장소.
-- history 없이 ticker 별 최신 1건만 유지한다.

create table if not exists public.ai_analysis_decisions (
  ticker text primary key,
  name text,
  provider text not null check (provider in ('claude', 'codex')),
  decision jsonb not null,
  sentiment jsonb,
  signal jsonb,
  updated_at timestamptz not null default now()
);

-- PostgREST anon/authenticated 접근은 차단하고 service role 서버 접근만 허용한다.
-- service role은 RLS를 우회하므로 저장·대시보드 BFF 동작에는 영향이 없다.
alter table public.ai_analysis_decisions enable row level security;

-- 기존 테이블에 신규 컬럼 추가 (이미 배포된 DB용 — 멱등).
alter table public.ai_analysis_decisions
  add column if not exists signal jsonb;

-- 종목명 컬럼(decision-stock-name) — 분석 시점 종목명을 함께 저장해 카드에서 종목번호→종목명 깜빡임 제거.
-- 기존 행은 null → 읽기 시 KIS 폴백 유지(하위호환). 백필 스크립트(scripts/backfillDecisionNames.ts)로 채울 수 있다.
alter table public.ai_analysis_decisions
  add column if not exists name text;

comment on table public.ai_analysis_decisions is
  'Ticker별 최신 AI Portfolio Manager 결론 1건 저장소';

comment on column public.ai_analysis_decisions.name is
  '분석 시점 종목명(KIS hts_kor_isnm). 없으면 null → 읽기 시 KIS 폴백';

comment on column public.ai_analysis_decisions.decision is
  'FinalDecision JSON payload';

comment on column public.ai_analysis_decisions.sentiment is
  'SNS 분석가 정형 감성 payload, 없으면 null';

comment on column public.ai_analysis_decisions.signal is
  '결정론 시그널 엔진(lib/signal) 압축 산출물(DecisionSignal). 분석 시점 가격 기반. 없으면 null(legacy)';
