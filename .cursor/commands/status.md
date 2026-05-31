# status

모든 slug 의 진행 현황·블록·우선순위를 **read-only** 로 보고한다.
사용법: `/status [<slug>] [--write] [--for <user>]`

> **SSOT**: 판정 기준은 루트 [AGENTS.md](../../AGENTS.md) 의 핸드오프 표·라벨 플로우.

## Claude Code 와의 차이
Claude Code 의 `/status` 는 read-only `manager` 서브에이전트를 호출한다. Cursor 에선
에이전트가 직접 아래 read-only 절차로 리포트를 만든다. **라벨 변경·머지·푸시 금지.**

## 인자
- 위치 인자 1개 → `slug-detail` 모드 (해당 slug 상세)
- 없음 → `summary` 모드 (전체 요약)
- `--write` → 리포트를 `docs/STATUS.md` 에 저장 (이때만 파일 쓰기 허용)
- `--for <user>` → 해당 사용자 기준 우선순위 추천

## 작성 전 필수 read
1. `docs/SESSION_NOTES.md` 최신 1~2개 — 직전 세션 합의·미결 결정·의도된 보류
2. `docs/HANDOFF.md` 최근 5개 — PR 단위 자동 로그
3. `AGENTS.md` — 라벨 흐름·핸드오프 표
리포트 끝에 위 파일을 읽었음을 1줄 명시.

## 수집·판정
- slug 목록: `docs/prd/*.md` 파일명에서 추출. 각 slug 의 PRD/디자인/QA 존재, `feature/<slug>` 브랜치, 관련 PR(`gh pr list --search`) 확인.
- 단계 판정: PRD 없음→`prd-needed` / UI 있고 디자인 없음→`design-needed` / PR 없음→`impl-needed` / `impl-ready`→`qa-needed` / `qa-passed`→`review-needed` / `review-approved`→`devops-needed` / 머지됨→`done`. (`qa-failed`·`review-changes-requested`→`impl-wip 회귀`)
- 블록 감지: 3일 이상 stale, assignee 충돌, 변경 파일 겹침, QA/Review 실패 누적.

## 허용 명령 (read-only 만)
`gh issue list`, `gh pr list/view`, `gh label list`, `git log/status/diff`(읽기), `ls`, `grep`, `find`.
상태 변경이 필요하면 **추천만** 하고, 실행은 사용자가 `/pipeline` 으로 트리거하도록 안내.

## 출력
요약 표(slug·단계·assignee·PR·마지막 업데이트) + 블록·경고 + 추천 다음 액션 + 완료 목록.
`--write` 면 `docs/STATUS.md` 갱신.
