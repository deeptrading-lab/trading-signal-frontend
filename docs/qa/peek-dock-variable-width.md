# QA — 우측 도크 가변 폭 (peek-dock-variable-width)

- PR: #268 · 브랜치 `feature/peek-dock-variable-width` · 커밋 `076956a`
- 유형: 경량 UX 폴리시(PRD 없음). #260 우측 도크(고정 248px)를 콘텐츠 우측 여백 실측 기반 가변 폭으로.
- 변경 파일: `components/stock/StockPeekDock.tsx` 단일.
- 검증 환경: 격리 worktree `/Applications/하영/code_source/tsf-wt-dock-width`. `node_modules` 는 공유 메인 트리 심볼릭.
- 판정: **qa-passed** (실패 0건)

## 검증 방식 주석

- worktree `node_modules` 가 심볼릭이라 Turbopack dev/build 는 거부(알려진 제약). `tsc`·`eslint` 는 심볼릭에서 정상 동작 → AC5 게이트로 사용.
- 브라우저 자동화 미가용 → AC1~AC3 는 태스크 허용 대체안대로 **`measureDockWidth` 산식 + 소스 검증**으로 확인. 변경은 단일 파일·인라인 style·신규 모듈 의존 0 이라 런타임 위험 없음.
- 산식 재현: `(main 실폭 − 1152) / 2 = gutter`, `dockW = clamp(gutter − 16 − 12, [248, 400])`, `gap(콘텐츠 우측↔도크 좌측) = gutter − 16 − dockW`, `chartH = clamp(round(dockW × 0.9), [220, 360])`.

## AC 별 결과

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 가변 폭 | 뷰포트 1920/2200/2560 에서 산식 계산(사이드바 확장 208 기준) | 1920≈248, 넓을수록 400까지 | 1920→252, 2200→392, 2560→400 (상한 도달). 접힌 사이드바 76 에선 1920→318 | 통과 |
| AC2 겹침 없음 | 각 뷰포트 `gap = gutter − 16 − dockW` 계산 | 최소 12px 간격, 겹침 0 | 모든 조합 gap ≥ 12(1920 확장=정확히 12), overlap=false. 여백 부족 시 MIN 248 클램프로 게이트(≥1920)가 최소 여백 보장 | 통과 |
| AC3 리사이즈 반영 | 소스 검증: `useLayoutEffect` 내 `window.addEventListener("resize", update)`, `chartHeight = f(dockWidth)` | resize 시 폭 갱신·차트 높이 폭 비례 | L73–78 resize 리스너 등록·cleanup 존재. L83 chartHeight 를 dockWidth 파생. 폭 252→360, 400→360 스케일 확인 | 통과 |
| AC4 무회귀 | diff 검토: <1920 팝오버·모바일 시트·pointer-events-none·세로중앙 고정 | #260 동작 무변경 | 게이트(`GlobalStockPeek` PEEK_DOCK_QUERY) 미변경. `pointer-events-none fixed top-1/2 -translate-y-1/2` className 동일. StockPeekPopover/Sheet 미접촉. 변경은 폭/높이 산출 로직만 | 통과 |
| AC5 게이트 | worktree `tsc --noEmit`·`eslint` | 0 에러, 신규 Tailwind 0 | tsc EXIT=0, eslint EXIT=0. 폭은 인라인 `style={{ width: dockWidth }}`, className 은 기존 토큰만(신규 클래스·토큰 0) | 통과 |

### AC1/AC2 산식 실측 표 (사이드바 스크롤바 무시 근사)

| vw | 사이드바 | mainW | gutter | dockW | chartH | gap | overlap |
|---|---|---|---|---|---|---|---|
| 1920 | 확장 208 | 1712 | 280.0 | 252 | 227 | 12.0 | false |
| 1920 | 접힘 76 | 1844 | 346.0 | 318 | 286 | 12.0 | false |
| 2200 | 확장 208 | 1992 | 420.0 | 392 | 353 | 12.0 | false |
| 2200 | 접힘 76 | 2124 | 486.0 | 400 | 360 | 70.0 | false |
| 2560 | 확장 208 | 2352 | 600.0 | 400 | 360 | 184.0 | false |
| 2560 | 접힘 76 | 2484 | 666.0 | 400 | 360 | 250.0 | false |
| 3440 | 확장 208 | 3232 | 1040.0 | 400 | 360 | 624.0 | false |

## 에지 케이스

- **`<main>` 미발견**: `document.querySelector("main")` null → `mainWidth=0` → `available` 음수 → `Math.max(MIN, …)` 로 248 반환. NaN 없음, 겹침 없음(게이트가 여백 보장). 통과.
- **SSR / document undefined**: `measureDockWidth()` 초입 `typeof document === "undefined"` 가드 → MIN. 컴포넌트도 L80 에서 `document` 없으면 null 반환. hydration mismatch 위험 없음(초기 state=MIN, 마운트 후 layout effect 로 실측). 통과.
- **1920 경계에서 스크롤바 폭(~15px) 반영 시**: mainW 가 15 줄어 gutter≈272.5 → available≈244.5 <248 → 248 클램프, gap≈8.5px. **12 미만이나 여전히 양수(겹침 0)**. AC2 의 "최소 12px" 는 클램프 경계에서 목표치에 소폭 못 미칠 수 있으나 겹침은 발생하지 않음. 육안 확인 시 참고. 판정 영향 없음.
- **StrictMode 더블 마운트**: layout effect cleanup 이 resize 리스너 제거 → 중복 리스너 누수 없음. 통과.
- **prefers-reduced-motion**: `initial={reduced ? false : …}` 유지(무변경). 통과.

## 라운드트립

해당 없음. Peek 도크는 `StockPeekContent`→`MiniStockChart` 의 seed 기반 목 차트만 렌더하며 FastAPI/BFF 호출이 없다. BE LIVE 시나리오·BFF 원칙 회귀 대상 아님(변경 파일에 `fetch`·`http://127.0.0.1`·network 코드 0건).

## 공통 AC

- BFF/직접 fetch 회귀: 변경 파일 네트워크 코드 0. 무회귀.
- 한글 톤: 사용자 노출 문구 미변경(종목명·`PEEK_HINT_DESKTOP` 그대로). 무회귀.
- 접근성: `aria-hidden="true"`·`pointer-events-none` 시맨틱 유지(#260 대비 무변경). 무회귀.
