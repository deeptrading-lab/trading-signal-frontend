# QA — swing-retire-legacy (PR-5: 기존 AI 종합분석 삭제)

- 실행: 2026-11-02 08:30~09:50 KST
- 대상: 브랜치 `feature/swing-retire-legacy`
- 근거: `docs/prd/swing-judgment.md` §5 PR-5 AC-5.1~5.6
- 전제 확인: 옛 파이프라인 마지막 판정 2026-09-02, `signal_scorecard` 채점 대기 0건(조회 스크립트, 읽기 전용).
- 삭제 경계: 탐색 에이전트가 import·`vi.mock`·동적 import·문자열 경로를 끝까지 추적해 "삭제 가능 / 수정 필요 / 다른 기능이 써서 유지" 지도를 만들고, 그 지도대로 지웠다. 함정 5개(단타가 쓰는 providers 라우트, 스윙 감사가 쓰는 통계 함수, 수급 크론 안의 채점 단계, 공용 파일 2개, 워커의 옛 라우트 호출)는 유지·이동·수정으로 처리.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-5.1 테스트·타입·린트·빌드 | `npx vitest run` · `npx tsc --noEmit`(.next 타입 재생성 후) · `npm run lint` · `next build` | 통과 | 테스트 **1,249 통과**(3 skip — 옛 파이프라인 테스트는 코드와 함께 삭제) · 타입 0 · 린트 에러 0(경고 3 기존) · 빌드 통과 | 통과 |
| AC-5.2 옛 경로 | dev 서버 `curl -X POST /api/stock/ai-analysis` · Playwright `/analyze`·`/dashboard/scorecard` | 404 · 리다이렉트 · 404 | POST 404 · `/analyze` → `/swing` · `/dashboard/scorecard` 404 화면 | 통과 |
| AC-5.3 단타 무회귀 | `GET /api/stock/ai-analysis/providers` · `/intraday` | 200 · 정상 | 200(`claude`·`codex` 감지) · 페이지 오류 0 | 통과 |
| AC-5.4 화면 | Playwright 390×844 — `/`·`/stock/005930`·`/stock/AAPL`·`/profile`·`/watchlist`·`/swing` | 정상 로드, "AI 종합분석" 없음 | 6개 모두 200·페이지 오류 0·"AI 종합분석" 문구 0. 삼성전자 = 헤더에 AI 버튼 없음·차트(현재가 알약) 정상·스윙 체크 카드 있음. AAPL = 스윙 카드 없음(기존 요약). 마이페이지 = "내 분석" 없이 내 종목·설정 | 통과 |
| AC-5.5 워커 | `node --env-file=.env.local --import tsx scripts/analysisWorker.ts` | 기동·폴링 | `[ai-worker] 기동 worker-… poll=12000ms` — 분석 큐·하트비트 없이 노트만 | 통과 |
| AC-5.6 동결 테이블 | 머지 전 행 수 기록 → 머지 뒤 재조회 | 불변 | 머지 전 `ai_analysis_decisions` 67 · `signal_scorecard` 130 · `ai_analysis_queue` 117. 머지 뒤 확인 | 머지 뒤 확인 |

## 정리한 것

- 삭제 188파일(라우트·화면·훅·서버 모듈·프롬프트·테스트·워크플로), 의존성 3개 제거(react-markdown·remark-gfm·@tailwindcss/typography → 101 패키지 감소), 안 쓰는 CSS(그라데이션 히어로·맥박 마크·마크다운 본문) 80줄.
- `lib/types/stock/aiAnalysis.ts` 는 남은 5개(공급자·토큰 사용량·CLI 가용성·시그널 압축본)만 남기고 정리.
- `.env.example`(자가교정 피드백 env 삭제·문구), README(스윙 체크·AI 노트 안내), AGENTS.md(라우트 도메인 목록·호출 예시) 갱신.

## 남는 것(의도)

- Supabase 테이블 `ai_analysis_decisions`·`signal_scorecard`·`ai_analysis_queue`·`ai_agent_usage`·`ab_run_config` 는 데이터 보존(쓰는 코드 없음). SQL 문서도 스키마 기록으로 둔다.
- 옛 PRD·분석 문서는 기록으로 둔다.
- Slack 봇의 종목 분석 명령은 동작하지 않는다(사용자 결정 — 당분간 봇 미사용).
