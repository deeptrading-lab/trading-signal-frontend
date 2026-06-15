---
version: alpha
name: ai-sentiment-structured
description: SNS 분석가 카드에 표시하는 7단계 구조화 감성 배지 — 밴드 1차 · 점수 보조 · 신뢰도 병기(과신 방지)
colors:
  primary: "#0f1419"
  secondary: "#5b6470"
  neutral: "#ffffff"
  pos-strong: "#c81e1e"
  pos-strong-soft: "#fee2e2"
  pos: "#c81e1e"
  pos-soft: "#fff1f1"
  neutral-band: "#5b6470"
  neutral-band-soft: "#f0f1f3"
  neg: "#1d4ed8"
  neg-soft: "#eef3ff"
  neg-strong: "#1e40af"
  neg-strong-soft: "#dbeafe"
typography:
  band-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  score:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
  confidence:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.2
rounded:
  pill: 999px
  sm: 8px
spacing:
  badge-px: 8px
  badge-py: 4px
  badge-gap: 6px
breakpoints:
  md: 768px
components:
  sentiment-badge-pos-strong:
    backgroundColor: "{colors.pos-strong-soft}"
    textColor: "{colors.pos-strong}"
    typography: "{typography.band-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.badge-py}"
  sentiment-badge-pos:
    backgroundColor: "{colors.pos-soft}"
    textColor: "{colors.pos}"
    typography: "{typography.band-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.badge-py}"
  sentiment-badge-neutral:
    backgroundColor: "{colors.neutral-band-soft}"
    textColor: "{colors.neutral-band}"
    typography: "{typography.band-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.badge-py}"
  sentiment-badge-neg:
    backgroundColor: "{colors.neg-soft}"
    textColor: "{colors.neg}"
    typography: "{typography.band-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.badge-py}"
  sentiment-badge-neg-strong:
    backgroundColor: "{colors.neg-strong-soft}"
    textColor: "{colors.neg-strong}"
    typography: "{typography.band-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.badge-py}"
  sentiment-score:
    textColor: "{colors.secondary}"
    typography: "{typography.score}"
  sentiment-confidence:
    textColor: "{colors.secondary}"
    typography: "{typography.confidence}"
  sentiment-badge-container:
    backgroundColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: "{spacing.badge-px}"
---

# ai-sentiment-structured 디자인 가이드

## Overview

SNS 분석가(`social`) 카드 전용으로, 멀티에이전트 AI 분석이 추출한 **구조화 감성(밴드 · 0~10 점수 · 신뢰도)** 을 한눈에 보여주는 배지 1종을 정의한다. 다른 분석가 카드(market/news/fundamentals)와 최종 판정 카드(FinalVerdictCard)는 무변경이다.

핵심 디자인 의도는 두 가지다.

1. **과신 방지(PRD q2)**: 이 점수는 LLM이 커뮤니티 검색만으로 매긴 *추정*이지 정밀 정량값이 아니다. 따라서 점수만 크게 강조하지 않고, **밴드 라벨(한글)을 1차 정보**로, **점수(`/10`)를 보조**로, **신뢰도(낮음/보통/높음)를 동등 비중**으로 병기한다. "커뮤니티 심리 추정" 뉘앙스를 유지하고, 신뢰도 '낮음'이면 톤을 약화한다.
2. **기존 카드 톤 정합**: FinalVerdictCard가 쓰는 **한국 시장 관례**(상승/긍정=빨강, 하락/부정=파랑, 중립=slate)를 그대로 따른다. 미국식(긍정=초록) 반대 매핑을 쓰지 않는다.

본 배지는 SNS 카드 하나에만 들어가는 소규모 컴포넌트다. 카드 본체의 레이아웃·여백·라운드(`rounded-xl`, `border-slate-200`)는 기존 `AnalystCard`를 그대로 쓰고, 배지는 그 안에 끼워 넣는 작은 정보 칩이다.

## Colors

밴드는 7단계(매우 부정적 · 부정적 · 약간 부정적 · 중립 · 약간 긍정적 · 긍정적 · 매우 긍정적)지만 **색은 5톤으로 묶고 세분은 라벨이 담당**한다. 7단계를 7색으로 다 나누면 카드 안의 작은 칩에서 색 구분이 과하고 한국 시장 관례(빨강↔파랑 2축 + 중립)와도 어긋난다. 강도는 색의 진하기(soft 배경 + 텍스트 채도)로, 방향·미세 단계는 라벨 문자열로 표현하는 편이 정보 밀도와 직관 모두에 유리하다.

밴드 → 색 톤 매핑 (한국 관례: 긍정=빨강 / 부정=파랑 / 중립=slate):

| 밴드 (한글 라벨) | score 대역(권고) | 색 토큰(컴포넌트) | 방향 |
|---|---|---|---|
| 매우 긍정적 | 9~10 | `{colors.pos-strong}` / `{colors.pos-strong-soft}` | 긍정(빨강) 강 |
| 긍정적 | 7~8 | `{colors.pos}` / `{colors.pos-soft}` | 긍정(빨강) |
| 약간 긍정적 | 6 | `{colors.pos}` / `{colors.pos-soft}` | 긍정(빨강) 약 |
| 중립 | 4~5 | `{colors.neutral-band}` / `{colors.neutral-band-soft}` | 중립(slate) |
| 약간 부정적 | 3 | `{colors.neg}` / `{colors.neg-soft}` | 부정(파랑) 약 |
| 부정적 | 1~2 | `{colors.neg}` / `{colors.neg-soft}` | 부정(파랑) |
| 매우 부정적 | 0 | `{colors.neg-strong}` / `{colors.neg-strong-soft}` | 부정(파랑) 강 |

- `score 대역`은 LLM 매핑 정합을 위한 **권고 가이드**이며 표시 위계상 색은 **밴드 라벨로 결정**한다(점수가 아니라 밴드가 단일 진실원천). 약간 긍정적/긍정적, 약간 부정적/부정적은 같은 색 톤을 공유하고 라벨로만 세분한다 — 같은 톤 안에서 두 칸씩 묶이는 구조다.
- `pos-strong` / `neg-strong`은 양 극단(매우 긍정/매우 부정)만 진한 톤으로 강조해 "군중이 과열/공포 극단에 있다"는 신호를 시각적으로 살린다.
- **다크모드**: 이 토큰들은 `signal-up`(#c81e1e) · `signal-down`(#1d4ed8) 계열과 정렬돼 있어, frontend-dev가 기존 AI 카드 패턴(`dark:bg-red-950/20`, `dark:text-red-400`, `dark:bg-blue-950/20`, `dark:text-blue-400`, `dark:bg-slate-800/60`)을 그대로 재사용한다. **신규 `--fs-` CSS 변수나 `colors-dark` 키 추가는 불필요**하다(아래 "신규 토큰 결론" 참조).

## Typography

- **밴드 라벨**: 13px Bold (`{typography.band-label}`) — 배지의 1차 정보. 기존 `badge` 토큰(13px/700)과 동일 스케일.
- **점수 `n/10`**: 12px Bold (`{typography.score}`), 색은 `{colors.secondary}`(중립 회색) — 밴드 색을 입히지 않아 점수가 과대 강조되지 않게 한다(과신 방지).
- **신뢰도 `낮음/보통/높음`**: 11px Regular (`{typography.confidence}`), 회색 — 가장 약한 위계지만 항상 동반 표기.
- 밴드 라벨 한글 문자열·접미("/10")·신뢰도 라벨은 모두 `lib/copy/stock/aiAnalysis.ts`의 `COPY.sentiment`에 정의한다(본 문서는 위계·색·스케일만 정의, 카피 구현은 frontend-dev).

## Layout

배지는 SNS 카드 헤더 하단(라벨 줄 아래) 또는 본문 미리보기 상단에 한 줄로 배치한다. 좌→우 시각 위계: **밴드 라벨(컬러 pill) → 점수 → 신뢰도**.

```
[ 긍정적 ]  7/10 · 신뢰도 보통
 └ 컬러 pill  └ 회색 보조  └ 회색 약화
```

- **밴드 pill**: `{spacing.badge-px}`(좌우) · `{spacing.badge-py}`(상하) · `{rounded.pill}`. 칩 내부는 컬러 soft 배경 + 컬러 텍스트.
- 점수·신뢰도는 pill 밖 일반 텍스트로, `{spacing.badge-gap}` 간격을 둔다. 점수와 신뢰도 사이는 가운뎃점(·)으로 구분.
- **폭 제한**: 배지 전체는 카드 폭에 종속(부모 카드가 `min-h-[120px]`에 좁은 그리드 셀). 명시값 `max-w-full` + `flex-wrap`을 쓴다. **`max-w-xs`/`max-w-sm` 같은 명명 토큰 금지** — 이 저장소의 커스텀 spacing(`xs`=4px)이 Tailwind v4의 `max-w-xs`를 4px로 깨뜨려 한글이 세로로 부서진다(MEMORY 함정).
- **모바일(< md, 768px)**: AI 분석 패널이 1열이고 카드 폭이 더 좁아진다. 배지 한 줄이 카드 폭을 넘기면 `flex-wrap`으로 "점수 · 신뢰도"가 둘째 줄로 자연 줄바꿈되게 한다(밴드 pill은 항상 첫 줄 유지). 한글 라벨은 `whitespace-nowrap`으로 pill 안에서 세로로 쪼개지지 않게 한다.
- **데스크톱(≥ md)**: 카드가 2~3열 그리드라도 배지는 한 줄에 들어간다(밴드 라벨 최장 "매우 부정적" 5자 + 점수 + 신뢰도 ≈ 한 줄 수용). 줄바꿈은 폴백일 뿐 기본 거동은 한 줄.
- JS 분기가 필요하면 `useBreakpoint`(`@/hooks/utils/useBreakpoint`)만 사용하고 `window.innerWidth` 직접 검사 금지. 단 본 배지는 CSS `flex-wrap`만으로 충분해 JS 분기 불요.

## Shapes

- 밴드 칩은 **pill**(`{rounded.pill}`, 999px)로 — 작은 라벨 칩의 토스톤 관례. 카드 본체의 `rounded-xl`보다 작고 둥글어 "칩"임을 명확히 한다.
- 신뢰도 '낮음' 상태에서는 칩 배경 채도를 낮추고(soft 톤 + opacity 약화) 점선/흐림 처리 없이 톤만 죽인다. 상태 변형은 Components 참조.

## Components

- `sentiment-badge-pos-strong`: "매우 긍정적" 밴드 칩(진한 빨강 soft).
- `sentiment-badge-pos`: "긍정적"·"약간 긍정적" 밴드 칩(빨강 soft).
- `sentiment-badge-neutral`: "중립" 밴드 칩(slate soft).
- `sentiment-badge-neg`: "부정적"·"약간 부정적" 밴드 칩(파랑 soft).
- `sentiment-badge-neg-strong`: "매우 부정적" 밴드 칩(진한 파랑 soft).
- `sentiment-score`: `n/10` 보조 텍스트(중립 회색, 밴드 색 미적용).
- `sentiment-confidence`: 신뢰도 텍스트(중립 회색).
- `sentiment-badge-container`: 배지 묶음 래퍼(흰 배경 카드 위 인라인).

**신뢰도별 톤 변화**(과신 방지 — q2):

| 신뢰도 | 밴드 칩 톤 | 점수 표기 | 부가 카피 뉘앙스 |
|---|---|---|---|
| 높음 | soft 배경 + 컬러 텍스트(기본) | `7/10` 정상 | 그대로 |
| 보통 | 기본과 동일 | `7/10` 정상 | 그대로 |
| 낮음 | 칩 배경/텍스트 채도 약화(예: `opacity-70`) | `7/10` 회색 유지(강조 금지) | "표본 적음 · 참고" 류 약화 카피(`lib/copy`) |

- 신뢰도 '낮음'은 **점선·경고색을 쓰지 않고** 톤 약화(opacity)로만 표현한다 — 부정/오류가 아니라 "확신이 낮은 추정"이라는 의미이기 때문.
- 점수 텍스트에는 어떤 신뢰도에서도 밴드 색을 입히지 않는다(밴드 색은 칩에만). 점수가 색으로 강조되면 "정밀 수치"로 오인돼 과신을 유발한다.

## Do's and Don'ts

- ✅ 밴드 라벨을 1차, 점수를 보조, 신뢰도를 항상 동반 표기한다(셋 중 하나만 단독 노출 금지).
- ✅ 색은 한국 시장 관례(긍정=빨강 / 부정=파랑 / 중립=slate)를 따른다.
- ✅ 7단계 밴드를 5색 톤으로 묶고 미세 단계는 라벨로 세분한다.
- ✅ 폭 제한은 `max-w-full`·`flex-wrap` 명시값으로 한다.
- ✅ 다크모드는 기존 AI 카드의 red/blue/slate dark 패턴을 그대로 재사용한다.
- ❌ 점수만 크게 강조하거나 점수에 밴드 색을 입히지 않는다(과신 유발).
- ❌ 긍정에 초록(미국식)을 쓰지 않는다 — FinalVerdictCard와 색 관례가 어긋난다.
- ❌ `max-w-xs`/`max-w-sm` 명명 토큰을 폭 제한에 쓰지 않는다(4px/6px로 깨짐).
- ❌ 7색으로 밴드를 다 나누거나, 신뢰도 '낮음'에 경고색·점선을 쓰지 않는다.
- ❌ 배지 카피(밴드 라벨·"/10"·신뢰도)를 컴포넌트에 인라인 하드코딩하지 않는다(`lib/copy/stock/aiAnalysis.ts`).
- ❌ hex/px를 컴포넌트 코드에 직타하지 않는다(기존 Tailwind 팔레트 유틸 또는 토큰 참조).

---

## 신규 토큰 결론 (frontend-dev 핸드오프)

**결론: `tailwind.theme.json` / `colors-dark` / `--fs-` CSS 변수에 신규 토큰 추가는 불필요하다.**

- 기존 AI 카드(`AnalystCard.tsx`·`FinalVerdictCard.tsx`)는 이미 **raw Tailwind 팔레트 유틸**(`bg-red-50` `text-red-600` `bg-blue-50` `text-blue-600` `bg-slate-100` `text-slate-500` + 각 `dark:` 변형)로 빨강/파랑/slate 감성 톤을 구현하고 있다. 본 배지의 5톤은 이 팔레트로 1:1 커버된다.
  - 매우 긍정 → `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`
  - 긍정/약간 긍정 → `bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400` (text-red-700 ≈ `#c81e1e`=`signal-up`, soft 배경 위 AA 충족)
  - 중립 → `bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300`
  - 부정/약간 부정 → `bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400`
  - 매우 부정 → `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`
- 본 DESIGN.md 의 `colors` front matter는 lint(broken-ref/contrast/orphan) 검증과 매핑 명세를 위한 **문서용 정규값**이다. 이 값들은 기존 semantic 토큰 `signal-up`(#c81e1e)·`signal-down`(#1d4ed8) 및 Tailwind red/blue/slate 팔레트와 정렬돼 있어, **`design:sync`로 theme.json 을 덮어쓰지 않는다**(이 slug 는 토큰 추가 PR 없음 — PRD §8.2 커밋 2 생략, §8.5 "기존 톤만으로 충분" 경로).
- 간격/라운드(`badge-px`/`badge-py`/`badge-gap`/`pill`)도 기존 spacing·borderRadius 토큰(`pill`=999px 등)으로 충당 가능하다. 새 spacing 명명 토큰을 추가하지 않는다.
- 따라서 frontend-dev 는 **신규 토큰 동기화 없이** 기존 팔레트 유틸 + `cn` 헬퍼로 배지를 구현한다. 만약 구현 중 기존 팔레트로 표현 못 하는 톤이 발견되면 그때 본 문서 토큰을 theme.json 에 정식 동기화(다크모드 `colors-dark` 키정합 동반)하도록 디자이너에게 회신한다.

## 화면별 상태 / 핸드오프 (frontend-dev 구현 명세)

SNS 분석가 카드(`meta.key === "social"`)에만 적용. 다른 카드·FinalVerdictCard 무변경.

| 상태 | 조건 | 배지 거동 |
|---|---|---|
| 기본(감성 있음) | `sentiment` 이벤트 수신, 카드 `status === "done"` | 밴드 pill + `점수/10` + 신뢰도 전체 표시 |
| 신뢰도 낮음 | `confidence === "low"` | 칩 톤 약화(opacity) + 점수 회색 + 약화 카피 |
| 감성 없음(폴백) | `sentiment === null` (블록 누락/파싱 실패) | **배지 미표시** — 기존 카드와 100% 동일(회귀 0) |
| 분석 진행 중 | 카드 `status === "running"` | 배지 미표시(감성은 social 완료 후에만 도착) |
| 카드 오류 | 카드 `status === "error"` | 배지 미표시(기존 오류 UI 유지) |
| 빈/초기 상태 | 분석 시작 전 | 배지 미표시 |

- 로딩 전용 스켈레톤은 두지 않는다 — 감성은 social 본문이 완료된 직후 단발로 도착하므로, 본문 미리보기가 뜬 뒤 배지가 추가되는 점진 표시(기존 `motion` fade-in 재사용)로 충분하다.
- 배지는 social 카드의 헤더 라벨 줄과 본문 사이 또는 본문 상단에 둔다(frontend-dev 재량 — 단 "전체보기" 버튼·진행점과 겹치지 않게).

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 의 4건은 사용자 결정으로 전부 RESOLVED 됐다(q1=7단계 · q2=점수+신뢰도 병기 · q3=confidence만 · q4=MVP 저장). 그 위에서 디자이너가 확정한 세부 사항을 아래에 명시한다.

| ID | 디자이너 결정 | 근거 |
|---|---|---|
| R1 | 7단계 밴드를 **5색 톤**으로 묶고 미세 단계(약간 긍정/긍정, 약간 부정/부정)는 라벨로 세분 | 작은 칩에서 7색은 과하고 한국 관례(빨강/파랑 2축+중립)와 어긋남. 강도=색 진하기, 단계=라벨 |
| R2 | 시각 위계 = **밴드 pill(1차) → 점수 회색(보조) → 신뢰도 회색(약)**, 점수에 밴드 색 미적용 | q2 과신 방지 — 점수가 색 강조되면 정밀 수치로 오인 |
| R3 | 신뢰도 '낮음' = **opacity 톤 약화**(경고색·점선 금지) + 약화 카피 | '낮음'은 오류가 아니라 "확신 낮은 추정". 부정 신호로 보이면 안 됨 |
| R4 | **신규 토큰 추가 불필요** — 기존 Tailwind red/blue/slate 팔레트 + dark 변형 재사용, `design:sync` 토큰 PR 없음 | 기존 AI 카드가 이미 같은 팔레트 사용. theme.json/colors-dark 미변경(빌드 throw 회피) |
| R5 | 폭 제한 = `max-w-full`+`flex-wrap`, 밴드 라벨 `whitespace-nowrap` | max-w 명명 토큰 함정 회피 + 모바일 좁은 카드에서 한글 세로 깨짐 방지 |
