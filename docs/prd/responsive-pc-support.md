# PRD: responsive-pc-support

- **slug**: `responsive-pc-support`
- **작성일**: 2026-05-21
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6~#15 흐름 (BE 분리 → 아키텍처 → 화면 → Tailwind → FE 컨벤션) 머지 직후. 단일 화면이 모바일 480px 컨테이너 하나에만 맞춰져 있어 데스크탑 가독성과 JS 분기 필요 동작의 토대가 부재.
- **UI 포함 여부**: **yes** (DESIGN.md 에 breakpoint 토큰 + 데스크탑 레이아웃 가이드 추가 필요. 컴포넌트 className 변경 + 데스크탑 grid 재배치. UX/UI 디자이너 합류 트리거.)
- **선행 / 후행 관계**: 선행 — PR #11 (`workbench-analyze-rebuild`), PR #13 (`tailwind-migration`), PR #15 (`fe-conventions`). 후행 — 본 PRD 머지 후 큐잉된 마지막 작업으로 `chore/sync-agent-conventions` (별도 chore PR, 본 PRD 범위 외) 가 예정됨. 후속 PRD (두 번째 화면·도메인) 들은 본 PRD 의 `useBreakpoint` 와 반응형 컨벤션을 묵시적 전제로 한다.

## 1. 배경 / 문제

PR #6~#15 흐름으로 BE 분리·아키텍처·화면·Tailwind·FE 컨벤션이 모두 정착됐다. 그러나 현재 화면은 **모바일 480px 컨테이너 (`.mobileShell`) 하나** 만 지원한다. 데스크탑에서 접속해도 같은 480px 컬럼이 가운데 정렬될 뿐이라, 다음 문제가 누적되고 있다.

1. **데스크탑 가독성 저하** — 결과 6블록 (`action` / `feasibility` / `brief` / `risk_plan` / `horizons` / `warnings`) 이 모바일 한 컬럼에 길게 쌓여, 데스크탑에서는 화면 좌우 여백이 비대하고 세로 스크롤이 불필요하게 길다. 데스크탑은 2~3 컬럼 grid 로 조밀하게 배치하는 편이 정보 밀도가 높은 금융 도구의 톤 (`AGENTS.md` §작업 원칙) 에 정합.
2. **JS 분기 필요 동작의 토대 부재** — 데스크탑 단축키·hover·focus ring 강조, 모바일 전용 인터랙션 등 "뷰포트 종류에 따라 JS 동작이 다른" 케이스가 다가오는데, 현재는 viewport 종류를 알 방법이 없다. Tailwind 의 미디어 쿼리 prefix (`md:`/`lg:`) 는 CSS 표현에만 유효하고, 조건부 렌더·이벤트 바인딩 분기에는 쓸 수 없다.
3. **CSS·JS 도구 사용 기준 부재** — Tailwind 반응형 prefix 와 JS 훅 (`useBreakpoint`) 둘 중 무엇을 언제 쓰는지의 룰이 못 박혀 있지 않다. 향후 FE Dev 가 같은 케이스를 다르게 처리하는 비일관성이 누적될 위험.
4. **DESIGN.md 의 breakpoint 토큰 공백** — 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 에 breakpoint 정의가 없다. PR #13 의 Tailwind theme export 파이프라인 (`npm run design:sync`) 이 흘려보낼 토큰이 없어, `tailwind.config.ts` 가 Tailwind 기본 `screens` 를 묵시적으로 채택하고 있다. DESIGN.md ↔ Tailwind 의 단일 진실 원천 규칙 (PR #13 의 핵심 가정) 이 breakpoint 차원에서 깨져 있다.

사용자가 결정한 사항:

> "모바일 PC 둘다 대응되도록 만들어야해. 반응형 고려하면서 지금 화면이 mobile인지 pc인지 알 수 있는 커스텀훅도 필요할거야."

이 두 결정 (반응형 PC 대응 + `useBreakpoint` 훅) 을 단일 PRD 로 정리해 그 위에서 작업한다.

## 2. 목표

- **모바일 무회귀** — 모바일 (`< md`) 에서 PR #11 의 라운드트립 5건 (`AAPL` · `BTC-USD` · 비분할가능 · 화이트리스트 비매칭 · 5xx 폴백) 이 본 PRD 머지 후에도 시각·동작 동일.
- **데스크탑 (`>= lg`) 신규 레이아웃** — 결과 6블록을 2~3 컬럼 grid 로 재배치해 화면 한 폭에 핵심 정보가 들어오도록 한다. 데스크탑 최대폭은 1024~1280px 범위에서 디자이너 합류 단계에 확정.
- **`useBreakpoint` 훅 신설** — JS 분기가 필요한 케이스 (단축키·이벤트 바인딩·조건부 렌더 등) 에 1차 도구로 쓸 도메인 무관 훅을 `hooks/utils/useBreakpoint.ts` 에 둔다. SSR-safe (Next.js App Router 의 SSR/Edge 환경에서 hydration mismatch 0건).
- **DESIGN.md breakpoint 토큰** — 디자이너 산출물에 breakpoint 정의 추가 (Tailwind 기본 `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 정합 권고). `npm run design:sync` 가 흘려보내는 토큰이 `tailwind.config.ts` 의 `screens` 로 반영되어, breakpoint 도 DESIGN.md 단일 진실 원천 규칙에 편입.
- **CSS·JS 도구 사용 기준 명문화** — `docs/rules/frontend.md` 에 "반응형 절" 추가. **CSS 측 1차 도구는 Tailwind 반응형 prefix, JS 측 1차 도구는 `useBreakpoint`** 라는 룰과 사용 케이스 가이드를 못 박는다.
- **AGENTS.md 원칙 무회귀** — 한글 톤·직접 호출 금지·env 단일 진입·기본 접근성 (label 연결, 키보드 탭 순서, 상태 강조 텍스트 동반) 무회귀.
- **build / typecheck / lint 0 에러**.

## 3. 범위 (In scope)

### 3.1 DESIGN.md breakpoint 토큰 추가

- `docs/design/workbench-analyze-rebuild.md` 의 front matter 에 `breakpoints` (또는 `screens` 동등 키) 절 추가.
- 권고 값 (Tailwind 기본 정합):

  ```yaml
  breakpoints:
    sm: 640px
    md: 768px
    lg: 1024px
    xl: 1280px
  ```

- 디자이너가 합류 단계에서 도메인 친화 값 (예: `mobile` 480 / `tablet` 768 / `desktop` 1024) 으로 재명명할지 결정. **PM 권고: Tailwind 기본 정합** — 학습 비용·외부 자료 정합·tailwind-merge 의 기본 그룹 인식에 모두 유리.
- 디자이너 산출물에 **데스크탑 (`>= lg`) 레이아웃 가이드** 추가:
  - 메인 컨테이너 최대폭 (권고 1024~1280px 범위, 디자이너 확정).
  - 결과 6블록의 데스크탑 grid 배치 (권고: 2 컬럼 또는 3 컬럼, 디자이너 확정).
  - 입력 패널 (`SearchPanel` + `InputPanel`) 의 데스크탑 위치 (좌측 sidebar vs 상단 가로 배치).
- DESIGN.md 의 다른 토큰 (색·간격·radius·typography·shadow) 은 변경하지 않는다.
- `npx @google/design.md lint docs/design/workbench-analyze-rebuild.md` 0 에러.

### 3.2 `npm run design:sync` 실행 + Tailwind theme 정합

- `npm run design:sync` 실행 → `tailwind.theme.json` 의 `screens` (또는 동등 키) 에 §3.1 의 breakpoint 가 반영.
- `tailwind.config.ts` 의 어댑터가 `tailwind.theme.json.screens` 를 `theme.screens` 또는 `theme.extend.screens` 로 흡수.
- `tailwind.config.ts` 가 Tailwind 기본 `screens` 를 묵시적으로 채택하던 부분을 명시적 흡수로 전환.
- export 도구의 출력 스키마가 Tailwind 와 정합하지 않을 경우 PR #13 의 어댑터 함수 (`adaptDesignTokensToTailwind` 등 명명) 안에서 breakpoint 도 흡수 — FE Dev 재량.

### 3.3 `useBreakpoint` 훅 신설

- 경로: `hooks/utils/useBreakpoint.ts` (도메인 무관 헬퍼는 `hooks/utils/` 또는 `lib/utils/` — 본 PRD 는 React 훅이므로 `hooks/utils/` 채택. PR #15 의 "도메인 한 뎁스 + 도메인 무관 헬퍼는 `lib/utils/`" 룰의 React 훅 버전 확장).
- 반환 형태: **`{ isMobile, isTablet, isDesktop }` (boolean 셋)** 채택 (사용자 결정 / PM 권고 일치).
  - `isMobile`: `< md` (즉 `< 768px`).
  - `isTablet`: `>= md` 이고 `< lg` (즉 `768 ~ 1023px`).
  - `isDesktop`: `>= lg` (즉 `>= 1024px`).
  - 경계값은 §3.1 에서 디자이너 확정. 본 PRD 의 가정값은 Tailwind 기본 정합.
- 구현 가이드 (FE Dev 재량):
  - `window.matchMedia(query)` 기반.
  - SSR-safe: 서버 초기 렌더 시 일관된 기본값을 반환 (PM 권고: `isMobile: true` — 모바일 퍼스트 가정. 그 경우 서버·클라이언트 첫 렌더가 항상 모바일 값으로 일치 → hydration mismatch 없음. 클라이언트 마운트 직후 effect 에서 실제 값으로 swap).
  - listener cleanup 의무 (React StrictMode 더블 마운트 대응).
  - 재사용 가능한 단일 훅 — 호출처마다 listener 가 별도 생성되어도 무방하나, FE Dev 가 모듈 레벨 store 로 최적화하는 것도 허용.
- 타입:

  ```ts
  export interface BreakpointState {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  }
  export function useBreakpoint(): BreakpointState;
  ```

- 함수·파일 export 명: `useBreakpoint` (PR #15 의 camelCase + `use` prefix 룰 정합).

### 3.4 컴포넌트 반응형 적용

- 적용 대상: `app/page.tsx`, `components/workbench/*` 12개.
- **CSS 측 1차 도구 — Tailwind 반응형 prefix (`md:`/`lg:` 등)** 로 처리하는 범위:
  - 메인 컨테이너 폭 (`.mobileShell` → 모바일 480px + `md:max-w-2xl` + `lg:max-w-6xl` 등, 정확한 값은 디자이너 확정).
  - 결과 6블록 grid 배치 (`grid-cols-1` + `lg:grid-cols-2` 또는 `lg:grid-cols-3`).
  - 입력 패널의 위치·폭.
  - 폰트 크기·간격·padding 의 데스크탑 조정 (DESIGN.md 토큰 범위 내).
- **JS 측 1차 도구 — `useBreakpoint`** 로 처리하는 범위 (본 PRD 에서는 인터페이스만 노출, 실제 활용 케이스는 자연스럽게 발생하는 것만):
  - 조건부 렌더 (예: 모바일에서만 보이는 hint, 데스크탑에서만 보이는 단축키 안내).
  - 이벤트 바인딩 분기 (예: 데스크탑에서만 `keydown` 단축키 리스너 등록).
  - 동적 동작 (예: 데스크탑에서 hover 시 추가 정보 표시, 모바일에서 swipe 인터랙션).
  - **본 PRD 범위: 최소 1곳 이상에서 `useBreakpoint` 가 실제로 사용되어야 함** — "훅을 만들었으니 어디든 한 번은 써본다" 의 sanity check 차원. 실제 활용 케이스를 디자이너·FE Dev 가 협업해 1건 식별 (예: 데스크탑에서만 `EmptyState` 의 키보드 단축키 hint 노출, 또는 데스크탑에서만 입력 패널이 sticky). 활용 케이스 없으면 본 PRD 의 AC-3a 로 후속 PRD 에서 첫 실사용을 받는다.
- 정적 단일 className 은 손대지 않는다 (PR #15 의 `cn` 룰 정합).

### 3.5 컨벤션 문서 확장 — `docs/rules/frontend.md`

PR #15 의 7개 절 뒤에 "반응형" 절 추가:

8. **반응형 — CSS 측 vs JS 측 1차 도구**
   - **CSS 측 1차 도구**: Tailwind 반응형 prefix (`sm:`/`md:`/`lg:`/`xl:`). 레이아웃·간격·폰트·시각 변경은 prefix 로 처리.
   - **JS 측 1차 도구**: `useBreakpoint` (`@/hooks/utils/useBreakpoint`). 조건부 렌더·이벤트 바인딩 분기·동적 동작 등 JS 분기가 필요한 경우에만 사용.
   - prefix 로 표현 가능한 레이아웃 변경을 `useBreakpoint` + JS 분기로 처리하는 것을 금지 (리렌더 비용·hydration 일관성 측면에서 prefix 우선).
   - breakpoint 값은 `docs/design/<slug>.md` 의 `breakpoints` 절 단일 진실 원천. `npm run design:sync` 가 `tailwind.theme.json` 으로 흘려보내고, `tailwind.config.ts` 가 흡수. `useBreakpoint` 의 경계값도 동일 값을 참조 (하드코딩 허용하되 DESIGN.md 와 동기화 의무).
   - `useBreakpoint` 는 SSR-safe 한 기본값 (모바일 퍼스트) 을 반환. hydration mismatch 0건이 의무.

### 3.6 빌드 / 타입 / 린트 무회귀

- `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- `package-lock.json` 변경 없음 (외부 의존성 추가 0건 — `matchMedia` 는 브라우저 표준).

## 4. 비범위 (Out of scope)

- DESIGN.md 의 breakpoint 외 토큰 변경 (색·간격·radius·typography·shadow).
- 차트 / 시각화 라이브러리 도입.
- shadcn/ui · 다크 모드.
- 새 도메인 추가 (`portfolio`, `alerts` 등).
- 키보드 단축키 / hover 동작 본격 도입 — `useBreakpoint` 인터페이스만 노출하고 §3.4 의 sanity check 1건만 본 PRD 안에서 처리. 본격 단축키·hover 시스템은 후속 PRD.
- Vercel 환경변수·도메인 추가.
- 모바일 전용 / 데스크탑 전용 분리 라우트 — 한 라우트에서 반응형으로 흡수.
- E2E / 시각 회귀 테스트 도입.
- PR #11/#13/#15 의 follow-up nit (예: `.mcp.json`, placeholder 동적화, `offline` 토글 UI, `ai_summary` 카피 재검토, components/layout 추출). 본 PRD 작업 중 자연스럽게 흡수되는 경우만 PR 본문 "범위 외 함께 흡수" 절에 명시.
- 본 PRD 머지 후 큐잉된 `chore/sync-agent-conventions` — 별도 chore PR. 본 PRD 범위 외.
- `useBreakpoint` 의 모듈 레벨 store 최적화·debounce·resize 이벤트 spam 방지 — 1차 구현은 `matchMedia` 단순 listener 로 충분. 최적화는 측정 후 후속 PRD.
- BE / route handler / API contract 변경.
- 다국어 (i18n).
- 새 라우트 그룹 도입 (`app/(group)/layout.tsx` 패턴) — PR #15 의 "두 번째 화면 추가 시점" 트리거 그대로 유지.

## 5. 수용 기준 (AC)

검증 가능한 문장.

- **AC-1 (DESIGN.md breakpoint 토큰)**:
  - `docs/design/workbench-analyze-rebuild.md` 의 front matter 에 `breakpoints` (또는 동등) 절 존재. 최소 `sm`/`md`/`lg`/`xl` 4개 키 또는 디자이너 확정 명명.
  - `docs/design/workbench-analyze-rebuild.md` 에 데스크탑 (`>= lg`) 레이아웃 가이드 (메인 컨테이너 최대폭 + 결과 6블록 grid 배치 + 입력 패널 위치) 가 본문 또는 components 절에 명시.
  - `npx @google/design.md lint docs/design/workbench-analyze-rebuild.md` 0 에러.
- **AC-2 (Tailwind theme 정합)**:
  - `npm run design:sync` 실행 시 0 에러 종료.
  - `tailwind.theme.json` 의 `screens` (또는 동등 키) 에 §3.1 의 breakpoint 가 존재.
  - `tailwind.config.ts` 가 그 키를 `theme.screens` 또는 `theme.extend.screens` 로 흡수 (어댑터 함수 경유 허용).
- **AC-3 (`useBreakpoint` 훅 존재 + SSR-safe + 실사용)**:
  - `hooks/utils/useBreakpoint.ts` 파일 존재.
  - export: `function useBreakpoint(): { isMobile: boolean; isTablet: boolean; isDesktop: boolean }`.
  - SSR 환경에서 hydration mismatch 0건 (`npm run build` + 프로덕션 서버 또는 dev 서버에서 첫 렌더 시 콘솔에 `Warning: Text content did not match` 류 0건).
  - 본 PRD 안에서 컴포넌트 최소 1곳이 `useBreakpoint` 를 실제로 import·사용 (`git grep -l "useBreakpoint" -- app/ components/ | wc -l >= 1`).
- **AC-4 (모바일 무회귀)**:
  - 모바일 뷰 (Chrome DevTools 375px 또는 디자이너 확정 모바일 폭) 에서 PR #11 의 라운드트립 5건 (a~e: `AAPL` 통과 / `BTC-USD` 통과 / 비분할가능 / 화이트리스트 비매칭 / 5xx 폴백) 이 동일한 화면·동작 결과.
  - QA 가 dev 환경에서 5건 모두 재현 + 화면 캡처·육안 비교.
- **AC-5 (데스크탑 신규 레이아웃)**:
  - 데스크탑 뷰 (`>= lg`, 즉 `>= 1024px`) 에서 결과 6블록이 디자이너 산출물의 grid 배치 (2 컬럼 또는 3 컬럼) 로 재배치되어 보임.
  - 데스크탑에서 메인 컨테이너 최대폭이 디자이너 확정 값 이내.
  - 입력 패널 (`SearchPanel` + `InputPanel`) 이 디자이너 확정 위치 (좌측 sidebar 또는 상단 가로) 로 보임.
  - feasibility 비현실 강조·warnings 강조·action label 매핑 등 6블록의 도메인 표현은 모바일과 동일.
- **AC-6 (Tailwind 반응형 prefix 우선)**:
  - 레이아웃 변경 (grid · max-width · padding · margin · 폰트 크기 · 줄간격) 은 Tailwind prefix (`md:`/`lg:`) 로 처리. JS 분기 (`if (isMobile) ...`) 로 동일 효과를 내는 패턴 0건.
  - `git grep -nE "useBreakpoint\(\)" -- app/ components/` 의 사용처는 (a) 조건부 렌더, (b) 이벤트 바인딩 분기, (c) 동적 동작 중 하나여야 함. 단순 className 분기 (`className={isMobile ? "..." : "..."}`) 가 Tailwind prefix 로 표현 가능한 케이스인 경우, reviewer 가 "prefix 로 가능" 으로 reject 가능.
- **AC-7 (build / typecheck / lint)**:
  - `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
  - `tailwind.theme.json` 의 변경분이 `npm run design:sync` 로 재생산 가능 (재현 가능성).
- **AC-8 (AGENTS.md 원칙 무회귀)**:
  - 사용자 노출 문구 한글 유지 (ticker / API 필드 / 고유명사 제외).
  - 직접 호출 금지 (`git grep -nE "http://127\.0\.0\.1" -- app/` 결과 0건, route handler fallback 제외).
  - 환경변수 단일 진입 — env 추가·이동·이름 변경 없음.
  - 기본 접근성 (label 연결, 키보드 탭 순서, 상태 강조의 텍스트 동반) 무회귀. 데스크탑 grid 배치 후에도 키보드 탭 순서가 자연스러운 시각 순서를 따른다 (좌→우, 위→아래).
- **AC-9 (컨벤션 문서 확장)**:
  - `docs/rules/frontend.md` 에 "반응형" 절 (§3.5 의 내용) 이 추가됨. CSS 측 / JS 측 1차 도구 구분, breakpoint 값의 단일 진실 원천, `useBreakpoint` SSR-safe 의무가 모두 명시.
  - 기존 7개 절 (PR #15) 무회귀.
- **AC-10 (수동 QA 시나리오)**:
  - (a) Chrome DevTools 모바일 모드 (375px) 에서 PR #11 라운드트립 5건 재현, 시각·동작 동일.
  - (b) 데스크탑 (`>= 1024px`) 에서 결과 6블록 grid 배치 + feasibility 비현실 강조가 정상 표시.
  - (c) 뷰포트 리사이즈 시 (모바일 → 데스크탑, 데스크탑 → 모바일) `useBreakpoint` 가 매끄럽게 갱신되어 `useBreakpoint` 활용처의 동작이 즉시 전환.
  - (d) 새로고침 시 SSR hydration mismatch 콘솔 경고 0건 (dev 모드 + production build 모두).
  - (e) `npm run design:sync` 후 `npm run build` 까지 한 사이클 0 에러.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 선행 PRD `workbench-analyze-rebuild` (PR #11), `tailwind-migration` (PR #13), `fe-conventions` (PR #15) 가 머지되어 있고, 메인은 `38601da` 기준이며 워킹트리는 깨끗하다고 가정.
- 도메인이 현재 `workbench` 한 개라는 전제. `useBreakpoint` 는 도메인 무관 (`hooks/utils/`) 이라 도메인 추가에 영향받지 않는다.
- breakpoint 값은 Tailwind 기본 (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280) 을 가정값으로 사용하되, 디자이너가 합류 단계에서 도메인 친화 값으로 재명명·재정의할 수 있다. AC 의 경계값 (`< 768px`, `>= 1024px`) 은 가정값이며 디자이너 확정 후 자동 갱신된다.
- `useBreakpoint` 의 SSR 초기값은 "모바일 퍼스트" 가정 (`isMobile: true`). 본 저장소가 Vercel Edge/SSR 환경을 쓰므로 서버·클라이언트 첫 렌더 일치성이 hydration 비용보다 우선.
- DESIGN.md export 도구 (`@google/design.md`) 의 `--format tailwind` 가 breakpoint 토큰을 Tailwind `screens` 키로 흘려보낸다고 가정. 도구 출력이 정합하지 않으면 PR #13 의 어댑터 함수 (`tailwind.config.ts` 옆) 에 breakpoint 변환을 추가 — FE Dev 재량.
- React `matchMedia` listener 의 StrictMode 더블 마운트 대응 — `useEffect` cleanup 에서 listener 제거 의무. PM 권고: `MediaQueryList.addEventListener('change', handler)` / `removeEventListener('change', handler)` 패턴.
- `lib/utils/` (PR #15) 는 도메인 무관 **헬퍼** 의 위치이고, `hooks/utils/` 는 도메인 무관 **React 훅** 의 위치다. 두 폴더의 책임 분리는 PR #15 의 "React 훅은 `hooks/`, 그 외 헬퍼는 `lib/`" 룰의 자연 확장.
- 본 PRD 머지 후 마지막 작업으로 `chore/sync-agent-conventions` (별도 chore PR) 가 큐잉되어 있다. 본 PRD 의 범위 외이며, 본 PRD 머지 후 별도 진입.
- 데스크탑 전용 단축키·hover 시스템은 본 PRD 범위 외. `useBreakpoint` 의 인터페이스만 노출 + sanity check 1건만 처리.
- 사용자가 한글 톤을 강하게 선호하므로 사용자 노출·문서 한글 우선.

## 7. 참고

- `AGENTS.md` — 작업 원칙, 에이전트 역할, PRD 양식, 산출물 위치.
- `docs/rules/frontend.md` — FE 규칙. 본 PRD 가 §3.5 의 "반응형" 절을 추가.
- `docs/rules/design-md.md` — DESIGN.md 포맷 + export 파이프라인. 본 PRD 가 breakpoint 토큰을 그 파이프라인에 편입.
- `docs/rules/review.md`, `docs/rules/test.md` — 인접 규칙 (본 PRD 범위 외, 무회귀).
- `docs/prd/workbench-analyze-rebuild.md` — 화면 PRD. 라운드트립 5건 (모바일 무회귀 AC) 의 출처.
- `docs/prd/tailwind-migration.md` — 스타일링 PRD. DESIGN.md → Tailwind theme 파이프라인의 출처.
- `docs/prd/fe-conventions.md` — 컨벤션 PRD. 본 PRD 의 `useBreakpoint` 위치 (`hooks/utils/`) 가 그 컨벤션의 자연 확장.
- `docs/design/workbench-analyze-rebuild.md` — 디자이너 산출물. 본 PRD 가 breakpoint 토큰 + 데스크탑 레이아웃 가이드를 추가하는 대상.
- `tailwind.config.ts`, `tailwind.theme.json` — PR #13 산출물. 본 PRD 가 breakpoint 를 흡수.
- `app/components.css` — PR #13 의 `@layer components` 합성 토큰. 본 PRD 에서 minimal 추가 가능 (필요 시).
- `app/globals.css` — PR #13 후 약 46 라인. 본 PRD 에서 minimal 추가 가능 (잔여물 추가 시 한 줄 사유 코멘트 의무).
- `app/page.tsx`, `app/layout.tsx`, `app/providers.tsx` — 메인 컨테이너 폭·grid 결정 / 반응형 적용 대상.
- `components/workbench/*` 12개 — 반응형 className 적용 대상.
- `hooks/workbench/*`, `hooks/query/*` — 현 폴더 구조. `useBreakpoint` 의 위치 결정 근거.
- `lib/utils/cn.ts`, `lib/utils/formatMoney.ts`, `lib/utils/formatPct.ts` — PR #15 산출물. 도메인 무관 헬퍼의 단일 위치.
- `docs/HANDOFF.md` PR #6~#15 entry — 직전 흐름 컨텍스트.
- 후속 작업 (별도 PR, 본 PRD 범위 외): `chore/sync-agent-conventions` — 본 PRD 머지 후 진입 예정.
- Tailwind 반응형 prefix 공식 문서: <https://tailwindcss.com/docs/responsive-design>
- MDN `Window.matchMedia`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia>

## 8. 영향 분석

본 PRD 가 코드베이스에 미치는 영향 범위와 추정 작업량.

- **`docs/design/workbench-analyze-rebuild.md`** — front matter 에 `breakpoints` 절 추가 (4~6 라인). 본문에 데스크탑 레이아웃 가이드 절 추가 (20~40 라인). 합계 25~50 라인 추가.
- **`tailwind.theme.json` (생성물)** — `npm run design:sync` 의 출력. `screens` 키 추가. 4~6 라인 자동 추가.
- **`tailwind.config.ts`** — `theme.screens` 또는 `theme.extend.screens` 흡수 1~3 라인. 어댑터 함수 갱신 시 5~10 라인.
- **`hooks/utils/useBreakpoint.ts` (신규)** — 약 30~60 라인. `matchMedia` 기반 + SSR-safe + cleanup.
- **`hooks/utils/` 폴더 신설** — `hooks/workbench/`, `hooks/query/` 옆에 추가.
- **`app/page.tsx`** — 메인 컨테이너 폭·grid 의 반응형 className 추가 (`md:`/`lg:` prefix). 약 10~30 라인 수정 추정.
- **`components/workbench/*` 12 파일** — 데스크탑 grid 배치에 따른 className 조정. 파일당 평균 5~20 라인 수정. 12 파일 중 일부 (특히 `ResultGroup`, `ActionCard`, `FeasibilityCard`, `BriefCard`, `RiskPlanCard`, `HorizonsCard`, `WarningsCard`) 가 주 영향. 합계 60~150 라인 수정 추정.
- **`useBreakpoint` 활용처 1건 (sanity check)** — 컴포넌트 1곳에서 import + 사용. 5~15 라인 추가.
- **`docs/rules/frontend.md`** — "반응형" 절 추가. 약 15~25 라인 추가.
- **`package.json` / `package-lock.json`** — 의존성 추가 0건 (`matchMedia` 는 브라우저 표준). 변경 없음.
- **총 변경 규모 (추정)**:
  - 추가 약 150~300 라인 (디자인 가이드 + 훅 + 컴포넌트 반응형 className + 컨벤션 문서).
  - 삭제 약 10~30 라인 (`.mobileShell` 같은 단일 컨테이너 룰의 일부 조정).
  - 신규 파일 1개 (`hooks/utils/useBreakpoint.ts`).
  - **순 +150~250 라인 안팎** 의 PR.
- **PR 커밋 분할 (권고)**:
  1. `feat(design): breakpoint 토큰 + 데스크탑 레이아웃 가이드 추가 (DESIGN.md)`.
  2. `feat(tailwind): screens 토큰 흡수 — design:sync 결과 반영`.
  3. `feat(hooks): useBreakpoint 신설 — SSR-safe matchMedia 기반`.
  4. `feat(workbench): 데스크탑 반응형 grid 배치 + useBreakpoint 활용 1건`.
  5. `docs(rules): FE 컨벤션 반응형 절 추가 (CSS 측 prefix / JS 측 useBreakpoint)`.
- **회귀 위험**:
  - SSR hydration mismatch — 초기값 가정이 클라이언트와 일치하지 않으면 콘솔 경고 + 첫 렌더 깜빡임. **PM 권고: 모바일 퍼스트 (`isMobile: true`) 로 통일**해 서버·첫 클라이언트 렌더가 항상 모바일 값 → mismatch 0건. 위험 낮음.
  - StrictMode 더블 마운트에서 listener 누수 — `useEffect` cleanup 의무. 위험 낮음 (FE Dev 표준 패턴).
  - `tailwind-merge` 가 breakpoint prefix 의 충돌 해소를 어떻게 처리하는지 (`md:p-4 lg:p-6` 같은 케이스). Tailwind 의 기본 동작 정합. 위험 낮음.
  - 데스크탑 grid 배치 후 키보드 탭 순서가 시각 순서와 어긋날 가능성 — `tabIndex` 명시 또는 DOM 순서 조정. 위험 중간 (디자이너 합류 단계에서 시각 순서 ↔ DOM 순서 정합 확인 필요).
  - `useBreakpoint` 의 매 리렌더 비용 — 호출처가 많아지면 listener 가 N 개 생성. 1차 구현은 모듈 레벨 store 없이 단순 listener, 측정 후 최적화. 본 PRD 단계에서 위험 낮음 (호출처 1~2개 예상).
  - 데스크탑 레이아웃의 시각 변경이 디자이너 산출물과 일치하지 않을 가능성 — 디자이너 합류 단계에서 산출물 확정 후 FE Dev 가 구현하는 순서를 지킨다.

## 9. OPEN QUESTION

- `[OPEN QUESTION] breakpoint 값 — Tailwind 기본 vs 도메인 친화 커스텀` — `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 (Tailwind 기본) vs `mobile` 480 / `tablet` 768 / `desktop` 1024 같은 도메인 명명. **PM 권고: Tailwind 기본 그대로**. 학습 비용·외부 자료 정합·tailwind-merge 기본 그룹 인식·후속 디자이너 onboarding 비용 모두 유리. 본 PRD 가정값도 Tailwind 기본. 디자이너 합류 단계에서 최종 확정.
- `[OPEN QUESTION] useBreakpoint 반환 형태 — (A) {isMobile, isTablet, isDesktop} vs (B) {breakpoint: 'sm'|'md'|'lg'|'xl'} vs (C) {matches: {sm, md, lg, xl}}` — 사용자 결정: **(A) {isMobile, isTablet, isDesktop} 채택** (PM 권고 일치). 이유: 사용처에서 `if (isMobile) ...` / `if (isDesktop) ...` 직관적 분기. (B) 는 비교 (`if (breakpoint === 'lg' || breakpoint === 'xl')`) 가 verbose. (C) 는 raw 정보를 다 노출해 사용처가 자유롭지만 boilerplate 가 많다. §3.3 / AC-3 에 반영.
- `[OPEN QUESTION] 데스크탑 컨테이너 최대폭 — 1024px / 1280px / 풀폭` — 결과 6블록의 정보 밀도와 좌우 여백 비례. **PM 권고: 1280px 까지 허용 + 그 이상은 좌우 여백**. 1024px 는 lg 기점이라 너무 좁고, 풀폭은 한 줄에 들어오는 정보가 흩어진다. 디자이너 합류 단계에서 확정.
- `[OPEN QUESTION] 결과 6블록 데스크탑 grid 배치 — 2 컬럼 / 3 컬럼 / 비대칭` — 6블록의 우선순위와 시각 무게 (action/feasibility 가 가장 큰 시각 무게, warnings 는 강조 + 작게). **PM 권고: 비대칭 2 컬럼** — 좌측 큰 컬럼에 action + feasibility + brief, 우측 작은 컬럼에 risk_plan + horizons + warnings. 또는 3 컬럼 균등으로 정보 밀도 극대화. 디자이너 합류 단계에서 산출물로 확정.
- `[OPEN QUESTION] useBreakpoint SSR 초기값 — isMobile: true 모바일 퍼스트 vs isDesktop: true 데스크탑 퍼스트` — **PM 권고: isMobile: true 모바일 퍼스트**. 모바일 첫 렌더 후 클라이언트에서 데스크탑으로 swap 되는 깜빡임이, 데스크탑 첫 렌더 후 모바일로 swap 되는 깜빡임보다 모바일 절대다수 트래픽에서 덜 두드러진다. Vercel Edge SSR 도 user-agent 기반 분기 없이 일관된 모바일 응답을 내는 편이 단순.
- `[OPEN QUESTION] useBreakpoint listener 정리 시점 — StrictMode 더블 마운트 대응` — `useEffect(() => { ... addEventListener; return () => removeEventListener }, [])` 패턴이 정답. PM 권고: FE Dev 가 표준 React 패턴으로 처리. listener 가 매 마운트마다 새로 생성되어도 무방하나, 모듈 레벨 store 로 단일 listener 화하는 것도 허용 (측정 후 결정).
- `[OPEN QUESTION] useBreakpoint 위치 — hooks/utils/ vs lib/utils/` — React 훅이라 `hooks/` 가 정합. PR #15 가 `hooks/<domain>/` + `hooks/query/` 두 폴더만 만들었지만, `hooks/utils/` (도메인 무관 React 훅) 의 추가 신설은 자연 확장. **PM 권고: hooks/utils/ 채택**. `lib/utils/` 는 React 훅 외 헬퍼 (cn, formatMoney 등) 전용으로 유지.
- `[OPEN QUESTION] PR 분할 — 한 PR (디자인 토큰 + 훅 + 컴포넌트 적용) vs 두 PR (인프라 + 적용)` — (A) 디자인 토큰 + tailwind 어댑터 + 훅 신설 (인프라), (B) 컴포넌트 반응형 적용 (사용). **PM 권고: 한 PR**. 중간 상태가 "훅은 만들었으나 안 쓴다 / 토큰은 흡수했으나 컴포넌트는 모바일 그대로" 라 어색. reviewer 가 단계적으로 읽도록 §8 의 5개 커밋 단위로 분할.
- `[OPEN QUESTION] 데스크탑 sanity check 활용 1건 — 어떤 케이스로 useBreakpoint 를 처음 쓸 것인가` — 후보: (a) `EmptyState` 에서 데스크탑일 때만 키보드 단축키 hint 노출, (b) 데스크탑일 때만 입력 패널이 sticky, (c) 데스크탑 grid 의 일부 블록 (예: warnings) 을 모바일 접힘 → 데스크탑 펼침. **PM 권고: (a) 또는 (c)** — 둘 다 디자이너 산출물에서 자연스럽게 발생 가능. 본 PRD 단계에서는 후보 1건을 디자이너·FE Dev 가 함께 선택. 활용 케이스 없으면 본 PRD AC-3 의 "실사용 1건" 을 후속 PRD 에서 받아 본 PRD 의 AC 를 "훅 신설 + sanity check 는 후속" 으로 완화.
- `[OPEN QUESTION] tailwind-merge 의 반응형 prefix 충돌 해소 — 추가 설정 필요한가` — `tailwind-merge` 는 같은 prefix 안의 같은 유틸리티만 충돌 해소한다 (`md:p-4 md:p-6` → `md:p-6`). 다른 prefix (`md:p-4 lg:p-6`) 는 충돌이 아니므로 둘 다 유지. **PM 권고: 기본 동작 그대로**. 본 PRD 의 시나리오에 추가 설정 없이 충분.
- `[OPEN QUESTION] 모바일 컨테이너 480px → 반응형 후 최대폭 룰 — .mobileShell 는 유지하나 폐기하나` — `.mobileShell` 의 480px 컨테이너는 모바일에서는 의미 없음 (뷰포트가 이미 480 미만). 데스크탑에서만 의미가 있었는데 본 PRD 가 데스크탑 grid 를 도입하면 더 이상 필요 없을 수 있다. **PM 권고: 폐기 + Tailwind 유틸리티 (`mx-auto max-w-md md:max-w-2xl lg:max-w-7xl` 같은) 로 대체**. 디자이너 산출물의 최종 폭 확정에 따라 FE Dev 가 결정. 단 이 결정은 본 PRD AC-4 (모바일 무회귀) 와 충돌하면 안 됨.
