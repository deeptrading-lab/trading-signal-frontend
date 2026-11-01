# QA — swing-live-engine (PR-2: 스윙 스크리너·저장·조회 API)

- 실행: 2026-11-01 13:00~13:20 KST
- 대상: 브랜치 `feature/swing-live-engine`
- 근거: `docs/prd/swing-judgment.md` §5 PR-2 AC-2.1~2.7
- 성격: 서버(크론·BFF·저장) 추가. 화면 변화 없음 — UI·반응형·DESIGN.md 는 PR-3.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-2.1 테스트·타입·린트 | `npm test` · `npm run typecheck` · `npm run lint` | 통과 | 테스트 **1,668 통과**(3 skip, 기존) · 타입 오류 0 · 린트 에러 0(경고 3건은 이번에 안 건드린 기존 스크립트) | 통과 |
| AC-2.2 크론 인증·게이트 | `app/api/cron/swing-screener/__tests__/route.test.ts` | 시크릿 불일치 401 · 비-prod `kis-not-prod` | 두 테스트 통과(처리 미호출 확인) | 통과 |
| AC-2.3 같은 입력 = 같은 행 | `lib/server/swing/__tests__/swingServer.test.ts` | 같은 판정 → 같은 압축 행, 창 밖 변경은 해시 불변·창 안 변경은 해시 변화 | 통과 | 통과 |
| AC-2.4 시간 예산·이어받기 | 라우트 테스트 "구간 처리" | `next` 그대로 응답, offset>0 은 완료 마커 미조회 | 통과. 완료 마커 skip · finalize 2% 기준도 통과 | 통과 |
| AC-2.5 상세 = 스크리너와 같은 함수 · 오프라인과 정합 | `scripts/swing/__cache__/parity-check.mts`(1회용) — 같은 t(2026-10-30)를 라이브 `computeSwingJudgment` 와 오프라인 캐시 `judgeSwing` 으로 판정 | 입력 해시·판정 전체 동일 | 005930·000660·247540·196170 **4/4 해시·판정 완전 일치**. dev 서버 `/api/swing/judgment/005930` 의 `inputHash` 801ab92da77a3f3b 도 오프라인과 같음 | 통과 |
| AC-2.6 응답 크기·projection | `listSwingRows` 쿼리 | 50행 이하, 필요한 열만 | `select=` 13열 · `limit=50` 고정(코드) | 통과 |
| AC-2.7 prod 적용 | SQL 적용 → `workflow_dispatch` → `select count(*)` | 행 생성 | **사용자 승인 대기**(머지·SQL 적용 후 실행) | 보류 |

## 로컬 dev 확인 (로그인 게이트만 로컬에서 끄고 `next dev`, 운영 설정 무변경)

| 요청 | 결과 |
|---|---|
| `GET /api/swing/judgment/005930` | 200 · 첫 요청 7.0초(KIS 일봉 4·수급 1·지수 1·DART·경보) · 캐시 0.4초. 등급 제외(고변동, ATR 7.0% > KOSPI 경계 4.97%), 과거 통계 셀(제외·KOSPI n 16,674, 10일 상승 42.1% vs 같은 날 45.2%), `releaseMode: checklist` |
| `GET /api/swing/judgment/AAPL` | 404 "스윙 판정은 국내(KOSPI·KOSDAQ) 종목만 지원해요." |
| `GET /api/swing/screener?filter=flow` | 200 · 테이블 미생성 상태라 `tradeDate: null`, 빈 목록(실패 없이) |
| 로그인 게이트 켠 상태 `/api/swing/*` | 401(기존 proxy 규칙 — 크론만 공개, 자체 시크릿 인증) |

## 운영 관점

- 하루 호출량 추정: 유니버스 2,534 중 1차 거르기 통과 약 46% → KIS 약 7,200콜(초당 8회 이하) · 크론 호출 7회 × 약 2.5분.
- KV 캐시 키: `swing:td:<오늘>`(1시간) · `swing:dart:<t>`(3일) · `swing:judgment:<버전>:<t>:<종목>`(36시간) · `swing:screener:meta`(30일).
- 10월 말 급락장(삼성전자 20일 −17.9%)에서는 대형주 다수가 고변동으로 제외된다 — 사전 등록된 규칙 그대로의 결과.

## 해당 없음

UI·반응형·DESIGN.md 토큰(PR-3).
