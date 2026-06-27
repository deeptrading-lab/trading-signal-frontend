# QA 리포트 — ai-analysis-concurrency

- 대상 PR: #163 (`feature/ai-analysis-concurrency`)
- 제목: feat(ai-analysis): AI 종목분석 동시 3건 지원 — 종목별 슬롯 + 탭 전환
- 성격: **PRD 없는 경량 plan-mode 반복 작업**. 계획서 `~/.claude/plans/linked-juggling-thunder.md` + PR 본문 + 위임 AC 14개를 수용 기준으로 QA.
- 변경 파일 (7, +910/-390):
  - `hooks/stock/aiAnalysisProvider.tsx` (+709/-318) — 슬롯 맵 + `useReducer`, 종목별 `AbortController`, 동시성 게이트, `tabs`/`switchTab`/`isTickerRunning`/`dismissSlot`/`finishedAt`
  - `components/stock/AIAnalysisPanel.tsx` (+128/-22) — 헤더 탭 스트립 + 재열기 컴팩트 핀/상세 트레이 + 상한 안내 배너 + PM 에러 카드
  - `components/stock/GlobalAIAnalysis.tsx` (+13/-42) — 활성 슬롯 투영 + `useQueryStockNames` 탭 종목명 주입
  - `components/analyze/AIDecisionCardMenu.tsx`·`ReanalyzeButton.tsx` (각 +4/-3) — `isTickerRunning(ticker)` + `openFor(ticker, name)`
  - `app/api/stock/ai-analysis/route.ts` (+43/-2) — PM JSON 파싱 견고화 + 파싱/verdict 실패 시 에러 표면화
  - `lib/copy/stock/aiAnalysis.ts` (+9) — limit/reopen/dismissTab 카피
- 검증 환경: 로컬 macOS, Node. 자동 명령(type/lint/build/test/parse) 전량 실측. 동시 3건 런타임은 **로컬 `.next/dev/logs/next-development.log` 실측 로그**로 부분 증빙(AC1/12), 나머지 브라우저 상호작용은 코드 레벨 검증 + 수동 재현 절차 명시.
- **브라우저 라운드트립 갈음 사유**: 대상 라우트 `/api/stock/ai-analysis` 는 SSE 스트림 + 로컬 claude/codex CLI + KIS 설정 의존이며 종목당 8~10분 소요(분석 1회 ≈ 502~568s, 로그 실측). 헤드리스 환경에서 신규 분석을 트리거할 수 없어 **AC1/12 는 직전 dev 세션의 실측 로그**, AC2~9 의 브라우저 상호작용은 **provider/panel 코드 레벨 정적 검증 + 수동 재현 절차**로 판정한다. 자동 항목(type/lint/build/test/parse)은 실제 명령 출력으로 증빙.

## AC 별 검증

| # | AC | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| 1 | 동시 3건 독립 진행(A·B·C) | dev 로그 `.next/dev/logs/next-development.log` 에서 동시 실행 그룹 grep | 3개 ticker 가 각자 progress/report/final/done 수신, 서로 막지 않음 | **2개 배치 실측**: ① `000270`+`024110`+`000660`+`009830` 인터리브(13:21~13:35), ② `005380`+`402340`+`000660` 3-way(13:58~14:06). 각 ticker 가 자기 12-에이전트 진행을 독립 완주, `전체 완료 total=502.1/550.1/568.8s` **3건 분리** 기록 | **PASS(자동·로그)** |
| 2 | 4번째 새 종목 차단 + "최대 3개" 배너 | `start`/`run`/`resume` 진입 시 `blockedByLimit(target)` | 대상 제외 running ≥ 3 → `limitNotice` dispatch 후 차단, 배너 노출 | `runningCountExcluding(slots, target) >= MAX_CONCURRENT_ANALYSES(3)` → `COPY.limit.atCapacity(3)` dispatch + `return true`(provider L615-622). 패널 L507-511 가 `limitNotice` 배너 렌더. 자기 종목 재분석은 제외 카운트라 통과 | PASS(코드)·수동필요(시각) |
| 3 | 헤더 탭 스트립(2건+) 종목별 독립 표시 | `tabs.length > 1` 시 탭 칩, `switchTab` 으로 전환 | 각 탭이 자기 종목 상태(에이전트/토론/결론) 독립 표시, 활성 강조 | 패널 L427-456: `tabs.length > 1` 가드, `activeTab = t.ticker === ticker` 강조(`bg-blue-600`), `onClick={switchTab(t.ticker)}`, running 탭에 `doneCount/agentCount`+스피너. 본문은 `viewTicker` 활성 슬롯 투영(provider L747-766)이라 탭별 정확 | PASS(코드)·수동필요(시각) |
| 4 | 접힘 = 컴팩트 핀 + hover 상세 트레이 | 패널 닫힌 상태(`!isOpen && tabs.length>0`) | 기본 핀(아이콘+"AI 종합 분석" 세로라벨+개수), hover 시 종목별 상세 카드 | 패널 L252-264 컴팩트 핀: running 시 `Loader2` 스핀/else `Sparkles`, `AI<br/>종합<br/>분석` 3행 세로라벨, `tabs.length` 배지, `group-hover:hidden`. L267-324 상세 트레이 `group-hover:block` — 종목별 행(종목명+진행수+스피너+dismiss ×) | PASS(코드)·수동필요(시각) |
| 5 | 탭·핀·트레이 라벨 = 종목명(코드 폴백) | `GlobalAIAnalysis` 의 `useQueryStockNames` 주입 + `t.name ?? t.ticker` | 종목명 우선, 미해석 시 슬롯 name → ticker 폴백 | `GlobalAIAnalysis` L22-24: `useQueryStockNames(tabs.map(ticker))` → `name: names[t.ticker] ?? t.name`. 패널 탭(L448)·트레이 행(L298)·aria(L290/315) 전부 `t.name ?? t.ticker`. analyze 진입은 `openFor(ticker, name)`(카드 2곳)로 name 캐시 | PASS(코드)·수동필요(시각) |
| 6 | stop 은 해당 종목만 중지 | `stop()` → `dispatch halt(viewTicker)` + 그 컨트롤러만 abort | 활성 뷰 슬롯만 running→error, 나머지 계속 | provider L722-727: `target = stateRef.current.viewTicker` 단일 대상, `dispatch halt` + `abortControllersRef.current[target]?.abort()`. reducer `halt`(L369-390)는 해당 슬롯만 변이, 다른 슬롯·컨트롤러 무관 | PASS(코드)·수동필요(시각) |
| 7 | 완료 시 해당 탭만 스피너 해제 + /analyze 캐시 무효화 | done 이벤트 → reducer `isRunning:false` + 래퍼 invalidate | 그 슬롯만 종료 표시, 결론/목록 캐시 무효화 | `reduceSlotEvent` done(L251-253) 해당 슬롯 `isRunning:false`. `handleStreamEvent`(L575-580) done 시 `invalidateQueries(aiDecisions)` + `aiDecision(ticker)` — **이벤트 자신의 ticker** 사용(과거 `analyzingTickerRef` 오용 수정). 서버는 final 직후 upsert await → done 시점 저장 완료 | PASS(코드)·수동필요(시각) |
| 8 | 재열기 트레이 dismiss × → 완료 슬롯 제거(뷰 재지정) | 트레이 행 `×` → `dismissSlot(ticker)` | 완료 슬롯 제거, viewTicker 재지정 정상 | 패널 L311-320: 비실행 슬롯에만 `×`, `dismissSlot(t.ticker)`. provider L739-743: 컨트롤러 abort+delete + `dispatch removeSlot`. reducer `removeSlot`(L404-415): 제거 후 `viewTicker===대상`이면 `deriveAnalyzingTicker(rest) ?? Object.keys(rest)[0] ?? null`, 없으면 `isOpen:false` | PASS(코드)·수동필요(시각) |
| 9 | 재분석 프롬프트 = 마지막 완료 30분 경과 시에만 | `openFor` 의 stale 게이트 + reducer done 시 finishedAt 기록 | 신선(<30분)하면 미노출, 30분 경과 시에만 노출 | provider L684-691: `lastAnalyzedAt = slot.finishedAt ?? slot.startedAt`, `stale = lastAnalyzedAt>0 && Date.now()-lastAnalyzedAt >= REANALYSIS_PROMPT_MIN_AGE_MS(30*60*1000)`, prompt = `!!slot && !allPending && !isRunning && stale`. reducer event done(L302) `finishedAt: action.now` 기록 | PASS(코드)·수동필요(시각) |
| 10 | PM 결론 JSON 파싱 견고화 | 대표 7 실패 패턴 신/구 파서 비교(scratchpad node 스크립트, route.ts 로직 복제) | 신 파서 통과율 ≥ 구 파서, prose/trailing comma/stray brace 처리 | **구 4/7 → 신 7/7**(아래 표). 신규 통과: prose 뒤+stray brace, prose 앞뒤+stray brace, trailing comma. `extractBalancedObject`(문자열 내부 brace 무시) + `stripTrailingCommas` variant 가 route.ts L104-149 와 동일 | **PASS(자동)** |
| 11 | PM 파싱/verdict 실패 → 재시도 카드 | route.ts portfolio_manager 분기 실패 경로 + 패널 PM 렌더 | 무표시 블랙홀 제거, `progress error` + 재시도 카드 | route.ts: 파싱 실패(L764-769)·verdict 무효(L757-762) **둘 다** `send({type:"report"})`(원문 보존) + `send({type:"progress", agent, status:"error"})` + `return "error"`. 패널 L707-725: `pmAgent.status==="error"` → "최종 결론 도출 실패" + `resume("portfolio_manager")` 재시도 버튼 | **PASS(자동·코드)** |
| 12 | 동시 실행 시 PM 종목 간 미혼입 | 서버 지역 스코프 + CLI 호출별 격리 + dev 로그 ticker 분리 | 요청별 격리, 각 PM 자기 종목 결과 | **코드**: route.ts `state`/`runId`/`previousDecisionContext`/`runOneAgent`/`send`/`combinedSignal` 전부 POST 핸들러 지역 스코프(L432·442·451·504·516·624). `agentCli.ts`·`claudeAgent.ts` 모듈 top-level `let/var` **0건**, 호출마다 `execFile`/`spawn` 새 자식 + stdin 전달(공유 임시파일 0, codex `--ephemeral --ignore-user-config`). **로그**: 직전 3-way 런 모든 라인 ticker-prefix(`[AIAnalysis] 005380/402340/000660 …`), 각 PM `len=1731/1728/1503` 독립 완료, **파싱 실패·verdict 무효 0건** | **PASS(자동·코드+로그)** |
| 13 | 타입·린트·빌드·테스트 통과 | `npm run typecheck/lint/build/test` | 전부 exit 0 | typecheck exit 0(무출력), lint exit 0(경고/에러 0), build **exit 0**(✓ Compiled 3.1s, 47/47 정적 생성), test **502 passed / 1 skipped(live backtest)** | **PASS(자동)** |
| 14 | 로컬 dev 전용(Vercel 503) | route.ts 진입 가드 | `isVercelEnv()` 시 503 | route.ts L398-403: `if (isVercelEnv()) return NextResponse.json({error:"…로컬 환경(next dev)에서만…"}, {status:503})` | **PASS(자동·코드)** |

### AC10 — parseLooseJson 신/구 파서 비교(scratchpad 실측)

route.ts L104-149 로직을 복제한 비교 스크립트(`scratchpad/parseCompare.mjs`)로 대표 7 패턴을 `verdict` 화이트리스트 통과 기준 측정:

```
패턴                                 구파서 신파서
--------------------------------------------------
1. clean JSON                      PASS  PASS
2. prose 앞                         PASS  PASS
3. prose 뒤 + stray brace           FAIL  PASS   ← 신규 처리
4. prose 앞뒤 + stray brace          FAIL  PASS   ← 신규 처리
5. trailing comma                  FAIL  PASS   ← 신규 처리
6. ```json 펜스                      PASS  PASS
7. 문자열 내부 중괄호                      PASS  PASS
--------------------------------------------------
합계                                 4/7   7/7
```

- 신 파서 회복분: `extractBalancedObject` 가 첫 완결 `{...}` 만 잘라 뒤따르는 prose·stray brace 를 배제(케이스 3·4), `stripTrailingCommas` variant 가 `,}`·`,]` 제거(케이스 5). 문자열 리터럴 내부 `{`/`}` 는 `inStr` 가드로 깊이 계산에서 제외(케이스 7).
- **회귀 없음**: 구 파서가 통과하던 1·2·6·7 은 신 파서도 전부 통과.

## 공통 AC 요약

- **typecheck / lint / build / test**: 전부 exit 0(실측 출력 증빙). 테스트 502 passed / 1 skipped.
- **BFF 원칙 무회귀**: 변경 컴포넌트(`aiAnalysisProvider`·`AIAnalysisPanel`·`GlobalAIAnalysis`·analyze 2곳) 클라이언트 `fetch(` 직접 호출 **0건**(`fetchAIAnalysisStream` 래퍼·`useQuery*`·`invalidateQueries` 만). `git grep http://127.0.0.1 -- app/` 의 2건은 `app/api/workbench/_adapters/fastapi.ts` route handler `FASTAPI_BASE_URL` fallback(문서화된 예외) — 본 PR 무관.
- **한글 톤 무회귀**: 신규 노출 문구 전부 한글 — `동시 분석은 최대 3개까지예요. 진행 중인 분석이 끝나면 다시 시도해 주세요.`(limit), `{name} 분석 닫기`(dismiss aria), `{name} AI 분석 패널 열기`(reopen aria), 세로라벨 `AI 종합 분석`, per-ticker 배지 `분석 중…`. ticker/숫자 외 영문 노출 0건.
- **반응형 무회귀**: `window.innerWidth` 직접 분기 — 핵심 변경 3파일 **0건**(`AIDecisionCardMenu` 의 `window.innerWidth` 1건은 portal 드롭다운 **좌표 측정** 용도로 본 PR 이전부터 존재, breakpoint 로직 아님). 탭 스트립·트레이는 Tailwind 반응형 클래스(`md:`·`overflow-x-auto scrollbar-hide-mobile`) 사용.
- **접근성**: 핀 `aria-label="AI 분석 N건 열기"`, 트레이 `role="group"`+`aria-label`, 행 버튼 `aria-label=reopen(name)`, dismiss `aria-label=dismissTab(name)`, 탭 `aria-current`, PM 에러 재시도 버튼 텍스트 라벨 동반. analyze 카드 메뉴 `aria-haspopup`/`aria-expanded` 유지. 신규 effect 는 cleanup(언마운트 전 컨트롤러 abort) 동반.

## 라운드트립 시나리오 (분석 시작 → 탭 전환 → stop → 완료 → 재열기 → dismiss)

> BE 라이브 + 로컬 CLI 환경 가정. 본 QA 환경에서 신규 분석 트리거 불가 → **수동 재현 절차**로 문서화. (AC1/12 의 동시·격리는 직전 dev 로그로 실측 갈음.)

| 단계 | 절차 | 기대 결과 |
|---|---|---|
| 1. 시작 A | 종목 A 상세 → "AI 종합분석" → 공급자 선택 → 슬라이드 시작 | A 슬롯 running, 패널 열림, 에이전트 진행바 가동 |
| 2. 시작 B·C | navbar 로 B·C 이동 후 각각 분석 시작 | A·B·C 동시 running. 접힌 핀 개수 배지 3, hover 트레이 3행(각 스피너+진행수) |
| 3. 탭 전환 | 패널 열고 헤더 탭 스트립에서 A↔B↔C 전환 | 각 탭이 자기 종목 카드/토론/결론 독립 표시. 한 탭 보는 동안 다른 탭 진행수 계속 증가 |
| 4. stop | A 탭에서 중지 | A 만 running→error(재개 버튼 노출), B·C 계속 진행 |
| 5. 완료 | B 완료(done) | B 탭만 스피너 해제, FinalVerdictCard 표시. `/analyze` 카드 캐시 무효화로 B 카드 "분석 중" 자동 해제·갱신 |
| 6. 재열기 | 패널 닫고 우측 핀 클릭 / 트레이 행 클릭 | `open()`=분석 주인 뷰, 트레이 행 클릭=해당 종목 뷰로 `switchTab` |
| 7. dismiss | 완료(B) 트레이 행 hover → `×` | B 슬롯 제거, viewTicker 재지정(running 우선 → 없으면 첫 슬롯 → 없으면 패널 닫힘) |

## 에지 케이스

- **4번째 새 종목 차단**: `runningCountExcluding(target) >= 3` → `limitNotice` 배너(자동 4s 클리어, provider L555-559). 대기 큐 아님(차단). 자기 종목 재분석은 제외 카운트라 통과(running A·B·C 중 A 재분석 OK). ✔
- **30분 경계**: `finishedAt ?? startedAt` 기준 `>= 30*60*1000` 만 프롬프트. 미완료(running 중 재열기)면 `startedAt` 기준이라 시작 30분 내 미노출. `finishedAt` 은 done 이벤트(L302)에서만 기록 → stop/error 슬롯은 `startedAt` 폴백. ✔
- **PM 파싱 실패 → 재시도**: 파싱 실패·verdict 무효 양 경로 모두 `report`(원문 보존)+`progress error` → 패널 "최종 결론 도출 실패" 카드 + `resume("portfolio_manager")` 재시도. 과거 무표시 블랙홀 제거. 직전 dev 로그상 실제 파싱 실패 0건이나 코드 경로 정합 확인. ✔
- **라우트 이동 시 백그라운드 유지**: provider L548-552 pathname effect 가 `dispatch collapse`(=`isOpen:false`)만, 슬롯·컨트롤러 무관 → 스트림 지속. 패널을 셸((main) 레이아웃)에 mount → 페이지 이동에도 unmount 안 됨. dev 로그상 한 분석이 8~10분 완주(13:58 시작 → 14:06 done)하며 끊김 없음. ✔
- **언마운트 abort**: provider L538-543 — `Object.values(abortControllersRef.current).forEach(c => c.abort())` 로 전 스트림 중단. ✔
- **late-event race**(재분석 시 직전 aborted 스트림 늦은 이벤트): `startStream`(L594) 가 새 컨트롤러 등록 전 기존 `abort()`. 단일 슬롯 코드와 동일 위험 수준(PR `## 다음 작업` 에 runId 태깅 후속 명시). 현 dev 로그상 미관측. ⚠(후속, 머지 차단 아님)
- **슬롯 누적 evict**: `MAX_TOTAL_SLOTS(6)` 초과 시 가장 오래된 **비실행** 슬롯부터 제거(running·방금 추가분 보존, L134-152). running 3 + 완료 잔여 보존. ✔
- **StrictMode 더블 마운트**: 언마운트 cleanup 이 컨트롤러 abort 하나 `useReducer` dispatch 는 멱등, `stateRef` 미러 effect 는 의존성 없는 매 렌더 동기화라 재마운트 무해. 신규 전역 CSS·preflight 잔여물 없음. ✔
- **DESIGN.md 토큰 라이브 동기화**: 본 PR 토큰 미변경(스타일링 PR 아님, hex/px 직타 신규 0, `tailwind.theme.json` 무관) → 토큰 동기화 검증 비대상.

## 자동 검증 요약(실측치)

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | exit 0, 출력 없음 |
| lint | `npm run lint` (`eslint .`) | exit 0, 경고/에러 0 |
| build | `npm run build` (Turbopack) | exit 0, ✓ Compiled 3.1s, 정적 47/47 생성, `/api/stock/ai-analysis` 라우트 정상 |
| test | `npm test` (vitest) | 62 파일 passed / 1 skipped, **502 tests passed / 1 skipped**(live backtest) |
| parse(AC10) | `node scratchpad/parseCompare.mjs` | 구 4/7 → 신 **7/7** |
| BFF | `git grep fetch(` 변경 컴포넌트 / `git grep http://127.0.0.1 -- app/` | client `fetch(` 0건, `127.0.0.1` route handler fallback 한정 |
| 동시성(AC1/12) | `.next/dev/logs/next-development.log` grep | 3-way 동시 런 2배치 실측, ticker 분리, `전체 완료` 3건, PM 파싱 실패 0 |

## 한계

- **AC2~9 의 시각/상호작용 런타임은 로컬 claude/codex CLI + KIS 설정 + 종목당 8~10분 의존**으로 헤드리스 자동 검증 불가 → provider/panel 코드 레벨 검증 + 수동 재현 절차로 판정. **로컬에서 위 라운드트립 7단계 수동 검증 권장**(특히 AC4 핀↔트레이 hover 전환, AC8 dismiss 후 뷰 재지정, AC9 30분 경계).
- AC1/12 는 직전 dev 세션 로그로 **3건 동시 완주 + ticker 격리**를 실측했으나, 탭 스트립·재열기 핀의 **시각 렌더**는 로그로 확인 불가(코드 검증 갈음).
- 탭 라벨 종목명: analyze 진입은 `openFor(ticker, name)` 로 name 캐시되나, 종목 상세 직접 진입은 ticker 폴백 후 `useQueryStockNames` 비동기 해석 의존(PR `## 다음 작업` 후속 명시). 기능 결함 아님.

## 판정

- **조건부 PASS** — 자동 항목(type/lint/build/test/parse/BFF/한글톤) 전량 통과, AC1/12 런타임 로그 실측 통과, AC2~11/13/14 코드·로그 레벨 결함 없음. AC2~9 시각/상호작용은 **로컬 수동 검증 권장** 단서 동반.
- 발견 결함: **0건**(머지 차단 사유 없음). late-event race 는 기존 위험 수준 유지 + 후속 명시로 수용.
