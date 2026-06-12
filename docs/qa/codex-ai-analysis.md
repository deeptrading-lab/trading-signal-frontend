# QA 리포트: codex-ai-analysis

- **slug**: `codex-ai-analysis`
- **작성일**: 2026-06-12
- **대상 브랜치**: `feature/codex-ai-analysis`
- **판정**: qa-passed

## 1. AC 검증

| AC | 검증 내용 | 결과 |
|---|---|---|
| AC-1 | 종목 헤더에 `Claude로 분석`, `Codex로 분석` 버튼이 별도 노출 | 통과 |
| AC-2 | 클라이언트 request body에 선택한 `provider` 포함 | 통과 |
| AC-3 | 패널 헤더에 공급자 선택기와 `aria-pressed` 상태 표시 | 통과 |
| AC-4 | Codex 오류 결과 상태에서 Claude로 전환 시 빈 상태·시작 버튼으로 초기화 | 통과 |
| AC-5 | Claude CLI args와 JSON envelope 추출 단위 테스트 | 통과 |
| AC-6 | Codex `read-only`, `approval=never`, `ephemeral`, 임시 작업 디렉터리 실행 | 통과 |
| AC-7 | 뉴스·펀더멘털만 `--search`, 그 외 에이전트는 검색 비활성 | 통과 |
| AC-8 | 재개 요청이 훅의 현재 provider를 유지 | 통과 |
| AC-9 | `provider=invalid` 요청이 400과 한글 오류 반환 | 통과 |
| AC-10 | 전체 테스트·타입체크·린트·빌드 | 통과 |
| AC-11 | 로컬 Codex CLI가 `Codex 연결 성공` 한국어 응답 반환 | 통과 |

## 2. 자동 검증

### 전체 테스트

```text
Test Files  38 passed | 1 skipped (39)
Tests       251 passed | 1 skipped (252)
```

live backtest 1건은 기존 환경 의존 테스트로 skip.

### 신규 어댑터 단위 테스트

```text
lib/server/ai/__tests__/agentCli.test.ts
5 passed
```

검증 범위:

- Claude CLI 경로·모델·웹 도구 인자
- Codex 최소 기능 플래그와 읽기 전용 실행
- 웹 검색 에이전트 구분
- Claude JSON envelope 추출
- Codex stdout 추출

### 정적 검증

| 명령 | 결과 |
|---|---|
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과, warning 0 |
| `npm run build` | 통과 |

빌드에는 기존 Tailwind config의 module type 경고와 CLI subprocess 동적 경로에 대한 Turbopack NFT 추적 경고가 남는다. 빌드는 정상 완료되며 `/api/stock/ai-analysis`는 동적 Route로 생성된다.

## 3. 로컬 통합 검증

### Codex CLI

```text
OpenAI Codex v0.140.0-alpha.2
approval: never
sandbox: read-only
Codex 연결 성공
```

플러그인·앱·브라우저·컴퓨터 사용·이미지 생성·멀티에이전트·hook 기능을 비활성화한 최소 실행으로 검증했다.

### Route Handler

| 요청 | 실측 |
|---|---|
| `provider=invalid` | 400 `지원하지 않는 AI 공급자입니다.` |
| `provider=codex`, KIS 미설정 | 400 `KIS API가 설정되지 않아 시그널을 계산할 수 없어요.` |

### 브라우저

- 데스크톱 `/stock/005930`: 헤더의 Claude/Codex 분리 버튼 확인
- Codex 클릭: 패널 공급자 선택이 Codex로 활성화
- KIS 미설정 오류 카드와 재시도 버튼 확인
- 패널에서 Claude 선택: 기존 오류 결과가 사라지고 빈 상태로 초기화
- 모바일 390x844: 헤더 컨트롤이 한 줄에 배치되고 패널 공급자 탭이 잘리지 않음

## 4. 로컬 실행 조건

전체 8에이전트 분석에는 다음 조건이 필요하다.

1. KIS 환경변수 설정
2. `codex login` 완료
3. `CODEX_CLI_PATH`가 실행 가능한 바이너리를 가리킴
4. 로컬 `npm run dev` 실행

Vercel 환경에서는 기존 정책대로 503을 반환한다.
