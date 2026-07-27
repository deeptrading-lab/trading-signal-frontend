# PRD — ai-intraday-mistake-note

- 작성일: 2026-07-22
- 첫 평가일: 2026-07-21 KST
- UI 포함: no (운영 HTML/인라인 시각화만, 제품 화면 없음)
- 패키지: `packages/intraday-mistake-note`

## 1. 배경 / 문제

AI 단타는 세션·틱·판단 스냅샷·가상 체결·오토파일럿 스크리너·반사실 라벨을 이미 Supabase에 쌓는다. 그러나 장 마감 후 데이터가 자동으로 짧은 학습 문맥으로 환류되지 않고, 실제 체결 손익과 HOLD 포함 반사실 LONG 라벨을 섞어 해석할 위험이 있다. 기존 `scripts/intraday/daily.mts`도 Codex provider를 무조건 제외해 2026-07-21의 실제 주문 코퍼스를 누락했다.

긴 일일 리포트를 매 틱 프롬프트에 넣으면 토큰이 낭비되고 하루 패턴을 영구 규칙으로 과적합한다. 반대로 유효하지 않은 문장을 단순 삭제하면 같은 실패 가설이 재발견된다. 따라서 **정형 source → 사람용 일일 리뷰 → 검증형 Compact Memory(CM) → 런타임 범위 주입**의 수명주기가 필요하다.

## 2. 목표

- 매일 16:30 KST 장 마감 원장을 읽어 실제/반사실/선정 성과를 분리한 오답노트를 만든다.
- 일 +1~2%를 비용 후 런 수익률의 관찰 구간으로 보고하되, 이를 맞추기 위해 거래수·비중·손절을 공격적으로 조정하지 않는다.
- 하루 가설은 `SHADOW`, 다일 독립표본 검증 후만 `ACTIVE`로 승격한다.
- 유효하지 않은 규칙은 활성 `CM.md`에서 제거하고 짧은 tombstone만 보존한다.
- CM ≤12규칙/1,800자, 에이전트별 ≤6규칙/900자로 토큰 사용을 제한한다.
- 두 개발자는 source namespace를 분리하고, 나중에 결정론적 merge로 하나의 CM을 재생성한다.

## 3. 범위

### 3-1. 데이터 계층

| 계층 | 용도 | 판정 지표 |
|---|---|---|
| 실제 체결 | 최종 성과·승격 | 비용 후 net PnL, run return, 폐쇄거래 W/L, MDD, 비용, 강제청산률 |
| 틱 반사실 | 원인 탐색 | BUY W/L/N/U, gross return, conviction·signal·RRR 버킷. 실제 손익과 합산 금지 |
| 스크리너 | 선정 오답 | pick vs eligible-not-picked 동일 horizon lift. 미래 outcome 미영속 상태에서는 보류 |

`runReturnPct = Σ(완료 자식 세션 finalValue−initialCash) / Σ(unique run.totalCapital)`로 계산한다. 세션 교체 때 슬롯 자본이 재사용되므로 자식 initialCash를 무조건 합산하지 않는다.

### 3-2. 수명주기

```text
PROPOSED(품질 실패/근거 부족, 미주입)
  → SHADOW(다음 날 참고만, 최대 14일)
  → ACTIVE(≥3일·독립≥20·폐쇄≥20, 손실패턴 재현)
  → RETIRED(CM 삭제 + tombstone)
```

실전 자동 하드게이트 검토는 별도로 100왕복·20거래일·20 ticker-days, OOS net expectancy 95% CI 하단>0, PF≥1.3, 비용/슬리피지 스트레스, MDD 비악화가 필요하다. ACTIVE도 손실킬·15:00 신규진입 금지·15:20 flatten·하드스톱을 완화하지 못한다.

### 3-3. 장 마감 실행

1. 15:40 완료 확인
2. 세션 없음/휴장, 미완료, owner 오염, 라벨 커버리지, UNRESOLVED, fallback 품질 게이트
3. 현재 operator의 모든 provider를 날짜 기반 페이지네이션으로 수집
4. 실제 체결/반사실 BUY/스크리너를 분리 집계
5. 전일까지의 규칙을 오늘 데이터로 OOS 검증
6. 후보 생성·승격·퇴역
7. `sources`, `reviews`, `CM.md`, HTML을 원자적 갱신
8. 포맷·문자수·중복·비밀값 검증

휴장·데이터 없음·품질 실패는 `SKIPPED`로 남기고 CM은 불변이다. `date+inputHash`가 같으면 `UNCHANGED`로 끝난다.

### 3-4. 런타임 활용

서버는 `CM.md`의 marker 안 ACTIVE/SHADOW 줄만 scope로 필터링해 흐름 분석가와 판단가 user prompt에 명시 주입한다. 파일 부재·읽기 실패는 빈 문자열 fail-soft다. SHADOW는 “참고만·안전핀 완화 금지” 문구와 함께 전달한다.

### 3-5. 병합

- 각 개발자는 `sources/<namespace>/`만 소유한다.
- 동일 key+동일 의미는 증거를 합산한다.
- 동일 key인데 조건/행동이 다르면 CONFLICT로 CM/런타임에서 제외한다.
- generated `CM.md`에 last-writer-wins를 적용하지 않는다. source 병합 후 재생성한다.

## 4. 비범위

- 실주문, 수익 보장, 일 1~2% 강제 달성
- 하루 1회 결과만으로 하드 게이트/상수 자동 변경
- HOLD/SELL 반사실 LONG 라벨을 실제 행동 정답으로 해석
- 제품 UI 신규 페이지, Vercel 파일 영속 cron
- 2026-07-21에 없는 guide performed/passed의 사후 추정

## 5. 수용 기준

1. `npm run intraday:notes:dry -- --date YYYY-MM-DD`가 파일 변경 없이 현재 operator의 모든 provider를 분석한다.
2. `review` 재실행 시 같은 inputHash는 `UNCHANGED`, 품질 실패는 CM 불변이다.
3. 실제 손익과 반사실 BUY 지표가 다른 필드·다른 문단으로 출력된다.
4. source는 operator별 경로에 저장되어 두 개발자의 같은 날짜 파일이 충돌하지 않는다.
5. merge 시 의미 충돌 규칙은 CM에서 제외된다.
6. CM은 12줄/1,800자, 런타임 context는 6줄/900자를 넘지 않는다.
7. 프롬프트 로더는 파일/marker 부재 시 빈 문자열이고 기존 판단을 깨지 않는다.
8. `tickLabels.payload.conviction`이 신규 라벨부터 원본 점수를 보존한다.
9. 기존 daily 러너는 provider를 기본 제외하지 않는다.
10. typecheck·관련 vitest·패키지 validate가 통과한다.

## 6. 가정 / 제약

- `.env.local`의 Supabase service role은 로컬 서버/CLI에서만 사용한다.
- KIS 과거 분봉 보존 기간이 짧아 라벨/선정 forward outcome은 장 마감 직후 확정해야 한다.
- Supabase write-through가 fail-soft라 누락은 “판단 없음”이 아니라 저장 실패일 수 있다.
- 장 마감 뒤 자동 분석이 상주하지 않도록 저장소는 스케줄을 설치하지 않는다. 운영자가 필요한 날
  권장 시각인 16:30 이후 일회성 명령을 수동 실행한다.

## 7. 참고

- `lib/server/paperTrading/persistence.ts`
- `lib/server/intraday/tickLabels.ts`
- `lib/server/paperTrading/autopilot/persistence.ts`
- `scripts/intraday/daily.mts`
- `scripts/intraday/BASELINE-2026-07-10.md`
- `packages/intraday-mistake-note/README.md`

## 8. 영향 분석

- 트레이딩 행동 변화는 prompt에 짧은 참고 문맥을 추가하는 부분뿐이며, 읽기 실패는 기존과 동일하다.
- 라벨 conviction 저장은 jsonb 필드 채움이라 DB 마이그레이션이 없다.
- source/리뷰/CM은 독립 패키지에 격리되어 기존 사용자 변경분과 충돌 면적이 작다.
- 기존 daily provider 제외 해제는 분석 결과만 바꾸고 트레이딩 루프에는 영향이 없다.
- 미해결 핵심 결손: decision-ready timestamp/재호가, tradeId/MFE/MAE, config/prompt/git version, 스크리너 미래 outcome.

## 9. 3회 기획 리뷰와 결정

### 리뷰 1 — 데이터 활용성

- 2026-07-21 전체 원장은 2 runs·30 sessions·341 ticks·7왕복·68 screener snapshots로 조회 가능했다.
- 실제 7왕복은 1승 6패, run 손익 −47,524원(1천만원 run 기준 −0.475%), 비용 8,652원이었다.
- 진입은 conviction 66~68·RRR≈2·3종목 집중, 청산 7건 모두 stop 경로였다.
- 2026-07-21 performed/passed는 0이고, DB label conviction은 기존 코드에서 null이었다.
- **결정:** operator/provider/config를 분리하고 실제·반사실·선정 3원장을 섞지 않는다. 어제 가설은 컷 경계·반복 재진입·종목 집중·스톱 의존으로 한정한다.

### 리뷰 2 — 수익/리스크/검증

- 일 1~2%는 보장/목적함수가 아니라 goal-zone hit days와 rolling 분포로 관찰한다.
- 왕복 비용·슬리피지가 있고 반사실 return은 gross라 net expectancy 승격에 쓸 수 없다.
- 반복 틱은 독립표본이 아니므로 날짜 순 walk-forward와 ticker-date 군집 검증이 필요하다.
- **결정:** 실제 비용 후 net expectancy/PF/MDD를 1차로, 반사실은 진단으로 사용한다. 하루 규칙 자동 승격을 금지한다.

### 리뷰 3 — 운영/토큰/병합

- `CM.md`가 가장 호환성 높은 Compact Memory 정본이며 `.cm` 확장자 자동 인식 근거는 없다.
- Vercel은 로컬 파일 영속에 부적합하고 16:10 기존 cron과 KIS 경합이 있어 로컬 16:30 수동 실행이 적합하다.
- 두 개발자가 CM을 직접 편집하면 충돌하므로 namespace source 병합 후 재생성해야 한다.
- **결정:** CM 1,800자·런타임 900자, 원자적/멱등 갱신, 충돌 제외, tombstone 보존을 채택한다.

## 10. 첫날 결론(승격 전)

2026-07-21은 영구 규칙을 만들 표본이 아니다. 다음 네 가설을 `SHADOW`로만 다음 거래일 판단에 제공한다.

1. 저항·거래량 부족·돌파 확인 필요를 서술하면서 conviction 66~68로 컷을 넘긴 진입을 보류한다.
2. 손절 후 같은 종목의 재진입은 새 구조 이벤트와 거래량 동반을 다시 요구한다.
3. 보유 논거 훼손·목표 여력 축소를 선제 SELL 점수에 반영해 모든 청산을 stop에 맡기지 않는다.
4. conviction 고점이 방향 예측력이라는 가정을 금지하고 실제 OOS 성과로 재검증한다.

이 네 문장은 수익을 보장하지 않으며, 근거가 사라지면 CM에서 제거된다.
