# QA — intraday-auto-close-session (장 마감 15:40 후 running 단타 세션 자동 완료)

- 실행: 2026-07-03 KST — QA 역할
- 환경: 격리 워크트리(`feature/intraday-auto-close-session`) + 정적 검증 + 유닛(vitest)
- 대상: PR #210 — 동작 추가(기존 틱/체결 로직 무변경, PRD 없는 경량 플로우)
- 변경 규모: 5파일(순수 유틸 1·server 스케줄러 1·copy 1·테스트 2) — commit `6f0c72a`
- 라이브 브라우저 QA 불가(dev 서버가 다른 브랜치 서빙 + 스케줄러 부팅 고정) → 정적 검증 + 유닛 + 애드혹 유닛으로 대체.
  실세션 자동 완료 확인은 **머지 + dev 재시작 후 15:41 KST 모니터링**(AC-2 라이브 항목 PENDING, 아래 명시).

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 `isKstAfterMarketClose` 경계 | `kstMarketHours.ts:51-54` + 신규 유닛 10건 | 평일 15:41 true · 15:40 false(유예와 배타) · 10:00 false · 08:00(프리마켓) false · 토 false. `>15*60+40` 초과 판정 | `mins > 15*60+40` 확인. 유닛 10건 전원 통과: 15:41→true·21:00→true·15:40→false·10:00→false·08:00→false·토15:41→false + `withCloseGrace(15:40)=true·afterClose(15:40)=false / withCloseGrace(15:41)=false·afterClose(15:41)=true`(상호 배타 케이스) | ✅ |
| AC-2 `closeOutRunningSessionsAtClose` 게이트·전환 | `tickScheduler.ts:103-122` + 유닛 4건 + 애드혹 유닛 2건 | 장중·프리마켓·주말·중첩→-1 / 마감 후 대상 없음→0 / 마감 후 running cli-agent→completed 전환+count | 게이트 유닛 통과: 10:00·08:00·토15:41→-1, 15:40(유예 경계)→-1, 15:41 빈 스토어→0. **애드혹 유닛**(store 함수 mock, 커밋 안 함) — 15:41 에 running cli-agent 2건만 `patch(id,"completed")` 2회 호출·count=2, 장중은 -1·patch 0회 확인 | ✅ (실세션 라이브 PENDING) |
| AC-3 시간대 배타성(틱↔종료) | `runScheduledIntradayTicks:70-88` vs `closeOutRunningSessionsAtClose:103` + cycle `134-139` | 틱=`withCloseGrace`(09:00~15:40), 종료=`afterClose`(>15:40) — 동시 발화 불가. 마감 후 틱 경로는 항상 -1 | 두 게이트 분리 확인. 유닛 "마감 후 시각이어도 틱 경로는 항상 -1(21:00 KST)" 통과. `cycle()`이 매 사이클 틱+종료 둘 다 호출하나 게이트 배타라 한쪽만 일함(다른 쪽 -1). 나머지 하나는 `cycleRunning`/`closeOutRunning` 독립 플래그로 중첩 차단 | ✅ |
| AC-4 안전(열린 포지션·비대상 세션) | `constants.ts:49` + `selectSchedulableSessions:42-46` + 애드혹 유닛 | 15:20 전량 청산 뒤라 종료 시 오픈 포지션 없음 / paused·mock·completed 세션은 종료 대상 아님 | `PAPER_TRADING_CLOSE_FLATTEN_HHMM="15:20"` — 종료 게이트(>15:40)보다 21분 앞서 flatten. `selectSchedulableSessions`=`running && cli-agent`만. 애드혹 유닛에서 paused·completed·mock 3건 **미전환**(patch 미호출) 확인 | ✅ |
| AC-5 회귀 | `tsc --noEmit`·`vitest run`·eslint(변경 5파일) | 0 에러·전체 통과 | tsc exit 0 클린 / vitest **769 passed·3 skipped** / eslint exit 0 클린 | ✅ |

## 검증 명령 실측

```
$ npx tsc --noEmit
  → exit 0 · 출력 0줄 (클린)

$ npx vitest run
  → Test Files  91 passed | 3 skipped (94)
    Tests      769 passed | 3 skipped (772)      # 3 skip = __live__ 백테스트(항시 skip)
  → 신규/변경 테스트파일:
      lib/utils/__tests__/kstMarketHours.test.ts        (10 tests) ✓
      lib/server/paperTrading/__tests__/tickScheduler.test.ts (8 tests) ✓  # +4 종료 게이트 케이스

$ npx eslint <변경 5파일: kstMarketHours(.test)·tickScheduler(.test)·intradayRead>
  → exit 0 (클린)
```

## 에지 케이스

- **dev 서버가 마감 시점에 다운**: 종료를 놓친 세션은 다음 거래일 장중 재틱 후 그날 15:41 에 완료됨. PR 본문이 알려진 후속(startedAt 과거일 가드 검토)으로 명시 — 현 스코프상 결함 아님.
- **공휴일 15:41**: `kstMinutesOfWeekday`는 공휴일 인지 못함(주석 명시 fail-soft). 공휴일에도 평일이면 running 세션을 completed 처리 — 단타=하루 1세션 취지상 무해(오버나잇 잔존 방지). 회귀 아님.
- **자정 "24" 경계**: `hour % 24` 정규화 유지(기존 `isKstMarketHours` 로직 재사용). 21:00~자정 야간대 afterClose=true 확인(유닛).
- **개별 세션 patch 실패**: `try/catch`로 세션별 격리 + `log.warn` — 한 건 실패가 나머지 종료를 막지 않음(애드혹으로 mock reject 시나리오까진 미검증이나 코드 경로 확인).
- **사이클 중첩**: `closeOutRunning` 독립 부울 가드로 앞 스윕 미완 시 다음 발화 스킵.
- BE 다운/malformed JSON/StrictMode/Tailwind preflight 등 UI·BFF 에지: **해당 없음**(서버 인프로세스 스케줄러 로직 + copy 문자열 1줄, 페치/렌더 경로 무변경).

## 회귀 / 공통 AC

- **BFF 무회귀**: 변경 5파일에 클라이언트 `fetch(`·`http://127.0.0.1` 0건. `tickScheduler`·`kstMarketHours`는 서버/순수유틸, copy 는 상수 문자열.
- **한글 톤 무회귀**: 신규 노출 문구 = `intradayRead.ts:89` "… · 15:40 세션 자동 완료(다음 날 새로 시작)" 1건(한글·토스톤 유지). 나머지는 코드/주석.
- **거래 동작 무변경**: 틱·체결 경로(`runScheduledIntradayTicks`·`runPaperTradingSessionTick`·virtualExecution) 무수정 — 기존 유닛(runTickIntraday 3·validateCreateSession 8·intradayCli 35 등) 전원 유지.
- **접근성**: UI 컴포넌트 변경 없음(해당 없음).

## 커버리지 노트 / PENDING

- **실세션 라이브 자동 완료(AC-2 실측)**: dev 서버가 다른 브랜치 서빙 + 스케줄러 부팅 고정으로 이번 QA 미실시. 게이트+전환 로직은 유닛 6건(커밋 4 + 애드혹 2)으로 확정. **머지 + dev 재시작 후** 15:41 KST 에 running 단타 세션이 `completed` 로 바뀌고 워치 표에서 내려가는지(✕ 제거 가능) 1회 모니터링 권장. 이 항목은 fail 사유 아님.
- 애드혹 유닛(store mock)은 QA 검증용 임시 파일로 실행·확인 후 삭제 — 리포지토리에 커밋하지 않음(기존 tickScheduler 테스트 철학=게이트+빈스토어 유지).
