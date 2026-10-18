# Encrypts this project's secrets into an AES-256 encrypted file.
#
# WHY: .env.local is gitignored on purpose — committing it would publish the
# Supabase service-role key to a PUBLIC repo. But that means the ONLY copy of
# your secrets lives on this one PC. If it dies, you lose the Supabase service
# key, NextAuth secret, Gemini key and admin allowlist, and cannot rebuild or
# redeploy the site.
#
# This produces anyfreebook-secrets.enc — safe to store in a password manager,
# an encrypted drive, or a PRIVATE repo. It is useless without the password.
#
# USAGE:  powershell -ExecutionPolicy Bypass -File scripts\backup-secrets.ps1
# RESTORE: powershell -ExecutionPolicy Bypass -File scripts\restore-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$sources = @('.env.local', '.vercel\project.json')
$missing = $sources | Where-Object { -not (Test-Path (Join-Path $root $_)) }
if ($missing) { Write-Warning "Skipping not found: $($missing -join ', ')" }
$present = $sources | Where-Object { Test-Path (Join-Path $root $_) }
if (-not $present) { throw 'Nothing to back up.' }

Write-Host ''
Write-Host 'Files to encrypt:' -ForegroundColor Cyan
$present | ForEach-Object { Write-Host "  $_" }
Write-Host ''

# Prompted here so the passphrase is never passed on a command line (where it
# would land in shell history) and never travels through this agent.
$pass = Read-Host 'Choose a passphrase (store it in your password manager)' -AsSecureString
if ($pass.Length -lt 12) { throw 'Passphrase must be at least 12 characters.' }

$salt = New-Object byte[] 16
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)

# PBKDF2-HMAC-SHA256, 210k iterations. Derives a 256-bit key + 128-bit IV.
$derive = New-Object System.Security.Cryptography.Rfc2898DeriveBytes(
  $pass,
  $salt,
  210000,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.KeySize = 256; $aes.Key = $derive.GetBytes(32); $aes.IV = $derive.GetBytes(16)

$plain = New-Object System.Text.StringBuilder
$plain.AppendLine('# ANYFREEBOOK secrets backup')
$plain.AppendLine("# created: $(Get-Date -Format o)")
foreach ($s in $present) {
  $plain.AppendLine("===== $s =====")
  $plain.AppendLine((Get-Content -LiteralPath (Join-Path $root $s) -Raw))
}

$enc = $aes.CreateEncryptor().TransformFinalBlock(
  [System.Text.Encoding]::UTF8.GetBytes($plain.ToString()), 0, ([System.Text.Encoding]::UTF8.GetByteCount($plain.ToString()))
)

$out = Join-Path $root 'anyfreebook-secrets.enc'
[System.IO.File]::WriteAllBytes($out, [byte[]]($salt + $aes.IV + $enc))

$aes.Dispose(); $derive.Dispose()
# Clear plaintext from memory before exiting.
$plain.Clear() | Out-Null

Write-Host ''
Write-Host "Encrypted -> $out" -ForegroundColor Green
Write-Host ''
Write-Host 'NOW: move that file off this PC (password manager attachment,'
Write-Host 'encrypted cloud drive, or a PRIVATE repo). Keep it out of the public repo.'
Write-Host ''
Write-Host 'Verify by decrypting with scripts\restore-secrets.ps1 before relying on it.'