-- AI 모의투자(단타워치) 세션·틱 영구 저장 — intraday-paper-watch.
--
-- 목적: 단타 판단(AI 결정·게이트 조정)과 가상 체결(주문·비용·실현손익) 로그를 dev 서버 재시작
--       너머로 축적한다. 이 데이터가 AI 단타 판단 고도화(사후 분석·프롬프트 개선)의 원장이 된다.
--
-- 설계: in-memory sessionStore 가 1차 진실, 본 테이블은 write-through 백업 + 부팅 hydrate 원천.
--       필드 컬럼 대신 payload jsonb(무마이그레이션 진화) + 필터용 최소 컬럼만 둔다.
--
-- ⚠️ Supabase SQL Editor 에서 **수동 1회 실행** 필요(ai_analysis_queue 등 선례 동일).
--    미생성 시 저장은 fail-soft skip — 모의투자 흐름은 기존(메모리 전용)과 동일하게 동작한다.

create table if not exists public.paper_trading_sessions (
  id                text        primary key,               -- 세션 UUID (서버 생성)
  status            text        not null,                  -- running / paused / completed / failed
  decision_provider text        not null,                  -- mock / existing-ai / cli-agent
  payload           jsonb       not null,                  -- PaperTradingSession 전체
  positions         jsonb       not null default '[]',     -- PaperTradingPosition[] 현재 스냅샷
  updated_at        timestamptz not null default now()
);

create table if not exists public.paper_trading_ticks (
  id          text        primary key,                     -- 틱 UUID (서버 생성, 중복 발화 멱등)
  session_id  text        not null,                        -- paper_trading_sessions.id (soft FK)
  tick_index  int         not null,
  payload     jsonb       not null,                        -- PaperTradingTick 전체(결정·스냅샷·주문·비용·실현손익)
  created_at  timestamptz not null default now()
);

create index if not exists paper_trading_ticks_session_idx
  on public.paper_trading_ticks (session_id, tick_index);

create index if not exists paper_trading_sessions_updated_idx
  on public.paper_trading_sessions (updated_at desc);

-- RLS: service role 만 접근(서버 route handler 전용). anon 노출 없음 — 선례(ai_analysis_queue) 동일.
alter table public.paper_trading_sessions enable row level security;
alter table public.paper_trading_ticks enable row level security;
