param(
  [ValidateSet("Verify","SyncRepo","RegenerateHashes","ResumeTest","Help")]
  [string]$Mode = "Help",
  [string]$RepoRoot = (Get-Location).Path
)
$ErrorActionPreference = "Stop"

function Write-Section($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Sha256File([string]$p){ (Get-FileHash -Algorithm SHA256 -Path $p).Hash.ToLower() }

function Verify-HashLock {
  Write-Section "Verify HashLock (LOCKPACK root files only)"
  $lockDir = Join-Path $RepoRoot "LOCKPACK"
  $hashFile = Join-Path $lockDir "HASHLOCK.sha256"
  if(!(Test-Path $hashFile)){ throw "Missing HASHLOCK.sha256 in $lockDir" }

  $fail = @()
  $lines = Get-Content $hashFile | Where-Object { $_ -and ($_ -notmatch '^\s*#') }
  foreach($line in $lines){
    if($line -match '^(?<hash>[0-9a-f]{64})\s\s(?<path>.+)$'){
      $expected = $Matches["hash"]
      $name = $Matches["path"]
      $p = Join-Path $lockDir $name
      if(!(Test-Path $p)){ $fail += "MISSING: $name"; continue }
      $actual = Sha256File $p
      if($actual -ne $expected){ $fail += "MISMATCH: $name" }
    }
  }
  if($fail.Count -gt 0){
    $fail | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    throw "HashLock FAILED"
  }
  Write-Host "HashLock PASSED" -ForegroundColor Green
}

function Regenerate-Hashes {
  Write-Section "Regenerate MANIFEST + HASHLOCK + ID (LOCKPACK root only)"
  $lockDir = Join-Path $RepoRoot "LOCKPACK"
  $files = Get-ChildItem -Path $lockDir -File | Sort-Object Name

  $manifest = [ordered]@{ generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); files = @() }
  foreach($f in $files){
    $manifest.files += [ordered]@{ path=$f.Name; sha256=(Sha256File $f.FullName); bytes=$f.Length }
  }

  $manifestPath = Join-Path $lockDir "MANIFEST.json"
  ($manifest | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $manifestPath

  $id = (Get-FileHash -Algorithm SHA256 -Path $manifestPath).Hash.ToLower()
  $id | Set-Content -Encoding UTF8 (Join-Path $lockDir "LOCKPACK_ID.txt")

  $files2 = Get-ChildItem -Path $lockDir -File | Sort-Object Name
  $lines = @()
  foreach($f in $files2){ $lines += ("{0}  {1}" -f (Sha256File $f.FullName), $f.Name) }
  ($lines -join "`n") + "`n" | Set-Content -Encoding UTF8 (Join-Path $lockDir "HASHLOCK.sha256")

  Write-Host "Regenerated. Next: git add LOCKPACK && git commit" -ForegroundColor Yellow
}

function Sync-RepoFiles {
  Write-Section "SyncRepo (CODEOWNERS bootstrap)"
  $lockDir = Join-Path $RepoRoot "LOCKPACK"
  $sample = Join-Path $lockDir "CODEOWNERS.sample"
  $dst = Join-Path $RepoRoot "CODEOWNERS"

  if(!(Test-Path $sample)){ throw "Missing $sample (create it first)" }
  if(!(Test-Path $dst)){
    Copy-Item $sample $dst -Force
    Write-Host "Created CODEOWNERS at repo root. Update owners then commit." -ForegroundColor Yellow
  } else {
    Write-Host "CODEOWNERS exists; not overwriting." -ForegroundColor Green
  }
}

function Resume-Test {
  Write-Section "ResumeTest"
  Verify-HashLock
  $idFile = Join-Path (Join-Path $RepoRoot "LOCKPACK") "LOCKPACK_ID.txt"
  if(Test-Path $idFile){
    Write-Host ("LOCKPACK ID: " + (Get-Content $idFile -Raw).Trim()) -ForegroundColor Green
  } else {
    Write-Host "LOCKPACK_ID.txt missing (run RegenerateHashes first)" -ForegroundColor Yellow
  }
  Write-Host "New chat: upload ZIP (single LOCKPACK folder) + paste PROMPT_RESUME.txt" -ForegroundColor Cyan
}

function Show-Help { Write-Host "Modes: Verify | SyncRepo | RegenerateHashes | ResumeTest" }

switch($Mode){
  "Verify" { Verify-HashLock }
  "SyncRepo" { Verify-HashLock; Sync-RepoFiles }
  "RegenerateHashes" { Regenerate-Hashes }
  "ResumeTest" { Resume-Test }
  default { Show-Help }
}
