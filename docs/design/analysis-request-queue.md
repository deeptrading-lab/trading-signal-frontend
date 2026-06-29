---
version: alpha
name: analysis-request-queue
description: prod 배포 주소에서 AI 종합분석을 "요청(enqueue)"하는 비동기 카드 상태 — 신선도 재사용 / 접수·대기 / 오프라인 경고 / 중복 / 처리 중 뱃지. 실시간 스트림 없음(prod 한정). 색·간격은 앱 글로벌 토큰(info / warn / accent-vivid / critical) 재사용, 신규 빌드 토큰 0.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-vivid: "#1d4ed8"
  accent-vivid-soft: "#dbeafe"
  info: "#1c4fd1"
  info-soft: "#e7efff"
  warn: "#a14a06"
  warn-soft: "#fff3df"
  critical: "#8e1717"
  critical-soft: "#fde1e1"
typography:
  heading:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  meta:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  badge:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  card: 16px
  control: 8px
  pill: 999px
spacing:
  card-px: 16px
  stack-gap: 12px
  inline-gap: 8px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  request-cta:
    backgroundColor: "{colors.accent-vivid}"
    textColor: "{colors.surface}"
    typography: "{typography.heading}"
    rounded: "{rounded.control}"
    padding: "{spacing.inline-gap}"
    height: 40px
  accepted-banner:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-px}"
  offline-banner:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-px}"
  duplicate-banner:
    backgroundColor: "{colors.accent-vivid-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-px}"
  failed-banner:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-px}"
  processing-badge:
    backgroundColor: "{colors.accent-vivid-soft}"
    textColor: "{colors.info}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "{spacing.inline-gap}"
  empty-intro:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-px}"
  banner-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.heading}"
    rounded: "{rounded.card}"
    padding: "{spacing.inline-gap}"
---

# analysis-request-queue 디자인 가이드

## Overview

이 문서는 **prod(Vercel) 배포 주소에서 AI 종합분석을 "요청"하는 비동기 카드 상태**를 설계한다.

배경은 PRD §1 그대로다. AI 멀티에이전트 분석은 로컬 CLI를 셸로 spawn 해 구동하므로 **로컬(`next dev`)에서만 실제 실행**된다. prod에는 그 바이너리가 없어 분석을 "직접 시작"할 수 없다. 본 작업은 prod 배포 주소를 공유받은 사람이 분석을 **요청(enqueue → Supabase 큐)**할 수 있게 하되, 실제 실행은 로컬 워커가 켜져 있을 때만 일어나는 **"요청 접수 → 몇 분 뒤 재방문 → 결과 확인"** 비동기 모델이다.

따라서 prod 카드에는 **실시간 진행 스트림(SSE)이 없다.** 라이브 에이전트 진행 바·토론 스트리밍·`SlideToAnalyze` 슬라이드 스위치는 전부 **로컬 전용**이며, 본 설계는 그것들을 **건드리지 않는다(무회귀)**. prod에서만 보이는 얇은 상태 레이어를 추가할 뿐이다.

### 설계 원칙 3가지

1. **밝고 간결한 토스톤 · 정보 밀도 우선.** 요청자는 "내 요청이 접수됐나? 언제 결과를 보나? 지금 서버가 켜져 있나?" 세 가지만 알면 된다. 각 상태는 한 줄 제목 + 한 줄 보조 안내로 끝낸다. 색 텍스트·과한 장식·이모지 도배 없이, 의미를 색(접수=파랑 info / 경고=주황 warn / 실패=빨강 critical)으로만 가른다.
2. **신규 빌드 토큰 0 — 앱 글로벌 토큰 재사용.** 이 화면의 모든 상태는 앱이 이미 가진 의미 토큰(`info` 정보 / `warn` 경고 / `critical` 실패 / `accent-vivid` primary CTA)과 기존 합성 컴포넌트 클래스(`.card-info`·`.card-warn`·`.card-critical`·`.badge-info`)로 표현 가능하다. front matter 토큰은 lint·핸드오프용 자기완결 사본이며, **frontend-dev는 새 토큰을 만들지 않고 기존 글로벌 토큰을 그대로 호출한다**(아래 Colors 매핑표). `design:sync`(SSOT = `finsight-redesign.md`)에 추가 변경이 없다.
3. **상태 머신 1:1.** prod 카드는 8개 상태(신선 재사용 / 신선도 낮음 / 이전 결과 없음 / 접수·대기 / 처리 중 / 오프라인 경고 / 중복 / 완료)를 갖는다. 각 상태는 한 컴포넌트 키(또는 기존 카드 재사용)에 1:1 매핑되고, 상태 전이는 폴링·재방문 기반(실시간 push 아님)이다.

대상 컴포넌트: `components/stock/AIAnalysisPanel.tsx`의 `PreviousDecisionIntro` **prod 분기**와 `ProviderChooser`의 **prod(`data.vercel === true`) 분기**. 그 외 라이브 분석 뷰(분석가 카드·토론·`FinalVerdictCard`·`SlideToAnalyze`)는 무변경이다.

> **prod 판별(클라이언트):** 기존 패턴 재사용 — `typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string"` (Vercel 이 빌드타임 인라인, 하이드레이션 불일치 없음. `components/layout/navItems.ts:66` 선례). 정확한 배선은 frontend-dev 몫이며, 디자인은 "이 상태들은 **prod 한정**으로만 그린다"는 점만 못 박는다. 로컬은 기존 라이브 경로 그대로.

## 유저 시나리오

전제: 배포 주소(`trading-signal-frontend.vercel.app`)를 공유받은 사용자가 prod에서 종목 상세 → "AI 종합분석"을 연다.

### S1. 이전 결과가 신선(30분 이내) — 그대로 읽기

1. 패널을 열면 저장된 이전 결론(`FinalVerdictCard`)이 **먼저** 보인다. 며칠 전 결과여도 우선 보여준다(기존 동작).
2. 마지막 분석이 **30분 이내**면 재요청 UI를 **숨긴다.** 사용자는 결과만 읽는다. (로컬의 `REANALYSIS_PROMPT_MIN_AGE_MS = 30분` 룰과 동일 임계.)
3. 끝. 추가 요청 없이 정보 소비만.

### S2. 이전 결과는 있으나 신선도 낮음 — 재요청 유도

1. 패널 상단 안내 박스에 이전 결론 메타(날짜·provider)와 함께 **재요청 컨트롤**(`request-cta`)이 노출된다.
2. prod는 슬라이드 스위치(`SlideToAnalyze`)를 그릴 전제(로컬 CLI 가용)가 안 되므로, **버튼 1개**("이 종목 다시 분석 요청")로 단순화한다 — 사용자가 명시적으로 누를 때만 enqueue.
3. 버튼을 누르면 → **S4(접수·대기)** 또는 **S6(중복)** 또는 **S5(오프라인 경고)** 중 하나로 전이.

### S3. 이전 결과 없음 — 첫 분석 요청 유도

1. 저장된 결론이 없으면(`getLatestAIDecision` 빈 결과) "아직 분석 결과가 없어요" 인트로(`empty-intro`) + **요청 CTA**("이 종목 분석 요청").
2. prod 인트로 카피는 비동기 모델을 미리 설명: "요청하면 잠시 뒤 이 화면에서 결과를 볼 수 있어요."
3. 누르면 → S4/S5/S6.

### S4. 요청 접수됨(대기) — 정상 경로

1. 클릭 직후 enqueue BFF 가 `{ status:'queued' }` 반환 → **접수 확인 배너**(`accepted-banner`, info 톤): "분석 요청이 접수됐어요."
2. 보조 안내: "보통 몇 분 뒤 이 화면에서 결과를 볼 수 있어요. 잠시 후 다시 들러 주세요." (예상 대기 + 재방문 안내. 실시간 진행 바 없음.)
3. (선택) worker-status 가 `online && busy` 또는 큐에 자기 종목이 있으면 헤더에 **"분석 중" 뱃지**(`processing-badge`)를 폴링으로 노출(S7).
4. 사용자는 패널을 닫고 몇 분 뒤 재방문 → **S8(완료)**.

### S5. 오프라인 경고(접수 + 경고) — worker 꺼짐

1. enqueue 응답에 `workerOffline:true` → 접수 배너 자리에 **오프라인 경고 배너**(`offline-banner`, warn 톤): "분석 요청은 접수됐지만, 지금 분석 서버가 꺼져 있어요."
2. 보조 안내: "서버가 켜지면 자동으로 처리돼요. 처리되면 이 화면에서 결과를 볼 수 있어요." (차단 아님 — 큐 내구성. 요청은 정상 적재됨을 명확히.)
3. 톤은 "에러"가 아니라 "지연 경고"다 — critical(빨강) 아니라 **warn(주황)**. 요청이 사라지지 않았다는 안심을 함께 준다.

### S6. 중복 — 이미 분석 중

1. enqueue 가 `{ status:'already' }`(같은 ticker pending/processing) → **중복 안내 배너**(`duplicate-banner`, 옅은 파랑): "이미 분석 중이에요."
2. 보조 안내: "잠시 후 이 화면에서 결과를 확인할 수 있어요." 새 요청은 적재되지 않는다(중복 가드).
3. 새 CTA 클릭을 막진 않되, 다시 눌러도 같은 중복 안내로 수렴(폭주 방지).

### S7. 처리 중(선택) — 폴링 뱃지

1. worker-status GET 폴링(예: 10~20초) 결과 `online && status:'busy'` 이거나 큐 깊이에 자기 종목이 잡히면, 카드/헤더에 **"분석 중" 뱃지**.
2. 실시간 스트림이 아니라 **폴링/새로고침 기반** 상태 표시임을 시각적으로 약하게(작은 펄스 점 + 라벨) 둔다 — 라이브 진행 바와 혼동 금지.
3. prod 카드 한정. 로컬 라이브 뷰엔 추가하지 않는다.

### S8. 완료 후 — 결과 확인

1. 몇 분 뒤 재방문 → 워커가 끝까지 소비해 저장한 갱신 결론을 `useQueryAIDecision` 가 받아 **기존 `FinalVerdictCard`** 로 렌더(기존 카드 재사용, 신규 결과 UI 0).
2. 결론이 다시 신선(30분 이내)해졌으므로 재요청 UI는 다시 숨겨진다(S1로 수렴).

### S9. 분석 실패(failed) — 재방문 시

1. 워커가 `markFailed` 한 경우(provider 0개·CLI 오류 등), 재방문 시 **실패 안내 배너**(`failed-banner`, critical 톤): "지난 분석 요청이 처리되지 못했어요."
2. 보조 안내 + **재요청 CTA**("다시 요청"). 자동 재시도는 없고(PRD §9 q2: failed 자동 재시도 0), 사용자가 다시 요청하면 새 row.

## Colors

이 화면은 **중립 상태 알림 영역**이라 한국식 등락 의미색(상승=빨강/하락=파랑)과 무관하다. 앱이 이미 가진 **의미 토큰을 그대로 재사용**한다 — 새 색을 만들지 않는다. 아래는 본 front matter 토큰(자기완결 사본) ↔ **frontend-dev 가 실제로 호출할 앱 글로벌 토큰**의 매핑이다.

| 본 문서 토큰 | 글로벌 토큰(빌드 SSOT `finsight-redesign`) | Tailwind 유틸 / 합성 클래스 | 용도 |
|---|---|---|---|
| `info` (#1c4fd1) / `info-soft` (#e7efff) | `info` / `info-soft` | `.card-info` · `text-info` · `bg-info-soft` | **접수·대기** 배너(S4) — 중립 정보. "요청 받았다"의 차분한 파랑. |
| `warn` (#a14a06) / `warn-soft` (#fff3df) | `warn` / `warn-soft` | `.card-warn` · `text-warn` · `bg-warn-soft` | **오프라인 경고** 배너(S5) — 지연 경고(에러 아님). |
| `critical` (#8e1717) / `critical-soft` (#fde1e1) | `critical` / `critical-soft` | `.card-critical` · `text-critical` · `bg-critical-soft` | **실패** 배너(S9) — 처리 실패. |
| `accent-vivid` (#1d4ed8) | `accent-vivid` | `bg-accent-vivid text-surface` | **요청 CTA** 버튼(S2/S3/S9) — primary 액션. 앱 공통 파랑 버튼 정합. |
| `accent-vivid-soft` (#dbeafe) | `accent-vivid-soft` | `bg-accent-vivid-soft` | **중복 안내** 배너(S6) + **처리 중 뱃지** 배경(S7) — 옅은 진행감. |
| `primary` (#1f3b4d) | `primary` | `text-primary` | 옅은 파랑 배경(중복 배너) 위 본문 텍스트. AA 통과. |
| `surface` (#ffffff) / `surface-muted` (#f6f8fa) | `surface` / `surface-muted` | `bg-surface` / `bg-surface-muted` | 카드 바탕 / 빈 인트로(S3) 바탕. |
| `text-strong` (#0f1419) / `text-muted` (#5b6470) | `text-strong` / `text-muted` | `text-text-strong` / `text-text-muted` | 중립 제목(`banner-title`) / 보조 안내·메타 텍스트. |

> 카드 외곽선 색은 본 문서가 컴포넌트 토큰으로 들지 않는다 — DESIGN.md 컴포넌트 허용 속성에 `borderColor` 가 없고, 외곽선은 글로벌 `border-line`(`border-border-line`) 또는 `.card-*` 합성 클래스가 자동으로 입혀준다. frontend-dev 는 배너에 `.card-info`/`.card-warn`/`.card-critical` 을 쓰면 soft 배경 + 동색 border 가 함께 적용된다.

- **접수 vs 경고 vs 실패의 색 위계**가 핵심이다: 정상 접수는 **차분한 파랑(info)**, 서버 꺼짐은 **주황 경고(warn) — 빨강 아님**(요청은 살아 있으니 "에러"로 겁주지 않는다), 처리 실패만 **빨강(critical)**. 사용자가 색만 봐도 심각도를 안다.
- **다크모드**: 위 글로벌 토큰은 모두 `colors-dark` 키 정합이 이미 존재(`finsight-redesign.md`). frontend-dev 는 `.card-info`/`.card-warn`/`.card-critical` 합성 클래스를 쓰면 다크 대비가 자동 적용된다. **신규 `--fs-` 변수·`colors-dark` 키 추가 불필요**(한쪽만 추가하면 throw — 메모리 규율).

## Typography

- **heading (14px 700)**: 각 상태 배너 한 줄 제목("분석 요청이 접수됐어요" 등) · 요청 CTA 라벨.
- **body (13px 500)**: 보조 안내 한 줄(예상 대기·재방문·자동 처리 안내).
- **meta (12px 500)**: 이전 결론 메타(날짜 · provider), 빈 인트로 부가 설명.
- **badge (11px 700)**: "분석 중" 뱃지 라벨.

영문 고유명사(`Claude`·`Codex`)·ticker·API 필드를 제외한 모든 노출 문구는 한글. 폰트는 앱 공통 Pretendard(`font-display`). 별도 타이포 토큰을 빌드에 추가하지 않고, frontend-dev 는 기존 `text-body-sm`·`text-caption`·`text-badge` 스케일에 매핑한다(본 문서 heading→`body-strong`, body→`body-sm`, meta→`caption`, badge→`badge`).

## Layout

prod 상태 배너는 **이전 결론 카드(또는 빈 인트로) 위 단독 행**으로 놓인다. 배치: `[상태 배너] → [FinalVerdictCard 또는 empty-intro]`. 기존 라이브 패널의 우측 슬라이드 aside 구조·스크림·navbar 아래 시작 정책은 그대로 둔다 — 본 설계는 패널 **본문 안 상단 영역**만 추가한다.

반응형 경계는 Tailwind 기본 정합(`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280, 위 front matter `breakpoints`). JS 분기는 `useBreakpoint`(`isMobile`/`isTablet`/`isDesktop`)만 — `window.innerWidth` 직접 검사 금지.

> **폭 함정 주의:** 명명 `max-w-sm`/`max-w-xs` 는 이 저장소의 커스텀 spacing(`sm`=6px·`xs`=4px) 때문에 6px/4px 로 붕괴해 한글이 세로로 깨진다(메모리 규율). 폭 제한이 필요하면 **명시 rem**(`max-w-[28rem]`·`max-w-[44rem]`) 또는 `max-w-full`·`w-full` 을 쓴다.

### 모바일 (`< md`, isMobile)

- 상태 배너: 패널 좌우 패딩 안에서 `w-full`. 내부는 `flex-col`(제목 → 보조 안내 세로 스택, `stack-gap` 12px).
- 요청 CTA: `w-full` 풀폭 버튼(높이 40px = `request-cta.height`, 터치 타깃 충족). 배너 아래 또는 빈 인트로 안에 단독 행.
- "분석 중" 뱃지: 패널 헤더 종목명 옆 또는 카드 우상단에 컴팩트.

### 태블릿 (`md ~ lg`, isTablet)

- 모바일과 동일 스택이되, 배너 본문 가독 폭을 `max-w-[44rem]`(명시값)로 제한해 과하게 길어지지 않게 한다.
- 제목 + 보조 안내를 `sm:flex-row sm:items-center sm:justify-between` 으로 한 줄에 둘 여유가 있으면 가로 배치(좌=텍스트 / 우=CTA), 좁으면 세로 폴백.

### 데스크탑 (`>= lg`, isDesktop)

- 패널이 풀폭이므로 배너 본문은 `max-w-[44rem]`로 제한하고 좌측 정렬(이전 결론 카드 정렬에 맞춤).
- 가로 레이아웃: 좌측에 제목+보조 안내, 우측에 요청 CTA(또는 "분석 중" 뱃지). 기존 `PreviousDecisionIntro` 안내 박스의 `flex-col sm:flex-row sm:justify-between` 패턴을 그대로 재사용.
- sidebar/스크림/navbar 정책은 기존 패널 그대로 — 본 설계는 변경하지 않는다.

## Elevation & Depth

- 상태 배너는 **평면 카드**(그림자 없음, 얇은 외곽선만 — soft 배경색 + 동색 계열 border). 토스톤 "정보는 가볍게" 원칙. 알림이 떠오르는 모달처럼 무겁지 않게.
- 요청 CTA 버튼만 약한 그림자(`shadow-md shadow-accent-vivid/20`, 기존 분석 시작 버튼 패턴 정합)로 "누를 수 있는 물체" 어포던스.
- "분석 중" 뱃지·처리감은 그림자가 아니라 **옅은 펄스 점**(작은 원형 + 느린 opacity 펄스)으로 표현 — 깊이감 과잉 회피, 라이브 진행 바와 구분.

## Shapes

- 상태 배너·빈 인트로: `rounded.card`(16px) — 기존 `.card-*` 합성 클래스의 `rounded-lg`(16px) 정합.
- 요청 CTA 버튼: `rounded.control`(8px) — 앱 버튼 라운드 정합(`rounded-lg`/`rounded-xl` 중 기존 분석 버튼은 `rounded-xl`이나, 인라인 상태 CTA 는 control 8px 로 컴팩트).
- "분석 중" 뱃지: `rounded.pill`(999px) — 기존 `.badge-*` 정합.

## Components

상태별로 컴포넌트 키를 분리한다. **대부분 기존 합성 클래스(`.card-info`/`.card-warn`/`.card-critical`/`.badge-info`)에 1:1 매핑**되므로 신규 CSS 는 최소다(처리 중 뱃지·요청 CTA 정도만 인라인 유틸 조합).

| 상태(시나리오) | 컴포넌트 키 | 톤 | 매핑 기존 클래스 | 핵심 카피(제목) |
|---|---|---|---|---|
| 접수·대기 (S4) | `accepted-banner` | info 파랑 | `.card-info` | "분석 요청이 접수됐어요" |
| 오프라인 경고 (S5) | `offline-banner` | warn 주황 | `.card-warn` | "분석 요청은 접수됐지만, 지금 분석 서버가 꺼져 있어요" |
| 중복 (S6) | `duplicate-banner` | 옅은 파랑 | `bg-accent-vivid-soft text-primary` (또는 `.card-info` 약화) | "이미 분석 중이에요" |
| 실패 (S9) | `failed-banner` | critical 빨강 | `.card-critical` | "지난 분석 요청이 처리되지 못했어요" |
| 처리 중 뱃지 (S7) | `processing-badge` | 옅은 파랑 | `.badge-info` (+ 펄스 점) | "분석 중" |
| 요청 CTA (S2/S3/S9) | `request-cta` | primary 파랑 | `bg-accent-vivid text-surface rounded-control` | "이 종목 분석 요청" / "다시 요청" |
| 빈 인트로 (S3) | `empty-intro` | 중립 | `bg-surface-muted text-text-muted` | "아직 분석 결과가 없어요" |
| 중립 제목행 | `banner-title` | 중립 | `text-text-strong` (배너/인트로 제목 텍스트) | 의미색이 없는 제목(S3 인트로 등) 텍스트 |

- **접수 처리 중(클릭 직후 로딩)**: CTA 를 누르고 enqueue 응답을 기다리는 동안 버튼을 `disabled` + 인라인 스피너(`Loader2` 회전) + "요청 보내는 중…" 으로 둔다. 응답이 오면 해당 상태 배너로 교체. (낙관적 표시 금지 — 서버 응답으로 status 확정.)
- **재요청 컨트롤(S2)**: prod 는 `SlideToAnalyze` 슬라이드를 그리지 않으므로(가용 CLI 0 전제), `request-cta` 버튼 1개로 단순화. 로컬의 슬라이드 스위치 코드는 손대지 않는다.

### 상태/오류 UX (요약)

| 케이스 | 트리거 | 표시 | 다음 동작 |
|---|---|---|---|
| 로딩(접수 처리 중) | CTA 클릭 → enqueue 응답 대기 | 버튼 disabled + 스피너 + "요청 보내는 중…" | 응답으로 배너 확정 |
| 접수 성공 | `{ status:'queued' }` | `accepted-banner` + 예상 대기·재방문 안내 | 재방문 → 완료 폴링 |
| 오프라인 | `workerOffline:true` | `offline-banner`(warn) — "켜지면 자동 처리" | 큐 유지, 워커 켜지면 자동 |
| 중복 | `{ status:'already' }` | `duplicate-banner` — "이미 분석 중" | 적재 안 함, 재방문 유도 |
| 처리 중 | worker-status `busy` / 큐에 자기 종목 | `processing-badge`(폴링) | 완료까지 폴링/재방문 |
| 실패 | 재방문 시 마지막 row `failed` | `failed-banner`(critical) + 재요청 CTA | 다시 요청 → 새 row |
| enqueue 자체 실패(네트워크/미설정 fail-soft) | BFF 오류·빈 응답 | `failed-banner` 톤으로 "요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요." | 재시도 |

### 접근성 (필수)

- **상태 변화 알림**: 상태 배너 컨테이너에 `role="status"` + `aria-live="polite"`. CTA 클릭 → 접수/오프라인/중복 배너로 바뀔 때 스크린리더가 변경을 읽는다(예: "분석 요청이 접수됐어요"). 기존 `ProviderChooser`의 `ChooserShell live` 패턴(`role="status"`/`aria-live="polite"`)을 그대로 재사용.
- **명도 대비(WCAG AA 4.5:1)**: 모든 배너 색쌍은 글로벌 토큰 페어라 AA 무회귀가 이미 검증돼 있다 — `info`/`info-soft`, `warn`/`warn-soft`, `critical`/`critical-soft`, `primary`/`accent-vivid-soft`, `surface`/`accent-vivid`. 경고·대기 배너 텍스트가 옅은 배경에서 묻히지 않도록 soft 배경 + strong 동색 텍스트 조합을 유지한다(본 문서 lint AA 통과로 확인).
- **요청 CTA 라벨**: 버튼은 native `<button>` + 명시 텍스트("이 종목 분석 요청"). 아이콘만 두지 않는다. `disabled`(접수 처리 중) 시 `aria-disabled` + `aria-busy="true"`.
- **"분석 중" 뱃지**: 펄스 점은 장식이므로 `aria-hidden`, 라벨 텍스트("분석 중")로 의미 전달. 폴링 갱신이 너무 잦게 aria-live 를 때리지 않도록 뱃지 영역은 `aria-live="off"` 또는 polite 1회성으로 둔다(상태 배너만 live).
- **prefers-reduced-motion**: 펄스 점·스피너 애니메이션을 정적 표시로 대체(점은 고정 dot, 스피너는 정적 아이콘 + 텍스트).
- **터치 타깃**: 요청 CTA 높이 40px(`request-cta.height`, `hit-area-min` 40px 정합) — WCAG 2.5.5 충족.

### 카피 (한글, 토스톤)

신규 사용자 노출 문구는 `lib/copy/stock/aiAnalysis.ts` 에 **`prodQueue` 신규 키**로 추가한다(카피 인라인 금지). 기존 `chooser.vercel`("AI 종합분석은 로컬 환경(next dev)에서만 사용할 수 있어요.")는 **삭제하지 않고 폴백/회귀용으로 유지**하되, prod 카드는 아래 새 카피를 쓴다.

```ts
// lib/copy/stock/aiAnalysis.ts COPY 에 추가 제안
prodQueue: {
  /** 빈 결과 인트로(S3) */
  emptyTitle: "아직 분석 결과가 없어요",
  emptyDesc: "요청하면 잠시 뒤 이 화면에서 결과를 볼 수 있어요.",
  /** 요청 CTA(S2·S3) */
  request: "이 종목 분석 요청",
  /** CTA 누른 직후(enqueue 대기) */
  requesting: "요청 보내는 중…",
  /** 접수 성공(S4) */
  acceptedTitle: "분석 요청이 접수됐어요",
  acceptedDesc: "보통 몇 분 뒤 이 화면에서 결과를 볼 수 있어요. 잠시 후 다시 들러 주세요.",
  /** 오프라인 경고(S5) — 접수 + 경고 */
  offlineTitle: "분석 요청은 접수됐지만, 지금 분석 서버가 꺼져 있어요",
  offlineDesc: "서버가 켜지면 자동으로 처리돼요. 처리되면 이 화면에서 결과를 확인할 수 있어요.",
  /** 중복(S6) */
  duplicateTitle: "이미 분석 중이에요",
  duplicateDesc: "잠시 후 이 화면에서 결과를 확인할 수 있어요.",
  /** 처리 중 뱃지(S7) */
  processing: "분석 중",
  /** 실패(S9) */
  failedTitle: "지난 분석 요청이 처리되지 못했어요",
  failedDesc: "아래 버튼으로 다시 요청할 수 있어요.",
  retry: "다시 요청",
  /** enqueue 자체 실패(네트워크/미설정 fail-soft) */
  enqueueErrorTitle: "요청을 보내지 못했어요",
  enqueueErrorDesc: "잠시 후 다시 시도해 주세요.",
  /** 상태 변화 aria-live 안내(스크린리더) — 접수 시 1회 */
  ariaAccepted: "분석 요청이 접수됐어요",
},
```

- 톤: 모든 제목은 평서 종결("…어요")로 토스톤. 경고도 겁주지 않고("에러" 단어 회피) "켜지면 자동 처리"로 안심을 함께 준다.
- **기존 키 변경/삭제 금지** — `chooser.vercel`·`previousDecision.*`·`reanalysis.*` 는 로컬 폴백·회귀 경로에서 참조. 신규 `prodQueue.*` 만 추가.

## Do's and Don'ts

- ✅ 상태 색은 **앱 글로벌 토큰**(`info`/`warn`/`critical`/`accent-vivid`)을 재사용하고, 가능한 한 기존 합성 클래스(`.card-info`·`.card-warn`·`.card-critical`·`.badge-info`)로 그린다.
- ✅ 접수=info(파랑), 서버 꺼짐=warn(주황), 처리 실패=critical(빨강) **색 위계**로 심각도를 가른다.
- ✅ 상태 배너에 `role="status"` + `aria-live="polite"` 로 변경을 스크린리더에 알린다.
- ✅ 요청은 **사용자가 명시적으로 CTA 를 누를 때만** enqueue 한다(신선 30분 이내면 CTA 자체를 숨김).
- ✅ 폭 제한은 명시 rem(`max-w-[44rem]`)·`w-full` 로만 — 명명 `max-w-sm`/`max-w-xs` 금지(커스텀 spacing 붕괴).
- ✅ 완료 결과는 **기존 `FinalVerdictCard`** 를 재사용한다(신규 결과 UI 0).
- ❌ prod 카드에 **실시간 진행 스트림(SSE)·라이브 에이전트 진행 바·`SlideToAnalyze` 슬라이드**를 그리지 않는다(prod 무회귀 — 로컬 전용).
- ❌ 새 빌드 토큰(색·spacing·radius)을 만들지 않는다 — `design:sync` SSOT(`finsight-redesign.md`) 변경 0.
- ❌ 오프라인을 빨강(critical)으로 표시해 "에러/요청 실패"로 오인시키지 않는다 — 요청은 살아 있으므로 warn(주황).
- ❌ 색·간격을 코드에 hex/px 로 직타하지 않는다(`design:sync` 토큰 경유).
- ❌ "분석 중" 폴링 뱃지를 라이브 진행 바처럼 무겁게(스트리밍 텍스트·다단 진행) 그리지 않는다 — 폴링/재방문 모델임을 약한 펄스로만 표현.
- ❌ 카피를 컴포넌트에 인라인하지 않는다 — `lib/copy/stock/aiAnalysis.ts` `prodQueue.*`.

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 의 OPEN QUESTION 중 **UX 표면에 해당하는 항목**의 디자이너 결정. (인프라·정책 항목 q2~q5 는 PM/BE 영역이라 본 표에서 디자인 영향만 기록.)

| ID | 질문(출처) | 결정 |
|---|---|---|
| R1 | prod 재요청 컨트롤을 슬라이드 스위치(`SlideToAnalyze`)로 둘지, 버튼으로 둘지 (§3-6 / `slide-to-analyze` 연계) | **버튼(`request-cta`) 1개로 단순화.** prod 는 가용 CLI 0 전제라 슬라이드의 "provider 선택+실행" 의미가 없고(provider 노출 0), 비동기 접수 모델엔 "한 번 누르면 접수"가 더 정확. 슬라이드 코드는 로컬 전용으로 무회귀. |
| R2 | 오프라인 경고의 색 위계 (warn vs critical) | **warn(주황) 채택.** 요청은 정상 적재(큐 내구성)되므로 "실패/에러"가 아닌 "지연 경고"다. critical(빨강)은 실제 처리 실패(S9)에만. |
| R3 | "처리 중" 뱃지(S7)를 v1 에 넣을지 (§3-6 "선택") | **약한 폴링 뱃지로 포함(선택적 노출).** worker-status `busy`/큐 매칭 시에만. 단 라이브 진행 바와 명확히 구분(작은 펄스 점 + 라벨). 폴링 비용·깜빡임이 문제면 frontend-dev 가 v1 에서 뱃지 생략하고 접수 배너만 유지해도 무방(접근성·핵심 흐름 손실 없음). |
| R4 | 접수 표시를 낙관적(클릭 즉시 "접수") vs 서버 확정 후 표시 | **서버 응답 확정 후 표시.** enqueue 응답(`queued`/`already`/`workerOffline`)에 따라 배너가 갈리므로 낙관적 표시는 오안내 위험(중복인데 "접수됨" 표시 등). 클릭~응답 사이는 "요청 보내는 중…" 로딩으로 메운다. |
| R5 | 완료 알림(재방문 없이 push) 표시 여부 (§9 q6) | **v1 미표시(재방문 모델).** PRD §9 q6 권고대로 후속. 본 디자인은 "몇 분 뒤 재방문" 안내 카피로 충분히 닫는다. Slack 핑 등은 Scope B. |
