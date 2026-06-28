# QA — /analyze 상위 탭 URL 쿼리 동기화 (analyze-tab-url)

- 대상 PR: `feature/analyze-tab-url`
- 범위: `/analyze` 상위 탭(분석 결과 / 토큰 사용량) 상태를 URL 쿼리(`?tab=usage`)로 단일화. 상위 탭만(provider 서브탭 제외).
- 검증 환경: 로컬 `next dev --webpack` (3011), worktree 격리

## 수용 기준 (AC)

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `/analyze` 진입 | 기본 "분석 결과" 탭, URL은 쿼리 없는 `/analyze` | 200, 결과 탭 활성 | ✅ |
| AC-2 | "토큰 사용량" 클릭 | URL이 `/analyze?tab=usage`로 교체 | router.replace(scroll:false)로 교체 | ✅ |
| AC-3 | `?tab=usage` 새로고침 | 토큰 사용량 탭 유지(이전엔 결과로 리셋) | 200, URL이 단일 출처 | ✅ |
| AC-4 | `/analyze?tab=usage` 직접 입력/공유 | 토큰 탭으로 열림(딥링크) | 200 | ✅ |
| AC-5 | 뒤로/앞으로 | URL 따라 탭 동기화 | useSearchParams 재구독 | ✅ |
| AC-6 | "분석 결과" 복귀 | URL이 깨끗한 `/analyze`(쿼리 제거) | analyzeTabHref results=경로 | ✅ |
| AC-7 | 오타 파라미터(`?tab=xyz`) | 기본(결과)로 폴백 | analyzeTabFromParam (단위테스트) | ✅ |
| AC-8 | 결과 탭 툴바(종목 수·새로고침) portal | 탭 전환 후에도 정상 | toolbarSlot 무변경 | ✅ |

## 회귀 / 정적 검증
- `npx tsc --noEmit` — 0 error
- `npx eslint` (변경 4파일) — 0 warning
- `npx vitest run analyzeTab.test.ts` — 4/4 pass (usage/results/null/undefined/오타, href results·usage)
- 빌드 로그: `/analyze`·`/analyze?tab=usage` 200, **useSearchParams Suspense bailout 경고 0** (경계 정상)

## 에지 케이스
- useSearchParams → page.tsx `<Suspense fallback={null}>` 래핑(login 패턴)으로 CSR bailout 을 탭 영역으로 한정
- 기본 탭은 쿼리 없는 경로 유지(토스톤 깔끔 URL), usage만 명시 쿼리
- 잘못된 파라미터/미지정 → 결과 탭 폴백(throw 없음)

## 결론
PASS — 딥링크·새로고침·공유·뒤로가기 일관 동작, 정적 검증 통과, 기존 탭/툴바/토큰 대시보드 영향 없음.
