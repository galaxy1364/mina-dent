param(
  [string]$PrUrl = "https://github.com/galaxy1364/mina-dent/pull/95",
  [string]$FixBranch = "fix/lockpack-state-validate",
  [int]$TimeoutMinutes = 75,
  [switch]$KeepOpen,
  [switch]$ExitOnFinish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-EvidenceDir {
  $ev = Join-Path $env:TEMP ("LOCKPACK_LOCAL_{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-Item -ItemType Directory -Force -Path $ev | Out-Null
  if (-not (Test-Path $ev)) { throw "STOP: Evidence dir not created: $ev" }
  $ev | Out-File (Join-Path $ev "EVIDENCE_DIR.txt") -Encoding utf8
  return $ev
}

function Exec {
  param(
    [Parameter(Mandatory=$true)][string]$Exe,
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [switch]$Capture
  )

  if (@($Arguments).Count -eq 0) { throw "STOP: Exec called with EMPTY args for '$Exe' (fail-closed)" }

  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $out  = & $Exe @Arguments 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }

  $txt = ($out | ForEach-Object { $_.ToString() }) -join "`n"
  if (-not $Capture -and $txt) {
    $txt -split "`n" | ForEach-Object { if ($_ -ne "") { Write-Host $_ } }
  }
  if ($code -ne 0) {
    throw ("Command failed: {0} {1} (exit={2})`n{3}" -f $Exe, ($Arguments -join ' '), $code, $txt)
  }
  return $txt
}

function Ensure-Tools {
  foreach ($cmd in @("git","gh")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "STOP: Missing dependency: $cmd" }
  }
  Exec gh @("auth","status") | Out-Null
}

function Get-LatestRun([string]$Branch) {
  $j = Exec gh @("run","list","--branch",$Branch,"--limit","1","--json",
    "databaseId,status,conclusion,workflowName,url,createdAt,updatedAt,headSha,headBranch") -Capture
  $o = $j | ConvertFrom-Json
  if (-not $o -or @($o).Count -lt 1) { return $null }
  return @($o)[0]
}

function Wait-RunComplete([string]$Branch,[int]$TimeoutMinutes,[string]$EvDir) {
  $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
  while ($true) {
    if ((Get-Date) -gt $deadline) { throw "ABORTED: Timeout waiting for workflow run completion. Evidence=$EvDir" }
    $run = Get-LatestRun -Branch $Branch
    if ($null -eq $run) { Start-Sleep -Seconds 10; continue }
    ($run | ConvertTo-Json -Depth 20) | Out-File (Join-Path $EvDir "latest.run.poll.json") -Encoding utf8
    if ($run.status -eq "completed") { return $run }
    Start-Sleep -Seconds 15
  }
}

function Save-PRRollup([string]$PrUrl,[string]$EvDir,[string]$Name) {
  Exec gh @("pr","view",$PrUrl,"--json","statusCheckRollup,number,title,headRefName,baseRefName,mergeable,author") -Capture |
    Out-File (Join-Path $EvDir $Name) -Encoding utf8
}

function Save-RunLogs([long]$RunId,[string]$EvDir) {
  Exec gh @("run","view",$RunId,"--json","databaseId,displayTitle,conclusion,status,createdAt,updatedAt,headBranch,headSha,event,workflowName,jobs") -Capture |
    Out-File (Join-Path $EvDir ("run.{0}.meta.json" -f $RunId)) -Encoding utf8

  Exec gh @("run","view",$RunId,"--log-failed") -Capture |
    Out-File (Join-Path $EvDir ("run.{0}.log.failed.txt" -f $RunId)) -Encoding utf8

  Exec gh @("run","view",$RunId,"--log") -Capture |
    Out-File (Join-Path $EvDir ("run.{0}.log.full.txt" -f $RunId)) -Encoding utf8

  try {
    Exec gh @("run","download",$RunId,"-D",(Join-Path $EvDir ("artifacts.{0}" -f $RunId))) | Out-Null
    "ARTIFACT_DOWNLOAD=OK" | Out-File (Join-Path $EvDir ("run.{0}.artifacts.txt" -f $RunId)) -Encoding utf8
  } catch {
    ("ARTIFACT_DOWNLOAD=FAILED`n" + ($_ | Out-String)) | Out-File (Join-Path $EvDir ("run.{0}.artifacts.txt" -f $RunId)) -Encoding utf8
  }
}

function Write-QG([string]$EvDir,[string]$Outcome,[long]$RunId,[string[]]$Bad) {
  $qg = [ordered]@{
    schema = "lockpack.qg.v1"
    generatedAt = (Get-Date).ToString("o")
    prUrl = $PrUrl
    fixBranch = $FixBranch
    runId = $RunId
    outcome = $Outcome
    failedChecks = $Bad
    evidence = @(
      "checks.rollup.before.json",
      "checks.rollup.final.json",
      ("run.{0}.meta.json" -f $RunId),
      ("run.{0}.log.failed.txt" -f $RunId),
      ("run.{0}.log.full.txt" -f $RunId),
      ("run.{0}.artifacts.txt" -f $RunId),
      "latest.run.poll.json",
      "latest.run.id.txt",
      "RESULT.txt"
    )
  }
  ($qg | ConvertTo-Json -Depth 25) | Out-File (Join-Path $EvDir "QG.json") -Encoding utf8
}

# ===== MAIN =====
$ev = New-EvidenceDir
$exitCode = 1
$rid = 0
$bad = @()

try {
  Ensure-Tools
  Save-PRRollup -PrUrl $PrUrl -EvDir $ev -Name "checks.rollup.before.json"

  $run = Wait-RunComplete -Branch $FixBranch -TimeoutMinutes $TimeoutMinutes -EvDir $ev
  $rid = [long]([string]$run.databaseId)
  $rid | Out-File (Join-Path $ev "latest.run.id.txt") -Encoding utf8

  Save-RunLogs -RunId $rid -EvDir $ev
  Save-PRRollup -PrUrl $PrUrl -EvDir $ev -Name "checks.rollup.final.json"

  $roll = Get-Content (Join-Path $ev "checks.rollup.final.json") -Raw | ConvertFrom-Json
  foreach ($c in $roll.statusCheckRollup) {
    if (-not $c.conclusion) { $bad += ($c.name + ":PENDING"); continue }
    if ($c.conclusion -notin @("SUCCESS","NEUTRAL","SKIPPED")) { $bad += ($c.name + ":" + $c.conclusion) }
  }

  $artTxt = Get-Content (Join-Path $ev ("run.{0}.artifacts.txt" -f $rid)) -Raw -ErrorAction SilentlyContinue
  if ($artTxt -match "no valid artifacts found") { $bad += "LOCKPACK_EVIDENCE:MISS" }

  if ($bad.Count -eq 0) {
    $exitCode = 0
    "Status=PROCEED  CHECKS=PASS  Evidence=$ev  RunId=$rid" | Out-File (Join-Path $ev "RESULT.txt") -Encoding utf8
    Write-QG -EvDir $ev -Outcome "PASS" -RunId $rid -Bad @()
    Write-Host ("Status=PROCEED  CHECKS=PASS  Evidence={0}  RunId={1}" -f $ev,$rid)
  } else {
    $exitCode = 1
    ("Status=FIX  Checks not PASS: " + ($bad -join ", ") + "  Evidence=$ev  RunId=$rid") |
      Out-File (Join-Path $ev "RESULT.txt") -Encoding utf8
    Write-QG -EvDir $ev -Outcome "FAIL" -RunId $rid -Bad $bad
    throw ("Status=FIX  Checks not PASS: {0}  Evidence={1}  RunId={2}" -f ($bad -join ", "),$ev,$rid)
  }
}
catch {
  $msg = ($_ | Out-String)
  $msg | Out-File (Join-Path $ev "FINALIZE.exception.txt") -Encoding utf8
  if ($msg -match "^ABORTED:") { $exitCode = 2 }
  if (-not (Test-Path (Join-Path $ev "RESULT.txt"))) {
    ("Status=FIX  Exception  Evidence=$ev  RunId=$rid") | Out-File (Join-Path $ev "RESULT.txt") -Encoding utf8
  }
  throw
}
finally {
  ("EXITCODE={0}" -f $exitCode) | Out-File (Join-Path $ev "FINALIZE.exitcode.txt") -Encoding utf8
  Write-Host ("EVIDENCE_DIR_DONE={0}" -f $ev)

  if ($KeepOpen) { Read-Host "Press ENTER to close (evidence saved)" | Out-Null }

  # IMPORTANT: do NOT close the host unless explicitly requested
  $global:LASTEXITCODE = $exitCode
  if ($ExitOnFinish) { exit $exitCode }
}