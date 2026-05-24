# QA 리포트 — finsight-redesign 시리즈 종료 cleanup

- 대상 PR: [#37](https://github.com/deeptrading-lab/trading-signal-frontend/pull/37) `chore: finsight-redesign 시리즈 종료 cleanup (HANDOFF + 시안 폴더 + bundle-analyzer)` (HEAD `3b2296c`).
- 시리즈 종료 직후 별도 chore PR. PRD 없음 — `docs/qa/finsight-redesign-final.md` §7 cleanup 인계 5건 + final.md 자체 보정 1건 일괄 처리.
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 dev `localhost:3000` (백그라운드 PID, QA 종료 시 정리) / build (Turbopack) + build:analyze (Webpack) / FastAPI BE 다운 (`curl /health` → exit `000`) — 본 PR 변경 영역이 BE-side 무관이라 무영향, BFF 무회귀는 `/api/workbench/analyze` 502 + 한글 폴백으로 검증.

## 1. 요약

git diff 합계: 4 commit + final.md QA 직접 작성 commit 1건 = 누적 5 commit (PR diff `main..chore/finsight-redesign-cleanup` = 6 파일, +453 -2, package-lock 제외 +69 -2). **A1 HANDOFF 백필** (#34, #36 entry 2건 +61L) — workflow grep 패턴 false-negative 회복. **A2 workflow 패턴** (`grep -qE "^### .*\(#${PR_NUMBER}\)\$"` 라인 앵커 정규식) — 본문 인용 `(#N)` 와 충돌 회피. **C 시안 폴더 제거** (`Stock and Coin Analysis App/` 404KB) — 워킹트리 삭제 (untracked 였으므로 git 무영향). eslint + tsconfig 의 가드 패턴은 유지 (재다운로드 회귀 방지). **E `@next/bundle-analyzer`** (`16.2.6`) + `build:analyze` script + `next.config.ts` `withBundleAnalyzer` wrap — 3 산출물 (`client.html` 504KB + `nodejs.html` 545KB + `edge.html` 275KB) 정상 생성. **F final.md AC 합계** 51 → 60 보정 (V4 8 + V8 11 + L 5 + M 6 + A 5 + PAGE 8 + COMMON 9 + GATE 3 + FINAL 5). **B dead code** (`NOT_FOUND_HOME_CTA` + root `app/not-found.tsx`) 및 **D catch-all** (`app/(main)/[...not_found]/page.tsx`) 안전망 유지 결정 — 변경 0 확인. typecheck / lint / build (Turbopack + Webpack) 0 에러, 11 라우트 prerender 무회귀 (○ `/`, `/analyze`, `/dashboard`, `/market`, `/watchlist`, `/profile`, `/icon`, `/_not-found` + ƒ `/[...not_found]`, `/api/whitelist/search`, `/api/workbench/analyze`). 6 메뉴 라우트 + `/foo` catch-all 200/404 정합. **소소한 잔존 1건**: final.md L165 `§6 FINAL-2 자체 검증` bullet 에 `51 pass / 0 fail / 0 N/A` 표기가 남아 있음 — F commit 의 §1/§3.8 표/AC 합계 본문 3건은 정상 보정, 본 bullet 은 descriptive 자기 참조 라인이라 합계 일관성에는 영향 없음 (note 등급, QA 비-차단).

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **CLEAN-1** HANDOFF 백필 | `grep -cE "^### .*\(#(34\|36)\)" docs/HANDOFF.md` + entry format eyeball | ≥2 hit + 다른 entry 와 동일 format | `4` (2 entry 각 `### 2026-05-24 — ...` 헤더 + 본문 인용 충돌 0) — L166/L190 은 `#34/#36` 다른 PR 의 본문 인용 라인 (PR33 `#34 후속 fix` + dev-relay `#36`), L1857/L1886 이 본 백필 entry. format 정합 (slug · author · PR URL · 요약 · 현재 상태 · 본문 발췌 · 다음 작업 후보) | pass |
| **CLEAN-2** workflow 패턴 | `grep -E "grep -qE" .github/workflows/handoff-append.yml` + 매칭 dry-run | 정규식 grep ≥1 + entry 헤더 라인만 매칭 | `grep -qE "^### .*\(#${PR_NUMBER}\)\$"` 1 hit. dry-run `grep -nE "^.*\(#36\)\$" docs/HANDOFF.md` → L190 + L1886 2 entry 헤더 라인만 (다른 entry 본문 인용 `(#N)` 매칭 0) | pass |
| **CLEAN-3** 시안 폴더 제거 | `ls "Stock and Coin Analysis App/"` + `du -sh` + 가드 잔존 | ls fail + du fail + eslint/tsconfig 의 ignore/exclude 패턴 유지 | `ls: Stock and Coin Analysis App/: No such file or directory` + `du: No such file or directory`. `tsconfig.json:41 "Stock and Coin Analysis App"` (exclude) + `eslint.config.mjs:13 "Stock and Coin Analysis App/**"` (ignores) — 재다운로드 회귀 가드 유지 | pass |
| **CLEAN-4** bundle-analyzer 도입 | `npm ls @next/bundle-analyzer` + `next.config.ts` wrap + `package.json` script | dep 1건 + withBundleAnalyzer wrap + build:analyze script | `└── @next/bundle-analyzer@16.2.6` 1건. `next.config.ts:5 const withBundleAnalyzer = bundleAnalyzer({` + `:14 export default withBundleAnalyzer(nextConfig);` wrap 정합. `package.json:8 "build:analyze": "ANALYZE=true next build --webpack"` (Turbopack 비호환 → Webpack flag 명시) | pass |
| **CLEAN-5** bundle-analyzer 동작 | `ANALYZE=true npm run build:analyze` + `ls .next/analyze/` | `.next/analyze/{client,nodejs,edge}.html` 3 산출물 | `client.html` 504,042B + `nodejs.html` 545,185B + `edge.html` 274,811B 3 파일 생성. Webpack build 정상 (11 라우트 prerender) | pass |
| **CLEAN-6** final.md 보정 | `grep -nE "\b60\b\|\b51\b" docs/qa/finsight-redesign-final.md` | §1/§3.8 본문 합계 `60` 표기 + `51` 잔존 ≤descriptive | 60 hit 4건 (L11 §1 요약 `pass 60 / fail 0 / N/A 0`, L122 §3.8 표 `60 AC 모두 pass`, L127 합계 `pass 60 / fail 0 / N/A 0`, L128 세부 `= 60`). **51 hit 1건 잔존** — L165 §6 FINAL-2 자기 검증 bullet `51 pass / 0 fail / 0 N/A`. F commit 의 주 보정 영역은 정상이지만 §6 한 줄 누락 — descriptive 자기 참조 라인이라 합계 일관성에는 영향 없음, note 등급으로 보고 (QA 비-차단) | pass (note) |
| **DEAD-CODE** no-op 결정 | `grep -rE "NOT_FOUND_HOME_CTA" lib/ app/` + `ls app/not-found.tsx` | 3 hit (정의 + 2 import/사용) + 파일 존재 + 본 PR 변경 0 | `lib/copy/layout/navCopy.ts:25` 정의 + `app/not-found.tsx:21,31` import/JSX. `ls app/not-found.tsx` 존재. `git diff main..HEAD -- app/not-found.tsx lib/copy/layout/navCopy.ts` 변경 0 — root 안전망 + copy 토큰 유지 | pass |
| **CATCH-ALL** no-op 결정 | `ls app/(main)/[...not_found]/page.tsx` + 본 PR 변경 0 | 파일 존재 + diff 0 | `app/(main)/[...not_found]/page.tsx` 존재. `git diff main..HEAD -- 'app/(main)/[...not_found]/page.tsx'` 변경 0 — 미지정 라우트에서 (main) 셸 + 한글 not-found 안전망 유지 | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | `tsc --noEmit` 종료 코드 0 + 출력 0 라인 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | `eslint .` 종료 코드 0 + 출력 0 라인 | pass |
| **COMMON-3** build | `npm run build` (Turbopack 기본) | 0 에러 + 11 라우트 정상 | `✓ Compiled successfully in 1604ms` + `✓ Generating static pages using 9 workers (11/11) in 195ms` + 11 라우트 표 (○ 8 + ƒ 3) 무회귀 | pass |
| **COMMON-4** BFF | `git grep -nE "http://127\\.0\\.0\\.1" -- app/` (route handler 제외 0건) | route handler fallback 3 hit 만 | 3 hit — `app/api/whitelist/search/route.ts:11` + `app/api/workbench/_adapters/fastapi.ts:7,32` — 모두 env default 패턴, 컴포넌트·페이지 hit 0건. `/api/workbench/analyze` (BE down) → `HTTP 502` + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` graceful | pass |
| **COMMON-7** 토큰 무회귀 | `git grep -nE "#[0-9a-fA-F]{3,6}\b" -- 'app/**/*.tsx' 'components/**/*.tsx'` | hex 직타 0 | hit 1건 — `components/home/PriceChart.tsx:7` 의 **JSDoc 주석 안 hex 인용** ("시안의 `#ef4444` 대신 v8 토큰") — 코드 영역 hit 0건. cleanup PR 의 코드 변경 = `next.config.ts` 만 (hex 무관) | pass |
| **COMMON-8** hydration mismatch | dev 모바일/데스크탑 UA 로 `curl /` SSR HTML 바이트/오류 마커 | 마커 0 + SSR 동일 | mobile/desktop UA 둘 다 46,831B 동일 + `grep "hydration"` 0 hit. `__next_error__` 마커는 `/foo` (의도된 not-found) 에만 — 정상 동작 | pass |

## 3. 라운드트립 (dev `localhost:3000`)

dev 서버 백그라운드 기동 — `dev ready` 확인 후 시나리오 실행, QA 종료 시 `pkill -f "next dev"` 정리.

| # | 시나리오 | 명령 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| RT-1 | 6 메뉴 라우트 무회귀 | `curl -o /dev/null -w "%{http_code}"` 6건 | `/` 200, `/dashboard` 200, `/analyze` 200, `/market` 200, `/watchlist` 200, `/profile` 200 | pass |
| RT-2 | catch-all 404 | `curl /foo` | `404` + `<title>FinSight</title>` + `__next_error__` 정상 (Next 16 not-found 마커) | pass |
| RT-3 | BFF graceful (BE down) | `curl -X POST /api/workbench/analyze ... AAPL/30/2/5/10000` | `HTTP 502` + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` | pass |
| RT-4 | 반응형 (375 / 1280) — SSR | mobile/desktop UA `curl /` 비교 | 두 UA 모두 46,831B 동일 SSR HTML (반응형 = client-side viewport, SSR mismatch 0) | pass |
| RT-5 | 카피 톤 — 한글 폴백 노출 | `grep "홈으로 돌아가기\|페이지를 찾을" /foo` | 1 hit ("홈으로 돌아가기" CTA) — `NOT_FOUND_HOME_CTA` cascade 정상 | pass |

## 4. 에지 케이스

| # | 케이스 | 명령 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| E1 | ANALYZE 비활성 build | `npm run build` (ANALYZE unset) | 0 에러 + Turbopack 정상 + analyze HTML 생성 안 됨 (정상) | pass |
| E2 | ANALYZE 활성 build | `ANALYZE=true npm run build:analyze` | Webpack fallback (Turbopack 비호환) + 3 HTML 산출 (client 504KB / nodejs 545KB / edge 275KB) | pass |
| E3 | workflow grep — 본문 인용 충돌 | `grep -nE "^### .*\(#36\)\$" docs/HANDOFF.md` (dry-run) | 2 entry 헤더 라인만 매칭 (L190 dev-relay + L1886 watchlist/profile) — 본문 인용 `(#N)` 0 false-positive | pass |
| E4 | HANDOFF 백필 — 시간순 정합 | `grep -nE "^### " docs/HANDOFF.md` ordering | 백필 entry 2건 (L1857 `2026-05-24 — chore(meta) ... (#34)` + L1886 `2026-05-24 — feat(watchlist, profile) ... (#36)`) 가 시간순 (PR9 머지 직후 자리) 자연 연결 | pass |
| E5 | 시안 폴더 제거 후 build/dev 무회귀 | build + dev + lint | 모두 0 에러 — 시안 폴더는 src/test 트리 밖이라 영향 무 (eslint/tsconfig 가드는 잔존, 재다운로드 시 자동 차단) | pass |

## 5. 가드 / 시그널 / 게이트

- **GATE-1 base 정합**: `main` (1a79430, PR9 머지) → `chore/finsight-redesign-cleanup` (3b2296c). `git fetch && git pull` clean. base diff 6 파일 / +453 -2 (package-lock 제외 +69 -2).
- **GATE-2 한 PR 룰 정합**: cleanup 5 commit 모두 본 PR 한 브랜치에 누적 (QA 직접 작성 1 + 보정 1 + 백필 1 + workflow 1 + deps 1 = 5). 별도 PR 0 — 한 브랜치 한 PR 룰 준수.
- **HANDOFF append workflow 검증 기회**: 본 PR 의 qa-passed 라벨 부여 = 신 grep 패턴 (`^### .*\(#${PR_NUMBER}\)\$`) 의 첫 실제 시도. 본 PR 본문에 `## 다음 작업` 절 (Vercel 연동) 존재 확인 — workflow append 시 빈 항목 commit 회귀 가드 만족.
- **번들 가시화 baseline**: build:analyze 3 HTML 산출 — 차후 chunk size 회귀 시 ref 점.

## 6. 판정 및 인계

- **판정: qa-passed** (AC 14건 모두 pass, note 1건 = CLEAN-6 final.md L165 §6 자기 참조 라인 잔존 — 합계 일관성 무영향, 비-차단). 라운드트립 5건 / 에지 5건 모두 pass.
- **라벨 액션**: `impl-ready` → `qa-passed` 치환 (workflow trigger 로 HANDOFF auto-append).
- **인계**: 본 PR 머지 후 finsight-redesign 시리즈 (9 PR + 본 cleanup) 완전 종결. 다음 트랙은 **Vercel 연동** (사용자 메모 `project_vercel-deferred.md` 정합) — automatic deployment hook + statusCheckRollup 활성. 그 이후 BE 연동 (현 mock 5 화면 → live API) 별도 PRD 단위.
