# PRD — ai-analysis-redesign (AI 종합분석 뷰 리뉴얼: 4-페이즈 타임라인 · /analyze 통합 · 맥박 로고)

- 작성: PM 역할 (2026-07-04)
- 시리즈: **3-PR** (PR① 맥박 로고 → PR② 라이브 패널 4-페이즈 → PR③ /analyze 통합). 단일 PR 룰 일시 해제(§6 참조).
- 브랜치: PRD 는 **PR① 브랜치의 첫 commit** 으로 들어간다. 이후 PR②·③ 는 각자 브랜치·PR·QA·라벨.
- **UI 포함: YES** — 디자인은 노스스타 목업으로 **이미 승인됨**(§7 아트팩트). 디자이너 합류는 탐색이 아니라 노스스타→토큰/모션 확인 수준.
- 관련 메모리: `concurrent-ai-analysis`(동시 3건) · `unified-analysis-jobs`(인플라이트/큐) · `analyze-decision-cards`(/analyze 카드) · `project_design-elevation`(PR#211 파운데이션 재사용)

---

## 1. 배경 / 문제

AI 종합분석은 12개 에이전트(TradingAgents 아키텍처)를 SSE 로 스트리밍한다. 지금 UI 는 이 12개를
**회색 칩 스트립 + 카드 벽**으로 평면 나열한다(`components/stock/AIAnalysisPanel.tsx`). 문제:

- **구조가 안 읽힌다.** 12칩은 실제 의존 순서(분석 → 토론 → 종합 → 판정)를 드러내지 못하고, 사용자는
  "지금 뭐 하는 중인지"만 헤더 한 줄로 짐작한다. 결과(카드 6열)는 스크롤해야 최종 결론에 닿는다
  (verdict-forward 아님 — T4 정보 티어링 위배).
- **/analyze 결과가 이중 UI 다.** 저장된 결론은 중앙 팝업(`AIDecisionDetailSheet`)이 따로 렌더한다.
  `openFor` 가 이미 재분석을 우측 패널로 보내는데(팝업과 진입점이 갈림), 같은 데이터를 두 벌 UI 로
  유지 중이다. 팝업은 회색 칩 스트립도 없고 헤더 메타(토큰 등)도 달라 패널과 불일치한다.
- **"AI 가 일하는 중" 감각이 약하다.** 헤더 브랜드는 정적 `Sparkles` 아이콘이라, 브랜드 정체성
  (`lib/brand-mark` 의 3색 맥박 라인)이 라이브 분석의 역동성과 연결되지 않는다.

노스스타 목업 반복으로 승인된 리뉴얼은 이 셋을 (a) **4-페이즈 타임라인**, (b) **패널 저장모드로 팝업 흡수**,
(c) **맥박 로고 애니메이션**으로 푼다.

## 2. 목표 (측정 가능)

- 라이브 패널이 12칩·카드벽 대신 **4 페이즈**(분석가 / 강세·약세 토론 / 종합 / 최종 판정)로 렌더된다.
  각 페이즈는 상태 노드(대기/진행/완료) + 펼침 상세를 가진다.
- **verdict-forward**: 완료·저장 상태에서 최종 판정 글랜스(판정 라벨 + 신호강도/확신도 + 목표/손절/손익비)가
  상단 히어로로 항상 보인다(스크롤 없이).
- `/analyze` 카드 클릭이 **중앙 팝업이 아니라 우측 패널 저장모드**를 연다. `AIDecisionDetailSheet` 삭제,
  `git grep AIDecisionDetailSheet` = 0.
- 사용자 노출 텍스트에 **"PM" / "포트폴리오 매니저" 0건** — 최종 페이즈 라벨은 "최종 판정".
- 패널 헤더에 브랜드 맥박 로고(`AiPulseMark`)가 분석 중 좌→우 스윕 애니메이션으로 동작. 정적
  `BrandPulseIcon`(사이드바/헤더)은 무변경.
- 무회귀: 동시 3건 슬롯·탭 스트립·재열기 트레이·에러 재개·prod enqueue 큐 그대로.

## 3. 범위 (In scope) — PR 시리즈

### 3-A. PR① — 맥박 로고 컴포넌트 + 패널 헤더 배선

- 신규 `AiPulseMark` 컴포넌트. `lib/brand-mark` 의 `PULSE_POLYLINE_POINTS` + 3색(`PULSE_UP` ef4444 /
  `PULSE_MID` 94a3b8 / `PULSE_DOWN` 3b82f6)을 **재사용**해 심전도(heart-monitor) 느낌의 **좌→우 스윕**
  라인 애니메이션(진행 하이라이트가 폴리라인을 따라 흐른다).
- 배치 권고: `components/stock/ai-analysis/AiPulseMark.tsx`(패널 전용 도메인). 정적 원자는 이미
  `components/layout/BrandPulseIcon.tsx` 로 분리돼 있다 — 그 파일은 **손대지 않는다**.
- `AIAnalysisPanel` 헤더의 정적 `Sparkles`(brand 자리)를 `AiPulseMark` 로 교체. **분석 중(`isRunning`)에만
  스윕**, 그 외(idle/done/saved)엔 정적(또는 잔잔). `prefers-reduced-motion` 존중(스윕 정지/최소화).
- 애니메이션은 CSS 키프레임(`app/globals.css`/`components.css` `@layer`)이 1차 도구. 색은 hex 직타 금지 —
  `lib/brand-mark` 상수 import 로만 사용(SVG stroke/gradient).

### 3-B. PR② — 라이브 패널 4-페이즈 타임라인 재설계

12 에이전트를 실제 의존 순서 = **4 페이즈**로 재구성한다(`AGENT_ORDER`·`DEBATE_ROUNDS=2` 근거).

| 페이즈 | 에이전트(키) | 실행 | 표시 데이터(타입) |
|---|---|---|---|
| ① 분석가 | market·news·fundamentals·social | **병렬 4** | 4 report 텍스트 + social 의 `SentimentReport`(밴드/신뢰도/요약). 글랜스=요약+강세/중립/약세 태그, 전문 펼침 |
| ② 강세 vs 약세 토론 | bull·bear | **순차 4발화** (bull R1→bear R1→bull R2→bear R2) | `DebateMessage[]`(speaker·round·content). **R1/R2 왕복 보존**, 약세가 강세를 직접 반박 |
| ③ 종합 | research_manager→trader→(risk_risky·risk_neutral·risk_safe **병렬 3**) | 체인 | researchPlan·traderProposal·riskRisky/riskNeutral/riskSafe 텍스트 |
| ④ 최종 판정 | portfolio_manager | 단일 | **`FinalDecision` 전체**(verdict 6단계·reasoning·confidence·time_horizon·new_entry_strategy·holder_strategy·target_pct·stop_loss_pct·risk_reward_ratio·base_price·short_term_outlook·mid_term_outlook·key_strengths[]·key_risks[]·limitedData/bars) |

- **회색 12-칩 스트립 제거**(`AGENT_META.map` 렌더 삭제) → 페이즈 상태 노드로 대체. 노드: **대기(빈 링) /
  진행(맥박) / 완료(체크)**. **진행 중 페이즈는 자동 펼침**(스트리밍 텍스트 노출), 나머지는 접힘(온디맨드).
- **verdict-forward 히어로(T4)**: 최종 판정 글랜스(판정 라벨 + 신호강도/확신도 + 목표/손절/손익비)를 상단
  히어로로. 완료/저장 시 populated, 스트리밍 중엔 도출 대기 상태(기존 `PMLoadingCard` 의도 재사용).
  정확한 스트리밍-중 히어로 처리는 노스스타 아트팩트 시연을 진실원천으로(§9 q3).
- **"PM"·"포트폴리오 매니저" 제거**: `AGENT_META` 의 `portfolio_manager` 라벨 "포트폴리오 매니저" →
  **"최종 판정"**(다운스트림 `resumeFrom` 버튼·usage 라벨까지 일괄). 페이즈 ④ 노드/히어로 헤딩 = "최종 판정".
- **콘텐츠 렌더러 재사용**: `AnalystCard`·`DebateSection`·`FinalVerdictCard`·`SentimentBadge`·
  `CardDetailOverlay` 는 유지하고 **컨테이너(레이아웃)만 페이즈로 재조립**. 페이즈 스캐폴딩 컴포넌트는 신규.
- **무회귀 유지**: 동시 3건 슬롯 투영·상단 탭 스트립(2건+)·우측 재열기 트레이·에러 재개(resume)·
  자동 스크롤·sentiment 블록·`ProviderChooser`/`SlideToAnalyze`/`ProdAnalysisQueueCard` 분기.
  ★ **에러 재개 어포던스**는 현재 칩 스트립(클릭 가능한 error 칩)에 있으므로, 칩 제거 시 페이즈 노드/카드로
  **재배치 필수**(누락 시 회귀 — §8).

### 3-C. PR③ — /analyze 통합 (팝업 → 패널 저장모드)

- `AIDecisionListContainer` 카드 클릭(`onSelect`)을 `openFor(ticker, name)` 로 라우팅(재분석 케밥·
  `ReanalyzeButton` 과 동일 진입점). **`AIDecisionDetailSheet` 삭제** + import/사용 제거.
- 패널 **저장모드**(슬롯 all-pending, 로컬): 상단 verdict 히어로에 **저장된 `FinalDecision` 전체**
  (판정+근거+전략+전망+강점/리스크 — 저장돼 있으므로 전부) 렌더 + 하단 **푸터 "최근 분석 {상대시각} ·
  {provider}" + [재분석] 버튼**.
  - **회색 12-칩 스트립(또는 페이즈 노드) 미표시** — 과정은 저장되지 않으므로(오해 유발).
  - **푸터 카피는 "무엇이 저장됐는지" 설명하지 않는다**(화면 자체가 저장 데이터 = 중복). 기존
    `COPY.previousDecision.pmOnly`("…포트폴리오 매니저에게만…") **삭제**.
  - 토큰/비용 요약 **미표시**(verdict-forward·군더더기 제거 — 토큰 회계는 /analyze usage 탭 소관).
- **prod 패리티**: prod(`NEXT_PUBLIC_VERCEL_ENV`)에서도 저장모드는 verdict 히어로 + enqueue 재요청
  (`ProdAnalysisQueueCard`) 유지. 로컬 [재분석]=`openFor`→라이브, prod=enqueue.

## 4. 비범위 (Out of scope)

- **페이즈 과정(분석가/토론/리스크 대화)의 영속화** — ★ 설계상 저장은 **verdict-only**(`decision` jsonb 의
  `FinalDecision`). 과정은 저장 안 함(백엔드 변경 없음). 저장모드=verdict-only, 과정은 재분석(라이브)로만.
  **스테이지 저장을 제안하지 않는다.**
- 백엔드/FastAPI/SSE 이벤트 스키마 변경, `ai_analysis_decisions` 테이블 마이그레이션.
- 에이전트 실행 순서·토론 라운드 수·모델 선택 로직 변경(표시 계층만 리뉴얼).
- 정적 `BrandPulseIcon`·파비콘·OG·홈아이콘 등 다른 브랜드 마크 소비처.
- `/analyze` usage(토큰 대시보드) 탭 재설계, 인플라이트 카드(`InflightCard`) 구조 변경.
- 새 디자인 토큰 도입(색·간격) — PR#211 elevation 파운데이션 재사용 전제.

## 5. 수용 기준 (AC)

| # | PR | 시나리오 | 기대(명령/검증) |
|---|---|---|---|
| AC-1 | ① | 컴포넌트 존재 | `find components -name AiPulseMark.tsx` = 1건. `git grep -n "PULSE_POLYLINE_POINTS\|PULSE_UP" <AiPulseMark>` ≥1. 신규 hex 리터럴 0: `git grep -nE "#[0-9a-fA-F]{6}" <AiPulseMark>` = 0 |
| AC-2 | ① | 헤더 배선·조건부 애니메이션 | `git grep -n "AiPulseMark" components/stock/AIAnalysisPanel.tsx` ≥1. 분석 중 스윕 / 그 외 정적(수동, 로컬 dev). `prefers-reduced-motion` 존중(`git grep -n "motion-reduce\|reduced-motion"` 또는 수동) |
| AC-3 | ① | 정적 마크 무변경 | 시리즈 전체 `git diff` 에 `components/layout/BrandPulseIcon.tsx` 없음 |
| AC-4 | ② | 4-페이즈 구조·칩 제거 | 패널이 분석가/토론/종합/최종 판정 4 페이즈로 렌더. `git grep -n "AGENT_META.map" components/stock/AIAnalysisPanel.tsx` = 0(칩 스트립 제거) |
| AC-5 | ② | verdict-forward 히어로 | 완료 시 최종 판정 글랜스(판정+신호강도/확신도+목표/손절/손익비)가 상단, 각 페이즈 상세는 펼침(수동 E2E) |
| AC-6 | ② | 상태 노드·자동 펼침 | 대기(빈 링)/진행(맥박)/완료(체크), 진행 페이즈 자동 펼침(수동, 로컬 dev) |
| AC-7 | ② | PM 미노출 | `git grep -n "포트폴리오 매니저" lib/copy lib/types components` = 0. 페이즈 ④ 라벨 "최종 판정" |
| AC-8 | ② | 무회귀 | 동시 3건 슬롯/탭 스트립/재열기 트레이/**에러 재개(resume)**/sentiment 블록/prod 큐 유지(수동 E2E). `npm run build` 통과, vitest 무회귀 |
| AC-9 | ③ | 팝업 삭제 | `find components -name AIDecisionDetailSheet.tsx` = 0. `git grep -n "AIDecisionDetailSheet" -- components/analyze` = 0(무관 파일의 "…와 동일 패턴" 주석 인용은 정리 권장이나 게이트 아님) |
| AC-10 | ③ | 카드 클릭 → 패널 저장모드 | `git grep -n "openFor" components/analyze/AIDecisionListContainer.tsx` ≥1. 카드 클릭 시 중앙 팝업 없이 우측 패널이 저장 결론을 연다 |
| AC-11 | ③ | 저장모드 구성 | verdict 히어로에 `FinalDecision` 전체 + 푸터 "최근 분석 {상대시각} · {provider}" + [재분석]. **칩/페이즈 노드 미표시**, 토큰 요약·"무엇이 저장됐는지" 카피 없음 |
| AC-12 | ③ | pmOnly 카피 제거 | `git grep -n "포트폴리오 매니저에게만"` = 0 |
| AC-13 | ③ | prod 패리티 | prod 저장모드도 verdict 히어로 + enqueue 재요청(`ProdAnalysisQueueCard`) 유지(수동/코드 분기 확인) |

## 6. 가정 · 제약

- **저장 = verdict-only**(설계 확정). `FinalDecision` 만 `decision` jsonb 에 있고 페이즈 과정은 미저장 →
  저장모드는 verdict-only, 과정 확인은 재분석. 본 이니셔티브 **백엔드 변경 0**.
- **라이브 스트림·동시 3건·`SlideToAnalyze` = 로컬(next dev) 전용**. prod 는 enqueue 큐 모델(route handler
  Vercel 503). 저장모드·verdict 히어로는 양쪽 공통, 재분석 액션만 로컬/ prod 분기.
- **도구**: Tailwind v4 유틸 1차 · 모션은 `motion/react` + CSS 키프레임(globals/components.css) · JS 반응형은
  `useBreakpoint`(window.innerWidth 직접 검사 금지) · 색/치수 hex/px 직타 금지(브랜드 상수·토큰 재사용).
  `docs/rules/frontend.md` 8개 절 준수(커스텀훅 의무·`cn`·도메인 한 뎁스·`lib/copy` 유지·query key 단일).
- **선행**: PR#211 elevation 파운데이션(그림자/모션/link 토큰 + `components/ui` 원자 + `MiniStockChart`) 머지
  완료 — 재사용 전제.
- **단일 PR 룰 일시 해제**: 변경량·순차 의존이 커 3-PR 시리즈로 분할(선례 = `feature_single-pr-rule-exception`
  의 finsight-redesign 9PR·stock-api 3PR). 각 PR 은 독립 QA·라벨(impl-ready→qa-passed→review-approved)·머지.
  시리즈 종료 후 단일 PR 룰 복귀. PRD 는 PR① 브랜치 첫 commit.

## 7. 참고

- **노스스타 아트팩트(설계 진실원천, 인터랙티브 — 재생으로 전 플로우)**:
  https://claude.ai/code/artifact/8b23ee55-8896-45a9-b957-82084c93b0c7
- 라이브 패널: `components/stock/AIAnalysisPanel.tsx` · 전역 호스트 `components/stock/GlobalAIAnalysis.tsx` ·
  상태/스트림 `hooks/stock/aiAnalysisProvider.tsx`(`openFor`·슬롯·동시성)
- 서브컴포넌트: `components/stock/ai-analysis/*`(AnalystCard·DebateSection·FinalVerdictCard·PMLoadingCard·
  SentimentBadge·CardDetailOverlay·ProviderChooser·SlideToAnalyze·ProdAnalysisQueueCard)
- /analyze: `components/analyze/AIDecisionListContainer.tsx`·`AIDecisionDetailSheet.tsx`(삭제 대상)·
  `AIDecisionCard.tsx`·`AIDecisionCardMenu.tsx`·`ReanalyzeButton.tsx`·`format.ts`(AGENT_META 라벨 소비)
- 브랜드 마크: `lib/brand-mark.tsx`(PULSE_*·PULSE_POLYLINE_POINTS·pulseGradientDefs) · 정적
  `components/layout/BrandPulseIcon.tsx`(무변경)
- 타입/카피: `lib/types/stock/aiAnalysis.ts`(AGENT_META·FinalDecision·DebateMessage·SentimentReport·
  AGENT_ORDER·DEBATE_ROUNDS) · `lib/copy/stock/aiAnalysis.ts`(pmOnly·verdict·debate·panel)
- 룰: `docs/rules/frontend.md` · `AGENTS.md`

## 8. 영향 분석

- **PR① (저위험·가산)**: `AiPulseMark` 신규 ~80–120L + 헤더 배선 ~5L(+ 키프레임 1개). 토큰 무변경(브랜드
  상수 재사용). 회귀 표면 없음(정적 마크 무손대). 독립 머지 가능한 안전 파운데이션.
- **PR② (고위험·핵심)**: `AIAnalysisPanel` 본문 ~300–500L 재작성(4행 → 4페이즈) + 페이즈 스캐폴딩 신규.
  **회귀 위험 집중**:
  1) **에러 재개(resume) 어포던스** — 현재 칩 스트립의 클릭 error 칩에 있음. 칩 제거 시 페이즈 노드/카드로
     이전 안 하면 재개 경로 소실.
  2) 자동 스크롤(running/토론/final) · sentiment 블록 · `PMLoadingCard` 도출-중 상태 · 동시성 탭 투영.
  3) `AGENT_META` 라벨 변경("포트폴리오 매니저"→"최종 판정")이 `components/analyze/format.ts`
     (usage 대시보드 에이전트별 라벨)로 파급 — **양성**(내부 비용뷰가 더 명확해짐), 의도된 리플.
- **PR③ (중위험)**: `AIDecisionDetailSheet` 삭제 ~140L + `AIDecisionListContainer` onSelect 라우팅 변경 ~10L +
  패널 저장모드 재배치(히어로 우선·푸터·칩 미표시) ~50–100L + `pmOnly` 카피 삭제. 케밥/`ReanalyzeButton` 은
  이미 `openFor` 라 변경 없음. 위험 = 저장모드 분기(로컬/prod)·상대시각/provider 푸터.
- **커밋/PR 분할 근거**: ① 은 순수 가산(먼저 머지해 헤더에 로고 확보), ② 는 라이브 패널 전면 재설계라
  단독 QA 필요, ③ 은 ② 의 저장모드 위에 얹혀 /analyze 를 흡수 → **①→②→③ 순차**. 각 PR 자체로 화면이
  깨지지 않게(①=로고만, ②=라이브만, ③=저장/analyze) 경계 유지.

## 9. OPEN QUESTION (사용자 결정 시 `[RESOLVED]` 로 갱신)

- **[OPEN QUESTION] q1. 저장모드 푸터 "{model}" 표기** — provider 라벨(Claude/Codex) vs 실제 모델 문자열.
  **PM 권고: provider 라벨.** 패널 저장 경로는 `useQueryAIDecision` 스냅샷(provider 有, 모델 문자열·토큰 無)을
  쓴다 — 팝업을 없애며 목록 아이템(tokens.model) 의존을 끊는 게 통합 취지에 맞다. 원 모델 문자열이 꼭
  필요하면 스냅샷 확장(별도 PRD).
- **[OPEN QUESTION] q2. "최종 판정" 표기 통일 범위** — 기존 `verdict.badge`="최종 결정",
  `runningStatus.portfolio_manager`="최종 결론"과 혼재. **PM 권고: 페이즈 ④ 노드·히어로 헤딩만 "최종 판정"**
  으로 확정하고, `FinalVerdictCard` 내부 배지("최종 결정")는 회귀 최소화 위해 유지. 디자이너가 완전 통일을
  원하면 PR② 에서 일괄 치환.
- **[OPEN QUESTION] q3. 스트리밍 중 verdict 히어로 처리** — 상단 빈 placeholder(도출 대기) vs 타임라인 말미
  도출. **PM 권고: 노스스타 아트팩트 시연을 그대로.** 설계 재오픈이 아니라 구현 세부 — 디자이너/dev 가
  아트팩트 재생대로 옮긴다.
- **[OPEN QUESTION] q4. `AiPulseMark` 배치** — `components/stock/ai-analysis/`(도메인) vs `components/ui/`(원자).
  **PM 권고: 도메인(ai-analysis).** 패널 전용이고, 정적 원자는 이미 `components/layout/BrandPulseIcon` 로 분리돼
  있어 성격이 다르다.
- **[OPEN QUESTION] q5. 디자이너 산출물(DESIGN.md) 필요 여부** — 노스스타 승인 + PR#211 토큰 재사용 전제라
  신규 토큰이 없을 공산이 크다. **PM 권고: 새 색/간격 토큰이 없으면 DESIGN.md 신규 작성 생략**, 맥박 스윕
  모션 스펙(속도/이징/키프레임)만 PR② 브랜치에 짧게 문서화(또는 코드 주석). 새 토큰이 생기면 그때
  `docs/design/ai-analysis-redesign.md` + `design:sync`.
