# QA — 종목 검색 시드 주간 자동화 (`symbols-weekly-automation`)

- 대상 PR: #343 (`chore/symbols-weekly-automation`)
- 변경 3파일: `.github/workflows/symbols-refresh.yml`(신규), `scripts/symbols_ci.py`(신규), `scripts/update-symbols.py`(손질)
- 검증 환경: 격리 워크트리 `wt-auto`, Python 3.9.6 (macOS)
- 성격: CI/스크립트 PR (앱/FE 코드 변경 0건) → 라이브 GHA 실행 불가하므로 **스크립트 단위 실행 + 워크플로 정적 검증**으로 판정.

## AC 별 검증

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1. py_compile 3.9+ 호환 | `python3 -m py_compile scripts/update-symbols.py scripts/symbols_ci.py` (Python 3.9.6) | exit 0 | exit 0. `from __future__ import annotations` 로 `dict \| None` 힌트 지연 평가 → 3.9 통과 | PASS |
| 2. 무결성 게이트 정상(델타0) | `python3 scripts/symbols_ci.py <tmp>` — 현 시드(HEAD=2600, 델타0) | exit 0 + "무결성 OK" + 본문 "종목 증감 없음" | `무결성 OK: 2600종목 · 신규 0 · 폐지 0 · corp_code 0`, exit 0, 본문 `_종목 증감 없음 — 메타만 갱신._` | PASS |
| 3. 무결성 실패 감지 | `check_integrity` 를 import 해 5개 변형 입력 주입 | 각 변형 err 반환, 정상 입력 err 0 | 아래 표 참조 — 전부 감지, 정상 입력 `[]` | PASS |
| 4. 델타 렌더 | `compute_delta`+`render_body` 로 old 인위 조작(신규2·폐지1·corp_code 1) | 신규/폐지/corp_code 각 섹션 정확 렌더 | `### 신규 상장/편입 (2)`, `### 상장폐지/제외 (1)`, `### corp_code 교정 1건` 모두 렌더 | PASS |
| 5. update-symbols no-op | `fetch_kind`/`fetch_dart_corp_codes` 를 기존 시드로 monkeypatch → `main()` 호출, 파일 mtime·git diff 확인 | write 스킵, 파일 무변경 | `변경 없음 — symbols.json 미갱신(no-op)` 출력, mtime 동일, `git diff` 없음 | PASS |
| 6. 워크플로 구조 | Ruby YAML 파싱 + grep 정적 검증 | changed 게이트·secret 미설정 실패·최소 permissions·무결성 실패 시 PR 미생성 | 아래 §AC6 참조 — 전부 충족 | PASS |

### AC3 상세 (check_integrity 변형 입력)

| 변형 | 반환 errs |
|---|---|
| 정상 입력 (new=old=현 시드) | `[]` |
| (a) symbols 절반 유실 (1300) | `count 정상범위(2400~2800) 벗어남: 1300`, `종목 급감(부분 fetch 의심): 2600 → 1300` |
| (b) 중복 티커 (교체) | `중복 티커 존재` |
| (b') 중복 티커 (append, count 2601) | `$meta.count_actual(2600) != 실제(2601)`, `중복 티커 존재` (count 불일치 + 중복 동시 감지) |
| (c) 빈 종목명 | `빈 종목명 존재` |
| (d) 비6자리 티커 (`12A45`) | `6자리 숫자 아닌 티커 존재` |
| ($meta 불일치 단독) | `$meta.count_actual(9999) != 실제(2600)` |

### AC6 상세 (워크플로 정적 검증)

- **트리거**: `schedule`(cron `0 18 * * 0` = 월 03:00 KST) + `workflow_dispatch` — 확인.
- **permissions 최소**: `{contents: write, pull-requests: write}` (키 2개, 그 외 없음) — 확인.
- **changed 게이트**: `무결성 게이트 + PR 본문 생성` step, `PR 생성` step 둘 다 `if: steps.diff.outputs.changed == 'true'` — 무변경 시 두 step 모두 skip → no-op PR 미생성. 확인.
- **OPENDART 미설정 명시 실패**: `if [ -z "$OPENDART_API_KEY" ]` → `::error::OPENDART_API_KEY secret 미설정 …` + `exit 1` — 조용한 실패 아님. 확인.
- **무결성 실패 시 PR 미생성**: `symbols_ci.py` exit 1 → step 실패 → job 상태 failed → 후속 `PR 생성` step 의 `if` 는 상태함수 미포함이라 GHA 가 암묵적 `success()` 를 AND 로 삽입 → skip. 무결성 실패 시 PR 열리지 않음. 확인.
- **timeout-minutes: 10**, **concurrency**(`group: symbols-refresh`, `cancel-in-progress: false`) — 중복 실행 직렬화. 확인.
- actionlint 미설치 환경 → Ruby `YAML.load_file` 파싱 성공(문법 오류 0) + grep 로 게이트 문구 확인.

## 에지 케이스

- **HEAD 미비교(`load_head_symbols` None)**: `git show HEAD:...` 실패/파싱 실패 시 `None` 반환 → 급감 검사만 생략, 나머지 무결성(count·티커·중복·빈이름) 은 그대로 동작. compute_delta 는 old 없으면 전 종목을 added 로 렌더(초기 케이스). 로직 확인.
- **워킹트리 vs HEAD 비교 정합**: 워크플로에서 update-symbols.py 가 워킹트리(unstaged) 를 수정 → `symbols_ci.py` 는 `SYMBOLS_PATH.read_text()`(신규 워킹트리) vs `git show HEAD`(구 커밋) 비교. 델타 방향 올바름.
- **no-op 판정 견고성**: `final_list == list(existing.values())` 는 corp_code 포함 엔트리 전체 비교 → 신규/폐지/corp_code 교정 중 하나라도 있으면 write. 폐지 종목은 `ordered` 에서 빠져 리스트 길이/내용 달라져 감지됨. AC5 monkeypatch 로 실측 확인.
- **경계값 count**: MIN 2400 / MAX 2800, 현 2600 은 중앙. DROP_FLOOR 0.97 → 2600×0.97≈2522 미만 급감 차단.

## 공통 AC (무회귀)

- 앱/FE 코드(`app/`·`lib/`·`components/`·`hooks/`) 변경 0건 → typecheck/lint/build·BFF 원칙·한글 톤·접근성 공통 AC 는 이 PR 범위 밖(무영향). 워크플로/스크립트의 사용자 노출 문구·PR 본문 렌더는 한글 톤 준수(ticker·API 필드 제외).

## 판정

**qa-passed** — AC 1~6 전부 PASS, 실패 0건. PR 본문에 `## 다음 작업` 섹션 존재 확인(라벨 게이트 통과).
