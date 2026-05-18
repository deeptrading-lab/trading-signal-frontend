"use client";

import { useEffect, useState } from "react";

type WhitelistEntry = {
  ticker: string;
  name: string;
  asset_type: string;
  risk_tier: string;
  aliases: string[];
};

type HorizonSummary = {
  label: string;
  return_pct: number;
  direction: string;
  max_drawdown_pct: number;
};

type Analysis = {
  whitelist_entry: WhitelistEntry;
  action: string;
  feasibility: string;
  annualized_target_return_pct: number;
  risk_plan: {
    suggested_buy_amount: number;
    suggested_share_qty: number;
    entry_price: number;
    take_profit_price_for_day: number;
    stop_loss_price_for_day: number;
    expected_loss_if_stopped: number;
    expected_gain_if_take_profit: number;
    risk_reward_ratio: number | null;
  };
  brief: {
    action: string;
    confidence: string;
    score: number;
    reference_price: number;
    data_quality: { source: string };
    reasons: string[];
    risks: string[];
  };
  horizons: HorizonSummary[];
  warnings: string[];
};

type Currency = "KRW" | "USD";

const USD_KRW = 1350;

const labels: Record<string, string> = {
  ACTIONABLE_BUY: "매수 검토 가능",
  CONDITIONAL_BUY: "조건부 매수",
  HOLD: "관망",
  PARTIAL_SELL: "일부 매도",
  SELL: "매도 검토",
  AVOID: "진입 회피",
  ACTIONABLE_LONG: "매수 검토 가능",
  CONDITIONAL_LONG: "조건부 매수",
  HOLD_MONITOR: "관망",
  REDUCE_RISK: "리스크 축소",
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  REALISTIC: "현실적",
  STRETCHED: "공격적",
  UNREALISTIC: "현실성 낮음",
  BULLISH: "상승 우위",
  NEUTRAL: "중립",
  BEARISH: "하락 우위",
};

const actionCopy: Record<string, string> = {
  ACTIONABLE_BUY: "지금 분할 매수를 검토할 수 있습니다.",
  CONDITIONAL_BUY: "추가 조건을 확인한 뒤 매수를 검토하세요.",
  HOLD: "새로 진입하기보다 관망이 우선입니다.",
  PARTIAL_SELL: "보유 중이라면 일부 익절 또는 비중 축소를 검토하세요.",
  SELL: "보유 중이라면 매도 검토가 필요한 구간입니다.",
  AVOID: "현재 조건에서는 신규 진입을 피하는 편이 낫습니다.",
};

const ko = (value: string) => labels[value] ?? value;
const pct = (value: number) => `${value.toFixed(2)}%`;
export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [capitalKrw, setCapitalKrw] = useState(10_000_000);
  const [targetReturn, setTargetReturn] = useState(8);
  const [targetDays, setTargetDays] = useState(90);
  const [maxLoss, setMaxLoss] = useState(2);
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [suggestions, setSuggestions] = useState<WhitelistEntry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState("분석 대기");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/whitelist/search?q=${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => setSuggestions(payload.results ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [ticker]);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setStatus("분석 중");
    setDetailsOpen(false);
    try {
      const response = await fetch("/api/workbench/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          capital_amount: capitalKrw / USD_KRW,
          target_return_pct: targetReturn,
          target_period_days: targetDays,
          max_loss_pct: maxLoss,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? payload.message ?? "분석에 실패했습니다");
      }
      setAnalysis(payload.analysis);
      setStatus("분석 완료");
      setSavedAt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석에 실패했습니다");
      setStatus("분석 실패");
    } finally {
      setLoading(false);
    }
  }

  function savePlan() {
    if (!analysis) return;
    const saved = new Date().toISOString();
    localStorage.setItem(
      "trading-signal-engine:last-plan",
      JSON.stringify({
        saved_at: saved,
        input: {
          ticker,
          capital_krw: capitalKrw,
          target_return_pct: targetReturn,
          target_period_days: targetDays,
          max_loss_pct: maxLoss,
        },
        analysis,
      }),
    );
    setSavedAt(saved);
    setStatus("계획 저장 완료");
  }

  return (
    <main className="mobileShell">
      <header className="appHeader">
        <div>
          <span>AI 투자 판단</span>
          <h1>TradingSignalEngine</h1>
        </div>
        <CurrencyToggle currency={currency} setCurrency={setCurrency} />
      </header>

      <section className="inputCard">
        <div className="sectionHead">
          <div>
            <p>분석 조건</p>
            <h2>무엇을 살지 입력하세요</h2>
          </div>
          <span className="statusPill">{status}</span>
        </div>

        <label htmlFor="ticker">종목</label>
        <input id="ticker" value={ticker} onChange={(event) => setTicker(event.target.value)} />

        <div className="suggestions">
          {suggestions.map((item) => (
            <button
              className="tickerButton"
              key={item.ticker}
              type="button"
              onClick={() => setTicker(item.ticker === "BTC-USD" ? "BTC" : item.ticker)}
            >
              <strong>{item.ticker}</strong>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <label htmlFor="capital">투입 자본금</label>
        <div className="moneyInput">
          <span>₩</span>
          <input
            id="capital"
            min={1}
            inputMode="numeric"
            type="number"
            value={capitalKrw}
            onChange={(event) => setCapitalKrw(Number(event.target.value))}
          />
        </div>
        <p className="fieldHint">한화 기준입니다. 엔진에는 약 ${Math.round(capitalKrw / USD_KRW).toLocaleString()}로 환산됩니다.</p>
        <QuickChips
          items={[
            ["100만", 1_000_000],
            ["300만", 3_000_000],
            ["500만", 5_000_000],
            ["1,000만", 10_000_000],
          ]}
          onPick={setCapitalKrw}
        />

        <div className="compactGrid">
          <div>
            <label htmlFor="targetReturn">목표 수익률</label>
            <input
              id="targetReturn"
              min={0}
              step={0.1}
              type="number"
              value={targetReturn}
              onChange={(event) => setTargetReturn(Number(event.target.value))}
            />
            <span className="unitText">%</span>
          </div>
          <div>
            <label htmlFor="maxLoss">최대 손실</label>
            <input
              id="maxLoss"
              max={5}
              min={0.25}
              step={0.25}
              type="number"
              value={maxLoss}
              onChange={(event) => setMaxLoss(Number(event.target.value))}
            />
            <span className="unitText">%</span>
          </div>
        </div>

        <label htmlFor="targetDays">목표 기간</label>
        <input
          id="targetDays"
          min={1}
          type="number"
          value={targetDays}
          onChange={(event) => setTargetDays(Number(event.target.value))}
        />
        <p className="fieldHint">일 단위입니다. 예: 30은 30일, 90은 90일입니다.</p>
        <QuickChips
          items={[
            ["1개월", 30],
            ["3개월", 90],
            ["6개월", 180],
            ["1년", 365],
          ]}
          onPick={setTargetDays}
        />

        <button className="primaryCta" disabled={loading} onClick={runAnalysis}>
          {loading ? "분석 중" : "분석하기"}
        </button>
        {error ? <div className="error">{error}</div> : null}
      </section>

      {analysis ? (
        <ResultCard
          analysis={analysis}
          currency={currency}
          savedAt={savedAt}
          onAnalyze={runAnalysis}
          onOpenDetails={() => setDetailsOpen(true)}
          onSave={savePlan}
        />
      ) : (
        <EmptyState />
      )}

      {detailsOpen && analysis ? (
        <DetailSheet analysis={analysis} currency={currency} onClose={() => setDetailsOpen(false)} />
      ) : null}
    </main>
  );
}

function ResultCard({
  analysis,
  currency,
  savedAt,
  onAnalyze,
  onOpenDetails,
  onSave,
}: {
  analysis: Analysis;
  currency: Currency;
  savedAt: string;
  onAnalyze: () => void;
  onOpenDetails: () => void;
  onSave: () => void;
}) {
  const risk = analysis.risk_plan;
  const riskItems = buildRiskItems(analysis);
  return (
    <section className={`resultCard ${tone(analysis.action)}`}>
      <div className="resultTop">
        <div>
          <p>{analysis.whitelist_entry.name}</p>
          <h2>{analysis.whitelist_entry.ticker}</h2>
        </div>
        <div className="currentPrice">
          <span>현재가</span>
          <strong>{formatPrice(analysis.brief.reference_price, currency)}</strong>
        </div>
      </div>

      <div className="decisionHero">
        <span className="decisionLabel">최종 판단</span>
        <strong>{ko(analysis.action)}</strong>
        <p>{actionCopy[analysis.action] ?? "추가 확인이 필요합니다."}</p>
      </div>

      <div className="keyNumbers">
        <Metric label="권장 투자금" value={formatAmount(risk.suggested_buy_amount, currency)} caption={`${risk.suggested_share_qty.toPrecision(6)}주`} primary />
        <Metric label="익절" value={formatPrice(risk.take_profit_price_for_day, currency)} caption={`+${formatAmount(risk.expected_gain_if_take_profit, currency)}`} positive />
        <Metric label="손절" value={formatPrice(risk.stop_loss_price_for_day, currency)} caption={`-${formatAmount(risk.expected_loss_if_stopped, currency)}`} negative />
        <Metric label="손익비" value={`1 : ${risk.risk_reward_ratio?.toFixed(2) ?? "N/A"}`} caption={`확신도 ${ko(analysis.brief.confidence)}`} />
      </div>

      <MiniRiskReward analysis={analysis} />

      <div className="riskAlert">
        <div>
          <strong>먼저 확인할 리스크</strong>
          <span>{riskItems[0] ?? "현재 확인된 주요 경고는 제한적입니다."}</span>
        </div>
        <b>{riskItems.length}개</b>
      </div>

      <div className="resultActions">
        <button type="button" onClick={onSave}>매수 계획 저장</button>
        <button type="button" onClick={onOpenDetails}>상세 분석 보기</button>
      </div>
      <button className="ghostAction" type="button" onClick={onAnalyze}>다시 분석</button>

      {savedAt ? (
        <p className="savedNotice">{new Date(savedAt).toLocaleString("ko-KR")} 기준 계획을 저장했습니다.</p>
      ) : null}
    </section>
  );
}

function DetailSheet({ analysis, currency, onClose }: { analysis: Analysis; currency: Currency; onClose: () => void }) {
  const risk = analysis.risk_plan;
  const riskItems = buildRiskItems(analysis);
  return (
    <div className="sheetOverlay" role="dialog" aria-modal="true">
      <button className="sheetBackdrop" type="button" aria-label="상세 분석 닫기" onClick={onClose} />
      <section className="detailSheet">
        <div className="sheetHandle" />
        <div className="sheetHeader">
          <div>
            <p>상세 분석</p>
            <h2>{analysis.whitelist_entry.ticker} 판단 근거</h2>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </div>

        <details open className="detailGroup">
          <summary>투자 시뮬레이션</summary>
          <div className="sheetMetrics">
            <Metric label="투자 기준" value={formatAmount(risk.suggested_buy_amount, currency)} caption="권장 매수 금액" />
            <Metric label="목표 수익" value={`+${formatAmount(risk.expected_gain_if_take_profit, currency)}`} caption="익절 시 예상" positive />
            <Metric label="최대 손실" value={`-${formatAmount(risk.expected_loss_if_stopped, currency)}`} caption="손절 시 예상" negative />
          </div>
        </details>

        <details open className="detailGroup">
          <summary>가격 구간</summary>
          <PriceLevels analysis={analysis} currency={currency} />
        </details>

        <details className="detailGroup">
          <summary>AI 핵심 근거</summary>
          <ul className="reasonList">
            {analysis.brief.reasons.slice(0, 5).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>

        <details className="detailGroup">
          <summary>리스크</summary>
          <div className="riskChips">
            {riskItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </details>

        <details className="detailGroup">
          <summary>기간별 흐름</summary>
          <div className="horizonList">
            {analysis.horizons.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <span>{pct(item.return_pct)}</span>
                <small>{ko(item.direction)} · 최대 낙폭 {pct(item.max_drawdown_pct)}</small>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

function MiniRiskReward({ analysis }: { analysis: Analysis }) {
  const risk = analysis.risk_plan;
  const upPct = ((risk.take_profit_price_for_day / analysis.brief.reference_price) - 1) * 100;
  const downPct = Math.abs(((risk.stop_loss_price_for_day / analysis.brief.reference_price) - 1) * 100);
  const total = Math.max(1, upPct + downPct);
  return (
    <div className="miniChart" aria-label="손익비 요약">
      <div className="miniLabels">
        <span className="gain">수익 +{upPct.toFixed(1)}%</span>
        <strong>현재가 기준</strong>
        <span className="loss">위험 -{downPct.toFixed(1)}%</span>
      </div>
      <div className="rewardBar">
        <span className="gainBar" style={{ width: `${(upPct / total) * 100}%` }} />
        <span className="lossBar" style={{ width: `${(downPct / total) * 100}%` }} />
      </div>
    </div>
  );
}

function PriceLevels({ analysis, currency }: { analysis: Analysis; currency: Currency }) {
  const risk = analysis.risk_plan;
  const levels = [
    { label: "익절", value: risk.take_profit_price_for_day, className: "gain" },
    { label: "현재가", value: analysis.brief.reference_price, className: "current" },
    { label: "손절", value: risk.stop_loss_price_for_day, className: "loss" },
  ];
  return (
    <div className="priceLevels">
      {levels.map((item) => (
        <div className={item.className} key={item.label}>
          <span>{item.label}</span>
          <strong>{formatPrice(item.value, currency)}</strong>
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  caption,
  primary = false,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  caption: string;
  primary?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`metric ${primary ? "primaryMetric" : ""} ${positive ? "positiveMetric" : ""} ${negative ? "negativeMetric" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="emptyState">
      <strong>분석하면 결론만 먼저 보여드립니다.</strong>
      <span>조건부 매수, 권장 투자금, 익절, 손절, 손익비를 한 화면에서 확인합니다.</span>
    </section>
  );
}

function QuickChips({ items, onPick }: { items: [string, number][]; onPick: (value: number) => void }) {
  return (
    <div className="quickChips">
      {items.map(([label, value]) => (
        <button key={label} type="button" onClick={() => onPick(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CurrencyToggle({
  currency,
  setCurrency,
}: {
  currency: Currency;
  setCurrency: (value: Currency) => void;
}) {
  return (
    <div className="currencyToggle">
      {(["KRW", "USD"] as Currency[]).map((item) => (
        <button
          className={currency === item ? "active" : ""}
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function buildRiskItems(analysis: Analysis) {
  const items = [
    ...analysis.brief.risks,
    ...analysis.warnings,
    analysis.feasibility === "UNREALISTIC" ? "목표 수익률이 현재 변동성 대비 공격적입니다." : "",
    analysis.brief.confidence === "LOW" ? "AI 확신도가 낮아 보수적인 판단이 필요합니다." : "",
  ].filter(Boolean);
  return Array.from(new Set(items)).slice(0, 4);
}

function tone(value: string) {
  if (["AVOID", "SELL", "REDUCE_RISK"].includes(value)) return "dangerTone";
  if (["HOLD", "PARTIAL_SELL", "HOLD_MONITOR", "CONDITIONAL_BUY", "CONDITIONAL_LONG"].includes(value)) return "warnTone";
  return "positiveTone";
}

function formatAmount(value: number, currency: Currency) {
  const converted = currency === "KRW" ? value * USD_KRW : value;
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(converted);
}

function formatPrice(value: number, currency: Currency) {
  return formatAmount(value, currency);
}
