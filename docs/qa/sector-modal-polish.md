# QA 리포트 — 구성종목 모달 폴리시 (`sector-modal-polish`)

- 대상 PR: #277 (브랜치 `feature/sector-modal-polish`, 대상 커밋 `2427bbc`)
- 성격: UX 폴리시 + perf (PRD 없음, 사용자 지적 픽스 4건)
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-modal` (실 node_modules 설치, `npm run dev`/`build` 가능)
- 판정: **qa-passed** (실패 0건)

변경 파일(모달 스코프): `app/api/market/sparklines/route.ts`(신규), `lib/api/kis/sectorSparklines.ts`(신규), `components/ui/Sparkline.tsx`(신규), `hooks/market/useQuerySectorSparklines.ts`(신규), `lib/api/market/sectors.ts`, `components/market/SectorConstituentsModal.tsx`, `lib/types/market/sectors.ts`, `lib/mock/market/sectors.ts`, `hooks/query/queryKeys.ts`.

---

## 1. AC 별 재현·기대·실측

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| **AC1** 배치 스파크라인 | 모달이 소비하는 훅·라우트 경로 추적 + 배치 엔드포인트 라운드트립 (`GET /api/market/sparklines?tickers=005930,000660,035420`) | 개별 `/api/stock/chart` 30콜 아님. `useQuerySectorSparklines(tickers[])` 가 전 티커를 join 해 `getSparklines` → `GET /market/sparklines?tickers=...` **단일 요청**. 응답에 전 티커 시리즈 일괄 포함 | 모달은 `useQuerySectorSparklines(constituents.map(c=>c.ticker))` **한 훅** 소비(라인 116). 라운트트립: 3티커 → 1요청, 응답 `005930/000660/035420` 각 30점 일괄. 구 `MiniStockChart` 개별 콜 import/사용 제거(파일 상단 JSDoc 문구만 잔존=무기능). queryKey 정렬·join 안정키 → 순서무관 동일 캐시 | ✅ PASS |
| **AC2** 스파크라인 렌더 | dev mock(`getMockSparklines`) 렌더 + Sparkline 좌표/색 로직 replay + 2점 미만 가드 | SVG polyline, 상승=`text-signal-up`(빨강)/하락=`text-signal-down`(파랑) currentColor. 2점 미만/미확보 = 빈 공간(크래시 0) | mock 30점 결정론 파형(Math.random 없음). Sparkline 좌표 replay: 30점 전부 finite, viewBox(64×24) 내 스케일(x 2.0→62.0, y 클램프). `last>=first` → `text-signal-up` 확정. `if(!data||data.length<2) return null` → 미확보 행 빈 공간(null, throw 없음) | ✅ PASS |
| **AC3** 우하단 모서리 | 모달 컨테이너 클래스 검사 | `overflow-hidden` 으로 스크롤 본문이 둥근 모서리 안쪽 클립(우하단 직각 해소) | 컨테이너 라인 150 `... flex-col overflow-hidden bg-surface ...` + `rounded-xl`(데스크탑)/`rounded-t-xl`(모바일). 스크롤 본문은 내부 `overflow-y-auto` div 로 분리 → 바깥 라운드 유지 | ✅ PASS |
| **AC4** 폰트 통일 | 행 컴포넌트 타이포·구분선 검사 | 종목명·현재가·등락률 `text-body-sm-strong`, 헤어라인 행 — 실시간 순위표 밀도 정합 | `ConstituentRow`: 종목명(라인 301)·현재가(312)·등락률(317) 모두 `text-body-sm-strong`. 행 `border-b border-border-line last:border-b-0`(296) 헤어라인. `signal-up-text`/`signal-down-text` 색 합성클래스(app/components.css 정의 확인) | ✅ PASS |
| **AC5** 시가총액 탭 | mock 구성종목 marketCap 유무 + 탭 게이트 로직 | marketCap 있으면 탭 노출·클릭 시 시총 desc 정렬. 전부 null 이면 탭 숨김(죽은 탭 없음) | `GET /api/market/sectors/0013/constituents` mock: marketCap 전부 non-null(예 005930=446조). `hasMarketCap = some(c.marketCap != null)` → true → 세그먼트 렌더(라인 186). 정렬 순수함수 `sortConstituents(marketCap)` = null 후순위 desc. 전부 null 이면 `hasMarketCap=false` → 세그먼트 미렌더 | ✅ PASS |
| **AC6** 무회귀 | 모달 닫기·상세 이동·가용성 경로 검사 | Escape·backdrop 닫기, 구성종목 클릭→상세, 가용성/breadth 무변경. 배치 never-throw | Escape(라인 92-94)·backdrop onClick(145)·body scroll lock 유지. `goDetail`→`router.push(stockDetailPath)`. `resolveAvailability`·`MaintenanceNotice`·구성종목 쿼리 무변경. 배치 라우트 이중게이트+`withTimeout`+never-throw(빈 맵 fallback) — 엣지 절 참조 | ✅ PASS |
| **AC7** 게이트 | worktree `tsc --noEmit`·`npm run lint`·`npm run build` + 신규 Tailwind 스캔 | 0 에러, 신규 커스텀 토큰 0 | tsc `TSC_EXIT=0`. lint 0(출력 없음). build `✓ Compiled successfully in 4.1s`, `/api/market/sparklines` 동적 라우트 등록. 신규 클래스 0(전부 기존 토큰: text-signal-up/down·text-body-sm-strong·bg-accent-soft 등). 신규/변경 소스 hex·px 리터럴 0(`env(safe-area)` 외) | ✅ PASS |

---

## 2. 게이트 명령·출력 (자동화)

```
$ npx tsc --noEmit            → TSC_EXIT=0
$ npm run lint (eslint .)     → 출력 없음, 종료 0
$ npm run build               → ✓ Compiled successfully in 4.1s
                                ├ ƒ /api/market/sparklines   (신규 동적 라우트 등록)
```

- build 경고 1건 = `next.config.ts` NFT 트레이스(프로젝트 전체 트레이스) — **본 PR 무관 사전 존재**, 회귀 아님.

### BFF 원칙 무회귀
```
$ grep -nE "fetch\(" (변경 클라 파일)  → SectorConstituentsModal:214 query.refetch() (react-query, fetch 아님) 만
$ grep -nE "http://127\.0\.0\.1" -- app/  → whitelist·workbench route handler fallback(사전 존재, 면제)만
$ 신규 sparklines route              → FASTAPI/127.0.0.1/fetch( 직접 0건. loadSparklines→fetchStockDaily(KIS 서버 클라)
```
- 신규 라우트는 브라우저→route handler→KIS 단방향(BFF 준수). 클라 `fetch(` 직접호출 0건.

### 한글 톤 무회귀
- 모달 사용자 노출 문구는 전부 `lib/copy/market/sectors` 경유. 신규 하드코딩 노출 영문 0건(매치는 코드 식별자·import 뿐). Sparkline `aria-hidden`.

---

## 3. 에지 케이스 (배치 라우트, dev mock 경로 `x-kis-env: vts`)

| 케이스 | 요청 | 실측 | 판정 |
|---|---|---|---|
| 티커 없음 | `GET /api/market/sparklines` | `{"sparklines":{}}` HTTP 200 | ✅ |
| 빈 파라미터 | `?tickers=` | `{"sparklines":{}}` HTTP 200 | ✅ |
| malformed/인젝션 | `?tickers=..%2F,<script>,005930` | 잡음 정규식 차단, `keys: ["005930"]` 만 | ✅ |
| 상한 초과 | 50티커(캡 40) | `returned key count: 40` | ✅ |
| 중복 티커 | `?tickers=005930,005930,005930` | dedup → `keys: ["005930"]` | ✅ |
| 헤더 위생 | 다중 티커 | `cache-control: no-store`, `x-kis-env: vts` | ✅ |
| 2점 미만/미확보 행 | Sparkline `data` undefined·1점 | `return null`(빈 공간, throw 0) — 코드 검증 | ✅ |
| BE(KIS) 실패 | try/catch never-throw | `withTimeout` 초과·오류 → `{sparklines:{}}` 빈 맵, 모달은 스파크라인 없이 정상 렌더 — 코드 검증 | ✅ |

- 라이브 KIS 라운드트립(prod 게이트 실호출)은 `.env.local` 무설정으로 mock 경로만 재현. prod 경로는 이중게이트(`isKisConfigured() && resolveKisEnv()==="prod"`)로 분기, 동시성 캡 8·never-throw 로 fail-soft.

---

## 4. 데이터 라운드트립 (dev 서버, mock)

- dev 서버 `PORT=3111 npm run dev` → `✓ Ready`.
- `GET /api/market/sparklines?tickers=005930,000660,035420` → 3티커 각 30점 일괄(005930 first=1603/last=1645 등).
- `GET /api/market/sectors/0013/constituents` → 5종목, marketCap 전부 non-null → 시총 탭 노출 조건 충족.
- 모달 위임 확인: `components/home/TrendingSectorsSection.tsx:91` 에서 `<SectorConstituentsModal>` 렌더(업종 행 클릭 진입).

---

## 5. 관찰(비차단)

- `SectorConstituentsModal.tsx` 파일 상단 JSDoc(라인 10)에 구 `미니차트(MiniStockChart)` 문구 잔존 — 실제 import/사용은 제거됨(무기능 문서 staleness). 후속 문서 정리 여지, 기능 영향 없음.

---

## 판정: **qa-passed** — 실패 0건. 게이트(tsc/lint/build) 통과, AC1~7 충족, 에지 8건·BFF·한글톤 무회귀.
