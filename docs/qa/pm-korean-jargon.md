# QA 리포트 — pm-korean-jargon

- 대상 PR: #148 `feature/pm-korean-jargon`
- 변경: `lib/prompts/stock/aiAnalysis.ts` PM 시스템 프롬프트 "한글 표기 원칙" 한 줄 확장
- 성격: 프롬프트 문자열 변경 (런타임 AI 호출 없는 정적 검증). 브라우저 플로우·라운드트립·반응형·DESIGN.md 동기화 대상 아님.

## AC 별 검증

| # | 항목 | 기대 | 실측 | 판정 |
|---|------|------|------|------|
| 1 | 변경 정합성 (a) | 본문 한국어화 + 영문 jargon 한글 풀이 지시 | "본문 서술은 모두 한국어 문장으로 작성하고, 라틴 문자 영어 투자 용어를 그대로 섞지 말고 한국어로 풀어 쓰세요" + thesis→투자 논거, binary event→결과가 한쪽으로 크게 갈리는 이벤트, catalyst→촉매·주가 동인, conviction→확신, overhang→매물 부담, re-rating→밸류에이션 재평가, downside/upside→하방/상방 매핑 명시 | PASS |
| 1 | 변경 정합성 (b) | 표준 약어·ticker 예외 명시 | "단 표준 기술 지표·재무 약어(RSI·MACD·ATR·PBR·PER·EV/EBITDA·ROE·ETF 등)와 ticker·고유명사는 그대로 사용해도 됩니다" 명시 | PASS |
| 2 | 직전 규칙(#145) 일관성 | 같은 "한글 표기 원칙" 단락에 충돌·중복 없이 이어지고, verdict 영문 enum 유지 문구 생존 | 기존 문장 그대로 + 같은 문단 끝에 "또한 ~" 으로 자연 연결. "단 JSON 의 verdict 필드 값만 영문 enum 으로 출력합니다." 문구 그대로 유지. JSON 스키마(L475) `"verdict": "BUY" \| ... \| "SELL"` 도 변경 없음 | PASS |
| 3 | 예외 정합성 (over-ban 회귀) | 예외 약어가 실제 프롬프트/스키마 표준 지표와 일치, 무리한 한글화 강요 없음 | 예외 약어가 같은 파일 내 실사용과 일치: MACD/RSI/ATR(L127~129 기술지표), PER/PBR/EV/EBITDA/ROE(L182 밸류에이션 지표). 한글 풀이를 요구한 용어(thesis·binary event·catalyst·conviction·overhang·re-rating·downside/upside)는 모두 일반 영문 jargon 으로 표준 약어와 겹치지 않음 → over-ban 없음 | PASS |
| 4 | 빌드/타입 | `npx tsc --noEmit` 통과, 백틱 이스케이프 무손상 | `npx tsc --noEmit` exit 0. 템플릿 리터럴(백틱) 내 추가 문장이라 추가 이스케이프 불필요, 파서 정상 통과로 백틱 균형 깨짐 없음 확인 | PASS |

## 검증 명령·출력

```
$ git diff origin/main...HEAD --stat
 lib/prompts/stock/aiAnalysis.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

$ npx tsc --noEmit ; echo $?
0
```

예외 약어 실사용 교차 확인:

```
$ grep -nE "MACD|RSI|ATR|PER|PBR|EV/EBITDA|ROE" lib/prompts/stock/aiAnalysis.ts
127:- MACD 계열 (MACD, 시그널선, 히스토그램, MACD 크로스)
128:- 모멘텀 지표 (RSI, 스토캐스틱, CCI, 윌리엄스 %R)
129:- 변동성 지표 (볼린저밴드, ATR, 표준편차)
182:5. 밸류에이션 지표 (PER, PBR, PEG, EV/EBITDA, ROE, ROA, 배당수익률)
465: ... 표준 기술 지표·재무 약어(RSI·MACD·ATR·PBR·PER·EV/EBITDA·ROE·ETF 등) ...
```

## 공통 AC 무회귀

- typecheck: exit 0 (위)
- BFF 원칙: 변경 파일은 프롬프트 문자열뿐 — route handler·fetch 무관, 무영향.
- 한글 톤: 변경 자체가 본문 한글화 강화 방향. ticker·표준 약어 예외만 영문 허용 → AGENTS.md 한글 원칙(고유명사·API 필드 예외)과 정합.
- 접근성: UI/DOM 변경 없음, 무관.

## 결론

판정: **qa-passed**. 검증 항목 4/4 통과, 실패 0건. 프롬프트 문자열 한 줄 확장으로 빌드·타입·기존 #145 규칙·예외 정합 모두 무회귀. PR 본문 `## 다음 작업` 섹션 존재 확인(handoff append 게이트 충족).
