import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createProgramTradingWorkflow } from './programTradingWorkflow';
import { PAPER_MARKET_INTERVAL_MS } from '../lib/api/toss/paperMarketLimit';
import { RULES } from '../lib/server/programTrading/engine';

const exec = promisify(execFile);
const workDir = '.archify/program-rules';
const archify = join(process.env.ARCHIFY_HOME ?? join(homedir(), '.codex/skills/archify'), 'bin/archify.mjs');
const views = ['summary', 'detail', 'buy', 'sell', 'settlement'] as const;
const checking = process.argv.includes("--check");
const values = { ...RULES, requestSeconds: PAPER_MARKET_INTERVAL_MS / 1_000 };

async function checkBrowser(requestedView = 'summary') {
  if (process.platform === 'darwin' && process.env.CODEX_SANDBOX === 'seatbelt') {
    throw new Error('macOS의 제한된 Codex 셸에서는 Chrome이 시작 중 종료될 수 있어요. 일반 터미널에서 npm run program:rules:browser를 실행해 주세요.');
  }

  if (!views.some(view => view === requestedView)) {
    throw new Error(`다이어그램 이름을 확인해 주세요: ${views.join(', ')}`);
  }

  const artifact = join(workDir, `${requestedView}.html`);
  await access(artifact).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') throw new Error('먼저 npm run program:rules 또는 npm run program:rules:check를 실행해 주세요.');
    throw error;
  });
  const outDir = await mkdtemp(join(workDir, 'browser-'));
  try {
    const { stdout } = await exec(process.execPath, [
      archify, 'browser-check', artifact, '--summary', '--require-provenance', '--out-dir', outDir,
    ], { env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' }, maxBuffer: 4 * 1024 * 1024 });
    process.stdout.write(stdout);
  } catch (error) {
    const detail = error as Error & { stdout?: string };
    throw new Error(`다이어그램 브라우저 검사 실패\n${detail.stdout || detail.message}`);
  }
}

async function main() {
  if (process.argv[2] === '--browser-check') {
    await checkBrowser(process.argv[3]);
    return;
  }

  const sources = [
    "lib/server/programTrading/engine.ts", "lib/server/programTrading/localPaperRuntime.ts",
    "lib/server/programTrading/tossPaper.ts", "lib/server/programTrading/journal.ts",
    "lib/api/toss/paperMarketLimit.ts", "lib/api/toss/client.ts",
  ];
  const sourceText = await Promise.all(sources.map(path => readFile(path, 'utf8')));
  const fingerprint = createHash('sha256').update(sourceText.join('\n')).digest('hex').slice(0, 12);
  const theme = JSON.parse(await readFile('tailwind.theme.json', 'utf8')).theme.extend;
  const tokens = Object.entries(theme.colors).map(([key, value]) => `--${key}:${value}`).join(';');
  const spacing = Object.entries(theme.spacing).map(([key, value]) => `--space-${key}:${value}`).join(';');
  const template = await readFile('docs/program-trading/rules.template.html', 'utf8');
  const output = template.replace('/* DESIGN_TOKENS */', `${tokens};${spacing}`)
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (!(key in values)) throw new Error(`알 수 없는 규칙: ${key}`);
      const value = values[key as keyof typeof values];
      if (["entryStart", "candidateStart", "closeMinute"].includes(key)) {
        return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
      }
      if (key.endsWith("IntervalMs")) return String(value / 60_000);
      return value.toLocaleString("ko-KR");
    }).replaceAll('__FINGERPRINT__', fingerprint);
  const outputs = [["rules.html", output]];
  for (const [name, html] of outputs) {
    const target = `docs/program-trading/${name}`;
    if (checking) {
      if (await readFile(target, "utf8") !== html) throw new Error(`자동매매 기준 HTML을 갱신하세요: ${target}`);
    } else await writeFile(target, html);
  }
  await mkdir(workDir, { recursive: true });
  const evidenceRoot = process.env.PROGRAM_RULES_EVIDENCE_ROOT ?? '.';
  const revision = (await exec('git', ['log', '-1', '--format=%H', '--', 'docs/program-trading/rules.template.html'], { cwd: evidenceRoot })).stdout.trim();
  for (const view of views) {
    const data = JSON.stringify(createProgramTradingWorkflow(output, view, revision), null, 2) + '\n';
    const candidate = `${workDir}/${view}.json`;
    await writeFile(candidate, data);
    try {
      await exec(process.execPath, [archify, 'deliver', 'workflow', candidate, `${workDir}/${view}.html`, '--quality', 'showcase', '--repo-root', evidenceRoot, '--json'], { env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' }, maxBuffer: 4 * 1024 * 1024 });
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
  console.log(`요약·상세 다이어그램 ${checking ? "일치 확인" : "생성 완료"} · 근거 ${fingerprint}`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
