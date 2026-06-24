# PRD — ai-paper-trading (AI 기반 자체 모의투자 시뮬레이션)

- **slug**: `ai-paper-trading`
- **작성일**: 2026-06-24
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/ai-paper-trading`
- **UI 포함 여부**: **yes** — 모의투자 대시보드, 세션 상세, 의사결정 타임라인, 포지션/자산 곡선.
- **상위 컨텍스트**: `ai-decision-confidence`, `signal-scorecard`, `scorecard-feedback`, `slide-to-analyze` 후속. 기존 AI 판정 저장·채점 backbone 위에 "가상의 자금으로 계속 의사결정하는 운용 루프"를 얹는다.

---

## 1. 배경 / 문제

현재 FinSight 는 종목 단위 AI 분석과 신호 채점(scorecard)을 제공한다. 하지만 분석 결과는 대부분 "지금 이 종목을 어떻게 볼지"에 머물고, **가상의 포트폴리오를 들고 시간에 따라 매수·매도·보유 결정을 반복하는 운용 흐름**은 없다.

사용자가 원하는 새 기능은 단순 백테스트가 아니다.

- 시작 투자금 100 같은 가상 원금을 둔다.
- AI가 시장/종목/기존 포지션을 보고 투자 비중을 정한다.
- 1일 시뮬레이션 중 30분마다 재판단한다.
- 매번 "유지할지, 방향을 바꿀지, 현금화할지, 비중을 줄일지"를 기록한다.
- 결과는 100 → 80 → 90 → 103 처럼 자산 흐름으로 보인다.
- 모의투자지만 사용자는 이 흐름을 보고 실제 액션의 참고 자료로 삼을 수 있다.

즉 제품의 핵심은 **AI 분석을 한 번 보고 끝내는 것이 아니라, 포지션을 가진 상태에서 반복 의사결정을 하는 투자 운용 실험실**을 만드는 것이다.

### 1-1. 현재 구조에서 재사용할 수 있는 자산

| 자산 | 재사용 방식 |
|---|---|
| `app/api/stock/ai-analysis/route.ts` | 단일 종목 AI 분석/최종 판정 로직. phase-1 에서는 모의투자 decision runner 가 이 결과를 입력으로 사용한다. |
| `lib/types/stock/aiAnalysis.ts` | `FinalDecision`, `DecisionSignal` 타입을 모의투자 의사결정 입력으로 재사용. |
| `app/api/stock/snapshot/route.ts` · `lib/server/stock/snapshot.ts` | 종목 현재가/스냅샷 조회. 30분 재평가 시 mark-to-market 가격 소스. |
| `lib/api/kis/*` | KIS 시세 프록시. 브라우저 직접 호출 금지, route handler/server util 경유. |
| `signal-scorecard` 계열 | AI 판정 사후 채점 구조. 모의투자도 별도 ledger 를 두되, 적중률/수익률 평가 철학을 공유. |
| `lib/copy/*` | 사용자 노출 한글 카피 분리 원칙 유지. |

### 1-2. 핵심 제약

- **C1 — 브라우저는 FastAPI/KIS/Supabase 를 직접 호출하지 않는다.** 모의투자 실행·저장·가격 조회는 모두 Next route handler(BFF) 또는 server util 이 담당한다.
- **C2 — MVP 현재 단계에서는 DB를 붙이지 않는 원칙이 있으나, 이 기능은 "시간에 따라 누적되는 ledger"가 본질이다.** 따라서 phase-1 은 local/mock/in-memory 또는 파일 없는 서버 계산으로 시작할 수 있지만, 실제 운영형 모의투자에는 Supabase 테이블이 필요하다. 본 PRD는 DB 적용 시점까지 포함해 설계하되, 구현은 단계 분리한다.
- **C3 — CLI 기반 AI 연계는 추후 경량화 버전으로 추가 예정이다.** phase-1 은 "CLI가 떠 있으면 연결 가능한 adapter 인터페이스"까지만 설계하고, 기본 실행은 기존 route handler AI 분석 결과 또는 deterministic mock decision runner 를 사용한다.
- **C4 — 30분 주기 의사결정은 Vercel Cron 만으로는 자연스럽지 않다.** 사용자가 화면에서 세션을 시작하면 route/API 호출로 tick 을 실행하거나, 추후 별도 worker/CLI loop 가 tick 을 밀어 넣는 구조가 필요하다.
- **C5 — 실제 주문 자동 실행은 비범위다.** 결과는 모의투자/참고용 의사결정 로그이며, 실제 매매 버튼·증권사 주문 API 연계는 추가하지 않는다.
- **C6 — "실제로 보고 액션할 수 있음"은 UX상 중요하지만, 제품 문구는 투자 자문/일임처럼 보이면 안 된다.** 화면에는 "모의투자 결과이며 실제 주문은 사용자가 별도로 판단"한다는 경계를 둔다.

---

## 2. 목표

- **G1 (측정 가능)**: 사용자가 종목/전략/투자금/기간을 선택해 모의투자 세션을 생성할 수 있다.
- **G2 (측정 가능)**: 세션은 30분 tick 단위로 시장 가격, 현재 포지션, 현금, 직전 AI 판단을 읽고 새 의사결정을 기록한다.
- **G3 (측정 가능)**: 각 tick 의 결과가 `cash`, `position`, `portfolio_value`, `return_pct`, `action`, `rationale` 로 남아 자산 경로(예: 100 → 80 → 90 → 103)를 재현할 수 있다.
- **G4 (측정 가능)**: AI 판단은 phase-1 에서 adapter 로 추상화되어, 현재는 기존 AI 분석/BFF 또는 mock runner 로 동작하고 추후 CLI agent runner 로 교체할 수 있다.
- **G5 (무회귀)**: 기존 `/analyze`, scorecard, stock snapshot, dashboard 흐름을 깨지 않는다. 모의투자는 별도 도메인(`paperTrading`)으로 격리한다.

---

## 3. 제품 범위

### 3-1. 신규 도메인: paperTrading

권장 라우트:

- `app/(main)/dashboard/paper-trading/page.tsx` — 모의투자 목록/생성/요약.
- `app/(main)/dashboard/paper-trading/[sessionId]/page.tsx` — 세션 상세.

권장 도메인 폴더:

- `components/paperTrading/*`
- `hooks/paperTrading/*`
- `hooks/query/useQueryPaperTrading*.ts`, `useMutationPaperTrading*.ts`
- `lib/api/paperTrading/*`
- `lib/server/paperTrading/*`
- `lib/types/paperTrading/*`
- `lib/copy/paperTrading/*`
- `lib/mock/paperTrading/*`

### 3-2. 사용자 입력

세션 생성 시 입력:

| 필드 | 설명 | 기본값 |
|---|---|---|
| `name` | 세션 이름 | "AI 모의투자" |
| `tickers` | 투자 후보 종목. phase-1 은 1~5개 권장 | 사용자가 선택 |
| `initial_cash` | 시작 투자금. 숫자 단위는 KRW 또는 normalized unit | 100 |
| `duration` | 시뮬레이션 기간 | 1거래일 |
| `tick_interval_minutes` | 의사결정 간격 | 30 |
| `max_position_pct` | 단일 종목 최대 비중 | 50% |
| `cash_buffer_pct` | 최소 현금 보유 비중 | 10% |
| `risk_mode` | 보수/균형/공격 | 균형 |
| `decision_provider` | `mock` / `existing-ai` / `cli-agent` | `existing-ai` 가능 시, 아니면 `mock` |

phase-1 은 단일 종목 세션을 먼저 구현하고, 다중 종목은 데이터 모델만 열어둔다. 다중 종목까지 한 번에 구현하면 포지션 배분·리밸런싱·동시 가격 조회 실패 처리가 커진다.

### 3-3. 세션 상태

`PaperTradingSessionStatus`:

- `draft` — 생성 전 입력 중.
- `running` — tick 실행 가능.
- `paused` — 사용자가 중지. 다음 tick 자동/수동 실행 안 함.
- `completed` — 기간 종료.
- `failed` — 복구 불가 오류. 기존 tick ledger 는 보존.

상태 전이:

```text
draft
  ↓ create
running
  ├─ pause → paused → resume → running
  ├─ complete → completed
  └─ fatal error → failed
```

### 3-4. tick 의사결정 상태

각 30분 tick 은 하나의 불변 decision record 로 남긴다.

`PaperTradingTickStatus`:

- `pending` — tick 생성됨, 아직 가격/AI 판단 전.
- `priced` — 가격 스냅샷 확보.
- `decided` — AI가 action/target allocation 반환.
- `executed` — 가상 체결 반영.
- `skipped` — 휴장/가격 없음/AI 판단 불가. 세션은 계속 가능.
- `failed` — 해당 tick 실패. 다음 tick 에 재시도 또는 skip 가능.

---

## 4. 전체 플로우

### 4-1. 사용자가 세션을 시작하는 플로우

```text
사용자
  ↓
/dashboard/paper-trading 에서 종목·투자금·위험모드 입력
  ↓ axios baseURL /api
POST /api/paper-trading/sessions
  ↓
Next route handler(BFF)
  ↓
validate input + 초기 가격 스냅샷 조회
  ↓
PaperTradingSession 생성
  ↓
첫 tick 실행(runTick)
  ↓
AI decision adapter 호출
  ↓
가상 체결 + ledger 저장
  ↓
세션 상세 화면으로 이동
```

### 4-2. 30분마다 의사결정하는 플로우

```text
tick trigger
  - 사용자가 "지금 재판단" 클릭
  - 화면이 열린 상태에서 30분 경과 후 refetch/mutation
  - 추후 CLI/worker 가 POST 호출
  ↓
POST /api/paper-trading/sessions/:id/tick
  ↓
load session + latest portfolio state
  ↓
fetch latest price snapshot via BFF/server util
  ↓
build decision context
  - 현재 현금
  - 현재 포지션
  - 평가금액
  - 누적 수익률
  - 직전 action
  - 최근 AI 분석/신호
  - 위험 한도
  ↓
decision adapter
  - mock runner
  - existing AI analysis runner
  - future CLI agent runner
  ↓
normalize decision
  - BUY / SELL / HOLD / REDUCE / INCREASE / EXIT
  - target allocation pct
  - confidence
  - rationale
  - risk notes
  ↓
virtual execution
  - 수수료/슬리피지 반영(phase-1 기본 0 또는 고정 bps)
  - max position/cash buffer 검증
  - 체결 수량/평균단가 계산
  ↓
save immutable tick ledger
  ↓
return updated portfolio path
```

### 4-3. 사용자가 실제 액션 참고로 보는 플로우

```text
세션 상세
  ↓
현재 AI 권고 액션 확인
  - 예: "비중 30% 유지"
  - 예: "손실 제한 기준 접근, 10% 축소"
  ↓
근거 확인
  - 가격 변화
  - 기존 포지션 손익
  - AI 판정 confidence
  - 리스크 메모
  ↓
사용자가 외부 증권 앱에서 별도 판단/실행
```

화면 카피는 "실행"보다 "참고", "가상 체결", "모의 판단"을 우선한다. 실제 주문 실행 CTA는 두지 않는다.

### 4-4. 거래 시간·tick window 정의

30분마다 의사결정한다는 요구는 "몇 시 기준의 가격으로 한 번만 판단했는가"가 명확해야 재현 가능하다. phase-1 은 한국 주식 장중 운용을 기본값으로 둔다.

| 항목 | 기본값 | 비고 |
|---|---|---|
| 기준 시간대 | Asia/Seoul | UI와 DB 응답 모두 `asOf` 표시 |
| 장 시작 | 09:00 | KST |
| 장 종료 | 15:30 | KST |
| tick window | 30분 | 09:00, 09:30, 10:00 ... 15:30 |
| 장외 tick | 기본 skip | 후속으로 after-hours/replay 모드 추가 가능 |
| 휴장일 | skip | 사유를 tick timeline 에 남김 |

`tick_window_start` 는 `priced_at` 을 30분 단위로 내림(floor)한 값이다. 같은 `session_id + tick_window_start` 조합에는 tick 이 1개만 존재해야 한다. 이 제약은 사용자가 버튼을 여러 번 누르거나, UI timer 와 CLI loop 가 동시에 호출해도 중복 판단이 생기지 않게 하는 핵심 안전장치다.

### 4-5. 실행 모드 분리

모의투자는 같은 엔진을 쓰되 목적에 따라 모드를 나눈다.

| 모드 | 설명 | 가격 소스 | tick trigger |
|---|---|---|---|
| `live-paper` | 실제 장중 가격으로 가상 운용 | 최신 snapshot | 수동/UI timer/CLI |
| `replay` | 과거 특정 날짜를 30분 단위로 재생 | historical intraday 또는 fixture | 내부 loop |
| `sandbox` | UI·계산 검증용 | mock fixture | 수동 |

MVP 권고는 `sandbox` → `live-paper` 순서다. `replay` 는 장중 분봉 데이터 소스가 확정된 뒤 추가한다.

---

## 5. AI decision adapter 설계

모의투자 엔진은 AI 호출 방식을 몰라야 한다. runner 를 adapter 로 분리한다.

```ts
type PaperTradingDecisionProvider = "mock" | "existing-ai" | "cli-agent";

type PaperTradingDecisionAction =
  | "BUY"
  | "SELL"
  | "HOLD"
  | "INCREASE"
  | "REDUCE"
  | "EXIT";

type PaperTradingDecision = {
  action: PaperTradingDecisionAction;
  targetAllocationPct: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  riskNotes: string[];
  expectedHoldingMinutes?: number;
  invalidationPrice?: number | null;
  source: PaperTradingDecisionProvider;
};
```

adapter 출력은 반드시 normalized decision 으로 검증한 뒤 가상 체결 엔진에 넘긴다.

- `targetAllocationPct` 는 0~100 사이 숫자여야 한다.
- `action=EXIT` 이면 `targetAllocationPct=0` 으로 정규화한다.
- `action=HOLD` 는 주문을 만들지 않는다. 단 mark-to-market 은 수행한다.
- `rationale` 은 사용자에게 보이는 한글 요약으로 저장한다. CLI agent 가 영문을 반환하면 route handler 에서 한글 요약을 만들거나 "원문"으로 별도 저장한다.
- `riskNotes` 는 빈 배열 가능하지만 필드는 항상 존재해야 한다.

### 5-1. phase-1 adapter: `mock`

용도:

- UI/ledger/가상 체결 검증.
- 외부 AI 없이 deterministic fixture 로 QA 가능.

규칙 예:

- 가격이 직전 tick 대비 +2% 이상이고 현금 여유가 있으면 `INCREASE`.
- -2% 이하이고 손실 중이면 `REDUCE`.
- 손실이 -5% 이하이면 `EXIT`.
- 그 외 `HOLD`.

### 5-2. phase-1 adapter: `existing-ai`

용도:

- 기존 AI 분석 결과를 모의투자 판단 입력으로 사용.
- 새 AI prompt 를 크게 늘리지 않고 빠르게 연결.

흐름:

1. 최근 `ai_analysis_decisions` 또는 `/api/stock/ai-analysis` 결과를 조회한다.
2. `FinalDecision.verdict`, `confidence`, `target_pct`, `stop_loss_pct`, `DecisionSignal.score/action`을 가져온다.
3. 현재 포지션 상태와 결합해 target allocation 으로 변환한다.

변환 예:

| AI 신호 | 현재 포지션 없음 | 보유 중 |
|---|---|---|
| BUY + HIGH | 30~50% 매수 | 목표 비중까지 확대 |
| BUY + MEDIUM | 10~25% 매수 | 일부 확대 또는 유지 |
| HOLD | 매수 안 함 | 유지 |
| SELL/REDUCE | 매수 안 함 | 축소 또는 청산 |

### 5-3. phase-2 adapter: `cli-agent`

용도:

- 사용자가 말한 "CLI가 떠있을거니까 이 CLI 연계"를 정식 runner 로 연결.
- 장기적으로는 경량화된 판단 agent 를 구성해 기존 무거운 분석보다 빠르게 30분 tick 판단을 내린다.

권장 구조:

```text
Next route handler
  ↓
lib/server/paperTrading/decisionProviders/cliAgent.ts
  ↓
local CLI bridge or internal HTTP bridge
  ↓
running agent process
  ↓
JSON decision response
```

주의:

- Vercel production 에서는 로컬 CLI process 에 직접 붙을 수 없다.
- 따라서 CLI agent 는 로컬 개발/운영자 머신 전용이거나, 별도 worker/service 로 띄워 HTTP bridge 를 제공해야 한다.
- phase-1 은 provider enum 과 interface 만 열어두고, 실제 CLI 연결은 후속 PRD에서 다룬다.

CLI bridge 의 최소 계약은 JSON-only 로 둔다. 자연어 전체 답변을 파싱하는 방식은 재현성과 실패 처리가 약하다.

요청:

```json
{
  "sessionId": "uuid",
  "tickWindowStart": "2026-06-24T10:30:00+09:00",
  "context": {
    "cash": 72.5,
    "portfolioValue": 103,
    "returnPct": 3,
    "positions": [],
    "market": [],
    "riskMode": "balanced"
  }
}
```

응답:

```json
{
  "action": "HOLD",
  "targetAllocationPct": 30,
  "confidence": "MEDIUM",
  "rationale": "가격 변동이 제한적이라 기존 비중을 유지합니다.",
  "riskNotes": ["손실 제한 기준까지 여유가 있습니다."],
  "expectedHoldingMinutes": 60,
  "invalidationPrice": null
}
```

운영 규칙:

- timeout 기본 20초. 초과 시 해당 tick 은 `skipped` 또는 fallback provider 로 처리한다.
- JSON schema validation 실패 시 체결하지 않는다.
- CLI 원문 응답은 `decision_raw` 에 저장 가능하지만 UI 기본 노출은 normalized decision 만 사용한다.
- CLI bridge URL/token 은 서버 env 로만 보관한다. 브라우저에는 노출하지 않는다.

---

## 6. 데이터 모델

### 6-1. `paper_trading_sessions`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | 세션 ID |
| `name` | text | 세션 이름 |
| `status` | text | `running/paused/completed/failed` |
| `tickers` | text[] or jsonb | 투자 후보 |
| `initial_cash` | numeric | 시작 투자금 |
| `cash` | numeric | 최신 현금 |
| `portfolio_value` | numeric | 최신 평가금액 |
| `return_pct` | numeric | 누적 수익률 |
| `risk_mode` | text | 보수/균형/공격 |
| `max_position_pct` | numeric | 단일 종목 최대 비중 |
| `cash_buffer_pct` | numeric | 최소 현금 비중 |
| `tick_interval_minutes` | integer | 기본 30 |
| `decision_provider` | text | `mock/existing-ai/cli-agent` |
| `mode` | text | `sandbox/live-paper/replay` |
| `last_tick_window_start` | timestamptz nullable | 마지막 처리 window |
| `started_at` | timestamptz | 시작 시각 |
| `ended_at` | timestamptz nullable | 종료 시각 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 갱신 시각 |

### 6-2. `paper_trading_positions`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | 포지션 ID |
| `session_id` | uuid FK | 세션 |
| `ticker` | text | 종목 |
| `quantity` | numeric | 가상 보유 수량 |
| `avg_entry_price` | numeric | 평균 진입가 |
| `last_price` | numeric | 최신 가격 |
| `market_value` | numeric | 평가금액 |
| `unrealized_pnl` | numeric | 미실현 손익 |
| `unrealized_pnl_pct` | numeric | 미실현 수익률 |
| `updated_at` | timestamptz | 갱신 시각 |

### 6-3. `paper_trading_ticks`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | tick ID |
| `session_id` | uuid FK | 세션 |
| `tick_index` | integer | 0, 1, 2... |
| `status` | text | `pending/priced/decided/executed/skipped/failed` |
| `triggered_by` | text | `user/auto/cli/cron` |
| `tick_window_start` | timestamptz | 30분 window 시작 |
| `priced_at` | timestamptz | 가격 기준 시각 |
| `price_freshness_seconds` | integer | 가격 신선도 |
| `portfolio_value_before` | numeric | tick 전 평가금액 |
| `portfolio_value_after` | numeric | tick 후 평가금액 |
| `cash_before` | numeric | tick 전 현금 |
| `cash_after` | numeric | tick 후 현금 |
| `return_pct_after` | numeric | tick 후 누적 수익률 |
| `decision` | jsonb | normalized `PaperTradingDecision` |
| `decision_raw` | jsonb nullable | provider 원문 응답 |
| `price_snapshot` | jsonb | tick 당시 가격 |
| `orders` | jsonb | 가상 주문/체결 내역 |
| `rationale` | text | 화면 표시용 요약 |
| `error_message` | text nullable | 실패 사유 |
| `created_at` | timestamptz | 생성 시각 |

### 6-4. phase-1 저장 전략

구현 난이도를 줄이기 위해 단계화한다.

1. **MVP-A: mock store** — `lib/mock/paperTrading/*` + server-side in-memory fixture 로 UI와 계산 로직 검증. 새로고침 지속성 없음.
2. **MVP-B: Supabase ledger** — 위 3개 테이블을 `docs/sql/paper-trading.sql` 로 추가. 세션/tick 지속성 보장.
3. **MVP-C: CLI agent bridge** — `decision_provider='cli-agent'` 연결. 별도 경량 agent 설계 필요.

DB 적용 시 권장 제약:

- `paper_trading_ticks(session_id, tick_window_start)` unique.
- `paper_trading_ticks(session_id, tick_index)` unique.
- `paper_trading_positions(session_id, ticker)` unique.
- `targetAllocationPct`, `max_position_pct`, `cash_buffer_pct` 는 0~100 범위 check.
- tick/position update 는 하나의 transaction 으로 처리한다. tick 은 append, position/session 최신값은 같은 transaction 에서 갱신한다.

---

## 7. API 설계 (BFF)

브라우저는 `lib/api/client.ts` 의 same-origin axios(`/api`)만 사용한다.

### 7-1. 세션

- `GET /api/paper-trading/sessions`
  - 세션 목록.
  - query: `status?`, `limit?`

- `POST /api/paper-trading/sessions`
  - 세션 생성 + 첫 tick 선택 실행.
  - body: 세션 생성 입력.
  - response: session summary + first tick.

- `GET /api/paper-trading/sessions/:sessionId`
  - 세션 상세, 최신 포지션, tick timeline, equity curve.

- `PATCH /api/paper-trading/sessions/:sessionId`
  - pause/resume/complete.

### 7-2. tick

- `POST /api/paper-trading/sessions/:sessionId/tick`
  - 지금 1회 재판단.
  - body: `{ triggeredBy: "user" | "auto" | "cli", tickWindowStart?: string }`
  - 같은 30분 window 안에서 중복 실행 방지 필요.
  - idempotency: 이미 같은 `tickWindowStart` 의 tick 이 있으면 기존 tick 을 반환한다. 실패 tick 재시도는 `retry=true` 같은 명시 flag 가 있을 때만 허용한다.

- `GET /api/paper-trading/sessions/:sessionId/ticks`
  - tick timeline pagination.

### 7-3. 자동 tick 후보

phase-1 은 사용자가 화면을 열고 있을 때 "지금 재판단" 버튼 또는 UI timer 로 실행한다. phase-2 에서 다음 중 하나를 채택한다.

- 로컬 CLI loop 가 30분마다 `POST /api/paper-trading/sessions/:id/tick`.
- 별도 worker/service 가 30분마다 tick.
- Vercel Cron 은 30분 단위 운용에는 부적합할 수 있어 보조 수단으로만 검토.

---

## 8. UI 설계

### 8-1. 목록/생성 화면

라우트: `/dashboard/paper-trading`

구성:

- 상단 요약: 실행 중 세션 수, 오늘 총 모의 수익률, 마지막 판단 시각.
- 세션 생성 폼: 종목, 투자금, 위험모드, 판단 방식, 시작 버튼.
- 세션 리스트: 상태, 투자금, 현재 평가금액, 수익률, 마지막 action, 다음 tick 예정.

노출 카피 원칙:

- "실전 매수" 대신 "가상 매수".
- "추천" 대신 "AI 판단".
- "수익 보장" 류 표현 금지.
- 고유명사/티커/API 필드 제외 한글.

### 8-2. 세션 상세 화면

라우트: `/dashboard/paper-trading/[sessionId]`

핵심 컴포넌트:

- `PaperTradingHeader` — 세션 상태, 시작 투자금, 현재 평가금액, 누적 수익률.
- `EquityCurveChart` — 100 → 80 → 90 → 103 같은 자산 곡선.
- `CurrentDecisionPanel` — 최신 AI 판단(action, target allocation, confidence, rationale).
- `PositionTable` — 종목별 수량, 평균가, 현재가, 평가손익.
- `DecisionTimeline` — 30분 tick 별 판단과 가상 주문.
- `RiskGuardPanel` — 최대 비중, 현금 버퍼, 손실 제한 접근 여부.
- `ManualTickButton` — "지금 재판단".

### 8-3. 상태 UX

| 상태 | UX |
|---|---|
| 가격 조회 중 | skeleton + "현재 가격을 확인하고 있어요" |
| AI 판단 중 | progress + provider 표시 |
| tick skipped | timeline 에 회색 row, 사유 노출 |
| 세션 paused | 상단 badge + "재개" 버튼 |
| 손실 확대 | 수익률만 빨간색으로 과장하지 말고 리스크 메모 함께 표시 |
| 수익 발생 | 수익률과 함께 "가상 평가금액" 명시 |

---

## 9. 가상 체결 규칙

phase-1 은 단순하고 재현 가능한 규칙을 쓴다.

- 체결 가격 = tick price snapshot 의 현재가.
- 수수료 = 기본 0, 설정 가능 상수로 분리.
- 슬리피지 = 기본 0, 설정 가능 상수로 분리.
- 소수 수량 허용 여부:
  - normalized unit(100 기준) 시 허용.
  - KRW 실제 주식 단위 시 정수 수량만 허용.
  - MVP 권고: normalized unit 으로 시작해 계산을 단순화.
- 매수 가능 금액 = `cash - minimumCashBuffer`.
- 단일 종목 목표 비중은 `max_position_pct` 를 넘을 수 없다.
- `EXIT` 은 해당 종목 전량 가상 매도.
- `REDUCE` 는 target allocation 까지 축소.
- `HOLD` 는 주문 없음, mark-to-market 만 반영.

### 9-1. 리스크 가드 우선순위

AI decision 은 제안이고, 체결 엔진의 리스크 가드가 항상 우선한다.

1. **현금 버퍼**: 체결 후 현금이 `cash_buffer_pct` 미만이면 주문 크기를 줄인다.
2. **단일 종목 최대 비중**: `max_position_pct` 초과분은 잘라낸다.
3. **손실 제한**: 세션 또는 포지션 손실이 hard stop 을 넘으면 `EXIT` 또는 `REDUCE` 로 강제 변환한다.
4. **가격 신선도**: `price_freshness_seconds` 가 허용치를 넘으면 주문 없이 `skipped` 처리한다.
5. **포지션 없는 매도 금지**: 보유 수량보다 큰 가상 매도는 전량 매도로 정규화한다.

권장 기본값:

| 설정 | 기본값 |
|---|---|
| `max_stale_price_seconds` | 180 |
| `session_hard_stop_pct` | -7% |
| `position_hard_stop_pct` | -5% |
| `max_turnover_per_tick_pct` | 50% |

리스크 가드가 AI decision 을 바꿨다면 tick 에 `guardAdjustments` 를 저장하고 UI timeline 에 "리스크 한도로 주문을 줄였어요"처럼 표시한다.

---

## 10. 의사결정 컨텍스트

AI runner 에 전달하는 최소 컨텍스트:

```ts
type PaperTradingDecisionContext = {
  session: {
    initialCash: number;
    cash: number;
    portfolioValue: number;
    returnPct: number;
    riskMode: "conservative" | "balanced" | "aggressive";
    maxPositionPct: number;
    cashBufferPct: number;
    mode: "sandbox" | "live-paper" | "replay";
  };
  tick: {
    tickIndex: number;
    tickWindowStart: string;
    minutesFromOpen: number;
    minutesToClose: number;
  };
  market: {
    ticker: string;
    price: number;
    changePct?: number;
    asOf: string;
    freshnessSeconds?: number;
  }[];
  positions: {
    ticker: string;
    quantity: number;
    avgEntryPrice: number;
    marketValue: number;
    unrealizedPnlPct: number;
  }[];
  previousDecision?: PaperTradingDecision;
  latestAiSignal?: {
    verdict: string;
    confidence: string;
    signalScore?: number;
    signalAction?: string;
    targetPct?: number | null;
    stopLossPct?: number | null;
  };
};
```

컨텍스트에는 사용자가 실제로 입력하지 않은 추론값도 포함될 수 있지만, decision 에 영향을 준 값은 tick record 로 남겨야 한다. 나중에 "왜 여기서 방향을 바꿨는가"를 재현할 수 있어야 하기 때문이다.

---

## 11. 수용 기준

### AC-1. 세션 생성

사용자가 종목 1개, 시작 투자금 100, 1일/30분 interval 로 세션을 생성하면 `running` 세션이 만들어지고 첫 tick 이 기록된다.

검증:

- `POST /api/paper-trading/sessions` 200.
- 응답에 `session.id`, `initialCash=100`, `portfolioValue` 존재.
- 첫 tick `tickIndex=0`, `status=executed` 또는 `skipped`.

### AC-2. tick 재판단

실행 중 세션에서 `POST /api/paper-trading/sessions/:id/tick` 을 호출하면 최신 가격과 포지션 기준으로 새 tick 이 append 된다.

검증:

- 기존 tick 수 N → N+1.
- 이전 tick 은 수정되지 않음.
- 최신 `portfolioValueAfter`, `decision.action`, `rationale` 존재.

### AC-3. 자산 경로 재현

세션 상세 API는 tick ledger 로부터 equity curve 를 반환한다.

검증:

- fixture tick 값이 100 → 80 → 90 → 103 이면 chart data 도 같은 순서.
- 누적 수익률은 `(latest / initial - 1) * 100` 과 일치.

### AC-4. 가상 체결 한도

AI가 100% 매수를 지시해도 `max_position_pct` 와 `cash_buffer_pct` 를 넘지 않는다.

검증:

- `maxPositionPct=50`, `cashBufferPct=10`, cash=100 일 때 매수 후 포지션 비중 <= 50, 현금 >= 10.

### AC-5. provider adapter

`mock` 과 `existing-ai` provider 는 같은 `PaperTradingDecision` 타입을 반환한다. UI는 provider 종류를 몰라도 렌더된다.

검증:

- provider switch fixture 로 동일 컴포넌트 렌더.
- `cli-agent` 는 미구현 시 명확한 `not-implemented` 응답 또는 disabled UI.

### AC-6. 중복 tick 방지

같은 세션에서 같은 30분 window 에 tick 이 중복 실행되지 않는다.

검증:

- 같은 window 내 두 번 호출 시 두 번째는 기존 latest tick 반환 또는 409/200 idempotent 응답.
- 다음 window 에는 새 tick 허용.

### AC-7. 오류 fail-soft

가격 조회 실패 또는 AI 판단 실패 시 세션 전체가 깨지지 않는다.

검증:

- 해당 tick `failed` 또는 `skipped`.
- 세션은 `running` 유지 가능.
- timeline 에 실패 사유 노출.

### AC-8. BFF 패턴

클라이언트 컴포넌트/훅에서 외부 API 직접 `fetch` 호출이 없다. 브라우저는 `/api/paper-trading/*`만 호출한다.

검증:

- `rg "fetch\\(" app components hooks lib/api` 결과에서 route handler 외 직접 호출 0건.
- axios client baseURL `/api` 사용.

### AC-9. UI

목록 화면과 상세 화면이 모바일/데스크탑에서 정보가 겹치지 않고, 사용자 노출 문구가 한글이다.

검증:

- desktop/mobile Playwright 또는 agent-browser 스크린샷.
- 빈 상태, running, paused, completed 상태 확인.

### AC-10. 무회귀

기존 `/analyze`, scorecard, stock snapshot API가 그대로 동작한다.

검증:

- `npm run lint`
- `npm run test`
- 가능하면 `npm run build`

### AC-11. 시간창·idempotency

같은 세션에서 같은 `tick_window_start` 로 두 번 tick 을 요청하면 tick 이 중복 생성되지 않는다.

검증:

- 첫 호출: tick 생성.
- 두 번째 호출: 기존 tick 반환.
- DB 적용 후 `paper_trading_ticks(session_id, tick_window_start)` unique 제약으로도 보장.

### AC-12. 가격 신선도·리스크 가드

가격이 오래됐거나 AI가 위험 한도를 넘는 주문을 반환하면 체결 엔진이 주문을 조정하거나 skip 한다.

검증:

- `price_freshness_seconds > max_stale_price_seconds` → 주문 없음, tick `skipped`.
- `targetAllocationPct=100`, `maxPositionPct=50` → 실제 가상 주문은 50% 이하.
- hard stop 이탈 → `EXIT` 또는 `REDUCE` 로 강제.

### AC-13. CLI agent 계약

`cli-agent` provider 는 JSON schema 를 통과한 응답만 체결 엔진에 전달한다.

검증:

- malformed JSON → tick `failed/skipped`, 포지션 변화 없음.
- timeout → fallback 또는 skip, 세션 `running` 유지.
- 정상 JSON → normalized `PaperTradingDecision` 저장.

---

## 12. 영향 분석

### 12-1. 신규 파일 예상

- `docs/prd/ai-paper-trading.md`
- `docs/sql/paper-trading.sql` (MVP-B)
- `app/(main)/dashboard/paper-trading/page.tsx`
- `app/(main)/dashboard/paper-trading/[sessionId]/page.tsx`
- `app/api/paper-trading/sessions/route.ts`
- `app/api/paper-trading/sessions/[sessionId]/route.ts`
- `app/api/paper-trading/sessions/[sessionId]/tick/route.ts`
- `components/paperTrading/*`
- `hooks/paperTrading/*`
- `hooks/query/useQueryPaperTradingSessions.ts`
- `hooks/query/useQueryPaperTradingSession.ts`
- `hooks/query/useMutationCreatePaperTradingSession.ts`
- `hooks/query/useMutationRunPaperTradingTick.ts`
- `lib/api/paperTrading/*`
- `lib/server/paperTrading/sessionStore.ts`
- `lib/server/paperTrading/runTick.ts`
- `lib/server/paperTrading/virtualExecution.ts`
- `lib/server/paperTrading/decisionProviders/mock.ts`
- `lib/server/paperTrading/decisionProviders/existingAi.ts`
- `lib/server/paperTrading/decisionProviders/cliAgent.ts` (stub)
- `lib/types/paperTrading/*`
- `lib/copy/paperTrading/*`
- `lib/mock/paperTrading/*`

### 12-2. 수정 파일 예상

- `hooks/query/queryKeys.ts` — paper trading query key 추가.
- `lib/server/env.ts` — CLI bridge URL/env 가 필요할 경우 후속 추가.
- `components/layout/*` 또는 dashboard navigation — 메뉴 항목 추가가 필요하면 수정.

### 12-3. 회귀 위험

- **AI 분석 비용/시간 증가**: 30분마다 기존 full analysis 를 돌리면 너무 무겁다. phase-1 은 기존 최신 판정 재사용 또는 mock runner 로 시작하고, phase-2 에 경량 CLI agent 를 붙인다.
- **가격 데이터 신뢰성**: 장중 30분 판단은 실시간/지연 시세 차이가 결과에 영향을 준다. UI에 기준 시각(`asOf`)을 항상 노출한다.
- **모의투자와 실제 투자 혼동**: 모든 주문/체결 표현에 "가상" 접두를 유지한다.
- **지속성 부재**: MVP-A in-memory 는 새로고침/서버 재시작에 사라진다. 실제 운용 전 MVP-B Supabase ledger 가 필요하다.

---

## 13. 구현 단계 권고

### Step 1. 설계/문서

- 본 PRD 확정.
- UI가 포함되므로 후속 `docs/design/ai-paper-trading.md` 작성.
- SQL은 MVP-B 시점에 추가.

### Step 2. 계산 엔진 + mock store

- `runTick`, `virtualExecution`, `mock decision provider` 순수 함수 작성.
- fixture 로 100 → 80 → 90 → 103 같은 자산 경로 테스트.

### Step 3. BFF + UI MVP

- 세션 생성, 상세 조회, 수동 tick 실행.
- in-memory/mock store 기반으로 UI와 상태 UX 검증.

### Step 4. Supabase ledger

- `paper_trading_sessions`, `paper_trading_positions`, `paper_trading_ticks` 추가.
- mock store 를 Supabase store 로 교체.

### Step 5. existing-ai 연결

- 기존 AI 판정/신호를 allocation decision 으로 변환.
- full analysis 매 tick 실행은 금지. 최신 판정 캐시를 우선 재사용.

### Step 6. CLI agent bridge

- 별도 PRD에서 lightweight agent prompt, bridge protocol, timeout, fallback 정의.

---

## 14. OPEN QUESTION

### Q1. MVP-A에서 in-memory mock store 로 시작할까, 바로 Supabase ledger 로 갈까?

- **PM 권고**: in-memory mock store 로 UI/계산을 먼저 닫고, 바로 다음 PR에서 Supabase ledger 로 올린다. 이 기능은 상태가 많아서 DB부터 붙이면 첫 구현의 표면적이 커진다.

### Q2. 투자금 단위는 normalized 100 으로 둘까, 실제 KRW 금액으로 둘까?

- **PM 권고**: MVP는 normalized 100을 기본으로 둔다. 사용자가 말한 100 → 80 → 90 → 103 흐름과 맞고, 소수 수량/원화 단위 복잡도를 줄인다. 후속으로 KRW 모드를 추가한다.

### Q3. 30분 tick 은 누가 트리거할까?

- **PM 권고**: MVP는 수동 "지금 재판단" + 화면 열린 상태의 client timer 로 충분하다. 실제 30분 자동 운용은 CLI/worker 연결 시점에 한다.

### Q4. 기존 full AI 분석을 매 tick 돌릴까?

- **PM 권고**: 금지. 너무 무겁고 비용/시간이 크다. 최신 AI 판정 + 가격/포지션 변화 기반 경량 판단으로 시작하고, 추후 CLI agent 를 붙인다.

### Q5. 실제 액션 참고 문구를 얼마나 강하게 보여줄까?

- **PM 권고**: "실제 주문은 연결하지 않음", "가상 체결", "투자 판단 참고"를 기본 문구로 둔다. 사용자가 실제 액션을 할 수 있다는 니즈는 인정하되, 제품은 주문 실행/자문처럼 보이지 않게 한다.

### Q6. 단일 종목부터 할까, 포트폴리오 다중 종목부터 할까?

- **PM 권고**: 단일 종목 MVP. 다중 종목은 데이터 모델과 UI 확장성만 확보한다. 30분마다 방향을 바꾸는 핵심 경험은 단일 종목에서도 충분히 검증된다.
