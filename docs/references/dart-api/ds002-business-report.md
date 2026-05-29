# OpenDART DS002 — 사업보고서 주요정보 (정기보고서 주요정보)

정기보고서(사업/반기/분기보고서)에서 추출한 배당·지분·임직원·자금·채무증권 등 주요 항목을 조회하는 API 그룹.

- 출처: [OpenDART 개발가이드 DS002](https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS002), [API 목록](https://opendart.fss.or.kr/intro/infoApiList.do)
- 갱신일: 2026-05-29
- 인증·envelope·에러코드·corp_code 등 공통 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조

> 주: OpenDART 포털의 DS002 그룹 네비게이션에는 단일/다중회사 주요계정, 전체 재무제표, XBRL 등 **재무정보(DS003 성격) 엔드포인트**도 함께 노출된다. 본 문서는 "사업보고서 주요정보(정기보고서에서 추출한 비재무 주요 항목)"만 카탈로그로 다루며, 재무제표 계열은 별도 DS003 문서로 분리한다.

---

## 1. 공통 요청 파라미터

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `crtfc_key` | O | 발급받은 API 인증키 (40자) |
| `corp_code` | O | 공시대상회사 고유번호 (**8자리**, ticker 6자리와 다름) |
| `bsns_year` | O | 사업연도 (4자리, 2015 이후) |
| `reprt_code` | O | 보고서 코드 (아래 표) |

base URL: `https://opendart.fss.or.kr/api`, 응답형식 `.json` / `.xml`.

### reprt_code (보고서 코드)

| 코드 | 보고서 |
|------|--------|
| `11013` | 1분기보고서 |
| `11012` | 반기보고서 |
| `11014` | 3분기보고서 |
| `11011` | 사업보고서 (연간) |

응답 envelope: `{ status, message, list[] }` — `status` "000"=정상, "013"=데이터없음, "020"=한도초과. 일일 한도 20,000건.

---

## 2. 엔드포인트 카탈로그

`엔드포인트`는 base URL 뒤에 붙는 경로명(`.json`/`.xml` 생략). 모두 위 4개 공통 파라미터를 사용한다(달리 명시한 경우 제외).

### 2-1. 지분·주식

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|-------------|-----------|-----------|
| 증자(감자) 현황 | `irdsSttus` | 주식 발행·감소(증자/감자) 형태·수량·액면가 이력 |
| 배당에 관한 사항 | `alotMatter` | 주당배당금·배당성향·시가배당률 등 배당 항목 |
| 자기주식 취득 및 처분 현황 | `tesstkAcqsDspsSttus` | 자기주식 취득/처분/소각 수량과 방법 |
| 최대주주 현황 | `hyslrSttus` | 최대주주·특수관계인 보유주식수·지분율(기초/기말) |
| 최대주주 변동현황 | `hyslrChgSttus` | 최대주주 변동일·변동원인·지분율 변화 |
| 소액주주 현황 | `mrhlSttus` | 소액주주 수·보유주식수·비율 |
| 주식의 총수 현황 | `stockTotqySttus` | 발행할/발행한/유통/자기주식 등 주식 총수 현황 |

### 2-2. 임원·직원·보수

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|-------------|-----------|-----------|
| 임원 현황 | `exctvSttus` | 임원 성명·직위·등기/상근 여부·담당업무·임기 |
| 직원 현황 | `empSttus` | 사업부문별 정규/계약직 인원·평균근속·급여총액 |
| 이사·감사의 개인별 보수현황(5억원 이상) | `hmvAuditIndvdlBySttus` | 5억원 이상 이사·감사 개인별 보수 총액 |
| 이사·감사 전체의 보수현황 | `hmvAuditAllSttus` | 이사·감사 전체 인원·보수총액·1인평균 |
| 개인별 보수지급 금액(5억이상 상위5인) | `indvdlByPay` | 보수 상위 5인 개인별 보수 총액 |
| 이사·감사 전체의 보수현황(주주총회 승인금액) | `drctrAdtAllMendngSttusGmtsckConfmAmount` | 주총 승인 보수 한도 금액 |
| 이사·감사 전체의 보수현황(보수지급금액 - 유형별) | `drctrAdtAllMendngSttusMendngPymntamtTyCl` | 유형별(이사/감사/사외이사 등) 실지급 보수 |
| 미등기임원 보수현황 | `unrstExctvMendngSttus` | 미등기임원 보수 현황 |
| 사외이사 및 그 변동현황 | `outcmpnyDrctrNdChangeSttus` | 사외이사 수·선임·해임·중도퇴임 변동 |

### 2-3. 자금·출자

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|-------------|-----------|-----------|
| 타법인 출자현황 | `otrCprInvstmntSttus` | 출자 대상·취득금액·지분율·장부가액·피출자사 재무현황 |
| 공모자금의 사용내역 | `pssrpCptalUseDtls` | 공모 조달자금의 계획 대비 실제 사용 내역 |
| 사모자금의 사용내역 | `prvsrpCptalUseDtls` | 사모 조달자금의 납입·실제 사용 내역 |

### 2-4. 채무증권·미상환 잔액

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|-------------|-----------|-----------|
| 채무증권 발행실적 | `detScritsIsuAcmslt` | 채무증권 발행일·발행액·이율·만기 실적 |
| 회사채 미상환 잔액 | `cprndNrdmpBlce` | 잔존만기 구간별 회사채 미상환 잔액 |
| 단기사채 미상환 잔액 | `srtpdPsndbtNrdmpBlce` | 잔존만기 구간별 단기사채 미상환 잔액 |
| 기업어음증권 미상환 잔액 | `entrprsBilScritsNrdmpBlce` | 잔존만기 구간별 기업어음(CP) 미상환 잔액 |
| 신종자본증권 미상환 잔액 | `newCaplScritsNrdmpBlce` | 잔존만기 구간별 신종자본증권 미상환 잔액 |
| 조건부 자본증권 미상환 잔액 | `cndlCaplScritsNrdmpBlce` | 잔존만기 구간별 조건부 자본증권 미상환 잔액 |

### 2-5. 감사·기타

| API명(한글) | 엔드포인트 | 한 줄 설명 |
|-------------|-----------|-----------|
| 회계감사인의 명칭 및 감사의견 | `accnutAdtorNmNdAdtOpinion` | 감사인명·감사의견(적정 등) |
| 감사용역체결현황 | `adtServcCnclsSttus` | 감사인 선임·감사보수·감사시간 계약 현황 |
| 회계감사인과의 비감사용역 계약체결 현황 | `accnutAdtorNonAdtServcCnclsSttus` | 비감사용역 계약 현황 |

---

## 3. 핵심 상세

### 3-1. 배당에 관한 사항 — `alotMatter`

요청: 공통 4개 파라미터(`crtfc_key`, `corp_code`, `bsns_year`, `reprt_code`).

| 응답 필드 | 설명 |
|-----------|------|
| `rcept_no` | 접수번호(14자리) |
| `corp_cls` | 법인구분(Y:유가, K:코스닥, N:코넥스, E:기타) |
| `corp_code` | 고유번호(8자리) |
| `corp_name` | 법인명 |
| `se` | 구분 (예: 주당 현금배당금(원), 현금배당성향(%), 현금배당수익률(%) 등 항목명) |
| `stock_knd` | 주식 종류(보통주/우선주) |
| `thstrm` | 당기 금액 |
| `frmtrm` | 전기 금액 |
| `lwfr` | 전전기 금액 |
| `stlm_dt` | 결산기준일(YYYY-MM-DD) |

> `se`(구분)에 항목명이 들어가는 long-format 구조. "현금배당성향(%)", "주당 현금배당금(원)", "현금배당수익률(%)" 등을 `se`로 필터링해 각 `thstrm/frmtrm/lwfr`(당기/전기/전전기) 값을 읽는다.

### 3-2. 최대주주 현황 — `hyslrSttus`

| 응답 필드 | 설명 |
|-----------|------|
| `rcept_no` | 접수번호(14자리) |
| `corp_cls` | 법인구분(Y/K/N/E) |
| `corp_code` | 고유번호(8자리) |
| `corp_name` | 법인명 |
| `nm` | 최대주주의 성명 |
| `relate` | 관계(본인, 친인척 등) |
| `stock_knd` | 주식 종류(보통주 등) |
| `bsis_posesn_stock_co` | 기초 소유 주식 수 |
| `bsis_posesn_stock_qota_rt` | 기초 소유 주식 지분율 |
| `trmend_posesn_stock_co` | 기말 소유 주식 수 |
| `trmend_posesn_stock_qota_rt` | 기말 소유 주식 지분율 |
| `rm` | 비고 |
| `stlm_dt` | 결산기준일(YYYY-MM-DD) |

관련: 최대주주 변동현황 `hyslrChgSttus` — `change_on`(변동일), `mxmm_shrholdr_nm`(최대주주명), `posesn_stock_co`(소유주식수), `qota_rt`(지분율), `change_cause`(변동원인), `rm`, `stlm_dt`.

### 3-3. 자기주식 취득 및 처분 현황 — `tesstkAcqsDspsSttus`

| 응답 필드 | 설명 |
|-----------|------|
| `rcept_no` | 접수번호(14자리) |
| `corp_cls` | 법인구분(Y/K/N/E) |
| `corp_code` | 고유번호(8자리) |
| `corp_name` | 법인명 |
| `acqs_mth1` | 취득방법 대분류 |
| `acqs_mth2` | 취득방법 중분류 |
| `acqs_mth3` | 취득방법 소분류 |
| `stock_knd` | 주식 종류 |
| `bsis_qy` | 기초 수량 |
| `change_qy_acqs` | 변동 수량(취득) |
| `change_qy_dsps` | 변동 수량(처분) |
| `change_qy_incnr` | 변동 수량(소각) |
| `trmend_qy` | 기말 수량 |
| `rm` | 비고 |
| `stlm_dt` | 결산기준일(YYYY-MM-DD) |

### 3-4. 증자(감자) 현황 — `irdsSttus`

| 응답 필드 | 설명 |
|-----------|------|
| `rcept_no` | 공시 접수번호(14자리) |
| `corp_cls` | 법인구분(Y/K/N/E) |
| `corp_code` | 고유번호(8자리) |
| `corp_name` | 회사명 |
| `isu_dcrs_de` | 주식 발행·감소 일자 |
| `isu_dcrs_stle` | 발행·감소 형태(유상증자, 무상증자, 감자 등) |
| `isu_dcrs_stock_knd` | (감소) 주식 종류 |
| `isu_dcrs_qy` | (증감) 수량 |
| `isu_dcrs_mstvdv_fval_amount` | 주당 액면가액 |
| `isu_dcrs_mstvdv_amount` | 주당 발행·감소 가액 |
| `stlm_dt` | 결산기준일(YYYY-MM-DD) |

### 3-5. 타법인 출자현황 — `otrCprInvstmntSttus` (참고)

주요 필드: `inv_prm`(피출자 법인명), `frst_acqs_de`(최초취득일), `invstmnt_purps`(출자목적), `frst_acqs_amount`(최초취득금액), `bsis_blce_qota_rt`/`trmend_blce_qota_rt`(기초/기말 지분율), `trmend_blce_acntbk_amount`(기말 장부가액), `recent_bsns_year_fnnr_sttus_tot_assets`(피출자사 총자산), `recent_bsns_year_fnnr_sttus_thstrm_ntpf`(피출자사 당기순이익), `stlm_dt`.

---

## 4. 시그널/펀더멘털 활용 힌트

- **배당** `alotMatter`: `se`="현금배당성향(%)"·"현금배당수익률(%)"의 `thstrm`/`frmtrm`/`lwfr`로 배당 추세를 잡아 배당주/배당성장 시그널에 사용.
- **자기주식** `tesstkAcqsDspsSttus`: `change_qy_acqs`/`change_qy_incnr`(취득·소각)이 크면 주주환원·EPS 부양 시그널, **최대주주** `hyslrSttus`/`hyslrChgSttus`의 지분율 상승(`change_cause`)은 책임경영·우호적 시그널로 가중.

---

## 5. 미확인 / 후속

WebFetch로 응답 `list[]` 필드를 확정한 엔드포인트: `alotMatter`, `irdsSttus`, `tesstkAcqsDspsSttus`, `hyslrSttus`, `hyslrChgSttus`, `mrhlSttus`, `exctvSttus`, `empSttus`, `hmvAuditIndvdlBySttus`, `hmvAuditAllSttus`, `indvdlByPay`, `otrCprInvstmntSttus`. 나머지는 한글명·엔드포인트·설명만 확정.

응답 필드 미확정(후속 보강 필요):
- `stockTotqySttus`(주식의 총수) — 발행/유통/자기주식 등 세부 필드 (확인 필요)
- `pssrpCptalUseDtls` / `prvsrpCptalUseDtls`(공모/사모 자금 사용내역) — 계획/실제/차이 필드 (확인 필요)
- 채무증권·미상환 잔액 6종(`detScritsIsuAcmslt`, `cprndNrdmpBlce`, `srtpdPsndbtNrdmpBlce`, `entrprsBilScritsNrdmpBlce`, `newCaplScritsNrdmpBlce`, `cndlCaplScritsNrdmpBlce`) — 잔존만기 구간별 잔액 필드 (확인 필요)
- 보수 변형 3종(`drctrAdtAllMendngSttusGmtsckConfmAmount`, `drctrAdtAllMendngSttusMendngPymntamtTyCl`, `unrstExctvMendngSttus`) 및 `outcmpnyDrctrNdChangeSttus` — 세부 필드 (확인 필요)
- 감사 3종(`accnutAdtorNmNdAdtOpinion`, `adtServcCnclsSttus`, `accnutAdtorNonAdtServcCnclsSttus`) — 세부 필드 (확인 필요)
- 그룹 네비게이션상 함께 노출되나 본 문서에서 제외한 재무정보 계열(`fnlttSinglAcnt`, `fnlttMultiAcnt`, `fnlttSinglAcntAll`, `fnlttXbrl`, `xbrlTaxonomy`)은 DS003 문서에서 정리 예정.
- 일부 엔드포인트의 시작 사업연도/특이 파라미터(예: 자산양수도 `astInhtrfEtcPtbkOpt`는 기간 기반) (확인 필요)
