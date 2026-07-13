<#
.SYNOPSIS
  Provisions the four Frontline Digital Portfolio Hub SharePoint lists and
  (optionally) seeds them from the prototype's mock data.

.DESCRIPTION
  Creates: Portfolio Projects, Project Milestones, Site Engagements, Project Updates
  with the exact field internal names the SharePointRepository expects, then loads
  ../src/data/*.json so owners / portfolios / etc. are immediately editable in the
  SharePoint list UI. Idempotent: re-running skips lists/fields that already exist.

.PREREQUISITES
  - PnP.PowerShell module:  Install-Module PnP.PowerShell -Scope CurrentUser
  - Permission to create lists on the target site (site Owner is enough).
  - First-time auth may need an Entra app registration:
      Register-PnPEntraIDAppForInteractiveLogin -ApplicationName "FD Portfolio Hub Admin" -Tenant <tenant>.onmicrosoft.com

.EXAMPLE
  ./Provision-PortfolioHub.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/FrontlineDigital"
  ./Provision-PortfolioHub.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/FrontlineDigital" -SkipSeed
#>
param(
  [Parameter(Mandatory = $true)] [string] $SiteUrl,
  [switch] $SkipSeed
)

$ErrorActionPreference = "Stop"
$dataDir = Join-Path $PSScriptRoot "..\src\data"

Write-Host "Connecting to $SiteUrl ..." -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ---- choice value sets (keep in sync with src/types/models.ts) ----
$projStages   = @("Idea","Discovery","Design","Build","Pilot","Scale","Sustain","Complete")
$projStatuses = @("Green","Amber","Red","On Hold","Complete")
$mileStatuses = @("Planned","On Track","At Risk","Delayed","Complete")
$engStages    = @("Discovery","Design","Development","Prototype","Readiness","Pilot","Engaged","Scale")
$engStatuses  = @("Planned","Active","On Hold","Complete")
$sites        = @("MDO","WAN","YAN","GDI","GTP","BM4","GNAM","HD1","HD4","PBO","RV","PMO Control")
$workAreas    = @("OE/BI","Production","Drill & Blast","Development","Mine Water Management","MEM","Fixed Plant")

function Ensure-List([string]$Title) {
  $existing = Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    Write-Host "  Creating list '$Title'" -ForegroundColor Green
    New-PnPList -Title $Title -Template GenericList -OnQuickLaunch:$false | Out-Null
  } else {
    Write-Host "  List '$Title' already exists" -ForegroundColor DarkGray
  }
}

# $Type: Text | Note | DateTime | Choice
function Ensure-Field([string]$List, [string]$Display, [string]$Internal, [string]$Type, [string[]]$Choices) {
  $f = Get-PnPField -List $List -Identity $Internal -ErrorAction SilentlyContinue
  if ($null -ne $f) { return }
  if ($Type -eq "Choice") {
    Add-PnPField -List $List -DisplayName $Display -InternalName $Internal -Type Choice -Choices $Choices -AddToDefaultView | Out-Null
  } else {
    Add-PnPField -List $List -DisplayName $Display -InternalName $Internal -Type $Type -AddToDefaultView | Out-Null
  }
  Write-Host "    + $Internal ($Type)" -ForegroundColor Green
}

# ----------------------------- Portfolio Projects -----------------------------
Ensure-List "Portfolio Projects"
Ensure-Field "Portfolio Projects" "Initiative Key"     "InitiativeKey"     "Text"
Ensure-Field "Portfolio Projects" "Abbreviation"       "Abbrev"            "Text"
Ensure-Field "Portfolio Projects" "Portfolio"          "Portfolio"         "Text"
Ensure-Field "Portfolio Projects" "Product Area"       "ProductArea"       "Text"
Ensure-Field "Portfolio Projects" "Owner"              "Owner"             "Text"
Ensure-Field "Portfolio Projects" "Sponsor"            "Sponsor"           "Text"
Ensure-Field "Portfolio Projects" "Stage"              "Stage"             "Choice" $projStages
Ensure-Field "Portfolio Projects" "Status"             "RAGStatus"         "Choice" $projStatuses
Ensure-Field "Portfolio Projects" "Start Date"         "StartDate"         "DateTime"
Ensure-Field "Portfolio Projects" "End Date"           "EndDate"           "DateTime"
Ensure-Field "Portfolio Projects" "Summary"            "Summary"           "Note"
Ensure-Field "Portfolio Projects" "Outcome Statement"  "OutcomeStatement"  "Note"
Ensure-Field "Portfolio Projects" "Business Value"     "BusinessValue"     "Note"
Ensure-Field "Portfolio Projects" "Dependencies"       "Dependencies"      "Note"
Ensure-Field "Portfolio Projects" "Funding Source"     "FundingSource"     "Text"
Ensure-Field "Portfolio Projects" "Project Code"       "ProjectCode"       "Text"
Ensure-Field "Portfolio Projects" "Last Update"        "LastUpdate"        "Note"
Ensure-Field "Portfolio Projects" "Last Updated"       "LastUpdated"       "DateTime"

# ----------------------------- Project Milestones -----------------------------
Ensure-List "Project Milestones"
Ensure-Field "Project Milestones" "Initiative Key"   "InitiativeKey"   "Text"
Ensure-Field "Project Milestones" "Milestone Date"   "MilestoneDate"   "DateTime"
Ensure-Field "Project Milestones" "Milestone Status" "MilestoneStatus" "Choice" $mileStatuses
Ensure-Field "Project Milestones" "Notes"            "MNotes"          "Note"

# ----------------------------- Site Engagements ------------------------------
Ensure-List "Site Engagements"
Ensure-Field "Site Engagements" "Initiative Key" "InitiativeKey" "Text"
Ensure-Field "Site Engagements" "Portfolio"      "Portfolio"     "Text"
Ensure-Field "Site Engagements" "Site"           "Site"          "Choice" $sites
Ensure-Field "Site Engagements" "Work Area"      "WorkArea"      "Choice" $workAreas
Ensure-Field "Site Engagements" "Team"           "Team"          "Text"
Ensure-Field "Site Engagements" "Engagement Stage"  "EngStage"   "Choice" $engStages
Ensure-Field "Site Engagements" "Engagement Status" "EngStatus"  "Choice" $engStatuses
Ensure-Field "Site Engagements" "Start Date"     "StartDate"     "DateTime"
Ensure-Field "Site Engagements" "End Date"       "EndDate"       "DateTime"
Ensure-Field "Site Engagements" "Purpose"        "Purpose"       "Note"
Ensure-Field "Site Engagements" "Notes"          "ENotes"        "Note"

# ----------------------------- Project Updates -------------------------------
Ensure-List "Project Updates"
Ensure-Field "Project Updates" "Initiative Key"     "InitiativeKey"     "Text"
Ensure-Field "Project Updates" "Update Date"        "UpdateDate"        "DateTime"
Ensure-Field "Project Updates" "Update Summary"     "USummary"          "Note"
Ensure-Field "Project Updates" "Risks"              "Risks"             "Note"
Ensure-Field "Project Updates" "Decisions Required" "DecisionsRequired" "Note"
Ensure-Field "Project Updates" "Submitted By"       "SubmittedBy"       "Text"

if ($SkipSeed) { Write-Host "`nLists ready. Seeding skipped (-SkipSeed)." -ForegroundColor Cyan; exit 0 }

# --------------------------------- Seeding -----------------------------------
function Read-Json([string]$name) {
  Get-Content (Join-Path $dataDir "$name.json") -Raw | ConvertFrom-Json
}
Write-Host "`nSeeding data from $dataDir ..." -ForegroundColor Cyan

# Optional: clear existing items so re-seeding doesn't duplicate.
foreach ($l in @("Project Updates","Site Engagements","Project Milestones","Portfolio Projects")) {
  $items = Get-PnPListItem -List $l -PageSize 500 -Fields "ID"
  if ($items.Count -gt 0) {
    Write-Host "  Clearing $($items.Count) existing items from '$l'" -ForegroundColor DarkYellow
    foreach ($it in $items) { Remove-PnPListItem -List $l -Identity $it.Id -Force | Out-Null }
  }
}

$projects = Read-Json "projects"
foreach ($p in $projects) {
  Add-PnPListItem -List "Portfolio Projects" -Values @{
    "Title"=$p.title; "InitiativeKey"=$p.id; "Abbrev"=$p.abbrev; "Portfolio"=$p.portfolio;
    "ProductArea"=$p.productArea; "Owner"=$p.owner; "Sponsor"=$p.sponsor; "Stage"=$p.stage;
    "RAGStatus"=$p.status; "StartDate"=$p.startDate; "EndDate"=$p.endDate; "Summary"=$p.summary;
    "OutcomeStatement"=$p.outcomeStatement; "BusinessValue"=$p.businessValue;
    "Dependencies"=($p.dependencies -join "; "); "FundingSource"=$p.fundingSource;
    "ProjectCode"=$p.projectCode; "LastUpdate"=$p.lastUpdate; "LastUpdated"=$p.lastUpdated
  } | Out-Null
}
Write-Host "  Loaded $($projects.Count) initiatives" -ForegroundColor Green

$ms = Read-Json "milestones"
foreach ($m in $ms) {
  Add-PnPListItem -List "Project Milestones" -Values @{
    "Title"=$m.name; "InitiativeKey"=$m.projectId; "MilestoneDate"=$m.date;
    "MilestoneStatus"=$m.status; "MNotes"=$m.notes
  } | Out-Null
}
Write-Host "  Loaded $($ms.Count) milestones" -ForegroundColor Green

$engs = Read-Json "engagements"
foreach ($e in $engs) {
  Add-PnPListItem -List "Site Engagements" -Values @{
    "Title"=("{0} - {1}" -f $e.site, $e.workArea); "InitiativeKey"=$e.initiativeId;
    "Portfolio"=$e.portfolio; "Site"=$e.site; "WorkArea"=$e.workArea; "Team"=$e.team;
    "EngStage"=$e.stage; "EngStatus"=$e.status; "StartDate"=$e.startDate; "EndDate"=$e.endDate;
    "Purpose"=$e.purpose; "ENotes"=$e.notes
  } | Out-Null
}
Write-Host "  Loaded $($engs.Count) engagements" -ForegroundColor Green

$ups = Read-Json "updates"
foreach ($u in $ups) {
  Add-PnPListItem -List "Project Updates" -Values @{
    "Title"=("{0} {1}" -f $u.projectId, $u.date); "InitiativeKey"=$u.projectId;
    "UpdateDate"=$u.date; "USummary"=$u.summary; "Risks"=$u.risks;
    "DecisionsRequired"=$u.decisionsRequired; "SubmittedBy"=$u.submittedBy
  } | Out-Null
}
Write-Host "  Loaded $($ups.Count) updates" -ForegroundColor Green

Write-Host "`nDone. Lists provisioned and seeded on $SiteUrl" -ForegroundColor Cyan
Write-Host "Edit owners / portfolios directly in the 'Portfolio Projects' list, or via the app's Edit initiative form." -ForegroundColor Cyan
