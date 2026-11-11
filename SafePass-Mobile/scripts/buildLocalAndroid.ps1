param([switch]$Install)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$env:SAFEPASS_GRADLE_BUILD_ROOT = Join-Path $env:LOCALAPPDATA 'SafePassGradle/build'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:5000/api'
$env:EXPO_PUBLIC_API_MODE = 'development'

New-Item -ItemType Directory -Force -Path $env:SAFEPASS_GRADLE_BUILD_ROOT | Out-Null

Push-Location (Join-Path $projectDirectory 'android')
try {
    & .\gradlew.bat :app:assembleFullDebug --console=plain --max-workers=1 --no-parallel '-Pkotlin.incremental=false' --init-script (Join-Path $PSScriptRoot 'localBuildDirs.gradle')
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$apk = Get-ChildItem -LiteralPath $env:SAFEPASS_GRADLE_BUILD_ROOT -Recurse -File -Filter 'app-full-debug.apk' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $apk) { throw 'Gradle finished but the local debug APK was not found.' }
Write-Output "Android debug APK ready: $($apk.FullName)"

if ($Install) {
    $adb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
    if (-not (Test-Path -LiteralPath $adb)) { throw "Android Debug Bridge not found: $adb" }
    & $adb reverse tcp:5000 tcp:5000
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $adb install -r $apk.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $adb shell am start -n 'com.anonymous.SafePassMobile/.MainActivity'
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
