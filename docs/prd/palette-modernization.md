# PRD: palette-modernization

- **slug**: `palette-modernization`
- **작성일**: 2026-05-21
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #18 흐름으로 BE 분리·아키텍처·화면 재작성·Tailwind 마이그레이션·FE 컨벤션·반응형·에이전트 컨벤션 흡수가 모두 정착한 직후. 시각 다듬기 단계 진입.
- **UI 포함 여부**: yes (DESIGN.md `colors` 토큰 정제 — UX/UI 디자이너 합류 필요. 화면 코드 변경은 최소·자동 흡수 위주)
- **선행 / 후행 관계**:
  - **선행**: `workbench-analyze-rebuild` (PR #11, 6블록 화면 + 라운드트립 5건), `tailwind-migration` (PR #13, DESIGN.md → tailwind.theme.json 파이프라인), `fe-conventions` (PR #15, 컨벤션 문서·폴더 구조), `responsive-pc-support` (PR #17, 두 뷰포트). 모두 머지 완료.
  - **후행**: 다크 모드 도입 PRD (별도). 본 PRD 의 semantic 토큰 명명을 전제로 진입.

## 1. 배경 / 문제

현재 `docs/design/workbench-analyze-rebuild.md` (DESIGN.md v2) 의 `colors` front matter 는 다음 16개 토큰을 정의한다.

```
primary / secondary / tertiary / tertiary-soft / neutral / panel / line /
field-bg / warn / warn-soft / info / info-soft / critical / critical-soft /
body-strong / white
```

토큰 자체는 잘 정리돼 있고 `npm run design:sync` 파이프라인을 통해 `tailwind.theme.json` → `tailwind.config.ts` 어댑터 → 컴포넌트 className 까지 자동 흘러간다. 다만 사용자의 다음 의도는 시각 측면을 한 단계 더 다듬는 것이다.

- "별로 많이 안 넣고 모던한 스타일" — 채도 낮은 차분한 톤. 트레이딩 도메인의 신뢰감·전문성을 중립적 색조로 표현.
- "시그니처 색상 정도만" — 브랜드를 대표하는 포인트 색 1~2 개로 일원화. 나머지는 그레이 스케일 + 상태 신호(warn/critical/info) 로 단순화.
- "디자이너한테 위임" — hex 직접 지정 없이 디자이너가 톤·역할·수를 확정.

문제는, 토큰 수 자체보다 **역할의 시각적 분기점이 더 명확해야** 한다는 점이다. 현재 `primary`(짙은 차콜) / `secondary`(중간 그레이) / `tertiary`(틸 그린) / `body-strong`(다른 차콜) 가 모두 "텍스트·강조" 영역에서 겹치는 톤이고, `neutral` / `panel` / `field-bg` / `white` 가 모두 "배경" 영역에서 겹친다. 미니멀 모던 톤에서는 이 중복을 정리하는 것이 우선이다.

또한 `body-strong` 처럼 비-semantic 한 이름은 향후 다크 모드 도입 시 의미 매핑이 어렵다. semantic 명명(`accent`, `surface`, `muted` 등)으로의 전환 여지를 함께 가이드한다.

## 2. 목표

- DESIGN.md v3 의 `colors` 토큰 수를 정제한다. 권장 **10개 안팎** (정확한 수는 디자이너 재량).
- **시그니처 색 1~2 개** 를 명시 — 이름·hex·역할이 DESIGN.md 본문 prose 에 한 단락 분량으로 박힌다.
- **모던·차분·전문** 톤을 합의된 명시 문장으로 박는다 (디자이너가 prose 로 근거 한 단락).
- 화면 코드(`app/`, `components/workbench/*`) 의 className 변경은 **최소** 로 둔다. 토큰 키가 동일하게 유지되는 경우 어댑터·합성 토큰을 통해 자동 흡수, 키가 바뀌는 경우만 mechanical rename.
- WCAG AA 대비비(4.5:1) 무회귀.
- PR #11 의 6블록 + PR #17 의 두 뷰포트가 새 팔레트로도 시각·동작 무회귀.

## 3. 범위 (In scope)

### 3.1 디자이너 산출물 (`docs/design/workbench-analyze-rebuild.md` v3)

- **YAML front matter `colors` 절 갱신** — 토큰 수 정제 (권장 10개 안팎). 키 명명은 가능하면 semantic (`surface`, `accent`, `muted`) 방향.
- **prose 보강**:
  - "Colors" 절에 모던·차분·전문 톤의 근거 1단락.
  - 시그니처 색 1~2 개 — 이름·hex·역할 명시 표.
  - 신·구 팔레트 비교 표 (어떤 토큰이 사라졌고, 사라진 토큰을 사용하던 컴포넌트가 어떤 새 토큰으로 매핑되는지). 예: `body-strong` → `text-strong` 또는 `primary` 로 흡수.
  - 주요 색 쌍의 WCAG AA 4.5:1 대비비 표 (primary × surface, accent × surface, warn × warn-soft, critical × critical-soft, info × info-soft 등).
- **`components:` 절 검토** — DESIGN.md 가 `card`, `badge-warn`, `badge-critical` 등 합성 토큰을 참조한다면 새 팔레트의 키로 자동 재매핑되는지 확인.
- `npx @google/design.md lint` errors=0 warnings=0 (orphan 토큰 0).

### 3.2 디자이너 가이드 — 모던 톤의 조작적 정의

디자이너 결정 영역이나, PM 이 출발선을 박는다.

- **채도 낮은 그레이스케일 + 포인트** — 비비드한 형광색 / 과한 채도 금지. HSL 의 S 가 한 자리수~30% 수준의 톤이 기본.
- **트레이딩 도메인 신뢰감** — 따뜻한 색 계열(주황·앰버·따뜻한 베이지) 보다는 중립적 그레이 / 차콜 / 다크 블루 계열.
- **상태 색은 명확** — warn / critical / info 는 시각적으로 즉시 인지 가능해야 한다. PR #11 AC-3 의 feasibility 비현실 강조가 색만이 아닌 텍스트로도 전달되지만, 색 자체의 의미 전달도 무회귀.
- **다크 모드 친화 명명** — `primary` / `surface` / `accent` / `text-strong` / `text-muted` 같이 의미 기반 키를 권장. `body-strong` 처럼 사용처 추정형 키는 가능하면 정리. (단, 명명 변경은 디자이너 재량 — semantic 으로 가는 경우 §3.3 의 mechanical rename 비용이 발생.)

### 3.3 코드 측 자동 흡수 / 최소 변경

- `tailwind.config.ts` 의 어댑터가 새 `tailwind.theme.json` 을 그대로 흡수. 키가 동일하면 컴포넌트 코드 0 변경.
- 키가 바뀐 경우 (예: `tertiary` → `accent`, `body-strong` → `text-strong`) frontend-dev 가 mechanical rename 한 번 수행. 영향 범위는 `app/`, `components/workbench/*`, `app/globals.css`, `app/components.css`.
- `app/components.css` 의 `@layer components` + `@apply` 합성 토큰 (`card`, `badge-warn`, `badge-critical` 등) 은 새 팔레트로 재매핑되도록 갱신. 컴포넌트 측 className 은 그대로 유지.
- `tailwind-merge` 의 충돌 인식이 새 토큰명과 정합 (충돌 규칙은 키만 보므로 어댑터 갱신만으로 충분).

### 3.4 무회귀 라운드트립

- PR #11 라운드트립 5건 (AAPL · BTC-USD · 비분할가능 · 화이트리스트 비매칭 · 5xx 폴백) 을 새 팔레트로 재실행. 6블록 모두 새 색으로 렌더 + feasibility 비현실 강조가 텍스트 + 새 warn/critical 톤으로 명확.
- PR #17 의 두 뷰포트 (모바일 375 · 데스크탑 1280) 모두 무회귀.
- `npm run typecheck`, `npm run lint`, `npm run build` 0 에러.

## 4. 비범위 (Out of scope)

- **다크 모드 도입** — 별도 PRD. 본 PRD 는 라이트 모드 팔레트의 정제만 다룬다. 다만 토큰 명명 단계에서 다크 모드 친화 semantic 키를 권장.
- **컴포넌트 레이아웃·간격·라운드 변경** — 본 PRD 는 `colors` 만. `spacing` / `rounded` / `typography` 무수정.
- **새 토큰 카테고리 추가** — `shadow`, `motion`, `z-index` 등 신규 카테고리 도입은 별도 PRD.
- **shadcn/ui · 다른 디자인 시스템 도입**.
- **차트 시각화 라이브러리** (캔들·라인 등).
- **화면 추가·삭제** (Workbench 단일 화면 유지).
- **반응형 변경** (PR #17 그대로 유지).
- **로고·아이콘·이미지 에셋 변경** — 본 PRD 의 시그니처 색 결정이 향후 로고 작업을 유도할 수는 있으나 본 PRD 범위 밖.
- **BE / route handler / API contract 변경**.
- **i18n 실제 도입** — `lib/copy/workbench/*` 의 한글 카피 유지.
- **E2E / 시각 회귀 자동화 도입** — QA 의 수동 라운드트립으로 검증.

## 5. 수용 기준 (AC)

검증 가능한 문장.

- **AC-1 (DESIGN.md v3 토큰 정제)**:
  - `docs/design/workbench-analyze-rebuild.md` 의 `colors:` front matter 가 v2 의 16개에서 정제됨 (권장 10개 안팎, 정확한 수는 디자이너 재량).
  - `npx @google/design.md lint` 결과 errors=0 warnings=0.
  - orphan 토큰 (정의되었으나 어디서도 참조되지 않는 키) 0건.
- **AC-2 (design:sync 파이프라인 무회귀)**:
  - `npm run design:sync` 가 새 토큰을 `tailwind.theme.json` 으로 정상 동기화 (재실행 시 멱등).
  - `tailwind.config.ts` 의 어댑터가 새 키 셋을 흡수. `tailwind-merge` 충돌 인식이 새 토큰명과 정합 (예: 두 className 중 뒤의 것이 적용).
  - `tailwind.theme.json` 이 git tracked 상태로 커밋되고, 사람이 직접 편집한 흔적 없이 `design:sync` 의 결정적 산출물임이 유지.
- **AC-3 (시그니처 색 명시)**:
  - DESIGN.md v3 의 "Colors" 절 prose 에 시그니처 색 1~2 개가 명시됨. 각 항목은 (이름·hex·역할) 3-튜플로 표기. 예: "**Signature Accent** — `#1f3b4d` — 분석 결과 헤더·CTA·강조 텍스트".
  - 시그니처 색은 본문에서 식별 가능한 단일 단어/구문으로 호명 (예: "Signature Accent", "브랜드 색").
- **AC-4 (모던 톤 자가검증)**:
  - DESIGN.md v3 의 "Colors" 절 prose 에 톤 근거 한 단락 이상 포함. 키워드 "모던 / 차분 / 전문" 중 최소 2 개가 prose 에 등장.
  - 신·구 팔레트 비교 표 포함 (사라진 토큰 / 흡수처 / 추가된 토큰 / 사유). 표는 Markdown 표.
- **AC-5 (대비비 무회귀)**:
  - 주요 색 쌍의 WCAG AA 4.5:1 비율 표가 DESIGN.md v3 prose 에 포함. 최소 쌍:
    - primary × surface (또는 등가 배경 토큰)
    - accent (또는 시그니처 색) × surface
    - warn × warn-soft
    - critical × critical-soft
    - info × info-soft
  - 모든 쌍에서 contrast ratio ≥ 4.5:1. (큰 텍스트 전용 영역은 3:1 허용 — 표에 어느 쌍이 큰 텍스트 전용인지 주석.)
- **AC-6 (컴포넌트 토큰 정합)**:
  - `app/components.css` 의 `@layer components` 안 `@apply` 합성 토큰 (`card`, `badge-warn`, `badge-critical` 등 v2 에 존재하는 것 모두) 이 새 팔레트로 자동 재매핑되어 동작.
  - 컴포넌트 측 (`components/workbench/*`) className 변경 0 또는 mechanical rename 만 (`tertiary` → `accent` 같은 경우).
  - `git grep -nE "tertiary|body-strong" -- app/ components/` 가 디자이너 결정의 신 토큰명만 남기고 0건 또는 의도된 잔재만.
- **AC-7 (build / typecheck / lint)**:
  - `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- **AC-8 (시각 라운드트립 5건)**:
  - PR #11 의 라운드트립 5건 (a) AAPL 정상, (b) BTC-USD 정상, (c) 비분할가능 자산 처리, (d) 화이트리스트 비매칭 안내, (e) 5xx 폴백 ErrorCard — 모두 새 팔레트로 시각적 일관 동작.
  - 6블록 모두 새 색으로 렌더.
  - feasibility 비현실 강조가 새 warn 톤으로 명확 (AC-3 무회귀).
  - ErrorCard 가 새 critical 톤으로 명확.
- **AC-9 (반응형 무회귀)**:
  - PR #17 의 두 뷰포트 (375px / 1280px) 에서 새 팔레트가 시각·동작 무회귀.
  - hydration mismatch 콘솔 경고 0건.
- **AC-10 (코드 변경 최소)**:
  - `components/workbench/*` 의 className 변경 라인 수가 PR diff 기준 합리적으로 작음 (정량 임계는 두지 않음 — reviewer 가 mechanical rename 외 변경 없음을 본다).
  - 신규 컴포넌트 추가 0건. 컴포넌트 prop 시그니처 변경 0건.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 PR #6 ~ #18 모두 머지되어 있고 메인은 `22d3b91` 기준이며 워킹트리는 깨끗하다고 가정.
- DESIGN.md → `tailwind.theme.json` → `tailwind.config.ts` 파이프라인은 PR #13 의 형태 그대로 유지된다고 가정. 파이프라인 자체의 변경은 본 PRD 범위 밖.
- `npx @google/design.md lint` 의 검증 규칙 (orphan 토큰, WCAG AA) 이 alpha 버전 그대로 동작한다고 가정. 도구 버전이 도중에 바뀌면 prose 검증으로 보완.
- 시그니처 색 결정 권한은 디자이너에게 있다 — 사용자가 hex 를 직접 지정하지 않는다. PM 가이드는 톤 방향(모던·차분·전문·시그니처 1~2)까지.
- 본 PRD 후속 작업의 mechanical rename 가 발생할 경우, 그 변경 범위는 `app/globals.css`, `app/components.css`, `app/`, `components/workbench/*`, `tailwind.config.ts` 어댑터에 한정된다.
- 다크 모드는 본 PRD 머지 후 별도 PRD 로 진입한다. 본 PRD 의 토큰 명명은 다크 모드 친화 semantic 키를 권장하되, semantic 명명을 강제하진 않는다 (디자이너 재량, §9 OPEN QUESTION 항목).

## 7. 참고

- `docs/design/workbench-analyze-rebuild.md` — 디자이너 갱신 대상. v2 (현재 16개 토큰) → v3 (정제).
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드.
- `docs/rules/frontend.md` — FE 컨벤션. 반응형·tailwind 관련 절은 본 PRD 머지 후에도 무회귀.
- `tailwind.config.ts`, `tailwind.theme.json` — 어댑터 / 동기화 산출물.
- `app/globals.css` — Tailwind 디렉티브 + preflight 잔여물.
- `app/components.css` — `@layer components` + `@apply` 합성 토큰.
- `components/workbench/*` 12 컴포넌트 — className 변경 최소화 영향 범위.
- `docs/prd/workbench-analyze-rebuild.md` — 라운드트립 5건의 정의.
- `docs/prd/tailwind-migration.md` — design:sync 파이프라인 정의.
- `docs/prd/fe-conventions.md` — 폴더·컨벤션 무회귀 기준.
- `docs/prd/responsive-pc-support.md` — 두 뷰포트 정의.
- `AGENTS.md` — 작업 원칙·라벨 게이트.

## 8. 영향 분석

### 8.1 변경되는 산출물

| 산출물 | 변경 내용 | 책임 에이전트 |
|---|---|---|
| `docs/design/workbench-analyze-rebuild.md` | v2 → v3. `colors:` front matter 토큰 수 정제 (권장 10개 안팎). prose 에 시그니처 색·톤 근거·신·구 비교 표·대비비 표 추가. | ux-designer |
| `tailwind.theme.json` | `npm run design:sync` 재실행 산출물. 사람이 직접 편집하지 않는다. | (자동) |
| `tailwind.config.ts` | 어댑터가 새 키 셋을 흡수. 토큰명이 semantic 으로 바뀌면 어댑터의 mapping 부 조정. | frontend-dev |
| `app/globals.css` | 잔여 hex / CSS 변수가 있다면 새 토큰명으로 치환. 본 절은 거의 변경 없음 예상. | frontend-dev |
| `app/components.css` | `@apply` 합성 토큰 (`card`, `badge-warn` 등) 이 새 팔레트 키로 자동 재매핑. 토큰명 변경 시 `@apply` 라인의 클래스명만 갱신. | frontend-dev |
| `components/workbench/*` (12 파일) | className 변경 최소. mechanical rename (`bg-tertiary` → `bg-accent` 등) 만 허용. | frontend-dev |
| `docs/qa/palette-modernization.md` | AC 별 재현·기대·실측 + 라운드트립 5건 + 두 뷰포트 무회귀 + 대비비 측정값. | qa |

### 8.2 변경되지 않는 산출물

- BE / FastAPI / route handler / API contract — 무수정.
- `hooks/`, `lib/` 의 모든 모듈 — 무수정 (디자인 토큰은 코드 식별자가 아니다).
- `lib/copy/workbench/*` 한글 카피 — 무수정.
- `docs/rules/frontend.md` — 무수정 (반응형·컨벤션 절 그대로).
- `docs/rules/design-md.md` — 무수정 (포맷 가이드 그대로).
- `package.json` / `package-lock.json` — 신규 라이브러리 도입 없음.

### 8.3 라벨 흐름 / 에이전트 핸드오프

```text
PM (본 PRD) → docs PR 머지
            ↓
ux-designer (DESIGN.md v3 갱신) → design PR 머지
            ↓
frontend-dev (어댑터 흡수 + mechanical rename 필요 시) → impl-ready
            ↓
QA (라운드트립 5건 + 두 뷰포트 + 대비비 측정) → qa-passed
            ↓
reviewer → review-approved
            ↓
DevOps 머지 → main
```

- 본 PRD 머지 후 다음 진입은 ux-designer 의 DESIGN.md v3 작성. frontend-dev 작업량은 토큰명 유지 시 거의 0, semantic rename 채택 시 mechanical rename 1 사이클.

### 8.4 리스크 / 완화

| 리스크 | 완화 |
|---|---|
| 시그니처 색이 트레이딩 도메인 톤(차분·신뢰)에서 벗어남 (예: 형광 라임) | DESIGN.md prose 의 "모던·차분·전문" 자가검증 + 사용자 1차 확인 게이트. |
| 토큰명 semantic 변경으로 코드 영향 범위 확대 | mechanical rename 만 허용. reviewer 가 비-mechanical 변경 차단. |
| WCAG AA 4.5:1 회귀 (시그니처 색이 surface 와 대비 부족) | AC-5 대비비 표를 디자이너 산출물에 강제. `design.md lint` 가 4.5:1 자동 검증. |
| 새 warn/critical 톤이 PR #11 AC-3 의 비현실 강조를 약화 | AC-8 의 라운드트립 (c) feasibility 비현실 시나리오로 시각 검증. 색만이 아닌 텍스트 강조 병행 (AGENTS.md 접근성 원칙). |
| `tailwind-merge` 충돌 인식이 새 토큰명과 어긋남 | AC-2 에서 명시. frontend-dev 가 충돌 케이스 1건 이상 수동 확인. |
| 다크 모드 도입 시 본 PRD 의 명명이 부적합으로 드러남 | semantic 명명 권장 (`surface`, `accent`, `text-strong`) — §9 OPEN QUESTION 으로 명시. |

## 9. OPEN QUESTION

각 항목에 PM 권고를 명시한다. 디자이너·사용자 결정으로 확정한다.

1. **시그니처 색 개수 — 1 vs 2**
   - PM 권고: **1 개**. 미니멀 / 강조의 단일성. 트레이딩 도메인은 정보 밀도가 높아 색 강조점이 분산되면 어떤 카드가 "최종 권고" 인지 모호해진다.
   - 디자이너가 2 개 (예: 다크 차콜 + 포인트 액센트) 의 시각적 위계 근거를 prose 로 설명할 수 있다면 2 개도 허용.

2. **시그니처 색 톤 방향**
   - PM 권고 후보:
     - (a) 다크 블루/네이비 (`#1f3b4d` 계열) — 금융·신뢰의 클래식 톤.
     - (b) 차콜 그레이 + 한 가지 포인트 (예: 슬레이트 + 다크 틸) — 더 모던, 색의 절제.
     - (c) 거의 그레이스케일 + 미세한 포인트 — 가장 모던, 강조는 굵기·크기로.
   - 디자이너 결정. PM 권고는 (b) 또는 (c).

3. **상태 색 (warn / critical / info) 톤**
   - PM 권고: **차분한 톤**. v2 의 `warn=#b45309` (앰버), `critical=#991b1b` (다크 레드), `info=#2563eb` (블루) 가 이미 비비드하지 않고 적절. 새 팔레트에서도 같은 명도 수준 유지 권장.
   - 비비드를 더 죽이는 방향 (예: warn 을 머스터드 그레이) 도 디자이너 재량.

4. **토큰명 — semantic 전환 vs v2 명명 유지**
   - PM 권고: **semantic 전환**. 다크 모드 도입 시 비용 절감. 예: `primary`→`text-strong`, `secondary`→`text-muted`, `tertiary`→`accent`, `panel`/`white`→`surface`, `neutral`/`field-bg`→`surface-muted`, `body-strong`→`text-strong` 으로 흡수.
   - 비용: frontend-dev 의 mechanical rename 1 사이클. 영향 범위 약 12 컴포넌트 + 2 CSS 파일 + 1 어댑터.
   - v2 명명 유지 시: 코드 변경 0. 다만 다크 모드 PRD 에서 다시 이 비용이 발생.

5. **토큰 수 — 정확한 수**
   - PM 권고: **10개 안팎** (예: surface / surface-muted / surface-strong / text-strong / text-muted / accent / warn / warn-soft / critical / critical-soft / info / info-soft 중 디자이너가 9~12 선택).
   - 정확한 수는 디자이너 재량. AC-1 은 "16개에서 정제됨" 만 강제.

6. **`white` 토큰 유지 여부**
   - PM 권고: **제거**. `panel` 또는 `surface` 와 사실상 중복. 흰색이 필요한 경우 Tailwind 의 `bg-white` 기본 유틸리티 또는 `surface` 키로 일원화.
   - 디자이너가 "흰색 vs panel(살짝 채도 있는 흰색)" 을 구분하려는 의도가 있다면 유지.

7. **`field-bg` 토큰 유지 여부**
   - PM 권고: **`surface-muted` 또는 `surface` 로 흡수**. 입력 필드 전용 배경이 별도 토큰일 필요는 모던 톤에서는 약하다. 입력 필드 시각 구분은 border / focus ring 으로.
   - 디자이너가 입력 필드 톤을 본문 배경과 미세하게 분리하고 싶다면 유지.

8. **`body-strong` 토큰 처리**
   - PM 권고: **`text-strong` 으로 흡수** (또는 `primary` 와 통합). 비-semantic 명명 정리.
   - 디자이너가 `primary` 와 다른 강조 톤이 필요하다고 판단하면 유지.

9. **시그니처 색의 사용처 범위**
   - PM 권고: **최종 권고(action) 카드 + CTA 버튼** 의 두 지점에 집중. 너무 많은 곳에 시그니처 색이 뿌려지면 강조점이 흐려진다.
   - 디자이너가 헤더·로고 영역 등 브랜드 노출 영역까지 확장하려 한다면 prose 에 사용처 룰을 명시.

10. **DESIGN.md v3 의 lint 도구 버전**
    - PM 권고: **현재 사용 중인 `@google/design.md` 버전 그대로** (PR #13 에서 박힌 alpha 버전). 도구 버전 업그레이드는 별도 PRD.
