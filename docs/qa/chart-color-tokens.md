# QA 리포트 — chart-color-tokens (PR #86, `feature/chart-color-tokens`)

- 대상 브랜치: `feature/chart-color-tokens` (HEAD `99c8f07`)
- base(main): `1356c4d` (`#85` Wave 3a 머지 직후)
- 성격: **PRD 없는 리팩터** (Phase 3 Wave 3b). 변경 의도에서 AC 직접 도출.
- 핵심 판정 기준: **값 보존(value-preserving) — 시각 변경 0**. 모든 토큰 hex/값이 base 대비 무변경이어야 함.
- QA 환경: BE(`127.0.0.1:8000`) 다운(`/health` → 000, ECONNREFUSED). 라운드트립 데이터 흐름은 BE 의존 → 시나리오는 SSR 스모크 + 정적 대조 + 값 보존 논증으로 대체. 빌드/타입/린트/테스트는 BE 무관 전부 실측.
- 변경 파일(6): `components/profile/chart/chartTheme.ts`, `components/profile/chart/CandleBar.tsx`, `components/profile/chart/CandleTooltip.tsx`, `components/profile/ChartRangeDropdown.tsx`, `docs/design/finsight-redesign.md`, `tailwind.theme.json`.

---

## 1. AC 별 검증표

| # | AC (의도 도출) | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | chart-* 11색이 기존 `chartTheme.C` 리터럴 hex와 정확히 일치 | `node` 로 theme.json 토큰 vs 원본 리터럴 대조 (15쌍: chart-* 11 + 재사용 4) | 15/15 일치, FAIL 0 | **15/15 OK, FAILS=0** (아래 §2) | ✅ |
| AC-2 | `down=#2563eb=기존 macdLine` (의미 분리, hex 동일) | theme.json `chart-down` 값 + CandleBar/Tooltip 의 `C.macdLine→C.down` diff | `chart-down=#2563eb`, hex 무변경 | `chart-down=#2563eb` (= 기존 macdLine). 캔들 하락색 코드 경로만 `C.down` 으로 교체, hex 동일 | ✅ |
| AC-3 | drift back-port 22토큰이 원래 theme.json 값과 일치 | base theme.json vs 본 브랜치 DESIGN.md 등록값 대조 (fng-* 11 + spacing 9 + typography 2) | 22/22 일치 | **22/22 OK, FAILS=0** (아래 §3) | ✅ |
| AC-4 | theme.json 무손실: base→현재 토큰 키/값 diff = {removed:dead 1, changed:0, added:11} | base(`1356c4d`) theme.json vs 현재 flatten diff | removed=1(dead fontFamily.table-cell-numeric), changed=0, added=11(chart-*) | **removed=1, changed=0, added=11** — 정확히 의도대로 (아래 §3) | ✅ |
| AC-5 | dead `fontFamily.table-cell-numeric` prune 정당 | `git grep font-table-cell-numeric` (app/components/lib/hooks) | 0 usages | **0 usages** → prune 정당 | ✅ |
| AC-6 | design:sync lossless/idempotent (drift 해소 핵심) | `npm run design:sync` 재실행 후 theme.json diff | byte-identical (DESIGN.md = SSOT) | **IDENTICAL** — 재생성이 무손실·멱등 | ✅ |
| AC-7 | `npm run build` exit 0, unknown utility 0 | 빌드 2회 실행 | exit 0, 에러/unknown utility 0 | **exit=0**, 라우트 전체 생성, unknown utility/error 라인 0 | ✅ |
| AC-8 | `tsc --noEmit` 0 | `npx tsc --noEmit` | exit 0 | **tsc exit=0** | ✅ |
| AC-9 | eslint 변경 4파일 clean | `npx eslint <4 files>` | exit 0 | **eslint exit=0** | ✅ |
| AC-10 | `vitest run` 그린 | `npx vitest run` | all pass | **189 passed / 30 files**, exit 0 | ✅ |
| AC-11 | `design.md lint` errors=0 | `npx @google/design.md lint docs/design/finsight-redesign.md` | errors=0 | **errors=0**, warnings=22(전부 "never referenced"), exit 0 | ✅ |
| AC-12 | 차트 코드 hex 직타 제거 (rgba 툴팁 배경만 예외) | `git grep` hex in `components/profile/chart/` | hex 0건 | **hex 0건** (`tooltipBg` 는 rgba — hex 아님, 의도된 예외) | ✅ |
| AC-13 | 영향 화면 SSR 200 (chart·홈·게이지·도넛·테이블) | dev 서버 + curl 라우트 | 200/정상 리다이렉트 | 전부 200/의도된 307→200 (아래 §4) | ✅ |
| AC-14 | BFF 무회귀 (`http://127.0.0.1` in app/, route fallback 제외 0) | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler fallback만 | 3건 전부 `FASTAPI_BASE_URL` fallback(허용) | ✅ |
| AC-15 | 한글 톤·접근성 무회귀 | 변경 diff 검토 (ChartRangeDropdown aria) | 노출 문구·aria 무회귀 | 문구 변경 0, dropdown `aria-haspopup/aria-expanded` 유지, py 토큰 교체만 | ✅ |

---

## 2. 값 보존 핵심 대조 — chart 토큰 hex (AC-1, AC-2)

`tailwind.theme.json` 의 토큰값을 base 의 `chartTheme.ts` `C` 리터럴 hex와 1:1 대조.

```
OK  signal-up        expected=#c81e1e actual=#c81e1e   (stroke/fill — 재사용)
OK  text-muted       expected=#5b6470 actual=#5b6470   (axisTick — 재사용)
OK  border-line      expected=#eceff3 actual=#eceff3   (grid — 재사용)
OK  text-strong      expected=#0f1419 actual=#0f1419   (tooltipText — 재사용)
OK  chart-macd       expected=#2563eb actual=#2563eb
OK  chart-signal     expected=#f59e0b actual=#f59e0b
OK  chart-hist-up    expected=#16a34a actual=#16a34a
OK  chart-hist-down  expected=#dc2626 actual=#dc2626
OK  chart-rsi        expected=#7c3aed actual=#7c3aed
OK  chart-ref-ob     expected=#dc2626 actual=#dc2626
OK  chart-ref-os     expected=#2563eb actual=#2563eb
OK  chart-ref-mid    expected=#9ca3af actual=#9ca3af
OK  chart-vol-up     expected=#fca5a5 actual=#fca5a5
OK  chart-vol-down   expected=#93c5fd actual=#93c5fd
OK  chart-down       expected=#2563eb actual=#2563eb   (= 기존 macdLine, 역할만 분리)
FAILS: 0
```

→ 15/15 일치. 차트가 그리던 모든 색이 hex 한 자도 안 바뀌고 토큰으로 이관됨. **시각 무변경의 1차 근거.**

`down` 의미 분리: `CandleBar.tsx` / `CandleTooltip.tsx` 의 하락색 경로 `isUp ? C.stroke : C.macdLine` → `... : C.down`. `chart-down` = `chart-macd` = `#2563eb` 동일 hex → 렌더 픽셀 무변경, 역할 토큰만 독립화(추후 차트 하락색 재조정 시 MACD 라인색과 독립 변경 가능).

---

## 3. 값 보존 핵심 대조 — theme.json 무손실 + back-port (AC-3, AC-4)

### base(`1356c4d`) theme.json vs 현재 — flatten 키/값 diff

```
=== REMOVED ===
  - theme.extend.fontFamily.table-cell-numeric   (← 의도된 dead prune, 사용 0건)
=== VALUE CHANGED ===
  (없음)
=== ADDED ===
  + colors.chart-macd/signal/hist-up/hist-down/rsi/ref-ob/ref-os/ref-mid/vol-up/vol-down/down (11)
removed=1  changed=0  added=11
```

→ **값 변경 0건.** 손실은 의도된 dead fontFamily 1건뿐. 신규는 chart-* 11키. 기존 토큰(fng-*·spacing·typography 포함) 전부 그대로 보존.

### back-port 22토큰이 base theme.json 값과 동일 (DESIGN.md 환원은 값 보존)

base theme.json 이 이미 갖고 있던 값 = DESIGN.md 등록값 대조:

```
fng-extreme-fear #1d6fb8 / -soft #e3f0fa / fear #256353 / -soft #e1f0eb /
neutral #4b525c / -soft #f0f1f3 / greed #82500c / -soft #fbf0dc /
extreme-greed #a83246 / -soft #fbe4e8 / track #eceff3                  → 11/11 OK
home-grid-gap 16px / gauge-w 220px / gauge-h 120px / gauge-track-w 14px /
donut-size 168px / donut-thickness 22px / table-row-h 48px /
table-cell-px 12px / disclosure-row-py 12px                            → 9/9 OK
gauge-score [40px,800,-0.02em] / table-cell-numeric [14px,700]         → 2/2 OK
back-port value FAILS: 0
```

→ 22/22 일치. back-port 는 SSOT 를 theme.json→DESIGN.md 로 되돌린 것일 뿐, 어떤 값도 안 바뀜.

### design:sync 멱등성 (AC-6)

```
$ npm run design:sync   # DESIGN.md → theme.json 재생성
$ diff <재생성 전> tailwind.theme.json
IDENTICAL: design:sync is lossless/idempotent
```

→ DESIGN.md 가 현재 theme.json 을 무손실 재생산. drift(수동병합분이 SSOT에 없어 재생성 시 누락→빌드깨짐) 완전 해소 확인.

---

## 4. 빌드/타입/린트/테스트 실측 (AC-7~AC-11)

| 명령 | 결과 | exit |
|---|---|---|
| `npm run build` (×2) | 전체 라우트 생성, unknown utility/error 라인 0 | **0** |
| `npx tsc --noEmit` | 출력 없음 | **0** |
| `npx eslint chartTheme.ts CandleBar.tsx CandleTooltip.tsx ChartRangeDropdown.tsx` | 출력 없음 | **0** |
| `npx vitest run` | **189 passed (30 files)**, Duration 1.40s | **0** |
| `npx @google/design.md lint docs/design/finsight-redesign.md` | **errors=0**, warnings=22, infos=1 | **0** |

- **build unknown-utility 0 = drift 해소의 결정적 증거.** back-port 된 토큰들(`donut-size`·`table-row-h`·`fng-*`·`gauge-score` 등)이 `@apply`/인라인으로 `w-donut-size`·`h-table-row-h`·`bg-fng-extreme-fear-soft`·`text-gauge-score` 형태로 실제 소비되므로, 토큰이 누락됐다면 빌드가 "Cannot apply unknown utility class" 로 실패함 → 통과 = 토큰 정상 컴파일.
- design.md lint warning 22건은 전부 `'<token>' is defined but never referenced by any component` 유형(비-never-referenced 경고 0건). chart-*/fng-*/gauge 토큰은 recharts/canvas에서 JSON hex 또는 `@apply`로 소비돼 design.md 의 컴포넌트 참조 스캐너가 못 잡는 구조적 이유 → 비차단(errors=0).

---

## 5. 라운드트립 / SSR 스모크 (AC-13) — BE 다운 환경

BE `127.0.0.1:8000` `/health` → **000(ECONNREFUSED)**. PR#11 기본 5건은 워크벤치 분석 BE 데이터에 의존하므로 본 토큰 리팩터(데이터 흐름 무변경)에는 비적용 — 대신 토큰 소비 화면의 SSR 렌더 스모크로 검증.

dev 서버(`npm run dev`, `localhost:3000`) 기동 후:

| 라우트 | 소비 토큰 | HTTP | 비고 |
|---|---|---|---|
| `/` (홈) | `home-grid-gap` 등 | **200** | served CSS 에 `gap-home-grid-gap` 규칙 컴파일 확인 |
| `/profile` | `donut-*`·`table-*` | **200** | served CSS 에 `donut-size`(2)·`table-row-h`(1) 규칙 확인 |
| `/dashboard` | `fng-*`·`gauge-*` | 307→`/profile`→**200** | 의도된 라우트 통합(dashboard-replan) |
| `/market` | — | 307→`/`→**200** | 의도된 라우트 통합 |
| `/stock` | — | **200** | |
| `/stock/AAPL` | `chart-*` (차트) | **200** | 차트 셸 SSR 정상, chart-token/unknown-utility 런타임 에러 0 |
| `/watchlist` | — | **200** | |
| `/analyze` | — | **200** | |

- 서빙된 CSS(96KB)에서 `donut-size`·`table-row-h`·`home-grid-gap`·`fng-extreme-fear`·`gauge-score` 유틸리티 규칙 실재 확인 → 토큰이 실제 CSS로 컴파일됨.
- dev 로그에 `unknown utility` / `cannot resolve` / `chartTheme` / `tailwind.theme` 관련 에러 0건. 앱 레벨 500 0건(BE ECONNREFUSED 기인 5xx는 본 변경 무관·제외).
- **픽셀 회귀 한계 명기**: 본 변경은 hex/px 값 무변경(§2·§3 대조 완료)이라 시각 결과는 정의상 동일. 자동 픽셀 디프는 미수행 — 값 보존이 수학적으로 증명되므로 픽셀 회귀 위험은 "토큰→CSS 컴파일 누락" 한 경로뿐이며 이는 build exit 0 + served CSS 규칙 실재로 차단됨. 사람 눈 픽셀 비교는 본 단계 범위 외.

---

## 6. 에지 케이스

| 케이스 | 점검 | 결과 |
|---|---|---|
| 동일 hex 다중 토큰 충돌 | chart-macd=chart-ref-os=chart-down=#2563eb, chart-hist-down=chart-ref-ob=#dc2626 — 의도된 역할 분리 | 값 동일·키 독립, recharts 색 문자열 정상 해석 (DESIGN.md 명시) |
| design:sync 비멱등 위험 | 재실행 시 토큰 순서/값 변동 | byte-identical (멱등) |
| dead 토큰 잔존 prune 부작용 | `font-table-cell-numeric` 사용처 | 0건 → 부작용 없음 |
| theme.json 수동편집 재발 | SSOT 환원 후 재생성 신뢰성 | DESIGN.md 경유만으로 무손실 복원 확인 |
| rgba 툴팁 토큰화 누락 의심 | `tooltipBg: rgba(255,255,255,0.82)` 코드 리터럴 유지 | 의도된 예외(투명 오버레이, hex 아님) — 차트 hex 직타 0 유지 |
| BE 다운(ECONNREFUSED) | 토큰 소비 화면 SSR 의존성 | 화면 셸 SSR 200, 토큰 렌더 BE 무관 |

---

## 7. 종합 판정

- AC 15/15 통과. 에지 6/6 통과.
- **값 보존 증명 완료**: chart 토큰 15/15 + back-port 22/22 hex/값 일치, base 대비 theme.json **값 변경 0건**(손실=의도된 dead 1, 추가=chart-* 11). 시각 무변경 근거 확보.
- design:sync 멱등·무손실 → drift 해소 확인. build/tsc/eslint/vitest/design.md-lint 전부 exit 0, unknown-utility 0.
- BFF·한글 톤·접근성 무회귀.

**판정: qa-passed** (실패 0건)

> 라벨 게이트: PR #86 본문에 `## 다음 작업` 섹션 존재(후속 = 로드맵 보류 항목 middleware→proxy·W4 MACD 0패딩 + 토큰 추가 시 DESIGN.md 경유 원칙) — handoff-append 트리거 안전. 현재 라벨 `impl-ready`. 본 QA 는 판정만 반환, 라벨 변경은 미수행.
