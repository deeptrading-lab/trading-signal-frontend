# 거래량 상위 상승 후보 QA — 2026-11-18

| AC | 재현 | 기대 | 실측 |
| --- | --- | --- | --- |
| 후보 제한 | 거래량 순위에 상승·보합·하락·중복 행 제공 | 상승만 순서 보존·중복 제거, 출처 volume 단독 | 통과 |
| 수급 독립 | 수급 함수 대역과 거래량 함수 호출 감시 | 수급 조회 0회, volume 기준 조회 1회 | 통과 |
| 숫자·입력 검증 | NaN/Infinity 등락률·가격, 0 거래량, 잘못된 코드 | 신규 후보 제외 | 통과 |
| 빈 상태와 실패 | 보합·하락 순위 / API 오류 / 연동 미설정 | empty / unavailable / 조회하지 않음 | 통과 |
| 매수 직전 상승 | 돌파 조건은 충족하지만 현재가가 추정 전일 종가 이하 | 매수 0건 | 통과 |
| 구버전·수급 후보 | 상승 필드 누락·수급 단독·혼합 출처 후보, 정상 후보와 함께 제공 | 구버전 시작 차단, 수급 행 진입 차단 | 통과 |
| 만료 | 유효한 상승 후보의 유효기간 경과 | 시작 차단 | 통과 |
| 위험관리 | 매수 후 후보 삭제, 손절 가격 제공 | 손절 처리·보유 0 | 통과 |
| 규칙 버전 | 신규 임시 원장 기록 및 복기 생성 | program-v4-volume-positive | 통과 |
| 다이어그램 | template에서 rules·요약·상세·매수·매도·정산 생성 후 check | 생성물 일치 | 통과 |

라운드트립: 순위 fixture → 후보 생성 → 엔진 시작·매수 전 재검증, Toss 시세 fixture → 엔진 가상 체결·손절, 임시 원장 → 재시작 → 복기 JSON, 다이어그램 API 테스트를 실행했다.

검증 명령:
- `npm test -- lib/server/programTrading app/api/program-trading scripts/__tests__/programTradingWorkflow.test.ts`: 10개 파일, 48개 테스트 통과.
- `npm run typecheck`: 통과.
- 변경 TypeScript 파일 ESLint: 통과.
- `ARCHIFY_HOME="$PWD/.local/program-trading/tooling/archify" npm run program:rules` 및 `program:rules:check`: 통과.
- `git diff --check`: 통과.

기존 화면 구조·스타일·토큰 변경 없이 카피만 수정했다. 브라우저 두 뷰포트 육안 검사와 실환경 순위 호출·새 전략 장중 운용은 실행하지 않았다. 실행 중 전역 런타임은 서버 재시작 후 교체되므로 새 기준의 실운용 적용 여부·수익 개선은 미검증이다. 기존 원장·완료 결과는 읽기만 했다. 작업 시작 전 있던 성과 화면·토스 클라이언트 수정은 유지했다.

검토 근거: [PRD](../prd/volume-positive-candidates.md), [규칙 다이어그램](../program-trading/rules.html).
