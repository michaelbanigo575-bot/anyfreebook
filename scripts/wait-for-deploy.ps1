# Waits for the fix to reach production, then prints the real response.
# Old behaviour: failedSources = ["LibriVox"] (a 404 no-match was called a failure).
# New behaviour: LibriVox answers with a real zero and lands in sources.
$ErrorActionPreference = 'Continue'
$deadline = (Get-Date).AddMinutes(25)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-RestMethod -Uri 'https://anyfreebook.com/api/v1/search?q=python&limit=1' -TimeoutSec 30
    $hasLv = $r.sources.PSObject.Properties.Name -contains 'LibriVox'
    $failed = ($r.failedSources -join ',')
    if ($hasLv -and $failed -eq '') {
      "DEPLOYED"
      "total=$($r.total)"
      "failed='$failed'"
      "sources=" + ($r.sources | ConvertTo-Json -Compress)
      exit 0
    }
    "waiting... failed='$failed' librivoxInSources=$hasLv"
  } catch {
    "waiting... $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 30
}
"TIMEOUT - deploy not detected"
exit 1
