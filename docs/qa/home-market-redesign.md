# QA — home-market-redesign (PR1: 계좌 위젯 마이페이지 이전)

- 슬러그: `home-market-redesign`
- PR: #49 (브랜치 `feature/home-market-redesign`, base `main`, head `6a96611`)
- PRD: [`docs/prd/home-market-redesign.md`](../prd/home-market-redesign.md) §5 (PR1 해당분: AC-2/AC-4/AC-8/AC-9/AC-10)
- DESIGN: [`docs/design/home-market-redesign.md`](../design/home-market-redesign.md) (v9, 브랜치에 커밋됨 — `5b31ba7`)
- 작성일: 2026-05-30
- 환경: Next.js 16.2.6 Turbopack / 라운드트립 `127.0.0.1:3148` (`next start` 프로덕션 빌드) / BE FastAPI(:8000) 다운 — **PR1 자산 섹션은 mock-only(BFF 무관)이라 무영향**
- 판정: **qa-passed** — PR1 해당 AC 전부 통과. 실패 0건.

> 본 PR1 범위 = 계좌 위젯 `/dashboard`→`/profile` "내 자산" 이전 + `/dashboard`→`/profile` 리다이렉트.
> 홈 시장종합·nav 재편·공포탐욕(AC-1/3/5/6/7)은 **PR2 영역으로 본 QA 대상 아님** — 미구현을 실패로 잡지 않음.

---

## 0. 브랜치 정합 (전제 확인)

```
$ git rev-parse origin/feature/home-market-redesign   # 6a96611...
$ git merge-base main origin/feature/home-market-redesign  # f577b1f (≠ head)
$ git diff --stat main...origin/feature/home-market-redesign  # 27 files, +2076 -422
```

PR1 구현 5커밋(`65a0cb0` 토큰 주입 / `c53c063` mock·타입 이전 / `3bee82f` 자산 섹션 / `6a96611` 리다이렉트) + DESIGN.md(`5b31ba7`) + PRD 2커밋이 모두 브랜치에 존재. DESIGN.md 원격 커밋 확인(`git cat-file -e ...:docs/design/home-market-redesign.md` → 존재). 한 브랜치 한 PR 룰 정합.

신규 파일: `components/profile/{AssetDonut,AssetHero,AssetSection,HoldingsTable}.tsx`, `lib/{mock,types,api}/profile/*`, `hooks/profile/useQueryHoldings.ts`, `lib/copy/profile/labels.ts`. 제거: `components/dashboard/{DashboardPage,HoldingsTop3,PortfolioHero}.tsx`, `lib/mock/dashboard/portfolio.ts`.

---

## 1. 빌드 / 품질 게이트 (AC-8) — PASS

| 항목 | 명령 | 결과 | 판정 |
|------|------|------|------|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | exit 0, 0 에러 | PASS |
| lint | `npm run lint` (`eslint .`) | exit 0, 0 에러 | PASS |
| build | `npm run build` (Next 16.2.6 Turbopack) | `✓ Compiled successfully`, 19/19 static pages, exit 0 | PASS |
| test | `npm run test` (`vitest run`) | **21 files / 110 passed**, exit 0 (`lib/api/profile/__tests__/holdings.test.ts` 2건 포함) | PASS |

빌드 라우트 출력: `/profile` = ○(static), `/dashboard` = ○(static, redirect), `/`·`/market`·`/analyze`·`/watchlist` 모두 정상 생성.

> PR 본문은 vitest 110 passed 를 주장했고 본 QA 재실행에서 동일 확인. (직전 PR(header-market-ticker) QA 의 vitest 경로 실패는 본 브랜치에서 재현되지 않음 — 21 suite green.)

---

## 2. AC 별 검증

### AC-2 계좌 위젯 마이페이지 이전 + 전체 테이블 — PASS

| # | 재현 절차 | 기대 | 실측 | 판정 |
|---|-----------|------|------|------|
| 2a | `git grep -rn "내 자산" components/profile lib/copy` | 1건 이상 | **다수 매치** — `ASSET_SECTION_TITLE = "내 자산"`(labels.ts) + ProfilePage/AssetSection/AssetHero/HoldingsTable/AssetDonut JSDoc | PASS |
| 2b | `git grep -rn "PortfolioHero\|HoldingsTop3" components/dashboard 'app/(main)/dashboard'` | 0건(원위치 제거) | **exit 1, 0건** — PortfolioHero/HoldingsTop3/DashboardPage 파일 삭제됨. `components/dashboard/` 에는 MarketSnapshotCard 만 잔존(PR2용 보존) | PASS |
| 2c | dev `/profile` SSR 렌더 | 전체 테이블(종목명·평가액·수익률·비중, 정렬). Top3 요약 아님 | **확인** — 아래 라운드트립 §4 | PASS |

`HoldingsTable.tsx` 구조 검증:
- 4열 = `HOLDINGS_COL_NAME/AMOUNT/CHANGE/WEIGHT`("종목명/평가액/수익률/비중"). 헤더 클릭 정렬(`toggleSort`) + `aria-sort` 4열 전부.
- 비중 = `amountKrw / 총평가액 * 100` 동적 산출(요약 고정 아닌 전체 테이블 구조). mock 3종(삼성전자/비트코인/애플) 전부 행 렌더.
- 빈 상태 카피 `HOLDINGS_EMPTY = "보유 종목이 없습니다."`.
- 거래성 컬럼(예수금/주문가능/실현손익/입출금) 0 — 타입(`Portfolio`/`Holding`)에도 미포함.

### AC-3 프로필 카드 무회귀 — PASS(부수)

ProfileCard / ConnectedExchangesCard / SettingsMenuCard 무변경(diff 0). ProfilePage 배치 = 타이틀 → ProfileCard → **AssetSection("내 자산")** → 2-col(Exchanges + Settings) — DESIGN.md v9 배치 순서 정합.

### AC-4 라우트 리다이렉트 — PASS

| 재현 절차 | 기대 | 실측 | 판정 |
|-----------|------|------|------|
| `git grep -rn "redirect" 'app/(main)/dashboard/page.tsx'` | 리다이렉트 코드 | `import { redirect } from "next/navigation"; redirect("/profile")` | PASS |
| `curl -sD- http://127.0.0.1:3148/dashboard` | `/profile` 리다이렉트 | **`HTTP/1.1 307 Temporary Redirect` + `location: /profile`** | PASS |
| `curl -sL .../dashboard` | 최종 200 /profile | `final=200 url=.../profile` | PASS |
| `/`·`/analyze`·`/watchlist`·`/profile`·`/market` 상태 | 깨짐 0 | 전부 **200** | PASS |

> Next `redirect()` 는 RSC 컨텍스트에서 307(Temporary)로 응답 — 기능상 `/dashboard` 북마크가 `/profile` 로 보존됨(PRD §9 q4=b 충족). PR 본문도 307 로 기록 → 정합.
> nav 의 "대시보드" 메뉴 항목 자체 제거는 PR2 영역(navItems.ts 에 `/dashboard`·`/market` 잔존). PR1 은 리다이렉트로 동선만 보존 — PRD §3.3 명시대로이며 클릭 시 깨지지 않음.

### AC-9 조회 전용 스코프 무위반 — PASS

| 재현 절차 | 기대 | 실측 | 판정 |
|-----------|------|------|------|
| `git grep -rn "order\|주문\|매수\|매도" app/api` | 0건 | **exit 1, 0건** | PASS |
| `git grep -niE "예수금\|주문가능\|실현손익\|입출금" components/profile lib/copy/profile lib/mock/profile lib/types/profile` (주석 제외) | 활성 기능 0 | 매치는 **JSDoc 주석 3건(미노출 명시)** 뿐, 실제 렌더/타입 필드 0 | PASS |

`Portfolio`/`Holding` 타입에 거래성 필드 부재. 마이페이지 자산 섹션은 평가/비중 표시만(조회 전용).

### AC-10 DESIGN 정합 — PASS

| 재현 절차 | 기대 | 실측 | 판정 |
|-----------|------|------|------|
| 신규 자산 컴포넌트 hex 직타 | 0건 | `git grep -rnE "#[0-9a-fA-F]{6}" AssetDonut/AssetHero/AssetSection/HoldingsTable/ProfilePage` → **exit 1, 0건** | PASS |
| 도넛 자산군색 | asset-stock/coin, 등락색 미사용 | AssetDonut `text-asset-stock`/`text-asset-coin`/`text-border-line`(트랙). signal-up/down 미사용 | PASS |
| 보유종목 수익률만 등락색 | signal-up=빨강/down=파랑 | HoldingsTable 수익률 셀만 `signal-up-text`/`signal-down-text`. 평가액·비중은 `text-strong` | PASS |
| 토큰 경유(직타 0) | 토큰 cascade | `donut-size`/`donut-thickness`/`table-row-h`/`table-cell-px`(tailwind.theme.json) + `asset-hero`/`holdings-table-*`(app/components.css `@layer components`) | PASS |

> AC-10 의 globals.css asset 토큰 직접 정의는 **없으나**(grep 0), 본 PR 은 의도적으로 `tailwind.theme.json`(색·spacing) + `app/components.css`(합성 클래스) 경로로 주입(PR 본문 "토큰 주입 (a) 방식" 명시). `asset-stock`/`asset-coin` 색은 v8 기존 토큰(tailwind.theme.json:24-27) 재사용 — 신규 색 0. **라이브 컴파일 검증으로 토큰 적용 입증**(§3).
> `components/profile/StockDailyChart.tsx` 의 hex 6건은 **PR1 무관 기존 파일**(`/profile/[ticker]` 종목 상세, finsight-redesign 산출물) — PR1 변경 대상 아님.

---

## 3. DESIGN 토큰 라이브 동기화 검증

PR 의 `design:sync` 는 source 가 `finsight-redesign.md` 로 고정돼 v9 토큰을 자동 export 하지 못한다(PR 본문 명시). PR1 은 **(a) `tailwind.theme.json` 직접 병합 + `app/components.css` 합성** 방식. 라이브 반영을 다음으로 검증:

**3.1 빌드 산출 CSS 에 토큰 컴파일 확인** (서빙되는 CSS 청크 직접 검사):
```
asset-stock #1e40af   x2     asset-coin #c2410c   x2
donut-size 168px      x2     donut-thickness 22px x1     table-row-h 48px x3
holdings-table-row/asset-hero/holdings-table-header 클래스 컴파일됨
signal-up #c81e1e     x4     signal-down #1d4ed8  x2
```

**3.2 토큰 변경 → 화면 반영 → 복원** (라이브 mutate 테스트):
```
1) tailwind.theme.json: "asset-stock": "#1e40af" → "#00ff00" 임시 변경
2) npm run build → exit 0
3) next start 재기동, /profile CSS 청크 재검사:
   #00ff00 count=2 (반영됨)  /  #1e40af count=0 (사라짐)
4) git checkout tailwind.theme.json → "#1e40af" 복원, working tree clean
5) npm run build → exit 0 (원복 확인)
```
→ 토큰 파이프라인이 화면까지 실제로 연결됨 확인. **PASS.**

---

## 4. 라운드트립 (수동 시나리오, 프로덕션 서버 `127.0.0.1:3148`)

> BE(:8000) 다운(`curl /health` → 000). PR1 자산 섹션은 mock-only 라 무영향(scope: 계좌 mock).
> 두 뷰포트 — SSR 마크업은 뷰포트 무관이며 반응형은 Tailwind `lg:`/`md:`/`sm:` + `overflow-x-auto` 로 처리. 해당 클래스 SSR 존재로 두 뷰포트 동작 입증.

| # | 시나리오 | 절차 | 기대 | 실측 | 판정 |
|---|----------|------|------|------|------|
| a | `/dashboard` 접근 | `curl -sD-` | 307 → /profile | `307 Temporary Redirect` + `location: /profile`, follow 시 200 | PASS |
| b | `/profile` "내 자산" 섹션 | SSR grep | 섹션 타이틀·총자산·손익 | `내 자산`·`총 자산 평가 금액`·`투자 원금`·`평가 손익` 렌더. 총자산 `₩ 142,500,000` / 원금 `₩ 135,000,000` / 손익 `₩ 7,500,000`(콤마 정합) | PASS |
| c | 자산비중 도넛 | SSR `<circle>` | 도넛 3 세그먼트(track+stock+coin) | `<circle>` x3, `asset-stock` x4 / `asset-coin` x3 클래스, 가운데 "자산" 요약 | PASS |
| d | 보유종목 전체 테이블 | SSR | 종목명·평가액·수익률·비중 4열 + 3행 + aria-sort | `종목명/평가액/수익률/비중` 헤더, `aria-sort` x4, `holdings-table-row` x3(삼성전자 ₩45,000,000 / 비트코인 ₩35,200,000 / 애플 ₩24,500,000) | PASS |
| e | 등락색(한국식) | SSR class | 수익률 양수=빨강/음수=파랑, 도넛은 자산군색 | `text-signal-up`(손익 +4.2%) x3 / `signal-down-text`(비트코인 -1.4%) x2. 도넛은 등락색 0 | PASS |

**반응형 클래스 SSR 존재**(두 뷰포트 입증): `lg:flex-row`(데스크탑 도넛 우측) x1 / `lg:flex-col`(데스크탑 범례 세로) x1 / `sm:flex-row` x1 / `md:grid-cols-2`(데스크탑 카드 2단) x1 / `overflow-x-auto`(모바일 테이블 가로 스크롤 폴백) x2. 모바일(375)은 세로 스택 + 테이블 가로 스크롤, 데스크탑(1280)은 도넛 우측 + 2-col 카드.

SSR hydration: AssetHero/AssetSection/AssetDonut server component, HoldingsTable 만 client(정렬 상태) — 모바일-퍼스트 마크업 일관, StrictMode 더블 마운트 무관(정렬은 idempotent useMemo).

---

## 5. 에지 케이스

| 케이스 | 검증 | 결과 |
|--------|------|------|
| BE 다운(ECONNREFUSED) | `/health` 000 상태에서 `/profile` 렌더 | **200 정상** — 자산 섹션 mock-only 로 BE 무관(BFF 호출 0) |
| 빈 보유종목 | `HoldingsTable` rows.length===0 분기 | `HOLDINGS_EMPTY` "보유 종목이 없습니다." 카피 렌더(코드 경로 존재) |
| 비중 0-나눗셈 | `total > 0 ? ... : 0` 가드 | NaN 방지됨 |
| StrictMode 더블 마운트 | HoldingsTable useMemo 정렬 | 순수 함수 — 더블 마운트 부작용 0 |
| Tailwind preflight 잔여물 | build 산출 CSS | preflight 정상(기존 v8 유지), 신규 토큰만 추가 |

---

## 6. 공통 회귀 게이트

| 항목 | 명령/방법 | 결과 |
|------|-----------|------|
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | 3건 모두 **route handler fallback**(`/api/whitelist/search`, `/api/workbench/_adapters/fastapi.ts`) — 규정상 제외 대상. 신규 0 — PASS |
| profile BFF 직호출 | `git grep -nE "fetch\(|axios" components/profile 'app/(main)/profile'` (주석 제외) | **0건** — 자산 섹션 mock-only PASS |
| 한글 톤 | `lib/copy/profile/labels.ts` | "마이페이지/내 자산/총 자산 평가 금액/투자 원금/평가 손익/주식/코인/보유 종목/종목명/평가액/수익률/비중" — 자연스러운 한국어, ticker/단위 외 한글 정합 PASS |
| 접근성 | HoldingsTable | 정렬 헤더 `<th scope="col" aria-sort=...>` + `<button type="button">`(Tab/Enter 동작), 도넛 `role="img" aria-label`, 아이콘 `aria-hidden` — PASS |

**PR2 자산 보존 회귀**: `components/dashboard/MarketSnapshotCard.tsx`, `lib/mock/dashboard/{fearGreed,marketSnapshot}.ts`, `lib/types/dashboard/{fearGreed,marketSnapshot}.ts`, `lib/copy/dashboard/labels.ts`(FEAR_GREED_TITLE 등) 전부 보존 — PR2(홈 시장심리)가 재활용. typecheck 0 으로 import 무결성 확인. (PRD 회귀 항목이 언급한 `lib/mock/dashboard/{fearGreed,marketSnapshot}.ts` 경로는 실제로 존재 — 정합.)

---

## 7. 판정 / 후속

- 판정: **qa-passed** (PR1 해당 AC-2/4/8/9/10 전부 통과, 실패 0건, 공통 회귀 게이트 통과)
- 라벨: `impl-ready` 제거 + `qa-passed` 부여
- PR 본문에 `## 다음 작업` 절 존재 확인(PR2 후속 + dashboard 툴팁 cleanup + 실계좌 연동) — handoff append 게이트 충족
- 후속(본 PR 머지 후): **PR2 — 홈 시장종합 + nav/사이드바 재편**(홈 교체, `/market`→`/` 리다이렉트, AI분석 사이드바 하단 "준비 중", nav 6→4, 공포탐욕 게이지·공시 — DESIGN.md `fng-*`/공시/검색/nav-준비중 토큰 그때 주입). PR1 이 보존한 MarketSnapshotCard·mock 재활용.

이상.
