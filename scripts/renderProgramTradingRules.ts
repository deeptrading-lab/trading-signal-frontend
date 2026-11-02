import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { RULES } from '../lib/server/programTrading/engine';

const exec = promisify(execFile);
const workDir = '.archify/program-rules';
const archify = join(process.env.ARCHIFY_HOME ?? join(homedir(), '.codex/skills/archify'), 'bin/archify.mjs');
const checking = process.argv.includes('--check');

// rules.template.html remains the single authored source for diagram conditions.
function workflow(html: string, view: 'summary' | 'detail', revision: string) {
  const article = html.match(new RegExp(`<article class="${view}">([\\s\\S]*?)</article>`))?.[1];
  if (!article) throw new Error(`다이어그램 원본이 없어요: ${view}`);
  const lanes: { id: string; label: string }[] = [];
  const nodes: { id: string; lane: string; col: number; type: string; label: string; sublabel: string; width?: number; sources: { path: string; line: number }[] }[] = [];
  const edges: { from: string; to: string; label?: string }[] = [];
  let previous: string | undefined;
  for (const [sectionIndex, match] of [...article.matchAll(/<section>([\s\S]*?)<\/section>/g)].entries()) {
    const section = match[1];
    const title = section.match(/<h2>(.*?)<\/h2>/)?.[1] ?? '';
    const local: typeof nodes = [];
    let arrow = '';
    for (const part of section.matchAll(/<div class="(node[^"]*|arrow|branch)">([\s\S]*?)<\/div>/g)) {
      const [, kind, body] = part;
      const text = body.replace(/<[^>]+>/g, '').trim();
      if (kind === 'arrow') { arrow = text.replace('↓', '').trim(); continue; }
      if (kind === 'branch') {
        const node = local.at(-1);
        if (node) node.sublabel = [node.sublabel, text.replace('↳ ', '')].filter(Boolean).join(' · ');
        continue;
      }
      const index = local.length;
      const row = Math.floor(index / 2);
      const lane = `s${sectionIndex}r${row}`;
      if (!lanes.some(value => value.id === lane)) lanes.push({ id: lane, label: row ? `${title} · 계속` : title });
      const node = { id: `${view}-s${sectionIndex}n${index}`, lane, col: row % 2 ? 1 - index % 2 : index % 2, type: kind.includes('gate') ? 'security' : 'backend', label: body.replace(/<small>[\s\S]*?<\/small>/, '').replace(/<[^>]+>/g, '').trim(), sublabel: body.match(/<small>([\s\S]*?)<\/small>/)?.[1] ?? '', sources: [{ path: 'docs/program-trading/rules.template.html', line: 1 }] };
      if (local.length) edges.push({ from: local.at(-1)!.id, to: node.id, ...(arrow ? { label: arrow } : {}) });
      arrow = ''; local.push(node); nodes.push(node);
    }
    if (previous && local.length) edges.push({ from: previous, to: local[0].id });
    previous = local.at(-1)?.id;
  }
  // Equivalent compact captions keep every condition visible at Archify's readable width.
  const captions: Record<string, string> = {
    '한투 주문번호 · 누적 체결량 · 잔고 조회 · 매수 미체결 30초 경과 / 후보 제외 → 취소·체결 재확인': '주문번호·누적체결·잔고 확인 / 매수 미체결30초·후보제외→취소 후 체결 재확인',
    '실제 확인된 수량만 포지션·체결 로그 반영 · 결과 불명 → 추가 주문 잠금 · 같은 주문 재전송 금지': '확인 수량만 포지션·체결 반영 / 결과불명→추가 주문 잠금·동일 주문 재전송 금지',
    '네트워크 실패·결과 불명·입출금/외부거래 차이 → 정산 미확정 · 아니오 → 다음 점검 대사 · 불명 주문 자동 재전송 금지': '통신실패·결과불명·입출금/외부거래 차이→미확정 / 실패→다음 점검 대사·자동 재전송 금지',
  };
  const units = (value: string) => [...value].reduce((sum, character) => sum + (character.codePointAt(0)! > 127 ? 2 : 1), 0);
  for (const node of nodes) {
    if (captions[node.sublabel]) node.sublabel = captions[node.sublabel];
    node.width = Math.max(220, units(node.label) * 6.5 + 24, units(node.sublabel) * (view === 'summary' ? 5.1 : 4.8) + (view === 'summary' ? 32 : 10));
  }
  return { schema_version: 2, diagram_type: 'workflow', meta: { title: view === 'summary' ? '자동매매 요약 흐름' : '자동매매 상세 실행 기준', locale: 'ko', quality_profile: 'showcase', legend: { entries: { backend: { label: '운용 단계' }, security: { label: '매매 조건' } } }, output: `${workDir}/${view}.html`, repository: { url: 'git@github.com:deeptrading-lab/trading-signal-frontend.git', revision, link_mode: 'local-only' } }, lanes, nodes, edges, mainPath: nodes.slice(0, 2).map(node => node.id) };
}

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
  const outputs = [["rules.html", output]];
  for (const [name, html] of outputs) {
    const target = `docs/program-trading/${name}`;
    if (process.argv.includes("--check")) {
      if (await readFile(target, "utf8") !== html) throw new Error(`자동매매 기준 HTML을 갱신하세요: ${target}`);
    } else await writeFile(target, html);
  }
  await mkdir(workDir, { recursive: true });
  const revision = (await exec('git', ['log', '-1', '--format=%H', '--', 'docs/program-trading/rules.template.html'])).stdout.trim();
  for (const view of ['summary', 'detail'] as const) {
    const data = JSON.stringify(workflow(output, view, revision), null, 2) + '\n';
    const candidate = `${workDir}/${view}.json`;
    await writeFile(candidate, data);
    try {
      await exec(process.execPath, [archify, 'deliver', 'workflow', candidate, `${workDir}/${view}.html`, '--quality', 'showcase', '--repo-root', '.', '--json'], { env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' }, maxBuffer: 4 * 1024 * 1024 });
    } catch (error) {
      const detail = error as Error & { stdout?: string };
      throw new Error(`Archify 생성 실패. ARCHIFY_HOME에 설치 경로를 지정해 주세요.\n${detail.stdout || detail.message}`);
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
