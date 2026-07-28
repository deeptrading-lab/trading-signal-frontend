import type { DailyMistakeSource, MemoryRule } from "./types";

function esc(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderReview(source: DailyMistakeSource, rules: MemoryRule[]): string {
  const pct = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);
  return `# AI 단타 오답노트 — ${source.date}

> 상태: **${source.status}** · 실제 체결/반사실 라벨/스크리너는 분리 해석 · 일 1~2%는 관찰 구간(보장 아님)

## 키워드 요약

- 실제: \`round-trip ${source.actual.closedTrades}\` · \`W/L ${source.actual.wins}/${source.actual.losses}\` · \`net ${source.actual.netPnlKrw.toLocaleString("ko-KR")}원\` · \`run ${source.actual.portfolioReturnPct ?? "—"}%\`
- 비용/리스크: \`cost ${source.actual.costsKrw.toLocaleString("ko-KR")}원\` · \`MDD(session) ${source.actual.maxSessionDrawdownPct ?? "—"}%\` · \`forced-exit ${source.actual.forcedExitTrades}/${source.actual.closedTrades}\`
- 반사실 BUY: \`W/L/N/U ${source.counterfactualBuy.wins}/${source.counterfactualBuy.losses}/${source.counterfactualBuy.neutral}/${source.counterfactualBuy.unresolved}\` · \`WR ${pct(source.counterfactualBuy.winRate)}\` · gross only
- 품질: \`sessions ${source.quality.completedSessions}/${source.quality.totalSessions}\` · \`ticks ${source.quality.ticks}\` · \`labels ${(source.quality.labelCoverageRate * 100).toFixed(1)}%\` · \`unresolved ${(source.quality.unresolvedLabelRate * 100).toFixed(1)}%\` · \`fallback ${(source.quality.fallbackRate * 100).toFixed(1)}%\`
- 선정: \`snapshots ${source.selection.snapshots}\` · ${source.selection.note}

## 오늘의 가설

${source.candidates.map((item) => `- \`${item.key}\` · ${item.supports ? "SUPPORT" : "NOT-SUPPORTED"} · IF ${item.condition} → DO ${item.action} · n=${item.independentSamples}, tr=${item.closedTrades}, W/L=${item.wins}/${item.losses} · ${item.note}`).join("\n")}

## 다음 장 적용

${rules.filter((rule) => rule.status === "SHADOW").map((rule) => `- \`${rule.id}\` ${rule.scope} · ${rule.action} · **참고만, 자동 하드게이트 금지**`).join("\n") || "- 신규 SHADOW 없음"}

## 승격/퇴역

- ACTIVE 승격: 최소 3거래일 + 독립 20표본 + 폐쇄 20거래의 손실패턴 재현. 실전 자동화 판단은 별도 100왕복·20거래일 OOS 게이트.
- 퇴역: 10거래일/50표본에서 개선효과 없음, 반대증거 2회, 또는 만료. CM에서는 삭제하고 tombstone만 보존.
- 당일 생성 가설을 당일 성과로 검증하지 않음(다음 거래일부터 OOS).

## 데이터 결손

- 실제 주문에는 tradeId/MFE/MAE/configVersion/promptHash가 없어 거래별 비용 귀속·설정 드리프트 분리가 제한됨.
- 반사실 라벨은 LONG·gross이며 반복 틱이 독립표본이 아님.
- 스크리너 미선정 후보의 동일 horizon 미래성과는 아직 영속되지 않아 선정 오답은 보류.
`;
}

export function renderStandaloneHtml(
  latest: DailyMistakeSource | null,
  rules: MemoryRule[],
  conflicts: string[],
): string {
  const rows = rules
    .map(
      (rule) => `<tr><td>${esc(rule.status)}</td><td>${esc(rule.scope)}</td><td>${esc(rule.condition)}</td><td>${esc(rule.action)}</td><td>${esc(rule.evidence)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 단타 오답노트</title><style>body{font-family:system-ui,sans-serif;max-width:68.75rem;margin:2rem auto;padding:0 1rem;color:CanvasText;background:Canvas}h1,h2{letter-spacing:-.03em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(11.25rem,1fr));gap:.75rem}.card{border:.0625rem solid color-mix(in srgb,CanvasText 15%,Canvas);border-radius:.875rem;padding:1rem}.v{font-size:1.5rem;font-weight:700}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.625rem;border-bottom:.0625rem solid color-mix(in srgb,CanvasText 12%,Canvas);vertical-align:top}small{color:GrayText}@media(max-width:37.5rem){body{margin:1.125rem auto}table{font-size:.8125rem}}</style></head><body><h1>AI 단타 오답노트</h1><p><small>실제 체결 → 반사실 진단 → OOS 검증 → Compact Memory. 일 1~2%는 비용 후 관찰 구간이며 보장값이 아닙니다.</small></p><div class="grid"><div class="card"><small>기준일</small><div class="v">${esc(latest?.date ?? "—")}</div></div><div class="card"><small>비용 후 일수익</small><div class="v">${esc(latest?.actual.portfolioReturnPct ?? "—")}%</div></div><div class="card"><small>실제 W/L</small><div class="v">${esc(latest ? `${latest.actual.wins}/${latest.actual.losses}` : "—")}</div></div><div class="card"><small>CM 규칙</small><div class="v">${rules.length}</div></div></div><h2>활성 메모</h2><table><thead><tr><th>상태</th><th>범위</th><th>조건</th><th>행동</th><th>근거</th></tr></thead><tbody>${rows || '<tr><td colspan="5">규칙 없음</td></tr>'}</tbody></table><h2>장 마감 루프</h2><p>15:40 완료 확인 → 품질 게이트 → 실제/반사실/선정 분리 → 전일 규칙 OOS → 승격·퇴역 → CM 재생성 → 프롬프트 최대 6줄 주입</p>${conflicts.length ? `<p>병합 충돌(주입 제외): ${esc(conflicts.join(", "))}</p>` : ""}</body></html>`;
}
