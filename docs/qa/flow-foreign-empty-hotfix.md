# QA 리포트 — 홈 수급 Top10 한쪽 빈 컬럼 핫픽스 (flow-foreign-empty-hotfix)

> 대상 PR: #90 (브랜치 `hotfix/flow-foreign-empty`) · QA 일자 2026-06-02
> 변경 3파일: `app/api/flow/top10/route.ts`(transient 1회 재시도) · `components/flow/InvestorFlowTop10Card.tsx`(빈 컬럼 안내+다시시도) · `lib/copy/flow/labels.ts`(카피 추가)
> 상위 기능 PRD: `docs/prd/investor-flow.md`(표면 A) — 본 핫픽스는 그 회귀 버그 수정.

## 0. 버그 / 수정 요약

- **버그**: 홈 "외국인·기관 순매수 Top10"에서 한쪽 컬럼(외국인 또는 기관)만 비어 공백으로 렌더. 원인 = 홈 진입 시 다른 KIS 위젯(지수·티커)과 동시 호출이 겹쳐 BFF의 주체 2콜 중 하나가 `EGW00201`(초당 한도)로 실패 → `safeFetch`가 빈 배열로 degrade.
- **수정 1 (route)**: `safeFetch`에 transient(`EGW00201` msg_cd / 네트워크) **1회 재시도(250ms backoff)** 추가. `isTransientError` 헬퍼(watchlist route 패턴 정합). BFF 타임아웃 sentinel만 상위 전파.
- **수정 2 (component)**: 빈 컬럼(한 주체만)에 공백 대신 안내 문구 `FLOW_TOP10_COLUMN_EMPTY` + '다시 시도' 버튼(`onRetry`→카드 `refetch()`). 양쪽 다 비면 기존 카드 전체 empty(`!hasRows`) 분기 유지.

---

## 1. AC 별 검증표

| # | 항목 | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| A1 | typecheck 0 | `npx tsc --noEmit` | exit 0 | exit 0, 출력 없음 | PASS |
| A2 | lint 0 (변경 3파일) | `npx eslint app/api/flow/top10/route.ts components/flow/InvestorFlowTop10Card.tsx lib/copy/flow/labels.ts` | exit 0 | exit 0, 위반 없음 | PASS |
| A3 | build 0 | `npm run build` | 0 에러 | `✓ Compiled successfully in 1895ms`, error grep 0건 | PASS |
| A4 | test 통과 | `npx vitest run` | 전건 통과 | **30 files / 189 tests passed**, exit 0 | PASS |
| A5 | 재시도 효과(라이브, 동시부하) | dev + KIS prod 키. `/api/market/ticker`·`/api/market/indices` 다발과 `/api/flow/top10` 동시 발사 24라운드 | 외국인·기관 각 10행 유지, 빈 컬럼 0, `x-data-source: kis` | **42개 flow 응답 전건 frgn 10 / orgn 10, 빈/짧은 컬럼 0/42**, 전건 `x-data-source: kis` | PASS |
| A6 | 단독 호출 무회귀 | `/api/flow/top10` 단독 GET | foreign 10 / institution 10, 200 | `200 OK`, foreign 10 / institution 10, `x-data-source: kis`, `x-kis-env: prod` | PASS |
| A7 | 빈 컬럼 UX 분기 | 코드 + grep | 한 주체만 비면 안내+다시시도, 둘 다 비면 카드 전체 empty | `rows.length === 0`(L163) 단일컬럼 안내+버튼 / `!hasRows`(L254) 전체 empty 유지 — 별개 분기 확인 | PASS |
| A8 | 다시시도 → refetch | grep wiring | 버튼 onClick → onRetry → `refetch()` | `onClick={onRetry}`(L168) ← `onRetry={() => refetch()}`(L262/L269) | PASS |
| A9 | isTransientError 정확성 | ad-hoc tsx 7케이스 | EGW00201(msg_cd·메시지)·network=재시도, 그 외=재시도 안 함 | **7/7 PASS** (아래 §3) | PASS |
| A10 | 타임아웃 sentinel 전파 | 코드 | 재시도 안에서도 `BFF_TIMEOUT_SENTINEL`은 throw(상위 전파) → mock-timeout 분기 | `safeFetch` 1차/재시도 catch 모두 sentinel rethrow(L98·L106-110), 비변경 분기 보존 | PASS |
| A11 | BFF 격리(클라 fetch 0) | `git grep "fetch(" components/flow hooks/flow lib/api/flow` | 클라 측 직접 `fetch(` 0건 | 매치는 전부 `prefetch`/`refetch`(TanStack Query 메서드)·주석 — 네트워크 `fetch(` 0건 | PASS |
| A12 | 127.0.0.1 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler fallback 외 0건 | 매치 3건 전부 `FASTAPI_BASE_URL` 기본값(route handler/adapter) — 위반 0 | PASS |
| A13 | 한글 톤 무회귀 | 카피 파일 점검 | 노출 문구 한글 격리, 영문 전용 UI 문구 없음 | `lib/copy/flow/labels.ts` 한글, 영문 전용 사용자 문구 0건. 신규 `FLOW_TOP10_COLUMN_EMPTY` 한글 | PASS |
| A14 | design:sync 멱등 | `npm run design:sync` 후 theme diff | `tailwind.theme.json` 변동 0(컴포넌트/route만 변경) | sync 후 `git status --porcelain tailwind.theme.json` 출력 없음(diff 0) | PASS |
| A15 | innerWidth 무회귀 | `git grep "innerWidth" components/flow` | 0건 | 0건(exit 1) | PASS |

---

## 2. 라이브 동시부하 재현 (핵심)

dev 서버(`:3000`) + KIS **prod 키**(`KIS_ENV=prod`, 이중게이트 통과 → 실호출). FastAPI(`:8000`)는 본 핫픽스가 KIS 직접 도메인이라 무관(미기동).

**시나리오**: 홈 진입 동시성 재현 — 매 라운드 `/api/market/ticker`·`/api/market/indices`를 다발(라운드당 4~8콜)로 발사하면서 `/api/flow/top10`을 동시에 호출(`curl ... &` + `wait`). 수정 전엔 이 상황에서 간헐 빈 컬럼 발생.

### 라운드 1 — 단발 flow + 중간 부하 (8라운드)

```
round | frgn | orgn | x-data-source | empty-col?
    1~8 |  10  |  10  | kis           | ok (전건)
=== empty/short columns over 8 rounds: 0 ===
```

### 라운드 2 — flow + 8콜 동시 헤비 버스트 (10라운드)

```
round | frgn | orgn | src | flag
    1~10 |  10 |  10  | kis | ok (전건)
=== empty/short over 10 heavy rounds: 0 ===
```

### 라운드 3 — flow 2개 동시 발사 + 6콜 부하 (6라운드 × 4컬럼)

```
round | f1 | o1 | f2 | o2 | flag
    1~6 | 10 | 10 | 10 | 10 | ok (전건)
=== short columns over 6 dual-fire rounds (4 cols each): 0 ===
```

**합계: 24라운드 / flow 응답 42건 / 검사 컬럼 60개 — 빈·짧은 컬럼 0건, 전건 `x-data-source: kis`.**

dev 로그상 `/api/flow/top10` 응답시간 ~272~600ms(application-code ~263~456ms)로 일관 — 주체 2콜 순차 + 150ms 지연 범위. 본 부하에서 `EGW00201`이 실제로는 트리거되지 않아(토큰 캐싱 + SUBJECT_DELAY 1차 방어가 충분) 재시도 backoff가 가산된 흔적은 없음. **재시도 경로는 발화하지 않아도 되는 안전망**으로 동작했고, 결과적으로 빈 컬럼 0건이 목표(수정 전 간헐 빈 컬럼 → 수정 후 0).

> 비고: 자연 부하로 `EGW00201`을 강제 트리거하지 못했으므로, 재시도 분기의 정확성은 §3 결정론적 검증으로 보강.

---

## 3. isTransientError 결정론 검증 (재시도 분기 정확성)

route의 `isTransientError`와 동일 로직을 ad-hoc `tsx`로 대표 에러 7종에 대해 검증.

```
PASS  EGW00201 via detail.msg_cd -> true   (expect true)
PASS  메시지 '초당 거래건수'      -> true   (expect true)
PASS  network kind               -> true   (expect true)
PASS  validation (비-transient)  -> false  (expect false)
PASS  server 일반 (비-transient) -> false  (expect false)
PASS  non-ApiError plain Error   -> false  (expect false)
PASS  다른 msg_cd (EGW00999)     -> false  (expect false)
ALL TRANSIENT CASES PASS (7/7)
```

- `EGW00201`(detail.msg_cd 경로 + "초당 거래건수" 메시지 경로 둘 다)·network → **재시도**.
- validation·server-generic·non-ApiError·기타 msg_cd → **재시도 안 함 → 빈배열 degrade 유지**(잘못된 응답에 불필요한 재시도·지연 가산 방지).
- 패턴은 기존 `app/api/watchlist/route.ts`의 `isTransientError`와 정합(테스트 `app/api/watchlist/__tests__/route.test.ts`가 동일 EGW00201 케이스 커버).

---

## 4. 에지 케이스

| 케이스 | 처리 | 확인 |
|---|---|---|
| 한 주체만 빈 배열(재시도 후에도 실패) | 해당 컬럼만 안내 문구 + '다시 시도' 버튼, 다른 주체는 정상 노출 | `FlowColumn`의 `rows.length === 0` 분기(L163-172). `onRetry`로 카드 전체 refetch |
| 양 주체 모두 빈 배열 | route가 `__ALL_FAILED__` → 502, 카드는 `!hasRows`(L254) → `FLOW_TOP10_EMPTY` 전체 빈상태 | 기존 분기 보존, 단일컬럼 분기와 충돌 없음 |
| 빈 컬럼의 "더보기" 토글 | `truncated = rows.length > 5` = false → 더보기 버튼 미노출(확장할 행 없음) | 코드상 무모순 |
| 타임아웃(sentinel) | 1차·재시도 catch 모두 sentinel rethrow → 상위 `mapErrorToResponse` → mock-timeout fallback(`X-Data-Source: mock-timeout`) | 비변경 분기 보존, A10 |
| 비-transient 실패(잘못된 응답) | 재시도 없이 즉시 빈배열 degrade | §3 검증 |
| design 토큰 | 컴포넌트/route만 변경, 신규 토큰 0 → `design:sync` 멱등 | A14 |

---

## 5. 반응형 / 마운트 무회귀

- 카드 마운트: `components/home/MarketOverviewPage.tsx` L48 `<InvestorFlowTop10Card />` — 변경 없음.
- 반응형 구조: `grid-cols-1 lg:grid-cols-2`(데스크탑 2열/모바일 세로 스택)·모바일 Top5 절단+더보기(`hidden md:block`·`md:hidden`)·`lg:border-l` — 본 핫픽스 미변경. 빈 컬럼 안내는 기존 `FlowColumn <section>` 내부 그리드 셀에 렌더되어 2뷰포트 레이아웃 보존.
- 홈 페이지(`GET /`) 데스크탑 UA 200, dev 로그상 마운트 정상.

---

## 6. 판정

전 항목 PASS. 빌드/타입/린트/테스트 0 에러, vitest 189/189. 라이브 동시부하 24라운드 42응답 60컬럼 **빈 컬럼 0건**(`x-data-source: kis`). 재시도 분기 결정론 검증 7/7. 빈 컬럼 UX·다시시도 refetch·타임아웃 sentinel 전파·BFF 격리·한글 톤·design:sync 멱등 모두 무회귀.

**판정: qa-passed**

---

## 참고 (검증 환경)

- KIS_ENV=prod (이중게이트 통과, 실호출). FastAPI :8000 미관여(KIS 직접 도메인).
- dev 서버 `npm run dev`(:3000) 백그라운드 기동 → 검증 후 종료.
- 단독·동시부하 모두 `x-data-source: kis` 확인.
