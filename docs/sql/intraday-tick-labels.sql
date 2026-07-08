-- 틱 자가채점 라벨 원장 — intraday-decision-overhaul PR-2.
--
-- 목적: 영속된 모의 단타 틱(paper_trading_ticks payload.decision.intradaySnapshot)을 그날 이후
--       분봉 경로와 대조해 WIN/LOSS/NEUTRAL/UNRESOLVED 로 채점한다. HOLD 틱도 스냅샷 레벨로
--       "만약 그 레벨로 진입했다면"의 반사실(counterfactual) 라벨을 남겨, conviction 컷·임계값
--       캘리브레이션(PR-3a/PR-4)의 근거 데이터가 된다.
--
-- 설계: tick_id PK + merge-duplicates upsert 로 재실행 멱등. 진화 여지가 있는 정량 필드
--       (시그널 점수·손익비·레벨·conviction placeholder)는 payload jsonb 에 싣고(무마이그레이션),
--       집계 필터용 최소 컬럼만 둔다(paper-trading.sql 선례 동일).
--
-- ⚠️ Supabase SQL Editor 에서 **수동 1회 실행** 필요(paper-trading.sql 등 선례 동일).
--    미생성 시 라벨 저장은 fail-soft skip — 모의투자 흐름은 기존과 동일하게 동작한다.

create table if not exists public.intraday_tick_labels (
  tick_id     text        primary key,                 -- paper_trading_ticks.id (soft FK, 멱등 upsert 키)
  session_id  text        not null,                    -- paper_trading_sessions.id (soft FK)
  ticker      text        not null,
  tick_index  int         not null,
  decided_at  timestamptz,                             -- 판단 시각(tickWindowStart)
  action      text        not null,                    -- BUY / HOLD / SELL / INCREASE / REDUCE / EXIT
  source      text        not null,                    -- intraday-cli / intraday-fallback
  label       text        not null,                    -- WIN / LOSS / NEUTRAL / UNRESOLVED
  return_pct  numeric,                                 -- 방향 적용 실현 수익률(%) — UNRESOLVED 는 null
  exit_minutes int,                                    -- 판단→청산까지 경과 분 — UNRESOLVED 는 null
  payload     jsonb,                                   -- 시그널 score/action/confidence·rrr·tp/sl·기준가·conviction placeholder
  labeled_at  timestamptz default now()
);

create index if not exists intraday_tick_labels_session_idx
  on public.intraday_tick_labels (session_id);

create index if not exists intraday_tick_labels_ticker_idx
  on public.intraday_tick_labels (ticker);

-- RLS: service role 만 접근(서버 route handler 전용). anon 노출 없음 — 선례(paper_trading_ticks) 동일.
alter table public.intraday_tick_labels enable row level security;
