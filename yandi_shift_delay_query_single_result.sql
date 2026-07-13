-- Yandi shift-to-date query
-- Single-result-set version for Copilot Studio SQL Server tools
-- Local shift logic: UTC+8, nearest 6:00 AM / 6:00 PM
-- Database clock: UTC

SET NOCOUNT ON;

DECLARE @UtcOffsetHours int = 8;
DECLARE @UtcNow datetime = GETUTCDATE();
DECLARE @LocalNow datetime = DATEADD(HOUR, @UtcOffsetHours, @UtcNow);
DECLARE @LocalToday date = CAST(@LocalNow AS date);
DECLARE @LocalTodayAt0600 datetime = DATEADD(HOUR, 6, CAST(@LocalToday AS datetime));
DECLARE @LocalTodayAt1800 datetime = DATEADD(HOUR, 18, CAST(@LocalToday AS datetime));
DECLARE @LocalShiftStart datetime =
    CASE
        WHEN @LocalNow >= @LocalTodayAt1800 THEN @LocalTodayAt1800
        WHEN @LocalNow >= @LocalTodayAt0600 THEN @LocalTodayAt0600
        ELSE DATEADD(HOUR, 18, DATEADD(DAY, -1, CAST(@LocalToday AS datetime)))
    END;
DECLARE @UtcShiftStart datetime = DATEADD(HOUR, -@UtcOffsetHours, @LocalShiftStart);

;WITH ShiftWindow AS (
    SELECT
        @UtcNow AS QueryRunTimeUtc,
        @LocalNow AS QueryRunTimeLocalUtcPlus8,
        @UtcShiftStart AS ShiftStartUtc,
        @LocalShiftStart AS ShiftStartLocalUtcPlus8
),
LatestMineKpiTimestamp AS (
    SELECT MAX([Timestamp]) AS LatestTimestamp
    FROM dbo.MineKpiData
    WHERE [Timestamp] >= @UtcShiftStart
      AND [Timestamp] <= @UtcNow
      AND MineKpiId IN (42, 103)
),
MineKpis AS (
    SELECT
        d.[Timestamp] AS MetricTimestampUtc,
        d.MineKpiId,
        k.Name AS MetricName,
        d.Pit,
        d.Value
    FROM dbo.MineKpiData d
    INNER JOIN dbo.MineKpi k
        ON k.Id = d.MineKpiId
    CROSS JOIN LatestMineKpiTimestamp t
    WHERE d.[Timestamp] = t.LatestTimestamp
      AND d.MineKpiId IN (42, 103)
),
LatestPlantKpiTimestamp AS (
    SELECT MAX([Timestamp]) AS LatestTimestamp
    FROM dbo.PlantKpiData
    WHERE [Timestamp] >= @UtcShiftStart
      AND [Timestamp] <= @UtcNow
      AND PlantKpiId IN (1, 11)
),
PlantKpis AS (
    SELECT
        d.[Timestamp] AS MetricTimestampUtc,
        d.PlantKpiId,
        k.Name AS MetricName,
        d.Name AS PlantName,
        d.Value
    FROM dbo.PlantKpiData d
    INNER JOIN dbo.PlantKpi k
        ON k.Id = d.PlantKpiId
    CROSS JOIN LatestPlantKpiTimestamp t
    WHERE d.[Timestamp] = t.LatestTimestamp
      AND d.PlantKpiId IN (1, 11)
),
ShiftDecisionLogs AS (
    SELECT
        vd.id AS DecisionId,
        vd.AlertId,
        vd.[TimeStamp] AS DecisionTimestampUtc,
        vd.ChangeLoggedBy,
        vd.EquipmentName,
        vd.EquipmentType,
        vd.Metric,
        vd.LogType,
        vd.LogDetail,
        vd.LogSubDetail,
        vd.Comments,
        vd.Pit,
        vd.RoleId,
        vd.IsHandover,
        vd.IsOngoing,
        vd.DecisionLogPageId
    FROM dbo.ValueDecision vd
    WHERE vd.[TimeStamp] >= @UtcShiftStart
      AND vd.[TimeStamp] <= @UtcNow
),
DecisionWithExactAlert AS (
    SELECT
        d.*,
        a.Id AS ExactAlertId,
        a.AlertType AS ExactAlertType,
        at.Title AS ExactAlertTypeTitle,
        a.Title AS ExactAlertTitle,
        a.Unit AS ExactAlertUnit,
        a.[TimeStamp] AS ExactAlertTimestampUtc
    FROM ShiftDecisionLogs d
    LEFT JOIN dbo.Alert a
        ON a.Id = d.AlertId
    LEFT JOIN dbo.AlertType at
        ON at.Id = a.AlertType
),
DecisionWithFallbackAlert AS (
    SELECT
        d.*,
        fa.Id AS FallbackAlertId,
        fa.AlertType AS FallbackAlertType,
        fat.Title AS FallbackAlertTypeTitle,
        fa.Title AS FallbackAlertTitle,
        fa.Unit AS FallbackAlertUnit,
        fa.[TimeStamp] AS FallbackAlertTimestampUtc
    FROM DecisionWithExactAlert d
    OUTER APPLY (
        SELECT TOP (1) a.*
        FROM dbo.Alert a
        LEFT JOIN dbo.AlertType at
            ON at.Id = a.AlertType
        WHERE d.ExactAlertId IS NULL
          AND NULLIF(LTRIM(RTRIM(d.EquipmentName)), '') IS NOT NULL
          AND d.EquipmentName <> 'N/A'
          AND a.Unit = d.EquipmentName
          AND a.[TimeStamp] >= @UtcShiftStart
          AND a.[TimeStamp] <= @UtcNow
          AND (at.Title IS NULL OR at.Title NOT LIKE 'Shift Insights:%')
        ORDER BY ABS(DATEDIFF(SECOND, a.[TimeStamp], d.DecisionTimestampUtc)), a.Id DESC
    ) fa
    LEFT JOIN dbo.AlertType fat
        ON fat.Id = fa.AlertType
),
DecisionRows AS (
    SELECT
        d.DecisionId,
        d.DecisionTimestampUtc,
        d.ChangeLoggedBy,
        d.Pit,
        d.EquipmentName,
        d.EquipmentType,
        d.Metric,
        d.LogType,
        d.LogDetail,
        d.LogSubDetail,
        d.Comments,
        d.RoleId,
        d.IsHandover,
        d.IsOngoing,
        d.DecisionLogPageId,
        COALESCE(d.ExactAlertId, d.FallbackAlertId) AS AttachedAlertId,
        COALESCE(d.ExactAlertType, d.FallbackAlertType) AS AttachedAlertType,
        COALESCE(d.ExactAlertTypeTitle, d.FallbackAlertTypeTitle) AS AttachedAlertTypeTitle,
        COALESCE(d.ExactAlertTitle, d.FallbackAlertTitle) AS AttachedAlertTitle,
        COALESCE(d.ExactAlertUnit, d.FallbackAlertUnit) AS AttachedAlertUnit,
        COALESCE(d.ExactAlertTimestampUtc, d.FallbackAlertTimestampUtc) AS AttachedAlertTimestampUtc
    FROM DecisionWithFallbackAlert d
)
SELECT
    'shiftWindow' AS RowType,
    CAST(NULL AS varchar(50)) AS MetricGroup,
    sw.QueryRunTimeUtc,
    sw.QueryRunTimeLocalUtcPlus8,
    sw.ShiftStartUtc,
    sw.ShiftStartLocalUtcPlus8,
    CAST(NULL AS datetime) AS MetricTimestampUtc,
    CAST(NULL AS int) AS MineKpiId,
    CAST(NULL AS int) AS PlantKpiId,
    CAST(NULL AS varchar(100)) AS MetricName,
    CAST(NULL AS varchar(100)) AS MetricScope,
    CAST(NULL AS varchar(100)) AS MetricValue,
    CAST(NULL AS bigint) AS DecisionId,
    CAST(NULL AS datetime) AS DecisionTimestampUtc,
    CAST(NULL AS varchar(100)) AS ChangeLoggedBy,
    CAST(NULL AS varchar(100)) AS Pit,
    CAST(NULL AS varchar(100)) AS EquipmentName,
    CAST(NULL AS varchar(100)) AS EquipmentType,
    CAST(NULL AS varchar(100)) AS DecisionMetric,
    CAST(NULL AS varchar(100)) AS LogType,
    CAST(NULL AS varchar(100)) AS LogDetail,
    CAST(NULL AS varchar(100)) AS LogSubDetail,
    CAST(NULL AS varchar(max)) AS Comments,
    CAST(NULL AS int) AS RoleId,
    CAST(NULL AS bit) AS IsHandover,
    CAST(NULL AS bit) AS IsOngoing,
    CAST(NULL AS int) AS DecisionLogPageId,
    CAST(NULL AS bigint) AS AttachedAlertId,
    CAST(NULL AS int) AS AttachedAlertType,
    CAST(NULL AS varchar(200)) AS AttachedAlertTypeTitle,
    CAST(NULL AS varchar(200)) AS AttachedAlertTitle,
    CAST(NULL AS varchar(100)) AS AttachedAlertUnit,
    CAST(NULL AS datetime) AS AttachedAlertTimestampUtc
FROM ShiftWindow sw

UNION ALL

SELECT
    'mineKpi' AS RowType,
    'mine' AS MetricGroup,
    sw.QueryRunTimeUtc,
    sw.QueryRunTimeLocalUtcPlus8,
    sw.ShiftStartUtc,
    sw.ShiftStartLocalUtcPlus8,
    mk.MetricTimestampUtc,
    mk.MineKpiId,
    CAST(NULL AS int) AS PlantKpiId,
    mk.MetricName,
    mk.Pit AS MetricScope,
    mk.Value AS MetricValue,
    CAST(NULL AS bigint) AS DecisionId,
    CAST(NULL AS datetime) AS DecisionTimestampUtc,
    CAST(NULL AS varchar(100)) AS ChangeLoggedBy,
    CAST(NULL AS varchar(100)) AS Pit,
    CAST(NULL AS varchar(100)) AS EquipmentName,
    CAST(NULL AS varchar(100)) AS EquipmentType,
    CAST(NULL AS varchar(100)) AS DecisionMetric,
    CAST(NULL AS varchar(100)) AS LogType,
    CAST(NULL AS varchar(100)) AS LogDetail,
    CAST(NULL AS varchar(100)) AS LogSubDetail,
    CAST(NULL AS varchar(max)) AS Comments,
    CAST(NULL AS int) AS RoleId,
    CAST(NULL AS bit) AS IsHandover,
    CAST(NULL AS bit) AS IsOngoing,
    CAST(NULL AS int) AS DecisionLogPageId,
    CAST(NULL AS bigint) AS AttachedAlertId,
    CAST(NULL AS int) AS AttachedAlertType,
    CAST(NULL AS varchar(200)) AS AttachedAlertTypeTitle,
    CAST(NULL AS varchar(200)) AS AttachedAlertTitle,
    CAST(NULL AS varchar(100)) AS AttachedAlertUnit,
    CAST(NULL AS datetime) AS AttachedAlertTimestampUtc
FROM MineKpis mk
CROSS JOIN ShiftWindow sw

UNION ALL

SELECT
    'plantKpi' AS RowType,
    'plant' AS MetricGroup,
    sw.QueryRunTimeUtc,
    sw.QueryRunTimeLocalUtcPlus8,
    sw.ShiftStartUtc,
    sw.ShiftStartLocalUtcPlus8,
    pk.MetricTimestampUtc,
    CAST(NULL AS int) AS MineKpiId,
    pk.PlantKpiId,
    pk.MetricName,
    pk.PlantName AS MetricScope,
    pk.Value AS MetricValue,
    CAST(NULL AS bigint) AS DecisionId,
    CAST(NULL AS datetime) AS DecisionTimestampUtc,
    CAST(NULL AS varchar(100)) AS ChangeLoggedBy,
    CAST(NULL AS varchar(100)) AS Pit,
    CAST(NULL AS varchar(100)) AS EquipmentName,
    CAST(NULL AS varchar(100)) AS EquipmentType,
    CAST(NULL AS varchar(100)) AS DecisionMetric,
    CAST(NULL AS varchar(100)) AS LogType,
    CAST(NULL AS varchar(100)) AS LogDetail,
    CAST(NULL AS varchar(100)) AS LogSubDetail,
    CAST(NULL AS varchar(max)) AS Comments,
    CAST(NULL AS int) AS RoleId,
    CAST(NULL AS bit) AS IsHandover,
    CAST(NULL AS bit) AS IsOngoing,
    CAST(NULL AS int) AS DecisionLogPageId,
    CAST(NULL AS bigint) AS AttachedAlertId,
    CAST(NULL AS int) AS AttachedAlertType,
    CAST(NULL AS varchar(200)) AS AttachedAlertTypeTitle,
    CAST(NULL AS varchar(200)) AS AttachedAlertTitle,
    CAST(NULL AS varchar(100)) AS AttachedAlertUnit,
    CAST(NULL AS datetime) AS AttachedAlertTimestampUtc
FROM PlantKpis pk
CROSS JOIN ShiftWindow sw

UNION ALL

SELECT
    'decisionLog' AS RowType,
    CAST(NULL AS varchar(50)) AS MetricGroup,
    sw.QueryRunTimeUtc,
    sw.QueryRunTimeLocalUtcPlus8,
    sw.ShiftStartUtc,
    sw.ShiftStartLocalUtcPlus8,
    CAST(NULL AS datetime) AS MetricTimestampUtc,
    CAST(NULL AS int) AS MineKpiId,
    CAST(NULL AS int) AS PlantKpiId,
    CAST(NULL AS varchar(100)) AS MetricName,
    CAST(NULL AS varchar(100)) AS MetricScope,
    CAST(NULL AS varchar(100)) AS MetricValue,
    dr.DecisionId,
    dr.DecisionTimestampUtc,
    dr.ChangeLoggedBy,
    dr.Pit,
    dr.EquipmentName,
    dr.EquipmentType,
    dr.Metric AS DecisionMetric,
    dr.LogType,
    dr.LogDetail,
    dr.LogSubDetail,
    dr.Comments,
    dr.RoleId,
    dr.IsHandover,
    dr.IsOngoing,
    dr.DecisionLogPageId,
    dr.AttachedAlertId,
    dr.AttachedAlertType,
    dr.AttachedAlertTypeTitle,
    dr.AttachedAlertTitle,
    dr.AttachedAlertUnit,
    dr.AttachedAlertTimestampUtc
FROM DecisionRows dr
CROSS JOIN ShiftWindow sw

ORDER BY
    CASE RowType
        WHEN 'shiftWindow' THEN 1
        WHEN 'mineKpi' THEN 2
        WHEN 'plantKpi' THEN 3
        WHEN 'decisionLog' THEN 4
        ELSE 5
    END,
    MetricName,
    MetricScope,
    DecisionTimestampUtc DESC,
    DecisionId DESC;
