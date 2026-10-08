-- =====================================================================
-- Task 1: Fee Management System - Database Schema
-- Target: Azure SQL Database
-- Description: Creates Students and Administrators tables with
--              appropriate constraints, data types, and indexes.
-- =====================================================================

-- 1. Drop existing tables if they already exist (idempotent setup)
IF OBJECT_ID('dbo.Students', 'U') IS NOT NULL 
    DROP TABLE dbo.Students;

IF OBJECT_ID('dbo.Administrators', 'U') IS NOT NULL 
    DROP TABLE dbo.Administrators;

-- 2. Create Students Table
CREATE TABLE dbo.Students (
    StudentID VARCHAR(20) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Course NVARCHAR(50) NOT NULL,
    TotalFee DECIMAL(10, 2) NOT NULL,
    PaidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    DueDate DATE NOT NULL,
    LastReminderSentUtc DATETIME2 NULL,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    -- Primary Key & Constraints
    CONSTRAINT PK_Students PRIMARY KEY CLUSTERED (StudentID),
    CONSTRAINT UQ_Students_Email UNIQUE (Email),
    CONSTRAINT CHK_Students_TotalFee CHECK (TotalFee >= 0.00),
    CONSTRAINT CHK_Students_PaidAmount CHECK (PaidAmount >= 0.00)
);

-- 3. Create Administrators Table (for Task 4 RBAC)
CREATE TABLE dbo.Administrators (
    AdminID VARCHAR(20) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'FinanceAdmin',
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    -- Primary Key & Constraints
    CONSTRAINT PK_Administrators PRIMARY KEY CLUSTERED (AdminID),
    CONSTRAINT UQ_Administrators_Email UNIQUE (Email)
);

-- 4. Create Indexes for High-Performance Queries (Task 5 Scalability: 5,000+ records)
-- Optimizes overdue student queries used by Logic Apps / Durable Functions
CREATE NONCLUSTERED INDEX IX_Students_DueDate_PaidAmount
ON dbo.Students (DueDate, PaidAmount, TotalFee)
INCLUDE (StudentID, Name, Email, Course);

-- Optimizes lookup by Email for student queries
CREATE NONCLUSTERED INDEX IX_Students_Email
ON dbo.Students (Email);

-- Optimizes lookup by Admin Email for JWT / Azure AD RBAC authentication check
CREATE NONCLUSTERED INDEX IX_Administrators_Email_IsActive
ON dbo.Administrators (Email, IsActive)
INCLUDE (AdminID, Name, Role);
