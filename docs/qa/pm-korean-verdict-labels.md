# QA Report: pm-korean-verdict-labels

- **PR**: [#145 fix(analyze): PM 본문 영문 등급 용어 노출 차단 — 한글 라벨 강제](https://github.com/deeptrading-lab/trading-signal-frontend/pull/145)
- **브랜치**: `feature/pm-korean-verdict-labels`
- **커밋**: `f5758d9`
- **검증일**: 2026-06-22
- **검증자**: QA 에이전트
- **변경 성격**: PM(포트폴리오 매니저) 시스템 프롬프트 **문자열만** 변경. 런타임 AI 호출/브라우저 플로우 없는 경량 변경 → 정적 검증으로 한정한다.

## 변경 요약

`lib/prompts/stock/aiAnalysis.ts` 최종결정(PM) 프롬프트에:
1. "한글 표기 원칙" 규칙 추가 — 자유서술 텍스트 필드(reasoning·new_entry_strategy·holder_strategy·short_term_outlook·mid_term_outlook)에서 영문 등급 용어(BUY·OVERWEIGHT·HOLD·UNDERWEIGHT·REDUCE·SELL) 및 괄호 영문 병기 금지, 한글 라벨만 사용. 단 JSON `verdict` 필드 값만 영문 enum 유지.
2. 굵게 표기 예시 `` `**BUY 판단**` `` → `` `**적극 매수 판단**` `` 한글화.

---

## 1. 수용 기준 검증

### AC-1 (프롬프트 규칙 정합성 — 텍스트 필드 영문 등급 금지 + verdict 영문 유지 명시)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git diff origin/main...HEAD -- lib/prompts/stock/aiAnalysis.ts` |
| 기대 결과 | 추가 규칙이 (a) 텍스트 필드에서 영문 등급 6종 금지 + 괄호 영문 병기 금지, (b) JSON verdict 필드는 영문 enum 유지를 모두 명시 |
| 실측 결과 | `aiAnalysis.ts:465` — "위 텍스트 필드에서는 영문 등급 용어(BUY·OVERWEIGHT·HOLD·UNDERWEIGHT·REDUCE·SELL)를 절대 노출하지 마세요. … 괄호 안 영문 병기(예: `(Overweight)`)도 넣지 마세요. **단 JSON 의 verdict 필드 값만 영문 enum 으로 출력합니다.**" → (a)(b) 모두 충족. 적용 대상 텍스트 필드 5종이 바로 앞 줄(`:463`)의 굵게 표기 대상과 동일 ("위 텍스트 필드") |
| 판정 | PASS |

### AC-2 (모순 점검 — JSON 스키마·verdict 선택 기준과 새 규칙 충돌 없음)

| 항목 | 값 |
|---|---|
| 재현 절차 | 동일 프롬프트 내 verdict 영문 enum 요구부 인스펙션 (`:475` JSON 스키마, `:503~509` 6단계 선택 기준) |
| 기대 결과 | 새 규칙은 **텍스트 필드에만** 적용되어야 하며, verdict 필드 자체의 영문 enum 요구와 충돌하지 않아야 함 |
| 실측 결과 | `:475` `"verdict": "BUY" \| "OVERWEIGHT" \| "HOLD" \| "UNDERWEIGHT" \| "REDUCE" \| "SELL"` 6종 enum 그대로 유지. `:504~509` verdict 선택 기준 6단계도 `BUY (적극 매수)` … `SELL (매도/회피)` 형태로 영문 enum + 한글 병기 유지. 새 규칙은 명시적으로 "텍스트 필드" 한정 + "verdict 필드 값만 영문 enum" 예외를 적시 → **충돌 없음**. (`:319~324` 강세→약세 6단계 설명의 `(Buy)/(Overweight)` 병기는 verdict 정의용 메타 설명이지 모델이 출력할 텍스트 필드가 아님 → 규칙 적용 범위 밖) |
| 판정 | PASS |

### AC-3 (프론트 매핑 무결성 — VERDICT_LABEL 6종 전부 한글 매핑)

| 항목 | 값 |
|---|---|
| 재현 절차 | `components/stock/ai-analysis/FinalVerdictCard.tsx:79~82` `VERDICT_LABEL` 인스펙션 + `lib/types/stock/aiAnalysis.ts:178` `FinalVerdict` 타입 대조 |
| 기대 결과 | verdict 6 enum 전부 한글 라벨로 매핑 → verdict 값이 영문으로 와도 화면엔 한글 노출 보장 |
| 실측 결과 | `VERDICT_LABEL: Record<FinalVerdict, string>` = `{ BUY:"적극 매수", OVERWEIGHT:"분할 매수", HOLD:"중립", UNDERWEIGHT:"신규 진입 주의", REDUCE:"분할 매도", SELL:"매도 / 회피" }`. `FinalVerdict = "BUY"\|"OVERWEIGHT"\|"HOLD"\|"UNDERWEIGHT"\|"REDUCE"\|"SELL"` 6종. `Record<FinalVerdict, string>` 타입이 6 키 전부 존재를 컴파일타임 강제(누락 시 tsc 에러) → 6종 모두 한글 매핑 보장. 렌더부 `:139` `{VERDICT_LABEL[data.verdict]}` 로 화면에 한글 라벨 출력 확인 |
| 판정 | PASS |

### AC-4 (빌드/타입 — tsc 통과 + 템플릿 리터럴 이스케이프 무결)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npx tsc --noEmit` |
| 기대 결과 | exit 0, 에러 0건. 추가된 백틱 이스케이프(`` \`(Overweight)\` ``)로 템플릿 리터럴 깨짐 없음 |
| 실측 결과 | `TSC_EXIT=0` (에러 0건). 프롬프트 템플릿 리터럴 내 신규 규칙 라인의 이스케이프 백틱 정상 파싱 — tsc 가 통과했다는 것 자체가 백틱 균형/이스케이프 무결의 증거. 정적 검증으로 `(Overweight)` 예시 및 한글 라벨 6종 문자열 모두 정상 포함 확인 |
| 판정 | PASS |

---

## 2. 공통 AC 무회귀

| 항목 | 재현 | 결과 | 판정 |
|---|---|---|---|
| typecheck 0 에러 | `npx tsc --noEmit` | exit 0 | PASS |
| BFF 원칙 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- lib/prompts/stock/aiAnalysis.ts components/stock/ai-analysis/FinalVerdictCard.tsx` | exit 1 (0건) | PASS |
| 한글 톤 무회귀 | 변경부가 오히려 영문 등급 용어 노출을 줄이는 방향 (사용자 노출 PM 본문 한글화 강화) | 신규 규칙 자체가 한글 톤 강화 | PASS |
| 접근성 무회귀 | DOM/마크업 변경 없음 (프롬프트 문자열 1줄 추가 + 예시 1개 한글화) | 영향 없음 | PASS |

---

## 3. 라운드트립 / 반응형 / DESIGN.md 토큰 동기화

- **해당 없음(N/A)**: 본 변경은 PM 시스템 프롬프트 문자열만 수정한다. UI 컴포넌트·라우트·스타일·route handler·디자인 토큰 변경이 전혀 없어 라운드트립(BE LIVE)·두 뷰포트 반응형·DESIGN.md 라이브 동기화 검증 대상이 아니다. 프롬프트 효과(실제 모델 출력에서 영문 등급 미노출)는 비결정적 LLM 출력 특성상 정적 QA 범위 밖이며, 프론트 `VERDICT_LABEL` 매핑(AC-3)이 verdict 표시의 한글화를 결정론적으로 보장한다.

---

## 결론

| AC | 판정 |
|---|---|
| AC-1 프롬프트 규칙 정합성 | PASS |
| AC-2 모순 점검 | PASS |
| AC-3 프론트 매핑 무결성 | PASS |
| AC-4 빌드/타입 | PASS |
| 공통 AC 무회귀 (typecheck·BFF·한글톤·접근성) | PASS |

**최종 판정: qa-passed (실패 0건)**

신규 "한글 표기 원칙" 규칙은 텍스트 필드에 한정되어 verdict JSON enum 요구와 충돌하지 않으며, 프론트 `VERDICT_LABEL`(Record 타입으로 6종 전수 강제)이 verdict 영문 값의 화면 한글화를 보장한다. tsc 통과로 템플릿 리터럴 이스케이프 무결도 확인됐다.
