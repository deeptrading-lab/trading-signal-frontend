# QA 리포트 — pwa-navbar-opaque-seam (PR #61)

- 브랜치: `feature/pwa-navbar-opaque-seam` (HEAD `3c788dc`)
- 성격: **#60 follow-up (단순화)**. #60 에서 풀 QA 통과한 동일 헤더 영역에서 navbar 의 배경 1줄만 변경.
- 변경 본질: `app/components.css` `.header-glass` 의 `@apply ...` 에서 `bg-surface/80 backdrop-blur-md` → `bg-surface`(불투명 #ffffff). 나머지 코멘트는 동일 commit 의 설명 갱신.
- 목적: iOS·Android 공통으로 navbar 색을 상태바 `theme_color`(#ffffff) 와 100% 동일화 → 경계선(seam) 제거.
- 유지(무변경): `padding-top: env(safe-area-inset-top)` + `min-h-navbar-h`(60px), `viewportFit: "cover"`(layout.tsx), BottomNav 글래스(`bg-surface/80 backdrop-blur` + `env(safe-area-inset-bottom)`).

## 변경 diff (기능)

```
.header-glass {
-  @apply ... min-h-navbar-h bg-surface/80 backdrop-blur-md border-b border-border-line ...;
+  @apply ... min-h-navbar-h bg-surface          border-b border-border-line ...;
   padding-top: env(safe-area-inset-top);
}
```

기능 변경 라인 = 1줄. `git diff main...HEAD --stat` = `app/components.css | 22 (+14/-8)` 중 14/8 은 코멘트 갱신.

## 토큰·정합 사전 확인

| 항목 | 값 | 출처 |
|---|---|---|
| `bg-surface` | `#ffffff` | `tailwind.theme.json:6` |
| `navbar-h` | `60px` | `tailwind.theme.json:233` |
| manifest `theme_color` | `#ffffff` | `app/manifest.ts:19` |
| viewport `themeColor` | `#ffffff` | `app/layout.tsx:99` |
| `viewportFit` | `"cover"` | `app/layout.tsx:100` |

→ navbar 배경(`#ffffff`) = 상태바(`#ffffff`) 정확 일치. PR 메커니즘의 전제가 코드로 확인됨.

## AC 별 검증 (로컬)

| # | AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | build + 타입 0에러 | `npm run typecheck` / `npm run lint` / `npm run build` | 0 에러, 빌드 성공 | typecheck 0에러 · lint **0 errors**(1 warning: `StockDailyChart.tsx:238` 미사용 `i` — **이 PR diff 밖, main 기존**) · build `Compiled successfully` 전 라우트 출력 | PASS |
| 2 | 컴파일 CSS 정합 | 프로덕션 CSS(`.next/static/chunks/08nnw4dyigibd.css`)에서 `.header-glass`/`.bottom-nav` 규칙 추출 | 헤더 `background-color:#fff`(불투명)·`backdrop-filter` 제거·`min-height:60px`·`padding-top:env(safe-area-inset-top)`·`border-b` 유지 / BottomNav 글래스(backdrop-filter) 유지 | 아래 발췌 — 전부 일치 | PASS |
| 3 | 무회귀(색/행/정렬/데스크탑) | 토큰 비교 + 컴파일 규칙 비교 + 정지 상태 색 | 정지 navbar 색이 기존 글래스(≈#fdfdfe)와 사실상 동일(흰색), 60px 행·`border-b`·`px` 무변경, 데스크탑·일반 탭 무영향 | `bg-surface`=#ffffff(불투명) vs 기존 `/80` 합성≈#fdfdfe → 육안 차 없음. `min-height:60px`·`padding-inline:14px`/lg `24px`·`border-bottom-width:1px #eceff3` 모두 동일 유지. `env(safe-area-inset-top)` 은 데스크탑/일반 탭에서 0 → `min-h 60px` 가 지배 → 기존 `h-navbar-h 60px` 행과 동등 | PASS |

### AC-2 증거 — 프로덕션 컴파일 CSS 발췌

```css
.header-glass{ ...background-color:#fff; border-color:#eceff3; border-bottom-width:1px;
  justify-content:space-between; align-items:center; min-height:60px; padding-inline:14px; display:flex }
@media (min-width:1024px){ .header-glass{padding-inline:24px} }
.header-glass{ padding-top:env(safe-area-inset-top) }     /* 별도 룰로 emit, 유지 확인 */

.bottom-nav{ ...--tw-backdrop-blur:blur(12px); backdrop-filter:...;
  background-color:#fffc; /* ≈ #fff 80% */ padding-bottom:env(safe-area-inset-bottom); ... }
```

- 헤더: `background-color:#fff` 불투명, **헤더 블록 내 `backdrop-filter` 없음**(blur 제거 확인), `min-height:60px`·`border-b`·`padding-top:env(safe-area-inset-top)` 유지.
- BottomNav: `backdrop-filter` + `background-color:#fffc`(반투명) **글래스 유지** + `padding-bottom:env(safe-area-inset-bottom)` 유지.

## 공통 AC 무회귀

| 항목 | 결과 |
|---|---|
| BFF 원칙 (`git grep http://127.0.0.1 -- app/`, route handler 제외) | 0건. hit 2건은 `app/api/workbench/_adapters/fastapi.ts`(route handler 서버측 fallback) — 허용 예외 |
| 한글 톤 | CSS-only 변경, 사용자 노출 문구 변동 없음 → 무회귀 |
| 접근성 | DOM 구조·aria·label·Tab 순서 무변경(배경색만) → 무회귀 |

## 라운드트립(스모크)

- 기존 dev 서버(PID 93511, 동일 브랜치 HEAD `3c788dc`, cwd=본 레포)가 `:3000` 점유 중 → 신규 인스턴스 대신 해당 서버로 스모크. (사용자 세션이라 종료하지 않음.)
- `GET /` → `200 OK`, SSR HTML 에 `header-glass` 클래스 존재(헤더 정상 마운트). `GET /analyze` → `200`, `header-glass` 존재.
- `GET /login` → `200`.
- 색/blur 의 최종 판정 근거는 **프로덕션 build CSS**(merge 산출물). Turbopack dev 청크는 `@apply` 를 변수로 분해해 분할 emit 하므로 dev 청크 단독 grep 은 비-load-bearing — production CSS 로 확정.

## 디바이스 전용 (로컬 불가 — PASS 미판정, 배포 후 실기기 필수)

- **iOS 설치형 PWA**: 상단 상태바 ↔ navbar 흰색 경계선 제거 — 실기기 확인 필요.
- **Android(One UI 등) 설치형 PWA**: 동일 경계선 제거 — 실기기 확인 필요. (#60 iOS 중심 글래스 확장이 Android 무효였던 회귀의 핵심 검증 포인트.)
- 헤더 로고/프로필 정렬·하단 BottomNav 홈인디케이터 비가림 — 실기기 시각 확인 권장.

## KNOWN-RISK / KNOWN-GAP

- **KNOWN-RISK (Android)**: 잔존 경계선이 색 차이가 아니라 시스템 status bar **elevation 그림자**일 경우, navbar 색 동일화만으로는 제거되지 않을 수 있음. 그 경우 edge-to-edge(콘텐츠를 상태바 밑까지) 방식 별도 검토 필요. (PR 본문 `## 다음 작업` 에 명시됨.)
- **KNOWN-GAP (landscape)**: 좌우 노치 인셋(`env(safe-area-inset-left/right)`) 미적용 — 본 PR 범위 밖 유지.

## 종합

- 로컬 가능 AC(1·2·3) **전부 PASS**. 공통 AC 무회귀. 디바이스 전용 항목은 배포 후 실기기로 분리(PASS 위장 없음).
- PR 본문 `## 다음 작업` 섹션 존재 확인 → `qa-passed` 라벨 게이트 충족.

판정: **qa-passed** (로컬 AC 전부 통과, 디바이스 항목은 KNOWN-RISK 동반 분리)
