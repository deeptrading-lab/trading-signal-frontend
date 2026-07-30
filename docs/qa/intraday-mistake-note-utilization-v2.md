# QA — intraday-mistake-note-utilization-v2

- 실행일: 2026-08-04 KST
- 브랜치: `feature/intraday-mistake-note-v2`
- 기준: `main` c9417f7 (PR #380 반영)
- 판정: PASS (실제 수익 효과는 D+1 이후 OOS 관찰 대상)

## 수용 기준 검증

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 날짜 cutoff | `schedule.test.ts` | 16:30 이후 당일, 이전 전일, 월경계 정상 | 3 case 통과 | PASS |
| 동일일 egress | unit + `review --date 2026-07-21` | 성공 manifest면 원격 수집 전 종료, dry/force는 수집 | 2 case + `UNCHANGED_LOCAL e6fcfeed8352` | PASS |
| CM 정본 | `intraday:notes:merge`, `validate` | source-through 포함, 1,800자 이하 | 4 rules, 1,103 chars, VALID | PASS |
| 필수 참고 | `intradayConviction.test.ts` | analyst 0, judge 1 rule | ENTRY `AI-4EC46D87` 1회 | PASS |
| 적용 감사 | ack/missing-ack tests | ID 일치만 APPLIED | APPLIED / PRESENTED_NOT_ACKNOWLEDGED 분리 | PASS |
| 상태별 scope | flat/reentry/holding tests | ENTRY/REENTRY/EXIT 우선 | `AI-4EC46D87` / `AI-7563C592` / `AI-FA2B6DEA` | PASS |
| 손상 방어 | strict parser tests | marker/line 오염 INVALID, none EMPTY | 2 case 통과 | PASS |
| 런타임 예산 | UTF-8 request ratio assertion | 전체 request 증가 ≤5% | 테스트 통과, context ≤160 chars | PASS |
| UI 회귀 | git diff | 신규 route/button/page 0 | `app/`, `components/` 제품 UI diff 0 | PASS |
| 전체 회귀 | `npm test` | 전체 green | 162 files, 1,441 tests passed, live 3 skipped | PASS |
| 정적 검사 | `npm run typecheck`, `npm run lint` | 오류 0 | 타입 오류 0, lint 오류 0(기존 경고 2) | PASS |
| 프로덕션 빌드 | `npm run build` | Next.js 빌드 성공 | 75개 정적 페이지 생성, 빌드 성공 | PASS |
| PR #380 통합 | rebase + 집중 회귀 34건 | 컷 숫자 제거·관측 창 유지, strict parser/필수 참고 공존 | 충돌 2파일 해소, 집중 34건 통과 | PASS |

## 비용 계측

현재 CM 4규칙을 같은 scope로 비교한 정적 UTF-8 계측:

- main 방식(analyst+judge 중복 문맥): 1,447 chars / 2,262 bytes
- v2 방식(judge ENTRY 1규칙): 96 chars / 195 bytes
- 오답노트 문맥 wire bytes: **91.38% 감소**
- AI 호출 수·재시도 정책: 변화 없음
- runtime 외부 fetch: 추가 0
- 같은 날짜 review 재실행: local artifact가 정상일 때 원격 fetch 0

실제 provider usage의 input/cache/output token 합계와 p95는 거래일 원장이 생긴 뒤 20일 rolling으로
재검증한다. 측정 전에는 BUY cutoff·비중 등 공격성 상향을 활성화하지 않는다.

## 에지 케이스

- CM 파일 read 실패: `IO_ERROR`, 기존 판단 fail-soft
- 유효 규칙 없음: `EMPTY`
- 제시 규칙 ID를 judge가 누락/다르게 응답: `PRESENTED_NOT_ACKNOWLEDGED`
- 성공 manifest 뒤 CM/review 손상: 로컬 source에서 `REPAIRED_LOCAL`, source도 없을 때만 원격 재수집
- pre-gate LLM skip: 기존처럼 오답노트 로드/AI 호출 없이 결정론 경로 유지
- PR #380의 정성 규칙 문구(`BUY컷` 숫자 앵커 제거)를 유지해 필수 참고와 결합해도 코드 컷을
  모델이 추측하지 않으며, conviction 밴드·BUY 컷·사후 레짐 veto는 변경하지 않음
