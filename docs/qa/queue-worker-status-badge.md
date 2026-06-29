# QA — prod 분석 큐 처리 중 뱃지(S7)

- 대상 PR: #176 (`feature/queue-worker-status-badge`)
- 범위: prod 분석 큐 카드(`ProdAnalysisQueueCard`) 상단의 워커 활동 뱃지(`WorkerActivityBadge`). 경량 UX 폴리시(PRD 없음 — DESIGN `analysis-request-queue.md` S7 스펙 기준).
- 판정: **PASS** (상태 파생 로직·토큰·BFF·a11y·무회귀 검증). 라이브 시각 확인은 Vercel 프리뷰에서 권장(아래 수동 항목).

## 수용 기준별 검증

| # | 기준(S7) | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 워커 busy → "분석 중" | worker-status `{online:true,status:"busy",queueDepth:0}` | `분석 중` + 펄스 점, accent-vivid-soft | `deriveWorkerActivity` → `{kind:"processing",queueDepth:0}` (단위테스트) | ✅ |
| AC-2 | busy + 대기 N>0 → "분석 중 · 대기 N건" | `{busy,queueDepth:3}` | `분석 중 · 대기 3건` | derive `{processing,3}` → 라벨 합성 `분석 중 · 대기 3건` | ✅ |
| AC-3 | idle + 대기>0 → "대기 N건" | `{idle,queueDepth:2}` | `대기 2건`, 정적 점(전이 구간) | derive `{queued,2}` | ✅ |
| AC-4 | 오프라인 선제 안내 | `{online:false}` | `분석 서버 꺼짐`, muted | derive `{offline,0}` → `bg-surface-muted text-text-muted` | ✅ |
| AC-5 | 활동 없음 → 숨김 | `{idle,queueDepth:0}` | 뱃지 미표시(null) | derive `{hidden,0}` → `return null` | ✅ |
| AC-6 | 상태 미수신 fail-soft | 로딩/에러/미설정(data undefined) | 뱃지 숨김, 카드 흐름 무영향 | derive(undefined)=`hidden`; query `retry:0`, sticky data | ✅ |
| AC-7 | prod 한정 마운트(무회귀) | 로컬 `next dev`(NEXT_PUBLIC_VERCEL_ENV 없음) | 뱃지·폴링 없음, 라이브 SSE 경로 그대로 | 뱃지는 `ProdAnalysisQueueCard`(IS_PROD 분기)에서만 마운트 — 로컬 경로 diff 0 | ✅ |
| AC-8 | BFF·폴링 위생 | — | 직접 fetch 0, 언마운트 시 폴링 정지 | `httpClient` 경유 `/api/.../worker-status`; 마운트 스코프 `refetchInterval`(15s), `retry:0`, key 단일 위치 | ✅ |
| AC-9 | 접수 직후 즉시 반영 | enqueue 성공 | 다음 폴링 전 뱃지 갱신 | mutation `onSuccess` → `invalidateQueries(workerStatus)` | ✅ |
| AC-10 | a11y | 스크린리더 | 장식 점 aria-hidden, 15s 폴링 aria-live 스팸 없음 | 점 `aria-hidden`, aria-live 미사용, 가시 텍스트=접근성 이름 | ✅ |
| AC-11 | 토큰 정합 | — | 신규 토큰 0, cn 색-드롭 없음, `text-badge` 타이포 | hex/px 0; `cn(PILL,"…text-primary")`·`(…text-text-muted)` 모두 색+`text-badge` 공존(경험적 확인); DESIGN processing-badge typography 정합 | ✅ |

## 라운드트립 / 게이트

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ (617 passed = 기존 610 + 신규 7, 회귀 0) · `npm run build` ✅
- `deriveWorkerActivity` 단위테스트 7케이스(busy / busy+queue / idle+queue / idle+empty / offline / undefined / 음수 클램프) ✅
- `npx @google/design.md lint docs/design/analysis-request-queue.md` → errors 0, warnings 0 ✅

## 에지 케이스

- 음수 queueDepth → `Math.max(0,…)` 클램프(BE 비정상값 방어). ✅
- 일시적 폴링 실패 → 직전 성공값 유지(sticky, `gcTime` 미override) → 뱃지 깜빡임 없음. ✅
- 첫 분석(이전 결과 없음) 중 → decision 없이도 카드/뱃지 정상(빈 인트로 + 활동 뱃지). ✅

## 수동 시각 확인(권장 — Vercel 프리뷰)

로컬은 `NEXT_PUBLIC_VERCEL_ENV` 부재로 prod 분기가 안 뜨므로, 프리뷰 또는 `NEXT_PUBLIC_VERCEL_ENV=preview npm run dev` 로:
1. 워커 끔 → 종목 AI 패널 진입 → `분석 서버 꺼짐` 뱃지(muted).
2. 워커 켜고(`npm run all`) 다른 종목 분석 중 진입 → `분석 중`(+대기 시 `· 대기 N건`), 펄스 점.
3. 분석 요청 직후 → 즉시 `대기 1건`, 워커가 집으면 `분석 중`.
4. 워커 idle·빈 큐 → 뱃지 없음(카드 정상).

## 다음 작업

- **전역 큐 카드(/analyze)** — slack/로컬/prod 분석 요청을 기존 `ai_analysis_decisions` 테이블에 status로 통합 적재 → /analyze에서 종목별 분석중/대기중/완료 카드. 별도 PRD(통합 방향 확정).
- 뱃지 타이포 spec 정합 위해 `text-badge` 적용 완료 / DESIGN line 258 `.badge-info` 내부 불일치 정정 완료.
