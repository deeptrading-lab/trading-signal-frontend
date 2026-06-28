# QA — 토큰 대시보드 분석별 추세 + 회귀 감지 (usage-run-trend)

- 대상 PR: `feature/usage-run-trend`
- 범위: `/analyze` → 토큰 사용량 탭에 "분석별 추세 (회귀 감지)" 선차트 추가 (run 시계열 + 중앙값 baseline + 임계 초과 이상치)
- 검증 환경: 로컬 `next dev --webpack` (3010), Supabase 실데이터(분석 30회), worktree 격리

## 수용 기준 (AC)

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | 토큰 사용량 탭 → "분석별 추세" 카드 | 모델별 비용 카드 아래 선차트 노출 | 30포인트 선차트 노출 | ✅ |
| AC-2 | 지표 토글 (비용/소요/토큰) | 토글 시 차트·헤드라인 전환 | 3지표 전환 정상 | ✅ |
| AC-3 | 중앙값 기준선 + 임계 초과 이상치 | 중앙값 점선 + ×1.3 초과 빨간 점 | 중앙값 $3.12, 30회 중 3회 빨간 점 | ✅ |
| AC-4 | 최신 분석 헤드라인 | 최신값 + 중앙값 대비 delta | 최신 $4.50 +44% · 중앙값 $3.12 | ✅ |
| AC-5 | run 시계열 정렬 | 오래된→최신 시간순 | endedAt asc, X축 날짜 증가 | ✅ |
| AC-6 | 툴팁 | 종목·시각·값·이상치 표시 | full date+ticker+value(+기준 초과) | ✅ |
| AC-7 | Codex 탭 (비용 미측정) | 비용 대신 소요로 자동 폴백 | defaultMetric→duration (단위테스트) | ✅ |
| AC-8 | 표본 부족(<2) | 차트 대신 안내 문구 | TREND_EMPTY/NO_DATA 분기 (코드·테스트) | ✅ |

## 회귀 / 정적 검증
- `npx tsc --noEmit` — 0 error
- `npx eslint` (변경 9파일) — 0 warning
- `npx vitest run runTrend.test.ts runSeries.test.ts` — **12/12 pass**
  - runSeries 4: run 그룹핑·종료시각 정렬·합계·wall-clock(span)·codex null
  - runTrend 8: metricValue, 중앙값 baseline, 이상치 카운트, 최신 delta, codex null, 일부 null 제외, defaultMetric
- usage API 응답에 `runSeriesByProvider` 추가(claude 30포인트 확인), 기존 필드 무변경

## 에지 케이스
- 비용 전부 null(codex) → median/latest/delta null, 이상치 0, 소요 지표로 폴백
- 일부 run 미측정 → 해당 포인트는 중앙값·이상치 판정 제외, 선은 connectNulls
- provider 전환 시 `key={provider}`로 지표 선택 초기화

## 결론
PASS — 회귀 감지 정확(실데이터 3건 이상치 식별), 정적 검증 통과, 기존 대시보드/차트 영향 없음(비파괴 확장).
