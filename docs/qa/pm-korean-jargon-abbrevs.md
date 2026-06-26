# QA 리포트 — pm-korean-jargon-abbrevs

- 대상 PR: #156 (`feature/pm-korean-jargon-abbrevs`)
- 변경 파일: `lib/prompts/stock/aiAnalysis.ts` (1 insertion, 1 deletion)
- 성격: PM 시스템 프롬프트 "한글 표기 원칙"의 영문 약어 예외 화이트리스트 한 줄 보강 (프롬프트 문자열 정적 변경)
- 검증 방식: 정적 검증만 수행. 브라우저 플로우·라운드트립·반응형·DESIGN.md 토큰 동기화는 비대상 (런타임·UI·토큰 변경 없음).

## AC 별 검증

| # | AC | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| 1 | 변경 정합성 (additive) | `git diff origin/main...HEAD -- lib/prompts/stock/aiAnalysis.ts` | 화이트리스트 절에 `EPS·CAGR·YoY·QoQ` 추가, `지수명(KOSPI·KOSDAQ)`·`52주 신고가/신저가` 표준 표현 명시. 다른 규칙 미변경 | 정확히 1 라인(465) 변경. `…ROE·EPS·CAGR·YoY·QoQ·ETF 등)·지수명(KOSPI·KOSDAQ)·52주 신고가/신저가 등 표준 표현과 ticker·고유명사…` 로 예외만 확대. 등급 차단·verdict enum·한국어화 서술부는 글자 단위 동일 | 통과 |
| 2 | 한글화 방향(#148) 무훼손 | 매핑 7종(`thesis → 투자 논거`, `binary event`, `catalyst → 촉매`, `conviction → 확신`, `overhang → 매물 부담`, `re-rating`, `downside/upside`) grep | 7종 모두 보존 | 7종 전부 OK | 통과 |
| 3 | verdict enum 차단 규칙(#145) 일관성 | line 465 + 스키마(line 475) 대조 | "JSON verdict 필드 값만 영문 enum" 규칙 유지 + 본문 영문 등급 용어 노출 차단 유지 | line 465 규칙 그대로, line 475 스키마 `"BUY"|"OVERWEIGHT"|…|"SELL"` 와 정합. 모순·중복 없음 | 통과 |
| 4 | 새 약어 충돌 없음 | `EPS CAGR YoY QoQ KOSPI KOSDAQ` 각 등장 횟수 grep | 각 1회 (예외 목록에만 단독 등재, 한글화 대상과 미중복) | 6종 모두 정확히 1회 | 통과 |
| 5 | 타입체크 / 템플릿 리터럴 무결성 | `npx tsc --noEmit` + 변경 라인 백틱 이스케이프 점검 | exit 0, 백틱 깨짐 없음 | `tsc exit: 0`. line 465의 이스케이프 백틱(`(Overweight)` 병기 예시) 2개 온전. 추가 약어는 백틱 미포함 | 통과 |

## 공통 AC

- typecheck: `npx tsc --noEmit` exit 0.
- lint/build: 프롬프트 문자열 단일 라인 변경으로 lint·build 영향권 밖 (런타임/JSX/import 무변경). tsc 통과로 충분 검증.
- BFF 원칙 / 한글 톤 / 접근성: 본 변경은 모델 프롬프트 텍스트로 사용자 노출 UI·route handler·코드 경로 무관 → 무회귀.

## 에지 케이스

- 템플릿 리터럴 깨짐: 추가 토큰(`EPS·CAGR·YoY·QoQ`, `KOSPI·KOSDAQ`, `52주 신고가/신저가`)에 백틱·`${}`·역슬래시 미포함 → 이스케이프 위험 없음. tsc 통과로 확정.
- 규칙 모순: 동일 단락 내 (등급 영문 차단 ↔ verdict enum 허용 ↔ 본문 한국어화 ↔ 표준 약어 예외) 4개 규칙이 상호 배타적 적용 범위(본문 서술 vs JSON verdict 필드 vs 표준 약어)로 분리돼 충돌 없음.

## 판정

- 5개 AC 전부 통과, 실패 0건.
- PR 본문 `## 다음 작업` 섹션 존재 확인 → 라벨 게이트 통과.
- 판정: **qa-passed**
