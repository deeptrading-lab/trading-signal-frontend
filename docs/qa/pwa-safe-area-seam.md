# QA 리포트 — 설치형 PWA 상단 navbar safe-area 확장 (`pwa-safe-area-seam`)

- 대상 PR: #60 (`feature/pwa-safe-area-seam`, head `a75b733`)
- PRD: 없음 — PR 본문/수정 의도에서 AC 도출 (5개 + 공통 AC).
- 환경: 로컬 macOS. FastAPI BE 미가동(`127.0.0.1:8000` → 000) — 본 PR 은 순수 layout/CSS 변경으로 API 의존이 없어 BE 라운드트립 비대상.
- 판정: **PASS** — 로컬 검증 가능한 5개 AC + 공통 AC 전부 통과. 단, **시각적 seam 제거·상태바/홈인디케이터 비가림은 설치형 PWA 디바이스 전용 잔여**(§3) 로 분리.

> 변경 파일 3개: `app/layout.tsx`(viewport.viewportFit "cover"), `app/components.css`(`.header-glass`·`.bottom-nav` safe-area 패딩 + h→min-h), `app/(main)/layout.tsx`(main spacer + 하단 인셋). 코드 컴포넌트·copy·API·타입 무변경.

---

## 1. AC 별 검증표 (로컬 검증 가능)

| AC | 기대 | 검증 방법 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 빌드/타입 | `npm run build` 성공 + 타입 에러 0 | `npm run typecheck` / `npm run build` | typecheck 무출력(0에러), build `✓ Generating static pages (28/28)` + Route 표 정상 출력 | PASS |
| AC-2 CSS emit | 컴파일 CSS 에 헤더 `env(safe-area-inset-top)`·바텀nav `env(safe-area-inset-bottom)`·`min-height` 실제 emit | 빌드 산출 CSS grep | (§2.1 참조) `.header-glass{...min-height:60px...padding-top:env(safe-area-inset-top)}`, `.bottom-nav{...min-height:60px;...padding-bottom:env(safe-area-inset-bottom)...}` | PASS |
| AC-3 무회귀(핵심) | 인셋 0 환경에서 헤더·바텀nav 60px 유지 + 글래스 색(bg-surface/80) 무변경 | CSS 레벨 논증 (§2.2) | `min-height:60px` 보존, `env()`→인셋 0 시 padding 0, 글래스 `background-color:#fffc`/`lab(... /.8)`(=surface/80) 무변경, main spacer `calc(60px + env())`→인셋0 시 60px | PASS |
| AC-4 viewport-fit 메타 | `<meta name="viewport" ... viewport-fit=cover>` 실제 출력 | 빌드 prerendered HTML + dev 라이브 렌더 | 9개 prerendered HTML 전부 `content="width=device-width, initial-scale=1, viewport-fit=cover"`, dev `:3000` `/`·`/login`·`/market` 라이브 동일 출력 | PASS |
| AC-5 구조 정합 | header `items-center` + min-h + padding-top 에서 60px 콘텐츠 행 보존(h→min-h 가 콘텐츠 행을 깎지 않음) | 코드/CSS 논증 (§2.3) | `.header-glass` = `flex items-center ... min-h-navbar-h` + `padding-top:env(...)`. min-height 는 콘텐츠 행을 깎지 않고 패딩이 위에 얹힘. 인셋 0 시 60px 고정행과 동일 | PASS |

### 공통 AC

| 항목 | 실측 | 판정 |
|---|---|---|
| typecheck 0에러 | `tsc --noEmit` 무출력 | PASS |
| lint 0에러 | `eslint .` → 0 errors, 1 warning(`components/profile/StockDailyChart.tsx:238` 미사용 변수) — **본 PR 미변경 파일의 기존 경고**(`git diff main...HEAD` 에 해당 파일 0건), 회귀 아님 | PASS |
| build 0에러 | Turbopack 빌드 성공, 28/28 정적 페이지 | PASS |
| BFF 단방향 무회귀 | `git grep "http://127\.0\.0\.1" -- app/` → `whitelist/search`·`workbench/_adapters/fastapi.ts` route handler fallback 만(규칙상 제외). 클라이언트 직접 `fetch(` 0건 | PASS |
| 한글 톤 무회귀 | 본 PR 은 copy/노출 문구 무변경(layout/CSS 3파일만). 회귀 표면 없음 | PASS |
| 접근성 무회귀 | Header(`role="banner"`·brand `aria-label`·profile `aria-label`)·BottomNav(`aria-label="하단 메뉴"`·`aria-current`·`aria-disabled`) 마크업 무변경. min-h 전환은 ARIA/Tab 순서 무영향 | PASS |

---

## 2. 검증 상세 (실행·논증)

### 2.1 CSS emit (AC-2) — 빌드 산출 CSS grep

빌드 후 `.next/static/chunks/0mi0_gobvs-tq.css` (69,104 bytes) 에서:

```
$ grep -o "safe-area-inset-[a-z]*" <built.css> | sort | uniq -c
   3 safe-area-inset-bottom
   1 safe-area-inset-top
```

해당 규칙 실측 (관련 선언만 발췌):

```css
.header-glass{ ... min-height:60px; ... background-color:#fffc;
  background-color:lab(100% -.0000298023 .0000119209/.8);
  border-color:#eceff3;border-bottom-width:1px;
  justify-content:space-between;align-items:center;padding-inline:14px;display:flex}
.header-glass{padding-inline:24px}            /* lg:px-2xl */
.header-glass{padding-top:env(safe-area-inset-top)}   /* ← 신규 */

.bottom-nav{ ... min-height:60px; ... padding-bottom:env(safe-area-inset-bottom);  /* ← 신규 */
  background-color:#fffc;background-color:lab(100% -.0000298023 .0000119209/.8);
  border-color:#eceff3;border-top-width:1px;
  justify-content:space-around;align-items:stretch;display:flex}

.pb-\[calc\(...navbar-h...env\(safe-area-inset-bottom\)\)\]{
  padding-bottom:calc(60px + env(safe-area-inset-bottom))}   /* ← main spacer */
```

- 헤더 `padding-top:env(safe-area-inset-top)` ✓ / 바텀nav `padding-bottom:env(safe-area-inset-bottom)` ✓
- 양쪽 `min-height:60px`(=`min-h-navbar-h`, 토큰 `navbar-h=60px`) ✓
- main spacer `pb-[calc(theme(spacing.navbar-h)+env(safe-area-inset-bottom))]` → `calc(60px + env(safe-area-inset-bottom))` ✓
- `safe-area-inset-bottom` 3건 = 바텀nav 1 + main spacer 1 + (Tailwind 변형 유틸 정규화로 1 추가). 의도된 두 위치 모두 emit 확인.

### 2.2 무회귀 (AC-3) — 인셋 0 환경 CSS 논증

데스크탑/일반 브라우저 탭은 `viewport-fit=cover` 의 효과(가장자리 확장)가 적용되지 않거나 노치가 없어 `env(safe-area-inset-*)` 가 **0** 으로 해석된다. 따라서:

- 헤더: `padding-top: env(safe-area-inset-top)` → `padding-top: 0`. `min-height:60px` 만 남아 **기존 고정 60px 와 동일**(콘텐츠가 60px 미만이므로 정확히 60px).
- 바텀nav: `padding-bottom: env(safe-area-inset-bottom)` → 0. `min-height:60px` 유지 → **기존 60px 동일**.
- main spacer: `calc(60px + env(safe-area-inset-bottom))` → `calc(60px + 0)` = **60px**(기존 `pb-navbar-h` 와 동일).
- 글래스 색: `background-color:#fffc` + `lab(100% .../.8)` 로 컴파일 = `bg-surface/80` 그대로. **색/투명도 무변경 확인** (PR 의도 = 색 무변경, 영역만 확장).

> `h-navbar-h`(고정 height) → `min-h-navbar-h`(최소 height) 전환의 무회귀 안전성: 헤더·바텀nav 내부 콘텐츠(로고 36px 배지·프로필 40px hit-area·nav 아이콘+라벨)가 모두 60px 미만이므로 min-height 가 곧 실제 height 60px 로 고정된다. 콘텐츠가 60px 를 넘을 일이 없어 `h`→`min-h` 가 시각적 높이를 바꾸지 않는다.

### 2.3 구조 정합 (AC-5)

`.header-glass = flex items-center justify-between min-h-navbar-h ... + padding-top:env(safe-area-inset-top)`.

- `items-center` 는 **콘텐츠 박스**(=content-box, 패딩 안쪽 60px 행) 기준 수직 중앙 정렬. `padding-top` 으로 상태바 높이만큼 위로 얹혀도 로고/프로필은 그 아래 60px 콘텐츠 행 안에서 중앙 정렬을 유지한다.
- `min-h` 는 콘텐츠 행(60px)을 **깎지 않고**(고정 height 가 패딩을 흡수해 콘텐츠를 압축하는 box-sizing 부작용 없음) 패딩이 추가 높이로 위에 적층되는 구조. 의도대로 동작.

### 2.4 viewport-fit 메타 (AC-4) — 빌드 + 라이브

빌드 prerendered HTML 9종(`index/login/market/watchlist/dashboard/profile/stock/analyze/_not-found`) 전부:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
```

dev 라이브(`:3000`) `/`·`/login`·`/market` 동일 출력 확인. Next `viewport` export → meta 자동 주입 정상.

---

## 3. 디바이스 전용 잔여 — 배포 후 실제 폰 실측 필요 (로컬 검증 불가)

> 본 변경은 **설치형 PWA(iOS/Android 홈 화면 추가, standalone)** 에서만 시각적으로 드러난다. 로컬 브라우저/데스크탑은 인셋이 0 이라 seam 제거 자체를 눈으로 확인할 수 없다. 아래는 **로컬 PASS 로 위장하지 않고** 디바이스 전용으로 분리한다.

| 항목 | 기대 | 상태 |
|---|---|---|
| D-1 상단 경계선(seam) 제거 | 순백 상태바 ↔ 글래스 헤더 사이 가로 경계선 사라짐 | **배포 후 폰 실측 필요** |
| D-2 헤더 상태바 비가림 | 로고/프로필 아이콘이 상태바에 가리지 않고 60px 콘텐츠 행에 정렬 | **배포 후 폰 실측 필요** |
| D-3 바텀nav 홈인디케이터 비가림 | BottomNav 아이템이 홈 인디케이터(하단 인셋) 위에 안 가림 | **배포 후 폰 실측 필요** |
| D-4 콘텐츠 스크롤 가림 없음 | main 하단 spacer 가 인셋만큼 더 확보 → 마지막 콘텐츠가 바텀nav/인디케이터에 안 가림 | **배포 후 폰 실측 필요** (CSS calc 레벨은 §2.1 PASS) |

권장 실측 절차(배포 후): iOS Safari → 공유 → 홈 화면에 추가 → 앱 아이콘 실행(standalone) → 상단 경계선 유무·상태바 텍스트와 헤더 겹침·하단 홈 인디케이터와 nav 겹침 확인. Android Chrome 동일.

---

## 4. 에지 케이스

| 케이스 | 분석/결과 | 판정 |
|---|---|---|
| E-1 가로 모드(landscape) 좌우 노치 인셋 | 본 PR 은 `safe-area-inset-left/right` 미적용(상·하만). 가로 모드에서 노치 있는 기기는 좌우 콘텐츠가 노치에 가릴 수 있음 → **알려진 미적용 범위**(PR 본문 §다음 작업 에 명시됨, 추후 관찰 대상). 현 시점 회귀 아님(기존에도 좌우 인셋 미처리) | KNOWN-GAP (배포 후 관찰) |
| E-2 인셋 0 (데스크탑/탭) | `env()`→0, padding 0, min-h 60px → 기존 60px 무회귀 (§2.2) | PASS |
| E-3 `env()` 미지원 구형 브라우저 | CSS `env()` 미지원 시 선언 자체 무시(invalid value) → padding 미적용, min-h 60px 유지 → 안전 폴백 | PASS |
| E-4 StrictMode 더블 마운트 | layout/CSS 변경뿐, 상태/이펙트 무추가 → 영향 없음 | PASS |
| E-5 `min-h` 전환 시 콘텐츠 초과 | 헤더/바텀nav 콘텐츠 최대 높이(배지 36/hit-area 40/아이콘+라벨 ~44px) < 60px → min-h 가 실제 height 60px 고정, 초과 없음 | PASS |
| E-6 Tailwind preflight 잔여물 | 본 PR globals.css 무변경. 합성 토큰만 `@apply` + 직접 선언(env) — preflight 영향 없음 | PASS |
| E-7 next-env.d.ts 변경 | 워킹트리에 `next-env.d.ts`(dev↔prod routes 경로 스왑) 가 빌드 부산물로 변경됨 → Next 자동생성("should not be edited") 파일이라 QA 가 `git checkout` 으로 복원. PR diff 비포함 | NOTE (조치 완료) |

---

## 5. 실행 명령 요약

```
npm run typecheck      # 무출력 (0 에러)
npm run lint           # 0 errors, 1 warning(미변경 파일 기존)
npm run build          # ✓ Generating static pages (28/28)
grep safe-area-inset   <built.css>  # header top 1 / bottom-nav+spacer
grep viewport-fit      .next/server/app/*.html  # 9종 전부 cover
curl :3000/login | grep viewport   # 라이브 cover 확인
git grep http://127.0.0.1 -- app/  # route fallback만(규칙상 제외)
```

---

## 판정

- **로컬 검증 가능한 5개 AC + 공통 AC 전부 PASS.** 실패 0건.
- 시각적 seam 제거·상태바/홈인디케이터 비가림(D-1~D-4)은 **설치형 PWA 디바이스 전용 잔여**로 분리 — 배포 후 폰 실측 필요.
- 가로 모드 좌우 인셋(E-1)은 본 PR 범위 밖 KNOWN-GAP (PR 본문 §다음 작업 명시).
- → PR #60 에 `qa-passed` 라벨 부여 가능. PR 본문 `## 다음 작업` 섹션 존재 확인(handoff workflow 트리거 안전).
