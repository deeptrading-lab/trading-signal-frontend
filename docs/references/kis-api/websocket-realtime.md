# KIS Open API — 웹소켓(WebSocket) 실시간 시세

한국투자증권(KIS) Open API 의 **WebSocket 실시간 시세/체결/체결통보** 레퍼런스. 접속키(approval_key) 발급 → ws 접속 → 구독 등록/해제 프로토콜, 실시간 TR 카탈로그, `|`/`^` 텍스트 응답 파싱 규약, 체결통보 AES256 복호화를 정리한다.

- **출처**:
  - [`examples_user/kis_auth.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/kis_auth.py) — `auth_ws()`(approval_key 발급), `KISWebSocket` 클래스(접속·구독·파싱·복호화)
  - [`examples_user/domestic_stock/domestic_stock_functions_ws.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/domestic_stock/domestic_stock_functions_ws.py) — 국내주식 실시간 TR·필드 카탈로그
  - [`examples_user/overseas_stock/overseas_stock_functions_ws.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/overseas_stock/overseas_stock_functions_ws.py) — 해외주식 실시간 TR·필드
  - [`examples_user/domestic_stock/domestic_stock_examples_ws.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/domestic_stock/domestic_stock_examples_ws.py) — 구독 예제
- **갱신일**: 2026-05-29
- **접속키 발급 등 인증·도메인·App Key 발급은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.**

> 실시간 데이터 필드 값은 REST 와 마찬가지로 **모두 문자열**이며, 응답 본문은 JSON 이 아니라 `|`/`^` 구분 텍스트로 내려온다(5절 참조). 필드 키는 소스 원문 그대로 유지했다(같은 항목이 KRX 계열은 소문자, NXT/통합 계열은 대문자로 오는 경우가 있어 그대로 둠).

---

## 1. 접속·인증 흐름

```
① approval_key 발급 (REST: POST /oauth2/Approval)
        ↓
② WebSocket 접속 (실전/모의 ws URL)
        ↓
③ 구독 등록 요청 전송 (header.tr_type="1")  ── TR 별 1건씩, 최대 40건
        ↓
④ 서버 응답 수신
   - 시스템 응답(JSON): 등록 성공/실패, 체결통보용 key/iv 수신
   - 실시간 데이터(텍스트 `0|...` / `1|...`): 시세 스트림
        ↓
⑤ PINGPONG 프레임에 pong 응답으로 세션 유지
        ↓
⑥ 구독 해제 요청 (header.tr_type="2")
```

### 1-1. approval_key 발급 (REST)

웹소켓 접속에 쓰는 **접속키(approval_key)** 는 일반 access token 과 별개로 `POST /oauth2/Approval` 로 받는다(`kis_auth.py`의 `auth_ws()`).

```http
POST /oauth2/Approval
Content-Type: application/json
```

```json
{
  "grant_type": "client_credentials",
  "appkey": "<App Key>",
  "secretkey": "<App Secret>"
}
```

- 일반 토큰 발급은 `appsecret` 키지만, **Approval 은 `secretkey` 키**를 쓴다(주의).
- 응답에서 `approval_key` 추출(`res.json()` → `approval_key`). 유효기간은 약 24시간(`reAuth_ws()`가 `86400`초 경과 시 재발급).

### 1-2. WebSocket 접속 URL

`kis_auth.py`는 URL 을 하드코딩하지 않고 설정(`kis_devlp.yaml`)의 `ops`(실전)/`vops`(모의) 키를 `my_url_ws` 로 읽어 `f"{my_url_ws}{api_url}"` 로 접속한다(`api_url` 예: `/tryitout`).

| 환경 | ws URL (포트 포함) | 비고 |
|------|--------------------|------|
| 실전 (ops)  | `ws://ops.koreainvestment.com:21000`  | KIS 표준값 **(확인 필요 — 소스 yaml 은 템플릿이라 실제 값 미게재)** |
| 모의 (vops) | `ws://ops.koreainvestment.com:31000`  | KIS 표준값 **(확인 필요 — 동일)** |

> 모의 REST 도메인(`:29443`)과 웹소켓 포트는 별개다. ws 경로(예: `/tryitout`)는 접속 함수 호출 시 지정한다. 실제 도메인/포트는 KIS 개발자 포털 또는 본인 `kis_devlp.yaml`(`ops`/`vops`)에서 최종 확인할 것.

### 1-3. 구독 등록/해제 요청 JSON

요청은 `header` + `body.input` 구조이며 TR 1건당 1메시지를 보낸다.

```json
{
  "header": {
    "approval_key": "<발급받은 approval_key>",
    "custtype": "P",
    "tr_type": "1",
    "content-type": "utf-8"
  },
  "body": {
    "input": {
      "tr_id": "H0STCNT0",
      "tr_key": "005930"
    }
  }
}
```

- `custtype`: 개인/법인 `"P"`, 제휴사 `"B"`.
- `tr_type`: **등록 / 해제 플래그**.
  - KIS 공식 문서 규약: `1`=등록, `2`=해제.
  - 단, 본 `kis_auth.py` 예제 구현은 등록 `"1"` / 해제 `"0"` 으로 호출한다(`send_multiple(..., "1", ...)`, 함수 인자 docstring 도 `"1"`/`"0"`). **해제 코드는 환경별로 `2` 또는 `0` 인지 검증 필요(확인 필요).**
- `tr_key`: TR 별 키(대부분 종목코드, 체결통보는 HTS ID — 카탈로그 참조).

### 1-4. 동시 구독 한도

- `kis_auth.py` `KISWebSocket.__runner()` 가 등록 TR 수 `> 40` 이면 `ValueError("Subscription's max is 40")` 를 던진다 → **본 예제 기준 최대 40건**.
- KIS 문서에서는 통상 **41건**으로 안내된다. 구현(40)과 문서(41) 사이에 1건 차이가 있으므로 보수적으로 **40건 이하**로 운용 권장.

---

## 2. 실시간 TR 카탈로그

`tr_key` 는 대부분 종목코드(6자리), 지수는 지수코드, 체결통보는 본인 HTS ID 다.
웹소켓 실시간 TR 은 **실전/모의 tr_id 가 동일**한 경우가 많다(`functions_ws.py`의 `env_dv` 분기에서 real/demo 모두 같은 ID 사용). 예외는 **체결통보**로, 실전 `*CNI0` / 모의 `*CNI9` 로 갈린다.

### 2-1. 국내주식

| 실시간 데이터(한글) | tr_id (실전/모의) | tr_key | 비고 |
|---------------------|-------------------|--------|------|
| 실시간호가 (KRX)        | `H0STASP0`            | 종목코드 | 매도/매수 10호가 |
| 실시간호가 (NXT)        | `H0NXASP0`            | 종목코드 | NXT(대체거래소), KMID/NMID 필드 추가 |
| 실시간호가 (통합)       | `H0UNASP0`            | 종목코드 | KRX+NXT 통합 |
| 실시간체결가 (KRX)      | `H0STCNT0`            | 종목코드 | **3절 상세** |
| 실시간체결가 (NXT)      | `H0NXCNT0`            | 종목코드 | |
| 실시간체결가 (통합)     | `H0UNCNT0`            | 종목코드 | |
| 실시간예상체결 (KRX)    | `H0STANC0`            | 종목코드 | |
| 실시간예상체결 (NXT)    | `H0NXANC0`            | 종목코드 | |
| 실시간예상체결 (통합)   | `H0UNANC0`            | 종목코드 | |
| 실시간체결통보          | `H0STCNI0` / `H0STCNI9` | HTS ID | 실전 `0`/모의 `9`. **AES256 복호화 필요(4절)** |
| 장운영정보 (KRX)        | `H0STMKO0`            | 종목코드 | VI/장상태 등 |
| 장운영정보 (NXT)        | `H0NXMKO0`            | 종목코드 | |
| 장운영정보 (통합)       | `H0UNMKO0`            | 종목코드 | |
| 실시간회원사 (KRX)      | `H0STMBC0`            | 종목코드 | 증권사별 매매 5위 |
| 실시간회원사 (NXT)      | `H0NXMBC0`            | 종목코드 | |
| 실시간회원사 (통합)     | `H0UNMBC0`            | 종목코드 | |
| 실시간프로그램매매 (KRX)| `H0STPGM0`            | 종목코드 | |
| 실시간프로그램매매 (NXT)| `H0NXPGM0`            | 종목코드 | |
| 실시간프로그램매매 (통합)| `H0UNPGM0`           | 종목코드 | |
| 시간외 실시간호가 (KRX) | `H0STOAA0`            | 종목코드 | 9호가 |
| 시간외 실시간체결가 (KRX)| `H0STOUP0`           | 종목코드 | |
| 시간외 실시간예상체결 (KRX)| `H0STOAC0`         | 종목코드 | |

### 2-2. 국내지수

| 실시간 데이터(한글) | tr_id | tr_key | 비고 |
|---------------------|-------|--------|------|
| 지수 실시간체결      | `H0UPCNT0` | 지수코드(예: `0001`=KOSPI, `0128`) | |
| 지수 실시간예상체결  | `H0UPANC0` | 지수코드 | |
| 지수 실시간프로그램매매| `H0UPPGM0` | 지수코드 | 차익/비차익 거래 |

### 2-3. 해외주식

| 실시간 데이터(한글) | tr_id (실전/모의) | tr_key | 비고 |
|---------------------|-------------------|--------|------|
| 실시간호가 (미국, 무료)   | `HDFSASP0`            | 심볼(예: `DNASAAPL`) | 1호가 |
| 지연호가 (아시아)         | `HDFSASP1`            | 심볼(예: `DHKS00003`) | 15분 지연 |
| 실시간지연체결가          | `HDFSCNT0`            | 심볼(예: `DNASAAPL`) | 미국 애프터마켓 포함 |
| 실시간체결통보            | `H0GSCNI0` / `H0GSCNI9` | HTS ID | 실전 `0`/모의 `9`. **AES256 복호화 필요** |

> 해외 심볼 형식: `D` + 거래소(`NAS`/`NYS`/`AMS`/`HKS` 등) + 종목코드. 자세한 거래소 코드는 해외시세 REST 레퍼런스 참조.

---

## 3. 핵심 상세

실시간 본문(`0|...` / `1|...`)을 `|` 로 분리한 4번째 토막(인덱스 3)을 `^` 로 분리한 순서가 아래 필드 순서다.

### 3-1. 실시간체결가 — `H0STCNT0` (국내주식, KRX)

`MKSC_SHRN_ISCD`(종목코드) → `STCK_CNTG_HOUR`(체결시각) → `STCK_PRPR`(현재가) 순으로 시작한다.

| 순번 | 필드 키 | 설명 |
|------|---------|------|
| 1 | `MKSC_SHRN_ISCD` | 유가증권 단축 종목코드 |
| 2 | `STCK_CNTG_HOUR` | 주식 체결 시간 (HHMMSS) |
| 3 | `STCK_PRPR` | 주식 현재가 |
| 4 | `PRDY_VRSS_SIGN` | 전일 대비 부호 |
| 5 | `PRDY_VRSS` | 전일 대비 |
| 6 | `PRDY_CTRT` | 전일 대비율 |
| 7 | `WGHN_AVRG_STCK_PRC` | 가중평균 주식가격 |
| 8 | `STCK_OPRC` | 시가 |
| 9 | `STCK_HGPR` | 고가 |
| 10 | `STCK_LWPR` | 저가 |
| 11 | `ASKP1` | 매도호가1 |
| 12 | `BIDP1` | 매수호가1 |
| 13 | `CNTG_VOL` | 체결 거래량 |
| 14 | `ACML_VOL` | 누적 거래량 |
| 15 | `ACML_TR_PBMN` | 누적 거래대금 |
| 16 | `SELN_CNTG_CSNU` | 매도 체결 건수 |
| 17 | `SHNU_CNTG_CSNU` | 매수 체결 건수 |
| 18 | `NTBY_CNTG_CSNU` | 순매수 체결 건수 |
| 19 | `CTTR` | 체결강도 |
| 20 | `SELN_CNTG_SMTN` | 총 매도 수량 |
| 21 | `SHNU_CNTG_SMTN` | 총 매수 수량 |
| 22 | `CCLD_DVSN` | 체결구분 |
| 23 | `SHNU_RATE` | 매수비율 |
| 24 | `PRDY_VOL_VRSS_ACML_VOL_RATE` | 전일 거래량 대비 등락률 |
| 25 | `OPRC_HOUR` | 시가 시간 |
| 26 | `OPRC_VRSS_PRPR_SIGN` | 시가 대비 구분 |
| 27 | `OPRC_VRSS_PRPR` | 시가 대비 |
| 28 | `HGPR_HOUR` | 고가 시간 |
| 29 | `HGPR_VRSS_PRPR_SIGN` | 고가 대비 구분 |
| 30 | `HGPR_VRSS_PRPR` | 고가 대비 |
| 31 | `LWPR_HOUR` | 저가 시간 |
| 32 | `LWPR_VRSS_PRPR_SIGN` | 저가 대비 구분 |
| 33 | `LWPR_VRSS_PRPR` | 저가 대비 |
| 34 | `BSOP_DATE` | 영업 일자 |
| 35 | `NEW_MKOP_CLS_CODE` | 신 장운영 구분 코드 |
| 36 | `TRHT_YN` | 거래정지 여부 |
| 37 | `ASKP_RSQN1` | 매도호가 잔량1 |
| 38 | `BIDP_RSQN1` | 매수호가 잔량1 |
| 39 | `TOTAL_ASKP_RSQN` | 총 매도호가 잔량 |
| 40 | `TOTAL_BIDP_RSQN` | 총 매수호가 잔량 |
| 41 | `VOL_TNRT` | 거래량 회전율 |
| 42 | `PRDY_SMNS_HOUR_ACML_VOL` | 전일 동시간 누적 거래량 |
| 43 | `PRDY_SMNS_HOUR_ACML_VOL_RATE` | 전일 동시간 누적 거래량 비율 |
| 44 | `HOUR_CLS_CODE` | 시간 구분 코드 |
| 45 | `MRKT_TRTM_CLS_CODE` | 임의연장 구분 코드 |
| 46 | `VI_STND_PRC` | VI 기준가 |

> `H0NXCNT0`(NXT)/`H0UNCNT0`(통합)도 거의 동일 순서이나, 22번이 `CCLD_DVSN` 대신 `CNTG_CLS_CODE` 로 표기된다. 시간외 체결가 `H0STOUP0` 는 46번(`VI_STND_PRC`)이 없다(45필드).

### 3-2. 실시간호가 — `H0STASP0` (국내주식, KRX)

매도/매수 각 10호가. 필드 순서:

| 구간 | 필드 키 | 설명 |
|------|---------|------|
| 1 | `MKSC_SHRN_ISCD` | 종목코드 |
| 2 | `BSOP_HOUR` | 영업 시간 |
| 3 | `HOUR_CLS_CODE` | 시간 구분 코드 |
| 4~13 | `ASKP1` ~ `ASKP10` | 매도호가 1~10 |
| 14~23 | `BIDP1` ~ `BIDP10` | 매수호가 1~10 |
| 24~33 | `ASKP_RSQN1` ~ `ASKP_RSQN10` | 매도호가 잔량 1~10 |
| 34~43 | `BIDP_RSQN1` ~ `BIDP_RSQN10` | 매수호가 잔량 1~10 |
| 44 | `TOTAL_ASKP_RSQN` | 총 매도호가 잔량 |
| 45 | `TOTAL_BIDP_RSQN` | 총 매수호가 잔량 |
| 46 | `OVTM_TOTAL_ASKP_RSQN` | 시간외 총 매도호가 잔량 |
| 47 | `OVTM_TOTAL_BIDP_RSQN` | 시간외 총 매수호가 잔량 |
| 48 | `ANTC_CNPR` | 예상 체결가 |
| 49 | `ANTC_CNQN` | 예상 체결량 |
| 50 | `ANTC_VOL` | 예상 거래량 |
| 51 | `ANTC_CNTG_VRSS` | 예상 체결 대비 |
| 52 | `ANTC_CNTG_VRSS_SIGN` | 예상 체결 대비 부호 |
| 53 | `ANTC_CNTG_PRDY_CTRT` | 예상 체결 전일대비율 |
| 54 | `ACML_VOL` | 누적 거래량 |
| 55 | `TOTAL_ASKP_RSQN_ICDC` | 총 매도호가 잔량 증감 |
| 56 | `TOTAL_BIDP_RSQN_ICDC` | 총 매수호가 잔량 증감 |
| 57 | `OVTM_TOTAL_ASKP_ICDC` | 시간외 총 매도호가 증감 |
| 58 | `OVTM_TOTAL_BIDP_ICDC` | 시간외 총 매수호가 증감 |
| 59 | `STCK_DEAL_CLS_CODE` | 주식 매매 구분 코드 |

> NXT(`H0NXASP0`)/통합(`H0UNASP0`)은 위 59필드 뒤에 `KMID_PRC`, `KMID_TOTAL_RSQN`, `KMID_CLS_CODE`, `NMID_PRC`, `NMID_TOTAL_RSQN`, `NMID_CLS_CODE` 6필드가 추가된다.

### 3-3. 실시간체결통보 — `H0STCNI0`(실전)/`H0STCNI9`(모의)

내 주문의 접수/체결을 푸시한다. **본문이 AES256 암호화되어 옴 → 복호화 후 `^` 파싱**(4절). `tr_key` 는 종목코드가 아니라 **본인 HTS ID**.

| 순번 | 필드 키 | 설명 |
|------|---------|------|
| 1 | `CUST_ID` | 고객 ID |
| 2 | `ACNT_NO` | 계좌번호 |
| 3 | `ODER_NO` | 주문번호 |
| 4 | `OODER_NO` | 원주문번호 |
| 5 | `SELN_BYOV_CLS` | 매도매수 구분 |
| 6 | `RCTF_CLS` | 정정구분 |
| 7 | `ODER_KIND` | 주문종류 |
| 8 | `ODER_COND` | 주문조건 |
| 9 | `STCK_SHRN_ISCD` | 종목코드 |
| 10 | `CNTG_QTY` | 체결 수량 |
| 11 | `CNTG_UNPR` | 체결 단가 |
| 12 | `STCK_CNTG_HOUR` | 체결 시간 |
| 13 | `RFUS_YN` | 거부 여부 |
| 14 | `CNTG_YN` | 체결 여부 |
| 15 | `ACPT_YN` | 접수 여부 |
| 16 | `BRNC_NO` | 지점번호 |
| 17 | `ODER_QTY` | 주문 수량 |
| 18 | `ACNT_NAME` | 계좌명 |
| 19 | `ORD_COND_PRC` | 호가 조건가격 |
| 20 | `ORD_EXG_GB` | 주문 거래소 구분 |
| 21 | `POPUP_YN` | 팝업 여부 |
| 22 | `FILLER` | 필러 |
| 23 | `CRDT_CLS` | 신용 구분 |
| 24 | `CRDT_LOAN_DATE` | 신용 대출일자 |
| 25 | `CNTG_ISNM40` | 종목명 |
| 26 | `ODER_PRC` | 주문 가격 |

> 해외주식 체결통보 `H0GSCNI0`/`H0GSCNI9` 도 동일하게 암호화되며 필드 셋만 다르다(`ODER_KIND2`, `CNTG_ISNM`, `DEBT_GB`, `START_TM`/`END_TM`/`TM_DIV_TP`, `CNTG_UNPR12` 등 포함).

---

## 4. 체결통보 AES256 복호화

체결통보(`*CNI*`)는 **본문이 AES-256-CBC + Base64 로 암호화**되어 온다(`kis_auth.py` `aes_cbc_base64_dec`).

복호화 절차:

1. **구독 등록 직후** 서버가 보내는 **시스템 응답(JSON)** 의 `body.output` 에서 키를 받는다.
   - `ekey = rdic["body"]["output"]["key"]`
   - `iv  = rdic["body"]["output"]["iv"]`
   - 또한 헤더 `rdic["header"]["encrypt"]` 가 `"Y"` 면 암호화 대상.
2. 이후 들어오는 실시간 데이터 프레임의 **선두 문자가 `1`** 이면 암호화 본문 → 위 key/iv 로 복호화.
   - 선두 `0` = 평문(시세류), 선두 `1` = 암호화(체결통보류).
3. 복호화 알고리즘: `AES.new(key, AES.MODE_CBC, iv)` → Base64 디코드한 cipher_text 복호화 → unpad → 결과 문자열을 `^` 로 파싱.

```python
# kis_auth.py (요지)
cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
plaintext = unpad(cipher.decrypt(base64.b64decode(cipher_text)), AES.block_size)
```

> key/iv 는 **세션·구독 단위로 발급**되며, 등록 응답을 놓치면 복호화 불가하므로 구독 직후 시스템 응답을 반드시 보관할 것.

---

## 5. 실시간 응답 파싱 규약 (`|` / `^`)

실시간 데이터 프레임은 JSON 이 아니라 파이프(`|`)로 4토막, 데이터부는 캐럿(`^`)으로 필드 분리된다(`kis_auth.py` `__subscriber`).

```
<암호화여부>|<tr_id>|<데이터건수>|<데이터부>
   0 또는 1 | H0STCNT0 |    001    | 005930^123459^71500^...
```

| 토막(인덱스) | 의미 |
|--------------|------|
| `[0]` | 암호화 여부 — `0`=평문, `1`=암호화(복호화 필요) |
| `[1]` | `tr_id` (이 값으로 필드 스키마/컬럼 결정) |
| `[2]` | 데이터 건수(한 프레임에 여러 종목 묶여 올 수 있음) |
| `[3]` | **데이터부** — `^` 로 필드 구분. 건수>1 이면 같은 컬럼 셋이 반복 |

파싱 로직(요지):

```python
if raw[0] in ("0", "1"):            # 실시간 데이터
    d1 = raw.split("|")             # 최소 4토막 필요
    tr_id = d1[1]
    body  = d1[3]
    if encrypt == "Y":              # 체결통보 등
        body = aes_cbc_base64_dec(key, iv, body)
    rows = body.split("^")          # tr_id 별 컬럼 순서에 매핑
else:                               # JSON 시스템 응답(등록/해제 결과, key/iv, PINGPONG)
    ...
```

- **PINGPONG**: `tr_id == "PINGPONG"` 인 JSON 프레임이 오면 받은 원본으로 `pong` 응답 → 세션 유지.
- **시스템 응답**: 등록/해제 결과(`body.rt_cd`, `body.msg1`), 해제는 `msg1` 가 `UNSUB` 으로 시작. 체결통보 key/iv 도 여기서 수신.
- 한 프레임에 **여러 건(`[2]`>1)** 이 올 수 있으므로 컬럼 수 단위로 끊어 반복 매핑해야 한다.

### 5-1. 동시 구독 한도 (재명시)

- 구현 한도: **최대 40건**(`open_map > 40` 시 `ValueError`). KIS 문서 통상치 41건. → 40건 이하 운용 권장.
- 1 구독 = (tr_id, tr_key) 1쌍. 같은 종목이라도 체결가/호가/회원사는 각각 1건씩 차감.

---

## 6. 미확인 / 후속

- **실제 ws 도메인·포트**: 소스의 `kis_devlp.yaml` 이 템플릿(빈/주석)이라 `ops`/`vops` 실값 미게재. 본문 표의 `:21000`(실전)/`:31000`(모의)은 KIS 표준 통용값으로 **포털·본인 yaml 에서 최종 확인 필요**.
- **해제 tr_type 값**: KIS 공식 문서 `2`=해제 vs 본 예제 구현 `"0"`=해제 불일치. 운용 환경에서 실제 동작 확인 필요.
- **동시 구독 한도 40 vs 41**: 구현(40)·문서(41) 차이. 안전하게 40 이하 권장.
- **NXT/통합 체결가 22번 필드**: KRX 는 `CCLD_DVSN`, NXT/통합은 `CNTG_CLS_CODE` 로 표기 차이 — 동일 의미인지 추가 검증 필요.
- 각 필드의 정확한 자료형/소수 자릿수·코드값 사전(예: `PRDY_VRSS_SIGN`, `HOUR_CLS_CODE` 코드표)은 KIS 개발자 포털 실시간 명세 참조(본 문서 미수록).
- 해외주식 실시간호가/체결가 필드 한글 설명은 소스에 영문 약어만 있어 일부 의미 매핑 미확정(`zdiv`, `bdvl`, `strn`, `mtyp` 등).
