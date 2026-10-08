-- =====================================================================
-- Task 1: Seed Data for Fee Management System
-- Target: Azure SQL Database
-- Description: Populates 22 Students (Overdue, Partially Paid, Paid)
--              and 3 Administrators for RBAC testing.
-- =====================================================================

-- 1. Insert Administrators (for Task 4 RBAC)
INSERT INTO dbo.Administrators (AdminID, Name, Email, Role, IsActive)
VALUES
('ADM-001', 'Sarah Jenkins', 'sarah.jenkins@university.edu', 'FinanceAdmin', 1),
('ADM-002', 'David Rodriguez', 'david.rodriguez@university.edu', 'SuperAdmin', 1),
('ADM-003', 'Anita Sharma', 'anita.sharma@university.edu', 'FinanceAdmin', 1);

-- 2. Insert Students (Mix of Overdue, Partially Paid, and Paid)
-- Notes:
--   - Dates in the past with balance remaining -> Overdue
--   - Balance remaining with DueDate in future -> Partially Paid
--   - PaidAmount = TotalFee -> Paid
INSERT INTO dbo.Students (StudentID, Name, Email, Course, TotalFee, PaidAmount, DueDate)
VALUES
-- === OVERDUE STUDENTS (DueDate has passed, fee not fully paid) ===
('STU-1001', 'Aarav Patel',       'aarav.patel@student.edu',       'Computer Science',        5000.00, 1500.00, '2026-08-15'),
('STU-1002', 'Liam O''Connor',     'liam.oconnor@student.edu',     'Data Science',            5200.00,    0.00, '2026-09-01'),
('STU-1003', 'Maya Lin',          'maya.lin@student.edu',          'Cloud Architecture',      4800.00, 2000.00, '2026-09-10'),
('STU-1004', 'Carlos Gomez',      'carlos.gomez@student.edu',      'Cybersecurity',           5500.00, 1000.00, '2026-09-20'),
('STU-1005', 'Fatima Al-Sayed',   'fatima.alsayed@student.edu',    'Artificial Intelligence', 6000.00,    0.00, '2026-09-25'),
('STU-1006', 'Ethan Walker',      'ethan.walker@student.edu',      'Software Engineering',    4500.00, 1500.00, '2026-09-30'),
('STU-1007', 'Zoe Martin',        'zoe.martin@student.edu',        'Business Analytics',      4200.00, 2100.00, '2026-10-01'),

-- === PARTIALLY PAID (DueDate in the future, partial balance paid) ===
('STU-1008', 'Rohan Verma',       'rohan.verma@student.edu',       'Computer Science',        5000.00, 2500.00, '2026-11-15'),
('STU-1009', 'Emma Watson',       'emma.watson@student.edu',       'Data Science',            5200.00, 3000.00, '2026-11-20'),
('STU-1010', 'Noah Kim',          'noah.kim@student.edu',          'Cloud Architecture',      4800.00, 2400.00, '2026-12-01'),
('STU-1011', 'Sophia Rossi',      'sophia.rossi@student.edu',      'Cybersecurity',           5500.00, 4000.00, '2026-12-05'),
('STU-1012', 'Lucas Silva',       'lucas.silva@student.edu',       'Artificial Intelligence', 6000.00, 3500.00, '2026-12-10'),
('STU-1013', 'Chloe Dubois',      'chloe.dubois@student.edu',      'Software Engineering',    4500.00, 2250.00, '2026-12-15'),
('STU-1014', 'Arjun Nair',        'arjun.nair@student.edu',        'Business Analytics',      4200.00, 2000.00, '2026-12-20'),

-- === FULLY PAID STUDENTS (PaidAmount equals TotalFee) ===
('STU-1015', 'Olivia Brown',      'olivia.brown@student.edu',      'Computer Science',        5000.00, 5000.00, '2026-08-01'),
('STU-1016', 'Alexander Wright',  'alexander.wright@student.edu',  'Data Science',            5200.00, 5200.00, '2026-08-15'),
('STU-1017', 'Isabella Garcia',   'isabella.garcia@student.edu',   'Cloud Architecture',      4800.00, 4800.00, '2026-09-01'),
('STU-1018', 'Benjamin Scott',    'benjamin.scott@student.edu',    'Cybersecurity',           5500.00, 5500.00, '2026-09-15'),
('STU-1019', 'Mia Takahashi',     'mia.takahashi@student.edu',     'Artificial Intelligence', 6000.00, 6000.00, '2026-10-01'),
('STU-1020', 'James Wilson',      'james.wilson@student.edu',      'Software Engineering',    4500.00, 4500.00, '2026-11-01'),
('STU-1021', 'Emily Chen',        'emily.chen@student.edu',        'Business Analytics',      4200.00, 4200.00, '2026-11-15'),
('STU-1022', 'Daniel Miller',     'daniel.miller@student.edu',     'Computer Science',        5000.00, 5000.00, '2026-12-01');

-- Verification Query to check the inserted data and payment statuses
SELECT 
    StudentID,
    Name,
    Course,
    TotalFee,
    PaidAmount,
    DueDate,
    CASE 
        WHEN PaidAmount >= TotalFee THEN 'Paid'
        WHEN DueDate < CAST(SYSUTCDATETIME() AS DATE) AND PaidAmount < TotalFee THEN 'Overdue'
        WHEN PaidAmount > 0 AND PaidAmount < TotalFee THEN 'Partially Paid'
        ELSE 'Unpaid'
    END AS PaymentStatus
FROM dbo.Students
ORDER BY DueDate ASC;
