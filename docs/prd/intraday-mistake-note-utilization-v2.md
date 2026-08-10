# PRD — intraday-mistake-note-utilization-v2

- 작성일: 2026-07-30
- 기준 브랜치: `feature/intraday-mistake-note-v2` (`main` c9417f7, PR #380 반영 후 통합)
- UI 포함: no (기존 `/intraday/mistake-note` 페이지 재사용)
- 상태: 1단계 구현 완료 (수익 효과 측정 원장·필수 참고 계약)

## 1. 배경 / 문제

기존 오답노트는 장 마감 원장을 로컬 `sources`와 사람용 `reviews/*.md`로 남기고, 짧은
`CM.md`를 AI 분석가와 판단가 prompt에 주입한다. 그러나 다음 문제가 있다.

1. 16:30 KST 장 마감 뒤 기본 명령이 전일을 선택해 당일 오답노트가 다음 장에 연결되지 않을 수 있다.
2. 같은 최대 900자 문맥을 분석가와 판단가에 중복 주입한다. 현재 CM 기준 대표 prompt 문자량은
   두 호출 합계 약 34% 증가해 “최대 5%” 목표를 충족하지 않는다.
3. prompt에 규칙이 포함돼도 어떤 CM과 규칙을 제시했는지 판단 원장에 남지 않아 “반드시 참고”를
   감사할 수 없다.
4. 손실일 전체 손익을 여러 후보에 복사하므로 규칙별 수익 개선 효과가 입증되지 않았다. 이 상태에서
   BUY 컷, 비중, 손절을 공격적으로 바꾸면 과적합과 손실 확대 위험이 있다.
5. DB 영속이나 신규 제품 UI를 먼저 만들면 현재 요구보다 변경 면적과 egress가 커진다.

## 2. 목표

- 16:30 KST 이후 기본 review가 당일 원장을 로컬 MD/CM으로 갱신하고 다음 실제 LLM 판단부터 사용한다.
- 유효한 CM이 있으면 최종 판단가 입력에 관련 규칙 ID 1개를 반드시 한 번 포함한다.
- 판단 payload에 CM 상태, SHA-256, 규칙 ID, 원천 거래일을 남겨 제시 여부를 감사할 수 있게 한다.
- 비용 후 일 수익률 +1% 이상인 날의 비율과 rolling median 개선을 관찰 목표로 둔다.
- 공격성은 손실 한도 확대가 아니라 검증된 기회 포착률 개선으로 정의한다.
- 이번 변경의 LLM 호출 수와 런타임 외부 조회 수를 늘리지 않고, 토큰·egress 증가는 main 대비
  최대 5%로 제한한다.
- CM 없음/손상/범위 불일치 때 기존 판단은 fail-soft로 유지한다.

## 3. 범위

### 3-1. 로컬 장 마감 루프

```text
16:30 KST 이후 review
  → 당일 원장 1회 수집
  → sources/<namespace>/<date>.json
  → reviews/<operator>/<date>.md
  → CM.md(source-through 포함)
  → 다음 실제 LLM 틱에서 judge 단일 규칙 주입
  → tick.decision.mistakeNote에 hash/ruleIds 기록
```

- 16:30 이후 기본 날짜는 당일, 이전은 전일이다.
- 같은 operator/date의 성공 manifest가 있으면 원격 수집 전에 `UNCHANGED_LOCAL`로 종료한다.
- 늦은 원장 보정 때만 운영자가 `--force-refresh`를 명시한다.
- `CM.md`에는 최신 READY source 날짜를 `source-through`로 기록한다.

### 3-2. 런타임 필수 참고 계약

- “반드시 참고”의 검증 가능한 정의는 **유효 CM 규칙 ID가 최종 judge request에 정확히 한 번
  포함되고, judge 응답의 `appliedMistakeNoteRuleId`가 제시 ID와 일치하며, 동일 hash/rule ID가
  판단 payload에 기록되는 것**이다. 모델의 내부 사고나 수익을 보장한다는 뜻은 아니다.
- 분석가는 정량 셋업 요약 역할만 유지하고 CM을 받지 않는다.
- judge에는 포지션 상태에 맞는 우선 규칙 1개, 최대 160자만 보낸다.
  - 미보유: `ENTRY/RISK/CALIBRATION`
  - 청산 이력 후 미보유: `REENTRY/ENTRY/RISK/CALIBRATION`
  - 보유: `EXIT/RISK/CALIBRATION`
- 주입 문구는 `필수참고`, 상태, 규칙 ID, IF, DO, “안전핀 유지”만 포함한다.
- 자유 형식 줄은 strict parser를 통과해야 한다. marker 중복, 필드 구분자/개행 오염, 가짜 상태·scope는
  전체 문맥을 `INVALID`로 처리한다.
- `PRESENTED/APPLIED/PRESENTED_NOT_ACKNOWLEDGED/EMPTY/INVALID/IO_ERROR`를 구분한다. 제시
  규칙과 응답 ID가 일치할 때만 APPLIED다. 오류·무응답은 기존 매매 판단을 깨지 않지만 적용 성공으로
  집계하지 않는다.

### 3-3. 수익률 개선 전략

- 1차 개선은 반복 손실 진입, 확인 없는 재진입, 스톱 의존 청산을 다음 장 판단에서 짧게 상기해
  비용 후 손실을 줄이는 방식이다.
- +1%는 매일 강제 달성하거나 장 막판 만회매매를 유도하는 목표가 아니다. 다음을 rolling으로 비교한다.
  - 비용 후 일 수익률 median
  - `return ≥ 1%` 거래일 비율
  - positive-day 비율
  - 비용 후 거래당 expectancy와 PF
  - peak-to-trough MDD
- 더 공격적인 실험은 모의투자에서 한 변수씩만 허용한다. 예: 확인된 돌파/눌림 셋업의 소액 진입
  또는 risk-normalized position size. 일 손실킬, 15:00 신규진입 금지, 15:20 청산, 하드스톱,
  경보 gate는 완화하지 않는다.
- 현재 후보별 손익 귀속이 없으므로 BUY 컷·비중 자동 상향은 이번 범위에서 금지한다. 먼저
  `cmHash/ruleIds` 노출 원장을 쌓고 D+1 OOS 효과를 검증한다.

### 3-4. 비용 예산

기준은 동일 모델·동일 tick·동일 재시도 정책의 main 대비 paired replay다.

- 토큰: `input + cacheRead + cacheCreation + output` 합계와 tick별 p95 증가율 ≤5%.
- LLM wire: UTF-8 system+user request bytes 합계와 p95 증가율 ≤5%.
- 호출: analyst/judge 호출 수와 재시도 수는 main 이하.
- Supabase: runtime 추가 fetch 0건. 장 마감 조회 table/projection/page 상한은 main 이하.
- 측정 누락은 0으로 간주하지 않고 NO-GO로 판정한다.

이번 구조는 822자 문맥을 두 agent에 보내던 경로를 judge 1회·160자 이하로 줄인다. 동일 날짜 재실행도
원격 수집 전에 종료하므로 main 대비 입력 및 원격 egress가 증가하지 않는 방향이다.

## 4. 비범위

- 수익 보장, 매일 +1% 강제 달성, 손실 만회 거래
- SHADOW 규칙의 자동 주문 gate 승격
- 신규 버튼·페이지·BFF API·클라이언트 query
- Supabase 테이블/마이그레이션, CM 원문 DB 적재
- Vercel cron, launchd 설치
- 후보별 효과가 검증되기 전 BUY 컷/포지션 비중/손절 한도 자동 조정

DB 적재는 아래 명시 백로그로 둔다. 현재는 기존 tick payload(jsonb)의 짧은 감사 필드와 로컬 MD를
정본으로 사용한다.

- BL-DB1: stable trade/lot ID와 entry-exit 비용·슬리피지 귀속
- BL-DB2: `ruleExposure(cmHash, ruleIds, presentedAt, acknowledgedAt)` 정규화
- BL-DB3: 다중 host 실시간 동기화가 필요해질 때 CM version/retention/migration 도입
- migration trigger: 2개 이상 host가 같은 trading run을 처리하거나 로컬 artifact 유실로 운영 장애 발생

## 5. 수용 기준

1. 16:30 KST 이후 기본 review date는 당일, 이전은 전일이며 월경계 테스트가 통과한다.
2. 성공 manifest가 있는 같은 날짜 review는 `--force-refresh` 없이는 원격 fetch 전에 종료한다.
3. `CM.md`가 `source-through:<latest READY date>`를 포함하고 MD/source/CM은 기존처럼 원자 갱신된다.
4. 유효 CM이 있는 실제 LLM 틱에서 analyst prompt 규칙 0개, judge prompt 규칙 ID 정확히 1개다.
5. judge runtime context는 1규칙/160자를 넘지 않으며 `필수참고`와 `안전핀 유지`를 포함한다.
6. 판단 payload에 `status/hash/ruleIds/sourceThrough`가 남고, 응답 ID가 일치할 때만 APPLIED이며
   긴 CM 원문은 저장되지 않는다.
7. 포지션 상태별 scope가 분리되며 만료/불일치/오염 규칙은 주입되지 않는다.
8. CM 없음/손상/IO 실패 시 기존 action, target/stop, gate와 LLM 호출 수가 바뀌지 않는다.
9. pre-gate skip은 그대로 AI를 호출하지 않으며 오답노트 때문에 네트워크 호출이 추가되지 않는다.
10. 기존 `/intraday`와 `/intraday/mistake-note` UI, route, components는 수정하지 않는다.
11. 관련 vitest, typecheck, lint, `intraday:notes:merge`, `intraday:notes:validate`가 통과한다.
12. 안전핀 4종(손실킬/15:00/15:20/하드스톱)은 ACTIVE/SHADOW로 완화되지 않는다.
13. paired 비용 검증에서 prompt request 증가율 ≤5%, 호출 수 증가 0이다. 실제 모델 usage의 20일
    rolling 검증 전 공격성 상향은 활성화하지 않는다.

## 6. 가정 / 제약

- 로컬 서버 프로세스가 저장소의 `CM.md`를 읽을 수 있다.
- atomic rename 뒤 런타임 캐시는 최대 60초 안에 새 CM을 읽는다.
- 휴장일의 “다음 거래일” 계산은 현재 명시 `--date` 운영을 사용한다. 거래소 캘린더 자동 연결은 후속이다.
- 실제 체결의 stable tradeId/lot matching이 아직 없어 SELL 행 수와 완전한 round-trip이 다를 수 있다.
- 현재 `maxSessionDrawdownPct`는 peak-to-trough MDD가 아니라 최소 수익률 관찰값에 가깝다.
- 수익 효과 판정은 위 데이터 결손을 해결하기 전까지 SHADOW 참고 수준이다.

## 7. 운영 / 롤백

```bash
# 16:30 KST 이후 당일 리뷰
npm run intraday:notes:review

# 당일 원장이 뒤늦게 수정된 경우만
npm run intraday:notes:review -- --force-refresh

# 로컬 정본 검증
npm run intraday:notes:merge
npm run intraday:notes:validate
```

- CM 문제는 `EMPTY/INVALID/IO_ERROR`로 기록되고 기존 판단은 계속된다.
- 성공 manifest가 있어도 local source/review/CM 무결성을 먼저 확인하고, 손상 시 원격 조회 없이
  로컬 source에서 `REPAIRED_LOCAL`로 재생성한다.
- prompt 예산 또는 회귀 테스트 실패 시 judge 주입을 배포하지 않는다.
- OOS MDD 악화, PF<1.3, 비용 스트레스 후 음수 기대값이면 공격성 실험을 기본값으로 롤백한다.

## 8. 영향 분석

- 런타임: 기존 2개 AI 호출 중 analyst의 중복 CM만 제거하고 judge 호출 수는 유지한다.
- 영속: 기존 decision payload(jsonb)에 짧은 감사 필드가 추가되며 DB 마이그레이션은 없다.
- 네트워크: runtime fetch 추가 0. 같은 날짜 review 재실행은 기존보다 원격 fetch가 줄어든다.
- UI: 기존 페이지와 링크를 재사용하며 제품 컴포넌트 변경 0.
- 보안: CM strict parser와 source 금지 문자열 검사로 prompt 경계 오염을 줄인다.
- 호환성: CM 부재/오류는 fail-soft이며 매매 안전핀과 기존 BFF 계약은 불변이다.

## 9. OPEN QUESTION

### Q1. ACTIVE를 언제 실제 공격성 조정에 연결할 것인가?

- **PM 권고:** 지금은 연결하지 않는다. stable trade/lot ID와 rule exposure를 확보한 뒤 최소
  20거래일·20 ticker-days·100 closed trades에서 baseline 대비 비용 후 expectancy uplift의
  95% cluster-bootstrap CI 하단>0, PF≥1.3, MDD 비악화를 모두 만족할 때 별도 PRD로 검토한다.

### Q2. 로컬 MD를 언제 DB로 옮길 것인가?

- **PM 권고:** 다중 운영자/다중 서버가 같은 memory를 실시간 공유해야 하거나 로컬 파일 유실이 실제
  운영 장애로 확인될 때 옮긴다. 그 전에는 source+CM+manifest가 더 싸고 감사 가능하다.

### Q3. 휴장일 다음 거래일을 어떻게 계산할 것인가?

- **PM 권고:** 현재는 16:30 cutoff와 명시 `--date`를 유지한다. 거래소 캘린더를 이미 보유한 서버
  모듈과 결합하되 외부 캘린더 호출을 새로 추가하지 않는 후속 작업으로 둔다.

## 10. 독립 기획 검토

### 검토 1 — 데이터·수익성·통계

- **판정:** 조건부 NO-GO.
- 모든 후보에 일 전체 손익을 복사하고 손실 net<0을 ACTIVE 근거로 삼는 것은 “문제 재현”이지
  “메모 적용 후 개선”이 아니다.
- 독립표본은 session 수가 아니라 최소 ticker×date/run 군집이어야 하고, MDD·round-trip 정의도
  보강해야 한다.
- **반영:** 공격성 자동 상향 제외, +1%를 rolling 분포로 재정의, rule exposure 감사 필드부터 적재,
  D+1 OOS 효과 게이트를 OPEN QUESTION에 명시.

### 검토 2 — 로컬 MD·AI 필수 참고·무결성

- **판정:** 현행 prompt 포함만으로는 필수 참고를 감사할 수 없어 NO-GO.
- CM hash/rule IDs/source date, typed failure, 상태별 scope, strict parser, 단일 runtime parser가 필요하다.
- **반영:** `source-through`, `RuntimeMemorySnapshot`, strict parser, position scope, judge payload 감사
  정보를 설계·구현 범위에 포함.

### 검토 3 — 회귀·UI·토큰·egress

- **판정:** 현행 900자×2 주입은 대표 문자 계측 +34.0%로 NO-GO. judge 1개 압축 규칙이면 GO 가능.
- 신규 UI는 이미 존재해 불필요하고, 같은 날짜 재실행의 원격 재수집도 낭비다.
- **반영:** analyst 주입 제거, judge 1규칙/160자, UI 무수정, manifest 선확인,
  호출/bytes/usage 5% 게이트를 수용 기준에 포함.

### 검토 4 — 통합 반대검토

- **판정:** 초안 NO-GO. prompt 제시를 APPLIED로 기록했고, 파일 순서상 CALIBRATION 규칙만 뽑혀
  ENTRY/REENTRY/EXIT가 기아 상태였다. manifest 선종료는 로컬 손상 복구도 막았다.
- paired 실제 usage 20일 검증 전 수익 개선 완료를 주장할 수 없으며, 현재 단계는 효과 측정 원장과
  필수 참고 계약 구축이다.
- **반영:** PRESENTED와 APPLIED 분리 및 judge rule ID acknowledgement, 호출자 scope 순서 우선,
  청산 이력 표현 정정, `source-through:none` EMPTY 통일, 로컬 artifact 무결성 검사·복구,
  PRD 상태를 1단계 구현으로 정정.
