# 모바일 렌더링 성능 — 측정 기준선 (Phase 0)

> 작성 시점 기준 브랜치: `feature/perf-ai-tree-splitting` (base = `main` @ `977bec0`). 변경 전 "before" 스냅샷.
> 각 워크스트림(WS) 머지 전 동일 방법으로 재측정해 PR 본문에 before/after 첨부.

## 측정 방법과 한계

- **번들**: `npm run build:analyze` (= `ANALYZE=true next build --webpack`). webpack 컴파일 직후 `.next/analyze/{client,nodejs,edge}.html`(webpack-bundle-analyzer treemap) 생성. 파서: `scratchpad/parse-analyze.mjs` 가 `client.html` 의 `window.chartData` 를 파싱해 청크별 크기 + 표적 라이브러리 gzip 합산.
- **한계 1**: Next.js 16 **Turbopack 빌드(`npm run build`, 배포 경로)는 라우트별 First Load JS 테이블을 출력하지 않는다.** 따라서 "라우트별 KB" 표는 webpack 경로에 의존.
- **한계 2 (선결 과제)**: `build:analyze`(webpack)가 **타입체크에서 실패**한다 — [app/api/market/indices/route.ts:224](app/api/market/indices/route.ts#L224) 가 테스트 헬퍼 `resetIndicesCacheForTest` 를 라우트 파일에서 export(Next.js 라우트 export 규칙 위반, `resetTickerCacheForTest` 선례 포함). 컴파일은 성공해 analyzer HTML 은 생성되지만, 타입체크 abort 로 `app-build-manifest.json`(라우트→청크 매핑)이 안 써진다 → 라우트별 First Load 합산 불가.
  - 일상 빌드/Vercel 배포는 Turbopack 이라 통과(`npm run build` exit 0 확인) → **prod 정상**. webpack 분석 경로만 영향.
  - **권고**: 캐시/리셋 헬퍼를 라우트 파일 밖 모듈로 분리(route 는 GET/config 만 export)하면 `build:analyze` 가 끝까지 돌아 라우트별 사이즈 테이블도 확보 가능. WS 와 독립된 선행 chore 후보.
- **대안 비교축**: 위 한계로 "라우트별 KB" 대신 **analyzer treemap 의 표적 라이브러리 청크 위치·크기**를 before/after 비교축으로 사용(동일 도구·동일 파서라 apples-to-apples). WS-1/4 의 효과(라이브러리가 셸→async 청크로 이동)가 직접 드러남.

## Before — 클라이언트 청크 상위 (gzip)

| 청크 | stat | gzip |
|---|---:|---:|
| `4485-*` (recharts 주력) | 1194.4 kB | **104.3 kB** |
| `4bd1b696-*` | 598.5 kB | 61.3 kB |
| `3794-*` | 841.5 kB | 59.1 kB |
| `framework-*` (react-dom) | 560.9 kB | 58.4 kB |
| `2627-*` (motion+markdown+@tanstack) | 710.1 kB | **48.4 kB** |
| `3287-*` (motion) | 486.4 kB | 46.1 kB |
| `main-*` | 389.7 kB | 39.4 kB |
| `app/(main)/layout-*` | 187.3 kB | 15.4 kB |
| `app/(main)/stock/[ticker]/page-*` | 196.3 kB | 16.9 kB |
| `app/(main)/analyze/page-*` | 134.7 kB | 12.6 kB |

## Before — 표적 라이브러리 (gzip 합, 현재 청크 위치)

| 라이브러리 | gzip | 청크 | 비고 |
|---|---:|---|---|
| **motion** | 44.7 kB | 2627, 3287 | AI 패널 전용(`AIAnalysisPanel`+서브). **WS-1 표적** |
| **react-markdown** | 31.0 kB | 2627 | `CardDetailOverlay` 전용. **WS-1 표적** |
| **remark-gfm** | 8.6 kB | 2627 | 동상 |
| (소계: AI 패널 전용) | **≈ 84.3 kB** | | WS-1 후 셸→async 이동 기대 |
| **recharts** | 109.5 kB | 4485, 2916, 3572, 4012 | stock-detail·analyze·paper-trading 차트. **WS-4 표적** |
| @tanstack/react-query | 32.1 kB | 다수 | 공용(불가피) |
| react-dom | 55.1 kB | framework | 공용(불가피) |

## 코드-레벨 확정 사실 (manifest 없이도 확실)

- `components/stock/GlobalAIAnalysis.tsx:3` 가 `AIAnalysisPanel` 을 **정적 import**. `GlobalAIAnalysis` 는 `app/(main)/layout.tsx:60` 에서 무조건 마운트 → motion(`AIAnalysisPanel.tsx:4`) + react-markdown(`CardDetailOverlay.tsx:5-6`)이 **셸 모듈 그래프**에 포함 → 8개 비-AI 라우트(home·watchlist·profile·market·intraday·dashboard·scorecard·paper-trading)에서도 로드.
- `next/dynamic` / `HydrationBoundary` / `dehydrate` / `prefetchQuery` 사용 **0건**(grep 확인).

## WS별 기대 효과 (after 재측정 항목)

- **WS-1**: motion + react-markdown + remark-gfm(≈84 kB gzip)이 셸 청크(2627/3287)에서 빠지고, 패널 열림 시 로드되는 **async 청크**로 이동. → 비-AI 라우트 First Load 에서 사라짐.
- **WS-4**: recharts(109.5 kB)가 analyze usage 탭 / 차트 컴포넌트의 async 청크로 분리. 헤더 티커 BFF 요청이 비-AI 라우트에서 제거.
- **WS-2**: 라우트 왕복 시 동일 쿼리 재요청 횟수 감소(Network 탭).

## 재측정 절차

```bash
npm run build:analyze            # .next/analyze/*.html 재생성 (타입체크 실패는 무시 — HTML 은 생성됨)
node scratchpad/parse-analyze.mjs   # 청크별/라이브러리별 gzip 재산출
```

## Web Vitals / Profiler (수동 — 미측정 항목)

- Lighthouse 모바일(Moto G / Slow 4G)·DevTools Performance CPU 4× throttle 라우트 전환 long task·React Profiler 셸 리렌더 횟수는 **수동 측정 필요**(자동화 미구비). WS 적용 후 동일 조건 재현.
- `[확인 필요]` Vercel Speed Insights(RUM) 활성 여부 — 켜져 있으면 라우트별 실측 LCP/INP 가 최고 신뢰도.
