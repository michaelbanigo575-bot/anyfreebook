# Polls the live API for a genuine partial response (one where a source failed).
# The post needs a real capture, not a constructed one.
$ErrorActionPreference = 'Continue'
$deadline = (Get-Date).AddMinutes(20)
$n = 0
while ((Get-Date) -lt $deadline) {
  $n++
  try {
    $r = Invoke-RestMethod -Uri 'https://anyfreebook.com/api/v1/search?q=python&limit=2' -TimeoutSec 45
    if ($r.failedSources.Count -gt 0) {
      "PARTIAL CAPTURED on attempt $n"
      "failed=$($r.failedSources -join ', ')"
      "partial=$($r.partial)"
      "total=$($r.total)"
      "sources=" + ($r.sources | ConvertTo-Json -Compress)
      exit 0
    }
    "attempt ${n}: complete (no failures)"
  } catch {
    "attempt ${n}: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 20
}
"NO PARTIAL CAPTURE in $n attempts"
exit 1
