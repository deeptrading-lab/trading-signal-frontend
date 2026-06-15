# QA 리포트: ai-provider-chooser

- **slug**: `ai-provider-chooser`
- **작성일**: 2026-06-16
- **대상 브랜치**: `feature/ai-provider-chooser`
- **판정**: qa-passed
- **트랙**: 경량 반복(PRD 생략, 직전 `codex-ai-analysis` QA의 "헤더 토글" AC를 본 개편이 대체하므로 QA 리포트로 재커버)

## 0. 변경 개요

종목 상세(`/stock/[ticker]`)의 AI 종합분석 진입 UX 개편.

- 헤더의 `[AI 분석 | Claude | Codex]` 세그먼트 컨트롤 → **단일 "AI 종합분석" 버튼**(Codex 추가 전 형태 복원).
- 버튼 클릭 시 패널이 열리되 **자동 실행하지 않고**, 패널 안 공급자 선택 화면(ProviderChooser)을 노출.
- 로컬 설치 CLI(claude·codex)를 **사전 감지**(`GET /api/stock/ai-analysis/providers`)해 가능한 공급자만 제시.
- 패널 헤더의 Claude/Codex 토글 제거 → 실행 중 공급자는 읽기 전용 배지로 표시(선택은 chooser로 일원화).

## 1. AC 검증

| AC | 검증 내용 | 결과 |
|---|---|---|
| AC-1 | 헤더에 단일 "AI 종합분석" 버튼만 노출(세그먼트 제거), 클릭 시 패널 오픈·자동 실행 없음 | 통과 |
| AC-2 | `GET /providers` 응답 계약 `{vercel, providers:{claude,codex}, available:[]}` + `Cache-Control: no-store` | 통과 |
| AC-3 | 가용성 0/1/2개·Vercel 4분기 → chooser 렌더 매핑 정확(경계 0,1,2) | 통과 |
| AC-4 | 1개 설치: "{공급자}로 분석할 수 있어요. 시작할까요?" + [분석 시작] → 해당 공급자로 실행 | 통과 |
| AC-5 | 2개 설치: Claude·Codex 카드 → 클릭한 공급자로 실행 | 통과(코드 검증, 본 머신은 codex 미설치로 단일 분기만 실호출) |
| AC-6 | 조회 실패(network/5xx): "미설치"와 구분된 오류 카피 + 다시 시도(refetch) 노출 | 통과 |
| AC-7 | 재열기→"새로 분석"/"다시 선택" → chooser 복귀(즉시 재실행 아님)와 카피 정합 | 통과 |
| AC-8 | 종목 간 이동 시 진행 중 스트림 abort + 상태 초기화(잘못된 ticker 저장 방지) | 통과 |
| AC-9 | `isVercelEnv` 단일화로 ai-analysis·ai-signal·workbench(analyze·claudeCli) 503 가드 무회귀 | 통과 |
| AC-10 | 기존 12-에이전트 분석·resume·stop 경로 무회귀(토글/selectProvider 제거 영향 없음) | 통과 |
| AC-11 | 타입체크·린트·빌드 | 통과 |

## 2. 자동 검증

```text
npx tsc --noEmit   → 0 error
npm run lint       → 0 error
npm run build      → 성공, /api/stock/ai-analysis/providers dynamic(ƒ) 등록
npx vitest run lib/server/ai/__tests__/agentCli.test.ts → 5 passed
```

## 3. 라운드트립 (로컬 실호출)

```text
GET /api/stock/ai-analysis/providers
→ 200 OK, cache-control: no-store
→ {"vercel":false,"providers":{"claude":true,"codex":false},"available":["claude"]}
POST 동일 경로 → 405 (GET만 export)
반복 GET → 모듈 30s TTL 캐시로 응답 안정
```

본 머신에는 claude만 설치 → `available:["claude"]` → 단일 공급자 분기("Claude로 분석할 수 있어요. 시작할까요?") 노출. 명세와 일치.

## 4. 보안 / 배포

- `detectCli`는 `fs.accessSync(X_OK)`만 수행(spawn/exec 없음). 외부 입력이 경로에 유입되지 않으며 응답에 실제 경로 미노출(boolean/키만).
- Vercel 환경에서는 `detectProviders()` 호출 전 조기 반환 → 서버리스 fs 접근 0건, 항상 `{vercel:true, available:[]}`.

## 5. 점검 중 발견 → 조치 완료

- (major) 조회 실패를 "CLI 미설치"로 오인 + 재시도 부재 → 전용 오류 카피 + refetch 버튼 분리.
- (major) 종목 간 이동 시 상태 미초기화로 잘못된 ticker에 `saveDecision` 위험 → `useAIAnalysis`에 ticker 변경 effect(abort+reset) 추가.
- (minor) "재분석하기/처음부터" 카피가 실제 동작(chooser 복귀)과 불일치 → "새로 분석/다시 선택"으로 정정.
- (minor) dead `COPY.chooser.select` 제거, 단일 공급자 색·아이콘 연속성·여백 통일·aria-live 보강.

## 6. 잔여 / 후속

- 한글 카피 세로 깨짐(과거 발견)은 `w-full` + `break-keep`로 해소.
- 공급자 3개 이상 확장 시 chooser `grid-cols-2` 재검토(현 시점 조치 불필요).
