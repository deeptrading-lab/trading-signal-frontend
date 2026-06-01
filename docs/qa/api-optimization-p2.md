# QA 리포트 — API 호출 최적화 P2 (`feature/api-optimization-p2`, PR #82)

- 일시: 2026-06-01
- 대상 브랜치: `feature/api-optimization-p2` (HEAD `ec93d41`)
- 환경: Node v20.19.6 / Next 16.2.6 (Turbopack) / macOS (darwin 25.5.0)
- BE(FastAPI `127.0.0.1:8000`) 상태: **DOWN** (`curl` connection refused, HTTP 000) → 라운드트립은 BE LIVE 불가. `/analyze` 라우트 dev 서버 렌더 스모크 + 정적 검증으로 대체, 시나리오 (e) BE 다운만 실측.
- PRD: 없음 (경량 최적화 트랙, 로드맵 P2). 아래 AC 는 변경 의도 3건에서 직접 도출.

## 변경 요약 (diff stat)

| 파일 | 변경 |
|---|---|
| `hooks/query/useQueryWhitelistSearch.ts` | staleTime 30_000 → 300_000 (+주석) |
| `app/api/stock/chart/route.ts` | 청크 경로에 `console.info` 관측 로그 추가 (+7) |
| `app/(main)/analyze/page.tsx` | 죽은 `WORKBENCH_*_EVENT` dispatch/listener useEffect 2개 + import 제거 (−74 순감 영역) |
| `components/workbench/workbenchEvents.ts` | 파일 삭제 (−27) |

순감 +16 / −97.

---

## AC 별 검증표

| AC | 항목 | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | typecheck | `npx tsc --noEmit` | exit 0 | `TSC_EXIT=0` | ✅ pass |
| AC-2 | lint(변경 3파일) | `npx eslint app/(main)/analyze/page.tsx app/api/stock/chart/route.ts hooks/query/useQueryWhitelistSearch.ts` | exit 0, 0 경고 | `ESLINT_EXIT=0` (출력 없음) | ✅ pass |
| AC-3 | build | `npm run build` | exit 0, 컴파일 성공 | `BUILD_EXIT=0`, `✓ Compiled successfully in 2.2s`, `/analyze` 라우트 정적(○) 생성 | ✅ pass |
| AC-4 | P2-1 staleTime 값 | `useQueryWhitelistSearch.ts` 코드 확인 | `staleTime: 300_000` | line 35 `staleTime: 300_000` | ✅ pass |
| AC-5 | P2-1 타 옵션 무변경 | 동일 파일 retry/refetchOnWindowFocus 확인 | `retry: 1`, `refetchOnWindowFocus: false` 유지 | line 36 `retry: 1`, line 37 `refetchOnWindowFocus: false` (diff 상 staleTime 라인만 변경) | ✅ pass |
| AC-6 | P2-1 symbols 5m 정합 | `hooks/stock/useQueryStockSearch.ts` 대조 | symbols 검색도 5min staleTime | `queryConfig.stock.search` = 5min / 30min → 정합 | ✅ pass |
| AC-7 | P2-2 로그 위치 = 청크 경로 한정 | `app/api/stock/chart/route.ts` 흐름 추적 | `console.info` 가 `fetchDailyChunked` 내부에만 존재, 비청크 분기 무영향 | 로그 line 70~73 은 `fetchDailyChunked` 함수 본문(line 50~88) 내부. 호출 게이트 line 115 `period === "D" && days > DAILY_CHUNK_DAYS(130)`. 비청크 분기(line 117 `fetchStockDailyChart` 직호출)에 로그 없음 | ✅ pass |
| AC-8 | P2-2 응답 무변경 | 로그가 반환 `candles` 변형하는지 | 응답/기능 변경 0 | `console.info` 는 부수효과 없는 출력. 반환값은 line 84~87 dedup+sort 결과로 로그와 독립. `jsonOk` 페이로드 무변경 | ✅ pass |
| AC-9 | P2-3 파일 삭제 | `ls components/workbench/` | `workbenchEvents.ts` 없음, `FavoriteToggle.tsx` 잔존 | 13파일, `workbenchEvents.ts` 부재 / `FavoriteToggle.tsx` 존재 | ✅ pass |
| AC-10 | P2-3 dead code dangling 참조 0 | `git grep -E "workbenchEvents\|WORKBENCH_(SELECT\|TICKER\|FAVORITE)\|Workbench(SelectHistory\|SelectFavorite\|TickerChange)Detail" -- '*.ts' '*.tsx' ':!docs'` | 소스(.ts/.tsx, docs 제외) 0 hit | `NO SOURCE HITS` (docs/ 내 과거 QA·HANDOFF·page-api-map 만 잔존, 코드 0) | ✅ pass |
| AC-11 | P2-3 제거 후 미사용 import/var 0 | tsc + eslint (no-unused-vars) | 0 에러 | AC-1/AC-2 통과로 입증. `useEffect`/`useRef` import 동반 제거됨(diff line 38) | ✅ pass |
| AC-12 | 무회귀: `/analyze` 렌더 | dev 서버 `GET /analyze` | HTTP 200, 런타임 에러/모듈 해석 실패 0 | `HTTP=200 size=40654`, 에러 마커 0, "AI 분석"·"ticker"·"분석" 마커 렌더. dev 로그 `✓ Compiled` (에러 없음) | ✅ pass |
| AC-13 | BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` route handler 제외 | 클라이언트 직접 호출 0 | hit 2건 모두 `app/api/workbench/_adapters/fastapi.ts` (route handler 측 `FASTAPI_BASE_URL` fallback, 문서화된 예외). `/analyze` page 내 `fetch(` 0건 | ✅ pass |
| AC-14 | 한글 톤 무회귀 | 추가/변경 사용자 노출 문구 | ticker/API 필드 외 한글 | 변경분에 신규 사용자 노출 문구 없음. 추가된 것은 주석(한글)·`console.info`(로그, 비노출) 뿐 | ✅ pass |

---

## P2-3 무회귀 정밀 검증 (제거된 핸들러가 깨뜨리는 기능 없음)

제거된 이벤트 버스가 담당하던 setter 들이 **다른 경로로 여전히 호출되는지** 추적:

| setter | 제거 전 호출처 | 제거 후 호출처 (잔존) | 상태 |
|---|---|---|---|
| `setSelectedTicker` | ① SearchPanel onSelect ② SELECT_HISTORY/FAVORITE listener | ① SearchPanel `onSelect={setSelectedTicker}` (page.tsx:136) | ✅ 정상 경로 유지 |
| `setField` | ① InputPanel onChange ② SELECT_HISTORY listener | ① InputPanel `setField={setField}` (page.tsx:141) → 4필드 onChange | ✅ 유지 |
| `reset` | ① handleRetry ② listener 2종 | ① `handleRetry` (page.tsx:93) | ✅ 유지 |

- **ticker 검색(SearchPanel)**: `onSelect` → `setSelectedTicker` 경로 무변경. ✅
- **4필드 입력+validation**: `InputPanel` → `setField` → `useAnalyzeForm` 무변경. `isValid`/`errors` 흐름 유지. ✅
- **분석 실행**: `handleSubmit` → `attemptSubmit` → `submit` 무변경 (제거 영역과 무관). ✅
- **별표 토글(FavoriteToggle)**: `isFavorite`/`toggleFavorite` 무변경. `FavoriteToggle.tsx` 잔존. ✅
- **pushHistory(분석 성공 시)**: `onSuccess` 콜백 안 `pushHistory` 무변경. ✅
- 제거된 dispatch(`TICKER_CHANGE`)·listener(`SELECT_HISTORY`/`SELECT_FAVORITE`)는 producer/consumer 부재(finsight-redesign 사이드바 목록 제거로 소멸) → 발화 경로 0. 제거로 깨질 동작 없음. ✅

---

## 에지 케이스

| 케이스 | 검증 | 결과 |
|---|---|---|
| 비청크 경로(days ≤ 130, 기본 100) | route.ts 분기 line 115~119 | `fetchStockDailyChart` 직호출, 로그 미발화, 응답 동일 — 일반 사용자 일봉 조회 영향 0 ✅ |
| 주봉/월봉(period W/M) | `period === "D"` 조건 | 항상 비청크 → 로그 미발화 ✅ |
| StrictMode 더블 마운트 | 제거된 useEffect 2개 | effect 제거로 마운트 시 dispatch/listener 등록 자체가 사라짐 → 더블 마운트 부작용 표면적 축소(개선) ✅ |
| 캐시 staleTime 5m 부작용 | 화이트리스트는 서버 seed 정적 | 5m 내 seed 변경 시 캐시 히트로 구버전 노출 가능하나, 정적 seed 특성상 허용 범위. symbols(5m)와 정합 ✅ |
| BE 다운(ECONNREFUSED) 시 `/analyze` | dev 서버 GET /analyze (BE down 상태) | HTTP 200, 페이지 셸·empty 상태 렌더 (분석 미실행 시 BE 호출 없음). 검색/분석 실제 호출은 ErrorCard 경로(코드 무변경) — 본 PR 변경과 무관 ✅ |
| 빈/malformed 응답 | route.ts 응답 매핑 코드 | P2-2 는 로그만 추가, `mapErrorToResponse`/`jsonOk` 무변경 → 기존 에러 처리 유지 ✅ |

---

## 라운드트립 (BE LIVE)

- BE `127.0.0.1:8000` **DOWN** 으로 (a)~(d) 실호출 라운드트립 불가.
- (e) BE 다운 시나리오: 현재 BE 다운 상태 그대로가 (e) 환경. `/analyze` dev 서버 렌더 HTTP 200 확인, 분석 미실행 셸 정상.
- 본 PR 은 **응답/기능 무변경**(P2-2 로그 관측 + P2-1 캐시 시간 + P2-3 dead code 제거)이며, 분석 6블록·사전차단·feasibility·화이트리스트 안내 등 (a)~(d) 동작 경로 코드는 본 PR 에서 일절 변경되지 않음(diff 확인). 따라서 BE LIVE 라운드트립 미수행이 본 PR 판정에 영향 없음 — 변경분 정적 검증 + `/analyze` 렌더 스모크로 무회귀 입증.
- 비고: 후속 PR(기능 변경 동반)에서는 BE 기동 후 (a)~(e) 5건 재현 권장.

## DESIGN.md 토큰 라이브 동기화 검증

- 본 PR 은 스타일링/토큰 변경 없음(globals.css·components.css·DESIGN.md 무변경). 해당 검증 N/A.

---

## 실행 로그 (요약)

```
$ npx tsc --noEmit
TSC_EXIT=0

$ npx eslint app/(main)/analyze/page.tsx app/api/stock/chart/route.ts hooks/query/useQueryWhitelistSearch.ts
ESLINT_EXIT=0   # 출력 없음

$ npm run build
✓ Compiled successfully in 2.2s
BUILD_EXIT=0    # /analyze ○(Static) 생성

$ git grep -nE "workbenchEvents|WORKBENCH_(SELECT|TICKER|FAVORITE)|Workbench(SelectHistory|SelectFavorite|TickerChange)Detail" -- '*.ts' '*.tsx' ':!docs'
NO SOURCE HITS

$ git grep -nE "http://127\.0\.0\.1" -- app/ | grep -v 'app/api/.*/route'
app/api/workbench/_adapters/fastapi.ts  # route handler fallback (예외)

$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/analyze
200   # 에러 마커 0, AI 분석/ticker 마커 렌더
```

---

## 발견 사항 (비차단 nit)

- `docs/references/page-api-map.md:100` 에 제거된 이벤트 버스(`WORKBENCH_TICKER_CHANGE_EVENT` 등)를 현행으로 서술한 문장이 잔존. **문서 stale** 일 뿐 코드 dangling 참조 아님 → 판정 무영향. 후속 문서 정리 권장(비차단).

---

## 최종 판정

**qa-passed** — 도출 AC 14건 전부 통과, 무회귀(ticker 검색·4필드·분석·별표·pushHistory) 정적+렌더 스모크 입증, dead code 소스 dangling 0, typecheck/lint/build 0 에러.

- 실패: 0건
- 비차단 nit: 1건 (page-api-map.md 문서 stale)
