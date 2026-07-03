# QA — intraday-tick-snapshot (단타 틱 판단 정량 스냅샷 영속)

- 실행: 2026-07-03 KST — QA 역할
- 환경: 격리 워크트리(`feature/intraday-tick-snapshot`) + 정적 검증 + 유닛(vitest)
- 대상: PR #209 — 순수 계측(거래 동작 무변경, PRD 없는 경량 플로우)
- 변경 규모: 4파일(타입 2·server provider 1·테스트 1)
- 라이브 브라우저 QA 불가(dev 서버가 다른 브랜치 서빙 + 스케줄러 부팅 고정) → 정적 검증 + 테스트로 대체.
  실적재 확인은 **머지 + dev 재시작 후 모니터링**(AC-4 라이브 항목 PENDING, 아래 명시).

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 타입 형상 | `intradayDecision.ts:147-156` + `paperTrading.ts:57-62` | `IntradaySnapshot{basePrice:number·signal:DecisionSignal·levels:IntradayLevels·structureEvent:string\|null}` + `PaperTradingDecision.intradaySnapshot?`(옵셔널·inline import) | 필드 4개 정확·옵셔널 연결. mock/existing-ai 미설정(주석 명시) | ✅ |
| AC-2 단일 choke point | `intradayCli.ts` 반환경로 grep + 전독 | pre-skip·폴백·정상 **3경로 전부** `finalize()` 경유해 스냅샷 부착 | 반환 3건(515·600·609) 모두 `finalize()` wrap. `toPaperTradingDecision(` 실호출 1곳(509, `finalize` 내부)·항상 snapshot 3번째 인자. 전고돌파 트리거/사전스킵/정상 어느 틱이든 스냅샷 생성됨 | ✅ |
| AC-3 어댑터 전달/미전달 | `toPaperTradingDecision:406-470` + 신규 유닛 2건 | 전달 시 `decision.intradaySnapshot=snapshot` 그대로, 미전달 시 `undefined`(mock 무회귀) | L467 `intradaySnapshot: snapshot`(옵셔널 param 기본 undefined). 유닛 "전달 시 그대로 실림"(`toBe(snap)`·levels.rrr·signal.regime·structureEvent 확인) / "미전달이면 undefined" 2건 통과 | ✅ |
| AC-4 무마이그레이션 round-trip | `persistence.ts` + sessionStore + 세션 상세 API 코드 확인 | tick 을 payload jsonb 통째 저장·하이드레이트, 상세 API 가 tick wholesale 반환 → 별도 스키마/필드 매핑 없이 스냅샷 영속 | 쓰기 `payload: tick`(L118), 하이드레이트 `row.payload` 통째(L174-186), 상세 API `ticks` wholesale + `latestDecision: ticks.at(-1)?.decision`(sessionStore L303-309) → `NextResponse.json(payload)`(route L18). `intradaySnapshot` 은 `tick.decision` 하위라 자동 직렬화·역직렬화 | ✅ (라이브 적재 PENDING) |
| AC-5 회귀 | `tsc --noEmit`·`vitest run`·eslint(변경 4파일) | 0 에러·전체 통과 | tsc exit 0 클린 / vitest **752 passed·3 skipped**(신규 2 포함) / eslint exit 0 클린 | ✅ |

## 검증 명령 실측

```
$ npx tsc --noEmit            → TSC_EXIT=0 (클린)
$ npx vitest run              → Test Files 89 passed | 3 skipped (92)
                                Tests 752 passed | 3 skipped (755)
$ npx vitest run intradayCli.test.ts -t "정량 스냅샷"
                              → 2 passed | 33 skipped
$ npx eslint <변경 4파일>      → ESLINT_EXIT=0 (클린)
```

## 회귀 / 공통 AC

- **BFF 무회귀**: 변경 4파일에 클라이언트 `fetch(` 0건. `intradayCli.ts` 는 서버 provider(`lib/server/`)이며 스냅샷 로직은 순수 객체 조립뿐.
- **한글 톤 무회귀**: 신규 노출 문구 없음. 추가 리터럴 `"전고 돌파 진행"`(기존 structureEvent 값 재사용, 한글) + 타입/코드 주석만.
- **거래 동작 무변경**: 스냅샷은 저장 틱에 얹기만 함 — action/targetPct/orders 계산 경로 무수정(기존 `toPaperTradingDecision` 매핑 유닛 7건 전원 유지).

## 커버리지 노트 / PENDING

- **라이브 스냅샷 적재(AC-4 실측)**: dev 서버가 다른 브랜치 서빙 + 스케줄러 부팅 고정으로 이번 QA 에선 미실시.
  코드상 round-trip 은 확정(무마이그레이션·payload wholesale). **머지 + dev 재시작 후** 새 단타 틱의
  `GET /api/paper-trading/sessions/[id]` 응답에서 `ticks[].decision.intradaySnapshot`(signal·levels·rrr·structureEvent) 채워지는지 1회 모니터링 권장. 이 항목은 fail 사유 아님.
- 스냅샷은 mock/existing-ai provider 경로에 미설정(옵셔널) — 기존 세션 저장/조회 무영향.
