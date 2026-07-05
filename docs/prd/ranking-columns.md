# PRD — ranking-columns (실시간 순위 컬럼·옵션 확장: 경고배지·시가총액·산업·위험숨기기)

- 슬러그: `ranking-columns`
- 상태: 기획 (impl 전)
- 작성: 2026-07-05 (PM 역할)
- 브랜치: `feature/ranking-columns`
- 관련:
  - `docs/prd/market-status-aware-home.md` — 실시간 순위 **현 구조**(4탭 가용성 기반 렌더, `RealtimeRankingSection`, `MaintenanceNotice`, `dataSource` 판정). 본 PRD 는 이 구조 위에 **컬럼·옵션만 add** 하고 가용성 모델은 손대지 않는다.
  - `docs/prd/trending-sectors.md` — **시총 enrich 선례**(`sectorConstituents.ts` 의 `enrichMarketCap`: 토스 마스터 `sharesOutstanding × price` + 동시성 캡 + 24h 캐시 + fail-soft null). 본 PRD 의 시총 컬럼이 그대로 답습.
  - `lib/api/kis/sectorConstituents.ts` — `enrichMarketCap()` 재사용 원본(동시성 캡 6·`getTossStockMaster` 24h 캐시·실패 null·원순서 보존).
  - `lib/api/kis/price.ts` — `createKisMetaLoader`/`loadKisPriceMeta`(tossEnrich): 업종(`sector`=`bstp_kor_isnm`)·외인비율을 KIS `inquire-price` 로 per-ticker best-effort 조회(ttl 10분·failure 캐시 60s·budget 1.2s). **산업 컬럼의 소스.**
  - `hooks/stock/useQueryStockWarningsBatch.ts` + `components/stock/StockWarningBadges.tsx` — **경고 배지 재사용 원본**(단타 워치 표·관심종목이 이미 소비). 가시 티커 union 1회 조회, fail-soft 빈 맵, 장중 60s 갱신.
  - `app/api/market/volume-rank/route.ts`·`app/api/market/fluctuation/route.ts` — 랭킹 BFF(이중 게이트·`TOP_N=14`·`X-Data-Source`). 본 PRD 가 시총·산업 enrich 를 얹을 지점.
  - `lib/types/market/volumeRank.ts`(`VolumeRankRow`) + fluctuation 행 타입 → `RealtimeRankingSection` 의 `RankableRow`(이미 `sector?` 옵셔널 슬롯 보유).
  - `docs/rules/frontend.md` — FE 컨벤션 8개 절.
- **UI 포함: yes** (실시간 순위 행에 경고배지·시총·산업 컬럼 + 헤더 컬럼 행 + 위험숨기기 토글. UX/UI 디자이너 합류 트리거 — §9 q3·q4·q5)

---

## 1. 배경 / 문제

토스 실시간 차트는 순위 리스트에 **헤더 컬럼(순위·현재가·등락률·거래대금·시가총액·산업)** 을 두고, 각 행에 투자유의 배지를 인라인으로 붙인다. 우리 마켓 홈의 실시간 순위(`RealtimeRankingSection`, 4탭 거래량/거래대금/급상승/급하락, `market-status-aware-home`#247 의 가용성 기반 렌더)는 현재 **[♥ 관심][순위][로고닷+종목명][현재가][등락률]** 만 보여준다. 산업(sector) 컬럼 슬롯(`RankableRow.sector?`)은 있으나 랭킹 TR 이 업종을 싣지 않아 항상 graceful omit 된다.

세 가지 정보 격차:
1. **경고(투자유의)가 이미 인프라에 있는데 순위엔 안 보인다.** 우리는 토스 warnings(투자위험·투자경고·정리매매·단기과열·VI)를 `useQueryStockWarningsBatch` + `StockWarningBadges` 로 **종목 헤더·단타 워치 표·관심종목 행에서 이미 표시**한다. 사용자는 "실시간 순위에서도 warnings 를 가져올 수 있는데 왜 안 보여주냐"고 지적했다 — 정당한 지적. 순위는 오히려 위험 종목이 급등락으로 자주 올라오는 지면이라 배지 가치가 높다.
2. **시가총액이 없다.** 급등한 종목이 대형주인지 잔주(소형주)인지 한눈에 안 잡힌다. 우리는 이미 `trending-sectors` 에서 토스 마스터 `sharesOutstanding × price` 로 시총을 계산하는 `enrichMarketCap` 자산을 갖고 있다.
3. **산업(업종)이 없다.** "지금 뭐가 통째로 움직이나"의 렌즈. `loadKisPriceMeta`(tossEnrich)가 이미 per-ticker sector 를 준다.

본 PRD 는 **이 세 컬럼 + 위험숨기기 토글 + 헤더 컬럼 행**을 실시간 순위에 add 한다. **가용성 모델(#247)·MaintenanceNotice·관리자 재시도는 무변경** — 순수 컬럼/옵션 추가다.

## 2. 목표 (측정 가능)

1. **경고 배지 인라인** — 실시간 순위 각 행에 활성 투자유의 배지(`StockWarningBadges`)가 표시된다(활성 항목 없으면 무표시·레이아웃 무변화). 가시 티커 union 을 `useQueryStockWarningsBatch` 로 1회 조회.
2. **시가총액 컬럼** — 각 행에 시총(토스 마스터 `sharesOutstanding × price`)이 조/억 단위로 표시된다. 토스 미설정·실패는 빈칸(fail-soft, 크래시 없음).
3. **산업 컬럼** — 각 행에 업종명(`loadKisPriceMeta` 의 `sector`)이 표시된다. 미조회는 빈칸(graceful omit).
4. **위험 숨기기 토글** — 순위 상단 토글로 위험 종목(투자위험·투자경고)을 리스트에서 제외/복원한다(경고 배치 데이터 재사용). 기본값 §9 q4.
5. **헤더 컬럼 행** — 리스트 상단에 컬럼 라벨(순위·종목·산업·현재가·등락률·시총) 헤더 행이 있다.
6. **enrich fail-soft·레이트 억제** — 시총(토스)·산업(KIS) enrich 는 상위 N(≤14) 한정 + 동시성 캡 + 캐시 + fail-soft. prod 야간점검·레이트리밋(EGW00201/토스 레이트)에도 순위 리스트가 크래시·에러 카드 없이 렌더된다.
7. **#247 가용성 모델 무회귀** — 4탭 가용성 판정·`MaintenanceNotice`·관리자 재시도·탭 노출/숨김 로직이 **완전 무변경**. 컬럼 추가는 행 렌더·행 타입·토글에 국한.
8. **반응형 무붕괴** — 컬럼이 늘어도 두 뷰포트에서 정렬이 깨지지 않는다. 모바일은 시총·산업 컬럼을 우선순위 규칙(`useBreakpoint`/`md:`)으로 숨긴다.

## 3. 범위 (In scope)

### 3-1. 랭킹 행 타입 확장 — `lib/types/market/volumeRank.ts` + fluctuation 행 타입

- `VolumeRankRow` 및 fluctuation 행 타입에 **옵셔널** 필드 add: `marketCap?: number | null`, `sector?: string`.
  - 옵셔널 add 라 기존 소비처(단타 후보 추천 `IntradayWatch*` 등) **무회귀**(read 안 하면 무영향).
- `RealtimeRankingSection.RankableRow` 는 이미 `sector?` 슬롯 보유 → `marketCap?` 만 추가. `hasSector`/컬럼 자동 부활 로직(현행) 재사용.

### 3-2. 서버 enrich (시총·산업) — `app/api/market/volume-rank/route.ts` · `app/api/market/fluctuation/route.ts`

**설계 결정(§8 q1): 시총·산업 enrich 는 서버(BFF route)에서 한다.** 근거:
- **산업**은 KIS `inquire-price`(`loadKisPriceMeta`, appkey/appsecret/토큰) 로만 얻는다 — **서버 전용 자격증명**이라 클라 batch 훅으로 불가.
- **시총**은 토스 마스터(`getTossStockMaster`, `isTossConfigured`) — 역시 서버 전용. 클라 배치 엔드포인트가 없다(신설하면 표면 증가).
- 두 소스 모두 이미 **서버 측 배치 enrich 선례**(`enrichMarketCap` 동시성 캡·캐시·fail-soft)를 갖고 있어 route 에 얹는 게 자연스럽다.
- **경고만 예외**로 클라 `useQueryStockWarningsBatch`(§3-3) — 이미 존재하는 지면 정합 훅 + 장중 60s 갱신(VI 추적)이 route staleTime 보다 적합.

구현:
- 랭킹 결과 `rows.slice(0, TOP_N)`(≤14) 에 대해 **시총·산업 병렬 enrich** 후 응답. 순수 add — `X-Data-Source`·이중 게이트·`TOP_N`·502/mock-* 폴백 로직 **무변경**.
- **시총**: `sectorConstituents.ts` 의 `enrichMarketCap` 을 공용화(예: `lib/api/kis/marketCapEnrich.ts` 로 추출 또는 재사용). 토스 미설정 시 즉시 원본(전부 null). 동시성 캡 6·24h 캐시·fail-soft null·원순서 보존.
- **산업**: `loadKisPriceMeta`(tossEnrich) 를 top-N 에 fan-out — ttl 10분·failure 캐시 60s·budget 1.2s. 실패·미조회는 `sector` 미설정(빈칸).
- **enrich 는 best-effort·비차단**: enrich 실패/타임아웃이 랭킹 응답 자체를 실패시키지 않는다(랭킹 rows 는 그대로, 컬럼만 빈칸). enrich 예산 초과 시 부분 채움 허용.
- **레이트 억제(§8 q2)**: top-N 한정 + `loadKisPriceMeta` 10분 캐시 + 토스 24h 캐시 + 동시성 캡. 4탭 상위종목은 대형주 위주로 **탭 간 중복** → 캐시 dedup 이 실호출을 크게 줄인다. prod 주간 실측에서 EGW00201 관측 시 산업 enrich N 축소 또는 활성탭 한정으로 폴백(q2).

### 3-3. 경고 배지 (클라 배치) — `RealtimeRankingSection`

- 가시 랭킹 행 티커 union 을 `useQueryStockWarningsBatch(tickers)` 로 조회(기존 훅·기존 `/api/stock/warnings/batch` BFF, 신규 배선 0). fail-soft 빈 맵, 장중 60s 갱신.
- 각 행(`RankRow`)에서 `warnings[ticker]` 를 `StockWarningBadges`(size `sm`, `max` 로 좁은 지면 상한) 로 렌더. 활성 항목 없으면 무표시.
- 티커 union 은 **활성(effective) 탭 리스트** 기준(전 4탭 아님) — 화면에 보이는 행만. 탭 전환 시 union 갱신, `staleTime` 로 재조회 억제.

### 3-4. 위험 숨기기 토글 — `RealtimeRankingSection`

- 순위 상단(헤더 근처)에 "위험 종목 숨기기" 토글. on 이면 warnings 맵에서 **위험군(투자위험·투자경고)** 에 해당하는 티커 행을 리스트에서 필터.
- 위험군 판정은 §3-3 이 이미 받은 배치 데이터 재사용(추가 fetch 0). 판정 기준(어떤 warningType 이 "위험")은 `lib/copy/stock/warnings.ts` 의 severity(`critical`/`warn`) 매핑 재사용 — `critical`(정리매매·투자위험 등) + `warn`(투자경고 등)을 위험군으로. 최종 포함 범위는 구현 시 severity 로 고정.
- 토글 상태는 컴포넌트 로컬 state(URL 동기화·영속 없음 — 후속). 기본값 §9 q4.
- 필터로 리스트가 비면 "숨긴 종목뿐이에요" 류 빈 상태(크래시 없음). 토글 off 시 전체 복원.

### 3-5. 헤더 컬럼 행 + 컬럼 렌더 — `RealtimeRankingSection`

- 리스트 상단에 컬럼 헤더 행: 순위 · 종목 · (산업) · 현재가 · 등락률 · (시총). 배지는 종목 셀 인접(별도 헤더 없음).
- `RankRow` 그리드 확장: 기존 `grid-cols-[auto_1.25rem_1fr_(8rem)_auto]` 에 **시총 셀** 추가. 산업 셀은 현행 `showSector` md+ 조건 재사용. 시총 셀도 동일하게 **md+ 노출·모바일 숨김**(§3-6, q3).
- 시총 표기: 조/억 단위(§9 q5). 산업: truncate. 배지: 종목명 옆 or 아래(디자이너 q3).
- 색·간격 디자인 토큰만(hex/px 직타 금지). 한글 카피(헤더 라벨·토글 라벨·빈 상태)는 `lib/copy/home/marketOverview.ts` 단일 위치 확장. `cn` 헬퍼.

### 3-6. 반응형 — 컬럼 우선순위 (§9 q3)

- 좁은 뷰포트에서 **시총·산업 컬럼 숨김**(현행 산업 `md:block` 패턴 확장) → 모바일 기본: [♥][순위][종목+배지][현재가][등락률]. `md:` 이상에서 산업·시총 부활.
- 헤더 컬럼 행도 동일 브레이크포인트로 셀 표시/숨김 동기화(헤더-바디 컬럼 정합).
- JS 분기 필요 시 `useBreakpoint`(직접 `innerWidth` 금지). Tailwind `md:`/`lg:` 1차.

### 3-7. 시총 포맷터 — `lib/utils/formatMoney.ts` 또는 신규 유틸 (q5)

- 시총 조/억 표기 포맷터 신설(예 `formatMarketCap(krw)` → "12.3조" / "8,450억" / null→"-"). `formatNetBuy`(억원 환산) 패턴 답습, 토큰·NaN 방어. 기존 `formatMoney`(콤마만) 로는 조/억 표기 불가 → 신규 필요. 단일 위치.

## 4. 비범위 (Out of scope)

- **토스증권 거래비율**(매수/매도 비율, 토스 독점 데이터) — 미보유. 후속·불가.
- **토스 AI 요약** — 토스 독점. 우리 AI 분석으로 대체는 **별건 후속 PRD**.
- **국내/해외(US) 랭킹 토글** — 국내에 한정. 후속.
- **기간별 랭킹**(1일·1주·1개월·1년) — 현행 실시간 스냅샷 유지. 후속.
- **가용성 모델·MaintenanceNotice·관리자 재시도·탭 노출/숨김 로직 변경** — #247 소유. 본 PRD 무변경(순수 컬럼/옵션 add).
- **위험숨기기 토글 영속/URL 동기화** — 컴포넌트 로컬 state 로 시작. 영속은 후속.
- **시총·산업 정렬 컬럼(클릭 정렬)** — 표시만. 정렬은 랭킹 TR 기준(거래량/거래대금/등락률) 유지. 컬럼 클릭 재정렬은 후속.
- **배지 상세 툴팁/모달** — 배지 표시까지. 상세는 종목 상세(기존)에서.
- **클라 시총/산업 배치 엔드포인트 신설** — 서버 enrich(§3-2)로 해결. 클라 배치 BFF 안 만든다.

## 5. 수용 기준 (AC)

QA 가 표로 검증. 소스 시나리오는 로컬 무키(mock)/prod 정상(kis)/prod 야간점검(mock-*·502)로 재현. 경고 시나리오는 실제 유의종목(예: 투자경고 종목) 또는 warnings 배치 응답 모킹. 뷰포트별 재현.

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-1 | 경고 배지 인라인 | 순위에 활성 유의종목 포함(투자경고 등) | 해당 행에 `StockWarningBadges`(투자경고 등) 표시. 활성 없는 행은 배지 무표시(레이아웃 무변화) |
| AC-2 | 경고 배치 재사용 | 네트워크 탭 | 가시 티커 union 이 `/api/stock/warnings/batch` **1회** 조회(행마다 개별 호출 0). 토스 미설정 시 빈 맵·배지 0(크래시 없음) |
| AC-3 | 시가총액 컬럼 | prod 정상(`dataSource=kis`), md+ 뷰포트 | 각 행 시총(조/억)이 표시. 토스 미설정/실패 종목은 빈칸("-"), 크래시·NaN 없음 |
| AC-4 | 산업 컬럼 | prod 정상, md+ 뷰포트 | 각 행 업종명 표시. `loadKisPriceMeta` 미조회 종목은 빈칸(graceful omit) |
| AC-5 | 위험 숨기기 토글 on | 위험군(투자위험/투자경고) 포함 리스트에서 토글 on | 위험군 행이 리스트에서 제외. 재클릭(off) 시 복원. 추가 fetch 0(배치 재사용) |
| AC-6 | 위험 숨기기 전량 필터 | 전부 위험군인(드문) 리스트 토글 on | "숨긴 종목뿐" 빈 상태, 크래시 없음. off 로 복원 |
| AC-7 | 헤더 컬럼 행 | 순위 리스트 상단 | 헤더 라벨(순위·종목·산업·현재가·등락률·시총) 표시, 바디 컬럼과 정렬 정합 |
| AC-8 | enrich fail-soft(비차단) | prod 야간점검(KIS/토스 실패) 또는 토스 미설정 | 랭킹 rows 는 정상 렌더, 시총·산업만 빈칸. **랭킹 응답 자체는 실패하지 않음**(에러 카드 0) |
| AC-9 | 레이트 억제 | prod 주간 진입, KIS 콜 관찰 | 시총·산업 enrich 가 top-N(≤14) 한정 + 캐시(산업 10분·토스 24h) + 동시성 캡 → EGW00201/토스 레이트 미유발(주간 실측). 4탭 중복 종목 캐시 dedup 확인 |
| AC-10 | dev mock 정상 | 로컬 무키(`dataSource=mock`) | 4탭 mock 정상 표시(#247 회귀 없음). 시총·산업은 미설정이라 빈칸, 배지 0. 리스트 렌더 정상 |
| AC-11 | **#247 가용성 무회귀** | 전탭 unavailable / 일부 탭 숨김 / 관리자 재시도 | `MaintenanceNotice`·탭 숨김·관리자 재시도·첫 available 탭 이동이 **기존과 동일**. `git diff lib/market/availability.ts lib/market/rankingView.ts components/market/MaintenanceNotice.tsx` = 무변경 |
| AC-12 | 반응형 두 뷰포트 | 모바일·PC | 모바일: 시총·산업 숨김, [♥][순위][종목+배지][현재가][등락률] 정렬 정합. PC: 전 컬럼 + 헤더 정합. 줄바꿈·오버플로 깨짐 없음(`md:` + `useBreakpoint`) |
| AC-13 | 컨벤션 정합 | `git grep` | hex/px 직타 0(`RealtimeRankingSection`), 한글 카피 `lib/copy/home/marketOverview.ts` 단일, 클라 `fetch(` 0(route 안 예외), `useQuery` 직접 import 0(도메인 훅만), queryKey 단일 위치. 시총 포맷터 단일 위치 |

## 6. 데이터 / API

### 6-1. 소스별 컬럼

| 컬럼 | 소스 | 위치 | 캐시 | fail-soft |
|---|---|---|---|---|
| 경고 배지 | 토스 warnings(`fetchActiveWarningsBatch`) | **클라** `useQueryStockWarningsBatch` → `/api/stock/warnings/batch` | 60s(장중 refetch) | 빈 맵 → 배지 0 |
| 시가총액 | 토스 마스터 `sharesOutstanding × price`(`getTossStockMaster`) | **서버** volume-rank/fluctuation route enrich | 24h(마스터) | `marketCap=null` → "-" |
| 산업 | KIS `inquire-price` `bstp_kor_isnm`(`loadKisPriceMeta`) | **서버** route enrich | 10분(+실패 60s) | `sector` 미설정 → 빈칸 |

### 6-2. enrich 규칙 (선례 답습)

- **top-N 한정**(≤`TOP_N=14`) — 랭킹 route 가 이미 slice. enrich 대상은 그 범위만.
- **동시성 캡** — `enrichMarketCap` 의 `MARKETCAP_CONCURRENCY=6` 답습. 산업 fan-out 도 동일 캡 또는 `loadKisPriceMeta` budget(1.2s) 내.
- **never-block** — enrich 는 `Promise.allSettled`/best-effort. 실패·타임아웃이 랭킹 rows 를 죽이지 않는다(§3-2).
- **소스 헤더 무변경** — enrich 결과와 무관하게 `X-Data-Source`(kis/mock/mock-*)·502 폴백은 랭킹 판정 기준 그대로(#247). 즉 enrich 실패는 "점검 중" 을 유발하지 않는다.

### 6-3. 위험군 판정

- `lib/copy/stock/warnings.ts` 의 `toWarningChips` severity(`critical`/`warn`/`info`) 재사용. 위험숨기기 = severity `critical`+`warn` 를 위험군으로 필터(최종 범위는 구현 시 severity 로 고정, q4 참조).

## 7. 가정 · 제약 · 참고

- **선행 머지 전제**: `market-status-aware-home`(#247, 실시간 순위 가용성 구조·`MaintenanceNotice`·`useMe`) main 반영됨. `trending-sectors`(`enrichMarketCap`·`SectorConstituent`)·`stock-warnings`/`intraday-warnings`(`useQueryStockWarningsBatch`·`StockWarningBadges`·`toWarningChips`) 머지 완료 — 본 PRD 는 이 자산들을 **재사용만** 한다(신규 인프라 최소).
- **prod KIS/토스 라이브**: 시총(토스)·산업(KIS) enrich 는 prod 에서만 실데이터. 로컬 무키/비-prod 는 빈칸(mock 랭킹 정상 표시). 야간점검(~21:50~23시대 전 TR 500) 시각엔 enrich 실패 → 빈칸(랭킹은 #247 판정에 따라 mock/점검). **라이브 시총·산업 실검증은 주간(평일 09~15:30 권장, 주말·장외 KIS 랭킹 제공 시각 포함)**.
- **레이트리밋**: 3소스 배치(시총·산업·경고) 동시 → EGW00201/토스 레이트 위험. top-N 한정 + 캐시 + 동시성 캡 + fail-soft 로 억제(§6-2). 산업(KIS per-ticker inquire-price)이 최대 비용 축 — q2 실측 필요.
- **경고 배치 지면 정합**: `useQueryStockWarningsBatch` 는 이미 워치·단타·관심종목에서 소비 중 → 순위 추가는 union 티커만 늘린다. `/api/stock/warnings/batch` MAX_TICKERS=50 상한 내(순위 union ≤14).
- **#247 무경계**: 가용성 판정·탭 렌더·`MaintenanceNotice`·관리자 재시도 파일은 편집 대상 아님(AC-11 diff 무변경). 편집 지점 = 행 타입·route enrich·`RealtimeRankingSection` 행/토글/헤더·카피·시총 포맷터.
- 참고 파일: `components/home/RealtimeRankingSection.tsx`(행·토글·헤더·배지), `app/api/market/volume-rank/route.ts`·`fluctuation/route.ts`(enrich), `lib/api/kis/sectorConstituents.ts`(`enrichMarketCap`), `lib/api/kis/price.ts`(`loadKisPriceMeta`), `hooks/stock/useQueryStockWarningsBatch.ts`·`components/stock/StockWarningBadges.tsx`(배지), `lib/types/market/volumeRank.ts`(행 타입), `lib/copy/stock/warnings.ts`(severity), `lib/copy/home/marketOverview.ts`(카피), `lib/utils/formatNetBuy.ts`(조/억 포맷 선례), `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: (a) 행 타입 확장(옵셔널 2필드, ~10), (b) route enrich 2개 + 시총 enrich 공용화(~60~110), (c) 배지 클라 배선(union·map·행 렌더, ~30~50), (d) 위험숨기기 토글(~30~50), (e) 헤더 컬럼 행 + 시총 셀 + 반응형(~50~90), (f) 시총 포맷터 + 카피(~30). 대략 **210~340 라인**. 순수 add 성격 강해 회귀면적 작음(가용성 로직 무편집).
- **커밋 분할 권고**:
  1. `feat(market)`: 행 타입 확장 + route 서버 enrich(시총·산업, `enrichMarketCap` 공용화 + `loadKisPriceMeta` fan-out) — 데이터 계층, 독립 검증.
  2. `chore(utils)`: 시총 조/억 포맷터 + 카피.
  3. `feat(home)`: 경고 배지 배선 + 위험숨기기 토글 + 헤더 컬럼 행 + 시총/산업 셀 + 반응형(디자이너 DESIGN.md 신규 색/간격 시 선행).
- **PRD 분할 판단**: **단일 PRD 유지**. 4개 컬럼/옵션이 한 지면(`RealtimeRankingSection`)의 한 사용자 흐름(순위 훑기)이고, 데이터 계층(시총·산업 enrich)이 연속적이며 모두 기존 자산 재사용이라 표면이 작다. 디자이너 의존은 배지 배치·토글·헤더 시각에 국한(§9 q3·q4) → 같은 브랜치에서 흡수.
- **q1 enrich 위치(서버 vs 클라) — 서버 확정에 가까움**: 산업(KIS)·시총(토스) 둘 다 **서버 전용 자격증명**이 필요해 클라 batch 훅으로는 애초에 불가(클라 배치 BFF 신설은 표면 증가·비범위). 서버 route enrich 가 유일하게 자연스럽고 `enrichMarketCap` 선례와 정합. 경고만 클라(기존 훅·장중 갱신 이점). → §9 q1 은 "서버 확정 + 경고 클라" 로 권고.
- **q2 레이트리밋(산업이 binding)**: 랭킹 TR(FHPST01710000/01700000)은 sector 를 행에 안 싣는다 → 산업은 **per-ticker KIS inquire-price(FHKST01010100) fan-out** 이 유일 경로 = 최대 비용. top-N≤14 + `loadKisPriceMeta` 10분 캐시 + 4탭 대형주 중복 캐시 dedup + 동시성 캡 + budget 1.2s 로 억제. 그래도 콜드 홈 진입 = 최대 4탭×14 산업콜(중복 제외 실질 훨씬 적음). **PM 권고: 위 억제로 1차, prod 주간 실측에서 EGW00201 관측 시 (a) 산업 enrich 를 활성탭 rows 한정, 또는 (b) N 축소, 또는 (c) 산업 컬럼을 md+ 뿐 아니라 지연 로드로 폴백.** 실측(주간+야간) 필수.
- **회귀 위험**: 가용성 로직 무편집(AC-11 diff 게이트). 행 타입은 옵셔널 add(기존 소비처 무영향). enrich 는 never-block(AC-8). 최대 리스크 = (1) 산업 fan-out EGW00201(→ q2 억제·실측), (2) enrich 가 랭킹 응답을 차단(→ best-effort·AC-8 방어), (3) 위험숨기기 필터로 리스트 빈 상태(→ AC-6). prod dormant 아님(즉시 발현) — 배포 후 주간 실검증 필요.

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. 시총·산업 enrich 위치 — 서버 route vs 클라 batch 훅.** **PM 권고: 서버(BFF route) enrich 확정 + 경고만 클라 배치.** 산업(KIS)·시총(토스)은 서버 전용 자격증명이 필요해 클라 훅으로 불가에 가깝고, `enrichMarketCap` 서버 선례와 정합(§8). 경고는 기존 `useQueryStockWarningsBatch`(지면 정합·장중 60s 갱신)로 클라. — 리뷰어가 클라 배치 엔드포인트 신설을 원하면 표면·레이트 증가로 비권장.
- **[OPEN QUESTION] q2. 산업 컬럼 per-ticker KIS 조회 레이트리밋.** 산업은 랭킹 TR 이 안 실어 per-ticker inquire-price fan-out 이 유일 경로 = binding 비용. **PM 권고: top-N≤14 한정 + `loadKisPriceMeta` 10분 캐시 + 4탭 대형주 캐시 dedup + 동시성 캡 + budget 1.2s + fail-soft 빈칸. prod 주간 실측(EGW00201) 후 필요 시 활성탭 한정/N 축소로 폴백.** → 구현 후 실측(주간+야간) 필요.
- **[OPEN QUESTION] q3. 모바일 컬럼 우선순위 — 어느 컬럼을 숨길지 + 배지 위치.** **PM 권고: 모바일은 시총·산업 숨김(md+ 부활), 유지=[♥][순위][종목+배지][현재가][등락률]. 배지는 종목명 옆(좁으면 max=1 로 최상위 심각도만).** 배지 정확한 배치(종목명 옆 vs 아래)·헤더 컬럼 라벨 시각은 **UX 디자이너 최종 결정**. 데이터 배선(배지·시총·산업·반응형 숨김)까지 만들고 최종 시각은 확정 후 같은 브랜치 커밋.
- **[OPEN QUESTION] q4. 경고 배지 vs 위험숨기기 토글 기본값.** **PM 권고: 배지 항상 on(인라인), 위험숨기기 토글 기본 off(전체 표시).** 배지가 이미 위험을 표면화하므로 기본 숨김은 리스트를 예고 없이 줄여 혼란. 사용자가 명시적으로 위험 제외를 opt-in. 위험군 범위(severity `critical`만 vs `critical`+`warn`) 는 §6-3 대로 `critical`+`warn` 권고 — 디자이너/사용자 확인.
- **[OPEN QUESTION] q5. 시가총액 표기 단위 — 조/억 vs `formatMoney` 콤마.** **PM 권고: 조/억 신규 포맷터(`formatMarketCap`, 예 "12.3조"/"8,450억")** — `formatNetBuy`(억원) 패턴 답습, 토스식 컴팩트 표기가 순위 셀 폭에 적합. `formatMoney`(콤마 원값)는 시총 자릿수가 너무 길어 셀 오버플로. 단일 위치(`lib/utils/formatMoney.ts` 확장 또는 신규). 소수 자릿수·"천억" 표기 세부는 디자이너 확인.
