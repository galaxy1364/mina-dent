param(
  [Parameter(Mandatory=$true)][string]$ScriptPath,
  [switch]$KeepOpen,
  [switch]$ExitOnFinish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  if ($KeepOpen) {
    & $ScriptPath -KeepOpen
  } else {
    & $ScriptPath
  }
} finally {
  if ($KeepOpen) { Read-Host "Press ENTER to close (runner)" | Out-Null }
  if ($ExitOnFinish) { exit $global:LASTEXITCODE }
}