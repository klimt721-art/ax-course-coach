// 데이터 계층: 화면 코드(app.js)는 loadAll()만 호출한다.
// - window.__ENV__ 에 SUPABASE_URL / SUPABASE_ANON_KEY 가 있으면 Supabase 4개 테이블을 읽는다.
// - 없으면 data/*.csv 로 대체하고, 화면에 "CSV 모드"로 표시한다. (Supabase 오류를 CSV로 숨기지 않는다)
import { parseCsv } from "./csv.js";

const CSV_FILES = {
  topics: "data/topics.csv",
  materials: "data/materials.csv",
  questions: "data/questions.csv",
  feedback_rules: "data/feedback_rules.csv",
};

const env = (typeof window !== "undefined" && window.__ENV__) || {};
export const source = env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? "supabase" : "csv";

async function fromCsv(table) {
  const res = await fetch(CSV_FILES[table], { cache: "no-store" });
  if (!res.ok) throw new Error(`${CSV_FILES[table]} 을(를) 불러오지 못했습니다 (${res.status})`);
  return parseCsv(await res.text());
}

async function fromSupabase(table) {
  const url = `${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${table}?select=*`;
  const res = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).message ?? ""; } catch { /* 본문 없음 */ }
    throw new Error(`Supabase '${table}' 조회 실패 (${res.status}) ${detail}`.trim());
  }
  return res.json();
}

export async function loadAll() {
  const read = source === "supabase" ? fromSupabase : fromCsv;
  const [topics, materials, questions, rules] = await Promise.all(
    ["topics", "materials", "questions", "feedback_rules"].map(read)
  );
  return {
    topics: topics.sort((a, b) => a.topic_id.localeCompare(b.topic_id)),
    materials: materials
      .map((m) => ({ ...m, sort_order: Number(m.sort_order) }))
      .sort((a, b) => a.sort_order - b.sort_order),
    questions: questions.sort((a, b) => a.question_id.localeCompare(b.question_id)),
    feedbackRules: rules.map((r) => ({
      ...r,
      min_score: Number(r.min_score),
      max_score: Number(r.max_score),
    })),
  };
}
