param([string]$MongoExe)

$ErrorActionPreference = 'Stop'

$mongoRoot = Join-Path $env:LOCALAPPDATA 'SafePassMongo'
$dataDir = Join-Path $mongoRoot 'data'
$logPath = Join-Path $mongoRoot 'mongod.log'
$databaseUrl = 'mongodb://127.0.0.1:27017/safepass_local_test'

if (-not $MongoExe) {
    $installed = Get-Command mongod.exe -ErrorAction SilentlyContinue
    if ($installed) { $MongoExe = $installed.Source }
}
if (-not $MongoExe) {
    $candidates = @(
        Get-ChildItem -LiteralPath $mongoRoot -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'bin/mongod.exe' }
        Get-ChildItem -LiteralPath (Join-Path $env:ProgramFiles 'MongoDB/Server') -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'bin/mongod.exe' }
    )
    $MongoExe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $MongoExe -or -not (Test-Path -LiteralPath $MongoExe)) {
    throw 'MongoDB Community Server was not found. Install it or pass -MongoExe with the path to mongod.exe.'
}

if (-not (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue)) {
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
    Start-Process -FilePath $MongoExe -ArgumentList @(
        '--dbpath', "`"$dataDir`"",
        '--bind_ip', '127.0.0.1',
        '--port', '27017',
        '--logpath', "`"$logPath`"",
        '--logappend'
    ) -WindowStyle Hidden | Out-Null

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) { break }
        Start-Sleep -Milliseconds 500
    }
}

if (-not (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue)) {
    throw "Local MongoDB did not start. Check $logPath"
}

$env:MONGODB_URI = $databaseUrl
$env:NODE_ENV = 'development'
$env:FRONTEND_URL = 'http://localhost:19006'
$env:PHONE_OTP_BACKEND_LOG_MODE = 'true'
$env:MAIL_SIMULATION_MODE = 'true'

Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
node server.js
