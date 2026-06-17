# QA 리포트 — AI 종목 분석 패널 전역화 (페이지 이동에도 백그라운드 유지)

- **슬러그**: `ai-analysis-bg-persist`
- **대상 브랜치/커밋**: `feature/ai-usage-dashboard` @ `cf945d0` (`feat(ai-analysis): 분석 패널 전역화 — 페이지 이동에도 백그라운드 유지`)
- **검증 일시**: 2026-06-17
- **검증 방식**: 자동 검증(typecheck/lint/build/vitest) 실행 + 코드 정합 리딩. 브라우저 라이브 플로우는 "수동 검증 필요" 표로 절차·기대 명시(에이전트 직접 실행 불가). 사용자 사전 확인: navbar 이동 시 접힘 + 백그라운드 유지 = "잘된다".

---

## 1. 자동 검증 결과

| 명령 | 결과 | 핵심 출력 |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ 통과 | 에러 0건 (출력 없음) |
| `npm run lint` (`eslint .`) | ✅ 통과 | 에러 0건 (출력 없음) |
| `npm run build` (Turbopack) | ✅ 통과 | 전 라우트 컴파일 성공. `/api/stock/ai-analysis` 포함 라우트 트리 정상 생성 |
| `npx vitest run` (전체) | ✅ 통과 | **Test Files 41 passed / 1 skipped (42)** · **Tests 264 passed / 1 skipped (265)** · 1.41s. skip = `liveBacktest`(실네트워크 라이브 테스트, 의도적 skip) |

### 공통 회귀 게이트

| 항목 | 명령 | 결과 |
|---|---|---|
| BFF 무회귀 — 클라이언트에서 FastAPI 직접 호출 | `git grep -nE "http://127\.0\.0\.1" -- app/ ':!app/api/**'` | **0건** ✅ |
| 직접 `fetch(` 호출 점검 | `git grep -nE "[^a-zA-Z.]fetch\(" -- lib/api hooks components` | 실제 호출은 `lib/api/stock/aiAnalysis.ts:60` 1건뿐 — same-origin `/api/stock/ai-analysis`(SSE 전용, axios 미지원이라 native fetch 사용하는 기존 예외). 나머지 매치는 주석/`refetch`(false positive). FastAPI 직타 0건 ✅ |
| 한글 톤 무회귀 | 신규 노출 문구 리딩 | 재열기 탭 `AI 분석`, `doneCount/총개수`(숫자), 패널 카피는 기존 `COPY` 재사용. 신규 영어 노출 문구 없음 ✅ |
| 접근성 | 코드 리딩 | 재열기 탭 `aria-label="AI 분석 패널 열기"`, 패널 `role="complementary"` + `aria-label`, 에이전트 칩 에러 시 `role="button"`+`tabIndex`+`onKeyDown(Enter/Space)` 유지 ✅ |

---

## 2. AC별 검증 (재현 · 기대 · 실측/근거 · 판정)

### AC-1 — 분석 중 페이지 이동 시 서버 ERR_INVALID_STATE 크래시 없음

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) `next dev` → 종목 분석 시작 → 진행 중 navbar로 다른 페이지 이동 → 서버 콘솔 관찰 |
| 기대 | 서버가 `ERR_INVALID_STATE` 던지지 않고 `스트림 종료 (disconnect/abort)` 정상 로그로 마무리 |
| 근거 (코드) | `app/api/stock/ai-analysis/route.ts` — ① `closed` 플래그(L368) + `send()`가 `if(closed) return`(L373) + `try/catch`(L374), ② `safeClose()`가 `if(closed) return; closed=true; try{controller.close()}catch{}`(L376-380), ③ `cancel()`에서 `closed=true`(L686) 선세팅, ④ catch 블록이 `closed‖aborted‖AbortError`를 정상 종료로 처리(L672-673). 모든 `controller.close()`/`enqueue` 경로가 `send`/`safeClose` 가드를 경유함을 확인 — 직접 `controller.close()`/`controller.enqueue()` 호출 없음. |
| 판정 | ✅ 코드상 보장 (라이브 1회 수동 확인 권장 — §4) |

### AC-2 — 페이지 이동해도 스트림 abort 없이 백그라운드 진행

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) 분석 시작 → 이동 → 재열기 탭 진행수(doneCount) 증가 관찰 |
| 기대 | 이동해도 스트림 유지, 에이전트 done 카운트 계속 증가 |
| 근거 (코드) | ① 패널·스트림 소유권이 종목 페이지가 아닌 `(main)` 셸로 이전: `app/(main)/layout.tsx` L41 `<AIAnalysisProvider>` + L60 `<GlobalAIAnalysis/>` → 종목 페이지 unmount돼도 Provider/abortRef 유지. ② 라우트 변경 effect가 `setIsOpen(false)`·`setShowReanalysisPrompt(false)`만 호출하고 **`abortRef.current.abort()`는 호출하지 않음**: `aiAnalysisProvider.tsx` L114-119. abort는 오직 `start`/`run`/`resume`(신규 스트림)·`stop`·언마운트 cleanup에서만 발생. |
| 판정 | ✅ 코드상 보장 + 사용자 사전 확인 |

### AC-3 — 라우트 변경 시 패널 자동 접힘(스트림 유지) · 같은 페이지 클릭은 펼침 유지

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) 패널 펼친 상태로 navbar 이동 → 자동 접힘 확인. 같은 페이지에서 버튼/탭 클릭 → 펼침 유지 확인 |
| 기대 | 경로 변경 시에만 접힘. 같은 경로 내 상호작용은 영향 없음 |
| 근거 (코드) | `aiAnalysisProvider.tsx` L112-119: `prevPathRef`로 경로 **변경 시에만**(`prevPathRef.current !== pathname`) `setIsOpen(false)`. 같은 경로 재호출은 early-return → 펼침 상태 보존. `usePathname`은 라우트 그룹 `(main)`이 URL에 안 들어가므로 실제 경로 변경만 트리거. |
| 판정 | ✅ 코드상 보장 |

### AC-4 — 재열기 탭 전 페이지 노출 + 진행 표시(doneCount/총개수) + 클릭 시 재펼침

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) 분석 시작 → 다른 페이지 이동 → 우측 재열기 탭/스피너/`n/12` 확인 → 클릭 → 패널 재펼침 |
| 기대 | 모든 (main) 페이지에서 탭 노출, 진행 중 스피너+카운트, 클릭 시 라이브 뷰 |
| 근거 (코드) | ① 탭이 `GlobalAIAnalysis`(셸 mount) 안 `AIAnalysisPanel`에 있어 전 페이지 공유. 노출 조건 `!isOpen && !isAllPending`(`AIAnalysisPanel.tsx` L201). ② 진행 표시: L212-216 스피너(isRunning), L218-222 `{doneCount}/{agents.length}`(`agents.length`=12). `doneCount = agents.filter(status==="done").length`(provider L418). ③ 클릭 `open()` → `openFor(analyzingTicker)` → `setIsOpen(true)`(provider L299-303, 286-296). |
| 판정 | ✅ 코드상 보장 (반응형 위치 §3 참고) |

### AC-5 — 다른 종목 버튼 클릭 시 그 종목 idle 진입 + 기존 백그라운드 유지 / 새 분석 시작 시 기존 중단(동시 1건)

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) A 종목 분석 중 → B 종목 페이지 AI분석 버튼 → B의 공급자 선택/이전 결론(idle) 표시, A는 백그라운드 유지(탭 카운트 계속) → B 분석 시작 → A 중단, B 진행 |
| 기대 | viewTicker≠analyzingTicker면 idle 투영, start 시 기존 abort |
| 근거 (코드) | ① `openFor(B)` → `setViewTicker(B)`만, analyzingTicker(A) 불변(provider L286-296). ② `GlobalAIAnalysis.tsx` L24 `idleView = isOpen && viewTicker!==analyzingTicker` → L26-39 `INITIAL_AGENT_STATES`·빈 reports/debate·`isRunning:false`로 투영(라이브 A 가림, **스트림은 안 건드림**). ③ `start` → `startStream` 진입부 `abortRef.current?.abort()`(provider L238) → 기존 A 스트림 중단 후 B 시작. 동시 1건 보장. |
| 판정 | ✅ 코드상 보장 |

### AC-6 — 회귀 없음 (에이전트 카드·토론·재개/resume·stop·재분석 프롬프트)

| 항목 | 내용 |
|---|---|
| 재현 절차 | (수동) 분석 정상 1회 완주, 에이전트 에러 시 resume, 중지(stop), 완료 후 재분석 프롬프트 |
| 기대 | 기존 패널 내부 동작 동일 |
| 근거 (코드) | `useAIAnalysis.ts`(삭제) → `aiAnalysisProvider.tsx`로 로직 이관. `handleEvent`(L148-228, progress/stream/report/debate/sentiment/final/error/done)·`resume`(L325-384, fromIndex 기준 preState 구성·토론 bull부터 재실행·UI 부분 리셋)·`stop`(L402-406, haltRunning+abort)·`run`(L274)·재분석 프롬프트(L290-292 openFor 시 `!allPending && !isRunning` → showReanalysisPrompt) 모두 보존. 서버측 resume 경로(`startFrom`/`state`)·debate loop의 `aborted` 반환(`lib/prompts/stock/aiAnalysis.ts` L584-652) 정합. typecheck/lint/build/test 통과로 시그니처 회귀 없음 확인. |
| 판정 | ✅ 코드상 보장 (라이브 회귀 스폿체크 권장 — §4) |

---

## 3. 반응형 두 뷰포트 점검 (코드 기준)

| 항목 | 모바일 (`< md`) | 데스크탑 (`lg+`) | 판정 |
|---|---|---|---|
| 재열기 탭 위치 | `fixed right-0 top-1/2 -translate-y-1/2 z-[70]` — 뷰포트 무관 동일 우측 중앙 고정. BottomNav(`fixed bottom-0`)와 세로 중앙이라 겹침 없음 | 동일. Sidebar(264px 좌측)와 우측 탭 겹침 없음 | ✅ |
| 패널 폭 | `w-full`(전폭) — 모바일 풀스크린 오버레이 | `w-full` 동일(전폭). 시안상 의도된 전폭 패널 | ✅ 회귀 없음(기존과 동일 클래스) |
| 패널 top offset | `top-[56px]`(navbar 아래) — 상단 지수·테마토글 노출 유지. 스크림도 `top-[56px]` | 동일 | ✅ |
| 헤더 공급자 배지 | `hidden md:inline-block` — 모바일 숨김(공간 절약) | 노출 | ✅ 의도된 분기 |
| 에이전트 칩 바 | `overflow-x-auto`(가로 스크롤 캐러셀) + `data-running` 자동 스크롤 | `md:flex-wrap md:overflow-x-visible` | ✅ |
| 리스크 3카드 | 가로 스냅 캐러셀(`w-[78%]` peek) | `md:grid md:grid-cols-3` | ✅ |
| `useBreakpoint` 사용 | `StockPageLayout`이 `isMobile`로 레이아웃 분기(기존 유지, `window.innerWidth` 직타 없음) | 동일 | ✅ |

신규 추가분(재열기 탭 진행 카운트, GlobalAIAnalysis 투영)은 뷰포트별 분기를 도입하지 않으며 기존 패널 클래스를 재사용 — 반응형 회귀 리스크 낮음.

---

## 4. 수동 검증 필요 항목 (라이브 CLI 환경)

> 에이전트가 직접 `next dev` + 실제 AI CLI 스트림을 돌릴 수 없으므로 아래는 사용자/리뷰어 수동 확인 항목. (AI 분석은 로컬 CLI 전용 — Vercel 503.)

| # | 절차 | 기대 결과 | 비고 |
|---|---|---|---|
| M-1 | A 종목 분석 시작 → 진행 중 navbar로 마이페이지 이동 | 서버 콘솔에 `ERR_INVALID_STATE` 없음, `스트림 종료 (disconnect/abort)` 없이 백그라운드 계속 / 재열기 탭 카운트 증가 | AC-1·2. 사용자 사전 확인 "잘된다" |
| M-2 | 위 상태에서 재열기 탭 클릭 | 라이브 뷰로 재펼침, 진행 중 에이전트·스트리밍 그대로 이어짐 | AC-4 |
| M-3 | A 분석 중 B 종목 페이지에서 AI분석 버튼 | B의 공급자 선택(또는 B 이전 결론) idle 화면, 탭의 A 카운트는 계속 증가 | AC-5 idle 투영 |
| M-4 | M-3 상태에서 B 분석 시작 | A 스트림 중단(서버 abort 로그), B 새로 진행 | AC-5 동시 1건 |
| M-5 | 분석 완주 후 다시 그 종목 AI분석 버튼 | 재분석 프롬프트 노출, "다시 분석" → 공급자 선택 | AC-6 |
| M-6 | 분석 중 특정 에이전트 에러 유도 → resume 버튼 / 칩 클릭 | 해당 에이전트부터 재개, 이전 결과 보존 | AC-6 resume |
| M-7 | 분석 중 stop(중지) | running 에이전트 error 전환, 스트림 abort, resumeFrom 노출 | AC-6 stop |
| M-8 | 모바일(375)·데스크탑(1280) 각각에서 M-1~M-2 | 두 뷰포트 모두 탭/패널/스크림 정상, 레이아웃 깨짐 없음 | §3 라이브 확인 |

---

## 5. 발견된 이슈 / 리스크

### 관찰 (블로킹 아님)

1. **[리스크-낮음] 라우트 변경 effect의 의존성** — `aiAnalysisProvider.tsx` L114 effect는 `[pathname]`만 의존하고 본문에서 `setIsOpen`/`setShowReanalysisPrompt`(setter는 안정)만 호출. StrictMode 더블 인보크 시 `prevPathRef` 비교로 멱등(같은 경로 재실행은 early-return) — 부작용 없음. 다만 최초 mount 시 `prevPathRef.current === pathname`이라 접힘 트리거 안 됨(의도대로 정상).

2. **[관찰] 언마운트 cleanup abort 범위** — L105-107 cleanup이 `abortRef.current?.abort()` 호출. Provider가 `(main)` 셸에 있어 그룹 내 이동에선 unmount 안 됨 → 백그라운드 유지. **실제 라우트 점검 결과 navbar/sidebar 주요 진입점(`/`, `/market`, `/stock`, `/profile`, `/watchlist`, `/dashboard`, `/analyze`)은 전부 `(main)` 그룹 내**이므로 정상 동작. `(main)` 밖 라우트는 `/login`·`/splash-ios`·`/icon-pwa`뿐이며 이는 일반 navbar 이동 대상이 아님(로그인 게이트/PWA 자원). → 실 사용 경로에서 AC-2 백그라운드 유지에 영향 없음. **블로킹 아님.**

3. **[관찰] idle 투영 중 헤더 공급자 배지/상태** — `idleView`일 때 `projected`는 결과만 비우고 `provider`·`isOpen` 등은 `ctx` 그대로 전달(`{...ctx} {...projected}`). idle 화면은 `isAllPending` 분기라 공급자 배지(`!isAllPending` 조건) 미노출 → 일관됨. 문제 없음.

### 블로킹 이슈

- **없음.**

---

## 6. 종합 판정

**통과 (조건부 — 라이브 수동 스폿체크 권장)**

- 자동 검증 4종(typecheck/lint/build/vitest 265) 전부 통과.
- 공통 회귀 게이트(BFF 직타 0건, 한글 톤, 접근성) 무회귀.
- AC-1~6 모두 코드 정합상 보장 확인. 핵심 가드(`closed`/`safeClose`, 라우트 effect가 abort 미호출, start 시 기존 abort, idle 투영) 라인 단위 검증.
- 사용자 사전 확인(navbar 이동 시 접힘+백그라운드 유지)과 일치.
- 라이브 AI CLI 스트림 동작은 에이전트 직접 실행 불가 → §4 M-1~M-8 수동 확인을 통과 조건으로 권장. (§5-2 라우트 그룹 점검 완료 — navbar 주요 진입점 전부 `(main)` 내라 백그라운드 유지에 영향 없음. 블로킹 이슈 0건.)
