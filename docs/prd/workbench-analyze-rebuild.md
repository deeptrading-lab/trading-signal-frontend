# PRD: workbench-analyze-rebuild

- **slug**: `workbench-analyze-rebuild`
- **작성일**: 2026-05-20
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: HANDOFF PR #6 / #7 후속, `signal-workbench-frontend-mvp` PRD 의 화면 영역 재작성
- **UI 포함 여부**: yes (화면 전체 재작성. UX/UI 디자이너 합류 필요 — `docs/design/workbench-analyze-rebuild.md` 산출물 의존)
- **선행 / 후행 관계**: 선행 PRD `frontend-architecture-restructure` 머지 후 진입. 본 PRD 는 선행 PRD 가 만들어둔 axios 클라이언트·TanStack Query 훅·타입·검증 함수를 import 만 해서 화면을 짠다.

## 1. 배경 / 문제

현재 `app/page.tsx` 는 BTC 단일·"현금/BTC 보유량 입력 → 비중 판단" 모델을 가정한 UI 다.

- 입력: 사용 가능 현금 (KRW/USD), 보유 BTC, 데이터 수집 방식 토글 (OpenAI / Claude).
- 결론: `INCREASE_ALLOCATION` / `REDUCE_ALLOCATION` / `RISK_OFF` 등 비중 액션 + sizing 라벨.
- 데이터 패널: 뉴스 요약 + Binance 매매 동향.

그러나 실제 BE 의 분석 API (`POST /api/workbench/analyze`) 는 완전히 다른 모델을 채택한다.

- 입력: `ticker` (화이트리스트 멤버, 현재 `AAPL` / `BTC-USD`), `capital_amount` (투입 자본), `target_return_pct` (목표 수익률), `target_period_days` (목표 기간), `max_loss_pct` (거래당 최대 손실률, 0 < x ≤ 5).
- 응답 6블록:
  - `brief` — 기술 분석 신호 (BUY / HOLD / SELL action + 근거).
  - `feasibility` — 목표 수익률·기간 현실성 판정 (예: `UNREALISTIC` 라벨 + 연환산 목표 수익률).
  - `horizons` — 단/중/장기 구간별 추세 요약.
  - `risk_plan` — 진입가 / 손절가 / 익절가 / 제안 매수 금액·수량 / 예상 손익 / RR 비율.
  - `action` — 보유 포지션·실현가능성 반영 최종 권고 (`ACTIONABLE_BUY` / `CONDITIONAL_BUY` / `HOLD` / `PARTIAL_SELL` / `SELL` / `AVOID`).
  - `warnings` — 가격 소스 폴백 등 주의사항.

즉 사용자가 자기 자본·목표를 정량적으로 입력하면, 봇이 "그 목표가 현실적인지" + "현재 시점 매매 신호" + "구체적 진입·손절·익절·수량" + "최종 권고" 를 묶어 돌려주는 모델이다. UI 도 이 6블록 구조에 정합해야 한다. 또한 ticker-agnostic 이므로 화이트리스트 검색 → ticker 선택 흐름이 신규로 필요하다.

본 PRD 는 선행 PRD 가 완성한 데이터 인프라 위에 **화면·UX 만** 다시 짠다.

## 2. 목표

- 사용자가 ticker 를 검색·선택하고, 자기 자본·목표 수익률·목표 기간·최대 손실률을 입력하고, BE 응답 6블록을 한 화면에서 명확히 읽을 수 있게 한다.
- "목표가 비현실적" (`feasibility.UNREALISTIC` 등) 인 경우, 사용자가 그 사실을 분석 결과의 첫 인상에서 인지하도록 한다.
- "최종 권고" (`action.label`) + "기술 신호" (`brief.action`) 가 다를 수 있음을 화면에서 자연스럽게 구분한다.
- 화이트리스트 외 ticker 입력은 클라이언트에서 사전 차단하거나, BE 404 응답을 사용자 친화 메시지로 변환한다.
- BE 제약(`max_loss_pct` 범위, `target_period_days` 정수·양수 등) 위반 입력은 BE 요청을 보내기 전에 차단한다.

## 3. 범위 (In scope)

- 기존 `app/page.tsx` 의 BTC 단일·sizing UI 전면 폐기.
- 신규 화면 단일 (App Router 의 메인 페이지 또는 `app/workbench/page.tsx` — 라우트 위치는 디자이너·FE Dev 협의).
- 입력 폼 영역:
  - ticker 검색 — 입력에 따라 `useWhitelistSearch` 훅으로 검색 결과 표시, 클릭 또는 키보드로 선택. alias 도 검색 가능 (`q=APPLE` → `AAPL`).
  - 자본 (`capital_amount`), 목표 수익률 % (`target_return_pct`), 목표 기간 일수 (`target_period_days`), 거래당 최대 손실률 % (`max_loss_pct`, 기본 2).
  - 제출 버튼 — `useAnalyzeWorkbench` mutation 호출.
- 결과 영역 (BE 응답 6블록 매핑):
  - 헤더: 선택한 ticker + 회사명·자산 종류·통화 + 분석 시각.
  - **action 블록 (최종 권고)** — `ACTIONABLE_BUY` / `CONDITIONAL_BUY` / `HOLD` / `PARTIAL_SELL` / `SELL` / `AVOID` 라벨을 한글 + 시각적 강조로 표시. 권고 근거 텍스트.
  - **feasibility 블록 (목표 현실성)** — `UNREALISTIC` 라벨이 떴을 때 사용자가 첫 인상에서 인지 가능한 시각적 강조 (예: 경고 색·아이콘). 연환산 목표 수익률 등 BE 가 주는 보조 수치 표시.
  - **brief 블록 (기술 신호)** — BUY/HOLD/SELL action + 근거 텍스트.
  - **risk_plan 블록 (진입/손절/익절/수량)** — 진입가·손절가·익절가·제안 매수 금액·수량·예상 손익·RR 비율. 표 또는 카드.
  - **horizons 블록 (구간별 추세)** — 단/중/장기 텍스트 요약.
  - **warnings 블록** — 가격 소스 폴백 등. 비어 있을 수도 있음.
- 상태 처리:
  - 로딩 (입력 ↦ 응답 사이) — TanStack Query mutation 상태 기반 스피너 또는 스켈레톤.
  - 에러 — BE 4xx/5xx 별 한글 메시지 매핑.
  - 빈 상태 (분석 전) — 입력 안내.
- 클라이언트 사전 차단 (선행 PRD 의 `validateAnalyzePayload` 사용):
  - 화이트리스트 외 ticker → "지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요." (현 BE 상태 반영. 화이트리스트 확장 시 메시지는 자동으로 BE 응답에 따라 갱신되는 톤이 바람직.)
  - 숫자 필드 NaN / 음수 / 0 / 범위 초과 — 필드별 한글 안내.
- 사용자 노출 문구는 한글 기본. ticker · BE 식별자(`UNREALISTIC` 등의 enum 키)는 영문 유지하되 사용자 노출 시 한글 매핑 라벨 병기.
- 디자인 토큰은 `app/globals.css` 의 기존 CSS custom property (`--accent`, `--warn`, `--blue`, `--panel`, `--bg`, `--text`, `--muted`, `--line` 등) 그대로 사용. 신규 토큰 정의는 디자이너 산출물에 명시된 경우에만 추가.
- 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 의 화면 흐름·상태 매핑·문구 톤을 1차 근거로 본다.

## 4. 비범위 (Out of scope)

- 신규 데이터 페칭 라이브러리 / HTTP 클라이언트 도입 (선행 PRD 가 책임).
- 화이트리스트 확장 (현재 BE 가 `AAPL`, `BTC-USD` 둘만 노출 — BE 작업).
- 차트 시각화 (캔들·라인 등) 라이브러리 도입 — 응답은 텍스트·카드·표로만 표시.
- Tailwind / shadcn/ui 도입 (디자인 시스템 정착은 별도 PRD).
- Supabase 연동·사용자 인증·세션·즐겨찾기·기록 저장.
- 다국어 (i18n).
- 모바일 전용 / 데스크탑 전용 분리 — 단일 반응형 (현재 `mobileShell` 폭 480 기준 + 720 미디어 쿼리 패턴 유지 가능).
- E2E·시각 회귀 테스트 도입.
- Vercel 배포·도메인·환경변수 등록.
- BE 분석 계산식 변경.

## 5. 수용 기준 (AC)

검증 가능한 문장.

- **AC-1 (BTC 단일 UI 제거)**: 기존 `Brief` 타입의 `sizing.cash_amount` / `btc_holdings_sell_pct` / `news_snapshot` / `market_flow_snapshot` 필드가 화면에서 더 이상 참조되지 않는다 (`git grep -nE "btc_holding|news_snapshot|market_flow_snapshot" -- app/ lib/` 결과 0건. 단, deprecated 표시된 legacy 타입 모듈 안의 사용은 예외 — 본 PRD 단계에서 legacy 타입 자체를 삭제하는 것을 권장).
- **AC-2 (BE 6블록 매핑)**: `brief`, `feasibility`, `horizons`, `risk_plan`, `action`, `warnings` 6 블록 각각이 화면에 적어도 1개의 시각적 단위(섹션/카드/표) 로 표시된다. `warnings` 가 빈 배열일 때는 섹션 자체를 숨겨도 무방.
- **AC-3 (feasibility 강조)**: `feasibility` 응답이 비현실 판정(예: `label === "UNREALISTIC"` 또는 BE 가 동등하게 노출하는 키)일 때, 화면에서 그 사실이 분석 결과 헤더 또는 별도 강조 UI 로 표시되어 첫 인상에서 인지 가능하다. (구체 색·배지·아이콘은 디자이너 산출물 따름.)
- **AC-4 (action vs brief 구분)**: 최종 권고(`action`) 와 기술 신호(`brief.action`) 가 다른 경우 (예: brief = BUY 인데 action = `CONDITIONAL_BUY`) 둘이 같은 카드에 묻혀 보이지 않고, 사용자가 둘이 구분된 정보임을 인식할 수 있게 분리된다.
- **AC-5 (whitelist 검색 UX)**: 입력 필드에 키워드를 타이핑하면 BE 화이트리스트 검색 결과가 표시되고, alias 도 매칭된다 (`APPLE` → `AAPL`). 결과 중 하나를 선택해야 분석 버튼이 활성화된다.
- **AC-6 (whitelist miss 메시지)**: 사용자가 화이트리스트에 없는 ticker 를 직접 입력하거나, 선택 없이 분석을 시도하면 한글 안내 메시지가 표시된다. 안내 톤은 "지원 종목" 관점 (사용자 잘못이 아닌 BE 한계로 프레이밍).
- **AC-7 (입력 사전 차단)**: 다음 입력은 분석 요청 전 차단된다.
  - `capital_amount` 가 비어 있거나 ≤ 0 또는 NaN.
  - `target_return_pct` 가 음수 또는 NaN.
  - `target_period_days` 가 0 / 음수 / 소수.
  - `max_loss_pct` 가 0 이하 / 5 초과 / NaN.
  - 각 필드는 어떤 값이 들어와야 하는지 한글로 안내 (placeholder 또는 helper text).
- **AC-8 (로딩 상태)**: 분석 요청 중 mutation `isPending` 동안 결과 영역이 스피너·스켈레톤·"분석 중" 표시 중 하나를 노출한다. 이 동안 제출 버튼은 비활성화.
- **AC-9 (BE 에러 메시지)**: BE 가 4xx 또는 5xx 를 반환하면 한글 에러 메시지가 사용자 영역에 표시된다 (BE raw 메시지 그대로 노출 금지 — 매핑 또는 fallback 텍스트). 500 fallback 은 "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요." 같은 톤.
- **AC-10 (한글 톤)**: 사용자 노출 문구 중 ticker · BE enum 식별자 · 단위(USD, KRW, %, 일) 를 제외한 모든 텍스트가 한글이다.
- **AC-11 (직접 호출 금지)**: 본 PRD 단계에서도 `git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건 (route handler 안 fallback 제외). 화면 코드는 선행 PRD 의 클라이언트 함수·훅만 사용.
- **AC-12 (디자인 토큰 사용)**: 화면이 사용하는 색·간격은 `app/globals.css` 의 CSS custom property 를 1차로 참조한다. 신규 색·간격은 디자이너 산출물에 정의된 경우에만 추가 (인라인 hex 직타 최소화).
- **AC-13 (build/typecheck/lint)**: `npm run typecheck`, `npm run build`, `npm run lint` 모두 0 에러로 통과한다.
- **AC-14 (수동 QA 시나리오)**: 다음 시나리오가 dev 환경에서 모두 동작한다.
  - (a) `AAPL` 검색 → 선택 → 자본 100 만원, 목표 5%, 기간 30 일, 최대 손실 2% → 분석 → 6블록 전부 표시.
  - (b) `BTC-USD` 검색 → 선택 → 자본 0 입력 → 분석 버튼 클릭 → 한글 사전 차단 메시지.
  - (c) `BTC-USD` 검색 → 선택 → 목표 수익률 500%, 기간 1 일 → 분석 → feasibility 가 비현실 강조로 표시 (BE 가 그렇게 판정한다고 가정).
  - (d) 화이트리스트에 없는 ticker (`NVDA`) 직접 입력 → 분석 → 한글 안내.
  - (e) BE 를 잠시 내리고 분석 시도 → 네트워크 오류(`ECONNREFUSED` 등) 또는 5xx 모두 한글 fallback 메시지로 안내.
- **AC-15 (기본 접근성)**: 폼 필드에 `<label>` 또는 동등한 `aria-label` 이 연결되어 있고, 키보드 Tab 으로 입력 → 분석 버튼 → 결과 영역까지 순차 탐색 가능. 결과 카드의 상태 강조(feasibility 비현실 등)는 색만이 아닌 텍스트 라벨로도 전달된다. 상세 톤은 디자이너 산출물 따름. 깊은 a11y 감사는 Reviewer 게이트.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 선행 PRD `frontend-architecture-restructure` 가 머지되어 있고, 다음이 사용 가능하다고 가정:
  - axios 인스턴스
  - `useWhitelistSearch(q)`, `useAnalyzeWorkbench()` 훅
  - `WhitelistItem`, `AnalyzeRequest`, `AnalyzeResponse` (또는 동등 명칭) 타입
  - `validateAnalyzePayload` 검증 함수 + 한글 메시지
- BE 화이트리스트는 현재 `AAPL`, `BTC-USD` 둘. 본 PRD 의 화면 코드는 이 두 값을 하드코딩하지 않고 BE 응답에 따라 동작. 단 placeholder / 빈 상태 안내 문구에서는 두 종목을 예시로 언급 가능.
- BE `offline` 파라미터는 본 PRD 에서 기본 `false` 로 고정 호출 (UI 노출 안 함). 추후 별도 PRD 에서 토글 도입 검토.
- 사용자 노출 화면은 토스 톤(밝고 간결·정보 밀도·빠른 조작) — AGENTS.md 명시.
- 디자인 시스템·간격·색 결정의 1차 근거는 디자이너 산출물 (`docs/design/workbench-analyze-rebuild.md`). 본 PRD 는 비주얼 디테일을 결정하지 않는다.
- 응답 6블록 각각의 정확한 키·타입 형태는 선행 PRD 의 타입 모듈에 정의되어 있고, 본 PRD 는 그 타입에 정합한 화면을 짠다. BE 가 새 필드를 추가해도 화면이 깨지지 않게 옵셔널 처리.
- 시각화 라이브러리 미도입 — `risk_plan` 의 진입/손절/익절 도 텍스트·카드·간단한 막대 또는 CSS 만으로 표현.

## 7. 참고

- `AGENTS.md` — 작업 원칙, 디자인 톤, 에이전트 역할.
- `docs/rules/frontend.md` — FE 규칙.
- `docs/prd/frontend-architecture-restructure.md` — 선행 PRD. 본 PRD 가 그 산출물을 소비.
- `docs/prd/signal-workbench-frontend-mvp.md` — 직전 MVP PRD (이번에 화면 영역이 재작성됨).
- `docs/design/workbench-analyze-rebuild.md` — 디자이너 산출물 (본 PRD 진입 후 디자이너가 작성).
- `app/page.tsx` — 현재의 잘못된 가정 (BTC 단일 sizing 모델). 본 PRD 가 전면 폐기·재작성.
- `app/globals.css` — CSS custom property (`--accent` 등). 1차 디자인 토큰.
- engine 레포 BE 코드 (PRD 검토 시 Swagger 우선): `server.py` (FastAPI 진입), `workbench.py` (`analyze_workbench` 본체). Swagger UI: `http://127.0.0.1:8000/docs`.
- `docs/HANDOFF.md` PR #6 / #7 entry — 직전 정리 작업의 "다음 작업" 후보 중 1번 항목 (page.tsx 직접 호출 정정) 을 선행 PRD + 본 PRD 가 함께 흡수.

## 8. PRD 분할 판단 근거 (선행 PRD 와 공유)

본 작업은 (A) 아키텍처 기반 / (B) 화면 재작성 두 영역으로 분기된다. 사유:

1. 한 PR 로 묶으면 변경량이 +1000 라인 급이라 reviewer 부담·롤백 단위가 비대.
2. (A) 만 머지된 시점에도 회귀 가능 (typecheck/build/라운드트립). 화면은 placeholder.
3. 본 PRD (B) 가 디자이너 산출물에 의존하므로, (A) 와 같은 PR 에 묶으면 디자이너 단계가 아키텍처 진행을 블로킹.
4. 본 PRD 는 UI 변경이 크고 디자이너 합류 트리거가 필요 — `UI: yes` 표지가 명확해야 함.

## 9. OPEN QUESTION

- `[OPEN QUESTION] 라우트 위치` — 메인 페이지 (`app/page.tsx`) 를 그대로 워크벤치 화면으로 둘지, 별도 `app/workbench/page.tsx` 로 옮기고 메인은 랜딩으로 둘지. PM 권고: MVP 는 메인 = 워크벤치 (현재 구조 유지). 별도 랜딩은 후속 PRD.
- `[OPEN QUESTION] 화이트리스트 검색 UX 디테일` — 자동완성 드롭다운인지, 검색 결과 카드 리스트인지, debounce 시간(예: 250ms). 디자이너 산출물에서 결정.
- `[OPEN QUESTION] feasibility 비현실 판정 시 결과 발사 자체를 막을지` — BE 는 그래도 응답 6블록을 다 채워 보내준다. PM 권고: 막지 말고 강조해서 그대로 표시 (사용자가 직접 판단). 단 결과 헤더에서 "목표를 조정하시면 더 좋아요" 톤 안내 권장.
- `[OPEN QUESTION] capital_amount 통화` — 현재 BE 가 통화를 받지 않는 듯 (`capital_amount` 단일). ticker 의 `currency` 필드(`USD` / `KRW`)에 따라 입력 통화를 강제할지, 그냥 숫자로 받을지. 디자이너 산출물 + BE 확인 필요. PM 가설: ticker 선택 시 ticker.currency 를 보조 표시하고 입력은 그 통화 단위 가정.
- `[OPEN QUESTION] action 6 라벨의 한글 톤` — `ACTIONABLE_BUY` / `CONDITIONAL_BUY` / `HOLD` / `PARTIAL_SELL` / `SELL` / `AVOID` 각각의 한글 라벨 표현. 디자이너 산출물에서 카피 결정.
- `[OPEN QUESTION] risk_plan 시각화 정도` — 진입/손절/익절 가격을 단순 표로 둘지, 간단한 가격 막대(CSS only) 로 보일지. 시각화 라이브러리 미도입 전제는 유지. 디자이너 산출물에서 결정.
- `[OPEN QUESTION] warnings 노출 위치` — 결과 최상단 (사용자가 먼저 봐야 하는 주의) 인지, 최하단 (보조 정보) 인지. PM 권고: 가격 소스 폴백 등 "데이터 신뢰성" 관련이므로 결과 헤더 근처 (action 블록 하단) 권장. 디자이너가 최종 결정.
