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

-- /analyze 카드 목록 Egress 절감:
-- 최신 결론 20건의 카드 필드만 projection하고, 종목별 최신 ai_agent_usage run 합계를 DB 안에서 계산한다.
-- decision/sentiment 전체 JSON과 usage 원본 1,000행을 BFF로 전송하지 않는다.
create index if not exists ai_agent_usage_ticker_created_idx
  on public.ai_agent_usage (ticker, created_at desc);

create or replace function public.get_ai_decision_card_summaries(p_limit integer default 20)
returns table (
  ticker text,
  name text,
  provider text,
  updated_at timestamptz,
  verdict text,
  time_horizon text,
  limited_data boolean,
  bars integer,
  signal_score numeric,
  run_id uuid,
  total_input_tokens bigint,
  total_output_tokens bigint,
  total_cost_usd numeric,
  measured boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_decisions as (
    select d.*
    from public.ai_analysis_decisions d
    order by d.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 20))
  )
  select
    d.ticker,
    d.name,
    d.provider,
    d.updated_at,
    d.decision ->> 'verdict' as verdict,
    d.decision ->> 'time_horizon' as time_horizon,
    case
      when jsonb_typeof(d.decision -> 'limitedData') = 'boolean'
        then (d.decision ->> 'limitedData')::boolean
      else false
    end as limited_data,
    case
      when jsonb_typeof(d.decision -> 'bars') = 'number'
        then (d.decision ->> 'bars')::integer
      else 0
    end as bars,
    case
      when jsonb_typeof(d.signal -> 'score') = 'number'
        then (d.signal ->> 'score')::numeric
      else null
    end as signal_score,
    usage_summary.run_id,
    usage_summary.total_input_tokens,
    usage_summary.total_output_tokens,
    usage_summary.total_cost_usd,
    usage_summary.measured
  from latest_decisions d
  left join lateral (
    select
      u.run_id,
      case when bool_and(u.measured) then
        sum(
          coalesce(u.input_tokens, 0)
          + coalesce(u.cache_creation_input_tokens, 0)
          + coalesce(u.cache_read_input_tokens, 0)
        )
      else null end::bigint as total_input_tokens,
      case when bool_and(u.measured)
        then sum(coalesce(u.output_tokens, 0))
        else null
      end::bigint as total_output_tokens,
      case when bool_and(u.measured)
        then sum(coalesce(u.cost_usd, 0))
        else null
      end as total_cost_usd,
      bool_and(u.measured) as measured
    from public.ai_agent_usage u
    where u.run_id = (
      select latest_usage.run_id
      from public.ai_agent_usage latest_usage
      where latest_usage.ticker = d.ticker
      order by latest_usage.created_at desc
      limit 1
    )
    group by u.run_id
  ) usage_summary on true
  order by d.updated_at desc;
$$;

revoke all on function public.get_ai_decision_card_summaries(integer)
  from public, anon, authenticated;
grant execute on function public.get_ai_decision_card_summaries(integer)
  to service_role;

-- ============================================================
-- analyze-owner-cards — 계정별 카드 분리.
-- ⚠️ Supabase SQL Editor 에서 **수동 1회 실행** 필요(기존 컬럼 추가 선례 동일).
--
-- 변경: PK 를 ticker → (ticker, requested_by) 복합키로. 종목당 1행이 아니라
--       **계정당 1행**이 된다. "최신 1건만 유지"는 그대로 — 같은 계정이 같은 종목을
--       재분석하면 그 계정 행만 덮어쓴다.
--
-- 노출 규칙(단순 2분기):
--   · 로그인 → `requested_by = 내 계정` 행만.
--   · 미로그인 → `requested_by = ''`(세션 없이 저장된 분석) + 데모 종목(p_demo_tickers).
-- ============================================================

alter table public.ai_analysis_decisions
  add column if not exists requested_by text;

-- 기존 분석 종목(레거시)의 소유자 귀속.
-- ✅ 운영 DB 에서 **실행 완료**(2026-08-23) — 레거시 5건이 운영자 Google 계정으로 귀속됐다.
--    `where requested_by is null` 이라 지금 재실행하면 0행(멱등). 아래 이메일은 신규 환경에서
--    이 파일을 처음 적용할 때만 의미가 있으니, 그때 자기 로그인 계정으로 바꿔서 실행할 것.
update public.ai_analysis_decisions
   set requested_by = '<YOUR_GOOGLE_LOGIN_EMAIL>'
 where requested_by is null;

-- 이후 세션 없이(로컬 dev 등) 저장되는 분석의 소유자 = '' . PK 컬럼이라 null 을 못 쓴다.
alter table public.ai_analysis_decisions
  alter column requested_by set default '';
alter table public.ai_analysis_decisions
  alter column requested_by set not null;

-- ticker 단일 PK → (ticker, requested_by) 복합 PK. 멱등(이미 복합키면 skip).
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where c.conname = 'ai_analysis_decisions_pkey'
      and t.relname = 'ai_analysis_decisions'
      and array_length(c.conkey, 1) = 1
  ) then
    alter table public.ai_analysis_decisions drop constraint ai_analysis_decisions_pkey;
    alter table public.ai_analysis_decisions
      add constraint ai_analysis_decisions_pkey primary key (ticker, requested_by);
  end if;
end $$;

-- 카드 토큰 합계의 귀속 키. 한 종목에 여러 계정 행이 생기면 "그 종목의 최신 run" 으로는
-- 남의 분석 토큰이 내 카드에 붙는다 → 행이 자기 run 을 들고 있어야 한다.
alter table public.ai_analysis_decisions
  add column if not exists run_id uuid;

comment on column public.ai_analysis_decisions.requested_by is
  '분석을 요청한 계정 이메일(소문자). PK 일부. '''' = 세션 없이 저장된 분석(미로그인 전용 노출)';
comment on column public.ai_analysis_decisions.run_id is
  '이 결론을 만든 분석 run(ai_agent_usage.run_id). 카드 토큰 합계 귀속용. legacy 행은 null';

-- 계정별 목록 조회(requested_by 필터 + updated_at 정렬) 가속.
create index if not exists ai_analysis_decisions_requested_by_updated_idx
  on public.ai_analysis_decisions (requested_by, updated_at desc);

-- 파라미터가 늘면 기존 시그니처와 오버로드 충돌(PostgREST 모호성) → 먼저 제거한다.
drop function if exists public.get_ai_decision_card_summaries(integer);
drop function if exists public.get_ai_decision_card_summaries(integer, text);

create or replace function public.get_ai_decision_card_summaries(
  p_limit integer default 20,
  p_requested_by text default null,
  p_demo_tickers text[] default null
)
returns table (
  ticker text,
  name text,
  provider text,
  updated_at timestamptz,
  verdict text,
  time_horizon text,
  limited_data boolean,
  bars integer,
  signal_score numeric,
  run_id uuid,
  total_input_tokens bigint,
  total_output_tokens bigint,
  total_cost_usd numeric,
  measured boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with visible as (
    -- 미로그인 데모 종목은 계정 수만큼 행이 있을 수 있다 → 종목당 최신 1건으로 접는다.
    -- (로그인 분기는 복합 PK 라 이미 종목당 1건 — distinct on 이 no-op.)
    select distinct on (d.ticker) d.*
    from public.ai_analysis_decisions d
    where case
      when p_requested_by is not null then d.requested_by = p_requested_by
      else d.requested_by = ''
        or d.ticker = any(coalesce(p_demo_tickers, array[]::text[]))
    end
    order by d.ticker, d.updated_at desc
  ),
  latest_decisions as (
    -- ⚠️ limit 은 필터·중복제거 **뒤**에 — 먼저 자르면 내 카드가 남의 카드에 밀려 사라진다.
    select * from visible
    order by updated_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 20))
  )
  select
    d.ticker,
    d.name,
    d.provider,
    d.updated_at,
    d.decision ->> 'verdict' as verdict,
    d.decision ->> 'time_horizon' as time_horizon,
    case
      when jsonb_typeof(d.decision -> 'limitedData') = 'boolean'
        then (d.decision ->> 'limitedData')::boolean
      else false
    end as limited_data,
    case
      when jsonb_typeof(d.decision -> 'bars') = 'number'
        then (d.decision ->> 'bars')::integer
      else 0
    end as bars,
    case
      when jsonb_typeof(d.signal -> 'score') = 'number'
        then (d.signal ->> 'score')::numeric
      else null
    end as signal_score,
    usage_summary.run_id,
    usage_summary.total_input_tokens,
    usage_summary.total_output_tokens,
    usage_summary.total_cost_usd,
    usage_summary.measured
  from latest_decisions d
  left join lateral (
    select
      u.run_id,
      case when bool_and(u.measured) then
        sum(
          coalesce(u.input_tokens, 0)
          + coalesce(u.cache_creation_input_tokens, 0)
          + coalesce(u.cache_read_input_tokens, 0)
        )
      else null end::bigint as total_input_tokens,
      case when bool_and(u.measured)
        then sum(coalesce(u.output_tokens, 0))
        else null
      end::bigint as total_output_tokens,
      case when bool_and(u.measured)
        then sum(coalesce(u.cost_usd, 0))
        else null
      end as total_cost_usd,
      bool_and(u.measured) as measured
    from public.ai_agent_usage u
    -- 자기 run 우선. legacy 행(run_id null)만 종전처럼 "그 종목의 최신 run" 으로 폴백한다.
    where u.run_id = coalesce(
      d.run_id,
      (
        select latest_usage.run_id
        from public.ai_agent_usage latest_usage
        where latest_usage.ticker = d.ticker
        order by latest_usage.created_at desc
        limit 1
      )
    )
    group by u.run_id
  ) usage_summary on true
  order by d.updated_at desc;
$$;

revoke all on function public.get_ai_decision_card_summaries(integer, text, text[])
  from public, anon, authenticated;
grant execute on function public.get_ai_decision_card_summaries(integer, text, text[])
  to service_role;
