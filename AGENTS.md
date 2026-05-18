# AGENTS - Codex Workflow (Trading Signal Frontend)

이 저장소는 `deeptrading-ai`의 프론트엔드 작업 공간이다. Codex는 이 파일을 우선 기준으로 삼고, 백엔드/AI 저장소의 상세 프로세스가 필요하면 `../trading-signal-engine/AGENTS.md`를 참고한다.

## 작업 원칙

- UI 작업은 PRD 또는 사용자 요청에 명시된 범위만 구현한다.
- Next.js/React/TypeScript 기준으로 기존 구조와 package script를 먼저 확인한 뒤 변경한다.
- 디자인 결정은 임의 확장하지 않고, PRD·디자인 문서가 있으면 그 문서를 따른다.
- 빌드 산출물과 의존성 디렉터리(`.next/`, `node_modules/`, `tsconfig.tsbuildinfo`)는 커밋 대상에서 제외한다.
- 커밋 메시지는 한글 요약 한 줄을 기본으로 한다.

## Codex 역할

| 역할 | 하는 일 | 산출물 |
|---|---|---|
| `planner` | 요구를 화면 범위와 수용 기준으로 정리 | PRD/작업 메모 |
| `ux-ui` | 화면 흐름, 상태, 컴포넌트 사용 기준 정리 | 디자인/UX 메모 |
| `frontend-worker` | Next.js UI, API 연동, 상태 처리 구현 | 코드 변경 |
| `qa-checker` | 수용 기준별 테스트와 수동 확인 | 검증 결과 |
| `reviewer` | 범위 이탈, 접근성, 반응형, 보안, 타입 안정성 점검 | 리뷰 의견 |
| `devops` | 빌드/배포 전 확인, push 조건 점검 | 체크 결과 |

## 권장 흐름

```text
요구 확인 -> planner -> ux-ui(필요 시) -> frontend-worker -> qa-checker -> reviewer -> devops
```

작업 시작 시 `git status --short --branch`로 현재 브랜치와 미추적 파일을 확인한다. 백엔드 API 계약이 필요한 경우 `../trading-signal-engine`의 PRD, README, 관련 Python 모듈을 먼저 읽는다.
