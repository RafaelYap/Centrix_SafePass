$ErrorActionPreference = 'Stop'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/safepass_local_test'
$env:NODE_ENV = 'development'

Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
node scripts/seedTestFixtures.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
