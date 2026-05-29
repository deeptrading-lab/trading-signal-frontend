# 관심종목 실시간 시세 — KIS WebSocket 타당성 리서치

관심종목 실시간 시세를 KIS WebSocket(실시간체결가 `H0STCNT0`)으로 구현하고, WS 연결이 계속 실패하면 REST 로 폴백하는 구조의 **타당성**을 정리한 문서다. (코드 구현 아님 — 설계 결정용 사전 리서치)

- **갱신일**: 2026-05-30
- **배경**: 현재 관심종목은 REST(`inquire-price` + `search-stock-info`) 합성. 종목 수 × 2콜이 초당 호출 제한(`EGW00201` "초당 거래건수 초과")에 걸려 일부 종목이 자주 실패. → 실시간 push 로 콜 수를 0 에 수렴시키고, 폴백 시에도 N콜 → 1콜(`intstock_multprice`)로 줄이는 것이 목표.
- **이 프로젝트 전제**: Next.js App Router, 조회·분석 전용, 실전(prod) 키 + `KIS_ENV=prod`, 주문 코드 영구 부재. 현재 로컬/자체호스팅(Vercel 미연동).

## 출처(확인한 공식/소스 URL)

- KIS 공식 GitHub `koreainvestment/open-trading-api`
  - [`kis_devlp.yaml`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/kis_devlp.yaml) — **ws URL 실값 확인됨**(아래 A-1)
  - [`examples_user/kis_auth.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/kis_auth.py) — approval_key 발급, `KISWebSocket` 접속/구독/파싱
  - [`examples_llm/domestic_stock/intstock_multprice/intstock_multprice.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_llm/domestic_stock/intstock_multprice/intstock_multprice.py) — 일괄시세 요청 파라미터(최대 30종목)
  - [`examples_llm/domestic_stock/intstock_multprice/chk_intstock_multprice.py`](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_llm/domestic_stock/intstock_multprice/chk_intstock_multprice.py) — 응답 컬럼 매핑
- KIS 개발자 포털 — [웹소켓 접속키 발급 `/oauth2/Approval`](https://apiportal.koreainvestment.com/apiservice-apiservice?%2Foauth2%2FApproval=)
- 커뮤니티 검증 — [파이썬으로 배우는 KIS Websocket 예제(wikidocs 170517)](https://wikidocs.net/170517), [KIS 웹소켓 유량 제한 대응(hky035)](https://hky035.github.io/web/refact-kis-websocket/)
- 기존 사내 레퍼런스 — `docs/references/kis-api/websocket-realtime.md`, `00-auth-and-common.md`, `domestic-stock-quotations.md`

---

## A. KIS WebSocket 실체

### A-1. ws 도메인/포트 — `ws://` (비TLS) 로 확정

`kis_devlp.yaml` 의 실값을 직접 확인했다(기존 사내 문서에서 "확인 필요"였던 부분 해소).

| 환경 | ws URL (포트 포함) | 출처 |
|------|--------------------|------|
| 실전(ops)  | `ws://ops.koreainvestment.com:21000` | `kis_devlp.yaml` 원문 |
| 모의(vops) | `ws://ops.koreainvestment.com:31000` | `kis_devlp.yaml` 원문 |

> **결론: 두 환경 모두 `ws://`(평문, 비TLS)이다. `wss://`(TLS) 엔드포인트는 KIS 가 제공하지 않는다(공식 yaml·커뮤니티 예제 전부 `ws://`).** 이것이 본 리서치의 핵심 제약이다(A-2).
> 이 프로젝트는 실전이므로 `ws://ops.koreainvestment.com:21000` 1개만 사용한다.

### A-2. 브라우저 직접 연결 가능한가? — ❌ 불가(mixed content) → 서버 중계 필수

- 프런트는 HTTPS 로 서빙된다(자체호스팅이라도 보통 HTTPS, 추후 Vercel 도 HTTPS). **HTTPS 페이지에서 `ws://`(비TLS) 연결은 모든 모던 브라우저가 mixed content 로 차단**한다. 예외 없음(`ws:` 는 `https:` 컨텍스트에서 blockable mixed content 로 분류).
- KIS 가 `wss://` 를 제공하지 않으므로 **브라우저가 KIS WS 에 직접 붙는 경로는 원천적으로 막혀 있다.** (HTTP 로컬 dev 페이지에서만 우연히 되지만, 운영 HTTPS 에서는 불가 → 설계 근거로 못 씀.)
- 부가로, KIS WS 는 같은 도메인이 아니므로 SOP/CORS 와도 무관하게 mixed content 가 먼저 막는다. 또한 KIS WS 의 인증은 헤더가 아니라 **구독 프레임 body 의 approval_key** 로 하므로 브라우저 핸드셰이크 자체는 가능하나, 위 mixed content 로 시작조차 안 된다.

> **결론(핵심): 브라우저 직접 WS = 불가. 반드시 서버가 KIS `ws://` 에 붙고, 브라우저에는 `wss://`(TLS) 또는 SSE 로 재전송하는 "서버 중계"가 필요하다.** approval_key/App Secret 노출 방지(§8 보안) 측면에서도 서버 중계가 유일하게 안전한 패턴이다.

### A-3. approval_key 흐름

- 발급: `POST /oauth2/Approval` (실전 base `https://openapi.koreainvestment.com:9443`), body `{ grant_type:"client_credentials", appkey, secretkey }` → 응답 `approval_key`. ⚠️ 일반 토큰은 `appsecret`, Approval 은 **`secretkey`** 필드명(00-auth-and-common.md §3 재확인). 유효기간 약 24h.
- 사용: WS 구독 프레임 `header.approval_key` 에 넣는다(access token 과 별개, WS 에는 access token 불필요).
- **approval_key 만으로 구독 가능 & App Secret 미노출 가능**: 클라이언트에 approval_key 만 내려주면 이론상 App Secret 없이 구독은 된다. **하지만 권장하지 않는다.**
  - (1) A-2 때문에 브라우저가 `ws://` 에 못 붙으므로 클라이언트가 approval_key 를 들고 있을 이유 자체가 없다.
  - (2) approval_key 는 24h 동안 임의 구독을 허용하는 자격증명 → 클라이언트 노출 시 남용 가능.
  - (3) **approval_key 1개 = 동시 WS 연결 1개**만 허용된다(커뮤니티 확인: 두 번째 연결 시 기존 키가 이미 사용 중이라 연결 실패). 사용자/탭마다 키를 뿌리면 서로 연결을 끊어먹는다.
- **권장: approval_key 발급·보관·KIS WS 연결을 전부 서버(BFF)에서.** 클라이언트는 서버 중계(wss/SSE)에만 붙는다.

### A-4. 구독 프로토콜 (H0STCNT0)

- 등록/해제 프레임(JSON): `header.approval_key`, `header.custtype="P"`, `header.tr_type`(등록/해제), `body.input.tr_id="H0STCNT0"`, `body.input.tr_key="<종목코드 6자리>"`. **TR 1건당 1메시지.**
  - `tr_type`: KIS 문서는 `1`=등록/`2`=해제, 그러나 `kis_auth.py` 예제 구현은 `1`/`0`. **해제 코드는 운영에서 검증 필요(확인 필요).**
- 동시 구독 한도: 예제 구현 **40건**(`>40` 시 `ValueError`), KIS 문서 통상 41. → **40 이하 운용 권장.** 관심종목이 40 초과면 폴백(C) 또는 분할 구독 필요(OPEN QUESTION).
  - 1 구독 = (tr_id, tr_key) 1쌍. 체결가만 쓰면 종목당 1건.
- 응답 파싱: 실시간 데이터는 JSON 이 아니라 `|`/`^` 구분 텍스트. `<암호화여부>|<tr_id>|<건수>|<데이터부>`, 데이터부는 `^` 로 필드 분리. `H0STCNT0` 평문(암호화여부 `0`). 한 프레임에 여러 건(`[2]`>1) 가능.
- `H0STCNT0` 필드 순서(요지): 1 `MKSC_SHRN_ISCD`(종목코드) / 2 `STCK_CNTG_HOUR`(체결시각) / 3 `STCK_PRPR`(현재가) / 4 `PRDY_VRSS_SIGN`(전일대비부호) / 5 `PRDY_VRSS`(전일대비) / 6 `PRDY_CTRT`(전일대비율) / 8 `STCK_OPRC`(시가) / 9 `STCK_HGPR`(고가) / 10 `STCK_LWPR`(저가) / 14 `ACML_VOL`(누적거래량) … 전체 46필드는 `websocket-realtime.md` §3-1 참조.
- 세션 유지: `tr_id=="PINGPONG"` JSON 수신 시 받은 원본으로 pong 응답.

### A-5. 장 운영시간

- WS push 는 **장중 체결이 있을 때만** 발생. 장 시작 전/장 마감 후/주말엔 틱이 없다 → 현재가가 안 올라온다.
- 따라서 **초기 스냅샷(구독 직후 첫 화면 채우기)과 장외 상태 표시는 REST 가 반드시 필요**하다(C 절 `intstock_multprice`).
- (확인 필요) 시간외 단일가/장전 동시호가 구간의 `H0STCNT0` push 여부 및 시간외 전용 TR(`H0STOUP0`) 사용 여부 — 운영 단계 결정 사항.

---

## B. Next.js 아키텍처 적합성

### B-1. 서버 중계 방식의 제약

KIS WS 연결은 **장 시간 내내 유지되는 long-lived 연결**이 핵심이다. Next.js 의 주요 실행 모델별 적합성:

| 패턴 | 장기 WS 유지 | 평가 |
|------|--------------|------|
| (a) 클라이언트 → KIS WS 직접 | — | **불가**(A-2 mixed content + approval_key 1연결 제약). 탈락. |
| (b) Next.js route handler / Vercel serverless 가 KIS WS 보유 | ✕ | serverless 함수는 수명(수십초~분) 후 종료 → 장중 내내 못 버팀. Edge runtime 도 동일. **부적합.** |
| (c) **long-running Node 프로세스(상주 WS 서버)** 가 KIS WS 1개 보유 → 클라이언트에 `wss://`/SSE 재전송 | ✓ | KIS 의 "approval_key 1연결" 제약과도 잘 맞음(중앙 1연결 → fan-out). **본 프로젝트에 적합.** |
| (d) self-hosted Next.js(`next start`, custom server) 가 상주 프로세스 겸용 | ✓ | 현재 자체호스팅이므로 custom server / 별도 worker 로 (c) 를 구현 가능. |

> **결론: (c)/(d) — 상주 Node 프로세스가 KIS WS 1개를 보유하고 모든 클라이언트에 fan-out 하는 구조가 유일하게 현실적.** Vercel serverless 로는 WS 중계 불가. 현재 Vercel 미연동·자체호스팅이라 상주 프로세스 운용에 제약이 없다(오히려 유리). Vercel 연동 시점에는 WS 중계를 별도 상주 서버(예: Fly/Railway/Render/단독 Node)로 떼야 함(OPEN QUESTION).

### B-2. 클라이언트 ↔ 서버 중계 전송수단: SSE vs WebSocket

- **SSE(Server-Sent Events)** 권장: 단방향 push(시세는 서버→클라만 필요), HTTP/HTTPS 위에서 동작 → mixed content 무관, 자동 재연결 내장, Next.js route handler 의 `ReadableStream` 으로 구현 용이. 단 SSE 응답을 흘리려면 라우트가 상주 프로세스에 연결돼 있어야 함(B-1 (c)).
- 클라이언트→서버 **wss**: 양방향(구독 종목 동적 변경)이 필요하면 채택. 다만 상주 WS 서버가 추가로 필요.
- **결론: 초기 구현은 SSE 중계가 단순·안전. 구독 종목 변경은 별도 REST(POST)로 서버에 알리면 됨.**

### B-3. REST 폴백 트리거 / 재연결

- 폴백 전환 조건(예시, PRD 확정 대상): KIS WS 연결이 **N회(예 3회) 연속 실패** 또는 **연결 후 T초(예 10s) 내 첫 데이터 없음** 또는 **PINGPONG 응답 끊김** → REST 폴링 모드로 전환.
- 재연결: 지수 backoff(예 1s→2s→4s→… 최대 30s) + jitter. 장외 시간엔 재연결 시도를 늦추거나 중단.
- WS 복구 시: 다음 폴링 주기에서 WS 재시도 성공하면 폴링 중단하고 push 재전환.
- 폴백 폴링 주기: `intstock_multprice` 1콜로 전 종목을 받으므로 초당 1콜 미만(예 2~5초 간격)로 충분 → `EGW00201` 회피. (현재 N×2콜 방식 대비 콜 수 급감.)
- (확인 필요) 폴백 판정의 정확한 N/T 값, 장외 시 폴링 중단 여부.

---

## C. 일괄 시세 — `intstock_multprice` (초기 스냅샷 + REST 폴백)

소스(`intstock_multprice.py` / `chk_intstock_multprice.py`)에서 확인.

### C-1. 요청

| 항목 | 값 |
|------|----|
| Method / Path | `GET /uapi/domestic-stock/v1/quotations/intstock-multprice` |
| tr_id | `FHKST11300006` |
| 한 번에 종목 수 | **최대 30종목** ("한 번의 호출에 최대 30종목의 시세 확인 가능") |

요청 파라미터는 **종목별 시장구분코드 + 종목코드 쌍을 1~30번까지** 넘긴다:

| 파라미터 | 설명 |
|----------|------|
| `FID_COND_MRKT_DIV_CODE_1` | 1번 종목 시장구분(예: `"J"`=주식) — **필수** |
| `FID_INPUT_ISCD_1` | 1번 종목코드(6자리) — **필수** |
| `FID_COND_MRKT_DIV_CODE_2` ~ `_30` | 2~30번 종목 시장구분 — 선택(있을 때만) |
| `FID_INPUT_ISCD_2` ~ `_30` | 2~30번 종목코드 — 선택 |

예제 호출: `fid_cond_mrkt_div_code_1="J", fid_input_iscd_1="419530", fid_cond_mrkt_div_code_2="J", fid_input_iscd_2="092070"`.

> 관심종목 40개라면 **2콜**(30 + 10)로 전부 커버. 현재 방식(40종목 × 2콜 = 80콜)에서 N콜→2콜로 급감 → rate limit 회피의 핵심.

### C-2. 응답 필드(컬럼) — `chk_intstock_multprice.py` 매핑 기준

종목 1건당 아래 컬럼 셋이 반복된다(접두 `inter2_` 가 해당 종목 시세). 주요 컬럼:

| 필드 키 | 의미 |
|---------|------|
| `inter_shrn_iscd` | 관심 단축 종목코드 |
| `inter_kor_isnm` | 관심 한글 종목명 |
| `inter2_prpr` | 현재가 |
| `inter2_prdy_vrss` | 전일 대비 |
| `prdy_vrss_sign` | 전일 대비 부호 |
| `prdy_ctrt` | 전일 대비율(%) |
| `acml_vol` | 누적 거래량 |
| `acml_tr_pbmn` | 누적 거래대금 |
| `inter2_oprc` / `inter2_hgpr` / `inter2_lwpr` | 시가 / 고가 / 저가 |
| `inter2_mxpr` / `inter2_llam` | 상한가 / 하한가 |
| `inter2_askp` / `inter2_bidp` | 매도호가 / 매수호가 |
| `seln_rsqn` / `shnu_rsqn` | 매도 잔량 / 매수 잔량 |
| `total_askp_rsqn` / `total_bidp_rsqn` | 총 매도/매수호가 잔량 |
| `inter2_prdy_clpr` | 전일 종가 |
| `inter2_sdpr` | 기준가 |
| `oprc_vrss_hgpr_rate` | 시가 대비 최고가 비율 |
| `intr_antc_cntg_vrss` / `intr_antc_cntg_vrss_sign` / `intr_antc_cntg_prdy_ctrt` / `intr_antc_vol` | 예상 체결 대비/부호/전일대비율/거래량 |
| `kospi_kosdaq_cls_name` / `mrkt_trtm_cls_name` / `hour_cls_code` | 코스피·코스닥 구분 / 시장조치구분 / 시간구분 |

> WS `H0STCNT0` 의 현재가/등락/등락률/거래량과 매핑 가능하므로, **스냅샷(intstock_multprice) → 이후 WS 델타 갱신**으로 일관된 화면 모델을 만들 수 있다. 모든 값 문자열(REST 공통).

> **결론: `intstock_multprice` 는 초기 스냅샷 + REST 폴백 둘 다에 적합.** 최대 30종목/콜이라 관심종목을 30 단위로 chunk.

---

## 권장 아키텍처 (1안)

```
[브라우저(HTTPS)]                  [상주 Node 중계 서버 (BFF/worker)]            [KIS]
   │                                      │                                       │
   │  (1) 초기 스냅샷 요청 (HTTPS GET)     │── REST intstock_multprice ─────────────▶│  (30종목/콜)
   │◀──────────── 스냅샷 JSON ────────────│◀──────────── 응답 ──────────────────────│
   │                                      │                                       │
   │  (2) SSE 구독 (GET, text/event-stream)│                                       │
   │═════════════════════════════════════│                                       │
   │                                      │── POST /oauth2/Approval ──────────────▶│  approval_key (서버 보관)
   │                                      │── ws://ops...:21000 연결(1개) ─────────▶│
   │                                      │── 구독프레임 H0STCNT0 ×N (≤40) ────────▶│
   │◀═══ SSE push(종목별 현재가 델타) ════│◀═══ |/^ 텍스트 스트림 ══════════════════│  (장중)
   │                                      │   PINGPONG ↔ pong 으로 세션 유지         │
   │                                      │                                       │
   │  (WS N회 실패/타임아웃)               │── 폴백: intstock_multprice 폴링(2~5s)──▶│
   │◀═══ SSE push(폴링 결과) ═════════════│   WS 복구되면 폴링 중단 → push 재개      │
```

**단계 서술**
1. **연결 주체 = 상주 Node 중계 서버**(클라이언트 아님). 서버가 `POST /oauth2/Approval` 로 approval_key 발급·보관(24h, 만료 전 1회 재발급).
2. 서버가 KIS `ws://ops.koreainvestment.com:21000` 에 **단일 연결**을 맺고, 관심종목(≤40)을 `H0STCNT0` 로 구독. 다수 클라이언트는 이 1연결을 SSE 로 **fan-out** 공유(approval_key 1연결 제약 충족).
3. 브라우저는 (1) 초기 스냅샷을 `intstock_multprice` 결과로 받고, (2) SSE 로 WS 델타를 받아 갱신. 브라우저는 KIS 에 직접 접속하지 않음.
4. **폴백**: 서버가 WS 연결 N회 실패/타임아웃 감지 시 `intstock_multprice` 폴링(2~5초)으로 전환, SSE 로 계속 push. WS 복구 시 폴링 중단·push 재개.
5. 구독 종목 변경은 클라이언트 → 서버 REST(POST)로 통지, 서버가 WS 등록/해제 프레임 송신.

**필요한 환경변수(서버 전용, 클라이언트 노출 금지)**

| 변수 | 용도 |
|------|------|
| `KIS_APP_KEY` / `KIS_APP_SECRET` | approval_key & access token 발급 (서버 전용) |
| `KIS_ENV=prod` | 실전 고정(기존 컨벤션) |
| `KIS_REST_BASE=https://openapi.koreainvestment.com:9443` | REST(스냅샷/폴백) base |
| `KIS_WS_URL=ws://ops.koreainvestment.com:21000` | 실전 WS 엔드포인트 |
| (폴백/연결 파라미터) `WS_FAIL_THRESHOLD`, `WS_FIRST_DATA_TIMEOUT_MS`, `FALLBACK_POLL_INTERVAL_MS`, `WS_MAX_SUBSCRIPTIONS`(≤40) | B-3 트리거 튜닝값 |

---

## OPEN QUESTION (PRD 결정 후보)

1. **상주 중계 서버의 호스팅 형태**: 현재 자체호스팅 Next custom server에 worker 동거 vs 별도 프로세스/서비스. Vercel 연동 시 WS 중계를 어디로 뺄지(Vercel serverless 불가 — B-1).
2. **클라이언트 전송수단**: SSE(단방향, 권장) vs wss(양방향). 구독 변경 빈도/UX 요구에 따라.
3. **관심종목 > 40 일 때 정책**: 분할 구독(다중 approval_key/다중 연결은 KIS 가 "1키 1연결"로 막음 → 추가 키 필요?) vs 상위 40만 WS·나머지는 폴링. (확인 필요: 한 계정에서 approval_key 다중 발급/다중 WS 연결 허용 여부.)
4. **폴백 판정 임계값** N/T, 폴링 주기, 장외 시 동작(폴링 중단/저빈도).
5. **시간외/장전 단일가 처리**: `H0STCNT0` 만으로 되는지, 시간외 전용 TR 병행 필요한지. (확인 필요)
6. **WS 해제 `tr_type` 코드**: 문서 `2` vs 예제 `0` — 운영 검증. (확인 필요)
7. **다중 사용자 환경**: 사용자마다 관심종목이 다르면 서버가 종목 합집합(≤40 한도 내)을 구독하고 클라별 필터링할지, 사용자별 연결을 둘지(1키 1연결 제약과 충돌).
8. **스냅샷/델타 데이터 모델 통일**: `intstock_multprice`(`inter2_*`) ↔ `H0STCNT0` 필드 매핑 정규화 스펙.

---

## 부록: "확인 필요" 잔여 항목

- 한 계정 approval_key 다중 발급 및 동시 다중 WS 연결 허용 여부(40 초과·다중 사용자 설계의 전제).
- WS 해제 `tr_type` 실제 코드값(`2` vs `0`).
- 시간외/동시호가 구간 `H0STCNT0` push 여부.
- `intstock_multprice` 의 정확한 HTTP method(소스상 GET 추정) 및 연속조회 필요 여부(30종목 단위라 보통 불필요).
- KIS REST 정량 초당 한도 수치(포털 본문 미확보) — 폴링 주기 안전마진 산정에 영향.
