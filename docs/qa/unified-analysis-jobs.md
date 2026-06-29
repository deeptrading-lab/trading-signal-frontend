# QA — unified-analysis-jobs (모든 소스 인플라이트 카드 + queue 전 소스 트래커)

- 대상 PR: #177 (`feature/unified-analysis-jobs`)
- PRD: `docs/prd/unified-analysis-jobs.md` (§9 OPEN QUESTION 7건 RESOLVED)
- 판정: **PASS (코드·게이트·스모크 검증)**. 데이터가 필요한 일부 AC(AC-2/3/6)는 **SQL 마이그레이션 + 분석 1회 실행 후 라이브 E2E** 가 잔여(아래 명시) — fail-soft 라 미적용 상태에서도 무회귀.

## 게이트
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run test` ✓ (623 = 기존 617 + 신규 6) · `npm run build` ✓
- **라이브 스모크**(dev :3000, HMR 반영): `GET /api/stock/ai-analysis/decisions` → HTTP 200, `configured:true`, `items:31`(무회귀), **`inflight:[]` 필드 존재**, `items[0].reanalysis:null`. → 합성 경로 동작 + **`source` 컬럼 미적용 상태 fail-soft** 확인.

## 수용 기준별 검증

| # | 기준 | 검증 | 판정 |
|---|---|---|---|
| AC-1 | queue `source` 멱등·무손실 / decisions 무변경 | `ai-analysis-queue.sql` 에 `source`(default 'prod', `add column if not exists`) 추가, `ai-analysis-decisions.sql` diff 0 | ✅ 검토 |
| AC-2 | 로컬/봇 직접 실행이 queue 행 생성 | 핸들러 `startProcessing`(jobId 없음 → active 재사용/신규 insert, `source='local'`, owned=true). 코드+추론 | ✅ 코드 / ⏳ 라이브(마이그레이션 후) |
| AC-3 | 중복 행 방지(prod 워커) | 워커가 `jobId`·`source:'prod'` 동봉 → `startProcessing` 재사용(owned=false), 종결은 워커만. ticker 활성 1행·1회 종결 | ✅ 코드 / ⏳ 라이브 |
| AC-4 | 두 테이블 합성(/analyze) | `mergeActiveJobs` 순수 함수 단위테스트 6케이스(재분석중→reanalysis / 결과없음→플레이스홀더 / 중복 dedup / 혼합) + 라이브 스모크(inflight 필드) | ✅ |
| AC-5 | 첫 분석 플레이스홀더 — 결과 reader 무회귀 | `InflightCard` 분리(verdict 미참조). `decisionStore` 시그니처·동작 변경 0(typecheck). `AIDecisionCard` 는 완료 결과 있을 때만 verdict | ✅ |
| AC-6 | 재분석 중 이전 결과 유지 | decisions 는 PM 완료 때만 upsert(현행 무변경) → 진행 중 이전 verdict 유지 + `reanalysis` 배지 | ✅ 코드 / ⏳ 라이브 |
| AC-7 | 로컬 라이브 SSE 무회귀 | 실행 경로·SSE·세마포어 acquire/release·요청 격리 무변경. queue 기록은 부가·fail-soft. 격리 회귀 테스트 포함 623 통과 | ✅ |
| AC-8 | fail-soft / 미설정 | 라이브 스모크: `source` 컬럼 없이도 BFF 200 + `inflight:[]`. `getActiveJobs`·`startProcessing` try/catch → []/no-op | ✅ |
| AC-9 | 폴링 — 인플라이트 있을 때만 | `useQueryAIDecisions.refetchInterval` 함수: `hasInflight(data)` 면 15s, 아니면 false | ✅ 검토 |
| AC-10 | stuck 복구 | `recoverStuck`(20분) 무변경. owned 행은 finally 에서 항상 종결(processing 영구 잔류 0 → 워커 재투입 부작용 차단) | ✅ 검토 |
| AC-11 | 디자인·컨벤션 정합 | 신규 토큰 0·hex/px 0. 인플라이트 배지는 plain className(cn 색-드롭 무관). httpClient BFF. 도메인훅→query훅 계층. lint 통과 | ✅ |

## 중복 방지 불변식(핵심) — 정적 검증
- **prod**: 워커 `claimNextPending`(processing 1행) → `runAnalysis(…, job.id)` body 에 `jobId`+`source:'prod'` → 핸들러 `startProcessing(jobId)` = `{jobId, owned:false}`(DB 무수정) → 워커가 `markDone`. 핸들러는 prod 경로에서 신규 insert·종결 0.
- **로컬/봇**: 핸들러 `startProcessing`(jobId 없음) → active 재사용 or insert `{owned:true}` → finally 에서 `markDone`(성공·중지) / `markFailed`(실제 에러). 워커 무관.
- **중지(AbortError)**: `jobFailed=false` 유지 → `markDone` 으로 종결(failed 아님, recoverStuck 재투입 방지).

## 라이브 E2E (병합 후 — SQL 적용 선행)
1. **Supabase SQL Editor 에서 `docs/sql/ai-analysis-queue.sql` 의 `source` alter 1회 실행.**
2. `npm run all` (dev + 워커).
3. 로컬에서 종목 분석 시작 → `/analyze` 에 해당 종목 인플라이트(분석 중) 카드 → 완료 시 결과 카드로 전환(AC-2/4/6).
4. prod 에서 요청 → 워커가 처리 → `/analyze` 인플라이트(대기 중→분석 중) → queue 활성 행 1건(중복 없음, AC-3).
5. 인플라이트 없을 때 `/analyze` 폴링 정지 확인(네트워크 탭, AC-9).

## 에지/리스크
- `source` 컬럼 미적용 기간: `getActiveJobs`/`startProcessing` fail-soft(인플라이트 미표시, 분석·결과 카드 정상). 배포 전 SQL 적용 권장.
- 봇 핸들러 비경유 시(q1 미확정): 봇 인플라이트만 미표시(graceful), prod·로컬 정상.

## 다음 작업
- 위 라이브 E2E(SQL 적용 후) · 봇 경유 확정(q1) · retention(q5) · 인증(q7) · 완료 Slack 알림 — PRD §9/§4 후속.
