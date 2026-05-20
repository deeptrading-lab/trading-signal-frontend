# Frontend 규칙

- 웹 UI는 **PRD에 명시된 경우에만** 구현
- 스택·방향은 `README.md`와 정합성 유지
- 디자인 시스템(shadcn/ui 등) 및 UX/UI 디자이너 가이드 준수
- **스타일링 기본 방식**: **Tailwind 유틸리티**. 화면·컴포넌트는 className 으로 Tailwind 유틸리티를 조합하거나 `@layer components` 로 묶인 합성 토큰 클래스(`card`, `badge-warn` 등) 를 참조한다. `app/globals.css` 는 Tailwind 디렉티브 + preflight 가 흡수하지 못하는 잔여물(예: `tabular-nums` 헬퍼, `@keyframes`) 에 한정한다.
- **디자인 토큰 동기화**: 디자이너가 `docs/design/<slug>.md` (DESIGN.md) 의 토큰을 갱신하면 `npm run design:sync` 가 `tailwind.theme.json` 을 재생성하고, `tailwind.config.ts` 가 이를 import 해 Tailwind theme 에 주입한다. 코드에 hex/px 직타 금지.

