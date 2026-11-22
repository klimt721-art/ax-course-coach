// Supabase 공개 설정(URL, anon 키)을 검증해서 돌려준다. 값은 어디에도 출력하지 않는다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../.env.local", import.meta.url));

// 브라우저에 노출해도 되는 값인지 검사한다.
export function validateSupabaseEnv(url, key) {
  if (!url || !key) return { ok: false, reason: "SUPABASE_URL 또는 SUPABASE_ANON_KEY 가 비어 있습니다" };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url)) return { ok: false, reason: "SUPABASE_URL 형식이 올바르지 않습니다 (https://<ref>.supabase.co)" };
  try { // JWT 형식 키라면 service_role 인지 검사해 브라우저 노출을 막는다
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role === "service_role") return { ok: false, reason: "service_role 키는 브라우저에 노출되므로 사용할 수 없습니다. anon 키를 넣으세요" };
  } catch { /* 새 형식(sb_publishable_...) 키는 그대로 사용 */ }
  if (key.startsWith("sb_secret_")) return { ok: false, reason: "secret 키는 브라우저에 노출되므로 사용할 수 없습니다. anon/publishable 키를 넣으세요" };
  return { ok: true, url, key };
}

// 로컬 개발용: .env.local 에서 읽는다.
export function loadSupabaseEnv() {
  let text = "";
  try { text = readFileSync(file, "utf8"); } catch { return { ok: false, reason: ".env.local 파일이 없습니다" }; }
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return validateSupabaseEnv(vars.SUPABASE_URL, vars.SUPABASE_ANON_KEY);
}
