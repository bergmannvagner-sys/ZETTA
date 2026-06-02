param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$TargetEmail = $env:ZETTA_COMMERCIAL_EMAIL,
  [string]$Reason = "production commercial QA approval"
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
  Fail "Set ZETTA_COMMERCIAL_EMAIL or pass -TargetEmail with the pending commercial account email."
}

Write-Host "ZETTA production commercial account approval" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $AdminEmail"
Write-Host "Target email: $TargetEmail"

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
$pendingAccounts = Invoke-Json -Method GET -Path "/admin/pending-accounts?q=$encodedTarget" -Headers $headers
$account = $pendingAccounts | Where-Object { $_.email -eq $TargetEmail } | Select-Object -First 1
if (-not $account) {
  $subscriptions = Invoke-Json -Method GET -Path "/admin/subscriptions?q=$encodedTarget" -Headers $headers
  $existing = $subscriptions | Where-Object { $_.email -eq $TargetEmail } | Select-Object -First 1
  if ($existing -and $existing.status -eq "ACTIVE") {
    Write-Host "target account is already ACTIVE: ok"
    Write-Host "role: $($existing.role)"
    Write-Host "subscription plan: $($existing.subscription_plan)"
    exit 0
  }
  Fail "No pending commercial account found for '$TargetEmail'. Create it first or check the email."
}
if ($account.role -eq "USER" -or $account.role -eq "SUPER_ADMIN") {
  Fail "Target account role '$($account.role)' is not a commercial account."
}
if ($account.status -ne "PENDING_VERIFICATION") {
  Fail "Target account status is '$($account.status)' instead of PENDING_VERIFICATION."
}
Write-Host "pending account: ok ($($account.role), $($account.subscription_plan))"

$approval = Invoke-Json -Method POST -Path "/admin/approve-account" -Headers $headers -Body @{
  user_id = $account.id
  reason = $Reason
}
if ($approval.status -ne "approved") {
  Fail "Approve account returned status '$($approval.status)' instead of approved."
}

$subscriptionsAfter = Invoke-Json -Method GET -Path "/admin/subscriptions?q=$encodedTarget" -Headers $headers
$approved = $subscriptionsAfter | Where-Object { $_.email -eq $TargetEmail } | Select-Object -First 1
if (-not $approved -or $approved.status -ne "ACTIVE") {
  Fail "Account was approved but did not appear as ACTIVE in subscriptions."
}

Write-Host "approval: ok"
Write-Host "status: $($approved.status)"
Write-Host "subscription plan: $($approved.subscription_plan)"
Write-Host "subscription status: $($approved.subscription_status)"
Write-Host ""
Write-Host "Next: use this email as ZETTA_BILLING_TARGET_EMAIL for prod-mercado-pago-checkout-smoke.ps1."
Write-Host "Admin password and token were not printed."
