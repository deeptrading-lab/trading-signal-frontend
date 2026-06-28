/**
 * 장중 단타 판단(참고) Slack 알림 (C). intraday-scalping-agent §0.
 *
 * IntradayReadResponse 를 Slack incoming webhook 으로 푸시 — 화면을 안 봐도 판단·근거를 받는다.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음. webhook 미설정이면 조용히 skip(fail-soft).
 *
 * 설정: `.env.local` 에 INTRADAY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
 */

import { formatMoney } from "@/lib/utils/formatMoney";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import { INTRADAY_READ_COPY as C } from "@/lib/copy/stock/intradayRead";
import type { IntradayReadResponse } from "@/lib/types/intraday/intradayDecision";

const won = (v: number | null | undefined): string =>
  v == null ? C.none : formatMoney(roundToKrxTick(v));
const pct = (v: number | null | undefined): string =>
  v == null ? "" : ` (${v >= 0 ? "+" : ""}${v.toFixed(1)}%)`;

const ACTION_EMOJI: Record<string, string> = { BUY: "🟢", HOLD: "⚪️", SELL: "🔴" };

/** IntradayReadResponse → Slack blocks(+text 폴백). */
export function formatIntradayReadForSlack(read: IntradayReadResponse): {
  text: string;
  blocks: unknown[];
} {
  const { decision: d, levels: lv, signal: s } = read;
  const head = `${ACTION_EMOJI[d.action] ?? ""} [단타 판단·참고] ${read.name} (${read.ticker}) · ${read.timeframe}분봉 ${read.asOf.slice(11)}`;
  const verdict = `*${C.action[d.action]}* · 신뢰도 ${C.confidence[d.confidence]}`;

  const levelLines: string[] = [];
  if (d.action === "BUY") {
    if (d.entryZone) levelLines.push(`진입 ${won(d.entryZone.low)}~${won(d.entryZone.high)}`);
    levelLines.push(`목표 ${won(d.targetPrice)}${pct(lv.tpPct)}`);
    levelLines.push(`손절 ${won(d.stopPrice)}${pct(lv.slPct)}`);
    if (lv.rrr != null) levelLines.push(`RRR ${lv.rrr.toFixed(2)}`);
  }
  levelLines.push(`박스 ${won(lv.boxLow)}~${won(lv.boxHigh)}`);
  levelLines.push(`시그널 ${s.action} ${s.score.toFixed(0)}/100`);

  const text = `${head}\n${C.action[d.action]} · ${d.rationale}`;
  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `${head}\n${verdict}` } },
    { type: "section", text: { type: "mrkdwn", text: d.rationale || C.none } },
    { type: "section", text: { type: "mrkdwn", text: levelLines.join(" · ") } },
  ];
  if (read.warning) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `⚠️ ${read.warning}` }] });
  }
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `⚠️ ${C.disclaimer}` }] });

  return { text, blocks };
}

export type PostSlackResult =
  | { ok: true }
  | { ok: false; reason: "no-webhook" | "post-failed"; status?: number };

/** IntradayReadResponse 를 INTRADAY_SLACK_WEBHOOK_URL 로 푸시. 미설정/실패는 fail-soft. */
export async function postIntradayReadToSlack(
  read: IntradayReadResponse,
  signal?: AbortSignal,
): Promise<PostSlackResult> {
  const webhook = process.env.INTRADAY_SLACK_WEBHOOK_URL?.trim();
  if (!webhook) return { ok: false, reason: "no-webhook" };

  const payload = formatIntradayReadForSlack(read);
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    return res.ok ? { ok: true } : { ok: false, reason: "post-failed", status: res.status };
  } catch {
    return { ok: false, reason: "post-failed" };
  }
}
