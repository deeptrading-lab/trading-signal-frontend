# `lib/api/kis/` — KIS Developers Open API 클라이언트

본 폴더는 한국투자증권 KIS Developers Open API 의 **조회 (read-only) 호출** 만 다룬다.

PRD `stock-api-integration` §3.1·§9 q4 [RESOLVED] 정합.

## 파일 구성 — 도메인 한 뎁스 (서브 폴더 없음)

```
lib/api/kis/
├── README.md            # 본 파일
├── index.ts             # public export (주문 함수 미존재 주석 + 진입점)
├── client.ts            # axios 인스턴스 + base URL 결정 + 환경변수 가드
├── store.ts             # 인스턴스 간 공유 store 추상화(memory/Upstash) + 분산 락 + fail-soft
├── token.ts             # access_token 2단 캐시(L1 메모리 + L2 store) + 분산 single-flight
├── index-store.ts       # 국내 지수(0001/1001) L2 공유 store 래퍼(크로스-라우트 dedup)
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
| `KIS_TOKEN_STORE` | △ | ✅ | "memory" (기본/폴백) / "kv" (Upstash 공유 store) — PRD `kis-token-store` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | △ | ✅ | Upstash REST 연결(`kv` 모드). `UPSTASH_REDIS_REST_*` 도 흡수. 서버 전용 |

`KIS_APP_KEY` 또는 `KIS_APP_SECRET` 미설정 시 BFF route 가 **mock 응답** 반환 + `X-Data-Source: mock` 헤더 (Vercel preview 빌드 보호).

## 종목명 추출 함정

`inquire-price.output.bstp_kor_isnm` 은 **업종명** ("전기·전자") 이지 종목명 아닙니다.
종목명은 `hts_kor_isnm` → `prdt_name` → ticker 순서로 추출합니다 (`mappers.ts::extractStockName`).
회귀 차단 단위 테스트는 `__tests__/mappers.test.ts` 에서 검증합니다 (AC-10).

## 토큰 캐시 (PRD `stock-api-integration` + `kis-token-store`)

- **2단 캐시**: L1 = 인스턴스 메모리(`token.ts` cache+inflight), L2 = 공유 store(`store.ts`).
  - `KIS_TOKEN_STORE=memory`(기본) → L2 가 인스턴스 내 Map(사실상 no-op) → 현행 동작 무회귀.
  - `KIS_TOKEN_STORE=kv` → Upstash Redis 공유. 키 `kis:token:{env}:{appkeyhash}`(SHA-256 앞16자, 평문 금지).
- 만료 60s 전부터 자동 갱신.
- **single-flight 2단**: 인스턴스 내(Promise dedupe) + 인스턴스 간(분산 락 `SET NX PX 10s` + 폴링).
  - 락 미획득 + 폴링 만료 시 직접 발급 fallback(가용성 우선).
- **fail-soft**: store 미설정/타임아웃/에러 시 인메모리로 graceful degrade(store 는 SPOF 아님).
- 단위 테스트: `__tests__/token.test.ts`(memory 7케이스 무회귀 + kv 분산 single-flight/fallback/fail-soft),
  `__tests__/store.test.ts`(store 추상화·락·키 해시·fail-soft).

## 지수 공유 캐시 (PRD `kis-token-store` §3.3, 부수)

- 국내(`0001`/`1001`)만 L2 공유 store(`index-store.ts` `fetchIndexPriceShared`, 키 `kis:index:{code}`, TTL 30s).
- 헤더 티커·indices 라우트가 L1 인메모리 miss 시 본 래퍼 경유 → 크로스-라우트/크로스-인스턴스 dedup.
- 락 없음(TTL만) + fail-soft. L1 라우트 캐시는 그대로(L1+L2 병행). 테스트 `__tests__/index-store.test.ts`.

⚠️ **Upstash 프로비저닝은 사용자 작업** — Vercel Marketplace Upstash(무료·Tokyo) 연결 + env 주입.
미설정 시 memory 폴백이라 머지/실행에 무해.
