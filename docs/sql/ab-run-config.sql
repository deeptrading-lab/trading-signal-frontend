-- A/B 토큰 최적화 하니스 — run 단위 config 태깅 원장.
-- 한 분석 run(run_id) = 1행. session 으로 한 A/B 실험 배치를 묶는다.
-- 기존 ai_agent_usage·signal_scorecard 스키마는 건드리지 않는다(별도 테이블, 무회귀).
-- run_id 로 ai_agent_usage·signal_scorecard 와 LEFT JOIN 해 config 별 비교.
create table if not exists public.ab_run_config (
  run_id       uuid        primary key,
  session      text        not null,   -- 한 A/B 실험 배치 식별자
  config_id    text        not null,   -- 'A' | 'B' | 커스텀
  config_label text,                   -- 사람이 읽는 라벨(예: "debateRounds=1")
  ticker       text,
  params_json  jsonb,                  -- 사용한 AnalysisConfigOverride(재현성)
  created_at   timestamptz not null default now()
);

create index if not exists ab_run_config_session_idx on public.ab_run_config (session);
