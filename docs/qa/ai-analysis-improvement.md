# QA 리포트: ai-analysis-improvement

- **slug**: `ai-analysis-improvement`
- **작성일**: 2026-06-12
- **대상**: PR #116 — AI 분석 개선 (토큰 스트리밍·병렬화·UI 개선)
- **PRD**: `docs/prd/ai-analysis-improvement.md`
- **판정**: qa-failed

---

## 1. AC별 검증 표 (PRD §5)

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 토론 중복 카드 버그 수정 | `git diff main feature/ai-analysis-improvement -- components/stock/AIAnalysisPanel.tsx \| grep isBullThisRound` | `isBullThisRound` 조건에 `round === completedBullRounds + 1 && completedBearRounds === round - 1` 추가 | 이전 코드: `bullAgent.status === "running" && !bullMsg` (round 체크 없음). 현재 코드: `bullAgent.status === "running" && !bullMsg && round === completedBullRounds + 1 && completedBearRounds === round - 1`. R1 스트리밍 중 R2 플레이스홀더는 `completedBearRounds === 1`(=R1 완료)일 때만 표시되므로 중복 노출 방지. | 통과 |
| AC-2 | DEBATE_R2 타임아웃 해소 | `git grep -n "DEBATE_R2" app/api/stock/ai-analysis/route.ts` | `DEBATE_R2` 값이 300,000 이상 (`T.NO_TOOL` 동일) | `DEBATE_R2: 300_000` — main 브랜치 `180_000`에서 `300_000`으로 상향 확인. `T.NO_TOOL = 300_000`과 동일. AC 조건 성립. | 통과 |
| AC-3 | DEBATE_ROUNDS JSDoc "bull+bear 1쌍 = 1라운드" 정의 | `git grep -n "DEBATE_ROUNDS" lib/types/stock/aiAnalysis.ts` | JSDoc에 "bull+bear 교대 1쌍 = 1라운드" 정의 포함 | 현재 JSDoc: `/** 강세↔약세 토론 라운드 수 (서버·클라이언트 공용) */`. PRD 요구사항("bull+bear 교대 1쌍 = 1라운드. `DEBATE_ROUNDS=2`는 bull R1→bear R1→bull R2→bear R2의 4발화를 의미한다") 미반영. 이번 PR의 diff에서 `DEBATE_ROUNDS` 라인 변경 없음. | **실패** |
| AC-4 | UI 라운드 카운터 정합 | `git grep -n "roundCounter\|DEBATE_ROUNDS" components/stock/AIAnalysisPanel.tsx` | `COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)` — 상수 기준 계산 | `DebateSection` L250: `{COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)}`. `DEBATE_ROUNDS` import 확인(L13). `currentRound = Math.max(bullMsgs.length, bearMsgs.length, 1)` — 동적 계산. 카운터 로직 정합. | 통과 |
| AC-5 | 토론 R2 프롬프트 전문 삽입 제거 | `git grep -n "buildBullR2Prompt\|buildBearR2Prompt" app/api/stock/ai-analysis/route.ts` + 함수 본문 확인 | `${state.bullArgument}`, `${state.bearArgument}` 전문 그대로 삽입 제거 | `buildBullR2Prompt` 함수 본문: `${state.bullArgument}` (bull R1 전문), `${state.bearArgument}` (bear R1 전문) 그대로 삽입 유지. main 브랜치와 동일 — diff에서 변경 없음. PRD §3-3 "전문 그대로 삽입 금지" 미이행. | **실패** |
| AC-6 | 에이전트 응답 길이 가이드 포함 | `git grep -n "자 이내" app/api/stock/ai-analysis/route.ts` | portfolio_manager 제외 7개 에이전트 프롬프트에 길이 가이드 | `grep -c "자 이내"` = 7건 확인: market(2,500자), news(3,000자), fundamentals(3,000자), bull(2,000자), bear(2,000자), research_manager(2,000자), risk(3,000자). portfolio_manager는 JSON 스키마 고정(기존 유지). AC-6 충족. | 통과 |
| AC-7 | 실측 완주 — 타임아웃 에러 없음 | 로컬 `next dev` 환경에서 AI 분석 전체 실행 | `✗` 로그 0건, 10개 완료 로그 | 서버 직접 실행 불가 — 정적 분석으로 대체 확인 필요. spawn + stream-json 패턴, DEBATE_R2 타임아웃 상향, 병렬화 코드 경로 모두 정상. 실제 Claude CLI 실행 환경에서 수동 검증 필요. | 수동 확인 필요 |
| AC-8 | typecheck / build / lint 통과 | `npm run typecheck && npm run build && npm run lint` | 3개 커맨드 0 에러 | typecheck: 0 에러 / build: 0 에러 (35 static pages) / lint: **경고 1건** (`_open` 미사용 변수 `AIAnalysisPanel.tsx:572`) — 에러 0건. | 통과 (경고 비블로킹) |

---

## 2. 사용자 지정 AC 검증 (요청서 §AC 목록)

| # | 검증 항목 | 실측 결과 | 판정 |
|---|---|---|---|
| 1 | 병렬 에이전트 실행 | `route.ts` L871~878: `Promise.allSettled(toRun.map(k => runOneAgent(k)))` — market·news·fundamentals 동시 실행. `console.log` L877: `[ai-analysis] ▶ 분석가 market+news+fundamentals 병렬 시작` 확인 가능. | 통과 (코드) |
| 2 | 중지 버튼 — 전체 스피너 멈춤 | `stop()` 수정 전: `prev.find(...)` → 단일 에이전트만 error. 수정 후: `prev.filter(...)` → `runningKeys Set` 전체 `error` 전환. `streamingChunk: ""` 초기화 포함. | 통과 |
| 3 | 토론 중복 카드 버그 | `isBullThisRound` 조건에 `round === completedBullRounds + 1 && completedBearRounds === round - 1` 추가로 해당 라운드에서만 플레이스홀더 렌더. R1 bull 스트리밍 중 R2 플레이스홀더 동시 노출 방지 확인. | 통과 |
| 4 | UNDERWEIGHT 재진입 구간 | `FinalVerdictCard` L426: `data.target_pct < 0` 조건으로 `reentryLabel`(재진입 구간) 표시 + 파란색 배경(`statCx("blue")`) + `text-blue-600` 적용. 양수이면 목표가(초록색). | 통과 |
| 5 | 최종 결론 자동 스크롤 | `useEffect` L621~627: `final` 상태 변경 시 `setTimeout(120ms)` 후 `el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })`. DOM 렌더 후 스크롤로 타이밍 보장. | 통과 |
| 6 | 헤더 종목명 | `useQueryStockPrice(ticker)` → `displayName = stockData?.name ?? ticker`. 헤더 L673: `{displayName}` 렌더. 데이터 미로드 시 ticker fallback 포함. | 통과 |
| 7 | 진행 메시지 순환 | `AnalystCard` L73~80: `messages = COPY.progress[meta.key]`, `setInterval(..., 2400)` — `isActive && !streamingChunk` 조건에서만 순환. 스트리밍 텍스트 도착 시 인터벌 취소(`setMsgIdx(0)`). | 통과 |
| 8 | PM 카드 Row3 제거 | `managerKeys: AgentKey[] = ["research_manager", "risk"]` — `portfolio_manager` 제외 확인. Row4 주석: "portfolio_manager 결과" — `FinalVerdictCard`로만 표시. | 통과 |
| 9 | DEBATE_R2 타임아웃 구성 확인 | `T.DEBATE_R2 = 300_000` (5분) — main의 `180_000`에서 상향. 토론 루프 L612, L646: `round === 1 ? T.NO_TOOL : T.DEBATE_R2` 적용. | 통과 |
| 10 | 반응형 — 모바일/데스크탑 | 패널: `w-full md:w-[calc(100vw-48px)]`. Row1 그리드: `grid-cols-1 md:grid-cols-3`. Row3 그리드: `grid-cols-1 md:grid-cols-2`. 모바일 단일 컬럼, 데스크탑 멀티 컬럼. `DebateSection` 내 `grid-cols-[1fr_28px_1fr]`은 반응형 없이 3열 고정 — 좁은 화면에서 카드 압축 우려 (수동 확인 필요). | 수동 확인 필요 (토론 컬럼 모바일) |

---

## 3. 공통 AC 검증

### 3.1 typecheck

```
npm run typecheck
> tsc --noEmit
(출력 없음 — 0 에러)
```

### 3.2 lint

```
npm run lint
> eslint .

/Applications/하영/code_source/trading-signal-frontend/components/stock/AIAnalysisPanel.tsx
  572:9  warning  '_open' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)
```

`_open`은 구조분해 할당에서 언더스코어 prefix로 의도적 무시 패턴이나, lint 경고로 잡힌다. 기능 결함은 아니며 비블로킹.

### 3.3 build

```
npm run build
✓ Compiled successfully in 3.0s
✓ Generating static pages (35/35)
(에러 없음)
```

### 3.4 BFF 패턴 무회귀

```
git grep -nE "http://127\.0\.0\.1" -- app/ | grep -v "route.ts"
```

결과: `app/api/workbench/_adapters/fastapi.ts` 2건 (기존 route handler 내부 코드) — PR 변경 파일 0건.

### 3.5 한글 톤 무회귀

변경 파일 사용자 노출 문구 전수 확인:
- `COPY.progress`: 8개 에이전트 메시지 배열 — 모두 한글 ("기술적 지표 산출 중...", "최신 뉴스 수집 중..." 등)
- 헤더: "AI 종합분석" / "중지" / "접기" / "닫기"
- 최종 결론: "재진입 구간" / "목표가" / "손절선" / "손익비" / "단기 전망 (1~2주)" / "중기 전망 (1~3개월)"
- verdict 값 (`BUY`/`OVERWEIGHT`/`HOLD`/`UNDERWEIGHT`/`SELL`) — 금융 도메인 API 필드로 예외.
- route.ts 에러 메시지: "AI 멀티에이전트 분석은 로컬 환경(next dev)에서만 사용할 수 있어요." 등 한글.

### 3.6 접근성

- 패널 `<aside aria-label="AI 종합분석" role="complementary">` 확인
- 닫기 버튼: `aria-label={COPY.panel.close}` 적용
- 진행 바 에이전트 칩: `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) — 오류 시 클릭 가능
- 새 버튼류(중지·재개·처음부터) — `type="button"` 명시적 지정으로 submit 방지
- `DebateSection` 및 `FinalVerdictCard`: semantic markup 이상 없음

---

## 4. 에지 케이스

| 시나리오 | 처리 방식 | 확인 |
|---|---|---|
| Vercel 환경 (`VERCEL=1`) | `isVercelEnv()` → 503 + "AI 멀티에이전트 분석은 로컬 환경에서만 사용할 수 있어요." | `route.ts` L671~676 |
| KIS 미설정 | `isKisConfigured()` false → 400 + 한글 에러 | `route.ts` L706~708 |
| 빈 본문 / req.json() 실패 | `catch(() => null)` → `body null` 체크 → 400 | `route.ts` L679~686 |
| 악의적 ticker | `replace(/[^A-Za-z0-9_-]/g, "")` → 빈 문자열 → 400 | `route.ts` L689~691 |
| 데이터 130봉 미만 | `signalResult.warmupOk === false` → SSE `{ type:'error' }` + close | `route.ts` L760~764 |
| claude CLI 미설치 (ENOENT) | `child.on("error")` → `e.code === "ENOENT"` → `reject(...)` | `route.ts` L200~205 |
| stream-json ENOENT (system 이벤트 경로) | `event.type === "system" && subtype === "error"` → reject | `route.ts` L150~154 |
| 에이전트 타임아웃 | `setTimeout → child.kill("SIGTERM") → TimeoutError` | `route.ts` L121~127 |
| 클라이언트 disconnect | `req.signal` abort + `combinedSignal` — `AbortSignal.any` 통합 | `route.ts` L714~718 |
| 전체 타임아웃 40분 | `TIMEOUT_TOTAL_MS = 2_400_000` → `timeoutController.abort()` | `route.ts` L714~716 |
| 중지 → 전체 스피너 제거 | `stop()` `filter` → `runningKeys Set` 전체 `error` 전환 | `useAIAnalysis.ts` L266~282 |
| result 이벤트 없이 CLI 종료 | `child.on("close")` — `accumulated` 있으면 resolve, 없으면 reject | `route.ts` L192~198 |
| StrictMode 더블 마운트 | `useAIAnalysis` 훅 — `useEffect` cleanup에서 `abortRef.current?.abort()`. 더블 마운트 시 이전 스트림 취소 후 재실행. | `useAIAnalysis.ts` L55~57 |
| portfolio_manager JSON 파싱 실패 | `parseLooseJson` null → `send({type:'report'})` fallback (에러 없이 텍스트로 표시) | `route.ts` L849~853 |

---

## 5. 라운드트립 검증

### 5.1 환경

이 PR은 로컬 claude CLI 전용 기능으로 BE (`127.0.0.1:8000`) FastAPI 불필요. Vercel 미지원 (503 가드).
라운드트립 수동 실행은 Claude CLI 실행 환경 의존으로 코드 경로 추적으로 대체.

### 5.2 코드 경로 추적

**(a) 정상 플로우 — 분석가 3개 병렬**

```
POST /api/stock/ai-analysis { ticker: "005930" }
→ isVercelEnv() false
→ ticker sanitize 통과
→ isKisConfigured() true
→ fetchDailyChunked("005930", ...) → 200봉 캔들
→ evaluateSignal(sorted) → signalResult
→ Phase A: Promise.allSettled([market, news, fundamentals]) — 3개 동시 실행
  → market: invoke(stream-json, 5분 TO) → onToken → debate_stream 0건 / stream 이벤트
  → news: invoke(stream-json, 6분 TO, WebSearch/WebFetch)
  → fundamentals: invoke(stream-json, 6분 TO, WebSearch/WebFetch)
→ Phase B: runDebateLoop (DEBATE_ROUNDS=2)
  → R1 bull (5분 TO) → R1 bear (5분 TO)
  → R2 bull (T.DEBATE_R2=5분 TO) → R2 bear (T.DEBATE_R2=5분 TO)
→ Phase C: research_manager → risk → portfolio_manager
→ portfolio_manager JSON 파싱 → FinalDecision → { type:'final', data }
→ { type:'done' }
```

**(b) Vercel 환경 차단**

```
isVercelEnv() true → 503 → useAIAnalysis fetchAIAnalysisStream 에러 → setError → ErrorCard
```

**(c) KIS 미설정**

```
isKisConfigured() false → 400 → 에러 메시지 + 패널 오류 표시
```

**(d) claude CLI 없음**

```
spawn("claude", ...) → child.on("error") ENOENT → 500 → 에러 메시지
```

**(e) 에이전트 타임아웃**

```
setTimeout → child.kill("SIGTERM") → TimeoutError → SSE error → 패널 오류 표시
resume 버튼 노출 (setResumeFrom)
```

### 5.3 반응형 코드 경로

- 패널 `w-full md:w-[calc(100vw-48px)]` — 모바일 전체 너비, 데스크탑 48px 여백
- Row1 `grid-cols-1 md:grid-cols-3` — 모바일 1열, 데스크탑 3열
- Row3 `grid-cols-1 md:grid-cols-2` — 모바일 1열, 데스크탑 2열
- `DebateSection` 내 `grid-cols-[1fr_28px_1fr]` — **반응형 없음**. 모바일 375px에서 각 컬럼 약 172px — 텍스트 압축 가능성 있음. 기능적 파손은 아니나 모바일 수동 확인 권고.

---

## 6. 실패 항목 상세

### 실패 1 — PRD AC-3: DEBATE_ROUNDS JSDoc 미완성

**재현 조건**:
```
git grep -n "DEBATE_ROUNDS" lib/types/stock/aiAnalysis.ts
```

**실측 출력**:
```
lib/types/stock/aiAnalysis.ts:107:/** 강세↔약세 토론 라운드 수 (서버·클라이언트 공용) */
lib/types/stock/aiAnalysis.ts:107:export const DEBATE_ROUNDS = 2;
```

**기대 출력** (PRD AC-3):
JSDoc에 `"bull+bear 교대 1쌍 = 1라운드. DEBATE_ROUNDS=2는 bull R1→bear R1→bull R2→bear R2의 4발화를 의미한다."` 포함.

**원인**: 이번 PR diff에서 `lib/types/stock/aiAnalysis.ts`의 `DEBATE_ROUNDS` 행은 변경되지 않음. `FinalDecision` 필드 추가만 반영됨.

---

### 실패 2 — PRD AC-5: buildBullR2Prompt 전문 그대로 삽입 미제거

**재현 조건**:
```
grep -A 12 "function buildBullR2Prompt" app/api/stock/ai-analysis/route.ts
```

**실측 출력**:
```typescript
function buildBullR2Prompt(state: AnalysisState): string {
  return `약세 연구원의 반론이 나왔습니다. 이에 맞서 강세 입장을 강화하세요.

[당신의 1라운드 강세 논거]
${state.bullArgument}        ← R1 bull 전문 그대로 삽입

[약세 연구원의 반론]
${state.bearArgument}        ← R1 bear 전문 그대로 삽입
...
```

**기대**: `state.bullArgument`, `state.bearArgument` 전문 삽입 제거 → 요약/핵심 발췌 또는 PRD §9 B방식("핵심 논점만 인식하고 전문 재인용 금지" 안내문) 적용.

**원인**: PRD §3-3 "토론 R2 프롬프트 컨텍스트 전략 개선"이 이번 PR에 미구현. main 브랜치와 함수 본문 동일.

---

## 7. 비블로킹 발견 사항

1. **`_open` lint 경고**: `AIAnalysisPanel.tsx` L572 `_open` 미사용 변수 경고. `AIAnalysisPanelProps`에서 `open: _open`으로 받지만 내부 미사용. 언더스코어 패턴이나 경고 제거는 전달인자 제거 또는 `/* eslint-disable */` 주석으로 처리 가능.

2. **`DebateSection` 모바일 3열 고정**: `grid-cols-[1fr_28px_1fr]` — 375px 모바일에서 각 컬럼 약 172px. 토론 카드가 좁아지나 `line-clamp-5`로 텍스트 잘림 처리 중. 기능적 파손 아님. 후속 PRD에서 개선 가능.

3. **R2 bear 프롬프트의 `buildBearR2Prompt` 개선**: `buildBearR2Prompt`는 `latestBullText`(R2 bull 신규 텍스트만)를 받는 방식으로 누적 방지 구현됨. bull R2 프롬프트(`buildBullR2Prompt`)만 여전히 R1 전문 삽입 중. 불균형 처리이므로 AC-5 수정 시 함께 정비 필요.

4. **PRD §4 비범위 항목 실제 구현**: PRD §4에서 "execFile→spawn 전환은 Out of scope"로 명시했으나 이번 PR에서 실제 구현됨. 결과적으로 실시간 토큰 스트리밍이 활성화됐으며 기능 동작에는 문제 없음. 단, PRD와 구현 범위의 불일치를 향후 PRD 업데이트 또는 OPEN QUESTION 해결로 기록 요망.

---

## 8. 자동화 검증 전체 결과

```
npm run typecheck: 0 에러
npm run lint:      0 에러, 경고 1건 (비블로킹)
npm run build:     0 에러 (35 static pages)
```

---

## 9. 변경 파일 요약

| 파일 | 변경 내용 | 이슈 |
|---|---|---|
| `app/api/stock/ai-analysis/route.ts` | execFile→spawn, --verbose, 병렬화(Promise.allSettled), DEBATE_R2 300s, 응답길이 가이드 7개 | buildBullR2Prompt 전문 삽입 미제거(AC-5 실패) |
| `hooks/stock/useAIAnalysis.ts` | stop() find→filter 수정 (병렬 에이전트 전체 중지) | 없음 |
| `components/stock/AIAnalysisPanel.tsx` | isBullThisRound 조건 수정, FinalVerdictCard 신규(UNDERWEIGHT 재진입·자동 스크롤·헤더 종목명), PM Row3 제거, 진행 메시지 순환 | `_open` 미사용 경고(비블로킹), DebateSection 모바일 3열 고정(비블로킹) |
| `lib/copy/stock/aiAnalysis.ts` | progress 순환 메시지 8개 에이전트 추가, verdict 라벨 추가 | 없음 |
| `lib/types/stock/aiAnalysis.ts` | FinalDecision 필드 5개 추가 (entry_strategy, target_pct, stop_loss_pct, risk_reward_ratio, short/mid_term_outlook) | DEBATE_ROUNDS JSDoc 미업데이트(AC-3 실패) |

---

## 10. 판정 근거

**qa-failed** — PRD 범위 내 구현 항목 중 2개가 미이행:

- **AC-3 실패**: `DEBATE_ROUNDS` JSDoc에 "bull+bear 교대 1쌍 = 1라운드" 정의 누락 (`lib/types/stock/aiAnalysis.ts`)
- **AC-5 실패**: `buildBullR2Prompt` 에서 R1 전문(`${state.bullArgument}`, `${state.bearArgument}`) 그대로 삽입 — PRD §3-3 미이행 (`app/api/stock/ai-analysis/route.ts`)

나머지 AC-1, AC-2, AC-4, AC-6, 공통 AC (typecheck/build/BFF/한글) 모두 통과.
