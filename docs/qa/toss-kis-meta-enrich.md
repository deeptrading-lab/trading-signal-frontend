# QA — toss-kis-meta-enrich

- 실행: 2026-07-02 23:1x~23:3x KST, 로컬 dev(:3100) + 단위 테스트 8케이스
- 범위: 경량 반복 플로우(PRD 없음) — 토스 모드에서 비었던 KIS 전용 메타(업종·외국인 지분율·표준산업분류·관리종목·코스피200)를 KIS 값으로 best-effort 보강. PR#199 QA에서 문서화한 디그레이드 5건 중 3건(외인 보유율·기업개요 업종·AI 분석 메타 2줄) 해소 대상.

## 검증 결과

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 병합 규칙 | 배선 단위 테스트(모킹) | 토스 가격·등락 유지 + sector/foreignRatio 만 KIS 값 합성 | 토스 290,500원 유지·KIS 286,000원 미반영, sector="전기·전자"·foreignRatio=49.6 병합 | ✅ |
| best-effort | KIS 실패 모킹 + **라이브(KIS 야간 점검 500 실창)** | 토스 응답 무손상·무지연 통과 | 단위 통과 + 라이브 2회 호출 즉시 응답(실패 캐시 동작), `X-Data-Source: toss` 유지 | ✅ |
| 예산 캡 | 느린 KIS(80ms) vs budget(15ms) 단위 | 이번 호출 미보강, 백그라운드 로드 지속 → 다음 호출 캐시 히트 | 통과 (fetcher 1회) | ✅ |
| 실패 캐시 | throw fetcher 반복 호출 | failureTtl 내 재시도 없음, 만료 후 재시도 | 통과 | ✅ |
| 국내 전용 가드 | "AAPL" | KIS 시도 없이 미보강 | 통과 (fetcher 0회) | ✅ |
| single-flight | 동시 2호출 | fetcher 1회 | 통과 | ✅ |
| 무회귀 | typecheck/lint/전체 테스트 | 클린 | 0 에러 / 0 / **674 passed** (+8 신규) | ✅ |

## 적용 지점

- `lib/api/kis/tossEnrich.ts` (신규) — 제네릭 로더(캐시+single-flight+예산 레이스). 절대 throw 하지 않음.
- `fetchStockPrice`·`fetchStockPriceWithShares` 토스 경로 → `inquire-price` 메타(sector·foreignRatio, TTL 10분).
- `fetchStockInfo` 토스 경로 → `search-stock-info` 상세(industryName·isAdminItem·isKospi200, TTL 1시간, prod 전용이라 vts 는 실패 캐시로 자동 스킵).
- 소비 화면: 종목 수급 카드 외인 보유율, 기업개요 업종 라벨(큰 업종+상세), AI 종합분석 프롬프트 메타, 스냅샷 foreignRatioPct, (스냅샷 경유) 관리종목 필드.

## 비고

1. **라이브 데이터 확인 잔여**: 검증 시간대(23시)에 KIS `inquire-price`·`search-stock-info` 가 모두 500(야간 점검 창 — 직행 프로브로 교차 확인, 본 브랜치 무관). 성공 병합은 배선 테스트로 고정했고, **주간 장중에 토스 모드 종목 화면에서 외인 보유율·업종 표기 1회 확인 권장**.
2. 보강 호출은 X-Data-Source 추적에 기록하지 않음(주 데이터는 토스, KIS 는 보조 메타) — 헤더는 "toss" 유지가 의도된 동작.
3. KIS 폴백 모드·kis 직행 모드는 경로 자체가 무변경(보강은 토스 성공 분기 안에서만 동작).
