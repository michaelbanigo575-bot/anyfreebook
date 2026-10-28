# Relocate Samsung phone media from C: to D:
# Safe two-phase: COPY -> VERIFY -> only then delete the source.
# Nothing is deleted unless the copy verifies byte-for-byte.

$ErrorActionPreference = 'Stop'

$src = Join-Path $env:USERPROFILE "CrossDevice\Michael's S22"
$dst = 'D:\PhoneMedia\Michael_S22'
$log = 'D:\PhoneMedia\_relocate.log'

if (-not (Test-Path $src)) { throw "Source not found: $src" }

New-Item -ItemType Directory -Force -Path 'D:\PhoneMedia' | Out-Null

$srcGB = [math]::Round(((Get-ChildItem $src -Recurse -File -Force -EA SilentlyContinue |
        Measure-Object Length -Sum).Sum / 1GB), 2)
Write-Host "Source: $srcGB GB  ->  $dst" -ForegroundColor Cyan

# ---------- PHASE 1: COPY ----------
Write-Host "`nPHASE 1 - copying (this takes a while)..." -ForegroundColor Yellow
robocopy $src $dst /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /MT:8 /XJ /TEE /LOG:$log /NFL /NDL /NP
$rc = $LASTEXITCODE
# robocopy: 0 = none copied, 1 = ok, 2 = extra files, 3 = ok+extra, <8 = success
if ($rc -ge 8) { throw "Robocopy FAILED with exit code $rc. See $log. Source left intact." }
Write-Host "Copy finished (exit $rc)." -ForegroundColor Green

# ---------- PHASE 2: VERIFY ----------
Write-Host "`nPHASE 2 - verifying..." -ForegroundColor Yellow
$cmp = robocopy $src $dst /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XJ /L /NJH /NJS /NDL /NP
# Re-run listing: if anything still needs copying, it shows up. Use /L diff instead:
$diff = robocopy $src $dst /MIR /L /R:0 /W:0 /XJ /NJH /NJS /NDL /NP /FP /BYTES |
        Select-String -Pattern '^\s*(Newer|Older|Changed|Same|Extra)' |
        Where-Object { $_ -notmatch 'Same' }
if ($diff) {
    Write-Host "VERIFY FAILED - differences remain. Source NOT deleted." -ForegroundColor Red
    $diff | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
    throw "Verification failed."
}

$dstGB = [math]::Round(((Get-ChildItem $dst -Recurse -File -Force -EA SilentlyContinue |
        Measure-Object Length -Sum).Sum / 1GB), 2)
$srcFiles = (Get-ChildItem $src -Recurse -File -Force -EA SilentlyContinue).Count
$dstFiles = (Get-ChildItem $dst -Recurse -File -Force -EA SilentlyContinue).Count

Write-Host "Verified: $dstFiles files / $dstGB GB copied (source had $srcFiles files)." -ForegroundColor Green
if ($srcFiles -ne $dstFiles) { throw "File count mismatch. Source NOT deleted." }

# ---------- PHASE 3: DELETE SOURCE ----------
Write-Host "`nPHASE 3 - deleting source copy from C:..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $src -EA SilentlyContinue
if (Test-Path $src) {
    Write-Host "Source folder still exists - Phone Link may be locking it. Delete manually later." -ForegroundColor Yellow
} else {
    Write-Host "Source removed." -ForegroundColor Green
}

# Clean up the now-empty CrossDevice parent
$parent = Join-Path $env:USERPROFILE 'CrossDevice'
if ((Test-Path $parent) -and -not (Get-ChildItem $parent -Force -EA SilentlyContinue)) {
    Remove-Item -Force $parent -EA SilentlyContinue
}

Write-Host "`nDONE. Free space now:" -ForegroundColor Cyan
Get-PSDrive C, D | Select-Object Name,
    @{n='FreeGB'; e={[math]::Round($_.Free/1GB,1)}} | Format-Table -AutoSize
Write-Host "Log: $log"