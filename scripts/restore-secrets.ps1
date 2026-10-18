# Decrypts anyfreebook-secrets.enc back into the working copy.
#
# USAGE:  powershell -ExecutionPolicy Bypass -File scripts\restore-secrets.ps1
#         (writes to scripts\_restored\ — review before copying over the project)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$encFile = Join-Path $root 'anyfreebook-secrets.enc'
if (-not (Test-Path $encFile)) { throw "Not found: $encFile" }

$pass = Read-Host 'Passphrase' -AsSecureString

$blob = [System.IO.File]::ReadAllBytes($encFile)
$salt = $blob[0..15]
$iv = $blob[16..31]
$cipher = $blob[32..($blob.Length - 1)]

$derive = New-Object System.Security.Cryptography.Rfc2898DeriveBytes(
  $pass, $salt, 210000, [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.KeySize = 256; $aes.Key = $derive.GetBytes(32); $aes.IV = $iv

try {
  $plain = $aes.CreateDecryptor().TransformFinalBlock($cipher, 0, $cipher.Length)
} catch {
  throw 'Decryption failed — wrong passphrase, or the file is damaged.'
}
$aes.Dispose(); $derive.Dispose()

$outDir = Join-Path $PSScriptRoot '_restored'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Format: "# header\n# created\n===== path =====\n<content>"
$text = [System.Text.Encoding]::UTF8.GetString($plain)
$current = $null
$buf = New-Object System.Text.StringBuilder
foreach ($line in ($text -split "`r?`n")) {
  if ($line -match '^===== (.+) =====$') {
    if ($current) { [System.IO.File]::WriteAllText((Join-Path $outDir $current), $buf.ToString()) }
    $current = $Matches[1]
    $buf.Clear() | Out-Null
    continue
  }
  if ($current -and $line -notmatch '^#') { [void]$buf.AppendLine($line) }
}
if ($current) { [System.IO.File]::WriteAllText((Join-Path $outDir $current), $buf.ToString()) }

Write-Host ''
Write-Host "Restored to: $outDir" -ForegroundColor Green
Get-ChildItem $outDir | ForEach-Object { Write-Host "  $($_.Name)  ($($_.Length) bytes)" }
Write-Host ''
Write-Host 'To apply: copy each restored file over the project root, e.g.'
Write-Host '  Copy-Item scripts\_restored\.env.local .env.local -Force'
Write-Host ''
Write-Host 'Then delete scripts\_restored once satisfied — it holds plaintext secrets.'