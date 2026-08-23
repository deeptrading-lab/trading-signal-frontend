# QA — live-role-check (특권 경로 DB 등급 대조 · 세션 7일)

- **PR**: #388 / `feature/hylee/live-role-check`
- **일자**: 2026-08-23
- **환경**: 로컬 `next dev`, Supabase 운영 DB(읽기 전용 — 프로필 **변경 0건**)
- **판정**: **PASS** (검증 중 누락 2건 발견 → 같은 브랜치에서 수정 후 재검증)

## 배경

세션 쿠키에 발급 시점 `role` 이 구워져 있고 `status` 는 실리지 않아, 강등·승인취소가 기존
쿠키에 반영되지 않았다(노출 창 30일). 서버가 남의 쿠키를 지울 수는 없으므로 **특권을 판정하는
쪽이 요청 시점에 DB 를 확인**하도록 바꾸고(B), 잔여 열람 창을 줄이기 위해 세션 수명을 7일로
단축했다(A).

## 검증 방법 — 실데이터 변경 없이 강등 재현

일반 유저(`wisehs515@gmail.com`, DB `role=user`)의 `sub` 로 **`role: "superadmin"` 을 구운
정상 서명 쿠키**를 만들었다. 서명은 유효하지만 DB 등급은 `user` — "강등됐는데 옛 쿠키를 들고
있는 상태"와 동일하다. 실계정 등급·상태는 **하나도 바꾸지 않았다**.

대조군은 실제 superadmin(`lhy.it.0118@gmail.com`).

## AC 별 결과

| # | 수용 기준 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | 강등된 관리자는 관리자 API 를 못 쓴다 | 위조 쿠키로 3개 API | 403 | `/api/admin/users` **403** · `/api/admin/approvals` **403** · `/api/admin/users/role` **403** | PASS |
| 2 | 정상 관리자는 그대로 통과 | 실 superadmin 쿠키 | 200 | users **200** · approvals **200** · role 변경 **404**(가드 통과 후 대상 없음 = 정상) | PASS |
| 3 | `/api/auth/me` 가 DB 등급을 반환 | 위조 쿠키 | `role: "user"` | `{"authenticated":true,"role":"user",…}` — 쿠키의 superadmin 무시 | PASS |
| 4 | 정상 계정은 등급 유지 | 실 superadmin | `role: "superadmin"` | 일치 | PASS |
| 5 | 관리자 페이지 게이트 | `/admin` | 강등=거부 / 정상=진입 | 강등 **접근 거부** · 정상 **진입** | PASS |
| 6 | 성적표 페이지 게이트 | `/dashboard/scorecard` | 강등=거부 / 정상=진입 | 일치 | PASS |
| 7 | 마이페이지 관리자 메뉴 | `/profile` | 강등엔 미노출 | 강등 **0건** · 정상 **1건**("유저 관리") | PASS |
| 8 | 세션 수명 7일 | 새 쿠키 서명 후 payload 디코드 | `exp-iat = 604800` | **604800초 = 7일** | PASS |
| 9 | 세션 role 직접 신뢰 잔존 0 | `identity.role` 전수 grep | 특권 판정에 쿠키 role 사용 0건 | 잔존 2곳 모두 비-판정(세션 발급·표시용 폴백) | PASS |

## 에지 케이스

| 케이스 | 기대 | 실측 | 판정 |
|---|---|---|---|
| 프로필 스토어 **오류** | 거부(fail-closed) — 설정됐는데 확인 못 하면 열지 않는다 | 단위테스트: `resolveLiveIdentity` null, 라우트 **403** | PASS |
| 프로필 **행 없음**(삭제된 유저) | 거부 | `resolveLiveIdentity` null | PASS |
| 승인취소(`status=pending`) | 등급이 admin 이어도 특권 없음 | 라우트 **403** | PASS |
| 스토어 **미설정**(로컬 dev) | 세션 값 폴백, DB 조회 0 | 폴백 확인 + `getProfileBySub` 미호출 | PASS |

## 검증 중 발견 → 수정

| # | 누락 | 조치 |
|---|---|---|
| F1 | `/admin` 페이지가 `readServerIdentity()` 로 **세션 role 을 직접** 봐서, 강등된 관리자에게 페이지 셸이 그대로 렌더됐다(유저 목록은 API 가 403 이라 비어 있었지만 화면은 열림) | `hasServerRole` 로 전환 — 등급 드롭다운 노출 판정도 동일 기준 |
| F2 | `/profile` 의 관리자 메뉴가 DB 조회 실패 시 **세션 role 로 폴백**해 fail-open 이었다 | 스토어 미설정(로컬 dev)일 때만 세션 폴백, 설정됐는데 조회 실패면 메뉴 닫음(fail-closed) |
| F3 | `/admin` 이 `hasServerRole("admin")` + `hasServerRole("superadmin")` 를 각각 불러 **DB 를 2회** 조회했다(리뷰 지적) | `readServerPrivileges("admin","superadmin")` 추가 — 조회 1회로 여러 등급 판정. 게이트 동작은 재검증(강등=거부·정상=진입) |

## 회귀

- `npx tsc --noEmit` 통과 · `npx eslint` 에러·경고 **0**
- `npx vitest run` **1502 passed / 3 skipped** (신규 11건: liveRole 단위 7 + approvals 라우트 라이브 경로 4)
- 기존 `approvals` 라우트 테스트는 스토어 **미설정** 기본값으로 두어 "쿠키 role → 결과" 계약을
  그대로 검증하고, 라이브 경로는 별도 describe 로 분리했다.

## 남는 노출 (설계상 수용)

일반 조회 API(`/api/stock/*`·`/api/market/*`)와 Edge 게이트는 그대로다. 승인취소된 유저는
**쿠키 만료(7일)까지 데이터 열람이 가능**하다. 즉시 전면 차단은 게이트가 매 요청 revocation 을
조회해야 하고, 이는 `proxy.ts` 의 "네트워크 I/O 0"(AC-15) 설계를 깨는 선택이라 채택하지 않았다.
필요해지면 KV revocation 마커 + 게이트 대조로 확장 가능.
