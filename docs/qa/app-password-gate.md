# QA 리포트 — app-password-gate (앱 전체 단일 공유 비밀번호 게이트)

> PRD: [`docs/prd/app-password-gate.md`](../prd/app-password-gate.md) · PR #48 (`feature/app-password-gate`)
> 검증일: 2026-05-30 · ⚠️ 보안 기능 — 게이트 우회/자기 잠금/시크릿 노출을 blocking 으로 취급.

## 판정: **PASS** — 20/20 AC 통과

| 안전 항목 | 결과 |
|---|---|
| **lockout(자기 잠금) 위험** | 안전 — 카운터/잠금 코드 부재. 5회 연속 오답 후에도 정답 즉시 200. 예외 경로(`/login`·`/api/auth/*`·정적)는 쿠키 없이 통과, `/login` 무한 루프 가드 동작. |
| **시크릿 노출** | 안전 — `NEXT_PUBLIC_` 0건. 빌드 산출물(`.next/static`·`.next/server`)에 실제 비밀번호/시크릿 문자열 0건. 로그인 페이지 HTML 에 노출 0. |
| **게이트 우회 가능 여부** | 불가 — 위조 서명·만료 토큰·타 시크릿 서명·변조 payload·garbage 쿠키 전부 거부. 모든 `/api/*`(인증 API 제외) 쿠키 없이 401. |

검증 환경: `feature/app-password-gate` checkout. 게이트 활성 테스트는 `.env.local` 에 임시 `APP_PASSWORD`/`APP_AUTH_SECRET` 설정 후 `npm run dev`(localhost:3000) 로 재현, 검증 후 원복(QA temp 키 제거 확인 완료). 빌드 산출물 grep 은 임시 시크릿값으로 별도 build 후 확인.

---

## 1. AC 별 검증표

| AC | 내용 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | `middleware.ts` 루트 존재 | `find . -maxdepth 1 -name middleware.ts` | 1건 | `./middleware.ts` | PASS |
| AC-2 | 미인증 페이지 → `/login?next=` 307 + open-redirect 차단 | `curl -sI -b "" /dashboard` | `307` + `location: /login?next=%2Fdashboard` | 정확히 일치. `safeNextPath` 로 `//evil.com`→`/`, `https://evil.com`→`/`, 정상 경로·쿼리 보존 | PASS |
| AC-3 | 미인증 `/api/*` → 401 JSON (auth API 예외) | `curl -si -b "" /api/<...>` | `401` + `{"error":"unauthorized"}`, auth 는 401 아님 | ticker/indices/stock/watchlist/whitelist/workbench 전부 `401 {"error":"unauthorized"}`. `/api/auth/login`(오답)=401 invalid_password(게이트 아님), `/api/auth/logout`=200 | PASS |
| AC-4 | 예외 경로 쿠키 없이 통과 | `curl -b "" /login`·`/icon`·`/_next/static/...`·`/api/auth/login` | 200/405 (401·리다이렉트 X) | `/login` 200, `/icon` 200, `/_next/static` chunk 200, `/api/auth/login` GET 405(method, 게이트 아님) | PASS |
| AC-5 | 정답 → 200 + 보안 쿠키 (오답 → 401, 비번 미노출) | `POST /api/auth/login` | `Max-Age=2592000` `HttpOnly` `SameSite=Lax` `Path=/`, prod 시 `Secure` | `set-cookie: app_auth=...; Path=/; Max-Age=2592000; HttpOnly; SameSite=lax` (dev 라 Secure 없음 = localhost http 정합 §6). 오답 → 401 `invalid_password`, 응답에 입력 비번 미포함 | PASS |
| AC-6 | 유효 쿠키 → 페이지·API 200 (리다이렉트 X) | `curl -b <cookie> /dashboard`·`/api/market/ticker` | 200, no redirect | `/dashboard` 200 no-location, `/api/market/ticker?ticker=AAPL` 200 (BE 데이터 응답) | PASS |
| AC-7 | logout → 쿠키 삭제 후 재리다이렉트 | `POST /api/auth/logout` → `/dashboard` | `Max-Age=0` 후 307 `/login` | `set-cookie: app_auth=; Max-Age=0; HttpOnly; SameSite=lax`. 이후 `/dashboard` 307 `/login?next=%2Fdashboard` | PASS |
| AC-8 | 위조·만료·타 시크릿 토큰 거부 (exp 서버 검증) | 변조/만료/타시크릿 쿠키로 접근 | 전부 미인증(307/401) | 위조 sig→307·401, 변조 payload(exp 연장+구 sig)→307, garbage/empty/no-dot→307, **valid-sig 만료(exp 과거)→307·401**, **타 시크릿 서명→307**, 정상 토큰→200 | PASS |
| AC-9 | 시크릿 클라 비노출 | `git grep NEXT_PUBLIC_APP_*` + 빌드 산출물 grep | 0건 | 소스 0건(app/components/lib). 임시 시크릿값으로 build 후 `.next/static`·`.next/server` 인라인 0건. 로그인 HTML 노출 0 | PASS |
| AC-10 | Edge 호환 (Node crypto/Buffer 미사용) | `git grep "from crypto"/Buffer.` lib/auth middleware.ts | 0건 | 0건 — `crypto.subtle`/`TextEncoder`/`atob`/`btoa` 만 | PASS |
| AC-11 | constant-time 비교 | 코드 리뷰 `lib/auth/password.ts`·`session.ts` | early-return 없음 | XOR 누적 over `max(len)`, 길이 불일치도 초기 diff 에 반영, 첫 불일치에서 끊지 않음. 비번 테스트(같은/짧은/긴/빈 길이 전부 false) 통과 | PASS |
| AC-12 | 비번/시크릿/토큰 로깅 0 | `git grep console.* (APP_PASSWORD\|secret\|password)` | 0건 | 0건 — 실값 로깅 없음. `server_misconfigured` 에러 로그도 값 미포함 | PASS |
| AC-13 | 미설정 시 게이트 비활성 | `.env.local` 키 제거 후 dev | 쿠키 없이 200, auth/login 409 | `/dashboard`·`/api/market/ticker`·`/market`·`/watchlist` 전부 200 no-redirect. `/api/auth/login`→409 `gate_disabled` | PASS |
| AC-14 | 게이트 활성 + 로그인 후 기존 화면 회귀 0 | 유효 쿠키로 전 라우트 | 200 | `/`(308→200)·`/dashboard`·`/market`·`/watchlist`·`/analyze`·`/profile`·`/profile/AAPL` 전부 200 | PASS |
| AC-15 | typecheck/lint/build/test 0 + 토큰 0 | 4 명령 | 0 에러 | typecheck 0, lint 0, build 성공(/login static·auth route·Proxy 등록), test 149 passed(26 files). `tailwind.theme.json`·design 변경 0 | PASS |
| AC-16 | 로그인 폼 TanStack 직접 import 0 | `git grep useMutation\|useQuery app/login` | 0건 | 0건 — 도메인 훅 `hooks/auth/useLogin` 경유 | PASS |
| AC-17 | 한글 카피 `lib/copy/auth/` 분리 | `grep 한글 app/login/*.tsx` | 평문 0 (주석 제외) | JSX 한글 평문 0. 카피 키 6종 `lib/copy/auth/login.ts` 참조 | PASS |
| AC-18 | `/login` 이 `(main)` 밖 + 셸 미상속 | `find app/login`·HTML nav 점검 | 1건, (main) 아님 | `app/login/page.tsx` 존재, `app/(main)/` 내부 아님. 렌더 HTML 에 Sidebar/Header/BottomNav nav 0 | PASS |
| AC-19 | 오답 ~500ms 지연 + 카운터/잠금 부재 | `curl -w time_total` × 반복 | ≥0.5s, 정답 빠름, 잠금 없음 | 오답 0.512~0.514s ×3, 정답 0.010s. **5회 오답 후 정답 즉시 200(자기 잠금 0)**. lockout 코드 grep 0(주석만) | PASS |
| AC-20 | axios 401 → `/login` 매핑 (루프 가드) | `git grep 401 client.ts` + 코드/테스트 | 가드 3중 | `status===401` → `unauthorized` + `redirectToLogin`. 가드: (a)`typeof window`, (b)이미 `/login` 제외, (c)`/auth/login`·`/auth/logout` 제외. client.test 401→unauthorized·SSR no-throw·5xx→server 통과 | PASS |

---

## 2. 자동화 명령 출력 (요약)

```
$ npm run typecheck        → 0 에러 (tsc --noEmit)
$ npm run lint             → 0 에러 (eslint .)
$ npm run test             → Test Files 26 passed (26) / Tests 149 passed (149)
                             신규: middleware(16) · login route(6) · session(8) · password(6) · client 401(3)
$ npm run build            → 성공. /login(static) · /api/auth/login·logout(ƒ) · Proxy(Middleware) 등록
```

빌드 후 시크릿 비노출(AC-9 수동):
```
$ APP_PASSWORD=<temp> APP_AUTH_SECRET=<temp> npm run build
$ grep -rl "<temp pw>"  .next/static   → 0건
$ grep -rl "<temp sec>" .next/static   → 0건
$ grep -rq "<temp pw>"  .next/server   → 0건 (런타임 env 만, 인라인 0)
```

BFF 원칙 무회귀: `git grep "http://127.0.0.1" -- app/` → 기존 route handler fallback(`?? "http://127.0.0.1:8000"`) 3건만, 신규 위반 0.

---

## 3. 보안 에지 케이스 (별도 절)

| 시나리오 | 입력 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 위조 서명 | sig 앞부분 변조 토큰 | 거부 | 페이지 307 / API 401 | PASS |
| 변조 payload | exp 9999999999 + 구 sig | 거부 (HMAC 불일치) | 307 | PASS |
| **만료 토큰** | valid-sig + exp 과거(실 시크릿 서명) | 거부 (exp 서버 검증) | 307·401 — 쿠키 maxAge 아닌 payload `exp` 가 단일 진실 | PASS |
| **타 시크릿 서명** | attacker secret 으로 HMAC | 거부 | 307 — 시크릿 모르면 위조 불가 | PASS |
| garbage 쿠키 | `not.a.valid.token`·`abcdef`·빈값 | 거부 | 전부 307 | PASS |
| 빈 body 로그인 | `POST` no body | 401 (500 X) | `{"error":"invalid_password"}` 401 | PASS |
| malformed JSON | `{bad json` | 401 (crash X) | 401 invalid_password | PASS |
| no Content-Type | raw string | 401 | 401 | PASS |
| password 비-문자열 | `{"password":12345}` | 401 | 401 (string narrowing) | PASS |
| 필드 누락 | `{"pass":"x"}` | 401 | 401 | PASS |
| open-redirect (페이지) | `next=//evil.com`·`https://evil.com` | `/` 폴백 | `safeNextPath`/`safeNext` 양쪽 `/` 반환 | PASS |
| **자기 잠금(lockout)** | 오답 5회 → 정답 | 정답 즉시 성공 | 200 — 카운터/잠금 부재 확인 | PASS |
| **무한 리다이렉트 루프** | 미인증 + `/login` | 통과(재리다이렉트 X) | `/login` 200 no-location | PASS |
| auth API 게이트 예외 | 쿠키 없이 `/api/auth/login`·`logout` | 게이트 401 아님 | login 405(GET)/401(오답 POST), logout 200 | PASS |

---

## 4. 코드 점검 — constant-time / Edge 호환 / 401 가드

- **constant-time (AC-11)**: `lib/auth/password.ts` `constantTimeEqual` 및 `lib/auth/session.ts` 의 서명 비교 모두 `diff = a.length ^ b.length` 로 시작해 `max(len)` 전 구간을 `diff |= ca ^ cb` 누적 — 길이/내용 모두 early-return 없음. 비밀번호 비교는 응답·로그에 값 미노출. (참고: JS 문자열 비교라 루프 상한이 `max(len)` 에 의존하나, `APP_PASSWORD` 길이는 강비밀 아니고 내용 기반 타이밍 누출이 없어 AC 요건 충족.)
- **Edge 호환 (AC-10)**: middleware·`lib/auth/*` 가 Node `crypto`/`Buffer` 미사용. base64url 은 `atob`/`btoa` + `TextEncoder`/`Uint8Array` 직접 구현. `verifySession` 만 middleware 가 import(검증 위임), middleware 자체는 cookie 파싱+분기.
- **401 매핑 가드 (AC-20)**: `redirectToLogin` 3중 가드 — `typeof window === "undefined"` 즉시 return(SSR 안전), `window.location.pathname === "/login"` 제외, `requestUrl.includes("/auth/login"|"/auth/logout")` 제외. 로그인 실패 401 이 게이트 리다이렉트로 오인되어 무한 루프 도는 회귀 차단.
- **secure 쿠키 (§6)**: `cookie.ts` `isSecure()` = `NODE_ENV === "production"`. dev(localhost http)에서 Secure 미부여(브라우저 거부로 인한 로그인 루프 방지), prod 에서만 Secure — 실측 dev Set-Cookie 에 Secure 없음으로 정합 확인.

---

## 5. 한계 / 비범위 (정상 — PRD §4 정합)

- in-memory 카운터/계정 잠금/CAPTCHA 부재 = 의도(서버리스 분산 + 자기 잠금 회피). 강한 방어는 후속 PRD(외부 rate-limit).
- stateless 서명 쿠키 — 개별 세션 폐기 불가, 강제 전체 로그아웃은 `APP_AUTH_SECRET` 회전(타 시크릿 거부 테스트로 동작 확인).
- Vercel 프로덕션 게이트는 Project Settings 에 두 키 등록 필요(PR `## 다음 작업` 명시). 미등록 시 도메인 공개(경고 로그 1회) — PRD §0/q1 정합.
- Next.js 16 `middleware` → `proxy` deprecation 경고(빌드 통과). AC-1 이 `middleware.ts` 를 명시하므로 현 PR 유지, 리네임은 후속 chore(PR `## 다음 작업` 명시).

---

## 결론

20/20 AC 통과. **lockout 안전 / 시크릿 비노출 / 게이트 우회 불가** 3대 보안 항목 모두 안전. 머지 가능.
판정: **PASS** → 라벨 `impl-ready` 제거 + `qa-passed` 부여.
