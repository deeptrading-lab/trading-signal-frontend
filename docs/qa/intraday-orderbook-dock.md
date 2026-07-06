# QA — 단타 워치 호가창·체결강도 우측 sticky 도킹 (`intraday-orderbook-dock`)

- 대상 PR: #284 (`feature/intraday-orderbook-dock`)
- 성격: 경량 UX 폴리시 (PRD 없음). 단일 파일 레이아웃 래핑.
- 변경 파일: `components/intraday/IntradayWatchWorkspace.tsx` (본 커밋 7ded498, +29 −23)
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-intraday-dock` (공유 메인 트리 미접촉)
- 판정: **qa-passed** (실패 0건)

## 환경 제약 (라이브 브라우저 roundtrip 대체 근거)

worktree 의 `node_modules` 는 공유 메인 트리로의 심볼릭 링크다.

```
node_modules -> /Applications/하영/code_source/trading-signal-frontend/node_modules
```

Next 16 Turbopack (`next build` / `next dev` 기본)은 이 심볼릭을 거부한다 (기지 함정, MEMORY):

```
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

따라서 **Turbopack 기반 dev 서버로 1280/390 실브라우저 재현이 이 worktree 에서 불가**하다 (webpack dev 우회는 instrumentation child_process 500 — 역시 기지 함정). 실브라우저 두 뷰포트 재현을 하려면 worktree 에 real `npm ci` 가 필요하다.

본 PR 은 **로직 무변경·레이아웃 래핑 전용 단일 파일**이므로, 라이브 roundtrip 을 아래로 대체했다:
1. `next build --webpack` 로 실제 컴파일 (Turbopack 심볼릭 제약 우회) — `/intraday` 라우트 빌드 성공.
2. 반응형 Tailwind 클래스 시맨틱을 AC 별로 정적 검증 (아래 표).

tsc/eslint 는 심볼릭에서 정상 동작한다.

## AC 별 검증

| AC | 재현·확인 | 기대 | 실측 |
|---|---|---|---|
| AC1 데스크탑 2컬럼 + sticky | 래퍼 `flex flex-col gap-lg lg:flex-row lg:items-start`. 좌 `flex min-w-0 flex-1 flex-col`, 우 `aside … lg:sticky lg:top-lg lg:w-[22rem] lg:shrink-0` | lg+ 에서 좌=표·우=호가+체결강도 나란히, 우측 sticky | **통과**. lg+ 에서 `lg:flex-row` 로 가로 배치, 우측 22rem 고정폭 `lg:shrink-0` 로 안 눌림. `lg:sticky lg:top-lg` + 부모 `lg:items-start`(=aside 세로 stretch 방지, sticky 유효 전제) 조합 정확. 행 클릭 로직(`onSelect={setSelectedTicker}`) 무변경 → 우측 해당 종목 표시 |
| AC2 모바일 무회귀 | <lg 에서 `lg:` prefix 미적용 → 래퍼 `flex flex-col`, 우 `w-full` | 표 아래 세로 스택, 오버플로 없음 | **통과**. 이전 코드도 모바일에서 `w-full` 세로 스택이었고 동일. 신규 클래스는 전부 `lg:` 로 게이트되어 모바일 무영향 |
| AC3 표 폭 | 좌 컬럼 `min-w-0 flex-1`; 미선택 시 우측 `{selectedTicker ? … : null}` 미렌더 | 좁아지면 표 자체 `overflow-x-auto`, 미선택 시 표 전체폭 | **통과**. `min-w-0` 로 flex 자식이 콘텐츠 min-size 아래로 축소 허용 → `IntradayWatchTable` 내부 `overflow-x-auto` 가 가로 스크롤 흡수(래퍼 넘침 없음). 미선택 시 우측 aside 미렌더 → 좌측 `flex-1` 단독 = 전체폭 |
| AC4 기능 무회귀 | `IntradayWatchTable`·`OrderbookPanel`·`TradeStrengthPanel` props 전부 동일, 폴링/선택/시작/제거/후보 칩/검색 코드 미변경 | 무변경 | **통과**. diff 는 래핑 div/aside 추가·주석뿐. `selectedTicker`·`setSelectedTicker`·`useQueryWatchlist`·`start`/`remove`·`CandidateChips`·`StockSearchPicker` 손대지 않음 |
| AC5 게이트 | tsc·eslint·build·신규 커스텀 Tailwind | 0 에러 / 0 신규 | **통과** (아래 로그) |

## 게이트 로그

- `npx tsc --noEmit` → exit 0
- `npx eslint components/intraday/IntradayWatchWorkspace.tsx` → exit 0
- `npx eslint .` → exit 0, 출력 0줄
- `npx next build --webpack` → **exit 0**, `○ /intraday` 라우트 프리렌더 성공
- `npx next build` (Turbopack) → 심볼릭 node_modules 거부로 실패 (환경 제약, 코드 무관 — 위 참조)

### 신규 커스텀 Tailwind 0 검증

사용된 클래스: `flex flex-col flex-row gap-lg gap-sm gap-xs items-start min-w-0 flex-1 w-full lg:sticky lg:top-lg lg:w-[22rem] lg:shrink-0 rounded-md bg-surface-muted px-md py-sm text-caption text-text-muted`.

- `top-lg` → spacing 토큰 `lg` = `14px` (tailwind.theme.json 확인), 신규 아님.
- `lg:w-[22rem]` → arbitrary 리터럴. 기존 코드의 `lg:max-w-[22rem]` 과 동일 관례, 신규 토큰 아님.
- 나머지 전부 기존 표준 유틸/토큰. **신규 커스텀 클래스 0건.**

## 공통 AC 무회귀

- BFF: 변경 파일 내 `fetch(` 직접 호출 0건. `git grep http://127.0.0.1 -- app/` 히트는 route handler adapter fallback(`app/api/workbench/_adapters/fastapi.ts`)뿐 — 허용 예외, 본 PR 무관.
- 한글 톤: 사용자 노출 문구 카피(`INTRADAY_*_COPY`) 미변경, 추가 하드코딩 문구 없음.
- 접근성: 우측 컨테이너 `section`→`aside` 로 변경 + `aria-label={W.orderbookTitle}` 유지 → 보조 랜드마크 레이블 무회귀. 표/칩/검색 레이블 미변경.

## 에지 케이스

- 미선택(`selectedTicker === null`): 우측 aside 미렌더, 좌측 `flex-1` 전체폭 — AC3 커버.
- 워치 비었을 때(`rows.length === 0`): 기존 empty 안내 분기 그대로, 2컬럼 래퍼 진입 안 함.
- 좁은 좌측 컬럼: `min-w-0` 없으면 flex 자식이 콘텐츠 min-content 아래로 안 줄어 래퍼 자체가 넘침 → 표 `overflow-x-auto` 무력화되는 것이 표준 flex 함정. 본 PR 이 `min-w-0` 를 정확히 부여해 회피.
- sticky 무력화 함정: 부모가 자식을 세로로 stretch 하면(`items-stretch` 기본) aside 가 표 높이만큼 늘어 sticky 스크롤 여지가 사라진다. `lg:items-start` 로 정확히 방지.

## 미커버 (환경 제약)

- 실브라우저 1280/390 픽셀 재현·리사이즈·SSR hydration 육안 확인은 worktree 심볼릭 node_modules(Turbopack 거부)로 미수행. real `npm ci` 한 트리에서 재현 권장. 본 PR 은 로직 무변경·레이아웃 래핑 전용이라 정적 반응형 검증 + webpack build 로 대체.
