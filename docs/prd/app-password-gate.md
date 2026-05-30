# PRD — app-password-gate (앱 전체 단일 공유 비밀번호 게이트)

> 배포된 앱(Vercel 프로덕션 도메인 포함)을 **단일 공유 비밀번호**로 보호한다.
> Next.js **루트 `middleware.ts`** 가 모든 요청을 가로채 유효한 **HMAC 서명 세션 쿠키**가 없으면 `/login`(비밀번호 화면)으로 보내고,
> 통과 시 쿠키로 앱 전체(페이지 + `/api/*`)를 사용한다.
> 조회·분석 전용 + 실전(prod) 키 정책 — 본 기능은 **접근 제어**일 뿐 매매/주문과 무관.
> **UI 포함(로그인 화면) — 디자이너 미합류 수준**(기존 v8 토큰·합성 클래스 재사용, 신규 디자인 토큰 0).

- **slug**: `app-password-gate`
- **작성일**: 2026-05-30 · **결정일**: 2026-05-30
- **OPEN QUESTION**: 5건 (§9) — **전부 RESOLVED**(2026-05-30, PM 권고 전부 채택). 본문 §0/§3/§5/§8 반영 완료.
- **다음 단계**: 구현(frontend only — middleware + route handler + 로그인 화면). 디자이너 **미합류**(UI 경미·미니멀).
- **PR 정책**: **단일 PR**(한 브랜치 한 PR 룰 — MEMORY `single-pr-rule-exception` 종료 확인. finsight-redesign / stock-api-integration 시리즈 모두 종료).
- **UI 포함 여부**: **yes (경미)** — `/login` 비밀번호 입력 화면 1개 신설. 기존 합성 토큰(`button-primary`/`input`/`input-error`/`input-label`/`card`) 재사용, 신규 디자인 토큰 0건. **디자이너 합류 트리거 아님**(미니멀 폼, 브랜딩은 favicon·서비스명 수준).

---

## 0. 한눈에

| 항목 | 내용 |
|---|---|
| 무엇 | 앱 전체를 단일 공유 비밀번호로 보호. 미인증 시 `/login` 으로 리다이렉트, 통과 시 서명 쿠키 발급. |
| 왜 | Vercel "All Deployments" 보호는 Pro($150/월) 필요. Standard Protection 은 배포/미리보기 URL 만 막고 **프로덕션 도메인은 공개** → 앱 자체 게이트로 무료 보완. |
| 핵심 인프라 | 루트 `middleware.ts`(Edge 런타임) · `/login` 페이지 · `app/api/auth/login`·`logout` route handler · 쿠키 서명/검증 유틸(Web Crypto HMAC-SHA256) |
| env (서버 전용) | `APP_PASSWORD`(공유 비밀번호) · `APP_AUTH_SECRET`(서명 시크릿, 랜덤 긴 문자열). **`NEXT_PUBLIC_` 금지**, 브라우저 노출 0 — KIS 키와 동일 취급. |
| 보안 | constant-time 비밀번호 비교(타이밍 공격 방지) · HMAC 서명(위조 불가) · 만료 검사(리플레이 완화) · 비밀번호/시크릿 로깅 0 · 에러 메시지에 비밀번호 노출 0 · `httpOnly`+`secure`+`sameSite=lax` 쿠키 |
| 게이트 on/off | `APP_PASSWORD` 미설정 시 **비활성**(앱 공개) — 로컬/CI 편의. 프로덕션은 반드시 설정(`.env.example` "프로덕션 필수" 명시 + `NODE_ENV=production` 미설정 시 경고 로그 1회). **§9 q1 RESOLVED**. |
| 쿠키 수명 | `maxAge` **30일**. 만료의 단일 진실은 토큰 payload `exp`(서버 검증) — 쿠키 maxAge 만 신뢰하지 않음. **§9 q2 RESOLVED**. |
| 브루트포스 | 실패 응답 전 **~500ms 고정 지연**만(카운터/잠금 비범위 — 서버리스 분산으로 신뢰 불가). 비밀번호 16+ 랜덤 권고. **§9 q3 RESOLVED**. |
| API 게이트 | `/api/*` **전부 보호**(인증 API `/api/auth/*` 만 예외) + axios **401→`/login` 매핑 동일 PR 포함**(확정). **§9 q5 RESOLVED**. |
| UI | 경미 — `/login` 미니멀 폼 1개. 기존 v8 토큰 재사용, 디자이너 미합류. |

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim 요약)
배포된 앱(프로덕션 도메인 포함)을 **단일 공유 비밀번호로 보호**한다. Vercel "All Deployments" 보호는 Pro $150/월이라 못 쓰니, **Next.js middleware 기반 앱 자체 비밀번호 게이트**를 무료로 구현. 방문자는 비밀번호 입력 화면을 먼저 만나고, 통과 시 서명 쿠키로 앱 사용.

### 1.2 현재 상태 (main 기준)
- **`middleware.ts` 없음** — `find . -maxdepth 2 -name "middleware.ts"` 0건. 어떤 요청도 게이트되지 않음.
- 모든 페이지는 라우트 그룹 `app/(main)/` 아래(`page.tsx`, `analyze`, `dashboard`, `market`, `watchlist`, `profile/[ticker]`). **최상위 `app/page.tsx` 없음** — URL `/` 는 `app/(main)/page.tsx` 가 처리.
- BFF route 11종이 `app/api/` 아래에 노출(`/api/market/ticker`, `/api/market/indices`, `/api/stock/*`, `/api/disclosure/*`, `/api/watchlist`, `/api/whitelist/search`, `/api/workbench/analyze`). **현재 인증 없음** → 프로덕션 도메인이 공개면 누구나 `/api/market/ticker` 등을 직접 긁을 수 있다(KIS 유량·CoinGecko 한도 소모, 데이터 무단 수집).
- favicon 은 `app/icon.tsx`(`next/og` ImageResponse 동적 생성) — `/icon` 경로로 서빙됨. 폰트는 `public/fonts/`.
- 디자인 토큰 v8: 합성 클래스 `.button-primary`(accent-vivid CTA, h=40px) · `.input`/`.input-error`(h=36px) · `.input-label` · `.input-helper`/`.input-helper-error` · `.card`(surface + border + rounded-lg) 가 `app/components.css` `@layer components` 에 정착. **hex/px 직타 금지**, 합성 클래스/Tailwind 토큰만.
- 클라이언트 HTTP 는 단일 axios 인스턴스(`lib/api/client.ts`, `baseURL: "/api"`, same-origin). 응답 인터셉터가 `ApiError`(`network`/`validation`/`whitelist_miss`/`server`)로 매핑. **401 매핑은 현재 없음.**
- Vercel 연동 완료(`trading-signal-frontend.vercel.app`). MEMORY `project_vercel-deferred` 종료 가정(연동됨). 환경변수는 Vercel Project Settings 에 등록.
- env 컨벤션: 서버 전용 키는 `NEXT_PUBLIC_` 없이 사용(`FASTAPI_BASE_URL`, `CLAUDE_CLI_PATH` 등). `.gitignore` 가 `.env`/`.env.*` 차단, `.env.example`·`.env.local.example` 만 commit.

### 1.3 문제
1. 프로덕션 도메인이 공개 상태라 **누구나 앱·API 에 접근**한다(분석·종목 데이터·실전 키로 호출되는 BFF). Vercel 유료 보호는 비용 과다.
2. 보호 없이 두면 `/api/*` 가 외부에 그대로 노출 — KIS/CoinGecko 유량을 무단 소모하거나 데이터를 긁어갈 수 있다.
3. middleware 가 없어 **요청 단위 게이트의 진입점 자체가 부재**.

### 1.4 컨텍스트 메모 (필수 인지)
- 스택: Next.js 16(App Router) + Tailwind v3 + TanStack Query v5 + axios + BFF(route handler). FE 컨벤션 `docs/rules/frontend.md` 8개 절 — 본 PRD 는 이 룰 안에서만 짠다(네이밍/커스텀훅 의무/도메인 한 뎁스/cn/layout/copy/queryKeys/반응형).
- **Edge 런타임 제약**: `middleware.ts` 는 Edge 런타임에서 돈다. Node `crypto` 모듈·`Buffer` 사용 불가 → **Web Crypto(`crypto.subtle` HMAC-SHA256)** 로 서명/검증한다(Edge 호환). `process.env` 읽기는 가능.
- **서버 전용 시크릿 정책**: `APP_PASSWORD`/`APP_AUTH_SECRET` 은 KIS 키와 동일 취급. `NEXT_PUBLIC_` 접두사 금지(붙이면 번들에 인라인되어 브라우저 노출). middleware·route handler(둘 다 서버) 에서만 읽는다.
- 로그인 화면은 글로벌 셸(Sidebar/Header/BottomNav)을 **공유하지 않는다**(풀스크린 단독 폼). frontend.md "재사용 컴포넌트 추출은 shell 을 실제 공유할 때만" 룰에 따라 `components/layout/` 추출 없이 `/login` 라우트 안에 둔다.

---

## 2. 목표 (측정 가능)

1. `APP_PASSWORD` 가 설정된 상태에서, **유효한 세션 쿠키 없이** 임의의 페이지·API(`/`, `/dashboard`, `/api/market/ticker` 등)에 접근하면 **`/login` 으로 리다이렉트**(페이지) 또는 **401**(API)된다.
2. `/login` 에서 올바른 비밀번호 제출 → **HMAC 서명 세션 쿠키**(`httpOnly`+`secure`+`sameSite=lax`+maxAge)가 발급되고, **원래 가려던 경로로 복귀**한다.
3. 서명 쿠키는 **위조 불가**(시크릿 모르면 유효 서명 생성 불가) + **만료 검사**(maxAge 경과 시 무효 처리 → 재로그인).
4. `APP_PASSWORD`/`APP_AUTH_SECRET` 값이 **클라이언트 번들·네트워크 응답·로그 어디에도 노출되지 않는다**(`git grep "NEXT_PUBLIC_APP" app components lib` 0건, 빌드 산출물 grep 0건).
5. `APP_PASSWORD` **미설정 시 게이트 비활성**(앱 전체 공개) — 로컬/CI 에서 별도 설정 없이 기존처럼 동작(§9 q1 RESOLVED). 프로덕션(`NODE_ENV=production`) 미설정 시 경고 로그 1회.
6. BFF route 가 게이트 뒤에서도 **정상 동작**한다 — 인증된 브라우저는 same-origin 쿠키를 자동 전송하므로 `/api/*` 호출이 깨지지 않는다(회귀 0).
7. `typecheck` / `lint` / `build` / `test` 0 에러. 신규 디자인 토큰 0건. 기존 라우트·기능 회귀 0.

---

## 3. 범위 (In Scope)

### 3.1 루트 `middleware.ts` (Edge 런타임) — 신설

- 위치: 저장소 루트 `middleware.ts`(Next.js 규약 — `app/` 형제). 모든 매칭 요청을 가로챈다.
- **게이트 활성 조건**(q1 RESOLVED — 미설정=비활성): `process.env.APP_PASSWORD` 가 truthy 일 때만 게이트 동작. 미설정이면 즉시 `NextResponse.next()`(앱 공개). `NODE_ENV === "production"` 인데 미설정이면 **경고 로그 1회**(모듈 로드 시 1회 — 요청마다 스팸 금지). 로컬/CI 는 미설정 상태로 기존처럼 동작(마찰 0).
- **세션 쿠키 검증**: 요청 쿠키에서 세션 쿠키(예: `app_auth`)를 읽어 `lib/auth/session` 의 `verifySession(token)` 으로 검증(HMAC + 만료). 유효하면 통과.
- **미인증 처리 분기**:
  - **페이지 요청**: `/login` 으로 **307 리다이렉트**. 원래 경로를 쿼리(`?next=<원경로>`)로 보존(로그인 후 복귀). open-redirect 방지 — `next` 는 **same-origin 절대경로(`/` 로 시작, `//` 불허)만 허용**, 그 외엔 `/` 로 폴백.
  - **API 요청**(`/api/*`, 인증 API 제외 — q5 RESOLVED): 리다이렉트 대신 **401 JSON**(`{ error: "unauthorized" }`) 반환. 클라이언트가 HTML 리다이렉트를 받지 않도록(axios·fetch 친화). `/api/auth/*` 만 게이트 예외.
  - **무한 리다이렉트 루프 가드**(필수): 미인증이어도 요청 경로가 이미 `/login` 이면 **리다이렉트하지 않고 통과**(`/login` → `/login` 무한 루프 차단). 예외 화이트리스트 통과 후 분기 전 가드.
- **게이트 통과 허용 예외**(인증 없이도 접근 가능):
  - `/login` (비밀번호 화면 자체).
  - 인증 API `/api/auth/*`(`login`/`logout`).
  - Next 정적/이미지 자원: `/_next/static`, `/_next/image`.
  - favicon·아이콘: `/favicon.ico`, `/icon`(`app/icon.tsx` 산출), 기타 메타 라우트(`/robots.txt`, `/sitemap.xml` 존재 시).
  - `public/` 공개 에셋(폰트 등) — `/fonts/*`.
  - **그 외 모든 페이지 + `/api/*`(인증 API 제외) 전부 보호**(공개가 `/api/market/ticker` 등 못 긁게).
- **`config.matcher`**: 정적 자원·favicon·`_next` 를 matcher 단계에서 1차 제외(부하 절감)하되, **인증 판단의 단일 진실은 미들웨어 함수 내부의 예외 로직**(matcher 는 성능 최적화일 뿐 보안 경계로 신뢰하지 않음). matcher 예시: `["/((?!_next/static|_next/image|favicon.ico|icon|fonts).*)"]`.
- **Edge 호환**: Node `crypto`/`Buffer` 미사용. 쿠키 검증은 `lib/auth/session`(Web Crypto 기반)으로 위임 — middleware 는 cookie 파싱 + 분기만.

### 3.2 쿠키 서명/검증 유틸 — `lib/auth/session.ts`(신규 도메인 `lib/auth/` 한 뎁스)

- **서명**: `signSession(payload): Promise<string>` — payload(예: `{ v: 1, iat: <발급 epoch ms>, exp: <만료 epoch ms> }`)를 JSON→base64url 인코딩한 `body` 와, `body` 를 `APP_AUTH_SECRET` 로 HMAC-SHA256 서명한 `sig` 를 `<body>.<sig>` 형태로 결합(JWT 유사, 라이브러리 없이 Web Crypto 직접). **`exp` = `iat + 30일`(q2 RESOLVED)** — 만료의 단일 진실은 **서명된 payload `exp`** 이고, 쿠키 `maxAge` 는 같은 30일을 쓰되 **보조 수단일 뿐 신뢰 경계 아님**(쿠키는 클라가 변조 가능 → 서버는 항상 서명 검증 후 `exp` 를 본다).
- **검증**: `verifySession(token): Promise<boolean>` —
  1. `<body>.<sig>` 분해, `body` 재서명 결과와 `sig` 를 **constant-time 비교**(`crypto.subtle` 로 재계산 후 바이트 비교; 길이/내용 모두 일정시간).
  2. 서명 일치 시 `body` 디코드 → `exp` 가 현재 시각보다 미래인지(미만료) 확인.
  3. 위 둘 다 통과해야 `true`.
- **Edge 호환**: `crypto.subtle.importKey`(`HMAC`, `SHA-256`) + `crypto.subtle.sign`/(constant-time 비교). `TextEncoder`/`Uint8Array` 만 사용. **Node `Buffer` 금지**(base64url 은 직접 구현 또는 Edge 호환 헬퍼).
- **시크릿 부재 가드**: `APP_AUTH_SECRET` 미설정 시 서명·검증 모두 안전 실패(서명 발급 거부, 검증 false). 게이트가 활성(`APP_PASSWORD` 설정)인데 `APP_AUTH_SECRET` 만 빠진 구성은 부팅/요청 시 명시적 에러 로그(둘은 한 쌍).
- **상수**: 쿠키 이름·maxAge 등은 `lib/auth/constants.ts`(또는 `session.ts` 상단 상수)에 한 곳. 쿠키 이름 인라인 문자열 산재 금지.

### 3.3 인증 route handler — `app/api/auth/login` + `app/api/auth/logout`

- **`POST /api/auth/login`**:
  - body: `{ password: string }`(JSON).
  - `process.env.APP_PASSWORD` 와 **constant-time 비교**(타이밍 공격 방지 — 길이 차이로 조기 반환하지 않음. Web Crypto digest 비교 또는 길이 패딩 후 바이트 XOR 누적).
  - 일치 → `signSession(...)` 으로 토큰 생성 → `Set-Cookie` 로 세션 쿠키 발급: `httpOnly`, `secure`(프로덕션), `sameSite=lax`, `path=/`, `maxAge`(**30일, q2 RESOLVED**). 응답 `{ ok: true }`.
  - 불일치 → **실패 응답 전 ~500ms 고정 지연**(q3 RESOLVED) 후 **401** + `{ error: "invalid_password" }`(에러 메시지에 **비밀번호 값/힌트 노출 금지**). 재시도 가능. **in-memory 카운터·계정 잠금(lockout) 은 비범위**(서버리스 인스턴스 분산으로 카운트 신뢰 불가 → 자기 잠금 회귀도 회피). 강한 방어는 외부 rate-limit 후속 PRD.
  - `APP_PASSWORD` 미설정(게이트 비활성, q1 RESOLVED) → 이 엔드포인트는 **409**(`{ error: "gate_disabled" }`) 또는 no-op(쿠키 미발급) — 로그인 불필요 상태임을 명확히. 미설정 시 `/login` 자체가 게이트 없이 열리지만 제출은 게이트 비활성을 안내.
  - **로깅 0**: 비밀번호·시크릿·토큰을 로그/에러에 절대 출력하지 않는다.
- **`POST /api/auth/logout`**(또는 GET):
  - 세션 쿠키를 **삭제**(`Set-Cookie` maxAge=0 / expires 과거). 응답 후 `/login` 으로 가게 하거나 `{ ok: true }` 반환(리다이렉트는 클라가).
- 두 route 는 **`/api/auth/*` 예외**라 게이트를 통과해야 한다(미인증 상태에서 login 호출 가능).
- 런타임: route handler 는 기본 Node 런타임이어도 무방(Edge 강제 아님). 단 서명 유틸은 Edge 호환으로 작성되어 middleware·route 양쪽에서 공유.

### 3.4 로그인 화면 — `/login`(UI 포함, 디자이너 미합류 수준)

- 라우트 위치: **`app/login/page.tsx`**(라우트 그룹 `(main)` 밖 — 글로벌 셸 미적용 풀스크린). `app/(main)/layout.tsx`(Sidebar/Header/BottomNav)를 상속하지 않도록 그룹 외부에 둔다.
- 구성(미니멀):
  - 중앙 정렬 `.card` 한 장(또는 단순 컨테이너) — 서비스명("FinSight") + 짧은 안내 문구 1줄.
  - 비밀번호 `<input type="password" className="input" />` + `.input-label` + 제출 `.button-primary`.
  - 실패 시 `.input-error` + `.input-helper-error`(예: "비밀번호가 올바르지 않습니다") — **구체적 사유/힌트 노출 금지**.
  - 제출 → `/api/auth/login` 호출 → 성공 시 `next`(쿼리, same-origin 검증됨) 또는 `/` 로 이동.
- **커스텀훅 의무**: 폼 제출은 `hooks/auth/useLoginForm.ts`(도메인 훅)로 추상화. 컴포넌트는 TanStack Query `useMutation` 을 직접 import 하지 않는다. 페칭 훅이 필요하면 `hooks/query/useMutationLogin.ts`(`useMutation~` 프리픽스) → `hooks/auth/useLoginForm` 가 호출, 컴포넌트는 `submit`/`isPending`/`error` 만 본다. (단순 `fetch` 1콜이라 mutation 없이 도메인 훅 내부 `useState` 만으로 처리해도 무방 — 단 컴포넌트는 도메인 훅만 import.)
- **카피**: 사용자 노출 한글 카피는 `lib/copy/auth/*.ts` 로 분리(frontend.md `lib/copy/<domain>/` 룰). 화면에 한글 평문 산재 금지.
- **반응형**: Tailwind prefix(`sm:`/`md:`)로 처리(카드 max-width·padding). JS 분기 불필요.
- 신규 디자인 토큰 0 — 기존 합성 클래스만. **디자이너 합류 트리거 아님**(q4 RESOLVED — 미니멀 확정, 디자이너 미합류).

### 3.5 env 템플릿 + 문서

- `.env.example`(commit 됨)에 두 키 추가 + 주석:
  - `APP_PASSWORD=`(빈 값 = 게이트 **비활성**. **프로덕션 필수** — q1 RESOLVED). 주석에 **16자 이상 랜덤 권고**(q3 RESOLVED — 카운터/잠금 없이 길이로 온라인 브루트포스 실효성 차단), 예: `openssl rand -base64 24`.
  - `APP_AUTH_SECRET=`(랜덤 긴 문자열, 예: `openssl rand -hex 32`. 비밀번호와 한 쌍).
  - `NEXT_PUBLIC_` 금지·브라우저 노출 0 명시(KIS 키와 동일 취급).
- 운영 가이드(README 또는 PR 본문 `## 다음 작업` 인접): Vercel Project Settings 에 두 키 등록, 시크릿 회전 절차(시크릿 변경 시 전체 세션 무효화됨 — 의도된 동작) 한 줄.

### 3.6 axios 401 처리 정합 (q5 RESOLVED — 동일 PR 포함, 확정)

- `lib/api/client.ts` 응답 인터셉터에 **401 → `/login` 매핑**(`ApiError("unauthorized")` 추가 + 브라우저 환경에서 `/login?next=<현재경로>` 로 유도). 세션이 만료되어 `/api/*` 가 401 을 주면(인증된 SPA 가 만료된 쿠키로 호출) 클라이언트가 **자동으로 `/login` 으로 보낸다**(데이터 카드가 무한 에러 상태로 남지 않게).
- 구현 주의: (a) 리다이렉트는 **브라우저 환경에서만**(`typeof window !== "undefined"`) — SSR/RSC 경로에서 `window.location` 접근 금지. (b) 이미 `/login` 이거나 인증 API(`/api/auth/*`) 호출의 401 은 **리다이렉트 제외**(로그인 실패 401 이 게이트 리다이렉트로 오인되지 않게 — 무한 루프 가드). (c) **본 PRD 핵심 동작(미인증 시 페이지 리다이렉트)은 여전히 middleware 가 책임** — 401 매핑은 SPA 내비게이션 중 만료를 부드럽게 처리하는 보강.

---

## 4. 비범위 (Out of Scope) — 명시적 제외

- **다중 사용자/계정·역할(RBAC)**: 본 게이트는 **단일 공유 비밀번호** 전부-or-전무. 사용자별 계정·권한·세션 관리는 비범위(향후 Supabase 인증 트랙에서).
- **OAuth/SSO·이메일 매직링크·2FA**: 비범위.
- **세션 서버 저장소(DB/Redis 세션 테이블)**: stateless 서명 쿠키만. 서버측 세션 무효화 목록(블랙리스트)은 비범위 — 강제 로그아웃은 `APP_AUTH_SECRET` 회전으로 전체 무효화하는 방식(개별 세션 폐기 불가).
- **Vercel 플랫폼 보호(Deployment Protection) 설정 변경**: 본 PRD 는 앱 자체 게이트만. Vercel 측 보호 토글은 비범위.
- **CAPTCHA·고급 브루트포스 방어·계정 잠금(lockout)·in-memory 실패 카운터**: 본 PRD 는 실패 응답 전 **~500ms 고정 지연만**(q3 RESOLVED). 분산 rate-limit·CAPTCHA·카운터 기반 잠금은 **비범위**(서버리스 분산으로 카운트 신뢰 불가 + 자기 잠금 회귀 회피). 강한 방어는 외부 저장소(Upstash 등) 기반 후속 PRD.
- **로그인 화면 브랜딩 디자인(디자이너 합류)**: 미니멀 폼만. 일러스트·애니메이션·브랜드 풀디자인은 비범위(트리거 시 별도 PRD).
- **`/api/*` 외부 머신 클라이언트용 API 키 인증**: 본 게이트는 브라우저 세션 쿠키 기반. 헤더 토큰/API 키 발급은 비범위.
- **비밀번호 변경 UI**: 비밀번호는 env(`APP_PASSWORD`) 로만 변경(재배포). 앱 내 변경 화면 비범위.

---

## 5. 수용 기준 (AC) — 검증 가능

> 명령 단위로 재현 가능하게 기술. `<로컬>` 은 `npm run dev` 기동 후 가정.

### 5.1 게이트·리다이렉트
- **AC-1**: `middleware.ts` 가 저장소 루트에 존재한다 — `find . -maxdepth 1 -name "middleware.ts"` 1건.
- **AC-2**: `APP_PASSWORD` 설정 + 쿠키 없는 상태에서 페이지 요청 시 `/login?next=<원경로>` 로 307 리다이렉트된다 — `curl -sI -b "" "<로컬>/dashboard"` → `location: /login?next=%2Fdashboard`(또는 동등). open-redirect 차단: `?next=//evil.com` 또는 `?next=https://evil.com` 으로 로그인 성공해도 외부로 안 나가고 `/` 로 폴백.
- **AC-3**(q5): `APP_PASSWORD` 설정 + 쿠키 없는 상태에서 **`/api/*` 전부**(`/api/market/ticker`, `/api/stock/*`, `/api/disclosure/*`, `/api/watchlist`, `/api/whitelist/search`, `/api/workbench/analyze` 등) 직접 호출 시 **401 JSON**(리다이렉트 아님) — `curl -si "<로컬>/api/market/ticker"` → `HTTP/.. 401` + `{"error":"unauthorized"}`. **단 `/api/auth/login`·`/api/auth/logout` 은 401 아님**(게이트 예외 — 미인증 로그인 가능).
- **AC-4**: 게이트 예외 경로는 인증 없이 200/정상 — `/login`(페이지), `/api/auth/login`(메서드 허용), `/icon`(favicon), `/_next/static/*`, `/fonts/*` 가 401·리다이렉트되지 않는다.

### 5.2 인증 흐름·쿠키
- **AC-5**(q2): `POST /api/auth/login` 에 올바른 비밀번호 → 200 + `Set-Cookie` 에 세션 쿠키(`HttpOnly`, `SameSite=Lax`, `Path=/`, 프로덕션에서 `Secure`, **`Max-Age=2592000`=30일**). 잘못된 비밀번호 → **401** + 응답 본문에 **비밀번호 값/힌트 미포함**(`grep -i` 로 password 평문 0).
- **AC-6**: 로그인 성공 후 발급된 쿠키로 `/dashboard`·`/api/market/ticker` 접근 시 통과(200) + `/login` 으로 안 튕긴다.
- **AC-7**: `POST /api/auth/logout` → 세션 쿠키 삭제(`Set-Cookie` `Max-Age=0`). 이후 보호 경로 접근 시 다시 `/login` 으로 리다이렉트.
- **AC-8**(q2): 만료의 단일 진실은 **서명된 payload `exp`** — 과거 `exp` 토큰(쿠키 maxAge 가 아직 남아 있어도)으로 접근 시 서버가 미인증 취급 → 재로그인 요구. 위조 토큰(`sig` 변조)도 거부. `verifySession` 이 서명 검증 후 반드시 `exp > now` 를 본다(쿠키 maxAge 만 신뢰 금지).

### 5.3 보안·비노출
- **AC-9**: 클라이언트 번들·소스에 `NEXT_PUBLIC_APP_PASSWORD`/`NEXT_PUBLIC_APP_AUTH_SECRET` 부재 — `git grep -nE "NEXT_PUBLIC_APP_(PASSWORD|AUTH_SECRET)"` 0건. 빌드 후 `grep -r "<실제 시크릿값>" .next/static` 0건(수동 1회).
- **AC-10**: 서명/검증이 **Edge 호환**(Node `crypto`/`Buffer` 미사용) — `git grep -nE "from \"crypto\"|require\\('crypto'\\)|Buffer\\." lib/auth middleware.ts` 0건(Web Crypto `crypto.subtle` 만).
- **AC-11**: 비밀번호 비교가 **constant-time** 경로를 사용(early-return on length mismatch 없음) — 코드 리뷰 + `lib/auth/session.ts`(또는 비교 유틸)에 constant-time 주석/구현 확인.
- **AC-12**: 비밀번호·시크릿·토큰이 로그에 출력되지 않는다 — `git grep -nE "console\\.(log|error).*(APP_PASSWORD|APP_AUTH_SECRET|password)" app lib middleware.ts` 0건(실값 로깅 없음).

### 5.4 게이트 off·회귀
- **AC-13**(q1): `APP_PASSWORD` **미설정** 시 게이트 비활성 — 쿠키 없이 `/dashboard`·`/api/market/ticker` 200(기존 동작 유지). 로컬 `npm run dev`(키 미설정) 가 로그인 없이 그대로 뜬다. `NODE_ENV=production` + `APP_PASSWORD` 미설정 시 **경고 로그 1회**(모듈 로드 시점, 요청마다 반복 금지) — 로그에 비밀번호 값 노출 0.
- **AC-14**: 인증된 브라우저에서 기존 화면·BFF 정상 동작(회귀 0) — dashboard/market/watchlist/profile 의 데이터 카드가 쿠키 자동 전송으로 정상 로딩.
- **AC-15**: `npm run typecheck` / `npm run lint` / `npm run build` / `npm run test` 0 에러. 신규 디자인 토큰 0(`git diff` 상 `tailwind.theme.json` 변경 없음).

### 5.5 컨벤션
- **AC-16**: `/login` 폼 컴포넌트가 TanStack Query 훅을 **직접 import 하지 않는다** — `git grep -nE "useMutation|useQuery" app/login` 0건(도메인 훅 `hooks/auth/*` 경유).
- **AC-17**: 사용자 노출 한글 카피가 `lib/copy/auth/` 로 분리 — 로그인 화면 `.tsx` 에 한글 평문 카피 산재 0(카피 키 참조).
- **AC-18**: `/login` 이 라우트 그룹 `(main)` 밖에 있어 글로벌 셸(Sidebar/Header/BottomNav)을 상속하지 않는다 — `find app/login -name page.tsx` 1건, `app/(main)/` 내부 아님.

### 5.6 브루트포스 지연·401 매핑 (q3·q5)
- **AC-19**(q3): 잘못된 비밀번호로 `POST /api/auth/login` 호출 시 **응답이 ~500ms 이상 지연**된 뒤 401 이 온다 — `curl -s -w "%{time_total}\n" -o /dev/null -X POST -d '{"password":"wrong"}' "<로컬>/api/auth/login"` 의 `time_total` 이 ~0.5s 이상. **in-memory 카운터/계정 잠금 코드는 부재**(N회 연속 실패해도 동일 비밀번호로 즉시 성공 가능 — 자기 잠금 회귀 0) — `git grep -niE "lockout|attempt.?count|failedAttempts|rate.?limit" app/api/auth lib/auth` 0건.
- **AC-20**(q5): `lib/api/client.ts` 응답 인터셉터가 **401 → `/login` 유도** 매핑을 가진다 — `git grep -nE "401" lib/api/client.ts` 1건 이상 + 브라우저 환경 가드(`typeof window`)·`/api/auth/*` 제외·이미 `/login` 이면 제외(무한 루프 가드)가 코드에 존재. 세션 만료 상태(만료 쿠키)로 SPA 가 `/api/*` 호출 시 클라이언트가 `/login` 으로 보낸다(데이터 카드가 무한 에러로 남지 않음).

---

## 6. 가정 · 제약

- **선행 전제**: 현재 main(`stock-api-integration` 시리즈 종료 후). `middleware.ts` 부재·`app/(main)/` 그룹 구조·v8 토큰·single-axios 가정은 1.2 조사로 확정.
- **Vercel 연동 가정**: 프로덕션 도메인 존재(`trading-signal-frontend.vercel.app`). 환경변수는 Vercel Project Settings 에 등록(로컬은 `.env.local`). MEMORY `project_vercel-deferred` 종료 가정.
- **Edge 런타임 제약**: middleware 는 Edge — Node API 미사용, Web Crypto(`crypto.subtle`)만. Next 16 의 `middleware.ts` + `config.matcher` 컨벤션 채택. `NextResponse.redirect`/`NextResponse.next`/`NextResponse.json` 사용.
- **서버리스 제약**: in-memory rate-limit 카운터는 인스턴스 분산으로 불완전 — 정확한 카운트는 외부 저장소 필요(비범위). **~500ms 고정 지연만 채택, 카운터/잠금 비범위 확정**(§9 q3 RESOLVED).
- **stateless 세션**: 서명 쿠키만(서버 세션 저장소 없음). 강제 전체 로그아웃 = `APP_AUTH_SECRET` 회전(개별 세션 폐기 불가). 이는 단일 공유 비밀번호 모델에서 수용 가능한 트레이드오프.
- **`secure` 쿠키**: 프로덕션(HTTPS)에서 `Secure`. 로컬 `http://localhost` 에서는 `Secure` 면 브라우저가 거부할 수 있어 **개발 환경에선 조건부 비활성**(`NODE_ENV !== "production"` 또는 요청 프로토콜 기준).
- **도구 가정**: `npm run typecheck/lint/build/test` 가 게이트. `git grep`/`find`/`curl` 로 AC 재현.

---

## 7. 참고

- 인접 코드:
  - `app/(main)/layout.tsx`(글로벌 셸 — `/login` 은 이를 상속하지 않게 그룹 밖), `app/layout.tsx`(root, 폰트/Providers), `app/providers.tsx`(QueryClient).
  - `app/icon.tsx`(favicon `/icon` 경로 — middleware 예외 대상), `public/fonts/`(공개 에셋 예외).
  - `app/api/market/ticker/route.ts` 외 BFF 10종(게이트 뒤에서 정상 동작 검증 대상).
  - `lib/api/client.ts`(axios 인터셉터 — 401 매핑 선택 §3.6).
  - `app/components.css`(합성 클래스 `.input`/`.input-error`/`.input-label`/`.input-helper-error`/`.button-primary`/`.card` — 로그인 폼 재사용).
- 룰·문서: `AGENTS.md`(라벨 흐름·BFF 원칙·도메인 폴더), `docs/rules/frontend.md`(8개 절 — 네이밍/커스텀훅/도메인 한 뎁스/cn/layout/copy/queryKeys/반응형).
- 외부: Next.js Middleware(Edge) + `config.matcher` 문서, MDN Web Crypto `SubtleCrypto.sign`/`importKey`(HMAC-SHA256), `sameSite=lax`/`httpOnly`/`secure` 쿠키 속성.

---

## 8. 영향 분석

### 8.1 변경 범위 추정 (신규 위주, 라인 추정)
| 파일 | 신규/수정 | 추정 라인 | 비고 |
|---|---|---|---|
| `middleware.ts`(루트) | 신규 | ~60-90 | matcher + 예외 + 쿠키 검증 분기(페이지 리다이렉트 / API 401) |
| `lib/auth/session.ts` | 신규 | ~70-110 | Web Crypto HMAC 서명/검증 + base64url + constant-time 비교 + 만료 |
| `lib/auth/constants.ts` | 신규 | ~10-20 | 쿠키 이름·maxAge·예외 경로 상수 |
| `app/api/auth/login/route.ts` | 신규 | ~40-60 | constant-time 비교 + Set-Cookie 발급 |
| `app/api/auth/logout/route.ts` | 신규 | ~15-25 | 쿠키 삭제 |
| `app/login/page.tsx` | 신규 | ~50-80 | 미니멀 폼 + next 복귀 |
| `hooks/auth/useLoginForm.ts` | 신규 | ~30-50 | 도메인 훅(제출/에러/pending) |
| `hooks/query/useMutationLogin.ts` | 신규(선택) | ~20-30 | mutation 채택 시 |
| `lib/api/auth/login.ts` | 신규(선택) | ~15-25 | 로그인 호출 어댑터 |
| `lib/copy/auth/*.ts` | 신규 | ~15-25 | 화면 카피 |
| `.env.example` | 수정 | ~6-10 | 두 키 + 주석 |
| `lib/api/client.ts` | 수정(§3.6, q5 확정) | ~8-15 | 401 → `/login` 매핑 + 브라우저 가드 + `/api/auth/*`·`/login` 제외 |

총합 추정 ~330-510 라인(신규 위주, 기존 파일 수정 최소).

### 8.2 단일 PR 유지 판단
- **단일 PR 권장.** 디자이너 의존 없음(UI 경미·미니멀). 변경량 중간(~400 라인), 신규 파일 위주로 회귀 표면 작음. 한 흐름(middleware ↔ 서명유틸 ↔ login route ↔ 화면)이 강결합이라 분할 시 중간 상태가 보안 게이트로서 불완전(예: middleware 만 머지되면 로그인 화면 없이 잠김). **한 브랜치 한 PR 룰 복귀** 정책과도 정합.

### 8.3 커밋 분할 권고(한 PR 내부)
1. `feat(auth): Web Crypto 세션 서명/검증 유틸 + 상수`(`lib/auth/`).
2. `feat(auth): 로그인/로그아웃 route handler (constant-time 비교 + 쿠키 발급)`.
3. `feat(auth): 루트 middleware 게이트 (페이지 리다이렉트 / API 401 + 예외)`.
4. `feat(auth): /login 미니멀 폼 + 도메인 훅 + 카피`.
5. `chore(env): APP_PASSWORD/APP_AUTH_SECRET 템플릿 + 문서`.
6. `feat(api): axios 401 → /login 매핑`(q5 확정 — 동일 PR).
- 첫 commit 으로 `docs(prd): app-password-gate`(본 PRD)를 `feature/app-password-gate` 브랜치에 올린다(한 브랜치 한 PR 룰 — docs-only PR 미생성).

### 8.4 회귀 위험
- **(높음) 자기 자신 잠금(lockout)** — 두 경로:
  - **matcher/예외 오류**: `/login`·인증 API(`/api/auth/*`)·정적 자원까지 막히면 무한 리다이렉트·로그인 불가. → 예외 화이트리스트 **재확인**(AC-4) + **무한 리다이렉트 루프 가드**(미인증이어도 경로가 이미 `/login` 이면 통과 — §3.1) + axios 401 매핑의 `/login`·`/api/auth/*` 제외(§3.6, AC-20).
  - **실패 카운터/잠금 도입 시 자기 잠금**: q3 RESOLVED 로 **카운터/잠금 코드를 아예 두지 않는다**(서버리스 분산으로 신뢰도 안 되고, 정당 사용자가 자기 자신을 잠그는 회귀를 원천 차단). 지연만(~500ms). AC-19 grep 으로 카운터 부재 검증.
- **(높음) 시크릿 브라우저 노출**: `NEXT_PUBLIC_` 오타로 노출 시 비밀번호 우회. → AC-9 grep 게이트.
- **(중간) BFF 차단으로 화면 깨짐**: 인증 쿠키 전송 누락 시 모든 카드가 401. → axios 는 same-origin 이라 쿠키 자동 전송(검증 AC-14). SSR/RSC 측 서버 fetch 가 있으면 쿠키 forward 필요 여부 점검(현재 BFF 는 클라 axios 경유라 영향 적음).
- **(중간) Edge 비호환 API**: Node `crypto`/`Buffer` 혼입 시 middleware 런타임 에러. → AC-10 grep + build.
- **(낮음) 로컬/CI 깨짐**: 게이트가 키 미설정 시에도 켜지면 로컬 전부 잠김. → §9 q1 RESOLVED(미설정=비활성) + AC-13.
- **(낮음) `Secure` 쿠키 로컬 거부**: localhost http 에서 Secure 쿠키 미저장 → 로그인 루프. → 개발 환경 조건부 Secure(§6).

---

## 9. OPEN QUESTION → 전부 RESOLVED (2026-05-30)

> 5건 전부 **사용자 결정 완료**(2026-05-30) — PM 권고 전부 채택. 본문(§0/§3/§5/§8)에 반영 완료.

- **[RESOLVED] q1 — `APP_PASSWORD` 미설정 시 게이트 동작 → 비활성(앱 공개)** (2026-05-30, PM 권고 채택).
  - **결정**: 미설정 시 게이트 **비활성**(앱 전체 공개). (a) `.env.example` 에 **"프로덕션 필수"** 명시, (b) 프로덕션(`NODE_ENV=production`)에서 미설정 시 **경고 로그 1회**(요청 처리 시 1회, 스팸 방지)로 운영자가 인지.
  - **반영**: §0 게이트 on/off 행, §2 목표 5, §3.1(게이트 활성 조건)·§3.3(로그인 엔드포인트 게이트 비활성 시 동작)·§3.5(env 템플릿), §5 AC-13, §8.4 회귀(낮음) 확정.
- **[RESOLVED] q2 — 세션 쿠키 수명(maxAge) → 30일** (2026-05-30, PM 권고 채택).
  - **결정**: 쿠키 `maxAge` **30일**. 단, `exp` 는 토큰 payload 에 박아 **서버 검증**(쿠키 maxAge 만 신뢰하지 않음 — 쿠키는 클라가 변조 가능하므로 만료의 단일 진실은 서명된 `exp`).
  - **반영**: §0(env/보안 인접), §3.2(payload `exp`)·§3.3(`maxAge` 30일), §5 AC-5·AC-8, §6(상수) 확정.
- **[RESOLVED] q3 — 로그인 실패 rate-limit → ~500ms 고정 지연만(카운터/잠금 비범위)** (2026-05-30, PM 권고 채택).
  - **결정**: 실패 응답 전 **~500ms 고정 지연만** MVP 포함. in-memory 카운터·계정 잠금(lockout)은 **비범위**(서버리스 분산으로 카운트 신뢰 불가). 비밀번호 **16+ 랜덤** 권고를 `.env.example`·운영 가이드에 명시.
  - **반영**: §3.3(고정 지연·카운터 비범위 확정)·§3.5(16+ 권고), §4 비범위(분산 rate-limit/잠금), §5 AC-19(신규, 지연), §6(서버리스 제약) 확정.
- **[RESOLVED] q4 — 로그인 화면 디자인 범위 → 미니멀(디자이너 미합류)** (2026-05-30, PM 권고 채택).
  - **결정**: **미니멀** 폼. 기존 v8 토큰·합성 클래스만, 신규 디자인 토큰 0. **디자이너 합류 트리거 아님**. 브랜딩 욕구 발생 시 별도 PRD.
  - **반영**: 헤더 UI 표기·§0 UI 행, §3.4(미니멀 확정), §5 AC-15(토큰 0)·AC-16~18, §8.2 확정.
- **[RESOLVED] q5 — `/api/*` 전부 게이트(인증 API 제외) + axios 401→`/login` 매핑 동일 PR 포함** (2026-05-30, PM 권고 채택).
  - **결정**: `/api/*` **전부 게이트**(인증 API `/api/auth/*` 만 예외). axios **401 → `/login` 매핑**(`lib/api/client.ts` 인터셉터)을 **동일 PR 에 포함**(선택 아님 — 확정). 세션 만료 시 클라가 자동으로 `/login` 으로 유도.
  - **반영**: §3.1(API 전부 보호 확정)·§3.6(선택 → 확정), §5 AC-3·AC-20(신규, 401→리다이렉트), §8.1(표에서 "선택" 제거), §8.3 커밋 6 확정.

> 참고(비-OPEN, 결정 불요): 쿠키 이름은 `app_auth`(또는 유사) 한 곳 상수. 서명 알고리즘은 HMAC-SHA256 고정(요구사항). base64url 은 Edge 호환 직접 구현(Node `Buffer` 미사용).
> **다음 단계**: 구현(frontend only — 디자이너 미합류). **단일 PR**(한 브랜치 한 PR 룰 — stock-api-integration 시리즈 종료, 단일 PR 룰 복귀). 첫 commit 으로 본 PRD 를 `feature/app-password-gate` 브랜치에 올린다.
