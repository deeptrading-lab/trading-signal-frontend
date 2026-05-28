# `lib/api/kis/` — KIS Developers Open API 클라이언트

본 폴더는 한국투자증권 KIS Developers Open API 의 **조회 (read-only) 호출** 만 다룬다.

PRD `stock-api-integration` §3.1·§9 q4 [RESOLVED] 정합.

## 파일 구성 — 도메인 한 뎁스 (서브 폴더 없음)

```
lib/api/kis/
├── README.md            # 본 파일
├── index.ts             # public export (주문 함수 미존재 주석 + 진입점)
├── client.ts            # axios 인스턴스 + base URL 결정 + 환경변수 가드
├── token.ts             # access_token 발급 + 캐시 + 갱신 + single-flight
├── price.ts             # 현재가 / 일자별 시세
├── search.ts            # symbols.json substring 검색 + corp_code 매핑
├── mappers.ts           # KIS snake_case → 클라이언트 친화 스키마 (종목명 우선순위)
├── errors.ts            # KIS 에러 → ApiError 변환
├── types.ts             # KIS 응답 + 클라이언트 친화 타입 (종목명 vs 업종명 함정 주석)
└── symbols.json         # 수동 시드 (KOSPI/KOSDAQ 대형주) + corp_code 매핑
```

## ⚠️ 주문 / 매매 API — 본 모듈에서 절대 추가하지 마세요

사용자가 **실전계좌 (72245021)** 도 보유합니다. `KIS_ENV=prod` 환경에서 실수 주문 위험이 매우 큽니다.

주문 API (KIS `order-cash`, `order-credit`, `order-rvsecncl`) 도입은 **별도 PRD `stock-order-integration`** 의 책임이며, 다음 **다중 게이트** 가 의무입니다:

### 후속 주문 PRD 진입 체크리스트

- [ ] **주문 BFF route 생성 시 reviewer 다중 확인** — `app/api/order/*` 는 본 PR-A 에서 의도적으로 미생성.
- [ ] **비밀번호 재확인 게이트** — 매 주문 시 계좌비밀번호 입력 + 서버 측 검증. 클라이언트 sessionStorage 캐싱 금지.
- [ ] **dry-run 모드** — `KIS_DRY_RUN=1` 환경변수 활성 시 모든 주문 호출이 mock 응답. 신규 개발자 환경 기본값.
- [ ] **금액 상한 게이트** — 단일 주문 최대 금액 환경변수 (`KIS_ORDER_MAX_KRW`). 초과 시 즉시 거절 + 한글 안내.
- [ ] **audit log** — 모든 주문 시도 / 성공 / 실패를 별도 저장 (DB or 파일). 사용자 식별자·시각·금액·종목·결과 보존.
- [ ] **빌드 타임 가드 검토** — `next.config.ts` 에서 `KIS_ENV=prod` AND `app/api/order/*` 존재 시 빌드 fail (선택, 후속 PRD 결정).
- [ ] **모의 환경 우선 검증** — 실전 환경 (`KIS_ENV=prod`) 진입 전 모의 환경 (`KIS_ENV=vts`) 에서 모든 게이트 통과 의무.

## 환경변수

| 변수 | 필수 | 본 PR-A 사용 | 설명 |
|---|---|---|---|
| `KIS_APP_KEY` | ✅ | ✅ | 36자 App Key |
| `KIS_APP_SECRET` | ✅ | ✅ | 180자 App Secret |
| `KIS_ACCOUNT_NO` | ✅ | ❌ | 8자리 계좌번호 (조회는 미사용, 주문에서 필요) |
| `KIS_ACCOUNT_PRODUCT_CD` | ✅ | ❌ | 2자리 상품코드 (조회는 미사용) |
| `KIS_ENV` | △ | ✅ | "vts" (모의, 기본) / "prod" (실전, 권장 X) |
| `KIS_TOKEN_STORE` | △ | △ | "memory" (기본) / "kv" (placeholder, 본 PR-A 미구현) |

`KIS_APP_KEY` 또는 `KIS_APP_SECRET` 미설정 시 BFF route 가 **mock 응답** 반환 + `X-Data-Source: mock` 헤더 (Vercel preview 빌드 보호).

## 종목명 추출 함정

`inquire-price.output.bstp_kor_isnm` 은 **업종명** ("전기·전자") 이지 종목명 아닙니다.
종목명은 `hts_kor_isnm` → `prdt_name` → ticker 순서로 추출합니다 (`mappers.ts::extractStockName`).
회귀 차단 단위 테스트는 `__tests__/mappers.test.ts` 에서 검증합니다 (AC-10).

## 토큰 캐시

- 인스턴스 메모리 only (`token.ts`).
- 만료 60s 전부터 자동 갱신.
- 동시 호출은 single-flight 로 dedupe (Promise dedupe).
- 단위 테스트 (`__tests__/token.test.ts`) 가 4가지 동작 검증 (AC-6).
