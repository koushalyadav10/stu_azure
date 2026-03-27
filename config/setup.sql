-- ============================================================
-- Student Management System — Azure SQL Setup Script
-- Run these queries in Azure Query Editor or SSMS
-- ============================================================

-- 1. Create Users table
CREATE TABLE Users (
    id          INT           IDENTITY(1,1) PRIMARY KEY,
    username    NVARCHAR(50)  NOT NULL UNIQUE,
    email       NVARCHAR(100) NOT NULL UNIQUE,
    password    NVARCHAR(255) NOT NULL,          -- bcrypt hash
    role        NVARCHAR(10)  NOT NULL DEFAULT 'user'
                              CHECK (role IN ('admin', 'user')),
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- 2. Create Students table
CREATE TABLE Students (
    id          INT           IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,
    email       NVARCHAR(100) NULL,
    marks       DECIMAL(5,2)  NOT NULL CHECK (marks >= 0 AND marks <= 100),
    grade       AS (
        CASE
            WHEN marks >= 90 THEN 'A+'
            WHEN marks >= 80 THEN 'A'
            WHEN marks >= 70 THEN 'B'
            WHEN marks >= 60 THEN 'C'
            WHEN marks >= 50 THEN 'D'
            ELSE 'F'
        END
    ) PERSISTED,
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- 3. Create indexes for common queries
CREATE INDEX IX_Students_Name  ON Students (name);
CREATE INDEX IX_Students_Marks ON Students (marks);
CREATE INDEX IX_Users_Username ON Users (username);
CREATE INDEX IX_Users_Email    ON Users (email);

-- 4. Seed an admin account
-- password = "Admin@123"  (bcrypt hash below — regenerate for production!)
INSERT INTO Users (username, email, password, role)
VALUES (
    'admin',
    'admin@sms.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewjDrMCU9z0i0Gby',
    'admin'
);

-- 5. Seed some sample students
INSERT INTO Students (name, email, marks) VALUES
    ('Aarav Sharma',    'aarav@example.com',   92.5),
    ('Priya Patel',     'priya@example.com',   85.0),
    ('Rohan Mehta',     'rohan@example.com',   78.3),
    ('Sneha Gupta',     'sneha@example.com',   65.7),
    ('Arjun Singh',     'arjun@example.com',   55.0),
    ('Kavya Nair',      'kavya@example.com',   45.8),
    ('Vikram Reddy',    'vikram@example.com',  88.2),
    ('Ananya Joshi',    'ananya@example.com',  73.1),
    ('Karan Malhotra',  'karan@example.com',   91.0),
    ('Divya Iyer',      'divya@example.com',   60.4);