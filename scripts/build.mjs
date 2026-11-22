// 배포용 빌드: 화면에 필요한 파일만 dist/ 로 복사하고, 환경 변수로 dist/env.js 를 만든다.
// - Vercel: 프로젝트 환경 변수 SUPABASE_URL, SUPABASE_ANON_KEY 를 사용 (빠져 있으면 빌드 실패)
// - 로컬 시험: 환경 변수가 없으면 .env.local 을 사용
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { loadSupabaseEnv, validateSupabaseEnv } from "../lib/env.mjs";

const fromProcess = process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY
  ? validateSupabaseEnv(process.env.SUPABASE_URL?.trim(), process.env.SUPABASE_ANON_KEY?.trim())
  : null;
const env = fromProcess ?? loadSupabaseEnv();

if (!env.ok) {
  if (process.env.VERCEL) {
    console.error(`빌드 중단: ${env.reason}\nVercel 프로젝트의 Environment Variables 에 SUPABASE_URL, SUPABASE_ANON_KEY 를 설정하세요.`);
    process.exit(1);
  }
  console.warn(`[build] Supabase 설정 없음 → CSV 모드로 빌드합니다 (${env.reason})`);
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const p of ["index.html", "css", "js", "data"]) cpSync(p, `dist/${p}`, { recursive: true });
const cfg = env.ok ? { SUPABASE_URL: env.url, SUPABASE_ANON_KEY: env.key } : {};
writeFileSync("dist/env.js", `window.__ENV__=${JSON.stringify(cfg)};`);
console.log(`dist/ 생성 완료 (${env.ok ? "Supabase 모드" : "CSV 모드"})`);
