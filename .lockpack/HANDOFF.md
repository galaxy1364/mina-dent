# LOCKPACK HANDOFF

PASS requires:
- Zero JS runtime errors (unhandledrejection/onerror/console.error = 0)
- No infinite pending (hard timeouts)
- Abort-safe cancellation behavior (ABORTED)
- Signed CI artifact (keyless/OIDC)
- Full evidence bundle (QG.json + logs + manifest/hashlock)

Do not merge unless QG.json result is PASS and evidence is attached.