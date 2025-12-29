import { execSync } from "node:child_process";
execSync("node -v", { stdio: "inherit" });
execSync("npm -v", { stdio: "inherit" });
