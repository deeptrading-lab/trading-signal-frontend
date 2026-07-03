# PRD — stock-warnings (토스 매수 유의사항: AI 분석 주입 + 종목 상세 경고 배지)

- 작성: PM 역할 (2026-07-03)
- 브랜치: `feature/stock-warnings`
- 관련: `docs/prd/toss-market-data-adapter.md` (토스 어댑터 기반), PR #201 (KIS 메타 보강), PR #203 (단타워치 — 본 PRD 비범위·후속)

## 1. 배경 / 문제

토스 Open API 에 `GET /api/v1/stocks/{symbol}/warnings` (매수 유의사항 조회)가 있다. KRX 시장경보
지정 상태(정리매매·단기과열·투자경고·투자위험)와 변동성완화장치(VI) 발동을 "현재 활성인 항목"만
배열로 준다. 우리 서비스에는 이 계열 정보가 전무하다:

- **AI 종합분석**: 정리매매·투자위험 지정 종목에도 지정 사실을 모른 채 BUY 결론을 낼 수 있다.
  그라운딩 컨텍스트(`priceContext`)에 현재가·수급은 있지만 시장경보는 없다.
- **종목 상세**: 경고 배지가 없다. 관리종목(isAdminItem)은 #201 로 API 계층까지만 보강됐고
  UI 미표시, 관심종목 행도 "배지 보류(데이터 소스 부재)" 주석 상태.

라이브 실측(2026-07-03)으로 확인한 API 특성:

- 응답 항목 = `{warningType, exchange, startDate, endDate}`. **날짜가 실전에서 null 로 온다**
  (단기과열 지정 중인 111710 실측 — KRX 공시엔 기간이 있는데 null). 기간 필드에 의존 금지,
  "항목 존재 = 현재 지정 중" 으로만 해석한다.
- 스펙이 **unknown warningType 허용 구현을 의무화** — enum 밖 코드에 폴백 라벨 필요.
- 종목 없음 = 404, 유의사항 없음 = 200 + `[]`. 레이트리밋 `STOCK` 그룹(5/s).
- VI 계열만 실시간(수초), 지정 계열은 거래소 공시 기준 일배치.

## 2. 목표 (측정 가능)

- AI 종합분석 실행 시 활성 시장경보가 있으면 전 에이전트 공유 그라운딩(`priceContext`)에
  "매수 유의" 1줄이 주입된다. 없으면 무주입(프롬프트 무변경 = 무회귀).
- 종목 상세 헤더(`/stock/[ticker]`)에 활성 경보 칩이 뜬다 (정리매매/투자위험 = critical,
  투자경고/단기과열 = warn, VI = info).
- **토스 키 없는 로컬(동료 머신)에서 동작 무변경**: 배지 미표시 + 프롬프트 무주입, 에러·로그 소음 0.

## 3. 범위 (In scope)

### 3-1. 공용 함수 `lib/api/toss/warnings.ts`

- `fetchActiveWarnings(symbol): Promise<StockWarning[]>` — **never-throw**.
  `isTossConfigured()` false → 즉시 `[]`. 404 포함 모든 실패 → `[]` (실패 캐시 60s).
- 성공 캐시 TTL 60s (VI 신선도 기준) + single-flight. 심볼은 스펙 패턴
  `^[A-Za-z0-9.\-]+$` (국내 6자리 + 미국 티커 대비 — 심볼 무관 설계).
- `StockWarning` 타입은 `lib/api/toss/types.ts`. KIS 폴백 **없음** (대응 KIS TR 미사용) —
  기존 어댑터와 달리 "토스 전용" 첫 사례임을 모듈 주석에 명시.

### 3-2. AI 종합분석 주입 (`app/api/stock/ai-analysis/route.ts`)

- 가격·수급 병렬 페치(`Promise.allSettled`)에 `fetchActiveWarnings` 합류.
- `formatPriceContextForPrompt` 에 warnings 인자 추가 — 업종/외국인 줄 다음에
  `⚠️ 매수 유의(거래소 시장경보): 단기과열 지정 중` 형태 1줄. 빈 배열이면 줄 자체 없음.

### 3-3. 종목 상세 배지 (BFF + 훅 + UI)

- BFF: `app/api/stock/warnings/route.ts` — `GET ?ticker=` → `{ warnings: StockWarning[] }`,
  `X-Data-Source: toss|none`. ticker 형식 검증(400), 그 외 실패는 200 + 빈 배열(fail-soft).
- 클라이언트: `lib/api/stock/warnings.ts` + `hooks/stock/useQueryStockWarnings.ts`
  (+ `queryKeys`, `queryConfig.stock.warnings` staleTime 60s).
- UI: `StockHeader` 종목명 옆에 기존 `badge-critical`/`badge-warn`/`badge-info` 칩.
  한글 라벨·심각도 매핑은 `lib/copy/stock/warnings.ts` 단일 위치 (서버 프롬프트 라벨과 공유).
  실패·빈 배열·키 없음 = 미표시 (레이아웃 무변화).

## 4. 비범위 (Out of scope — FOLLOWUPS)

- ⑥ 단타워치/모의투자 틱 컨텍스트 주입 + 후보표(volume-rank) 경고 칩 — #203 위에 후속 PR
  (본 PR 의 `fetchActiveWarnings` 재사용).
- ③ 밸류트랩 스냅샷(`/api/stock/snapshot`) 포함, ④ 시그널 룰 엔진 게이트, ⑤ 관심종목 행 배지,
  ⑦ 스코어카드 지정 이벤트 스탬프.
- VI 이력 적재(API 는 현재 활성만 제공), 관리종목·거래정지·투자주의(1단계) — 본 API 미제공
  (관리종목은 #201 KIS 보강, 거래정지는 토스 `/stocks` 플래그 유지).

## 5. 수용 기준 (AC)

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | 토스 키 없음 (동료 로컬) | 배지 미표시·프롬프트 무주입·에러 로그 0. 기존 화면/분석 무변경 |
| AC-2 | 활성 경보 없는 종목 (005930) | 칩 없음, `priceContext` 에 유의 줄 없음 |
| AC-3 | 지정 종목 (실측 111710 = 단기과열) | `badge-warn` 칩 "단기과열", priceContext 에 매수 유의 1줄 |
| AC-4 | 정리매매/투자위험 (모의) | `badge-critical` 칩, 프롬프트 라벨 동일 |
| AC-5 | unknown warningType (모의) | 폴백 라벨 "거래소 경보" 칩 — throw 없음 |
| AC-6 | 토스 API 실패/404 | 200 + 빈 배열 fail-soft, 화면·분석 진행 무영향 |
| AC-7 | 날짜 null (실측 기본) | 기간 미표시 설계라 UI 영향 없음 |
| AC-8 | 캐시 | 60s 내 재요청은 토스 1콜 (single-flight 동시요청 1콜) |

## 6. 데이터 / API

- `GET https://openapi.tossinvest.com/api/v1/stocks/{symbol}/warnings` — `{result: StockWarning[]}`.
- `warningType` enum: `LIQUIDATION_TRADING`(정리매매)·`OVERHEATED`(단기과열)·`INVESTMENT_WARNING`(투자경고)·
  `INVESTMENT_RISK`(투자위험)·`VI_STATIC`/`VI_DYNAMIC`/`VI_STATIC_AND_DYNAMIC`(VI)·`STOCK_WARRANTS`(신주인수권)
  + unknown 허용. 심각도: 정리매매·투자위험 → critical / 투자경고·단기과열 → warn / VI·신주인수권·unknown → info.

## 7. 릴리즈 / 운영

- 한 브랜치 한 PR. 라벨 게이트 impl-ready → qa-passed → review-approved 후 머지(사용자 승인).
- prod 는 TOSS env 미설정이라 배포돼도 무변경(빈 배열 경로). prod 활성화는 TOSS 키 등록만으로
  가능 — 시세 소스 전환(`MARKET_DATA_SOURCE`)과 **독립** (`isTossConfigured` 게이트만 사용).

## 8. 영향 분석

- `formatPriceContextForPrompt` 시그니처 변경 — 호출 1곳(같은 파일). 빈 배열 시 출력 동일 → 기존
  분석 스냅샷·A/B 하니스 무영향.
- `StockHeader` 는 표시 전용 추가 — 로딩/에러 상태 기존 분기 유지, 칩은 데이터 있을 때만 렌더.
- 신규 토스 콜: 분석 1회당 +1, 종목 상세 진입당 +1(60s 캐시) — `STOCK` 5/s 대비 미미.
- 토큰: 기존 KV 공유 단일 토큰 재사용(`tossGet`) — 재발급·무효화 경로 없음.

## 9. OPEN QUESTION

- q1. VI 칩을 종목 상세에 상시 노출할지(60s 캐시라 해제 후 최대 60s 잔상) — **PM 권고: 노출 유지**.
  잔상 60s 는 "방금까지 발동" 정보로도 유익, 단타 지면(후속)에서 fresh 조회로 보완.
- q2. 미국 티커 확장 시 경보 의미(KRX 제도 부재로 사실상 항상 빈 배열) — 심볼 무관 설계로 두고
  미국 확장 PRD 에서 재검토.
