# KIS Open Trading API — 인증 및 공통 규약

한국투자증권(KIS) Open Trading API 의 OAuth2 토큰 발급/폐기, 웹소켓 접속키, 공통 호출 규약(헤더·envelope·페이징), hashkey, 유량 제한을 정리한 1차 레퍼런스.

> **이 프로젝트는 조회·분석 전용이며 실전(prod) 키 + `KIS_ENV=prod` 를 사용한다 (2026-05-29 확정).** 모의(vts)는 지수·순위·수급·재무 등 시그널 핵심 데이터 대부분이 실전 전용이라 부적합. 조회는 prod 키로 호출해도 계좌에 영향이 없어 안전(돈 미입금). **주문(order) API 는 영구 미구현** — 매매는 사람이 직접, 자동매매는 추후 별도 결정. 진짜 안전 경계는 env 가 아니라 "주문 코드 부재"다.

**출처**
- GitHub `koreainvestment/open-trading-api` — `examples_user/kis_auth.py` (https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/kis_auth.py)
- GitHub `koreainvestment/open-trading-api` — `examples_user/auth/auth_functions.py` (https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/examples_user/auth/auth_functions.py)
- KIS 개발자 포털 OAuth 문서 (https://apiportal.koreainvestment.com/apiservice-apiservice?/oauth2/Approval) — **JS 렌더링 페이지로 본문 미수신**, 메뉴 구조(접근토큰발급/폐기/웹소켓 접속키 항목 존재)만 확인. 상세 필드는 GitHub 소스 기준으로 작성.
- 자체 코드베이스 검증 사실(`reference_kis-api-conventions.md`).
- 마지막 갱신일: **2026-05-29**

---

## 1. 개요

KIS Open API 는 한국투자증권 계좌로 시세 조회·계좌 조회·주문을 REST + WebSocket 으로 제공하는 공개 트레이딩 API 다. App Key / App Secret 발급 후 OAuth2 `client_credentials` 흐름으로 access token 을 받아 호출한다.

| 구분 | 환경 | base URL (포트 포함) | 비고 |
|------|------|----------------------|------|
| 실전 | prod | `https://openapi.koreainvestment.com:9443` | 실제 계좌. **이 프로젝트 기본(조회 전용)** |
| 모의 | vts (vps) | `https://openapivts.koreainvestment.com:29443` | 모의투자. 시그널 데이터 다수 미지원이라 미사용 |

> ⚠️ **포트는 URL 의 일부다.** `9443` / `29443` 을 누락하면 connection refused. 환경 변수/상수에 포트까지 포함해 관리할 것.

소스 코드에서 환경 키는 prod 가 `"prod"`, 모의가 `"vps"` 로 표기되며 WebSocket 은 각각 `"ops"`, `"vops"` 설정 키를 사용한다.

---

## 2. OAuth2 토큰 발급 / 폐기

### 2.1 접근토큰 발급

| 항목 | 값 |
|------|----|
| Method / Path | `POST /oauth2/tokenP` |
| Content-Type | `application/json` |

**요청 body**

```json
{
  "grant_type": "client_credentials",
  "appkey": "<APP_KEY>",
  "appsecret": "<APP_SECRET>"
}
```

**응답 필드** — 이 응답은 일반 envelope(§5)과 다르게 `rt_cd` 가 **없다**.

| 필드 | 의미 |
|------|------|
| `access_token` | 발급된 토큰 문자열 |
| `expires_in` | 만료까지 남은 초. 통상 `86400`(= 24h). 소스의 만료 비교 로직도 `86400`초(1일) 기준. |
| `access_token_token_expired` | 만료 일시 문자열, 포맷 `"%Y-%m-%d %H:%M:%S"` |
| (실패 시) `error_code` | 에러 코드 |
| (실패 시) `error_description` | 한글 에러 설명 |

### 2.2 토큰 수명 · 캐시 전략

- 유효기간 **1일(24h)**. 소스는 만료 시각(`access_token_token_expired`)을 현재 시각과 비교(`if exp_dt > now_dt`)해 살아있으면 캐시 토큰 재사용.
- 캐시 파일: `$HOME/KIS/config/` 아래 `KIS{YYYYMMDD}` 패턴으로 토큰 저장.
- KIS 정책상 **발급 후 6시간 이내 재발급 요청 시 기존 토큰을 그대로 반환**(소스 주석 "1일" 유효 + 재발급 시 기존 토큰 반환 동작). → 매 호출마다 새 토큰을 받지 말고 캐시 후 만료 직전에만 갱신.
- 권장: 서버(BFF)에서 토큰을 캐시(메모리/스토어)하고 만료 임박 시 1회만 재발급.

### 2.3 접근토큰 폐기

- 포털 메뉴에 **"접근토큰폐기(P)"** 항목이 존재(엔드포인트 패턴 통상 `/oauth2/revokeP` 로 알려짐) — **GitHub 샘플 소스에는 폐기 호출이 구현되어 있지 않아 정확한 path/필드 미확인.** (확인 필요: §9)
- 토큰 만료가 1일이므로 일반 조회 용도에서는 폐기를 거의 사용하지 않는다.

---

## 3. 웹소켓 접속키 발급 (실시간 시세용)

실시간 체결/호가 등 WebSocket 구독에 필요한 `approval_key` 를 발급한다.

| 항목 | 값 |
|------|----|
| Method / Path | `POST /oauth2/Approval` |
| Content-Type | `application/json` |

**요청 body** — 주의: 이 엔드포인트는 비밀키 필드명이 `appsecret` 이 아니라 **`secretkey`** 다(소스 기준).

```json
{
  "grant_type": "client_credentials",
  "appkey": "<APP_KEY>",
  "secretkey": "<APP_SECRET>",
  "token": "<access_token (선택, 조건부 포함)>"
}
```

**응답 필드**

| 필드 | 의미 |
|------|------|
| `approval_key` | WebSocket 접속/구독 시 헤더의 `approval_key` 값으로 사용 |

- WebSocket base URL 환경 키: 실전 `"ops"`, 모의 `"vops"`.
- **최대 동시 구독 수: 40** (`"40"`, 소스 상수).

---

## 4. 공통 호출 규약

### 4.1 필수/공통 헤더 (REST)

| 헤더 | 값 / 설명 |
|------|-----------|
| `authorization` | `Bearer <access_token>` |
| `appkey` | App Key |
| `appsecret` | App Secret |
| `tr_id` | 거래 ID(서비스별로 상이). §4.2 참조 |
| `custtype` | `"P"` = 개인(retail), `"B"` = 법인/제휴(affiliate) |
| `tr_cont` | 연속조회 마커. 최초 호출은 공백, 연속 시 응답값을 그대로 전달(§5.2) |
| `Content-Type` | `application/json` |
| `hashkey` | 주문류 POST body 무결성용(선택, §6) |

토큰 발급/웹소켓 발급 요청에는 추가로 `Accept: text/plain`, `charset: UTF-8` 헤더가 붙는다(소스 기준).

### 4.2 tr_id 의미와 실전/모의 접두 규칙

`tr_id` 는 호출하는 거래(서비스)를 식별하며, 같은 기능이라도 **실전과 모의의 tr_id 가 다른 경우가 있다.** 소스 기준 접두 규칙:

| 접두 | 환경/용도 |
|------|-----------|
| `T` / `J` / `C` | 실전(production) 거래 |
| `V` | 모의(paper) 거래 |

→ 모의 환경에서는 실전 `tr_id` 의 접두를 `V` 계열로 바꿔야 하는 케이스가 있으므로, **각 API 문서의 실전/모의 tr_id 를 개별 확인**할 것. (서비스별 정확한 tr_id 값은 해당 API 레퍼런스 문서 참조)

---

## 5. 공통 응답 envelope & 연속조회

### 5.1 envelope 구조

토큰/웹소켓 발급을 **제외한** 일반 조회·주문 응답은 다음 envelope 를 가진다.

```json
{
  "rt_cd": "0",
  "msg_cd": "...",
  "msg1": "정상처리 되었습니다.",
  "output":  { },
  "output1": [ ],
  "output2": { }
}
```

| 필드 | 의미 |
|------|------|
| `rt_cd` | `"0"` = 정상, 그 외 = 에러 |
| `msg_cd` | 메시지 코드 |
| `msg1` | 한글 메시지(에러 사유 등) |
| `output` / `output1` / `output2` | 실제 데이터. 서비스에 따라 단수 객체 또는 배열, 1·2 분할 |

**에러 처리 규칙**: `rt_cd !== "0"` 이면 실패로 간주하고 `msg_cd` + `msg1`(한글) 로 처리/로깅. (토큰 발급 실패는 envelope 가 아니라 `error_code`/`error_description` 임에 유의 — §2.1)

### 5.2 연속조회(페이징) 규약

목록형 조회는 한 번에 일정 건수만 반환하고 나머지는 연속조회로 가져온다.

| 요소 | 위치 | 설명 |
|------|------|------|
| `tr_cont` | 요청/응답 헤더 | 응답 헤더의 `tr_cont` 가 `F`/`M` 이면 다음 페이지 있음, `D`/`E` 면 마지막. 다음 요청 헤더 `tr_cont` 에 받은 값을 그대로 전달 |
| `ctx_area_fk100` | 요청/응답 body | 연속조회 검색조건 키. 응답값을 다음 요청 body 에 그대로 전달 |
| `ctx_area_nk100` | 요청/응답 body | 연속조회 키. 응답값을 다음 요청 body 에 그대로 전달 |

> (확인 필요) `tr_cont` 코드 값(F/M/D/E)·`ctx_area_fk100/nk100` 의 정확한 동작은 KIS API 가이드 문서 기준이며, 제공된 GitHub 소스에서는 `tr_cont` 의 존재만 확인되고 `ctx_area_fk100`/`ctx_area_nk100` 의 명시적 구현은 발견되지 않았다. 서비스별 레퍼런스에서 재검증할 것.

---

## 6. hashkey 발급 (주문류 POST 전용)

POST body 의 무결성 검증용 해시를 발급. **조회(GET)에는 불필요**, 주문류 POST 에서 사용.

| 항목 | 값 |
|------|----|
| Method / Path | `POST /uapi/hashkey` |
| 응답 필드 | `HASH` |

발급받은 `HASH` 를 주문 요청의 `hashkey` 헤더에 넣는다. 이 프로젝트는 조회만 사용하므로 실제 사용 빈도는 없음.

---

## 7. Rate limit / 유량 제한

GitHub 샘플 소스에는 **명시적인 "1분당 토큰 발급 제한"이나 "초당 호출 제한" 수치 주석이 없다.** 다만 호출 간 sleep 으로 유량을 완충하는 구현이 있다.

| 항목 | 값(소스) | 비고 |
|------|----------|------|
| 호출 간 대기(`_smartSleep`) — 실전 | `0.05`초 | `smart_sleep()` 이 `[RateLimit] Sleeping {n}s` 로깅 |
| 호출 간 대기(`_smartSleep`) — 모의 | `0.5`초 | 모의 환경에 더 보수적 |
| WebSocket 최대 동시 구독 | `40` | |

> (확인 필요) KIS 정책상 알려진 일반 유량 제한(예: REST 초당 호출 상한, 토큰 발급 빈도 제한)은 **포털 문서 본문을 받지 못해 정확한 수치 미확정**(§9). 운영 시 토큰 캐시(§2.2)와 위 sleep 으로 과다 호출을 회피할 것.

---

## 8. ⚠️ 보안 / 안전장치 주의

- **App Key / App Secret 는 서버(BFF) 전용.** 절대 클라이언트 번들·브라우저에 노출 금지. 토큰 발급/모든 KIS 호출은 서버 라우트에서만.
- 토큰도 클라이언트로 내려보내지 않는다(서버에서 캐시·사용).
- **실전계좌 주문 안전장치**: 이 프로젝트는 **조회(read-only)만 사용**한다. 주문(매수/매도) API 는 별도 PRD 의 책임이며, 구현 시 다음 다중 게이트를 **의무**로 적용한다.
  - 주문 BFF 라우트 분리(조회 라우트와 물리적으로 분리)
  - 비밀번호/2차 인증 재확인
  - dry-run(모의 선검증) 단계
  - 주문 금액 상한
  - audit log(주문 시도·결과 전량 기록)
- 실전 도메인(`:9443`)·실전계좌 사용은 위 게이트 통과 전까지 금지. 기본은 모의(`:29443`).

---

## 9. 미확인 / 후속

- **KIS 개발자 포털 OAuth 문서 본문 미수신**: `apiportal.koreainvestment.com` 페이지가 JS 렌더링이라 WebFetch 로 메뉴 구조만 확보. 접근토큰폐기·실시간 접속키의 상세 Method/URL/필드/유량은 포털 본문 기준으로 재확인 필요.
- **접근토큰 폐기 엔드포인트**: 정확한 path(추정 `/oauth2/revokeP`)·요청/응답 필드 미확인. GitHub 샘플에 미구현.
- **연속조회 상세**: `tr_cont` 코드 값과 `ctx_area_fk100`/`ctx_area_nk100` 의 정확한 동작은 GitHub 소스에서 완전 검증 불가 — 서비스별 API 가이드 문서에서 확정.
- **REST 정량 유량 제한 수치**(초당/분당 상한): 포털 본문 미확보로 미확정.
- 토큰 발급 body 의 비밀키 필드명: 토큰(`/oauth2/tokenP`)은 `appsecret`, 웹소켓(`/oauth2/Approval`)은 `secretkey` 로 **서로 다름** — 소스 기준 사실이나 혼동 주의.
