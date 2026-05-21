# PRD: polish-followups

- **slug**: `polish-followups`
- **작성일**: 2026-05-22
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #23 머지 완료. main `6147f64`. 3분할 PRD (`layout-redesign` (#21) + `component-compactness` (#22) + `claude-cli-analysis` (#23)) 모두 정착. 본 PRD 는 **신규 기능 0건**, 직전 PR #22 / #23 reviewer 가 후속 권고로 남긴 nit 들을 **한 PR 로 묶어 일괄 처리**하는 polish PRD 다.
- **UI 포함 여부**: **yes** — A1 (dropdown ARIA) + A2 (input suffix 너비 토큰화) 두 항목이 디자인 토큰 영역. 단 디자이너 부담은 작음 (DESIGN.md 의 components 절만 갱신, 컬러·간격·타이포 기조 무수정).
- **선행 / 후행 관계**:
  - **선행 (모두 머지 완료)**:
    - `layout-redesign` (PR #21) — 3-section shell. 본 PRD 무수정 계승.
    - `component-compactness` (PR #22) — 컴포넌트 내부 컴팩트화. 본 PRD 는 PR #22 영역의 nit (A1·A2) 흡수.
    - `claude-cli-analysis` (PR #23) — BFF adapter 추상화 + claude CLI subprocess. 본 PRD 는 PR #23 영역의 nit (A3·B1·B2·B3) 흡수.
  - **본 PRD 가 polish 성격**:
    - 신규 기능 0건. 라운드트립 0건 변경. 응답 shape 0건 변경. adapter 인터페이스 0건 변경.
  - **후행 (사용자 결정)**:
    - PRD `claude-api-analysis` (가칭) — 사용자 명시 의도. 로컬 CLI 실 검증 후 진입.
    - PRD `analyze-streaming` (가칭) — 단일 응답 → streaming.

## 1. 배경 / 문제

### 1.1 현재 상태

PR #21~#23 누적으로 워크벤치의 화면 골격·컴포넌트 컴팩트화·BFF adapter 추상화 + 로컬 claude CLI 데이터 소스가 모두 정착. 라운드트립 5건 양 뷰포트 무회귀. 디자인 토큰·BFF 패턴·한글 카피 톤 모두 정합.

reviewer 들은 PR #22 / #23 머지를 승인하면서도 **후속 PRD 영역**으로 옮겨야 할 작은 polish 권고를 남겼다. 이들은 단일 PR 단위에서 흡수하기엔 적은 분량이지만 여러 영역 (a11y · 디자인 토큰 · adapter normalize · prompt · 주석 정합 · 타입 narrowing) 에 걸쳐 있어, 한 PRD 로 묶어 **다음 polish PR 한 번**에 모두 흡수하는 게 효율적.

### 1.2 흡수 대상 nit 항목 (verbatim 출처 명시)

본 PRD 가 처리할 항목은 **6건**이다. 각각 출처 PR · 영역 · reviewer 표현을 명시:

#### PR #22 (component-compactness) reviewer 권고에서 추출 — UI/디자인 토큰 영역

- **A1**: dropdown panel 외부 ARIA — `components/workbench/SearchPanel.tsx` 의 dropdown 이 열린 상태에서의 ARIA 완성도. listbox / option role + combobox 패턴 + aria-activedescendant 검토.
- **A2**: input suffix 너비 토큰화 — `components/workbench/InputPanel.tsx` 의 우측 suffix (USD / % / 일) 영역 너비 (현재 `pr-[var(--spacing-input-pr-suffix)]` 44px 고정) 가 각 단위별 자연 너비 가변에 맞지 않을 수 있음. 단위별 너비 토큰 정의 또는 자동 fitting.

#### PR #23 (claude-cli-analysis) reviewer 권고에서 추출 — adapter / prompt / 타입 영역

- **A3**: claudeCli 응답의 **6블록 누락 case 한글화** — `app/api/workbench/_adapters/claudeCli.ts` 의 normalize 단계에서 필수 6블록 (action / brief / feasibility / horizons / risk_plan / warnings) 누락 시 한글 fallback 메시지 정밀화. (메인 에이전트가 PR #22 머지 보고에서 PR #22 nit 로 분류한 표현이 있었으나 실 코드 위치는 PR #23 의 `_adapters/claudeCli.ts`. 본 PRD 에서 #23 영역으로 재분류.)
- **B1**: `ANALYZE_JSON_SCHEMA` (또는 동등) **미사용 export** — `app/api/workbench/_adapters/prompt.ts` (또는 동등 위치) 에 정의되었으나 실제 사용처가 없는 export. 실 사용처에 연결 또는 제거.
- **B2**: 헤더 주석 `AbortController` 표현 정합 — `app/api/workbench/_adapters/claudeCli.ts` (또는 route.ts) 의 헤더 주석에 `AbortController` 라는 표현이 있으나, 실제 timeout 메커니즘이 `child_process.execFile` 의 `timeout` option + manual kill 또는 `AbortSignal.timeout` 인지 코드와 일치 여부 점검. 표현·코드 정합.
- **B3**: `position` shape narrowing 부재 — claudeCli normalize 의 `position` 필드 (또는 동등 nested shape: BUY/SELL/HOLD action 안의 가격/방향 nested object) narrowing 없이 spread. 보수적 type guard 추가.

#### PR #21 (layout-redesign) reviewer 권고 잔여 — 본 PRD **비대상**

- Sidebar 60px 폭 / pushHistory 시점 / ticker-change effect 3건은 PR #22 작업 중 모두 흡수 완료. 본 PRD 는 **#22 · #23 영역만**.

### 1.3 사용자 의도 (verbatim)

> "PR #21~#23 reviewer 가 후속 권고로 남긴 작은 polish 들을 한 PR 로 묶어 처리하는 polish PRD"

추출 가능한 사용자 우선순위:

1. **단일 PR 로 일괄 흡수** — 6건 모두 한 `feature/polish-followups` 브랜치 + 한 PR 로 처리.
2. **신규 기능 0건** — polish only. 라운드트립·응답 shape·adapter 인터페이스 무수정.
3. **다음 PRD 후보**는 사용자가 직접 결정 — PM 권고는 `claude-api-analysis` (사용자 명시 의도) 이나 사용자 발화 우선.

### 1.4 문제

- **PR 단위 비효율** — 6건을 각각 별도 PR 로 다루면 PR 당 변경 ~10~50 라인. 라벨 흐름 (impl-ready → qa-passed → review-approved) 오버헤드가 변경량보다 큼.
- **검토 누락 위험** — reviewer 권고를 다음 기능 PRD 로 함께 끌고 가면 영역 외 변경으로 분류되어 누락 가능. 별도 PRD 로 못박아 두는 게 안전.
- **회귀 위험 작음** — A2 (suffix 너비) 만 시각 회귀 가능. 나머지 5건은 비시각 polish. 한 번에 묶어도 QA 부담 작음.
- **디자이너 부담 작음** — A1·A2 두 항목 모두 DESIGN.md 의 components 절만 갱신. 컬러·간격·타이포 기조 무수정.

### 1.5 컨텍스트 메모

- 본 PRD 진입 시점에 PR #6 ~ #23 모두 머지되어 있고 main 은 `6147f64` 기준이라고 가정.
- 변경 영역은 다음에 국한:
  - `components/workbench/SearchPanel.tsx` (A1)
  - `components/workbench/InputPanel.tsx` (A2)
  - `docs/design/polish-followups.md` 또는 v6 신설 (A1·A2, components 절)
  - `app/api/workbench/_adapters/claudeCli.ts` (A3·B2·B3)
  - `app/api/workbench/_adapters/prompt.ts` (또는 동등 위치, B1)
  - `lib/copy/workbench/errorMessages.ts` (A3, `CLAUDE_CLI_FALLBACKS` 카탈로그 확장)
  - QA 리포트
- 신규 라이브러리 0건 (특히 zod 미도입). 신규 컴포넌트 0건. 신규 prop 시그니처 0건.

## 2. 목표

- **PR #22 / #23 reviewer nit 6건** (A1 / A2 / A3 / B1 / B2 / B3) 을 한 PR 로 일괄 흡수한다.
- **신규 기능 0건**. 라운드트립·응답 shape·adapter 인터페이스 무수정. UI 사용자 동선 무변경.
- **회귀 0건** — 라운드트립 5건 양 뷰포트 무회귀. 한글 카피 톤 무회귀. typecheck/lint/build 0 에러.
- **디자인 토큰 영역**은 DESIGN.md 갱신 → `npm run design:sync` → `tailwind.theme.json` 재생성 파이프라인을 따른다 (v6 신설 또는 v5 갱신, §9 OPEN QUESTION 5).
- **a11y 영역**은 dev tools accessibility tree 검증 + 수동 스크린리더 시뮬레이션 (라운드트립 5건 중 ticker 검색 1건만으로 충분).

## 3. 범위 (In Scope)

### 3.1 A1 — dropdown ARIA 완성도 (PR #22 영역)

- `components/workbench/SearchPanel.tsx` dropdown 의 ARIA role / aria-* 속성 검토.
- 권고 (디자이너 final):
  - dropdown panel: `role="listbox"`.
  - 각 옵션 항목: `role="option"` + `aria-selected`.
  - input: `role="combobox"` + `aria-expanded` + `aria-controls={listboxId}` + `aria-activedescendant={highlightedOptionId}`.
- 키보드 ↑/↓/Enter/ESC navigation 도 권고 — §9 OPEN QUESTION 3.
- 검증: dev tools accessibility tree + 수동 스크린리더 시뮬레이션 (VoiceOver macOS).
- DESIGN.md: components 절의 `search-dropdown` 토큰 항목에 ARIA 표 추가.

### 3.2 A2 — input suffix 너비 토큰화 (PR #22 영역)

- 현재 `--spacing-input-pr-suffix: 44px` 로 모든 단위에 동일. USD / % / 일 / KRW 등 가변 너비 대응 필요.
- 옵션:
  - **옵션 A (PM 권고)**: 단위별 너비 토큰 (`--spacing-input-pr-suffix-sm: 36px` (%, 일) / `-md: 44px` (USD) / `-lg: 56px` (KRW 향후)).
  - 옵션 B: suffix 영역을 `padding-right` 가 아닌 `flex` + `gap` 으로 자동 fitting.
- 디자이너 결정. PM 권고: 옵션 A (토큰 일관성 유지, design:sync 파이프라인과 정합).
- DESIGN.md: components 절의 `input-suffix` 갱신 또는 신규 토큰.
- 검증: 라운드트립 5건의 InputPanel 시각 회귀 양 뷰포트 무회귀.

### 3.3 A3 — claudeCli 6블록 누락 한글 fallback (PR #23 영역)

- `app/api/workbench/_adapters/claudeCli.ts` normalize 단계의 누락 처리:
  - 필수 6블록 (action / brief / feasibility / horizons / risk_plan / warnings) 각각의 누락 시 처리:
    - **PM 권고**: `'malformed'` ApiError 직송 (사용자가 누락된 결과 보지 않도록).
    - 대안: 부분 fallback 채워서 반환 — 사용자 혼란 위험으로 비권고.
- 한글 메시지 정밀화 — `lib/copy/workbench/errorMessages.ts` 의 `CLAUDE_CLI_FALLBACKS` 카탈로그 확장:
  - 예: `"분석 결과의 '근거(brief)' 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."`
  - 6블록 각각의 누락 메시지를 별도 키로 분리.
- 검증: claude CLI mock 으로 6블록 중 하나씩 누락한 응답 6개 케이스에 대해 expected 한글 메시지 매핑.

### 3.4 B1 — 미사용 export 정리 (PR #23 영역)

- `app/api/workbench/_adapters/prompt.ts` (또는 동등 위치) 의 `ANALYZE_JSON_SCHEMA` (또는 동등) 미사용 export 처리:
  - **PM 권고**: prompt 안에 schema 를 inline 으로 박는 식으로 **실 사용**. claude 가 schema 를 따르도록 유도.
  - 대안: 제거. PM 비권고 (schema 정의 자체는 가치 있음).
- 검증: `git grep -n "ANALYZE_JSON_SCHEMA" app/` 결과 미사용 export 0건. 사용처가 system prompt 안 또는 user prompt 안에 embed.

### 3.5 B2 — 주석 표현 정합 (PR #23 영역)

- 헤더 주석에 `AbortController` 표현 발견 시 실 timeout 메커니즘과 일치하게 수정:
  - 실 메커니즘이 `child_process.execFile` 의 `timeout` option + manual kill 이면 주석 표현을 그쪽으로.
  - 실 메커니즘이 `AbortSignal.timeout()` 기반이면 주석 표현 유지.
- 검증: `git grep -n "AbortController" app/api/workbench/` 결과 표현·실 코드 매핑.
- DESIGN.md 무영향 (코드 주석만).

### 3.6 B3 — position narrowing 추가 (PR #23 영역)

- claudeCli normalize 의 `position` (또는 동등 nested shape) narrowing 없이 spread 되는 부분에 type guard 추가:
  - **PM 권고**: 자체 narrowing (`function isPositionShape(value: unknown): value is PositionShape { ... }`). zod 미도입.
  - 대안: zod 도입 — PM 비권고 (라이브러리 1건 추가 비용 > 본 PRD 가치).
- 검증: `git grep -nE "function is(Position|...)" app/api/workbench/_adapters/claudeCli.ts` 결과 type guard 함수 존재. typecheck 0 에러.

## 4. 범위 외 (Out of Scope)

- **신규 기능** — 본 PRD 는 polish only. 분석 결과 항목 추가·제거 0건. 라운드트립 추가 0건.
- **PRD `claude-api-analysis`** — 사용자가 CLI 실 검증 후 진입할 별도 PRD. 본 PRD 는 무관.
- **3-section shell 골격 변경** — PR #21 무수정.
- **컴팩트 사이즈 조정** — PR #22 무수정 (이미 정착).
- **adapter 추상화 변경** — PR #23 무수정. `Adapter` 인터페이스 0건 변경.
- **신규 라이브러리** — zod / yup / 기타 schema 검증 라이브러리 도입 0건.
- **컴포넌트 prop 시그니처 변경** — SearchPanel · InputPanel 외부 인터페이스 0건 변경.
- **컬러·간격·타이포 기조 변경** — DESIGN.md 의 colors / spacing / typography 절 0건 변경. components 절만 갱신.
- **claude CLI 인터페이스 변경** — flag · stdin/stdout 포맷 0건 변경.
- **streaming 응답** — PRD `analyze-streaming` 영역.
- **multi-locale** — 한글만. 추후 i18n PRD 영역.

## 5. 수용 기준 (AC)

각 nit 별로 검증 가능한 명령 + 기대 결과를 명시한다.

### 5.1 A1 — dropdown ARIA

- **AC-A1-1**: `git grep -nE 'role="(listbox|option|combobox)"' components/workbench/SearchPanel.tsx` 결과 3개 role 모두 존재.
- **AC-A1-2**: `git grep -nE 'aria-(expanded|controls|activedescendant|selected)' components/workbench/SearchPanel.tsx` 결과 4개 aria 속성 모두 존재.
- **AC-A1-3**: dev tools accessibility tree 에서 dropdown 열린 상태에 listbox 가 input 의 `aria-controls` target 으로 잡힘.
- **AC-A1-4**: VoiceOver 로 SearchPanel 진입 시 "combobox" 로 announce 되고, 옵션 이동 시 "option N of M, selected/unselected" announce.
- **AC-A1-5 (선택)**: 키보드 ↑/↓/Enter/ESC 동작 — §9 OPEN QUESTION 3 결정에 따름.

### 5.2 A2 — input suffix 너비 토큰화

- **AC-A2-1**: DESIGN.md (v6 또는 v5 갱신) 의 components 절에 단위별 너비 토큰 정의 존재 또는 자동 fitting 명시.
- **AC-A2-2**: `npm run design:sync` 실행 후 `tailwind.theme.json` 에 신규 토큰 키 존재.
- **AC-A2-3**: `git grep -n "spacing-input-pr-suffix" components/workbench/InputPanel.tsx` 결과 단위별 분기 또는 자동 fitting 패턴 존재.
- **AC-A2-4**: 라운드트립 5건의 InputPanel 시각 회귀 양 뷰포트 (1280·1920) 무회귀 — QA 리포트에 스크린샷 첨부.

### 5.3 A3 — claudeCli 6블록 누락 한글 fallback

- **AC-A3-1**: `git grep -nE "missing|누락" app/api/workbench/_adapters/claudeCli.ts` 결과 6블록 각각의 누락 분기 존재.
- **AC-A3-2**: `lib/copy/workbench/errorMessages.ts` 의 `CLAUDE_CLI_FALLBACKS` 카탈로그에 6블록 각각의 누락 메시지 키 존재.
- **AC-A3-3**: claude CLI mock 으로 6블록 중 1개 누락한 응답 → BFF 응답 `'malformed'` ApiError + 한글 메시지 매핑.
- **AC-A3-4**: 카탈로그 메시지 한글 톤 점검 — `docs/qa/polish-followups.md` 에 6개 메시지 verbatim + 톤 평가.

### 5.4 B1 — 미사용 export 정리

- **AC-B1-1**: `git grep -n "ANALYZE_JSON_SCHEMA" app/` 결과 (a) 사용처 ≥1 존재 또는 (b) export 자체 0건 (제거 케이스).
- **AC-B1-2**: PM 권고 채택 시 (a) — prompt 안에 schema 가 inline 으로 embed 되어 있고, claude CLI 호출 시 system 또는 user prompt 에 schema 텍스트가 포함됨.
- **AC-B1-3**: typecheck/lint 0 에러.

### 5.5 B2 — 주석 표현 정합

- **AC-B2-1**: `git grep -n "AbortController" app/api/workbench/` 결과 표현이 실 코드 메커니즘과 일치 또는 표현 제거.
- **AC-B2-2**: 헤더 주석에 timeout 메커니즘이 정확히 명시 (예: `// timeout: execFile timeout option, manual kill on SIGKILL` 또는 `// timeout: AbortSignal.timeout(...)`).

### 5.6 B3 — position narrowing

- **AC-B3-1**: `git grep -nE "function is(Position|.+Shape)" app/api/workbench/_adapters/claudeCli.ts` 결과 type guard 함수 ≥1 존재.
- **AC-B3-2**: narrowing 통과 못한 nested shape 는 `'malformed'` ApiError 로 분기 (A3 와 정합).
- **AC-B3-3**: typecheck 0 에러. (zod 등 신규 라이브러리 import 0건.)

### 5.7 공통

- **AC-COMMON-1**: `npm run typecheck` 0 에러.
- **AC-COMMON-2**: `npm run lint` 0 에러.
- **AC-COMMON-3**: `npm run build` 0 에러.
- **AC-COMMON-4**: 라운드트립 5건 양 뷰포트 무회귀 — QA 리포트.
- **AC-COMMON-5**: 한글 톤 무회귀 — QA 리포트에 변경 카피 verbatim.
- **AC-COMMON-6**: BFF 패턴 무회귀 — `git grep -n "fetch(" app/ components/ hooks/ lib/` 결과 route handler 안만 존재.

## 6. 가정 / 제약

### 6.1 가정

- PR #6 ~ #23 모두 머지되어 있고 main 이 `6147f64` 기준이다.
- `feature/polish-followups` 브랜치 단일 PR 로 일괄 처리한다.
- A1 의 키보드 navigation 은 §9 OPEN QUESTION 3 결정에 따라 도입 또는 보류.
- A2 의 너비 토큰화 옵션은 디자이너가 옵션 A (PM 권고) 또는 옵션 B 중 결정.
- A3 의 누락 처리는 `'malformed'` ApiError 직송 (PM 권고).
- B1 의 미사용 export 는 prompt 안에 inline embed 로 실 사용 (PM 권고).
- B3 의 narrowing 은 자체 type guard. zod 미도입.
- DESIGN.md 는 v6 신설 (PM 권고) 또는 v5 갱신 — §9 OPEN QUESTION 5.

### 6.2 제약

- **신규 라이브러리 도입 0건** — 특히 zod / yup 비도입.
- **컴포넌트 prop 시그니처 변경 0건** — SearchPanel · InputPanel 외부 인터페이스 무수정.
- **adapter 인터페이스 변경 0건** — `Adapter` shape 무수정.
- **응답 shape 변경 0건** — `lib/types/workbench/analyze.ts` 무수정.
- **컬러·간격·타이포 기조 변경 0건** — DESIGN.md 의 components 절만 갱신.
- **PRD docs-only PR 별도 생성 금지** — 본 PRD 는 워킹트리에 두고 `feature/polish-followups` 브랜치에 누적 commit.

## 7. 참고

- `docs/prd/component-compactness.md` — PR #22 PRD. A1·A2 의 원 PRD 영역.
- `docs/prd/claude-cli-analysis.md` — PR #23 PRD. A3·B1·B2·B3 의 원 PRD 영역.
- `docs/prd/layout-redesign.md` — PR #21 PRD. 본 PRD 무영향이나 3분할 컨텍스트 참조.
- `docs/design/component-compactness.md` — PR #22 DESIGN.md (v5). A1·A2 의 디자인 토큰 base.
- `AGENTS.md` — PRD 양식 1~7 + §8 영향 분석 + §9 OPEN QUESTION 패턴.
- `docs/rules/frontend.md` — 컨벤션 8개 절. 본 PRD 무수정 계승.
- `docs/rules/design-md.md` — DESIGN.md 포맷. A1·A2 의 components 절 갱신 시 참조.

## 8. 영향 분석

### 8.1 변경 영역

| 영역 | 항목 | 변경 라인 추정 | 위험 |
|---|---|---|---|
| `components/workbench/SearchPanel.tsx` | A1 ARIA + 키보드 nav | 30~80L | 낮음 (시각 무변경, accessibility tree 만) |
| `components/workbench/InputPanel.tsx` | A2 suffix 너비 | 10~30L | 중간 (시각 회귀 가능) |
| `docs/design/<polish-followups 또는 v6>.md` | A1·A2 components 절 | 30~60L | 낮음 |
| `app/api/workbench/_adapters/claudeCli.ts` | A3 누락 분기 + B2 주석 + B3 narrowing | 40~100L | 낮음 (mock 기준 검증) |
| `app/api/workbench/_adapters/prompt.ts` (또는 동등) | B1 inline embed | 10~30L | 낮음 |
| `lib/copy/workbench/errorMessages.ts` | A3 카탈로그 확장 | 10~20L | 낮음 |
| `docs/qa/polish-followups.md` | QA 리포트 | 100~200L | 낮음 |

**총 변경 라인 추정**: 230~520L. PR #21~#23 보다 매우 작음.

### 8.2 회귀 위험

- **A2 (suffix 너비)** — 유일한 시각 회귀 가능 영역. 라운드트립 5건 양 뷰포트 (1280·1920) QA 필수.
- **A3 (누락 분기)** — 기존 정상 응답 path 무회귀 검증. mock 으로 6블록 모두 있는 응답 → 200 OK 가 그대로 반환되는지.
- **B3 (narrowing)** — 기존 정상 nested shape 가 type guard 를 통과하는지 확인. false negative 발생 시 정상 응답이 `'malformed'` 로 분류되는 회귀 가능.
- 나머지 (A1·B1·B2) — 시각·런타임 무영향.

### 8.3 라벨 흐름

- `impl-ready` (FE Dev + API Integration Dev 합동 commit 후)
- `qa-passed` (QA 리포트 push 후)
- `review-approved` (Reviewer)
- DevOps 머지 + 브랜치 정리.

### 8.4 PR 본문 `## 다음 작업` 후보

- **PRD `claude-api-analysis`** — 사용자 명시 의도. 로컬 CLI 실 검증 결과를 바탕으로 진입.
- **PRD `analyze-streaming`** — 단일 응답 → streaming.
- **종결** — 사용자가 다음 PRD 보류 시 본 PRD 머지로 polish 사이클 종결 명시.

`qa-passed` 라벨이 붙는 순간 `handoff-append.yml` workflow 가 `docs/HANDOFF.md` 에 자동 append 한다.

## 9. OPEN QUESTION

각 항목에 PM 권고를 동봉한다. 디자이너·FE Dev·API Integration Dev 가 진입 시 1순위로 검토.

### 9.1 A2 suffix 너비 — 옵션 A (단위별 토큰) vs 옵션 B (flex 자동 fitting)

- **옵션 A**: `--spacing-input-pr-suffix-sm` (36px, %·일) / `-md` (44px, USD) / `-lg` (56px, KRW 향후). DESIGN.md 의 components 절에 단위별 매핑 표.
- **옵션 B**: suffix 영역을 `padding-right` 가 아닌 `flex` + `gap` 으로 자동 fitting. 토큰 1개로 충분하지만 design:sync 파이프라인과 정합성 약화.
- **PM 권고**: 옵션 A. 토큰 일관성 유지, 단위 추가 시 토큰만 추가하면 됨.

### 9.2 A3 누락 시 처리 — `'malformed'` 에러 vs 부분 fallback

- **'malformed' ApiError**: 사용자가 누락된 결과를 보지 않음. UI 가 6블록 모두 비어 있는 상태로 렌더되지 않음.
- **부분 fallback**: 누락된 블록만 placeholder. 사용자가 일부라도 결과를 봄. 그러나 placeholder 톤 결정 부담.
- **PM 권고**: `'malformed'` ApiError. UX 일관성 (성공 = 6블록 완전 / 실패 = 명시적 에러 메시지).

### 9.3 A1 키보드 navigation 도입 여부 — 도입 (권고) vs 보류 (별도 PRD)

- **도입**: ↑/↓ 옵션 이동, Enter 선택, ESC 닫기. 구현 비용 작음 (30~50L). 본 PRD 한 PR 안에서 처리 가능.
- **보류**: 별도 a11y 전담 PRD 로 분리. 본 PRD 는 ARIA 속성만.
- **PM 권고**: 도입. ARIA 속성 추가와 짝지어야 의미 있음 (`aria-activedescendant` 가 키보드 nav 없이는 무의미).

### 9.4 B1 prompt schema inline vs 제거

- **inline embed**: claude 가 schema 를 따르도록 system prompt 안에 schema 텍스트 포함. claude 응답의 일관성 ↑.
- **제거**: 미사용 export 단순 제거. 코드 정리 효과만.
- **PM 권고**: inline embed. claude 응답 안정화 부수 효과.

### 9.5 DESIGN.md v6 신설 vs v5 갱신

- **v6 신설**: `docs/design/polish-followups.md` 별도 파일. 변경 범위가 작아도 PRD 1:1 매핑 유지.
- **v5 갱신**: `docs/design/component-compactness.md` 의 components 절 갱신. 파일 추가 0건.
- **PM 권고**: v6 신설. PRD slug 와 DESIGN.md slug 1:1 매핑 컨벤션 유지.

### 9.6 다음 PRD 후보 — `claude-api-analysis` (사용자 명시 의도) / `analyze-streaming` / 종결

- **`claude-api-analysis`**: 사용자가 PR #23 PRD 의 `1.2 사용자 의도` 에 명시한 후속 의도 — "이게 잘 되면 그 후에 api 연결하든가 하려고해."
- **`analyze-streaming`**: 단일 응답 → streaming. UX 개선.
- **종결**: 사용자가 다음 PRD 보류 시 본 PRD 머지로 polish 사이클 종결.
- **PM 권고**: 사용자 결정. PM 1순위 추천은 `claude-api-analysis` (사용자 명시 의도).
