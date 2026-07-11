# QA — AI 단타 자동 포트폴리오

- 대상 브랜치: `feature/intraday-portfolio-auto`
- 범위: 금액 단일 입력 → 수급·거래량 후보 합성 → 3~5종목 배분 → 종목별 AI 단타 세션 생성 → 합산 현황
- 실제 주문: 없음(기존 모의매매 전용)

## 수용 기준 검증

| AC | 재현·검증 | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| AC-1 | `IntradayAutoPortfolio` 입력 구조 정독 | 필수 입력은 투자금 하나 | numeric input 1개 + 시작 CTA, 위험·주기 입력 없음 | PASS |
| AC-2 | `portfolioPlan.test.ts` 중복 소스 케이스 | ticker 합성, 중복 우대 | A ticker 1개 유지, 수급·거래량 이유 2개 | PASS |
| AC-3 | 300만·1,000만 계획 테스트/코드 경계 | 금액별 3~5종목 | 300만=3, 1,000만=4, 3,000만 이상=최대5 | PASS |
| AC-4 | 1,000만원 계획 | 합산 현금 10%, 1만원 단위 | cashBuffer=100만원, 세션 예산 합=1,000만원, 전액 1만원 단위 | PASS |
| AC-5 | 정렬 코드·유닛 | 동일 입력 결정성 | score 내림차순 + ticker tie-break | PASS |
| AC-6 | `startPortfolio` 정독 | 기존 cli-agent 안전 설정 재사용 | balanced·5분·포지션−5%·세션−7% | PASS |
| AC-7 | 타입→route→store 왕복 | portfolio 메타 영속 | request optional 필드 3개가 session payload에 스탬프 | PASS |
| AC-8 | 자동 카드 렌더 분기 | 최신 묶음 합산 현황 | 종목 수·시작금·평가금·수익률·비중 표시 | PASS |
| AC-9 | workspace 후보 필터 | 오늘 세션 종목 제외 | `sessionByTicker.keys()` 기반 필터 | PASS |
| AC-10 | 최소금액·후보부족·예외 경로 | 한글 인라인 오류 | 100만원 미만 유닛 + `role=alert` 오류 렌더 | PASS |

## 자동 검증

- `vitest`: 전체 137 files, 1,235 tests passed, live 전용 3 tests skipped.
- `eslint`: 변경 TypeScript/TSX 파일 0 errors.
- `tsc --noEmit`: PASS. main pull 직후 남은 `.next` 구 라우트 타입 캐시는 삭제 후 `next typegen`으로 정상 재생성.
- `npx @google/design.md lint docs/design/intraday-auto-portfolio.md`: errors 0, warnings 1(기존 accent-vivid와 흰색 CTA 대비 3.71:1), info 1.
- `next build`: PASS, `/intraday`와 `/api/paper-trading/sessions` 포함 72개 정적 페이지 생성 완료. sandbox 내 Turbopack 포트 바인딩 제한은 sandbox 밖 동일 명령 재실행으로 통과.
- `git diff --check`: PASS.

## 미실측·후속

- 장중 KIS 실후보 + 로컬 CLI를 사용한 다종목 첫 판단은 시장 시간·외부 자격증명 의존이라 이번 정적 QA에서는 실행하지 않았다.
- 후보 일부 생성 후 CLI가 실패하면 앞서 만든 세션은 보존된다. 화면 재조회 후 기존 종목을 제외하고 재시도할 수 있으며, 장기적으로는 배치 진행률·재개 API를 별도 고려한다.
- 디자인 lint의 CTA 대비 warning은 기존 `accent-vivid` 제품 토큰을 그대로 쓴 결과다. 전역 토큰 변경은 다른 화면 영향이 커 본 작업에서 수정하지 않았다.
