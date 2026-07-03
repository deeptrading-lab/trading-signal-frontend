# QA — watchlist-warning-badge (관심종목 행 경고 배지 + 테스트 위생)

- 실행: 2026-07-03 13:30~13:40 KST — QA 역할
- 환경: 로컬 dev(TOSS 키) + 유닛(vitest)
- 대상: `feature/watchlist-warning-badge`

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 키 없음 | `useQueryStockWarningsBatch` → 배치 BFF `none` 분기 | 배치 무호출·칩 미표시 | 배치 fn `isTossConfigured` 게이트(유닛 커버) | ✅ |
| AC-2 지정 종목 | 배치 `?tickers=001210,005930` (dev 실서버) | 001210=투자경고, 005930=[] | 실응답 정확 → 행 칩 배선 | ✅ |
| AC-3 무경보/실패 | 005930 빈 배열 | 칩 없음 | `StockWarningBadges` 빈 배열 = null 렌더 | ✅ |
| AC-4 디그레이드 행 | quote 없는 행 + warnings prop | 경보 있으면 칩(quote 무관) | 디그레이드 분기에도 `StockWarningBadges` 배선(코드) | ✅ |
| AC-5 vitest exclude | 무스코프 `npx vitest run` | 중첩 node_modules·워크트리 테스트 미수집 | 184→92 파일(워크트리 복제·3rd-party 제거), 750 passed/0 fail | ✅ |

## 라운드트립 / 회귀

- `/watchlist` 렌더 200(dev). 배치 BFF `?tickers=001210,005930` → 001210 투자경고 검출.
- 무스코프 `vitest run`: **89 files / 750 passed / 0 failed**(이전 무스코프 run 의 12 파일 오탐 소거 +
  워크트리 복제 중복 제거). `tsc` 클린, `next build` 성공, eslint 클린.

## 커버리지 노트

- 배지 렌더는 공유 `StockWarningBadges`(#205, `toWarningChips` 유닛 커버) + 조건부 렌더라 리스크 낮음.
  컨테이너→표→행 prop 스레딩은 tsc 로 검증. 시각 확인(001210 관심종목 담아 "투자경고" 칩)은 브라우저
  익스텐션 미연결로 미실시 — **사용자 1회 확인 권장**.
- 배치 훅은 관심종목 페이지 진입당 1회(가시 티커, 60s 캐시) — 관심종목 수 ≤ 저장 상한이라 캡(50) 여유.
