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
