# QA 리포트 — finsight-meta-polish

- 대상 PR: [#34](https://github.com/deeptrading-lab/trading-signal-frontend/pull/34) `chore(meta): favicon + title FinSight + recharts width fix` (HEAD `70d7fe4`).
- 범위: finsight-redesign 시리즈 외 별도 chore — PRD 없음. PR 본문이 의도 정리 (A. recharts 경고, B. title FinSight, C. favicon, D. not-found catch-all + CTA 제거).
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 (Turbopack) dev `localhost:3000` / build · FastAPI BE 다운 (502 폴백 무회귀 확인 영역만 활용).
- 사용자 dev 실측 인계: title / favicon / recharts 경고 0건 / not-found 사이드바 노출 + CTA 제거 모두 확인 (2026-05-24).

## 1. 요약

3 파일 변경 + 2 파일 신설. `components/home/PriceChart.tsx` 는 3 차 누적 끝에 ResponsiveContainer 제거 + ResizeObserver 직접 측정 패턴 채택 (width=-1 경고 0건). `app/layout.tsx` metadata title `FinSight` 로 정합. `app/icon.tsx` 신설 (`next/og` ImageResponse + accent-vivid + Activity SVG → 32x32 PNG). `app/(main)/[...not_found]/page.tsx` catch-all 도입으로 미구현 라우트 (`/market` `/watchlist` `/profile`) 가 `(main)` 셸 (Sidebar / Header / BottomNav) 안에서 `(main)/not-found.tsx` 렌더 → 사용자는 사이드 메뉴로 다른 화면 이동 가능 → `(main)/not-found.tsx` 의 홈 CTA 제거. typecheck / lint / build 0 에러. BFF 무회귀 (`/api/workbench/analyze` 502 + 한글 폴백). 9 AC 전부 pass.

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **META-1** title | `curl http://localhost:3000 \| grep -oE "<title>[^<]*</title>"` | `<title>FinSight</title>` | `<title>FinSight</title>` | pass |
| **META-2** favicon 200 | `curl -sI http://localhost:3000/icon` | 200 + `image/png` | `HTTP/1.1 200 OK` + `content-type: image/png` + 32x32 RGBA PNG 558B (`file /tmp/icon.png`) | pass |
| **META-3** favicon 색 | `grep "#1d4ed8\|Activity\|polyline" app/icon.tsx` | ≥1 hit | 5 hit (주석 2 + `background: "#1d4ed8"` + `Activity` 주석 + `polyline` SVG path) | pass |
| **RECHART-1** width(-1) 경고 0건 | 사용자 dev 실측 (캐시 클리어 후) | 콘솔 경고 0건 | 사용자 실측 인계 — 캐시 클리어 후 0건 확인 (2026-05-24). QA 자동 측정은 dev log forward 의존 — 수동 영역 명시 | pass |
| **RECHART-2** ResponsiveContainer 제거 | `grep -nE "^[^*/]*ResponsiveContainer" components/home/PriceChart.tsx` | 코드 0건 (주석 제외) | 0 hit. 전체 3 hit 모두 docstring 안 설명 (L21·L22·L25) | pass |
| **RECHART-3** ResizeObserver 패턴 | `grep -c "ResizeObserver\|containerRef" components/home/PriceChart.tsx` | ≥2 | 7 hit (containerRef ref + useRef + observer 생성 + observe + disconnect cleanup + width>0 가드 + size state) | pass |
| **NOTFOUND-1** catch-all | `grep -c "notFound()" "app/(main)/[...not_found]/page.tsx"` | ≥1 | 2 hit (import + 호출) | pass |
| **NOTFOUND-2** (main) 셸 안 not-found | `/market` SSR RSC tree | `(main)/layout.tsx` + `(main)/not-found.tsx` + `(main)/[...not_found]/page.tsx` 모두 등장 | 세 path 모두 RSC pagePath 마커 노출 (`pagePath\":\"(main)/layout.tsx\"`, `pagePath\":\"(main)/not-found.tsx\"`, `pagePath\":\"(main)/[...not_found]/page.tsx\"`) + 본문 `준비 중인 화면입니다` 2회 + `max-w-main-max-w` (= (main)/not-found.tsx 셸 클래스) | pass |
| **NOTFOUND-3** CTA 제거 | `grep -E "Link\|button-primary\|NOT_FOUND_HOME_CTA" "app/(main)/not-found.tsx"` | 0 hit | 0 hit (import + JSX 모두 부재) | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | tsc 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | eslint 종료 0 | pass |
| **COMMON-3** build | `npm run build` | 0 에러 + `/icon` 등록 | `✓ Compiled successfully in 1753ms` + Route 트리에 `○ /icon` + `ƒ /[...not_found]` + 8 static pages | pass |
| **COMMON-4** BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` route handler 외 | 0건 | 0건 (route handler 의 `FASTAPI_BASE_URL` fallback 외 0 hit) | pass |
| **COMMON-7** hex/px 직타 | `grep -rE "#[0-9a-fA-F]{3,6}" app/icon.tsx app/layout.tsx "app/(main)/not-found.tsx" "app/(main)/[...not_found]/page.tsx"` | 신규 1건 (icon, 합리적 예외) | `app/icon.tsx` 의 `#1d4ed8` 1건 — `ImageResponse` 내부 Tailwind 토큰 직접 호출 불가 → 코드 코멘트 명시 + 토큰 동기화 시 갱신 가이드. 나머지 3 파일 0 hit | pass |

**AC 합계 9 + COMMON 4 = 13건 전부 pass / 0 fail.**

## 3. 라운드트립 표

| # | 시나리오 | 응답 | 판정 |
| --- | --- | --- | --- |
| 1 | `/` (PR6 Home) 무회귀 | HTTP=200, 9 섹션 마커 15 hit, title FinSight | pass |
| 2 | `/dashboard` (PR7 Portfolio) 무회귀 | HTTP=200 | pass |
| 3 | `/analyze` (PR5 워크벤치) 무회귀 | HTTP=200 | pass |
| 4 | `/market` `/watchlist` `/profile` (PR8·PR9 예정) | HTTP=404 x3 + (main) 셸 + not-found 카드 (CTA 0) | pass |
| 5 | `/api/workbench/analyze` POST (BE 다운) | HTTP=502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` | pass |
| 6 | `/icon` favicon endpoint | HTTP=200 + image/png + 32x32 RGBA PNG 558B | pass |

양 뷰포트 (375 / 1280) — 본 PR 의 모든 변경은 글로벌 (title / favicon / catch-all) 또는 차트 렌더링 자체. SSR 마크업은 뷰포트 무관 동일 (Tailwind cascade). `(main)` 셸 안 not-found 카드는 PR3 시점 정착 `max-w-main-max-w` + `card-hero` 토큰 cascade — 두 뷰포트 자동 정합.

## 4. 에지 케이스

| # | 케이스 | 검증 | 결과 |
| --- | --- | --- | --- |
| E1 | `/foo-non-existent` 같은 (main) 외부 path | RSC pagePath tree 확인 | route group transparency 로 catch-all `[...not_found]` 가 **모든** path 매칭 → `(main)/not-found.tsx` 셸 안 렌더. 사용자 dev 실측 OK. 결과: 미구현 라우트는 일관되게 (main) 셸 안 not-found 노출 — UX 정합 |
| E2 | `/` 진입 시 사이드바 active `종목 분석` | curl /  SSR + 9 섹션 마커 | 무회귀 (15 hit) |
| E3 | catch-all 이 `/api/workbench/analyze` 와 충돌 안 함 | API POST + GET | POST 502 (BE 다운 폴백), GET 405 (Method Not Allowed) — 404 아님 → API 라우트 우선 매칭 무회귀 |
| E4 | ResizeObserver cleanup | `grep "disconnect" components/home/PriceChart.tsx` | L91 `return () => observer.disconnect();` — unmount 시 observer 해제 보장 |

## 5. 머지 게이트 부록 — PR8 (`/market`) base 정합

본 PR 머지 직후 main → PR8 base. 4 검증:

1. **route 우선순위**: PR8 의 `app/(main)/market/page.tsx` 신설은 본 PR 의 catch-all `[...not_found]` 보다 구체적 → Next 라우트 매칭 우선. `/market` 한정 본 PR catch-all 자연 무력화. PR8 진행 시 catch-all cleanup 불요 (다른 미구현 라우트 `/watchlist` `/profile` 가 여전히 본 PR catch-all 활용).
2. **(main) 셸 cascade**: 사이드바 + Header 본 PR 무회귀 (RSC tree 의 `(main)/layout.tsx` 마커 노출 확인) → PR8 `/market` 도 동일 셸 자동 적용.
3. **recharts 패턴 인계**: PR8 가 차트 사용 시 본 PR 의 ResizeObserver 직접 측정 패턴 (`components/home/PriceChart.tsx` L71~L160) 재활용 권장. ResponsiveContainer 사용 시 width(-1) 경고 재발 가능.
4. **글로벌 메타**: favicon + title 변경은 모든 라우트 글로벌 (root `app/layout.tsx`). PR8 무영향 (자동 cascade).

부적합 0 — PR8 진입 시 본 chore 보정/인계 commit 필요 없음.

## 6. 사용자 실측 인계

- 2026-05-24 사용자 dev 실측 OK 항목:
  - 브라우저 탭 title `FinSight` 표기.
  - 브라우저 탭 favicon — 파란 배경 + 흰 Activity 아이콘.
  - 브라우저 콘솔 recharts `width(-1) and height(-1)` 경고 0건 (캐시 클리어 후).
  - `/market` 등 미구현 라우트 진입 시 사이드바 + Header + not-found 카드 노출, 홈 CTA 부재.
- QA 자동 측정 한계: dev mode 콘솔 경고는 dev log forward 의존 → 사용자 dev실측이 1차 근거. 본 PR 의 RECHART-1 은 사용자 dev실측 영역 명시.

## 7. 결론 + 라벨

- 13 AC 전부 pass / 0 fail.
- 라운드트립 6건 전부 pass.
- 에지 4건 검증 완료 (E1 의 route group transparency 거동 확인 — 본 PR 의 catch-all 이 미구현 (main) 라우트 + 외부 path 모두 (main) 셸 안 not-found 로 흡수 → 일관 UX).
- 머지 게이트 4 검증 pass.
- 사용자 dev 실측 OK 인계 명시.

**판정: qa-passed.** `impl-ready` 라벨 제거 + `qa-passed` 라벨 부여 + HANDOFF append workflow 트리거.

라벨 부여 전 PR #34 본문에 `## 다음 작업` 섹션 존재 확인 — PR8 진입 + favicon hex 토큰 동기화 가이드 + SSR recharts 경고 별도 작업 후보 3건 명시. 게이트 통과.
