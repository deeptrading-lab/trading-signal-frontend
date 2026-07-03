# QA — intraday-paper-watch

- 실행: 2026-07-03 03:17~03:30 KST(장외), 로컬 dev(:3200 — :3000 미기동이라 QA 가 직접 기동 후 종료) + vitest v3.2.4 + Supabase REST 교차 확인
- 대상: PR #203 `feature/intraday-paper-watch` (HEAD 0efb9e8)
- 범위: 경량 반복 플로우(PRD 없음) — 단타워치(/intraday) 종목 선택 → 모의 투자금·판단 주기(1·2·3·5·10·15분) 설정 → cli-agent 모의투자 세션 생성 → 장중 자동 틱이 주기마다 AI 판단·가상 체결(비용 반영) → 체결·손익·판단 메모 Supabase 영구 축적. 세션 상세(/dashboard/paper-trading/[id])가 전체 정보 페이지.

## 기능 요약

- 세션 생성 API 가 `cli-agent` 를 개방하고(기존 `mock` 무회귀), 같은 종목 running 세션 재요청은 멱등으로 흡수.
- 판단 주기 → 분봉 단위 자동 파생(`deriveIntradayTimeframe`), env 는 실험용 오버라이드.
- 가상 체결에 거래 비용 모델(수수료·제세금·슬리피지) + 매도 실현손익(realizedPnl) 기록.
- AI 판단가(JSON)의 분할 비율 → 목표 비중 매핑(BUY 캡·역전 방지, SELL<100%→REDUCE, HOLD 무주문).
- 세션 단위 tickChain 직렬화(동시 틱 레이스 차단) + Supabase write-through/부팅 hydrate.
- 장중 자동 틱 훅(60초 폴링, 09:00~15:30 + 마감 유예 15:40, 워치 등재 종목의 running 세션만).

## AC 검증 결과

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 세션 생성 개방 | POST `/api/paper-trading/sessions` body {name:"QA 단타", 005930, initialCash:100만, cli-agent, tickIntervalMinutes:2} | 200 + cli-agent + 2분 + ticks 1개 | 200, id `d9bb4b99`, decisionProvider="cli-agent", tickIntervalMinutes=2, ticks 1개(첫 틱 포함) | ✅ |
| AC-1 주기 422 | 같은 body 에 tickIntervalMinutes:7 | 422 + 판단 주기 안내 | 422 `"판단 주기는 1·2·3·5·10·15분 중에서 선택해 주세요."` | ✅ |
| AC-1 provider 422 | decisionProvider:"existing-ai" | 422 | 422 `"판단 방식은 MVP(mock) 또는 장중 단타 에이전트(cli-agent)만 사용할 수 있어요. …"` | ✅ |
| AC-1 mock 무회귀 | decisionProvider:"mock" + tickIntervalMinutes:2 요청 | 요청과 무관하게 30분 유지 | 200, id `b81a975f`, provider="mock", tickIntervalMinutes=**30** | ✅ |
| AC-2 생성 멱등 | AC-1 성공 직후 같은 body 재요청 → GET 목록 | 같은 session.id, 목록에 1개 | 재요청 200 + 같은 id `d9bb4b99` 반환, 목록에 "QA 단타" 1개(qaCount=1) | ✅ |
| AC-3 주기→분봉 파생 | `npx vitest run lib/server/paperTrading/__tests__/validateCreateSession.test.ts` | 매핑 1→1,2→1,3→3,5→5,10→5,15→15 + env 오버라이드 통과 | 8 tests passed. 테스트 본문에서 해당 매핑값 + `INTRADAY_TIMEFRAME=3 → 15분도 3` 단언 직접 확인 | ✅ |
| AC-4 거래 비용·실현손익 | `npx vitest run …/virtualExecution.test.ts` + ad-hoc tsx 실측 | 슬리피지 체결가·costKrw 현금 차감·매도 realizedPnl·costs 미주입 무회귀·빈 allocations+forcedExit 통과 | 14 tests passed(슬리피지 99,900원·costKrw 1,499·현금 498,001·costs 미주입 0·빈 allocations 무주문·forcedExit 발동). **매도 realizedPnl 은 테스트 파일에 직접 단언이 없어 ad-hoc tsx 로 보완 실측**: 손실 청산 −1,999 / 이익 청산 +48,001 / costs 미주입 +50,000 / 매수 주문 미기록(undefined) — 4케이스 전부 기대치 일치 | ✅ |
| AC-5 AI 분할 비율 매핑 | `npx vitest run …/decisionProviders/__tests__/intradayCli.test.ts` | BUY 캡·현 비중 미만 축소 금지(여력 없으면 무주문)·SELL<100%→REDUCE·HOLD 무주문 통과 | 25 tests passed — "BUY — AI 목표 비중을 maxPositionPct 로 캡", "BUY — 기존 비중보다 낮춰 잡지 않고 여력 없으면 주문도 내지 않는다", "SELL — 분할 청산 50% → REDUCE", "HOLD — 주문 없음(stale 비중 되먹임 매도 누수 방지)" 케이스 명시 확인 | ✅ |
| AC-6 동시성·멱등 틱 | `npx vitest run …/runTick.test.ts` + `sessionStore.ts` 코드 확인 | 전부 통과 + 세션 단위 tickChain 직렬화 존재 | 10 tests passed(같은 창 중복 틱 미생성·cli-agent 벽시계 창 고정·mock 기존 동작). `sessionStore.ts:38` `tickChain?: Promise<unknown>` + `:232-234` 앞 틱 완료 후 다음 호출이 창 판정(체이닝) 확인 | ✅ |
| AC-7 영속화 | dev 로그 paper-persist 검사 + Supabase REST `paper_trading_sessions?select=id,status&id=eq.<id>` | 경고 0건 + 1행 존재 | 전체 트래픽 후 dev 로그 paper-persist 경고 **0건**. REST 조회 `[{"id":"d9bb4b99-…","status":"running"}]` 1행. 추가 증빙: PATCH completed 후 재조회 시 status="completed" write-through 반영, 서버 부팅 시 과거 세션("영속성 검증") hydrate 복원 관찰 | ✅ |
| AC-8 자동 틱 게이트 | 코드·단위 근거 | 09:00~15:30 / 유예 ~15:40 + 대상 = 워치 등재 종목의 running 세션 | `lib/utils/kstMarketHours.ts` — isKstMarketHours(평일 540~930분=09:00~15:30)·isKstMarketHoursWithCloseGrace(~940분=15:40). `useIntradayPaperWatch.ts:72-81` runningSessionIds = `status==="running" && watchTickers.includes(ticker)` 필터. `IntradayWatchWorkspace.tsx:59` 가 이를 `useIntradayPaperAutoTick`(60초 폴링·busy 가드·unmount 정지)에 배선 | ✅ |
| AC-9 단타워치 UI | GET `/intraday` (curl SSR) | 200 + 문구 4종 | 200. "단타 워치"·"검색해 워치에 추가"·"수급 상위"·"거래량 상위" 각 1회 이상 존재 | ✅ |
| AC-10 세션 상세 | GET `/dashboard/paper-trading/d9bb4b99-…` | 200 + "단타 워치로"·"체결 내역"·"판단 타임라인" 존재 | 200. 단, SSR HTML 은 스켈레톤(`card skeleton` aria-busy — 상세는 TanStack Query 클라이언트 fetch 구조, 레포 표준). 보완 증빙 3종으로 확인: ① 라우트 클라이언트 번들(`app_(main)_dashboard_paper-trading_[sessionId]_page…js` 등)에 3개 문구 전부 존재 ② 상세 API `/api/paper-trading/sessions/<id>` 200 + session/ticks(1)/equityCurve(2) 반환 ③ `PaperTradingDetailContainer.tsx` 성공 분기가 `PAPER_TRADING_BACK_TO_WATCH`("단타 워치로")·"체결 내역"·"판단 타임라인" 라벨 렌더 | ✅ (비고) |
| AC-11 거래량 순위 BFF | GET `/api/market/volume-rank` | 200 + X-Data-Source(kis\|mock\|mock-timeout) + ticker 전부 `^\d{6}$` + name 에 ETN/ETF/KODEX/TIGER 없음 | 200, `x-data-source: kis`(장외 심야에도 실데이터). rows 8건 — badTicker 0건·badName 0건 (샘플: 001210 금호전기·005930 삼성전자·006340 대원전선) | ✅ |
| AC-12 회귀 | `npx vitest run` + `npx tsc --noEmit` | 전체 통과(≈711) + 0 에러 | **711 passed | 3 skipped**(스킵 3건은 `__live__` 백테스트 — 의도적 skip), 85 files. tsc exit 0 | ✅ |
| AC-13 장중 라이브 E2E | 실 LLM 판단·분할 체결·15:20 청산 | — | **PENDING(장중 확인 예정)** — QA 실행 시각 03시(장외)라 실행 불가 | ⏸ |

## 에지 케이스

| 케이스 | 실측 | 판정 |
|---|---|---|
| 잘못된 주기(7분) | 422 + 허용 목록 한글 안내 | ✅ |
| 미개방 provider(existing-ai) | 422 + 한글 안내(무단 mock 폴백 없음) | ✅ |
| 멱등 재클릭(타임아웃 후 재요청 시나리오) | 새 세션 미생성, 같은 id 반환 — 목록 오염 없음 | ✅ |
| mock 생성 시 주기 요청 무시 | 30분 유지(무회귀) | ✅ |
| 장외 시간 첫 틱(03시) | cli-agent 첫 틱이 결정론 폴백으로 HOLD·주문 0건(`"결정론 폴백 — 명확한 셋업 없음, 관망."`, confidence LOW) — CLI 실패 시 폴백 체인이 실동작, 세션 생성은 정상 완료(79s) | ✅ 관찰 |
| 공통 무회귀(보조) | `npx eslint .` 0 에러 / BFF 원칙 `git grep -nE "http://127\.0\.0\.1" -- app/`(route handler 제외) 0건 / 사용자 노출 문구 한글(422 안내·라벨 lib/copy 경유) | ✅ |

## 미검증 항목

- **AC-13 장중 라이브 E2E — PENDING**: 실 LLM 판단(CLI 스폰) → 분할 체결 → 15:20 전량 청산은 정규장(평일 09:00~15:30)에서만 재현 가능. QA 실행 시각이 03시(장외)라 코드·단위·폴백 경로까지만 검증했다. PR 본문 "다음 작업"에도 장중 라이브 E2E 후 머지로 명시돼 있음.
- 자동 틱의 **런타임** 레이스 재현은 AC-6 명시대로 생략(코드의 tickChain 직렬화 + runTick 창 dedup 단위 테스트로 갈음).

## 스모크 세션 정리

- `d9bb4b99`(QA 단타, cli-agent)·`b81a975f`(QA mock 무회귀, mock) 모두 PATCH `{"status":"completed"}` → 200, Supabase 양행 status="completed" 반영 확인.
- Supabase 행 자체는 잔존(원장 성격상 무해 — 삭제 API 미사용).

## 실행 환경

- 로컬 dev: `npx next dev -p 3200`(Next.js 16.2.6 Turbopack, `.env.local` 로드) — :3000 이 미기동 상태여서 QA 가 직접 기동, 검증 종료 후 종료 확인(000).
- 테스트: vitest v3.2.4, `npx tsc --noEmit`, `npx eslint .`
- 시각: 2026-07-03 03:17~03:30 KST(장외·평일 새벽) — KIS volume-rank 는 실데이터 응답.
- Supabase: `.env.local` 의 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 로 REST 교차 조회(키 비노출, id·status 만 출력).

## 판정

**qa-passed** — AC-13(장중 전용, PENDING) 제외 전 항목 통과. 비고: AC-4 의 매도 realizedPnl 은 vitest 파일에 직접 단언이 없어 ad-hoc 실측으로 보완(후속에서 테스트 단언 추가 권장), AC-10 문구는 SSR HTML 이 아닌 클라이언트 렌더(레포 표준 구조)로 번들·API·코드 3중 증빙.
