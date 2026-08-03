# AI 단타 Compact Memory (자동 생성)
updated:2026-07-28T06:38:23.717Z | objective:비용후 순기대값↑·낙폭↓ | goal-zone:일 +1~2%(관찰값·보장아님)
SHADOW=참고만/하드게이트금지 | ACTIVE도 손실킬·15:00진입금지·15:20청산·하드스톱 완화금지
<!-- AI_CONTEXT_START -->
- S:SHADOW | R:AI-49DC5B9A | T:CALIBRATION | IF:높은 매수 확신 구간 | DO:고확신=강화 금지, 실제체결·OOS로 방향성 재검증 | AVOID:반복틱 승률을 독립표본으로 해석 | E:d=1,n=3,tr=7,W/L=2/5,net=-47524 | UNTIL:2026-08-04 | kw:conviction,OOS,독립표본,반사실
- S:SHADOW | R:AI-4EC46D87 | T:ENTRY | IF:저항근접+돌파확인전/거래량부족+확신 애매 | DO:돌파안착·거래량동반 재확인, 그전에는 매수 확신을 낮게 유지 | AVOID:확인필요를 적고 즉시진입 | E:d=1,n=3,tr=7,W/L=1/6,net=-47524 | UNTIL:2026-08-04 | kw:저항,거래량,돌파확인,확신애매
- S:SHADOW | R:AI-7563C592 | T:REENTRY | IF:동일종목 손절후 재진입 | DO:새 구조이벤트+거래량 확인 전 재진입 보류 | AVOID:확신 점수만 재충족한 반복진입 | E:d=1,n=2,tr=7,W/L=1/6,net=-47524 | UNTIL:2026-08-04 | kw:재진입,손절후,구조변화,종목집중
- S:SHADOW | R:AI-FA2B6DEA | T:EXIT | IF:보유중 저항/흐름둔화인데 SELL판단없음 | DO:목표여력축소·논거훼손 시 선제청산 점수 재평가 | AVOID:모든 청산을 스톱에 의존 | E:d=1,n=3,tr=7,W/L=1/6,net=-47524 | UNTIL:2026-08-04 | kw:선제청산,스톱의존,논거훼손,목표여력
<!-- AI_CONTEXT_END -->
퇴역 규칙은 archive/retired.ndjson; 원시 데이터·긴 서사는 주입하지 않음.
