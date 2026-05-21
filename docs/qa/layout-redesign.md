# QA: layout-redesign

- **slug**: `layout-redesign`
- **PR**: [#21](https://github.com/deeptrading-lab/trading-signal-frontend/pull/21) — `feat(layout): 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기`
- **브랜치**: `feature/layout-redesign`
- **PRD**: `docs/prd/layout-redesign.md` (AC 16건, §5)
- **DESIGN.md**: `docs/design/layout-redesign.md` v4
- **검증 일자**: 2026-05-21 ~ 2026-05-22
- **검증자**: QA 에이전트

## 0. 검증 환경 / 한계 명시

- **BE 가동 여부**: `curl http://127.0.0.1:8000/health` → `{"status":"ok"}` ✅ **LIVE**.
- **dev 서버**: 본 세션이 PORT=3100 으로 띄움. BE down fallback(5xx) 검증 시 PORT=3101 + `FASTAPI_BASE_URL=http://127.0.0.1:65535` 별도 인스턴스로 시뮬레이션. 검증 후 두 인스턴스 모두 종료.
- **두 뷰포트 검증 한계**: 본 세션은 Playwright/실 브라우저를 가지지 않으므로, 모바일(375)/데스크탑(1280) 의 시각·동작 분기는 **(1) Tailwind 반응형 클래스 (`lg:hidden`, `lg:flex`, `lg:grid-cols-2`) 의 정적 검증 + (2) SSR HTML 의 DOM/카피 구조 검증 + (3) React 코드의 `useBreakpoint().isDesktop` 분기 로직 검증** 3-way 로 대체. 시각 회귀 픽셀 비교는 본 세션 범위 밖이며, Reviewer 단계 또는 사용자 수동 검증으로 보강 권고.
- **빌드 / typecheck / lint**: 0 에러 재확인.

## 1. 자동 검증 (명령 + 출력)

### 1.1 typecheck / lint / build

```
$ npm run typecheck
> trading-signal-frontend@0.1.0 typecheck
> tsc --noEmit
(0 error)

$ npm run lint
> trading-signal-frontend@0.1.0 lint
> eslint .
(0 error)

$ npm run build
✓ Compiled successfully in 727ms
Route (app)                                 Size  First Load JS
┌ ○ /                                    34.7 kB         152 kB
├ ○ /_not-found                            995 B         103 kB
├ ƒ /api/whitelist/search                  127 B         102 kB
└ ƒ /api/workbench/analyze                 127 B         102 kB
+ First Load JS shared by all             102 kB
(0 error, 6 routes generated)
```

**기대**: 모두 0 error. **실측**: 0 error. ✅

### 1.2 BFF 무회귀

```
$ git grep -nE "http://127\.0\.0\.1" -- app/
app/api/whitelist/search/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
app/api/workbench/analyze/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";

$ git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/
(0 hits)
```

**기대**: route handler 안 fallback 외 0건, 직접 fetch 0건. **실측**: 일치. ✅

### 1.3 v3 sticky-sidebar 폐기 검증

```
$ git grep -nE "lg:grid-cols-\[360px_1fr\]|lg:sticky lg:top-0" -- app/
app/(workbench)/page.tsx:20: *   - lg:grid-cols-[360px_1fr] / lg:sticky lg:top-0 패턴 폐기 (AC-3).
```

JSX/CSS 가 아닌 주석 1건. 실 사용 0건. ✅

### 1.4 hex/px 직타 금지 (신설 영역)

```
$ git grep -nE "#[0-9a-fA-F]{6}" -- 'app/(workbench)/' components/layout/
(0 hits)
```

✅

### 1.5 `window.innerWidth` / `matchMedia` 금지

```
$ git grep -nE "window\.innerWidth|matchMedia" -- components/layout/ 'app/(workbench)/' hooks/workbench/
(0 hits)
```

✅ (모든 viewport 분기는 `useBreakpoint` 또는 Tailwind `lg:` prefix.)

### 1.6 layout.tsx 컨벤션

```
$ find app -name layout.tsx
app/layout.tsx
app/(workbench)/layout.tsx
```

✅ (2개. RootLayout + route group layout.)

## 2. AC 별 재현 · 기대 · 실측

### AC-1 — 3-section shell 존재

| 재현 | 기대 | 실측 |
|---|---|---|
| `ls components/layout/` | Navbar / Sidebar / MobileDrawer 컴포넌트 존재 | Navbar.tsx / Sidebar.tsx / MobileDrawer.tsx / SidebarContent.tsx / SidebarItem.tsx / FavoriteToggle.tsx / workbenchEvents.ts (7) ✅ |
| `curl /` SSR HTML 의 클래스 키워드 | `navbar` + `sidebar` + `main-area` + `ticker-header` 4종 모두 1+ hit | 4/4 hit ✅ |

**판정**: PASS ✅

### AC-2 — layout.tsx 컨벤션 적용

| 재현 | 기대 | 실측 |
|---|---|---|
| `find app -name layout.tsx` | 2개 이상 | 2 (`app/layout.tsx`, `app/(workbench)/layout.tsx`) |
| `app/layout.tsx` 내용 | html/body/Providers 만 책임 | 20줄, Providers + html lang="ko" + body 만 ✅ |
| `app/(workbench)/layout.tsx` 내용 | Navbar + Sidebar + MobileDrawer 호스팅 + WorkbenchSessionProvider | 137줄에서 셋 모두 import + Provider 감쌈 ✅ |

**판정**: PASS ✅

### AC-3 — 기존 2-column sticky 폐기

| 재현 | 기대 | 실측 |
|---|---|---|
| `git grep "lg:grid-cols-\[360px_1fr\]" -- 'app/page.tsx' 'app/(workbench)/page.tsx'` | 0 hit | 0 hit (PR diff 에서 `app/page.tsx` 삭제 122줄, route group 으로 이전) ✅ |
| `git grep "lg:sticky lg:top-0"` 상동 | 0 hit (sidebar 컴포넌트 자체 sticky 는 허용) | page 내 0 hit. Sidebar.tsx 가 sticky 사용 (허용) ✅ |

**판정**: PASS ✅

### AC-4 — 메인 영역 6블록 위계

| 재현 | 기대 | 실측 |
|---|---|---|
| `components/workbench/ResultGroup.tsx` 의 success 분기 | 1) ActionCard 전폭 → 2) BriefCard 전폭 → 3) FeasibilityCard+HorizonsCard 2-col(lg)/1-col(mobile) → 4) RiskPlanCard 전폭 → 5) WarningsCard 전폭(빈 배열 시 hidden) | 코드 56~91 줄에 명시된 그대로 5블록 + 6번째 WarningsCard 빈 배열 hidden. `grid gap-md grid-cols-1 lg:grid-cols-2` 정확 사용. ✅ |
| `useBreakpoint` JS 분기 없는지 | CSS 1차 도구 (Tailwind prefix) | ResultGroup 내 `useBreakpoint` 0건 (페치는 layout.tsx 의 drawer 자동 닫기에만) ✅ |

**판정**: PASS ✅

### AC-5 — 사이드바 정보 카테고리

| 재현 | 기대 | 실측 |
|---|---|---|
| `SidebarContent.tsx` 두 섹션 | 분석 히스토리 + 즐겨찾기 | section[aria-label="분석 히스토리"] + section[aria-label="즐겨찾기"] 2개 ✅ |
| 빈 상태 한글 안내 | "분석을 실행하면…" / "관심 종목을…" / "새로고침 시 초기화돼요" | SSR HTML 에서 3개 카피 모두 hit ✅ |

**판정**: PASS ✅

### AC-6 — 모바일 drawer 동작

| 재현 | 기대 | 실측 |
|---|---|---|
| Navbar hamburger 마크업 | `lg:hidden` + `aria-controls=drawerId` + `aria-expanded={isDrawerOpen}` + `aria-label="메뉴 열기"` | Navbar.tsx 43~52 모두 충족 ✅ |
| MobileDrawer 닫기 진입점 3개 | (1) ESC 키, (2) scrim tap, (3) 상단 close 버튼 | MobileDrawer.tsx 53~58 (ESC) / 110~114 (scrim) / 126~133 (close ✕) 모두 구현 ✅ |
| 데스크탑 전환 시 자동 닫기 | `useBreakpoint().isDesktop && isDrawerOpen` → setDrawerOpen(false) | `app/(workbench)/layout.tsx` 76~80 useEffect 구현 ✅ |
| body scroll lock | `document.body.style.overflow = "hidden"` while open | MobileDrawer.tsx 96~103 ✅ |
| focus trap | Tab 순환 + 최초 focusable autofocus + 닫힘 시 이전 focus 복귀 | MobileDrawer.tsx 53~93 ✅ |

**판정**: PASS ✅ (시각 확인은 본 세션 한계로 제외, 모든 정적·로직 검증 통과.)

### AC-7 — 입력 영역 위치 이동

| 재현 | 기대 | 실측 |
|---|---|---|
| `app/(workbench)/page.tsx` import | SearchPanel + InputPanel 모두 page 안 | line 32~33 ✅ |
| `components/layout/Sidebar.tsx`·`SidebarContent.tsx` | SearchPanel·InputPanel 미사용 | 두 파일에 `SearchPanel`/`InputPanel` 0 hit ✅ |

**판정**: PASS ✅

### AC-8 — 디자인 토큰 무회귀

| 재현 | 기대 | 실측 |
|---|---|---|
| `tailwind.theme.json` colors | v3 13 semantic 그대로 | primary `#1f3b4d`, surface, surface-muted, border-line, text-strong, text-muted, accent-soft, warn, warn-soft, info, info-soft, critical, critical-soft 13건 ✅ |
| 신규 layout 토큰 | spacing.navbar-h(60px) / sidebar-w(264px) / drawer-w(304px) / main-max-w(1152px), borderRadius.md(12px), typography nav-brand / sidebar-section | 모두 추가 ✅ |
| hex 직타 금지 (신설 영역) | 0 hit | 0 hit ✅ |

**판정**: PASS ✅

### AC-9 — DESIGN.md v4 신설

| 재현 | 기대 | 실측 |
|---|---|---|
| `ls docs/design/layout-redesign.md` | 존재 | 832 lines ✅ |
| colors 절 13 토큰 | v3 동일 | 동일 hex 13건 ✅ |
| Layout 절 prose | 3-section shell 정의 + 6블록 위계 근거 + 모바일 drawer 명세 | line 391~436 등에 prose 존재 ✅ |
| `npm run design:sync` 결정성 | 손편집 흔적 없이 deterministic regenerate | `cp; sync; diff` 결과 0 byte 차 ✅ (§3 참조) |

**판정**: PASS ✅

### AC-10 — BFF 무회귀

| 재현 | 기대 | 실측 |
|---|---|---|
| `git grep "http://127.0.0.1" -- app/` | route handler 안 fallback 만 | 2 hit (`app/api/whitelist/search/route.ts:11`, `app/api/workbench/analyze/route.ts:11`) — 둘 다 `process.env.FASTAPI_BASE_URL ?? ` 의 fallback 표현 ✅ |
| `git grep "fetch(" -- components/ hooks/ lib/api/workbench/` | 0 | 0 hit ✅ |
| `lib/types/workbench/*` 수정 여부 | 무변경 | PR diff stat 에 미등장 ✅ |

**판정**: PASS ✅

### AC-11 — 한글 톤 무회귀

| 재현 | 기대 | 실측 |
|---|---|---|
| 신설 카피 (`lib/copy/workbench/layoutCopy.ts`) | 한글 유지 | "메뉴 열기/닫기", "분석 히스토리", "즐겨찾기", "분석을 실행하면 여기에 최근 종목이 쌓여요.", "관심 종목을 별표로 표시하면 여기에 모여요.", "새로고침 시 초기화돼요.", "분석할 종목을 검색해 주세요.", "즐겨찾기 추가/해제", "투자 판단 보조 자료입니다…" 모두 한글 ✅ |
| 기존 `actionLabels.ts` / `errorMessages.ts` | 무수정 | PR diff stat 미등장 ✅ |
| SSR HTML 의 한글 노출 | TradingSignalEngine(브랜드) 외 사용자 노출 텍스트 한글 | 10건 한글 카피 SSR hit ✅ |

**판정**: PASS ✅

### AC-12 — build / typecheck / lint

§1.1 참조 — 0 error 3건. **판정**: PASS ✅

### AC-13 — 라운드트립 5건 × 두 뷰포트

**BE LIVE 상태에서 BFF 경유 응답을 직접 검증 (curl) + DOM/카피 정적 검증.**

| 시나리오 | 입력 | 기대 | 실측 (실 응답 발췌) |
|---|---|---|---|
| (a) AAPL 정상 | ticker=AAPL, capital=1,000,000, target=5%, period=30일, maxLoss=2% | 200 + 6블록 응답 + action/brief/feasibility/horizons/risk_plan/warnings 모두 존재 | `200 OK` + `analysis.action="HOLD"`, `brief.score=76`, `feasibility="UNREALISTIC"`(annualized 81% 산출), 6 horizons, risk_plan.entry_price=302.01, warnings=[] ✅ |
| (b) BTC-USD 자본 0 | ticker=BTC-USD, capital=0 | 사전 차단 → 분석 버튼 비활성 / BE 도 `capital_amount > 0` 가드 | 클라이언트 `useAnalyzeForm.validateAnalyzePayload` 가 빈/0 입력을 차단(코드 검증). 강제 호출 시 BE 422 `{"detail":[{"type":"greater_than","loc":["body","capital_amount"],"msg":"Input should be greater than 0","input":0}]}` ✅ |
| (c) 비현실 | AAPL, target=300%, period=1일, maxLoss=1% | `feasibility="UNREALISTIC"` + annualized_target_return_pct ≫ | `analysis.feasibility="UNREALISTIC"`, `annualized_target_return_pct=5.65e+221`. ResultGroup 의 `isUnrealistic` 분기 활성, RiskPlanCard 가 unrealistic flag 받음 ✅ |
| (d) 화이트리스트 외 (NVDA) | ticker=NVDA | BE 가 한글 detail 반환 | `{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}` ✅ |
| (e) BE down 5xx fallback | 별도 dev 인스턴스 (port=3101, FASTAPI_BASE_URL=http://127.0.0.1:65535) | BFF route handler 가 502 + 한글 fallback | analyze: `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` / whitelist: 동일 ✅ |

**두 뷰포트 (모바일 375 / 데스크탑 1280) 검증 — 정적 분기 검증**:

| 위치 | 모바일 (`< lg`) | 데스크탑 (`lg+`) | 검증 결과 |
|---|---|---|---|
| Sidebar (`.sidebar`) | `hidden` | `lg:flex` | components.css 의 합성 토큰 정의 일치 ✅ |
| Navbar hamburger | 노출 (`lg:hidden`) | hidden | Navbar.tsx 45 ✅ |
| 입력 영역 grid (`SearchPanel + InputPanel`) | 1-col (`grid-cols-1`) | `lg:grid-cols-2` | page.tsx 175 ✅ |
| Feasibility + Horizons | 1-col | `lg:grid-cols-2` | ResultGroup.tsx 72 ✅ |
| 메인 영역 패딩 | `p-lg` | `lg:p-2xl` | components.css `.main-area` ✅ |

**판정**: PASS ✅ (시각 픽셀 검증은 본 세션 범위 밖.)

### AC-14 — 반응형 무회귀

| 재현 | 기대 | 실측 |
|---|---|---|
| dev 로그 hydration 경고 | 0건 | `/tmp/dev.log` 에 `hydration` 키워드 0 hit ✅ |
| 모바일 → 데스크탑 자동 drawer 닫기 | `useBreakpoint().isDesktop` effect | layout.tsx 76~80 ✅ |
| `useBreakpoint` SSR-safe 패턴 | `hooks/utils/useBreakpoint.ts` 무변경 (PR #17 검증됨) | PR diff stat 에 미등장 ✅ |

**판정**: PASS ✅

### AC-15 — 컴포넌트 폴더 표준

| 재현 | 기대 | 실측 |
|---|---|---|
| `components/layout/` | 신설, Navbar/Sidebar/Drawer 포함 | 7개 (Navbar/Sidebar/MobileDrawer/SidebarContent/SidebarItem/FavoriteToggle/workbenchEvents) ✅ |
| `components/workbench/*` 12개 | 위치·prop 시그니처 무변경 (ResultGroup 의 자식 grid 클래스는 예외) | PR diff: ResultGroup.tsx 만 변경 (116 lines, 자식 grid 재배치). 나머지 11개 0 byte 변경 ✅ |

**판정**: PASS ✅

### AC-16 — 기본 접근성

| 재현 | 기대 | 실측 |
|---|---|---|
| Navbar hamburger ARIA | `aria-label` + `aria-expanded` + `aria-controls` | 3건 모두 존재 ✅ |
| MobileDrawer ARIA | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | 3건 모두 존재 ✅ |
| ESC 키 닫기 | drawer 열려있을 때 ESC → close | useEffect 53~58 ✅ |
| FavoriteToggle ARIA | `aria-pressed` + 동적 `aria-label` | 33~37 ✅ |
| SidebarItem ARIA | active 시 `aria-current="page"`, keyboard Enter/Space | 39~50 ✅ |
| Tab 순서 | navbar → sidebar → main → footer | DOM 순서 일치 (layout.tsx 의 children 순서) ✅ |
| 색 강조 + 텍스트 라벨 병행 | unrealistic·warn 등 텍스트 라벨도 노출 | 기존 ResultGroup 자식 (WarningsCard 등) 무수정 → PR #11 AC-15 무회귀 ✅ |

**판정**: PASS ✅

## 3. DESIGN.md 토큰 라이브 동기화 검증

**시나리오**: v4 DESIGN.md 의 `navbar-h: 60px` → `64px` 로 임시 변경 → `npm run design:sync` → `tailwind.theme.json` 자동 반영 확인 → `npm run build` 0 error → 원복 → 결정적 무회귀.

```
$ cp tailwind.theme.json /tmp/theme.before.json
$ cp docs/design/layout-redesign.md /tmp/design.before.md

# 토큰 변경
$ sed: docs/design/layout-redesign.md line 90 "navbar-h: 60px" → "navbar-h: 64px"

$ npm run design:sync
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).

$ grep navbar-h tailwind.theme.json
"navbar-h": "64px",     # ✅ 변경 반영

$ npm run build
✓ Compiled successfully in ~700ms     # ✅ 신규 토큰값으로 빌드 통과

# 원복
$ cp /tmp/design.before.md docs/design/layout-redesign.md
$ npm run design:sync
$ diff -q /tmp/theme.before.json tailwind.theme.json
(0 byte 차)     # ✅ 결정적 복원

$ git diff --stat tailwind.theme.json docs/design/layout-redesign.md
(empty)         # ✅ 워킹트리 무회귀
```

**판정**: PASS ✅ — DESIGN.md → design:sync → tailwind.theme.json → 빌드 → 화면 토큰 반영의 단방향 파이프라인 결정적 동작 + 무회귀 복원 보장.

## 4. 에지 케이스

| 케이스 | 재현 | 기대 | 실측 |
|---|---|---|---|
| BE 다운 (analyze) | dev port 3101 + `FASTAPI_BASE_URL=http://127.0.0.1:65535` 로 POST | 502 + 한글 `엔진 통신에 실패했어요` | `502` + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` ✅ |
| BE 다운 (whitelist) | 상동 GET | 상동 | 동일 ✅ |
| 빈 본문 (analyze) | `curl -d ''` | 400 + `요청 본문을 해석할 수 없어요` | 동일 ✅ |
| malformed JSON (analyze) | `curl -d 'not valid json'` | 400 + 동일 메시지 | 동일 ✅ |
| NaN 입력 (analyze) | `capital_amount: "NaN"` 문자열 | BE 422 + `greater_than` validation | `{"detail":[{"type":"greater_than", ... "input":"NaN"}]}` ✅ |
| hydration mismatch | dev 서버 SSR 로그 | 0 경고 | dev.log 에 hydration 키워드 0 hit ✅ |
| drawer 자동 닫기 (모바일→데스크탑) | `useBreakpoint().isDesktop && isDrawerOpen` effect | drawer 닫힘 | layout.tsx 76~80 검증 (코드 레벨) ✅ |
| drawer focus trap | Tab / Shift+Tab 순환 + 첫 focus 자동 + 닫힘 시 이전 focus 복귀 | 모두 동작 | MobileDrawer.tsx 53~93 모두 구현 ✅ |
| 사이드바 빈 상태 | 새로고침 직후 (in-session 초기화) | 한글 안내 + "새로고침 시 초기화돼요" | SSR HTML 에 노출 ✅ |
| 즐겨찾기 토글 두 진입점 | ticker-header + 사이드바 히스토리 항목 | 동일 FavoriteToggle 컴포넌트 재사용, aria-pressed 정상 | page.tsx 167 + SidebarItem.tsx 58 두 진입점 ✅ |
| 히스토리 LRU 5 | 6번째 push 시 가장 오래된 제거 + 동일 ticker re-push 시 promote | LRU 정책 | useWorkbenchSession.tsx 63~70 (`slice(0, HISTORY_LIMIT=5)` + 동일 ticker 필터) ✅ |
| SearchPanel 에 별표 두지 않음 | 정책: 탐색 vs 관심 표명 분리 | SearchPanel 에 FavoriteToggle 미사용 | components/workbench/SearchPanel.tsx 무수정 (PR diff 0) ✅ |

## 5. 무회귀 가드

| 가드 | 결과 |
|---|---|
| BFF 원칙 (`fetch(` from components/hooks/lib/api/workbench) | 0 hit ✅ |
| `http://127.0.0.1` from app/ | 2 hit (route handler 안 fallback, AC-10 명시적 예외) ✅ |
| `lib/types/workbench/*` 무변경 | PR diff 미등장 ✅ |
| `lib/api/workbench/*` 무변경 | PR diff 미등장 ✅ |
| `hooks/query/*` 무변경 | PR diff 미등장 ✅ |
| `lib/copy/workbench/actionLabels.ts`, `errorMessages.ts` 무변경 | PR diff 미등장 (`layoutCopy.ts` 추가만) ✅ |
| `components/workbench/*` 12 컴포넌트 중 ResultGroup 외 무변경 | ResultGroup 만 변경 (자식 grid 재배치) ✅ |
| v3 13 colors + 21 composite 무회귀 | 13/13 hex 동일, 21 composite 합성 토큰 무수정 ✅ |
| 한글 톤 무회귀 | 기존 카피 무수정, 신설 카피 모두 한글 ✅ |
| 접근성 무회귀 | aria-label/expanded/controls/pressed/current 모두 갖춤 ✅ |

## 6. 판정

**16/16 AC 통과 + 에지 케이스 11/11 통과 + 무회귀 가드 10/10 통과.**

- 자동화 검증 (typecheck/lint/build/grep) 0 error.
- BE LIVE 라운드트립 (a)/(b)/(c)/(d) 4건 모두 BFF 경유 정상 통과.
- BE down 5xx fallback (e) — 별도 dev 인스턴스로 검증, 한글 fallback 메시지 정확 노출.
- DESIGN.md → design:sync → tailwind.theme.json 라이브 동기화 라운드트립 결정적 무회귀.
- 두 뷰포트는 본 세션 한계로 시각 픽셀 검증 대신 정적 분기 검증으로 대체 — 모든 Tailwind `lg:` 분기와 `useBreakpoint` 의존 로직 정합 확인.

**판정**: `qa-passed` ✅
