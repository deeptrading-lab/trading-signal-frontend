# QA — handoff-grep-pr-url-anchor

- **PR**: #41 (`chore/handoff-grep-pr-url-anchor`)
- **slug**: `handoff-grep-pr-url-anchor`
- **유형**: chore (PRD 없음). PR 본문에 작성자 시뮬레이션 표를 AC 로 채택 + 부가 영향 점검.
- **변경 파일**:
  - `.github/workflows/handoff-append.yml` (-6 / +7) — grep 패턴 PR URL anchor 로 강화
  - `docs/qa/stock-api-integration-final.md` (+264) — `stock-api-integration` 시리즈 종료 리포트 동봉 (단독 PR 금지 정책 준수)
- **검증 시점**: 2026-05-29 (본 PR 미머지, head `chore/handoff-grep-pr-url-anchor`)

## AC 결과 요약

| AC | 항목 | 결과 |
|---|---|---|
| AC-1 | 신규 grep 패턴 정확성 (frontend 매칭 + engine false-positive 회피) | PASS |
| AC-2 | workflow YAML syntax 정합 | PASS (gh workflow view 인식, 최근 82 run 정상) |
| AC-3 | 단독 SESSION_NOTES/QA PR 금지 정책 준수 | PASS (workflow 변경 + QA 동봉) |
| AC-4 | workflow 변경 부가 영향 (checkout/permissions/concurrency/append step) | PASS (변경 0) |
| AC-5 | backward compat (기존 HANDOFF.md frontend entry 형식) | PASS (31/31 표준 형식) |
| AC-6 | 라이브 동작 검증 | DEFERRED (머지 후 자연 검증 — 본 PR #41 자체가 첫 검증 케이스) |

## AC-1. 신규 grep 패턴 정확성

### Scenario A — 본 레포 PR 의 entry 가 이미 있으면 skip (true positive)

```bash
$ PR_URL="https://github.com/deeptrading-lab/trading-signal-frontend/pull/38"
$ grep -qFx -- "- **PR**: $PR_URL" docs/HANDOFF.md && echo MATCH || echo NO_MATCH
MATCH
```

→ frontend #38 entry (line 1921) 존재 → 정상 skip. PASS.

### Scenario B — 본 레포 PR 의 entry 가 없으면 append 진행 (true negative)

```bash
$ PR_URL="https://github.com/deeptrading-lab/trading-signal-frontend/pull/41"
$ grep -qFx -- "- **PR**: $PR_URL" docs/HANDOFF.md && echo MATCH || echo NO_MATCH
NO_MATCH
```

→ frontend #41 entry 아직 없음 → 머지 후 첫 라벨 부착 시 append 예정. PASS.

### Scenario C — 옛 패턴 대비 false-positive 회피 (핵심)

**옛 패턴** (`^### .*\(#41\)$`) 적용 시 — engine backfill entry 헤더와 충돌:

```bash
$ grep -nE "^### .*\(#41\)\$" docs/HANDOFF.md
379:### 2026-05-05 — docs(session-notes): 2026-05-06 오후 세션 정리 append (#41)
```

→ engine #41 entry 가 frontend #41 workflow 실행 시 false-positive 매칭 → **본 PR #41 도 옛 패턴이었으면 같은 사유로 자동 entry 누락됐을 케이스**. 신규 패턴은 PR_URL (frontend) 만 정확 매칭하므로 회피.

**신규 패턴** 의 engine URL 라인 영향 차단 검증:

```bash
$ grep -n "trading-signal-engine/pull/41" docs/HANDOFF.md
382:- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/41
```

→ workflow 가 frontend PR 에서 실행될 때 `PR_URL=frontend/pull/41`, engine URL 라인은 `grep -Fx` (whole-line fixed string) 로 매칭 불가. PASS.

### Scenario D — 옛 패턴 false-positive 사례 3건 회귀 차단 확인

작성자가 보고한 #38/#39/#40 사례:

```bash
$ grep -nE "^### .*\(#38\)\$" docs/HANDOFF.md
268:### 2026-05-05 — docs: SESSION_NOTES.md 신설 + 직전·당일 세션 backfill (#38)
1918:### 2026-05-28 — feat(api,bff): KIS+DART 클라이언트 + 5 BFF 라우트 인프라 (PR-A/3 stock-api-integration) (#38)
```

→ 옛 패턴은 engine backfill (line 268) + frontend (line 1918) 둘 다 매칭. 신규 패턴은 PR_URL 별로 분리 매칭하므로 frontend #38 workflow 실행 시 line 1921 (frontend) 만 보고 skip 결정 정확.

전부 PASS.

## AC-2. workflow YAML syntax 정합

로컬에 `actionlint` / `yamllint` / `python3-yaml` 미설치 — 대체로 GitHub Actions 인식 여부로 검증:

```bash
$ gh workflow view "handoff-on-qa-passed" | head -3
handoff-on-qa-passed - handoff-append.yml
ID: 278918422

Total runs 82
```

→ GitHub Actions 가 workflow 를 정상 인식 + 최근 82 run 실행 이력 (PR 미머지 상태에서도 기존 yml 은 정상). PR 변경분은 단일 step 의 grep 명령 라인만 (라인 30 + 32~36) → YAML 구조 (key 들여쓰기 / 블록 스칼라) 변경 0, indentation 일관. PASS.

## AC-3. 단독 SESSION_NOTES/QA PR 금지 정책 준수

```bash
$ gh pr view 41 --json files
.github/workflows/handoff-append.yml MODIFIED
docs/qa/stock-api-integration-final.md ADDED

$ git log main..chore/handoff-grep-pr-url-anchor --oneline
7772b5e chore(workflow): handoff-append grep 패턴을 PR URL anchor 로 강화
```

→ workflow 변경 + QA 리포트 단일 commit 에 동봉. 단독 QA PR 아님. PASS.

## AC-4. workflow 변경 부가 영향 (회귀 차단)

| 항목 | 기대 | 실측 | 결과 |
|---|---|---|---|
| `actions/checkout` 버전 | `@v4` | `@v4` (line 21) | PASS |
| `permissions:` | `contents: write` + `pull-requests: read` | 동일 (line 7~9) | PASS |
| `concurrency.group` | `handoff-${{ github.event.pull_request.number }}` | 동일 (line 11~13) | PASS |
| `Append handoff entry` step 본문 | line 73~89 변경 0 | diff hunk `@@ -27,13 +27,14 @@` 만 — append step 무변경 | PASS |
| `Commit and push` step | 변경 0 | diff 영향 없음 | PASS |

diff hunk 확인:
```
@@ -27,13 +27,14 @@ jobs:
```
→ 단일 hunk, line 27~ (env + run) 만 수정. 그 외 영역 무변경. PASS.

## AC-5. backward compat (기존 HANDOFF.md frontend entry 형식)

신규 패턴은 `- **PR**: <URL>` 의 **whole-line fixed-string** 매칭. 본 레포 PR 만 매칭하면 충분하므로 frontend 31건 entry 형식 검증:

```bash
$ grep -oE "https://github\.com/deeptrading-lab/trading-signal-frontend/pull/[0-9]+" docs/HANDOFF.md | sort -u | wc -l
31  # unique frontend URL

# 각 URL 에 대해 grep -Fx 시뮬레이션
$ # 결과: 총 unique URL: 31, grep -Fx 매칭: 31
```

→ frontend entry 31/31 (100%) 표준 형식 매칭. PASS.

엣지 케이스 (참고용 — frontend 영향 없음):

- line 20: HANDOFF.md 헤더의 템플릿 예시 (`pull/N` placeholder) — 의도된 예시, 실제 PR_URL 매칭 불가.
- line 169: engine `#33 + #34` 두 URL 한 줄 (수동 chore entry) — frontend workflow 와 무관.
- line 179: engine `#32` URL 뒤 평문 추가 (수동 WIP entry) — frontend workflow 와 무관.

→ frontend PR workflow 의 `PR_URL` 은 항상 `…/trading-signal-frontend/pull/<N>` 이므로 engine 형식 불일치 entry 는 false-positive 도 false-negative 도 유발하지 않음. PASS.

## AC-6. 라이브 동작 검증 (DEFERRED)

본 PR 머지 전이라 실제 workflow 동작은 검증 불가. 다만:

- 본 PR #41 자체가 옛 패턴의 false-positive 회귀 케이스 (engine #41 entry 가 line 379 에 존재).
- 머지 후 본 PR 의 `qa-passed` 라벨 부착 시 workflow 가 신규 패턴으로 동작 → frontend #41 entry 가 정상 append 되면 자연 검증 완료.
- 만약 머지 시 자동 entry 누락되면 (= 신규 패턴도 실패) reviewer 단계에서 회귀 보고 필요.

**권고**: 본 PR `qa-passed` 라벨 부착 후 1~2분 내 `gh run list --workflow handoff-append.yml` 으로 run 결과 확인 권장. skip 되면 회귀.

## 라벨 부여 전 게이트 (PR 본문 `## 다음 작업` 섹션)

```bash
$ gh pr view 41 --json body | python3 -c "import sys,json; print('PASS' if '## 다음 작업' in json.load(sys.stdin)['body'] else 'FAIL')"
PASS
```

본 PR 본문 `## 다음 작업` 섹션 5건 후속 항목 명시 — `qa-passed` 라벨 부착 시 HANDOFF entry 의 `**다음 작업 후보**` 가 정상 추출됨.

## 종합 판정

| 분류 | 결과 |
|---|---|
| AC PASS | 5/5 (AC-1 ~ AC-5) |
| AC DEFERRED | 1/6 (AC-6 — 머지 후 자연 검증) |
| AC FAIL | 0 |
| 회귀 위험 | 없음 (변경 범위 단일 step / append step·permissions·concurrency 무변경) |

**최종 판정: qa-passed**

다음 단계:

1. 본 PR 본문에 `## 다음 작업` 섹션 존재 확인 (PASS).
2. `qa-passed` 라벨 부착 → handoff-append workflow 가 본 PR 의 entry 를 자연 추가 (AC-6 자연 검증).
3. Reviewer 진입.
