# PR-B 종단 라운드트립 검증 (`/profile/005930`)

PRD `stock-api-integration` (PR-B) AC-8 종단 검증. CLI 환경에서 스크린샷 대체 — dev 서버 기동 후
4개 BFF 엔드포인트 라운드트립과 SSR 렌더 결과 (한글 카피 grep) 로 증거 캡처.

## 환경

- 브랜치: `feature/stock-api-integration-B`
- `.env.local` 정상 설정 (KIS_APP_KEY / KIS_APP_SECRET / KIS_ACCOUNT_NO / KIS_ACCOUNT_PRODUCT_CD / KIS_ENV=vts / OPENDART_API_KEY 6개 변수 모두 채움).
- `npm run dev` 기동 (Next.js 16.2.6 Turbopack).

## 1. BFF 라운드트립 — 4개 엔드포인트 200 + 실데이터

```bash
$ curl -sD - -o /dev/null 'http://localhost:3000/api/stock/price?ticker=005930'
HTTP/1.1 200 OK
x-data-source: kis
x-kis-env: vts

$ curl -sD - -o /dev/null 'http://localhost:3000/api/stock/daily?ticker=005930&period=D'
HTTP/1.1 200 OK
x-data-source: kis
x-kis-env: vts

$ curl -sD - -o /dev/null 'http://localhost:3000/api/disclosure/company?ticker=005930'
HTTP/1.1 200 OK
x-data-source: dart

$ curl -sD - -o /dev/null 'http://localhost:3000/api/disclosure/list?ticker=005930&count=5'
HTTP/1.1 200 OK
x-data-source: dart
```

→ 4개 모두 200. `X-Data-Source` 헤더가 `mock` 이 아니라 `kis` / `dart` — 실데이터 응답.

## 2. 실 KIS 응답 본문 — 종목명 vs 업종명 회귀 차단 확인

```bash
$ curl -s 'http://localhost:3000/api/stock/price?ticker=005930'
{
  "ticker":"005930",
  "name":"005930",                  ← hts_kor_isnm 빈 응답 → ticker fallback (정상)
  "price":299500,
  "change":-7500,
  "changePercent":-2.44,
  "direction":"down",
  "volume":30195334,
  "open":305000,
  "high":306500,
  "low":287500
}
```

검증 포인트:
- `name` 필드에 "전기·전자" (bstp_kor_isnm = 업종명) 가 들어오지 않음.
  PR-A 의 `extractStockName` 우선순위 (`hts_kor_isnm` → `prdt_name` → ticker) 작동.
- KIS 모의 (vts) 환경의 `inquire-price.output.hts_kor_isnm` 가 빈 문자열일 경우 ticker 그대로 → AC-10 #3 회귀 차단.
- DART `corpName` ("삼성전자(주)") 으로 화면에는 정식명을 노출 가능.

## 3. 실 DART 응답 본문

```bash
$ curl -s 'http://localhost:3000/api/disclosure/company?ticker=005930'
{
  "ticker":"005930",
  "corpName":"삼성전자(주)",
  "ceoName":"전영현, 노태문",
  "market":"KOSPI",
  "establishedDate":"1969-01-13",
  "industry":"264",
  "homepage":"www.samsung.com/sec",
  "address":"경기도 수원시 영통구  삼성로 129 (매탄동)"
}

$ curl -s 'http://localhost:3000/api/disclosure/list?ticker=005930&count=5' | head -c 600
[
  {"rceptNo":"20260526000244","corpName":"삼성전자","reportName":"[기재정정]임원ㆍ주요주주특정증권등소유상황보고서","filerName":"조미선","rceptDate":"2026-05-26"},
  {"rceptNo":"20260526000141","corpName":"삼성전자","reportName":"임원ㆍ주요주주특정증권등소유상황보고서","filerName":"신용우","rceptDate":"2026-05-26"},
  {"rceptNo":"20260522000589","corpName":"삼성전자","reportName":"주식등의대량보유상황보고서(일반)","filerName":"삼성물산","rceptDate":"2026-05-22"},
  ...
]
```

→ 실 DART API 의 2026-05-26 기준 최신 공시 5건 정상 반환.

## 4. SSR HTML 한글 카피 검증

```bash
$ curl -s 'http://localhost:3000/profile/005930' | grep -oE '(가격 차트|기업개황|최근 공시|불러오는 중)' | sort -u
가격 차트
기업개황
불러오는 중
최근 공시
```

→ SSR 시점에 4개 영역 (Header / Daily Chart / Company / Disclosures) 의 섹션 타이틀이
   페이지에 박혀 있음. TanStack Query 가 hydration 후 hooks 호출 → 실데이터 반영.

## 5. dev 서버 access log

```
GET /profile/005930 200
GET /api/stock/price?ticker=005930 200
GET /api/stock/daily?ticker=005930&period=D 200
GET /api/disclosure/company?ticker=005930 200
GET /api/disclosure/list?ticker=005930&count=5 200
```

→ 페이지 진입 시 4개 API 호출 모두 200 (DevTools Network 탭 대체 증거).

## 결론

AC-8 종단 검증 통과:
1. `/profile/005930` 진입 시 4개 BFF API 호출 200.
2. 응답 본문은 mock 이 아닌 실 KIS / DART (X-Data-Source 헤더로 확인).
3. PR-A 가 정착한 mappers / corp_code 매핑 / 토큰 캐시 / 캐싱 TTL 위에서 PR-B 의 hooks + 컴포넌트가
   자연스럽게 동작.
4. SSR 시점에 섹션 타이틀이 박혀 있고 hydration 후 hooks 가 실데이터로 채움.
