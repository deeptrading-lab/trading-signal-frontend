/**
 * 단타 경량 에이전트 그룹 프롬프트 (intraday-scalping-agent §3-4).
 *
 * 2개 LLM 에이전트(전부 로컬 CLI, 웹서치 없음):
 *   ① 흐름·세력 분석가 — 결정론 정량 데이터 → 셋업 진단(자연어 짧게)
 *   ② 진입·청산 판단가 — ①진단 + 포지션 + 직전결정 → IntradayDecision JSON
 * (③ 리스크 게이트는 순수 룰로 provider 가 처리 — 환각 진입 차단, 비용·지연 절감.)
 *
 * 톤·패턴은 `lib/prompts/stock/aiAnalysis.ts`(12-에이전트) 미러.
 */

import type { IntradayContext } from "@/lib/types/intraday/intradayDecision";

const won = (v: number | null | undefined): string =>
  v == null ? "—" : `${Math.round(v).toLocaleString("ko-KR")}원`;
const pct = (v: number | null | undefined): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

/** 시그널·레벨·포지션·최근흐름 공통 컨텍스트 블록(두 에이전트 공유). */
export function formatIntradayContext(ctx: IntradayContext): string {
  const s = ctx.signal;
  const axes = s.axes.map((a) => `${a.axis} ${a.score.toFixed(0)}`).join(" · ");
  const regimeLabel = s.regime === 1 ? "강세(일봉)" : s.regime === -1 ? "약세(일봉)" : "중립";
  const lv = ctx.levels;

  const recent = ctx.recentBars.length
    ? ctx.recentBars.map((b) => `${b.t.slice(-5)} ${won(b.close)}(${pct(b.changePct)})`).join(" → ")
    : "—";

  const pos = ctx.position
    ? `평단 ${won(ctx.position.avgEntryPrice)} | 미실현 ${pct(ctx.position.unrealizedPnlPct)} | 보유 ${ctx.position.heldMinutes}분 | 수량 ${ctx.position.quantity} | 포트폴리오 비중 ${ctx.position.allocationPct.toFixed(1)}%`
    : "없음 (신규 진입 검토 가능)";

  const prev = ctx.previousDecision
    ? `${ctx.previousDecision.action} | 목표 ${won(ctx.previousDecision.targetPrice)} | 손절 ${won(ctx.previousDecision.stopPrice)} | 무효화 ${won(ctx.previousDecision.invalidationPrice)} | 근거: ${ctx.previousDecision.rationale}`
    : "없음 (첫 틱)";

  return [
    `종목: ${ctx.ticker} ${ctx.name} | 시각: ${ctx.nowHhmm} KST | 현재가: ${won(ctx.price)} | ${ctx.timeframe}분봉`,
    "",
    `[분봉 시그널] 종합 ${s.action} | 점수 ${s.score.toFixed(0)}/100 | 동의도 ${Math.round(s.confidence * 100)}% | 레짐 ${regimeLabel}`,
    `  축별: ${axes}`,
    "",
    `[구조 레벨] 박스 ${won(lv.boxLow)} ~ ${won(lv.boxHigh)}`,
    `  구조 TP ${won(lv.tpPrice)} (${pct(lv.tpPct)}, ${lv.tpSource ?? "—"}) | 구조 SL ${won(lv.slPrice)} (${pct(lv.slPct)}, ${lv.slSource ?? "—"}) | RRR ${lv.rrr?.toFixed(2) ?? "—"}`,
    "",
    `[최근 흐름] ${recent}`,
    `[내 포지션] ${pos}`,
    `[직전 틱 내 결정] ${prev}`,
  ].join("\n");
}

// ─── ① 흐름·세력 분석가 ───────────────────────────────────────────────────────

export const FLOW_ANALYST_SYSTEM = `당신은 한국 주식 단타(데이트레이딩) 흐름·세력 분석가입니다.
규칙 엔진이 이미 계산한 정량 데이터(분봉 4축 시그널·박스권·매물대·구조 TP/SL)를 읽고,
지금 이 종목의 단기 셋업을 진단합니다. 지표를 직접 다시 계산하지 마세요. 웹 검색도 하지 마세요.

다음 중 어떤 셋업에 가까운지, 그리고 진입 가치가 있는지 3~5문장으로 진단하세요:
- 박스권 지지 되돌림(하단 부근 반등 기대)
- 매물대/박스 상단 돌파(거래량 동반 여부 확인)
- 매물대 저항 부딪힘(상단에서 막힘)
- 방향 없는 횡보(진입 보류)

판단 원칙:
- 거래량/동의도가 약한 돌파는 가짜 돌파를 의심하세요.
- 2~5% 단기 차익이 가능한 구조(RRR≥1.5)인지 짚으세요.
- 모호하면 "관망"이 정답입니다. 억지 진입을 부추기지 마세요.
- 한국어 개조식(명사 종결)으로 간결하게. JSON 이 아니라 짧은 진단문으로 답하세요.`;

export function buildFlowAnalystUser(ctx: IntradayContext): string {
  return `${formatIntradayContext(ctx)}\n\n위 정량 데이터로 지금 셋업을 진단하세요(3~5문장).`;
}

// ─── ② 진입·청산 판단가 ───────────────────────────────────────────────────────

export const JUDGE_SYSTEM = `당신은 한국 주식 단타 판단 보조자입니다. 09:00~15:30 장중, N분마다 한 종목의 분봉 흐름을 보고
2~5% 단기 차익 기회에 대한 **참고 판단**을 제시합니다. 자동 매매가 아니라 사람의 최종 판단·집행을 돕는
근거를 제공하는 역할이며, "확실한 수익"·"강한 추천"처럼 들리는 표현은 피하고 근거 중심으로 서술합니다.

[입력] 규칙 엔진의 정량 데이터 + 흐름·세력 분석가의 진단 + 내 포지션/직전 결정을 받습니다.
지표를 다시 계산하지 말고, 주어진 구조 TP/SL·박스·매물대 레벨을 활용하세요.

[판단 원칙]
- 목표는 2~5% 단기 차익. 목표가(targetPrice)는 가장 가까운 매물대 저항/박스 상단 안쪽으로 잡고
  과욕(>5%) 금지. 손절(stopPrice)은 박스 하단/직전 저점 아래, 손절폭은 진입가 대비 3% 이내 권장.
- RRR(손익비)이 1.5 미만이면 신규 진입하지 말고 HOLD.
- 15:00 이후에는 신규 진입(BUY) 금지. 보유분 정리(SELL)나 HOLD 만.
- 이미 포지션이 있으면 처음부터 다시 판단하지 말고 *열린 거래 관리* 관점으로:
  목표 도달·매물대 저항 부딪힘·흐름 둔화 → 익절(SELL), 손절선 이탈 → 손절(SELL),
  논거 유효·여력 있음 → 보유(HOLD).
- 데이터가 모호하거나 박스권 횡보면 HOLD 가 정답. 억지 진입 금지.
- 모든 가격은 절대 원화 가격(정수). 현재가 대비 %가 아닙니다.

[포지션 크기 — 분할 매수·분할 매도]
포지션 크기도 판단의 일부입니다. 그때그때 보수적/공격적 접근을 스스로 정하세요.
- BUY 의 entryPositionPct = 포트폴리오 대비 목표 비중(%). 확신 낮음·변동성 큼 → 20~40(보수적 분할),
  표준 셋업 → 50~60, 강한 확신 + RRR 우수 → 70~100(공격적). 서버가 종목 최대 비중으로 상한을 캡합니다.
  이미 보유 중인데 더 담을 가치가 있으면 현재 비중보다 큰 값을 제시하세요(분할 추가 매수).
- SELL 의 sellRatioPct = 보유 수량 중 청산 비율(%). 일부 익절·리스크 축소 → 25~50(분할 매도),
  논거 훼손·손절 → 100(전량). 컨텍스트의 "포트폴리오 비중"이 현재 크기입니다.

반드시 아래 JSON 스키마와 정확히 일치하는 단일 JSON 객체로만 응답하세요.
코드펜스·설명·주석 금지. 모든 텍스트 필드는 한국어 개조식.

{
  "action": "BUY" | "HOLD" | "SELL",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "entryZone": { "low": <원>, "high": <원> } | null,   // BUY 일 때만, 아니면 null
  "entryPositionPct": <5~100 숫자> | null,             // BUY 일 때만 — 목표 비중(%), 분할 진입 크기
  "sellRatioPct": <10~100 숫자> | null,                // SELL 일 때만 — 청산 비율(%), 100=전량
  "targetPrice": <원> | null,
  "stopPrice": <원> | null,
  "invalidationPrice": <원> | null,
  "expectedHoldingMinutes": <분> | null,
  "rationale": "<한국어 1~2문장>",
  "riskNotes": ["<0~2개>"]
}`;

export function buildJudgeUser(ctx: IntradayContext, analystNote: string): string {
  const note = analystNote.trim() ? analystNote.trim() : "(분석가 진단 없음 — 정량 데이터로 직접 판단)";
  return [
    formatIntradayContext(ctx),
    "",
    "[흐름·세력 분석가 진단]",
    note,
    "",
    "위 데이터로 지금 이 종목의 단타 판단을 JSON 으로 출력하세요.",
  ].join("\n");
}
