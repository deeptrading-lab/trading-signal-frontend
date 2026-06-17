-- AI 분석 에이전트(analyst)별 토큰 사용량 이력(append-only).
-- ai_analysis_decisions(ticker PK, upsert)와 달리 매 agent 호출 1행씩 누적한다.
-- 목적: 분석가/단계/provider별 토큰 분해로 최적화 포인트(특히 후단 누적 입력) 발굴.

create table if not exists public.ai_agent_usage (
  id          bigint generated always as identity primary key,
  run_id      uuid        not null,                         -- 분석 1회(12 agent)를 묶는 키
  ticker      text        not null,
  agent_key   text        not null,                         -- AgentKey 12종. bull/bear는 라운드별 다중 행
  stage       text        not null check (stage in ('A', 'B', 'C')),
  round       smallint,                                     -- 토론 라운드(1·2), 그 외 null
  provider    text        not null check (provider in ('claude', 'codex')),
  model       text,                                         -- 응답 메타 모델명, 없으면 null
  measured    boolean     not null default true,            -- false = 토큰 미측정(codex 미지원). null 토큰과 0 구분

  input_tokens                integer,                      -- fresh 입력(캐시 비적중). null = 미측정
  output_tokens               integer,
  cache_creation_input_tokens integer,                      -- 캐시 생성(쓰기). claude 전용
  cache_read_input_tokens     integer,                      -- 캐시 적중(읽기). claude 전용
  cost_usd                    numeric(12, 6),               -- total_cost_usd, 없으면 null

  duration_ms integer,                                      -- agent 소요(부수 지표)
  created_at  timestamptz not null default now()
);

comment on table public.ai_agent_usage is
  'AI 분석 에이전트별 토큰 사용량 이력(append-only). run_id로 분석 1회를 묶는다.';
comment on column public.ai_agent_usage.stage is
  'A=분석가(market/news/fundamentals/social), B=토론(bull/bear), C=매니저 체인';
comment on column public.ai_agent_usage.measured is
  'false면 토큰 미측정(codex). 대시보드에서 평균 집계 제외·라벨 처리';
comment on column public.ai_agent_usage.input_tokens is
  'fresh 입력(캐시 비적중). 캐시 적중분은 cache_read_input_tokens에 별도';

-- 대시보드 집계: provider/agent별 group-by + 최신순 조회 가속.
create index if not exists ai_agent_usage_created_idx    on public.ai_agent_usage (created_at desc);
create index if not exists ai_agent_usage_run_idx        on public.ai_agent_usage (run_id);
create index if not exists ai_agent_usage_agent_prov_idx on public.ai_agent_usage (provider, agent_key);
create index if not exists ai_agent_usage_ticker_idx     on public.ai_agent_usage (ticker);
