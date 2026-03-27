$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = Get-ChildItem -Path $dir -Filter '*.html'
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    # Fix Home nav link to point to root
    $c = $c -replace 'href="index\.html"', 'href="/"'
    # Fix CTA links that still use ../index.html
    $c = $c -replace 'href="../index\.html"', 'href="/app"'
    Set-Content $f.FullName $c -NoNewline -Encoding UTF8
    Write-Host "Fixed: $($f.Name)"
}
Write-Host "Done"
