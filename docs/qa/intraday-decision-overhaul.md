# QA — intraday-decision-overhaul

PRD: `docs/prd/intraday-decision-overhaul.md` (PR 시리즈 — 본 문서에 PR별 절 누적)

## PR-0 실패 관측성 (2026-07-09)

- 대상: PR #307 — `decideIntradayWithCli` 에이전트 CLI 실패 진단(`agentDiagnostics`) 캡처. 행동 변경 없음(관측 전용).
- 변경 파일: `intradayCli.ts` + 타입 2파일 + 테스트 1파일 + PRD (diff stat 5파일 — UI·라우트·게이트 무접촉).

### 자동 검증 수치

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | 0 에러 (exit 0) |
| 전체 테스트 | `npx vitest run` | **1053 passed** / 3 skipped (124 파일 passed) |
| 신규 진단 테스트 | `npx vitest run .../intradayCliDiagnostics.test.ts` | 6/6 passed |

### AC 별 검증 (PRD §5 AC-1~4)

| # | 재현 (CLI 스텁) | 기대 | 실측 |
|---|---|---|---|
| AC-1 | 양 에이전트 빈 응답 ×2 | 폴백 결정 + `judge={failureKind:"empty",attempts:2}` + 실패 usage 보존 + rawTextHead 없음 + judgeModel 미기록 | PASS — `intraday-fallback` + gateAdjustments 문구 + `usage.measured===true` + `judgeModel undefined` 전부 단언 통과 |
| AC-2 | 비-JSON 응답(>2048자) | `failureKind:"parse"` + rawTextHead ≤2KB 절단 보존 | PASS — `rawTextHead.length===2048` + 원문 머리 일치 단언 통과 |
| AC-3 | 1차 파싱 실패 → 2차 성공 | 정상 결정(`intraday-cli`) + `recovered:true` + 원문 보존 + judgeModel 기록 | PASS — rationale 에코 + `attempts:2, recovered:true` + rawTextHead 보존 + `judgeModel` 정의됨 |
| AC-4 | 전부 성공 | `agentDiagnostics` 미기록(행동·payload 무변경) | PASS — `toBeUndefined()` + 성공 경로 positive 단언(judgeUsage·analystNote) 동반 → 비공허 확인 |

- 추가 커버(테스트 파일 내): 판단가 타임아웃 예외 → `failureKind:"timeout"` + errorMessage / parse→empty 재시도 병합 시 앞선 rawTextHead 이월 보존 — 모두 통과.
- 테스트 비공허성 코드 리딩 확인: 모든 단언이 구체값 매칭(`toMatchObject`·`toBe(2048)`) — 진단 미기록 시 실패하는 구조. AC-4 는 부정 단언 + 성공 경로 positive 단언 동반.

### 에지 케이스 (코드 리딩)

| 항목 | 결과 |
|---|---|
| (a) preGate 스킵 경로(LLM 미호출) | PASS — `intradayCli.ts:553` 조기 return 이 `withDiagnostics` 정의·에이전트 호출보다 앞 → 진단 부착 불가능 구조 |
| (b) 행동 무변경 | PASS — `git diff main...HEAD -- lib/` 전수 검토: 추가만(신규 optional 필드 기록·지역변수·wrapper). `evaluatePreGate`·`applyPostGate`·`finalize`·`withModels`·주문/게이트/결정 필드 무접촉. 기존 `judgeUsage` 배선(성공 시에만 decision 부착) 불변 — 실패 usage 는 진단으로만 감(유실 수정=순추가) |
| (c) 문자열 상한 | PASS — rawTextHead 유일 기록점 `r2.text.slice(0, 2048)`, errorMessage `.slice(0, 300)`, 병합은 이미 캡된 값만 이월, attempts ≤2 → 무한 문자열 영속 불가 |
| (d) abort 분류 | PASS — `agentCli.ts:193,239` 가 `name:"AbortError"` 로 reject → `classifyAgentFailure` 가 "abort" 매핑(타임아웃과 동일 name 기반 메커니즘, timeout 은 테스트로 실증) |
| 영속 계층 필드 스트립 | PASS — `persistence.ts` 가 tick 객체 통째로 `payload` jsonb 저장(스키마 검증·필드 화이트리스트 없음) → agentDiagnostics 동승, 마이그레이션 0 |

### 관찰 (비차단)

- rawTextHead 는 trim 전 원문을 slice — 선행 공백이 긴 응답이면 머리가 공백 위주일 수 있음(2KB 상한 내라 무해, PR-3c 텔레메트리 분석 시 참고).
- abort 종류(`failureKind:"abort"`)는 전용 테스트 없음 — timeout 테스트와 동일 name-분류 경로라 코드 리딩으로 갈음.

### 판정

- **qa-passed** — AC-1~4 전부 통과, 에지 케이스 이상 없음, 행동 무변경 확인.
