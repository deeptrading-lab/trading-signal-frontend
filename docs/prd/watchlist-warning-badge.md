# PRD — watchlist-warning-badge (관심종목 행 경고 배지 + 테스트 위생)

- 작성: PM 역할 (2026-07-03)
- 브랜치: `feature/watchlist-warning-badge`
- 선행: PR #204/#205/#207 (매수 유의사항 트랙 §4 후속 ⑤).

## 1. 배경 / 문제

`components/watchlist/WatchlistRow.tsx` 에 "거래정지/관리종목 배지 미표시(보류) — 데이터 소스 부재"
주석이 남아 있다. #205 로 배치 조회 훅(`useQueryStockWarningsBatch`)과 공유 배지 컴포넌트
(`StockWarningBadges`)가 생겨 이 보류를 **매수 유의사항(시장경보·VI)** 배지로 닫을 수 있다.

부수적으로, 무스코프 `npx vitest run` 이 병렬 세션 워크트리의 중첩 `node_modules/**` 3rd-party
테스트를 글로빙해 "실패"로 집계된다(#207 QA 환경 노트). `exclude` 패턴이 최상위 `node_modules/**`
만 잡는 탓 — 한 줄 chore 로 정리한다.

## 2. 목표

- 관심종목 표의 각 행 종목명 옆에 활성 매수 유의 경고 칩(정리매매·투자위험·투자경고·단기과열·VI).
- 토스 키 없음·실패·빈 배열 = 미표시(레이아웃 무변화). 배치 1회 조회(가시 행 티커).
- `vitest.config` exclude 를 `**/node_modules/**` 로 — 중첩 워크트리 테스트 글로빙 제거.

## 3. 범위 (In scope)

- `WatchlistContainer`: `useQueryStockWarningsBatch(tickers)` → `warningsByTicker` 를 표에 전달.
- `WatchlistTable`: `warningsByTicker?` prop 을 각 행에 by-ticker 전달.
- `WatchlistRow`: `warnings?` prop → 정상 행·디그레이드 행 모두 종목명 옆 `StockWarningBadges`(max 1·sm).
  보류 주석을 "시장경보·VI 배지 표시(토스 warnings)"로 갱신(거래정지/관리종목 자체는 별개 유지).
- `vitest.config.ts`: `exclude` 의 `node_modules/**` → `**/node_modules/**`.

## 4. 비범위

- ③ 밸류트랩 스냅샷(소비자=봇 레포), ⑦ 스코어카드 스탬프(경보 이력 없음·사후분석 보류).
- 거래정지·관리종목 자체 배지(warnings API 미제공 — 관리종목은 #201 KIS 보강 경로).

## 5. 수용 기준 (AC)

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | 키 없음 | 배치 무호출·칩 미표시, 표 무변경 |
| AC-2 | 지정 종목 담김 | 종목명 옆 경고 칩(정리매매=critical 등) |
| AC-3 | 무경보/실패 | 칩 없음(레이아웃 무변화) |
| AC-4 | 디그레이드 행(시세 실패) | 경보 있으면 칩 표시(quote 무관) |
| AC-5 | vitest exclude | 무스코프 run 이 중첩 node_modules 테스트 미글로빙 |

## 6. 영향 분석

- 표시 전용 추가 — 배치 훅은 fail-soft(빈 맵), 행 렌더 무영향. 신규 토스 콜: 관심종목 페이지
  진입당 배치 1회(가시 티커, 60s 캐시).
- `vitest.config` exclude 강화는 프로젝트 테스트 수집에 영향 없음(중첩 node_modules 만 추가 제외).
