# QA Report: workbench-analyze-rebuild

- **PRD**: [docs/prd/workbench-analyze-rebuild.md](../prd/workbench-analyze-rebuild.md)
- **디자이너 산출물**: [docs/design/workbench-analyze-rebuild.md](../design/workbench-analyze-rebuild.md)
- **PR**: [#11 feat: workbench-analyze-rebuild 화면 구현 — BE 6블록 + 종목 검색·자본 입력 폼](https://github.com/deeptrading-lab/trading-signal-frontend/pull/11)
- **브랜치**: `feature/workbench-analyze-rebuild`
- **검증일**: 2026-05-21
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → `{"status":"ok"}` (HTTP 200)
- **Next dev**: QA 가 두 인스턴스를 띄워 검증
  - `:3100` (FASTAPI_BASE_URL 기본값 = `http://127.0.0.1:8000`, LIVE BE 대상) — 시나리오 (a)/(c)/(d) 라운드트립
  - `:3110` (`FASTAPI_BASE_URL=http://127.0.0.1:59999`, 닫힌 포트) — 시나리오 (e) BE 다운 시뮬레이션

---

## 1. 수용 기준 검증 (AC-1 ~ AC-15)

### AC-1 (BTC 단일 UI 제거)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "btc_holding\|news_snapshot\|market_flow_snapshot" -- app/ lib/ components/ hooks/` |
| 기대 결과 | 0건 (PRD §5 명시: legacy 타입 모듈 안의 사용은 예외지만, 본 PR 단계에서는 legacy 타입 자체가 lib/types/ 에 없으므로 깨끗) |
| 실측 결과 | grep exit=1 (no match) — 0건 |
| 판정 | PASS |

### AC-2 (BE 6블록 매핑)

| 항목 | 값 |
|---|---|
| 재현 절차 | `components/workbench/ResultGroup.tsx` 인스펙션 + 시나리오 (a) 응답에서 6블록 모두 렌더 여부 |
| 기대 결과 | `ResultGroup` 가 `state === "success"` 분기에서 `ActionCard` / `WarningsCard` / `FeasibilityCard` / `BriefCard` / `RiskPlanCard` / `HorizonsCard` 6개 마운트. `warnings=[]` 일 때 `WarningsCard` 는 `if (warnings.length === 0) return null` 로 섹션 자체 미렌더 |
| 실측 결과 | `ResultGroup.tsx:50-71` 6개 카드 컴포넌트 모두 마운트. `WarningsCard.tsx:14` `if (!warnings \|\| warnings.length === 0) return null` 확인. 시나리오 (a) 응답 `warnings:[]` → 섹션 미렌더, 나머지 5블록 정상 |
| 판정 | PASS |

### AC-3 (feasibility 강조)

| 항목 | 값 |
|---|---|
| 재현 절차 | `FeasibilityCard.tsx` 인스펙션 + 시나리오 (c) 응답에서 강조 분기 진입 |
| 기대 결과 | `feasibility.toUpperCase() === "UNREALISTIC"` 시 `card feasibilityCard is-unrealistic` 클래스 → CSS `.feasibilityCard.is-unrealistic` 로 `card-warn` 톤 (`warn-soft` 배경 + `warn` 텍스트) + `badge-warn` "⚠ 비현실적인 목표예요" + 본문에 BE 연환산 수치. 색·텍스트·이모지 세 트랙 모두 |
| 실측 결과 | `FeasibilityCard.tsx:31` `isUnrealistic = feasibility?.toUpperCase() === "UNREALISTIC"` → `tsx:35` 클래스 토글. `tsx:40-46` UNREALISTIC 분기에서 `<span className="badge-warn">⚠ 비현실적인 목표예요</span>` + 본문 `${days}일 동안 ${formatPct(returnPct)} ... 연 환산 약 <strong>${formatPct(annualized)}</strong> ...`. CSS `app/globals.css:461-465` 의 `.feasibilityCard.is-unrealistic` 가 `var(--warn-soft)` 배경 + `var(--warn)` 텍스트 적용. 시나리오 (c) 응답 `feasibility:"UNREALISTIC", annualized_target_return_pct:1.059e+286` → 분기 진입 확인 |
| 판정 | PASS |

### AC-4 (action vs brief 구분)

| 항목 | 값 |
|---|---|
| 재현 절차 | `BriefCard.tsx` 인스펙션 + `lib/copy/action-labels.ts` 의 `isDivergent` 단위 테스트 + 시나리오 (a) 응답 (action=HOLD vs brief.action=ACTIONABLE_LONG) 에서 divergent 분기 진입 |
| 기대 결과 | `getActionMeta(action).group !== getBriefActionMeta(brief.action).group` 일 때 (UNKNOWN 제외) `briefCard is-divergent` 클래스 → 좌측 3px line 보더 + caption "최종 권고와는 별개의 기술 신호예요." |
| 실측 결과 | `BriefCard.tsx:23` `divergent = isDivergent(actionMeta.group, briefMeta.group)` 호출, `tsx:27` 클래스 토글, `tsx:31-33` divergent 시 caption 노출. CSS `app/globals.css:517-519` `.briefCard.is-divergent { border-left: 3px solid var(--line); }`. 단위 테스트: `HOLD vs ACTIONABLE_LONG` → divergent=true, `ACTIONABLE_BUY vs BUY` → divergent=false, `UNKNOWN` 한쪽 → divergent=false. 시나리오 (a) 실측 응답: `action:"HOLD"` (group=HOLD), `brief.action:"ACTIONABLE_LONG"` (group=BUY) → divergent 분기 진입 확인 |
| 판정 | PASS |

### AC-5 (whitelist 검색 UX)

| 항목 | 값 |
|---|---|
| 재현 절차 | `SearchPanel.tsx` + `hooks/use-ticker-search.ts` 인스펙션. `curl` 로 `/api/whitelist/search?q=app` 및 `?q=APPLE` 라운드트립 |
| 기대 결과 | 250ms debounce → `useWhitelistSearch`. role=listbox / option / aria-selected / aria-activedescendant. 키보드 ↑↓ + Enter / ESC. 마우스 클릭 = mousedown. 결과 1건도 자동 선택 X. alias 검색 가능 |
| 실측 결과 | `use-ticker-search.ts:16` `DEBOUNCE_MS = 250`, `tsx:32-37` `setTimeout(..., 250)` 정확. `SearchPanel.tsx:102-110` `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete="list"` + `aria-activedescendant`. `tsx:114` 컨테이너 `role="listbox"`. `tsx:128` 항목 `role="option"` + `aria-selected={focused}`. `tsx:56-79` 키보드 핸들러 (↑↓ 인덱스 이동, Enter 시 선택, ESC 시 close). `tsx:132-136` mousedown + preventDefault (blur race 회피). 자동 선택 코드 없음 — 사용자가 Enter/클릭으로만 확정. curl `?q=app` 및 `?q=APPLE` 모두 `AAPL` (aliases:["APPLE"]) 1건 매칭 200 OK |
| 판정 | PASS |

### AC-6 (whitelist miss 메시지)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) `useAnalyzeForm` 의 `isValid` 가 선택 없는 입력에서 false 인지 코드 인스펙션 + ad-hoc 테스트. (b) NVDA 강제 POST → BE 400 + Korean detail → axios interceptor 매핑 → `ErrorCard` 렌더 |
| 기대 결과 | 클라이언트 측: 화이트리스트 외 ticker 는 `validateAnalyzePayload` 가 "지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요." 거절, 분석 버튼 비활성. BE 측: 400 + `"NVDA는 분석 가능한 화이트리스트에 없습니다"` → `axios.interceptors` → `kind=whitelist_miss` + Korean message → `getErrorMessage` 가 Korean passthrough → `ErrorCard` 가 BE 한글 detail 그대로 노출 |
| 실측 결과 | ad-hoc 테스트: `NVDA not whitelisted blocked` + Korean message 확인. `lib/api/client.ts:65-71` 400 + 화이트리스트 정규식 → `kind=whitelist_miss`, `message=bodyMessage`. `lib/copy/error-messages.ts:22` Korean passthrough. 라운드트립 NVDA POST → STATUS 400, body `{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}` 그대로 통과 |
| 판정 | PASS |

### AC-7 (입력 사전 차단)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npx tsx /tmp/qa-validate-pr11.mts` — `validateAnalyzePayload` 직접 호출 (13개 입력 케이스). `useAnalyzeForm.attemptSubmit` 가 BE 호출 전 차단하는 로직 인스펙션 |
| 기대 결과 | 4 필드 + 화이트리스트 거절 모두 한글 메시지. `attemptSubmit()` 가 ok=false 면 null 반환 → mutation 미발생 |
| 실측 결과 | ad-hoc tsx 13/13 PASS (capital ≤0/빈/문자/, target_return_pct -1/=0 boundary, target_period_days 0/소수, max_loss_pct 0/=5 boundary/5.1, NVDA, 빈 ticker). 한글 메시지 그대로 반환. `hooks/use-analyze-form.ts:90-96` `attemptSubmit` 가 `result.ok===false` 면 `setErrors` + null 반환 → `app/page.tsx:42-44` `if (!payload) return;` 로 mutation 미호출 |
| 판정 | PASS |

발췌 (13/13 PASS):

```
[PASS] baseline AAPL valid
[PASS] capital=0 blocked — {"capital_amount":"투자 가능 금액은 0보다 큰 숫자여야 해요."}
[PASS] capital empty (NaN) blocked
[PASS] target_return_pct -1 blocked
[PASS] target_return_pct=0 ok (>=0 allowed)
[PASS] target_period_days 1.5 blocked (non-integer)
[PASS] target_period_days 0 blocked
[PASS] max_loss_pct 5.1 blocked
[PASS] max_loss_pct=5 ok (boundary inclusive)
[PASS] max_loss_pct=0 blocked
[PASS] NVDA not whitelisted blocked
[PASS] empty ticker blocked
[PASS] non-numeric capital blocked
```

### AC-8 (로딩 상태)

| 항목 | 값 |
|---|---|
| 재현 절차 | `InputPanel.tsx` 의 버튼 + `LoadingSkeleton.tsx` + `ResultGroup` 의 분기 인스펙션 |
| 기대 결과 | `mutation.isPending` 동안: (a) 분석 버튼 라벨 "분석 중" + `aria-busy=true` + `aria-disabled` + `disabled`. (b) 결과 영역 `LoadingSkeleton` 4장 |
| 실측 결과 | `InputPanel.tsx:152-161` 버튼: `disabled={!isValid \|\| isPending}` + `aria-disabled={!isValid \|\| isPending}` + `aria-busy={isPending}` + 라벨 `{isPending ? "분석 중" : "분석"}`. `ResultGroup.tsx:36-38` `state==="loading"` → `<LoadingSkeleton />` 렌더. `LoadingSkeleton.tsx:10` `aria-busy="true" aria-live="polite"` + 4개 `.skeleton` div |
| 판정 | PASS |

### AC-9 (BE 에러 메시지)

| 항목 | 값 |
|---|---|
| 재현 절차 | `lib/copy/error-messages.ts` ad-hoc 테스트 + 라운드트립 (NVDA 400 / BE down 502) |
| 기대 결과 | `getErrorMessage`: Korean detail 그대로, 영문은 kind 별 한글 fallback. 500/network → "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요." + "다시 시도" 버튼 (`isRetryable`) |
| 실측 결과 | ad-hoc: Korean passthrough / English → fallback / server kind → fallback + retryable=true / network → retryable=true / validation/whitelist_miss → retryable=false. 라운드트립 (e): `:3110` (FASTAPI_BASE_URL=closed) POST → 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` → axios `kind=server`, Korean passthrough → `ErrorCard` + "다시 시도" 버튼 노출. `ErrorCard.tsx:22` `role="alert" aria-live="polite"` 정합 |
| 판정 | PASS |

### AC-10 (한글 톤)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "[A-Za-z]{6,}" -- components/workbench/` 결과를 훑어 영문이 ticker/BE enum/단위 외에 노출되는지 |
| 기대 결과 | ticker, BE enum (`BULLISH`/`NEUTRAL`/`REALISTIC` 등 객체 키), 단위 (`USD`/`KRW`/`%`/`일`) 외 영문 사용자 노출 없음 |
| 실측 결과 | grep 결과는 모두 (a) 식별자 / import / type / 함수명 / className, (b) 객체 키 (`BULLISH:"상승"` 등 매핑 좌변), (c) BE 응답 동적 텍스트 (`{brief.entry_condition}` 등). 사용자 노출 정적 문자열은 모두 한글 ("최종 권고", "기술 신호", "리스크 플랜", "구간별 추세", "주의 사항", "목표 현실성", "비현실적인 목표예요", "보유 유지", "지금 매수", "조건 충족 시 매수", "일부 매도", "전량 매도", "진입 보류", "매수 신호", "관망 신호", "매도 신호", "진입 보류 신호", "신호 없음", "참고 가격", "신뢰도", "손익비", "손절", "진입", "익절", "분석 중", "분석", "다시 시도", "분석할 종목을 먼저 선택해 주세요.", "종목과 조건을 입력하면 분석 결과가 표시돼요.", "선택한 종목의 통화 단위로 입력해 주세요.", "0 이상의 숫자를 입력해 주세요.", "1 이상의 정수(일).", "0보다 크고 5 이하.", "검색 중…", "일치하는 종목이 없어요. AAPL · BTC-USD 를 검색해 보세요.", "종목 선택 필요", "분석할 종목을 먼저 선택해 주세요.", "최종 권고와는 별개의 기술 신호예요.", "비현실 목표 기준 계산값 — 참고로만 보세요.", 등). 단위는 한글 "일" + `%` 기호 + ticker.currency (`USD`/`KRW`) 만 |
| 판정 | PASS |

### AC-11 (직접 호출 금지)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "http://127\.0\.0\.1" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` + `git grep -nE "fetch\(" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` |
| 기대 결과 | 두 grep 모두 0건. 화면 코드는 `lib/api/*` + `lib/query/*` 만 사용 |
| 실측 결과 | 두 grep 모두 exit=1 (no match) — 0건. `app/page.tsx` 는 `useAnalyzeWorkbench` (mutation) + `useAnalyzeForm` 만 import. `components/workbench/SearchPanel.tsx` 는 `useTickerSearch` (= `useWhitelistSearch` 래퍼) 만 import. fetch/127.0.0.1 호출 0건 |
| 판정 | PASS |

### AC-12 (디자인 토큰 사용)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` |
| 기대 결과 | 0건. 모든 색은 `var(--<token>)` 만 사용 |
| 실측 결과 | grep exit=1 (no match) — 0건. 색은 모두 `app/globals.css` 의 CSS custom property (`--primary`, `--tertiary`, `--warn`, `--critical`, `--info`, `--line`, `--neutral`, `--panel`, `--field-bg`, 그리고 각 -soft 변종) 참조. 인라인 style 은 `RiskPlanCard.tsx` 의 `left: ${pct}%` (위치 계산) 외 색·간격·라운드 직타 없음 |
| 판정 | PASS |

### AC-13 (build/typecheck/lint)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm run typecheck && npm run lint && npm run build` |
| 기대 결과 | 3개 명령 모두 exit 0 |
| 실측 결과 | typecheck exit 0, lint exit 0, build exit 0 (`✓ Compiled successfully in 892ms`, `✓ Generating static pages (6/6)`, Route 표: `/` Static 32.9 kB / 141 kB First Load, `/api/whitelist/search` Dynamic, `/api/workbench/analyze` Dynamic) |
| 판정 | PASS |

### AC-14 (수동 QA 시나리오 5건)

LIVE BE (`http://127.0.0.1:8000`) 대상 `:3100` dev 서버에서 라운드트립. 시나리오 (b) 는 BE 호출이 발생하지 않아야 한다는 명세이므로 ad-hoc 테스트로 검증, 시나리오 (e) 는 `FASTAPI_BASE_URL=http://127.0.0.1:59999` (closed) 로 별도 `:3110` dev 인스턴스 띄워 검증.

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| (a) | `AAPL` 검색 (자동완성 1건) → 자본 1,000,000 / 5% / 30일 / 2% → 분석 | 200 + 6블록 envelope. 응답 6블록 모두 화면 마운트. `warnings=[]` → 섹션 미렌더 | POST `/api/workbench/analyze` 200 OK. `action:"HOLD"`, `feasibility:"UNREALISTIC"`, `annualized_target_return_pct:81.05`, `brief.action:"ACTIONABLE_LONG"`, `risk_plan.entry_price:299.26`, `horizons` 6행, `warnings:[]`. divergent (HOLD vs BUY 그룹) + UNREALISTIC 강조 + warnings 숨김 분기 모두 코드 인스펙션으로 확인 | PASS |
| (b) | `BTC-USD` 검색 → 선택 → 자본 0 입력 → 분석 시도 | 사전 차단 (BE 미호출) + `capital_amount` 한글 helper "투자 가능 금액은 0보다 큰 숫자여야 해요." + 분석 버튼 비활성 | ad-hoc tsx 테스트: `capital=0 blocked` + Korean message 확인. `useAnalyzeForm.isValid` false → 버튼 `disabled` + `aria-disabled=true`. `attemptSubmit()` null 반환 → `app/page.tsx:42-44` mutation 미호출. BE 요청 0건 | PASS |
| (c) | `BTC-USD` → 500% / 1일 / 2% → 분석 | feasibility=UNREALISTIC 강조 (badge-warn + 본문 연환산 수치) + risk_plan 위 "비현실 목표 기준 계산값..." 노트 | POST 200 OK. `feasibility:"UNREALISTIC"`, `annualized_target_return_pct:1.059e+286`. `FeasibilityCard.is-unrealistic` 분기 진입 + `formatPct(1.06e286)` finite-safe 결과 (`%` 접미). `RiskPlanCard.tsx:43-47` `isUnrealistic` 분기 → `.riskUnrealisticNote` 한 줄 노출 | PASS |
| (d) | `NVDA` 직접 입력 → 선택 없이 분석 시도 | (1) 클라이언트 사전 차단: ticker 화이트리스트 외 → 분석 버튼 비활성. (2) 강제 POST 도달 가정 시 BE 400 + Korean detail → `ErrorCard` 가 한글 그대로 노출 | (1) ad-hoc: `NVDA not whitelisted blocked` 확인 (Korean message). (2) `curl POST` ticker=NVDA → STATUS 400 + `{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}` → axios interceptor `kind=whitelist_miss` (정규식 매칭) + Korean passthrough → `ErrorCard` 렌더 (`retryable=false` 이므로 "다시 시도" 버튼 X — 의도된 동작) | PASS |
| (e) | BE 다운 (FASTAPI_BASE_URL=http://127.0.0.1:59999) → 분석 | route handler 502 + Korean fallback + `ErrorCard` + "다시 시도" 버튼 | `:3110` POST → STATUS 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}`. axios → `kind=server` + Korean passthrough → `ErrorCard` 렌더, `isRetryable(server)=true` 이므로 "다시 시도" 버튼 노출. `onRetry` → `mutation.reset()` + `setLastResult(null)` | PASS |

### AC-15 (기본 접근성)

| 항목 | 값 |
|---|---|
| 재현 절차 | 폼 필드 `<label htmlFor>` / `aria-label` 연결, 컴포넌트 role/aria 속성 인스펙션 |
| 기대 결과 | (a) 모든 폼 필드 `<label>` 연결. (b) Tab 순서: 검색 → capital → return → period → loss → 분석 → 결과. (c) role/aria: 검색 `role=combobox/listbox/option/aria-selected/aria-activedescendant`, 분석 버튼 `aria-disabled/aria-busy`, 결과 영역 `role=alert/aria-live`. (d) feasibility 비현실 강조는 색 + 텍스트 (이모지 포함) 두 트랙 |
| 실측 결과 | (a) `SearchPanel.tsx:83` `<label htmlFor={inputId}>종목 검색</label>` + `InputPanel.tsx:49/75/100/126` 4개 필드 `<label htmlFor={...}>` 모두 연결, `aria-invalid` + `aria-describedby` 로 helper 와 매핑. (b) Tab 순서는 DOM 순서 그대로 (검색 input → 자본 → 수익률 → 기간 → 손실률 → 분석 버튼), 결과 영역의 "다시 시도" 버튼은 그 다음. (c) `SearchPanel.tsx:102-110` combobox + 컨테이너 listbox + 항목 option/aria-selected/aria-activedescendant 모두 정합. `InputPanel.tsx:156-158` 버튼 `disabled` + `aria-disabled` + `aria-busy`. `ErrorCard.tsx:22` `role="alert" aria-live="polite"`. `LoadingSkeleton.tsx:10` `aria-busy="true" aria-live="polite" aria-label="분석 중"`. `EmptyState.tsx:11` `role="status" aria-live="polite"`. (d) `FeasibilityCard.tsx:41` `⚠ 비현실적인 목표예요` 배지 (이모지+텍스트) + CSS 클래스 `is-unrealistic` 으로 색 톤 변경 — 색만으로 의미 전달 X. `RiskPlanCard.tsx:50-55` price bar `role="img" aria-label="손절 X · 진입 Y · 익절 Z"` 으로 색 도트의 텍스트 대체 라벨 제공 |
| 판정 | PASS |

---

## 2. DESIGN.md 정합 검증

### 2-1. 토큰 매핑 (front matter ↔ `app/globals.css` ↔ `var(--token)`)

| DESIGN.md 키 | front matter 값 | `app/globals.css` CSS 변수 | 코드 참조 |
|---|---|---|---|
| `colors.primary` | `#17202a` | `--primary: #17202a;` (globals.css:14) | `--primary` 다수 |
| `colors.secondary` | `#657385` | `--secondary: #657385;` (:15) | `--secondary` 다수 |
| `colors.tertiary` | `#0f766e` | `--tertiary: #0f766e;` (:16) | button-primary, badge-accent 등 |
| `colors.tertiary-soft` | `#e5f4f1` | `--tertiary-soft: #e5f4f1;` (:17) | badge-accent bg, search-result-item-focus |
| `colors.neutral` | `#f5f7fa` | `--neutral: #f5f7fa;` (:18) | body bg |
| `colors.panel` | `#ffffff` | `--panel: #ffffff;` (:19) | card bg 다수 |
| `colors.line` | `#dbe2ea` | `--line: #dbe2ea;` (:20) | card 보더, briefCard divergent 보더 |
| `colors.field-bg` | `#f8fafc` | `--field-bg: #f8fafc;` (:21) | input bg, skeleton bg |
| `colors.warn` | `#b45309` | `--warn: #b45309;` (:22) | feasibility-warn, warnings, riskUnrealisticNote |
| `colors.warn-soft` | `#fff4df` | `--warn-soft: #fff4df;` (:23) | card-warn bg, badge-warn bg |
| `colors.info` | `#2563eb` | `--info: #2563eb;` (:24) | badge-info, price-bar-entry |
| `colors.info-soft` | `#eaf1ff` | `--info-soft: #eaf1ff;` (:25) | badge-info bg |
| `colors.critical` | `#991b1b` | `--critical: #991b1b;` (:26) | input-error, card-critical, price-bar-stop |
| `colors.critical-soft` | `#fee2e2` | `--critical-soft: #fee2e2;` (:27) | card-critical bg, badge-critical bg, input-error bg |
| `colors.body-strong` | `#344253` | `--body-strong: #344253;` (:28) | feasibilityBody, briefBody, horizonBody |
| `colors.white` | `#ffffff` | `--white: #ffffff;` (:29) | button-primary text |
| `spacing.xs/sm/md/lg/xl/2xl` | 4/6/10/14/18/24px | `--space-xs/sm/md/lg/xl/2xl` (:41-46) | gap·margin·padding 다수 |
| `rounded.sm` | 8px | `--rounded-sm: 8px;` (:49) | card, button, input |
| `rounded.pill` | 999px | `--rounded-pill: 999px;` (:50) | badge, price-bar, skeleton line |
| `typography.display` | 30/700/1.18 | `--font-display-size/weight/lh` (:53-55) | actionDisplay |
| `typography.h1` | 22/700/1.2 | `--font-h1-*` (:56-58) | topBarLeft h1 |
| `typography.h2` | 17/700/1.35 | `--font-h2-*` (:59-61) | resultBlockTitle, feasibilityTitle |
| `typography.body-md` | 16/400/1.55 | `--font-body-md-*` (:62-64) | actionReason, input text |
| `typography.body-sm` | 14/400/1.5 | `--font-body-sm-*` (:65-67) | briefBody, horizonBody, riskTable, emptyState |
| `typography.body-strong` | 16/700/1.5 | `--font-body-strong-*` (:68-70) | search-result strong |
| `typography.caption` | 12/400/1.4 | `--font-caption-*` (:71-73) | helper, label, briefDivergentNote |
| `typography.button` | 15/700/1.2 | `--font-button-*` (:74-76) | button-primary, button-secondary |
| `typography.badge` | 13/700/1.2 | `--font-badge-*` (:77-79) | badge-* |
| `typography.mono-numeric` | 15/700/1.2 tnum | `--font-mono-*` + `font-variant-numeric: tabular-nums` (:80-82, 494/586/677/714) | feasibilityAnnualized, riskTable td, rrRow, horizonBody strong |

판정: 색·간격·라운드·typography 토큰 32+개 모두 front matter → CSS 변수 → 코드 참조 1:1 매핑 확인. **PASS**

### 2-2. 컴포넌트 합성 토큰 (DESIGN.md `components.*`)

| DESIGN.md 컴포넌트 | bg / text / rounded / padding 명세 | 코드 적용 |
|---|---|---|
| `card` | panel / primary / rounded.sm / 16px | `.card` (globals.css:174-183) — `var(--panel)` + `var(--primary)` + `var(--rounded-sm)` + 16px padding |
| `card-elevated` | panel / primary / rounded.sm / 20px | `.card-elevated` (:185-188) + 미세 shadow (DESIGN.md "Elevation & Depth" 절: 토큰화 X, 한 곳만 사용) |
| `card-warn` | warn-soft / warn / rounded.sm / 16px | `.card-warn` + `.feasibilityCard.is-unrealistic` + `.warningsCard` (:190-202, 461-465, 498-502) — `var(--warn-soft)` + `var(--warn)` |
| `card-critical` | critical-soft / critical / rounded.sm / 12px | `.card-critical` (:197-202) + `.errorCard` 추가 padding |
| `input` | field-bg / primary / rounded.sm / 11px / 42px | `.input` (:352-363) — `var(--field-bg)` + `var(--rounded-sm)` + padding 11px + height `var(--input-height)`=42px |
| `input-error` | critical-soft / critical / rounded.sm / 11px / 42px | `.input-error` (:371-381) |
| `button-primary` | tertiary / white / rounded.sm / 12px / 44px | `.button-primary` (:383-396) — `var(--tertiary)` + `var(--white)` + 44px |
| `search-result-item` | panel / primary / rounded.sm / 12px | `.search-result-item` (:250-264) |
| `search-result-item-focus` | tertiary-soft / tertiary / rounded.sm / 12px | `.search-result-item-focus` (:261-282) |
| `badge-accent/warn/info/critical` | -soft / 본색 / pill / 10px / 28px | `.badge-*` (:720-753) — `var(--badge-height)`=28px |
| `price-bar-track/stop/entry/target` | line/critical/info/tertiary / pill | `.price-bar-*` (:600-631) — 표식 크기 4×12px, 트랙 6px |

판정: 합성 토큰 11종 모두 `var(--<token>)` 만 사용해 매핑. **PASS**

### 2-3. 핸드오프 명세 9 상태 매핑

| DESIGN.md 상태 | 화면 코드 매핑 | 확인 |
|---|---|---|
| 분석 전 (Empty) | `EmptyState.tsx` — `.emptyState` (`role=status aria-live=polite`) + "종목과 조건을 입력하면 분석 결과가 표시돼요." | OK |
| ticker 미선택 → 분석 시도 | `SearchPanel.tsx:45-47` helper "분석할 종목을 먼저 선택해 주세요." (selectedTicker 가 null 인 동안 노출) + `InputPanel` 의 `aria-disabled` | OK |
| 사전 차단 (Validation) | `InputPanel.tsx:56/82/107/134` `errors.<field>` 시 `input-error` 클래스 + `helper is-critical` + `aria-invalid` + `aria-describedby` | OK |
| 로딩 (Loading) | `LoadingSkeleton.tsx` 4장 + 버튼 라벨 "분석 중" + `aria-busy=true` | OK |
| 정상 (Success) | `ResultGroup.tsx:42-72` 6블록 순서: action → warnings → feasibility → brief → risk_plan → horizons (DESIGN.md "Layout" 절과 정합) | OK |
| feasibility 비현실 | `FeasibilityCard.tsx:38-47` UNREALISTIC 분기 + `is-unrealistic` 클래스 + badge "⚠ 비현실적인 목표예요" + 본문 연환산 수치 | OK |
| action vs brief 불일치 | `BriefCard.tsx:23-33` `divergent` 분기 + `is-divergent` 클래스 + caption "최종 권고와는 별개의 기술 신호예요." | OK |
| whitelist miss | `useAnalyzeForm.isValid` false (클라 차단) + axios `kind=whitelist_miss` (서버 차단) → `ErrorCard` 노출 (Korean passthrough) | OK |
| BE 4xx 매핑 가능 | `lib/api/client.ts:57-71` 422 → validation / 400+화이트리스트 → whitelist_miss / 그 외 4xx → server. `ErrorCard` `role=alert aria-live=polite` | OK |
| BE 5xx · 네트워크 실패 | `lib/api/client.ts:44-51/73-79` no-response → network, 5xx → server. `ErrorCard` + "다시 시도" 버튼 (`isRetryable` true) | OK |

판정: DESIGN.md 핸드오프 명세 9 상태 (Empty / ticker-미선택 / Validation / Loading / Success / Feasibility-비현실 / action-vs-brief / whitelist-miss / BE-4xx / BE-5xx-네트워크) 모두 코드에 1:1 매핑. **PASS**

### 2-4. OPEN QUESTION 7건 결정 반영

| # | 결정 | 코드 반영 |
|---|---|---|
| 1 | 자동완성 250ms debounce + 키보드 ↑↓ + Enter + ESC + 1건도 자동 선택 X | `hooks/use-ticker-search.ts:16` `DEBOUNCE_MS=250`. `SearchPanel.tsx:56-79` 키보드 핸들러. `:48-54` `handleSelect` 는 사용자 액션에서만 호출 (자동 선택 X) |
| 2 | feasibility UNREALISTIC = card-warn + badge-warn + 본문 연환산 수치 (세 트랙) | `FeasibilityCard.tsx:38-47` 분기 진입 시 색·텍스트·이모지 모두 |
| 3 | capital_amount 통화 보조 라벨 (ticker.currency 두 번째 칼럼, ticker 미선택 시 "-") | `InputPanel.tsx:43` `currencyLabel = selectedTicker?.currency ?? "-"` + `:71` `<div className="unit" aria-hidden="true">{currencyLabel}</div>` |
| 4 | action 6 한글 라벨 + 배지 색 | `lib/copy/action-labels.ts:24-31` 6 매핑 + 단위 테스트 6/6 PASS. badge 매핑: BUY 계열 → badge-accent, HOLD → badge-info, PARTIAL_SELL → badge-warn, SELL/AVOID → badge-critical |
| 5 | risk_plan = 표 + CSS 가격 막대 (라이브러리 X) | `RiskPlanCard.tsx:67-98` table (진입/손절/익절/제안 금액·수량/예상 손익) + `:49-65` price bar (track + stop/entry/target 3개 표식) + `:99-101` 손익비 한 줄. CSS only |
| 6 | warnings 위치 = action 카드 직후, feasibility 위. 빈 배열 섹션 숨김 | `ResultGroup.tsx:50-53` action → warnings → feasibility 순서. `WarningsCard.tsx:14` 빈 배열 null 반환 |
| 7 | 메인 = 워크벤치 (별도 랜딩 없음) | `app/page.tsx` 가 직접 워크벤치 화면을 렌더 |

판정: OPEN QUESTION 7건 모두 코드에 반영. **PASS**

---

## 3. 에지 케이스

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| E1 | 검색 결과 0건 (예: 입력 `"zzz"`) | `searchPanelEmpty` 한 줄 "일치하는 종목이 없어요. AAPL · BTC-USD 를 검색해 보세요." (드롭다운은 열려 있음) | `SearchPanel.tsx:117-120` `results.length === 0` 분기 — `<div className="searchPanelEmpty">일치하는 종목이 없어요...</div>` 렌더. 입력 직후 250ms 동안은 `isPending && results.length === 0` 분기로 "검색 중…" 노출 | PASS |
| E2 | 검색 결과 N건에서 ↑↓ 키 경계 | 위 끝에서 ↑ 추가 시 인덱스 0 유지, 아래 끝에서 ↓ 추가 시 인덱스 N-1 유지 (랩어라운드 없음) | `SearchPanel.tsx:60` ↓: `Math.min(idx+1, max(0, results.length-1))` (랩어라운드 X). `:65` ↑: `Math.max(0, idx-1)` (랩어라운드 X) | PASS |
| E3 | 통화가 USD/KRW 아닌 ticker (예: 향후 JPY 추가 시) | currency 보조 라벨이 그 값(`JPY`) 그대로 노출 | `InputPanel.tsx:43` `selectedTicker?.currency ?? "-"` 가 BE 가 보낸 currency 를 그대로 사용. 화이트리스트 응답에 `currency` 필드가 어떤 문자열이든 표시 | PASS |
| E4 | `risk_plan.entry_price === stop_loss === take_profit` (0폭 막대) | 가격 막대가 NaN 등으로 깨지지 않음. `range` 0 가 되면 0.0001 fallback 적용 | `RiskPlanCard.tsx:35` `const range = Math.max(hi - lo, 0.0001);` — division-by-zero 회피. 세 표식 모두 `left: 0%` 위치에 겹쳐 표시되지만 NaN 없음. 시각적으로는 한 점에 모임 (의도된 fallback) | PASS |
| E5 | `feasibility` 키가 BE 가 다른 값(`STRETCH`) | `is-unrealistic` 클래스 미적용, body 에 "다소 도전적인 목표예요..." 한 줄 + 연환산 수치 | `FeasibilityCard.tsx:21` `REALISTIC_COPY` 에 `STRETCH` 키 매핑. `:31` `isUnrealistic` false → 정상 카드 분기 (`:49-59`) → `STRETCH` 한글 텍스트 + 연환산 수치 노출. 키 모를 시 fallback 텍스트 ("BE 가 제공한 현실성 라벨을 그대로 표시해요.") | PASS |
| E6 | 다중 동시 분석 요청 (사용자 연타) | `mutation.isPending=true` 동안 버튼 `disabled` → 두 번째 클릭 자체가 차단. TanStack mutation 의 onSuccess 가 최종 응답으로 덮어씀 (race 발생 시 마지막 응답 승) | `InputPanel.tsx:156-158` `disabled={!isValid \|\| isPending}` — `isPending` 동안 클릭 불가. `useAnalyzeWorkbench` 는 `useMutation` 단일 인스턴스 → 새 mutate 호출 시 이전 promise 가 superseded 되며 마지막 응답이 lastResult 에 set | PASS |
| E7 | `formatPct(1.06e+286)` 같은 극단치 (시나리오 c) | `Number.isFinite` true 이므로 `Intl.NumberFormat` 으로 포맷되며 `%` 접미. UI 깨지지 않음 | ad-hoc tsx `formatPct 1e286 finite-safe` PASS — 결과는 `%` 접미를 가진 문자열. 예: `"1,059,757,234,599,344,891,...%"` 같은 큰 수 표시 (자릿수 깨짐 없음, 카드 너비 초과 시 자체 텍스트 줄바꿈은 mono-numeric 한 줄 노출이라 가로 스크롤 없이 깨질 가능성은 있으나 NaN 폐기는 발생 X) | PASS |
| E8 | `ai_summary === null` (현재 BE 동작) | ActionCard 의 `reason` 영역 미렌더 (조건부) | `ActionCard.tsx:22` `{reason ? <p className="actionReason">{reason}</p> : null}` — null/빈 문자열 시 미렌더 | PASS |
| E9 | `getErrorMessage` 가 `message` undefined/null/공백 | fallback (kind 별 한글 카피) | `lib/copy/error-messages.ts:21-25` `raw = error.message?.trim() ?? ""` → 빈 문자열이면 fallback. 단위 테스트 통과 | PASS |
| E10 | `horizons` 배열이 비거나 undefined | `HorizonsCard` 가 null 반환 (섹션 자체 숨김) | `HorizonsCard.tsx:22` `if (!horizons \|\| horizons.length === 0) return null;` | PASS |
| E11 | `brief.reasons` 가 빈 배열 | `briefReasons` UL 미렌더 | `BriefCard.tsx:40-48` `reasons.length > 0` 조건부 렌더 | PASS |
| E12 | 검색 입력 후 즉시 ESC | 드롭다운만 닫힘, query 는 유지 | `SearchPanel.tsx:75-78` Escape → `setOpen(false)` 만 (`setQuery` 호출 없음). 다시 focus 시 `:100` `onFocus` 가 `setOpen(true)` 로 복원 | PASS |
| E13 | 사용자가 선택 후 텍스트 수정 | 선택 해제 (`onSelect(null)`) — 분석 버튼 자동 비활성 | `SearchPanel.tsx:92-99` onChange 핸들러: 입력값이 선택한 ticker 와 다르면 `onSelect(null)` 호출 — `useAnalyzeForm.isValid` false 로 전환 | PASS |
| E14 | `risk_plan.suggested_share_qty=null` 또는 NaN | `formatNumber` 가 "-" 반환 | `lib/formatters/money.ts:26-28` `!Number.isFinite(value)` 시 `-`. ad-hoc 테스트로 검증됨 | PASS |
| E15 | BE 30초 hang (timeout) | axios `timeout=30_000` → response 없이 reject → `kind=network` → "엔진에 일시적인 문제가 발생했어요..." + "다시 시도" 버튼 | `lib/api/client.ts:13` `DEFAULT_TIMEOUT_MS=30_000` + `:17` axios `timeout`. ECONNABORTED 분기 `:45-48` → network kind + Korean message. `isRetryable(network)=true` (ad-hoc PASS) | PASS |

---

## 4. 자동화 명령 로그 요약

```
$ git grep -nE "btc_holding|news_snapshot|market_flow_snapshot" -- app/ lib/ components/ hooks/
(no output, exit 1)

$ git grep -nE "http://127\.0\.0\.1" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/
(no output, exit 1)

$ git grep -nE "fetch\(" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/
(no output, exit 1)

$ git grep -nE "#[0-9a-fA-F]{3,6}" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/
(no output, exit 1)

$ npm run typecheck   # exit 0
$ npm run lint        # exit 0
$ npm run build       # exit 0 — ✓ Compiled successfully in 892ms / 6/6 pages
                                Route (app)                                 Size  First Load JS
                                ┌ ○ /                                    32.9 kB         141 kB
                                ├ ○ /_not-found                            995 B         103 kB
                                ├ ƒ /api/whitelist/search                  127 B         102 kB
                                └ ƒ /api/workbench/analyze                 127 B         102 kB

$ npx tsx /tmp/qa-validate-pr11.mts   # 43/43 PASS (validation + action labels + brief mapping
                                       + divergence + error messages + formatters)

$ curl http://127.0.0.1:8000/health → 200 {"status":"ok"}

$ curl "http://127.0.0.1:3100/api/whitelist/search?q=app"
{"results":[{"ticker":"AAPL", ... "aliases":["APPLE"], ...}]} STATUS:200

$ curl "http://127.0.0.1:3100/api/whitelist/search?q=APPLE"
{"results":[{"ticker":"AAPL", ...}]} STATUS:200

$ curl -X POST .../analyze (AAPL 1M/5%/30d/2%)
→ STATUS:200, action=HOLD, brief.action=ACTIONABLE_LONG (divergent),
  feasibility=UNREALISTIC, annualized=81.05, warnings=[]

$ curl -X POST .../analyze (BTC-USD 500%/1d/2%)
→ STATUS:200, feasibility=UNREALISTIC, annualized=1.059e+286

$ curl -X POST .../analyze (NVDA)
→ STATUS:400 {"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}

$ FASTAPI_BASE_URL=http://127.0.0.1:59999 → :3110 POST .../analyze
→ STATUS:502 {"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}
```

---

## 5. 결함

없음.

---

## 6. PR 본문 자가검증 대비 QA 재현 결과

| 항목 | 작성자 자가검증 | QA 재현 결과 |
|---|---|---|
| AC-1 ~ AC-15 15건 | 모두 PASS 명시 | 15/15 재현 PASS |
| DESIGN.md 정합 (토큰·9상태·OPEN QUESTION 7) | 모두 OK 명시 | 토큰 매핑 32+개 1:1 / 9상태 모두 매핑 / 7결정 모두 반영 — 모두 재현 OK |
| 수동 라운드트립 5건 (a~e) | 모두 OK 명시 | 5/5 동일하게 재현 (a/c/d 는 LIVE BE 라운드트립으로, b 는 ad-hoc validate 호출로, e 는 closed-port override 로) |

자가검증과 QA 재현 결과 일치. 불일치 항목 없음.

---

## 7. PR 본문 게이트 확인

PR #11 본문에 `## 다음 작업` 섹션 존재 (4개 후속 후보 항목 명시) — handoff-append workflow 가 빈 항목으로 commit 되지 않음. 라벨 부여 게이트 OK.

---

## 판정

**qa-passed** — AC 15건 + DESIGN.md 정합 (토큰·9상태·OPEN QUESTION 7) + 에지 케이스 15건 모두 PASS, 실패 0건.
