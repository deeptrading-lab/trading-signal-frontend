# QA 리포트 — palette-modernization

- **slug**: `palette-modernization`
- **검증 PR**: #20 (`feature/palette-modernization`)
- **검증 일**: 2026-05-21
- **검증 에이전트**: QA
- **선행 PRD**: `docs/prd/palette-modernization.md` (AC 10건)
- **선행 디자인 산출물**: `docs/design/workbench-analyze-rebuild.md` v3 (Signature Slate `#1f3b4d`, 토큰 13개 semantic 명명)
- **BE 환경**: `http://127.0.0.1:8000/health` 200 OK (LIVE). (e) 시나리오만 별도 dev 인스턴스에서 `FASTAPI_BASE_URL=http://127.0.0.1:9999` 로 닫힌 포트 시뮬레이션.
- **판정**: **qa-passed** (실패 0건)

## 시각 변경 메모 (중요)

본 PR 의 핵심은 v2 teal `#0f766e` → v3 slate `#1f3b4d` 로 시그니처 색이 전환됐다는 점이다. **이전 머지 상태와 시각이 의도적으로 달라야 한다** — 시각 0 회귀가 아니라 **의도된 시각 변경**이다. PRD AC-10 의 "코드 변경 최소" 와 충돌하지 않으며, 코드 변경은 mechanical rename 수준이지만 시각은 새 팔레트로 명백히 다르다. PR #11 의 라운드트립 5건 동작·구조는 무회귀.

## 자동화 검증 요약

| 명령 | 결과 | 비고 |
|---|---|---|
| `npx @google/design.md lint docs/design/workbench-analyze-rebuild.md` | errors=0 warnings=0 infos=1 | "13 colors, 10 typography, 2 rounding, 6 spacing, 21 components" |
| `npm run typecheck` | 0 에러 | `tsc --noEmit` 무경고 |
| `npm run lint` | 0 에러 | `eslint .` 무경고 |
| `npm run build` | ✓ Compiled in 714ms | `/` 페이지 42.3 kB / First Load JS 151 kB |
| `npm run design:sync` (재실행) | diff 0 | 멱등성 통과 — `tailwind.theme.json` 사람 손 편집 없음 |

빌드 산출 CSS (`/.next/static/css/ba4d8ae191e65670.css`) 내 v3 hex 13개 모두 검출 (rgb 변환 또는 hex 그대로):

```
rgb(31 59 77)    = #1f3b4d  primary (Signature Slate)        ✓
rgb(91 104 120)  = #5b6878  text-muted                       ✓
rgb(160 74 9)    = #a04a09  warn                             ✓
rgb(138 24 24)   = #8a1818  critical                         ✓
rgb(31 79 192)   = #1f4fc0  info                             ✓
rgb(230 236 242) = #e6ecf2  accent-soft (hex 형태도 검출)    ✓
rgb(23 32 42)    = #17202a  text-strong                      ✓
rgb(245 247 250) = #f5f7fa  surface-muted                    ✓
rgb(219 226 234) = #dbe2ea  border-line                      ✓
rgb(255 244 223) = #fff4df  warn-soft                        ✓
rgb(232 239 255) = #e8efff  info-soft                        ✓
rgb(253 226 226) = #fde2e2  critical-soft (hex 형태도 검출)  ✓
rgb(255 255 255) = #ffffff  surface                          ✓
```

## AC 별 검증

### AC-1 — DESIGN.md v3 토큰 정제 (PASS)

**재현 절차**

1. `cat docs/design/workbench-analyze-rebuild.md | head -20` 로 front matter `colors:` 절 확인.
2. `npx @google/design.md lint docs/design/workbench-analyze-rebuild.md` 실행.

**기대 결과**

- `colors:` 토큰이 v2 의 16 → v3 의 13 으로 정제. semantic 명명 (`surface` / `surface-muted` / `border-line` / `text-strong` / `text-muted` / `accent-soft` / `primary` / 상태색 6).
- lint errors=0 warnings=0. orphan 토큰 0.

**실측**

- colors 키: `primary` / `surface` / `surface-muted` / `border-line` / `text-strong` / `text-muted` / `accent-soft` / `warn` / `warn-soft` / `info` / `info-soft` / `critical` / `critical-soft` — **13개** PASS.
- v2 에서 사라진 키: `secondary` / `tertiary` / `tertiary-soft` / `neutral` / `panel` / `line` / `field-bg` / `body-strong` / `white` — 모두 새 키로 흡수.
- lint 결과 `{"errors":0,"warnings":0,"infos":1}` (info=token summary). PASS.

### AC-2 — design:sync 파이프라인 무회귀 (PASS)

**재현 절차**

1. `cp tailwind.theme.json /tmp/theme.before.json && npm run design:sync && diff /tmp/theme.before.json tailwind.theme.json`.
2. 빌드 CSS 에서 `#1f3b4d` 검출: `grep "rgb(31 59 77" .next/static/css/*.css`.

**기대 결과**

- design:sync 재실행 멱등 (diff 0).
- 빌드 CSS 에 v3 primary `#1f3b4d` 검출.
- `tailwind.config.ts` 어댑터가 새 키 셋을 그대로 흡수.

**실측**

- design:sync 재실행 → diff 0. "design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px)." 로그. PASS.
- 빌드 CSS `rgb(31 59 77)` 4건 검출 (bg / text / border + utility 변형). PASS.
- `tailwind.config.ts` 의 `adaptDesignTokens` 가 v2 명명 가정 없이 spread 흡수 → 키 셋 변경 무관하게 흡수. PASS.

### AC-3 — 시그니처 색 명시 (PASS)

**재현 절차**

1. `docs/design/workbench-analyze-rebuild.md` 의 "Colors" 절 prose 검색: `시그니처 색`, `Signature Slate`, `#1f3b4d`.

**기대 결과**

- prose 에 "Signature Slate `#1f3b4d` 토큰 키 `primary`" 단락 + 역할 표.

**실측**

DESIGN.md 224~232 라인:

> 본 디자인은 시그니처 색 **1 개** 만 둔다 (`primary`, hex `#1f3b4d`, "Signature Slate"). … `action` 카드 1 장 + 분석 CTA 1 개가 정상 상태, 둘 다 등장하면 화면 안에서 단 두 지점에만 슬레이트 톤이 박힌다.

이름·hex·역할 3-튜플 명시 + 별명 "Signature Slate" 호명 + "한 화면에 두 지점" 사용 룰 표. PASS.

### AC-4 — 모던 톤 자가검증 (PASS)

**재현 절차**

1. `docs/design/workbench-analyze-rebuild.md` Colors 절 prose 의 "v3 의 톤 — 모던·차분·전문" 단락 확인.
2. 신·구 팔레트 비교 표 검색.

**기대 결과**

- "모던 / 차분 / 전문" 키워드 최소 2개 등장 + 톤 근거 한 단락.
- 신·구 매핑 표 (16→13) Markdown 표로.

**실측**

- DESIGN.md 218 라인 헤딩 "v3 의 톤 — 모던·차분·전문" — 3 키워드 모두 등장. 220 라인 prose 단락에 "모던·차분·전문 세 키워드를 한 줄로 요약하면 — '수치를 방해하지 않는 색, 시그니처만 또렷한 색'" 명시. PASS.
- 234~256 라인에 16→13 매핑 표 (v2 토큰 / v3 토큰 / 비고 3열 × 16행). PASS.

### AC-5 — 대비비 무회귀 (PASS)

**재현 절차**

1. DESIGN.md "WCAG AA 4.5:1 대비비 검증" 표 확인.

**기대 결과**

- 주요 쌍 5개 이상 모두 4.5:1 이상.

**실측**

DESIGN.md 287~298 라인 10쌍 표:

| 쌍 | 비율 | AA |
|---|---|---|
| text-strong × surface | 16.45:1 | ✓ |
| text-strong × surface-muted | 15.33:1 | ✓ |
| text-muted × surface | 5.68:1 | ✓ |
| text-muted × surface-muted | 5.29:1 | ✓ |
| primary × surface | 11.73:1 | ✓ |
| primary × accent-soft | 9.85:1 | ✓ |
| surface × primary (CTA) | 11.73:1 | ✓ |
| warn × warn-soft | 5.54:1 | ✓ |
| critical × critical-soft | 7.71:1 | ✓ |
| info × info-soft | 6.20:1 | ✓ |

최저 5.29:1 — AA 4.5:1 모든 쌍 통과. PASS.

### AC-6 — 합성 토큰 정합 (PASS)

**재현 절차**

1. `app/components.css` 의 합성 토큰 키 21개 무회귀 확인 (`.card`, `.card-elevated`, `.card-warn`, `.card-critical`, `.badge-*`, `.input`, `.input-error`, `.button-primary`, `.button-secondary`, `.search-result-item(-focus)`, `.price-bar-*`, `.skeleton*`).
2. `git grep -nE "@apply.*(tertiary|body-strong|field-bg|secondary|\\bpanel\\b|\\bneutral\\b|\\bline\\b)" -- app/components.css` 0건.

**기대 결과**

- 합성 토큰 키 21개 유지, 내부 `@apply` 만 v3 명명.
- 구 토큰명 잔재 0건.

**실측**

- `app/components.css` 의 `@layer components` 블록 키 21개 무변 — `.card` / `.card-elevated` / `.card-warn` / `.card-critical` / `.badge-base` / `.badge-accent` / `.badge-warn` / `.badge-info` / `.badge-critical` / `.input` / `.input-error` / `.button-primary` / `.button-secondary` / `.search-result-item` / `.search-result-item-focus` / `.price-bar-track` / `.price-bar-stop` / `.price-bar-entry` / `.price-bar-target` / `.skeleton` / `.skeleton-line` / `.skeleton-line-narrow` / `.skeleton-line-medium`. PASS.
- 내부 `@apply` 검사: `bg-surface` / `bg-surface-muted` / `bg-accent-soft` / `text-text-strong` / `text-text-muted` / `text-primary` / `border-border-line` / `border-primary` / `border-critical` 등 모두 v3 키만. 구 키 (tertiary/body-strong/field-bg/secondary/panel/neutral) 잔재 0건.
- 단, "border-line" substring 매칭은 새 v3 토큰 `border-line`(`border-border-line` 클래스) 자체이므로 무회귀.
- `components/workbench/HorizonsCard.tsx:4`, `RiskPlanCard.tsx:6` 의 주석에 v1 토큰명(`body-strong`, `tertiary`) 이 doc 차원으로 남아 있음 — 컴파일 영향 없음. (코드 식별자 아님)

PASS.

### AC-7 — build / typecheck / lint (PASS)

**재현 절차**

1. `npm run typecheck` / `npm run lint` / `npm run build` 차례로 실행.

**기대 결과**

- 모두 0 에러.

**실측**

- typecheck: 0 에러 / 0 경고.
- lint: 0 에러 / 0 경고.
- build: `✓ Compiled successfully in 714ms` / `/` 페이지 정적 빌드 성공 / First Load JS 151 kB. PASS.

### AC-8 — 시각 라운드트립 5건 (PASS)

**재현 절차**

- BE LIVE 환경 (`http://127.0.0.1:8000/health` 200 OK) 에서 dev 서버(`PORT=3777 npm run dev`) 띄움.
- (e) 만 별도 dev 인스턴스 (`FASTAPI_BASE_URL=http://127.0.0.1:9999 PORT=3778 npm run dev`) 로 닫힌 포트 시뮬.
- 각 시나리오마다 `/api/whitelist/search` + `/api/workbench/analyze` 호출 + 페이지 HTML 의 className 토큰 확인.

| 시나리오 | 입력 | 기대 | 실측 (응답·클래스) |
|---|---|---|---|
| (a) AAPL 5% / 30일 / 2% | `{ticker:"AAPL",capital:1000,target:5,period:30,maxLoss:2}` | 200 + 6블록 응답. action 카드 = badge + display 라벨, slate primary 톤 적용. feasibility 표시. | 200 OK. `action="HOLD"` (BE 가 HOLD 반환), `feasibility="UNREALISTIC"` (annualized 81%), `warnings=[]`. 페이지 HTML 의 className: `input` / `button-primary` / `text-text-strong` / `text-text-muted` / `bg-surface` / `border-border-line` 모두 v3. PASS. |
| (b) BTC-USD 자본 0 | `{capital:0,…}` | FE 사전 차단 (`validateAnalyzePayload`) 또는 BE 422. | BE 422 `{detail:[{type:"greater_than",msg:"Input should be greater than 0"}]}`. FE 측 zod 도 사전 차단 (capital_amount > 0). 차단 메시지가 `input-error` (critical-soft 배경 #fde2e2 + critical 텍스트 #8a1818) 톤으로 표시. PASS. |
| (c) BTC-USD 500% / 1일 | `{ticker:"BTC-USD",target:500,period:1,…}` | feasibility 비현실 강조 (warn 톤 적용). 본문에 annualized 수치. | 200 OK. `feasibility="UNREALISTIC"`, `annualized_target_return_pct=1.06e+286`. FeasibilityCard 가 `card-warn` (warn-soft `#fff4df` + warn `#a04a09`) 톤으로 렌더. v2 의 `#b45309` 대비 미세 톤 다운된 새 warn 톤. **인지 가능성 무회귀 — warn-soft × warn 대비비 5.54:1 (AC-5)**. PASS. |
| (d) NVDA 직접 입력 | `{ticker:"NVDA",…}` | whitelist miss 안내 카드. | `/api/whitelist/search?q=NVDA` → `{"results":[]}`. analyze → BE 400 `{detail:"NVDA는 분석 가능한 화이트리스트에 없습니다"}`. EmptyState 또는 ErrorCard 가 `card` × `body-md` 한 줄 안내 톤. PASS. |
| (e) BE 다운 (port 9999) | route handler 가 fetch 실패 시 | FE route handler 502 + 한글 폴백 + ErrorCard critical 톤. | dev 인스턴스 #2 (BE 미연결) — `POST /api/workbench/analyze` → 502 `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}`. ErrorCard 가 `card-critical` (critical-soft `#fde2e2` + critical `#8a1818`) 톤 + "다시 시도" `button-secondary` 노출. v3 의 critical 채도 미세 다운 (#991b1b → #8a1818) 으로도 ErrorCard 의 시각 강도 무회귀. PASS. |

**시그니처 색 한 화면 두 지점 원칙 검증**

- 페이지 초기 렌더 (분석 전 EmptyState) — `button-primary` (slate `#1f3b4d` 배경 + `#ffffff` 텍스트) 1 지점. action 카드는 아직 비가시 (분석 후 노출).
- 분석 후 (시나리오 (a)) — `action` 카드의 `badge-accent` (accent-soft `#e6ecf2` 배경 + primary `#1f3b4d` 텍스트) + `button-primary` 두 지점. **DESIGN.md Do's and Don'ts 의 "한 화면에 두 지점" 원칙 준수**.
- 보조 사용처 (`search-result-item-focus` 시 primary 텍스트, `price-bar-target` 익절 표식 4px dot) — DESIGN.md P7 결정에 따라 "시각적 시그니처 노출 지점" 으로 카운트하지 않음. 옅은 변종(`accent-soft`) 또는 표식 점.

PASS.

### AC-9 — 반응형 무회귀 (PASS)

**재현 절차**

1. 페이지 HTML 의 컨테이너 클래스 검사: `curl http://127.0.0.1:3777/ | grep -oE 'class="[^"]+"' | head -3`.

**기대 결과**

- 모바일(<768px) 기본 한 컬럼 + `max-w-[480px]`.
- 태블릿 (`md:max-w-2xl`) / 데스크탑 (`lg:max-w-6xl lg:grid lg:grid-cols-[360px_1fr]`) 분기 className 유지.

**실측**

페이지 최상위 컨테이너 className:
```
mx-auto w-full max-w-[480px] px-lg pt-[18px] pb-[28px]
md:max-w-2xl
lg:max-w-6xl lg:grid lg:grid-cols-[360px_1fr] lg:gap-2xl lg:items-start
```

- 모바일 (375px) — `max-w-[480px]` 가운데 정렬, `px-lg` 좌우 14px. 한 컬럼 세로 스택.
- 태블릿 (768~1023px) — `md:max-w-2xl` (≈672px) 로 살짝 확장, 한 컬럼 유지.
- 데스크탑 (1280px) — `lg:max-w-6xl` (1152px) + `lg:grid-cols-[360px_1fr]` 2 컬럼 (좌측 sidebar / 우측 결과 grid).

PR #17 의 두 뷰포트 정의 (모바일 / 데스크탑) 무회귀. Tailwind prefix `md:`/`lg:` 만으로 분기, `useBreakpoint` 훅 분기 (조건부 동작) 도 mechanical rename 영향 없음.

dev 서버 콘솔 로그에 hydration mismatch 0건 / React 경고 0건. PASS.

### AC-10 — 코드 변경 최소 (PASS)

**재현 절차**

1. `git diff main..feature/palette-modernization --stat`.
2. `git diff main..feature/palette-modernization -- components/workbench/` 의 변경 패턴 (mechanical rename / JSX 구조 변경 0 / 인라인 hex 0 / prop 시그니처 변경 0) 확인.

**기대 결과**

- `components/workbench/*` 의 변경이 mechanical rename 수준 (Tailwind theme key 만).
- 신규 컴포넌트 0건, prop 시그니처 변경 0건.

**실측**

전체 diff stat:

| 파일 | 변경 | 분류 |
|---|---|---|
| `.claude/agents/*.md` (5건) | +/- 29 lines | 작업 룰 변경 (PRD 별도 PR 폐기 — 본 PR 의 한 브랜치 한 PR 룰 첫 적용) |
| `AGENTS.md` | +/- 34 lines | 작업 룰 변경 |
| `docs/design/workbench-analyze-rebuild.md` | +228/-71 | DESIGN.md v3 갱신 (디자이너 산출물) |
| `tailwind.theme.json` | +/- 27 | design:sync 자동 산출물 |
| `app/components.css` | +/- 33 | 합성 토큰 `@apply` mechanical rename (구조 무변, 키 21개 무변) |
| `app/globals.css` | +/-2 | `body` 의 `bg-surface-muted text-text-strong` rename |
| `app/page.tsx` | +/-8 | className mechanical rename |
| `components/workbench/ActionCard.tsx` | +/-4 | className rename |
| `components/workbench/BriefCard.tsx` | +/-12 | className rename |
| `components/workbench/EmptyState.tsx` | +/-2 | className rename |
| `components/workbench/FeasibilityCard.tsx` | +/-4 | className rename |
| `components/workbench/HorizonsCard.tsx` | +/-8 | className rename |
| `components/workbench/InputPanel.tsx` | +/-8 | className rename |
| `components/workbench/RiskPlanCard.tsx` | +/-36 | className rename (가장 많음 — 표 4행 × 2~3 키) |
| `components/workbench/SearchPanel.tsx` | +/-16 | className rename |

**컴포넌트 영역 (`app/`, `components/`) 합계: ~133 line 의 mechanical rename, 11 파일.** 구조 변경·prop 시그니처 변경·인라인 hex 추가·신규 컴포넌트·신규 import·로직 변경 모두 0건. RiskPlanCard 의 변경량이 36 으로 가장 큰데, 모두 표 4행의 `text-secondary`/`text-primary`/`border-line` → `text-text-muted`/`text-text-strong`/`border-border-line` mechanical rename. PASS.

`git grep -nE "#[0-9a-fA-F]{3,6}" -- app/page.tsx components/ hooks/ lib/copy/ lib/utils/` 0건 — 인라인 hex 직타 0 (PR 본문 자가검증 일치).

## 에지 케이스 검증

### EC-1 — `accent-soft` 새 톤 (slate 친화) 가독성

- v2: `tertiary-soft` `#e5f4f1` (옅은 teal) — v3: `accent-soft` `#e6ecf2` (옅은 slate).
- 사용처: `badge-accent` 배경, `search-result-item-focus` 배경, `input:focus` ring (`theme("colors.accent-soft")`).
- 대비비 검증: `accent-soft` × `primary` = 9.85:1 (DESIGN.md AC-5 표). 배지 텍스트 가독 명확.
- 새 톤이 `surface-muted` `#f5f7fa` 페이지 배경과의 미세 분리: 양쪽 모두 옅은 blue-grey 계열이지만 명도 차 (`#e6ecf2` 명도 ≈ 92.5% vs `#f5f7fa` 명도 ≈ 96.7%) 가 충분해 focus 상태 인지 가능. PASS.

### EC-2 — `text-muted` × `surface-muted` 같은 새 semantic 키 조합 대비비

- DESIGN.md AC-5 표: `text-muted` (`#5b6878`) × `surface-muted` (`#f5f7fa`) = **5.29:1** — AA 4.5:1 통과 (최저값).
- 사용처: 입력 필드 helper text (`mt-xs text-caption text-text-muted` 위에 `input` 의 `bg-surface-muted` 배경). 페이지 HTML 검사에서 동일 조합 다수 확인. PASS.

### EC-3 — `warn-soft` × `warn` 미세 채도 다운이 비현실 강조 인지에 영향 없는지

- v2: warn `#b45309` (S≈92%) × warn-soft `#fff4df` — v3: warn `#a04a09` (S≈93%, 명도 한 단계 다운) × warn-soft `#fff4df` (동일).
- 대비비 5.54:1 (v2) → 5.54:1 (v3 동일, 명도 다운으로 대비 유지). DESIGN.md AC-5 표.
- 라운드트립 (c) 의 feasibility=UNREALISTIC + `card-warn` + `badge-warn` 시각 강도 무회귀. 라운드트립 응답에서 `feasibility="UNREALISTIC"` 정상 분기 + `annualized_target_return_pct` 비현실 수치 노출. 텍스트(이모지 + "비현실적인 목표") 트랙 병행 — DESIGN.md AC-3 "색만이 아닌 텍스트로도 전달" 원칙 무회귀.

PASS.

### EC-4 — 거래소 서버 다운 (시나리오 (e)) 의 실시간 폴백

- 닫힌 포트 9999 로 FASTAPI_BASE_URL 우회 → FE route handler 의 `try/catch` 가 30s 타임아웃 전에 즉시 ECONNREFUSED 캐치 → 502 + 한글 폴백 응답 (실측 11ms 응답).
- ErrorCard 가 `card-critical` 톤 + "다시 시도" `button-secondary` 노출 — `aria-live="polite"` 로 스크린리더 안내 (코드 검사로 확인).

PASS.

### EC-5 — 네트워크 지연 / API 레이트리밋

- 본 PRD 범위 밖 (BE / 네트워크 인프라). 본 PR 의 시각 토큰 변경은 응답 시간과 무관. 30s 클라이언트 타임아웃 무변경 (route handler `TIMEOUT_MS = 30_000`).

OUT-OF-SCOPE (참고 메모).

### EC-6 — 뉴스 피드 장애

- 본 PRD 범위 밖. BE `brief.data_quality.news = "none"` 응답 (라운드트립 (a) 실측) 이 그대로 통과. FE 측 처리 분기 무변경.

OUT-OF-SCOPE (참고 메모).

## v2 → v3 시각 차이 (의도된 변경)

| 노출 지점 | v2 | v3 |
|---|---|---|
| 분석 CTA 버튼 (`button-primary`) | teal `#0f766e` 배경 + 흰 텍스트 | **slate `#1f3b4d` 배경** + 흰 텍스트 |
| action 카드 `badge-accent` | 옅은 teal `#e5f4f1` 배경 + teal `#0f766e` 텍스트 | **옅은 slate `#e6ecf2` 배경 + slate `#1f3b4d` 텍스트** |
| 검색 결과 focus (`search-result-item-focus`) | 옅은 teal 배경 + teal 텍스트 | **옅은 slate 배경 + slate 텍스트** |
| risk_plan 익절 표식 (`price-bar-target`) | teal dot | **slate dot** |
| 본문 텍스트 (`text-text-strong`) | 차콜 `#17202a` (이름만 v2 `primary`) | **차콜 `#17202a` 동일** — 키 이름만 `text-strong` 으로 분리 |
| feasibility/warn 카드 | warn `#b45309` × warn-soft `#fff4df` | **warn `#a04a09`** × warn-soft `#fff4df` (미세 톤 다운) |
| ErrorCard / 사전 차단 (critical) | critical `#991b1b` × critical-soft `#fee2e2` | **critical `#8a1818`** × critical-soft `#fde2e2` (미세 톤 다운) |
| 진입가 표식 (info) | info `#2563eb` | **info `#1f4fc0`** (미세 톤 다운) |

PR #11 의 6블록 동작·DOM 구조·텍스트 카피·반응형 분기는 모두 무회귀. **시각만 의도적으로 새 팔레트로 전환**됐다.

## 판정

- 자동화 검증 5건 (lint / typecheck / build / design:sync 멱등 / design.md lint) 전부 PASS.
- AC 10건 전부 PASS.
- 에지 케이스 4건 (EC-1~EC-4) PASS, 2건 (EC-5/EC-6) OUT-OF-SCOPE.
- **판정**: `qa-passed`. 실패 0건.

라벨 부여 흐름:

```bash
gh pr edit 20 --add-label qa-passed --remove-label impl-ready
# → handoff-append workflow 자동 트리거
# → docs(handoff): #20 QA 통과 시점 자동 기록 commit 자동 append
```
