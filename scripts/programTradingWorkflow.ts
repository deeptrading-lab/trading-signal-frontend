import { RULES } from '../lib/server/programTrading/engine';

type WorkflowNode = { id: string; lane: string; col: number; type: string; label: string; sublabel: string; tag?: string; icon?: string; width?: number; sources: { path: string; line: number }[] };
type WorkflowEdge = { from: string; to: string; label?: string; role?: string; variant?: string; fromSide?: string; toSide?: string; route?: string };
type Step = { label: string; note: string; branch: string };
type View = 'summary' | 'detail' | 'buy' | 'sell' | 'settlement';

// Keep every source condition in rules.template.html; only presentation is reorganized here.
export function createProgramTradingWorkflow(html: string, view: View, revision: string) {
  const article = html.match(new RegExp(`<article class="${view === 'summary' ? 'summary' : 'detail'}">([\\s\\S]*?)</article>`))?.[1];
  if (!article) throw new Error(`다이어그램 원본이 없어요: ${view}`);
  const sections = [...article.matchAll(/<section>([\s\S]*?)<\/section>/g)].map(section => {
    const steps: Step[] = [];
    for (const [, kind, body] of section[1].matchAll(/<div class="(node[^"]*|branch)">([\s\S]*?)<\/div>/g)) {
      if (kind === 'branch') { steps.at(-1)!.branch = body.replace('↳ ', ''); continue; }
      steps.push({ label: body.replace(/<small>[\s\S]*?<\/small>/, '').trim(), note: body.match(/<small>([\s\S]*?)<\/small>/)?.[1] ?? '', branch: '' });
    }
    return steps;
  });
  const lanes: { id: string; label: string }[] = [];
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const sources = [{ path: 'docs/program-trading/rules.template.html', line: 1 }];
  const row = (id: string, label: string) => lanes.push({ id, label: label.replace(/^\d+\s*[.·]\s*/, '') });
  const node = (id: string, lane: string, col: number, label: string, sublabel: string, type = 'backend', tag?: string) => {
    nodes.push({ id, lane, col, label, sublabel, type, sources, ...(tag ? { tag } : {}), icon: type === 'security' ? 'decision' : 'active' });
    return id;
  };
  const edge = (from: string, to: string, label?: string, exception = false) => edges.push({ from, to, ...(label ? { label } : {}), ...(exception ? { role: 'branch', variant: 'security' } : {}) });
  const chain = (ids: string[]) => ids.slice(1).forEach((id, index) => edge(ids[index], id));
  const pct = (value: number) => Number((value * 100).toFixed(4));
  let mainPath: string[] = [];
  const titles: Record<View, string> = { summary: '자동매매 · 전체 흐름', detail: '자동매매 · 매수 조건', buy: '자동매매 · 매수 조건', sell: '자동매매 · 매도 우선순위', settlement: '자동매매 · 종료와 정산' };

  if (view === 'summary') {
    const [start, finish] = sections;
    const steps = [
      ['connect', '01 · 시세 준비', '토스 시세 연결', start[0].note],
      ['ready', '02 · 시작 전 확인', '시작 준비 확인', '토스 시세 · 정규장 · AI 단타 후보'],
      ['run', '03 · 운용', '사용자가 시작 → 자동매매', '매도 위험 관리 우선 · 조건 충족 매수'],
      ['stop', '04 · 종료', '종료 요청', `종료 버튼 · 일일 손실 ${pct(RULES.dailyLoss)}% · 15:20`],
      ['confirm', '05 · 완료 확인', '종료 조건을 모두 충족했나요?', '가상 보유 0'],
      ['review', '06 · 결과 판단', `수익률이 목표 ${pct(RULES.sessionTarget)}% 이상인가요?`, '전체 가상 체결 원장으로 종료 복기'],
    ];
    for (const [id, lane, label, note] of steps) { row(id, lane); node(id, id, 0, label, note, ['ready', 'confirm', 'review'].includes(id) ? 'security' : 'backend', id === 'run' ? '가상 체결·보유 반영' : undefined); }
    chain(['connect', 'ready', 'run', 'stop', 'confirm']);
    edge('confirm', 'review', '충족');
    node('pending', 'confirm', 1, '종료·정산 대기', '유효한 시세까지 가상 청산 대기', 'security', '가상 보유가 남으면 종료 대기'); edge('confirm', 'pending', '미충족', true);
    node('keep', 'review', 1, '규칙 유지', '목표 달성 · 보완 제안 없음'); edge('review', 'keep', '예');
    row('improve', '07 · 미달 시 검토'); node('improve', 'improve', 0, '검토 가이드 생성', finish[4].note, 'backend', '실행 중 규칙 자동 변경 없음'); edge('review', 'improve', '아니오');
    mainPath = ['connect', 'ready', 'run', 'stop', 'confirm', 'review', 'improve'];
  } else if (view === 'buy' || view === 'detail') {
    const steps = sections[0];
    const labels = ['로컬 모의 시작 조건인가요?', '매수 가능한 시간인가요?', '종목이 유효 후보에 포함되나요?', '보유·재진입 조건을 충족하나요?', '시세·호가가 유효한가요?', '돌파·거래량을 함께 충족하나요?', '주문 수량 계산', '가상 매수 체결'];
    const names = ['시세 준비', '거래 시간', '후보 유효성', '보유·재진입', '시세 확인', '진입 신호', '수량·예산', '가상 체결'];
    const failures = ['시작 차단', '신규 매수 대기', '신규 매수 중지', '해당 후보 대기', '해당 후보 보류', '해당 후보 제외', '주문하지 않음'];
    const failNotes = ['토스 시세 키와 추천 조회 확인', '보유분 위험 관리 유지', '목록 회복 후 직접 시작', '보유 한도·재진입 대기 재확인', '유효한 최신 시세에서 다시 확인', '다음 후보를 점검', '계산 수량이 1주 미만'];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]; const id = `buy${index}`; row(id, `${index + 1}. ${names[index]}`);
      let note = step.note;
      let tag: string | undefined;
      if (index === 0) tag = '사용자 시작 요청';
      if (index === 1) { note = 'KST 09:10~15:00 미만'; tag = '거래일·장 상태 확인 · 손실 잠금 없음'; }
      if (index === 3) { note = `가상 보유 ${RULES.maxPositions}종목 미만`; tag = `미보유 · 가상 매도 후 ${RULES.cooldown}분 대기`; }
      if (index === 4) tag = '유효한 양수 시세 · 양방향 호가';
      if (index === 5) { note = '직전 3분 고가 +0.1% 초과 · 거래량 1.5배 이상'; tag = '완료 분봉 3개와 진행분 거래량 비교'; }
      if (index === 6) { note = `최소(자산 ${pct(RULES.allocation)}%, 위험 ${pct(RULES.risk)}%, 현금)`; tag = step.note; }
      if (index === 7) { note = '가상 매수 후 원장 기록'; tag = step.note; }
      node(id, id, 0, labels[index], note, index < 6 ? 'security' : 'backend', tag);
      if (index < 7) { node(`${id}no`, id, 1, failures[index], failNotes[index], 'security'); edge(id, `${id}no`, index === 6 ? '1주 미만' : '미충족', true); edge(id, `buy${index + 1}`, index === 6 ? '1주 이상' : '충족'); }
    }
    mainPath = steps.map((_, index) => `buy${index}`);
  } else if (view === 'sell') {
    const steps = sections[1];
    row('orders', '01 · 보유 시세 확인'); node('orders', 'orders', 0, '보유 종목부터 시세 점검', '토스 최근 체결과 호가 확인', 'backend', '시세 유효 여부 확인');
    row('unknown', '02 · 시세 유효성'); node('unknown', 'unknown', 0, '가상 매도에 유효한 시세인가요?', '정규장 · 5초 이내 체결과 호가', 'security');
    node('lock', 'unknown', 1, '가상 청산 대기', '유효한 시세까지 보유 유지', 'security'); edge('orders', 'unknown'); edge('unknown', 'lock', '미충족', true);
    const actions = ['가상 보유 전량 청산', '청산 · 신규 매수 잠금', '청산 · 운용 중지', '가상 손절', '가상 익절'];
    for (let index = 0; index < 5; index++) {
      const id = `sell${index}`; const step = steps[index + 2]; row(id, `우선순위 ${index + 1}`);
      const labels = ['사용자가 종료를 요청했나요?', `일일 자산이 −${pct(RULES.dailyLoss)}%에 도달했나요?`, '마감 청산 시각인가요?', `매수가 대비 −${pct(RULES.stop)}% 이하인가요?`, `매수가 대비 +${pct(RULES.target)}% 이상인가요?`];
      node(id, id, 0, labels[index], step.note, 'security');
      node(`${id}yes`, id, 1, actions[index], '가상 매도 후 보유·현금 반영', 'backend', '슬리피지와 비용을 반영'); edge(id, `${id}yes`, '해당');
      edge(index === 0 ? 'unknown' : `sell${index - 1}`, id, index === 0 ? '확인' : '해당 없음');
    }
    row('hold', '조건 미해당'); node('hold', 'hold', 0, '보유 · 다음 점검', '상위 조건부터 다시 확인'); edge('sell4', 'hold', '해당 없음');
    mainPath = ['orders', 'unknown', ...actions.map((_, index) => `sell${index}`), 'hold'];
  } else {
    const steps = sections[2];
    const data = [
      ['clean', '01 · 청산', '잔여 보유 가상 청산', steps[0].note],
      ['settled', '02 · 종료 조건', '모든 종료 조건을 충족했나요?', '가상 보유 0'],
      ['balance', '03 · 손익 확정', '전·후 자산과 수익률 확정', steps[2].note],
      ['ledger', '04 · 기록', '전체 가상 체결 원장 보존', steps[3].note],
      ['target', '05 · 목표 판단', `목표 ${pct(RULES.sessionTarget)}% 이상인가요?`, '세션 시작 목표와 종료 결과 비교'],
      ['proposal', '06 · 미달 시 검토', '원인·검증 가이드 생성', steps[5].note],
    ];
    for (const [id, lane, label, note] of data) { row(id, lane); node(id, id, 0, label, note, ['settled', 'target'].includes(id) ? 'security' : 'backend'); }
    edge('clean', 'settled'); edge('settled', 'balance', '충족'); edge('balance', 'ledger'); edge('ledger', 'target'); edge('target', 'proposal', '아니오');
    node('wait', 'settled', 1, '종료 대기', '최근 체결과 호가 확인', 'security', '시세가 유효하면 다시 점검'); edge('settled', 'wait', '미충족', true);
    node('costs', 'ledger', 1, '가상 체결 비용 가정', `슬리피지 ${pct(RULES.slippage)}% · 수수료 ${pct(RULES.fee)}% · 매도세 ${pct(RULES.sellTax)}%`, 'database', '가상 체결 시 반영'); edge('ledger', 'costs', '비용');
    node('keep', 'target', 1, '규칙 유지', '목표 달성 · 보완 제안 없음'); edge('target', 'keep', '예');
    mainPath = data.map(([id]) => id);
  }
  for (const relation of edges) {
    const from = nodes.find(item => item.id === relation.from)!;
    const to = nodes.find(item => item.id === relation.to)!;
    if (from.col === to.col && from.lane !== to.lane) Object.assign(relation, { fromSide: 'bottom', toSide: 'top' });
  }
  const units = (value: string) => [...value].reduce((sum, character) => sum + (character.codePointAt(0)! > 127 ? 2 : 1), 0);
  for (const item of nodes) item.width = Math.max(240, units(item.label) * 6.5 + 24, units(item.sublabel) * 4.8 + 16, units(item.tag ?? '') * 4.8 + 24);
  return { schema_version: 2, diagram_type: 'workflow', meta: { title: titles[view], locale: 'ko', quality_profile: 'showcase', legend: { entries: { backend: { label: '실행·결과' }, security: { label: '확인·대기' }, database: { label: '비용 가정' } } }, output: `.archify/program-rules/${view}.html`, repository: { url: 'git@github.com:deeptrading-lab/trading-signal-frontend.git', revision, link_mode: 'local-only' } }, lanes, nodes, edges, mainPath };
}

