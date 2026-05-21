# PRD: component-compactness

- **slug**: `component-compactness`
- **작성일**: 2026-05-22
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #21 머지 완료. main `c63b6f9`. 직전 PR #21 (layout-redesign) 로 **3-section shell** (상단 navbar + 좌측 sidebar + 메인 영역) + 메인 영역 **6블록 위계** (Action → Brief → Feasibility + Horizons → RiskPlan → Warnings) + **in-session 분석 히스토리 / 즐겨찾기** 정착. 본 PRD 는 그 다음 단계인 **컴포넌트 내부 리디자인** 만 다룬다.
- **UI 포함 여부**: yes — UX/UI 디자이너 합류 필요. 단, **PR #21 보다 부담이 작다** — colors / spacing / typography / rounded 의 기존 키는 v4 그대로 계승, **components 절만 갱신**. v5 DESIGN.md 는 별도 slug `docs/design/component-compactness.md` 로 신설되어 같은 `feature/component-compactness` 브랜치 안에서 commit (한 브랜치 한 PR 룰).
- **선행 / 후행 관계**:
  - **선행**:
    - `workbench-analyze-rebuild` (PR #11) — 6블록 + 라운드트립 5건.
    - `tailwind-migration` (PR #13) — design:sync 파이프라인.
    - `fe-conventions` (PR #15) — 폴더·컨벤션 + layout.tsx 컨벤션.
    - `responsive-pc-support` (PR #17) — `useBreakpoint` + 두 뷰포트.
    - `palette-modernization` (PR #20) — Signature Slate + 13 semantic 토큰.
    - `layout-redesign` (PR #21) — 3-section shell + 6블록 위계 + DESIGN.md v4. 본 PRD 의 직전 선행. 모두 머지 완료.
  - **후행 — 3분할 PRD 중 두 번째**:
    - PRD **#1 layout-redesign** (PR #21, 머지 완료) — 3-section shell + 정보 구조 + 반응형 골격.
    - 본 PRD **#2 component-compactness** (현재) — input·dropdown·selectbox 등 개별 컴포넌트의 크기·폰트·outside-click·input 내 단위 표기 등 컴포넌트 내부 리디자인.
    - PRD **#3 claude-cli-analysis** (본 PRD 머지 후 신설) — 분석 결과의 데이터 소스 교체 (현재 FastAPI BE → 향후 BFF route handler 가 로컬 claude CLI 를 subprocess 로 호출).
  - 분할 사유: PR #21 §8.5 와 동일. 본 PRD 는 그 중 두 번째 단계.

## 1. 배경 / 문제

### 1.1 현재 상태

PR #21 머지 후 워크벤치의 골격은 정착됐다. 글로벌 navbar + 좌측 sidebar + 메인 영역의 3-section shell 이 있고, 메인 영역 상단에 `SearchPanel` (ticker 검색) + `InputPanel` (자본·목표·기간·최대 손실 4필드), 그 아래 6블록 결과 영역이 위계대로 배치돼 있다.

`components/workbench/*` 의 12개 컴포넌트와 `components/layout/*` 의 6~7개 컴포넌트가 모두 존재 — 그러나 **개별 컴포넌트의 내부 디자인은 PR #11 단계의 기조 그대로** 다. PR #21 §4.1 에서 명시적으로 "컴포넌트 내부 디자인은 PRD #2 영역" 으로 미뤄둔 항목들이 그대로 남아있다.

### 1.2 사용자 의도 (verbatim)

이전 세션에서 사용자가 명시한 컴팩트 의도. PR #21 의 §4.1 (비범위) 에 미뤄둔 채로 보존돼 있던 원문이다.

> "각 컴포넌트 크기는 너무 크지 않게 가져가자. 지금은 input이나 dropdown option들 크기보면 전체적으로 좀 커 글씨체도 좀 큰편이고."

> "selectbox 같은건 focusing하면 dropdown option 항목이 보이는건 좋은데 다른곳 클릭하면 자동으로 닫히게 하거나 하는 기본적인 편의성이 있어야해."

> "input 컴포넌트도 단위를 쓸거면 아예 input 필드 안에 오른쪽에 단위가 보이게 해서 컴포넌트가 아예 한 라인을 컴팩트하게 가져가는게 더 이쁠 수 있어."

> "디자인에 힘을 줘서 디자인 전문가라고 생각하고 코인, 주식 분석해서 결과 알려주는 디자인을 고민해봐."

본 PRD 는 위 4 문장에서 추출 가능한 의도를 모두 흡수한다 — (a) 전체 컴팩트 톤, (b) outside-click 자동 닫힘, (c) input 내 우측 suffix 단위 표기, (d) 전문가 톤 디자인.

### 1.3 문제

- **컴포넌트 전체 톤이 두툼하다** — input 의 height, padding, font-size 가 데스크탑 화면에 비해 큼. 폼 한 줄이 차지하는 세로 공간이 커서 입력 영역이 메인 영역의 위 절반을 잡아먹는다. 트레이딩 분석 도구로서 "정보 밀도가 높고 조작이 빠른" 토스톤 (`AGENTS.md` 작업 원칙) 에서 벗어남.
- **dropdown 의 outside-click 미처리** — `SearchPanel` 의 ticker 검색 결과 dropdown 이 focus 잃을 때 자동으로 닫히지 않는다. 다른 영역을 클릭해도 dropdown 이 남아 화면을 가린다. ESC 키 처리도 없다. 기본적인 편의성 누락.
- **input 단위가 별도 라벨로 분리** — `%`, `일`, `USD` 같은 단위가 input 옆 또는 label 안에 별도 텍스트로 있어 한 필드가 가로로 늘어진다. input 내부 우측 suffix 로 흡수하면 한 라인이 컴팩트해진다.
- **버튼·아이콘·인터랙티브 요소 톤 불균질** — 분석 실행 버튼, 즐겨찾기 별표, navbar hamburger, drawer close 등 작은 인터랙티브 요소들이 동일 디자인 언어로 묶여있지 않다.
- **PR #21 reviewer nit 3건이 본 PRD 영역으로 흡수** — Sidebar 인라인 60px 토큰 미흡, page.tsx pushHistory 시점, ticker-change effect 첫 발화. `docs/HANDOFF.md` #21 entry 의 다음 작업 후보와 일치.

### 1.4 컨텍스트 메모

- 본 PRD 진입 시점에 PR #21 머지가 완료돼 있고 main 은 `c63b6f9` 기준이라고 가정.
- PR #21 의 DESIGN.md v4 (`docs/design/layout-redesign.md`) 는 무수정. 본 PRD 의 v5 DESIGN.md 는 **별도 slug** `docs/design/component-compactness.md` 로 신설된다. v4 의 colors / spacing / typography / rounded **기존 키는 그대로 계승**, components 절만 갱신.
- 디자이너 부담은 PR #21 보다 작음 — 새 layout 골격이 없고, 신규 토큰은 components 합성 토큰 중심.

## 2. 목표

- 입력 영역의 4개 input 필드 (`InputPanel`) 와 ticker 검색 (`SearchPanel`) 의 dropdown 의 **컴팩트화** — height, padding, font-size 다운. 한 라인의 세로 공간을 줄여 메인 영역에서 결과 6블록의 가시성을 높인다.
- dropdown 의 **기본적인 편의성** 완비 — outside-click 자동 닫힘, ESC 키 닫힘, focus 이동 시 닫힘 옵션.
- input 의 **단위 표기를 input 내부 우측 suffix 로 이동** — `%`, `일`, `USD` 가 input 필드 안에 absolute 위치. 한 라인이 컴팩트해진다.
- 분석 실행 버튼·즐겨찾기 별표·hamburger·drawer close 등 **작은 인터랙티브 요소의 톤 정합** — height / padding / font-size 한 시각 언어로.
- DESIGN.md v5 신설 — colors / spacing / typography / rounded 의 **기존 키는 v4 그대로 계승**, components 절만 갱신. 신규 component 토큰 추가 가능 (예: `input-suffix`).
- PR #21 의 3-section shell 골격, 메인 영역 6블록 위계, in-session 히스토리/즐겨찾기 동작 **무회귀**.
- 라운드트립 5건 (PR #11 정의) 이 두 뷰포트 (375 / 1280) 에서 본 PRD 의 컴팩트한 컴포넌트로 무회귀.
- PR #21 reviewer nit 3건 흡수 (Sidebar 60px 토큰 / pushHistory 시점 / ticker-change effect 첫 발화).
- 신규 라이브러리 0건. outside-click 등은 자체 구현 (단, §9 OPEN QUESTION 2 에 사용자 결정 권한 보존).

## 3. 범위 (In scope)

### 3.1 input 컴포넌트 컴팩트화

- 대상: `components/workbench/InputPanel.tsx` 안의 4 필드 (capital / target / horizon / max_loss).
- height / vertical padding / font-size 다운. 정확한 토큰값은 디자이너 결정 — §9 OPEN QUESTION 1.
- PM 권고 가이드 (디자이너 최종):
  - height: 데스크탑·모바일 공통 **36~40px** 권장 (현재 추정 44~48px 대비 다운).
  - horizontal padding: 12px 권장.
  - font-size: 본문보다 살짝 작은 14px 권장.
  - label 위 + line-height 컴팩트 (label 자체도 12~13px 권장).
- **단위 표기 위치** — input 필드 내부 우측 absolute suffix. label 옆이나 input 옆 별도 텍스트 노드가 아니라 input wrapper 안에서 `position: relative` + suffix `position: absolute; right: ...`. DOM 구조는 AC-3 에서 명시. 정확한 우측 padding (suffix 와 텍스트 충돌 방지) 은 디자이너 결정 — §9 OPEN QUESTION 3.
- helper text 위치 — input 아래 한 줄. 톤은 muted, error 시 alert tone.
- error 상태 톤 — border + helper text 가 alert tone. label 색은 무회귀.
- placeholder 톤 — muted.

### 3.2 dropdown / selectbox UX

- 대상: `components/workbench/SearchPanel.tsx` 의 ticker 검색 결과 dropdown.
- **outside-click 자동 닫힘** — document `mousedown` (또는 `pointerdown`) 이벤트로 dropdown wrapper 외부 클릭 감지. 외부 클릭 시 dropdown 닫음. touchstart 도 동일 처리.
- **ESC 키 닫힘** — dropdown 열린 상태에서 ESC 누르면 닫힘. 필요 시 focus 를 검색 input 으로 복귀.
- **focus 이동 시 닫힘 옵션** — Tab 으로 dropdown 외부로 focus 이동 시 닫힘. 디자이너 결정 — §9 OPEN QUESTION 4.
- **옵션 항목 컴팩트화** — 항목 height / padding / font-size 다운. PM 권고:
  - 항목 height: 32~36px.
  - font-size: 13~14px.
  - hover / keyboard arrow navigation 의 강조 톤 유지 (PR #11 무회귀).
- 키보드 ArrowUp / ArrowDown / Enter 무회귀 (PR #11 검증됨).
- 신규 라이브러리 0건 — Floating UI, Headless UI 도입 안 함. §9 OPEN QUESTION 2 에 사용자 결정 권한 보존.

### 3.3 button 등 작은 컴포넌트 톤 정합

- 대상:
  - `components/workbench/InputPanel.tsx` 의 분석 실행 버튼 (`<button type="submit">`).
  - `components/layout/FavoriteToggle.tsx` 의 별표 버튼.
  - `components/layout/Navbar.tsx` 의 hamburger 아이콘 버튼.
  - `components/layout/MobileDrawer.tsx` 의 close 버튼.
  - `components/workbench/EmptyState`, `ErrorCard` 의 부가 버튼 (있는 경우).
- height / padding / font-size 한 시각 언어로 정합. PM 권고:
  - 주 버튼 (분석 실행): height 40~44px (input 보다 약간 큼), 풀폭 또는 고정 폭.
  - 보조 / 아이콘 버튼: height 32~36px (input 과 동등 또는 작음).
- icon-only 버튼은 정사각형 hit area 보장 (최소 32x32px). 작은 size 라도 접근성 영역 ≥ 40x40px (디자이너 결정).
- focus ring 무회귀 — PR #11 의 outline 토큰 그대로.

### 3.4 합성 토큰 갱신 (DESIGN.md v5 트리거)

- 신규 파일: `docs/design/component-compactness.md` (v5).
- v4 의 colors / spacing / typography / rounded 의 **기존 키는 무수정 계승**. 본 PRD 가 추가할 수 있는 키는 신규 키만.
- 갱신되는 절 — **components 절만**:
  - `input`, `input-suffix` (신규), `input-label`, `input-helper`, `input-error` 등.
  - `dropdown`, `dropdown-item`, `dropdown-panel`.
  - `button`, `button-primary`, `button-secondary`, `button-icon`.
  - 기존 components 합성 토큰 중 본 PRD 가 갱신하는 것은 height / padding / font-size 값 다운. 토큰 키 자체는 가능한 유지.
- prose:
  - 컴팩트 톤의 설계 의도 단락.
  - input 내 suffix 위치 근거 단락.
  - dropdown outside-click 동작 명세.
  - 본 PRD 가 PR #21 의 layout 골격을 무수정 계승함을 명시.
- `npx @google/design.md lint` errors=0 warnings=0.
- 디자이너는 같은 `feature/component-compactness` 브랜치에 commit (별도 docs PR 없음).

### 3.5 PR #21 reviewer nit 3건 흡수

PR #21 reviewer 가 nit 로 분류한 3건. `docs/HANDOFF.md` #21 entry 의 다음 작업 후보와 일치.

#### 3.5.1 Sidebar.tsx 인라인 60px 토큰 미흡

- 대상: `components/layout/Sidebar.tsx` 안의 인라인 px 값 (60px 등) 또는 인라인 style.
- **합성 토큰 또는 Tailwind 토큰으로 흡수** — 변수 직접 참조 0건.
- 검증: `git grep -nE "[0-9]+px" -- components/layout/Sidebar.tsx` 결과 본 PRD 가 추가/남긴 라인 0건.
- 신규 토큰이 필요한 경우 v5 DESIGN.md 의 components 또는 spacing 절에 추가.

#### 3.5.2 page.tsx pushHistory 시점

- 대상: `app/(workbench)/page.tsx` (또는 동등 위치) 의 분석 mutation 결과 히스토리 push 로직.
- 현재 추정: mutation 성공 + `analyzedAt` 변경 시 push.
- **분기 정밀화**:
  - mutation 성공 (`isSuccess === true`) 일 때만 push. 실패 시 push 안 함.
  - 동일 ticker · 동일 입력값으로 직전과 같은 push 방지 (중복 보호). 단순 LRU 패턴 (`useAnalyzeHistory` 안에서 중복 시 promote) 으로 흡수 가능.
  - `analyzedAt` (혹은 동등 mutation 결과의 timestamp / id) 변경 감지로 effect 가 한 분석 결과 당 정확히 1회 발화.
- 검증: 분석 1회 = 히스토리 push 1건 (중복 시 promote 만). AC-7 에서 명시.

#### 3.5.3 ticker-change effect 첫 발화

- 대상: `app/(workbench)/page.tsx` 또는 관련 훅의 ticker 변경 감지 effect.
- 현재 추정: ticker state 변경 시 입력값 초기화·검증 재실행 등의 effect. 첫 마운트 시 의도치 않은 발화 가능성.
- **첫 마운트 발화 차단** — dep 정밀화 또는 ref 가드:
  - 옵션 A: `useRef(false)` 가드로 첫 발화 skip.
  - 옵션 B: dep 배열에서 ticker 만 의존, 초기 `null`/`""` 일 때 early return.
  - 옵션 C: 별도 mutation `reset` 호출로 의도치 않은 side effect 제거.
- frontend-dev 가 옵션 선택. 검증: 첫 마운트 시 ticker-change effect 의 side effect (예: input 리셋, prefetch) 가 발화 안 함. AC-8 에서 명시.

### 3.6 무회귀 라운드트립

- PR #11 라운드트립 5건 — (a) AAPL 정상, (b) BTC-USD 정상, (c) 비분할가능, (d) 화이트리스트 비매칭, (e) 5xx 폴백 — 모두 본 PRD 의 컴팩트 톤에서 시각·동작 무회귀.
- 두 뷰포트 (모바일 375px / 데스크탑 1280px) 모두에서 컴팩트한 입력·dropdown 의도대로 표시.
- PR #21 의 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기 동작 무회귀.
- BFF 무회귀: `git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건 (route handler 안 제외).
- 한글 톤 무회귀: `lib/copy/workbench/*` 한글 카피 무수정.

## 4. 비범위 (Out of scope)

본 PRD 는 3분할 PRD 중 두 번째 (컴포넌트 내부) 다. 다음은 다른 PRD 영역이거나 별도 PRD 로 미뤄지며, 본 PRD 에서는 다루지 않는다.

### 4.1 PRD #3 claude-cli-analysis 영역

- 분석 결과의 데이터 소스 교체 — 현재 FastAPI BE → 향후 Next.js BFF route handler 가 로컬 claude CLI 를 subprocess 로 호출.
- claude CLI 호출 protocol, 응답 mapping, 에러 핸들링.
- 본 PRD 는 화면 UX 만. BFF / FastAPI / route handler 무수정.

### 4.2 PR #21 의 layout 영역

- **3-section shell 골격 변경** — PR #21 의 navbar + sidebar + 메인 영역 구조 무수정.
- **6블록 위계 변경** — PR #21 의 ResultGroup 배치 (Action → Brief → Feasibility + Horizons → RiskPlan → Warnings) 무수정.
- **사이드바 정보 카테고리 변경** — 분석 히스토리·즐겨찾기 위치·종류 무수정.
- **모바일 drawer 동작 변경** — drawer 열림/닫힘 트리거, focus trap 등 무수정 (단, drawer close 버튼 자체의 톤은 §3.3 영역).
- **route group / layout.tsx 구조 변경** 무수정.

### 4.3 그 외 비범위

- **신규 컴포넌트 추가** — 본 PRD 는 기존 컴포넌트 내부 리디자인만. 신규 컴포넌트 (예: 다크모드 토글, 사용자 메뉴, 알림 패널, tooltip, modal 등) 는 별도 PRD.
- **컴포넌트 prop 시그니처 변경** — PM 권고는 prop 시그니처 무수정. 호출 측 (page.tsx, ResultGroup 등) 회귀를 막기 위함. 디자이너·frontend-dev 가 prop 시그니처를 바꿔야 하는 경우 §9 OPEN QUESTION 7 로 올림.
- **다크 모드 도입** — 별도 PRD.
- **신규 색·팔레트 변경** — Signature Slate 그대로. v4 의 colors front matter 무수정.
- **신규 라이브러리 (Floating UI, Headless UI, Radix, react-aria 등) 도입** — outside-click 등은 자체 구현 권장. 단, 디자이너·frontend-dev 가 의존성 도입 사유 충분하면 §9 OPEN QUESTION 2 로 올림.
- **차트·시각화** — 캔들·라인 도입 없음 (PR #21 비범위 계승).
- **BE / FastAPI / API contract 변경**.
- **사용자 인증·세션·Supabase 연동** — MVP 단계 BE/DB 없음 계승. in-session 메모리만.
- **다국어 i18n 실제 도입** — 한글 카피 유지.
- **E2E / 시각 회귀 자동화** — QA 의 수동 라운드트립.
- **로고·아이콘·이미지 에셋 디자인 변경** — 본 PRD 는 컴포넌트 톤만. 에셋은 별도.
- **분석 히스토리·즐겨찾기의 DB 영속화** — Supabase 연동 PRD 이후.

## 5. 수용 기준 (AC)

검증 가능한 문장.

### AC-1 (input 컴팩트 토큰 적용)

- `InputPanel` 의 4 필드 (capital / target / horizon / max_loss) 의 height / vertical padding / font-size 가 PR #21 시점 대비 다운된다.
- 정확한 값은 디자이너가 v5 DESIGN.md 의 components 절에 정의.
- 검증:
  - 코드에서 input 의 height / padding / font-size 가 합성 토큰 또는 Tailwind 토큰 클래스로만 표현 (hex/px 직타 0건). `git grep -nE "h-\[[0-9]+px\]|py-\[[0-9]+px\]" -- components/workbench/InputPanel.tsx` 결과 0건.
  - 브라우저 dev tools 로 측정한 input 4필드의 height 가 36~40px 범위 (디자이너가 다른 값을 채택한 경우 DESIGN.md 정의 값 기준).

### AC-2 (dropdown 옵션 컴팩트 토큰 적용)

- `SearchPanel` 의 ticker 검색 결과 dropdown 옵션 항목의 height / padding / font-size 가 PR #21 시점 대비 다운된다.
- 검증:
  - 코드에서 dropdown 옵션의 size 가 합성 토큰 클래스로만 표현. hex/px 직타 0건.
  - 브라우저 dev tools 측정 항목 height 32~36px 범위 (디자이너 정의 값 기준).

### AC-3 (input 내 단위 suffix DOM 구조)

- input 의 단위 표기 (`%`, `일`, `USD`) 가 input 필드 **내부 우측 absolute** 위치에 표시된다.
- DOM 구조:
  - input 의 부모 wrapper 가 `position: relative` 또는 Tailwind `relative`.
  - suffix 노드는 wrapper 안 형제로 `position: absolute; right: ...` 또는 Tailwind `absolute right-... pointer-events-none`.
  - input 자체는 우측 padding 으로 suffix 와의 시각적 충돌 방지.
- suffix 는 `pointer-events: none` 으로 input click 방해 안 함 (또는 동등 처리).
- 검증:
  - `git grep -nE "absolute" -- components/workbench/InputPanel.tsx` 에서 suffix 처리 라인 확인.
  - 브라우저 수동 — input 4필드 모두에서 단위가 input 내부 우측에 보이고, input 클릭/focus 가 suffix 에 막히지 않음.

### AC-4 (dropdown outside-click 자동 닫힘)

- ticker 검색 dropdown 이 열린 상태에서 dropdown wrapper 외부를 mousedown / pointerdown / touchstart 하면 dropdown 이 닫힌다.
- ESC 키로 dropdown 이 닫힌다.
- 검증 (수동):
  - ticker 검색 input 에 "AA" 입력 → 옵션 노출 → 화면 다른 영역 (예: 결과 영역) 클릭 → dropdown 닫힘.
  - 같은 상태에서 ESC 누름 → dropdown 닫힘.
  - 옵션 항목 클릭 시는 정상 선택 동작 (PR #11 무회귀).
- 검증 (코드): `git grep -nE "mousedown|pointerdown|touchstart" -- components/workbench/SearchPanel.tsx hooks/` 에서 outside-click 처리 라인 확인.

### AC-5 (dropdown 키보드 무회귀)

- PR #11 의 키보드 ArrowUp / ArrowDown / Enter 가 무회귀.
- 옵션 1개 이상일 때 ArrowDown → 첫 항목 강조, Enter → 선택.
- 검증: 브라우저 수동 + PR #11 라운드트립 (a) 시나리오.

### AC-6 (작은 컴포넌트 톤 정합)

- 분석 실행 버튼 / 즐겨찾기 별표 / hamburger / drawer close 가 합성 토큰 또는 Tailwind 토큰만으로 표현.
- 각각의 height / padding / font-size 가 디자이너가 v5 DESIGN.md 에 정의한 값과 일치.
- hex/px 직타 0건 (AC-13 와 중복).
- icon-only 버튼은 hit area ≥ 40x40px 또는 디자이너 정의 값.
- 검증: 브라우저 dev tools + 코드 확인.

### AC-7 (pushHistory 시점 정밀화)

- `app/(workbench)/page.tsx` (또는 동등) 의 히스토리 push 가 다음 조건 모두 만족.
  - mutation 성공 (`isSuccess === true`) 일 때만 push. 실패 시 push 안 함.
  - 한 분석 결과 (analyzedAt / id 변경) 당 정확히 1회 발화. 같은 결과로 effect 가 두 번 발화 안 함.
  - 동일 ticker 중복 push 시 기존 항목 promote (LRU). 새 항목으로 중복 추가 안 함.
- 검증 (수동):
  - 분석 1회 = 사이드바 히스토리 +1건 (또는 promote).
  - 분석 실패 (e: 5xx) 시 히스토리 변동 0건.
  - 같은 ticker · 같은 입력으로 연속 2회 분석 → 히스토리 항목 1건 (promote).
- 검증 (코드): push 로직의 dep 배열·조건 확인.

### AC-8 (ticker-change effect 첫 발화 차단)

- 첫 마운트 시 ticker-change effect 의 side effect 가 발화 안 함.
- 검증 (수동):
  - 페이지 첫 진입 시 console.log 또는 React DevTools profiler 로 ticker 의존 effect 가 첫 마운트 단계에서 의도치 않은 reset / prefetch 를 발화 안 함.
- 검증 (코드):
  - `useRef(false)` 가드 또는 dep 정밀화 또는 early return 패턴 중 하나가 코드에 보임.

### AC-9 (Sidebar 인라인 px 토큰 흡수)

- `components/layout/Sidebar.tsx` 에 인라인 px 값 (60px 등) 또는 변수 직접 참조가 없다.
- 검증: `git grep -nE "60px|[0-9]+px" -- components/layout/Sidebar.tsx` 결과 0건 (단, JSX 주석/문자열 제외).
- 신규 토큰이 필요한 경우 v5 DESIGN.md 의 components 또는 spacing 절에 정의.

### AC-10 (DESIGN.md v5 신설)

- `docs/design/component-compactness.md` 가 존재.
- v4 의 colors / spacing / typography / rounded 의 **기존 키가 무수정 계승**.
- components 절이 갱신되어 input / dropdown / button 등의 size 토큰이 다운된 값으로 정의.
- 신규 키 (`input-suffix` 등) 추가 가능.
- `npx @google/design.md lint` errors=0 warnings=0.
- 검증: `ls docs/design/component-compactness.md`, lint 실행 결과, front matter diff 확인 (v4 와 colors 동일).

### AC-11 (PR #21 layout 무회귀)

- PR #21 의 3-section shell (navbar + sidebar + 메인 영역) 골격 변경 없음.
- 메인 영역 6블록 위계 (Action → Brief → Feasibility + Horizons → RiskPlan → Warnings) 변경 없음.
- 사이드바 정보 카테고리 (분석 히스토리 + 즐겨찾기) 변경 없음.
- 모바일 drawer 열림/닫힘 동작 무회귀.
- 검증: PR #21 의 AC-1, AC-4, AC-5, AC-6 시나리오 재현 — 모두 동일 동작.

### AC-12 (라운드트립 5건 × 두 뷰포트)

- PR #11 라운드트립 5건이 dev 환경에서 모두 동작.
  - (a) `AAPL` 검색 → 선택 → 자본 100만 / 목표 5% / 기간 30일 / 최대 손실 2% → 분석 → 6블록 표시. 컴팩트한 input + suffix 확인.
  - (b) `BTC-USD` 검색 → 자본 0 → 분석 → 한글 사전 차단 메시지. input 의 error 톤 확인.
  - (c) 비현실 시나리오 → feasibility 비현실 강조 표시 (PR #11 AC-3 무회귀).
  - (d) 화이트리스트에 없는 ticker (`NVDA`) → 한글 안내. dropdown 동작 확인.
  - (e) BE down → 한글 fallback 에러 메시지.
- 모바일 (375px) + 데스크탑 (1280px) 양 뷰포트에서 동일 시나리오를 본 PRD 의 컴팩트 톤으로 검증.

### AC-13 (디자인 토큰 무회귀 + hex/px 직타 금지)

- v4 의 colors / spacing / typography / rounded 의 **기존 키가 변경되지 않는다**. (신규 키 추가 허용.)
- 검증: `git diff tailwind.theme.json` 의 기존 키 무수정 확인.
- hex / px 직타 금지: `git grep -nE "#[0-9a-fA-F]{6}" -- app/ components/` 결과 본 PRD 가 추가한 라인 0건.
- `git grep -nE "[0-9]+px" -- components/` 결과 본 PRD 가 추가한 인라인 px 0건 (Tailwind arbitrary value `h-[36px]` 등도 포함 — 토큰 클래스로 치환).

### AC-14 (BFF 무회귀)

- `git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건 (route handler 안 fallback 제외).
- `git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/` 결과 직접 fetch 0건.
- BE contract 무변경 — `lib/types/workbench/*` 응답 타입 무수정.

### AC-15 (한글 톤 무회귀)

- 사용자 노출 문구 중 ticker · BE enum 식별자 · 단위(USD, KRW, %, 일) 를 제외한 모든 텍스트가 한글.
- 검증: 브라우저 수동 + `lib/copy/workbench/*` 한글 카피 무수정.

### AC-16 (build / typecheck / lint)

- `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- `npm run design:sync` 후 git diff 가 결정적 산출물만 반영.

### AC-17 (반응형 무회귀)

- PR #17 / PR #21 의 두 뷰포트 (375 / 1280) 가 본 PRD 의 컴팩트 톤으로 시각·동작 무회귀.
- hydration mismatch 콘솔 경고 0건.
- 모바일 ↔ 데스크탑 전환 시 drawer state 정상 (PR #21 AC-6 무회귀).

### AC-18 (컴포넌트 prop 시그니처 무수정)

- `components/workbench/*` 의 12 컴포넌트와 `components/layout/*` 의 컴포넌트의 **prop 시그니처** 변경 없음 (PM 권고).
- 검증: 호출 측 (page.tsx, ResultGroup 등) 의 prop 전달 라인 무수정.
- 디자이너·frontend-dev 가 prop 시그니처를 바꿔야 하는 경우 §9 OPEN QUESTION 7 결정으로 우회.

### AC-19 (기본 접근성 무회귀)

- input 의 `aria-label` / `aria-invalid` / `aria-describedby` (helper text 연결) 가 정상.
- dropdown 의 `role="listbox"` 또는 등가, 옵션의 `role="option"` 무회귀 (PR #11 검증됨).
- 키보드 Tab 으로 navbar → 사이드바 → 메인 영역 (입력 → 결과) 순차 탐색 가능 (PR #21 AC-16 무회귀).
- 분석 실행 버튼 / 즐겨찾기 / hamburger / drawer close 모두 `aria-label` 또는 텍스트 라벨.
- 색 강조는 텍스트 라벨로 병행 (PR #11 AC-15 무회귀).
- 깊은 a11y 감사는 Reviewer 게이트.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 PR #6 ~ #21 모두 머지되어 있고 main 은 `c63b6f9` 기준이라고 가정.
- PR #21 의 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기 + DESIGN.md v4 는 본 PRD 에서 **무수정 계승**.
- v4 의 colors / spacing / typography / rounded **기존 키 무수정**. 신규 키 추가만 허용.
- DESIGN.md → `tailwind.theme.json` → `tailwind.config.ts` 파이프라인 (PR #13) 유지. 본 PRD 는 v5 DESIGN.md (`docs/design/component-compactness.md`) 를 신설하지만, 파이프라인 자체 변경 없음.
- BE / FastAPI / route handler / API contract 무변경. 본 PRD 는 화면 UX 만.
- 신규 라이브러리 0건. outside-click·focus trap·ESC 처리는 자체 구현. 단, §9 OPEN QUESTION 2 에 사용자 결정 권한 보존.
- 분석 히스토리·즐겨찾기는 **in-session 메모리만** (PR #21 계승). 새로고침 시 초기화. Supabase 영속화 별도 PRD.
- 모바일 / 데스크탑 분기는 PR #17 의 `useBreakpoint` 와 Tailwind 반응형 prefix 그대로. `window.innerWidth` 직접 검사 금지.
- 본 PRD 의 PR diff 는 PR #21 보다 작을 것으로 예상. 주된 변경은 components/workbench/* 와 components/layout/* 의 내부 + `app/components.css` 합성 토큰 + DESIGN.md v5 신설. 작업 분할은 frontend-dev 재량 — 한 브랜치 안에서 누적.
- 컴포넌트 prop 시그니처 무수정 (PM 권고). 디자이너·frontend-dev 가 시그니처 변경이 불가피한 경우 §9 OPEN QUESTION 7.
- 디자이너의 v5 DESIGN.md 작업 부담은 v4 대비 작음 — Layout 절 신설 없음, 새 색 결정 없음. 주 업무는 components 절의 size 토큰 다운 + suffix 합성 토큰 신설 + prose.
- reviewer nit 3건 (Sidebar 60px / pushHistory / ticker-change effect) 은 본 PRD 의 §3.5 와 AC-7 ~ AC-9 에 반영. 본 PRD 가 흡수.

## 7. 참고

- `docs/prd/layout-redesign.md` — 직전 PRD (#1, PR #21). 본 PRD 가 계승하는 layout 골격 정의.
- `docs/design/layout-redesign.md` v4 — colors / spacing / typography / rounded 의 단일 진실. 본 PRD 가 components 절만 갱신해 v5 로 신설.
- `docs/design/component-compactness.md` v5 — 본 PRD 의 디자이너 산출물 (신설 예정).
- `docs/prd/workbench-analyze-rebuild.md` — 라운드트립 5건 정의 + dropdown 키보드 정의.
- `docs/prd/responsive-pc-support.md` — 두 뷰포트 정의.
- `docs/prd/palette-modernization.md` — Signature Slate + 13 semantic 토큰.
- `docs/prd/fe-conventions.md` — 폴더·컨벤션 무회귀 기준.
- `docs/rules/frontend.md` — FE 컨벤션 8개 절. 특히 반응형 절·`cn` 헬퍼·합성 토큰 절.
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드.
- `tailwind.config.ts`, `tailwind.theme.json` — design:sync 파이프라인.
- `components/workbench/InputPanel.tsx` — 본 PRD 의 input 컴팩트화 1차 대상.
- `components/workbench/SearchPanel.tsx` — 본 PRD 의 dropdown outside-click + ESC 1차 대상.
- `components/layout/Sidebar.tsx` — 본 PRD 의 nit #1 흡수 대상.
- `app/(workbench)/page.tsx` (또는 동등) — 본 PRD 의 nit #2 (pushHistory) 와 nit #3 (ticker-change effect) 흡수 대상.
- `app/components.css` — 합성 토큰 갱신 위치.
- `hooks/utils/useBreakpoint.ts` — JS 측 반응형 분기 도구 (무수정 계승).
- `docs/HANDOFF.md` — PR #6 ~ #21 누적 기록. #21 entry 의 "다음 작업 후보" 가 본 PRD 와 일치.
- `AGENTS.md` — 작업 원칙·라벨 게이트·한 브랜치 한 PR 룰.

## 8. 영향 분석

### 8.1 변경되는 산출물

| 산출물 | 변경 내용 | 책임 에이전트 |
|---|---|---|
| `docs/design/component-compactness.md` (신규) | v5 신설. colors / spacing / typography / rounded 의 기존 키 v4 그대로 계승. components 절 갱신 (size 다운). 신규 토큰 `input-suffix` 등 추가. prose 보강. | ux-designer |
| `components/workbench/InputPanel.tsx` | 4 필드 (capital / target / horizon / max_loss) 의 height / padding / font-size 다운. 단위 표기 input 내부 우측 suffix 로 이동. helper / error 톤 정합. | frontend-dev |
| `components/workbench/SearchPanel.tsx` | dropdown outside-click 자동 닫힘 + ESC 키 + (옵션) Tab 닫힘. 옵션 항목 height / font-size 다운. 키보드 ArrowUp/ArrowDown/Enter 무회귀. | frontend-dev |
| `components/layout/Sidebar.tsx` | 인라인 60px 토큰 또는 변수 직접 참조를 합성 토큰 또는 Tailwind 토큰으로 흡수. nit #1 흡수. | frontend-dev |
| `components/layout/Navbar.tsx` | hamburger / 로고 영역의 작은 인터랙티브 톤 정합 (height / padding). | frontend-dev |
| `components/layout/MobileDrawer.tsx` | close 버튼 톤 정합. drawer 동작은 무수정. | frontend-dev |
| `components/layout/FavoriteToggle.tsx` | 별표 버튼 톤 정합. | frontend-dev |
| `components/workbench/ResultGroup.tsx` | 컴포넌트 내부 텍스트 톤 정합 (필요 시). 6블록 위계는 무수정. | frontend-dev |
| `app/(workbench)/page.tsx` | pushHistory 시점 정밀화 (nit #2). ticker-change effect 첫 발화 차단 (nit #3). | frontend-dev |
| `app/components.css` | 신규 합성 토큰 (`input-suffix`, 컴팩트 size 토큰 등). 기존 합성 토큰의 size 값 갱신. | frontend-dev |
| `tailwind.theme.json` | `design:sync` 산출물. v4 토큰 무수정 + 신규 키 추가. | (자동) |
| `tailwind.config.ts` | 신규 토큰 어댑터 추가 (있는 경우). | frontend-dev |
| `hooks/workbench/*` 일부 | outside-click hook 신설 (`useOutsideClick`) 등 — 위치는 `hooks/utils/` 가 적절 (도메인 무관). frontend-dev 결정. | frontend-dev |
| `hooks/utils/useOutsideClick.ts` (신규, 옵션) | dropdown 외 다른 곳에서도 재사용 가능한 outside-click 훅. | frontend-dev |
| `docs/qa/component-compactness.md` (신규) | AC 별 재현·기대·실측 표 + 라운드트립 5건 × 두 뷰포트 + dropdown UX + nit 3건 검증. | qa |

### 8.2 변경되지 않는 산출물

- `app/layout.tsx`, `app/(workbench)/layout.tsx` — PR #21 의 3-section shell 골격 무수정.
- `components/workbench/*` 의 12 컴포넌트 **prop 시그니처** — 무수정 (PM 권고).
- `components/workbench/ActionCard / BriefCard / EmptyState / ErrorCard / FeasibilityCard / HorizonsCard / LoadingSkeleton / RiskPlanCard / WarningsCard` — 컴포넌트 내부 텍스트 톤 정합 외 구조 변경 없음.
- BE / FastAPI / route handler / API contract — 무수정.
- `lib/api/workbench/*` — 무수정.
- `hooks/query/*` TanStack Query 페칭 훅 — 무수정.
- `hooks/workbench/useAnalyze*` 기존 도메인 훅 — 무수정 (pushHistory 시점 정밀화는 page.tsx 또는 `useAnalyzeHistory` 안에서).
- `lib/types/workbench/*` 응답 타입 — 무수정.
- `lib/validation/workbench/*` 사전 차단 — 무수정.
- `lib/copy/workbench/*` 한글 카피 — 무수정.
- `docs/rules/frontend.md`, `docs/rules/design-md.md` — 무수정.
- `docs/design/layout-redesign.md` v4 — 무수정 (v5 가 별도 slug 로 신설).
- `tailwind.config.ts` 의 기본 구조 — 무수정.
- `package.json` / `package-lock.json` — 신규 라이브러리 0건.
- `hooks/utils/useBreakpoint.ts` — 무수정.
- `useAnalyzeHistory` / `useFavorites` 의 외부 API — 무수정 (내부 중복 보호 로직만 정밀화 가능).

### 8.3 라벨 흐름 / 에이전트 핸드오프

```text
PM (본 PRD, 워킹트리 작성, docs-only PR 만들지 않음)
            ↓
[ feature/component-compactness 브랜치 ]
            ↓
  PRD commit
            ↓
ux-designer (v5 DESIGN.md 신설) — 같은 브랜치 commit
            ↓
frontend-dev (컴팩트 토큰 적용 + outside-click + suffix DOM + nit 3건)
            ↓ impl-ready 라벨
QA (라운드트립 5건 × 두 뷰포트 + dropdown UX + nit 3건) → qa-passed
            ↓ handoff-append workflow 자동 → HANDOFF.md
reviewer → review-approved (자가 PR 시 --comment + 라벨 fallback)
            ↓
DevOps merge → main
            ↓
PRD #3 claude-cli-analysis 신설
```

### 8.4 리스크 / 완화

| 리스크 | 완화 |
|---|---|
| input 컴팩트화로 가독성 저하 (특히 모바일) | 디자이너가 디자인 단계에서 모바일 (375px) 시각 확인. 디자이너 권고로 모바일 input 만 약간 큰 토큰 유지 가능 — §9 OPEN QUESTION 1. |
| dropdown outside-click 의 click-vs-mousedown 차이로 옵션 선택이 막힘 | mousedown 으로 outside-click 감지하면서, dropdown 안 옵션의 mousedown 은 stopPropagation 또는 ref 영역 검사로 통과. AC-4 + AC-5 동시 통과로 검증. |
| input suffix 가 input 클릭/focus 방해 | suffix 노드에 `pointer-events: none` (또는 동등). AC-3 명시. |
| suffix 와 input 텍스트 충돌 (긴 숫자 입력 시) | input 의 우측 padding 을 suffix 폭만큼 확보. 디자이너가 v5 DESIGN.md 에 정의. |
| 컴팩트화로 hit area 위반 (모바일 터치) | 디자이너가 hit area ≥ 40x40px 확인. icon-only 버튼은 별도 확장. AC-6 에 명시. |
| reviewer nit 3건 흡수의 회귀 | AC-7 / AC-8 / AC-9 각각 검증 가능 명령. 분석 1회 = 히스토리 +1건 (또는 promote) 의 수동 검증으로 회귀 차단. |
| pushHistory 의 중복 보호 로직이 in-session 메모리 한계 | LRU 5건은 PR #21 시점부터 정의. 본 PRD 는 promote 로직만 정밀화. |
| ticker-change effect 의 첫 발화 차단 방식 차이 (`useRef` vs dep 정밀화) | frontend-dev 선택. AC-8 은 "첫 마운트 시 의도치 않은 발화 0건" 결과 기반이므로 구현 자유. |
| dropdown 의 mobile 터치 동작 (375px) | touchstart 도 outside-click 트리거. AC-4 에 명시. 모바일 검증은 QA 가 dev tools mobile viewport 또는 실 디바이스. |
| 신규 라이브러리 도입 압박 (Floating UI 등) | §9 OPEN QUESTION 2 에 사용자 결정 권한 보존. PM 권고는 자체 구현. |
| 컴포넌트 prop 시그니처 변경 압박 | PM 권고 무수정. 디자이너·frontend-dev 가 불가피하면 §9 OPEN QUESTION 7 결정. |
| Sidebar 인라인 60px 토큰 흡수로 시각 회귀 | 흡수 후 dev tools 측정으로 시각적 폭 변경 없음 확인. AC-9 에 명시. |
| PRD #3 진입 시 본 PRD 의 컴팩트 토큰과 claude CLI 응답 길이/포맷 mismatch | 본 PRD 는 6블록 shape 에만 의존 (PR #21 §8.4 계승). claude CLI 도 동일 shape 로 normalize 한다는 PRD #3 의 책임. |

### 8.5 변경 라인 추정

본 PRD 의 PR diff 는 PR #21 보다 작다.

- 컴포넌트 내부 (workbench / layout) 의 클래스 치환 + suffix DOM + outside-click 훅 도입 — 추정 200~400 라인.
- DESIGN.md v5 신설 (v4 의 components 절 갱신 + 신규 토큰 + prose) — 추정 100~200 라인.
- nit 3건 흡수 (Sidebar / pushHistory / ticker-change) — 추정 20~50 라인.
- QA 리포트 — 추정 150~250 라인.
- 합계 추정 500~900 라인. PR #21 (1500+) 의 절반 이하.

회귀 위험: 컴포넌트 prop 시그니처 변경 시 page.tsx 영향 — PM 권고 무수정으로 차단.

## 9. OPEN QUESTION

각 항목에 PM 권고를 명시. 디자이너·사용자 결정으로 확정.

### 9.1 input height / padding / font-size 토큰값

- 후보:
  - height 36px / py-8 / font-size 14px (컴팩트 최강).
  - height 40px / py-10 / font-size 14px (컴팩트 중).
  - height 44px / py-12 / font-size 15px (현재 추정 유지).
- **PM 권고**: 디자이너 결정 위임. 출발선은 height 36~40px.
- 사유:
  - 모바일 hit area 와의 균형은 디자이너가 토스톤 기준으로 판단.
  - 디자이너가 데스크탑·모바일 분기 토큰을 채택할 수도 있음 (예: `input-h-mobile` / `input-h-desktop`).
- 결정 결과는 v5 DESIGN.md 의 components 절에 정의.

### 9.2 dropdown outside-click — 자체 구현 vs 라이브러리

- 후보:
  - 자체 구현 (`useOutsideClick` 훅).
  - Floating UI / Headless UI / Radix / react-aria 도입.
- **PM 권고: 자체 구현 (신규 라이브러리 0건 유지)**.
- 사유:
  - outside-click + ESC + Tab 닫힘 정도는 30~50 라인 훅으로 자체 구현 가능.
  - 라이브러리 도입은 번들 사이즈 + 학습 비용 + 토큰 정합 부담.
  - 단, 디자이너·frontend-dev 가 future-proofing (예: floating positioning, focus management) 의 이유로 의존성 도입 사유 충분하면 사용자 결정으로 우회 — Floating UI 가 가장 후보.
- 결정 권한: 사용자 (PM 가설 = 자체 구현).

### 9.3 input 단위 suffix 위치

- 후보:
  - input 내부 우측 absolute (단위 텍스트만 표시, 정적).
  - input 내부 우측 absolute + hover 시 단위 변경 가능 (예: USD ↔ KRW 토글).
  - input 옆 별도 selectbox (단위가 가변일 때).
- **PM 권고: input 내부 우측 absolute (정적 텍스트만)**.
- 사유:
  - 현재 4 필드의 단위는 모두 고정 (`USD` / `%` / `일` / `%`). 가변 단위 필요 없음.
  - hover 시 변경은 UX 학습 비용 추가. MVP 비범위.
- 디자이너 결정. PM 권고 채택이 자연스러움.

### 9.4 SearchPanel ticker 검색 dropdown 의 outside-click 대상

- 후보:
  - dropdown wrapper 외부 mousedown + ESC.
  - dropdown wrapper 외부 mousedown + ESC + Tab.
  - dropdown wrapper 외부 mousedown + ESC + Tab + scroll outside.
- **PM 권고: dropdown wrapper 외부 mousedown + ESC + Tab**.
- 사유:
  - mousedown + ESC 는 필수.
  - Tab 으로 dropdown 외부로 focus 이동 시 자동 닫힘이 키보드 사용성 향상.
  - outside scroll 닫힘은 토스톤 기준 과함 (스크롤 시 사용자가 모르게 닫힘).
- 디자이너 결정.

### 9.5 label 위치 (input 위 vs input 옆)

- 후보:
  - 옵션 A: label 위 + input 아래 (현재 구조 유지) + line-height 컴팩트.
  - 옵션 B: label 옆 + input 옆 (한 라인) — 데스크탑만 옆, 모바일은 위.
- **PM 권고: 옵션 A (label 위 유지, line-height 컴팩트)**.
- 사유:
  - 옵션 B 는 데스크탑·모바일 분기 + label 정렬 복잡도 추가.
  - 옵션 A 는 prop 시그니처 무수정 + 디자이너 부담 작음.
- 디자이너 결정.

### 9.6 작은 컴포넌트 hit area 기준

- 후보:
  - hit area ≥ 40x40px (WCAG AA / iOS HIG 권장).
  - hit area ≥ 44x44px (iOS HIG 강력 권장).
  - 비주얼 size 와 hit area 분리 — `before:absolute inset` 으로 hit area 확장.
- **PM 권고: hit area ≥ 40x40px**. icon-only 버튼은 비주얼 size 가 작아도 hit area 확장 (Tailwind `relative` + `before:absolute -inset-...`).
- 디자이너 결정.

### 9.7 컴포넌트 prop 시그니처 변경 압박

- 본 PRD 는 prop 시그니처 무수정 권고.
- 디자이너·frontend-dev 가 변경이 불가피하다고 판단하는 경우:
  - 후보 a: 본 PRD 안에서 변경하고 호출 측 동시 수정 (한 commit 단위).
  - 후보 b: 별도 PRD 신설.
- **PM 권고: 후보 a — 본 PRD 안에서 변경하되 prop 변경 사유를 commit 메시지에 명시**. 단, 변경 범위가 광범위하면 별도 PRD.
- 결정 권한: 디자이너·frontend-dev. 사용자 알림 후 진행.

### 9.8 본 PRD 가 끝난 뒤의 다음 작업

- 후보:
  - PRD #3 claude-cli-analysis 진입 — BFF 가 로컬 claude CLI 호출.
  - 다른 후속 PRD (다크 모드, 사용자 메뉴, tooltip, modal 등) 진입.
- **PM 권고: PRD #3 claude-cli-analysis 진입**.
- 사유:
  - 3분할 PRD 의 자연스러운 다음 단계.
  - 다크 모드 / 사용자 메뉴는 사용자 인증·세션 도입이 선행돼야 가치 있음.
- 본 PRD 머지 후 사용자 우선순위 결정.

### 9.9 디자이너 부담 분배

- 본 PRD 의 디자이너 부담은 PR #21 보다 작음 — Layout 절 신설 없음, 색 결정 없음.
- 주 업무: components 절의 size 토큰 다운 + suffix 합성 토큰 신설 + prose (컴팩트 톤 설계 의도, suffix 위치 근거, dropdown outside-click 동작 명세).
- 디자이너가 v5 DESIGN.md 의 prose 분량을 v4 의 50~70% 수준으로 줄여도 무방. lint errors=0 만 통과하면 AC-10 통과.

### 9.10 outside-click 훅 위치

- 후보:
  - `hooks/utils/useOutsideClick.ts` (도메인 무관, `useBreakpoint` 와 같은 위치).
  - `components/workbench/SearchPanel.tsx` 안에 internal.
- **PM 권고: `hooks/utils/useOutsideClick.ts`**.
- 사유:
  - 도메인 무관 훅이므로 폴더 표준 (`docs/rules/frontend.md` 의 폴더 표준 6항) 에 맞춤.
  - 후속 PRD 에서 다른 dropdown / modal 컴포넌트가 추가될 때 재사용 가능.
- frontend-dev 결정.

산출물: /Applications/하영/code_source/trading-signal-frontend/docs/prd/component-compactness.md | UI: yes
