# QA — marketdata-observability

- 실행: 2026-07-02 23:2x KST, 로컬 dev(:3000, MARKET_DATA_SOURCE=toss 활성) + 단위 테스트
- 범위: 경량 반복 플로우(PRD 없음) — PR#199 "다음 작업"의 관측성 항목. 시세 4개 라우트(price·daily·chart·chart-minute)의 `X-Data-Source` 를 실제 서빙 소스로 교체 + 프로세스당 1회 소스 판정 로그.

## 검증 결과

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 토스 서빙 헤더 | 토글 on dev 서버에서 4개 라우트 curl | `X-Data-Source: toss` | 4/4 라우트 `toss` (price·daily·chart 400d·chart-minute) | ✅ |
| kis 직행 헤더 | 토글 off (단위 테스트 — Next 16 dev 싱글턴 제약으로 두 번째 서버 부팅 불가, 비고 1) | `servedSource="kis"` | 단위 테스트 통과 | ✅ |
| 폴백 헤더 | toss 실패 + KIS 폴백 (단위 테스트) | 데이터 실제 출처인 `kis` | 통과 — 헤더는 토글 상태가 아니라 응답 데이터 출처 | ✅ |
| 혼합 표기 | 다콜 중 일부만 폴백 (단위 테스트) | `toss,kis` | 통과 | ✅ |
| mock 경로 무회귀 | KIS 미설정/타임아웃 분기 | 기존 `mock`/`mock-timeout` 그대로 | 라우트 분기 무수정(추적은 성공 경로만 관여) | ✅ |
| 1회 소스 로그 | 최초 시세 호출 시 `[marketdata] 시세 소스: …` 1줄, toss 지정+키 없음이면 게이트 warn | 프로세스당 1회 | 단위 테스트(2회 호출→1회 로그) 통과 | ✅ |
| 전체 스위트 | typecheck / lint / test | 무회귀 | 0 에러 / 0 / **666 passed** (+7 신규) | ✅ |

## 구현 메모

- `trackMarketDataSource(fn)` — `AsyncLocalStorage` 기반 요청 단위 추적. `withTossFallback` 이 성공 소스를 기록하고 라우트가 헤더로 노출. 추적 밖 호출(cron·lib 직접 호출)은 기록만 생략되고 동작 동일(테스트 케이스 포함).
- 라우트 diff는 각 2~4줄(트래킹 래핑 + `servedSource ?? "kis"`). 에러/mock 분기 무수정.

## 비고

1. Next 16 은 프로젝트 디렉터리당 dev 서버 1개 제약이 있어(사용자 서버 :3000 가동 중) 토글 off/폴백 조합의 라우트 레벨 재부팅 검증은 생략, 동일 로직의 단위 테스트 6케이스로 대체. 토글 off 헤더는 다음 kis 모드 구동 시 자연 확인됨.
2. snapshot·ai-analysis 등 다중 소스 합성 라우트는 본 트랙 비범위 — 필요해지면 같은 `trackMarketDataSource` 로 확장 가능.
