# PRD — ai-sentiment-structured (구조화 감성 — SNS 분석가 정형 감성 + PM 정량 반영)

> 멀티에이전트 AI 분석의 SNS 분석가(`social`)가 자유서술 마크다운 리포트 끝에 **기계가 파싱 가능한 감성 요약 블록(밴드 · 0~10 점수 · 신뢰도 · 한줄요약)** 을 추가로 출력하게 한다. 서버는 정규식으로 블록을 파싱해 새 `sentiment` SSE 이벤트로 발행하고, 클라이언트는 ① SNS 분석가 카드에 감성 배지(예: `긍정적 7/10`)를 표시하고 ② 포트폴리오 매니저(PM) 프롬프트에 정량 감성을 주입해 PM의 confidence 산출에 "감성이 verdict 방향과 일치하면 확신↑/상충하면↓"를 반영한다.
> 레퍼런스 `TauricResearch/TradingAgents` 의 `SentimentReport`(밴드 + score + confidence + 내러티브 품질 가이드) 패턴을 우리 SSE 파이프라인에 이식한다. **별도 LLM 호출·외부 API 추가 0 → 토큰·레이턴시 증가 0**(같은 social 응답 안에 블록을 붙일 뿐). 블록 누락 시 graceful 폴백(감성 미표시 · 분석은 정상 진행).

- **slug**: `ai-sentiment-structured`
- **작성일**: 2026-06-16
- **UI 포함 여부: yes** — SNS 분석가 카드에 감성 배지 1종 신설(+선택: PM 카드에 감성 보조 표기). 신규 토큰 색·컴포넌트가 필요할 수 있어 **UX/UI 디자이너 단계 필요**(§8.5). 디자인 토큰 hex/px 직타 금지 · 한글 카피 `lib/copy` 룰 준수.
- **OPEN QUESTION**: 4건(§9) — 전부 미결, 각 항목에 PM 권고 동봉. q1(밴드 단계 수)·q3(PM 연결 강도)가 스키마·프롬프트를 직접 결정하므로 구현 착수 전 결정 필요.
- **PR 정책**: **단일 PR**(한 브랜치 한 PR 룰). 단 부가 항목(b)(c)는 §8.4에서 분리 가능성 검토.
- **선행 전제**: AI 멀티에이전트 분석 파이프라인이 main에 머지된 현 상태(`#122`/`#123` 포함). 본 분석은 **로컬 전용**(`next dev`) — Vercel 환경은 503(route.ts:202). 따라서 본 PRD의 라이브 검증은 로컬 + 설치된 AI CLI(claude/codex) 전제.

---

## 0. 한눈에

| 항목 | 내용 |
|---|---|
| 무엇 | `social` 프롬프트에 정형 감성 블록 출력 지시 추가 → route.ts가 정규식 파싱 → 신규 `sentiment` SSE 이벤트 → 훅 상태 → SNS 카드 배지 + PM 프롬프트 정량 주입 |
| 왜 | 현재 social은 **자유서술 마크다운뿐** → ① PM이 감성을 텍스트로만 받아 정량 반영 불가(confidence 기준은 "방향 합의 + 데이터 명확성"뿐, prompts:421~425) ② UI에서 다른 분석가와 똑같이 글 미리보기만, 심리 한눈 파악 불가 |
| 핵심 변경 | `lib/prompts/stock/aiAnalysis.ts`(social 블록 지시 + PM 주입) · `lib/types/stock/aiAnalysis.ts`(`SentimentReport` 타입 + `sentiment` 이벤트) · `app/api/stock/ai-analysis/route.ts`(파싱 + 이벤트 발행 + PM 주입) · `hooks/stock/useAIAnalysis.ts`(상태) · `lib/api/stock/aiAnalysis.ts`(이벤트 소비 — 유니온 확장으로 자동) · `components/stock/ai-analysis/AnalystCard.tsx`(배지) · `lib/copy/stock/aiAnalysis.ts`(밴드/배지 카피) |
| 현황 핵심 | social 프롬프트(prompts:152~174)는 "감성 요약: …강세/중립/약세 비율 추정"을 **서술로만** 요구. 정형 등급·점수 없음. PM(prompts:390~491)은 `socialReport` 전문(route:464~465)을 텍스트로 받음 |
| 비용 | LLM 호출 추가 0 · 외부 API 추가 0 · 토큰/레이턴시 증가 0(블록은 기존 social 응답 말미에 동봉). 누락 시 graceful 폴백 |
| 부가(같은 단위 묶음 후보) | (a) 감성 내러티브 품질 가이드 프롬프트, (b) 시세 신선도 가드(route.ts에서 KIS 일봉 ~10일 초과 노후 시 조기 중단), (c) bull/bear 프롬프트 깨진 템플릿 `${"{target}"}` 리터럴 노출 버그 수정 |
| UI | SNS 분석가 카드 감성 배지 1종(+선택 PM 보조 표기). 디자이너 합류 트리거 — **yes** |

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (요약)
멀티에이전트 AI 분석의 SNS 분석가가 지금은 커뮤니티 심리를 자유서술 글로만 내놓는다. 이를 레퍼런스 `TradingAgents` 의 `SentimentReport`(밴드/점수/신뢰도)처럼 **기계가 읽는 정형값**으로도 출력하게 해서, ① UI에서 심리를 한눈에 보이게 하고 ② 포트폴리오 매니저가 감성을 정량으로 반영(특히 confidence 산출)하게 만들고 싶다.

### 1.2 현재 상태 (main 기준, 코드 직접 확인 — 2026-06-16)

- **분석 코드의 소유자는 이 프론트 레포다.** 엔진(`trading-signal-engine` FastAPI)·Slack봇은 본 멀티에이전트 분석의 소유자가 아니며, 봇은 SSE를 **중계만** 한다. 따라서 본 PRD의 변경은 전부 이 레포 안에서 완결된다.
  - 프롬프트: `lib/prompts/stock/aiAnalysis.ts`(`AGENT_PROMPTS` 12개 에이전트 + `runDebateLoop`).
  - 실행: `app/api/stock/ai-analysis/route.ts`(SSE 스트림, 3-phase 파이프라인, PM 응답 JSON 파싱은 `parseLooseJson`/`runOneAgent` 내 `portfolio_manager` 분기 route:388~424).
  - 타입/이벤트: `lib/types/stock/aiAnalysis.ts`(`AIAnalysisEvent` 유니온 type:61~77, `AgentKey`, `FinalDecision`).
  - 클라 소비: `lib/api/stock/aiAnalysis.ts`(`fetchAIAnalysisStream` — `data: ` 라인을 `AIAnalysisEvent`로 파싱해 `onEvent` 호출, api:71~80) + `hooks/stock/useAIAnalysis.ts`(`handleEvent` switch hooks:113~193).
  - UI: `components/stock/AIAnalysisPanel.tsx` · `components/stock/ai-analysis/*`(`AnalystCard.tsx` · `FinalVerdictCard.tsx` 등).
- **social 에이전트(prompts:152~174)**: Reddit·네이버 종목토론·커뮤니티·X를 `WebSearch`/`WebFetch`로 조사해 **자유서술 마크다운 리포트만** 생성. system 프롬프트가 "감성 요약: 개인 투자자 전반적 심리(강세/중립/약세 비율 추정)"(prompts:163)와 "리포트 마지막에 감성 지표 마크다운 표"(prompts:168)를 요구하지만, **기계가 파싱할 고정 키/등급/점수 형식은 없다**. tools=`["WebSearch","WebFetch"]`, timeout=`T.WEB_TOOL`(360s).
- **PM(`portfolio_manager`, prompts:390~491)**: `socialReport` 전문을 user 프롬프트의 `[SNS·커뮤니티 심리]` 블록으로 받는다(route:464~465 / prompts user:463~465). 즉 **텍스트로만** 받는다.
- **PM confidence 산출 기준(prompts:421~425)**: "4개 분석가 + 강세/약세 토론 + 리스크 3팀의 **방향 합의 정도 + 데이터 명확성**". 정량 감성값이 들어갈 자리가 없다.
- **SSE 이벤트 유니온(type:61~77)**: `progress`/`stream`/`report`/`debate_stream`/`debate`/`final`/`error`/`done`. **감성 전용 이벤트 없음.**
- **UI 카드(`AnalystCard.tsx`)**: 모든 분석가(market/news/fundamentals/social)를 **동일 레이아웃**으로 렌더 — 헤더(라벨 + 진행점/체크) + 본문(마크다운 stripped 평문 3줄 미리보기) + 전체보기. social만의 정형 배지 자리 없음(AnalystCard:45~115).
- **결정 이력 저장(`lib/api/stock/aiDecisionStore.ts`)**: `AIDecisionEntry`에 verdict·confidence·target/stop·전망만 저장. **`sentiment_score` 없음**. `useAIAnalysis`의 `done` 이벤트에서 `saveDecision` 호출(hooks:177~190).
- **버그 (부가 c)**: bull 프롬프트(prompts:178)와 bear 프롬프트(prompts:212) system 첫 줄이 `당신은 \${"{target}"}에 투자할 것을…` — 템플릿 리터럴 `${"{target}"}`이 의도(종목명 치환)와 달리 **문자열 `{target}` 그대로** LLM에 노출된다. 두 에이전트 모두 `s.ticker`를 user 프롬프트에서 별도로 받으므로 분석은 동작하나, 프롬프트에 깨진 플레이스홀더가 노출되는 품질 결함.
- **부가 (b) 관련**: route.ts는 매 실행 시 항상 최신 시세를 다시 페치(route:298~340)하나, KIS 일봉이 휴장/콜드스타트로 **오래된 마지막 봉**일 때 그대로 분석을 진행한다. `warmupOk`(최소 130봉) 체크는 있으나(route:317~321) **신선도(최신 봉 날짜) 가드는 없다** → 옛 가격 기준 분석 위험.

### 1.3 문제
1. **PM이 감성을 정량 반영 못 함** — `socialReport`가 자유서술이라 PM은 텍스트로만 받고, confidence 산출(prompts:421~425)에 감성 방향·강도를 수치로 못 녹인다. "감성이 verdict와 상충하는데도 confidence HIGH" 같은 불일치를 잡지 못한다.
2. **UI에서 심리를 한눈에 못 봄** — social 카드가 다른 분석가와 똑같이 글 미리보기뿐. 사용자가 "지금 커뮤니티 심리가 긍정/부정 어느 쪽이고 얼마나 센지"를 한눈에 파악 불가.
3. **회고/패턴 학습 데이터 부재** — 결정 이력(`aiDecisionStore`)에 감성 수치가 없어, 나중에 "감성이 강했을 때 결정이 맞았나"를 회고할 정량 근거가 없다(q4).
4. **(부가) 프롬프트 품질 결함** — bull/bear 첫 줄 깨진 플레이스홀더(c) + 노후 시세 분석 위험(b) + 감성 서술 품질 편차(내러티브 가이드 부재, a).

### 1.4 컨텍스트 메모 (필수 인지)
- 스택: Next.js App Router(v16) + Tailwind v4 + TanStack Query v5 + axios + BFF(route handler). FE 컨벤션 `docs/rules/frontend.md` 8개 절 안에서만 짠다 — 본 PRD는 **커스텀훅 의무화**(이미 `useAIAnalysis` 존재, 이벤트만 확장), **`cn` 헬퍼**(배지 클래스 조합), **도메인 한 뎁스 폴더**(`stock` 도메인 내 유지), **`lib/copy/` 카피 분리**(밴드/배지 한글 카피는 `lib/copy/stock/aiAnalysis.ts`), **query key 단일 위치**(본 PRD는 TanStack Query 신규 키 없음 — SSE 직접 소비라 무관), **반응형**(배지가 좁은 카드에서 안 깨지게) 절이 직접 관련.
- 사용자 노출 문구는 한글 기본(ticker·API 필드·고유명사 제외). 밴드 라벨(예: "긍정적")·배지 카피는 `lib/copy/stock/aiAnalysis.ts`의 `COPY`에 추가(§3.6).
- 디자인 단일 진실 원천 = DESIGN.md(`npm run design:sync` → Tailwind theme). **배지 색은 hex/px 직타 금지** — 기존 감성 톤(긍정 emerald / 부정 red / 중립 slate)이 카드 코드에 이미 쓰이나, 신규 배지의 색·간격이 토큰에 없으면 DESIGN.md 경유로 추가(§8.5 디자이너 단계).
- 본 분석은 **로컬 전용**(route:202 Vercel 503). 라이브 AC는 로컬 `npm run dev` + claude/codex CLI 설치 전제.

---

## 2. 목표 (측정 가능)

1. **G1 — 정형 감성 출력**: `social` 에이전트 응답에 파싱 가능한 감성 블록(밴드 · 0~10 점수 · 신뢰도 · 한줄요약)이 고정 형식으로 포함된다 — `git grep -nE "감성|SENTIMENT|밴드|score" lib/prompts/stock/aiAnalysis.ts`로 지시 존재 확인 + 로컬 분석 1회 실행 시 social 응답 말미에 블록 출력(시각/로그 검증).
2. **G2 — 서버 파싱 + 이벤트**: route.ts가 social 응답에서 블록을 정규식으로 파싱해 `{ type: "sentiment", report: SentimentReport }` SSE 이벤트를 발행한다. 블록이 없거나 파싱 실패 시 **이벤트를 안 보내고 분석은 정상 진행**(에러·중단 0) — `git grep -nE "sentiment" app/api/stock/ai-analysis/route.ts` + 폴백 경로 코드 확인.
3. **G3 — 타입 안정성**: `AIAnalysisEvent` 유니온에 `sentiment` variant + `SentimentReport` 인터페이스가 추가되고 `npm run typecheck` 0 에러. 클라 소비(`fetchAIAnalysisStream`)는 유니온 확장만으로 자동 전달.
4. **G4 — UI 배지**: 로컬 분석 시 SNS 분석가 카드에 감성 배지(예: `긍정적 7/10` + 신뢰도 표기)가 표시된다. 블록이 없으면 배지 미표시(기존 카드와 동일). 두 뷰포트(모바일·데스크톱)에서 배지가 안 깨진다.
5. **G5 — PM 정량 반영**: PM 프롬프트에 정량 감성(밴드/점수/신뢰도)이 주입되고, confidence 산출 기준(prompts:421~425)에 "감성이 verdict 방향과 일치하면 확신↑/상충하면↓"가 명시된다 — `git grep -nE "감성" lib/prompts/stock/aiAnalysis.ts`로 PM system에 주입 확인. (q3 결정에 따라 verdict 가중 여부 결정 — PM 권고: confidence에만.)
6. **G6 — 카피 분리**: 밴드 라벨·배지 문구가 `lib/copy/stock/aiAnalysis.ts` `COPY`에 한글로 정의(인라인 하드코딩 0) — `git grep -nE "긍정적|부정적|중립" lib/copy/stock/aiAnalysis.ts`.
7. **G7 — 품질·무회귀**: `npm run typecheck`·`npm run lint`·`npm run build`·`npm run test` 0 에러. 감성 블록이 없는 경우(레거시/검색 실패) 기존 분석 플로우(progress/stream/report/debate/final/done) 회귀 0. `tailwind.theme.json` diff는 디자이너 토큰 추가분만(§8.5).
8. **G8 — (부가, 채택 시) 신선도 가드 / 버그 수정**: (b) 채택 시 KIS 일봉 최신 봉이 기준일로부터 N영업일(기본 ~10) 초과 노후면 분석 조기 중단 + 사용자 안내 메시지. (c) bull/bear 프롬프트 첫 줄에서 `${"{target}"}` 리터럴 제거 — `git grep -n '{target}' lib/prompts/stock/aiAnalysis.ts` 0건.

---

## 3. 범위 (In scope)

### 3.1 social 프롬프트 — 정형 감성 블록 출력 지시 (G1)

- `AGENT_PROMPTS.social.system`(prompts:153~170) 말미에 **고정 형식의 감성 요약 블록**을 출력하도록 지시 추가. 자유서술 마크다운 리포트는 그대로 유지하고, **리포트 맨 끝에** 파싱용 블록을 덧붙인다.
- 블록 형식(파싱 안정성을 위해 고정 마커 + 키:값):
  ```
  <!-- SENTIMENT
  band: 긍정적            # q1 결정 단계 중 하나 (라벨은 한글)
  score: 7                # 0~10 정수
  confidence: medium      # low | medium | high
  summary: 한 줄 요약(80자 이내, 한글)
  -->
  ```
  - HTML 주석(`<!-- ... -->`) 래퍼를 권장 — 마크다운 렌더 시 화면에 노출되지 않아 자유서술 리포트의 가독성을 해치지 않으면서 정규식 파싱이 쉽다. (대안: `### 감성 요약` 헤더 + 표 — 단 표는 파싱 깨지기 쉬움. PM 권고는 주석 마커.)
- 점수·밴드·신뢰도의 **의미·산출 기준**을 프롬프트에 명시: band/score는 SNS·커뮤니티에서 읽힌 개인 투자자 심리의 방향·강도, confidence는 "검색으로 확보한 표본의 양·일관성"(표본 적거나 상충 시 low). **score는 주가 전망이 아니라 현재 군중 심리의 긍정/부정 강도임**을 명확히(과신 방지, q2).
- LANG_INSTRUCTION(한글) 유지. 토큰 예산: 블록은 4줄 수준이라 기존 2,500자 한도(prompts:170) 내 흡수 — 한도 소폭 상향 검토는 구현 재량.

### 3.2 (부가 a) 감성 내러티브 품질 가이드

- social system 프롬프트에 `TradingAgents` 의 내러티브 품질 가이드 취지를 한국어로 이식: "비율을 추정으로 단정하지 말 것 · 표본 출처(어떤 커뮤니티/얼마나)를 밝힐 것 · 과열/공포 신호와 단순 노이즈를 구분할 것 · 근거 없는 확신 금지". 이는 §3.1 블록의 confidence 산출 품질과 직결.
- **묶음 판단**: §3.1과 같은 프롬프트 파일·같은 에이전트라 **같은 PR·같은 커밋 묶음에 포함**이 자연스럽다(§8.4).

### 3.3 서버 파싱 + `sentiment` SSE 이벤트 (G2)

- `route.ts`의 `runOneAgent`에서 `agentKey === "social"` 완료 시(현재 route:434 `state.socialReport = text`) **파싱 헬퍼 추가**: `parseSentimentBlock(text): SentimentReport | null`. 정규식으로 `<!-- SENTIMENT ... -->` 블록을 잡아 band(허용 라벨 화이트리스트 검증)·score(0~10 clamp)·confidence(low|medium|high)·summary를 추출.
- 파싱 성공 시 `send({ type: "sentiment", report })` 발행 + 파싱된 값을 `state`에 저장(PM 주입용 — §3.5). `report` 이벤트(자유서술 전문)는 **기존대로 발행 유지**(카드 전체보기는 원문 그대로).
- **graceful 폴백**: 블록 없음/형식 깨짐/값 범위 이탈 → `sentiment` 이벤트 미발행 + state에 감성 미저장 + 로그 1줄(`console.log`). 분석 파이프라인은 중단 없이 계속. PM 주입도 "감성 데이터 없음"으로 분기.
- 파싱은 서버 전용(route handler 안). `parseLooseJson`(route:61~73) 옆에 `parseSentimentBlock`을 둔다.

### 3.4 타입 + 이벤트 유니온 (G3)

- `lib/types/stock/aiAnalysis.ts`에 추가:
  ```ts
  export type SentimentBand = /* q1 결정 — 6단계 또는 7단계 리터럴 유니온 */;
  export type SentimentConfidence = "low" | "medium" | "high";
  export interface SentimentReport {
    band: SentimentBand;
    score: number;        // 0~10
    confidence: SentimentConfidence;
    summary: string;
  }
  ```
- `AIAnalysisEvent` 유니온(type:61~77)에 `| { type: "sentiment"; report: SentimentReport }` 추가.
- 밴드 라벨↔색 매핑은 타입 레벨이 아니라 **카피(`lib/copy`)+컴포넌트**에서(§3.6). 타입은 밴드 식별자만.

### 3.5 PM 프롬프트 — 정량 감성 주입 + confidence 반영 (G5)

- PM(`portfolio_manager`) system 프롬프트의 confidence 산출 기준(prompts:421~425)에 한 항목 추가: **"SNS 정형 감성(밴드/점수/신뢰도)이 verdict 방향과 일치하면 확신을 강화, 상충하면 확신을 낮춘다. 단 감성 confidence가 low면 가중을 약하게 둔다."**
- PM user 프롬프트의 `[SNS·커뮤니티 심리]` 블록(prompts:463~465) 또는 system 주입부에, 자유서술 `socialReport`와 **별도로** 정형 감성 한 줄을 명시 주입: 예 `[SNS 정형 감성] 밴드: 긍정적 · 점수: 7/10 · 신뢰도: 보통`. 감성 미파싱 시 "정형 감성: 데이터 없음(자유서술 리포트만 참고)"로 분기.
- **q3 결정에 종속**: PM 권고는 **confidence에만 반영**(verdict 자체 가중 X — 감성은 보조신호). q3가 "verdict에도 가중" 결정이면 verdict 선택 기준(prompts:432~448)에도 감성 항목을 추가(단 over-weighting 위험 — §8.3).
- 주입은 `runOneAgent`의 PM 분기(route:360~362 `prompts.system + pastDecisionContext`)와 동일 패턴으로 — `pastDecisionContext`처럼 `sentimentContext` 문자열을 만들어 system 또는 user에 결합.

### 3.6 UI — SNS 분석가 카드 감성 배지 (G4, G6)

- `hooks/stock/useAIAnalysis.ts`: `handleEvent` switch(hooks:113~193)에 `case "sentiment"` 추가 → 신규 상태 `sentiment: SentimentReport | null` 세팅. `resetResults`(hooks:80~89)에서 초기화. 훅 반환(`AIAnalysisHook`)에 `sentiment` 노출.
- `components/stock/ai-analysis/AnalystCard.tsx`: social 카드(`meta.key === "social"`)에 한해 헤더 또는 본문 상단에 **감성 배지** 렌더 — 밴드 라벨 + `점수/10` + 신뢰도. 배지 색은 밴드→톤 매핑(긍정 계열 emerald / 부정 계열 red / 중립 slate, 기존 카드 톤과 정합). `cn` 헬퍼로 클래스 조합, 하드코딩 hex/px 금지(토큰 사용 — 신규 필요분은 §8.5 디자이너). 비-social 카드는 무변경.
  - 대안: AnalystCard 확장 대신 `components/stock/ai-analysis/SentimentBadge.tsx` 신규 분리(재사용·테스트 용이). 구현 재량 — 단 도메인 한 뎁스(`stock/ai-analysis`) 유지.
- **신뢰도 표기 톤(q2)**: 과신 유도 방지 — 점수만 크게 강조하지 말고 신뢰도(낮음/보통/높음)를 동등 비중으로 병기. 신뢰도 low면 "참고" 뉘앙스 카피. 정확한 표기는 §9 q2 + 디자이너.
- `lib/copy/stock/aiAnalysis.ts` `COPY`에 `sentiment` 섹션 추가: 밴드 라벨(한글, q1 단계 수만큼)·배지 접미("/10")·신뢰도 라벨(낮음/보통/높음)·미표시 처리 등. 인라인 한글 0.
- (선택) `FinalVerdictCard.tsx`에 PM이 감성을 반영했음을 보조 표기(예: confidence 근거 툴팁 `confidenceBasis`(copy:88)에 "감성 정합 반영" 추가). 범위 최소화를 위해 **선택**으로 두고 q3/디자이너와 함께 결정.

### 3.7 (부가 b) 시세 신선도 가드

- `route.ts` 시세 페치 직후(route:314~321 `warmupOk` 체크 인접)에 **최신 봉 날짜 가드** 추가: `sorted`의 마지막 봉 날짜가 기준일(오늘) 대비 N영업일(기본 ~10, 상수화) 초과로 오래되면 `send({ type: "error", message: "최신 시세를 불러오지 못해 분석을 중단했어요. 잠시 후 다시 시도해 주세요." })` 후 close. 콜드스타트/휴장 직후 옛 가격 분석 방지.
- 임계값(영업일/달력일, 정확한 일수)은 구현 시 상수로 노출. 주말·연휴 오탐 방지를 위해 영업일 기준 또는 여유 버퍼(~10일) 권장.

### 3.8 (부가 c) bull/bear 프롬프트 플레이스홀더 버그 수정

- bull(prompts:178)·bear(prompts:212) system 첫 줄의 `\${"{target}"}` 를 의도된 형태로 수정: 종목 정보는 user 프롬프트에서 `s.ticker`로 이미 전달되므로 **system에서 플레이스홀더를 제거**("당신은 주어진 종목에 투자할 것을 적극 주장하는 강세 연구원입니다" 류)하거나, system을 함수형으로 바꿔 `s.ticker`를 실제 치환. **권고: system에서 플레이스홀더 제거**(가장 작은 변경, 함수형 전환 불필요).

### 3.9 (선택, q4) 회고 데이터 저장

- q4 결정에 따라 `aiDecisionStore.ts`의 `AIDecisionEntry`에 `sentiment_score?: number | null`(+필요 시 `sentiment_band`) 추가, `useAIAnalysis`의 `done` 분기(hooks:177~190 `saveDecision`)에서 동반 저장. **q4 미채택 시 본 절 비범위**.

### 3.10 분할 vs 단일

- §3.1~3.6(핵심 감성 흐름)은 강결합 — **한 PR 한 단위**. 부가 (a)는 social 프롬프트라 핵심에 자연 포함. 부가 (b)(c)는 독립적이라 분리 가능하나 변경량이 작고(각 5~20줄) 같은 파일군(route.ts/prompts.ts)이라 **같은 PR에 묶되 커밋 분리** 권고(§8.4). q4(저장)는 선택.

---

## 4. 비범위 (Out of scope)

- **별도 감성 전용 LLM 호출/에이전트 신설** — 본 PRD는 기존 `social` 응답에 블록을 동봉할 뿐. 새 에이전트·새 API·추가 모델 호출 0(토큰/레이턴시 증가 0이 핵심 제약).
- **외부 감성 데이터 소스 연동**(전용 감성 API, 뉴스 감성 스코어링 서비스 등) — social의 WebSearch 결과 기반 LLM 자체 판정만. 외부 정량 데이터 추가는 후속.
- **PM verdict 자체에 감성 가중**(q3가 "confidence만"으로 결정될 경우) — verdict 알고리즘 변경은 비범위. q3가 "verdict 가중"이면 §3.5에 한정 포함.
- **다른 분석가(market/news/fundamentals)의 정형화** — 본 PRD는 social만. 뉴스 감성·기술 신호 정형화는 별도 트랙.
- **감성 시계열·차트화**(시간에 따른 감성 추이 그래프) — 단발 분석 1회 배지만. 추이는 회고 데이터(q4) 누적 후 별도 PRD.
- **Supabase 영구 저장** — 회고 데이터는 q4 채택 시에도 localStorage(`aiDecisionStore`) 한정. DB는 MVP 비범위(AGENTS.md).
- **Vercel(프로덕션) 지원** — 본 분석은 로컬 전용(route:202 503). 본 PRD가 이 제약을 바꾸지 않는다.
- **Slack봇/엔진 측 변경** — 봇은 SSE 중계만, 엔진은 본 분석 비소유. 본 PRD는 프론트 레포 안에서 완결.
- **감성 배지 다중 시안·A/B** — 배지 1종 확정. 캠페인/실험은 별도.

---

## 5. 수용 기준 (AC)

> 라이브 검증은 **로컬 `npm run dev` + claude 또는 codex CLI 설치** 전제(route:202 Vercel 503). `<로컬>` = `next dev` 환경. 코드 존재 검증은 `git grep`/`find`.

### 5.1 정형 감성 출력 + 파싱 (G1·G2)
- **AC-1 (프롬프트 지시 존재)**: `git grep -nE "SENTIMENT|감성 요약 블록|band|score" lib/prompts/stock/aiAnalysis.ts` 가 social system 프롬프트 내 정형 블록 지시를 1건 이상 보여준다.
- **AC-2 (서버 파싱 함수)**: `git grep -n "parseSentimentBlock\|sentiment" app/api/stock/ai-analysis/route.ts` 가 파싱 헬퍼 + `send({ type: "sentiment" ...})` 발행을 보여준다.
- **AC-3 (라이브 발행)**: `<로컬>`에서 임의 종목(예 005930) 분석 1회 실행 시, social 완료 직후 `sentiment` SSE 이벤트가 1회 발행된다(devtools Network EventStream 또는 hooks 콘솔 로그로 확인). `report`(social 전문) 이벤트도 기존대로 발행.
- **AC-4 (graceful 폴백)**: social 응답에 감성 블록이 없는 경우(또는 형식 깨짐), `sentiment` 이벤트가 **발행되지 않고** 분석이 `done`까지 중단 없이 진행된다. 파싱 실패가 `error` 이벤트나 예외로 이어지지 않는다 — 폴백 코드 경로 + 로그 1줄 확인.

### 5.2 타입 (G3)
- **AC-5 (타입 확장)**: `git grep -nE "SentimentReport|SentimentBand|\"sentiment\"" lib/types/stock/aiAnalysis.ts` 가 인터페이스 + 이벤트 variant를 보여준다. `npm run typecheck` 0 에러.

### 5.3 PM 정량 반영 (G5)
- **AC-6 (PM 주입)**: `git grep -nE "정형 감성|감성.*verdict|감성.*확신" lib/prompts/stock/aiAnalysis.ts` 가 PM system의 confidence 산출 기준에 감성 정합 항목을, user/주입부에 정형 감성 한 줄 주입을 보여준다.
- **AC-7 (감성 미존재 분기)**: 감성 미파싱 시 PM 주입 컨텍스트가 "감성 데이터 없음"으로 분기됨(빈 문자열 주입으로 PM 응답이 깨지지 않음) — 코드 확인 + 라이브 1회(블록 없는 응답에서도 `final` 정상 발행).

### 5.4 UI 배지 (G4·G6)
- **AC-8 (배지 표시)**: `<로컬>` 분석 시 SNS 분석가 카드에 감성 배지(밴드 라벨 + `점수/10` + 신뢰도)가 표시된다. 감성 미존재 시 배지 미표시(기존 카드와 동일 — 회귀 0).
- **AC-9 (반응형)**: 모바일·데스크톱 두 뷰포트에서 배지가 카드 폭을 넘치거나 한글이 세로로 깨지지 않는다(`useBreakpoint`/Tailwind 반응형, max-w 명명 토큰 함정 회피).
- **AC-10 (카피 분리)**: `git grep -nE "긍정적|부정적|중립|/10|낮음|보통|높음" lib/copy/stock/aiAnalysis.ts` 가 밴드·배지·신뢰도 한글 카피를 보여준다. 컴포넌트에 인라인 한글 0(`git grep -n "긍정적\|부정적" components/stock/ai-analysis/` 0건 또는 카피 import만).
- **AC-11 (토큰 정합)**: 배지 색·간격이 hex/px 직타가 아니라 Tailwind 토큰 — `git grep -nE "#[0-9a-fA-F]{6}|\[[0-9]+px\]" components/stock/ai-analysis/SentimentBadge.tsx`(또는 AnalystCard 배지부) 0건(기존 카드 패턴과 동일 토큰 사용).

### 5.5 부가 (G8, 채택 시)
- **AC-12 (b 신선도 가드)**: (b) 채택 시 마지막 봉이 임계 초과 노후인 케이스에서 분석이 조기 중단되고 안내 `error` 메시지가 표시된다 — 가드 코드 + 임계 상수 확인. 정상(최신) 시세에선 무영향(회귀 0).
- **AC-13 (c 버그 수정)**: `git grep -n '{target}' lib/prompts/stock/aiAnalysis.ts` 0건. bull/bear system 첫 줄에 깨진 플레이스홀더 없음.

### 5.6 회고 저장 (q4, 채택 시)
- **AC-14 (q4 저장)**: q4 채택 시 `git grep -n "sentiment_score\|sentiment_band" lib/api/stock/aiDecisionStore.ts hooks/stock/useAIAnalysis.ts` 가 필드 + 저장 호출을 보여주고, 분석 완료 후 localStorage `ai-decision-log` 엔트리에 감성값이 동반 저장된다. **q4 미채택 시 본 AC 비활성.**

### 5.7 품질·무회귀 (G7)
- **AC-15 (품질 게이트)**: `npm run typecheck`·`npm run lint`·`npm run build`·`npm run test` 0 에러.
- **AC-16 (기존 플로우 무회귀)**: 감성 블록이 없는 레거시 social 응답에서도 progress/stream/report/debate/final/done 전체 플로우가 정상 동작(재개·중지·재시도 포함). `AIAnalysisEvent` 유니온 확장이 기존 이벤트 처리를 깨지 않는다.
- **AC-17 (디자인 토큰)**: `tailwind.theme.json` diff는 디자이너가 추가한 감성 배지 토큰분에 한정(§8.5). 핵심 흐름 자체는 토큰 변경 없이 기존 톤 재사용.

---

## 6. 가정 · 제약

- **선행 전제**: AI 멀티에이전트 분석 파이프라인이 main 머지 상태(`#122` 공급자 선택, `#123` PM 결론 재설계 포함). 본 PRD는 그 위에 감성 레이어를 얹는다.
- **로컬 전용 제약**: 분석은 `next dev`에서만(route:202 Vercel 503). 라이브 AC는 로컬 + claude/codex CLI 설치 환경에서 검증. CI(`build/typecheck/lint/test`)는 코드 정합만 검증(실 LLM 호출 없음).
- **LLM 형식 준수 가정**: social 모델이 지시한 블록 형식을 항상 정확히 따르지는 않는다 — 그래서 **graceful 폴백이 필수 설계 제약**(블록 누락/깨짐 시 무시). band 라벨은 화이트리스트 검증, score는 clamp(0~10).
- **score 신뢰성 한계(q2)**: LLM이 SNS 검색만으로 매기는 0~10은 본질적으로 추정 — confidence 필드로 보완하되 UI는 과신 유도 금지(점수와 신뢰도 동등 비중). 이는 정량 데이터가 아니라 **보조 신호**로 자리매김.
- **비용 제약**: 추가 LLM 호출·외부 API·모델 변경 0. 토큰/레이턴시 증가 0(블록은 기존 응답 말미 4줄). 이 제약을 깨는 설계(예: 별도 감성 호출)는 비범위(§4).
- **디자인 토큰**: 배지 색·간격은 DESIGN.md 경유(hex/px 직타 금지). 신규 토큰이 필요하면 디자이너가 DESIGN.md에 추가 후 `npm run design:sync`(§8.5). 기존 emerald/red/slate 톤 재사용 시 토큰 추가 불필요할 수 있음.
- **카피**: 사용자 노출 한글(`lib/copy/stock/aiAnalysis.ts`). 밴드 라벨 한글화(q1 단계 수 확정 후).
- **도구 가정**: `git grep`/`find` 코드 검증 + 로컬 분석 1회 + devtools EventStream/콘솔 로그로 라이브 AC 재현. 품질은 `npm run typecheck/lint/build/test`.

---

## 7. 참고

- 인접 코드(본 PRD 변경/참조 지점):
  - `lib/prompts/stock/aiAnalysis.ts` — `AGENT_PROMPTS.social`(152~174, 블록 지시·내러티브 가이드), `portfolio_manager`(390~491, confidence 기준 421~425·감성 주입), bull/bear(178·212 플레이스홀더 버그).
  - `app/api/stock/ai-analysis/route.ts` — `parseLooseJson`(61~73 옆에 `parseSentimentBlock`), `runOneAgent` social/PM 분기(434·360~362), 시세 페치·`warmupOk`(298~321, 신선도 가드 자리).
  - `lib/types/stock/aiAnalysis.ts` — `AIAnalysisEvent` 유니온(61~77), `AgentKey`, `FinalDecision`.
  - `hooks/stock/useAIAnalysis.ts` — `handleEvent` switch(113~193, `sentiment` case), `resetResults`(80~89), `AIAnalysisHook` 반환(19~45), `done`/`saveDecision`(177~190, q4).
  - `lib/api/stock/aiAnalysis.ts` — `fetchAIAnalysisStream`(35~85, 유니온 확장으로 자동 전달).
  - `components/stock/ai-analysis/AnalystCard.tsx`(배지 렌더), `FinalVerdictCard.tsx`(선택 보조 표기 — confidenceBasis), `AIAnalysisPanel.tsx`.
  - `lib/copy/stock/aiAnalysis.ts`(밴드/배지/신뢰도 카피 — `COPY`), `lib/api/stock/aiDecisionStore.ts`(q4 저장).
- 룰·문서: `docs/rules/frontend.md`(8개 절 — 커스텀훅·cn·도메인 한 뎁스·lib/copy·반응형·query key), `AGENTS.md`(라벨 흐름·단일 PR 룰·BFF), `docs/rules/design-md.md`(디자이너 단계 시).
- 외부: `TauricResearch/TradingAgents` `SentimentReport`(밴드 + 0~10 score + low/medium/high confidence + 내러티브 품질 가이드 — 본 PRD의 이식 원본).
- 기억(MEMORY): max-w 명명 토큰 함정(배지 폭 — `max-w-xs` 금지, 명시값), 디자인 토큰 SSOT(theme.json 직접편집 금지, DESIGN.md 경유), 다크모드 `--fs-` 변수 + colors-dark 키정합(배지 색 추가 시 양쪽 정합).

---

## 8. 영향 분석 (Impact)

### 8.1 변경 라인 추정

| 파일 | 신규/수정 | 추정 라인 | 비고 |
|---|---|---|---|
| `lib/prompts/stock/aiAnalysis.ts` | 수정 | +25~45 | social 블록 지시(a 포함) + PM confidence/주입 항목 + bull/bear 버그(c) |
| `app/api/stock/ai-analysis/route.ts` | 수정 | +25~50 | `parseSentimentBlock` + `sentiment` 발행 + PM `sentimentContext` 주입 + (b) 신선도 가드 |
| `lib/types/stock/aiAnalysis.ts` | 수정 | +10~18 | `SentimentReport`/`SentimentBand`/`SentimentConfidence` + 이벤트 variant |
| `hooks/stock/useAIAnalysis.ts` | 수정 | +10~20 | `sentiment` 상태 + case + reset + 반환 (+q4 저장) |
| `components/stock/ai-analysis/SentimentBadge.tsx` | 신규(또는 AnalystCard 수정) | +25~50 | 배지 — 디자이너 토큰 의존 |
| `components/stock/ai-analysis/AnalystCard.tsx` | 수정 | +5~15 | social 카드 배지 슬롯 |
| `lib/copy/stock/aiAnalysis.ts` | 수정 | +8~15 | 밴드/배지/신뢰도 카피 |
| `lib/api/stock/aiDecisionStore.ts` | 수정(선택 q4) | +3~6 | `sentiment_score` 필드 |
| `tailwind.theme.json`/DESIGN.md | 수정(디자이너, 필요 시) | 토큰 추가분 | 신규 배지 색·간격이 토큰에 없을 때만 |

→ 합계 대략 **+120~230 라인**(q4·디자이너 토큰 가감). 외부 의존 추가 0. 핵심 도메인(stock AI 분석) 응집. **디자이너 의존 있음 → 단일 PR이되 디자이너 커밋이 같은 브랜치에 선행**(§8.5).

### 8.2 커밋 분할 권고 (단일 PR 내부)

1. `docs(prd): ai-sentiment-structured PRD 추가`(본 PRD — 브랜치 첫 commit).
2. `docs(design): 감성 배지 토큰·스펙`(디자이너 — 신규 토큰 필요 시. 기존 톤 재사용이면 생략).
3. `feat(ai-analysis): social 정형 감성 블록 출력 + 내러티브 가이드`(prompts a 포함).
4. `feat(ai-analysis): 감성 블록 서버 파싱 + sentiment SSE 이벤트 + 타입`.
5. `feat(ai-analysis): PM 프롬프트 정량 감성 주입 + confidence 정합`.
6. `feat(ai-analysis): SNS 카드 감성 배지 + 훅 상태 + 카피`.
7. `fix(ai-analysis): bull/bear 프롬프트 깨진 플레이스홀더 제거`(c — 독립).
8. `feat(ai-analysis): 시세 신선도 가드 (노후 일봉 조기 중단)`(b — 독립).
9. `feat(ai-analysis): 결정 이력에 sentiment_score 저장`(q4 — 채택 시).

### 8.3 회귀 위험

- **(상) PM 프롬프트 변경이 결정 품질 회귀**: confidence 기준에 감성 항목을 추가하면 PM이 감성에 과민 반응해 기존 양호한 결정 톤이 흔들릴 수 있다. → q3 권고(confidence에만, verdict 가중 X) + "감성 confidence low면 약하게" 가드. 감성 미존재 분기(AC-7)로 레거시 동작 보존. 로컬 비교 검증(감성 on/off 결정 차이) 권장.
- **(중) LLM 형식 미준수 → 파싱 실패 빈발**: 모델이 블록을 안 내거나 형식을 어기면 배지가 자주 안 뜬다. → graceful 폴백(AC-4)으로 기능적 회귀는 없으나 "표시율"이 낮을 수 있다. 주석 마커 + 명확한 형식 지시 + score clamp/band 화이트리스트로 견고화. 표시율은 로컬 다종목 스폿체크.
- **(중) SSE 이벤트 유니온 확장 회귀**: `sentiment` variant 추가가 `fetchAIAnalysisStream`/`handleEvent`의 기존 switch를 깨지 않아야(미처리 케이스 무시). → AC-16 + typecheck(유니온 exhaustive 체크가 있으면 case 추가 강제).
- **(중) verdict 가중 채택 시 over-weighting**: q3가 "verdict에도"면 군중 심리(역지표일 수 있음)가 verdict를 과도하게 흔들 위험 → PM 권고는 confidence 한정.
- **(저) 배지 토큰/다크모드 불일치**: 신규 색 추가 시 `colors-dark` 키정합 누락하면 빌드 throw(MEMORY). → 디자이너 단계에서 DESIGN.md 양쪽 정합 + `design:sync`.
- **(저) (b) 신선도 가드 오탐**: 임계가 짧으면 주말/연휴 직후 정상 분석을 막는다. → 영업일 기준 또는 ~10일 버퍼 + AC-12(정상 시세 무영향).
- **(저) (c) 플레이스홀더 수정이 bull/bear 톤 변화**: system 첫 줄 문구 변경이 논조에 영향 줄 수 있으나 미미 → 종목은 user에서 이미 전달, 의미 보존.

### 8.4 분할 vs 단일 결정

핵심 흐름(프롬프트↔파싱↔이벤트↔훅↔UI↔PM)은 강결합 → **단일 PR**. 부가 (b)(c)는 독립적이나 변경량이 작고 같은 파일군이라 **같은 PR에 커밋 분리**로 동봉(별도 PR로 쪼개면 오버헤드만 큼). 디자이너 토큰 의존이 있으나 배지 1종 소규모라 같은 브랜치에서 디자이너 commit 선행으로 흡수 — **분할 불요**. q4(저장)는 결정에 따라 가감.

### 8.5 UX/UI Designer 단계 필요 (명시)

- **본 PRD는 UI를 포함**(SNS 카드 감성 배지). 따라서 **UX/UI Designer 단계가 필요**하다(`feature/ai-sentiment-structured` 브랜치에서 frontend-dev 구현 전 디자이너 commit).
- 디자이너 산출: 밴드→색 매핑(긍정/중립/부정 톤 — 기존 카드 emerald/red/slate 재사용 가능 여부 판단), 점수·신뢰도 동시 표기 레이아웃(과신 방지 톤, q2), 배지 크기·간격(좁은 카드·모바일 대응). **신규 색·간격이 토큰에 없으면 DESIGN.md에 추가 후 `npm run design:sync` → `tailwind.theme.json`**(코드 hex/px 직타 금지, 다크모드 `colors-dark` 키정합 필수).
- 기존 톤만으로 충분하다고 디자이너가 판단하면 토큰 추가 없이 카피·레이아웃 가이드만으로 종료 가능(§8.2 커밋 2 생략).

---

## 9. OPEN QUESTION

> 4건 전부 **[RESOLVED]** (2026-06-16, 사용자 결정 — 전부 PM 권고 채택). q1=7단계 · q2=점수+신뢰도 병기 · q3=confidence에만 · q4=MVP 포함.

- **[RESOLVED ✅ 7단계] q1 — 감성 밴드 단계 수: 업스트림 6단계 vs 한국어 7단계?**
  - **결정: 7단계** (매우 부정적 · 부정적 · 약간 부정적 · 중립 · 약간 긍정적 · 긍정적 · 매우 긍정적). 0~10 score 중앙정렬(5=중립). LLM 분류 안정성이 낮게 나오면 5단계로 축소 폴백.
  - 업스트림 `TradingAgents` `SentimentReport`는 **6단계**. 한국어 자연스러운 대칭 표현은 **7단계**(매우 부정적 · 부정적 · 약간 부정적 · 중립 · 약간 긍정적 · 긍정적 · 매우 긍정적)로 중앙(중립)이 명확.
  - **트레이드오프**: 6단계는 업스트림 정합·중립 모호(짝수라 가운데 없음→강제 방향성), 7단계는 한국어 대칭·중립 명확하나 LLM이 7개 라벨을 일관 분류하기 다소 어렵고 0~10 score와의 매핑이 늘어남.
  - **PM 권고**: **7단계(중립 포함 대칭)** 채택. 이유 — (1) 한국어 배지 라벨이 자연스럽고 중립이 명확해 사용자 직관에 맞음, (2) 0~10 score가 이미 연속 강도를 담으므로 밴드는 라벨링 역할 → 라벨 일관성은 화이트리스트 검증 + score와 정합 규칙(예: score 4~6=중립대)으로 보강 가능, (3) score(0~10 홀수 중앙 5)와 7단계가 중앙 정렬돼 매핑이 깔끔(score 0~1=매우부정 … 5=중립 … 9~10=매우긍정). 단 LLM 분류 안정성이 낮게 나오면 5단계로 축소를 폴백으로 둔다.

- **[RESOLVED ✅ 점수+신뢰도 병기] q2 — 0~10 score의 신뢰성과 UI 표기 톤(과신 방지)?**
  - **결정**: 밴드 라벨 1차 + `점수/10` 보조 + 신뢰도(낮음/보통/높음) 병기. 점수만 강조 금지, "커뮤니티 심리 추정" 명시. 신뢰도 low면 약화 톤. 시각 위계는 디자이너 확정.
  - LLM이 SNS 검색만으로 매기는 0~10은 본질적으로 추정 — 정밀 수치처럼 보이면 사용자가 과신할 위험.
  - **PM 권고**: score는 confidence 필드와 **항상 함께** 표기하고, UI에서 **점수만 크게 강조하지 않는다**. 배지는 `밴드 라벨` 1차 + `점수/10` 보조 + `신뢰도(낮음/보통/높음)` 병기. 신뢰도 low면 "참고" 뉘앙스(흐린 톤/괄호 처리)로 약화. 카피에 "커뮤니티 심리 추정" 류 명시로 "주가 예측"이 아님을 분명히. 디자이너가 점수·신뢰도 시각 위계를 확정(§8.5).

- **[RESOLVED ✅ confidence에만] q3 — PM 연결 강도: confidence에만 반영 vs verdict 자체에도 가중?**
  - **결정: confidence에만 반영.** verdict 가중 X. (아래 근거 유지)
  - **PM 권고: confidence에만 반영(전자).** 이유 — 감성은 군중 심리로 **역지표(과열=고점, 공포=저점)일 수 있는 보조 신호**다. verdict(방향 결정)에 직접 가중하면 군중 심리가 펀더멘털/기술 신호를 과도하게 흔들 위험(over-weighting, §8.3). confidence(확신도)에만 "감성이 verdict와 일치하면↑/상충하면↓, 감성 confidence low면 약하게"로 반영하면, 방향은 4축 분석·토론·리스크가 결정하고 감성은 그 확신을 보정하는 적절한 역할에 머문다. verdict 가중이 필요하다는 강한 요구가 있으면 §3.5에 한정 추가하되 가중치를 매우 낮게.

- **[RESOLVED ✅ MVP 포함] q4 — 회고 데이터에 `sentiment_score` 동반 저장을 MVP에 넣을까?**
  - **결정: MVP 포함** (저장만, 표시 UI는 비범위). `AIDecisionEntry`에 `sentiment_score?`/`sentiment_band?` + `done` 분기 저장.
  - 결정 이력(`aiDecisionStore`, localStorage)에 감성 점수를 함께 저장하면 나중에 "감성이 강했을 때 결정이 맞았나"를 회고할 정량 근거가 생긴다. 비용은 필드 1~2개 + 저장 호출 1줄로 매우 작다.
  - **PM 권고**: **MVP에 포함(소규모).** 이유 — (1) 변경량 극소(`AIDecisionEntry`에 `sentiment_score?`/`sentiment_band?` + `done` 분기 1줄), (2) 지금 안 넣으면 과거 분석의 감성값이 영구 유실돼 나중에 소급 불가, (3) 추후 감성 추이/회고 기능(§4 후속)의 데이터 토대. 단 표시 UI는 비범위(저장만). q1/q2와 무관하게 독립 채택 가능. 부담되면 빼고 후속으로 미뤄도 무방(핵심 흐름과 분리됨).

---

## 10. 다음 단계 (참고 — 최종 PR 본문에서 다룸)

- **디자인(UX/UI Designer)**: 감성 배지 — 밴드→색 매핑(기존 emerald/red/slate 재사용 가능성 우선 검토), 점수·신뢰도 동시 표기 위계(q2 과신 방지), 모바일 대응. 신규 토큰 필요 시 DESIGN.md + `design:sync`(다크모드 키정합).
- **구현(frontend-dev + api-integration-dev)**: 외부 의존 0. 커밋 분할 §8.2. q1(밴드 단계)·q3(PM 연결) 결정 후 §3.1/3.4/3.5 확정. graceful 폴백·타입 유니온 exhaustive·반응형 배지가 구현 핵심.
- **QA**: 로컬 분석 라이브(감성 on/off 두 케이스) + 두 뷰포트 배지 + PM confidence 정합 스폿체크 + 부가 (b)(c) 회귀.

---

산출물: docs/prd/ai-sentiment-structured.md | UI: yes (SNS 카드 감성 배지 — UX/UI Designer 단계 필요) | OPEN QUESTION: 4건 미결 (q1 밴드 단계 수·q3 PM 연결 강도가 구현 착수 전 결정 필요)
