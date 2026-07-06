# QA 리포트 — 드롭다운 하단 공간 부족 시 위로 플립 (PR #287)

- 브랜치: `feature/dropdown-flip-up`
- 유형: 경량 UX 버그픽스 (PRD 없음)
- QA 작업 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-dropdown-flip` (공유 메인 트리 미접촉)
- 검증 커밋: `2fd9fef fix(ui): 드롭다운 하단 공간 부족 시 위로 플립(전 드롭다운 공통)`

## 변경 범위

| 파일 | 성격 |
|---|---|
| `hooks/utils/useDropdownFlip.ts` | 신규. absolute 패널용 세로 플립 판정 훅 (실측 `useLayoutEffect`) |
| `components/ui/SelectMenu.tsx` | `dropUp` 시 `top-full mt-xs` ↔ `bottom-full mb-xs` |
| `components/profile/chart/ChartOptionsDropdown.tsx` | 위와 동일 패턴 |
| `components/intraday/IntradayWatchTable.tsx` | fixed MenuPanel — 실측 후 앵커 위로 `top` 재계산 (`anchorTop` 추가) |
| `components/analyze/AIDecisionCardMenu.tsx` | fixed 포털 케밥 — 실측 후 앵커 위로 `menuTop` 재계산 |

## AC 별 검증

| AC | 기대 | 방법 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC1 아래 여유 시 무회귀 | 상단/중앙 트리거는 기존대로 아래로 열림 | 코드 로직 (`useDropdownFlip`: `spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow` 일 때만 `dropUp`) + fixed 2종 (`overflowsBelow && flippedTop > 8` 일 때만 플립) | 아래 공간 충분 시 조건 미충족 → `top-full`/`pos.top` 그대로. 무회귀 성립 | PASS |
| AC2 하단 플립 | 뷰포트 하단 근처 트리거서 위로 열려 전 옵션 보이고 선택 가능 | 코드 로직 + 프로덕션 빌드 컴파일 | 4종 모두 하단 초과 + 위 여유 판정 시 `bottom-full`(absolute) / 앵커 위(`fixed`)로 위치. 옵션 렌더는 방향 무관 동일 → 잘림 해소 | PASS (아래 주석) |
| AC3 4종 동작 | ①SelectMenu ②ChartOptionsDropdown ③IntradayWatchTable 케밥 ④AIDecisionCardMenu 각각 방향 판정 | 코드 로직 확인 | ①② `useDropdownFlip` 공용 배선 확인 ③ `MenuPanel` `useLayoutEffect` `anchorTop` 재계산 ④ `menuPanelRef` 실측 후 `menuTop` 재계산. 4종 모두 양방향 처리 | PASS (아래 주석) |
| AC4 플리커 없음 | 위로 열릴 때 아래→위 점프 없이 처음부터 위 | 코드 로직 (`useLayoutEffect` = 커밋 후 페인트 전 동기 실행) | 4종 전부 `useLayoutEffect`. fixed 2종은 조건부 마운트라 매 오픈 재측정, `menuTop`/`top` 상태 갱신이 페인트 전 반영 → 초기 `top:0`/`pos.top` 플래시 없음 | PASS |
| AC5 무회귀 | 외부클릭 닫힘·선택·정렬(left/right)·스크롤 닫힘(fixed)·신규 커스텀 Tailwind 0 | diff 검사 + 토큰 검사 | 외부클릭(`useOutsideClick`)·정렬(`align === "right" ? "right-0" : "left-0"`)·`useFixedMenu` scroll/resize/mousedown 클로즈 이펙트 모두 미변경. `mt-xs`/`mb-xs`/`bottom-full` 은 기존 사용 유틸 (신규 커스텀 0) | PASS |
| AC6 게이트 | tsc·eslint 통과, 가능하면 build | 실행 | tsc 0 err · eslint 0 err · `next build --webpack` 성공 | PASS |

## 게이트 명령 실측

```
$ npm run typecheck   # tsc --noEmit
(출력 없음 — 0 에러)

$ npm run lint        # eslint .
(출력 없음 — 0 에러)

$ npx next build --webpack
▲ Next.js 16.2.6
... 전 라우트 컴파일 성공 (/intraday /profile /stock /market /watchlist ○,
   API 라우트 ƒ 포함, 에러 0)
```

- 표준 `npm run build`(Turbopack)는 격리 worktree 의 심볼릭 `node_modules` 를 거부(`Symlink [project]/node_modules is invalid`) — 알려진 worktree 환경 제약(프로젝트 메모리 문서화됨). 회피로 `next build --webpack`(프로젝트 `build:analyze` 가 쓰는 동일 경로) 실행 → 정상 컴파일.

## 공통 AC 무회귀

- **BFF 원칙**: `git diff main...HEAD | grep 'http://127\.0\.0\.1'` → 0건 (변경 파일에 하드코딩 IP 도입 없음).
- **신규 커스텀 Tailwind 0**: `mt-xs`/`mb-xs`(spacing xs 토큰)·`bottom-full`/`top-full`(네이티브) 전부 기존 코드베이스에서 사용 중. 신규 임의 클래스·hex/px 직타 없음.
- **접근성 무회귀**: `role="menu"`/`role="listbox"`/`role="option"`·`aria-label`·`aria-haspopup`·`aria-expanded`·`aria-selected` 속성 미변경. 플립은 위치(top/방향)만 바꾸고 DOM 순서·포커스 순서 불변.
- **한글 톤**: 사용자 노출 문구 변경 없음(위치 로직만).

## 로직 검증 상세 (4종)

1. **`useDropdownFlip`** (absolute — SelectMenu·ChartOptionsDropdown): 메뉴가 `{open && ...}` 로 마운트된 뒤 `useLayoutEffect` 가 트리거 `getBoundingClientRect` + 메뉴 `offsetHeight` 실측. `spaceBelow < menuHeight + GAP(8) && spaceAbove > spaceBelow` 일 때만 `dropUp=true`. 아래가 충분하면 그대로 아래 → 무회귀 보장. 닫히면 `dropUp=false` 리셋.
2. **SelectMenu / ChartOptionsDropdown**: `dropUp ? "bottom-full mb-xs" : "top-full mt-xs"`. `align` left/right 분기 보존. `menuRef` 배선 확인.
3. **IntradayWatchTable `MenuPanel`** (fixed, 조건부 마운트 `menu.open && menu.pos ?`): `useState(pos.top)` 초기값 → `useLayoutEffect` 에서 `pos.top + h > innerHeight - 8`(하단 초과) && `anchorTop - h - 4 > 8`(위 여유) 이면 앵커 위로. 매 오픈 재마운트라 상태 재초기화 정확.
4. **AIDecisionCardMenu** (fixed 포털): `openMenu` 에서 `anchorTop` 캡처. `menuPanelRef.offsetHeight` 실측 후 동일 판정으로 `menuTop` 결정. deps `[menuOpen, pos, confirming]` — 확인 다이얼로그 전환 시 높이 변화 재측정.

## 라이브 브라우저 라운드트립 — 실행 제약

- 격리 worktree 의 심볼릭 `node_modules` 로 인해 dev 서버 기동 불가:
  - Turbopack dev: 심볼릭 링크 거부.
  - `next dev --webpack`: `instrumentation.ts → ... → agentCli.ts` 의 `child_process` 모듈 해석 실패로 컴파일 500 (프로젝트 메모리에 문서화된 알려진 제약, 본 PR 무관).
- 따라서 창 높이 축소 후 하단 행 select·케밥 실조작 시나리오는 **본 환경에서 실행 불가**. 대신 (a) 전 라우트 webpack 프로덕션 빌드 성공(컴포넌트 컴파일·타입 정합 확인) (b) 4종 플립 로직의 페인트-전 측정·양방향 분기·무회귀 조건을 코드 레벨로 검증. 순수 프레젠테이션(위치 계산) 변경이라 런타임 데이터 경로·BE 라운드트립 영향 없음.
- BE 라운드트립(시나리오 a~e)는 본 PR 범위(드롭다운 위치)와 무관하여 해당 없음.

## 에지 케이스

- **위 공간도 부족(트리거가 짧은 뷰포트 정중앙, 위·아래 둘 다 < 메뉴높이)**: absolute 는 `spaceAbove > spaceBelow` 로 더 넉넉한 쪽 선택(아래가 크면 아래 유지). fixed 는 `flippedTop > 8` 미충족 시 `pos.top` 유지 → 최악의 경우 기존 동작(아래)과 동일, 회귀 없음.
- **StrictMode 더블 마운트**: `useLayoutEffect` 멱등(측정→setState), 더블 실행해도 동일 값 수렴.
- **NaN/빈 데이터**: 위치 계산은 `offsetHeight`(숫자)·`innerHeight` 기반, 옵션 데이터와 무관.

## 판정

- 자동 검증 항목(tsc·eslint·webpack build·BFF·토큰·접근성 무회귀) 전부 PASS.
- 라이브 브라우저 조작은 격리 worktree 환경 제약으로 미실행 — 코드 로직 + 프로덕션 빌드로 대체 검증(순수 위치 계산 변경, 회귀 리스크 로직상 차단됨).
- **실패 항목 0건.**

## 다음 작업

- 좌우 오버플로(수평 플립)는 별도 후속(현재 세로 플립만). 본 PR 머지 후 필요 시 티켓화.
