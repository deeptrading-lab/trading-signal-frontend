# QA 리포트 — middleware-to-proxy

- **대상 PR**: #87 `chore(proxy): middleware → proxy 파일 컨벤션 마이그레이션 (Next 16)`
- **브랜치**: `feature/middleware-to-proxy` (`a96301e`)
- **PRD**: 없음 (chore — Next 16 파일 컨벤션 마이그레이션). 변경 의도에서 AC 직접 도출.
- **성격**: 순수 리네임 — **동작 무변경(behavior-preserving)**.
- **QA 일시**: 2026-06-01
- **판정**: **qa-passed** (실패 0건, 비차단 관찰 2건)

---

## 0. 변경 범위 (diff stat, main...HEAD)

```
 __tests__/{middleware.test.ts => proxy.test.ts} |  28 ++--
 docs/references/slack-bot-analysis-roadmap.md   | 208 ++++++++++++++++++++++++   ← 범위 밖 (관찰 O2)
 middleware.ts => proxy.ts                       |   7 +-
```

핵심 산출물은 `middleware.ts → proxy.ts` (git rename) + 테스트 동반 리네임 2건.

---

## 1. AC 별 재현·기대·실측

변경 의도에서 도출한 AC. 각 항목 검증 명령을 QA 가 직접 재실행해 첨부.

| AC | 항목 | 재현 절차 | 기대 | 실측 | 결과 |
|---|---|---|---|---|---|
| AC-1 | **deprecation warning 제거 (핵심 목적)** | `npm run build` → 출력 `grep -niE 'deprecat\|middleware-to-proxy'` | 경고 0건 | 0건. (PR 브랜치 build 출력에 `deprecat`/`middleware-to-proxy` 매칭 없음) | ✅ |
| AC-1b | **baseline 대비 — 경고가 실제로 사라졌는가** | `main` 워크트리에서 `npm run build` 후 동일 grep | main 에는 경고 **존재** | main: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. https://nextjs.org/docs/messages/middleware-to-proxy` 출력. PR 브랜치: 부재. → **PR 이 경고를 제거함 입증** | ✅ |
| AC-2 | **Proxy 라우트 정상 인식** | `npm run build` 라우트 테이블 확인 | `ƒ Proxy (Middleware)` 표기 | `ƒ Proxy (Middleware)` 정상 출력 (build exit 0) | ✅ |
| AC-3 | **동작 무변경 — proxy.ts vs main:middleware.ts 본문 대조** | `diff <(git show main:middleware.ts) proxy.ts` | 함수명 `middleware→proxy` + 헤더 주석 외 로직 라인 변경 **0** | diff 결과: ① 헤더 주석 1줄 변경 + 3줄 추가(리네임 사실 명시) ② `export async function middleware` → `proxy` 1줄. **로직 라인 변경 0** | ✅ |
| AC-3b | **함수 본문 byte-identical 검증** | `diff <(git show main:middleware.ts \| tail -n +106) <(tail -n +109 proxy.ts)` | 시그니처 라인 1개 외 차이 0 | export 라인(`middleware`→`proxy`) 단 1개 차이. 게이트 로직·`isPublicPath`·`CRAWLER_USER_AGENTS`·`safeNextPath`·redirect·`config.matcher`·prod 경고 전부 동일 | ✅ |
| AC-4 | **비밀번호 게이트 무회귀 (16 테스트)** | `npx vitest run __tests__/proxy.test.ts` | 16/16 pass | **16 passed**. 게이트 비활성 통과·세션 검증·`/api/*` 401·`/login` 307·open-redirect 차단·예외경로 루프가드·변조쿠키 리다이렉트 전부 그린 | ✅ |
| AC-5 | **참조 무결성 — 잔존 import 0** | `git grep -nE 'from .*\.\./middleware\|@/middleware\|\./middleware'` (ts/tsx) | 0건 | 0건. middleware.ts 를 import 하던 곳은 테스트 1곳뿐이었고 `../proxy` 로 갱신됨. | ✅ |
| AC-5b | **middleware.ts 파일 제거 확인** | `ls middleware.ts` | 없음 | `No such file or directory`. `proxy.ts` 만 존재. | ✅ |
| AC-6 | **typecheck 0 에러** | `npm run typecheck` (`tsc --noEmit`) | exit 0 | exit 0, 출력 없음 | ✅ |
| AC-7 | **lint clean (proxy 파일)** | `npx eslint proxy.ts __tests__/proxy.test.ts` | exit 0 | exit 0, 경고 0 | ✅ |
| AC-8 | **build exit 0** | `npm run build` | exit 0 | exit 0. `✓ Compiled successfully in 2.4s`, 정적 28페이지 생성 | ✅ |
| AC-9 | **전체 테스트 그린** | `npm run test` (`vitest run`) | 189 그린 | **Test Files 30 passed (30) / Tests 189 passed (189)**. proxy 16건 포함 | ✅ |

### 실측 로그 (핵심)

**AC-1 / AC-1b — deprecation warning 부재 (핵심 목적):**
```
$ npm run build  (PR 브랜치) → grep -niE 'deprecat|middleware-to-proxy' /tmp/build_out.txt
>>> No deprecation/middleware-to-proxy warning (PASS)
$ grep -niE 'middleware|proxy' /tmp/build_out.txt
52:ƒ Proxy (Middleware)

$ npm run build  (main 워크트리 baseline) → 동일 grep
7:⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
!!! WARNING PRESENT ON MAIN (expected) !!!
52:ƒ Proxy (Middleware)
```
→ main 에는 경고가 있고 PR 브랜치엔 없다. 핵심 목적 달성을 baseline 대비로 입증.

**AC-3 — 본문 대조 (git 원본 vs proxy.ts):**
```
$ diff <(git show main:middleware.ts) proxy.ts
2c2
< * 루트 middleware — 앱 전체 단일 공유 비밀번호 게이트 (Edge 런타임).
---
> * 루트 proxy — 앱 전체 단일 공유 비밀번호 게이트 (Edge 런타임).
3a4,6
> * Next 16: `middleware` 파일 컨벤션이 `proxy` 로 리네임됨(동작·Edge 런타임 동일).
> * 파일명 `proxy.ts` + named export `proxy` + `config` matcher 유지.
> *
106c109
< export async function middleware(request: NextRequest) {
---
> export async function proxy(request: NextRequest) {
```
→ 변경 라인: 헤더 주석(1줄 수정+3줄 추가) + 함수 시그니처 1줄. **로직 라인 0**. 의도(behavior-preserving)와 정확히 일치.

**AC-4 — 게이트 테스트 16건:**
```
$ npx vitest run __tests__/proxy.test.ts
✓ __tests__/proxy.test.ts (16 tests) 8ms
Test Files  1 passed (1)   Tests  16 passed (16)
```

**AC-9 — 전체 스위트:**
```
Test Files  30 passed (30)
     Tests  189 passed (189)
```

---

## 2. 공통 AC 무회귀

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck/lint/build 0 에러 | 위 AC-6/7/8 | ✅ 0 |
| BFF 원칙 무회귀 | `git grep -nE 'http://127\.0\.0\.1' -- app/` | route handler env fallback 3건만 (whitelist/search, workbench/_adapters/fastapi) — 전부 **main 에 이미 존재, 본 PR 미변경**. proxy.ts 자체엔 127/FASTAPI/fetch **0건**. ✅ 무회귀 |
| 한글 톤 무회귀 | proxy.ts·proxy.test.ts 사용자 노출 문구 | 게이트 미들웨어는 사용자 노출 문구 없음(리다이렉트/401만). 주석은 전부 한글 유지. ✅ |
| 접근성 무회귀 | UI 변경 없음 | 본 PR UI/마크업 변경 0 → 접근성 영향 없음. ✅ N/A |

---

## 3. 에지 케이스 (게이트 분기 — proxy.test.ts 가 커버)

순수 리네임이라 신규 에지 표면은 없음. 기존 게이트 분기가 리네임 후에도 동일하게 동작하는지를 테스트로 확인.

| 에지 케이스 | 커버 테스트 | 실측 |
|---|---|---|
| 게이트 비활성 (APP_PASSWORD 미설정) | `[AC-13] 쿠키 없이도 페이지/API 전부 통과` | page 200·api 200·location null ✅ |
| 미인증 페이지 → open-redirect 차단 (`next` same-origin 절대경로) | `[AC-2] /dashboard → /login?next=/dashboard 307`, `쿼리 보존 /profile/AAPL?tab=x` | 307 + next 보존 ✅ |
| 미인증 `/api/*` → 401 JSON (리다이렉트 X) | `[AC-3] /api/market/ticker → {error:"unauthorized"}`, `/api/workbench/analyze → 401` | 401 + location null ✅ |
| 루프 가드 — 미인증 + `/login` → 재리다이렉트 안 함 | `[AC-4] /login?next=... → 200` | 200 ✅ |
| 예외 경로 (/login·/api/auth/*·/icon·/favicon.ico·/fonts/*) 항상 통과 | `[AC-4] it.each 6경로` | 전부 200 ✅ |
| matcher `_next/static`·`_next/image` 제외 | `[matcher] config.matcher 검증` | matcher 문자열 포함 ✅ |
| 변조 쿠키 → 미인증 취급 | `[AC-6] forged.token → 307` | 307 ✅ |
| 유효 세션 쿠키 → 통과 | `[AC-6] signSession → 200` (page·api) | 200 ✅ |

> 라운드트립(BE LIVE) / 반응형 / DESIGN.md 토큰 동기화: **본 PR 범위 밖**. UI·BFF·디자인 토큰 변경이 0인 순수 미들웨어 파일 리네임이라 dev 서버 수동 시나리오·뷰포트·`design:sync` 검증은 비적용(N/A). 게이트 동작 동일성은 단위 테스트 16건 + 본문 byte-identical 대조로 입증된다.

---

## 4. 비차단 관찰 (reviewer 영역 — QA 판정에 영향 없음)

- **O1 (정보)**: 코드 외 파일(주석/docstring)에 `middleware.ts` 경로를 인용하는 잔존 텍스트 다수 존재 — `app/apple-icon.tsx`, `app/icon-pwa/route.tsx`, `app/manifest.ts`, `app/splash-ios/route.tsx`, `lib/auth/constants.ts`, `lib/auth/session.ts`, `public/sw.js` 등. 모두 **주석/docstring** 이며 코드 import·런타임 참조 아님 → 빌드·동작 무영향. PRD 노트("역사적 서술 보존")에 부합하나, 일부는 이제 가리키는 파일명이 살짝 stale(`middleware.ts` → `proxy.ts`). 후속 정리 후보(차단 아님).
- **O2 (범위)**: 동일 커밋(`a96301e`)에 `docs/references/slack-bot-analysis-roadmap.md`(+208줄, main 미존재)가 함께 들어감 — 마이그레이션 chore 범위 밖 docs 파일. 코드·빌드 무영향이라 QA 차단 사유 아님. **스코프 위생은 reviewer 영역** 이므로 거기서 판단 권고.
- **O3 (도구 산출물)**: 워킹트리에 `next-env.d.ts` 수정(`.next/dev/types` → `.next/types`)이 떠 있으나 이는 `next build` 가 자동 재생성하는 파일로 PR 의도와 무관한 로컬 아티팩트. 본 PR commit 에 미포함. 무시 가능.

---

## 5. 최종 판정

- AC-1~9 **전부 통과**. 핵심 목적(deprecation warning 제거)을 main baseline 대비로 입증, 동작 무변경을 본문 byte-identical 대조 + 게이트 테스트 16건으로 입증.
- 공통 AC(typecheck/lint/build/BFF/한글톤) 무회귀.
- 차단 실패 **0건**. 관찰 2건(O1·O2)은 reviewer 영역 비차단 사항.

**판정: qa-passed | 실패 0건**
