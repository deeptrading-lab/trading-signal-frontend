# DS004 지분공시 종합정보 + DS005 주요사항보고서 주요정보

OpenDART의 **DS004 지분공시 종합정보**(5%룰·임원/주요주주 지분 변동)와 **DS005 주요사항보고서 주요정보**(부도·증자·CB 발행 등 수시공시 이벤트)를 한 문서로 정리한 카탈로그입니다. 두 카테고리 모두 **이벤트/리스크 시그널** 용도로 쓴다.

- 출처:
  - API 목록 — <https://opendart.fss.or.kr/intro/infoApiList.do>
  - 개발가이드 DS004 — <https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS004>
  - 개발가이드 DS005 — <https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS005>
  - (DS005 가이드 상세 페이지는 JS 렌더 + 일시 점검 응답이 잦아, `guide/detail.do?apiGrpCd=DS005&apiId=...` 개별 페이지를 직접 조회해 엔드포인트명을 확정함. 일부 페이지 표는 안정적으로 받아지지 않아 "(확인 필요)"로 표기함.)
- 갱신일: 2026-05-29
- 인증·공통 envelope·status 코드·corp_code 규칙·호출 한도는 [00-auth-and-common.md](./00-auth-and-common.md) 참조.

## 공통 사실 (요약)

- base URL: `https://opendart.fss.or.kr/api`
- 인증: 모든 요청에 `crtfc_key`(40자) query 파라미터 필수.
- 응답 envelope: `{ status, message, list[] }` (JSON). `.xml` 엔드포인트도 제공.
- status 코드: `000` 정상 / `013` 조회 데이터 없음 / `020` 사용 한도 초과 (전체 코드는 공통 문서 참조).
- `corp_code`는 OpenDART 고유번호 **8자리**이며 종목코드(ticker, 6자리)와 **다름**. corpCode.xml 매핑 필요.
- 호출 한도: 20,000건/일.

---

## 1. DS004 지분공시 종합정보 (2 엔드포인트)

| 이벤트(한글) | 엔드포인트 | 한 줄 설명 | 기간 파라미터 |
|---|---|---|---|
| 대량보유 상황보고 | `majorstock` | 5%룰 — 주식 등 대량보유(5% 이상) 상황/변동 보고 | 없음 (corp_code만) |
| 임원ㆍ주요주주 소유보고 | `elestock` | 임원·주요주주의 특정증권 소유/변동 보고 | 없음 (corp_code만) |

> DS004 두 엔드포인트는 `bgn_de`/`end_de`를 받지 않으며 `corp_code` 단위로 해당 회사의 전체 보고 이력을 반환한다.

### 1-1. 대량보유 상황보고 — `majorstock`

- Endpoint: `GET https://opendart.fss.or.kr/api/majorstock.json` (`.xml` 동일)

요청 파라미터:

| 요청키 | 명칭 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| `crtfc_key` | API 인증키 | STRING(40) | Y | 발급받은 인증키(40자) |
| `corp_code` | 고유번호 | STRING(8) | Y | 공시대상회사 고유번호(8자) |

응답 `list[]` 필드:

| 응답키 | 한글설명 |
|---|---|
| `rcept_no` | 접수번호 |
| `rcept_dt` | 접수일자 |
| `corp_code` | 고유번호 |
| `corp_name` | 회사명 |
| `report_tp` | 보고구분 |
| `repror` | 대표보고자 |
| `stkqy` | 보유주식등의 수 |
| `stkqy_irds` | 보유주식등의 증감 |
| `stkrt` | 보유비율 |
| `stkrt_irds` | 보유비율 증감 |
| `ctr_stkqy` | 주요체결 주식등의 수 |
| `ctr_stkrt` | 주요체결 보유비율 |
| `report_resn` | 보고사유 |

### 1-2. 임원ㆍ주요주주 소유보고 — `elestock`

- Endpoint: `GET https://opendart.fss.or.kr/api/elestock.json` (`.xml` 동일)

요청 파라미터:

| 요청키 | 명칭 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| `crtfc_key` | API 인증키 | STRING(40) | Y | 발급받은 인증키(40자) |
| `corp_code` | 고유번호 | STRING(8) | Y | 공시대상회사 고유번호(8자) |

응답 `list[]` 필드:

| 응답키 | 한글설명 |
|---|---|
| `rcept_no` | 접수번호 |
| `rcept_dt` | 접수일자 |
| `corp_code` | 고유번호 |
| `corp_name` | 회사명 |
| `repror` | 보고자 |
| `isu_exctv_rgist_at` | 발행 회사 관계 임원(등기여부) |
| `isu_exctv_ofcps` | 발행 회사 관계 임원 직위 |
| `isu_main_shrholdr` | 발행 회사 관계 주요 주주 |
| `sp_stock_lmp_cnt` | 특정 증권 등 소유 수 |
| `sp_stock_lmp_irds_cnt` | 특정 증권 등 소유 증감 수 |
| `sp_stock_lmp_rate` | 특정 증권 등 소유 비율 |
| `sp_stock_lmp_irds_rate` | 특정 증권 등 소유 증감 비율 |

---

## 2. DS005 주요사항보고서 주요정보 (36 엔드포인트)

공통 요청 파라미터 (모든 DS005 엔드포인트 동일):

| 요청키 | 명칭 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| `crtfc_key` | API 인증키 | STRING(40) | Y | 발급받은 인증키(40자) |
| `corp_code` | 고유번호 | STRING(8) | Y | 공시대상회사 고유번호(8자) |
| `bgn_de` | 시작일 | STRING(8) | Y | 검색 시작일 `YYYYMMDD` (데이터는 2015년부터) |
| `end_de` | 종료일 | STRING(8) | Y | 검색 종료일 `YYYYMMDD` |

### 2-1. 전체 카탈로그

| # | 이벤트(한글) | 엔드포인트 | 한 줄 설명 |
|---|---|---|---|
| 1 | 부도발생 | `dfOcr` | 부도 발생 사실·금액·은행·사유 |
| 2 | 영업정지 | `bsnSp` | 영업 일부/전부 정지 결정·내역 |
| 3 | 회생절차 개시신청 | `ctrcvsBgrq` | 법원 회생절차(법정관리) 개시 신청 |
| 4 | 해산사유 발생 | `dsRsOcr` | 회사 해산 사유 발생 |
| 5 | 유상증자 결정 | `piicDecsn` | 유상증자(신주 발행·자금조달) 결정 |
| 6 | 무상증자 결정 | `fricDecsn` | 무상증자 결정 |
| 7 | 유무상증자 결정 | `pifricDecsn` | 유상·무상 동시 증자 결정 |
| 8 | 감자 결정 | `crDecsn` | 자본 감소(감자) 결정 |
| 9 | 채권은행 등의 관리절차 개시 | `bnkMngtPcbg` | 채권은행 공동관리(워크아웃 등) 개시 |
| 10 | 채권은행 등의 관리절차 중단 | `bnkMngtPcsp` | 채권은행 관리절차 중단 |
| 11 | 소송 등의 제기 | `lwstLg` | 소송 등 제기 |
| 12 | 해외 증권시장 주권등 상장 결정 | `ovLstDecsn` | 해외 거래소 상장 결정 |
| 13 | 해외 증권시장 주권등 상장폐지 결정 | `ovDlstDecsn` | 해외 거래소 상장폐지 결정 |
| 14 | 해외 증권시장 주권등 상장 | `ovLst` | 해외 거래소 상장 사실 |
| 15 | 해외 증권시장 주권등 상장폐지 | `ovDlst` | 해외 거래소 상장폐지 사실 |
| 16 | 전환사채권 발행결정 | `cvbdIsDecsn` | 전환사채(CB) 발행 결정 |
| 17 | 신주인수권부사채권 발행결정 | `bdwtIsDecsn` | 신주인수권부사채(BW) 발행 결정 |
| 18 | 교환사채권 발행결정 | `exbdIsDecsn` | 교환사채(EB) 발행 결정 |
| 19 | 상각형 조건부자본증권 발행결정 | `wdCocobdIsDecsn` | 상각형 조건부자본증권(코코본드) 발행 결정 |
| 20 | 자산양수도(기타), 풋백옵션 | `astInhtrfEtcPtbkOpt` | 기타 자산 양수도 및 풋백옵션 |
| 21 | 타법인 주식 및 출자증권 양수결정 | `otcprStkInvscrInhDecsn` | 타법인 주식·출자증권 양수 결정 |
| 22 | 타법인 주식 및 출자증권 양도결정 | `otcprStkInvscrTrfDecsn` | 타법인 주식·출자증권 양도 결정 |
| 23 | 유형자산 양수 결정 | `tgastInhDecsn` | 유형자산 양수 결정 |
| 24 | 유형자산 양도 결정 | `tgastTrfDecsn` | 유형자산 양도 결정 |
| 25 | 영업양수 결정 | `bsnInhDecsn` | 영업 양수 결정 |
| 26 | 영업양도 결정 | `bsnTrfDecsn` | 영업 양도 결정 |
| 27 | 자기주식 취득 결정 | `tsstkAqDecsn` | 자기주식 직접 취득 결정 |
| 28 | 자기주식 처분 결정 | `tsstkDpDecsn` | 자기주식 처분 결정 |
| 29 | 자기주식취득 신탁계약 체결 결정 | `tsstkAqTrctrCnsDecsn` | 자기주식 취득 신탁계약 체결 결정 |
| 30 | 자기주식취득 신탁계약 해지 결정 | `tsstkAqTrctrCcDecsn` | 자기주식 취득 신탁계약 해지 결정 |
| 31 | 주식교환·이전 결정 | `stkExtrDecsn` | 주식의 포괄적 교환·이전 결정 |
| 32 | 회사합병 결정 | `cmpMgDecsn` | 회사합병 결정 |
| 33 | 회사분할 결정 | `cmpDvDecsn` | 회사분할 결정 |
| 34 | 회사분할합병 결정 | `cmpDvmgDecsn` | 회사분할합병 결정 |
| 35 | 주권 관련 사채권 양수 결정 | `stkrtbdInhDecsn` | 주권 관련 사채권 양수 결정 |
| 36 | 주권 관련 사채권 양도 결정 | `stkrtbdTrfDecsn` | 주권 관련 사채권 양도 결정 |

> 참고: 가이드 상에 `prvsrpCptalUseDtls`(사모자금의 사용내역) 엔드포인트도 DS005 그룹 코드로 존재(확인 필요). 위 36개 메뉴 항목에는 포함되어 있지 않아 본 표에서는 제외했다.

### 2-2. 핵심 엔드포인트 응답 상세

#### 유상증자 결정 — `piicDecsn` (희석 시그널 핵심)

- Endpoint: `GET https://opendart.fss.or.kr/api/piicDecsn.json`
- 요청: 공통 4개 파라미터(`crtfc_key`, `corp_code`, `bgn_de`, `end_de`).

응답 `list[]` 주요 필드:

| 응답키 | 한글설명 |
|---|---|
| `rcept_no` | 접수번호 |
| `corp_cls` | 법인구분 (Y/K/N/E) |
| `corp_code` | 고유번호 |
| `corp_name` | 회사명 |
| `nstk_ostk_cnt` | 신주의 종류와 수 - 보통주식 |
| `nstk_estk_cnt` | 신주의 종류와 수 - 기타주식 |
| `fv_ps` | 1주당 액면가액 |
| `bfic_tisstk_ostk` | 증자전 발행주식총수 - 보통주식 |
| `bfic_tisstk_estk` | 증자전 발행주식총수 - 기타주식 |
| `fdpp_fclt` | 자금조달 목적 - 시설자금 |
| `fdpp_bsninh` | 자금조달 목적 - 영업양수자금 |
| `fdpp_op` | 자금조달 목적 - 운영자금 |
| `fdpp_dtrp` | 자금조달 목적 - 채무상환자금 |
| `fdpp_ocsa` | 자금조달 목적 - 타법인 증권 취득자금 |
| `fdpp_etc` | 자금조달 목적 - 기타자금 |
| `ic_mthn` | 증자방식 |
| `ssl_at` | 공매도 해당여부 |
| `ssl_bgd` | 공매도 시작일 |
| `ssl_edd` | 공매도 종료일 |

> 무상증자(`fricDecsn`)·유무상증자(`pifricDecsn`)도 발행 신주 수/액면가/증자전 발행주식총수 등 유사 구조의 필드를 반환한다(개별 필드 확인 필요).

#### 부도발생 — `dfOcr` (리스크 시그널 핵심)

- Endpoint: `GET https://opendart.fss.or.kr/api/dfOcr.json`
- 요청: 공통 4개 파라미터.

응답 `list[]` 주요 필드:

| 응답키 | 한글설명 |
|---|---|
| `rcept_no` | 접수번호 |
| `corp_cls` | 법인구분 (Y/K/N/E) |
| `corp_code` | 고유번호 |
| `corp_name` | 회사명 |
| `df_cn` | 부도내용 |
| `df_amt` | 부도금액 |
| `df_bnk` | 부도발생은행 |
| `dfd` | 최종부도일자 |
| `df_rs` | 부도사유 및 경위 |

> 영업정지(`bsnSp`)는 정지 범위·금액·매출 대비 비율·이사회 결의일 등을 반환한다(개별 필드 확인 필요).

---

## 3. 시그널 활용 힌트

- **대량보유 변동 (5%룰, `majorstock`)**: `stkrt_irds`(보유비율 증감)·`report_resn`(보고사유)로 대주주/기관의 신규 5% 진입, 추가 매집, 지분 축소를 포착 → 수급/지배구조 변화 시그널.
- **임원·주요주주 매매 (`elestock`)**: `sp_stock_lmp_irds_cnt`/`sp_stock_lmp_irds_rate`의 부호로 내부자 순매수(긍정)·순매도(부정) 시그널 추출. 등기임원/주요주주 구분(`isu_exctv_rgist_at`, `isu_main_shrholdr`)으로 가중.
- **증자·메자닌 발행 (희석 리스크)**: 유상증자(`piicDecsn`)·CB(`cvbdIsDecsn`)·BW(`bdwtIsDecsn`)·EB(`exbdIsDecsn`)는 신주/잠재주식 증가 → 지분 희석·오버행 부정 시그널. 자기주식 취득(`tsstkAqDecsn`)은 반대로 주주환원 긍정 시그널, 처분(`tsstkDpDecsn`)은 물량 부담.
- **재무 리스크 이벤트**: 부도발생(`dfOcr`)·영업정지(`bsnSp`)·회생절차 개시신청(`ctrcvsBgrq`)·해산사유(`dsRsOcr`)·채권은행 관리절차(`bnkMngtPcbg`)는 강한 부정/거래정지 위험 시그널 → 즉시 알림 대상.
- **구조 변경**: 합병/분할(`cmpMgDecsn`·`cmpDvDecsn`·`cmpDvmgDecsn`)·주식교환이전(`stkExtrDecsn`)·영업양수도(`bsnInhDecsn`/`bsnTrfDecsn`)는 밸류에이션 재평가 이벤트.

---

## 4. 미확인 / 후속

- DS005는 36개 엔드포인트 중 응답 `list[]` 필드 전체를 본 문서에서 확정한 것은 `piicDecsn`(유상증자)·`dfOcr`(부도발생) 2건뿐이다. 나머지 34개 엔드포인트의 개별 응답 필드 키는 **(확인 필요)** — 가이드 상세 페이지(`guide/detail.do?apiGrpCd=DS005&apiId=...`)에서 항목별로 확정 필요.
- `bnkMngtPcbg`/`bnkMngtPcsp` 등 일부 엔드포인트명은 가이드 개별 페이지에서 확인했으나 응답 필드 표는 미수집.
- `prvsrpCptalUseDtls`(사모자금의 사용내역)가 DS005 그룹에 속하는지, 혹은 정기보고서(DS002) 계열인지 **(확인 필요)** — 본 카탈로그 36개에는 미포함.
- DS005 공통 파라미터(`bgn_de`/`end_de`)의 1회 조회 최대 기간 제한 여부 **(확인 필요)**.
- `corp_cls` 코드값(Y=유가증권, K=코스닥, N=코넥스, E=기타)은 dfOcr 페이지 기준 표기이며 공통 문서와 교차 확인 권장.
