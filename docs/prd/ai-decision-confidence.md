# PRD: ai-decision-confidence

- **slug**: `ai-decision-confidence`
- **작성일**: 2026-06-18
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #130 (`/analyze` 분석 결과 카드 탭) 후속. AI 최종 판단 멀티에이전트 파이프라인(PR #113 / `ai-analysis-improvement`)에서 산출되는 `confidence` 필드 품질 이슈.
- **UI 포함 여부**: **yes (경량)** — 카드/모달 chip 의 라벨·값 교체. 기존 chip 스타일(MetaChip·라이브 패널 폴백) 재사용이라 신규 시각 요소 없음.
- **선행 / 후행 관계**: §3-1 "선행 조사" 가 §3-2 "해결 적용" 의 전제였다. 조사 완료(§1-3) → 옵션 확정.

---

## 1. 배경 / 문제

`/analyze` 의 "분석 결과" 탭(PR #130)은 지금까지 분석한 종목을 카드로 보여준다. 각 카드는 멀티에이전트 AI 분석(4분석가 + 강세/약세 토론 + 리스크 3팀 + 포트폴리오 매니저)의 최종 판단을 요약하며, 다음 세 지표를 chip 으로 노출한다.

- **verdict (판정)**: 분할매수 / 신규진입주의 / 분할매도 등
- **time_horizon (유효 기간)**: 단기 / 중기 / 장기
- **confidence (확신도)**: 높음 / 보통 / 낮음

사용자 보고: **현재 저장된 카드 전부 confidence 가 "보통(MEDIUM)" 으로 표시된다. 변별이 0이다.**

> 사용자: "확신도가 다 보통이면 이걸 볼 필요가 있나? 왜 이렇게 나오는지 분석 필요."

같은 카드에서 verdict 와 time_horizon 은 변별이 된다. 특히 time_horizon 은 "중기 다수 + 단기 1" 로 최소 한 번은 다른 값으로 튀었다. 반면 confidence 는 단 한 번도 "보통" 이외 값을 내지 않았다. 변별 없는 지표는 화면 공간만 차지하고 사용자에게 거짓 정보 밀도를 준다(모든 분석이 똑같은 확신도라는 잘못된 인상). 정직성·신뢰도 측면에서 방치할 수 없다.

### 1-1. 기술 추적 (확정 사실)

문제 발생 경로를 코드에서 추적한 결과는 다음과 같다(모두 확인됨).

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | `confidence: "HIGH" \| "MEDIUM" \| "LOW"` — 3점 척도 enum | `lib/types/stock/aiAnalysis.ts` (FinalDecision) |
| 2 | 카피 매핑은 단순 1:1 (`HIGH→높음 / MEDIUM→보통 / LOW→낮음`). **매핑이 값을 뭉뚱그리지 않음** | `lib/copy/stock/aiAnalysis.ts` |
| 3 | 값의 출처 = 포트폴리오 매니저(LLM)가 출력한 JSON 을 `parseLooseJson` 으로 파싱 | `app/api/stock/ai-analysis/route.ts` PM 파싱 블록 |
| 4 | **결정적 폴백**: PM 이 confidence 를 안 내거나 비정형 값이면 무조건 `"MEDIUM"` 으로 강제. `time_horizon` 도 같은 패턴으로 `"중기"` 폴백 | `route.ts` confidence/time_horizon 폴백 |
| 5 | verdict 가 유효 enum 일 때만 finalDecision 생성·저장(게이트). 즉 **저장된 카드는 모두 JSON 파싱 성공 케이스** → verdict/time_horizon 이 변별된다는 건 파싱·필드 추출 자체는 정상 작동한다는 뜻 | `route.ts` verdict 게이트 |
| 6 | 프롬프트 rubric 이 정성적: `HIGH`="다수 같은 방향 + 데이터 명확", `MEDIUM`="방향은 잡히나 일부 이견/불확실성", `LOW`="신호 상충/데이터 부족". **MEDIUM 이 가장 넓은 basin** | `lib/prompts/stock/aiAnalysis.ts` confidence rubric |
| 7 | 저장/조회: Supabase `ai_analysis_decisions` 테이블 upsert, 읽을 때 추가 가공 없음 → **저장 시점 값이 그대로 표시** | `lib/server/ai/decisionStore.ts`, `app/api/stock/ai-analysis/decisions/route.ts` |

### 1-2. 미확정 핵심 (런타임 데이터 없이는 단정 불가)

모든 카드가 "보통" 인 **결정적 원인**이 아래 둘 중 무엇인지는 런타임 데이터 없이 단정할 수 없다. 이 분기는 §9 OPEN QUESTION 에서 다루며, 해결 옵션 선택을 좌우한다.

- **가설 A — 모델 중앙 앵커링**: PM(LLM)이 매번 실제로 `"MEDIUM"` 을 출력. 3점 척도 + 정성 rubric 상 MEDIUM 이 가장 넓은 basin 이라 대부분 분석이 여기로 수렴. → 데이터·필드는 정상, 모델이 변별을 못 함.
- **가설 B — 필드 누락 → 폴백**: PM 이 `confidence` 키를 빠뜨리거나 비정형 값을 출력 → `route.ts` 의 `"MEDIUM"` 폴백이 매번 발동. → 표시되는 "보통" 은 실제 모델 판단이 아니라 코드 기본값(신호 오염).

**가설 B 를 의심하게 하는 정황**: time_horizon 은 같은 폴백 패턴을 쓰는데도 1개가 "단기" 로 튀었다. 반면 confidence 는 단 한 번도 안 튄다. **단정 금지 — 데이터로 확인.**

### 1-3. 조사 결과 (RESOLVED — 2026-06-18)

§3-1 방법 1(DB 분포 조회)을 외부 `/tmp` 1회성 읽기 전용 프로브로 수행했다(route.ts 미오염). `ai_analysis_decisions` 15건 조회 결과:

| 필드 | 분포 |
|---|---|
| confidence | **MEDIUM 15** (null·공백·비정형 0건) |
| verdict | UNDERWEIGHT 10 · OVERWEIGHT 4 · REDUCE 1 |
| time_horizon | 중기 14 · 단기 1 |

**판정: 가설 A 확정.** confidence 가 문자열 `"MEDIUM"` 으로 정상 저장돼 있어 표시 계층 버그가 아니다. 같은 JSON 의 verdict 가 strict 영문 enum 3종으로 잘 변별되므로 모델은 구조화 출력 능력이 있다 → 단순 포맷 폴백(가설 B)도 아니다. **주관적 자기평가(confidence)에서만 모델이 매번 중앙값(MEDIUM)으로 헷지**하는 것으로 결론. (time_horizon 도 13/14 가 중기로 같은 중앙 쏠림.) 폴백이 가끔 끼었을 가능성은 완전 배제 못 하나, 표시 교체 해법은 A/B 어느 쪽이든 유효하므로 추가 방법 2(raw 로그)는 생략.

**해법 선택 (Q2):** 가설 A → 옵션 B(rubric)만으로는 모델 재수렴 위험. 옵션 C 채택하되, "분석가 합의도 N/4"는 4분석가가 자유 텍스트만 내놓아 비싸므로(프롬프트 마커+파싱 추가, 여전히 LLM 의존), **이미 매 분석마다 계산되는 결정론 시그널 엔진(`lib/signal`)의 `score`(0~100)를 재활용**한다. 더 저렴하고 완전 결정론. "확신도" 라벨 → **"신호 강도"** 정직화.

---

## 2. 목표

- `/analyze` 카드의 confidence 지표가 **변별력을 갖거나(서로 다른 값이 실제로 나타남), 변별 없는 지표를 정직하게 제거/대체**한다.
- 모든 카드가 동일 confidence 로 표시되는 현 상태를 **유지하지 않는다**(현상 유지는 명시적 비채택).
- "보통" 이 모델의 실제 판단인지 코드 폴백인지(가설 A vs B)를 **데이터로 확정**한 기록을 남긴다. → §1-3 완료.
- 폴백 코드가 신호를 오염(실제 판단을 코드 기본값으로 위장)시키지 않는다.

> 측정 가능성: "변별력" 은 §5 AC 에서 "최소 2종 이상의 값이 카드 집합에 존재" 또는 "배지 미노출" 로 검증 가능하게 정의한다.

---

## 3. 범위 (In scope)

### 3-1. 선행 조사 — 원인 확정 (A vs B) **[완료 — §1-3]**

§3-1 방법 1(Supabase `ai_analysis_decisions` 값 분포 조회)을 `/tmp` 프로브로 수행 → 가설 A 확정. 임시 로그를 route.ts 에 넣지 않고 외부 스크립트로 조회해 코드 미오염.

### 3-2. 해결 적용 — 옵션 C 변형 (결정론 시그널 재활용) **[채택]**

`lib/signal` 의 `evaluateSignal()` 산출물(`score` 0~100)을 분석 시점에 `ai_analysis_decisions.signal`(신규 nullable JSONB 컬럼)에 압축 저장하고, 카드 칩에 "신호 강도" 로 표시한다. LLM `confidence` 표시는 카드에서 제거(모달은 signal 있으면 신호 강도, 없으면 confidence 폴백).

### 3-3. 해결 옵션 상세 (장단점 · 영향)

#### 옵션 A — 카드에서 확신도 배지 제거 (가장 가벼움)
- **내용**: 카드·모달의 confidence chip 을 노출하지 않는다.
- **장점**: 구현 최소. 변별 없는 지표 제거 = 정직.
- **단점**: 정보 1개 감소, 신호 보강 없음. → 후퇴선으로만 보유.

#### 옵션 B — 확신도를 의미있게 복구 (rubric 정량화 + 폴백 정직화)
- **내용**: rubric 정량 기준 구체화 + 폴백을 "측정 불가/숨김" 으로.
- **단점**: 가설 A 확정 → LLM 이 다시 중앙 수렴할 위험이 커서 신뢰 불가. → 비채택.

#### 옵션 C 변형 — 결정론 시그널 재활용 **[채택]**
- **내용**: LLM confidence 대신 이미 계산되는 `lib/signal` 의 `score`(0~100)를 "신호 강도" 로 표시. 원안의 "분석가 합의도 N/4"는 4분석가 자유 텍스트라 비싸므로(프롬프트 마커+파싱 신규), 기존 결정론 신호 재활용으로 대체.
- **장점**: 재현·설명 가능, 완전 결정론, 종목마다 변별. `lib/signal/` 결정론 톤 정합. 추가 LLM 호출·파싱 없음(엔진이 이미 매 분석마다 돌고 있음).
- **단점**: 의미가 "기술 신호 강도" 로 한정(뉴스/펀더멘털/심리 종합 아님) → "확신도"→"신호 강도" 정직 라벨 변경. 신규 nullable 컬럼 1개(수동 SQL).
- **UI 영향**: 경량 — chip 라벨·값 교체, 기존 MetaChip 재사용.
- **수정 대상**: `route.ts`(압축 저장), `decisionStore.ts`(컬럼 read/write), `lib/types/stock/aiAnalysis.ts`(DecisionSignal·스냅샷), `lib/copy/stock/aiAnalysis.ts`(라벨), `AIDecisionCard.tsx`·`FinalVerdictCard.tsx`·`AIDecisionDetailSheet.tsx`(표시), `docs/sql/ai-analysis-decisions.sql`.

### 3-4. 컨벤션 준수 (공통)
- 사용자 노출 문구 한글 기본, 신규 카피는 `lib/copy/stock/aiAnalysis.ts`.
- 색·px 직타 금지(카드는 MetaChip 토큰 재사용). FinalVerdictCard 는 기존 raw 팔레트 스타일이라 신호 칩도 로컬 컨벤션에 맞춰 최소 diff.
- BFF 유지 — signal 산출/저장은 route handler 안에서만.

---

## 4. 비범위 (Out of scope)

- 멀티에이전트 파이프라인 구조 변경.
- verdict·time_horizon 산출 로직 변경.
- `FinalDecision.confidence` 필드/프롬프트 rubric 제거(표시만 교체 — 회귀면적·토큰 미미). 보존.
- Supabase 파괴적 마이그레이션(컬럼 삭제·타입 변경). 신규 nullable JSONB 추가만 허용.
- 과거 저장된 카드의 signal 소급 백필(재분석으로 자연 갱신).
- AI 분석의 Vercel(prod) 실행(로컬 전용 유지).
- 토큰/분석시각 줄바꿈 등 카드 레이아웃 폴리시(별건).

---

## 5. 수용 기준 (AC)

### AC-0 (선행 조사 — 원인 확정) **[완료]**

가설 A 확정이 §1-3 에 기록됨. Supabase 15건 분포(confidence MEDIUM 15)를 `/tmp` 프로브로 확인. 임시 로그를 route.ts 에 남기지 않음 — `git grep -nE "console\.(log|warn|error).*confidence" app/api/stock/ai-analysis/route.ts` 결과 조사 목적 임시 로그 0건.

### AC-3 (옵션 C 변형 — 결정론 시그널 재활용) **[채택 — 구현]**

LLM confidence 대신 결정론 시그널 엔진(`lib/signal`)의 `score`(0~100)를 카드 칩에 "신호 강도" 로 표시한다. 같은 가격 입력에 항상 같은 값이 재현되고, 종목마다 변별된다.

- 검증(저장): `ai_analysis_decisions.signal`(신규 nullable JSONB 컬럼) 에 분석 시점 `DecisionSignal`(score/action/confidence/regime/axes/asOf) 압축본이 저장된다. 신규 분석 행은 `signal != null`.
- 검증(재현성): `evaluateSignal` 은 기존 결정론 엔진 — `npm run test` 의 signal 엔진 테스트가 회귀 없이 통과.
- 검증(표시): 카드 chip 이 `COPY.verdict.signalStrength(score)` 로 "신호 강도 NN" 한글 표기되고 `lib/copy/stock/aiAnalysis.ts` 에서 관리된다. 모달(`FinalVerdictCard`)은 signal 있으면 신호 강도, 없으면 LLM confidence 폴백.
- 검증(변별): 서로 다른 종목 2개 이상에서 신호 강도 값이 다르게 나타남(`signal->>'score'` 분포가 단일값 아님).

### AC-9 (현상 유지 금지) **[공통 필수]**

해결 적용 후 `/analyze` 카드에서 "모든 카드가 동일 confidence 표시" 상태가 재현되지 않는다(신호 강도로 대체됨, legacy 행은 칩 미노출).

### AC-10 (회귀 없음) **[공통 필수]**

`npm run lint` · `tsc --noEmit`(또는 `npm run build`) · `npm run test` 통과. verdict·time_horizon·상세 모달·토큰 사용량 탭·라이브 분석 패널이 기존대로 동작.

---

## 6. 가정 · 제약

- **DB 가정**: Supabase `ai_analysis_decisions` 라이브. 신규 nullable JSONB 컬럼 `signal` 을 수동 SQL 로 선적용(코드 머지 전). select 에 컬럼 추가는 컬럼 부재 시 400 → SQL 선적용 필수.
- **실행 가정**: AI 분석 실행은 로컬 전용. prod 는 Supabase 읽기 전용 → 옵션 C 표시 교체는 prod 에서도 즉시 반영(legacy 행은 signal=null 로 칩 미노출).
- **하위호환**: signal=null(이 컬럼 추가 이전 행) 은 칩 미렌더. 재분석 시 자연 갱신.
- **스키마 제약**: confidence 컬럼/필드 변경·삭제 없음. signal 은 신규 nullable 추가만.

---

## 7. 참고

- `app/api/stock/ai-analysis/route.ts` — PM JSON 파싱 + signal 압축 저장(`toDecisionSignal`) 지점. `signalResult`(evaluateSignal)는 PM 저장 시점 클로저 스코프에 존재.
- `lib/signal/engine.ts`, `lib/types/signal/index.ts` — 결정론 4축 엔진·`SignalResult`.
- `lib/types/stock/aiAnalysis.ts` — `DecisionSignal`·`AIAnalysisDecisionSnapshot.signal`.
- `lib/copy/stock/aiAnalysis.ts` — `signalStrength`·`signalStrengthBasis` 카피.
- `lib/server/ai/decisionStore.ts` — Supabase row/select/upsert.
- `components/analyze/AIDecisionCard.tsx`·`AIDecisionDetailSheet.tsx`·`components/stock/ai-analysis/FinalVerdictCard.tsx` — 표시.
- `docs/rules/frontend.md` — copy·cn·토큰·BFF 컨벤션.

---

## 8. 영향 분석

- **변경 라인**: ~70-90 LOC (타입·store·route 압축헬퍼·카피·카드/모달 칩·SQL). 위험 낮음(결정론 엔진 재활용, 신규 로직 최소).
- **회귀 위험**:
  - signal=null 시 카드/모달 칩 미렌더 가드 필수(AC-10). 타입 `DecisionSignal | null` 로 강제.
  - 라이브 패널(`AIAnalysisPanel`)은 signal 미전달 → 기존 confidence 폴백으로 무변경 동작.
  - select 에 signal 추가는 SQL 선적용 전 400 → 배포 순서(SQL 먼저) 명시.
- **PRD 분할 vs 단일**: 단일. 한 도메인(ai-analysis) 내, 단일 PR.

---

## 9. OPEN QUESTION

- **[RESOLVED] Q1 — 선행 조사를 먼저 수행하고 결과에 따라 옵션을 정할 것인가?**
  - 결정: **조사 먼저 수행함.** §3-1 방법 1(DB 분포)을 `/tmp` 프로브로 실행 → **가설 A 확정**(§1-3). 방법 2(raw 로그)는 표시 교체 해법이 A/B 무관하게 유효해 생략.

- **[RESOLVED] Q2 — 해결 옵션 A/B/C 중 무엇을 채택하는가?**
  - 결정: **옵션 C 변형 채택.** 가설 A 확정으로 옵션 B(rubric)는 모델 재수렴 위험. 단 원안의 "분석가 합의도 N/4"는 4분석가 자유 텍스트라 비싸므로, **이미 계산되는 결정론 시그널 엔진(`lib/signal`)의 `score`(0~100)를 재활용**해 카드 칩으로 표시하고 "확신도"→"신호 강도"로 라벨 정직화(§1-3). LLM confidence 필드·rubric 은 보존(표시만 교체 — Q4·옵션 E 참조).

- **[RESOLVED] Q3 — 척도를 유지하는가?**
  - 결정: 신호 강도 `score`(0~100) 연속 표기. 3점 척도보다 변별·설명 우월.

- **[OPEN QUESTION] Q4 — confidence 와 동일 패턴인 time_horizon 폴백(`"중기"` 강제)도 함께 정직화하는가?**
  - PM 권고: **이번 범위 제외(후속).** time_horizon 은 표시를 바꾸지 않고 유지. 변별되는 필드라 회귀 위험 대비 이득 적음.

- **[RESOLVED] Q5 — 과거 저장 행을 소급 백필하는가?**
  - 결정: **백필 안 함.** 신규 분석부터 signal 채워짐. legacy 행은 칩 미노출.

- **[RESOLVED] Q6 — UI 디자이너 사전 정의가 필요한가?**
  - 결정: **불필요.** 기존 MetaChip·라이브 패널 폴백 재사용 범위 내 경량 변경.
