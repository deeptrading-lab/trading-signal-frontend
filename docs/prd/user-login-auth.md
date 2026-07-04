# PRD — user-login-auth (Google 로그인 + 가입 승인 게이트, Phase 1 파운데이션)

- 작성: PM 역할 (2026-07-05)
- 브랜치: `feature/user-login-auth`
- 관련(선행): `docs/prd/app-password-gate.md` (단일 공유 비밀번호 게이트 — 본 PRD 가 그 §4 에서 "향후 Supabase 인증 트랙" 으로 명시 유예한 후속), `proxy.ts`, `lib/auth/*`
- **UI 포함: yes** — `/login` 에 "Google로 계속하기" 버튼 추가, 신규 `/pending`(승인 대기) 화면, 최소 승인 UI. **디자이너 합류 수준 아님** — 기존 토큰·원자(`BrandLockup`·`Button`·`input-*` 합성 클래스) 재사용 (app-password-gate `/login` 선례와 동일 수위).

## 0. 한눈에

- **무엇을**: 앱 접근 인증을 "단일 공유 비밀번호" 에서 "**Google 로그인으로 신원 확인 → 관리자 승인**" 모델로 이관한다. 앱은 비밀번호를 직접 다루지 않는다(Google 이 신원을 책임).
- **승인 모델**: 누구나 Google 로그인 가능 → 최초 로그인 시 `profiles` 에 `pending` 행 생성 → 관리자가 `approved` 로 바꿔야 앱 접근. 미승인자는 "승인 대기 중" 화면.
- **Phase 1(이 PR)**: OAuth 로그인 플로우 + `profiles` 테이블 + 게이트 이관(폴백 포함) + 최소 승인 수단 + 최초 관리자 시드 + 로그아웃. **신원 배선(`requested_by` 등)은 Phase 2** 로 명시만.
- **설계 1순위**: 검증된 HMAC Edge 게이트(`verifySession`)와 `app_auth` 쿠키를 **그대로 재사용**하고 세션 payload 에 신원(`sub`·`email`·`role`)을 얹는다 → 최소 변경, 단일 쿠키, `APP_PASSWORD` 폴백 공존이 자명. 대안(Supabase Auth / NextAuth)은 §9 q1·q2.
- **락아웃 방지**: `APP_PASSWORD` 폴백을 Phase 1 내내 유지(브레이크글라스) + 최초 관리자를 `ADMIN_EMAILS` 허용목록으로 자동 시드 → 부트스트랩 교착 없음.

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (요약)

FinSight 에 **사용자별 로그인/인증**을 도입한다. 확정 결정:

1. **로그인 방식 = Google 로그인**. 구글 OAuth 로 이메일 신원을 확인한다. 앱이 비밀번호를 직접 다루지 않는다.
2. **승인 모델 = 가입 후 대기→승인**. 누구나 구글 로그인 가능 → 최초 로그인 시 `pending` 생성 → 관리자가 승인해야 접근. 미승인자는 "승인 대기 중" 화면.
3. **첫 PR = Phase 1 파운데이션만**. 신원 배선(작업 주체 기록·per-user 상한 등)은 Phase 2 후속.

### 1.2 현재 상태 (main 기준, 코드 확인)

- **단일 공유 비밀번호 게이트**. `proxy.ts`(Next 16 Edge 런타임 루트 미들웨어)가 `app_auth` 쿠키를 `verifySession`(HMAC‑SHA256 + `exp`, `APP_AUTH_SECRET`, Web Crypto, Edge 호환)으로 검증한다. 유효하면 통과.
- **게이트 활성 조건 = `process.env.APP_PASSWORD` truthy 일 때만**. 미설정이면 앱 공개(로컬/CI 마찰 0).
- 로그인 = `POST /api/auth/login {password}` 를 `APP_PASSWORD` 와 constant‑time 비교 → 일치 시 `signSession()` 토큰을 `app_auth` 쿠키(httpOnly·secure(prod)·sameSite=lax·path=/·**30일**)로 발급. 유틸: `lib/auth/{session,constants,cookie,password}.ts`.
- 세션 payload = `{ v, iat, exp }` — **신원 없음**. `SESSION_COOKIE_NAME = "app_auth"`.
- **공개 경로(게이트 예외)**: `/login`, `/api/auth/*`, `/api/cron/*`(자체 `CRON_SECRET` 검증), `/fonts/*`, 정적·아이콘·OG 메타(`PUBLIC_EXACT_PATHS`), OG 크롤러 UA 예외(GET/HEAD 페이지 한정). API 미인증 → 401 JSON, 페이지 미인증 → `/login?next=` 307.
- **matcher**: `_next/static|_next/image|api/stock/ai-analysis$` 만 제외.
- **Supabase**: 다수 스토어(큐·결정·토큰·스코어카드·페이퍼·시황)가 이미 Supabase 를 쓰지만 **전부 raw PostgREST REST + service‑role key(서버 전용)**. **Supabase 클라이언트 SDK·Supabase Auth 는 미사용**. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 는 현재 코드 미사용(예약만). 참고 패턴: `lib/server/ai/decisionStore.ts`(`supabaseConfig()` fail‑soft, `apikey`+`Bearer` 헤더).
- **auth 도메인 골격 존재**: `hooks/auth/{useLogin,useLogout}`, `lib/api/auth/{login,logout}`, `lib/copy/auth/login`, `hooks/query/useMutationLogin`, `app/login/{page,LoginForm}.tsx`(라우트 그룹 `(main)` 밖 풀스크린).

### 1.3 문제

- 단일 공유 비밀번호는 **누가 무엇을 했는지 신원이 없다**. 분석 요청 큐·모의투자·결정 저장 등 개인 귀속이 필요한 후속(Phase 2)의 전제가 빠져 있다.
- 비밀번호 공유는 접근 취소가 불가능(비밀번호 회전 = 전원 재로그인)하고, 신규 인원마다 비밀번호 전달이라는 수동 절차가 붙는다.
- 구현자(어시스턴트)는 비밀번호/자격증명을 직접 입력·생성하지 않는 원칙 → **비밀번호를 앱이 안 다루는 Google 신원 위임**이 정합.

### 1.4 컨텍스트 메모 (필수 인지)

- **BFF 패턴**: 클라이언트는 FastAPI·외부 IdP 토큰 엔드포인트를 직접 호출하지 않는다. 모든 인증은 route handler 경유.
- **Edge 게이트 불변식**: `proxy.ts` 는 현재 **네트워크 I/O 0**(HMAC 검증만). 이 성질을 유지한다(승인 상태 조회를 매 요청 미들웨어에서 하지 않는다 — §9 q6).
- **컨벤션**: 한글 카피 `lib/copy/auth/`, query key `hooks/query/queryKeys.ts` 단일 위치, `cn` 헬퍼, hex/px 직타 금지, 도메인 한 뎁스, 커밋 한글.

---

## 2. 목표 (측정 가능)

- OAuth 구성(Google) 상태에서 미인증 사용자가 보호 페이지 접근 시 `/login` 으로 가고, 로그인 화면에 **"Google로 계속하기"** 버튼이 뜬다.
- 최초 Google 로그인 시 `profiles` 에 해당 신원 행이 **`status=pending` 으로 1회 생성(upsert)** 되고, 미승인자는 앱 대신 **`/pending`(승인 대기 중)** 화면을 본다(앱 데이터 노출 0).
- `ADMIN_EMAILS` 허용목록 이메일의 최초 로그인은 **자동으로 `approved`+`admin`** 으로 시드되어 즉시 접근 가능(부트스트랩 교착 없음).
- 관리자가 `pending` 사용자를 `approved` 로 바꾸면, 그 사용자의 다음 로그인부터 앱 접근이 열린다.
- **락아웃 0**: OAuth 미구성이면 기존 `APP_PASSWORD` 게이트로 폴백해 동작 무변경. 둘 다 미구성이면 앱 공개(현행 dev 동작 보존).
- **Edge 게이트 회귀 0**: `proxy.ts` 는 여전히 네트워크 I/O 없이 HMAC 만으로 판정(핫패스 성능·아키텍처 불변).

---

## 3. 범위 (In Scope)

> 설계 1순위 = **Option C(수동 Google OAuth Authorization Code flow) + 기존 HMAC 세션 재사용**(§9 q1·q2 에서 대안 A/B 비교). 아래 §3 은 이 전제로 기술한다. q1 이 A/B 로 확정되면 §3.2·§3.3·§3.4 세부가 그에 맞춰 조정된다(범위·AC 골격은 유지).

### 3.1 `profiles` 테이블 + 스토어 — `lib/server/auth/profileStore.ts` (신규)

- 테이블(사용자 수동 생성, §6):

  ```
  profiles (
    sub          text primary key,                 -- Google 안정 식별자(email 변경에도 불변, §9 q5 권고)
    email        text unique not null,             -- 소문자 정규화(citext 또는 앱단 lower())
    role         text not null default 'user'      check (role in ('user','admin')),
    status       text not null default 'pending'   check (status in ('pending','approved')),
    display_name text,                              -- Google 프로필명(선택)
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
  )
  ```

- 스토어 API(서버 전용, `decisionStore.ts` 와 동일한 raw REST + service‑role + **fail‑soft** 패턴):
  - `getProfileBySub(sub)` → 행 또는 null.
  - `upsertProfileOnLogin({ sub, email, displayName })` → 최초면 insert(허용목록이면 `approved`+`admin`, 아니면 `pending`+`user`), 기존이면 email/display 갱신(role·status 는 보존). 반환 = 최종 `{ role, status }`.
  - `listPendingProfiles()` → 승인 대기 목록(관리자 승인 화면용).
  - `setProfileStatus(sub, "approved")` → 승인 처리.
- **service‑role key 는 서버에서만.** 브라우저 노출 0. Supabase 미설정/오류는 인증을 조용히 실패(로그인 거부)시키지 않고 **명시적 500** 을 반환(인증은 fail‑soft 대상 아님 — 프로필을 못 읽으면 접근을 열면 안 된다). ※ 조회/저장 fail‑soft 로 접근을 여는 것은 **금지**(보안).

### 3.2 세션 payload 신원 확장 — `lib/auth/session.ts` (기존 확장, 하위호환)

- `SessionPayload` 에 **선택 필드** 추가: `sub?: string`, `email?: string`, `role?: "user" | "admin"`. 기존 `{ v, iat, exp }` 토큰(비밀번호 발급분)도 **그대로 유효**(서명·만료만 보면 됨 → 폴백 세션이 게이트를 계속 통과).
- 신규 `signIdentitySession({ sub, email, role })` — 승인된 사용자에게 신원을 담은 `app_auth` 토큰 발급. `verifySession(token)` 시맨틱은 **불변**(유효 서명 + 미만료 = true). 신원은 부가 payload.
- 신규 `readSession(token)` — 디코드된 신원(`sub`/`email`/`role`)을 반환(role 체크용, 순수 문자열/JSON → Edge·Node 공용). **단, `proxy.ts` 는 이를 호출하지 않는다**(게이트는 boolean `verifySession` 만 — I/O·분기 최소).
- 신원 토큰 버전은 `v=2`(향후 무효화 키). `v=1` 도 유효 유지(폴백·기존 로그인 세션 강제 로그아웃 회피).

### 3.3 Google OAuth 라우트 핸들러 (BFF, **Node 런타임**)

- `app/api/auth/google/start/route.ts` — authorize URL 생성 후 307:
  - scope = `openid email profile` (**online only** — refresh 토큰 미요청, `access_type=offline` 안 씀).
  - `state`(CSRF) 를 httpOnly 쿠키로 발급 + authorize URL 에 동봉. `prompt=select_account`(계정 고정 방지). `redirect_uri` 는 env 고정값(정확 일치).
  - `next`(same‑origin 검증) 를 state 쿠키에 함께 실어 콜백까지 전달.
- `app/api/auth/google/callback/route.ts` —
  1. `state` 쿠키 ↔ 쿼리 일치 검증(불일치 → 400, 로그인 실패).
  2. `code` 를 Google 토큰 엔드포인트에 **서버측 교환**(`client_secret` 사용 — 절대 클라이언트 아님).
  3. `id_token` payload 또는 userinfo 에서 **검증된 이메일**(`email_verified === true` 필수) + `sub` + 프로필명 추출.
  4. `upsertProfileOnLogin(...)` → `{ role, status }`.
  5. **분기**: `approved` → `signIdentitySession()` 토큰을 `app_auth` 쿠키(기존 `buildSessionCookie` 재사용)로 세팅 + `next`(또는 `/`) 로 307. `pending` → **쿠키 미발급** + `/pending` 로 307.
  - Node 런타임 명시(`client_secret` 사용·토큰 교환). OAuth 코드가 **Edge 미들웨어 import 그래프에 새지 않게** 격리(§8 회귀).

### 3.4 로그인 화면 `/login` (UI — 기존 확장)

- `app/login/page.tsx`(서버 컴포넌트)가 `process.env` 를 읽어 `googleEnabled`(OAuth 구성됨)·`passwordEnabled`(`APP_PASSWORD` 설정됨) boolean 을 `LoginForm` 에 prop 으로 전달.
- `LoginForm` — **"Google로 계속하기"** 버튼 추가(구성 시). 버튼은 `<a href="/api/auth/google/start?next=…">`(리다이렉트 플로우 — 클라이언트 `fetch` 0). 비밀번호 폼은 `passwordEnabled` 일 때만 폴백/보조로 렌더(전환기 공존).
- 신규 카피는 `lib/copy/auth/login.ts` 에 추가(`LOGIN_GOOGLE_CTA` 등). 신규 hex/px 0, 기존 토큰·`BrandLockup`·`Button` 원자 재사용.

### 3.5 `/pending` 승인 대기 화면 (UI — 신규, 공개 경로)

- `app/pending/page.tsx` — 라우트 그룹 `(main)` **밖**(글로벌 셸 미상속, `/login` 과 동일 패턴). "승인 대기 중" 안내 + 로그아웃/다시 시도. 카피 `lib/copy/auth/pending.ts`.
- 게이트 공개 경로에 `/pending` 추가(미인증 상태에서 도달 가능). 정보 화면일 뿐 세션·앱 데이터 노출 0.

### 3.6 게이트 이관 — `proxy.ts` (기존 확장, 최소)

- **활성 조건 확장**: 게이트 활성 = `(OAuth 구성됨) || (APP_PASSWORD 설정됨)`. 둘 다 미설정 → 즉시 통과(현행 dev 동작 보존).
- **판정 불변**: `verifySession(app_auth)` 유효 → 통과 / 미유효 → 페이지는 `/login?next=`, `/api/*` 는 401 JSON(현행과 동일). **네트워크 I/O·role 조회 없음**.
- **공개 경로 추가**: `/pending`, `/api/auth/google/*`(기존 `/api/auth/*` 접두에 이미 포함되나 명시 확인).
- **폴백 공존**: 비밀번호로 발급된 `v=1` 세션도 유효 서명·미만료면 통과 → 전환기 기존 로그인 사용자 강제 로그아웃 0. (승인 모델의 **엄격 강제**는 `APP_PASSWORD` 제거 후 — §9 q4.)

### 3.7 승인 처리 (대기→승인, 최소 수단)

- 라우트 `app/api/admin/approvals/route.ts` — `GET`(대기 목록) / `POST {sub}`(승인). **`role === admin` 자체 검증**(세션 신원 `readSession`) → 미달 403. 게이트는 role 을 안 보므로 이 라우트가 직접 방어.
- 최소 관리자 UI(§9 q3): `app/(main)/admin/page.tsx` — 대기 목록 + "승인" 버튼 1개. 페이지 서버측에서 role 확인 → 비관리자는 404/리다이렉트. (q3 에서 "route‑only + 초기 SQL 수동" 대안 제시.)
- 훅/API/카피는 컨벤션대로: `hooks/admin/*` → `hooks/query/useQuery~/useMutation~` → `lib/api/admin/*`, 카피 `lib/copy/admin/*`, key `queryKeys.ts`.

### 3.8 최초 관리자 시드 (`ADMIN_EMAILS` 허용목록)

- 서버 env `ADMIN_EMAILS`(콤마 구분, 소문자 정규화). `upsertProfileOnLogin` 최초 insert 시 email ∈ 허용목록 → `status=approved`+`role=admin`, 아니면 `pending`+`user`.
- **부트스트랩 해결**: 최초 관리자(hayoung 이메일)를 허용목록에 넣어두면 **그의 첫 Google 로그인이 자동으로 admin+approved** → 승인자가 없어 교착되는 문제 제거. 브레이크글라스도 겸함(이메일 추가 후 재로그인 = 관리자 승격).

### 3.9 로그아웃 — `app/api/auth/logout` (기존, 변경 최소)

- 기존 `buildClearedSessionCookie()` 로 `app_auth`(신원 세션 포함) 삭제 → 다음 보호 경로 접근 시 게이트가 `/login` 으로. **Google 자체 세션은 우리가 보유하지 않음**(Option C 는 1회 code 교환만) → Google 로그아웃 안 함(사용자 Gmail 세션 건드리지 않음). 계정 전환은 재로그인 시 `prompt=select_account` 로 해결.

### 3.10 env 템플릿 + 문서

- `.env.example`·`.env.local.example` 에 `GOOGLE_OAUTH_CLIENT_ID`·`GOOGLE_OAUTH_CLIENT_SECRET`(⚠️ 서버 전용, `NEXT_PUBLIC_` 금지)·`GOOGLE_OAUTH_REDIRECT_URI`·`ADMIN_EMAILS` 추가 + 주석. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 는 Option C 에서 **여전히 미사용**(profiles = 기존 service‑role REST)임을 주석 명시.

---

## 4. 비범위 (Out of Scope) — 명시적 제외

- **Phase 2 — 신원 배선(핵심 후속)**: 분석 요청 큐 `requested_by`, 결정/모의투자/토큰사용 per‑user 귀속, per‑user 상한, 사용자별 대시보드. 본 PR 은 신원을 **세션에 실어두기만** 하고 도메인 배선은 안 한다.
- **per‑user 데이터 격리 / Supabase RLS / row‑ownership** — Phase 2+.
- **`user`/`admin` 외 역할·세분 권한**(예: 모델명 제어 같은 admin 후속 권한)은 필드만 두고 UI/enforcement 는 후속.
- **이메일/비밀번호 계정·타 OAuth provider·매직링크·2FA** — 비범위(Google 단일).
- **셀프 프로필 편집·아바타·닉네임 변경 UI** — 비범위.
- **서버측 세션 저장소 / 개별 세션 폐기 목록(블랙리스트)** — stateless HMAC 유지. 전체 무효화는 `APP_AUTH_SECRET` 회전(app-password-gate 모델 계승). **개별 승인 취소의 실시간 전파**는 세션 TTL 만큼 지연(§9 q6).
- **`APP_PASSWORD` 폴백의 영구 제거** — 본 PR 은 폴백 유지. 컷오버 제거는 후속(§9 q4).
- **신규 가입 시 관리자 알림(Slack/메일)** — Phase 2 편의.
- **CAPTCHA·브루트포스 방어** — Google 이 인증 시도를 처리(우리 앱은 비밀번호를 안 받음). app-password-gate 의 500ms 지연은 폴백 비밀번호 경로에 한해 유지.
- **로그인/승인 화면 풀디자인(디자이너 합류)** — 최소 폼·정보 화면만. 일러스트·모션은 트리거 시 별도 PRD.

---

## 5. 수용 기준 (AC) — 검증 가능

### 5.1 게이트·라우팅

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | OAuth 구성 + 세션 없음 + 페이지 요청 | `/login?next=<원경로>` 307 |
| AC-2 | OAuth 구성 + 세션 없음 + `/api/*` 요청 | 401 JSON `{ error: "unauthorized" }` |
| AC-3 | `/pending`·`/api/auth/google/*` | 미인증에서도 도달(공개 경로) |
| AC-4 | OAuth·APP_PASSWORD 둘 다 미설정 | 앱 공개(현행 dev 동작 무변경) |
| AC-5 | 비밀번호 발급 `v=1` 세션 보유(전환기) | 게이트 통과(강제 로그아웃 0) |

### 5.2 로그인·승인 흐름

| # | 시나리오 | 기대 |
|---|---|---|
| AC-6 | 허용목록 밖 이메일 최초 Google 로그인 | `profiles` 행 `status=pending` 생성, `app_auth` **미발급**, `/pending` 307 |
| AC-7 | `ADMIN_EMAILS` 이메일 최초 로그인 | `status=approved`+`role=admin` 시드, 신원 `app_auth` 발급, `next`/`/` 307 |
| AC-8 | 승인된 사용자 로그인 | 신원 `app_auth` 발급 → 앱 접근 |
| AC-9 | pending 사용자가 `/` 직접 접근 | 세션 없어 게이트가 `/login` 으로(앱 데이터 노출 0) |
| AC-10 | 관리자 `POST /api/admin/approvals {sub}` | 대상 `status=approved`, 해당 사용자 재로그인 시 접근 |
| AC-11 | 비관리자가 승인 라우트 호출 | 403(게이트 통과해도 라우트가 role 방어) |
| AC-12 | 로그아웃 후 보호 페이지 | `app_auth` 삭제 → `/login` |
| AC-13 | 두 번째 로그인(기존 approved 행) | role·status 보존, email/display 갱신만 |

### 5.3 폴백·회귀

| # | 시나리오 | 기대 |
|---|---|---|
| AC-14 | OAuth 미구성 + `APP_PASSWORD` 설정 | 기존 비밀번호 로그인 무변경(app-password-gate AC 회귀 통과) |
| AC-15 | `proxy.ts` 요청 처리 | Supabase/네트워크 fetch 0 — `git grep -n "fetch\|supabase" proxy.ts` = 0(HMAC 만) |
| AC-16 | Supabase 미설정에서 Google 콜백 | 접근 **개방 안 함** — 500(프로필 못 읽으면 인증 실패, fail‑open 금지) |

### 5.4 보안·비노출

| # | 시나리오 | 기대 |
|---|---|---|
| AC-17 | `client_secret` 비노출 | `git grep -n GOOGLE_OAUTH_CLIENT_SECRET` = 서버 route 만. `NEXT_PUBLIC_` 접두 0. 클라 번들에 secret 0 |
| AC-18 | 이메일 검증 | `email_verified !== true` 이면 로그인 거부(신뢰 이메일만 upsert) |
| AC-19 | CSRF | `state` 쿠키 httpOnly + 콜백 불일치 시 400. `redirect_uri` env 정확 일치 |
| AC-20 | service‑role 비노출 | profiles 접근은 서버 스토어만 — `git grep -rn SUPABASE_SERVICE_ROLE_KEY app/ components/ hooks/` = 0(클라 0) |

### 5.5 컨벤션

| # | 시나리오 | 기대 |
|---|---|---|
| AC-21 | 클라이언트 fetch 0 | Google 버튼 = `<a>` 리다이렉트, 교환은 route handler. `git grep -n "fetch(" app/login components hooks/auth hooks/admin` = 0 |
| AC-22 | 카피·키·토큰 | 한글 카피 `lib/copy/auth|admin/*`, query key `queryKeys.ts` 단일, hex/px 직타 0 |
| AC-23 | 도메인 한 뎁스 | 신규 모듈 전부 `lib/server/auth/`·`lib/api/admin/`·`hooks/admin/`·`lib/copy/{auth,admin}/` 도메인 폴더 |
| AC-24 | 빌드/타입/린트 | `npm run build`(Turbopack) 통과, `tsc --noEmit`·eslint 클린, `npm run test`(vitest) 통과(신규 스토어·세션 확장 단위 테스트 포함) |

---

## 6. 가정 · 제약

- **선행 PRD 머지 전제**: `app-password-gate`(main 반영됨). 본 PRD 는 그 §4 "향후 Supabase 인증 트랙" 을 실현한다. `lib/auth/*`·`proxy.ts`·`app_auth` 쿠키를 재사용.
- **Supabase LIVE 가정**: 프로젝트가 이미 운영 중(다수 스토어 사용). `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 재사용, `profiles` 테이블만 신설.
- **BE LIVE 가정**: 본 기능은 FastAPI 무관(Google + Supabase). 게이트 통과 후 기존 도메인 동작 무변경.
- **사용자 액션(구현자가 못 하는 것 — 전제)**:
  1. **Google Cloud OAuth 클라이언트 생성** — client ID/secret, 승인 redirect URI(`http://localhost:3000/api/auth/google/callback` + prod 도메인), 승인 JS origin.
  2. **`profiles` 테이블 SQL 생성**(§3.1 스키마) — Supabase.
  3. **env 설정** — `.env.local` + Vercel 에 `GOOGLE_OAUTH_CLIENT_ID`·`GOOGLE_OAUTH_CLIENT_SECRET`·`GOOGLE_OAUTH_REDIRECT_URI`·`ADMIN_EMAILS`(hayoung 이메일). (q1 이 Supabase Auth = A 로 확정되면: Supabase 대시보드 Google provider 활성 + redirect URL + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가로 대체.)
- **보안 제약**: 구현자(어시스턴트)는 비밀번호/자격증명을 **직접 입력·생성하지 않는다** → Google 신원 위임 채택 이유 중 하나. secret 은 사용자 프로비저닝 env 로만 주입.
- **락아웃 방지 — 컷오버 순서(중요)**:
  1. 코드 배포(로그인 플로우는 OAuth env 있을 때만 활성) + **`APP_PASSWORD` 유지**(폴백 = 브레이크글라스).
  2. `profiles` 생성 + `ADMIN_EMAILS`(hayoung) + Google OAuth env 설정.
  3. hayoung Google 로그인 → 허용목록 자동 시드(approved+admin) → 접근 확인.
  4. 나머지 사용자 승인.
  5. prod 에서 Google 경로 충분히 검증된 뒤에만 `APP_PASSWORD` 제거(§9 q4) — 코드 변경 없이 env 해제.
- **컨벤션 제약**: 한글 카피 `lib/copy/`, hex/px 직타 금지(DESIGN.md 토큰), 커밋 한글, BFF(클라 직접 IdP 호출 0).

---

## 7. 참고

- `docs/prd/app-password-gate.md` — 선행·양식·AC 골격(본 PRD 가 계승)
- `proxy.ts` — Edge 게이트(활성 조건·공개 경로·401/307 분기)
- `lib/auth/session.ts`·`constants.ts`·`cookie.ts` — HMAC 서명/검증·쿠키 빌더(재사용·확장 지점)
- `lib/server/ai/decisionStore.ts` — Supabase raw REST + service‑role + fail‑soft 스토어 패턴(참조)
- `hooks/auth/{useLogin,useLogout}`·`lib/api/auth/*`·`lib/copy/auth/login.ts` — auth 도메인 골격
- `docs/rules/frontend.md` — 8개 절 컨벤션
- Google Identity — OAuth 2.0 Authorization Code flow, `openid email profile` scope, `email_verified`/`sub` 클레임, `prompt=select_account`

---

## 8. 영향 분석

### 8.1 변경 범위 추정 (신규 위주)

| 파일 | 성격 | 라인(추정) |
|---|---|---|
| `lib/server/auth/profileStore.ts` | 신규(Supabase REST 스토어) | ~140 |
| `app/api/auth/google/start/route.ts` | 신규(authorize 리다이렉트) | ~70 |
| `app/api/auth/google/callback/route.ts` | 신규(code 교환·upsert·분기) | ~150 |
| `lib/auth/session.ts` | 확장(신원 payload·`signIdentitySession`·`readSession`) | +~60 |
| `proxy.ts` | 확장(활성 조건·공개 경로 `/pending`) | +~15 |
| `app/login/{page,LoginForm}.tsx` + `lib/copy/auth/login.ts` | 확장(Google 버튼·flags) | +~50 |
| `app/pending/page.tsx` + `lib/copy/auth/pending.ts` | 신규(대기 화면) | ~50 |
| `app/api/admin/approvals/route.ts` + `app/(main)/admin/page.tsx` + `hooks/admin/*` + `lib/api/admin/*` + `lib/copy/admin/*` | 신규(승인) | ~180 |
| `lib/types/auth/*`·env 템플릿·단위 테스트 | 신규 | ~120 |

합계 ~900라인(대부분 신규 격리 파일, 기존 파일 수정은 `session.ts`·`proxy.ts`·`/login` 3곳 소폭).

### 8.2 단일 PR vs 분할 판단

- **권고 = 단일 PR**(한 브랜치 한 PR 룰). UI 는 최소(토큰·원자 재사용)라 디자이너 강의존 없음.
- 단, 표면(스토어 + OAuth 플로우 + 게이트 + 승인 + admin UI)이 작지 않음 → **내부 커밋 분할**로 리뷰 가독성 확보(§8.3). 만약 PR 이 과대해지면 **§3.7 승인 UI(admin 페이지)만 fast‑follow** 로 떼고 Phase 1 코어(로그인+게이트+시드+route‑only 승인)를 먼저 닫는 것을 허용(분할 사유 = admin 화면은 초기 SQL 수동 승인으로 대체 가능 = q3).

### 8.3 커밋 분할 권고 (한 PR 내부)

1. `docs(prd): user-login-auth PRD 추가`
2. `feat(auth): profiles 스토어(Supabase REST) + 신원 세션 payload 확장`
3. `feat(auth): Google OAuth start/callback 라우트(Node) + 최초 관리자 시드`
4. `feat(auth): 게이트 이관(폴백 유지) + /pending 화면 + /login Google 버튼`
5. `feat(admin): 승인 라우트 + 최소 승인 화면`
6. `chore(env): Google OAuth·ADMIN_EMAILS 템플릿/문서`
7. `test(auth): 스토어·세션·콜백 분기 단위 테스트`

### 8.4 회귀 위험

- **[높음] 게이트 락아웃/개방** — `proxy.ts` 는 전 요청 핫패스. 활성 조건을 잘못 짜면 전원 락아웃(폴백 무시) 또는 앱 개방(승인 우회). 완화: `verifySession` 시맨틱 불변 유지 + `APP_PASSWORD` 폴백 공존 + 활성 조건 단위 테스트(네 조합: OAuth·PW 각 on/off) + §6 컷오버 순서.
- **[높음] Edge 번들 오염** — 콜백의 Node 전용 코드(`client_secret` 교환)가 `proxy.ts` import 그래프에 새면 Edge 빌드 실패/성능 저하. 완화: OAuth 유틸을 게이트가 안 import 하는 서버 모듈로 격리, `proxy.ts` 는 `verifySession`(Edge‑safe)만 참조 유지.
- **[높음] fail‑open 금지** — profiles 조회 실패를 "통과"로 처리하면 승인 게이트 붕괴. 완화: 인증 경로는 fail‑soft 아님(못 읽으면 로그인 거부/500) — AC-16.
- **[중] secret 유출** — `client_secret`/service‑role 이 클라 번들·`NEXT_PUBLIC_` 로 새면 치명. 완화: AC-17·AC-20 grep 게이트.
- **[중] 승인 취소 지연** — 세션에 신원을 구워(§9 q6) 이미 발급된 세션은 TTL 까지 유효. 완화: 소규모 신뢰 그룹 전제로 수용, 즉시성 필요 시 Phase 2 좁은 재검증.
- **[저] 기존 로그인 사용자** — `v=1` 세션 유효 유지로 강제 로그아웃 0(AC-5).

---

## 9. OPEN QUESTION (사용자 결정 필요 — 각 PM 권고 동봉)

- **[OPEN QUESTION] q1. OAuth 처리 방식 = A(Supabase Auth · Google provider) / B(Auth.js·NextAuth) / C(수동 Google OAuth code flow)**
  - A: Supabase 가 이미 스택 → 대시보드 토글로 Google provider·토큰 교환·refresh·`auth.users` 관리. **단점** = Supabase JS SDK(`@supabase/supabase-js`/`ssr`) 신규 도입(레포가 지금껏 피한 SDK) + Supabase Auth 세션이라는 **두 번째 세션 체계**가 기존 `app_auth` HMAC 과 병존, Edge 게이트를 `@supabase/ssr` 로 재작성해야 함. OAuth 정확성 위험은 최저.
  - B: Next 전용 OAuth 라이브러리. JWT 전략이면 Edge 친화. **단점** = 신규 의존 + NextAuth 쿠키·미들웨어 관례가 손수 만든 `proxy.ts`/`app_auth` 와 충돌 → 게이트 대체 또는 이중 운영.
  - C: 의존 0, 서버 route 에서 code 교환(Node) → 검증 이메일로 **기존 HMAC 세션 재발급**. 게이트·쿠키·폴백 그대로. **단점** = OAuth 보안 세부(state·nonce·redirect 정확일치·email_verified)를 직접 구현(이 레포는 이미 HMAC 세션을 견고히 자작 = 역량 입증).
  - **PM 권고 = C**. 사용자 결정(HMAC 세션 재사용 1순위) + "앱이 비밀번호 안 다룸" + 레포의 "무 SDK·raw REST·미니멀" 성향에 정확히 부합. 단일 `app_auth` 쿠키로 `APP_PASSWORD` 폴백 공존이 자명하고 Edge 게이트 무변경. 관리형 OAuth(refresh 등)와 SDK 도입을 감수하고 게이트 재작성을 받아들일 수 있으면 A 가 OAuth 위험 최저 대안.

- **[OPEN QUESTION] q2. 세션 = 기존 HMAC 확장 vs Supabase Auth 세션**
  - **PM 권고 = 기존 HMAC 확장**(q1=C 와 한 쌍). 검증된 Edge 게이트 그대로, payload 에 `sub`/`email`/`role` 만 추가, `v=1` 하위호환으로 무중단. q1 이 A 로 뒤집히면 Supabase 세션으로 함께 전환(게이트도 그에 맞춰 재작성).

- **[OPEN QUESTION] q3. Phase 1 승인 UI 수준 = 최소 admin 페이지 vs route‑only(초기 DB/SQL 수동)**
  - **PM 권고 = route + 1화면 최소 admin 페이지**. 승인 route 는 어차피 필요(신원 방어). 대기목록+승인버튼 1개 화면은 저비용이고 매번 SQL 여는 운영 수고를 없앤다. 일정 압박 시 route‑only 먼저 + admin 화면 fast‑follow(초기엔 `setProfileStatus` 를 SQL 로 대체) — §8.2 분할 트리거.

- **[OPEN QUESTION] q4. `APP_PASSWORD` 폴백의 영구 제거 시점**
  - **PM 권고 = Phase 1 내내 유지(브레이크글라스)**, prod 에서 Google 경로로 N명 이상 정상 접근 확인 후 Phase 2 에서 제거. 제거 = **코드 변경 없이 env 해제**(게이트 활성 조건이 자동으로 OAuth 전용化). 그 전까지 승인 모델의 "엄격 강제" 는 미완(공유 비밀번호를 아는 사람은 우회 가능) — 운영자 통제 하 수용.

- **[OPEN QUESTION] q5. `profiles` PK = email vs uuid, 이메일 변경/대소문자 정규화**
  - **PM 권고 = PK `sub`(Google 안정 subject id) + `email` unique·소문자 정규화**. Google `sub` 는 이메일이 바뀌어도 불변인 공식 권장 키 → 이메일 변경 안전. `ADMIN_EMAILS` 매칭·사람 가독성은 `email` 컬럼으로. (email 을 PK 로 하면 구현은 단순하나 이메일 변경 시 신원 단절 위험.)

- **[OPEN QUESTION] q6. 세션에 role/status 를 굽는가 vs 매 요청 profiles 조회**
  - **PM 권고 = 세션에 신원(role) 을 굽는다**. pending 은 애초에 세션을 못 받으므로 게이트는 "유효 세션=approved" 로 이진 판정 + **네트워크 I/O 0**(현행 Edge 아키텍처 불변). 트레이드오프 = 승인 취소가 세션 TTL 만큼 지연 → 소규모 신뢰 그룹 전제로 수용, 즉시 취소가 하드 요구가 되면 Phase 2 에서 **좁은 경로 한정** 재검증(전 자산 요청마다 조회는 금지).
