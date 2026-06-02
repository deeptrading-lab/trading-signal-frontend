# Slack 봇 + 매매 분석 고도화 로드맵

> 상태: 계획 (reference). 각 Phase 착수 시 `docs/prd/<slug>.md` 정식 PRD(양식 1~7 + §8 영향 분석 + §9 OPEN QUESTION)로 분해한다.
> 권장 저장 위치: `docs/references/slack-bot-analysis-roadmap.md`
> 최종 수정: 2026-06-01

---

## 0. 한 줄 요약

지수·종목 정보 조회는 어디서나 가능하다. 이 제품의 차별점은 **"지금 매매해도 되는가"를 내가 정한 기준으로 판단·설명해 주는 의사결정 지원**이다. 그 분석 엔진은 **이미 웹(`/api/workbench/analyze`)에 구현돼 있고**, 본 로드맵은 (1) 같은 엔진을 **Slack 봇**으로 노출하고 (2) 분석을 **신뢰할 수 있게 만드는 차별화 기능**(백테스팅·리스크·회고)을 단계적으로 얹는 것을 목표로 한다.

---

## 1. 현황 (이미 있는 것 — 재사용 대상)

| 자산 | 위치 | 상태 |
|---|---|---|
| 웹 AI 분석 엔드포인트 | `app/api/workbench/analyze/route.ts` | ✅ 동작 (BFF 단일 진입점) |
| 백엔드 어댑터 분기 | `app/api/workbench/_adapters/` (`fastapi` \| `claude-cli`) | ✅ `ANALYZE_BACKEND` 환경변수로 전환 |
| claude CLI 어댑터 | `_adapters/claudeCli.ts` | ✅ `claude --print --output-format json --system-prompt` subprocess 호출 + stdin prompt |
| 분석 프롬프트/스키마 | `_adapters/prompt.ts` (`ANALYZE_JSON_SCHEMA`, system prompt) | ✅ 6블록 JSON 강제 |
| 6블록 응답 타입 | `lib/types/workbench/analyze.ts` | ✅ brief / feasibility / horizons / risk_plan / action / warnings |
| 화이트리스트(제한 종목) | `app/api/whitelist/` | ✅ |
| 앱 비밀번호 게이트(제한 사용자) | `app-password-gate` PRD, `middleware.ts`, `lib/auth/` | ✅ |
| Slack MCP 설정 | `.mcp.json` (`slack-mcp-server`) | ⚠️ 설정만 있음, 봇 런타임 없음 |
| 데이터 소스 | KIS(한국투자증권) · OpenDART · CoinGecko | ✅ BFF 프록시 |
| 분석 엔진(별도 레포) | `trading-signal-engine` (FastAPI) | 외부 레포 |
| Supabase DB | 예정 | ❌ MVP 미연결 |

**결론**: "웹사이트로 매매 분석이 가능한가?"의 답은 **이미 가능하다**(로컬 `claude-cli` 모드). Slack 봇은 새 엔진이 아니라 같은 엔진의 **두 번째 입구**다.

### 1.1 입력/출력 계약 (재사용)

```
AnalyzeRequest = {
  ticker, capital_amount, target_return_pct,
  target_period_days, max_loss_pct?(기본 2)
}
→ AnalyzeResponse = { analysis: { brief, feasibility, horizons,
                                  risk_plan, action, warnings, ... } }
```

---

## 2. 핵심 설계 결정

### 결정 1 — Slack 봇은 분석 로직을 복제하지 않는다

봇이 직접 `claude`를 호출하거나 프롬프트를 다시 짜면 **로직이 두 군데로 갈라진다**(프롬프트/스키마/폴백 메시지 중복). 대신:

```
Slack 봇 → HTTP POST http://localhost:3000/api/workbench/analyze
        → (이미 있는) claude-cli 어댑터가 claude -p 호출
        → 6블록 JSON → 봇이 Slack 메시지로 포맷
```

봇은 **얇은 Slack ↔ HTTP 어댑터**일 뿐이고, 프롬프트·스키마·정규화·한글 폴백은 전부 기존 코드가 담당한다. 집 PC에서 어차피 `next dev`가 떠 있으므로 엔드포인트는 바로 옆에 있다.

### 결정 2 — 구독(Max 20x) 사용은 `claude -p` 헤드리스로

- `claude --print --output-format json`(=기존 어댑터 방식)은 **로그인된 CLI 자격증명(구독)** 을 사용 → 토큰 종량과금 회피.
- Agent SDK(TS/Python)는 `ANTHROPIC_API_KEY`를 요구(종량과금)하므로 이 목적엔 **부적합**.
- 즉 "봇 → 로컬 BFF → claude -p" 경로가 구독을 그대로 쓰는 정답.
- ⚠️ 헤드리스/자동화 호출은 인터랙티브 사용과 **별도의 사용량·레이트 한도**에 걸릴 수 있다(정책 변동 가능). 호출량 늘리기 전 본인 계정 기준으로 확인하고, 동시 호출은 낮게, `--model`로 일상 분석은 가벼운 모델 사용, 과부하(529)엔 지수 백오프.

### 결정 3 — 레포는 단일 레포 유지, 모듈만 분리

- 별도 `signal-engine` 레포로 쪼개지 않는다(멀티레포 동기화 비용 = YAGNI).
- 봇은 같은 레포 `bot/` 디렉터리에 둔다.
- 단, 봇이 프런트 내부를 헤집지 않도록 **HTTP 경계(BFF)** 를 통해서만 분석을 호출한다(결정 1).
- 추후 규칙 계산을 프런트와 봇이 공유해야 하면, UI 비종속 순수 TS 모듈(`lib/signal/`)로 추출한다.

### 결정 4 — 배포 경계

- `claude-cli` 어댑터에는 **Vercel 가드**가 이미 있다(Vercel에선 503). 즉 claude-cli 모드는 **로컬(집 PC) 전용**.
- 따라서 운영 형태는 둘 중 하나:
  - **(권장, 단기)** 집 PC에서 `next dev` + Slack 봇을 상시 구동. 분석은 전부 로컬 claude-cli.
  - **(장기)** Vercel에 배포되는 웹은 `fastapi` 모드(별도 엔진)로, 집 PC 봇은 `claude-cli` 모드로. 두 모드 공존.

---

## 3. Slack 봇 아키텍처

```
┌──────────────┐   Socket Mode (아웃바운드 WS, 포트포워딩 불필요)
│ Slack 워크스페이스 │◄───────────────────────────────┐
└──────────────┘                                  │
        ▲ async 응답(분석 결과 블록)                  │
        │                                          │
┌───────┴───────────────────────────────────────────────────┐
│  집 PC (상시 구동)                                          │
│                                                            │
│  ┌────────────────┐   1) 즉시 ack("분석 중…")              │
│  │  Slack 봇 (bot/) │   2) 접근 제어(허용 사용자/채널 검사)    │
│  │  Bolt Socket Mode│   3) 입력 파싱 → AnalyzeRequest        │
│  └───────┬─────────┘                                       │
│          │ HTTP POST /api/workbench/analyze                │
│          ▼                                                 │
│  ┌────────────────────────┐                                │
│  │ Next dev (localhost:3000)│  ANALYZE_BACKEND=claude-cli   │
│  │  BFF route handler       │                               │
│  │   → claudeCli 어댑터       │── claude --print --output-format json
│  │                          │       --system-prompt … (stdin=prompt)
│  └────────────────────────┘   → 구독으로 추론               │
│          │ 6블록 JSON                                        │
│          ▼                                                  │
│  봇이 Slack Block Kit으로 포맷 → 4) async 응답               │
│          │                                                  │
│          ▼ (Phase 2+) 분석 로그 적재                          │
│  Supabase / 로컬 SQLite                                     │
└────────────────────────────────────────────────────────────┘
```

### 3.1 명령어 설계 (초안)

| 명령 | 예시 | 동작 |
|---|---|---|
| `/analyze` | `/analyze 005930 자본=1000만 목표=5% 기간=20일 손절=2%` | 단건 분석 → 6블록 요약 |
| `/quick` | `/quick 005930` | 기본값으로 빠른 신호만(action + 한 줄 근거) |
| `@봇 멘션` | `@봇 삼성전자 지금 들어가도 돼?` | 자연어 → 파라미터 추출 후 분석 |
| `/watch` | `/watch add 005930` | 관심종목 등록(웹 watchlist와 공유) |
| `/help` | | 명령·기준 설명 |

- Slash 커맨드는 **3초 내 ack** 필수 → "분석 중…" 먼저, 결과는 `response_url` 또는 `chat.postMessage`로 비동기.
- 응답은 Block Kit: action 배지(BUY/HOLD/AVOID) + feasibility + 핵심 근거 3개 + 리스크 플랜(진입/손절/익절) + ⚠️면책.

### 3.2 접근 제어 (제한 사용자)

- 허용 `user_id` / `channel_id` allowlist(환경변수 또는 작은 설정 파일).
- 미허용 호출은 정중히 거절 + 로깅.
- Socket Mode라 공개 엔드포인트가 없어 표면적이 작지만, **봇 토큰·시그널 데이터는 `.env.local`에만** 둔다(레포 커밋 금지).

### 3.3 기술 스택

- `@slack/bolt` (Socket Mode) — Node/TS, 기존 레포와 동일 런타임.
- 위치: `bot/` (예: `bot/index.ts`, `bot/commands/analyze.ts`, `bot/format/blocks.ts`, `bot/access.ts`).
- 실행: `npm run bot`(스크립트 추가). 집 PC에서 `next dev`와 함께 `pm2` 또는 `launchd`로 상시 구동.

---

## 4. 웹 분석 (이미 존재 — 보강 항목)

웹은 `app/(main)/analyze`에서 동작 중. 추가로 챙길 것:

1. **운영 모드 확정** — Vercel 웹은 `fastapi` 엔진 필요(claude-cli는 Vercel 불가). 당분간 "분석은 집 PC, 조회는 Vercel"로 갈지 결정.
2. **결과 영속화** — 현재 분석 결과가 휘발. 로그를 남겨야 백테스팅·회고가 가능(§5).
3. **신호의 결정론적 부분 분리** — RSI·이평·거래량 등 숫자 판단은 규칙 엔진(코드)으로, LLM은 "설명"만. 현재는 프롬프트가 숫자 추정까지 맡고 있어 환각 위험 → 데이터를 prompt에 주입하는 방향으로 강화.

---

## 5. 차별화 기능 (사람들이 실제로 수익에 필요로 하는 것)

> 정보가 아니라 **의사결정·규율**이 차별점. 임팩트 큰 순.

### 5.1 백테스팅 (최우선 차별점)

내가 정한 기준/신호를 과거 데이터에 돌려 **승률·손익비·MDD**를 보여준다. "이 신호가 실제로 먹혔는가"를 증명 → 신뢰도가 근본적으로 달라진다. KIS 일봉 데이터로 시작 가능.

### 5.2 리스크 관리 도구

포지션 사이징(자본의 몇 %), 손절·익절 자동 제안, 포트폴리오 집중도/상관 경고. 개인투자자 손실의 핵심 원인. `risk_plan` 블록이 이미 있으니 확장.

### 5.3 매매 일지 + AI 회고

진입 이유를 기록 → 나중에 "그때 논리가 맞았는지" AI가 복기. 같은 실수 반복 차단. §4-2 로그 영속화가 선행 조건.

### 5.4 공시(DART)·뉴스 실시간 요약

LLM이 진짜 강점을 내는 영역. OpenDART 연동이 이미 있으니, 공시 즉시 요약·해석으로 한국 시장 특화 차별화.

### 5.5 확률적 표현

"지금 사세요"(단정) 대신 "이 조건 과거 N회 중 승률 X%". 신뢰도↑ + 법적 리스크↓.

---

## 6. 단계별 로드맵

| Phase | 목표 | 산출물 | 선행 |
|---|---|---|---|
| **P0** | 봇 토대 | Socket Mode 봇 골격(`bot/`), allowlist, `/help`, `/quick` ack→async | — |
| **P1** | 분석 연결 | `/analyze` → 로컬 BFF 호출 → 6블록 Block Kit 응답 | P0 |
| **P2** | 영속화 | 분석 로그 저장(Supabase 또는 로컬 SQLite), `/history` | P1 |
| **P3** | 자연어 입력 | `@봇` 멘션 → 파라미터 추출 → 분석 | P1 |
| **P4** | 백테스팅 | 규칙→과거 데이터 검증, 승률/손익비/MDD 리포트 | P2 |
| **P5** | 리스크·일지 | 포지션 사이징 강화 + 매매일지 AI 회고 | P2 |
| **P6** | 공시·뉴스 | DART/뉴스 실시간 요약 명령 | P1 |

각 Phase = 한 `feature/<slug>` 브랜치 = 한 PR (AGENTS.md 워크플로 준수). P0~P1만으로도 "Slack에서 종목 분석"이라는 핵심 가치는 완성된다.

---

## 7. 리스크·주의사항

- **법적(중요)**: 한국에서 특정 종목 매수/매도를 **단정적으로 권유**하면 투자자문업/유사투자자문업 규제 대상이 될 수 있다. "정보 제공·교육·시그널" 프레임 + 면책 문구를 모든 응답에 유지(`disclaimer`/`warnings` 블록 이미 존재).
- **구독 자동화 한도**: 헤드리스 호출 사용량·레이트 한도, ToS 변동 가능. 개인/제한 사용자 범위 유지, 동시 호출 최소화, 백오프.
- **보안**: 봇 토큰·KIS/DART 키는 `.env.local`/환경변수에만. Socket Mode로 인바운드 표면 최소화. ticker는 어댑터에서 이미 sanitize(`[^A-Za-z0-9_-]` strip).
- **단일 장애점**: 집 PC 다운 = 봇 다운. 상시성 필요해지면 그때 호스팅 검토(단, claude-cli는 로컬 전용이라 호스팅 시 fastapi 엔진 필요).
- **환각 방지**: 숫자 판단은 코드(규칙 엔진), LLM은 설명. 데이터를 프롬프트에 주입.

---

## 8. 다음 작업

1. P0 정식 PRD 작성(`docs/prd/slack-bot-mvp.md`) — 명령어 스펙, allowlist, ack/async, Block Kit 포맷 확정.
2. `@slack/bolt` 도입 + `bot/` 골격 + `npm run bot`.
3. P1: 로컬 BFF 호출 어댑터 + 6블록 → Block Kit 매핑.
