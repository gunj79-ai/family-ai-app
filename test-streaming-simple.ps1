Write-Host "Phase 6A Streaming Test"

$token = (Invoke-RestMethod http://localhost:3001/api/auth/login -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}').token
Write-Host "Token: OK"

$chat = (Invoke-RestMethod http://localhost:3001/api/chats -Method POST -ContentType 'application/json' -Headers @{Authorization="Bearer $token"} -Body '{"title":"Test"}')
Write-Host "Chat: $($chat.id)"

Write-Host "Streaming message..."
$resp = Invoke-WebRequest "http://localhost:3001/api/chats/$($chat.id)/messages" -Method POST -ContentType 'application/json' -Headers @{Authorization="Bearer $token"} -Body '{"content":"Say: STREAM_OK"}' -TimeoutSec 30 -UseBasicParsing

Write-Host "Status: $($resp.StatusCode)"
Write-Host "Content-Type: $($resp.Headers['Content-Type'])"
Write-Host ""
Write-Host "Response (first 500 chars):"
Write-Host $resp.Content.Substring(0, [Math]::Min(500, $resp.Content.Length))
