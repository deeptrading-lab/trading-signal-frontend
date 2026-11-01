-- 스윙 체크 AI 노트(뉴스·공시 정리) — PRD swing-judgment PR-4.
--
-- 흐름: 종목 화면 "AI로 뉴스 정리" → BFF POST /api/swing/note/[ticker] → 이 테이블에 status='pending' 1행 →
--       로컬 워커(scripts/analysisWorker.ts)가 claim(processing) → CLI 에이전트 1회(웹 검색) → 고정 JSON 검증 →
--       items 저장(done) 또는 error(failed).
--
-- ⚠️ 판정(swing_judgments)과 무관한 별도 테이블이다. 등급·조건·가격 컬럼이 아예 없다 — AI 는 판정에 손대지 않는다.
-- ⚠️ Supabase SQL Editor 에서 **수동 1회 실행** 필요. 미적용이면 화면은 "불러오지 못했어요"만, 판정·분석 흐름은 무회귀.

create table if not exists public.swing_ai_notes (
  id           bigint      generated always as identity primary key,
  ticker       text        not null,
  name         text,                                        -- 요청 시점 종목명(프롬프트용)
  status       text        not null default 'pending'
                 check (status in ('pending', 'processing', 'done', 'failed')),
  items        jsonb,                                       -- done: 검증 통과 항목 배열(최대 10, 0건 = 최근 뉴스 없음)
  error        text,                                        -- failed 사유
  requested_by text,                                        -- 요청 계정(로그인 이메일), 로컬은 null
  worker_id    text,
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz,
  finished_at  timestamptz
);

-- 종목별 최신 노트 조회(GET) — ticker + created_at desc.
create index if not exists swing_ai_notes_ticker_created_idx
  on public.swing_ai_notes (ticker, created_at desc);

-- 워커 폴링(pending FIFO)·대기 상한 집계.
create index if not exists swing_ai_notes_pending_idx
  on public.swing_ai_notes (created_at)
  where status = 'pending';

-- 종목당 진행 중(pending·processing) 노트는 1행만 — 동시 요청이 CLI 를 두 번 돌리지 않게(앱은 409 면 기존 행 반환).
create unique index if not exists swing_ai_notes_one_active_per_ticker
  on public.swing_ai_notes (ticker)
  where status in ('pending', 'processing');

-- 멈춘 처리 정리(processing + claimed_at < cutoff).
create index if not exists swing_ai_notes_processing_idx
  on public.swing_ai_notes (claimed_at)
  where status = 'processing';

-- PostgREST anon/authenticated 접근 차단 — service role 서버(BFF·워커)만.
alter table public.swing_ai_notes enable row level security;
