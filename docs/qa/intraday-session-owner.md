# QA — intraday-session-owner (PR #326)

세션 소유자(operator) 구분 + 소유자별 틱/마감/복구 게이트 + 배지·"내 세션만" 필터. 워크트리 `feat/intraday-session-owner`.

## 자동 검증 (실측)
- `npx vitest run` → **1206 passed / 3 skipped** (라이브 백테스트 3건 skip). 신규 14건 통과.
- `npx tsc --noEmit` → exit 0 (clean).
- `npx eslint .` → exit 0 (clean).
- ⚠️ Turbopack 이 심볼릭 node_modules 를 거부 → 라이브 dev 브라우저 드라이브 생략. 로직은 vitest/tsc/eslint + 코드 리딩으로 검증(PR 명시와 정합).

## AC-1 이중틱 게이트 — `selectSchedulableSessions(sessions, me)` 진리표
| owner \ 상태·provider | running·cli-agent | running·mock | paused/completed |
|---|---|---|---|
| owner === me(내 서버) | **포함** | 제외(provider) | 제외(status) |
| owner === 다른 운영자 | **제외** | 제외 | 제외 |
| owner 미지정(레거시) | **포함**(하위호환) | 제외(provider) | 제외(status) |
- 필터식: `status==="running" && decisionProvider==="cli-agent" && (!owner || owner===operator)`. 코드·테스트(tickScheduler.test.ts 3케이스, operator 주입 포함) 일치.
- **단일 초크포인트 확인**: 세 경로 모두 `selectSchedulableSessions(await listPaperTradingSessions())` 통과 →
  - `runScheduledIntradayTicks`(틱) · `closeOutRunningSessionsAtClose`(마감 완료) · `closeOutStaleCrossdaySessions`(크로스데이 복구).
  - closeOut 게이트 테스트 실측: mine+legacy 2건만 completed, friend-op 세션은 running 유지 → **서버 A 가 서버 B 세션을 마감/복구 안 함** 확인.
- **프로덕션 호출부**: 진입점은 `instrumentation.ts → startIntradayTickScheduler` 하나. `cycle()` 이 세 함수를 인자 없이 호출 → 전부 default `operator = resolveServerOperator()` 로 일관 해석. 다른 operator 주입 경로 없음.

## AC-2 소유자 스탬프 / 멱등
- `createPaperTradingSession` 새 세션에 `owner: resolveServerOperator()` 스탬프(전 provider, mock 은 무해). 테스트 실측: `owner === resolveServerOperator()`.
- 멱등 재사용 가드(같은 종목·오늘·running)는 신규 객체 생성 **전** `return toDetail(existing)` → 기존 owner 보존. 테스트: friend-op 세션 재요청 시 id/owner 그대로 유지(덮어쓰기 없음).

## AC-3 operator.ts 해석
- env `INTRADAY_OPERATOR`(trim) 우선 → `os.hostname()` 폴백 → `"local"` 최후. 64자 컷. 4개 테스트(공백·미설정·공백뿐·100자→64) 통과. env 이름 정확 일치.
- 서버 전용: import 3곳(route.ts·tickScheduler·sessionStore) 전부 서버 파일, `use client` 0. 클라 컴포넌트(Workspace/Table)는 `os`/operator 미import — API 응답 `currentOperator` 로만 수신. `os` 클라 번들 누출 없음.

## AC-4 배지 / 필터 (UI)
- 배지: 내 세션=`나`(accent-soft/accent-vivid) · 다른 서버=운영자 라벨(surface-muted, `max-w-[6rem] truncate`) · 미지정/무세션=미표시. 토큰 기반(rounded-pill/px-xs/text-caption), raw hex·px 0건(`[6rem]` 은 rem = max-width 함정 권장 패턴).
- 필터 "내 세션만": 다른 운영자 소유 행만 제거(내 세션·미지정·세션없는 워치행 유지). `isForeignOwnedSession` 5케이스 테스트 통과. 기본 OFF, localStorage(`finsight:intraday-mine-only`). 토글은 `hasForeignSessions` 일 때만 노출(단독 운영 시 UI 무변경). `aria-pressed`·`type=button`·title 접근성 정합.

## 무회귀
- 하위호환: `currentOperator` 미상(구 응답/미로드) → `isForeignOwnedSession` 항상 false → 아무것도 안 숨김 + 토글 숨김 + 배지 미표시. 크래시 없음(hook `?.` 접근).
- 레거시(미지정) 세션은 여전히 own-or-unowned 규칙으로 **양쪽 서버가 계속 이중 틱**(설계 의도 — 스탬프된 세션만 격리됨). 정확 귀속은 payload.owner 백필 필요.
- PR #325 지연 시세(`collectTickersForDateKeys`+`enabled`)·controlled-expand(`pastExpandOverride`/`expandedPastDateKeys`) 리팩터 유지, 필터는 `visiblePastView` 로 감쌀 뿐 revert 없음.
- BFF: `git grep 127.0.0.1 -- app/` 신규 위반 0(기존 route-handler fallback만). 한글 톤·거래 판단 로직 무변경.

## 롤아웃 안전성
- 두 서버 모두 배포+재시작+각자 세션 스탬프 후에야 상대 서버가 서로의 세션을 스킵 → 이중 틱 해소. 한쪽만 배포 시 여전히 이중 틱(PR 롤아웃 주의와 정합).

## 판정
- 자동/코드/테스트 전부 통과 → **qa-passed**. 실패 0건.
