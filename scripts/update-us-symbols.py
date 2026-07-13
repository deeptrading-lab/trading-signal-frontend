#!/usr/bin/env python3
"""
us-symbols.json 업데이트 스크립트 (미국 종목 검색 인덱스).

NASDAQ Trader 심볼 디렉토리(무키·무료)로 미국 상장 보통주 + ETF 목록을 생성한다.
KR 의 update-symbols.py 와 동일 패턴 — 신규 상장/폐지 시 재실행(주간 자동화 편입 가능).

소스:
  https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt  (NASDAQ)
  https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt   (NYSE·AMEX·ARCA 등)

정책:
  - Test Issue = Y 제외.
  - 보통주(Common Stock/Ordinary Shares/Class X …) + ETF 만 유지 — 워런트/권리/유닛/우선주/
    노트 등 파생·비보통주는 이름 패턴으로 제외(검색 노이즈 차단).
  - 종목명은 " - Common Stock" 등 접미사를 정리(검색 가독).
  - 상장주식수·시총·한글명은 담지 않는다(표시 시 Toss stockMaster 로 조달) — 검색용 최소 스키마.

출력:
  lib/api/marketdata/us-symbols.json  (덮어쓰기)
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUT_PATH = REPO_ROOT / "lib/api/marketdata/us-symbols.json"

NASDAQ_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
OTHER_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; trading-signal-symbols/1.0)"}

# otherlisted.txt Exchange 코드 → 거래소 라벨.
OTHER_EXCHANGE = {"A": "AMEX", "N": "NYSE", "P": "ARCA", "Z": "CBOE", "V": "IEX"}

# 보통주/ETF 로 인정할 이름 접미사(이 중 하나로 끝나야 유지). 그 외(워런트·권리·유닛·우선주·노트)는 제외.
KEEP_NAME_RE = re.compile(
    r"(common stock|ordinary shares?|american depositary shares?|"
    r"class [a-z].*(common stock|ordinary shares?))$",
    re.IGNORECASE,
)
# 명시 제외(파생·비보통주) — KEEP 접미사를 우회하는 케이스 방어. 복수형 포함(warrants/rights/units).
# ("...to purchase one share of common stock" 처럼 warrant 설명이 common stock 로 끝나 KEEP 를 뚫는 것 차단.)
DROP_NAME_RE = re.compile(
    r"\b(warrants?|rights?|units?|preferred|subordinat\w*|debentures?|when[\s-]?issued)\b",
    re.IGNORECASE,
)
SYMBOL_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")  # US 티커: 영문 시작·영숫자/./- 최대 10자.
# 워런트/유닛/권리/우선주 심볼 접미사 — 이름이 애매해도 심볼로 확실히 걸러낸다(.A/.B 주식클래스는 유지).
SYMBOL_SUFFIX_DROP = re.compile(r"\.(W|WS|WT|U|UN|R|RT|RW|P|PR)$", re.IGNORECASE)


def fetch(url: str) -> list[str]:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("latin-1", errors="replace").splitlines()


def clean_name(raw: str) -> str:
    n = raw.strip()
    # 흔한 접미사 정리(검색 가독) — 매칭은 대소문자 무시.
    n = re.sub(r"\s*[-–]\s*Common Stock$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s+Common Stock$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*[-–]\s*Ordinary Shares?$", "", n, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", n).strip()


def keep(name: str, etf: bool) -> bool:
    if DROP_NAME_RE.search(name):
        return False
    return etf or bool(KEEP_NAME_RE.search(name))


def parse(lines: list[str], is_nasdaq: bool) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for line in lines[1:]:  # 헤더 스킵.
        if line.startswith("File Creation Time"):
            continue
        f = line.split("|")
        if is_nasdaq:
            if len(f) < 8:
                continue
            sym, name, test_issue, etf = f[0].strip(), f[1].strip(), f[3].strip(), f[6].strip()
            market = "NASDAQ"
        else:
            if len(f) < 8:
                continue
            sym, name, exch, etf, test_issue = (
                f[0].strip(), f[1].strip(), f[2].strip(), f[4].strip(), f[6].strip()
            )
            market = OTHER_EXCHANGE.get(exch, "US")
        if (
            test_issue == "Y"
            or not SYMBOL_RE.match(sym)
            or SYMBOL_SUFFIX_DROP.search(sym)
            or not name
        ):
            continue
        is_etf = etf == "Y"
        if not keep(name, is_etf):
            continue
        out[sym] = {"ticker": sym, "name": clean_name(name), "market": market, "etf": is_etf}
    return out


def main() -> None:
    print("1/2  NASDAQ 상장 종목...")
    nasdaq = parse(fetch(NASDAQ_URL), is_nasdaq=True)
    print(f"      NASDAQ: {len(nasdaq)}")
    print("2/2  기타 거래소(NYSE·AMEX 등)...")
    other = parse(fetch(OTHER_URL), is_nasdaq=False)
    print(f"      OTHER: {len(other)}")

    merged = {**other, **nasdaq}  # 심볼 충돌 시 NASDAQ 우선(드묾).
    symbols = sorted(merged.values(), key=lambda s: (s["market"], s["ticker"]))

    by_market: dict[str, int] = {}
    for s in symbols:
        by_market[s["market"]] = by_market.get(s["market"], 0) + 1
    etf_count = sum(1 for s in symbols if s["etf"])

    output = {
        "$meta": {
            "version": "0.1.0",
            "createdAt": datetime.now().strftime("%Y-%m-%d"),
            "source": "NASDAQ Trader 심볼 디렉토리(nasdaqlisted+otherlisted). 보통주+ETF, 파생 제외.",
            "note": "미국 종목 검색용 최소 인덱스(ticker·name·market·etf). 상장주식수·시총·한글명은 "
                    "표시 시 Toss stockMaster 로 조달. 신규 상장/폐지 시 재실행.",
            "count_actual": len(symbols),
            "count_by_market": by_market,
            "count_etf": etf_count,
        },
        "symbols": symbols,
    }
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nDone: {len(symbols)} 종목 ({by_market}, ETF {etf_count})")
    print(f"Written: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
