# Build the Portfolio Hub in Power Apps ("vibe") — Build Pack

**Yes, you can build this in Power Apps on SharePoint Lists** — and given the App Catalog (404) and
Azure (401) were blocked for you, this is likely the path you can **self‑serve end to end**.

The honest split:
- **Power Apps handles well:** Home dashboard, Projects browse + detail, **Updates & Edit‑initiative
  forms**, Sites view, search/filters, simple charts. (Fixing owners/portfolios = free, via forms.)
- **Power Apps is weak at 3 screens:** the **Engagement Matrix**, **Heatmap**, and **Roadmap Gantt**.
  Do those in **Power BI** (native matrix + Gantt) reading the same lists, and embed them back.

Recommended shape: **SharePoint Lists (backend) → Power Apps (browse/edit) → Power BI (matrix/heatmap/roadmap)**.

---

## Step 0 — Create the backend (the lists)
Power Apps needs the lists first. Run the provisioning script (creates + seeds all four):
```powershell
cd sharepoint
./Provision-PortfolioHub.ps1 -SiteUrl "https://riotinto.sharepoint.com/sites/<yoursite>"
```
Lists created: **Portfolio Projects, Project Milestones, Site Engagements, Project Updates**
(columns/choices already correct — see the script or the table at the bottom).

---

## Step 1 — Generate the app in Power Apps
1. Go to **make.powerapps.com** → make sure you're in the right **environment** (top‑right).
2. Easiest start: **+ Create → SharePoint** (or **Start with data**) → pick your site → select the
   **Portfolio Projects** list → it auto‑builds a 3‑screen browse/detail/edit canvas app.
3. Then use **Copilot ("vibe")** in the studio to add the rest. Paste this description:

> **App:** Frontline Digital Portfolio & Engagement Hub. Data source: SharePoint lists on this site —
> Portfolio Projects, Project Milestones, Site Engagements, Project Updates (joined by the
> **InitiativeKey** text column).
>
> **Screens:**
> 1. **Home** — cards for Total initiatives, In‑delivery (Stage in Build/Pilot/Scale), At‑risk
>    (Status Red/Amber), Sites engaged (distinct Site in Site Engagements). Galleries: Upcoming
>    milestones (MilestoneDate ≥ today, not Complete), Upcoming engagements (StartDate ≥ today),
>    Initiatives needing attention (Status Red/Amber).
> 2. **Projects** — searchable gallery of Portfolio Projects (Title, Owner, Stage, Status, Portfolio);
>    filter by Portfolio/Stage/Status; tap opens Detail.
> 3. **Project detail** — Overview, Outcome, Business Value, Owner, Sponsor, dates, Dependencies;
>    related galleries of this initiative's Milestones, Site Engagements and Updates (filter by
>    InitiativeKey).
> 4. **Sites** — pick a Site; show initiatives engaging it, impacted work areas/teams, upcoming and
>    past engagements (filter Site Engagements by Site).
> 5. **Updates** — SharePoint edit forms to: add a Project Update; add/edit a Milestone; add/edit a
>    Site Engagement; and **Edit an initiative** (edit Portfolio Projects fields: Owner, Portfolio,
>    Sponsor, Product Area, Stage, Status, dates, Business Value, Dependencies).
>
> Use a left navigation, card layout, Fluent‑style theme. Colour Status: Green/Amber/Red. Colour
> engagement Stage on a ramp Discovery→Scale.

4. **Editing owners/portfolios** = the Edit form on Portfolio Projects (or edit the list directly).
5. **Share** the app with your team from the Power Apps portal (no App Catalog needed).

> Delegation note: your data is small (13 initiatives, ~75 engagements), well under the 2,000‑row
> SharePoint delegation limit — no performance concerns.

---

## Step 2 — The 3 hard screens in Power BI
Power BI Desktop → **Get Data → SharePoint Online List** → your site → load the 4 lists. Relate them
on **InitiativeKey** (Projects[InitiativeKey] → each child list). Then:

**Engagement Matrix** — *Matrix* visual: Rows = `Site Engagements[WorkArea]`, Columns =
`Site Engagements[Site]`, Values = this measure (shows the initiative codes in each cell):
```DAX
Cell Initiatives = CONCATENATEX(VALUES('Portfolio Projects'[Abbrev]), 'Portfolio Projects'[Abbrev], ", ")
```
Add a **Stage rank** for colouring, then conditionally format the cell background by it:
```DAX
Stage Rank = SWITCH(SELECTEDVALUE('Site Engagements'[EngStage]),
  "Discovery",1,"Design",2,"Development",3,"Prototype",4,"Readiness",5,"Pilot",6,"Engaged",7,"Scale",8,0)
```
(Format → Cell elements → Background color → Based on `Stage Rank`.)

**Heatmap** — same Matrix, Values = `DISTINCTCOUNT('Site Engagements'[InitiativeKey])`, with a
background **color scale** (light→dark) on the value. Instant density heatmap.

**Roadmap (2026–2028)** — add the certified **Gantt** visual from AppSource: Task =
`Portfolio Projects[Title]`, Start = `StartDate`, End/Duration = `EndDate`, Legend/colour = `Status`.
(Alternative with no custom visual: a Matrix by Year/Quarter, or a stacked horizontal bar.)

Publish the report; **embed** the visuals into the Power App (Power BI tile control) or onto the
SharePoint page next to the app.

---

## SharePoint list schema (what the app binds to)
| List | Key columns |
|---|---|
| **Portfolio Projects** | Title, InitiativeKey, Abbrev, Portfolio, ProductArea, Owner, Sponsor, Stage (choice), RAGStatus (choice), StartDate, EndDate, Summary, OutcomeStatement, BusinessValue, Dependencies, FundingSource, ProjectCode, LastUpdate, LastUpdated |
| **Project Milestones** | Title, InitiativeKey, MilestoneDate, MilestoneStatus (choice), MNotes |
| **Site Engagements** | Title, InitiativeKey, Portfolio, Site (choice), WorkArea (choice), Team, EngStage (choice), EngStatus (choice), StartDate, EndDate, Purpose, ENotes |
| **Project Updates** | Title, InitiativeKey, UpdateDate, USummary, Risks, DecisionsRequired, SubmittedBy |

Choice values (Stage, Status, Site, WorkArea, EngStage, EngStatus) are set by the provisioning script.

---

## So which route?
- **Power Apps (+ Power BI)** — low‑code, maintainable by makers, and **you can likely ship it
  yourself** without IS&T. Trade‑off: the matrix/heatmap/roadmap move to Power BI.
- **SPFx/React** (already built) — pixel‑perfect matrix/heatmap/roadmap in one app, but blocked on an
  App Catalog upload (IS&T).

Same SharePoint backend underneath either way, so nothing is wasted — the lists + data you provision
serve all three (Power Apps, Power BI, and the SPFx app).
