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

### 2026-05-31 — feat(stock): 종목 분석 페이지 + 다중 기술지표 차트 (캔들/거래량/MACD/RSI) (#53)

- **slug**: `stock-chart-analysis` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/53
- **요약**: feat(stock): 종목 분석 페이지 + 다중 기술지표 차트 (캔들/거래량/MACD/RSI)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## Summary
  > 
  > - `/stock/[ticker]` 라우트 신설 — 기존 `/profile/[ticker]` 대체, 사이드바·바텀바·관심종목 진입점 통일
  > - `StockDailyChart` 전면 재작성: 단순 AreaChart → 라인/캔들 전환 + 거래량·MACD·RSI 서브플롯 4단 구성
  > - `StockPageLayout` 신설: 데스크탑 2-col ↔ 차트 풀너비 확대 전환 (fade 180ms)
  > - `app/api/stock/chart` BFF: `inquire-daily-itemchartprice` (최대 100봉, D/W/M period)
  > - `calcMACD` / `calcRSI` 기술지표 유틸 신설
  > - `StockSearchContainer` 자동완성 + 최근 검색 종목 (localStorage)
  > - `symbols.json` 전종목 갱신 + `update-symbols.py` 스크립트
  > - 해외 지수(S&P500/NASDAQ) indices BFF 추가
  > 
  > ## Bug fixes (code-review 검출)
  > 
  > | 파일 | 수정 |
  > |---|---|
  > | `StockDailyChart` | `isUp` 비교를 `close >= open`으로 통일 — day-over-day 비교로 캔들 색 불일치 |
  > | `StockDailyChart` | MACD 서브플롯 노출 게이트를 `macd !== null`로 변경 — 26-34봉 구간 데이터 숨김 해소 |
  > | `StockDailyChart` | `CandleBar` `high < low` (strict) — 도지 캔들 렌더링 |
  > | `StockDailyChart` | 거래량·MACD Bar에 `isAnimationActive={false}` 추가 — 캔들과 애니메이션 일치 |
  > | `StockDailyChart` | `ResponsiveContainer height` 수치 고정 — Recharts v3 `width(-1)` 경고 제거 |
  > | `StockPageLayout` | `timerRef`로 이전 setTimeout 취소 — 빠른 연속 클릭 race condition 수정 |
  > 
  > ## Test plan
  > 
  > - [x] `/stock/005930` 접속 → 가격 차트·거래량·MACD·RSI 정상 렌더, 콘솔 경고 없음 (Playwright 확인)
  > - [x] 라인 ↔ 캔들 전환, 일봉/주봉/월봉 전환, 기간 범위 전환
  > - [x] 차트 확대 버튼 → 풀너비 확대, 축소 버튼 → 2-col 복귀
  > - [x] 빠른 연속 클릭 race condition 없음
  > - [ ] 종목 검색창 자동완성, 최근 검색 종목 표시
  > - [ ] 관심종목 페이지 종목 클릭 → `/stock/[ticker]` 이동
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - W1: `StockSearchContainer` input `!` 오버라이드 → `.input-search` variant 분리
  - W2: `StockDailyChart` 차트 색상 → `tailwind.theme.json` chart.* 토큰 등록
  - W3: CandleBar wickRange Y 좌표 — 다양한 종목·기간 시각 검증
  - W4: `calcMACD` signal null 구간 0 패딩 정확도 개선
  - 홈 공시 피드 기업별 그룹핑 (`DisclosureFeedContainer`) — 별도 PR

### 2026-05-31 — feat(meta): 소셜 공유 OG 메타데이터 + 동적 og:image + 크롤러 게이트 통과 (#54)

- **slug**: `social-share-metadata` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/54
- **요약**: feat(meta): 소셜 공유 OG 메타데이터 + 동적 og:image + 크롤러 게이트 통과
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇 / 왜
  > 카톡·SNS 링크 공유 시 풍부한 OG 프리뷰(제목·설명·대표 이미지·사이트명)가 뜨도록 OG/Twitter 메타데이터 + 동적 og:image(1200×630) + 크롤러 게이트 통과를 추가.
  > 
  > PRD: `docs/prd/social-share-metadata.md` (§9 OPEN QUESTION 5건 전부 RESOLVED — q1=옵션 B, q2~q5=PM 권고 기본값)
  > 
  > ## 변경 (단일 PR, §8.2 커밋 분할)
  > | 파일 | 내용 |
  > |---|---|
  > | `app/layout.tsx` | `metadataBase`(하드코딩 prod + `VERCEL_PROJECT_PRODUCTION_URL` 폴백, q3=A) · `openGraph`(title/description/url/siteName/locale ko_KR/type website) · `twitter`(card summary_large_image). `description` 한 곳에서만 정의(q5 인라인 유지). OG/twitter images 는 파일 컨벤션이 자동 주입(명시 불필요). |
  > | `app/opengraph-image.tsx` (신규) | `next/og` ImageResponse 1200×630 PNG — 파란 `#1d4ed8` 배경 + 흰 lucide Activity + "FinSight" 라틴 워드마크(q4=라틴만, 폰트 주입 없음). hex 직타는 `app/icon.tsx` 선례 예외 주석. twitter-image 미생성(q2). |
  > | `middleware.ts` | OG 크롤러 UA 화이트리스트(`kakaotalk-scrap`/`facebookexternalhit`/`Facebot`/`Twitterbot`/`Slackbot`/`Discordbot`/`TelegramBot`/`LinkedInBot`/`WhatsApp`/`Googlebot`/`bingbot`, 소문자 부분일치). 미인증 **페이지** 분기에서 크롤러 UA 면 `/login` 대신 통과. **`/api/*` 는 그 분기보다 앞에서 항상 401** — 데이터 보호 불변(q1=옵션 B). `isPublicPath`·`matcher`·루프/open-redirect 가드 무변경, UA 분기만 추가. |
  > 
  > ## 자가검증 (AC)
  > 
  > ### 메타데이터 (G1·G3)
  > - **AC-1** `git grep -nE "openGraph|metadataBase|twitter" app/layout.tsx` → metadataBase + openGraph(title/description/url/siteName/locale/type) + twitter(card summary_large_image) 존재.
  > - **AC-2** 게이트-off `curl -s localhost/ | grep og:|twitter:` →
  >   `og:title` `og:description` `og:image` `og:url` `og:type`(website) `og:site_name`(FinSight) `og:locale`(ko_KR) + `twitter:card`(summary_large_image) `twitter:title` `twitter:description` `twitter:image` 모두 출력. `og:image`/`twitter:image` 는 1200×630 image/png 로 Next 자동 주입.
  > - **AC-3** `og:url` = `https://trading-signal-frontend.vercel.app`(절대). `npm run build` 로그 `metadataBase` 미설정 경고 0건(grep 확인).
  > 
  > ### 동적 og:image (G2)
  > - **AC-4** `app/opengraph-image.tsx` `size={1200,630}`·`contentType="image/png"`. 게이트-off `curl -sI localhost/opengraph-image | grep content-type` → `image/png`. 렌더 파일 `file` → `PNG image data, 1200 x 630`. 시각 확인: 파란 배경 + Activity 아이콘 + FinSight 워드마크 (스크린샷 첨부 예정).
  > - **AC-4b** `git grep -n "1d4ed8" app/icon.tsx app/opengraph-image.tsx` → 두 파일 동일 `#1d4ed8` + 동일 취지 hex 예외 주석.
  > 
  > ### 게이트 정합 (G4, q1=옵션 B) — gate-on(`APP_PASSWORD` 설정) 실측
  > | 요청 | 결과 |
  > |---|---|
  > | 일반 UA `GET /` (쿠키 없음) | `307 → /login?next=%2F` (게이트 intact) |
  > | 크롤러 UA `kakaotalk-scrap` `GET /` | **200** (리다이렉트 아님) |
  > | 크롤러 UA `facebookexternalhit` `GET /opengraph-image` | **200 image/png** |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 배포 후 운영자 작업: Kakao Developers 캐시 삭제(스크랩 갱신) 1회 + 카톡 대화창 실측(AC-10/G5). 페이스북/슬랙 등은 각 플랫폼 디버거로 갱신.
  - 후속 PRD 후보: 페이지별 동적 OG(종목 분석마다 종목명·가격 박힌 og:image — route-segment `opengraph-image`), 한글 태그라인 추가 시 Pretendard subset 폰트 주입(q4 후속), `robots.txt`/`sitemap.xml`·PWA manifest(별도 트랙).
  - 사전 실패 테스트 5건(market ticker/indices NASDAQ·SPX 순서)은 본 PR 무관이나 별도 정리 필요.

### 2026-05-31 — feat(pwa): 홈 화면 설치(PWA) + 브랜드 로고 3색 그라데이션 리프레시 (#57)

- **slug**: `pwa-home-screen` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/57
- **요약**: feat(pwa): 홈 화면 설치(PWA) + 브랜드 로고 3색 그라데이션 리프레시
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 핸드폰 홈 화면에 "추가"하면 회색 자동 아이콘("F" 글자)으로 떠서 PWA 미설정 문제 발견. 함께 브랜드 로고를 신규 디자인(흰 배지 + 3색 맥박 그라데이션)으로 전 표면 통일.
  > 
  > ## 변경
  > ### 1. PWA — 홈 화면 아이콘 + 전체화면 설치
  > - `app/apple-icon.tsx`(iOS 180) · `app/icon-pwa`(Android 192·512) · `app/manifest.ts`(standalone) · `public/sw.js`(오프라인 캐싱 없는 no-op SW) + `ServiceWorkerRegister`
  > - `app/layout.tsx`: `manifest` + `appleWebApp` + `viewport.themeColor`
  > - `middleware.ts`: `/apple-icon`·`/sw.js` 게이트 공개 예외 추가(+matcher) — 미인증 시 아이콘 깨짐 방지
  > 
  > ### 2. 브랜드 로고 리프레시 (5곳 통일)
  > - 3색 맥박 그라데이션: 상승=빨강 `#ef4444` / 가운데=슬레이트 `#94a3b8` / 하락=파랑 `#3b82f6`
  > - 색·글리프 단일 소스 `lib/brand-mark.tsx` (`pulseGradientDefs` 는 컴포넌트 아닌 함수 호출 — Satori `<defs>` 누락 회피)
  > - 파비콘 / 홈아이콘 / OG / 사이드바 / 헤더 전부 흰 배지 기반
  > - 사이드바·헤더: 배지 36px 원형(`h-9`/`rounded-pill`) · 아이콘 24px(`h-6`) · 텍스트 22px(`text-h1`) · gap 10px
  > 
  > ### 3. OG 이미지
  > - 파란 카드 → 라이트(슬레이트 그라데이션 배경) + 흰 배지 + 다크 워드마크. 흰 채팅 피드에서도 카드 경계 유지.
  > 
  > ## 검증
  > - typecheck · lint · build 통과 (기존 경고 1건 `StockDailyChart.tsx` 무관)
  > - 게이트 운영조건 런타임: 페이지→307 `/login`, 아이콘·매니페스트·`/sw.js`·OG→200, `/api`→401
  > - 5개 마크 실제 렌더 + 컴파일 CSS 치수(배지36·아이콘24·텍스트22·gap10·그라데이션 텍스트 색) 확인
  > 
  > ## 영향 / 주의
  > - 조회·분석 전용 스코프 유지 — 데이터/주문 API 무관
  > - iOS: 기존 홈 바로가기 삭제 후 재추가 필요(아이콘 캐시 갱신 안 됨)
  > - 다크모드 미적용(앱 light 고정)
  > 
  > ## 다음 작업
  > - (QA) `docs/qa/pwa-home-screen.md` 리포트 — qa 에이전트 진행
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - ✅ QA 완료 — `docs/qa/pwa-home-screen.md` (qa 에이전트, 실패 0) · ✅ 코드 리뷰 승인
  - 실기기 수동 검증: iOS Safari "홈 화면에 추가" / Android Chrome "앱 설치"
  - (후속) 모바일 헤더 외 다크모드 대응은 별도 PRD

### 2026-05-31 — fix(pwa): 상단 navbar 글래스 safe-area 확장 — 상태바 경계선 제거 (#60)

- **slug**: `pwa-safe-area-seam` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/60
- **요약**: fix(pwa): 상단 navbar 글래스 safe-area 확장 — 상태바 경계선 제거
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > 핸드폰에 설치형 PWA(홈 화면 추가)로 띄우면 상단 navbar **위쪽에 가느다란 가로 경계선**이 보였다. 원인은 테두리가 아니라 **색 경계(seam)** — 순백 상태바(`theme_color #ffffff`)와 반투명 글래스 헤더(`bg-surface/80 backdrop-blur-md`, 뒤의 `surface-muted` 회색이 비쳐 살짝 off-white)가 맞닿아 생기는 선이었다. 데스크탑·일반 브라우저 탭에는 상태바가 없어 안 보이고 설치형 PWA에서만 드러난다.
  > 
  > ## 변경
  > 
  > navbar 글래스 **색/톤은 그대로 두고**, 헤더 글래스를 상태바(safe-area) 영역까지 확장해 상태바가 같은 글래스 면 위에 떠 있게 만들어 맞닿는 경계 자체를 제거했다.
  > 
  > | 파일 | 변경 |
  > |---|---|
  > | `app/layout.tsx` | `viewport.viewportFit: "cover"` 추가 → `env(safe-area-inset-*)` 활성화 |
  > | `app/components.css` `.header-glass` | `h-navbar-h` → `min-h-navbar-h` + `padding-top: env(safe-area-inset-top)` |
  > | `app/components.css` `.bottom-nav` | `padding-bottom: env(safe-area-inset-bottom)` (cover 하단 짝 — 홈 인디케이터 겹침 방지) |
  > | `app/(main)/layout.tsx` | `main` 하단 스페이서에 `+ env(safe-area-inset-bottom)` |
  > 
  > - `viewport-fit=cover`는 상·하 동시에 적용되므로 BottomNav가 홈 인디케이터 밑으로 들어간다 → 하단 safe-area 패딩이 세트로 필요.
  > - 데스크탑·일반 브라우저 탭은 인셋이 0이라 **무회귀**.
  > 
  > ## 검증
  > 
  > - `npm run build` ✓ Compiled successfully
  > - 컴파일된 CSS에 `safe-area-inset-top` / `safe-area-inset-bottom` 포함 확인
  > - ⚠️ 설치형 PWA에서만 드러나는 변경 → **배포 후 실제 폰 검증 필요**:
  >   - 상단 경계선 사라짐(핵심)
  >   - 헤더 로고·프로필 아이콘이 상태바에 안 가리고 60px 행에 정렬
  >   - 하단 BottomNav가 홈 인디케이터에 안 가림
  > 
  > ## 다음 작업
  > 
  > - 배포 후 iOS/Android 설치형 PWA에서 상단 경계선 제거 + 상·하 safe-area 정렬 실측 확인.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 배포 후 iOS/Android 설치형 PWA에서 상단 경계선 제거 + 상·하 safe-area 정렬 실측 확인.
  - (관찰 시) 가로 모드(landscape)에서 좌우 노치 인셋 영향 점검 — 현재 좌우 인셋 패딩은 미적용.

### 2026-05-31 — fix(pwa): navbar 불투명 흰색 전환 — iOS·Android 상태바 경계선 제거 (#61)

- **slug**: `pwa-navbar-opaque-seam` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/61
- **요약**: fix(pwa): navbar 불투명 흰색 전환 — iOS·Android 상태바 경계선 제거
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경 (follow-up of #60)
  > 
  > #60에서 상단 navbar 상태바 경계선(seam)을 `viewport-fit=cover` + `env(safe-area-inset-top)` 글래스 확장으로 잡으려 했으나, **이는 iOS 중심 메커니즘**이라 **Android(갤럭시 S25/One UI 7)에선 무효**였다. Android는 상태바를 별도 시스템 띠로 `theme_color`(#ffffff)로 칠하고 `safe-area-inset-top`이 0이라 글래스 확장이 적용되지 않는다 → 회색 경계선 잔존.
  > 
  > ## 변경 — iOS·Android 공통 해법
  > 
  > navbar를 **반투명 글래스 → 불투명 흰색**으로 전환해 상태바 흰색(`theme_color #ffffff`)과 **100% 동일화**. 반투명(`/80`)으로 인한 미세 off-white + `backdrop-filter` 합성 경계까지 함께 제거된다.
  > 
  > | 파일 | 변경 |
  > |---|---|
  > | `app/components.css` `.header-glass` | `bg-surface/80 backdrop-blur-md` → `bg-surface` (#ffffff 불투명) |
  > 
  > 유지 항목 (#60에서 도입, 회귀 없음):
  > - `padding-top: env(safe-area-inset-top)` + `min-h-navbar-h` — iOS 노치/상태바 영역을 navbar 흰색으로 채움. Android·데스크탑은 인셋 0 → 무회귀.
  > - `viewport-fit=cover`(app/layout.tsx), BottomNav `env(safe-area-inset-bottom)` — 그대로.
  > - **BottomNav 글래스(`bg-surface/80 backdrop-blur`)는 유지** — 콘텐츠 위 스크롤 블러 효과(상태바와 무관).
  > 
  > 정지 상태 navbar 색은 기존 글래스(≈#fdfdfe)와 사실상 동일 → 톤 무변경.
  > 
  > ## 검증
  > 
  > - `npm run build` ✓ Compiled successfully
  > - 컴파일 CSS: `.header-glass { background-color:#fff; min-height:60px; ... }` (backdrop-filter 제거 확인), `safe-area-inset-top/bottom` 유지
  > - ⚠️ **배포 후 실기기 검증 필수 (iOS + Android 둘 다)**:
  >   - 상단 상태바 ↔ navbar 경계선 제거 (핵심, 양 플랫폼)
  >   - 헤더 로고/프로필 정렬, 하단 BottomNav 홈인디케이터 비가림
  > 
  > ## 다음 작업
  > 
  > - 배포 후 iOS/Android 설치형 PWA 둘 다에서 상태바 경계선 제거 실측.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 배포 후 iOS/Android 설치형 PWA 둘 다에서 상태바 경계선 제거 실측.
  - (잔존 시) 회색 선이 색 차이가 아니라 Android 시스템 status bar elevation 그림자일 가능성 → edge-to-edge(콘텐츠를 상태바 밑까지) 방식 별도 검토.
  - landscape 좌우 노치 인셋(`env(safe-area-inset-left/right)`) 미적용 — KNOWN-GAP 유지.

### 2026-05-31 — feat(pwa): 브랜드 스플래시 — 로고+FinSight (인앱 + iOS 시작화면) (#62)

- **slug**: `pwa-splash-branding` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/62
- **요약**: feat(pwa): 브랜드 스플래시 — 로고+FinSight (인앱 + iOS 시작화면)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 
  > 설치형 PWA 콜드 로드 시 **그래프 로고만** 뜨고 브랜드명이 없었다. 로고 아래에 "FinSight" 워드마크(PC 사이드 메뉴 상단과 동일 톤)를 더해 브랜드 로딩 경험을 완성한다.
  > 
  > 플랫폼별 네이티브 스플래시 한계:
  > - **Android**: manifest 로 스플래시를 자동 생성하지만 **아이콘만** 가능(텍스트 불가).
  > - **iOS**: manifest 스플래시 자동생성이 없어 기본 **빈 흰 화면**.
  > 
  > → 둘 다 **흰 배경 + 글리프 + FinSight** 로 이어받아, 사용자에겐 "로고 아래 텍스트가 나타나는" 하나의 연속 화면으로 보이게 한다(중복 2회 방지).
  > 
  > ## 변경
  > 
  > | 파일 | 내용 |
  > |---|---|
  > | `components/pwa/SplashScreen.tsx` (신규) | 인앱 스플래시. SSR 즉시 렌더 → `load` 시 fade-out → 언마운트. **설치형 PWA(display-mode: standalone)에서만** 노출 → 일반 브라우저 탭 번쩍임 방지. JS 지연/실패 대비 2.5s 백스톱 |
  > | `app/splash-ios/route.tsx` (신규) | iOS `apple-touch-startup-image` 동적 생성(`/splash-ios?w=&h=` — 흰 배경+글리프+FinSight). Android 네이티브 스플래시의 iOS 대응 |
  > | `app/layout.tsx` | `<SplashScreen/>` 마운트 + `appleWebApp.startupImage` 11개 기기(iPhone SE2~16 Pro Max, portrait) 미디어쿼리 연결 |
  > | `app/components.css` | `.splash-*` 합성 토큰(사이드바 brand 톤 워드마크, standalone 가드) |
  > | `middleware.ts` | `/splash-ios` 공개 경로(미인증 iOS 수신) |
  > 
  > 색/글리프는 `lib/brand-mark.tsx` 단일 소스 재사용(파비콘·홈아이콘·OG·사이드바와 정합).
  > 
  > ## 검증
  > 
  > - `npm run build` ✓ Compiled successfully, 타입 0에러
  > - `/splash-ios?w=1170&h=2532` → HTTP 200 `image/png` 1170×2532 (흰 배경+3색 글리프+FinSight 렌더 확인)
  > - `/login` HTML: `apple-touch-startup-image` 링크 11개(미디어쿼리 정상) + 인앱 `.splash-screen` SSR 마운트 확인
  > - 컴파일 CSS: `.splash-screen{display:none}` + `@media (display-mode:standalone){.splash-screen{display:flex}}` 가드 확인
  > - ⚠️ **배포 후 실기기(iOS·Android 설치형 PWA) 실측 필요**: 콜드 로드 시 로고+FinSight 연속 표시 / 네이티브→인앱 전환 점프 없는지
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 배포 후 iOS·Android 설치형 PWA 콜드 로드 실기기 검증(로고+FinSight 연속, 중복 번쩍임 없음).
  - (관찰 시) 인앱 스플래시 최소 표시시간/페이드 타이밍 미세조정.
  - iOS landscape 시작 화면(현재 portrait 한정), iPad 해상도는 KNOWN-GAP.
  - 별도 트랙: Android 상태바 1px 시스템 그림자 edge-to-edge 후속(직전 논의).

### 2026-05-31 — feat(stock-ux): 모바일 종목분석 UX 개선 — 스크롤바·네비·접기카드 (#63)

- **slug**: `mobile-stock-ux-polish` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/63
- **요약**: feat(stock-ux): 모바일 종목분석 UX 개선 — 스크롤바·네비·접기카드
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경
  > 모바일 사용 중 발견된 4가지 UX 이슈를 한 묶음으로 개선한다.
  > 
  > ## 변경 사항
  > ### 1. 모바일 스크롤바 숨김
  > - `app/components.css` `@layer utilities`에 `.scrollbar-hide-mobile`(미디어쿼리 `< 768px`) 추가.
  > - 주 스크롤 컨테이너(`.main-area`)와 검색 드롭다운 내부 스크롤에 적용. 데스크탑은 무회귀.
  > 
  > ### 2. 네비 정합성 + 종목분석 버그 + AI분석 말풍선
  > - `hooks/layout/useStockNavClick.ts` 신규 — Sidebar/BottomNav가 byte-for-byte 복제하던 핸들러를 일원화.
  > - **버그 수정**: 최근 본 종목이 없을 때 홈(`/`)으로 튕겨 홈 메뉴가 활성화되던 문제 → `/stock` 검색 랜딩으로 교정.
  >   - 최근 종목 있으면 `/stock/<ticker>?q=<종목명>`으로 이동(검색창 프리필 + 하단 상세).
  > - `/stock`: `redirect('/')` 제거 → `StockSearchLanding` 검색 랜딩 페이지로.
  > - `StockSearchContainer`에 `initialKeyword` prop 추가(상세 진입 시 종목명 프리필, 드롭다운은 닫힌 채).
  > - `ComingSoonNavItem` 신규 — AI분석 "준비 중" 항목을 Sidebar/BottomNav 공유로 통일(BottomNav 하드코딩 "준비 중"·라벨 불일치 해소) + 호버/탭 안내 **말풍선**(2.5s 자동 닫힘·외부 클릭 닫힘).
  > 
  > ### 3 & 4. 종목 페이지 모바일 재구성
  > - `StockPageLayout`에 `useBreakpoint().isMobile` 분기 추가. 모바일 순서: 종목명·현재가 → 차트 → 기업개황 → 최근공시. (제목·검색은 상위 `StockProfilePage` 유지 → 전체: 제목→검색→…)
  > - **차트**: 모바일은 `onExpand` 미전달 → 확대 버튼 미렌더(축소 고정). 데스크탑은 확대/축소 유지.
  > - **접기/펼치기**: `components/ui/CollapsibleCard` 신규(첫 `components/ui/` 원자). 기업개황·최근공시를 모바일에서 기본 접힘 카드로(`collapsible` prop). 우측 chevron이 클릭 시 `transition-transform`으로 180° 회전(아래↔위).
  > 
  > ## 검증
  > - `npm run typecheck` ✅ / `npm run lint` ✅(기존 StockDailyChart 경고 1건 무관) / `npm run build` ✅
  > - 데스크탑 무회귀: Sidebar 동작·차트 확대축소·2단 그리드 항상 펼침·스크롤바 정상.
  > - 모바일: 스크롤바 숨김, 종목분석 폴백 교정, AI분석 말풍선, 순서/접기 카드 동작.
  > - (수동/프리뷰) 모바일 뷰포트에서 종목분석 클릭 플로우·말풍선·접기 애니메이션 시각 확인 권장.
  > 
  > ## 다음 작업
  > - 접기/펼치기 콘텐츠 높이 트랜지션(grid-rows 0fr↔1fr) 폴리시 — 현재는 chevron 회전 + 즉시 토글.
  > - `/stock` 랜딩에 최근 검색·관심 종목 인라인 노출(현재는 검색창 포커스 시 드롭다운).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 접기/펼치기 콘텐츠 높이 트랜지션(grid-rows 0fr↔1fr) 폴리시 — 현재는 chevron 회전 + 즉시 토글.
  - `/stock` 랜딩에 최근 검색·관심 종목 인라인 노출(현재는 검색창 포커스 시 드롭다운).
  - 데스크탑에도 접기/펼치기 옵션 확장 여부 검토(현재 모바일 전용).
  - StockDailyChart 기존 lint 경고(`candleSeries` 미사용 `i`) 정리 — 별도 후속.
### 2026-05-31 — fix(pwa): 스플래시 로고 네이티브 크기 매칭 + 표시시간 연장 (#64)

- **slug**: `pwa-splash-tuning` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/64
- **요약**: fix(pwa): 스플래시 로고 네이티브 크기 매칭 + 표시시간 연장
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 배경 (follow-up of #62)
  > 
  > 설치형 PWA 콜드 로드 시 인앱 스플래시(로고+FinSight)가 실제로 뜨는 건 확인됐으나, 안드로이드(Galaxy S25) 실측에서:
  > 1. 로고가 **네이티브 스플래시보다 작음** — Android 12+ 네이티브 로고는 dp 고정(192dp 원 안 **~158dp**). 우리 인앱 글리프는 96px(h-24)라 확연히 작았음.
  > 2. **너무 짧게 떠서** 잘 안 보임 — 캐시된 PWA에선 `readyState==="complete"` 시 180ms 후 fade.
  > 
  > ## 변경
  > 
  > | 파일 | 내용 |
  > |---|---|
  > | `app/components.css` `.splash-icon` | `h-24`(96px) → **`h-40`(160px)** — 네이티브 ~158dp 매칭. `.splash-screen` gap `gap-lg`→`gap-2xl`(균형) |
  > | `components/pwa/SplashScreen.tsx` | **최소 표시시간 1.2s + load 동시 충족** 후 fade-out(4s 하드 백스톱) — 즉시 사라지던 문제 해결 |
  > | `app/splash-ios/route.tsx` + `app/layout.tsx` | iOS startup-image 로고를 인앱과 **동일 고정 dp(160/36/24 × devicePixelRatio)** 로 렌더 → iOS 시작화면 ↔ 인앱 스플래시 로고 점프 제거 (`&r=` 파라미터 전달) |
  > 
  > 색/글리프 단일 소스(`lib/brand-mark.tsx`) 무변경.
  > 
  > ## 검증
  > 
  > - `npm run build` ✓ Compiled successfully, 타입 0
  > - 컴파일 CSS: `.splash-icon` height=160px, `.splash-screen` gap=24px
  > - `/splash-ios?w=1170&h=2532&r=3` → 200 image/png, 글리프 480px(=160dp×3)로 확대 — 육안 확인(로고 커짐, FinSight 균형 양호). `&r` 없음/비정상값/r=2 모두 200
  > - `/login` HTML: startup-image 11개 모두 `&r=` 포함, 인앱 `.splash-screen` SSR 마운트
  > - ⚠️ **배포 후 실기기**: 콜드 로드 시 로고 네이티브급 크기 + ~1.2초 또렷이 표시, iOS 점프 없음
  > 
  > ## 다음 작업
  > 
  > - 배포 후 iOS·Android 설치형 PWA 콜드 로드 실기기 검증(로고 크기·표시시간).
  > - (관찰 시) MIN_VISIBLE_MS(1.2s) 미세조정.
  > - 별도 트랙: 안드로이드 상태바 1px 선 — 기기 진단(임시 theme-color 변경 + safe-area-inset 확인) 후 fix 결정.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 배포 후 iOS·Android 설치형 PWA 콜드 로드 실기기 검증(로고 크기·표시시간).
  - (관찰 시) MIN_VISIBLE_MS(1.2s) 미세조정.
  - 별도 트랙: 안드로이드 상태바 1px 선 — 기기 진단(임시 theme-color 변경 + safe-area-inset 확인) 후 fix 결정.

### 2026-06-01 — feat(chart): 캔들 툴팁 등락률 표시 + 차트 포커스 아웃라인 제거 (#70)

- **slug**: `feat/chart-tooltip-changepct` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/70
- **요약**: feat(chart): 캔들 툴팁 등락률 표시 + 차트 포커스 아웃라인 제거
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > 종목 분석 가격 차트 호버/클릭 UX 개선 2건.
  > 
  > ## 1. 차트 클릭/탭 시 포커스 아웃라인 제거 (fix)
  > - **증상**: 차트 내부를 클릭/탭하면 굵은 둥근 테두리가 생김 (PC·모바일 공통).
  > - **원인**: recharts 가 a11y(accessibilityLayer)용으로 SVG 내부 zIndex 레이어 `<g>` 에 `tabindex` 부여 → 클릭 시 그 `<g>` 가 포커스를 받아 브라우저 기본 포커스 아웃라인이 그려짐.
  > - **수정**: `app/globals.css` 에 `.recharts-wrapper :focus { outline: none }`(후손 포함) 추가. surface 가 아니라 내부 `<g>` 가 포커스 대상이고 zIndex 값(`_-100`/`_0`/`_100`…)이 가변이라 후손 선택자 사용. 전역 적용 → 앱 내 모든 recharts 차트 동일.
  > 
  > ## 2. 캔들 호버 툴팁에 등락률 표시 (feat)
  > - 고/시/종/저 아래 **등락** 줄 추가: `등락 +14.25% (+1,710)` — 직전 봉 종가 대비(일봉=전일/주봉=전주/월봉=전월) 변동 퍼센트(부호·2자리) + 절대 변동(원).
  > - 한국식 색: 상승 빨강(`signal-up`) / 하락 파랑 / 보합 기본. OHLC 와 얇은 구분선으로 분리.
  > - 워밍업 데이터 덕에 첫 표시 봉도 직전값 존재 → 빈칸 없음.
  > - 라인 모드 툴팁은 종가 단일 표시 유지(요청 범위 외).
  > 
  > ## 검증
  > - `npm run typecheck` 통과
  > - 사용자 로컬 확인: 포커스 테두리 제거 ✅ / 캔들 등락률 표시 ✅
  > 
  > ## 다음 작업
  > - (선택) 라인 모드 툴팁 등락률 — 이번엔 범위 외. 필요 시 priceSeries 에 prevClose 실어 별도 처리.
  > - 기존 차트 후속 백로그(W2 차트 색 hex→토큰화 등)는 [project_stock-chart-followups] 참조.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (선택) 라인 모드 툴팁 등락률 — 이번엔 범위 외. 필요 시 priceSeries 에 prevClose 실어 별도 처리.
  - 기존 차트 후속 백로그(W2 차트 색 hex→토큰화 등)는 [project_stock-chart-followups] 참조.

### 2026-06-01 — test: 스테일 테스트 6개 현행화 — 그린 복구 (#71)

- **slug**: `fix/stale-market-tests` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/71
- **요약**: test: 스테일 테스트 6개 현행화 — 그린 복구
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 최근 PR로 스테일된 테스트 6개를 현행 동작에 맞게 수정(코드 변경 0). main 의 `npm run test` 가 빨강이던 것을 그린으로 복구. **스택의 베이스 PR.**
  > 
  > ## 변경
  > - **market/ticker(3):** 해외지수 진입점이 `fetchOverseasIndex`→`fetchOverseasIndexShared`(L2 store)로 바뀐 것에 mock 매핑 교정.
  > - **market/indices·lib indices(2):** `DEFAULT_INDEX_CODES` 2001→SPX/COMP 변경 기대값 현행화.
  > - **middleware(1):** #58 이후 `/_next/static·image` 는 matcher 제외(함수 미실행) → 함수 직접호출 케이스 제거 + matcher 설정 단언으로 의도 보존.
  > 
  > ## 검증
  > - vitest **181 passed (28 files)**, typecheck/lint 통과.
  > 
  > ## 다음 작업
  > - 스택 다음: `refactor/watchlist-modal-lazy`(PR 1.1). 본 PR 머지 후 base 자동 재타깃.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 스택 다음: `refactor/watchlist-modal-lazy`(PR 1.1). 본 PR 머지 후 base 자동 재타깃.

### 2026-06-01 — perf(watchlist): 추가 모달 지연 로드 (next/dynamic) (#77)

- **slug**: `refactor/watchlist-modal-lazy` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/77
- **요약**: perf(watchlist): 추가 모달 지연 로드 (next/dynamic)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > `WatchlistAddModal` 을 `next/dynamic` + `modalOpen` 게이트로 전환 — 첫 '+ 종목 추가' 클릭 시에만 로드. 동작 보존(UX 변화 0).
  > 
  > (이전 #72 는 베이스(#71 브랜치) 삭제로 자동 closed → 본 PR 로 대체. main 에 rebase 완료, 단건 커밋.)
  > 
  > ## 검증
  > - 합본 QA PASS + 리뷰 APPROVE: docs/qa/stock-meta-store.md. vitest/typecheck/lint/build 그린.
  > 
  > ## 다음 작업
  > - 스택 다음: pickStockName(#73).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 스택 다음: pickStockName(#73).

### 2026-06-01 — chore(stock): stock-meta 후속 정리 (리뷰 nit + roadmap P0 완료) (#78)

- **slug**: `chore/stock-meta-followups` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/78
- **요약**: chore(stock): stock-meta 후속 정리 (리뷰 nit + roadmap P0 완료)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > #76(zustand) 리뷰의 **비차단 nit** 반영(동작 동일) + roadmap P0 '완료' 표기. 독립 PR(base main).
  > 
  > ## 변경
  > - `app/providers.tsx` — `getState()` 조회를 매칭 분기 안으로 + 라우팅 키 prefix 명명 상수화.
  > - `useQueryStockPrice` — placeholderData 시점-스냅샷 주석.
  > - `api-optimization-roadmap.md` — P0 ✅완료(#76) 표기.
  > 
  > ## 검증
  > - typecheck/lint/test(189)/build 그린.
  > - nit #2(셀렉터 전체구독)는 현 규모 OK·구독 변경 리스크로 제외(리뷰어 의견 일치).
  > - npm audit moderate 2건 = transitive postcss(빌드타임), fix 가 next 파괴적 다운그레이드 → 수용·미적용.
  > 
  > ## 다음 작업
  > - P1: 접힌 카드 쿼리 지연 → symbols 클라이언트화 → prefetch.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - P1: 접힌 카드 쿼리 지연 → symbols 클라이언트화 → prefetch.

### 2026-06-01 — perf(api): 호출 최적화 P2 — whitelist staleTime + 차트 청크 관측 + dead 이벤트버스 제거 (#82)

- **slug**: `api-optimization-p2` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/82
- **요약**: perf(api): 호출 최적화 P2 — whitelist staleTime + 차트 청크 관측 + dead 이벤트버스 제거
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > API 호출 최적화 로드맵([api-optimization-roadmap.md](docs/references/api-optimization-roadmap.md)) **P2 트랙 3건**을 한 번에 정리한다. P0(#76)·P1(#79~#81) 머지 이후 남은 미세 정합 + 관측 + dead code 정리.
  > 
  > | P2 | 변경 | 효과 |
  > |---|---|---|
  > | **P2-1** | 화이트리스트 검색 `staleTime` 30s → 300s(5m) | 정적 seed인데 짧은 캐시였던 정합성 nit. symbols 검색(5m)과 통일, 재검색·재진입 BFF 왕복 제거 |
  > | **P2-2** | 일봉 청크 분할 경로에 관측 로그 (`chunks=N (= KIS calls)`) | days 3000 등 큰 범위에서 rate-limit 한도 근접 조기 감지 (수치 변경 전 관측 단계) |
  > | **P2-3** | 죽은 `WORKBENCH_*_EVENT` 이벤트 버스 제거 | dead code 정리, `/analyze` 페이지 -74줄 단순화 |
  > 
  > ## P2-3 상세 — 왜 변환이 아니라 제거인가
  > 
  > 로드맵의 원안은 "이벤트버스 → `useActiveTickerStore` zustand 변환(결합도↓)"이었으나, 실제 코드 점검 결과 **이벤트 버스의 producer/consumer가 코드베이스에 존재하지 않는 dead code**였다:
  > 
  > - `TICKER_CHANGE` **dispatch** → 듣는 곳 0건
  > - `SELECT_HISTORY`/`SELECT_FAVORITE` **listener** → dispatch 0건
  > - `useWorkbenchSession`의 `history`/`favorites` 배열은 **어디서도 렌더되지 않음** (finsight-redesign에서 사이드바 목록 제거 → 클릭 producer 소멸)
  > 
  > 죽은 코드를 store로 바꿔봤자 죽은 store가 되므로 **제거**가 맞다. 목록 UI가 재도입되면 그때 zustand store로 새로 설계한다.
  > 
  > ## 검증
  > 
  > - `npx tsc --noEmit` → exit 0
  > - `eslint` 변경 3파일 → clean
  > - 순감 **-81줄** (+16 / -97)
  > - 기능 무회귀: 제거된 이벤트 핸들러는 발화 경로가 없어 동작 영향 0
  > 
  > ## 다음 작업
  > 
  > - **Phase 3(대형·관망)**: oversized 컴포넌트 분리(`StockDailyChart` CandleBar/Tooltip/useChartData · `WatchlistAddModal` SearchDropdown · `StockSearchContainer` useTabPanel) · `'use client'`/RSC 경계 재설계 · `StockPageLayout` 레이아웃 컴포지션 팩토리.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Phase 3(대형·관망)**: oversized 컴포넌트 분리(`StockDailyChart` CandleBar/Tooltip/useChartData · `WatchlistAddModal` SearchDropdown · `StockSearchContainer` useTabPanel) · `'use client'`/RSC 경계 재설계 · `StockPageLayout` 레이아웃 컴포지션 팩토리.
  - **관측 활용**: P2-2 청크 로그로 `X-Data-Source` 분포 + KIS 실호출 수 정량화 후 차트 staleTime·청크 정책 재검토.
  - **차트 후속 W1~W5**: 차트 색상 토큰화(W2) 등 디자이너 합류/차트 리팩터 시 일괄.
  - 상세 SSOT: [api-optimization-roadmap.md](docs/references/api-optimization-roadmap.md) §4, deferred-followups.

### 2026-06-01 — refactor(bff): route 공통 유틸 bffUtils 추출 + 죽은 라우트 제거 (Wave 1) (#83)

- **slug**: `bff-utils-cleanup` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/83
- **요약**: refactor(bff): route 공통 유틸 bffUtils 추출 + 죽은 라우트 제거 (Wave 1)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > [Phase 3 리팩터·cleanup 순서 계획](docs/references/api-optimization-roadmap.md)의 **Wave 1**. route handler 계층의 헬퍼 중복을 단일 출처로 추출하고, 죽은 라우트를 제거한다. component 작업과 결합 0인 독립 cleanup이라 가장 먼저 진행.
  > 
  > | 항목 | 내용 |
  > |---|---|
  > | **공통 유틸 추출** | `withTimeout`(8개 route 동일)·`delay`(5개)·`jsonWithDataSource`(7개)가 동일 구현으로 중복 → `lib/server/bffUtils.ts` 단일화. `__BFF_TIMEOUT__` 센티넬도 `BFF_TIMEOUT_SENTINEL` 상수로 공유 |
  > | **죽은 라우트 제거** | `/api/stock/search`(클라 호출 0건 — #80에서 클라 직검색 전환) + 전용 mock `lib/mock/stock/search.ts` |
  > 
  > 순감 **-200줄**(+100 / -300).
  > 
  > ## 의도적 미추출 (과추상 방지)
  > - `FALLBACK_TIMEOUT_MESSAGE` — KIS("KIS 서버…") vs OpenDART("OpenDART 서버…") 도메인별 문구가 달라 각 route 로컬 유지
  > - chart route의 `jsonOk`·`toYyyymmdd`·`addDays` — 단일 위치(공유 아님)
  > - `mapErrorToResponse` — route마다 시그니처(매개변수 3~4)가 달라 통합 시 무리한 제네릭 필요
  > 
  > ## 보류 (이번 범위 아님)
  > - `/api/auth/logout` — `/profile`에 로그아웃 메뉴 항목(mock)이 표시되어 기능이 "예정" 상태 → 제거 보류
  > - `/api/stock/daily` — 클라(`useQueryStockDaily`)에서 실사용 중 → 유지
  > 
  > ## 검증
  > - `npx tsc --noEmit` exit 0 (빌드 후 .next 타입 재생성 기준)
  > - `eslint` 변경 10파일 clean
  > - `npm run build` exit 0
  > - route 테스트 **36 그린** (`watchlist`·`market/indices`·`market/ticker`·`auth/login` 라우트 + `stock/price`·`stock/daily` 클라). 특히 auth/login의 `~500ms 지연 후 401` 테스트가 import된 `delay`로 정상 통과 — 동작 동일 확인
  > 
  > ## 다음 작업
  > - **Wave 2a**: 공유 `<SearchDropdown>` 추출 + `WatchlistAddModal` 채택 (`useOutsideClick` 재사용, `search-result-item` 합성 클래스 유지). 접근성(키보드 네비) 보존이 핵심.
  > - **Wave 2b**: `StockSearchContainer` 정리 — W1 `!` 오버라이드 7개 → `.input-search` variant, `useTabPanel` 추출, SearchDropdown 채택.
  > - **Wave 3a/3b**: `StockDailyChart`(558줄) 구조 분리(behavior-preserving) → 차트 토큰화 W2/W5(ux-designer 위임, visual QA).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Wave 2a**: 공유 `<SearchDropdown>` 추출 + `WatchlistAddModal` 채택 (`useOutsideClick` 재사용, `search-result-item` 합성 클래스 유지). 접근성(키보드 네비) 보존이 핵심.
  - **Wave 2b**: `StockSearchContainer` 정리 — W1 `!` 오버라이드 7개 → `.input-search` variant, `useTabPanel` 추출, SearchDropdown 채택.
  - **Wave 3a/3b**: `StockDailyChart`(558줄) 구조 분리(behavior-preserving) → 차트 토큰화 W2/W5(ux-designer 위임, visual QA).
  - 상세 SSOT: [api-optimization-roadmap.md](docs/references/api-optimization-roadmap.md), 계획 파일 `wise-giggling-sunrise.md`.

### 2026-06-01 — refactor(search): useListboxNav 훅 추출 + W1 input-search variant (Wave 2) (#84)

- **slug**: `search-dropdown-extract` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/84
- **요약**: refactor(search): useListboxNav 훅 추출 + W1 input-search variant (Wave 2)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > Phase 3 순서계획 **Wave 2** — 검색 드롭다운 정리. 단, 코드 정독 후 **계획의 "공유 SearchDropdown 컴포넌트" 전제를 재조정**했다(아래 설계 변경 참조).
  > 
  > | 항목 | 내용 |
  > |---|---|
  > | **useListboxNav 훅 추출** | `SearchPanel`(워크벤치)·`WatchlistAddModal`이 손수 구현하던 ↑/↓ 포커스 인덱스 로직을 `hooks/utils/useListboxNav.ts`로 단일화. wrap-around/clamp 파라미터화 |
  > | **W1 input-search variant** | `StockSearchContainer`의 `input !pl-10 !h-14 !text-base ...` 7개 `!` 강제 오버라이드 → `components.css`의 `.input-search` 합성 variant (`bg-white`→`bg-surface` 토큰화 포함) |
  > 
  > ## 설계 변경 (계획 대비 — 정직한 재조정)
  > 계획은 "두 소비자가 검색결과 리스트를 중복 구현 → 공유 `<SearchDropdown>` 추출"이었으나, **3개 소비자**(SearchPanel·WatchlistAddModal·StockSearchContainer)를 정독한 결과 공유 컴포넌트 전제가 약했다:
  > 
  > | | 옵션 요소 | 키보드 네비 | hover |
  > |---|---|---|---|
  > | SearchPanel | `<div role=option>` | **wrap-around** | setFocusIndex |
  > | WatchlistAddModal | `<button>` (disabled) | **clamp** | 없음 |
  > | StockSearchContainer | `<button>` (prefetch) | **없음** | prefetch |
  > 
  > - 진짜 공유물인 `search-result-item(-focus)` 스타일은 **이미 CSS 합성 클래스로 DRY**.
  > - 요소 타입·키보드 의미·hover가 셋 다 달라 단일 컴포넌트로 묶으면 **과추상**(props로 차이 흡수).
  > - 실질 중복은 **키보드 네비 로직**(SearchPanel·WatchlistAddModal 2곳) → 이것만 훅으로 추출하는 게 정답.
  > - `useTabPanel` 추출·SearchDropdown 어댑션은 가치 대비 위험으로 드롭. (사용자 승인 — "useListboxNav 훅 + W1")
  > 
  > ## 동작 parity (behavior-preserving)
  > - **SearchPanel**: ArrowDown `(i+1)%count` / ArrowUp `i<=0?count-1:i-1` — 훅 `wrap:true`와 **수학적으로 동일**. open-on-arrowdown·Enter open 가드·ESC focus 유지 모두 호출 측 유지.
  > - **WatchlistAddModal**: ArrowDown `min(i+1,count-1)` / ArrowUp `max(i-1,0)` — 훅 `wrap:false`와 **동일**. raw-add Enter 우선·activeIdx>=0 가드 유지. (훅의 count 축소 클램프가 방어적으로 추가 — 종목 추가로 navItems 축소 시 out-of-range 방지, 정상 흐름 무영향)
  > 
  > ## 검증
  > - `npx tsc --noEmit` exit 0
  > - `eslint` 변경 파일 clean
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Wave 3a**: `StockDailyChart`(558줄) 구조 분리 — CandleBar/CandleTooltip/ChartShell/포맷터/useChartData를 책임별 파일로(behavior-preserving). 동작·시각 무변경 → tsc/build + 시각 비교 QA.
  - **Wave 3b**: 차트 토큰화 W2(ux-designer 위임, `chart-*` 토큰 11개 + 기존 5색 매핑) + W5 px 토큰 + W3 캔들 검증. 시각 변경 → 수동 2뷰포트 QA.
  - 상세 SSOT: [api-optimization-roadmap.md](docs/references/api-optimization-roadmap.md), 계획 `wise-giggling-sunrise.md`.

### 2026-06-01 — refactor(chart): StockDailyChart 책임별 구조 분리 (Wave 3a) (#85)

- **slug**: `stock-chart-split` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/85
- **요약**: refactor(chart): StockDailyChart 책임별 구조 분리 (Wave 3a)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > Phase 3 순서계획 **Wave 3a** — `StockDailyChart`(558줄) 책임별 구조 분리. **behavior-preserving**(동작·시각 무변경)이 절대 원칙.
  > 
  > 558줄 → **223줄**. 추출 7개 파일:
  > 
  > | 파일 | 책임 |
  > |---|---|
  > | `hooks/stock/useChartData.ts` | fetch(워밍업)+지표계산(MACD/RSI)+보기구간 슬라이스 |
  > | `components/profile/chart/chartTheme.ts` | `C` 색상·`tooltipStyle`·`labelStyle`·`axisProps`·`SYNC_ID` |
  > | `chart/CandleBar.tsx` | 캔들 커스텀 shape |
  > | `chart/CandleTooltip.tsx` | 캔들 OHLC 툴팁 |
  > | `chart/ChartShell.tsx` | 카드 셸 + 차트타입/봉/기간 컨트롤 |
  > | `chart/SubLabel.tsx` | 보조지표 섹션 헤더 |
  > | `lib/utils/chartFormat.ts` | 축·툴팁 포맷터 6종 |
  > 
  > `StockDailyChart.tsx`는 조각 조립 + 서브플롯 레이아웃만 담당.
  > 
  > ## behavior-preserving 보장
  > - **차트 본문 subplot JSX 99줄**은 verbatim 이동 — 원본과 **byte-identical 확인**(diff 0):
  >   ```
  >   git show HEAD~:...StockDailyChart.tsx | sed -n '/① 가격/,/<\/ChartShell>/p'  vs 현재 → IDENTICAL
  >   ```
  > - 추출 조각(CandleBar 캔들 수학·CandleTooltip·ChartShell 컨트롤·useChartData transform)은 로직 그대로 이동, recharts prop 무변경.
  > - **const C 색상·px(`py-[3px]`) 직타는 이 PR에서 건드리지 않음** — 시각 변경 없는 순수 구조 분리(W2 토큰화/W5 px = Wave 3b로 분리해 QA 귀속 명확화).
  > 
  > ## 검증
  > - `npx tsc --noEmit` exit 0
  > - `eslint` 신규 7 + 변경 1파일 clean
  > - `npm run build` exit 0
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Wave 3b**: 차트 토큰화 W2(ux-designer 정식 위임 — `chart-*` 토큰 11개 신규 + 기존 5색 매핑[stroke/fill=signal-up·axisTick=text-muted·grid=border-line·tooltipText=text-strong], DESIGN.md→`design:sync`→`chartTheme.ts`의 `C` 마이그레이션) + W5 px토큰(`ChartRangeDropdown`·`ChartShell` `py-[3px]`) + W3 캔들 wick 시각 검증. 시각 변경 → 수동 2뷰포트 QA.
  - 분리된 `chartTheme.ts`의 `C`가 W2 토큰화의 단일 대상이 됨(이번 분리의 직접 효과).
  - 상세 SSOT: [api-optimization-roadmap.md](docs/references/api-optimization-roadmap.md), 계획 `wise-giggling-sunrise.md`.

### 2026-06-01 — refactor(chart): 차트 색 토큰화 W2/W5 + DESIGN.md drift 해소 (Wave 3b) (#86)

- **slug**: `chart-color-tokens` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/86
- **요약**: refactor(chart): 차트 색 토큰화 W2/W5 + DESIGN.md drift 해소 (Wave 3b)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > Phase 3 순서계획 **Wave 3b (마지막)** — 차트 색 디자인 토큰화. **값 보존(value-preserving)** — 시각 변경 0, 코드의 hex 직타 제거. 추가로, 토큰화가 `design:sync`로 드러낸 **DESIGN.md↔theme.json drift도 함께 해소**(같은 파이프라인 이슈라 동봉).
  > 
  > | 항목 | 내용 |
  > |---|---|
  > | **W2 색 토큰화** | `chartTheme.ts` hex 16색 → 디자인 토큰 참조. DESIGN.md에 `chart-*` 토큰 11개 등록 |
  > | **down 의미 분리** | 하락색 `C.macdLine` → `C.down`(chart-down), hex 동일 #2563eb (PR #85 리뷰 후속) |
  > | **W5 px 토큰** | `ChartRangeDropdown` `py-[6px]` → `py-sm` |
  > | **drift 해소** | DESIGN.md에 누락됐던 fng/gauge/donut/table 토큰 22개 back-port → `design:sync` lossless 복원 |
  > 
  > ## W2 토큰 매핑 (값 보존)
  > - 기존 토큰 재사용(4): 상승색→`signal-up` · 축눈금→`text-muted` · 그리드→`border-line` · 툴팁텍스트→`text-strong`
  > - 신규 chart-*(11): macd/signal/hist-up/hist-down/rsi/ref-ob/ref-os/ref-mid/vol-up/vol-down/down — 기존 hex 그대로
  > - 제외(1): 툴팁 배경 rgba(투명)는 코드 리터럴 유지
  > - recharts는 색 문자열 필요 → `tailwind.theme.json`(6KB, 이미 layout import) 값 참조
  > 
  > ## DESIGN.md drift 해소 (design:sync lossless 복원)
  > `design:sync`(DESIGN.md→theme.json 전체 재생성)가 **빌드를 깨뜨림**을 발견: 과거 F&G 게이지·대시보드 게이지/도넛·공시테이블 토큰이 DESIGN.md를 거치지 않고 theme.json에 **직접 수동병합**돼 있었고, 재생성이 그것들을 누락(→`px-table-cell-px` unknown utility).
  > 
  > **해결**: 누락 토큰을 DESIGN.md(SSOT)에 back-port(값 보존) → `design:sync` 재생성이 lossless가 됨. theme.json은 이제 수동편집 없이 DESIGN.md 단일출처에서 생성.
  > - colors +11: `fng-*` · spacing +9: `home-grid-gap`·`gauge-*`·`donut-*`·`table-*`·`disclosure-row-py` · typography +2: `gauge-score`·`table-cell-numeric`
  > - prune: dead `fontFamily.table-cell-numeric`(`font-table-cell-numeric` 사용 0건)
  > - **HEAD 대비 토큰 값 변경 0건**(검증 스크립트), 손실은 의도한 dead 토큰 1개뿐. theme.json 재정렬은 재생성 산물.
  > 
  > ## 검증
  > - `design:sync` → `npm run build` exit 0 (unknown utility 에러 0) · `tsc --noEmit` 0 · `eslint` clean · 테스트 **189** · `design.md lint` errors=0
  > - **값 보존 확인**: chart-* 11색 hex가 기존 `C` 리터럴과 전부 일치, drift 토큰 22개 값 일치
  > - ⚠️ 시각 회귀는 사람 눈 확인 권장: `/stock/[ticker]` 차트 색 + 대시보드 F&G 게이지/도넛/공시테이블이 분리 전과 동일한지. W3(캔들 wick 좌표)도 장대봉/상한가로 확인.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (Phase 3 순서계획 Wave 1~3b 완료) 로드맵 보류 항목만 잔존: middleware→proxy(현상유지)·W4 MACD 0패딩(워밍업으로 시각 차단).
  - 차후 디자인 토큰 추가 시 **반드시 DESIGN.md 경유**(직접 theme.json 편집 금지 — 이번에 drift 환원으로 design:sync 신뢰성 복원됨).

### 2026-06-01 — chore(proxy): middleware → proxy 파일 컨벤션 마이그레이션 (Next 16) (#87)

- **slug**: `middleware-to-proxy` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/87
- **요약**: chore(proxy): middleware → proxy 파일 컨벤션 마이그레이션 (Next 16)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > Next 16 deprecation 경고 제거 — `middleware` 파일 컨벤션이 `proxy` 로 리네임됨([공식 안내](https://nextjs.org/docs/messages/middleware-to-proxy)). **순수 리네임**(동작·Edge 런타임·로직 무변경).
  > 
  > 빌드 경고:
  > ```
  > ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  > ```
  > 
  > ## 변경
  > | 변경 | 내용 |
  > |---|---|
  > | `middleware.ts` → `proxy.ts` | `git mv`, export 함수 `middleware` → `proxy` |
  > | `config`(matcher)·import·로직 | **무변경** (Edge 런타임·비밀번호 게이트 로직 그대로) |
  > | `__tests__/middleware.test.ts` → `proxy.test.ts` | import·11개 호출·describe·헤더 갱신 |
  > 
  > 비밀번호 게이트(`app-password-gate`, PR #48)의 모든 분기(게이트 비활성 통과·세션 검증·`/api/*` 401·페이지 `/login` 리다이렉트·OG 크롤러 예외·open-redirect 차단)는 그대로다.
  > 
  > ## 검증
  > - `npm run build` exit 0 — **deprecation warning 사라짐 확인**(`middleware-to-proxy` grep 0), Proxy 라우트 정상 인식(`ƒ Proxy`)
  > - `tsc --noEmit` 0 · `eslint` clean
  > - 테스트 **189 그린** (proxy 게이트 테스트 16건 포함 — import/호출 갱신 후 전부 pass)
  > 
  > ## 참고
  > - 코드모드(`npx @next/codemod middleware-to-proxy .`)도 있으나 변경이 사소해 수동 적용(파일+함수+테스트 리네임).
  > - 실제 파일 import는 테스트 1곳뿐이라 영향 최소. 나머지 `middleware` 언급은 PRD/QA 문서의 역사적 서술이라 보존.
  > 
  > ## 다음 작업
  > - (로드맵 보류 항목 정리) Phase 3 순서계획 Wave 1~3b + 본 마이그레이션으로 cleanup chore 대부분 소진. 잔존: W4 MACD 0패딩(워밍업으로 시각 차단, 지표 정확도 작업 시)·W3 캔들 wick 수동 시각검증.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (로드맵 보류 항목 정리) Phase 3 순서계획 Wave 1~3b + 본 마이그레이션으로 cleanup chore 대부분 소진. 잔존: W4 MACD 0패딩(워밍업으로 시각 차단, 지표 정확도 작업 시)·W3 캔들 wick 수동 시각검증.

### 2026-06-01 — fix(cleanup): logout 버튼 동작 연결 + watchlist 이중재시도 제거 (#88)

- **slug**: `cleanup-logout-retry` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/88
- **요약**: fix(cleanup): logout 버튼 동작 연결 + watchlist 이중재시도 제거
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > cleanup 배치 — 사용자 지목 5건 중 **실제 작업 2건**(나머지 3건은 조사 결과 작업 불필요).
  > 
  > ### 1) logout 버튼 동작 연결
  > `/profile` 설정 메뉴의 로그아웃이 **죽은 버튼**(onClick 0건, 클릭 무동작)이었다. `/api/auth/logout` 라우트(쿠키 삭제)는 이미 있었으나 호출처가 0이었다.
  > - `lib/api/auth/logout.ts` — 클라 어댑터(httpClient → BFF, login.ts 정합)
  > - `hooks/auth/useLogout.ts` — 도메인 훅(쿠키삭제 → `/login` full navigation, `useLogin` 성공이동과 정합; 실패해도 게이트가 재검증하므로 로그인 화면으로)
  > - `components/profile/LogoutMenuButton.tsx` — client 컴포넌트(서버인 SettingsMenuCard가 onClick 못 달아 danger 항목만 분리). 마크업·토큰은 기존 danger MenuButton과 동일(**시각 무변경**), onClick·pending만 추가
  > - `SettingsMenuCard`(서버 유지) danger 항목 → `LogoutMenuButton` 교체
  > 
  > ### 2) watchlist 이중 재시도 제거
  > `useQueryWatchlist` `retry:1` → `0`. BFF(`/api/watchlist`)가 이미 transient(EGW00201/네트워크) **1회 재시도 + mock graceful degrade**를 하므로, RQ가 또 재시도하면 실패 시 KIS 일괄콜이 **최대 4회로 증폭**된다. BFF degrade 결과를 그대로 수용.
  > 
  > ## 조사 결과 — 작업 불필요로 판명된 3건 (정직 보고)
  > - **ASSET_TYPE_* 데드코드**: 코드베이스에 **이미 0건**(과거 제거됨, 메모가 stale). 작업 없음.
  > - **"profile/[ticker] retry 중첩"**: 메모가 **부정확**했음. 종목상세는 disclosure `retry:0`·price/chart엔 BFF withRetry 없음 → 이중재시도 없음. 실제 대상은 **watchlist**였고 위 2)로 처리.
  > - **wasLastCallDegraded per-call화**: `UpstashKisStore`의 공유 인스턴스 필드 → per-call 정밀화는 **store 인터페이스+token.ts+테스트를 건드리는 동시성 리팩터**라 비차단 보류(메모도 "선택/비차단").
  > - **.input-search 토큰**: `h-14`/`pl-10`/`text-base`는 **표준 Tailwind 스케일 클래스**(arbitrary `[56px]` 아님) → 이미 px 직타 룰 준수. 일회용 토큰 신설은 블로트라 유지.
  > 
  > ## 검증
  > - `npx tsc --noEmit` 0 · `eslint` 변경/신규 clean · `npm run build` 0 · 테스트 **189**
  > - ⚠️ logout은 인터랙션이라 자동 테스트 없음(레포에 컴포넌트 테스트 0) → **수동 QA 필요**: `/profile` 로그아웃 클릭 → 쿠키 삭제 → `/login` 이동(게이트 활성 시). watchlist retry는 코드/콜 흐름 정적 검증.
  > 
  > ## 다음 작업
  > - (cleanup 소진) 남은 후속: 기능트랙(수급 페이지·내자산 실데이터 — PRD 필요) · 관측(X-Data-Source 분포 정량화) · 보류(W3/W4 차트 시각·wasLastCallDegraded 동시성).
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (cleanup 소진) 남은 후속: 기능트랙(수급 페이지·내자산 실데이터 — PRD 필요) · 관측(X-Data-Source 분포 정량화) · 보류(W3/W4 차트 시각·wasLastCallDegraded 동시성).

### 2026-06-01 — feat(flow): 수급 — 홈 외국인/기관 Top10 + 종목상세 수급 (2표면) (#89)

- **slug**: `investor-flow` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/89
- **요약**: feat(flow): 수급 — 홈 외국인/기관 Top10 + 종목상세 수급 (2표면)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 수급 기능 — **2표면 통합** 신규(독립 페이지·nav 없음). 외국인/기관 수급을 두 곳에서 보여준다.
  > 
  > | 표면 | 내용 | KIS API |
  > |---|---|---|
  > | **A. 홈 Top10 카드** | 외국인·기관 **당일 순매수 거래대금 상위 10**(시장 합산). 2열 병치(모바일 Top5+더보기), 금액(억원)+수량 병기, 등락률 부호색, 행 클릭→`/stock` prefetch, 기준시각 | `foreign_institution_total` (FHPTJ04400000) |
  > | **B. 종목상세 수급 섹션** | per-stock **개인/외국인/기관 최근 15일** 순매수(합계 3칸+일자별 표, 순매수 빨강/순매도 파랑), collapsible | `inquire_investor` (FHKST01010900, 실전·모의 둘 다) |
  > 
  > ## 데이터·게이트
  > - BFF 단일진입(`/api/flow/top10`·`/api/stock/investors`), KIS 호출은 `lib/api/kis/investor-flow.ts`+route handler에만 격리. 클라 직접 `fetch(` 0.
  > - **mock-first**: 표면 A = prod 이중게이트(`isKisConfigured()&&resolveKisEnv()==="prod"` 아니면 `X-Data-Source: mock`). 표면 B = inquire_investor가 실전·모의 둘 다라 느슨 게이트.
  > - `lib/server/bffUtils.ts`(withTimeout·jsonWithDataSource·delay) 재사용. queryKeys/queryConfig 단일위치 추가.
  > 
  > ## 라이브 검증 (QA, dev에 KIS prod 키)
  > - 표면 A `/api/flow/top10` → `x-data-source: kis`, **외국인·기관 각 10행, 거래대금 내림차순 정렬 확인**(FHPTJ04400000 0000 합산 라이브 동작 = q1 해소).
  > - 표면 B `/api/stock/investors?ticker=005930` → `x-data-source: kis`, 15일 절단, 음수(순매도) 부호 보존.
  > - 게이트 분기(demo→A mock/B kis), 단위환산(백만원/100=억원), design:sync 멱등, 189 테스트, 빌드 0.
  > 
  > ## 범위·결정
  > - **7일 누적 = 비목표**(본 TR들로 직접 불가 → 후속 트랙). 표면 A="당일", B="최근 N일" 라벨로 오인 방지.
  > - 신규 디자인 토큰 0(기존 재사용, 24px=`w-6`·520px=`min-w-[520px]` one-off로 design:sync drift 회피).
  > - 조회·분석 전용 스코프 정합(주문 무관).
  > 
  > ## 검증
  > - `tsc --noEmit` 0 · `eslint` clean · `npm run build` 0(두 라우트 등록) · `vitest` 189 · `design:sync` 멱등 · 라이브 KIS 라운드트립 OK
  > - 반응형 2뷰포트(A 2열↔모바일 세로/Top5, B 표 가로스크롤), collapsible 접힘 시 쿼리 미실행, 종목 행 키보드 접근
  > - 비차단 nit 2: 표면 A `0.0억원` 미세표기, mock 수량 환산(사용자영향 0)
  > 
  > ## 다음 작업
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Phase 4 (라이브 prod 검증)**: dev에선 라이브 동작 확인됨. Vercel prod 배포 후 장중 가집계 시각(외국인 09:30~/기관 10:00~)·주말·휴장 빈상태 실측. `FID_INPUT_ISCD=0000` 합산이 KOSPI+KOSDAQ 전체인지 종목 구성 확인.
  - **7일 누적 수급**(후속 트랙): per-stock 풀 합산 or 당일 스냅샷 캐시 적립.
  - nit: 표면 A `0.0억원`→`0억원` 표기, 표면 B 미니차트(현재 표).

### 2026-06-01 — fix(flow): 홈 Top10 외국인/기관 한쪽 빈 컬럼 — EGW00201 재시도 (hotfix) (#90)

- **slug**: `hotfix/flow-foreign-empty` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/90
- **요약**: fix(flow): 홈 Top10 외국인/기관 한쪽 빈 컬럼 — EGW00201 재시도 (hotfix)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약 (hotfix)
  > 
  > 홈 "외국인·기관 순매수 Top10" 카드에서 **한쪽 컬럼(외국인 또는 기관)만 비어 공백으로 뜨는** 문제 수정.
  > 
  > ## 원인 (라이브 재현·확정)
  > - BFF `/api/flow/top10`는 주체 2콜(`fetchForeignInstitutionTotal("frgn")`+`("orgn")`)을 순차 호출. `safeFetch`가 transient 실패를 **빈 배열로 degrade**(부분 성공 허용).
  > - **홈 진입 시** 지수·티커 등 다른 KIS 위젯과 동시 호출이 겹치면, 주체 콜 하나가 KIS **초당 한도(EGW00201)** 에 걸려 실패 → 빈 컬럼.
  > - **단독 호출은 항상 정상**(외국인 10/기관 10). 동시 부하에서만 간헐 발생 — 타이밍에 따라 외국인(스샷) 또는 기관(재현 round2: 기관 0)이 빔.
  > 
  > ## 수정
  > 1. **transient 1회 재시도**: `safeFetch`가 EGW00201/네트워크 실패 시 250ms backoff 후 1회 재시도 (`watchlist` route `withRetry` 패턴 정합). BFF 타임아웃 sentinel만 상위 전파.
  > 2. **빈 컬럼 UX**: 한 주체만 비면 공백 대신 안내 문구(`FLOW_TOP10_COLUMN_EMPTY`) + **'다시 시도' 버튼**(카드 refetch) — 진짜 집계 전(장전)이거나 재시도 후에도 실패 시 사용자 복구.
  > 
  > ## 검증 (라이브 동시부하 재현)
  > - 수정 전: 동시부하 시 빈 컬럼 발생(재현됨).
  > - 수정 후: **동시부하 8회 → 0/8 빈 컬럼**(외국인/기관 각 10행 정상).
  > - `tsc --noEmit` 0 · `eslint` clean · `npm run build` 0 · 테스트 189.
  > - 신규 디자인 토큰 0. 데이터/스키마 변경 0(BFF 재시도 + UI 분기만).
  > 
  > ## 다음 작업
  > - (해소) 동일 패턴 다른 멀티콜 라우트는 이미 retry 보유(watchlist). 신규 멀티콜 KIS 라우트 추가 시 transient 재시도 의무화 — 컨벤션 메모.
  > - 기존 후속(7일 누적·mock 수량 스케일·표면B 미니차트)은 별도 트랙 유지.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - (해소) 동일 패턴 다른 멀티콜 라우트는 이미 retry 보유(watchlist). 신규 멀티콜 KIS 라우트 추가 시 transient 재시도 의무화 — 컨벤션 메모.
  - 기존 후속(7일 누적·mock 수량 스케일·표면B 미니차트)은 별도 트랙 유지.

### 2026-06-01 — fix(watchlist): 새로고침을 아이콘 버튼으로 (크기 착시 해소) (#91)

- **slug**: `fix/watchlist-button-size` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/91
- **요약**: fix(watchlist): 새로고침을 아이콘 버튼으로 (크기 착시 해소)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 관심종목 페이지 "새로고침" 버튼을 **텍스트 없는 아이콘 버튼**(`button-icon`, RefreshCw만)으로 교체.
  > 
  > ## 배경
  > 새로고침(아웃라인 텍스트 버튼)이 "+ 종목 추가"(채움 버튼) 옆에서 **크기가 달라 보이는 착시**(아웃라인 vs 채움). 높이·폰트를 맞춰도 스타일 차이로 남는 시각 불일치를, 새로고침을 아이콘 버튼으로 바꿔 **매칭 고민 자체를 제거**(토스 패턴).
  > 
  > ## 변경
  > - `components/watchlist/WatchlistPage.tsx`: 새로고침 `button-secondary`(텍스트+아이콘) → `button-icon`(아이콘만). `aria-label`로 접근성 유지(텍스트 없어도 스크린리더는 "새로고침"/"새로고침 중"). 스핀 애니메이션·`disabled` 유지. 반응형 분기 없어 PC·모바일 공통.
  > 
  > ## 검증
  > - `tsc --noEmit` 0 · `eslint` clean · `npm run build` 0 · 신규 토큰 0(기존 `button-icon`)
  > 
  > ## 다음 작업
  > - 시각 마이너 폴리시 — 후속 없음.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 시각 마이너 폴리시 — 후속 없음.

### 2026-06-01 — feat(stock): 기업개황 업종에 큰 업종·상세 업종 병기 (#92)

- **slug**: `company-industry-name` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/92
- **요약**: feat(stock): 기업개황 업종에 큰 업종·상세 업종 병기
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 종목 분석 기업개황의 **업종** 행에 "무엇을 하는 회사인지" 맥락을 강화한다. 큰 업종(KRX 섹터) · 상세 업종(표준산업분류)을 병기한다.
  > 
  > | 종목 | 업종 행 표시 |
  > |---|---|
  > | 삼성전자 | 전기·전자 · 통신 및 방송 장비 제조업 |
  > | SK하이닉스 | 전기·전자 · 반도체 제조업 |
  > | 카카오 | IT 서비스 · 자료처리, 호스팅, 포털… |
  > | 현대차 | 운송장비·부품 · 자동차용 엔진 및 자동차 제조업 |
  > | 셀트리온 | 제약 · 기초 의약물질 및 생물학적 제제 제조업 |
  > 
  > ## 변경
  > - **큰 업종(섹터)**: KIS `bstp_kor_isnm`(inquire-price)을 `StockPrice.sector`로 노출. `mapStockPrice` 매핑.
  > - **상세 업종**: KIS `std_idst_clsf_cd_name`(search-stock-info) override — 기존 동작 유지.
  > - `CompanyOverview`가 `composeIndustry(price.sector, company.industry)`로 ` · ` 병기. 동일값/누락 graceful.
  > - 단위 테스트 보강(sector·industryName 추출·공백→undefined).
  > 
  > ## 설계 판단
  > 1. **broad 소스 = `bstp_kor_isnm`** — search-stock-info `idx_bztp_mcls`는 일부 종목에서 지수 멤버십(`KOGI지배구조지수`·`증권`)을 반환해 불안정. 라이브 프로브로 확인 후 폐기.
  > 2. **추가 KIS 콜 0** — 섹터는 StockHeader가 이미 패칭한 price 쿼리 캐시 재사용(클라이언트 병기). 서버 중복 inquire-price 회피(#90 EGW00201 스로틀 정합).
  > 
  > ## 검증
  > - tsc 0 · eslint 0 · vitest 193/193 · `npm run build` 성공
  > - 라이브(prod 키): 위 표 5종목 실응답 확인(`X-Data-Source: kis`)
  > 
  > ## 다음 작업
  > - 자유 텍스트 기업 설명(DART 사업보고서 파싱)은 별도 트랙(중량 작업)으로 분리.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 자유 텍스트 기업 설명(DART 사업보고서 파싱)은 별도 트랙(중량 작업)으로 분리.

### 2026-06-02 — feat(theme): 다크모드 PR1 — 토큰 CSS 변수화(--fs-*) + 3-state 토글 인프라 (#93)

- **slug**: `dark-mode` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/93
- **요약**: feat(theme): 다크모드 PR1 — 토큰 CSS 변수화(--fs-*) + 3-state 토글 인프라
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 다크모드 도입 시리즈 **PR1 — 토큰 CSS 변수화 + 토글 인프라**. light/dark/system 3-state 다크모드의 기반을 깐다.
  > 
  > > **핵심 불변식: 이 PR 머지 후 화면 100% 동일 (dark=light 동일값, 시각 무변경).** 실제 다크 팔레트는 PR2.
  > 
  > PRD: `docs/prd/dark-mode.md` · 계획: 5-PR 분할(인프라→팔레트→차트→메타/이미지→검증).
  > 
  > ## 어떻게
  > 
  > - **토큰 CSS 변수 indirection**: `tailwind.config.ts`의 `adaptDesignTokens()`가 색 48키를 hex가 아닌 `var(--fs-<key>)` 참조로 매핑. 실제 hex는 `app/theme-vars.css`(`:root` light / `html.dark` dark)가 선언. → 기존 컴포넌트 240여 곳·합성토큰 106개 **수정 0**으로 자동 전환 준비.
  >   - 프리픽스 `--fs-` (Tailwind v4가 예약하는 `--color-*`와 충돌 회피).
  >   - `darkMode: "class"`.
  > - **생성 파이프라인**: `scripts/inject-color-themes.mjs`(`inject-breakpoints.mjs` 선례 복제)가 theme.json의 light hex + DESIGN.md `colors-dark:`(아직 없음→PR1은 dark=light 폴백)를 읽어 `app/theme-vars.css` 생성 + 키셋 1:1 검증. `package.json` `design:sync`에 체이닝.
  > - **테마 상태(자체 구현, next-themes 미도입)**: `lib/store/theme/store.ts`(localStorage 격리, `finsight:theme`) + `lib/store/themeStore.ts`(Zustand 3-state + resolvedTheme) + `components/theme/ThemeProvider.tsx`(하이드레이션 + matchMedia + cross-tab storage 구독).
  > - **FOUC 방지**: `app/layout.tsx` `<head>` raw 인라인 스크립트(hydration 전 동기 dark 클래스 적용).
  > - **토글 UI**: `components/theme/ThemeMenuButton.tsx`(SettingsMenuCard THEME 항목 client 분리, light/dark/system 세그먼트).
  > 
  > ## 검증 (게이트)
  > 
  > - `typecheck` / `lint` / `build` 통과.
  > - 빌드 CSS 인라인 확인: 포커스링 `theme(colors.accent-soft)`→`var(--fs-accent-soft)`, 알파 수정자 `bg-surface/80`→`color-mix`, `--color-*` 충돌 0.
  > - 신규 직타 hex 0. theme-vars.css 48키 light=dark 완전 동일(시각 무변경 불변식).
  > 
  > ## 다음 작업
  > 
  > - **PR2 (다크 팔레트)**: `docs/design/finsight-redesign.md`에 `colors-dark:` + `surface-elevated` 신규 토큰(49→50키, 깊은 청회슬레이트 톤, WCAG AA 4.5:1) 정의 → `design:sync`가 키셋 1:1 검증 후 theme-vars.css의 `html.dark` 블록을 실제 다크값으로 재생성. 이 시점 처음으로 다크 시각 분기(차트 제외). PR1의 dark=light 폴백 자동 해제.
  > - **PR3 (차트 런타임)**: recharts는 CSS 변수 자동전환 불가 → `hooks/utils/useChartTheme.ts`로 `getComputedStyle` 런타임 read. `chartTheme.ts` 소비처 전수 전환.
  > - **PR4 (메타/이미지)**: `viewport.themeColor` media 배열 + 명시선택 런타임 `<meta theme-color>` 교체 + in-app 스플래시 다크. 파비콘/OG는 light 고정.
  > - **PR5 (검증/마감)**: 직타 hex 전수조사 + WCAG 대비 검사 + 전 표면 QA 체크리스트.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR2 (다크 팔레트)**: `docs/design/finsight-redesign.md`에 `colors-dark:` + `surface-elevated` 신규 토큰(49→50키, 깊은 청회슬레이트 톤, WCAG AA 4.5:1) 정의 → `design:sync`가 키셋 1:1 검증 후 theme-vars.css의 `html.dark` 블록을 실제 다크값으로 재생성. 이 시점 처음으로 다크 시각 분기(차트 제외). PR1의 dark=light 폴백 자동 해제.
  - **PR3 (차트 런타임)**: recharts는 CSS 변수 자동전환 불가 → `hooks/utils/useChartTheme.ts`로 `getComputedStyle` 런타임 read. `chartTheme.ts` 소비처 전수 전환.
  - **PR4 (메타/이미지)**: `viewport.themeColor` media 배열 + 명시선택 런타임 `<meta theme-color>` 교체 + in-app 스플래시 다크. 파비콘/OG는 light 고정.
  - **PR5 (검증/마감)**: 직타 hex 전수조사 + WCAG 대비 검사 + 전 표면 QA 체크리스트.

### 2026-06-02 — feat(theme): 다크모드 PR2 — 다크 팔레트 49값 + surface-elevated (깊은 청회슬레이트) (#94)

- **slug**: `dark-mode-palette` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/94
- **요약**: feat(theme): 다크모드 PR2 — 다크 팔레트 49값 + surface-elevated (깊은 청회슬레이트)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 다크모드 시리즈 **PR2 — 다크 팔레트 49값 + surface-elevated**. PR1(토큰 CSS 변수화 인프라) 위에서, 다크모드의 실제 "룩"이 처음 적용된다. 기본값 system이므로 **머지 후 다크 OS 사용자에게 즉시 다크 UI 노출**.
  > 
  > PRD: `docs/prd/dark-mode.md`.
  > 
  > ## 어떻게
  > 
  > - **`docs/design/finsight-redesign.md`(SSOT)**: light `colors`에 `surface-elevated`(=#ffffff, surface 동일→light 무회귀) 추가 + **`colors-dark:` 49키 블록**(깊은 청회슬레이트 베이스) 신설 + 본문 다크 팔레트 섹션.
  >   - 면 명도 위계: `surface-muted #0e141b` < `surface #161d26` < `surface-elevated #1d2630` < `border-line #2a333e` — 다크에서 그림자 대신 명도로 부상.
  >   - 순백/순흑 회피: `text-strong #e6edf3` / `text-muted #9aa6b2`.
  >   - 한국식 등락: `signal-up #c81e1e→#f47171`(빨강) / `signal-down #1d4ed8→#5b9bff`(파랑), soft는 짙은 저명도 틴트.
  > - **`app/theme-vars.css` / `tailwind.theme.json`**: `design:sync` 산출물 자동 재생성(49키 light/dark, 키셋 1:1 검증 통과).
  > - **surface-elevated 와이어링**: `app/components.css`의 `.dropdown-panel`/`.drawer` + `WatchlistAddModal`(유일 dialog)을 `bg-surface-elevated`로. 떠있는 면만, 일반 카드는 surface 유지. light 무회귀.
  > 
  > ## 검증
  > 
  > - **QA qa-passed** (`docs/qa/dark-mode.md` PR2 라운드): 7라우트 × light/dark × 데스크톱/모바일 = 28컷 + 자동 WCAG 대비 스캔. **전 텍스트 요소 sub-threshold 0건, 육안 시인성 깨짐 0.** 등락색 명확 구분, elevation 명도 위계 라이브 확인, 테마 토글 3-state a11y 정상.
  > - **Review approved**: SSOT 규율(DESIGN.md 경유, theme-vars 바이트동일 재생성), 키셋 1:1, elevated 와이어링 적절성, WCAG 표 정확성.
  > - WCAG AA: 본문 31페어 4.5:1+, UI 9페어 3:1+ (0 FAIL).
  > - typecheck/lint/build 0 에러.
  > 
  > ## 다음 작업
  > 
  > - **PR3 (차트 런타임 테마)**: recharts는 색 문자열 prop이라 CSS 변수 자동전환 불가 → `hooks/utils/useChartTheme.ts`로 `getComputedStyle` 런타임 read. `chartTheme.ts`(tooltipBg rgba 등) 소비처 전수 전환. CandleTooltip elevated 정합.
  > - **PR4 (메타/이미지)**: `viewport.themeColor` media 배열 + 명시선택 런타임 `<meta theme-color>` 교체 + in-app 스플래시(`.splash-screen`) 다크. 파비콘/OG는 light 고정.
  > - **PR5 (검증/마감)**: 직타 hex 전수조사 + INFO-PR2-1(search-result-item 톤) 폴리시 + 주석 49키 정합 + 전 표면 최종 QA.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR3 (차트 런타임 테마)**: recharts는 색 문자열 prop이라 CSS 변수 자동전환 불가 → `hooks/utils/useChartTheme.ts`로 `getComputedStyle` 런타임 read. `chartTheme.ts`(tooltipBg rgba 등) 소비처 전수 전환. CandleTooltip elevated 정합.
  - **PR4 (메타/이미지)**: `viewport.themeColor` media 배열 + 명시선택 런타임 `<meta theme-color>` 교체 + in-app 스플래시(`.splash-screen`) 다크. 파비콘/OG는 light 고정.
  - **PR5 (검증/마감)**: 직타 hex 전수조사 + INFO-PR2-1(search-result-item 톤) 폴리시 + 주석 49키 정합 + 전 표면 최종 QA.

### 2026-06-02 — feat(theme): 다크모드 PR3 — 차트 런타임 테마 (useChartTheme) (#95)

- **slug**: `dark-mode-chart` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/95
- **요약**: feat(theme): 다크모드 PR3 — 차트 런타임 테마 (useChartTheme)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 다크모드 시리즈 **PR3 — 차트 런타임 테마**. recharts 차트(StockDailyChart: 캔들/거래량/MACD/RSI)가 다크에서 색이 안 바뀌던 문제 해결. recharts는 색을 문자열 prop으로 받아 CSS 변수 자동전환이 안 통하므로, 런타임에 `--fs-*`를 읽어 테마별 색을 주입한다.
  > 
  > PRD: `docs/prd/dark-mode.md`.
  > 
  > ## 어떻게
  > 
  > - **`hooks/utils/useChartTheme.ts`(신규)**: `useThemeStore`의 `resolvedTheme` 구독 + `getComputedStyle(documentElement)`로 `--fs-*` 런타임 read → `C`/`tooltipStyle`/`labelStyle`/`axisProps` 재생성. SSR/첫 렌더는 themeJson light 폴백, 마운트 후 swap. 테마 전환 시 새 객체 → recharts 리렌더.
  > - **`components/profile/chart/ChartThemeContext.tsx`(신규)**: recharts가 `shape`/`content`로 clone하는 `CandleBar`/`CandleTooltip`엔 props 주입이 어려워, StockDailyChart가 훅 1회 호출 → Provider로 차트 서브트리에 전달(getComputedStyle 중복 호출 회피).
  > - 툴팁 rgba(알파라 토큰화 불가)는 `resolvedTheme` 분기 — dark는 어두운 반투명 `rgba(29,38,48,0.85)`(surface-elevated 톤) + 밝은 보더.
  > - `chartTheme.ts` 삭제(훅으로 흡수), 소비처 전수 전환.
  > 
  > ## 검증
  > 
  > - **QA qa-passed** (`docs/qa/dark-mode.md` PR3 라운드): 차트 4종 다크 SVG 색이 `--fs-chart-*`/`--fs-signal-*`와 1:1 일치(런타임 read 성공). 캔들 상승 #f47171(6.56:1)/하락 #5b9bff(6.68:1), MACD/RSI/툴팁 가독. light 무회귀, 라이브 토글 reload 없이 즉시 swap.
  > - **Review approved**: hook 규칙 준수·SSR 가드·Context 적절성·무회귀(15토큰 1:1)·rgba 분기·chartTheme.ts 삭제 안전.
  > - typecheck/lint/build 0 에러.
  > 
  > ## 다음 작업
  > 
  > - **PR4 (메타/이미지)**: `app/layout.tsx` `viewport.themeColor` media 배열(light #ffffff / dark #0e141b) + ThemeProvider effect로 명시선택 시 `<meta name="theme-color">` 런타임 교체 + in-app 스플래시(`SplashScreen.tsx`·`splash-ios/route.tsx`) 다크. 파비콘/OG는 light 고정.
  > - **PR5 (검증/마감)**: 직타 hex 전수조사 + INFO-PR2-1(search-result-item 톤)·INFO-PR3-2(거래량 봉 저대비) 폴리시 검토 + 전 표면 최종 QA.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR4 (메타/이미지)**: `app/layout.tsx` `viewport.themeColor` media 배열(light #ffffff / dark #0e141b) + ThemeProvider effect로 명시선택 시 `<meta name="theme-color">` 런타임 교체 + in-app 스플래시(`SplashScreen.tsx`·`splash-ios/route.tsx`) 다크. 파비콘/OG는 light 고정.
  - **PR5 (검증/마감)**: 직타 hex 전수조사 + INFO-PR2-1(search-result-item 톤)·INFO-PR3-2(거래량 봉 저대비) 폴리시 검토 + 전 표면 최종 QA.

### 2026-06-02 — feat(theme): 다크모드 PR4 — themeColor 런타임 교체 + 스플래시 다크 (#96)

- **slug**: `dark-mode-meta` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/96
- **요약**: feat(theme): 다크모드 PR4 — themeColor 런타임 교체 + 스플래시 다크
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 다크모드 시리즈 **PR4 — 메타/이미지(themeColor + 스플래시)**. 자동 전환이 안 되는 메타/이미지 영역의 다크 대응. 사용자 확정 범위: in-app 스플래시까지 다크, 파비콘·OG는 light 고정.
  > 
  > PRD: `docs/prd/dark-mode.md`.
  > 
  > ## 어떻게
  > 
  > - **themeColor(상태바)**: `app/layout.tsx` `viewport.themeColor`를 light/dark media 배열(`#ffffff`/`#0e141b`)로 → system 자동 전환. 명시 선택(OS와 다를 때)은 `lib/store/themeStore.ts` `applyThemeMetaColor()`가 **별도 media 없는 `<meta name=theme-color>`를 런타임 교체**(문서 순서상 마지막+항상매칭이라 OS media를 덮음). FOUC 스크립트도 첫 페인트에 동일 처리.
  > - **in-app 스플래시**: `.splash-screen` `bg-surface dark:bg-surface-muted` — **light #ffffff(네이티브 스플래시·manifest 정합, 무회귀)** / dark #0e141b(앱 베이스 정합).
  > - **iOS startup image**: `app/splash-ios/route.tsx`에 `theme=dark` 분기(배경 #0e141b + 워드마크 #e6edf3), `APPLE_STARTUP_IMAGES`가 기기별 light/dark media 변형(dark는 `&theme=dark`).
  > - **light 고정**: 파비콘·OG·manifest·statusBarStyle(default 유지, 상태바 글자색은 iOS 적응형).
  > 
  > ## 검증
  > 
  > - **QA qa-passed** (`docs/qa/dark-mode.md` PR4 라운드): themeColor 정적 2태그 + 런타임 non-media 교체(media 2태그 보존, 충돌 0), FOUC 첫 페인트 적용, in-app 스플래시 dark #0e141b, iOS startup dark PNG(#0e141b/#e6edf3) 22변형, light 무회귀.
  > - **Review**: meta 우선순위 전략(`:not([media])` 덮어쓰기) 안전·SSR 이중가드·dark hex 토큰 정합·startup 페어링 정확. 지적된 B1(스플래시 light 회귀)은 `bg-surface dark:bg-surface-muted`로 수정 완료(light #ffffff 복원).
  > - typecheck/lint/build 0 에러.
  > 
  > ## 다음 작업
  > 
  > - **PR5 (검증/마감)**: 직타 hex 전수조사(brand-mark/splash-ios 의도 예외 목록화) + INFO-PR2-1(search-result-item 톤)·INFO-PR3-2(거래량 봉 저대비) 폴리시 검토 + 전 표면 최종 QA(라이트/다크/시스템 × 라우트) + 실기기 iOS standalone 상태바 확인. PRD §9 q2 런타임 교체는 applyThemeClass 단일 경유로 구현(effect 대신, 더 일관적).
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR5 (검증/마감)**: 직타 hex 전수조사(brand-mark/splash-ios 의도 예외 목록화) + INFO-PR2-1(search-result-item 톤)·INFO-PR3-2(거래량 봉 저대비) 폴리시 검토 + 전 표면 최종 QA(라이트/다크/시스템 × 라우트) + 실기기 iOS standalone 상태바 확인. PRD §9 q2 런타임 교체는 applyThemeClass 단일 경유로 구현(effect 대신, 더 일관적).

### 2026-06-02 — feat(theme): 다크모드 PR5 — 전 표면 검증 + 폴리시(시리즈 마감) (#97)

- **slug**: `dark-mode-polish` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/97
- **요약**: feat(theme): 다크모드 PR5 — 전 표면 검증 + 폴리시(시리즈 마감)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 다크모드 시리즈 **PR5 — 전 표면 검증 + 마감(폴리시)**. 시리즈를 닫는 최종 검증 + 잔여 폴리시.
  > 
  > PRD: `docs/prd/dark-mode.md`.
  > 
  > ## 어떻게
  > 
  > - **search-result-item 다크 폴리시(INFO-PR2-1)**: 검색 드롭다운 결과 항목 `bg-surface`→`bg-surface-elevated`. 다크에서 항목(#161d26)이 패널(elevated #1d2630)보다 어두워 "박힌" 느낌을 패널과 같은 색으로 맞춰 해소. light는 elevated=surface=#ffffff라 무변경. DESIGN.md 스펙도 동기.
  > - **stale 주석 정정**: `inject-color-themes.mjs` 48→49키(surface-elevated 포함).
  > 
  > ## 검증 (시리즈 클로즈)
  > 
  > - **QA qa-passed** (`docs/qa/dark-mode.md` PR5 라운드 + 종합 클로즈):
  >   - **직타 hex 전수조사(AC-6)**: 실제 코드 hex 10건 전부 의도 예외(brand-mark·icon/OG light고정·viewport/FOUC·themeStore META·splash-ios ImageResponse), **신규 회귀 0**. themeColor/splash hex가 다크 토큰값과 1:1 동기.
  >   - **전 표면 스윕**: 7라우트 × light/dark × 데스크톱/모바일 = 28페이지 자동 대비 스캔 **sub-threshold 0**. 모달/드롭다운/드로어/토스트/스켈레톤/빈상태/에러/배지/포커스링/차트 툴팁 전부 가독.
  >   - **DESIGN.md 토큰 라이브 동기화**: surface-elevated 임시변경→sync→번들 반영→복원 검증.
  >   - **라이브 토글**: light↔dark↔system 차트 포함 즉시 반영.
  >   - **G1~G9 수용기준 전건 충족 매트릭스.**
  > - **Review approved**: components.css↔DESIGN.md 1:1, light 무회귀, focus 강조 보존, 주석 정확.
  > - typecheck/lint/build 0 에러, design:sync 49키 1:1·drift 0.
  > 
  > ## 다음 작업
  > 
  > - 다크모드 시리즈(PR1~5) 완료 — light/dark/system 3-state, 전 표면 시인성 무누락(WCAG AA), 차트 런타임 테마, 상태바/스플래시 다크.
  > - **잔여(후속 선택, 비차단)**: INFO-PR3-2(거래량 봉 다크 저대비 #7a3f3f/#35527a — 식별 가능, 디자이너 기호 시 명도 상향 여지). iOS standalone 실기기 상태바 글자색(adaptive) 최종 확인. 향후 toast 컴포넌트 신설 시 `bg-surface-elevated` 적용.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 다크모드 시리즈(PR1~5) 완료 — light/dark/system 3-state, 전 표면 시인성 무누락(WCAG AA), 차트 런타임 테마, 상태바/스플래시 다크.
  - **잔여(후속 선택, 비차단)**: INFO-PR3-2(거래량 봉 다크 저대비 #7a3f3f/#35527a — 식별 가능, 디자이너 기호 시 명도 상향 여지). iOS standalone 실기기 상태바 글자색(adaptive) 최종 확인. 향후 toast 컴포넌트 신설 시 `bg-surface-elevated` 적용.

### 2026-06-02 — feat(watchlist): 인라인 종목 검색 + 별 추가/제거 토글 (#100)

- **slug**: `watchlist-inline-search` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/100
- **요약**: feat(watchlist): 인라인 종목 검색 + 별 추가/제거 토글
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 관심종목 페이지의 "+ 종목 추가" 버튼·모달을 제거하고, **홈/종목분석처럼 상단 인라인 검색 + 종목별 별(추가/제거) 토글**로 교체.
  > 
  > ## 어떻게
  > 
  > - **`WatchlistSearch`(신규)**: 입력 → 하위 드롭다운 결과(홈과 동일한 `useQueryStockSearch` 재사용 + 6자리 코드 직접 추가). 각 행 = 좌 종목명·메타(정보, 비클릭) / 우 별 버튼.
  > - **`WatchlistStarButton`(신규)**: 빈 별(outline) ↔ 채운 별(filled, 앰버/골드) + 추가 시 **파티클 축하 애니메이션**(uiverse 참고). `checked=hasTicker`로 제어 → **이미 추가된 종목은 채운 별로 렌더**(자동 발화 없음), **추가 클릭에서만** 파티클 발화. 채운 별 클릭 → 제거(토글).
  > - **다중 추가 UX**: 별을 눌러도 드롭다운이 **안 닫힘**(별/행은 검색 컨테이너 내부) — **바깥 클릭(mousedown) 시에만** 닫힘.
  > - 행(별 제외)은 비클릭(정보 표시 전용). 마이페이지 3-state처럼 추가/제거 모두 검색에서 처리.
  > - 색·애니메이션은 `app/components.css`의 `.wl-star*`(토큰 `chart-signal`, hex 직타 0). `WatchlistAddModal` 삭제.
  > 
  > ## 검증
  > 
  > - typecheck / lint / build 0 에러.
  > - SSR: 검색 입력 렌더 + "+ 종목 추가" 버튼 제거 확인. CSS/keyframes 토큰 참조 생성 확인.
  > - 인터랙션(별 토글·파티클·다중 추가·바깥 클릭 닫힘)은 프리뷰에서 확인 필요.
  > 
  > ## 다음 작업
  > - 없음(독립 기능). 종목 상세 페이지에도 동일 별 토글 추가 검토 여지.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 없음(독립 기능). 종목 상세 페이지에도 동일 별 토글 추가 검토 여지.

### 2026-06-03 — feat(stock): 종목 상세 헤더에 관심종목 별 토글 추가 (#112)

- **slug**: `stock-detail-star-toggle` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/112
- **요약**: feat(stock): 종목 상세 헤더에 관심종목 별 토글 추가
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇
  > 
  > 종목 상세 페이지(\`/stock/[ticker]\`) 헤더의 **종목명·종목번호 옆에 관심종목 별(★) 토글**을 추가했다. 지금까진 상세를 보다가 관심종목에 담으려면 관심종목 페이지로 가서 다시 검색해야 했는데, 이제 상세에서 바로 담기/빼기가 가능하다.
  > 
  > #100 에서 만든 검색 결과 별과 **동일 UX**(빈 별 ↔ 채운 별, 추가 시 파티클 축하).
  > 
  > ## 어떻게
  > 
  > - **\`WatchlistStarButton\` 그대로 재사용** — \`added\`/\`onToggle\` 로 제어되는 기존 컴포넌트라 신규 컴포넌트·CSS **0건**.
  > - \`StockHeader\` 가 이미 쓰던 \`useWatchlistTickers\`(이름 표시용 \`getName\`)에서 \`hasTicker\`/\`addTicker\`/\`removeTicker\` 를 추가로 받아 토글 제어.
  > - 추가 시 **해결된 종목명을 함께 영구화**(디그레이드 행 식별용). 단 이름이 ticker 폴백이면 \`undefined\` 전달 → store 에 ticker 를 이름으로 저장하지 않음.
  > - 별은 종목명 + 종목번호 배지와 한 줄에 배치(\`inline-flex items-center gap-sm\`).
  > 
  > ## 안전성
  > 
  > - \`StockPageLayout\` 의 모바일/확대/기본 **3분기는 상호배타 렌더** → \`StockHeader\` 인스턴스가 한 번에 하나만 마운트. 레이아웃 전환 remount 시 \`useWatchlistTickers\` 가 localStorage(SSOT) 를 재동기화하므로 **desync 없음**. 페이지 내 다른 watchlist 소비처 0건 확인.
  > - 별 색·애니메이션은 전부 \`.wl-star*\`(토큰 \`chart-signal\`), hex 직타 0.
  > 
  > ## 검증
  > 
  > - typecheck / lint / build **0 에러**.
  > - 별 토글 인터랙션(파티클·추가/제거·관심종목 페이지와 상태 일치)은 프리뷰 확인 권장.
  > 
  > ## 다음 작업
  > 
  > - 없음(독립 UX 개선). 관심종목 페이지(#100)와 store 를 공유하므로 양쪽 상태 자동 일치.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 없음(독립 UX 개선). 관심종목 페이지(#100)와 store 를 공유하므로 양쪽 상태 자동 일치.

### 2026-06-06 — feat(signal): 매매 시그널 규칙 엔진 + 백테스트 검증 루프 (lib/signal/) (#113)

- **slug**: `signal-rule-engine` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/113
- **요약**: feat(signal): 매매 시그널 규칙 엔진 + 백테스트 검증 루프 (lib/signal/)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 로드맵 §4-3(숫자 판단 결정론적 분리) · §5.1(백테스팅) · §5.5(확률적 표현)의 토대 구현.
  > 
  > **3단계 보정 사이클을 완전히 완주한 PR**:
  > - 규칙 엔진 구현 → 12종목 아웃오브샘플 검증 → 진단(과다 진입) → 구조 재설계 → 비용 차감 후 흑자 확인
  > 
  > ### 핵심 구성
  > 
  > | 모듈 | 내용 |
  > |---|---|
  > | `lib/signal/` | 추세·모멘텀·거래량·변동성 4축 규칙 엔진 (`evaluateSignal`) |
  > | `lib/signal/backtest/` | Triple Barrier 라벨링 · 워크포워드 · attribution · metrics |
  > | `lib/signal/levels/` | 매물대(Volume Profile) · 스윙 고저 · 시장 구조 기반 TP/SL |
  > | `lib/utils/technicalIndicators.ts` | calcSMA · calcBollinger · calcADX · calcVolumeMA · crossover (추가) |
  > 
  > ### 백테스트 누적 개선 (12종목 OOS, net@0.3%)
  > 
  > ```
  > 매봉 진입 (baseline)         PF 0.92  avg -0.32%   (손실)
  > + 트리거 선별 + 쿨다운        PF 0.98  avg -0.05%   (손익분기)
  > + 비대칭 배리어 TP3×/SL1.5×  PF 1.15  avg +0.47%   (비용 전 흑자)
  > + 거래비용 0.3% 차감          PF 1.05  avg +0.17%   (비용 후 흑자)  ✅
  > ```
  > 
  > ### 주요 발견 (attribution 기반)
  > 
  > - ❌ **평균회귀 매수(볼린저 하단터치·RSI 과매도)**: 3종목 전부 역예측 — "떨어지는 칼날"
  > - ✅ **추세추종 컨플루언스(MACD 교차·골든크로스·거래량 급증)**: 일관 우수 (66~89% 적중)
  > - **시장 구조 TP/SL**: ATR 비대칭과 성능 동등 → UI 정보 표시·LLM 컨텍스트 주입 용도로 유효
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 종목 상세 '시그널 카드' UI 연결 (`useChartData` → `evaluateSignal` → 축별 게이지)
  - `workbench/analyze` 프롬프트에 `SignalResult` + 구조 레벨 주입 (§4-3 LLM 환각 제거)
  - 기간 확대 워크포워드 (2018~2020 등 하락 레짐 포함)

### 2026-06-06 — feat(stock): 종목 상세 기술적 시그널 카드 (#113 UI 연결) (#114)

- **slug**: `signal-card-ui` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/114
- **요약**: feat(stock): 종목 상세 기술적 시그널 카드 (#113 UI 연결)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PR #113(signal-rule-engine)에서 구현한 `evaluateSignal` 엔진을 종목 상세 화면에 라이브 연결.
  > 
  > ### 구성
  > 
  > - **`hooks/stock/useSignalResult`** — `useQueryStockChart("D", 200봉)` → `evaluateSignal` → `SignalResult`. 차트 데이터 캐시 공유, BFF 추가 호출 0건.
  > - **`components/profile/SignalCard`** — 액션 배지(BUY/HOLD/SELL) · 종합점수 · 동의도 · 레짐 · 4축 게이지 · 발화된 규칙 태그 · 면책 문구
  > - **`StockPageLayout`** 세 위치 삽입:
  >   - 모바일: 차트 바로 아래
  >   - 데스크탑 기본: 우측 컬럼 차트 아래
  >   - 데스크탑 확대: 기업정보 그리드 아래
  > 
  > ### 검증
  > 
  > - `npm run typecheck` ✅
  > - `npm run build` ✅
  > - `npm run lint` ✅
  > - dev 서버 `/stock/005930` 렌더 200 OK, 서버 에러 없음
  > 
  > ## 다음 작업
  > 
  > - `workbench/analyze` 프롬프트에 `SignalResult` 주입 (§4-3 LLM 환각 제거)
  > - 시그널 카드 디자인 리파인 (토큰 검토, 모바일 UX)
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - `workbench/analyze` 프롬프트에 `SignalResult` 주입 (§4-3 LLM 환각 제거)
  - 시그널 카드 디자인 리파인 (토큰 검토, 모바일 UX)

### 2026-06-08 — feat(stock): AI 최종 판단 — 시그널 데이터 + Claude CLI 웹 리서치 (#115)

- **slug**: `ai-signal-judgment` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/115
- **요약**: feat(stock): AI 최종 판단 — 시그널 데이터 + Claude CLI 웹 리서치
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 종목 상세 시그널 카드에 **"AI로 최종 판단"** 버튼 추가. 클릭 시 규칙 엔진이 계산한 4축 점수·레짐·동의도를 프롬프트에 직접 주입하고, Claude CLI가 웹 리서치로 최신 뉴스·공시·실적을 검색해 종합 판단을 반환한다.
  > 
  > ### 흐름
  > 
  > ```
  > 시그널 카드 "AI로 최종 판단" 버튼
  >   ↓ POST /api/stock/ai-signal
  > BFF: fetchStockDailyChart(200봉) → evaluateSignal → SignalResult
  >   ↓ 4축 점수·레짐·동의도를 user prompt에 주입
  > claude --print (60s, 웹 리서치 포함)
  >   ↓ AISignalResponse { verdict, reasoning, key_catalysts, risk_factors, ... }
  > SignalCard 인라인 결과 표시
  > ```
  > 
  > ### §4-3 LLM 환각 제거
  > 
  > - **숫자(점수·레짐·규칙)**: 결정론적 규칙 엔진이 계산, 프롬프트에 주입
  > - **설명 + 최신 맥락**: Claude가 웹 리서치 후 담당 → 가격 추정 환각 0
  > 
  > ### 구성 파일
  > 
  > | 파일 | 역할 |
  > |---|---|
  > | `app/api/stock/ai-signal/route.ts` | BFF — 서버사이드 신호 계산 + claude subprocess |
  > | `lib/types/stock/aiSignal.ts` | AISignalRequest / AISignalResponse 타입 |
  > | `lib/api/stock/aiSignal.ts` | axios 클라이언트 함수 |
  > | `hooks/stock/useMutationAISignal.ts` | TanStack Query mutation |
  > | `components/profile/SignalCard.tsx` | 버튼 + 4상태(로딩/에러/성공/재시도) |
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 실제 로컬에서 claude CLI로 응답 확인 (웹 리서치 품질)
  - 응답 시간이 길면 타임아웃 조정 또는 스트리밍 적용
  - workbench analyze 프롬프트에도 SignalResult 주입 (§4-3 완전 적용)

---

### 2026-06-12 — [WIP] AI 멀티에이전트 분석 패널 전면 재설계 (main 직접 커밋)

- **slug**: `ai-analysis-panel`
- **author**: @HY0118
- **PR**: (main 직접 커밋 — PR 없음)
- **요약**: 8-에이전트 파이프라인(기술·뉴스·펀더멘탈 → 강세/약세 2라운드 토론 → 리서치·리스크·포트폴리오 매니저 → 최종 결정) + 풀스크린 패널 UI
- **현재 상태**: main 머지됨 (QA passed, reviewer approved)
- **주요 변경 파일**:
  - `app/api/stock/ai-analysis/route.ts` — SSE 스트리밍 BFF, 2라운드 토론 루프
  - `hooks/stock/useAIAnalysis.ts` — 패널 상태 훅 (open/resume/stop/minimize/reanalysis prompt)
  - `components/stock/AIAnalysisPanel.tsx` — 3열 카드 / VS 토론 / 최종결론 레이아웃
  - `lib/types/stock/aiAnalysis.ts` — DEBATE_ROUNDS=2, DebateMessage.round
- **다음 작업 후보**:
  - 진행 바 에이전트 pill에 `role="button"` + `tabIndex={0}` 추가 (키보드 접근성)
  - AI 패널 카피를 `lib/copy/stock/` 으로 분리 (i18n 대비)
  - `style={{ minHeight: 180 }}` 인라인 px → `min-h-[180px]` Tailwind 토큰으로 교체

### 2026-06-12 — feat(stock): AI 분석 개선 — 토큰 스트리밍·병렬화·UI 개선 (#116)

- **slug**: `ai-analysis-improvement` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/116
- **요약**: feat(stock): AI 분석 개선 — 토큰 스트리밍·병렬화·UI 개선
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 개요
  > 
  > AI 멀티에이전트 분석 시스템의 성능·UX 개선 및 버그 수정.
  > 
  > ## 변경 내용
  > 
  > - **Phase 1**: `isBullThisRound` 버그 수정 — R1 스트리밍 중 R2 플레이스홀더 중복 노출 제거
  > - **Phase 2**: `DEBATE_R2` 타임아웃 180s → 300s 상향 + `market/news/fundamentals` 병렬화 (`Promise.allSettled`)
  > - **Phase 3**: `execFile` → `spawn + stream-json` 전환으로 실제 토큰 스트리밍 구현
  > - **UI 개선**: PM 카드 Row3 제거 → 하단 최종 결론으로 통합
  > - **UI 개선**: `UNDERWEIGHT` 재진입 구간(파란색, 음수%) 표시
  > - **UI 개선**: 최종 결론 도착 시 자동 하단 스크롤
  > - **UI 개선**: 헤더 ticker → 종목명 표시 (`useQueryStockPrice`)
  > - **UI 개선**: 분석 카드 진행 메시지 2.4초 순환
  > 
  > ## 다음 작업
  > 
  > - PRD AC-3: `DEBATE_ROUNDS` JSDoc에 "bull+bear 교대 1쌍 = 1라운드" 정의 명시 (현재 미반영)
  > - PRD AC-5: `buildBullR2Prompt`/`buildBearR2Prompt` 전문 삽입 → 요약/핵심 발췌 전달 방식으로 개선 (PRD §3-3 — 현재 미반영)
  > - `_open` 미사용 변수 lint 경고 제거 (`AIAnalysisPanel.tsx` L572)
  > - 실측 완주 검증 (AC-7): 로컬 환경에서 전체 파이프라인 실행 후 `✗` 로그 0건 확인
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - PRD AC-3: `DEBATE_ROUNDS` JSDoc에 "bull+bear 교대 1쌍 = 1라운드" 정의 명시 (현재 미반영)
  - PRD AC-5: `buildBullR2Prompt`/`buildBearR2Prompt` 전문 삽입 → 요약/핵심 발췌 전달 방식으로 개선 (PRD §3-3 — 현재 미반영)
  - `_open` 미사용 변수 lint 경고 제거 (`AIAnalysisPanel.tsx` L572)
  - 실측 완주 검증 (AC-7): 로컬 환경에서 전체 파이프라인 실행 후 `✗` 로그 0건 확인

### 2026-06-12 — refactor(stock): AI 분석 패널 코드 모듈화 — 컴포넌트 분리·서버 추출·훅 정리 (#118)

- **slug**: `ai-panel-refactor` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/118
- **요약**: refactor(stock): AI 분석 패널 코드 모듈화 — 컴포넌트 분리·서버 추출·훅 정리
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경 요약
  > 
  > 순수 리팩토링 PR — 동작 변경 없음.
  > 
  > - **Phase 1 — 컴포넌트 분리**: `AIAnalysisPanel.tsx` 1,059줄 → 461줄. 7개 인라인 컴포넌트를 `components/stock/ai-analysis/` 하위로 분리. `AnalystCard`에 `React.memo()`, `DebateSection`에 `useMemo(debate.filter)` 적용.
  > - **Phase 2 — 서버 모듈화**: `route.ts` 1,115줄 → 411줄. `invokeClaudeAgentStream` → `lib/server/claudeAgent.ts`, `AGENT_PROMPTS`/`AnalysisState`/디베이트 유틸 → `lib/prompts/stock/aiAnalysis.ts` 추출.
  > - **Phase 3 — 훅 정리**: `handleEvent`·`stop()` 중복 resumeKey 매핑을 `getResumeKey()` 순수 함수로 단일화(`lib/types/stock/aiAnalysis.ts`).
  > 
  > ## 파일 변경 요약
  > 
  > | 파일 | 전 | 후 |
  > |------|---|---|
  > | `components/stock/AIAnalysisPanel.tsx` | 1,059줄 | 461줄 (−57%) |
  > | `app/api/stock/ai-analysis/route.ts` | 1,115줄 | 411줄 (−63%) |
  > | `hooks/stock/useAIAnalysis.ts` | 333줄 | 324줄 |
  > | `components/stock/ai-analysis/` (7개 신규) | — | 597줄 |
  > | `lib/server/claudeAgent.ts` (신규) | — | 163줄 |
  > | `lib/prompts/stock/aiAnalysis.ts` (신규) | — | 544줄 |
  > 
  > `npx tsc --noEmit` 에러 0 확인.
  > 
  > ## 다음 작업
  > 
  > - 차트 후속: W3 캔들바 wickRange Y좌표 육안 QA (장대봉/상한가)
  > - MACD/RSI 워밍업 fetch 구현 (`WARMUP_DAYS` 앞당겨 지표 항상 표시)
  > - investor flow `0억` 표시 버그 수정
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 차트 후속: W3 캔들바 wickRange Y좌표 육안 QA (장대봉/상한가)
  - MACD/RSI 워밍업 fetch 구현 (`WARMUP_DAYS` 앞당겨 지표 항상 표시)
  - investor flow `0억` 표시 버그 수정

### 2026-06-12 — fix(flow): 수급 순매수 0억 표시 버그 수정 (#119)

- **slug**: `fix-investor-flow-zero-amount` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/119
- **요약**: fix(flow): 수급 순매수 0억 표시 버그 수정
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경 요약
  > 
  > 홈 수급 Top10 위젯에서 외국인/기관 순매수 금액이 `0억`(실제 `0.0억`)으로 표시되는 버그 수정.
  > 
  > ## 원인
  > 
  > KIS API `frgn_ntby_tr_pbmn` / `orgn_ntby_tr_pbmn` 필드가 빈 문자열로 반환되면
  > `toNumber("")` → `0` → `formatNetBuyAmount(0)` → `"0.0억"` 출력.
  > `0`은 실제 순매수 0이 아닌 미확인 데이터 폴백값이므로 `-`로 표시해야 함.
  > 
  > ## 변경 내용
  > 
  > `lib/utils/formatNetBuy.ts` — `formatNetBuyAmount(0)` 시 `"-"` 반환 조건 추가 (1줄).
  > 
  > 표면 A (홈 Top10) / 표면 B (종목 수급 추이) 공용 포맷터이므로 양쪽 모두 수정됨.
  > 
  > ## 다음 작업
  > 
  > - MACD/RSI 워밍업 fetch 구현
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - MACD/RSI 워밍업 fetch 구현

### 2026-06-12 — feat(stock): AI 패널 리서치 매니저·트레이더 2-col 한 줄 배치 (#120)

- **slug**: `ai-panel-rm-trader-inline` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/120
- **요약**: feat(stock): AI 패널 리서치 매니저·트레이더 2-col 한 줄 배치
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경 요약
  > 
  > AI 분석 패널에서 리서치 매니저(Row 3)·트레이더(Row 4)가 각각 full-width로 세로 나열되던 것을 2-col 그리드 한 줄로 병치.
  > 
  > - 모바일(`< md`): 기존대로 세로 스택
  > - 데스크탑(`md+`): 리서치 매니저 | 트레이더 나란히
  > - 트레이더 "🧠 심층 추론" 배지 위치 유지
  > - 한쪽이 아직 pending이면 dashed 플레이스홀더로 자리 확보
  > 
  > ## 다음 작업
  > 
  > 없음
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  없음

### 2026-06-12 — feat(stock): AI 패널 토론 구분선 강화 + PM 핵심 정보 볼드 (#121)

- **slug**: `ai-panel-debate-bold-ui` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/121
- **요약**: feat(stock): AI 패널 토론 구분선 강화 + PM 핵심 정보 볼드
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 변경 요약
  > 
  > **토론 UI**
  > - R1/R2 라벨: `text-[9px] text-slate-300` → `text-[10px] text-slate-500` (더 진하게)
  > - 세로 구분선: `w-px bg-slate-200` → `w-0.5 bg-slate-400` (굵고 진하게)
  > - 그리드 행: `items-start` → `items-stretch` → 선이 카드 높이 전체만큼 연장
  > 
  > **PM 결과 볼드**
  > - `FinalVerdictCard`에 `InlineBold` 헬퍼 추가 — `**text**` → `<strong>` 인라인 렌더링
  > - `reasoning`, `entry_strategy`, `short_term_outlook`, `mid_term_outlook` 4개 필드에 적용
  > - PM 시스템 프롬프트에 핵심 정보(매수/매도 판단·목표가·손절) `**굵게**` 표기 지시 추가
  > 
  > ## 다음 작업
  > 
  > 없음
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  없음

### 2026-06-15 — feat(stock): Claude·Codex AI 분석 선택 기능

- **slug**: `codex-ai-analysis`
- **반영 브랜치**: `main`
- **요약**:
  - 종목 헤더와 AI 분석 패널에서 Claude/Codex 공급자를 명시적으로 선택할 수 있도록 UI 분리
  - 최신 12에이전트 병렬·순차 혼합 파이프라인, 토론, 결정 이력, 중지·재개 기능에 provider 전달
  - Codex CLI를 읽기 전용·비대화형·임시 세션으로 실행하는 서버 전용 어댑터 추가
  - 뉴스·공시·펀더멘털·SNS 분석처럼 웹 조사가 필요한 에이전트에만 Codex 검색 활성화
  - PRD·DESIGN·QA 문서와 로컬 실행 환경변수 예시 추가
- **검증**:
  - 테스트 251개 통과, 1개 환경 의존 테스트 스킵
  - 타입 검사, 린트, Next.js 프로덕션 빌드 통과
  - `/stock/005930`에서 Claude/Codex 버튼 렌더링 및 브라우저 콘솔 오류 없음 확인
  - Codex 실제 호출로 리서치 매니저 완료 및 리스크 단계 진입까지 확인
- **운영 주의사항**:
  - 각 개발자는 로컬에서 `codex login`을 별도로 수행해야 한다.
  - `.codex/`와 Codex 인증 정보는 개인 로컬 설정이므로 Git에 포함하지 않는다.
  - 전체 12에이전트 실행은 10분 이상 걸릴 수 있고 모델 토큰 사용량이 크다.
  - Codex CLI는 완료 결과를 한 번에 전달하며 Claude와 동일한 토큰 단위 스트리밍은 제공하지 않는다.
  - CLI subprocess 기반이므로 Vercel에서는 기존 정책대로 503을 반환하고 로컬 환경에서만 실행한다.
- **관련 문서**:
  - `docs/prd/codex-ai-analysis.md`
  - `docs/design/codex-ai-analysis.md`
  - `docs/qa/codex-ai-analysis.md`

### 2026-06-15 — feat(stock): AI 분석 진입 공급자 선택(chooser) + 로컬 CLI 감지 (#122)

- **slug**: `ai-provider-chooser` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/122
- **요약**: feat(stock): AI 분석 진입 공급자 선택(chooser) + 로컬 CLI 감지
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 종목 상세(`/stock/[ticker]`)의 AI 종합분석 진입 UX를 개편한다. 기존 `[AI 분석 | Claude | Codex]` 세그먼트 컨트롤(3개가 다 버튼처럼 보이고, 누르면 즉시 실행)을 **단일 "AI 종합분석" 버튼 → 패널 내 공급자 선택(chooser)** 흐름으로 바꾸고, 로컬에 설치된 CLI만 선택지로 제시한다.
  > 
  > ## 변경 내용
  > 
  > **진입 흐름**
  > - 헤더: 세그먼트 → 단일 "AI 종합분석" 버튼(#114 원본 톤 복원). 클릭 시 패널만 열고 자동 실행 X.
  > - `ProviderChooser`: 로딩 / 조회실패(재시도) / Vercel·미설치(안내) / 1개(확인) / 2개(카드) 분기. PC 가로형·모바일 세로 2열 반응형.
  > - 공급자 선택은 chooser로 일원화 → 패널 헤더 토글 제거.
  > 
  > **서버**
  > - `lib/server/ai/detectCli`: PATH/경로 기반 fs 감지(프로세스 spawn 없음, 30s TTL, 실제 호출 경로와 동일 env 기본값). 응답은 boolean/키만 노출(경로 미노출).
  > - `GET /api/stock/ai-analysis/providers`: `{vercel, providers, available}`, `no-store`. Vercel은 항상 0개.
  > - `isVercelEnv` 4곳 중복 → `lib/server/env`로 공용화(503 가드 동작 무회귀).
  > 
  > **패널 폴리시**
  > - 접기/펼치기 제거(X만), 헤더 바 높이 축소, "AI 종합분석" 서브타이틀 제거.
  > - 실행 중 공급자 배지(amber/emerald) + 현재 진행 에이전트 기준 상태 메시지.
  > - 패널/스크림이 상단 navbar(지수·테마토글)를 안 가리게 위치 조정(미세 4px 겹침).
  > - 종목 간 이동 시 진행 스트림 abort + 상태 초기화(잘못된 종목에 결정 저장 방지).
  > 
  > ## 점검
  > - 역할별 순차 점검(UX·FE·QA·Reviewer) 반영, QA 리포트: `docs/qa/ai-provider-chooser.md`(경량 트랙).
  > - `tsc` / `lint` / `build` 통과. `GET /providers` 실호출 계약 확인. 단일/2개 분기 dev 시각 확인(codex env 임시 주입).
  > 
  > ## 다음 작업
  > - codex CLI 실제 설치 환경에서 2개 분기 end-to-end(실분석) 검증 — 현재 로컬엔 claude만 설치.
  > - 공급자 3개 이상 확장 시 chooser `grid-cols-2` 및 `PROVIDER_STYLE` 재검토.
  > - chooser 로딩/안내 상태 `aria-live` 보강(스크린리더 전이 안내) — 우선순위 낮음.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - codex CLI 실제 설치 환경에서 2개 분기 end-to-end(실분석) 검증 — 현재 로컬엔 claude만 설치.
  - 공급자 3개 이상 확장 시 chooser `grid-cols-2` 및 `PROVIDER_STYLE` 재검토.
  - chooser 로딩/안내 상태 `aria-live` 보강(스크린리더 전이 안내) — 우선순위 낮음.

### 2026-06-15 — feat(ai-analysis): 구조화 감성(SNS 정형 감성 + PM confidence 정량 반영) (#124)

- **slug**: `ai-sentiment-structured` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/124
- **요약**: feat(ai-analysis): 구조화 감성(SNS 정형 감성 + PM confidence 정량 반영)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 레퍼런스 `TauricResearch/TradingAgents`의 `SentimentReport` 패턴을 우리 멀티에이전트 AI 분석에 이식한다. SNS 분석가(`social`)가 자유서술 리포트 끝에 **파싱 가능한 정형 감성 블록**(7단계 밴드 · 0~10 점수 · 신뢰도 · 한줄요약)을 동봉하고, 서버가 정규식으로 파싱해 새 `sentiment` SSE 이벤트로 발행한다. 별도 LLM 호출·외부 API 추가 0(토큰·레이턴시 증가 0), 블록 누락 시 graceful 폴백.
  > 
  > PRD: `docs/prd/ai-sentiment-structured.md` · DESIGN: `docs/design/ai-sentiment-structured.md`
  > 
  > ## 변경 내용
  > 
  > - **구조화 감성 풀 파이프라인**
  >   - social 프롬프트: 정형 감성 블록(`<!-- SENTIMENT ... -->`) 출력 지시 + 내러티브 품질 가이드
  >   - route.ts: `parseSentimentBlock`/`stripSentimentBlock`(한글 라벨 화이트리스트→코드, score 0~10 clamp) → `sentiment` 이벤트 발행, 마커 strip 후 clean report 발행, 재개 시 재파싱 복원
  >   - 타입: `SentimentBand`(7단계)·`SentimentConfidence`·`SentimentReport` + `AIAnalysisEvent` variant
  >   - PM 프롬프트: 정형 감성 한 줄 주입 + confidence 산출에 "감성↔verdict 정합" 반영 (**verdict 가중 X — confidence에만**)
  >   - UI: `SentimentBadge`(밴드 라벨 1차 + 점수/10 보조 + 신뢰도 병기, 과신 방지·신뢰도 low 약화), social 카드에만 연결
  >   - 카피: `COPY.sentiment` (7단계 한글 라벨·신뢰도·과신 방지 문구), 인라인 한글 0
  >   - 회고: `aiDecisionStore`에 `sentiment_score`/`sentiment_band` 동반 저장
  > - **시세 신선도 가드** (부가): 최신 일봉이 `STALE_MAX_DAYS=10` 초과 노후면 분석 조기 중단(콜드스타트·휴장 시 옛 가격 분석 방지)
  > - **bull/bear 프롬프트 버그 수정** (부가): 깨진 템플릿 `${"{target}"}` 리터럴 노출 제거
  > 
  > ## 결정 사항 (PRD §9 RESOLVED)
  > 
  > - q1 밴드 단계 = **7단계** (색은 5톤으로 묶고 라벨로 세분, 한국 관례 긍정=빨강/부정=파랑)
  > - q2 표기 = **점수+신뢰도 병기** (과신 방지)
  > - q3 PM 연결 = **confidence에만** (감성=역지표 가능 보조신호, over-weighting 방지)
  > - q4 회고 저장 = **MVP 포함** (저장만)
  > 
  > ## 품질 게이트
  > 
  > - `typecheck` ✅ · `lint` ✅ · `build` ✅ · `test` 202통과 (실패 1건은 사전존재 `app/api/market/indices` 라이브 네트워크 테스트, 본 변경 무관)
  > - **미검증**: 실제 LLM 라운드트립(블록 형식 준수·배지 렌더)은 로컬 `next dev` + AI CLI 환경 필요 → QA 단계 라이브 확인 권장
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - QA: 로컬 `next dev` + claude/codex CLI로 감성 블록 라이브 발행률·배지 렌더(두 뷰포트)·PM confidence 정합·신선도 가드 회귀 스폿체크 (AC-3/8/12)
  - 후속: 감성 추이 차트화(회고 데이터 누적 후 별도 PRD), 외부 감성 데이터 소스 연동, 다른 분석가(news/fundamentals) 정형화 트랙
  - 신선도 가드 임계값(`STALE_MAX_DAYS=10`) 실운영 모니터링 — 연휴 직후 오탐 시 영업일 기준으로 조정

### 2026-06-16 — feat(ai-analysis): 종목별 PM 최종 결론 공유 upsert (진행 중)

- **slug**: `ai-decision-upsert` · **branch**: `feature/ai-decision-upsert`
- **요약**: AI 종합분석의 포트폴리오 매니저 최종 결론을 Supabase `ai_analysis_decisions`에 ticker 기준 upsert하고, 저장된 이전 결론이 있으면 패널 첫 화면에서 먼저 보여준다.
- **현재 상태**: 조건부 통과 — Supabase env/테이블 연결 확인 완료, 실제 PM final 저장 라운드트립은 분석 완료 후 확인 필요.
- **주요 변경**
  - 클라이언트 로컬 결정 저장소 제거, 공유 저장은 서버 BFF/Supabase REST로 이동.
  - `GET /api/stock/ai-analysis/decision` 추가.
  - 분석 POST route가 이전 결론을 서버에서 재조회해 PM system prompt에만 주입.
  - PM final 이후 ticker 기준 upsert. Supabase 미설정/저장 실패는 분석 실패로 전파하지 않음.
  - 패널 UI에 이전 결론 카드 + "이전 결론 참고해 오늘 다시 분석" / "다른 AI 선택" 액션 추가.
- **검증**
  - 단위 테스트: `lib/api/stock/__tests__/aiAnalysis.test.ts`, `lib/server/ai/__tests__/decisionStore.test.ts`, `lib/server/ai/__tests__/agentCli.test.ts` 통과.
  - 전체 테스트: `npm test` 40 files passed, 257 tests passed, 1 skipped.
  - `npm run typecheck`, `npm run lint`, `npm run build` 통과.
  - `npm run dev` + `/stock/005930` 브라우저 확인: 이전 결론 없음 상태에서 기존 공급자 선택 UI 노출.
  - `GET /api/stock/ai-analysis/decision?ticker=005930`: `200 OK`, `{"configured":true,"decision":null}`.
  - Supabase REST `ai_analysis_decisions` 조회: `HTTP 200`, 빈 배열.
  - 브라우저 패널: 저장된 이전 분석 조회 로딩 후 이전 결론 없음 상태에서 Codex 공급자 선택 UI 노출.
- **다음 작업**
  - 실제 AI 분석 완료 후 PM final upsert 및 저장 결론 있음 분기 라운드트립 확인.

### 2026-06-17 — feat(ai-analysis): 심리 한 줄 요약 노출 + 헤더 티커 구분선 fix (#125)

- **slug**: `ai-sentiment-summary-surface` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/125
- **요약**: feat(ai-analysis): 심리 한 줄 요약 노출 + 헤더 티커 구분선 fix
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > 머지된 #124(구조화 감성)의 후속 UX 폴리시 + 헤더 버그 1건.
  > 
  > ## 변경 내용
  > 
  > ### feat — SNS 분석가 심리 한 줄 요약(summary) 노출
  > - 그동안 파싱·저장만 되고 화면 어디에도 안 쓰이던 `SentimentReport.summary`(심리 한 줄 결론)를 UI에 연결 (#124 리뷰어 후속 메모 #1 해소)
  > - **미리보기**: SNS 분석가 카드가 리포트 서두 인사말("이제 …작성하겠습니다") 대신 summary 한 줄을 결론 톤으로 표시 (summary 없으면 기존 동작 유지 — 폴백)
  > - **전체보기**: 오버레이 상단에 "심리 한 줄 요약" 하이라이트 콜아웃 추가 후 원문 마크다운
  > - 변경: AnalystCard / CardDetailOverlay(highlight prop) / AIAnalysisPanel(배선) / lib/copy
  > 
  > ### fix — 헤더 마켓 티커 S&P 500 그룹 구분선
  > - `t.code` 실제값은 `"S&P 500"`(MarketTicker 레이어)인데 `"SPX"`(원시 지수 코드)로 비교해, 국내↔해외 그룹 구분선이 렌더되지 않던 버그 수정
  > 
  > ## 품질 게이트
  > - `typecheck` ✅ · `lint` ✅ · `build` ✅
  > 
  > ## 다음 작업
  > - 라이브 확인: 종목 분석 시 SNS 카드 미리보기에 summary 노출 + 전체보기 콜아웃 렌더(두 뷰포트)
  > - 후속(미해소): 신선도 가드 영업일 기준 전환 검토(#124 리뷰어 메모 #2), 타 분석가 카드 서두 필러 개선(범위 외)
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 라이브 확인: 종목 분석 시 SNS 카드 미리보기에 summary 노출 + 전체보기 콜아웃 렌더(두 뷰포트)
  - 후속(미해소): 신선도 가드 영업일 기준 전환 검토(#124 리뷰어 메모 #2), 타 분석가 카드 서두 필러 개선(범위 외)

### 2026-06-17 — feat(ai-analysis): 신선도 가드 영업일 기준 전환 (연휴 오탐 제거) (#127)

- **slug**: `freshness-guard-business-days` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/127
- **요약**: feat(ai-analysis): 신선도 가드 영업일 기준 전환 (연휴 오탐 제거)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > #124 리뷰어 후속 메모 #2 해소. AI 분석의 시세 신선도 가드를 **달력일 → 영업일(평일) 기준**으로 전환해, 긴 연휴 직후 정상 데이터를 오탐하던 위험을 제거한다.
  > 
  > ## 배경
  > 
  > - #124에서 넣은 신선도 가드는 최신 일봉이 오늘로부터 `STALE_MAX_DAYS=10` **달력일** 초과 노후면 분석을 조기 중단(콜드스타트·휴장 시 옛 가격 분석 방지).
  > - 한국 긴 연휴(설·추석 + 주말)는 휴장이 최장 ~9일까지 늘어나, 10달력일 임계에 근접 → 연휴 직후 정상 데이터(최신봉=연휴 전 마지막 거래일)를 막을 오탐 위험.
  > 
  > ## 변경
  > 
  > - `lib/utils/businessDays.ts` 신규 — `businessDaysBetween(from, to)`: 주말(토·일) 제외 평일 카운트. **공휴일 캘린더는 두지 않음**(매년 유지보수 비용) — 이 프로젝트의 `flowSnapshotStore`("12달력일=7영업일+여유, 마진으로 공휴일 흡수") 패턴과 정합.
  > - `route.ts`: 가드를 `STALE_MAX_BUSINESS_DAYS=7` 영업일 기준으로 교체. 주말 자동 제외 + 연휴 소수 공휴일(~3평일)은 마진이 흡수 → 오탐 없음. 콜드스타트(수 주 노후)는 다수 영업일로 정상 차단.
  > - `lib/utils/__tests__/businessDays.test.ts` 신규 — 단위테스트 7건(같은날·미래·금→월·주말만·콜드스타트 등, 요일 전제 실측 확인).
  > 
  > ## 품질 게이트
  > 
  > - typecheck · lint · build ✅ · test 264 passed / 0 failed (+7)
  > 
  > ## 다음 작업
  > 
  > - 운영 모니터링: 실제 연휴 직후 가드 오탐/누락 로그 확인. 만약 비정상 거래정지 종목 등에서 과탐이 보이면 임계(7) 조정.
  > - 신선도 가드는 이제 영업일 기준 — 추가 공휴일 정밀화(캘린더)는 오탐 관측 시에만 검토.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - 운영 모니터링: 실제 연휴 직후 가드 오탐/누락 로그 확인. 만약 비정상 거래정지 종목 등에서 과탐이 보이면 임계(7) 조정.
  - 신선도 가드는 이제 영업일 기준 — 추가 공휴일 정밀화(캘린더)는 오탐 관측 시에만 검토.

### 2026-06-17 — feat(ai-analysis): 토큰 사용량 대시보드 + 분석 패널 백그라운드 유지 (#129)

- **slug**: `ai-usage-dashboard` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/129
- **요약**: feat(ai-analysis): 토큰 사용량 대시보드 + 분석 패널 백그라운드 유지
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > > **이 PR은 두 작업을 묶는다** (같은 AI 분석 도메인): ① 토큰 사용량 대시보드, ② AI 분석 패널 백그라운드 유지.
  > 
  > ---
  > 
  > ## ① AI 분석 분석가별 토큰 사용량 측정·대시보드
  > 
  > ### 요약
  > AI 종합 분석의 **분석가(agent)별 토큰 사용량을 측정·누적**하고 `/analyze` 대시보드에서 본다. 목적은 **토큰을 줄일 최적화 포인트 찾기**(모니터링은 수반).
  > 
  > claude CLI는 `result` 이벤트에 `usage`+`total_cost_usd`를 실어 보내는데 지금까지 버려지고 있었다 → 이걸 캡처해 기존 Supabase 연결로 누적한다.
  > 
  > ### 변경 사항
  > - **캡처**: `claudeAgent.ts` result 이벤트에서 usage·비용·모델 추출(반환 `{text, usage}`), `agentCli.ts`로 전파. codex는 `measured:false`(텍스트 경로 보존).
  > - **배선**: `route.ts`에 `runId`(분석 1회 묶음)·단계(A/B/C) 태깅, `runDebateLoop` bull/bear 라운드별 기록. 모두 fail-soft append(분석 스트림 차단 안 함).
  > - **저장**: `agentUsageStore.ts`(decisionStore 패턴) + `docs/sql/ai-agent-usage.sql` 신규 이력 테이블.
  > - **조회/화면**: BFF 집계 `GET /api/stock/ai-analysis/usage`(provider/agent별 평균·입력분해·캐시히트율) → `/analyze` 재활용. ★단계별 입력 추세(후단 누적 가시화) + 분석가별 막대 + 정렬 테이블 + provider 탭.
  > - **메뉴**: "AI 분석" 사이드 메뉴를 `/analyze` 활성 링크로 승격, "준비 중"(ComingSoonNavItem) 폐기.
  > - **문서**: `docs/ai-usage-dashboard.md` 인수 문서.
  > 
  > 대시보드는 Supabase 읽기 전용이라 **prod(Vercel)에서도 동작**. 분석 실행 자체는 기존대로 로컬 전용.
  > 
  > ### 수동 셋업 (머지 후/로컬)
  > - Supabase SQL Editor에서 `docs/sql/ai-agent-usage.sql` 1회 실행(테이블 생성). env는 기존 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 재사용.
  > 
  > ### 알려진 제약
  > - **codex 토큰 미측정** — codex CLI가 작업 머신에 없어 JSON usage 스키마 실측 불가. codex 실행분은 "측정 안 됨" 라벨(claude 평균에 안 섞임).
  > - "분석 1회 평균 비용" 카드는 근사치(bull/bear 라운드 중복분). 분석가별 표/차트는 정확.
  > 
  > ---
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **Codex 토큰 캡처**: codex 설치 환경에서 `exec --json` usage 이벤트 파싱 추가 → `agentCli.ts` codex 분기 `measured:true`. 절차는 `docs/ai-usage-dashboard.md` §3 참고. claude 경로·텍스트 추출은 건드리지 말 것.
  - **Supabase 테이블 생성**: `docs/sql/ai-agent-usage.sql` 실행(미실행 시 토큰 저장만 skip, 분석은 정상).
  - (선택) per-run 정확 비용: BFF에 `sum(cost)/runCount` 추가해 "분석 1회 평균 비용" 근사치 보정.
  - (선택) 백그라운드 분석 진행 중 **다른 종목 패널을 연 상태**에서도 "다른 종목 분석 중" 인디케이터 노출(현재는 재열기 탭이 닫힘 상태에서만 진행 표시).

### 2026-06-17 — feat(analyze): 분석 결과 카드 탭 추가 (최신순 종목·상세 모달·카드별 토큰·검색) (#130)

- **slug**: `analyze-decision-cards` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/130
- **요약**: feat(analyze): 분석 결과 카드 탭 추가 (최신순 종목·상세 모달·카드별 토큰·검색)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 사이드 "AI 분석"(`/analyze`)의 역할을 넓혀, 기존 토큰 대시보드를 상위 탭 2개로 분리했습니다.
  > - **분석 결과**(기본): 지금까지 분석한 종목을 최신순 카드로. 클릭 시 결론 상세 모달 + 카드별 토큰/비용.
  > - **토큰 사용량**: 기존 분석가별 토큰 대시보드 그대로.
  > 
  > ## 변경
  > - **BFF** `GET /api/stock/ai-analysis/decisions` — `ai_analysis_decisions`(종목당 최신 1건 upsert) + `ai_agent_usage`(종목별 최신 run 토큰 합산). **DB 스키마 변경 없음.**
  > - **카드** — 방향 아이콘(강세 빨강/약세 파랑/중립 회색)·판정·확신도/유효기간/토큰 chip, 호버 시 `backdrop-blur` 오버레이 "전체 보기". 종목명은 `useQueryStockNames`(`stock.price` 쿼리키 공유로 중복호출 0)로 일괄 해석.
  > - **상세** — 모달(모바일 풀스크린/PC 와이드), `FinalVerdictCard` + `SentimentBadge`(헤더 pin) 재사용. 추가 페치 없음(목록 응답에 결론 전체 포함).
  > - **검색** — 공용 `@/components/ui/SearchInput` 재사용, 종목명·코드 클라이언트 필터. 탭 줄 우측 툴바(종목 수·새로고침)는 portal, 모바일 새로고침은 아이콘만.
  > - 전부 Supabase 읽기 전용 → prod(Vercel) 동작(분석 실행만 로컬 전용).
  > 
  > ## 검증
  > - `tsc --noEmit` · `eslint` · `next build` · `vitest`(264 passed) 통과.
  > - 로컬 end-to-end(실제 분석 실행→저장→카드/상세)는 로컬 CLI+Supabase 필요 — QA에서 별도 확인 필요.
  > 
  > ## 다음 작업
  > - end-to-end QA: 로컬에서 한두 종목 AI 분석 실행 → `/analyze` "분석 결과" 탭 카드(종목명·판정·토큰) → 상세 모달 → "토큰 사용량" 탭 회귀 확인. 카드 토큰 합이 `ai_agent_usage` 해당 종목 최신 run 합과 일치하는지 교차검증.
  > - (선택) 카드 토큰을 그 결론의 실행과 정확히 묶으려면 `ai_analysis_decisions.run_id` 추가(ALTER 먼저 → upsert/route 수정). 현재는 "종목별 최신 run" 휴리스틱.
  > - 종목명 검색의 cold-start 갭(이름 로드 전 코드 검색만 매칭) 개선 여지.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - end-to-end QA: 로컬에서 한두 종목 AI 분석 실행 → `/analyze` "분석 결과" 탭 카드(종목명·판정·토큰) → 상세 모달 → "토큰 사용량" 탭 회귀 확인. 카드 토큰 합이 `ai_agent_usage` 해당 종목 최신 run 합과 일치하는지 교차검증.
  - (선택) 카드 토큰을 그 결론의 실행과 정확히 묶으려면 `ai_analysis_decisions.run_id` 추가(ALTER 먼저 → upsert/route 수정). 현재는 "종목별 최신 run" 휴리스틱.
  - 종목명 검색의 cold-start 갭(이름 로드 전 코드 검색만 매칭) 개선 여지.

### 2026-06-17 — feat(ai-analysis): Codex 토큰 사용량 캡처 (#136)

- **slug**: `codex-token-usage` · **author**: @devbob0701
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/136
- **요약**: feat(ai-analysis): Codex 토큰 사용량 캡처
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > PR #129 후속으로 Codex CLI의 실제 JSONL 이벤트를 파싱해 분석가별 토큰 사용량을 측정합니다.
  > 
  > ## 변경 사항
  > 
  > - `codex exec --json` 출력에서 최종 `agent_message` 본문 추출
  > - `turn.completed.usage`의 전체 입력·캐시 입력·출력 토큰 분리 저장
  > - 스키마 변경이나 usage 누락 시 본문 보존 + `measured:false` fail-soft 폴백
  > - 실측 스키마 기반 단위 테스트 및 QA 문서 추가
  > - Supabase `ai_agent_usage` DDL에 RLS 활성화 추가
  > - 실제 Supabase 프로젝트에 테이블·인덱스 생성 및 RLS 적용 완료
  > 
  > ## 검증
  > 
  > - Codex CLI `0.140.0-alpha.19` JSONL 실측
  > - `vitest run`: 267 passed / 1 skipped
  > - `tsc --noEmit`: 통과
  > - `eslint .`: 통과
  > - `next build`: 통과
  > - Supabase service-role REST 조회: HTTP 200
  > - anon 요청: RLS로 행 미노출
  > 
  > ## 영향
  > 
  > Codex provider 분석도 `/analyze` 대시보드의 입력·캐시·출력 토큰 집계에 포함됩니다. Codex CLI가 비용을 제공하지 않아 `cost_usd`는 null로 유지됩니다.
  > 
  > ## 다음 작업
  > 
  > - Codex provider로 실제 종합 분석 1회를 실행해 `provider='codex'`, `measured=true` 적재와 `/analyze` 렌더링을 확인합니다.
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - Codex provider로 실제 종합 분석 1회를 실행해 `provider='codex'`, `measured=true` 적재와 `/analyze` 렌더링을 확인합니다.
  - 필요하면 Codex CLI가 비용 메타데이터를 제공하는 시점에 `cost_usd` 캡처를 추가합니다.

### 2026-06-18 — feat(stock): 경량 종목 스냅샷 엔드포인트 신설 (value-picks-validated PR-1) (#137)

- **slug**: `value-picks-validated` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/137
- **요약**: feat(stock): 경량 종목 스냅샷 엔드포인트 신설 (value-picks-validated PR-1)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 무엇 / 왜
  > 
  > PRD `value-picks-validated` §3-A (PR-1, frontend 선행). value_picks 봇이 후보 종목별로 1회 호출해 **밸류트랩 룰**(유동성·수급추세·추세레짐)을 돌릴 결정적·저비용 read 스냅샷 엔드포인트 `GET /api/stock/snapshot?ticker=<6자리>` 신설. 기존 read 엔드포인트(`/price`·`/chart`·`/investors`)의 KIS 호출·매핑을 재사용·조합해 한 번에 반환한다.
  > 
  > PRD: `dev-manager-bot` 레포 `docs/prd/value-picks-validated.md` (§3-A, §5 AC-1~3).
  > 
  > ## AC-1~3 구현 위치
  > 
  > - **AC-1 (계약 충족)** — 최상위 필드(`ticker`/`name`/`market`/`asOf`/`price`/`valuation52w`/`marketCapKRW`/`foreignRatioPct`/`technical`/`investorTrend`) 전부 포함, 산출불가는 필드 생략이 아니라 `null`.
  >   - `lib/server/stock/snapshot.ts` `assembleSnapshot` — group 결과를 `StockSnapshot`(`lib/types/stock/snapshot.ts`)으로 합성. null 규약 보장.
  >   - 테스트: `lib/server/stock/__tests__/snapshot.test.ts` (`[AC-1]`), `app/api/stock/snapshot/__tests__/route.test.ts` (`[AC-1]`).
  > - **AC-2 (유동성·수급 핵심필드)** — `price.tradeAmountKRW = current*volume` 파생, `investorTrend.orgNetBuyAmountKRW`·`orgConsecutiveSellDays` 가 `fetchInvestorTrend` 집계로 채워짐.
  >   - `assembleSnapshot`(tradeAmountKRW·marketCapKRW), `aggregateInvestorTrend`(백만원→원 환산·연속 순매도 카운트).
  >   - 테스트: snapshot.test.ts `[AC-2]`, route.test.ts `[AC-2]`(기관 5일 연속 순매도 → `orgConsecutiveSellDays=5`).
  > - **AC-3 (컨벤션·폴백)** — 미설정 시 mock + `X-Data-Source: mock`, `ticker` 미지정 400, 부분 실패 시 200 + 산출 가능 필드만 + `X-Data-Source: kis-partial`.
  >   - `app/api/stock/snapshot/route.ts` — `isKisConfigured()` 게이트, ticker 정규식 400, `Promise.allSettled` 그룹별 부분 실패 흡수, 가격 그룹 전체 실패만 502, 타임아웃 시 `mock-timeout`.
  >   - 테스트: route.test.ts `[AC-3]` 7건(400 2종·mock·일봉/수급 부분실패·vts 시장 null·가격 그룹 전체 실패 502).
  > 
  > ## 라우트 전체 타임아웃 확정값
  > 
  > **8초** (`BFF_TIMEOUT_MS = 8_000`, `app/api/stock/snapshot/route.ts`). PRD §3-A-3 권장(8초 이내) + §3-B-2 봇 측 후보당 호출 타임아웃(8초)과 **정합**. 내부 KIS 호출은 `Promise.allSettled` 병렬, 타임아웃 시 mock degrade(`X-Data-Source: mock-timeout`).
  > 
  > ## 스냅샷이 묶는 KIS TR 수 (레이트리밋 고려)
  > 
  > 후보당 **최대 4 TR**:
  > 1. `inquire-price`(FHKST01010100) — 현재가·거래량·외국인지분·상장주수(시총·foreignRatio).
  > 2. `inquire-daily-itemchartprice`(FHKST03010100) — 일봉 ~400캘린더일(52주+이평/ADX 워밍업). 청크 분할 → 실제 **~3 콜**.
  > 3. `inquire-investor`(FHKST01010900) — 종목별 N일 수급. 실전·모의 둘 다 동작.
  > 4. `search-stock-info`(CTPF1002R) — 시장 구분(KOSPI/KOSDAQ). **prod 전용** → vts/미설정은 호출 생략·`market: null`.
  > 
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **PR-2 (봇, 후행)**: 본 PR 머지 후 `dev-manager-bot` `feature/value-picks-validated` 에서 value_picks 검증·재탐색 루프 구현(§3-B, AC-4~9). 본 엔드포인트를 후보당 1회 호출(타임아웃 8초 정합) — 밸류트랩 임계값(§6)은 봇 코드 상수로 분리.
  - **2차 후속 PRD(비범위)**: 재무비율(PER/PBR/ROE/배당/이익성장) 실데이터 소스 추가(§7-2). 본 스키마는 최상위 객체 확장이 쉬운 평면 구조 — 2차에서 `fundamentals` 블록 추가 가능.
  - 운영 모니터링: prod 에서 후보당 ~6 KIS 콜 × 라운드 후보 수의 EGW00201(초당 한도) 빈도 관찰 — 잦으면 chart 청크/동시성 조정.

### 2026-06-19 — feat(scorecard): AI 판정 채점·적중률 집계 backbone (signal-scorecard PRD+구현) (#140)

- **slug**: `signal-scorecard` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/140
- **요약**: feat(scorecard): AI 판정 채점·적중률 집계 backbone (signal-scorecard PRD+구현)
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 요약
  > 
  > AI 멀티에이전트 최종 판정(FinalDecision)이 실제로 적중했는지 채점·집계하는 **측정 backbone(phase-1)** 을 추가한다. 분석은 만들고 버려지던 루프를, 결정시점 가격 캡처 → 영업일 경과 후 채점 cron → 차원별 적중률 집계 → 운영자 표로 닫는다.
  > 
  > - PRD(단일 진실원): `docs/prd/signal-scorecard.md` (본 PR 에 포함)
  > - 기존 `ai_analysis_decisions`(ticker PK upsert) 는 **비파괴 보존**, 채점은 신규 append 테이블 `signal_scorecard` 로 완전 분리.
  > 
  > ## 적중 판정 로직 (핵심)
  > 
  > 결정시점 대비 horizon 수익률 `r% = (horizon종가 − entry_close)/entry_close × 100` 와 임계 `T=2%` 로 **hit/miss/flat 3분류**(`lib/server/scorecard/scoring.ts`, 순수 함수):
  > 
  > | verdict 군 | hit | miss | 그 사이 |
  > |---|---|---|---|
  > | BUY · OVERWEIGHT | r ≥ +T | r ≤ −T | flat |
  > | SELL · REDUCE | r ≤ −T | r ≥ +T | flat |
  > | HOLD | \|r\| ≤ T | \|r\| > T | (flat 없음) |
  > | UNDERWEIGHT | r ≤ 0 | r > +T | flat |
  > 
  > - `entry_close` = `signal.asOf` 봉의 종가(D2 — horizon 종가와 동일 KIS 일봉 출처라 재현·정합).
  > - `hitRate = hit/(hit+miss)` — **flat 은 분모 제외**(방향은 맞췄으나 폭이 작은 케이스가 적중률을 왜곡하지 않게, D3).
  > - horizon 평가일이 휴장이면 직후 가장 가까운 영업봉 종가 사용. 봉 부재(상폐·장기 휴장)면 `skipped`. 평가 미도래면 `pending` 유지(다음 cron 재시도).
  > 
  > ## 확정 결정 반영 (D1~D7)
  > 
  > - **D1** 별도 append 테이블 `signal_scorecard`(uuid PK) — 동일 ticker 재분석은 새 행. `ai_analysis_decisions` 무회귀.
  > - **D2** entry = `signal.asOf` 봉 종가. 라이브가(`live_price`)는 보조 저장만(채점 미사용).
  > - **D3** 3분류 hit/miss/flat, hitRate flat 제외.
  > - **D4** **단일 디스패처** — `flow-snapshot` cron 슬롯 안에서 flow 스냅샷 후 scoring 순차 호출(`vercel.json` cron 1개 유지). 각 단계 독립 try/catch. 채점 로직은 `/api/cron/score-decisions` 독립 라우트로도 노출(공통 `runScoring`).
  > - **D5** 단일 prod Supabase 전제.
  > - **D6** 경량 내부 운영자 표 — `docs/rules/frontend.md` 컨벤션 준수(한글 카피·BFF·`cn`·디자인 토큰, 색/px 직타 0).
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - **QA(라이브)**: SQL 선적용 후 로컬 분석 1회 → `signal_scorecard` 행 확인(AC-1/2), `/dashboard/scorecard` 두 뷰포트 표·필터·빈/미설정 상태(AC-8), prod cron 1회 채점(AC-3~6) 라이브 검증.
  - **운영 모니터링**: `scorecard:cron:meta`(KV) 헬스 마커로 디스패처 ②채점 단계 정상 동작 확인. flow-snapshot 무회귀 주시.
  - **인접 slug**: phase-2 `proactive-briefing`(채점 결과 → 능동 브리핑·푸시 채널 결정)는 본 backbone 머지 후 별도 착수.

### 2026-06-22 — feat(signal): 90~130봉 graceful degradation — 불확실성 경고 + confidence 캡 (#143)

- **slug**: `signal-degraded-warmup` · **author**: @HY0118
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/143
- **요약**: feat(signal): 90~130봉 graceful degradation — 불확실성 경고 + confidence 캡
- **현재 상태**: QA 통과 · 리뷰·머지 대기 (이 항목은 QA 통과 시점에 자동 기록됨)
- **PR 본문 발췌**:
  > ## 개요
  > 
  > 가격 데이터가 130봉 미만이어도 **90봉 이상이면 분석을 차단하지 않고** "데이터 부족·불확실" 경고와 함께 진행하고, confidence 를 낮춘다. 90봉 미만은 기존처럼 하드 에러. 신규 상장주(예: 케이뱅크)가 거래일 130일(~6개월)까지 분석을 전혀 못 받던 사각지대를 해소한다.
  > 
  > - PRD: `docs/prd/signal-degraded-warmup.md` (dev-manager-bot 레포)
  > - 경계 규칙(동결): `n < 90` 에러 / `90 ≤ n < 130` limitedData 분석 / `130 ≤ n` 풀 품질
  > 
  > ## 변경 요약 (5곳 + 테스트, 모두 trading-signal-frontend)
  > 
  > | 파일 | 변경 |
  > |---|---|
  > | `lib/signal/weights.ts` | `SOFT_MIN_BARS = 90` 추가. `MIN_BARS = 130` 의미를 "분석 차단 경계"→"풀 품질 경계"로 주석 갱신 |
  > | `lib/signal/engine.ts` | 하드 폴백 경계 `n < SOFT_MIN_BARS(90)`. `90 ≤ n < 130` 은 정상 평가 + `limitedData:true`. `n ≥ 130` 은 `limitedData:false`(기존 동일). limitedData 시 numeric confidence 에 상한 `Math.min(conf, 0.6)` 적용. **순수 함수 유지** |
  > | `lib/types/signal/index.ts` | `SignalResult` 에 `limitedData: boolean`, `bars: number` 추가. 하드 폴백 리턴 포함 모든 리턴 지점이 두 필드를 채움 |
  > | `app/api/stock/ai-analysis/route.ts` | `!warmupOk` 에러 문구 "데이터가 부족해 분석할 수 없어요. (최소 90봉 필요)" 로 갱신. `limitedData` 시 `signalSummary` 머리에 데이터 제한 경고 주입 + PM 에 `dataWarning` 직접 전달 |
  > | `lib/prompts/stock/aiAnalysis.ts` | PM 시스템 프롬프트 confidence 기준에 "데이터 제한 시 HIGH 금지(≤MEDIUM) + reasoning 에 불확실성 명시" 규칙 추가. `buildDataWarningContext` 로 PM user 프롬프트에 경고 블록 주입. 방향(BUY/HOLD/SELL)은 강제하지 않음 |
  > 
  > ### 두 confidence 구분 (PRD §1.3)
  > - **엔진 numeric confidence(0~1)**: engine.ts 의 `Math.min(conf, 0.6)` 캡 — 결정적 보조 수단. `signalSummary` 의 "동의도 N%" 를 눌러 LLM 에 데이터 제한을 간접 전달.
  > - **verdict confidence 라벨(HIGH/MEDIUM/LOW)**: 프롬프트가 1차 제어 — limitedData 마커 시 HIGH 금지.
  > - 둘은 상보적(중복 아님).
  > 
  > ## 테스트 결과
  > 
  > - 엔진 단위 테스트 18건 통과 (`lib/signal/__tests__/engine.test.ts`):
  >   - 경계값: `n=89`(하드 에러), `n=90/119/129`(limitedData:true·warmupOk:true·verdict 산출), `n=130/160/230`(limitedData:false)
  >   - confidence 캡: limitedData 시 `≤ 0.6`, 그리고 `= min(raw composite, 0.6)` 직접 대조(캡 의미 가드)
  >   - n≥130 회귀: confidence 무캡(= raw composite), 순수성(동일 입력 동일 출력)
  >   - 상수 가드: `SOFT_MIN_BARS=90`, `MIN_BARS=130` (off-by-one 방지)
  > - 전체 스위트: **356 passed / 1 skipped(라이브 백테스트)**
- **다음 작업 후보** (PR 본문 기반, 절대적 지시 아님):
  - QA: 라이브 검증 1건 — 케이뱅크 등 90~130봉 종목 실분석 → reasoning 불확실성 문구 + verdict confidence ≤ MEDIUM 육안 확인. QA 리포트는 dev-manager-bot `docs/qa/signal-degraded-warmup.md`.
  - 인접 분기(별도 PRD, 본 건과 독립): (a) 신규 상장/데이터 제한 종목 분석 카드 배지 노출 UX(디자이너 합류 필요), (b) LLM 이 confidence 캡 지시를 반복 무시할 경우 서버에서 limitedData 시 verdict confidence ≤ MEDIUM 강제 clamp 후처리.
