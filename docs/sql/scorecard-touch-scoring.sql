-- scorecard phase-2 — 목표/무효화 **터치 기반 채점** 컬럼 추가.
--
-- 배경
--   phase-1 채점은 horizon(d1/w1/w2/m1) 시점의 **종가 방향**만 본다. 정작 판정이 스스로 내건
--   검증 가능한 약속(목표가·무효화 라인)은 저장만 하고 채점에 쓰지 않았다.
--   #350 으로 약세 콜의 target(하방 재진입)과 stop(상방 무효화)이 **반대 방향 밴드**가 되면서
--   비로소 "무엇이 먼저 닿았나"가 판별력을 갖게 됐다(구 시맨틱은 둘 다 하방이라 동시 터치 19/39).
--   사후검증(2026-07-28)에서 무효화 라인은 3건 발동·2건이 일주일 앞선 조기경보로 작동했고,
--   이 값을 매일 기록하면 /analyze 배지의 "현재 상태만 본다"는 한계도 함께 풀린다.
--
-- 설계 메모
--   1. **절대 레벨을 저장**한다(target_price/stop_price). pct 의 해석은 바뀔 수 있고(실제로 #350 이
--      stop 의 부호 의미를 바꿨다) 나중에 재계산하면 과거 행을 잘못 해석하게 된다. 삽입 시점 해석을
--      동결해 두면 그 판정이 당시 무엇을 약속했는지가 보존된다.
--   2. 기준가는 **live_price**(결정시점 라이브 현재가)다. target_pct·stop_loss_pct 는 LLM 에 넘긴
--      "현재가" 대비 % 이므로, 채점 entry 인 entry_close(asOf 봉 종가)와 다를 수 있다.
--      live_price 가 없는 legacy 행(약 5%)은 채우지 않고 건너뛴다(잘못된 기준가로 오채점 금지).
--   3. 터치일 2개만 두고 **"무엇이 먼저"는 날짜 비교로 파생**한다(중복 상태 컬럼을 만들지 않는다).
--   4. touch_scanned_through 는 증분 스캔 커서다. 매 실행이 전 구간을 다시 훑지 않게 하고,
--      같은 입력에 같은 결과(멱등)를 보장한다.
--
-- ⚠️ 코드 머지 **전에** prod Supabase 에 수동 선적용한다(프로젝트 관례). 멱등이라 재실행 무해.

-- 판정이 내건 절대 레벨 — 삽입 시점 해석 동결(호가단위 반올림은 앱이 수행).
alter table public.signal_scorecard add column if not exists target_price numeric;
alter table public.signal_scorecard add column if not exists stop_price numeric;

-- 최초 터치일. 미터치면 null 로 남는다(= 아직 닿지 않음).
alter table public.signal_scorecard add column if not exists target_hit_date date;
alter table public.signal_scorecard add column if not exists stop_hit_date date;

-- 증분 스캔 커서 — 이 날짜까지 일봉을 훑었다. null 이면 한 번도 스캔 안 함.
alter table public.signal_scorecard add column if not exists touch_scanned_through date;

-- 스캔 대상(커서 없음·오래된 커서) 빠른 탐색. nulls first 로 미스캔 행이 앞에 온다.
-- 2차 키는 **entry_date desc** — 스캐너가 활성 구간(최신 판정)을 먼저 처리하도록 정렬을 맞춘다.
-- ※ 이미 asc 버전(signal_scorecard_touch_cursor_idx)을 만들었다면 아래 desc 인덱스만 추가하면 된다
--    (create index if not exists 는 기존 인덱스를 교체하지 않는다). 행 수가 적을 땐 선택 사항.
create index if not exists signal_scorecard_touch_cursor_desc_idx
  on public.signal_scorecard (touch_scanned_through nulls first, entry_date desc);

comment on column public.signal_scorecard.target_price is
  '판정의 목표가(강세) 또는 재진입 구간(약세) 절대가(KRW) = live_price × (1 + target_pct/100). 삽입 시점 해석 동결';
comment on column public.signal_scorecard.stop_price is
  '판정의 테제 무효화 라인 절대가(KRW) = live_price × (1 + stop_loss_pct/100). 강세=하방 손절 / 약세=상방 무효화(#350)';
comment on column public.signal_scorecard.target_hit_date is
  '목표/재진입 최초 터치일. 강세 target 은 고가 ≥ target_price, 약세 재진입은 저가 ≤ target_price 기준. 미터치면 null';
comment on column public.signal_scorecard.stop_hit_date is
  '무효화/손절 최초 터치일. 약세 무효화는 고가 ≥ stop_price(상방 돌파), 강세 손절은 저가 ≤ stop_price(하방 이탈). 미터치면 null';
comment on column public.signal_scorecard.touch_scanned_through is
  '터치 스캔 커서 — 이 날짜까지 일봉을 확인함(증분·멱등). null 이면 미스캔';

-- ⚠️ 집계 주의: #350 이전 legacy 약세 행(verdict 가 약세인데 stop_loss_pct < 0)은 target·stop 이
--    둘 다 하방이라 두 라인이 같은 사건을 가리킨다(감사에서 39건 중 19건이 같은 날 동시 터치).
--    터치 선후를 집계할 때는 그 행들을 반드시 제외한다 — 코드에선 lib/server/scorecard/touchScoring
--    의 isLegacyBearishSemantics() 를 쓴다.
