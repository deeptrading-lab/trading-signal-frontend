# QA 리포트 — 관심종목 인라인 검색 + 별 추가/제거 토글 (`watchlist-inline-search`)

- 대상 PR: #100 (`feature/watchlist-inline-search`, head `3fdd9c7`)
- 변경 요지: `/watchlist` 의 "+ 종목 추가" 버튼·모달(`WatchlistAddModal`) 제거 → 상단 인라인 검색(`WatchlistSearch`) + 행별 별 토글(`WatchlistStarButton`, 추가 시 파티클 축하). 단일 `useWatchlistTickers` 인스턴스를 검색·표가 공유.
- 환경: `npm run build && npx next start -p 64032` (프로덕션 빌드, 로컬). 앱 비밀번호 게이트 비활성(`APP_PASSWORD` 미설정)이라 `/watchlist` 직접 접근. 검색은 클라이언트 lazy `symbols.json` 시드. BE(KIS/FastAPI) 미기동 → `/api/watchlist` 는 mock 폴백/디그레이드(표 회귀 점검은 폴백 데이터로 수행).
- 검증 도구: Playwright (chromium, 1.60.0), 데스크탑 1280 + 모바일 375 뷰포트.
- **판정: PASS** — 점검 9개 항목 + 공통 AC 전부 통과. 핵심 회귀 포인트(항목 4 파티클 오발화 / 항목 5 별 클릭 시 닫힘) 모두 정상.

---

## 1. 점검 항목별 검증표

| # | 항목 | 기대 | 재현 절차 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | 검색 UI | 상단 검색 입력 존재, "+ 종목 추가" 버튼 제거, 입력 시 하위 드롭다운 결과 | `/watchlist` 진입 → `input[role=combobox]` 카운트 + `"+ 종목 추가"` 텍스트 카운트 | 검색 input **1개**, `"+ 종목 추가"` 버튼 **0개**. "삼성" 입력 → 드롭다운 16행 노출 | PASS |
| 2 | 별 토글 — 추가 | 빈 별 클릭 → 추가 + 채운 별 + **파티클 발화** + localStorage 반영 | "삼성" 검색 → 미추가 행(삼성바이오로직스 207940) 별 클릭, 클릭 직후 `.is-celebrating` 확인 | `checked=true`, `.is-celebrating` **1건**(파티클 발화), `watchlist:tickers` 에 `207940` append. 표에도 추가됨(§3 폴백 표 확인) | PASS |
| 3 | 별 토글 — 제거 | 채운 별 클릭 → 제거 + 빈 별 + 표에서 사라짐, **파티클 없음** | "삼성" 검색 → 추가 상태 행(삼성전자 005930) 별 클릭 | `checked=false`, `.is-celebrating` **0건**(제거 시 파티클 미발화), LS 에서 `005930` 제거됨 | PASS |
| 4 | 이미 추가된 종목 (★핵심) | 검색결과에 이미 관심종목인 행은 **처음부터 채운 별**, **파티클 자동 발화 안 함** | 시드(005930/000660/035420) 보유 상태로 "삼성" 검색 → 삼성전자 행의 초기 `checked`/`.is-celebrating` 측정 | 삼성전자(005930) 행 초기 `checked=true`(채운 별) + `aria-selected=true`, `.is-celebrating` **0건**(자동 발화 없음). 나머지 미추가 행은 `checked=false` | PASS |
| 5 | 다중 추가 + 닫힘 (★핵심) | 별 여러 개 연속 클릭 → 드롭다운 **안 닫힘**, 컨테이너 바깥 클릭 → 닫힘, 재포커스 → 다시 열림 | "삼성" 결과 14개 별 연속 클릭 → 드롭다운 visibility → 페이지 좌하단(10,700) 클릭 → 입력 재포커스 | 별 14연속 클릭 후 드롭다운 **계속 열림(visible=true)**. 바깥 클릭 시 **닫힘(visible=false)**. 입력 재포커스 시 **다시 열림(visible=true)** | PASS |
| 6 | 6자리 코드 직접 추가 | 시드 미수록 6자리 코드 → "직접 추가" 행 + 별로 추가 | `999998` 입력 → 행 텍스트/별 클릭 → LS 확인 | `"999998 직접 추가 · 코드"` 행 1개 렌더, 별 클릭 시 LS 에 `999998` append | PASS |
| 7 | 빈 상태 | 0건일 때 빈 상태 문구 + 검색 상단 유지 | LS `[]` + seeded=1 세팅 후 reload | `"관심종목을 추가해 보세요"` 1건 + `"종목을 검색해 별을 눌러…"` 힌트 1건 + 검색 input **여전히 노출(1개)** | PASS |
| 8 | light/dark | 별 색(앰버/골드 chart-signal), 드롭다운(surface-elevated), 텍스트 시인성 양 테마 | `html.dark` 토글 후 "삼성" 검색, 별 fill·드롭다운 bg·메타 color computed 측정 | **light**: 별 fill `rgb(245,158,11)` 앰버, 드롭다운 bg `rgb(255,255,255)`, 메타 `rgb(91,100,112)`. **dark**: 별 fill `rgb(245,185,69)` 골드, 드롭다운 bg `rgb(29,38,48)` surface-elevated, 메타 `rgb(154,166,178)`. 양 테마 시인성 양호 | PASS |
| 9 | 무회귀 | 기존 관심종목 표(시세·디그레이드·새로고침·표에서 제거) 정상 | 시드 보유 상태로 표 렌더 확인 | 표 3행 렌더(삼성전자/SK하이닉스/NAVER), 폴백 시세 표시(가격·등락률·방향 색), 행별 제거 버튼(`관심종목에서 제거`) **3개**, 상단 새로고침 버튼 **1개**, 전체 에러 카드 **0**. `999998` 직접추가 시 드롭다운이 표 위 z-30 으로 정상 오버레이 | PASS |

### 공통 AC

| 항목 | 실측 | 판정 |
|---|---|---|
| typecheck 0에러 | `tsc --noEmit` 무출력 | PASS |
| lint 0에러 | `eslint .` 무출력 | PASS |
| build 0에러 | Turbopack 프로덕션 빌드 성공, `/watchlist` ○(정적) | PASS |
| BFF 단방향 무회귀 | `git grep "http://127.0.0.1" -- app/` → `app/api/workbench/_adapters/fastapi.ts` 의 `FASTAPI_BASE_URL` route handler fallback 2건만(규칙상 제외). watchlist 신규 컴포넌트는 axios `/api` 경유, 직접 `fetch(` 0건(`refetch()`/`prefetch()` 는 query 메서드) | PASS |
| 한글 톤 무회귀 | 신규 카피 전부 한글(`관심종목에 추가`/`관심종목에서 제거`/`종목을 검색해 별을 눌러…`/`{ticker} 직접 추가`/`코드` 등). ticker·market(KOSPI) 외 영문 노출 0 | PASS |
| 접근성 무회귀 | 검색 input `role=combobox`+`aria-expanded`+`aria-controls`+`aria-label`. 드롭다운 `role=listbox`, 행 `role=option`+`aria-selected`. 별 `<label>` 안 `<input type=checkbox checked={added} aria-label>`(추가/제거 토글). 키보드 포커스·Space 토글 가능 | PASS |

---

## 2. 핵심 회귀 포인트 상세 (항목 4·5)

### 항목 4 — 이미 추가된 항목 파티클 오발화 (없음 = 정상)

- 구현: `WatchlistStarButton` 의 `<input checked={added}>` 는 **controlled checkbox**. 파티클(`.is-celebrating`)은 `onChange → handleChange` 안에서 `willAdd = !added` 가 **true 일 때만** set 된다. 초기 렌더(이미 추가됨, `added=true`)에서는 `onChange` 가 발화하지 않으므로 `.is-celebrating` 이 붙지 않는다.
- 실측 로그: 시드 보유 상태 "삼성" 검색 결과 16행 중 삼성전자(005930) 행 `checked=true celebrating=0`, 나머지 15행 `checked=false celebrating=0`. **이미 추가된 종목 자동 발화 0건 확인.**
- 추가 클릭 시점에만 발화: 항목 2(삼성바이오로직스 추가) 에서 클릭 직후 `celebrating=1` 측정 → 추가 클릭 한정 발화 정상.

### 항목 5 — 별 클릭 시 드롭다운 유지 / 바깥 클릭 시 닫힘

- 구현: 별/행이 `containerRef`(검색 컨테이너) 내부에 있고, 닫힘 트리거는 `document` `mousedown` 리스너의 `!containerRef.contains(e.target)` 조건뿐. 별은 컨테이너 내부라 mousedown 이 닫힘 조건에 걸리지 않는다.
- 실측 로그:
  - "삼성" 결과 **14개 별 연속 클릭** → 매 클릭 후 드롭다운 `visible=true` 유지.
  - 페이지 좌하단(컨테이너 밖, 10,700) 클릭 → `visible=false` (닫힘).
  - 입력 재포커스 → `visible=true` (재개방).
  - 모바일(375)에서도 SK 검색 → 별 추가 후 `dropdown still open=true` 동일 확인.

---

## 3. 라운드트립 / 무회귀 메모

- BE(KIS/FastAPI) 미기동 로컬이라 `/api/watchlist` 는 mock 폴백으로 응답(콘솔에 일시 500 1건 관측 — BFF 라우트가 백엔드 부재 시 반환하는 기대 동작이며, 표는 사용자가 담은 `tickers` 기준 좌조인으로 폴백 시세를 렌더해 디그레이드 없이 표시). 별도 신규 회귀 아님.
- 표 회귀(항목 9): 시드 3종 + "999998 직접 추가" 행 동시 화면(스크린샷 `06a`)에서 ① 드롭다운이 표 위 정상 오버레이, ② 표 행은 폴백 가격/등락률/방향 색·행별 trash 제거 버튼 정상.
- 검색·표 상태 공유: 검색에서 추가/제거한 종목이 동일 `useWatchlistTickers` 인스턴스를 통해 `localStorage(watchlist:tickers)` + 하단 표에 즉시 반영됨(desync 없음).

---

## 4. 스크린샷

| 파일 | 내용 |
|---|---|
| [`assets/watchlist-inline-search/01-initial.png`](assets/watchlist-inline-search/01-initial.png) | 진입 — 검색 입력 + "+ 종목 추가" 버튼 제거 |
| [`assets/watchlist-inline-search/04a-samsung-results.png`](assets/watchlist-inline-search/04a-samsung-results.png) | "삼성" 결과 — 추가됨(채운 별) vs 미추가(빈 별) |
| [`assets/watchlist-inline-search/02-add-celebrate.png`](assets/watchlist-inline-search/02-add-celebrate.png) | 추가 클릭 — 파티클 축하 발화 |
| [`assets/watchlist-inline-search/03-remove.png`](assets/watchlist-inline-search/03-remove.png) | 제거 후 |
| [`assets/watchlist-inline-search/06a-raw-row.png`](assets/watchlist-inline-search/06a-raw-row.png) | 6자리 코드 직접 추가 행 + 표 위 오버레이 |
| [`assets/watchlist-inline-search/07-empty.png`](assets/watchlist-inline-search/07-empty.png) | 빈 상태(검색 상단 유지) |
| [`assets/watchlist-inline-search/08-light.png`](assets/watchlist-inline-search/08-light.png) | light 테마 — 앰버 별 |
| [`assets/watchlist-inline-search/08-dark.png`](assets/watchlist-inline-search/08-dark.png) | dark 테마 — 골드 별 + surface-elevated 드롭다운 |
| [`assets/watchlist-inline-search/09-table.png`](assets/watchlist-inline-search/09-table.png) | 표 회귀(시세·제거 버튼) |
| [`assets/watchlist-inline-search/10-mobile.png`](assets/watchlist-inline-search/10-mobile.png) | 모바일 375 — 검색·별·파티클·바텀내비 |

---

## 5. 종합

- 점검 9개 항목 + 공통 AC(typecheck/lint/build, BFF, 한글 톤, 접근성) 전부 통과. 발견 이슈(추가/제거 불가, 파티클 오발화, 별 클릭 시 닫힘, 바깥 클릭 미닫힘, 테마 시인성 등) **0건**.
- **판정: qa-passed.**
