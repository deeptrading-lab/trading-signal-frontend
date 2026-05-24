# QA 리포트 — finsight-redesign PR9 (시리즈 종료)

- 대상 PR: [#36](https://github.com/deeptrading-lab/trading-signal-frontend/pull/36) `feat(watchlist, profile): 관심종목 + 마이페이지 (PR9/9 finsight-redesign)` (HEAD `213ee3c`).
- 시리즈 종료 PR (9 of 9). 본 PR9 머지 후 PRD §3.8.2 "시리즈 종료 후 PRD 기반 최종 점검" 단계 진입 — `docs/qa/finsight-redesign-final.md` 별도 작성 예정.
- PRD: `docs/prd/finsight-redesign.md` §3.3 PR9 + §5.6 AC-PAGE-1~8 + §5.7 AC-COMMON-1~9 + §5.8 AC-GATE-1~3.
- DESIGN.md: `docs/design/finsight-redesign.md` v8 (badge-asset-stock/coin · badge-signal-up/down · card-hero · button-primary · gradient-ai-from/to · text-critical · bg-critical-soft · Pretendard cascade).
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 dev `localhost:3000` (백그라운드 PID, QA 종료 시 정리) / build · FastAPI BE 다운 (mock-only 화면이므로 무영향, BFF 무회귀는 502 graceful 으로 검증).

## 1. 요약

신설 9 파일 / 589L. Watchlist 도메인 4 파일 (215L), Profile 도메인 5 파일 (374L) — PRD §9 q7 RESOLVED 의 600L 분할 게이트 통과. 모두 server-safe 정적 컴포넌트 (`use client` 0 / `useState` 0 / `fetch`·`axios` 0). typecheck/lint/build 0 에러. `/watchlist`, `/profile` 정적 prerender (○). 시리즈 9 PR 완료 — 6 메뉴 라우트 (`/`, `/dashboard`, `/analyze`, `/market`, `/watchlist`, `/profile`) 모두 정착. catch-all (`(main)/[...not_found]`) 보다 구체적 라우트 우선 매칭 정상 (catch-all 자연 무력화 — 6 라우트 모두 200, `/foo` `/bar` `/dashboard/extra` `/profile/extra` 404). SSR HTML 안 Watchlist 한글 라벨 (관심종목 + 그룹 추가 + 종목/심볼/현재가/등락률/관리 헤더 + 6 종목명) + Profile 한글 라벨 (마이페이지 + 김투자 + PRO 멤버 + 공격투자형 + 거래소 3건 + 설정 4 + 로그아웃) 모두 노출. 사이드바 + BottomNav 양쪽에서 `/watchlist`·`/profile` 항목 `aria-current="page"` 정상 부여. `/`, `/dashboard`, `/analyze`, `/market` 무회귀. BFF 무회귀 (`/api/workbench/analyze` + `/api/whitelist/search` 모두 BE 다운 시 502 + 한글 fallback 정상).

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **PAGE-1** 진입·정상 렌더 | `curl /watchlist` + `curl /profile` + SSR grep | 200 + 한글 라벨 + 6 관심종목 + 3 거래소 + 4 설정 메뉴 | `HTTP=200` 둘 다. Watchlist `관심종목 ×2` + `그룹 추가 ×2` + 삼성전자/비트코인 등 6 종목. Profile `마이페이지 ×4` + `PRO 멤버 ×2` + 키움증권/업비트/토스증권 + 알림/보안/구독/테마/로그아웃 5건 | pass |
| **PAGE-2** Watchlist 자산 type 칩 | `grep -oE 'badge-asset-(stock\|coin)'` | stock/coin 칩 cascade | `class="hidden sm:inline-flex badge-asset-stock" ×3` + `badge-asset-coin ×3` SSR (mock = 3 stock + 3 crypto) | pass |
| **PAGE-3** Watchlist 등락 칩 | `grep -oE 'badge-signal-(up\|down)'` | 한국식 (상승 빨강 / 하락 파랑) | `class="tabular-nums badge-signal-up" ×3` + `badge-signal-down ×3` SSR (mock isUp = 3 true + 3 false) | pass |
| **PAGE-4** AI 그라데이션 | N/A | 본 화면 AI 영역 없음 (Profile hero 의 avatar 그라데이션은 정보 가시화) | N/A — `/`(PR6) AiAnalysisCard 가 담당. Profile hero avatar 는 `bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to` 단일 cascade (1 hit) — 데모 단계 식별만 | n/a |
| **PAGE-5** Pretendard 일관 | `text-h1` / `text-h2` / `text-body-strong` / `text-body-sm-strong` / `text-caption` cascade | 토큰 cascade | Watchlist 페이지 타이틀 = `text-h1`, 헤더 라벨 = `text-caption text-text-muted`, 종목명 = `text-body-strong`, 현재가 = `text-body-strong tabular-nums`. Profile 페이지 타이틀 + 사용자명 = `text-h1`, 섹션 헤더 = `text-h2`, email = `text-body-md text-text-muted` | pass |
| **PAGE-6** 차트·번들 | `npm run build` | recharts chunk +0 | `✓ Compiled successfully in 1894ms`. `/watchlist`, `/profile` 모두 ○ static. recharts 미사용 (테이블 + 카드 정적 마크업 만) | pass |
| **PAGE-7** 모바일 (375) — 정보 밀도 절약 | `hidden sm:inline-flex` (asset chip) / `hidden md:flex` (관리 버튼) / `flex-col` (Profile hero) | 자산 type 칩 sm 미만 숨김 + 관리 버튼 md 미만 숨김 + ProfileCard 1-col stacking | Watchlist `class="hidden sm:inline-flex badge-asset-stock"` SSR 매칭 ×3 + `class="hidden md:flex col-span-2 justify-end"` ×3. Profile `card-hero flex flex-col items-center gap-lg md:flex-row md:items-center md:gap-2xl` (default = column / md+ = row) | pass |
| **PAGE-8** 데스크탑 (1280) | `grid-cols-12` (Watchlist) + `md:grid-cols-2` (Profile 셸) | 12-col grid + Profile 2-col | Watchlist `grid-cols-12 ×14` (헤더 1 + row 6 + 등 — Next layout overhead 포함). Profile 셸 `grid-cols-1 gap-lg md:grid-cols-2` ×1 (ConnectedExchangesCard + SettingsMenuCard 좌우 분리) | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | `tsc --noEmit` 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | `eslint .` 종료 0 | pass |
| **COMMON-3** build | `npm run build` | 0 에러 + static | `✓ Compiled successfully in 1894ms`, ○ `/watchlist` + ○ `/profile` 정적 prerender, 6 메뉴 라우트 + catch-all + BFF 모두 무회귀 | pass |
| **COMMON-4** BFF | `git grep -nE "http://127\\.0\\.0\\.1" -- app/ components/ lib/` (route handler 제외) | 0 hit | route handler fallback 3 hit (`app/api/whitelist/search/route.ts:11` + `app/api/workbench/_adapters/fastapi.ts:7,32`) 만 — 모두 env default 패턴, 컴포넌트·페이지 hit 0건. `/api/workbench/analyze` (BE down) → 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` graceful | pass |
| **COMMON-5** 한글 카피 톤 | `lib/copy/watchlist/labels.ts` + `lib/copy/profile/{labels,buttons}.ts` 활용 | 인라인 한글 외부 모듈 import | Watchlist 라벨 6 상수 (`WATCHLIST_PAGE_TITLE`, `WATCHLIST_ADD_GROUP`, `WATCHLIST_TABLE_NAME/PRICE/CHANGE/ACTIONS`, `ASSET_TYPE_STOCK/CRYPTO`) — 모두 외부 import. Profile 라벨 20+ 상수 (`PROFILE_PAGE_TITLE`, `MEMBERSHIP_*`, `INVESTOR_TYPE_*`, `MENU_*`, `EXCHANGE_STATUS_*`, `SYNC_*`, `CONNECTED_SECTION_TITLE`, `PROFILE_EDIT_BUTTON`) — 모두 외부 import. **예외 2건**: `aria-label="관리"` (WatchlistRow:65) + `aria-label="설정 메뉴"` (SettingsMenuCard:57) — PR6 의 인라인 aria 패턴 (`HomeDashboard:110 aria-label="차트 옵션"`, `TimeframeChips:36`, `SearchToggle:36`) 정합, 일관 컨벤션 | pass |
| **COMMON-6** 컨벤션 8 절 | `components/watchlist/` + `components/profile/` 직속 + barrel 0 + PascalCase | 한 뎁스 / `cn()` 활용 | 9 파일 모두 도메인 직속 PascalCase (`WatchlistPage/Table/Row.tsx` + `ProfilePage/ProfileCard/ConnectedExchangesCard/SettingsMenuCard.tsx`), barrel `index.ts` 0, `cn()` 활용 (WatchlistRow + ConnectedExchangesCard + SettingsMenuCard 의 cond. class 합성) | pass |
| **COMMON-7** hex/px 직타 | `git grep -nE "#[0-9a-fA-F]{3,8}\\b\|\\b[0-9]+px\\b"` 9 파일 | 0 hit | 0 hit. 색·간격·라운드·폰트 모두 v8 토큰 이름만 (`text-warn fill-warn`, `badge-asset-*`, `badge-signal-*`, `card-hero`, `card`, `bg-accent-vivid`, `from-gradient-ai-from to-gradient-ai-to`, `text-critical`, `bg-critical-soft`, `border-border-line`, `divide-border-line`, `bg-surface-muted`, `text-text-strong/muted`, `gap-sm/md/lg/2xl`, `p-md`, `h-2xl/xl/24`, `rounded-md/lg/pill/sm`) | pass |
| **COMMON-8** hydration | dev `/watchlist` + `/profile` 진입 | mismatch 0 | server component 만 (`use client` 0 / `useState` 0) → 본질적 mismatch 불가. dev 로그 클린 (warn/error 0, 모든 GET 200/404/502 적절) | pass |
| **COMMON-9** 슬러그 | `finsight-redesign-pr9-watchlist-profile` 일관 | PRD / 브랜치 / 리포트 동일 | 브랜치 `feature/finsight-redesign-pr9-watchlist-profile`, 리포트 `docs/qa/finsight-redesign-pr9.md`, PRD §3.3 PR9 일관 | pass |
| **GATE-1** 라벨 흐름 | impl-ready → qa-passed | 본 리포트 commit 후 라벨 갱신 | 본 리포트 commit + push 후 `qa-passed` 라벨 부여 (이전 `impl-ready` 제거). PR 본문 `## 다음 작업` 절 존재 확인 (`gh pr view 36 -q '.body | contains("## 다음 작업")' → true`) | pass |
| **GATE-2** 후속 시리즈 종료 점검 인계 | 부록 §7 참조 | 시리즈 종료 cleanup PR 인계 5건 명시 | PR9 가 시리즈 마지막 — 다음 base 정합 검증은 없음. 대신 cleanup PR 인계 5건 PR 본문 명시 (HANDOFF 백필 + NOT_FOUND_HOME_CTA + 시안 폴더 + catch-all 검토 + bundle-analyzer 도입) | pass |
| **GATE-3** 보정 commit | 부적합 0 | 보정 commit 0 | 본 QA 사이클 부적합 없음 — 보정 commit 0 | pass |

## 3. 라운드트립 (양 뷰포트 마크업)

PR9 mock-only — BE 호출 0건 (CMD `curl http://127.0.0.1:8000/health -m 2` → HTTP 000 = BE down 확인. 화면은 mock 의존 → 무영향). PR #11 정의 BE 5건은 `/analyze` (PR5) 범위.

| # | 시나리오 | 응답 | 판정 |
| --- | --- | --- | --- |
| 1 | `/watchlist` 진입 (WatchlistPage mock) | `HTTP=200`, SSR 본문 "관심종목" + "그룹 추가" + 6 종목 + 3 stock chip + 3 coin chip + 3 signal-up + 3 signal-down + divide-border-line ×2 + grid-cols-12 ×14 + Star `text-warn fill-warn` | pass |
| 2 | `/profile` 진입 (ProfilePage mock) | `HTTP=200`, SSR 본문 "마이페이지" + "김투자" + "PRO 멤버십" + "공격투자형" + 거래소 3건 (키움증권/업비트/토스증권) + 설정 4 (알림/보안/구독/테마) + 로그아웃 + card-hero ×1 + badge-accent + badge-info + bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to + text-critical ×3 + bg-critical-soft ×1 | pass |
| 3 | `/` (PR6 Home) 무회귀 | `HTTP=200` | pass |
| 4 | `/dashboard` (PR7) 무회귀 | `HTTP=200` | pass |
| 5 | `/analyze` (PR5) 무회귀 | `HTTP=200` | pass |
| 6 | `/market` (PR8) 무회귀 | `HTTP=200` | pass |
| 7 | catch-all (`/foo`, `/bar`, `/dashboard/extra`, `/profile/extra`) | `HTTP=404` ×4 (`(main)/[...not_found]` fallback) | pass |
| 8 | `/api/workbench/analyze` (POST AAPL) BFF 무회귀 (BE down 시뮬) | `HTTP=502` + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` (BE 다운 시 한글 fallback 정상) | pass |
| 9 | `/api/whitelist/search?q=AAPL` BFF 무회귀 | `HTTP=502` + 동일 한글 graceful | pass |

양 뷰포트 (375 / 1280): SSR 마크업 동일 (Tailwind `sm:` / `md:` cascade 단일 본문). 모바일 = Watchlist asset 칩·관리 버튼 숨김 + ProfileCard hero 세로 1-col stacking + Connected/Settings 카드 1-col stacking. 데스크탑 = Watchlist 12-col grid 모든 칸 노출 + Profile hero 좌우 (avatar 좌 + 정보 중앙 + 버튼 우) + Connected/Settings 좌우 2-col.

## 4. v8 토큰 활용 검증

| 토큰 | 출현 | 적용 위치 |
| --- | --- | --- |
| `card-hero` 합성 토큰 | 1 hit | ProfileCard hero `<section class="card-hero">` |
| `card` 합성 토큰 | 2 hit | ConnectedExchangesCard + SettingsMenuCard `<section class="card">` |
| `button-primary` 합성 토큰 | 2 hit | WatchlistPage "+ 그룹 추가" + ProfileCard "프로필 수정" |
| `button-icon` | 1 hit | WatchlistRow 관리 버튼 (MoreVertical) |
| `badge-asset-stock` / `badge-asset-coin` | 3 hit + 3 hit | WatchlistRow (mock 3+3) |
| `badge-signal-up` / `badge-signal-down` | 3 hit + 3 hit | WatchlistRow (mock 3+3) |
| `badge-accent` / `badge-info` | 1 hit + 1 hit | ProfileCard 멤버십·투자성향 칩 |
| `text-warn fill-warn` | 1 hit | WatchlistPage Star 아이콘 (시안 yellow-500 cascade) |
| `text-critical` / `bg-critical-soft` | 3 hit / 1 hit | SettingsMenuCard 로그아웃 danger variant |
| `from-gradient-ai-from to-gradient-ai-to` | 1 hit | ProfileCard hero avatar 그라데이션 |
| `text-accent-vivid` | 1 hit | ConnectedExchangesCard Link2 헤더 아이콘 + ExchangeRow "연결 필요" 상태 |
| `bg-accent-vivid text-surface` | 3 hit | ConnectedExchangesCard brand 박스 (3 거래소 첫 글자) |
| `border-border-line` + `divide-border-line` + `bg-surface-muted` | 다수 | Watchlist 카드/divide-y, ExchangeRow 셸 border, 헤더 배경, 메뉴 hover |
| `text-h1` / `text-h2` / `text-body-strong` / `text-body-md` / `text-body-sm-strong` / `text-caption` | 다수 | Pretendard cascade |
| spacing 토큰 (`gap-sm/md/lg/2xl`, `mt-md`, `mb-lg`, `my-sm`, `p-md`) | 다수 | 인라인 px·rem 0건 |
| `max-w-main-max-w` (Watchlist) / `max-w-4xl` (Profile) | 각 1 hit | 본문 폭 제어 — Profile 은 시안의 좁은 max-w 유지 (PR9 의도적) |
| `rounded-md` / `rounded-lg` / `rounded-sm` / `rounded-pill` | 다수 | 카드/메뉴/brand 박스/avatar |

**Tailwind 기본 팔레트 (hex 직타 아님) 사용 0건** — 9 파일 모두 v8 토큰만 cascade. `h-24 w-24` (avatar) / `h-12 w-12` (User 아이콘) / `h-5 w-5` (메뉴 아이콘) 는 Tailwind 기본 sizing scale (rem 단위 — px 직타 아님).

## 5. 번들 사이즈 검증

| Route | 정적 여부 | 비고 |
| --- | --- | --- |
| `/` (PR6 Home) | ○ static | 무회귀 |
| `/analyze` (PR5) | ○ static | 무회귀 |
| `/dashboard` (PR7) | ○ static | 무회귀 |
| `/market` (PR8) | ○ static | 무회귀 |
| `/watchlist` (PR9 신규) | ○ static | 신규 — server-safe 정적 컴포넌트 만, recharts chunk 추가 0 |
| `/profile` (PR9 신규) | ○ static | 신규 — server-safe 정적 컴포넌트 만, recharts chunk 추가 0 |
| `/[...not_found]` | ƒ dynamic | 무회귀 (catch-all) |
| `/_not-found` | ○ static | 무회귀 |
| `/api/workbench/analyze`, `/api/whitelist/search` | ƒ dynamic | 무회귀 (BFF route handler) |
| `/icon` | ○ static | 무회귀 |

11 라우트 모두 build 성공. 신규 PR9 2 라우트 모두 static prerender — `/dashboard` (PR7) · `/market` (PR8) 와 동등 fingerprint.

## 6. 에지 케이스

| # | 시나리오 | 검증 | 결과 |
| --- | --- | --- | --- |
| E1 | 사이드바 "관심종목" + "마이페이지" active | `sidebar-nav-item-active.*href="/watchlist"` co-occur ×1 + `href="/profile"` ×1 + `aria-current="page" href="/watchlist"` ×2 + `href="/profile"` ×2 | pass — Sidebar 양쪽 정합 |
| E2 | 모바일 BottomNav active | `bottom-nav-item-active" aria-current="page" href="/watchlist"` ×1 + `href="/profile"` ×1 | pass — BottomNav 정확 부여 |
| E3 | Star 아이콘 yellow fill | `class="lucide lucide-star h-2xl w-2xl text-warn fill-warn"` SSR — 시안 `text-yellow-500 fill-yellow-500` 의 v8 cascade (`warn` 토큰 brown-ish orange 강조 톤 흡수) | pass |
| E4 | 로그아웃 hover 강조 | `text-critical hover:bg-critical-soft` cascade SSR — 메뉴 5건 중 `LogOut` variant 만 빨강. 다른 4 메뉴 (Bell/Shield/CreditCard/Moon) 는 default `text-text-muted` | pass |
| E5 | catch-all 무력화 | `/watchlist` `/profile` 모두 200 (구체적 라우트 우선 매칭) + `/foo` `/bar` `/dashboard/extra` `/profile/extra` 모두 404 (catch-all fallback 정상). Next App Router 매칭 룰 정합 | pass |
| E6 | aria-label 접근성 | Watchlist `aria-label="관리"` (관리 버튼 7건) + Profile `aria-label="설정 메뉴"` + `aria-label="연동된 거래소 / 증권사"` (`CONNECTED_SECTION_TITLE` 상수 cascade). lucide 아이콘 모두 `aria-hidden="true"` (장식) | pass |
| E7 | StrictMode 더블 마운트 | server component 만 → 클라 마운트 없음. StrictMode 영향 0 | pass |
| E8 | Tailwind preflight 잔여물 | `<ul>` 기본 marker / `<li>` indent 의도적 reset (`flex-col gap-md`, `gap-xs`). 시각 회귀 0 | pass |
| E9 | tabular-nums 숫자 정렬 | WatchlistRow 현재가 + 등락 칩 모두 `tabular-nums` — 6 행 동일 너비 숫자 | pass |
| E10 | 빈 데이터 (mock 변형 시) | `items=[]` 전달 시 `<div className="divide-y">` 빈 자식만 — 런타임 에러 없음 (key=item.symbol 안전). `exchanges=[]` / `menuItems=[]` 동일 (defensive null check 불필요, props-only 패턴) | pass (코드 리뷰) |
| E11 | 사용자 변형 (멤버십/투자성향) | PR6/PR7 enum cascade 패턴 — `MEMBERSHIP_LABEL[user.membership]` + `INVESTOR_LABEL[user.investorType]` Record 매핑. mock = PRO + AGGRESSIVE | pass |

## 7. 시리즈 종료 인계 — cleanup PR 후속 5건 (PR 본문 §머지 게이트)

본 PR9 머지 직후 시리즈 9개 모두 main 정착 → PRD §3.8.2 "시리즈 종료 후 PRD 기반 최종 점검" 단계 진입. 다음 cleanup PR (별도 slug, 본 PR9 머지 후 신규 브랜치) 에서 처리:

| # | 인계 항목 | 비고 |
| --- | --- | --- |
| 1 | **HANDOFF 백필** — PR #34 entry 누락 (reviewer 인계) | 본 PR9 QA HANDOFF append 와 별개. cleanup PR 에서 `docs/HANDOFF.md` 보강 |
| 2 | **`NOT_FOUND_HOME_CTA` copy + root `app/not-found.tsx`** | catch-all 도입 후 dead code 가능 (PR #34 reviewer 인계). cleanup PR 에서 결정 |
| 3 | **시안 폴더 `Stock and Coin Analysis App/` 제거** | PRD §9 q8 RESOLVED 옵션 B — PR9 머지 후 별도 cleanup PR 로 제거 |
| 4 | **`[...not_found]` catch-all 검토** | PR9 후 6 라우트 모두 정착 → catch-all 무력화 검증됨 (위 E5). cleanup PR 에서 삭제 검토 (또는 안전망 유지 결정) |
| 5 | **bundle size 최종 측정** | `@next/bundle-analyzer` 도입 chore (Next 16 CLI 표 제거 회피) |
| **별도** | **`docs/qa/finsight-redesign-final.md`** | QA 가 시리즈 종료 후 PRD 기반 최종 점검 리포트 (AC-PAGE-1~8 × 6 화면 + AC-COMMON-1~9 + AC-GATE-1·2·3 full matrix). 본 PR9 QA 와 별개 산출물 |

## 8. 결론 + 라벨

전 항목 통과 (PAGE-1~8 = 7 pass + 1 N/A · COMMON-1~9 = 9 pass · GATE-1~3 = 3 pass). server-safe 정적 컴포넌트 패턴 + v8 토큰 cascade (`card-hero`, `card`, `button-primary`, `badge-asset-*`, `badge-signal-*`, `badge-accent`, `badge-info`, `text-warn fill-warn`, `text-critical`, `bg-critical-soft`, `from-gradient-ai-from to-gradient-ai-to`, `text-accent-vivid`) 만 사용 — Tailwind color 명명 예외 0건 (PR7 hero scope 와 달리 본 화면은 토큰만으로 충분). `/watchlist`, `/profile` 정적 prerender. 사이드바 + BottomNav 양쪽 active state 정합. 6 메뉴 라우트 모두 정착 + catch-all 자연 무력화. BFF 무회귀 (`/api/workbench/analyze` + `/api/whitelist/search` BE down 시 502 + 한글 fallback 정상).

**판정: qa-passed**. 본 리포트 commit + push 직후 `qa-passed` 라벨 부여 (이전 `impl-ready` 제거). HANDOFF append workflow 트리거 — PR 본문 `## 다음 작업` 절 존재 확인 완료 (`gh pr view 36 -q '.body | contains("## 다음 작업")' → true`). 본 PR9 머지 후 PRD §3.8.2 시리즈 종료 단계 진입 → `docs/qa/finsight-redesign-final.md` + cleanup PR (인계 5건) 후속 작업.
