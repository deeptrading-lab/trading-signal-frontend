/**
 * PostCSS — Tailwind + autoprefixer.
 * Next.js 가 자동 인식한다 (`next.config.ts` 별도 설정 불필요).
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
