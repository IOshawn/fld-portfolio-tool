/*
Pruned SQL bundle for Connected Yan / TrueView alerting and performance metrics.

Scope:
- Live and shift-to-date KPI source tables used by alerting/reporting
- Smart alert workflow and metrics tables
- Decision log table
- Supporting configuration/subscription/state tables

Notes:
- This is a curated bundle derived from the backend migration project and repository usage.
- It is intentionally narrower than the full TrueView schema.
- Site-specific seeds, reporting stored procedures, and many unrelated operational tables are omitted.
- A few foreign keys from the original solution to broader reference tables such as Role are omitted
  to keep this bundle self-contained.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* -------------------------------------------------------------------------- */
/* Reference tables                                                            */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.AggregationType', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AggregationType (
        Id smallint NOT NULL,
        Name varchar(20) NOT NULL,
        CONSTRAINT PK_AggregationType PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.UnitType', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UnitType (
        Id smallint NOT NULL,
        Name varchar(10) NOT NULL,
        CONSTRAINT PK_UnitType PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT UQ_UnitType_Name UNIQUE (Name)
    );
END;
GO

IF OBJECT_ID(N'dbo.AlertType', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertType (
        Id smallint NOT NULL,
        Description varchar(120) NOT NULL,
        IsSmartAlert bit NOT NULL,
        IsActive bit NOT NULL,
        Title varchar(80) NOT NULL,
        ConfigurableSetting varchar(30) NULL,
        CONSTRAINT PK_AlertType PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.AlertTypeRoleSetting', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertTypeRoleSetting (
        AlertTypeId smallint NOT NULL,
        RoleId smallint NOT NULL,
        IsActionable bit NOT NULL,
        IsDefaultSubscribed bit NULL,
        IsDefaultViewDashboard bit NULL,
        CONSTRAINT PK_AlertTypeRoleSetting PRIMARY KEY CLUSTERED (AlertTypeId ASC, RoleId ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.AlertTypeConfiguration', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertTypeConfiguration (
        AlertTypeId smallint NOT NULL,
        Configuration varchar(30) NOT NULL,
        Value float NOT NULL,
        UnitTypeId smallint NOT NULL,
        UpdateTimestamp datetime NULL,
        UpdatedBy varchar(40) NULL,
        CONSTRAINT PK_AlertTypeConfiguration PRIMARY KEY CLUSTERED (AlertTypeId ASC, Configuration ASC),
        CONSTRAINT FK_AlertTypeConfiguration_AlertType
            FOREIGN KEY (AlertTypeId) REFERENCES dbo.AlertType (Id),
        CONSTRAINT FK_AlertTypeConfiguration_UnitType
            FOREIGN KEY (UnitTypeId) REFERENCES dbo.UnitType (Id)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Core alert tables                                                           */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.Alert', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Alert (
        Id int IDENTITY(1,1) NOT NULL,
        SiteCode varchar(3) NOT NULL,
        AlertType smallint NOT NULL,
        Unit varchar(100) NULL,
        TimeStamp datetime NOT NULL,
        Title varchar(100) NOT NULL,
        Message varchar(200) NOT NULL,
        CONSTRAINT PK_Alert PRIMARY KEY CLUSTERED (TimeStamp ASC, SiteCode ASC, Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.AlertState', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertState (
        SiteCode varchar(3) NOT NULL,
        AlertType smallint NOT NULL,
        EquipmentName varchar(30) NOT NULL,
        LastAlertTime datetime NULL,
        IsActive bit NULL,
        Properties varchar(max) NULL,
        CONSTRAINT PK_AlertState PRIMARY KEY CLUSTERED (SiteCode ASC, AlertType ASC, EquipmentName ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.AlertStateForHaulRoute', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertStateForHaulRoute (
        SiteCode varchar(3) NOT NULL,
        AlertType smallint NOT NULL,
        HaulType nvarchar(100) NOT NULL,
        Source varchar(40) NULL,
        Destination varchar(40) NULL,
        LastAlertTime datetime NULL,
        IsActive bit NULL,
        LastHaulDateTime datetime NULL,
        LastHaulTime int NULL,
        AverageHaulTime int NULL,
        Hauler varchar(10) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.DrillDelayAlertState', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DrillDelayAlertState (
        DrillId varchar(50) NOT NULL,
        DelayCodeId int NOT NULL,
        LastAlertTime datetime NOT NULL,
        CONSTRAINT PK_DrillDelayAlertState PRIMARY KEY CLUSTERED (DrillId ASC, DelayCodeId ASC)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Smart alert workflow                                                        */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.SmartAlert', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlert (
        Id int IDENTITY(1,1) NOT NULL,
        AlertId int NOT NULL,
        AlertStatus smallint NOT NULL,
        AlertReason nvarchar(50) NULL,
        AlertAction nvarchar(100) NULL,
        AlertOtherAction nvarchar(100) NULL,
        SubmittedBy nvarchar(50) NULL,
        Reason varchar(150) NULL,
        Action varchar(150) NULL,
        SubmittedDate datetime NULL,
        CONSTRAINT PK_SmartAlert PRIMARY KEY CLUSTERED (Id ASC, AlertId ASC),
        CONSTRAINT FK_SmartAlert_Alert
            FOREIGN KEY (AlertId) REFERENCES dbo.Alert (Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertCondition', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertCondition (
        Id int IDENTITY(1,1) NOT NULL,
        Condition nvarchar(50) NOT NULL,
        AlertId int NULL,
        CONSTRAINT PK_SmartAlertCondition PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertAction', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertAction (
        Id int IDENTITY(1,1) NOT NULL,
        ConditionId int NOT NULL,
        Action nvarchar(50) NOT NULL,
        Mine nvarchar(50) NULL,
        CONSTRAINT PK_SmartAlertAction PRIMARY KEY CLUSTERED (Id ASC, ConditionId ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertandMetrics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertandMetrics (
        Id int IDENTITY(1,1) NOT NULL,
        AlertId int NOT NULL,
        JsonResult varchar(max) NULL,
        CONSTRAINT PK_SmartAlertandMetrics PRIMARY KEY CLUSTERED (AlertId ASC),
        CONSTRAINT FK_SmartAlertandMetrics_Alert
            FOREIGN KEY (AlertId) REFERENCES dbo.Alert (Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertMetricsExcessiveCycleTime', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertMetricsExcessiveCycleTime (
        Id int IDENTITY(1,1) NOT NULL,
        AlertId int NOT NULL,
        AverageTime float NULL,
        ShiftAverage float NULL,
        FourShiftAverage float NULL,
        HaulFullTime float NULL,
        TotalIdleTime float NULL,
        Payload float NULL,
        HaulName varchar(50) NULL,
        TypeOfInteraction_TypeOfEvent varchar(50) NULL,
        Destination varchar(50) NULL,
        Loader varchar(50) NULL,
        CONSTRAINT PK_SmartAlertMetricsExcessiveCycleTime PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_SmartAlertMetricsExcessiveCycleTime_Alert
            FOREIGN KEY (AlertId) REFERENCES dbo.Alert (Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertDrillHoleTrendAlertState', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertDrillHoleTrendAlertState (
        TimeStamp datetime NOT NULL,
        DrillId varchar(10) NOT NULL,
        CONSTRAINT PK_SmartAlertDrillHoleTrendAlertState PRIMARY KEY CLUSTERED (TimeStamp ASC, DrillId ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertExcessiveTruckDelayConfiguration', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertExcessiveTruckDelayConfiguration (
        ReasonCode smallint NOT NULL,
        Threshold time(0) NOT NULL,
        TargetDuration time(0) NOT NULL,
        CustomReasonDesc varchar(20) NULL,
        CONSTRAINT PK_SmartAlertExcessiveTruckDelayConfiguration PRIMARY KEY CLUSTERED (ReasonCode ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.SmartAlertExcessiveTruckDelayAlertState', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartAlertExcessiveTruckDelayAlertState (
        Truck varchar(10) NOT NULL,
        ReasonCode smallint NOT NULL,
        LastAlertTime datetime NOT NULL,
        CONSTRAINT PK_SmartAlertExcessiveTruckDelayAlertState PRIMARY KEY CLUSTERED (Truck ASC, ReasonCode ASC)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Subscriptions and recipients                                                */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.UserRoleAlertSubscription', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserRoleAlertSubscription (
        UserId varchar(36) NOT NULL,
        RoleId smallint NOT NULL,
        AlertTypeId smallint NOT NULL,
        IsSubscribedBySms bit NOT NULL,
        IsSubscribedByEmail bit NOT NULL,
        IsSubscribedByInApp bit NOT NULL,
        IsSubscribedInDashboard bit NOT NULL,
        CONSTRAINT PK_UserRoleAlertSubscription PRIMARY KEY CLUSTERED (UserId ASC, RoleId ASC, AlertTypeId ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.StakeHolder', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StakeHolder (
        EmailAddress varchar(100) NOT NULL,
        Mobile varchar(20) NULL,
        UserId varchar(100) NULL,
        CONSTRAINT PK_StakeHolder PRIMARY KEY CLUSTERED (EmailAddress ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.UserLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserLogs (
        Id int IDENTITY(1,1) NOT NULL,
        UserId varchar(36) NOT NULL,
        RoleId int NOT NULL,
        SiteCode varchar(3) NOT NULL,
        UserName varchar(100) NULL,
        State int NOT NULL,
        TimeStamp datetime NOT NULL,
        EmailAdd varchar(100) NULL,
        AppVersion varchar(50) NULL,
        DeviceModel varchar(100) NULL,
        DevicePlatform varchar(30) NULL,
        DeviceIdiom varchar(30) NULL,
        CONSTRAINT PK_UserLogs PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Decision logs                                                               */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.ValueDecision', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ValueDecision (
        Id int IDENTITY(1,1) NOT NULL,
        TimeStamp datetime NOT NULL,
        ChangeLoggedBy varchar(100) NULL,
        EquipmentName varchar(50) NOT NULL,
        EquipmentType varchar(50) NOT NULL,
        Metric varchar(100) NULL,
        PreTimeStamp varchar(100) NULL,
        PostTimeStamp varchar(100) NULL,
        Comments varchar(300) NULL,
        UtcTimeStamp datetime NULL,
        ShiftLogPage varchar(50) NULL,
        LogType varchar(50) NULL,
        LogDetail varchar(100) NULL,
        LogSubDetail varchar(100) NULL,
        CONSTRAINT PK_ValueDecision PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Live / shift metrics source tables                                          */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.Equipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Equipment (
        Name varchar(20) NOT NULL,
        SiteCode varchar(3) NOT NULL,
        Type varchar(20) NOT NULL,
        CONSTRAINT PK_Equipment PRIMARY KEY CLUSTERED (Name ASC, SiteCode ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.EquipmentPosition', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EquipmentPosition (
        EquipmentName varchar(10) NOT NULL,
        SiteCode varchar(3) NOT NULL,
        PositionTimestamp datetime NOT NULL,
        OperatorName varchar(30) NULL,
        LocationName varchar(30) NULL,
        Orientation float NULL,
        X float NOT NULL,
        Y float NOT NULL,
        Z float NOT NULL,
        EquipmentType tinyint NOT NULL,
        InsertTimeStamp datetime NULL,
        UpdateTimeStamp datetime NULL,
        System_Date datetime NULL,
        Id_Transaction varchar(50) NULL,
        Id int IDENTITY(1,1) NOT NULL,
        Id_Tenant int NULL,
        Id_Enterprise int NULL,
        CONSTRAINT PK_EquipmentPosition PRIMARY KEY CLUSTERED (PositionTimestamp DESC, SiteCode ASC, EquipmentName ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.EquipmentStatus', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EquipmentStatus (
        EquipmentName varchar(10) NOT NULL,
        SiteCode varchar(3) NOT NULL,
        TimeStamp datetime NOT NULL,
        Status varchar(30) NULL,
        TimeInState int NULL,
        ReasonCode int NULL,
        ReasonDesc varchar(30) NULL,
        EquipmentType tinyint NOT NULL,
        InsertTimeStamp datetime NULL,
        UpdateTimeStamp datetime NULL,
        Id_Transaction varchar(50) NULL,
        CONSTRAINT PK_EquipmentStatus PRIMARY KEY CLUSTERED (TimeStamp DESC, SiteCode ASC, EquipmentName ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.EquipmentKpi', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EquipmentKpi (
        Id smallint NOT NULL,
        Name varchar(100) NOT NULL,
        CONSTRAINT PK_EquipmentKpi PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.EquipmentKpiData', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EquipmentKpiData (
        EquipmentName varchar(20) NOT NULL,
        TimeStamp datetime NOT NULL,
        EquipmentKpiId smallint NOT NULL,
        Value varchar(100) NULL,
        UpdateTimeStamp datetime NULL,
        CONSTRAINT PK_EquipmentKpiData PRIMARY KEY CLUSTERED (EquipmentName ASC, TimeStamp ASC, EquipmentKpiId ASC),
        CONSTRAINT FK_EquipmentKpiData_EquipmentKpi
            FOREIGN KEY (EquipmentKpiId) REFERENCES dbo.EquipmentKpi (Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.MineKpi', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MineKpi (
        Id smallint NOT NULL,
        Name varchar(100) NOT NULL,
        UnitType varchar(20) NULL,
        IsCumulative bit NULL,
        CONSTRAINT PK_MineKpi PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.MineKpiData', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MineKpiData (
        TimeStamp datetime NOT NULL,
        MineKpiId smallint NOT NULL,
        AggregationTypeId smallint NOT NULL,
        Value varchar(100) NULL,
        UnitType varchar(20) NULL,
        IsCumulative bit NULL,
        CONSTRAINT PK_MineKpiData PRIMARY KEY CLUSTERED (TimeStamp ASC, MineKpiId ASC, AggregationTypeId ASC),
        CONSTRAINT FK_MineKpiData_MineKpi
            FOREIGN KEY (MineKpiId) REFERENCES dbo.MineKpi (Id),
        CONSTRAINT FK_MineKpiData_AggregationType
            FOREIGN KEY (AggregationTypeId) REFERENCES dbo.AggregationType (Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.RouteKpi', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RouteKpi (
        Id smallint NOT NULL,
        Name varchar(100) NOT NULL,
        CONSTRAINT PK_RouteKpi PRIMARY KEY CLUSTERED (Id ASC)
    );
END;
GO

IF OBJECT_ID(N'dbo.RouteKpiData', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RouteKpiData (
        Excavator varchar(20) NOT NULL,
        Location varchar(50) NOT NULL,
        TimeStamp datetime NOT NULL,
        RouteKpiId smallint NOT NULL,
        AggregationTypeId smallint NOT NULL,
        Value varchar(100) NULL,
        CONSTRAINT PK_RouteKpiData PRIMARY KEY CLUSTERED (Excavator ASC, Location ASC, TimeStamp ASC, RouteKpiId ASC, AggregationTypeId ASC),
        CONSTRAINT FK_RouteKpiData_RouteKpi
            FOREIGN KEY (RouteKpiId) REFERENCES dbo.RouteKpi (Id),
        CONSTRAINT FK_RouteKpiData_AggregationType
            FOREIGN KEY (AggregationTypeId) REFERENCES dbo.AggregationType (Id)
    );
END;
GO

/* -------------------------------------------------------------------------- */
/* Helpful indexes for the main query paths                                    */
/* -------------------------------------------------------------------------- */

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Alert_SiteCode_TimeStamp_AlertType'
      AND object_id = OBJECT_ID(N'dbo.Alert')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Alert_SiteCode_TimeStamp_AlertType
        ON dbo.Alert (SiteCode, TimeStamp, AlertType)
        INCLUDE (Unit, Title, Message);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_SmartAlert_AlertId'
      AND object_id = OBJECT_ID(N'dbo.SmartAlert')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SmartAlert_AlertId
        ON dbo.SmartAlert (AlertId)
        INCLUDE (AlertStatus, AlertReason, AlertAction, Reason, Action, SubmittedBy, SubmittedDate);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ValueDecision_TimeStamp'
      AND object_id = OBJECT_ID(N'dbo.ValueDecision')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ValueDecision_TimeStamp
        ON dbo.ValueDecision (TimeStamp)
        INCLUDE (ChangeLoggedBy, Metric, Comments, ShiftLogPage, LogType, LogDetail, LogSubDetail);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_EquipmentStatus_EquipmentName_TimeStamp'
      AND object_id = OBJECT_ID(N'dbo.EquipmentStatus')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_EquipmentStatus_EquipmentName_TimeStamp
        ON dbo.EquipmentStatus (EquipmentName, TimeStamp DESC)
        INCLUDE (Status, TimeInState, ReasonCode, ReasonDesc, EquipmentType, SiteCode);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_EquipmentKpiData_TimeStamp_EquipmentKpiId'
      AND object_id = OBJECT_ID(N'dbo.EquipmentKpiData')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_EquipmentKpiData_TimeStamp_EquipmentKpiId
        ON dbo.EquipmentKpiData (TimeStamp, EquipmentKpiId)
        INCLUDE (EquipmentName, Value, UpdateTimeStamp);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_MineKpiData_TimeStamp_MineKpiId_AggregationTypeId'
      AND object_id = OBJECT_ID(N'dbo.MineKpiData')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_MineKpiData_TimeStamp_MineKpiId_AggregationTypeId
        ON dbo.MineKpiData (TimeStamp, MineKpiId, AggregationTypeId)
        INCLUDE (Value, UnitType, IsCumulative);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_RouteKpiData_TimeStamp_RouteKpiId_AggregationTypeId'
      AND object_id = OBJECT_ID(N'dbo.RouteKpiData')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_RouteKpiData_TimeStamp_RouteKpiId_AggregationTypeId
        ON dbo.RouteKpiData (TimeStamp, RouteKpiId, AggregationTypeId)
        INCLUDE (Excavator, Location, Value);
END;
GO

/* -------------------------------------------------------------------------- */
/* Optional seed rows copied from migrated backend behavior                    */
/* -------------------------------------------------------------------------- */

MERGE dbo.UnitType AS target
USING (
    VALUES
        (1, 'Percentage'),
        (6, 'Number'),
        (12, 'Minutes'),
        (22, 'Seconds'),
        (23, 'Hours')
) AS source (Id, Name)
ON target.Id = source.Id
WHEN NOT MATCHED THEN
    INSERT (Id, Name) VALUES (source.Id, source.Name);
GO

MERGE dbo.SmartAlertExcessiveTruckDelayConfiguration AS target
USING (
    VALUES
        (1520, CAST('00:30:00' AS time(0)), CAST('00:25:00' AS time(0)), NULL),
        (1901, CAST('00:40:00' AS time(0)), CAST('00:30:00' AS time(0)), 'Crib'),
        (1902, CAST('00:15:00' AS time(0)), CAST('00:10:00' AS time(0)), NULL),
        (1903, CAST('00:20:00' AS time(0)), CAST('00:15:00' AS time(0)), 'Fatigue'),
        (1905, CAST('00:10:00' AS time(0)), CAST('00:05:00' AS time(0)), 'Swap Operator'),
        (1906, CAST('00:40:00' AS time(0)), CAST('00:30:00' AS time(0)), NULL),
        (1910, CAST('00:40:00' AS time(0)), CAST('00:30:00' AS time(0)), NULL),
        (1912, CAST('00:25:00' AS time(0)), CAST('00:20:00' AS time(0)), 'Return from Service')
) AS source (ReasonCode, Threshold, TargetDuration, CustomReasonDesc)
ON target.ReasonCode = source.ReasonCode
WHEN NOT MATCHED THEN
    INSERT (ReasonCode, Threshold, TargetDuration, CustomReasonDesc)
    VALUES (source.ReasonCode, source.Threshold, source.TargetDuration, source.CustomReasonDesc);
GO
