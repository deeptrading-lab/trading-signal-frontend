# QA 리포트 — analyze-decision-cards (PR #130)

- **대상 PR**: #130 `feat(analyze): 분석 결과 카드 탭 추가 (최신순 종목·상세 모달·카드별 토큰·검색)`
- **브랜치**: `feature/analyze-decision-cards`
- **PRD**: 없음 (경량 반복 작업 — 수용 기준은 PR 본문에서 도출)
- **QA 환경**: 로컬 (macOS, Node). Supabase / 로컬 claude·codex CLI / KIS 키 **미구성** → end-to-end(실제 분석 실행→저장→카드) 항목은 **미실행, 로컬 QA 필요**로 명시.
- **판정**: **qa-passed** (정적 검증 + 코드 기반 수용 검증 전부 통과, 실행 못 한 end-to-end 항목은 한계로 위임)

---

## 1. 정적 검증 (실측)

| 명령 | 결과 | exit |
|---|---|---|
| `npx tsc --noEmit` | 에러 0건 | `0` |
| `npx eslint .` | 출력 0줄, 경고/에러 0건 | `0` |
| `npm run build` (`next build`) | 성공. `/api/stock/ai-analysis/decisions` 라우트 등록 확인(ƒ Dynamic), `/analyze` 정적 prerender(○) | `0` |
| `npx vitest run` | **264 passed**, 1 skipped(`liveBacktest` — 의도된 실네트워크 skip), 41 파일 통과 / 1 skip | `0` |

> 빌드 출력에 신규 BFF 라우트 `├ ƒ /api/stock/ai-analysis/decisions` 가 등록됨을 확인. 4개 정적 게이트 모두 통과.

### 공통 AC 무회귀

| 항목 | 명령/근거 | 실측 |
|---|---|---|
| typecheck/lint/build 0 에러 | 위 표 | 통과 |
| BFF 원칙 (`http://127.0.0.1` app/ 내 route handler fallback 외 0건) | `git grep -nE "http://127\.0\.0\.1" -- app/` | 히트 3건 모두 route handler FASTAPI fallback(`whitelist/search`, `workbench/_adapters`) — **본 PR 파일 아님, 기존 예외**. 신규 코드 0건 |
| 클라이언트 `fetch(` 직접 호출 0건 | `git grep -nE "\bfetch\(" -- components/analyze/ hooks/stock/useQueryAIDecisions.ts hooks/stock/useQueryStockNames.ts lib/api/stock/aiAnalysisDecisions.ts` | **0건**. 어댑터는 `httpClient`(axios, same-origin `/api`)만 사용 |
| 한글 톤 무회귀 | `lib/copy/analyze/labels.ts` 신규 라벨 검사 | 사용자 노출 문구 전부 한글. 영문은 `Claude`/`Codex`/`Supabase`/`AI`(고유명사·약어)·env 키 안내뿐 — 위반 0건 |
| hex/px 직타 무회귀 | `git grep -nE "#[0-9a-fA-F]{3,6}|[0-9]+px" -- components/analyze/AIDecision*.tsx AnalyzeTabsContainer.tsx` | hex 0건. arbitrary px는 `py-[2px]`(chip)·`min-h-[160px]`(skeleton)뿐 — 색/spacing 토큰 위반 아니며 기존 코드(`min-h-[120px]`, `py-[2px]`, `max-w-[22rem]` 다수)와 동일 관용 패턴. 회귀 아님 |

---

## 2. 코드 기반 수용 검증 (AC별 재현·기대·실측)

> 실데이터 라운드트립이 불가한 환경이라, 각 AC를 **소스 코드 경로 추적**으로 검증했다. 분기·조건·렌더 클래스를 직접 확인한 결과를 "실측"에 기재.

### AC-1 상위 탭 분리 (분석 결과 ↔ 토큰 사용량)

- **재현**: `/analyze` 진입 → 상위 pill 탭 2개. "분석 결과" 기본 활성, "토큰 사용량" 클릭.
- **기대**: 기본 탭=분석 결과. 탭 전환 시 컨테이너만 교체, 토큰 대시보드는 기존 그대로.
- **실측 (통과)**: `AnalyzeTabsContainer` `useState<AnalyzeTab>("results")` → 기본 results. `role="tablist"` + 각 `role="tab"` `aria-selected`. 활성 탭만 `bg-accent-vivid text-surface`. `tab==="results"` → `AIDecisionListContainer`, else → `AgentUsageContainer`. **`AgentUsageContainer` 는 본 PR diff에 없음(`git diff f088cc9..dd04abd -- components/analyze/AgentUsageContainer.tsx` = 무변경)** → 토큰 대시보드 회귀 없음. `/analyze` page는 `AgentUsageContainer` 직접 렌더 → `AnalyzeTabsContainer` 로 한 단계만 교체.

### AC-2 BFF 토큰 합산 정확성 (`buildTokensByTicker`)

- **기대**: 종목별 created_at **최신 run** 행만 합산. measured=false(codex 등) run은 토큰/비용 `null`.
- **실측 (통과)** — `app/api/stock/ai-analysis/decisions/route.ts` + `agentUsageStore.getAgentUsageRows`:
  1. `getAgentUsageRows` 가 `order=created_at.desc` 로 정렬해 반환(코드 L181) → ticker별 **첫 등장 행의 `runId` = 최신 run**. `buildTokensByTicker` 의 `if (!latestRunByTicker.has(r.ticker))` 가 그 첫 행만 픽 → 최신 run 식별 정확.
  2. `rowsByRun` 로 같은 run의 모든 agent 행 수집 → `runRows` 합산. **다른 run·다른 종목 행 혼입 없음**(run_id 키로 격리).
  3. `measured = runRows.every((r) => r.measured)` → run의 한 행이라도 미측정이면 전체 measured=false. `sum()` 은 `if (!measured) return null` → `totalInputTokens/Output/CostUsd` 모두 null. **codex 미측정 분기 정확.**
  4. 입력 합 = `inputTokens + cacheReadInputTokens + cacheCreationInputTokens`(신규+캐시 읽기+캐시 생성) — 토큰 대시보드 입력 정의와 정합.
  5. `usageRows ?? []`(L84) → usage 조회가 null이어도 fail-soft(빈 맵 → 모든 카드 tokens=null).

### AC-3 카드 토큰 표기 3분기

- **기대**: 토큰 있음 → `총 토큰 12,345 · $0.1234` / measured=false → `측정 안 됨` / tokens=null → `토큰 기록 없음`.
- **실측 (통과)** — `AIDecisionCard.tokenChipLabel`:
  - `!tokens` → `CARD_TOKENS_NONE`("토큰 기록 없음").
  - `!tokens.measured` → `MEASURE_BADGE_UNMEASURED`("측정 안 됨").
  - else → `총 토큰 {fmtTokens(input+output)}` + (`totalCostUsd!==null` 일 때만) ` · {fmtCost}`. `fmtTokens` 천단위 콤마(`toLocaleString("ko-KR")`), `fmtCost` `$x.xxxx`. null 가드(`?? 0`) 존재.

### AC-4 검색 필터 (종목명·코드) + 빈 상태

- **기대**: 입력으로 ticker·종목명 클라이언트 필터. 결과 0건 시 "검색 결과가 없어요".
- **실측 (통과)** — `AIDecisionListContainer.filtered`:
  - `q = query.trim().toLowerCase()`, 빈 q → 전체. 그 외 `it.ticker.toLowerCase().includes(q) || nameOf(it.ticker).toLowerCase().includes(q)` → **코드·종목명 양쪽 매칭**.
  - `filtered.length === 0` → `RESULTS_SEARCH_EMPTY_TITLE`("검색 결과가 없어요") `role="status"` 카드. 검색창은 유지(목록만 빈 상태로 교체) → 재검색 가능.
  - 개수 chip `resultsCount(filtered.length)` 가 필터 반영 개수를 portal로 탭 줄 우측에 표시.

### AC-5 결론 0건 / Supabase 미설정 빈 상태

- **기대**: 미설정 → 연결 안내. 연결됐으나 0건 → "아직 분석한 종목이 없어요".
- **실측 (통과)** — 분기 우선순위 `isLoading → isError/!data → !configured → items.length===0 → 목록`:
  - `!data.configured` → `RESULTS_NOT_CONFIGURED_TITLE/BODY`(Supabase env 안내) `role="status"`.
  - `items.length===0` → `RESULTS_EMPTY_TITLE/BODY` `role="status"`.
  - BFF `getAllAIDecisions` 미설정 시 `[]` 반환 + `configured:false` → 위 미설정 분기로 graceful.

### AC-6 상세 모달 — 추가 페치 없음 + 반응형 + 닫힘

- **기대**: 목록 응답의 `decision`/`sentiment` 로 추가 페치 없이 렌더. 모바일 풀스크린/PC 와이드. Escape·backdrop 닫힘.
- **실측 (통과)** — `AIDecisionDetailSheet`:
  - 추가 fetch/useQuery 없음 → `item.decision`(`FinalVerdictCard`), `item.sentiment`(`SentimentBadge`) 를 props로 직접 렌더. 타입 `AIDecisionListItem extends AIAnalysisDecisionSnapshot` 가 `decision`·`sentiment` 전체 포함 → **추가 네트워크 0**.
  - panel 클래스 `w-full h-full`(모바일 풀스크린) → `sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[56rem] lg:max-w-[64rem] sm:rounded-2xl`(PC 중앙 와이드 + 라운드).
  - Escape: `keydown` 리스너 `e.key==="Escape" → onClose`. backdrop: `motion.div onClick={onClose}`. body scroll lock(`overflow=hidden`) + cleanup으로 복원.
  - `role="dialog" aria-modal="true" aria-label`. 헤더 고정(`flex-none`) + 본문만 스크롤(`flex-1 overflow-y-auto`). 감성 배지 헤더 pin.

### AC-7 접근성 (role/aria/키보드)

- **기대**: 검색·탭·카드·모달 적절한 role/aria. 카드 키보드 오픈(Enter/Space).
- **실측 (통과)**:
  - 탭: `role="tablist" aria-label="AI 분석 화면"`, 각 버튼 `role="tab" aria-selected`.
  - 검색: `SearchInput type="search" aria-label`(placeholder 동일 문구). 좌측 아이콘 `aria-hidden`.
  - 카드: `role="button" tabIndex={0} aria-label="{name} AI 분석 결론 전체 보기"`. `onKeyDown` Enter/Space → `preventDefault` + open. focus-visible ring. 호버 오버레이 `group-focus-visible:opacity-100` 로 **키보드 포커스 시도 동일 노출**. 방향 아이콘 `aria-hidden`.
  - 모달: `role="dialog" aria-modal aria-label`, 닫기 버튼 `aria-label="닫기"`.
  - 새로고침: `aria-label="새로고침"`, 모바일은 아이콘만(텍스트 `hidden sm:inline`)이라 aria-label로 의미 보존.

### AC-8 BFF 안정성 (504/502/fail-soft)

- **기대**: 타임아웃 504(한글 메시지), 기타 오류 502, 부분 실패 fail-soft.
- **실측 (통과)** — `GET` 핸들러:
  - `withTimeout(Promise.all([getAllAIDecisions, getAgentUsageRows]), 5_000)`. `BFF_TIMEOUT_SENTINEL` 매치 → `504` + `Cache-Control: no-store` + 한글 메시지.
  - 그 외 throw → `502` + 한글 메시지.
  - 정상 경로: `usageRows ?? []`, `tokensByTicker.get(ticker) ?? null` → usage 일부/전부 누락도 카드 자체는 렌더(토큰만 빠짐). store 함수들 내부 catch로 `[]`/`null` 반환(fail-soft) → 단일 종목 토큰 갭이 전체 응답을 깨지 않음.
  - 응답 `X-Data-Source`: configured면 `supabase`, 아니면 `supabase-unconfigured`(`jsonWithDataSource`).

---

## 3. 엣지 케이스 / 알려진 한계 (명시)

| # | 항목 | 내용 / 영향 |
|---|---|---|
| E1 | **카드 토큰 = 종목별 "최신 run" 휴리스틱** | `ai_analysis_decisions` 에 `run_id` 컬럼이 없어, 토큰은 `ai_agent_usage` 의 그 종목 **created_at 최신 run** 을 "이 결론의 분석"으로 간주. portfolio_manager 단계 전에 **에러로 끝난 더 최신 run** 이 끼면 카드 토큰이 결론과 불일치할 수 있음. PR 본문 `## 다음 작업` 에 `run_id` 컬럼 추가(ALTER) 후속으로 기재됨. **수용 가능한 알려진 한계.** |
| E2 | **종목명 cold-start 갭** | 종목명은 `useQueryStockNames`(stock.price 쿼리 공유)로 비동기 해석. 이름 로드 전에는 카드/시트가 ticker 폴백(`nameOf` = `names[t] ?? t`), 검색도 **코드 매칭만** 동작(이름 매칭은 로드 후). 데이터 정확성 문제 아님 — UX 지연. PR 본문에 개선 여지로 명시됨. |
| E3 | **usage row limit 1000** | `getAgentUsageRows(1000)`. 분석 누적이 1000행을 넘으면 오래된 종목의 토큰이 합산 누락될 수 있으나, 종목당 1 run × 수~십 agent 행 규모라 MVP 단계에서 비현실적. 한계로만 기록. |
| E4 | **decisions limit 200** | `getAllAIDecisions(limit=200)`(route는 인자 없이 호출 → 기본 200). 분석 종목 200개 초과 시 잘림. 현 단계 비현실적, 한계 기록. |
| E5 | **measured 혼합 run** | 한 run 안에 measured 행과 미측정 행이 섞이면 `every` 규칙상 전체를 "측정 안 됨" 처리(보수적). 부분 합산보다 안전한 선택 — 의도된 설계로 판단. |

---

## 4. 미실행 항목 (로컬 QA 필요) — 정직 기록

이 환경에는 **Supabase 키 / 로컬 claude·codex CLI / KIS 키가 없어** 다음은 **실행하지 못했다**. 머지 전 또는 머지 후 로컬에서 별도 확인이 필요하다.

1. **end-to-end**: 종목 상세에서 실제 AI 종합 분석 1회 실행 → Supabase 저장(`ai_analysis_decisions` + `ai_agent_usage`) → `/analyze` "분석 결과" 탭에 해당 종목 카드(종목명·판정·토큰) 노출 → 카드 클릭 상세 모달 → "토큰 사용량" 탭 회귀.
2. **카드 토큰 교차검증**: 카드 토큰 합이 `ai_agent_usage` 의 해당 종목 **최신 run** 토큰 합과 실제로 일치하는지(E1 휴리스틱이 실데이터에서 어긋나지 않는지).
3. **두 뷰포트 수동 라운드트립**: 모바일 375 / 데스크탑 1280 에서 탭 전환·검색·모달 풀스크린/와이드·새로고침 아이콘 노출(모바일 텍스트 숨김)·hydration. (정적으로 반응형 클래스는 확인됨 — `md:grid-cols-2 lg:grid-cols-3`, panel `sm:`/`lg:` 분기, `hidden sm:inline`.)
4. **DESIGN.md 토큰 라이브 동기화**: 본 PR은 신규 디자인 토큰을 추가하지 않고 기존 토큰 클래스(`bg-accent-vivid`, `text-text-strong`, spacing scale 등)만 소비 → `design:sync` 라이브 검증 비대상.

### 테스트 커버리지 갭(참고)

- `lib/server/ai/__tests__/decisionStore.test.ts` 는 `getLatestAIDecision`/`upsertAIDecision` 만 커버. 본 PR 신규의 **`getAllAIDecisions` · `buildTokensByTicker`(route)** 단위 테스트는 없음. 로직은 코드 추적으로 검증했으나(2장), 휴리스틱 회귀 방지를 위해 후속 단위 테스트 추가를 권장(블로커 아님).

---

## 5. 종합 판정

- 정적 게이트 4종(tsc/eslint/build/vitest) **전부 exit 0**. vitest 264 passed.
- 코드 기반 수용 검증 AC-1~8 **전부 통과**. 토큰 합산 휴리스틱·measured 분기·3분기 토큰 표기·검색·빈 상태·모달 무페치/반응형/닫힘·접근성·BFF 504/502/fail-soft 확인.
- 공통 AC(BFF 원칙·fetch 0건·한글 톤·hex/px) 무회귀. `AgentUsageContainer` 토큰 대시보드 무변경 회귀.
- 알려진 한계(E1 최신 run 휴리스틱, E2 종목명 cold-start)는 PR 본문 `## 다음 작업` 에 후속으로 명시됨 — 수용.
- end-to-end·실데이터 항목은 키 부재로 **미실행, 로컬 QA 필요**로 위임.

**판정: qa-passed** (실패 0건)
