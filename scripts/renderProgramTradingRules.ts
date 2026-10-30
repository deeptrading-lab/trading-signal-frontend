import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RULES } from '../lib/server/programTrading/engine';

async function main() {
const sources = ['lib/server/programTrading/engine.ts', 'lib/server/programTrading/candidateRefresh.ts', 'lib/server/programTrading/candidates.ts', 'lib/validation/programTrading/candidateGate.ts', 'lib/mock/programTrading/quotes.ts', 'scripts/programTradingWorker.ts'];
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
const target = 'docs/program-trading/rules.html';
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== output) throw new Error('자동매매 기준 HTML을 갱신하세요: npm run program:rules');
  console.log('자동매매 기준 HTML 최신 상태 확인');
} else {
  await writeFile(target, output);
  console.log(`${target} 생성 완료 · 근거 ${fingerprint}`);
}

}
void main().catch(error => { console.error(error); process.exitCode = 1; });
