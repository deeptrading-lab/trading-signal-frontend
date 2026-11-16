# 로컬에서 토스 모의매매 시작하기

토스증권 시세로 국내주식 자동매매를 연습한다. 앱은 가상 자금 1,000만 원으로 체결·보유·손익을 계산한다. 토스 Open API는 현재가, 최근 체결, 호가, 분봉, 장 운영 시간 조회에 사용한다. [토스증권 Open API 가이드](https://developers.tossinvest.com/docs)

`.env.local`의 토스 키로 매매 시세를 조회한다. 연습 종목은 AI 단타의 기존 실제 수급·거래량 추천을 가져와 종목코드로 중복을 제거한다. 추천 조회에는 앱에 설정된 기존 순위 연동이 필요하다. 후보는 시작 시와 60초마다 갱신한다.

새 컴퓨터에서는 Node.js 22.9 이상을 사용한다. 검증한 버전은 22.20.0이다. 의존성은 `npm ci`로 설치한다. 아래 다섯 줄을 저장소 루트의 `.env.local`에 입력한다.

```dotenv
TOSS_CLIENT_ID=
TOSS_CLIENT_SECRET=
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ENV=prod
```

로컬 웹 서버가 켜져 있는 동안 엔진이 동작한다. 종료 후 원장과 복기는 `.local/program-trading/toss-paper/`에서 확인한다. 서버 재시작 후 신규 매수는 멈춘 상태로 복원된다.

| 단계 | 할 일 | 완료 확인 |
| --- | --- | --- |
| 1 | 작업 브랜치를 pull하고 저장소 루트에서 `npm ci`를 실행한다. | 의존성 설치가 끝났다. |
| 2 | 위의 토스 키와 **한투 실전 조회 키**를 `.env.local`에 입력한다. 다른 네트워크를 쓴다면 토스증권 PC 웹 **설정 → Open API → 허용 IP 관리**에서 새 네트워크의 공인 IP를 확인한다. [토스 인증 문서](https://developers.tossinvest.com/docs/auth) | 키 4개와 `KIS_ENV=prod`가 설정됐다. |
| 3 | 저장소에서 `npm run program:dev`를 실행하고 [자동매매 화면](http://127.0.0.1:3000/program-trading)을 연다. | **토스 시세 · 모의투자**와 AI 단타 추천 종목이 표시된다. |
| 4 | 추천 조회가 계속 실패할 때만 서버를 끄고 `npm run program:check`를 실행한다. 점검 후 1분 정도 지나 서버를 다시 켠다. 같은 키로 서버와 점검 CLI를 동시에 실행하면 토큰 발급이 겹칠 수 있다. [토스 인증 문서](https://developers.tossinvest.com/docs/auth) · [한투 토큰 안내](https://github.com/koreainvestment/open-trading-api#5-%EB%AC%B8%EC%A0%9C-%ED%95%B4%EA%B2%B0-%EA%B0%80%EC%9D%B4%EB%93%9C) | `candidatesReady`, `calendarReady`가 모두 `true`다. 장외에는 `canStartNow: false`가 정상이다. |
| 5 | 한국 거래일 09:10~15:00 미만에 **토스 모의 시작**을 누른다. | **자동매매 중**이 표시된다. 유효한 시세가 매수 조건을 충족할 때 가상 체결이 기록된다. |
| 6 | **매매 종료**를 누른 뒤 가상 보유 잔량이 정리될 때까지 기다린다. | **거래 종료**가 표시된다. 30초 동안 유효 시세를 기다린 뒤 남은 수량만 마지막 기록 가격으로 가상 정산한다. 정산 내역은 원장에서 별도로 표시된다. |
| 7 | **거래 종료**가 표시되면 **새 세션 열기**를 누른다. | 기존 원장과 복기는 `.local/program-trading/toss-paper-archive/`에 보관된다. 새 세션은 가상 자금 1,000만 원으로 대기하며, **토스 모의 시작**을 누르면 운용을 시작한다. |

## 종료가 늦거나 시세가 멈출 때

- 시세 요청과 종료 명령은 독립적으로 처리된다. 수동 종료, 마감, 일일 손실 제한에서 30초 동안 유효한 체결·호가로 청산을 시도하고, 시간이 지나면 잔량을 마지막 기록 가격에 비용을 반영해 가상 정산한다. Mac이 실제로 잠들면 타이머도 실행되지 않으므로, 기한을 넘긴 경우 깨어나거나 개발 서버를 다시 시작해 화면을 열 때 처리한다.
- 화면 잠금과 Mac 절전은 별도다. 전원을 연결하고 화면 잠금을 유지한 채 `caffeinate -i npm run program:dev`로 비교하거나, 시스템 설정 → 배터리 → 옵션에서 디스플레이가 꺼져 있을 때 자동 잠자기를 방지한다. `pmset -g log`의 Sleep/Wake 시각과 서버 로그를 비교한다. [Apple 잠자기 설정](https://support.apple.com/guide/mac-help/set-sleep-and-wake-settings-mchle41a6ccd/mac)
- Next 개발 서버 터미널의 `[program-paper]`에서 `heartbeat-gap`은 서버 실행 공백, `calendar-unavailable`은 장 운영 정보 미확인, `no-fresh-quotes`는 5초 이내 유효 시세 부족, `candidates-unavailable`은 추천 문제를 뜻한다. `[toss-rest]`에서 `rate-limit`/429, `token-refresh`/401, `transport`를 구분한다. 403이 나오면 키 권한과 토스 허용 IP를 확인한다. 같은 키를 별도 프로세스나 스모크 테스트에서 동시에 쓰면 활성 토큰 갱신이 겹칠 수 있다. [토스 인증 문서](https://developers.tossinvest.com/docs/auth)

## 결과 저장과 Codex 복기

연결된 Supabase 프로젝트의 SQL Editor에서 [program-paper-reviews.sql](../sql/program-paper-reviews.sql)을 한 번 실행한다. 기존 AI 단타 모의투자 테이블과 별도로 생성되며, 서버 키만 읽고 쓸 수 있다. 기존 `SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 설정을 사용한다.

`.env.local`에 `PROGRAM_PAPER_RESULT_SYNC=1`을 추가하고 개발 서버를 다시 시작하면 새 종료 결과를 로컬 원장에 기록한 뒤 백그라운드에서 저장한다. DB가 일시적으로 실패하면 로컬 파일을 기준으로 `sync`를 재실행한다. `sync`를 반복해도 같은 결과는 중복 생성되지 않는다.

| 작업 | 명령 |
| --- | --- |
| 로컬 결과와 보관 ID 확인 | `npm run program:review -- local` |
| 가장 최근 완료 결과 또는 보관 세션 업로드 | `npm run program:review -- sync` 또는 `npm run program:review -- sync <보관ID>` |
| DB 결과 목록 | `npm run program:review -- list` |
| 로컬 Codex CLI로 평가하고 점수·근거·제안 추가 | `npm run program:review -- score <세션ID>` |
| 실제 변경을 커밋한 뒤 적용 기록 추가 | `npm run program:review -- applied <세션ID> <커밋SHA> "적용 내용"` |
| DB 결과와 평가·적용 이력 조회 | `npm run program:review -- show <세션ID>` |

`score`는 `codex login status`로 로그인 상태를 확인한 CLI를 실행한다. Codex에는 저장된 복기 보고서가 전달된다. 평가는 원장·비용 대사(40점), 규칙 준수 확인(30점), 시세 품질과 종료 검증(30점)을 기준으로 한다. 점수와 제안은 평가 시점별로 남으며, 규칙 변경은 실제 작업과 검증 후 적용 내역으로 기록한다. 목록과 이력은 최근 20건부터 표시하며, `list 20` 또는 `show <세션ID> 20`으로 다음 페이지를 조회할 수 있다.

실행 PC와 조회 PC의 서버를 같은 Supabase 프로젝트에 연결한다. 조회 PC에서는 토스 키 없이 [모의매매 결과](http://127.0.0.1:3000/program-trading/review?source=shared)를 열 수 있다. 자동매매 → **세션 결과 보기** → **공유 DB 결과**에서도 종료 결과와 AI 평가·개선 이력을 볼 수 있다. 배포 환경에서는 관리자 계정으로 **마이페이지 → 관리자 메뉴 → 자동매매 모의 결과**를 연다. 자동 저장 설정을 켜기 전에 종료한 세션은 실행 PC에서 위의 `sync` 명령으로 등록한다.

**개선 적용하기**는 선택한 세션의 최신 Codex 평가에서 근거가 있는 개선 한 가지를 골라 작업 폴더에 반영한다. 현재 운용을 종료하고 버튼을 누른다. Codex CLI 로그인과 Archify 설치가 필요하다. Archify 기본 경로가 다르면 `.env.local`에 `ARCHIFY_HOME`을 지정한다. 검증을 통과하고 적용이 완료되면 로컬 개발 서버를 다시 시작한다. 적용된 작업은 커밋 전에 Git diff로 확인할 수 있다.
