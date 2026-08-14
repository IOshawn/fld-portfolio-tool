-- Frontline Digital Portfolio Hub - Azure SQL schema (schema: phub)
-- Safe to run against an EXISTING database: creates its own 'phub' schema and tables,
-- leaving anything already in the database untouched.
-- Run once (portal Query editor, or: sqlcmd -i schema.sql).

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'phub')
    EXEC('CREATE SCHEMA phub');
GO
IF OBJECT_ID('phub.Projects','U') IS NULL
CREATE TABLE phub.Projects (
  [id]               NVARCHAR(100) NOT NULL PRIMARY KEY,
  [title]            NVARCHAR(200) NOT NULL,
  [abbrev]           NVARCHAR(20),
  [portfolio]        NVARCHAR(100),
  [productArea]      NVARCHAR(100),
  [owner]            NVARCHAR(150),
  [sponsor]          NVARCHAR(150),
  [stage]            NVARCHAR(50),
  [status]           NVARCHAR(50),
  [startDate]        DATE,
  [endDate]          DATE,
  [summary]          NVARCHAR(MAX),
  [outcomeStatement] NVARCHAR(MAX),
  [businessValue]    NVARCHAR(MAX),
  [dependencies]     NVARCHAR(MAX),
  [fundingSource]    NVARCHAR(100),
  [projectCode]      NVARCHAR(50),
  [lastUpdate]       NVARCHAR(MAX),
  [lastUpdated]      DATE
);
GO
IF OBJECT_ID('phub.Milestones','U') IS NULL
CREATE TABLE phub.Milestones (
  [id]        INT IDENTITY(1,1) PRIMARY KEY,
  [projectId] NVARCHAR(100),
  [name]      NVARCHAR(200),
  [date]      DATE,
  [status]    NVARCHAR(50),
  [notes]     NVARCHAR(MAX)
);
GO
IF OBJECT_ID('phub.Engagements','U') IS NULL
CREATE TABLE phub.Engagements (
  [id]           INT IDENTITY(1,1) PRIMARY KEY,
  [initiativeId] NVARCHAR(100),
  [portfolio]    NVARCHAR(100),
  [site]         NVARCHAR(50),
  [workArea]     NVARCHAR(100),
  [team]         NVARCHAR(120),
  [stage]        NVARCHAR(50),
  [status]       NVARCHAR(50),
  [startDate]    DATE,
  [endDate]      DATE,
  [purpose]      NVARCHAR(MAX),
  [notes]        NVARCHAR(MAX)
);
GO
IF OBJECT_ID('phub.Updates','U') IS NULL
CREATE TABLE phub.Updates (
  [id]                INT IDENTITY(1,1) PRIMARY KEY,
  [projectId]         NVARCHAR(100),
  [date]              DATE,
  [summary]           NVARCHAR(MAX),
  [risks]             NVARCHAR(MAX),
  [decisionsRequired] NVARCHAR(MAX),
  [submittedBy]       NVARCHAR(150)
);
GO
IF OBJECT_ID('phub.TravelEntries','U') IS NULL
CREATE TABLE phub.TravelEntries (
  [id]             INT IDENTITY(1,1) PRIMARY KEY,
  [person]         NVARCHAR(150) NOT NULL,
  [initiativeId]   NVARCHAR(100),
  [site]           NVARCHAR(50),
  [workArea]       NVARCHAR(100),
  [team]           NVARCHAR(120),
  [departureDate]  DATE,
  [returnDate]     DATE,
  [flightNumber]   NVARCHAR(50),
  [description]    NVARCHAR(MAX),
  [status]         NVARCHAR(50),
  [associatedWith] NVARCHAR(MAX)
);
GO

-- =============================================================================
-- 2026-08-12: Functions v4 resource API contract migration
-- Additive and idempotent. Run before enabling VITE_USE_API=true.
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'nOrPCode')
    ALTER TABLE phub.Projects ADD [nOrPCode] NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'sites')
    ALTER TABLE phub.Projects ADD [sites] NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'projectStages')
    ALTER TABLE phub.Projects ADD [projectStages] NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'ownerEmail')
    ALTER TABLE phub.Projects ADD [ownerEmail] NVARCHAR(254) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'ownerCorpId')
    ALTER TABLE phub.Projects ADD [ownerCorpId] NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'sponsorEmail')
    ALTER TABLE phub.Projects ADD [sponsorEmail] NVARCHAR(254) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Projects') AND name = 'sponsorCorpId')
    ALTER TABLE phub.Projects ADD [sponsorCorpId] NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Updates') AND name = 'submittedByEmail')
    ALTER TABLE phub.Updates ADD [submittedByEmail] NVARCHAR(254) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.Updates') AND name = 'submittedByCorpId')
    ALTER TABLE phub.Updates ADD [submittedByCorpId] NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.TravelEntries') AND name = 'personEmail')
    ALTER TABLE phub.TravelEntries ADD [personEmail] NVARCHAR(254) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('phub.TravelEntries') AND name = 'personCorpId')
    ALTER TABLE phub.TravelEntries ADD [personCorpId] NVARCHAR(100) NULL;
GO

-- Keep historic seed data readable through the new API field name.
UPDATE phub.Projects SET [nOrPCode] = [projectCode]
WHERE [nOrPCode] IS NULL AND [projectCode] IS NOT NULL;
GO

UPDATE phub.Projects
SET [status] = CASE [status] WHEN 'Green' THEN 'On Track' WHEN 'Amber' THEN 'Off Track' WHEN 'Red' THEN 'At Risk' ELSE [status] END
WHERE [status] IN ('Green', 'Amber', 'Red');
GO
UPDATE phub.TravelEntries
SET [status] = CASE [status] WHEN 'Travelling' THEN 'Booked' WHEN 'Returned' THEN 'Booked' WHEN 'Cancelled' THEN 'Planned' ELSE [status] END
WHERE [status] IN ('Travelling', 'Returned', 'Cancelled');
GO

IF OBJECT_ID('phub.QuarterlyMilestones','U') IS NULL
CREATE TABLE phub.QuarterlyMilestones (
  [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
  [portfolioArea] NVARCHAR(100) NOT NULL,
  [subGroup] NVARCHAR(200) NULL,
  [initiative] NVARCHAR(200) NOT NULL,
  [initiativeDescription] NVARCHAR(MAX) NULL,
  [milestone] NVARCHAR(500) NOT NULL,
  [targetDate] DATE NULL,
  [dateLabel] NVARCHAR(50) NULL,
  [notes] NVARCHAR(MAX) NULL
);
GO

MERGE phub.QuarterlyMilestones AS target
USING (VALUES
  (N'qm-digby-1', N'Frontline', N'DIGBY', N'Digital control-room assistant for load-out and train scheduling', N'Design Sign-off', CAST(N'2026-09-30' AS DATE), N'Sep', N'Design phase complete and signed off by Control Room Digital stakeholders; solution architecture locked for build.'),
  (N'qm-digby-2', N'Frontline', N'DIGBY', N'Digital control-room assistant for load-out and train scheduling', N'Prototype Build', CAST(N'2026-11-30' AS DATE), N'Nov', N'Core assistant prototype built, covering standard train-scheduling responses and load-out guidance.'),
  (N'qm-digby-3', N'Frontline', N'DIGBY', N'Digital control-room assistant for load-out and train scheduling', N'Operator Pilot', CAST(N'2027-03-31' AS DATE), N'Q1 2027', N'Live pilot with control-room operators at first site; usability feedback gathered for full rollout planning.')
) AS source ([id], [portfolioArea], [initiative], [initiativeDescription], [milestone], [targetDate], [dateLabel], [notes])
ON target.[id] = source.[id]
WHEN MATCHED THEN UPDATE SET [portfolioArea] = source.[portfolioArea], [initiative] = source.[initiative], [initiativeDescription] = source.[initiativeDescription], [milestone] = source.[milestone], [targetDate] = source.[targetDate], [dateLabel] = source.[dateLabel], [notes] = source.[notes]
WHEN NOT MATCHED THEN INSERT ([id], [portfolioArea], [initiative], [initiativeDescription], [milestone], [targetDate], [dateLabel], [notes]) VALUES (source.[id], source.[portfolioArea], source.[initiative], source.[initiativeDescription], source.[milestone], source.[targetDate], source.[dateLabel], source.[notes]);
GO
