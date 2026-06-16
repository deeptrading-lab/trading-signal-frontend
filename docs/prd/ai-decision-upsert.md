# PRD — ai-decision-upsert (종목별 AI 최종 결론 공유 저장)

- **slug**: `ai-decision-upsert`
- **작성일**: 2026-06-16
- **대상 브랜치**: `feature/ai-decision-upsert`
- **UI 포함 여부**: yes

## 1. 배경

AI 종합분석의 최종 결론은 기존에 브라우저 로컬 저장소 중심으로만 남아, 다른 사용자가 같은 종목을 열었을 때 이전 포트폴리오 매니저 결론을 공유받을 수 없었다. 사용자는 히스토리가 아니라 **종목 코드별 최신 결론 1건**만 공유하면 충분하다고 정리했다.

## 2. 목표

- 종목 코드(`ticker`)를 키로 포트폴리오 매니저 최종 결론을 upsert 저장한다.
- 같은 종목을 다시 열면 저장된 이전 결론을 먼저 보여준다.
- 사용자가 명시적으로 버튼을 누르면 이전 결론을 참고해 오늘 분석을 다시 실행한다.
- 이전 결론은 **포트폴리오 매니저에게만** 참고·비교 자료로 전달한다.
- Supabase 환경변수가 없어도 로컬 분석 플로우는 중단하지 않는다.

## 3. 범위

- Supabase REST 기반 서버 저장소 `ai_analysis_decisions` 추가.
- `GET /api/stock/ai-analysis/decision?ticker=...` BFF 추가.
- `POST /api/stock/ai-analysis` 실행 시 서버가 이전 결론을 재조회하고 PM 프롬프트에만 주입.
- PM 최종 결론 생성 후 Supabase에 ticker 기준 upsert.
- 클라이언트 로컬 저장소 기반 결정 저장 제거.
- AI 패널 진입 UI에서 저장된 이전 결론 카드와 "이전 결론 참고해 오늘 다시 분석" 액션 노출.

## 4. 비범위

- 결론 히스토리/버전 관리.
- 사용자별 권한·소유권 모델.
- Supabase Auth/RLS 상세 정책.
- 이전 결론을 market/news/fundamentals/social/bull/bear/risk 에이전트에 전달하는 동작.

## 5. 수용 기준

| AC | 기준 |
|---|---|
| AC-1 | 저장된 결론이 없으면 기존 공급자 선택 흐름으로 진입한다. |
| AC-2 | 저장된 결론이 있으면 AI 패널 첫 화면에 이전 PM 결론을 먼저 보여준다. |
| AC-3 | "이전 결론 참고해 오늘 다시 분석" 클릭 시 저장된 provider로 분석을 시작한다. |
| AC-4 | "다른 AI 선택" 클릭 시 기존 Claude/Codex 선택 UI로 이동한다. |
| AC-5 | 클라이언트 POST body에는 이전 결론이 포함되지 않는다. |
| AC-6 | 서버는 분석 시작 시 ticker로 이전 결론을 조회하고 PM system prompt에만 참고 맥락을 붙인다. |
| AC-7 | PM final 이벤트 생성 후 ticker 기준으로 최신 결론을 upsert한다. |
| AC-8 | Supabase 미설정/저장 실패는 SSE 분석 실패로 전파하지 않는다. |

## 6. 구현 메모

- 테이블 제안은 `docs/sql/ai-analysis-decisions.sql`에 둔다.
- 서버 env는 `SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_URL`, 그리고 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`를 사용한다.
- 클라이언트는 BFF만 호출한다. Supabase URL/key를 직접 사용하지 않는다.

## 7. QA 계획

- 단위 테스트: Supabase 저장소 미설정/조회/upsert, 클라이언트 POST body 회귀.
- 정적 검증: `npm run typecheck`, `npm run lint`, `npm run build`.
- 로컬 브라우저: `/stock/005930`에서 AI 패널 열기, 저장 결과 없음/있음 UI 분기 확인.

## 8. 영향 분석

- **보안**: service role key는 서버 전용 env로만 사용해야 한다. `.env.example`와 README에 명시한다.
- **운영**: 테이블이 없거나 env가 없으면 이전 결론 UI만 비활성화되고 분석은 계속된다.
- **UX**: 이전 결론이 있는 경우 사용자의 첫 액션이 "바로 재분석"과 "다른 AI 선택"으로 분리된다.

## 9. OPEN QUESTION

- q1. Supabase RLS 정책은 운영 배포 전 별도 PR에서 확정할지?
  - PM 권고: MVP 로컬 검증 단계에서는 service role 서버 접근만 열고, 배포 전 RLS/권한 정책을 별도 보안 작업으로 분리한다.
