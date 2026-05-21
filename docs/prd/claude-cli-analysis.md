# PRD: claude-cli-analysis

- **slug**: `claude-cli-analysis`
- **작성일**: 2026-05-22
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #22 머지 완료. main `59213c5`. 직전 PR #22 (component-compactness) 로 **3-section shell + 컴포넌트 컴팩트화** (input·dropdown·suffix·outside-click·작은 인터랙티브 톤 정합·nit 3건 흡수) 가 정착. 본 PRD 는 **3분할 PRD 중 마지막 (#3)** 으로, 분석 **결과의 데이터 소스 교체** 만 다룬다 — 현재 FastAPI BE (`trading-signal-engine`) → 향후 **Next.js BFF route handler 가 로컬 claude CLI 를 subprocess 로 호출**. UI 변경 없음.
- **UI 포함 여부**: **no** — UX/UI 디자이너 미합류. 화면·컴포넌트·DESIGN.md 모두 무수정. 본 PRD 는 BFF route handler + 환경 변수 + 응답 normalize 만 다룬다.
- **선행 / 후행 관계**:
  - **선행 (모두 머지 완료)**:
    - `workbench-analyze-rebuild` (PR #11) — 6블록 응답 shape + `lib/types/workbench/analyze.ts`.
    - `tailwind-migration` (PR #13) — 무관 (UI 무수정).
    - `fe-conventions` (PR #15) — `app/api/workbench/*` 위치 + `lib/api/workbench/*` adapter 분리 컨벤션. 본 PRD 의 adapter 추상화 위치 기준.
    - `responsive-pc-support` (PR #17) — 무관.
    - `palette-modernization` (PR #20) — 무관.
    - `layout-redesign` (PR #21) — UI 골격. 본 PRD 무수정 계승.
    - `component-compactness` (PR #22) — UI 내부. 본 PRD 무수정 계승.
  - **본 PRD 가 3분할의 마지막**:
    - PRD **#1 layout-redesign** (PR #21, 머지 완료) — 3-section shell + 정보 구조.
    - PRD **#2 component-compactness** (PR #22, 머지 완료) — 컴포넌트 내부 컴팩트화.
    - PRD **#3 claude-cli-analysis** (본 PRD) — 분석 결과의 데이터 소스 교체 (FastAPI → 로컬 claude CLI subprocess).
  - **후행 (본 PRD 머지 후 사용자 결정)**:
    - PRD `claude-api-analysis` (가칭) — 로컬 CLI → Claude API 직접 호출. 본 PRD 가 도입한 adapter 추상화 위에 `claudeApiAdapter` 만 추가.
    - PRD `analyze-streaming` (가칭) — 단일 응답 → streaming.
    - PRD `fastapi-deprecation` (가칭) — toggle 한 쪽 (fastapi) 만 운영 중일 때 제거.

## 1. 배경 / 문제

### 1.1 현재 상태

PR #11 ~ #22 누적 결과, 워크벤치의 화면 골격·컴포넌트·합성 토큰·라운드트립 5건은 모두 정착했다. 분석 요청 흐름은 다음과 같다:

1. 사용자 입력 (ticker / capital / target / horizon / max_loss) → `useAnalyzeMutation` (TanStack Query).
2. 클라이언트 → **Next.js BFF route handler** `app/api/workbench/analyze/route.ts` (`POST`).
3. BFF route handler → **FastAPI BE** (`http://127.0.0.1:8000/...` 또는 환경변수 `ANALYZE_BACKEND_URL`).
4. FastAPI 가 6블록 응답 (`action / brief / feasibility / horizons / risk_plan / warnings`) 반환.
5. BFF 가 응답을 그대로 또는 normalize 후 client 에 반환.
6. Client 가 6블록을 ResultGroup 으로 렌더.

이 구조는 `docs/rules/frontend.md` 의 "client 가 BE 를 직접 호출 금지" 룰 (BFF 단일 진입점) 을 충족한다. 화면·컨벤션·타입 모두 안정적.

### 1.2 사용자 의도 (verbatim)

본 PRD 의 trigger 는 사용자의 다음 두 발언이다 — 두 발언 모두 §3 In Scope 작성에 직접 반영된다.

> "현재 연결된 API 결과를 가져와서 보여주는것도 좋고, 아니면 다른 방법으로는 claude 통해서 주식 분석시키고 결과를 보여주는 용도로 쓰려고해."

> "원래는 claude api를 써서 종목 분석같은거 하려고했는데 우선은 로컬에서 내가 켜놓으면 로컬 cli로 클로드 켜서 거기에 종목 분석 시키고 데이터 받아와서 그려주는것도 하고싶어. 이게 잘 되면 그 후에 api 연결하든가 하려고해."

추출 가능한 사용자 우선순위:

1. **1차**: 로컬 claude CLI 를 subprocess 로 호출 — 본 PRD 의 1차 목표.
2. **2차**: 잘 되면 Claude API 직접 호출 로 전환 — **후속 PRD**. 단, 본 PRD 에서 **adapter 추상화** 를 미리 도입해 후속 PRD 가 같은 인터페이스 위에 구현체만 추가하면 되도록 한다.

### 1.3 문제

- **데이터 소스 단일 의존** — 현재는 FastAPI BE 가 켜져 있어야 분석이 동작. 사용자가 로컬에 FastAPI 서버를 별도로 띄워야 한다. claude CLI 가 로컬에 이미 설치된 상황에선 BE 없이 claude 만으로도 분석 가능.
- **adapter 추상화 부재** — 향후 Claude API 직접 호출로 전환할 때 route handler 안에서 `fetch(fastapi)` 가 곧 분석 호출 자체이기 때문에 adapter 패턴 도입 없이는 분기 어려움. 본 PRD 에서 미리 분리.
- **운영 토글 부재** — fastapi 와 claude-cli 중 어느 백엔드를 쓸지 결정할 환경 변수가 없음. 본 PRD 에서 `ANALYZE_BACKEND` 신설.
- **subprocess 사용의 환경 제약** — Vercel 같은 serverless 환경은 subprocess 실행 제한. 본 PRD 의 claude CLI 모드는 **local 전용** 임을 명시해야 함. 실수로 Vercel 배포 시 안전 가드 필요.

### 1.4 컨텍스트 메모

- 본 PRD 진입 시점에 PR #6 ~ #22 모두 머지되어 있고 main 은 `59213c5` 기준이라고 가정.
- **UI 변경 0건**. `components/workbench/*`, `components/layout/*`, `app/(workbench)/*` 무수정. `docs/design/*` 무수정. 디자이너 미합류.
- 본 PRD 의 변경 영역은 다음에 국한:
  - `app/api/workbench/analyze/route.ts` — 분기 도입 또는 adapter dispatch.
  - `app/api/workbench/_adapters/*` (신규 디렉터리) — `fastapiAdapter`, `claudeCliAdapter`.
  - `lib/types/workbench/analyze.ts` — 무수정 (응답 shape 그대로 사용). 단 adapter 입력 타입 신설 가능.
  - `.env.example` — 신규 env 명시.
  - `lib/copy/workbench/errorMessages.ts` (또는 동등) — CLI 관련 에러 메시지 보강.
  - QA 리포트.
- claude CLI 의 실제 인터페이스 (정확한 flag, stdin/stdout 포맷) 는 §9 OPEN QUESTION 4 로 미루며, api-integration-dev 가 진입 시 실 확인.

## 2. 목표

- **로컬 claude CLI 를 subprocess 로 호출하는 BFF route handler 경로**를 도입한다. 운영자가 환경 변수 하나 (`ANALYZE_BACKEND=claude-cli`) 로 활성화한다.
- claude CLI 의 stdout 을 6블록 응답 shape (`lib/types/workbench/analyze.ts`) 으로 **normalize** 한다. UI 가 변경 없이 그대로 렌더 가능해야 한다.
- 분석 호출 경로를 **adapter 추상화** 로 분리한다 — `fastapiAdapter`, `claudeCliAdapter`. 향후 `claudeApiAdapter` 가 같은 인터페이스 위에 얹힌다.
- 운영 토글 `ANALYZE_BACKEND` (값: `fastapi` (기본) | `claude-cli`) 를 도입한다. 기본값은 `fastapi` 로 기존 동작 무회귀.
- **Vercel 안전 가드** — `ANALYZE_BACKEND=claude-cli` 인 채 Vercel 환경에서 실행되면 명시적 한글 에러를 반환한다 (subprocess 실행 제한 우회 차단).
- claude CLI 호출 시 **shell injection 차단** (input sanitization, `execFile`/`spawn` argv 분리).
- **timeout 30초** 정합 — 기존 `AbortSignal.timeout(30_000)` 과 동일 시간 예산.
- 에러 핸들링 — subprocess exit code ≠ 0, timeout, JSON parse 실패 모두 한글 fallback 메시지로 `ErrorCard` 표시. UI 무회귀.
- **UI / DESIGN.md / 컴포넌트 무회귀** — 화면·컴포넌트·prop 시그니처·합성 토큰 모두 무수정.
- **PR #21 / #22 무회귀** — 3-section shell, 6블록 위계, 컴팩트 톤, in-session 히스토리/즐겨찾기 모두 무회귀.
- 라운드트립 5건 (PR #11) 이 두 백엔드 모드 모두에서 동작 (한 모드 당 5건 검증). 두 뷰포트 (375 / 1280) 시각 무회귀 (UI 무변경이므로 자동 충족이지만 검증은 함).
- 신규 라이브러리 0건 — `node:child_process` 표준 모듈만 사용. JSON 검증 (zod 등) 도입은 api-integration-dev 재량 — §9 OPEN QUESTION 3.

## 3. 범위 (In scope)

### 3.1 BFF route handler 의 claude CLI subprocess 호출

- 대상: `app/api/workbench/analyze/route.ts`.
- 동작 모드 분기:
  - **PM 권고: 옵션 A — 기존 endpoint 가 `ANALYZE_BACKEND` 환경변수로 분기**.
    - 신규 endpoint 추가 없이 같은 route handler 안에서 adapter dispatch.
    - 운영자가 toggle 하나로 백엔드 결정. 클라이언트 (TanStack Query mutation) 무수정.
  - 옵션 B (별도 endpoint `app/api/workbench/analyze-claude/route.ts` 신설) 는 §9 OPEN QUESTION 1 에서 결정 권한 보존.
- 분기 진입점은 route handler 시작부에서 `process.env.ANALYZE_BACKEND` 를 읽어 adapter 선택:
  - `fastapi` (기본) → `fastapiAdapter.analyze(input)`.
  - `claude-cli` → `claudeCliAdapter.analyze(input)`.
  - 그 외 / 빈 값 → 기본 `fastapi`.

### 3.2 claude CLI subprocess 호출 구현

- 위치: `app/api/workbench/_adapters/claudeCli.ts` (PM 권고). §9 OPEN QUESTION 6 결정 결과에 따름.
- 사용 모듈: `node:child_process` 의 `spawn` 또는 `execFile`.
  - **PM 권고: `execFile` + stdin pipe**.
    - shell 미경유 → shell injection 차단.
    - argv 명시적 분리.
    - prompt 는 stdin 으로 전달 (긴 prompt + 특수문자 안전).
  - 후보:
    - `claude -p "<prompt>"` (argv 로 prompt 전달).
    - `claude --json "<prompt>"`.
    - `claude --print` (또는 동등 비-interactive 모드) + stdin pipe.
  - 실제 claude CLI 의 정확한 인터페이스는 §9 OPEN QUESTION 4. api-integration-dev 가 진입 시 확인.
- timeout 30초 — `AbortController` 또는 `execFile` 의 `timeout` 옵션. timeout 도달 시 SIGKILL 또는 `child.kill()` 후 ApiError 'timeout' kind 반환.
- 환경 변수:
  - `CLAUDE_CLI_PATH` — claude 바이너리 경로. 기본 `"claude"` (PATH 의존).
  - `CLAUDE_CLI_MODEL` — 옵션. CLI 가 model flag 지원 시 (`--model <id>`).
  - `CLAUDE_PROMPT_TEMPLATE` — 옵션. prompt 템플릿 override.
- **input sanitization** — ticker / capital / target / horizon / max_loss 값은 numeric / 영문/숫자 ticker 만 허용 (기존 `lib/validation/workbench/*` 통과 값만 사용). `execFile` argv 분리로 shell 미경유.
- 실패 케이스 처리:
  - exit code ≠ 0 → `ApiError` (kind `'server'` 또는 신규 `'cli_error'`).
  - SIGKILL by timeout → `ApiError` (kind `'timeout'` 또는 기존 `'network'` 재사용).
  - stdout 이 valid JSON 이 아님 → `ApiError` (kind `'malformed'` 또는 `'server'`).
  - stderr 에 에러 메시지가 있으면 로그에만 남기고 사용자에겐 한글 generic 메시지.

### 3.3 prompt 생성

- 입력 → prompt 변환 함수 신설 (`app/api/workbench/_adapters/prompt.ts` 등).
- prompt 형식 — claude 가 **구조화된 JSON 응답** 을 내도록 system prompt + user prompt 분리:
  - system prompt: "당신은 주식·암호화폐 트레이딩 분석가입니다. 다음 입력을 분석하고 **반드시 아래 JSON 스키마로만** 응답하세요. 다른 텍스트·마크다운·코드펜스 금지." + JSON 스키마 정의.
  - user prompt: 입력값 (`ticker`, `capital`, `target`, `horizon`, `max_loss`) 을 한글 라벨로 명시.
  - JSON 스키마는 `lib/types/workbench/analyze.ts` 의 응답 shape 와 동일.
- 언어 — **PM 권고: 한글 prompt + JSON 응답 강제** (사용자 톤 정합). §9 OPEN QUESTION 2 에서 결정 권한 보존.
- 권장 prompt 구조 (의사 예):
  ```
  당신은 트레이딩 분석가입니다. 다음 JSON 스키마로만 응답하세요.
  {
    "action": { ... },
    "brief": { ... },
    "feasibility": { ... },
    "horizons": [ ... ],
    "risk_plan": { ... },
    "warnings": [ ... ]
  }
  입력:
  - 종목: AAPL
  - 자본: 1000000 USD
  - 목표 수익: 5%
  - 기간: 30일
  - 최대 손실: 2%
  ```

### 3.4 응답 normalize

- claude CLI stdout → JSON parse → 기존 `lib/types/workbench/analyze.ts` shape 으로 mapping.
- 6블록 (action / brief / feasibility / horizons / risk_plan / warnings) 모두 채워야 함.
- 누락 필드 처리:
  - **PM 권고**: 핵심 필드 (`action`, `brief`) 누락 시 ApiError 'malformed'. 보조 필드 (`warnings` 등) 누락 시 빈 배열 / 기본값 fallback.
- claude 가 추가 메타 (가격 소스, 분석 시점) 를 더하면 `warnings` 의 보조 메시지로 흡수.
- 응답 검증:
  - **PM 권고**: 자체 narrowing (`isAnalyzeResponse(obj): obj is AnalyzeResponse`) 함수로 시작. zod 도입은 api-integration-dev 재량 — §9 OPEN QUESTION 3.
  - 검증 실패 시 한글 fallback 메시지로 `ErrorCard` 표시.

### 3.5 adapter 추상화 (후속 Claude API 대비)

- BFF 안 분석 호출을 다음 인터페이스로 추상화:
  ```ts
  // app/api/workbench/_adapters/types.ts (신규)
  export interface AnalyzeAdapter {
    analyze(input: AnalyzeInput): Promise<AnalyzeResponse>;
  }
  ```
- 구현체:
  - `app/api/workbench/_adapters/fastapi.ts` — 현재 동작을 그대로 옮김 (기존 route handler 안 `fetch(...)` 로직).
  - `app/api/workbench/_adapters/claudeCli.ts` — 본 PRD 의 신규 구현체.
  - `claudeApi.ts` — **본 PRD 비범위**. 후속 PRD 가 같은 인터페이스 위에 추가.
- 위치 — **PM 권고: `app/api/workbench/_adapters/`** (route handler 내부 helper).
  - Next.js App Router 컨벤션상 `_` prefix 디렉터리는 라우트화 안 됨 → BFF 내부 helper 로 명확.
  - 대안: `lib/api/workbench/adapters/*` (도메인 라이브러리). §9 OPEN QUESTION 6.
- route handler 의 dispatcher:
  ```ts
  // app/api/workbench/analyze/route.ts (의사 코드)
  const backend = process.env.ANALYZE_BACKEND === 'claude-cli' ? 'claude-cli' : 'fastapi';
  const adapter: AnalyzeAdapter = backend === 'claude-cli'
    ? new ClaudeCliAdapter(...)
    : new FastapiAdapter(...);
  const result = await adapter.analyze(input);
  ```

### 3.6 환경 변수 / 운영 토글

- 신규 env:
  | 키 | 기본값 | 설명 |
  |---|---|---|
  | `ANALYZE_BACKEND` | `fastapi` | `fastapi` \| `claude-cli`. 분석 백엔드 선택. |
  | `CLAUDE_CLI_PATH` | `claude` | claude 바이너리 경로. PATH 의존 시 `claude`. |
  | `CLAUDE_CLI_MODEL` | (미설정) | 옵션. CLI 가 model flag 지원 시. |
  | `CLAUDE_PROMPT_TEMPLATE` | (미설정) | 옵션. prompt 템플릿 override. |
- 기존 env 무수정:
  - `ANALYZE_BACKEND_URL` (FastAPI URL) — `fastapi` adapter 가 그대로 사용.
- `.env.example` 갱신 — 신규 env 4 종 모두 명시. 한글 주석 권장.
- README 또는 `docs/HANDOFF.md` 에 토글 사용법 명시 (PM 권고: docs-only 파일 신설 안 함, `.env.example` 주석으로 충분).

### 3.7 Vercel 안전 가드

- 런타임에 다음 조건 만족 시 명시적 한글 에러:
  - `process.env.ANALYZE_BACKEND === 'claude-cli'` AND
  - `process.env.VERCEL === '1'` (또는 `process.env.VERCEL_ENV` 가 set) OR Node `process.platform` 검사로 컨테이너 추정.
- 에러 메시지 (한글):
  - "Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해주세요." (또는 동등 한글 카피).
- 가드 위치 — **PM 권고: route handler 진입 시 (런타임 환경 검사)**. §9 OPEN QUESTION 5.
- 가드는 `claude-cli` adapter 의 `analyze()` 진입부 또는 route handler dispatcher 에서 1회 검사. 빌드 타임 검사는 안 함 (Vercel preview 가 실수로 fail 하면 곤란).

### 3.8 에러 핸들링 / 로깅

- 모든 실패 케이스가 기존 `ErrorCard` 로 흡수되도록 normalize:
  | 케이스 | ApiError kind | 사용자 메시지 (한글) |
  |---|---|---|
  | subprocess exit code ≠ 0 | `'server'` 또는 신규 `'cli_error'` | "분석 도구 호출에 실패했습니다. 잠시 후 다시 시도해주세요." |
  | timeout 30초 | `'timeout'` 또는 기존 `'network'` 재사용 | "분석이 너무 오래 걸려요. 잠시 후 다시 시도해주세요." (또는 기존 카피 재사용) |
  | stdout JSON parse 실패 | `'malformed'` 또는 `'server'` | "분석 결과 형식이 올바르지 않습니다." |
  | binary 없음 (`ENOENT`) | `'server'` 또는 신규 `'cli_missing'` | "claude CLI 가 설치되어 있지 않습니다." |
  | Vercel 환경 | 신규 `'cli_unsupported'` 또는 `'server'` | (§3.7 의 한글 메시지) |
- 정확한 kind 키 도입은 api-integration-dev 재량 — 기존 ApiError union 에 추가하거나 `'server'` 로 통합.
- 로깅: stderr 와 exit code 는 **서버 로그에만** 남기고 사용자에겐 generic 한글 메시지만 노출 (보안).
- `lib/copy/workbench/errorMessages.ts` (또는 동등 위치) 에 신규 한글 메시지 추가.

### 3.9 무회귀

- **UI 변경 0건** — `components/workbench/*`, `components/layout/*`, `app/(workbench)/*`, `app/components.css`, `app/globals.css`, `docs/design/*` 모두 무수정.
- **기존 fastapi adapter 동작 무회귀** — `ANALYZE_BACKEND=fastapi` (기본) 일 때 PR #11 라운드트립 5건 그대로 동작.
- **컴포넌트 prop 시그니처 무수정** — PR #21 / #22 계승.
- **응답 타입 무수정** — `lib/types/workbench/analyze.ts` 무수정. 클라이언트 mutation·캐시·렌더 무변경.
- **BFF 단일 진입점 룰 유지** — 클라이언트가 직접 BE 를 호출하지 않음. `git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/` 직접 호출 0건 무회귀.
- `npm run typecheck`, `npm run lint`, `npm run build` 0 에러.
- `npm run design:sync` 산출물 차이 0 (DESIGN.md 무수정이므로 결정적).

## 4. 비범위 (Out of scope)

본 PRD 는 분석 결과의 데이터 소스 교체 만 다룬다. 다음은 별도 PRD 영역이거나 의도적으로 미룬다.

### 4.1 Claude API 직접 호출

- `@anthropic-ai/sdk` 또는 동등 라이브러리로 Claude API 를 직접 호출하는 경로.
- **후속 PRD `claude-api-analysis` (가칭)** 영역. 본 PRD 는 CLI subprocess 만.
- 본 PRD 는 **adapter 추상화** 를 미리 도입해 후속 PRD 가 같은 인터페이스 위에 `claudeApiAdapter` 만 추가하면 되도록 한다.
- API 키 관리, rate limit, billing, 모델 선택 등은 모두 후속 PRD.

### 4.2 claude CLI 설치 / 관리

- claude CLI 의 설치 / 업데이트 / 인증 / 로그인 등은 **사용자 로컬 책임**.
- 본 PRD 는 "이미 설치되어 있다" 고 가정 (`CLAUDE_CLI_PATH` 로 경로 명시 가능).
- CLI 미설치 시 `ENOENT` 를 잡아 한글 에러 메시지 (§3.8) 로 안내만 함.

### 4.3 prompt engineering 정밀화

- 본 PRD 는 **동작 가능한 prompt** 만 (claude 가 6블록 JSON 을 반환하도록 강제).
- 정확도 튜닝 (system prompt 정교화, few-shot 예시, chain-of-thought 등) 은 별도 PRD.
- 사용자가 응답 품질에 만족하지 못하면 후속 PRD `analyze-prompt-tuning` (가칭) 으로 진행.

### 4.4 Vercel deployment 의 claude CLI 지원

- Vercel 의 serverless 환경은 subprocess 실행 제한. 본 PRD 는 **local 전용**.
- Vercel 환경에서 `ANALYZE_BACKEND=claude-cli` 사용 시 명시적 한글 에러 (§3.7). 우회 방법 (sidecar, edge runtime 등) 도입은 본 PRD 비범위.

### 4.5 multi-turn conversation

- claude 와의 대화형 분석 (follow-up 질문, 명확화 질문 등) 은 본 PRD 비범위.
- 본 PRD 는 **단발 호출** 만 — 한 번의 입력 → 한 번의 응답.

### 4.6 streaming response

- 본 PRD 는 단일 응답만 — claude CLI 의 final result 만 사용 (또는 `--json` 모드).
- streaming UI (progressive 6블록 렌더, 토큰 단위 표시) 는 별도 PRD `analyze-streaming` (가칭).

### 4.7 UI 변경

- 화면·컴포넌트·DESIGN.md·합성 토큰 모두 무수정.
- 디자이너 미합류.
- 백엔드 모드 표시 UI (예: 사이드바에 "현재 claude CLI 모드" 배지) 는 본 PRD 비범위. 운영자만 인지하면 충분.

### 4.8 신규 라이브러리 도입

- `node:child_process` 표준 모듈만 사용.
- `@anthropic-ai/sdk` 미도입 (Claude API 직접 호출은 비범위).
- zod 도입은 **api-integration-dev 재량** — §9 OPEN QUESTION 3. 도입 시 한 라이브러리만 (기존 의존성 추가).

### 4.9 FastAPI 백엔드 deprecation

- 본 PRD 머지 후 `ANALYZE_BACKEND` toggle 은 유지. fastapi 모드 제거는 별도 PRD.
- PM 권고: 사용자가 claude CLI 모드를 충분히 검증한 후 결정.

### 4.10 캐싱 / 영속화

- 분석 결과 cache (TanStack Query 기본 캐시 외 추가 영속화) 는 본 PRD 비범위.
- in-session 히스토리·즐겨찾기는 PR #21 / #22 계승 (in-memory 만).

### 4.11 cost / quota / rate limit 관리

- claude CLI 사용량은 사용자 계정의 quota 에 따라 결정. 본 PRD 는 quota 초과 시 발생하는 에러를 §3.8 처리에 흡수만 함.

### 4.12 e2e / 통합 테스트 자동화

- QA 수동 라운드트립으로 검증. e2e 자동화는 별도 PRD.

## 5. 수용 기준 (AC)

검증 가능한 문장.

### AC-1 (기본 모드 무회귀 — fastapi)

- 환경변수 미설정 또는 `ANALYZE_BACKEND=fastapi` 일 때 기존 동작이 그대로다.
- 검증:
  - `ANALYZE_BACKEND=fastapi npm run dev` (또는 env 미설정) 으로 dev 서버 기동.
  - PR #11 라운드트립 5건 — (a) AAPL 정상, (b) BTC-USD 정상, (c) 비분할가능, (d) 화이트리스트 비매칭, (e) 5xx 폴백 — 모두 PR #11 / #21 / #22 와 동일하게 동작.
  - BFF route handler 가 FastAPI BE 를 호출 (`ANALYZE_BACKEND_URL` 사용).
  - 사용자 노출 화면 / 6블록 / 한글 카피 모두 PR #22 시점과 동일.

### AC-2 (claude-cli 모드 동작)

- `ANALYZE_BACKEND=claude-cli CLAUDE_CLI_PATH=claude npm run dev` 로 기동 시 claude CLI 가 subprocess 로 호출되어 6블록 응답을 반환한다.
- 검증:
  - 위 환경변수로 dev 서버 기동.
  - AAPL / capital=1000000 / target=5% / horizon=30 / max_loss=2% 입력 → 분석 실행.
  - 응답이 6블록 (`action`, `brief`, `feasibility`, `horizons`, `risk_plan`, `warnings`) 모두 채워져 화면에 렌더.
  - 서버 로그에 `execFile`/`spawn` 호출 흔적 확인 (또는 디버그 로그).
  - FastAPI BE 가 꺼져 있어도 분석이 동작 (claude CLI 만으로).

### AC-3 (shell injection 차단)

- 특수문자 ticker / capital 입력이 정상 처리되거나 사전 차단된다.
- 검증:
  - 사전 차단: 기존 `lib/validation/workbench/*` 가 영문/숫자 ticker, numeric capital 만 허용하므로 특수문자는 사전에 차단.
  - 가정 우회 검증 (개발자 수동): 임의의 특수문자 (`;`, `&`, `|`, `$`, 백틱 등) 가 포함된 input 을 강제로 adapter 진입까지 흘려도 `execFile` argv 분리로 shell 미경유. shell 명령 실행 0건.
  - 코드 검증: `git grep -nE "exec\(|child_process\.exec\b" -- app/api/` 결과 `exec()` (shell 경유) 사용 0건. `execFile` 또는 `spawn` 만 사용.

### AC-4 (timeout 30초)

- claude CLI 가 30초 안에 응답하지 않으면 한글 fallback 메시지로 `ErrorCard` 가 표시된다.
- 검증:
  - 임시로 timeout 을 짧게 (예: 1초) 설정하거나, claude CLI 를 임의로 sleep 처리한 wrapper script 로 대체.
  - 분석 실행 → 30초 (또는 임시값) 후 `ErrorCard` 의 한글 메시지 표시.
  - subprocess 가 SIGKILL 또는 `child.kill()` 로 정리됨 (좀비 프로세스 0건).

### AC-5 (Vercel 안전 가드)

- `process.env.VERCEL=1` AND `ANALYZE_BACKEND=claude-cli` 일 때 명시적 한글 에러가 반환된다.
- 검증:
  - `VERCEL=1 ANALYZE_BACKEND=claude-cli npm run dev` (또는 env 직접 set) 으로 dev 서버 기동.
  - 분석 실행 → BFF route handler 가 401 또는 503 응답 + 한글 메시지 ("Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다..." 등).
  - subprocess 호출 시도 0건 (서버 로그 확인).

### AC-6 (JSON parse 실패 시 한글 fallback)

- claude CLI stdout 이 valid JSON 이 아닐 때 한글 fallback 메시지로 `ErrorCard` 가 표시된다.
- 검증:
  - 임시로 claude CLI 를 wrapper script (예: `echo "this is not json"`) 로 대체.
  - 분석 실행 → `ErrorCard` 의 한글 메시지 표시 ("분석 결과 형식이 올바르지 않습니다." 등).
  - 서버 로그에는 parse 실패 흔적 (보안: 사용자에겐 노출 안 함).

### AC-7 (binary 없음 시 한글 fallback)

- `CLAUDE_CLI_PATH` 가 존재하지 않는 경로일 때 한글 fallback 메시지로 `ErrorCard` 가 표시된다.
- 검증:
  - `CLAUDE_CLI_PATH=/nonexistent/claude ANALYZE_BACKEND=claude-cli npm run dev` 로 기동.
  - 분석 실행 → `ErrorCard` 의 한글 메시지 ("claude CLI 가 설치되어 있지 않습니다." 등).
  - `ENOENT` 가 서버 로그에 캐치됨.

### AC-8 (adapter 추상화 도입)

- `app/api/workbench/_adapters/` (또는 §9 결정 위치) 에 `AnalyzeAdapter` 인터페이스 + `fastapiAdapter` + `claudeCliAdapter` 두 구현체가 존재.
- route handler 는 환경변수에 따라 두 adapter 중 하나를 선택해 호출한다.
- 검증:
  - `ls app/api/workbench/_adapters/` 결과 `types.ts` (또는 동등), `fastapi.ts`, `claudeCli.ts` 존재.
  - route handler 가 `fetch()` 를 직접 호출하지 않고 adapter 메서드를 호출 — `git grep -nE "fetch\(" -- app/api/workbench/analyze/route.ts` 결과 0건 또는 adapter 호출만.
  - TypeScript 컴파일러가 두 adapter 가 동일 인터페이스 구현임을 검증.

### AC-9 (응답 normalize)

- claude CLI stdout 의 JSON 이 `lib/types/workbench/analyze.ts` 의 응답 shape 로 normalize 되어 클라이언트에 반환된다.
- 검증:
  - 정상 케이스 (AC-2) 에서 응답이 기존 type guard / narrowing 을 통과.
  - 누락 필드 케이스 (예: `warnings` 누락) 에서 빈 배열 또는 기본값 fallback. 핵심 필드 (`action`, `brief`) 누락 시 ApiError 'malformed'.
  - 화면 렌더가 PR #22 시점과 동일 (UI 무회귀).

### AC-10 (.env.example 갱신)

- `.env.example` (또는 동등 파일) 에 신규 env 4 종 (`ANALYZE_BACKEND`, `CLAUDE_CLI_PATH`, `CLAUDE_CLI_MODEL`, `CLAUDE_PROMPT_TEMPLATE`) 이 한글 주석과 함께 명시.
- 검증:
  - `cat .env.example | grep -E "ANALYZE_BACKEND|CLAUDE_CLI"` 결과 4 종 모두 표시.

### AC-11 (UI 무회귀)

- `components/workbench/*`, `components/layout/*`, `app/(workbench)/*`, `app/components.css`, `app/globals.css`, `docs/design/*` 모두 무수정.
- 검증:
  - `git diff main -- components/ app/\(workbench\)/ app/components.css app/globals.css docs/design/` 결과 0 라인.
  - 브라우저 수동 — PR #22 시점의 화면과 동일.

### AC-12 (응답 타입 무수정)

- `lib/types/workbench/analyze.ts` 무수정. 클라이언트 mutation·캐시·렌더 무변경.
- 검증:
  - `git diff main -- lib/types/workbench/analyze.ts` 결과 0 라인.

### AC-13 (BFF 단일 진입점 무회귀)

- 클라이언트가 BE 를 직접 호출 안 함.
- 검증:
  - `git grep -nE "fetch\(" -- components/ hooks/` 결과 직접 fetch 0건.
  - `git grep -nE "http://127\.0\.0\.1" -- app/(workbench)/ components/ hooks/ lib/api/workbench/` 결과 0건 (route handler / adapter 안 제외).

### AC-14 (라운드트립 5건 × 두 백엔드 모드)

- PR #11 라운드트립 5건이 두 백엔드 모드 모두에서 동작.
- 검증:
  - **fastapi 모드**: AC-1 의 5건 시나리오.
  - **claude-cli 모드**: 같은 5건 시나리오 (단, BE 응답 분기는 prompt 가 흡수). 6블록 응답이 모두 채워지고 화면에 렌더.
  - 두 모드 모두 두 뷰포트 (375 / 1280) 에서 시각 무회귀 (UI 무변경이므로 자동 충족).

### AC-15 (한글 톤 무회귀)

- 사용자 노출 문구 중 ticker · BE enum 식별자 · 단위 (USD, KRW, %, 일) 를 제외한 모든 텍스트가 한글.
- 신규 추가된 CLI 관련 에러 메시지도 한글.
- 검증:
  - 브라우저 수동.
  - `lib/copy/workbench/errorMessages.ts` (또는 동등) 의 신규 메시지가 한글.

### AC-16 (build / typecheck / lint)

- `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- 검증: 각 명령 실행 결과.

### AC-17 (no new runtime deps)

- `package.json` 의 `dependencies` / `devDependencies` 에 신규 추가 0건.
- 단, **zod 등 JSON 검증 라이브러리** 는 §9 OPEN QUESTION 3 결정에 따라 1 종 추가 허용 — 그 외 0건.
- 검증: `git diff main -- package.json` 의 dependencies 추가 라인 ≤ 1.

### AC-18 (subprocess 정리)

- timeout / 에러 / 정상 종료 모든 케이스에서 child process 가 정리된다 (좀비 0건).
- 검증:
  - 정상 케이스: child 가 exit 후 자동 정리.
  - timeout 케이스: `child.kill()` 또는 SIGKILL 발화 (코드 검증).
  - 에러 케이스: stdin/stdout/stderr stream 모두 close (코드 검증).

### AC-19 (서버 로그 보안)

- stderr / exit code / 에러 stack 은 **서버 로그에만** 남기고 클라이언트 응답에는 generic 한글 메시지만 노출.
- 검증:
  - 의도적으로 CLI 실패 유도 (AC-6, AC-7) → 브라우저 네트워크 탭의 응답 body 에 stack trace 또는 stderr 원문 노출 0건.
  - 서버 콘솔에는 디버그 정보 출력 (개발자 진단용).

### AC-20 (PR #21 / #22 무회귀)

- 3-section shell + 6블록 위계 + 컴팩트 톤 + outside-click + suffix + in-session 히스토리/즐겨찾기 모두 무회귀.
- 검증: PR #21 / #22 의 핵심 AC 시나리오 재현 — 모두 동일 동작.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 PR #6 ~ #22 모두 머지되어 있고 main 은 `59213c5` 기준이라고 가정.
- PR #21 의 3-section shell + 6블록 위계, PR #22 의 컴팩트 톤 + outside-click + suffix + in-session 히스토리/즐겨찾기는 본 PRD 에서 **무수정 계승**.
- 사용자 로컬에 claude CLI 가 이미 설치되어 PATH 에 있거나 `CLAUDE_CLI_PATH` 로 경로 지정 가능하다고 가정. CLI 인증 (로그인 / API 키) 도 사용자 책임.
- claude CLI 의 정확한 인터페이스 (flag, stdin/stdout 포맷) 는 api-integration-dev 가 진입 시 실 확인. PM 권고는 `execFile` + stdin pipe + `--print` 또는 `--json` 동등 비-interactive 모드.
- Vercel 같은 serverless 환경에서는 claude CLI 모드를 지원하지 않는다 — local 전용 (§3.7 안전 가드).
- BFF 단일 진입점 룰 유지 — 클라이언트가 BE / CLI 를 직접 호출하지 않음.
- 응답 shape 는 PR #11 의 `lib/types/workbench/analyze.ts` 그대로. claude CLI 의 stdout 을 이 shape 로 normalize 하는 책임은 본 PRD 가 흡수.
- in-session 분석 히스토리·즐겨찾기는 PR #21 계승 (in-memory 만). 본 PRD 변경 없음.
- 신규 라이브러리 0건 원칙 — `node:child_process` 표준 모듈만. zod 등 JSON 검증은 §9 OPEN QUESTION 3 결정에 따라 1 종 허용.
- 본 PRD 의 PR diff 는 PR #21 / #22 보다 작다 — UI 무변경 + 변경 영역이 BFF 내부에 국한.
- 컴포넌트 prop 시그니처 / 응답 타입 / 클라이언트 mutation 무수정 (PR #21 / #22 계승).
- 토큰 / 합성 토큰 / DESIGN.md 무수정 — 디자이너 미합류.
- 사용자가 claude CLI 의 응답 품질에 만족하지 않으면 후속 PRD `analyze-prompt-tuning` (가칭) 에서 prompt engineering. 본 PRD 는 **동작 가능한 prompt** 만.

## 7. 참고

- `docs/prd/layout-redesign.md` — PRD #1 (PR #21). 3-section shell + 6블록 위계.
- `docs/prd/component-compactness.md` — PRD #2 (PR #22). 컴포넌트 컴팩트화. 본 PRD 의 직전 선행.
- `docs/prd/workbench-analyze-rebuild.md` — PR #11. 6블록 응답 shape + 라운드트립 5건 정의.
- `docs/prd/fe-conventions.md` — 폴더·컨벤션. BFF 단일 진입점 룰. adapter 위치 기준.
- `docs/rules/frontend.md` — FE 컨벤션. BFF 절·에러 핸들링 절.
- `app/api/workbench/analyze/route.ts` — 본 PRD 의 1차 변경 대상.
- `lib/api/workbench/analyze.ts` — 클라이언트 측 mutation wrapper. 본 PRD 무수정.
- `lib/types/workbench/analyze.ts` — 응답 shape. 본 PRD 무수정 (단 adapter input 타입 신설 가능).
- `lib/validation/workbench/*` — 사전 차단. 본 PRD 무수정.
- `lib/copy/workbench/errorMessages.ts` — 한글 에러 카피. 본 PRD 가 신규 메시지 추가.
- `.env.example` — 본 PRD 가 신규 env 4 종 추가.
- `docs/HANDOFF.md` — PR #6 ~ #22 누적 기록. #22 entry 의 "다음 작업 후보" 가 본 PRD 와 일치.
- `AGENTS.md` — 작업 원칙·라벨 게이트·한 브랜치 한 PR 룰.
- Node 표준 모듈 `node:child_process` — `execFile` / `spawn` 사용.
- (외부 참고) claude CLI README / `claude --help` — 정확한 flag 와 입출력 포맷 확인.

## 8. 영향 분석

### 8.1 변경되는 산출물

| 산출물 | 변경 내용 | 책임 에이전트 |
|---|---|---|
| `app/api/workbench/analyze/route.ts` | adapter dispatcher 도입. `ANALYZE_BACKEND` env 분기. 기존 `fetch()` 로직은 `fastapiAdapter` 안으로 이동. Vercel 안전 가드 진입부에서 검사. | api-integration-dev |
| `app/api/workbench/_adapters/types.ts` (신규) | `AnalyzeAdapter` 인터페이스 + `AnalyzeInput` (필요 시) 정의. | api-integration-dev |
| `app/api/workbench/_adapters/fastapi.ts` (신규) | 기존 route handler 의 `fetch(fastapi)` 로직 옮김. `ANALYZE_BACKEND_URL` 사용. | api-integration-dev |
| `app/api/workbench/_adapters/claudeCli.ts` (신규) | claude CLI subprocess 호출 + prompt 생성 + 응답 normalize + 에러 매핑. | api-integration-dev |
| `app/api/workbench/_adapters/prompt.ts` (신규, 옵션) | prompt 생성 함수. system + user prompt 분리. JSON 스키마 정의. | api-integration-dev |
| `.env.example` | 신규 env 4 종 (`ANALYZE_BACKEND`, `CLAUDE_CLI_PATH`, `CLAUDE_CLI_MODEL`, `CLAUDE_PROMPT_TEMPLATE`) 한글 주석으로 명시. | api-integration-dev |
| `lib/copy/workbench/errorMessages.ts` (또는 동등) | CLI 관련 한글 에러 메시지 추가 (binary 없음, Vercel 환경, JSON parse 실패 등). | api-integration-dev |
| `lib/types/workbench/analyze.ts` | (옵션) ApiError union 에 신규 kind 추가 시. PM 권고는 기존 `'server'` / `'network'` 재사용. | api-integration-dev |
| `package.json` / `package-lock.json` | 신규 라이브러리 0건 원칙. zod 등 JSON 검증 1 종 허용 (선택). | api-integration-dev |
| `docs/qa/claude-cli-analysis.md` (신규) | AC 별 재현·기대·실측 표. 두 백엔드 모드 × 라운드트립 5건. CLI 실패 케이스 (timeout / parse / ENOENT / Vercel) 검증. | qa |

### 8.2 변경되지 않는 산출물

- `components/workbench/*`, `components/layout/*` — 모든 컴포넌트 무수정.
- `app/layout.tsx`, `app/(workbench)/layout.tsx`, `app/(workbench)/page.tsx` — 무수정.
- `app/components.css`, `app/globals.css` — 무수정.
- `docs/design/*` — DESIGN.md 무수정.
- `tailwind.theme.json`, `tailwind.config.ts` — 무수정.
- `lib/types/workbench/analyze.ts` 응답 shape — 무수정.
- `lib/api/workbench/analyze.ts` 클라이언트 wrapper — 무수정.
- `lib/validation/workbench/*` 사전 차단 — 무수정.
- `hooks/query/*`, `hooks/workbench/*`, `hooks/utils/*` — 무수정.
- `docs/prd/layout-redesign.md`, `docs/prd/component-compactness.md` — 무수정.
- `docs/rules/frontend.md`, `docs/rules/design-md.md` — 무수정.

### 8.3 라벨 흐름 / 에이전트 핸드오프

```text
PM (본 PRD, 워킹트리 작성, docs-only PR 만들지 않음)
            ↓
[ feature/claude-cli-analysis 브랜치 ]
            ↓
  PRD commit
            ↓
(디자이너 미합류 — UI 변경 0건)
            ↓
api-integration-dev (adapter 추상화 + claude CLI subprocess + env + 에러 매핑)
            ↓ impl-ready 라벨
QA (두 백엔드 모드 × 라운드트립 5건 + CLI 실패 케이스 + Vercel 가드) → qa-passed
            ↓ handoff-append workflow 자동 → HANDOFF.md
reviewer → review-approved (자가 PR 시 --comment + 라벨 fallback)
            ↓
DevOps merge → main
            ↓
사용자 결정 (claude API 진입 / streaming / fastapi deprecation 등)
```

### 8.4 리스크 / 완화

| 리스크 | 완화 |
|---|---|
| claude CLI 의 실제 인터페이스가 PM 가정과 다름 | api-integration-dev 가 진입 시 `claude --help` 로 확인. `execFile` + stdin pipe 가 보편적이라 큰 위험 없음. §9 OPEN QUESTION 4 에 결정 권한 보존. |
| claude 가 JSON 외 markdown / 코드펜스 / 설명 텍스트를 함께 반환 | prompt 에서 "JSON 만, 다른 텍스트 / 마크다운 / 코드펜스 금지" 강제. parse 실패 시 한글 fallback (AC-6). 정확도 튜닝은 후속 PRD. |
| shell injection (특수문자 ticker, `;`, `&` 등) | `execFile` + argv 분리로 shell 미경유. 사전에 `lib/validation/workbench/*` 가 영문/숫자만 허용. AC-3 에 명시. |
| subprocess 좀비 프로세스 | timeout / 에러 / 정상 종료 모든 케이스에서 `child.kill()` 또는 stream close 발화. AC-18 에 명시. |
| Vercel 배포 시 실수로 `ANALYZE_BACKEND=claude-cli` 설정 | 런타임 안전 가드 (§3.7). 명시적 한글 에러. AC-5. |
| timeout 30초 안에 claude 가 응답 못 함 | 한글 fallback (AC-4). 사용자가 다시 시도. 후속 PRD 에서 streaming 도입 시 부분 응답 가능. |
| binary 없음 / 경로 잘못됨 | `ENOENT` 캐치 + 한글 fallback (AC-7). `.env.example` 의 한글 주석으로 사용자 안내. |
| stderr 누설로 보안 정보 노출 | 서버 로그에만 stderr 남김. 클라이언트 응답은 generic 한글 메시지만 (AC-19). |
| 응답 normalize 의 누락 필드 처리 차이 | 핵심 필드 누락 시 ApiError, 보조 필드 누락 시 기본값 fallback. AC-9 에 명시. |
| adapter 추상화 도입으로 fastapi 동작 회귀 | `fastapiAdapter` 가 기존 로직을 1:1 복제. AC-1 의 라운드트립 5건으로 회귀 차단. |
| 신규 라이브러리 도입 압박 (zod, @anthropic-ai/sdk 등) | PM 권고는 zod 1 종 허용 (api-integration-dev 재량). @anthropic-ai/sdk 는 본 PRD 비범위 (후속 PRD `claude-api-analysis`). §9 OPEN QUESTION 3. |
| 후속 PRD `claude-api-analysis` 와의 인터페이스 mismatch | 본 PRD 의 `AnalyzeAdapter` 인터페이스가 충분히 추상화되어 있음. 후속 PRD 가 `claudeApiAdapter` 만 추가하면 됨. AC-8. |
| claude 응답 품질이 fastapi 대비 낮음 | 본 PRD 는 동작만 보장. 정확도 튜닝은 후속 PRD `analyze-prompt-tuning` (가칭). 사용자가 두 모드 비교 후 결정. |

### 8.5 변경 라인 추정

본 PRD 의 PR diff 는 PR #21 (1500+) / PR #22 (500~900) 보다 작다 — UI 변경 0 + 변경 영역이 BFF 내부에 국한.

- adapter 추상화 + dispatcher (route handler 갱신) — 추정 50~100 라인.
- fastapiAdapter (기존 로직 이동) — 추정 50~100 라인 (이동 + 약간의 wrap).
- claudeCliAdapter (subprocess + prompt + normalize + 에러 매핑) — 추정 150~250 라인.
- prompt 생성 함수 — 추정 30~80 라인.
- 에러 메시지 카피 + .env.example + Vercel 가드 — 추정 30~50 라인.
- (옵션) zod 도입 시 schema 정의 — 추정 30~50 라인.
- QA 리포트 — 추정 100~200 라인.
- 합계 추정 400~800 라인.

회귀 위험: 환경변수 누락 시 기본값 `fastapi` 로 폴백 — 기존 동작 자동 보장. UI 무변경이므로 시각 회귀 0.

## 9. OPEN QUESTION

각 항목에 PM 권고를 명시. 사용자·api-integration-dev 결정으로 확정.

### 9.1 옵션 A (toggle) vs 옵션 B (별도 endpoint)

- 후보:
  - A: 기존 `app/api/workbench/analyze/route.ts` 가 `ANALYZE_BACKEND` env 로 분기 (adapter dispatch).
  - B: 신규 endpoint `app/api/workbench/analyze-claude/route.ts` 추가 + 기존 endpoint 무수정. 클라이언트가 어느 endpoint 를 호출할지 결정.
- **PM 권고: 옵션 A (toggle)**.
- 사유:
  - 운영자가 toggle 하나로 백엔드 결정. 클라이언트 mutation·캐시·query key 무수정.
  - 옵션 B 는 클라이언트가 endpoint 선택 로직을 가져야 하고 query key 도 분리됨 → 캐시 정합성 부담 증가.
  - 후속 `claudeApiAdapter` 추가 시 옵션 A 가 자연스럽게 확장.
- 결정 권한: 사용자 (PM 가설 = 옵션 A).

### 9.2 prompt 언어 (한글 vs 영문)

- 후보:
  - 한글 prompt + JSON 응답 강제.
  - 영문 prompt + JSON 응답 강제.
  - 한·영 혼합 (system 영문 + user 한글 또는 그 반대).
- **PM 권고: 한글 prompt + JSON 응답 강제**.
- 사유:
  - 사용자 톤 정합 (한글 카피 원칙).
  - claude 가 한글 지시도 충실히 따름 (검증된 패턴).
  - JSON 응답은 영문 식별자 그대로 (기존 응답 shape 와 정합).
- 결정 권한: 사용자 (PM 가설 = 한글 prompt).

### 9.3 JSON validation 도구 (자체 narrowing vs zod)

- 후보:
  - 자체 type guard (`isAnalyzeResponse(obj): obj is AnalyzeResponse`).
  - zod 도입 (schema 정의 → parse → typed result).
  - 그 외 (yup, valibot 등).
- **PM 권고: api-integration-dev 재량**. 자체 narrowing 또는 zod 중 택일.
- 사유:
  - 자체 narrowing — 신규 의존성 0건, 단순.
  - zod — 더 안전한 validation, error message 풍부, 향후 schema 재사용 가능.
  - 본 PRD 는 한 종류만 허용 (둘 다 도입 금지).
- 결정 권한: api-integration-dev (PM 권고는 자체 narrowing 으로 시작, 필요 시 zod 도입).

### 9.4 claude CLI 의 정확한 호출 방식

- 후보:
  - `claude -p "<prompt>"` (argv 로 prompt 전달).
  - `claude --json "<prompt>"`.
  - `claude --print` (또는 동등 비-interactive 모드) + stdin pipe.
  - 환경변수로 prompt 전달.
- **PM 권고: `execFile` + stdin pipe + `--print` (또는 동등 비-interactive 모드)**.
- 사유:
  - argv 로 긴 prompt 전달은 OS 의 ARG_MAX 제한 + 특수문자 escape 부담.
  - stdin pipe 는 길이·특수문자에 안전.
  - `--print` 등 비-interactive 모드는 사용자 입력 대기 없이 단발 응답.
  - 정확한 flag 명은 api-integration-dev 가 `claude --help` 로 확인.
- 결정 권한: api-integration-dev.

### 9.5 Vercel 안전 가드 위치 (build 검사 vs 런타임 검사)

- 후보:
  - 빌드 타임 검사 — `next.config.js` 또는 `instrumentation.ts` 에서 env 검사.
  - 런타임 검사 — route handler 진입 시 검사.
  - 둘 다 (빌드 + 런타임).
- **PM 권고: 런타임 검사 (route handler 진입 시)**.
- 사유:
  - 빌드 타임 검사는 Vercel preview 가 실수로 fail 하면 곤란 (배포 자체가 막힘).
  - 런타임 검사는 실제 분석 호출 시점에만 fail → preview 환경 / fastapi 모드 / 로컬 모두 안전.
  - Vercel 환경에서 fastapi 모드로 운영 가능성 보존.
- 결정 권한: 사용자 (PM 가설 = 런타임 검사).

### 9.6 adapter 인터페이스 위치

- 후보:
  - `app/api/workbench/_adapters/*` — route handler 내부 helper (Next.js `_` prefix 컨벤션).
  - `lib/api/workbench/adapters/*` — 도메인 라이브러리 (`docs/rules/frontend.md` 의 `lib/api/*` 위치).
  - `lib/server/workbench/adapters/*` — server-only 모듈 명시.
- **PM 권고: `app/api/workbench/_adapters/`** (route handler 내부 helper).
- 사유:
  - `_` prefix 디렉터리는 Next.js App Router 가 라우트화하지 않음 → BFF 내부 helper 로 명확.
  - route handler 와 같은 트리에 있어 코드 탐색 쉬움.
  - `lib/api/workbench/` 는 **클라이언트 wrapper** 위치 (`fetch('/api/workbench/...')`) — adapter 와 혼동 위험.
  - 대안 `lib/server/*` 는 server-only 명시 측면에서 깔끔하지만 폴더 표준에 신규 슬롯 추가 필요.
- 결정 권한: api-integration-dev (PM 권고는 `app/api/workbench/_adapters/`).

### 9.7 ApiError kind 의 신규 키 도입 여부

- 후보:
  - 기존 union (`'network'`, `'timeout'`, `'server'`, `'validation'`, `'malformed'` 등) 재사용.
  - 신규 키 추가 (`'cli_error'`, `'cli_missing'`, `'cli_unsupported'`).
- **PM 권고: 기존 union 재사용**.
- 사유:
  - UI 가 ErrorCard 분기를 kind 별로 강하게 하지 않음 (한글 메시지로 충분).
  - 신규 키 추가는 ApiError 정의 + 사용처 narrowing 영향 → 본 PRD 비범위 권장.
  - 단, api-integration-dev 가 디버깅 / 로깅 정밀화를 위해 신규 키를 원하면 허용.
- 결정 권한: api-integration-dev.

### 9.8 FastAPI 백엔드 deprecation 시점

- 후보:
  - 본 PRD 머지 직후 fastapi 모드 제거 (claude-cli only).
  - 사용자가 claude-cli 모드를 충분히 검증한 후 별도 PRD 로 제거.
  - 두 모드 영구 유지.
- **PM 권고: 별도 PRD 로 제거 (사용자 검증 후)**.
- 사유:
  - 본 PRD 머지 직후 fastapi 제거는 회귀 위험 (claude CLI 응답 품질 미검증).
  - 두 모드 유지로 운영자가 선택 가능.
  - 사용자가 결정.
- 결정 권한: 사용자.

### 9.9 prompt 응답 형식 — 코드펜스 허용 여부

- 후보:
  - JSON 만 (코드펜스 금지).
  - JSON 또는 ```json ... ``` 코드펜스 (둘 다 parse).
- **PM 권고: JSON 만, parse 시 코드펜스도 관대하게 strip**.
- 사유:
  - prompt 에서 "코드펜스 금지" 명시.
  - 실제로는 claude 가 코드펜스를 추가할 수 있음 — parse 단계에서 ` ```json ... ``` ` 또는 ` ``` ... ``` ` 패턴을 strip 한 후 JSON.parse 시도.
  - 첫 시도 실패 시 코드펜스 strip 후 재시도 → 그래도 실패하면 ApiError.
- 결정 권한: api-integration-dev.

### 9.10 본 PRD 가 끝난 뒤의 다음 작업

- 후보:
  - PRD `claude-api-analysis` 진입 — Claude API 직접 호출 (`@anthropic-ai/sdk` 도입).
  - PRD `analyze-prompt-tuning` (가칭) 진입 — prompt engineering 정밀화.
  - PRD `analyze-streaming` (가칭) 진입 — streaming response.
  - PRD `fastapi-deprecation` (가칭) 진입 — fastapi 모드 제거.
  - 다른 후속 (다크 모드, 사용자 메뉴 등) — 인증·세션 선행 필요.
- **PM 권고: `claude-api-analysis` 진입**.
- 사유:
  - 사용자 발언 ("이게 잘 되면 그 후에 api 연결하든가 하려고해") 에 부합.
  - 본 PRD 가 adapter 추상화를 미리 도입 → 후속이 `claudeApiAdapter` 만 추가.
  - Vercel 같은 serverless 환경에서도 동작 가능 (subprocess 미사용).
- 결정 권한: 사용자 (본 PRD 머지 후 결정).

산출물: /Applications/하영/code_source/trading-signal-frontend/docs/prd/claude-cli-analysis.md | UI: no
