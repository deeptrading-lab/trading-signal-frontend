# QA 리포트 — ai-usage-observability (PR #164)

- 브랜치: `feature/ai-usage-observability`
- 워크트리: `/Applications/하영/code_source/trading-signal-frontend-observability`
- merge-base: `e0714cb` (= 현재 main HEAD) → PR 범위 = 아래 12개 파일
- 라이브 검증 환경: dev 서버 `http://localhost:3100` (인증 게이트 OFF, Supabase 설정됨 — `x-data-source: supabase`)
- 검증 일시: 2026-06-27

## PR 범위 (merge-base..HEAD, 4 커밋 / 12 파일)

| 커밋 | 요지 | 변경 파일 |
|---|---|---|
| 56a10ad | 트레이더·PM effort high→max | lib/prompts/stock/aiAnalysis.ts |
| 87740b3 | 지연·모델·소요시간 계측 노출 + 비용착시 교정 | usage/route.ts, agentUsageStore.ts, agentUsage.ts(타입), format.ts, CacheCostCards/AgentUsageTable/StageInputTrendChart/AgentUsageContainer.tsx, labels.ts |
| e286dc6 | claude modelUsage 주 모델 추출(최대 토큰) | lib/server/claudeAgent.ts |
| a84df65 | 표시 모델 = 요청 모델(--model) 우선 | lib/server/ai/agentCli.ts |

---

## AC별 검증 표

### AC1 — 지연 계측 노출 (per-agent avgDurationMs + 테이블 "평균 소요" 컬럼)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 타입 | `lib/types/stock/agentUsage.ts` `AgentUsageRow.avgDurationMs` | `number \| null`, "measured 무관" 주석 | L28-29 존재, "measured 무관(codex 포함)" | PASS |
| SELECT | `agentUsageStore.ts` SELECT_COLS / record | `duration_ms` 편입 | L63 SELECT에 `duration_ms`, L51 `durationMs`, toRecord L113 매핑 | PASS |
| 집계 | `usage/route.ts` `aggregateAgent` | measured 무관 전체 행 평균 | L65 `avgDurationMs: mean(nums(rows.map(r=>r.durationMs)))` (measured 필터 미적용, 전체 `rows`) | PASS |
| API 응답 | `curl .../usage` 12행 모두 확인 | 전 행 avgDurationMs 채워짐 | market 92415.8 / news 140173 / trader 28581 / PM 60194 … 12/12 채워짐 (아래 표) | PASS |
| 테이블 컬럼 | AgentUsageTable.tsx | "평균 소요" 컬럼·정렬키 추가 | L98-110 COLUMNS에 `duration`, L161 `<Num value={fmtDuration(r.avgDurationMs)} />` (measured 분기 밖 → 항상 렌더), labels COL_DURATION="평균 소요" | PASS |

라이브 API per-agent (claude, runCount 30):

```
market              | claude-sonnet-4-6 | 92415.8  ms | 30/30
news                | claude-sonnet-4-6 | 140173.4 ms | 30/30
fundamentals        | claude-sonnet-4-6 | 161572.6 ms | 29/29
social              | claude-sonnet-4-6 | 134592.4 ms | 30/30
bull                | claude-sonnet-4-6 | 52305.1  ms | 56/56
bear                | claude-sonnet-4-6 | 52877.5  ms | 56/56
research_manager    | claude-sonnet-4-6 | 80342.9  ms | 28/28
trader              | claude-opus-4-8   | 28581.8  ms | 28/28
risk_risky          | claude-sonnet-4-6 | 36319.9  ms | 28/28
risk_neutral        | claude-sonnet-4-6 | 46792.4  ms | 28/28
risk_safe           | claude-sonnet-4-6 | 38533.4  ms | 28/28
portfolio_manager   | claude-opus-4-8   | 60194.8  ms | 28/28
```

`fmtDuration` 경계 검증: 582778→"9분 43초", 92415.8→"1분 32초", 28581.8→"28.6초", null→"—", 60000→"1분", 120000→"2분". (cosmetic: 59999ms→"60.0초" — <60s 경계서 반올림, 무해)

### AC2 — run wall-clock (avgWallClockMs = span, 단순합 아님 + "분석 1회 평균 소요" 카드)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 산출식 | `usage/route.ts` `runWallClockMs` | `max(종료)-min(시작)`, 시작=created_at-duration_ms | L73-85: end=Date.parse(createdAt), start=end-(durationMs??0), span=maxEnd-minStart, `Math.max(0,...)` 클램프, NaN 날짜 skip | PASS |
| provider 집계 | `providerRunStats` | runId 그룹 → wall-clock 평균 + distinct run 수 | L87-96 byRun 그룹 후 `mean(wallClocks)`, runCount=byRun.size | PASS |
| API 필드 | `curl .../usage` | `runStatsByProvider.claude.avgWallClockMs` 존재 | `{claude:{avgWallClockMs:582778.47, runCount:30}, codex:{avgWallClockMs:null, runCount:0}}` | PASS |
| 단순합 아님(span) | 에이전트 avgDuration 단순합 vs wall-clock 비교 | wall-clock < 단순합(병렬 구간 미중복) | 단순합 924702ms(15.41분) > wall-clock 582778ms(9.71분) → span 증명 (Phase A 4분석가 + 리스크3 병렬 구간 중복합산 안 됨) | PASS |
| 카드 | CacheCostCards.tsx + 컨테이너 | "분석 1회 평균 소요" 카드, wallClockMs prop 전달 | 컨테이너 L91 `wallClockMs = runStatsByProvider[provider]?.avgWallClockMs ?? null` → CacheCostCards prop, MetricCard CARD_WALL_CLOCK="분석 1회 평균 소요" + CARD_WALL_CLOCK_HINT | PASS |

### AC3 — 모델 정확성 (핵심: per-row model이 sonnet/opus, haiku 아님)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 추출 보강 | claudeAgent.ts `extractModel` | 첫 키 대신 토큰 합 최대 항목 | L40-58: entries.length===1이면 그대로, 아니면 usageScore(숫자필드 합) 최대 키 선택 | PASS |
| 표시 우선순위 | agentCli.ts claude 분기 | 요청 모델(`request.model ?? CLAUDE_CLI_MODEL`) 우선, 추출값은 env 미설정 시 last-resort | L258 requestedModel, L270 `usage.model: requestedModel ?? result.usage.model` (결정적) | PASS |
| codex 분기 정합 | agentCli.ts codex | 동일 방식(`usage.model ?? request.model ?? CODEX_CLI_MODEL`) | L288 동일 패턴 | PASS |
| 라이브 분포 | `curl .../usage` model 컬럼 12행 | 분석가=sonnet-4-6, 트레이더·PM=opus-4-8, haiku 0건 | sonnet-4-6 ×10, opus-4-8 ×2(trader·PM), **haiku 0행** | PASS |

### AC4 — 비용착시 카피 교정 + StageInputTrendChart 2계열

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| CHART_TREND_HINT | labels.ts | "뒤 단계 누적" 서술 폐기 → "봉우리=웹분석가 tool-loop 캐시, 신규(과금) 입력은 작고 평탄" | 신규 문구로 교체 확인 | PASS |
| CARD_CACHE_HINT | labels.ts | 캐시 생성(≈1.25x)이 진짜 비용 설명 | "캐시 읽기는 싸지만(≈0.1x)…캐시 생성(≈1.25x)이 진짜 비용…적중률 높아도 비용 클 수 있어요" | PASS |
| CODEX_UNMEASURED_NOTICE | labels.ts | "토큰 미제공"→"비용만 미제공" | "Codex CLI는 비용(USD)을 제공하지 않아…토큰·소요시간은 측정됩니다" | PASS |
| 차트 2계열 | StageInputTrendChart.tsx | fresh(신규)·cache(캐시) 2 Line + Legend | data 매핑 fresh/cache 분리, `<Legend>` 추가, Line ×2 (cache=rsiLine, fresh=macdLine), Tooltip `(v,name)` 시리즈명 표시 | PASS |
| 토큰 정합 | 차트 색 | hex/px 직타 없음 | `theme.C.rsiLine`/`theme.C.macdLine` 사용 (useChartTheme), raw hex 0건 | PASS |

### AC5 — 기본 탭 = 최근 실행 provider (latestProvider)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 타입·산출 | usage/route.ts + agentUsage.ts | `latestProvider` 필드, rows desc 첫 행 provider | 타입 L53-54, route L122 `rows[0]?.provider ?? null` (store order=created_at.desc) | PASS |
| API 값 | `curl .../usage` | null 아님 | `latestProvider: "claude"` | PASS |
| 컨테이너 기본 탭 | AgentUsageContainer.tsx | `picked ?? latestProvider ?? "claude"` | L42 picked state(null), L90 `const provider = picked ?? data.latestProvider ?? "claude"`, 탭 클릭 시 `setPicked` | PASS |

### AC6 — effort:max (트레이더·PM)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 트레이더 | aiAnalysis.ts | `effort: "max"` | L389 `effort: "max" as const` | PASS |
| PM | aiAnalysis.ts | `effort: "max"` | L570 `effort: "max" as const` | PASS |
| 부수 영향 | `grep effort:` | 다른 에이전트 오염 없음 | `effort:`는 정확히 2건(L389·L570)만 — 나머지 에이전트는 미설정(기본값) 유지 | PASS |

### AC7 — 무회귀

| 항목 | 명령/재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| tsc | `npx tsc --noEmit \| grep -vE "\.next/dev/types\|market/(ticker\|indices)/route"` | 잔여 에러 0 (나머지는 main 이슈) | 잔여 1줄 = `.next/dev/types/.../market/ticker/route.ts` TS2344의 들여쓴 연속줄(`resetTickerCacheForTest`)로, 첫 줄이 필터됨 → **기존 main 이슈, PR 무관**. PR 파일발 에러 0건 | PASS |
| eslint | `npx eslint <변경 12파일>` | 클린 | exit 0, 출력 없음 | PASS |
| 기존 카드/막대/적중률 | CacheCostCards/AgentTokenBarChart | 동작 유지 | 카드 그리드 4→5칸(소요 카드 삽입), CARD_AVG_COST/INPUT/OUTPUT/CACHE_HIT 유지, cacheHit 계산식 무변경, AgentTokenBarChart 변경 없음 | PASS |
| codex 토큰 표시 | AgentUsageTable 측정 분기 | measured 행은 토큰 표시 유지 | `measuredOk = measuredCount>0` 무변경, 측정 행 토큰 렌더, 미측정 행은 colSpan6 배지 — 컬럼 합 11 정합(agent+stage+model+6+duration+samples) | PASS |
| unconfigured fallback | usage/route.ts L131-140 | summary가 runStatsByProvider/latestProvider 포함 | empty summary에 `runStatsByProvider:{claude,codex emptyStats}`, `latestProvider:null` 포함 → 컨테이너 옵셔널체이닝과 정합 | PASS |
| BFF 무회귀 | `git grep "http://127\.0\.0\.1"` 클라이언트 경로 | 0건 | 클라이언트(app tsx/components/hooks/lib) 0건 | PASS |
| 한글 톤 | 신규 카피 | 노출 문구 한글 | CARD_WALL_CLOCK·COL_MODEL·COL_DURATION·각 HINT 모두 한글(모델 id·USD 등 고유명사 예외) | PASS |
| 페이지 렌더 | `curl /analyze` | 200 | HTTP 200 | PASS |

---

## 에지 케이스

| 케이스 | 동작 검증 | 결과 |
|---|---|---|
| codex 미측정 표시 | usage 라이브엔 codex 0행. 코드상 미측정(measuredCount=0) 행은 토큰/비용 영역 `측정 안 됨` 배지(colSpan6), **모델·평균 소요 컬럼은 분기 밖이라 그대로 표시** → 교정 카피("비용만 미제공, 토큰·소요시간은 측정")와 일관. codex 분기 표시 모델도 `request.model ?? CODEX_CLI_MODEL` 채움 | PASS |
| legacy haiku 행 | 보강 전 저장된 행은 옛 haiku 값 유지 가능(설계상 재분석 시 정정). 라이브 30 run은 재분석 거쳐 haiku 0행. extractModel은 더 이상 첫 키 반환 안 함, 표시 모델은 요청 모델 우선이라 신규 행 흔들림 없음(결정적) | PASS |
| 표본 적을 때 / 빈 데이터 | `mean([])→null`, `denom===0→cacheHitRate null`, `fmtDuration(null)→"—"`, `fmtModel(null)→"—"`, `runWallClockMs` 유효 날짜 없으면 null. unconfigured 시 빈 byProvider+emptyStats+latestProvider null → 컨테이너 `?? "claude"` 폴백 | PASS |
| NaN/malformed 날짜 | `runWallClockMs` L78 `Number.isNaN(end)` 가드로 해당 행 skip, 모두 무효면 null. duration 음수 방지 `Math.max(0,...)` | PASS |
| 병렬 단계 중복합산 | wall-clock span(9.71분)이 단순합(15.41분)보다 작음 → Phase A·리스크3 병렬 구간 미중복 산출 확인 | PASS |
| 토큰 직타 회귀 | 신규 차트 색 `theme.C.*` 사용, raw hex 0건. `min-h-[160px]`/`h-[300px]`는 기존 Tailwind arbitrary height(색 아님·신규 아님) | PASS |

---

## 판정

**전체 PASS (실패 0건)**

- AC1~AC7 전부 통과. tsc(필터 후 PR 발 0건)·eslint(exit 0) 클린.
- 라이브 API: model 12/12 정확(sonnet-4-6 ×10, opus-4-8 ×2, haiku 0), avgDurationMs 전행 채움, avgWallClockMs=582778ms(span, 단순합 미만), latestProvider="claude".
- 에지케이스(codex 미측정/legacy haiku/빈 데이터/NaN 날짜/병렬 중복합산/토큰 직타) 모두 안전.
- 비기능 참고: tsc 잔여 1줄은 `.next/dev/types` market/ticker 기존 main 이슈(PR 무관). 워크트리 env에 KV 키 부재로 인한 502/KV 경고는 인프라 이슈로 코드와 무관(QA 범위 외).
