import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RULES } from '../lib/server/programTrading/engine';

async function main() {
const sources = ['lib/server/programTrading/engine.ts', 'lib/server/programTrading/candidateRefresh.ts', 'lib/server/programTrading/candidates.ts', 'lib/validation/programTrading/candidateGate.ts', 'lib/mock/programTrading/quotes.ts', 'scripts/programTradingWorker.ts', 'lib/server/programTrading/journal.ts', 'lib/server/programTrading/liveEngine.ts', 'lib/server/programTrading/liveStore.ts', 'lib/server/programTrading/liveTypes.ts', 'lib/server/programTrading/liveQuotes.ts', 'lib/server/programTrading/kisTransport.ts', 'lib/server/programTrading/kisBroker.ts'];
const sourceText = await Promise.all(sources.map(path => readFile(path, 'utf8')));
const fingerprint = createHash('sha256').update(sourceText.join('\n')).digest('hex').slice(0, 12);
const theme = JSON.parse(await readFile('tailwind.theme.json', 'utf8')).theme.extend;
const tokens = Object.entries(theme.colors).map(([key, value]) => `--${key}:${value}`).join(';');
const spacing = Object.entries(theme.spacing).map(([key, value]) => `--space-${key}:${value}`).join(';');
const template = await readFile('docs/program-trading/rules.template.html', 'utf8');
const output = template.replace('/* DESIGN_TOKENS */', `${tokens};${spacing}`)
  .replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in RULES)) throw new Error(`알 수 없는 규칙: ${key}`);
    const value = RULES[key as keyof typeof RULES];
    return ['maxPositions', 'cooldown'].includes(key) ? String(value) : String(Number((value * 100).toFixed(4)));
  }).replaceAll('__FINGERPRINT__', fingerprint);
const outputs = [
  ["rules.html", output],
  ["summary.html", output.replace(/<article class="detail">[\s\S]*?<\/article>/, "")],
  ["detail.html", output.replace(/<article class="summary">[\s\S]*?<\/article>/, "")],
];
for (const [name, html] of outputs) {
  const target = `docs/program-trading/${name}`;
  if (process.argv.includes("--check")) {
    if (await readFile(target, "utf8") !== html) throw new Error(`자동매매 기준 HTML을 갱신하세요: ${target}`);
  } else await writeFile(target, html);
}
console.log(`요약·상세 다이어그램 ${process.argv.includes("--check") ? "일치 확인" : "생성 완료"} · 근거 ${fingerprint}`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
