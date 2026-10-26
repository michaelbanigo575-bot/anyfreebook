# Captures the raw JSON of one healthy and one partial live API response,
# so the post quotes real bytes rather than a hand-written example.
$ErrorActionPreference = 'Continue'
$healthy = Invoke-WebRequest -Uri 'https://anyfreebook.com/api/v1/search?q=python&limit=2' -UseBasicParsing -TimeoutSec 60
$partial = Invoke-WebRequest -Uri 'https://anyfreebook.com/api/v1/search?q=AND&limit=2' -UseBasicParsing -TimeoutSec 60

$h = $healthy.Content | ConvertFrom-Json
$p = $partial.Content | ConvertFrom-Json

# The results array is elided in the post; keep everything else exactly as served.
function Strip-Results($obj) {
  $copy = [ordered]@{}
  foreach ($prop in $obj.PSObject.Properties) {
    if ($prop.Name -eq 'results') { $copy[$prop.Name] = @('...') } else { $copy[$prop.Name] = $prop.Value }
  }
  return $copy
}

'=== HEALTHY (partial: false) ==='
(Strip-Results $h) | ConvertTo-Json -Depth 5
''
'=== PARTIAL (partial: true) ==='
(Strip-Results $p) | ConvertTo-Json -Depth 5
