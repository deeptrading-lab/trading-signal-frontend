# PRD: design-tone-refinement

- **slug**: `design-tone-refinement`
- **작성일**: 2026-05-22
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #24 머지 완료. main `c7ae7cd`. 3분할 PRD (`layout-redesign` (#21) + `component-compactness` (#22) + `claude-cli-analysis` (#23)) + `polish-followups` (#24) 모두 정착. 본 PRD 는 사용자가 실제 데스크탑 dev 화면 스크린샷 2장을 보고 명시적으로 지적한 **디자인 결함 3건** 을 일괄 흡수한다. PR #25 의 1차 fix 결과를 사용자가 dev 화면에서 확인한 후 추가 피드백 2건 (결함 4·5) 을 본 PRD 안에 in-place 누적 흡수 — 한 PR 안에서 결함 1~5 통합 처리.
- **UI 포함 여부**: **yes** — 본 PRD 의 핵심은 색 토큰 톤 재조정 + dropdown anchor / sidebar height 의 시각 fix. **DESIGN.md v7 신설** 이 디자이너 책임 영역. 디자이너 비중이 본 PRD 의 60% 이상.
- **선행 / 후행 관계**:
  - **선행 (모두 머지 완료)**:
    - `layout-redesign` (PR #21) — 3-section shell. 본 PRD 무수정 계승.
    - `component-compactness` (PR #22) — 컴포넌트 내부 컴팩트화. 본 PRD 가 PR #22 의 SearchPanel dropdown 위치 회귀를 fix.
    - `claude-cli-analysis` (PR #23) — BFF adapter + claude CLI. 본 PRD 무영향.
    - `polish-followups` (PR #24) — 후속 nit 6건 일괄 흡수. 본 PRD 무영향 (색 토큰 영역은 #24 비대상).
    - `palette-modernization` — 13 토큰 정착 (DESIGN.md v6 기준). 본 PRD 가 v7 신설로 톤 재조정 후속 진입.
  - **후행 (사용자 결정)**:
    - PRD `claude-api-analysis` (가칭) — 사용자 명시 의도. 로컬 CLI 실 검증 후 진입.
    - PRD `analyze-streaming` (가칭) — 단일 응답 → streaming.
    - PRD `dark-mode` (가칭) — 본 PRD 의 semantic 토큰 명명을 전제로 진입.

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

사용자가 데스크탑 dev 환경에서 직접 스크린샷을 본 후 남긴 발화:

> "너 디자인이 이게 맞아? dropdown 은 이상한 위치에 뜨고 색감도 너무 탁해. 맨 왼쪽에 있는 사이드 메뉴는 보통 높이 전체를 다 가져가야하지 않아?"

본 발화에서 추출되는 우선순위 3건:

1. **dropdown 이 이상한 위치에 뜸** — SearchPanel 의 검색 결과 dropdown 이 input 바로 아래가 아닌 page 하단 footer 근처에 표시되는 anchor 끊김 회귀.
2. **색감이 너무 탁함** — 카드 배경 / border / primary / surface 톤이 전반적으로 회색-탁한 느낌. AGENTS.md 의 "토스 서비스처럼 밝고 간결" 의도와 어긋남.
3. **좌측 사이드바 높이 부족** — 데스크탑에서 사이드바가 navbar 아래 콘텐츠 높이만큼만 차지하고 그 아래로 회색 빈 공간 노출. 사용자는 "보통 높이 전체를 다 가져가야하지 않아?" 로 명시.

세 결함 모두 PR #21~#24 누적 변경의 결과로 드러난 회귀이며, 사용자가 직접 시각으로 확인한 영역이라 본 PRD 한 PR 로 일괄 흡수한다.

#### 1.1.1 후속 발화 (PR #25 1차 fix 후 dev 확인 결과)

PR #25 의 1차 fix 결과를 사용자가 dev 화면에서 확인한 후 남긴 후속 발화:

> "드랍다운 컴포넌트는 글씨도 겹쳐지고 높이도 너무 작아서 불편하네. 색감을 좀더 비비드하게 해봐 지금 뭔가 전체적으로 회색빛이야"

본 후속 발화에서 추가 추출되는 우선순위 2건:

4. **dropdown 옵션 항목 안 글자 겹침** — SearchPanel 의 검색 결과 dropdown 옵션 항목이 2줄 콘텐츠 (메인 라벨 + 메타) 를 가지나 항목 height 가 너무 작아 세로로 겹쳐 보임. 1차 fix 후 anchor 위치는 정상화됐으나 옵션 항목 내부 컴팩트 회귀가 새로 노출.
5. **색감 비비드 부족** — 1차 v7 톤 재조정 (surface `#ffffff`, border-line `#eceff3`, text-strong `#0f1419`) 이 카드와 텍스트 대비는 개선했으나 화면 전체 인상이 여전히 회색빛. 사용자는 "좀더 비비드하게" 명시 요구.

본 후속 피드백은 **PR #25 안에서 누적 처리** — 라벨 `qa-passed` 까지 진행됐으나 사용자 시각 확인에서 불충분 판정으로 `impl-ready` 로 되돌리고 결함 4·5 를 본 PRD 에 in-place 흡수.

따라서 본 PRD 의 흡수 결함은 총 **5건** (1~3 기존 + 4·5 후속 추가). 우선순위 항목 3개 → 5개로 확장.

### 1.2 현재 상태

PR #21~#24 누적으로 워크벤치의 3-section shell, 컴팩트 컴포넌트, BFF adapter, claude CLI subprocess, dropdown ARIA, suffix 너비 토큰화가 모두 정착. 라운드트립 5건 양 뷰포트 무회귀. 그러나 사용자가 실제 데스크탑 1280 뷰포트에서 본 화면은:

- SearchPanel 의 "종목 검색" input 에 포커스 시 검색 결과 dropdown 이 input 아래가 아니라 페이지 하단 footer 근처에 anchor 되어 떠 있다. AAPL · Apple Inc. / BTC-USD · Bitcoin 두 옵션이 보이지만 입력 필드와의 시각적 연결이 끊겨 있다.
- 좌측 사이드바 (분석 히스토리 + 즐겨찾기) 가 navbar 아래에서 일부 영역까지만 차지하고, 그 아래로 회색 빈 공간이 viewport 끝까지 노출된다.
- 전반적인 색감이 회색-탁한 톤. Signature Slate `#1f3b4d` 가 카드 배경에 흡수되어 강조점이 흐릿하고, surface 톤도 미세하게 어둑하여 토스 톤의 "산뜻한" 느낌과 거리가 있다.

### 1.3 흡수 대상 결함 5건 — 영역·증상·원인 가설

결함 1~3 은 본 PRD 1차 정의 (PR #25 트리거) 시점부터의 결함. 결함 4·5 는 PR #25 의 1차 fix 결과를 사용자가 dev 화면에서 확인한 후 추가 보고한 결함. 두 묶음 모두 PR #25 안에서 누적 처리.

#### 결함 1 — dropdown 위치 어긋남 (UI / 위치 fix)

- **현상**: SearchPanel 의 "종목 검색" input 에 포커스 시 dropdown 이 input 바로 아래가 아닌 **footer 근처 페이지 하단** 에 표시. 데스크탑 1280 뷰포트에서 가장 두드러짐.
- **영향 컴포넌트**: `components/workbench/SearchPanel.tsx`. dropdown panel CSS (`app/components.css` 의 `dropdown-panel` 또는 등가) 가능성.
- **원인 가설**:
  - PR #22 의 outside-click 처리 + dropdown panel positioning 변경 시 anchor 가 input 에서 끊긴 흐름.
  - `position: absolute` 의 부모 (relative wrapper) 가 잘못 잡혔거나 portal 사용 시 anchor 가 끊김.
  - 또는 dropdown 이 `position: fixed` 인데 `top` 좌표 계산이 잘못된 값.
- **사용자 표현**: "dropdown 은 이상한 위치에 뜨고".

#### 결함 2 — 좌측 사이드바 높이 부족 (UI / 레이아웃 fix)

- **현상**: 데스크탑 1280 뷰포트에서 좌측 사이드바 (분석 히스토리 + 즐겨찾기) 가 navbar 아래 콘텐츠 높이만큼만 차지. 그 아래 회색 빈 공간 노출.
- **영향 컴포넌트**: `app/(workbench)/layout.tsx`, `components/layout/Sidebar.tsx`, 또는 `app/components.css` 의 `sidebar` 합성 토큰.
- **원인 가설**:
  - `(workbench)/layout.tsx` 의 grid 높이 미설정 + grid `align-stretch` 누락.
  - Sidebar 컴포넌트 자체에 `min-height: calc(100vh - var(--spacing-navbar-h))` 누락.
  - 또는 grid 자체 `min-height: 100vh` 누락.
- **사용자 표현**: "맨 왼쪽에 있는 사이드 메뉴는 보통 높이 전체를 다 가져가야하지 않아?".

#### 결함 3 — 색감 탁함 (UI / 색 토큰 톤 재조정)

- **현상**: 카드 배경 / 텍스트 / border / primary 버튼 등 전반적으로 회색-탁한 톤.
- **사용자 표현**: "색감도 너무 탁해".
- **원인 가설**:
  - surface 톤이 너무 어둑 — 현재 `#f4f6f8` 또는 등가. 토스 톤 정합이면 `#fafbfc` 또는 `#ffffff` 가 자연스러울 수 있음.
  - primary `#1f3b4d` (Signature Slate) 가 카드 안 텍스트로 쓰일 때 회색감이 강함. 시그니처는 강조 영역 (CTA 버튼·active 상태·셀렉트) 에서만 쓰여야 함.
  - border-line 톤이 너무 진해 카드가 사각형 박스처럼 두드러져 산뜻하지 않음.
  - text-strong / text-muted 의 대비가 약함.
- **AGENTS.md 정합**: "토스 서비스처럼 밝고 간결" — 산뜻하고 정보 밀도 높지만 시각적 부담 없는 톤. 현재 톤은 이 의도에서 미세하게 어긋남.

#### 결함 4 — dropdown 옵션 항목 글자 겹침 (UI / 컴팩트 회귀)

- **현상**: SearchPanel 의 검색 결과 dropdown 각 옵션 항목 안 2줄 콘텐츠 (메인 라벨 + 메타) 가 항목 height 부족으로 세로 겹침. 스크린샷에서 "AAPL · Apple Inc." (메인 라벨) + "US_EQUITY · USD · APPLE" (메타) 가 겹쳐 보이고, "BTC-USD · Bitcoin" 라벨이 다음 옵션의 메타 영역과 충돌.
- **사용자 표현**: "드랍다운 컴포넌트는 글씨도 겹쳐지고 높이도 너무 작아서 불편하네".
- **PR #25 1차 fix 후 잔존**: 결함 1 (anchor 위치) 은 1차 fix 로 정상화됐으나 옵션 항목 내부 컴팩트 회귀가 별도 결함으로 드러남.
- **영향 컴포넌트**: `components/workbench/SearchPanel.tsx` (옵션 항목 마크업) + `app/components.css` 의 `search-result-item` 합성 토큰 + DESIGN.md v7 의 components 절.
- **원인 가설**:
  - PR #22 (component-compactness) 의 `dropdown-item-h: 34px` + `dropdown-item-py: 6px` 가 1줄 콘텐츠 기준으로 산정됐는데 실제 옵션은 2줄 콘텐츠 (label + meta).
  - 폰트 line-height 가 두 줄을 수용 못함.
  - 옵션 항목 내부 라벨 / 메타 폰트 토큰이 분리되어 있지 않아 시각 위계 흐림.
- **권장 fix 방향** (디자이너 R 결정):
  - dropdown-item-h 를 2줄 수용 가능한 값으로 키움 (예: 34 → 52~56px). 또는 height auto + min-h.
  - 옵션 항목 내부 메인 라벨 / 메타 폰트 토큰 분리 (라벨 `body-sm-strong` / 메타 `caption-muted` 같은 2 토큰).
  - 옵션 항목 내부 padding (py) 도 동반 키움.
  - 합성 토큰 `search-result-item` 갱신 + v7 의 components 절 prose 단락 추가.

#### 결함 5 — 색감 비비드 부족 (UI / 톤 강도 부족)

- **현상**: 1차 v7 톤 재조정 (surface `#ffffff`, border-line `#eceff3`, text-strong `#0f1419`) 에도 화면 전체 인상이 회색빛. 카드와 텍스트 대비는 개선됐으나 어디에도 "비비드한" 색 강조점이 없고 모든 영역이 white + light gray 만으로 구성.
- **사용자 표현**: "색감을 좀더 비비드하게 해봐 지금 뭔가 전체적으로 회색빛이야".
- **원인 가설**:
  - primary Signature Slate `#1f3b4d` 가 본질적으로 채도 낮은 dark-blue-gray — 시그니처가 활기차 보이지 않음.
  - accent-soft 가 너무 옅어 카드 강조가 안 됨.
  - 페이지 어디에도 "신호적 채도" 의 강조점이 없음. CTA / focus / badge / link 도 슬레이트 톤이라 채도가 죽음.
- **권장 fix 방향** (디자이너 R 결정 — 본 결함이 v7 의 핵심 톤 재조정 영역의 보강):
  - **옵션 A**: primary 자체를 비비드한 톤으로 교체 — 예: indigo `#4f46e5` 또는 vivid blue `#2563eb` 또는 violet `#7c3aed` 등. 시그니처 자체 변경.
  - **옵션 B**: primary 는 Slate 유지 + 보조 accent 토큰을 비비드하게 추가 — 예: `accent-vivid` 신규 (CTA / focus / badge / link 에 활용). 시그니처 보존 + 활기.
  - **옵션 C**: surface 와 카드 분리감 강화 + 강조 영역 (선택 옵션, active state, badge) 의 색 채도를 살림.
  - **PM 권고**: 옵션 A 또는 B 디자이너 결정. 시그니처 정체성과 활기 균형. 사용자 표현 "비비드" 가 "신호적 채도" 의미.
- **영향**: DESIGN.md v7 의 colors 절 hex 재조정 (in-place — v8 별도 신설 안 함). 합성 토큰 cascade 자동.

### 1.4 문제

- **사용자 직접 확인 영역** — 세 결함 모두 사용자가 데스크탑 dev 화면에서 직접 본 결과. 라벨 흐름에서 이미 머지된 PR 들의 누적 회귀이므로 우선순위가 높다.
- **PR 단위 분리 비효율** — 세 결함을 각각 별도 PR 로 다루면 디자이너·FE Dev 핸드오프가 3 사이클. 본 PRD 한 PR 로 일괄 처리하면 디자이너 산출물 (DESIGN.md v7) 1회 + FE Dev mechanical fix 2건 + 색 토큰 cascade 검증 1회로 정리된다.
- **회귀 위험** — 색 토큰 변경이 모든 합성 토큰 (`card`, `button-primary`, `badge-*`, `input-*` 등) 에 cascade 되어 WCAG AA 4.5:1 대비 회귀 가능. 본 PRD 가 명시적으로 검증 영역에 박는다.
- **디자이너 영역 비중** — DESIGN.md v7 신설은 색 hex 13개 재조정 + prose 톤 의도 단락 + 신·구 비교 표 + 대비비 표. 디자이너 책임 비중 큼.

### 1.5 컨텍스트 메모

- 본 PRD 진입 시점에 PR #6 ~ #24 모두 머지되어 있고 main 은 `c7ae7cd` 기준이라고 가정.
- DESIGN.md 의 현재 v6 (palette-modernization 후 polish-followups 흡수) 가 13 토큰 보유:
  `surface / surface-muted / surface-strong / text-strong / text-muted / accent / primary / warn / warn-soft / critical / critical-soft / info / info-soft` (정확한 키 셋은 디자이너가 v6 확인 후 v7 에 반영).
- 변경 영역은 다음에 국한:
  - `components/workbench/SearchPanel.tsx` (결함 1 anchor + 결함 4 옵션 항목 마크업)
  - `app/(workbench)/layout.tsx` 또는 `components/layout/Sidebar.tsx` (결함 2)
  - `docs/design/design-tone-refinement.md` 신설 — DESIGN.md v7 (결함 3 + 결함 4·5 in-place 갱신)
  - `tailwind.theme.json` — `npm run design:sync` 재실행 산출물 (colors + dropdown-item spacing 동기화)
  - `app/components.css` — 합성 토큰 (`search-result-item` 갱신 + accent-vivid 호출 합성 토큰 갱신) hex/px 직타 무회귀 재검증
  - QA 리포트 + HANDOFF append
- 신규 라이브러리 0건 (특히 Floating UI 미도입 — §9 OPEN QUESTION 1).
- 신규 컴포넌트 0건. 신규 prop 시그니처 0건. 라운드트립 변경 0건.
- DESIGN.md v8 별도 신설 금지 — 결함 4·5 의 후속 흡수는 v7 in-place 갱신으로 처리 (§9 OPEN QUESTION 10).

## 2. 목표

- **사용자 지적 결함 5건** 을 한 PR (#25) 로 일괄 흡수한다:
  - 결함 1~3 (1차): dropdown 위치 / sidebar 높이 / 색감 탁함.
  - 결함 4·5 (후속): dropdown 옵션 항목 글자 겹침 / 색감 비비드 부족.
- **DESIGN.md v7 신설** — `docs/design/design-tone-refinement.md`. 13 토큰의 hex 재조정 + prose 톤 의도 단락 + 신·구 비교 표 + WCAG AA 대비비 표. 토큰 키 셋은 v6 그대로 유지 (cascade 영향 최소화).
- **dropdown anchor fix** — SearchPanel 의 검색 결과 dropdown 이 input 바로 아래에 정확히 anchor. 양 뷰포트 (375 / 1280) 무회귀.
- **sidebar 높이 fix** — 데스크탑에서 사이드바가 navbar 아래 viewport 끝까지 차지. 모바일 drawer 무회귀.
- **색 토큰 cascade** — 합성 토큰의 hex/px 직타 0건 무회귀. WCAG AA 4.5:1 무회귀.
- **신규 기능 0건** — 라운드트립·응답 shape·adapter 인터페이스 무수정. UI 사용자 동선 무변경.
- **토스 톤 명시** — DESIGN.md v7 prose 에 "토스 톤 / 산뜻 / 시그니처 강조" 키워드 명시.
- **회귀 0건** — 라운드트립 5건 양 뷰포트 무회귀. 한글 카피 톤 무회귀. typecheck/lint/build 0 에러.

## 3. 범위 (In Scope)

### 3.1 결함 1 — dropdown 위치 fix

- `components/workbench/SearchPanel.tsx` 의 검색 결과 dropdown 이 input 바로 아래에 정확히 anchor 되도록 fix.
- **디버그 절차**:
  - dev tools 로 dropdown panel 의 부모 `position: relative` wrapper 확인.
  - portal 사용 여부 확인. portal 사용 시 anchor element 의 `getBoundingClientRect()` 사용 또는 portal 폐기.
  - `top / left` 좌표가 input 의 `bottom + 4~8px` 인지 검증.
- **권장 fix 방향**:
  - **옵션 A (PM 권고)**: portal 미사용 + dropdown panel 의 직접 부모를 `position: relative` 인 wrapper 로 보장. dropdown 은 `position: absolute; top: 100%; left: 0; right: 0`.
  - 옵션 B: `position: fixed` + anchor 좌표 동적 계산 (`getBoundingClientRect` + scroll listener). 비권고 (스크롤·리사이즈 시 재계산 비용).
  - 옵션 C: Floating UI 라이브러리 도입. **비권고** (신규 라이브러리 0건 제약).
- **검증**: 양 뷰포트 (375 / 1280) 에서 dropdown 의 `top` 좌표가 input 의 하단과 일치. dev tools 에서 dropdown panel 의 직접 부모가 `position: relative` 임을 확인.
- **회귀 검증**: outside-click 으로 dropdown 닫힘 (PR #22 영역). 키보드 ↑/↓/Enter/ESC (PR #24 A1 영역) 무회귀. ARIA `role="listbox"` + `aria-controls` 정합 무회귀.

### 3.2 결함 2 — sidebar 높이 fix

- 데스크탑에서 좌측 사이드바가 navbar 아래 viewport 끝까지 차지하도록 fix.
- **권장 fix 방향**:
  - **옵션 A (PM 권고)**: `app/(workbench)/layout.tsx` 의 grid 컨테이너에 `min-height: calc(100vh - var(--spacing-navbar-h))` + `align-items: stretch`. grid item (sidebar / main) 이 동일한 stretched 높이를 받음.
  - 옵션 B: `Sidebar` 컴포넌트 자체에 `min-height: calc(100vh - var(--spacing-navbar-h))`. grid 정의를 layout 책임으로 두는 PR #21 컨벤션과 일관성 약화 — 비권고.
- **상세**:
  - 사이드바 내부 콘텐츠가 적을 때도 사이드바가 viewport 끝까지 차지하는 시각.
  - 모바일 drawer 는 무회귀 (이미 PR #21~#22 에서 정착).
  - footer 가 있는 경우 footer 까지 자연스럽게 차지하거나 footer 위에서 끝남 (디자이너 결정 — 본 PRD prose 에 박음).
- **검증**: 데스크탑 1280 viewport 에서 사이드바의 `getBoundingClientRect().height ≥ window.innerHeight - navbarHeight`. 모바일 375 에서 drawer 토글 동작 무회귀.

### 3.3 결함 3 — 색감 톤 재조정 (DESIGN.md v7)

- **신규 파일**: `docs/design/design-tone-refinement.md` (DESIGN.md v7).
- **토큰 키 셋**: v6 의 13 토큰 키 그대로 유지 (cascade 영향 최소화). hex 만 재조정.
- **신규 토큰 추가 (디자이너 재량)**:
  - `surface-elevated` — 카드 vs 페이지 background 의 추가 elevation 단계가 필요한 경우.
  - 디자이너가 v6 의 13 토큰만으로 충분하다 판단하면 추가 없음.
- **재조정 방향** (디자이너 결정 위임):
  - **`surface`** — 더 밝게. 권장 `#fafbfc` 또는 `#ffffff`. 페이지 background.
  - **`surface-muted`** — 카드 vs 페이지 background 의 분리감을 위해 살짝 살린 톤 (예: surface 가 `#ffffff` 면 surface-muted 는 `#f7f8fa`).
  - **`surface-strong`** — 강조 카드 / hover 상태. 디자이너 결정.
  - **`text-strong`** — 더 진한 톤으로 대비 강화. 권장 `#101418` 또는 `#0c0f12` 가까운 톤.
  - **`text-muted`** — 가독성 유지 (WCAG AA 4.5:1 무회귀). 권장 `#5b6470` 또는 등가.
  - **`accent` / `primary`** — Signature Slate `#1f3b4d` 톤 유지 또는 미세 조정. 단 사용처는 CTA / active / focus 등 강조 영역에 한정. 카드 안 본문 텍스트로 쓰이지 않도록.
  - **`border` / `line`** (v6 의 line 토큰) — 더 옅게. 권장 `#eef0f3` 또는 비슷한 옅은 톤. 카드의 사각형 박스 두드러짐 완화.
  - **`warn` / `warn-soft` / `critical` / `critical-soft` / `info` / `info-soft`** — 토스 톤 정합 (산뜻하고 명확). v6 대비 채도 미세 조정 가능. 디자이너 결정.
- **prose 보강**:
  - "Colors" 절에 톤 재조정 의도 1~2 단락. 키워드 "토스 톤 / 산뜻 / 시그니처 강조 / 정보 밀도" 중 최소 3개 등장.
  - 신·구 팔레트 비교 표 (v6 hex → v7 hex / 사유).
  - WCAG AA 4.5:1 대비비 표 (`text-strong × surface`, `text-muted × surface`, `accent × surface`, `warn × surface`, `critical × surface`, `info × surface` 등 주요 쌍).
  - 시그니처 색 사용처 룰 단락 — CTA / active / focus / 셀렉트. 카드 안 본문 텍스트 비사용.
- **lint**: `npx @google/design.md lint` errors=0 warnings=0.

### 3.4 결함 4 — dropdown 옵션 항목 컴팩트 회귀 완화

- `components/workbench/SearchPanel.tsx` 의 검색 결과 옵션 항목 마크업 + `app/components.css` 의 `search-result-item` 합성 토큰 갱신.
- **권장 fix 방향**:
  - **옵션 A (PM 권고)**: `dropdown-item-h` 토큰 값을 키움 (예: 34 → 52~56px). 동시에 `dropdown-item-py` 도 동반 키움 (예: 6 → 8~10px). v7 token block 의 spacing 절 in-place 갱신.
  - 옵션 B: dropdown-item 의 height 를 fixed 가 아닌 `min-height` + `auto` 로 변경. 2줄 / 3줄 콘텐츠 모두 자연스럽게 수용. 단 옵션마다 height 가 다르면 keyboard nav (↑/↓) 시 시각 점프 발생 가능.
- **옵션 항목 내부 폰트 토큰 분리**:
  - 메인 라벨: `body-sm-strong` (또는 v7 의 등가 토큰) — 종목 코드 + 한글/영문 이름.
  - 메타: `caption-muted` (또는 v7 의 등가 토큰) — 시장 코드 · 통화 · 풀네임.
  - 두 토큰의 line-height 합이 옵션 항목 height 안에 안정적으로 수용.
- **DESIGN.md v7 갱신**:
  - components 절에 dropdown-item 의 2줄 콘텐츠 수용 의도 1단락 추가.
  - spacing 절의 dropdown-item-h / dropdown-item-py 토큰 값을 v7 안에서 in-place 갱신.
  - typography 절에 옵션 항목용 라벨 / 메타 토큰 분리 명시 (필요 시 신규 토큰 또는 기존 토큰 재활용).
- **검증**: dev tools 로 옵션 항목의 `getBoundingClientRect().height` ≥ 50px. 두 줄 텍스트가 시각 겹치지 않음. QA 리포트 스크린샷.
- **회귀 검증**: outside-click / 키보드 nav / ARIA 무회귀. 결함 1 의 anchor 위치 무회귀.

### 3.5 결함 5 — colors 비비드 강화 (DESIGN.md v7 in-place 갱신)

- **신규 파일 없음** — 결함 3 에서 신설한 `docs/design/design-tone-refinement.md` (v7) 의 colors 절 in-place 갱신. v8 별도 신설 금지.
- **재조정 방향** (디자이너 결정 위임 — 옵션 A 또는 B):
  - **옵션 A — primary 자체 비비드 교체**:
    - 후보 hex: `#4f46e5` (indigo) / `#2563eb` (vivid blue) / `#7c3aed` (violet) / `#0ea5e9` (sky) 등.
    - 시그니처 정체성 변경. prose 에 변경 사유 1단락 + 신·구 시그니처 비교 표 강제.
    - 사용처 룰 무변경 (CTA / active / focus / 셀렉트 한정).
  - **옵션 B — primary Slate 유지 + accent-vivid 신규**:
    - primary `#1f3b4d` 유지 (시그니처 보존).
    - 신규 토큰 `accent-vivid` 추가 — CTA / focus ring / badge highlight / link 에 활용.
    - v6 의 13 토큰 + 1 (총 14 토큰) — cascade 영향 최소 (합성 토큰 일부만 `accent-vivid` 호출).
  - **옵션 C — primary 유지 + 강조 영역 채도 살림**:
    - primary / accent 무변경. 단 선택 옵션 / active state / badge / focus ring 의 hex 만 채도 살린 톤으로 갱신.
    - 가장 작은 변경. 단 사용자가 명시한 "비비드" 강도 충족 여부 불확실.
- **PM 권고**: 옵션 A 또는 B 디자이너 결정. 옵션 B 가 시그니처 보존 + 활기 균형에서 PM 추천. 결정 후 v7 prose 에 사유 단락 강제.
- **DESIGN.md v7 in-place 갱신 영역**:
  - colors 절의 토큰 hex 재조정 (옵션 A 채택 시 primary, 옵션 B 채택 시 accent-vivid 신규 + 일부 cascade).
  - prose 의 톤 재조정 의도 단락에 "비비드 / 신호적 채도 / 강조점" 키워드 추가 (≥1개 등장).
  - 신·구 팔레트 비교 표에 1차 v7 hex → 갱신 후 hex 추가 행. 사유 컬럼에 "사용자 후속 피드백 흡수" 명시.
  - WCAG AA 대비비 표 재검증 — 갱신된 hex 로 13 쌍 모두 4.5:1 이상.
- **합성 토큰 cascade**:
  - 옵션 A: primary 호출 합성 토큰 (`button-primary`, `badge-active`, `focus-ring` 등) 모두 자동 cascade.
  - 옵션 B: `accent-vivid` 호출 합성 토큰 영역만 추가. `app/components.css` 의 일부 합성 토큰 갱신 가능.
- **WCAG AA 무회귀 강제**: 갱신 후 hex 의 대비비 표 재검증. 게이트.

### 3.6 색 토큰 cascade 검증

- 합성 토큰 (`card`, `card-elevated`, `button-primary`, `button-secondary`, `input-*`, `badge-*`, `sidebar`, `navbar`, `dropdown-panel` 등) 이 새 colors 토큰을 호출하므로 hex 재조정이 자동 cascade.
- **재검증**:
  - `app/components.css` 의 `@layer components` 안 hex/px 직타 0건 — `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css` 결과 0건 (Tailwind 토큰 함수 호출만).
  - `git grep -nE "#[0-9a-fA-F]{3,6}" app/globals.css` 결과도 0건 (preflight 잔여물 외).
  - 합성 토큰의 시각 회귀 — 라운드트립 5건 양 뷰포트 무회귀.

### 3.7 검증·QA

- **typecheck / lint / build**: 0 에러.
- **라운드트립 5건 양 뷰포트** 무회귀: AAPL · BTC-USD · 비분할가능 · 화이트리스트 비매칭 · 5xx 폴백 → 양 뷰포트 (375 / 1280).
- **dropdown anchor 검증**: dev tools 로 dropdown 의 `top` 좌표가 input 의 `bottom + 4~8px` 일치.
- **sidebar 높이 검증**: `getBoundingClientRect().height ≥ window.innerHeight - navbarHeight`.
- **WCAG AA 4.5:1**: 주요 쌍 모두 무회귀. DESIGN.md v7 prose 의 대비비 표에 측정값 명시.
- **BFF 패턴 무회귀**: `git grep -nE "fetch\(" app/ components/ hooks/ lib/` 결과 route handler 안만 존재.

## 4. 범위 외 (Out of Scope)

- **신규 기능** — 분석 결과 항목 추가·제거 0건. 라운드트립 추가 0건.
- **3-section shell 골격 변경** — PR #21 무수정. grid 정의의 `min-height` 한 줄 추가만 본 PRD 범위.
- **컴포넌트 prop 시그니처 변경** — SearchPanel · Sidebar · 합성 토큰 prop 0건 변경.
- **신규 컴포넌트 추가** 0건.
- **컴팩트 사이즈·간격·라운드·타이포 변경** — DESIGN.md 의 `spacing` / `typography` / `radius` 0건 변경. **colors 절만 갱신**.
- **다크 모드 도입** — 별도 PRD. 본 PRD 의 hex 재조정은 라이트 모드 전용. 다크 모드 친화 semantic 명명은 v6 에서 이미 정착.
- **신규 라이브러리** — Floating UI 등 dropdown positioning 라이브러리 0건. 자체 fix 시도. 정 안 되면 §9 OPEN QUESTION 1 로.
- **PRD `claude-api-analysis`** — 별도 PRD. 본 PRD 무관.
- **streaming 응답** — PRD `analyze-streaming` 영역.
- **adapter 추상화 변경** — PR #23 무수정. `Adapter` 인터페이스 0건 변경.
- **claude CLI 인터페이스 변경** — flag · stdin/stdout 포맷 0건 변경.
- **한글 카피 변경** — `lib/copy/workbench/*` 0건 변경.
- **로고·아이콘·이미지 에셋 변경** — 시그니처 색 재확인이 향후 로고 작업 유도 가능하나 본 PRD 범위 밖.
- **E2E / 시각 회귀 자동화 도입** — QA 수동 라운드트립으로 검증.
- **DESIGN.md v8 신설** — 결함 4·5 의 후속 흡수는 v7 in-place 갱신으로 처리. v8 별도 신설 금지.
- **신규 컴포넌트 추가 (결함 4 마크업 변경 포함)** — 결함 4 의 옵션 항목 마크업은 기존 SearchPanel 컴포넌트 내부 갱신. 신규 컴포넌트 0건 룰 유효.
- **로고·헤더 시그니처 cascade (결함 5 옵션 A 채택 시)** — 옵션 A (primary 교체) 채택 시 로고·헤더의 시그니처 색 사용은 본 PRD 범위 밖 — 별도 PRD 또는 자연 cascade.

## 5. 수용 기준 (AC)

각 결함 별로 검증 가능한 명령 + 기대 결과를 명시한다.

### 5.1 결함 1 — dropdown 위치 fix

- **AC-1-1**: dev tools 로 SearchPanel 의 input 에 포커스 후 dropdown 이 떴을 때, dropdown panel 의 `getBoundingClientRect().top` 이 input 의 `getBoundingClientRect().bottom` 에서 `0~12px` 범위 안. (12px 은 디자이너가 v7 에 정의한 dropdown gap 토큰.)
- **AC-1-2**: dropdown panel 의 직접 부모 element 의 `position` 이 `relative` (옵션 A 채택 시) 또는 dropdown 이 `position: fixed` 면서 동적 좌표 계산 코드가 존재 (옵션 B 채택 시).
- **AC-1-3**: portal 사용 여부 — 옵션 A 채택 시 `git grep -nE "createPortal|ReactDOM\.createPortal" components/workbench/SearchPanel.tsx` 결과 0건 또는 portal 사용 시 anchor 좌표 동적 계산 코드 존재.
- **AC-1-4**: 양 뷰포트 (375 / 1280) 에서 dropdown 시각 위치가 input 바로 아래. QA 리포트에 양 뷰포트 스크린샷 첨부.
- **AC-1-5**: outside-click 으로 dropdown 닫힘 무회귀 (PR #22 영역 무회귀).
- **AC-1-6**: 키보드 ↑/↓/Enter/ESC navigation 무회귀 (PR #24 A1 영역 무회귀).
- **AC-1-7**: ARIA `role="listbox"` + `aria-controls` + `aria-activedescendant` 무회귀 (PR #24 A1 영역 무회귀).

### 5.2 결함 2 — sidebar 높이 fix

- **AC-2-1**: 데스크탑 1280 viewport 에서 사이드바의 `document.querySelector('[data-component="sidebar"]').getBoundingClientRect().height` 가 `window.innerHeight - navbarHeight` 이상. (navbarHeight 는 `--spacing-navbar-h` 토큰값.)
- **AC-2-2**: `app/(workbench)/layout.tsx` 의 grid 정의에 `min-height: calc(100vh - var(--spacing-navbar-h))` (또는 등가) + `align-items: stretch` (또는 grid 기본 stretch 동작) 존재. `git grep -nE "min-h-screen|min-h-\[calc|align-stretch" app/\(workbench\)/layout.tsx` 결과 ≥1 매칭.
- **AC-2-3**: 모바일 375 viewport 에서 drawer 토글 동작 무회귀. 사이드바가 drawer 모드에서 정상 열림·닫힘.
- **AC-2-4**: sidebar 내부 콘텐츠 (분석 히스토리 + 즐겨찾기) 가 비어 있을 때도 sidebar 영역이 viewport 끝까지 차지. 회색 빈 공간 0건.
- **AC-2-5**: QA 리포트에 데스크탑 1280 viewport 스크린샷 첨부 — sidebar 와 main 영역이 모두 viewport 끝까지 stretched.

### 5.3 결함 3 — 색감 톤 재조정 (DESIGN.md v7)

- **AC-3-1**: `docs/design/design-tone-refinement.md` 파일 존재. DESIGN.md 포맷 (`docs/rules/design-md.md`) 정합.
- **AC-3-2**: `npx @google/design.md lint` 결과 errors=0 warnings=0. orphan 토큰 0건.
- **AC-3-3**: `colors:` front matter 의 토큰 키 셋이 v6 의 13 토큰 그대로 유지 (cascade 영향 최소화). 신규 토큰 추가는 디자이너 재량 (예: `surface-elevated`).
- **AC-3-4**: 각 토큰의 hex 가 v6 대비 ≥1 개 재조정. `git diff docs/design/palette-modernization.md docs/design/design-tone-refinement.md` 또는 두 파일의 colors 절 hex 비교에서 ≥1 개 변경.
- **AC-3-5**: prose 에 톤 재조정 의도 1~2 단락. 키워드 "토스 톤 / 산뜻 / 시그니처 강조 / 정보 밀도" 중 최소 3개 등장.
- **AC-3-6**: 신·구 팔레트 비교 표 포함 (v6 hex → v7 hex / 사유).
- **AC-3-7**: WCAG AA 4.5:1 대비비 표 포함. 주요 쌍 (`text-strong × surface`, `text-muted × surface`, `accent × surface`, `warn × surface`, `critical × surface`, `info × surface`) 모두 4.5:1 이상.
- **AC-3-8**: 시그니처 색 사용처 룰 단락 포함 — "CTA / active / focus / 셀렉트 한정. 카드 안 본문 텍스트 비사용." 명시.
- **AC-3-9**: `npm run design:sync` 재실행 후 `tailwind.theme.json` 이 v7 hex 로 정상 동기화. 멱등.

### 5.4 결함 4 — dropdown 옵션 항목 컴팩트 회귀 완화

- **AC-4-1**: dev tools 로 SearchPanel dropdown 옵션 항목의 `getBoundingClientRect().height` ≥ 50px. 권장 52~56px. 옵션 항목 2줄 콘텐츠 (메인 라벨 + 메타) 가 시각 겹치지 않음.
- **AC-4-2**: `git grep -nE "dropdown-item-h" tailwind.theme.json` 결과 v7 in-place 갱신값 ≥ 50px. (1차 v7 의 34px → 갱신 후 50px 이상.)
- **AC-4-3**: `git grep -nE "dropdown-item-py" tailwind.theme.json` 결과 v7 in-place 갱신값 ≥ 8px. (1차 v7 의 6px → 갱신 후 8px 이상.)
- **AC-4-4**: 옵션 항목 내부 메인 라벨 / 메타 폰트 토큰이 분리됨 — `components/workbench/SearchPanel.tsx` 의 옵션 마크업이 라벨용 / 메타용 두 다른 typography 토큰 호출. `git grep -nE "body-sm|caption" components/workbench/SearchPanel.tsx` 결과 ≥2 매칭 또는 등가.
- **AC-4-5**: 양 뷰포트 (375 / 1280) 에서 dropdown 옵션 항목 시각 겹침 0건. QA 리포트에 양 뷰포트 스크린샷 첨부.
- **AC-4-6**: outside-click / 키보드 nav / ARIA 무회귀 (결함 1·PR #22·PR #24 영역 무회귀).
- **AC-4-7**: dropdown anchor 위치 (결함 1 의 1차 fix) 무회귀 — 옵션 항목 height 변경에도 dropdown panel 의 `top` 좌표가 input 의 `bottom + gap` 일치.

### 5.5 결함 5 — colors 비비드 강화

- **AC-5-1**: DESIGN.md v7 (`docs/design/design-tone-refinement.md`) 의 colors 절 hex 가 1차 v7 대비 ≥1 개 재조정. v7 1차 → v7 갱신 후 hex 비교에서 ≥1 개 변경.
- **AC-5-2**: 옵션 A (primary 비비드 교체) 채택 시 — primary 토큰의 hex 가 v7 1차 (`#1f3b4d`) 와 다른 비비드 값. 채도 (HSL S) 가 v7 1차 대비 명백히 증가 (수치 비교: 갱신 후 S ≥ 50%).
- **AC-5-3**: 옵션 B (accent-vivid 신규) 채택 시 — `accent-vivid` 토큰이 v7 colors 절에 신규 추가. 토큰 키 셋 14 (v6 의 13 + 1). 신규 토큰의 hex 가 비비드 (S ≥ 50%).
- **AC-5-4**: prose 의 톤 재조정 의도 단락에 "비비드 / 신호적 채도 / 강조점" 키워드 ≥1 개 등장. 사용자 후속 피드백 verbatim 인용 단락 포함.
- **AC-5-5**: 신·구 팔레트 비교 표에 1차 v7 hex → v7 갱신 후 hex 비교 행 ≥1 개. 사유 컬럼에 "사용자 후속 피드백 흡수" 명시.
- **AC-5-6**: WCAG AA 4.5:1 대비비 표 재검증 — 갱신된 colors 의 13 쌍 (또는 14 쌍, accent-vivid 추가 시) 모두 4.5:1 이상. v7 1차 → v7 갱신 후 대비비 무회귀.
- **AC-5-7**: 시그니처 색 사용처 룰 무회귀 — CTA / active / focus / 셀렉트 한정. 카드 안 본문 텍스트 비사용 룰 유지.
- **AC-5-8**: `npm run design:sync` 재실행 후 `tailwind.theme.json` 이 갱신된 hex 로 정상 동기화. 멱등.
- **AC-5-9**: 사용자가 dev 화면에서 직접 시각 확인 — 본 PR 머지 전 사용자 1단계 확인 강제 (PR 본문 체크리스트).

### 5.6 색 토큰 cascade

- **AC-CASCADE-1**: `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css` 결과 0건 (Tailwind 토큰 함수 호출만).
- **AC-CASCADE-2**: `git grep -nE "#[0-9a-fA-F]{3,6}" app/globals.css` 결과 0건 (preflight 잔여물 외).
- **AC-CASCADE-3**: `git grep -nE "px$" -- 'components/**/*.tsx'` 결과 직타 0건 (Tailwind 토큰 spacing 함수 호출만).
- **AC-CASCADE-4**: 합성 토큰의 라운드트립 5건 양 뷰포트 시각 회귀 양호. QA 리포트에 양 뷰포트 스크린샷 첨부.

### 5.7 공통

- **AC-COMMON-1**: `npm run typecheck` 0 에러.
- **AC-COMMON-2**: `npm run lint` 0 에러.
- **AC-COMMON-3**: `npm run build` 0 에러.
- **AC-COMMON-4**: 라운드트립 5건 양 뷰포트 (375 / 1280) 무회귀 — QA 리포트.
- **AC-COMMON-5**: 한글 톤 무회귀 — QA 리포트에 변경 카피 verbatim (본 PRD 는 카피 변경 0건이므로 변경 카피 0건이어야 함).
- **AC-COMMON-6**: BFF 패턴 무회귀 — `git grep -nE "fetch\(" app/ components/ hooks/ lib/` 결과 route handler 안만 존재.
- **AC-COMMON-7**: 신규 라이브러리 도입 0건 — `git diff package.json` 결과 dependencies / devDependencies 변경 0건 (Floating UI / 등 0건).
- **AC-COMMON-8**: 신규 컴포넌트 추가 0건. 컴포넌트 prop 시그니처 변경 0건.
- **AC-COMMON-9**: hydration mismatch 콘솔 경고 0건 — QA 리포트에 명시.

## 6. 가정 · 제약

### 6.1 가정

- PR #6 ~ #24 모두 머지되어 있고 main 이 `c7ae7cd` 기준이다.
- `feature/design-tone-refinement` 브랜치 단일 PR 로 일괄 처리한다.
- DESIGN.md v6 (palette-modernization 후 polish-followups 반영) 가 13 토큰 보유. 디자이너가 v6 파일 직접 확인 후 v7 hex 재조정 진입.
- dropdown 위치 fix 옵션은 옵션 A (`position: relative` wrapper + `position: absolute` dropdown) 가 PM 권고. 디자이너·FE Dev 합의로 옵션 결정.
- sidebar 높이 fix 위치는 옵션 A (`(workbench)/layout.tsx` 의 grid 정의) 가 PM 권고. 옵션 B (Sidebar 자체 min-height) 는 비권고.
- 신규 토큰 추가는 디자이너 재량 (예: `surface-elevated`). v6 의 13 토큰만으로 충분하다 판단되면 추가 없음.
- 시그니처 색은 Signature Slate `#1f3b4d` 유지 또는 미세 조정. 톤 변경 (예: indigo / blue) 은 디자이너 재량 — §9 OPEN QUESTION 3.
- 결함 5 (색감 비비드) 의 해결은 옵션 A (primary 비비드 교체) 또는 옵션 B (accent-vivid 신규) 디자이너 결정 — §9 OPEN QUESTION 8.
- 결함 4 (dropdown 옵션 항목 글자 겹침) 의 dropdown-item-h 값은 52~56px 디자이너 결정 — §9 OPEN QUESTION 9.
- 결함 4·5 의 변경은 **DESIGN.md v7 in-place 갱신** 으로 흡수. v8 별도 신설 금지 — §9 OPEN QUESTION 10.
- 결함 5 의 비비드 채도 정도는 사용자가 본 PR 머지 전 dev 화면에서 직접 시각 확인 1단계 강제 (PR 본문 체크리스트).
- 본 PRD 머지 후 다음 PRD 진입은 사용자 결정. PM 1순위 추천은 `claude-api-analysis`.

### 6.2 제약

- **신규 라이브러리 도입 0건** — 특히 Floating UI / zod / 기타 0건.
- **컴포넌트 prop 시그니처 변경 0건** — SearchPanel · Sidebar · layout 외부 인터페이스 무수정.
- **응답 shape 변경 0건** — `lib/types/workbench/*` 무수정.
- **컬러 외 토큰 변경 0건** — DESIGN.md 의 `spacing` / `typography` / `radius` 절 무수정. **colors 절만 갱신**.
- **라운드트립 변경 0건** — 5건의 시나리오·기대값 무수정.
- **한글 카피 변경 0건** — `lib/copy/workbench/*` 무수정.
- **PRD docs-only PR 별도 생성 금지** — 본 PRD 는 워킹트리에 두고 `feature/design-tone-refinement` 브랜치에 누적 commit.
- **WCAG AA 4.5:1 무회귀 강제** — DESIGN.md v7 prose 의 대비비 표가 게이트.

## 7. 참고

- `docs/prd/layout-redesign.md` — PR #21 PRD. 3-section shell. 본 PRD 의 sidebar 높이 fix 의 grid 책임 base.
- `docs/prd/component-compactness.md` — PR #22 PRD. dropdown anchor 회귀 원인 영역.
- `docs/prd/claude-cli-analysis.md` — PR #23 PRD. 본 PRD 무영향.
- `docs/prd/polish-followups.md` — PR #24 PRD. 본 PRD 무영향 (색 토큰 영역 비대상이었음).
- `docs/prd/palette-modernization.md` — DESIGN.md v3~v6 정착 PRD. 본 PRD 의 v7 신설 base.
- `docs/design/palette-modernization.md` — DESIGN.md v3 정착 본. 디자이너가 v6 파일 (최신) 확인 후 v7 신설.
- `docs/design/component-compactness.md` — DESIGN.md v5 (PR #22). 본 PRD 무영향.
- `docs/design/polish-followups.md` — DESIGN.md v6 (PR #24). 본 PRD 의 v7 출발점.
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드.
- `docs/rules/frontend.md` — FE 컨벤션 8개 절. 본 PRD 무수정 계승.
- `AGENTS.md` — 작업 원칙 ("토스 서비스처럼 밝고 간결") · 라벨 흐름 · PRD 양식.
- `tailwind.config.ts`, `tailwind.theme.json` — 어댑터 / `design:sync` 산출물.
- `app/globals.css` — Tailwind 디렉티브 + preflight 잔여물.
- `app/components.css` — `@layer components` + `@apply` 합성 토큰.

## 8. 영향 분석

### 8.1 변경 영역

| 영역 | 항목 | 변경 라인 추정 | 위험 |
|---|---|---|---|
| `components/workbench/SearchPanel.tsx` | 결함 1 dropdown anchor fix + 결함 4 옵션 항목 마크업 (라벨/메타 폰트 토큰 분리) | 20~60L | 낮음~중간 |
| `app/(workbench)/layout.tsx` | 결함 2 grid `min-height` + stretch | 5~15L | 낮음 (grid 한 줄 추가) |
| `components/layout/Sidebar.tsx` | 결함 2 (옵션 B 채택 시) 또는 무수정 (옵션 A 채택 시) | 0~10L | 낮음 |
| `docs/design/design-tone-refinement.md` | DESIGN.md v7 신설 + 결함 4·5 in-place 갱신 (colors hex 재조정 + dropdown-item-h/py + 라벨/메타 typography + prose + 표) | 200~330L | 중간 (cascade 영향) |
| `tailwind.theme.json` | `design:sync` 재실행 산출물 (colors + dropdown-item spacing 갱신 포함) | 자동 | 낮음 (사람이 직접 편집하지 않음) |
| `app/components.css` | 합성 토큰 — `search-result-item` 갱신 (결함 4) + accent-vivid 사용 합성 토큰 갱신 (결함 5 옵션 B 채택 시) | 5~30L | 낮음 |
| `app/globals.css` | preflight 잔여물 미세 조정 (대부분 무수정) | 0~10L | 낮음 |
| `docs/qa/design-tone-refinement.md` | QA 리포트 (결함 1~5 모두 커버) | 250~400L | 낮음 |
| `docs/HANDOFF.md` | `qa-passed` 라벨 시 자동 append | 자동 | 낮음 |

**총 변경 라인 추정**: 480~855L. 결함 4·5 후속 흡수로 1차 추정 대비 ~120~160L 증가.

### 8.2 회귀 위험

- **색 토큰 cascade** — 13 토큰 hex 재조정이 모든 합성 토큰 (`card`, `button-primary`, `badge-*`, `input-*`, `sidebar`, `navbar`, `dropdown-panel` 등) 에 자동 cascade. WCAG AA 4.5:1 무회귀 강제 (AC-3-7).
- **dropdown anchor fix** — `position: relative` wrapper 추가 시 부모 stacking context 변경 가능. z-index 충돌 무회귀 확인 필요. PR #22 의 outside-click + PR #24 의 키보드 nav 무회귀.
- **sidebar 높이 fix** — grid `min-height` 추가 시 모바일 drawer 모드 무회귀 확인 필요. drawer 가 absolute / fixed 포지셔닝이므로 grid `min-height` 영향 없을 가능성 높으나 QA 강제.
- **합성 토큰 시각 회귀** — 라운드트립 5건의 6블록 (action / brief / feasibility / horizons / risk_plan / warnings) 시각 회귀. 특히 warn / critical / info 톤이 PR #11 AC-3 의 feasibility 비현실 강조를 약화시키지 않는지.
- **hydration mismatch** — 동적 좌표 계산 (옵션 B) 채택 시 SSR / CSR 불일치 가능. PM 권고 옵션 A (정적 CSS) 채택 시 위험 0.
- **dropdown-item-h 키움 — keyboard nav 영향** — 옵션 항목 height 가 34 → 52~56 으로 커지면 ↑/↓ 키보드 nav 시 시각 점프 폭이 커져 사용자 혼란 가능. activedescendant 시각 강조 (background) 무회귀 확인 필요.
- **결함 5 primary 비비드 교체 (옵션 A) — 시그니처 정체성 변화** — Signature Slate `#1f3b4d` 자체 교체 시 브랜드 일관성 영향. 디자이너 prose 에 변경 사유 단락 강제 + 신·구 시그니처 비교 표 강제. 후속 PR 들 (예: 로고·헤더) 에 cascade 영향 가능.
- **결함 5 accent-vivid 신규 (옵션 B) — 합성 토큰 일부만 갱신** — primary 유지 + accent-vivid 신규. 합성 토큰 중 어디까지 accent-vivid 를 호출할지 디자이너 결정. CTA / focus / badge / link 한정 권장.
- **사용자 시각 확인 1단계 강제** — 사용자가 "비비드" 채도 정도를 직접 시각 확인하지 않으면 본 PR 머지 후 또 다시 후속 피드백 사이클 가능. 본 PR 머지 전 사용자 dev 화면 확인 강제 (PR 본문 체크리스트).

### 8.3 라벨 흐름

- `impl-ready` (UX Designer + FE Dev 합동 commit 후)
- `qa-passed` (QA 리포트 push 후 → `handoff-append.yml` workflow 자동 append)
- `review-approved` (Reviewer)
- DevOps 머지 + 브랜치 정리.

### 8.4 PR 본문 `## 다음 작업` 후보

본 PRD PR 본문에 반드시 포함:

- **PRD `claude-api-analysis`** — 사용자 명시 의도. 로컬 CLI 실 검증 결과를 바탕으로 진입. **PM 1순위 추천**.
- **PRD `analyze-streaming`** — 단일 응답 → streaming. UX 개선.
- **PRD `dark-mode`** — semantic 토큰 명명 정착 후 다크 모드 진입.
- **종결** — 사용자가 다음 PRD 보류 시 본 PRD 머지로 디자인 톤 사이클 종결 명시.

`qa-passed` 라벨이 붙는 순간 `handoff-append.yml` workflow 가 본 PRD 의 PR 번호 + 다음 작업 후보를 `docs/HANDOFF.md` 에 자동 append 한다.

## 9. OPEN QUESTION

각 항목에 PM 권고를 동봉한다. 디자이너·FE Dev 가 진입 시 1순위로 검토.

### 9.1 dropdown positioning — 자체 구현 vs Floating UI 도입

- **자체 구현 (옵션 A, `position: relative` wrapper)**: 부모 wrapper 보장 + `position: absolute` dropdown. 신규 라이브러리 0건. 구현 비용 10~30L.
- **자체 구현 (옵션 B, `position: fixed` + 동적 좌표)**: 스크롤·리사이즈 시 재계산. 구현 비용 40~80L. hydration mismatch 위험.
- **Floating UI 도입**: dropdown positioning 표준 라이브러리. middleware (`offset`, `flip`, `shift`) 로 viewport 끝에서의 자동 flip 지원. **신규 라이브러리 도입 비용 발생.**
- **PM 권고**: **옵션 A (자체 구현, `position: relative` wrapper)**. 신규 라이브러리 0건 제약 정합. 본 PRD 의 결함이 anchor 끊김 단일 원인이라면 옵션 A 로 충분. 정 안 되면 본 PRD 머지 후 별도 PRD `dropdown-positioning` 에서 Floating UI 도입 재검토.

### 9.2 sidebar 높이 fix 위치 — grid 정의 (layout.tsx) vs Sidebar 자체 min-height

- **grid 정의 (옵션 A)**: `app/(workbench)/layout.tsx` 의 grid 컨테이너에 `min-height: calc(100vh - var(--spacing-navbar-h))` + `align-items: stretch`. grid item (sidebar + main) 이 동일한 stretched 높이를 받음. PR #21 의 "grid 정의는 layout 책임" 컨벤션 정합.
- **Sidebar 자체 (옵션 B)**: `components/layout/Sidebar.tsx` 자체에 `min-height: calc(100vh - var(--spacing-navbar-h))`. layout 의 grid 정의와 책임 분산.
- **PM 권고**: **옵션 A (grid 정의 = layout 책임)**. PR #21 컨벤션 정합 + main 영역과 sidebar 가 동일한 높이로 stretched 되어 시각 일관성.

### 9.3 primary 색 변경 vs 유지

- **유지 (Signature Slate `#1f3b4d`)**: 브랜드 일관성 유지. PR `palette-modernization` 에서 정착한 시그니처. 사용처만 강조 영역에 한정.
- **변경 (indigo / blue 톤)**: 더 신호적인 톤. 토스 톤 정합 가능. 그러나 브랜드 재정립 비용.
- **PM 권고**: **유지 또는 미세 조정**. 디자이너 결정. 토스 톤 정합이면 유지 + 사용처 룰 명시 (CTA / active / focus 한정). 톤 변경 시 prose 에 변경 사유 1단락 + 신·구 비교.

### 9.4 surface 톤 — `#fafbfc` vs `#ffffff`

- **`#fafbfc`**: 미세하게 살린 흰색. surface vs surface-muted 의 분리감 확보. 토스 톤 정합.
- **`#ffffff`**: 순수 흰색. 가장 산뜻. surface-muted 가 미세하게 살린 톤 (`#f7f8fa`) 으로 카드 분리감 확보.
- **PM 권고**: 디자이너 결정. 본 PRD 는 결정 강제하지 않음. 단 surface vs surface-muted 의 분리감 (≥3% L 차이) 은 강제.

### 9.5 DESIGN.md v7 신설 vs v6 갱신

- **v7 신설**: `docs/design/design-tone-refinement.md` 별도 파일. PRD slug 와 DESIGN.md slug 1:1 매핑 컨벤션 유지.
- **v6 갱신**: `docs/design/polish-followups.md` 의 colors 절 hex 재조정. 파일 추가 0건.
- **PM 권고**: **v7 신설**. PRD slug 와 DESIGN.md slug 1:1 매핑 컨벤션 유지. 본 PRD 의 색 토큰 변경은 v6 의 polish-followups 영역 (components 절 ARIA·suffix) 와 독립적이므로 별도 파일이 사후 추적성에서 우월.

### 9.6 신규 토큰 (`surface-elevated` 등) 추가 여부

- **추가**: 카드 vs 페이지 background 의 추가 elevation 단계가 명확히 필요한 경우.
- **무추가**: v6 의 13 토큰만으로 충분.
- **PM 권고**: 디자이너 결정. 추가 시 cascade 영향 (합성 토큰 `@apply` 갱신) 까지 v7 prose 에 명시.

### 9.7 border / line 토큰 톤 옅음의 정도

- **현재 v6** 의 border / line 톤: 카드 사각형 박스 두드러짐.
- **재조정 후보**: `#eef0f3` / `#f0f2f5` / `#e8eaee` 등.
- **PM 권고**: 디자이너 결정. 단 border 가 너무 옅어 카드 경계가 사라지면 정보 위계 약화. surface vs surface-muted 의 분리감과 짝지어 결정.

### 9.8 결함 5 — primary 비비드 교체 vs accent-vivid 신규 (사용자 후속 피드백 흡수)

- **옵션 A (primary 자체 교체)**: Signature Slate `#1f3b4d` → 비비드한 톤 (indigo `#4f46e5` / vivid blue `#2563eb` / violet `#7c3aed` 등). 시그니처 자체 변경. 브랜드 정체성 변화.
- **옵션 B (primary 유지 + accent-vivid 신규)**: primary `#1f3b4d` 유지 + 신규 토큰 `accent-vivid` 추가. CTA / focus / badge / link 한정. 시그니처 보존 + 활기.
- **옵션 C (강조 영역 채도만 살림)**: primary / accent 무변경. 단 선택 옵션 / active state / badge / focus ring 의 hex 만 채도 살린 톤으로 갱신.
- **PM 권고**: **옵션 A 또는 B 디자이너 결정**. 시그니처 정체성과 활기 균형. 사용자 표현 "비비드" 가 "신호적 채도" 의미. 옵션 B 가 시그니처 보존 + 활기 균형에서 PM 추천. 결정 후 v7 prose 에 사유 단락 강제.

### 9.9 결함 4 — dropdown-item-h 정확한 값

- **34px (1차 v7)**: 1줄 콘텐츠 기준. 2줄 콘텐츠 (라벨 + 메타) 에서 겹침 발생.
- **50~52px**: 2줄 콘텐츠 최소 수용 + 좁은 컴팩트 유지.
- **52~56px (PM 권고)**: 라벨 + 메타 두 줄이 안정적으로 수용 + 시각 여유 + 토스 톤 정합.
- **56~64px**: 더 넉넉. 단 dropdown 전체 height 가 커지면서 컴팩트 의도 약화.
- **PM 권고**: **52~56px 디자이너 결정**. dropdown-item-py 도 동반 키움 (예: 6 → 8~10px). v7 token block 의 spacing 절 in-place 갱신.

### 9.10 결함 5 — 시그니처 색 변경 시 후속 PR 영향 범위

- **본 PR 안에서만 변경**: DESIGN.md v7 in-place 갱신으로 colors 절 hex 재조정. v8 별도 신설 안 함.
- **후속 PR cascade**: 후속 PR 들 (예: `claude-api-analysis`, `analyze-streaming`, `dark-mode`) 은 v7 의 갱신된 토큰을 그대로 cascade 호출. 별도 PRD 영역 침범 없음.
- **로고·헤더 cascade 가능성**: 옵션 A (primary 교체) 채택 시 로고·헤더의 시그니처 색 사용이 영향. 단 본 PRD 범위 밖 (별도 PRD 또는 자연 cascade).
- **PM 권고**: **본 PR 안에서만 변경. v8 별도 신설 금지**. 후속 PR 은 v7 또는 v7-in-place 토큰 그대로 cascade. 로고·헤더 영향은 사용자 결정 후 별도 PRD 진입.

### 9.11 다음 PRD 후보 — `claude-api-analysis` (사용자 명시 의도) / `analyze-streaming` / `dark-mode` / 종결

- **`claude-api-analysis`**: 사용자가 PR #23 PRD 의 `1.2 사용자 의도` 에 명시한 후속 의도 — "이게 잘 되면 그 후에 api 연결하든가 하려고해." **PM 1순위 추천**.
- **`analyze-streaming`**: 단일 응답 → streaming. UX 개선.
- **`dark-mode`**: 본 PRD 의 semantic 토큰 명명 + WCAG AA 검증 정착 후 진입. 디자이너 산출물 (colors 절의 dark variant) 비중 큼.
- **종결**: 사용자가 다음 PRD 보류 시 본 PRD 머지로 디자인 톤 사이클 종결.
- **PM 권고**: 사용자 결정. PM 1순위 추천은 `claude-api-analysis` (사용자 명시 의도).
