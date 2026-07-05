# QA 리포트 — peek-dock-anchor (PR #270)

- 대상: `feature/peek-dock-anchor` @ `01fdf12`
- 변경: `components/stock/StockPeekDock.tsx` 단일 — 초광폭 우측 도크 좌측 앵커를 **뷰포트 우측 끝 → 콘텐츠(순위표) 우측 끝 + 12px** 로 변경. `measureDockWidth()` → `measureDockLayout(): {left, width}`.
- 성격: 경량 UX 폴리시(PRD 없음).
- 검증 환경: 격리 worktree `/Applications/하영/code_source/tsf-wt-dock-anchor`. `node_modules` 는 심볼릭 링크 → Turbopack build 거부(후술). tsc/eslint 는 심볼릭에서 정상.

## 요약 판정: PASS (실패 0건)

브라우저 자동화가 없는 환경이라 시각 배치 검증은 **`measureDockLayout` 산식 재현 시뮬레이션 + 소스/레이아웃 정합 검증**으로 대체했다(에이전트 지시의 승인된 대체 방법). 산식이 순수 함수라 뷰포트·사이드바 폭 입력으로 결정론적 재현 가능.

---

## AC 별 표

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 붙는 위치 (≥1920) | `measureDockLayout` 산식을 vw=1920, 사이드바 208/76 로 재현. 산식 `contentRight = main.left + min(main.width,(main.width+1152)/2)`, `left = contentRight + 12` | 도크 좌측이 콘텐츠(1152) 우측 끝에서 12px 떨어져 붙음(뷰포트 끝 아님), 겹침 0 | 1920/펼침: contentRight=1640, dockLeft=1652(=+12), 겹침 no. 1920/접힘: contentRight=1574, dockLeft=1586, 겹침 no. 소스 산식(L71–72)이 AC 기술과 정확히 일치 | PASS |
| AC2 초광폭 (2560/3440) | 위 산식 vw=2560/3440 재현. 폭 클램프·far-right 잔여 확인 | 표 옆에 붙고 폭 [248,400] 클램프, 도크 오른쪽에 빈 공간, 겹침 0 | 2560/펼침: dockLeft=1972 width=400(MAX 클램프) dockRight=2372 → 뷰포트 끝까지 188px 여백. 2560/접힘: 254px 여백. 3440: 628px 여백. 전부 겹침 no, far-right 잔여 확인 | PASS |
| AC3 폴백 | 소스 L64–69 (`rect` 미발견 분기) 검토. 사이드바 접힘/펼침 정합 | main 미발견 시 우측 가장자리(`viewportW - 16 - 248`) 폴백. 사이드바 폭 무관하게 `rect.left` 실측이라 정합 | 폴백식 `left = viewportW - DOCK_VIEWPORT_MARGIN - DOCK_MIN_WIDTH`, width=MIN 확인. 정상 경로는 `getBoundingClientRect().left`(실측 border-box left) 사용 → 사이드바 76/208 어느 쪽이든 `main.left` 가 실제 반영. 1920 접힘/펼침 두 케이스 모두 겹침 없음(AC1 실측) | PASS |
| AC4 무회귀 | diff 검토 + 인터랙션 코드 대조 | 세로중앙 고정·pointer-events-auto·툴팁·클릭이동·hover-hold(#269) 무변경. 팝오버/<1920/모바일 무영향. 첫 페인트 깜빡임 없음 | diff 상 `onMouseEnter/onMouseLeave/onClick`, `motion` 진입 트랜지션, `className`, `chartHeight` 산식 모두 불변(변수명 `dockWidth`→`layout.width` 리네임만). `style` 만 `right`→`left`. `useState(measureDockLayout)` lazy initializer(함수 참조 전달) → 첫 client 렌더가 실측값으로 페인트, 깜빡임 없음. GlobalStockPeek 게이트(`min-width:1920px`)·팝오버/시트 경로 무변경 | PASS |
| AC5 게이트 | worktree `tsc --noEmit`, `eslint`, 신규 Tailwind 검사 | 0 에러, 신규 Tailwind 0 | `npx tsc --noEmit` exit=0(출력 0줄). `npx eslint components/stock/StockPeekDock.tsx` exit=0(출력 0줄). diff 추가분에 `className` 변경 없음 → 신규 Tailwind 0 | PASS |

### 산식 재현 로그 (AC1/AC2)

```
1920 expanded:  contentRight=1640 dockLeft=1652 width=252 dockRight=1904 gapToViewportEdge=16  overlap=no
1920 collapsed: contentRight=1574 dockLeft=1586 width=318 dockRight=1904 gapToViewportEdge=16  overlap=no
2560 expanded:  contentRight=1960 dockLeft=1972 width=400 dockRight=2372 gapToViewportEdge=188 overlap=no
2560 collapsed: contentRight=1894 dockLeft=1906 width=400 dockRight=2306 gapToViewportEdge=254 overlap=no
3440 ultrawide: contentRight=2400 dockLeft=2412 width=400 dockRight=2812 gapToViewportEdge=628 overlap=no
```
(모델: mainLeft=사이드바폭, mainWidth=viewportW−사이드바. 콘텐츠 1152 는 `mx-auto max-w-main-max-w` 로 main 내 중앙 정렬 → 우측 끝 = 중앙+576, 산식과 동일.)

### 콘텐츠 중앙 정렬 전제 검증

산식은 콘텐츠 1152 블록이 `<main>` 내부에서 중앙 정렬됨을 전제한다. `components/home/MarketOverviewPage.tsx:36` = `mx-auto flex w-full max-w-main-max-w ...`, `app/(main)/layout.tsx:95` `<main>` 이 flex-1 로 사이드바 옆에 배치됨을 확인. 대칭 좌우 여백 하에서 중앙 정렬이 유지되므로 `contentRight = main.left + (main.width+1152)/2` 가 실제 콘텐츠 우측 끝과 일치.

---

## 에지 케이스

| 케이스 | 결과 |
|---|---|
| SSR / document undefined | `measureDockLayout` 이 `{left:0,width:248}` 반환하고, 컴포넌트 상단 `if (typeof document === "undefined") return null` 로 렌더 자체 차단. 도크는 `peekDynamic` 의 `ssr:false` dynamic → 서버 렌더 경로 없음. 문제 없음. |
| main 미발견(비-`(main)` 라우트) | 폴백 우측 가장자리 배치(AC3). 단, 도크는 홈/관심 등 `(main)` 그룹 내에서만 소환되므로 실사용상 항상 `main` 존재. |
| StrictMode 더블 마운트 | `useLayoutEffect` 가 `resize` 리스너 등록/해제 대칭(cleanup 존재). 이중 마운트 시 리스너 누수 없음. |
| 리사이즈 | `resize` 이벤트로 `measureDockLayout` 재실측 → left/width 동시 갱신. 사이드바 접힘/펼침(레이아웃 리플로) 시에도 `getBoundingClientRect` 실측이라 재계산됨. |
| available < MIN(폭 부족) | `Math.max(DOCK_MIN_WIDTH, available)` 로 하한 고정 → 도크가 뷰포트 우측 여백을 살짝 침범할 수 있으나, 호스트 `min-width:1920px` 게이트가 최소 여백을 보장(1920 실측 시 정확히 16px 여백 확보). |

---

## 공통 AC 무회귀

| 항목 | 결과 |
|---|---|
| typecheck | `tsc --noEmit` exit=0 |
| lint | `eslint` exit=0 |
| build | Turbopack이 worktree 심볼릭 `node_modules` 를 거부(`Symlink [project]/node_modules is invalid, it points out of the filesystem root`) — 알려진 워크트리 함정. build 는 이 환경에서 수행 불가하므로 tsc+eslint 로 타입/린트 게이트 대체(심볼릭에서 정상 동작). 실제 프로덕션 build 는 real `npm ci` 워크트리에서만 유효. |
| BFF 무회귀 | 변경 파일 추가분에 `fetch(`·`http://127.0.0.1`·`http://` 0건. 순수 클라이언트 배치 컴포넌트. |
| 한글 톤 | 사용자 노출 신규 문구 없음(`PEEK_HINT_DESKTOP` 기존 카피 재사용, ticker 미표시 유지). |
| 접근성 | `aria-hidden="true"` 유지(행 aria-label 이 시맨틱 담당). 포커스 가능 자식 없음. 변경 없음. |

## 라운드트립

넓은 뷰포트 실제 hover 재현은 브라우저 자동화 부재 + Turbopack dev 도 동일 심볼릭 거부로 이 격리 worktree에서 수행 불가. 배치 산식이 순수 함수이고 유일 변경점이므로, 산식 결정론 재현(위 5개 뷰포트) + 소스/레이아웃 정합으로 대체 검증했다. BE 라운드트립은 본 PR 범위(클라이언트 배치)와 무관.

## 결론

AC1~AC5 전부 PASS, 에지/공통 무회귀 이상 없음. 실패 0건.
