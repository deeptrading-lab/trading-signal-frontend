# QA 리포트 — intraday-expand-panels (PR #285)

- 브랜치: `feature/intraday-expand-panels` (격리 worktree `tsf-wt-ai-scalp`)
- 성격: 경량 UX 폴리시 (PRD 없음). 단타 워치 호가/체결강도를 우측 도크(#284) → 행 펼침 차트 탭 밑으로 이동 + "AI 단타" 리네임.
- 판정: **qa-passed** (실패 0건)
- 커밋 범위: `cf174b3` (직전 `bb55c7d` #284 도킹 위에)

## 환경 / 방법 주석

- worktree `node_modules` 는 공유 메인 트리로의 **심볼릭 링크**. Next 16 Turbopack `next build`/`next dev` 는 심볼릭을 거부(`Symlink [project]/node_modules is invalid, it points out of the filesystem root` FATAL panic) — 알려진 워크트리 제약(MEMORY 기록). 따라서 `build`/라이브 dev 렌더는 이 worktree 에서 불가.
- 대신 심볼릭에서 정상 동작하는 **`tsc`(typecheck) + `eslint`** 를 게이트로 삼고, diff 구조 검증으로 배치·폴링·리네임 AC 를 확인. 본 변경은 `localOnly` `/intraday`(prod 미배포) 대상 UX 폴리시로, 구조·게이트 검증이 적정 깊이.
- 로컬 BE(`127.0.0.1:8000`) 미기동(`curl → 000`). 호가/체결강도 패널의 실 폴링 라운드트립은 이 환경에서 재현 불가 — 패널 컴포넌트(`OrderbookPanel`/`TradeStrengthPanel`)·훅은 본 PR 에서 미변경(위치만 이동)이라 회귀 위험 없음.

## AC 별 결과

| AC | 기대 | 재현/검증 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 펼침 배치 | 차트 탭에서 분봉 밑 호가창(좌)+체결강도(우) 2컬럼(sm+)/스택(모바일), 표 폭 온전 | `IntradayWatchTable.tsx` diff: `tab === "chart"` 블록이 `flex flex-col gap-md` 로 `IntradayMiniChart` + `<div className="grid grid-cols-1 gap-md sm:grid-cols-2">` 안 `OrderbookPanel`(좌)·`TradeStrengthPanel`(우) | 모바일 1컬럼 스택 → sm+ 2컬럼. 패널이 펼침(=표 셀 폭) 안에 있어 표 자체를 밀지 않음(#284 도크 폭 잠식 해소) | PASS |
| AC2 도크 제거 | 워크스페이스 우측 sticky aside 없음, 표 단일 컬럼, 행 선택 하이라이트 유지 | `IntradayWatchWorkspace.tsx` diff: `lg:flex-row` 마스터-디테일 + `<aside lg:sticky>` + `OrderbookPanel`/`TradeStrengthPanel` import·`selectedName` 전부 제거. `<>` 래퍼 안 안내노트 + `IntradayWatchTable` 단일. `selectedTicker`/`onSelect={setSelectedTicker}` 여전히 표에 전달 | 우측 aside 소거, 표 단일 컬럼. 선택 하이라이트 배선 유지 | PASS |
| AC3 폴링 범위 | 호가/체결강도가 펼친 행에서만 렌더, 닫으면 언마운트, "체결 내역" 탭 미표시 | `IntradayWatchTable.tsx`: L636 `{expanded ? (<tr>…)}` 로 펼침 `<tr>` 전체 조건부 렌더 → 닫으면 언마운트. 패널은 L687 `{tab === "chart" ? …}` 블록 내부 → orders(체결 내역) 탭에선 미렌더 | 펼친 행 + 차트 탭에서만 마운트/폴링. 닫힘·체결내역 탭 전환 시 언마운트 | PASS |
| AC4 리네임 | 사이드 "AI 단타"(short "단타"), H1 "AI 단타", 모의 뒤로가기 "AI 단타로", 자동틱 "AI 단타 화면이…". 사용자노출 "단타 워치" 0(주석 제외) | `navCopy.ts`: `NAV_MENU_INTRADAY="AI 단타"`, `NAV_MENU_INTRADAY_SHORT="단타"`. `intradayRead.ts`: `title="AI 단타"` → `IntradayWatchWorkspace.tsx:164 <h1 className="text-h1">{W.title}`. `labels.ts`: `PAPER_TRADING_BACK_TO_WATCH="AI 단타로"`, `PAPER_TRADING_AUTO_TICK_NOTE="AI 단타 화면이 열려 있는 동안…"`. `git grep "단타 워치"` → 잔여 전부 주석(파일 헤더·라우트 설명·queryKeys/hooks/toss 설명) | 사용자노출 "단타 워치" 0. 잔여 12건 모두 주석 | PASS |
| AC5 무회귀 | 후보칩·검색·시작/제거·세션 상주·체결내역 탭 무변경, 신규 커스텀 Tailwind 0 | 워크스페이스 diff 는 aside/selectedName 제거만; `flowCandidates`·`volumeCandidates`·`StockSearchPicker`·`start`/`remove` 배선 불변. 신규 클래스 `flex flex-col gap-md`·`grid grid-cols-1 gap-md sm:grid-cols-2` = 전부 기존 spacing 토큰(`gap-md`)·표준 유틸 | 후보/검색/시작·제거/체결내역 무변경. 신규 커스텀 Tailwind 0 | PASS |
| AC6 게이트 | tsc·eslint 통과, 가능하면 build | `npm run typecheck` → 0 에러. `npx eslint <변경 5파일>` → EXIT 0. `npm run build` → Turbopack 심볼릭 거부 FATAL(환경 제약, 코드 결함 아님) | typecheck/eslint 통과, build 는 worktree 심볼릭 한계로 대체(위 환경 주석) | PASS |

## 게이트 명령 로그

```
$ npm run typecheck
> tsc --noEmit
(에러 없음)

$ npx eslint components/intraday/IntradayWatchTable.tsx components/intraday/IntradayWatchWorkspace.tsx \
    lib/copy/layout/navCopy.ts lib/copy/paperTrading/labels.ts lib/copy/stock/intradayRead.ts
EXIT=0

$ npm run build
FATAL: Symlink [project]/node_modules is invalid, it points out of the filesystem root
(worktree 심볼릭 node_modules 에 대한 Turbopack 알려진 제약 — 코드 결함 아님)
```

## 공통 AC 무회귀

- BFF 원칙: 본 PR 클라이언트 코드에 FastAPI 직접 호출 신규 없음(패널은 기존 BFF 훅 경유, 위치만 이동).
- 한글 톤: 사용자 노출 문구 전부 한글("AI 단타" 등). 회귀 없음.
- 접근성: 펼침 `aria-expanded`, 탭 `aria-selected` 기존 배선 유지. 워크스페이스 H1 유지.

## 에지 케이스

- **BE 다운/호가 없음**: `OrderbookPanel`/`TradeStrengthPanel` 은 자체 스켈레톤/빈 상태 처리(본 PR 미변경). 위치 이동만이라 회귀 없음.
- **행 급속 펼침/닫힘**: 펼침 `<tr>` 전체 조건부 언마운트로 폴링 훅도 함께 정리 → 누수 없음(구조 확인).
- **좁은 뷰포트**: `grid-cols-1` 기본 → 호가/체결강도 세로 스택, 표는 펼침 셀 폭 안에서 자체 `overflow-x-auto` 흡수. 도크가 표 폭을 잠식하던 #284 문제 해소.

## 판정

전 AC PASS. `build` 는 worktree 심볼릭 환경 제약으로만 미수행(코드 결함 아님, tsc/eslint 로 대체). → **qa-passed**.
