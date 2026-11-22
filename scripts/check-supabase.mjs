// 실행: npm run check:supabase  — 4개 테이블을 anon 키로 조회해 행 수를 CSV와 비교한다.
import { readFileSync } from "node:fs";
import { loadSupabaseEnv } from "../lib/env.mjs";

const env = loadSupabaseEnv();
if (!env.ok) { console.error("설정 문제:", env.reason); process.exit(1); }

const csvRows = (t) => readFileSync(new URL(`../data/${t}.csv`, import.meta.url), "utf8").trim().split(/\r?\n/).length - 1;
let failed = false;
for (const t of ["topics", "materials", "questions", "feedback_rules"]) {
  const res = await fetch(`${env.url.replace(/\/+$/, "")}/rest/v1/${t}?select=*`, {
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
  });
  if (!res.ok) {
    failed = true;
    const body = await res.json().catch(() => ({}));
    console.log(`✗ ${t}: HTTP ${res.status} ${body.message ?? ""}`);
    continue;
  }
  const rows = await res.json();
  const expected = csvRows(t);
  const mark = rows.length === expected ? "✓" : "!";
  if (rows.length !== expected) failed = true;
  console.log(`${mark} ${t}: ${rows.length}행 (CSV ${expected}행)${rows[0] ? " 컬럼: " + Object.keys(rows[0]).join(",") : ""}`);
}
process.exit(failed ? 1 : 0);
