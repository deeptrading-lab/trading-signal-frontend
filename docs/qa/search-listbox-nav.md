# QA — search-listbox-nav (PR #84, `feature/search-dropdown-extract`)

리팩터(Phase 3 Wave 2) — **PRD 없음**. 변경 의도에서 AC 직접 도출. 핵심 판정 기준은
**behavior-preserving**(키보드 인덱스 수학·시각 모두 무변경). 컴포넌트 키보드 자동 테스트는
미존재 → **정적 인덱스 수학 대조 + 컴파일 CSS 라이브 검증 + dev 서버 SSR 스모크**로 판정.

- 대상 커밋: `30c7812 refactor(search): listbox 키보드 네비 useListboxNav 훅 추출 + W1 input-search variant (Wave 2)`
- 변경 파일 5개: `hooks/utils/useListboxNav.ts`(신규), `components/workbench/SearchPanel.tsx`,
  `components/watchlist/WatchlistAddModal.tsx`, `components/home/StockSearchContainer.tsx`, `app/components.css`
- BE 상태: `curl http://127.0.0.1:8000/health` → `000`(미기동). 본 변경은 검색 키보드 네비·CSS variant
  리팩터로 **BE 라운드트립 불요**. 시각·SSR 스모크는 dev 서버(`:3000`)만으로 충분히 검증됨.
- 자동화 환경: build → tsc → eslint(변경파일) → vitest 순서.

---

## 1. AC 별 표 (재현·기대·실측)

| # | AC (의도) | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 신규 `useListboxNav(count,{wrap})` 훅 시그니처·초기값 | `hooks/utils/useListboxNav.ts` 정적 검토 | `{focusIndex,setFocusIndex,reset,moveDown,moveUp}` 반환, 초기 `focusIndex=-1`, `wrap` 기본 false | L15-26 타입·L33 `useState(-1)`·L32 `wrap=options?.wrap ?? false` 일치 | PASS |
| AC-2 | wrap=true → wrap-around(↓ 마지막→첫, ↑ 첫→마지막) | L42-52 분기 + 정적 시뮬(아래 §훅 정확성) | `(i+1)%count` / `i<=0?count-1:i-1` | 코드 L44·L50 일치, 시뮬 PARITY OK | PASS |
| AC-3 | wrap=false → clamp(양 끝 멈춤) | L42-52 + 시뮬 | `min(i+1,count-1)` / `max(i-1,0)` | 코드 L44·L50 일치, 시뮬 PARITY OK | PASS |
| AC-4 | count=0 무동작 | L43-44/L49-50 `count===0?i:...` | moveDown/moveUp 모두 `i` 그대로 | 코드 일치(분기 진입 전 호출측도 early-return) | PASS |
| AC-5 | count 축소 시 out-of-range 보정(마지막 당김, -1 보존) | L38-40 useEffect | `i>=count ? (count===0?-1:count-1) : i` | 코드 일치, 시뮬 Shrink diff 0 | PASS |
| AC-6 | SearchPanel: 로컬 state+shrink useEffect 제거 → 훅 채택 | `git diff` SearchPanel | `useState focusIndex`·shrink `useEffect` 삭제, `useEffect` import 제거 | diff 확인(L80-83 훅, useEffect import 제거됨) | PASS |
| AC-7 | SearchPanel: ArrowDown/Up → moveDown/moveUp, reset() 리셋 | L100-130 handleKeyDown | ↓/↑ 훅 호출, Enter/ESC/open 가드·input focus 유지 그대로 | L106 moveDown·L112 moveUp·L97/126/167 reset, L104 open-on-↓, L117 Enter `focusIndex>=0`, L128 ESC input focus 유지 | PASS |
| AC-8 | SearchPanel: mouseEnter setFocusIndex 그대로 | L208 | `onMouseEnter={()=>setFocusIndex(index)}` 보존 | L208 그대로 | PASS |
| AC-9 | WatchlistAddModal: 로컬 activeIdx 제거 → 훅(`focusIndex:activeIdx` 별칭, wrap:false) | `git diff` 모달 | `useState activeIdx` 삭제, `useListboxNav(navItems.length,{wrap:false})` | diff L97-103 별칭 채택, `setActiveIdx` 제거 | PASS |
| AC-10 | WatchlistAddModal: navItems useMemo 효과 위로 이동(훅 의존) | L89-92 위치 | `useMemo`가 `useListboxNav` 호출 위 | L89(navItems)→L97(훅) 순서, 닫힘/리셋 effect는 그 아래 | PASS |
| AC-11 | WatchlistAddModal: ArrowDown/Up→moveDown/moveUp, raw-add Enter 우선·activeIdx>=0 가드 | L180-198 onInputKeyDown | showRawAdd Enter 우선 return, navItems.length===0 return, Enter `activeIdx>=0` 가드 | L181 raw-add 우선, L186 length 가드, L189/192 이동, L193 `activeIdx>=0` 가드 | PASS |
| AC-12 | WatchlistAddModal: 추가됨(disabled) 항목 스킵 | L284-299 | navItems = `!hasTicker` 필터, disabled 버튼 skip | L89-91 필터, L295 `disabled={added}` | PASS |
| AC-13 | W1: `.input-search` variant 신설 + StockSearchContainer 교체 | `app/components.css` L154-159, container L143 | 합성 클래스 하나로 7개 `!` 오버라이드 대체 | diff 확인, `className="input-search"` 단일 | PASS |
| AC-14 | typecheck 0 에러 | `npx tsc --noEmit` | exit 0 | `TSC_EXIT=0` | PASS |
| AC-15 | lint(변경파일) clean | `npx eslint <4 files>` | exit 0, 경고 0 | `LINT_EXIT=0`, 출력 없음 | PASS |
| AC-16 | build 0 에러 | `npm run build` | exit 0 | `BUILD_EXIT=0`, `✓ Compiled successfully in 2.1s` | PASS |
| AC-17 | vitest 그린 | `npx vitest run` | 전부 pass | `30 passed (30)` / `Tests 189 passed (189)` | PASS |

---

## 2. 훅 정확성 — 인덱스 수학 정적 대조 (핵심)

자동 키보드 테스트가 없으므로, **기존 인라인 로직 vs 신규 훅 reducer** 를 동일 그리드
(`i∈[-1..6]`, `count∈[0..6]`) 에서 전수 비교하는 standalone 시뮬을 실행.

```js
// SearchPanel(wrap=true)
oldDownWrap = (i,n)=> n===0?i:(i+1)%n;          newDownWrap = (i,n)=> n===0?i:(i+1)%n;
oldUpWrap   = (i,n)=> n===0?i:(i<=0?n-1:i-1);   newUpWrap   = (i,n)=> n===0?i:(i<=0?n-1:i-1);
// WatchlistAddModal(wrap=false / clamp) — 호출측이 navItems.length===0 일 때 early-return
oldDownClamp= (i,n)=> Math.min(i+1,n-1);        newDownClamp= (i,n)=> n===0?i:Math.min(i+1,n-1);
oldUpClamp  = (i,n)=> Math.max(i-1,0);          newUpClamp  = (i,n)=> n===0?i:Math.max(i-1,0);
// count 축소 보정
oldShrink   = (i,n)=> i>=n?(n===0?-1:n-1):i;    newShrink   = (i,n)=> i>=n?(n===0?-1:n-1):i;
```

실측:

```text
PARITY OK — all i in[-1..6], n in[0..6] identical
```

- wrap 분기·clamp 분기·count=0 무동작·count 축소 보정 **전 케이스 동일**.
- clamp 의 `n===0?i` 추가 가드는 호출측 `navItems.length===0 return`(모달 L186) /
  `results.length===0 return`(SearchPanel L105/L111) 와 중복 안전망 — 동작 변화 없음.
- ESC/Enter-open-가드/raw-add/mouseEnter/aria-activedescendant 등 컴포넌트 고유 키 처리는
  diff 상 호출측에 그대로 남아 **parity 보존**(AC-7·8·11·12).

---

## 3. W1 시각/토큰 라이브 검증 (`.input-search`)

dev 서버(`:3000`) SSR 스모크 + **컴파일된 CSS** 직접 inspect.

**(1) SSR 렌더 — 클래스/카피 무회귀**

```text
$ curl -s http://127.0.0.1:3000/ | grep -oE 'input-search|placeholder="[^"]*검색[^"]*"'
input-search
placeholder="종목명·코드로 검색… (예: 삼성전자, 005930)"
```

**(2) 컴파일 CSS 실측** (`/_next/static/chunks/app_099mi8p._.css` 의 `.input-search`)

| 속성 | 기존 `!` 오버라이드 의도 | 컴파일 실측 | 동등 |
|---|---|---|---|
| 높이 | `!h-14` = 56px | `height: calc(0.25rem*14)` = 56px | ✓ |
| 좌패딩 | `!pl-10` = 40px | `padding-left: calc(0.25rem*10)` = 40px | ✓ |
| 배경 | `!bg-white` | `background-color: #fff` (= surface 토큰 #ffffff) | ✓ |
| border | `!border-0` | border 선언 없음 | ✓ |
| shadow | `!shadow-none focus:!shadow-none` | box-shadow 선언 없음(부모 wrapper 가 ring) | ✓ |
| radius | `!rounded-md` | `border-radius: 12px` | ✓ |
| outline | `!outline-none` | `outline-style: none` | ✓ |
| 글자색 | `.input` text-strong | `color: #0f1419` | ✓ |
| placeholder | text-muted | `color: #5b6470`, `font-size: 13px` | ✓ |
| 본문 글자 | `!text-base` | `font-size: var(--text-base)` = 1rem | ✓ |

- `bg-surface` 토큰 = `#ffffff`(흰색) 확인: `tailwind.theme.json:6 "surface": "#ffffff"`,
  DESIGN.md `home-market-redesign.md:7 surface: "#ffffff"`.
- **hex/px 직타 0**: `git grep -nE '#[0-9a-fA-F]{3,6}|[0-9]+px' app/components.css` 의 `.input-search`
  블록 → none. Tailwind 스케일 유틸(`h-14`,`pl-10`,`pr-md`,`rounded-md`,`text-base`)만 사용.
  (참고: 동일 파일 다른 라인의 px 는 기존 `.input` 영역으로 본 변경 무관.)

**시각 동등 판정: PASS** — 56px/40px/흰배경/무border/무shadow/rounded-md 모두 기존과 픽셀 동일.

---

## 4. 에지 케이스

| 케이스 | 동작 | 결과 |
|---|---|---|
| count=0 에서 ↓/↑ | 호출측 early-return + 훅 `count===0?i` 이중 가드 | 무동작 (PASS) |
| 검색 결과 축소(타이핑으로 N→M, focus 범위 밖) | 훅 useEffect L38-40 가 마지막으로 당김, -1 보존 | 보정됨 (PASS, 시뮬 일치) |
| focusIndex=-1 에서 Enter | SearchPanel L117 `focusIndex>=0` 가드 / 모달 L193 `activeIdx>=0` 가드 | 선택 안 됨 (PASS) |
| 모달: 6자리 raw 티커 + 결과 0 + Enter | L181 `showRawAdd && Enter` 우선 → handleAddRaw, 네비보다 먼저 return | raw-add 우선 (PASS) |
| 모달: 이미 추가된(disabled) 항목 | navItems 필터에서 제외(L89-91) → 네비 대상 아님, 버튼 disabled | 스킵 (PASS) |
| SearchPanel ESC | L125-128 `setOpen(false)`+`reset()`+`inputRef.focus()` | 닫힘·focus 유지 (PASS) |
| Tailwind preflight 잔여물 | `.input-search` 자체 border/shadow 없음 → 부모 ring 와 충돌 없음, 컴파일 CSS 깨끗 | 잔여물 없음 (PASS) |
| StrictMode 더블 마운트 | 훅은 순수 state reducer(부수효과 useEffect 는 count 의존 idempotent 보정뿐) | 더블 마운트 안전 (PASS) |
| useCallback 의존성 | moveDown/Up `[count,wrap]`, reset `[]`, shrink effect `[count]` | exhaustive-deps lint 0 (PASS) |

---

## 5. 공통 AC 무회귀

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit` → exit 0 | PASS |
| lint | `npx eslint hooks/utils/useListboxNav.ts components/workbench/SearchPanel.tsx components/watchlist/WatchlistAddModal.tsx components/home/StockSearchContainer.tsx` → exit 0 | PASS |
| build | `npm run build` → exit 0, Compiled successfully | PASS |
| test | `npx vitest run` → 30 files / 189 tests passed | PASS |
| BFF 무회귀 | `git grep -nE 'http://127\.0\.0\.1' -- app/` → `_adapters/fastapi.ts` env fallback 2건만(route handler 영역, 허용). 클라이언트 직접 호출 0 | PASS |
| 한글 톤 무회귀 | 검색 placeholder/aria 카피 무변경, 훅 신규 노출 문구 없음, 변경은 변수·CSS만 | PASS |
| 접근성 무회귀 | SearchPanel `role=combobox`·`aria-activedescendant`(L178-184) 보존, 모달 `aria-activedescendant`(L237-239)·`aria-selected`(L294) 보존, `<label htmlFor>` 연결 유지 | PASS |

---

## 6. 라운드트립

본 변경은 **클라이언트 키보드 네비 + CSS variant** 리팩터로 BE 라운드트립 경로를 건드리지 않는다
(`useListboxNav` 는 순수 state, W1 은 presentation). BE(`:8000`)는 미기동(`health=000`)이나
검색 입력·드롭다운 SSR 렌더는 dev 서버(`:3000`)만으로 검증 가능 — §3 (1) 에서 `.input-search`
클래스·한글 placeholder가 SSR HTML 에 정상 출력됨을 확인. dev 서버 기동/종료(PID 74027 kill) 완료.

- 수동 키보드 플로우(/analyze 검색·관심모달)는 자동 테스트 부재 환경상 **정적 인덱스 수학 전수
  대조(§2 PARITY OK)** 로 대체 판정. diff 가 reducer 추출 외 호출측 키 처리 분기를 보존하므로
  관측 동작 변화 없음으로 결론.

---

## 최종 판정

**qa-passed** — 실패 0건.

- 핵심(behavior-preserving): 인덱스 수학 전수 그리드 PARITY OK, 호출측 고유 키 처리(open/ESC/Enter
  가드/raw-add/mouseEnter/aria) 전부 보존.
- W1: 컴파일 CSS 실측이 기존 7개 `!` 오버라이드와 56px/40px/흰배경/무border/무shadow/rounded-md
  픽셀 동등, hex/px 직타 0, surface 토큰=#ffffff 확인.
- build/tsc/eslint exit 0, vitest 189/189 green. BFF·한글톤·접근성 무회귀.

> 참고(non-blocking): `useListboxNav` 의 reducer 단위 테스트(wrap/clamp/shrink)가 있으면 향후
> 회귀 방어가 자동화된다. 본 PR 판정에는 영향 없음(정적 대조로 충분히 커버).
