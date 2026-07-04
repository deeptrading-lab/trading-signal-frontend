---
version: alpha
name: toss-market-calendar
description: >-
  토스 장 상태 배지 공용 컴포넌트 `MarketStatusBadge` 디자인 가이드. 토스증권 홈 상단의 "● 국내 장 닫힘"
  패턴(색 점 + 텍스트 라벨)을 그대로 답습하되, 우리 실측 캘린더 스키마(preMarket·regularMarket·afterMarket·
  휴장)에 맞춰 `MarketPhase` 5종(pre·regular·after·closed·unknown)을 한 단계 더 세밀하게 표현한다.
  점 색으로 상태를 구분하고(열림=녹색 · 장전=amber · 시간외=blue · 마감/휴장=회색 · unknown=흐린 회색),
  휴장·마감 시 "다음 개장 M/D(요일) HH:mm" 보조 텍스트를 붙인다. 노출 위치는 헤더 지수 스트립
  (`HeaderMarketTicker`) 자리로 확정(PRD §9 q1). 국내(KR) 단독 출시이나 토스처럼 "해외 장" 배지를 옆에
  나란히 붙일 수 있는 가로 flex 레이아웃으로 설계(US 슬롯 예약). 신규 색 토큰은 열림 상태 녹색 2개
  (`market-open` · `market-open-soft`)로 한정하며 나머지는 `finsight-redesign` 라이브 토큰을 재사용한다.
  WCAG AA 4.5:1 무회귀. PRD `toss-market-calendar` §3-7 · AC-2~AC-6 · AC-10 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  border-line: "#eceff3"
  text-muted: "#5b6470"
  warn: "#a14a06"
  info: "#1c4fd1"
  market-open: "#166534"
  market-open-soft: "#dcfce7"
typography:
  label-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.25
  caption:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 8px
  pill: 999px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
components:
  market-badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs}"
  market-badge-open:
    backgroundColor: "{colors.market-open-soft}"
    textColor: "{colors.market-open}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs}"
  status-dot-open:
    backgroundColor: "{colors.market-open}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  status-dot-pre:
    backgroundColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  status-dot-after:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  status-dot-closed:
    backgroundColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  status-dot-unknown:
    backgroundColor: "{colors.border-line}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  next-open-supplement:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  skeleton-badge:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.pill}"
    height: "{spacing.lg}"
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
---

# toss-market-calendar 디자인 가이드

## Overview

토스증권 홈 최상단에는 지수 스트립(나스닥·S&P500) 바로 위에 **아주 작은 상태 필(pill)** 두 개가 가로로
나란히 놓인다: `● 국내 장 닫힘` · `● 해외 장 닫힘`. 색 점 하나 + 회색 텍스트 라벨이 전부인, 밀도 높고
간결한 토스톤 컴포넌트다. 점 색이 곧 상태 신호(닫힘=회색, 열림=컬러)다.

이 가이드는 그 패턴을 우리 앱의 공용 `MarketStatusBadge` 로 옮기되, 토스보다 **한 단계 세밀하게** 만든다.
우리 실측 캘린더(`GET /api/v1/market-calendar/KR`)에는 장전 동시호가(preMarket 08:00~09:00)·정규장
(regularMarket 09:00~15:30)·시간외(afterMarket 15:30~20:00)·휴장(`today.integrated === null`)이 모두
들어 있어, 토스의 "열림/닫힘" 2값보다 넓은 `MarketPhase` 5종을 점 색·라벨로 표현할 수 있다.

핵심 방향:

- **점(●) + 라벨 = 최소 단위**: 상태의 1차 신호는 **점 색**. 라벨은 사람이 읽는 확인용. 토스처럼 작고 조용하게.
- **phase 5종 세밀화**: `regular`(장중)·`pre`(장전)·`after`(시간외)·`closed`(마감/휴장)·`unknown`(조회 실패).
  토스의 열림/닫힘을 우리 세션 경계 데이터로 쪼갠다.
- **열림 하나만 강조**: 사용자가 가장 알고 싶은 것은 "지금 거래되는가"다. 그래서 `regular`(장중)만
  녹색 점 + 옅은 녹색 필로 **라이브 강조**, 나머지 상태는 색 점 + 슬레이트/회색 라벨로 조용히 둔다.
- **다음 개장 안내**: 마감·휴장 시 "다음 개장 7/6(월) 09:00" 보조 텍스트로 다음 행동 시점을 준다
  (토스에는 없는 우리 추가 가치 — `nextBusinessDay` 활용).
- **US 슬롯 예약**: 국내(KR) 단독 출시. 하지만 토스처럼 "해외 장" 배지를 옆에 붙일 수 있게 **가로 flex**
  컨테이너로 설계하고 오른쪽 슬롯을 비워 둔다(US 는 본 범위 밖, PRD §4).
- **신규 색 토큰 2개**: 녹색은 이 시스템에 등락(상승=빨강/하락=파랑)·차트용밖에 없어 "장 열림" 의미에
  맞는 세만틱 토큰이 없다. 그래서 `market-open`(녹색 점·라벨)·`market-open-soft`(라이브 필 배경) 두 개만
  신규로 도입하고(§Colors 근거), 나머지 색은 전부 `finsight-redesign` 라이브 토큰을 재사용한다.

## Colors

색은 열림 상태 녹색 2개를 제외하면 **신규 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰을 그대로
참조한다(`design:sync` SSOT 는 `finsight-redesign.md` 하나이므로, frontend-dev 는 이미 존재하는
`bg-warn`·`text-primary`·`bg-border-line` 같은 유틸을 그대로 호출한다 — 이 문서 front matter 의 재선언은
lint 참조 해소용 동일값이다).

- **열림(regular) = `market-open`(#166534) · `market-open-soft`(#dcfce7) — 신규 2개**: 점은 `market-open`
  녹색, 라벨은 `market-open` + 배경 `market-open-soft` 옅은 녹색 필로 "지금 거래 중" 을 유일하게 강조한다.
  **신규 도입 근거**: 우리 팔레트의 녹색은 전부 차트 전용(`chart-hist-up` 등)이거나 공포·탐욕 게이지
  (`fng-fear`)라 "장 열림" 을 뜻하는 세만틱 색이 없다. 한국식 등락색은 상승=빨강(`signal-up`)·하락=파랑
  (`signal-down`)이라 열림에 그대로 쓰면 등락 의미와 충돌한다(녹색은 등락에 안 쓰이므로 안전). 토스도
  열림을 녹색 점으로 표현한다(레퍼런스). `#166534`(green-800)은 흰 배경·`market-open-soft` 위 모두
  AA 4.5:1 를 넘는 깊은 녹색으로, 슬레이트 primary 와 어울리는 차분한 톤을 택했다(토스의 밝은 녹색보다
  한 단계 절제). **SSOT 병합 지침**: frontend-dev 는 이 두 키를 `finsight-redesign.md` 의 `colors` 와
  `colors-dark` 양쪽에 추가한다(한쪽만 추가 시 `design:sync` throw — reference_design-token-sync-ssot).
  다크값 권고: `market-open` ≈ `#4ade80`, `market-open-soft` ≈ `#14321f`.
- **장전(pre) = `warn`(#a14a06)**: 정규장 직전 동시호가 구간. "곧 열림" 의 준비/주의 뉘앙스를 amber 로.
  점만 색을 쓰고 라벨은 슬레이트(`primary`)로 조용히 둔다.
- **시간외(after) = `info`(#1c4fd1)**: 정규장 종료 후 시간외 거래(15:30~20:00). 부차 정보라는 파랑 계열.
- **마감/휴장(closed) = `text-muted`(#5b6470)**: 영업일 20시 이후 마감·주말·공휴일 휴장 모두 회색 점.
  토스의 "닫힘 = 회색 점" 그대로. 라벨은 `primary` 슬레이트.
- **조회 실패(unknown) = `border-line`(#eceff3)**: 토스 키 없음/캘린더 실패 fail-soft. 점을 가장 흐린
  회색으로. 단, 기본 동작은 **배지 미표시**이며 이 흐린 점은 드문 폴백 표시에만 쓴다(§Components).
- **컨테이너·라벨 = `surface`(#ffffff) · `primary`(#1f3b4d) · `text-muted`(#5b6470)**: 배지 배경은
  스트립과 같은 흰색, 기본 라벨은 슬레이트 `primary`(대비 ~10:1), 다음 개장 보조 텍스트는 `text-muted`.
- **로딩 = `surface-muted`(#f6f8fa)**: 첫 조회 중 필 모양 스켈레톤.

## Typography

- **라벨 = `label-sm`(13px/700)**: "장중"·"장 마감" 등 상태 라벨. 토스 배지의 작고 또렷한 톤. 13px 로
  스트립 밀도를 지키면서 굵기 700 으로 가독을 확보한다.
- **다음 개장 보조 = `caption`(12px/400)**: "다음 개장 7/6(월) 09:00". 라벨보다 한 단 낮춘 위계의 부차
  정보. PC 에서만 노출(모바일은 생략/탭 — §Layout).
- 배지 안에는 이 두 위계만 둔다(점은 텍스트 아님). 종목코드·숫자 정렬(tnum) 은 배지에 없다.

## Layout

### 노출 위치 (PRD §9 q1 확정)

**헤더 지수 스트립 지면(`components/layout/HeaderMarketTicker.tsx`) 자리로 확정한다.** 근거:

- 토스 레퍼런스가 정확히 이 지면(지수 스트립 바로 위)에 배지를 둔다 — 사용자 멘탈모델 정합.
- 장 상태는 **전역 컨텍스트**(어느 화면에서든 "지금 장이 열렸나"가 유효)라 헤더 상시 노출이 옳다
  (PM 권고 §9 q1 동일).
- ⚠️ **주의**: 기존 티커 스트립은 `hidden lg:flex`(데스크탑 전용, 모바일 BFF 왕복 차단)이다.
  **`MarketStatusBadge` 는 그 gate 를 상속하지 않고 모바일에도 렌더**해야 한다 — 장 상태는 모바일에서
  더 자주 확인하는 정보다. 따라서 배지는 티커 컴포넌트 *내부*가 아니라 **헤더 상단 행의 독립 슬롯**
  (티커 스트립과 형제)에 배치하고, 모바일 축약형(§반응형)으로 항상 노출한다.

### 컨테이너 골격 (US 슬롯 예약)

가로 flex 1행: `[KR 배지] [gap] [US 배지 슬롯(예약, 현재 비움)]`.

- **`market-status-strip`(가로 flex, `gap` = `spacing.sm`)**: 각 배지는 `[● 점] [gap=xs] [라벨] [gap=sm]
  [다음 개장 보조]` 인라인 구성. 토스처럼 두 배지가 좌측 정렬로 나란히.
- **US 슬롯**: 이번 범위 밖(PRD §4). 컨테이너는 두 번째 배지를 받을 수 있는 flex 구조만 유지하고
  현재는 렌더하지 않는다. US 합류 시 두 배지 모두 시장 접두("국내"/"해외")를 붙인다(아래 R6).
- **KR 단독 현재**: 배지가 하나뿐이라 접두("국내")를 **생략**한다(중복 라벨 회피). US 합류 시 접두 부활.

### 반응형 (두 뷰포트)

배지는 협소한 헤더에 상시 노출되므로, 폭에 따라 3단계로 축약한다.

| 뷰포트 | 점 | 라벨 | 다음 개장 보조 |
|---|---|---|---|
| **데스크탑 (≥ `lg` 1024px)** | ● | 풀 라벨("장 마감") | 노출("다음 개장 7/6(월) 09:00") |
| **태블릿 (`md`~`lg`)** | ● | 풀 라벨 | 생략(탭 시 툴팁/보조노출 옵션) |
| **모바일 (< `md` 768px)** | ● | 축약 라벨("마감"·"장중"·"휴장") | 생략 |

- **모바일 축약 라벨**: `장중`(그대로)·`장전`·`시간외`·`마감`·`휴장`. 다음 개장 보조 텍스트는 생략하고,
  필요 시 배지 탭으로 보조 정보를 노출(옵션 — MVP 는 생략만으로 충분). 점 색이 상태를 이미 전달하므로
  라벨을 잘라도 정보 손실이 작다.
- **최소 폭 방어**: 극협소(작은 폰) 상황에서도 최소 `● + 축약 라벨` 은 유지한다(점만 남기지 않는다 —
  점 단독은 색맹 접근성에서 상태 식별 불가). 색+텍스트 이중 인코딩 유지.
- **JS 분기는 `useBreakpoint`** (`window.innerWidth` 직접 검사 금지). 축약 임계·보조 텍스트 노출 판단에
  `isDesktop`/`isMobile` 사용. Tailwind `md:`/`lg:` prefix 를 1차 도구로 병행.

## Elevation & Depth

- 배지는 **그림자 없는 플랫** 요소다. 헤더 스트립 위 인라인 칩이라 elevation 을 얹지 않는다(토스도 플랫).
- **라이브 강조(장중)**: `regular` 상태의 녹색 점에 **은은한 펄스**를 준다(SSOT `motion.duration-slow`
  320ms · `ease-standard` 기반 opacity/scale 미세 루프). "지금 거래 중" 을 정적 색보다 한 겹 더 살린다.
  과하지 않게 — 산만함 금지(다른 상태는 정적). `prefers-reduced-motion` 시 펄스 제거, 색만 유지.
- 점은 z 축상 라벨과 같은 평면. 옅은 녹색 필(`market-open-soft`)은 배경 레이어(텍스트 아래).

## Shapes

- 점(●)·라이브 필·스켈레톤: `rounded.pill`(999px) — 완전한 원/알약.
- 점은 `spacing.sm`(6px) 정사각 → pill 라운드로 원. 토스 점과 동일한 작은 크기.
- 배지 필(장중)은 라벨을 감싸는 알약. 나머지 상태는 배경 없는 인라인이라 형태 없음.
- 각진 사각·큰 라운드는 쓰지 않는다(작고 둥근 토스톤 유지).

## Components

- `market-badge`: 기본 배지 컨테이너(마감·장전·시간외·휴장 공통). 배경 없는 인라인 톤(`surface`),
  라벨 `primary`, `label-sm`. 점 + 라벨을 감싼다.
- `market-badge-open`: 장중 전용 변형. `market-open-soft` 옅은 녹색 필 + `market-open` 라벨. 유일한
  라이브 강조 상태.
- `status-dot-open` / `-pre` / `-after` / `-closed` / `-unknown`: phase 별 색 점(6px 원). 텍스트 없는
  장식 신호 레이어 — 색은 각각 `market-open`·`warn`·`info`·`text-muted`·`border-line`.
- `next-open-supplement`: "다음 개장 M/D(요일) HH:mm" 보조 텍스트(`text-muted`, `caption`). `closed`
  (마감·휴장)에서 `nextOpen` 존재 시만. PC 노출·모바일 생략.
- `skeleton-badge`: 첫 조회 로딩 필 모양 스켈레톤(`surface-muted`, pill). 이전 값이 있으면 스켈레톤
  대신 **직전 값 유지**(§상태 3계층).

## Do's and Don'ts

- ✅ 상태 1차 신호는 **점 색**, 라벨은 확인용으로 둔다(토스 패턴). 색+텍스트 이중 인코딩 유지.
- ✅ 열림(`regular`) **하나만** 녹색 점 + 옅은 녹색 필로 강조하고, 나머지는 조용히 둔다.
- ✅ 마감·휴장 시 `nextOpen` 이 있으면 "다음 개장 M/D(요일) HH:mm" 보조 텍스트를 붙인다.
- ✅ US 배지를 나중에 붙일 수 있도록 **가로 flex + 오른쪽 슬롯 예약** 구조를 지킨다.
- ✅ 배지는 모바일에도 렌더한다(티커 스트립의 `hidden lg:` gate 를 상속하지 않는다).
- ✅ 한글 카피는 `lib/copy/market/marketStatus.ts` 단일 위치, 색·간격은 토큰만(`cn` 헬퍼).
- ❌ 극협소에서도 **점만 남기지 않는다**(색맹 접근성 — 최소 축약 라벨 유지).
- ❌ 열림에 등락색(`signal-up`/`signal-down`)을 쓰지 않는다(상승/하락 의미와 충돌 — 녹색 전용).
- ❌ 배지에 그림자·큰 라운드·종목코드를 넣지 않는다. hex/px 직타 금지.
- ❌ `unknown` 을 시끄러운 에러 UI 로 승격하지 않는다(fail-soft = 미표시 기본).

---

## 유저 시나리오 (태스크 플로우)

### S1. 아무 화면에서나 장 상태 확인 (전역 헤더)

1. 사용자가 어느 화면이든 진입 → 헤더 상단, 지수 스트립 위에 `MarketStatusBadge` 가 상시 노출.
2. 첫 조회 중이면 **로딩(스켈레톤 필 or 직전 값 유지)** → 응답 도착 시 실제 phase 배지로 교체.
3. 장중이면 `● 장중`(녹색 점 + 옅은 녹색 필 + 은은한 펄스)로 "지금 거래 중" 을 즉시 인지.
4. 세션 경계(09:00·15:30·20:00)를 지나면 **네트워크 재요청 없이** 클라 재평가로 라벨이 갱신된다
   (`pre`→`regular`→`after`→`closed`, PRD §3-6 · q2).

### S2. 장 마감/휴장 시 다음 개장 확인

1. 평일 20시 이후 또는 주말·공휴일 진입 → `● 장 마감` 또는 `● 휴장`(회색 점).
2. 옆에 "다음 개장 7/6(월) 09:00" 보조 텍스트(PC) → 사용자가 다음 거래일을 바로 안다.
3. 모바일에서는 축약 라벨(`마감`·`휴장`)만, 보조 텍스트는 생략(점 색 + 라벨로 충분).

### S3. 토스 키 없음 / 조회 실패 (fail-soft)

1. 동료 로컬(토스 키 없음) 또는 캘린더 조회 실패 → `phase = unknown`.
2. 기본 동작 = **배지 미표시**(헤더 무회귀, 폴링 0콜, 에러 로그 0 — AC-1). 레이아웃 붕괴 없음.
3. (드문 폴백) 흐린 회색 점만 렌더하는 중립 표시 옵션 — 크래시·경보 없음.

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/market/marketStatus.ts` 신규 단일 위치.

### phase × (점 색 · 라벨 · 필 · 보조) 매트릭스

| phase | 점 컴포넌트 | 라벨(PC) | 라벨(모바일 축약) | 배경 필 | 다음 개장 보조 |
|---|---|---|---|---|---|
| `regular` (장중) | `status-dot-open`(녹색) | `장중` | `장중` | `market-badge-open`(옅은 녹색, 펄스) | 없음 |
| `pre` (장전) | `status-dot-pre`(amber) | `장전 · 동시호가 08:50` | `장전` | 없음(`market-badge`) | 없음 |
| `after` (시간외) | `status-dot-after`(blue) | `시간외 · 20:00까지` | `시간외` | 없음 | 없음 |
| `closed` (영업일 마감) | `status-dot-closed`(회색) | `장 마감 · 다음 개장 M/D(요일) HH:mm` | `마감` | 없음 | 있음(`nextOpen`) |
| `closed` (주말·공휴일 휴장) | `status-dot-closed`(회색) | `휴장 · 다음 개장 M/D(요일) HH:mm` | `휴장` | 없음 | 있음(`nextOpen`) |
| `unknown` (조회 실패) | (기본 미표시) · 폴백 시 `status-dot-unknown`(흐린 회색) | 미표시 / 없음 | 없음 | 없음 |

- `closed` 마감 vs 휴장 구분: `todayIsBusinessDay` 로 라벨만 분기(`장 마감` vs `휴장`). 점 색·구조 동일.
- 시각 값(`08:50`·`20:00`·`09:00`)·요일·`M/D` 포맷은 서버 응답 `sessionTimes`/`nextOpen` 에서 파생
  (하드코딩 금지). KST 포맷은 `lib/api/toss/kst.ts` 재사용(PRD §9 q5).

### 상태 3계층 (로딩 · 정상 · fail-soft)

| 계층 | 트리거 | 렌더 | 카피 |
|---|---|---|---|
| **로딩** | 첫 fetch pending, 직전 값 없음 | `skeleton-badge`(pill 스켈레톤). 헤더 높이·폭 유지(레이아웃 시프트 0). | — |
| **로딩(재검증)** | staleTime 만료 재요청, 직전 값 있음 | **직전 phase 배지 유지**(깜빡임 방지). 스켈레톤 미사용. | 직전 값 |
| **정상** | `status.phase !== "unknown"` | 위 매트릭스대로 점 + 라벨 (+보조). | phase 별 |
| **fail-soft(unknown)** | 키 없음(`X-Data-Source: none`)·조회 실패·타임아웃 | **배지 미표시**(조건부 렌더 안 함). 에러 UI 없음(never-throw). | — (미표시) |

### 배선 규칙

- `MarketStatusBadge` 는 **자족 컴포넌트** — 내부에서 `useMarketStatus()` 호출(`StockWarningBadges`·
  `OrderbookPanel` 선례). 지면(`HeaderMarketTicker` 형제 슬롯)은 배치만 결정.
- 데이터 없으면(`phase="unknown"`) 컴포넌트가 **`null` 반환** → 지면은 조건부 렌더 불필요(자기 은닉).
- 모바일 노출 필수 → 티커의 `hidden lg:flex` gate 를 상속하지 않도록 배지를 티커 컴포넌트 **밖** 형제로
  둔다(§Layout). 축약은 `useBreakpoint` 로 컴포넌트 내부에서 판단.
- phase 클라 재평가(세션 경계 setTimeout, PRD §9 q2 권고 b)는 훅(`useMarketStatus`) 책임 — 배지는
  훅이 준 최신 phase 를 렌더만 한다.

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역 + 시각 설계에서 파생된 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 노출 위치 (PRD §9 q1) | **헤더 지수 스트립(`HeaderMarketTicker`) 자리**로 확정. 단 배지는 티커의 `hidden lg:flex` gate 를 상속하지 않고 **모바일에도 렌더**(형제 슬롯). 마켓 홈 병행 배치는 불필요(전역 헤더로 충분). |
| R2 | phase별 점 색 매핑 | 열림=`market-open`(녹색)·장전=`warn`(amber)·시간외=`info`(blue)·마감/휴장=`text-muted`(회색)·unknown=`border-line`(흐린 회색). 토스 "닫힘=회색·열림=컬러" 확장. |
| R3 | 강조 정책 | **장중(`regular`) 하나만** 옅은 녹색 필(`market-badge-open`) + 은은한 펄스로 라이브 강조. 나머지는 배경 없는 인라인(점 색만). |
| R4 | 신규 색 토큰 | **2개만 신규**: `market-open`(#166534)·`market-open-soft`(#dcfce7). 근거=팔레트에 "장 열림" 세만틱 녹색 부재(기존 녹색은 차트·게이지 전용, 등락색은 빨강/파랑). SSOT 병합 시 `colors`+`colors-dark` 양쪽 추가(다크값 권고 명시). 그 외 색·간격·라운드·타이포는 전부 재사용. |
| R5 | 모바일 축약 | PC=점+풀라벨+다음개장, 태블릿=점+풀라벨(보조 생략), 모바일=점+축약라벨(`장중`·`장전`·`시간외`·`마감`·`휴장`, 보조 생략). 극협소에서도 점 단독 금지(색맹 접근성 — 축약 라벨 유지). |
| R6 | US 슬롯 · 시장 접두 | 가로 flex + 오른쪽 US 슬롯 예약(현재 비움). KR 단독 현재는 접두("국내") 생략, US 합류 시 두 배지 모두 "국내"/"해외" 접두 부활. |
| R7 | 마감 vs 휴장 카피 | 둘 다 `closed` phase·회색 점·구조 동일, 라벨만 `todayIsBusinessDay` 로 분기(`장 마감` vs `휴장`). 둘 다 `nextOpen` 보조 텍스트 동반. |
| R8 | unknown 처리 | 기본 **배지 미표시**(컴포넌트 `null` 반환, fail-soft). 흐린 회색 점 폴백은 드문 옵션. 에러 UI·경보로 승격 금지. |
| R9 | 로딩 표현 | 직전 값 없음=`skeleton-badge` pill 스켈레톤(레이아웃 시프트 0). 직전 값 있음=직전 배지 유지(깜빡임 방지). |
| R10 | 종목코드/그림자 | 배지에 종목코드 없음(무관), 그림자 없음(플랫 토스톤 유지). |
