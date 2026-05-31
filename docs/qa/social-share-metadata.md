# QA 리포트 — social-share-metadata (소셜 공유 OG 메타데이터 + 동적 og:image + 크롤러 게이트 통과)

> PRD: [`docs/prd/social-share-metadata.md`](../prd/social-share-metadata.md) · PR #54 (`feature/social-share-metadata`)
> 검증일: 2026-05-31 · ⚠️ 게이트(보안 경계) 변경 포함 — 크롤러 UA 가 `/api/*` 데이터를 우회하는지 blocking 으로 취급.

## 판정: **PASS** — 10/10 AC 통과 (AC-10 은 prod 배포 후 운영 수동 항목으로 QA 범위 밖, 절차 사전조건만 검증)

| 안전 항목 | 결과 |
|---|---|
| **★ 데이터 보호 회귀(가장 중요)** | 안전 — 크롤러 UA(`kakaotalk-scrap`)로 `/api/market/ticker` 요청 시 **401 `{"error":"unauthorized"}` 유지**. UA 화이트리스트 분기가 `/api/*` 401 분기보다 **뒤**에 위치(`middleware.ts:118` 401 → `:127` UA 통과) → 크롤러는 페이지·OG 이미지만 통과, 데이터는 못 받음. |
| **게이트 우회 가능 여부** | 불가 — 일반 UA·비화이트리스트 UA(`curl/8.0`·`EvilBot`)는 페이지에서 `/login` 리다이렉트 유지. 화이트리스트 부분일치는 알려진 크롤러 UA 11종으로 tight. |
| **무한 루프/open-redirect 가드** | 무회귀 — `isPublicPath`·`safeNextPath`·`matcher` 무변경(UA 분기만 추가). `/login` 자체 200, `/login?next=%2Fdashboard` 200(재리다이렉트 X). |
| **디자인 토큰/화면 회귀** | 안전 — `tailwind.theme.json` diff 0, 신규 앱 화면·컴포넌트 0. `app/opengraph-image.tsx` 는 메타 라우트(화면 아님). favicon `/icon` 32×32 image/png 무회귀. |

검증 환경: `feature/social-share-metadata` checkout(HEAD `ed43fd9`). **게이트-off** = `.env.local` 에 `APP_PASSWORD` 미설정 + `npm run dev`(localhost:3055). **게이트-on** = `APP_PASSWORD`/`APP_AUTH_SECRET` 를 **inline env-var 로만** 주입(`.env*` 미수정, `npm run dev` localhost:3056, 검증 후 종료 — 임시 시크릿 영속 0건 확인). BE 데이터 의존 0(본 PRD 는 정적 메타 + 동적 이미지 렌더만) → 라운드트립 BE LIVE 시나리오 해당 없음.

---

## 1. AC 별 검증표

| AC | 내용 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | OG/Twitter/metadataBase 필드 존재 | `git grep -nE "openGraph\|metadataBase\|twitter" app/layout.tsx` | metadataBase + openGraph(title/description/url/siteName/locale ko_KR/type website) + twitter(card summary_large_image) | `metadataBase: new URL(SITE_URL)`(`:59`), `openGraph`(`:64` — title/description/url:"/"/siteName/locale "ko_KR"/type "website"), `twitter`(`:72` — card "summary_large_image"/title/description) 전부 존재 | PASS |
| AC-2 | 게이트-off HTML 에 OG/Twitter 태그 출력 | `curl -s localhost:3055/ \| grep og:\|twitter:` | og:title·description·image·url·type·site_name·locale·twitter:card·image 출력 | 11+ 태그 전부 출력: og:title(FinSight)·og:description·og:url·og:site_name(FinSight)·og:locale(ko_KR)·og:image(+type/width 1200/height 630)·og:type(website)·twitter:card(summary_large_image)·twitter:title·twitter:description·twitter:image | PASS |
| AC-3 | metadataBase 절대화 + build 경고 0 | AC-2 grep + `npm run build \| grep metadataBase` | og:url 절대 https://, metadataBase 미설정 경고 없음 | `og:url` = `https://trading-signal-frontend.vercel.app`(절대). build 로그 metadataBase/warning grep **0건**. ※ dev 의 og:image 는 요청 host(`localhost:3055/opengraph-image?...`)로 해석됨(Next dev 정상 동작) — prod 에선 metadataBase 가 절대 prod URL 로 해석. og:url 절대화 + 경고 0 충족 | PASS |
| AC-4 | 1200×630 PNG + 시각(파란 배경+Activity+FinSight) | `git grep size/contentType` + `curl -sI .../opengraph-image` + `file` + 시각 | image/png, 1200×630, 브랜드 카드 | `size={width:1200,height:630}`(`:11`)·`contentType="image/png"`(`:12`). `curl -sI` → `content-type: image/png`. `file` → `PNG image data, 1200 x 630, RGBA`. **시각 확인**: 파란(#1d4ed8) 배경 + 흰 lucide Activity 아이콘(반투명 라운드 배지) + "FinSight" 워드마크 — favicon 과 동일 브랜드 톤 | PASS |
| AC-4b | hex 예외 주석 + icon.tsx 와 동일 값 | `git grep -n "1d4ed8" app/icon.tsx app/opengraph-image.tsx` | 두 파일 동일 `#1d4ed8` + 동일 취지 hex 예외 주석 | 양 파일 모두 `#1d4ed8` + "디자인 토큰 hex 직타 금지의 합리적 예외 — 토큰 동기화 시 본 파일도 갱신 필요" 동일 주석. Activity SVG polyline path(`22 12 18 12 15 21 9 3 6 12 2 12`)도 동일 | PASS |
| AC-5 | 크롤러 접근(q1=옵션 B) — 게이트-on | gate-on UA 매트릭스(아래 §2) | 크롤러 UA `/`·`/opengraph-image` 200, 일반 UA `/login` 리다이렉트, **크롤러 `/api/*` 401** | 일반 UA `/` → 307 `/login?next=%2F`. 크롤러 `kakaotalk-scrap` `/` → **200**. 크롤러 `facebookexternalhit` `/opengraph-image` → **200 image/png**. **★크롤러 `/api/market/ticker` → 401 `{"error":"unauthorized"}` 유지**. 비화이트리스트 UA(`curl/8.0`·`EvilBot`) `/` → 307 `/login` | PASS |
| AC-6 | 게이트 무회귀(app-password-gate 핵심 AC) | gate-on 매트릭스 §2 | 일반 UA `/dashboard` → /login, `/api/*` 401, 루프 없음 | 일반 UA `/dashboard` → 307 `/login?next=%2Fdashboard`. 일반 UA `/api/market/ticker` → 401. `/login` 자체 200(루프 가드). `/login?next=%2Fdashboard` 200(재리다이렉트 X). `/api/auth/login`(public) GET 405(게이트 무관). `isPublicPath`·`safeNextPath`·`matcher` 무변경 — UA 분기만 401 분기 뒤에 추가 | PASS |
| AC-7 | typecheck/lint/build/test 0 에러 | 4 명령 | 0 에러(사전 실패 5건 제외) | typecheck **0 에러**. lint **0 에러**(warning 1건 = `components/profile/StockDailyChart.tsx:238`, PR#53 유래·본 PR 미변경). build **성공**(`/opengraph-image`·`/icon` ○ static prerender, Proxy 미들웨어 등록). test = 176 passed / **사전 실패 5건**(market ticker/indices — §3 참조, 본 PR 무관·main 동일 실패) | PASS(사전 실패 분리) |
| AC-8 | 디자인 토큰·신규 화면 무변경 | `git diff main..HEAD --name-only` | tailwind.theme.json diff 0, 신규 앱 화면 0 | `tailwind.theme.json` diff **0**. 변경 코드 = `app/layout.tsx`(수정)·`app/opengraph-image.tsx`(신규 메타 라우트)·`middleware.ts`(수정)·PRD. 신규 앱 화면·컴포넌트 0. `twitter-image.tsx` 미생성(q2 준수) | PASS |
| AC-9 | favicon 무회귀 | `curl -sI localhost:3055/icon` + `file` | image/png, 32×32 | `content-type: image/png`. `file` → `PNG image data, 32 x 32, RGBA`. 시각 확인: 파란 Activity 아이콘 정상 렌더 | PASS |
| AC-10 | 카카오 프리뷰 실측(prod 배포 후 수동) | Kakao Developers 캐시 삭제 + 카톡 대화창 | 제목·설명·이미지·FinSight 노출 | **QA 범위 밖**(prod 배포 후 운영자 수동 항목, G5). 사전조건 검증: ① 운영 노트(Kakao Developers 캐시 삭제 절차) PR 본문 AC-10 에 기재됨, ② `## 다음 작업` 절에 운영자 작업 명시됨, ③ og:image/메타가 게이트-on 에서 크롤러에 전달됨(AC-5 입증) — 배포 후 캐시 갱신만 하면 노출 조건 충족 | DEFERRED(운영) |

---

## 2. 게이트 동작 매트릭스 (AC-5/AC-6, 게이트-on `APP_PASSWORD` 설정, localhost:3056)

| # | 요청 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1 | 일반 UA `GET /` (쿠키 없음) | 307 → /login | `status=307 location=/login?next=%2F` | PASS |
| 2 | 크롤러 `kakaotalk-scrap` `GET /` | 200 (리다이렉트 X) | `status=200 location=(없음)` | PASS |
| 3 | 크롤러 `facebookexternalhit` `GET /opengraph-image` | 200 image/png | `200 OK` + `content-type: image/png` | PASS |
| **4 ★** | **크롤러 `kakaotalk-scrap` `GET /api/market/ticker`** | **401 유지(데이터 보호)** | **`status=401 ct=application/json` body `{"error":"unauthorized"}`** | **PASS** |
| 5 | 일반 UA `GET /api/market/ticker` | 401 | `status=401` | PASS |
| 6 | 비화이트리스트 `curl/8.0` `GET /` | 307 → /login | `status=307 location=/login?next=%2F` | PASS |
| 6b | 비화이트리스트 `EvilBot` `GET /` | 307 → /login | `status=307 location=/login?next=%2F` | PASS |
| 7 | 일반 UA `GET /login` | 200 (루프 가드) | `status=200` | PASS |
| 8 | 크롤러 `kakaotalk-scrap` `GET /dashboard` | 200(페이지 통과) | 게이트 통과 후 앱 alias `307 → /profile` → (`-L`) 최종 `200 /profile`. ⚠️ location 이 `/login` 아님 = 게이트는 통과, `/dashboard→/profile` 는 기존 앱 라우트 redirect(게이트 무관) | PASS |
| 8b | 일반 UA `GET /dashboard` | 307 → /login | `status=307 location=/login?next=%2Fdashboard`(게이트가 앱 redirect 보다 우선) | PASS |
| 9 | 크롤러 `kakaotalk-scrap` `GET /profile` | 200 | `status=200` | PASS |
| 10 | `GET /api/auth/login` (크롤러 UA) | public path, 게이트 무관(GET=405) | `status=405` | PASS |
| 11 | 일반 UA `GET /login?next=%2Fdashboard` | 200 (재리다이렉트 X) | `status=200`(루프/open-redirect 가드 무회귀) | PASS |

**핵심 결론(q1 옵션 B 보안 경계)**: middleware 흐름이 `isPublicPath 통과(:105) → 쿠키 검증(:111) → /api/* 미인증이면 401(:118) → 크롤러 UA 면 페이지 통과(:127) → 그 외 /login 리다이렉트(:135)` 순. **`/api/*` 401 분기가 UA 통과 분기보다 앞**이므로 크롤러 UA 라도 데이터는 절대 우회 불가. PRD §9 q1 의 보안 가정(빈 UI 셸 + OG meta 만 노출, 실데이터 401 보호)이 코드·실측 모두에서 성립.

---

## 3. 사전 실패 테스트 5건 — 본 PR 무관 (회귀 아님)

`npm run test` 에서 5건 실패하나, **`main`(HEAD `7c7b4b8`)에서 동일하게 5건 실패**함을 stash 후 재현 확인했다. 본 PR 변경 영역(`app/layout.tsx`·`app/opengraph-image.tsx`·`middleware.ts`)과 무관하며, PR 도 새 테스트 실패 0건이다.

| # | 실패 테스트 | main 동일 실패 | 본 PR 무관 근거 |
|---|---|---|---|
| 1 | `lib/api/market/__tests__/indices.test.ts > 기본 codes 미입력 시 국내 3종으로 단일 호출` | ✅ | market indices 클라(본 PR 미변경) |
| 2 | `app/api/market/indices/__tests__/route.test.ts > [AC-6] 키 미설정 → mock 본문` | ✅ | market indices 라우트(본 PR 미변경) |
| 3 | `app/api/market/ticker/__tests__/route.test.ts > [AC-3] 5건 + 고정 순서 [KOSPI, KOSDAQ, S&P 500, NASDAQ, BTC]` | ✅ | NASDAQ/SPX 순서 — ticker 라우트(본 PR 미변경) |
| 4 | `app/api/market/ticker/__tests__/route.test.ts > [AC-8] BTC 실패해도 지수 4건` | ✅ | 동상 |
| 5 | `app/api/market/ticker/__tests__/route.test.ts > [AC-8] 일부 지수 실패해도 순서 유지` | ✅ | 동상 |

- **PR 브랜치**: `Test Files 3 failed | 25 passed (28)` · `Tests 5 failed | 176 passed (181)`
- **main 브랜치**: `Test Files 3 failed | 25 passed (28)` · `Tests 5 failed | 176 passed (181)` — **완전 일치**
- 결론: 기존 이슈(NASDAQ/SPX 순서). 본 PR `## 다음 작업` 에 "별도 정리 필요"로 이미 기재됨. **본 PR 의 머지 게이트 아님**.

---

## 4. 에지 케이스 / 무회귀 점검

- **BFF 원칙 무회귀**: `git grep -nE "http://127\.0\.0\.1" -- app/` → 3건 전부 `app/api/**` route handler fallback(`whitelist/search`·`workbench/_adapters/fastapi`) — 라우트 핸들러 폴백 예외 대상. **위반 0건**.
- **한글 톤 무회귀**: 사용자 노출 카피 = og/twitter `description` "AI 기반 매수·매도 판단 보조 서비스"(한글). `title`/`siteName` = "FinSight"(고유명사 — 예외 허용). middleware `{"error":"unauthorized"}` 는 API 필드(사용자 비노출). **무회귀**.
- **접근성**: 본 PR 은 앱 화면 UI 변경 0(메타·OG 이미지·미들웨어만) → label 연결/Tab 순서/aria 변경 없음. OG 이미지 `alt` 는 Next 파일 컨벤션 기본값 사용. **해당 없음(무회귀)**.
- **matcher 정합**: `matcher: /((?!_next/static|_next/image|favicon.ico|icon|fonts).*)` 회귀 테스트 — `/opengraph-image`·`/`·`/api/*`·`/login` 은 미들웨어 적용(true), `/icon`·`/fonts/*`·`/_next/static` 은 제외(false). `/opengraph-image` 가 미들웨어를 거치므로 게이트-on 에선 UA 분기가, 게이트-off 에선 즉시 통과가 처리 — 설계 정합.
- **StrictMode 더블 마운트 / Tailwind preflight 잔여물**: 본 PR 은 클라이언트 컴포넌트·스타일 변경 0 → 해당 없음.
- **반응형(모바일 375 / 데스크탑 1280)**: 본 PR 은 OG 메타·이미지·미들웨어만 변경, **앱 화면 UI 변경 0건** → 두 뷰포트 반응형 재현 **해당 없음**(OG 이미지는 1200×630 고정 소셜 카드로 뷰포트 무관).

---

## 5. DESIGN.md 토큰 라이브 동기화 검증

**해당 없음** — 본 PR 은 `tailwind.theme.json` diff 0(AC-8), DESIGN.md/디자인 토큰 무변경. `ImageResponse` 내부 hex(`#1d4ed8`)는 PRD §3.2 가 명시한 합리적 예외(Tailwind 토큰 호출 불가)이며 `app/icon.tsx` 와 동일 값(AC-4b). 토큰 동기화 검증 대상 아님.

---

## 6. 검증 명령 로그 (재현 가능)

```
# AC-1
git grep -nE "openGraph|metadataBase|twitter" app/layout.tsx
# AC-2/AC-3 (게이트-off, localhost:3055)
curl -s http://localhost:3055/ | grep -oE '<meta (property="og:[^>]*|name="twitter:[^>]*)>'
# AC-4
curl -sI http://localhost:3055/opengraph-image | grep -i content-type   # → image/png
curl -s  http://localhost:3055/opengraph-image -o /tmp/og.png && file /tmp/og.png  # → PNG 1200 x 630
# AC-4b
git grep -n "1d4ed8" app/icon.tsx app/opengraph-image.tsx
# AC-5/AC-6 (게이트-on, APP_PASSWORD inline, localhost:3056) — §2 매트릭스
curl -s -A "kakaotalk-scrap/1.0" -o /dev/null -w "%{http_code}\n" http://localhost:3056/             # 200
curl -s -A "kakaotalk-scrap/1.0" -o /dev/null -w "%{http_code}\n" http://localhost:3056/api/market/ticker  # 401 ★
# AC-7
npm run typecheck && npm run lint && npm run build   # 0 에러 (test 사전 실패 5건은 §3)
# AC-8/AC-9
git diff main..HEAD --name-only | grep tailwind.theme.json   # (없음)
curl -sI http://localhost:3055/icon | grep -i content-type   # → image/png (32×32)
```

---

산출물: docs/qa/social-share-metadata.md | 판정: qa-passed | 실패 0건 (사전 실패 5건은 본 PR 무관·main 동일 실패, AC-10 은 prod 배포 후 운영 수동 항목)
