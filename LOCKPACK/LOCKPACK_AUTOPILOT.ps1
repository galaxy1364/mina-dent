# LOCKPACK\LOCKPACK_AUTOPILOT.ps1
$ErrorActionPreference="Stop"
function OK($m){Write-Host "PASS  $m" -ForegroundColor Green}
function NO($m){Write-Host "FAIL  $m" -ForegroundColor Red}
function IN($m){Write-Host "INFO  $m" -ForegroundColor Cyan}

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if(!$repoRoot){ throw "FAIL not inside a git repo" }
Set-Location $repoRoot
OK "repo_root=$repoRoot"

$pin = Join-Path $repoRoot "LOCKPACK\LATEST.txt"
if(!(Test-Path $pin)){ throw "FAIL missing LOCKPACK\LATEST.txt" }

$kv=@{}
Get-Content $pin | % { if($_ -match '^\s*([^=]+)=(.*)\s*$'){ $kv[$matches[1].Trim()]=$matches[2].Trim() } }
foreach($k in @("RID","ZIP","DIR")){ if(!$kv[$k]){ throw "FAIL LATEST missing key=$k" } }
$rid=$kv["RID"]; $zip=$kv["ZIP"]; $dir=$kv["DIR"]
OK "RID=$rid"; OK "ZIP=$zip"; OK "DIR=$dir"

if(!(Test-Path $dir)){ New-Item -ItemType Directory -Force $dir | Out-Null; IN "DIR created=$dir" }

# Expand only if needed
if(Test-Path $zip){
  if(!(Test-Path (Join-Path $dir "pack"))){
    IN "expanding ZIP -> DIR"
    Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force $dir | Out-Null
    Expand-Archive -Force $zip $dir
    OK "expanded=$dir"
  } else { OK "zip_present(no_expand_needed)" }
} else { IN "ZIP missing -> will recreate" }

# Locate QGs by content
$qgs = Get-ChildItem -Recurse -Path $dir -Filter "QG.json" -ErrorAction SilentlyContinue
if(!$qgs){ throw "FAIL no QG.json anywhere under DIR=$dir" }
$qgEvidence = $qgs | ?{ (Get-Content $_.FullName -Raw) -match '"gates"\s*:\s*{' } | select -First 1
$qgSnapshot = $qgs | ?{ (Get-Content $_.FullName -Raw) -match '"lockpack"\s*:\s*{' } | select -First 1
if(!$qgEvidence){ throw "FAIL cannot locate evidence QG (with gates)" }
if(!$qgSnapshot){ throw "FAIL cannot locate snapshot QG (with lockpack)" }
OK "found_evidence_QG=$($qgEvidence.FullName)"
OK "found_snapshot_QG=$($qgSnapshot.FullName)"

# Standardize tree
New-Item -ItemType Directory -Force (Join-Path $dir "pack\evidence"),(Join-Path $dir "pack\snapshot\LOCKPACK") | Out-Null
Copy-Item -Force $qgEvidence.FullName (Join-Path $dir "pack\evidence\QG.json")
Copy-Item -Force $qgSnapshot.FullName (Join-Path $dir "pack\snapshot\LOCKPACK\QG.json")
OK "standard_tree_ok"

# Receipt always refreshed
$receipt = Join-Path $dir "RECEIPT.txt"
$qg1 = Join-Path $dir "pack\evidence\QG.json"
$qg2 = Join-Path $dir "pack\snapshot\LOCKPACK\QG.json"

@"
LOCKPACK RECEIPT
RUN_ID: $rid
UTC: $((Get-Date).ToUniversalTime().ToString('s'))Z
EVIDENCE_DIR: $dir
EVIDENCE_ZIP: $zip
QG: $qg1
SNAPSHOT_QG: $qg2
HEAD: $(git rev-parse HEAD)
BRANCH: $(git rev-parse --abbrev-ref HEAD)
"@ | Set-Content -Encoding UTF8 $receipt
OK "receipt_refreshed"

foreach($p in @($receipt,$qg1,$qg2)){ if(Test-Path $p){ OK "key_present=$p" } else { throw "FAIL key_missing=$p" } }

# Zip refresh
if(Test-Path $zip){ Remove-Item -Force $zip }
Compress-Archive -Force $dir $zip
OK "zip_refreshed=$zip"

# NEXT_STEP short token
$nextPath = Join-Path $repoRoot "NEXT_STEP.txt"
@(
"RID=$rid"
"ZIP=$zip"
"DIR=$dir"
"RECEIPT=$receipt"
"QG=$qg1"
"SNAPSHOT_QG=$qg2"
"HEAD=$(git rev-parse HEAD)"
"BRANCH=$(git rev-parse --abbrev-ref HEAD)"
"UTC=$((Get-Date).ToUniversalTime().ToString('s'))Z"
) -join "`r`n" | Set-Content -Encoding UTF8 $nextPath

OK "wrote=NEXT_STEP.txt"
Get-Content $nextPath | % { Write-Host "PASS  $_" -ForegroundColor Green }
