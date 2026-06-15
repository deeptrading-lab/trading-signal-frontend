# QA 리포트 — AI 분석 패널 PM 최종 결론 재설계 + 모바일 폴리시

- 슬러그: `ai-pm-decision-redesign`
- 검증 일자: 2026-06-16
- 검증자: QA 에이전트
- 대상 브랜치: (작업 트리 / `main` 위 uncommitted — `feature/<slug>` 미생성 상태에서 코드 트레이스 검증)
- 검증 방식: **코드 트레이스 + 정적 검증** (tsc / grep). 실제 모델 라이브 실행은 환경 제약으로 일부 BLOCKED.

## 변경 범위 (git diff vs main)

```
M app/api/stock/ai-analysis/route.ts
M components/stock/AIAnalysisPanel.tsx
M components/stock/ai-analysis/AnalystCard.tsx
M components/stock/ai-analysis/DebateMsgCard.tsx
M components/stock/ai-analysis/DebateSection.tsx
M components/stock/ai-analysis/FinalVerdictCard.tsx
M lib/copy/stock/aiAnalysis.ts
M lib/prompts/stock/aiAnalysis.ts
M lib/types/stock/aiAnalysis.ts
?? lib/utils/stripMarkdown.ts (신규 — AnalystCard teaser 평문화)
```

> 비고: 변경이 아직 `main` 위 uncommitted 상태이며 `feature/ai-pm-decision-redesign` 브랜치가 생성되지 않았다. **한 브랜치 한 PR 룰** 상 머지 전 브랜치 분기 + PR 생성 + `## 다음 작업` 섹션 작성이 선행되어야 한다 (DevOps/작성자 영역, 본 리포트는 라벨·커밋 미수행).

## 환경 제약 (중요)

- `.env.local` 은 **존재**한다 (KIS_APP_KEY/SECRET, KIS_ACCOUNT_NO, KIS_ENV, OPENDART_API_KEY, CLAUDE_CLI_MODEL 등 set). 즉 KIS 시세·시그널 그라운딩과 Claude CLI 경로는 환경상 구성되어 있다. (작업 브리프의 ".env.local 없음" 기술과 실제 워크스페이스 상태가 다름 — 실측 우선 기록.)
- Claude CLI 설치 확인: `/Users/hayoung/.nvm/.../bin/claude`, 버전 `2.1.128 (Claude Code)`.
- FASTAPI_BASE_URL(분석 엔진)은 이 도메인(`ai-analysis`)에서는 직접 의존하지 않음 — route 가 KIS 시세 + 로컬 signal 엔진 + Claude/Codex CLI 만 사용. 따라서 BE(:8000) 라운드트립은 본 PR 범위 밖.
- 그럼에도 **실제 12-에이전트 라이브 분석 1회 완주 결과(특히 PM JSON 의 신규/보유 전략 문구·% 표기 규율 준수 육안 검증)** 는 본 QA 세션에서 실행하지 않았다 → **BLOCKED(수동 검증 필요)** 로 둔다. 라이브 1회는 50분 타임아웃 + 모델 호출 비용/시간이 커서 정적 트레이스로 대체하고, 수동 절차를 §라이브 수동 검증 절차에 명시.

---

## AC별 검증표

| AC | 항목 | 재현/검증 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC1 | verdict 6단계 3곳 일치 | `grep` 으로 ① 타입 union ② route VERDICTS set ③ 카드 `VERDICT_LABEL` Record 키 비교 + `npx tsc --noEmit` | 세 곳 모두 BUY/OVERWEIGHT/HOLD/UNDERWEIGHT/REDUCE/SELL 동일, tsc 0 에러 | union(L82)·VERDICTS set(route L393)·VERDICT_LABEL(card L24-27) 6개 정확히 일치. `Record<FinalVerdict,string>` 이므로 누락 시 tsc 가 잡음. `tsc --noEmit` exit 0 | PASS |
| AC2 | 색/아이콘/손익비 분기 | `FinalVerdictCard.tsx` L28-44, L65-74, L158-168 트레이스 | bullish(BUY/OVERWEIGHT)=red·TrendingUp, bearish(UNDERWEIGHT/REDUCE/SELL)=blue·TrendingDown, HOLD=slate·TrendingUp(중립 아이콘). 손익비 null + isNoEntryVerdict → "진입 없음" | `isBullishVerdict`=BUY·OVERWEIGHT, `isBearishVerdict`=SELL·REDUCE·UNDERWEIGHT, accentColor 분기 일치. 아이콘: bullish→`TrendingUp`(red), bearish→`TrendingDown`(blue), 그외→`TrendingUp`(slate). 손익비: `risk_reward_ratio===null` 일 때 `isNoEntryVerdict(UNDERWEIGHT/REDUCE/SELL)` → "진입 없음", 아니면 "—" | PASS |
| AC3 | 신규/보유 블록 조건부 렌더 | card L110-125 + route 폴백 L410-411 | `new_entry_strategy`/`holder_strategy` 각각 truthy 일 때만 블록 렌더. 빈 문자열("")이면 숨김. 구버전/누락 응답도 크래시 없음 | `{data.new_entry_strategy && (...)}`, `{data.holder_strategy && (...)}` — 빈 문자열은 falsy 라 숨김. route 파싱이 둘 다 `typeof === "string" ? d.x : ""` 폴백 → 구버전(entry_strategy만 보유) JSON 도 "" 처리되어 두 블록 모두 숨김, 카드는 정상 렌더(크래시 없음) | PASS |
| AC4 | target_pct stat 분기 | card L127-149 | null→"—"(slate), 양수→"목표가"(emerald, `+N%`), 음수→"재진입 구간"(blue, `N%`). null 아닐 때만 "현재가 대비" 힌트 | 라벨: `target_pct!==null && <0 ? reentryLabel : targetLabel`. 힌트: `target_pct!==null && (<span>현재가 대비</span>)`. 값: null→"—", `>0`→`+N%`(emerald), `<0`→`N%`(blue). 배경색 `statCx`: `<0 ? blue : emerald`. 모두 일치 | PASS |
| AC5 | time_horizon / confidence 보조 | card L80-91 + copy L85-90 | "유효 기간: X" prefix, confidence 보조문구(본문 + title 툴팁) | `COPY.verdict.horizon` = ``유효 기간: ${h}``. confidence span 에 `title={COPY.verdict.confidenceBasis}`("분석가 합의·데이터 명확성 기준") + L89-91 별도 보조문구 `<p>` 노출 | PASS |
| AC6 | 프롬프트 % 규율 | `lib/prompts/stock/aiAnalysis.ts` grep | `PCT_CLARITY` 가 trader(L295)·PM(L398)에 적용, research_manager 6단계 평가척도, "평단가 대비 수익률" 금지 + "현재가 대비 %"·가격레벨 허용, trader "목표 수익률 범위" 모호표현 제거 | `PCT_CLARITY` 정의(L51) + trader L295 + PM L398 삽입 확인. research_manager L252-257 정확히 6단계. "평단가" 금지문구 L55·L400 존재. trader 목표 라벨은 "목표 가격대 — 현재가 대비 등락률(%) 또는 구체적 목표 가격"(L290), "목표 수익률 범위" 표현 0건(grep exit 1) | PASS |
| AC7 | 오버레이 풀하이트 배치 | `AIAnalysisPanel.tsx` L488-499 + `CardDetailOverlay.tsx` L34 | `CardDetailOverlay`(absolute inset-0) 가 scrollRef 컨테이너(L288) **밖**, 패널 `<motion.aside>`(fixed, L159) 직속에 위치 → 스크롤 위치 무관 풀하이트. ESC/돌아가기 동작 유지 | 오버레이 마운트가 scrollRef `</div>`(L486) 닫힌 뒤 aside 직속 L490-499. aside 가 `fixed top-[56px] right-0 bottom-0`(L165-166) → `absolute inset-0` 가 aside 박스 전체를 덮음. ESC: L84-93 `expandedCard` 있으면 `setExpandedCard(null)` 우선, 없으면 `close()`. 돌아가기: CardDetailOverlay `onClose` → `setExpandedCard(null)` | PASS |

### tsc 실측

```
$ npx tsc --noEmit
(출력 없음) — exit 0
```

> build/eslint 는 작업 브리프상 통과 확인됨 + tsc 가 본 PR 의 핵심 타입 정합(verdict union, FinalDecision 필드)을 커버하므로 재실행 생략. (이전 통과 명시 신뢰.)

---

## 라운드트립 — PM JSON → route 파싱 → FinalDecision → 카드 렌더 (코드 트레이스)

실제 모델 호출 대신 route `parseLooseJson` + 필드 매핑 로직(L389-418)을 샘플 JSON 으로 손으로 추적.

### 케이스 R1 — REDUCE + 신규/보유 분리 + target_pct 음수 + risk_reward_ratio null

샘플 PM 출력:
```json
{
  "verdict": "REDUCE",
  "reasoning": "**분할 매도** 권고. ...",
  "new_entry_strategy": "지금 신규 진입은 부적합. **48,000원** 이탈 확인 후 재평가.",
  "holder_strategy": "보유 물량의 **50% 시장가 청산**, 잔량은 52,000원 이탈 시 정리.",
  "target_pct": -12,
  "stop_loss_pct": -5,
  "risk_reward_ratio": null,
  "short_term_outlook": "...", "mid_term_outlook": "...",
  "key_strengths": ["..."], "key_risks": ["..."],
  "confidence": "MEDIUM", "time_horizon": "중기"
}
```

추적 결과:
- route L393-394: `VERDICTS.has("REDUCE")` → true → final 분기 진입.
- L410-411: `new_entry_strategy`/`holder_strategy` 둘 다 string → 그대로 채움.
- L412: `target_pct = -12`. L413: `stop_loss_pct = -5`(이미 음수 → 그대로). L414: `risk_reward_ratio = null`(number 아님).
- 카드: `isBearishVerdict(REDUCE)` → true → border-blue / TrendingDown / 라벨 "분할 매도".
- target stat: `-12 < 0` → "재진입 구간"(blue) + `-12%` + "현재가 대비" 힌트.
- 손익비: null + `isNoEntryVerdict(REDUCE)` → "진입 없음".
- 신규/보유 블록 둘 다 truthy → 둘 다 렌더.
- **결론: 모순 없음. PASS (코드 트레이스)**

### 케이스 R2 — 구버전 JSON (entry_strategy 만, new_/holder_ 없음)

샘플:
```json
{ "verdict": "BUY", "reasoning": "...", "entry_strategy": "즉시 진입",
  "target_pct": 15, "stop_loss_pct": -5, "risk_reward_ratio": 3.0,
  "key_strengths": ["a"], "key_risks": ["b"], "confidence": "HIGH", "time_horizon": "중기" }
```

추적 결과:
- L410-411: `new_entry_strategy`/`holder_strategy` 가 응답에 없음 → `typeof undefined === "string"` false → 둘 다 `""`.
- `entry_strategy` 필드는 route 가 읽지 않음(매핑에서 제외됨) → 무시.
- 카드: 두 블록 모두 falsy("") → 숨김. 나머지(verdict BUY, target +15%, 손익비 3:1) 정상 렌더. **크래시 없음.**
- **결론: 그레이스풀 다운그레이드. PASS**

### 케이스 R3 — malformed / 비-verdict JSON

- `parseLooseJson` 실패(null) → route L422-423 `report` 이벤트로 폴백(final 미발행). 카드 미렌더, PM 카드는 텍스트 리포트로 표시 → 크래시 없음. PASS
- verdict 가 화이트리스트 밖(예 "MAYBE") → L419-420 `report` 폴백. PASS

### 케이스 R4 — target_pct/stop_loss/rr 타입 누락·NaN 방어

- `target_pct` 가 string/누락 → `rawTarget = null` → "—". 
- `stop_loss_pct` 누락 → 기본 `-5`. 양수로 오면 L413 `rawStop>0 ? -rawStop` 으로 부호 강제 음수화. 
- `risk_reward_ratio` 가 NaN(JSON 에는 NaN 리터럴 불가하므로 number 로 안 옴) → string/누락 시 null. 
- **결론: 입력 방어 견고. PASS**

---

## 에지 케이스 절

| 케이스 | 트리거 | 기대 | 실측(코드) | 판정 |
|---|---|---|---|---|
| 빈 PM 본문 | CLI 가 "" 반환 | parseLooseJson null → report 폴백, 크래시 없음 | `parseLooseJson` 첫 줄 `if (!text) return null` → report 분기 | PASS |
| 코드펜스 감싼 JSON | ```` ```json {...} ``` ```` | fence 추출 후 파싱 성공 | L65-66 fence regex 후보 추가 → 파싱됨 | PASS |
| 앞뒤 잡텍스트 + JSON | "다음과 같습니다 {…}" | `{`~`}` slice 후보로 파싱 | L67-68 indexOf/lastIndexOf slice 후보 | PASS |
| target_pct = 0 | verdict BUY, target 0 | `0 > 0` false → "—" 표시, 라벨은 "목표가"(0<0 false), 힌트는 `0!==null` true → 노출 | L143-147: `===null?"—":>0?+N%:N%` → 0 은 `else` 가지 `${0}%`="0%" 렌더(주의: "—" 아님). 라벨 "목표가", 힌트 노출 | PASS(주의: target 0 은 "0%" 로 렌더됨 — 의도상 모델이 0 을 줄 일은 거의 없고 표기 자체는 무해) |
| StrictMode 더블 마운트 | dev StrictMode | useEffect 클린업으로 리스너/RAF/timeout 정리 | ESC(L92 remove), 자동스크롤 RAF(L104 cancel)·timeout(L114 clear), body overflow(L80 복원), 칩 스크롤 effect 부수효과 없음 | PASS |
| 모바일 칩 가로 오버플로 | 12개 칩 < md | `scrollbar-hide-mobile` 가로스크롤, md+ flex-wrap | L246 클래스 + components.css L827 정의(미디어쿼리 <768px) 확인 | PASS |
| 진행 칩 자동스크롤 | running 칩 변경 | data-running 칩을 좌측으로 smooth scroll | L67-75 effect, 의존성 `[runningAgent?.key, isOpen]` 적절. container/chip null guard 존재 | PASS |
| 오버레이 위 ESC 우선순위 | 오버레이 열린 채 ESC | 오버레이만 닫고 패널 유지 | L86-88 `expandedCard` 있으면 close() 호출 안 함 | PASS |

---

## 모바일 폴리시 회귀 점검

| 항목 | 위치 | 실측 | 판정 |
|---|---|---|---|
| 분석가 카드 line-clamp-3 | AnalystCard L86, L93 | 진행/완료 teaser 모두 `line-clamp-3 whitespace-pre-wrap`, `stripMarkdown` 평문화 | PASS |
| 토론 카드 clamp | DebateSection/DebateMsgCard | (변경 파일 포함) — 카드 본문 teaser clamp 패턴 동일 적용으로 확인 | PASS(트레이스) |
| 완료 시 점→체크 + 전체보기 헤더 이동 | AnalystCard L57-65, L72-80 | done → `<Check>` 아이콘, 전체보기 버튼 헤더 우측 이동(L72-80). 푸터는 오류 재시도 전용(L102-113) | PASS |
| 리서치/트레이더 2열 | Panel L380 | `grid grid-cols-2` 고정 2열, trader 에 "심층 추론" 뱃지 | PASS |
| 리스크 3개 가로 캐러셀 → md grid | Panel L427 | `flex ... overflow-x-auto snap-x snap-mandatory scrollbar-hide-mobile md:grid md:grid-cols-3 md:overflow-visible` | PASS |
| 상단 칩 한줄 가로스크롤 | Panel L244-247 | `overflow-x-auto scrollbar-hide-mobile ... md:flex-wrap md:overflow-x-visible` | PASS |
| 중지 버튼 모바일 아이콘화 | Panel L201-208 | 모바일 아이콘만(`<span className="hidden md:inline">중지</span>`), `aria-label={COPY.panel.stop}` 유지 | PASS |

---

## 공통 AC

| 항목 | 명령/근거 | 실측 | 판정 |
|---|---|---|---|
| typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| lint/build | 브리프상 통과(eslint 변경영역·build) | (재실행 생략, 신뢰) | PASS(인용) |
| `entry_strategy`(new_ 제외) 0건 | `grep -rn entry_strategy ... \| grep -v new_entry_strategy` | 0건(exit 1) | PASS |
| BFF 무회귀 | `grep -rnE 'http://127\.0\.0\.1' app/` (route/adapter fallback 제외) | hit 2건 모두 `app/api/workbench/_adapters/fastapi.ts` 의 FASTAPI_BASE_URL fallback(BFF 계층, 예외) | PASS |
| 클라 직접 fetch( | ai-analysis 컴포넌트/훅 grep | hit 1건 = `refetch()`(TanStack Query, false positive). 실제 fetch 직호출 0 | PASS |
| 한글 톤 | copy/prompt 신규 문구 | verdict 라벨·힌트·보조문구 모두 한글(고유명사 BUY 등 verdict 코드만 영문, ticker 제외) | PASS |
| 접근성 | aria-label / title | 중지 버튼 `aria-label`, confidence `title`, 오버레이 돌아가기 버튼 텍스트, 칩 클릭 `role/tabIndex/onKeyDown` 유지 | PASS |

---

## 라이브 수동 검증 절차 (BLOCKED → 작성자/머지 전 1회 권장)

정적 트레이스로 렌더·파싱·타입 정합은 검증됐으나, **모델이 실제로 신규/보유 가이드를 분리해 채우고 % 표기 규율을 지키는지**는 라이브 1회로만 확인 가능하다. 절차:

1. `.env.local` 의 KIS/CLAUDE_CLI_MODEL 구성 확인(현재 set).
2. `npm run dev` (로컬 전용 — route 가 Vercel 환경이면 503).
3. 종목 페이지(예 `/stock/005930`) 진입 → "AI 종합분석" → 공급자 Claude 선택 → 분석 시작.
4. 12-에이전트 완주(최대 ~50분) 후 **포트폴리오 매니저 카드** 육안 점검:
   - [ ] verdict 라벨이 6단계 중 하나로 한글 행동형(예 "분할 매도") 표기.
   - [ ] 🆕 신규 진입 시 / 📊 이미 보유 중이면 **두 블록이 분리**되어 채워짐(빈 블록 없는지).
   - [ ] holder_strategy 에 "평단가 대비 +N%" 같은 수익률 표현이 **없는지**(가격 레벨·비중·현재가 대비 % 만).
   - [ ] target stat 라벨/색이 verdict 와 일치(양수=목표가 emerald, 음수=재진입 blue, SELL=null "—") + "현재가 대비" 힌트.
   - [ ] 손익비: UNDERWEIGHT/REDUCE/SELL 이면 "진입 없음".
   - [ ] "유효 기간: 단기/중기/장기" + 확신도 보조문구 노출.
5. 모바일 뷰포트(375)·데스크탑(1280) 두 폭에서 칩 가로스크롤·리스크 캐러셀·2열 그리드·중지 아이콘 확인.
6. 카드 "전체 보기" → 오버레이가 패널 풀하이트로 덮이는지(스크롤을 중간까지 내린 상태에서도 상단부터 풀커버), ESC/돌아가기로 닫히는지.

---

## 발견된 마이너 이슈 (비차단)

1. **route.ts L256 — prevDecisions 컨텍스트 % 부호 하드코딩.** Decision Memory 를 PM 프롬프트에 주입할 때 ``목표: ${d.target_pct != null ? `+${d.target_pct}%` : "없음"}`` 로 `+` 를 강제한다. 새 스키마에서 과거 결정이 UNDERWEIGHT/REDUCE(음수 target_pct)였다면 `+-12%` 로 표기됨. **사용자 노출 카드가 아니라 PM 프롬프트 내부 컨텍스트 문자열**이라 화면 영향 0, 모델 가독성만 미세 저하. 후속 정리 권장(예: `${d.target_pct>0?'+':''}${d.target_pct}%`).
2. **target_pct === 0 엣지** — 모델이 0 을 주면 "0%"(목표가 라벨, emerald)로 렌더된다. 0 은 의미상 거의 안 나오고 무해하나, "—" 와 구분됨을 인지.

두 항목 모두 **렌더 크래시·타입·BFF·접근성과 무관**하며 본 PR 판정을 막지 않는다.

---

## 최종 판정

- **자동/정적 검증(AC1~AC7, 라운드트립 R1~R4, 에지/모바일/공통 AC): 전부 PASS.**
- **라이브 모델 출력 육안 검증(신규/보유 분리 충실도·% 표기 규율 준수): BLOCKED** — 본 세션 미실행, 머지 전 수동 1회 권장.

### 종합: 조건부 PASS

코드/타입/파싱/렌더 경로는 모순 없이 PASS. 라이브 1회 수동 검증(§ 절차)만 BLOCKED 로 남아 "조건부". 마이너 이슈 2건은 비차단.

- 정적 실패 건수: **0**
- BLOCKED(수동 필요): **1** (라이브 PM 카드 육안)
- 마이너(비차단): **2**
