import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createProgramTradingWorkflow } from './programTradingWorkflow';
import { RULES } from '../lib/server/programTrading/engine';

const exec = promisify(execFile);
const workDir = '.archify/program-rules';
const archify = join(process.env.ARCHIFY_HOME ?? join(homedir(), '.codex/skills/archify'), 'bin/archify.mjs');
const checking = process.argv.includes('--check');


async function main() {
  const sources = ['lib/server/programTrading/engine.ts', 'lib/server/programTrading/candidateRefresh.ts', 'lib/validation/programTrading/candidateGate.ts', 'lib/server/programTrading/journal.ts', 'lib/server/programTrading/localPaperRuntime.ts', 'lib/server/programTrading/tossPaper.ts', 'lib/server/programTrading/recommendationCandidates.ts', 'lib/server/intraday/recommendationRankings.ts', 'lib/validation/intraday/recommendations.ts'];
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
  const outputs = [["rules.html", output]];
  for (const [name, html] of outputs) {
    const target = `docs/program-trading/${name}`;
    if (process.argv.includes("--check")) {
      if (await readFile(target, "utf8") !== html) throw new Error(`자동매매 기준 HTML을 갱신하세요: ${target}`);
    } else await writeFile(target, html);
  }
  await mkdir(workDir, { recursive: true });
  const revision = (await exec('git', ['log', '-1', '--format=%H', '--', 'docs/program-trading/rules.template.html'])).stdout.trim();
  for (const view of ['summary', 'detail', 'buy', 'sell', 'settlement'] as const) {
    const data = JSON.stringify(createProgramTradingWorkflow(output, view, revision), null, 2) + '\n';
    const candidate = `${workDir}/${view}.json`;
    await writeFile(candidate, data);
    try {
      await exec(process.execPath, [archify, 'deliver', 'workflow', candidate, `${workDir}/${view}.html`, '--quality', 'showcase', '--repo-root', '.', '--json'], { env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' }, maxBuffer: 4 * 1024 * 1024 });
    } catch (error) {
      const detail = error as Error & { stdout?: string };
      throw new Error(`Archify 생성 실패. 아래 진단을 확인해 주세요. 설치 위치가 다르면 ARCHIFY_HOME을 지정해 주세요.\n${detail.stdout || detail.message}`);
    }
    const html = await readFile(`${workDir}/${view}.html`, 'utf8');
    for (const [target, content] of [[`docs/program-trading/${view}.html`, html], [`docs/program-trading/${view}.workflow.json`, data]]) {
      if (checking) {
        if (await readFile(target, 'utf8') !== content) throw new Error(`자동매매 다이어그램을 갱신하세요: ${target}`);
      } else await writeFile(target, content);
    }
  }
  console.log(`요약·상세 다이어그램 ${process.argv.includes("--check") ? "일치 확인" : "생성 완료"} · 근거 ${fingerprint}`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
