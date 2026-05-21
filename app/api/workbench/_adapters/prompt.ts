/**
 * Claude CLI prompt 생성.
 *
 * PRD `claude-cli-analysis` §3.3 — claude 가 6블록 JSON 만 반환하도록 강제하는 한글 prompt.
 *
 * - system prompt: 역할 정의 + JSON 스키마 명시 + "JSON 만, 다른 텍스트/마크다운/코드펜스 금지".
 * - user prompt: 입력값을 한글 라벨로 명시 (ticker / 자본 / 목표 수익 / 기간 / 최대 손실).
 * - JSON 스키마는 `lib/types/workbench/analyze.ts` 의 `AnalyzeResponse` 와 동일 shape.
 *
 * v6 (polish-followups §3.4 B1) — `ANALYZE_JSON_SCHEMA` 를 system prompt 안에 inline embed.
 * claude CLI 가 별도 `--json-schema` 플래그를 지원하지 않으므로, 정의된 schema 객체를
 * JSON 문자열로 직렬화해 system prompt 본문에 포함시켜 응답의 일관성을 끌어올린다.
 *
 * `CLAUDE_PROMPT_TEMPLATE` 환경변수로 user prompt 템플릿 override 가능 (옵션).
 */

import type { AnalyzeRequest } from "@/lib/types/workbench/analyze";

/**
 * claude CLI 응답 강제용 JSON 스키마. `lib/types/workbench/analyze.ts` 의 shape 과 정합.
 *
 * 보조 필드는 BE 마이그레이션 안정성 차원에서 옵셔널로 두고, 핵심 필드 (action / brief / feasibility /
 * horizons / risk_plan / warnings) 는 required 로 못박는다.
 *
 * v6 — `getSystemPrompt()` 안에서 JSON.stringify 된 형태로 system prompt 본문에 embed 된다.
 * 미사용 export 0건 — `git grep -n "ANALYZE_JSON_SCHEMA" app/` 가 정의 + 사용처를 모두 잡는다.
 */
export const ANALYZE_JSON_SCHEMA = {
  type: "object",
  required: ["analysis"],
  properties: {
    analysis: {
      type: "object",
      required: [
        "input",
        "whitelist_entry",
        "brief",
        "feasibility",
        "horizons",
        "risk_plan",
        "action",
        "warnings",
      ],
      properties: {
        input: { type: "object" },
        whitelist_entry: { type: "object" },
        brief: { type: "object" },
        feasibility: { type: "string" },
        annualized_target_return_pct: { type: "number" },
        horizons: { type: "array" },
        risk_plan: { type: "object" },
        position: {},
        action: { type: "string" },
        ai_summary: {},
        warnings: { type: "array" },
      },
    },
  },
} as const;

const SYSTEM_PROMPT_KO_HEAD = `당신은 한국어로 답변하는 트레이딩 분석가입니다.
주어진 종목과 투자 조건에 대해 분석한 결과를 **반드시 아래 JSON 스키마에 정확히 일치하는 단일 JSON 객체** 로만 응답하세요.

규칙:
- 마크다운, 코드펜스 (\`\`\`), 설명 텍스트, 인사말 모두 금지. 오직 JSON 만.
- 최상위 키는 \`analysis\` 하나이며 그 아래에 6블록을 모두 채워 넣습니다.
- 6블록: \`brief\` (요약), \`feasibility\` (실현 가능성 enum), \`horizons\` (기간별 시나리오 배열), \`risk_plan\` (리스크 계획), \`action\` (최상위 권고 액션 enum), \`warnings\` (경고 배열).
- 식별자 (\`action\`, \`feasibility\`, ticker, asset_type) 는 영문 enum 그대로 두고, 사람이 읽는 문장 (\`brief.reasons\`, \`brief.risks\`, \`warnings\` 등) 은 한국어로 작성하세요.
- 숫자 필드는 숫자, 문자열 필드는 문자열, 배열 필드는 배열로 정확히 채웁니다. null 허용은 \`upside_reference_pct\`, \`downside_reference_pct\`, \`risk_reward\`, \`position\`, \`ai_summary\` 에 한정.
- 모르는 값은 추정치를 적되, \`brief.disclaimer\` 와 \`warnings\` 에 추정·불확실성을 명시하세요.

응답할 JSON 의 shape 예시 (실제 값은 입력에 맞춰 분석):
{
  "analysis": {
    "input": { "ticker": "...", "capital_amount": 0, "target_return_pct": 0, "target_period_days": 0, "max_loss_pct": 0 },
    "whitelist_entry": { "ticker": "...", "asset_type": "..." },
    "brief": {
      "ticker": "...", "asset_type": "...", "action": "...", "confidence": "...",
      "score": 0, "timeframe": "...", "reference_price": 0,
      "entry_condition": "...", "invalidation": "...",
      "upside_reference_pct": 0, "downside_reference_pct": 0, "risk_reward": 0,
      "reasons": ["..."], "risks": ["..."],
      "data_quality": { "price": "...", "technicals": "...", "news": "...", "events": "...", "source": "claude-cli" },
      "component_scores": { "trend": 0, "momentum": 0, "volume": 0, "volatility_risk": 0, "news_event": 0, "market_regime": 0 },
      "generated_at": "ISO8601",
      "disclaimer": "..."
    },
    "feasibility": "REALISTIC",
    "annualized_target_return_pct": 0,
    "horizons": [
      { "label": "...", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",
        "start_price": 0, "end_price": 0, "high": 0, "low": 0,
        "return_pct": 0, "max_drawdown_pct": 0, "volume_change_pct": 0,
        "direction": "BULLISH" }
    ],
    "risk_plan": {
      "suggested_buy_amount": 0, "suggested_share_qty": 0,
      "entry_price": 0, "take_profit_price_for_day": 0, "stop_loss_price_for_day": 0,
      "invalidation_condition": "...",
      "expected_loss_if_stopped": 0, "expected_gain_if_take_profit": 0,
      "risk_reward_ratio": 0
    },
    "position": null,
    "action": "BUY",
    "ai_summary": null,
    "warnings": ["..."]
  }
}`;

/**
 * 사용자 입력을 user prompt 본문으로 변환.
 *
 * shell injection 차단: 입력은 이미 `lib/validation/workbench/analyze.ts` 로 검증된 값.
 * 추가로 ticker 는 영문/숫자/하이픈만 허용하도록 narrowing.
 */
export function buildUserPrompt(input: AnalyzeRequest): string {
  const safeTicker = sanitizeTicker(input.ticker);
  const tpl = process.env.CLAUDE_PROMPT_TEMPLATE;
  if (tpl && tpl.trim() !== "") {
    return tpl
      .replace(/\{\{ticker\}\}/g, safeTicker)
      .replace(/\{\{capital_amount\}\}/g, String(input.capital_amount))
      .replace(/\{\{target_return_pct\}\}/g, String(input.target_return_pct))
      .replace(/\{\{target_period_days\}\}/g, String(input.target_period_days))
      .replace(/\{\{max_loss_pct\}\}/g, String(input.max_loss_pct ?? 2));
  }

  return [
    "다음 입력을 분석해 위 시스템 프롬프트에 명시된 JSON 스키마로만 응답하세요.",
    "",
    `- 종목 (ticker): ${safeTicker}`,
    `- 투자 가능 자본: ${input.capital_amount}`,
    `- 목표 수익률 (%): ${input.target_return_pct}`,
    `- 목표 기간 (일): ${input.target_period_days}`,
    `- 최대 손실률 (%): ${input.max_loss_pct ?? 2}`,
    "",
    "다른 어떤 텍스트도 포함하지 말고, 오직 JSON 객체 하나만 출력하세요.",
  ].join("\n");
}

export function getSystemPrompt(): string {
  // v6 (polish-followups §3.4 B1) — system prompt 본문에 JSON 스키마를 inline embed.
  // claude 가 스키마의 required / properties 를 직접 보면서 응답을 생성하도록 유도.
  // shape 예시 (SYSTEM_PROMPT_KO_HEAD 의 끝) 와 schema 가 함께 들어가 BE 마이그레이션 안정성 유지.
  const schemaJson = JSON.stringify(ANALYZE_JSON_SCHEMA, null, 2);
  return `${SYSTEM_PROMPT_KO_HEAD}

엄격한 JSON 스키마 (이 스키마의 required 항목은 반드시 모두 채워서 응답):
${schemaJson}`;
}

/**
 * ticker 화이트리스트 검증과 별개로 adapter 레벨에서 한 번 더 narrowing.
 * 영문 대소문자/숫자/하이픈/언더스코어만 허용. 그 외 문자는 strip 한다 (shell injection 차단).
 */
function sanitizeTicker(ticker: string): string {
  return ticker.replace(/[^A-Za-z0-9_-]/g, "");
}
