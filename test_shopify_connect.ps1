# PowerShell Test Script for Shopify Connect Endpoint
# Make sure backend is running: cd backend; npm run dev

Write-Host "🧪 Testing Shopify Connect Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$JWT_TOKEN = "YOUR_JWT_TOKEN_HERE"  # Replace with actual token from Supabase
$BACKEND_URL = "http://localhost:3002"
$SHOP_DOMAIN = "tetiano.myshopify.com"
$API_KEY = "test-api-key"
$API_SECRET = "test-api-secret"

# Test data
$body = @{
    shop = $SHOP_DOMAIN
    api_key = $API_KEY
    api_secret = $API_SECRET
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

Write-Host "📤 Sending POST request to $BACKEND_URL/api/app/shopify/connect" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "$BACKEND_URL/api/app/shopify/connect" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing

    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "📊 HTTP Status: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📄 Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Error!" -ForegroundColor Red
    Write-Host "📊 HTTP Status: $statusCode" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "📄 Error Response:" -ForegroundColor Red
        Write-Host $responseBody
    }
    
    Write-Host ""
    Write-Host "💡 Common Issues:" -ForegroundColor Yellow
    Write-Host "  - 400: Missing shop, api_key, or api_secret"
    Write-Host "  - 401: Invalid or missing JWT token"
    Write-Host "  - 403: User doesn't have store_id"
    Write-Host "  - 500: Database or server error"
    Write-Host "  - 503: Service unavailable (backend crashed)"
}

Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Magenta
Write-Host "  1. Make sure backend is running: cd backend; npm run dev"
Write-Host "  2. Replace JWT_TOKEN with actual token from Supabase"
Write-Host "  3. Make sure user has store_id in database"
