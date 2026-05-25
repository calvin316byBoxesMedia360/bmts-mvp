@echo off
cd /d "%~dp0app"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
set "BMTS_PYTHON=%CD%\.venv\Scripts\python.exe"
set "BMTS_OCR_CACHE_HOME=%CD%\.paddlex_runtime"
set "BMTS_OCR_HOME=%CD%\.home_runtime"
set "BMTS_OCR_APP_CACHE=%CD%\.cache_runtime"
set "PADDLE_PDX_CACHE_HOME=%CD%\.paddlex_runtime"
set "HF_HOME=%CD%\.cache_runtime\huggingface"
set "MODELSCOPE_CACHE=%CD%\.cache_runtime\modelscope"
set "HOME=%CD%\.home_runtime"
set "USERPROFILE=%CD%\.home_runtime"
set "FLAGS_use_mkldnn=0"
set "FLAGS_use_onednn=0"
npm start
pause
