#!/usr/bin/env bash
#
# 시황 분석 자동 적립 — 로컬 스케줄러(crontab)용. PRD market-analysis-cron(Phase 4a).
#
# 로컬 dev 서버(`next dev`)의 `?refresh=1` 을 호출해 시황 분석을 새로 생성·저장한다.
# 구독 Claude CLI 로 합성하므로 토큰 비용 0. dev 서버가 떠 있는 시각에만 best-effort 로 적립하고,
# 서버 미실행이면 즉시 실패(무해 — 그 틱만 건너뜀). 24h 신선도 가드 기준 하루 1회 성공으로 충분.
#
# ── 설치 (crontab, 장중 평일 30분마다 — 맥 시스템 TZ = KST 가정) ─────────────────
#   crontab -e
#   0,30 9-15 * * 1-5 /절대경로/scripts/cron/refresh-market-analysis.sh >> /tmp/market-analysis-cron.log 2>&1
#   (09:00 ~ 15:30, 평일. 로그: /tmp/market-analysis-cron.log)
#
# 환경변수(선택): MARKET_ANALYSIS_URL 로 대상 URL 변경 가능(기본 localhost:3000).

set -uo pipefail

# 기본 URL 은 ?refresh=1(생성·저장 경로)을 포함한다 — override 시에도 ?refresh=1 을 유지할 것.
URL="${MARKET_ANALYSIS_URL:-http://localhost:3000/api/market/analysis?refresh=1}"
BODY="$(mktemp -t market-analysis-cron.XXXXXX)"
HEADERS="$(mktemp -t market-analysis-cron-h.XXXXXX)"
# crontab 이 SIGTERM 으로 중단해도 임시파일을 정리한다.
trap 'rm -f "$BODY" "$HEADERS"' EXIT
TS="$(date '+%Y-%m-%d %H:%M:%S')"

# CLI 합성은 ~2분 → 타임아웃 240s. 헤더(-D)에서 X-CLI/X-Pruned 확인.
code="$(curl -s -m 240 -D "$HEADERS" -o "$BODY" -w '%{http_code}' "$URL" 2>/dev/null || echo "000")"

if [ "$code" = "200" ]; then
  asof="$(grep -o '"asOf":"[^"]*"' "$BODY" | head -1)"
  cli="$(grep -i '^x-cli:' "$HEADERS" | tr -d '\r' | awk '{print $2}')"
  pruned="$(grep -i '^x-pruned:' "$HEADERS" | tr -d '\r' | awk '{print $2}')"
  echo "[$TS] OK 200  ${asof}  cli=${cli:-?} pruned=${pruned:-0}"
else
  echo "[$TS] SKIP/FAIL code=${code} — dev 서버 미실행이거나 생성 실패(무해)"
fi
