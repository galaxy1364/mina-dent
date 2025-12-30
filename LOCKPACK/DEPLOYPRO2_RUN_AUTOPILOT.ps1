# LOCKPACK\DEPLOYPRO2_RUN_AUTOPILOT.ps1
$ErrorActionPreference="Stop"
function OK($m){Write-Host "PASS  $m" -ForegroundColor Green}
function NO($m){Write-Host "FAIL  $m" -ForegroundColor Red}
function IN($m){Write-Host "INFO  $m" -ForegroundColor Cyan}

# ---- CONFIG (قفل/ثابت) ----
$O="galaxy1364"
$R="mina-dent"
$ENVNAME="DeployPro2"
$WORKFLOW_FILE="ci.yml"
$REF="main"

$repoRoot=(git rev-parse --show-toplevel 2>$null); if(!$repoRoot){throw "FAIL not in repo"}
Set-Location $repoRoot
OK "repo_root=$repoRoot"

$tok=gh auth token
if(!$tok){ throw "FAIL no gh token" }
OK "token=present"

# ---- dispatch ----
$dispatchUrl="https://api.github.com/repos/$O/$R/actions/workflows/$WORKFLOW_FILE/dispatches"
$body=@{ ref=$REF; inputs=@{ environment=$ENVNAME } } | ConvertTo-Json -Depth 10

IN "dispatching workflow=$WORKFLOW_FILE ref=$REF env=$ENVNAME"
curl.exe -sS -L -X POST `
  -H ("Authorization: Bearer {0}" -f $tok) `
  -H "Accept: application/vnd.github+json" `
  -H "Content-Type: application/json" `
  -d $body $dispatchUrl | Out-Null
OK "dispatch_sent"

# ---- detect run (timeout قطعی) ----
$deadline=(Get-Date).AddMinutes(10)
$runId=$null; $runUrlHtml=$null
while((Get-Date) -lt $deadline -and !$runId){
  $runsUrl="https://api.github.com/repos/$O/$R/actions/workflows/$WORKFLOW_FILE/runs?branch=$REF&per_page=10"
  $runs=(curl.exe -sS -L -H ("Authorization: Bearer {0}" -f $tok) -H "Accept: application/vnd.github+json" $runsUrl) | ConvertFrom-Json
  $cand=$runs.workflow_runs | Where-Object { $_.event -eq "workflow_dispatch" } | Select-Object -First 1
  if($cand){
    $runId=$cand.id
    $runUrlHtml=$cand.html_url
    OK "run_detected=$runId"
    OK "run_url=$runUrlHtml"
    break
  }
  Start-Sleep -Seconds 5
}
if(!$runId){ throw "FAIL cannot detect dispatched run_id (timeout)" }

# ---- check pending deployments (no bypass: if cannot approve => ABORTED) ----
$pdUrl="https://api.github.com/repos/$O/$R/actions/runs/$runId/pending_deployments"
$pd=(curl.exe -sS -L -H ("Authorization: Bearer {0}" -f $tok) -H "Accept: application/vnd.github+json" $pdUrl) | ConvertFrom-Json

$approvalNeeded=$false
if($pd -and $pd.Count -gt 0){
  $targets=$pd | Where-Object { $_.environment -and $_.environment.name -eq $ENVNAME }
  if($targets){
    $approvalNeeded=$true
    $can=$targets[0].current_user_can_approve
    IN "pending_for=$ENVNAME can_approve=$can"
    if($can -ne $true){
      IN "ABORTED: approval required by required reviewer (self-review prevented / cannot approve with this token)"
      # Evidence stub for ABORTED (still deterministic)
      $archive=Join-Path $repoRoot "_LOCKPACK_ARCHIVE"
      New-Item -ItemType Directory -Force $archive | Out-Null
      $rid="$runId.deploypro2.ABORTED"
      $runDir=Join-Path $archive ("RUN_{0}" -f $rid)
      $srcDir=Join-Path $runDir ("LOCKPACK_EVIDENCE_{0}" -f $rid)
      $zip=Join-Path $runDir ("LOCKPACK_EVIDENCE_{0}.zip" -f $rid)
      Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
      New-Item -ItemType Directory -Force "$srcDir\pack\evidence","$srcDir\pack\snapshot\LOCKPACK" | Out-Null

      $receipt=Join-Path $srcDir "RECEIPT.txt"
      @"
LOCKPACK RECEIPT (DeployPro2) — ABORTED (No bypass)
RID: $rid
RUN_ID: $runId
UTC: $((Get-Date).ToUniversalTime().ToString('s'))Z
REPO: $O/$R
ENV: $ENVNAME
RUN_URL: $runUrlHtml
REF: $REF
REASON: Required reviewer approval needed; token cannot approve.
"@ | Set-Content -Encoding UTF8 $receipt

      Compress-Archive -Force $srcDir $zip
      Write-Host "ABORTED  DeployPro2 requires human approval (no bypass). Evidence ZIP: $zip" -ForegroundColor Yellow
      exit 2
    }
  }
}

# ---- wait run completion (timeout قطعی) ----
$deadline=(Get-Date).AddMinutes(20)
do{
  $runApi="https://api.github.com/repos/$O/$R/actions/runs/$runId"
  $run=(curl.exe -sS -L -H ("Authorization: Bearer {0}" -f $tok) -H "Accept: application/vnd.github+json" $runApi) | ConvertFrom-Json
  IN "run_status=$($run.status) conclusion=$($run.conclusion)"
  if($run.status -eq "completed"){ break }
  Start-Sleep -Seconds 10
} while((Get-Date) -lt $deadline)

if($run.status -ne "completed"){ throw "FAIL run did not complete (timeout)" }
if($run.conclusion -ne "success"){ throw "FAIL run conclusion=$($run.conclusion)" }
OK "RUN success (runId=$runId)"

# ---- Build Evidence Pack from run artifacts (QG evidence+snapshot) ----
$archive=Join-Path $repoRoot "_LOCKPACK_ARCHIVE"
New-Item -ItemType Directory -Force $archive | Out-Null

$rid="$runId.deploypro2"
$runDir=Join-Path $archive ("RUN_{0}" -f $rid)
$srcDir=Join-Path $runDir ("LOCKPACK_EVIDENCE_{0}" -f $rid)
$zip=Join-Path $runDir ("LOCKPACK_EVIDENCE_{0}.zip" -f $rid)

Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$srcDir\pack\evidence","$srcDir\pack\snapshot\LOCKPACK" | Out-Null

# download artifacts
$artUrl="https://api.github.com/repos/$O/$R/actions/runs/$runId/artifacts?per_page=100"
$arts=(curl.exe -sS -L -H ("Authorization: Bearer {0}" -f $tok) -H "Accept: application/vnd.github+json" $artUrl) | ConvertFrom-Json
if(!$arts -or !$arts.artifacts -or $arts.artifacts.Count -eq 0){ throw "FAIL no artifacts for runId=$runId" }
OK ("artifacts_count=" + $arts.artifacts.Count)

$tmp=Join-Path $runDir "_ARTIFACTS"
$extract=Join-Path $runDir "_EXTRACT"
New-Item -ItemType Directory -Force $tmp,$extract | Out-Null

foreach($a in $arts.artifacts){
  $dlUrl=$a.archive_download_url
  $outZip=Join-Path $tmp ("artifact_{0}.zip" -f $a.id)
  IN ("downloading_artifact id={0} name={1}" -f $a.id,$a.name)
  curl.exe -sS -L -H ("Authorization: Bearer {0}" -f $tok) -H "Accept: application/vnd.github+json" $dlUrl -o $outZip
  if(!(Test-Path $outZip)){ throw "FAIL download artifact id=$($a.id)" }
  $d=Join-Path $extract ("artifact_{0}" -f $a.id)
  New-Item -ItemType Directory -Force $d | Out-Null
  Expand-Archive -Force $outZip $d
}

$qgs=Get-ChildItem -Recurse -Path $extract -Filter "QG.json" -ErrorAction SilentlyContinue
if(!$qgs){ throw "FAIL no QG.json found inside artifacts" }

$qgEvidence = $qgs | Where-Object { (Get-Content $_.FullName -Raw) -match '"gates"\s*:\s*{' } | Select-Object -First 1
$qgSnapshot = $qgs | Where-Object { (Get-Content $_.FullName -Raw) -match '"lockpack"\s*:\s*{' } | Select-Object -First 1
if(!$qgEvidence){ throw "FAIL cannot locate evidence QG (with gates) in artifacts" }
if(!$qgSnapshot){ throw "FAIL cannot locate snapshot QG (with lockpack) in artifacts" }
OK "found_evidence_QG=$($qgEvidence.FullName)"
OK "found_snapshot_QG=$($qgSnapshot.FullName)"

Copy-Item -Force $qgEvidence.FullName (Join-Path $srcDir "pack\evidence\QG.json")
Copy-Item -Force $qgSnapshot.FullName (Join-Path $srcDir "pack\snapshot\LOCKPACK\QG.json")
OK "QG copied"

# receipt
$receipt=Join-Path $srcDir "RECEIPT.txt"
@"
LOCKPACK RECEIPT (DeployPro2)
RID: $rid
RUN_ID: $runId
UTC: $((Get-Date).ToUniversalTime().ToString('s'))Z
REPO: $O/$R
ENV: $ENVNAME
RUN_URL: $runUrlHtml
HEAD: $($run.head_sha)
REF: $REF
"@ | Set-Content -Encoding UTF8 $receipt

# hashlock
$hashPath=Join-Path $srcDir "HASHES.txt"
Get-FileHash -Algorithm SHA256 (Join-Path $srcDir "pack\evidence\QG.json"),(Join-Path $srcDir "pack\snapshot\LOCKPACK\QG.json"),$receipt |
  Format-Table | Out-File $hashPath -Encoding utf8
OK "HASHES written=$hashPath"

# zip
Compress-Archive -Force $srcDir $zip
OK "evidence_zip=$zip"

# pin latest
New-Item -ItemType Directory -Force (Join-Path $repoRoot "LOCKPACK") | Out-Null
$pin=Join-Path $repoRoot "LOCKPACK\LATEST_DEPLOYPRO2.txt"
@(
"RID=$rid"
"RUN_ID=$runId"
"ENV=$ENVNAME"
"ZIP=$zip"
"DIR=$srcDir"
"UTC=$((Get-Date).ToUniversalTime().ToString('s'))Z"
) -join "`r`n" | Set-Content -Encoding UTF8 $pin
OK "pinned=$pin"

# final 3 lines
Write-Host ("PASS  DEPLOYPRO2 PASS | runId={0}" -f $runId) -ForegroundColor Green
Write-Host ("PASS  DEPLOYPRO2 ZIP={0}" -f $zip) -ForegroundColor Green
Write-Host ("PASS  DEPLOYPRO2 QG={0}" -f (Join-Path $srcDir "pack\evidence\QG.json")) -ForegroundColor Green
