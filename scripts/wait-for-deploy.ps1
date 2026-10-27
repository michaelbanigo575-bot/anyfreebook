# Waits for the new build to reach production, then reports.
# The download route answers with JSON when it exists and the HTML 404 page when it does not.
$ErrorActionPreference = 'Continue'
$deadline = (Get-Date).AddMinutes(25)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri 'https://anyfreebook.com/api/publications/test-slug-xyz/download?format=epub' -UseBasicParsing -TimeoutSec 45
    $ct = "$($r.Headers['Content-Type'])"
    if ($ct -match 'application/json') {
      "DEPLOYED - the download route answers JSON ($ct)"
      "body: $($r.Content)"
      exit 0
    }
    "waiting... content-type=$ct"
  } catch {
    $resp = $_.Exception.Response
    "waiting... status=$([int]$resp.StatusCode) type=$($resp.ContentType)"
  }
  Start-Sleep -Seconds 30
}
"TIMEOUT"
exit 1
