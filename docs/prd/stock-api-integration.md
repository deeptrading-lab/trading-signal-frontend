# PRD: stock-api-integration

- **slug**: `stock-api-integration`
- **작성일**: 2026-05-28
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: `finsight-redesign` 시리즈 (PR #26 ~ #37) 머지 완료. main 은 5개 도메인 (Dashboard / Market / Watchlist / Profile / Signals) + AnalysisDashboard 가 **mock 데이터 (`lib/mock/<domain>/`) 로 렌더** 중. 본 PRD 는 mock → 실데이터 1차 전환을 다룬다. **조회 (read-only) only**, 주문 (write) 은 본 PRD 범위 밖.
- **UI 포함 여부**: **no** — 본 PRD 는 BFF (`app/api/stock/`, `app/api/disclosure/`) + 클라이언트 모듈 (`lib/api/kis/`, `lib/api/dart/`) + TanStack Query 훅 + mock→실데이터 어댑터까지. 화면 컴포넌트 자체의 시각 톤·레이아웃 변경 0. **UX/UI 디자이너 합류 불필요** (단, §3.6 의 로딩·에러·빈 상태 카피만 frontend-dev 가 기존 톤 안에서 작성).
- **선행 / 후행 관계**:
  - **선행 (모두 머지 완료)**:
    - `finsight-redesign` PR #26 ~ #37 — 5개 도메인 라우트 + DESIGN.md v8 + Tailwind v4 + Pretendard 정착. mock 데이터 폴더 (`lib/mock/<domain>/`) 표준 신설.
    - `claude-cli-analysis` PR #23 — `AnalyzeAdapter` 인터페이스 + Claude CLI subprocess 라운드트립. 본 PRD 의 BFF subprocess 패턴 (FDR 검토 시) 의 참고 사례.
  - **사용자 사전 작업 (이미 완료, 2026-05-28)**:
    - KIS Developers 모의투자 계좌 발급 (50190357) + App Key 36자 + App Secret 180자.
    - OpenDART API 키 발급 (40자).
    - 6개 환경변수 `.env.local` 저장 (KIS_APP_KEY, KIS_APP_SECRET, KIS_ACCOUNT_NO=50190357, KIS_ACCOUNT_PRODUCT_CD=01, KIS_ENV=vts, OPENDART_API_KEY).
    - `.gitignore` 보호 확인 (실키 저장소 미유출).
    - end-to-end 검증 통과 — 토큰 발급 + KIS `inquire-price` + OpenDART `list.json` 정상 응답.
  - **후행 (사용자 결정)**:
    - PRD `stock-order-integration` (가칭) — 주문 / 매매 (KIS `order-cash`, `order-credit`). **실전계좌 (72245021) 보유 상태라 안전장치 다중 게이트 필수** — §9 OPEN QUESTION q4 참고.
    - PRD `signal-algorithm` (가칭) — Signals 도메인 추후 트레이딩 시그널 알고리즘. 본 PRD 머지 후 KIS 시세 + OpenDART 공시 데이터를 입력으로 시그널 계산.
    - PRD `realtime-quote-websocket` (가칭) — KIS WebSocket 실시간 시세 (30+ 채널). 본 PRD 는 REST 폴링·캐싱 base.

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> "finsight-redesign 시리즈 끝났으니 이제 실제 한국 주식 데이터로 mock 교체. 키 발급은 끝났고 .env.local 에 다 있다. 1차는 조회만 — 주문은 실전계좌도 갖고 있어서 절대 이번 PR 에 들어오면 안 됨. KIS 시세 + OpenDART 공시 끝. FDR 은 Python 이라 어떻게 붙일지는 PM 이 결정 권고 달라."

### 1.2 현재 상태 (main, finsight-redesign 시리즈 머지 직후)

- `lib/mock/<domain>/` 표준 — 5개 도메인 모두 mock 데이터로 렌더.
  - `lib/mock/dashboard/` — 보유 종목 + 포트폴리오 hero
  - `lib/mock/market/` — 시장 지수 + 거래량 상위
  - `lib/mock/watchlist/` — 관심종목 테이블
  - `lib/mock/profile/` — 종목 상세 (현재가 + 기업개황 + 공시)
  - `lib/mock/signals/` — 추후 시그널 (현재는 placeholder)
- `app/api/workbench/analyze/route.ts` — Claude CLI subprocess 어댑터 (실 BE 호출). 본 PRD 무영향.
- `lib/api/client.ts` — axios 단일 인스턴스, baseURL `/api` same-origin, ApiError 인터셉터, 한글 fallback 메시지.
- `lib/query/queryKeys.ts` — TanStack Query v5 key 표준. 도메인별 prefix.
- `hooks/<domain>/` — 도메인 한 뎁스 룰. 각 도메인의 `useQuery*` / `useMutation*` 커스텀훅이 의무.
- BFF 패턴 (`docs/rules/frontend.md` §1·§3 정합): 브라우저 → `app/api/**/route.ts` → 외부 BE 프록시. 직접 호출 0건.

### 1.3 문제

- **mock 데이터의 정체성 한계** — finsight-redesign 시점에 5개 도메인 모두 그럴듯한 가짜 데이터로 렌더되지만, 사용자 (개인 투자자) 입장에서는 자기 보유 종목·관심종목·시장 지수 어느 것도 실제값이 아니라 효용 0. 첫 인상 만족 후 재진입 동기 없음.
- **KIS API 응답 스키마의 함정** — 사전 검증 (2026-05-28) 에서 발견: `inquire-price` 응답의 `bstp_kor_isnm` 필드가 **업종명** ("전기·전자") 이고 종목명은 별도 필드 (`hts_kor_isnm` 또는 `prdt_name`). 직관적이지 않은 네이밍이라 응답 매퍼에서 실수 가능성 높음 — PRD 에 명시적으로 박아둬야 회귀 차단.
- **토큰 수명 & rate limit** — KIS access_token 만료 24h. 1초당 발급 제한 (정확한 수치는 공식 문서에 안 적힌 채 "초당 호출 제한" 만 안내). Vercel serverless 환경에서 인스턴스 메모리 캐싱은 매 cold start 마다 새 토큰 발급 위험. 캐싱 위치 결정 필요.
- **OpenDART 일일 호출 제한** — 20,000 건/day. 도메인별 (특히 Profile 종목 상세 진입마다 공시 5건 조회) 캐싱 전략 없으면 빠르게 소진.
- **FDR (Python) 의존성 문제** — KRX 공식 종목 리스트나 장기 시계열은 FDR 이 가장 간단하나, Next.js 런타임은 Node. Python subprocess vs 별도 FastAPI 마이크로서비스 vs 1차 제외 — 결정 비용이 PRD 분할 vs 단일에 직결.
- **실전계좌 안전장치 부재** — 사용자가 실전계좌 (72245021) 도 보유. 환경변수 `KIS_ENV` 가 `vts` (모의) / `prod` (실전) 토글이라, 향후 주문 라우트가 추가될 때 실전 환경에서 실수 주문 위험. 본 PRD 가 조회 only 임에도 미래 안전망을 미리 박을지 결정 필요.

### 1.4 컨텍스트 메모

- 본 PRD 는 **5개 도메인 한 번에 교체** 가 아니라 **공통 인프라 (KIS 클라이언트 + DART 클라이언트 + BFF 라우트 + 캐싱) + Profile 도메인 1개 종단 검증** 까지를 핵심 범위로 잡는다. 나머지 4개 도메인 (Dashboard / Market / Watchlist / Signals) 의 실제 연결은 §3.5 에서 "어댑터만 신설, 화면은 mock fallback 유지" 로 떼어내고 후속 PR 들로 자연 분할. **이유는 §8 영향 분석 참고**.
- mock 데이터는 **삭제하지 않는다** — (1) 개발/오프라인 모드 시 fallback, (2) KIS rate limit 도달 시 fallback, (3) 환경변수 미설정 시 빌드 통과를 위한 fallback. `lib/mock/<domain>/` 폴더 그대로 유지하되, 어댑터 레이어 (`lib/api/<domain>/`) 가 실데이터를 우선 시도하고 실패 시 mock 으로 graceful degrade.
- working tree 미커밋 2건 (`docs/SESSION_NOTES.md` M + `docs/references/korean-stock-api-comparison.md` U) 은 직전 세션 (2026-05-24 리서치 전용) 의 산출물. **별도 PR 금지 정책 (단독 SESSION_NOTES PR 금지)** 에 따라 본 PR 의 **첫 commit** (`docs(session+ref): 2026-05-24 주식 API 조사 세션 동봉`) 으로 묶어 들어가야 한다 — §8.5 에 명시.
- `docs/rules/frontend.md` 8개 절 준수 — 특히 §3 (도메인 한 뎁스) + §7 (queryKeys 표준) + §1 (커스텀훅 의무화). KIS / DART 직접 호출 없이 모두 hooks/<domain>/useQuery*.ts 를 통해야 함.
- BFF 가 항상 mock fallback 을 제공하면 빌드 타임 / Preview 환경 / 키 미설정 환경 모두 회귀 0.

## 2. 목표

- **조회 (read-only) 인프라 정착** — `lib/api/kis/` (시세) + `lib/api/dart/` (공시) 클라이언트 + 토큰 캐시 + 자동 갱신 + ApiError 한글 fallback. 본 저장소 어디서도 KIS / DART 를 직접 fetch 하지 않는다 (`docs/rules/frontend.md` §1·§3 준수).
- **BFF 라우트 2개 신설** — `app/api/stock/*` (KIS 프록시) + `app/api/disclosure/*` (DART 프록시). 외부 도메인 (`openapivts.koreainvestment.com:29443`, `opendart.fss.or.kr`) 은 BFF 뒤에서만 호출.
- **Profile 도메인 종단 검증** — 종목 상세 1개 화면을 mock → 실데이터로 완전 전환. 현재가 (KIS) + 기업개황 (DART) + 최근 공시 5건 (DART). 본 PRD 의 "이게 됐다" 의 단일 증거.
- **나머지 4개 도메인 어댑터만 신설** — Dashboard / Market / Watchlist / Signals 의 어댑터 (`lib/api/<domain>/`) + 훅 (`hooks/<domain>/useQuery*.ts`) 신설하되, 화면 컴포넌트는 mock fallback 우선 (어댑터를 호출하지만 실패 시 mock). 화면 컴포넌트 시각 변경 0. 후속 PR 들이 화면별로 mock → 실데이터 전환만 마무리.
- **환경변수 미설정 시 mock fallback** — `KIS_APP_KEY` 또는 `OPENDART_API_KEY` 미설정 시 BFF 가 mock 응답 반환. 빌드 타임 키 검증 0 (Vercel preview 보호). 개발자 친화.
- **토큰 캐시 + 갱신** — KIS access_token (24h 만료) 을 인스턴스 메모리 + 디스크 (선택, §9 OPEN QUESTION q2) 에 캐시. 매 호출 발급 방지 — rate limit 회피.
- **응답 캐싱 TTL 도메인별 차등** — 현재가 (10s) / 일자별 차트 (1d) / 기업개황 (1d) / 공시 목록 (5min) — Next.js `revalidate` 또는 axios 인터셉터 + in-memory cache. §6 비기능 요구사항 명세.
- **실전계좌 안전장치 (선제)** — `KIS_ENV=prod` 일 때 코드 레벨에서 `app/api/order/*` 라우트 그룹 자체를 미존재로 보장. 본 PRD 는 주문 라우트를 만들지 않으므로 자연 충족, 다만 `lib/api/kis/index.ts` 에 "주문 API 함수는 본 PRD 에서 export 하지 않음" 주석 + 향후 PRD 진입 시 다중 게이트 체크리스트를 README 에 남김.
- **회귀 0건** — 5개 도메인 화면 양 뷰포트 (mobile 375 / desktop 1440) 무회귀. typecheck / lint / build 0 에러. mock 데이터 fallback 시 기존 화면과 동일하게 렌더.

## 3. 범위 (In Scope)

### 3.1 KIS REST 클라이언트 (`lib/api/kis/`)

도메인 한 뎁스 룰에 따라 `lib/api/kis/` 안에 한 뎁스만 — 서브 폴더 없이.

```
lib/api/kis/
├── client.ts          # axios 인스턴스 (baseURL = process.env.KIS_BASE_URL)
├── token.ts           # access_token 발급 + 캐시 + 갱신
├── price.ts           # 현재가 (inquire-price), 일자별 (inquire-daily-price)
├── search.ts          # 종목 검색 (가능하면 — §9 OPEN QUESTION q3 의 답에 따라)
├── types.ts           # KIS 응답 스키마 타입 (HtsKorIsnm·BstpKorIsnm·Output·OutputN 등)
└── errors.ts          # KIS 에러 코드 → ApiError 매핑
```

- **base URL** — `KIS_ENV=vts` (모의) 일 때 `https://openapivts.koreainvestment.com:29443`, `prod` 일 때 `https://openapi.koreainvestment.com:9443`. 본 PRD 는 `vts` 만 검증, `prod` 도 동작은 하지만 권장 X (실전계좌 안전장치).
- **token.ts** — `POST /oauth2/tokenP` 호출, `access_token` + `expires_in` 보관. 메모리 캐시 (`Map<string, {token: string, expiresAt: number}>`). expires 만료 60s 전부터 갱신. 동시 호출 시 single-flight (Promise dedupe). 디스크 캐싱 여부는 §9 OPEN QUESTION q2 결정에 따름.
- **응답 스키마 주의 (명시)** — `inquire-price.output.bstp_kor_isnm = "업종명"`, **종목명은 `hts_kor_isnm` 또는 `prdt_name`**. types.ts 의 doc comment 에 박는다. 응답 매퍼 (`lib/api/stock/mappers.ts`) 가 종목명 추출 시 `hts_kor_isnm` 우선, 비면 `prdt_name`, 그래도 비면 종목코드 그대로.
- **에러 매핑** — KIS 응답의 `rt_cd != "0"` 일 때 `msg1` (한글 메시지) 을 ApiError.message 로 통과. HTTP 4xx 도 통과. 5xx 는 한글 fallback ("KIS 서버 일시 오류. 잠시 후 다시 시도해주세요.").

### 3.2 OpenDART 클라이언트 (`lib/api/dart/`)

```
lib/api/dart/
├── client.ts          # axios 인스턴스, base URL = https://opendart.fss.or.kr/api
├── company.ts         # 기업개황 (company.json)
├── disclosure.ts      # 공시 목록 (list.json) + 단건 (document.xml — 본 PRD 미사용)
├── types.ts           # DART 응답 스키마
└── errors.ts          # DART status 코드 → ApiError 매핑
```

- DART 는 `crtfc_key` (API 키) 를 query param 으로 매번 전송. token 캐싱 불필요.
- 응답 `status` 가 `"000"` 이 아니면 에러 — `message` 한글 통과.
- 호출량 모니터링 — BFF 레벨에서 일일 호출 카운터 (옵션, §6 비기능 요구사항).

### 3.3 BFF 라우트

#### 3.3.1 `app/api/stock/` (KIS 프록시)

```
app/api/stock/
├── price/route.ts            # GET ?ticker=005930 → 현재가
├── daily/route.ts            # GET ?ticker=005930&period=D|W|M → 일/주/월 차트
└── search/route.ts           # GET ?keyword=삼성 → 종목 검색 (q3 결정 따라)
```

- 각 route handler 는 `lib/api/kis/*` 의 함수만 호출. 응답을 클라이언트 친화 스키마로 매핑 (`mappers.ts` 에서) — KIS 의 snake_case + 한국어 필드명을 camelCase + 영문 키로 정규화.
- 환경변수 미설정 시 → `lib/mock/stock/` (신규) 의 fixture 반환. 응답 헤더 `X-Data-Source: mock` 박는다.
- ApiError 4xx 통과, 5xx 한글 fallback (`docs/rules/frontend.md` §1 정합).

#### 3.3.2 `app/api/disclosure/` (DART 프록시)

```
app/api/disclosure/
├── company/route.ts          # GET ?ticker=005930 → 기업개황
└── list/route.ts             # GET ?ticker=005930&count=5 → 최근 공시 N건
```

- ticker (종목코드 6자리) → DART corp_code 매핑이 필요. 매핑 캐시는 §9 OPEN QUESTION q3 의 결정 (상장 종목 리스트 소스) 에 종속.

### 3.4 TanStack Query 훅 + queryKeys

`docs/rules/frontend.md` §7 의 queryKeys 표준 따름. `lib/query/queryKeys.ts` 에 추가:

```ts
export const queryKeys = {
  // ... 기존 키
  stock: {
    price: (ticker: string) => ['stock', 'price', ticker] as const,
    daily: (ticker: string, period: 'D' | 'W' | 'M') => ['stock', 'daily', ticker, period] as const,
    search: (keyword: string) => ['stock', 'search', keyword] as const,
  },
  disclosure: {
    company: (ticker: string) => ['disclosure', 'company', ticker] as const,
    list: (ticker: string, count: number) => ['disclosure', 'list', ticker, count] as const,
  },
};
```

훅 신설 — 도메인 한 뎁스 (`hooks/<domain>/`):

```
hooks/stock/
├── useQueryStockPrice.ts
├── useQueryStockDaily.ts
└── useQueryStockSearch.ts

hooks/disclosure/
├── useQueryDisclosureCompany.ts
└── useQueryDisclosureList.ts
```

- staleTime / gcTime 은 §6 비기능 요구사항의 TTL 표 따름.
- `select` 옵션으로 클라이언트 친화 스키마 강제 (mappers 호출).

### 3.5 도메인 어댑터 매핑 (mock → 실데이터)

**Profile (종단 전환)** — 화면 컴포넌트도 mock 제거, 훅으로 교체:

| 화면 영역 | 현재 (mock) | 본 PRD 후 (실데이터) |
|---|---|---|
| 종목 헤더 (이름·코드·가격·등락) | `lib/mock/profile/stockHeader.ts` | `useQueryStockPrice(ticker)` |
| 가격 차트 | `lib/mock/profile/chart.ts` | `useQueryStockDaily(ticker, 'D')` |
| 기업개황 | `lib/mock/profile/company.ts` | `useQueryDisclosureCompany(ticker)` |
| 최근 공시 5건 | `lib/mock/profile/disclosures.ts` | `useQueryDisclosureList(ticker, 5)` |

**Dashboard / Market / Watchlist / Signals (어댑터만 신설, 화면은 mock 유지)** — 후속 PR 자연 진입 base:

| 도메인 | 신설 어댑터 (이번 PR) | 화면 (이번 PR) | 후속 PR (별도 slug) |
|---|---|---|---|
| Dashboard | `lib/api/dashboard/` + `hooks/dashboard/useQueryHoldings.ts` | mock 그대로 | 보유 종목 multi-price 연결 |
| Market | `lib/api/market/` + `hooks/market/useQueryIndices.ts` | mock 그대로 | 시장 지수 + 거래량 상위 |
| Watchlist | `lib/api/watchlist/` + `hooks/watchlist/useQueryWatchlist.ts` | mock 그대로 | 사용자 관심종목 multi-price |
| Signals | (어댑터 신설 안 함 — 시그널 알고리즘 자체가 후속 PRD 영역) | mock 그대로 | 후속 PRD `signal-algorithm` |

→ Dashboard / Market / Watchlist 어댑터는 **인터페이스만 정의 + 한 함수씩 구현 + 한 화면씩 검증** 패턴. 본 PRD 머지 후 후속 PR 3건이 한 도메인씩 mock 제거.

### 3.6 로딩 / 에러 / 빈 상태 카피

- 로딩 — 기존 finsight-redesign 시리즈의 skeleton 컴포넌트 재사용.
- 에러 — ApiError.message (한글) 그대로 노출. 단 fallback 발동 시 (`X-Data-Source: mock`) 화면 하단에 흐릿한 안내: "실시간 데이터 일시 연결 안 됨 — 샘플 데이터로 보고 있습니다."
- 빈 상태 — Profile 종목 코드가 KIS 응답 비었을 때 "해당 종목을 찾을 수 없습니다. 종목코드를 다시 확인해주세요." (DART 도 동일 톤).

### 3.7 환경변수 스키마

```env
# KIS Developers
KIS_APP_KEY=               # 36자
KIS_APP_SECRET=            # 180자
KIS_ACCOUNT_NO=50190357    # 8자리 (모의)
KIS_ACCOUNT_PRODUCT_CD=01  # 2자리
KIS_ENV=vts                # vts (모의) | prod (실전 — 본 PRD 권장 X)

# OpenDART
OPENDART_API_KEY=          # 40자
```

- `.env.local.example` 신설 — 위 6개 변수의 dummy 값 + 주석. `.env.local` 자체는 `.gitignore` 보호 유지 (이미).
- 빌드 타임 검증 0 — 런타임 BFF 진입 시점에 검사, 미설정 시 mock fallback.

## 4. 비범위 (Out of Scope)

본 PRD 는 다음을 **명시적으로 제외** 한다:

- **주문 / 매매 API** — KIS `order-cash`, `order-credit`, `order-rvsecncl` 일체. 별도 PRD `stock-order-integration`. **본 PRD 머지 후 첫 PR 이 주문 API 추가면 reviewer 가 자동 차단**.
- **WebSocket 실시간 시세** — KIS WS (30+ 채널). 별도 PRD `realtime-quote-websocket`. 본 PRD 는 REST 폴링.
- **해외주식 / 선물옵션 / 채권 / ELW / ETF NAV** — KIS 가 지원하지만 본 PRD 범위 밖. 국내주식 (KOSPI/KOSDAQ) 만.
- **순위 분석 / 시세분석 / 외인기관 매매동향** — KIS 25+ 엔드포인트. 본 PRD 는 현재가 + 일자별 + 검색만.
- **재무비율 / 손익계산서 / 추정실적 / 투자의견** — KIS 종목정보 30+ 엔드포인트. 본 PRD 는 OpenDART 기업개황 + 공시 목록만. KIS 재무 API 는 후속.
- **시그널 알고리즘** — Signals 도메인은 어댑터도 신설 안 함. 별도 PRD `signal-algorithm`.
- **차트 그리기 (recharts 통합)** — 차트 데이터 (`useQueryStockDaily`) 까지만. recharts / lightweight-charts 컴포넌트 신설은 finsight-redesign 시리즈 후속 또는 별도 PRD.
- **종목 코드 → DART corp_code 매핑 표** — 본 PRD 는 §9 q3 결정에 따라 (a) 수동 시드 / (b) FDR / (c) KRX Open API 중 하나로 결정. 매핑 표 자체는 한 함수 (`getCorpCode(ticker)`) 안에 시드 또는 캐시.
- **다국어 (i18n) 메시지** — 본 PRD 의 모든 카피는 한글 single 언어.
- **DART API 외 외부 공시 소스** — 금감원·증권사 공시 RSS 등 일체.
- **시각 톤·레이아웃 변경** — finsight-redesign 시리즈가 정착한 톤 그대로. 컴포넌트 신설은 §3.5 의 훅 교체만, 시각 토큰 추가 0.

## 5. 수용 기준 (AC)

각 AC 는 `git grep` / `find` / `npm run` / curl 단위로 검증 가능해야 한다.

### AC-1 BFF 라우트 5개 존재

```bash
find app/api/stock -type f -name route.ts
# expect 3:
#   app/api/stock/price/route.ts
#   app/api/stock/daily/route.ts
#   app/api/stock/search/route.ts
find app/api/disclosure -type f -name route.ts
# expect 2:
#   app/api/disclosure/company/route.ts
#   app/api/disclosure/list/route.ts
```

### AC-2 KIS / DART 클라이언트 모듈 존재 + 도메인 한 뎁스 정합

```bash
find lib/api/kis -maxdepth 2 -type f
# expect: client.ts token.ts price.ts search.ts types.ts errors.ts (+ mappers 가능)
find lib/api/dart -maxdepth 2 -type f
# expect: client.ts company.ts disclosure.ts types.ts errors.ts
# 도메인 한 뎁스 — 서브 폴더 없음
find lib/api/kis -mindepth 2 -type d
find lib/api/dart -mindepth 2 -type d
# expect: 0 lines (서브 폴더 없음)
```

### AC-3 KIS / DART 직접 호출 없음 (BFF 경유)

```bash
git grep -nE 'openapi(vts)?\.koreainvestment\.com|opendart\.fss\.or\.kr' -- 'app/' 'components/' 'hooks/'
# expect: 0 lines (BFF 와 lib/api/* 외에 외부 도메인 직접 호출 없음)
git grep -nE 'openapi(vts)?\.koreainvestment\.com|opendart\.fss\.or\.kr' -- 'lib/api/'
# expect: 환경변수 또는 client.ts baseURL 만
```

### AC-4 queryKeys 표준 정합

```bash
git grep -n "queryKeys.stock\." -- 'hooks/' 'components/'
# expect: hooks/stock/* 안에서만 사용
git grep -n "queryKeys.disclosure\." -- 'hooks/' 'components/'
# expect: hooks/disclosure/* 안에서만 사용
```

### AC-5 커스텀훅 의무화 정합 (`docs/rules/frontend.md` §1)

```bash
git grep -nE "useQuery\(|useMutation\(" -- 'components/'
# expect: 0 lines (컴포넌트는 항상 커스텀훅 경유)
```

### AC-6 KIS 토큰 캐시 동작 (단위 테스트)

```bash
# 신설 테스트 (jest/vitest) 가 다음을 검증:
# 1. 첫 호출 → POST /oauth2/tokenP 1회
# 2. 두 번째 호출 → 캐시 hit, POST 0회
# 3. 만료 60s 전 → 갱신 (POST 1회)
# 4. 동시 호출 5건 → single-flight, POST 1회
npm test -- token
# expect: 4 tests pass
```

### AC-7 mock fallback 동작 (환경변수 미설정 시 빌드 + 응답)

```bash
# .env.local 백업 후 KIS_APP_KEY 비우고 빌드
KIS_APP_KEY="" npm run build
# expect: build success (0 error)

# dev 서버에서 BFF 응답 헤더 확인
curl -i http://localhost:3000/api/stock/price?ticker=005930 2>&1 | grep -i x-data-source
# expect: X-Data-Source: mock
```

### AC-8 Profile 종목 상세 실데이터 종단 검증 (수동)

`.env.local` 정상 설정 + dev 서버 기동 후:

- `/profile/005930` (삼성전자) 진입 시:
  - 종목 헤더에 "삼성전자" + 현재가 (KIS 응답값) + 등락 (red=up / blue=down — 한국식 컨벤션 유지) 렌더.
  - 기업개황 영역에 DART 응답값 (대표자명, 설립일, 업종) 렌더.
  - 최근 공시 5건 테이블 렌더. 각 행에 보고서명·접수일자.
- DevTools Network 탭에서 `/api/stock/price?ticker=005930` 200, `/api/disclosure/company?ticker=005930` 200, `/api/disclosure/list?ticker=005930&count=5` 200 확인.

### AC-9 응답 캐싱 TTL 정합 (DevTools Network 탭 수동)

| API | 첫 호출 시간 | 두 번째 호출 (TTL 내) | 두 번째 호출 (TTL 초과) |
|---|---|---|---|
| `/api/stock/price` | ~300ms | < 50ms (cache hit) | ~300ms (refetch) |
| `/api/stock/daily` | ~500ms | < 50ms | ~500ms (1d 후) |
| `/api/disclosure/company` | ~400ms | < 50ms | ~400ms (1d 후) |
| `/api/disclosure/list` | ~400ms | < 50ms | ~400ms (5min 후) |

### AC-10 종목명 추출 매퍼 회귀 차단 (단위 테스트)

```bash
npm test -- mappers
# expect: 다음 케이스 검증 통과
# 1. hts_kor_isnm 존재 → 종목명 = hts_kor_isnm
# 2. hts_kor_isnm 비고 prdt_name 존재 → 종목명 = prdt_name
# 3. 둘 다 비면 → 종목명 = ticker 그대로
# 4. bstp_kor_isnm 은 절대 종목명으로 사용 안 됨 (업종명 필드)
```

### AC-11 도메인 4개 어댑터 신설 + 화면 mock 유지

```bash
find lib/api/dashboard lib/api/market lib/api/watchlist -type f -name '*.ts'
# expect: 각 도메인에 최소 client.ts 또는 한 함수 모듈

find hooks/dashboard hooks/market hooks/watchlist -type f -name 'useQuery*.ts'
# expect: 각 도메인에 최소 1개 훅

git grep -n "lib/mock/dashboard\|lib/mock/market\|lib/mock/watchlist\|lib/mock/signals" -- 'components/'
# expect: 화면이 mock 데이터를 여전히 import 중 (어댑터만 신설, 화면 미전환)
```

### AC-12 환경변수 검증 + .env.local.example 신설

```bash
test -f .env.local.example
# expect: 0 (파일 존재)

git grep -n "KIS_APP_KEY\|KIS_APP_SECRET\|KIS_ACCOUNT_NO\|KIS_ACCOUNT_PRODUCT_CD\|KIS_ENV\|OPENDART_API_KEY" -- '.env.local.example'
# expect: 6개 변수 모두 등장
```

### AC-13 주문 라우트 부재 (안전장치)

```bash
find app/api/order -type d 2>/dev/null
# expect: 디렉터리 자체가 없음 (0 lines)

git grep -nE "order-cash|order-credit|order-rvsecncl" -- 'app/' 'lib/' 'hooks/'
# expect: 0 lines (주문 KIS TR_ID 일체 미등장)
```

### AC-14 typecheck / lint / build 0 에러

```bash
npm run typecheck
# expect: 0 error
npm run lint
# expect: 0 error 0 warning
npm run build
# expect: success
```

### AC-15 5개 도메인 화면 회귀 0 (수동, 양 뷰포트)

mobile 375 + desktop 1440 두 뷰포트에서 `/dashboard` `/market` `/watchlist` `/profile/005930` `/signals` 진입:

- Profile 만 실데이터 (AC-8).
- 나머지 4개는 mock 데이터 그대로. finsight-redesign 시리즈 머지 직후 (main `<hash>`) 와 시각 diff 0.

## 6. 비기능 요구사항

### 6.1 응답 캐싱 TTL

| 도메인 | API | TTL | 이유 |
|---|---|---|---|
| stock | `price` | 10s | 현재가 — 실시간성 우선, 그러나 매 키 입력마다 호출은 과함 |
| stock | `daily` | 1d | 일자별 — 장 종료 후 갱신, 장중에는 당일치만 invalidate |
| stock | `search` | 5min | 종목 검색 — 키워드 변동 적음 |
| disclosure | `company` | 1d | 기업개황 — 거의 변하지 않음 |
| disclosure | `list` | 5min | 공시 목록 — 신규 공시 빠른 반영 필요 |

- TanStack Query `staleTime` + `gcTime` 으로 클라이언트 캐시.
- BFF 레벨 in-memory cache 는 본 PRD 미도입 (인스턴스간 공유 안 됨, 효용 낮음). 후속 PRD 또는 Redis 도입 시점에 고려.

### 6.2 KIS 토큰 관리

- 토큰 발급: `POST /oauth2/tokenP` (앱키 + 앱시크릿). 응답 `access_token` + `expires_in` (24h = 86400s).
- 캐시 위치: 인스턴스 메모리 (Map). 디스크 캐싱은 §9 q2 결정 따라.
- 갱신 트리거: 만료 60s 전 자동 갱신.
- 동시성: single-flight (Promise dedupe) — 5건 동시 호출 시 발급 1회.
- 실패 fallback: 토큰 발급 실패 시 BFF 가 mock 반환 + 응답 헤더 `X-Data-Source: mock-token-failure`.

### 6.3 DART 호출 모니터링

- 일일 호출 제한 20,000건. 본 PRD 는 카운터만 신설 (`lib/api/dart/counter.ts` — 인스턴스 메모리, 자정 리셋).
- 18,000건 (90%) 도달 시 BFF 응답 헤더 `X-Dart-Quota-Warning: true`. 클라이언트는 무시 가능 (모니터링 용).
- 20,000건 (100%) 초과 시 mock fallback + `X-Data-Source: mock-quota-exceeded`.

### 6.4 보안

- `.env.local` 은 `.gitignore` 보호 (이미). 본 PRD 진입 후에도 유지.
- BFF 응답에 KIS App Secret / DART API Key 일체 노출 안 함.
- 브라우저 콘솔에서 `process.env.KIS_*` 또는 `process.env.OPENDART_*` 접근 0 — Next.js `NEXT_PUBLIC_` prefix 없는 환경변수는 서버 only.

### 6.5 회귀 차단

- 5개 도메인 화면 양 뷰포트 시각 diff 0 (AC-15).
- typecheck / lint / build 0 에러 (AC-14).
- 단위 테스트 신규 통과 (AC-6, AC-10).

## 7. 참고

- **선행 PRD**:
  - `docs/prd/finsight-redesign.md` — 5개 도메인 + `lib/mock/<domain>/` 표준 base.
  - `docs/prd/claude-cli-analysis.md` — BFF subprocess 패턴 참고 (FDR 검토 시).
  - `docs/prd/frontend-architecture-restructure.md` — axios + TanStack Query + BFF 구조 정착.
- **컨벤션**:
  - `docs/rules/frontend.md` — 8개 절 (네이밍 / 커스텀훅 / 도메인 한 뎁스 / cn / layout / copy / queryKeys / 반응형). 본 PRD 의 모든 신설 모듈이 이 룰 안에 들어가야 함.
- **외부 자료**:
  - `docs/references/korean-stock-api-comparison.md` — 직전 세션 (2026-05-24) 리서치 산출물. KIS / 키움 / FDR / DART / KRX 비교표.
  - [KIS Developers 공식 포털](https://apiportal.koreainvestment.com) — 엔드포인트 명세 + TR_ID 표.
  - [KIS GitHub 샘플코드](https://github.com/koreainvestment/open-trading-api) — 토큰 발급 + 응답 스키마 reference (Star 1.4k).
  - [OpenDART 공식](https://opendart.fss.or.kr) — 기업개황 + 공시 목록 명세.
  - [FinanceDataReader GitHub](https://github.com/FinanceData/FinanceDataReader) — KRX 종목 리스트 reference.
- **사전 검증 메모 (2026-05-28)**:
  - `inquire-price.output.bstp_kor_isnm` = 업종명 ("전기·전자"). 종목명은 `hts_kor_isnm` 또는 `prdt_name`. (PRD §3.1 명시)
  - 모의 도메인 `openapivts.koreainvestment.com:29443` — 포트 명시 필수.
  - DART `corp_code` 8자리 ≠ 종목코드 6자리. 매핑 필요.

## 8. 영향 분석

### 8.1 변경 라인 추정

| 영역 | 신설 / 변경 | 라인 추정 |
|---|---|---|
| `lib/api/kis/` (신설) | client.ts (~60) + token.ts (~120) + price.ts (~80) + search.ts (~60) + types.ts (~150) + errors.ts (~50) | +520 |
| `lib/api/dart/` (신설) | client.ts (~40) + company.ts (~50) + disclosure.ts (~70) + types.ts (~80) + errors.ts (~30) + counter.ts (~30) | +300 |
| `app/api/stock/` (신설) | price + daily + search route handlers | +180 |
| `app/api/disclosure/` (신설) | company + list route handlers | +120 |
| `hooks/stock/` + `hooks/disclosure/` (신설) | 5개 useQuery 훅 | +200 |
| `lib/api/dashboard/` + `market/` + `watchlist/` (어댑터만) | 인터페이스 + 한 함수씩 | +150 |
| `hooks/dashboard/` + `market/` + `watchlist/` (훅만) | 3개 useQuery 훅 | +100 |
| `lib/query/queryKeys.ts` (확장) | stock + disclosure 키 추가 | +30 |
| `lib/mock/stock/` + `lib/mock/disclosure/` (신설, fallback 용) | fixture | +200 |
| `components/profile/*` (전환) | 4개 컴포넌트 mock → 훅 교체 | +50 / -80 (net -30) |
| 단위 테스트 (token, mappers, counter) | 신규 | +250 |
| `.env.local.example` (신설) | 6 변수 + 주석 | +30 |
| `docs/SESSION_NOTES.md` + `docs/references/korean-stock-api-comparison.md` (working tree 동봉) | 직전 세션 산출물 | +120 (이미 작성됨) |

**합계**: 약 +2200 / -80, 17~20 files. 단일 PR 로는 큼.

### 8.2 PR 분할 권고

본 PRD 단일 슬러그 (`stock-api-integration`) 유지하되, **PR 3개 분할 검토 권고**:

| 분할 | 내용 | 라인 |
|---|---|---|
| **PR-A** (필수) | `lib/api/kis/` + `lib/api/dart/` + BFF 5 라우트 + queryKeys + 환경변수 + 단위 테스트 + SESSION_NOTES 동봉 | ~1400 |
| **PR-B** (필수) | `hooks/stock/` + `hooks/disclosure/` + Profile 도메인 종단 전환 (4 컴포넌트 mock → 훅) + AC-8 종단 검증 | ~500 |
| **PR-C** (옵션) | Dashboard / Market / Watchlist 어댑터 + 훅 신설 (화면 mock 유지) | ~300 |

- **분할 사유**: PR-A 는 인프라만, PR-B 는 종단 검증으로 "되는가?" 답함, PR-C 는 후속 PR 들의 base 작업. 한 PR 에 묶으면 reviewer 가 인프라 + 화면 전환 + 후속 base 를 한 번에 봐야 함 — 인지 부하 높음.
- **단일 PR 옵션**: 사용자가 "한 작업 한 PR" 룰 엄수를 원하면 단일 PR 가능. 단 reviewer 부담 인지 후 결정. 직전 finsight-redesign 시리즈가 9개 분할 (단일 슬러그 한정 룰 해제) 한 전례 있음.
- **본 PRD 의 권고**: PR-A + PR-B 묶음 1 PR (라인 ~1900, AC 8개 종단 통과 — "이게 됐다" 단일 증거) + PR-C 는 별도. **사용자 결정 필요** — §9 OPEN QUESTION q6 으로 빼둠.

### 8.3 회귀 위험

- **R1 (높음): KIS 토큰 동시 발급 race** — 동일 인스턴스에서 첫 요청 5건 동시 도착 시 토큰 발급 5회 → KIS rate limit 위반 가능. **mitigation**: single-flight 패턴 (Promise dedupe). AC-6 #4 가 검증.
- **R2 (높음): 종목명 / 업종명 혼동** — `bstp_kor_isnm` 을 종목명으로 잘못 사용하면 모든 종목이 "전기·전자" 등 업종명으로 표시. **mitigation**: types.ts doc comment + AC-10 단위 테스트.
- **R3 (중간): mock fallback 무한 트리거** — 환경변수 설정됐는데 KIS 토큰 발급 일시 실패 → 매 호출 토큰 재시도 → KIS 서버 부담. **mitigation**: 토큰 실패 1회 후 5분간 mock fallback (circuit breaker). 본 PRD 는 단순 구현, 후속 개선 영역.
- **R4 (중간): DART corp_code 매핑 누락** — ticker 가 매핑 표에 없으면 DART 호출 자체 불가. **mitigation**: §9 q3 결정 (수동 시드 or FDR or KRX). 본 PRD 시작 시점에 KOSPI 200 + KOSDAQ 150 = 350개 수동 시드 최소. 미존재 ticker 는 빈 응답 + 안내 메시지.
- **R5 (낮음): TTL 캐싱이 장 시작 직전/직후 데이터 부정합** — 09:00 직전 캐시된 전일 종가가 09:01 까지 노출. **mitigation**: stock.price TTL 10s 라 영향 미미. 장 시작 시 invalidate 트리거는 후속 PRD.
- **R6 (낮음): 실전계좌 환경변수 오설정** — `KIS_ENV=prod` 로 잘못 설정 시 실전 API 호출. 본 PRD 는 조회 only 라 매매 위험 0 이지만 호출량이 실전계좌에 카운트. **mitigation**: BFF 응답 헤더 `X-KIS-Env: ${KIS_ENV}` 박아 클라이언트 콘솔에서 즉시 확인 가능.

### 8.4 후속 PR 자연 연결

본 PRD 머지 후 자연스럽게 진입 가능한 후속:

1. Dashboard 화면 mock → 실데이터 (`useQueryHoldings` + KIS `inquire-multiple-price` or 반복 호출).
2. Market 화면 mock → 실데이터 (`useQueryIndices` + KIS 시장지수 API).
3. Watchlist 화면 mock → 실데이터 (`useQueryWatchlist` + 사용자 관심종목 localStorage 또는 BE 영구화).
4. Signals 도메인 PRD `signal-algorithm` — 본 PRD 의 시세 + 공시 데이터를 입력으로 시그널 계산.
5. 차트 컴포넌트 도입 — `useQueryStockDaily` 데이터를 recharts / lightweight-charts 로 렌더.
6. WebSocket 실시간 시세 PRD `realtime-quote-websocket`.
7. 주문 API PRD `stock-order-integration` — **실전계좌 다중 게이트 (비밀번호 재확인 + dry-run + 금액 상한 + audit log) 필수**.

### 8.5 working tree 미커밋 처리 (단독 SESSION_NOTES PR 금지)

현재 working tree (main):

```
M docs/SESSION_NOTES.md                              (직전 세션 entry append 40 라인)
?? docs/references/korean-stock-api-comparison.md    (직전 세션 리서치 산출물 234 라인)
```

- 정책 (`docs/SESSION_NOTES.md` §"별도 PR 금지"): 단독 SESSION_NOTES PR 금지.
- 본 PRD 가 다음 작업 PR 이므로, 본 PR 의 **첫 commit** (예: `docs(session+ref): 2026-05-24 주식 API 조사 세션 동봉`) 으로 두 파일을 묶어 commit.
- 이후 PRD 본문 (`docs/prd/stock-api-integration.md`) 이 두 번째 commit.

## 9. OPEN QUESTION

사용자 결정이 필요한 항목. 결정 후 `[RESOLVED]` 로 변경하고 결정 내용 1줄 추기.

### [RESOLVED] q1: FinanceDataReader (FDR) 연동 방식

**결정 (2026-05-28, 사용자)**: (c) 1차에서 FDR 제외. 종목 리스트는 q3 의 수동 시드, 장기 시계열은 후속 PRD `historical-data-fdr`.

---

### (원문) q1: FinanceDataReader (FDR) 연동 방식

본 PRD 1차 범위에서 FDR 을 어떻게 다룰까?

- (a) Next.js BFF 에서 Python subprocess 실행 — `claude-cli-analysis` 패턴 재활용. 장점: 단일 저장소. 단점: Python 의존, Vercel 배포 시 buildpack 별도 설정 필요.
- (b) 별도 FastAPI 마이크로서비스 — 장점: 깔끔한 분리. 단점: 인프라 추가 (배포·모니터링 비용).
- (c) **1차에서 FDR 제외**, 종목 리스트는 q3 의 다른 옵션, 장기 시계열은 추후 PRD. KIS + DART 만으로 충분.

**PM 권고**: (c). 본 PRD 가 이미 라인 수 큼 (~2200). FDR 도입 시 PR 분할 비용 + Python 인프라 결정 비용이 핵심 작업 (KIS + DART 정착) 을 흐트림. FDR 가치 = 장기 시계열 + KRX 종목 리스트 — 본 PRD 의 5개 도메인 중 어느 것도 1차 핵심 아님. 후속 PRD `historical-data-fdr` 로 자연 분리.

### [RESOLVED] q2: KIS 토큰 캐싱 위치

**결정 (2026-05-28, 사용자)**: (d) 개발 단계 (a) 인스턴스 메모리 only. PRD 에는 토글 인터페이스 (`KIS_TOKEN_STORE=memory|kv`) 만 박아둠. Vercel KV 도입은 배포 시점에 별도 결정.

---

### (원문) q2: KIS 토큰 캐싱 위치

Vercel serverless 배포 시 인스턴스 메모리는 매 cold start 새로 발급. 1초당 발급 제한이라 빈번한 cold start 시 위반 가능.

- (a) 인스턴스 메모리 only — 본 PRD 의 기본안. 단순. 단 Vercel cold start 빈번 시 위험.
- (b) Vercel KV (Redis 호환) — 인스턴스간 공유. 단점: 인프라 추가 + 비용.
- (c) 파일 시스템 (`/tmp/kis-token.json`) — Vercel serverless 의 `/tmp` 는 인스턴스간 비공유 + 휘발성. (a) 와 동일 한계.
- (d) **개발 단계는 (a), 운영 단계는 (b)** — 환경변수 `KIS_TOKEN_STORE=memory|kv` 토글.

**PM 권고**: (d). 현재는 (a) 로 시작 (사용자 본인만 사용, cold start 부담 낮음). Vercel 배포 + 다중 사용자 도입 시점에 (b) 로 자연 전환. PRD 에 토글 인터페이스만 박아둠 (실 구현은 (a) 만).

### [RESOLVED] q3: 상장 종목 리스트 소스 + DART corp_code 매핑

**결정 (2026-05-28, 사용자)**: (c) 수동 시드 350개 (KOSPI 200 + KOSDAQ 150). JSON 파일 1개 (`lib/api/kis/symbols.json` 등). corp_code 매핑도 350개. 신규 상장 + 미포함 종목은 빈 응답 + 안내 메시지. KRX / FDR 도입은 후속 PRD.

---

### (원문) q3: 상장 종목 리스트 소스 + DART corp_code 매핑

종목 검색 / Watchlist 추가 UX 의 base.

- (a) KRX Open API — 회원가입 무료, 공식 상장 종목 리스트. 단점: 또 하나의 외부 API 추가, 캐싱 전략 필요.
- (b) FDR — q1 의 답에 종속.
- (c) **수동 시드 (KOSPI 200 + KOSDAQ 150)** — 본 PRD 시작 시점에 350개 종목 시드. JSON 파일 1개. 단점: 신규 상장 종목 누락, 주기적 갱신 필요. 장점: 인프라 0, 즉시 적용.
- (d) KIS 자체 검색 API — `inquire-search-symbol-list` (존재 여부 확인 필요). 장점: 단일 의존성. 단점: 검색 품질 미검증.

**PM 권고**: (c). 본 PRD 1차는 수동 시드 350개로 시작. corp_code 매핑도 350개만 시드. 사용자가 자주 보는 종목 (대형주 + 본인 보유) 은 다 포함됨. 신규 상장 + 미포함 종목은 빈 응답 + 안내 메시지. 후속 PRD 에서 KRX or FDR 도입.

### [RESOLVED] q4: 실전계좌 안전장치 — 코드 레벨 가드 도입 여부

**결정 (2026-05-28, 사용자)**: (b) placeholder + README 체크리스트. `lib/api/kis/index.ts` 에 "주문 함수 미존재" 주석 + `app/api/order/*` 디렉터리 미생성 + README 에 후속 주문 PRD 진입 시 다중 게이트 (비밀번호 재확인 / dry-run / 금액 상한 / audit log) 의무 명시. 빌드 가드 (c) 는 후속 PRD 가 결정.

---

### (원문) q4: 실전계좌 안전장치 — 코드 레벨 가드 도입 여부

본 PRD 는 조회 only 이므로 주문 라우트 자체가 없음. 그러나 후속 주문 PRD 진입 시점에 실전계좌 (72245021) 실수 주문 위험.

- (a) 본 PRD 에서 가드 코드 미도입 (주문 PRD 진입 시 처리).
- (b) 본 PRD 에 placeholder 가드 + README 체크리스트 — `lib/api/kis/index.ts` 에 "주문 함수 미존재" 주석 + `app/api/order/*` 디렉터리 미생성 + README 에 "주문 API 추가 시 다중 게이트 (비밀번호 재확인 / dry-run / 금액 상한 / audit log) 의무" 명시.
- (c) 빌드 타임 가드 추가 — `next.config.ts` 에서 `KIS_ENV=prod` 이면서 `app/api/order/*` 존재 시 빌드 fail. 단점: 후속 PRD 가 빌드 가드까지 손대야 함.

**PM 권고**: (b). 본 PRD 부담 0 + 후속 PRD 진입 시 즉시 참고. (c) 는 과도 — 후속 PRD 가 자연스럽게 빌드 가드를 도입할지를 그 PRD 가 결정하게 둠.

### [RESOLVED] q5: 응답 캐싱 TTL 도메인별 수치

**결정 (2026-05-28, 사용자)**: (a) §6.1 표 그대로 (price 10s / daily 1d / search 5min / company 1d / list 5min). TTL 상수는 단일 파일 (`lib/query/queryConfig.ts`) 에 모아둠. 머지 후 1~2주 운영 데이터 (`X-Data-Source` 헤더 분포 + KIS 응답 시간 분포) 보고 후속 chore PR 로 조정.

---

### (원문) q5: 응답 캐싱 TTL 도메인별 수치

§6.1 의 TTL 표는 PM 추정. 실제 사용 패턴 데이터 0.

- (a) 본 PRD 표 그대로 채택 (price 10s / daily 1d / search 5min / company 1d / list 5min).
- (b) 더 짧게 — price 5s / list 1min. 실시간성 우선.
- (c) 더 길게 — price 30s / daily 7d. KIS rate limit 회피 우선.

**PM 권고**: (a). 추정값이지만 사용 패턴 데이터가 없으니 중간값. 머지 후 1~2주 운영 데이터 (`X-Data-Source` 헤더 분포, KIS 응답 시간 분포) 보고 후속 chore PR 로 조정. PRD 에 박지 말고 `lib/query/queryConfig.ts` 같은 단일 파일에 상수로 모아둠 → 조정 비용 최소.

### [RESOLVED] q6: PR 분할 (§8.2)

**결정 (2026-05-28, 사용자)**: (c) PR 3개 분할 (A / B / C 각각). "순차적으로 확실하게" 진행 방침. finsight-redesign 시리즈 패턴 (단일 슬러그 PR 분할 한정 룰 일시 해제) 동일 적용. 각 PR 머지 후 다음 PR 진입.

- **PR-A** (이번 진입 대상): `lib/api/kis/` + `lib/api/dart/` + BFF 5 라우트 + queryKeys + 환경변수 + 단위 테스트 + working tree 동봉
- **PR-B** (PR-A 머지 후): `hooks/stock/` + `hooks/disclosure/` + Profile 도메인 종단 전환 (AC-8)
- **PR-C** (PR-B 머지 후): Dashboard / Market / Watchlist 어댑터 + 훅 신설 (화면 mock 유지)

머지 게이트 절차 적용 — 다음 PR base 정합 검증 + 시리즈 종료 후 PRD 기반 최종 점검.

---

### (원문) q6: PR 분할 (§8.2)

본 PRD 단일 슬러그 `stock-api-integration` 하에:

- (a) 단일 PR — 라인 ~2200, reviewer 부담 높음. 한 작업 한 PR 룰 엄수.
- (b) **PR-A (인프라) + PR-B (Profile 종단) 묶음 1 PR + PR-C (3 도메인 어댑터) 별도** — 핵심 가치 = "Profile 종단 됐다" 단일 PR + 후속 base 분리.
- (c) PR 3개 분할 (A / B / C 각각) — finsight-redesign 시리즈 패턴 (단일 슬러그 PR 분할 한정 룰 해제).

**PM 권고**: (b). 본 PRD 의 핵심 검증은 AC-8 (Profile 종단). 이를 단일 PR 에 묶어야 "되는가?" 가 한 번에 답해짐. PR-C (3 도메인 어댑터) 는 화면 mock 유지라 검증 가치 낮고, 후속 PR 들이 한 도메인씩 화면 전환할 때 자연 동봉 가능. 다만 사용자가 한 작업 한 PR 룰 우선이면 (a), 분리 명확성 우선이면 (c).

### [RESOLVED] q7: 종목 검색 (`search`) 구현 방식

**결정 (2026-05-28, 사용자)**: (b) q3 의 수동 시드 350개 종목 JSON 을 클라이언트 fuzzy 검색. KIS 검색 API 존재 여부 확인은 frontend-dev 가 구현 중 확인 — 있으면 (a) 로 자연 전환 가능. fuzzy 라이브러리는 Fuse.js 또는 단순 substring 매칭 (frontend-dev 재량). 후속 PRD 가 확장.

---

### (원문) q7: 종목 검색 (`search`) 구현 방식

KIS 가 종목 검색 API 를 제공하는지 1차 미확정.

- (a) KIS 종목 검색 API 사용 (있다면).
- (b) q3 의 수동 시드 350개 종목 JSON 을 클라이언트 fuzzy 검색 — Fuse.js 또는 단순 substring.
- (c) 본 PRD 에서 검색 미구현 — `app/api/stock/search/route.ts` 생성 안 함. AC-1 에서 search 제외.

**PM 권고**: (b). 본 PRD 시작 시점에 사용자가 KIS 검색 API 존재 여부 확인 → 있으면 (a), 없으면 (b). (b) 채택 시 인프라 0 + UX 즉시 동작. 350개 종목으로 시작 → 후속 PRD 가 확장.

---

**참고 — 본 PRD 의 PR 본문 작성 시 §10 "다음 작업" 섹션 예시** (frontend-dev 가 PR 본문 작성 시 참고):

```markdown
## 다음 작업
- Dashboard 화면 mock → 실데이터 (`useQueryHoldings` + KIS multi-price)
- Market 화면 mock → 실데이터 (`useQueryIndices` + KIS 시장지수 API)
- Watchlist 화면 mock → 실데이터 (관심종목 localStorage 영구화 결정)
- PRD `signal-algorithm` — Signals 도메인 시그널 알고리즘
- 1~2주 운영 후 §6.1 TTL 수치 재조정 (X-Data-Source 헤더 분포 기반)
- PRD `stock-order-integration` 진입 시 §9 q4 의 다중 게이트 체크리스트 적용
```
