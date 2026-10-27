# Waits until the download route serves a real file (not a JSON error),
# then saves it and reports what it is.
$ErrorActionPreference = 'Continue'
$slug = 'the-fall-of-the-tyrant-dy7la'
$deadline = (Get-Date).AddMinutes(25)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "https://anyfreebook.com/api/publications/$slug/download?format=epub" -UseBasicParsing -TimeoutSec 60
    $ct = "$($r.Headers['Content-Type'])"
    if ($ct -notmatch 'json') {
      "DEPLOYED - serving a real file"
      "  status=$($r.StatusCode)"
      "  content-type=$ct"
      "  disposition=$($r.Headers['Content-Disposition'])"
      "  bytes=$($r.RawContentLength)"
      [System.IO.File]::WriteAllBytes('D:\Android\tmp\live-download.epub', $r.Content)
      exit 0
    }
    "waiting... json response: $r.Content"
  } catch {
    $resp = $_.Exception.Response
    $ct = "$($resp.ContentType)"
    if ($ct -notmatch 'json') {
      "DEPLOYED - serving a real file"
      "  status=$([int]$resp.StatusCode) type=$ct"
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $bytes = $sr.BaseStream
      $ms = New-Object System.IO.MemoryStream
      $bytes.CopyTo($ms)
      [System.IO.File]::WriteAllBytes('D:\Android\tmp\live-download.epub', $ms.ToArray())
      "  bytes=$($ms.Length)"
      exit 0
    }
    "waiting... status=$([int]$resp.StatusCode) type=$ct"
  }
  Start-Sleep -Seconds 30
}
"TIMEOUT"
exit 1
