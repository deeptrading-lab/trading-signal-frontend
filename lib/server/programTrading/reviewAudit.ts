import { formatNumber } from "@/lib/utils/formatMoney";
import type { PaperReviewAudit, PaperSessionReview, Trade, TradingLifecycle } from "@/lib/types/programTrading/programTrading";
import { RULES, RULES_VERSION } from "./engine";

export type JournalEvent = {
  id: string;
  at: string;
  kind: "trade" | "session";
  trade?: Trade;
  lifecycle?: TradingLifecycle;
  rulesVersion: string;
  mode: "simulation" | "toss-paper";
};

const LEGACY_NET_VERSION = "program-v5-short-exposure";
const LEGACY_RULES = { fee: .00015, sellTax: .002, stop: .008, target: .01, maxPositions: 1, entryStart: 550, entryEnd: 870, cooldown: 10, slippage: .0005 };

const won = (amount: number) => `${formatNumber(amount, { digits: 0 })}원`;

export function auditPaperSession(review: PaperSessionReview, events: JournalEvent[], codeReference: string): PaperReviewAudit {
  const audit: PaperReviewAudit = { codeReference, verified: [], issues: [], unverified: [], hypotheses: [] };
  const trades = events.flatMap(event => event.trade ? [event.trade] : []);
  const positions = new Map<string, Trade>();
  const lastExit = new Map<string, number>();
  const mismatches: string[] = [];
  let cash = review.lifecycle.beforeBalance;
  let net = 0;
  let buys = 0;
  let sells = 0;
  let peakPositions = 0;

  for (const event of events) {
    const trade = event.trade;
    if (!trade) continue;
    const current = event.rulesVersion === RULES_VERSION;
    const modern = event.rulesVersion === LEGACY_NET_VERSION;
    // Historical sessions must retain their original gross-price policy.
    const rules = current ? { ...LEGACY_RULES, fee: 0, sellTax: 0, entryStart: RULES.candidateStart, entryEnd: RULES.closeMinute }
      : modern ? trade.evidence?.rules ?? LEGACY_RULES : { ...LEGACY_RULES, stop: .01, target: .02, maxPositions: 2, entryEnd: 900 };

    const gross = trade.price * trade.quantity;
    const fee = Math.ceil(gross * (trade.side === "buy" ? rules.fee : rules.fee + rules.sellTax));
    if (fee !== trade.fee) mismatches.push(`${trade.id} 비용 예상 ${won(fee)} · 기록 ${won(trade.fee)}`);

    if (trade.side === "buy") {
      buys++;
      const previousExit = lastExit.get(trade.ticker);
      if (trade.reason !== (current ? "volume-rank" : "breakout") || trade.minute < rules.entryStart || trade.minute >= rules.entryEnd || positions.has(trade.ticker) ||
        (!current && previousExit !== undefined && trade.minute - previousExit < rules.cooldown)) {
        mismatches.push(`${trade.id} 매수 시각·사유·중복 보유·재진입 제한 확인 필요`);
      }
      cash -= gross + fee;
      positions.set(trade.ticker, trade);
      peakPositions = Math.max(peakPositions, positions.size);
      if (cash < 0 || (!current && positions.size > rules.maxPositions)) mismatches.push(`${trade.id} 현금 또는 동시 보유 한도 초과`);
      continue;
    }

    sells++;
    cash += gross - fee;
    const entry = positions.get(trade.ticker);
    if (!entry || entry.quantity !== trade.quantity) {
      mismatches.push(`${trade.id} 매도 수량과 대응 매수 불일치`);
      continue;
    }
    const cost = entry.price * entry.quantity;
    const tradeNet = gross - fee - cost - Math.ceil(cost * rules.fee);
    if (tradeNet !== trade.net) mismatches.push(`${trade.id} 순손익 예상 ${won(tradeNet)} · 기록 ${trade.net ?? "없음"}`);
    const netReturn = tradeNet / (cost + Math.ceil(cost * rules.fee));
    const wrongThreshold = current
      ? (trade.reason === "stop" && trade.price * 100 > entry.price * (100 - RULES.stopPercent))
        || (trade.reason === "target" && trade.price * 100 < entry.price * (100 + RULES.targetPercent))
      : modern
      ? (trade.reason === "stop" && netReturn > -rules.stop) || (trade.reason === "target" && netReturn < rules.target)
      : (trade.reason === "stop" && trade.price > Math.floor(entry.price * (1 - rules.stop) * (1 - rules.slippage)))
        || (trade.reason === "target" && trade.price < Math.floor(entry.price * (1 + rules.target) * (1 - rules.slippage)));
    if (wrongThreshold) mismatches.push(`${trade.id} 기록 체결가와 손절·익절 기준 불일치`);
    net += tradeNet;
    positions.delete(trade.ticker);
    lastExit.set(trade.ticker, trade.minute);
  }

  const { beforeBalance, afterBalance, returnPct } = review.lifecycle;
  const expectedReturn = beforeBalance > 0 ? (cash / beforeBalance - 1) * 100 : NaN;
  if (positions.size || cash !== afterBalance || net !== cash - beforeBalance ||
    [review.balanceChange, review.ledgerNet, review.realized].some(amount => amount !== net) || sells !== review.closedTrades ||
    returnPct === null || !(Math.abs(expectedReturn - returnPct) < 0.000001)) {
    mismatches.push(`원장 재계산 잔액 ${won(cash)} · 순손익 ${won(net)} · 매도 ${sells}건 · 미결 ${positions.size}종목`);
  }
  const currentSession = events.some(event => event.rulesVersion === RULES_VERSION);
  if (mismatches.length) {
    audit.issues.push({ title: `원장 대조 불일치 ${mismatches.length}건`, evidence: mismatches.slice(0, 5).join(" / ") });
  } else {
    audit.verified.push({ title: "비용과 종료 자산 대사 일치", evidence: `매수 ${buys}건과 매도 ${sells}건을 원장 순서로 재계산한 결과, 비용 후 손익 ${won(net)}과 종료 자산 ${won(cash)}이 결과 파일과 일치합니다.` });
    if (buys && !currentSession) audit.verified.push({ title: "원장에서 확인되는 매매 제한 충족", evidence: `매수는 각 원장 버전의 진입 시간 안에서 이뤄졌고, 최대 동시 보유는 ${peakPositions}종목이었습니다. 동일 종목 재진입 간격과 손절·익절 기록 가격도 규칙과 대조했습니다.` });
  }

  if (currentSession) {
    const evidenceCount = trades.filter(trade => trade.side === "buy" && trade.evidence?.candidate?.rank && trade.evidence.candidate.volume).length;
    if (evidenceCount) audit.verified.push({ title: "매수 후보 순위 기록", evidence: `매수 ${buys}건 중 ${evidenceCount}건에 순위, 거래량, 가상 체결가를 기록했습니다.` });
    const fallback = trades.filter(trade => trade.reason === "last-mark");
    if (fallback.length) audit.unverified.push({ title: "마지막 기록가 가상 정산", evidence: `${fallback.length}건은 종료 시점의 신규 시세를 확인하지 못했습니다.` });
    if (!buys) audit.unverified.push({ title: "체결 없는 세션", evidence: "후보가 없었거나 목록을 사용할 수 없었던 경우 손익 비교가 어렵습니다." });
    return audit;
  }

  const staleEvents = events.filter(event => {
    const time = event.lifecycle?.status === "running" ? event.lifecycle.startedAt : event.lifecycle?.finishedAt;
    return time && Date.parse(event.at) < Date.parse(time);
  });
  if (staleEvents.length) {
    audit.issues.push({ title: "일부 세션 이벤트의 원장 시각이 실제 상태 시각보다 앞섬", evidence: `${staleEvents.length}건에서 trades.jsonl의 at이 lifecycle의 시작·종료 시각보다 앞섭니다. 원장 작성 코드는 마지막 틱의 updatedAt을 사용합니다.` });
  }
  if (!review.lifecycle.stopCause && events.some(event => !["program-v3", "program-v4-volume-positive", LEGACY_NET_VERSION].includes(event.rulesVersion))) audit.issues.push({ title: "자동 마감과 수동 종료 사유가 원장에서 구분되지 않음", evidence: "tossPaper.ts의 자동 마감도 flatten 명령으로 전환됩니다. engine.ts는 종료 처리 중인 매도를 manual로 기록하므로 해당 사유만으로 자동 마감 성공 여부를 확인할 수 없습니다." });

  const forced = trades.filter(trade => trade.reason === "timeout");
  if (forced.length) audit.unverified.push({ title: "종료 기한 후 마지막 기록 가격으로 가상 정산", evidence: `${forced.length}건의 정산가는 당시 실제 청산 가능 가격을 의미하지 않습니다.` });
  const stoppingAt = review.lifecycle.stopRequestedAt ?? events.find(event => event.lifecycle?.status === "stopping")?.at;
  const minutes = (Date.parse(review.lifecycle.finishedAt ?? "") - Date.parse(stoppingAt ?? "")) / 60_000;
  const stopLosses = trades.filter(trade => trade.reason === "stop");
  const recordedExits = trades.filter(trade => trade.side === "sell" && (trade.reason === "manual" || trade.reason === "close" || trade.reason === "timeout"));
  const evidenceCount = trades.filter(trade => trade.side === "buy" && trade.evidence?.quote?.signal && trade.evidence.candidate).length;
  if (evidenceCount) audit.verified.push({ title: "진입 판단 스냅샷 기록", evidence: `매수 ${buys}건 중 ${evidenceCount}건에 완료봉·호가·후보·규칙·관측 시각을 기록했습니다. 공급자 원시 응답을 독립 검증한 것은 아닙니다.` });
  audit.unverified.push(
    { title: "시세 입력과 매수 신호 재현", evidence: evidenceCount === buys && buys > 0 ? "진입 스냅샷은 보존됐지만 공급자 원시 시각과 당시 장 운영 응답의 독립 대조는 미검증입니다." : buys ? "체결 당시의 호가·체결 원시 시각, 분봉, 거래량 배율, 스프레드, 후보 스냅샷이 원장에 없어 진입 조건을 독립적으로 재현할 수 없습니다." : "체결이 0건입니다. 틱별 후보, 시세 조회 결과와 조건 탈락 사유가 없어 매수가 없었던 이유를 구분할 수 없습니다." },
    { title: "장 운영 시간 조회와 마감 청산", evidence: `${recordedExits.length}건의 종료 청산이 기록됐습니다.${minutes > 0 ? ` 원장의 종료 대기 시각에서 확정까지 약 ${minutes.toFixed(1)}분입니다.` : ""} 당시 토스 장 캘린더 응답과 시세 조회 실패 기록이 없어 자동 마감 시점과 청산 대기 원인을 검증할 수 없습니다.` },
  );
  audit.hypotheses.push({
    title: stopLosses.length ? "비용을 반영한 진입 조건의 효과 비교" : "미체결 사유를 기록한 뒤 진입 조건 비교",
    evidence: stopLosses.length
      ? `손절 ${stopLosses.length}건의 비용 후 손익 합계는 ${won(stopLosses.reduce((total, trade) => total + (trade.net ?? 0), 0))}입니다. 스프레드와 돌파 조건을 달리한 설정은 별도 거래일에서 순손익과 거래 수를 함께 비교할 가설입니다.`
      : "체결이 없는 세션만으로 임계값의 효과를 평가하기 어렵습니다. 후보 미선정, 시세 누락, 조건 미충족을 구분한 뒤 여러 거래일에서 비교할 수 있습니다.",
  });
  return audit;
}
