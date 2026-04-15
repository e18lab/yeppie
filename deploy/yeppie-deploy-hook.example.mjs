/**
 * Пример приёмника деплоя на VPS: слушает localhost, проверяет HMAC и
 * запускает ваш скрипт. За nginx: location /hooks/yeppie { proxy_pass http://127.0.0.1:8790; }
 *
 *   YEPPIE_HOOK_SECRET=<тот же секрет, что показывает панель>
 *   YEPPIE_DEPLOY_CMD=/path/to/deploy.sh
 *   node yeppie-deploy-hook.example.mjs
 */
import http from "http";
import crypto from "crypto";
import { spawn } from "child_process";

const PORT = Number(process.env.YEPPIE_HOOK_PORT || "8790");
const SECRET = process.env.YEPPIE_HOOK_SECRET || "";
const CMD = process.env.YEPPIE_DEPLOY_CMD || "";

function verify(body, sigHeader) {
  if (!SECRET || !sigHeader || !sigHeader.startsWith("sha256=")) return false;
  const expected = sigHeader.slice("sha256=".length);
  const hmac = crypto.createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(hmac, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end();
    return;
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    const ok = verify(raw, req.headers["x-yeppie-signature"]);
    if (!ok) {
      res.writeHead(401);
      res.end("bad signature");
      return;
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.writeHead(400);
      res.end("bad json");
      return;
    }
    console.log("[yeppie-hook]", payload.reason, payload.sha, payload.fullHost);

    if (CMD) {
      const child = spawn(CMD, [], {
        shell: true,
        env: { ...process.env, YEPPIE_PAYLOAD: raw },
        detached: false,
      });
      child.stdout?.pipe(process.stdout);
      child.stderr?.pipe(process.stderr);
      child.on("error", (e) => console.error(e));
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`yeppie deploy hook on http://127.0.0.1:${PORT}`);
});
