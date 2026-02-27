#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory=$true)]
  [string]$TargetUrl,
  [string]$RulesFile = "zap-rules.conf",
  [string]$ReportHtml = "zap-report.html",
  [string]$ReportMd = "zap-report.md"
)

$ErrorActionPreference = "Stop"

if (-not $TargetUrl.StartsWith("http://") -and -not $TargetUrl.StartsWith("https://")) {
  throw "TargetUrl debe iniciar con http:// o https://"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker no esta instalado o no esta en PATH."
}

$pwdPath = (Get-Location).Path

Write-Host "Running OWASP ZAP baseline against $TargetUrl" -ForegroundColor Cyan
Write-Host "Rules: $RulesFile" -ForegroundColor DarkCyan

$cmd = @(
  "run", "--rm",
  "-v", "${pwdPath}:/zap/wrk:rw",
  "ghcr.io/zaproxy/zaproxy:stable",
  "zap-baseline.py",
  "-t", $TargetUrl,
  "-c", "/zap/wrk/$RulesFile",
  "-r", $ReportHtml,
  "-w", $ReportMd,
  "-m", "3",
  "-I"
)

& docker @cmd

Write-Host "DAST terminado." -ForegroundColor Green
Write-Host "Reportes:" -ForegroundColor Green
Write-Host " - $ReportHtml"
Write-Host " - $ReportMd"
