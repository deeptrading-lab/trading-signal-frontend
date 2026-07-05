# QA 리포트 — 실시간 순위 값 컬럼 4탭 통일 (`ranking-value-column-unify`)

- PR: #261 `feature/ranking-value-column-unify`
- 대상 커밋: `bbc9ec4` (base `cf70047`)
- 판정: **qa-passed** (실패 0건)
- 성격: 경량 폴리시, PRD 없음 — 아래 수용 기준(AC)으로 대체.

## 요약

급상승/급하락 탭도 거래대금 값 컬럼을 채워 4탭 통일. 랭킹 TR(`FHPST01700000`)은 거래대금을
안 주지만, enrich 가 산업(sector) 위해 이미 부르는 `loadKisPriceMeta`(inquire-price) 응답의
`acml_tr_pbmn` 을 재사용 → **신규 네트워크 0**. 거래량/거래대금 탭은 랭킹 TR 자체값 우선.

라이브 KIS(prod)가 주말 애프터아워임에도 응답(`X-Data-Source: kis`)하여 mock 뿐 아니라 **실 데이터
라운드트립**까지 확인됨.

---

## AC별 검증표

| AC | 항목 | 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC1 | 4탭 값 컬럼(md+) | `valueColumnForTab` 코드 경로 + 4탭 엔드포인트 렌더 | 4탭 모두 값 컬럼, 탭 전환 시 레이아웃 안정 | `tab === "turnover" \|\| "surge" \|\| "plunge"` 모두 거래대금 컬럼 반환. 그리드는 `rankGridClass(valueColumn !== null)` — 4탭 전부 value 컬럼 있는 md+ 그리드 사용 → 탭 전환 시 열 정의 불변(시프트 없음) | PASS |
| AC2 | 급상승/급하락 거래대금 | `curl /api/market/fluctuation?direction=up/down` | 각 행 `tradingValue` 채워짐 → 컴팩트(조/억) | up/down 14행 전부 `tradingValue` 有 (삼화전자 41,877,393,907 → "418억" 등). enrich 경로로 채워짐 | PASS |
| AC3 | 자체값 우선 | `curl volume-rank?by=volume/value` + `rankingEnrich.test.ts` | 거래량/거래대금 탭은 랭킹 TR 값 유지, enrich 로 덮지 않음 | by=value: SK하이닉스 tv=18,076,083,052,500(TR값, "18조"). 코드 `ownTradingValue ?? enrich.tradeAmount`. 테스트 "행 자체 거래대금 있으면 유지" 통과(자체 123B 유지 vs enrich 999B 무시) | PASS |
| AC4 | fail-soft | `formatWonCompact` 코드 + `rankingEnrich.test.ts` | enrich 미확보 → `tradingValue=null` → UI "-", 크래시 0 | `formatWonCompact(value)` `value == null \|\| !isFinite \|\| <= 0` → `"-"`. 테스트 "미확보 값 … tradingValue=null" 통과. 홈 렌더 200 OK, 크래시 없음 | PASS |
| AC5 | 무회귀 | `git diff --name-only \| grep route.ts` + 4탭 응답 | 두 라우트 코드 무변경인데 tradingValue 자동 채움, 시총·산업·경고·위험숨기기·가용성 무영향, 값 컬럼 md+ only(모바일 무변경) | 라우트 파일 변경 0건(ROUTES UNCHANGED). 두 라우트 모두 기존 `enrichRankingRows` 호출 → 자동 충전. 값 컬럼 JSX `hidden … md:block`(모바일 미노출). marketCap/sector 매핑 로직 그대로 | PASS |
| AC6 | 게이트 | 아래 명령 | tsc/eslint/build/vitest 통과 | 전부 exit 0 (아래 로그) | PASS |

---

## AC6 게이트 로그

```
$ npx tsc --noEmit                → exit 0
$ npx eslint <변경 9파일>          → exit 0
$ npm run build                   → exit 0 (전 라우트 생성)
$ npx vitest run rankingEnrich mappers formatMarketCap formatShareVolume
   ✓ rankingEnrich.test.ts (6)
   ✓ mappers.test.ts (12)
   ✓ formatMarketCap.test.ts (5)
   ✓ formatShareVolume.test.ts (4)
   Test Files 4 passed | Tests 27 passed → exit 0
```

## 라운드트립 (dev 서버 + 라이브 KIS prod, 애프터아워)

`npm run dev` (localhost:3099). `X-Data-Source: kis`, `X-KIS-Env: prod` 확인.

| 탭 | 엔드포인트 | 결과 |
|---|---|---|
| 급상승 | `/api/market/fluctuation?direction=up` | 14행, 전부 `tradingValue` 채움(enrich). 예 삼화전자 41.8B, 져스텍 104.7B |
| 급하락 | `/api/market/fluctuation?direction=down` | 14행, 전부 `tradingValue` 채움(enrich) |
| 거래량 | `/api/market/volume-rank?by=volume` | 9행, tv=랭킹 TR 자체값(진흥기업 87.3B, vol 동시 有) |
| 거래대금 | `/api/market/volume-rank?by=value` | 8행, tv=랭킹 TR 자체값(SK하이닉스 18조, 삼성전자 9.4조) |
| 홈 페이지 | `/` | 200 OK, 크래시 없음 |

## 에지 케이스

- **enrich 예산 초과/실패** → `collectEnrichment` 가 `delay(ENRICH_BUDGET_MS)` 로 빈 맵 반환 →
  `tradingValue=null` → "-". never-throw(`enrichRankingRows` catch → null). 라우트 200 유지.
- **NaN/음수/0 거래대금** → `formatWonCompact` 가드로 "-". 테스트 커버.
- **행 tradingValue vs enrich 충돌** → 반환 타입 `Omit<T, "tradingValue"> & { tradingValue: number | null }`
  로 volume-rank 기존 `tradingValue?: number` 와 타입 충돌 없음(tsc clean).
- **mock 폴백(무키 dev)** → `getMockFluctuation` 에 `tradingValue` 실림 → 컴팩트 렌더.

## 공통 AC 무회귀

- BFF: 변경 diff 에 `fetch(`·`127.0.0.1` 추가 0건(client 코드 무변경).
- 한글 톤: 사용자 노출 문구 변경 없음(값 컬럼 라벨 `RANK_COL_TURNOVER` 기존 카피 재사용).
- 접근성: 값 컬럼은 기존 그리드 헤더(`RankHeaderRow`)와 동일 패턴, aria/Tab 변경 없음.

## 판정

전 AC 통과 · 게이트 4종 exit 0 · 라이브 4탭 라운드트립 정상. **qa-passed**.
