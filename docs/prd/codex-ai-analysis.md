# PRD: codex-ai-analysis

- **slug**: `codex-ai-analysis`
- **작성일**: 2026-06-12
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **UI 포함 여부**: **yes** — 종목 상세 헤더와 AI 종합분석 패널에 Claude/Codex 공급자 선택 UI 추가
- **실행 범위**: 로컬 `next dev` 전용. Vercel에서는 로컬 CLI subprocess를 실행하지 않는다.

## 1. 배경 / 문제

현재 종목 상세의 `AI 종합분석`은 Next.js Route Handler가 로컬 `claude` CLI를 직접 실행한다. 사용자는 Codex CLI를 주 개발 도구로 사용하지만, 현재 구현은 Claude 전용 인자(`--print`, `--system-prompt`, `--allowedTools`)와 환경변수에 결합되어 Codex CLI를 선택할 수 없다.

또한 UI에 실제 분석 공급자가 표시되지 않아 어떤 모델 실행기가 결과를 생성했는지 구분하기 어렵다.

## 2. 목표 / 비목표

### 2.1 목표

1. 종목 상세에서 `Claude` 또는 `Codex`를 명시적으로 선택해 AI 종합분석을 실행한다.
2. 기존 8에이전트 순차 실행, Bull/Bear 토론, SSE 이벤트, 중지·재개 기능을 공급자와 무관하게 유지한다.
3. Claude/Codex CLI 차이를 서버 전용 어댑터에서 흡수한다.
4. Codex는 로컬 로그인 세션을 사용해 비대화형 `codex exec`로 실행한다.
5. 공급자 변경 시 이전 결과를 초기화해 서로 다른 공급자의 결과가 한 분석에 섞이지 않게 한다.
6. 타입·단위·빌드·로컬 CLI 스모크 테스트로 실행 가능성을 검증한다.

### 2.2 비목표

- Vercel에서 Claude/Codex CLI 실행
- OpenAI Responses API 또는 Anthropic API 직접 연동
- 공급자별 결과 영속화 및 비교 이력
- 여러 에이전트의 병렬 실행
- 모델별 가격·토큰 사용량 표시

## 3. 사용자 흐름

1. 사용자가 종목 상세 헤더에서 `Claude` 또는 `Codex` 버튼을 누른다.
2. 선택한 공급자로 AI 종합분석 패널이 열리고 최초 분석이 자동 시작된다.
3. 패널 헤더에서 현재 공급자를 확인한다.
4. 분석 중에는 공급자 전환을 막는다.
5. 분석 완료·중지 상태에서 공급자를 바꾸면 기존 결과가 초기화되고 새 공급자의 시작 전 상태가 표시된다.
6. `분석 시작하기` 또는 종목 헤더 버튼으로 선택한 공급자의 분석을 실행한다.

## 4. 개발 작업 세분화

### 4.1 공용 타입·카피

- `AIAnalysisProvider = "claude" | "codex"` 타입 추가
- 공급자 메타데이터(레이블, 설명)와 사용자 노출 카피를 `lib/copy/stock/`에 배치
- SSE 요청 body에 `provider` 추가

### 4.2 Frontend Dev

- 종목 상세 헤더에 Claude/Codex 분리 액션 추가
- `useAIAnalysis`가 선택 공급자를 소유
- `open(provider)`, `selectProvider(provider)` 인터페이스 제공
- 공급자 변경 시 에이전트·리포트·토론·최종 판단·에러 초기화
- 분석 중 공급자 선택 UI 비활성화
- 패널 헤더와 빈 상태에 현재 공급자 표시

### 4.3 API Integration Dev

- `lib/server/ai/agentCli.ts`에 공급자별 CLI 어댑터 구현
- Claude:
  - 기존 `--print --output-format json` 계약 유지
  - 웹 조사 에이전트에 `WebSearch,WebFetch` 허용
- Codex:
  - `codex --search --sandbox read-only --ask-for-approval never exec`
  - stdin으로 시스템 역할과 사용자 요청을 하나의 프롬프트로 전달
  - `--ephemeral`, `--ignore-user-config`, `--skip-git-repo-check`, `--color never`
  - 저장소 외 임시 디렉터리에서 실행해 프로젝트 파일 수정·불필요한 AGENTS 로딩 방지
- CLI 프로세스 중지, 타임아웃, `ENOENT`, 부분 stdout 처리 공통화
- 공급자별 환경변수 지원

### 4.4 QA

- 공급자 선택에 따른 request body 검증
- 공급자 변경 시 상태 초기화 검증
- Claude/Codex CLI args와 출력 파싱 단위 테스트
- `codex exec` 로컬 스모크 테스트
- 데스크톱·모바일 UI 확인
- Vercel 가드와 KIS 미설정 오류 회귀 확인

## 5. 수용 기준

- **AC-1** 종목 상세 헤더에 `Claude`, `Codex` 두 액션이 명확히 구분되어 표시된다.
- **AC-2** 클릭한 공급자가 `POST /api/stock/ai-analysis` body의 `provider`로 전달된다.
- **AC-3** 패널에서 현재 공급자를 표시하고, 분석 중에는 전환할 수 없다.
- **AC-4** 공급자 전환 시 이전 공급자의 결과·진행·오류 상태가 전부 초기화된다.
- **AC-5** Claude 선택 시 기존 CLI 호출 방식과 분석 결과가 회귀하지 않는다.
- **AC-6** Codex 선택 시 로컬 `codex exec`가 비대화형·읽기 전용·승인 없음·임시 세션으로 실행된다.
- **AC-7** 웹 조사가 필요한 뉴스·펀더멘털 에이전트만 Codex `--search`를 활성화한다.
- **AC-8** 중지·재개 시 최초 선택한 공급자를 유지한다.
- **AC-9** 잘못된 provider는 400을 반환하며 임의 바이너리 실행으로 이어지지 않는다.
- **AC-10** `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`가 통과한다.
- **AC-11** 로컬 Codex CLI 스모크 테스트에서 한국어 텍스트 응답을 반환한다.

## 6. 환경변수

| 키 | 기본값 | 설명 |
|---|---|---|
| `CLAUDE_CLI_PATH` | `claude` | Claude CLI 바이너리 |
| `CLAUDE_CLI_MODEL` | 미설정 | Claude 모델 override |
| `CODEX_CLI_PATH` | `codex` | Codex CLI 바이너리 |
| `CODEX_CLI_MODEL` | 미설정 | Codex 모델 override |
| `CODEX_CLI_WORKDIR` | `/tmp` | 저장소 밖 Codex 작업 디렉터리 |

Codex 인증은 로컬 `codex login` 세션을 사용한다. 인증 파일을 앱 환경변수나 저장소에 복사하지 않는다.

## 7. 검증 방법

- Vitest: 공급자 검증, CLI args, 출력 추출, abort/timeout 분류
- 정적 검증: typecheck, lint, Next.js build
- 로컬 통합:
  - `codex --version`
  - 짧은 `codex exec` 스모크 호출
  - `npm run dev` 후 종목 상세에서 Codex 분석 시작
- 브라우저:
  - 데스크톱과 모바일에서 공급자 버튼 구분
  - 분석 중 disabled 상태
  - 공급자 변경 후 결과 초기화

## 8. 영향 분석

- 기존 SSE 응답 이벤트는 변경하지 않아 `AIAnalysisPanel` 렌더링 계약을 유지한다.
- request body에 `provider`가 추가되며 기존 호출자는 기본값 `claude`로 호환한다.
- CLI 실행은 서버 전용 모듈에 한정되고 브라우저 번들에 포함되지 않는다.
- Codex 호출은 사용자 로컬 계정의 사용량과 정책을 따른다.
- 멀티에이전트 전체 실행은 최대 10회 CLI 호출이 발생해 시간과 사용량이 클 수 있다.

## 9. OPEN QUESTION (PM 권고 동봉)

- **q1. 기본 공급자** — 기존 호환성을 위해 Claude를 유지할지, 사용자 선호인 Codex로 변경할지.  
  **권고: 기존 결과가 없는 최초 진입 기본값은 Codex. 헤더의 명시적 버튼으로 어느 공급자든 즉시 실행 가능하게 한다.**
- **q2. 공급자별 결과 보존** — 전환 시 이전 결과를 캐시할지.  
  **권고: MVP는 초기화. 서로 다른 공급자의 중간 결과 혼합 위험을 우선 제거한다.**
- **q3. Codex 프로젝트 컨텍스트** — 저장소를 작업 디렉터리로 제공할지.  
  **권고: 제공하지 않는다. 이 기능은 투자 분석이며 코드 수정 작업이 아니므로 임시 디렉터리 + read-only가 최소 권한이다.**
- **q4. 배포 환경** — Vercel에서도 제공할지.  
  **권고: 이번 범위는 로컬 전용. 배포 지원은 Responses API 기반 별도 PRD로 분리한다.**
