// 의존성 없는 정적 파일 서버 (개발용). 실행: node server.js
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSupabaseEnv } from "./lib/env.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
};
const allowed = ["index.html", "css/", "js/", "data/"]; // lib/, scripts/, .env.local 은 제공하지 않음

http
  .createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p === "/") p = "/index.html";
      if (p === "/env.js") { // .env.local 의 공개 설정(URL, anon 키)만 브라우저로 전달
        const env = loadSupabaseEnv();
        if (!env.ok) console.warn(`[env] Supabase 미사용(CSV 모드): ${env.reason}`);
        const cfg = env.ok ? { SUPABASE_URL: env.url, SUPABASE_ANON_KEY: env.key } : {};
        res.writeHead(200, { "Content-Type": types[".js"], "Cache-Control": "no-store" });
        res.end(`window.__ENV__=${JSON.stringify(cfg)};`);
        return;
      }
      const rel = normalize(p).replace(/^[\\/]+/, "").replace(/\\/g, "/");
      if (rel.includes("..") || !allowed.some((a) => rel === a || rel.startsWith(a))) {
        res.writeHead(404).end("Not found");
        return;
      }
      const body = await readFile(join(root, rel));
      res.writeHead(200, { "Content-Type": types[extname(rel)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, () => console.log(`http://localhost:${port}`));
