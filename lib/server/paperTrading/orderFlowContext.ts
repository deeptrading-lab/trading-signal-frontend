/**
 * 수급 선행(order flow) 컨텍스트 (intraday-decision-overhaul I3) — 체결강도·호가 잔량 불균형을
 * judge 에 '확인/거부권' 필터로 주입한다.
 *
 * ★알파 아님(웹리서치: 호가/체결강도 예측지평 5~30초·비용 미달·우리 5분틱과 지평 불일치).
 * → 가격 후행 4축·일봉이 못 잡는 실시간 수급을, "돌파인데 체결강도 매도 우위=흡수/가짜돌파면
 * 매수 보류" 같은 **거부권(veto)** 용도로만 쓴다(I2 프레임). 라이브 스냅샷이라 장중에만 유의.
 *
 * fail-soft: 토스 미설정·미지원 종목·빈 호가·타임아웃 → 빈 문자열(무주입 = 프롬프트 무변경).
 * LLM 호출 경로에서만 조회(warnings 와 동일 — preGate 스킵 틱은 미조회, 낭비 방지).
 */
import { fetchOrderbook } from "@/lib/api/toss/orderbook";
import { fetchTrades } from "@/lib/api/toss/trades";
import { deriveTradeStrength } from "@/lib/api/toss/tradeStrength";

const TIMEOUT_MS = 3_000;

async function compute(ticker: string): Promise<string> {
  const [ob, trades] = await Promise.all([
    fetchOrderbook(ticker).catch(() => null),
    fetchTrades(ticker).catch(() => []),
  ]);
  const parts: string[] = [];

  // 체결강도(틱룰 근사) — buy/(buy+sell). ≥55 매수 우위 / ≤45 매도 우위.
  const ts = deriveTradeStrength(trades ?? []);
  if (ts.strength != null) {
    const p = Math.round(ts.strength * 100);
    parts.push(`체결강도 ${p}(${p >= 55 ? "매수 우위" : p <= 45 ? "매도 우위" : "균형"})`);
  }

  // 호가 잔량 불균형 — 매수잔량 비중. ≥55 매수잔량 우위 / ≤45 매도잔량 우위.
  if (ob && ob.totalBidQty + ob.totalAskQty > 0) {
    const bid = Math.round((ob.totalBidQty / (ob.totalBidQty + ob.totalAskQty)) * 100);
    parts.push(`호가 매수잔량 ${bid}%(${bid >= 55 ? "매수잔량 우위" : bid <= 45 ? "매도잔량 우위" : "균형"})`);
  }

  if (parts.length === 0) return "";
  return `[수급 선행] ${parts.join(" · ")}  ※실시간 수급(가격 후행 아님) — 진입 확인/거부권용, 초단위 노이즈라 단독 신호 X`;
}

/** 수급 선행 텍스트(체결강도·호가) — 바운드·never-throw. 실패/미설정/빈값이면 빈 문자열. */
export async function buildOrderFlowText(ticker: string): Promise<string> {
  try {
    return await Promise.race([
      compute(ticker),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), TIMEOUT_MS)),
    ]);
  } catch {
    return "";
  }
}
