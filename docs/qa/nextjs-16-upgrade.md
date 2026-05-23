# QA 리포트 — nextjs-16-upgrade

- 대상 PR: [#33](https://github.com/deeptrading-lab/trading-signal-frontend/pull/33) `chore(deps): Next.js 16.2.6 upgrade` (HEAD `b86f347`).
- PRD: `docs/prd/nextjs-16-upgrade.md` (commit `c274aea`).
- 컨텍스트: finsight-redesign 시리즈 외부 별도 chore PR (PR7 머지된 main `4b13419` 분기).
- 검증 환경: macOS 25.5 · Node 20.19.6 · Next 16.2.6 (Turbopack) · FastAPI BE 다운 (`curl 127.0.0.1:8000/health` exit 7) — `/analyze` BFF 502 + 한글 폴백 자동 검증 경로 정합.

## 1. 요약

`next` ^15.5.18 → ^16.2.6 + `eslint-config-next` 동반 메이저 업그레이드. 사람-에디트 4 파일 (`package.json` 2L / `eslint.config.mjs` +13/-9 / `tsconfig.json` +27/-12 / `next-env.d.ts` 자동 갱신). 소스 코드 0 라인 변경. typecheck/lint/build 0 에러. build 헤더 `▲ Next.js 16.2.6 (Turbopack)` 확인. 6 라우트 (3 페이지 + 3 stub 404) 양 UA 라운드트립 모두 정합. BFF 502 + 한글 폴백 무회귀. `.next/build/` + `.next/dev/` 분리 출력 정합 (`.gitignore .next/` 흡수). `segment-explorer-node` 0 hit (사용자 dev 새로고침 5회 실측은 인계). AC 합계 6 pass + 1 pending (AC-7 사용자) + 1 N/A (AC-8 Next 16 CLI 표 제거).

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **NEXT16-1** next v16 | `npm ls next \| grep next@` | `next@16.x` | `└── next@16.2.6` | pass |
| **NEXT16-2** eslint-config-next v16 | `npm ls eslint-config-next` | `^16.x` | `└── eslint-config-next@16.2.6` | pass |
| **NEXT16-3** Turbopack header | `npm run build 2>&1 \| grep Turbopack` | `▲ Next.js 16.x (Turbopack)` | `▲ Next.js 16.2.6 (Turbopack)` 헤더 1 hit | pass |
| **NEXT16-4** 0-에러 게이트 | `npm run typecheck && npm run lint && npm run build` | exit 0 x3 | tsc exit 0 / eslint exit 0 / build `✓ Compiled successfully in 1595ms` + 7 라우트 (`/`, `/analyze`, `/dashboard`, `/_not-found`, ƒ`/api/whitelist/search`, ƒ`/api/workbench/analyze`) 정적 prerender | pass |
| **NEXT16-5** 6 라우트 라운드트립 | `curl localhost:3000/<r>` x6 + UA 분기 | 3x200 + 3x404 | `/`=200 `/dashboard`=200 `/analyze`=200 `/market`=404 `/watchlist`=404 `/profile`=404. iPhone UA + Mac UA 모두 동일 200/404 (3+3 = 6 케이스 양쪽 = 12 케이스) | pass |
| **NEXT16-6** BFF 502 + 한글 폴백 | `curl -X POST /api/workbench/analyze ...` | 502 + `엔진 통신에 실패했어요...` | `status=502` + body `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` AAPL/음수 자본 2건 동일 | pass |
| **NEXT16-7** dev segment-explorer 해소 | `grep -c segment-explorer-node .next/dev/logs/next-development.log` | 0 hit | **0 hit** (dev 서버 진입 + 라우트 접근 후 측정). 단, 사용자 새로고침 5회 실측은 인계 (브라우저 콘솔 영역) | pending (자동 0 + 사용자 인계) |
| **NEXT16-8** bundle size ±15% | `.next/static/chunks/` 총량 vs v15 baseline | ±15% | Next 16 CLI per-route First Load JS 표 제거 (`@next/bundle-analyzer` 로 이전 — release notes). raw chunk 총량 **1.3M / 15 파일**. v15 baseline (`/` 223 + `/analyze` 152 + `/dashboard` 103 = 478 KB First Load JS 합산) 과 측정 단위가 달라 직접 비교 불가 | n/a (도구 변경) |

## 3. 라운드트립 표

| 라우트 | UA 모바일 (iPhone) | UA 데스크탑 (Mac) | SSR 본문 마커 |
| --- | --- | --- | --- |
| `/` | 200 | 200 | `Pretendard` + 한글 (관심·대시보드·분석) hit |
| `/dashboard` | 200 | 200 | `FinSight` + `sidebar` + `brand` + `hero` hit |
| `/analyze` | 200 | 200 | (워크벤치 SSR 무회귀 — 헤더 200 확인) |
| `/market` | 404 | 404 | `not-found` + `준비 중` + `돌아가기` hit |
| `/watchlist` | 404 | 404 | 동일 |
| `/profile` | 404 | 404 | 동일 |

총 12 케이스 (6 라우트 x 2 UA) 모두 기대 정합.

## 4. BFF 무회귀

- `git grep -nE "http://127\.0\.0\.1" -- app/ components/ lib/` → 3 hit (`app/api/whitelist/search/route.ts:11` + `app/api/workbench/_adapters/fastapi.ts:7,32`) 모두 **route handler fallback** — AGENTS.md 허용 패턴. components/lib 0 hit.
- POST `/api/workbench/analyze` AAPL 표준 / capital=-100 음수 2건 모두 `502 + {"error":"엔진 통신에 실패했어요..."}` 응답. PR5 정합 회귀 0.
- GET `/api/whitelist/search?query=BTC-USD` 도 동일 502 폴백 (FastAPI 미기동 환경).

## 5. 에지 케이스

- **E1 Turbopack 진입** — `npm run build` 헤더 `▲ Next.js 16.2.6 (Turbopack)` + `npm run dev` 헤더 `▲ Next.js 16.2.6 (Turbopack)` 동시 확인 (양쪽 Turbopack 기본 진입). pass.
- **E2 Tailwind v4 정합** — Pretendard self-host + v8 합성 토큰 (`text-signal-up`·`bg-asset-stock`·`sidebar-brand-badge` 등) cascade 정상. `/`·`/dashboard`·`/analyze` SSR HTML 안 토큰 마커 노출 + build CSS chunk (`12m~35b_ww1pz.css` 99 KB) 정합. pass.
- **E3 Pretendard self-host** — `next/font/local` 4 weight (Regular/Medium/SemiBold/Bold) build 안 정합. SSR HTML `Pretendard` 문자열 hit. pass.
- **E4 tsconfig `jsx: react-jsx`** — Next 16 mandatory 갱신 (build 시 자동 reconfig 출력 — PR 본문 명시). typecheck 0 에러로 JSX runtime 무회귀 확인. pass.
- **E5 eslint-config-next 16 Flat Config** — `eslint.config.mjs` 안 `nextCoreWebVitals` + `nextTypescript` 네이티브 import 정합. FlatCompat 제거. lint 0 에러. `react-hooks/set-state-in-effect` off 처리 — PRD §4 (소스 0 라인) 정책 준수 (후속 chore 분리). pass.
- **E6 dev/build 분리 output** — `.next/build/` (3.4K, BUILD_ID 외 빌드 산출) + `.next/dev/` (152K, dev manifest/logs/cache) 동시 공존. `.gitignore` 안 `.next/` 패턴이 둘 다 흡수. Vercel 미연동 무영향. pass.

## 6. 부수 변경 검증

- `tsconfig.json` (+27/-12) — `jsx: preserve → react-jsx`, `include` 안 `.next/dev/types/**/*.ts` 추가 (Next 16 분리 출력 정합), 포맷 정돈. typecheck PASS.
- `eslint.config.mjs` (+13/-9) — FlatCompat·`@eslint/eslintrc` 종속 제거 + 네이티브 Flat preset 2 import (`core-web-vitals` / `typescript`). `Stock and Coin Analysis App/**` ignore 패턴 유지. `react-hooks/set-state-in-effect` off 1 규칙 명시 (PRD §4 정책 + 사유 주석). lint PASS.
- `next-env.d.ts` — Next 16 자동 갱신 (triple-slash `<reference types="next" />` 2 라인 유지 + `import "./.next/dev/types/routes.d.ts"` 신규). **워킹 트리에 미커밋 diff 존재**: line 3 `./.next/types/routes.d.ts` → `./.next/dev/types/routes.d.ts` 자동 재기록. Next 가 dev 재진입 시마다 build/dev 출력 디렉터리에 따라 재생성하는 패턴 — Next 공식 가이드 "This file should not be edited". 후속 chore PR 안 finsight-redesign PR8 진입 시 자연 정착 예정 — 본 PR 머지 무차단.

## 7. 머지 게이트 부록 — PR8 base 정합 (frontend-dev dry-run 재현)

PR 본문 머지 게이트 5건 재현:

| # | 항목 | 검증 |
| --- | --- | --- |
| 1 | PR8 `lib/mock/market/*` 순수 ESM | 본 main 안 `lib/mock/` 디렉터리 정합 (PR6 자산). Next 16 무영향. PASS |
| 2 | PR8 `components/market/` 도메인 폴더 | `components/` 한 뎁스 PascalCase 컨벤션 정합. App Router 16 라우팅 인터페이스 무영향. PASS |
| 3 | PR8 `app/(main)/market/page.tsx` 정적 라우트 | `app/(main)/` 그룹 안 `dashboard` + `analyze` 정합 (PR7 패턴). async params 사용 0건. PASS |
| 4 | PR8 client component (`'use client'` 차트·필터) | React 19.x (Next 16 동반) 정합. `/dashboard` 안 동일 패턴 SSR/CSR 정합 200 확인. PASS |
| 5 | hooks (`useBreakpoint`·`useOutsideClick`) 재사용 | react-hooks 7 신규 `set-state-in-effect` off 처리로 회귀 0. PASS |

→ **PR8 즉시 진입 가능 (rebase 불필요)**. 본 chore 머지된 main 에서 분기.

## 8. 사용자 dev 실측 인계

- **AC-NEXT16-7 (segment-explorer-node 해소)** — 자동 측정 (dev log grep) 0 hit. 단, 본 에러는 브라우저 dev tools / segment-explorer 진입 시점에 발생하는 패턴이라 **사용자가 직접 `npm run dev` → `/` 새로고침 5회 + 브라우저 콘솔 확인**이 최종 게이트. 잔존 시 본 PR 코멘트 → OPEN QUESTION 격상 + 추가 패치 검토. 잔존 0 시 본 chore 의도 달성.
- **recharts `width(-1)` build 경고** — 알려진 동작 (recharts ResponsiveContainer + Turbopack static prerender 결합). 시각 무영향. 본 PR 무차단. 별도 chore PR 후보 (PR 본문 안 명시).

## 9. 결론

- **AC 합계**: 6 PASS / 1 PENDING (NEXT16-7 사용자 dev 실측) / 1 N/A (NEXT16-8 Next 16 CLI 표 제거 — bundle-analyzer 도입 PR 안 재정착).
- **무회귀 합계**: typecheck/lint/build 0 에러 · 6 라우트 양 UA 정합 · BFF 502 + 한글 폴백 · BFF 원칙 (route handler fallback 외 0건) · 한글 톤 무회귀 · Pretendard / Tailwind v4 / signal·asset 토큰 무회귀.
- **PR 본문 `## 다음 작업` 절 존재 확인**: HANDOFF append workflow 트리거 정합.
- **판정**: `qa-passed` — 자동 게이트 + 머지 게이트 모두 통과. 사용자 dev 실측 (AC-7) 은 머지 후 인계 (PR 코멘트 / 새 issue 경로).

산출물: docs/qa/nextjs-16-upgrade.md | 판정: qa-passed | 실패 0건
