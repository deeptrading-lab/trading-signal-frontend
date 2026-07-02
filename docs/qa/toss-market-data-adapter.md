# QA — toss-market-data-adapter

- 실행: 2026-07-02 21:20~21:50 KST (장 마감·NXT 종료 후 — 데이터 정적 구간), 로컬 dev(포트 3100), 종목 005930
- 방법: dev 서버를 env 조합별로 부팅해 동일 라우트를 curl 수집 → node 스크립트로 kis/toss 응답 수치 대조
- 환경 참고: `KIS_TOKEN_STORE=kv`(Upstash 공유 store 활성). **KIS `inquire-price` 가 테스트 시간대에 500 연속 반환**(아래 AC-1 비고) — 본 브랜치와 무관함을 순정 KIS 부팅으로 교차 확인.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 무영향 기본값 | `MARKET_DATA_SOURCE=toss` + `TOSS_CLIENT_ID/SECRET` 빈 값 부팅 → price/daily 호출 | toss 미개입, 기존 KIS 경로 | toss 호출·`[marketdata]` 로그 0건. daily 200(kis). price 는 500 — **순정 KIS 부팅(토글 미설정)에서도 3/3 동일 500** → KIS측 야간 이슈, 무회귀 | ✅ (비고 1) |
| AC-2 토스 서빙 | 키 + `MARKET_DATA_SOURCE=toss` 부팅 → price·daily(D/W)·chart(400d)·chart-minute 호출 | 5개 라우트 toss 데이터 200, 스키마 동일 | 전부 200 + 폴백 warn 0건(=toss 성공). 스키마 `StockPrice`/`StockDailyCandle[]` 동일 | ✅ |
| AC-3 등락률 합성 | toss price 응답 검증 | price=lastPrice, change=전일종가 대비, 산식 정합 | `{price:290500, change:-25500, changePercent:-8.07, direction:down, volume:68972389, open/high/low 채움}` — 전일 통합종가 316000 대비 산식 일치. KIS 당일 대조는 KIS price 야간 500으로 미확보(비고 1)·내일 장중 1회 권장 | ✅ (비고 2) |
| AC-4 캔들 동등성 | kis vs toss 일봉 대조 (daily 30봉·chart 400일) | 확정봉 OHLC 일치, 불일치 시 §9 q1 판정 | **불일치 — 정의 차이 확인**: 확정봉 29/29·267/267 상이. 예) 07-01 close kis 314,500/toss 316,000, volume kis 25.0M/toss 42.8M(+71%). 오늘봉 close 286,000/290,500 · vol 38.9M/69.0M → **토스=KRX+NXT 통합 시세** | ⚠️→✅ §9 q1 RESOLVED (비고 3) |
| AC-5 분봉 파리티 | toss chart-minute(5분·1분) vs kis | 09:00~15:30 밖 봉 0, 78개 5분봉, 종가 동시호가 포함, 규약(키·오름차순·0거래량 필터) 준수 | **78봉 09:00~15:30 (kis 와 동수)**. 1분봉 381개, 종가 동시호가 15:30 v=3,702,849 포함(토스 원천은 15:31 기록 → 리라벨 확인). NXT/프리 봉 0건, 오름차순·`YYYY-MM-DDTHH:mm` 키 | ✅ |
| AC-6 폴백 | `TOSS_CLIENT_ID/SECRET=틀린 값` + `MARKET_DATA_SOURCE=toss` 부팅 | toss 실패 시 KIS 폴백 + `[marketdata]` warn | warn 2건 발화, daily 는 KIS 폴백으로 200 서빙 성공. price 는 폴백 후 KIS 자체 500 을 그대로 전파(설계 — 폴백 대상도 죽으면 기존 에러 매핑) | ✅ |
| AC-7 기존 스위트 | `npm run typecheck && lint && test` | 전부 통과, 기존 테스트 무수정 | typecheck 0 에러, lint 0, **테스트 656 passed**(기존 파일 무수정) | ✅ |
| AC-8 W/M 리샘플 | 단위 테스트 + 라이브 주봉 라벨 대조 | OHLCV 집계 규칙 + 라벨 파리티 | 단위 20 케이스 통과. 라이브: toss 주봉 라벨(…06-22, 06-29)이 KIS 주봉 라벨(주 시작일 06-29)과 일치, 30봉 | ✅ |

## 시나리오 라운드트립

부팅 4회 순환: ①기본(kis) → ②toss → ③toss+틀린 키(폴백) → ④toss+키 없음(kis 직행) — 각 부팅에서 서버 기동·라우트 정상 응답·로그 확인. 토글은 env 만으로 왕복되며 코드/캐시 잔존 영향 없음(재부팅 단위).

## 에지 케이스

1. **분봉 maxBars × NXT 저녁 봉** — 최초 구현에서 캡이 NXT 봉을 세어 정규장이 25봉으로 잘림 → 정규장 통과 봉만 카운트로 수정, 78봉 확인 (`fix de32bb1`).
2. **종가 동시호가 15:31 기록** — 토스 원천이 KRX 종가 체결(3.7M주)을 15:31 봉에 둠 → 15:30 리라벨 + 0거래량 채움봉 선제거로 kis 와 동일한 마지막 봉 확보.
3. **KV 공유 토큰 스토어 상호작용** — 틀린 secret 만으로는 폴백이 재현되지 않음: 공유 store 의 유효 토큰을 집어 정상 서빙(의도된 동작 — 발급 자체가 생략됨). 폴백 재현은 client_id 까지 바꿔야 함(위 AC-6).
4. **장전/휴장(당일 봉 없음)** — 코드 경로상 prevClose=최신 확정봉·volume 0·open/high/low undefined 로 디그레이드. 21시 실행이라 라이브 미관측 — **내일 장전(08:xx) 1회 확인 권장**.
5. **미국 티커** — 어댑터 레벨 동작(스모크 AAPL: 일봉 1990~·분봉·마스터 확인). 분봉 세션 필터는 국내 전용이라 미국 분봉은 KST 날짜 그룹핑 한계 문서화(현 소비처 없음).

## 리뷰(8각도 병렬 파인더) 반영 — 2026-07-02

구현 후 적대 리뷰에서 확정 3건 + 개선 10건 수정, 라이브 재검증 완료:

**확정 버그(수정 + 라이브 검증)**
1. 과거일 분봉 커서가 `before=15:31`(exclusive)이라 정작 15:31 종가 동시호가 봉이 잘림 → 15:32 anchor. 검증: 07-01 분봉 78봉·마지막 봉 vol=2,727,566(종가 체결) 확인.
2. 15:30 실체결 봉과 15:31 동시호가 봉 공존 시 dedupe 가 페이지 순서에 따라 한쪽 거래량을 비결정적으로 소실 → 정렬 후 결정론적 **병합**(`mergeClosingAuctionBars`, 거래량 합산·close=동시호가가) + 단위 테스트 3케이스.
3. 장전(NXT 프리마켓만 존재) 당일 분봉이 빈 배열 → KIS `includePast` 파리티로 직전 세션 재수집 폴백.
4. `fetchDailyChunked` 가 토스 모드에서 130일×24청크 중복 페치(3000일 시 12s 예산 초과) → 토스 커서 범위 페치 1회로 위임, 폴백 본문은 KIS 직행 경로(`fetchStockDailyChartKis`)로 청크당 토스 재시도 차단. 검증: 13개월 265봉 정상.

**개선(수정)**: tossGet 5xx/네트워크 transient 1회 재시도(KIS `withPageRetry` 관례) · 현재가 일봉 컨텍스트 30s 캐시(CHART 5/s 쿼터 보호) · 종목 마스터 single-flight(스냅샷 병렬 중복 콜 제거) · `MAX_RANGE_PAGES` 40→15(타임아웃 후 낭비 콜 차단) · chart W/M 첫 버킷 45일 패딩(부분 집계 왜곡 제거) · 토큰 폴링 250ms/4s(KV 왕복↓·발급 핑퐁↓) · `pickTossArray` 투기적 "첫 배열" 폴백 제거 · 중복 헬퍼 통합(`toNumber`·`delay` 기존 모듈 재사용) · `stock-master.ts`→`stockMaster.ts`(파일명 컨벤션) · `StockPriceWithShares` 를 types.ts 로 이동(kis↔toss 타입 순환 제거).

**수용(문서화, 코드 무변경)**
- 토스 행(hang) 장애 시 KIS 폴백 시작 전에 라우트 withTimeout 이 먼저 발화할 수 있음(폴백 총 지연 = 두 소스 합) — 토스 장애 시간대 한정 강등이며 데드라인 전파는 후속 과제.
- `X-Data-Source` 헤더는 토스 서빙 시에도 "kis"(라우트가 소스 미인지) — PRD §4 비범위 명시, 관측은 서버 `[marketdata]` warn 로그.
- `sector`/`foreignRatio`/`industryName` undefined·`isAdminItem` false 디그레이드(관리종목 배지 미표시 포함) — PRD §3-3·§8 명시. prod 채점·배지 신뢰가 필요한 시점 전에 재검토.
- `/api/stock/daily` 정렬: KIS 원 응답(내림차순)과 달리 토스는 오름차순 — 활성 클라이언트 소비자 없음(잠복) + mock 이 이미 오름차순이라 토스가 mock 계약과 정합. 소비자 생길 때 라우트 레벨 정렬 명시 권장.

## 비고

1. **KIS `inquire-price` 야간 500**: 21:4x KST에 순정 KIS 경로(토글 미설정 부팅)에서 3/3 연속 `Request failed with status code 500`. daily·chart·minute 등 다른 KIS TR 은 동시간 정상 → 본 브랜치 밖의 KIS측/시간대 이슈로 판정(간헐 5xx 전력 참조). 낮 시간 재확인 권장.
2. AC-3 의 "KIS 와 값 일치" 검증은 위 사유로 toss 단독 산식 검증 + 방향성으로 대체. **내일 장중 kis/toss price 나란히 1회 대조 권장** (예상 차이: toss=통합 실시간, kis=KRX — 값 자체는 다를 수 있음이 정상).
3. AC-4 는 "불일치 발견 시 §9 q1 판정" 경로가 발동된 케이스. 통합 시세는 버그가 아닌 데이터 정의 차이이며, prod 채점 cron 은 토글 미설정(kis)이라 현 스코프 영향 0. 상세는 PRD §9 q1 RESOLVED 항목.
