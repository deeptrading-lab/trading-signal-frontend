---
version: alpha
name: slide-to-analyze
description: AI 종합분석 패널의 재분석 CTA 를 "밀어서(슬라이드) 분석 시작" 스위치로 재설계 — 모바일 드래그 / PC 클릭 / 키보드 동등 동작 + 접근성 폴백
colors:
  primary: "#1d4ed8"
  primary-strong: "#1e40af"
  neutral: "#ffffff"
  track-soft: "#dbeafe"
  text-muted: "#5b6470"
  surface-muted: "#f6f8fa"
  claude-accent: "#b45309"
  codex-accent: "#047857"
  threshold: "#15803d"
  disabled-bg: "#eceff3"
  disabled-text: "#94a3b8"
typography:
  track-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
  knob-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  toggle-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
  helper:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
rounded:
  pill: 999px
  knob: 999px
  card: 16px
spacing:
  track-px: 4px
  track-py: 4px
  knob-px: 14px
  knob-py: 8px
  stack-gap: 12px
  toggle-gap: 4px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  slide-track-idle:
    backgroundColor: "{colors.track-soft}"
    textColor: "{colors.primary-strong}"
    typography: "{typography.track-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.track-py}"
    height: 52px
  slide-track-progress:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.track-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.track-py}"
    height: 52px
  slide-track-threshold:
    backgroundColor: "{colors.threshold}"
    textColor: "{colors.neutral}"
    typography: "{typography.track-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.track-py}"
    height: 52px
  slide-track-disabled:
    backgroundColor: "{colors.disabled-bg}"
    textColor: "{colors.disabled-text}"
    typography: "{typography.track-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.track-py}"
    height: 52px
  slide-knob:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary-strong}"
    typography: "{typography.knob-label}"
    rounded: "{rounded.knob}"
    padding: "{spacing.knob-py}"
    height: 44px
  slide-knob-claude:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.claude-accent}"
    typography: "{typography.knob-label}"
    rounded: "{rounded.knob}"
    padding: "{spacing.knob-py}"
    height: 44px
  slide-knob-codex:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.codex-accent}"
    typography: "{typography.knob-label}"
    rounded: "{rounded.knob}"
    padding: "{spacing.knob-py}"
    height: 44px
  provider-toggle-active:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary-strong}"
    typography: "{typography.toggle-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.toggle-gap}"
  provider-toggle-inactive:
    backgroundColor: "{colors.track-soft}"
    textColor: "{colors.text-muted}"
    typography: "{typography.toggle-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.toggle-gap}"
  slide-helper:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.helper}"
    rounded: "{rounded.card}"
    padding: "{spacing.stack-gap}"
  intro-card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.helper}"
    rounded: "{rounded.card}"
    padding: "{spacing.stack-gap}"
---

# slide-to-analyze 디자인 가이드

## Overview

이 문서는 종목 상세 **AI 종합분석 패널** 의 `PreviousDecisionIntro` 진입 화면에서, 기존의 평범한 파란 버튼("이전 결론 참고해 오늘 다시 분석")을 **밀어서(슬라이드) 분석 시작** 스위치 인터랙션으로 재설계한다.

이 화면에 들어온 사용자는 이미 AI 분석 카드에서 "재분석" 을 눌러 진입했다 — 즉 **재분석 의도가 확정된 상태**다. 따라서 슬라이드 동작은 "실수 방지 잠금장치" 가 아니라, 의도된 실행을 **부드럽고 손맛 있는 한 동작** 으로 마무리해 주는 토스톤 마이크로 인터랙션이다. 무거운 작업(멀티에이전트 분석, 시간·토큰 소모)을 시작하기 직전이라, 가벼운 물리적 제스처로 "지금 시작한다" 는 결심을 한 번 더 확인시켜 주는 효과도 있다.

설계 원칙 3가지:

1. **밝고 간결한 토스톤** — 트랙은 연한 파랑(`track-soft`), 노브는 흰색 pill 로 떠 있는 가벼운 인상. 진행할수록 트랙이 진한 파랑(`primary`)으로 채워지며 "거의 다 왔다" 를 색으로 알려준다.
2. **제스처 + 폴백 동등성** — slide-to-action 은 단독 사용 시 접근성 안티패턴이다. 드래그(모바일) · 클릭(PC) · 키보드(Enter/Space) 가 **모두 동일하게** 분석을 시작한다. 어느 입력으로 들어와도 결과는 같고, 시각 피드백도 같은 상태 머신을 공유한다.
3. **토큰 SSOT** — 색·간격·라운드·그림자는 본 front matter 토큰으로만 표현한다. 코드에 hex/px 직타 금지(`design:sync` → `tailwind.theme.json` 경유). 라이트/다크 모드는 같은 토큰 키 + `--fs-` CSS 변수 정합으로 동시 명세한다(아래 Colors 참조).

대상 컴포넌트: `components/stock/AIAnalysisPanel.tsx` 의 `PreviousDecisionIntro`. 그 외 분석가 카드·토론·최종 판정 카드는 무변경이다.

## 유저 시나리오

진입 전제: 사용자가 `/analyze` 또는 종목 상세에서 "재분석" 을 눌러 패널이 열렸고, 저장된 이전 분석(`previousDecision`)이 존재한다.

### S1. 단일 AI · 모바일 (드래그) — 기본 플로우
1. 안내 박스 아래에 슬라이드 스위치가 보인다. 트랙 우측에 흰색 pill 노브("Claude로 분석" 또는 "Codex로 분석"). 트랙 본문에는 옅게 "→ 밀어서 분석" 힌트.
2. 사용자가 노브를 손가락으로 잡고 **왼쪽으로 드래그**(또는 트랙 진행 방향으로 민다). 진행도에 비례해 트랙이 파랑으로 채워지고 힌트 텍스트가 점점 사라진다. (`dragging`)
3. 임계점(트랙 폭의 ~85%) 도달 → 트랙이 초록빛으로 살짝 바뀌고 햅틱 1회(가능 시). "놓으면 시작" 마이크로 카피. (`threshold-reached`)
4. 손을 떼면 노브가 끝까지 스냅 → 슬라이드가 완료 모션으로 닫히며 분석 시작. (`committing` → 기존 `start(provider)` 호출)
5. 패널이 라이브 분석 뷰로 전환(에이전트 진행 바·카드 스트리밍 시작).

### S2. 단일 AI · PC (클릭)
1. 동일한 스위치가 보인다. 데스크탑에서는 노브에 마우스 호버 시 살짝 떠오르고(그림자↑), 커서 `pointer`.
2. 노브를 **클릭**하면 노브가 트랙 끝으로 **자동 슬라이드**(스프링 모션)되며 그대로 `committing` → 분석 시작. 드래그할 필요 없음.
3. (드래그도 데스크탑에서 동일하게 허용 — 마우스로 끌어도 됨. 단 1차 제공 동작은 클릭.)

### S3. 키보드
1. Tab 으로 스위치에 포커스 → 포커스 링 표시.
2. **Enter 또는 Space** → 즉시 `committing` (모션은 prefers-reduced-motion 이면 생략) → 분석 시작.

### S4. 다중 AI (Claude + Codex 둘 다 가용) — §9 R1 권고안(A)
1. 트랙 좌측 안쪽에 작은 provider 토글(Claude / Codex 2-세그먼트)이 들어가고, 노브 라벨이 선택된 provider 를 따라간다.
2. 사용자가 토글로 AI 를 고른 뒤(기본값 = 직전 분석에 쓴 provider), 같은 스위치를 밀거나/클릭하면 그 AI 로 분석 시작.
3. (대안 B: 2개일 때는 스위치를 끄고 기존 버튼 유지 — §9 비교 참조.)

### S5. 가용 AI 0개 / 조회 중 (비활성)
1. provider 조회 중 → 스위치 자리에 스켈레톤(pill 윤곽 + 옅은 펄스), 조작 불가.
2. 조회 결과 0개(미설치) 또는 Vercel 환경 → 슬라이드를 띄우지 않고 기존 `ProviderChooser` 의 안내 문구로 폴백(이 화면은 슬라이드를 그릴 전제가 안 됨).

## Colors

토큰은 한국 시장 관례(상승/긍정=빨강, 하락/부정=파랑)와 무관한 **중립 액션 영역** 이라, 앱 공통 파랑 CTA 색을 그대로 이어받는다 — 기존 분석 시작 버튼(`bg-blue-600`)과 같은 인상을 유지해 사용자가 "분석 시작" 으로 인지하게 한다.

- **primary (#1d4ed8)**: 트랙이 드래그로 채워질 때의 진행 색. 앱 공통 `accent-vivid`/blue-600 정합. 흰색 텍스트와 AA 통과.
- **primary-strong (#1e40af)**: idle 트랙(연파랑) 위 라벨·흰 노브 위 라벨 텍스트. 연한 배경에서 가독성 확보.
- **track-soft (#dbeafe)**: idle 트랙 바탕. "아직 비어 있음 / 누르면 시작" 의 옅은 유도색. blue-100 정합.
- **threshold (#15803d)**: 임계 도달 직전 트랙이 잠깐 띠는 초록. "놓으면 실행" 의 go 신호. 흰 텍스트와 AA 통과.
- **claude-accent (#b45309) / codex-accent (#047857)**: 노브 라벨이 선택된 provider 색을 따른다(Claude=앰버, Codex=에메랄드) — `codex-ai-analysis` 토큰과 정합. 흰 노브 배경 위에서 둘 다 AA 통과.
- **neutral (#ffffff)**: 노브 배경(흰 테두리 pill) · 진행/임계 트랙 위 텍스트.
- **text-muted (#5b6470) / surface-muted (#f6f8fa)**: 힌트·헬퍼 카피, 안내 박스·헬퍼 바탕.
- 트랙 외곽선은 별도 색 토큰을 두지 않고 `track-soft` 를 한 단계 진하게 쓰거나(`border` 속성은 DESIGN.md 컴포넌트 허용 속성이 아니라 토큰화 대상에서 제외), frontend-dev 가 기존 `border-blue-200`/`dark:border-blue-900` 패턴을 재사용한다.
- **disabled-bg (#eceff3) / disabled-text (#94a3b8)**: 비활성(가용 0 · 조회 중) 트랙. 대비가 의도적으로 낮다 — **비활성 상태를 색으로 알리는 의도**이며, 이 쌍의 `contrast-ratio` 경고는 무시한다(상호작용 불가 상태 표현).

### 다크모드

같은 토큰 키를 쓰되 frontend-dev 는 기존 AI 영역 다크 패턴(`--fs-` CSS 변수 + `colors-dark` 키)을 재사용한다. 신규 `--fs-` 변수 추가는 불필요하다.

| 토큰 | 라이트 | 다크 (기존 패턴 재사용) |
|---|---|---|
| `track-soft` | blue-100 | `dark:bg-blue-950/40` |
| `primary` | blue-600 | `dark:bg-blue-600` (그대로) |
| `primary-strong`(라벨) | blue-800 | `dark:text-blue-200` |
| `threshold` | green-700 | `dark:bg-green-600` |
| `neutral`(노브) | white | `dark:bg-slate-100` (흰 pill 유지, 살짝 톤다운) |
| `claude-accent` | amber-700 | `dark:text-amber-500` |
| `codex-accent` | emerald-700 | `dark:text-emerald-500` |
| `disabled-bg` | slate-200 | `dark:bg-slate-800` |

## Typography

- **track-label (13px 600)**: 트랙 본문 힌트("→ 밀어서 분석") · 진행 중 상태 문구.
- **knob-label (13px 700)**: 흰 노브 안의 "Claude로 분석" / "Codex로 분석". provider 고유명사 `Claude`·`Codex` 는 원문 표기 유지, 나머지는 한글.
- **toggle-label (12px 700)**: 다중 AI 토글 세그먼트 라벨.
- **helper (11px 400)**: 키보드/드래그 보조 안내, 안내 박스 부가 설명.

영문 고유명사·ticker·API 필드를 제외한 모든 노출 문구는 한글. 폰트는 앱 공통 Pretendard.

## Layout

스위치는 안내 박스와 이전 결론 카드 **사이** 에 단독 행으로 놓인다(이미 정리된 배치: 안내 박스 → 스위치 → `FinalVerdictCard`). 패널은 우측 슬라이드 aside 로 데스크탑에서 풀폭을 쓰므로, 스위치도 컨테이너 폭을 채우되 트랙 자체는 가독 폭으로 제한한다.

반응형 경계는 Tailwind 기본 정합(`md` 768 / `lg` 1024). JS 분기는 `useBreakpoint`(`isMobile`/`isTablet`/`isDesktop`)만 사용 — `window.innerWidth` 직접 검사 금지.

### 모바일 (`< md`, isMobile)
- 스위치 트랙: 패널 좌우 패딩 안에서 `width: 100%`(컨테이너 폭). 트랙 높이 `slide-track-idle.height`(52px), 노브 44px.
- 1차 동작 = **드래그**. 노브는 트랙 우측에서 시작, 좌→우 또는 우측 끝 방향으로 민다(앱 RTL 아님 → 트랙 비어 있는 쪽으로 채우며 미는 방향으로 통일, 구현 시 좌측 시작·우측 종료로 고정 권장).
- 안내 박스는 스위치 위에 컴팩트 1행(`flex-col`), 헬퍼 카피는 트랙 바로 아래 한 줄.

### 태블릿 (`md ~ lg`, isTablet)
- 모바일과 동일하되 트랙 최대 폭 `max-w-[28rem]`(명시값, `max-w-sm` 등 명명 토큰 금지 — spacing 함정 회피)로 가운데 정렬해 과하게 길어지지 않게 한다.
- 클릭·드래그 모두 가용. 터치/마우스 혼용 기기 고려해 둘 다 바인딩.

### 데스크탑 (`>= lg`, isDesktop)
- 패널 풀폭이라 트랙은 `max-w-[28rem]`로 제한하고 안내 박스와 좌측 정렬 또는 가운데 정렬(안내 박스 정렬에 맞춤).
- 1차 동작 = **클릭**(노브 클릭 시 자동 슬라이드). 호버 시 노브 그림자 상승 + 트랙 힌트 화살표 미세 이동(2px)으로 "밀 수 있음" 어포던스.
- sidebar/스크림 정책은 기존 패널 그대로(navbar 아래 시작, 스크림 클릭 닫기) — 스위치는 이 구조를 변경하지 않는다.

## Elevation & Depth

- 노브는 트랙 위에 **떠 있는** 인상: `shadow-sm`(idle) → 호버/드래그 시 `shadow-md`(살짝 상승). 토스톤 "만질 수 있는 물체" 느낌.
- 트랙 자체는 평면(그림자 없음, 얇은 외곽선만 — `track-soft` 대비 한 단계 진한 선 또는 기존 `border-blue-200` 패턴 재사용).
- 진행 채움은 그림자가 아니라 **배경색 전환**(`track-soft` → `primary`)으로 표현해 깊이감 과잉을 피한다.

## Shapes

- 트랙·노브 모두 완전 pill(`rounded.pill` 999px) — 토스톤 둥글고 부드러운 스위치.
- 안내 박스·헬퍼 영역은 `rounded.card`(16px).
- 노브 흰 테두리(border)는 트랙 색 위에서 노브를 분리하는 시각 키 — 사용자 손그림의 "흰 테두리로 AI 이름 감싼 핸들" 을 그대로 반영.

## Components

상태별 트랙은 별도 컴포넌트 키로 분리한다(상태 머신 1:1 매핑).

| 상태 | 컴포넌트 키 | 비주얼 | 모션 | 햅틱 |
|---|---|---|---|---|
| **idle** | `slide-track-idle` + `slide-knob`(또는 provider 색) | 연파랑 트랙, 우측 흰 노브, 옅은 "→ 밀어서 분석" 힌트 | 호버(PC) 시 노브 2px 부상, 힌트 화살표 미세 펄스 | 없음 |
| **dragging** | `slide-track-progress` | 진행도 비례 파랑 채움, 힌트 페이드아웃, 노브가 손가락 추적 | 채움은 위치 추적(스프링 X), `transform: translateX` | 없음 |
| **threshold-reached** | `slide-track-threshold` | 임계(~85%) 초과 시 트랙 초록, "놓으면 시작" 카피 | 트랙 색 250ms ease 전환 | 가벼운 햅틱 1회(`navigator.vibrate(10)`, 지원 시) |
| **committing** | `slide-track-progress`(가득) | 노브 끝 스냅 → 스위치 페이드/축소 후 라이브 뷰 전환 | 스프링 스냅(damping 25 / stiffness 200, 기존 패널 모션값 정합) | 성공 햅틱 1회(선택) |
| **loading** | `slide-track-disabled`(스켈레톤) | pill 윤곽 + 옅은 펄스, 라벨 숨김 | shimmer | 없음 |
| **disabled** | `slide-track-disabled` | 회색 트랙, 노브 고정, 커서 `not-allowed` | 없음 | 없음 |

- `slide-knob` / `slide-knob-claude` / `slide-knob-codex`: 노브 라벨 색이 선택 provider 를 따른다(단일 AI 일 땐 그 AI 색, 다중 AI 토글 선택 색).
- `provider-toggle-active` / `provider-toggle-inactive`: §9 R1 권고안(A) 채택 시 트랙 안 provider 세그먼트.
- `slide-helper` / `intro-card`: 트랙 아래 보조 안내 · 위 안내 박스.

### 접근성 (필수)

slide-to-action 은 단독으로 a11y 안티패턴이므로 다음을 의무화한다.

- **semantics**: 컨트롤 본체는 **`role="button"`(또는 native `<button>`)** 로 노출한다. 분석 시작은 "이산적 1회 실행" 이지 "연속 값 조절" 이 아니므로 `slider` semantics 보다 **button semantics 가 정확**하다(슬라이더로 읽히면 스크린리더 사용자가 "값을 조절하라" 고 오해). 시각적 슬라이드는 어디까지나 마우스/터치 한정 향상이다.
- `aria-label`: "Claude로 분석 시작"(또는 선택 provider). 다중 AI 토글은 별도 `role="radiogroup"` + `aria-checked`.
- `aria-busy`: `committing`/`loading` 동안 `true`, 진행 상태는 `aria-live="polite"` 로 안내(예: "분석을 시작했어요").
- **클릭 폴백(b)**: PC 에서 노브/트랙 클릭 = 즉시 실행(드래그 불요).
- **키보드 폴백(c)**: 포커스 후 **Enter/Space** = 즉시 실행. 화살표키로 노브를 "미는" 동작은 불필요(button 이므로) — 단순·예측 가능하게.
- **포커스 표시**: `focus-visible` 시 트랙 외곽 2px 포커스 링(앱 공통 포커스 토큰). 마우스 클릭 시엔 링 억제.
- **prefers-reduced-motion**: 슬라이드 애니메이션을 생략하고 **즉시 전환**(노브 스냅·committing 모션 없이 바로 `start`). 진행 채움도 단계 전환만. 키보드/클릭 경로는 원래도 모션 의존이 없어 그대로 동작.
- 터치 타깃: 노브 최소 44px(WCAG 2.5.5) — `slide-knob.height` 44px 충족.

### 카피 (한글)

기존 `previousDecision.analyze`("이전 결론 참고해 오늘 다시 분석") 는 트랙/노브에 넣기엔 길다. 슬라이드용 짧은 카피를 신규 키로 추가하고, 기존 키는 폴백(reduced-motion 외 케이스나 회귀용)으로 **유지**한다.

`lib/copy/stock/aiAnalysis.ts` 의 `previousDecision` 에 추가 제안:

```ts
previousDecision: {
  // ...기존 유지...
  slide: {
    /** 노브 라벨 — provider 이름 주입. 예: "Claude로 분석" */
    knob: (provider: string) => `${provider}로 분석`,
    /** 트랙 idle 힌트 */
    hint: "→ 밀어서 다시 분석",
    /** 임계 도달 시 */
    release: "놓으면 시작",
    /** 진행 중(committing) aria-live */
    starting: "분석을 시작했어요",
    /** 키보드/클릭 보조 안내(헬퍼) */
    helper: "밀거나 눌러서 시작하세요",
  },
},
```

- 노브 = `knob(provider)` ("Claude로 분석"). 이는 기존 `previousDecision.soleProvider`("○○로 분석") 와 의미가 같아 그 카피를 재활용해도 된다 — 신규 키 최소화를 원하면 `soleProvider` 재사용.
- 트랙 힌트 = `hint`("→ 밀어서 다시 분석"). 짧고 동작을 직접 지시.
- **기존 `analyze` 키 변경/삭제 금지** — 다른 폴백 경로(접근성 텍스트·회귀)에서 참조 가능성. 신규 `slide.*` 키만 추가.

## Do's and Don'ts

- ✅ 드래그·클릭·키보드 **세 경로 모두** 동일하게 `start(provider)` 를 호출한다.
- ✅ button semantics + `aria-label` 로 스크린리더에 "분석 시작" 으로 노출한다.
- ✅ `prefers-reduced-motion` 시 슬라이드 모션을 건너뛰고 즉시 시작한다.
- ✅ 색·간격·라운드는 토큰 참조(`{colors.primary}` 등)로만 사용한다.
- ✅ 노브 터치 타깃 ≥ 44px 를 유지한다.
- ❌ 슬라이드를 **유일한** 실행 수단으로 두지 않는다(클릭·키보드 폴백 필수).
- ❌ `slider` role 로 노출해 "값 조절" 로 오인시키지 않는다.
- ❌ 트랙/노브에 hex·px 를 직접 박지 않는다(`design:sync` 경유).
- ❌ 이 화면(재분석 확정 진입)에서 슬라이드를 "오작동 방지 잠금" 으로 과하게 길거나 뻑뻑하게 만들지 않는다 — 토스톤 가벼운 한 동작.
- ❌ 가용 AI 0개·조회 중에 활성 스위치를 그리지 않는다(스켈레톤/폴백).

## OPEN QUESTION 결정 (디자이너 영역)

| ID | 질문 | 결정 |
|---|---|---|
| R1 | 다중 AI(Claude+Codex 둘 다 가용)일 때 슬라이드 스위치 처리 | **권고안 A 채택**(시안 비교 아래). 단 최종 구현 난이도가 높으면 B 로 폴백 허용. |
| R2 | 노브 시작 위치·미는 방향 | 노브를 **좌측 시작 → 우측 끝** 으로 고정(읽기 방향 정합). 손그림은 우측 노브였으나, 좌→우 진행이 "채워서 완료" 멘탈모델에 더 맞아 구현·a11y 모두 단순. 트랙 힌트 화살표(→)로 방향 명시. |
| R3 | 임계 비율(threshold) | 트랙 폭의 **85%**. 끝까지 밀 필요 없이 "거의 다 밀면" 시작 — 토스톤 관대한 제스처. |
| R4 | 노브 라벨 카피 | `previousDecision.slide.knob`("○○로 분석") 신규 키. 길면 노브는 "분석" 만 두고 provider 는 트랙 좌측 또는 안내 박스에 표기(폭 부족 시 fallback). |

### R1 시안 비교 — 다중 AI 처리

**시안 A: 트랙 안에 provider 토글 + 슬라이드 (선택 + 실행 한 컴포넌트)**
- 동작: 트랙 좌측 안쪽에 Claude/Codex 2-세그먼트 토글, 노브 라벨이 선택을 따라감. 고른 뒤 밀거나/클릭하면 그 AI 로 시작.
- 장점: 한 컴포넌트에서 선택+실행이 끝나 단계가 짧다. 토스톤 "한 화면 한 동작" 정합. 단일/다중 AI 모두 같은 스위치라 시각 일관성↑.
- 단점: 트랙 안에 토글이 들어가 폭이 빠듯(모바일에서 노브+토글+힌트 공존). a11y 가 복잡(radiogroup + button 중첩). 구현 난이도 중상.
- 토스톤 적합성: 높음(밝고 한 동작). a11y: 주의 필요(토글/슬라이드 역할 분리 명확히).

**시안 B: AI 1개일 때만 슬라이드, 2개면 기존 버튼 유지**
- 동작: 단일 AI = 슬라이드 스위치. 다중 AI = 기존 `[다시 분석] + [다른 AI 선택]` 버튼 그대로.
- 장점: 구현 최소(기존 다중 분기 그대로). a11y 단순(슬라이드는 단일 케이스만). 회귀 리스크 낮음.
- 단점: 사용자 경험이 케이스에 따라 갈림(어떤 땐 슬라이드, 어떤 땐 버튼) — 일관성↓. 슬라이드 인터랙션 노출 빈도가 낮아짐(둘 다 설치한 파워유저는 못 봄).
- 토스톤 적합성: 중. a11y: 높음(단순).

**권고: 시안 A.** 사용자가 명시적으로 원한 인터랙션을 **모든 가용 케이스에서 일관되게** 제공하고, "선택→실행" 을 한 동작으로 묶는 토스톤 방향에 가장 맞는다. 다만 트랙 폭·a11y(radiogroup+button) 구현 부담이 있으므로, frontend-dev 가 구현 단계에서 모바일 폭·스크린리더 동작이 깔끔히 안 나오면 **시안 B 로 안전 폴백**한다(단일 AI 슬라이드는 두 시안 공통이라 그 부분은 손실 없음). 어느 안이든 **단일 AI = 그 AI 로 바로 슬라이드=분석 시작** 이 기본 동작이다.
