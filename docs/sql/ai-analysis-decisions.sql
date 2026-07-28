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
