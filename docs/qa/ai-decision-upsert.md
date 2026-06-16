# QA 리포트: ai-decision-upsert

- **slug**: `ai-decision-upsert`
- **작성일**: 2026-06-16
- **대상 브랜치**: `feature/ai-decision-upsert`
- **판정**: 조건부 통과 — Supabase 미설정 환경의 로컬 플로우 통과, 실제 저장 라운드트립은 env/테이블 적용 후 확인 필요

## 0. 변경 개요

AI 종합분석의 포트폴리오 매니저 최종 결론을 종목 코드별 1건으로 공유 저장한다. 이전 결론이 있으면 패널 첫 화면에 먼저 보여주고, 사용자가 버튼을 누르면 해당 결론을 PM에게만 참고 자료로 전달해 오늘 분석을 다시 실행한다.

## 1. AC 검증

| AC | 검증 내용 | 결과 |
|---|---|---|
| AC-1 | 저장 결론 없음 → 기존 공급자 선택 흐름 유지 | 브라우저 검증 통과 |
| AC-2 | 저장 결론 있음 → 이전 PM 결론 카드 우선 노출 | 코드 검증 통과 |
| AC-3 | "이전 결론 참고해 오늘 다시 분석" → 저장 provider로 실행 | 코드 검증 통과 |
| AC-4 | "다른 AI 선택" → Claude/Codex chooser 노출 | 코드 검증 통과 |
| AC-5 | 클라이언트 POST body에 `prevDecisions` 없음 | 단위 테스트 통과 |
| AC-6 | 서버가 ticker로 이전 결론 조회 후 PM에게만 주입 | 코드 검증 통과 |
| AC-7 | PM final 이후 ticker 기준 upsert | 단위 테스트 통과 |
| AC-8 | Supabase 미설정/저장 실패가 분석 실패로 전파되지 않음 | 단위 테스트 통과 |

## 2. 자동 검증

```text
npm test -- --run lib/api/stock/__tests__/aiAnalysis.test.ts lib/server/ai/__tests__/decisionStore.test.ts lib/server/ai/__tests__/agentCli.test.ts
→ 3 files passed, 10 tests passed

npm test
→ 40 files passed, 257 tests passed, 1 skipped

npm run typecheck
→ 0 error

npm run lint
→ 0 error

npm run build
→ 성공
```

## 3. 로컬 라운드트립

```text
npm run dev
→ http://localhost:3000 ready

GET /api/stock/ai-analysis/decision?ticker=005930
→ 200 OK
→ {"configured":true,"decision":null}

Supabase REST 직접 확인
→ GET /rest/v1/ai_analysis_decisions?select=ticker,provider,updated_at&limit=1
→ HTTP 200, []

/stock/005930 → "AI 종합분석" 클릭
→ 저장된 이전 분석 조회 로딩 후, 이전 결론 없음 상태로 Codex 공급자 선택/시작 UI 노출
```

## 4. 미검증 / 추가 확인 필요

- 실제 AI 분석 완료 후 PM final upsert 확인.
- 저장 결론 있음 분기 라운드트립.

## 5. 리스크

- `SUPABASE_SERVICE_ROLE_KEY`가 없으면 저장은 의도적으로 skip된다.
