-- 채점 원장(signal_scorecard) — AI 판정 적중률 채점 backbone.
--
-- PRD `signal-scorecard` §3-1-B/C / §9 D1.
-- 결정 1건 = 1행(append, upsert 아님). 같은 ticker 재분석은 새 행이 쌓인다(history).
-- 기존 ai_analysis_decisions(ticker PK upsert)는 그대로 둔다(비파괴 — 카드/이전 결론 공유 보존).
--
-- 멱등: create table if not exists + add column if not exists. 코드 머지 전 prod Supabase 에
-- 수동 선적용한다(서버 service role 이 REST 로 read/insert/update).

create table if not exists public.signal_scorecard (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  provider text not null check (provider in ('claude', 'codex')),

  -- 결정 평탄화(decision/signal jsonb 에서 복사) ──────────────────────────────
  verdict text not null check (verdict in ('BUY','OVERWEIGHT','HOLD','UNDERWEIGHT','REDUCE','SELL')),
  decision_confidence text not null check (decision_confidence in ('HIGH','MEDIUM','LOW')),
  signal_score numeric,                 -- DecisionSignal.score(0~100)
  signal_action text,                   -- DecisionSignal.action(BUY/HOLD/SELL)
  target_pct numeric,                   -- FinalDecision.target_pct(현재가 대비 목표 %, nullable)
  stop_loss_pct numeric,                -- FinalDecision.stop_loss_pct(항상 음수 %)

  -- 결정시점 가격 캡처(C1 해소) ───────────────────────────────────────────────
  entry_close numeric not null,         -- 결정시점 기준 봉 종가 = entry (signal.asOf 봉의 close, D2)
  entry_date date not null,             -- 결정시점 기준 봉 날짜(YYYY-MM-DD) = signal.asOf
  live_price numeric,                   -- 라이브 현재가(보조 — 채점 미사용, D2)
  decided_at timestamptz not null,      -- 판정 생성 timestamp(불변 기록)
  run_id text,                          -- 토큰 usage 연계(nullable)

  -- horizon 평가 상태(d1=+1d / w1=+1w / m1=+1m) ──────────────────────────────
  d1_status text not null default 'pending' check (d1_status in ('pending','hit','miss','flat','skipped')),
  d1_close numeric,
  d1_return_pct numeric,
  d1_scored_at timestamptz,

  w1_status text not null default 'pending' check (w1_status in ('pending','hit','miss','flat','skipped')),
  w1_close numeric,
  w1_return_pct numeric,
  w1_scored_at timestamptz,

  m1_status text not null default 'pending' check (m1_status in ('pending','hit','miss','flat','skipped')),
  m1_close numeric,
  m1_return_pct numeric,
  m1_scored_at timestamptz,

  created_at timestamptz not null default now()
);

-- 이미 배포된 DB용 멱등 컬럼 추가(신규 컬럼만 — 기존 컬럼 삭제/타입 변경 금지). ─────────
alter table public.signal_scorecard add column if not exists live_price numeric;
alter table public.signal_scorecard add column if not exists run_id text;
alter table public.signal_scorecard add column if not exists signal_score numeric;
alter table public.signal_scorecard add column if not exists signal_action text;
alter table public.signal_scorecard add column if not exists target_pct numeric;
alter table public.signal_scorecard add column if not exists stop_loss_pct numeric;

-- cron 조회 인덱스 — horizon 중 하나라도 pending 인 행을 빠르게 찾기 위함.
create index if not exists signal_scorecard_pending_idx
  on public.signal_scorecard (entry_date)
  where d1_status = 'pending' or w1_status = 'pending' or m1_status = 'pending';

-- 집계/표 조회용 보조 인덱스.
create index if not exists signal_scorecard_ticker_idx on public.signal_scorecard (ticker);
create index if not exists signal_scorecard_decided_at_idx on public.signal_scorecard (decided_at desc);

comment on table public.signal_scorecard is
  'AI 판정 채점 원장(append). 결정 1건=1행. PRD 적용 이후 결정부터 채점(과거 소급 없음).';
comment on column public.signal_scorecard.entry_close is
  '결정시점 기준 봉 종가(signal.asOf 봉 close) = 적중 판정 entry 가격';
comment on column public.signal_scorecard.live_price is
  '결정시점 라이브 현재가(보조 — 채점엔 entry_close 사용, 미사용)';
comment on column public.signal_scorecard.d1_status is
  'horizon +1d(1영업일) 평가 상태: pending|hit|miss|flat|skipped';
comment on column public.signal_scorecard.w1_status is
  'horizon +1w(5영업일) 평가 상태';
comment on column public.signal_scorecard.m1_status is
  'horizon +1m(21영업일) 평가 상태';
