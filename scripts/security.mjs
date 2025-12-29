import { execSync } from "node:child_process";
execSync("npm audit --audit-level=high", { stdio: "inherit" });
