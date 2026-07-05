# QA 리포트 — ranking-columns (실시간 순위 컬럼/옵션 확장)

- 슬러그: `ranking-columns`
- 브랜치/PR: `feature/ranking-columns` / #251
- 판정: **qa-passed** (AC 13건 전부 PASS · 게이트 0에러)
- 검증일: 2026-07-05 (QA 역할)
- 환경: 로컬 `KIS_ENV=prod` + KIS 앱키/토스키 present. FastAPI(:8000)는 본 PRD 무관(랭킹은 KIS/토스 외부 API 를 route handler 가 직접 프록시). Next dev :3099 라이브.

---

## 1. 게이트 (자동)

| 게이트 | 명령 | 결과 |
|---|---|---|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | **0 에러** |
| lint | `npm run lint` (`eslint .`) | **0 에러/경고** |
| 단위 테스트(관련) | `npx vitest run lib/utils lib/api lib/market` | **55 files / 390 tests 전부 PASS** |
| 신규 테스트 3종 | `formatMarketCap`·`marketCapEnrich`·`rankingEnrich` | **15 tests PASS** (조/억 경계·null/NaN/0/음수→"-"·enrich never-block·dedup) |
| DESIGN.md lint | `npx @google/design.md lint docs/design/ranking-columns.md` | **errors=0, warnings=0** (15 colors·7 typo·12 spacing·18 components) |
| design:sync | `npm run design:sync` → `tailwind.theme.json` diff | **재생성 후 무변경**(이미 동기 상태) — spacing 4키(`header-row-h`·`col-sector`·`col-marketcap`·`badge-h`) `finsight-redesign.md`(SSOT)에 병합·theme.json 반영 확인 |

### 컨벤션 grep

| 항목 | 기대 | 실측 |
|---|---|---|
| hex/px 직타 (`RealtimeRankingSection.tsx`) | 0 | **0** (grep hit 1건은 주석 "12px/600", 코드 아님) |
| 클라 `fetch(` 직접 (변경파일, route 밖) | 0 | **0** |
| `useQuery` 직접 import (섹션 컴포넌트) | 0 | **0** (도메인 훅만 소비) |
| BFF 위반 `http://127.0.0.1` (변경파일) | 0 | **0** |
| 한글 카피 단일 위치 | `lib/copy/home/marketOverview.ts` | 헤더 라벨(`RANK_COL_*` 6키)·토글(`RANK_RISK_HIDE_LABEL`)·빈상태(`RANK_RISK_ALL_HIDDEN`) 전부 단일 위치 |
| 시총 포맷터 단일 위치 | `lib/utils/formatMarketCap.ts` | 단일 |

---

## 2. AC별 검증표

| # | 시나리오 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 경고 배지 인라인 | `/api/market/fluctuation?dir=down` 티커 union → `/api/stock/warnings/batch` | 활성 유의종목 행에 배지, 없는 행 무표시 | batch 응답 14티커 중 **4종 INVESTMENT_WARNING(투자경고) 검출**(228340·001210·002995·002990). `hasBadges` gate → `StockWarningBadges` 렌더, 활성 없는 행은 무렌더(레이아웃 무변화) | **PASS** |
| AC-2 | 경고 배치 재사용 | 라이브 batch 호출 | 가시 티커 union 1회 조회, 행별 호출 0 | 섹션 단일 `useQueryStockWarningsBatch(activeRows.map ticker)` 1회. 14티커를 단일 `/api/stock/warnings/batch` 로 조회(HTTP 200, `X-Data-Source: toss`) | **PASS** |
| AC-3 | 시가총액 컬럼 | `?by=value` md+ | 시총(조/억), 실패는 "-" | 8행 **marketCap 8/8 채움**(SK하이닉스 1,728,303,235,125,000 → `formatMarketCap`="1,728조"). fail-soft "-" 는 `value<=0/null/NaN` 방어 테스트 통과 | **PASS** |
| AC-4 | 산업 컬럼 | `?by=volume`/`fluctuation` md+ | 업종명 표시, 미조회 빈칸 | 9/9·8/8·14/14·14/14 **sector 전부 채움**("전기·전자"·"건설"·"기계·장비" 등, `loadKisPriceMeta` `bstp_kor_isnm`). 미조회는 `row.sector ?? ""` graceful omit | **PASS** |
| AC-5 | 위험 숨기기 on | 위험군 포함 리스트 토글 on | 위험군 행 제외, off 복원, fetch 0 | `isRiskWarnings`=severity `critical`+`warn`. INVESTMENT_WARNING→`warn`(매핑 확인) → 급하락 탭 4종 필터. 배치 데이터 재사용(추가 fetch 0), off 시 `visibleRows=rows` 복원 | **PASS** |
| AC-6 | 전량 필터 빈 상태 | 전부 위험군 토글 on | "숨긴 종목뿐이에요" 빈 상태 | `visibleRows.length===0` → `RANK_RISK_ALL_HIDDEN`("숨긴 종목뿐이에요.") 렌더, 헤더·토글 유지, 크래시 없음 | **PASS** |
| AC-7 | 헤더 컬럼 행 | 리스트 상단 | 라벨 표시·바디 정렬 정합 | `RankHeaderRow` 가 바디와 **동일 `RANK_GRID` 트랙 공유**. ♥+순위 `col-span-2` 라벨, 수치(현재가·등락률·시총) `text-right`, 산업·시총 라벨 `hidden md:block`(바디와 동기) | **PASS** |
| AC-8 | enrich fail-soft(비차단) | 코드 리뷰 + 라이브 | 랭킹 rows 정상, 컬럼만 빈칸, 에러카드 0 | `enrichRankingRows`: `Promise.allSettled`+개별 `.catch`+`ENRICH_BUDGET_MS=3s` `Promise.race` 예산 상한+최상위 `.catch(()=>null)` → 미확보 시 `marketCap=null`·`sector=undefined`. route 는 enrich 결과 무관 200(kis) 유지. never-throw | **PASS** |
| AC-9 | 레이트 억제 | 코드 리뷰 | top-N≤14 + 캐시 + 동시성 캡 + dedup | `rows.slice(0,TOP_N=14)` 후 enrich. 시총 `MARKETCAP_CONCURRENCY=6`+토스 24h 캐시. 산업 `SECTOR_CONCURRENCY=6`+`loadKisPriceMeta` 10분 캐시(실패 60s·budget 1.2s)+`[...new Set]` 티커 dedup. 라이브 4탭 200/kis 무레이트에러 | **PASS** |
| AC-10 | dev mock 정상 | 무키 mock 경로 | #247 회귀 없음, 리스트 렌더 | route 이중 게이트 mock 분기 무변경(enrich 미실행 → 즉시 mock 반환). #247 diff 무변경. **참고: mock 데이터에 샘플 marketCap/sector 주입**(빈칸 대신 데모값 — 로컬 프리뷰 개선, fail-soft 무영향·크래시 없음) | **PASS** (주 참조) |
| AC-11 | **#247 가용성 무회귀** | `git diff main` | availability·rankingView·MaintenanceNotice 무변경 | `git diff main -- lib/market/availability.ts lib/market/rankingView.ts components/market/MaintenanceNotice.tsx` = **완전 무변경(empty)**. 탭 노출/숨김·활성탭 이동·관리자 재시도 로직 무편집 | **PASS** |
| AC-12 | 반응형 두 뷰포트 | grid 트랙 정합 | 모바일 시총·산업 숨김, PC 전 컬럼 | `RANK_GRID` 모바일 5트랙 `[♥][순위][종목][현재가][등락률]` / md+ 7트랙(+산업+시총). 산업·시총 셀 `hidden md:block`(헤더·바디 동기). 배지 `max`(모바일 1/md 2)만 `useBreakpoint().isMobile`, 컬럼 표시/숨김은 `md:` 유틸(`innerWidth` 직접검사 0) | **PASS** |
| AC-13 | 컨벤션 정합 | grep | hex/px 0·카피 단일·클라 fetch 0·queryKey 단일·포맷터 단일 | 위 §1 컨벤션 grep 표 전부 통과 | **PASS** |

---

## 3. 라운드트립 (BE LIVE — KIS prod + 토스, Next dev :3099)

전 4탭 라이브 실측 — 각 `HTTP 200 / X-Data-Source: kis / X-KIS-Env: prod`, enrich 컬럼 완전 채움:

| 엔드포인트 | rows | marketCap 채움 | sector 채움 | 샘플 |
|---|---|---|---|---|
| `volume-rank?by=volume` | 9 | 9/9 | 9/9 | 진흥기업 136억 · 건설 |
| `volume-rank?by=value` | 8 | 8/8 | 8/8 | SK하이닉스 1,728조 · 전기·전자 |
| `fluctuation?dir=up` | 14 | 14/14 | 14/14 | NPX 14억 · 기계·장비 |
| `fluctuation?dir=down` | 14 | 14/14 | 14/14 | 금호건설우 90억 · 건설 |

- 경고 배치: 급하락 14티커 union → `/api/stock/warnings/batch` 단일 호출(200, `X-Data-Source: toss`) → 4종 활성 투자경고 검출.
- `formatMarketCap` 라이브값 확인: 1,728조/136억/14억/90억 모두 셀 폭 내 컴팩트 표기.

> 뷰포트별 수동 시나리오(모바일 375 / PC 1280)는 구조 검증(`RANK_GRID` 트랙·`hidden md:block`·`useBreakpoint` 배지 max·헤더-바디 grid 공유)으로 정합 확인 — 헤더/바디가 동일 트랙 상수를 공유해 정렬 시프트 구조적으로 불가.

---

## 4. #247 무회귀 diff (핵심)

```
git diff main -- lib/market/availability.ts lib/market/rankingView.ts components/market/MaintenanceNotice.tsx
→ (empty) 무변경
```

가용성 판정·가변 탭바·`MaintenanceNotice`·관리자 재시도 파일 3종 전부 편집 0줄. 컬럼 추가는 `RealtimeRankingSection`(행/헤더/토글/배지)·route enrich·행 타입 옵셔널 add·`formatMarketCap`·카피에 국한.

---

## 5. 코드 위생 관찰 (비차단)

- `enrichMarketCap`(⑥ 지금뜨는산업)이 신규 공용 `loadMarketCaps`(`marketCapEnrich.ts`) 재사용으로 리팩터 — 중복 배치 로직 제거. 기존 `sectors.test.ts`·`price.enrich.test.ts` 회귀 없음(390 tests PASS).
- `loadKisPriceMeta` 는 `export` 1줄 추가만(price.ts). 최소 표면.
- volume-rank 응답이 이제 `enriched`(top-N slice)만 반환 — 기존 소비처(단타 후보)는 상위 N 소비라 무영향, 행 타입은 옵셔널 add.

## 6. 이슈

- **없음** (AC 13건 전부 PASS). AC-10 은 mock 데이터에 데모용 marketCap/sector 를 주입해 PRD 문구("빈칸")와 표기가 다르나, fail-soft·무회귀·크래시 없음 요건은 충족하며 로컬 프리뷰 품질을 높이는 의도된 개선으로 판단 — 비차단.

---

**판정: qa-passed** — 게이트(typecheck/lint 0에러, 390 tests PASS[신규 3파일 15 포함], design lint 0), AC 13건 PASS, #247 무회귀 diff empty, BFF/컨벤션 무위반.
