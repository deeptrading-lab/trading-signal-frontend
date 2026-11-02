# 전문 단타 트레이더 · 3라운드 교차검토

2026-11-01. 실제 KIS 주문 없이 소스·테스트·생성 HTML 검수. 참여 역할: trader / designer / planner. 각 수정은 담당 역할이 수행하고 원 검토자가 재검수했다.

|라운드|검토자 → 담당자|요청|수정 및 원 검토자 재검수|
|---|---|---|---|
|1|planner → trader|state 절삭과 독립된 전체 원장, 잔존보유 완료금지, 목표달성 개선생략|journal JSONL/전체복기, stopping 재시도, keep proposals=[] 반영. planner 코드 재검수 승인|
|1|designer → trader|요약 5단계 이내, 상세 매수/매도/복기 3구역|요약 실행·종료 각5단계, 상세3구역 분리. designer 재검수 승인|
|1|trader → designer/planner|합성모드와 실계좌 분리, 비용후 평가자산, 청산중 구분|UI/PRD 담당자 수정 후 trader 소스 재검수 승인|
|2|planner → trader|완료명령 멱등, 목표 단일상수|completed 명령 early return, RULES.sessionTarget=.01 템플릿 주입. planner 재검수 승인|
|2|designer → trader|인쇄 상세3구역이 2열에서 밀릴 가능성|상세 A4가로 인쇄3열, 노드 간격 축소. designer 재검수 승인|
|2|trader → designer/planner|lifecycle 완료판정만 사용, 실제/가상 독립 및 목표1% 명시|담당자 수정 후 trader 소스 재검수 승인|
|3|planner → trader|legacy 보유 migration, 원장손익/잔액손익, 같은tick crash 대사|legacy flatten lifecycle, ledgerNet/balanceChange, journal 마지막 거래ID 대사 및 테스트. planner 최종 재검수 승인|
|3|trader → designer/planner|목표달성 유지 한줄 안내, 단일일자 재실험 운영문서|담당자 수정 후 trader 최종 재검수 승인. 디자이너도 상세3열/상수주입 최종승인|

## 검증
- 엔진/후보/원장/갱신/계좌 테스트28건 통과: 종료중 재시도, 목표달성 keep, 원장 절삭독립/재시작 중복방지, same-tick 미저장 차단.
- npm run program:rules 및 program:rules:check: 요약/상세/통합3파일 생성 일치.
- 실제 매매 수익성 또는 실주문 검증 아님. 인쇄 CSS 구조 검토이며 실물 출력 검증은 미실시.

## 산출물
- 원장: `.local/program-trading/trades.jsonl`
- 종료 복기: `review.json`, `review.md` (완료시에만 생성)
- 다이어그램: `docs/program-trading/summary.html`, `detail.html`, `rules.html`
