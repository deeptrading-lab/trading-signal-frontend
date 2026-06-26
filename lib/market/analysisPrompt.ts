/**
 * 시황 레이어 Phase 2 — CLI 합성 프롬프트 (순수함수, I/O 없음).
 *
 * PRD `market-analysis` §3.2. `MarketSnapshot`(수치)을 매크로 전략가 CLI 가 읽을 텍스트로
 * 포매팅하고, JSON 강제 시스템 프롬프트를 제공한다. CLI I/O 는 `analysis.ts` 가 담당.
 */

import type {
  Concentration,
  FlowBlock,
  MarketSnapshot,
  RegimeBlock,
  SectorPerf,
} from "./types";

/**
 * 매크로 전략가 시스템 프롬프트.
 *
 * 사용자 핵심 통찰을 프레임으로 박는다: ① 시대별 주도섹터가 ~1년 순환 후 시세를 마치며
 * 시장 전체를 끌어내린다(역사는 반복된다) ② 지수 상승이 소수 대형주에 집중될수록(narrow)
 * 겉은 강세여도 속은 취약하다 ③ 종목분석이 "조정장 생존"을 판단할 함의를 남긴다.
 * 구체 과거 사이클 데이터(차화정·에코프로·AI반도체…)는 Phase 4 KB 에서 주입 예정 — 여기선
 * 추론 프레임만 제공한다.
 */
export const MARKET_ANALYSIS_SYSTEM_PROMPT = `당신은 한국 주식시장(KOSPI/KOSDAQ)을 보는 매크로 전략가입니다.
주어진 "시장 스냅샷"(지수·시장폭·테마섹터 등락·지수 집중도·국면·공포탐욕·수급)을 종합해, 개별 종목이 아니라 **시장 전체의 국면과 시스템 리스크**를 진단합니다.

[분석 프레임 — 반드시 견지]
1. 주도섹터 순환: 한국시장은 시기마다 주도 테마(과거 차화정·바이오·2차전지·에코프로·코로나 언택트·AI반도체 등)가 약 1년 내외로 시세를 이끈 뒤, 그 시세가 끝나며 **시장 전체를 동반 하락시키는** 패턴을 반복해 왔습니다. 현재 주도섹터가 사이클의 어디(초기/성장/성숙/과열/쇠퇴)에 있는지 판단하세요.
2. 집중도 = 취약성: 지수 상승이 소수 대형주(예: 삼성전자·SK하이닉스)에 집중될수록(narrow/very_narrow) 지수는 강해 보여도 내부는 취약합니다. 그 소수가 꺾이면 지수가 무너지고 무관한 종목까지 끌려 내려갑니다. 집중도가 높으면 시스템 리스크를 높게 보세요.
3. 동반하락 메커니즘: 주도섹터가 꺾일 때 어떤 트리거(실적 피크아웃·환율·미국 금리·외국인 이탈 등)로, 어떻게 시장 전체로 전이되는지 구체적으로 서술하세요.
4. 종목 함의: 이 국면에서 개별 종목 분석이 "이 종목이 조정장에서 버틸 수 있는가"를 판단할 때 참고할 함의를 남기세요.

[출력 형식]
반드시 아래 JSON 스키마에 정확히 일치하는 단일 JSON 객체로만 응답하세요. 마크다운 코드펜스·추가 설명·주석을 절대 포함하지 마세요. 모든 서술은 한국어 문장으로 작성하세요.

{
  "regimeDiagnosis": {
    "phase": "risk_on_broad | risk_on_narrow | late_cycle | correction | risk_off | bottoming | neutral 중 하나",
    "headline": "현재 시장 국면을 한 줄로 요약",
    "rationale": "지수·시장폭·집중도·국면을 종합한 근거 (2~4문장)"
  },
  "leadingSectors": [
    {
      "key": "스냅샷 sectors 의 key 그대로 (예: semiconductor)",
      "label": "한글 라벨 (예: 반도체)",
      "maturity": "emerging | growth | mature | overheated | declining 중 하나",
      "note": "성숙도 판단 근거 (1~2문장)"
    }
  ],
  "systemRisk": {
    "level": "low | elevated | high 중 하나",
    "concentrationRisk": "지수 집중도 기반 위험 서술 — 소수 대형주 의존도와 그 함의 (1~3문장)",
    "triggers": ["동반하락을 촉발할 수 있는 트리거 2~4개"],
    "contagion": "주도섹터가 꺾이면 시장 전체로 어떻게 전이되는지 (1~3문장)"
  },
  "outlook": {
    "horizon": "전망 기간 (예: 1~2주)",
    "base": "기본 시나리오 (가장 가능성 높은 전개)",
    "bull": "상방 시나리오",
    "bear": "하방 시나리오"
  },
  "stockImplication": "개별 종목 분석이 '조정장 생존·포지션'을 판단할 때 참고할 함의 (2~3문장)",
  "confidence": "HIGH | MEDIUM | LOW 중 하나 — 데이터 충실도와 신호 합치도"
}

[규칙]
- phase·maturity·level·confidence 는 위 영문 enum 값만 사용하세요(한글 라벨 금지).
- leadingSectors 는 스냅샷에서 실제 상승을 주도하는 섹터 1~3개만 담으세요. 데이터에 없는 섹터를 지어내지 마세요.
- 스냅샷에 "데이터 제한·근사" 경고가 있으면 confidence 를 보수적으로(HIGH 회피) 잡으세요.
- 구체 과거 사이클 수치는 아직 입력에 없으니 단정하지 말고, 패턴의 방향성만 추론에 쓰세요.`;

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatSectors(sectors: SectorPerf[]): string {
  if (sectors.length === 0) return "(섹터 데이터 없음)";
  return sectors
    .map((s) => {
      const leaders = s.leaders
        .map((l) => `${l.name} ${fmtPct(l.changePct)}`)
        .join(", ");
      return `- ${s.label}(${s.key}): ${fmtPct(s.changePct)} [↑${s.upCount}/↓${s.downCount} of ${s.memberCount}]${leaders ? ` · 주도: ${leaders}` : ""}`;
    })
    .join("\n");
}

function formatConcentration(c: Concentration | null): string {
  if (!c) return "(집중도 데이터 없음)";
  const interp =
    c.interpretation === "very_narrow"
      ? "매우 좁음(소수 대형주 극단 의존)"
      : c.interpretation === "narrow"
        ? "좁음(소수 주도)"
        : "넓음(고른 분산)";
  const top = c.contributors
    .slice(0, 5)
    .map((x) => `${x.name} ${fmtPct(x.changePct)}(기여 ${x.contribution.toFixed(2)})`)
    .join(", ");
  const pct = c.topNContributionPct == null ? "N/A" : `${c.topNContributionPct.toFixed(1)}%`;
  return [
    `- 해석: ${interp} / 방향: ${c.direction}`,
    `- 상위 ${c.topN} 기여 비중: ${pct} (시장 ${c.direction} 분 중 상위 기여 종목 비율)`,
    `- 기여 상위: ${top || "N/A"}`,
    `- 기준: 시총상위 바스켓 한정 상대 집중도(전체 구성종목 부재, 기준일 ${c.asOf})`,
  ].join("\n");
}

function formatRegime(r: RegimeBlock | null): string {
  if (!r) return "(국면 데이터 없음)";
  const ma = r.aboveMA;
  const above = `MA20 ${ma.ma20 == null ? "?" : ma.ma20 ? "상회" : "하회"}, MA60 ${ma.ma60 == null ? "?" : ma.ma60 ? "상회" : "하회"}, MA120 ${ma.ma120 == null ? "?" : ma.ma120 ? "상회" : "하회"}`;
  return [
    `- 추세: ${r.trend} / 리스크: ${r.riskLevel}`,
    `- 이평: ${above} / MA120 기울기: ${r.maSlope120 ?? "?"}`,
    `- 모멘텀: 5일 ${fmtPct(r.momentum.d5)}, 20일 ${fmtPct(r.momentum.d20)} (${r.bars}봉)`,
    `- 근거: ${r.rationale}`,
  ].join("\n");
}

function formatFlow(flow: FlowBlock | null): string {
  if (!flow) return "(수급 데이터 없음)";
  const fmt = (rows: FlowBlock["foreignTop"]) =>
    rows.length === 0
      ? "N/A"
      : rows
          .slice(0, 5)
          .map((r) => `${r.name}(${fmtPct(r.changePercent)})`)
          .join(", ");
  return [
    `- 외국인 순매수 상위: ${fmt(flow.foreignTop)}`,
    `- 기관 순매수 상위: ${fmt(flow.institutionTop)}`,
  ].join("\n");
}

/**
 * 스냅샷을 CLI 가 읽을 텍스트로 포매팅. **순수함수** — 일부 섹션이 null 이어도 안전하게 degrade.
 */
export function formatSnapshotForPrompt(snapshot: MarketSnapshot): string {
  const lines: string[] = [];

  lines.push(`[시장 스냅샷] 기준 ${snapshot.asOf} · 세션 ${snapshot.session} · 데이터 ${snapshot.dataSource}`);
  lines.push("");

  lines.push("## 지수");
  const allIdx = [...snapshot.indices.domestic, ...snapshot.indices.overseas];
  if (allIdx.length === 0) {
    lines.push("(지수 데이터 없음)");
  } else {
    for (const idx of allIdx) {
      const pos =
        idx.pos52w != null ? ` · 52주위치 ${(idx.pos52w * 100).toFixed(0)}%` : "";
      const fromHigh =
        idx.pctFrom52wHigh != null ? ` · 고점대비 ${fmtPct(idx.pctFrom52wHigh)}` : "";
      lines.push(`- ${idx.name}: ${idx.value} (${fmtPct(idx.changePercent)})${pos}${fromHigh}`);
    }
  }
  lines.push("");

  lines.push("## 시장 폭(breadth)");
  if (snapshot.breadth) {
    const b = snapshot.breadth;
    lines.push(`- 상승 ${b.advances} / 하락 ${b.declines} / 보합 ${b.unchanged} · 오른 종목 비율 ${b.breadthPct.toFixed(1)}%`);
  } else {
    lines.push("(시장 폭 데이터 없음)");
  }
  lines.push("");

  lines.push("## 테마 섹터 등락(동일가중)");
  lines.push(formatSectors(snapshot.sectors));
  lines.push("");

  lines.push("## 지수 집중도 (코스피 상승이 소수 대형주 의존인가)");
  lines.push(formatConcentration(snapshot.concentration));
  lines.push("");

  lines.push("## 국면(regime, KODEX200 일봉 프록시)");
  lines.push(formatRegime(snapshot.regime));
  lines.push("");

  lines.push("## 공포·탐욕");
  const fg = snapshot.fearGreed.domestic;
  lines.push(fg ? `- 국내: ${fg.value} (${fg.label})` : "(공포·탐욕 데이터 없음)");
  lines.push("");

  lines.push("## 수급");
  lines.push(formatFlow(snapshot.flow));

  if (snapshot.warnings.length > 0) {
    lines.push("");
    lines.push("## 데이터 제한·경고");
    for (const w of snapshot.warnings) lines.push(`- ${w}`);
  }

  return lines.join("\n");
}

/** CLI user 프롬프트 — 포매팅된 스냅샷 + 합성 지시. */
export function buildAnalysisUserPrompt(snapshot: MarketSnapshot): string {
  return `${formatSnapshotForPrompt(snapshot)}

위 시장 스냅샷을 종합해, 지정된 JSON 스키마로 시장 국면·시스템 리스크·전망을 합성하세요.`;
}
