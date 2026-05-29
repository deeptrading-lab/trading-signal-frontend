# KIS Open Trading API 레퍼런스

한국투자증권(KIS) Open Trading API를 카테고리별로 정리한 레퍼런스 문서 모음입니다.
나중에 기능(시그널 입력·화면 데이터)을 추가할 때 해당 카테고리 문서만 보면 되도록 **카탈로그(전체 엔드포인트 표) + 핵심 엔드포인트 상세**로 구성했습니다.

- **1차 소스**: GitHub [koreainvestment/open-trading-api](https://github.com/koreainvestment/open-trading-api)
  - 요청 카탈로그(URL·TR_ID·파라미터): `examples_user/<category>/<category>_functions.py`
  - 응답 필드: `examples_llm/<category>/<endpoint>/chk_*.py` 의 컬럼 매핑
- **포털 문서**: <https://apiportal.koreainvestment.com/apiservice-summary> (JS 렌더링이라 일부 응답 필드는 직접 추출 불가 → 해당 항목은 각 문서에 "(확인 필요)" 표기)
- **갱신일**: 2026-05-29

> ⚠️ **프로젝트 정책 (2026-05-29 확정)**: 이 프로젝트는 **조회·분석 전용**입니다. **실전(prod) 키 + `KIS_ENV=prod`** 를 사용해 시세·지수·순위·수급·재무 등 모든 조회 데이터를 받습니다(모의는 이들 대부분 미지원). 조회는 prod 키로 호출해도 계좌에 영향이 없어 안전(돈 미입금). **주문/매매(order) API 는 영구 미구현** — 매매는 사람이 직접 합니다. 자동매매 도입은 추후 별도 요청 시 별도 PRD(`stock-order-integration`) + 다중 게이트(주문 BFF 분리·비밀번호 재확인·dry-run·금액상한·audit log)로만. 자세한 내용은 [계좌/주문 문서](./domestic-stock-account-order.md) 상단 박스 참조.

## 공통

| 항목 | 값 |
| --- | --- |
| 모의(vts) 도메인 | `https://openapivts.koreainvestment.com:29443` |
| 실전(prod) 도메인 | `https://openapi.koreainvestment.com:9443` (⚠️ 포트 누락 시 connection refused) |
| 인증 헤더 | `authorization: Bearer <token>`, `appkey`, `appsecret`, `tr_id`, `custtype:"P"` |
| 응답 envelope | `{ rt_cd:"0"=정상, msg_cd, msg1(한글), output\|output1\|output2 }` |

## 문서 목록

### 1단계 — 인증 + 국내주식 (작성 완료)

| 문서 | 범위 | 담당 엔드포인트 |
| --- | --- | --- |
| [00-auth-and-common.md](./00-auth-and-common.md) | OAuth2 토큰·웹소켓 접속키·공통 헤더·envelope·연속조회·hashkey·rate limit·안전장치 | 공통 규약 |
| [domestic-stock-quotations.md](./domestic-stock-quotations.md) | 국내주식 기본시세·호가·체결·차트·지수 | 32 |
| [domestic-stock-rankings.md](./domestic-stock-rankings.md) | 국내주식 순위분석(등락률·거래량·시총·이격도 등)·시세분석 | 25 |
| [domestic-stock-account-order.md](./domestic-stock-account-order.md) | 국내주식 계좌·잔고·주문가능 조회(18) + 주문/매매(참고·미구현, 5) | 23 |
| [domestic-stock-analysis.md](./domestic-stock-analysis.md) | 국내주식 재무·투자자동향·프로그램매매·배당/권리·대차/공매도/회원사 | 35 |

### 2단계 — 해외주식 / ETF·ETN / 웹소켓 (작성 완료)

| 문서 | 범위 | 담당 엔드포인트 |
| --- | --- | --- |
| [overseas-stock.md](./overseas-stock.md) | 해외주식 시세·검색(28) + 계좌/잔고 조회(12) + 주문/매매(참고·미구현, 6) | 46 |
| [etf-etn.md](./etf-etn.md) | ETF/ETN 현재가·NAV 비교추이·구성종목시세 (실시간 NAV 1종 포함) | 6 |
| [websocket-realtime.md](./websocket-realtime.md) | 실시간 체결가·호가·체결통보 (국내주식·지수·해외주식 WebSocket) | 30 |

> 채권(`domestic-bond`)·파생/선물옵션(`derivatives`)·ELW는 현 단계 범위에서 제외(필요 시 추후 추가).

## 우리 코드베이스 연동 현황

현재 구현된 KIS 연동(`lib/api/kis/`)은 조회 2종뿐입니다 — 나머지는 위 문서를 보고 추가합니다.

| 기능 | KIS 엔드포인트 | TR_ID | 구현 |
| --- | --- | --- | --- |
| 현재가 | `quotations/inquire-price` | `FHKST01010100` | ✅ `lib/api/kis/price.ts` |
| 일자별 시세 | `quotations/inquire-daily-price` | `FHKST01010400` | ✅ `lib/api/kis/price.ts` |
| 종목 검색 | (symbols.json 로컬) | — | ✅ `lib/api/kis/search.ts` |

## 알려진 함정

- `inquire-price` 응답에서 `hts_kor_isnm`=**종목명**(삼성전자), `bstp_kor_isnm`=**업종명**(전기·전자, 종목명 아님!), `prdt_name`=fallback. 종목명 추출 우선순위: `hts_kor_isnm` → `prdt_name` → ticker.
- 모든 숫자 필드가 **문자열**로 응답됨. `prdy_vrss_sign`: 1=상한 2=상승 3=보합 4=하한 5=하락.
- 실전/모의 `tr_id`가 다른 엔드포인트 다수(예: 잔고 실전 `TTTC8434R` / 모의 `VTTC8434R`).

## 관련 문서

- [OpenDART API 레퍼런스](../dart-api/README.md) — 공시·재무·지분·이벤트 (펀더멘털 시그널 소스)
- [korean-stock-api-comparison.md](../korean-stock-api-comparison.md) — 국내 주식 API 제공사 비교
- PRD: [stock-api-integration.md](../../prd/stock-api-integration.md)
