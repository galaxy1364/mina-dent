import { execSync } from "node:child_process";

const cmd = [
  "grep -RIn",
  "--exclude-dir=node_modules",
  "--exclude-dir=.git",
  "--exclude-dir=dist",
  "--exclude-dir=build",
  "--exclude-dir=coverage",
  "--exclude-dir=.github",
  "--exclude-dir=LOCKPACK",
  "--exclude-dir=design",
  "--exclude-dir=docs",
  "--exclude-dir=e2e",
  "--exclude-dir=__tests__",
  "--exclude-dir=tests",
  "--exclude='*.spec.*'",
  "--exclude='*.test.*'",
  "-E",
  "console\\.error[[:space:]]*\\(",
  "."
].join(" ");

try {
  execSync(cmd, { stdio: "inherit", shell: "bash" });
  console.error("FAIL: console.error(...) token found in runtime source");
  process.exit(1);
} catch {
  process.exit(0);
}
