param()

$ErrorActionPreference = "Stop"

$bad = git ls-files | Where-Object {
  $_ -eq '$null' -or
  $_ -match '\.bak(\.|$)' -or
  $_ -match '(^|/)\.lockpack(/|$)' -or
  ($_.StartsWith('.env') -and $_ -ne '.env.example')
}

if ($bad) {
  $bad | ForEach-Object { Write-Host "BANNED TRACKED: $_" }
  throw "Repo hygiene failed: banned tracked files found."
}

Write-Host "Repo hygiene OK"