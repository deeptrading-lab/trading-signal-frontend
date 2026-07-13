-- 단타 오토파일럿(자동 포트폴리오) 런 영속 — intraday-autopilot.
-- Supabase SQL Editor 에서 수동 1회 실행(paper-trading.sql 선례와 동일).
--
-- 설계: in-memory(runStore)가 1차 진실, 이 테이블은 write-through 백업 + 부팅 hydrate.
-- 필드 컬럼 대신 payload(jsonb) 무마이그레이션 진화 + 필터용 최소 컬럼(id/status/owner).
-- owner = 서버 운영자(resolveServerOperator) — 공유 Supabase 다중 서버에서 hydrate 를
-- 내 런으로 한정하는 격리 키(런은 세션과 달리 타 운영자 표시 요구가 없다).

create table if not exists public.paper_trading_autopilot_runs (
  id         text        primary key,          -- 런 UUID(서버 생성)
  status     text        not null,             -- active / stopped / completed
  owner      text        not null,             -- 서버 운영자(소유자 게이트 키)
  payload    jsonb       not null,             -- AutopilotRun 전체(슬롯·쿨다운·로테이션 로그)
  updated_at timestamptz not null default now()
);

create index if not exists paper_trading_autopilot_runs_owner_updated_idx
  on public.paper_trading_autopilot_runs (owner, updated_at desc);

-- 서비스 롤 키(BFF 서버 전용)만 접근 — RLS 활성화(정책 미부여 = anon 차단, 선례 동일).
alter table public.paper_trading_autopilot_runs enable row level security;

-- 스크리너 스냅샷(append-only) — 종목 선정 품질 사후 검증용. 매 스윕의 전체 랭킹(점수·가격)·
-- 탈락 사유·실제 편입/교체를 남겨 "뽑은 종목 vs 안 뽑은/탈락 종목"의 사후 수익률 비교를 가능케 한다.
-- id = runId:sweepWindowStart (창당 1행 멱등). 파일 전체 재실행 안전(if not exists).
create table if not exists public.paper_trading_autopilot_screener_snapshots (
  id         text        primary key,          -- `${run_id}:${sweep_window_start}`
  run_id     text        not null,
  owner      text        not null,
  payload    jsonb       not null,             -- AutopilotScreenerSnapshot 전체
  created_at timestamptz not null default now()
);

create index if not exists paper_trading_autopilot_snapshots_run_idx
  on public.paper_trading_autopilot_screener_snapshots (run_id, created_at desc);

alter table public.paper_trading_autopilot_screener_snapshots enable row level security;
