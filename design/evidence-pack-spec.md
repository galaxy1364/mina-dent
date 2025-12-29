# Evidence Pack Spec — Mina-dent

## Required Files
- QG.json
- evidence/manifest.json (sha256 for each file)
- evidence/run-metadata.json (commit, run-id, env, time)
- evidence/screenshots/overall.png
- evidence/screenshots/tests.png
- evidence/screenshots/errors-zero.png
- evidence/screenshots/prod-deploy.png (if prod)
- evidence/signed-artifact-ref.txt
- evidence/video/run.mp4 (optional)

## Acceptance
- Missing any required file => STOP
- Checksums must match
