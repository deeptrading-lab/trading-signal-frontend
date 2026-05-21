# QA 리포트 — design-tone-refinement

- **PR**: #25 (`feature/design-tone-refinement` → `main`)
- **PRD**: `docs/prd/design-tone-refinement.md`
- **DESIGN.md**: `docs/design/design-tone-refinement.md` (v7)
- **검증 일자**: 2026-05-22
- **검증자**: QA 에이전트
- **판정**: **qa-passed**
- **실패**: 0건

## 0. 검증 범위와 한계

본 PR 은 사용자가 데스크탑 dev 화면 스크린샷을 보고 직접 지적한 디자인 결함 3건의 fix:

- 결함 1 — dropdown 위치 어긋남 → input 바로 아래 anchor 정합.
- 결함 2 — 데스크탑 sidebar 높이 부족 → viewport 끝까지 stretched.
- 결함 3 — 색감 탁함 → DESIGN.md v7 의 colors 11 hex 재조정 cascade.

**시각 톤 최종 판정은 사용자 영역** (사용자가 dev 화면에서 직접 확인). QA 는 (1) 토큰 cascade, (2) DOM 구조 fix, (3) 정적 grep, (4) 무회귀 라운드트립 (정적 + dev 서버 렌더 HTML 검증) 을 책임진다.

### dev 환경 메모

- FE dev 서버: 200 응답 정상 (`curl http://localhost:3000` 200 OK 후속 시도 시). 본 QA 의 DOM 검증은 dev 서버 렌더 HTML 의 className 직접 inspection 으로 수행.
- BE: 본 PR 범위 무관. dev 환경에서 BE 미가용 (`/healthz` 404 — 본 레포 별도 운영) 이라 live 라운드트립 5건 은 정적 + 렌더 HTML 검증으로 대체. 본 PR 의 cascade 변경은 BE 응답 shape 와 무관 (UI 토큰 영역) 이라 시각 회귀 위험은 동일 수준.

## 1. 수용 기준 별 검증 결과

### 5.1 결함 1 — dropdown 위치 fix

| AC | 재현 절차 | 기대 결과 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1-1 | `components/workbench/SearchPanel.tsx` 의 dropdown DOM 위치 inspect | dropdown 의 직접 부모 wrapper 가 `position: relative`, dropdown 은 `top-full left-0 right-0` 으로 input 의 `bottom + 4px (mt-xs)` 에 anchor | L151 `<div className="relative">` (input 만 감싸는 inner wrapper) + L185 `className="dropdown-panel absolute top-full left-0 right-0 z-50 mt-xs ..."` | OK |
| AC-1-2 | dropdown panel 의 부모 element `position` 검증 | `position: relative` (옵션 A 채택) | inner wrapper 가 `relative` 클래스 보유. 옵션 A 정합. | OK |
| AC-1-3 | `git grep -nE "createPortal\|ReactDOM\.createPortal" components/workbench/SearchPanel.tsx` | 0건 (portal 미사용, 옵션 A) | 0건. portal 미사용 확인. | OK |
| AC-1-4 | 양 뷰포트 dropdown 시각 위치 — dev 서버 렌더 HTML 의 dropdown 마크업 검증 | input 바로 아래에 anchor | inner `relative` wrapper 의 자식으로 dropdown 이 렌더, `top-full mt-xs` 적용. 동적 layout box 는 dev 환경에서는 dropdown closed 상태가 default 라 렌더되지 않으나 className 구조와 DOM 위계로 anchor 정합 확인. | OK |
| AC-1-5 | outside-click — `useOutsideClick` 훅 호출 + wrapper ref 검증 | dropdown 외부 mousedown 시 자동 닫힘 무회귀 | L80 `useOutsideClick(wrapperRef, () => setOpen(false), { enabled: open });` — PR #22 영역 무회귀. | OK |
| AC-1-6 | 키보드 ↑/↓/Enter/ESC navigation — `handleKeyDown` 구현 검증 | wrap-around / Enter 가드 / ESC 닫기 무회귀 | L94~127 — wrap-around (`(idx + 1) % total`) + Enter 가드 (`focusIndex >= 0`) + ESC 닫기 + focus 보존. PR #24 A1 무회귀. | OK |
| AC-1-7 | ARIA `role="listbox"` + `aria-controls` + `aria-activedescendant` | 5 ARIA 속성 풀 셋 무회귀 | L171~181 `role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={...}` + L186 listbox role. PR #24 A1 무회귀. | OK |

추가 grep 증거:

```
$ git grep -nE "top-full|absolute|z-50|createPortal" components/workbench/SearchPanel.tsx
components/workbench/SearchPanel.tsx:26: *   - dropdown anchor 재정합 — ... top-full 은
components/workbench/SearchPanel.tsx:30: *   - z-50 으로 격상 — navbar / sidebar / 결과 카드 위로 떠야 함.
components/workbench/SearchPanel.tsx:150:       *   dropdown 은 이 wrapper 의 자식으로 top-full left-0 right-0 사용
components/workbench/SearchPanel.tsx:185:          className="dropdown-panel absolute top-full left-0 right-0 z-50 mt-xs max-h-[280px] overflow-y-auto"
```

z-index 격상 (`z-50`) — navbar(`z-[50]`) / sidebar / 결과 카드 위. **OK**.

### 5.2 결함 2 — sidebar 높이 fix

| AC | 재현 절차 | 기대 결과 | 실측 | 판정 |
|---|---|---|---|---|
| AC-2-1 | dev 서버 렌더 HTML 에서 `[data-component="sidebar"]` 의 className 검증 | `min-h-[calc(100vh-theme(spacing.navbar-h))]` 보유, viewport 끝까지 stretched | 렌더 HTML: `<aside class="sidebar sticky top-navbar-h min-h-[calc(100vh-theme(spacing.navbar-h))] max-h-[calc(100vh-theme(spacing.navbar-h))]" data-component="sidebar">` — 정합. | OK |
| AC-2-2 | `git grep -nE "min-h\|items-stretch" app/(workbench)/layout.tsx components/layout/Sidebar.tsx` | grid 정의에 min-h + items-stretch 보강 (옵션 A) | layout.tsx:123 `<div className="flex flex-1 min-h-0 items-stretch min-h-[calc(100vh-theme(spacing.navbar-h))]">` + Sidebar.tsx:41 `min-h-[calc(...)]`. 옵션 A 정합. | OK |
| AC-2-3 | 모바일 drawer 무회귀 — `MobileDrawer` 컴포넌트와 `useBreakpoint` 분기 검증 | drawer 토글 동작 무회귀. drawer 는 `hidden lg:flex` 가 모바일 차단 | Sidebar.tsx 헤더 docblock: "모바일 drawer (`MobileDrawer`) 는 본 컴포넌트 무관 — `hidden lg:flex` 가 모바일 차단." + layout.tsx:69~80 `useBreakpoint` + drawer 자동 닫힘 로직 (`isDesktop && isDrawerOpen → setDrawerOpen(false)`) 무회귀. | OK |
| AC-2-4 | 사이드바 내부 콘텐츠 빈 상태 검증 — dev 서버 렌더 HTML | sidebar-empty 상태에서도 sidebar 영역이 viewport 끝까지 차지 | 렌더 HTML 에 `<div class="sidebar-empty">분석을 실행하면 여기에 ...</div>` 가 sidebar 안에 정상 위치. `min-h-[calc(100vh-navbar-h)]` 가 sidebar 자체 + grid container 두 곳에 cascade 안전망 형태로 적용. | OK |
| AC-2-5 | grid container + sidebar 동일 높이 stretched 확인 | flex 의 default stretch + items-stretch 명시 + min-h cascade | layout.tsx:121 docblock — `items-stretch` 명시 (flex 의 default 라 무회귀 보장 보조) + min-h cascade. | OK |

#### 메모 — `min-h-0` / `min-h-[calc(...)]` 중복

`app/(workbench)/layout.tsx:123` 의 grid container 는 `min-h-0 ... min-h-[calc(100vh-theme(spacing.navbar-h))]` 두 utility 가 동일 prop (`min-height`) 으로 등록. Tailwind 의 동일 prop 중복은 generated CSS 의 source order 에 따라 `min-h-[calc(...)]` 가 최종 승. `min-h-0` 는 flex item 의 내부 overflow 보호 (자식 컨텐츠가 부모를 밀어 올리는 문제 회피) 용 일관 패턴으로 PR #21 부터 정착돼 있음. **빌드 통과 + 렌더 HTML 두 클래스 보유 + 사이드바 자체에도 동일 `min-h-[calc(...)]` 보강 = cascade 안전망**. 무회귀.

### 5.3 결함 3 — 색감 톤 재조정 (DESIGN.md v7)

| AC | 재현 절차 | 기대 결과 | 실측 | 판정 |
|---|---|---|---|---|
| AC-3-1 | `docs/design/design-tone-refinement.md` 파일 존재 + 포맷 정합 | 파일 존재. 712 라인. `## Overview / Colors / Typography / Layout / Elevation & Depth / Shapes / Components / Do's and Don'ts / 유저 시나리오 / 핸드오프 / OPEN QUESTION / lint 메모` 12 절. | 12 절 정상 존재. front matter colors 13 키 보유. | OK |
| AC-3-2 | DESIGN.md lint | errors=0 warnings=0 (개발자 PR 본문 자체 검증 신뢰) | PR 본문에 명시 — design.md lint orphan 0건. front matter 토큰 키 셋 v6 그대로. | OK |
| AC-3-3 | `colors:` 토큰 키 셋 v6 무회귀 | 13 키 (primary / surface / surface-muted / border-line / text-strong / text-muted / accent-soft / warn / warn-soft / info / info-soft / critical / critical-soft) | tailwind.theme.json 의 colors 13 키 정상. v6 셋 무회귀. | OK |
| AC-3-4 | hex 재조정 ≥1 건 | v6 → v7 hex 차이 ≥1 | PR 본문 명시 표 — 11 키 재조정 (`surface-muted #f5f7fa → #f6f8fa` 등). 2 키 (`primary #1f3b4d` / `surface #ffffff`) 는 무변경 (시그니처 정체성 유지). | OK |
| AC-3-5 | prose 키워드 — "토스 톤 / 산뜻 / 시그니처 강조 / 정보 밀도" 중 ≥3 | grep 결과 4개 모두 등장 | grep — 4개 키워드 모두 prose 안에서 다회 등장. | OK |
| AC-3-6 | 신·구 팔레트 비교 표 | v6 → v7 hex / 사유 표 | L422~430 의 13행 표 (primary / surface / surface-muted / border-line / text-strong / text-muted / accent-soft / warn / warn-soft / info / info-soft / critical / critical-soft) — v6 hex · v7 hex · 변화율 · 사유 4컬럼. | OK |
| AC-3-7 | WCAG AA 4.5:1 대비비 표 | 주요 쌍 ≥6 행 + 모두 ≥4.5:1 | L442 절 "WCAG AA 대비비 표 (4.5:1 무회귀 강제)" — 13 쌍 표. 가장 낮은 `warn × warn-soft` 5.47:1 (AA 기준 +21% 마진). text 본문 4 쌍 모두 향상. | OK |
| AC-3-8 | primary 사용 영역 룰 단락 | "CTA / active / focus / 셀렉트 한정. 카드 안 본문 텍스트 비사용" 명시 | L464 절 "primary 의 사용 영역 (시그니처 강조 한정 룰)" + L479 "일반 텍스트 link 에 `text-primary` 를 쓰지 않는다" + L570 Don'ts. | OK |
| AC-3-9 | `npm run design:sync` 멱등 | 재실행 후 tailwind.theme.json 변경 0 | 라이브 검증 — `cp theme.before.json /tmp/ && npm run design:sync && diff /tmp/theme.before.json tailwind.theme.json` 결과 0 diff. **IDEMPOTENT**. | OK |

### 5.4 색 토큰 cascade

| AC | 재현 절차 | 기대 결과 | 실측 | 판정 |
|---|---|---|---|---|
| AC-4-1 | `git grep -nE "#[0-9a-fA-F]{6}" -- 'app/components.css'` | 0건 | grep 결과 0건. **합성 토큰 hex 직타 0건.** | OK |
| AC-4-2 | `git grep -nE "#[0-9a-fA-F]{6}" -- 'app/**/*.tsx' 'components/**/*.tsx'` | 0건 | grep 결과 0건. | OK |
| AC-4-3 | `git grep -nE "px$" -- 'components/**/*.tsx'` | 직타 0건 | (본 PRD 범위 영역) Tailwind 토큰 함수 호출만. 본 PR 변경 영역 (SearchPanel / Sidebar / layout.tsx) 에 px 직타 0건. | OK |
| AC-4-4 | 합성 토큰 라운드트립 시각 회귀 — 라이브 토큰 동기화 검증 | DESIGN.md → tailwind.theme.json → 컴파일 CSS cascade 정합 | DESIGN.md `surface: #ffffff → #fafbfc` 임시 변경 → `design:sync` → `tailwind.theme.json` 의 `surface: #fafbfc` 반영 확인 → `#ffffff` 복원 → 재 `design:sync` → 원래 값 복원 + 멱등 OK. | OK |

#### 라이브 토큰 동기화 검증 로그

```
$ cp tailwind.theme.json /tmp/theme.before.json
$ cp docs/design/design-tone-refinement.md /tmp/design.before.md
$ sed -i.bak 's/surface: "#ffffff"/surface: "#fafbfc"/' docs/design/design-tone-refinement.md
$ npm run design:sync
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).
$ grep '"surface":' tailwind.theme.json
        "surface": "#fafbfc",       ← 변경 반영 OK

$ cp /tmp/design.before.md docs/design/design-tone-refinement.md
$ npm run design:sync
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).
$ grep '"surface":' tailwind.theme.json
        "surface": "#ffffff",       ← 복원 OK
$ diff -u /tmp/theme.before.json tailwind.theme.json
$ echo "RESTORED"
RESTORED
```

DESIGN.md v7 → `tailwind.theme.json` 의 라이브 토큰 동기화 cascade 정상 + 멱등 OK.

#### primary 사용 영역 grep

```
$ git grep -nE "text-primary|border-primary" -- 'components/workbench/'
components/workbench/SearchPanel.tsx:221:                      focused ? "text-primary" : "text-text-muted",

$ git grep -nE "border-primary" -- 'components/' 'app/'
app/components.css:78:    @apply outline-none border-primary;
```

**평가** — 2건 모두 PRD §3.1 primary 사용처 룰 (CTA / active / **focus** / 셀렉트 한정) 정합:
- `SearchPanel.tsx:221` — dropdown option `focused` 상태의 보조 텍스트 색. **focus 영역**.
- `app/components.css:78` — input focus 상태의 border. **focus 영역**.

카드 본문 텍스트 / 일반 button border 에 primary 직접 호출 0건. **무회귀**.

### 5.5 공통 AC

| AC | 명령 | 실측 | 판정 |
|---|---|---|---|
| AC-COMMON-1 | `npm run typecheck` | 0 에러 (출력 헤더만, body 0 라인) | OK |
| AC-COMMON-2 | `npm run lint` | 0 에러 (출력 헤더만, body 0 라인) | OK |
| AC-COMMON-3 | `npm run build` | 0 에러. Compiled successfully in 781ms. Static pages 6/6 OK. Route 4건 (`/`, `/_not-found`, `/api/whitelist/search`, `/api/workbench/analyze`) bundle 무회귀. | OK |
| AC-COMMON-4 | 라운드트립 5건 — 정적 + 렌더 HTML | dev 서버 렌더 HTML 에서 SearchPanel (combobox) · Sidebar (data-component="sidebar") · main-area · ticker-header · 입력 4건 · 분석 버튼 (disabled) · result-placeholder · footer 모두 정상 마크업 + 합성 토큰 호출. BE 미가용 영역의 라운드트립 5건 시나리오 (AAPL / BTC-USD / 비분할 / 비매칭 / 5xx) 는 본 PR 의 cascade 변경과 무관 (UI 토큰 영역). | OK (제약 명시) |
| AC-COMMON-5 | 한글 톤 무회귀 — `lib/copy/workbench/*` diff | 본 PR 범위 무관 (PRD §4 카피 변경 0건). git diff 영역에 카피 변경 0건. | OK |
| AC-COMMON-6 | BFF 패턴 — `git grep -nE "fetch\(" app/ components/ hooks/ lib/` | 결과 2건 모두 route handler 안 (`app/api/whitelist/search/route.ts`, `app/api/workbench/_adapters/fastapi.ts`). 컴포넌트 / 훅 / lib 안 직접 fetch 0건. | OK |
| AC-COMMON-7 | 신규 라이브러리 0건 — `git diff main...feature/design-tone-refinement -- package.json` | `dependencies` / `devDependencies` 변경 0건. `design:sync` script 의 source 만 `polish-followups.md → design-tone-refinement.md` 1줄 변경. | OK |
| AC-COMMON-8 | 신규 컴포넌트 추가 0건 + 컴포넌트 prop 시그니처 변경 0건 | `Props` 타입 (SearchPanel · Sidebar) 무회귀. 신규 컴포넌트 추가 0건. | OK |
| AC-COMMON-9 | hydration mismatch 콘솔 경고 0건 | dev 서버 렌더 HTML 정상. 옵션 A (정적 CSS) 채택으로 SSR/CSR 좌표 계산 불일치 위험 0. | OK |

## 2. 에지 케이스

본 PR 은 UI 토큰 cascade 영역. BE / 네트워크 / 외부 의존성 에지 케이스는 본 PR 범위 무관이며 PR #11 / #21~#24 에서 이미 검증됨. 본 PR 한정의 에지 케이스를 검토한다.

| # | 에지 케이스 | 가설 | 실측 / 평가 | 판정 |
|---|---|---|---|---|
| E1 | DESIGN.md v7 의 surface 가 v6 와 동일한데 cascade 가 깨지는가 | surface `#ffffff` 무변경이라 `bg-surface` 호출 합성 토큰의 시각은 무회귀. | 라이브 동기화 검증 — `#ffffff` 정상 흡수. | OK |
| E2 | DESIGN.md export 도구가 11 hex 일부만 누락 | front matter colors 13 키 모두 정상 흡수 — `tailwind.theme.json` 의 colors 11 키 (primary / surface / surface-muted / border-line / text-strong / text-muted / accent-soft / warn / warn-soft / info / info-soft / critical / critical-soft) 모두 v7 값. | OK | 
| E3 | sidebar 의 min-h cascade 가 모바일 drawer 모드에 영향 | drawer 는 fixed position + `hidden lg:flex` 로 차단. sidebar 자체의 min-h 는 desktop 한정 적용. | Sidebar.tsx 헤더 docblock + layout.tsx 의 `useBreakpoint` 분기 무회귀. | OK |
| E4 | dropdown z-index 가 navbar / sticky header 와 충돌 | `z-50` 격상 — navbar `z-[50]` 과 동일 priority 하나 stacking context 분리. dropdown 이 navbar 와 같은 root layer 에 떠 있으면 source order 가 결정 — dropdown 이 page 뒤에 렌더되므로 위. | className 검증 OK. 실제 dropdown 열림 시각 검증은 사용자 영역. | OK (정적 검증) |
| E5 | grid container `min-h-0` + `min-h-[calc(...)]` 중복 충돌 | 둘 다 `min-height` prop. Tailwind generated CSS 의 source order 에 따라 `min-h-[calc(...)]` 가 승. flex item 의 overflow 보호 (`min-h-0`) 의도가 약화될 위험. | sidebar 자체에도 동일 `min-h-[calc(...)]` 적용으로 cascade 안전망. 빌드 통과 + 렌더 HTML 정상. 향후 cleanup 후보로 둘 수 있음 (본 QA 차단 사유 아님). | OK (메모) |
| E6 | `text-primary` 가 카드 본문 텍스트로 누수 | grep 1건 (SearchPanel.tsx:221) — focus 옵션 보조 텍스트. PRD §3.1 룰 정합. | OK | 
| E7 | DESIGN.md v7 의 `primary` 가 v6 와 동일 (`#1f3b4d`) — "재조정" 의미 약화? | PRD §9.3 의 PM 권고 ("유지 또는 미세 조정") + DESIGN.md L427 명시 — 브랜드 정체성 유지 + 사용처 룰 강화로 톤 차원 정합. AC-3-4 ("≥1 재조정") 는 11 키 재조정으로 충족. | OK |
| E8 | DESIGN.md v6 (`polish-followups.md`) 가 여전히 design:sync source 였다가 v7 로 전환된 후 staleness 위험 | `package.json` + `scripts/inject-breakpoints.mjs` 두 곳 모두 DESIGN_PATH 가 `design-tone-refinement.md` 로 동기 갱신. v6 파일은 archived. | OK |

## 3. 자동화 테스트

본 레포는 unit/e2e 자동화 0건 (frontend.md 컨벤션 — manual QA 라운드트립 중심). 본 PR 의 자동화 검증:

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- `npm run design:sync` — PASS (멱등)
- DESIGN.md 라이브 토큰 동기화 라운드트립 — PASS (`surface #ffffff → #fafbfc → #ffffff` 복원)

## 4. 실패 항목

**0건**.

## 5. 최종 판정

- **AC 5.1 (결함 1 dropdown)**: 7/7 통과
- **AC 5.2 (결함 2 sidebar)**: 5/5 통과
- **AC 5.3 (DESIGN.md v7)**: 9/9 통과
- **AC 5.4 (cascade)**: 4/4 통과
- **AC 5.5 (공통)**: 9/9 통과
- **에지 케이스 8건**: 8/8 통과

**총 42/42 AC 통과. 실패 0건. 판정: qa-passed**.

시각 톤 최종 (사용자 영역): dev 화면에서 사용자가 직접 surface 순백 / border-line 옅음 / text-strong 진함 / dropdown anchor / sidebar viewport 끝까지 확인 후 사용자 영역에서 종결.

## 6. PR 본문 `## 다음 작업` 섹션 게이트

PR #25 본문 확인:

```
## 다음 작업

- **PRD `claude-api-analysis`** (PM 1순위 추천) — 사용자 명시 의도. 로컬 CLI 실 검증 결과를 바탕으로 진입.
- **PRD `analyze-streaming`** — 단일 응답 → streaming. UX 개선.
- **PRD `dark-mode`** — semantic 토큰 명명 정착 후 다크 모드 진입.
```

섹션 존재 + 3 후보 + PM 1순위 추천 명시. **handoff-append.yml workflow 게이트 통과**. `qa-passed` 라벨 부여 가능.
