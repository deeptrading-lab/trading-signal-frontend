# OpenDART DS003 — 상장기업(정기보고서) 재무정보

정기보고서(사업·반기·분기)에 담긴 재무제표 주요계정·전체계정·재무지표·XBRL 양식을 제공하는 OpenDART API 그룹. **이 프로젝트 펀더멘털 시그널의 핵심 소스**다.

- 출처: API 목록 <https://opendart.fss.or.kr/intro/infoApiList.do> · 개발가이드 DS003 <https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003>
- 갱신일: 2026-05-29
- 인증·공통 envelope·status 코드·corp_code 조회·한도는 [00-auth-and-common.md](./00-auth-and-common.md) 참조.
- KIS 재무 API(실전계좌 전용·항목 제한적) 대비, DART 는 무료·풍부한 펀더멘털 본진이다.

---

## 공통 요청 파라미터

모든 DS003 엔드포인트는 base URL `https://opendart.fss.or.kr/api`, 인증은 `crtfc_key` query 파라미터, 응답은 `{status, message, list[]}` envelope(`status` 000 정상 / 013 데이터 없음 / 020 한도 초과). 호출 한도 20,000건/일. `corp_code`(8자리 고유번호)는 **종목코드(ticker, 6자리)와 다르다** — 별도 corp_code 매핑 필요.

| 파라미터 | 필수 | 설명 | 값 |
|---|---|---|---|
| `crtfc_key` | Y | 발급 인증키(40자리) | — |
| `corp_code` | Y | 공시대상회사 고유번호(8자리) | 예: `00126380`(삼성전자) |
| `bsns_year` | Y | 사업연도(4자리) | 2015년 이후 지원 |
| `reprt_code` | Y | 보고서 코드 | `11013` 1분기 / `11012` 반기 / `11014` 3분기 / `11011` 사업보고서(연간) |
| `fs_div` | (전체재무제표 전용) | 개별/연결 구분 | `OFS` 개별재무제표 / `CFS` 연결재무제표 |
| `idx_cl_code` | (재무지표 전용) | 지표분류코드 | `M210000` 수익성 / `M220000` 안정성 / `M230000` 성장성 / `M240000` 활동성 |
| `sj_div` | (XBRL택사노미 전용) | 재무제표구분 | 예 `BS1` 등 |

> 주의: `reprt_code` 가 분기/반기일 때 **당기 금액은 누적(`*_add_amount`)인지 당분기 단독인지** 계정·항목별로 다르다(아래 상세 참조).

---

## 카탈로그 (DS003 전체 7종)

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|---|---|---|
| 단일회사 주요계정 | `/api/fnlttSinglAcnt.json` | 한 회사의 재무제표 주요계정(매출·영업이익·당기순이익·자산/부채/자본 등) |
| 다중회사 주요계정 | `/api/fnlttMultiAcnt.json` | 여러 회사 주요계정 동시 조회(`corp_code` 콤마 구분) |
| 단일회사 전체 재무제표 | `/api/fnlttSinglAcntAll.json` | 전체 계정(BS/IS/CIS/CF/SCE) + XBRL `account_id` |
| 재무제표 원본파일(XBRL) | `/api/fnlttXbrl.xml` | XBRL 원본 ZIP 파일 다운로드(JSON 없음, `rcept_no` 기반) |
| 단일회사 주요 재무지표 | `/api/fnlttSinglIndx.json` | 한 회사의 수익성/안정성/성장성/활동성 지표 |
| 다중회사 주요 재무지표 | `/api/fnlttCmpnyIndx.json` | 여러 회사 주요 재무지표 동시 조회 |
| XBRL택사노미재무제표양식 | `/api/xbrlTaxonomy.json` | 재무제표 표준 계정 양식(택사노미) 메타 |

---

## 핵심 상세

### 1) 단일회사 주요계정 — `/api/fnlttSinglAcnt.json`

매출액/영업이익/당기순이익/자산총계/부채총계/자본총계 등 **요약 재무 주요계정**을 한 회사 단위로 반환. 펀더멘털 시그널 1차 소스.

**요청 파라미터**: `crtfc_key`, `corp_code`, `bsns_year`, `reprt_code` (위 공통표).

**응답 `list[]` 필드**

| 필드 키 | 설명 |
|---|---|
| `rcept_no` | 접수번호(14자리) |
| `bsns_year` | 사업연도 |
| `stock_code` | 상장회사 종목코드(6자리) |
| `reprt_code` | 보고서 코드 |
| `account_nm` | **계정명**(매출액/영업이익/당기순이익/자산총계/부채총계/자본총계 등) — 계정 식별의 기준 |
| `fs_div` | 개별/연결 구분 `OFS`/`CFS` |
| `fs_nm` | 재무제표명(개별/연결) |
| `sj_div` | 재무제표 구분 `BS`(재무상태표)/`IS`(손익계산서) |
| `sj_nm` | 재무제표명 |
| `thstrm_nm` | **당기명**(예: 제 56 기) |
| `thstrm_dt` | 당기 기간/기준일 |
| `thstrm_amount` | **당기 금액** |
| `thstrm_add_amount` | 당기 누적금액(분기/반기 누적) |
| `frmtrm_nm` | **전기명** |
| `frmtrm_dt` | 전기 기간/기준일 |
| `frmtrm_amount` | **전기 금액** |
| `frmtrm_add_amount` | 전기 누적금액 |
| `bfefrmtrm_nm` | **전전기명**(사업보고서에서만 제공) |
| `bfefrmtrm_dt` | 전전기 기준일 |
| `bfefrmtrm_amount` | **전전기 금액** |
| `ord` | 계정 정렬 순서 |
| `currency` | 통화 단위 |

> **당기/전기/전전기 3개년 금액 구조**가 한 row 에 함께 들어온다(`thstrm_/frmtrm_/bfefrmtrm_`). 별도 연도 재호출 없이 row 하나로 전년 대비 성장률 산출 가능.

**주의**
- 계정 식별은 `account_nm`(한글 계정명)으로 한다 — 표준 `account_id`(IFRS 태그)는 이 API에 없다(전체재무제표 API 사용).
- 개별 vs 연결은 `fs_div`(`OFS`/`CFS`)로 같은 계정이 중복 등장하므로 반드시 구분해 필터링.
- `bfefrmtrm_*`(전전기)는 사업보고서(`11011`)에서만 채워진다.
- 분기/반기 보고서에서 손익(`IS`) 계정은 누적값(`*_add_amount`)과 당분기 단독(`*_amount`)이 함께 올 수 있으므로 사용 목적에 맞게 선택.

### 2) 단일회사 전체 재무제표 — `/api/fnlttSinglAcntAll.json`

BS/IS/CIS/CF/SCE 전체 계정과 XBRL 표준 `account_id`까지 제공. 세부 계정 기반 정밀 분석용.

**요청 파라미터**: `crtfc_key`, `corp_code`, `bsns_year`, `reprt_code`, **`fs_div`**(`OFS`/`CFS`, 필수).

**응답 `list[]` 필드**

| 필드 키 | 설명 |
|---|---|
| `rcept_no` | 접수번호(14자리) |
| `reprt_code` | 보고서 코드 |
| `bsns_year` | 사업연도 |
| `corp_code` | 고유번호(8자리) |
| `sj_div` | 재무제표 구분 `BS`(재무상태표)/`IS`(손익)/`CIS`(포괄손익)/`CF`(현금흐름)/`SCE`(자본변동) |
| `sj_nm` | 재무제표명 |
| `account_id` | **XBRL 표준 계정ID**(예: `ifrs-full_CurrentAssets`) — 표준계정이 아니면 `-표준계정코드 미사용-` 식 표기 (확인 필요) |
| `account_nm` | 계정명 |
| `account_detail` | 계정 상세(주석/세부) |
| `thstrm_nm` / `thstrm_amount` / `thstrm_add_amount` | 당기명 / 당기 금액 / 당기 누적금액 |
| `frmtrm_nm` / `frmtrm_amount` / `frmtrm_add_amount` | 전기명 / 전기 금액 / 전기 누적금액 |
| `frmtrm_q_nm` / `frmtrm_q_amount` | 전기(분기/반기) 명 / 금액 |
| `bfefrmtrm_nm` / `bfefrmtrm_amount` | 전전기명 / 전전기 금액(사업보고서에서만) |
| `ord` | 계정 정렬 순서 |
| `currency` | 통화 단위 |

**주의**
- 주요계정 API와 달리 **`fs_div` 가 필수 요청 파라미터**(개별/연결을 호출 시점에 선택).
- `account_id`(IFRS 표준 태그)로 계정을 안정적으로 식별 가능 — 회사별 `account_nm` 표기 차이에 덜 민감하다. 단 표준 미매핑 계정은 `account_id` 가 표준값이 아닐 수 있음(확인 필요).
- `sj_div` 가 `CF`/`SCE`까지 확장되어 현금흐름·자본변동까지 다룬다.

---

## 시그널 / 펀더멘털 활용 힌트

- **매출/영업이익 성장률(YoY)**: `(thstrm_amount − frmtrm_amount) / frmtrm_amount` — 한 row 안에서 바로 계산. 사업보고서면 `bfefrmtrm_amount`까지 써 2개년 추세도 가능.
- **ROE 근사**: 당기순이익(`account_nm`=당기순이익, `thstrm_amount`) ÷ 자본총계(`account_nm`=자본총계) — 단일회사 주요계정만으로 산출.
- **부채비율**: 부채총계 ÷ 자본총계, **유동비율**·**자기자본비율** 등도 주요계정 3개 row 로 파생 가능.
- 정밀 지표(영업이익률·EPS·현금흐름 기반)는 `fnlttSinglAcntAll`(account_id 기반) 또는 사전 계산된 `fnlttSinglIndx`(수익성 `M210000` 등) 사용이 안전.

---

## 미확인 / 후속

- `fnlttSinglIndx`/`fnlttCmpnyIndx` 의 `idx_code`/`idx_nm` 구체 항목 목록(예: ROE, 영업이익률 등 개별 지표 키)은 포털 응답 샘플로 추가 확정 필요(확인 필요).
- `fnlttMultiAcnt` 의 `corp_code` 다중 입력 형식(콤마 구분 추정, 포털 예시 `00334624,00126400`) 및 최대 회사 수 — 공식 표기 재확인 필요(확인 필요).
- `fnlttSinglAcntAll` 의 `account_id` 표준 미매핑 계정 표기 규칙 — 실제 응답으로 확인 필요(확인 필요).
- `xbrlTaxonomy` 의 `sj_div` 허용 코드 전체값 목록(`BS1` 외) — 확인 필요.
- `fnlttXbrl` 은 JSON 미지원(ZIP 바이너리, `rcept_no`+`reprt_code` 기반) — 시그널 파이프라인에서 직접 사용 여부 검토 필요.
- `corp_code` ↔ ticker 매핑 소스(corpCode.xml, DS001 그룹)는 별도 문서/모듈에서 관리 필요.
