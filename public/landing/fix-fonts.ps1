$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = Get-ChildItem -Path $dir -Filter '*.html'

$newFont = @'
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@800;900&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@800;900&display=swap" /></noscript>
'@

foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    # Replace any existing font block (preconnect + link to googleapis)
    $c = $c -replace '(?s)\s*<link rel="preconnect" href="https://fonts\.googleapis[^"]*"[^/]*/>\s*<link rel="preconnect" href="https://fonts\.gstatic[^"]*"[^/]*/>\s*<link[^>]+googleapis\.com/css2[^>]+>', $newFont
    # Also handle already-preloaded pattern (idempotent)
    $c = $c -replace '(?s)\s*<link rel="preconnect" href="https://fonts\.googleapis[^"]*"[^/]*/>\s*<link rel="preconnect" href="https://fonts\.gstatic[^"]*"[^/]*/>\s*<link rel="preload"[^>]+>\s*<noscript>[^<]*</noscript>', $newFont
    Set-Content $f.FullName $c -NoNewline -Encoding UTF8
    Write-Host "Updated: $($f.Name)"
}
Write-Host "Done"
