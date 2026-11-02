export const PROGRAM_COPY = {
 guideTab:"AI 단타 가이드", programTab:"프로그램 자동매매", workspace:"단타 운용 방식", candidatesTitle:"매수 후보 목록", candidatesHint:"AI 단타 가이드와 같은 거래량 상위·외국인/기관 순매수 상위를 합쳐요. 중복 종목은 한 번만 편입해요.", noCandidates:"후보 목록이 없어 실행하지 않아요. 조회 실패·만료 시 신규 매수를 중지하고 보유분 위험 관리만 유지해요.", candidateLoading:"후보 목록 확인 중", candidateTime:"목록 확인 시각", candidatePrice:"후보 편입 기준가", candidateSources:{volume:"거래량 상위",foreign:"외국인 수급 상위",institution:"기관 수급 상위"}, candidateNote:"후보는 실제 순위 조회 결과만 사용해요. 시세와 체결은 합성이며 예시 종목으로 대체하지 않아요.", ended:"리플레이 종료 · 새 실험은 워커 종료 후 로컬 상태 파일을 별도 보관하고 다시 시작해 주세요", fault:"저장 오류 · 워커 점검 필요", execution:"현재 버전은 유효한 합성 시세에서 전량 즉시체결을 가정해요. 시세 이상 시 청산을 보류하며, 갭 발생 시 손실 한도를 초과할 수 있어요.", title:"프로그램 자동매매", subtitle:"코드는 매매하고, AI는 결과를 복기해요", mock:"합성 시세 · 가상 계좌", account:"한투 연동 전 · MOCK-0001", start:"모의 운용 시작", pause:"신규 매수 중지", flatten:"전량 청산·중지", loading:"로컬 엔진을 확인하고 있어요", disconnected:"엔진 연결 끊김", running:"운용 중", paused:"매수 중지 · 보유분 위험 관리 유지", killed:"손실 제한 도달 · 재시작 잠금", equity:"청산 비용 반영 자산", cash:"주문 가능 현금", realized:"비용후 실현손익", positions:"보유 종목", rules:"운용 규칙 v1", ruleText:"직전 3분 고가 대비 0.1% 돌파 + 거래량 1.5배 · 09:10~15:00 진입 · 최대 2종목 · 종목당 20% · 거래당 위험 예산 0.25%", exitText:"손절 −1% / 익절 +2% · 일일 자산 −2% 신규 매수 잠금 및 청산 · 15:20 청산 · 재진입 10분 대기", costs:"매수·매도 수수료 각각 0.015%, 매도세 0.2%, 편도 슬리피지 0.05% 가정. 실제 요율이 아니에요.", replay:"2초마다 가상 시간 1분 진행 · 실제 장 시간과 무관 · 워커가 켜져 있으면 화면을 닫아도 계속 운용", trades:"주문·체결 원장", empty:"아직 체결이 없어요. 시작하면 규칙을 충족한 종목만 매수해요.", review:"AI 복기용 원장", reviewText:".local/program-trading/review.md에 비용후 결과를 저장해요. AI 분석은 이 원장을 읽고 개선안을 제안하는 후속 단계이며, 실행 중 규칙을 자동으로 바꾸지 않아요.", confirmation:"가상 계좌의 모든 보유 종목을 현재 합성 가격으로 청산할까요?", buy:"매수", sell:"매도", ticker:"종목", quantity:"수량", price:"체결가", reason:"판단 근거", net:"순손익", time:"가상 시각", unavailable:"연결 복구 전 표시된 자산은 마지막 수신 값이에요.", reasons:{breakout:"돌파·거래량 충족",stop:"손절",target:"익절",close:"마감 청산",kill:"일일 손실 제한",manual:"사용자 청산"}
} as const;

export const PROGRAM_MENU_COPY = {
  title: "자동매매", subtitle: "계좌를 연결하고, 시작 버튼을 눌러 주세요.",
  accountTitle: "한국투자증권 계좌 연동", accountHint: "계좌번호와 Open API 키로 연결해요. 기존 보유·미체결이 없는 계좌를 사용해 주세요.",
  accountKeysHint: "서버에 등록된 API 키가 있으면 앱 키와 시크릿은 생략할 수 있어요.", downloadLogs: "누적 로그 파일 보기",
  appKey: "앱 키", appSecret: "앱 시크릿", accountNumber: "계좌번호 앞 8자리", accountProductCode: "계좌상품코드 2자리", environment: "계좌 유형", paper: "모의투자", live: "실전투자", connect: "계좌 연결", connecting: "연결 중…", accountConnected: "계좌 연결됨", accountUnconnected: "계좌 미연결", accountPending: "연결 확인 중", accountLocal: "인증 정보는 이 브라우저에 저장하지 않아요.",
  start: "매매 시작", stop: "매매 종료", stopping: "종료 처리 중 · 보유분 확인", finished: "거래 종료", stopped: "시작 대기", running: "자동매매 중", stale: "연결이 끊겼어요. 마지막 수신 값이에요.",
  completedHint: "새 실험은 워커를 종료하고 기존 운용 파일 전체를 보관한 뒤 다시 시작해 주세요.", target: "목표 수익률", targetPolicy: "달성 시 규칙 유지 · 미달 시 복기 가이드 생성",
  linkedEquity: "한투 조회 자산", linkedCash: "현금", checkedAt: "조회 시각",
  initial: "매매 전 자산", current: "현재 평가자산", final: "매매 후 자산", profit: "비용 후 손익", returns: "수익률", balanceHint: "시작 시점과 현재의 비용 후 평가자산을 비교해요. 종료 전에는 평가 수익률이에요.",
  showDiagram: "매매 기준 보기", diagramTitle: "자동매매 기준", closeDiagram: "다이어그램 닫기", summary: "요약 다이어그램", detail: "상세 다이어그램", diagramHint: "매수·매도 기준과 거래 후 복기 흐름", openDiagram: "크게 보기 · 인쇄", diagramMobileHint: "좌우로 밀어 전체 흐름을 확인하거나, 크게 보기를 눌러 확대해 주세요.", diagramLoading: "매매 기준 다이어그램", diagramUnavailable: "다이어그램을 불러오지 못했어요.",
  logs: "거래 로그", realtime: "2초마다 자동 갱신", empty: "아직 거래 내역이 없어요.", logUpdated: "마지막 수신", logHint: "매매 판단과 체결 결과를 파일에 계속 기록해요.", noBalance: "—",
  simulation: "합성 시세 · 가상 체결", simulationHint: "계좌 연결과 별개로 현재 엔진은 합성 시세로 모의 운용해요. 실계좌 주문은 실행하지 않아요.",
  pending: "처리 중…", errors: "연결 상태를 확인해 주세요.",
} as const;

export const PROGRAM_LIVE_COPY = {
  modes: { replay: "리플레이 · 가상 체결", vts: "한투 모의투자", prod: "실전투자 · 실제 주문" },
  starts: { replay: "리플레이 시작", vts: "한투 모의 시작", prod: "실전 매매 시작" },
  hints: { replay: "합성 시세와 가상 자산으로 운용해요. 한투 계좌에 주문하지 않아요.", vts: "한투 모의투자 계좌에 주문해요. 접수 후 체결 여부를 확인해요.", prod: "연결한 실전 계좌에 실제 주문해요. 시작하면 아래 한도로 자동 운용해요." },
  orderMethods: "매수는 지정가 · 매도는 시장가로 주문해요. 매도 체결 가격은 보장되지 않아요.",
  limits: "최대 2종목 · 종목당 자산 20% · 일일 손실 2% 시 매수 잠금·청산", modeMismatch: "엔진과 연결 계좌의 유형이 달라요. 같은 유형으로 연결해 주세요.", connectFirst: "운용할 계좌를 먼저 연결해 주세요.",
  estimatedFees: "체결별 수수료·세금 정산 전에는 순손익을 확정하지 않아요. 최종 손익과 수익률은 한투 계좌 잔액 확인 후 표시해요.",
  holdings: "세션 보유 잔량", holdingTicker: "종목", holdingQuantity: "보유 수량", positionEmpty: "보유 잔량 없음",
  fault: "운용 확인 필요", reconciledAt: "마지막 계좌 대사",
  maxOrder: "매수 1회 한도", staleBalance: "잔고 대사 대기 · 수익률 미확정", movementDetected: "입출금·외부 거래 차이 확인 필요 · 정산 미확정", orderLock: "주문 확인 중 · 신규 주문 대기", orderLimitPending: "주문 한도 확인 중",
  actualBalance: "한투 계좌의 시작·현재 평가자산을 비교해요. 종료 자산은 주문·체결·잔고 확인 후 확정해요.", accountMovements: "운용 중 입출금·수동매매는 계좌 수익률에 포함될 수 있어요.",
  unknown: "주문 결과 확인 필요 · 추가 주문 잠금", unknownHint: "주문이 접수됐을 수 있어요. 한투 주문 내역과 잔고를 확인해 주세요. 원주문 확인 전 추가 매수·매도를 보내지 않고 종료 요청은 유지해요.", pendingOrders: "미완료 주문", stopping: "종료 처리 중 · 미체결 정리와 잔고 확인", awaiting: "접수·체결 확인 중", partial: "부분 체결", orderLogs: "주문 상태", fills: "확인된 체결", orderId: "한투 주문번호", orderQuantity: "주문 / 체결 수량", orderStatus: "상태", orderTime: "주문 시각", fillTime: "체결 확인 시각", executionPrice: "평균 체결가", noOrders: "아직 주문이 없어요.",
  statuses: { intent: "전송 기록됨", open: "접수 · 체결 대기", cancelling: "취소 확인 중", submitting: "전송 기록됨", accepted: "접수 · 체결 대기", pending: "체결 대기", partial: "부분 체결", filled: "전량 체결", cancelPending: "취소 확인 중", cancelled: "취소 확인", rejected: "거절", unknown: "결과 확인 필요" },
} as const;
