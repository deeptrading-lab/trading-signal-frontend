# Watchlist UI 컴포넌트 점검 리포트

> **작성일**: 2026-05-30
> **브랜치**: `fix/watchlist-partial-render`
> **상태**: 코드 미수정 — 사용자 후속 적용용 레퍼런스 문서 (이 리포트만 작성, 컴포넌트는 손대지 않음)
> **원칙**: 신규 디자인 토큰 도입 0 유지. 아래 제안은 모두 기존 토큰/유틸 클래스(`button-secondary`, `search-result-item-focus`, `skeleton`, `sr-only`, `badge-*` 등) 범위 안에서 가능.

## 개요

`/watchlist` 화면은 `WatchlistContainer`(데이터/상태) → `WatchlistPage`(셸) → `WatchlistTable` → `WatchlistRow` + `WatchlistAddModal`로 구성된 client 컴포넌트 트리다. 영구화는 `useWatchlistTickers` + `store.ts`(localStorage 격리)로, 시세는 `useQueryWatchlist`(BFF `/api/watchlist`)로 분리돼 있다. `fix/watchlist-partial-render`의 핵심인 **좌조인 렌더(담은 ticker 기준 행, 시세 누락분은 디그레이드 행)** 설계는 견고하고 책임 분리도 대체로 좋다. 다만 (1) 디그레이드 행이 종목명 없이 ticker만 노출, (2) 모달 focus trap 부재, (3) 검색 모달의 시드 한정(약 100종목) UX 한계, (4) 디바운스 부재 등에서 개선 여지가 있다.

### 점검 대상
- `components/watchlist/WatchlistPage.tsx`
- `components/watchlist/WatchlistContainer.tsx`
- `components/watchlist/WatchlistTable.tsx`
- `components/watchlist/WatchlistRow.tsx`
- `components/watchlist/WatchlistAddModal.tsx`
- `hooks/watchlist/useWatchlistTickers.ts`, `hooks/watchlist/useQueryWatchlist.ts`
- `lib/copy/watchlist/labels.ts`, `lib/api/watchlist/store.ts`
- 참고: `lib/api/kis/search.ts`(검색 소스 = `symbols.json` 시드 약 100종목), `components/market/IndicesCardContainer.tsx`(상태 분기/`sr-only`/`role="alert"` 패턴 비교), `app/components.css`(토큰 정의)

---

## 개선점 요약 (우선순위 × 분류)

| # | 우선순위 | 분류 | 항목 | 위치 |
|---|---------|------|------|------|
| 1 | 높음 | a11y | 모달 focus trap·복귀 포커스·배경 inert 부재 | `WatchlistAddModal.tsx` |
| 2 | 높음 | 상태UX | 디그레이드 행이 종목명 없이 ticker만 — 시드 name 활용 가능 | `WatchlistRow.tsx:54-86`, `WatchlistTable.tsx` |
| 3 | 높음 | 검색모달 | 검색 소스가 시드 약 100종목 한정 — 미수록 종목 검색 불가 안내 부재 | `lib/api/kis/search.ts`, `WatchlistAddModal.tsx:124` |
| 4 | 중간 | 검색모달 | 입력 디바운스 부재 — 키 입력마다 쿼리 | `WatchlistAddModal.tsx:43-49` |
| 5 | 중간 | a11y | 행 `role="link"`에 접근 가능한 이름(aria-label) 부재 | `WatchlistRow.tsx:94-104` |
| 6 | 중간 | a11y | 에러/로딩 카드에 `role="alert"`/`aria-busy`/`sr-only` 부재 (market과 불일치) | `WatchlistContainer.tsx:48-85`, `WatchlistTable.tsx:60-79` |
| 7 | 중간 | 검색모달 | listbox 키보드 내비(↑↓/Enter) 부재 — `role="listbox"`만 선언 | `WatchlistAddModal.tsx:111-157` |
| 8 | 중간 | 구조 | `useQueryWatchlist` 미사용 `options` 인자 + 컨테이너 상태 파생 응집 | `useQueryWatchlist.ts:19-30`, `WatchlistContainer.tsx` |
| 9 | 낮음 | 디테일 | 데드코드: `ASSET_TYPE_STOCK`/`ASSET_TYPE_CRYPTO` 미사용 | `labels.ts:16-17` |
| 10 | 낮음 | 디테일 | 스켈레톤 row `key={i}` 인덱스 키 + 하드코딩 `h-4`/`w-2/3` px | `WatchlistTable.tsx:61-77` |
| 11 | 낮음 | 디테일 | `quoteByTicker` Map·디그레이드 분기 메모이즈 부재(경미) | `WatchlistTable.tsx:49` |
| 12 | 낮음 | 반응형 | 12-col grid가 뷰포트 무관 동일 — 모바일 카드 전환 없음, `md:` 중복 | `WatchlistRow.tsx:106-129` |
| 13 | 낮음 | 디테일 | 디그레이드 행 col-span 합(7+3+2=12) 정상이나 헤더(4/3/3/2)와 컬럼 정렬 불일치 | `WatchlistRow.tsx:57-84` vs `WatchlistTable.tsx:53-58` |

---

## 상세

### [높음 · a11y] 1. 모달 focus trap·복귀 포커스 부재

**위치**: `components/watchlist/WatchlistAddModal.tsx:37-160`

ESC 닫기와 오픈 시 입력 포커스는 구현돼 있으나, (a) Tab이 모달 밖 배경 요소로 빠져나가고, (b) 닫을 때 트리거 버튼("+ 종목 추가")으로 포커스가 복귀하지 않으며, (c) 배경에 `aria-hidden`/`inert`가 없다. 모달 a11y의 핵심 3요소가 빠져 있다.

**제안** (기존 의존성만 사용, 신규 토큰 0):

```tsx
// 1) 트리거 복귀 포커스 — open 전환 시 직전 활성 요소 저장 후 close 시 복귀
useEffect(() => {
  if (!open) return;
  const prevActive = document.activeElement as HTMLElement | null;
  return () => prevActive?.focus();
}, [open]);

// 2) focus trap — panelRef 안에서 Tab 순환
const panelRef = useRef<HTMLDivElement>(null);
function onPanelKeyDown(e: React.KeyboardEvent) {
  if (e.key !== "Tab") return;
  const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusables || focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
// <div ... ref={panelRef} onKeyDown={onPanelKeyDown} role="dialog" aria-modal="true" ...>
```

> 비고: `aria-modal="true"`는 이미 있으나 스크린리더 외 키보드 사용자에겐 실제 trap이 필요하다. 프로젝트에 focus-trap 라이브러리가 없다면 위 수동 구현으로 충분.

---

### [높음 · 상태UX] 2. 디그레이드 행이 ticker만 노출 — 시드 name 활용

**위치**: `components/watchlist/WatchlistRow.tsx:54-86`

부분실패 시 디그레이드 행은 `{ticker}`(예: `005930`)만 보여줘 사용자가 어떤 종목인지 식별하기 어렵다. 검색 소스인 `symbols.json`(약 100종목)에는 ticker→name 매핑이 이미 존재한다(`lib/api/kis/search.ts`의 `SYMBOLS`). 시드에 있는 종목이면 디그레이드 행에서도 "삼성전자 (005930)"로 표시 가능하다.

**제안**: `lib/api/kis/search.ts`에 가벼운 lookup을 추가(컴포넌트 외부, 표시 변환은 행에서):

```ts
// lib/api/kis/search.ts — 시드 name 역참조 (없으면 null)
export function getSymbolName(ticker: string): string | null {
  return SYMBOLS.find((s) => s.ticker === ticker)?.name ?? null;
}
```

```tsx
// WatchlistRow.tsx — 디그레이드 분기 (before)
<span className="text-body-strong text-text-strong">{ticker}</span>

// (after) — 시드 name 있으면 종목명 우선, ticker는 보조로
const seedName = getSymbolName(ticker);
// ...
{seedName ? (
  <>
    <span className="text-body-strong text-text-strong truncate">{seedName}</span>
    <span className="text-caption text-text-muted">{ticker} · {WATCHLIST_ROW_FAILED}</span>
  </>
) : (
  <>
    <span className="text-body-strong text-text-strong">{ticker}</span>
    <span className="text-caption text-text-muted">{WATCHLIST_ROW_FAILED}</span>
  </>
)}
```

> 대안(더 깔끔): `WatchlistTable`이 `tickers`를 매핑할 때 `getSymbolName(ticker)`로 `fallbackName`을 계산해 prop으로 내려주면, 행은 lookup 모듈을 직접 import하지 않아도 된다(프레젠테이션 순수성 유지).

---

### [높음 · 검색모달] 3. 검색 소스가 시드 약 100종목 한정 — 미수록 종목 검색 불가

**위치**: `lib/api/kis/search.ts:28,36-57` (`SYMBOLS` = `symbols.json` 약 100종목, `$meta.count_target=350` 미달), 소비 지점 `WatchlistAddModal.tsx:124`

현재 검색은 KIS 종목 마스터 전체가 아니라 **수동 시드 약 100종목(KOSPI/KOSDAQ 대형주) substring 매칭**이다. 시드에 없는 종목(중소형주·신규상장 등)은 6자리 ticker를 정확히 입력해도 "일치하는 종목이 없어요"로 처리돼 관심종목에 담을 수 없다. 이는 데이터 한계지 버그가 아니지만, 사용자에겐 "검색이 안 되는 것"으로 보인다.

**개선 방향**:
- **(단기, 코드 변경 최소)** 빈 결과 카피를 한계 인지형으로 보강. `labels.ts`의 `WATCHLIST_SEARCH_EMPTY`를 "현재 대표 종목 위주로만 검색돼요. 6자리 종목코드로도 추가할 수 있어요." 류로 조정하고, 6자리 ticker 직접 입력 시 시드 미수록이어도 추가 허용하는 경로를 검토(아래 코드 참고). 단 이 경우 시세/메타는 BFF가 채우고 name은 ticker fallback.

```tsx
// WatchlistAddModal.tsx — 6자리 ticker 직접 추가 허용 (시드 미수록 보완)
const isRawTicker = /^\d{6}$/.test(trimmed);
// results.length === 0 분기에서:
results.length === 0 ? (
  isRawTicker && !hasTicker(trimmed) ? (
    <button
      type="button"
      role="option"
      className="search-result-item w-full text-left"
      onClick={() => onAdd(trimmed)}
    >
      <span>{trimmed} 직접 추가</span>
      <span className="search-result-item-meta">코드</span>
    </button>
  ) : (
    <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
      {WATCHLIST_SEARCH_EMPTY}
    </p>
  )
) : ( /* ... */ )
```

- **(중기, 정공법)** 전체 종목 마스터 연동 — KIS 종목정보 마스터 파일 또는 검색 API로 `searchSymbols`/`fetchStockSearchClient` 내부 교체. `lib/api/kis/search.ts` 헤더 주석에도 "후속 PR(Fuse.js 또는 KIS 검색 API) 진입 시 시그니처 유지하며 내부만 교체"라 명시돼 있어 시그니처 호환 교체 가능. 350종목 풀 시드 확장(`$meta.count_target=350`)이 1차 마일스톤.

---

### [중간 · 검색모달] 4. 입력 디바운스 부재

**위치**: `components/watchlist/WatchlistAddModal.tsx:43-49`

`keyword`가 바뀔 때마다 `useQueryStockSearch(trimmed)`가 새 queryKey로 호출된다. 현재는 클라이언트 시드 검색이라 비용이 낮지만, #3의 마스터 API 연동 후엔 키 입력마다 네트워크 호출이 된다. 지금 디바운스를 넣어 두면 API 교체 시 무변경.

```tsx
// 디바운스된 keyword 파생
const [keyword, setKeyword] = useState("");
const [debounced, setDebounced] = useState("");
useEffect(() => {
  const id = window.setTimeout(() => setDebounced(keyword.trim()), 200);
  return () => window.clearTimeout(id);
}, [keyword]);
const trimmed = debounced;
// 입력칸 value 는 즉시 반영되는 keyword, 쿼리는 trimmed(debounced) 사용
```

---

### [중간 · a11y] 5. 행 `role="link"`에 접근 가능한 이름 부재

**위치**: `components/watchlist/WatchlistRow.tsx:94-104`

정상 행은 `role="link" tabIndex={0}`로 키보드 진입과 Enter/Space 라우팅까지 구현돼 좋다. 다만 접근 가능한 이름이 없어 스크린리더가 "링크"로만 읽는다. 종목명·등락을 라벨로 노출하면 명확해진다.

```tsx
// (after)
<div
  className="grid grid-cols-12 gap-md items-center p-md transition-colors hover:bg-surface-muted cursor-pointer"
  role="link"
  tabIndex={0}
  aria-label={`${quote.name} 상세 보기`}
  onClick={...}
  onKeyDown={...}
>
```

> 추가: 삭제 버튼은 `aria-label`이 이미 잘 들어가 있다(`WatchlistRow.tsx:79,144`). 다만 행 전체가 link role이라 내부 삭제 버튼이 중첩 인터랙티브가 되는데, `e.stopPropagation()`으로 클릭은 분리돼 있으나 키보드 포커스 순서상 정상 동작 확인 권장.

---

### [중간 · a11y/상태UX] 6. 에러/로딩에 `role="alert"`/`aria-busy`/`sr-only` 부재 — market과 불일치

**위치**: `components/watchlist/WatchlistContainer.tsx:48-85`(에러 카드), `WatchlistTable.tsx:60-79`(스켈레톤)

`components/market/IndicesCardContainer.tsx`는 에러 카드에 `role="alert"`, 로딩에 `aria-busy="true"` + `sr-only` 텍스트를 넣는다(같은 디자인 시스템의 확립된 패턴). watchlist는 같은 상태를 다루면서 이 a11y 신호가 빠져 있어 도메인 간 일관성이 깨진다.

```tsx
// WatchlistContainer.tsx — 에러 카드 (after)
<div className="card flex flex-col items-center gap-sm py-2xl text-center" role="alert">
  ...
</div>
```

```tsx
// WatchlistTable.tsx — 스켈레톤 컨테이너 (after)
<div className="divide-y divide-border-line" aria-busy={isLoading ? true : undefined}>
  {isLoading && <span className="sr-only">관심종목 시세를 불러오는 중</span>}
  {isLoading ? (...) : (...)}
```

> `sr-only`는 Tailwind 기본 제공 + 프로젝트 다수 컴포넌트에서 사용 중이라 신규 토큰 0.

---

### [중간 · 검색모달] 7. listbox 키보드 내비 부재

**위치**: `components/watchlist/WatchlistAddModal.tsx:111-157`

컨테이너에 `role="listbox"`, 항목에 `role="option"`/`aria-selected`를 선언했으나 ↑/↓ 이동·Enter 선택 키보드 핸들러가 없다. 결과를 Tab으로만 순회해야 한다. `search-result-item-focus`(+ `-meta`) 토큰이 이미 정의돼 있어(`app/components.css`) 활성 항목 강조에 그대로 쓸 수 있다.

```tsx
const [activeIdx, setActiveIdx] = useState(-1);
// 입력 onKeyDown:
function onInputKeyDown(e: React.KeyboardEvent) {
  if (results.length === 0) return;
  if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
  else if (e.key === "Enter" && activeIdx >= 0) {
    const item = results[activeIdx];
    if (item && !hasTicker(item.ticker)) onAdd(item.ticker);
  }
}
// 항목 className: cn(activeIdx === idx ? "search-result-item-focus" : "search-result-item", ...)
// keyword 변경 시 setActiveIdx(-1) 리셋
```

---

### [중간 · 구조] 8. `useQueryWatchlist` 미사용 인자 + 상태 파생 응집

**위치**: `hooks/watchlist/useQueryWatchlist.ts:19-30`, `WatchlistContainer.tsx:42-49`

- `useQueryWatchlist`의 `options.enabled`는 정의돼 있으나 `WatchlistContainer`에서 전달하지 않는다(`useQueryWatchlist(tickers)`만 호출). 현재 동작엔 문제없으나(내부 `tickers.length > 0` 가드 존재) 미사용 옵션 인자는 의도 혼동을 준다 — 그대로 둘 거면 주석으로 "컨테이너는 tickers 가드에 의존"임을 명시하거나, 사용 안 하면 옵션 인자 제거 고려.
- `showSkeleton`/`showError`/`isEmpty` 파생은 `WatchlistContainer:46-49`에 잘 모여 있다(좋음). 이 상태 머신을 작은 헬퍼(`deriveWatchlistView`)로 빼면 단위 테스트가 쉬워진다(선택).

---

### [낮음 · 디테일] 9. 데드코드 — 미사용 라벨

**위치**: `lib/copy/watchlist/labels.ts:15-17`

```ts
/** WatchlistAssetType enum 한글 매핑. */
export const ASSET_TYPE_STOCK = "주식";
export const ASSET_TYPE_CRYPTO = "코인";
```

`WatchlistAssetType` enum 및 자산 타입 배지는 실데이터 전환(`WatchlistQuote`)에서 제거됐고 두 상수는 어디서도 import되지 않는다(grep 확인). 삭제 권장.

---

### [낮음 · 디테일] 10. 스켈레톤 인덱스 키 + 하드코딩 px

**위치**: `components/watchlist/WatchlistTable.tsx:61-77`

```tsx
{Array.from({ length: skeletonRows }).map((_, i) => (
  <div key={i} ...>           // 인덱스 키 — 정적 리스트라 치명적이진 않으나
    <div className="h-4 w-2/3 rounded-pill bg-surface-muted" />  // h-4/w-2/3 하드코딩
```

- 스켈레톤은 순서·개수가 고정이라 인덱스 키가 실질 문제는 아니지만, 프로젝트의 다른 스켈레톤(`market`의 `.skeleton`/`.skeleton-line` 토큰)과 패턴을 통일하면 일관성이 올라간다. `key={`sk-${i}`}` 정도로 명시하거나 `.skeleton-line` 토큰 재사용 검토.
- `h-4`/`h-3`는 spacing 토큰(`h-md` 등)이 아닌 Tailwind 기본 숫자 유틸이다. 신규 토큰 도입 없이 기존 `.skeleton-line` 클래스로 대체하면 톤 통일.

---

### [낮음 · 디테일] 11. `quoteByTicker` Map 메모이즈 부재

**위치**: `components/watchlist/WatchlistTable.tsx:49`

`const quoteByTicker = new Map(quotes.map(...))`가 매 렌더 재생성된다. 행 수가 soft cap 30이라 성능 영향은 미미하나, 부모 리렌더가 잦으면 `useMemo([quotes])`로 감싸는 게 깔끔하다(선택).

---

### [낮음 · 반응형] 12. 모바일 카드 전환 없음 / `md:` 중복

**위치**: `components/watchlist/WatchlistRow.tsx:106,125,129`

- `col-span-4 md:col-span-4`처럼 base와 `md:`가 동일 값이라 `md:` 접두는 무의미(중복) — 제거해도 동작 불변.
- 12-col grid가 모든 뷰포트에서 동일해, 좁은 모바일에서 종목명 truncate + 가격/등락이 빡빡할 수 있다. 시안상 테이블 유지가 요구사항이면 OK이나, 모바일에서 "관리" 컬럼 우선순위를 낮추거나(예: 등락 칩 아래로) 카드형 전환은 디자이너 합류 후 검토 대상. (디테일 비주얼은 사용자 몫이므로 구조적 지적만.)

---

### [낮음 · 디테일] 13. 디그레이드 행 컬럼 정렬 불일치

**위치**: `components/watchlist/WatchlistRow.tsx:57-84`(7/3/2) vs 헤더 `WatchlistTable.tsx:53-58`(4/3/3/2)

디그레이드 행은 `col-span-7`(이름+안내) / `col-span-3`(재시도) / `col-span-2`(삭제)로 합은 12이지만, 헤더의 4/3/3/2 컬럼 경계와 어긋나 "현재가/등락률" 헤더 아래에 재시도 버튼이 위치한다. 의도된 디자인이면 무방하나, 시각적 컬럼 정합을 원하면 `col-span-4`(이름) + `col-span-6`(안내+재시도 묶음) + `col-span-2`(삭제)로 헤더와 맞출 수 있다.

---

## 퀵윈 체크리스트 (바로 적용 가능)

- [ ] **데드코드 제거**: `labels.ts`의 `ASSET_TYPE_STOCK`/`ASSET_TYPE_CRYPTO` 삭제 (#9)
- [ ] **에러 카드 `role="alert"`** 추가 — market 패턴과 일치 (#6, `WatchlistContainer.tsx`)
- [ ] **스켈레톤 `aria-busy` + `sr-only` 안내** 추가 (#6, `WatchlistTable.tsx`)
- [ ] **정상 행 `aria-label`** = `${quote.name} 상세 보기` (#5, `WatchlistRow.tsx`)
- [ ] **모달 닫을 때 트리거 복귀 포커스** (#1, `useEffect` cleanup 한 줄)
- [ ] **`md:col-span-*` 중복 제거** (#12, `WatchlistRow.tsx`)
- [ ] **검색 입력 디바운스 200ms** — 마스터 API 교체 대비 (#4, `WatchlistAddModal.tsx`)
- [ ] **빈결과 카피 + 6자리 ticker 직접 추가** — 시드 한계 완화 (#3, `WatchlistAddModal.tsx` + `labels.ts`)

---

*모든 제안은 기존 토큰/유틸(`button-secondary`, `search-result-item-focus(-meta)`, `skeleton(-line)`, `sr-only`, `badge-*`) 범위 내에서 가능하며 신규 디자인 토큰 도입이 필요하지 않다. 코드는 본 리포트에서 수정하지 않았다 — 사용자가 직접 적용한다.*
