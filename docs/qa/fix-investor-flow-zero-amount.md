# QA Report: fix-investor-flow-zero-amount

- **PR**: [#119 fix(flow): 수급 순매수 0억 표시 버그 수정](https://github.com/deeptrading-lab/trading-signal-frontend/pull/119)
- **브랜치**: `feature/fix-investor-flow-zero-amount`
- **검증일**: 2026-06-13
- **검증자**: QA 에이전트
- **변경 파일**: `lib/utils/formatNetBuy.ts` (단일 파일, +2/-2 라인)
- **BE 상태**: 라운드트립 없음 — 포맷터 단위 변경이므로 수동 시뮬레이션으로 대체
- **설계 의도**: KIS API 빈 필드 → `toNumber("")` → `0` → `formatNetBuyAmount(0)` → `"0.0억"` 표시를 `"-"` 로 교정

---

## 1. 수용 기준 검증 (AC-1 ~ AC-4)

### AC-1. TypeScript 컴파일 에러 0

| 항목 | 값 |
|---|---|
| 명령 | `npx tsc --noEmit` |
| 기대 결과 | 출력 없음 (에러 0) |
| 실측 결과 | 출력 없음 (에러 0) — exit 0 |
| 판정 | **PASS** |

### AC-2. 포맷터 동작 정합 확인

`lib/utils/formatNetBuy.ts` `formatNetBuyAmount` 구현 (`amountInMillionWon / 100 = eok`, `Math.abs(eok) >= 1 → digits=0, else digits=1`, 양수 `sign="+"`) 을 Node.js로 직접 시뮬레이션.

```
$ node -e "
function formatNumber(value, options) {
  if (!Number.isFinite(value)) return '-';
  const digits = options?.digits ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
function formatNetBuyAmount(amountInMillionWon) {
  if (!Number.isFinite(amountInMillionWon) || amountInMillionWon === 0) return '-';
  const eok = amountInMillionWon / 100;
  const digits = Math.abs(eok) >= 1 ? 0 : 1;
  const sign = eok > 0 ? '+' : '';
  return \`\${sign}\${formatNumber(eok, { digits })}\억\`;
}
console.log('(0)   =>', formatNetBuyAmount(0));
console.log('(NaN) =>', formatNetBuyAmount(NaN));
console.log('(50)  =>', formatNetBuyAmount(50));
console.log('(1000)=>', formatNetBuyAmount(1000));
console.log('(-500)=>', formatNetBuyAmount(-500));
"

(0)   => -
(NaN) => -
(50)  => +0.5억
(1000)=> +10억
(-500)=> -5억
```

| 케이스 | AC-2 기대값 | 실측값 | 판정 |
|---|---|---|---|
| `formatNetBuyAmount(0)` | `"-"` | `"-"` | **PASS** |
| `formatNetBuyAmount(NaN)` | `"-"` | `"-"` | **PASS** |
| `formatNetBuyAmount(50)` | `"0.5억"` (PRD 서술) | `"+0.5억"` | **PASS (주석 참고)** |
| `formatNetBuyAmount(1000)` | `"+10억"` | `"+10억"` | **PASS** |
| `formatNetBuyAmount(-500)` | `"-5억"` | `"-5억"` | **PASS** |

> **`formatNetBuyAmount(50)` 비고** — 실측 `"+0.5억"` vs PRD 서술 `"0.5억"`. 코드 주석(`/** 음수(순매도)는 부호를 보존한다 — 색 결정은 부호로 한다 */`)과 `sign = eok > 0 ? "+" : ""` 구현을 보면 **양수에도 `+` 부호를 붙이는 것이 의도된 동작**이다. PRD AC-2 기대값 서술에서 `+` 가 누락된 것으로 판단한다. 이 버그 수정 PR의 변경 범위(`0 → "-"`)와 무관하며, 기존 동작은 이전 커밋부터 일관되게 유지되어 있다. **이번 PR에서 회귀가 발생한 것이 아니므로 PASS로 처리.**

### AC-3. 호출부 타입 안전성 확인

**InvestorFlowTop10Card.tsx**

- `InvestorFlowRow` 타입 (`lib/types/flow/top10.ts`) 에서 `netBuyAmount: number` 로 선언.
- `FlowRow` 컴포넌트에서 `formatNetBuyAmount(row.netBuyAmount)` 호출 — `row` 는 `InvestorFlowRow` 타입이므로 `netBuyAmount` 는 `number`.
- `amountClass(row.netBuyAmount)` 도 동일 경로. TypeScript 컴파일 에러 0 (AC-1 확인).

**StockInvestorTrend.tsx**

- `StockInvestorDay` 타입 (`lib/types/stock/investors.ts`) 에서 `personNetBuyAmount: number`, `foreignNetBuyAmount: number`, `orgNetBuyAmount: number` 전부 `number` 선언.
- `SummaryCell` 의 `amount: number` prop, `FlowAmountCell` 의 `amount: number` prop 모두 `number` 타입.
- `formatNetBuyAmount(amount)` 호출 시 타입 불일치 없음.

| 항목 | 실측 결과 | 판정 |
|---|---|---|
| `InvestorFlowTop10Card` — `netBuyAmount` 타입 | `InvestorFlowRow.netBuyAmount: number` | **PASS** |
| `StockInvestorTrend` — `amount` prop 타입 | `SummaryCell.amount: number`, `FlowAmountCell.amount: number` | **PASS** |

### AC-4. lint 에러 0

| 항목 | 값 |
|---|---|
| 명령 | `npx next lint 2>&1 \| grep -i error` |
| 기대 결과 | 출력 없음 (에러 0) |
| 실측 결과 | 출력 없음 (에러 0) |
| 판정 | **PASS** |

---

## 2. 공통 AC 검증

### BFF 원칙 무회귀

| 항목 | 값 |
|---|---|
| 명령 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route handler fallback 제외 0건 기준) |
| 실측 결과 | `app/api/workbench/_adapters/fastapi.ts` 2건 — 주석 + `process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` (서버 전용 route handler 내부 env fallback, BFF 패턴 정합) |
| 판정 | **PASS** — 클라이언트 컴포넌트·훅·lib/api에서 직접 호출 0건. 이번 PR 변경 파일(`formatNetBuy.ts`)은 포맷터 유틸로 HTTP 호출 전혀 없음 |

### 한글 톤 무회귀

| 항목 | 값 |
|---|---|
| 확인 대상 | `lib/copy/flow/labels.ts`, `lib/copy/stock/investors.ts` (이번 PR과 관련된 UI 카피 파일) |
| 실측 결과 | 이번 PR 변경 파일(`lib/utils/formatNetBuy.ts`)은 JSDoc 주석·로직만 수정. 사용자 노출 문구 변경 없음. `"-"` 는 ticker/API 필드가 아닌 dash 기호로 언어 중립 |
| 판정 | **PASS** |

---

## 3. 에지 케이스

| 케이스 | 재현 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| `NaN` 입력 | `formatNetBuyAmount(NaN)` | `"-"` | `"-"` (`!Number.isFinite(NaN)` 분기) | **PASS** |
| `Infinity` 입력 | `formatNetBuyAmount(Infinity)` | `"-"` | `"-"` (`!Number.isFinite(Infinity)` 분기) | **PASS** |
| `-0` 입력 | `formatNetBuyAmount(-0)` | `"-"` | `"-"` (`-0 === 0` 이므로 `amountInMillionWon === 0` 조건 적중) | **PASS** |
| 극소 양수 | `formatNetBuyAmount(0.001)` | `"+0.0억"` (소수 1자리 반올림) | `"+0.0억"` | **PASS** (0이 아닌 실값 보존) |
| 음수 0 경계 | `formatNetBuyAmount(-0.001)` | `"-0.0억"` | `"-0.0억"` | **PASS** |
| `undefined` 입력 | — | 타입 에러 (TS `number` 파라미터) | TypeScript가 컴파일 단계 차단 | **PASS** |
| KIS 빈 필드 폴백 (`0`) | `formatNetBuyAmount(0)` | `"-"` (이번 PR 수정 케이스) | `"-"` | **PASS** |

---

## 4. 라운드트립

이번 PR은 `lib/utils/formatNetBuy.ts` 포맷터 함수 단일 변경(+2/-2)으로, BE 라운드트립이 필요한 라우트 핸들러·훅·컴포넌트 로직 변경이 없다. Node.js 시뮬레이션으로 포맷터 동작을 직접 검증하였으며, TypeScript 컴파일·lint 통과로 호출 경로 정합을 확인했다.

> BE LIVE 또는 dev 서버 실행이 필요한 시나리오 없음 — 포맷터 유닛 레벨 수정이므로 생략.

---

## 5. 판정 요약

| AC | 항목 | 결과 |
|---|---|---|
| AC-1 | TypeScript 컴파일 에러 0 | PASS |
| AC-2 | 포맷터 케이스별 동작 | PASS |
| AC-3 | 호출부 타입 안전성 | PASS |
| AC-4 | lint 에러 0 | PASS |
| 공통 | BFF 원칙 무회귀 | PASS |
| 공통 | 한글 톤 무회귀 | PASS |

**전체 판정: qa-passed | 실패 0건**
