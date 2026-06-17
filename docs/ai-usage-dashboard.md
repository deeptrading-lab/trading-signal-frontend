# AI 분석 토큰 사용량 대시보드 — 작업 인수 문서

> 브랜치: `feature/ai-usage-dashboard`
> 목적: **AI 종합 분석의 분석가(agent)별 토큰 사용량을 측정·누적하고, `/analyze` 대시보드에서 보며 "토큰을 줄일 최적화 포인트"를 찾는다.** 모니터링은 그에 수반된다.

이 문서 하나로 (1) 무엇이 만들어졌는지 (2) Supabase 셋업 (3) Codex 토큰 캡처 구조를 모두 따라갈 수 있다.

---

## 1. 전체 그림

```
[로컬에서 분석 실행]  POST /api/stock/ai-analysis        ← claude/codex CLI를 직접 spawn (로컬 전용)
  runId = crypto.randomUUID()                            ← 분석 1회(12 agent)를 묶는 키
  각 agent 완료 시 → recordAgentUsage(...)               ← fail-soft append (실패해도 분석 안 멈춤)
        ↓
  Supabase  public.ai_agent_usage  (이력 테이블, append-only)
        ↑
[대시보드에서 조회]  GET /api/stock/ai-analysis/usage    ← Supabase 읽기 전용 → prod(Vercel)에서도 동작
  /analyze 페이지 → provider별 평균/입력분해/캐시히트율 차트·표
```

핵심 포인트
- **분석 실행은 로컬 전용**(claude/codex CLI를 자식 프로세스로 실행 → Vercel에서 막혀 있음). 하지만 **결과(토큰)는 공유 Supabase로** 가므로, 나·동료 둘 다 인터넷 버전 대시보드에서 같은 데이터를 본다.
- **claude는 토큰과 비용을 제공**하고, **codex도 `exec --json`의 turn usage로 input/output/cache를 측정**한다(비용은 CLI 이벤트에 없어 null).
- 저장소는 기존 Supabase 연결(`lib/server/ai/decisionStore.ts`가 쓰던 것)을 그대로 재사용 → 새 인프라 없음.

---

## 2. 무엇이 만들어졌나 (코드)

### 토큰 캡처
| 파일 | 변경 |
|---|---|
| `lib/types/stock/aiAnalysis.ts` | `AgentUsage` 인터페이스 + `UNMEASURED_USAGE` 폴백 추가 |
| `lib/server/claudeAgent.ts` | CLI `result` 이벤트에서 `usage`·`total_cost_usd`·모델명 추출. 반환을 `Promise<string>` → `Promise<AgentStreamResult{text, usage}>` 로 확장 |
| `lib/server/ai/agentCli.ts` | `invokeAgentCliStream` 반환 동일 확장. claude는 usage 통과 / codex는 JSONL의 최종 본문·turn usage 파싱 |
| `app/api/stock/ai-analysis/route.ts` | `runId` 생성, `STAGE_BY_AGENT` 단계 매핑, `runOneAgent` 완료 시 `recordAgentUsage(...)` |
| `lib/prompts/stock/aiAnalysis.ts` | `runDebateLoop`에 `runId`·`ticker` 전파 → bull/bear 발화별 `recordAgentUsage(..., stage:"B", round)` |

### 저장
| 파일 | 역할 |
|---|---|
| `docs/sql/ai-agent-usage.sql` | 이력 테이블 DDL (**손으로 1회 실행 필요 — §4**) |
| `lib/server/ai/agentUsageStore.ts` | `recordAgentUsage`(append, fail-soft) / `getAgentUsageRows`(조회) / `isAgentUsageStoreConfigured` |

### 조회·대시보드
| 파일 | 역할 |
|---|---|
| `app/api/stock/ai-analysis/usage/route.ts` | BFF 집계 — Supabase raw 이력 → provider/agent별 평균. **Vercel 가드 없음**(prod 읽기 동작) |
| `lib/types/stock/agentUsage.ts` | 집계 응답 타입(`AgentUsageSummary`, `AgentUsageRow`) |
| `lib/api/stock/agentUsage.ts` · `hooks/stock/useQueryAgentUsage.ts` | 클라이언트 어댑터 + TanStack Query 훅 |
| `hooks/query/queryKeys.ts` · `lib/query/queryConfig.ts` | 쿼리 키·TTL 추가 |
| `lib/copy/analyze/labels.ts` | 한글 카피 |
| `components/analyze/*` | 화면 — `AgentUsageContainer`(상태 분기) + 지표카드/막대/추세/테이블 |
| `app/(main)/analyze/page.tsx` | 워크벤치 → 토큰 대시보드로 교체 (워크벤치 코드는 보존) |
| `components/layout/navItems.ts` · `Sidebar.tsx` · `BottomNav.tsx` | "AI 분석" 메뉴를 `/analyze` 활성 링크로 승격, "준비 중" 항목 폐기 |

### 대시보드 뷰 (최적화 관점)
- **단계별 입력 토큰 추세** ★ — `market`→…→`portfolio_manager` 순서로 평균 총 입력을 이어 그린다. 뒤 단계 agent일수록 앞 리포트가 누적돼 입력이 커지는지 한눈에 보임. **가장 큰 지점이 1순위 절감 대상**(예상: PM/trader).
- **분석가별 평균 토큰 막대** — 입력(신규+캐시 stacked) + 출력. 막대가 길수록 절감 여지 큼.
- **지표 카드** — 분석 1회 평균 비용 / 평균 입력·출력 합 / 캐시 적중률.
- **분석가별 상세 테이블** — 정렬 가능(기본 총 입력 desc). usage 누락 행은 "측정 안 됨" 배지.
- **provider 탭** — Claude / Codex 분리. 측정 데이터가 없을 때만 미측정 안내 배너.

---

## 3. Codex 토큰 캡처

멀티에이전트 분석의 codex 호출은 `lib/server/ai/agentCli.ts`의 `buildAgentCliInvocation`에서
```
codex … exec --json --ephemeral --ignore-user-config --skip-git-repo-check --color never -
```
형태로 부르고 JSONL을 줄 단위로 파싱한다.

- 최종 본문: `item.completed` 이벤트의 `item.type="agent_message"` / `item.text`
- 토큰: `turn.completed` 이벤트의 `usage.input_tokens` / `cached_input_tokens` / `output_tokens`
- 저장 시 `input_tokens`는 전체 입력에서 캐시 입력을 뺀 신규 입력, `cache_read_input_tokens`는 캐시 입력으로 기록한다.
- 비용은 현재 Codex CLI 이벤트에 없으므로 `cost_usd=null`이다.
- JSON 파싱 실패나 usage 누락 시 본문을 보존하고 `measured:false`로 폴백한다.

> ⚠️ 주의: claude 경로(`invokeClaudeAgentStream`)는 건드리지 말 것. codex 분기만 수정한다. 텍스트 추출 회귀가 나면 분석 결과 품질이 깨지므로, 변경 후 codex 분석 본문이 정상인지 꼭 눈으로 확인.

---

## 4. Supabase에서 해야 할 것 (1회 셋업)

### 4-1. 테이블 생성
Supabase 프로젝트 → **SQL Editor** → `docs/sql/ai-agent-usage.sql` 내용을 붙여넣고 실행.

- `public.ai_agent_usage` 테이블 + 인덱스 4개가 생성된다.
- 기존 `ai_analysis_decisions`와 **같은 프로젝트·같은 키**를 쓴다. RLS를 활성화하고
  정책은 두지 않아 anon/authenticated 접근을 차단하며, 서버의 service role만 접근한다.
- 이미 만들었으면 `create table if not exists`라 재실행해도 안전.

### 4-2. 환경변수 확인
로컬 `.env.local`(또는 분석을 돌리는 환경)에 아래가 있어야 토큰이 쌓인다. **이미 AI 분석 결론 저장(`decisionStore`)이 쓰던 키와 동일** — 보통 추가 설정 불필요.
```
SUPABASE_URL=...                  # 또는 NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=...
```
- 미설정이어도 분석은 정상 동작한다(토큰 저장만 skip — fail-soft).
- 대시보드 BFF도 같은 키로 읽는다. prod(Vercel) 환경변수에도 동일 키가 있어야 인터넷 버전 대시보드가 데이터를 보여준다.

### 4-3. 테이블 스키마 요약
| 컬럼 | 의미 |
|---|---|
| `run_id` (uuid) | 분석 1회를 묶는 키 (12 agent가 같은 run_id) |
| `agent_key` | 분석가 식별자 (bull/bear는 라운드별 다중 행) |
| `stage` | `A`=분석가 · `B`=토론 · `C`=매니저 체인 |
| `round` | 토론 라운드(1·2), 그 외 null |
| `provider` / `model` | `claude`/`codex` / 실제 모델명 |
| `measured` | false면 토큰 미측정(codex) — 평균 집계에서 구분 |
| `input_tokens` | 신규 입력(캐시 비적중) |
| `cache_read_input_tokens` / `cache_creation_input_tokens` | 캐시 적중/생성(claude 전용) |
| `output_tokens` / `cost_usd` | 출력 / 이번 호출 비용 |

> 평균/그룹바이는 모두 BFF(`usage/route.ts`)에서 JS로 처리하므로, Supabase에 view/RPC를 따로 만들 필요는 없다.

---

## 5. 로컬에서 동작 확인 (end-to-end)

1. §4 완료(테이블 생성 + env).
2. `npm run dev` 기동.
3. 아무 종목이나 **AI 종합 분석을 claude로 1회 실행**. 콘솔에서 12 agent + 토론 2라운드 완료 로그 확인.
4. Supabase에서 확인:
   ```sql
   select agent_key, stage, input_tokens, cache_read_input_tokens, output_tokens, cost_usd
   from ai_agent_usage
   where run_id = '<콘솔 로그의 runId>'
   order by created_at;
   ```
   → 14행 내외(분석가 4 + bull·bear ×2라운드 + 매니저 체인 6). claude면 토큰이 채워짐.
   → **`portfolio_manager`의 입력이 가장 큰지** 확인 — 후단 누적 가설 검증, 첫 최적화 포인트.
5. `/analyze` 진입(사이드바 "AI 분석") → claude 탭에서 막대·단계별 추세·캐시 히트율·정렬 테이블이 방금 run으로 렌더되는지.

빌드 검증: `npx tsc --noEmit` · `npm run lint` · `npm run build` 모두 통과 확인됨.

---

## 6. 알려진 제약 / 주의

- **codex 비용 미측정** — Codex CLI JSONL은 토큰은 제공하지만 비용은 제공하지 않아 `cost_usd`가 null이다.
- **"분석 1회 평균 비용" 카드는 근사치** — 분석가별 평균을 합산하므로 bull/bear(라운드당 2회)가 1회로 계산돼 약간 과소. 정확한 per-run 총비용이 필요하면 후속으로 BFF에 `sum(cost)/runCount`를 추가하면 됨. **분석가별 표/차트는 정확**(per-호출 평균)하므로 최적화 판단에는 문제 없음.
- **prod 대시보드는 Supabase 스냅샷** — 분석 실행은 로컬에서만 되므로, prod에서 보이는 데이터는 누군가 로컬에서 돌려 Supabase에 쌓인 분량이다(라이브 아님). 최적화 목적엔 충분.
- **워크벤치 보존** — 기존 `/analyze` 워크벤치(FastAPI signal)는 `components/workbench/*`·`hooks/workbench/*`·`app/api/workbench/*`에 그대로 남아 있고 라우트만 교체됐다.
