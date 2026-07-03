# QA — intraday-warnings (단타 지면 매수 유의사항 배선)

- 실행: 2026-07-03 12:40~12:50 KST (장중, 금요일) — QA 역할
- 환경: 로컬 dev (TOSS 키 설정) + 유닛 테스트(vitest)
- 대상: `feature/intraday-warnings` (PRD → 배치 인프라 → 틱 주입 → 워치/후보 칩)

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 키 없음 | 유닛: `isTossConfigured=false` 로 배치·단건 호출 | 빈 맵/빈 배열 + 토스 무호출 | `fetchActiveWarningsBatch → {}`, tossGet 0회 | ✅ |
| AC-2 무경보 | `formatIntradayContext` warnings=[] | `[매수 유의]` 줄 없음 | 유닛 통과(무주입) | ✅ |
| AC-3 지정 종목 | 배치 BFF `?tickers=001210,002990,005930,111710` (dev 실서버) | 지정 종목만 경보, 무경보는 [] | 001210·002990=INVESTMENT_WARNING, 111710=OVERHEATED, 005930=[] | ✅ |
| AC-3′ 프롬프트 | 유닛: warnings=[OVERHEATED] | `[매수 유의] … 단기과열` 줄 | 통과 | ✅ |
| AC-4 스킵 틱 미조회 | 코드: `decideIntradayWithCli` 는 pre-gate 통과(LLM 호출) 후에만 `fetchActiveWarnings` | 변화없음 스킵 틱은 미페치 | early-return 이 fetch 앞 — 코드 검증 + paperTrading 69테스트 무회귀 | ✅ |
| AC-5 배치 캡 | 코드: BFF `MAX_TICKERS=30` 초과 시 `console.warn` 후 절단 | 무음 절단 금지 | 로그 경로 확인 | ✅ |
| AC-6 동시성 | 유닛: 12티커·concurrency=3 peak 측정 | 최대 3 동시, 중복=캐시 1콜 | peak ≤ 3, 중복·소문자 정규화 1콜 | ✅ |
| AC-7 실패 | 유닛: batch never-throw → 빈 맵. 형식 밖 티커만이면 200+빈 맵 | fail-soft | `?tickers=..,--` → 200 | ✅ |

## 라운드트립 (실서버, 장중)

- 배치 `?tickers=001210,002990,005930,111710` → 200, `X-Data-Source: toss`, 4종목 맵 정상.
- 회귀: vitest **742 passed / 0 failed**(신규 9: 배치 4 + 프롬프트 4 + 헤더 리팩터 무회귀), `tsc` 클린,
  `next build` 성공, eslint 클린. paperTrading 스위트 69 통과(틱 fetch 추가 무회귀).

## 커버리지 노트

- **틱 주입 실분석 미실시** — cli-agent 단타 판단은 로컬 CLI 실행이라 QA 에선 유닛(프롬프트 줄)+
  코드 경로로 갈음. 실동작은 단타 세션 실행 시 `[intraday]` 판단의 컨텍스트에 `[매수 유의]` 줄로 확인.
- **칩 시각 확인 미실시** — 브라우저 익스텐션 미연결. `StockWarningBadges`(공유, `badge-*` 재사용)는
  조건부 렌더라 리스크 낮음. 확인 경로: `/stock`(단타 워치) 화면에서 001210/002990 을 워치에 추가 →
  종목명 옆 "투자경고" 칩. 추천 후보(거래량 상위)에 지정 종목이 뜨면 칩 병기. **사용자 1회 확인 권장.**
- StockHeader 는 인라인 칩 → 공유 컴포넌트로 리팩터(동작 동일, #204 QA 로 커버된 표시 로직 재사용).

## 적대 리뷰 반영 (2026-07-03, reviewer — 블로킹 정확성 버그 0건)

- **F-2 반영**: 배치 캡 30→50. 최대 가시 union(저장워치 20 + 후보 14+14 ≈ 48)이 30 을 넘으면
  뒤쪽 거래량 후보(경보 밀집 그룹)가 먼저 잘리던 문제 해소. 초과분은 여전히 로그 후 절단.
- **F-1 반영**: 틱 pre-LLM warnings 페치를 `abortSignal.aborted` 가드로 감쌈 — 이미 중단된 틱은
  조회 생략(불필요 대기 제거). 조회 중 중단은 fetch 가 바운드·never-throw 라 무해.
- **F-3 반영**: `fetchActiveWarningsBatch` 주석의 "5/s 준수" 를 정확히 수정(동시성은 in-flight
  버스트 폭 제한, 실제 rate 는 tossGet 429 백오프 + 60s 캐시가 담당).
- **F-4 보류(미발현)**: 소문자 알파 티커 키 불일치 — 한국 6자리 + 대문자 US 도메인에선 미발현.
  공유 fn 재사용 시 주의(HANDOFF 메모).
- **useMemo→refetch 무해 확인**: warningTickers 가 매 렌더 새 배열이어도 queryKey 가
  `normalizeTickers`(정렬 join 문자열) + RQ value-hash 라 내용 동일 시 재요청 없음.
