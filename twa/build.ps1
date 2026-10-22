<#
  Builds the signed ANYFREEBOOK Android App Bundle.

  Everything lives on drive D so the machine's C: drive (which is nearly
  full) is never touched.

  Usage:  .\twa\build.ps1
  Output: twa\app-release-bundle.aab
#>
$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$android = 'D:\Android'

$env:JAVA_HOME         = "$android\jdk17\jdk-17.0.20.1+1"
$env:ANDROID_SDK_ROOT  = "$android\sdk"
$env:ANDROID_HOME      = "$android\sdk"
$env:ANDROID_USER_HOME = "$android\android-home"
$env:GRADLE_USER_HOME  = "$android\gradle-home"
$env:TEMP              = "$android\tmp"
$env:TMP               = "$android\tmp"

# The password lives beside the keystore, outside the repo.
$credFile = "$android\keys\anyfreebook-upload-credentials.txt"
if (-not (Test-Path $credFile)) { throw "Missing $credFile — the upload key is gone." }
$pass = (Get-Content $credFile | Where-Object { $_ -match 'password' }) -replace '^Store/key password:\s*', ''
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $pass
$env:BUBBLEWRAP_KEY_PASSWORD      = $pass

Set-Location $root
& "$root\node_modules\.bin\bubblewrap.cmd" build --manifest twa-manifest.json
if ($LASTEXITCODE -ne 0) { throw "Bubblewrap build failed with exit code $LASTEXITCODE" }

Write-Output ''
Write-Output "Built: $root\app-release-bundle.aab"
Get-Item "$root\app-release-bundle.aab" | Select-Object Name, Length, LastWriteTime
