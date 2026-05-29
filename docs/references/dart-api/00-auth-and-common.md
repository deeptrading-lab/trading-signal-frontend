# OpenDART API — 인증 및 공통 규약

금융감독원 전자공시(OpenDART) Open API 의 인증(`crtfc_key`), 공통 호출 규약(base URL·요청 포맷·공통 파라미터), 응답 envelope·status 코드, 일일 사용한도, 고유번호(`corp_code`) 체계와 ticker 매핑을 정리한 1차 레퍼런스. KIS 와의 차이도 함께 정리한다.

> **이 프로젝트는 조회·분석 전용이다.** OpenDART 는 매매와 무관한 공시·재무 데이터 소스이며, 본 문서의 모든 호출은 읽기(조회) 전용이다.

**출처**
- OpenDART 오픈API 소개 — https://opendart.fss.or.kr/intro/main.do
- OpenDART API 목록 — https://opendart.fss.or.kr/intro/infoApiList.do
- OpenDART 개발가이드(공통/상태코드) — https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001 *(국문 포털은 JS 렌더링으로 본문 미수신 → 아래 영문 미러로 사실 확인)*
- OpenDART 영문 개발가이드(상태코드 표) — https://engopendart.fss.or.kr/guide/detail.do?apiGrpCd=DE001&apiId=AE00002
- OpenDART 고유번호(corpCode) 개발가이드 — https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018
- 자체 코드베이스 검증 사실 — `lib/api/dart/` (`client.ts`, `counter.ts`, `errors.ts`), `reference_kis-api-conventions.md`
- 마지막 갱신일: **2026-05-29**

---

## 1. 개요

OpenDART 는 금융감독원 전자공시시스템(DART)의 공시·재무 데이터를 REST 로 제공하는 **무료 공개 Open API** 다. 누구든지(개인·기업·기관) 인증키를 발급받아 사용할 수 있다. 공시 목록·기업개황·정기보고서 주요/재무정보·지분공시 등을 JSON 또는 XML 로 받는다.

KIS 와의 핵심 차이:

| 항목 | OpenDART | KIS |
| --- | --- | --- |
| 데이터 성격 | 공시 · 재무제표 · 기업개황 (펀더멘털) | 시세 · 지수 · 순위 · 수급 (마켓) |
| 인증 | `crtfc_key` 단일 키를 **query param 으로 매 요청 전송** | OAuth2 access token (헤더) + App Key/Secret |
| 토큰 수명 | 없음(키 자체가 영구). 캐싱 불필요 | 토큰 발급/만료/갱신 필요 |
| 비용 | 무료 | 무료(키 발급) |
| 식별자 | 8자리 `corp_code`(고유번호) | 6자리 ticker(종목코드) |

OpenDART API 그룹(`apiGrpCd`):

| 코드 | 그룹 |
| --- | --- |
| DS001 | 공시정보 |
| DS002 | 정기보고서 주요정보 |
| DS003 | 정기보고서 재무정보 |
| DS004 | 지분공시 종합정보 |
| DS005 | 주요사항보고서 주요정보 |
| DS006 | 증권신고서 주요정보 |

---

## 2. 인증 — `crtfc_key`

OpenDART 는 OAuth/토큰이 없다. **40자리 인증키(`crtfc_key`) 하나를 모든 요청에 query parameter 로 붙여 보낸다.**

### 발급
1. OpenDART 포털(https://opendart.fss.or.kr) 회원가입 → 인증키 신청.
2. 이메일 인증 완료 시 **40자(STRING(40)) 인증키 즉시 발급**.
3. 발급/관리: 포털 "인증키 관리" 메뉴. 사용 현황은 "오픈API 이용현황"에서 확인.

### 전송 방식
- 매 요청마다 query param `crtfc_key=<40자리>` 첨부. 헤더·바디 인증 없음.
- 토큰 만료/갱신 개념이 없으므로 **캐싱·재발급 로직 불필요** (KIS 와 완전히 다름).

### 보안 (서버 전용)
- `crtfc_key` 는 **절대 클라이언트(브라우저)에 노출 금지.** 노출 시 타인이 우리 일일 한도를 소진시킬 수 있다.
- 우리 코드: `lib/api/dart/client.ts` 는 **서버 측 only** — Next.js route handler(`app/api/disclosure/*`)에서만 import. 키는 환경변수로 주입하고 default params 에 박지 않는다.
- IP 화이트리스트(`012` 코드 참조)를 포털에 등록하면 추가 방어 가능(선택). *(우리 서버리스 환경에서 고정 IP 부재 시 미적용 — 확인 필요)*

---

## 3. 공통 요청 규약

| 항목 | 값 |
| --- | --- |
| Base URL | `https://opendart.fss.or.kr/api` |
| 엔드포인트 | `/api/<name>.json` 또는 `/api/<name>.xml` (확장자로 응답 포맷 결정) |
| HTTP 메서드 | `GET` |
| 인코딩 | UTF-8 |

> 예외: 고유번호 API 는 `/api/corpCode.xml` 로 호출하지만 응답은 ZIP 바이너리다(§6 참조).

### 응답 포맷 — `.json` vs `.xml`
- 동일 엔드포인트를 `.json` / `.xml` 확장자로 구분. 우리 코드는 `.json` 사용.
- `corpCode` 만 `.xml`(실제 페이로드는 ZIP).

### 자주 쓰는 공통 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `crtfc_key` | STRING(40) | Y | 인증키. 모든 요청 공통. |
| `corp_code` | STRING(8) | 조건부 | 공시대상회사 고유번호(8자리). 종목 ticker 아님(§6). |
| `bgn_de` | STRING(8) | 조건부 | 조회 시작일 `YYYYMMDD`. |
| `end_de` | STRING(8) | 조건부 | 조회 종료일 `YYYYMMDD`. |
| `bsns_year` | STRING(4) | 조건부 | 사업연도 `YYYY` (재무/주요정보 API). |
| `reprt_code` | STRING(5) | 조건부 | 보고서 코드. 1분기=`11013`, 반기=`11012`, 3분기=`11014`, 사업보고서=`11011`. |
| `pblntf_ty` | STRING | N | 공시유형(공시목록 API). |
| `page_no` / `page_count` | STRING | N | 페이지 번호 / 페이지당 건수(목록형 API). |

> 위 표는 자주 쓰는 공통 파라미터만 추렸다. API 별 고유 파라미터는 해당 엔드포인트 문서(후속 작성) 참조.

---

## 4. 공통 응답 envelope + status 코드

모든 JSON 응답은 다음 envelope 를 가진다. HTTP 자체는 **status 와 무관하게 200** 으로 떨어지는 경우가 일반적이므로(예: 데이터 없음 `013`), 반드시 응답 본문의 `status` 를 확인해야 한다.

```jsonc
{
  "status": "000",        // 결과 코드 (문자열, 3자리)
  "message": "정상",       // 결과 메시지 (한글)
  // ...payload (API 별 list/단건 필드)
}
```

### status 코드 표

| status | 의미 | 분류 |
| --- | --- | --- |
| `000` | 정상 | 성공 |
| `010` | 등록되지 않은 키 | 인증 |
| `011` | 사용할 수 없는 키(권한 정지·해지 등) | 인증 |
| `012` | 접근할 수 없는 IP | 인증 |
| `013` | 조회된 데이터 없음 | 빈 결과(에러 아님에 가까움) |
| `014` | 파일이 존재하지 않음 | 빈 결과 |
| `020` | 요청 제한 초과(일일 사용한도) | 한도 |
| `021` | 조회 가능한 회사 개수 초과(최대 100) | 한도 |
| `100` | 필드 부적절(파라미터 값 오류) | 요청 오류 |
| `101` | 부적절한 접근 | 요청 오류 |
| `800` | 시스템 점검 | 서버 |
| `900` | 정의되지 않은 오류 | 서버 |
| `901` | 사용자 계정의 개인정보 보유기간 만료 | 계정 |

### 우리 코드의 status 처리 (`lib/api/dart/errors.ts`)
- `status !== "000"` → `makeDartBusinessError(status, message)` 로 통합 `ApiError`(`kind: "server"`, HTTP 200) 변환. `message`(한글)를 그대로 통과시키고, 비면 한글 fallback("OpenDART 서버 일시 오류. 잠시 후 다시 시도해주세요.").
- `"013"` → `isDartEmptyStatus()` 로 분기. 정식 에러보다 "빈 결과"에 가까워 BFF 가 별도 처리 가능.
- `"020"` → `isDartQuotaExceededStatus()` 로 분기. mock fallback 트리거(§5).
- HTTP 5xx / 네트워크 오류 → `makeDartTransportError()` (`status>=500`→`server`, 그 외 `network`).

---

## 5. 일일 사용한도(20,000) + 우리 카운터 연동

- OpenDART 일일 호출 한도 **20,000건**. 초과 시 응답 status `020`(요청 제한 초과).
- 우리 코드 `lib/api/dart/counter.ts` 가 인스턴스 메모리 카운터로 호출 수를 추적(키 = KST `YYYY-MM-DD`, 매일 KST 자정 자동 리셋).

| 임계값 | 조건 | BFF 동작 |
| --- | --- | --- |
| 18,000 (90%) | `incrementDartCounter()` → `isWarn` | 정상 호출 + 응답 헤더 `X-Dart-Quota-Warning: true` |
| 20,000 (100%) 초과 | `isExceeded` | DART 호출 안 함, mock fallback + 헤더 `X-Data-Source: mock-quota-exceeded` |

```ts
// BFF route handler 가 매 DART 호출 직전에:
const { isWarn, isExceeded } = incrementDartCounter();
if (isExceeded) return mockFallback(); // + X-Data-Source: mock-quota-exceeded
// isWarn → 응답 헤더에 X-Dart-Quota-Warning: true
```

> **한계(현행 PR 범위):** 카운터는 **인스턴스 메모리 only** — Vercel serverless 다중 인스턴스 간 카운트가 공유되지 않는다. 정확한 quota 추적은 Vercel KV 도입 시 정합 예정. 단일 인스턴스 dev 환경 기준으로는 정확.

---

## 6. corp_code(고유번호) 체계 + ticker 매핑

> **핵심 함정: `corp_code` ≠ ticker.** DART 는 8자리 **고유번호(`corp_code`)** 로 회사를 식별하고, 우리 종목은 6자리 **ticker(종목코드)** 다. 둘은 다른 체계이므로 **매핑이 필수**다.

### 고유번호 목록 API (`corpCode.xml`)

| 항목 | 값 |
| --- | --- |
| URL | `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=<KEY>` |
| 메서드 | `GET` |
| 파라미터 | `crtfc_key` (STRING(40), 필수) |
| 응답 | **ZIP 바이너리** (압축 해제 시 `CORPCODE.xml`) |

`CORPCODE.xml` 의 레코드 필드:

| 필드 | 설명 |
| --- | --- |
| `corp_code` | 고유번호(8자리) — DART 조회 키 |
| `corp_name` | 회사명(국문) |
| `corp_eng_name` | 회사명(영문) |
| `stock_code` | 종목코드(6자리). **상장사만 값 존재**, 비상장은 공백/없음 |
| `modify_date` | 최종 수정일 `YYYYMMDD` |

> 비상장사는 `stock_code` 가 비어 있다. ticker→corp_code 매핑은 `stock_code` 가 채워진(상장) 레코드만 의미가 있다.

### 우리 매핑 전략
- 우리는 `lib/api/kis/symbols.json` 시드를 사용해 ticker ↔ corp_code 를 매핑한다.
- 전체 corpCode 목록은 위 ZIP API 로 받아 갱신할 수 있으나(상장사 6자리 `stock_code` 기준 매핑), 현행은 시드 기반.
- 조회 흐름: 사용자 ticker(6자리) → 시드로 corp_code(8자리) 변환 → DART 호출.

---

## 7. KIS vs DART 비교 (요약)

| 구분 | KIS Open API | OpenDART |
| --- | --- | --- |
| 인증 방식 | OAuth2 access token(헤더) + App Key/Secret + (주문 시 hashkey) | `crtfc_key` query param 단건 |
| 토큰 수명 | 발급·만료·갱신 필요(캐싱) | 없음(영구 키, 캐싱 불필요) |
| 일일 한도 | 유량 제한(초당/일별, TR별) | 일 20,000건(초과 시 status `020`) |
| 식별자 | 6자리 ticker | 8자리 corp_code(매핑 필요) |
| 응답 포맷 | JSON(헤더 `tr_id` 등) | JSON/XML(envelope `status`/`message`) |
| 데이터 성격 | 시세·지수·순위·수급(마켓) | 공시·재무제표·기업개황(펀더멘털) |
| 비용 | 무료 | 무료 |
| 우리 사용 | 조회 전용(prod 키) | 조회 전용 |

---

## 미확인 / 후속

- **국문 포털(`opendart.fss.or.kr/guide/*`, `intro/main.do`) 본문 미수신:** JS 렌더링으로 WebFetch 본문이 받아지지 않아, status 코드 표는 **영문 미러(`engopendart.fss.or.kr`)** 와 자체 코드베이스로 교차 확인했다. status `011`/`101`/`900`/`901` 의 정확한 국문 문구는 포털 직접 확인 시 보강 필요.
- **IP 화이트리스트(`012`):** 서버리스 환경 고정 IP 부재 시 적용 가능 여부 — 확인 필요.
- **`corpCode.xml` 정기 갱신 주기/자동화:** 현행 시드(`symbols.json`) 기반. ZIP 직접 다운로드 자동화는 후속.
- API 그룹별 개별 엔드포인트(공시목록·기업개황·재무제표 등) 상세 파라미터/응답 필드 문서는 별도 파일로 후속 작성.
