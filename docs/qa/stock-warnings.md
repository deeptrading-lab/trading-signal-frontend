# QA — stock-warnings (토스 매수 유의사항: AI 분석 주입 + 종목 상세 배지)

- 실행: 2026-07-03 12:10~12:20 KST (장중, 금요일) — QA 역할
- 환경: 로컬 dev (TOSS 키 설정, `MARKET_DATA_SOURCE=toss`) + 유닛 테스트(vitest)
- 대상 커밋: `feature/stock-warnings` (PRD → 로더 → AI 주입 → 배지 UI → 칩 뷰모델 승격)

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 키 없음 | 유닛: `isTossConfigured=false` 로 `fetchActiveWarnings("005930")` | 빈 배열 + 토스 무호출 | `[]` + `tossGet` 0회 (`warnings.test.ts`) | ✅ |
| AC-2 무경보 종목 | `GET /api/stock/warnings?ticker=005930` (dev 실서버) | `{warnings: []}` + `X-Data-Source: toss` | 동일 | ✅ |
| AC-3 지정 종목 | `?ticker=111710` (단기과열, KRX 7/2~7/6 지정 — 콕스톡 대조) | `OVERHEATED` 1건 | `{"warningType":"OVERHEATED","exchange":null,"startDate":null,"endDate":null}` | ✅ |
| AC-3′ 장중 실샘플 | 당일 거래량 상위(#203 volume-rank) 7종목 일괄 프로브 | 급등락 종목에서 지정 검출 | **001210 금호전기·002990 금호건설 = `INVESTMENT_WARNING`** (각 -24.9%·-18.8% 급락 중) | ✅ |
| AC-4 critical 매핑 | 유닛: 정리매매·투자위험 → 라벨·심각도 | `badge-critical` 계열 | `copy/__tests__/warnings.test.ts` 통과 | ✅ |
| AC-5 unknown code | 유닛: `FUTURE_NEW_CODE` | 폴백 라벨 "거래소 경보"·info, throw 없음 | 통과 (로더 통과 + 칩 폴백 모두) | ✅ |
| AC-6 실패 fail-soft | 유닛: `tossGet` reject → 재호출 | `[]` + 실패 캐시(재시도 억제) | 통과. BFF 형식오류는 400 (`?ticker=00%205930` 실측) | ✅ |
| AC-7 날짜 null | AC-3 실응답 자체가 null | 기간 미표시 설계라 무영향 | 실측 null 확인 — 칩은 warningType 만 사용 | ✅ |
| AC-8 캐시 | 유닛: TTL 내 재호출·동시 호출·61s 경과 | 1콜 / 1콜(single-flight) / 재조회 | 3케이스 통과 | ✅ |

## 라운드트립 (실서버, 장중)

- `GET /api/stock/warnings?ticker=001210` → 200, `X-Data-Source: toss`, `INVESTMENT_WARNING` — 51~278ms.
- `/stock/001210` 페이지 렌더 200 (dev, 헤더 포함 정상 컴파일).
- 회귀: 전체 vitest **726 passed / 0 failed**, `tsc --noEmit` 클린, `next build` 성공, eslint 클린.

## 에지 케이스 / 한계

- **AI 주입 실서버 검증 미실시** — 12-에이전트 실분석은 토큰·시간 비용이 커서 유닛+타입 수준으로
  갈음(주입부는 3줄: allSettled 합류 → `formatPriceContextForPrompt` 5번째 인자 → 조건부 1줄).
  다음 실분석 때 `[ai-분석]` 로그의 `시장경보 컨텍스트 주입 —` 라인으로 확인 가능.
- **칩 시각 확인 미실시** — 브라우저 자동화 미연결. 칩은 조건부 렌더 + 기존 `badge-*` 클래스라
  리스크 낮음. 확인 경로: dev 서버에서 `/stock/001210` (투자경고 칩 1개 기대), `/stock/005930`
  (칩 없음 기대). **사용자 1회 확인 권장.**
- VI 칩은 발동 수 분 내 실검증 기회가 필요 — 장중 급등락 시 자연 확인(60s 폴링).
- 키 없는 동료 로컬의 실서버 확인은 본 환경(키 있음)에선 불가 — AC-1 유닛 + BFF `none` 분기
  코드 검증으로 갈음.
