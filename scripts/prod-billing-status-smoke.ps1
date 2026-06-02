param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$TargetEmail = $env:ZETTA_BILLING_TARGET_EMAIL,
  [string]$ExpectedStatus = $env:ZETTA_BILLING_EXPECTED_STATUS
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
    TimeoutSec = 45
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
  Fail "Set ZETTA_BILLING_TARGET_EMAIL or pass -TargetEmail with the commercial account email."
}
if (-not $ExpectedStatus) {
  $ExpectedStatus = "ACTIVE"
}

Write-Host "ZETTA production billing status smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $AdminEmail"
Write-Host "Target billing email: $TargetEmail"
Write-Host "Expected subscription status: $ExpectedStatus"

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

$encodedTarget = [System.Uri]::EscapeDataString($TargetEmail)
$accounts = Invoke-Json -Method GET -Path "/admin/subscriptions?q=$encodedTarget" -Headers $headers
$account = $accounts | Where-Object { $_.email -eq $TargetEmail } | Select-Object -First 1
if (-not $account) {
  Fail "No paid commercial account found for '$TargetEmail'."
}
if ($account.role -eq "USER" -or $account.role -eq "SUPER_ADMIN") {
  Fail "Target account role '$($account.role)' is not a commercial billing role."
}
if ($account.status -ne "ACTIVE") {
  Fail "Target account status is '$($account.status)'. Account must be ACTIVE before billing status validation."
}
if ($account.subscription_status -ne $ExpectedStatus) {
  Fail "Subscription status is '$($account.subscription_status)', expected '$ExpectedStatus'."
}
if ($account.billing_provider -ne "MERCADO_PAGO") {
  Fail "Billing provider is '$($account.billing_provider)', expected MERCADO_PAGO."
}
if (-not $account.billing_customer_id) {
  Fail "Billing customer id is empty."
}
if (-not $account.billing_subscription_id) {
  Fail "Billing subscription id is empty."
}
if ($ExpectedStatus -eq "ACTIVE" -and -not $account.billing_last_event_id) {
  Fail "Billing last event id is empty. A real webhook/payment event has not been recorded yet."
}

Write-Host "account: ok ($($account.role), $($account.subscription_plan))"
Write-Host "subscription status: $($account.subscription_status)"
Write-Host "billing provider: $($account.billing_provider)"
Write-Host "customer ref present: ok"
Write-Host "subscription ref present: ok"
if ($account.billing_last_event_id) {
  Write-Host "last event ref present: ok"
} else {
  Write-Host "last event ref: empty"
}
Write-Host ""
Write-Host "Billing status smoke test passed." -ForegroundColor Green
Write-Host "Admin password, token, and external billing ids were not printed."
