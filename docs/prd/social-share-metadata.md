# PRD — social-share-metadata (소셜 공유 OG 메타데이터 + 동적 og:image)

> 카카오톡·일반 SNS 에 사이트 링크를 공유하면 풍부한 링크 프리뷰(제목·설명·대표 이미지·사이트명)가 뜨도록 OG/Twitter 메타데이터를 보충한다.
> Next.js App Router `app/layout.tsx` 의 `metadata` 를 확장하고, `next/og` ImageResponse 로 1200×630 소셜 OG 이미지를 동적 생성한다(브랜드 톤: 파란 배경 + lucide Activity + FinSight 워드마크).
> **UI 포함 여부: yes (소셜 프리뷰 카드 이미지 — 앱 화면 UI 아님)** — `next/og` ImageResponse 디자인뿐, 신규 화면·컴포넌트·디자인 토큰 0. **디자이너 합류 트리거 아님**(`app/icon.tsx` 선례 수준의 미니멀 브랜드 카드).

- **slug**: `social-share-metadata`
- **작성일**: 2026-05-31
- **OPEN QUESTION**: 5건 (§9) — 전부 미결(각 항목에 PM 권고 동봉). **q1(크롤러 게이트 통과)이 가장 중요** — 이것이 풀리지 않으면 prod 에서 프리뷰가 아예 안 뜬다.
- **PR 정책**: **단일 PR**(한 브랜치 한 PR 룰 복귀 상태 — MEMORY `single-pr-rule-exception` 종료. finsight-redesign / stock-api-integration 시리즈 모두 종료). 변경량 소규모(§8).
- **선행 전제**: `app-password-gate`(PR#48, `middleware.ts` 게이트) 머지됨 — 본 PRD 의 §3.4 / §9 q1 이 이 게이트와 직접 얽힌다.

---

## 0. 한눈에

| 항목 | 내용 |
|---|---|
| 무엇 | `app/layout.tsx` metadata 에 `metadataBase`·`openGraph`·`twitter` 를 보충 + `app/opengraph-image.tsx`(+필요 시 `twitter-image.tsx`) 동적 OG 이미지 1200×630 신설. |
| 왜 | 현재 metadata 가 `title`+`description` **2필드뿐**. 카톡·슬랙·X 등에 링크 공유 시 대표 이미지·사이트명 없이 밋밋하게 뜬다. 풍부한 프리뷰는 클릭률·브랜드 인지에 직결. |
| 핵심 변경 | `app/layout.tsx`(metadata 확장) · `app/opengraph-image.tsx`(신규, `next/og`) · (선택) `app/twitter-image.tsx` · (선택) URL env 1건 |
| 현황 핵심 | `openGraph`/`twitter`/`metadataBase` **전부 부재**. og:image **부재**(favicon `app/icon.tsx` 만 존재). prod 는 **앱 비밀번호 게이트로 보호** → 크롤러가 게이트에 막혀 OG 를 못 읽을 위험(§9 q1). |
| 게이트 충돌 | middleware `isPublicPath` 가 `/icon` 은 통과시키나 **`/opengraph-image`·`/twitter-image` 는 예외 목록에 없음**. root `/`(OG 가 박힌 HTML) 도 게이트로 막힘 → 크롤러가 메타·이미지 둘 다 못 받음(§3.4 / q1). |
| 카톡 캐시 | 카카오는 OG 를 공격적으로 캐싱 → 배포 후 Kakao Developers 캐시 초기화(스크랩 갱신) 절차를 §운영 노트로 기록(§3.5). |
| hex 직타 | `next/og` ImageResponse 내부는 Tailwind 토큰 직접 호출 불가 → `app/icon.tsx` 선례대로 accent `#1d4ed8` hex 명시(디자인 토큰 hex 직타 금지의 합리적 예외, §3.2). |
| UI | 소셜 프리뷰 카드(1200×630) 1종 — 앱 화면 UI 아님. 디자이너 미합류. |

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (요약)
카카오톡(및 일반 SNS)에 사이트 링크를 공유하면 현재 제목·설명만 밋밋하게 뜬다. OG 메타데이터를 보충해 풍부한 링크 프리뷰(제목 / 설명 / 대표 이미지 / 사이트명)가 뜨도록 개선하고 싶다.

### 1.2 현재 상태 (main 기준, 코드 직접 확인 — 2026-05-31)
- **`app/layout.tsx`** 의 `export const metadata: Metadata` 가 `title: "FinSight"` + `description: "AI 기반 매수·매도 판단 보조 서비스"` **2개 필드뿐**(`app/layout.tsx:44-47`). `openGraph`·`twitter`·`metadataBase` 전부 없음 → `git grep -nE "openGraph|metadataBase|twitter" app/` 0건.
- **`app/icon.tsx`** 가 `next/og` ImageResponse 로 파비콘(32×32, 파란 배경 `#1d4ed8` + lucide Activity 아이콘)을 동적 생성 중. 내부에 hex 직타(`#1d4ed8`)가 "디자인 토큰 hex 직타 금지의 합리적 예외" 주석과 함께 이미 정착(`app/icon.tsx:6-7`). **소셜 공유용 1200×630 og:image 는 부재** → `find app -iname "opengraph-image*" -o -iname "twitter-image*"` 0건.
- `public/` 에는 `fonts/` 만 존재 — **정적 OG 이미지 자산 없음**(동적 생성 경로가 자연스럽다).
- **prod 도메인 = `https://trading-signal-frontend.vercel.app`** (앱 비밀번호 게이트로 보호 중 — `app-password-gate` PR#48). 루트 `middleware.ts` 가 `APP_PASSWORD` 설정 시 모든 페이지를 `/login` 으로 리다이렉트하고 `/api/*` 를 401 처리한다.
  - middleware `isPublicPath` 예외(인증 없이 통과): `/login`, `/api/auth/*`, `/_next/static`, `/_next/image`, `/favicon.ico`, `/icon`(+ `startsWith("/icon")`), `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/fonts/*` (`middleware.ts:26-48`).
  - **`/opengraph-image`·`/twitter-image` 는 이 예외 목록에 없다.** `config.matcher` 도 `_next/static|_next/image|favicon.ico|icon|fonts` 만 1차 제외(`middleware.ts:105-107`) → OG 이미지 라우트가 게이트에 걸린다.
  - 게이트 비활성(`APP_PASSWORD` 미설정) 시엔 전부 공개라 문제 없음. **게이트가 켜진 prod 가 문제**.
- 브랜드: FinSight · accent `#1d4ed8`(blue, v8 accent-vivid) · lucide Activity 아이콘 · 폰트 Pretendard self-host. og:image 디자인은 이 브랜드 톤 재사용.
- `next` `^16.2.6`(App Router) — `next/og` ImageResponse + 파일 컨벤션(`opengraph-image.tsx`)이 네이티브 지원. `metadata` 객체의 `openGraph`/`twitter`/`metadataBase` 필드도 네이티브 지원.

### 1.3 문제
1. 링크 공유 시 대표 이미지·사이트명·구조화된 OG 가 없어 프리뷰가 빈약 → 클릭 유도·브랜드 인지 손실.
2. `metadataBase` 가 없어 상대 경로 OG 이미지가 절대 URL 로 해석되지 않을 위험(Next 가 경고하거나 일부 크롤러가 상대 URL 을 못 읽음).
3. **prod 가 비밀번호 게이트로 막혀** 카톡·페이스북 등 크롤러가 OG HTML·이미지에 접근하지 못할 수 있다 → 메타를 보충해도 프리뷰가 안 뜨는 근본 차단(가장 중요, §9 q1).

### 1.4 컨텍스트 메모 (필수 인지)
- 스택: Next.js 16(App Router) + Tailwind v3 + TanStack Query v5 + axios + BFF. FE 컨벤션 `docs/rules/frontend.md` 8개 절 안에서만 짠다. 본 PRD 는 화면·컴포넌트·페칭 훅·query key 를 건드리지 않으므로 대부분 절은 무관하나, **디자인 토큰 hex 직타 금지** 룰과 **`next/og` ImageResponse 예외**(§3.2)가 직접 관련.
- 사용자 노출 문구는 한글 기본(고유명사 FinSight·필드명 제외). OG `title`/`description`/`siteName` 의 한글 카피는 §3.1 에서 확정.
- 디자인 단일 진실 원천은 DESIGN.md(`npm run design:sync` → Tailwind theme). **단, `ImageResponse` 내부는 Tailwind 클래스·CSS 변수를 못 쓰므로 hex 명시가 불가피**(`app/icon.tsx` 가 이미 같은 예외를 적용 — 본 PRD 도 그 선례를 따르고 동일 주석을 남긴다).

---

## 2. 목표 (측정 가능)

1. **G1 — OG/Twitter 메타 보충**: 임의 페이지의 응답 HTML `<head>` 에 `og:title`·`og:description`·`og:image`·`og:url`·`og:type`·`og:site_name`·`og:locale`(`ko_KR`) + `twitter:card`(`summary_large_image`)·`twitter:title`·`twitter:description`·`twitter:image` 가 출력된다 — `curl -s <게이트-비활성-환경>/ | grep -E 'og:|twitter:'` 로 확인.
2. **G2 — 동적 og:image**: `GET /opengraph-image`(게이트 예외 또는 비활성 시) 가 **1200×630 PNG** 를 반환하고 브랜드 톤(파란 배경 + Activity 아이콘 + FinSight 워드마크)을 담는다. `og:image` 메타가 이 라우트의 **절대 URL**(`metadataBase` 기준)을 가리킨다.
3. **G3 — metadataBase**: `metadata.metadataBase` 가 설정되어 OG 이미지·URL 이 절대 URL 로 해석된다(상대 경로 경고 0). 빌드 시 `metadataBase` 미설정 경고가 사라진다.
4. **G4 — 크롤러 접근(게이트 정합)**: prod 게이트가 켜진 상태에서 카톡·SNS 크롤러가 OG 메타·이미지에 접근할 수 있다(§9 q1 결정에 따라: 크롤러 UA 허용 / OG 라우트 게이트 예외 / 또는 "공유는 게이트 off 환경 한정"). 결정된 방식의 AC 가 green.
5. **G5 — 카카오 프리뷰 실측**: 배포 후 Kakao Developers "캐시 삭제(스크랩 갱신)" 1회 실행하면 카톡 대화창에 제목·설명·대표 이미지·사이트명이 정상 노출(수동 검증 1회 — §3.5 운영 노트).
6. **G6 — 품질·무회귀**: `npm run typecheck`·`npm run lint`·`npm run build`·`npm run test` 0 에러. 신규 화면 0·디자인 토큰 변경 0(`tailwind.theme.json` diff 0). 기존 favicon(`/icon`)·라우트 회귀 0.

---

## 3. 범위 (In scope)

### 3.1 `app/layout.tsx` metadata 확장 (G1·G3)

- `export const metadata: Metadata` 에 다음을 보충(기존 `title`·`description` 유지·재사용):
  - **`metadataBase: new URL(<prod URL>)`** — OG/Twitter 이미지·url 절대 경로 해석의 기준. URL 출처는 §9 q3 결정(하드코딩 상수 vs env). 폴백 포함 권고(아래 q3 PM 권고).
  - **`openGraph`**: `title`(FinSight 또는 `title` 재사용), `description`(기존 설명 재사용), `url: "/"`(metadataBase 기준 절대화), `siteName: "FinSight"`, `locale: "ko_KR"`, `type: "website"`, `images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: <한글 alt> }]`(파일 컨벤션 채택 시 Next 가 자동 주입하므로 `images` 명시는 q2 결정에 따름).
  - **`twitter`**: `card: "summary_large_image"`, `title`, `description`, `images`(OG 이미지 재사용).
- **카피**: OG `title`·`description`·`siteName`·이미지 `alt` 의 한글 카피. 본 메타는 글로벌 셸 성격이므로 frontend.md `lib/copy/<domain>/` 룰상 `lib/copy/layout/` 후보다 — **단 `metadata` 는 Next 규약상 `app/layout.tsx` 모듈 상수**라서 카피 분리 강제가 과한지 §9 q5 로 분리(PM 권고: metadata 는 i18n 대상에서 제외하고 `layout.tsx` 인라인 유지가 실용적).
- `title` 은 단일 문자열 유지 또는 `{ default, template }` 패턴 채택 여부 — 현재 단일 화면군이라 단일 문자열로 충분(템플릿은 비범위, §4).

### 3.2 동적 og:image — `app/opengraph-image.tsx` (G2)

- `next/og` `ImageResponse` 로 **1200×630 PNG** 동적 생성(`app/icon.tsx` 패턴 확장). `export const size = { width: 1200, height: 630 }` + `export const contentType = "image/png"`.
- 시각: **브랜드 톤 재사용** — 파란 배경(accent `#1d4ed8`) + 흰 lucide Activity 아이콘 + "FinSight" 워드마크 + (선택) 한 줄 태그라인("AI 기반 매수·매도 판단 보조"). 레이아웃·여백은 1200×630 비율에 맞춤.
- **hex 직타 예외 명시**: `ImageResponse` 내부는 Tailwind 토큰·CSS 변수 호출 불가 → `#1d4ed8` 등 hex 명시. **`app/icon.tsx` 와 동일한 주석**("디자인 토큰 hex 직타 금지의 합리적 예외 — 토큰 동기화 시 본 파일도 갱신 필요")을 남긴다. accent 색상 값은 `app/icon.tsx` 와 **단일 값으로 일치**시킨다(둘이 어긋나면 브랜드 불일치).
- 폰트: 한글 워드마크/태그라인을 쓸 경우 `ImageResponse` 가 한글 글리프를 렌더하려면 폰트 데이터 주입이 필요할 수 있다 → **§9 q4 로 분리**(PM 권고: 1차는 "FinSight" 라틴 워드마크 + 아이콘만으로 폰트 주입 없이 출발, 한글 태그라인이 깨지면 Pretendard subset 주입 후속). 워드마크가 라틴이면 시스템 기본 폰트로 충분.
- **`twitter-image.tsx` 필요 여부**: Twitter card 는 `og:image` 를 fallback 으로 재사용 가능 → **별도 `twitter-image.tsx` 는 기본 미생성**(§9 q2 — PM 권고: OG 이미지 1종 공유, twitter 전용 이미지 비범위). 필요 시 `opengraph-image.tsx` 를 re-export 하는 얇은 파일로 후속.

### 3.3 (선택) URL env — `metadataBase` 출처 (q3 의존)

- `metadataBase` 가 prod 절대 URL 을 알아야 한다. 현재 env 에 URL 변수 없음(`.env.example`/`.env.local.example` 에 도메인 변수 부재 — `FASTAPI_BASE_URL` 만 존재).
- 옵션(§9 q3): (A) `app/layout.tsx` 에 prod URL 상수 하드코딩 + `process.env.VERCEL_URL` 폴백, (B) 신규 env `NEXT_PUBLIC_SITE_URL` 도입(`.env.example` 갱신).
- **PM 권고(q3)**: **(A) + Vercel 제공 `VERCEL_URL`/`VERCEL_PROJECT_PRODUCTION_URL` 폴백**. 도메인이 사실상 고정이고 새 시크릿이 아니므로 env 신설은 과하다. 프리뷰 배포에서도 자기 도메인을 가리키도록 `process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "trading-signal-frontend.vercel.app"` 류 폴백 1줄. env 채택(B) 시 `.env.example` 에 `NEXT_PUBLIC_SITE_URL` + 주석 추가.

### 3.4 게이트 정합 — 크롤러가 OG 를 읽게 (G4, q1 의존 — 가장 중요)

> prod 게이트(`app-password-gate`)가 켜진 상태에서 카톡/SNS 크롤러는 비밀번호가 없으므로 root `/`(OG HTML)·`/opengraph-image`(이미지) 둘 다 게이트에 막힌다. 메타를 아무리 보충해도 크롤러가 못 읽으면 프리뷰가 안 뜬다.

- §9 q1 결정에 따라 본 절의 구체 구현이 갈린다:
  - **옵션 A — OG 이미지 라우트만 게이트 예외**: middleware `isPublicPath` 에 `/opengraph-image`·`/twitter-image` 추가(현재 `/icon` 과 동일 취급) + `config.matcher` 1차 제외에도 반영. **단 root `/`(OG 메타가 박힌 HTML)는 여전히 게이트로 막혀 크롤러가 `<head>` 의 OG 태그 자체를 못 본다** → 이미지 예외만으로는 불충분. 별도 공개 메타 진입점 필요.
  - **옵션 B — 크롤러 UA 허용**: middleware 가 알려진 크롤러 UA(`kakaotalk-scrap`, `facebookexternalhit`, `Twitterbot`, `Slackbot` 등)를 식별해 **읽기 전용 페이지·OG 라우트에 한해 게이트 통과**. 보안 트레이드오프(UA 위조로 우회 가능 — 단 본 게이트는 강한 보안이 아니라 "공개 노출 최소화" 목적이라 수용 가능 여부는 사용자 판단). `/api/*` 는 UA 허용 대상에서 제외(데이터 무단 수집 차단 유지).
  - **옵션 C — 게이트 off 환경에서만 공유**: 게이트가 켜진 prod 는 어차피 비밀번호 없으면 못 보는 사적 앱이므로, 풍부한 프리뷰는 게이트가 꺼진 환경(공개 배포 시)에서만 의미. 본 PRD 는 메타·OG 이미지 보충만 하고 게이트 우회는 안 함(코드 변경 최소).
- **PM 권고(q1)**: **옵션 B(크롤러 UA 허용) + 공개 OG 메타**. 사용자 의도가 "카톡에 공유하면 프리뷰가 뜨게"이므로 크롤러 접근이 필수 전제다. 옵션 A 는 이미지만 풀려 `<head>` OG 를 못 읽어 불완전, 옵션 C 는 사용자 의도를 충족 못 함. UA 허용은 (1) 알려진 크롤러 UA 화이트리스트, (2) **페이지·OG 이미지 라우트 한정**(`/api/*` 는 계속 차단해 데이터 보호), (3) UA 위조 가능성은 "본 게이트는 강보안이 아님" 전제에서 수용 — 으로 한정한다. 보안 민감도가 높으면 옵션 C(게이트 off 시에만 공유)로 후퇴. **이 결정 없이는 prod 프리뷰가 안 뜨므로 q1 이 본 PRD 의 머지 게이트**.
- middleware 변경이 생기면(옵션 A/B) `app-password-gate` 의 AC(특히 `/api/*` 401·무한 루프 가드)를 깨지 않는지 회귀 확인(§8 회귀 위험).

### 3.5 카카오 캐시 / 운영 노트 (G5)

- 카카오는 OG 를 **공격적으로 캐싱**한다 → 배포 직후 옛 메타(또는 무메타)가 한동안 노출될 수 있다. 운영 절차를 PR 본문 `## 다음 작업` 인접 또는 README 운영 노트에 기록:
  - **Kakao Developers → 도구 → 캐시 삭제**(URL 입력 후 스크랩 갱신)로 강제 재크롤링.
  - 페이스북/슬랙 등은 각 플랫폼 디버거(facebook Sharing Debugger, Slack 은 자동 재크롤 등)로 갱신.
  - OG 이미지 변경 시 파일명/쿼리스트링 변경으로 캐시 무력화 가능(동적 라우트라 `?v=2` 류로 강제 가능 — 필요 시).
- 본 절은 **코드가 아니라 운영 문서**다(검증은 수동 1회, G5).

### 3.6 분할 vs 단일

- 본 PRD 는 **단일 PR**. metadata 확장 + OG 이미지 1종 + (옵션) middleware 예외/UA 허용 + env/문서로 변경량 소규모(§8). 디자이너 의존 없음(미니멀 브랜드 카드). 한 흐름(메타 ↔ 이미지 ↔ 게이트 정합)이 강결합이라 분할 이득 없음.

---

## 4. 비범위 (Out of scope)

- **앱 화면 UI 변경 0건** — 본 PRD 는 `<head>` 메타 + 소셜 프리뷰 카드 이미지만. 페이지·컴포넌트·라우트·디자인 토큰 무변경.
- **페이지별 동적 OG**(종목 분석 페이지마다 종목명·가격이 박힌 og:image 등) — 본 PRD 는 **사이트 전역 단일 OG** 만. 라우트별 `generateMetadata`/route-segment `opengraph-image` 는 후속 PRD(가치는 크지만 범위·복잡도 별개).
- **`title.template` 다중 타이틀 체계** — 현재 단일 브랜드 타이틀로 충분. 라우트별 타이틀 템플릿은 비범위.
- **PWA / web app manifest**(`manifest.webmanifest`, 앱 설치·홈 화면 아이콘, theme-color) — 본 PRD 는 소셜 공유 OG 한정. PWA 메타는 별도 트랙(§9 q관련 없음 — 명시 제외). middleware 에 이미 `/manifest.webmanifest` 예외는 있으나 파일 자체는 본 PRD 가 만들지 않는다.
- **`robots.txt` / `sitemap.xml` 생성** — SEO 인덱싱은 별개 트랙(게이트로 막힌 사적 앱이라 인덱싱 의도도 불명). 비범위.
- **앱 비밀번호 게이트 자체의 보안 모델 변경** — UA 허용(옵션 B 채택 시)은 OG 크롤러 한정 예외일 뿐, 게이트의 페이지/`/api/*` 보호 본질은 유지. RBAC·rate-limit 등은 `app-password-gate` 비범위 그대로.
- **다국어 OG**(en_US 등 `og:locale:alternate`) — 현재 한국어 단일. i18n 도입 시 후속.
- **OG 이미지 A/B·다중 시안** — 브랜드 카드 1종 확정. 디자이너 합류·캠페인용 시안은 별도 PRD.

---

## 5. 수용 기준 (AC)

> 명령 단위로 재현 가능하게 기술. `<게이트-off>` = `APP_PASSWORD` 미설정 로컬 `npm run dev` 또는 게이트 비활성 환경. prod 게이트 정합은 q1 결정에 종속(AC-5).

### 5.1 메타데이터 (G1·G3)
- **AC-1 (OG/Twitter 필드 존재)**: `git grep -nE "openGraph|metadataBase|twitter" app/layout.tsx` 가 1건 이상이고, `openGraph` 에 `title`·`description`·`url`·`siteName`·`locale`(`ko_KR`)·`type`(`website`)·`images`, `twitter` 에 `card: "summary_large_image"` 가 존재.
- **AC-2 (HTML 출력)**: `<게이트-off>` 에서 `curl -s http://localhost:3000/ | grep -E 'property="og:|name="twitter:'` 결과에 `og:title`·`og:description`·`og:image`·`og:url`·`og:type`·`og:site_name`·`og:locale`·`twitter:card`·`twitter:image` 가 출력된다.
- **AC-3 (metadataBase 절대화)**: `og:image`·`og:url` 의 값이 **절대 URL**(`https://...` 로 시작)이다 — AC-2 grep 출력에서 확인. `npm run build` 로그에 `metadataBase` 미설정 경고가 없다.

### 5.2 동적 og:image (G2)
- **AC-4 (1200×630 PNG)**: `app/opengraph-image.tsx` 가 존재하고 `size = { width: 1200, height: 630 }`·`contentType = "image/png"` 를 export 한다 — `git grep -nE "1200|630|opengraph" app/opengraph-image.tsx`. `<게이트-off>` 에서 `curl -sI http://localhost:3000/opengraph-image | grep -i content-type` → `image/png`. 이미지에 파란 배경 + Activity 아이콘 + FinSight 워드마크가 담긴다(시각 검증 — 브라우저로 `/opengraph-image` 열기).
- **AC-4b (hex 예외 주석)**: `app/opengraph-image.tsx` 내 accent hex(`#1d4ed8`)에 `app/icon.tsx` 와 동일 취지의 "토큰 hex 직타 예외" 주석이 있고, 값이 `app/icon.tsx` 의 accent 와 **동일**하다 — `git grep -n "1d4ed8" app/icon.tsx app/opengraph-image.tsx` 두 파일 모두 동일 값.

### 5.3 게이트 정합 (G4, q1 종속)
- **AC-5 (크롤러 접근 — q1 결정 따름)**:
  - **옵션 B 채택 시**: 게이트 켜진 환경에서 크롤러 UA(`User-Agent: kakaotalk-scrap/1.0`)로 root `/` + `/opengraph-image` 요청 시 **200**(OG HTML·이미지 수신, `/login` 리다이렉트 아님). 일반 UA(쿠키 없음)는 여전히 `/login` 리다이렉트. `/api/market/ticker` 는 크롤러 UA 라도 **401 유지**(데이터 보호) — `curl -sI -A "kakaotalk-scrap/1.0" <게이트환경>/api/market/ticker` → 401.
  - **옵션 A 채택 시**: `git grep -nE "opengraph-image|twitter-image" middleware.ts` 가 `isPublicPath`·`matcher` 양쪽에 반영. `/opengraph-image` 200(게이트 무관). (root HTML OG 한계는 q1 노트로 수용.)
  - **옵션 C 채택 시**: middleware 무변경. 본 AC 는 "게이트 off 환경에서 AC-2 성립" 으로 대체.
- **AC-6 (게이트 무회귀)**: 옵션 A/B 로 middleware 를 수정한 경우, `app-password-gate` 의 핵심 AC 가 깨지지 않는다 — 쿠키 없는 일반 UA 의 `/dashboard` 는 `/login` 리다이렉트, `/api/*`(인증 API 제외) 는 401 유지(`curl -sI <게이트환경>/api/market/ticker` → 401), 무한 리다이렉트 루프 없음.

### 5.4 품질·무회귀 (G6)
- **AC-7 (품질 게이트)**: `npm run typecheck`·`npm run lint`·`npm run build`·`npm run test` 0 에러.
- **AC-8 (디자인 토큰·화면 무변경)**: `tailwind.theme.json` diff 0(`git diff --stat tailwind.theme.json` 변경 없음). 신규 앱 화면·컴포넌트 0(`app/opengraph-image.tsx`·`app/twitter-image.tsx` 는 메타 라우트로 화면 아님).
- **AC-9 (favicon 무회귀)**: 기존 `/icon`(favicon) 이 그대로 동작 — `curl -sI <게이트-off>/icon | grep -i content-type` → `image/png`, 32×32 유지. OG 이미지 추가가 favicon 을 깨지 않는다.

### 5.5 운영 (G5 — 수동)
- **AC-10 (카카오 프리뷰 실측)**: 배포 + Kakao Developers 캐시 삭제(스크랩 갱신) 후, 카톡 대화창에 링크 붙여넣기 시 제목·설명·대표 이미지·사이트명(FinSight)이 노출됨(수동 검증 1회, 스크린샷 또는 확인 메모). 게이트 정합(q1)이 옵션 C 면 게이트 off 환경 URL 로 검증.

---

## 6. 가정 · 제약

- **선행 전제**: `app-password-gate`(PR#48, `middleware.ts` 게이트) 머지됨 — §3.4 / q1 이 이 게이트와 직접 얽힌다. middleware `isPublicPath`·`config.matcher` 의 현 예외 목록(§1.2)이 본 PRD 변경의 출발점.
- **BE / 데이터 가정 없음**: 본 PRD 는 정적 메타 + 동적 이미지 렌더만. KIS/FastAPI 등 백엔드·데이터 의존 0.
- **Vercel 가정**: prod 도메인 `trading-signal-frontend.vercel.app`. `metadataBase` 폴백으로 `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` 사용 가능(q3 PM 권고). 환경변수 신설(옵션 B-q3) 시 Vercel Project Settings 등록.
- **`next/og` 런타임 제약**: `ImageResponse` 는 Edge 런타임에서 돈다(`app/icon.tsx` 와 동일). Tailwind 클래스·CSS 변수·외부 CSS 미사용 — inline style + hex. 한글 폰트는 글리프 데이터 주입이 필요할 수 있다(q4). lucide Activity 는 SVG path 인라인(`app/icon.tsx` 선례).
- **크롤러 캐시 가정**: 카카오·페이스북은 OG 를 캐싱 → 배포 후 강제 재크롤 절차 필요(§3.5, G5). 캐시 만료까지 옛/무 프리뷰 노출은 정상.
- **게이트 보안 트레이드오프**: 옵션 B(UA 허용) 채택 시 UA 위조로 페이지·OG 이미지 우회 가능. 단 본 게이트는 "공개 노출 최소화" 목적(강보안 아님, `app-password-gate` §4 RBAC 비범위)이고 `/api/*` 는 UA 허용에서 제외 → 데이터 보호는 유지. 보안 민감 시 옵션 C 후퇴(q1).
- **도구 가정**: `npm run typecheck/lint/build/test` 게이트. `git grep`/`find`/`curl`/브라우저 시각 검증으로 AC 재현. 카톡 프리뷰는 Kakao Developers 캐시 도구 + 실제 대화창 수동 검증(G5).

---

## 7. 참고

- 인접 코드:
  - `app/layout.tsx`(`metadata` 상수 — 본 PRD 확장 지점, 현 `title`/`description` 2필드. Pretendard self-host 폰트·Providers 동거).
  - `app/icon.tsx`(`next/og` ImageResponse favicon 선례 — hex 직타 예외 주석·lucide Activity SVG path·`#1d4ed8` accent. **OG 이미지 디자인의 직접 레퍼런스**).
  - `middleware.ts`(게이트 — `isPublicPath` 예외 목록·`config.matcher`·`/icon` 처리. §3.4 변경 대상 후보).
  - `lib/auth/session.ts`·`lib/auth/constants.ts`(게이트 검증·쿠키 — 옵션 B UA 허용 시 분기 위치 검토).
  - `.env.example`/`.env.local.example`(URL env 신설 시 — 현재 도메인 변수 부재, `FASTAPI_BASE_URL` 만).
- 룰·문서: `docs/rules/frontend.md`(디자인 토큰 hex 직타 금지 — `next/og` 예외는 `app/icon.tsx` 선례), `AGENTS.md`(라벨 흐름·단일 PR 룰).
- 선행 PRD: `docs/prd/app-password-gate.md`(게이트 §3.1 예외 목록·middleware matcher·`/api/*` 401·무한 루프 가드 — 본 PRD §3.4/AC-6 정합 대상).
- 외부: Next.js `Metadata`(`openGraph`/`twitter`/`metadataBase`) + 파일 컨벤션(`opengraph-image.tsx`/`twitter-image.tsx`), `next/og` `ImageResponse` 문서, The Open Graph protocol(`og:*`), Kakao Developers 캐시 삭제(스크랩 갱신) 도구, Twitter Card(`summary_large_image`).
- 기억: Vercel 연동 완료(앱 비밀번호 게이트 #48), 조회·분석 전용 스코프(공개 노출 최소화 의도).

---

## 8. 영향 분석 (Impact)

### 8.1 변경 라인 추정

| 파일 | 신규/수정 | 추정 라인 | 비고 |
|---|---|---|---|
| `app/layout.tsx` | 수정 | +25~45 | `metadataBase`·`openGraph`·`twitter` 보충(기존 title/description 재사용) |
| `app/opengraph-image.tsx` | 신규 | +45~90 | `next/og` 1200×630 — 파란 배경 + Activity SVG + FinSight 워드마크(+태그라인). `app/icon.tsx` 확장 |
| `app/twitter-image.tsx` | 신규(선택, q2) | +5~10 | OG 이미지 re-export — **기본 미생성**(OG 1종 공유) |
| `middleware.ts` | 수정(q1 옵션 A/B) | +5~25 | A=예외 경로 2개 추가 / B=크롤러 UA 화이트리스트 분기. **옵션 C 면 0** |
| `.env.example`(+local) | 수정(선택, q3-B) | +4~8 | `NEXT_PUBLIC_SITE_URL` 신설 시. **q3-A(폴백) 면 0** |

→ 합계 대략 **+80~170 라인**(옵션 선택에 따라 가감). 외부 의존 추가 0(`next/og` 는 Next 내장). 단일 도메인(메타/게이트) 응집, 디자이너 의존 0 → **단일 PR 적정**.

### 8.2 커밋 분할 권고 (단일 PR 내부)

1. `feat(meta): app/layout OG·Twitter 메타데이터 + metadataBase 보충`.
2. `feat(meta): next/og 동적 og:image 1200×630 (브랜드 카드)`.
3. `feat(auth): OG 크롤러 게이트 통과 (q1 결정 — UA 허용 / 라우트 예외)` — **q1 옵션 C 면 생략**.
4. `chore(env): SITE_URL env + 카카오 캐시 갱신 운영 노트` — **q3-A(폴백)·운영 노트만이면 docs 커밋으로 축소**.
- 첫 commit 으로 `docs(prd): social-share-metadata`(본 PRD)를 `feature/social-share-metadata` 브랜치에 올린다(한 브랜치 한 PR 룰 — docs-only PR 미생성).

### 8.3 회귀 위험

- **(상) 게이트 회귀 — middleware 변경이 보호를 약화/파손**: 옵션 B(UA 허용) 가 너무 넓으면 페이지 전체가 UA 위조로 열리거나, 너무 좁으면 크롤러가 못 읽는다. 옵션 A 가 `matcher` 정규식을 깨면 무관한 경로까지 영향. → AC-5/AC-6 으로 "크롤러 200 / 일반 UA 리다이렉트 / `/api/*` 401 / 루프 없음" 동시 검증. `app-password-gate` AC(특히 `/api/*` 401)를 회귀 표면으로 명시.
- **(중) metadataBase 미설정/오설정**: URL 이 틀리면 OG 이미지가 깨진 절대 URL 을 가리켜 프리뷰 이미지가 안 뜬다. 폴백 체인(q3-A)으로 prod/preview 모두 자기 도메인 가리키게. → AC-3 + 빌드 경고 0.
- **(중) 카톡 캐시로 변경 미반영 오인**: 배포했는데 프리뷰가 안 바뀌어 "버그"로 오인. → §3.5 운영 노트(캐시 삭제 절차) + AC-10 은 캐시 갱신 후 검증.
- **(저) 한글 글리프 깨짐**: `ImageResponse` 가 한글 폰트 데이터 없이 한글 태그라인을 렌더하면 □ 로 깨질 수 있다. → q4 PM 권고(1차 라틴 워드마크만, 한글 시 Pretendard subset 주입 후속). AC-4 시각 검증.
- **(저) accent 색 불일치**: OG 이미지 hex 와 `app/icon.tsx` hex 가 어긋나면 브랜드 톤 분열. → AC-4b 로 두 파일 동일 값 강제.
- **(저) favicon 회귀**: OG 메타/이미지 추가가 `/icon` 동작을 건드릴 일은 없으나 메타 라우트 충돌 점검. → AC-9.

### 8.4 분할 vs 단일 결정

소규모(+80~170 라인) + 디자이너 트리거 없음 + 외부 의존 0 + 한 흐름 강결합 → **단일 PR**. q1 옵션에 따라 middleware 커밋(3)이 가감되지만 모두 한 PR 안.

---

## 9. OPEN QUESTION

> 5건 전부 **[RESOLVED]** (2026-05-31, 사용자 결정 + 코드 검증). q1 은 옵션 B 로 확정하되 보안 안전성을 코드로 검증함. q2~q5 는 PM 권고 기본값 채택. §3/§5/§8 본문의 q1 분기 서술은 옵션 B 기준으로 읽는다.

- **[RESOLVED] q1 — prod 게이트가 켜진 상태에서 크롤러가 OG 를 어떻게 읽게 할까?** → **옵션 B(크롤러 UA 허용) 확정.**
  - **결정 근거(코드 검증 완료, 2026-05-31)**: 사용자 우려("UA 위조자가 페이지엔 들어와도 내부 데이터는 못 보지 않냐")를 코드로 확인 → **사실로 확정**.
    1. `middleware.ts:86-92` — 게이트는 페이지와 `/api/*` 를 **독립 검사**. 세션 쿠키(`app_auth` HMAC) 없으면 `/api/*` 는 무조건 `401 JSON`. UA 허용을 **페이지·OG 라우트로 한정**하면 `/api/*` 데이터는 계속 보호됨.
    2. `FASTAPI_BASE_URL` 은 `app/api/` **안에서만** 사용(서버컴포넌트/페이지 직접 호출 0건, grep 확인). axios `baseURL: "/api"`(`lib/api/client.ts:18`) → 모든 데이터 페칭이 게이트된 `/api/*` 경유. 홈 `app/(main)/page.tsx` 는 서버컴포넌트지만 `<MarketOverviewPage/>` 셸만 렌더, 실데이터는 클라이언트 경계 TanStack Query 가 가져옴.
    3. 결론: 크롤러/UA 위조자가 얻는 건 **빈 UI 셸 + OG `<meta>` 태그뿐**(OG 스크랩엔 충분). 시장·계좌·분석 데이터는 쿠키 없으면 전부 401 → 일절 접근 불가. 노출은 "앱 존재 + UI 구조 + 한글 카피" 정도의 경미한 정보 → 조회·분석 전용 앱 특성상 수용 가능.
  - **구현 제약(머지 게이트)**: (1) 알려진 크롤러 UA 화이트리스트(`kakaotalk-scrap`/`facebookexternalhit`/`Twitterbot`/`Slackbot`/`Discordbot`/`TelegramBot` 등), (2) **GET 페이지 + `/opengraph-image`(+생성 시 `/twitter-image`) 한정**, (3) **`/api/*` 는 UA 허용 대상에서 명시적 제외 — 쿠키 없으면 계속 401 유지**(데이터 보호 불변). (§3.4·AC-5·AC-6·§8.3 반영)

- **[RESOLVED] q2 — `twitter-image.tsx` 를 별도로 둘까?** → **OG 이미지 1종 공유**(`twitter-image.tsx` 미생성, PM 권고 채택). `twitter:card=summary_large_image` + `twitter:image` 가 `og:image` 와 동일 1200×630 재사용. 트위터 전용 비율·카피 필요 시 얇은 re-export 후속. (§3.2·AC-4 반영)

- **[RESOLVED] q3 — `metadataBase` URL 출처는?** → **(A) 하드코딩 상수 + `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` 폴백**(PM 권고 채택). `new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? \`https://\${...}\` : "https://trading-signal-frontend.vercel.app")` 류 1줄로 prod/preview 자기 도메인 정합. (§3.1·§3.3·AC-3 반영)

- **[RESOLVED] q4 — og:image 에 한글 태그라인을 넣을까?** → **1차는 라틴 워드마크("FinSight") + Activity 아이콘만**(폰트 주입 없이, `app/icon.tsx` 와 동일 무폰트 — PM 권고 채택). 한글 태그라인은 Pretendard subset 주입 후속. (§3.2·AC-4·§8.3 반영)

- **[RESOLVED] q5 — OG 카피를 `lib/copy/` 로 분리할까?** → **`app/layout.tsx` 인라인 유지**(PM 권고 채택). `metadata` 는 Next 규약상 `layout.tsx` 모듈 상수. `description` 은 기존 필드 재사용해 한 곳에서만 정의. i18n 트랙 도입 시 함께 이관. (§3.1 반영)

---

## 10. 다음 단계 (참고 — 최종 PR 본문에서 다룸)

- **구현(frontend-dev)**: 외부 의존 추가 0(`next/og` 내장). UI 는 소셜 프리뷰 카드 1종(앱 화면 아님) — **UX/UI 디자이너 불요**. 커밋 분할 §8.2 따름(메타 → og:image → 게이트 정합(q1) → env/운영 노트). q1~q5 사용자 결정 후 §3/§5/§8 확정.
- **운영(사용자 작업)**: 배포 후 Kakao Developers 캐시 삭제(스크랩 갱신) 1회 + 카톡 대화창 실측(AC-10·G5). q3-B(env) 채택 시 Vercel Project Settings 에 `NEXT_PUBLIC_SITE_URL` 등록.

---

산출물: docs/prd/social-share-metadata.md | UI: yes (소셜 프리뷰 카드 이미지 — 앱 화면 아님, 디자이너 불요) | OPEN QUESTION: 5건 미결 (q1 크롤러 게이트 통과가 머지 게이트)
