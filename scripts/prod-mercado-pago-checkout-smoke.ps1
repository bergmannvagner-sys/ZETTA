param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$TargetEmail = $env:ZETTA_BILLING_TARGET_EMAIL
)

$ErrorActionPreference = "Stop"

function Fail {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method = $Method
    Uri = "$ApiUrl$Path"
    UseBasicParsing = $true
    TimeoutSec = 60
    Headers = $Headers
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
    $params.ContentType = "application/json"
  }
  Invoke-RestMethod @params
}

if (-not $ApiUrl) {
  $ApiUrl = "https://zetta-bergmann.onrender.com"
}
$ApiUrl = $ApiUrl.TrimEnd("/")

if (-not $AdminEmail) {
  Fail "Set ZETTA_ADMIN_EMAIL or pass -AdminEmail."
}
if (-not $AdminPassword) {
  Fail "Set ZETTA_ADMIN_PASSWORD or pass -AdminPassword. Do not commit or share this value."
}
if (-not $TargetEmail) {
  Fail "Set ZETTA_BILLING_TARGET_EMAIL or pass -TargetEmail with an ACTIVE commercial account email."
}

Write-Host "ZETTA production Mercado Pago checkout smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $AdminEmail"
Write-Host "Target billing email: $TargetEmail"

Invoke-Json -Method GET -Path "/health" | Out-Null
Write-Host "health: ok"

$adminLogin = Invoke-Json -Method POST -Path "/auth/login" -Body @{
  email = $AdminEmail
  password = $AdminPassword
}
if ($adminLogin.user.role -ne "SUPER_ADMIN") {
  Fail "Admin login succeeded, but role is '$($adminLogin.user.role)' instead of SUPER_ADMIN."
}
$headers = @{ Authorization = "Bearer $($adminLogin.access_token)" }
Write-Host "admin auth: ok"

$billingConfig = Invoke-Json -Method GET -Path "/admin/billing-config" -Headers $headers
$mercadoPago = $billingConfig.provider_capabilities | Where-Object { $_.provider -eq "MERCADO_PAGO" } | Select-Object -First 1
if (-not $mercadoPago) {
  Fail "MERCADO_PAGO provider capability was not returned."
}
if (-not $mercadoPago.provider_configured) {
  $requiredEnv = ($mercadoPago.required_env_names -join ", ")
  Fail "Mercado Pago is not configured in Render. Check these env vars: $requiredEnv."
}
if (-not $mercadoPago.production_enabled) {
  $requiredEnv = ($mercadoPago.required_env_names -join ", ")
  Fail "Mercado Pago production readiness is not enabled in Render. Check credentials and return URLs: $requiredEnv."
}
if ($mercadoPago.checkout_enabled) {
  Fail "Public checkout is unexpectedly enabled. Checkout must stay admin-only."
}
Write-Host "mercado pago config: ok"

$encodedTarget = [System.Uri]::EscapeDataString($TargetEmail)
$accounts = Invoke-Json -Method GET -Path "/admin/subscriptions?q=$encodedTarget" -Headers $headers
$account = $accounts | Where-Object { $_.email -eq $TargetEmail } | Select-Object -First 1
if (-not $account) {
  Fail "No paid commercial account found for '$TargetEmail'."
}
if ($account.role -eq "USER" -or $account.role -eq "SUPER_ADMIN") {
  Fail "Target account role '$($account.role)' cannot receive a commercial checkout."
}
if ($account.status -ne "ACTIVE") {
  Fail "Target account status is '$($account.status)'. Approve the account before creating checkout."
}
Write-Host "target account: ok ($($account.role), $($account.subscription_plan))"

$checkout = Invoke-Json -Method POST -Path "/admin/mercado-pago/checkout-preference" -Headers $headers -Body @{
  user_id = $account.id
  reason = "production Mercado Pago checkout smoke"
}
if ($checkout.provider -ne "MERCADO_PAGO") {
  Fail "Checkout provider returned '$($checkout.provider)' instead of MERCADO_PAGO."
}
if (-not $checkout.preference_id) {
  Fail "Mercado Pago did not return a preference id."
}
if (-not $checkout.checkout_url) {
  Fail "Mercado Pago did not return a checkout URL."
}
$checkoutUri = [System.Uri]$checkout.checkout_url
if ($checkoutUri.Host -notlike "*.mercadopago.com*" -and $checkoutUri.Host -notlike "*.mercadolivre.com*") {
  Fail "Checkout URL host '$($checkoutUri.Host)' does not look like Mercado Pago."
}
if ($checkout.client_reference_id -ne $account.id) {
  Fail "Checkout client reference does not match the target account."
}

Write-Host "checkout preference: ok"
Write-Host "checkout host: $($checkoutUri.Host)"
Write-Host "price BRL: $($checkout.price_brl)"
Write-Host ""
Write-Host "Mercado Pago checkout smoke test passed." -ForegroundColor Green
Write-Host "The full checkout URL, access token, webhook secret, and admin password were not printed."
