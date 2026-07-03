# QA Report: intraday-paused-remove

- **PRD**: 없음 — 경량 반복 플로우 (2파일 소규모 UX 변경)
- **PR**: [#206 feat(intraday): 멈춘 세션 종목 워치에서 제거 가능](https://github.com/deeptrading-lab/trading-signal-frontend/pull/206)
- **브랜치**: `feature/intraday-paused-remove` (766a3e4)
- **검증일**: 2026-07-03
- **검증자**: QA 에이전트
- **검증 방식**: 코드 정적 검증 + typecheck/vitest 실측. **라이브 브라우저 QA 불가** — dev 서버가 다른 브랜치를 서빙 중. **장중 라이브 확인은 머지 후 모니터링** (PENDING, fail 사유 아님).

변경 요약: ① `useIntradayPaperWatch.ts` — 표 자동 상주 `activeStocks` 를 `running|paused` → **running 만**으로 축소. ② `IntradayWatchTable.tsx` — ✕ 제거 버튼 노출 조건을 `!current || status === "completed"` → **`!current || status !== "running"`** 으로 확장.

---

## 1. 수용 기준 검증 (AC-1 ~ AC-4)

### AC-1 (✕ 버튼 노출: 세션 없음·paused·completed·failed 행 O, running 행 X)

| 항목 | 값 |
|---|---|
| 재현 절차 | `IntradayWatchTable.tsx:559` 조건 인스펙션 + status 유니온 대조 |
| 기대 결과 | ✕ 노출 조건이 running 의 정확한 여집합 (세션 없음 + paused/completed/failed) |
| 실측 결과 | 조건 `!current \|\| current.status !== "running"` (559행). `current = detail?.session ?? session` (361행, detail 우선 최신값). `PaperTradingSessionStatus = "running" \| "paused" \| "completed" \| "failed"` (lib/types/paperTrading/paperTrading.ts:13) — `!== "running"` 여집합 = {paused, completed, failed} 정확히 일치. `!current`(세션 없는 행)도 노출. running 이면 조건 false → 미노출. `STATUS_LABEL` 4종 모두 정의(labels.ts:69-74, failed="실패") → 상태 칩 렌더 안전 |
| 판정 | **PASS** |

### AC-2 (activeStocks = running 만 → 일시정지 종목 ✕ 제거 후 자동 상주로 안 되살아남)

| 항목 | 값 |
|---|---|
| 재현 절차 | 훅 `activeStocks` 필터 + `IntradayWatchWorkspace` 편입 effect·rows memo 데이터 흐름 추적 |
| 기대 결과 | paused 세션 종목은 activeStocks 에 없음 → 제거 후 재편입·rows 재등장 없음 |
| 실측 결과 | ① `useIntradayPaperWatch.ts:62` `filter(status === "running")` — paused 제외 확인. ② 편입 effect (`IntradayWatchWorkspace.tsx:93-102`) 는 activeStocks 중 watch 에 없는 것만 **추가** — paused 종목은 소스에 없어 재편입 불가. ③ rows memo (`106-114행`) = watch ∪ activeStocks — 제거된 paused 종목은 양쪽 모두 부재 → 행 소멸. ④ 보강: 일시정지 mutation `onSuccess` 가 세션 목록 쿼리 invalidate (`useMutationPatchPaperTradingSession.ts:13`) → 정지 직후 activeStocks 재계산 보장 (stale 목록이 재편입시키는 레이스 없음) |
| 판정 | **PASS** |

### AC-3 (✕ 는 로컬 워치만 제거 — 세션 삭제 API 없음, 재추가 시 기존 세션 재연결)

| 항목 | 값 |
|---|---|
| 재현 절차 | onRemove 경로 추적 + 삭제 API 호출 grep + sessionByTicker 매핑·재개 버튼 확인 |
| 기대 결과 | localStorage `finsight:intraday-watch` 상태만 변경, 세션 데이터 무손실, 재추가 시 재개 버튼 |
| 실측 결과 | ① onRemove → `remove(ticker)` = `setWatch(filter)` 만 호출 (`IntradayWatchWorkspace.tsx:125`) → 저장 effect(74-81행)가 `WATCH_STORAGE_KEY = "finsight:intraday-watch"`(48행)에 반영. ② `git grep "fetch(\|axios.delete\|api.delete" -- components/intraday/ hooks/intraday/` → **0건** (세션 삭제 API 자체가 경로에 없음). ③ `sessionByTicker` (`useIntradayPaperWatch.ts:45-54`) 는 status 필터 없이 **전 cli 세션** 매핑 (`pickBetter`: running 우선 → 최신 updatedAt) → 재추가된 행에 기존 paused 세션 연결 → `WatchRow` 511-518행 `running ? 일시정지 : 재개(Play)` 버튼 렌더 |
| 판정 | **PASS** |

### AC-4 (회귀 없음: tsc 클린 + vitest 전체 통과)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npx tsc --noEmit` + `npx vitest run` 직접 실행 |
| 기대 결과 | 둘 다 0 에러 |
| 실측 결과 | `npx tsc --noEmit` → **exit 0** (출력 없음). `npx vitest run` → **Test Files 88 passed \| 3 skipped (91), Tests 734 passed \| 3 skipped (737)**, Duration 3.30s, 실패 0 (skipped 3건은 `__live__` 라이브 백테스트 — 기존부터 조건부 스킵) |
| 판정 | **PASS** |

---

## 2. 공통 무회귀

| 항목 | 실측 | 판정 |
|---|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` route handler 제외 → 0건 | PASS |
| 한글 톤 | 변경분은 주석·필터 조건뿐, 신규 사용자 노출 문구 없음 (✕ aria-label "워치에서 제거" 등 기존 카피 재사용) | PASS |
| 접근성 | ✕ 버튼 `aria-label={T.removeAria}` 유지 (`intradayRead.ts:126`), 노출 조건만 변경 — Tab 순서·label 무영향 | PASS |

## 3. 에지 케이스

| 케이스 | 검증 | 판정 |
|---|---|---|
| running 행에서 일시정지 클릭 직후 ✕ | `setStatus("paused")` onSuccess 에서 detail `setQueryData` + sessions 목록 invalidate 가 동시 실행 → ✕ 가 보이는 시점(=detail 이 paused)엔 목록 동기화도 트리거됨. 편입 effect 는 추가만 하므로 최악에도 행 유지일 뿐 데이터 손실 없음 | PASS |
| completed 행 ✕ (기존 동작) | 변경 전 조건(`status === "completed"`)은 새 조건의 부분집합 → 완료 행 제거는 기존과 동일 동작, 무회귀 | PASS |
| failed 세션 | UI 에서 failed 로 전이 불가(`setStatus` 는 `Extract<..., "running"\|"paused"\|"completed">`) — 읽기 전용 상태. STATUS_LABEL·✕ 노출 모두 커버 | PASS |
| 같은 종목 다중 세션 (완료 + 일시정지) | `pickBetter` 가 running 없으면 최신 updatedAt 우선 → 최근 일시정지 세션에 재연결 | PASS |
| SSR/localStorage | `storageReady` 게이트(마운트 후 복원·복원 전 저장 금지) — 본 PR 무변경 영역 | PASS |

## 4. 라이브 라운드트립 — PENDING

dev 서버가 다른 브랜치를 서빙 중이라 브라우저 라운드트립(일시정지 행 ✕ 클릭 → 표에서 소멸 → 재추가 → 재개 버튼) 미수행. **장중 라이브 확인은 머지 후 모니터링으로 대체** — 정적 검증상 데이터 손실 경로 없음(로컬 상태만 변경)이라 리스크 낮음.

---

## 5. 종합 판정

| 구분 | 결과 |
|---|---|
| AC 1~4 | 4/4 PASS |
| 공통 무회귀 | 3/3 PASS |
| 에지 케이스 | 5/5 PASS |
| 라이브 라운드트립 | PENDING (머지 후 모니터링, fail 아님) |

**판정: qa-passed** — 실패 0건.
