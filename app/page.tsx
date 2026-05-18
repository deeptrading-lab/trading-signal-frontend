"use client";

import { FormEvent, useMemo, useState } from "react";

type Brief = {
  action: string;
  confidence: string;
  score: number;
  reference_price: number;
  timeframe: string;
  allocation_condition: string;
  risk_off_condition: string;
  upside_reference_pct: number | null;
  downside_reference_pct: number | null;
  risk_range_ratio: number | null;
  reasons: string[];
  risks: string[];
  generated_at: string;
  disclaimer: string;
  data_quality: {
    source: string;
    news: string;
    market_flows: string;
  };
  news_snapshot: {
    summary_ko: string;
    sentiment: string;
    source_count: number;
    sources: string[];
    input_tokens: number | null;
    output_tokens: number | null;
    estimated_cost_usd: number | null;
    error: string | null;
  } | null;
  market_flow_snapshot: {
    source: string;
    symbol: string;
    price_change_pct_24h: number;
    quote_volume_24h: number;
    taker_buy_quote_volume_24h: number | null;
    taker_buy_ratio_24h: number | null;
    volume_vs_7d_avg: number | null;
    summary_ko: string;
    error: string | null;
  } | null;
  sizing: {
    sizing_basis: string;
    available_seed_pct: number | null;
    btc_holdings_sell_pct: number | null;
    cash_amount: number | null;
    cash_currency: string | null;
    btc_holding_amount: number | null;
    estimated_order_cash_amount: number | null;
    estimated_order_cash_currency: string | null;
    estimated_order_btc_amount: number | null;
    sizing_label_ko: string;
    sizing_detail_ko: string;
  };
};

type ApiResponse = {
  brief: Brief;
  llm: null;
};

type DataProvider = "openai" | "claude";

const API_URL = "http://127.0.0.1:8765/api/bitcoin/brief";

const actionLabels: Record<string, string> = {
  INCREASE_ALLOCATION: "매수 비중 확대",
  CONDITIONAL_INCREASE: "조건부 매수",
  MAINTAIN_ALLOCATION: "현재 비중 유지",
  REDUCE_ALLOCATION: "일부 매도",
  RISK_OFF: "방어 모드",
};

const confidenceLabels: Record<string, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

const termHelp = [
  ["시드", "지금 새로 투자에 쓸 수 있는 현금입니다."],
  ["리스크오프", "손실을 줄이기 위해 새 매수를 멈추거나 일부 매도하는 방어 상태입니다."],
  ["200일선", "최근 200일 평균 가격입니다. 큰 추세를 판단할 때 봅니다."],
  ["RSI", "최근 가격이 너무 빠르게 올랐거나 내렸는지 보는 지표입니다."],
];

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="scoreRing" aria-label={`엔진 점수 ${score}점`}>
      <span>{score}</span>
      <small>/100</small>
    </div>
  );
}

function money(value: number | null, currency: string | null) {
  if (value === null) return "-";
  if (currency === "USD") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.round(value).toLocaleString()}원`;
}

function pct(value: number | null) {
  return value === null ? "-" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function actionAmountText(brief: Brief | null) {
  if (!brief) return "분석 결과가 나오면 입력값 기준 금액 또는 BTC 수량을 표시합니다.";
  if (brief.sizing.sizing_basis === "AVAILABLE_SEED" && brief.sizing.estimated_order_cash_amount) {
    return `이번 매수 검토 금액은 ${money(
      brief.sizing.estimated_order_cash_amount,
      brief.sizing.cash_currency,
    )}입니다.`;
  }
  if (brief.sizing.sizing_basis === "BTC_HOLDINGS" && brief.sizing.estimated_order_btc_amount) {
    return `이번 매도 검토 수량은 약 ${brief.sizing.estimated_order_btc_amount} BTC입니다.`;
  }
  return "현금 또는 BTC 보유량을 입력하면 구체적인 금액/수량을 함께 계산합니다.";
}

export default function Home() {
  const [cashAmount, setCashAmount] = useState("1000000");
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [btcHolding, setBtcHolding] = useState("0.02");
  const [dataProvider, setDataProvider] = useState<DataProvider>("openai");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionText = brief ? actionLabels[brief.action] ?? brief.action : "분석 전";
  const confidenceText = brief ? confidenceLabels[brief.confidence] ?? brief.confidence : "-";
  const oneLine = useMemo(() => {
    if (!brief) return "현금과 BTC 보유량을 입력하면 엔진이 구체적인 매수/매도 크기를 계산합니다.";
    return `${brief.sizing.sizing_label_ko}. ${brief.sizing.sizing_detail_ko}`;
  }, [brief]);

  async function loadBrief(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (dataProvider === "claude") {
        setBrief(null);
        throw new Error("Claude 데이터 수집은 아직 준비 중입니다. 현재는 OpenAI 방식만 연결되어 있습니다.");
      }
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "BTC",
          timeframe: "SWING",
          offline: false,
          cash_amount: cashAmount === "" ? null : Number(cashAmount),
          cash_currency: cashCurrency,
          btc_holding_amount: btcHolding === "" ? null : Number(btcHolding),
          llm_provider: "none",
          data_provider: dataProvider,
        }),
      });
      const payload = (await response.json()) as ApiResponse | { error?: string };
      if (!response.ok) {
        const message = "error" in payload ? payload.error : null;
        throw new Error(message || "분석 요청에 실패했습니다.");
      }
      setBrief((payload as ApiResponse).brief);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mobileShell">
      <header className="topBar">
        <div>
          <p>BTC 배분 판단</p>
          <h1>엔진 종합의견</h1>
        </div>
        <span>{brief ? new Date(brief.generated_at).toLocaleString("ko-KR") : "로딩 중"}</span>
      </header>

      <form className="inputPanel" onSubmit={loadBrief}>
        <label>
          <span>사용 가능 현금</span>
          <input
            inputMode="decimal"
            min="0"
            type="number"
            value={cashAmount}
            onChange={(event) => setCashAmount(event.target.value)}
          />
        </label>
        <label>
          <span>통화</span>
          <select value={cashCurrency} onChange={(event) => setCashCurrency(event.target.value)}>
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          <span>보유 BTC</span>
          <input
            inputMode="decimal"
            min="0"
            step="0.00000001"
            type="number"
            value={btcHolding}
            onChange={(event) => setBtcHolding(event.target.value)}
          />
        </label>
        <fieldset className="providerToggle">
          <legend>데이터 수집 방식</legend>
          <button
            aria-pressed={dataProvider === "openai"}
            onClick={() => setDataProvider("openai")}
            type="button"
          >
            OpenAI
          </button>
          <button
            aria-pressed={dataProvider === "claude"}
            onClick={() => setDataProvider("claude")}
            type="button"
          >
            Claude
          </button>
        </fieldset>
        <button disabled={loading} type="submit">
          {loading ? "분석 중" : "다시 분석"}
        </button>
      </form>

      {error ? <p className="errorBox">{error}</p> : null}

      <section className="heroDecision">
        <div className="decisionLabel">현재 의견</div>
        <h2>{actionText}</h2>
        <p>{oneLine}</p>
        <div className="heroMeta">
          <ScoreRing score={brief?.score ?? 0} />
          <div>
            <span>확신도</span>
            <strong>{confidenceText}</strong>
            <small>
              {brief ? `$${brief.reference_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"} 기준 · 며칠~몇 주 관점
            </small>
          </div>
        </div>
      </section>

      <section className="plainCards">
        <article>
          <span>구체적 액션</span>
          <strong>{brief?.sizing.sizing_label_ko ?? "분석 결과 대기 중"}</strong>
          <p>{brief?.sizing.sizing_detail_ko ?? "입력값 기준으로 계산합니다."}</p>
        </article>
        <article>
          <span>다시 볼 조건</span>
          <strong>{brief?.allocation_condition ?? "엔진 분석 후 표시됩니다."}</strong>
        </article>
      </section>

      <section className="dataPanel">
        <h2>실시간 데이터</h2>
        <article>
          <span>뉴스</span>
          <strong>{brief?.data_quality.news ?? "대기 중"}</strong>
          <p>
            {brief?.news_snapshot?.summary_ko ??
              "분석 버튼을 누르면 선택한 방식으로 Bitcoin 뉴스 데이터를 가져옵니다. Claude 방식은 아직 준비 중입니다."}
          </p>
        </article>
        <article>
          <span>Binance 매매 동향</span>
          <strong>{brief?.data_quality.market_flows ?? "대기 중"}</strong>
          <p>{brief?.market_flow_snapshot?.summary_ko ?? "Binance 공개 API로 24시간 거래량과 매수 체결 비중을 확인합니다."}</p>
        </article>
      </section>

      <section className="riskSummary">
        <h2>예상 손익 범위</h2>
        <div className="rangeGrid">
          <div>
            <span>하락 가능성</span>
            <strong>{pct(brief?.downside_reference_pct ?? null)}</strong>
          </div>
          <div>
            <span>상승 가능성</span>
            <strong>{pct(brief?.upside_reference_pct ?? null)}</strong>
          </div>
          <div>
            <span>손익 비율</span>
            <strong>{brief?.risk_range_ratio ? `약 1 대 ${brief.risk_range_ratio}` : "-"}</strong>
          </div>
        </div>
        <p>{actionAmountText(brief)}</p>
      </section>

      <section className="accordionGroup" aria-label="판단 근거와 리스크">
        <details open>
          <summary>왜 이런 의견이 나왔나요?</summary>
          <div className="detailBody">
            {(brief?.reasons ?? []).map((reason) => (
              <article key={reason} className="reasonItem">
                <p>{reason}</p>
              </article>
            ))}
          </div>
        </details>

        <details>
          <summary>조심해야 할 점</summary>
          <div className="detailBody">
            <ul>
              {(brief?.risks ?? []).map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
        </details>

        <details>
          <summary>용어 설명</summary>
          <div className="termList">
            {termHelp.map(([term, text]) => (
              <article key={term}>
                <strong>{term}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="riskStop">
        <span>리스크 기준</span>
        <strong>{brief?.risk_off_condition ?? "분석 후 표시됩니다."}</strong>
      </section>

      <footer className="mobileFooter">
        <span>데이터: {brief?.data_quality.source ?? "엔진 대기 중"}</span>
        <span>투자 판단 보조 자료입니다. 자동 주문이나 수익 보장을 의미하지 않습니다.</span>
      </footer>
    </main>
  );
}
