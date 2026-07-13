/**
 * paperTrading 도메인 표시 포맷 헬퍼 — 세션 상세 컨테이너(지표·포지션·체결 표)와 자산곡선
 * 차트(`PaperTradingEquityChart`, recharts 지연 로드로 별도 청크)가 공유한다.
 * 컨테이너에 두면 차트 청크가 컨테이너를 역-import 하며 분리가 무의미해져 별도 파일로 둠
 * (`components/analyze/format.ts` 선례).
 */

export function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export function formatPct(value: number, sign = true): string {
  const prefix = sign && value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}
