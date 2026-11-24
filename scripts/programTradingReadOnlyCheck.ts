import { isTossConfigured } from "../lib/api/toss/client";
import { paperSession } from "../lib/server/programTrading/tossPaper";

const now = Date.now();
const session = paperSession(now);
const configured = isTossConfigured();
console.log(JSON.stringify({
  configured,
  canStartNow: configured && !session.weekend && now >= session.openAt && now < session.closeAt,
  candidateStartAt: new Date(session.scanAt).toISOString(),
  closeAt: new Date(session.closeAt).toISOString(),
}));
if (!configured) {
  console.error(".env.local에 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 설정해 주세요.");
  process.exitCode = 1;
}
