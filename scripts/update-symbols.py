#!/usr/bin/env python3
"""
symbols.json 업데이트 스크립트.

KRX KIND 상장법인목록 + OpenDART CORPCODE.xml을 조합해 전체 KOSPI+KOSDAQ
상장 보통주 목록을 생성한다. 신규 상장/상장폐지 발생 시 실행.

사용법:
  python3 scripts/update-symbols.py

환경변수:
  OPENDART_API_KEY  (필수) OpenDART API 키. .env.local에서 로딩 가능.

  ⚠️  앱 서비스용 키와 동일 키를 사용하면 CORPCODE.xml 다운로드(1회)만 해도
  일일 할당량(20,000건)을 소모해 앱의 기업개황·공시 API가 rate-limit 걸린다.
  스크립트 실행 시 OPENDART_API_KEY=<별도_키> python3 scripts/update-symbols.py
  형태로 전용 키를 사용하거나, 앱 배포 시간 외 야간에 실행할 것.

출력:
  lib/api/kis/symbols.json  (덮어쓰기)
"""

import json
import os
import re
import sys
import urllib.request
import zipfile
import io
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUT_PATH = REPO_ROOT / "lib/api/kis/symbols.json"
EXISTING_PATH = OUTPUT_PATH

KIND_KOSPI_URL = "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=stockMkt"
KIND_KOSDAQ_URL = "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=kosdaqMkt"
DART_CORPCODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key={api_key}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://kind.krx.co.kr/",
}


def fetch_kind(url: str, market: str) -> list[dict]:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    text = raw.decode("euc-kr", errors="replace")

    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", text, re.DOTALL)
    results = []
    for row in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
        if len(cells) < 3:
            continue
        name = re.sub(r"<[^>]+>", "", cells[0]).strip()
        ticker = re.sub(r"<[^>]+>", "", cells[2]).strip()
        if ticker and re.match(r"^\d{6}$", ticker) and name:
            results.append({"ticker": ticker, "name": name, "market": market})
    return results


def fetch_dart_corp_codes(api_key: str) -> dict[str, str]:
    url = DART_CORPCODE_URL.format(api_key=api_key)
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = resp.read()
    zf = zipfile.ZipFile(io.BytesIO(data))
    xml_data = zf.read("CORPCODE.xml")
    root = ET.fromstring(xml_data)

    mapping = {}
    for item in root.findall("list"):
        sc = item.find("stock_code")
        cc = item.find("corp_code")
        if sc is not None and sc.text and sc.text.strip() and cc is not None:
            # 6자리 정규화 — KRX ticker(6자리)와 정확 조인 보장(포맷 드리프트 방지).
            mapping[sc.text.strip().zfill(6)] = cc.text.strip()
    return mapping


def load_existing(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {s["ticker"]: s for s in data.get("symbols", [])}


def main():
    # OpenDART API Key
    api_key = os.environ.get("OPENDART_API_KEY", "")
    if not api_key:
        env_file = REPO_ROOT / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("OPENDART_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    if not api_key:
        print("Error: OPENDART_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    print("1/3  KRX KIND — KOSPI 전종목...")
    kospi = fetch_kind(KIND_KOSPI_URL, "KOSPI")
    print(f"      KOSPI: {len(kospi)}")

    print("2/3  KRX KIND — KOSDAQ 전종목...")
    kosdaq = fetch_kind(KIND_KOSDAQ_URL, "KOSDAQ")
    print(f"      KOSDAQ: {len(kosdaq)}")

    print("3/3  OpenDART CORPCODE.xml — corp_code 매핑...")
    ticker_to_corp = fetch_dart_corp_codes(api_key)
    print(f"      매핑: {len(ticker_to_corp)}")

    all_krx = kospi + kosdaq
    existing = load_existing(EXISTING_PATH)
    existing_tickers = list(existing.keys())
    existing_set = set(existing_tickers)

    final = {}
    for stock in all_krx:
        t = stock["ticker"]
        corp_code = ticker_to_corp.get(t, "")
        if t in existing:
            entry = dict(existing[t])
            # corp_code 는 OpenDART CORPCODE.xml(stock_code 정확 조인)이 **권위 소스**다.
            # 매핑이 있으면 항상 덮어쓴다 — 수동 시드(v0.1.0)의 오매핑(예: 009150→삼성SDS)이
            # "비어있을 때만 채움" 로직에 남던 버그(v0.3.1, 82건)를 차단한다. 매핑 미존재 시에만 기존 보존.
            if corp_code:
                entry["corp_code"] = corp_code
            final[t] = entry
        else:
            final[t] = {"ticker": t, "name": stock["name"], "market": stock["market"], "corp_code": corp_code}

    ordered = [final[t] for t in existing_tickers if t in final]
    new_ones = sorted(
        [v for k, v in final.items() if k not in existing_set],
        key=lambda x: (x["market"], x["name"]),
    )
    final_list = ordered + new_ones

    kospi_count = sum(1 for e in final_list if e["market"] == "KOSPI")
    kosdaq_count = sum(1 for e in final_list if e["market"] == "KOSDAQ")

    output = {
        "$meta": {
            "version": "0.3.0",
            "createdAt": datetime.now().strftime("%Y-%m-%d"),
            "source": "KRX KIND 상장법인목록(https://kind.krx.co.kr) + OpenDART CORPCODE.xml corp_code 보강.",
            "note": "KRX KIND 기준 전체 KOSPI+KOSDAQ 상장 보통주. 신규 상장/상장폐지 시 본 스크립트 재실행.",
            "corp_code_source": "OpenDART CORPCODE.xml 8자리 고유번호. 미매핑 종목은 빈 문자열.",
            "count_actual": len(final_list),
            "count_kospi": kospi_count,
            "count_kosdaq": kosdaq_count,
        },
        "symbols": final_list,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {len(final_list)} 종목 (KOSPI {kospi_count} + KOSDAQ {kosdaq_count})")
    print(f"Written: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
