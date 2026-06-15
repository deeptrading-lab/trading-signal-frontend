/**
 * 서버 전용 실행 환경 판별 헬퍼.
 *
 * `isVercelEnv()` — Vercel(serverless) 환경 여부. AI 분석·claude-cli 모드처럼 로컬 셸 호출에
 * 의존하는 기능을 Vercel 에서 차단하기 위한 단일 진실 원천. 이전에는 ai-analysis / ai-signal /
 * workbench(analyze·claudeCli) route 마다 동일 함수를 중복 정의했었다.
 */

export function isVercelEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.VERCEL_ENV === "string" ||
    typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string"
  );
}
