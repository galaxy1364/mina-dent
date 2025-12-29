import { execSync } from "node:child_process";
const url = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";
execSync("npx --yes @lhci/cli@0.13.x autorun --collect.url=" + url, { stdio: "inherit" });
