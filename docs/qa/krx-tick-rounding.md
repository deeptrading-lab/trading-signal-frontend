# QA 리포트 — krx-tick-rounding

- 대상 PR: #162 (`feature/krx-tick-rounding`)
- 제목: feat(ai-analysis): 결정 카드 절대가격 KRX 호가단위 반올림
- 성격: **PRD 없는 경량 후속** (PR #160 follow-up 1번). PR 본문 + diff 를 스펙으로 QA.
- 변경 파일: `lib/utils/krxTick.ts`(신규), `lib/utils/__tests__/krxTick.test.ts`(신규), `components/stock/ai-analysis/FinalVerdictCard.tsx`(import + 1줄)
- 환경: node v20.19.6 / vitest 3.2.4 / 2026-06-27
- 판정: **qa-passed (실패 0건)**

---

## 1. AC 별 재현·기대·실측

| # | AC | 재현 절차 | 기대 | 실측 | 결과 |
|---|---|---|---|---|---|
| 1 | 빌드/타입/린트 무오류 | `npx tsc --noEmit` / `npm run lint` / `npm run build` | 3개 모두 0 에러 | tsc EXIT 0 · lint EXIT 0 (eslint 출력 없음) · build `✓ Compiled successfully in 3.4s` EXIT 0 | 통과 |
| 2 | 전체 테스트 통과 (신규 7케이스 포함, 회귀 0) | `npm test` (vitest run) | 전부 통과 | **502 passed · 1 skipped** (skip = `__live__/liveBacktest` 상시 스킵) / `krxTick.test.ts (7 tests)` 포함 통과 | 통과 |
| 3 | 호가단위 표 정확성 + nearest 반올림 + 비유한 폴백 | 신규 vitest + QA 독립 ad-hoc(tsx) | KRX 유가 2023 개편 경계값·반올림 일치 | 경계값 13건·반올림 9건·엣지 3건 전부 일치 (아래 §3) | 통과 |
| 4 | 카드 연동 — `roundToKrxTick(basePrice*(1+pct/100))` 교체 + legacy 폴백 무영향 | diff 정밀 확인 | basePrice null 시 `%` 만 표기, 변경 없음 | diff = import 1줄 + `Math.round`→`roundToKrxTick` 1줄. legacy 경로(L132~133) 미변경 | 통과 |
| 5 | 트레이드오프 인지 — 스냅가격·표시% 미세 어긋남이 의도된 동작 | PR 본문 §영향 확인 | 결함 아님으로 기록 | "참고용 가이드 가격, 헤드라인은 %" 명시 → 의도된 동작, 결함 아님 | 통과(기록) |

### 자동화 출력 (AC-1·2)

```
$ npx tsc --noEmit                → EXIT_CODE=0
$ npm run lint  (eslint .)        → EXIT_CODE=0 (출력 없음)
$ npm run build                   → ✓ Compiled successfully in 3.4s / BUILD_EXIT=0
$ npm test  (vitest run)
  Test Files  62 passed | 1 skipped (63)
       Tests  502 passed | 1 skipped (503)
  ✓ lib/utils/__tests__/krxTick.test.ts (7 tests)
```

---

## 2. AC-4 카드 연동 상세

`components/stock/ai-analysis/FinalVerdictCard.tsx` diff 전체:

```diff
+import { roundToKrxTick } from "@/lib/utils/krxTick";
-    const price = Math.round(basePrice * (1 + pct / 100));
+    const price = roundToKrxTick(basePrice * (1 + pct / 100));
```

- `base_price` 타입: `lib/types/stock/aiAnalysis.ts:198` → `base_price?: number | null`.
- 가드: `typeof data.base_price === "number" && data.base_price > 0 ? data.base_price : null` → `basePrice: number | null`.
- legacy(=`basePrice == null`) 경로는 `renderPctStat` L132~133 에서 `%` 문자열만 반환 — **이번 diff 가 건드리지 않음**. 무영향 확인.
- 절대가격 표기 분기(L135~143)만 `roundToKrxTick` 으로 스냅. `toLocaleString("ko-KR")` 표기 유지.

---

## 3. AC-3 호가단위·반올림 독립 검증 (QA ad-hoc tsx)

vitest 케이스에 더해 QA 가 직접 `tsx` 로 실 구현 import 후 재검증. 전 항목 일치(실패 0).

### 경계값 — `krxTickSize` (KRX 유가 2023-01 개편)

| 입력 | tick | 입력 | tick | 입력 | tick |
|---|---|---|---|---|---|
| 1,999 | 1 | 19,999 | 10 | 199,999 | 100 |
| 2,000 | 5 | 20,000 | 50 | 200,000 | 500 |
| 4,999 | 5 | 49,999 | 50 | 499,999 | 500 |
| 5,000 | 10 | 50,000 | 100 | 500,000 | 1,000 |

→ 6개 경계(2,000/5,000/20,000/50,000/200,000/500,000) 모두 "미만 이전 틱 / 이상 다음 틱" 정확. `1,000,000 → 1,000` 상단 클램프 정상.

### nearest 반올림 — `roundToKrxTick`

| 입력 | 출력 | 비고 |
|---|---|---|
| 76,161 | 76,200 | 100원 구간 nearest up (PR 예시) |
| 72,000 | 72,000 | 이미 호가에 정렬 → 그대로 |
| 41,973 | 41,950 | 50원 구간 nearest down |
| 6,547 | 6,550 | 10원 구간 nearest up |
| 512,300 | 512,000 | 1,000원 구간 nearest down |
| 4,999 | 5,000 | 경계 바로 아래(tick=5, round(999.8)·5=5,000) — 5,000 자체가 유효 호가, 무해 |
| 5,000 | 5,000 | 경계 정확 |
| 2,502 / 2,503 | 2,500 / 2,505 | 5원 구간 nearest 양방향 |

### 비유한/엣지 폴백

| 입력 | 출력 |
|---|---|
| `NaN` | `NaN` (그대로) |
| `Infinity` | `Infinity` (그대로) |
| `-Infinity` | `-Infinity` (그대로) |
| `krxTickSize(-3000)` | `5` (`Math.abs` 적용 — 참고) |

---

## 4. 에지 케이스

| 케이스 | 동작 | 판정 |
|---|---|---|
| BE 다운(ECONNREFUSED) | 본 PR 은 순수 클라이언트 표시 유틸·포맷팅만 변경 — 네트워크/route handler 미변경. 영향 없음 | N/A(무관) |
| `base_price` 누락/`null`/0 이하 | 가드에서 `null` 처리 → legacy `%`-only 폴백, 기존과 동일 | 통과 |
| `base_price` 비유한(NaN/Inf) | `roundToKrxTick` 가 그대로 반환 → `toLocaleString` 가 "NaN"/"∞" 표기. 단 BE 가 유한 number 만 보냄(타입 `number|null`), 가드는 유한성 미검사 → 이론상 잔여 리스크지만 기존 `Math.round` 도 동일했던 영역(무회귀) | 통과(무회귀, 비결함) |
| 경계 바로 아래 4,999 | tick=5 적용 후 5,000 으로 스냅 (5,000 은 유효 호가) | 통과 |
| 음수 price | `Math.abs` 로 tick 결정 → 부호 무관 동작, 결정 카드는 양수 가격만 사용 | 통과 |

> 비고: BE 가 음수/NaN base_price 를 보낼 경로는 없고, 본 변경 전 `Math.round` 도 같은 입력에 동일 취약성을 가졌으므로 **무회귀**. 이번 PR 범위 밖.

---

## 5. 공통 AC 무회귀

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route handler fallback 제외) | 매치는 `app/api/workbench/_adapters/fastapi.ts`(FASTAPI_BASE_URL fallback, 문서화 예외)뿐 — 본 PR 미도입. 통과 |
| 클라이언트 `fetch(` 직접호출 | `git grep -n "fetch(" -- <변경 파일>` | 0건. 통과 |
| hex/px 직타 | `git grep -nE "#[0-9a-fA-F]{6}\|[0-9]+px" -- <변경 파일>` | 본 diff 신규 hex/px 0건. (FinalVerdictCard 의 `text-[11px]` 등 arbitrary 유틸은 **기존 라인**, diff 미변경) 통과 |
| 한글 톤 | 신규 코드 주석/유틸 한글, 사용자 노출 문구 변화 없음(숫자 포맷만) | 통과 |
| 접근성 | label/Tab/aria 변경 없음 — DOM 구조 무변경(숫자값만 변경) | 무회귀 |

---

## 결론

- AC 1~5 + 공통 AC 모두 통과. 신규 7케이스 + QA 독립 25건 일치, 기존 495+ 케이스 회귀 0.
- AC-5 트레이드오프(½ 틱 이내 스냅 ↔ 표시 % 미세 어긋남)는 PR 본문 명시대로 **의도된 동작**, 결함 아님.
- 4,999 → 5,000 스냅은 5,000 이 유효 호가라 무해.
- 비유한 base_price 잔여 리스크는 본 변경 이전(`Math.round`)에도 동일했던 무회귀 영역으로 범위 밖.

**판정: qa-passed (실패 0건)**
