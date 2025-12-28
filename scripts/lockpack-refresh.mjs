async function main() {
  ensureDir(EVID_DIR);

  if (!process.env.DATABASE_URL) die("MISSING_DATABASE_URL");

  // Run smoke (must be PASS)
  const smokeCode = await run(process.execPath, [path.join(ROOT, "scripts", "ci-smoke.mjs")], {
    env: process.env
  });

  const status = smokeCode === 0 ? "PASS" : "FAIL";
  writeQG(status);

  // Always refresh bundle deterministically (even on FAIL)
  await zipEvidence();
  writeManifest();
  writeHashlock();

  // FAIL-FAST: never print PASS if smoke failed
  if (status !== "PASS") die("SMOKE_FAILED", smokeCode || 1);

  process.stdout.write("[lockpack] PASS\n");
  process.exit(0);
}
