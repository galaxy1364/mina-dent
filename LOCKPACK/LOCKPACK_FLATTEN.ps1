param([string]$LockpackPath = ".\LOCKPACK")
$ErrorActionPreference="Stop"
function Write-Section($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Sha256File([string]$p){ (Get-FileHash -Algorithm SHA256 -Path $p).Hash.ToLower() }

$LockpackPath = (Resolve-Path $LockpackPath).Path
Write-Section "Flatten LOCKPACK to single folder (no subfolders)"

$regenNames=@("MANIFEST.json","HASHLOCK.sha256","LOCKPACK_ID.txt")
$all = Get-ChildItem -Path $LockpackPath -Recurse -File
$nested = $all | Where-Object { $_.DirectoryName -ne $LockpackPath }

foreach($f in $nested){
  $rel = $f.FullName.Substring($LockpackPath.Length).TrimStart("\","/")
  $flat = ($rel -replace "[\\/]+","__")  # EVIDENCE\ci\run.png -> EVIDENCE__ci__run.png
  if($regenNames -contains $f.Name){ $flat = "LEGACY__" + $flat }

  $target = Join-Path $LockpackPath $flat
  if(Test-Path $target){
    $h = (Sha256File $f.FullName).Substring(0,8)
    $base=[IO.Path]::GetFileNameWithoutExtension($flat)
    $ext=[IO.Path]::GetExtension($flat)
    $target = Join-Path $LockpackPath ($base + "__" + $h + $ext)
  }
  Move-Item -LiteralPath $f.FullName -Destination $target
}

Write-Section "Remove empty folders"
Get-ChildItem -Path $LockpackPath -Recurse -Directory | Sort-Object FullName -Descending | ForEach-Object {
  if(-not (Get-ChildItem -Path $_.FullName -Force)){ Remove-Item -LiteralPath $_.FullName -Force }
}

Write-Section "Regenerate MANIFEST/HASHLOCK/ID (root only)"
$files = Get-ChildItem -Path $LockpackPath -File | Sort-Object Name

$manifest=[ordered]@{ generated_at=(Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); files=@() }
foreach($f in $files){ $manifest.files += [ordered]@{ path=$f.Name; sha256=(Sha256File $f.FullName); bytes=$f.Length } }
$manifestPath = Join-Path $LockpackPath "MANIFEST.json"
($manifest | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $manifestPath

$id = (Get-FileHash -Algorithm SHA256 -Path $manifestPath).Hash.ToLower()
$id | Set-Content -Encoding UTF8 (Join-Path $LockpackPath "LOCKPACK_ID.txt")

$files2 = Get-ChildItem -Path $LockpackPath -File | Sort-Object Name
$lines=@()
foreach($f in $files2){ $lines += ("{0}  {1}" -f (Sha256File $f.FullName), $f.Name) }
($lines -join "`n") + "`n" | Set-Content -Encoding UTF8 (Join-Path $LockpackPath "HASHLOCK.sha256")

Write-Host "Flatten done. Next: git add LOCKPACK && git commit" -ForegroundColor Yellow
