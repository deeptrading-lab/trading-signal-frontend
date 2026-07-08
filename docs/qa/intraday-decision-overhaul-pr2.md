# QA — intraday-decision-overhaul PR-2 (틱 자가채점 루프 + 캘리브레이션 패널, PR #314)

- 실행일: 2026-07-09 / 브랜치: `feature/intraday-tick-labels` / 판정: **qa-passed**
- 자동화: `npx vitest run` **1094 passed | 3 skipped** · `npx tsc --noEmit` 0 에러 · `npm run lint` 0 에러

## AC-9 — 기존 코퍼스 라벨링(멱등 upsert · 버킷 뷰)

| 항목 | 재현 | 기대 | 실측 |
|---|---|---|---|
| WIN/LOSS/동시터치 | `tickLabels.test.ts` 합성 분봉 | TP→WIN·SL→LOSS·같은 봉 양쪽 터치→LOSS(손절 우선) | 통과 — returnPct/exitMinutes 수치까지 단언 |
| 만료 NEUTRAL·15:20 경계 | 15:15 봉까지 미도달 + 15:25 봉 TP 터치 | 15:20 초과 봉 무시 → NEUTRAL(마지막 종가) | 통과 (`EXPIRY_MINUTES`=15:20, 강제 청산 상수에서 파생) |
| 룩어헤드·당일 경계 | 판단 이전/동시각 봉 TP 터치 + 다른 날 봉 | 이후 봉만 채점 / 타일자 UNRESOLVED | 통과 (`date > stamp` 필터로 진행 중 봉 제외) |
| HOLD 반사실 | targetPrice/invalidationPrice null | 스냅샷 levels.tp/sl 로 라벨, tpFrom/slFrom="levels" | 통과 |
| 결정가 우선 | targetPrice=10200 vs 구조 TP=10300 | decision 우선(WIN@10200) | 통과 |
| 멱등 upsert | 2회 실행 + run 라우트 dedupe | `on_conflict=tick_id`+`merge-duplicates` / 라벨된 tick 은 재채점 제외 | 통과 — POST URL·Prefer 헤더·미라벨 틱만 전달 모두 단언(공허 단언 없음) |
| 버킷 뷰 | `bucketizeLabels`·summary 라우트 | 출처×액션 + 점수대 밴드(<40/40~60/60+), avg 는 UNRESOLVED 분모 제외 | 통과 — 경계값 39.9/40/60·numeric 문자열 정규화 포함 |
| 게이트 | routes.test — VERCEL=1 시뮬레이션 | 쿠키없음/user→403, admin→200, 로컬 무세션 통과 | 통과 (세션 서명·검증은 실제 HMAC 경로) |

## 트레이딩 루프 안전성 (전수 diff — 17파일 +2000, 삭제 0)

- 루프 접점 **단 1곳**: `sessionStore.patchPaperTradingSessionStatus` 완료 **전이** 시 `scheduleSessionTickLabeling` — fire-and-forget(`void ... .catch`), 프로세스당 세션 1회 가드, 내부 try/catch never-throw. `runTick`·`decisionProviders/*`·`virtualExecution`·`tickScheduler`·`persistence` **무변경** 확인.
- 그 외 변경 = 신규 파일(엔진·BFF·패널·훅·타입·SQL) + `IntradayWatchWorkspace` 패널 마운트 4줄 + queryKeys/queryConfig 키 추가.
- BFF 무회귀: `git grep "http://127.0.0.1" -- app/` → workbench 어댑터(기존 route handler 폴백)만. 한글 톤·접근성(section aria-label·th 스코프) 무회귀.

## KST 변환 검증 (최우선 버그 클래스) — **정상 판정**

- `kstMinuteStamp`: ISO(UTC) → Intl sv-SE `Asia/Seoul` "YYYY-MM-DDTHH:mm" — 분봉 date(KST 동일 형식, `minuteResample` 버킷 키)와 사전식 비교 정합.
- 실데이터 실측(영속 틱 2,199건 중 5건): `2026-07-07T00:32Z→09:32` 등 5/5 전부 장중(09:00~15:30) KST 로 변환. `todayKstDate`·일자 그룹핑·`minutesOfDay` 모두 같은 KST 스탬프 기준(혼용 없음).

## judgeModel 출처 복원 — **정상 판정**

- `deriveTickLabelSource`: judgeModel 존재→intraday-cli. `intradayCli.withModels` 교차 확인 — judgeModel 은 LLM 성공 경로(`judge:true`)에서만 기록, preGate 스킵·judge 실패 폴백은 미기록. **재시도 회복(recovered:true) 틱도 LLM 산(source="intraday-cli")이라 judgeModel 이 있어 정확히 intraday-cli 로 집계**. 틱은 payload jsonb 통째 영속이라 재수화 후에도 보존.

## 실데이터 드라이런 + fail-soft 스모크

- `labelTick` 순수 워커에 실틱 5건(levels 정합 후보 258/2,199) × 합성 경로 주입: 상승→WIN·하락→LOSS·횡보→NEUTRAL·이전봉만→UNRESOLVED — **5/5 PASS** (returnPct 부호·크기 정합).
- Supabase env 제거: `summarizeLabels`→`configured:false` / `labelSessionTicks`→`skipped:true` / `scheduleSessionTickLabeling` no-throw. 패널은 "저장소 미설정" 문구(코드 확인).
- **실 Supabase(테이블 미생성 — 수동 SQL 대기 확인)**: `fetchLabeledTickIds` HTTP 404 → warnOnce + 빈 Set(never-throw) / `summarizeLabels` throw → 라우트 500 한글 에러 → 패널 에러 문구. 크래시·틱 흐름 영향 0.
- KIS 미설정 skip(UNRESOLVED 오염 방지 — dedupe 영구 스킵 함정 회피)·분봉 페치 실패 UNRESOLVED 영속(KIS 과거 분봉 한계 = 기대 동작) 테스트 통과.

## 관찰(비차단)

- run 라우트: 엔진 전역 skip 시 `remaining` 이 1로 고정(남은 세션 수 과소보고) — skip 조건에선 재실행해도 동일하므로 UX 영향 미미.
- summary 집계 캡 20k행(PAGE_SIZE 1k×20) — 현 코퍼스(~2.2k) 대비 여유, 초과 시 조용한 절단은 주석으로 문서화됨.
- `intraday_tick_labels` 테이블은 아직 미생성 — 머지 후 `docs/sql/intraday-tick-labels.sql` Supabase 수동 1회 실행 필요(PR 본문 다음 작업에 명시).
