# QA — swing-ai-note (PR-4: AI 뉴스·공시 정리 + 봇 토큰 경로)

- 실행: 2026-11-02 01:20~02:10 KST
- 대상: 브랜치 `feature/swing-ai-note`
- 근거: `docs/prd/swing-judgment.md` §5 PR-4 AC-4.1~4.6, §3-4(PR-2b 선행)
- 전제: `swing_ai_notes` 테이블은 **아직 미적용**(Supabase SQL 수동 1회 — 머지 후 사용자). 그래서 노트 저장·조회 왕복은 화면 가짜 응답으로, AI 출력은 실제 CLI 로 따로 확인했다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-4.1 테스트·타입·린트 | `npx vitest run` · `npx tsc --noEmit` · `npm run lint` · `next build` | 통과 | 테스트 **1,706 통과**(3 skip, 기존) · 타입 0 · 린트 에러 0(경고 3 기존) · 빌드 통과 | 통과 |
| AC-4.2 검증기 | `lib/swing/__tests__/note.test.ts` | enum·날짜창(30일, 미래 +1일 허용)·http(s)·권유 표현·중복·10건 | 7건 통과(`javascript:` URL·"매수하세요"·"오를 것" 요약 제거, 제목의 "목표가 상향"은 유지) | 통과 |
| AC-4.3 판정 불가침 | `lib/server/swing/__tests__/note.test.ts` 코드 검사 | 노트 저장소·실행기·라우트가 `swing_judgments`·판정 함수 미참조 | 3파일 통과(주석 제외 코드만 검사) | 통과 |
| AC-4.4 실제 CLI 스모크 | `scripts/swing/__cache__/note-smoke.mts`(1회용, DB 쓰기 없음) — claude CLI + 웹 검색 | 검증기 통과 항목 | 1차 한국가스공사 235초: 항목 2건(DART 정정공시·임시주총)이 맞았지만 **응답 끝 `}` 누락으로 파싱 실패** → 1회 보정(`parseNoteJson`) 추가. 2차 삼성전자 260초: 3건 중 2건 통과 → 빠진 1건은 같은 기사에서 뽑은 다른 사실(설비투자)이라 **중복 기준을 URL → URL+제목으로 수정**, 이후 3건 모두 통과 | 통과(수정 2건 반영) |
| AC-4.5 카드 노트 섹션 | `scripts/swing/__cache__/shot-note.mjs` — `/api/swing/note/*` 를 가짜 응답으로 바꿔 390×844 캡처 | 없음/처리 중/완료 | 없음: "AI로 정리하기" 버튼 · 처리 중: 안내 문구(aria-live) · 완료: 삼성전자 실측 3건(제목 링크·요약·날짜·출처·분류·방향, 중요 배지) + "11월 2일 01:24 정리". 실제 테이블 미적용 상태에선 GET·POST 503 → 섹션만 "불러오지 못했어요", 카드 나머지 정상 | 통과 |
| AC-4.6 봇 토큰 경로 | `__tests__/proxy.test.ts` | 맞는 토큰 + GET judgment 만 통과 | 4건 통과: 맞는 토큰 200 · 틀린/없음 401 · 다른 경로(screener)·POST(note)·하위 경로 401 · 미설정·32자 미만이면 꺼짐 | 통과 |

## 운영 메모

- 실행 시간: 실측 4분 안팎(웹 검색 포함). 워커 타임아웃 6분, 멈춘 처리(20분)는 실패로 닫힘 — 다시 요청하면 새로 만든다.
- 비용 상한: 같은 종목 6시간 재사용 + 대기 20건 상한, 예약 자동 호출 없음.
- 워커가 꺼져 있으면 pending 으로 남는다(화면 안내: "오래 걸리면 AI 워커가 꺼져 있을 수 있어요").
- 머지 후 사용자 작업: ① Supabase SQL Editor 에서 `docs/sql/swing-ai-notes.sql` 1회 실행 ② 노트를 쓰려면 로컬 `npm run all`(또는 `analyze:worker`) ③ 봇 연동 시 `SWING_BOT_TOKEN`(32자 이상)을 프론트 `.env.local`(+봇이 prod 를 부르면 Vercel env)과 봇 env 에 같은 값으로.
