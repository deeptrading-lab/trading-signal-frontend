-- prod 배포 주소에서 AI 종합분석을 "요청(enqueue)"하는 비동기 큐 — 로컬 워커가 드레인한다.
-- (PRD analysis-request-queue §3-3·§3-7)
--
-- 흐름: prod 브라우저 → enqueue BFF(Supabase INSERT) → 이 테이블에 status='pending' 1행 →
--       로컬 워커가 폴링으로 claim(processing) → 기존 분석 핸들러(SSE) 끝까지 소비 →
--       기존 upsertAIDecision 경로로 ai_analysis_decisions 에 결론 저장 → status='done'.
--
-- 기존 ai_analysis_decisions·ai_agent_usage·signal_scorecard 는 건드리지 않는다(별도 테이블, 무회귀).
--
-- ⚠️ Supabase SQL Editor 에서 **수동 1회 실행** 필요(ai_agent_usage·ai_analysis_decisions 선례 동일).
--    미생성 시 enqueue 는 fail-soft 로 막히고 명확한 안내만 — 분석 흐름은 무너지지 않는다(PRD AC-12).

create table if not exists public.ai_analysis_queue (
  id           bigint      generated always as identity primary key,
  ticker       text        not null,
  status       text        not null default 'pending'
                 check (status in ('pending', 'processing', 'done', 'failed')),
  force        boolean     not null default false,        -- 강제 재분석 여부(신선도 무시 요청)
  source       text        not null default 'prod'         -- 작업 출처(unified-analysis-jobs): prod enqueue / local 직접 / bot
                 check (source in ('prod', 'local', 'bot')),
  worker_id    text,                                       -- claim 한 워커 식별자, pending 동안 null
  error        text,                                       -- markFailed 사유(실패 시), 그 외 null
  -- 인증 후속(PRD §4/§9 q5) 자리만 비워둠 — v1 은 ticker 단위로만 동작.
  requested_by text,                                       -- nullable. 인증 머지 후 사용자 식별자 채움
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz,                                -- pending→processing 전이 시각
  finished_at  timestamptz                                 -- done/failed 종결 시각
);

-- 워커 폴링은 status='pending' 을 created_at 오름차순(FIFO)으로 조회 → 부분 인덱스로 가속.
create index if not exists ai_analysis_queue_pending_idx
  on public.ai_analysis_queue (created_at)
  where status = 'pending';

-- 중복 가드(findActiveByTicker)·stuck 복구(recoverStuck)는 ticker·status 로 조회 → 복합 인덱스.
create index if not exists ai_analysis_queue_ticker_status_idx
  on public.ai_analysis_queue (ticker, status);

-- stuck 복구(processing + claimed_at < cutoff)는 status·claimed_at 으로 조회.
create index if not exists ai_analysis_queue_processing_idx
  on public.ai_analysis_queue (claimed_at)
  where status = 'processing';

-- PostgREST anon/authenticated 접근은 차단하고 service role 서버(BFF·워커) 접근만 허용한다.
-- service role 은 RLS 를 우회하므로 enqueue·claim·status 전이에는 영향이 없다.
alter table public.ai_analysis_queue enable row level security;

-- 기존 배포 DB 에 신규 컬럼 추가(멱등) — 이미 테이블이 있으면 컬럼만 보강.
alter table public.ai_analysis_queue
  add column if not exists requested_by text;

-- unified-analysis-jobs: 작업 출처 컬럼(전 소스 트래커). 기존 행은 모두 prod enqueue 분이므로 default 'prod' 안전(무손실).
-- (check 제약은 fresh create 에만 — 기존 DB 보강은 컬럼만, 값 검증은 앱(queueStore)에서.)
alter table public.ai_analysis_queue
  add column if not exists source text not null default 'prod';

comment on table public.ai_analysis_queue is
  'prod 분석 요청 큐. 로컬 워커가 pending 을 claim 해 기존 핸들러로 처리하고 결과는 ai_analysis_decisions 에 저장';

comment on column public.ai_analysis_queue.status is
  'pending(대기) | processing(워커 처리 중) | done(완료) | failed(처리 실패)';

comment on column public.ai_analysis_queue.force is
  '강제 재분석 요청 여부(신선도 무시). 기본 false';

comment on column public.ai_analysis_queue.worker_id is
  'claim 한 워커 식별자. pending 동안 null';

comment on column public.ai_analysis_queue.requested_by is
  '요청자 식별자(인증 후속 PRD §9 q5 자리). v1 은 미사용 nullable';
