# PRD: layout-redesign

- **slug**: `layout-redesign`
- **작성일**: 2026-05-21
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #20 머지 완료. main `4807583`. 직전 PR #20 (palette-modernization) 로 Signature Slate `#1f3b4d` + 13 semantic 토큰 + 21 composite 까지 정착. 현재까지의 화면은 모바일 shell 위에 `lg:max-w-6xl` + `lg:grid-cols-[360px_1fr]` 의 2-column sticky sidebar 구조였고, 본 PRD 가 이 구조를 폐기하고 **상단 navbar + 좌측 사이드 + 메인 영역의 3-section shell** 로 재설계한다.
- **UI 포함 여부**: yes (전면 레이아웃 재설계 — UX/UI 디자이너 합류 필수. DESIGN.md v4 가 별도 slug `docs/design/layout-redesign.md` 로 신설된다. 디자이너는 본 PRD 머지 후가 아닌 **같은 `feature/layout-redesign` 브랜치 안** 에서 DESIGN.md 를 commit — 한 브랜치 한 PR 룰.)
- **선행 / 후행 관계**:
  - **선행**: `workbench-analyze-rebuild` (PR #11, 6블록 + 라운드트립 5건), `tailwind-migration` (PR #13, design:sync 파이프라인), `fe-conventions` (PR #15, 폴더·컨벤션 + layout.tsx 컨벤션 절), `responsive-pc-support` (PR #17, `useBreakpoint` + 두 뷰포트), `palette-modernization` (PR #20, Signature Slate + semantic 토큰). 모두 머지 완료.
  - **후행 — 3분할 PRD 중 첫 번째 (가장 큰 골격)**:
    - 본 PRD **#1 layout-redesign** (현재) — 3-section shell + 정보 구조 + 반응형 골격.
    - **#2 component-compactness** (본 PRD 머지 후 신설) — input·dropdown·selectbox 등 개별 컴포넌트의 크기·폰트·outside-click·input 내 단위 표기 등 컴포넌트 내부 리디자인.
    - **#3 claude-cli-analysis** (본 PRD 머지 후 신설) — 분석 결과의 데이터 소스 교체 (현재 FastAPI BE → 향후 BFF route handler 가 로컬 claude CLI 를 subprocess 로 호출하는 구조).
  - 분할 사유: §8.5 참조.

## 1. 배경 / 문제

### 1.1 현재 상태

`app/page.tsx` 는 다음 구조다.

```tsx
<main className="mx-auto w-full max-w-[480px] ...
                 md:max-w-2xl
                 lg:max-w-6xl lg:grid lg:grid-cols-[360px_1fr] lg:gap-2xl lg:items-start">
  <div className="lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto ...">
    <header>...로고 + ticker 요약...</header>
    <SearchPanel ... />
    <InputPanel ... />
  </div>
  <div className="lg:pt-[18px]">
    <ResultGroup ... />
    <footer>...</footer>
  </div>
</main>
```

- 모바일 폭(480) 기준 shell 을 만든 뒤 `md:max-w-2xl`, `lg:max-w-6xl` + `lg:grid-cols-[360px_1fr]` 로 데스크탑에서 2-column sticky sidebar 가 되는 구조. PR #11 (워크벤치 재작성) 의 단일 페이지에 PR #17 (반응형) 이 sidebar 한 겹을 덧붙인 결과물.
- 상단에 별도 **글로벌 navbar 가 없다**. 페이지 자체 안의 `<header>` 안에 "TradingSignalEngine / 워크벤치 / 선택 ticker 요약" 이 묶여 있다. 글로벌 영역과 페이지 콘텐츠가 시각적으로 분리되지 않는다.
- 좌측 sticky 영역은 **검색 + 입력 폼만** 들어가 있고, 분석 히스토리·즐겨찾기·외부 링크 같은 사이드바스러운 정보 단위는 들어갈 자리가 정의돼 있지 않다.
- 모바일에서는 sticky 가 풀리고 세로 스택이 되는 단순 분기. 모바일 사이드바 (drawer / hamburger) 같은 UX 가 없다.

### 1.2 사용자 의도 (verbatim)

> "전체적인 레이아웃을 다시 잡아보자. 기존꺼랑 무관하게. 상단 navbar 부터 왼쪽 사이드 메뉴에는 어떤 요소들을 넣을지, 메인 영역에는 어떤걸 보여줄수있을지 등등 전체적인 요소들을 주식 분석한 결과를 가져왔을때 어떻게 보여주면 좋을지 고민해서 기획, 디자인해서 개발하면 좋겠어."

> "디자인에 힘을 줘서 디자인 전문가라고 생각하고 코인, 주식 분석해서 결과 알려주는 디자인을 고민해봐."

명시적으로 "기존꺼랑 무관하게" 재설계하라는 지시다. 따라서 본 PRD 는 PR #11 의 단일 카드 흐름·PR #17 의 2-column sticky 를 **계승하지 않는다**. 다만 디자인 토큰(Signature Slate + 13 semantic + 21 composite, PR #20) 은 **그대로 계승** 한다 — 색·타이포·간격의 시각 언어는 유지하고, 골격만 바꾼다.

### 1.3 문제

- **글로벌 영역과 페이지 콘텐츠의 분리 부재** — 상단 navbar 가 없어 추후 다중 화면 진입 (히스토리, 설정, 사용자 메뉴 등) 시 글로벌 도구의 위치가 모호하다.
- **사이드바의 정보 단위 부재** — 현재 좌측은 단순 폼 영역이고, 트레이딩 도구로서 사용자가 자주 참조할 분석 히스토리·즐겨찾기 같은 정보가 들어갈 자리가 없다.
- **메인 영역의 위계 부재** — 현재 ResultGroup 안에서 6블록이 2-col grid 로 나란히 깔린다. 트레이딩 분석 결과의 핵심 = **"이걸 사야 하나 (action)"** 이므로, 6블록을 평면 grid 로 두지 말고 위계를 가진 정보 구조로 재배치할 필요가 있다.
- **모바일 사이드바 처리 부재** — 데스크탑 sidebar 가 모바일에서 그냥 위로 풀리는 구조라, 사이드바에 정보 단위가 늘어나면 모바일 첫 화면이 비대해진다. drawer 같은 모바일 전용 처리가 필요하다.

### 1.4 컨텍스트 메모

- 현재 워킹트리에 `docs/SESSION_NOTES.md` 의 2026-05-21 세션 정리 항목이 modified 로 남아있다 (PR #6 ~ #20 15개 PR 종합 기록). 본 PRD 가 첫 commit 으로 들어갈 때 SESSION_NOTES 도 함께 stage 될 수 있는데, 이는 PM 책임이 아니고 **frontend-dev 단계의 책임** 이다.
- 본 PRD 의 디자이너 단계에서 v4 DESIGN.md 가 **별도 slug `docs/design/layout-redesign.md`** 로 신설된다. 토큰 색상 팔레트는 그대로 계승 (front matter `colors` 절은 `workbench-analyze-rebuild.md` v3 와 동일), 레이아웃·컴포넌트 절만 갱신.

## 2. 목표

- 상단 navbar + 좌측 사이드바 + 메인 영역의 3-section shell 을 도입한다. 각 영역의 **정보 카테고리** 가 PRD 와 DESIGN.md 본문에 명시된다.
- App Router `layout.tsx` 컨벤션 (`docs/rules/frontend.md`) 을 적용해 글로벌 영역(navbar·sidebar) 과 페이지 콘텐츠(`page.tsx`) 를 layout 레벨에서 분리한다. route group 활용 권장.
- 메인 영역의 분석 결과 6블록에 **위계** 를 부여한다 (action 최상단 등). 평면 grid 가 아닌 정보 우선순위 기반 배치.
- 모바일 (375px) 에서는 사이드바가 drawer 로 접히고, 데스크탑 (1280px) 에서는 사이드바가 펼쳐진다. `useBreakpoint` 를 통한 분기.
- 디자인 토큰 (Signature Slate + 13 semantic + 21 composite, v3 그대로) 무회귀. hex/px 직타 금지.
- 기존 BE contract (`/api/whitelist/search`, `/api/workbench/analyze`) 무변경. 본 PRD 는 **현 BE 응답 shape 기준** 으로 메인 영역 정보 구조를 짠다 — 후속 PRD #3 claude-cli-analysis 가 BFF route handler 만 갈아끼우면 화면이 동작하게 설계.
- PR #11 라운드트립 5건이 모바일 (375px) · 데스크탑 (1280px) 양 뷰포트에서 새 레이아웃 의도대로 무회귀.

## 3. 범위 (In scope)

### 3.1 3-section shell 골격

3개 영역을 다음과 같이 정의한다. 각 영역의 **자리와 정보 카테고리** 만 본 PRD 가 정한다 — 컴포넌트 내부 디자인은 PRD #2 영역.

#### 3.1.1 상단 navbar

- 위치: viewport 최상단, 가로 100%, 고정 높이 (디자이너 재량 — 권장 56~64px).
- 데스크탑·모바일 공통 노출.
- **정보 카테고리**:
  - 좌측: 로고 + 서비스명 (TradingSignalEngine).
  - 우측: (후속 PRD 진입 전까지는) 비어 있거나 placeholder. 사용자 메뉴·다크모드 토글 등은 §9 OPEN QUESTION 2 의 디자이너 결정 영역. PM 권고는 "로고만 우선, 그 외 후속 PRD".
  - 모바일 한정: 좌측 hamburger 아이콘 (사이드바 drawer 토글) — §9 OPEN QUESTION 4.
- 글로벌 layout (`app/layout.tsx` 또는 route group `app/(workbench)/layout.tsx`) 에서 렌더. 페이지 콘텐츠와 분리.

#### 3.1.2 좌측 사이드바

- 위치: viewport 좌측, navbar 아래, 세로 100%, 고정 너비 (디자이너 재량 — 권장 240~280px).
- **데스크탑 (≥ lg, 1024px+)**: 항상 펼쳐진 sidebar.
- **모바일 (< lg)**: 기본 접힘. navbar 의 hamburger 로 drawer 열림. drawer 는 overlay + slide-in.
- **정보 카테고리** (디자이너 최종 결정, PM 권고 동봉 — §9 OPEN QUESTION 1):
  - (a) **분석 히스토리** — 최근 ticker 5건. 클릭 시 해당 ticker · 입력값으로 메인 영역 채움. MVP 단계에선 메모리 in-session 만 (Supabase 미연동).
  - (b) **즐겨찾기 ticker** — 사용자가 별표한 ticker 목록. MVP 는 in-session.
  - (c) **외부 링크** (FinViz, Yahoo Finance 등) — 보조 정보 진입점. PM 권고: 후속 PRD 로 미룸.
  - PM 권고: a + b 우선, c 는 #2 이후.

#### 3.1.3 메인 영역

- 위치: navbar 아래 + 사이드바 우측. 가용 폭 100%, 가용 높이 자유 스크롤.
- **상단 (입력 영역)**:
  - SearchPanel (ticker 검색) + InputPanel (자본·목표·기간·최대 손실) 가 메인 영역 상단에 위치.
  - 현재는 sticky sidebar 에 있던 두 컴포넌트가 메인 영역으로 이동. 사이드바는 글로벌 도구(히스토리·즐겨찾기) 전용.
  - 데스크탑에선 가로 정렬 / 모바일에선 세로 스택. 정확한 폼 그리드는 PRD #2 영역.
- **중단·하단 (결과 영역)** — 분석 결과 6블록의 위계 기반 배치. PM 권고 (§9 OPEN QUESTION 3, 디자이너 최종 결정):
  1. **ActionCard** (최종 권고 BUY/HOLD/SELL) — 최상단, 가로 풀폭. 시각 위계 최강.
  2. **BriefCard** (기술 신호 + 근거) — Action 바로 아래.
  3. **FeasibilityCard + HorizonsCard** — 2-col 병렬 (데스크탑) / 세로 스택 (모바일).
  4. **RiskPlanCard** (진입/손절/익절/수량) — 단독 가로 풀폭.
  5. **WarningsCard** — 최하단 (가격 소스 폴백 등 주의 사항).
  - empty / loading / error 상태도 메인 영역 안에서 표시 — 현재 ResultGroup 패턴 유지.

### 3.2 App Router layout 컨벤션 적용

- `app/layout.tsx` 는 RootLayout 으로 html/body/Providers 만 책임.
- 글로벌 navbar + sidebar 는 **별도 layout 파일** 에서 렌더. 권장 패턴:
  - 옵션 A: route group `app/(workbench)/layout.tsx` 신설. 본 PRD 의 워크벤치 화면군은 `app/(workbench)/page.tsx` 로 이동. 후속 다른 화면 (예: 설정) 이 추가될 때 route group 분리 용이.
  - 옵션 B: `app/layout.tsx` 에 직접 navbar + sidebar 합쳐 두기.
  - PM 권고: **옵션 A** — `docs/rules/frontend.md` 의 layout.tsx 컨벤션 절과 정합. frontend-dev 가 최종 판단.
- 컴포넌트 폴더 표준 (`docs/rules/frontend.md` 의 폴더 표준 6항):
  - `components/layout/` 신설 — `Navbar.tsx`, `Sidebar.tsx`, `MobileDrawer.tsx` 등 재사용 레이아웃 컴포넌트.
  - `components/workbench/*` 의 기존 12 컴포넌트는 그대로 유지 (단, ResultGroup 내부 배치 규칙은 본 PRD 의 위계로 갱신 — 컴포넌트 내부 구조 변경은 PRD #2 영역이지만 ResultGroup 의 자식 배열·grid 클래스 갱신은 본 PRD 영역).

### 3.3 반응형 분기

- CSS 측 1차 도구 = Tailwind 반응형 prefix (`md:`, `lg:`). JS 측 1차 도구 = `useBreakpoint` (`@/hooks/utils/useBreakpoint`). `docs/rules/frontend.md` 8절 무회귀.
- 데스크탑 (`lg:` 이상, 1024px+):
  - navbar + sidebar(좌, 펼침) + 메인 영역(우) 의 3-section grid.
  - 권장 grid: `lg:grid-cols-[var(--sidebar-w)_1fr]` 형태 (정확한 width 토큰은 디자이너 결정).
- 모바일 (`< lg`):
  - navbar 만 상단 고정. 사이드바는 drawer 로 접힘. 메인 영역이 가로 100%.
  - drawer 토글은 navbar 의 hamburger 버튼 + `useBreakpoint().isMobile` JS 분기.
- 모바일 ↔ 데스크탑 전환 시 drawer 상태 정상 (예: 데스크탑으로 넓어지면 drawer state 자동 닫기).

### 3.4 DESIGN.md v4 트리거 (디자이너 산출물)

- 신규 파일: `docs/design/layout-redesign.md` (v4).
- `colors:` front matter 는 `workbench-analyze-rebuild.md` v3 의 13 토큰을 **그대로 복사** (Signature Slate `#1f3b4d` + semantic 13).
- 변경되는 절:
  - **Layout 절 신설** — 3-section shell 의 grid 정의 (sidebar width 토큰, navbar height 토큰), 반응형 분기 정의.
  - **Components 절 갱신** — 신규 `nav`, `sidebar`, `drawer` 합성 토큰. 기존 21 composite 와의 충돌·중복 정리.
  - **Spacing / Typography / Shadow 절** — Layout 변경에 필요한 최소 추가 (예: `--sidebar-w`, `--navbar-h` 토큰). 기존 토큰 무회귀.
- prose:
  - 3-section shell 의 설계 의도 단락.
  - 메인 영역 6블록 위계 근거 단락.
  - 모바일 drawer 동작 명세.
- `npx @google/design.md lint` errors=0 warnings=0.
- 디자이너는 같은 `feature/layout-redesign` 브랜치에 commit (별도 docs PR 없음).

### 3.5 무회귀 라운드트립

- PR #11 라운드트립 5건 — (a) AAPL 정상, (b) BTC-USD 정상, (c) 비분할가능, (d) 화이트리스트 비매칭, (e) 5xx 폴백 — 모두 새 레이아웃에서 시각·동작 무회귀.
- 두 뷰포트 (모바일 375px / 데스크탑 1280px) 모두에서 새 3-section 의도대로 표시.
- BFF 무회귀: `git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건 (route handler 안 제외).
- 한글 톤 무회귀: `lib/copy/workbench/*` 한글 카피 무수정.

## 4. 비범위 (Out of scope)

본 PRD 는 3분할 PRD 중 첫 번째 (가장 큰 골격) 다. 다음은 후속 PRD 영역이며, 본 PRD 에서는 다루지 않는다.

### 4.1 PRD #2 component-compactness 영역

- input·dropdown·selectbox·checkbox·toggle 등 **개별 컴포넌트의 내부 디자인** 변경.
- 폼 컴포넌트의 크기 (height, padding, font-size), 라운드, focus ring, 단위 표기 위치 (input 내부 우측 suffix 등), helper text 톤.
- dropdown 의 outside-click 처리, ESC 키 핸들링.
- input 내 단위 표기 (`%`, `일`, `USD` suffix 등).
- 본 PRD 에서는 컴포넌트가 들어갈 **자리 · 정보 카테고리 · grid 위치** 만 정의. 컴포넌트 자체 리디자인은 #2.

### 4.2 PRD #3 claude-cli-analysis 영역

- 분석 결과의 데이터 소스 교체 — 현재 FastAPI BE → 향후 Next.js BFF route handler 가 로컬 claude CLI 를 subprocess 로 호출.
- claude CLI 호출 protocol, 응답 mapping, 에러 핸들링.
- 본 PRD 는 **현 BE 응답 shape 기준** 으로 메인 영역 정보 구조를 짠다 — claude CLI 통합 시 BFF route handler 만 갈아끼우면 화면이 동작하게 설계.

### 4.3 그 외 비범위

- **다크 모드 도입** — 별도 PRD. v3 토큰의 semantic 명명이 다크 모드 친화이지만, 본 PRD 는 라이트 모드만.
- **사용자 인증·세션·Supabase 연동** — MVP 단계 BE/DB 없음 (AGENTS.md). 분석 히스토리·즐겨찾기는 in-session 메모리만.
- **다국어 i18n 실제 도입** — 한글 카피 유지.
- **차트 시각화 라이브러리** — 캔들·라인 도입 없음.
- **신규 화면 추가** (설정·프로필·랜딩 등) — route group 분리는 layout 구조만 잡고, 실제 화면은 별도 PRD.
- **사이드바 외부 링크 (c)** — PM 권고로 후속 PRD 로 미룸.
- **navbar 의 사용자 메뉴·다크모드 토글** — 후속 PRD.
- **분석 히스토리의 DB 영속화** — Supabase 연동 PRD 이후.
- **E2E / 시각 회귀 자동화** — QA 의 수동 라운드트립으로 검증.
- **BE / FastAPI / API contract 변경**.
- **시그니처 색·팔레트 변경** — PR #20 v3 그대로 계승.
- **로고·아이콘·이미지 에셋 디자인 변경** — 본 PRD 는 자리만 정의. 실제 로고 디자인은 별도.

## 5. 수용 기준 (AC)

검증 가능한 문장.

### AC-1 (3-section shell 존재)

- 화면 DOM 에 다음 3개 영역이 명시적으로 존재한다.
  - 상단 navbar (글로벌 영역, 페이지 콘텐츠 외부).
  - 좌측 사이드바 (데스크탑 펼침 / 모바일 drawer).
  - 메인 영역 (페이지 콘텐츠).
- 검증: 브라우저 dev tools 또는 `git grep -nE "Navbar|Sidebar|MobileDrawer" -- components/layout/ app/` 로 컴포넌트 존재 확인. 컴포넌트명은 디자이너·frontend-dev 재량 (예: `TopBar`, `SideMenu` 도 허용).

### AC-2 (layout.tsx 컨벤션 적용)

- `app/layout.tsx` 는 RootLayout 으로 html/body/Providers 만 책임 (기존과 동일).
- 글로벌 navbar + sidebar 는 별도 layout 파일에서 렌더된다.
- 검증: `find app -name layout.tsx` 결과 2개 이상 (`app/layout.tsx` + route group 또는 동등 위치의 layout).
- route group 채택 시 `app/(workbench)/layout.tsx` 또는 동등 경로 존재.

### AC-3 (기존 2-column sticky 구조 폐기)

- `app/page.tsx` (또는 새 위치의 page.tsx) 에서 `lg:grid-cols-[360px_1fr]` 또는 `lg:sticky lg:top-0` 패턴이 더 이상 메인 페이지 컴포넌트 root 에 직접 등장하지 않는다.
- 검증: `git grep -nE "lg:grid-cols-\[360px_1fr\]|lg:sticky lg:top-0" -- app/page.tsx app/\(*\)/page.tsx` 결과 0건. (sidebar 컴포넌트 자체의 sticky 는 허용.)

### AC-4 (메인 영역 6블록 위계)

- 분석 성공 상태 (`data` 가 있을 때) 메인 영역에 6블록이 다음 위계로 표시된다.
  1. ActionCard 최상단 가로 풀폭.
  2. BriefCard 그 아래.
  3. FeasibilityCard + HorizonsCard 데스크탑에서 2-col, 모바일에서 세로 스택.
  4. RiskPlanCard 가로 풀폭.
  5. WarningsCard 최하단.
- 검증: 브라우저 수동 확인 + ResultGroup 컴포넌트 코드의 자식 배열 순서.
- 위계 결정은 디자이너 최종 — 본 PRD 의 위계는 PM 권고 (§9 OPEN QUESTION 3). 디자이너가 다른 위계를 채택한 경우, DESIGN.md prose 에 위계 근거 단락을 박아두면 AC 통과.

### AC-5 (사이드바 정보 카테고리)

- 사이드바에 다음 정보 단위가 표시된다.
  - 분석 히스토리 — 최근 ticker 5건 (in-session, 비어 있을 수 있음. 빈 상태에서는 한글 안내).
  - 즐겨찾기 — 별표한 ticker 목록 (in-session, 비어 있을 수 있음).
- 검증: 컴포넌트 코드 + 브라우저 수동 확인.
- 외부 링크 (c) 는 비범위. 디자이너가 다른 정보 단위를 추가한 경우 DESIGN.md prose 근거.

### AC-6 (모바일 drawer 동작)

- 모바일 (`< lg`, 예: 375px) 에서 사이드바는 기본 접힘 (drawer).
- navbar 의 hamburger 아이콘 클릭 시 drawer 가 overlay + slide-in 으로 열린다.
- drawer 외부 클릭 또는 close 버튼 클릭 시 닫힌다.
- 데스크탑 (`≥ lg`, 예: 1280px) 으로 viewport 가 넓어지면 drawer state 가 자동 닫히고 사이드바가 펼친 상태로 전환된다.
- 검증: 브라우저 수동 확인 (375 ↔ 1280 리사이즈).
- JS 분기는 `useBreakpoint` 사용. 검증: `grep -nE "useBreakpoint" components/layout/`.

### AC-7 (입력 영역 위치 이동)

- SearchPanel + InputPanel 이 메인 영역 상단에 위치한다 (사이드바가 아닌 메인 영역 안).
- 검증: 컴포넌트 코드 — 신규 page.tsx 안에 두 컴포넌트가 import 되고, 사이드바 컴포넌트 안에는 import 되지 않는다.

### AC-8 (디자인 토큰 무회귀)

- PR #20 v3 의 13 semantic 토큰 + 21 composite 가 변경되지 않는다. (Sidebar width / navbar height 같은 신규 토큰은 추가 허용.)
- 검증: `tailwind.theme.json` 의 기존 토큰 키들이 본 PRD diff 에서 제거되지 않음. `git diff tailwind.theme.json` 확인.
- hex / px 직타 금지. 검증: `git grep -nE "#[0-9a-fA-F]{6}" -- app/ components/` 결과 본 PRD 가 추가한 라인 0건.

### AC-9 (DESIGN.md v4 신설)

- `docs/design/layout-redesign.md` 가 존재.
- `colors:` front matter 가 v3 와 동일 (13 토큰 + Signature Slate).
- Layout 절이 prose 또는 front matter 에 명시.
- `npx @google/design.md lint` errors=0 warnings=0.
- 검증: `ls docs/design/layout-redesign.md`, lint 실행 결과.

### AC-10 (BFF 무회귀)

- `git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건 (route handler 안 fallback 제외).
- `git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/` 결과 직접 fetch 0건.
- BE contract 무변경 — `lib/types/workbench/*` 의 응답 타입 무수정.

### AC-11 (한글 톤 무회귀)

- 사용자 노출 문구 중 ticker · BE enum 식별자 · 단위(USD, KRW, %, 일) 를 제외한 모든 텍스트가 한글이다.
- 검증: 브라우저 수동 확인 + `lib/copy/workbench/*` 한글 카피 무수정.

### AC-12 (build / typecheck / lint)

- `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- `npm run design:sync` 후 git diff 가 결정적 산출물만 반영 (사람이 직접 편집한 흔적 없음).

### AC-13 (라운드트립 5건 × 두 뷰포트)

- PR #11 라운드트립 5건이 dev 환경에서 모두 동작한다.
  - (a) `AAPL` 검색 → 선택 → 자본 100만 / 목표 5% / 기간 30일 / 최대 손실 2% → 분석 → 6블록 새 위계로 표시.
  - (b) `BTC-USD` 검색 → 자본 0 → 분석 → 한글 사전 차단 메시지.
  - (c) 비현실 시나리오 → feasibility 비현실 강조 표시 (PR #11 AC-3 무회귀).
  - (d) 화이트리스트에 없는 ticker (`NVDA`) → 한글 안내.
  - (e) BE down → 한글 fallback 에러 메시지.
- 모바일 (375px) + 데스크탑 (1280px) 양 뷰포트에서 동일 시나리오를 새 3-section shell 의도대로 검증.

### AC-14 (반응형 무회귀)

- PR #17 의 두 뷰포트 (375 / 1280) 가 본 PRD 의 새 레이아웃으로 시각·동작 무회귀.
- hydration mismatch 콘솔 경고 0건.
- 모바일 ↔ 데스크탑 전환 시 drawer state 정상.

### AC-15 (컴포넌트 폴더 표준)

- `components/layout/` 폴더가 신설되고 Navbar / Sidebar / Drawer 등이 위치한다.
- 기존 `components/workbench/*` 의 12 컴포넌트는 위치·prop 시그니처 무변경 (단, ResultGroup 의 자식 grid 클래스는 본 PRD 영역 — 변경 허용).
- 검증: `ls components/layout/`, `git diff components/workbench/`.

### AC-16 (기본 접근성)

- navbar / sidebar / drawer 의 인터랙티브 요소에 적절한 ARIA 가 있다 (hamburger 버튼의 `aria-label`, `aria-expanded`, drawer 의 `role="dialog"` 또는 등가).
- 키보드 Tab 으로 navbar → 사이드바 → 메인 영역 (입력 → 결과) 까지 순차 탐색 가능.
- ESC 키로 모바일 drawer 닫힘.
- 색 강조는 텍스트 라벨로 병행 (PR #11 AC-15 무회귀).
- 깊은 a11y 감사는 Reviewer 게이트.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 PR #6 ~ #20 모두 머지되어 있고 main 은 `4807583` 기준이라고 가정.
- 워킹트리에 `docs/SESSION_NOTES.md` 의 modified 가 있다 — 본 PRD 가 첫 commit 으로 들어갈 때 SESSION_NOTES 도 함께 stage 될 수 있다. 이 처리는 frontend-dev 단계 책임이고, PM 산출물(본 PRD) 만 별도로 commit 해도 무방.
- PR #20 v3 의 13 semantic 토큰 + 21 composite + Signature Slate `#1f3b4d` 는 본 PRD 에서 **무수정 계승**. v3 의 명명·hex 모두 그대로.
- DESIGN.md → `tailwind.theme.json` → `tailwind.config.ts` 파이프라인 (PR #13) 이 그대로 유지된다고 가정. 본 PRD 는 v4 DESIGN.md (`docs/design/layout-redesign.md`) 를 신설하지만, 파이프라인 자체는 변경하지 않는다. v3 토큰을 동일 키로 복사하므로 design:sync 산출물도 결정적 무회귀가 기본.
- BE / FastAPI / route handler / API contract 무변경. 본 PRD 는 화면 골격만.
- 후속 PRD #3 claude-cli-analysis 가 BFF route handler 만 갈아끼울 수 있도록, 본 PRD 의 메인 영역 정보 구조는 응답 6블록 shape 에만 의존 (데이터 소스 비의존).
- 분석 히스토리·즐겨찾기는 **in-session 메모리만** 사용. 새로고침 시 초기화. Supabase 영속화는 별도 PRD.
- 모바일 / 데스크탑 분기는 PR #17 의 `useBreakpoint` 와 Tailwind 반응형 prefix 그대로 사용. `window.innerWidth` 직접 검사 금지 (`docs/rules/frontend.md` 8절).
- 본 PRD 는 PR diff 가 클 것으로 예상 (`app/page.tsx` 전면 재작성 + 신규 layout 파일 + `components/layout/` 신설 + 메인 영역 grid 재배치). 작업 분할은 frontend-dev 가 판단 — 너무 비대하면 1차 PR (layout shell) + 2차 PR (사이드바 정보 단위) 같은 분할 허용. 단 한 브랜치 안에서 누적.
- 시그니처 색 결정 권한은 디자이너에게 있지만, 본 PRD 는 색을 변경하지 않으므로 디자이너 결정 부담은 v3 대비 적음 — 디자이너의 주 업무는 Layout 절 신설 + 6블록 위계 근거 prose.

## 7. 참고

- `docs/design/workbench-analyze-rebuild.md` v3 — 색 팔레트 원본. 본 PRD 의 v4 가 colors 절을 복사 계승.
- `docs/design/layout-redesign.md` — 본 PRD 의 디자이너 산출물 (신설 예정).
- `docs/rules/frontend.md` — FE 컨벤션 8개 절. 특히 layout.tsx 컨벤션 + 반응형 절 + 폴더 표준.
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드.
- `tailwind.config.ts`, `tailwind.theme.json` — design:sync 파이프라인.
- `app/page.tsx` (현재) — 본 PRD 가 폐기·재작성하는 진입점.
- `app/layout.tsx` (현재) — RootLayout. 본 PRD 가 글로벌 영역 분리.
- `components/workbench/*` 12 컴포넌트 — 본 PRD 가 위치 재배치. 내부 구조 변경은 PRD #2.
- `components/layout/` — 본 PRD 가 신설하는 폴더 (Navbar / Sidebar / MobileDrawer 등).
- `hooks/utils/useBreakpoint.ts` — JS 측 반응형 분기 도구.
- `docs/prd/workbench-analyze-rebuild.md` — 라운드트립 5건의 정의.
- `docs/prd/responsive-pc-support.md` — 두 뷰포트 정의.
- `docs/prd/palette-modernization.md` — 직전 PRD (v3 팔레트).
- `docs/prd/fe-conventions.md` — 폴더·컨벤션 무회귀 기준.
- `docs/HANDOFF.md` — PR #6 ~ #20 누적 기록.
- `AGENTS.md` — 작업 원칙·라벨 게이트·한 브랜치 한 PR 룰.

## 8. 영향 분석

### 8.1 변경되는 산출물

| 산출물 | 변경 내용 | 책임 에이전트 |
|---|---|---|
| `docs/design/layout-redesign.md` (신규) | v4 신설. colors 절은 v3 복사. Layout 절 신설, Components 절 갱신, prose 보강. | ux-designer |
| `app/layout.tsx` | RootLayout 책임 유지. 글로벌 영역은 별도 layout 으로 분리하기 위해 children pass-through 만. | frontend-dev |
| `app/(workbench)/layout.tsx` (신규, 옵션 A 채택 시) | navbar + sidebar + main 슬롯의 3-section shell. | frontend-dev |
| `app/(workbench)/page.tsx` (또는 `app/page.tsx`) | 기존 `lg:grid-cols-[360px_1fr]` sticky sidebar 폐기. 메인 영역 진입점으로 재작성. SearchPanel + InputPanel + ResultGroup 호스팅. | frontend-dev |
| `components/layout/Navbar.tsx` (신규) | 상단 navbar. 로고 + (모바일 hamburger). | frontend-dev |
| `components/layout/Sidebar.tsx` (신규) | 데스크탑 펼친 사이드바. 분석 히스토리 + 즐겨찾기. | frontend-dev |
| `components/layout/MobileDrawer.tsx` (신규) | 모바일 drawer. `useBreakpoint().isMobile` 분기. | frontend-dev |
| `components/workbench/ResultGroup.tsx` | 자식 6블록의 배열 순서·grid 클래스 갱신 (위계 적용). 컴포넌트 내부 구조 변경은 PRD #2. | frontend-dev |
| `tailwind.theme.json` | `design:sync` 산출물. v3 토큰 + 신규 sidebar-w / navbar-h 등 layout 토큰. | (자동) |
| `tailwind.config.ts` | 신규 layout 토큰 어댑터 추가. | frontend-dev |
| `app/components.css` | 신규 합성 토큰 (`nav`, `sidebar`, `drawer`) 추가 가능. | frontend-dev |
| `hooks/workbench/useAnalyzeHistory.ts` (신규, 옵션) | in-session 분석 히스토리 상태. 디자이너·frontend-dev 가 hook 으로 둘지 context 로 둘지 결정. | frontend-dev |
| `hooks/workbench/useFavorites.ts` (신규, 옵션) | in-session 즐겨찾기 상태. | frontend-dev |
| `lib/copy/workbench/*` | 사이드바·navbar 신규 카피 추가 가능. 기존 카피 무수정. | frontend-dev |
| `docs/qa/layout-redesign.md` (신규) | AC 별 재현·기대·실측 표 + 라운드트립 5건 × 두 뷰포트 + 모바일 drawer 동작 + 접근성. | qa |

### 8.2 변경되지 않는 산출물

- BE / FastAPI / route handler / API contract — 무수정.
- `lib/api/workbench/*` 클라이언트 함수 — 무수정.
- `hooks/query/*` TanStack Query 페칭 훅 — 무수정.
- `hooks/workbench/useAnalyze*` 기존 도메인 훅 — 무수정 (히스토리·즐겨찾기는 신규 훅으로).
- `lib/types/workbench/*` 응답 타입 — 무수정.
- `lib/validation/workbench/*` 사전 차단 — 무수정.
- `components/workbench/*` 의 12 컴포넌트 **내부 구조** — 무수정 (ResultGroup 의 자식 배치는 예외). 내부 리디자인은 PRD #2.
- `docs/rules/frontend.md` — 무수정 (컨벤션 그대로 적용).
- `docs/rules/design-md.md` — 무수정.
- `docs/design/workbench-analyze-rebuild.md` v3 — 무수정 (v4 가 별도 slug 로 신설).
- `package.json` / `package-lock.json` — 신규 라이브러리 0건 (drawer 도 자체 구현 권장).

### 8.3 라벨 흐름 / 에이전트 핸드오프

```text
PM (본 PRD, 워킹트리 작성, docs-only PR 만들지 않음)
            ↓
[ feature/layout-redesign 브랜치 ]
            ↓
  PRD commit + (워킹트리에 있던 SESSION_NOTES 처리 — frontend-dev 책임)
            ↓
ux-designer (DESIGN.md v4 신설) — 같은 브랜치 commit
            ↓
frontend-dev (3-section shell 구현)
            ↓ impl-ready 라벨
QA (라운드트립 5건 × 두 뷰포트 + drawer 동작 + 접근성) → qa-passed
            ↓ handoff-append workflow 자동 → HANDOFF.md
reviewer → review-approved (자가 PR 시 --comment + 라벨 fallback)
            ↓
DevOps merge → main
            ↓
PRD #2 component-compactness · PRD #3 claude-cli-analysis 신설
```

### 8.4 리스크 / 완화

| 리스크 | 완화 |
|---|---|
| PR diff 가 비대해져 reviewer 부담 + 롤백 단위 비대 | frontend-dev 가 작업 분할 재량 — 단 한 브랜치 안 누적. 분할 시 (1) layout shell 골격, (2) 사이드바 정보 단위, (3) ResultGroup 위계 적용 순. |
| 사이드바 정보 단위 (히스토리·즐겨찾기) 의 상태 관리 복잡도 (Supabase 없음) | in-session 메모리만. React context 또는 Zustand 같은 lightweight 상태. 새로고침 시 초기화임을 빈 상태 안내에서 한글로 명시. |
| 모바일 drawer 의 hydration mismatch | `useBreakpoint` 의 SSR-safe 패턴 (PR #17 검증됨) 그대로 사용. AC-14 에 명시. |
| 메인 영역 6블록 위계가 디자이너 판단과 PM 권고가 다른 경우 | DESIGN.md prose 에 위계 근거 박으면 AC-4 통과. PM 권고는 출발선만. |
| route group 도입으로 기존 페이지 경로 변경 | 옵션 A 채택 시 메인 URL `/` 는 동일 (route group `(workbench)` 는 URL 에 반영 안 됨). next.config 라우팅 무변경 확인. |
| `useAnalyzeForm` / `useAnalyzeRun` 호스팅 위치 변경 | 두 훅은 page.tsx 안에서 호출되는 패턴 유지. 사이드바가 폼을 호스팅하지 않으므로 props drilling 발생 안 함. |
| 신규 layout 컴포넌트의 토큰 직타 | AC-8 의 hex/px 검색으로 차단. v3 토큰 외 신규 토큰은 디자이너 산출물에 정의. |
| WCAG / 접근성 회귀 (drawer focus trap, ESC 처리) | AC-16 에 명시. drawer 의 focus trap + ESC 핸들링 + body scroll lock 디자이너·frontend-dev 가 자체 구현 또는 가벼운 패턴. |
| 후속 PRD #3 진입 시 본 PRD 의 정보 구조가 claude CLI 응답 shape 와 어긋남 | 본 PRD 는 6블록 shape (`action` / `brief` / `feasibility` / `horizons` / `risk_plan` / `warnings`) 에만 의존 — claude CLI 도 동일 shape 로 응답하도록 BFF 가 normalize 하면 무회귀. PRD #3 가 normalize 책임. |

### 8.5 PRD 분할 판단 근거

본 작업은 (1) 레이아웃 골격 / (2) 컴포넌트 내부 / (3) 데이터 소스 세 영역으로 분기된다. 사유:

1. **변경 영역의 결합도가 낮다** — 골격 변경은 컴포넌트 내부 구조와 독립. 데이터 소스 변경은 화면 구조와 독립 (BFF 추상화).
2. **한 PR 로 묶으면 1500+ 라인** 급으로 reviewer 부담·롤백 단위 비대.
3. **각 PRD 가 단독 머지 후 회귀 가능** — 본 PRD 머지 시점에 컴포넌트 내부는 v3 톤 그대로, 데이터 소스는 FastAPI 그대로 라도 화면 동작.
4. **디자이너 합류 트리거** 가 본 PRD 만 강함 (Layout 절 신설). PRD #2 는 컴포넌트 디테일 (디자이너 합류 약하게), PRD #3 는 UI 변경 없음 (디자이너 비합류).
5. **사용자 의도** 자체가 "전체 레이아웃 → 컴포넌트 → 분석 엔진" 의 자연스러운 분리.

분할 후 진입 순서: **#1 layout-redesign (본 PRD) → #2 component-compactness → #3 claude-cli-analysis**. #2 와 #3 은 본 PRD 머지 후 신설되며, 그 순서는 사용자 결정.

## 9. OPEN QUESTION

각 항목에 PM 권고를 명시한다. 디자이너·사용자 결정으로 확정한다.

### 9.1 좌측 사이드바에 들어갈 요소

- 후보:
  - (a) 분석 히스토리 — 최근 ticker 5건 (in-session).
  - (b) 즐겨찾기 ticker — 별표한 ticker (in-session).
  - (c) 외부 링크 — FinViz, Yahoo Finance 등 보조 정보 진입점.
- **PM 권고: a + b 우선, c 는 PRD #2 이후로 미룸**.
- 사유:
  - a + b 는 사용자가 자주 참조할 정보 단위. MVP 단계에서 in-session 으로도 가치 있음.
  - c 는 외부 의존 + 디자인 디테일 (썸네일·아이콘 필요) 이 추가됨. 본 PRD 의 layout 골격 단계에선 과한 부담.
  - 디자이너가 다른 단위 (예: 자주 사용한 입력 프리셋, 학습 자료 링크) 를 추가하려는 경우 DESIGN.md prose 근거 박고 채택 가능.

### 9.2 상단 navbar 에 들어갈 요소

- 후보:
  - 로고 + 서비스명.
  - (향후) 사용자 메뉴 / 로그인 / 다크모드 토글 / 알림 / 설정 진입점.
- **PM 권고: 로고 + 서비스명만 우선. 그 외 후속 PRD**.
- 사유:
  - 사용자 인증 미도입 (Supabase 안 붙음). 사용자 메뉴 자리는 비워두고 후속 PRD 에서 채움.
  - 다크모드 토글은 다크모드 PRD 에서 실 토큰 + 토글 컴포넌트 함께.
  - 모바일에선 좌측 hamburger 추가 (drawer 토글 — §9.4 참조).
- 디자이너가 placeholder 자리만 디자인 측에서 미리 잡아두면 후속 PRD 비용 감소.

### 9.3 메인 영역 정보 카테고리 우선순위

- 후보 (PM 권고 위계):
  1. ActionCard (최종 권고 BUY/HOLD/SELL) — 최상단, 가로 풀폭.
  2. BriefCard (기술 신호) — Action 바로 아래.
  3. FeasibilityCard + HorizonsCard — 2-col (데스크탑) / 세로 스택 (모바일).
  4. RiskPlanCard (진입/손절/익절/수량) — 단독 가로 풀폭.
  5. WarningsCard — 최하단.
- **PM 권고: 위 5단계 위계**. 디자이너 최종 결정.
- 사유:
  - 사용자가 가장 먼저 보고 싶은 것 = "이걸 사야 하나" = ActionCard. 첫 화면 위에 박혀야 함.
  - Brief 는 Action 의 근거 — Action 바로 아래 인접.
  - Feasibility (목표 현실성) + Horizons (구간별 추세) 는 보조 정보 — 병렬.
  - RiskPlan 은 실행 단계 정보 (진입 가격 등) — 보조 정보 다음.
  - Warnings 는 데이터 신뢰성 메타정보 — 최하단 (PR #11 OPEN QUESTION 의 결정과 다름. PR #11 권고는 "action 블록 하단" 이었으나, 새 위계에선 최하단으로 미루는 게 자연스러움. 디자이너 재검토 요).
- 디자이너가 위계를 바꾸려면 DESIGN.md prose 에 근거 박기.

### 9.4 모바일 사이드바 처리

- 후보:
  - hamburger drawer (`useBreakpoint().isMobile` 분기).
  - 페이지 최하단 fixed tab bar.
  - 사이드바 자체를 모바일에서 숨김 + 분석 히스토리는 메인 영역 안에 inline 표시.
- **PM 권고: hamburger drawer**.
- 사유:
  - navbar 좌측 hamburger 가 가장 학습 비용 낮음.
  - drawer 는 overlay slide-in 으로 메인 영역을 가리지 않음.
  - tab bar 는 추후 화면이 늘어날 때 도입 검토. 현재는 단일 화면이므로 과함.
  - in-session 만 유지하면 모바일에서 히스토리·즐겨찾기 가치가 낮을 수 있어, 디자이너가 모바일 한정 단순화 (예: 히스토리만 노출) 를 채택해도 무방.

### 9.5 route group 채택 여부

- 후보:
  - 옵션 A: `app/(workbench)/layout.tsx` + `app/(workbench)/page.tsx` route group.
  - 옵션 B: `app/layout.tsx` 에 navbar + sidebar 직접.
- **PM 권고: 옵션 A**.
- 사유:
  - 후속 PRD 에서 설정·프로필 같은 다른 화면군이 추가될 때 layout 분리 용이.
  - URL 에는 영향 없음 (route group 은 URL 에 반영 안 됨).
  - `docs/rules/frontend.md` 의 layout.tsx 컨벤션 절과 정합.
- 비용: route group 도입으로 `app/page.tsx` 가 `app/(workbench)/page.tsx` 로 이동 — frontend-dev 의 단순 mechanical move.

### 9.6 사이드바 width / navbar height 토큰

- **PM 권고**: 디자이너 결정. v3 토큰 외 신규 layout 토큰으로 `--sidebar-w` (권장 240~280px), `--navbar-h` (권장 56~64px) 추가.
- 토큰명은 semantic 으로 (`sidebar-w`, `navbar-h`). hex 토큰처럼 v4 DESIGN.md front matter 의 `spacing:` 또는 `layout:` 절에 정의.
- 모바일에서 drawer 폭은 별도 토큰 또는 viewport 기반 (`min(80vw, 320px)`).

### 9.7 분석 히스토리·즐겨찾기 상태 관리 방식

- 후보:
  - React Context (`AnalyzeHistoryProvider`).
  - Zustand / Jotai lightweight 상태 라이브러리.
  - 도메인 훅 (`useAnalyzeHistory`) 안에 ref/state.
- **PM 권고: React Context 또는 도메인 훅 + state**. 신규 라이브러리 도입 0건.
- 사유:
  - MVP 단계 in-session 만이므로 글로벌 상태 비용 낮음.
  - 사이드바 + 메인 영역 (분석 실행 시 히스토리에 push) 모두에서 접근 필요 → Context 가 자연스러움.
  - Zustand 도입은 후속 화면이 늘어나거나 영속화 필요 시 별도 PRD.

### 9.8 분석 히스토리의 push 시점

- 후보:
  - 분석 mutation 성공 시 자동 push.
  - 사용자가 명시적으로 "저장" 버튼 클릭 시.
- **PM 권고: 자동 push** (mutation 성공 시).
- 사유: 마찰 없음. in-session 이므로 잘못 추가돼도 비용 낮음.
- 동일 ticker 중복 push 처리: 중복 시 기존 항목을 위로 promote (최근 5건 LRU). 디자이너 재량.

### 9.9 즐겨찾기 add/remove UX

- 후보:
  - SearchPanel 에서 ticker 선택 시 별표 토글.
  - 사이드바 히스토리 항목에서 별표 토글.
  - 메인 영역 헤더 (선택된 ticker 표시 영역) 에서 별표 토글.
- **PM 권고: 메인 영역 헤더 + 사이드바 히스토리** 두 진입점.
- 사유: 분석 결과 확인 후 별표 추가가 자연스러움 + 히스토리에서 빠르게 즐겨찾기 격상 가능.
- 디자이너 결정 영역. PRD #2 component-compactness 에서 컴포넌트 디테일 확정 가능.

### 9.10 워킹트리 SESSION_NOTES 처리

- 현재 워킹트리에 `docs/SESSION_NOTES.md` 의 2026-05-21 세션 정리 항목이 modified 로 남아있음.
- **PM 권고**: 본 PRD 의 첫 commit (PRD 추가) 와는 **분리**. frontend-dev 가 별도 commit 으로 SESSION_NOTES 를 stage. 본 PRD 는 워킹트리에만 두고 docs-only PR 만들지 않으므로, 같은 브랜치 안에서 두 commit 으로 분리 가능.
- 사유: 책임 단위 분리 — PM 산출물 commit 과 누적 세션 정리 commit 은 다른 의미 단위.

### 9.11 본 PRD 가 끝난 뒤의 다음 작업

- 후보:
  - PRD #2 component-compactness 진입 — input·dropdown·selectbox 등 컴포넌트 내부 리디자인.
  - PRD #3 claude-cli-analysis 진입 — BFF 가 로컬 claude CLI 호출.
- **PM 권고**: 본 PRD 머지 후 사용자 우선순위 결정. PM 가설은 **#2 → #3** (시각 디테일 먼저, 데이터 소스 교체는 BE/FE 추상화 흡수 후).
- 두 PRD 모두 본 PRD 머지 후 신설 — 본 PRD 의 layout 골격이 양쪽 PRD 의 전제.
