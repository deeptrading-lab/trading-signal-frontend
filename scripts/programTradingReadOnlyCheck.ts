import { hasIntradayRecommendationFeed } from "../lib/server/intraday/recommendationRankings";
import { loadRecommendationCandidates } from "../lib/server/programTrading/recommendationCandidates";
import { requireTossPaperConfig, tossPaperSession } from "../lib/server/programTrading/tossPaper";

async function main() {
  requireTossPaperConfig();
  if (!hasIntradayRecommendationFeed()) {
    throw new Error("AI 단타 추천 조회에 .env.local의 한투 실전 KIS_APP_KEY, KIS_APP_SECRET, KIS_ENV=prod가 필요해요.");
  }
  const [candidates, session] = await Promise.all([loadRecommendationCandidates(), tossPaperSession()]);
  const calendarReady = session.holiday || (Number.isFinite(session.start) && session.end > session.start);
  console.log(JSON.stringify({
    candidatesReady: candidates.status === "ready",
    candidateCount: candidates.rows.length,
    calendarReady,
    marketOpen: session.open,
    canStartNow: session.canStart,
  }));
  if (candidates.status !== "ready") {
    console.error("한투 실제 수급·거래량 추천을 조회하지 못했어요. 한투 키와 조회 상태를 확인해 주세요.");
  }
  if (!calendarReady) {
    console.error("토스 장 운영 정보를 조회하지 못했어요. 토스 키와 새 컴퓨터의 허용 IP 등록을 확인해 주세요.");
  }
  if (candidates.status !== "ready" || !calendarReady) process.exitCode = 1;
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : "토스 시세 설정을 확인해 주세요.");
  process.exitCode = 1;
});
