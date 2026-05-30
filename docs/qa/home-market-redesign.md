# QA — home-market-redesign (PR1: 계좌 위젯 마이페이지 이전)

- 슬러그: `home-market-redesign`
- PR: #49 (브랜치 `feature/home-market-redesign`, base `main`)
- 작성일: 2026-05-30
- QA 에이전트
- 판정: **qa-failed** (실패 4건 + 차단성 1건)

---

## 0. 핵심 결론 (요약)

PR #49 본문은 다음 변경을 주장한다:

- `components/profile/PortfolioHero.tsx`, `components/profile/HoldingsTable.tsx` 신규
- `app/(main)/profile/page.tsx` "내 자산" 섹션 추가
- `app/(main)/dashboard/page.tsx` → `/profile` 308 리다이렉트로 교체
- `app/globals.css` asset-stock/coin 토큰 추가

그러나 **PR 브랜치에는 위 구현 커밋이 존재하지 않는다.** 브랜치 HEAD 가 `main` 과의 merge-base 와 동일하며(`docs(prd)` 2커밋만 포함), `main...origin/feature/home-market-redesign` diff 가 **빈 결과(0 파일 변경)** 다. PR 본문에 명시된 신규 파일·리다이렉트·토큰은 모두 부재한다. DESIGN 문서(`docs/design/home-market-redesign.md`)도 로컬 untracked 상태이며 원격 브랜치에 커밋되지 않았다.

즉 이번 PR1 은 **PRD 문서만 올라온 상태이고 구현은 미푸시(또는 미작성)** 다. 따라서 PR1 의 핵심 AC(AC-2/AC-4/AC-10) 가 모두 미충족이다.

### 증거 (브랜치 상태)

```
$ git rev-parse origin/feature/home-market-redesign   # e5c916b...
$ git merge-base main origin/feature/home-market-redesign  # e5c916b... (동일)
$ git diff --stat main...origin/feature/home-market-redesign
(출력 없음 — 0 파일 변경, exit 0)
$ git status --short
(working tree clean)
```

```
$ ls -1 components/profile/
ProfileCard.tsx
ConnectedExchangesCard.tsx
SettingsMenuCard.tsx        # ← PortfolioHero.tsx / HoldingsTable.tsx 부재
```

```
$ git cat-file -e origin/feature/home-market-redesign:docs/design/home-market-redesign.md
NOT_ON_REMOTE               # DESIGN 문서 미커밋
```

---

## 1. 빌드 / 품질 게이트 (AC-8)

| 항목 | 명령 | 결과 | 판정 |
|------|------|------|------|
| typecheck | `npm run typecheck` | exit 0, 0 에러 | PASS |
| lint | `npm run lint` (`eslint .`) | exit 0, 0 에러 | PASS |
| build | `npm run build` (Next 15.5.4 Turbopack) | `✓ Compiled successfully`, 14/14 static pages, exit 0 | PASS |
| test | `npm run test` (`vitest run`) | exit 1 — **2 Failed Suites** | FAIL |

### test 실패 상세

```
FAIL  tests/lib/format.test.ts [ tests/lib/format.test.ts ]
FAIL  tests/components/WatchlistTable.test.tsx
Error: Failed to load url ../../components/ui (resolved id: ../../components/ui)
       in .../tests/components/WatchlistTable.test.tsx. Does the file exist?
 Test Files  2 failed (2)
      Tests  no tests
```

- 원인: 테스트 파일의 모듈 경로 해석 실패(`../../components/ui` alias 미해석). PR1 코드 변경이 0건이므로 이는 **`main` 기준 기존(pre-existing) 환경 실패**이며 PR1 이 새로 유발한 회귀는 아니다.
- 다만 AC-8 은 `npm run test 통과`를 명시하므로 게이트 자체는 **미충족**으로 기록한다. (구현 PR 재푸시 시점에 vitest 경로 설정 동반 수정 필요.)

> typecheck/lint/build 가 통과하는 것은 정상이다 — PR1 구현이 부재하여 코드 변경이 없기 때문이며, "통과"가 곧 구현 완료를 의미하지 않는다.

---

## 2. AC 별 검증

### AC-2 계좌 위젯 마이페이지 이전 + 전체 테이블 — **FAIL**

| # | 재현 절차 | 기대 | 실측 |
|---|-----------|------|------|
| 2a | `git grep -rn "PortfolioHero\|HoldingsTop3\|HoldingsTable\|내 자산" components/profile` | 1건 이상(자산 섹션 존재) | **exit 1, 0건** — 자산 섹션 부재 |
| 2b | `git grep -rn "PortfolioHero\|HoldingsTop3" components/dashboard 'app/(main)/dashboard'` | 0건(원위치 제거) | **다수 매치** — `components/dashboard/PortfolioHero.tsx`, `HoldingsTop3.tsx` 잔존, `app/(main)/dashboard/page.tsx` 가 여전히 import |
| 2c | `/profile` 렌더에서 보유종목 전체 테이블(종목명·평가액·수익률·비중, 정렬) 확인 | 전체 테이블 | **부재** — `app/(main)/profile/page.tsx` 는 ProfileCard/ConnectedExchangesCard/SettingsMenuCard 3개만 렌더, 자산 섹션 없음 |

`app/(main)/profile/page.tsx` 현재 내용:
```tsx
<div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
  <ProfileCard />
  <ConnectedExchangesCard />
  <SettingsMenuCard />
</div>
```
→ "내 자산"(PortfolioHero + HoldingsTable) 섹션이 없음. 위젯이 여전히 `/dashboard` 에 남아 있음. **AC-2 전 항목 미충족.**

### AC-3 프로필 카드 무회귀 — **PASS(부수적)**

- ProfileCard / ConnectedExchangesCard / SettingsMenuCard 파일·import 무변경. 코드 변경이 0건이므로 회귀 없음. (단 PR1 의 목적인 이전이 미수행이라 "무회귀"가 의미를 갖지 못함.)

### AC-4 라우트 리다이렉트 — **FAIL**

| 재현 절차 | 기대 | 실측 |
|-----------|------|------|
| `git grep -rn "redirect\|permanentRedirect" 'app/(main)/dashboard/page.tsx'` | 리다이렉트 코드 존재 | **exit 1, 0건** |
| `app/(main)/dashboard/page.tsx` 검사 | `/profile` 308 리다이렉트 | **여전히 PortfolioHero/HoldingsTop3/MarketSnapshotCard/FearGreedCard 를 렌더하는 일반 페이지** |

`/dashboard` 는 리다이렉트되지 않고 기존 대시보드 그대로 렌더됨. **AC-4 미충족.** (다른 라우트 `/profile`·`/watchlist`·`/analyze`·`/` 는 빌드상 14/14 페이지 생성 정상 — 깨짐 0이나, 이는 변경이 없어서다.)

### AC-9 조회 전용 스코프 — **PASS**

| 재현 절차 | 기대 | 실측 |
|-----------|------|------|
| `git grep -rn "order\|주문\|매수\|매도" app/api` | 주문 엔드포인트 0 | **exit 1, 0건** — 주문 엔드포인트 없음 |

기존 조회 전용 정책 유지. **충족.** (단, 마이페이지 자산 섹션 자체가 미구현이라 예수금/주문가능/실현손익/입출금 노출 여부는 검증 대상 화면이 없음 → 위반 가능성 0.)

### AC-10 DESIGN 정합 — **FAIL**

| 재현 절차 | 기대 | 실측 |
|-----------|------|------|
| `git grep -rn "asset-stock\|asset-coin" app/globals.css` | 토큰 존재(주식/코인 자산군색) | **exit 1, 0건** — 토큰 미정의 |
| `git grep -rnE "#[0-9a-fA-F]{6}" components/profile` | 토큰 외 hex 직타 0 | exit 1, 0건 (단 PortfolioHero/HoldingsTable 부재라 공허 통과) |
| 도넛 자산군색 / 보유종목 수익률만 등락색 | 시각 검증 | **검증 불가** — 컴포넌트 부재 |

DESIGN.md §2.1 의 `--color-asset-stock` / `--color-asset-coin` 토큰이 `app/globals.css` 에 추가되지 않음. **AC-10 미충족.**

---

## 3. 회귀 차단 (PR2 자산 보존)

| 자산 | 확인 | 결과 |
|------|------|------|
| `components/dashboard/MarketSnapshotCard.tsx` | 파일 존재 | 보존 |
| `components/dashboard/FearGreedCard.tsx` | 파일 존재 | 보존 |
| ProfileCard/ConnectedExchangesCard/SettingsMenuCard | 무변경 | 보존 |

PR2 가 쓸 컴포넌트는 깨지지 않았다. 단 이는 **PR1 이 아무 것도 옮기지 않아서** 보존된 것이며, 의도된 이전(PortfolioHero/HoldingsTop3 → profile)이 수행되면 다시 검증이 필요하다.

> 참고: PRD §회귀 항목이 언급한 `lib/mock/dashboard/{fearGreed,marketSnapshot}.ts` 경로는 현재 레포에 존재하지 않음(`find lib -iname "*fearGreed*"` 0건, `lib/mock/` 디렉터리 없음). MarketSnapshotCard/FearGreedCard 가 데이터를 인라인 보유하는 구조로 보임. PR1 미구현과 무관하나 PRD 의 해당 회귀 항목은 현 코드 구조와 불일치 — PR2 기획 시 경로 정정 권고.

---

## 4. 공통 회귀 게이트

| 항목 | 명령 | 결과 |
|------|------|------|
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | exit 1, 0건 (route handler fallback 제외 0) — PASS |
| 한글 톤 | (자산 섹션 미구현으로 신규 노출 문구 없음) | 검증 대상 없음 |
| 접근성(도넛 aria, 정렬 aria-sort, +/- 부호) | DESIGN §5 | **검증 불가** — 컴포넌트 부재 |

---

## 5. 라운드트립 (수동 시나리오)

PR1 핵심 라운드트립은 `/dashboard` → `/profile` 리다이렉트 및 `/profile` 자산 섹션 렌더 확인이다. 그러나:

- `app/(main)/dashboard/page.tsx` 에 리다이렉트 코드가 없어 `/dashboard` 는 기존 대시보드를 그대로 렌더 → **시나리오 (이전 후 dashboard 접근) 자체가 성립 불가.**
- `/profile` 에 자산 섹션(도넛·테이블·정렬·등락색)이 부재 → **렌더 확인 불가.**

구현 부재로 dev 서버 라운드트립은 의미 있는 검증이 불가능하여 생략(빌드는 14/14 페이지 정상 생성으로 기존 라우트 무손상만 확인). 구현 재푸시 후 다음 시나리오를 재검증해야 한다:

1. `/dashboard` 접근 → `/profile` 308 리다이렉트.
2. `/profile` "내 자산" → PortfolioHero(평가액·손익·수익률·도넛) 렌더.
3. HoldingsTable 전체 보유종목(종목명·평가액·수익률·비중) 렌더.
4. 컬럼 헤더 클릭 정렬(평가액·수익률·비중) 동작 + aria-sort.
5. 수익률 등락색(양수 빨강/음수 파랑) + +/- 부호 병기, 도넛은 자산군색만.

---

## 6. 실패 항목 종합

| AC | 항목 | 상태 | 재현/근거 |
|----|------|------|-----------|
| AC-2 | 계좌 위젯 이전 + 전체 테이블 | **FAIL** | profile grep 0건 / dashboard 잔존 / 자산 섹션 부재 |
| AC-4 | `/dashboard` → `/profile` 리다이렉트 | **FAIL** | redirect grep 0건, dashboard 페이지 기존 그대로 |
| AC-10 | DESIGN 정합(asset 토큰) | **FAIL** | globals.css asset-stock/coin grep 0건 |
| AC-8 | test 게이트 | **FAIL(기존)** | vitest 2 suite 모듈 경로 실패(main 기준 기존, 단 게이트 미충족) |

**차단성**: PR 본문이 주장하는 구현 일체가 브랜치에 미푸시(`main...head` diff 0). DESIGN.md 도 미커밋. → 코드 PR 로서 머지 불가.

---

## 7. 판정 / 후속

- 판정: **qa-failed**
- frontend-dev 재작업 필요:
  1. PR1 구현(PortfolioHero/HoldingsTable, profile 자산 섹션, dashboard 308 리다이렉트, globals.css asset 토큰)을 `feature/home-market-redesign` 브랜치에 **실제 커밋·푸시**.
  2. `docs/design/home-market-redesign.md` 를 같은 브랜치에 커밋(한 브랜치 한 PR 룰).
  3. `npm run test` 통과 — vitest `components/ui` alias 경로 해석 수정 동반(기존 실패이나 AC-8 게이트).
- 재푸시 후 본 리포트의 §2 AC 표 + §5 라운드트립을 재실행하여 재판정.

이상.
