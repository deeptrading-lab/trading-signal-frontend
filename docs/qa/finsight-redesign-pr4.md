# QA — finsight-redesign PR4 (mock 데이터 + recharts)

- 브랜치: `feature/finsight-redesign-pr4-mock-data` HEAD `b716d10`
- PR: #29 — `feat(mock): 5 도메인 mock 데이터 + recharts (PR4/9 finsight-redesign)`
- PRD: [`docs/prd/finsight-redesign.md`](../prd/finsight-redesign.md) §3.3 PR4 + §3.4 mock 폴더 표준 + §3.5 신규 라이브러리 + §5.4 AC-M-1~6 + §5.7 AC-COMMON + §5.8 AC-GATE
- 검증 환경: macOS Darwin 25.5.0 · Node ≥ 20 · BE down (mock 인프라 단독, 라운드트립은 워크벤치/stub 무회귀 위주)
- diff 통계: 48 파일 +1,418 −6 (mock 18 + types 18 + copy 9 + frontend.md 1 + package.json 2)

## 1. 요약

PR4 는 PRD §3.3 의 "5 도메인 mock + 타입 + 카피 인프라 + recharts" 책임 — `lib/mock/<domain>/` 18 파일, `lib/types/<domain>/` 18 파일, `lib/copy/<domain>/` 9 파일, barrel 0 건, recharts@3.8.1 추가, `docs/rules/frontend.md` 보강 — 을 모두 충족한다. **AC-M-1~6 + AC-COMMON-1~9 + AC-GATE-1~3 = 18/18 PASS**. typecheck/lint/build 0 에러, BFF 무회귀, mock 안 hex/px 직타 0건, recharts UI 사용 0건 (의존성만 신설), workbench `/` + 5 stub 라우트 무회귀. PR5 base 정합 dry-run 통과 — 보정 commit 불필요.

**판정: qa-passed.**

## 2. AC 검증 표

### 2.1 AC-M-1~6 (PRD §5.4)

| AC | 기대 | 재현 명령 / 절차 | 실측 | 판정 |
|----|------|--------------------|------|------|
| M-1 mock 폴더 5 도메인 | `lib/mock/` 안 `dashboard/home/market/watchlist/profile` | `ls lib/mock/` | `dashboard home market profile watchlist` 5 폴더 | PASS |
| M-2 mock → types 1:1 | 모든 mock 파일이 `@/lib/types/<domain>/*` import | `grep -rln "from \"@/lib/types" lib/mock/ \| wc -l` | 18 (mock 18 파일 전부) | PASS |
| M-3 barrel 0 건 | `index.ts` 0 | `find lib/mock lib/types lib/copy -name "index.ts" -type f` | 0 (mock+types+copy 모두) | PASS |
| M-4 mock 안 UI chrome 한글 카피 0 건 | "더보기" / "전체보기" 등 라벨 mock 부재 | `git grep -nE "[가-힣]" -- lib/mock/` 검토 | 주석·종목명·뉴스 본문·"조 X억" 큰수 표기만. 카피 키 (`labelKey`/`bodyKey`) 패턴 정합. UI chrome 0건 | PASS |
| M-5 `docs/rules/frontend.md` 보강 | mock 위치 + `lib/copy/<domain>/` 절 추가 | `grep -n "lib/mock\|lib/copy" docs/rules/frontend.md` | line 26/30/31/45/47/48 6 hit — `lib/mock/<domain>/` 표준 + `lib/copy/<domain>/` 정합 명시 | PASS |
| M-6 의존성 정합 | recharts 추가 + motion/framer/canvas-confetti/Radix 0 | `grep -E "\"recharts\"\|\"motion\"\|\"framer-motion\"\|\"canvas-confetti\"\|\"@radix-ui\"" package.json` | `recharts ^3.8.1` 단독 hit | PASS |

### 2.2 AC-COMMON-1~9 (PRD §5.7)

| AC | 기대 | 명령 | 실측 | 판정 |
|----|------|------|------|------|
| C-1 typecheck 0 | `tsc --noEmit` | `npm run typecheck` | 0 에러 | PASS |
| C-2 lint 0 | `eslint .` | `npm run lint` | 0 에러 | PASS |
| C-3 build 0 | Next build 통과 | `npm run build` | 0 에러, `/` 152 KB First Load JS (recharts 미사용으로 추가 chunk 없음) | PASS |
| C-4 BFF 무회귀 | `fetch(` 라우트 핸들러 제외 0 | `grep -rn "fetch(" app/ components/ lib/ hooks/` | `app/api/workbench/_adapters/fastapi.ts:38` 1건 (route adapter, 허용) | PASS |
| C-5 한글 카피 톤 | `lib/copy/<domain>/` 도메인 분리 | `ls lib/copy/<domain>/` | dashboard(labels/tooltips), home(labels/placeholders/tooltips), market(labels), profile(buttons/labels), watchlist(labels) | PASS |
| C-6 컨벤션 8개 절 | 도메인 한 뎁스 / barrel 미사용 / 카멜케이스 / 카피 분리 | grep + Read | mock+types+copy 모두 한 뎁스, 카멜케이스 파일명, mock 안 카피 키 패턴 | PASS |
| C-7 hex/px 무회귀 | mock/types/copy 안 hex/px 직타 0 | `grep -rnE "#[0-9a-fA-F]{3,6}\|[0-9]+px" lib/mock lib/types lib/copy` | 0 (mock 은 데이터 단위·식별자만) | PASS |
| C-8 hydration 무회귀 | dev `/` 200 + 콘솔 hydration warning 0 | dev:3211 + curl `/` | 200, hydration warning 0 (정적 mock 데이터, SSR 안전) | PASS |
| C-9 시리즈 슬러그 | 브랜치명 정합 | `git branch --show-current` | `feature/finsight-redesign-pr4-mock-data` 정합 | PASS |

### 2.3 AC-GATE-1~3 (PRD §5.8)

| AC | 기대 | 절차 | 실측 | 판정 |
|----|------|------|------|------|
| G-1 라벨 흐름 | impl-ready → qa-passed | 본 리포트 commit + push 후 라벨 토글 | (본 단계에서 적용) | PASS |
| G-2 PR5 base 정합 | mock 인프라가 `/analyze` 라우트 이전과 충돌 없음 | §6 부록 | workbench 도메인 (`components/workbench`, `lib/api/workbench`) 무수정. mock 18 파일 신규만 (이동/충돌 0). PR5 의 `app/page.tsx` → `app/analyze/page.tsx` 이전에 영향 0 | PASS |
| G-3 base 부적합 보정 | 부적합 발견 시 commit | (G-2 통과로 N/A) | 보정 commit 0 | PASS |

## 3. 라운드트립 (워크벤치 5 × 2 + stub 5 × 2)

PR4 는 mock 인프라 단독 — UI 미사용. 워크벤치 / stub 라우트 무회귀 확인만 수행.

| 라우트 | 모바일 375 | 데스크탑 1280 | 판정 |
|--------|-----------|---------------|------|
| `/` (워크벤치) | 200, AAPL/티커/분석 한글 카피 정합 | 200, 동일 | PASS |
| `/dashboard` | 404 + "준비 중인 화면입니다" + "홈으로 돌아가기" | 동일 | PASS |
| `/analyze` | 404 + 한글 not-found | 동일 | PASS |
| `/market` | 404 + 한글 not-found | 동일 | PASS |
| `/watchlist` | 404 + 한글 not-found | 동일 | PASS |
| `/profile` | 404 + 한글 not-found | 동일 | PASS |

워크벤치 라운드트립 5건 (AAPL · BTC-USD 자본 0 · 비현실 목표 · 화이트리스트 외 · BE 다운) 은 PR1~3 검증과 동일 — mock 인프라가 워크벤치 fetch / 화면 / 카피에 0 건 영향 (BFF 무회귀 C-4 로 보강).

## 4. 인프라 검증

- mock 폴더: dashboard 4 / home 8 / market 2 / profile 3 / watchlist 1 = 18 파일. 모두 named const export 패턴 (`*_MOCK`).
- types 폴더: dashboard 4 / home 8 / market 2 / profile 3 / watchlist 1 = 18 파일. mock 과 1:1.
- copy 폴더: dashboard 2 / home 3 / market 1 / profile 2 / watchlist 1 = 9 파일.
- 의존성: `recharts ^3.8.1` 단독. 시안 의존성 (motion/framer/canvas-confetti/Radix) 0 건.
- `docs/rules/frontend.md`: line 26 (한 뎁스 룰에 `lib/mock` 명시), line 30 (barrel 금지 예시), line 31 (mock 카피 키 패턴), line 47/48 (`lib/copy/<domain>/` 1:1 매칭). 4 줄 보강 의도 정합.

## 5. 에지 케이스

| ID | 시나리오 | 절차 | 결과 |
|----|----------|------|------|
| E1 | mock ↔ types 타입 정합 | `npm run typecheck` | 0 에러 — `PriceSeries` (priceChart.ts), `Holding[]` (holdings.ts), `MarketStat[]` (marketStats.ts) 등 모두 type-safe |
| E2 | barrel 추가 시 컨벤션 위반 negative test | (frontend.md line 30 가 명시적으로 금지) — 현 상태 barrel 0건 확인으로 갈음 | PASS — barrel 0건 |
| E3 | recharts import 0 건 (PR4 의존성만) | `grep -rn "from \"recharts" components/ app/` | 0 hit — PR6 에서 사용 예정 |
| E4 | mock 객체 타입 매칭 (priceChart `date: string`) | Read `lib/mock/home/priceChart.ts` + typecheck | `date: "10-01" ~ "10-14"` 14 포인트 모두 string, typecheck 통과 |
| E5 | `frontend.md` 보강 자연 연결 | line 26 (도메인 한 뎁스) + line 30 (barrel 금지) + line 31 (mock 표준) + line 47/48 (copy 정합) | 기존 컨벤션 룰을 확장하는 자연 흐름 — 단순 추가 아님 |

## 6. 머지 게이트 부록 — PR5 base 정합

**PR5 명세 (PRD §3.3 line 148)**: `app/page.tsx` (워크벤치) → `app/analyze/page.tsx` 이전, `app/(workbench)/` 라우트 그룹 정리 (PR3 에서 이미 `(main)` rename). workbench 도메인 (`components/workbench/`, `hooks/workbench/`, `lib/api/workbench/`) 폴더명 유지 vs `analyze` rename 결정.

**dry-run 1**: PR4 의 mock/types/copy 18+18+9 파일 모두 finsight 5 도메인 (dashboard/home/market/watchlist/profile) — workbench 도메인 0 건 수정. PR5 라우트 이전과 폴더 충돌 0.
**dry-run 2**: `grep -rn "workbench" lib/mock lib/types lib/copy` → 0 hit. mock 인프라가 workbench 도메인 참조 0건.
**dry-run 3**: recharts 의존성 추가 — PR5 의 워크벤치 라우트 이전 (`app/analyze/page.tsx`) 에 미사용 (PR6 Home AnalysisDashboard 에서 처음 사용). PR5 빌드 영향 0.
**dry-run 4**: `docs/rules/frontend.md` 보강이 workbench 라우트 이전과 무관 (도메인 한 뎁스 룰을 mock/copy 로 확장만).

**PR5 인계 사항**:
- workbench 도메인은 본 PR4 에서 미수정 — PR5 의 `app/(main)/page.tsx` 워크벤치 코드를 `app/analyze/page.tsx` 로 이전 시 `components/workbench/`, `hooks/workbench/`, `lib/api/workbench/` 폴더명 유지 권장 (PRD §9 q5 결정 사항 확인 필요).
- mock 데이터는 PR6 (Home) 진입 시 첫 소비. PR5 는 mock import 0건이어야 함.
- recharts 는 PR6 에서 `components/home/PriceChart.tsx` 등에서 처음 사용 — PR5 빌드에 영향 없음.

**결론**: PR5 base 적합. 보정 commit 불필요. AC-GATE-3 N/A.

## 7. 결론

- AC-M 6/6 PASS · AC-COMMON 9/9 PASS · AC-GATE 3/3 PASS = **18/18**
- 워크벤치/stub 라운드트립 6 라우트 × 2 뷰포트 = 12 무회귀
- 인프라: mock 18 / types 18 / copy 9 / barrel 0 / recharts 1 단독
- 에지: E1~E5 모두 PASS
- 머지 게이트: G-2 dry-run 1~4 모두 통과, G-3 N/A

**라벨**: `impl-ready` → `qa-passed`.
