/**
 * PostCSS — Tailwind v4 단일 플러그인.
 * v3 의 `tailwindcss` + `autoprefixer` 조합 → v4 의 `@tailwindcss/postcss` 가 흡수.
 * - `@tailwindcss/postcss` 가 내부적으로 LightningCSS 를 사용해 vendor prefix 까지 처리하므로
 *   별도의 autoprefixer 호출 불필요.
 * - Next.js 가 본 파일을 자동 인식 (`next.config.ts` 별도 설정 불필요).
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
