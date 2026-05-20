/**
 * 본 화면은 선행 PRD `frontend-architecture-restructure` 의 placeholder 다.
 *
 * 이전 BTC 단일 sizing UI 는 BE 인터페이스 정정으로 폐기되었고,
 * 후속 PRD `workbench-analyze-rebuild` 가 새 BE 6블록 응답 기반 화면을 구현한다.
 *
 * 본 PR 시점에서는 직접 호출이 없으며, 빌드/타입체크/lint 통과가 유일한 목적이다.
 */

export default function Home() {
  return (
    <main className="mobileShell">
      <header className="topBar">
        <div>
          <p>TradingSignalEngine</p>
          <h1>화면 재구성 중</h1>
        </div>
      </header>

      <section className="heroDecision" aria-live="polite">
        <div className="decisionLabel">준비 중</div>
        <h2>새 분석 화면 도입 예정</h2>
        <p>
          엔진 인터페이스 정정에 맞춰 분석 화면을 새로 만들고 있어요. 후속 PRD
          <code> workbench-analyze-rebuild </code>가 머지되면 ticker · 자본 · 목표 수익률 · 기간 ·
          최대 손실률을 입력해 분석 결과를 확인할 수 있어요.
        </p>
      </section>

      <footer className="mobileFooter">
        <span>본 페이지는 데이터 흐름·폴더 구조 재정비 단계의 placeholder 입니다.</span>
        <span>투자 판단 보조 자료입니다. 자동 주문이나 수익 보장을 의미하지 않습니다.</span>
      </footer>
    </main>
  );
}
