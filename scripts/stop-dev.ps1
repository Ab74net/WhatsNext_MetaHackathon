# Stops the dev servers (Next on :3000, FastAPI on :8000) and their child processes.
# Windows doesn't always kill children when the terminal is closed, which leaves an old
# server holding the port and serving stale code.
$ports = 3000, 8000, 8011
$pids = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
# taskkill /T below also kills each uvicorn's worker child.
$workers = Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -match "uvicorn app\.main:app|watchfiles.*uvicorn" } |
    Select-Object -ExpandProperty ProcessId
foreach ($id in @($pids) + @($workers) | Sort-Object -Unique) {
    if ($id) { taskkill /PID $id /T /F 2>$null | Out-Null }
}
Start-Sleep -Milliseconds 500
$left = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue
if ($left) { Write-Output "Still in use: $($left.LocalPort -join ', ')" } else { Write-Output "Dev servers stopped." }
