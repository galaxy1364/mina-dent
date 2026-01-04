param(
  [ValidateSet("Verify","SyncRepo","RegenerateHashes","ResumeTest","Help")]
  [string]$Mode = "Help",
  [string]$RepoRoot = (Get-Location).Path
)
$ErrorActionPreference = "Stop"

function Write-Section($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Sha256File([string]$p){ (Get-FileHash -Algorithm SHA256 -Path $p).Hash.ToLower() }

function Read-HashLockManifestHash([string]$lockDir){
  $hashFile = Join-Path $lockDir "HASHLOCK.sha256"
  if(!(Test-Path $hashFile)){ throw "Missing HASHLOCK.sha256 in $lockDir" }
  $line = (Get-Content $hashFile | Where-Object { $_ -and ($_ -notmatch '^\s*#') } | Select-Object -First 1)
  if($line -notmatch '^(?<hash>[0-9a-f]{64})\s\sMANIFEST\.json$'){ throw "HASHLOCK.sha256 must contain: <sha256>  MANIFEST.json" }
  return $Matches["hash"]
}

function Regenerate-Hashes {
  Write-Section "Regenerate MANIFEST + HASHLOCK + ID (stable, no self-reference)"
  $lockDir = Join-Path $RepoRoot "LOCKPACK"

  # Manifest lists every file EXCEPT generated trio (MANIFEST/HASHLOCK/ID)
  $files = Get-ChildItem -Path $lockDir -File |
    Where-Object { $_.Name -notin @("MANIFEST.json","HASHLOCK.sha256","LOCKPACK_ID.txt") } |
    Sort-Object Name

  $manifest = [ordered]@{ generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); files = @() }
  foreach($f in $files){
    $manifest.files += [ordered]@{ path=$f.Name; sha256=(Sha256File $f.FullName); bytes=$f.Length }
  }

  $manifestPath = Join-Path $lockDir "MANIFEST.json"
  ($manifest | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $manifestPath

  $mhash = Sha256File $manifestPath

  $mhash | Set-Content -Encoding UTF8 (Join-Path $lockDir "LOCKPACK_ID.txt")
  ("{0}  MANIFEST.json`n" -f $mhash) | Set-Content -Encoding UTF8 (Join-Path $lockDir "HASHLOCK.sha256")

  Write-Host "Regenerated. Next: .\LOCKPACK\LOCKPACK.ps1 -Mode Verify" -ForegroundColor Yellow
}

function Verify-HashLock {
  Write-Section "Verify HashLock (MANIFEST hash) + verify files vs MANIFEST"
  $lockDir = Join-Path $RepoRoot "LOCKPACK"
  $manifestPath = Join-Path $lockDir "MANIFEST.json"
  $idPath = Join-Path $lockDir "LOCKPACK_ID.txt"

  if(!(Test-Path $manifestPath)){ throw "Missing MANIFEST.json (run RegenerateHashes)" }
  if(!(Test-Path $idPath)){ throw "Missing LOCKPACK_ID.txt (run RegenerateHashes)" }

  $expected = Read-HashLockManifestHash $lockDir
  $actual = Sha256File $manifestPath
  if($actual -ne $expected){ throw "HashLock FAILED: MANIFEST.json hash mismatch" }

  $id = (Get-Content $idPath -Raw).Trim().ToLower()
  if($id -ne $actual){ throw "HashLock FAILED: LOCKPACK_ID.txt mismatch" }

  $m = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $fail=@()
  foreach($e in $m.files){
    $p = Join-Path $lockDir $e.path
    if(!(Test-Path $p)){ $fail += "MISSING: $($e.path)"; continue }
    $h = Sha256File $p
    if($h -ne $e.sha256){ $fail += "MISMATCH: $($e.path)" }
  }
  if($fail.Count -gt 0){
    $fail | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    throw "HashLock FAILED: file mismatches"
  }

  Write-Host "HashLock PASSED" -ForegroundColor Green
}

function Sync-RepoFiles {
  Write-Section "SyncRepo (CODEOWNERS bootstrap)"
  Verify-HashLock

  $lockDir = Join-Path $RepoRoot "LOCKPACK"
  $sample = Join-Path $lockDir "CODEOWNERS.sample"
  $dst = Join-Path $RepoRoot "CODEOWNERS"

  if(!(Test-Path $sample)){ throw "Missing $sample" }
  if(!(Test-Path $dst)){
    Copy-Item $sample $dst -Force
    Write-Host "Created CODEOWNERS at repo root." -ForegroundColor Yellow
  } else {
    Write-Host "CODEOWNERS exists; not overwriting." -ForegroundColor Green
  }
}

function Resume-Test {
  Write-Section "ResumeTest"
  Verify-HashLock
  $idPath = Join-Path (Join-Path $RepoRoot "LOCKPACK") "LOCKPACK_ID.txt"
  Write-Host ("LOCKPACK ID: " + (Get-Content $idPath -Raw).Trim()) -ForegroundColor Green
  Write-Host "New chat: upload ZIP (single LOCKPACK folder) + paste PROMPT_RESUME.txt" -ForegroundColor Cyan
}

function Show-Help { Write-Host "Modes: Verify | SyncRepo | RegenerateHashes | ResumeTest" }

switch($Mode){
  "Verify" { Verify-HashLock }
  "SyncRepo" { Sync-RepoFiles }
  "RegenerateHashes" { Regenerate-Hashes }
  "ResumeTest" { Resume-Test }
  default { Show-Help }
}
