#!/usr/bin/env bash
#
# 장중 단타 판단(참고) Slack 푸시 — 로컬 스케줄러(crontab)용. intraday-scalping-agent §0(C).
#
# 게이트 예외 라우트 /api/cron/intraday-slack 을 호출 → 종목의 단타 판단을 생성해 Slack 으로 푸시.
# 로컬 dev 서버 + 로컬 CLI(구독) + INTRADAY_SLACK_WEBHOOK_URL 설정 필요. 화면 안 봐도 알림 수신.
#
# ── 설치 (crontab, 장중 평일 15분마다 예시) ────────────────────────────────────
#   crontab -e
#   */15 9-15 * * 1-5 INTRADAY_SLACK_TICKERS=005930,006400 /절대경로/scripts/cron/intraday-slack.sh >> /tmp/intraday-slack.log 2>&1
#
# 환경변수:
#   INTRADAY_SLACK_TICKERS (필수) — 쉼표구분 종목코드(여러 개면 순차 푸시).
#   INTRADAY_SLACK_URL     (선택) — 기본 http://localhost:3000.
#   CRON_SECRET            (선택) — 서버에 설정돼 있으면 동일 값 전달.
#
# ⚠️ 의사결정 보조 알림 — 자동 수익/집행 아님. 매매는 사람이 직접.

set -uo pipefail
TS="$(date '+%Y-%m-%d %H:%M:%S')"

if [ -z "${INTRADAY_SLACK_TICKERS:-}" ]; then
  echo "[$TS] SKIP — INTRADAY_SLACK_TICKERS 미설정"
  exit 0
fi

BASE="${INTRADAY_SLACK_URL:-http://localhost:3000}"
SECRET_Q=""
[ -n "${CRON_SECRET:-}" ] && SECRET_Q="&secret=${CRON_SECRET}"

IFS=',' read -ra TICKERS <<< "$INTRADAY_SLACK_TICKERS"
for t in "${TICKERS[@]}"; do
  t="$(echo "$t" | tr -d '[:space:]')"
  [ -z "$t" ] && continue
  # 단타 read(분봉 페치+2에이전트) 가 수십 초 → 타임아웃 150s.
  code="$(curl -s -m 150 -o /dev/null -w '%{http_code}' "${BASE}/api/cron/intraday-slack?ticker=${t}${SECRET_Q}" 2>/dev/null || echo "000")"
  echo "[$TS] ${t} → http ${code}"
done
