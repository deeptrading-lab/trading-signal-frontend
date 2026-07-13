# QA — us-stock-support (미국 주식 검색 + 표시, P0+P1)

- 대상 PR: **#346** (`feature/us-stock-display` → `main`, 14커밋)
- PRD: [`docs/prd/us-stock-support.md`](../prd/us-stock-support.md)
- 판정: **qa-passed** (실패 0건)
- 검증 환경: 격리 워크트리 `scratchpad/wt-us` (HEAD `955a02a`), Node `--env-file=.env.local` (TOSS 키·`MARKET_DATA_SOURCE=toss`)
- 브라우저 육안 검증: **사용자 확인 완료** (검색 한글/영문/별칭 · US 상세 KR 섹션 숨김 · 통화 · 원화 환산 · 분봉 탭 없음 · 모바일 한 줄 · KR 무회귀). 본 리포트는 나머지 AC 를 tsx/vitest/build 로 실측.

---

## 1. AC 별 재현·기대·실측

### P0 — 검색

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1 US 티커 | `searchSymbols("AAPL"/"Apple"/"SPY")[0]` | AAPL·AAPL·SPY 1위 | `AAPL` / `AAPL` / `SPY` | ✅ |
| 2 한글명 | `searchSymbols("애플"/"엔비디아"/"테슬라")[0]` | AAPL(name="애플")·NVDA·TSLA | `AAPL`/name=`애플` · `NVDA` · `TSLA` | ✅ |
| 3 별칭 | `searchSymbols("구글").map(ticker)` | GOOGL 또는 GOOG 포함 | `GOOGL` 포함 (별칭 구글→알파벳 치환) | ✅ |
| 4 KR 무회귀 | 삼성전자 검색 · `getMarketByTicker`·`getCorpCode` | 005930 포함 · KOSPI · AAPL→null·null | 005930 포함 · `KOSPI` · `getCorpCode(AAPL)=null` · `getMarketByTicker(AAPL)=null` · `getSymbolName(AAPL)=애플` | ✅ |
| 5 인덱스 무결성 | `us-symbols.json` `$meta` vs 실측 | count_actual==len==10618, count_ko_name==10367, 전 엔트리 ticker/name/market, 중복 0 | count_actual=10618, symbols.length=10618, count_ko_name=10367, 실제 koName=10367, 누락 엔트리 0, 중복 티커 0 | ✅ |

> AC1~5 는 `npx tsx` 단언 스크립트로 일괄 실측(25/25 PASS). vitest `lib/api/kis/__tests__/search.test.ts` 17건도 전부 통과.

### P1 — 표시

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 6 isUsTicker | `isUsTicker("AAPL"/"BRK.A"/"005930")` | true·true·false | `true` · `true` · `false` | ✅ |
| 7 통화 포맷 | `fmtYAxis(315,true)`·`fmtYAxis(390000,false)`·`fmtTooltipPrice(315,true)` | "315"(만 없음)·"39만"·"$" 접두 | `"315"` · `"39만"` · `"$315.00"` | ✅ |
| 8 환율 어댑터 | `fetchExchangeRate("USD","KRW")` (Toss 실호출) | 양수 반환 | `isTossConfigured=true`, `USD→KRW = 1503.7` (>0) | ✅ |
| 9 동적 축폭 | `StockDailyChart` axisWidth useMemo 위치·hook 규칙 | early-return 앞·react-hooks 통과 | axisWidth `useMemo`(L190) < 첫 early-return `if(isLoading)`(L278). `react-hooks/rules-of-hooks` 룰 활성(config count=1)·eslint EXIT 0 | ✅ |

### 공통

| AC | 명령 | 실측 | 판정 |
|---|---|---|---|
| 10 tsc | `npx tsc --noEmit` | EXIT 0 (에러 0) | ✅ |
| 10 eslint | `npx eslint <변경 18파일>` | EXIT 0 (에러 0) | ✅ |
| 10 vitest | `npx vitest run lib/api/kis/__tests__/search.test.ts components/profile/__tests__/stockChartConfig.test.ts` | 2 files · **23 tests passed** | ✅ |
| — build | `npm run build` | ✓ Compiled successfully · 73/73 static pages · 에러 0 | ✅ |

---

## 2. 공통 QA AC (무회귀)

| 항목 | 검증 | 실측 | 판정 |
|---|---|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` | 3건 전부 `FASTAPI_BASE_URL` route handler fallback(whitelist/search·workbench adapter) — 본 PR 변경 아님, 허용 예외 | ✅ |
| 직접 fetch | 변경 클라이언트(hooks/components/lib non-route)에 `fetch(` | 0건 | ✅ |
| Toss 직접호출 | hooks/·components/ 에서 `tossGet`/`getTossClient` | 0건 (환율은 `/api/market/exchange-rate` BFF → `lib/api/toss/exchangeRate` 경유) | ✅ |
| 한글 톤 | 신규 노출 문구 | "약", "…만원/억원", "원", "USD"/"KRW"(통화코드=단위 예외), "$"(통화기호) — 한글 톤 무회귀 | ✅ |
| 접근성 | `allowMinute` 로 분봉 탭 조건부 제거(Tab 순서 자연 축소)·환율 병기 span 부가정보 | 회귀 없음 | ✅ |

---

## 3. 에지 케이스

| 시나리오 | 입력 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| NaN y축(US) | `fmtYAxis(NaN,true)` | 크래시 없음 | `"-"` | ✅ |
| NaN y축(KR) | `fmtYAxis(NaN,false)` | 크래시 없음 | `"-만"` (기존 KR 동작 동일·비회귀, NaN 축값은 recharts auto-domain 상 미발생) | ✅(관찰) |
| malformed 툴팁가 | `fmtTooltipPrice("abc"/null, ...)` | 안전값 | `["$0.00","종가"]` · `["0.00 원","종가"]` (Number.isFinite 가드) | ✅ |
| 0 가격(US) | `fmtYAxis(0,true)` | "0" | `"0"` | ✅ |
| 빈 티커 | `isUsTicker("")` | false | `false` | ✅ |
| 환율 소스 실패/이상응답 | `fetchExchangeRate("ZZZ","KRW")` (Toss 실호출) | never-throw → null degrade | `null` (헤더 렌더 안 막음) | ✅ |
| Toss 미설정 | `isTossConfigured()=false` 경로 | route `rate:null`+200(fail-soft) | 어댑터 `null` 반환 확인 (route 는 `jsonWithDataSource(...,"none")` degrade) | ✅ |

> `app/api/market/exchange-rate/route.ts` 는 통화코드 `!/^[A-Z]{3}$/` → 400, Toss 미설정·타임아웃·실패 전부 `rate:null`+200 fail-soft — 부가정보라 헤더 렌더를 막지 않는 설계 확인.

---

## 4. 라운드트립 / 브라우저

- US 시세·차트·호가는 **로컬 `MARKET_DATA_SOURCE=toss` 전용**(prod Toss 미설정, PR 본문 §알려진 한계 명시). 본 QA 는 Toss 실호출(환율·isTossConfigured)로 데이터 경로 도달을 확인했고, 화면 육안(검색 한/영/별칭·US 상세 KR 섹션 숨김·통화·원화 환산·분봉 탭 부재·모바일 한 줄·KR 무회귀)은 **사용자가 이미 완료**.
- 스타일링 토큰 라이브 동기화(DESIGN.md `design:sync`)는 본 PR 스코프 밖(토큰 변경 없음, hex/px 직타 없음) — 해당 없음.

---

## 5. 결론

- 자동 검증(tsc·eslint·vitest·build) 4/4, AC 실측(P0 5·P1 4·공통) 전부 통과, 에지 7종 안전, BFF·한글톤·직접fetch 무회귀 0건.
- **판정: qa-passed** — 실패 0건.
- `## 다음 작업`(PR 본문) 존재 확인 → 라벨 게이트 통과: prod US=Toss 라우팅 결정 + 시총·분봉(P1.5) + 백엔드 US 분석(P2)은 별도 트랙.
