# QA — AI 단타 가이드 서비스 v2

- 일자: 2026-08-10
- 브랜치: `feature/intraday-trend-target-2pct`
- 대상 PRD: `docs/prd/intraday-guide-service-v2.md`
- 판정: **변경 범위 PASS / 전체 스위트 기존 CM 만료 5건 FAIL**

## 수용 기준 검증

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `/intraday` 시작 카드 확인 | +2%/-1%/50%/3종목 표시 | 390px·1280px 모두 표시 | PASS |
| AC-2 | 기준 금액 1,000만 원 | +100,000원/-50,000원 | 정확히 표시 | PASS |
| AC-3 | 위험 확인 전후 CTA | 전 비활성, 후 활성 | 프로덕션 로컬 브라우저에서 전환 확인 | PASS |
| AC-4 | active 런 상태 모델 | 활성·빈 슬롯·최근 통과 수 표시 | 컴포넌트가 run 슬롯/요약에서 계산 | PASS |
| AC-5 | pending 없음 | 스크리너/skip 기반 대기 이유 | 5개 상태 매핑 순수함수 테스트 | PASS |
| AC-6 | BUY 가이드 | 목표·손절·금액·위험 메모 | 피드 필드와 카드 렌더 연결 | PASS |
| AC-7 | 09:00 생성 가이드 | 09:09:59 pending, 09:10 expired | 경계값 테스트 통과 | PASS |
| AC-8 | 만료 guideId 응답 | 409, 원장 미기록 | runStore 테스트 통과 | PASS |
| AC-9 | guidePolicy 없는 런 | 기본 정책 폴백 | optional 타입·클라이언트 폴백 확인 | PASS |
| AC-10 | 한글·접근성 | 체크박스/상태 의미 전달 | label 래핑, role=status 확인 | PASS |
| AC-11 | 비용·주문·수익 면책 | 시작 카드에 근접 표시 | 390px·1280px DOM 확인 | PASS |
| AC-12 | 390px·1280px | 가로 넘침 0 | 두 viewport 모두 `scrollWidth-clientWidth=0` | PASS |

## 자동 검증

| 명령 | 결과 |
|---|---|
| `npx vitest run lib/intraday/__tests__/guideProduct.test.ts lib/intraday/__tests__/guideFeed.test.ts lib/server/paperTrading/autopilot/__tests__/runStore.test.ts` | 29/29 PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | 오류 0, 기존 스크립트 unused 경고 2 |
| `npx --yes @google/design.md lint docs/design/intraday-guide-service-v2.md` | 오류 0, 경고 0 |
| `npm run build` | PASS. 샌드박스의 Turbopack 포트 제한 때문에 외부 실행으로 재검증 |
| `npm test -- --run` | 1461개 중 1453 PASS, 3 SKIP, 5 FAIL |

## 전체 스위트 실패 분석

실패 5건은 이번 변경과 무관한 `packages/intraday-mistake-note/CM.md`의 SHADOW 규칙 만료(`UNTIL:2026-08-04`) 때문에 발생한다.

- `packages/intraday-mistake-note/__tests__/memory.test.ts`: 1건
- `lib/server/paperTrading/decisionProviders/__tests__/intradayConviction.test.ts`: 4건

CM은 자동 생성 산출물이므로 이번 상품화 작업에서 직접 수정하지 않았다. 관련 신규·회귀 테스트 29건은 모두 통과했다.

## 브라우저 라운드트립

1. 통과한 프로덕션 빌드를 `next start`로 로컬 실행했다.
2. 390×844에서 전략·금액 시나리오·위험 확인·면책을 확인했다.
3. 위험 확인 전 CTA disabled, 체크 후 enabled를 확인했다.
4. 1280×900에서 전략 지표 4열과 가로 넘침 0을 확인했다.
5. 테스트 서버와 임시 브라우저 탭을 종료했다.

## 에지 케이스

- 잘못되거나 10분보다 오래된 위험 확인 시각은 시작 API에서 422다.
- 서버 시각보다 1분 넘게 미래인 확인 시각도 422다.
- 종료된 런의 신규 응답은 409다.
- 이미 저장된 동일 응답은 만료 전 기존 멱등 규칙을 유지한다.
- 최신 가이드가 바뀌면 미응답 과거 알림은 활동 목록에 중복 노출하지 않는다.
- KIS 미설정은 `실시간 랭킹 연결 대기`로 표시하고 수익 신호처럼 보이지 않는다.
