# QA — intraday-scalping-agent (decision-support 피벗)

- **slug**: `intraday-scalping-agent`
- **QA일**: 2026-06-28
- **QA**: QA 에이전트 + 적대적 리뷰 워크플로(framing·correctness·conventions/regression 3차원 + 건별 검증)
- **대상 브랜치**: `feature/intraday-scalping-agent`
- **판정**: ✅ **PASS** (must-fix 4건 적용 후. 원 판정 PASS-WITH-FOLLOWUPS)

> ⚠️ PRD가 §0에서 **AUTO-EDGE NO-GO → decision-support 피벗** 됐다. 원 §5 AC(자동 net 엣지)는 무효화됐고, 본 QA는 **decision-support 산출물(A 카드 / B 워치 / C Slack)** + 공유 파일 회귀를 검증한다.

---

## 1. 자동 게이트

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm run test` | ✅ **547 passed, 3 skipped**(라이브 백테스트 2 + 진단 1 — 게이트) |
| `npx eslint <diff>` | ✅ 0 issues |
| `npm run build` | ✅ Compiled successfully, 신규 라우트(`/api/stock/intraday-read`·`/api/cron/intraday-slack`·`/intraday`) 등록 |

## 2. 라우트 스모크 (로컬 dev)

| 검증 | 기대 | 실측 |
|---|---|---|
| `/api/stock/ai-analysis/providers`(로컬 게이트) | claude 가용 | ✅ `{available:["claude"]}` |
| `POST /intraday-read` 빈 body | 400 | ✅ 400 |
| `POST /intraday-read` bad provider | 400 | ✅ 400 |
| `GET /intraday` 페이지 | 200 | ✅ 200 |
| `GET /cron/intraday-slack` no-ticker | 400 | ✅ 400 |

## 3. 라이브 E2E (A read 파이프라인, 3종목)

분봉 페치 + 결정론 레벨 + 2-에이전트 서사가 **실제로 유용한 판단 근거 생성** 확인.

| 종목 | source | 판단 | 비고 |
|---|---|---|---|
| 005930 | intraday-fallback | HOLD | 판단가 JSON 파싱 실패 → 폴백(우아) |
| 006400 | intraday-cli ✅ | HOLD | "동의도 25%는 신뢰도 훼손, RRR 미정 → BUY 추적 불가" |
| 034020 | intraday-cli ✅ | MEDIUM HOLD | "박스 하단 79,300원 반등 초입, RRR 1.78 양호하나 동의도 60% 미달" |

- 3건 다 HOLD = 검증 결과(깨끗한 셋업 드묾)와 정합. 카드가 정직하게 "관망 + 이유" 표시.
- **발견**: 판단가(②) JSON 파싱이 ~1/3 실패(005930) → fail-soft 폴백은 동작하나 그 판단을 잃음. → **fix 적용**(1회 재시도, §5).

## 4. 적대적 코드 리뷰 — 확정 14건 (raw 25, 오탐 11 필터)

§0 framing 준수: ✅ **PASS** — 사용자 표면 카피에 추천/수익보장/자동집행 표현 없음(`INTRADAY_READ_COPY.disclaimer`="자동 수익 보장 X, 매매 판단·집행은 직접"). Vercel→503, paper/virtual only. (배치/톤 보강 2건은 §5에서 처리.)

| 심각도 | 위치 | 이슈 |
|---|---|---|
| MAJOR | intradayCli.ts:135-136 | tpPct/slPct `lastClose=0` 시 NaN/Infinity (빈 봉/KIS 장애) |
| MAJOR | slack.ts:34-37 | HOLD가 직전 목표/손절 물 때 Slack 미표시(정보 손실) |
| MINOR | IntradayReadCard 면책 배치 | 하단만 — §0 상시 노출 강화 필요 |
| MINOR | IntradayReadCard:84 | `text-text-default` 미정의 토큰(무스타일) |
| MINOR | agents.ts:77 JUDGE_SYSTEM | "결정을 내립니다" 자동 결정자 톤 → rationale로 노출 |
| MINOR | cron/intraday-slack:39 | AbortError를 generic 처리(관측성) |
| NIT ×8 | context/runTick/virtualExecution/paperTrading 등 | 공유 옵셔널 필드 추가 — **모두 회귀 안전 확인** |

## 5. 적용한 fix (this session)

| # | fix | 파일 |
|---|---|---|
| 1 | tpPct/slPct `lastClose>0` 가드 | intradayCli.ts |
| 2 | 판단가 JSON 파싱 실패 시 **1회 재시도**(~1/3 → ~1/9) | intradayCli.ts |
| 3 | `text-text-default` → `text-text-strong`(유효 토큰) | IntradayReadCard.tsx |
| 4 | 면책 **상단 상시 노출** 추가(§0 강화) | IntradayReadCard.tsx |
| 5 | HOLD-with-levels Slack 목표/손절 표시 | slack.ts |
| 6 | JUDGE_SYSTEM 톤 **참고·판단 보조**로 재프레이밍(§0) | agents.ts |
| 7 | cron AbortError 구분 + console.warn(관측성) | cron/intraday-slack/route.ts |

적용 후: typecheck ✅ · lint ✅ · **547 tests ✅** · build ✅.

## 6. 회귀 평가 — ✅ SAFE

공유 시seam 편집은 전부 **순수 가산·하위호환**:
- `buildContext(candles, profile?)`·`evaluateSignal`·`backtest(warmupBars?)` — profile 미주입 시 일봉 상수로 nullish 폴백 → **일봉 평가 비트 동일**(기존 18 엔진 테스트 그린).
- `PaperTradingDecision.targetPrice?`·`VirtualExecutionInput.forcedExit?`·`IntradayCliInput.forceAgents?` — 옵셔널, mock/existing-ai 미설정 → `resolveForcedExit` null 반환으로 mock/일봉 체결 경로 무변경.
- `runPaperTradingTick` cli-agent 분기는 `decisionProvider==="cli-agent"` 게이트 뒤 → 비-cli 경로 동일.

## 7. DEFER (후속)

- intradayCli structureBarrierAt dir=1 LONG-only — §0상 의도(SHORT enum 없음). 주석으로 가정 명시(Phase 3 SHORT 시 enum·프롬프트·재검증 동반).
- runTick `forcedExit` 선언-후-조건부할당 타입 스멜(런타임 안전, typecheck 통과) — 비차단.
- 판단가 신뢰도 추가 개선(모델 상향 INTRADAY_JUDGE_MODEL=sonnet, 또는 프롬프트 JSON 강화) — 재시도로 1차 완화됨.

## 8. 비고

- QA 중 `npm run build`를 `next dev` 실행 중 돌려 dev 서버 `.next` 클로버 → **dev 서버 재시작 필요**(`npm run dev`). fix들은 게이트로 검증됨, 라이브 재확인은 재시작 후 가능.
- 자동 게이트·진단 하네스(`__live__/*.test.ts`)는 QA 회귀 자산으로 보존(KIS 없이 오프라인 스윕 가능).

---

## 9. 추가 QA — 세션 2 (2026-06-28, PR #170): 봇 연동 + nav + 시황 스케줄러

PR #170 으로 묶으며 추가된 커밋 3종을 검증한다. 라이브(KIS/Slack/스케줄러 발화)는 **일요일이라 게이트로 차단** → 자동 게이트 + 결정론 로직 검증 중심, 라이브 E2E 는 §10 후속.

### 9.1 자동 게이트 (전체 재실행)

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm run test` | ✅ **547 passed, 3 skipped**(라이브 게이트) |
| `eslint`(세션2 변경 9파일) | ✅ 0 |
| `npm run build` | ✅ Compiled — `/intraday` + 신규 API 라우트 등록 |

### 9.2 봇용 read 엔드포인트 (`GET /api/cron/intraday-read`)

| 검증 | 기대 | 실측 |
|---|---|---|
| 게이트 예외 경로 | proxy `isPublicPath('/api/cron/*')` 통과 | ✅ (proxy.ts 정합) |
| Vercel/KIS 미설정 | 503 `local-cli-only` | ✅ (코드 경로) |
| no-ticker | 400 | ✅ |
| 정상 | `IntradayReadResponse` JSON 반환(Slack 안 쏨) | ✅ `readIntraday` 재사용 |

→ `intraday-slack`(webhook 푸시)과 분리 — 봇이 `thread_ts` 직접 관리하도록 read 원본만 반환.

### 9.3 nav (커서·위치·prod 숨김)

| 검증 | 기대 | 실측 |
|---|---|---|
| 후보 칩 hover 커서 | pointer | ✅ `cursor-pointer` 추가 |
| "단타 워치" 메뉴 위치 | 마이페이지 바로 위 | ✅ NAV_ITEMS 순서 |
| Vercel 배포 시 메뉴 | 숨김 | ✅ `getVisibleNavItems()` localOnly 필터(`NEXT_PUBLIC_VERCEL_ENV`) |
| 로컬 dev | 노출 | ✅ |

### 9.4 시황 자동 갱신 스케줄러 (`instrumentation.ts` → `refreshScheduler`)

| 검증 | 기대 | 실측 |
|---|---|---|
| 라우트 리팩터(생성 코어 추출) | 동작·헤더 동일 | ✅ typecheck + build, `refreshMarketAnalysis` 로 위임 |
| 게이트(플래그 미설정) | no-op | ✅ `MARKET_REFRESH_SELF_SCHEDULE!=="1"` early-return |
| Vercel | no-op | ✅ `isVercelEnv()` early-return |
| 시장시간 판정 | 평일 09:00~15:30 KST | ✅ **경계 6/6 통과**(월10시·09시·15:30 O / 16시·08:30·주말 X) |
| 타이머 | 프로세스 종료 비차단 | ✅ `timer.unref()` |

### 9.5 회귀 — ✅ SAFE

- `market/analysis` 라우트는 생성 코어를 `refreshMarketAnalysis` 로 추출만 — 응답 헤더(`X-CLI`/`X-Pruned`/`X-Cache`)·degrade 저장제외·fallback 분기 동일(typecheck 통과).
- nav 변경은 순수 가산(`localOnly?` 옵셔널 + 필터 헬퍼) — 기존 메뉴 동작 불변.

## 10. 후속 (라이브, 다음 평일 장중)

- 단타 read E2E(판단가 재시도 효과) + 봇 "단타 봐줘"→스레드 주기 게시 + "단타 그만" 종료
- 시황 스케줄러 발화 로그(`[market/scheduler] 자동 갱신 …`) + Supabase 적립 확인
- (운영) 호스트 `.env.local`에 `MARKET_REFRESH_SELF_SCHEDULE=1` 적용 후 dev 재시작

**판정: ✅ PASS** (자동 게이트 + 결정론 로직 전부 통과. 라이브 E2E 는 일요일 차단 → 다음 평일 §10.)
