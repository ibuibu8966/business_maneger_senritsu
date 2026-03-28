-- Add new enum values
ALTER TYPE "EmployeeRole" ADD VALUE IF NOT EXISTS 'MASTER_ADMIN';
ALTER TYPE "EmployeeRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';

-- Convert existing USER rows to EMPLOYEE
UPDATE employees SET role = 'EMPLOYEE' WHERE role = 'USER';

-- Promote existing ADMIN users to MASTER_ADMIN
UPDATE employees SET role = 'MASTER_ADMIN' WHERE role = 'ADMIN';

-- Recreate enum without USER (PostgreSQL requires type recreation)
ALTER TYPE "EmployeeRole" RENAME TO "EmployeeRole_old";
CREATE TYPE "EmployeeRole" AS ENUM ('MASTER_ADMIN', 'ADMIN', 'EMPLOYEE');
ALTER TABLE employees ALTER COLUMN role DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN role TYPE "EmployeeRole" USING role::text::"EmployeeRole";
ALTER TABLE employees ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
DROP TYPE "EmployeeRole_old";
