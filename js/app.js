import { loadAll, source } from "./dataSource.js";

const app = document.getElementById("app");
let data = null;
const scores = {}; // topic_id -> 이번 접속 중 최고 점수 (새로고침하면 사라짐, 저장하지 않음)

// ---------- 유틸 ----------
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
}
function render(...nodes) {
  app.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  window.scrollTo(0, 0);
  app.querySelector("h1")?.setAttribute("tabindex", "-1");
  app.querySelector("h1")?.focus({ preventScroll: true });
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const diffTag = (d) => h("span", { class: "tag" + (d === "응용" ? " adv" : "") }, d);
const topicOf = (id) => data.topics.find((t) => t.topic_id === id);

// ---------- 화면: 주제 선택 ----------
function showHome() {
  render(
    h("h1", {}, "학습할 주제를 골라요"),
    h("p", { class: "sub" }, "주제를 고르면 핵심 개념을 읽고, 3문항을 풀어 볼 수 있어요."),
    source === "csv" ? h("p", { class: "err" }, "Supabase 미연결 · CSV 모드로 실행 중") : null,
    h("div", { class: "cards" },
      data.topics.map((t) =>
        h("button", { class: "card", type: "button", onclick: () => showStudy(t.topic_id) },
          scores[t.topic_id] != null ? h("span", { class: "done" }, `최고 ${scores[t.topic_id]}점`) : null,
          diffTag(t.difficulty),
          h("span", { class: "t" }, t.title),
          h("span", { class: "o" }, t.learning_objective)
        )
      )
    )
  );
}

// ---------- 화면: 핵심 개념 ----------
function showStudy(topicId) {
  const t = topicOf(topicId);
  const mats = data.materials.filter((m) => m.topic_id === topicId);
  render(
    diffTag(t.difficulty),
    h("h1", {}, t.title),
    h("p", { class: "sub" }, `학습 목표: ${t.learning_objective}`),
    h("h2", {}, "핵심 개념"),
    mats.map((m) =>
      h("div", { class: "panel" },
        h("p", {}, m.content),
        m.example ? h("p", { class: "example" }, `예시) ${m.example}`) : null
      )
    ),
    h("button", { class: "btn", type: "button", onclick: () => startQuiz(topicId) }, "퀴즈 풀기 (3문항)"),
    h("button", { class: "btn secondary", type: "button", onclick: showHome }, "다른 주제 고르기")
  );
}

// ---------- 화면: 퀴즈 ----------
function startQuiz(topicId) {
  const qs = data.questions.filter((q) => q.topic_id === topicId).slice(0, 3).map((q) => ({
    q,
    // 보기 순서를 섞되, 정답 판정은 원래 보기 기호(A~D)로 한다
    options: shuffle(["a", "b", "c", "d"].filter((k) => q["option_" + k])).map((k) => ({
      key: k.toUpperCase(), text: q["option_" + k],
    })),
    picked: null,
  }));
  showQuestion({ topicId, qs, i: 0 });
}

function showQuestion(s) {
  const item = s.qs[s.i];
  const last = s.i === s.qs.length - 1;
  const nextBtn = h("button", {
    class: "btn", type: "button", disabled: item.picked == null,
    onclick: () => (last ? showResult(s) : showQuestion({ ...s, i: s.i + 1 })),
  }, last ? "제출하고 결과 보기" : "다음 문항");
  render(
    h("p", { class: "sub" }, `${topicOf(s.topicId).title} · ${s.i + 1} / ${s.qs.length}`),
    h("div", { class: "progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": s.qs.length, "aria-valuenow": s.i + 1 },
      h("i", { style: `width:${((s.i + 1) / s.qs.length) * 100}%` })),
    h("h1", { class: "q" }, item.q.question_text),
    h("div", { class: "opts" },
      item.options.map((o) =>
        h("button", {
          class: "opt", type: "button", "aria-pressed": item.picked === o.key,
          onclick: (e) => {
            item.picked = o.key;
            e.currentTarget.parentElement.querySelectorAll(".opt").forEach((b) => b.setAttribute("aria-pressed", "false"));
            e.currentTarget.setAttribute("aria-pressed", "true");
            nextBtn.disabled = false;
          },
        }, o.text)
      )
    ),
    h("div", { class: "row" },
      s.i > 0 ? h("button", { class: "btn secondary", type: "button", onclick: () => showQuestion({ ...s, i: s.i - 1 }) }, "이전") : null,
      nextBtn
    )
  );
}

// ---------- 화면: 결과 (정답 해설 + 점수 구간 피드백) ----------
function showResult(s) {
  const total = s.qs.length;
  const correct = s.qs.filter((x) => x.picked === x.q.correct_option).length;
  const score = Math.round((correct / total) * 100);
  scores[s.topicId] = Math.max(scores[s.topicId] ?? 0, score);
  const rule = data.feedbackRules.find((r) => score >= r.min_score && score <= r.max_score);

  render(
    h("h1", {}, "결과"),
    h("div", { class: "panel score" },
      h("div", { class: "n" }, `${score}점`),
      h("div", { class: "d" }, `${total}문항 중 ${correct}문항 정답 · ${topicOf(s.topicId).title}`)
    ),
    rule ? h("div", { class: "fb" }, h("b", {}, rule.feedback), h("span", {}, `다음 학습: ${rule.next_step}`)) : null,
    h("h2", {}, "문항별 해설"),
    s.qs.map((x, idx) => {
      const ok = x.picked === x.q.correct_option;
      const optText = (key) => x.options.find((o) => o.key === key)?.text ?? "-";
      return h("div", { class: "panel rv " + (ok ? "ok" : "bad") },
        h("p", { class: "res" }, `${idx + 1}. ${ok ? "정답" : "오답"}`),
        h("p", {}, x.q.question_text),
        h("p", {}, `내 답: ${optText(x.picked)}`),
        ok ? null : h("p", {}, `정답: ${optText(x.q.correct_option)}`),
        h("p", { class: "ex" }, x.q.explanation)
      );
    }),
    h("button", { class: "btn", type: "button", onclick: () => startQuiz(s.topicId) }, "같은 주제 다시 풀기"),
    h("button", { class: "btn secondary", type: "button", onclick: () => showStudy(s.topicId) }, "개념 다시 보기"),
    h("button", { class: "btn secondary", type: "button", onclick: showHome }, "다른 주제 고르기")
  );
}

// ---------- 시작 ----------
document.getElementById("home-btn").addEventListener("click", () => data && showHome());
loadAll()
  .then((d) => { data = d; showHome(); })
  .catch((e) => render(h("div", { class: "err" }, `데이터를 불러오지 못했어요. 개발 서버(npm run dev)로 열었는지 확인해 주세요. (${e.message})`)));
