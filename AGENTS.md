# AGENTS — Trading Signal Frontend

이 저장소는 Trading Signal Engine의 Next.js 프론트엔드와 Vercel 배포 구성을 담당한다.

## 제품 구조

- UI: Next.js App Router, TypeScript, React
- 배포: Vercel
- API 프록시: Next.js route handler
- 분석 엔진: `trading-signal-engine`의 FastAPI
- DB 예정: Supabase. MVP 현재 단계에서는 DB를 붙이지 않는다.

## 작업 원칙

- 사용자에게 노출되는 문구는 ticker, API 필드, 고유명사를 제외하고 한글을 기본으로 한다.
- 디자인 톤은 토스 서비스처럼 밝고 간결하며, 정보 밀도가 높고 조작이 빠른 금융 도구에 맞춘다.
- 브라우저는 FastAPI를 직접 호출하지 않는다. Next.js route handler가 `FASTAPI_BASE_URL`로 프록시한다.
- Supabase 키, Vercel 토큰, API secret은 `.env.local` 또는 Vercel Environment Variables에만 둔다.
- 커밋 메시지는 한글 요약을 기본으로 한다.

## 에이전트 역할

| 역할 | 책임 |
|---|---|
| PM | PRD, 스펙 변경, MVP 범위 관리 |
| UX/UI Designer | 토스톤 디자인 시스템, 화면 흐름, 상태/오류 UX |
| Frontend Dev | Next.js App Router, React, TypeScript, CSS 구현 |
| API Integration Dev | Next route handler, FastAPI contract, Supabase 연동 준비 |
| QA | 브라우저 플로우, 반응형, API 실패 상태 검증 |
| Reviewer | 접근성, 타입 안정성, 보안, Vercel 배포 리스크 검토 |
| DevOps | Vercel 환경변수, 배포, 도메인, preview/production 점검 |

## 산출물 위치

- PRD: `docs/prd/<slug>.md`
- 디자인: `docs/design/<slug>.md`
- QA: `docs/qa/<slug>.md`
- 에이전트 정의: `.claude/agents/*.md`, `docs/agents/*.md`

## 현재 MVP 호출 구조

```text
Browser
↓
Next.js app/page.tsx
↓
Next.js route handler (/api/*)
↓
trading-signal-engine FastAPI
↓
ai.stock_signal.workbench.analyze_workbench()
```
