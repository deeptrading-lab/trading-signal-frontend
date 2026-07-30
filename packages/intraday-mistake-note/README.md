# AI 단타 오답노트 패키지

장 마감 후 현재 운영자(`INTRADAY_OPERATOR`)의 AI 단타 원장을 읽어 **실제 체결·반사실 라벨·스크리너 선정**을 분리 분석하고, 짧은 `CM.md`(Compact Memory)를 생성한다.

## 핵심 원칙

- 일 +1~2%는 비용 후 런 수익률의 **관찰 구간**이지 보장값이나 강제 최적화 목표가 아니다.
- 최종 판정은 `Σ(완료 세션 최종가치−초기자본) / Σ(run.totalCapital)`이다. 로테이션으로 슬롯 자본이 재사용돼도 분모를 자식 세션 수만큼 중복하지 않는다.
- `intraday_tick_labels`는 LONG·gross 반사실이다. BUY 원인 탐색에만 쓰고 실제 승률/순손익과 합치지 않는다.
- 동일 종목의 연속 틱을 독립 표본으로 세지 않는다. 승격은 거래일·ticker-session 군집 표본을 쓴다.
- `SHADOW`는 다음 날 보수적 참고만 한다. 안전핀이나 자동 주문 규칙으로 사용하지 않는다.
- 유효하지 않은 규칙은 `CM.md`에서 제거한다. 재발견 방지를 위해 `archive/retired.ndjson`에 한 줄 tombstone만 남긴다.

## 명령

```bash
# 기본값: 16:30 KST 이후 당일, 그 전에는 전일. 특정일 재현은 --date 사용
npm run intraday:notes:review -- --date 2026-07-21

# 파일을 바꾸지 않고 원장/규칙 후보 확인
npm run intraday:notes:dry -- --date 2026-07-21

# 다른 개발자의 sources/peer 또는 별도 namespace를 합친 뒤 CM 재생성
npm run intraday:notes:merge
npm run intraday:notes:validate
npm run intraday:notes:render
```

`review`는 `date + inputHash`가 같으면 `UNCHANGED`로 끝난다. 휴장·데이터 없음·미완료 세션·owner 오염·라벨 품질 실패 시 `SKIPPED` 기록만 만들고 `CM.md`는 바꾸지 않는다. 파일은 임시 파일을 거친 원자적 rename으로 갱신한다.

같은 날짜의 성공 manifest가 있으면 원격 원장을 다시 받기 전에 `UNCHANGED_LOCAL`로 끝내 egress를
늘리지 않는다. 장 마감 자료가 뒤늦게 보정된 날만 `--force-refresh`로 명시 재수집한다.

## 장 마감 후 수동 운영

1. 15:40 세션·오토파일럿 완료 확인
2. owner/완료/라벨 커버리지/UNRESOLVED/CLI 폴백 품질 게이트
3. 실제 비용 후 round-trip과 run 손익 산출
4. BUY 반사실 라벨은 별도 진단
5. 스크리너 pick/non-pick 동일 horizon 자료가 있으면 선정 lift 산출(현재 미래 outcome 미영속이라 보류)
6. 전일 규칙을 당일 데이터로 OOS 검증
7. 후보 생성 → `SHADOW` → `ACTIVE` 또는 퇴역
8. 일일 리뷰·정형 source·CM·HTML 재생성 및 검증
9. 다음 AI 호출부터 최종 판단가 prompt에 관련 규칙 1개(최대 160자)를 필수 참고 문맥으로 포함

오답노트는 상주 프로세스가 아니라 명령 1회로 끝나는 로컬 배치다. 장 마감 뒤 자동 분석·호출이
계속되지 않도록 저장소에서는 `launchd`/cron을 설치하지 않으며, 필요한 날 16:30 KST 이후 운영자가
아래 명령을 수동 실행한다. Vercel 서버리스 cron에는 배선하지 않는다.

```bash
cd /Users/a454155/Documents/Projects/trading-signal/trading-signal-frontend && npm run intraday:notes:review
```

## 규칙 수명

- `PROPOSED`: 품질 게이트를 못 넘긴 관찰. CM 미주입.
- `SHADOW`: 하루 이상 지지. 최대 14일, 판단 문맥에 참고만.
- `ACTIVE`: 최소 3거래일·독립 20표본·폐쇄 20거래에서 손실 패턴 재현. 그래도 하드 안전핀 완화 금지.
- 실전/자동 하드게이트 검토: 최소 100왕복·20거래일·20 ticker-days, 비용 스트레스, PF≥1.3, OOS 순기대값 95% CI 하단 >0, MDD 비악화.
- `RETIRED`: 10거래일/50표본에서 개선효과 없음, 반대증거 2회, 만료, 안전 위반 중 하나. CM 삭제 + tombstone.

CM은 최대 12줄/1,800자다. 실제 런타임은 분석가에 중복 주입하지 않고 최종 판단가에만 관련 범위
1규칙/160자를 넣는다. 적용 상태·CM 해시·규칙 ID·원천 일자는 판단 payload에 남기며 긴 원문은
저장하지 않는다.

## 다른 개발자와 병합

- 생성된 `CM.md`를 직접 함께 편집하지 않는다.
- 각 개발자는 `sources/<namespace>/`만 소유한다. 이 CLI는 운영자 해시별 폴더를 자동 사용한다.
- 같은 규칙 key의 조건/행동이 다르면 `CONFLICT`로 보고 CM과 런타임에서 제외한다.
- last-writer-wins를 쓰지 않는다. source를 합친 뒤 `intraday:notes:merge`로 CM/HTML을 재생성한다.

## 현재 데이터 결손

- `tradeId`, MFE/MAE, 진입~청산 비용 귀속, 전략·프롬프트·env 설정 버전이 없다.
- 라벨 판단 시점은 실제 decision-ready보다 빠른 `tickWindowStart`라 지연 구간 룩어헤드 위험이 있다.
- 스크리너 스냅샷은 선정 당시 정보만 있고 미선정 후보의 미래 outcome은 없다.
- `guideResponses`는 신규 계약이며 2026-07-21 레거시 research 런에는 performed/passed가 없다.

이 결손은 장 마감 결과를 해석할 때 경고로 유지하고, 데이터가 없는 항목으로 규칙을 승격하지 않는다.
