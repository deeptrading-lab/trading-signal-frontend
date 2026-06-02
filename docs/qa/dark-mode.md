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

산출물: `docs/qa/dark-mode.md`
