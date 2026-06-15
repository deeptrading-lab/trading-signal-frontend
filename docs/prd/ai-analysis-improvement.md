# PRD: ai-analysis-improvement

- **slug**: `ai-analysis-improvement`
- **작성일**: 2026-06-12
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #113 (AI 최종 판단 — 시그널 데이터 + Claude CLI 웹 리서치) 후속
- **UI 포함 여부**: yes (토론 카드 중복 렌더 버그 수정 포함. 단 신규 화면 레이아웃 추가는 없음 — UX/UI 디자이너 합류 불필요)
- **선행 / 후행 관계**: 없음. 현재 main 에 머지된 코드를 그대로 개선.

---

## 1. 배경 / 문제

PR #113 에서 8-에이전트 멀티에이전트 AI 분석 시스템이 완성됐다. 파이프라인은 다음과 같다.

```
market → news → fundamentals
  → [bull R1 → bear R1 → bull R2 → bear R2]
  → research_manager → risk → portfolio_manager
```

실제 운영 중 세 가지 재현 가능한 문제와 두 가지 구조적 이슈가 확인됐다.

**버그 1 — 토론 UI 중복 카드**: `DebateSection` 의 라운드 렌더 조건이 다음과 같이 작성돼 있다.

```typescript
const isBullThisRound = bullAgent.status === "running" && !bullMsg;
```

R1이 스트리밍 중(bull `status === "running"`)일 때, `round=2` 행에서도 `bullMsg`가 없으므로 조건이 `true`가 된다. 결과적으로 강세 측에 R1 스트리밍 카드와 R2 loading placeholder 카드가 **동시에** 노출된다.

**버그 2 — DEBATE_R2 타임아웃**: R2 프롬프트는 R1 bull(~7,000자) + R1 bear(~6,000자) 전문을 포함해 입력 토큰이 R1보다 훨씬 많다. 그럼에도 `T.DEBATE_R2 = 180_000`(3분)으로 설정돼 있어 `T.NO_TOOL = 300_000`(5분) 보다 낮다. Sonnet 4.5 기준 실측에서 bull R2가 180초 초과로 타임아웃됐다.

```
[ai-analysis] ✗ bull R2 Error: 에이전트 타임아웃 (180초 초과)
```

**이슈 3 — 라운드 수 불명확**: `DEBATE_ROUNDS=2` 상수는 "bull/bear 교대 2회 = 총 4발화"를 의미한다. 그러나 UI의 `COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)` 표시는 사용자에게 "2라운드"로 읽힌다. 사용자 관점에서는 "1라운드 = bull+bear 1쌍"이 자연스러운 단위다. 상수 명칭·값·UI 레이블 세 곳이 불일치해 혼동을 유발한다.

**이슈 4 — 프롬프트 컨텍스트 누적**: R2 bull 프롬프트는 "R1 bull 전문 + R1 bear 전문"을 포함한다. 라운드가 늘어날수록 누적 컨텍스트가 기하급수적으로 증가해 생성 시간이 늘어난다. 현재 `buildBullR2Prompt` / `buildBearR2Prompt` 는 R1 전문 그대로를 삽입하고 있다.

**이슈 5 — 에이전트 응답 길이 무제한**: 실측 응답 길이가 market(5,597자), news(8,101자), fundamentals(8,789자), risk(14,327자)에 달한다. 이 응답이 이후 에이전트 프롬프트에 그대로 전달되어 입력 토큰 비용과 생성 시간이 누적된다. 현재 프롬프트에 응답 길이 가이드가 없다.

---

## 2. 목표

- 토론 진행 중 UI에서 아직 시작하지 않은 라운드 카드가 노출되지 않는다.
- DEBATE_R2 타임아웃 오류가 재현되지 않는다.
- 라운드 수의 의미(bull+bear 1쌍 = 1라운드)가 코드와 UI에서 일관되게 표현된다.
- 에이전트별 응답 길이 가이드가 프롬프트에 포함되어 불필요한 장문 생성이 줄어든다.
- 토론 R2+ 프롬프트에서 이전 라운드 발화가 요약 또는 핵심 발췌 형태로 전달된다 (전문 그대로 삽입 금지).

---

## 3. 범위 (In scope)

### 3-1. 버그 수정

- **버그 1 (중복 카드)**: `DebateSection` 의 `isBullThisRound` / `isBearThisRound` 조건 수정. 조건에 `currentRound`(현재 진행 중인 라운드 번호) 비교를 추가해 해당 라운드에서만 loading placeholder를 렌더링한다.
  - 수정 대상: `components/stock/AIAnalysisPanel.tsx`

- **버그 2 (DEBATE_R2 타임아웃)**: `T.DEBATE_R2` 를 `T.NO_TOOL`(300,000ms) 이상으로 상향 조정. R2는 R1보다 입력 토큰이 많으므로 최소 `T.NO_TOOL`과 동일하거나 그 이상이어야 한다.
  - 수정 대상: `app/api/stock/ai-analysis/route.ts` — `T` 상수 블록

### 3-2. 라운드 수 명확화

- `DEBATE_ROUNDS` 상수의 의미를 JSDoc 주석으로 명시한다: "bull+bear 교대 1쌍 = 1라운드. `DEBATE_ROUNDS=2`는 bull R1→bear R1→bull R2→bear R2의 4발화를 의미한다."
- UI 레이블(`COPY.debate.roundCounter`)이 이 정의에 맞게 표시되도록 copy 상수 및 렌더 로직을 확인·수정한다. 사용자에게 "2라운드 토론"이 bull+bear 쌍 2회임이 자연스럽게 읽혀야 한다.
- 수정 대상: `lib/types/stock/aiAnalysis.ts`, `lib/copy/stock/aiAnalysis.ts`, `components/stock/AIAnalysisPanel.tsx`

### 3-3. 토론 R2 프롬프트 컨텍스트 전략 개선

- `buildBullR2Prompt` / `buildBearR2Prompt` 함수에서 이전 라운드 발화를 전문 그대로 삽입하는 대신 **핵심 논점 요약 형태**로 전달한다.
  - 구체 방식 선택지는 §9 OPEN QUESTION 참조.
- 전달 방식이 변경되더라도 SSE 이벤트 타입(`debate`, `debate_stream`)과 클라이언트 타입(`DebateMessage`)은 변경하지 않는다.
- 수정 대상: `app/api/stock/ai-analysis/route.ts` — `buildBullR2Prompt`, `buildBearR2Prompt`

### 3-4. 에이전트 응답 길이 가이드 추가

- 각 에이전트의 system prompt 또는 user prompt 끝에 응답 목표 길이 가이드를 추가한다. 권고 기준(최종 결정은 §9 OPEN QUESTION):
  - market, bull, bear, research_manager: 600~900자 이내
  - news, fundamentals: 800~1,200자 이내 (웹 검색 결과 포함)
  - risk: 800~1,000자 이내
  - portfolio_manager: JSON 스키마 고정 (기존 유지)
- 수정 대상: `app/api/stock/ai-analysis/route.ts` — `AGENT_PROMPTS` 각 항목의 system/user 문자열

### 3-5. 관련 타입 및 상수 정합성 유지

- `DEBATE_ROUNDS` 값 변경 시 (현재 2 → §9 결정에 따라 유지 또는 변경) `lib/types/stock/aiAnalysis.ts` 와 `app/api/stock/ai-analysis/route.ts` 를 동시에 반영한다. 두 파일이 같은 상수를 공유(import)하고 있으므로 단일 수정으로 전파된다.

---

## 4. 비범위 (Out of scope)

- `execFile` → `spawn + stream-json` 전환 (구현 복잡도 대비 즉각 효과 낮음. §9 OPEN QUESTION 으로 분류).
- 신규 에이전트 추가 또는 파이프라인 구조 변경 (순서, 에이전트 수).
- Vercel 환경 배포 (기존 503 가드 유지 — 로컬 전용).
- 에이전트 응답의 실시간 토큰 스트리밍 전환 (현재 완료 후 일괄 전송 방식 유지).
- 토론 결과를 데이터베이스에 저장하거나 세션 간 재사용하는 기능.
- UI 레이아웃 전면 재설계 (컴포넌트 구조·색상·타이포그래피 유지).
- DEBATE_ROUNDS 3으로 확장 (§9 OPEN QUESTION — 결정 후 반영 가능).
- 모바일/데스크탑 분기 반응형 개선 (별도 PRD 대상).

---

## 5. 수용 기준 (AC)

### AC-1 (버그 1 수정 — 중복 카드 제거)

R1 bull 스트리밍 진행 중(`bullAgent.status === "running"`, `debate`에 round=1 bull 메시지 없음) 상태에서 `DebateSection` 을 브라우저로 확인했을 때, 강세 측 칼럼에 카드가 **정확히 1개** (R1 loading placeholder) 만 보인다. R2 강세 loading placeholder가 동시에 렌더링되지 않는다.

재현 방법: 로컬 `next dev` 에서 AI 분석 시작 후 토론 R1 bull 진행 중 상태를 유지하며 `DebateSection` DOM을 확인한다.

### AC-2 (버그 2 수정 — DEBATE_R2 타임아웃 해소)

`T.DEBATE_R2 >= T.NO_TOOL` 조건이 코드에서 성립한다.

검증 명령:
```
git grep -n "DEBATE_R2" app/api/stock/ai-analysis/route.ts
```
출력된 값이 `300_000` 이상임을 확인한다.

Sonnet 4.5 기준 실측 실행 시 bull R2가 타임아웃 없이 완료된다:
```
[ai-analysis] ✓ bull R2 len=...
[ai-analysis] ✓ bear R2 len=...
```

### AC-3 (라운드 수 정의 일치)

`lib/types/stock/aiAnalysis.ts` 의 `DEBATE_ROUNDS` JSDoc 주석이 "bull+bear 교대 1쌍 = 1라운드" 정의를 명시한다.

검증 명령:
```
git grep -n "DEBATE_ROUNDS" lib/types/stock/aiAnalysis.ts
```
출력에 JSDoc 주석이 포함돼야 한다.

### AC-4 (UI 라운드 카운터 정합)

토론이 2라운드(bull R1→bear R1→bull R2→bear R2) 진행될 때 UI의 라운드 카운터가 최종적으로 "2 / 2" 또는 동등한 표현으로 표시된다. 라운드 카운터 텍스트 로직이 DEBATE_ROUNDS 상수를 기준으로 계산되고 있음을 코드로 확인한다.

검증 명령:
```
git grep -n "roundCounter\|DEBATE_ROUNDS" components/stock/AIAnalysisPanel.tsx
```

### AC-5 (토론 R2 프롬프트 — 전문 그대로 삽입 금지)

`buildBullR2Prompt` / `buildBearR2Prompt` 함수가 이전 라운드 발화 전문을 그대로 문자열 삽입하지 않는다. 요약 또는 핵심 발췌 형태로 전달하거나, §9에서 "요약 전달" 방식으로 결정된 경우 해당 방식이 코드에 반영돼 있다.

검증 명령:
```
git grep -n "buildBullR2Prompt\|buildBearR2Prompt" app/api/stock/ai-analysis/route.ts
```
함수 본문에 `state.bullArgument` 또는 `state.bearArgument` 의 전문 그대로 삽입(`${state.bullArgument}`, `${state.bearArgument}`) 이 제거됐음을 확인한다.

### AC-6 (에이전트 응답 길이 가이드 포함)

portfolio_manager 를 제외한 7개 에이전트의 system 또는 user prompt 에 응답 길이 가이드 문구가 포함돼 있다.

검증 명령:
```
git grep -n "자 이내\|자 내외\|자 내에" app/api/stock/ai-analysis/route.ts
```
7개 이상의 라인이 출력돼야 한다.

### AC-7 (실측 완주 — 타임아웃 에러 없음)

로컬 `next dev` 환경에서 AI 분석을 처음부터 실행했을 때 서버 콘솔에 다음 8개 라인이 모두 출력된다 (에러 없음):
```
[ai-analysis] ✓ market 완료 len=...
[ai-analysis] ✓ news 완료 len=...
[ai-analysis] ✓ fundamentals 완료 len=...
[ai-analysis] ✓ bull R1 len=...
[ai-analysis] ✓ bear R1 len=...
[ai-analysis] ✓ bull R2 len=...
[ai-analysis] ✓ bear R2 len=...
[ai-analysis] ✓ research_manager 완료 len=...
[ai-analysis] ✓ risk 완료 len=...
[ai-analysis] ✓ portfolio_manager 완료 len=...
```
`✗` 로그가 0건이어야 한다.

### AC-8 (타입체크 / 빌드 / 린트 통과)

```
npm run typecheck
npm run build
npm run lint
```
세 커맨드 모두 0 에러로 통과한다.

### AC-9 (R2 응답 길이 감소 확인 — 정성)

R2 에이전트 응답 길이가 R1 대비 동일하거나 짧아야 하며, 최소한 R1과 유사한 수준을 유지해야 한다. (R2가 R1보다 현저히 길어지는 현상이 해소됐음을 로그 `len=` 값으로 확인.)

---

## 6. 가정 · 제약

- 본 PRD는 `feature/ai-analysis-improvement` 브랜치에서 진행하며, main(PR #113 완료 상태)에서 분기한다.
- Claude CLI (`claude` 바이너리) 는 로컬에 설치돼 있고 `CLAUDE_CLI_MODEL` 환경변수로 모델을 지정할 수 있다고 가정한다.
- Vercel 환경 503 가드는 그대로 유지한다 (AI 분석은 로컬 전용 기능).
- 응답 길이 가이드는 프롬프트 레벨의 자연어 지시이며, 모델이 이를 강제 준수하지 않을 수 있다. AC-6은 프롬프트 포함 여부만 검증하고 실제 응답 길이의 정확한 수치는 정성 확인(AC-9)으로 대체한다.
- `execFile` 기반 Claude CLI 호출 패턴은 이 PRD에서 변경하지 않는다. 실시간 스트리밍 전환은 별도 PRD 또는 §9 결정 후 진행한다.
- `DEBATE_ROUNDS` 상수 값 변경(2 → 3 등)은 §9 OPEN QUESTION 결정 후에만 반영하며, 결정 전 기본값 2를 유지한다.
- 응답 길이 cap의 구체 수치는 §9 OPEN QUESTION 결정 후 최종 확정하며, 결정 전 PM 권고값(§3-4)을 잠정 적용한다.
- `docs/rules/frontend.md` 8개 절 준수: `cn` 헬퍼, 도메인 훅 한 뎁스, `lib/copy/stock/` 카피 분리, 네이밍 컨벤션 모두 유지한다.

---

## 7. 참고

- `app/api/stock/ai-analysis/route.ts` — BFF SSE 핸들러. `T` 상수, `AGENT_PROMPTS`, `buildBullR2Prompt`, `buildBearR2Prompt`, `runDebateLoop` 수정 대상.
- `hooks/stock/useAIAnalysis.ts` — 클라이언트 상태 훅. 버그 1 수정 범위 외. 타입 변경 시 영향받을 수 있음.
- `components/stock/AIAnalysisPanel.tsx` — `DebateSection` 렌더 조건 수정 대상 (버그 1).
- `lib/types/stock/aiAnalysis.ts` — `DEBATE_ROUNDS` JSDoc 주석 추가, 값 변경 시 수정.
- `lib/copy/stock/aiAnalysis.ts` — UI 라운드 카운터 copy 확인·수정.
- `docs/prd/claude-cli-analysis.md` — Claude CLI 분석 기능 최초 PRD. 아키텍처 결정 이력.
- PR #113 커밋 메시지 — "AI 최종 판단 — 시그널 데이터 + Claude CLI 웹 리서치". 토론 R2 컨텍스트 누적 구현 이력.

---

## 8. 영향 분석

### 변경 파일 및 라인 추정

| 파일 | 변경 종류 | 예상 라인 |
|---|---|---|
| `app/api/stock/ai-analysis/route.ts` | `T.DEBATE_R2` 수정, `buildBullR2Prompt`/`buildBearR2Prompt` 전략 변경, 7개 에이전트 프롬프트 길이 가이드 추가 | +30~80 |
| `components/stock/AIAnalysisPanel.tsx` | `DebateSection` `isBullThisRound`/`isBearThisRound` 조건 수정 | +5~15 |
| `lib/types/stock/aiAnalysis.ts` | `DEBATE_ROUNDS` JSDoc 주석 추가, 값 변경 시 1라인 | +3~5 |
| `lib/copy/stock/aiAnalysis.ts` | `roundCounter` copy 확인·수정 | +0~5 |

총 변경량 약 40~100라인 예상. 단일 PR로 처리 가능.

### 커밋 분할 권고

1. `fix: DebateSection 중복 카드 렌더 조건 수정 (버그 1)` — `AIAnalysisPanel.tsx` 단독
2. `fix: DEBATE_R2 타임아웃 상향 조정 + 라운드 정의 JSDoc` — `route.ts` T 상수 + `aiAnalysis.ts` JSDoc
3. `perf: 토론 R2 프롬프트 컨텍스트 요약 전달 + 에이전트 응답 길이 가이드` — `route.ts` 프롬프트 빌더 + AGENT_PROMPTS

버그 수정(1, 2번 커밋)을 먼저 PR에 올리고 검증 후 성능 개선(3번 커밋)을 추가하는 순서를 권장한다.

### 회귀 위험

- **낮음**: 버그 1 수정은 렌더 조건 로직 범위. 기존 SSE 이벤트 타입·훅 인터페이스·BFF 응답 구조는 변경 없음.
- **중간**: 프롬프트 변경(§3-3, §3-4)은 에이전트 응답 품질에 영향을 줄 수 있다. 실측 완주(AC-7) + 응답 길이 확인(AC-9)으로 회귀를 판단한다.
- **낮음**: `T.DEBATE_R2` 상향은 단순 수치 변경으로 회귀 리스크 없음.

---

## 9. OPEN QUESTION

**[OPEN QUESTION] DEBATE_ROUNDS 값을 2에서 3으로 늘릴지**

현재 `DEBATE_ROUNDS=2`는 bull+bear 쌍 2회(4발화)다. 라운드를 3으로 늘리면 파이프라인 시간이 약 50% 증가(2라운드 평균 약 20분 → 3라운드 약 30분)한다. 라운드 추가 대비 분석 깊이 향상이 있지만 사용자 대기 시간 증가가 크다.

PM 권고: 현재 2로 유지. 우선 버그 수정 + 타임아웃 안정화를 완료한 후, 실측 완주 데이터를 확보해 3라운드 추가 여부를 별도 PRD로 결정.

---

**[OPEN QUESTION] 에이전트 응답 길이 cap을 프롬프트 레벨에서 지시할지, 아니면 응답 후 서버에서 truncate할지**

프롬프트 지시 방식은 구현이 단순하나 모델이 준수하지 않을 수 있다. 서버 truncate는 확실하지만 응답 중간 절단으로 마크다운 구조가 깨질 수 있다.

PM 권고: 프롬프트 레벨 지시 우선 적용. "~자 이내로 작성하세요"를 system prompt 끝에 추가. 실측 후 효과 없으면 서버 truncate(마지막 완전한 단락 단위 절단) 로 보완.

---

**[OPEN QUESTION] 토론 R2+ 프롬프트에서 이전 라운드 발화를 어떻게 전달할지**

선택지:
- A. **글자 수 cap 적용**: `buildBullR2Prompt` 에서 `state.bearArgument.slice(0, 2000)` 방식으로 직접 truncate
- B. **프롬프트에 요약 지시 삽입**: "아래 이전 라운드 발화를 참고하세요 (핵심 논점만 인식하고 전문 재인용 금지)"와 같은 안내문 추가
- C. **별도 요약 Claude 호출**: R1 완료 후 각 발화를 요약하는 경량 CLI 호출 추가 후 R2 프롬프트에 요약문 삽입 (추가 지연 발생)

PM 권고: B 방식(프롬프트 안내문 추가) 우선 시도. 구현 추가 없이 프롬프트만 수정하므로 리스크 최소. 효과 없으면 A(슬라이싱)를 병행하되 슬라이싱 기준은 "마지막 완전한 문장 단위"로 한다. C는 추가 지연·비용 발생으로 이 PRD 범위 외.

---

**[OPEN QUESTION] `execFile` 대신 `spawn + stream-json` 으로 전환해 실시간 스트리밍할지**

`spawn` 전환 시 에이전트별 생성 토큰이 실시간으로 클라이언트에 전달돼 사용자 대기 체감이 개선된다. 그러나 구현 복잡도가 높고(JSON 청크 파싱, 오류 핸들링 재작성) 현재 `execFile` 패턴이 PR #113에서 검증됐다.

PM 권고: 이 PRD 범위에서 제외. 버그 수정 + 타임아웃 안정화가 우선순위 높음. 실시간 스트리밍 전환은 후속 PRD로 분리.
