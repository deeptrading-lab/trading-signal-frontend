# QA — intraday-watchlist-softcap (PR #325)

`fix(intraday): 세션 목록 현재가 '—' 수정(30 soft cap 절단) + 시세 지연로드`

- 대상 브랜치: `fix/intraday-watchlist-softcap` (worktree `-price-wt`)
- 구동 환경 제약: Turbopack 이 심볼릭 `node_modules` 를 거부하는 알려진 함정 → **라이브 브라우저 구동 스킵**. vitest/tsc/eslint + 코드 정독 + 라이브 Supabase 재구성으로 검증.

## 근본 원인 재확인 (라이브 데이터)

- `IntradayWatchWorkspace` 가 `[...오늘, ...전체 과거]` 유니크 티커를 **한 번의** `useQueryWatchlist` 로 넘김.
- `/api/watchlist` route 는 `SOFT_CAP=30` → `unique.slice(0, SOFT_CAP)` 로 **조용히 절단**(`X-Watchlist-Truncated` 헤더만 통지, 클라 `getWatchlist` 무시). route 소스 line 99 확인.
- 라이브 재구성(`reconstruct.mjs`): **오늘 16 + 과거 유니크 19 = 합쳐서 32 > 30** → 31·32번째(240810·419050) 절단. 어떤 티커가 잘리는지 세션 정렬 의존 = **비결정적** → 특정 기기서 SK하이닉스/SK스퀘어 "—".

## AC별 검증

| AC | 재현/근거 | 기대 | 실측 |
|---|---|---|---|
| 오늘 기본 페치 | `useQueryWatchlist(rowTickers)` 오늘 행만 (workspace L179) | 정상 사용 ≤cap, 절단 0 | 오늘 16 ≤ 30 → 오늘 전 행 시세 O (버그 해소) |
| 과거 지연로드 | `useQueryWatchlist(expandedPastTickers, {enabled: len>0})` L204 | 펼친 그룹만 조회 | `collectTickersForDateKeys` 펼친 그룹만/중복제거, 접힘 0건 요청 (테스트 3건 pass) |
| getWatchlist 청크 | `list.test.ts` | >30 → 30단위 분할·순서보존 병합, ≤30 no-op | 32→2청크(30+2) 순서보존, 30·3개 단일호출 (4건 pass) |
| 로딩 UI | 새 펼침 행 Skeleton, 기존 무깜빡 | `isFetching`+`keepPreviousData` | 신규 행 quote=null&&isFetching→Skeleton, 기존 행 previousData 유지 (코드 확인) |
| 무회귀 | 오늘 요약·경보·폴링·controlled 하위호환 | 회귀 0 | `daySummary` 세션기반(시세 무관)·경보 fail-soft·`useIntradayPaperRefresh` 무변경·`controlled=expandedDateKeys!==undefined` 하위호환 |

## 자동 검증 출력

```
npx vitest run   -> 1192 passed | 3 skipped (136 files)
  chunk.test.ts 5 · list.test.ts 4 · IntradayWatchTable.test.ts 3 · IntradayWatchWorkspace.test.ts 6
npx tsc --noEmit -> exit 0
npx eslint .     -> exit 0
```

## 지연로드 정확성 (코드 정독)

- (a) 과거 시세 = 펼친 그룹만 (`enabled` 가드) — 접힌 그룹 요청 0. ✓
- (b) `togglePastGroup` → `pastExpandOverride` flip → `expandedPastTickers` 재계산 → 쿼리 재실행. ✓
- (c) 가장 최근 과거 그룹 기본 펼침(`?? dateKey===pastMostRecentKey`) + 오늘 표 시세는 항상 로드. ✓
- (d) "모두 펼치기"(`onSetAllGroups`) → 전 그룹 펼침 → `expandedPastTickers` >30 가능 → `getWatchlist` 청크로 절단 0. ✓
- (e) Skeleton은 신규 로딩 행만(`quote?…:quotesLoading?<Skeleton>`), `keepPreviousData` 로 기존 행 무깜빡. ✓

## 에지 케이스

- 오늘 그룹 >30(미래): `rowTickers>30` → `getWatchlist` 청크로 방어. ✓
- 빈 티커: `getWatchlist([])`→[] + `enabled: tickers.length>0` → 요청 0. ✓
- SSR/localStorage: `storageReady` 게이트 — 마운트 후 복원, 복원 전 저장 안 함(하이드레이션 불일치·초기 빈배열 덮어쓰기 방지). ✓
- 경보 배치: 토스 키 없음/실패도 200+빈 맵(fail-soft) → 표/칩 렌더 무차단, 스코프 오늘+펼친과거로 축소. ✓

## 판정

- **qa-passed** — 실패 0건. BFF 원칙(직접 fetch 0)·토큰 직타 0·한글 톤 무회귀 유지.
