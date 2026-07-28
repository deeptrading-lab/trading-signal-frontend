# Supabase Egress 최적화 적용 보고서

- 적용일: 2026-07-24
- 대상 프로젝트: `trading-signal-engine`
- 목표: 두 사용자가 호출 주기를 유지해도 하루 Egress 250MB 미만
- 무과금 운영 권장선: 일평균 150MB 이하
- 적용 원칙: 호출 차단·데이터 삭제 대신 projection, DB 내부 집계, 기본 조회 건수 축소

## 1. 적용 계획

1. `/analyze` 결과 목록에서 실제 카드가 쓰는 필드만 전송한다.
2. 카드별 토큰 합계는 `ai_agent_usage` 원본 1,000행을 BFF로 전송하지 않고 Postgres 함수 안에서 계산한다.
3. AI 결과와 모의투자 세션의 반복 조회는 최신 20건으로 제한한다.
4. 상세 결론은 기존 단건 API로 지연 조회한다.
5. Supabase 전체 차단은 자동 적용하지 않고 `SUPABASE_EGRESS_DISABLED=1`을 명시했을 때만 비상 정지한다.
6. 단위테스트·타입 검사·실제 Supabase 응답 크기를 검증한다.

## 2. AS-IS

### AI 분석 목록

`GET /api/stock/ai-analysis/decisions` 한 번이 Supabase에서 다음 두 원본을 가져왔다.

| 조회 | 행 수 | 실측 응답 |
|---|---:|---:|
| `ai_analysis_decisions` 전체 결론·감성·시그널 | 50 | 194,725 bytes |
| `ai_agent_usage` 최신 원본 | 1,000 | 374,405 bytes |
| 합계 | 1,050 | 569,130 bytes |

- 대기 중 30초마다 같은 크기를 다시 조회했다.
- 두 사용자가 24시간 열어두는 보수적 계산: `569,130 × 2,880 × 2` = 약 **3.28GB/일**
- 카드가 실제로 쓰지 않는 reasoning, 전략, 감성 전문과 과거 usage 원본이 대부분이었다.

### 모의투자 세션

| 조회 | 행 수 | 실측 응답 |
|---|---:|---:|
| `paper_trading_sessions` 세션·포지션 | 50 | 42,206 bytes |

- 서버별 60초 캐시 갱신 기준, 두 서버 보수적 계산: 약 **121.55MB/일**
- 틱은 이미 증분 조회라 반복 Egress의 주원인이 아니었다.

### 긴급 차단

- `SUPABASE_EGRESS_DISABLED`가 없어도 Vercel이면 Supabase 전체를 자동 차단했다.
- Egress는 0이 되지만 결론·큐·세션 영속화와 프로필 조회도 함께 중단되는 부작용이 있었다.

## 3. TO-BE

### DB 내부 카드 집계

Supabase에 다음 읽기 전용 함수를 적용했다.

- 함수: `public.get_ai_decision_card_summaries(integer)`
- 입력 상한: 최대 20건
- 반환 필드:
  - 종목, 종목명, provider, 갱신 시각
  - verdict, time horizon, limited data, bars, signal score
  - 종목별 최신 run의 입력·출력 토큰, 비용, 측정 여부
- 보조 인덱스: `ai_agent_usage(ticker, created_at desc)`
- 권한: `service_role`만 실행

DB 안에서 최신 run을 찾고 합계를 계산하므로 usage 원본은 Supabase 밖으로 나가지 않는다.

RPC가 아직 없거나 일시 실패해도 전체 payload로 되돌아가지 않는다. 같은 20건을 JSON 필드 projection으로 조회하고 토큰만 `null`로 표시한다.

### 최신 20건 기본 조회

- AI 결과 목록: 최신 20건
- 모의투자 세션 복원·동기화: 최신 20건
- 오래된 원본 데이터는 삭제하지 않는다.
- 20건보다 오래된 결과와 완료 세션은 새 프로세스의 기본 목록에 표시되지 않는다.
- AI 카드 선택 시 상세 결론은 기존 단건 API로 조회하므로 reasoning·전략·감성 데이터는 보존된다.

### 비상 스위치

- 미설정 또는 `0`: Supabase 정상 사용
- `SUPABASE_EGRESS_DISABLED=1`: 명시적 비상 정지
- Vercel이라는 이유만으로 자동 차단하지 않는다.

## 4. 실측 효과

2026-07-24 라이브 Supabase REST 검증 결과:

| 반복 조회 | AS-IS | TO-BE | 감소율 |
|---|---:|---:|---:|
| AI 목록+토큰 | 569,130 bytes | 7,359 bytes | 98.7% |
| 모의투자 세션 | 42,206 bytes | 16,867 bytes | 60.0% |

TO-BE RPC 검증:

- HTTP `200`
- 20행
- 20행 모두 최신 run 토큰 합계 포함
- 응답 7,359 bytes

### 두 사용자 일일 예산

| 상태 | AI 목록 | 세션 목록 | 반복 조회 합계 |
|---|---:|---:|---:|
| 대기 폴링 30초 | 42.40MB/일 | 48.58MB/일 | **90.98MB/일** |
| 분석 상태 15초가 하루 종일 지속되는 극단값 | 84.80MB/일 | 48.58MB/일 | **133.38MB/일** |

상세 조회, 신규 틱, 토큰 대시보드 수동 진입을 위한 여유를 더해도 목표 250MB/일 아래다.

Free 5GB를 30일로 나누면 약 166.7MB/일이므로 운영 목표는 다음처럼 둔다.

- 정상: 120MB/일 이하
- 주의: 120~150MB/일
- 조사 필요: 150MB/일 초과
- 사용자 요구 상한: 250MB/일

## 5. 사용자 영향과 부작용

| 항목 | 영향 |
|---|---|
| 호출 주기 | 변경 없음: 대기 30초, 분석 중 15초, 세션 60초 |
| 최신 카드 표시 | 동일 |
| 카드 상세 | 첫 선택 시 단건 조회가 발생해 짧은 지연 가능 |
| 목록 검색 | 현재 불러온 최신 20건 안에서만 검색 |
| 오래된 AI 결과 | DB에는 남지만 기본 목록에는 미표시 |
| 오래된 모의투자 세션 | DB에는 남지만 새 프로세스 기본 목록에는 미표시 |
| 토큰 사용량 탭 | 폴링 없이 진입·수동 갱신 시에만 원본 1,000행 조회 |
| 분석·저장 품질 | 변경 없음 |
| 데이터 삭제 | 없음 |

## 6. 검증 결과

- `npm run typecheck`: 통과
- 관련 Vitest: 4개 파일, 23개 테스트 통과
- Supabase SQL Editor: `Success. No rows returned`
- RPC 라이브 호출: HTTP 200, 20행, 7,359 bytes
- 세션 20건 라이브 호출: HTTP 200, 16,867 bytes

## 7. 운영 확인 방법

1. Supabase Dashboard → Organization → Usage → Egress로 이동한다.
2. 프로젝트 필터를 `trading-signal-engine`으로 선택한다.
3. 오늘 막대에 마우스를 올려 `PostgREST Egress`를 확인한다.
4. Usage 집계는 최대 약 1시간 늦을 수 있으므로 배포 직후 값보다 다음 시간대 추이를 본다.
5. 150MB/일을 넘으면 다음을 순서대로 점검한다.
   - `/analyze`가 계속 분석 중 상태라 15초 폴링 중인지
   - 모의투자 활성 세션과 신규 틱 수가 급증했는지
   - 토큰 사용량 탭을 반복 새로고침했는지
   - 서버 프로세스 재시작으로 hydrate가 반복됐는지

## 8. 변경 파일

- `app/api/stock/ai-analysis/decisions/route.ts`
- `lib/server/ai/decisionStore.ts`
- `lib/types/stock/aiAnalysisDecisions.ts`
- `lib/server/paperTrading/persistence.ts`
- `lib/server/supabase/egressGuard.ts`
- `lib/server/supabase/__tests__/egressGuard.test.ts`
- `lib/server/ai/__tests__/decisionStore.test.ts`
- `.env.example`
- `docs/sql/ai-analysis-decisions.sql`
