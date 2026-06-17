# QA 리포트 — freshness-guard-business-days

- **PR**: #127 `feat(ai-analysis): 신선도 가드 영업일 기준 전환 (연휴 오탐 제거)`
- **브랜치**: `feature/freshness-guard-business-days` (main 대비 1커밋 `070d9d6`)
- **유형**: PRD 없는 경량 백엔드 견고화 (#124 리뷰어 메모 #2 해소)
- **검증일**: 2026-06-17
- **변경 파일**: `lib/utils/businessDays.ts`(신규), `lib/utils/__tests__/businessDays.test.ts`(신규 7건), `app/api/stock/ai-analysis/route.ts`
- **환경 제약**: 신선도 가드는 LLM 라운드트립 **전 단계** 시세 검증이므로 실 LLM 호출 불요. 실제 KIS 노후 데이터 재현은 비결정적이라 **날짜 math + 코드 경로 추적**으로 검증함(아래 표기).

---

## 1. 품질 게이트 (자동)

| 명령 | 기대 | 실측 | 판정 |
|---|---|---|---|
| `npm run typecheck` | 0 에러 | `tsc --noEmit` 무출력 종료 | ✅ |
| `npm run lint` | 0 에러 | `eslint .` 무출력 종료 | ✅ |
| `npm run build` | 성공 | `✓ Compiled successfully in 2.6s` | ✅ |
| `npm run test` | 0 failed | `Test Files 41 passed | 1 skipped`, `Tests 264 passed | 1 skipped` | ✅ |
| `npx vitest run businessDays.test.ts` | 7 passed | `7 tests passed` | ✅ |

**빌드 경고 1건 base 대조**: `Turbopack build encountered 1 warnings → ./next.config.ts (NFT list)`. `git checkout main` 후 빌드 시 **동일 경고 재현** → 본 PR 무관(설정 파일 변경 없음). 무회귀.

직전 #126이 indices/ticker 테스트의 실네트워크 의존을 제거한 결과가 정상 반영됨 — 264 passed / **0 failed** 확인.

---

## 2. `businessDaysBetween` 로직 정확성 (경계표)

단위테스트(7건) 외에 `tsx`로 직접 호출, 요일 전제를 실제 달력과 대조. (`businessDaysBetween(from, to)` = `from` 다음날부터 `to`(포함)까지 평일 수)

| # | 케이스 | 입력 | 요일 실측 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|---|
| a | 같은 날 | 06-17→06-17 | 수→수 | 0 | 0 | ✅ |
| b | from > to (미래) | 06-18→06-17 | — | 0 | 0 | ✅ |
| c | 금→월 | 06-19→06-22 | 금→월 | 1 | 1 | ✅ |
| d | 주말만(금→일) | 06-19→06-21 | 금→일 | 0 | 0 | ✅ |
| e | 콜드스타트(긴 구간) | 05-04→06-17 | 월→수 | 32 | 32 | ✅ |
| f1 | 월 경계 | 04-30→05-04 | 목→월(5/1금,5/4월) | 2 | 2 | ✅ |
| f2 | 연 경계 | 2025-12-31→2026-01-05 | 수→월(1/1목,1/2금,1/5월) | 3 | 3 | ✅ |
| g1 | 시각 포함·동일 날짜 | `06-17T23:30`→`06-17T00:01` | 수→수 | 0 | 0 | ✅ |
| g2 | 시각 포함(today=`new Date()` 시각) | `06-16T00:00`→`06-17T14:06` | 화→수 | 1 | 1 | ✅ |

- **요일 정합**: 코드가 산출한 모든 요일(`getDay()`)이 실제 2026년 달력과 일치(06-19=금, 06-22=월, 2026-01-01=목 등).
- **시·분 무시(g1/g2)**: `atMidnight()`로 자정 정규화 → today를 `new Date()`(시각 포함)로 넘겨도 날짜 단위로 동작 확인. route.ts의 `today = new Date()`(14:06 등 시각 포함)와 `latest = T00:00:00`를 함께 넣어도 정확.
- **NaN 가드(헬퍼 내부)**: `new Date("not-a-date").getTime()` → `NaN`. route.ts는 `!Number.isNaN(latest.getTime())` 통과 시에만 호출하므로 헬퍼는 항상 유효 Date를 받음.

판정: ✅ — 단위테스트 7건 그린 + 추가 경계 9건(월/연 경계·시각 포함·미래·콜드스타트) 전부 일치.

---

## 3. 가드 동작 (코드 경로 추적)

`app/api/stock/ai-analysis/route.ts:408–422` 경로:
1. `latestCandleDate = sorted[last].date`("YYYY-MM-DD") — 존재 시에만 진입.
2. `latest = new Date(\`${latestCandleDate}T00:00:00\`)` — 로컬 자정.
3. `!Number.isNaN(latest.getTime())` — 파싱 실패 시 가드 스킵(안전, 차단하지 않음).
4. `staleBusinessDays = businessDaysBetween(latest, today)` — `today = new Date()`(시각 포함).
5. `staleBusinessDays > STALE_MAX_BUSINESS_DAYS(7)` → `console.warn` + `send({type:"error", …})` + `controller.close()` + `return` (조기 중단).

가드 순서: `warmupOk`(최소 130봉) 체크 **이후**, 시그널 포맷·가격/수급 페치 **이전** — 변경 전후 위치 동일.

| 시나리오 | 최신봉→오늘 | 영업일 | 임계(>7) | 동작 | 판정 |
|---|---|---|---|---|---|
| 당일 데이터 | 06-17→06-17 | 0 | no | 통과 | ✅ |
| 전 영업일(어제) | 06-16→06-17 | 1 | no | 통과 | ✅ |
| 주말 직후 월요일(금봉) | 06-19→06-22 | 1 | no | 통과 | ✅ |
| 콜드스타트 2주 | 06-03→06-17 | 10 | yes | 차단 | ✅ |
| 콜드스타트 3주 | 05-27→06-17 | 15 | yes | 차단(단위테스트 케이스와 일치) | ✅ |
| 임계 경계 정확히 7 | 06-08→06-17 | 7 | no | 통과 | ✅ |
| 임계 경계 8 | 06-05→06-17 | 8 | yes | 차단 | ✅ |

판정: ✅ — 정상 최신(0~1영업일) 통과, 콜드스타트(수 주) 차단, 임계 경계(7 통과/8 차단) 정확. `> 7`이므로 7은 통과, 8부터 차단.

---

## 4. 오탐 회귀 (연휴 직후 — 날짜 계산)

공휴일 캘린더 없이 "임계 마진(7)이 흡수" 설계가 실제 연휴에서 오탐 없는지 확인.

| 케이스 | 최신봉→거래재개 | 영업일 | 임계 미만? | 판정 |
|---|---|---|---|---|
| 평일 연속(월→금) | 06-15→06-19 | 4 | yes | ✅ 오탐 없음 |
| 주말 끼임(금→월) | 06-19→06-22 | 1 | yes | ✅ 오탐 없음 |
| 설 연휴 직후(2/16~2/18 가정, 2/13금봉→2/19목) | 02-13→02-19 | 4 | yes | ✅ 오탐 없음 |
| 긴 연휴 가정(목봉→다음 주 목, 공휴일+주말) | 09-24→10-01 | 5 | yes | ✅ 오탐 없음 |

- 설 연휴(평일 3일 공휴일)도 최신봉 기준 4영업일 → 임계 7 미만. 긴 연휴(추석급)도 5영업일 → 미만.
- 공휴일이 카운트에 포함돼도(헬퍼는 공휴일 모름) **마진 7이 흡수** — 설계 주석대로 동작 확인.
- 변경 전 달력일 기준(`STALE_MAX_DAYS=10`)에서는 설·추석+주말 최장 ~9일 휴장이 임계 근접 → 오탐 위험이었으나, 영업일 전환으로 해소됨을 수치로 확인.

판정: ✅ — 4개 연휴/주말 패턴 모두 임계 미만, 오탐 0.

---

## 5. 무회귀

| 항목 | 명령/방법 | 결과 | 판정 |
|---|---|---|---|
| `STALE_MAX_DAYS` 잔존 참조 | `git grep STALE_MAX_DAYS -- ':!docs'` | 0건 | ✅ |
| 신규 상수 도입 위치 | `git grep STALE_MAX_BUSINESS_DAYS` | route.ts 3건(정의+주석+비교)만 | ✅ |
| `businessDaysBetween` 사용처 | `git grep businessDaysBetween` | route.ts(import+호출) + 헬퍼 정의 + 테스트 | ✅ |
| 가드 외 파이프라인 영향 | route.ts diff 검토 | `warmupOk` 체크·`evaluateSignal`·가격/수급 페치 무변경, 가드 블록만 교체 | ✅ |
| 사용자 노출 문구 회귀 | diff에서 `send(`/`message:` 변경 | 0건(에러 카피 동일), `console.warn` 로그만 "일→영업일" | ✅ |
| BFF 원칙 | `git grep http://127.0.0.1 -- ai-analysis/route.ts` | 0건 | ✅ |

판정: ✅ — 가드 블록 외 분석 파이프라인 무영향, 잔존 상수 0, 사용자 문구 무회귀.

---

## 6. 컨벤션

| 항목 | 점검 | 판정 |
|---|---|---|
| `lib/utils/` 도메인무관 헬퍼 동거 | `cn.ts`·`formatMoney.ts`·`technicalIndicators.ts` 등과 동일 계층 | ✅ |
| 순수 로직(hex/px 무관) | `git grep -E '#[0-9a-f]{3,6}|[0-9]+px' businessDays.ts` 0건 | ✅ |
| named export·JSDoc 한글 주석 | 형제 헬퍼 패턴과 정합 | ✅ |
| 카멜케이스 함수명 | `businessDaysBetween`·`atMidnight`·`isWeekend` | ✅ |
| 테스트 위치 | `lib/utils/__tests__/` 컨벤션 정합 | ✅ |

판정: ✅

---

## 종합 판정

- 전 항목 통과 — 자동 게이트(typecheck/lint/build/test 264 passed) + 경계 9건 추가 검증 + 가드 시나리오(정상/연휴/콜드스타트/임계경계) + 무회귀(잔존 상수 0·문구 무회귀·BFF) + 컨벤션 모두 ✅.
- **권고: `qa-passed`** (라벨 변경은 본 작업 범위 외 — 미수행).

### 잔여 리스크 (낮음)

1. **공휴일 미반영(설계 의도)**: 헬퍼는 공휴일을 모르고 마진(7)으로 흡수. 9~10일 초장기 연휴가 영업일 7을 초과하는 극단 케이스는 이론상 오탐 가능하나, 현실 한국 증시 연휴는 ~5영업일 이하라 임계 미만(검증됨). PR `## 다음 작업`에 운영 모니터링 명시됨.
2. **실 KIS 노후 데이터 라이브 재현 불가**: 비결정적이라 날짜 math + 코드 경로로 대체 검증함(상기 표기). 가드 자체는 순수 함수+조건분기라 라이브와 결과 동일.
3. **거래정지/관리종목**: 비정상 장기 거래정지 종목은 정상 차단되며(노후=의도), 과탐 관측 시 임계 조정 — PR 후속 작업에 기재됨.
