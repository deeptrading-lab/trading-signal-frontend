# AGENTS — Trading Signal Frontend

이 저장소는 Trading Signal Engine의 Next.js 프론트엔드와 Vercel 배포 구성을 담당한다.

## 제품 구조

- UI: Next.js App Router (v16), TypeScript, React 19
- 스타일링: Tailwind v4 + DESIGN.md (Google Labs 포맷) → `tailwind.theme.json` 자동 동기화
- 데이터 페칭: TanStack Query v5 + axios (BFF 경유)
- 배포: Vercel
- BFF: Next.js route handler (`app/api/**/route.ts`) — 브라우저는 FastAPI를 직접 호출하지 않는다
- 분석 엔진: `trading-signal-engine` 의 FastAPI
- DB 예정: Supabase. MVP 현재 단계에서는 DB를 붙이지 않는다.

## 작업 원칙

- 사용자에게 노출되는 문구는 ticker, API 필드, 고유명사를 제외하고 한글을 기본으로 한다.
- 디자인 톤은 토스 서비스처럼 밝고 간결하며, 정보 밀도가 높고 조작이 빠른 금융 도구에 맞춘다.
- **BFF 패턴**: 브라우저는 FastAPI 를 직접 호출하지 않는다. Next.js route handler 가 `FASTAPI_BASE_URL` 로 프록시한다. 클라이언트 코드에서 `fetch(` 직접 호출 0건 (route handler 안만 예외).
- **스타일링**: Tailwind 유틸리티가 기본. `app/globals.css` 는 Tailwind 디렉티브 + preflight 가 흡수하지 못하는 잔여물에 한정. 합성 토큰 클래스는 `app/components.css` 의 `@layer components` + `@apply` 로 묶음.
- **디자인 토큰 동기화**: `docs/design/<slug>.md` (DESIGN.md) 가 단일 진실 원천. `npm run design:sync` 가 `tailwind.theme.json` 재생성 → `tailwind.config.ts` 가 import. 코드에 hex/px 직타 금지.
- **반응형**: CSS 측 1차 도구 = Tailwind 반응형 prefix (`md:`, `lg:`). JS 측 1차 도구 = `useBreakpoint` (`@/hooks/utils/useBreakpoint`). `window.innerWidth` 직접 검사 금지.
- **코드 컨벤션**: 자세한 룰은 [`docs/rules/frontend.md`](docs/rules/frontend.md) — 카멜케이스, 커스텀훅 의무화, `cn` 헬퍼, 도메인 한 뎁스 폴더, `lib/copy/` 유지, query key 단일 위치, layout.tsx 컨벤션, 반응형. FE Dev·reviewer 는 본 파일을 1차 근거로 본다.
- Supabase 키, Vercel 토큰, API secret 은 `.env.local` 또는 Vercel Environment Variables 에만 둔다.
- 커밋 메시지는 한글 요약을 기본으로 한다.

## 에이전트 역할

| 역할 | 책임 |
|---|---|
| PM | PRD, 스펙 변경, MVP 범위 관리. PRD 양식 1~7 + §8 영향 분석 + §9 OPEN QUESTION (PM 권고 동봉) 패턴 |
| UX/UI Designer | 토스톤 디자인 시스템, 화면 흐름, 상태/오류 UX. DESIGN.md 포맷 (`docs/rules/design-md.md`) + `design:sync` 파이프라인 |
| Frontend Dev | Next.js App Router, React, TypeScript, Tailwind v4 구현. `docs/rules/frontend.md` 컨벤션 8개 절 준수 |
| API Integration Dev | Next route handler (BFF), FastAPI contract, Supabase 연동 준비. `FASTAPI_BASE_URL` 단일 진입 |
| QA | 브라우저 플로우, 반응형 (두 뷰포트), API 실패 상태, DESIGN.md 토큰 라이브 동기화 검증 |
| Reviewer | 접근성, 타입 안정성, 보안, Tailwind 토큰 정합, BFF 패턴, HANDOFF 점검, Vercel 배포 리스크 |
| DevOps | Vercel 환경변수, 배포(preview/production), 도메인, 라벨 흐름 + 머지 |

## 작업 흐름 — 한 브랜치 한 PR

한 작업 단위 = 한 `feature/<slug>` 브랜치 = 한 PR. PRD·디자인·구현·QA·HANDOFF 모두 같은 브랜치에 누적 commit 하고 **최종 PR 한 번** 으로 머지한다.

```text
사용자 의도
  ↓
PM (PRD 워킹트리 작성, 별도 PR 안 만듦)
  ↓
[ feature/<slug> 브랜치 생성 ]
  ↓ commit: docs(prd): <slug> PRD 추가
UX/UI Designer (UI 포함 시) — DESIGN.md 같은 브랜치 commit
  ↓ commit: docs(design): DESIGN.md ...
Frontend Dev — 구현 commit 누적
  ↓ commit: feat/refactor/chore/...
  ↓ PR 생성 (impl-ready 라벨, gh pr create --assignee @me 즉시 지정)
QA — 같은 브랜치에 QA 리포트 push
  ↓ commit: docs(qa): <slug> QA 리포트
  ↓ qa-passed 라벨 → handoff-append workflow 자동 → commit: docs(handoff): #N
Reviewer
  ↓ review-approved 라벨 (자가 PR 차단 시 --comment + 라벨 fallback)
DevOps
  ↓ gh pr merge --squash --delete-branch
main 반영 + 브랜치 정리
```

- **PRD/DESIGN.md/QA 리포트를 위해 docs-only PR 을 별도로 만들지 않는다**. 모두 작업 PR 브랜치에 누적.
- PR 본문에 **`## 다음 작업` 섹션 필수**. `handoff-append.yml` workflow 가 이 섹션을 `docs/HANDOFF.md` 에 자동 채워준다.
- 자가 PR (작성자 = reviewer 본인) 의 경우 GitHub native `--approve` 가 막힌다 — `--comment` 로 승인 본문 + `review-approved` 라벨로 승인 상태 표시.
- 라벨이 한 단계라도 빠진 PR 은 머지 불가 (impl-ready → qa-passed → review-approved).

## 산출물 위치

- PRD: `docs/prd/<slug>.md` (양식 1~7 + §8 영향 분석 + §9 OPEN QUESTION)
- 디자인: `docs/design/<slug>.md` (DESIGN.md 포맷, `npx @google/design.md lint` errors=0)
- QA: `docs/qa/<slug>.md` (AC 별 재현·기대·실측 표 + 라운드트립 + 에지 케이스)
- 에이전트 정의: `.claude/agents/*.md`
- 코드 컨벤션: `docs/rules/frontend.md` (8개 절)
- 인수인계 로그: `docs/HANDOFF.md` (qa-passed 자동 append)

## 호출 구조 (도메인 공통 패턴)

라우트는 `app/(main)/` 그룹 아래 도메인별로 나뉜다 (`home`·`market`·`stock`·`profile`·`watchlist`·`dashboard`·`analyze`). 각 도메인은 아래 동일 계층을 따른다.

```text
Browser
↓ axios (same-origin, baseURL "/api" — lib/api/client.ts)
React 컴포넌트 (app/(main)/<route>/page.tsx, components/<domain>/*)
↓ hooks/<domain>/use* (도메인 훅)
↓ hooks/query/useQuery~ / useMutation~ (TanStack Query)
↓ lib/api/<domain>/*.ts (axios 클라이언트 함수)
↓ HTTP /api/*
Next.js route handler (app/api/**/route.ts) ← BFF 계층
↓ FASTAPI_BASE_URL (env) · 외부 시세 API (KIS·DART·CoinGecko 등)
trading-signal-engine FastAPI / 외부 데이터 소스
```

- 예: `workbench` 도메인은 `app/(main)/analyze/page.tsx` → `hooks/workbench/*` → `lib/api/workbench/*` → `app/api/workbench/analyze/route.ts` → FastAPI `analyze_workbench()`.
- 시세·공시 도메인(`market`·`stock`·`disclosure`)은 FastAPI 대신 외부 API(KIS·OpenDART·CoinGecko)를 route handler 가 프록시한다.

## 도메인·폴더 표준

```text
app/                  Next.js App Router 진입 (layout/providers + api/ BFF + login 등)
app/(main)/<route>/   라우트 그룹 + 도메인별 page (home·market·stock·profile·watchlist·dashboard·analyze)
components/<domain>/   화면별 컴포넌트 (home·market·profile·watchlist·dashboard·workbench 등)
components/layout/     재사용 layout 컴포넌트 (Sidebar·BottomNav·HeaderMarketTicker 등)
components/ui/         (예정) 도메인 무관 원자 컴포넌트
hooks/<domain>/        도메인 커스텀훅 (auth·disclosure·market·profile·stock·watchlist·workbench)
hooks/query/           TanStack Query 페칭 훅 + queryKeys
hooks/utils/           도메인 무관 React 훅 (useBreakpoint 등)
lib/api/               client.ts·errors.ts (인프라) + <domain>/ (도메인 클라이언트: kis·dart·coingecko·market·stock·workbench 등)
lib/auth/              앱 비밀번호 게이트 세션 유틸
lib/copy/<domain>/     UI 노출 한글 카피 (i18n 여지)
lib/types/<domain>/    BE 응답·요청 타입
lib/validation/<domain>/  입력 사전 차단
lib/mock/<domain>/     로컬/폴백용 목 데이터
lib/query/             TanStack Query 인프라 (클라이언트 설정 등)
lib/utils/             도메인 무관 헬퍼 (cn, formatMoney, formatPct 등)
```
