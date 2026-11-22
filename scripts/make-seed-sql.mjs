// data/*.csv 를 읽어 supabase/seed.sql(INSERT 문)을 만든다. CSV는 수정하지 않는다.
// 실행: node scripts/make-seed-sql.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "../js/csv.js";

const tables = [
  ["topics", ["topic_id", "title", "learning_objective", "difficulty"], []],
  ["materials", ["material_id", "topic_id", "sort_order", "content", "example"], ["sort_order"]],
  ["questions", ["question_id", "topic_id", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"], []],
  ["feedback_rules", ["rule_id", "min_score", "max_score", "feedback", "next_step"], ["min_score", "max_score"]],
];
const lit = (v, num) => (num ? String(Number(v)) : `'${v.replace(/'/g, "''")}'`);

let sql = "-- data/*.csv 에서 자동 생성 (scripts/make-seed-sql.mjs). 여러 번 실행해도 중복 입력되지 않습니다.\n";
for (const [name, cols, nums] of tables) {
  const rows = parseCsv(readFileSync(new URL(`../data/${name}.csv`, import.meta.url), "utf8"));
  const values = rows.map((r) => "  (" + cols.map((c) => lit(r[c], nums.includes(c))).join(", ") + ")").join(",\n");
  sql += `\ninsert into public.${name} (${cols.join(", ")}) values\n${values}\non conflict (${cols[0]}) do nothing;\n`;
}
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql, "utf8");
console.log("supabase/seed.sql 생성 완료");
