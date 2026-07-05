# QA — 우측 도크 인터랙티브화 (peek-dock-interactive)

- 대상 PR: #269 `feature/peek-dock-interactive`
- 대상 커밋: `2e37210 feat(peek): 우측 도크 인터랙티브화 — 차트 툴팁 hover + 클릭 이동 (#260 후속)`
- 유형: 경량 UX 폴리시 (PRD 없음). #260/#268 우측 도크(초광폭 ≥1920px)를 `pointer-events-none`→`pointer-events-auto` 로 전환, 행→도크 커서 이동 race 를 도크 모드 한정 300ms hide-grace + 도크 `onMouseEnter=cancelHide` 로 해결.
- 검증 환경: 격리 worktree `/Applications/하영/code_source/tsf-wt-dock-interactive` (node_modules 심볼릭). 검증·리포트 커밋은 본 브랜치.
- 변경 파일: `hooks/stock/peekProvider.tsx`, `components/stock/GlobalStockPeek.tsx`, `components/stock/StockPeekDock.tsx`.

## 검증 방식 노트 (라이브 육안 대체 근거)

Next 16 은 dev·build 모두 Turbopack 이며, 격리 worktree 의 심볼릭 `node_modules` 를 거부한다(아래 실측). 따라서 **브라우저 라이브 육안은 이 worktree 에서 실행 불가** — 대신 다음으로 대체·보강했다:

1. **정적 게이트** — `tsc --noEmit`, `eslint .` 실측 (심볼릭 OK).
2. **핵심 상태머신 하니스** — provider 의 hide-grace 로직(`clearHideTimer`/`hidePopoverNow`/`showPopover`/`hidePopover`/`cancelHide`)을 가짜 클럭으로 1:1 재현, AC1/AC2/AC4/AC5 시나리오를 결정론적으로 검증.
3. **소스 추적** — AC3 클릭 이동·라우트변경 정리, AC5 콜백 식별자 안정, AC6 렌더중 ref 쓰기 회피를 코드로 추적.
4. **기존 peek 유닛테스트** 무회귀 실행.

라이브 육안(≥1920px 실 브라우저 툴팁 hover)은 worktree 인프라 제약으로 미실시 — real `npm ci` 트리(공유 메인 트리 등) 또는 Vercel preview 에서 최종 확인 권장(후속). 로직·정적 게이트는 전부 통과.

---

## AC 별 결과

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 도크 툴팁 hover-hold | ≥1920px, 행 hover→도크 표시→커서를 도크로 이동. (하니스: showPopover→hidePopover(grace armed)→150ms 경과→cancelHide→400ms) | pointer-events-auto 로 차트 hover 가능, 건너가는 동안 안 닫힘 | 도크 `pointer-events-auto`+`cursor-pointer` 확인. 하니스: leave 시 300ms 타이머 armed, 150ms 경과에도 유지, cancelHide 후 400ms 초과에도 open 유지 → PASS | 통과 |
| AC2 도크 닫힘 / 행 교체 | 도크에서 커서 완전 이탈 후 대기 / 다른 행으로 이동 | ~300ms 후 닫힘, 행 이동 시 새 종목 교체(premature hide 없음) | 하니스: @299ms open·@301ms null(경계 정확). 100ms 시점 새 행 showPopover→기존 타이머 clear+즉시 교체, 이후 stale hide 미발화 → PASS | 통과 |
| AC3 클릭 이동 | 도크 클릭 | `/stock/[ticker]`(이름 있으면 `?q=`) 이동 + 도크 정리 | `onClick={() => router.push(stockDetailPath(target.ticker, target.name))}`. 라우트 변경 시 provider `pathname` effect 가 `clearHideTimer()`+`setPeek(null)` 로 정리(소스 추적) → PASS | 통과 |
| AC4 팝오버 무회귀(핵심) | <1920px(1440 등) 팝오버 leave | 즉시 hide(grace 미적용), 시트 무변경 | `hidePopover` 는 `canDockRef.current` false 시 `hidePopoverNow()` 즉시 호출. 하니스(canDock=false): leave 시 타이머 미무장·즉시 null → PASS. 시트는 mode 가드로 hidePopover 무영향 | 통과 |
| AC5 안정성/정리 | 라우트변경·언마운트·새 표시요청·30행 리렌더 | 타이머 정리(리크 없음), actions 식별자 안정 | `pathname` effect·언마운트 effect(`useEffect(() => clearHideTimer, ...)`)·showPopover/openSheet/close 모두 clearHideTimer 선행. `canDock` 은 ref 로 읽어 콜백 deps 불변 → `actions` useMemo 안정(30행 리렌더 불변). cancelHide 무장 타이머 없어도 안전 → PASS | 통과 |
| AC6 게이트 | worktree `tsc --noEmit`·`eslint`·신규 Tailwind | 0 에러, 렌더중 ref 쓰기 회피, 신규 토큰 0 | tsc·eslint 0(아래). `canDockRef.current` 쓰기는 effect(L107-109)로 격리(렌더중 아님). className 신규 유틸=`pointer-events-auto`/`cursor-pointer`(Tailwind 빌트인, 커스텀 토큰 아님) → PASS | 통과 |

---

## 정적 게이트 실측

```
$ npm run typecheck   # tsc --noEmit
> (출력 없음, exit 0)

$ npm run lint        # eslint .
> (출력 없음, exit 0)
```

### 상태머신 하니스 (가짜 클럭)

provider hide-grace 로직 1:1 재현 결과 11/11 GREEN:

```
PASS  AC1 row hover -> dock shows AAPL
PASS  AC1 leave row -> 300ms grace armed (not hidden yet)
PASS  AC1 @150ms still alive (in-flight)
PASS  AC1 dock enter cancels hide -> stays open, tooltip hoverable
PASS  AC2 @299ms still open (grace boundary)
PASS  AC2 @301ms closed after grace
PASS  AC2 new row before grace -> swap to TSLA, old timer cleared
PASS  AC2 no stale hide fires after swap
PASS  AC4 popover mode leave -> immediate hide, no grace timer (no regression)
PASS  no-regression sheet survives hidePopover + grace (mode guard)
PASS  AC5 cancelHide with no armed timer is safe
ALL GREEN
```

### 기존 peek 유닛테스트 무회귀

```
$ npx vitest run hooks/stock/__tests__/peekChartPrefetch.test.ts lib/utils/__tests__/peekPosition.test.ts
 ✓ lib/utils/__tests__/peekPosition.test.ts (6 tests)
 ✓ hooks/stock/__tests__/peekChartPrefetch.test.ts (2 tests)
 Test Files  2 passed (2)   Tests  8 passed (8)
```

### 공통 AC

- BFF 무회귀: 변경 3파일 `fetch(`·`http://127.0.0.1` 직접 호출 0건.
- 한글 톤: 신규 사용자 노출 문구 없음(도크 힌트 `PEEK_HINT_DESKTOP = "클릭하면 상세로 이동"` 기존값 유지).
- a11y: 도크 `aria-hidden="true"` 유지. 클릭 이동은 마우스 편의(행 자체가 키보드·SR 접근 경로=aria-label 링크)로 접근성 무회귀. Tab 순서·label 영향 없음.

---

## 에지 케이스

| 케이스 | 기대 | 결과 |
|---|---|---|
| 1920px 경계 교차(도크↔팝오버 전환 중 hover) | canDock 갱신 지연 무해 | `canDock` 은 경계 교차 시에만 변화, ref 동기화 effect 로 반영. useMediaQuery SSR 초기 false→마운트 후 swap(hydration mismatch 0). 무해 |
| 도크 leave→300ms 내 클릭 없이 재진입 | 유지 | cancelHide 로 타이머 clear, open 유지 (AC1 경로) |
| 도크에서 클릭 직후 라우트 변경 | 도크 즉시 정리, 유예 타이머 잔존 안 함 | pathname effect 가 `clearHideTimer`+`setPeek(null)`. 잔존 타이머 없음 |
| 언마운트 시 유예 타이머 | 리크 없음 | `useEffect(() => clearHideTimer, [clearHideTimer])` cleanup 로 clearTimeout |
| StrictMode 더블 마운트 | listener/timer 중복 없음 | useMediaQuery cleanup·provider 언마운트 cleanup 로 정리 |
| 시트(모바일 롱프레스) 열린 채 hidePopover | 시트 유지 | `hidePopoverNow` 는 `mode==="popover"` 만 null → 시트 무변경 |

## 인프라 제약(코드 결함 아님)

Turbopack build 실측 — 심볼릭 node_modules 거부:

```
$ npm run build   # next build (Turbopack)
FATAL: An unexpected Turbopack error occurred.
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

worktree 인프라 한계(메모리 기록된 알려진 함정). 타입·린트·로직 게이트 통과로 컴파일 정합은 검증됨. Turbopack 번들은 real `npm ci` 트리/Vercel preview 에서 확인.

---

## 판정

전 AC 통과. 라이브 육안(≥1920px 실 브라우저 툴팁·클릭 이동)만 worktree Turbopack 제약으로 미실시 — 로직·정적 게이트 전부 통과했고, 후속으로 Vercel preview 또는 real 트리에서 최종 육안 확인 권장.

**판정: qa-passed** (실패 0건)
