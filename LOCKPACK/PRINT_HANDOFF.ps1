# LOCKPACK/PRINT_HANDOFF.ps1
$ErrorActionPreference="Stop"
function OK($m){Write-Host "PASS  $m" -ForegroundColor Green}
function IN($m){Write-Host "INFO  $m" -ForegroundColor Cyan}

$repoRoot=(git rev-parse --show-toplevel 2>$null)
if(!$repoRoot){ throw "FAIL not in repo" }
Set-Location $repoRoot

$head=(git rev-parse HEAD)
$branch=(git rev-parse --abbrev-ref HEAD)

function ReadKV($path){
  $kv=@{}
  if(Test-Path $path){
    Get-Content $path | % {
      if($_ -match '^\s*([^=]+)=(.*)\s*$'){
        $kv[$matches[1].Trim()]=$matches[2].Trim()
      }
    }
  }
  return $kv
}

$pin1=Join-Path $repoRoot "LOCKPACK\LATEST.txt"
$pin2=Join-Path $repoRoot "LOCKPACK\LATEST_DEPLOYPRO2.txt"

$kv1=ReadKV $pin1
$kv2=ReadKV $pin2

# Print a single paste-friendly block for a new chat
Write-Host ""
Write-Host "==================== LOCKPACK HANDOFF BLOCK ====================" -ForegroundColor Cyan
Write-Host ("UTC={0}Z" -f (Get-Date).ToUniversalTime().ToString('s'))
Write-Host ("REPO_ROOT={0}" -f $repoRoot)
Write-Host ("HEAD={0}" -f $head)
Write-Host ("BRANCH={0}" -f $branch)
Write-Host ("PINS.LATEST={0}" -f $pin1)
Write-Host ("PINS.LATEST_DEPLOYPRO2={0}" -f $pin2)

if(Test-Path $pin1){
  Write-Host "--- LATEST.txt ---"
  Get-Content $pin1
} else {
  Write-Host "LATEST.txt=MISSING"
}

if(Test-Path $pin2){
  Write-Host "--- LATEST_DEPLOYPRO2.txt ---"
  Get-Content $pin2
} else {
  Write-Host "LATEST_DEPLOYPRO2.txt=MISSING"
}

# Helpful resolved paths (if present)
if($kv1["ZIP"]){ Write-Host ("LATEST.ZIP={0}" -f $kv1["ZIP"]) }
if($kv1["DIR"]){ Write-Host ("LATEST.DIR={0}" -f $kv1["DIR"]) }
if($kv2["ZIP"]){ Write-Host ("DEPLOYPRO2.ZIP={0}" -f $kv2["ZIP"]) }
if($kv2["DIR"]){ Write-Host ("DEPLOYPRO2.DIR={0}" -f $kv2["DIR"]) }

Write-Host "NEXT_ACTIONS=" 
Write-Host "1) In new chat, paste this whole block, then say: CONTINUE LOCKPACK MINADENT." 
Write-Host "2) Assistant must respond with Status/Missing Locks/Action Plan/PASS Evidence (no extra questions)."
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

OK "handoff_block_printed"
