# QA — AI 단타 가이드 상품화

- 브랜치: `feature/ai-intraday-guide-product`
- 대상: `/intraday`, 오토파일럿 가이드 응답 BFF·원장, 반응형 상품 UI
- 기준 문서: `docs/prd/ai-intraday-guide-product.md`, `docs/design/ai-intraday-guide-product.md`

## 수용 기준 검증

| AC | 재현·검증 | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| AC-1~2 | 시작 전 `/intraday` 진입 | 오늘 이용권·가격·체험 상태·기준 금액·단일 CTA | 9,900원, `결제 연동 전 체험`, 금액 입력, `오늘 가이드 시작하기` 노출 | PASS |
| AC-3~4 | 가이드 피드 뷰 모델·컴포넌트 검사 | 최신 미응답 1건을 큰 카드로, 가격·수량·금액·근거 표시 | `currentGuide=pending[0]`, 나머지는 대기 수로 축약 | PASS |
| AC-5 | 수행 버튼 흐름 검사 | 인라인 재확인 후 서버 저장 | `매수/매도했어요` → 확인 영역 → `네, 수행했어요` | PASS |
| AC-6 | 패스 mutation 검사 | 해당 guideId만 passed | 결정적 ID로 단일 PATCH, 원장에 executedQuantity=0 | PASS |
| AC-7 | `guideFeed.test`, `runStore.test` | 수행 BUY 없는 SELL 숨김·서버 거절 | UI 빈 배열, 서버 `no_position` | PASS |
| AC-8 | `runStore.test` | 같은 응답 멱등, 상충 응답 409 근거 | 원장 키 1개 유지, `conflict` 반환 | PASS |
| AC-9 | 타입·서버 코드 검사 | tick/order 불변, guideResponses 별도 | `AutopilotRun.guideResponses` JSON payload 확장 | PASS |
| AC-10 | 피드 테스트 | 최신 원본만 대기, 응답은 활동 이력 | 최신 SELL 발생 시 오래된 미응답 BUY 만료 테스트 통과 | PASS |
| AC-11 | 모바일·데스크톱 DOM 확인 | 기존 도구 보존, 보조 영역으로 접힘 | `직접 분석 도구` details 아래 검색·표·캘리브레이션 유지 | PASS |
| AC-12 | 390×844, 1280px 브라우저 검사 | 가로 스크롤 없음, CTA·입력 접근 가능 | 390px `scrollWidth=clientWidth`, 카드 362px, CTA 332px, 콘솔 오류 0 | PASS |
| AC-13 | 카피·DOM 검사 | 한글·면책·PG 미연동 표시 | ticker 외 신규 UI 한글, 실제 주문/수익 비보장 문구 노출 | PASS |
| AC-14 | research 진입점·런 타입 검사 | 상품과 별도로 모의투자 시작, 장중 원장 지속 | `직접 분석 도구`에 버튼 복원, `purpose=research`, 기존 스케줄러·가상체결 재사용 | PASS |

## 자동 검사

- `npx @google/design.md lint docs/design/ai-intraday-guide-product.md` → errors 0, warnings 0.
- `npm test` → 146 files passed, 1,309 tests passed, 기존 live 3 files/3 tests skipped.
- 핵심 재검사: `guideFeed.test.ts` + `runStore.test.ts` → 17 tests passed.
- `npm run typecheck` → 통과.
- 변경 파일 ESLint → 통과.
- `npm run build` → sandbox 내부 포트 바인딩 제한으로 1차 Turbopack panic 후 권한 확장 재실행, compiled/typecheck/static generation 75/75 통과.

## 브라우저 검증

1. 데스크톱 1280px에서 상품 카드가 main 폭 안에 들어오며 가격·설명·기준 금액·CTA가 동일 카드에 표시됨.
2. 모바일 390×844에서 상품 헤더를 세로 배치해 설명 폭을 확보함. 문서 폭과 viewport 폭 모두 390px로 가로 스크롤 없음.
3. 기준 금액을 500,000원으로 바꾸고 시작 CTA 클릭 시 `기준 금액은 100만 원 이상 입력해 주세요.`가 alert로 노출됨.
4. 브라우저 콘솔 error 0건.

## 에지 케이스

- 레거시 런의 `guideResponses` undefined는 빈 원장으로 처리한다.
- 남의 owner 런과 다른 런의 session/tick/order guideId는 저장할 수 없다.
- 동일 guideId 재전송은 중복되지 않고, 수행↔패스 변경은 거절된다.
- 수행 보유보다 큰 가상 SELL 수량은 가이드 보유 수량으로 제한된다.
- 같은 종목의 더 최신 원본 주문이 생기면 오래된 미응답 주문은 행동 대상에서 제외된다.

## 잔여 범위

- 실제 PG 결제·환불·영수증은 본 PR의 비목표다. UI에 체험 상태를 명시했다.
- 실제 증권사 체결 검증은 하지 않으며 사용자의 `수행했어요` 응답을 신뢰한다.
