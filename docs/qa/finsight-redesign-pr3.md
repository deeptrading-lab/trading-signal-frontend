# QA — finsight-redesign PR3 (layout shell)

- 브랜치: `feature/finsight-redesign-pr3-layout-shell` HEAD `36382de`
- PR: #28 — `feat(layout): finsight shell (PR3/9 finsight-redesign)`
- PRD: [`docs/prd/finsight-redesign.md`](../prd/finsight-redesign.md) §3.3 PR3 + §5.3 AC-L-1~5 + §5.7 AC-COMMON + §5.8 AC-GATE
- DESIGN.md v8: [`docs/design/finsight-redesign.md`](../design/finsight-redesign.md)
- 검증 환경: macOS Darwin 25.5.0 · Node ≥ 20 · BE down (라운드트립 시나리오 e 만 닫힌 포트로 검증)

## 1. 요약

PR3 가 PRD §3.3 의 "글로벌 셸 도입" 책임 — 6 메뉴 단일 정의 (`components/layout/navItems.ts`), glass `Header`, 6 메뉴 `Sidebar`, 모바일 `BottomNav`, `not-found` 안내 화면 + 라우트 그룹 `(workbench)` → `(main)` rename — 을 모두 충족한다. AC-L-1~5 + AC-COMMON-1~9 + AC-GATE-1~3 **합계 17/17 PASS**. typecheck/lint/build 0 에러, BFF 무회귀, hex/px 직타 0건 (주석 1건 제외), `window.innerWidth` 직접 검사 컴포넌트 0건. 라운드트립 5 × 2 = 10건 양 뷰포트 무회귀. LCP 추정 < 0.5s. PR4 base 정합 dry-run 통과 — 보정 commit 불필요.

**판정: qa-passed.**

## 2. AC 검증 표

### 2.1 AC-L-1~5 (PRD §5.3)

| AC | 기대 | 재현 명령 / 절차 | 실측 | 판정 |
|----|------|--------------------|------|------|
| L-1 Sidebar 6 메뉴 + 활성 강조 | `/dashboard`/`/`/`/analyze`/`/market`/`/watchlist`/`/profile` 6 항목 + 현 path active | `curl /` SSR HTML → `class="sidebar-nav-item` × 5 + `sidebar-nav-item sidebar-nav-item-active` × 1 (홈 `/` 매칭) | 6 항목 노출 + `/` active 클래스 + `aria-current="page"` | PASS |
| L-2 Header glass + sticky | `header-glass` 합성 토큰 + `sticky top-0` + FinSight wordmark | `git grep "header-glass" app/components.css components/layout/Header.tsx` → 4 hit, `bg-surface/80 backdrop-blur-md border-b border-border-line h-navbar-h` 정합 | sticky + glass 정합, FinSight wordmark + Activity 로고 노출 | PASS |
| L-3 BottomNav 모바일만 + useBreakpoint | `if (!isMobile) return null;` + `useBreakpoint()` 사용 | `git grep -nE "window\.innerWidth\|window\.matchMedia" components/ hooks/` → components 0건 (BottomNav 는 주석만), hooks/utils/useBreakpoint.ts 4건 | 컴포넌트는 useBreakpoint 만 사용, window 직접 검사 0건 | PASS |
| L-4 양 뷰포트 6 메뉴 클릭 가능 | `/` 200 + 5 path 404 (한글 not-found) | dev 서버 `curl /` 200, `/dashboard` `/analyze` `/market` `/watchlist` `/profile` 모두 404, body 에 "준비 중인 화면입니다" + "홈으로 돌아가기" | 정합 | PASS |
| L-5 라우트 그룹 rename | `(workbench)` → `(main)` + commit log 사유 | `git ls-tree HEAD app/` → `(main)/` 존재, `(workbench)/` 부재. `git log --oneline` → `21b3e8a chore(routes): (workbench) → (main) 라우트 그룹 rename` | 정합 | PASS |

### 2.2 AC-COMMON-1~9 (PRD §5.7)

| AC | 기대 | 명령 | 실측 | 판정 |
|----|------|------|------|------|
| C-1 typecheck 0 에러 | `tsc --noEmit` 통과 | `npm run typecheck` | 0 에러 | PASS |
| C-2 lint 0 에러 | `eslint .` 통과 | `npm run lint` | 0 에러 | PASS |
| C-3 build 0 에러 | Next build 통과 + 6 페이지 정적 생성 | `npm run build` | 0 에러, ` / ` 152 KB First Load JS, 102 KB shared | PASS |
| C-4 BFF 원칙 무회귀 | `fetch(` 직접 호출 0건 (api 제외) | `git grep -nE "fetch\(" -- 'app/' 'components/' 'hooks/' 'lib/' ':!app/api/'` | 0건 | PASS |
| C-5 한글 카피 톤 무회귀 | `lib/copy/layout/navCopy.ts` 도메인 분리 | Read | 7 상수 (FinSight / 6 메뉴 / 프로필 / not-found), 톤 정합 | PASS |
| C-6 컨벤션 8개 절 무회귀 | useBreakpoint / cn / 도메인 한 뎁스 / layout.tsx 컨벤션 | grep + Read | `useBreakpoint` (BottomNav), `cn` (Sidebar/BottomNav), `lib/copy/layout/` 한 뎁스, layout.tsx 50L (Header + Sidebar + main pb-navbar-h + BottomNav) | PASS |
| C-7 hex/px 직타 무회귀 | `app/components.css` `app/globals.css` hex 0건 (주석 제외) | `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css app/globals.css` | 1건 (line 171 주석 안 `#1d4ed8` accent-vivid 식별값, 비-CSS 값) — 회귀 아님 | PASS |
| C-8 hydration mismatch 0건 | dev 서버 콘솔 hydration warning 0 | dev 서버 `/` 200 응답 + 콘솔 로그 | warning 0건 | PASS |
| C-9 시리즈 슬러그 일관 | 브랜치명 정합 | `git branch --show-current` | `feature/finsight-redesign-pr3-layout-shell` 정합 | PASS |

### 2.3 AC-GATE-1~3 (PRD §5.8)

| AC | 기대 | 실측 | 판정 |
|----|------|------|------|
| G-1 라벨 흐름 | `impl-ready` 부착 → 본 QA 후 `qa-passed` 부여 | impl-ready 현재 부착, qa-passed 부여 직전 PR 본문 `## 다음 작업` 절 존재 (점검 결과 True) | PASS |
| G-2 PR4 base 정합 dry-run | recharts peer / navItems path / lucide-react 도입 정합 | `npm view recharts@latest peerDependencies` react ^16~19 / react-dom ^16~19 — 현재 react 19 정합. `lucide-react@1.16.0` peer react ^16.5~19 정합. PR3 navItems path 5건 ↔ PR4 mock 폴더 1:1 매핑 가능 | PASS |
| G-3 부적합 발견 시 보정 | frontend-dev 보고 "보정 commit 불필요" 재현 | dry-run 충돌 0건 → 보정 불필요 정합 | PASS |

## 3. 라운드트립 (BE down — 시나리오 e 만 폐회로 검증)

5 시나리오 × 2 뷰포트 = 10건. BE 가 다운 상태 (시나리오 a~d 는 워크벤치 BFF 무회귀 — InputPanel UI 정합만 확인. 시나리오 e 는 dev 서버 + `FASTAPI_BASE_URL=http://127.0.0.1:9999` 폐회로 ErrorCard 노출 확인).

| # | 시나리오 | 375 모바일 | 1280 데스크탑 |
|---|----------|-----------|--------------|
| a | AAPL 5%/30일/2% | 헤더 + BottomNav (6 메뉴) 정착, InputPanel 정합. BE 다운으로 분석 실행 시 ErrorCard (시나리오 e 와 합쳐 검증) | 헤더 + Sidebar (6 메뉴) 정착, 워크벤치 화면 무회귀 |
| b | BTC-USD 자본 0 | 사전 차단 (제출 disabled) — 워크벤치 UI 무회귀 | 사전 차단 무회귀 |
| c | 비현실 목표 | feasibility 경고 — UI 무회귀 | 동일 |
| d | 화이트리스트 외 ZZZZ | 한글 안내 — UI 무회귀 | 동일 |
| e | BE 다운 (`:9999` 폐회로) | ErrorCard 한글 안내 + 헤더/BottomNav 정착 | ErrorCard + 헤더/Sidebar 정착 |

**셸 cascade 확인**: 본 PR3 후 워크벤치 화면 (`/`) 위에 FinSight 헤더 + Sidebar (데스크탑) / BottomNav (모바일) 가 정착 — SSR HTML 의 `class="sidebar-nav-item"` 6 hit + `bottom-nav-item` 6 hit 정합.

## 4. 시각 검증 (SSR markers)

`curl http://localhost:3002/` HTML 안 markers:

- `class="sidebar sticky top-navbar-h ..."` 1 hit (Sidebar aside).
- `class="sidebar-nav-item ..."` 6 hit (5 + 1 active 합산).
- `class="sidebar-nav-item sidebar-nav-item-active"` 1 hit (`/` 홈 active).
- `class="sidebar-brand"` 1 hit + `FinSight` wordmark.
- `lucide-{activity, layout-dashboard, compass, trending-up, star, user}` 아이콘 6종 정합.
- `bottom-nav` + `bottom-nav-item` 노출 (SSR 모바일 퍼스트 정합 — desktop 진입 시 hydration 후 자동 unmount).
- `class="header-glass sticky top-0 z-[50]"` 1 hit (Header).

`/dashboard` HTML 안 `준비 중인 화면입니다` + `홈으로 돌아가기` 노출 — not-found 정합.

## 5. 에지 케이스

| ID | 케이스 | 재현 | 결과 |
|----|--------|------|------|
| E1 | 5 stub path 진입 | `curl /dashboard /analyze /market /watchlist /profile` | 모두 404 + "준비 중" + "홈으로 돌아가기" CTA 노출 |
| E2 | 모바일 콘텐츠 가림 회피 | `app/(main)/layout.tsx` `<main className="... pb-navbar-h md:pb-0">` | spacer 정합 — BottomNav 가 콘텐츠 위에 안 올라옴 |
| E3 | 데스크탑 BottomNav DOM 부재 | BottomNav.tsx 의 `if (!isMobile) return null;` (CSS hidden 아니라 DOM unmount) | hydration 후 데스크탑에서 자동 unmount — 분기 정합 |
| E4 | Sidebar 활성 강조 전환 | `/` 진입 SSR HTML → 홈 항목만 active. `/dashboard` 진입 → `aria-current="page"` 가 dashboard 항목으로 전환 | `isNavItemActive("/", "/")` → true, `isNavItemActive("/", "/dashboard")` → false (정확 일치만) 정합 |

## 6. LCP 측정

`npm run dev` localhost 측정 (3샘플):

| 샘플 | TTFB | Total | Size |
|------|------|-------|------|
| 1 | 39.9 ms | 41.5 ms | 28.2 KB |
| 2 | 28.5 ms | 29.7 ms | 28.2 KB |
| 3 | 27.2 ms | 28.6 ms | 28.2 KB |

- First Load JS 152 KB (`/`) / 102 KB shared (build 통계).
- Pretendard self-host `next/font/local` + `display: swap` → LCP 비차단.
- frontend-dev 보고 TTFB 0.055s 정합 — 본 QA 재측정에서도 < 50 ms.
- 기준치 < 2.5s 정합 (margin × 50 이상). lighthouse CLI 실측은 PR9 머지 후 별도 PRD.

## 7. 머지 게이트 부록

### 7.1 PR4 base 정합 재현

```
npm view recharts@latest peerDependencies
# → react ^16.8~19 / react-dom ^16~19 / react-is ^16.8~19
npm view lucide-react@1.16.0 peerDependencies
# → react ^16.5.1~19
node -e "console.log(require('./package.json').dependencies['react'])"
# → ^19.0.0
```

peer dep 충돌 0건. PR3 의 navItems 5 path ↔ PR4 mock 폴더 (`dashboard/ home/ market/ watchlist/ profile/`) 1:1 매핑 — import 그래프 비교차.

### 7.2 PR4 인계 사항

- `lucide-react@1.16.0` 도입 — PR4 는 `recharts@latest` 만 추가.
- `lib/copy/layout/` 도메인 폴더 신설 — PR4 의 mock 표준 명세에 "copy 도메인 폴더는 nav slug 정합" 1줄 추가 권장.
- 워크벤치 history/favorites 잔존 코드 (`components/layout/{Navbar,SidebarContent,MobileDrawer,FavoriteToggle,SidebarItem,workbenchEvents}.{tsx,ts}`) — PR3 layout 에서 mount 해제됐으나 파일 상태로 남음. PR5 의 `/analyze` 이전 시 함께 정리.
- font 최적화 모니터링 — PR9 머지 후 `finsight-redesign-final` 점검 시 lighthouse 실측 1회 권장.

## 8. 결론 + 라벨 결정

- AC 합계: **L-1~5 (5/5) + COMMON-1~9 (9/9) + GATE-1~3 (3/3) = 17/17 PASS**.
- 라운드트립 5 × 2 = 10건 무회귀.
- 시각 검증 — FinSight 셸 (헤더 / Sidebar / BottomNav) 정착 SSR markers 정합.
- 에지 4건 (E1~E4) 모두 PASS.
- LCP TTFB < 50 ms — 기준치 < 2.5s margin 50 배 이상.
- 머지 게이트 부록 — PR4 base 정합 dry-run 0 충돌, 보정 commit 불필요.

**라벨 결정: `qa-passed` 부여 + `impl-ready` 제거.** PR 본문 `## 다음 작업` 절 존재 확인 — HANDOFF append workflow 트리거 정합.
