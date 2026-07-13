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
