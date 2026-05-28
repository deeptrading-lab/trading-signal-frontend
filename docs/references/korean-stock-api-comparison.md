# 한국 주식 API 비교 정리

> 작성일: 2026-05-24  
> 목적: trading-signal-frontend 레포에 도입할 주식 API 검토  
> 결론: **KIS Developers** 실시간/종목분석 + **FinanceDataReader** 과거데이터 + **OpenDART** 재무공시 조합 권장

---

## 요약 비교표

| 항목 | 키움 REST API | 한국투자증권 KIS Developers |
|---|---|---|
| 방식 | REST (신규, 2025년 오픈) | REST + WebSocket |
| 계좌 필요 | ✅ 필요 | ✅ 필요 |
| 모의투자 | ✅ 지원 | ✅ 지원 |
| 무료 | ✅ 무료 | ✅ 무료 |
| 국내주식 시세 | ✅ | ✅ |
| 국내주식 재무제표 | ❌ 미지원 | ✅ 대차대조표/손익계산서/재무비율 등 |
| 투자의견/추정실적 | ❌ 미지원 | ✅ 지원 |
| 순위분석/시세분석 | ❌ 미지원 | ✅ 20개+ / 25개+ |
| 해외주식 | ❌ 미지원 (현재) | ✅ 지원 |
| 선물/옵션 | ❌ 미지원 (현재) | ✅ 지원 |
| 장내채권 | ❌ 미지원 (현재) | ✅ 지원 |
| ELW / ETF | ✅ ETF/ETN 포함 | ✅ ELW 20개+ / ETF 지원 |
| 실시간 WebSocket | 별도 구성 필요 | ✅ KRX/NXT/통합 30개+ |
| 문서 품질 | 보통 (신규 서비스) | ⭐ 우수 (GitHub Star 1.4k, 공식 관리) |
| OS 제약 | 없음 | 없음 |

---

## 1. 키움 REST API (openapi.kiwoom.com)

### 개요
- 2025년 오픈한 **신규 REST API** (기존 영웅문 Open API+의 OCX/Windows 전용 구조 탈피)
- Python, .NET 등 언어·OS 무관하게 HTTP 호출 가능

### 계좌 필요 여부
**계좌 개설 필수** (위탁 종합계좌 / 중개형 ISA / 연금저축 / 비과세종합 모두 인정)  
- HTS ID 연결 필수
- API 등록 PC에서만 가능 (모바일 불가)
- 등록: 홈페이지 → [트레이딩 채널] → [키움 REST API] 또는 [고객서비스] → [다운로드] → [Open API] → [키움 REST API]

### 지원 기능

**주문**
- 국내주식 매수/매도 (현금, 지정가/시장가)
- 주문 정정/취소, 잔고 조회, 매수가능금액 조회

**시세**
- 주식 현재가, 분봉/일봉/주봉/월봉 차트
  - 예: `POST /api/dostk/chart` (TR코드: ka10080)
- ETF/ETN 현재가 포함

**인증**
```
Authorization: Bearer {ACCESS_TOKEN}
포털에서 App Key 발급 → Bearer Token 발급
```

**주요 엔드포인트**
```
POST /api/dostk/chart     # 분봉 차트
POST /v1/order            # 주문
GET  /v1/account/balance  # 잔고 조회
POST /v1/auth/login       # 인증
```

### 제한 사항
- 현재 **국내주식(ETF/ETN 포함)만** 지원 — 해외주식·선물옵션·채권 미지원
- 재무제표, 종목분석, 순위/시세분석 API 없음
- 초당/분당 요청 수 제한 있음

---

## 2. 한국투자증권 KIS Developers (apiportal.koreainvestment.com)

### 개요
- 국내 증권사 중 **가장 개발자 친화적** REST API
- GitHub 공식 샘플 (Star 1.4k, Fork 726, 한국투자증권 공식 관리)
- LLM(Claude, ChatGPT) 연동 코드 예제 포함
- 전략 빌더(80개 기술지표) + QuantConnect Lean 백테스터 도구도 오픈소스 제공

### 계좌 필요 여부
**계좌 개설 필수**
1. 한국투자증권 계좌 개설 + HTS ID 연결
2. 홈페이지/앱에서 **Open API 서비스 신청**
3. **App Key** + **App Secret** 발급
4. 모의투자용 / 실전투자용 키 각각 발급 가능
5. `kis_devlp.yaml`에 계좌번호 앞 8자리 + 뒤 2자리 입력

### 지원 기능 전체 목록

#### 인증
- 접근토큰 발급/폐기 (REST), WebSocket 접속키 발급

#### [국내주식] 주문/계좌 (22개+)
- 주식주문(현금/신용), 정정/취소, 일별 주문체결 조회
- 주식잔고, 매수/매도 가능수량, 신용매수 가능
- 주식 예약주문/정정취소/조회
- 퇴직연금 (체결기준잔고/미체결/매수가능/예수금/잔고)
- 실현손익, 투자계좌자산 현황, 기간별 손익, 주식통합증거금

#### [국내주식] 기본시세 (22개+)
- 주식현재가 (시세/체결/일자별/호가/투자자/회원사)
- 기간별시세 (일/주/월/년), 당일분봉/일별분봉
- 시간외 (일자별/시간별/현재가/호가), 장마감 예상체결가
- ETF/ETN 현재가, 구성종목시세, NAV 비교추이

#### [국내주식] ELW 시세 (20개+)
- 현재가, 민감도순위, 기초자산별 시세, 종목검색
- LP매매추이, 투자지표/변동성/민감도 추이 (체결/분/일)
- 만기예정/만기종목, 지표/상승률/거래량 순위

#### [국내주식] 업종/기타
- 업종 현재지수/일자별/시간별(초/분), 분봉, 기간별시세
- VI(변동성완화장치) 현황, 금리 종합, 시황/공시 제목
- 휴장일/선물 영업일 조회

#### [국내주식] 종목정보 (30개+) ← 종목 분석에 핵심
- 상품기본, 주식기본 조회
- **대차대조표, 손익계산서**
- **재무비율, 수익성비율, 기타주요비율, 안정성비율, 성장성비율**
- 배당일정, 합병/분할, 유상/무상증자, 주주총회 등 예탁원정보 12종
- **종목추정실적**
- **종목투자의견, 증권사별 투자의견**

#### [국내주식] 시세분석 (25개+)
- 종목조건검색, 관심종목 그룹/멀티종목 시세
- 국내기관/외국인 매매동향 (종목별/시장별/일별)
- 외국계 순매수추이, 회원사 매매동향
- 프로그램매매 추이/종합현황, 외인기관 추정가집계
- 신용잔고/공매도 일별추이, 매물대/거래비중, 상하한가 포착

#### [국내주식] 순위분석 (20개+)
- 거래량, 등락률, 시가총액, 호가잔량, 재무비율, 체결강도
- 배당률, 신용잔고, 공매도, 이격도, 시간외 등락률/거래량
- HTS 조회상위 20종목

#### [국내주식] 실시간시세 - WebSocket (30개+)
- 체결가/호가/체결통보/예상체결/회원사/프로그램매매/장운영정보
- KRX / NXT / 통합 3개 채널
- 시간외 실시간 (호가/체결가/예상체결)
- 국내지수 실시간, ELW 실시간, ETF NAV추이

#### [국내선물옵션]
- 주문/정정취소, 체결/잔고/주문가능 (주간 + 야간)
- 시세/호가/분봉/기간별, 옵션전광판, 증거금률
- 실시간: 지수선물/옵션, 상품선물, 주식선물/옵션, KRX야간

#### [해외주식]
- 주문/정정취소, 예약주문, 미체결/잔고/체결내역, 기간손익
- **미국 주간주문/정정취소** (야간 거래)
- 시세: 현재가상세/호가/분봉/기간별, 조건검색
- 시세분석: 급등락/거래량급증/상승하락률/신고신저/시가총액순위
- 해외뉴스/속보, 실시간 호가/체결통보

#### [해외선물옵션]
- 주문/정정취소, 잔고/기간손익/거래내역/증거금상세
- 선물·옵션 현재가/호가/분봉/체결추이(틱/주/일/월)/미결제추이
- 실시간 체결가/호가/주문체결통보

#### [장내채권]
- 매수/매도/정정취소, 체결내역, 잔고, 매수가능
- 현재가(호가/시세/체결/일별), 기간별시세, 발행정보
- 실시간 체결가/호가

### 부가 도구 (GitHub 공식 제공)
- **strategy_builder**: 비주얼 UI 전략 설계, 80개 기술지표, 10개 프리셋, BUY/SELL/HOLD 신호
- **backtester**: QuantConnect Lean 기반(Docker), HTML 리포트, 파라미터 최적화
- **MCP 도구**: KIS Code Assistant + Trading MCP (Claude/ChatGPT 연동)

### Rate Limit
- 신규 고객 초당 호출 제한 있음 (2026.03.20 공지)
- 모의투자 계좌 제한이 더 낮음 — 연속 호출이 많다면 실전투자 계좌 권장

---

## 3. 계좌 불필요 무료 데이터 (보조 활용)

### FinanceDataReader
- `pip install finance-datareader` 즉시 사용, 계좌 불필요
- KOSPI/KOSDAQ/해외주식 가격, 환율, 지수, 종목 리스트
- 과거 가격 데이터 수집에 최적 (차트/백테스팅용)
- [GitHub](https://github.com/FinanceData/FinanceDataReader)

### OpenDART (금융감독원 전자공시)
- API 키 발급 무료, 계좌 불필요
- 기업 재무제표, 공시 정보, 주주 구성, 배당 내역
- KIS 재무 API보다 기간 범위 넓음 (장기 시계열)
- [공식](https://opendart.fss.or.kr) | [Python 라이브러리: OpenDartReader](https://github.com/FinanceData/OpenDartReader)

### KRX Open API (한국거래소 공식)
- 회원가입 무료, 공식 상장 종목 리스트
- [KRX Open API](https://openapi.krx.co.kr)

---

## 4. 레포 도입 전략

### 용도별 추천

| 기능 | 추천 API | 이유 |
|---|---|---|
| 실시간 시세 조회 | KIS Developers | WebSocket 내장, 채널 다양 |
| 종목 기본 정보 | KIS Developers | 재무비율/투자의견/추정실적 |
| 매수/매도 주문 | KIS Developers or 키움 REST | 둘 다 가능 |
| 순위 분석 (거래량/등락률 등) | KIS Developers | 키움 미지원 |
| 시세 분석 (외인/기관 동향 등) | KIS Developers | 키움 미지원 |
| 과거 가격 데이터 (차트/백테스팅) | FinanceDataReader | 계좌 불필요, 즉시 사용 |
| 재무제표 장기 시계열 | OpenDART | 키움 미지원, KIS보다 기간 넓음 |
| 해외주식 | KIS Developers | 키움 현재 미지원 |
| 공식 상장 종목 리스트 | KRX Open API | 완전 무료, 공식 |

### 권장 조합 (이 레포 기준)

```
실시간 시세 / 종목분석 / 주문  →  KIS Developers (REST + WebSocket)
과거 가격 / 차트 데이터         →  FinanceDataReader
재무제표 / 공시 심화            →  OpenDART
공식 종목 리스트                →  KRX Open API
```

---

## 5. 참고 링크

- [KIS Developers 공식 포털](https://apiportal.koreainvestment.com)
- [KIS GitHub 샘플코드](https://github.com/koreainvestment/open-trading-api)
- [키움 REST API 포털](https://openapi.kiwoom.com)
- [FinanceDataReader GitHub](https://github.com/FinanceData/FinanceDataReader)
- [OpenDART 공식](https://opendart.fss.or.kr)
- [KRX Open API](https://openapi.krx.co.kr)
- [공공데이터포털 - 금융위원회 주식시세](https://www.data.go.kr/data/15094808/openapi.do)
