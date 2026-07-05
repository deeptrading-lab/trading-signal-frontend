# QA 리포트 — peek-dock-rich-chart (PR #271)

- 대상 브랜치: `feature/peek-dock-rich-chart` (커밋 `590978f`)
- 성격: 경량 UX 폴리시 (PRD 없음). 초광폭 우측 도크 미리보기 차트를 캔들만(`MiniStockChart`) → 4패널(`PeekChart`: 가격+이평선·거래량·MACD·RSI)로 확장.
- 변경 파일(구현 커밋): `components/stock/PeekChart.tsx`(신규 177L), `StockPeekContent.tsx`(render-prop 화), `StockPeekDock.tsx`(PeekChart 주입), `StockPeekPopover.tsx`·`StockPeekSheet.tsx`(MiniStockChart 주입).
- 검증 환경: 격리 worktree `/Applications/하영/code_source/tsf-wt-dock-chart` (실 node_modules). tsc/eslint/**build**/dev 모두 실측.
- 판정: **qa-passed** (실패 0건)

---

## 1. AC 별 검증

| AC | 재현 절차 | 기대 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC1 4패널 노출 | `PeekChart.tsx` 소스 + build 컴파일 | 도크에 ①가격(캔들+이평선) ②거래량 ③MACD ④RSI 세로 누적 | 4개 `ResponsiveContainer` 블록 확인 — 가격(ComposedChart, 캔들 `CandleBar`+MA 라인), 거래량(`Bar`+Cell up/down), MACD(히스토그램+macd/signal 라인, `hasMacd` 가드), RSI(`LineChart`+30/50/70 ReferenceLine, `hasRsi` 가드). build 전체 라우트 컴파일 성공 → 런타임 import 에러 배제 | 통과 |
| AC2 이평선 | `maLines` 블록 소스 | MA5/20/60/120 각 색선 얇게(1px) | `<Line dataKey="ma5|ma20|ma60|ma120" stroke={C.ma5..} strokeWidth={1} dot={false} tooltipType="none" legendType="none"/>` 4개. `C.ma*` = `useChartTheme` 런타임 hex(상세 차트와 동일 소스, VAR_KEYS `chart-ma5..120`) | 통과 |
| AC3 툴팁 + 패널 연동 | 소스 + dock `pointer-events` | 각 패널 hover 툴팁, syncId 로 패널 간 연동 | 4패널 모두 `<Tooltip>` (가격=`CandleTooltip showMA`, 나머지=`fmtTooltipVol/MACD/RSI`). 전 패널 `syncId="peek-dock"` 일치. 도크 컨테이너 `pointer-events-auto`(StockPeekDock L124) → hover 가능 | 통과 |
| AC4 캐시 히트 | `useChartData` 인자 대조 | MiniStockChart·배경선반입(#266)·hover(#253)와 동일 키라 추가 페치 0 | `PeekChart` = `useChartData(ticker, "D", MINI_CHART_DEFAULT_DAYS)`. `MiniStockChart.tsx:35` `MINI_CHART_DEFAULT_DAYS = 90`, 동 파일 L54 `useChartData(ticker,"D",days)` 동일. 동일 queryKey → 캐시 히트 | 통과 |
| AC5 무회귀(핵심) | popover/sheet/도크 주입 대조 + render-prop 계약 | 팝오버(캔들만)·시트·모바일 무변경, 세 지면 정상 렌더, MACD/RSI 데이터 부족 시 미표시 | 팝오버=`MiniStockChart(height=CHART_HEIGHT)`, 시트=`MiniStockChart(height, showAxis)` 주입(기존 동작 그대로). 도크만 `PeekChart`. `StockPeekContent` 은 `chart: React.ReactNode` prop 만 받아 `MiniStockChart` import 제거 → 팝오버/시트 청크 bloat 방지. `hasMacd`/`hasRsi` 가드로 짧은 이력 시 해당 패널 미표시 | 통과 |
| AC6 게이트 | 아래 §2 명령 실측 | tsc/eslint/build 0 에러, 신규 Tailwind 0 | 전부 통과 (§2) | 통과 |

> 참고: AC1~AC3 의 픽셀 단위 시각 확인은 인증 게이트 뒤 실 hover 인터랙션이라 스크립트 재현 불가. 대신 (a) 소스가 검증된 상세 차트(`StockDailyChart`)와 **동일 아톰·테마·데이터 훅** 을 재사용하고, (b) build 가 전 라우트 컴파일 성공, (c) dev 서버 부팅 시 peek 모듈 그래프 컴파일 에러 0 — 세 근거로 렌더 정상을 확인.

---

## 2. 빌드/린트 게이트 (실측)

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | **exit 0** (에러 0) |
| `npx eslint <변경 5파일>` | **exit 0** (경고/에러 0) |
| `npm run build` | **✓ Compiled successfully in 6.1s**, 전 라우트 생성 완료 |
| `npm run dev` 부팅 | `✓ Ready in 258ms`, 로그 error/failed/cannot/unhandled **0건**, 홈 307→/login→200 (인증 게이트 정상) |

- build 경고 2건은 `next.config.ts` NFT 트레이싱 경고(설정 레벨, 프로젝트 전체 트레이스) — **이 PR 무관·기존부터 존재**. PeekChart/peek 모듈 관련 경고 아님.
- ★ PR 본문이 "worktree 심볼릭 node_modules 제약으로 build 미실행 → QA 빌드 검증 필요" 로 남긴 오픈 항목을 본 QA 에서 **실 node_modules worktree 로 build 실측 → 해소**.

## 3. 공통 무회귀 게이트

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| 클라이언트 fetch 직접 호출 0 | `grep "fetch(" <변경 5파일>` | 0건 |
| BFF 원칙(127.0.0.1) | `git grep -nE "http://127\.0\.0\.1" -- app/` (route handler fallback 제외) | route handler fallback(`app/api/workbench/_adapters/fastapi.ts`)만 — 무회귀 |
| 신규 Tailwind/토큰 | PeekChart className 검사 | 기존 유틸(`w-full overflow-hidden`, `text-caption text-text-muted` 등)만, 신규 토큰 0. hex/px 직타 0(recharts 서브플롯 높이 px 는 JS 상수, 상세 차트와 동일 관행) |
| 한글 톤 | 노출 문구 | "차트를 불러오지 못했어요", SubLabel "거래량"·"MACD (12, 26, 9)"·"RSI (14)"(지표 고유명 제외 한글) — 무회귀 |
| 접근성 | 도크 상호작용 | `pointer-events-auto`(#269 유지), 팝오버 `pointer-events-none` 유지 — 무회귀 |

## 4. 에지 케이스

| 케이스 | 처리 | 결과 |
|---|---|---|
| 로딩 중 | `isLoading` → 전체 높이 `Skeleton` | 통과(레이아웃 시프트 방지, totalHeight = priceHeight+VOL+MACD+RSI+48) |
| 페치 실패/빈 캔들 | `isError || candleSeries.length===0` → "차트를 불러오지 못했어요" 카드 | 통과 |
| 짧은 이력(MACD 부족) | `hasMacd = macdSeries.some(m=>m.macd!==null)` false → MACD 패널 미표시 | 통과 |
| 짧은 이력(RSI 부족) | `hasRsi` false → RSI 패널 미표시 | 통과 |
| MACD signal 부재 | `macdSeries.some(m=>m.signal!==null)` 가드 → signal 라인 조건부 | 통과 |
| 좁은 뷰포트(<1920px) | 도크 미소환(팝오버/시트 경로) — PeekChart 미로드 | 무회귀 |

## 5. 라운드트립 노트

- 본 PR 은 순수 프론트 렌더 폴리시 — BFF/FastAPI 계약 변경 0. 도크 차트는 기존 `/api/stock/chart` (useChartData) 캐시 재사용이라 신규 라운드트립 시나리오 없음. dev 서버 부팅·홈 인증 게이트·전 라우트 build 컴파일로 통합 확인 완료.

---

## 최종 판정

- 6개 AC + 공통 게이트 + 에지 케이스 **전부 통과**, 실패 0건.
- `qa-passed` 라벨 부여 조건 충족(PR 본문 `## 다음 작업` 존재 확인).
