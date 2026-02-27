$ErrorActionPreference = "Stop"

$targets = @("index.html", "script.js", "styles.css")
$checks = @(
  @{ Name = "Inline event handlers"; Pattern = "on[a-z]+\s*=" },
  @{ Name = "Dangerous eval usage"; Pattern = "\beval\s*\(" },
  @{ Name = "Function constructor"; Pattern = "new\s+Function\s*\(" },
  @{ Name = "Direct document.write"; Pattern = "document\.write\s*\(" },
  @{ Name = "Raw innerHTML assignment"; Pattern = "innerHTML\s*=" },
  @{ Name = "Missing noopener on _blank (manual verify)"; Pattern = "target=""_blank""" }
)

Write-Host "SAST Quick Check (OWASP-focused)" -ForegroundColor Cyan
Write-Host "Files: $($targets -join ', ')" -ForegroundColor DarkCyan

foreach ($check in $checks) {
  Write-Host "`n[$($check.Name)]" -ForegroundColor Yellow
  foreach ($file in $targets) {
    if (Test-Path $file) {
      $matches = Select-String -Path $file -Pattern $check.Pattern -AllMatches
      foreach ($m in $matches) {
        Write-Host ("  {0}:{1}: {2}" -f $file, $m.LineNumber, $m.Line.Trim())
      }
    }
  }
}

Write-Host "`nDone. Review findings manually for false positives." -ForegroundColor Green

