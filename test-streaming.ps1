Write-Host "=== Phase 6A Midpoint Streaming Test ===" -ForegroundColor Green
Write-Host ""

try {
    Write-Host "1. Logging in..." -ForegroundColor Cyan
    $loginResp = Invoke-RestMethod http://localhost:3001/api/auth/login `
        -Method POST `
        -ContentType 'application/json' `
        -Body '{"username":"admin","password":"admin123"}'
    $token = $loginResp.token
    Write-Host "   ✓ Login successful"
    Write-Host ""

    Write-Host "2. Creating test chat..." -ForegroundColor Cyan
    $chatResp = Invoke-RestMethod http://localhost:3001/api/chats `
        -Method POST `
        -ContentType 'application/json' `
        -Headers @{Authorization="Bearer $token"} `
        -Body '{"title":"Streaming Test"}'
    $chatId = $chatResp.id
    Write-Host "   ✓ Chat created: $chatId"
    Write-Host ""

    Write-Host "3. Sending message with streaming..." -ForegroundColor Cyan
    $msgResp = Invoke-WebRequest "http://localhost:3001/api/chats/$chatId/messages" `
        -Method POST `
        -ContentType 'application/json' `
        -Headers @{Authorization="Bearer $token"} `
        -Body '{"content":"Say exactly: STREAM_OK"}' `
        -TimeoutSec 30 `
        -UseBasicParsing
    
    Write-Host "   Status: $($msgResp.StatusCode)"
    Write-Host "   Content-Type: $($msgResp.Headers['Content-Type'])"
    Write-Host ""
    
    $contentType = $msgResp.Headers['Content-Type']
    if ($contentType -like "*event-stream*") {
        Write-Host "   ✓ SSE Content-Type correct!" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Wrong Content-Type: $contentType" -ForegroundColor Red
    }
    Write-Host ""

    Write-Host "4. Parsing stream events..." -ForegroundColor Cyan
    $content = $msgResp.Content
    $lines = $content -split "`n"
    
    $chunkCount = 0
    $doneCount = 0
    $responseText = ""
    
    foreach ($line in $lines) {
        if ($line -like "data: *") {
            $jsonStr = $line.Substring(6).Trim()
            if ($jsonStr -and $jsonStr -ne "[DONE]") {
                try {
                    $event = ConvertFrom-Json $jsonStr
                    if ($event.type -eq "chunk") {
                        $chunkCount++
                        $responseText += $event.content
                    }
                    if ($event.type -eq "done") {
                        $doneCount++
                        Write-Host "   Event done: messageId=$($event.messageId), tokenCount=$($event.tokenCount)"
                    }
                } catch {}
            }
        }
    }
    
    Write-Host "   ✓ Received $chunkCount chunk events"
    Write-Host "   ✓ Received $doneCount done event"
    Write-Host "   ✓ Response text: $($responseText.Substring(0, [Math]::Min(60, $responseText.Length)))..."
    Write-Host ""

    if ($chunkCount -gt 0 -and $doneCount -eq 1) {
        Write-Host "STREAMING TEST: PASSED ✓" -ForegroundColor Green
    } else {
        Write-Host "STREAMING TEST: FAILED" -ForegroundColor Red
        Write-Host "Expected chunks > 0 and done == 1, got chunks=$chunkCount, done=$doneCount"
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
