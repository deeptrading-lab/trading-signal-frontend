# QA — scorecard-outcome-color (채점 적중·빗나감 색을 등락색과 분리)

- 실행: 2026-10-18 KST — QA 역할
- 대상: PR #391 `feature/scorecard-outcome-color` @ `82d4fe8`
- 성격: 경량 UI 버그픽스 — PRD 없음. 아래 AC 는 PR 위임 시 정의된 7건.
- 환경: 로컬(macOS) — `next build`(Turbopack), `next dev -p 3391`, vitest 3.2.4(node env)

## 변경 요약

- `docs/design/finsight-redesign.md` — `colors.outcome-hit: #166534` / `colors-dark.outcome-hit: #4ade80` 추가.
- `tailwind.theme.json`·`app/theme-vars.css` — `design:sync` 재생성분.
- `components/analyze/AIDecisionCard.tsx` — 채점 배지 적중 `text-accent-vivid` → `text-outcome-hit` (빗나감 `text-warn`, 보합 `text-text-muted` 무변경).
- `components/scorecard/ScorecardTable.tsx` — 적중 `text-signal-up` → `text-outcome-hit`, 미적중 `text-signal-down` → `text-warn`.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 토큰 동기화 | `npm run design:sync` → `git status --porcelain`; `npx @google/design.md lint docs/design/finsight-redesign.md` | 재생성 diff 0, lint errors 0 | sync exit 0, `git status` 빈 출력(diff 0). lint `errors: 0, warnings: 38, infos: 1` (PR 본문 37→38 과 일치, 신규 errors 없음) | 통과 |
| AC-2 light/dark 정합 | DESIGN.md `colors`/`colors-dark` 키 집합 비교 + `theme-vars.css` `:root`/`html.dark` 변수 집합 비교(node 스크립트) | 양쪽에 `--fs-outcome-hit`, 키 1:1 | colors 62 / colors-dark 62, 한쪽에만 있는 키 `[]`. vars light 62 / dark 62, 차이 `[]`. `--fs-outcome-hit: #166534`(line 65), `#4ade80`(line 130, `html.dark`) | 통과 |
| AC-3 빌드 CSS 방출 | `npm run build` → `.next/static/**/*.css` 에서 `outcome-hit` 검색 + 변수 소속 셀렉터 역추적 | `.text-outcome-hit` 규칙 + 라이트/다크 변수 실제 방출 | build exit 0. `.next/static/chunks/0gpwxwa5-txoc.css` 에서 `.text-outcome-hit{color:var(--fs-outcome-hit)}` 1건, `.text-warn{color:var(--fs-warn)}` 1건, `--fs-outcome-hit:#166534` 소속 셀렉터 `:root`, `--fs-outcome-hit:#4ade80` 소속 `html.dark`. 누락 함정(@layer 속성 셀렉터 류) 해당 없음 | 통과 |
| AC-4 WCAG 대비 | 상대휘도 공식으로 계산(아래 표) | 전부 4.5:1 이상 | 최저값 = warn/surface-muted(라이트 hover 행) 5.64:1. 전 조합 AA 통과 | 통과 |
| AC-5 등락색 잔존 | `git grep` 로 outcome/hit/miss/적중/빗나감/미적중 렌더 지점 탐색 → 해당 지점의 `signal-up/signal-down/accent-vivid` 확인 | 채점 hit/miss 를 칠하는 곳에 등락색 0 | hit/miss 상태색을 칠하는 곳은 2곳(`AIDecisionCard.tsx:117-121`, `ScorecardTable.tsx:124,127`)뿐이고 둘 다 새 토큰. `components/scorecard/`·`app/(main)/dashboard` 의 `signal-up/down/accent-vivid` 0건. 참고 1건은 아래 "관찰" 절 | 통과 |
| AC-6 렌더 HTML 클래스 | `next dev -p 3391` → `curl /dashboard/scorecard`, `/analyze` | 렌더 HTML 에 새 클래스 | **인증 게이트로 막힘**: 둘 다 `307 → /login?next=...`. 대체로 컴포넌트 렌더 테스트(임시, 미커밋) 실행 — 아래 절. 적중/빗나감/보합 클래스 모두 기대대로. dev 서버 종료 확인(3391 LISTEN 없음) | 통과(대체 검증) |
| AC-7 정적 검사·테스트 | `npx tsc --noEmit`; `npx eslint <변경 2파일>`; `npx vitest run components/scorecard components/analyze` | 0 에러 / 전부 통과 | tsc exit 0, eslint exit 0, vitest 3 files / 18 passed. 단 기존 18건은 변경 컴포넌트를 직접 커버하지 않음 → AC-6 대체 렌더 테스트로 보완 | 통과 |

### AC-4 대비 계산 (WCAG 2.x 상대휘도)

| 전경 | 배경 | 대비 | AA 4.5:1 |
|---|---|---|---|
| outcome-hit 라이트 `#166534` | surface `#ffffff` | **7.13:1** | 통과 |
| outcome-hit 다크 `#4ade80` | surface 다크 `#161d26` | **9.74:1** | 통과 |
| warn 라이트 `#a14a06` | surface `#ffffff` | **6.00:1** | 통과 |
| warn 다크 `#e0a45c` | surface 다크 `#161d26` | **7.78:1** | 통과 |
| outcome-hit 라이트 | surface-muted `#f6f8fa` (표 행 hover / 카드 hover·focus) | 6.70:1 | 통과 |
| outcome-hit 다크 | surface-muted 다크 `#0e141b` | 10.62:1 | 통과 |
| outcome-hit 다크 | surface-elevated 다크 `#1d2630` | 8.78:1 | 통과 |
| warn 라이트 | surface-muted `#f6f8fa` | 5.64:1 | 통과 |
| warn 다크 | surface-muted 다크 `#0e141b` | 8.49:1 | 통과 |
| warn 다크 | surface-elevated 다크 `#1d2630` | 7.02:1 | 통과 |
| (참고) signal-done `#12b76a` | surface `#ffffff` | 2.62:1 | 미달 — PR 이 새 토큰을 따로 둔 근거와 일치 |

### AC-6 대체 — 컴포넌트 렌더 테스트 (임시, 실행 후 삭제)

`components/analyze/__tests__/zzQaOutcomeColor.test.ts` 를 잠깐 만들어 `renderToStaticMarkup` 으로 두 컴포넌트를 렌더했다
(`AIDecisionCardMenu` 는 `AIAnalysisProvider` 컨텍스트가 필요해서 `vi.mock` 으로 null 처리, QueryClientProvider 로 감쌈). 실행 후 파일을 지웠고 `git status` 가 깨끗한 것도 확인했다.

```text
card hit => font-medium text-outcome-hit
card miss => font-medium text-warn
card flat => font-medium text-text-muted
table hit td => py-md pl-md text-right text-body-sm tabular-nums text-outcome-hit | miss td => py-md pl-md text-right text-body-sm tabular-nums text-warn
 ✓ components/analyze/__tests__/zzQaOutcomeColor.test.ts (2 tests) 22ms
 Tests  2 passed (2)
```

표 렌더 HTML 전체에 `signal-up|signal-down|accent-vivid` 매치 0건.

## 공통 AC

| 항목 | 실측 | 판정 |
|---|---|---|
| typecheck / lint / build | tsc 0, eslint(변경 파일) 0, `next build` 성공 | 통과 |
| BFF 무회귀 | `git grep "http://127.0.0.1" -- app/` (route.ts 제외) 2건 = `app/api/workbench/_adapters/fastapi.ts` 의 `FASTAPI_BASE_URL` 기본값(주석+fallback). main 과 같은 2건이고 이 PR 은 손대지 않음 | 통과 |
| hex/px 직타 | 변경된 컴포넌트 diff `+` 줄에서 hex/px 0건(토큰 클래스만 씀) | 통과 |
| 한글 톤 | 카피 무변경(`lib/copy/**` diff 없음) | 통과 |
| 접근성 | 마크업·aria 무변경, 색만 교체. 배지는 텍스트 라벨("적중"/"빗나감")을 그대로 두므로 색에만 의존하지 않음 | 통과 |

## 에지 케이스

- **보합(flat)**: 카드 배지 `text-text-muted` 그대로(렌더 테스트로 확인). 표의 보합 컬럼도 `text-text-muted` 그대로.
- **표본 N<5 행**: 행에는 `text-text-muted` 가 걸리지만 적중/미적중 셀은 자기 색 클래스가 우선한다. 이전에도 같았음(signal-up/down → outcome-hit/warn). 표본이 작은 행에서도 적중/미적중 수가 색으로 보이는 동작은 변경 전과 같다.
- **cn/tailwind-merge 함정**: 카드 배지는 `cn("font-medium", "text-outcome-hit")` 이고 같은 cn 안에 다른 text-색이나 fontSize 가 없어서 떨어질 클래스가 없다. 렌더 결과로도 확인.
- **다크모드**: `html.dark` 에 변수가 실제로 방출되는 것을 빌드 CSS 에서 확인(AC-3). 대비도 다크 surface 3종에서 모두 AA 통과.
- **BE 다운 / 빈 본문 / malformed JSON**: 데이터 경로가 바뀌지 않아 해당 없음.

## 라운드트립

- 인증 게이트(`/login` 307) 때문에 로그인 없이는 실화면을 볼 수 없다. dev 서버 기동 → 두 경로 307 확인 → 종료까지만 했다.
- 육안 확인(라이트/다크에서 `/analyze` 카드 "1주 적중" 초록, `/dashboard/scorecard` 적중 초록·미적중 주황 계열)은 **로그인한 사용자가 1회 해 보기를 권장**한다.

## DESIGN.md 토큰 라이브 동기화

- `design:sync` 재실행 결과가 커밋된 산출물과 바이트 단위로 같다(diff 0, AC-1). 빌드 CSS 에 `:root`/`html.dark` 변수와 유틸리티 클래스가 방출된다(AC-3). 이 PR 은 토큰 추가 자체가 변경분이어서, 임시로 값을 바꿔 보는 왕복 검증은 위 두 실측으로 대신했다.

## 관찰 (비차단)

- `components/stock/ai-analysis/VerdictHero.tsx:315-331` 의 캘리브레이션 배지("실측 적중률 N%")는 `bg-accent-vivid-soft text-accent-vivid` 를 쓴다. 다만 이 배지는 hit/miss 상태를 칠하지 않는다. 집계 적중률을 보여 주는 "근거 충분" 표시라서 AC-5 범위 밖으로 봤다. accent-vivid 가 하락 파랑(`#1d4ed8`)과 hex 가 같다는 점은 똑같으므로, 일관성을 맞출지는 후속에서 판단하면 된다.
- 기존 vitest 는 두 컴포넌트를 직접 렌더하지 않는다. 컴포넌트 렌더 테스트는 이 저장소에 아직 없는 패턴(vitest env=node, `*.test.ts` 한정)이라 이번 QA 에서 커밋하지 않았다.

## 판정

**qa-passed** — 실패 0건. PR 본문에 `## 다음 작업` 절 있음(라벨 게이트 충족).
