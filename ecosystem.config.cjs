/**
 * PM2: статика после `yarn build` (порт 4173).
 * Первый запуск: cd /opt/yeppie && pm2 start ecosystem.config.cjs && pm2 save
 */
const path = require("path");
const root = __dirname;

module.exports = {
  apps: [
    {
      name: "yeppie",
      cwd: root,
      script: path.join(root, "node_modules/serve/build/main.js"),
      args: ["-s", "-l", "4173", "dist"],
      interpreter: "node",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
    },
  ],
};
