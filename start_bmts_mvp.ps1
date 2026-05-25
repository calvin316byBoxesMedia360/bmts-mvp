Set-Location -LiteralPath "$PSScriptRoot\app"
$existing = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $existing | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
$env:BMTS_PYTHON = Join-Path (Get-Location) ".venv\Scripts\python.exe"
$env:BMTS_OCR_CACHE_HOME = Join-Path (Get-Location) ".paddlex_runtime"
$env:BMTS_OCR_HOME = Join-Path (Get-Location) ".home_runtime"
$env:BMTS_OCR_APP_CACHE = Join-Path (Get-Location) ".cache_runtime"
$env:PADDLE_PDX_CACHE_HOME = Join-Path (Get-Location) ".paddlex_runtime"
$env:HF_HOME = Join-Path (Get-Location) ".cache_runtime\huggingface"
$env:MODELSCOPE_CACHE = Join-Path (Get-Location) ".cache_runtime\modelscope"
$env:HOME = Join-Path (Get-Location) ".home_runtime"
$env:USERPROFILE = Join-Path (Get-Location) ".home_runtime"
$env:FLAGS_use_mkldnn = "0"
$env:FLAGS_use_onednn = "0"
npm start
