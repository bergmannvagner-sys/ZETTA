param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$EmailDomain = "example.com"
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
    [hashtable]$Headers = @{},
    [int[]]$AllowedStatus = @(200, 201)
  )

  $uri = "$ApiUrl$Path"
  try {
    $params = @{
      Method = $Method
      Uri = $uri
      UseBasicParsing = $true
      TimeoutSec = 45
      Headers = $Headers
    }
    if ($null -ne $Body) {
      $params.Body = ($Body | ConvertTo-Json -Depth 8)
      $params.ContentType = "application/json"
    }
    return Invoke-RestMethod @params
  } catch {
    $response = $_.Exception.Response
    if ($null -ne $response -and $AllowedStatus -contains [int]$response.StatusCode) {
      return $null
    }
    throw
  }
}

function New-Cpf {
  $digits = New-Object System.Collections.Generic.List[int]
  for ($i = 0; $i -lt 9; $i++) {
    $digits.Add((Get-Random -Minimum 0 -Maximum 10))
  }
  if (($digits | Select-Object -Unique).Count -eq 1) {
    $digits[8] = ($digits[8] + 1) % 10
  }
  $sum = 0
  for ($i = 0; $i -lt 9; $i++) { $sum += $digits[$i] * (10 - $i) }
  $first = ($sum * 10) % 11
  if ($first -eq 10) { $first = 0 }
  $digits.Add($first)
  $sum = 0
  for ($i = 0; $i -lt 10; $i++) { $sum += $digits[$i] * (11 - $i) }
  $second = ($sum * 10) % 11
  if ($second -eq 10) { $second = 0 }
  $digits.Add($second)
  return ($digits -join "")
}

function New-Cnpj {
  $digits = New-Object System.Collections.Generic.List[int]
  for ($i = 0; $i -lt 12; $i++) {
    $digits.Add((Get-Random -Minimum 0 -Maximum 10))
  }
  if (($digits | Select-Object -Unique).Count -eq 1) {
    $digits[11] = ($digits[11] + 1) % 10
  }
  $firstWeights = @(5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
  $sum = 0
  for ($i = 0; $i -lt 12; $i++) { $sum += $digits[$i] * $firstWeights[$i] }
  $first = if (($sum % 11) -lt 2) { 0 } else { 11 - ($sum % 11) }
  $digits.Add($first)
  $secondWeights = @(6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
  $sum = 0
  for ($i = 0; $i -lt 13; $i++) { $sum += $digits[$i] * $secondWeights[$i] }
  $second = if (($sum % 11) -lt 2) { 0 } else { 11 - ($sum % 11) }
  $digits.Add($second)
  return ($digits -join "")
}

function Register-Account {
  param(
    [string]$Email,
    [string]$FullName,
    [string]$Password,
    [string]$Role,
    [string]$Document
  )
  return Invoke-Json -Method POST -Path "/auth/register" -Body @{
    email = $Email
    full_name = $FullName
    password = $Password
    role = $Role
    document = $Document
    lgpdConsent = $true
  }
}

function Assert-Equal {
  param([object]$Actual, [object]$Expected, [string]$Label)
  if ($Actual -ne $Expected) {
    Fail "$Label expected '$Expected', got '$Actual'."
  }
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

$runId = (Get-Date -Format "yyyyMMddHHmmss")
$password = "ZettaQa$runId!"
$userEmail = "qa-user-$runId@$EmailDomain"
$psychologistEmail = "qa-psychologist-$runId@$EmailDomain"
$companyEmail = "qa-company-$runId@$EmailDomain"

Write-Host "ZETTA production MVP smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Generated QA accounts:"
Write-Host "- $userEmail"
Write-Host "- $psychologistEmail"
Write-Host "- $companyEmail"

Invoke-Json -Method GET -Path "/health" | Out-Null
Write-Host "health: ok"

$adminLogin = Invoke-Json -Method POST -Path "/auth/login" -Body @{
  email = $AdminEmail
  password = $AdminPassword
}
Assert-Equal $adminLogin.user.role "SUPER_ADMIN" "admin role"
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.access_token)" }
Write-Host "admin auth: ok"

$user = Register-Account -Email $userEmail -FullName "QA Usuario MVP" -Password $password -Role "USER" -Document (New-Cpf)
Assert-Equal $user.user.status "ACTIVE" "USER status"
Assert-Equal $user.user.subscription_status "FREE" "USER subscription"
$userHeaders = @{ Authorization = "Bearer $($user.access_token)" }
$me = Invoke-Json -Method GET -Path "/users/me" -Headers $userHeaders
Assert-Equal $me.email $userEmail "USER /users/me email"
Write-Host "USER registration/login/me: ok"

$psychologist = Register-Account -Email $psychologistEmail -FullName "QA Psicologo MVP" -Password $password -Role "PSYCHOLOGIST" -Document "CRP-01/$runId"
Assert-Equal $psychologist.user.status "PENDING_VERIFICATION" "PSYCHOLOGIST status"
Assert-Equal $psychologist.user.subscription_status "PENDING" "PSYCHOLOGIST subscription"
$psychologistHeaders = @{ Authorization = "Bearer $($psychologist.access_token)" }
Invoke-Json -Method GET -Path "/professional/authorized-users" -Headers $psychologistHeaders -AllowedStatus @(403) | Out-Null
Write-Host "PSYCHOLOGIST pending gate: ok"

$company = Register-Account -Email $companyEmail -FullName "QA Empresa MVP" -Password $password -Role "COMPANY" -Document (New-Cnpj)
Assert-Equal $company.user.status "PENDING_VERIFICATION" "COMPANY status"
Assert-Equal $company.user.subscription_status "PENDING" "COMPANY subscription"
$companyHeaders = @{ Authorization = "Bearer $($company.access_token)" }
Invoke-Json -Method GET -Path "/nr1/report" -Headers $companyHeaders -AllowedStatus @(403) | Out-Null
Write-Host "COMPANY pending gate: ok"

$pendingPsychologist = Invoke-Json -Method GET -Path "/admin/pending-accounts?q=$psychologistEmail" -Headers $adminHeaders
if (-not ($pendingPsychologist | Where-Object { $_.email -eq $psychologistEmail })) {
  Fail "Pending psychologist was not visible to SUPER_ADMIN."
}
$pendingCompany = Invoke-Json -Method GET -Path "/admin/pending-accounts?q=$companyEmail" -Headers $adminHeaders
if (-not ($pendingCompany | Where-Object { $_.email -eq $companyEmail })) {
  Fail "Pending company was not visible to SUPER_ADMIN."
}
Write-Host "admin pending account visibility: ok"

$plans = Invoke-Json -Method GET -Path "/admin/commercial-plans" -Headers $adminHeaders
if (-not ($plans | Where-Object { $_.role -eq "COMPANY" })) {
  Fail "Commercial plans did not include COMPANY."
}
Write-Host "commercial plans: ok"

Write-Host ""
Write-Host "Production MVP smoke test passed." -ForegroundColor Green
Write-Host "Created QA accounts are intentionally left in production for audit/RBAC visibility."
Write-Host "Password and tokens were used in memory only and were not printed."
