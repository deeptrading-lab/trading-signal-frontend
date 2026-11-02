# QA — swing-ui-followups (차트 지지·저항 · 목록 정렬·금액 · 점검 시간 축약 카드)

- 실행: 2026-11-02 KST · 경량 반복(사용자 요청 3·4·5)
- 대상: 브랜치 `feature/swing-ui-followups`
- 전제: 사용자 Supabase SQL 적용 완료 — `alter table public.swing_judgments add column if not exists flow jsonb;`

| 항목 | 확인 | 결과 |
|---|---|---|
| 차트 참고 지지·저항 | `/stock/036460` 1440 캡처 — 지지 36,600(초록 점선)·저항 40,250(앰버 점선) 라벨, 옵션 "스윙 지지·저항"(기본 ON) | 통과 |
| 목록 정렬 | `/api/swing/screener?filter=flow&sort=met` — 한국가스공사(5/7) 첫 줄, 화면 토글·URL `?sort=met` | 통과 |
| `flow` 열 조회 | SQL 적용 뒤 API 200, 기존 행 `flow: null`(금액 칸 비표시) | 통과 |
| 순매수 금액 표시 | 응답에 금액만 덧씌운 미리보기(1440·390) — 수급 점 아래 "−93억·+22억" | 통과(실데이터는 다음 예약 집계부터) |
| 점검 시간 축약 카드 | 즉시 계산 실패 503 에 저장 행 동봉 → 카드 축약(충족·불리·주의·다시 시도) | 타입·코드 확인(실제 점검 시간 재현은 못 함) |
| 테스트·타입·린트 | 전체 1,249+ 통과 · tsc 0 · lint 에러 0 | 통과 |
