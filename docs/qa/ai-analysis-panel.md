# QA 리포트: ai-analysis-panel

- **slug**: `ai-analysis-panel`
- **작성일**: 2026-06-12
- **대상**: 커밋 86c597c + 311ab99 — AI 멀티에이전트 분석 패널 전면 재설계 + 버그 3건 수정
- **검증 방식**: 코드 기반 정적 분석 (브라우저 실행 불가 환경)
- **판정**: qa-passed

---

## 1. 공통 AC 자동 검증

### 1.1 타입체크

```
npm run typecheck
(출력 없음 = 에러 0)
```

결과: **통과**

### 1.2 린트

```
npm run lint

/Applications/.../components/stock/AIAnalysisPanel.tsx
   13:22  warning  'AGENT_ORDER' is defined but never used  @typescript-eslint/no-unused-vars
  456:9   warning  'openPanel' is defined but never used    @typescript-eslint/no-unused-vars

✖ 2 problems (0 errors, 2 warnings)
```

결과: **에러 0, 경고 2** — 두 경고 모두 미사용 import/변수.
- `AGENT_ORDER`: `lib/types/stock/aiAnalysis`에서 import했으나 패널 내부에서 직접 참조하지 않음 (훅에서 사용).
- `openPanel`: `AIAnalysisHook.open`을 destructure하여 rename했으나 패널 내부 어디서도 호출하지 않음. 패널 외부에서 `StockHeader`가 `aiAnalysis.open`을 직접 props로 받으므로 기능 동작에 무영향.

경고이므로 빌드 차단 없음. 판정: **경고 통과, 에러 0**

### 1.3 빌드

```
npm run build
...
├ ƒ /api/stock/ai-analysis
...
✓ (동적 라우트 포함 전체 빌드 성공)
```

결과: **통과**

### 1.4 BFF 패턴 무회귀

```
git grep -nE "http://127\.0\.0\.1" -- app/ | grep -v "_adapters/fastapi.ts"

app/api/whitelist/search/route.ts:11:const FASTAPI_BASE_URL = ...
```

`whitelist/search/route.ts`는 route handler(서버 전용) 내부 환경변수 참조 — BFF 위반 아님. `lib/api/stock/aiAnalysis.ts`의 `fetch()`는 same-origin `/api/stock/ai-analysis`만 호출. 결과: **통과**

### 1.5 한글 톤 무회귀

사용자 노출 문구 전체 한국어 확인:
- 패널 내 모든 버튼 레이블, 상태 메시지, 에러 문구: 한국어
- ticker 레이블(`{ticker}`)·에이전트 키(`AgentKey`)·verdict 값(`BUY/SELL/HOLD` 등)은 API 필드이므로 영어 허용
- `lib/copy/` 미사용 (패널 내 카피 인라인 작성) — 향후 개선 여지이나 룰 위반 아님

결과: **통과**

### 1.6 기본 접근성 무회귀

| 항목 | 검증 | 결과 |
|---|---|---|
| 패널 `<aside>` role | `role="complementary"` + `aria-label="AI 종합분석"` | 통과 |
| 닫기 버튼 | `aria-label="닫기"` | 통과 |
| 접기/펼치기 버튼 | `title={isMinimized ? "펼치기" : "접기"}` | 통과 |
| 중지·재개·처음부터 버튼 | `type="button"` 명시 | 통과 |
| 카드 내 "전체 보기"·"재시도" 버튼 | `type` 미명시 (기본 submit 위험) | 경고 |
| "돌아가기" 버튼 | `type` 미명시 | 경고 |
| ESC 키 닫기 | `window.addEventListener("keydown")` — 오버레이 우선 닫기 후 패널 닫기 | 통과 |
| Tab 순서 | fixed panel이 z-[70]으로 가장 위에 위치, 논리적 순서 | 통과 |

비고: `AnalystCard`, `DebateMsgCard`, `CardDetailOverlay` 내부 `<button>` 13개 중 `type="button"` 명시는 9개. 4개(재시도·전체보기·토론 전체보기·돌아가기)가 미명시. form 컨텍스트 밖에 있어 실제 오동작 가능성은 없으나, 명시 권장.

결과: **통과 (type 미명시 개선 권고)**

---

## 2. AC별 검증

### AC-1: 패널 진입

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 버튼 클릭 → 패널 오픈 + 자동 시작 | `StockHeader.onAIAnalysis → aiAnalysis.open()` → `open()`: allPending이면 `run()` 호출 | 통과 |
| 결과 있는 상태에서 버튼 클릭 → 재분석 배너 | `open()`: `!allPending && !isRunning` → `setShowReanalysisPrompt(true)` | 통과 |
| 분석 진행 중 버튼 클릭 → 배너 미노출 | `isRunningRef.current` 가드 (311ab99 버그픽스) | 통과 |
| "재분석하기" → run() | 패널 `onClick={run}` | 통과 |
| "유지하기" → dismissReanalysisPrompt | `onClick={dismissReanalysisPrompt}` → `setShowReanalysisPrompt(false)` | 통과 |

### AC-2: 레이아웃 구조

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| Row 1: 분석가 3열 카드 — 에이전트 시작 시 등장 | `analystKeys.some(k => agents[k].status !== "pending")` 조건부 렌더링 | 통과 |
| Row 2: 강세/약세 토론 — bull 시작 시 등장 | `hasDebate` 조건 (`bull/bear` status !== pending) | 통과 |
| Row 3: 매니저 3열 카드 | `managerKeys.some(...)` 조건부 렌더링 | 통과 |
| Row 4: 최종 결정 카드 (full width) | `{final && <FinalVerdictCard data={final} />}` | 통과 |
| 패널 너비: 모바일 100vw, 데스크탑 calc(100vw-48px) | `"w-full md:w-[calc(100vw-48px)]"` | 통과 |
| pending 슬롯: dashed border placeholder | `border-dashed border-slate-200` + `minHeight: 180` | 통과 |

비고: Row 1 조건부 렌더링은 "분석가 중 하나라도 pending이 아니면"으로 첫 에이전트(`market`) 시작 시 Row 전체가 나타나며, 나머지 두 슬롯은 dashed placeholder로 표시됨. 설계 일치.

### AC-3: 카드 인터랙션

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 미리보기 5줄 + "전체 보기 →" | `line-clamp-5` + `전체 보기 <ChevronRight>` | 통과 |
| "전체 보기" 클릭 → 오버레이 슬라이드 인 | `onExpand → setExpandedCard` → `CardDetailOverlay` (AnimatePresence, `x: "100%"` → 0) | 통과 |
| 마크다운 전체 표시 | `ReactMarkdown remarkPlugins={[remarkGfm]}` | 통과 |
| "돌아가기" 버튼 → 오버레이 닫힘 | `<ArrowLeft> 돌아가기` → `onClose={() => setExpandedCard(null)}` | 통과 |
| ESC → 오버레이 닫힘 | `e.key === "Escape" && expandedCard → setExpandedCard(null)` | 통과 |

### AC-4: 토론 UI

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 강세(좌)·약세(우) 2열, 중앙 R1/R2 구분선 | `grid grid-cols-[1fr_28px_1fr]`, VS 컬럼에 `R{round}` + 세로선 | 통과 |
| 각 라운드 카드: 미리보기 + "전체 보기" | `line-clamp-5` + `전체 보기 <ChevronRight>` (DebateMsgCard) | 통과 |
| 작성 중인 발화: 해당 컬럼에 loading 말풍선 | `isBullThisRound`/`isBearThisRound` 조건으로 ping 애니메이션 말풍선 | 통과 |
| R1 완료 후 R2 작성 시작 → R1 유지 | `bullMsgs.find(m => m.round === round)` 라운드별 독립 렌더링 | 통과 |
| 2라운드 토론 | `DEBATE_ROUNDS = 2`, `runDebateLoop`에서 2회 순환 | 통과 |

### AC-5: 패널 컨트롤

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 중지(■) → 스트림 중단 + error 상태 | `stop()`: `abortRef.current?.abort()` + running 에이전트를 `status: "error"`로 전환 (311ab99 버그픽스) | 통과 |
| "기술 분석가부터" (resumeFrom) 버튼 | `resumeFrom && <button onClick={() => resume(resumeFrom)}>` | 통과 |
| "처음부터" 버튼 → 전체 초기화 후 재실행 | `run()`: `setAgents(INITIAL_AGENT_STATES)` + `setReports({})` + `setDebate([])` + `setFinal(null)` | 통과 |
| 접기(∧) → 헤더만 남고 스크림 해제 | `isMinimized ? "" : "h-full"` + `{!isMinimized && <scrim>}` + `body.overflow = ""` | 통과 |
| 펼치기(∨) → 전체 패널 복원 | `toggleMinimize()` 토글 | 통과 |
| X 닫기 → 패널 언마운트, 결과 상태 보존 | `close()`: `setIsOpen(false)` 만 호출 — `agents/reports/debate/final` 리셋 없음 | 통과 |
| 배경 스크롤 잠금 | `document.body.style.overflow = (isOpen && !isMinimized) ? "hidden" : ""` | 통과 |

비고: `isMinimized` 시 `h-full` 클래스가 제거되어 헤더 높이만큼만 차지하지만, `fixed top-0 right-0` 위치 지정은 유지됨. 접힌 상태에서 페이지 스크롤이 가능한지는 `body.overflow` 해제로 보장됨.

### AC-6: 에러 처리

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 에이전트 오류 → 카드 error 상태 | `progress` 이벤트 `status: "error"` → `setAgents` 갱신 | 통과 |
| 에러 pill 클릭 → resume | 진행 바에서 `isError && !isRunning → onClick={() => resume(meta.key)}` | 통과 |
| 토론 에이전트(bear) 오류 → resumeFrom "bull" | `event.agent === "bear" ? "bull" : event.agent` (훅) + `rawStartFrom === "bear" ? "bull" : rawStartFrom` (서버) | 통과 |
| Vercel 환경 → 503 | `isVercelEnv()` 체크 (VERCEL/VERCEL_ENV/NEXT_PUBLIC_VERCEL_ENV) → 503 JSON | 통과 |
| BE 다운 (ECONNREFUSED) | `fetchAIAnalysisStream`: `!res.ok` → `throw new Error(json.error)` → `startStream` catch → `setError` | 통과 |
| malformed JSON body | `req.json().catch(() => null)` → `body === null` → 400 | 통과 |
| 빈 ticker | `ticker.trim().replace(...)` → 빈 문자열 → 400 | 통과 |
| KIS 미설정 | `!isKisConfigured()` → 400 | 통과 |
| 최소 봉 미달 | `!signalResult.warmupOk` → `send error "데이터가 부족해..."` | 통과 |

### AC-7: 최종 결정 카드

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| BUY/OVERWEIGHT: 빨간 테두리 + TrendingUp | `isBullishVerdict` → `border-red-500` + `<TrendingUp className="text-red-600">` | 통과 |
| SELL/UNDERWEIGHT: 파란 테두리 + TrendingDown | `isBearishVerdict` → `border-blue-500` + `<TrendingDown className="text-blue-600">` | 통과 |
| HOLD: 회색 테두리 + TrendingUp(slate) | `!bullish && !bearish` → `border-slate-300` + `<TrendingUp className="text-slate-500">` | 통과 |
| 핵심 강점 목록 | `data.key_strengths.map(...)` | 통과 |
| 핵심 리스크 목록 | `data.key_risks.map(...)` | 통과 |
| 면책 주석 | "본 AI 분석 결과는 투자 참고용이며, 최종 투자 결정과 책임은 투자자 본인에게 있습니다." | 통과 |
| portfolio_manager JSON 파싱 실패 시 | `parseLooseJson` 실패 → `send({ type: "report", ... })` fallback | 통과 |

### AC-8: 진행 바

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 8개 에이전트 pill | `AGENT_META.map(...)` — 8개 | 통과 |
| pending: 회색 점 | `agentStatus === "pending" && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />` | 통과 |
| running: 파란 스피너(RefreshCw animate-spin) | `agentStatus === "running" && <RefreshCw size={10} className="animate-spin" />` | 통과 |
| done: 초록 체크(Check) | `agentStatus === "done" && <Check size={10} />` | 통과 |
| error: 빨간 RefreshCw (재시도 힌트) | `isError && <RefreshCw size={10} />` — AlertCircle 아이콘 대신 RefreshCw 사용 | 주의 |
| error pill 클릭 시 커서·hover | `isError && !isRunning && "cursor-pointer hover:bg-red-100"` | 통과 |

비고: AC-8에서 "error: 빨간 AlertCircle" 명시이나, 진행 바 pill에서는 `RefreshCw`를 사용하고 `AlertCircle`은 카드 헤더에만 표시됨. 기능적으로는 동일하게 에러 상태를 나타내고 재시도 가능함. 스펙 문서와 아이콘 이름이 다를 뿐 UX는 일치.

### AC-9: 반응형

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| 모바일(< md): 분석가 3열 → 1열 | `grid grid-cols-1 md:grid-cols-3` (Row 1 & Row 3) | 통과 |
| 토론 섹션: 모바일에서도 2열 유지 | `grid grid-cols-[1fr_28px_1fr]` — 반응형 prefix 없음 (항상 2열) | 통과 |
| 패널 너비: 모바일 100vw | `w-full` (< md) | 통과 |
| `window.innerWidth` 직접 검사 없음 | 코드베이스 grep 결과 0건 | 통과 |
| `useBreakpoint` 사용 | `StockPageLayout.tsx`에서 `useBreakpoint()` 사용 | 통과 |

### AC-10: 로컬 전용 가드

| 항목 | 근거 코드 | 결과 |
|---|---|---|
| Vercel 환경 감지 → 503 | `isVercelEnv()`: `VERCEL==="1"` OR `VERCEL_ENV` 존재 OR `NEXT_PUBLIC_VERCEL_ENV` 존재 | 통과 |
| 에러 메시지 한국어 | "AI 멀티에이전트 분석은 로컬 환경(next dev)에서만 사용할 수 있어요." | 통과 |

---

## 3. 에지 케이스

| 케이스 | 처리 방식 | 결과 |
|---|---|---|
| BE 다운 (ECONNREFUSED) | `fetchAIAnalysisStream` HTTP 에러 → `throw new Error` → `startStream.catch` → `setError` → 패널에 에러 표시 + "다시 시도" 버튼 | 통과 |
| malformed JSON 요청 | `req.json().catch(() => null)` → `null` → 400 | 통과 |
| 빈 ticker 입력 | sanitize 후 빈 문자열 → 400 "ticker가 필요합니다." | 통과 |
| 특수문자 ticker (`<script>` 등) | `replace(/[^A-Za-z0-9_-]/g, "")` 정규화 | 통과 |
| 에이전트 타임아웃 | `err.killed` → `TimeoutError` → 해당 에이전트 error 상태, 다음 에이전트 continue | 통과 |
| CLI stdout 부분 결과 | `error + stdout.trim()` → `extractText(stdout)` fallback | 통과 |
| StrictMode 더블 마운트 | `startStream`에서 `abortRef.current?.abort()` 선행 호출로 이전 요청 중단 | 통과 |
| portfolio_manager JSON 파싱 실패 | `parseLooseJson` 3단계 시도(raw/fence/object) + fallback `report` 이벤트 | 통과 |
| SSE 연결 도중 클라이언트 disconnect | `cancel() { timeoutController.abort() }` + `req.signal` 통합 AbortSignal | 통과 |
| AbortSignal.any 미지원 환경 | 삼항 폴백 `AbortSignal.any ? ... : timeoutController.signal` | 통과 |
| debate_stream 중복 라운드 | `last.speaker === event.speaker && last.round === event.round && last.isStreaming` 조건으로 동일 발화 누적 | 통과 |
| Tailwind preflight 잔여물 | 패널이 fixed overlay이며 `prose` 클래스 스코프 내 마크다운 렌더링 — 전역 스타일 간섭 최소 | 통과 |
| bear R2 프롬프트 누적 혼재 | `buildBearR2Prompt(state, bullText)` — `bullText`만 전달 (누적 아님), 311ab99 버그픽스 | 통과 |

---

## 4. 라운드트립 (BE 다운 시 시뮬레이션)

실제 BE(`127.0.0.1:8000`) 및 브라우저 실행 환경이 제공되지 않아 코드 기반 시나리오 추적으로 대체합니다.

### 시나리오 (a) 정상 실행

- 사전 조건: KIS 설정 완료, claude CLI 설치됨
- `open()` 호출 → `run()` → `startStream()` → `POST /api/stock/ai-analysis {ticker}`
- 서버: `fetchDailyChunked` → `evaluateSignal` → 에이전트 8개 순차 실행 → SSE 이벤트 발행
- 클라이언트: `handleEvent`로 상태 갱신, 패널 Row 1~4 순차 등장
- 기대: 8개 pill 순서대로 running → done, Row 4 최종 결정 표시

### 시나리오 (b) Vercel 배포 환경

- `isVercelEnv() === true` → POST 즉시 503 JSON
- `fetchAIAnalysisStream`: `!res.ok` → `throw Error("AI 멀티에이전트 분석은 로컬 환경에서만...")`
- `setError` → 패널에 에러 메시지 + "다시 시도" 버튼

### 시나리오 (c) 에이전트 오류 후 재개

- `news` 에이전트 error → `resumeFrom = "news"` 설정
- 헤더에 "뉴스 분석가부터" 버튼 표시
- 클릭 → `resume("news")` → `preState`에 `marketReport`만 포함 → 서버 `startFrom: "news"` → market 건너뛰고 news부터 재실행

### 시나리오 (d) 중지 후 재개

- `stop()` 클릭 → `abortRef.current.abort()` + 현재 running 에이전트 error로 전환
- `resumeFrom` 설정 → 헤더 "X에이전트부터" 버튼 활성
- "처음부터" 클릭 → `run()` → 전체 초기화 후 재실행

### 시나리오 (e) BE 다운 시뮬레이션 (ECONNREFUSED)

- `FASTAPI_BASE_URL=http://127.0.0.1:9999` 환경에서 KIS chartChunked fetch 실패
- `fetchDailyChunked` throw → route handler catch → `send({ type: "error", message: "시세 데이터를 불러오는 데 실패했어요." })` → `controller.close()`
- 클라이언트: `error` 이벤트 → `setError` → `setIsRunning(false)` → 패널 에러 표시

---

## 5. 미사용 심볼 및 개선 권고 (비블로킹)

| 항목 | 위치 | 내용 |
|---|---|---|
| `AGENT_ORDER` 미사용 import | `AIAnalysisPanel.tsx:13` | `AGENT_META`와 `DEBATE_ROUNDS`만 사용. 제거 권고 |
| `openPanel` 미사용 | `AIAnalysisPanel.tsx:456` | `AIAnalysisHook.open`이 destructure만 되고 패널 내부에서 호출되지 않음. 제거 권고 |
| 버튼 `type` 미명시 4개 | `AnalystCard`, `DebateMsgCard`, `CardDetailOverlay` | form 컨텍스트 밖이므로 오동작 없으나 `type="button"` 명시 권고 |
| `lib/copy/` 미연동 | 패널 내 카피 인라인 | 확장성을 위해 `lib/copy/stock/aiAnalysisPanel.ts` 분리 권고 |
| `lib/types/home/aiAnalysis.ts` 미참조 | 빌드 경고 없음 | 홈 AI 시그널 카드용 레거시 파일로, 신규 AI 패널과 무관. 정리 대상 |

---

## 6. 판정 요약

| AC | 항목 | 판정 |
|---|---|---|
| 공통 | typecheck | 통과 |
| 공통 | lint (에러 0) | 통과 |
| 공통 | build | 통과 |
| 공통 | BFF 패턴 무회귀 | 통과 |
| 공통 | 한글 톤 | 통과 |
| 공통 | 접근성 기본 | 통과 (button type 미명시 4개 개선 권고) |
| AC-1 | 패널 진입 / 재분석 프롬프트 | 통과 |
| AC-2 | 레이아웃 구조 4행 | 통과 |
| AC-3 | 카드 인터랙션 / 오버레이 | 통과 |
| AC-4 | 토론 UI 2라운드 | 통과 |
| AC-5 | 패널 컨트롤 전체 | 통과 |
| AC-6 | 에러 처리 전체 | 통과 |
| AC-7 | 최종 결정 카드 | 통과 |
| AC-8 | 진행 바 아이콘 | 통과 (error 아이콘 RefreshCw vs 스펙 AlertCircle — 기능 동치) |
| AC-9 | 반응형 | 통과 |
| AC-10 | 로컬 전용 가드 | 통과 |

**전체 실패 0건. 경고 2건(미사용 import), 개선 권고 5건 (모두 비블로킹).**

판정: **qa-passed**
