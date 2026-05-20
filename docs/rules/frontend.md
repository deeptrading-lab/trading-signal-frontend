# Frontend 규칙

- 웹 UI는 **PRD에 명시된 경우에만** 구현
- 스택·방향은 `README.md`와 정합성 유지
- 디자인 시스템(shadcn/ui 등) 및 UX/UI 디자이너 가이드 준수
- **스타일링 기본 방식**: **Tailwind 유틸리티**. 화면·컴포넌트는 className 으로 Tailwind 유틸리티를 조합하거나 `@layer components` 로 묶인 합성 토큰 클래스(`card`, `badge-warn` 등) 를 참조한다. `app/globals.css` 는 Tailwind 디렉티브 + preflight 가 흡수하지 못하는 잔여물(예: `tabular-nums` 헬퍼, `@keyframes`) 에 한정한다.
- **디자인 토큰 동기화**: 디자이너가 `docs/design/<slug>.md` (DESIGN.md) 의 토큰을 갱신하면 `npm run design:sync` 가 `tailwind.theme.json` 을 재생성하고, `tailwind.config.ts` 가 이를 import 해 Tailwind theme 에 주입한다. 코드에 hex/px 직타 금지.

## 파일·식별자 네이밍

- React 컴포넌트 파일·식별자: PascalCase (`SearchPanel.tsx`, `BriefCard.tsx`).
- hook 파일·hook 함수: camelCase, `use` prefix (`useAnalyzeForm.ts` → `useAnalyzeForm`, `useTickerSearch.ts` → `useTickerSearch`).
- 일반 모듈 파일·식별자: camelCase (`actionLabels.ts`, `errorMessages.ts`, `formatMoney.ts`).
- kebab-case 파일명 금지. 단 도구 산출물·외부 도구 명명 규약을 따르는 파일은 예외 (`package-lock.json`, `tailwind.theme.json`, `next-env.d.ts`, `postcss.config.mjs` 등).
- `hooks/query/` 의 페칭 훅은 종류를 파일명·함수명에서 즉시 인식하도록 `useQuery~~` / `useMutation~~` 프리픽스를 쓴다 (예: `useQueryWhitelistSearch.ts`, `useMutationAnalyzeWorkbench.ts`).

## 커스텀훅 의무화

- 화면·컴포넌트 코드 (`app/**/*.tsx`, `components/**/*.tsx`) 는 TanStack Query 훅 (`useQuery`, `useMutation`) 을 **직접 import 하지 않는다**. 페칭 훅을 import 할 때도 `@/hooks/query/*` 를 거치지 않고 도메인 훅을 import.
- 페칭 훅은 `hooks/query/` 에 둔다. 도메인 훅 (`hooks/<domain>/use*`) 안에서만 호출한다.
- 화면·컴포넌트는 `hooks/<domain>/use*` 만 import 한다. mutation 의 `mutate`·`reset`·`isPending` 같은 TanStack Query 내부 인터페이스는 도메인 훅의 외부 인터페이스 (`submit`·`reset`·`isPending` 등) 로 추상화해 노출.
- 도메인 훅 책임 경계는 "**TanStack Query 인터페이스 누출 금지**" 만 강제. 그 외 (예: "도메인 의미가 있는 상태·콜백은 모두 도메인 훅이 책임") 는 케이스마다 다르므로 강제하지 않는다.

## 폴더 구조 — 도메인 한 뎁스

- `hooks/`, `lib/copy/`, `lib/types/`, `lib/validation/` 의 직속 파일은 두지 않는다. 모든 모듈은 도메인 폴더 (`workbench/` 등) 안에 둔다.
- `lib/api/` 는 인프라성 단일 파일 (`client.ts`, `errors.ts`) 만 직속 허용. 도메인 API 모듈은 `lib/api/<domain>/` 안에 둔다.
- 도메인 무관 헬퍼는 `lib/utils/` 직속에 둔다 (`cn.ts`, `formatMoney.ts`, `formatPct.ts`). `lib/utils/` 안에 헬퍼가 10개 이상 누적되면 카테고리화 검토.
- 도메인 폴더명은 **비즈니스 도메인 단위**로 통일한다 (예: `workbench/`, 후속 `portfolio/`, `alerts/`). 한 화면이 여러 도메인을 호출하더라도 폴더는 비즈니스 단위 그대로.
- `lib/api/workbench/index.ts` 같은 barrel re-export 는 두지 않는다. 직접 경로 (`@/lib/api/workbench/analyze`) 로 import. 이유: import 경로의 명확성·tree-shaking·grep 신뢰도.

## `cn` 헬퍼

- 조건부 className, variant 분기, 외부 className prop 합성에는 `cn(...)` 을 사용한다 (`@/lib/utils/cn`). 즉흥 합성 (`\`${a} ${b}\``, `[a, cond && b].filter(Boolean).join(" ")`) 금지.
- 정적 단일 className 에는 강제하지 않는다 (예: `<div className="text-sm" />`).
- `cn` 은 `clsx` + `tailwind-merge` 기반. 기본 설정으로 시작하되, 커스텀 토큰 충돌이 관찰되면 `extendTailwindMerge` 어댑터를 `lib/utils/cn.ts` 안에 추가한다.

## App Router `layout.tsx` 컨벤션

- 화면이 한 개일 때는 `app/layout.tsx` + `app/page.tsx` 의 평탄 구조를 유지한다.
- 두 번째 화면 도입 시점에 라우트 그룹 `app/(group)/layout.tsx` 패턴을 채택한다. 그룹 단위로 헤더·푸터·shell 을 묶는다.
- 재사용 React 컴포넌트 (`Shell`, `TopBar`) 의 `components/layout/` 추출은 **두 번째 화면이 첫 화면의 shell·헤더를 실제로 공유한다고 판단될 때** 한다 (단일 화면에서 추상화는 과함). 풀스크린 onboarding 처럼 shell 을 공유하지 않는 화면이면 추출하지 않는다.

## `lib/copy/` 유지 이유

- `lib/copy/` 는 향후 i18n 도입 여지로 의도적으로 유지한다. 사용자 노출 한글 카피는 `lib/copy/<domain>/` 에 모은다. `lib/utils/` 와 합치지 않는다.

## TanStack Query key 명명

- query key 는 `hooks/query/queryKeys.ts` 한 곳에 모은다. 컴포넌트·도메인 훅에서 인라인 배열 리터럴로 key 를 만들지 않는다. invalidate / refetch 시 동일 상수를 참조해 키가 어긋나지 않게 한다.

## 반응형 — CSS 측 vs JS 측 1차 도구

- **CSS 측 1차 도구 = Tailwind 반응형 prefix** (`sm:`, `md:`, `lg:`, `xl:`). 레이아웃·간격·폰트 크기·padding·margin·grid·max-width 등 시각·레이아웃 변경은 prefix 로 처리한다. prefix 로 표현 가능한 변경을 JS 분기로 처리하는 것은 금지 (리렌더 비용 + hydration 일관성 측면에서 prefix 우선).
- **JS 측 1차 도구 = `useBreakpoint` 훅** (`@/hooks/utils/useBreakpoint`). 반환은 `{ isMobile, isTablet, isDesktop }` boolean 셋. 조건부 렌더(예: 데스크탑에서만 보이는 hint), 이벤트 바인딩 분기(예: 데스크탑에서만 `keydown` 단축키 리스너), DOM 트리·동적 동작 분기 등 **JS 분기가 필요한 경우에만** 사용한다.
- **`window.innerWidth` 직접 검사 금지** — SSR-unsafe + listener 누락 위험. `matchMedia` 직접 호출도 금지 (컴포넌트는 `useBreakpoint` 만 import). 본 훅이 listener 등록·정리·SSR 폴백을 일관 처리한다.
- **`useBreakpoint` 위치 = `hooks/utils/`** — 도메인 무관 React 훅의 단일 위치. 도메인 훅은 `hooks/<domain>/`, 도메인 무관 헬퍼(`cn`, `formatMoney` 등 React 훅 외) 는 `lib/utils/` 그대로 유지.
- **SSR-safe 가정 = 모바일 퍼스트** — 서버·첫 클라이언트 렌더는 항상 `{ isMobile: true, isTablet: false, isDesktop: false }`. 클라이언트 마운트 후 `useEffect` 에서 실제 viewport 로 swap. hydration mismatch 0건이 의무.
- **breakpoint 값의 단일 진실 원천 = DESIGN.md** (`docs/design/<slug>.md` 의 `breakpoints` 절). `npm run design:sync` 가 `tailwind.theme.json.theme.extend.screens` 로 주입 → `tailwind.config.ts` 의 어댑터가 흡수 → Tailwind prefix 와 `useBreakpoint` 의 경계값이 동일 값을 참조. 현재 채택값: Tailwind 기본 정합 (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280).
