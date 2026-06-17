# QA Report: codex-token-usage

- **선행 작업**: PR #129 `feat(ai-analysis): 토큰 사용량 대시보드 + 분석 패널 백그라운드 유지`
- **브랜치**: `feature/codex-token-usage`
- **검증일**: 2026-06-18

## 실측 스키마

Codex CLI `0.140.0-alpha.19`에서 `exec --json`을 직접 실행해 다음 JSONL 이벤트를 확인했다.

| 데이터 | 이벤트 경로 |
|---|---|
| 최종 분석 본문 | `item.completed` → `item.type="agent_message"` → `item.text` |
| 전체 입력 토큰 | `turn.completed` → `usage.input_tokens` |
| 캐시 입력 토큰 | `turn.completed` → `usage.cached_input_tokens` |
| 출력 토큰 | `turn.completed` → `usage.output_tokens` |

저장 시 신규 입력은 `input_tokens - cached_input_tokens`, 캐시 입력은
`cache_read_input_tokens`로 분리한다. Codex CLI 이벤트에 비용이 없어 `cost_usd`는 null이다.

## AC별 결과

| AC | 재현 | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| Codex JSON 모드 | 짧은 프롬프트를 `codex exec --json`으로 실행 | JSONL에 본문·usage 포함 | `item.completed` 본문, `turn.completed` usage 확인 | 통과 |
| 본문 보존 | JSONL과 순수 텍스트 샘플 파싱 | 최종 본문 유지 | 두 형식 모두 본문 추출 | 통과 |
| 토큰 분해 | input 8109, cached 1920, output 7 샘플 | 신규 6189, 캐시 1920, 출력 7 | 기대값과 일치 | 통과 |
| fail-soft | usage 없는 JSONL 파싱 | 본문 유지, `measured=false` | 기대값과 일치 | 통과 |
| Claude 무회귀 | Claude JSON envelope 단위 테스트 | 기존 `result` 추출 유지 | 통과 | 통과 |

## 자동 검증

- `vitest run`: **267 passed / 1 skipped**
- `tsc --noEmit`: 통과
- `eslint .`: 통과
- `next build`: 통과

빌드에는 기존 `tailwind.config.ts` module type 및 NFT trace 경고가 있었으나 컴파일·정적
페이지 생성은 정상 완료됐다.

## Supabase 확인

- Supabase 프로젝트 `trading-signal-engine`의 SQL Editor에서
  `docs/sql/ai-agent-usage.sql` 실행 완료.
- service-role REST 조회: `HTTP 200`, 빈 배열 반환 — 테이블·PostgREST 스키마 반영 확인.
- 최초 DDL 실행 뒤 anon 키 조회도 `HTTP 200`으로 허용되는 것을 확인했다.
- `ai_agent_usage`에 RLS를 활성화하고 정책을 두지 않아 anon/authenticated 요청에는
  행이 노출되지 않는다(`HTTP 200`, 빈 배열). service role REST 조회도 계속 정상 동작한다.

## 남은 end-to-end 확인

- 실제 Codex 종합 분석 1회를 실행해 `provider='codex'`, `measured=true` 행과
  `/analyze` Codex 탭 렌더링을 확인한다.
