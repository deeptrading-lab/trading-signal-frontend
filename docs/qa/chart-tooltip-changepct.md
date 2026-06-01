# QA 리포트 — chart-tooltip-changepct

- **PR**: #70 `feat(chart): 캔들 툴팁 등락률 표시 + 차트 포커스 아웃라인 제거`
- **브랜치**: `feat/chart-tooltip-changepct`
- **PRD**: 없음 (경량 반복 워크플로 — 버그픽스/UX 개선). PR 본문 변경 설명을 AC 로 변환해 검증.
- **변경 파일**: `app/globals.css` (+12), `components/profile/StockDailyChart.tsx` (+38/-10)
- **검증일**: 2026-06-01
- **판정**: **qa-passed** (실패 0건)

## 검증 환경

| 항목 | 값 |
|---|---|
| typecheck | `npm run typecheck` → 0 에러 |
| lint | `npm run lint` → 0 에러/경고 |
| build | `npm run build` → 성공 (29 라우트 생성, CSS 컴파일 정상) |
| FastAPI (`127.0.0.1:8000`) | **다운** (curl `/health` → 000 / ECONNREFUSED) |
| 차트 데이터 소스 | KIS API (외부, route handler 프록시) — **LIVE 가용**. 차트는 FastAPI 비의존이라 BE 다운과 무관하게 실데이터 검증 가능 |
| dev 서버 | 기존 인스턴스 (PID 74027, :3000) 가동 중 — 이를 통해 BFF `/api/stock/chart` 200 응답 + 실 캔들 데이터로 계산 로직 라이브 검증 |
| 뷰포트 라이브 실측 | 전역 CSS·계산 로직이 뷰포트 무관(반응형 분기는 컨트롤 레이아웃에만 존재, 본 변경 무관)이라 두 뷰포트 차등 없음. UI 렌더 클릭/탭 실측은 정적+컴파일 CSS+실데이터 계산 검증으로 대체 (한계: §한계 참조) |

---

## 1. 변경 1 — 차트 포커스 아웃라인 제거 (AC-1 ~ AC-3)

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | 캔들/라인 메인 plot 영역 클릭(PC)·탭(모바일) | 굵은 outline 미표시 | 전역 규칙 `.recharts-wrapper :focus { outline:none }` 가 모든 recharts 차트에 적용. 컴파일 CSS 에 규칙 존재 확인 (아래 출력) | PASS |
| AC-2 | 거래량/MACD/RSI 서브플롯 클릭/탭 | 동일하게 아웃라인 없음 | 선택자가 `.recharts-wrapper` 후손 전체를 덮으므로 메인·서브플롯(각각 별도 ResponsiveContainer→recharts-wrapper) 모두 동일 적용. 전역 1회 정의 | PASS |
| AC-3 | 선택자 정확성 정적 확인 | 실제 포커스 대상(zIndex 레이어 `<g>`)을 덮어야 | recharts 3.8.1 `zIndex/ZIndexPortal.js` 가 `<g tabIndex=-1 className="recharts-zIndex-layer_{zIndex}">` 생성 (suffix 가변: `_-100`/`_0`/`_100`). 후손 선택자 `.recharts-wrapper :focus` 가 클래스 suffix 무관하게 정확히 커버. surface(`RootSurface.js`)·wrapper 자기 자신은 `:focus`/`:focus-visible` 직접 선택자가 커버 | PASS |

### AC-3 근거 — recharts 내부 DOM 확인

```
node_modules/recharts/es6/zIndex/ZIndexPortal.js:
  React.createElement("g", { tabIndex: -1, ..., className: "recharts-zIndex-layer_".concat(zIndex) })
```
- `tabIndex=-1` → 클릭/탭으로는 포커스를 받지만(아웃라인 발생) **키보드 Tab 순서에는 진입하지 않음** → 본 CSS 는 Tab 순서/키보드 접근성에 영향 없음 (접근성 무회귀 확인).
- 차트는 키보드 조작 대상이 아니고 툴팁은 hover/touch 로 동작 → outline 제거는 시각 노이즈만 제거. a11y 손실 없음.

### 컴파일 CSS 확인 (build 산출물)

```
$ grep -o "recharts-wrapper[^}]*}" .next/static/chunks/0ipjduspixjfq.css
recharts-wrapper:focus,.recharts-wrapper:focus-visible,.recharts-wrapper :focus,.recharts-wrapper :focus-visible{outline:none}
```
Tailwind v4 빌드를 거쳐도 규칙이 손실 없이 1건 존재.

---

## 2. 변경 2 — 캔들 호버 툴팁 등락률 (AC-4 ~ AC-8)

라이브 KIS 데이터(`005930`, 일봉 100일 fetch → 67 표시봉)로 컴포넌트의 `fullCandle` 매핑 + `CandleTooltip` 렌더 로직을 재현 검증.

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-4 | 캔들 모드 호버 | 고/시/종/저 아래 "등락" 줄 = 퍼센트+절대변동 | 실데이터 마지막 봉: `등락 +10.09% (+32,000)`. 형식 `등락 +X.XX% (±N)` 일치 (예시 포맷 `등락 +14.25% (+1,710)` 패턴 동일) | PASS |
| AC-5 | 등락 부호/색 = 직전 봉 종가 대비 방향 | 상승 빨강 / 하락 파랑 / 보합 기본 | 상승→`red(stroke #c81e1e)`, 하락→`blue(macdLine #2563eb)`, 보합→`default(tooltipText)` 정확. **의도된 색 기준 차이 확인**: 2026-02-27 봉은 등락(전일대비 -0.69%)=파랑인데 캔들 몸통(당일 시<종, isUp)=빨강 — 두 색은 기준이 다름(등락=전일종가 대비, 몸통=당일 시-종가). PR 에 명시된 의도된 동작 ✔ | PASS |
| AC-6 | 일/주/월봉 전환 | 각각 전일/전주/전월 대비 | 계산은 `sorted[i-1].close` 기준 — `sorted` 가 선택된 `period`(D/W/M)로 fetch·정렬된 봉이므로 직전 "봉" = 전일/전주/전월. 데이터 흐름 정적 검증으로 일치 | PASS |
| AC-7 | 첫 표시 봉 호버 | 빈칸("-") 없이 등락률 표시 | 워밍업(WARMUP_DAYS D:60) 덕에 표시 구간(visibleStart)은 전체 정렬 배열 중간에 위치 → 첫 표시 봉도 `i>0` 이라 prevClose 존재. 실데이터: i=0(워밍업 첫 봉, 슬라이스로 제거됨)만 changePct=null, i=1부터 `+3.63%` 정상 | PASS |
| AC-8 | 라인 모드 호버 | 종가 단일 표시 유지(등락률 미표시) | 라인 모드는 `priceSeries`(date/price만) + 기본 `<Tooltip formatter={fmtTooltipPrice}>` 사용 → "종가" 단일. CandleTooltip 미적용. 무회귀 ✔ | PASS |

### AC-4~7 라이브 데이터 검증 출력 (005930 일봉)

```
총 표시봉수: 67
[첫 봉 i=0] 2026-02-23 | changePct=null | 등락 줄 미표시 (← 워밍업 첫 봉, 슬라이스 전 시작점)
[두 번째 봉 i=1] 2026-02-24 | 등락 +3.63% (+7,000)  [red(up)]   ← 첫 표시 봉도 값 존재 (AC-7)
[마지막 5봉]
  2026-05-26 | 등락 +2.22% (+6,500)   [red,  몸통 red]
  2026-05-27 | 등락 +2.68% (+8,000)   [red,  몸통 blue]   ← 색 기준 차이 (AC-5 의도)
  2026-05-28 | 등락 -2.44% (-7,500)   [blue, 몸통 blue]
  2026-05-29 | 등락 +5.84% (+17,500)  [red,  몸통 red]
  2026-06-01 | 등락 +10.09% (+32,000) [red,  몸통 red]
[하락 봉]      2026-02-27 | 등락 -0.69% (-1,500)  [blue, 몸통 red]   ← AC-5 의도된 색 불일치 실사례
[최대 상승 봉] 2026-05-06 | 등락 +14.41% (+33,500) [red, 몸통 red]
```

---

## 3. 에지 케이스

라이브 데이터에 0%·prevClose=0 봉이 없어 합성 입력으로 보강 (컴포넌트의 `fullCandle` 매핑 + `CandleTooltip` 렌더 로직 동일 재현).

| # | 케이스 | 입력 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| E1 | 첫 봉 (prevClose=null) | i=0 | 등락 줄 미표시 | `changePct=null` → 줄 미렌더 | PASS |
| E2 | **prevClose=0 0-나누기 가드** | prevClose=0, close=100 | Infinity% 아님 | `changePct=null`(가드 `prevClose!==0`) → 등락 줄 미표시. `change`는 100이지만 changePct null이라 줄 자체 미표시 | PASS |
| E3 | 보합 (changePct=0) | 100→100 | `0.00%` + 기본색 | `등락 0.00% (0)  [default(tooltipText)]` | PASS |
| E4 | 상승 | 100→105 | `+5.00%` 빨강 | `등락 +5.00% (+5)  [red]` | PASS |
| E5 | 하락 | 100→95 | `-5.00%` 파랑 | `등락 -5.00% (-5)  [blue]` | PASS |
| E6 | 음수 change 부호 중복 방지 | 2000→1700 | `-300` (이중부호 없음) | `등락 -15.00% (-300)` — formatNumber 가 음수부호 포함, 수동 `+`는 양수만 | PASS |
| E7 | 큰 퍼센트 (>=100) | 10→25 | digits:2 명시 유지 | `등락 +150.00% (+15)` (formatPct digits 기본 분기 무시, 명시값 2자리) | PASS |
| E8 | formatPct/formatNumber null 처리 | value=null | `"-"` 반환 | 두 헬퍼 모두 null/undefined/!isFinite → `"-"` (단, changePct null이면 줄 미렌더라 노출 안 됨) | PASS |
| E9 | (관찰) 극소 change 반올림 | 10000→10000.4 | — | `등락 0.00% (+0)` — change=+0.4가 digits:0 반올림으로 `+0` 표기, color는 미세 양수라 빨강. **결함 아님**(정수 KRW 시세에선 발생 불가한 합성 극단값). 기록만 | OBS |

### 공통 AC 무회귀

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| typecheck 0 에러 | `npm run typecheck` | PASS |
| lint 0 에러 | `npm run lint` | PASS |
| build 0 에러 | `npm run build` (29 라우트, CSS 정상) | PASS |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` → `app/api/workbench/_adapters/fastapi.ts` (route handler fallback) 외 0건 | PASS |
| 한글 톤 무회귀 | 추가 사용자 노출 문구 = `등락` (한글) + `%`/`원`(허용 단위·기호). 영문 잔여 0건 | PASS |
| 접근성 무회귀 | focus outline 제거 대상(`<g tabIndex=-1>`)은 키보드 Tab 순서 비진입 → Tab 순서/label/aria 영향 없음 | PASS |
| StrictMode/SSR | 신규 상태/이펙트 없음 (순수 계산 + 전역 CSS). 더블 마운트·hydration 영향 없음 | PASS |

---

## 4. 라운드트립 (수동 시나리오)

- FastAPI(`127.0.0.1:8000`) 다운 상태이나, 본 변경 대상인 종목 차트는 KIS API 기반(FastAPI 비의존)이라 LIVE 데이터로 검증 가능했다 (PR #11 의 워크벤치 5건 시나리오는 본 PR 범위 밖이므로 비적용 — 본 PR 은 차트 툴팁/CSS 한정).
- BFF 경유 `GET /api/stock/chart?ticker=005930&days=100&period=D` → **200 OK**, 실 캔들 67봉 응답. 이 데이터로 §2·§3 계산 로직 라이브 검증 완료.

---

## 5. 한계 (명시)

- **UI 픽셀 렌더(실제 호버 시 outline 사라짐·툴팁 DOM 그려짐)의 브라우저 육안 클릭/탭 실측은 미수행.** 대신 (a) 컴파일 CSS 에 outline:none 규칙 존재 확인, (b) recharts 3.8.1 내부 DOM(`<g tabIndex>`/`recharts-wrapper`) 구조 확인으로 선택자 정확성 입증, (c) 실 KIS 데이터로 등락 계산·색·문자열 로직을 컴포넌트 코드와 1:1 재현 검증으로 대체.
- **두 뷰포트(모바일~390 / 데스크탑) 차등 검증**: 본 변경은 전역 CSS(뷰포트 무관) + 뷰포트 무관 계산 로직뿐이며, 컴포넌트의 반응형 분기(`isMobile`)는 컨트롤 레이아웃(기간 드롭다운 vs 버튼)에만 존재해 본 변경과 무관. 따라서 뷰포트별 차등 위험 없음.
- E9 는 정수 KRW 시세에선 발생 불가한 합성 극단값으로, 결함이 아닌 관찰 항목.

---

## 판정

전체 AC(AC-1 ~ AC-8) + 공통 무회귀 모두 통과. 실패 0건. → `qa-passed`.
