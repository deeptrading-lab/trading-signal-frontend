# QA 리포트 — pwa-home-screen (PR #57)

- **대상 브랜치**: `feature/pwa-home-screen`
- **대상 커밋**: `250e014` — `feat(pwa): 홈 화면 설치(PWA) + 브랜드 로고 3색 그라데이션 리프레시`
- **수용 기준 출처**: 정식 PRD 없음 → 플랜 파일 `golden-sparking-hearth.md` Verification 섹션 + 메인 에이전트 지정 테스트 항목 A~G (플랜 기반 작업).
- **환경**: Next.js 16.2.6 (Turbopack) / Node v20.19.6 / macOS(darwin 25.5.0)
- **게이트 env**: `APP_PASSWORD=qa-test-pw-1234567890 APP_AUTH_SECRET=qa-test-secret-abcdefgh`
- **런타임 검증**: `npm run build` 후 `npx next start -p 3955`(사용자 dev 서버가 3000 점유 중이라 빈 포트 사용). 검증 후 서버 kill + `next-env.d.ts` `git checkout` 복원(커밋 미포함).

## 종합 판정: **통과 (qa-passed)**

자동/런타임 검증 가능한 A~F 전부 PASS. G(실기기 iOS/Android)는 자동화 불가 → **수동 검증 필요**로 명시(블로킹 아님 — 코드 레벨에서 설치 가능 조건은 모두 충족됨을 라우트/매니페스트/SW 로 간접 확인).

---

## 항목별 PASS/FAIL 요약

| 항목 | 내용 | 판정 |
|------|------|------|
| A | 정적: typecheck / lint / build 0 에러 | **PASS** |
| B | 게이트 ON + 미인증 런타임 — 라우트별 status/content-type/치수 | **PASS** |
| C | 미들웨어 allowlist (`isPublicPath` + matcher) | **PASS** |
| D | 로고 단일 소스 `lib/brand-mark.tsx` 상수·함수·소비처 5곳 | **PASS** |
| E | 컴파일 CSS 치수(배지36/아이콘24/텍스트22/gap10/그라데이션 텍스트) | **PASS** |
| F | 코드 위생(임시 라우트·Activity import·next-env.d.ts) | **PASS** |
| G | 실기기 수동(iOS Safari / Android Chrome) | **수동 필요** (자동화 불가) |
| 공통 | BFF 무회귀 / 한글 톤 / 접근성 | **PASS** |

---

## A. 정적 검증

### A-1. typecheck — PASS
```
$ npm run typecheck
> tsc --noEmit
(출력 없음 = 0 에러)
```

### A-2. lint — PASS (0 에러)
```
$ npm run lint
> eslint .
/.../components/profile/StockDailyChart.tsx
  238:41  warning  'i' is defined but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (0 errors, 1 warning)
```
- 유일한 경고 1건은 `StockDailyChart.tsx` — 본 PR diff 미포함(`git diff --name-only main...HEAD | grep StockDailyChart` 무매치)로 **기존 경고·범위 외**. 허용 명시됨.

### A-3. build — PASS
```
$ npm run build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 2.3s
  Finished TypeScript in 2.1s
✓ Generating static pages using 9 workers (28/28)
```
- 신규 라우트가 전부 라우트 테이블에 등장: `○ /apple-icon`, `ƒ /icon-pwa`, `○ /manifest.webmanifest`, `○ /icon`, `○ /opengraph-image`.
- 빌드 중 `"middleware" file convention is deprecated` 경고가 1건 출력되나, 이는 Next 16 의 전역 경고로 **본 PR 무관**(middleware.ts 는 이전부터 존재). 미룬-후속(middleware→proxy)으로 별도 트래킹됨.

---

## B. 게이트 ON + 미인증 런타임

`npx next start -p 3955` + 게이트 env, 쿠키 없이 `curl` 프로브.

### B-1. 라우트별 status / content-type — PASS

| 경로 | 기대 | 실측 status | 실측 content-type | location |
|------|------|------|------|------|
| `/` | 307 → /login | 307 | — | `/login?next=%2F` |
| `/dashboard` | 307 → /login | 307 | — | `/login?next=%2Fdashboard` |
| `/apple-icon` | 200 png | 200 | `image/png` | — |
| `/icon` | 200 png | 200 | `image/png` | — |
| `/icon-pwa?size=192` | 200 png | 200 | `image/png` | — |
| `/icon-pwa?size=512` | 200 png | 200 | `image/png` | — |
| `/manifest.webmanifest` | 200 manifest+json | 200 | `application/manifest+json` | — |
| `/sw.js` | 200 js | 200 | `application/javascript; charset=UTF-8` | — |
| `/opengraph-image` | 200 png | 200 | `image/png` | — |
| `/api/market/indices` | 401 json | 401 | `application/json` | — |

→ 미인증 페이지는 307 `/login`(next 인코딩 정상), 아이콘·매니페스트·SW·OG 는 게이트 통과 200, `/api/*` 는 401. 전부 기대 일치.

### B-2. PNG 치수(`sips`) — PASS
```
apple.png    180x180
icon.png     32x32
pwa192.png   192x192
pwa512.png   512x512
og.png       1200x630
```

### B-3. manifest 본문 JSON — PASS
```json
{
  "name": "FinSight",
  "short_name": "FinSight",
  "description": "AI 기반 매수·매도 판단 보조 서비스",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icon-pwa?size=192", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-pwa?size=512", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-pwa?size=512", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `name="FinSight"` ✓ / `display="standalone"` ✓ / `start_url="/"` ✓ / icons 에 192·512 png 포함 ✓ (+512 maskable 추가 — Android 설치 권장).

### B-4. 에지 케이스(추가) — PASS
- `/api/market/indices` 401 본문 = `{"error":"unauthorized"}` (axios 친화 JSON, 리다이렉트 X).
- `/icon-pwa?size=999`(허용값 외) → 512×512 폴백. `/icon-pwa`(size 없음) → 512×512 폴백. (라우트 `ALLOWED_SIZES={192,512}`, `DEFAULT_SIZE=512` 정합.)
- `HEAD /apple-icon` → 200 (iOS·`curl -I`·일부 크롤러의 HEAD 프로브에도 PNG 응답 — 로그인 HTML 로 새지 않음).

---

## C. 미들웨어 allowlist — PASS

- `middleware.ts:75-76` `isPublicPath` 에 `pathname === "/apple-icon"` + `pathname.startsWith("/apple-icon")` 존재.
- `middleware.ts:84` `pathname === "/sw.js"` 존재.
- matcher(`middleware.ts:162`) 제외 목록에 `apple-icon` 과 `sw.js` 포함:
  ```
  "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|sw.js|fonts).*)"
  ```
- `/icon-pwa` 는 `startsWith("/icon")` + matcher `icon` 제외로 이미 공개(별도 등록 불필요) — B-1 런타임으로 200 확인.

---

## D. 로고 단일 소스 — PASS

- `lib/brand-mark.tsx`:
  - `PULSE_UP = "#ef4444"` / `PULSE_MID = "#94a3b8"` / `PULSE_DOWN = "#3b82f6"` (상승=빨강 / 가운데=슬레이트 / 하락=파랑) ✓
  - `export function pulseGradientDefs(id: string): ReactElement` — **컴포넌트(`<X/>`)가 아니라 함수**. 호출부는 `{pulseGradientDefs(id)}` 로 즉시 호출 → Satori `<defs>` 누락 회피(주석에 근거 명시). ✓
- **소비처 5곳** (`grep -rln 'from "@/lib/brand-mark"'`):
  1. `app/icon.tsx` (파비콘) — `PULSE_POLYLINE_POINTS`, `pulseGradientDefs`
  2. `app/apple-icon.tsx` (iOS 홈) — `brandMark`
  3. `app/icon-pwa/route.tsx` (Android PWA) — `brandMark`
  4. `app/opengraph-image.tsx` (OG) — `PULSE_POLYLINE_POINTS`, `pulseGradientDefs`
  5. `components/layout/BrandPulseIcon.tsx` (사이드바/헤더 DOM) — `PULSE_POLYLINE_POINTS`, `pulseGradientDefs`

---

## E. 컴파일 CSS 치수 — PASS

빌드 산출 `.next/static/chunks/0m7hyt-wawsgh.css` 에서 grep. 토큰 베이스 `--spacing: .25rem`(4px) 확인.

| 셀렉터 | 항목 | 실측 컴파일 값 | 기대 | 판정 |
|------|------|------|------|------|
| `.sidebar-brand-badge` / `.header-brand-badge` | width/height | `calc(var(--spacing,.25rem) * 9)` = 36px | spacing×9=36px | ✓ |
| 〃 | border-radius | `999px` | 999px(원형) | ✓ |
| `.sidebar-brand-icon` / `.header-brand-icon` | width/height | `calc(var(--spacing,.25rem) * 6)` = 24px | spacing×6=24px | ✓ |
| `.sidebar-brand-text` / `.header-brand-text` | font-size | `22px` | 22px | ✓ |
| 〃 | gradient | `--tw-gradient-from:#0f1419` / `--tw-gradient-to:#5b6470` | 동일 | ✓ |
| 〃 | clip/color | `background-clip:text` + `-webkit-background-clip:text` + `color:#0000` | 그라데이션 텍스트(투명 색 + clip) | ✓ |
| `.sidebar-brand` / `.header-brand` | gap | `gap:10px` | 10px | ✓ |

→ 그라데이션 텍스트: `background-image: linear-gradient(... #0f1419 → #5b6470)` + `background-clip:text` + `color:#0000`(투명) 조합으로 정상 — 텍스트 깨짐(투명만 남아 안 보임) 없음.

---

## F. 코드 위생 — PASS

- 임시 프리뷰 라우트 미존재: `app/og-preview`, `app/badge-preview` 둘 다 `No such file or directory`. ✓
- `components/layout/Sidebar.tsx` 에 lucide `Activity` import 잔존 없음 — diff 상 `-import { Activity } from "lucide-react"` 제거 + `+import { BrandPulseIcon }` 로 치환. `Header.tsx` 도 `Activity, User` → `User` 로 축소. 남은 "Activity" 문자열은 전부 주석/문서(lucide 글리프 path 설명)이며 실제 import 0건. ✓
- 커밋 diff 에 `next-env.d.ts` 미포함 (`git diff --name-only main...HEAD | grep next-env.d.ts` 무매치). ✓ (QA 중 `next start` 가 건드린 drift 는 `git checkout -- next-env.d.ts` 로 복원.)

---

## 공통 AC 무회귀

- **BFF 원칙**: 본 PR diff 의 `app/` 파일에 `http://127.0.0.1` 하드코딩 0건. 레포 전체 baseline 3건은 전부 route handler fallback(`process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` — whitelist/search route, workbench fastapi adapter)로 허용 예외 + 본 PR 미변경. **PASS**
- **한글 톤**: 신규 사용자 노출 문구는 manifest `name="FinSight"`(고유명사) / `description="AI 기반 매수·매도 판단 보조 서비스"`(기존 `lib/copy/site.ts` 단일 소스 재사용) 뿐. 신규 한글 카피 추가 없음 → 무회귀. **PASS**
- **접근성**: 로고 마크는 장식 — 배지 `aria-hidden="true"`, `BrandPulseIcon` 도 `aria-hidden="true"`, 링크는 `aria-label={NAV_BRAND_LABEL}` 로 접근명 제공(사이드바·헤더 동일). `ServiceWorkerRegister` 는 렌더 출력 없는 `null` 컴포넌트(Tab 순서 무영향). 회귀 없음. **PASS**

---

## G. 실기기 수동 검증 — 자동화 불가 (수동 필요)

아래는 시뮬레이터/실기기가 필요해 CI/curl 로 대체 불가. 코드 레벨에서 충족 조건은 전부 확인됨(아래 "코드 근거" 참조). PR 머지·배포 후 사용자가 실기기로 최종 확인 권장.

| 시나리오 | 절차 | 기대 | 코드 근거 (간접 확인) |
|------|------|------|------|
| iOS Safari 홈 화면 추가 | 기존 "F" 바로가기 삭제 → Safari 공유 → "홈 화면에 추가" → 아이콘 확인 → 실행 | 컬러 아이콘(흰 배지+3색 맥박) + 주소창 없는 전체화면 | `apple-icon` 200 png 180×180(B-2), `metadata.appleWebApp.capable=true` + `statusBarStyle` (layout.tsx) |
| Android Chrome 앱 설치 | Chrome 메뉴 → "앱 설치"/설치 배너 → 설치 → 실행 | 설치 가능 + standalone 실행 | manifest `display:standalone` + 192/512 icons(B-3), SW 등록(`/sw.js` 200 + `fetch` 핸들러 존재 → WebAPK 조건 충족), `ServiceWorkerRegister` 가 `load` 후 등록 |

> 주의(플랜 명시): iOS 는 기존 홈 바로가기 아이콘 캐시를 갱신하지 않으므로 **삭제 후 재추가** 필요.

---

## 라벨

- PR #57 본문에 `## 다음 작업` 섹션 존재 확인(머지 후 후속: 실기기 수동 검증 + 다크모드 별도 PRD) → HANDOFF append 게이트 충족.
- 본 리포트를 동일 브랜치에 `docs(qa): pwa-home-screen QA 리포트` 로 commit + push.
- `qa-passed` 라벨 PR #57 부여.
