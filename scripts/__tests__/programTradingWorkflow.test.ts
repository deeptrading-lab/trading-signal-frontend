import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createProgramTradingWorkflow } from '../programTradingWorkflow';

const template = readFileSync('docs/program-trading/rules.template.html', 'utf8');
const revision = 'b'.repeat(40);
const make = (view: Parameters<typeof createProgramTradingWorkflow>[1]) => createProgramTradingWorkflow(template, view, revision);

describe('자동매매 도식의 판단 경로', () => {
  it('완료 조건 미충족은 복기로 넘어가지 않고 정산을 기다린다', () => {
    const diagram = make('summary');
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'confirm', to: 'pending', label: '미충족' }));
    expect(diagram.edges.filter(edge => edge.from === 'pending')).toHaveLength(0);
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'confirm', to: 'review', label: '충족' }));
  });
  it('각 매수 조건의 충족 경로만 다음 조건으로 이어진다', () => {
    const diagram = make('buy');
    for (let index = 0; index < 6; index++) {
      expect(diagram.edges).toContainEqual(expect.objectContaining({ from: `buy${index}`, to: `buy${index + 1}`, label: '충족' }));
      expect(diagram.edges).toContainEqual(expect.objectContaining({ from: `buy${index}`, to: `buy${index}no`, label: '미충족' }));
      expect(diagram.edges.filter(edge => edge.from === `buy${index}no`)).toHaveLength(0);
    }
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'buy6', to: 'buy6no', label: '1주 미만' }));
  });
  it('매도는 먼저 해당하는 한 조건만 실행하고 미해당일 때 다음 우선순위를 본다', () => {
    const diagram = make('sell');
    for (let index = 0; index < 5; index++) {
      expect(diagram.edges).toContainEqual(expect.objectContaining({ from: `sell${index}`, to: `sell${index}yes`, label: '해당' }));
      expect(diagram.edges.filter(edge => edge.from === `sell${index}yes`)).toHaveLength(0);
    }
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'sell4', to: 'hold', label: '해당 없음' }));
    expect(diagram.edges.filter(edge => edge.from === 'lock')).toHaveLength(0);
  });
  it('정산 대기·목표 달성·미달을 서로 다른 결과로 표시한다', () => {
    const diagram = make('settlement');
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'settled', to: 'wait', label: '미충족' }));
    expect(diagram.edges.filter(edge => edge.from === 'wait')).toHaveLength(0);
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'target', to: 'keep', label: '예' }));
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'target', to: 'proposal', label: '아니오' }));
  });
});
