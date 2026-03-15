
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya2NrenpvZ2J6dnRmbHdkam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mjk2OTcsImV4cCI6MjA4ODUwNTY5N30._iEF98cWd2PaHH4cYZ0iZWqarNvI_6s32jLCeqBKhKY"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya2NrenpvZ2J6dnRmbHdkam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mjk2OTcsImV4cCI6MjA4ODUwNTY5N30._iEF98cWd2PaHH4cYZ0iZWqarNvI_6s32jLCeqBKhKY"
}
$url = "https://arkckzzogbzvtflwdjoy.supabase.co/rest/v1/lobby_games?select=id,contract_game_id,wager_amount,status,created_at&order=created_at.desc&limit=10"
try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers
    $response | ConvertTo-Json
} catch {
    $_.Exception.Message
    $_.ErrorDetails.Message
}
