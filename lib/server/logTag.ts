/**
 * 태그드 서버 로거 — 콘솔 로그 앞에 `HH:MM:SS.mmm(KST) [tag]` 프리픽스를 붙인다.
 *
 * AI 분석처럼 오래 걸리는 파이프라인의 콘솔 로그에 벽시계 시각을 남겨, 각 단계가 실제로
 * 몇 시에 일어났는지 추적할 수 있게 한다(기존 `elapsed=` 구간 측정과 별개).
 *
 * 서버 전용(route handler / lib/server). KST 시각은 앱이 한국 시장 기준이라 통일.
 */

/** KST `HH:MM:SS.mmm`. 로케일/Node 버전 편차를 피해 시:분:초는 en-GB(24h), ms 는 수동 부착. */
function kstTimestamp(): string {
  const d = new Date();
  const hms = d.toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Seoul" });
  return `${hms}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export interface TaggedLogger {
  (...args: unknown[]): void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** `createLogger("ai-analysis")("▶ 시작")` → `16:10:05.123 [ai-analysis] ▶ 시작`. */
export function createLogger(tag: string): TaggedLogger {
  const prefix = () => `${kstTimestamp()} [${tag}]`;
  const logger = ((...args: unknown[]) => console.log(prefix(), ...args)) as TaggedLogger;
  logger.warn = (...args: unknown[]) => console.warn(prefix(), ...args);
  logger.error = (...args: unknown[]) => console.error(prefix(), ...args);
  return logger;
}
