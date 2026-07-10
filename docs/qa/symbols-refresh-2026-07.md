# QA — 종목 검색 시드 최신화 (symbols-refresh-2026-07)

- 대상 PR: #341 (`chore/symbols-refresh-2026-07`)
- 변경 요지: 종목 검색 정적 시드 `lib/api/kis/symbols.json` 재생성 (2,611 → 2,600, v0.3.1 → v0.4.0, createdAt 2026-07-10). `scripts/update-symbols.py` 하드코딩 version 0.3.0 → 0.4.0 + note 보강.
- 검증 방식: 라이브 API 아님 (정적 시드 클라이언트 매칭). `node_modules/.bin/tsx` 로 `@/lib/api/kis/search` 실 함수 exercise + python 으로 파일 직접 무결성 검사. 사용자 dev :3000 (Next 16 persistent daemon) 비침습 — 브라우저 라운드트립은 코드/데이터 검증으로 갈음.
- 판정: **qa-passed** (실패 0건)

> 참고: 본 브랜치는 커밋 2개 (`2a558fa` 시드 최신화, `f5af66d` intraday 캘리브레이션 러너). 후자는 `scripts/intraday/**` 만 추가하는 스크립트 전용 커밋으로 앱 런타임·시드 검증 범위 밖 (별도 진단 하네스). 본 QA 는 PR 수용 기준(AC1~5)이 정의한 시드 변경에 한정한다.

---

## AC 별 결과

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 신규 상장 3종목 검색·이름조회 | `searchSymbols("스트라드비젼"/"져스텍"/"레몬헬스케어")`, `getSymbolName(475040/153890/365660)` (tsx) | 각 1건 정확 반환 (전부 KOSDAQ), 이름 정확 | 스트라드비젼→475040, 져스텍→153890, 레몬헬스케어→365660 각 1건 KOSDAQ. getSymbolName 3건 정확. getMarketByTicker(475040)="KOSDAQ" | ✅ |
| AC2 폐지/합병 14종목 미검색 | 제거 14종목 각 `searchSymbols(name).length`, 제거 티커 14건 `getSymbolName`/`getCorpCode` (tsx) | 제거 엔트리 티커 전부 null, 대표 예시(에코마케팅·일정실업·KB제27호스팩) 검색 0건 | 제거 14티커 (204210·464680·222160·106520·032980·230980·101390·203690·140910·230360·451700·008500·227100·464440) 전부 getSymbolName=null·getCorpCode=null. 에코마케팅·일정실업·KB제27호스팩·NPX·노블엠앤비·바이온·비유테크놀러지·아크솔루션스·엔에이치스팩29호·프로브잇·한국제13호스팩·에이리츠 = 0건 | ✅ |
| AC3 시드 무결성 | python 파일 직접 검사 | count_actual==len==2600, KOSPI 830+KOSDAQ 1770=2600, 엔트리 {ticker,name,market,corp_code}, ticker 전부 6자리, 중복 티커 0 | count_actual 2600 == len 2600. KOSPI 830·KOSDAQ 1770 (메타 일치)·합 2600. bad shape 0·non-6digit ticker 0·bad market 0·중복 티커 0 | ✅ |
| AC4 기존 종목 회귀 없음 | 삼성전자·SK하이닉스·005930·000660 검색/이름/corp_code/market (tsx) | 정상 유지 | 삼성전자→005930 KOSPI, SK하이닉스→000660 KOSPI, getSymbolName 정확, getCorpCode(005930)=00126380, getMarketByTicker(005930)=KOSPI, 빈 문자열→상위 20건 | ✅ |
| AC5 tsc/lint 무회귀 | `npx tsc --noEmit`, `npx eslint lib/api/kis/search.ts` | 0 에러 | tsc EXIT=0, eslint EXIT=0 | ✅ |

### AC2 보충 — `searchSymbols("아이엠")` 관찰
제거 엔트리 중 `아이엠`(101390)은 `getSymbolName`/`getCorpCode` 에서 정상적으로 null 로 소거됨(위 표). 다만 `searchSymbols("아이엠")` 은 4건을 반환하는데, 이는 **substring 매칭 정책상 정상**이다 — 이름에 "아이엠"을 포함한 별개 상장사(아이엠바이오로직스 493280·아이엠비디엑스 461030·아이엠티 451220·한국피아이엠 448900)가 잡히는 것으로, 폐지 종목 재출현이 아니다. 시드에 exact name "아이엠" 엔트리는 0건. 회귀 아님.

### 시드 diff 교차검증 (main vs HEAD)
```
old 2611 → new 2600 (net -11)
removed 14: JK리버스톤리츠·KB제27호스팩·NPX·노블엠앤비·바이온·비유테크놀러지·아이엠·아크솔루션스·에이리츠·에코마케팅·엔에이치스팩29호·일정실업·프로브잇·한국제13호스팩
added 3: 레몬헬스케어(365660)·스트라드비젼(475040)·져스텍(153890)
renamed(동일 티커 이름변경): 0
```
PR 본문 명세(제거 14·추가 3)와 정확히 일치.

---

## 에지 케이스

| 케이스 | 확인 | 결과 |
|---|---|---|
| 빈 keyword | `searchSymbols("")` | 상위 20건 반환 (MAX_RESULTS 클램프 유지) |
| 6자리 숫자 ticker 정확 매칭 | 제거 티커 6자리 입력 | 미존재 → 0건 (`/^\d{6}$/` 분기, exact 없으면 []) |
| 폐지 티커 역참조 | `getCorpCode`/`getSymbolName`(제거 14티커) | 전부 null — stale corp_code/이름 노출 없음 |
| substring 오탐 방지 | `아이엠` 부분일치 | 별개 상장사만 반환, 폐지 엔트리 미출현 |
| 시드 스키마 불변 | 엔트리 key set | 전 엔트리 {ticker,name,market,corp_code} 4키 고정, 신규 필드/누락 0 |
| market 값 도메인 | 전 엔트리 market | "KOSPI"|"KOSDAQ" 외 값 0건 (TS union 정합) |
| 스크립트 version 단조성 | update-symbols.py | 하드코딩 0.3.0(커밋본 0.3.1보다 역행)→0.4.0 교정, 재실행 시 역행 방지 |
| 알려진 한계(문서화됨) | `매드업`·`한국제16호스팩` | 시드 미포함 확인 — PR "알려진 한계"(KIND 6자리 숫자 티커만 수록, 신규분 지연)와 일치. 회귀 아님 |

---

## 공통 AC 무회귀

- **BFF 원칙**: 변경 파일은 데이터(`symbols.json`) + 스크립트(`update-symbols.py`) + 진단 스크립트(`scripts/intraday/**`) 뿐, `app/` 라우트·클라이언트 코드 무변경. `git grep "http://127\.0\.0\.1"` 대상 변경 파일 0건. 무회귀.
- **한글 톤**: 사용자 노출 카피 변경 없음. 시드 name 필드는 ticker/종목명(고유명사) — 규약 대상 외.
- **접근성**: UI 변경 없음 — 해당 없음.
- **DESIGN.md 토큰 동기화**: 스타일링 PR 아님 — 해당 없음.

---

## 실행 로그 (요약)

```
$ python3 (integrity)  → count 2600 일치 / KOSPI 830+KOSDAQ 1770 / shape·6digit·market·dup 전부 통과
$ tsx qatest.mts       → AC1 3종목 각 1건·이름 정확 / AC2 예시 0건 / AC4 대표종목 정상
$ tsx qatest2.mts      → 제거 14티커 getSymbolName·getCorpCode 전부 null
$ npx tsc --noEmit     → EXIT 0
$ npx eslint search.ts → EXIT 0
```

## 다음 작업 (본 PR 머지 후 후속)
- 매드업 등 KIND 지연 반영 종목 편입 위해 며칠 뒤 `python3 scripts/update-symbols.py` 1회 재실행.
- symbols 시드 주기적 자동 갱신(GitHub Actions) 도입 검토 — 수동 의존 제거.
