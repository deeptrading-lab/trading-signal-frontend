# QA 리포트 — 초광폭 우측 도킹 미리보기 (peek-dock-wide)

- 대상 PR: #260 `feature/peek-dock-wide` — `feat(peek): 초광폭 우측 도킹 미리보기 (여백 있을 때만)`
- 성격: 경량 UX 폴리시 (PRD 없음). 수용 기준은 위임 태스크의 AC1~AC7 로 대체.
- 변경 파일: `hooks/utils/useMediaQuery.ts`(신규), `components/stock/StockPeekDock.tsx`(신규), `components/stock/GlobalStockPeek.tsx`(폭 분기), `components/stock/peekDynamic.ts`(도크 dynamic).
- QA 환경: 로컬 dev 서버(Turbopack, `:3099`, 워킹트리=본 브랜치), BE(`127.0.0.1:8000`) **다운(주말, HTTP 000)** — peek 는 KIS 시세/차트를 BFF 경유로 받으므로 FastAPI /health 무관, 시세 미도착 시 그레이스풀 상태로 렌더됨.
- 헤드리스 브라우저(playwright/puppeteer) 미설치 → 뷰포트 조건부 **시각** AC(1·2·3·6)는 (a) 코드 경로 분석 (b) 겹침 지오메트리 계산 (c) dev 렌더 무오류로 검증. 픽셀 hover 스크린샷은 미수행(수동 재현 절차 명기).

---

## 1. AC 별 표

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 초광폭 도킹 | 뷰포트 ≥1920px, 홈 실시간 순위 행 hover | 우측 고정 도크(종목명+220px 차트+축), 콘텐츠(1152) 미침범 | `GlobalStockPeek` 가 `useMediaQuery("(min-width:1920px)")` 매칭 시 `StockPeekDock` 렌더. 도크=`fixed right:16 width:248 top-1/2`. 지오메트리 계산(아래 §2): vw1920·사이드바208(최악) → 콘텐츠 우측 x=1640, 도크 좌측 x=1656 → **gap 16px, 겹침 없음** | PASS |
| AC2 좁은 뷰포트 팝오버 | 뷰포트 <1920(1440) hover | 커서 앵커 팝오버, 도크 미표시 | 쿼리 미매칭 → `canDock=false` → `StockPeekPopover` 경로. 1440 에선 도크가 콘텐츠와 -224px 겹칠 지오메트리라 팝오버 유지가 정당 | PASS |
| AC3 안정성 | 도크 표시 중 다른 행으로 hover 이동 / 스크롤 | 위치 그대로 내용만 교체, 스크롤 오작동 없음, mouseleave 로 사라짐 | 도크 `motion.aside` 에 `key` 없음 → target 변경 시 동일 요소 in-place 갱신(초기 진입 애니메이션은 mount 1회) → 좌표 fixed 유지·내용만 swap. 도크는 팝오버와 달리 scroll/resize hide 리스너 **없음**(fixed 라 stale 없음), 숨김은 행 mouseleave→`hidePopover` | PASS |
| AC4 모달리티 | 모바일 롱프레스 / 키보드 포커스 | 롱프레스=시트(도크 미적용), 포커스=폭 따라 도크/팝오버 | `mode==="sheet"` 는 폭 분기 이전 → `StockPeekSheet` 그대로. `mode==="popover"`(hover+포커스 공통)만 `canDock` 분기 → 포커스도 폭 따라 도크/팝오버 | PASS |
| AC5 무회귀 | #253 프리패치·랭킹 기능 | 도크도 같은 차트 캐시 히트, 값컬럼·경고배지·위험숨기기·관심토글·행클릭 무영향 | 도크는 `StockPeekContent`(팝오버 동일 본문·동일 `MiniStockChart`→`useQueryStockChart`) 재사용 → 동일 쿼리키 캐시 공유. `peekDynamic` 도크 dynamic 이 recharts 팝오버와 **동일 청크**(`preloadPeekChunk` 워밍 그대로 유효). 랭킹 컴포넌트 무수정(diff 4파일 한정) | PASS |
| AC6 리사이즈 반응 | 1440→1920 확대 / 1920→1440 축소 | 다음 hover 부터 도크↔팝오버 전환 | `useMediaQuery` 가 `mql.addEventListener("change")` 구독 → resize 시 `canDock` 갱신·`GlobalStockPeek` 재렌더. 팝오버는 자체 resize hide 로 닫히고 다음 hover 시 새 peek→도크. PR 서술("다음 hover 부터")과 일치 | PASS |
| AC7 게이트 | tsc/eslint/build | 0 에러 | 아래 §3 명령 출력. 전부 exit 0 | PASS |

---

## 2. 겹침 지오메트리 (AC1/AC2 근거)

`(vw − sidebar − 1152)/2` 여백 vs 도크(우측16, 폭248) 좌측 x = `vw − 16 − 248`:

```
vw=1920 sidebar=208 mode=DOCK    content_right=1640 dock_left=1656 gap=16px   overlap=no
vw=1920 sidebar=76  mode=DOCK    content_right=1574 dock_left=1656 gap=82px   overlap=no
vw=2560 sidebar=208 mode=DOCK    content_right=1960 dock_left=2296 gap=336px  overlap=no
vw=2560 sidebar=76  mode=DOCK    content_right=1894 dock_left=2296 gap=402px  overlap=no
vw=1440 sidebar=208 mode=POPOVER content_right=1400 dock_left=1176 gap=-224px overlap=YES(→팝오버로 회피)
vw=1440 sidebar=76  mode=POPOVER content_right=1334 dock_left=1176 gap=-158px overlap=YES(→팝오버로 회피)
```

- 임계 1920px 는 최악(사이드바 확장 208) 기준으로도 16px 여유를 확보 → 도크가 표에 겹치지 않음.
- 1440 에선 도크가 표를 침범할 지오메트리 → 팝오버 유지가 설계 의도대로 정당. 단일 임계로 예측 가능.

---

## 3. 게이트 (AC7) — 명령·출력

```
$ npx tsc --noEmit        → TSC_EXIT=0
$ npx eslint components/stock/GlobalStockPeek.tsx components/stock/StockPeekDock.tsx \
            components/stock/peekDynamic.ts hooks/utils/useMediaQuery.ts
                          → ESLINT_EXIT=0 (경고 0)
$ npm run build           → BUILD_EXIT=0, "✓ Compiled successfully in 4.8s", 라우트 테이블 정상
```

dev 서버(`:3099`) 홈 렌더:
```
$ curl -s -o home.html -w "%{http_code}" http://127.0.0.1:3099/   → 200 (81,898 bytes)
서버 HTML 에러 마커(application error/Hydration failed/500) 검색 → 0건
실시간 순위 섹션 마커("실시간","순위") 존재 확인
dev 컴파일 로그 → "✓ Compiled" 반복, error/warn 0
```

---

## 4. 컨벤션 무회귀

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| BFF 원칙 | `git grep "http://127\.0\.0\.1"` 변경 파일 | 0건 |
| 클라이언트 직접 fetch | `git grep "fetch("` 변경 4파일 | 0건 |
| matchMedia 캡슐화(frontend.md §8) | `matchMedia`/`innerWidth` 는 `hooks/utils/useMediaQuery.ts` **한 곳**에만, 컴포넌트는 훅 구독 | 준수 |
| 한글 톤 | 도크 노출 문구=종목명(고유명)+`PEEK_HINT_DESKTOP`("클릭하면 상세로 이동")+`PEEK_CHART_LABEL`("일봉"), 모두 한글/티커 | 무회귀 |
| a11y | 도크 `aria-hidden="true"` + `pointer-events-none`(팝오버와 동일 시맨틱, 행 aria-label 이 시맨틱 담당) | 무회귀 |
| 토큰 정합 | 도크 클래스=`border-border-line`/`bg-surface-elevated`/`shadow-overlay`/`p-md` 등 토큰만. 폭·여백은 runtime-positioned JS 상수(팝오버 `PEEK_WIDTH` 관례 동일) | 준수 |

---

## 5. 에지 케이스

| 케이스 | 기대 | 실측 | 판정 |
|---|---|---|---|
| BE 다운(현 상태, HTTP 000) | 도크 프레임은 뜨고 시세는 그레이스풀 | `StockPeekContent` → `useQueryStockPrice` 에러 시 `PEEK_PRICE_ERROR`("시세를 불러오지 못했어요"), `MiniStockChart` 자체 빈/에러 상태. 도크 골격·종목명·힌트는 정상 렌더 | PASS |
| SSR/hydration mismatch | 초기 false → 마운트 후 폭 반영, mismatch 0 | 도크·팝오버 모두 `dynamic({ssr:false})` → SSR 미렌더. `useMediaQuery` 초기값 false(첫 렌더 팝오버 경로). 서버 HTML 에러 마커 0건 | PASS |
| StrictMode 더블 마운트 | 리스너 누수 없음 | `useMediaQuery` cleanup 이 `removeEventListener("change")` 로 해제. `[query]` 의존성 안정(상수 문자열) | PASS |
| reduced-motion | 진입 트랜지션 생략 | 도크 `initial={reduced ? false : {...}}` — `useReducedMotion` 게이트 | PASS |
| 리사이즈 중 도크 표시 상태에서 축소 | 안전 전환 | canDock→false 재렌더 시 동일 peek 를 팝오버로 렌더(앵커 존재). hover-transient 라 다음 mouseleave/이동에 정리됨. PR 이 "다음 hover 부터"로 명시한 범위 내 | 허용 |

---

## 6. 라운드트립 (수동 재현 안내 — 헤드리스 미지원 구간)

헤드리스 브라우저 부재로 픽셀 hover 는 아래 절차로 **개발자/리뷰어 수동 확인 권장**(코드 경로·지오메트리상 통과 예상). BE 다운(주말)이라 시세는 에러/캐시 상태로 표시됨:

1. `npm run dev` → 브라우저 창을 **≥1920px** 로 최대화(외장 모니터) → 홈 실시간 순위 행 hover → 우측 세로중앙 고정 도크 확인, 표와 겹침 없음.
2. 다른 행으로 hover 이동 → 도크 위치 고정·내용만 교체.
3. 창을 **1440px** 로 축소 → 다음 hover 는 커서 앵커 팝오버.
4. 모바일(터치/375) → 롱프레스 시트(도크 미적용).
5. 키보드 Tab 포커스 → 폭에 따라 도크/팝오버.

---

## 7. `## 다음 작업` 섹션 점검 (라벨 게이트)

PR #260 본문에 `## 다음 작업` 섹션 존재 확인(도크 인터랙티브화 / 도크 폭 가변 / 모바일 값컬럼 등 후속 3건). handoff-append workflow 트리거 조건 충족.

---

## 판정

AC1~AC7 전부 PASS, 에지 5+1건 통과, 무회귀 클린. **qa-passed**.
시각 hover AC(1·2·3·6)는 코드 경로+지오메트리+dev 렌더로 검증(헤드리스 브라우저 부재로 픽셀 스크린샷 미수행) — §6 수동 절차 병기.
