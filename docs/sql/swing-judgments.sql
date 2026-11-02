-- swing_judgments — 스윙 스크리너 매일 판정(PRD `swing-judgment` PR-2).
--
-- 매 영업일 아침(07:20 KST) 전 거래일 확정 데이터로 유니버스 전 종목을 판정해 압축 열만 저장한다.
-- 목록(`/api/swing/screener`)과 전진 검증(오프라인 감사가 이 행 + 일봉으로 5·10일 결과 계산)의 원장.
-- 전체 판정 JSON 은 저장하지 않는다 — 상세는 같은 엔진으로 즉시 계산(`/api/swing/judgment/[ticker]`).
--
-- 적용: Supabase SQL Editor 에서 1회 실행(멱등). 서버(service_role)만 접근 — RLS 켜고 정책 없음.
-- 크기: 하루 약 1,200행 × 약 250바이트 ≈ 연 80~150MB(인덱스 포함).
-- 정리(필요할 때만): delete from public.swing_judgments where trade_date < now() - interval '2 years';

create table if not exists public.swing_judgments (
  trade_date date not null,
  ticker text not null check (ticker ~ '^\d{6}$'),
  rulebook_version text not null,
  market text not null check (market in ('KOSPI', 'KOSDAQ')),
  source text not null default 'screener' check (source in ('screener', 'on_demand')),
  grade text not null check (grade in ('excluded', 'candidate', 'interest', 'neutral')),
  met_count smallint not null check (met_count between 0 and 7),
  flow_pass boolean not null,
  exclusions text[] not null default '{}',
  items integer not null,
  stage text,
  close numeric not null,
  adv20 numeric,
  plan_stop numeric,
  plan_target numeric,
  plan_rr numeric,
  input_hash text not null,
  created_at timestamptz not null default now(),
  primary key (trade_date, ticker, rulebook_version)
);

create index if not exists swing_judgments_list_idx
  on public.swing_judgments (rulebook_version, trade_date desc, adv20 desc);
create index if not exists swing_judgments_ticker_idx
  on public.swing_judgments (ticker, trade_date desc);

alter table public.swing_judgments enable row level security;

-- 2026-11-02 swing-ui-followups: 최근 5일 주체별 순매수(억 원) — 목록 매트릭스 표시용. 기존 행은 null.
alter table public.swing_judgments add column if not exists flow jsonb;
