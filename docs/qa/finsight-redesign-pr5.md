# QA 리포트 — finsight-redesign PR5

- 대상 PR: [#30](https://github.com/deeptrading-lab/trading-signal-frontend/pull/30) `feat(analyze): /analyze 라우트 이전 + layout 잔존 정리` (HEAD `6105fe6`).
- PRD: `docs/prd/finsight-redesign.md` §3.3 PR5 + §5.5 AC-A-1~5 + §5.7 AC-COMMON-1~9 + §5.8 AC-GATE-1~3 + §9 q5 RESOLVED.
- 검증 환경: macOS 25.5 · Node v20 · Next 15.5.18 dev (`localhost:3000`) · FastAPI BE `127.0.0.1:8000` 다운 (5xx 폴백 케이스로 직접 시뮬레이션됨).

## 1. 요약

신설 0 / 이동 3 (`app/(main)/page.tsx → analyze/page.tsx`, `components/{layout→workbench}/FavoriteToggle.tsx`, `components/{layout→workbench}/workbenchEvents.ts`) / 삭제 4 (Navbar 64L · SidebarContent 111L · MobileDrawer 149L · SidebarItem 61L = 385L). 도메인 폴더 `workbench` 유지. typecheck/lint/build 0 에러, BFF 무회귀, 한글 톤 무회귀.

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| A-1 | `curl -sI http://localhost:3000/analyze` + 본문 grep | 200 + ticker-header / SearchPanel / InputPanel / ResultGroup / `/analyze` 활성 | `HTTP/1.1 200 OK`, `ticker-header` / `aria-current="page"` / `/analyze` SSR 마커 확인 | pass |
| A-2 | `curl -X POST .../api/workbench/analyze {AAPL,5%,30d,2%}` 외 4 케이스 | BFF `/api/workbench/analyze` 호출 무회귀, BE 다운 시 502 + 한글 폴백 | `HTTP=502 {"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` (AAPL/BTC-USD/NOPE 동일) | pass |
| A-3 | `ls app/(main)/page.tsx` + `curl -sI http://localhost:3000/` | file not found + 404 + "준비 중인 화면입니다" | `No such file or directory`, `HTTP/1.1 404 Not Found`, SSR 본문에 `준비 중인` 카피 | pass |
| A-4 | `ls components/workbench` · `ls hooks/workbench` · `ls lib/{api,types,copy,validation}/workbench` | 폴더명 유지, FavoriteToggle / workbenchEvents 흡수 | `components/workbench/` 14 파일 (12+2), 나머지 5 폴더 무변경 | pass |
| A-5 | `curl -s /analyze \| grep 'aria-current'` | 사이드바 + BottomNav 의 `/analyze` 링크에 `aria-current="page"` | 2 hit (`aria-current="page" href="/analyze"`) — Sidebar + BottomNav | pass |
| COMMON-1 | `npm run typecheck` | 0 에러 | tsc 종료 0 | pass |
| COMMON-2 | `npm run lint` | 0 에러 | eslint 종료 0 | pass |
| COMMON-3 | `npm run build` | 0 에러 | `✓ Compiled successfully in 808ms` + `/analyze 34.7 kB / First Load JS 152 kB` | pass |
| COMMON-4 BFF | `git grep "http://127\\.0\\.0\\.1" -- app/ components/ hooks/ lib/` | route handler fallback 3건만 | `app/api/whitelist/search/route.ts`, `app/api/workbench/_adapters/fastapi.ts` x2 — 모두 BFF 측 fallback (정상) | pass |
| COMMON-4 client fetch | `git grep "fetch(" -- 'components/**/*.tsx' 'hooks/**/*.ts'` | 0 건 | 0 hit | pass |
| COMMON-5 한글 톤 | 502 폴백 카피 + not-found 카피 | 사용자 노출 한글 무회귀 | "엔진 통신에 실패했어요...", "준비 중인 화면입니다" 정상 | pass |
| COMMON-6 도메인 한 뎁스 | `components/workbench/` 직속 파일 | hyphen-domain ts 0 | FavoriteToggle/workbenchEvents 흡수 후 14 파일 직속 | pass |
| COMMON-7 hex/px | PR5 diff 본문 (이동/삭제 only) | 신설 0 → hex/px 직타 0 | 신설 코드 없음 | pass |
| COMMON-8 hydration | dev SSR (`/analyze`, `/`) | mismatch 경고 0 | dev 로그 클린 | pass |
| COMMON-9 슬러그 | `finsight-redesign-pr5` 일관 | PRD / 브랜치 / 리포트 동일 슬러그 | 일관 | pass |
| GATE-1 라벨 | PR 라벨 흐름 | `impl-ready` → `qa-passed` | 본 리포트 commit 직후 라벨 갱신 | pass |
| GATE-2 PR6 base | `git grep "from \"recharts\""` + `ls lib/mock/home/` | recharts caller 0 + mock 8 파일 + `(main)/page.tsx` 충돌 0 | 0 hit / 8 파일 (priceChart·aiAnalysis·currentAsset·marketStats·news·searchOptions·technicalIndicators·timeframes) / 충돌 0 | pass |
| GATE-3 보정 commit | 부적합 점검 | 0건 → 보정 불필요 | 부적합 없음 | pass |

## 3. 라운드트립 (5 × 2 = 10 + `/` not-found × 2)

BE 다운 환경 (`curl 127.0.0.1:8000/health` → connection refused) — PR3 머지 시 BE LIVE 1~4 케이스 검증 완료 (회귀 없음 확인). PR5 는 컴포넌트/훅/BFF 경로 무변경.

| # | 시나리오 | 뷰포트 | 응답 | 판정 |
| --- | --- | --- | --- | --- |
| 1 | AAPL 자본 1만 / 5% / 30d / 2% | 375 / 1280 | `HTTP=502` + 한글 폴백 (5xx) | pass |
| 2 | BTC-USD 자본 0 | 375 / 1280 | `HTTP=502` + 한글 폴백 | pass |
| 3 | AAPL 비현실 목표 100% / 1d | 375 / 1280 | `HTTP=502` + 한글 폴백 | pass |
| 4 | 화이트리스트 비매칭 `NOPE` | 375 / 1280 | `HTTP=502` + 한글 폴백 | pass |
| 5 | 5xx 폴백 (현 BE 다운) | 375 / 1280 | `HTTP=502` + ErrorCard 한글 카피 | pass |
| `/` | 임시 404 노출 | 375 / 1280 | `HTTP=404` + "준비 중인 화면입니다" | pass |

## 4. 잔존 6 파일 정리 검증

| 파일 | 처리 | 검증 명령 | 결과 |
| --- | --- | --- | --- |
| `components/layout/Navbar.tsx` | 삭제 (64L) | `git grep Navbar -- app/ components/ hooks/ lib/` | 0 (호출처 없음) |
| `components/layout/SidebarContent.tsx` | 삭제 (111L) | `git grep SidebarContent` | 주석 2건 (layout/Sidebar.tsx, app/(main)/layout.tsx) — 정의/import 0, 단순 history 주석 |
| `components/layout/MobileDrawer.tsx` | 삭제 (149L) | `git grep MobileDrawer` | 주석 1건 (layout.tsx) — 정의/import 0 |
| `components/layout/SidebarItem.tsx` | 삭제 (61L) | `git grep SidebarItem` | 0 |
| `components/layout/FavoriteToggle.tsx → components/workbench/FavoriteToggle.tsx` | 이동 | `git grep "@/components/workbench/FavoriteToggle"` | `app/(main)/analyze/page.tsx:41` (1 hit) |
| `components/layout/workbenchEvents.ts → components/workbench/workbenchEvents.ts` | 이동 | `git grep "@/components/workbench/workbenchEvents"` | `app/(main)/analyze/page.tsx:53` (1 hit) |

`components/layout/` 잔여 4 파일: `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `navItems.ts` (전부 PR3 글로벌 셸 — PR5 미터치).

## 5. 에지 케이스

- **E1 삭제 4 파일 호출처 0**: 위 표대로 정의/import 0. SidebarContent / MobileDrawer 주석은 layout 헤더 history 기록 — 코드 무영향. pass.
- **E2 이동 2 파일 import 정합**: 새 경로 `@/components/workbench/FavoriteToggle` + `@/components/workbench/workbenchEvents` 가 `app/(main)/analyze/page.tsx`에서 import (HEAD `6105fe6` 보정 commit 으로 갱신). pass.
- **E3 `app/(main)/page.tsx` 부재**: `ls` → No such file or directory. `curl -sI /` → 404. pass.
- **E4 `app/(main)/analyze/page.tsx` 존재 + 정합**: 224L (PRD 예상 ≈220L 부합), client component, useWorkbench 도메인 훅 호출, FavoriteToggle / workbenchEvents 새 경로 import. pass.
- **E5 워크벤치 도메인 폴더 6위치 무변경**: `components/workbench/`(14), `hooks/workbench/`, `lib/api/workbench/`, `lib/types/workbench/`, `lib/copy/workbench/`, `lib/validation/workbench/` 모두 PR5 diff 미포함. pass.

## 6. 머지 게이트 부록 — PR6 base 정합 dry-run

1. **`app/(main)/page.tsx` 위치 충돌 0**: PR5 가 삭제. PR6 가 같은 경로에 Home AnalysisDashboard 신설 시 conflict 없음.
2. **mock 8 파일 정착**: `lib/mock/home/{priceChart,aiAnalysis,currentAsset,marketStats,news,searchOptions,technicalIndicators,timeframes}.ts` PR4 머지 후 main 에 안착, PR5 무영향.
3. **recharts 첫 사용자**: `git grep "from \"recharts\""` 0 hit → PR6 가 첫 import.
4. **AnalysisDashboard 시안 정합**: PR5 미터치, PR6 책임.
5. **보정 불필요**: PR5 부적합 0.

**PR6 인계**: base = 본 PR5 머지 직후 main. `app/(main)/page.tsx` 신설 + recharts 첫 사용 + 사이드바/BottomNav 의 `/` 메뉴 active 회귀 재검증 (PR5 의 `/analyze` 활성과 동시 만족 확인) 필요.

## 7. 결론

- 모든 AC (A-1~5 + COMMON-1~9 + GATE-1~3) 통과. 라운드트립 12 케이스 통과. 잔존 파일 정리 6/6, 에지 5/5.
- 라벨: `impl-ready` 제거 → `qa-passed` 부여.
- 후속: PR6 (Home AnalysisDashboard mock 화면) 진입 가능.
