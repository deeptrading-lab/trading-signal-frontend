# QA — stock-detail-star-toggle

- 대상 PR: #112 `feat(stock): 종목 상세 헤더에 관심종목 별 토글 추가`
- 브랜치: `feature/stock-detail-star-toggle` (HEAD `244f6c1`)
- 변경 파일: `components/profile/StockHeader.tsx` 단일 (+23 −9). 신규 컴포넌트·CSS 0건, `WatchlistStarButton`(#100) 재사용.
- 판정: **qa-passed** (실패 0건)

## 환경

- KIS 실데이터 키 `.env.local` 4개 설정 — `/api/stock/price` 가 `x-data-source: kis`, `x-kis-env: prod` 로 라이브 응답.
- 앱 비밀번호 게이트(`APP_PASSWORD`) 로컬 미설정 → 게이트 off 상태로 프리뷰.
- 라이브 인터랙션 검증: `next start`(프로덕션 빌드) 서버 :3112 + Playwright(chromium 1.60.0) headless.
  - 주: `npm run dev`(Turbopack) headless 에서는 HMR WebSocket 실패로 클라 쿼리가 발화하지 않아(헤더가 "불러오는 중…" 고정) **프로덕션 빌드 서버**로 전환해 재현 — Vercel 배포와 동일 환경이라 더 정확. dev 빌드 컴파일/lint/typecheck 자체는 별개로 통과(아래).

## 공통 AC (자동화)

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | 0 에러 |
| lint | `npm run lint` (`eslint .`) | 0 에러 |
| build | `npm run build` | 성공 (`/stock/[ticker]` ƒ Dynamic 정상) |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- components/ hooks/ lib/api/watchlist/ lib/utils/` | 0건 |
| 클라 직접 fetch | `git grep -nE "[^.]fetch\(" -- StockHeader.tsx WatchlistStarButton.tsx` | 0건 (axios·BFF 경유) |
| hex/px 직타 | 변경 파일 색·치수 직타 | 0건 (별 색 = `--fs-chart-signal` 토큰, `app/components.css .wl-star`) |
| 한글 톤 | 별 라벨 `WATCHLIST_STAR_ADD="관심종목에 추가"` / `_REMOVE="관심종목에서 제거"` | 한글, ticker/필드 외 영문 노출 없음 |

## 수용 기준(AC)별 재현·기대·실측

검증은 프로덕션 빌드 서버 :3112 + headless chromium. 데스크탑 1280×900 / 모바일 375×800 두 뷰포트.

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1 별 렌더 | `/stock/005930` 진입, `label.wl-star` 카운트 | 종목명+종목번호 배지 옆 별 1개, 한 줄(inline-flex) | 별 1개. `div.inline-flex.items-center:has(h1):has(label.wl-star)` 매칭 1 — 종목명·배지·별 동일 한 줄 | PASS |
| 2 초기 정합(시드) | 시드 005930/000660/035420 진입, checkbox checked + `.is-celebrating` | 채운 별, 자동 파티클 없음 | 005930·000660 checked=true. 마운트 직후 `.is-celebrating`=0 | PASS |
| 2 초기 정합(비시드) | `/stock/005380`(현대차) checkbox checked | 빈 별 | checked=false | PASS |
| 3 추가 토글 | 빈 별 클릭 → checkbox + `.is-celebrating` 즉시/0.9s후 | 채운 별 + 파티클 발화 후 해제, localStorage 영구화 | 클릭 직후 checked=true, `.is-celebrating`=1 → ~1s 후 0. localStorage 에 엔트리 추가 | PASS |
| 4 제거 토글 | 채운 별(005930) 클릭 → checkbox + `.is-celebrating` | 빈 별, 파티클 없음 | checked=false, `.is-celebrating`=0 | PASS |
| 5 상태 일치(→watchlist) | 상세에서 005380 추가 → `/watchlist` 이동 | 관심종목 페이지에 005380/현대차 노출 | `/watchlist` HTML 에 현대차/005380 노출 | PASS |
| 5 store 공유(역방향) | watchlist 경유 후 `/stock/005380` 재진입 | 채운 별 유지(localStorage SSOT) | checked=true | PASS |
| 6 종목명 영구화(해결) | 005930 추가 후 localStorage | `{ticker:"005930",name:"삼성전자"}` 저장 | `[…,{"ticker":"005930","name":"삼성전자"}]` | PASS |
| 6 종목명 영구화(폴백) | `/stock/ZZZZZZ`(이름 미해결, mock) 추가 후 localStorage | 이름 미저장(ticker 폴백) → name 키 없음 | `{"ticker":"ZZZZZZ"}` (name 미보유) | PASS |
| 7 반응형(모바일) | 375×800 `/stock/000660` 진입·토글 | 별 위치·동작 정상 | 별 1개, 시드 checked=true, 클릭 토글 checked=false | PASS |
| 7 desync(레이아웃 전환) | 데스크탑 005490(비시드) 추가 → 차트 확대 → 축소 (StockHeader remount) | 채운 별 상태 유지(desync 없음) | 추가 checked=true → 확대 후 true → 축소 후 true | PASS |
| 8 회귀 없음 | StockHeader h1·배지·가격·등락 컬러 확인 | 기존 요소 무변경 | h1="삼성전자", 배지 "005930", 가격 360,500 노출, 상승 컬러 `.signal-up-text`=1 / `.signal-down-text`=0 | PASS |

## 접근성 무회귀

| 항목 | 실측 | 판정 |
|---|---|---|
| aria-label 동적 | `관심종목에서 제거` / `관심종목에 추가` (added 상태로 토글) | PASS |
| title 툴팁 | 동일 라벨 노출 | PASS |
| 키보드 포커스 | `<input type=checkbox class=wl-star-check>` focus 가능(activeElement 확인) | PASS |
| Space 키 토글 | true→false 토글, 복원 정상 | PASS |
| 콘솔 에러 | 프로덕션 빌드 0건(HMR WebSocket 제외) | PASS |

## 에지 케이스

| 케이스 | 재현 | 결과 |
|---|---|---|
| 미해결 ticker(가짜 종목) | `GET /api/stock/price?ticker=ZZZZZZ` | 200 mock 류 `name===ticker`, price 0/flat → 헤더·별 렌더, AC6 폴백 규칙으로 name 미저장 |
| 빈 ticker | `GET /api/stock/price?ticker=` | 400 (+ 쿼리 `enabled` 가드로 클라 미발화) |
| 시드 자동 발화 | 시드 종목(이미 채운 별) 마운트 | `.is-celebrating`=0 — 추가 클릭에서만 발화(`handleChange` willAdd 분기), 마운트 자동 발화 없음 |
| StrictMode/remount 자동 파티클 | 페이지 진입 직후 0.8s 관찰 | 자동 파티클 0건 |
| 레이아웃 3분기 상호배타 | `StockPageLayout` mobile/expanded/default 3개소 `<StockHeader>` — 한 번에 하나만 마운트 | 코드 확인 + 라이브 확대/축소 remount 시 localStorage 재동기화로 상태 유지(AC7) |
| SSR 하이드레이션 | SSR HTML 은 "불러오는 중…"(로딩), 별/배지 미출력 → 클라 페치 후 렌더 | hydration mismatch 없음(`useWatchlistTickers` 초기 빈 배열→mount 동기화). 콘솔 에러 0 |

## 비고

- 별 색·애니메이션 토큰 변경(DESIGN.md 동기화) 검증은 본 PR 범위 밖(스타일 토큰 무변경, `.wl-star` 기존 자산 재사용) — 생략.
- `StockHeader` 의 `isError`/`!data` 분기는 ErrorCard/InfoCard 만 렌더하고 별을 노출하지 않음(코드 확인) — KIS 5xx 실패 시 헤더 자체가 에러 상태로 graceful degrade.

## 다음 작업

- 없음(독립 UX 개선). 관심종목 페이지(#100)와 store(localStorage SSOT)를 공유하므로 양쪽 상태 자동 일치.
