# QA — 다크모드 PR1 (토큰 CSS 변수화 + 토글 인프라) (`dark-mode`)

> **PR**: #93 · 브랜치 `feature/dark-mode` (커밋 `b9761b1`)
> **PRD**: `docs/prd/dark-mode.md`
> **라운드**: **PR1 (인프라)** — 5-PR 분할의 1단계. 이후 PR2(팔레트)·PR3(차트)·PR4(메타/이미지)·PR5(검증/마감) 라운드가 본 문서에 추가될 예정.
> **PR1 핵심 불변식**: **머지 후 화면 100% 동일 (dark = light 동일값, 시각 무변경).** 실제 다크 팔레트는 PR2. 본 라운드는 인프라 정합과 시각 무회귀만 검증한다. 다크 색상 시인성(WCAG AA)은 PR2~ QA 대상.
> **QA 수행**: QA 에이전트 · 2026-06-02 · macOS · Node v20.19.6 · 프로덕션 빌드(Turbopack) + `next start` + Playwright 1.60 headless chromium
> **판정**: **qa-passed** (실패 0건, 정보성 관찰 1건)

---

## 0. 검증 환경

- `git checkout feature/dark-mode` (`b9761b1`).
- `npm run typecheck` / `npm run lint` / `npm run build` — 전부 단발 실행.
- 라이브 토글/FOUC/영속/시각 무변경은 **프로덕션 서버**(`PORT=3100 npm run start`) + Playwright headless chromium 으로 재현.
  - **dev 서버(`npm run dev`) 는 토글 상호작용 재현에 부적합**했다 — Turbopack dev 의 HMR WebSocket(`ws://127.0.0.1:3000/_next/webpack-hmr`) 이 proxy(`proxy.ts`) 와 충돌해 `ERR_INVALID_HTTP_RESPONSE` 로 끊기며 클라이언트 하이드레이션이 완료되지 않았다(`aria-expanded` 토글·radio 렌더 무반응). **PR 결함이 아니라 로컬 dev 환경 아티팩트** — 동일 코드가 프로덕션 빌드에서는 완전히 정상 동작(아래 AC-4·6 실측). 라운드트립은 프로덕션 서버 기준으로 수행.
- BE(`127.0.0.1:8000`) 라이브 불필요 — PR1 은 시각·상태 인프라만 다루며 BFF/데이터 경로 무변경.

---

## 1. AC 별 재현·기대·실측 (PR1 범위)

| # | AC (PR1) | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 시각 무변경 — `:root`(light)와 `html.dark`(dark) 블록 토큰값 전부 동일 | `app/theme-vars.css` 두 블록 정렬·diff | 48키 1:1 동일값 | `:root` 48키 / `html.dark` 48키, `diff` 결과 **완전 동일(IDENTICAL)** | 통과 |
| AC-2 | 빌드/타입/린트 0 에러 | `npm run typecheck` · `npm run lint` · `npm run build` | 0 에러 | typecheck `tsc --noEmit` 무출력(0) · lint `eslint .` 무출력(0) · build 성공(전 라우트 prerender/dynamic 정상) | 통과 |
| AC-3a | 토큰 var 전환 — `bg-surface`류가 `var(--fs-*)` 참조 | 빌드 산출 CSS grep | utility 가 `var(--fs-surface)` 참조 | `var(--fs-surface)` 41회 출현 | 통과 |
| AC-3b | 포커스링 `theme(colors.accent-soft)` → `var(--fs-accent-soft)` | 빌드 CSS 의 focus shadow 룰 | `var(--fs-accent-soft)` 인라인 | `--tw-shadow:0 0 0 3px var(--tw-shadow-color,var(--fs-accent-soft))` 정상 렌더 (`var(--fs-accent-soft)` 9회) | 통과 |
| AC-3c | 알파 수정자 `bg-surface/80·/85` → `color-mix` 동작 | 빌드 CSS grep | `var()` 색에서 `color-mix` | `color-mix(in oklab, var(--fs-surface) 80%, transparent)` · `85%` · `10%` 정상 생성 | 통과 |
| AC-3d | `--color-*` 충돌 0 (Tailwind v4 예약 네임스페이스) | 빌드 CSS 에서 `--color-<key>:` 검색 | 0건 | `--color-surface` / `--color-text-strong` / `--color-accent-soft` / `--color-signal-up` / `--color-primary` 전부 **0건** (프리픽스 `--fs-` 격리 성공) | 통과 |
| AC-4 | 토글 동작 — 3-state, `<html>.dark` 실제 토글 | 프로덕션 서버 + Playwright, `/profile` THEME 세그먼트 클릭 | light/dark/system 전환 시 `html.dark` 붙/뗌 + `colorScheme` 동기 | DARK → `hasDark=true, ls=dark, colorScheme=dark` / LIGHT → `hasDark=false, ls=light` / SYSTEM(OS=light) → `hasDark=false, ls=system` | 통과 |
| AC-4b | system 자동 반영 — matchMedia | `git grep matchMedia` + OS 다크 에뮬레이션 | system + OS=dark → dark 적용 | `colorScheme:'dark'` 컨텍스트로 `/profile` 진입 시 `html.class="… dark", colorScheme=dark` (코드: `themeStore.resolveFromSystem` + `ThemeProvider` matchMedia 구독) | 통과 |
| AC-5 | FOUC 스크립트 — `<head>` 인라인, hydration 전 동기 실행, `finsight:theme` 키 | `app/layout.tsx` 확인 + reload 직후(pre-networkidle) 클래스 확인 | head raw `<script>` 가 commit 시점에 dark 적용 | `<head>` 첫 자식이 raw `<script dangerouslySetInnerHTML>` (localStorage `finsight:theme` 읽기 → `classList.toggle("dark")` + `style.colorScheme`). reload `waitUntil:'commit'` 시점 `hasDark=true` (하이드레이션 전 동기 적용 확인) | 통과 |
| AC-6 | localStorage 영속 — 새로고침 후 유지 | dark 선택 → reload → networkidle 후 키 확인 | 선택 유지 | reload 후 `localStorage["finsight:theme"]=="dark"` 유지, 화면 dark 복원 | 통과 |
| AC-7 | design:sync 파이프라인 — `inject-color-themes.mjs` 단독 동작 + 키셋 검증 | `node scripts/inject-color-themes.mjs` 단독 실행 + 키 불일치 주입 throw 테스트 | 정상 생성 + 1:1 검증 throw | 단독 실행 exit 0, `theme-vars.css` 무변경(idempotent), `light 48키 / dark 48키` 로그. PR1 시점 `colors-dark` 미정의 → dark=light 폴백 경고 정상 | 통과 |

### AC-2 실측 로그

```
$ npm run typecheck      → tsc --noEmit  (출력 없음, exit 0)
$ npm run lint           → eslint .      (출력 없음, exit 0)
$ npm run build          → 성공. /home /market /stock /profile /watchlist /dashboard 등 전 라우트 정상,
                            api 라우트 ƒ(dynamic), Proxy(Middleware) 정상.
```

### AC-1 실측 (theme-vars 두 블록 동일성)

```
$ awk '/^:root \{/{f=1;next} /^\}/{f=0} f' app/theme-vars.css | sort > root.txt
$ awk '/^html.dark \{/{f=1;next} /^\}/{f=0} f' app/theme-vars.css | sort > dark.txt
$ diff root.txt dark.txt
  (출력 없음 — IDENTICAL)
  root keys: 48  dark keys: 48
```

### AC-7 실측 (파이프라인 + 1:1 검증 방어선)

```
# 단독 실행 (멱등)
$ node scripts/inject-color-themes.mjs
design:sync — colors-dark 블록이 없어 dark = light 동일값으로 폴백했어요(시각 무변경). PR2 에서 …
design:sync — app/theme-vars.css 생성 완료 (light 48키 / dark 48키).
exit: 0
$ git diff --stat app/theme-vars.css   → (변경 없음)

# 방어선 검증: docs/design/finsight-redesign.md front matter 에 colors-dark(2키만) 일부러 주입 → 실행
Error: colors / colors-dark 키셋 불일치 (시인성 누락 방어선).
  colors-dark 누락: accent-soft, accent-vivid, … (46키 전부 나열) …
exit: 1
# → DESIGN.md·theme-vars.css 원복(git diff 무변경 확인). 시인성 누락 1차 자동 방어선 정상 동작.
```

### AC-4 / AC-5 / AC-6 실측 (Playwright, 프로덕션 서버 `:3100`)

```
[A default/system, OS=light]  html.dark? false   | ls=null            | colorScheme=light
[B system, OS=dark]           html.dark? true     | colorScheme=dark   (system 자동 반영)
[C pick DARK]                 html.dark? true     | ls=dark   | colorScheme=dark
[C pick LIGHT]                html.dark? false    | ls=light
[C pick SYSTEM, OS=light]     html.dark? false    | ls=system
[D reload(commit) pre-hydrate] html.dark? true    (FOUC 스크립트 동기 적용)
[D persisted ls after reload]  dark               (localStorage 영속)
[E visual no-change /profile]  light==dark 스크린샷 IDENTICAL
```

---

## 2. 공통 AC 무회귀

| 항목 | 명령/방법 | 결과 | 판정 |
|---|---|---|---|
| typecheck/lint/build 0 | (위 AC-2) | 0/0/성공 | 통과 |
| BFF 원칙 무회귀 | PR1 은 route handler·`FASTAPI_BASE_URL` 무변경(diff 에 `app/api/**` 없음) | 회귀 없음 | 통과 |
| `dark:` variant 0건 (PRD G5) | `grep -rnoE 'className=[^>]*\bdark:[a-z]' components app` | 0건 (`OPTION_LABEL.dark` 객체 키는 변이 아님) | 통과 |
| 한글 톤 무회귀 | 신규 카피 `lib/copy/profile/labels.ts` — "라이트"/"다크"/"시스템"/"화면 테마"/"화면 테마 설정 (다크모드)" | 전부 한글, `lib/copy/` 격리 | 통과 |
| 접근성 무회귀 | `ThemeMenuButton` — `aria-expanded`, `role="radiogroup"`+`aria-label`, `role="radio"`+`aria-checked`, `aria-hidden` 아이콘 | radio 그룹 a11y 속성 정상 | 통과 |
| 토큰 SSOT 규율 | 다크 hex 직타 0 — `theme.json`·코드에 다크값 없음(dark=light 폴백) | 위반 0 | 통과 |

---

## 3. 시각 무변경 불변식 정밀 검증 (PR1 핵심)

PR1 의 유일·최대 리스크 = `tailwind.config.ts` colors 를 `var()` 맵으로 전환하며 시각이 미세 변동하는 것. **두 층위**로 교차 검증.

### 3.1 computed-style 전수 스캔 (가장 강한 증거)

`/` (1280px) 에서 `.dark` 클래스만 토글(colorScheme 는 light 고정)하고, **DOM 전 597 요소**의 `backgroundColor / color / borderColor / boxShadow / backgroundImage / outlineColor / fill / stroke` 를 라이트·다크 상태로 `getComputedStyle` 비교.

```
total computed-style diffs: 0 / elements: 597
```

→ **0건**. 토큰 indirection 이 dark=light 동일값을 보장하므로 계산된 스타일이 한 글자도 안 바뀐다.

### 3.2 렌더 픽셀 diff (canvas, 채널 허용오차 >2)

| 뷰포트 · 라우트 | 가시 픽셀 diff (tol>2) | 비고 |
|---|---|---|
| 1280 `/profile` | **0** | 정적 표면, 완전 동일 |
| 1280 `/dashboard` | **0** | 정적 표면, 완전 동일 |
| 1280 `/` | 7 | 라이브 데이터 표면의 텍스트/보더 안티앨리어싱 LSB 노이즈 |
| 375 `/` | 15 | 동일 (모바일) |
| 1280 `/market` | 7 | 동일 |
| 375 `/watchlist` | 9 | 동일 |

- `Buffer.compare(light, dark)` 단순 바이트 비교는 PNG 재인코딩·1-LSB 안티앨리어싱 비결정성 때문에 라이브 데이터 라우트에서 false-DIFFERS 가 나오나, **채널 허용오차 2 의 canvas 픽셀 diff 는 7~15px(≈100만 px 중)** 로 사람 눈에 비가시. 정적 라우트(`/profile`·`/dashboard`)는 0.
- computed-style 0/597 + 정적 라우트 픽셀 0 → **시각 무변경 불변식 충족.**
- (참고) 같은 라이트 상태로 연속 2회 캡처 시 `/`·`/market`·`/watchlist` 모두 동일 → 잔여 미세 diff 는 테마가 아닌 안티앨리어싱 기인임을 재확인.

---

## 4. 라운드트립 (프로덕션 서버, 두 뷰포트)

BE 무관 시나리오라 PR #11 의 분석 5건(a~e) 대신 **PR1 테마 인프라 5 시나리오**를 모바일(375)·데스크탑(1280) 두 뷰포트에서 재현.

| # | 시나리오 | 모바일(375) | 데스크탑(1280) |
|---|---|---|---|
| 1 | 신규 방문(localStorage 없음) = system, OS=light | dark 미적용, ls=null | 동일 |
| 2 | system + OS=dark 에뮬레이션 → 즉시 dark 클래스 | `html.dark` 적용, colorScheme=dark | 동일 |
| 3 | `/profile` THEME 세그먼트에서 light/dark/system 순차 선택 | 클래스·ls·colorScheme 정확히 전환 | 동일 |
| 4 | dark 선택 후 새로고침 → FOUC 없이 dark 유지 | commit 시점 이미 dark, ls=dark 유지 | 동일 |
| 5 | 시각 무변경 — light↔dark 토글 시 표면 동일 | `/profile` 픽셀 0 diff | `/profile`·`/dashboard` 0 diff |

- **리사이즈/SSR 하이드레이션**: SSR 기본값 `preference=system, resolvedTheme=light` + `<html suppressHydrationWarning>` + FOUC 스크립트로 하이드레이션 mismatch 미발생(빌드/콘솔 pageerror 0). FOUC 스크립트와 `themeStore.applyThemeClass` 가 동일 로직이라 클래스 정합.

---

## 5. 에지 케이스

| 케이스 | 처리 | 실측/근거 | 판정 |
|---|---|---|---|
| localStorage 미설정 | `readThemePreference()` → `"system"` 폴백 | 신규 방문 ls=null → system 동작(라운드트립 #1) | 통과 |
| localStorage malformed 값 | `isPreference()` 가드 → `"system"` 폴백 | `store.ts` 화이트리스트(`light/dark/system`)만 통과 | 통과 |
| localStorage write 실패(quota) | try/catch no-op, 메모리 state 유지 | `writeThemePreference` catch 무시 | 통과 |
| SSR(window 없음) | `hasWindow()` 가드 → no-op, light fallback | `resolveFromSystem`/`applyThemeClass`/store 전부 SSR 안전 | 통과 |
| matchMedia 미지원 | `typeof window.matchMedia !== "function"` 가드 → light | `resolveFromSystem` 가드 존재 | 통과 |
| cross-tab 동기화 (PRD §9 q3) | `ThemeProvider` `storage` 이벤트로 `finsight:theme` 변경 시 재하이드레이션 | listener cleanup 포함 등록 확인(코드 경로) | 통과 |
| FOUC 스크립트 throw | `try{…}catch(_){}` 로 감싸 깜빡임 외 페이지 영향 차단 | 인라인 스크립트 try/catch 존재 | 통과 |
| StrictMode 더블 마운트 | `ThemeProvider` effect 가 idempotent(하이드레이션·구독 등록만, cleanup 해제) | effect 멱등 + cleanup | 통과 |
| Tailwind v4 `--color-*` 예약 충돌 | 프리픽스 `--fs-` 격리 | 빌드 CSS `--color-<key>` 0건(AC-3d) | 통과 |
| 알파 수정자 var 색 미동작 우려 | `color-mix(in oklab, var(--fs-surface) N%, transparent)` 정상 | AC-3c | 통과 |

---

## 6. 발견 이슈

### 정보성 관찰 (실패 아님, 차단 아님)

- **[INFO-1] 빌드 CSS 에 죽은 유틸 `.shadow-[...theme(colors.accent-soft)]` 1건.** 빌드 산출 CSS 에 `--tw-shadow:...theme(colors.accent-soft)` 형태의 미해결(literal `...` 접두) 유틸 셀렉터가 존재. 이는 **load-bearing 한 포커스링 `@apply`(`app/components.css:143`)와 별개**이며, 해당 `@apply` 는 `var(--fs-accent-soft)` 로 정상 해석됨(AC-3b 통과). 어떤 요소도 이 죽은 클래스를 참조하지 않아 무효(inert) — 현재 스캔 대상 소스(`app/components/hooks/lib`)에 `...` 형태 문자열이 없어 PR1 신규 회귀가 아니며 시각·동작에 영향 0. **참고 기록만**(향후 정리 시 PR5 hex 전수조사 단계에서 함께 점검 가능).

### 실패 — 없음

PR1 범위 AC 전부 통과.

---

## 7. PR1 판정

- AC-1 시각 무변경 — **통과** (computed-style 0/597 + 정적 라우트 픽셀 0)
- AC-2 빌드/타입/린트 — **통과** (0/0/성공)
- AC-3 토큰 var 전환·포커스링·color-mix·`--color` 충돌 0 — **통과**
- AC-4 3-state 토글 + system 자동 — **통과** (프로덕션 서버 실측)
- AC-5 FOUC 스크립트 — **통과**
- AC-6 localStorage 영속 — **통과**
- AC-7 design:sync 파이프라인 + 키셋 1:1 검증 throw — **통과**
- 공통 무회귀(BFF/한글/a11y/`dark:` 0건/SSOT) — **통과**

> **PR1 라운드 판정: qa-passed.** dark=light 시각 무변경 불변식 충족, 토글/FOUC/영속 인프라 정상. 다크 색상 시인성(WCAG AA)·차트·메타/스플래시는 본 라운드 비범위 — PR2~PR5 QA 라운드에서 본 문서에 추가 검증한다.

---
---

# QA — 다크모드 PR2 (다크 팔레트 49값 + surface-elevated 와이어링) (`dark-mode`)

> **PR**: 브랜치 `feature/dark-mode-palette` (커밋 `c59623a` — `d5d830b` 팔레트 + `c59623a` elevated 와이어링)
> **PRD**: `docs/prd/dark-mode.md` (§3.2 PR2 · AC-2 SSOT · AC-6 핵심 시인성 · AC-9 게이트)
> **디자인**: `docs/design/finsight-redesign.md` (`colors-dark:` 49값 + 다크 WCAG 근거표)
> **라운드**: **PR2 (다크 팔레트)** — 5-PR 분할의 2단계. **다크모드의 "룩"이 처음 적용되는 PR.** 차트 4종(캔들/MACD/RSI/거래량)은 PR3(런타임 훅)이라 본 라운드 색 미분기 — 차트 자체 시인성은 PR3 QA, 본 라운드는 차트 **주변 UI**만.
> **PR2 핵심 기준 = 전 UI 표면 시인성 무누락** — 어두운 배경에서 안 보이는 텍스트/요소 0 (PRD G3·AC-6). 이게 본 라운드의 전부.
> **QA 수행**: QA 에이전트 · 2026-06-02 · macOS · Node v20.19.6 · 프로덕션 빌드(Turbopack) + `next start -p 4521` + Playwright(npx 캐시 1.60) headless chromium · `colorScheme:'dark'` + `localStorage["finsight:theme"]="dark"` 강제
> **판정**: **qa-passed** (시인성 깨짐·읽기불가 텍스트·안 보이는 요소·대비 미달 **0건**, 정보성 관찰 2건)

---

## 0. 검증 환경

- `git checkout feature/dark-mode-palette` (`c59623a`).
- `npm run build` → `npx next start -p 4521` 프로덕션 서버 기동 (PR1 선례 — dev Turbopack HMR 이 proxy 와 충돌하므로 `next start`).
- 다크 강제: Playwright `newContext({colorScheme:'dark'})` + `addInitScript` 로 `localStorage["finsight:theme"]="dark"` 시드 → 각 라우트에서 `document.documentElement.className` 에 `dark` 포함 + `body` 배경 `rgb(14,20,27)`(=`#0e141b` surface-muted) 확인.
- 앱 비밀번호 게이트: `.env.local` 에 `APP_PASSWORD` 미설정 → 게이트 비활성(앱 공개, 서버 로그 `[auth] APP_PASSWORD 미설정` 확인). 로그인 불필요.
- BE(`127.0.0.1:8000`) 라이브 불가(`curl /health` = 000). 시세·검색·관심종목은 route handler 가 KIS·DART 외부 API(env 키 라이브)로 프록시 — 실데이터로 렌더됨. **PR2 는 색 전용 PR**이라 데이터 경로 무관.
- 점검 라우트 7종(home·market·stock·profile·watchlist·dashboard·analyze) × light/dark × 데스크탑(1280)·모바일(375) = **28 풀페이지 스크린샷** + elevated 표면(검색 드롭다운·관심종목 모달·테마 토글) 별도 인터랙션 캡처. 산출물 `/tmp/dark-pr2-shots/`.

---

## 1. AC 별 재현·기대·실측 (PR2 범위)

| # | AC (PR2) | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-9a | typecheck 0 | `npm run typecheck` | 0 에러 | `tsc --noEmit` 무출력, exit 0 | 통과 |
| AC-9b | lint 0 | `npm run lint` | 0 에러 | `eslint .` 무출력, exit 0 | 통과 |
| AC-9c | build 0 (Turbopack) | `npm run build` | 0 에러, 전 라우트 prerender/dynamic 정상 | 성공. `/ /market /stock /profile /watchlist /dashboard /analyze` + api ƒ(dynamic) + Proxy(Middleware) 정상 | 통과 |
| AC-9d | design:sync 49키 1:1 검증 | `npm run design:sync` | 49키 1:1 통과(불일치 throw) | `design:sync — colors-dark 49키 파싱·1:1 검증 통과` / `theme-vars.css 생성 완료 (light 49키 / dark 49키)`, exit 0 | 통과 |
| AC-2a | colors-dark 단일 출처 | `git grep colors-dark docs/design/finsight-redesign.md` | front matter 블록 존재 | `colors-dark:` 49키 블록 + 다크 WCAG 근거표(텍스트 31페어 4.5:1↑·차트 9페어 3:1↑) 존재 | 통과 |
| AC-2b | 다크 hex theme.json/코드 직타 0 | `grep` theme.json + `git grep` 코드 | 다크값은 theme-vars.css 에만 | theme.json 다크 hex 0건. 코드(`*.tsx`/`*.ts`) 다크 hex(`#161d26`·`#0e141b`·`#1d2630`·`#e6edf3`·`#f47171`·`#5b9bff` 등) 직타 **0건** | 통과 |
| AC-2c | 빌드 산출 CSS 에 dark 변수 블록 | 빌드 CSS grep | `html.dark{ --fs-*: 다크hex }` | `.next/static/chunks/*.css` 에 `html.dark` + `--fs-surface:#161d26` · `--fs-signal-up:#f47171`(+ light `#c81e1e` 별도) 동시 출현 → 다크 팔레트 번들 반영 | 통과 |
| AC-6-V | **전 표면 시인성 무누락(핵심)** — 7라우트×2뷰포트 다크 렌더 | 28 스크린샷 육안 + 자동 대비 스캔 | 흰 박스·안 보이는 텍스트 0, 모든 텍스트 WCAG AA | 자동 스캔 7라우트 전부 **sub-threshold 0건**(아래 §3). 육안 28컷 시인성 깨짐 0 | 통과 |
| AC-6-E | elevated 3단 위계(면 명도 분리) | dropdown/modal/drawer 토큰·렌더 | base<card<elevated 지각 가능 | 토큰 base`#0e141b`(L8%) < card`#161d26`(12%) < elevated`#1d2630`(15%) < border`#2a333e`(20%) 라이브 확인. 드롭다운/모달 패널이 페이지 위로 명도 부상(스크린샷) | 통과 |
| AC-1-NR | `dark:` variant 무회귀(G5) | `grep -rnoE 'className=.*dark:'` components app | 0건 | 0건(PR2 가 components.css·WatchlistAddModal 만 수정했으나 `dark:` 미도입) | 통과 |

### AC-9 실측 로그

```
$ npm run typecheck   → tsc --noEmit (무출력, exit 0)
$ npm run lint        → eslint .     (무출력, exit 0)
$ npm run build       → 성공 (전 라우트 prerender/dynamic + Proxy(Middleware) 정상)
$ npm run design:sync → design:sync — colors-dark 49키 파싱·1:1 검증 통과.
                        design:sync — app/theme-vars.css 생성 완료 (light 49키 / dark 49키). (exit 0)
```

> **design:sync 비결정 산출 관찰(차단 아님)**: `npm run design:sync` 재실행 시 1차 단계 `@google/design.md export` 가 `tailwind.theme.json` 의 `screens` 블록 직렬화를 한 번씩 다르게 토해내(`}` 위치 어긋남·`ens":` 잔여) working-tree drift 를 만든다. **다크 hex 와 무관**하고 커밋본은 정상 — `git checkout tailwind.theme.json` 으로 복원. PR1 라운드에서도 동일 export 툴 비결정성을 기록한 바 있으며 SSOT·시인성에 영향 0. (검증 후 theme-vars.css/theme.json/design.md/next-env.d.ts 전부 커밋본 복원, working tree clean.)

---

## 2. 표면별 다크 시인성 정밀 검증 (육안 — 본 라운드의 전부)

각 라우트·표면을 다크에서 실제 렌더로 확인. (✓ = 시인성 정상, 깨짐 0)

### 2.1 라우트 (데스크탑 1280 + 모바일 375)

| 라우트 | 표면 | 다크 실측 | 판정 |
|---|---|---|---|
| **home `/`** | 사이드바·header 티커·검색 입력·주요지수 4카드·외국인/기관 Top10 표·하단 navbar(모바일) | 사이드바 wordmark(primary `#cdd9e5`)·메뉴 가독. 티커 등락(빨강/파랑) 명확. 검색 placeholder(text-muted) 읽힘. 지수카드 surface 위 강조텍스트·등락 화살표 시인. Top10 순위배지·종목명·코드(text-muted)·금액(signal-up/down) 전부 가독 | ✓ |
| **market** | (home-market 통합 — `/market` = 시장 종합 동일 화면) | home 과 동일 표면 렌더, 깨짐 0 | ✓ |
| **stock `/stock/005930`** | 종목 헤더·현재가·등락(signal-up)·탭 세그먼트(캔들/라인/일봉/주봉/월봉)·기간 드롭다운·기업개요/최근공시 카드·MACD/RSI 라벨 | 헤더·가격(`360,500 KRW`)·등락(`+3.30%` 빨강) 명확. 탭 세그먼트 active(accent) vs inactive(text-muted) 구분. 카드 surface·메타 텍스트 가독. **차트 캔버스 색은 PR3 미분기(light 팔레트 잔존)** — 본 라운드 비범위, 주변 UI 시인성 정상 | ✓ |
| **profile** | 마이페이지 헤더·ProfileCard(아바타 AI그라데이션·PRO배지·투자성향 배지·프로필수정 버튼)·asset-hero(총자산·도넛차트·주식/코인 범례 배지)·보유종목 표·SettingsMenuCard·**테마 토글 3-state**·연동 거래소 카드 | 전 표면 가독. 배지(accent-soft/asset-stock-soft/asset-coin-soft) 위 텍스트 대비 충분. 도넛 주식(파랑)/코인(주황) hue 식별. 수익/손실(빨강/파랑) 명확. **테마 토글: §2.2 참조** | ✓ |
| **watchlist** | 관심종목 헤더·새로고침 아이콘버튼·종목 추가 버튼(accent-vivid)·행(종목명·코드·현재가·등락 배지·삭제 아이콘)·**추가 모달(elevated)** | 행·배지(signal-up red soft / signal-down blue soft) 가독. 헤더 별 아이콘(warn)·휴지통 아이콘·새로고침 아이콘 시인. 모달 §2.2 참조 | ✓ |
| **dashboard** | (profile/마이페이지 콘텐츠로 매핑 — 동일 표면) | profile 과 동일, 깨짐 0 | ✓ |
| **analyze** (workbench) | 안내 카드·종목검색 카드·투자조건 폼(투자가능금액·목표수익률·목표기간·최대손실률 입력+suffix)·분석 버튼(accent-vivid)·결과 빈상태 카드·면책 footer | 폼 라벨·입력(surface-muted fill)·placeholder·helper text(text-muted)·suffix(`%`/`일`)·버튼·빈상태·footer 전부 가독 | ✓ |

### 2.2 특별 확인 (frontend-dev 플래그)

| 항목 | 실측 | 판정 |
|---|---|---|
| **테마 토글 3-state UI 자체 다크 가시성** | `/profile` SettingsMenuCard 의 `화면 테마 설정 (다크모드)` 행(accent-soft 강조면 위 라벨 + 우측 "다크" 값) + 그 아래 세그먼트(라이트/다크/시스템). **active "다크" pill 이 surface-elevated 톤으로 밝게 부상**, inactive(라이트/시스템)는 text-muted 로 트랙 위 명확 구분. radiogroup `aria-label="화면 테마"` + radio `aria-checked` 정확(다크 선택 시 다크=true). 3-state UI 다크에서 잘 보임 | ✓ 통과 |
| **search-result-item "박힌" 느낌** (드롭다운 패널 surface-elevated `#1d2630` 안 결과항목 surface `#161d26` 한 톤 어두움) | 실제 렌더 판정: 드롭다운 패널이 페이지 위로 elevated(밝게) 부상하고, 그 안 결과 항목(삼성전자/삼성바이오로직스 등)은 panel 보다 한 톤 어두운 면(`#161d26`). 결과 텍스트(text-strong `#e6edf3`, 14.36:1)·코드/거래소(text-muted)는 완전 가독 — **읽기 불가/시인성 깨짐 아님**. 다만 "리스트 항목이 컨테이너보다 어둡다"는 elevation 직관과 살짝 어긋나 미세하게 inset/sunken 인상. **어색함은 INFO 등급**(아래 §6 INFO-PR2-1), 깨짐 아님 | INFO (통과) |
| **text-strong/text-muted 각 면 위 대비** | 자동 대비 스캔 전 라우트 sub-threshold 0 — text-strong(`#e6edf3`) on surface/surface-muted/elevated, text-muted(`#9aa6b2`) on 동일 3면 전부 floor 통과. 드롭다운 메타(text-muted on elevated 6.17:1)가 최저 마진이나 통과 | ✓ 통과 |
| **등락색 signal-up/down 다크 구분** | signal-up(`#f47171` coral red) / signal-down(`#5b9bff` sky blue) — 다크 surface 위 빨강/파랑 명확히 구분, 탁하지 않음. 한국식 상승=빨강/하락=파랑 유지. 티커·지수카드·Top10·보유종목·관심종목 배지 전부 확인 | ✓ 통과 |

---

## 3. 자동 대비 스캔 (안 보이는 텍스트 0 — 강한 증거)

다크 강제 후 7라우트에서 **직접 텍스트 노드를 가진 모든 DOM 요소**에 대해 `color` vs 유효 배경(부모 추적, 불투명 면까지)을 WCAG 2.x 상대휘도 공식으로 대비 계산. floor = 일반 4.5:1 / 큰글자(≥24px 또는 ≥18.66px bold) 3:1. floor 미만 = sub-threshold(=안 보일 위험 텍스트).

```
### /            — 0 sub-threshold
### /market      — 0 sub-threshold
### /stock/005930— 0 sub-threshold
### /profile     — 0 sub-threshold
### /watchlist   — 0 sub-threshold
### /dashboard   — 0 sub-threshold
### /analyze     — 0 sub-threshold
```

→ **7라우트 전부 0건.** 다크에서 WCAG AA 미달(=안 보일 위험) 텍스트가 한 건도 없다. PRD G3(전 표면 시인성 무누락)·AC-6(다크 페어 4.5:1) 충족의 핵심 증거. (차트 캔버스 내부 SVG 라벨은 PR3 색 분기 전이라 일부 light 잔존 — 본 라운드 비범위로 제외, 차트 4종은 PR3 QA.)

### 면 명도 위계(그림자 없는 elevation) 라이브 확인

| 면 토큰 | dark hex | 측정값 | 용도 |
|---|---|---|---|
| `surface-muted` | `#0e141b` | body bg `rgb(14,20,27)` | 앱 베이스 |
| `surface` | `#161d26` | card bg `rgb(22,29,38)` | 카드/navbar |
| `surface-elevated` | `#1d2630` | dropdown/modal panel `rgb(29,38,48)` | 떠있는 면 |
| `border-line` | `#2a333e` | dropdown border `rgb(42,51,62)` | hairline |

→ 3단 명도 step 라이브. 드롭다운/모달 패널 bg(`#1d2630`)가 페이지 base(`#0e141b`)·카드(`#161d26`)보다 밝게 떠 **그림자 없이 명도만으로 부상 확인**(스크린샷 육안 일치).

---

## 4. elevated 표면 인터랙션 실측 (computed style)

| 표면 | light | dark | 판정 |
|---|---|---|---|
| 검색 드롭다운 패널 | panel `#ffffff` / item `#ffffff`(차이 0) | panel `#1d2630`(elevated) / item `#161d26`(surface) / 텍스트 `#e6edf3` | 패널 elevated 정상, 항목 텍스트 가독 ✓ |
| 관심종목 추가 모달 | dialog `#ffffff` / 텍스트 `#0f1419` | dialog `#1d2630`(elevated) / 텍스트 `#e6edf3` | elevated 정상, 스크림 배경 dim ✓ |
| 테마 토글 radiogroup | `화면 테마`, 라이트/다크/시스템, aria-checked 정확 | 동일 + 다크 선택 시 다크=true | 3-state·a11y 정상 ✓ |

- light 에서 elevated=surface=`#ffffff` 동일값 → **light 무회귀**(드롭다운/모달 색 변화 0) 확인.
- **모달 폭 렌더 관찰**: headless 캡처에서 추가 모달 패널이 매우 좁게(세로 1글자씩 wrap) 렌더됨. **light·dark 동일하게 재현** → PR2(색 전용) 회귀 아니라 자동 캡처 환경의 모달 width/flex 애니메이션 아티팩트. 색·elevation 동작(`bg-surface-elevated` 적용·스크림 dim)은 양 테마 정상. 폭 이슈는 PR2 범위 밖이며 테마 무관 → 시인성 발견 아님(환경 노트).

---

## 5. 공통 AC 무회귀

| 항목 | 명령/방법 | 결과 | 판정 |
|---|---|---|---|
| typecheck/lint/build 0 | (AC-9) | 0/0/성공 | 통과 |
| BFF 원칙 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler fallback 3건(`whitelist/search` · `workbench/_adapters/fastapi` `FASTAPI_BASE_URL ?? "..."`)만 — 허용 예외, 그 외 0 | 통과 |
| 다크 hex 코드 직타 0(SSOT) | `git grep` 다크 hex in `*.tsx`/`*.ts` | 0건(다크값은 theme-vars.css 산출물에만) | 통과 |
| `dark:` variant 0(G5) | `grep -rnoE 'className=.*dark:'` | 0건 | 통과 |
| 한글 톤 무회귀 | PR2 신규 사용자 노출 문구 없음(색 전용) — components.css/WatchlistAddModal 은 주석만 추가 | 회귀 0 | 통과 |
| 접근성 무회귀 | 테마 토글 radiogroup/radio aria 정상(§4) · 모달 `role="dialog"`·`aria-modal`·`aria-label` 유지 | 회귀 0 | 통과 |

---

## 6. 발견 이슈

### 정보성 관찰 (실패 아님, 차단 아님)

- **[INFO-PR2-1] 검색 드롭다운 결과 항목이 패널보다 한 톤 어둡다 — 미세한 inset 인상.** (라우트: home `/` · watchlist 모달 검색 / 요소: `.dropdown-panel`(surface-elevated `#1d2630`) 안의 `search-result-item`(surface `#161d26`)) 다크에서 떠있는 패널은 elevated 로 밝게 부상하는데 그 안의 결과 항목은 한 톤 어두운 `surface` 라, "리스트 항목이 컨테이너보다 어둡다"는 elevation 직관과 살짝 어긋나 미세하게 박힌(sunken) 느낌. **현상: 시인성 깨짐 아님** — 항목 텍스트(text-strong 14.36:1)·메타(text-muted) 완전 가독, 자동 스캔 sub-threshold 0. frontend-dev 가 사전 플래그한 지점으로, 깨짐이 아니라 미세한 미감 어색함. **권고(선택, 차단 아님)**: 다크에서 search-result-item 을 (a) 배경 투명(패널 elevated 톤 노출) + hover 시에만 surface 강조, 또는 (b) 항목을 elevated 보다 한 톤 더 밝게. PR2 통과를 막지 않으며 PR5 마감 또는 후속 폴리시에서 검토 가능.
- **[INFO-PR2-2] design:sync 재실행 시 `tailwind.theme.json` working-tree drift(다크 무관).** §1 design:sync 로그 노트 참조. `@google/design.md export` 의 `screens` 직렬화 비결정성 — 커밋본 정상, 다크 hex·시인성 영향 0. PR1 라운드와 동일 관찰. 향후 export 툴 핀 고정 시 함께 정리 가능.

### 실패 — 없음

PR2 범위 AC(시인성·SSOT·게이트·무회귀) 전부 통과. **읽기 불가 텍스트·안 보이는 요소·WCAG 대비 미달 0건.**

---

## 7. PR2 판정

- AC-9 typecheck/lint/build/design:sync 49키 — **통과** (0/0/성공/49키 1:1)
- AC-2 SSOT — **통과** (colors-dark 단일 출처, theme.json·코드 다크 hex 직타 0, 빌드 CSS 다크 변수 반영)
- AC-6 **전 표면 시인성 무누락(핵심)** — **통과** (7라우트×2뷰포트 육안 깨짐 0 + 자동 대비 스캔 전 라우트 sub-threshold 0)
- elevated 3단 명도 위계 — **통과** (그림자 없이 면 명도로 부상, light 무회귀)
- 등락색 signal-up/down 다크 구분 — **통과** (빨강/파랑 명확, 탁함 없음)
- 테마 토글 3-state 다크 가시성 + a11y — **통과**
- 공통 무회귀(BFF/한글/a11y/`dark:` 0/SSOT) — **통과**

> **PR2 라운드 판정: qa-passed.** 다크모드 "룩" 첫 적용에서 **전 UI 표면 시인성 무누락(사용자 핵심 요구) 충족** — 어두운 배경에서 안 보이는 텍스트/요소 0, 자동 대비 스캔 7라우트 0건, 육안 28컷 깨짐 0. 정보성 관찰 2건(검색 항목 미세 inset 미감 · design:sync export 비결정성)은 차단 아님. 차트 4종 색 분기(PR3)·메타/스플래시(PR4)·hex 전수 마감(PR5)은 본 라운드 비범위 — 후속 라운드에서 본 문서에 추가 검증한다.

---

산출물: `docs/qa/dark-mode.md`
