$ErrorActionPreference = 'Stop'
$env:EXPO_OFFLINE = '1'
$env:CI = '1'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:5000/api'
$env:EXPO_PUBLIC_API_MODE = 'development'
$env:EXPO_PUBLIC_E2E_LOCAL_ONLY = 'true'

Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
npm run web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
