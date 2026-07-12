/**
 * us-symbols.json 한글명(koName) 보강 (us-stock-support 한글 검색).
 *
 * NASDAQ Trader 소스(`update-us-symbols.py`)는 영문명만 준다. 검색에서 "애플·엔비디아·구글" 처럼
 * 한글로도 찾게 하려면 한글명이 필요한데, **Toss `/api/v1/stocks`(batch)** 가 종목별 한글명을 준다
 * (`name`=한글, `englishName`=영문). 이 스크립트가 전 심볼을 batch(≤200) 로 조회해 `koName` 을 채운다.
 *
 * 실행: `npx tsx scripts/enrich-us-korean-names.ts`
 *   - 환경변수: TOSS_CLIENT_ID / TOSS_CLIENT_SECRET (.env.local 자동 로딩 — dotenv 없이 tsx --env-file 또는
 *     상위에서 export). 여기선 process.env 를 그대로 신뢰(호출부가 로딩).
 *   - `update-us-symbols.py` **재실행 후**에 돌려야 한다(base 재생성이 koName 을 덮어쓰므로).
 *
 * 출력: `lib/api/marketdata/us-symbols.json` 각 엔트리에 `koName` 추가(한글명이 영문명과 다를 때만).
 */

import fs from "fs";
import path from "path";
import { tossGet, pickTossArray } from "@/lib/api/toss/client";

const OUTPUT = path.join(process.cwd(), "lib/api/marketdata/us-symbols.json");
const BATCH = 200; // Toss /stocks 심볼 상한(실측: 200 OK · 250 에러).

type UsSymbol = { ticker: string; name: string; market: string; etf: boolean; koName?: string };
type TossRow = { symbol: string; name?: string; englishName?: string };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchKoNames(tickers: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const raw = await tossGet<unknown>("/api/v1/stocks", { symbols: tickers.join(",") });
  const rows = Array.isArray(raw) ? (raw as TossRow[]) : pickTossArray<TossRow>(raw, "stocks");
  for (const r of rows) {
    // 한글명이 영문명과 다를 때만 koName(진짜 한글). 같으면 Toss 도 한글명이 없는 것 → 스킵.
    if (r.symbol && r.name && r.name !== r.englishName) out.set(r.symbol, r.name);
  }
  return out;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(OUTPUT, "utf8")) as {
    $meta: Record<string, unknown>;
    symbols: UsSymbol[];
  };
  const tickers = data.symbols.map((s) => s.ticker);
  console.log(`총 ${tickers.length} 종목 · batch ${BATCH} · ${Math.ceil(tickers.length / BATCH)} 콜`);

  const koMap = new Map<string, string>();
  for (let i = 0; i < tickers.length; i += BATCH) {
    const chunk = tickers.slice(i, i + BATCH);
    try {
      const m = await fetchKoNames(chunk);
      m.forEach((v, k) => koMap.set(k, v));
      process.stdout.write(`  [${i + chunk.length}/${tickers.length}] +${m.size}\r`);
    } catch (e) {
      console.warn(`\n  batch @${i} 실패: ${(e as Error).message.slice(0, 60)}`);
    }
    await delay(120); // Toss rate-limit 배려.
  }

  let filled = 0;
  for (const s of data.symbols) {
    const ko = koMap.get(s.ticker);
    if (ko) {
      s.koName = ko;
      filled++;
    } else {
      delete s.koName;
    }
  }
  data.$meta.count_ko_name = filled;
  data.$meta.ko_name_source = "Toss /api/v1/stocks name(한글). 한글명 미보유 종목은 미기재(영문 검색만).";
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), "utf8");
  console.log(`\nDone: ${filled}/${tickers.length} 종목에 koName 채움 → ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
