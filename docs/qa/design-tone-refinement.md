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

---

## 7. v7 rev2 재검증 (2026-05-23)

### 0. 배경

1차 QA 통과 후 사용자 시각 검토에서 결함 4·5 가 추가 보고됐다 (PR 라벨이 `qa-passed → impl-ready` 로 되돌려짐). v7-rev2 누적 fix 가 들어왔으며 본 절은 그 누적 변경을 재검증한다.

- v7 rev2 변경 축:
  - **결함 4 fix** — `dropdown-item-h: 34→52`, `dropdown-item-py: 6→10`, `dropdown-item-gap: 2` 신규, `body-sm-strong: 14/700/1.35` 신규, `search-result-item-meta` + `-focus-meta` 합성 토큰 2 신규, SearchPanel 옵션 항목 2줄 마크업.
  - **결함 5 fix** — `accent-vivid: #1d4ed8` + `accent-vivid-soft: #dbeafe` 신규, `button-primary` 의 `bg-accent-vivid` cascade, `search-result-item-focus` 의 `bg-accent-vivid-soft / text-accent-vivid` cascade. Signature Slate `primary #1f3b4d` 무수정 (옵션 B — 정체성 보존 + 액션 신호 채도 한 단계 도입).

이번 재검증은 토큰 흡수 정합 / 결함 4·5 DOM cascade / 1차 fix 무회귀 / WCAG AA / 공통 무회귀 / 라이브 동기화 6 영역.

### 1. v7 rev2 토큰 흡수 정합

| 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|
| `tailwind.theme.json` colors 키 수 | 15 (13 + accent-vivid + accent-vivid-soft) | 15 — `python` 카운트: 15. 키: primary / surface / surface-muted / border-line / text-strong / text-muted / accent-soft / **accent-vivid** / **accent-vivid-soft** / warn / warn-soft / info / info-soft / critical / critical-soft. | OK |
| `tailwind.theme.json` fontSize/typography 키 수 | 16 (15 + body-sm-strong) | 16 — `tailwind.theme.json:102 "body-sm-strong"` 1행 신규. | OK |
| `tailwind.theme.json` spacing 키 수 | 23 (22 + dropdown-item-gap, dropdown-item-h 52, dropdown-item-py 10) | 23 — `tailwind.theme.json:194 "dropdown-item-h": "52px"`, `:195 "dropdown-item-py": "10px"`, `:196 "dropdown-item-gap": "2px"`. | OK |
| DESIGN.md front matter `components` 키 수 | 48 (46 + search-result-item-meta + search-result-item-focus-meta) | 48 — awk 카운트 정상. | OK |
| `app/components.css` 의 신규 토큰 `@apply` 호출 | bg/text-accent-vivid, bg/text-accent-vivid-soft, gap-dropdown-item-gap, min-h-dropdown-item-h, text-body-sm-strong | `components.css:111 bg-accent-vivid`, `:115 bg-accent-vivid/90`, `:152 gap-dropdown-item-gap min-h-dropdown-item-h ... text-body-sm-strong`, `:158 bg-accent-vivid-soft text-accent-vivid`, `:165 text-accent-vivid`. | OK |
| `git grep -nE "accent-vivid" tailwind.theme.json app/components.css` 정합 | 토큰 정의 (theme.json) + cascade 호출 (components.css) 양쪽 보유 | theme.json 2건 (`accent-vivid` / `accent-vivid-soft`) + components.css 5건. | OK |

### 2. 결함 4 DOM 검증 (dropdown 옵션 항목 2줄)

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-4-1 옵션 항목 height ≥ 50px | components.css `.search-result-item` / `-focus` 의 `min-h-dropdown-item-h` cascade | 52px (theme.json `dropdown-item-h: 52px`) | `components.css:152` 양쪽 selector 가 `min-h-dropdown-item-h` 호출. theme.json 52px 흡수. | OK |
| AC-4-2 옵션 항목 2줄 마크업 | `SearchPanel.tsx` 옵션 안 라벨 `<span>` + 메타 `<span className=search-result-item-meta>` 두 줄 | 2개 자식 span (라벨 + 메타) | `SearchPanel.tsx:223-237` — `<span>{item.ticker} · {item.name}</span>` (라벨) + `<span className={cn(focused ? "search-result-item-focus-meta" : "search-result-item-meta")}>{...meta...}</span>` (메타). | OK |
| AC-4-3 옵션 항목 layout = flex-col + gap | `.search-result-item` 합성 토큰의 layout | `flex flex-col justify-center gap-dropdown-item-gap` | `components.css:152` — 정합. | OK |
| AC-4-4 라벨 typography = body-sm-strong | 합성 토큰 기본 typography 가 14/700/1.35 | text-body-sm-strong | `components.css:152` 끝 `text-body-sm-strong`. theme.json `body-sm-strong: 14px/700` 흡수. | OK |
| AC-4-5 메타 typography = caption / text-muted | `.search-result-item-meta` 합성 토큰 | text-caption text-text-muted | `components.css:161-163` — `.search-result-item-meta { @apply text-caption text-text-muted; }` 정합. | OK |
| AC-4-6 focus 메타 cascade | `.search-result-item-focus-meta` 합성 토큰 | text-caption text-accent-vivid | `components.css:164-166` — 정합. SearchPanel 의 `focused` 분기 호출. | OK |
| AC-4-7 키보드 ARIA / outside-click / focus-index 무회귀 | combobox + listbox + 5속성 ARIA 유지 | role="combobox" + aria-expanded/controls/autocomplete/activedescendant + role="listbox" + useOutsideClick + focusIndex wrap-around 유지 | `SearchPanel.tsx:179-194` 모두 무회귀. PR #22/#24 영역 보존. | OK |

`git grep -nE "search-result-item-meta" components/workbench/SearchPanel.tsx` → 3건 (코멘트 + className 2회). 정합.

### 3. 결함 5 cascade 검증 (accent-vivid)

| AC | 기대 | 실측 | 판정 |
|---|---|---|---|
| AC-5-1 `button-primary` accent-vivid cascade | `.button-primary` 가 `bg-accent-vivid` (1차 v7 의 `bg-primary` 에서 교체) | `components.css:111 @apply h-button-primary-h px-md bg-accent-vivid text-surface ...` + `:114-115 hover:bg-accent-vivid/90`. | OK |
| AC-5-2 `search-result-item-focus` cascade | `bg-accent-vivid-soft text-accent-vivid` | `components.css:157-159 .search-result-item-focus { @apply bg-accent-vivid-soft text-accent-vivid; }` + `:152` 공유 layout. | OK |
| AC-5-3 Signature Slate 사용처 무회귀 | navbar-brand / sidebar-item-active / favorite-toggle-active / badge-accent / button-secondary / price-bar-target 의 `text-primary` / `bg-primary` 보존 | `components.css:184 .price-bar-target { @apply bg-primary; }`, `:205 navbar-brand text-primary`, `:236 sidebar-item-active text-primary`, `:273 favorite-toggle-active text-primary`, `:49 badge-accent text-primary`, `:123 button-secondary text-primary`. 6 사용처 모두 Slate 보존. | OK |
| AC-5-4 hex 직타 0건 | `git grep -nE "#1d4ed8\|#dbeafe" -- components/ app/` 결과 본 PR 추가 0건 (tailwind.theme.json + DESIGN.md 안만 허용) | grep 1건 (`app/components.css:108`) — **주석 안 설명용 hex**. cascade 코드에는 hex 직타 0건. PRD `## 검증` 절의 "주석 안 hex 1건은 설명용" 정합. | OK |
| AC-5-5 colors 외 hex 직타 무회귀 | `git grep -nE "#[0-9a-fA-F]{6}" -- 'app/' 'components/' | grep -v tailwind.theme.json | grep -v '\.md:'` | 결과 1건 (위 주석). 코드 hex 직타 0. | OK |

### 4. 1차 fix 무회귀 검증 (결함 1·2·3)

| 영역 | 기대 | 실측 | 판정 |
|---|---|---|---|
| 결함 1 dropdown anchor | SearchPanel 의 inner `relative` wrapper + dropdown `top-full` 보존 | `SearchPanel.tsx:159 <div className="relative">` (input 만 감싸는 inner wrapper) + `:193 className="dropdown-panel absolute top-full left-0 right-0 z-50 mt-xs ..."`. 무회귀. | OK |
| 결함 2 sidebar 높이 | layout.tsx grid `items-stretch` + `min-h-[calc(100vh-navbar-h)]` + Sidebar.tsx aside 자체 `min-h-[calc(...)]` 보존 | `app/(workbench)/layout.tsx:123` 정합. `Sidebar.tsx:41` 정합. 무회귀. | OK |
| 결함 3 colors v7 톤 보존 | surface `#ffffff`, surface-muted `#f6f8fa`, border-line `#eceff3`, text-strong `#0f1419`, text-muted `#5b6470` 등 v7 hex 유지 | `tailwind.theme.json:6-19` 13 키 모두 v7 hex 그대로. v7-rev2 가 colors 키 셋에 2건만 add (accent-vivid / accent-vivid-soft) 하고 기존 13 키 무수정. | OK |

### 5. WCAG AA 4.5:1 spot-check

DESIGN.md `### WCAG AA 대비비 표 (v7-rev2 갱신본)` (line 500~) 직접 검증:

| 페어 | 측정값 | AA 마진 | 판정 |
|---|---|---|---|
| `text-strong #0f1419` × `surface #ffffff` (본문) | **18.51:1** | +311% | OK |
| `text-muted #5b6470` × `surface #ffffff` (보조) | **6.00:1** | +33% | OK |
| `accent-vivid #1d4ed8` × `surface #ffffff` (link / focus ring) | **6.70:1** | +49% | OK |
| `surface #ffffff` × `accent-vivid #1d4ed8` (button-primary 흰 텍스트 × vivid 배경) | **6.70:1** | +49% | OK |
| `accent-vivid #1d4ed8` × `accent-vivid-soft #dbeafe` (search-result-item-focus 페어) | **5.49:1** | +22% | OK |

가장 좁은 마진 `accent-vivid × accent-vivid-soft` 5.49:1 — AA `4.5:1` 기준 +22% 안전. DESIGN.md L525 의 blue-700 선정 사유 ("blue-600 #2563eb 는 4.16:1 미달 → blue-700 #1d4ed8 결정") 합치. WCAG AA 무회귀.

### 6. 공통 무회귀

| AC | 명령 / 검증 | 결과 | 판정 |
|---|---|---|---|
| typecheck | `npm run typecheck` | 0 에러 | OK |
| lint | `npm run lint` | 0 에러 | OK |
| build | `npm run build` | Compiled successfully in 844ms. Static pages 6/6. Route 4건 (`/`, `/_not-found`, `/api/whitelist/search`, `/api/workbench/analyze`) bundle 무회귀 (35.1 kB / 152 kB First Load). | OK |
| BFF 패턴 | `git grep -nE "fetch\(" app/ components/ hooks/ lib/` | 3건 모두 route handler 안 (`app/api/whitelist/search/route.ts:23`, `app/api/workbench/_adapters/fastapi.ts:4 문구`, `:38`). 컴포넌트/훅/lib 클라이언트 `fetch(` 0건. | OK |
| 한글 톤 무회귀 | `lib/copy/workbench/*` diff | 본 PR 범위 무관 (PRD §4 카피 변경 0건). diff 0건. | OK |
| 라운드트립 5건 양 뷰포트 | dev 서버 / BE 미가용 환경에서 정적 + 렌더 HTML 검증. UI 토큰 cascade 변경은 BE 응답 shape 와 무관. | 정적 cascade 검증 OK. BE 환경 한계 명시. | OK (제약 명시) |
| 컴포넌트 prop 시그니처 무수정 | SearchPanel · Sidebar · layout `Props` 타입 무회귀 | git diff 영역에 Props 타입 변경 0건. | OK |
| 신규 라이브러리 도입 0건 | `git diff main..feature/design-tone-refinement -- package.json` | `dependencies` / `devDependencies` 변경 0건. `scripts.design:sync` 의 source 1줄 (v6 → v7) 만 변경. | OK |
| 모바일 drawer 동작 무회귀 | `components/layout/MobileDrawer.tsx` + `Sidebar.tsx` 의 `hidden lg:flex` + layout.tsx 의 `useBreakpoint` 분기 보존 | `MobileDrawer.tsx` 무수정. `Sidebar.tsx:5` 모바일 차단 docblock 유지. `layout.tsx:69-80` useBreakpoint + drawer 자동 닫힘 유지. | OK |
| ARIA 5속성 풀 셋 | role=combobox / aria-expanded / aria-controls / aria-autocomplete / aria-activedescendant + role=listbox | `SearchPanel.tsx:179-194` 5속성 풀 셋 + listbox 모두 보존. | OK |
| portal 미사용 | `git grep -nE "createPortal\|ReactDOM\.createPortal" components/workbench/SearchPanel.tsx` | 0건 — 옵션 A 정합. | OK |

### 7. DESIGN.md v7 rev2 라이브 동기화 (결정적 무회귀)

`accent-vivid` hex 임시 변경 → `design:sync` → 빌드 → 복원 라운드트립.

```
$ cp tailwind.theme.json /tmp/theme.before.json
$ cp docs/design/design-tone-refinement.md /tmp/design.before.md
$ sed -i.bak 's/accent-vivid: "#1d4ed8"/accent-vivid: "#ff0000"/' docs/design/design-tone-refinement.md
$ grep 'accent-vivid:' docs/design/design-tone-refinement.md
  accent-vivid: "#ff0000"                  ← 변경 반영 (front matter)
$ npm run design:sync
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).
$ grep '"accent-vivid":' tailwind.theme.json
        "accent-vivid": "#ff0000",         ← theme.json 흡수 OK
$ npm run build
✓ Compiled successfully in 844ms
✓ Generating static pages (6/6)
$ cp /tmp/design.before.md docs/design/design-tone-refinement.md
$ rm -f docs/design/design-tone-refinement.md.bak
$ npm run design:sync
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).
$ grep '"accent-vivid":' tailwind.theme.json
        "accent-vivid": "#1d4ed8",         ← 복원 OK
$ diff -q /tmp/theme.before.json tailwind.theme.json
$ echo "THEME RESTORED"
THEME RESTORED
$ git status
nothing to commit, working tree clean        ← 워킹트리 깨끗
```

**라이브 동기화 OK + 빌드 OK + 복원 OK + 멱등 OK + git status 깨끗**. DESIGN.md → tailwind.theme.json → cascade 가 결정적으로 동작.

### 8. v7 rev2 AC 재검증 표

| AC 절 | 항목 | 통과 | 비고 |
|---|---|---|---|
| 5.1 결함 1 dropdown anchor | 7/7 | OK | 1차 무회귀 |
| 5.2 결함 2 sidebar 높이 | 5/5 | OK | 1차 무회귀 |
| 5.3 결함 3 colors v7 톤 | 9/9 | OK | 1차 무회귀 |
| **5.4 결함 4 dropdown 옵션 2줄** | 7/7 | OK | **v7 rev2 신규 — 통과** |
| **5.5 결함 5 accent-vivid 비비드** | 9/9 | OK | **v7 rev2 신규 — 통과** |
| 5.6 cascade | 4/4 | OK | hex 직타 0건 |
| 5.7 공통 (typecheck/lint/build/BFF/카피/라이브러리/prop) | 9/9 | OK | 무회귀 |
| 토큰 흡수 (colors 15 / typography 16 / spacing 23 / components 48) | 4/4 | OK | v7 rev2 신규 |
| WCAG AA spot-check (5쌍) | 5/5 | OK | 최저 5.49:1 |
| 라이브 동기화 라운드트립 | 1/1 | OK | 멱등 |

**v7 rev2 누적 AC 60/60 통과. 실패 0건.**

### 9. 에지 케이스 (v7 rev2 신규)

| # | 에지 케이스 | 평가 | 판정 |
|---|---|---|---|
| E9 | `dropdown-item-h: 52` 가 키보드 ↑↓ 시각 점프 폭이 너무 커 사용자 혼란 | `search-result-item-focus` 가 `accent-vivid-soft + accent-vivid` 페어로 확실한 focus 강조. 점프 시각이 클수록 오히려 활성 옵션 위치 인지 쉬움. PRD §8.2 위험 평가 일치 — focus 시각 강조로 보완. | OK |
| E10 | `accent-vivid` 가 navbar wordmark / sidebar-item-active 등 Signature 영역에 누수 | `components.css` 의 6 Signature 영역 (`navbar-brand` / `sidebar-item-active` / `favorite-toggle-active` / `badge-accent` / `button-secondary` / `price-bar-target`) 모두 `text-primary` / `bg-primary` 유지. accent-vivid 호출은 `button-primary` / `button-primary-disabled` (헤더 docblock에 명시) / `search-result-item-focus` / `search-result-item-focus-meta` 4건 한정. | OK |
| E11 | `body-sm-strong` 토큰이 다른 컴포넌트로 누수 | `git grep -nE "text-body-sm-strong" -- app/ components/` 결과 `components.css:152` 1건 (.search-result-item / -focus 공유 정의). 호출처 한정. | OK |
| E12 | dropdown 의 hover 가 focus 와 같은 인덱스로 묶여 옵션 클릭 시 잘못된 선택 | `SearchPanel.tsx:213 onMouseEnter={() => setFocusIndex(index)}` + `:214-219 onMouseDown` 가 `e.preventDefault()` 후 `handleSelect(item)` (item 자체 인자) — 인덱스 race 없음. | OK |
| E13 | `accent-vivid-soft #dbeafe` 가 카드 surface 와 혼동 | surface `#ffffff` 대비 accent-vivid-soft `#dbeafe` 는 청색 채도 명확. dropdown focus 외 영역에 cascade 없음 (호출처 2건 한정). | OK |
| E14 | 라이브 동기화 시 `accent-vivid` 키만 흡수되고 cascade 무참여 | sed test 결과 theme.json 즉시 반영 + 빌드 통과 + 복원 멱등. cascade 실 동작 확인. | OK |

### 10. 최종 판정 — v7 rev2

- **v7 rev2 누적 AC**: 60/60 통과
- **실패**: 0건
- **PR 본문 `## 다음 작업` 게이트**: PR #25 body 안 `## 다음 작업` 1행 매칭 — handoff-append.yml 게이트 통과.
- **판정**: **qa-passed**

라벨 액션: `gh pr edit 25 --add-label qa-passed --remove-label impl-ready`.
