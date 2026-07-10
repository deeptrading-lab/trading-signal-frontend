#!/usr/bin/env python3
"""
종목 검색 시드(symbols.json) 주간 자동화용 CI 검증 + 델타 리포트.

update-symbols.py 재생성 직후 워크플로에서 호출한다.
  1) 무결성 게이트 — garbage/부분 KRX 응답이 조용히 시드를 덮어쓰는 것 차단. 실패 시 exit 1.
  2) HEAD 대비 델타(신규/폐지/corp_code 교정) 계산 → PR 본문 마크다운 파일 작성.

사용법:
  python3 scripts/symbols_ci.py <pr_body_출력경로>

무결성 실패는 `::error::` 로 GHA 로그에 남기고 exit 1(= 워크플로 실패, PR 미생성).
"""

from __future__ import annotations  # X | None 유니온 힌트를 3.9+ 에서도 지연 평가

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SYMBOLS_PATH = REPO_ROOT / "lib/api/kis/symbols.json"

# 무결성 허용 범위 — 한국 상장 보통주 규모(현 ~2600)에서 크게 벗어나면 부분/실패 응답으로 간주.
MIN_COUNT = 2400
MAX_COUNT = 2800
# HEAD 대비 급감 허용 하한(부분 fetch 로 수백 종목 조용히 유실되는 것 차단).
DROP_FLOOR_RATIO = 0.97


def load_head_symbols() -> dict | None:
    """git HEAD 의 symbols.json(재생성 전 정본). 없거나 파싱 실패면 None(=비교 생략)."""
    try:
        raw = subprocess.check_output(
            ["git", "show", "HEAD:lib/api/kis/symbols.json"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
        )
        return json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def check_integrity(new: dict, old: dict | None) -> list[str]:
    errs: list[str] = []
    meta = new.get("$meta", {})
    symbols = new.get("symbols")
    if not isinstance(symbols, list) or not symbols:
        return ["symbols 배열이 비어있거나 리스트가 아님"]

    n = len(symbols)
    if not (MIN_COUNT <= n <= MAX_COUNT):
        errs.append(f"count 정상범위({MIN_COUNT}~{MAX_COUNT}) 벗어남: {n}")
    if meta.get("count_actual") != n:
        errs.append(f"$meta.count_actual({meta.get('count_actual')}) != 실제({n})")

    tickers = [s.get("ticker") for s in symbols]
    if any(not (isinstance(t, str) and t.isdigit() and len(t) == 6) for t in tickers):
        errs.append("6자리 숫자 아닌 티커 존재")
    if any(not s.get("name") for s in symbols):
        errs.append("빈 종목명 존재")
    if len(tickers) != len(set(tickers)):
        errs.append("중복 티커 존재")

    if old and isinstance(old.get("symbols"), list):
        old_n = len(old["symbols"])
        if n < old_n * DROP_FLOOR_RATIO:
            errs.append(f"종목 급감(부분 fetch 의심): {old_n} → {n}")
    return errs


def compute_delta(new: dict, old: dict | None) -> dict:
    new_map = {s["ticker"]: s for s in new["symbols"]}
    old_map = {s["ticker"]: s for s in (old["symbols"] if old else [])}
    added = [new_map[t] for t in new_map if t not in old_map]
    removed = [old_map[t] for t in old_map if t not in new_map]
    corp_changed = sum(
        1
        for t in new_map
        if t in old_map and new_map[t].get("corp_code") != old_map[t].get("corp_code")
    )
    return {"added": added, "removed": removed, "corp_changed": corp_changed}


def render_body(new: dict, delta: dict) -> str:
    meta = new["$meta"]
    lines = [
        "## 종목 검색 시드 주간 자동 최신화",
        "",
        f"`scripts/update-symbols.py` 재실행(KRX KIND + OpenDART CORPCODE.xml). "
        f"총 **{meta['count_actual']}종목** (KOSPI {meta.get('count_kospi')} + KOSDAQ {meta.get('count_kosdaq')}), "
        f"createdAt {meta.get('createdAt')}.",
        "",
    ]
    added, removed = delta["added"], delta["removed"]
    if added:
        lines.append(f"### 신규 상장/편입 ({len(added)})")
        lines += [f"- {s['name']} ({s['ticker']}, {s.get('market')})" for s in added]
        lines.append("")
    if removed:
        lines.append(f"### 상장폐지/제외 ({len(removed)})")
        lines += [f"- {s['name']} ({s['ticker']}, {s.get('market')})" for s in removed]
        lines.append("")
    if delta["corp_changed"]:
        lines.append(f"### corp_code 교정 {delta['corp_changed']}건")
        lines.append("")
    if not added and not removed and not delta["corp_changed"]:
        lines.append("_종목 증감 없음 — 메타만 갱신._")
        lines.append("")
    lines += [
        "---",
        "무결성 게이트 통과(count 정상범위·중복0·6자리·비어있지않음·급감없음).",
        "",
        "## 다음 작업",
        "- 델타 검토 후 게이트(qa-passed → review-approved) 부여하고 머지. "
        "KIND 6자리 숫자 티커 한계로 당일 상장/영숫자 코드 종목은 다음 주 편입될 수 있음.",
    ]
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print("사용법: python3 scripts/symbols_ci.py <pr_body_출력경로>", file=sys.stderr)
        sys.exit(2)
    body_path = Path(sys.argv[1])

    new = json.loads(SYMBOLS_PATH.read_text(encoding="utf-8"))
    old = load_head_symbols()

    errs = check_integrity(new, old)
    if errs:
        for e in errs:
            print(f"::error::무결성 실패 — {e}")
        sys.exit(1)

    delta = compute_delta(new, old)
    print(
        f"무결성 OK: {len(new['symbols'])}종목 · "
        f"신규 {len(delta['added'])} · 폐지 {len(delta['removed'])} · corp_code {delta['corp_changed']}"
    )
    body_path.write_text(render_body(new, delta), encoding="utf-8")
    print(f"PR 본문 작성: {body_path}")


if __name__ == "__main__":
    main()
