#!/usr/bin/env bash
#
# 장중 단타 틱 자동 실행 — 로컬 스케줄러(crontab)용. PRD intraday-scalping-agent §3-6.
#
# 로컬 dev 서버(`next dev`)의 paper-trading 단타 세션(cli-agent)에 N분마다 tick 을 밀어넣는다.
# 결정은 로컬 Claude CLI(구독)로 내리므로 토큰 비용 0. 멱등성은 서버(runPaperTradingTick — 같은
# tickWindowStart 당 1틱)가 보장하므로 중복 발화는 무해하다. 서버 미실행이면 즉시 실패(그 틱만 건너뜀).
#
# ── 설치 (crontab, 장중 평일 5분마다 — 맥 시스템 TZ = KST 가정) ──────────────────
#   crontab -e
#   */5 9-15 * * 1-5 INTRADAY_SESSION_ID=<세션UUID> /절대경로/scripts/cron/intraday-tick.sh >> /tmp/intraday-tick.log 2>&1
#   (cron 은 15:55까지 발화할 수 있지만 스크립트가 15:31부터 호출 없이 종료한다.)
#
# 환경변수:
#   INTRADAY_SESSION_ID (필수) — tick 을 밀어넣을 paper-trading 세션 ID.
#   INTRADAY_TICK_URL   (선택) — 기본 http://localhost:3000. 경로는 스크립트가 조립.
#   CRON_SECRET         (선택) — 서버에 설정돼 있으면 동일 값을 secret 쿼리로 전달.
#
# ⚠️ 앱 비밀번호 게이트가 /api/* 를 막으므로 게이트 예외인 /api/cron/intraday-tick 으로 호출한다.
# ⚠️ 실제 증권사 주문은 발생하지 않는다(가상매매). 일일 손실 한도 도달 시 서버 측 게이트가
#    신규 진입을 차단하므로 스케줄러는 단순 발화만 한다.

set -uo pipefail

TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S')"
KST_WEEKDAY="$(TZ=Asia/Seoul date '+%u')"
KST_HHMM="$(TZ=Asia/Seoul date '+%H%M')"

if [ "$KST_WEEKDAY" -gt 5 ] || [[ "$KST_HHMM" < "0900" || "$KST_HHMM" > "1530" ]]; then
  echo "[$TS] SKIP — 단타 자동 호출 시간 밖(평일 09:00~15:30 KST)"
  exit 0
fi

if [ -z "${INTRADAY_SESSION_ID:-}" ]; then
  echo "[$TS] SKIP — INTRADAY_SESSION_ID 미설정(crontab 환경변수 확인)"
  exit 0
fi

BASE="${INTRADAY_TICK_URL:-http://localhost:3000}"
URL="${BASE}/api/cron/intraday-tick?session=${INTRADAY_SESSION_ID}"
if [ -n "${CRON_SECRET:-}" ]; then
  URL="${URL}&secret=${CRON_SECRET}"
fi
BODY="$(mktemp -t intraday-tick.XXXXXX)"
trap 'rm -f "$BODY"' EXIT

# 에이전트 그룹 2콜 직렬 ≈ 6~15초 + 분봉 페치 → 타임아웃 120s. (게이트 예외 cron 라우트, GET)
code="$(curl -s -m 120 -o "$BODY" -w '%{http_code}' "$URL" 2>/dev/null || echo "000")"

if [ "$code" = "200" ]; then
  action="$(grep -o '"action":"[^"]*"' "$BODY" | head -1 | sed 's/.*:"//;s/"//')"
  ret="$(grep -o '"returnPct":[-0-9.]*' "$BODY" | head -1 | sed 's/.*://')"
  echo "[$TS] OK 200  action=${action:-?} returnPct=${ret:-?}"
else
  echo "[$TS] SKIP/FAIL code=${code} — dev 서버 미실행/세션 없음/CLI 미설치(무해)"
fi
