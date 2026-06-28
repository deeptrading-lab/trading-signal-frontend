# QA — 토큰 대시보드 모델별 비용 분해 (usage-model-cost)

- 대상 PR: `feature/usage-model-cost`
- 범위: `/analyze` → **토큰 사용량** 탭에 "모델별 비용 (분석 1회 기준)" 카드 1개 추가 (읽기 전용·순수 파생, route/스키마/스토어 무변경)
- 검증 환경: 로컬 `next dev --webpack` (port 3010), Supabase 실데이터(분석 30회 기준), worktree 격리

## 수용 기준 (AC)

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `/analyze` → 토큰 사용량 탭 진입 | 비용 카드 아래 "모델별 비용" 카드 노출 | 카드 노출, CacheCost 카드와 AgentTokenBarChart 사이 배치 | ✅ |
| AC-2 | 모델별 비용 합 vs "분석 1회 평균 비용" 카드 | 두 값 합 일치(드리프트 없음) | sonnet $2.40 + opus $0.65 = $3.05 = 평균 비용 카드 | ✅ |
| AC-3 | 비용 비중 막대 | 비중 합 100%, 막대 길이 = 비중 | sonnet 78.6% / opus 21.4% = 100%, 막대 정합 | ✅ |
| AC-4 | 모델 패밀리 그룹핑 | claude-sonnet-4-6→sonnet, claude-opus-4-8→opus | opus=trader·portfolio_manager(2), sonnet=나머지 10 | ✅ |
| AC-5 | 입력 = 신규+캐시 합, 출력 합 | 토큰 천단위 콤마 | sonnet 485,776 / opus 39,899 | ✅ |
| AC-6 | 단가표 툴팁(?) | 공개 단가 + "실제 청구 기준" 안내 | InfoTooltip 노출 | ✅ |
| AC-7 | Codex 탭(비용 null) | 비용·비중 "—", 토큰은 집계 | 단위테스트로 검증(costShare/totalCost null) | ✅ |

## 회귀 / 정적 검증
- `npx tsc --noEmit` — 0 error
- `npx eslint` (변경 5파일) — 0 warning
- `npx vitest run components/analyze/__tests__/modelBreakdown.test.ts` — 6/6 pass
  - modelFamily 정규화, costShare 합=1, 비용 desc 정렬, codex(null) 처리, 일부측정 패밀리

## 에지 케이스
- 모델 null 행 → "미측정" 버킷, totalCost/costShare null → 막대 대신 "—"
- 전체 비용 0/null(codex) → 모든 비중 null, 막대 숨김
- 단일 모델 → 1행 100% (정상 노출)

## 결론
PASS — 기능 정확(실데이터 합 일치), 정적 검증 통과, 기존 카드/차트 영향 없음.
