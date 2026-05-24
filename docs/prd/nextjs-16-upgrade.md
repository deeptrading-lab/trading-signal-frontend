# PRD: nextjs-16-upgrade

- **slug**: `nextjs-16-upgrade`
- **작성일**: 2026-05-24
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: finsight-redesign 시리즈 **PR7 머지 직후 (main `4b13419`), PR8 진입 직전**. finsight-redesign 시리즈 내부가 아닌 **별도 chore PR** 로 진행한다 (사용자 결정 2026-05-24, "옵션 A").
- **UI 포함 여부**: no (의존성 메이저 업그레이드 — 사용자 화면·UX·디자인 토큰 무변경. 디자이너 합류 트리거 아님).
- **선행 / 후행 관계**: 선행 = PR7 머지된 main (`4b13419`). 후행 = finsight-redesign PR8 (HomeDashboard 이후 트랙) — 본 chore 머지 후 main 기준으로 즉시 진입한다. finsight-redesign 시리즈 base 갱신은 §9 q4 에서 다룬다.

## 1. 배경 / 문제

사용자 dev 환경에서 새로고침 시 다음 에러가 반복 발생한다.

```text
TypeError: ...segment-explorer-node.js
  at SegmentViewNode (...)
  ... manifest ...
```

이 에러는 Next.js 15.5.x dev tools 의 Webpack HMR + segment-explorer 결합 버그로 알려져 있다. 본 저장소의 코드 결함이 아니다 (재현 환경: PR6/PR7 머지 후 main, react 19, Tailwind v4). 본 저장소 dev 모드가 강제로 Turbopack 이 아닌 Webpack 인 한, 패치만으로는 해결되지 않는다.

해결책으로 **Next.js 16.2.6 (latest stable) 메이저 업그레이드** 를 선택했다. 16 부터 `next dev` / `next build` 가 기본 Turbopack 으로 동작하므로 위 Webpack devtools 경로 자체를 회피한다. 본 저장소는 이미 16 호환 환경 (Tailwind v4 + React 19 + App Router 전용 + Pretendard next/font/local + Node 20.19.6 + TS 5.7+) 이라 마이그레이션 비용이 낮다.

사용자 추가 지시 (2026-05-24):

> "옵션1로 하면서 버전 업하면서 변경점 확인해서 지금 코드에 문제될 수 있는거 검토하고 진행해"

PM 은 Next.js 16 release notes 의 breaking change 19개를 본 저장소 코드와 일일이 대조했다. 결과는 §3 / §8 에 정리한다.

## 2. 목표

- `next` ^15.5.18 → ^16.2.6 으로 메이저 업그레이드한다.
- dev 모드의 `segment-explorer-node` manifest 에러 해소를 확인한다 (Turbopack 기본 진입으로 우회).
- 사용자 화면·라우트·BFF·디자인 토큰 회귀 0 을 유지한다 (4 라우트 라운드트립, 양 뷰포트).
- Next.js 16 breaking change 19건을 본 저장소 코드와 대조하고, 영향 없는 16건과 영향 있는 3건을 §8 에 명시한다.
- 빌드·타입·린트 0 에러를 유지한다.
- 본 chore 후 finsight-redesign 시리즈 PR8 이 동일한 main 기준으로 즉시 진입할 수 있게 한다.

## 3. 범위 (In scope)

- **의존성 갱신**
  - `package.json`
    - `next` ^15.5.18 → ^16.2.6
    - `eslint-config-next` ^15.5.18 → ^16.2.6
  - `package-lock.json` 재생성 (`npm install`).
- **설정 무변경 확인**
  - `next.config.ts` — 현재 옵션 (`reactStrictMode: true`, `outputFileTracingRoot: path.join(__dirname)`) 모두 16 호환. **변경 없음**.
  - `tsconfig.json` — 16 호환 (TS 5.7+, target ES2022). **변경 없음**.
  - `eslint.config.mjs` — 이미 Flat Config. eslint-config-next v16 도 Flat Config 정합. **변경 없음 (의존성 버전만 갱신)**.
  - `app/globals.css` / `tailwind.config.ts` / `postcss.config.mjs` — Tailwind v4 + @tailwindcss/postcss 가 이미 Turbopack 정합 (PR3 검증 완료). **변경 없음**.
- **검증 (AC §5)**
  - `npm run typecheck` / `npm run lint` / `npm run build` 0 에러.
  - dev 모드 (`npm run dev`) — Turbopack 기본 출력 확인 + segment-explorer-node 에러 해소 확인.
  - 4 라우트 라운드트립: `/`, `/dashboard`, `/analyze`, 3 stub (`/market`, `/watchlist`, `/profile` 404).
  - 양 뷰포트 (375 / 1280) 시각·동작 무회귀.
  - `/analyze` 의 BFF (`/api/workbench/analyze`) FastAPI 미기동 시 502 + 한글 폴백 무회귀.
  - bundle size 측정 + baseline 대비 회귀 분석 (`/` 223 KB / `/analyze` 152 KB / `/dashboard` 103 KB).

## 4. 비범위 (Out of scope)

- **React Compiler 도입** (`reactCompiler: true`). 자동 메모이제이션 — compile time 영향 큼. 별도 chore PR 로 분리. §9 q1.
- **Cache Components 도입** (`cacheComponents: true`). 캐싱 paradigm shift — 신중 검토 필요. 별도 chore PR. §9 q2.
- **Turbopack File System Caching beta** (`experimental.turbopackFileSystemCacheForDev: true`). 안정성 확인 후 별도 chore PR. §9 q3.
- **finsight-redesign 시리즈 PR8/PR9 의 코드·UI·디자인 변경**. 본 PRD 는 의존성 메이저 업그레이드 한정. PR8 은 본 chore 머지 후 즉시 진입.
- **React / react-dom / TypeScript / Tailwind 등 다른 의존성 메이저 업그레이드**. 본 PRD 는 `next` + `eslint-config-next` 만.
- **next.config.ts 옵션 추가 / 변경** (예: `images.*`, `experimental.*`). 현재 옵션 그대로 유지.
- **테스트 (단위·E2E·시각 회귀) 도입**.
- **Vercel 환경변수·도메인·배포 hook 변경**. Vercel 미연동 상태 그대로 (별도 트랙).

## 5. 수용 기준 (AC)

- **AC-NEXT16-1**: `npm ls next` 출력에 `next@16.x.x` (구체적으로 16.2.6 또는 그 이상의 16.x). v15 잔존 0.
- **AC-NEXT16-2**: `npm ls eslint-config-next` 출력에 `eslint-config-next@16.x.x`. v15 잔존 0.
- **AC-NEXT16-3**: `npm run build` 출력 헤더에 `Next.js 16` 표기 + Turbopack 기본 활성 메시지 (예: `▲ Next.js 16.x.x (Turbopack)`) 확인.
- **AC-NEXT16-4**: `npm run typecheck` / `npm run lint` / `npm run build` 세 명령 모두 exit code 0, 에러·실패 0건.
- **AC-NEXT16-5**: 4 라우트 라운드트립 — `/` (home), `/dashboard`, `/analyze`, 3 stub (`/market`, `/watchlist`, `/profile` → 404 페이지) 가 양 뷰포트 (375 / 1280) 에서 시각·동작 무회귀. 캡처·실측은 QA 리포트에 첨부.
- **AC-NEXT16-6**: `/analyze` 페이지에서 분석 실행 → `/api/workbench/analyze` BFF 호출 → FastAPI 미기동 시 502 응답 + 한글 폴백 메시지 표시 (PR5 정합 회귀 0).
- **AC-NEXT16-7**: `npm run dev` 후 `/` 새로고침 5회 — `segment-explorer-node` manifest 에러 0건 (사용자 dev 실측). 발생 시 QA 단계에서 OPEN QUESTION 으로 격상.
- **AC-NEXT16-8**: `npm run build` 출력의 라우트별 First Load JS / Bundle size 측정 → baseline (`/` 223 KB / `/analyze` 152 KB / `/dashboard` 103 KB) 대비 ±15% 이내. Turbopack build output 차이로 ±15% 초과 시 QA 리포트에 회귀 분석 + OPEN QUESTION 으로 격상.

## 6. 가정 / 제약

- **선행 머지 전제**: finsight-redesign PR7 머지된 main (`4b13419`) 기준.
- **시리즈 외 별도 chore PR**: finsight-redesign PR 시리즈 외부에서 진행. `chore/nextjs-16-upgrade` (또는 등가) 브랜치를 main 에서 분기.
- **Node / TS 버전 가정**: 로컬 Node 20.19.6 (16 요건 20.9+ 만족) / TypeScript 5.7+ (16 요건 5.1+ 만족).
- **Vercel 미연동 가정**: PR build 자동화 hook 미연결. CI 회귀는 로컬 검증 기반. 시리즈 종료 후 Vercel 연동 시 본 chore 의 build output 차이가 영향 줄 수 있음을 인지 (별도 트랙).
- **BE 미기동 가정 유지**: `/analyze` 의 FastAPI 호출은 실제 BE 미기동 환경에서 502 + 한글 폴백을 검증한다. BE LIVE 검증은 별도 트랙.
- **사용자 dev 실측 의존**: AC-NEXT16-7 (segment-explorer-node 에러 해소) 은 사용자 실측이 필요. QA 단계에서 사용자에게 dev 5회 새로고침 결과를 받는다.

## 7. 참고

- 본 저장소
  - `package.json` — next ^15.5.18 / react ^19.0.0 / eslint-config-next ^15.5.18 / typescript ^5.7.0
  - `next.config.ts` — reactStrictMode + outputFileTracingRoot
  - `eslint.config.mjs` — Flat Config
  - `tailwind.config.ts` + `app/globals.css` — Tailwind v4 + @tailwindcss/postcss
  - `app/api/workbench/analyze/route.ts` — BFF 한글 폴백 경로
- 외부
  - Next.js 16 release notes / upgrade guide (breaking change 19건)
  - Vercel blog — Next.js 16 stable announcement
- 인접 PRD
  - `docs/prd/finsight-redesign.md` — 시리즈 전체 컨텍스트
  - `docs/prd/tailwind-migration.md` — Tailwind v3 정착 (이후 PR2 에서 v4 로 진입)
- 인수인계
  - `docs/HANDOFF.md` — PR1~PR7 entry 누적
  - `docs/SESSION_NOTES.md` — 최신 세션 (시리즈 PR 분할 + chore 트리거 결정)

## 8. 영향 분석

### 8.1 변경 라인 추정

- `package.json` — 2 라인 변경 (next, eslint-config-next 버전 문자열).
- `package-lock.json` — 수백~수천 라인 변경 (npm 재생성). 본 lock 은 PR 본문에서 "auto-regenerated" 명시.
- **소스 코드 변경 0 라인** (next.config.ts 등 설정 무변경).
- 문서: 본 PRD 1 파일 + QA 리포트 1 파일 + (자동) HANDOFF entry.

총 사람-에디트 라인 = 약 **2 라인 (package.json) + PRD/QA 문서**. lock 재생성은 자동. small chore.

### 8.2 본 저장소 무영향 breaking change (16건)

Next.js 16 release notes 의 breaking change 중 다음 16건은 본 저장소 코드와 grep 대조 결과 **사용 0건** — 영향 없음.

1. `middleware.ts` → `proxy.ts` rename — 본 저장소 middleware 0건.
2. AMP 제거 — 본 저장소 AMP 0건.
3. `next lint` 제거 — 본 저장소 `scripts.lint = "eslint ."` 로 next lint 미사용.
4. `devIndicators` 일부 옵션 제거 — 본 저장소 devIndicators 미사용.
5. `serverRuntimeConfig` / `publicRuntimeConfig` 제거 — 본 저장소 미사용.
6. `experimental.turbopack` → top-level `turbopack` 이동 — 본 저장소 미사용.
7. `experimental.dynamicIO` → `cacheComponents` rename — 본 저장소 미사용.
8. `experimental.ppr` 제거 — 본 저장소 미사용.
9. `unstable_rootParams()` 제거 — 본 저장소 미사용.
10. async `params` / `searchParams` (다이나믹 라우트) — 본 저장소 다이나믹 라우트 0건 (모든 라우트 정적).
11. async `cookies()` / `headers()` / `draftMode()` — 본 저장소 미사용.
12. Metadata image route 변경 — 본 저장소 미사용.
13. `next/image` local src query 변경 — 본 저장소 `next/image` 0건.
14. `images.*` defaults 변경 — 본 저장소 next/image 0건.
15. `revalidateTag()` signature 변경 — 본 저장소 미사용.
16. Parallel routes `default.js` 필수 — 본 저장소 병렬 라우트 0건.

### 8.3 본 저장소 영향 breaking change (3건)

1. **Turbopack 기본** — `next dev` / `next build` 가 Webpack 대신 Turbopack 으로 동작. 본 저장소 Tailwind v4 + @tailwindcss/postcss 는 이미 Turbopack 정합 (PR3 검증). dev 모드 segment-explorer-node 에러 우회 기대.
2. **eslint-config-next 메이저 갱신** — Flat Config 기본. 본 저장소 `eslint.config.mjs` 이미 Flat Config — 정합. 의존성 버전만 갱신.
3. **dev/build separate output directories** — `.next` 폴더 구조 변경 가능. 본 저장소 `.gitignore` 정착. CI/Vercel 미연동 상태라 영향 적음.

### 8.4 회귀 위험

- **위험-낮음**: Tailwind v4 / @tailwindcss/postcss / Pretendard next/font/local — Turbopack 정합 검증 완료 (PR2~PR3).
- **위험-낮음**: `/analyze` BFF route handler — 16 의 route handler API 무변경.
- **위험-중간**: dev mode HMR — Turbopack 의 HMR 동작이 Webpack 과 다름. 컴포넌트 props·context 갱신 패턴이 다를 수 있어 사용자 dev 실측 (AC-NEXT16-7) 의존.
- **위험-중간**: bundle size — Turbopack build output 차이. baseline ±15% 이내 가정 (AC-NEXT16-8). 초과 시 OPEN QUESTION 격상.
- **위험-낮음**: ESLint Flat Config — 이미 정합.

### 8.5 커밋 분할 권고

- **C1** `chore(deps): Next.js 15.5.18 → 16.2.6 + eslint-config-next 16` — package.json + package-lock.json 동시 commit.
- **C2** `docs(prd): Next.js 16 upgrade PRD` — 본 PRD 파일 (브랜치 첫 commit 으로 들어가도 무방).
- **C3** `docs(qa): Next.js 16 upgrade QA 리포트` — QA 통과 후 같은 브랜치 append.
- (자동) `docs(handoff): #N` — qa-passed 라벨 시점 자동 append.

C1 단일 commit 으로 묶어도 무방 (lock 재생성이 차지하는 비중이 커서 분리 의미 적음).

## 9. OPEN QUESTION

- **q1** [OPEN QUESTION] React Compiler (`reactCompiler: true`) 도입을 본 PRD 에 함께 묶을 것인가, 별도 chore PR 로 분리할 것인가?
  - **PM 권고**: **별도** chore PR. compile time 영향 + 메모이제이션 동작 변경의 회귀 검증 범위가 커서 본 chore (의존성 메이저 업그레이드) 와 섞으면 회귀 분석이 어려워진다. 본 chore 안정화 후 별도 진입.

- **q2** [OPEN QUESTION] Cache Components (`cacheComponents: true`) 도입을 본 PRD 에 함께 묶을 것인가?
  - **PM 권고**: **별도** chore PR. 캐싱 paradigm shift. 데이터 페칭 패턴 (TanStack Query v5 + axios + BFF) 과의 정합 검토가 별도로 필요. 본 chore 안정화 후 진입 여부 결정.

- **q3** [OPEN QUESTION] Turbopack File System Caching (`experimental.turbopackFileSystemCacheForDev: true`, beta) 도입을 본 PRD 에 함께 묶을 것인가?
  - **PM 권고**: **별도** chore PR. beta 단계로 안정성 확인 후 진입. dev 속도 가속 효과가 큰 경우 우선순위 상향.

- **q4** [OPEN QUESTION] 본 chore 머지 후 finsight-redesign 시리즈 PR8 진입 시, 기존 PR 시리즈 base 를 갱신해야 하는가?
  - **PM 권고**: **즉시 PR8 진입 (rebase 불필요)**. PR8 은 main 기준으로 분기되므로 본 chore 머지된 main 을 자연스럽게 이어받는다. 이미 열려 있는 finsight-redesign PR (PR1~PR7) 은 모두 머지 완료 — open 상태인 분기 없음. 후속 PR8/PR9 은 본 chore 머지된 main 에서 분기.
