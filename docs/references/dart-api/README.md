# OpenDART API 레퍼런스

금융감독원 전자공시(OpenDART) Open API를 카테고리별로 정리한 레퍼런스 문서 모음입니다.
KIS가 시세·수급·순위라면, **DART는 공시·재무·지분·이벤트의 표준 소스**입니다(무료, 일일 20,000건). 펀더멘털/이벤트 시그널의 본진.

- **1차 소스**: <https://opendart.fss.or.kr/intro/infoApiList.do> (개발가이드 `guide/detail.do?apiGrpCd=DS00X`)
  - 국문 포털은 JS 렌더링이 많아 일부 응답 필드는 "(확인 필요)" 표기 — 실호출/포털 수동 확인으로 보강.
- **갱신일**: 2026-05-29

> ⚠️ 이 프로젝트는 **조회·분석 전용**입니다. ([[project_read-only-analysis-scope]])

## 공통 (자세히는 [00-auth-and-common.md](./00-auth-and-common.md))

| 항목 | 값 |
| --- | --- |
| base URL | `https://opendart.fss.or.kr/api` (엔드포인트 `/api/<name>.json`·`.xml`) |
| 인증 | `crtfc_key` 를 **query param 으로 매번** 전송 (OAuth/토큰 없음, KIS와 다름) |
| 응답 envelope | `{ status, message, ...payload }` — `status:"000"`=정상, `"013"`=데이터없음, `"020"`=한도초과 |
| 일일 한도 | **20,000건** — `lib/api/dart/counter.ts` 카운터 (90%↑ `X-Dart-Quota-Warning`, 초과 시 mock fallback) |
| 식별자 | `corp_code`(8자리) ≠ ticker(6자리). 매핑 필요 (고유번호 API `corpCode.xml`) |

## 문서 목록

| 문서 | 카테고리 | 담당 |
| --- | --- | --- |
| [00-auth-and-common.md](./00-auth-and-common.md) | 인증·공통(crtfc_key·status코드·20k한도·corp_code) | 공통 |
| [ds001-disclosure-company.md](./ds001-disclosure-company.md) | DS001 공시정보 — 공시검색·기업개황·고유번호·공시원본 | 4 |
| [ds002-business-report.md](./ds002-business-report.md) | DS002 사업보고서 주요정보 — 배당·증자·자기주식·최대주주·임원 등 | 27 |
| [ds003-financials.md](./ds003-financials.md) | DS003 재무정보 — 단일/다중 주요계정·전체재무제표·재무지표·XBRL | 7 |
| [ds004-ds005-ownership-events.md](./ds004-ds005-ownership-events.md) | DS004 지분공시(2) + DS005 주요사항보고서(36) | 38 |

## 우리 코드베이스 연동 현황 (`lib/api/dart/`)

| 기능 | 엔드포인트 | 구현 |
| --- | --- | --- |
| 기업개황(종목명·대표·업종) | `/api/company.json` | ✅ `lib/api/dart/company.ts` |
| 공시 목록 | `/api/list.json` | ✅ `lib/api/dart/disclosure.ts` |
| 일일 한도 카운터 | — | ✅ `lib/api/dart/counter.ts` (20k) |
| corp_code 매핑 | (symbols.json 시드) | 부분 — 고유번호 API 풀 시드는 후속 |

> **종목명 보완 용도**: 표시용 종목명("삼성전자")의 1차 소스는 **KIS `search-stock-info`의 `prdt_abrv_name`**(실호출 확정, KIS 레퍼런스 quotations §2-7). DART `company.json`의 `corp_name`은 **정식 법인명("삼성전자주식회사")** 이 필요할 때 보조로 사용. ([[reference-kis-api-conventions]])

## 관련 문서

- [KIS Open API 레퍼런스](../kis-api/README.md) — 시세·수급·순위·계좌
- [korean-stock-api-comparison.md](../korean-stock-api-comparison.md)
