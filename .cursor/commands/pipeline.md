# pipeline

PM → UX/UI → Frontend/API → QA → Reviewer → DevOps 워크플로를 **순차적으로** 진행한다.
사용법: `/pipeline <slug> [from=<role>] [idea="..."]`

> **SSOT**: 절차·라벨·커밋 규칙은 루트 [AGENTS.md](../../AGENTS.md), 역할 요약은
> [.cursor/rules/agents-workflow.mdc](../rules/agents-workflow.mdc), 컨벤션은
> `docs/rules/*.md`. 아래와 충돌하면 AGENTS.md 가 우선.

## Claude Code 와의 차이 (중요)

Claude Code 의 `/pipeline` 은 각 역할을 **격리된 서브에이전트**로 위임 실행한다.
Cursor 에는 서브에이전트 spawn 기능이 없으므로, **하나의 에이전트가 각 역할을
순차로 연기(act-as)** 하며 단계별 산출물을 만든다. 산출물·라벨 흐름은 동일하되,
**단계마다 멈춰 사용자 확인을 받고** 다음 단계로 넘어간다 (역할 섞임 방지).

## 0. 인자 파싱
- 첫 토큰 = **slug** (kebab-case). 없으면 되묻고 중단.
- `from=<role>` = 지정 역할부터 시작 (`pm|ux-designer|frontend-dev|api-integration-dev|qa|reviewer|devops`).
- `idea="..."` = PM 단계에 넘길 아이디어 원문 (`from=pm` 일 때만 의미).

## 1. 현재 단계 판별 (가장 진행된 단계의 **다음**부터)

| 조건 | 다음 단계 |
|------|-----------|
| `docs/prd/<slug>.md` 없음 | `pm` |
| PRD 에 UI 포함 **and** `docs/design/<slug>.md` 없음 | `ux-designer` |
| `feature/<slug>` PR 없음 | `frontend-dev` (+ BFF 필요 시 `api-integration-dev`) |
| PR 라벨 `impl-ready` | `qa` |
| PR 라벨 `qa-passed` | `reviewer` |
| PR 라벨 `review-approved` | `devops` (사용자 확인 필수) |

`from=<role>` 이 있으면 판별을 건너뛰고 그 역할부터.

## 2. 각 단계 실행 규칙

**한 단계씩** 진행 → 산출물 제시 → 사용자 확인 → 라벨 갱신 → 다음 단계.
절대 여러 단계를 한 번에 묶지 않는다. 각 역할의 상세 책임은 agents-workflow.mdc 참조.

- **pm**: `docs/prd/<slug>.md` 작성 (AGENTS.md PRD 양식 1~7 + §8 영향분석 + §9 OPEN QUESTION). 코드·커밋 없음. 완료 후 PRD 의 UI 포함 여부 확인.
- **ux-designer**: PRD 에 UI 있을 때만. `docs/design/<slug>.md` 를 DESIGN.md 포맷으로 작성.
- **frontend-dev / api-integration-dev**: `feature/<slug>` 브랜치에서 구현. 첫 커밋으로 PRD/DESIGN.md stage. UI+BFF 모두면 같은 브랜치 공유. 끝나면 PR 1회 생성 + `impl-ready` 라벨. PR 본문에 `## 다음 작업` 섹션 필수.
- **qa**: `docs/qa/<slug>.md` 작성 (AC 별 재현·기대·실측 + 에지케이스). 통과 시 `qa-passed`+`impl-ready` 제거, 실패 시 `qa-failed` 로 돌리고 **중단 + 사용자 보고**.
- **reviewer**: 코드 퀄리티·BFF·토큰 정합·HANDOFF 점검. `review-approved` 또는 `review-changes-requested`. 후자면 **중단 + 사용자 보고**.
- **devops**: 실행 **전 사용자 명시 승인** ("PR #N 머지해도 될까요?"). 승인 후 `gh pr merge <N> --squash --delete-branch`. 머지 후 라벨 손대지 않음 (머지=단계종료). 로컬 정리는 한 블록 1회: `git checkout main && git pull --ff-only` → `git branch -D feature/<slug>` → `git branch -D pr-<N>` → `git fetch --prune`.

## 3. 라벨 갱신
`gh pr edit <N> --add-label <L> --remove-label <prev>`. 실재 라벨만 사용:
`impl-ready` → `qa-passed` → `review-approved`. (qa-failed/review-changes-requested 는 회귀)

## 4. 중단 조건 (즉시 멈추고 사용자 보고)
- 단계 산출물 오류
- `qa-failed` 또는 `review-changes-requested`
- DevOps 단계 진입 (사용자 승인 필요)
- slug 충돌 (다른 사람 assignee 존재)

## 5. 최종 보고
단계 완료마다 한 줄 진행 상황, 전체 종료 시 산출물·PR 링크 요약.
