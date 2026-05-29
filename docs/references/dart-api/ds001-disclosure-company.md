# OpenDART DS001 공시정보 (Disclosure & Company)

> DART 에 등록된 회사의 **공시 목록·기업개황·공시원본·고유번호 매핑** 을 제공하는 OpenDART 의 기본 카테고리(DS001).
>
> - **출처**: [OpenDART API 목록](https://opendart.fss.or.kr/intro/infoApiList.do) · [개발가이드 DS001](https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS001) (각 API 상세: `/guide/detail.do?apiGrpCd=DS001&apiId=…`)
> - **갱신일**: 2026-05-29
> - **공통 규약**(인증키 `crtfc_key`, 응답 envelope `status`/`message`, 에러코드, 사용한도) 은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.
> - 우리 코드(`lib/api/dart/company.ts`, `lib/api/dart/disclosure.ts`)에서 **공시검색·기업개황 2종을 이미 사용 中**. 응답 타입은 `lib/api/dart/types.ts` 에 정의되어 있으며, 본 문서의 응답 필드 표는 그 검증값과 일치한다.

---

## 1. 카탈로그

| API명(한글) | 엔드포인트 | 포맷 | 한 줄 설명 |
|---|---|---|---|
| 공시검색 | `/api/list.json` | JSON | 기간·회사·공시유형별 공시 목록 (페이징) — **사용 中** |
| 기업개황 | `/api/company.json` | JSON | 회사 기본정보(명칭/대표/구분/주소/업종 등) — **사용 中** |
| 공시서류원본파일 | `/api/document.xml` | ZIP(binary) | 접수번호로 공시 원문 문서 다운로드 |
| 고유번호 | `/api/corpCode.xml` | ZIP(binary) | DART 등록 전체 회사의 `corp_code` ↔ `stock_code` 매핑 파일 |

> 각 JSON 엔드포인트는 `.xml` 변형도 제공된다(예: `/api/list.xml`). 우리 코드는 `.json` 만 사용. `document`/`corpCode` 는 ZIP 전용.

---

## 2. 공시검색 `/api/list.json` (사용 中)

기간·회사·공시유형으로 공시 목록을 페이징 조회. `lib/api/dart/disclosure.ts` 에서 호출.

### 요청 파라미터

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `crtfc_key` | Y | 발급 인증키(40자리). [00-auth-and-common.md](./00-auth-and-common.md) 참조 |
| `corp_code` | N | 공시대상회사 고유번호(8자리). 미지정 시 전체 회사 대상 |
| `bgn_de` | N | 시작일 `YYYYMMDD` |
| `end_de` | N | 종료일 `YYYYMMDD` |
| `last_reprt_at` | N | 최종보고서만 조회 `Y`/`N` (기본 `N`). 우리 코드는 `Y` 고정 |
| `pblntf_ty` | N | 공시유형(대분류) 코드 `A`~`J` (아래 표) |
| `pblntf_detail_ty` | N | 공시상세유형 코드 (예: `A001` 사업보고서) |
| `corp_cls` | N | 법인구분 `Y`(유가) / `K`(코스닥) / `N`(코넥스) / `E`(기타) |
| `sort` | N | 정렬 기준 — `date`(접수일자) / `crp`(회사명) / `rpt`(보고서명) (확인 필요: 기본값) |
| `sort_mth` | N | 정렬 방법 — `asc` / `desc` |
| `page_no` | N | 페이지 번호 (기본 `1`) |
| `page_count` | N | 페이지당 건수 (기본 `10`, **최대 100**) |

#### `pblntf_ty` 공시유형(대분류) 코드

| 코드 | 유형 |
|---|---|
| `A` | 정기공시 |
| `B` | 주요사항보고 |
| `C` | 발행공시 |
| `D` | 지분공시 |
| `E` | 기타공시 |
| `F` | 외부감사관련 |
| `G` | 펀드공시 |
| `H` | 자산유동화 |
| `I` | 거래소공시 |
| `J` | 공정위공시 |

> `pblntf_detail_ty` 는 위 대분류의 하위 코드. 예: `A001` 사업보고서 · `A002` 반기보고서 · `A003` 분기보고서 · `B001` 주요사항보고서. (전체 상세코드 목록은 OpenDART 포털 개발가이드의 별도 표 참조 — 본 문서 미수록)

### 응답 필드

페이징 메타 + `list[]` 배열. (`lib/api/dart/types.ts` → `DartDisclosureListResponse` / `DartDisclosureItem` 검증값)

| 필드 | 설명 |
|---|---|
| `status` / `message` | 공통 envelope ([00-auth-and-common.md](./00-auth-and-common.md)) |
| `page_no` | 현재 페이지 번호 |
| `page_count` | 페이지당 건수 |
| `total_count` | 총 건수 |
| `total_page` | 총 페이지 수 |
| `list[]` | 공시 항목 배열 (아래) |

`list[]` 항목:

| 필드 | 설명 |
|---|---|
| `rcept_no` | 접수번호(14자리). 공시 식별자 — `document.xml` 의 `rcept_no` 와 동일, 뷰어 URL(`dart.fss.or.kr/dsaf001/main.do?rcpNo=…`)에도 사용 |
| `corp_code` | 회사 고유번호(8자리) |
| `corp_name` | 공시대상회사 정식명칭 |
| `stock_code` | 종목코드(6자리, 상장사) |
| `corp_cls` | 법인구분 `Y`/`K`/`N`/`E` |
| `report_nm` | 보고서명 |
| `flr_nm` | 공시 제출인명 |
| `rcept_dt` | 접수일자 `YYYYMMDD` |
| `rm` | 비고 (정정/연결/첨부 등 부가 표시) |

### 주의

- `page_count` **최대 100** — 초과 시 잘리거나 에러(확인 필요). 대량 조회는 `page_no` 순회.
- `bgn_de`/`end_de` 미지정 시 OpenDART 기본 조회기간이 적용된다(확인 필요: 통상 최근 기간).
- 조회 결과 없음은 에러가 아니라 `status="013"` 으로 반환된다.

---

## 3. 기업개황 `/api/company.json` (사용 中)

회사 고유번호로 기본 정보 단건 조회. `lib/api/dart/company.ts` 에서 호출.

### 요청 파라미터

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `crtfc_key` | Y | 발급 인증키(40자리) |
| `corp_code` | Y | 공시대상회사 고유번호(8자리). **종목코드(6자리)가 아님** — `corpCode.xml` 매핑 필요 |

### 응답 필드

(`lib/api/dart/types.ts` → `DartCompanyResponse` 검증값)

| 필드 | 설명 |
|---|---|
| `status` / `message` | 공통 envelope |
| `corp_name` | 정식명칭. 예 `"삼성전자주식회사"` (KIS `hts_kor_isnm` "삼성전자" 와 다름) |
| `corp_name_eng` | 영문 명칭 |
| `stock_name` | 종목명(약식/영문) |
| `stock_code` | 종목코드(6자리, 상장사) |
| `ceo_nm` | 대표자명 |
| `corp_cls` | 법인구분 `Y`(유가) / `K`(코스닥) / `N`(코넥스) / `E`(기타) |
| `bizr_no` | 사업자등록번호 |
| `jurir_no` | 법인등록번호 |
| `adres` | 주소 |
| `hm_url` | 홈페이지 URL |
| `ir_url` | IR 홈페이지 URL |
| `phn_no` | 전화번호 |
| `fax_no` | 팩스번호 |
| `induty_code` | 업종코드(KSIC). 예 `"264 - 컴퓨터 및 주변장치 제조업"` |
| `est_dt` | 설립일 `YYYYMMDD` |
| `acc_mt` | 결산월 `MM` |

### 주의

- `corp_code` 는 **8자리 DART 고유번호**. 화면에서 받는 6자리 `stock_code` → `corp_code` 변환은 §5 `corpCode.xml` 매핑으로 해결.
- 비상장/폐지 종목은 `stock_code` 가 빈 값일 수 있음.

---

## 4. 공시서류원본파일 `/api/document.xml`

접수번호로 공시 원문 문서를 ZIP 으로 다운로드. (우리 코드 미사용)

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `crtfc_key` | Y | 발급 인증키(40자리) |
| `rcept_no` | Y | 접수번호(14자리) — `list.json` 의 `rcept_no` |

- **응답**: `Zip FILE (binary)`, UTF-8. JSON envelope 가 아니라 바이너리 직접 반환.
- ZIP 내부는 공시 원문(XML 형식 등) 문서. (확인 필요: 내부 파일 명/구조 상세)
- 에러: `013` 데이터 없음 · `014` 파일 없음 · `020` 사용한도 초과.
- 브라우저 테스트 UI 미제공(바이너리 출력).

---

## 5. 고유번호 `/api/corpCode.xml`

DART 에 등록된 **전체 회사의 고유번호 목록** 을 ZIP 으로 일괄 제공. (우리 코드 미사용 — corp_code↔ticker 매핑 시 필요)

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `crtfc_key` | Y | 발급 인증키(40자리) |

### ZIP 구조

- **응답**: `Zip FILE (binary)`. 내부에 단일 XML 파일(`CORPCODE.xml`) 포함.
- 약 12만여 건(상장+비상장 전체)의 회사 엔트리.
- 각 `<list>` 엔트리 필드:

| 필드 | 설명 |
|---|---|
| `corp_code` | 고유번호(8자리) — DART 식별자 |
| `corp_name` | 정식 회사명칭 |
| `corp_eng_name` | 영문 회사명칭 |
| `stock_code` | 종목코드(6자리). **상장사만 값 존재**, 비상장은 공백 |
| `modify_date` | 최종 변경일 `YYYYMMDD` |

### corp_code ↔ ticker 매핑

- 화면/KIS 쪽은 6자리 **종목코드(ticker)** 를 쓰지만, OpenDART 조회 API(`list.json`/`company.json`)는 8자리 **`corp_code`** 를 요구한다.
- 변환 절차: `corpCode.xml` 을 다운로드 → ZIP 해제 → `stock_code`(6자리) 기준으로 `corp_code`(8자리) 룩업 테이블 구성.
- 전체 목록이라 변경이 잦지 않으므로 **캐싱/정기 갱신**(예: `modify_date` 기준 또는 일/주 단위) 권장. (확인 필요: 우리 코드의 현재 매핑 보유 위치 — 현재 `company.ts`/`disclosure.ts` 는 `corpCode` 를 인자로 받음)
- 비상장사는 `stock_code` 가 비어 있어 종목코드 역매핑이 불가.

---

## 6. 미확인 / 후속

- `list.json` `sort`/`sort_mth` 의 정확한 허용값과 기본값 (확인 필요).
- `bgn_de`/`end_de` 미지정 시 기본 조회기간 (확인 필요).
- `page_count` 100 초과 시 동작(절삭 vs 에러) (확인 필요).
- `document.xml` ZIP 내부 파일명/문서 포맷(공시 원문 XML 스키마) (확인 필요).
- DS001 에 추가 API 존재 여부 — 포털 가이드 기준 위 4종이 전부로 확인됨.
- `00-auth-and-common.md` 미작성 상태(본 문서가 선참조). 공통 envelope/에러코드/사용한도는 작성 후 그쪽으로 통합.
- DART 개발가이드 상세 페이지는 JS 렌더/일시 오류로 직접 fetch 불가 → 일부 내용은 WebSearch(공식 가이드 미러 포함) 로 보강하여 작성. 코어 4종의 엔드포인트/파라미터/응답 필드는 포털 개발가이드 및 우리 코드(`types.ts`) 검증값으로 확정.
