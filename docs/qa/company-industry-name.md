# QA 리포트 — 기업개황 업종 큰 업종·상세 업종 병기 (`company-industry-name`)

- 대상 PR: #92 (`feature/company-industry-name`)
- 슬러그: `company-industry-name`
- PRD: 없음 (경량 반복 플로우 — AC 는 PR #92 본문에서 도출)
- 판정: **qa-passed** (실패 0건)
- QA 환경: macOS / Node v20.19.6 / Next ^16.2.6 / 로컬 dev `localhost:3000` (prod KIS 키 보유) / KIS_ENV=prod
- 변경 규모: 6 files, +109 / -3
- 검증 일시: 2026-06-02

> 참고: 본 PR 은 스타일링·DESIGN.md 토큰 변경이 없으므로 **DESIGN.md 라이브 동기화 검증은 N/A**. FastAPI(`127.0.0.1:8000`) 는 본 기능 경로(KIS·DART route handler)와 무관해 다운이어도 영향 없음.

---

## 1. 게이트 결과 (QA 독립 재실행)

| 게이트 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **0 에러** (exit 0) |
| 린트 | `npx eslint lib/api/kis/types.ts lib/api/kis/mappers.ts app/api/disclosure/company/route.ts components/profile/CompanyOverview.tsx` | **0 에러** (exit 0) |
| 단위 테스트 | `npx vitest run` | **193/193 passed** (30 files) — `mappers.test.ts` 12, `stock-info.mappers.test.ts` 14 포함 |
| 빌드 | `npm run build` | **✓ Compiled successfully in 2.2s** |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler/adapter 외 클라이언트 직접 호출 **0건** (`app/api/workbench/_adapters/fastapi.ts` 의 `FASTAPI_BASE_URL` fallback 만 매치 — 허용) |
| 한글 톤 무회귀 | 변경 컴포넌트 신규 하드코딩 한글 | **0건** (라벨은 `lib/copy/profile/stockDetail` 경유, `composeIndustry` 는 데이터 병기만) |
| 접근성 무회귀 | `dl/dt/dd` 시맨틱 + `aria-busy`/`role=alert`/`aria-label` 유지 | **유지** (변경 없음) |

---

## 2. AC 별 재현·기대·실측

### AC-1 — 병기 표시 (큰 업종 · 상세 업종)

| 항목 | 내용 |
|---|---|
| 재현 | `GET /api/stock/price?ticker=005930` 의 `sector` + `GET /api/disclosure/company?ticker=005930` 의 `industry` → `composeIndustry(sector, industry)` |
| 기대 | "전기·전자 · 통신 및 방송 장비 제조업" |
| 실측 | price.sector=`전기·전자` (X-Data-Source: kis) / company.industry=`통신 및 방송 장비 제조업` (X-Data-Source: dart) → 병기 = **"전기·전자 · 통신 및 방송 장비 제조업"** |
| 판정 | **통과** — PR 표와 일치 |

### AC-2 — graceful degrade (한쪽만 / 동일 중복제거 / 둘 다 없음)

`composeIndustry` 로직을 노드로 분기별 검증 (소스 추출 후 실행):

| 입력 (sector, industry) | 기대 | 실측 |
|---|---|---|
| `("전기·전자","통신 및 방송 장비 제조업")` | 병기 | `"전기·전자 · 통신 및 방송 장비 제조업"` |
| `("제약", undefined)` | 섹터만 | `"제약"` |
| `(undefined, "반도체 제조업")` | 상세만 | `"반도체 제조업"` |
| `("IT 서비스","IT 서비스")` | 중복제거 | `"IT 서비스"` |
| `(undefined, undefined)` | undefined → `"-"` | `undefined` (OverviewRow `value ?? "-"` 로 "-") |
| `("  ","반도체 제조업")` | 공백 섹터 무시 | `"반도체 제조업"` |

판정: **통과** — 모든 분기 정상. 단위 테스트(`mapStockPrice` sector 누락/공백→undefined, `mapStockInfo` industryName 공백→undefined)도 동일 보장.

### AC-3 — 추가 KIS 콜 0 (price 쿼리 캐시 공유)

| 점검 | 근거 |
|---|---|
| 동일 query key | `StockHeader`·`CompanyOverviewContent` 모두 `useQueryStockPrice(ticker)` → `queryKeys.stock.price(ticker) = ["stock","price",ticker]` 단일 키. React Query 가 동일 키 dedupe. |
| route 가 inquire-price 재호출 안 함 | `app/api/disclosure/company/route.ts` 는 `inquire-price` 미호출. 상세 업종은 `fetchStockInfo`(search-stock-info) — **다른** KIS 엔드포인트로, 섹터용 중복 inquire-price 아님. |
| 데스크탑 | `StockPageLayout` 모든 데스크탑 분기에서 `StockHeader`(price 패칭) → `CompanyOverview`(즉시 마운트) 순. 같은 키라 캐시 히트. |
| 모바일(lazy) | `StockHeader` 는 collapsible **밖** 항상 렌더(L62) → price 캐시 선점. `CompanyOverview collapsible`(L65) 펼침 시 `CompanyOverviewContent` 마운트 → 같은 키 staleTime 내 캐시 히트, 신규 fetch 0. |

판정: **통과** — 섹터 표시로 인한 추가 KIS inquire-price 콜 0 확인. (상세 업종 search-stock-info 1콜은 본 PR 이전부터의 best-effort override 유지 — 신규 회귀 아님.)

### AC-4 — 비-prod/실패 폴백

| 항목 | 내용 |
|---|---|
| 코드 | `safeIndustryName`: `if (!isKisConfigured() || resolveKisEnv() !== "prod") return undefined;` + `try { withTimeout(fetchStockInfo, 3_000) } catch { return undefined }` |
| 동작 | sector(클라 캐시) = undefined, 상세 override 미적용 → route 는 DART `induty_code`(또는 코드) 유지. 본 응답 비차단. |
| 화면 | `composeIndustry(undefined, DART코드)` → 상세(또는 코드)만 표시. 둘 다 없으면 `OverviewRow` 가 "-". 깨짐 없음. |
| 판정 | **통과** — 폴백 경로가 응답을 막지 않고 graceful degrade |

### AC-5 — 회귀: 종목명(name)에 업종명(sector) 미혼입 (기존 AC-10)

| 점검 | 근거 |
|---|---|
| name 소스 | `extractStockName(output)` = `hts_kor_isnm` → `prdt_name` → ticker. `bstp_kor_isnm` 미참여. |
| sector 소스 | `bstp_kor_isnm?.trim() \|\| undefined` — **별도 필드**. |
| 단위 테스트 | `bstp_kor_isnm → sector (업종, 종목명과 분리)`: `name==="셀트리온"` AND `sector==="제약"` 명시 단언. |
| 라이브 | 5종목 모두 sector 가 name 과 분리된 필드로 반환(섞임 없음). |

판정: **통과** — name/sector 완전 분리, 회귀 없음.

---

## 3. 라운드트립 (라이브, prod KIS 키 — 5종목)

> EGW00201 rate-limit 회피 위해 연속 curl 사이 4~7초 간격. price/company 각각 X-Data-Source 헤더 확인.

| 티커 | price.sector (KIS) | company.industry (DART) | 병기 결과 = PR 표 기대 |
|---|---|---|---|
| 005930 삼성전자(주) | `전기·전자` | `통신 및 방송 장비 제조업` | 전기·전자 · 통신 및 방송 장비 제조업 ✓ |
| 000660 에스케이하이닉스(주) | `전기·전자` | `반도체 제조업` | 전기·전자 · 반도체 제조업 ✓ |
| 035720 (주)카카오 | `IT 서비스` | `자료처리, 호스팅, 포털 및 기타 인터넷 정보매개서비스업` | IT 서비스 · 자료처리, 호스팅, 포털… ✓ |
| 005380 현대자동차(주) | `운송장비·부품` | `자동차용 엔진 및 자동차 제조업` | 운송장비·부품 · 자동차용 엔진 및 자동차 제조업 ✓ |
| 068270 주식회사 셀트리온 | `제약` | `기초 의약물질 및 생물학적 제제 제조업` | 제약 · 기초 의약물질 및 생물학적 제제 제조업 ✓ |

5종목 모두 PR 본문 표와 정확히 일치. `X-Data-Source`: price=`kis`, company=`dart` 확인.

---

## 4. 에지 케이스

| 케이스 | 절차 | 결과 |
|---|---|---|
| 카카오 섹터 누락 재시도 | 직전 세션 None 관측(10연속 throttle) → 간격 두고 재호출 | `sector='IT 서비스'` 정상 반환 — **throttle 이지 버그 아님** 확인 |
| 비-prod / KIS 미설정 폴백 | `safeIndustryName` 가드 코드 논증 + DART 응답 비차단 경로 | undefined 반환 → DART industry 유지, 화면 비파손 (AC-4 통과) |
| 빈/공백 sector·industry | `mapStockPrice`(`bstp_kor_isnm` 공백→undefined), `mapStockInfo`(`std_idst_clsf_cd_name` 공백→undefined), `composeIndustry`(trim+filter) | 단위 테스트 + 노드 검증 모두 undefined→"-" 정상 |
| 동일 문자열 중복 | `composeIndustry` `new Set` 중복 제거 | "IT 서비스"+"IT 서비스" → "IT 서비스" 1개만 |
| 모바일 CollapsibleCard 펼침 시 중복 fetch | StockHeader 가 price 캐시 선점 → 펼침 시 동일 key 캐시 히트 | 신규 inquire-price 0 (AC-3) |
| FastAPI 다운 | 본 경로(KIS·DART)와 무관 | 영향 없음 |

---

## 5. 판정

- AC 1~5 전부 통과, 게이트(tsc/eslint/vitest/build/BFF/한글/접근성) 전부 그린, 라운드트립 5종목 PR 표 일치, 에지 케이스 정상.
- DESIGN.md 토큰 변경 없음 → 라이브 동기화 검증 N/A.
- PR 본문 `## 다음 작업` 섹션 존재 확인 (handoff-append 게이트 충족).
- **실패 0건 → qa-passed**.
