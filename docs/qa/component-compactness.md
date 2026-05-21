# QA 리포트 — component-compactness (PR #22)

- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/22
- **브랜치**: `feature/component-compactness`
- **base SHA**: `c63b6f9` (main)
- **head 커밋 4종**:
  - `2034d0d` docs(prd): component-compactness PRD 추가
  - `61005a1` docs(design): component-compactness DESIGN.md v5 신설
  - `8c055fb` chore(tokens): design:sync v5 갱신 + 합성 토큰 컴팩트화
  - `c18ca7d` feat(workbench): 컴포넌트 컴팩트화 + dropdown outside-click + nit 흡수
- **PRD**: `docs/prd/component-compactness.md` (AC 19건)
- **DESIGN.md v5**: `docs/design/component-compactness.md`
- **검증일**: 2026-05-22
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`

## 0. 자동화 결과 — 한눈에

| 명령 | 기대 | 실측 | 판정 |
|---|---|---|---|
| `npm run typecheck` | 0 에러 | 0 에러 (`tsc --noEmit` 빈 stdout) | PASS |
| `npm run lint` | 0 에러 | 0 에러 (`eslint .` 빈 stdout) | PASS |
| `npm run build` | 0 에러, 6 static pages | 0 에러, 6 pages, `✓ Compiled successfully in 716ms` | PASS |
| `npm run design:sync` (v5 토큰 라이브) | 결정적 산출물 | `input-h=36px` ↔ `input-h=38px` 갱신·복원 결정적 | PASS |
| `git grep "http://127.0.0.1" -- app/` | route handler 2건만 | `app/api/whitelist/search/route.ts:11`, `app/api/workbench/analyze/route.ts:11` (둘 다 BFF fallback) | PASS |
| `git grep "fetch(" -- components/ hooks/ lib/api/workbench/` | 0건 | 0건 | PASS |
| `git grep "60px" -- components/layout/` | 코드 0건 (주석 OK) | 3건 모두 주석 (`Navbar.tsx:4`, `Sidebar.tsx:27,30`) | PASS |
| `git grep "h-\\[[0-9]+px\\]" -- components/workbench/InputPanel.tsx` | 0건 | 0건 | PASS |
| `git diff c63b6f9..HEAD -- lib/copy/ lib/types/workbench/ lib/validation/workbench/ lib/api/workbench/ hooks/query/` | empty | empty (BE contract / 한글 카피 무회귀) | PASS |

## 1. 자동화 명령 로그

### 1.1 typecheck / lint / build

```bash
$ npm run typecheck
> trading-signal-frontend@0.1.0 typecheck
> tsc --noEmit
$ npm run lint
> trading-signal-frontend@0.1.0 lint
> eslint .
$ npm run build
> trading-signal-frontend@0.1.0 build
> next build
   ▲ Next.js 15.5.18
 ✓ Compiled successfully in 716ms
   Linting and checking validity of types ...
 ✓ Generating static pages (6/6)

Route (app)                                 Size  First Load JS
┌ ○ /                                      35 kB         152 kB
├ ○ /_not-found                            995 B         103 kB
├ ƒ /api/whitelist/search                  127 B         102 kB
└ ƒ /api/workbench/analyze                 127 B         102 kB
```

### 1.2 design:sync 라이브 토큰 라운드트립

| 단계 | 명령 / 변경 | 결과 |
|---|---|---|
| (1) 백업 | `cp tailwind.theme.json /tmp/qa_theme_before.json; cp docs/design/component-compactness.md /tmp/qa_design_before.md` | OK |
| (2) DESIGN.md `input-h: 36px → 38px` | `sed -i.bak 's/^  input-h: 36px$/  input-h: 38px/' docs/design/component-compactness.md` | grep 결과 `110:  input-h: 38px` |
| (3) `npm run design:sync` | `tailwind.theme.json` 재생성 + breakpoints 주입 | `design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).` |
| (4) theme.json 검증 | `python3 ... print('input-h=', s.get('input-h'))` | `after 38px sync — input-h= 38px` |
| (5) 복원 | `cp /tmp/qa_design_before.md docs/design/component-compactness.md; npm run design:sync` | `restored — input-h= 36px` |
| (6) 최종 git diff | `git diff --stat HEAD tailwind.theme.json docs/design/component-compactness.md` | empty (커밋 대비 변경 없음) |

판정: PASS. v5 DESIGN.md → `tailwind.theme.json` 파이프라인이 결정적·가역적이다.

### 1.3 grep 가드 (전체)

```bash
$ git grep -nE "60px" -- 'components/layout/*'
components/layout/Navbar.tsx:4: * 자리: viewport 최상단 sticky, 가로 100%, 세로 spacing.navbar-h (60px).
components/layout/Sidebar.tsx:27:  // v5 (component-compactness) nit #1 흡수 — 인라인 60px 직타 제거.
components/layout/Sidebar.tsx:30:  // 페이지 어디에도 `60px` 직타는 없다.
# → 모두 주석. 코드 라인 0건. (PRD AC-9 통과.)

$ git grep -nE "[0-9]+px" -- components/layout/Sidebar.tsx
components/layout/Sidebar.tsx:4: * 위치: navbar 아래 좌측 sticky, 너비 spacing.sidebar-w (264px), 세로 100vh - navbar-h.
components/layout/Sidebar.tsx:27:  // v5 (component-compactness) nit #1 흡수 — 인라인 60px 직타 제거.
components/layout/Sidebar.tsx:30:  // 페이지 어디에도 `60px` 직타는 없다.
# → 모두 JSDoc 주석. 코드(JSX/Tailwind) 라인 0건.

$ git grep -nE "h-\[[0-9]+px\]|py-\[[0-9]+px\]" -- components/workbench/InputPanel.tsx
# → 0건. AC-1 통과.

$ git grep -nE "http://127\.0\.0\.1" -- 'app/*'
app/api/whitelist/search/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
app/api/workbench/analyze/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
# → 두 BFF route handler 의 env fallback 만 (AC-14 명시 예외 — "route handler 안 제외").

$ git grep -nE "fetch\(" -- 'components/*' 'hooks/*' 'lib/api/workbench/*'
# → 0건. AC-14 통과.

$ git grep -nE "#[0-9a-fA-F]{6}" -- 'app/*' 'components/*'
# → 0건. AC-13 통과 (hex 직타 0건).

$ git grep -nE "mousedown|pointerdown|touchstart" -- 'components/workbench/SearchPanel.tsx' 'hooks/utils/'
components/workbench/SearchPanel.tsx:61,176,177          # outside-click 호출부 + onMouseDown 옵션 선택부
hooks/utils/useOutsideClick.ts:52    document.addEventListener("mousedown", handle);
hooks/utils/useOutsideClick.ts:53    document.addEventListener("touchstart", handle, { passive: true });
# → mousedown + touchstart 두 진입점. pointerdown 은 코드 주석상 의도적 미등록 (mousedown 과 중복 발화 회피).
```

### 1.4 theme.json — v5 신규 토큰 흡수 확인

```text
input-h= 36px input-pr-suffix= 44px navbar-h= 60px dropdown-item-h= 34px button-primary-h= 40px hit-area-min= 40px
label-sm= ['13px', {'fontWeight': '700'}] | input-suffix= ['13px', {'fontWeight': '400'}] | button-sm= ['13px', {'fontWeight': '700'}]
```

## 2. AC 19건 — 재현·기대·실측

### AC-1 (input 컴팩트 토큰 적용) — PASS

- **재현**: `components/workbench/InputPanel.tsx` 의 `InputWithSuffix` 컴포넌트가 `className={cn(hasError ? "input-error" : "input", "pr-input-pr-suffix")}`. 합성 토큰 `input` 의 정의는 `app/components.css:68-72` → `h-input-h px-input-px py-input-py ... text-body-sm`. `tailwind.theme.json` 의 `input-h=36px / input-px=12px / input-py=8px`.
- **기대**: hex/px 직타 0건, 4 필드 height 36px, body-sm 14px.
- **실측**:
  - `git grep "h-\\[[0-9]+px\\]|py-\\[[0-9]+px\\]" -- components/workbench/InputPanel.tsx` → 0건.
  - 합성 토큰 `input` 의 `h-input-h` → theme.json `36px`.
- **판정**: PASS.

### AC-2 (dropdown 옵션 컴팩트 토큰) — PASS

- **재현**: `app/components.css:136-138` `.search-result-item / .search-result-item-focus` → `h-dropdown-item-h px-md py-dropdown-item-py ... text-body-sm`. theme.json `dropdown-item-h=34px / dropdown-item-py=6px`.
- **기대**: 항목 height 34px, body-sm, hex/px 직타 0건.
- **실측**: theme.json `34px`. SearchPanel 의 옵션 노드 `className={cn(focused ? "search-result-item-focus" : "search-result-item")}` 만 호출.
- **판정**: PASS.

### AC-3 (input 내 단위 suffix DOM) — PASS

- **재현**: `InputWithSuffix` (InputPanel.tsx:208-248):
  - wrapper `<div className="relative">`.
  - input 의 `className={cn(... "pr-input-pr-suffix")}` (우측 패딩 44px).
  - suffix `<span aria-hidden="true" className="input-suffix absolute right-input-px top-1/2 -translate-y-1/2">{suffix}</span>`.
  - `app/components.css:98-100` `.input-suffix { @apply pointer-events-none text-input-suffix text-text-muted; }` — **pointer-events: none 합성 토큰에 내장**.
- **기대**: 4 필드 모두 input 내부 우측 absolute. `pointer-events: none`. `aria-hidden="true"`. input 우측 padding 44px.
- **실측**:
  - 4 필드 모두 `suffix={currencyLabel | "%" | "일" | "%"}` 노출 (lines 76, 103, 130, 158).
  - `pointer-events-none` `app/components.css:99` 에 내장.
  - `aria-hidden="true"` `InputPanel.tsx:241` 에 명시.
- **판정**: PASS.

### AC-4 (dropdown outside-click 자동 닫힘) — PASS (정적 검증)

- **재현**: `hooks/utils/useOutsideClick.ts:52-56` document `mousedown` + `touchstart` listener. `SearchPanel.tsx:62` `useOutsideClick(wrapperRef, () => setOpen(false), { enabled: open });`. `SearchPanel.tsx:95-98` `handleKeyDown` 의 `event.key === "Escape"` 처리. `SearchPanel.tsx:103-107` `handleWrapperBlur` 의 `relatedTarget` 검사 (Tab).
- **기대**: mousedown + touchstart + ESC + Tab 네 진입점 닫힘. 옵션 선택은 무회귀 (`onMouseDown` + `e.preventDefault()`).
- **실측 (코드)**:
  - mousedown: `hooks/utils/useOutsideClick.ts:52` `document.addEventListener("mousedown", handle);` ✓
  - touchstart: `hooks/utils/useOutsideClick.ts:53` `document.addEventListener("touchstart", handle, { passive: true });` ✓
  - ESC: `SearchPanel.tsx:95-98` `if (event.key === "Escape") { event.preventDefault(); setOpen(false); }` ✓
  - Tab: `SearchPanel.tsx:103-107` `handleWrapperBlur` → relatedTarget 이 wrapper 밖이면 `setOpen(false)` ✓
  - 옵션 선택: `SearchPanel.tsx:175-180` `onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}` — outside-click 가드와 충돌 없음 (옵션이 wrapper 내부) ✓
- **참고 — pointerdown 부재**: useOutsideClick.ts:50-51 의 주석 "pointerdown 은 mousedown 과 중복 발화하므로 제외 (이중 발화 시 onOutside 가 두 번 호출)". 데스크탑 모던 브라우저(Chromium/Firefox/Safari)는 마우스 클릭 시 `mousedown` 발화가 보장되므로 (pointerdown 없이도) 외부 닫힘 동작 보장. 모바일 터치는 `touchstart` 가 커버.
- **판정**: PASS.

### AC-5 (dropdown 키보드 무회귀) — PASS

- **재현**: `SearchPanel.tsx:76-99` `handleKeyDown`:
  - ArrowDown: `setFocusIndex((idx) => Math.min(idx + 1, Math.max(0, results.length - 1)));`.
  - ArrowUp: `setFocusIndex((idx) => Math.max(0, idx - 1));`.
  - Enter: `if (open && results[focusIndex]) { handleSelect(results[focusIndex]); }`.
- **기대**: PR #11 키보드 무회귀.
- **실측**: 4 분기 모두 코드 유지. `aria-activedescendant` 도 유지 (`SearchPanel.tsx:143-147`).
- **판정**: PASS.

### AC-6 (작은 컴포넌트 톤 정합) — PASS

- **재현**:
  - 분석 실행 버튼: `InputPanel.tsx:170-179` `className="button-primary sm:col-span-2"` → `app/components.css:104-111` `h-button-primary-h ... text-button`. theme.json `40px`.
  - Sidebar item: `app/components.css:206-216` `h-input-h px-md py-input-py` → 36px.
  - Navbar icon button: `app/components.css:187-198` `h-hit-area-min w-hit-area-min` → 40px.
  - favorite-toggle: `app/components.css:240-253` `h-button-sm-h w-button-sm-h` (32px) + `::before { -inset-1; }` (hit area 40×40).
  - button-icon: `app/components.css:122-132` `h-button-sm-h w-button-sm-h` (32px) + `::before { -inset-1; }`.
- **기대**: 모두 합성/Tailwind 토큰. icon-only hit area ≥ 40×40px.
- **실측**: 위 5개 합성 토큰 모두 theme.json `button-sm-h=32px / hit-area-min=40px / button-primary-h=40px` 의 토큰 참조. hex/px 직타 0건.
- **판정**: PASS.

### AC-7 (pushHistory 시점 정밀화) — PASS

- **재현**:
  - `app/(workbench)/page.tsx:124-146` `handleSubmit`:
    - `const tickerAtSubmit = selectedTicker;` (분석 시점 ticker 클로저 캡처)
    - `submit(payload, { onSuccess: (committedPayload) => { ... pushHistory({ ticker: tickerAtSubmit.ticker, ..., lastInput: committedPayload, pushedAt: Date.now() }); } });`
  - `hooks/workbench/useAnalyzeRun.ts:53-62` `submit` 이 `mutation.mutate(payload, { onSuccess: ... options?.onSuccess?.(payload, response) });` 로 호출자 콜백 발화.
  - `hooks/workbench/useWorkbenchSession.tsx:63-70` `pushHistory`:
    - `prev.filter((e) => e.ticker !== entry.ticker)` — 동일 ticker 제거 후 promote.
    - `[entry, ...filtered].slice(0, HISTORY_LIMIT)` — LRU 5건.
- **기대**:
  - mutation 성공 시에만 push.
  - 분석 1회 = push 1회.
  - 동일 ticker 중복 시 promote (배열 길이 +0).
- **실측**:
  - mutation `onSuccess` 안에서만 `pushHistory` 호출 → 실패 시 push 안 됨 ✓
  - mutation `onSuccess` 는 응답 1회당 1회 발화 (TanStack Query 규약) ✓
  - LRU `filter` + `slice(0, 5)` 로 동일 ticker 중복 시 promote ✓
- **판정**: PASS.

### AC-8 (ticker-change effect 첫 발화 차단) — PASS

- **재현**: `app/(workbench)/page.tsx:68-83`:
  ```tsx
  const isFirstTickerEffect = useRef(true);
  useEffect(() => {
    if (isFirstTickerEffect.current) {
      isFirstTickerEffect.current = false;
      return;
    }
    window.dispatchEvent(
      new CustomEvent<WorkbenchTickerChangeDetail>(WORKBENCH_TICKER_CHANGE_EVENT, {
        detail: { ticker: selectedTicker?.ticker ?? null },
      }),
    );
  }, [selectedTicker]);
  ```
- **기대**: 첫 마운트 시 dispatch 발화 안 함. 두 번째 effect (실제 ticker 변경) 부터 dispatch.
- **실측**: `useRef(true)` 가드 ✓. PRD §9 권장 옵션 A (`useRef(false)` 또는 동등) 패턴. v5 의도 그대로.
- **판정**: PASS.

### AC-9 (Sidebar 인라인 px 토큰 흡수) — PASS

- **재현**: `components/layout/Sidebar.tsx:32-34`:
  ```tsx
  <aside className="sidebar sticky self-start top-navbar-h max-h-[calc(100vh-theme(spacing.navbar-h))]">
  ```
  - `top-navbar-h` → Tailwind theme `spacing.navbar-h` 토큰 → theme.json `60px`.
  - `max-h-[calc(100vh-theme(spacing.navbar-h))]` → `theme(spacing.navbar-h)` 함수 호출 → 60px.
- **기대**: 인라인 `60px` 또는 `top-[60px]` 또는 변수 직접 참조 0건 (코드 라인 기준).
- **실측**: `git grep -nE "[0-9]+px" -- components/layout/Sidebar.tsx` 결과 모두 JSDoc 주석 (line 4, 27, 30). 코드 라인 0건.
- **판정**: PASS.

### AC-10 (DESIGN.md v5 신설) — PASS (lint 부분 검증)

- **재현**: `docs/design/component-compactness.md` 존재. front matter:
  - colors 13 키 (v4 무수정 계승).
  - typography 15 키 (v4 12 + v5 신규 3 `button-sm`, `label-sm`, `input-suffix`).
  - spacing 19 키 (v4 10 + v5 신규 9 `input-h`, `input-px`, `input-py`, `input-pr-suffix`, `dropdown-item-h`, `dropdown-item-py`, `button-primary-h`, `button-sm-h`, `hit-area-min`).
  - rounded 3 키 (v4 무수정 계승).
  - breakpoints 4 키 (v4 무수정 계승).
  - components 절: v4 무회귀 + 갱신 7 (size 다운) + 신규 9 합성 토큰.
- **기대**: lint errors=0 warnings=0.
- **실측**:
  - 파일 존재 ✓ (946 라인).
  - `npm run design:sync` 가 동일 `@google/design.md` 도구로 결정적 산출 → lint 통과 전제 (도구 export 가 errors 발생 시 stderr 출력 + 0 byte JSON → `inject-breakpoints.mjs` 가 JSON 파싱 실패로 throw). 실측 정상 산출 → lint errors=0 추정.
  - **단독 `npx @google/design.md lint` 실행은 환경 제약(unsandboxed remote package fetch)으로 본 QA 세션에서 차단**. PR 본문에 `lint errors=0 warnings=0 info=1` 명시 + `design:sync` 도구 자체가 동일 패키지 사용해 정상 산출 → 정합. PASS 처리.
- **판정**: PASS (단, 단독 lint 명령은 환경 제약으로 미실행).

### AC-11 (PR #21 layout 무회귀) — PASS

- **재현**:
  - 3-section shell — `app/(workbench)/layout.tsx`, `app/layout.tsx`, `components/layout/Navbar.tsx`, `components/layout/Sidebar.tsx`, `components/layout/MobileDrawer.tsx` 모두 골격 유지.
  - 6블록 위계 — `ResultGroup` 무수정 (`git diff c63b6f9..HEAD -- components/workbench/ResultGroup.tsx` empty).
  - 사이드바 정보 카테고리 — `SidebarContent.tsx` 무수정.
  - 모바일 drawer 동작 — `MobileDrawer.tsx` 무수정.
- **기대**: PR #21 골격 변경 0.
- **실측**: `git diff c63b6f9..HEAD --stat -- components/` 결과 4개 파일만 변경 (Navbar.tsx +5/-... / Sidebar.tsx +7/-... / InputPanel.tsx / SearchPanel.tsx). Navbar/Sidebar 변경도 §3.5 nit 흡수 + 합성 토큰 호출 변경 — 골격 미수정.
- **판정**: PASS.

### AC-12 (라운드트립 5건 × 두 뷰포트) — PASS (a~d LIVE / e 정적 검증)

BE LIVE (`/health` → `ok`). dev 서버 `http://localhost:3500` 으로 BFF 경유 실측:

| 시나리오 | 경로 | 입력 | 응답 | 판정 |
|---|---|---|---|---|
| (a) AAPL 정상 | POST `/api/workbench/analyze` (BFF) | `{ticker:"AAPL",capital:1000000,return:5,period:30,loss:2}` | `200`, `action=HOLD, feasibility=UNREALISTIC, horizons.length=6` (6블록 shape 정상) | PASS |
| (b) BTC-USD 정상 | 동일 | `{ticker:"BTC-USD",capital:1000000,return:3,period:30,loss:2}` | `200`, `action=HOLD, feasibility=UNREALISTIC` | PASS |
| (c) 비현실 | 동일 | `{ticker:"AAPL",capital:100,return:500,period:7,loss:1}` | `200`, `feasibility=UNREALISTIC` (BE 가 비현실 분기) | PASS |
| (d) 화이트리스트 비매칭 | 동일 | `{ticker:"NVDA",...}` | `400`, `{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}` (한글 사전 차단) | PASS |
| (e) BE down 폴백 | 정적 검증 | `app/api/workbench/analyze/route.ts:13-17` `FALLBACK_NETWORK_MESSAGE="엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."` / `FALLBACK_PARSE_MESSAGE="엔진 응답 처리에 실패했어요."` — 둘 다 한글, route handler `catch` 분기 (line 38-43) 에서 502 반환 | PASS |

추가 BFF 검증:
- `POST /api/workbench/analyze` with `NOT_VALID_JSON` body → `400 {"error":"요청 본문을 해석할 수 없어요. 다시 시도해 주세요."}` (route.ts:22-26 catch 분기 한글 메시지).
- `GET /api/whitelist/search?query=AAPL` → 2 결과 (AAPL + BTC-USD aliasing).

뷰포트:
- 데스크탑 (1280px) — `lg:flex sidebar` (CSS `lg:` prefix = 1024px+ → 1280px 포함). SearchPanel + InputPanel `lg:grid-cols-2` 2단 배치.
- 모바일 (375px) — `sidebar` 의 `hidden lg:flex` 로 미노출, `MobileDrawer` 가 hamburger 로 호출. SearchPanel + InputPanel `grid-cols-1` 1단. v5 가 컴팩트화한 input 36px 도 라벨·helper 합쳐 60px+ → 모바일 터치 정확도 PRD §9.1 명시 보장.

dev 서버 hydration mismatch — `/tmp/qa_dev.log` 에 경고 없음 (`✓ Ready in 1015ms` 이후 추가 stderr 0).

- **판정**: PASS.

### AC-13 (디자인 토큰 무회귀 + hex/px 직타) — PASS

- **재현**:
  - `git diff c63b6f9..HEAD -- tailwind.theme.json` → 기존 v4 키 모두 무수정 + 신규 키 추가만.
  - hex `#[0-9a-fA-F]{6}` 검색 `app/ components/` → 0건.
  - InputPanel.tsx 의 인라인 `h-[..]px / py-[..]px` 검색 → 0건.
- **기대**: v4 기존 키 무수정. hex/px 직타 0건.
- **실측**: 위 grep 결과 모두 0건. 일부 v4 시점부터 존재하던 `EmptyState/LoadingSkeleton/RiskPlanCard` 의 인라인 px 는 본 PRD 가 추가한 것이 아님 (`git diff c63b6f9..HEAD -- <파일들>` empty). PRD AC-13 의 "본 PRD 가 추가한 인라인 px 0건" 충족.
- **판정**: PASS.

### AC-14 (BFF 무회귀) — PASS

- **재현**: 0.0 표의 grep 명령 그대로.
- **실측**:
  - `http://127.0.0.1` 직타 — route handler 2건만 (예외 명시).
  - `fetch(` 직접 호출 — `components/`, `hooks/`, `lib/api/workbench/` 0건.
  - BE 응답 타입 (`lib/types/workbench/*`) 무수정.
- **판정**: PASS.

### AC-15 (한글 톤 무회귀) — PASS

- **재현**: `git diff c63b6f9..HEAD -- lib/copy/` → empty.
- **실측**:
  - BFF 한글 메시지: AC-12 (d) NVDA `"NVDA는 분석 가능한 화이트리스트에 없습니다"` / (e) `"엔진 통신에 실패했어요..."` / bad-json `"요청 본문을 해석할 수 없어요..."` 모두 한글.
  - InputPanel helper 텍스트: `"선택한 종목의 통화 단위로 입력해 주세요."` / `"0 이상의 숫자를 입력해 주세요."` / `"1 이상의 정수."` / `"0보다 크고 5 이하."` 모두 한글.
  - SearchPanel `"분석할 종목을 먼저 선택해 주세요."` / `"종목명·티커 입력 (예: AAPL, BTC-USD)"` / `"일치하는 종목이 없어요. AAPL · BTC-USD 를 검색해 보세요."` 모두 한글.
  - ticker / `USD` / `%` / `일` 단위 — 예외 (PRD §15 명시 허용).
- **판정**: PASS.

### AC-16 (build / typecheck / lint) — PASS

- 0.1 절 참조. 모두 0 에러.
- **판정**: PASS.

### AC-17 (반응형 무회귀) — PASS

- **재현**: dev 서버 `Ready in 1015ms` 후 `/tmp/qa_dev.log` 에 hydration mismatch 경고 없음.
- 모바일·데스크탑 분기 — `lg:` prefix (Sidebar `hidden lg:flex`), InputPanel `sm:grid-cols-2`, page.tsx `lg:grid-cols-2`. PR #17 `useBreakpoint` 무수정 (`git diff c63b6f9..HEAD -- hooks/utils/useBreakpoint.ts` empty).
- **판정**: PASS.

### AC-18 (컴포넌트 prop 시그니처 무수정) — PASS

- **재현**: `git diff c63b6f9..HEAD -- components/workbench/InputPanel.tsx components/workbench/SearchPanel.tsx | grep -E "^[-+]type Props|^[-+]: Props|^[-+]export function"` → 빈 출력.
  - `InputPanel` Props: `{ selectedTicker, form, setField, errors, isValid, isPending, onSubmit }` — PR #21 시점과 동일.
  - `SearchPanel` Props: `{ selectedTicker, onSelect }` — 동일.
  - `Sidebar` Props: `{ selectedTicker, onSelectHistory, onSelectFavorite }` — 동일.
  - `Navbar` Props: `{ showHamburger, isDrawerOpen, onHamburgerClick, drawerId }` — 동일.
- **참고**: `hooks/workbench/useAnalyzeRun.ts` 의 `submit` 시그니처가 `(payload) → (payload, options?)` 로 확장됐으나, `options` 가 **optional** 이라 기존 호출자 무회귀. AC-18 의 대상은 컴포넌트 props (PR #21 reviewer nit 흡수 영역). 훅 확장은 허용 범위.
- **판정**: PASS.

### AC-19 (기본 접근성 무회귀) — PASS

- **재현**:
  - input `aria-invalid={hasError}` + `aria-describedby={describedById}` (InputPanel.tsx:237-238).
  - suffix `aria-hidden="true"` (InputPanel.tsx:241).
  - dropdown `role="listbox"` + `aria-label="검색 결과"` (SearchPanel.tsx:155 영역 + listId).
  - 옵션 `role="option"` + `aria-selected={focused}` (SearchPanel.tsx:171-172).
  - SearchPanel combobox `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete="list"` (SearchPanel.tsx:139-147).
  - 분석 버튼 `aria-disabled` + `aria-busy` (InputPanel.tsx:175-176).
  - Navbar hamburger `aria-label` + `aria-expanded` + `aria-controls` (Navbar.tsx:46-48).
- **판정**: PASS.

## 3. 에지 케이스 검증

### 3.1 input 우측 suffix `pointer-events: none`

- **검증 1 (CSS 합성 토큰)**: `app/components.css:98-100`
  ```css
  .input-suffix {
    @apply pointer-events-none text-input-suffix text-text-muted;
  }
  ```
  - `pointer-events-none` 가 합성 토큰에 내장 → 호출 측에서 누락 불가.
- **검증 2 (호출 측)**: `components/workbench/InputPanel.tsx:240-245`
  ```tsx
  <span
    aria-hidden="true"
    className="input-suffix absolute right-input-px top-1/2 -translate-y-1/2"
  >
    {suffix}
  </span>
  ```
- **기대**: suffix 영역 클릭이 input focus 를 방해하지 않음.
- **실측**: pointer-events-none 합성 토큰 내장 + 호출부 4 필드 모두 `input-suffix` 클래스 사용 → input click 가능 유지.
- **판정**: PASS.

### 3.2 dropdown outside-click — 4 진입점

| 진입점 | 코드 위치 | 동작 | 판정 |
|---|---|---|---|
| mousedown | `hooks/utils/useOutsideClick.ts:52` `document.addEventListener("mousedown", handle)` | wrapper ref 외부 target 시 `setOpen(false)` | PASS |
| pointerdown | (의도적 미등록) | useOutsideClick.ts:50-51 주석 — mousedown 과 중복 발화 회피. 데스크탑 mousedown 으로 충분 | N/A (설계 결정) |
| touchstart | `hooks/utils/useOutsideClick.ts:53` `document.addEventListener("touchstart", handle, { passive: true })` | 모바일 터치 outside → `setOpen(false)` | PASS |
| ESC | `SearchPanel.tsx:95-98` `event.key === "Escape"` → `setOpen(false)` | dropdown 닫힘. focus 는 input 유지 | PASS |
| Tab (focus 이동) | `SearchPanel.tsx:103-107` `handleWrapperBlur` → `relatedTarget` 이 wrapper 안이 아니면 `setOpen(false)` | wrapper 외부로 Tab → 닫힘. wrapper 내부 (option 이동) → 유지 | PASS |
| 옵션 선택 | `SearchPanel.tsx:175-180` `onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}` | wrapper 내부이므로 outside-click 가드 발화 안 함. preventDefault 로 input blur 차단 → `handleSelect` 가 정상 발화 + setOpen(false) | PASS |

PRD §9.4 결정 = **mousedown + ESC + Tab** + (touchstart 추가). 모두 코드에 명시.

### 3.3 컴팩트 사이즈의 모바일 hit-area 보장

- input (36px) — PRD §1.3 / DESIGN.md §Layout `input-h: 36px` 채택 사유에 명시: "라벨·helper 영역까지 합쳐 한 필드의 클릭 묶음이 60px+ 이상". 본 검증에서 라벨(`input-label` 13px / line-height 1.25 ≒ 17px) + gap-xs (4px) + input (36px) + gap-xs (4px) + helper (`caption` 12px / 1.4 ≒ 17px) = **78px** 묶음. 모바일 터치 묶음으로 충분.
- search-result-item (34px) — 모바일 터치 단독 항목이지만 PRD §3.2 권장 32~36px 범위 안. iOS HIG 강력권장(44px)에는 미치지 않으나 PRD §9.6 결정에서 **40×40 hit-area-min** 정책은 icon-only 버튼에 한정, dropdown 항목은 별도 정책.
- button-primary (40px) — PRD §9.6 hit-area-min 충족.
- button-icon (32×32 시각 + ::before -inset-1 = 40×40 hit area) — `app/components.css:122-128`:
  ```css
  .button-icon { @apply relative inline-flex ... h-button-sm-h w-button-sm-h ...; }
  .button-icon::before { content: ""; @apply absolute -inset-1; }
  ```
  - `-inset-1` = `inset: -4px` → 시각 32 + 4×2 = 40px hit-area. PASS.
- favorite-toggle (동일 패턴) — `app/components.css:240-246` `h-button-sm-h w-button-sm-h ... ::before { -inset-1 }`. PASS.
- navbar-icon-button (40×40 자체) — `app/components.css:188` `h-hit-area-min w-hit-area-min`. PASS.

### 3.4 Reviewer nit 3건 명시 검증

#### nit #1 — Sidebar 60px 토큰 흡수

- `git grep -nE "60px" -- components/layout/` → 코드 0건 (주석 3건만).
- Sidebar.tsx:33 `top-navbar-h max-h-[calc(100vh-theme(spacing.navbar-h))]` — 두 곳 모두 토큰 참조.
- Navbar.tsx:60 placeholder `h-hit-area-min w-hit-area-min` (이전 인라인 `h-[40px] w-[40px]` 흡수).
- **판정**: PASS.

#### nit #2 — pushHistory 동일 ticker 연속 실행 시 중복 없음

- 코드 경로:
  1. `page.tsx:124-146 handleSubmit` → `submit(payload, { onSuccess: ... pushHistory(...) })`
  2. `useAnalyzeRun.ts:53-62` → mutation onSuccess 1회만 발화
  3. `useWorkbenchSession.tsx:63-70 pushHistory` → `prev.filter(e => e.ticker !== entry.ticker)` → promote → `slice(0, HISTORY_LIMIT)` (5건 cap)
- 시나리오: AAPL 분석 → 사이드바 +AAPL (1건). 동일 AAPL · 동일 입력으로 재분석 → `filter` 가 AAPL 제거 → `[entry, ...filtered]` 로 맨 위 promote → 배열 길이 +0 (중복 없음).
- mutation 실패 (5xx) 시 `onSuccess` 미발화 → `pushHistory` 미호출 → 사이드바 변동 0.
- **판정**: PASS.

#### nit #3 — ticker-change effect 첫 마운트 무발화

- `page.tsx:68-83`:
  ```tsx
  const isFirstTickerEffect = useRef(true);
  useEffect(() => {
    if (isFirstTickerEffect.current) {
      isFirstTickerEffect.current = false;
      return;  // 첫 마운트 시 dispatch 안 함
    }
    window.dispatchEvent(new CustomEvent<...>(...));
  }, [selectedTicker]);
  ```
- 첫 마운트 시 ref `true` → 분기 진입 → `false` 로 전환 + `return` → `dispatchEvent` 미호출.
- 두 번째 effect (사용자가 ticker 선택) → ref `false` → 정상 dispatch.
- **판정**: PASS.

### 3.5 추가 — InputPanel.tsx 의 `onSubmit` 호출 방식

- v5 변경으로 `useAnalyzeRun.submit` 이 `(payload, options?)` 시그니처 확장. `page.tsx:134` 에서 `submit(payload, { onSuccess: ... })`. `InputPanel` 의 `onSubmit: () => void` prop 시그니처는 무수정. AC-18 무회귀.

## 4. 디자인 토큰 라이브 동기화 게이트

| # | 절차 | 결과 |
|---|---|---|
| 1 | 백업: `cp tailwind.theme.json /tmp/qa_theme_before.json` | OK |
| 2 | `sed` 로 `docs/design/component-compactness.md` 의 `input-h: 36px` → `38px` | grep 확인 |
| 3 | `npm run design:sync` | exit 0, `screens 주입 완료` |
| 4 | `tailwind.theme.json.theme.extend.spacing.input-h` | `38px` (라이브 반영) |
| 5 | 복원 `cp /tmp/qa_design_before.md ...` + `design:sync` 재실행 | `input-h=36px` |
| 6 | `git diff --stat HEAD tailwind.theme.json docs/design/component-compactness.md` | empty (커밋 일치) |

판정: PASS. DESIGN.md v5 가 라이브 단일 진실 원천.

## 5. 변경 라인 요약

```
 components/layout/Navbar.tsx         |   5 +-
 components/layout/Sidebar.tsx        |   7 +-
 components/workbench/InputPanel.tsx  | 178 ++++++++++++++++++++++++-----------
 components/workbench/SearchPanel.tsx |  52 ++++++++--
 4 files changed, 173 insertions(+), 69 deletions(-)
```

+ docs 2 (PRD + DESIGN.md v5) + scripts/inject-breakpoints.mjs DESIGN_PATH 1줄 + package.json design:sync source 1줄 + tailwind.theme.json (design:sync 산출) + tailwind.config.ts (v5 typography extras 3 키 추가) + hooks/utils/useOutsideClick.ts (신규) + hooks/workbench/useAnalyzeRun.ts (`SubmitOptions` 확장) + app/(workbench)/page.tsx (nit #2 + #3) + app/components.css (v5 합성 토큰).

PR #21 (1500+ 라인) 의 절반 이하 — PRD §8.5 추정 (500~900 라인) 부합.

## 6. 종합

- **AC 19건**: 19건 PASS / 0 FAIL.
- **에지 케이스 4 묶음**: 모두 PASS (suffix pointer-events 합성 토큰 내장 / outside-click 4+1 진입점 / 모바일 hit area 묶음 / nit 3건).
- **DESIGN.md v5 라이브 동기화**: PASS (가역적·결정적).
- **자동화**: typecheck / lint / build 모두 0 에러.
- **BFF 라운드트립 (a)~(d)**: BE LIVE 로 실측 PASS. (e) 정적 검증 PASS.
- **PR 본문 `## 다음 작업` 섹션**: 존재 (gh pr view 22 grep 결과 1건) — handoff-append workflow 게이트 통과.

**판정: qa-passed**.
