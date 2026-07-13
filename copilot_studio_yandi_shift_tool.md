**Purpose**
Use this package with a Copilot Studio agent that already has an independent `SQL Server` tool connection and can execute SQL directly.

**Use this file if**
- Your agent already has the database connection configured separately.
- Your tool accepts a SQL query string and runs it against SQL Server.
- You do not need an HTTP wrapper or custom connector to execute the report.

**Primary file**
- [yandi_shift_delay_query.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query.sql)

**Single-result-set variant**
- [yandi_shift_delay_query_single_result.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query_single_result.sql)

**Optional file**
- [copilot_studio_yandi_shift_tool.openapi.yaml](C:/Projects/teams-chat-push-function/copilot_studio_yandi_shift_tool.openapi.yaml)

Use the OpenAPI file only if you later decide to wrap the SQL behind an HTTP action. For your current setup, the SQL file is the actual tool payload.

**What the multi-result SQL returns**
The query produces 4 result sets:
1. `shiftWindow`
2. `mineKpis`
3. `plantKpis`
4. `decisionLogsWithAttachedAlerts`

**What the single-result SQL returns**
The single-result variant returns one table with a `RowType` column:
- `shiftWindow`
- `mineKpi`
- `plantKpi`
- `decisionLog`

This is often easier for Copilot Studio SQL tools that do not preserve multiple result sets cleanly.

**Current query behavior**
- Uses database UTC time
- Converts shift logic to local `UTC+8`
- Uses nearest local `6:00 AM` or `6:00 PM` as shift boundary
- Focuses on plant-related KPIs
- Returns decision logs first-class
- Excludes `Shift Insights` alerts from alert attachment
- Only attaches alerts that appear relevant to the decision log entry

**Plant-related KPI focus**
The current query targets:
- `dbo.MineKpiData` for:
  - `PlantOutput` (`MineKpiId = 42`)
  - `ToPlant` (`MineKpiId = 103`)
- `dbo.PlantKpiData` for:
  - `TotalPlantOutputRate` (`PlantKpiId = 1`)
  - `PlantSOP` (`PlantKpiId = 11`)

Note:
`PlantSOP` is included in the query, but when we tested on July 4, 2026, there were no current-shift `PlantSOP` rows returned.

**How to add it as a Copilot Studio tool**
1. Add or select your existing `SQL Server` tool in the agent.
2. Point it at the Yandi database connection you manage separately.
3. Paste one of these into the tool action/query field:
   - [yandi_shift_delay_query.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query.sql) if your tool handles multiple result sets well
   - [yandi_shift_delay_query_single_result.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query_single_result.sql) if your tool prefers one flat result table
4. Name the tool something like:
   `Get Yandi Shift Plant Decisions`

**Recommended tool description**
Use this tool to retrieve the current Yandi shift-to-date plant KPI snapshot and operational decision log entries, with relevant non-Shift-Insights alerts attached where available.

**Recommended agent instructions**
Use `Get Yandi Shift Plant Decisions` when the user asks for:
- Yandi shift-to-date plant output
- plant tonnes
- plant throughput
- SOP
- controller or supervisor decision logs
- decision logs with attached alerts

When summarizing:
- explain time using local `UTC+8`
- treat the result as current shift only
- do not mention `Shift Insights` alerts as attached alerts
- prioritise decision logs over raw alert lists

**Suggested prompt routing hint**
If the user asks for current or live Yandi plant performance, shift-to-date decisions, plant tonnes, or SOP, call the SQL Server tool with the saved query before answering.

**Expected multi-result-set meaning**
`Result set 1`
- one row with:
  - `QueryRunTimeUtc`
  - `QueryRunTimeLocalUtcPlus8`
  - `ShiftStartUtc`
  - `ShiftStartLocalUtcPlus8`

`Result set 2`
- mine KPI snapshot rows:
  - `MetricTimestampUtc`
  - `MineKpiId`
  - `MetricName`
  - `Pit`
  - `Value`

`Result set 3`
- plant KPI snapshot rows:
  - `MetricTimestampUtc`
  - `PlantKpiId`
  - `MetricName`
  - `PlantName`
  - `Value`

`Result set 4`
- decision log rows with attached alert columns:
  - `DecisionId`
  - `DecisionTimestampUtc`
  - `ChangeLoggedBy`
  - `Pit`
  - `EquipmentName`
  - `Metric`
  - `LogType`
  - `LogDetail`
  - `LogSubDetail`
  - `Comments`
  - `AttachedAlertId`
  - `AttachedAlertTypeTitle`
  - `AttachedAlertTitle`
  - `AttachedAlertUnit`
  - `AttachedAlertTimestampUtc`

**Implementation note**
If your SQL Server tool returns multiple result sets separately, map them in the agent instructions by order.

If your SQL Server tool only returns a single tabular result:
- prefer [yandi_shift_delay_query_single_result.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query_single_result.sql)
- use `RowType` to separate shift metadata, KPI rows, and decision-log rows
- group or filter inside the agent by `RowType`

**Practical agent instruction block**
You can paste this into the tool guidance area in Copilot Studio:

```text
Use this SQL Server tool for Yandi shift-to-date plant operations questions.
Run the saved Yandi shift query against the Yandi SQL connection.
Interpret the query using UTC database time and UTC+8 local shift boundaries.
Treat the nearest local 6:00 AM or 6:00 PM as the shift start.
Prioritise decision log entries and their attached non-Shift-Insights alerts.
When summarising, explain the plant KPI snapshot first, then the decision log context.
```

**Best current usage pattern**
For your setup, the most direct workflow is:
1. keep the connection in Copilot Studio
2. keep the SQL in [yandi_shift_delay_query.sql](C:/Projects/teams-chat-push-function/yandi_shift_delay_query.sql)
3. use this markdown file as the tool instructions/reference
