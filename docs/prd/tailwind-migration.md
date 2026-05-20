# PRD: tailwind-migration

- **slug**: `tailwind-migration`
- **작성일**: 2026-05-21
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: `workbench-analyze-rebuild` PRD (PR #11) 머지 직후. 스타일링 전략 전환.
- **UI 포함 여부**: yes (사용자 화면 영향은 "시각 변경 0" 목표지만, 화면 코드의 className 전면 재작성 + 디자인 토큰 파이프라인 신설이므로 UX/UI 디자이너 검토 트리거가 필요. 디자이너 합류 범위는 "DESIGN.md → Tailwind theme export 파이프라인 점검" 으로 제한.)
- **선행 / 후행 관계**: 선행 PRD `workbench-analyze-rebuild` 머지 후 진입. 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 는 그대로 source-of-truth 로 활용 (재작성·재발주 없음). 본 PRD 머지 후 추가되는 화면·컴포넌트는 Tailwind 유틸리티 기준으로 작성된다.

## 1. 배경 / 문제

직전 PRD `workbench-analyze-rebuild` (PR #11, main `2651bc7`) 는 **Tailwind 도입을 명시적으로 비범위** 로 두고 globals.css + CSS custom property (이하 "CSS 변수") 패턴으로 진행됐다.

- DESIGN.md (`docs/design/workbench-analyze-rebuild.md`) front matter 의 토큰을 `app/globals.css` 의 `--<token>` 으로 1:1 이식.
- 화면 코드(`app/page.tsx`, `components/workbench/*` 12개)는 `var(--token)` 만 사용.
- 결과적으로 `app/globals.css` 는 844 라인이 됐고, 컴포넌트별 클래스 정의도 globals.css 한 파일에 누적되고 있다.

사용자가 이 결정을 뒤집기로 했다. 핵심 메시지:

> "css는 tailwind로 할려고해. global.css는 지양해야해. 이건 디자인 agent쪽에서 디자인 토큰을 tailwind랑 같이 쓸수있게 하면 될것같은데 어떨까?"

전환 동기:

1. **유틸리티-퍼스트 일관성** — 새 화면이 추가될 때마다 globals.css 가 비대해지는 추세를 끊고, 컴포넌트 코드 안에서 스타일이 자기 완결적이게 한다.
2. **DESIGN.md ↔ FE 동기화 자동화** — DESIGN.md spec 에 명시된 export 명령을 활용해 디자이너가 토큰을 갱신하면 FE 가 `npm run` 한두 번으로 받아쓰는 파이프라인을 만든다.

   ```text
   npx @google/design.md export --format tailwind docs/design/<slug>.md > frontend/tailwind.theme.json
   ```

3. **shadcn/ui 등 후속 디자인 시스템 도입 여지** — Tailwind 가 전제일 때 채택 옵션이 넓어진다. 다만 본 PRD 는 Tailwind 만 도입.

## 2. 목표

- `app/globals.css` 의 책임을 Tailwind preflight + Tailwind 가 흡수하지 못하는 잔여물(전역 폰트 metric, 라이브러리화 안 된 keyframe 등) 로 축소한다.
- `var(--<token>)` 직접 참조 패턴을 화면 코드에서 제거하고, Tailwind theme 토큰(`bg-accent`, `text-warn`, `rounded-card` 등) 또는 컴포넌트 클래스(`@apply`) 로 대체한다.
- DESIGN.md 토큰을 Tailwind theme 으로 흘려보내는 **자동·재현 가능한 파이프라인** 을 둔다. 디자이너가 DESIGN.md 만 수정해도 FE 의 Tailwind 설정이 동기화된다.
- 사용자 화면의 **시각·동작은 0 회귀**. 본 PRD 는 스타일링 인프라 전환이지 UI 모델 변경이 아니다.
- 향후 화면 작업의 기본 스타일링 방식이 Tailwind 유틸리티가 되도록 컨벤션을 정착시킨다.

## 3. 범위 (In scope)

- **Tailwind 설치·설정**
  - `tailwindcss`, `postcss`, `autoprefixer` 의존성 추가 (버전 결정은 §9 OPEN QUESTION).
  - `tailwind.config.ts` (또는 `tailwind.config.js`) 추가. `content` 에 `app/**/*.{ts,tsx}`, `components/**/*.{ts,tsx}` 등록.
  - `postcss.config.mjs` 추가 또는 갱신.
  - `app/globals.css` 에 `@tailwind base; @tailwind components; @tailwind utilities;` 디렉티브 도입.
- **DESIGN.md → Tailwind theme 파이프라인**
  - `npx @google/design.md export --format tailwind docs/design/workbench-analyze-rebuild.md > tailwind.theme.json` 명령이 동작 가능한 상태로 둔다 (도구 미설치 시 사용 절차를 `package.json` script 로 노출).
  - `tailwind.config.ts` 가 `tailwind.theme.json` 을 import 또는 require 해서 `theme.extend` (또는 동등 위치) 에 주입.
  - `package.json` 에 `npm run design:sync` (또는 동등명) script — 위 export 명령을 한 줄로 실행.
  - DESIGN.md 의 색·간격·radius·typography·shadow 토큰이 그대로 Tailwind theme key 로 매핑됨 (export 도구의 출력에 의존).
- **`app/globals.css` 축소**
  - Tailwind 디렉티브 3 줄.
  - Tailwind preflight 가 흡수하지 못하는 잔여 전역 룰만 남김 (예: `font-feature-settings: "tnum"`, 라이브러리화 안 된 `@keyframes`, `html`/`body` 의 background/color 가 토큰에 묶이는 부분 — 단 이것도 Tailwind `@layer base` 안으로 이동 권장).
  - 컴포넌트 별 클래스 정의(`.brief-card`, `.action-card` 등)는 (a) 화면 코드의 유틸리티 조합으로 풀거나, (b) `@layer components { .name { @apply ... } }` 로 묶음.
- **화면 코드 className 재작성**
  - `app/page.tsx`, `app/layout.tsx`, `app/providers.tsx` (영향 없음 가능), `components/workbench/*` 12개 — 각 컴포넌트의 className 을 Tailwind 유틸리티 또는 `@apply` 기반 컴포넌트 클래스로 재작성.
  - 인라인 `style={{ color: "#..." }}` / `style={{ padding: 16 }}` 같은 hex/px 직타 제거 (시각 변경 0 이라는 전제하에).
- **CSS 변수 직접 참조 제거**
  - 화면·컴포넌트 코드의 `var(--<token>)` 사용 0건. 단 Tailwind config 가 내부적으로 토큰을 CSS 변수로 export 하는 것은 무방 (Tailwind 가 자동 처리).
- **컨벤션 문서 갱신**
  - `docs/rules/frontend.md` — Tailwind 가 기본 스타일링 방식임을 명시. 단 "shadcn/ui 등 디자인 시스템 준수" 한 줄은 본 PRD 범위 안에서 수정하지 않는다 (별도 PRD).
  - `docs/rules/design-md.md` — "코드 동기화" 절의 export 명령이 본 저장소의 어떤 script 로 묶였는지 한 줄 추가.
- **빌드 / 타입 / 린트 무회귀**
  - `npm run typecheck`, `npm run build`, `npm run lint` 모두 0 에러.

## 4. 비범위 (Out of scope)

- 화면·UX 모델 변경 — 사용자가 보는 화면은 시각·동작 모두 동일해야 한다 (스타일링 마이그레이션이지 리디자인이 아님).
- DESIGN.md 토큰 추가·삭제·이름 변경 — 디자이너 영역. 본 PRD 는 기존 토큰을 그대로 흘려보내는 것까지만.
- **shadcn/ui 도입** — Tailwind 만 도입. 컴포넌트 라이브러리 채택은 별도 PRD.
- **다크 모드** — `color-scheme: light` 고정 유지. 다크 모드는 별도 PRD.
- 차트 / 시각화 라이브러리 도입.
- BE / route handler / API contract 변경.
- 다국어 (i18n).
- E2E / 시각 회귀 테스트 도입.
- Vercel 환경변수·도메인 추가.
- PR #11 reviewer 가 메모한 nit 5건, `.mcp.json` 처리, 화이트리스트 placeholder 동적화, `offline` 토글 UI, `ai_summary` 카피 재검토 — **본 PRD 범위 외**. 단 Tailwind 전환 중 자연스럽게 흡수되는 경우(예: className 재작성 과정에서 placeholder 한 줄 동적화) 만 본 PRD 의 PR 본문 "범위 외 함께 흡수" 절에 명시.

## 5. 수용 기준 (AC)

검증 가능한 문장.

- **AC-1 (Tailwind 도입 완료)**:
  - `npm ls tailwindcss` 결과 1개 이상 (devDependency 포함) 의 항목.
  - 저장소 루트(또는 동등 위치) 에 `tailwind.config.ts` 또는 `tailwind.config.js` 존재.
  - `app/globals.css` 의 최상단에 `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` 디렉티브가 모두 존재.
- **AC-2 (`app/globals.css` 축소)**: `wc -l app/globals.css` 결과가 **100 라인 미만**. 단 Tailwind preflight 가 흡수하지 못해 명시적 근거가 있는 잔여물(예: `tnum` 폰트 metric, keyframes, `@layer base` 안의 body/html 토큰 바인딩) 은 허용 — 각 잔여물에 한 줄 코멘트로 사유 명시. (현재 844 라인 → 100 라인 미만, 약 88% 감축.)
- **AC-3 (CSS 변수 직접 참조 제거)**: `git grep -nE "var\(--" -- app/ components/` 결과 0건. 단 `tailwind.config.ts` 내부, 또는 `@layer` 안에서 토큰 정의를 위해 CSS 변수를 사용하는 경우는 예외 (Tailwind 가 자동 처리).
- **AC-4 (DESIGN.md → Tailwind theme 파이프라인 동작)**:
  - `npx @google/design.md export --format tailwind docs/design/workbench-analyze-rebuild.md` 명령이 (도구 설치 후) 0 에러로 종료되고 JSON 을 stdout 으로 출력한다.
  - `package.json` 의 script 한 줄로 위 명령을 실행할 수 있다 (예: `npm run design:sync`).
  - `tailwind.config.ts` 가 그 출력 파일(`tailwind.theme.json` 또는 동등명) 을 import/require 해서 `theme.extend` 에 주입한다.
  - 디자이너가 DESIGN.md 의 토큰만 갱신하고 `npm run design:sync` 한 번 + `npm run build` 한 번을 돌리면 Tailwind theme 이 동기화된다.
- **AC-5 (DESIGN.md 토큰의 Tailwind 매핑)**: 현 DESIGN.md 의 색·간격·radius·typography·shadow 토큰이 Tailwind theme key 로 1:1 매핑되어 화면 코드에서 유틸리티(`bg-accent`, `text-warn`, `rounded-card`, `shadow-card` 등) 로 호출 가능. (정확한 key 명은 export 도구 출력 + FE Dev 가 결정.)
- **AC-6 (컴포넌트 className 재작성)**: `app/page.tsx`, `components/workbench/*` 12개 모두 Tailwind 유틸리티 또는 `@apply` 기반 컴포넌트 클래스로 재작성됨. `style={{ ... }}` 안의 hex/px 직타 0건 (단 동적 계산이 필요한 경우 — 예: 진행 막대 너비 — `style={{ width: \`${pct}%\` }}` 같은 케이스는 허용).
- **AC-7 (합성 토큰 처리 일관성)**: DESIGN.md `components` 절의 합성 토큰(예: `card-elevated`, `badge-warn`) 은 다음 중 **한 가지** 방식으로 일관 처리.
  - (a) 컴포넌트 코드 안에서 Tailwind 유틸리티 조합으로 풀어 표현, 또는
  - (b) `@layer components { .card-elevated { @apply ... } }` 로 묶고 컴포넌트 코드는 그 클래스명만 사용.
  - PM 권고: **(b) 우선** — 디자이너 산출물의 합성 토큰 이름이 코드에 살아남는 편이 추후 토큰 갱신·다크모드 도입 시 유리. FE Dev 가 재량으로 (a) 선택 가능하나, 동일 컴포넌트 내에서 (a)/(b) 혼용 금지.
- **AC-8 (시각·동작 0 회귀)**: PR #11 의 수동 라운드트립 5건 (`workbench-analyze-rebuild` PRD §AC-14 의 a~e) 이 본 PRD 머지 후에도 동일한 화면 결과를 보여준다. QA 가 dev 환경에서 화면 캡처·육안 비교로 확인.
- **AC-9 (build / typecheck / lint)**: `npm run typecheck`, `npm run build`, `npm run lint` 모두 0 에러.
- **AC-10 (AGENTS.md 원칙 무회귀)**: 본 PRD 머지 후 다음이 회귀하지 않는다.
  - 한글 톤 (사용자 노출 문구 한글 유지).
  - 직접 호출 금지 (`git grep -nE "http://127\.0\.0\.1" -- app/` 0건, route handler 안 fallback 제외).
  - 환경변수 단일 진입.
  - 기본 접근성 (`<label>` 연결, 키보드 탭 순서, 상태 강조의 텍스트 동반).
- **AC-11 (컨벤션 문서 갱신)**:
  - `docs/rules/frontend.md` 에 "스타일링 기본 방식: Tailwind 유틸리티. globals.css 는 Tailwind 디렉티브 + preflight 가 흡수하지 못하는 잔여물에 한정." 라는 취지의 한 줄 또는 절이 추가됨.
  - `docs/rules/design-md.md` 에 "본 저장소의 동기화 script 는 `npm run design:sync`" (또는 실제 결정된 script 명) 한 줄 추가.
- **AC-12 (수동 QA 시나리오)**: 다음이 dev 환경에서 모두 동작.
  - (a) `npm install` 직후 `npm run build` 가 0 에러로 통과.
  - (b) `docs/design/workbench-analyze-rebuild.md` 의 한 토큰 값을 임의로 변경 → `npm run design:sync` → `npm run build` → 화면에서 그 변경이 반영됨 (Storybook 미도입이므로 dev 서버 + 육안 확인).
  - (c) PR #11 수동 라운드트립 5건 재현, 화면 시각·동작 동일.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 선행 PRD `workbench-analyze-rebuild` (PR #11) 가 머지되어 있고, 화면이 6블록 (brief / feasibility / horizons / risk_plan / action / warnings) 으로 동작 중이라고 가정.
- 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 는 **그대로** source-of-truth 로 사용. 디자이너 재작업·재발주 없음. 다만 export 파이프라인 점검을 위해 디자이너가 검토 단계에 한 번 참여.
- DESIGN.md export 도구 (`@google/design.md`) 의 `--format tailwind` 옵션이 동작한다고 가정. 동작하지 않거나 출력 스키마가 Tailwind config 와 정합하지 않는 경우의 폴백은 §9 OPEN QUESTION.
- BE / route handler / API contract 변경 없음 — 본 PRD 는 BE 호출 흐름과 무관.
- 사용자가 IDE 에 `app/providers.tsx` 를 열어둔 점은 PM 이 인지. 다만 QueryClientProvider 는 Tailwind 전환에 거의 영향받지 않으므로 본 PRD 에 providers 별도 절은 두지 않는다.
- `package-lock.json` 의 워킹트리 noise (lockfile drift) 는 본 PRD 머지 PR 안에서 자연스럽게 해소되거나, 별도 chore PR 로 분리. 본 PRD 의 AC 와 무관.
- 본 PRD 머지 후 추가되는 화면·컴포넌트는 Tailwind 유틸리티 기준으로 작성된다 (후속 PRD 들의 묵시적 전제).
- 다크 모드 도입은 별도 PRD. 다만 본 PRD 의 토큰 키 prefix 룰이 차후 다크 모드 PRD 의 비용을 좌우하므로 §9 OPEN QUESTION 으로 다룬다.

## 7. 참고

- `AGENTS.md` — 작업 원칙, 디자인 톤, 에이전트 역할, PRD 양식.
- `docs/rules/frontend.md` — FE 규칙. 본 PRD 머지 후 Tailwind 관련 절 추가 대상.
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드. "코드 동기화" 절에 tailwind export 명령 명시.
- `docs/prd/workbench-analyze-rebuild.md` — 선행 PRD. 본 PRD 가 그 화면을 스타일링 측면에서 재작성.
- `docs/design/workbench-analyze-rebuild.md` — 디자이너 산출물. 본 PRD 가 그대로 활용.
- `app/globals.css` — 현재 844 라인. 본 PRD 가 100 라인 미만으로 축소.
- `app/page.tsx`, `app/layout.tsx`, `app/providers.tsx` — className 재작성 대상.
- `components/workbench/*` 12개 (`ActionCard`, `BriefCard`, `EmptyState`, `ErrorCard`, `FeasibilityCard`, `HorizonsCard`, `InputPanel`, `LoadingSkeleton`, `ResultGroup`, `RiskPlanCard`, `SearchPanel`, `WarningsCard`) — className 재작성 대상.
- `docs/HANDOFF.md` PR #6~#11 entry — 직전 정리·구현 흐름 컨텍스트.
- DESIGN.md export 도구: <https://github.com/google-labs-code/design.md>
- Tailwind 공식 문서: <https://tailwindcss.com/docs>
- Next.js + Tailwind 가이드: <https://nextjs.org/docs/app/building-your-application/styling/tailwind-css>

## 8. 영향 분석

본 PRD 가 코드베이스에 미치는 영향 범위와 추정 작업량.

- **`app/globals.css`** — 현재 844 라인. 목표 100 라인 미만 (약 88% 감축, **−750 라인 규모**). 토큰 정의는 Tailwind config 로 이동, 컴포넌트 클래스는 `@layer components` 로 묶거나 컴포넌트 코드의 유틸리티 조합으로 풀림.
- **`tailwind.config.ts` 신규** — 약 30~60 라인 추정. `content`, `theme.extend` (DESIGN.md export 결과 import), `plugins` (필요 시).
- **`postcss.config.mjs` 신규 또는 갱신** — 약 5~10 라인.
- **`tailwind.theme.json` (생성물)** — DESIGN.md export 결과. lint·typecheck 대상 아님. `.gitignore` 포함 여부 §9 OPEN QUESTION.
- **`package.json`** — `tailwindcss`, `postcss`, `autoprefixer` devDependency 추가. `scripts` 에 `design:sync` (또는 동등명) 1줄 추가.
- **`app/page.tsx` (110 라인)** — className 전면 재작성. 라인 수는 비슷하거나 약간 감소 추정.
- **`app/layout.tsx` (18 라인)** — body className 정도 손볼 가능성. 변경 최소.
- **`app/providers.tsx` (30 라인)** — QueryClientProvider 만 존재. **영향 없음 추정**.
- **`components/workbench/*` 12 파일** — 각 파일 className 재작성. 합성 토큰을 (b) 방식으로 처리할 경우 globals.css → `@layer components` 이동 작업이 부수적으로 발생. 파일당 평균 20~50 라인의 className 변경 추정.
- **`docs/rules/frontend.md`, `docs/rules/design-md.md`** — 각 1~3 라인 추가.
- **총 변경 규모 (추정)**: 삭제 약 700~800 라인 (globals.css 정리), 추가 약 200~300 라인 (tailwind config, theme import, 컴포넌트 className 재작성, 문서). **순 −500 라인 안팎** 의 PR.
- **회귀 위험**:
  - Tailwind preflight 가 기존 `* { box-sizing: border-box }` / `body` 기본 margin 등의 룰과 충돌·정합. 대부분 preflight 가 흡수하므로 위험 낮음.
  - 합성 토큰 처리 방식 (AC-7) 의 일관성. PM 권고 (b) 를 따르면 차후 토큰 갱신 비용이 낮아진다.
  - DESIGN.md export 도구의 출력 스키마가 Tailwind config 와 100% 정합하지 않을 경우 — 그 갭은 §9 OPEN QUESTION 으로 다룸.
  - 인라인 `style={{ }}` 안의 hex/px 직타가 PR #11 단계에서 일부 남아있을 가능성. className 재작성 과정에서 같이 정리.

## 9. OPEN QUESTION

- `[OPEN QUESTION] Tailwind 버전 — v4 vs v3` — Tailwind v4 는 alpha/early 단계 (작성일 기준). Next.js 15·React 19 호환성, 생태계 안정성, postcss-import 등 플러그인 정합을 함께 봐야 한다. **PM 권고: v3 채택**. v4 는 본 PRD 머지 후 별도 chore PRD 로 마이그레이션 검토.
- `[OPEN QUESTION] tailwind.theme.json 의 import 방식` — `tailwind.config.ts` 가 JSON 을 `require()` 인지, `import` (with `resolveJsonModule`) 인지, `theme.extend: {...themeJson}` 으로 spread 인지. **PM 권고: `import` + spread**. tsconfig 의 `resolveJsonModule` 이 이미 true 라고 가정 (FE Dev 확인 후 결정).
- `[OPEN QUESTION] tailwind.theme.json 의 커밋 여부` — export 결과를 git 에 커밋할지(빌드 재현성·CI 단순화), `.gitignore` 에 두고 빌드 시 생성할지(중복 제거·source-of-truth 단일화). **PM 권고: 커밋한다**. CI/Vercel 빌드에 `@google/design.md` 가 의존되어야 하는 부담을 피하고, `npm run design:sync` 를 디자이너·FE Dev 의 명시적 행위로 둔다.
- `[OPEN QUESTION] 합성 토큰 처리 — (a) 유틸리티 조합 vs (b) `@apply` 컴포넌트 클래스`** — AC-7 참조. **PM 권고: (b) 우선**. 디자이너 산출물의 합성 토큰 이름(`card-elevated` 등) 이 코드에 살아남으면 차후 토큰 갱신·다크 모드 도입 시 변경 면적이 작아진다. FE Dev 재량으로 (a) 선택 가능하나, 동일 컴포넌트 내 혼용 금지.
- `[OPEN QUESTION] 다크 모드를 위한 토큰 키 prefix 룰` — 본 PRD 에서 다크 모드를 도입하진 않지만, 토큰 키 명명 (`accent` / `accent-fg` / `accent-bg` 같은 semantic 키 vs `gray-100` / `blue-500` 같은 raw scale 키) 을 지금 정해두면 차후 다크 모드 PRD 의 비용이 줄어든다. **PM 권고: semantic 키 유지** (DESIGN.md 가 이미 semantic 으로 작성되어 있음). 다크 모드는 `@media (prefers-color-scheme: dark)` 또는 `class="dark"` 토글로 토큰 값만 갱신하는 구조를 차후 가정.
- `[OPEN QUESTION] DESIGN.md export 도구 출력의 정합성` — `@google/design.md` 의 `--format tailwind` 출력이 Tailwind theme key 와 1:1 정합하지 않을 경우 (예: `colors.accent` 가 아닌 `palette.accent` 로 나오는 경우 등) 의 폴백. **PM 권고**: FE Dev 가 첫 실행에서 출력 스키마를 확인하고, 어댑터 함수 (`adaptDesignTokensToTailwind(themeJson)`) 한 개를 `tailwind.config.ts` 옆에 두어 흡수. 어댑터의 책임은 "DESIGN.md 토큰 스키마 → Tailwind theme 스키마 변환" 으로 명시.
- `[OPEN QUESTION] Tailwind preflight vs 기존 globals.css reset 의 충돌`** — 현 globals.css 의 `* { box-sizing: border-box }`, `body { margin: 0 }`, font 설정 등은 대부분 preflight 가 흡수한다. 다만 `font-feature-settings: "tnum"` 같은 케이스는 preflight 가 흡수하지 않으므로 `@layer base` 에 명시적으로 남겨야 한다. **PM 권고: 잔여물 각각에 한 줄 사유 코멘트** 를 의무화하고, "Tailwind 가 흡수하지 못해 남긴다" 는 근거를 README 가 아닌 globals.css 안에 둔다 (코드 옆 문서화).
- `[OPEN QUESTION] PR 분할 — 한 PR 인가 두 PR 인가` — (A) Tailwind 도입 + globals.css 축소 + 토큰 파이프라인, (B) 컴포넌트 className 재작성. 한 PR 로 묶으면 변경량이 크지만 중간 상태가 "유틸리티는 쓸 수 있는데 화면은 아직 var(--) 참조" 라 어색하다. **PM 권고: 한 PR 로 묶는다**. 본 PRD 가 "시각·동작 0 회귀" 를 AC 로 못 박았으므로, 중간 상태를 둘 이유가 약하다. 다만 PR 본문에서 커밋 단위로 (A)/(B) 를 분리해 reviewer 가 단계적으로 읽을 수 있게 한다.
