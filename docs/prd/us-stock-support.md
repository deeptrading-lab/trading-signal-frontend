# PRD — us-stock-support (미국 주식 검색 + 시세·차트 조회, P0+P1)

> 상태: 초안(PM). 스코프 = **P0 US 종목 검색** + **P1 US 시세·차트·호가 표시**.
> 펀더멘털/AI 동급화(P2)는 백엔드(FastAPI·별도 레포) 의존이라 본 PRD **비범위**.
> 조회·분석 전용 원칙 준수([read-only-analysis-scope]) — 주문 API 없음.

## 1. 배경 / 문제

현재 앱은 한국 시장(KOSPI/KOSDAQ) 전용이다. 사용자가 미장(미국 주식)도 검색·조회하고 싶어 한다.

- **검색**은 정적 번들 `lib/api/kis/symbols.json`(KRX KIND + OpenDART 소스, 2,600종목 전부 KR)에 대한 클라이언트 매칭이라 US 티커(AAPL 등)가 **0건**이다.
- 검색을 붙여도 **US 티커로 상세를 열면 데이터 API가 6자리 티커를 강제해 깨진다**(snapshot 400, disclosure 404). 즉 "검색만"은 클릭 시 붕괴 → 최소 유용 단위 = **검색 + 시세/차트 표시**.
- 반면 조사 결과 **의외로 준비된 것이 많다**: (a) AI 분석 파이프라인은 이미 US 인지(검증 문구가 `"AAPL 또는 BTC-USD"`), (b) Toss 어댑터가 의도적으로 절반 US 대응(NASDAQ/NYSE 인지·알파벳 티커 허용), (c) 라우팅 `/stock/[ticker]`는 포맷 무관.

## 2. 근본 원인 / 현 상태 (코드 실측)

**검색을 막는 것 — 딱 2개**
- `lib/api/kis/symbols.json` — US 엔트리 0개(KR 소스).
- `market` 타입 하드코딩 `"KOSPI" | "KOSDAQ"` — `lib/api/kis/search.ts:24`(`SymbolEntry.market`), `:88`(`getMarketByTicker`), `lib/types/stock/snapshot.ts:24`(`SnapshotMarket`). (참고: `StockMarket`(`lib/api/kis/types.ts:265`)은 이미 `"기타"` 버킷 보유 → Toss가 US를 여기 매핑.)
- 검색 UI 컴포넌트는 대부분 포맷 무관. 예외 = `components/watchlist/WatchlistSearch.tsx:68` raw-add `^\d{6}$`.

**표시를 막는 것 — 6자리 게이트 + KR 재결합**
- 하드 400: `app/api/stock/snapshot/route.ts:53`, `app/api/stock/description/route.ts:21` (`TICKER_RE = /^\d{6}$/`).
- 404: `app/api/disclosure/company|list` — `getCorpCode`(KR seed) 미스 → US 전부.
- KIS 국내 고정: `lib/api/kis/price.ts`, chart route(`FHKST03010100`), 수급(`investor-flow`), 지수. `lib/api/kis/tossEnrich.ts:64`는 US 티커에 명시적 no-op.
- **Toss 경로는 절반 US 대응**: `lib/api/marketdata/source.ts`(`MARKET_DATA_SOURCE=kis|toss` 토글), `lib/api/toss/stockMaster.ts`(US 인지), orderbook/trades/warnings 검증기 `^[A-Za-z0-9.\-]{1,20}$`(US 허용). **단** `lib/api/toss/minute.ts:48`·`lib/api/toss/kst.ts`가 한국장(15:31 동시호가·KST) 하드코딩 → US 장시간 미모델.

**이미 US 준비된 것**
- AI 분석: `lib/validation/workbench/analyze.ts:44`(문구 `"AAPL 또는 BTC-USD"`), whitelist=FastAPI(시장 무관). US AI 가능 여부는 **엔진의 US 데이터 조달**에 달림(레포 밖).
- 라우팅: `app/(main)/stock/[ticker]/page.tsx` 포맷 무관(URL은 뜸, fetch만 깨짐).

## 3. 범위 (In scope) — P0 + P1

### P0 — US 종목 검색 (작음)
1. **US 심볼 인덱스 확보**: 무료·무키 소스로 US 상장 종목(심볼·회사명·거래소·ETF플래그) 인덱스 생성.
   - 1차 소스 후보: **NASDAQ Trader 심볼 디렉토리**(`nasdaqlisted.txt`+`otherlisted.txt`) 또는 **SEC EDGAR `company_tickers.json`**. (KR의 KRX KIND에 대응 — §9 Q1에서 소스 확정.)
   - 생성 스크립트 = `scripts/update-symbols.py` 패턴 재사용(별도 `update-us-symbols` 또는 통합).
   - 저장 형태 = 기존 `symbols.json` 확장(엔트리에 `market: "NASDAQ"|"NYSE"|"AMEX"` 추가) **또는** 별도 `us-symbols.json`(§9 Q2).
2. **`market` 타입 확장**: `SymbolEntry.market`·`getMarketByTicker`·`StockSearchResult.market`에 US 거래소 값 허용(유니온 확장 또는 `string`화).
3. **검색 배지/표시**: 결과에 시장(코스피/코스닥/NASDAQ 등) 구분 표기. `WatchlistSearch.tsx:68` raw-add 정규식을 US 티커도 허용하게 조정(또는 KR raw-add는 유지하고 US는 인덱스 경유만).
4. **주간 자동화 연동**: 이미 만든 `symbols-refresh.yml`에 US 소스 재수집 편입(또는 별도 잡).

### P1 — US 시세·차트·호가 표시 (중간)
5. **US 라우팅 판정**: 티커 포맷(알파벳 vs 6자리)으로 KR/US를 라우팅해 데이터 소스 선택(또는 인덱스의 market 필드 활용).
6. **시세/일봉/호가**: Toss 경로로 US 시세(`prices`)·일봉(`candles`)·호가(`orderbook`) 표시. `MARKET_DATA_SOURCE` 결정(§9 Q3).
7. **6자리 게이트 US 분기**: snapshot/description 라우트가 US 티커에 400 대신 US 응답(또는 우아한 degrade — "US는 시세만 제공" 표시).
8. **US 장시간 모델**: 분봉·장중 판정에서 US 세션(현지/서머타임) 처리 최소 구현, 또는 P1에선 일봉만 지원하고 분봉/장중은 KR 한정 유지(§9 Q4).
9. **US 기본정보**: Toss `stocks`(한글명·거래소·상장주식수·통화 USD)로 종목 헤더·시총(=상장주식수×현재가) 표시.

## 4. 비범위 (Out of scope)

- **P2 — US 펀더멘털·AI 동급화**: 재무·밸류(PER/PBR)·섹터·수급·공시(SEC EDGAR). DART=KR전용이라 별도 소스+백엔드 FastAPI의 US 데이터 조달 필요 → **별도 트랙/PRD**.
- **US AI 분석 실동작**: 프론트 계약은 이미 US 대응이나 엔진(별도 레포)의 US 분석 산출 여부는 본 PRD가 보증하지 않음(백엔드 확인 선행).
- 주문/체결(read-only-analysis-scope 준수).
- 미국 지수/수급(외국인·기관) — KIS KR 고정, US 미지원 유지.

## 5. 사용자 시나리오

1. 사용자가 검색창에 "Apple" 또는 "AAPL" 입력 → **US 종목이 결과에 뜨고**(거래소 배지) 선택 가능.
2. 선택 → `/stock/AAPL` → **현재가·등락·일봉 차트·호가·기본정보(시총 포함)가 표시**된다(펀더멘털/공시 섹션은 "US 미지원" degrade 또는 숨김).
3. 관심종목에 US 종목 추가 가능, 목록에서 시세 갱신.
4. (P2 이후) AI 분석 버튼 → 기술적 분석 위주 결과.

## 6. 요구사항 (기능 스펙 요약)

- **R1** 검색은 KR+US 통합 인덱스에서 이름/심볼 매칭. US 심볼은 알파벳 exact + 이름 fuzzy.
- **R2** 검색 결과·관심종목·헤더에 시장 구분 배지(코스피/코스닥/NASDAQ/NYSE 등).
- **R3** US 종목 상세: 현재가·등락률·일봉 차트·호가·기본정보·시총. KR 전용 섹션(공시/재무/수급)은 US에서 숨김 또는 "미지원" 안내.
- **R4** US 데이터 소스 실패 시 한글 폴백·명시적 상태(빈 화면 금지).
- **R5** KR 종목은 **완전 무회귀**(기존 동작 그대로) — US 분기가 KR 경로에 영향 0.
- **R6** US 인덱스도 주간 자동 갱신(신규 상장 반영).

## 7. 수용 기준 (AC)

- **AC1** `searchSymbols("AAPL")`·`("Apple")` 각각 US 결과 반환, 거래소 배지 표기. KR 검색 무회귀.
- **AC2** `/stock/AAPL` 진입 시 현재가·일봉·호가·기본정보 표시(400/404/빈화면 없음). KR 전용 섹션은 degrade.
- **AC3** 관심종목에 US 종목 추가·시세 갱신 정상.
- **AC4** KR 종목 전 경로(검색·상세·차트·수급·공시·랭킹) 회귀 0 — 자동/수동 검증.
- **AC5** US 데이터 소스 장애 시 한글 폴백·상태 표시.
- **AC6** 타입체크·린트·빌드 무회귀. `market` 타입 확장이 기존 소비처(배지·스냅샷) 전부 정합.
- **AC7** 반응형 2뷰포트에서 US 상세 정상.

## 8. 영향 분석

**변경 필요(코어)**
- 타입: `lib/api/kis/search.ts`(24·88), `lib/api/kis/types.ts`(216·265), `lib/types/stock/snapshot.ts:24` — `market` 유니온 확장.
- 데이터: `lib/api/kis/symbols.json`(또는 신규 `us-symbols.json`) + 생성 스크립트(`scripts/update-symbols.py` 확장/신규) + `.github/workflows/symbols-refresh.yml` 편입.
- 검색 로직: `lib/api/kis/search.ts`(6자리 가정은 폴백이라 무해하나 US exact 매칭 확인), `components/watchlist/WatchlistSearch.tsx:68`.
- 라우트 게이트: `app/api/stock/snapshot/route.ts`, `description/route.ts` — US 분기 또는 degrade.
- 데이터 소스: `lib/api/marketdata/source.ts`, `lib/api/toss/*`(minute·kst의 US 세션), `MARKET_DATA_SOURCE`/prod TOSS env 결정.

**영향 없음(무회귀 확인 대상)**
- AI 분석 파이프라인(이미 US 대응), 라우팅(포맷 무관), 지수/수급/랭킹(KR 고정 유지).

**인프라/운영**
- **prod에서 Toss 활성화 여부**가 P1의 최대 결정 변수(현재 TOSS env 미설정=휴면). Toss는 KR 데이터 소스에도 영향([toss-api-evaluation]) → 신중.
- US 심볼 소스 접근(NASDAQ Trader/SEC)은 무키·무료지만 CI IP 차단 가능성 사전 확인.

## 9. OPEN QUESTION (PM 권고 동봉)

- **Q1. US 심볼 소스** — NASDAQ Trader 디렉토리 vs SEC EDGAR company_tickers.json.
  - **PM 권고: NASDAQ Trader**(심볼+회사명+거래소+ETF플래그로 KR KIND와 가장 유사, 배지·필터 바로 가능). SEC는 거래소 필드가 없어 보강 필요.
- **Q2. 저장 형태** — 기존 `symbols.json` 확장 vs 별도 `us-symbols.json`.
  - **PM 권고: 별도 `us-symbols.json` + 검색이 둘을 병합**. KR 인덱스(2600)와 갱신 캐이던스·소스가 달라 파일 분리가 회귀 위험 최소. `getSymbolName` 등은 두 인덱스 순차 조회.
- **Q3. P1 데이터 소스/Toss 활성화** — prod에서 Toss 켤 것인가, US만 Toss로 라우팅할 것인가.
  - **PM 권고: 티커 포맷 기반 라우팅**(US=Toss, KR=기존 KIS 유지) — prod 전역 `MARKET_DATA_SOURCE=toss` 전환은 KR 영향이 커서 지양. US 티커일 때만 Toss 경로 선택.
- **Q4. US 분봉·장중** — P1에 US 분봉/장중 판정까지 넣을지, 일봉만 먼저.
  - **PM 권고: P1은 일봉·시세·호가·기본정보까지, 분봉/장중은 P1.5로 분리**(minute.ts·kst.ts의 US 세션 모델링은 별개 작업량).
- **Q5. 백엔드 US 분석** — US AI 분석을 이번 범위에서 기대할지.
  - **PM 권고: 비범위 확정**. 프론트는 준비됐으나 엔진 US 데이터 조달은 별도 레포·별도 트랙. P1 릴리스엔 "US는 조회 중심, AI 분석은 추후" 명시.
- **Q6. degrade UX** — US에서 공시/재무/수급 섹션을 숨길지 "미지원" 안내할지.
  - **PM 권고: 숨김 + 헤더에 "미국 주식 · 조회 전용" 뱃지**(빈 섹션보다 깔끔, 기대 관리).

---

### 다음 단계
본 PRD 승인 시 — UX(검색 배지·US 상세 degrade 레이아웃) → Frontend Dev(P0 먼저 머지 가능한 단위로, 이어 P1) → QA(2뷰포트·KR 무회귀·US 데이터 장애) 순. P0(검색)와 P1(표시)은 **분리 PR** 권장(P0만으로도 인덱스·타입 확장은 독립 가치, 단 상세 degrade가 없으면 클릭 붕괴이므로 최소 R3 degrade는 P0에 포함).
