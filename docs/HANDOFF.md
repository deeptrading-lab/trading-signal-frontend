# HANDOFF — 작업 인수인계 로그

> 새 작업을 시작할 때 **이 파일의 최근 5개 항목 + [SESSION_NOTES.md](SESSION_NOTES.md) 최신 1~2개** 를 먼저 읽고 컨텍스트를 잡는다.
> 본인이 다시 돌아왔을 때도 동일하게 확인한다 (어디까지 했는지 잊었을 때).
>
> - **자동 append (QA 통과 시점)**: PR에 `qa-passed` 라벨이 붙으면 [.github/workflows/handoff-append.yml](.github/workflows/handoff-append.yml) 가 **그 PR의 feature 브랜치 자체에** HANDOFF 항목을 commit한다. 별도 PR을 만들지 않고 같은 PR diff에 포함되어 Reviewer가 머지 직전 최종 점검할 때 함께 검토된다.
> - **다음 작업 후보 자동 추출**: PR 본문에 `## 다음 작업` (또는 `## Next steps`, `## Follow-up`, `## 후속`) 섹션이 있으면 그 내용이 자동으로 채워진다. **절대적 지시가 아니라 후보**이므로 다음 작업자는 참고만 하고 우선순위·문맥에 따라 자유롭게 결정한다.
> - **머지 전 최종 점검**: Reviewer 또는 작성자는 머지 직전 자동 생성된 HANDOFF 항목을 읽고 사실관계·다음 작업 후보가 적절한지 확인한다. 부적절하면 그 PR에서 직접 수정 후 머지.
> - **수동 append (선택)**: PR 단위 메모(WIP, 디버깅 발견, 후속 TODO)는 이 파일 하단에 직접 추가해도 된다.
> - **세션 단위 메모는 [SESSION_NOTES.md](SESSION_NOTES.md) 에**: 여러 PR + 사용자 합의 + follow-up 표가 섞인 세션 마무리 정리는 본 파일 자동화로 못 잡으므로 별도 파일에 자유서술로 남긴다.

## 포맷

각 항목은 다음 구조를 따른다.

```markdown
### YYYY-MM-DD — 제목 (#PR / slug)

- **slug**: `slug-name` · **author**: @handle
- **PR**: https://github.com/.../pull/N
- **요약**: 한 줄 요약
- **현재 상태**: main 머지됨 / 후속 필요 / 운영 모니터링 중
- **PR 본문**: PR description 발췌 (자동 채워짐)
- **다음 작업 후보**: PR 본문의 `## 다음 작업` 섹션 발췌 (자동 채워짐, 후보일 뿐 강제 아님)
```

**PR 작성 팁**: PR 본문에 `## 다음 작업` 섹션을 넣어두면 HANDOFF에 자동 반영된다. 예시:

```markdown
## 다음 작업
- 운영 환경에서 N일 모니터링 후 알림 임계값 재조정
- 관련 slug `xyz` 의 후속 PR 진행
```

수동 메모(PR 없는 경우)는 `### YYYY-MM-DD — [WIP] 제목` 형태로 적는다.

---

## 로그

<!-- 새 항목은 이 줄 아래에 자동/수동으로 append된다. 위쪽이 최신이 아니라 아래쪽이 최신이다. -->

### 2026-05-02 — [BACKFILL] HANDOFF 도입 시점 누적 컨텍스트

이 항목은 HANDOFF 자동화 도입 전의 누적 상태를 1회 정리한 것이다. 이후 항목은 PR 단위로 자동 생성된다.

- **author**: @HY0118

**최근 머지된 작업 (최신순)**

- #26 — 코디네이터 봇 셋업 가이드 갱신 (owner 메타변수 + 후속 PR 결과 반영)
- #23 — 디자인 가이드 산출물 DESIGN.md 포맷 표준화
- #22 — references/rules 잔존 도메인 키워드 평문 정정
- #20 — 코디네이터 코드 정리 (dispatcher 추출 + placeholder 가드 + 미사용 import 제거)
- #19 — 코디네이터 PRD/QA 잔존 도메인 키워드 평문 정정
- #18 — feature 브랜치 산출물 commit 규칙 추가
- #16 — 코디네이터 docstring·가이드 잔존 노출 정정
- #14 — 코디네이터 컴플라이언스 가드 모듈 분리 + 응답 발사 가드 도입
- #13 — 코디네이터 진입점 `.env` 자동 로딩
- #12 — Slack 메시지 subtype 가드 추가
- #11 — 이슈 우선순위 정책 (P0/P1/P2) 추가
- #3 — 코디네이터 인바운드 데몬 도입 (Socket Mode)

> **NOTE (2026-05-05)**: 아래 "진행 중 (open)" / "TODO" 두 소섹션은 backfill 시점 (2026-05-02) 의 스냅샷으로, **이미 모두 처리되어 stale 상태**다. 자연어 봇이 정보원으로 인용해 사실관계 오답을 낸 사례가 있어 strikethrough 처리했다. **현재 진행 중인 작업은 본 파일 최하단 항목 + GitHub PR/이슈 라벨로 확인** 한다.
>
> ~~PR #25 / PR #27 / Issue #24 모두 머지·종료 완료. 자세한 entry 는 본 파일 하단 자동 생성 항목 참조.~~

~~**진행 중 (open)** *(stale, 위 NOTE 참조)*~~

- ~~**PR #25** `feature/slack-dev-relay` — QA 통과 후 머지됨 (`8063b68`). 본 파일 하단 자동 entry 참조.~~
- ~~**PR #27** `feature/handoff-system` — 머지됨 (자기 자신 자가 트리거 케이스 검증 통과).~~
- ~~**Issue #24** `[slack-dev-relay]` — PR #25 머지로 close.~~

~~**TODO / 다음 작업 후보** *(stale, 위 NOTE 참조)*~~

- ~~PR #25 QA 진행 → `qa-passed` 라벨 부여 — 완료~~
- ~~PR #27 (HANDOFF 시스템) `qa-passed` → Reviewer → 머지 — 완료~~
- ~~HANDOFF 자동화 동작 확인 후 1~2주 운영 — 진행 중 (정상 동작 확인됨, PR #27/#25 entry 가 자동 추가된 것이 그 증거)~~
- ~~본 backfill 항목은 PR #27 머지 후 첫 자동 entry 가 추가되기 전까지 임시 기준점 역할 — 역할 종료~~

### 2026-05-01 — HANDOFF 인수인계 로그 + qa-passed 시점 자동 append 워크플로우 (#27)

- **slug**: `handoff-system` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/27
- **요약**: HANDOFF 인수인계 로그 + qa-passed 시점 자동 append 워크플로우
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > 두 사람이 비동기로 작업할 때 **직전에 무엇이 머지되었고 무엇이 남았는지**를 빠르게 따라잡기 위한 시스템.
  > 
  > - [docs/HANDOFF.md](docs/HANDOFF.md): 작업 시작 전 최근 5개 항목을 읽는 단일 진입점
  > - [.github/workflows/handoff-append.yml](.github/workflows/handoff-append.yml): `qa-passed` 라벨이 붙은 시점에 **해당 PR의 feature 브랜치 자체**에 HANDOFF 항목을 자동 commit
  > - [AGENTS.md](AGENTS.md): 작업 시작 전 HANDOFF 확인 + 운영 섹션 + Reviewer 게이트에 HANDOFF 점검 항목 추가
  > 
  > ## 동작 방식
  > 
  > 1. PR이 QA를 통과하여 `qa-passed` 라벨이 붙음
  > 2. 워크플로우가 그 PR의 head 브랜치를 checkout
  > 3. PR 번호·제목·작성자·slug·본문 발췌·"다음 작업 후보"를 `docs/HANDOFF.md` 에 append
  > 4. **같은 feature 브랜치에 commit + push** (별도 chore PR 만들지 않음)
  > 5. Reviewer가 코드 + HANDOFF 항목을 한 번에 최종 점검 후 머지
  > 
  > PR 본문에 `## 다음 작업` 섹션이 있으면 자동으로 추출되어 HANDOFF에 후보로 기재됩니다 (강제 아님).
  > 
  > 멱등성: 같은 PR에 라벨이 재부착되어도 `(#PR번호)` 가 이미 있으면 skip.
  > 
  > ## Test plan
  > 
  > - [ ] 이 PR을 QA 통과 처리하여 `qa-passed` 라벨을 부여 → 워크플로우가 동일 브랜치(`feature/handoff-system`)에 HANDOFF 항목을 commit하는지 확인
  > - [ ] 자동 추가된 HANDOFF 항목이 사실관계대로인지 검토
  > - [ ] 라벨을 떼었다가 재부착해도 중복 entry가 생기지 않는지 확인 (멱등성)
  > - [ ] PR 본문의 `## 다음 작업` 섹션이 HANDOFF "다음 작업 후보" 로 잘 추출되는지 확인
  > 
  > ## 다음 작업
  > 
  > - 머지 후 다음 PR부터는 본문에 `## 다음 작업` 섹션을 의식적으로 작성하여 HANDOFF 추적 품질 확인
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 머지 후 다음 PR부터는 본문에 `## 다음 작업` 섹션을 의식적으로 작성하여 HANDOFF 추적 품질 확인
  - 1~2주 운영 후 본문 발췌 길이(현재 30줄)가 너무 길면 축소 검토
  - main 브랜치 보호 규칙이 있다면 `github-actions[bot]` 의 feature 브랜치 push 가 막히지 않는지 첫 트리거 시 확인

### 2026-05-05 — feat(slack-dev-relay): MVP 데몬 구현 (#25)

- **slug**: `slack-dev-relay` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/25
- **요약**: feat(slack-dev-relay): MVP 데몬 구현 — Slack DM 명령으로 로컬 Claude Agent SDK 세션을 트리거하는 단일 프로세스 봇. PR amend 로 구독 모드 인증(claude CLI 승계) 추가, `.env.local` 분리.
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (사용자 PC + Slack 워크스페이스에서 수동 검증 완료, audit log/취소 흐름/구독 모드 시작 로그까지 확인)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > `docs/prd/slack-dev-relay.md` 의 MVP 데몬을 구현합니다. Slack DM 명령을 받아 로컬 큐에 적재하고 Block Kit 버튼으로 2단계 승인을 받아 Claude Agent SDK 세션을 트리거하는 단일 프로세스 봇입니다.
  > 
  > Closes #24
  > 
  > ## 변경 범위
  > 
  > ### 신규 패키지: `ai/dev_relay/`
  > - `__init__.py` / `main.py` — Socket Mode 진입점, audit log, rate limit, graceful shutdown
  > - `config.py` — 환경변수 검증 (xoxb / xapp / sk-ant prefix + placeholder 차단)
  > - `auth.py` — 화이트리스트 + user_id 마스킹 (앞 6자)
  > - `queue.py` — SQLite 단일 파일 (`~/.local/state/dev_relay/queue.db`), 멱등성·동시 1건·재시작 복구
  > - `dispatcher.py` — 3개 명령 (`status` / `review pr <N>` / `merge pr <N>`) 파싱 + destructive op 1차 차단
  > - `agent_runner.py` — SDK 호출 worker thread + destructive op 2차 차단
  > - `slack_renderer.py` — Block Kit 빌더 + 발사 직전 컴플라이언스 가드 + 정적 템플릿 import 시점 검증
  > 
  > ### 신규 테스트: `ai/tests/dev_relay/`
  > - `test_dispatcher.py` — 36 케이스 (명령 파싱·정규화·destructive 검출)
  > - `test_queue.py` — 13 케이스 (멱등성·상태 전이·재시작 시뮬레이션)
  > - `test_auth.py` — 17 케이스 (화이트리스트·마스킹·액션 페이로드)
  > - `test_compliance.py` — 39 케이스 (runtime 가드·Block Kit 빌더·PRD/소스 정적 검사)
  > - `test_config.py` — 추가 (필수/선택 토큰, auth_mode, 마스킹·placeholder·prefix 검증)
  > 
  > ### 의존성
  > - `ai/requirements.txt` 에 `claude-agent-sdk>=0.1.72,<0.2` 추가
  > 
  > ### amend (구독 모드 + .env.local)
  > - `ANTHROPIC_API_KEY` 를 선택으로 강등 — 미설정 시 구독 모드 (`claude` CLI 인증 승계)
  > - 시작 로그에 `auth_mode=api_key|subscription` 1라인
  > - dotenv 로딩 `.env` → `.env.local` (override=True). 공유 저장소이므로 개인 토큰은 `.env.local` 격리
- **다음 작업 후보** (절대적 지시 아님):
  - 실 reviewer agent 통합 PR (AC-4 / AC-5 2단계 / AC-14 의 deferred 항목을 살리는 후속 PRD/PR)
  - launchd plist 자동 설치 (PRD 부록 B) 가 필요해질 시점에 별도 PRD
  - 구독 quota 사용량 모니터링 (Max 20x 한도 진단) — 일상 운영 데이터가 쌓이면 cost-aware-llm-pipeline 가드 통합 검토

### 2026-05-05 — chore: Makefile — daemon/test/install 명령 정리 (#33) / pip → python -m pip 후속 fix (#34)

- **slug**: `makefile` · **author**: @HY0118 (수동 entry — chore 라벨이라 qa-passed 자동 append 미적용)
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/33 + https://github.com/deeptrading-lab/trading-signal-engine/pull/34
- **요약**: 데몬 실행·테스트 등 평문으로 PRD 부록에만 적혀 있던 명령을 루트 `Makefile` 한 장으로 모음. 두 봇 (coordinator / dev_relay) 데몬 타겟 분리. 이후 `pip` shim 없는 venv (uv-managed 등) 회귀를 `python -m pip` 으로 일반화 fix.
- **현재 상태**: 둘 다 main 머지 완료 (`bf45789`, `84532a6`).
- **다음 작업 후보**:
  - HANDOFF.md / README.md 에 "make help 부터 보세요" 한 줄 추가 검토 (별도 docs PR)
  - 명령이 더 늘면 그때 pyproject.toml + 콘솔 entry point 마이그레이션 검토

### 2026-05-05 — [WIP] feat(dev-relay): Phase 1 자연어 분기 — A.2 수동 검증 중 (#32)

- **slug**: `dev-relay-natural-language` · **author**: @HY0118 (수동 WIP entry — qa-passed 라벨 부여 시점에 정식 자동 entry 가 위에 append 됨)
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/32 — 라벨 `impl-ready`, QA 대기 중.
- **요약**: PRD `dev-relay-natural-language` Phase 1 (read-only 자연어 에이전트 루프) 구현. SDK 0.1.73 / Haiku 분류 + Sonnet 응답 / PreToolUse hook / 30분 만료 세션 / B-2 URL placeholder escape.
- **현재 상태**:
  - 자동 테스트 484건 통과 (회귀 0건)
  - 수동 검증 진행 중: A.1 (PASS, 추정), A.2 (부분 PASS — 응답 도착·Block Kit 분할·다중 정보원 종합 OK / 단 사실관계 오류 발견 — 본 backfill stale 인용이 원인 → 본 PR 로 수정), A.3~A.8 미진행
  - 수동 검증 중 SDK 버그 1건 발견·수정: `HookJSONOutput()` 호출 → `'types.UnionType' object is not callable` 에러. fix 커밋 `c8e69ce`. PR #32 에 통합.
- **다음 작업 후보**:
  - A.3~A.8 마저 진행해 전체 부록 A QA 완료
  - QA 보고서 (`docs/qa/dev-relay-natural-language.md`) 작성 후 `qa-passed` 라벨
  - **shell metachar 정책 완화 후속 PR** (`feat/dev-relay-shell-pipe-allow`) — `| head` / `2>/dev/null` 같은 read-only 패턴 한정 허용. A.2 검증 중 LLM 이 `gh pr view ... 2>/dev/null || ...` 시도하다 차단된 사례 다수.

### 2026-05-05 — chore(dev-relay): audit.jsonl 0600 권한 + _RateLimiter 단위 테스트 (#36)

- **slug**: `slack-dev-relay-audit-perm-ratelimit-test` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/36
- **요약**: chore(dev-relay): audit.jsonl 0600 권한 + _RateLimiter 단위 테스트
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 이슈 #28 follow-up 의 1번 항목 (audit 0600 + RateLimiter 테스트) 만 처리하는 mini-PR. shutdown watchdog (#28 의 다른 항목) 은 별도 PR 로 다룬다.
  > 
  > ## 변경 사항
  > 
  > 1. **`audit.jsonl` 0600 권한 적용** — `ai/dev_relay/main.py::_append_audit` 가 신규 파일 생성 시 `os.chmod(path, 0o600)` 호출. 이미 존재하는 파일은 사용자가 명시적으로 권한을 풀어둔 경우를 존중해 건드리지 않음. PRD `docs/prd/slack-dev-relay.md` §3.8 "로컬 파일 권한 — 파일 0600" 준수.
  > 2. **`_RateLimiter` 단위 테스트 추가** — `ai/tests/dev_relay/test_rate_limiter.py`. AC-15 회귀 보호 4 케이스:
  >    - 같은 user_id 5초 내 3회 통과 / 4회째 차단
  >    - 윈도우 경과 후 카운터 리셋
  >    - 다른 user_id 독립 카운터
  >    - 정확히 윈도우 경계 시각 (5.0초) 동작 명세 (`bucket[0] < cutoff` 동작 못박기)
  > 
  > `time.monotonic` 의존 회피를 위해 `now=` 인자를 주입해 결정론적 테스트.
  > 
  > ## 의도적으로 하지 않은 것
  > 
  > - `_RateLimiter` 모듈 추출 — 이슈 #28 본문의 권고이지 요구사항이 아님. blast radius 최소화를 위해 별도 PR 로 다룬다.
  > - shutdown watchdog (#28 의 별도 항목) — 다음 PR.
  > 
  > ## 수용 기준 체크리스트
  > 
  > - [x] 신규 audit.jsonl 파일이 0600 권한으로 생성된다
  > - [x] 기존 파일은 chmod 호출 없이 그대로 둔다
  > - [x] `_RateLimiter` 4 케이스 테스트 통과
  > - [x] 전체 회귀: `pytest ai/tests/ -q` 509 passed
  > - [x] 빠른 재현: `pytest ai/tests/dev_relay/test_rate_limiter.py -v`
  > 
  > ## 참고
  > 
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-05 — fix(dev-relay): AgentRunner.shutdown(timeout) watchdog 보강 (#37)

- **slug**: `slack-dev-relay-shutdown-watchdog` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/37
- **요약**: fix(dev-relay): AgentRunner.shutdown(timeout) watchdog 보강
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 범위
  > Issue #28 항목 2 (shutdown watchdog) + PR #36 nit 이월 1건.
  > 
  > ## 배경
  > `AgentRunner.shutdown(timeout=...)` 은 timeout 인자를 받지만 `ThreadPoolExecutor.shutdown` 이 timeout 을 지원하지 않아 무시되고 있었다. 호출 측 `ai/dev_relay/main.py:809` 에서 30초 timeout 을 넘기지만 실제로는 무한 대기. PRD `docs/prd/slack-dev-relay.md` §3.7 (graceful shutdown 30초 timeout) 의 의도를 코드로 보장한다.
  > 
  > ## 변경
  > ### 1) `AgentRunner.shutdown` watchdog (`ai/dev_relay/agent_runner.py`)
  > - `wait=True` + `timeout` 지정: 별도 daemon thread (`dev-relay-agent-shutdown`) 에서 `executor.shutdown(wait=True)` 를 수행하고 `thread.join(timeout)` 로 대기. timeout 만료 시 `executor.shutdown(wait=False)` 로 신규 task 만 차단하고 WARNING 로그 (`shutdown timeout exceeded (%.1fs) — forcing`).
  > - `wait=True` + `timeout=None`: 기존 동작 (무한 대기) 유지.
  > - `wait=False`: 기존 동작 (즉시 반환) 유지.
  > - docstring 의 "호출자가 별도 watchdog thread 로 강제 종료를 구현한다" 문구 제거.
  > - 호출 측 `main.py:809` 는 손대지 않음 (회귀 보호).
  > 
  > ### 2) PR #36 nit 이월 (`ai/dev_relay/main.py::_append_audit`)
  > - docstring 한 줄: `"부모 디렉터리는 default_db_path() 호출 측에서 0700 으로 보장된다"` → `"부모 디렉터리(0700) 는 JobQueue::_ensure_dir_secure 가 보장한다."`. 코드 동작 변경 없음.
  > 
  > ## 테스트 (`ai/tests/dev_relay/test_agent_runner_shutdown.py`, 신규)
  > - 빠른 task → timeout 안 걸림, watchdog WARNING 0건.
  > - 느린 task (2s sleep) → `timeout=0.2` 만료 후 ~0.3초 이내 반환 + WARNING 1건.
  > - `timeout=None` → watchdog 미등록, 정상 종료.
  > - `wait=False` → watchdog 미등록, 즉시 반환.
  > 
  > 전체 회귀: `pytest -q` → 513 passed, 0 failures.
  > 
  > ## 수용 기준
  > - [x] `AgentRunner.shutdown(wait=True, timeout=T)` 가 T 초 안에 반환된다 (worker task 가 더 오래 걸려도).
  > - [x] timeout 만료 시 WARNING 로그 (`shutdown timeout exceeded`) 가 한 번 남는다.
  > - [x] `wait=True, timeout=None` / `wait=False` 기존 호출은 회귀 없음.
  > - [x] 호출 측 `main.py:809` 무수정.
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-05 — docs: SESSION_NOTES.md 신설 + 직전·당일 세션 backfill (#38)

- **slug**: `handoff-session-notes` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/38
- **요약**: docs: SESSION_NOTES.md 신설 + 직전·당일 세션 backfill
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - 세션 단위 자유서술 메모 파일 [docs/SESSION_NOTES.md](docs/SESSION_NOTES.md) 신설.
  > - HANDOFF 자동화는 PR 본문 `## 다음 작업` 섹션만 추출 → **여러 PR + 사용자 합의 + follow-up 표가 섞인 세션 마무리 정리는 누락**. 직전 세션의 P1/P2/P3 follow-up 5건이 어떤 파일에도 안 남아 이번 세션 시작 시 사용자가 직접 이미지로 공유해야 했음.
  > - 직전 세션(2026-05-05) + 당일 세션(2026-05-06) backfill, HANDOFF.md 안내에 SESSION_NOTES 참조 한 줄 추가.
  > - 누락 QA 리포트 2건(PR #36/#37 머지 시점에 포함됐어야 함) 동봉.
  > 
  > ## 변경 요약
  > 
  > - `docs/SESSION_NOTES.md` 신설 — 형식 가이드, 작성 시점, 정책, 2026-05-05/06 두 항목.
  > - `docs/HANDOFF.md` 상단 안내 보강 — "세션 단위 메모는 SESSION_NOTES.md 에" 한 줄.
  > - `docs/qa/slack-dev-relay-audit-perm-ratelimit-test.md` (PR #36 누락분 동봉).
  > - `docs/qa/slack-dev-relay-shutdown-watchdog.md` (PR #37 누락분 동봉).
  > 
  > ## 설계 결정 (3개 옵션 중)
  > 
  > | 옵션 | 채택 | 이유 |
  > |---|---|---|
  > | 1. Stop hook 자동화 | X | 마찰 ↑, 사용자가 안 쓸 가능성 |
  > | 2. PR 템플릿에 `## 다음 작업` 강제 | X | 세션 단위(여러 PR 묶음)는 여전히 못 잡음 |
  > | **3. 별도 SESSION_NOTES.md** | **O** | HANDOFF 자동화 단순성 유지 + 자유서술로 사각 보완 |
  > 
  > ## Test plan
  > 
  > - [x] `docs/SESSION_NOTES.md` 형식 가이드와 두 backfill 항목이 일관 (위 과거, 아래 최신).
  > - [x] `docs/HANDOFF.md` 안내가 SESSION_NOTES 와 모순 없음 (PR 단위 vs 세션 단위 책임 분리 명확).
  > - [x] QA 리포트 2건 내용 자체는 이미 검증된 것 (PR #36/#37 QA 통과 시점에 작성).
  > - [ ] reviewer/QA 가 본 PR 자체를 검토.
  > 
  > ## 다음 작업
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (선택) 다음 세션 시작 시 본 PR 의 SESSION_NOTES 최신 항목을 컨텍스트로 사용. 동작이 의도대로면 정책 정착, 아니면 옵션 1/2 추가 검토.
  - `dev-relay-agent-integration` PRD 초안 [별도 PR](docs/prd/dev-relay-agent-integration.md) 로 처리 (사용자 검토 후).
  - shell metachar 정책 완화 (`feat/dev-relay-shell-pipe-allow`) — 직전 세션 P1, 추천 다음 트랙 1순위.

### 2026-05-05 — docs(qa): handoff-session-notes 리포트 backfill (#39)

- **slug**: `qa-handoff-session-notes-backfill` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/39
- **요약**: docs(qa): handoff-session-notes 리포트 backfill
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - PR #38 머지 후 사후 작성된 QA 리포트(`docs/qa/handoff-session-notes.md`)를 단독 chore PR 로 backfill.
  > - 리포트 자체는 PR #38 QA 통과 시점에 검증된 것 (5/5 AC PASS, 회귀 513 passed). 본 PR 에서 다시 검증 불필요.
  > 
  > ## 배경
  > 
  > PR #38 자체에 QA 리포트를 동봉하지 못한 이유 — QA 에이전트가 PR #38 머지 직후 리포트를 작성했고 (자동 hook 없음), main 으로 commit 되지 않은 채 워킹 디렉토리에만 남아 있었다. 새 세션에서 untracked 상태로 발견되어 분리 PR 로 처리.
  > 
  > ## Test plan
  > 
  > - [x] 파일 내용은 PR #38 QA 통과 시점에 이미 검증됨.
  > - [ ] reviewer 가 본 PR 자체를 검토 (docs-only chore).
  > 
  > ## 다음 작업
  > 
  > - (구조 보강 후순위) QA 에이전트가 PR 머지 직후 리포트를 자동 동봉하도록 자동화 검토 — 본 PR 처럼 backfill 필요 사례가 반복되면 진행.
  > 
  > ## Refs
  > 
  > - PR #38 (SESSION_NOTES 도입, merged `3dbb3ca`)
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (구조 보강 후순위) QA 에이전트가 PR 머지 직후 리포트를 자동 동봉하도록 자동화 검토 — 본 PR 처럼 backfill 필요 사례가 반복되면 진행.

### 2026-05-05 — docs(handoff): SESSION_NOTES.md read 의무화 (manager·status·AGENTS) (#40)

- **slug**: `session-notes-read-mandate` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/40
- **요약**: docs(handoff): SESSION_NOTES.md read 의무화 (manager·status·AGENTS)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > 직전 세션에서 SESSION_NOTES.md 가 도입됐지만(#38), 그 read 의무를 manager 서브에이전트·status 스킬·AGENTS.md 진입 안내 어디에도 명시 안 했다. 결과: 다음 세션 Claude 가 `/status` 호출 시 SESSION_NOTES 를 무시하고 HANDOFF/`gh`/AGENTS.md 만 참고해 **사용자 합의(\"PRD 검토 후 PR 등록\")를 무시한 권고**를 함. 본 PR 로 read 의무를 명시한다.
  > 
  > ## 변경
  > 
  > - `AGENTS.md`
  >   - 상단 진입 안내(line 6): "HANDOFF 최근 5개" → "**SESSION_NOTES 최신 1~2개 + HANDOFF 최근 5개**" 로 보강.
  >   - 문서 표(line 15-): `docs/SESSION_NOTES.md` 행 추가, 두 파일의 책임 분담 명시.
  >   - §"작업 인수인계" 섹션 보강: 두 파일이 보완 관계임 + 시작 전 읽는 순서(SESSION_NOTES → HANDOFF) + 누락 시 사례.
  > - `.claude/agents/manager.md`: "작업 시작 전 필수 read" 절 신설. 리포트 끝에 두 파일 read 사실을 1줄로 명시 강제.
  > - `.claude/commands/status.md`: manager 호출 프롬프트에 동일 의무 + 직전 세션 합의 반영 지시 추가.
  > 
  > ## Test plan
  > 
  > - [ ] 본 PR 머지 후 새 Claude 세션에서 `/status` 호출 시 manager 가 SESSION_NOTES 최신 항목을 실제로 읽고, 리포트 끝에 read 사실을 1줄로 명시하는지 확인.
  > - [ ] PRD `dev-relay-agent-integration` 가 untracked 상태로 남아 있어도 manager 가 \"의도된 보류\"(SESSION_NOTES 미결·블록 절 명시) 임을 인지해 즉시 PR 화 권고를 안 하는지 확인.
  > 
  > ## 다음 작업
  > 
  > - 다른 서브에이전트(pm/qa/reviewer/devops/backend-dev/frontend-dev/ux-designer)도 SESSION_NOTES read 가 필요한지 검토. 본 PR 은 manager 만 다룬다 — pipeline 흐름 외 직접 호출은 manager 가 진입점이므로.
  > - (운영 1~2주 후) SESSION_NOTES read 의무가 실제로 새 세션 권고 품질을 끌어올렸는지 평가. 안 됐으면 hook 자동화 검토.
  > 
  > ## Refs
  > 
  > - 누락 사례: 2026-05-06 세션 마무리 직후 새 세션 `/status` 결과.
  > - PR #38 (SESSION_NOTES.md 도입, merged \`3dbb3ca\`).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 다른 서브에이전트(pm/qa/reviewer/devops/backend-dev/frontend-dev/ux-designer)도 SESSION_NOTES read 가 필요한지 검토. 본 PR 은 manager 만 다룬다 — pipeline 흐름 외 직접 호출은 manager 가 진입점이므로.
  - (운영 1~2주 후) SESSION_NOTES read 의무가 실제로 새 세션 권고 품질을 끌어올렸는지 평가. 안 됐으면 hook 자동화 검토.

### 2026-05-05 — docs(session-notes): 2026-05-06 오후 세션 정리 append (#41)

- **slug**: `session-notes-2026-05-06-late` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/41
- **요약**: docs(session-notes): 2026-05-06 오후 세션 정리 append
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > 오늘 오후 세션 마무리 정리 + SESSION_NOTES 작성 정책 갱신.
  > 
  > - SESSION_NOTES.md 에 2026-05-06 오후 항목 append (PR #39/#40 흐름 + 다음 세션 시작 포인트 7건)
  > - **정책 갱신**: SESSION_NOTES 단독 PR 금지 — HANDOFF 자동화 컨벤션과 통일해 **세션 마지막 작업 PR 의 같은 브랜치에 append** 하고 함께 머지. 본 PR 자체는 정책 도입 메타 작업 케이스.
  > - AGENTS.md §"작업 인수인계" 섹션에 동일 정책 명시.
  > 
  > ## 변경
  > 
  > - `docs/SESSION_NOTES.md` — 2026-05-06 오후 항목 append + 형식 가이드에 "별도 PR 금지" 절 추가
  > - `AGENTS.md` — §"작업 인수인계" 에 SESSION_NOTES 작성 방식 정책 추가
  > 
  > ## Test plan
  > 
  > - [x] SESSION_NOTES.md 형식 가이드와 신규 항목 일관 (위 과거 / 아래 최신)
  > - [x] AGENTS.md 정책이 SESSION_NOTES 본문 정책과 모순 없음
  > - [ ] reviewer/QA 검증
  > 
  > ## 다음 작업
  > 
  > - 내일부터는 본 정책 적용. 세션 마지막 PR 이 정해질 때까지 SESSION_NOTES 항목 작성 보류.
  > - PRD `dev-relay-agent-integration` 사용자 검토 후 별도 PR (다음 세션 첫 트랙).
  > - Issue #28 본문 strikethrough (사용자 동의 후, 외부 가시 액션).
  > - shell metachar 정책 완화 — 다음 세션 추천 1순위.
  > 
  > ## Refs
  > 
  > - 이전 세션 마무리(#38)에서 SESSION_NOTES 도입, read 의무화(#40), QA backfill(#39) 흐름.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 내일부터는 본 정책 적용. 세션 마지막 PR 이 정해질 때까지 SESSION_NOTES 항목 작성 보류.
  - PRD `dev-relay-agent-integration` 사용자 검토 후 별도 PR (다음 세션 첫 트랙).
  - Issue #28 본문 strikethrough (사용자 동의 후, 외부 가시 액션).
  - shell metachar 정책 완화 — 다음 세션 추천 1순위.

### 2026-05-06 — feat(dev-relay): 에이전트 통합 — reviewer 결과·실 머지·동시성 큐 적재 (#43)

- **slug**: `dev-relay-agent-integration` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/43
- **요약**: feat(dev-relay): 에이전트 통합 — reviewer 결과·실 머지·동시성 큐 적재
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > 상위 PRD `slack-dev-relay.md` deferred 3건(AC-4 reviewer 결과 + Block Kit 버튼, AC-5 2단계 실 머지, AC-14 동시성 큐 적재) 을 reproducible 하게 통합한다. 본 PRD: docs/prd/dev-relay-agent-integration.md (#42).
  > 
  > ### 트리거 / 참고
  > - 트리거 Issue: #28
  > - 상위 PRD: docs/prd/slack-dev-relay.md
  > - 본 PRD: docs/prd/dev-relay-agent-integration.md
  > - 선행 PR: #25 (slack-dev-relay), #37 (AgentRunner shutdown)
  > 
  > ### 구현 결정 (PRD §10 표 그대로)
  > - **Worker 루프**: 데몬 시작 시 백그라운드 thread 1개 (`JobPicker`). `JobQueue.pending` 을 1초 폴링 (`DEFAULT_POLL_INTERVAL_S`). oldest-first 1건 dequeue → `pending → running` atomic 전이 (`claim_next_pending`).
  > - **reviewer 호출**: `AgentRunner.run_callable` 경유. `nl_sdk_runtime` 와 별도 진입점 (`_build_reviewer`). 결과는 `ReviewResult(summary, findings, detail)` — `[머지 검토]` `[상세 보기]` 버튼 발사 + `ReviewDetailCache(LRU)` 에 본문 저장. `[상세 보기]` 캐시 유실 시 `TEMPLATE_REVIEW_DETAIL_LOOKUP_FAILED` 안내 + audit `reviewer_detail_lookup_failed`.
  > - **머지 호출**: `_perform_merge` (merger 모듈) — `AgentRunner` 우회. `gh pr merge <N> --squash --delete-branch` 고정 (PRD §10). `validate_approval` 이 화이트리스트 user_id + action_id + payload 의 idempotency_key·job_id 일치를 통과한 경우에만 호출.
  > - **Block Kit 페이로드 v2**: `pr=<N>;key=<idempotency_key>;job=<job_id>` 신규 포맷. `[머지 검토]` `[승인]` `[취소]` `[상세 보기]` 모두 본 포맷. legacy `build_action_value`/`parse_action_value` 는 호환성 유지용으로 남김.
  > - **destructive 가드 회귀**: `is_destructive` 가 \`gh pr merge\` 를 차단하지 않음을 회귀 테스트로 명시 (`test_merger.py::TestDispatcherDoesNotBlockGhMerge`). 기존 `git reset --hard`, `force push`, `branch -d`, `clean -fd` 차단은 그대로.
  > - **실패 분류 5개** (`failures.py`): `destructive_blocked` / `sdk_timeout` / `github_unauthorized` / `github_unprocessable` / `compliance_blocked` + `unknown_error` fallback. 각 분류별 사용자 노출 메시지는 PRD §3.5 표 그대로 정적 템플릿 (`TEMPLATE_FAIL_*`).
  > - **신규 audit kind 7개**: `reviewer_started`, `reviewer_done`, `reviewer_failed`, `reviewer_detail_lookup_failed`, `merge_started`, `merge_done`, `merge_failed`. 기존 `command_received`/`job_started`/`job_done` 라이프사이클과 협업.
  > - **재시작 머지 carve-out**: `audit_recovery.find_merge_in_flight_job_ids` 가 `merge_started` 후 종결 라인 없는 job_id 를 식별. `JobQueue.recover_running_as_failed(merge_in_flight_job_ids=...)` 가 carve-out job 은 `unknown` 으로 남기고 사용자 안내 (`TEMPLATE_MERGE_CARVE_OUT_NOTICE`).
  > - **컴플라이언스**: 신규 메시지·버튼 라벨·audit kind 명·신규 PRD 본문·신규 모듈 모두 `ai/coordinator/_compliance.py` `FORBIDDEN_KEYWORDS` 통과. `test_compliance.py` 정적 검사가 본 PRD 산출물도 커버.
  > 
  > ### 신규 모듈 (재사용 인프라 재구현 금지 원칙 준수)
  > - `ai/dev_relay/worker.py` — `JobPicker`, `JobHandler` 시그니처. `AgentRunner` 그대로 사용.
  > - `ai/dev_relay/reviewer.py` — `ReviewResult`, `ReviewDetailCache`, `truncate_findings`. SDK 호출 자체는 caller-injected.
  > - `ai/dev_relay/merger.py` — `validate_approval`, `perform_merge`, `classify_merge_stderr`, `extract_sha`. 외부 프로세스 호출도 caller-injected.
  > - `ai/dev_relay/failures.py` — `FailureClassification`, `classify_exception`, `classify_github_status`, `user_message_for`.
  > - `ai/dev_relay/audit_recovery.py` — `find_merge_in_flight_job_ids`.
  > - `ai/dev_relay/queue.py` 추가: `claim_next_pending`, `mark_unknown`, `recover_running_as_failed` 시그니처 확장 (failed/unknown 분리).
  > - `ai/dev_relay/slack_renderer.py` 추가: `build_action_value_v2`/`parse_action_value_v2`/`ActionPayloadV2`, 7개 신규 정적 템플릿.
  > 
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-06 — feat(dev-relay): Bash 가드 pipe(|) 부분 허용 — segment 분리 + 재귀 검증 (#45)

- **slug**: `dev-relay-shell-pipe-allow` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/45
- **요약**: feat(dev-relay): Bash 가드 pipe(|) 부분 허용 — segment 분리 + 재귀 검증
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > NL 세션 read-only 가드(`ai/dev_relay/tool_policy.py`)에 **`|` (pipe) 부분 허용** 로직을 추가했습니다. 양쪽 segment 가 모두 read-only 화이트리스트에 들어맞을 때만 통과시키고, 다른 metachar 6종(`>`, `>>`, `<`, `&`, `;`, `` ` ``, `\$()`)은 거부 유지.
  > 
  > - 트리거 PRD: [docs/prd/dev-relay-shell-pipe-allow.md](docs/prd/dev-relay-shell-pipe-allow.md) (#44 머지됨)
  > - 변경 대상: `ai/dev_relay/tool_policy.py` 단일 파일 (호출 측 변경 없음)
  > - 신규 reason / audit kind / 외부 인터페이스 변경 **0건**
  > 
  > ## 수용 기준 체크리스트
  > 
  > - [x] **AC-PIPE-1** 양쪽 RO pipe 허용 (12건 parametrize, `TestBashPipeAllowed`)
  > - [x] **AC-PIPE-2** 우회 시도 13종 거부 (PRD §3.5 매트릭스, `TestBashPipeBypassDenied`)
  > - [x] **AC-PIPE-3** 기존 단일 명령 회귀 0건 (88 → 125 case 모두 pass)
  > - [x] **AC-PIPE-4** segment 수 상한 5 — 6 segment `parse_error`, 5 segment 통과
  > - [x] **AC-PIPE-5** 빈 segment / 토큰화 오류 (`||`, leading/trailing pipe, unclosed quote)
  > - [x] **AC-PIPE-6** destructive 1차 차단 우선순위 (`TestBashDestructiveDenied` 보강 2건)
  > - [x] **AC-PIPE-7** 다른 metachar 잔존 거부 (3건)
  > - [x] **AC-PIPE-8** 컴플라이언스 정적 검사 — PRD 본문 0 hit, `test_dev_relay_source_clean` 자동 커버
  > - [x] **AC-PIPE-9** NL hook 통합 회귀 (`TestNLPipeHookIntegration` 3건 — SDK PreToolUse 시나리오)
  > 
  > ## 구현 핵심
  > 
  > 1. `_evaluate_bash(command, *, depth=0)` — internal depth parameter 추가 (max 1, fail-fast)
  > 2. destructive 1차 차단 → 토큰화 → `|` 검출 시 `_evaluate_pipe_segments` 분기
  > 3. `_evaluate_pipe_segments` — 토큰 기준 분할, 빈 segment / 상한 검사, 잔존 metachar 검사, 각 segment `_evaluate_bash(depth=1)` 재귀
  > 4. 한 segment 라도 거부되면 그 segment 의 reason 그대로 전파 (audit 가독성)
  > 5. 모듈 상수 `_MAX_PIPE_SEGMENTS = 5` 노출
  > 
  > ## 우회 매트릭스 13건 통과 확인 (AC-PIPE-2)
  > 
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-12 — feat(dev-relay): NL 분기 process-wide 직렬화 — threading.Lock 단일 인스턴스 (#48)

- **slug**: `dev-relay-nl-serialize-impl` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/48
- **요약**: feat(dev-relay): NL 분기 process-wide 직렬화 — threading.Lock 단일 인스턴스
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 개요
  > 
  > PRD [`docs/prd/dev-relay-nl-serialize.md`](../blob/main/docs/prd/dev-relay-nl-serialize.md) (#46) 의 옵션 C — process-wide 단일 mutex 직렬화 — 구현.
  > 
  > `_handle_natural_language` 진입 직후 모듈 스코프 `threading.Lock` 을 `acquire(blocking=False)` 로 시도. 실패 시 즉시 안내 1줄 발사 + 거절 + `nl_busy_rejected` audit 1줄 기록. `try/finally` 로 release 강제.
  > 
  > ## 변경 파일
  > 
  > - `ai/dev_relay/main.py` (+145 / -64) — 모듈 스코프 락·flag·busy 안내 상수, `_emit_nl_busy_notice` 헬퍼, `_handle_natural_language` 가드 블록.
  > - `ai/tests/dev_relay/test_handle_command_nl_serialize.py` (신규 +414) — AC-NLS-1~6, 9 + 예외 시 락 release 단위 테스트 9건.
  > - `docs/SESSION_NOTES.md` (+46) — 2026-05-07 세션 entry 동봉 (정책: 단독 SESSION_NOTES PR 금지).
  > 
  > ## 수용 기준 매핑
  > 
  > | AC | 시나리오 | 테스트 |
  > |---|---|---|
  > | AC-NLS-1 | 같은 thread_ts 동시 두 NL — 두 번째 거절, SDK 1건 | `TestNLSerializeSameThread::test_concurrent_same_thread_second_rejected` |
  > | AC-NLS-2 | 다른 thread_ts 동시 두 NL — 두 번째 거절 (process-wide) | `TestNLSerializeDifferentThread::test_concurrent_different_thread_second_rejected` |
  > | AC-NLS-3 | turn 종료 후 재진입 정상 처리 | `TestNLSerializeSequential::test_sequential_second_call_succeeds` |
  > | AC-NLS-4 | structured 진행 중 NL — 차단되지 않음 (별도 락) | `TestNLSerializeStructuredCoexist::test_structured_in_flight_does_not_block_nl` |
  > | AC-NLS-5 | rate_limiter 우선 발동 — busy 미발사 | `TestNLSerializeRateLimitInterop::test_rate_limit_fires_first_no_busy` |
  > | AC-NLS-6 | audit `nl_busy_rejected` 1줄 + 필드 정확히 4개 | `TestNLSerializeAudit::test_busy_audit_record_fields_exact` |
  > | AC-NLS-7 | 컴플라이언스 정적 검사 0 hit | `test_compliance.py` (변경 없음, main.py 자동 커버) |
  > | AC-NLS-8 | 기존 NL + structured 테스트 0 fail | `pytest ai/tests/dev_relay/` 489 passed |
  > | AC-NLS-9 | shutdown — 진행 중 graceful, 새 진입 거절 | `TestNLSerializeShutdown` 2건 |
  > | §7 위험1 | 예외 발생 시 락 release | `TestNLSerializeLockReleaseOnException::test_lock_released_when_sonnet_raises` |
  > 
  > ## 테스트 결과
  > 
  > ```
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 머지 후 1~2주 `nl_busy_rejected` 발생 빈도 모니터링 (PRD §6.3 / SESSION_NOTES follow-up 7번).
  - 빈도가 높으면 옵션 A (`JobQueue` 통합) 또는 옵션 B (thread_ts 별 lock map) 재설계 — 후속 PRD.

### 2026-05-12 — chore(dev-relay): NL shutdown flag wire — PR #48 reviewer P2 후속 (#49)

- **slug**: `dev-relay-nl-shutdown-wire` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/49
- **요약**: chore(dev-relay): NL shutdown flag wire — PR #48 reviewer P2 후속
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > PR #48 (`dev-relay-nl-serialize` impl, commit `40efb0c`) 머지 직후 reviewer 가 남긴 P2 후속 메모 2건을 본 chore PR 로 처리. 자가 self-review 한계는 비범위 (별도 운영자 트랙).
  > 
  > reviewer 코멘트 원문:
  > - **P2-1**: `_emit_nl_busy_notice` 가드 위반 fallback 시 audit 만 기록되고 사용자 무발사 — 의도된 안전망 (외부 노출 사고 우선 차단). 운영 모니터링에서 `compliance: blocked busy notice` 에러 로그 빈도 추적 권장.
  > - **P2-2**: `_nl_shutdown_flag.set()` 호출 측 미통합 — `AgentRunner.shutdown` 와 묶는 후속 PR 필요.
  > 
  > ## 변경 사항
  > 
  > ### P2-2 본체 — NL shutdown wire (옵션 b 채택)
  > 
  > `ai/dev_relay/main.py` 에 통합 헬퍼 추가:
  > 
  > ```python
  > def shutdown_dev_relay(runner, *, timeout, logger=None):
  >     _nl_shutdown_flag.set()
  >     if logger is not None:
  >         logger.info("NL 분기 shutdown flag set — 신규 진입 거절 시작.")
  >     runner.shutdown(wait=True, timeout=timeout)
  > ```
  > 
  > `run()` 의 `finally` 절에서 기존 `runner.shutdown(...)` 직접 호출을 본 헬퍼로 단일화. 외부 시그니처 (`AgentRunner.shutdown`) 는 그대로 유지 — 회귀 0.
  > 
  > **옵션 비교**:
  > - (a) `AgentRunner.shutdown` 내부에서 `_nl_shutdown_flag.set()` — 모듈 전역 의존 도입, 책임 분리 위반 → 거절
  > - (b) 통합 헬퍼 `shutdown_dev_relay` (채택) — AgentRunner 책임 분리 유지 + NL flag set + 후속 정리를 같은 모듈에서 묶음
  > - (c) OS SIGTERM/SIGINT 핸들러에서 둘 다 호출 — lifecycle 분기점이 늘어남, 직접 호출 경로 미커버 → 거절
  > 
  > ### P2-1 — 가드 위반 fallback 정책 명문화
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (없음 — 본 PR 머지 후 PR #48 reviewer P2-1·P2-2 종결)
  - 별도 트랙은 SESSION_NOTES 2026-05-13 entry follow-up 표 참조 (A-3/A-4/A-5/B-1/B-2/C-1/C-2/C-3)

### 2026-05-12 — chore(dev-relay): audit record 에 user_id_masked 누락 fix (#50)

- **slug**: `dev-relay-audit-user-id` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/50
- **요약**: chore(dev-relay): audit record 에 user_id_masked 누락 fix
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > `ai/dev_relay/main.py` 의 `_append_audit` 호출 22 inline 블록 중 일부 audit kind 에 `user_id_masked` 필드가 누락되어 있어 audit 로그에서 사용자별 추적이 끊김. PR #25 reviewer Concern 후속으로 SESSION_NOTES.md follow-up 표 P2 항목에 4 세션 이월된 상태였음.
  > 
  > ## 식별 결과 (`_append_audit` inline 호출 분포)
  > 
  > | # | 위치 | kind | 사전 상태 |
  > |---|------|------|-----------|
  > | 1 | L293 | `destructive_blocked` | `"user"` 만 존재 → **fix** |
  > | 2 | L359 | `command_received` | `"user"` 만 존재 → **fix** |
  > | 3 | L460 | `nl_busy_rejected` | `user_id_masked` 이미 존재 (테스트 보장) |
  > | 4 | L555 | `session_started` | 누락 → **fix** |
  > | 5 | L571 | `session_resumed` | 누락 → **fix** |
  > | 6 | L721 | `button_action`/cancel_merge | `"user"` 만 존재 → **fix** |
  > | 7 | L741 | `button_action`/approve_merge | `"user"` 만 존재 → **fix** |
  > | 8 | L793 | `merge_failed` (validate) | 누락 → **fix** |
  > | 9 | L810 | `merge_started` | 누락 → **fix** |
  > | 10 | L823 | `merge_failed` (exception) | 누락 → **fix** |
  > | 11 | L841 | `merge_done` | 누락 → **fix** |
  > | 12 | L865 | `merge_failed` (outcome) | 누락 → **fix** |
  > | 13 | L891 | `button_action`/merge_review | `"user"` 만 존재 → **fix** |
  > | 14 | L941 | `reviewer_detail_lookup_failed` | 누락 → **fix** |
  > | 15 | L1107 | `reviewer_started` | 누락 → **fix** (picker 컨텍스트에 `job.user_id` 사용) |
  > | 16 | L1118 | `reviewer_failed` (no runtime) | 누락 → **fix** |
  > | 17 | L1142 | `reviewer_failed` (destructive) | 누락 → **fix** |
  > | 18 | L1162 | `reviewer_failed` (timeout) | 누락 → **fix** |
  > | 19 | L1182 | `reviewer_failed` (exception) | 누락 → **fix** |
  > | 20 | L1203 | `reviewer_done` | 누락 → **fix** |
  > | pass-through | L531, L1046 | NL agent / SDK hook callback | record 변수 경유 — `nl_agent.py` / `nl_sdk_runtime.py` 소관, 본 PR 범위 외 |
  > 
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-12 — chore(dev-relay): PR #43 reviewer P2-1·P2-3 후속 — validate_approval 재시작 거절 + blocks 가드 (#51)

- **slug**: `dev-relay-approval-guard-blocks` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/51
- **요약**: chore(dev-relay): PR #43 reviewer P2-1·P2-3 후속 — validate_approval 재시작 거절 + blocks 가드
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > PR #43 (`dev-relay-agent-integration`, merged `213ed69`) reviewer P2 후속 메모 3건 중 **P2-1 + P2-3 두 건**을 묶어 처리한다. P2-2 (reviewer NotImplementedError fallback) 는 reviewer wire 자체가 별도 큰 작업이라 본 PR 비범위.
  > 
  > [PR #43 review comment 인용](https://github.com/deeptrading-lab/trading-signal-engine/pull/43#issuecomment-4389053077):
  > 
  > ### P2-1 — `validate_approval(expected=None)` 재시작 후 fallback 약화
  > 
  > `ai/dev_relay/merger.py:83-89` 가 `expected_idempotency_key` / `expected_job_id` 가 `None` 이면 mismatch 검사를 skip 했음. 데몬 재시작 후 기존 reviewer 결과 메시지의 `[승인]` 클릭 시 `expected_approvals` 가 비어 `None` 으로 떨어져 idempotency_key backstop 을 통과시킬 수 없는 문제.
  > 
  > ### P2-3 — `_post_blocks_to_thread` 의 blocks 자체 정적 가드 미적용
  > 
  > `ai/dev_relay/main.py:1292` `_post_blocks_to_thread` 는 `text` 인자만 가드, `blocks` 의 부분 텍스트는 호출 측 (`build_review_result_blocks`) 의 `guard_text` 통과를 신뢰. 현 호출 경로상 안전하나, 미래 회귀 차단.
  > 
  > ## 채택 옵션 (a) 근거
  > 
  > - **P2-1 옵션 (a)**: `validate_approval` 내부에서 `expected_*` 가 None 이면 즉시 거절. 단일 정의 지점이라 회귀 안전, 호출 경로 1곳뿐.
  >   - 호출 측 (`handle_approve_merge`) 에서 `MergeRejection` 메시지를 새 reason 상수 `REJECTION_REASON_RESTART_NO_EXPECTED` 와 비교해 사용자 안내를 분기 (`TEMPLATE_RESTART_APPROVAL_REJECTED`).
  > - **P2-3 fallback 정책**: blocks 누설 발견 시 발사 차단 + text-only fallback (`FALLBACK_RESPONSE`) 1건 발사. `text` 인자도 마지막에 한 번 더 가드.
  > 
  > ## 변경 파일
  > 
  > - `ai/dev_relay/merger.py` — `validate_approval` 재시작 거절 로직 + `REJECTION_REASON_RESTART_NO_EXPECTED` 상수 추가
  > - `ai/dev_relay/slack_renderer.py` — `TEMPLATE_RESTART_APPROVAL_REJECTED` 신규 (한국어 1줄, 컴플라이언스 0 hit)
  > - `ai/dev_relay/main.py` — `handle_approve_merge` 의 분기 안내 + `_post_blocks_to_thread` blocks 정적 가드 + `_collect_block_user_facing_text` 헬퍼
  > - `ai/tests/dev_relay/test_merger.py` — 기존 relaxed 테스트를 P2-1 거절 케이스로 전환 + 한 쪽만 None 도 거절 확인 2건 추가
  > - `ai/tests/dev_relay/test_post_blocks_guard.py` (신규) — walker 단위 + blocks/text 가드 발사 차단 케이스 + 재시작 거절 통합 점검 (10 cases)
  > - `ai/tests/dev_relay/test_compliance.py` — 신규 템플릿 정적 검사 등록
  > 
  > ## 테스트 결과
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-14 — chore(dev-relay): PR #50/#51 reviewer P2 후속 묶음 — audit canonical + classify + walker (#52)

- **slug**: `dev-relay-audit-followups` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/52
- **요약**: chore(dev-relay): PR #50/#51 reviewer P2 후속 묶음 — audit canonical + classify + walker
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > PR #50 (audit `user_id_masked`) 와 PR #51 (validate_approval 재시작 거절 + blocks 가드) 의 reviewer P2 follow-up 7건을 묶어 처리.
  > 
  > **묶음 vs 분할 결정**: F-1 4건 + F-2 3건 모두 작은 변경 (대부분 docstring / 한 줄 추가 / 작은 함수 신설). reviewer 가 7건을 한 번에 봐도 부담이 분할 시 컨텍스트 전환 비용보다 낮다고 판단 → **1 PR 묶음 채택**.
  > 
  > ## 변경 사항
  > 
  > ### F-1 — PR #50 reviewer P2 4건 (audit user_id 후속)
  > 
  > 1. **SDK responder canonical 키 적용** (`ai/dev_relay/nl_agent.py` 6곳, `ai/dev_relay/nl_sdk_runtime.py` 2곳)
  >    - `nl_agent.py`: `llm_invoked` x3, `llm_classified` x1, `llm_response_blocked` x2 에 `user_id_masked` 키 병기. 기존 `"user"` 키는 back-compat 유지.
  >    - `nl_sdk_runtime.py`: PreToolUse hook 의 `tool_call` / `tool_denied` audit 에는 기존에 user 필드가 없었으므로 `user_id_masked` 만 신규 추가 (canonical 단일).
  > 
  > 2. **`target_kinds` 셋 갱신 의무 docstring 보강** (`test_audit_user_id_masked.py`)
  >    - `TestAuditSchemaRegression` 클래스·메서드 docstring 에 "신규 audit kind 추가 시 본 셋도 함께 업데이트하라" 명시. 정적 스캔이 source-of-truth 와 동기화돼야 신규 kind 누락을 자동으로 잡는다.
  > 
  > 3. **`"user"` 키 deprecation 시점 명시** (`_append_audit` docstring)
  >    - **2026-07-13 이후** (PR #50 머지 2026-05-13 기준 60일 window). 보수적으로 60일 채택. 실제 키 제거는 다운스트림 분석 도구 마이그레이션 확인 후 별도 PR (`D-1` 트랙).
  > 
  > 4. **`mask_user_id` 중복 호출 통일** (`main.py` `handle_cancel_merge` / `handle_approve_merge` / `handle_merge_review`)
  >    - `masked = mask_user_id(user_id)` 변수 1회 계산 후 재사용. 총 9곳 중복 호출 제거. 동작 변경 0.
  > 
  > ### F-2 — PR #51 reviewer P2 3건 (approval guard 후속)
  > 
  > 1. **`merge_failed` audit classification 세분화** (`ai/dev_relay/merger.py`, `main.py`)
  >    - 신규 상수 7개: `REJECTION_CATEGORY_RESTART_NO_EXPECTED` / `IDEMPOTENCY_MISMATCH` / `JOB_ID_MISMATCH` / `USER_NOT_ALLOWED` / `INVALID_PAYLOAD` / `UNEXPECTED_ACTION` / `OTHER`
  >    - 신규 함수 `classify_merge_rejection(exc)` — `MergeRejection` 메시지를 카테고리 라벨로 정규화.
  >    - `main.py` `handle_approve_merge` 의 `merge_failed` audit 에 `rejection_reason` 보조 키 추가. `classification: UNKNOWN_ERROR` 는 그대로 유지 — 두 차원을 분리해 분석 도구가 독립 카운트 가능 (enum 충돌 회피).
  > 
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-14 — feat(dev-relay): Phase 2 write 도구 + reviewer SDK wire — apply patch · commit · push + F-3 (#54)

- **slug**: `dev-relay-write-tools-impl` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/54
- **요약**: feat(dev-relay): Phase 2 write 도구 + reviewer SDK wire — apply patch · commit · push + F-3
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PRD #53 (`docs/prd/dev-relay-write-tools.md`) 의 Phase 2 — write 도구 (apply patch · commit · push) + reviewer SDK callable wire (F-3) 통합 구현.
  > 
  > ## 변경 사항
  > 
  > ### 신규 모듈
  > - `ai/dev_relay/write_tools.py` (517L) — apply patch / commit / push 코어 + destructive 가드 + dry-run preview
  > - `ai/dev_relay/write_runtime.py` (334L) — SDK 호출 wrapper (`nl_sdk_runtime` 패턴 재사용)
  > 
  > ### 수정
  > - `ai/dev_relay/main.py` — `_build_reviewer` 가 실 SDK callable 반환 (F-3 완수) + `_handle_write_command` / `_execute_*` / 버튼 핸들러 추가 + `_write_shutdown_flag` 도입
  > - `ai/dev_relay/dispatcher.py` — `apply patch pr=N` · `commit pr=N` · `push pr=N` 라우팅 + destructive 표지 강화 (`rm -rf`, `--force`, `--amend`, `--no-verify`, `force-with-lease` 등)
  > - `ai/dev_relay/slack_renderer.py` — write 도구 confirm Block Kit 빌더 + 13종 신규 템플릿 + 정적 가드 통과
  > 
  > ### 테스트
  > - `ai/tests/dev_relay/test_write_tools.py` (40건) — destructive 가드 + preview/perform 단위
  > - `ai/tests/dev_relay/test_dispatcher_write.py` (16건) — write 도구 명령 파싱
  > - `ai/tests/dev_relay/test_reviewer_sdk_wire.py` (10건) — F-3 wire + 응답 파싱
  > - `ai/tests/dev_relay/test_write_command_flow.py` (9건) — 명령 흐름 + shutdown · 멱등성 · rate limit · audit
  > - `ai/tests/dev_relay/test_shutdown_dev_relay.py` (+1건) — write flag set 회귀
  > 
  > ## AC 매핑
  > 
  > | AC | 항목 | 구현 | 테스트 |
  > |---|---|---|---|
  > | AC-WT-1 | reviewer SDK callable wire (F-3) | `write_runtime.make_reviewer_callable` + `_build_reviewer` | `test_reviewer_sdk_wire.py` |
  > | AC-WT-2 | apply patch 정상 흐름 | `_handle_write_command` + `apply_patch` + confirm | `test_write_tools.py::TestApplyPatch` |
  > | AC-WT-3 | commit 정상 흐름 | `_execute_commit` + `perform_commit` | `test_write_tools.py::TestPerformCommit` |
  > | AC-WT-4 | push 정상 흐름 | `_execute_push` + `perform_push` | `test_write_tools.py::TestPerformPush` |
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-15 — chore(dev-relay): PR #52/#54 reviewer P2 후속 묶음 — walker dedup · daemon join · force-with-lease · classify 방어 (#56)

- **slug**: `dev-relay-pr52-54-followups` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/56
- **요약**: chore(dev-relay): PR #52/#54 reviewer P2 후속 묶음 — walker dedup · daemon join · force-with-lease · classify 방어
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > 본 chore PR 은 PR #52 (F-4) 와 PR #54 (F-5) 의 reviewer P2 follow-up 7건을 묶어 처리합니다. PR #52 패턴 그대로 묶음 진행.
  > 
  > PRD: 없음 (chore — 기존 PR reviewer 코멘트 후속).
  > 
  > ## F-4 — PR #52 reviewer P2 후속 (4건)
  > 
  > ### #1 walker dict-form 중복 수집 제거
  > - `ai/dev_relay/main.py` `_collect_block_user_facing_text` 의 `_BLOCK_USER_FACING_NON_TEXT_KEYS` 분기에서 inner `text` 직접 수집 후 `continue` 누락 → `_visit(value)` fallthrough 로 dict 재귀가 같은 inner 를 한 번 더 수집. 무해하나 `count == 1` 보장 위해 `continue` 추가.
  > - 회귀: `TestWalkerDictDedup` 3건.
  > 
  > ### #2 `"user"` 키 deprecation 시점 자동 가드
  > - PR #50 docstring 의 `2026-07-13` 시점을 pytest 정적 날짜 비교로 감시. 도달 시 `pytest.fail` 하여 retire 작업이 자연 트리거.
  > - CI 추가 없이 기존 pytest 흐름에 묶임 (부담 최소).
  > - 회귀: `TestUserKeyDeprecationDateGuard`.
  > 
  > ### #3 `handle_view_details` `mask_user_id` 패턴 통일
  > - `masked = mask_user_id(user_id)` 변수 1회 계산 후 재사용 (F-1 #4 패턴 그대로). 향후 추가 마스킹 호출 시 일관성 보장.
  > 
  > ### #4 `classify_merge_rejection` 비-`MergeRejection` 입력 방어 테스트
  > - 함수 시그니처는 이미 `MergeRejection | BaseException` 으로 받고 `str(exc)` 호출이라 안전 — 하지만 None/dict/str/임의 객체 입력 시 `OTHER` fallback 동작을 회귀로 묶음.
  > - 회귀: `TestClassifyMergeRejectionDefensive` 5건.
  > 
  > ## F-5 — PR #54 reviewer P2 후속 (3건)
  > 
  > ### #1 daemon worker graceful join
  > - `_active_write_workers: set[threading.Thread]` + `_active_write_workers_lock` 모듈 스코프 추가.
  > - `_spawn_write_worker` 가 wrapper closure 로 add/discard 자동 수행.
  > - 신규 `_join_active_write_workers(timeout, logger)` — timeout 을 thread 수로 공평 배분, hang 한 thread 가 다른 thread join 을 막지 않음. join timeout 초과 thread 는 로그 warning + daemon 강제 회수에 위임.
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-18 — feat(dev-relay): Phase 3 NL 자율 트리거 — write 의도 분류 + structured 변환 (AC-WT-7 해소) (#59)

- **slug**: `dev-relay-write-tools-nl-impl` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/59
- **요약**: feat(dev-relay): Phase 3 NL 자율 트리거 — write 의도 분류 + structured 변환 (AC-WT-7 해소)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PRD [`docs/prd/dev-relay-write-tools-nl.md`](../blob/main/docs/prd/dev-relay-write-tools-nl.md) (#58) AC-WTN-1~15 구현. PR #54 의 **AC-WT-7 (NL 자율 트리거 DEFERRED) 를 본 PR 로 완전 해소**.
  > 
  > ## 격차 해소
  > 
  > 기존 Phase 2 (PR #54) 까지의 NL 분기는 read-only 도구만 다뤘다. 사용자가 NL 으로 patch / commit / push 의도를 표현해도 봇이 안내만 하고 끝났다. 본 PR 은 다음을 추가한다:
  > 
  > - 자연어 → `WRITE_REQUEST` 라벨 분류 (기존 `nl_classifier` 확장).
  > - Sonnet 4.6 변환 SDK → strict JSON 출력 (`{tool, pr, confidence}`).
  > - 검증 통과 시 dispatcher 정규식 매치 가능 문자열 합성 (예: `apply patch pr=32`).
  > - Phase 2 `_handle_write_command` 그대로 재진입 → dry-run + 2단계 confirm + 적용.
  > - 변환 투명성 — confirm 다이얼로그에 NL 원문 + 변환된 structured 명령 표시.
  > 
  > ## AC 매핑 (15/15)
  > 
  > | AC | 검증 위치 | 상태 |
  > |---|---|---|
  > | AC-WTN-1 (`WRITE_REQUEST` 분류) | `test_write_tools_nl.py::TestWriteRequestLabel` + `TestNLWriteHappyPath` | PASS |
  > | AC-WTN-2 (NL → structured 변환) | `TestParseConversionResponse` + `TestNLWriteHappyPath` | PASS |
  > | AC-WTN-3 (Phase 2 재진입) | `TestNLWriteHappyPath::test_write_request_routes_to_conversion` | PASS |
  > | AC-WTN-4 (모호 거절) | `TestNLWriteAmbiguous` (4 케이스 parametrize) | PASS |
  > | AC-WTN-5 (confirm 취소) | Phase 2 `test_write_command_flow.py` 회귀 — 0 fail | PASS |
  > | AC-WTN-6 (destructive 다층) | `TestNLWriteDestructiveGuard` (NL 입력 + 분류 fallback) | PASS |
  > | AC-WTN-7 (동시성) | `TestNLTurnLockRegression` + 기존 NL serialize 테스트 0 fail | PASS |
  > | AC-WTN-8 (shutdown) | Phase 2 `test_shutdown_dev_relay.py` 회귀 — write_shutdown_flag 정합 | PASS |
  > | AC-WTN-9 (멱등성) | `TestNLWriteIdempotency::test_duplicate_client_msg_id_one_queue_row` | PASS |
  > | AC-WTN-10 (rate limit) | `TestNLWriteRateLimit` | PASS |
  > | AC-WTN-11 (audit 완전성) | `TestNLWriteHappyPath` — 4 종 신규 kind + Phase 2 chain | PASS |
  > | AC-WTN-12 (PRD 산문 스캔) | `test_compliance.py::test_prd_write_tools_nl_body_outside_code_is_clean` | PASS |
- **다음 작업 후보**: _PR 본문에 별도 섹션 없음. 본문 참고하여 판단._

### 2026-05-20 — chore: BE/AI 잔재 제거 및 .claude agents FE 컨텍스트 정리 (#6)

- **slug**: `chore/strip-backend-residue` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/6
- **요약**: chore: BE/AI 잔재 제거 및 .claude agents FE 컨텍스트 정리
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경 요약
  > - `ai/` Python 트리(coordinator·llm·stock_signal·tests)와 BE 인프라(`Dockerfile` / `apprunner.yaml` / `Makefile` / `.dockerignore` / `skills/`) 제거 — engine 레포로 분리
  > - `docs/` BE 자산 제거: PRD 11건, QA 12건, references 2건(`slack-coordinator-bot-setup`, `slack-mcp-setup`), rules 2건(`ai.md` / `backend.md`), agents 2건(`.claude/agents/backend-dev.md`, `docs/agents/dev-backend.md`)
  > - `.env.example`: BE 섹션(Slack / Anthropic / OpenAI / WORKBENCH / HOST / PORT) 제거, FE 키(`FASTAPI_BASE_URL` / Supabase / `LOG_LEVEL`)만 유지
  > - `.claude/agents/*.md`: `Trading Signal Engine` → `Trading Signal Frontend` 일괄 교체, `devops` / `ux-designer` / `manager` 의 BE 흔적(Slack 알림·`ai/services` 경로·BE slug 예시)을 FE 맥락(Vercel·`app/page.tsx`·`signal-workbench-frontend-mvp`)으로 정리
  > 
  > ## 통계
  > - 85 files changed, +271 / -11,966
  > - 잔여 BE 흔적 grep 결과 0건 (`.claude/agents/` 전수 점검)
  > 
  > ## 의도적 보존 (이번 PR 범위 외)
  > - `.mcp.json` — 사용자 결정으로 로컬 유지. `.gitignore` 처리되어 레포 영향 없음
  > - `docs/qa/` 안 session-notes·handoff 류 4건 — 인수인계 historical 기록으로 보존
  > - `package-lock.json` 메타 변경 — 이번 정리와 무관한 lock 재정렬(84줄 삭제, `libc` optional 필드)이라 별도 처리
  > 
  > ## 검증
  > - npm 종속성·런타임 영향 없음 (Python 트리만 제거)
  > - TypeScript/ESLint 영향 없음 (FE 코드 미변경)
  > - 모든 변경은 워킹트리·커밋 단위 reversible
  > 
  > ## 다음 작업
  > - `app/page.tsx` 의 `http://127.0.0.1:8765` 직접 호출 → Next.js route handler 프록시(`app/api/workbench/analyze/route.ts`) 경유로 정정 (AGENTS.md "브라우저는 FastAPI를 직접 호출하지 않는다" 원칙)
  > - `README.md` / `AGENTS.md` 잔여 BE 표현 점검 (구조도·작업 원칙 절)
  > - `.mcp.json` 향후 처리 결정 (계속 로컬 유지 vs 제거)
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `app/page.tsx` 의 `http://127.0.0.1:8765` 직접 호출 → Next.js route handler 프록시(`app/api/workbench/analyze/route.ts`) 경유로 정정 (AGENTS.md "브라우저는 FastAPI를 직접 호출하지 않는다" 원칙)
  - `README.md` / `AGENTS.md` 잔여 BE 표현 점검 (구조도·작업 원칙 절)
  - `.mcp.json` 향후 처리 결정 (계속 로컬 유지 vs 제거)

### 2026-05-20 — chore(cursor): .cursor BE 잔재 정리 (engine 레포로 분리 후속) (#7)

- **slug**: `chore/strip-cursor-be-residue` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/7
- **요약**: chore(cursor): .cursor BE 잔재 정리 (engine 레포로 분리 후속)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6 후속 — 처음 인벤토리에서 `.cursor/` 디렉토리를 표면만 봐 누락했던 BE 규칙·스킬을 마저 정리합니다.
  > 
  > ## 변경 요약
  > 
  > ### 삭제 (3건)
  > - `.cursor/skills/spring-api/` — Spring Boot REST API 관례 스킬(BE 전용)
  > - `.cursor/rules/backend.mdc` — Kotlin/Spring Trading Core 규칙, `globs: backend/**`
  > - `.cursor/rules/ai.mdc` — Python AI 서비스 규칙, `globs: ai/**`
  > 
  > ### 수정 (2건)
  > - `.cursor/rules/agents-workflow.mdc`
  >   - 역할 4: `Backend Dev (ai/·backend/ 구현)` → `API Integration Dev (app/api/**/route.ts·FASTAPI_BASE_URL 프록시·Supabase 연동 준비)`
  >   - 역할 7 DevOps: `Slack 알림·비용 모니터링` → `Vercel 배포(preview/production) 모니터링`
  >   - 경로 규칙: `backend/** → backend.mdc`, `ai/** → ai.mdc` 제거. `frontend/** → frontend.mdc` 를 `app/** → frontend.mdc` 로 정정
  > - `.cursor/rules/frontend.mdc`
  >   - `globs: frontend/**` → `globs: app/**` (이 레포는 Next.js App Router 단일 구조라 `frontend/` 디렉토리가 없음)
  > 
  > ## 통계
  > - 5 files changed, +6 / -41
  > - 잔여 BE 흔적 grep 결과 0건 (`.cursor/` 전수 점검)
  > 
  > ## 검증
  > - `npm run typecheck` — 0 에러
  > - `npm run lint` — 0 에러
  > - 영향 범위: Cursor IDE 사용자만(레포 빌드/런타임 영향 없음)
  > 
  > ## 다음 작업
  > - `app/page.tsx` 의 `http://127.0.0.1:8765` 직접 호출 → Next.js route handler 프록시(`app/api/workbench/analyze/route.ts`) 경유로 정정 (AGENTS.md "브라우저는 FastAPI를 직접 호출하지 않는다" 원칙) — PR #6 에서 이월
  > - `README.md` / `AGENTS.md` 잔여 BE 표현 점검 — PR #6 에서 이월
  > - `.mcp.json` 향후 처리 결정 (계속 로컬 유지 vs 제거) — PR #6 에서 이월
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `app/page.tsx` 의 `http://127.0.0.1:8765` 직접 호출 → Next.js route handler 프록시(`app/api/workbench/analyze/route.ts`) 경유로 정정 (AGENTS.md "브라우저는 FastAPI를 직접 호출하지 않는다" 원칙) — PR #6 에서 이월
  - `README.md` / `AGENTS.md` 잔여 BE 표현 점검 — PR #6 에서 이월
  - `.mcp.json` 향후 처리 결정 (계속 로컬 유지 vs 제거) — PR #6 에서 이월

### 2026-05-20 — docs(prd): 프론트엔드 재편 PRD 2개 (architecture + workbench-analyze) (#8)

- **slug**: `docs/prd-frontend-rebuild` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/8
- **요약**: docs(prd): 프론트엔드 재편 PRD 2개 (architecture + workbench-analyze)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6/#7 후속 — BE 분리 후 `app/page.tsx` 가 가정한 BE 인터페이스(`127.0.0.1:8765/api/bitcoin/brief` + BTC 단일 sizing 응답)가 실제 BE (`127.0.0.1:8000/api/workbench/analyze` + 6블록 응답)와 완전히 다름. PM 에이전트가 큰 재편을 두 PRD 로 분할 작성.
  > 
  > ## 변경 내용
  > 
  > ### 추가
  > - [`docs/prd/frontend-architecture-restructure.md`](docs/prd/frontend-architecture-restructure.md) (UI: no) — 선행 PRD
  >   - axios + TanStack Query v5 도입, 폴더 재구성, 타입 모듈, 클라이언트 함수·훅, route handler 보강, 입력 검증 함수
  >   - AC 11개. 직접 호출 금지·env 단일 진입·axios 인스턴스·TanStack Query 적용·타입 일치(`any` 0건)·route handler 4xx/5xx 통과·placeholder 안전 포함
  > - [`docs/prd/workbench-analyze-rebuild.md`](docs/prd/workbench-analyze-rebuild.md) (UI: yes) — 후속 PRD
  >   - BE 응답 6블록(`brief / feasibility / horizons / risk_plan / action / warnings`) 매핑 화면, ticker 검색 UX, 입력 사전 차단 UI
  >   - AC 15개. 수동 QA 시나리오 5개(AC-14) + 기본 접근성(AC-15) 포함
  >   - 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 의존
  > 
  > ### 수정
  > - [`.claude/agents/api-integration-dev.md`](.claude/agents/api-integration-dev.md): `model: gpt-4` → `model: inherit` (engine 레포 잔재 — 다른 7개 에이전트와 통일)
  > 
  > ## PRD 분할 사유 (양 PRD §8 동일)
  > 1. 한 PR 묶으면 +1000 라인급, reviewer 부담 ↑
  > 2. 선행 PRD 만 머지된 시점에도 typecheck/build/라운드트립으로 회귀 가능 (UI 는 placeholder)
  > 3. 후속 PRD 가 디자이너 산출물 의존 → 묶으면 디자이너 단계가 아키텍처 진행 블로킹
  > 
  > ## 사용자 결정사항 (PRD 본문에 가정으로 못 박힘)
  > - 데이터 페칭: TanStack Query v5
  > - HTTP 클라이언트: axios
  > - BE 스펙 우선: 입력·응답·UX 모두 BE 제공 그대로
  > - 폴더 트리: page / component / query / lib / types 등 역할별 분리 (구체 트리는 FE Dev 재량)
  > 
  > ## OPEN QUESTION 11건
  > 선행 4건 + 후속 7건. 모두 PRD 본문 §9 에 PM 권고 동봉. 진입 차단 0건 — 디자이너 단계나 PM 권고로 자연스럽게 결정 예정.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 선행 PRD `frontend-architecture-restructure` 를 frontend-dev 에이전트가 `feature/frontend-architecture-restructure` 브랜치에서 구현
  - 선행 PR 머지 후 후속 PRD `workbench-analyze-rebuild` 에 대해 ux-designer 에이전트 호출 → `docs/design/workbench-analyze-rebuild.md` 작성
  - 디자이너 산출물 후 frontend-dev 구현 진입

### 2026-05-20 — feat: 프론트엔드 아키텍처 재편 (axios + TanStack Query + lib 분리) (#9)

- **slug**: `frontend-architecture-restructure` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/9
- **요약**: feat: 프론트엔드 아키텍처 재편 (axios + TanStack Query + lib 분리)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6 / #7 / #8 후속 — 선행 PRD [`frontend-architecture-restructure`](docs/prd/frontend-architecture-restructure.md) 구현. UI 변경 없음. 후속 PRD `workbench-analyze-rebuild` 가 본 PR 의 클라이언트·훅·타입·검증 함수를 그대로 import 한다.
  > 
  > ## 변경 요약
  > - **의존성**: `axios`, `@tanstack/react-query` v5 추가. 그 외 라이브러리 추가 없음.
  > - **폴더 신설**: `lib/api/` (axios 인스턴스 + 클라이언트 함수 + 통합 ApiError 매핑), `lib/query/` (queryKeys + 훅), `lib/types/` (WhitelistItem + AnalyzeRequest/Response · Brief · Feasibility · Horizons · RiskPlan · Action · Warnings), `lib/validation/` (`validateAnalyzePayload` 순수 함수).
  > - **App shell**: `app/providers.tsx` 신설 ('use client' QueryClientProvider, `useState` 로 QueryClient 1회 생성). `app/layout.tsx` 가 Providers 로 children 감쌈.
  > - **page placeholder**: 기존 `app/page.tsx` 의 BTC 단일 sizing UI 전면 제거. "재구성 중" 안내 placeholder 로 교체 (직접 호출 0건, 기존 디자인 토큰만 사용).
  > - **route handler 보강**: 두 핸들러에 `AbortSignal.timeout(30s)`, 통신 실패 시 502 + 한글 폴백, JSON 이외 Content-Type text 안전 폴백, 4xx/5xx body 그대로 통과.
  > - **tsconfig**: `@/*` path alias 추가 (App Router 컨벤션 정합).
  > - **.env.example**: `FASTAPI_BASE_URL` 주석에 engine 레포 LIVE 방법 명시.
  > - **OPEN QUESTION 대응** (PRD §9 PM 권고 그대로 채택):
  >   - Q2 QueryClient 기본값: `staleTime 30s`, `retry 1`, `refetchOnWindowFocus false` 채택. 후속 PRD 디자이너 단계에서 재검토 가능.
  >   - Q3 axios 에러 표준: `{ kind: 'validation' | 'whitelist_miss' | 'network' | 'server', message, status, detail }` 골격만 정의. 메시지 카피는 후속 PRD.
  >   - Q4 `offline` 토글: 타입·클라이언트 함수에 `offline?: boolean` 만 흘려두고 UI 노출 미결정.
  > 
  > ## AC 자가검증
  > - **AC-1 (직접 호출 금지)**: `git grep -nE "http://127\.0\.0\.1:(8000|8765)" -- app/` → 2건 (둘 다 `app/api/**/route.ts` 안의 `FASTAPI_BASE_URL` fallback, PRD 명시 예외). 클라이언트 코드 0건.
  > - **AC-2 (env 단일 진입)**: `FASTAPI_BASE_URL` 만 변경하면 dev/prod 전환. 코드 수정 불필요.
  > - **AC-3 (axios 단일 인스턴스)**: 클라이언트 측 `fetch(` 사용 0건. `lib/api/client.ts` 의 `httpClient` 인스턴스 하나만 사용. `app/api/**/route.ts` 안 server-side `fetch(` 만 허용.
  > - **AC-4 (TanStack Query 적용)**: `useWhitelistSearch` (useQuery) + `useAnalyzeWorkbench` (useMutation) 제공. `useState` + `useEffect` fetch 패턴 0건 (placeholder 페이지는 fetch 자체가 없음).
  > - **AC-5 (타입 일치)**: 6블록 + WhitelistItem 모두 `lib/types/*` 에 정의. 클라이언트 함수 반환 타입 일치. `lib/` 내 `any` 사용 0건.
  > - **AC-6 (입력 사전 차단)**: `validateAnalyzePayload(input, whitelist)` 가 5개 규칙 (capital_amount · target_return_pct · target_period_days · max_loss_pct · ticker 화이트리스트 멤버십) 모두 거절 + 한글 메시지 반환.
  > - **AC-7 (route handler 정합)**: 4xx/5xx body 그대로 통과 검증 — 화이트리스트 외 ticker → `{detail: "NVDA는 분석 가능한 화이트리스트에 없습니다"}` + 400 통과, 음수 capital → 422 + Pydantic detail 그대로 통과. 빈 본문·JSON 파싱 실패 시 한글 폴백 메시지 + 500.
  > - **AC-8 (build/typecheck/lint)**: `npm run typecheck` / `npm run lint` / `npm run build` 모두 0 에러.
  > - **AC-9 (폴더 분리)**: 타입(`lib/types/`) · HTTP 클라이언트(`lib/api/`) · 쿼리 훅(`lib/query/`) · 검증(`lib/validation/`) 모두 별도 모듈로 분리.
  > - **AC-10 (placeholder 안전)**: 새 `app/page.tsx` 가 빌드 통과, 직접 호출 0건, 화면에 "재구성 중" + 후속 PRD 명시.
  > - **AC-11 (whitelist 라운드트립)**: dev 서버에서 수동 확인 — `GET /api/whitelist/search?q=APPLE` 호출 시 BE 가 alias 매칭으로 `AAPL` 단일 결과를 그대로 반환. 본문은 `results: [{ ticker: "AAPL", aliases: ["APPLE"], ... }]`.
  > 
  > ## 검증
  > - `npm run typecheck` / `npm run lint` / `npm run build` 모두 0 에러
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 후속 PRD `workbench-analyze-rebuild` 도입 — `ux-designer` 에이전트로 `docs/design/workbench-analyze-rebuild.md` 작성 트리거 후 frontend-dev 가 본 PR 의 `useWhitelistSearch` · `useAnalyzeWorkbench` · `validateAnalyzePayload` · `WhitelistItem` · `AnalyzeRequest` · `AnalyzeResponse` 를 import 하여 화면 재구성.
  - `.mcp.json` 향후 처리 결정 — 이전 HANDOFF 에서 이월된 후보 (본 PR 범위 외).

### 2026-05-20 — docs(design+qa): workbench-analyze-rebuild DESIGN.md + PR #9 누락 QA 리포트 백필 (#10)

- **slug**: `design/workbench-analyze-rebuild` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/10
- **요약**: docs(design+qa): workbench-analyze-rebuild DESIGN.md + PR #9 누락 QA 리포트 백필
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #8 (PRD 2개 머지) · PR #9 (선행 PRD 구현) 후속 — 후속 PRD `workbench-analyze-rebuild` 의 디자인 산출물과 PR #9 의 QA 리포트가 main 에 누락된 것을 함께 정리.
  > 
  > ## 변경 요약
  > 
  > ### 추가 1: `docs/design/workbench-analyze-rebuild.md` (389 라인)
  > - Google Labs DESIGN.md 포맷 — YAML front matter 토큰 + Markdown 본문 (`docs/rules/design-md.md` 기준)
  > - 토큰: **16 colors / 10 typography / 6 spacing / 2 rounded / 21 components**
  > - 본문 섹션 순서 준수: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts
  > - 본문 외 추가 섹션:
  >   - **유저 시나리오 2건**: 해피 패스 (`AAPL`, 5%/30일) + 비현실 목표 강조 (`BTC-USD`, 50%/7일)
  >   - **핸드오프 명세 9개 상태별 컴포넌트·텍스트·토큰 표**: Empty, ticker 미선택, Validation, Loading, Success, feasibility 비현실, action vs brief 불일치, whitelist miss, BE 4xx/5xx·네트워크 실패
  >   - **OPEN QUESTION 7건 결정**: PM 권고 수용 5건(feasibility 강조 방식 · `capital_amount` 통화 · warnings 위치 · 라우트 위치 · 라이브러리 미도입 risk_plan 시각화) + 디자이너 결정 영역 2건(검색 UX 디테일 · `action` 6 라벨 한글 톤)
  > - ux-designer 에이전트 spawn 이 3회 연속 API 529 Overloaded 로 실패해 메인 에이전트가 ux-designer 정의·`docs/rules/design-md.md`·PRD §9 PM 권고를 그대로 따라 작성. 산출물 양식·품질 동일, 본문 끝 lint 메모 절에 작성 경위 명시.
  > 
  > ### 추가 2: `docs/qa/frontend-architecture-restructure.md` (238 라인) — PR #9 백필
  > - QA 에이전트가 PR #9 검증 시 작성한 리포트가 untracked 로 남아있던 것을 정리
  > - AC-1 ~ AC-11 모두 PASS · 에지 케이스 E1 ~ E11 모두 PASS · 결함 0건
  > - LIVE BE 라운드트립 5건 (whitelist alias / 6블록 응답 / whitelist miss / Pydantic 422 / placeholder) 검증
  > - 본 PR 머지 후 `docs/qa/` 가 진실의 단일 출처로 일관됨
  > 
  > ## DESIGN.md lint
  > ```
  > {
  >   "findings": [
  >     { "severity": "info", "message": "Design system defines 16 colors, 10 typography scales, 2 rounding levels, 6 spacing tokens, 21 components." }
  >   ],
  >   "summary": { "errors": 0, "warnings": 0, "infos": 1 }
  > }
  > ```
  > `npx @google/design.md lint docs/design/workbench-analyze-rebuild.md` → **errors=0 warnings=0** (PRD `signal-workbench-frontend-mvp` 의 산출 직전 검증 기준 충족).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 후속 PRD `workbench-analyze-rebuild` 를 frontend-dev 에이전트가 `feature/workbench-analyze-rebuild` 브랜치에서 구현. PR #9 의 `useWhitelistSearch` · `useAnalyzeWorkbench` · `validateAnalyzePayload` · 타입 모듈을 import 하여 본 디자인 가이드의 컴포넌트·상태·OPEN QUESTION 결정을 그대로 화면화.
  - 구현 PR 의 QA 시 본 DESIGN.md 의 토큰·핸드오프 명세 9 상태가 실제로 코드와 매핑되는지 검증.
  - `.mcp.json` 향후 처리 결정 — 이전 HANDOFF 에서 이월된 후보 (본 PR 범위 외).

### 2026-05-20 — feat: workbench-analyze-rebuild 화면 구현 — BE 6블록 + 종목 검색·자본 입력 폼 (#11)

- **slug**: `workbench-analyze-rebuild` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/11
- **요약**: feat: workbench-analyze-rebuild 화면 구현 — BE 6블록 + 종목 검색·자본 입력 폼
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6/#7/#8/#9/#10 후속 — 후속 PRD `workbench-analyze-rebuild` 화면 구현. 선행 PRD (PR #9) 의 클라이언트·훅·타입·검증 함수를 그대로 import.
  > 
  > ## 변경 요약
  > - 의존성 변경 없음 (axios·@tanstack/react-query 만 사용).
  > - `app/globals.css` 를 DESIGN.md front matter 토큰 그대로 CSS custom property 로 이식 (colors / spacing / rounded / typography). 기존 `--accent`·`--blue` 등 alias 는 선행 PRD placeholder 호환을 위해 보존.
  > - 신설: `components/workbench/*` (12개), `hooks/use-analyze-form.ts`, `hooks/use-ticker-search.ts`, `lib/copy/action-labels.ts`, `lib/copy/error-messages.ts`, `lib/formatters/money.ts`, `lib/formatters/pct.ts`.
  > - `app/page.tsx` 의 BTC 단일 placeholder 폐기 → 워크벤치 메인 (DESIGN.md OPEN QUESTION #7 결정: 메인 = 워크벤치).
  > - DESIGN.md OPEN QUESTION 7건 결정 그대로 채택 (자동완성 250ms / feasibility 비현실 강조 3트랙 / capital_amount 통화 보조 라벨 / action 한글 6라벨 / risk_plan 표+CSS 막대 / warnings = action 직후·feasibility 위 / 메인=워크벤치).
  > 
  > ## AC 자가검증
  > - AC-1 (BTC 단일 UI 제거) — `git grep -nE "btc_holding|news_snapshot|market_flow_snapshot" -- app/ lib/ components/ hooks/` 결과 0건.
  > - AC-2 (BE 6블록 매핑) — `ResultGroup` 이 action / warnings / feasibility / brief / risk_plan / horizons 카드 6개 매핑. `warnings` 빈 배열일 때는 섹션 자체 숨김.
  > - AC-3 (feasibility 강조) — `FeasibilityCard` 가 `UNREALISTIC` 일 때 `card-warn` 배경 + `badge-warn` "⚠ 비현실적인 목표예요" + 본문에 연환산 수치. 색·텍스트·이모지 세 트랙 모두로 전달.
  > - AC-4 (action vs brief 구분) — `BriefCard` 가 의미 그룹 비교 후 다르면 좌측 3px `--line` 보더 + caption "최종 권고와는 별개의 기술 신호예요." 매뉴얼 QA (a) 결과 `action=HOLD` vs `brief.action=ACTIONABLE_LONG` 에서 divergent 분기 동작 확인.
  > - AC-5 (whitelist 검색 UX) — `SearchPanel` 가 `useTickerSearch` 의 250ms debounce 결과를 드롭다운(role=listbox)에 표시, 키보드 ↑↓ + Enter / ESC / 마우스 클릭, 결과 1건도 자동 선택 X, alias 검색은 BE 가 `q=APPLE → AAPL` 처리.
  > - AC-6 (whitelist miss 메시지) — `validateAnalyzePayload` 에 직접 입력된 ticker 가 화이트리스트 멤버가 아니면 분석 버튼 비활성 + helper. BE 가 400 + 한글 detail 을 보내면 axios 인터셉터가 `kind=whitelist_miss` 매핑 → `ErrorCard` 가 그대로 노출 (NVDA 매뉴얼 QA 확인).
  > - AC-7 (입력 사전 차단) — `useAnalyzeForm.attemptSubmit` 이 `validateAnalyzePayload` 호출. 4필드 모두 한글 helper 가 placeholder/error 위치에 정합.
  > - AC-8 (로딩 상태) — `mutation.isPending` 시 분석 버튼 라벨 "분석 중" + `aria-busy=true` + `disabled`. 결과 영역은 `LoadingSkeleton` 4장.
  > - AC-9 (BE 에러 메시지) — `getErrorMessage` 가 한글 detail 이면 그대로 사용, 영문이면 kind 별 한글 fallback. 500/network 는 "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요." + "다시 시도" 버튼.
  > - AC-10 (한글 톤) — ticker / BE enum / 단위(USD, KRW, %, 일) 외 모든 텍스트 한글.
  > - AC-11 (직접 호출 금지) — `git grep -nE "http://127\.0\.0\.1" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` 결과 0건. `git grep -nE "fetch\(" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` 결과 0건. 화면 코드는 `lib/api/*` 클라이언트 함수 + `lib/query/*` 훅만 사용.
  > - AC-12 (디자인 토큰 사용) — `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/page.tsx components/ hooks/ lib/copy/ lib/formatters/` 결과 0건. 모든 색·간격·라운드·폰트 metric 은 `var(--<token>)` 만 사용.
  > - AC-13 (build/typecheck/lint) — `npm run typecheck` / `npm run lint` / `npm run build` 모두 0 에러.
  > - AC-14 (수동 QA 시나리오) — dev 환경 (`http://127.0.0.1:3000` + BE `127.0.0.1:8000`) 에서 5건 모두 동작 확인. 아래 "검증" 절 참조.
  > - AC-15 (기본 접근성) — 모든 폼 필드 `<label>` 연결, 검색 드롭다운 `role=listbox`/`role=option`/`aria-selected`, 분석 버튼 `aria-disabled`/`aria-busy`, 에러 카드 `role=alert aria-live=polite`, feasibility UNREALISTIC 강조는 색 + 텍스트 ("⚠ 비현실적인 목표예요") + 이모지 세 트랙. Tab 순서 검색 → capital → return → period → loss → 분석 → 결과.
  > 
  > ## DESIGN.md 정합
  > - 토큰 매핑: front matter 의 `colors`/`typography`/`spacing`/`rounded`/`components` 가 `app/globals.css` 의 `--<token>` 그룹으로 그대로 이식 (예: `colors.primary` → `--primary`, `colors.tertiary-soft` → `--tertiary-soft`, `rounded.pill` → `--rounded-pill`, `typography.mono-numeric` 의 fontFeature `tnum` → CSS `font-variant-numeric: tabular-nums`). 화면 코드는 hex/px 직타 0건.
  > - 핸드오프 명세 9 상태가 모두 매핑됨: 분석 전 (`EmptyState`) / ticker 미선택 (helper "분석할 종목을 먼저 선택해 주세요.") / 사전 차단 (`input-error` + `helper.is-critical`) / 로딩 (`LoadingSkeleton`) / 정상 (`ResultGroup` 6블록) / feasibility 비현실 (`FeasibilityCard.is-unrealistic`) / action vs brief 불일치 (`BriefCard.is-divergent`) / whitelist miss (`ErrorCard` + 한글 카피) / BE 4xx·5xx·network (`ErrorCard` + 다시 시도 버튼).
  > - OPEN QUESTION 7건 결정 그대로 채택: 자동완성 250ms / UNREALISTIC = card-warn + badge-warn + 본문 / 통화 보조 라벨 두 번째 칼럼 / action 6 한글 라벨 + 배지 색 / risk_plan 표 + CSS 막대 + RR 한 줄 / warnings = action 직후·feasibility 위 / 메인 = 워크벤치.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 본 PR 종결 후 후속 PRD 후보: (1) 화이트리스트 확장 (BE 작업) 시 placeholder 카피 "AAPL 또는 BTC-USD" 동적화. (2) `offline` 토글 UI 도입 PRD. (3) ai_summary 가 BE 에서 채워졌을 때 ActionCard reason 영역 카피 톤 재검토 (현재는 BE null 이라 미노출). (4) `.mcp.json` 정리 등 historical follow-up. 위 4건 모두 본 PR 범위 밖.

### 2026-05-20 — docs(prd+qa): tailwind-migration PRD + PR #11 누락 QA 리포트 백필 (#12)

- **slug**: `docs/prd-tailwind-migration` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/12
- **요약**: docs(prd+qa): tailwind-migration PRD + PR #11 누락 QA 리포트 백필
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #11 (workbench-analyze-rebuild) 머지 후 스타일링 전략 전환 — 사용자가 "css는 tailwind로 할려고해. global.css는 지양해야해. 디자인 토큰을 tailwind랑 같이 쓸수있게" 의사 표명. PM 에이전트가 단독 PRD 로 정리.
  > 
  > ## 변경 요약
  > 
  > ### 추가 1: `docs/prd/tailwind-migration.md` (174 라인, UI: yes)
  > - **목표**: globals.css 책임 축소 (Tailwind preflight + 잔여물만) / `var(--<token>)` 직접 참조 제거 / DESIGN.md → Tailwind theme 자동 동기화 / 시각 0 회귀
  > - **AC 12개**: Tailwind 도입·globals.css **100라인 미만**·`var(--)` 0건·DESIGN.md export 파이프라인·DESIGN.md 토큰 매핑·className 재작성·합성 토큰 일관 처리·시각 0 회귀·build/typecheck/lint·AGENTS.md 원칙 무회귀·컨벤션 문서 갱신·수동 QA 시나리오 3건
  > - **§8 영향 분석**: 순 -500 라인 추정 (globals.css 844 → 100 미만, tailwind config·theme import·className 재작성)
  > - **§9 OPEN QUESTION 8건**: Tailwind v3 채택·`tailwind.theme.json` 커밋·합성 토큰 (b) `@layer components` 우선·다크 모드 prefix 룰·export 어댑터 함수·preflight 잔여물 코멘트 의무화·PR 분할 — 모두 PM 권고 동봉
  > - **선후행**: PR #11 머지 후 진입. 디자이너 산출물 `docs/design/workbench-analyze-rebuild.md` 는 그대로 source-of-truth 로 활용 (재작성 X). `npm run design:sync` script 한 줄로 동기화.
  > 
  > ### 추가 2: `docs/qa/workbench-analyze-rebuild.md` (364 라인) — PR #11 백필
  > - QA 에이전트가 PR #11 검증 시 작성한 리포트가 untracked 로 남아있던 것을 정리 (PR #10 의 PR #9 QA 백필과 동일 패턴)
  > - AC-1 ~ AC-15 모두 PASS · 에지 케이스 모두 PASS · ad-hoc 검증 43/43 · 결함 0건
  > - LIVE BE 라운드트립 5건 (PR #11 AC-14 a~e) 검증
  > - 본 PR 머지 후 `docs/qa/` 가 진실의 단일 출처로 일관됨
  > 
  > ## 검증
  > - docs-only PR. 코드 변경 없음 — typecheck/lint/build 영향 0.
  > 
  > ## 다음 작업
  > - frontend-dev 에이전트가 `feature/tailwind-migration` 브랜치에서 본 PRD 를 구현. AC-7 (합성 토큰 처리) §9 PM 권고 (b) 따라 `@layer components` + `@apply` 우선. AC-8 시각 0 회귀를 PR #11 라운드트립 5건으로 자가검증.
  > - 구현 PR QA 시 본 PRD AC-12 (수동 QA 시나리오 a~c) 와 PR #11 AC-14 라운드트립 5건 동시 검증.
  > - 본 PR 범위 외 follow-up (reviewer nit 5건 · `.mcp.json` · placeholder 동적화 · `offline` 토글 · `ai_summary` 카피) 은 자연 흡수 케이스만 구현 PR 본문에 명시.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - frontend-dev 에이전트가 `feature/tailwind-migration` 브랜치에서 본 PRD 를 구현. AC-7 (합성 토큰 처리) §9 PM 권고 (b) 따라 `@layer components` + `@apply` 우선. AC-8 시각 0 회귀를 PR #11 라운드트립 5건으로 자가검증.
  - 구현 PR QA 시 본 PRD AC-12 (수동 QA 시나리오 a~c) 와 PR #11 AC-14 라운드트립 5건 동시 검증.
  - 본 PR 범위 외 follow-up (reviewer nit 5건 · `.mcp.json` · placeholder 동적화 · `offline` 토글 · `ai_summary` 카피) 은 자연 흡수 케이스만 구현 PR 본문에 명시.

### 2026-05-20 — tailwind-migration: Tailwind v3 도입 + globals.css 844→46라인 + var(--) 0건 (#13)

- **slug**: `tailwind-migration` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/13
- **요약**: tailwind-migration: Tailwind v3 도입 + globals.css 844→46라인 + var(--) 0건
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6/#7/#8/#9/#10/#11/#12 후속 — PRD `tailwind-migration` 구현. 시각·동작 0 회귀가 핵심.
  > 
  > ## 변경 요약 (커밋 단위 분리)
  > 
  > - `chore(tailwind)`: tailwindcss@3 + postcss + autoprefixer 추가, `tailwind.config.ts` + adapter, `tailwind.theme.json` 커밋, `design:sync` script, `globals.css` 844→46 (94% 감축), 합성 토큰은 `app/components.css` 분리
  > - `refactor(workbench)`: `app/page.tsx` + `components/workbench/*` 12개 className 재작성, `var(--)` 0건
  > - `docs(rules)`: `frontend.md` 에 Tailwind 컨벤션 한 줄, `design-md.md` 에 동기화 명령 한 줄
  > 
  > ## AC 자가검증
  > 
  > - AC-1 (Tailwind 도입): `npm ls tailwindcss` OK, `tailwind.config.ts` 존재, `globals.css` 최상단에 `@tailwind base/components/utilities` 3줄
  > - AC-2 (globals.css 축소): `wc -l app/globals.css` = **46** (목표 100 미만)
  > - AC-3 (var(--) 0건): `git grep -nE "var\(--" -- app/ components/` → exit 1 (no match)
  > - AC-4 (design:sync 동작): `npm run design:sync` → `tailwind.theme.json` 생성 확인, `tailwind.config.ts` 가 JSON import 후 어댑터 통과해 `theme.extend` 주입
  > - AC-5 (토큰 매핑): colors / spacing / borderRadius / fontSize / fontFamily 모두 Tailwind theme key 로 1:1 매핑 (어댑터에서 lineHeight·tnum 보완, body-strong fontSize 키만 제외 — colors `body-strong` 와 이름 충돌 회피)
  > - AC-6 (className 재작성): 12 컴포넌트 + `page.tsx` 모두 재작성, `style={{ }}` 안 hex/px 직타 0건 (동적 `left: ${pct}%` 만 허용 범위로 잔류)
  > - AC-7 (합성 토큰 일관성): PM 권고 (b) 채택 — `@layer components` + `@apply` 로 `card`, `card-elevated`, `card-warn`, `card-critical`, `badge-*`, `input(-error)`, `button-*`, `search-result-item(-focus)`, `price-bar-*`, `skeleton(-line)` 유지
  > - AC-8 (시각·동작 0 회귀): build 결과 CSS 의 토큰 색·간격·radius 가 main 과 1:1 동일 (선언만 Tailwind 로 이전). PR #11 의 수동 라운드트립 5건 (a~e) 은 BE LIVE 환경 필요 → QA 단계에서 dev 서버 + 실 BE 로 최종 확인 권장
  > - AC-9 (build/typecheck/lint): 세 명령 모두 0 에러 확인
  > - AC-10 (AGENTS.md 무회귀): 한글 톤 유지, `127.0.0.1` 직접 호출 0건, env 단일 진입, label·aria 그대로
  > - AC-11 (컨벤션 갱신): `docs/rules/frontend.md` + `docs/rules/design-md.md` 한 절씩 추가
  > - AC-12 (수동 QA 시나리오):
  >   - (a) `npm install` 직후 `npm run build` 통과 — 확인
  >   - (b) `tailwind.theme.json` 의 `tertiary` 를 `#ff00ff` 로 임시 변경 → `npm run build` → `.next/static/css/*.css` 에 `rgb(255 0 255)` 반영 확인, 복원 후 `rgb(15 118 110)` 재반영 확인
  >   - (c) PR #11 라운드트립 5건은 BE LIVE QA 단계로 위임
  > 
  > ## 시각 0 회귀
  > 
  > - CSS 빌드 결과의 토큰값 직접 비교: main 의 `:root --tertiary: #0f766e` ↔ 본 PR 의 Tailwind 생성 `.bg-tertiary { background-color: rgb(15 118 110) }` — 동일
  > - 모든 합성 토큰 클래스의 padding/radius/border 값이 DESIGN.md spec 과 동일 (build 출력 cross-check)
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - PR #11 reviewer nit 5건 + `.mcp.json` 처리 + 화이트리스트 placeholder 동적화 + `offline` 토글 UI + `ai_summary` 카피 재검토 — 본 PR 범위 외이며 자연 흡수도 미발생, 별도 chore PRD 로 분리
  - 다크모드 PRD (DESIGN.md 토큰 prefix 유지하면서 `dark:` variant + alternate theme 로 도입) — 본 PR 의 토큰 구조가 그 도입을 단순화
  - shadcn/ui 도입 검토 PRD — Tailwind 가 전제됐으니 옵션 열림
  - Tailwind v4 마이그레이션 chore PRD — alpha 안정화 시점에 검토

### 2026-05-20 — docs(prd+qa): fe-conventions PRD + PR #13 누락 QA 리포트 백필 (#14)

- **slug**: `docs/prd-fe-conventions` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/14
- **요약**: docs(prd+qa): fe-conventions PRD + PR #13 누락 QA 리포트 백필
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6~#13 흐름 (BE 분리 → 아키텍처 → 화면 → Tailwind) 머지 직후 — 사용자가 세션 중 누적 결정한 FE 코드 구조·네이밍 컨벤션 8가지를 단독 PRD 로 정리.
  > 
  > ## 변경 요약
  > 
  > ### 추가 1: `docs/prd/fe-conventions.md` (338 라인, UI: no)
  > - **8개 컨벤션 영역** (§3.1~§3.8):
  >   - 카멜케이스 일원화 (kebab → camelCase / PascalCase)
  >   - 커스텀훅 의무화 (컴포넌트가 `useQuery~/useMutation~` 직접 import 금지)
  >   - `cn` 헬퍼 도입 (`clsx + tailwind-merge`)
  >   - `lib/query/*` → `hooks/query/*` 이동
  >   - 한 뎁스 더 도메인 분리 (`hooks/workbench/`, `lib/api/workbench/`, `lib/copy/workbench/` 등)
  >   - App Router `layout.tsx` 중첩 컨벤션 (문서화만, 실제 도입은 2번째 화면 시점)
  >   - `lib/formatters/` → `lib/utils/` 흡수, `lib/copy/` 는 i18n 여지로 유지
  >   - `docs/rules/frontend.md` 7개 절 추가
  > - **AC 12개** + **§8 영향 분석** (+100~200 라인 추정) + **§9 OPEN QUESTION 10건** (PM 권고 동봉)
  > - **사용자 결정 반영**: 파일명 `useQuery~~` / `useMutation~~` 프리픽스 채택 (§9 #5 가 `[RESOLVED]` 로 변경됨 — PM 의 "기존 명 유지" 권고는 사용자가 명시 결정으로 뒤집음)
  > - **커밋 분할 6단위 권고** (qa 백필 → 의존성 → 구조 재편 → 도메인 훅 흡수 → cn 도입 → 컨벤션 문서)
  > 
  > ### 추가 2: `docs/qa/tailwind-migration.md` (352 라인) — PR #13 백필
  > - QA 에이전트가 PR #13 검증 시 작성한 리포트가 untracked 로 남아있던 것 정리 (PR #10/#12 와 동일 패턴)
  > - AC-1 ~ AC-12 모두 PASS, 에지 12건 PASS, DESIGN.md → Tailwind theme 라이브 동기화 검증, 라운드트립 5건 BE LIVE 재현 PASS, 결함 0건
  > 
  > ## 검증
  > - docs-only PR. 코드 변경 없음 — typecheck/lint/build 영향 0.
  > 
  > ## 다음 작업
  > - frontend-dev 에이전트가 `feature/fe-conventions` 브랜치에서 본 PRD 구현. 커밋 분할 §8 권고 따라 6단위로.
  > - 영향 파일: 약 23개 (import 경로 갱신) + 13개 파일 이동·rename + `lib/utils/cn.ts` 신규 + `app/page.tsx` 도메인 훅 흡수 + `docs/rules/frontend.md` 확장.
  > - AC-10 (시각·동작 0 회귀) 의 QA 검증 = PR #11 라운드트립 5건 재현으로 갈음.
  > - 본 PRD 머지 후 별도 PRD 큐잉: **반응형 (PC 대응 + useBreakpoint)** — PM 위임 예정.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - frontend-dev 에이전트가 `feature/fe-conventions` 브랜치에서 본 PRD 구현. 커밋 분할 §8 권고 따라 6단위로.
  - 영향 파일: 약 23개 (import 경로 갱신) + 13개 파일 이동·rename + `lib/utils/cn.ts` 신규 + `app/page.tsx` 도메인 훅 흡수 + `docs/rules/frontend.md` 확장.
  - AC-10 (시각·동작 0 회귀) 의 QA 검증 = PR #11 라운드트립 5건 재현으로 갈음.
  - 본 PRD 머지 후 별도 PRD 큐잉: **반응형 (PC 대응 + useBreakpoint)** — PM 위임 예정.

### 2026-05-20 — fe-conventions — hooks/lib 도메인 분리 + camelCase + cn 헬퍼 + 도메인 훅 흡수 (#15)

- **slug**: `fe-conventions` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/15
- **요약**: fe-conventions — hooks/lib 도메인 분리 + camelCase + cn 헬퍼 + 도메인 훅 흡수
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6~#14 후속 — PRD `fe-conventions` 구현. 시각·동작 0 회귀가 핵심.
  > 
  > ## 변경 요약 (커밋 6단위)
  > 1. `chore(deps): clsx + tailwind-merge 도입` — cn 헬퍼의 런타임 의존
  > 2. `feat(utils): cn 헬퍼 추가` — `lib/utils/cn.ts` (clsx + twMerge, 기본 설정)
  > 3. `refactor(structure): hooks/lib 도메인 분리 + camelCase rename` — 13 파일 git mv + 함수명 갱신 + 23 파일 import 경로 갱신
  > 4. `refactor(workbench): TanStack Query 인터페이스 누출 제거` — `useAnalyzeRun` 신설, `app/page.tsx` 가 도메인 훅만 경유
  > 5. `refactor(workbench): cn 헬퍼 도입 — 조건부 className 합성 일원화` — BriefCard / FeasibilityCard / InputPanel / SearchPanel
  > 6. `docs(rules): FE 컨벤션 7개 절 추가` — `docs/rules/frontend.md` 확장
  > 
  > ## AC 자가검증
  > 
  > - **AC-1 (카멜케이스 일원화)** — `find hooks lib -name '*-*.ts' -o -name '*-*.tsx' | wc -l` = **0**. `hooks/query/` 페칭 훅은 `useQuery~` / `useMutation~` 프리픽스로 종류 식별 가능.
  > - **AC-2 (커스텀훅 의무화)** — `git grep -nE "from \"@/lib/query|from \"@/hooks/query" -- 'app/' 'components/'` **0 hits**. `git grep -nE "mutation\.(mutate|reset|isPending|isError|data)" -- 'app/page.tsx'` **0 hits**.
  > - **AC-3 (cn 헬퍼 도입)** — `lib/utils/cn.ts` 존재, `package.json` dependencies 에 `clsx ^2.1.1` + `tailwind-merge ^3.6.0`.
  > - **AC-4 (hooks 일원화)** — `test -d lib/query` → `gone`. `hooks/query/` 에 queryKeys + 페칭 훅 2개.
  > - **AC-5 (한 뎁스 도메인 분리)** — `hooks/`, `lib/copy/`, `lib/types/`, `lib/validation/` 직속 파일 **0건**. `lib/api/` 직속은 `client.ts`, `errors.ts` 둘만.
  > - **AC-6 (layout.tsx 컨벤션 문서화, 코드 변경 없음)** — `find app -name layout.tsx | wc -l` = **1**. 룰 추가.
  > - **AC-7 (formatters → utils 흡수)** — `test -d lib/formatters` → `gone`. `lib/utils/{cn,formatMoney,formatPct}.ts` 존재. `lib/copy/workbench/{actionLabels,errorMessages}.ts` 존재.
  > - **AC-8 (컨벤션 문서 확장)** — `docs/rules/frontend.md` 에 §3.6 의 7개 절 모두 추가. 기존 Tailwind 절 유지.
  > - **AC-9 (build / typecheck / lint)** — 3개 모두 0 에러.
  > - **AC-10 (시각·동작 0 회귀)** — 아래 라운드트립 5건 정상 응답.
  > - **AC-11 (AGENTS.md 원칙 무회귀)** — 한글 카피 무회귀, `127.0.0.1` 직접 호출 0건 (route handler 만 경유), 환경변수 단일 진입 유지.
  > - **AC-12 (수동 QA)** — `npm install`/`build` 0 에러, kebab-case 0건, `@/lib/query` 잔재 0건.
  > 
  > ## 최종 hooks/lib 트리
  > 
  > ```
  > hooks/query/queryKeys.ts
  > hooks/query/useMutationAnalyzeWorkbench.ts
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **반응형 (PC 대응 + useBreakpoint) PRD** — 별도 큐잉됨. `cn` 헬퍼 위에서 variant 분기로 자연스럽게 얹힘.
  - **두 번째 화면 추가 시 라우트 그룹 `(group)/layout.tsx` + `components/layout/` 추출 검토** — 본 PRD 의 §3.6 layout 절을 1차 근거.
  - **tailwind-merge 와 커스텀 토큰 충돌 모니터링** — `cn` 호출이 늘면서 `card`/`badge-warn`/`rounded-card` 같은 합성 토큰이 잘못 머지되는지 관찰. 발생 시 `extendTailwindMerge` 어댑터 1개를 `lib/utils/cn.ts` 안에 추가.

### 2026-05-20 — docs(prd+qa): responsive-pc-support PRD + PR #15 누락 QA 리포트 백필 (#16)

- **slug**: `docs/prd-responsive-pc-support` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/16
- **요약**: docs(prd+qa): responsive-pc-support PRD + PR #15 누락 QA 리포트 백필
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #15 (fe-conventions) 머지 직후 — 사용자 결정 "모바일·PC 둘 다 대응 + useBreakpoint 훅" 단독 PRD 로 정리.
  > 
  > ## 변경 요약
  > 
  > ### 추가 1: \`docs/prd/responsive-pc-support.md\` (266 라인, UI: yes)
  > - **§3**: 모바일 (`< md`) 무회귀 + 데스크탑 (`>= lg`) grid 레이아웃 + `useBreakpoint` 훅
  > - **AC 10개** + **§8 영향 분석** + **§9 OPEN QUESTION 11건** (사용자 결정 1건 RESOLVED: 반환형 `{isMobile, isTablet, isDesktop}`)
  > - **DESIGN.md → tailwind.theme.json → tailwind.config.ts** breakpoint 파이프라인 (PR #13 의 `design:sync` 그대로 활용)
  > - **CSS 1차 도구 = Tailwind prefix / JS 1차 도구 = useBreakpoint** 가 \`docs/rules/frontend.md\` 8번째 절로 추가됨
  > - **선후행**: PR #15 머지 후 진입. 후속으로 `chore/sync-agent-conventions` 큐잉됨 (반응형까지 머지 후 마지막 단계)
  > 
  > ### 추가 2: \`docs/qa/fe-conventions.md\` (PR #15 백필)
  > - QA 에이전트가 PR #15 검증 시 작성한 리포트가 untracked 로 남아있던 것 정리 (PR #10/#12/#14 와 동일 패턴)
  > - AC-1~12 모두 PASS, 구조 재편 13행 + import 14건 + 시각 0 회귀 5건 + 에지 케이스 모두 PASS, 결함 0건
  > 
  > ## 검증
  > - docs-only PR. 코드 변경 없음 — typecheck/lint/build 영향 0.
  > 
  > ## 다음 작업
  > - **ux-designer** 가 \`docs/design/workbench-analyze-rebuild.md\` 에 \`breakpoints\` 토큰 + 데스크탑 레이아웃 가이드 추가. \`npx @google/design.md lint\` 0 에러.
  > - **frontend-dev** 가 \`feature/responsive-pc-support\` 브랜치에서 구현. \`useBreakpoint\` 훅 + 컴포넌트 반응형 적용 + \`docs/rules/frontend.md\` 8번째 절 추가.
  > - 본 PRD 머지 후 **마지막**: \`chore/sync-agent-conventions\` — 누적 컨벤션을 \`.claude/agents/*\` + \`AGENTS.md\` 에 흡수.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **ux-designer** 가 \`docs/design/workbench-analyze-rebuild.md\` 에 \`breakpoints\` 토큰 + 데스크탑 레이아웃 가이드 추가. \`npx @google/design.md lint\` 0 에러.
  - **frontend-dev** 가 \`feature/responsive-pc-support\` 브랜치에서 구현. \`useBreakpoint\` 훅 + 컴포넌트 반응형 적용 + \`docs/rules/frontend.md\` 8번째 절 추가.
  - 본 PRD 머지 후 **마지막**: \`chore/sync-agent-conventions\` — 누적 컨벤션을 \`.claude/agents/*\` + \`AGENTS.md\` 에 흡수.

### 2026-05-20 — feat(responsive): PC 지원 — breakpoints 토큰 + useBreakpoint + 데스크탑 grid (#17)

- **slug**: `responsive-pc-support` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/17
- **요약**: feat(responsive): PC 지원 — breakpoints 토큰 + useBreakpoint + 데스크탑 grid
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6~#16 후속 — PRD `responsive-pc-support` 구현. 모바일 무회귀 + 데스크탑 (`>= lg`) 신규 레이아웃.
  > 
  > ## 변경 요약 (커밋 5단위)
  > 1. **docs(design)**: `docs/design/workbench-analyze-rebuild.md` v2 — breakpoints 토큰 + 데스크탑 가이드 (디자이너 산출물, 본 PR 의 input).
  > 2. **feat(tailwind)**: `npm run design:sync` 가 screens 토큰 흡수. `@google/design.md export` 가 breakpoints 를 흘려보내지 않으므로 후처리 스크립트 `scripts/inject-breakpoints.mjs` 가 DESIGN.md `breakpoints:` 절을 파싱해 `tailwind.theme.json.theme.extend.screens` 로 주입. `tailwind.config.ts` 의 어댑터가 `screens` 를 흡수 → 묵시적 채택을 명시적 채택으로 전환.
  > 3. **feat(hooks)**: `hooks/utils/useBreakpoint.ts` 신설. `{ isMobile, isTablet, isDesktop }` boolean 셋 반환. matchMedia 두 미디어쿼리(md/lg) 로 셋 도출. SSR-safe — 초기값 모바일 퍼스트로 hydration mismatch 0건. StrictMode 더블 마운트 대응 (`useEffect` cleanup 에서 listener 제거).
  > 4. **feat(components)**: 데스크탑 레이아웃 적용. Tailwind prefix 우선.
  >    - `app/page.tsx`: `md:max-w-2xl lg:max-w-6xl`, 데스크탑에서 `lg:grid lg:grid-cols-[360px_1fr] lg:gap-2xl`. 좌측 sidebar 는 `lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto`.
  >    - `components/workbench/ResultGroup.tsx`: 데스크탑(`>= lg`)에서 결과 6블록 비대칭 2 컬럼 grid. `action` 전폭 → `feasibility + warnings` (없으면 feasibility 풀폭) → `brief + risk_plan` → `horizons` 전폭. 모바일·데스크탑 DOM 순서가 달라(warnings 위치) `useBreakpoint` 로 JS 분기 — 본 PRD 의 sanity check 활용 1건 (PRD §3.4 / §9 RESOLVED 후보 (c)).
  > 5. **docs(rules)**: `docs/rules/frontend.md` 8번째 절 "반응형" 추가.
  > 
  > ## 디자이너 v2 결정 (DESIGN.md OPEN QUESTION R1~R5)
  > - R1 breakpoints: Tailwind 기본 정합 (sm 640 / md 768 / lg 1024 / xl 1280) — PM 권고 수용.
  > - R2 컨테이너 최대폭: `lg:max-w-6xl` (1152px) — PM 권고(1024~1280) 안에서 카드 폭 정보 밀도 우선 1152px 채택.
  > - R3 결과 grid: 우측 2 컬럼 비대칭.
  > - R4 입력 패널 위치: 좌측 sticky sidebar.
  > - R5 태블릿: 모바일과 동일 한 컬럼 + `md:max-w-2xl` 확장.
  > 
  > ## AC 자가검증
  > 
  > - **AC-1 (DESIGN.md breakpoints)**: front matter `breakpoints` 4 키 추가 (sm/md/lg/xl). 데스크탑 가이드 본문에 추가. `npx @google/design.md lint` errors=0 warnings=0.
  > - **AC-2 (Tailwind theme 정합)**: `npm run design:sync` 0 에러 종료. `tailwind.theme.json.theme.extend.screens` 4 키 존재. `tailwind.config.ts` 의 `adaptDesignTokens` 가 `screens` 흡수.
  > - **AC-3 (useBreakpoint 존재 + SSR-safe + 실사용)**: `hooks/utils/useBreakpoint.ts` 파일 존재. 반환 시그니처 `{ isMobile, isTablet, isDesktop }`. SSR 초기값 모바일 퍼스트로 hydration mismatch 0건 (dev 서버 + 콘솔 무경고 확인). `git grep useBreakpoint` 사용처: `components/workbench/ResultGroup.tsx` 1건.
  > - **AC-4 (모바일 무회귀)**: 모바일(`< lg`)에서 ResultGroup 의 DOM 순서·className 모두 기존 동일 (action → warnings → feasibility → brief → risk_plan → horizons). 메인 컨테이너 `max-w-[480px] px-lg pt-[18px] pb-[28px]` 유지. 라운드트립 5건 무회귀.
  > - **AC-5 (데스크탑 신규 레이아웃)**: `>= 1024px` 에서 결과 6블록 비대칭 2 컬럼. 메인 컨테이너 최대폭 1152px. 입력 패널 좌측 sticky sidebar.
  > - **AC-6 (Tailwind 반응형 prefix 우선)**: max-w·grid-cols·sticky·gap 등 레이아웃 변경은 모두 Tailwind prefix (`md:`/`lg:`). `useBreakpoint` 사용처는 DOM 트리 분기(=조건부 렌더) 1건만 — Tailwind prefix 로 표현 불가능한 케이스.
  > - **AC-7 (build / typecheck / lint)**: 0 에러 (실행 결과 첨부). `tailwind.theme.json` 변경분이 `npm run design:sync` 로 재현 가능.
  > - **AC-8 (AGENTS.md 무회귀)**: 한글 카피 유지. 직접 호출 0건 (route handler fallback 만). env 변경 없음. 키보드 탭 순서 = 시각 순서.
  > - **AC-9 (컨벤션 문서 확장)**: `docs/rules/frontend.md` 에 "반응형" 절 9 줄 추가 (CSS 측 / JS 측 / window.innerWidth 금지 / hooks/utils 위치 / SSR-safe / breakpoint 단일 진실 원천). 기존 7개 절 무회귀.
  > - **AC-10 (수동 QA)**: 아래 수동 라운드트립 절.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `chore/sync-agent-conventions` — 누적 컨벤션(camelCase 네이밍, 커스텀훅 의무화, `cn`, `hooks` 일원화, 도메인 한 뎁스, Tailwind 토큰, BFF, 반응형 prefix · `useBreakpoint`) 을 `.claude/agents/*.md` + `AGENTS.md` + `docs/agents/*.md` 에 흡수. 본 PR 머지 후 마지막 단계.

### 2026-05-20 — chore(agents): 누적 컨벤션을 에이전트 정의에 흡수 + docs/agents 정리 (#18)

- **slug**: `chore/sync-agent-conventions` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/18
- **요약**: chore(agents): 누적 컨벤션을 에이전트 정의에 흡수 + docs/agents 정리
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #6~#17 흐름으로 정착된 누적 컨벤션을 에이전트 정의에 흡수해 다음 PRD/구현 사이클에서 자동 적용되게 한다. 사용자 명시 의도 — "앞으로 작업에서도 기억해야할 내용들은 agent쪽에서 안까먹게".
  > 
  > ## 변경 요약 (20 파일, +594/-102)
  > 
  > ### \`AGENTS.md\` 갱신
  > - **제품 구조**: Tailwind v3 / TanStack Query v5 / axios / BFF / DESIGN.md 파이프라인 명시
  > - **작업 원칙**: BFF 패턴, 스타일링 (Tailwind + components.css), 디자인 토큰 동기화, 반응형 (CSS = Tailwind prefix / JS = useBreakpoint), `docs/rules/frontend.md` 1차 근거 참조
  > - **에이전트 역할 표**: 각 역할의 컨벤션 책임 명시
  > - **작업 흐름 절 신설**: 라벨 게이트 (impl-ready → qa-passed → review-approved → 머지) + handoff-append workflow + 자가 PR 처리
  > - **도메인·폴더 표준 절 신설**: app/, components/, hooks/<domain>/, hooks/query/, hooks/utils/, lib/api/, lib/copy/<domain>/, lib/utils/
  > 
  > ### \`.claude/agents/\` 8개 갱신
  > - **frontend-dev**: 컨벤션 8개 절 요지 + 반응형 + BFF + 디자인 토큰 의무
  > - **pm**: PRD 양식 1~7 + §8 영향 분석 + §9 OPEN QUESTION ([RESOLVED] 패턴) + 컨벤션 컨텍스트
  > - **ux-designer**: \`breakpoints\` 토큰 + \`design:sync\` 파이프라인 절 추가
  > - **api-integration-dev**: BFF 안정성 6가지 (try/catch, AbortSignal.timeout(30s), 4xx 통과, Content-Type 폴백, 빈 본문 폴백, cache: no-store) + 환경변수 단일 진입 + 시크릿 정책
  > - **qa**: AC 표 + 라운드트립 (BE LIVE 5건) + DESIGN.md 라이브 동기화 + 두 뷰포트 반응형 검증
  > - **reviewer**: 점검 11 영역 + 자가 PR 처리 (\`--comment\` + 라벨 fallback) + HANDOFF 점검 + nit 은 후속 메모로
  > - **devops**: 라벨 흐름 명시 + \`gh pr merge --merge --delete-branch\` 패턴
  > - **manager**: 필수 read 에 AGENTS.md + docs/rules/frontend.md 추가
  > 
  > ### \`docs/agents/\` 정리
  > - **삭제 2건**: \`deployer.md\` (구 DevOps 명), \`dev-frontend.md\` (구 frontend-dev 명) — \`.claude/agents/\` 와 충돌하는 구버전 잔재
  > - **8개 model 필드**: \`gpt-4\` / \`gpt-5.3\` → \`inherit\` 통일 (engine 레포 잔재 정정, PR #14 의 부분 정정 완결)
  > 
  > ### 동반 정리
  > - \`docs/qa/responsive-pc-support.md\` (PR #17 QA 에이전트 산출물, untracked 백필 — PR #10/#12/#14/#16 와 동일 패턴)
  > 
  > ## 검증
  > - \`npm run typecheck\` / \`npm run lint\` 0 에러 (docs/agents 변경은 코드 영향 0).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 컨벤션 누적 정착이 본 PR 로 마무리. 다음 PRD 진입 시 PM 에이전트가 자동으로 \`docs/rules/frontend.md\` + 본 \`AGENTS.md\` 를 컨벤션 컨텍스트로 사용.
  - 향후 도메인 (\`portfolio\`, \`alerts\` 등) 또는 컴포넌트 (\`components/layout/\`, \`components/ui/\`) 추가 PRD 가 들어올 때 본 컨벤션이 1차 근거로 작동.
  - (선택) \`docs/agents/\` 파일들을 \`.claude/agents/\` 와 완전 동기화할지 — 본 PR 에서는 model 정합·잔재 제거까지만 처리. 깊은 본문 동기화는 별도 chore PRD.

### 2026-05-20 — docs(prd): palette-modernization — DESIGN.md 색 팔레트 모던·시그니처 정제 (#19)

- **slug**: `docs/prd-palette-modernization` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/19
- **요약**: docs(prd): palette-modernization — DESIGN.md 색 팔레트 모던·시그니처 정제
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PR #18 머지 직후 — 사용자 결정 "모던 + 색상 적게 + 시그니처 정도만 + 디자이너 일임" 단독 PRD 로 정리.
  > 
  > ## 변경 요약
  > 
  > ### 추가: \`docs/prd/palette-modernization.md\` (256 라인, UI: yes)
  > - **§3.2 디자이너 가이드** — 모던 톤의 조작적 정의:
  >   - 채도 낮은 그레이스케일 + 포인트 1~2
  >   - 트레이딩 도메인 신뢰감 — 중립 그레이 / 차콜 / 다크 블루 계열
  >   - 상태 색 (warn/critical/info) 시각적 명확성 무회귀
  >   - 다크 모드 친화 semantic 명명 권장 (primary/surface/accent/text-strong/text-muted)
  > - **§3.3 코드 자동 흡수** — Tailwind theme key 동일 시 컴포넌트 0 변경. 키 변경 시 mechanical rename 1회.
  > - **AC 10개** — DESIGN.md v3 (errors=0 warnings=0) / design:sync 파이프라인 / 시그니처 색 prose 명시 / 모던 톤 근거 단락 + 신·구 비교 표 / WCAG AA 대비비 / 합성 토큰 정합 / build·typecheck·lint / 시각 라운드트립 5건 / 반응형 무회귀 / 코드 변경 최소
  > - **§4 비범위** — 다크 모드 (별도 PRD), 레이아웃·간격 변경, 새 토큰 카테고리(typography/spacing 등), shadcn-ui, 차트
  > - **§8 영향 분석** — 신·구 팔레트 비교 위치, mechanical rename 비용 추정, 회귀 위험
  > - **§9 OPEN QUESTION**: 0건 — PM 이 사용자 결정 4가지를 §3 가정·AC 에 모두 분배. 디자이너 결정 영역은 §3.2 의 가이드 안에서 ux-designer 가 R1~Rn 으로 명시 예정.
  > 
  > ## 검증
  > - docs-only PR. 코드 변경 없음 — typecheck/lint/build 영향 0.
  > 
  > ## 다음 작업
  > - **ux-designer** 가 \`docs/design/workbench-analyze-rebuild.md\` v3 작성. 시그니처 색 1~2 결정 + 토큰 수 정제 + semantic 명명 + 신·구 비교 표 + WCAG AA 대비비 표 + lint 0/0.
  > - **frontend-dev** 가 \`feature/palette-modernization\` 브랜치에서 구현. \`npm run design:sync\` + tailwind theme 자동 흡수. 토큰명 변경 있으면 mechanical rename 한 번.
  > - **QA** 가 PR #11 라운드트립 5건 + PR #17 두 뷰포트 + DESIGN.md 토큰 라이브 동기화 검증.
  > - 본 PRD 머지 후 후속: (선택) 다크 모드 PRD, 또는 추가 도메인 (portfolio/alerts) — 사용자 결정 시점에 큐잉.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **ux-designer** 가 \`docs/design/workbench-analyze-rebuild.md\` v3 작성. 시그니처 색 1~2 결정 + 토큰 수 정제 + semantic 명명 + 신·구 비교 표 + WCAG AA 대비비 표 + lint 0/0.
  - **frontend-dev** 가 \`feature/palette-modernization\` 브랜치에서 구현. \`npm run design:sync\` + tailwind theme 자동 흡수. 토큰명 변경 있으면 mechanical rename 한 번.
  - **QA** 가 PR #11 라운드트립 5건 + PR #17 두 뷰포트 + DESIGN.md 토큰 라이브 동기화 검증.
  - 본 PRD 머지 후 후속: (선택) 다크 모드 PRD, 또는 추가 도메인 (portfolio/alerts) — 사용자 결정 시점에 큐잉.

### 2026-05-20 — feat: palette v3 적용 — Signature Slate(#1f3b4d) + 토큰 13개 + semantic 명명 (#20)

- **slug**: `palette-modernization` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/20
- **요약**: feat: palette v3 적용 — Signature Slate(#1f3b4d) + 토큰 13개 + semantic 명명
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > PRD `palette-modernization` 구현. PR #19 (PRD docs) 머지 후 — 새 룰 (한 브랜치 한 PR) 의 첫 적용 사례.
  > 
  > ## 변경 요약 (커밋 분할)
  > 1. `docs(design): palette v3 — Signature Slate(#1f3b4d) + 토큰 16→13 + semantic 명명` (b4a623a, ux-designer 산출물)
  > 2. `chore(workflow): 한 브랜치 한 PR 룰 — PRD/DESIGN.md/QA 별도 docs PR 폐기` (9c77083)
  > 3. `chore(tailwind): design:sync — v3 토큰 흡수` (0fca370)
  > 4. `refactor(css): app/components.css·globals.css 합성 토큰 mechanical rename (v2 → v3)` (0c35918)
  > 5. `refactor(workbench): 컴포넌트 className v3 토큰 적용` (3a4ee6a)
  > 
  > ## 시그니처 색
  > - **Signature Slate** `#1f3b4d` (토큰 키 `primary`)
  > - v2 의 teal `#0f766e` (`tertiary`) → 다크 슬레이트 블루 전환. HSL S 값 ≈ 43% 로 채도 절제.
  > - 한 화면에 두 지점 원칙: `action` 카드(`badge-accent` = accent-soft 배경 위 primary 텍스트) + 분석 CTA(`button-primary` = primary 배경 + surface 텍스트).
  > 
  > ## 토큰 매핑 (v2 16 → v3 13)
  > | v2 | v3 | 변경 |
  > |---|---|---|
  > | `primary` (#17202a 차콜) | `text-strong` (#17202a) | 의미 재배치: text 의미는 `text-strong` 으로 분리 |
  > | `primary` (시그니처 색) | `primary` (#1f3b4d 슬레이트) | 시그니처 색 톤 전환 |
  > | `secondary` | `text-muted` (#5b6878) | semantic 명명 |
  > | `tertiary` | `primary` | 시그니처 흡수 |
  > | `tertiary-soft` | `accent-soft` (#e6ecf2) | semantic 명명 |
  > | `panel` | `surface` (#ffffff) | semantic 명명 |
  > | `neutral` | `surface-muted` (#f5f7fa) | semantic 명명 |
  > | `line` | `border-line` (#dbe2ea) | semantic 명명 |
  > | `field-bg` | `surface-muted` (흡수) | 입력 톤 단일화 |
  > | `white` | `surface` (흡수) | 중복 제거 |
  > | `body-strong` | `text-strong` (흡수) | 본문 색 단일화 |
  > | `warn` #b45309 | `warn` #a04a09 | 미세 톤 다운 |
  > | `critical` #991b1b | `critical` #8a1818 | 미세 톤 다운 |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (선택) **다크 모드 PRD** — v3 의 semantic 명명(`surface` / `surface-muted` / `text-strong` / `text-muted` / `primary` / `accent-soft` / `border-line`) 이 그대로 다크 친화. 별도 PRD 진입 시점 결정.
  - (선택) 로고·아이콘 작업 PRD — 본 PRD 의 시그니처 슬레이트 `#1f3b4d` 가 로고 메인 컬러로 자연스럽게 확장. 본 PRD §4 비범위였으므로 별도 PRD.

### 2026-05-21 — feat(layout): 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기 (#21)

- **slug**: `layout-redesign` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/21
- **요약**: feat(layout): 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PRD `layout-redesign` (3분할 PRD 중 #1) 의 PRD / DESIGN.md v4 / 구현을 한 브랜치 안에 누적한 PR.
  > 
  > - **3-section shell 도입** — 상단 navbar + 좌측 사이드바 + 메인 영역. PRD #11 의 단일 페이지 `lg:grid-cols-[360px_1fr]` sticky sidebar 구조 폐기.
  > - **App Router 컨벤션 적용** — RootLayout 은 html/body/Providers 만 책임, 새 route group `(workbench)/layout.tsx` 가 글로벌 shell 호스팅. URL 무변경 ("/" 그대로).
  > - **메인 영역 6블록 위계 갱신** — Action → Brief → (Feasibility + Horizons 2-col) → RiskPlan → Warnings (R3 인지 흐름 우선).
  > - **모바일 drawer 도입** — hamburger 클릭 → slide-in. ESC + scrim + close 세 진입점. focus trap + body scroll lock 자체 구현 (라이브러리 0건). 리사이즈 시 자동 닫기.
  > - **in-session 히스토리·즐겨찾기** — React Context 기반 (Zustand 미도입). 분석 mutation 성공 시 자동 push (LRU 5건), ticker-header + 사이드바 항목 두 진입점에서 별표 토글.
  > - **디자인 토큰 흡수** — `design:sync` source 를 v3 → v4 로 갱신. spacing 4 키 / typography 2 키 / rounded 1 키 / components 16 합성 토큰 추가. 기존 v3 토큰 무회귀.
  > 
  > ## 변경 사항
  > 
  > ### 사전 산출물 (이미 commit 된 것)
  > - `docs/prd/layout-redesign.md` (545 lines) — PRD 본문.
  > - `docs/SESSION_NOTES.md` — 2026-05-21 세션 정리.
  > - `docs/design/layout-redesign.md` (832 lines) — DESIGN.md v4 신설.
  > 
  > ### 본 구현 commit
  > 
  > #### `chore(tokens): design:sync source v4 갱신 + 신규 토큰 흡수`
  > - `package.json` `scripts.design:sync` source → `docs/design/layout-redesign.md`.
  > - `scripts/inject-breakpoints.mjs` 의 `DESIGN_PATH` 도 v4 경로로.
  > - `tailwind.theme.json` 재생성 (결정적) — spacing `navbar-h/sidebar-w/drawer-w/main-max-w`, typography `nav-brand/sidebar-section`, borderRadius `md` 추가.
  > - `tailwind.config.ts` `adaptDesignTokens` — 신규 typography 2 키 + `letterSpacing` 흡수.
  > 
  > #### `feat(layout): 3-section shell + 6블록 위계 + in-session 히스토리/즐겨찾기`
  > - `app/components.css` — v4 신규 합성 토큰 16 추가 (`@layer components`). 기존 21 토큰 무회귀.
  > - `app/layout.tsx` — 무변경 (RootLayout 책임 유지).
  > - `app/(workbench)/layout.tsx` (신규) — Navbar + Sidebar + MobileDrawer 호스팅 + `WorkbenchSessionProvider`.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PRD #2 component-compactness 신설** — input · dropdown · selectbox · checkbox · toggle 등 **개별 컴포넌트의 내부 디자인** (크기 · 폰트 · outside-click · input 내 단위 표기) 리디자인. 본 PRD 가 자리만 잡은 ticker-header / SearchPanel / InputPanel 의 내부 디테일은 #2 가 다룬다.
  - **PRD #3 claude-cli-analysis 신설** — BFF route handler 가 FastAPI 대신 로컬 claude CLI subprocess 호출하도록 데이터 소스 교체. 본 PRD 의 6블록 정보 구조는 응답 shape 에만 의존하므로 BFF 만 갈아끼우면 무회귀.
  - 사용자 결정: #2 → #3 권장 (시각 디테일 먼저, 데이터 소스 교체는 BE/FE 추상화 흡수 후).
  QA 게이트 통과 후 `qa-passed` 라벨 부착 시점에 본 섹션이 `docs/HANDOFF.md` 로 자동 append (handoff-append workflow).

### 2026-05-21 — feat: component-compactness — input·dropdown·button 컴팩트화 + outside-click + nit 흡수 (#22)

- **slug**: `component-compactness` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/22
- **요약**: feat: component-compactness — input·dropdown·button 컴팩트화 + outside-click + nit 흡수
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PRD #2 `component-compactness` 구현 PR. PR #21 (layout-redesign) 위에서 **컴포넌트 내부 톤** 만 재정의 — colors / spacing 기존 키 / typography 기존 키 / rounded / breakpoints 무수정 계승, components 만 컴팩트화. v5 DESIGN.md (`docs/design/component-compactness.md`) 의 토큰을 `design:sync` 로 결정적 흡수.
  > 
  > 사용자 의도 4 문장 흡수:
  > 1. **컴팩트 톤** — input h 42→36, button-primary h 44→40, sidebar-item h 40→36, search-result-item h(신규) 34.
  > 2. **outside-click** — `useOutsideClick` 자체 구현 (mousedown + touchstart) + Tab(onBlur relatedTarget) + ESC(기존). 신규 라이브러리 0건.
  > 3. **input 내 우측 suffix** — USD / % / 일 모두 input 필드 내부 absolute, `pointer-events:none` + `aria-hidden`. 우측 padding 만 `pr-input-pr-suffix` (44px) 확장.
  > 4. **전문가 톤** — input-label (13/700/1.25), input-suffix (13/400/1.2 tnum), button-secondary / button-icon 신설.
  > 
  > 추가로 PR #21 reviewer nit 3건 흡수.
  > 
  > ## 변경 사항
  > 
  > ### 디자인 파이프라인 (`chore(tokens)` 커밋)
  > - `package.json` design:sync source v4 → v5.
  > - `scripts/inject-breakpoints.mjs` DESIGN_PATH 동일 갱신.
  > - `npm run design:sync` 결정적 재생성 — typography 3 (`button-sm`, `label-sm`, `input-suffix`) + spacing 9 (`input-h`, `input-px`, `input-py`, `input-pr-suffix`, `dropdown-item-h`, `dropdown-item-py`, `button-primary-h`, `button-sm-h`, `hit-area-min`) 흡수.
  > - `tailwind.config.ts` `TYPOGRAPHY_EXTRAS` 에 v5 신규 3 키 lineHeight / fontFeature 흡수.
  > - `app/components.css`:
  >   - 갱신 (size 다운): `input` / `input-error` (h 36px, body-sm), `button-primary` (40px), `search-result-item(-focus)` (34px), `sidebar-item` (36px).
  >   - 신설: `input-label` / `input-helper` / `input-helper-error` / `input-suffix` / `dropdown-panel` / `button-secondary` / `button-icon` (32×32 + before:absolute -inset-1 → hit area 40).
  >   - `favorite-toggle` 도 동일 패턴 (시각 32, hit area 40) 으로 강화.
  > 
  > ### 컴포넌트 (`feat(workbench)` 커밋)
  > - `hooks/utils/useOutsideClick.ts` (신규) — ref 외부 mousedown + touchstart 감지. SSR-safe.
  > - `components/workbench/SearchPanel.tsx` — wrapperRef + useOutsideClick + onBlur(Tab) + dropdown-panel 토큰.
  > - `components/workbench/InputPanel.tsx` — `InputWithSuffix` 내부 컴포넌트로 추출, 4 필드 모두 우측 suffix DOM (USD / % / 일). label-sm / input-helper(-error) 호출. **prop 시그니처 무수정** (AC-18).
  > - `components/layout/Sidebar.tsx` — nit #1: 인라인 `60px` 제거, `top-navbar-h` + `max-h-[calc(100vh-theme(spacing.navbar-h))]`.
  > - `components/layout/Navbar.tsx` — placeholder `h-[40px] w-[40px]` → `h-hit-area-min w-hit-area-min`.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 본 PR 머지 후 **PRD #3 `claude-cli-analysis`** 신설 — 분석 결과의 데이터 소스 교체 (FastAPI BE → BFF route handler 가 로컬 claude CLI subprocess 호출). 본 PRD 의 6블록 shape · 합성 토큰 무회귀.
  - 운영 모니터링: 모바일 (375px) 에서 input 36px hit area 가 라벨·helper 합쳐 60px+ 묶음으로 충분한지 실 디바이스 점검 권장.
  - 후속 후보: button-icon 합성 토큰을 결과 카드 보조 아이콘 (예: tooltip / copy) 에 도입할 자리가 생기면 확장.

### 2026-05-21 — feat(api): claude CLI subprocess 분석 백엔드 + adapter 추상화 (#23)

- **slug**: `claude-cli-analysis` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/23
- **요약**: feat(api): claude CLI subprocess 분석 백엔드 + adapter 추상화
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PRD `claude-cli-analysis` (#22 후속, 3분할 PRD 의 마지막) 구현. 분석 결과의 **데이터 소스 교체** 만 다루고 UI 는 무수정. 운영자가 `ANALYZE_BACKEND` 환경변수 하나로 FastAPI ↔ 로컬 claude CLI subprocess 사이를 toggle. 후속 PRD `claude-api-analysis` 가 같은 `AnalyzeAdapter` 인터페이스 위에 `claudeApiAdapter` 만 추가하면 되도록 어댑터 추상화를 미리 도입.
  > 
  > ## 변경 사항
  > 
  > - `app/api/workbench/_adapters/types.ts` (신규) — `AnalyzeAdapter` 인터페이스 + `AdapterResult` + `AnalyzeBackend` 정의.
  > - `app/api/workbench/_adapters/fastapi.ts` (신규) — 기존 route handler 의 `fetch(fastapi)` 로직 1:1 이동. `FASTAPI_BASE_URL` 그대로 사용.
  > - `app/api/workbench/_adapters/claudeCli.ts` (신규) — `execFile` + stdin pipe + `AbortController(30s)` subprocess 호출. `claude --print --output-format json --system-prompt ...` argv 분리 (shell 미경유로 injection 차단). envelope.result 안에서 JSON 추출 → 코드펜스 strip + 첫 `{`~마지막 `}` 슬라이스 fallback. 핵심 6블록 누락 시 malformed, 보조 필드 누락 시 기본값 fallback. Vercel 환경 (`VERCEL=1`, `VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_ENV`) 감지 시 호출 거부. ENOENT / timeout / exit code ≠ 0 / parse 실패 모두 한글 폴백 메시지로 흡수.
  > - `app/api/workbench/_adapters/prompt.ts` (신규) — 한글 system + user prompt. JSON 스키마는 `lib/types/workbench/analyze.ts` 와 정합. `CLAUDE_PROMPT_TEMPLATE` 로 user prompt override 가능.
  > - `app/api/workbench/_adapters/index.ts` (신규) — `resolveBackend()` + `createAnalyzeAdapter()` factory.
  > - `app/api/workbench/analyze/route.ts` — adapter dispatcher 로 교체. 진입부 Vercel 가드. `fetch()` 직접 호출 제거 (adapter 위임).
  > - `.env.example` — `ANALYZE_BACKEND` / `CLAUDE_CLI_PATH` / `CLAUDE_CLI_MODEL` / `CLAUDE_PROMPT_TEMPLATE` 4종 한글 주석과 함께 명시.
  > - `lib/copy/workbench/errorMessages.ts` — `CLAUDE_CLI_FALLBACKS` reference 카탈로그 추가 (실제 카피는 BFF adapter 가 직접 흘려보냄).
  > 
  > ## 검증
  > 
  > - `npm run typecheck` — 0 에러.
  > - `npm run lint` — 0 에러.
  > - `npm run build` — 0 에러. `/api/workbench/analyze` route 정상 생성 확인.
  > - `git diff main -- components/ app/(workbench)/ app/components.css app/globals.css docs/design/ lib/types/workbench/analyze.ts lib/api/workbench/ hooks/` → 0 라인 (AC-11 / AC-12 / AC-13 / AC-20 UI 무회귀).
  > - `git grep "fetch(" -- components/ hooks/ lib/api/workbench/` → 0건 (BFF 단일 진입점 유지).
  > - `git grep "child_process\.exec(\|\\bexec('\\|\\bexec(\\\"" -- app/` → 0건 (shell 경유 `exec()` 미사용, `execFile` 만).
  > - claude CLI envelope shape sanity check — `claude --print --output-format json` 출력이 `{ type: "result", subtype: "success", result: "<text>", ... }` 형태임을 확인. adapter 의 envelope.result path 정합.
  > - 신규 의존성 0건 — `node:child_process` 표준 모듈만 사용. `package.json` 변경 없음.
  > 
  > ## 다음 작업
  > 
  > - **QA** 진입. 두 백엔드 모드 × 라운드트립 5건 + CLI 실패 케이스 (timeout / parse / ENOENT / Vercel) 검증. AC-1~AC-20 재현·기대·실측 표로 `docs/qa/claude-cli-analysis.md` 작성.
  > - 머지 후보 후속 PRD: `claude-api-analysis` — Claude API 직접 호출. 본 PR 의 `AnalyzeAdapter` 인터페이스 위에 `claudeApiAdapter` 추가만으로 도입 가능. Vercel serverless 환경에서도 동작 가능 (subprocess 미사용).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **QA** 진입. 두 백엔드 모드 × 라운드트립 5건 + CLI 실패 케이스 (timeout / parse / ENOENT / Vercel) 검증. AC-1~AC-20 재현·기대·실측 표로 `docs/qa/claude-cli-analysis.md` 작성.
  - 머지 후보 후속 PRD: `claude-api-analysis` — Claude API 직접 호출. 본 PR 의 `AnalyzeAdapter` 인터페이스 위에 `claudeApiAdapter` 추가만으로 도입 가능. Vercel serverless 환경에서도 동작 가능 (subprocess 미사용).

### 2026-05-21 — polish-followups: PR #22/#23 reviewer nit 6건 일괄 흡수 (#24)

- **slug**: `polish-followups` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/24
- **요약**: polish-followups: PR #22/#23 reviewer nit 6건 일괄 흡수
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PR #22 (component-compactness) 와 PR #23 (claude-cli-analysis) reviewer 가 후속 권고로 남긴 6건의 polish nit (A1/A2/A3/B1/B2/B3) 을 한 PR 로 묶어 흡수. 신규 기능 0건, 라운드트립 0건 변경, 응답 shape 0건 변경, adapter 인터페이스 0건 변경.
  > 
  > ## 변경 사항
  > 
  > ### 디자인 토큰 파이프라인 (v6)
  > - `package.json` design:sync source → `docs/design/polish-followups.md` (v6).
  > - `scripts/inject-breakpoints.mjs` DESIGN_PATH → v6.
  > - `tailwind.theme.json` 재생성 — 신규 spacing 3 (`input-pr-suffix-sm` 36px / `-md` 44px / `-lg` 56px) 흡수.
  > 
  > ### A1 — SearchPanel dropdown ARIA + 키보드 navigation
  > - ARIA 5속성 풀 셋 — `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete="list"` + `aria-activedescendant` (옵션 id 가리킴).
  > - listbox 컨테이너 + 옵션 li 의 `role` / `aria-selected` / 안정 id (`${listId}-option-${ticker}`).
  > - 키보드 ↑/↓ wrap-around — 마지막에서 ↓ → 첫, 첫에서 ↑ → 마지막. 초기 -1 (옵션 focus 없음).
  > - Enter 가드 — `focusIndex < 0` 시 동작 없음 (의도하지 않은 선택 방지).
  > - ESC 시 dropdown 닫음 + focusIndex -1 + input focus 복귀.
  > - 입력값 변경 시 focusIndex -1 로 리셋.
  > 
  > ### A2 — InputPanel suffix 단위별 너비 분기
  > - `suffixPaddingClass(suffix)` 헬퍼 — 단위 문자열 길이로 sm/md/lg 분기.
  > - 1자 (`%`, `일`) → `pr-input-pr-suffix-sm` (36px, v5 대비 8px 축소).
  > - 2~3자 (`USD`, `KRW`) → `pr-input-pr-suffix-md` (44px, v5 무회귀).
  > - 4자+ → `pr-input-pr-suffix-lg` (56px, 향후 단위 사전 대비).
  > - `tailwind.config.ts` / `app/components.css` 주석 v6 갱신.
  > 
  > ### A3 — claudeCli 6블록 누락 한글화
  > - `CLAUDE_CLI_FALLBACKS` 카탈로그에 `missing_action/brief/feasibility/horizons/risk_plan/warnings` 6키 + `malformed_position` 1키 추가.
  > - normalize 반환 타입을 `NormalizeResult` discriminated union 으로 변경 (`{ok, data}` / `{ok:false, reason, error}`).
  > - 누락 우선순위: `action → brief → feasibility → horizons → risk_plan → warnings` 순 early return.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - QA 에이전트 — 라운드트립 5건 양 뷰포트 (1280·1920) 시각 회귀 검증 (특히 A2 의 1자 단위 필드 우측 padding 36px), 키보드 + VoiceOver 시뮬레이션 1건, claude CLI mock 6블록 누락 케이스 6개 + position 잘못된 shape 1개 한글 메시지 매핑 검증.
  - 사용자 검증 후 PRD `claude-api-analysis` 진입 (사용자 명시 의도 — PR #23 PRD 1.2 의 후속).
  - 또는 PRD `analyze-streaming` (단일 → streaming UX 개선) — 사용자 결정.

### 2026-05-23 — chore(tailwind): v4 migration (PR1/9 finsight-redesign) (#26)

- **slug**: `finsight-redesign` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/26
- **요약**: chore(tailwind): v4 migration (PR1/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > PRD `finsight-redesign` 시리즈 **PR1/9** — Phase 1 Tailwind v4 마이그레이션.
  > 
  > - `tailwindcss` `^3.4.19` → `^4.3.0` (v4 stable).
  > - `@tailwindcss/postcss` ^4.3.0 신규 (devDependency). `autoprefixer` 제거 (v4 의 LightningCSS 가 vendor prefix 흡수).
  > - `postcss.config.mjs` 가 `@tailwindcss/postcss` 단일 플러그인 호출.
  > - `app/globals.css` — v3 `@tailwind base; @tailwind components; @tailwind utilities;` 3 디렉티브 → v4 `@import "tailwindcss";` 단일 + `@config "../tailwind.config.ts";` 디렉티브 (JS 어댑터 다리 강제, PRD §6.2 + §9 q10 옵션 A).
  > - `app/components.css` — `@tailwind components;` 디렉티브 → `@reference "./globals.css";` (Next.js CSS 로더 파일별 처리에서 token scope 공유). v4 `@apply` 제약 (utilities 만 허용) 흡수: `badge-base` 합성 → 각 variant 가 base utility 셋 직접, `theme("colors.accent-soft")` 박혀 있던 box-shadow → `shadow-[0_0_0_3px_theme(colors.accent-soft)]` 임의값 utility.
  > - `eslint.config.mjs` / `tsconfig.json` — `Stock and Coin Analysis App/` 폴더 제외 (Figma export, PRD §9 q8 옵션 B — PR9 후 별도 cleanup PR 로 제거).
  > - DESIGN.md → `tailwind.theme.json` 어댑터 (`adaptDesignTokens` + `adaptFontSize` + `inject-breakpoints.mjs`) 무회귀. v8 토큰 cascade 의 base.
  > 
  > 본 PR1 은 시각 톤 변경 0 — v7 rev2 토큰 셋이 v4 위에서 그대로 cascade. PR2 가 DESIGN.md v8 + Pretendard + 한국식 등락 토큰 등 본격 디자인 변경 진입.
  > 
  > ## Test plan
  > 
  > ### AC-V4-1~8 (PRD §5.1)
  > 
  > - [x] **AC-V4-1**: `npm ls tailwindcss` → `tailwindcss@4.3.0`.
  > - [x] **AC-V4-2**: `npm ls @tailwindcss/postcss` → `@tailwindcss/postcss@4.3.0` (1건).
  > - [x] **AC-V4-3**: `app/globals.css` 첫 디렉티브 `@import "tailwindcss";`. `@tailwind base/components/utilities` 디렉티브 0건. (`grep -nE '^@tailwind ' app/globals.css app/components.css` → 0건)
  > - [x] **AC-V4-4**: `postcss.config.mjs` 가 `@tailwindcss/postcss` 단일 플러그인. `tailwindcss` 직접 호출 0건.
  > - [x] **AC-V4-5**: `tailwind.config.ts` 의 `theme.extend` 패턴 + `tailwind.theme.json` import 무회귀 (본 PR 무수정).
  > - [x] **AC-V4-6**: `@config "../tailwind.config.ts"` 디렉티브가 `app/globals.css` line 18 에 존재.
  > - [x] **AC-V4-7**: `npm run build` 0 에러. `.next/` 산출물 정상 (`/`, `/api/whitelist/search`, `/api/workbench/analyze`).
  > - [x] **AC-V4-8**: 현 `/` 화면 시각 회귀 0 — 컴파일 CSS 의 `bg-surface { background-color: #ffffff }`, `bg-surface-muted { background-color: #f6f8fa }` 등 v7 rev2 토큰 그대로 cascade. theme(spacing.navbar-h) 임의값도 60px 로 해석.
  > 
  > ### AC-COMMON (PRD §5.7)
  > 
  > - [x] **AC-COMMON-1**: `npm run typecheck` 0 에러.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR2** `feat(design): v8 토큰 + finsight 톤 적용` — DESIGN.md v8 source 를 `package.json` `design:sync` + `scripts/inject-breakpoints.mjs` `DESIGN_PATH` 에 연결 + `npm run design:sync` 재생성 + `tailwind.config.ts` 의 `TYPOGRAPHY_EXTRAS` 에 `font-display` 1줄 추가 + Pretendard `next/font/local` self-host (PRD §9 q6 옵션 B) + `app/components.css` 의 신규 합성 토큰 (`badge-signal-up/down`, `badge-asset-stock/coin`, `card-ai`, `ai-heading` 등) cascade.
  - **시안 폴더 cleanup** — PR9 머지 후 별도 `chore: remove figma make export after finsight-redesign` PR (PRD §9 q8 RESOLVED 옵션 B).

### 2026-05-23 — feat(design): v8 토큰 + Pretendard cascade (PR2/9 finsight-redesign) (#27)

- **slug**: `finsight-redesign` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/27
- **요약**: feat(design): v8 토큰 cascade — DESIGN.md v8 source 채택 + Pretendard self-host + 합성 토큰 신설
- **현재 상태**: QA 통과 + 리뷰 승인 (라벨 `review-approved`). handoff-append workflow 가 직전 PR 본문 인용 안의 과거 `(#27)` (2026-05-01 HANDOFF 워크플로우 자체 PR) 부분일치로 false-positive skip — reviewer 가 본 entry 를 직접 백필
- **변경 요약**:
  - `package.json` design:sync source → `docs/design/finsight-redesign.md` (v8)
  - `scripts/inject-breakpoints.mjs` DESIGN_PATH 동기화
  - `tailwind.theme.json` design:sync 재생성 — colors 26 (v7 rev2 13 + signal-up/-soft + signal-down/-soft + asset-stock/-soft + asset-coin/-soft + gradient-ai-from/-to/-soft 13 신규), typography 17, spacing 29 (card-px·card-py·card-px-mobile·card-py-mobile·hero-px·hero-py 6 신규), rounded 5 (lg 16px·xl 24px 2 신규)
  - `tailwind.config.ts` TYPOGRAPHY_EXTRAS 에 `font-display` (lineHeight 1.12 / letterSpacing -0.02em) 1줄
  - `app/components.css` 합성 토큰 클래스 신설 — `.card-info` / `.card-hero` / `.card-ai` / `.gradient-ai-bg` / `.badge-signal-up` / `.badge-signal-down` / `.badge-asset-stock` / `.badge-asset-coin` / `.signal-up-text` / `.signal-down-text` / `.ai-heading`. 기존 카드 셸 `rounded-sm + p-[16px]` → `rounded-lg + p-card-px-mobile lg:p-card-px` cascade. hex/px 직타 0 건 (주석 1 건은 설명용)
  - `app/globals.css` html `font-family` 를 `var(--font-pretendard), -apple-system, BlinkMacSystemFont, Arial, sans-serif` 로 교체
  - `app/layout.tsx` `next/font/local` 정의 — 4 weight (400 / 500 / 700 / 800), display:swap, preload:true, variable `--font-pretendard`, fallback 명시. `<html className={pretendard.variable}>` SSR 안전
  - `public/fonts/pretendard/*.woff2` 4 (Regular / Medium / Bold / ExtraBold subset, 합계 약 1.04 MB) — Pretendard OFL-1.1 (npm `pretendard@1.3.9`) 출처. PRD §9 q6 옵션 B (self-host)
- **AC 결과** (QA 리포트 `docs/qa/finsight-redesign-pr2.md`):
  - §5.2 AC-V8-8~11 4/4 pass, §5.7 AC-COMMON (적용 6건) 전부 pass, §5.8 AC-GATE-1·2 pass / GATE-3 N/A
  - 라운드트립 10/10 (5 케이스 × 375 / 1280 뷰포트), 에지 3/3, Pretendard 5/5
- **다음 작업 후보** (PR 본문 + QA 머지 게이트 부록 기반, 절대적 지시 아님):
  - **PR3** `feat(layout): finsight shell` — Sidebar 6 메뉴 확장 + Header glass (backdrop-blur + bg-surface/80) + 모바일 BottomNav 신설. PR3 안 신설 합성 토큰 후보 `.bottom-nav` / `.bottom-nav-item-active` / `.header-glass`. DESIGN.md v8 의 `bottom-nav*` / `navbar*` 토큰을 `components.css @layer components` 로 흡수
  - **Pretendard 운영 모니터링** — woff2 4 weight self-host 가 Vercel 정적 자산으로 묶임. LCP 영향 + next/font size-adjust fallback 동작 확인
  - **handoff-append workflow 보강** — `grep -q "(#${PR_NUMBER})"` 가 본문 인용 안 `(#27)` 같은 과거 PR 부분일치를 false-positive 매칭. 차후 `^### .*\(#${PR_NUMBER}\)$` 패턴으로 좁히기

### 2026-05-23 — feat(layout): finsight shell (PR3/9 finsight-redesign) (#28)

- **slug**: `finsight-redesign-pr3-layout-shell` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/28
- **요약**: feat(layout): finsight shell (PR3/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > - finsight-redesign 시리즈 9개 중 **3번째 PR — 글로벌 셸**. base = PR2 (#27) 머지 직후 main (`55a707d`).
  > - 6 메뉴 단일 정의 (`components/layout/navItems.ts`) + glass `Header` + 6 메뉴 `Sidebar` + 모바일 `BottomNav` + `not-found` 도입.
  > - 라우트 그룹 `(workbench)` → `(main)` rename (URL 영향 0건, AC-L-5 RESOLVED).
  > 
  > ## 변경 파일
  > 
  > | 영역 | 파일 | 라인 |
  > |---|---|---|
  > | 의존성 | `package.json` / `package-lock.json` | +11 |
  > | 라우트 그룹 rename | `app/(workbench)/{layout,page}.tsx` → `app/(main)/{layout,page}.tsx` | 0 변경 (rename + layout 본문 갱신 50줄) |
  > | 셸 구현 | `app/(main)/layout.tsx` / `app/components.css` / `app/not-found.tsx` / `app/(main)/not-found.tsx` / `components/layout/{Header,Sidebar,BottomNav,navItems}.{tsx,ts}` / `lib/copy/layout/navCopy.ts` | +415 / -33 |
  > 
  > 총 **~415 신규 + 33 변경 라인** (PRD §8 추정 200~350L 와 정합 — not-found 2개 + 합성 토큰 7개로 약간 상회).
  > 
  > ## AC 자가검증
  > 
  > ### AC-L-1 Sidebar 6 메뉴 + 활성 강조 — PASS
  > - `components/layout/navItems.ts` — `/dashboard`/`/`/`/analyze`/`/market`/`/watchlist`/`/profile` 6 항목.
  > - `isNavItemActive(itemPath, pathname)` — `/` 정확 일치, 나머지 prefix 매칭.
  > - `Sidebar.tsx` → `aria-current=\"page\"` + `sidebar-nav-item-active` (bg-accent-vivid-soft text-accent-vivid).
  > 
  > ### AC-L-2 Header glass + sticky — PASS
  > - `Header.tsx` — `header-glass sticky top-0 z-[50]`.
  > - `.header-glass { backdrop-blur-md bg-surface/80 border-b border-border-line h-navbar-h }`.
  > - FinSight wordmark — Activity 로고 + 텍스트 (text-accent-vivid + text-nav-brand). 데스크탑 `lg:invisible` 로 사이드바 brand 와 시각 중복 회피.
  > 
  > ### AC-L-3 BottomNav 모바일만 + useBreakpoint().isMobile — PASS
  > - `BottomNav.tsx` — `if (!isMobile) return null;` (조기 반환).
  > - `window.innerWidth` / `window.matchMedia` 직접 호출 0건: `git grep -nE \"window\\.innerWidth|window\\.matchMedia\" -- components/ hooks/` → useBreakpoint.ts 외 0건.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR4 (mock 데이터 폴더 + recharts 의존성)** — 본 PR3 후 곧바로 진입. `lib/mock/{dashboard,home,market,watchlist,profile}/*.ts` + `recharts@latest` 추가. PR3 의 navItems path 와 폴더명 매핑 그대로 활용.
  - **워크벤치 history/favorites 잔존 코드 (PR5 정리)** — `components/layout/{Navbar,SidebarContent,MobileDrawer,FavoriteToggle,SidebarItem,workbenchEvents}.tsx` 가 PR3 의 layout 에서 mount 해제됐으나 파일 상태로 남음. PR5 의 `/analyze` 라우트 이전 시 함께 정리.
  - **font 최적화 모니터링 (선택)** — Pretendard 1.07 MB 자체는 `display: swap` 으로 LCP 무영향이지만, 후속 PR9 머지 후 `finsight-redesign-final` 점검 시 lighthouse 실측 1회 권장.

### 2026-05-23 — feat(mock): 5 도메인 mock 데이터 + recharts (PR4/9 finsight-redesign) (#29)

- **slug**: `finsight-redesign-pr4-mock-data` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/29
- **요약**: feat(mock): 5 도메인 mock 데이터 + recharts (PR4/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - 시안 (`Stock and Coin Analysis App/`) 의 인라인 mock 5 화면 분량을 본 저장소 컨벤션 안에서 `lib/mock/<domain>/<file>.ts` 의미 단위 분할 표준 (PRD §3.4) 으로 이식. 5 도메인 (dashboard / home / market / watchlist / profile) × 의미 단위 18 mock 파일.
  > - 각 mock 은 `lib/types/<domain>/*.ts` 도메인 타입 (총 18 신규 타입 파일) import 해 작성. 사용자 노출 한글 카피 0건 — 모두 `lib/copy/<domain>/*.ts` 9 파일 (라벨 / placeholders / tooltips / buttons) 의 카피 키 (`labelKey` / `bodyKey` / `summaryKey` / `displayKey` / `syncedAtKey`) 로 분리.
  > - `recharts@3.8.1` 추가 (PR3 의 `lucide-react@1.16.0` 정합). 시안의 motion / framer / canvas-confetti / Radix 풀세트 등 비도입 — 의존성 추가 1건.
  > - `docs/rules/frontend.md` 의 도메인 한 뎁스 절에 mock 폴더 위치 + 카피 키 룰 + `lib/copy/<domain>/` 절 갱신 (PR3 인계 흡수 — `lib/copy/layout/` 도메인 정합 명시).
  > 
  > ## 파일 구조 표 (도메인 × 의미 단위)
  > 
  > | 도메인 | mock 파일 | types 파일 | copy 파일 |
  > |---|---|---|---|
  > | dashboard | portfolio / holdings / fearGreed / marketSnapshot (4) | 동일 4 | labels / tooltips (2) |
  > | home | currentAsset / searchOptions / priceChart / aiAnalysis / marketStats / technicalIndicators / news / timeframes (8) | 동일 8 | labels / placeholders / tooltips (3) |
  > | market | themes / indices (2) | 동일 2 | labels (1) |
  > | watchlist | items (1) | 동일 1 | labels (1) |
  > | profile | user / exchanges / menuItems (3) | 동일 3 | labels / buttons (2) |
  > | **합계** | **18** | **18** | **9** |
  > 
  > 총 변경: 5 commit / +1,021 / -3 (의존성 자동 lock 파일 포함 ~1,418L).
  > 
  > ## 의존성
  > 
  > - `recharts@3.8.1` 추가 — peer dep react ^16.8~19 / react-dom ^16~19 정합 (현재 react 19).
  > - `lucide-react@1.16.0` — PR3 에서 이미 도입. 본 PR4 무수정.
  > 
  > ## AC 검증 표
  > 
  > ### AC-M (PRD §5.4)
  > 
  > | AC | 명령 / 실측 | 판정 |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR5** `feat(analyze): workbench 라우트 이전` — 본 PR4 머지 직후 분기. 현 `app/(main)/page.tsx` (워크벤치) → `app/(main)/analyze/page.tsx`. PR3 QA 부록 #7.2 의 layout 잔존 6 파일 (Navbar / SidebarContent / MobileDrawer / FavoriteToggle / SidebarItem / workbenchEvents) 동반 정리. 워크벤치 도메인 폴더명 (`components/workbench/`, `hooks/workbench/`, `lib/api/workbench/`) 은 PRD §9 q5 결정대로 유지.
  - **PR6** `feat(home): 분석 대시보드 (mock)` — 본 PR4 의 `lib/mock/home/*` + `lib/copy/home/*` 활용. recharts `AreaChart` 가 가격 차트 진입점.
  - **운영 모니터링** — recharts 도입에 따른 bundle size 변화는 PR6 (실 import 시점) 에서 First Load JS 재측정. lighthouse 실측은 PR9 머지 후 `finsight-redesign-final` 단계.

### 2026-05-23 — feat(analyze): /analyze 라우트 이전 + layout 잔존 정리 (PR5/9 finsight-redesign) (#30)

- **slug**: `finsight-redesign-pr5-analyze-route` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/30
- **요약**: feat(analyze): /analyze 라우트 이전 + layout 잔존 정리 (PR5/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - 워크벤치 라우트 `/` → `/analyze` 이전. `app/(main)/page.tsx` 삭제 → PR6 가 Home AnalysisDashboard 로 신설 예정. 현 시점 `/` 는 PR3 의 (main)/not-found 노출.
  > - 워크벤치 도메인 부속 2 파일 `components/workbench/` 로 동반 이전: `FavoriteToggle.tsx`, `workbenchEvents.ts`. 도메인 한 뎁스 룰 정합.
  > - PR3 layout 잔존 4 파일 삭제 (호출처 0 검증): `Navbar.tsx`, `SidebarContent.tsx`, `MobileDrawer.tsx`, `SidebarItem.tsx`.
  > - 워크벤치 도메인 폴더명 `workbench` 유지 (PRD §9 q5 RESOLVED 옵션 A).
  > 
  > 시리즈 9 개 중 5 번째. base = main `97476ff` (PR4 머지 직후).
  > 
  > ## 변경 파일 (7 + 1 보정 commit)
  > 
  > | 변화 | 파일 | 비고 |
  > | --- | --- | --- |
  > | rename (mv) | `app/(main)/page.tsx` → `app/(main)/analyze/page.tsx` | git mv 로 history 보존 + import 경로 2건 갱신 |
  > | rename (mv) | `components/layout/FavoriteToggle.tsx` → `components/workbench/FavoriteToggle.tsx` | 워크벤치 도메인 안으로 |
  > | rename (mv) | `components/layout/workbenchEvents.ts` → `components/workbench/workbenchEvents.ts` | 워크벤치 도메인 안으로 |
  > | delete | `components/layout/Navbar.tsx` (64L) | PR3 에서 `Header.tsx` 로 교체됨, 호출처 0 |
  > | delete | `components/layout/SidebarContent.tsx` (111L) | PR3 에서 `Sidebar.tsx` 로 흡수됨, 호출처 0 |
  > | delete | `components/layout/MobileDrawer.tsx` (149L) | PR3 에서 `BottomNav.tsx` 로 교체됨, 호출처 0 |
  > | delete | `components/layout/SidebarItem.tsx` (61L) | 구 사이드바 아이템, 호출처 0 |
  > 
  > 합계: 신설 1, 삭제 4 (385 라인), 이동 3.
  > 
  > 처리 후 `components/layout/` 잔여 4 파일: `Header.tsx` / `Sidebar.tsx` / `BottomNav.tsx` / `navItems.ts` (모두 PR3 글로벌 셸).
  > 
  > ## Test plan
  > 
  > AC-A-1 `/analyze` 진입 시 워크벤치 화면 그대로 렌더 — pass
  > - 검증: `curl http://localhost:3000/analyze` → HTTP 200, SSR HTML 에 ticker-header / SearchPanel / InputPanel / ResultGroup empty state / footer 면책 문구 모두 정상 마크업.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR6 (Home AnalysisDashboard mock 화면)** — base = 본 PR5 머지 직후 main. `app/(main)/page.tsx` 신설 + `lib/mock/home/*` 8 파일 소비 + recharts 첫 사용 (`<AreaChart>` for `priceChart.ts`). 시안 (Stock and Coin Analysis App) AnalysisDashboard 컴포넌트 톤 정합. 사이드바 / BottomNav 의 "홈" (`/`) 메뉴가 본 화면 활성화.
  - **운영 모니터링** — `/analyze` 라우트 진입 사용자의 기존 즐겨찾기 (`/` 북마크) → 404 not-found 진입 (의도된 임시 상태). PR6 머지 후 자동 해소.
  - **관련 slug** — `finsight-redesign` (시리즈 9개 중 5/9 완료).

### 2026-05-23 — feat(home): AnalysisDashboard mock (PR6/9 finsight-redesign) (#31)

- **slug**: `finsight-redesign-pr6-home-analysis` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/31
- **요약**: feat(home): AnalysisDashboard mock (PR6/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - `/` 라우트에 시안 정합 AnalysisDashboard mock 화면 신설 — 9 컴포넌트 (`components/home/*`) + `app/(main)/page.tsx`.
  > - recharts 첫 사용자 — `<AreaChart>` 가격 추이 차트. v8 토큰 (signal-up/down, asset-stock/coin, gradient-ai, font-display) 시각 cascade.
  > - 시리즈 9 개 PR 중 6 번째 (PR6/9). PRD: `docs/prd/finsight-redesign.md` §3.3 PR6 + §5.6 AC-PAGE-1~8.
  > 
  > ## 변경 파일
  > 
  > | 파일 | 라인 | 역할 |
  > |---|---|---|
  > | `components/home/SearchToggle.tsx` | 67 | 주식/코인 세그먼트 토글 (asset 토큰 cascade) |
  > | `components/home/SearchBar.tsx` | 49 | 검색 input + 돋보기 아이콘 (placeholder 분기) |
  > | `components/home/AssetHeader.tsx` | 115 | 자산 헤더 (가격·등락·즐겨찾기) — useState 즐겨찾기 |
  > | `components/home/TimeframeChips.tsx` | 53 | 1D~ALL 6 칩 활성 강조 |
  > | `components/home/PriceChart.tsx` | 129 | recharts AreaChart — signal-up stroke + gradient fill |
  > | `components/home/AiAnalysisCard.tsx` | 130 | card-ai + gradient-ai-bg + 3-up 미니카드 |
  > | `components/home/MarketStatsCard.tsx` | 84 | 시장 정보 6-grid + native tooltip |
  > | `components/home/TechnicalIndicatorsCard.tsx` | 116 | RSI 그라데이션 게이지 + MACD + 볼린저 |
  > | `components/home/NewsCard.tsx` | 65 | 뉴스 3건 리스트 + 출처 badge-info |
  > | `components/home/HomeDashboard.tsx` | 130 | client 셸 — 9 컴포넌트 그리드 조합 |
  > | `app/(main)/page.tsx` | 50 | server entry — 7 mock import → HomeDashboard props |
  > 
  > **총 1,039 라인 (PRD §8.1 추정 400~700L 대비 +49% — 컴포넌트 헤더 주석 + 카피 매핑 분리 비중 큼)**.
  > 
  > ## 클라이언트/서버 분리 결정
  > 
  > | 컴포넌트 | 분리 | 사유 |
  > |---|---|---|
  > | `app/(main)/page.tsx` | server | mock import 전용 + props 전달만 |
  > | `HomeDashboard` | client | 검색 토글·검색어·타임프레임 3 useState 호스트 |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR7 (Dashboard 포트폴리오)** — `app/(main)/dashboard/page.tsx` 신설 + `components/dashboard/*` 도메인 폴더 + `lib/mock/dashboard/*` (PR4 정착) 활용. 본 PR6 의 `components/home/` 패턴 + 합성 토큰 (`card-hero`, `badge-signal-*`, `badge-asset-*`) 재활용.
  - **bundle size 모니터링** — PR7~9 누적 시 First Load JS / 라우트 추적. 300 KB 초과 라우트 발생 시 dynamic import 도입 검토.
  - **PriceChart 색 토큰화** — recharts API 가 Tailwind class 미수용. 후속 PRD 에서 `getComputedStyle(document.documentElement).getPropertyValue('--color-signal-up')` 같은 동적 흡수 검토 (현 PR6 무관).

### 2026-05-24 — feat(market): 시장 동향 화면 mock (PR8/9 finsight-redesign) (#35)

- **slug**: `finsight-redesign-pr8-market` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/35
- **요약**: feat(market): 시장 동향 화면 mock (PR8/9 finsight-redesign)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - 시리즈 9개 중 8번째 PR — `/market` 라우트를 채워 catch-all (`[...not_found]`) 을 자연 무력화.
  > - 시안 `Stock and Coin Analysis App/src/app/components/MarketTrends.tsx` 의 정보 아키텍처 (좌: 인기 테마/섹터, 우: 주요 지수) 를 본 저장소 컨벤션 + v8 토큰 cascade 안에서 재구성.
  > - BFF 호출 0건, 차트 0건 (recharts 미사용 — server bundle parity with `/dashboard` 56K).
  > 
  > ## 컴포넌트 표
  > 
  > | 파일 | 라인 수 | 역할 |
  > |---|---|---|
  > | `components/market/ThemesCard.tsx` | 65 | 인기 테마/섹터 4건 — 테마명 + 한국식 등락률 + 대표 종목 ("엔비디아, 마이크로소프트, 루닛 등"), hover → border-accent-vivid |
  > | `components/market/IndicesCard.tsx` | 59 | 주요 지수 6건 2-col grid — 지수명 + 값(tabular-nums) + 변동률 + TrendingUp/Down 아이콘 |
  > | `components/market/MarketPage.tsx` | 56 | 셸 컴포저 — 페이지 타이틀(Compass + "시장 동향") + 2-col 그리드 |
  > | `app/(main)/market/page.tsx` | 36 | 라우트 — server component, mock props 전달 |
  > | **합계** | **216** | |
  > 
  > ## v8 토큰 활용 표
  > 
  > | 위치 | 시안 (Tailwind 기본) | v8 토큰 cascade |
  > |---|---|---|
  > | 카드 셸 | `bg-white border-slate-200 rounded-2xl p-6 shadow-sm` | `.card` 합성 토큰 |
  > | 페이지 타이틀 아이콘 (Compass) | `text-blue-500` | `text-accent-vivid` |
  > | 인기 테마 헤더 아이콘 (Flame) | `text-orange-500` | `text-accent-vivid` |
  > | 주요 지수 헤더 아이콘 (TrendingUp) | `text-emerald-500` | `text-accent-vivid` |
  > | 변동률 상승 | `text-red-500` | `signal-up-text` (한국식 빨강) |
  > | 변동률 하락 | `text-blue-500` | `signal-down-text` (한국식 파랑) |
  > | 테마 항목 셸 hover | `hover:border-blue-200` | `hover:border-accent-vivid` |
  > | 지수 박스 배경 | `bg-slate-50` | `bg-surface-muted` |
  > | 숫자 표기 | (없음) | `tabular-nums` 일관 |
  > | 폰트 | Inter | Pretendard cascade (전역) |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR9 (Watchlist + Profile)** 진입 — 본 PR8 의 `components/market/` 도메인 한 뎁스 패턴 + mock 직접 import 패턴 재활용. `lib/mock/watchlist/items.ts` + `lib/mock/profile/{user, exchanges, menuItems}.ts` (PR4 정착) 활용. Watchlist 는 12-col grid 테이블 (`md:grid-cols-12`), Profile 은 카드 + 거래소 연동 placeholder.
  - PR9 머지 후 시리즈 종료 단계 — PRD 기반 최종 점검 (§3.8 합의 절차).

### 2026-05-24 — chore(meta): favicon + title FinSight + recharts width fix (#34)

- **slug**: `finsight-meta-polish` · **author**: @HY0118 (backfill — qa-passed workflow grep 패턴 false-negative 로 자동 append 누락)
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/34
- **요약**: chore(meta): favicon + title FinSight + recharts width fix
- **현재 상태**: main 머지됨 (`mergedAt 2026-05-24T03:42:56Z`)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > finsight-redesign 시리즈 외부 별도 chore PR. PRD 없이 다음 3건 묶음.
  > 
  > - **A. recharts `width(-1) height(-1)` 경고 해소** — `components/home/PriceChart.tsx` 의 ResponsiveContainer 부모 div 에 `min-w-0` 추가. recharts 경고 메시지가 직접 제안한 권장 해법 (`add a minWidth(0)`). 시각 무회귀.
  > - **B. metadata title 갱신** — `app/layout.tsx` 의 `title` 이 이전 브랜드명 `TradingSignalEngine` 잔존 → `FinSight`. description (`AI 기반 매수·매도 판단 보조 서비스`) 은 도메인 정합 — 유지.
  > - **C. favicon 신설** — `app/icon.tsx` (`next/og` ImageResponse 동적 생성). 사이드바 brand badge 와 정합 (accent-vivid `#1d4ed8` 배경 + 흰 lucide Activity).
  > 
  > ## 변경 파일
  > 
  > | 파일 | 변경 | 라인 |
  > |---|---|---|
  > | `components/home/PriceChart.tsx` | `min-w-0` 추가 | +1 / -1 |
  > | `app/layout.tsx` | title `FinSight` | +1 / -1 |
  > | `app/icon.tsx` | 신설 | +43 |
  > 
  > 총 3 파일 / +45 -2.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR8** `feat(market): 시장 동향` 진입 — `app/market/page.tsx` + 인기 테마/섹터/주요 지수 카드.
  - 본 PR 의 favicon hex `#1d4ed8` 은 토큰 동기화 시 갱신 필요 (주석 명시) — 토큰 변경 시 grep `app/icon.tsx`.
  - SSR 측면 recharts 경고는 별도 작업 후보 (dynamic import ssr:false 리팩터, PriceChart 외 다른 차트 도입 시).

### 2026-05-24 — feat(watchlist, profile): 관심종목 + 마이페이지 (PR9/9 finsight-redesign) (#36)

- **slug**: `finsight-redesign-pr9-watchlist-profile` · **author**: @HY0118 (backfill — qa-passed workflow grep 패턴 false-negative 로 자동 append 누락)
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/36
- **요약**: feat(watchlist, profile): 관심종목 + 마이페이지 (PR9/9 finsight-redesign 시리즈 종료)
- **현재 상태**: main 머지됨 (`mergedAt 2026-05-24T04:31:35Z`), finsight-redesign 시리즈 9 PR 종료
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - 시리즈 9 PR 중 **마지막** (`PR9/9`). `/watchlist` + `/profile` 두 라우트 신설로 6 메뉴 라우트(`/`, `/dashboard`, `/analyze`, `/market`, `/watchlist`, `/profile`) 모두 정착.
  > - PRD `docs/prd/finsight-redesign.md` §3.3 PR9 + §5.6 AC-PAGE-1~8 정합. 시안 `Stock and Coin Analysis App/src/app/components/{Watchlist,Profile}.tsx` 정보 아키텍처를 본 저장소 컨벤션(`docs/rules/frontend.md`) + v8 토큰으로 재구성.
  > - 분량 589L (Watchlist 215L + Profile 374L) — PRD §9 q7 RESOLVED 의 600L 분할 게이트 통과 (단일 PR 유지).
  > 
  > ## 변경 파일
  > 
  > | 파일 | 라인 | 도메인 |
  > | --- | --- | --- |
  > | `components/watchlist/WatchlistPage.tsx` | 54 | Watchlist |
  > | `components/watchlist/WatchlistTable.tsx` | 60 | Watchlist |
  > | `components/watchlist/WatchlistRow.tsx` | 72 | Watchlist |
  > | `app/(main)/watchlist/page.tsx` | 29 | Watchlist |
  > | `components/profile/ProfilePage.tsx` | 57 | Profile |
  > | `components/profile/ProfileCard.tsx` | 87 | Profile |
  > | `components/profile/ConnectedExchangesCard.tsx` | 89 | Profile |
  > | `components/profile/SettingsMenuCard.tsx` | 104 | Profile |
  > | `app/(main)/profile/page.tsx` | 37 | Profile |
  > | **합계** | **589** | |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **`docs/qa/finsight-redesign-final.md` 작성** — QA 가 시리즈 종료 후 PRD 기반 최종 점검 리포트 작성 (AC-PAGE-1~8 × 6 화면 + AC-COMMON-1~9 + AC-GATE-1·2·3 full matrix).
  - **cleanup PR (별도 slug)** — 위 머지 게이트 인계 5건 처리: HANDOFF 백필 + `NOT_FOUND_HOME_CTA`/root `not-found.tsx` 결정 + 시안 폴더 제거 + `[...not_found]` 검토 + `@next/bundle-analyzer` 도입.
  - **Vercel 연동** — 사용자 메모 `project_vercel-deferred.md` 정합, 시리즈 완료 후 별도 chore.

### 2026-05-28 — feat(api,bff): KIS+DART 클라이언트 + 5 BFF 라우트 인프라 (PR-A/3 stock-api-integration) (#38)

- **slug**: `stock-api-integration` (PR-A/3) · **author**: @HY0118 (backfill — qa-passed workflow grep 패턴이 다른 레포 trading-signal-engine PR #38 헤더와 false-positive 매칭으로 자동 append 누락. 후속 chore: PR URL anchor 기반 grep 패턴 추가 강화)
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/38
- **요약**: KIS Developers (모의 50190357) + OpenDART 조회 BFF 인프라 정착. `lib/api/kis/` 10파일 + `lib/api/dart/` 6파일 + `app/api/{stock,disclosure}/` 5라우트 + queryKeys/queryConfig 확장 + 단위 테스트 21건 PASS. PRD §8.2 3분할 (A/B/C) 중 첫 PR.
- **현재 상태**: review-changes-requested → HANDOFF 누락 해소 후 review-approved 진입 예정. PR-B (hooks + Profile 종단) 미진입.
- **PR 본문 발췌**:
  > PRD §9 [RESOLVED] 7건 반영:
  > - q1: FDR 제외, q2: 토큰 메모리 + 토글 인터페이스, q3: 수동 시드 350개, q4: 주문 placeholder + README, q5: TTL 표 그대로, q6: 3분할 A/B/C, q7: substring fuzzy 검색.
  >
  > 회귀 차단 의무:
  > - R2 `bstp_kor_isnm` = 업종명. 종목명은 `hts_kor_isnm` → `prdt_name` → ticker 우선순위 (mappers.ts + AC-10 단위 테스트 4 케이스).
  > - R1 토큰 single-flight (Promise dedupe, AC-6 #4 5건 동시 → 발급 1회).
  > - 모의 도메인 포트 `:29443` 명시.
  > - 주문 라우트 미생성 + `lib/api/kis/index.ts` 주석 + `README.md` 다중 게이트 (비밀번호 재확인 / dry-run / 금액 상한 / audit log).
  >
  > AC 9건 PASS (AC-1/2/3/6/7/10/12/13/14). AC-4/5/8/9/11/15 는 PR-B/PR-C 범위.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR-B (다음 진입)** — `hooks/stock/` + `hooks/disclosure/` 5개 useQuery 훅 + Profile 도메인 4 컴포넌트 mock → 훅 종단 전환 (AC-8 "이게 됐다" 단일 증거).
  - **PR-C (PR-B 머지 후)** — Dashboard / Market / Watchlist 어댑터 + 훅 신설 (화면 mock 유지). 후속 한 도메인씩 화면 전환 PR 들의 base.
  - **chore: handoff-append.yml grep 패턴 추가 강화** — PR URL anchor 기반 추가 패턴 (line 274 `**PR**: https://.../pull/${PR_NUMBER}`) 으로 본 false-positive 회피. reviewer note N (후속).
  - **chore: BFF route 5개 중복 추출** — `withTimeout` + `jsonWithDataSource` + `mapErrorToResponse` ~200L 중복을 `lib/api/utils/bffResponse.ts` 로 추출. reviewer note N-2.
  - **chore: `symbols.json` 350개 풀 시드 확장** — 1차 ~100개 시드 → KOSPI 200 + KOSDAQ 150 풀 시드 (DART CORPCODE.xml 기반 검증).
  - 1~2주 운영 후 §6.1 TTL 수치 재조정 (`X-Data-Source` 헤더 분포 기반).
  - PRD `signal-algorithm` 진입 — 본 PR-A 의 시세 + 공시 데이터를 입력으로 시그널 계산.
  - PRD `stock-order-integration` 진입 시 `lib/api/kis/README.md` 의 다중 게이트 체크리스트 적용.
  - Vercel 연동 — 사용자 메모 `project_vercel-deferred.md` 정합, 시리즈 종료 후 별도 chore.

### 2026-05-29 — feat(profile): /profile/[ticker] 종목 상세 + stock/disclosure 훅 (PR-B/3 stock-api-integration) (#39)

- **slug**: `stock-api-integration` (PR-B/3) · **author**: @HY0118 (backfill — handoff-append.yml grep 패턴이 다른 레포 trading-signal-engine PR #39 헤더 `### 2026-05-05 — docs(qa): handoff-session-notes 리포트 backfill (#39)` 와 또 false-positive 매칭. PR-A 와 동일 패턴 두 번째 발생. 후속 chore `handoff-append.yml grep 패턴 강화 (PR URL anchor)` 우선순위 ↑)
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/39
- **요약**: PR-A 정착 BFF 인프라 위에 도메인 훅 5개 + Profile 도메인 종단 전환 (4 컴포넌트 mock → 훅, AC-8 "이게 됐다" 단일 증거 통과). `/profile/[ticker]` 동적 라우트 신설 + 기존 `/profile` (마이페이지) 자연 공존.
- **현재 상태**: review-changes-requested → HANDOFF 누락 해소 후 review-approved 진입 예정. PR-C (Dashboard/Market/Watchlist 어댑터) 미진입.
- **PR 본문 발췌**:
  > 신설 16 파일:
  > - BFF 클라이언트 5건 (`lib/api/{stock,disclosure}/*.ts`)
  > - 도메인 훅 5건 (`hooks/{stock,disclosure}/useQuery*.ts`) — `queryKeys.{stock,disclosure}.*` factory + `queryConfig.*` TTL 사용
  > - Profile 도메인 화면 5건 + 동적 라우트 (`app/(main)/profile/[ticker]/page.tsx` + `components/profile/{StockProfilePage,StockHeader,StockDailyChart,CompanyOverview,DisclosureList}.tsx`)
  > - 카피 단일 진실 원천 (`lib/copy/profile/stockDetail.ts`)
  > - 단위 테스트 6건 (PR-A 21 + PR-B 6 = 27건 PASS)
  >
  > AC-8 종단 검증:
  > - `/profile/005930` 진입 → 4 BFF (`/api/stock/price`, `/api/stock/daily`, `/api/disclosure/company`, `/api/disclosure/list`) 모두 200 + `X-Data-Source: kis/dart` 실데이터 응답.
  > - 삼성전자 현재가 299,500 + 30 candle 차트 + 기업개황 (DART `삼성전자(주)`) + 공시 5건 렌더.
  >
  > `bstp_kor_isnm` 회귀 차단 자연 확인:
  > - KIS 모의 환경 `hts_kor_isnm` 빈 응답 → mappers.ts `extractStockName` 우선순위 #3 (ticker fallback) 적용 → 화면에는 "005930" 표시 + DART `corpName` 으로 정식명 보완. "전기·전자" (업종명) 절대 미노출.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR-C (다음 진입)** — Dashboard / Market / Watchlist 어댑터 + 훅 신설 (화면 mock 유지). 후속 한 도메인씩 화면 전환 PR 들의 base.
  - **chore: handoff-append.yml grep 패턴 추가 강화 (우선순위 ↑)** — PR-A 후속 권고였으나 PR-B 에서 동일 false-positive 두 번째 발생으로 우선순위 상승. PR URL anchor (`**PR**: https://.../pull/${PR_NUMBER}`) 기반 패턴 추가.
  - **chore: recharts 토큰 중앙화** — reviewer note. PR-B 의 StockDailyChart 가 `lib/charts/*` 추출 가능.
  - **chore: `[ticker]` 동적 라우트 가드** — reviewer note. ticker 6자리 정규식 검증 미들웨어 추가 가능.
  - 1~2주 운영 후 §6.1 TTL 수치 재조정.
  - KIS 모의 (vts) 환경 `hts_kor_isnm` 빈 응답 케이스 — 실전 (prod) 환경에서 실응답 확인 후 mappers 우선순위 재검토 가능성.
  - `/profile/[ticker]` 화면 IA 확장 (검색 / 타임프레임 chip / 사이드 통계 / 뉴스) — 후속 PRD.

### 2026-05-29 — feat(api,hooks): dashboard/market/watchlist 어댑터 + 훅 (PR-C/3 stock-api-integration) (#40)

- **slug**: `stock-api-integration` (PR-C/3, **시리즈 종료**) · **author**: @HY0118 (backfill — handoff-append.yml grep 패턴이 본 저장소의 옛 PR #40 헤더 `### 2026-05-05 — docs(handoff) (#40)` 와 자체 false-positive 매칭. PR-A/B 가 다른 레포 충돌이었던 반면 PR-C 는 같은 레포 옛 entry 와 충돌 — **세 번째 발생, 패턴 다양화**. 후속 chore `handoff-append.yml grep 패턴 강화 (PR URL anchor)` 절대 우선순위)
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/40
- **요약**: PRD §3.5 후반부 — Dashboard / Market / Watchlist 3 도메인 어댑터 (`lib/api/<domain>/holdings|indices|list.ts`) + 훅 (`hooks/<domain>/useQuery*.ts`) 신설. 화면 mock 유지 (시각 변경 0). 후속 한 도메인씩 화면 전환 PR 들의 base. **`stock-api-integration` 3 PR 시리즈 종료**.
- **현재 상태**: review-approved → HANDOFF 백필 후 머지 예정. 시리즈 종료.
- **PR 본문 발췌**:
  > 신설 9 파일 (어댑터 3 + 훅 3 + 테스트 3):
  > - `lib/api/{dashboard,market,watchlist}/{holdings,indices,list}.ts` — PR-A 의 `fetchStockPriceClient` 반복 호출 + `Promise.all` 병렬. 빈 배열 입력 시 즉시 빈 배열 반환.
  > - `hooks/{dashboard,market,watchlist}/useQuery*.ts` — `useQuery` + 어댑터 + `queryKeys.*` factory + `queryConfig.*` TTL.
  > - 단위 테스트 7건 (PR-A 21 + PR-B 6 + PR-C 7 = 34 PASS).
  >
  > 미변경 (의도, PRD AC-11 정합):
  > - `app/(main)/{dashboard,market,watchlist}/page.tsx` mock import 그대로.
  > - `components/{dashboard,market,watchlist}/*` 그대로.
  > - Signals 도메인 어댑터 미신설 (PRD 명시 — 후속 PRD `signal-algorithm` 영역).
  >
  > AC 15/15 PASS (QA), `/signals` 404 는 git log 전체 히스토리에 page 파일 0 hit 으로 의도된 미구현 확정 (회귀 아님).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Dashboard 화면 mock → 실데이터** — `useQueryHoldings` import + 보유 종목 ticker 영구화 결정 (localStorage / BE). 한 도메인 한 PR.
  - **Market 화면 mock → 실데이터** — `useQueryIndices` + 해외 지수 확장 결정. KIS 시장지수 매퍼 정밀화.
  - **Watchlist 화면 mock → 실데이터** — `useQueryWatchlist` + localStorage 영구화. 사용자 ticker IA 정립.
  - **PRD `signal-algorithm`** — Signals 도메인 시그널 알고리즘. 본 시리즈의 시세 + 공시 데이터 입력.
  - **chore: handoff-append.yml grep 패턴 강화 (절대 우선순위)** — 세 번 발생, 패턴 다양화 (다른 레포 PR #38/#39 + 자체 레포 옛 PR #40). PR URL anchor (`**PR**: https://.../pull/${PR_NUMBER}$`) 기반 패턴 추가 chore PR.
  - 1~2주 운영 후 §6.1 TTL 수치 재조정 — Vercel 연동 + `X-Data-Source` 헤더 분포 수집 기반.
  - **PRD `stock-order-integration`** — 사용자 의지 + 실전계좌 (72245021) 다중 게이트 (`lib/api/kis/README.md` 체크리스트 적용).
  - **PRD `realtime-quote-websocket`** — 폴링 → KIS WebSocket 30+ 채널 전환.
  - Vercel 연동 — 사용자 메모 `project_vercel-deferred.md` 정합, 본 시리즈 종료 후 별도 chore.

### 2026-05-28 — chore(workflow): handoff-append grep 패턴을 PR URL anchor 로 강화 (#41)

- **slug**: `chore/handoff-grep-pr-url-anchor` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/41
- **요약**: chore(workflow): handoff-append grep 패턴을 PR URL anchor 로 강화
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > `stock-api-integration` 시리즈 3 PR (#38 / #39 / #40) 모두에서 동일한 false-positive 로 인한 자동 entry 누락 사례 3회 발생. workflow 의 PR 중복 검출 grep 패턴을 **PR URL line anchor** 기반으로 강화.
  > 
  > ## 문제
  > 
  > 기존 grep 패턴:
  > 
  > ```bash
  > grep -qE "^### .*\(#${PR_NUMBER}\)\$" docs/HANDOFF.md
  > ```
  > 
  > - entry 헤더 라인의 PR 번호만 매칭.
  > - 다른 레포 (`trading-signal-engine`) backfill entry 들이 같은 번호 (#38/#39/#40) 헤더 형식으로 본 저장소 `docs/HANDOFF.md` 에 포함되어 있어 신규 entry 추가가 **항상 false-positive skip**.
  > - PR-A/B/C 모두 수동 백필로 reviewer 차단 사유 해소 후 머지 — 매 PR 마다 동일한 백필 부담.
  > 
  > 옛 entry 3건 (line 268 / 310 / 341):
  > 
  > ```
  > ### 2026-05-05 — docs: SESSION_NOTES.md 신설 + 직전·당일 세션 backfill (#38)
  > - **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/38
  > 
  > ### 2026-05-05 — docs(qa): handoff-session-notes 리포트 backfill (#39)
  > - **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/39
  > 
  > ### 2026-05-05 — docs(handoff): SESSION_NOTES.md read 의무화 (manager·status·AGENTS) (#40)
  > - **PR**: https://github.com/deeptrading-lab/trading-signal-engine/pull/40
  > ```
  > 
  > → 모두 다른 레포 backfill, 본 레포 PR 과 충돌.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 본 PR 머지 직후 다음 작업 PR 부터 `qa-passed` 라벨 부착 시 HANDOFF 자동 entry 가 백필 부담 없이 추가됨을 자연 검증.
  - 사용자 메모 `reference_handoff-workflow-grep.md` 업데이트 — 새 패턴 (PR URL anchor) 기록. 본 PR 머지 후 별도 작업.
  - 화면 mock → 실데이터 한 도메인씩 PR (Dashboard / Market / Watchlist) 진행 — PRD §10 권고.
  - `symbols.json` 350 풀 시드 확장 chore PR — DART CORPCODE.xml 기반 검증.
  - 후속 PRD `signal-algorithm` / `stock-order-integration` (실전계좌 다중 게이트 의무) / `realtime-quote-websocket` 자연 진입 가능 상태.

### 2026-05-29 — feat(market): 지수 카드 KIS 실데이터 전환 (market-real-data) (#43)

- **slug**: `market-real-data` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/43
- **요약**: feat(market): 지수 카드 KIS 실데이터 전환 (market-real-data)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > `/market` 화면의 **주요 지수 카드**를 하드코딩 mock → KIS `inquire-index-price`(`FHPUP02100000`) **실데이터**로 전환했다. 데이터 계층(KIS 호출·BFF·어댑터·매퍼·테스트)은 직전 api-integration-dev 가 `a4c38af` 로 완료했고, 본 PR 은 **화면/훅 배선 + 상태 처리**를 담당한다.
  > 
  > PRD: [docs/prd/market-real-data.md](docs/prd/market-real-data.md)
  > 
  > ### 변경
  > - **`IndicesCardContainer`(client) 신설** — `useQueryIndices(국내 3종)` 호출 → 로딩 스켈레톤 / 에러(한글 + 재시도) / 빈 / **부분 성공**(3종 중 일부만 와도 렌더) 분기. 커스텀훅 의무화 준수(`useQuery` 직접 import 0).
  > - **표시 변환** — `MarketIndexQuote`(데이터 모델) → `MarketIndex`(표시 모델): `value`→`formatNumber`(천단위 콤마), `changePercent`→`formatPct({ sign: true })`(부호+%), `direction → isUp`. 기존 셀 3요소(지수명·현재가·등락률) 유지 — 신규 필드 0(q6 디자이너 미합류).
  > - **page/MarketPage 배선** — 지수 mock 직접 import 제거. ThemesCard 는 **mock 유지**(q2). 지수 영역만 client 경계.
  > - **`queryConfig.market.indices` staleTime 10s → 30s**(q7=b, 단일 진실 원천 1줄).
  > - 지수 로딩/에러/빈/재시도 한글 카피 추가(`lib/copy/market/labels.ts`).
  > - 표시 모델 mock(`MARKET_INDICES_MOCK`) 제거 — 데이터 모델 `getMockMarketIndices` 만 BFF fallback 으로 유지.
  > - 기존 v8 토큰(`card`/`card-critical`/`signal-up-text`/`skeleton`/`button-secondary`) 재사용, 신규 토큰 도입 0.
  > 
  > ### 변경 파일
  > - `components/market/IndicesCardContainer.tsx`(신규)
  > - `components/market/MarketPage.tsx` · `app/(main)/market/page.tsx`(배선)
  > - `hooks/market/useQueryIndices.ts`(주석 갱신)
  > - `lib/query/queryConfig.ts`(staleTime 30s)
  > - `lib/copy/market/labels.ts`(상태 카피)
  > - `lib/mock/market/indices.ts`(표시 모델 mock 제거)
  > 
  > ## AC 체크
  > 
  > - [x] **AC-1~2** KIS 지수 모듈 + BFF 라우트 + 헤더 — api-integration-dev `a4c38af` 완료(`X-Data-Source`/`X-KIS-Env` 확인).
  > - [x] **AC-3** KIS 직접 호출 없음 — `git grep -n "inquire-index-price" components hooks` → 0(화면/훅 KIS 직접 호출 0).
  > - [x] **AC-4** queryKeys + 커스텀훅 정합 — `useQuery( in components/market` → 0, `useQueryIndices(` in container → 존재, `queryKeys.market.indices` in hook → 존재.
  > - [x] **AC-5** 매퍼 단위 테스트 — `index-price.mappers.test.ts` 7 tests 통과.
  > - [x] **AC-6** mock fallback — 미설정/비prod 시 `getMockMarketIndices` + `X-Data-Source: mock`(route.test.ts).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **해외 지수/환율/코인 트랙(`market-foreign-data` 가칭)** — 본 트랙에서 제거된 4종(S&P 500/NASDAQ/USDKRW/BTC Dominance), 소스 리서치 진행 중.
  - **테마/섹터 실데이터 트랙(`market-themes-data` 가칭)** — ThemesCard mock → 실데이터(q2 후속).
  - 지수 TTL(현 30s) 운영 데이터(`X-Data-Source` 분포) 기반 재조정 chore + 거래량/상승하락 종목수 셀 추가(디자이너 1회 리뷰).

### 2026-05-29 — feat(watchlist): 관심종목 KIS 실데이터 전환 + localStorage 영구화 (watchlist-real-data) (#44)

- **slug**: `watchlist-real-data` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/44
- **요약**: feat(watchlist): 관심종목 KIS 실데이터 전환 + localStorage 영구화 (watchlist-real-data)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 개요
  > `/watchlist` 화면을 mock(server component)에서 **KIS 실데이터(client container + 훅)**로 전환하고, 관심종목 ticker 를 **localStorage 로 영구화**한다. 데이터 계층(`search-stock-info` 호출 + 합성 BFF + 어댑터 재배선)은 직전 api-integration-dev 가 같은 브랜치에 완료(09a194a)했고, 본 PR 은 저장소 격리 + 영구화 훅 + 화면 배선 + 추가/삭제 UX + 상태처리를 얹는다.
  > 
  > PRD: [`docs/prd/watchlist-real-data.md`](../blob/feature/watchlist-real-data/docs/prd/watchlist-real-data.md)
  > 
  > ## 변경 요약
  > - **저장소 격리** `lib/api/watchlist/store.ts` — `readTickers`/`writeTickers`/`hasSeeded`/`markSeeded`. **유일한 localStorage 접근점**(engine DB 교체 경계). SSR 안전(window 가드) + 깨진 JSON graceful.
  > - **영구화 훅** `hooks/watchlist/useWatchlistTickers.ts` — `{ tickers, addTicker, removeTicker, hasTicker }`(저장소 중립 시그니처). 최초 진입 시 대표주 3종 시드(`WATCHLIST_SEED_TICKERS = 005930/000660/035420`), 전부 삭제 시 재시드 금지(seeded 플래그), 중복/soft cap 30 가드.
  > - **화면 배선** — `page.tsx` server 유지 + `WatchlistContainer`(client) 신설: `useWatchlistTickers` → `useQueryWatchlist` 로 실데이터. `WatchlistPage`/`Table`/`Row` client 전환.
  > - **행별 삭제** `Trash2` 버튼(양 뷰포트), 행 클릭 시 `/profile/[ticker]`.
  > - **거래정지/관리종목 경고 배지** — `badge-critical`/`badge-warn`(신규 토큰 0).
  > - **검색 모달** `WatchlistAddModal.tsx` — `useQueryStockSearch` 재사용, 이미 담긴 종목 비활성("추가됨"), ESC/오버레이 닫힘.
  > - **상태처리** — 로딩 스켈레톤 / 에러(한글+재시도) / 빈 상태 CTA / 부분성공(받은 것만).
  > - **표시 변환** — `formatNumber`(천단위) + `formatPct`(부호). 한국식 색(상승 빨강/하락 파랑) 유지.
  > - 코인·해외 mock 제거 — `lib/mock/watchlist/items.ts`/`lib/types/watchlist/items.ts`(레거시 표시 모델) 삭제(국내주식만, §9 q4).
  > - copy `lib/copy/watchlist/labels.ts` 확장(모달/상태/배지/삭제).
  > 
  > ## AC 체크
  > - [x] AC-1/2/3 KIS 호출·매퍼·BFF (데이터 계층 커밋 09a194a + route.test.ts 7 통과)
  > - [x] AC-4 KIS 직접 호출 없음 — `grep -rn "search-stock-info|fetchStockInfo|inquire-price" components hooks app/(main)` 0(테스트 제외), `lib/api/watchlist` 에 KIS client 0
  > - [x] AC-5 커스텀훅만 소비 — `grep "useQuery(" components/watchlist` 0, `useQueryWatchlist|useWatchlistTickers` 6
  > - [x] AC-6 저장소 추상화 경계 — `grep "localStorage" hooks/watchlist/useWatchlistTickers.ts` **0**(접근은 store.ts 격리 모듈에만). `WATCHLIST_SEED` 존재. store 단위 테스트 5 통과(라운드트립/시드플래그/SSR 가드)
  > - [x] AC-7 추가/삭제 UX — `WatchlistAddModal.tsx` 1건, `useQueryStockSearch`/`removeTicker` 배선
  > - [x] AC-8 mock fallback + 국내주식만 — 빈 tickers→`X-Data-Source: mock` + `[]`. `grep "crypto|BTC|ETH|엔비디아|테슬라" lib/mock/watchlist` 0(레거시 삭제)
  > - [x] AC-9 실데이터(prod, 아래 스모크)
  > - [x] AC-10 한국식 색 — `badge-signal-up`/`badge-signal-down` 유지
  > - [x] AC-11 typecheck/lint/build/test 0 — 아래
  > - [x] AC-12 화면 회귀 0 — SSR 셸 "관심종목"/"+ 종목 추가" 렌더 확인
  > 
  > ## 검증 결과
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **engine API DB 영구화 마이그레이션**(`watchlist-engine-persistence` 가칭) — `store.ts` 의 read/write 만 engine API 호출로 교체, 훅 시그니처·컴포넌트·BFF 무변경 목표(경계는 본 PR 에서 마련).
  - **`intstock_multprice` 일괄 시세 최적화** — 종목당 단건 N회 → 1회 일괄(응답 필드 수집 선행). 동시 호출 부분실패(NAVER 사례) 완화에도 도움.
  - 코인/해외주식 관심종목은 별도 소스 트랙(§4).

### 2026-05-29 — fix(watchlist): 부분실패 종목 누락 방지 (좌조인 렌더 + 동시성 제한/재시도) (#45)

- **slug**: `fix/watchlist-partial-render` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/45
- **요약**: fix(watchlist): 부분실패 종목 누락 방지 (좌조인 렌더 + 동시성 제한/재시도)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 문제 (확진)
  > - 사용자가 관심목록에 3종(005930 삼성전자 / 000660 SK하이닉스 / 035420 NAVER)을 담았는데 **화면엔 2종만** 표시.
  > - 원인 1 (데이터): `/api/watchlist` 가 종목당 시세+메타 2콜을 무제한 fan-out → prod KIS **초당 거래건수 한도** 초과로 일부 시세 콜이 떨어짐.
  > - 원인 2 (화면): `WatchlistContainer` 가 `const quotes = query.data ?? []` 즉 **BFF 성공 결과 기준**으로만 렌더 → drop 된 종목이 화면에서 사라짐.
  > - **라이브 재현**: 시드 3종 BFF 호출 시 응답 `count 2`, `x-watchlist-failed: 035420` (재호출 시 `000660` 등 timing 에 따라 다른 종목이 drop — rate-limit 성격).
  > 
  > ## 수정
  > ### 데이터 계층 (commit fbc994b, 직전 api-integration-dev)
  > - 동시성 제한: `runWithConcurrency` 풀로 동시 실행 종목 `CONCURRENCY`(2) 제한.
  > - transient 재시도: `withRetry` — rate-limit(`EGW00201`/'초당 거래건수') / network 실패만 200ms backoff 후 1회 재시도. 비즈니스 에러는 비재시도.
  > - 실패 ticker 노출: 성공분만 안정 반환 + 시세 실패 종목을 `X-Watchlist-Failed` 헤더로 전달.
  > - 테스트 4종 추가.
  > 
  > ### 프론트엔드 (commit 1333f3b, 본 단계)
  > - **tickers 좌조인 렌더**: `WatchlistTable` 이 행을 `quotes` 가 아니라 사용자가 담은 **`tickers`** 기준으로 그리고 by-ticker 로 매칭 → 담은 종목은 절대 사라지지 않음.
  > - **디그레이드 행**: `quote` 가 없는 ticker 는 `WatchlistRow` 가 ticker 표시 + 한글 안내("시세를 불러오지 못했어요") + **재시도 버튼**(`query.refetch()`) + 삭제 버튼으로 렌더. 시세 미확정이라 `/profile` 라우팅은 차단. 기존 행 구조/토큰 재사용(**신규 토큰 0**).
  > - **상태 보존**: 초기 로딩 스켈레톤(tickers 수), 전체 실패(보유 0)만 ErrorCard, 부분 누락은 행 단위 디그레이드, 빈 상태(0종) CTA 유지.
  > - 누락 판정은 별도 헤더 surface 없이 **tickers − quotes 차집합**(Map by-ticker)으로 처리 — 과설계 회피.
  > 
  > ## 검증
  > - `typecheck` PASS / `lint` PASS / `build` PASS / `test` 73 passed (15 files).
  > - dev 서버(`:3300`) 라운드트립:
  >   - `/watchlist` 페이지 HTTP 200.
  >   - BFF `?tickers=005930,000660,035420` → 응답 2종 + `x-watchlist-failed` 헤더로 1종 drop 라이브 확인(원인 재현). 재호출 시 drop 대상이 바뀜(rate-limit timing).
  >   - 좌조인 로직상 drop 된 종목은 디그레이드 행으로 렌더되어 **3종 모두 표시**됨(행 = tickers 기준). 재시도 버튼은 `query.refetch()` 호출.
  > 
  > ## UI 개선 적용 항목 (docs/reviews/watchlist-ui-review.md 기반, commit 675c5a5)
  > 
  > 리포트의 13개 개선점(높음 3 / 중간 5 / 낮음 5)을 신규 토큰 0 · 주관적 재디자인 0 원칙으로 일괄 반영.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `intstock_multprice`(관심종목 일괄조회) 단일 콜 도입으로 종목당 2콜 fan-out 자체를 제거 — rate-limit 근본 해소, 별도 PRD/slug.
  - **전체 종목 마스터 연동**(UI 점검 #3 중기): 시드 ~100종목 한정을 KIS 종목 마스터/검색 API 또는 350종목 풀 시드로 확장. 디그레이드 행 name fallback·검색 커버리지 모두 개선. 별도 PRD/slug.
  - 운영 모니터링: prod 에서 `X-Watchlist-Failed` 빈도 관찰. 디그레이드 행이 상시 노출되면 동시성/재시도 파라미터 재조정.

### 2026-05-29 — feat(watchlist): intstock_multprice 일괄조회 전환 + 재시도 UX 개선 (watchlist-batch-quotes) (#46)

- **slug**: `watchlist-batch-quotes` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/46
- **요약**: feat(watchlist): intstock_multprice 일괄조회 전환 + 재시도 UX 개선 (watchlist-batch-quotes)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 문제
  > 
  > - `/watchlist` BFF 가 종목당 시세(`inquire-price`) + 메타(`search-stock-info`) **2N콜**(동시성 2 풀링) 을 합성 → 종목 수가 늘면 **초당 호출제한 `EGW00201`("초당 거래건수 초과")** 로 일부 종목 시세 실패(디그레이드 행).
  > - 디그레이드 행의 per-row "다시 시도" 버튼이 실제로는 `query.refetch()`(**전체 재조회**) 라 한 행만 재시도한 줄 알지만 성공한 행까지 다시 그려져 **깜박인다**.
  > 
  > ## 해결
  > 
  > **데이터 계층(직전 단계 `cfa425a`)**
  > - `lib/api/kis/intstock-multprice.ts` 신설 — `fetchIntstockMultprice(tickers)`, TR_ID `FHKST11300006`, 30종목/콜 청크(⌈N/30⌉), `Promise.allSettled` 부분성공, 입력 ticker 좌조인.
  > - `mapIntstockMultprice` — `inter2_*` → `WatchlistQuote`(WS 호환 정규 모델). `inter_kor_isnm`/`bstp_kor_isnm` 종목명 미사용.
  > - BFF route 일괄 1콜 전환 — `fetchStockPrice` 반복·`search-stock-info` 호출 0, 이중 게이트(`isKisConfigured && prod`), mock fallback, `X-Watchlist-Failed`, 5s 타임아웃, soft cap 30.
  > - `queryConfig.watchlist.list` staleTime 10s → **30s**.
  > 
  > **화면/UX(이번 단계 `4a91031`)**
  > - per-row "다시 시도" 버튼·콜백 prop 제거 → **표 상단 헤더 단일 "새로고침" 1개** (`query.refetch()`, `isFetching` 스핀/비활성, 빈/로딩/전체에러 분기 제외 `canRefresh` 가드).
  > - `useQueryWatchlist` 에 `placeholderData: keepPreviousData` — refetch 중 기존 행 유지(깜박임 완화).
  > - 표시 종목명 **store name → 시드 → quote.name** 우선(정상/디그레이드 행 공통). `WatchlistQuote.name` 은 BFF 폴백일 뿐이라 store name 으로 덮음.
  > - 디그레이드 행은 유지(좌조인)하되 안내 + 삭제만. 거래정지/관리종목 배지는 데이터 소스(`search-stock-info`) 부재로 보류(미표시) + 미사용 배지 라벨·렌더 제거(데드코드 0).
  > 
  > ## 검증
  > 
  > - `npm run typecheck` / `lint` / `test`(86 passed) / `build` — **0 에러/전부 통과**.
  > - **dev 라운드트립(`KIS_ENV=prod`, 실키)**:
  >   - `/watchlist` 페이지 SSR **HTTP 200**.
  >   - `GET /api/watchlist?tickers=005930,000660,035420` → **3종 모두 1콜 정상**(`x-data-source: kis`, `X-Watchlist-Failed` 없음 = `EGW00201` 0건), 응답 225ms.
  >   - 디그레이드: `tickers=005930,999999` → 005930 만 반환 + `X-Watchlist-Failed: 999999`(좌조인 디그레이드 행, store/시드 이름 표시).
  >   - 빈 tickers → `x-data-source: mock`.
  > - AC grep:
  >   - AC-7 `git grep -nE "onRetry|WATCHLIST_ROW_RETRY" components/watchlist/WatchlistRow.tsx` → **0건**.
  >   - AC-8 상단 새로고침 버튼 1개(`WatchlistPage` `onRefresh`→`query.refetch()`), per-row 0개.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `watchlist-realtime-ws` — `H0STCNT0` WS push 실시간 시세(초기 스냅샷/REST 폴백으로 본 트랙 `fetchIntstockMultprice`·`WatchlistQuote` 재사용).
  - 거래정지/관리종목 배지 복원(별도 트랙) — 지연로드(보임 종목만 per-row `search-stock-info`) 또는 일괄응답 동등 필드 검증.
  - `intstock_multprice` 모의(vts) 검증 후 이중 게이트 → 단일 게이트 완화 후속 chore.

### 2026-05-30 — feat(header): 글로벌 마켓 티커 5종 실데이터 전환 (header-market-ticker) (#47)

- **slug**: `header-market-ticker` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/47
- **요약**: feat(header): 글로벌 마켓 티커 5종 실데이터 전환 (header-market-ticker)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경
  > 
  > 헤더 데스크탑 글로벌 마켓 티커를 **mock 3건 → 실데이터 5건**으로 전환한다.
  > 
  > - 소스: KIS 국내지수(코스피·코스닥, 재사용) + KIS 해외지수(S&P500=SPX / NASDAQ 종합=COMP, 신설) + CoinGecko BTC 원화(신설). 고정 순서 `[코스피, 코스닥, S&P500, NASDAQ, BTC]`.
  > - prod 라이브 확정값: SPX **7,580.06** / COMP **26,972.62** / BTC 원화 (`X-Data-Source: kis`).
  > - KIS 4콜 **2개씩 청크 + 청크 간 지연** + 소스별 in-memory TTL(국내 30s / 해외 10분 / BTC 3분)으로 초당 유량 제한(**EGW00201 0건**).
  > - 본 PR(frontend 단계): 헤더 화면 배선 + 상태 처리. 데이터 계층(BFF·어댑터·훅·매퍼·테스트)은 직전 커밋 `a0cf9a5` 에 완료.
  > 
  > ### 파일
  > | 파일 | 성격 |
  > |---|---|
  > | `components/layout/HeaderMarketTicker.tsx` | 신설 — client 컨테이너, `useQueryMarketTicker()` 소비 |
  > | `components/layout/Header.tsx` | 수정 — mock import 제거 → `<HeaderMarketTicker />` |
  > | `lib/copy/layout/navCopy.ts` | 수정 — 티커 aria-label 카피 분리 |
  > 
  > 티커 렌더 마크업/토큰은 기존 `Header.tsx` 에서 **그대로 이전**(비주얼 동일): `hidden lg:flex`(데스크탑 전용)·구분선 `w-px h-3 bg-border-line`·등락 한국식 색 `signal-up`(red)/`signal-down`(blue)·`▲/▼ {x.x}%`·`tabular-nums`. 로딩/빈 상태는 헤더 높이를 유지하는 slim placeholder(레이아웃 시프트 0). 전체 실패는 BFF mock degrade 라 `data` 우선 소비(끊김 0), 에러 배지 없음(보조 정보 — PRD §3.7/q6).
  > 
  > ## AC 체크 (본 단계 관련)
  > 
  > - [x] **AC-5** 커스텀훅만 소비 — `git grep "@tanstack/react-query" components/layout/` → **0건**. 컨테이너가 `useQueryMarketTicker` 만 import.
  > - [x] **AC-6** 헤더 mock 직접 import 제거 — `git grep "HEADER_MARKET_TICKERS" components/layout/Header.tsx` → **0건**.
  > - [x] **AC-4** BFF 경유(직접 호출 0) — `git grep -E "fetchIndexPrice|fetchOverseasIndex|fetchBtcKrw|getKisClient|coingecko/client" components/layout/` → **0건**.
  > - [x] **AC-7/AC-8** 부분/전체 실패 graceful degrade — BFF `mock`/`mock-timeout` 으로 data 우선, 영역 숨김·에러 배지 없음. (route 단위 테스트 통과)
  > - [x] **AC-10** `queryConfig.market.ticker.staleTime === 60s`(`60 * SECOND`).
  > - [x] **AC-11** 표시 변환 — 지수 `isUp = direction==="up"`, BTC `isUp = krw_24h_change >= 0`, `value` 천단위 콤마, `▲/▼ {abs(changePct).toFixed(1)}%`.
  > - [x] **AC-12** typecheck / lint / build 0 에러.
  > - [x] **AC-13** 데스크탑 5건 표시 + 모바일 `hidden lg:flex` 비표시(SSR HTML 확인).
  > - [x] **AC-3/AC-9/AC-14** (데이터 계층) — 합성 route 순서/헤더, 동시성 청크, 매퍼 단위 테스트 통과.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `market-foreign-data` 트랙 — 환율 USD/KRW(KIS 시장코드 X) + BTC Dominance(`/global`) 추가, `/market` 화면 확장.
  - CoinGecko Demo 키(`COINGECKO_API_KEY`) env 추가 여부 — 429 빈도 운영 관찰 후 판단(현재 무키 + 3분 TTL 로 한도 내).
  - `X-Data-Source` 분포 운영 데이터 기반 staleTime/소스별 TTL 재조정.

### 2026-05-30 — feat(auth): 앱 비밀번호 게이트 (app-password-gate) (#48)

- **slug**: `app-password-gate` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/48
- **요약**: feat(auth): 앱 비밀번호 게이트 (app-password-gate)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 목적
  > 
  > 배포된 앱(Vercel 프로덕션 도메인 포함)을 **단일 공유 비밀번호**로 보호한다. Vercel "All Deployments" 보호는 Pro($150/월) 필요 + Standard Protection 은 프로덕션 도메인을 공개 그대로 둔다 → **앱 자체 게이트로 Hobby(무료) 도메인을 보호**. 접근 제어 전용(매매/주문 무관).
  > 
  > PRD: `docs/prd/app-password-gate.md` (§9 OPEN QUESTION 5건 전부 RESOLVED).
  > 
  > ## 동작
  > 
  > - **루트 `middleware.ts`(Edge)** — 모든 요청 가로채기. 유효 세션 쿠키(`app_auth`, HMAC 서명) 없으면:
  >   - 페이지 → `/login?next=<원경로>` **307 리다이렉트**(open-redirect 차단 — same-origin 절대경로만).
  >   - `/api/*`(인증 API 제외) → **401 JSON** `{ "error": "unauthorized" }`(리다이렉트 X, axios 친화).
  >   - 예외(항상 통과): `/login`·`/api/auth/*`·`/_next/static`·`/_next/image`·`/icon`·`/favicon`·`/fonts/*`. **matcher + 코드 가드 이중**.
  >   - **무한 루프 가드**: 이미 `/login` 이거나 예외 경로면 절대 다시 리다이렉트 안 함.
  > - **세션 crypto(`lib/auth/session.ts`)** — Edge 호환 **Web Crypto `crypto.subtle` HMAC-SHA256만**(Node `crypto`/`Buffer` 0). base64url 직접 구현. payload `{v, iat, exp=iat+30일}`. 검증 = 서명 재계산 constant-time 비교 + `exp > now`(만료의 단일 진실은 서명된 `exp`, 쿠키 maxAge 만 신뢰 X).
  > - **로그인 route(`/api/auth/login`)** — body `{password}` constant-time 비교(타이밍 공격 방지). 일치 → `app_auth` 쿠키(`httpOnly`·`secure`(prod)·`sameSite=lax`·`Max-Age=2592000`(30일)·`path=/`). 불일치 → **~500ms 고정 지연** 후 401(비밀번호 값/힌트 노출 0). 카운터/잠금 없음(서버리스 분산 신뢰 불가 + 자기 잠금 회귀 회피).
  > - **로그아웃 route(`/api/auth/logout`)** — 쿠키 `Max-Age=0` 삭제.
  > - **`/login` 화면** — `(main)` 그룹 밖 풀스크린 미니멀 폼. 기존 v8 합성 클래스(`card`/`input`/`button-primary` 등)만, 신규 디자인 토큰 0. 제출은 도메인 훅(`hooks/auth/useLogin`) 경유(컴포넌트는 `useMutation` 직접 import 0). 카피는 `lib/copy/auth/`.
  > - **axios 401 매핑(`lib/api/client.ts`)** — `/api/*` 401 수신 시 `/login?next=<현재경로>` 유도(세션 만료 graceful). 브라우저 가드(`typeof window`)·`/api/auth/*` 제외·이미 `/login` 이면 제외(루프 가드).
  > 
  > ## 자기 잠금(lockout) 방지
  > 
  > - 로컬 `APP_PASSWORD` 미설정 → 게이트 비활성(앱 공개)이라 개발 막힘 0(아래 검증 (b)).
  > - 예외 화이트리스트(`/login`·정적·`/api/auth`)를 matcher + 코드 가드 이중 보장 + 무한 루프 가드 + axios 매핑의 `/api/auth`·`/login` 제외로 다중 방어. 카운터/잠금 코드 자체를 두지 않음(AC-19 grep 0).
  > 
  > ## 검증 (자가 QA)
  > 
  > `typecheck` / `lint` / `build` / `test` **전부 0 에러** (test: 26 파일 149개 통과, 신규 auth 테스트 33개 — session 8 / password 6 / login route 6 / middleware 16 / client 401 매핑 3 + 회귀).
  > 
  > dev 서버 라운드트립 (로컬 http, `APP_PASSWORD`+`APP_AUTH_SECRET` 임시 설정):
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Vercel 환경변수 등록** — `APP_PASSWORD`/`APP_AUTH_SECRET` 를 Vercel Project Settings 에 등록해야 프로덕션 게이트가 실제 활성. 등록 전까지 프로덕션 도메인은 공개 상태(경고 로그로 인지). MEMORY `project_vercel-deferred` 연동 후 적용.
  - **(선택) `middleware.ts` → `proxy.ts` 마이그레이션** — Next.js 16 이 `middleware` 파일 컨벤션 deprecation 경고(빌드는 통과). 본 PRD/AC 는 `middleware.ts` 를 명시(AC-1)하므로 현 PR 은 유지. 별도 chore 후속에서 `proxy` 리네임 검토.
  - **(후속 PRD) 강한 브루트포스 방어** — 외부 저장소(Upstash 등) 기반 분산 rate-limit·CAPTCHA(본 PR 은 ~500ms 고정 지연만, §4 비범위). 다중 사용자/계정은 Supabase 인증 트랙.

### 2026-05-30 — feat(profile): 계좌 위젯 마이페이지 '내 자산' 이전 + /dashboard 리다이렉트 (home-market-redesign PR1) (#49)

- **slug**: `home-market-redesign` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/49
- **요약**: feat(profile): 계좌 위젯 마이페이지 '내 자산' 이전 + /dashboard 리다이렉트 (home-market-redesign PR1)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > home-market-redesign **PR1 (2-PR 중 1/2, PRD §8.2)** — 계좌 위젯을 `/dashboard` 에서 `/profile` "내 자산" 섹션으로 이전한다. 홈 시장종합·nav 재편·공포탐욕·공시는 **PR2 영역으로 본 PR 미포함**.
  > 
  > - `/profile` "내 자산" 섹션 신설: 총자산 히어로(`AssetHero`) + 자산비중 **도넛**(`AssetDonut`, 막대→도넛 재시각화, PRD §3.1) + **보유종목 전체 테이블**(`HoldingsTable`, 종목명·평가액·수익률·비중 4열 정렬 가능 — Top3 요약 아님, AC-2).
  > - 배치 순서(DESIGN.md): ProfileCard(무변경) → "내 자산" → ConnectedExchangesCard/SettingsMenuCard(무변경).
  > - `/dashboard` → `/profile` 영구 리다이렉트(Next `redirect`, §9 q4=b / AC-4). 계좌 컴포넌트(PortfolioHero/HoldingsTop3/DashboardPage) 원위치 제거.
  > - mock·타입·어댑터 `dashboard` → `profile` 도메인 이전. `fearGreed`/`marketSnapshot` mock·`MarketSnapshotCard` 는 **PR2(홈 시장심리) 재활용 위해 보존**.
  > - 거래성 항목(예수금/주문가능/실현손익/입출금) 미노출(조회·분석 전용 스코프, AC-9).
  > 
  > ## 디자인 토큰 주입 방식 (선택 사유)
  > 
  > `package.json` 의 `design:sync` 는 source 가 `docs/design/finsight-redesign.md` 로 고정돼 v9 신규 토큰을 자동 export 하지 못한다. **회귀 없는 (a) 방식** 선택 — `tailwind.theme.json` 에 **PR1 에 필요한 토큰만 직접 병합**(finsight 기존 토큰 hex·사이즈 한 글자도 안 건드림):
  > - spacing: `donut-size`(168px) / `donut-thickness`(22px) / `table-row-h`(48px) / `table-cell-px`(12px)
  > - typography: `table-cell-numeric`(14px/700/tnum) — `tailwind.config.ts` TYPOGRAPHY_EXTRAS 에 lineHeight·tnum 등록
  > - 자산 합성 토큰(`asset-hero`/`holdings-table-*`/도넛)은 **기존 색만 cascade** 하므로 `app/components.css` `@layer components` 흡수(색 신규 0).
  > - 공포·탐욕(`fng-*`)·공시·검색·nav 준비중 토큰은 PR2 영역이라 **본 PR 미주입**.
  > - (b) design:sync 스크립트 보강 대신 (a) 를 택한 이유: 스크립트가 2개 파일 병합 로직을 갖게 되면 전역 회귀 표면이 커지고, PR1 범위(자산 한정) 대비 과함. 신규 토큰이 소수라 직접 병합이 안전.
  > 
  > ## 자가검증 (수동 QA)
  > 
  > 모두 저장소 루트에서 실행. dev 서버 `localhost:3148` 라운드트립.
  > 
  > ### 빌드/품질 게이트 (AC-8)
  > - `npm run typecheck` → exit 0 (clean `.next` 후 에러 0)
  > - `npm run lint` → exit 0
  > - `npm run build` → exit 0 (Turbopack, ✓ Compiled). 라우트: `/profile` = ○(static), `/dashboard` = ○(redirect)
  > - `npm run test` → 21 files / **110 passed** (`profile/holdings.test.ts` 2건 포함)
  > 
  > ### AC-2 계좌 위젯 이전 + 전체 테이블
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR2 — 홈 시장종합 + nav/사이드바 재편**: 홈(`/`) 교체(지수·공포탐욕 게이지·공시·검색), `/market`→`/` 흡수+리다이렉트, AI분석 사이드바 하단 "준비 중", nav 6→4. DESIGN.md 의 `fng-*`/공시/검색/nav-준비중 토큰을 그때 주입(본 PR 은 자산 토큰만 주입). 보존해 둔 `MarketSnapshotCard`·`fearGreed`/`marketSnapshot` mock 재활용.
  - `lib/copy/dashboard/tooltips.ts` 의 계좌 툴팁(TOOLTIP_PORTFOLIO_TOTAL/PROFIT)은 PR1 이전부터 orphan — PR2 에서 시장심리 위젯 정리 시 함께 cleanup 검토(TOOLTIP_FEAR_GREED 는 PR2 게이지 재활용 가능).
  - 실계좌 연동 시 `hooks/profile/useQueryHoldings`(live multi-price 어댑터, 현재 mock 직접 주입으로 미소비)로 mock→실데이터 전환(PRD §8.4).

### 2026-05-30 — perf(market): 홈 국내지수 중복 호출 제거 + indices 라우트 청크/캐시 하드닝 (#51)

- **slug**: `market-indices-consolidation` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/51
- **요약**: perf(market): 홈 국내지수 중복 호출 제거 + indices 라우트 청크/캐시 하드닝
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 문제
  > 
  > 시장 종합 홈(`/`) 랜딩이 국내 지수를 세 경로로 따로 호출한다. 콜드 진입 시 KIS 초당 호출 제한(EGW00201)에 근접하고, 같은 데이터(코스피)를 중복으로 긁는다.
  > 
  > - **클라 dedup 부재** — `IndicesCardContainer`는 `useQueryIndices(['0001','1001','2001'])`, `FearGreedContainer`는 `useQueryIndices(['0001'])`. queryKey 정규화(`sort+join`)가 달라(`"0001,1001,2001"` vs `"0001"`) React Query dedup이 안 일어나 코스피를 **카드용 1콜 + 공포탐욕용 1콜** 두 번 받았다.
  > - **indices 라우트 무보호** — `/api/market/indices`가 `Promise.allSettled(codes.map(...))`로 동시 난사. ticker 라우트가 정착시킨 청크+서버 TTL 캐시 패턴 미적용.
  > - 콜드 진입 시 코스피 ×3(헤더+카드+공포탐욕). prod 단일 실전계좌 토큰으로 EGW00201 1회 발생 시 홈 전체가 mock degrade로 떨어진다(콜드스타트 SPX drop 사례).
  > 
  > ## 해결
  > 
  > 1. **공포·탐욕 ↔ 지수카드 쿼리 공유** — `FearGreedContainer`가 `useQueryIndices(DEFAULT_INDEX_CODES)`(`['0001','1001','2001']`)를 구독 → 지수카드와 동일 queryKey(`["market","indices","0001,1001,2001"]`)로 수렴 → 홈 마운트 시 React Query가 단일 in-flight로 dedup. 코스피 단독 1콜 제거. KOSPI는 `data?.find(q => q.code === '0001')`로 명시 선택(공유 쿼리에서 순서 비의존). breadth 공식·label·snapshot fallback은 무회귀.
  > 2. **indices 라우트 하드닝** (ticker 패턴 이식) — 2개씩 청크 + 청크 간 120ms 지연(EGW00201 회피), 모듈 레벨 in-memory TTL 캐시(국내 30s, `queryConfig.market.indices.staleTime`/ticker 국내분 정합) + `resetIndicesCacheForTest`, `X-Cache: hit/miss` 디버깅 헤더. 이중 게이트·부분 성공·5s 타임아웃·`X-Data-Source`/`X-KIS-Env`·502 `__ALL_FAILED__`·mock-timeout 기존 동작 보존, codes 순서 응답 보장.
  > 
  > ## 검증
  > 
  > - `typecheck` / `lint` / `build` 0에러, `test` 153 passed (26 files). indices route 테스트 8건(기존 4 + 청크·서버캐시·캐시리셋·순서보존 4 신규).
  > - **dedup**: 두 컨테이너 queryKey 동일(`["market","indices","0001,1001,2001"]`) → 홈에서 `/api/market/indices` 1건으로 합쳐짐(코드 리뷰 + queryKey 정규화 확인). 기존 공포탐욕 단독 `["market","indices","0001"]`는 별도 키로 2콜이었음.
  > - **라우트 캐시(live, KIS_ENV=prod)**: 1차 호출 `X-Cache: miss`(`X-Data-Source: kis`), 30s TTL 내 동일 codes 재요청 `X-Cache: hit` — KIS 재호출 0건 확인.
  > - breadth 무회귀: KOSPI(0001) 선택 → advances/declines 동일 산출, 0001 누락 시 기본값(value=50/NEUTRAL/up·down=0) fallback.
  > 
  > ## 후속
  > 
  > - 헤더 티커(`/api/market/ticker`) ↔ indices 라우트 국내지수 통합 — B 트랙(별도 PRD). 응답 shape/용도가 달라 통합 비용 큼.
  > - 소스 레벨 `fetchIndexPrice` 캐시(+single-flight) — KIS 토큰 store(B) 트랙과 함께. serverless 인스턴스 분산 한계가 토큰 store와 동일.
  > 
  > ## 다음 작업
  > 
  > - QA: 홈 `/` 콜드 로드 시 Network 탭에서 `/api/market/indices` 1건 확인, 지수카드 3종·공포탐욕 게이지(코스피 breadth) 정상 출력, 부분 실패/타임아웃 시 화면 무중단.
  > - Reviewer: BFF 패턴(브라우저 직접 호출 0), 서버캐시 staleness 30s 허용 범위, queryKey 단일 위치 정합.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 헤더 티커(`/api/market/ticker`) ↔ indices 라우트 국내지수 통합 — B 트랙(별도 PRD). 응답 shape/용도가 달라 통합 비용 큼.
  - 소스 레벨 `fetchIndexPrice` 캐시(+single-flight) — KIS 토큰 store(B) 트랙과 함께. serverless 인스턴스 분산 한계가 토큰 store와 동일.
  - QA: 홈 `/` 콜드 로드 시 Network 탭에서 `/api/market/indices` 1건 확인, 지수카드 3종·공포탐욕 게이지(코스피 breadth) 정상 출력, 부분 실패/타임아웃 시 화면 무중단.
  - Reviewer: BFF 패턴(브라우저 직접 호출 0), 서버캐시 staleness 30s 허용 범위, queryKey 단일 위치 정합.

### 2026-05-30 — feat(kis): 토큰 인스턴스 간 공유 store(Upstash) + 분산 single-flight (#52)

- **slug**: `kis-token-store` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/52
- **요약**: feat(kis): 토큰 인스턴스 간 공유 store(Upstash) + 분산 single-flight
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 문제
  > 
  > `lib/api/kis/token.ts` 의 access token 캐시는 **인스턴스 메모리 only** 다. Vercel serverless 는 트래픽에 따라 인스턴스가 여러 개 뜨고(콜드 스타트마다 새 메모리), 인스턴스 A·B·C 가 동시에 cache miss 면 각자 `/oauth2/tokenP` 를 호출 → 합산 발급 횟수가 인스턴스 수만큼 늘어난다. KIS 는 동일 appkey 에 토큰 발급 분당 제한(EGW00133 류)이 있어, 다중 사용자/콜드 스타트 다발 시 발급이 막히면 KIS 호출 전체가 mock 으로 떨어진다(콜드스타트 SPX drop 사례). 부수로, 헤더 티커와 indices 라우트가 같은 코스피/코스닥을 라우트별·인스턴스별로 중복 조회한다.
  > 
  > ## 해결
  > 
  > PRD `docs/prd/kis-token-store.md` 그대로.
  > 
  > - **토큰 2단 캐시 + 분산 single-flight (핵심)**
  >   - L1 = 현행 인스턴스 메모리(cache + inflight Promise dedupe) **유지** → memory 모드 무회귀.
  >   - L2 = 공유 store(`getKisStore()`). 키 `kis:token:{env}:{appkeyhash}`(SHA-256 hex 앞 16자, 평문 금지). TTL = 만료 − grace(60s).
  >   - 분산 락 `SET NX PX 10s`(키 `kis:lock:token:{env}:{hash}`) → 잡은 1인스턴스만 발급, 나머지는 50ms 간격 × 최대 ~2s 폴링으로 store 수렴. 락 미획득 + 폴링 만료 시 **직접 발급 fallback**(가용성 우선).
  > - **store 추상화** `lib/api/kis/store.ts` — `KisStore`(get/set/del/acquireLock/releaseLock). `KIS_TOKEN_STORE` 토글: `memory`(기본/로컬/미설정/store에러) | `kv`(Upstash, `SET NX PX` + Lua compare-and-del). `@upstash/redis` 직접 import 는 본 모듈에만(서버 전용 경계). 클라이언트/store 주입 가능(테스트).
  > - **fail-soft (최상위)** — store 미설정/타임아웃(600ms)/에러는 throw 가 아니라 null/false 폴백 신호로 흡수 → 현행 인메모리 경로로 graceful degrade. store 는 최적화이지 SPOF 아님.
  > - **지수 store(부수, 포함)** — `fetchIndexPriceShared`: 국내(`0001`/`1001`)만 L2 공유 store(TTL 30s, 락 없음) 경유 → 헤더 티커·indices 라우트 크로스-라우트/크로스-인스턴스 dedup. L1 라우트 인메모리 + L2 store **병행**(라우트 캐시 제거 0). 해외/BTC 는 현행 라우트 TTL 유지.
  > 
  > ## 지수 store 포함 여부
  > 
  > **본 PR 에 포함**(§3.6 — 같은 store 인프라 위, PR 라인 과대 아님). 국내 0001/1001 우선, L1+L2 병행(q7 ①②③).
  > 
  > ## ⚠️ 프로비저닝 필요 (사용자 작업)
  > 
  > 머지 후 **Vercel Marketplace 에서 Upstash for Redis(무료 티어·Regional Tokyo) 연결 + env 주입**(`KV_REST_API_*` 또는 `UPSTASH_REDIS_REST_*`, 코드가 둘 다 흡수) + Production env 에 `KIS_TOKEN_STORE=kv`. **미설정 상태로 머지돼도 `memory` 폴백으로 정상**(무해). 실제 Upstash 라이브 검증은 프로비저닝 후라 불가 → **fake redis 주입 단위테스트로 커버**(아래).
  > 
  > ## 검증
  > 
  > - `typecheck` / `lint` / `build` / `test`(178 통과, 28 파일) 0에러.
  > - **memory 무회귀**: 기존 `token.test.ts` 7 케이스 green 유지(store 미설정 시 현행과 동일 — beforeEach 에서 fresh MemoryKisStore 주입으로 격리).
  > - **kv 모드 단위테스트(fake 주입)**: store hit, 락 single-flight(발급 1회), 폴링 수렴, 직접발급 fallback, store 에러 fail-soft, TTL(만료−grace) — `token.test.ts` 5건 + `store.test.ts` 14건.
  > - **지수 store**: `index-store.test.ts` 6건(store hit/miss dedup, 비국내 미경유, fail-soft) + 라우트 테스트 mock 정합.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **프로비저닝(사용자)**: Vercel Marketplace Upstash for Redis(무료·Regional Tokyo) 연결 + env 주입(`KV_REST_API_*` 또는 `UPSTASH_REDIS_REST_*`) + Production `KIS_TOKEN_STORE=kv` 설정. 연결 후 실제 주입 변수명 확인.
  - **운영 관찰 후 튜닝**: 락 TTL 10s / 폴링 50ms×~2s 는 KIS 발급 제한 수치 확인 전 보수값. EGW00133/EGW00201 관찰 시 조정.
  - **지수 store 확대(후속)**: 현재 국내 0001/1001 한정. 해외/BTC 확대 + EGW00201 관찰 시 지수 캐시에도 락 추가(q6).
  - **무료 티어 초과 관찰(후속)**: 429/한도 경고 시 유료 검토.
