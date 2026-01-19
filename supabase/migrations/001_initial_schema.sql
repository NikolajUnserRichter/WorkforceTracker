-- ============================================================================
-- Workforce Tracker - Initial Database Schema
-- ============================================================================
-- Run this migration in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all tables, indexes, and RLS policies for the application
-- ============================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on-leave', 'terminated');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on-hold', 'cancelled');
CREATE TYPE reduction_status AS ENUM ('active', 'completed', 'cancelled');

-- ============================================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================================
-- Stores additional user metadata and role information
-- Links to Supabase's built-in auth.users table

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  departments TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Array of department codes user can access
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- ============================================================================
-- UPLOADS TABLE (tracks data import sessions)
-- ============================================================================
-- Each upload represents a snapshot import of workforce data

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,  -- in bytes
  total_records INTEGER NOT NULL DEFAULT 0,
  records_successful INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  processing_time_ms INTEGER,  -- duration in milliseconds
  error_log JSONB DEFAULT '[]'::JSONB,  -- array of error objects
  department_breakdown JSONB DEFAULT '{}'::JSONB,  -- department counts
  total_salary DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'completed',  -- 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for listing uploads by user and date
CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_created_at ON uploads(created_at DESC);

-- ============================================================================
-- EMPLOYEES TABLE (workforce records)
-- ============================================================================
-- Core employee data, linked to an upload for data lineage

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,  -- which import this came from
  employee_id TEXT NOT NULL,  -- business identifier (from HR system)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  division TEXT,
  company TEXT,
  country TEXT,
  role TEXT,  -- job title/role
  status employee_status DEFAULT 'active',
  fte DECIMAL(5, 2) DEFAULT 100.00,  -- Full-Time Equivalent percentage
  start_date DATE,
  end_date DATE,
  date_of_birth DATE,
  base_salary DECIMAL(15, 2),
  pay_scale TEXT,
  hourly_rate DECIMAL(10, 2),
  cost_center TEXT,
  manager_id TEXT,  -- reference to another employee's employee_id
  location TEXT,
  building TEXT,
  floor TEXT,
  desk TEXT,
  -- Reduction program embedded data (from imports)
  reduction_percentage DECIMAL(5, 2) DEFAULT 0,
  reduction_start_date DATE,
  reduction_end_date DATE,
  reduction_status reduction_status,
  -- Metadata
  raw_data JSONB,  -- original row data for reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: each employee_id must be unique per upload
CREATE UNIQUE INDEX idx_employees_upload_employee ON employees(upload_id, employee_id);

-- Indexes for common query patterns
CREATE INDEX idx_employees_upload_id ON employees(upload_id);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_email ON employees(email);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2),
  department TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_department ON projects(department);

-- ============================================================================
-- ASSIGNMENTS TABLE (employee-project assignments)
-- ============================================================================

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5, 2) DEFAULT 100.00,  -- % of time allocated
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate assignments
  UNIQUE(employee_id, project_id)
);

CREATE INDEX idx_assignments_employee ON assignments(employee_id);
CREATE INDEX idx_assignments_project ON assignments(project_id);

-- ============================================================================
-- IMPORT MAPPINGS TABLE (saved column mapping templates)
-- ============================================================================

CREATE TABLE import_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mapping JSONB NOT NULL,  -- column mapping configuration
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

CREATE INDEX idx_import_mappings_user ON import_mappings(user_id);

-- ============================================================================
-- REDUCTION PROGRAMS TABLE (standalone reduction tracking)
-- ============================================================================
-- For tracking reduction programs separately from employee imports

CREATE TABLE reduction_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  program_name TEXT,
  reduction_percentage DECIMAL(5, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status reduction_status DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reduction_programs_employee ON reduction_programs(employee_id);
CREATE INDEX idx_reduction_programs_status ON reduction_programs(status);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Automatically updates updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reduction_programs_updated_at
  BEFORE UPDATE ON reduction_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a department
CREATE OR REPLACE FUNCTION has_department_access(dept TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_depts TEXT[];
BEGIN
  SELECT departments INTO user_depts
  FROM profiles
  WHERE id = auth.uid() AND is_active = TRUE;

  -- Admin with 'ALL' access or matching department
  RETURN 'ALL' = ANY(user_depts) OR dept = ANY(user_depts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reduction_programs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert/delete profiles or change roles
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- ============================================================================
-- UPLOADS POLICIES
-- ============================================================================

-- Admins can view all uploads
CREATE POLICY "Admins can view all uploads"
  ON uploads FOR SELECT
  USING (is_admin());

-- Users can view their own uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can create uploads (data imports)
CREATE POLICY "Admins can create uploads"
  ON uploads FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can delete uploads
CREATE POLICY "Admins can delete uploads"
  ON uploads FOR DELETE
  USING (is_admin());

-- ============================================================================
-- EMPLOYEES POLICIES
-- ============================================================================

-- Admins can do everything with employees
CREATE POLICY "Admins full access to employees"
  ON employees FOR ALL
  USING (is_admin());

-- Users can view employees in their departments
CREATE POLICY "Users can view department employees"
  ON employees FOR SELECT
  USING (has_department_access(department));

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Everyone can view projects (read-only for users)
CREATE POLICY "All users can view projects"
  ON projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify projects
CREATE POLICY "Admins can manage projects"
  ON projects FOR ALL
  USING (is_admin());

-- ============================================================================
-- ASSIGNMENTS POLICIES
-- ============================================================================

-- Users can view assignments for employees they have access to
CREATE POLICY "Users can view accessible assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = assignments.employee_id
      AND (is_admin() OR has_department_access(e.department))
    )
  );

-- Only admins can modify assignments
CREATE POLICY "Admins can manage assignments"
  ON assignments FOR ALL
  USING (is_admin());

-- ============================================================================
-- IMPORT MAPPINGS POLICIES
-- ============================================================================

-- Users can manage their own import mappings
CREATE POLICY "Users can manage own mappings"
  ON import_mappings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all mappings
CREATE POLICY "Admins can view all mappings"
  ON import_mappings FOR SELECT
  USING (is_admin());

-- ============================================================================
-- REDUCTION PROGRAMS POLICIES
-- ============================================================================

-- Users can view reduction programs for accessible employees
CREATE POLICY "Users can view accessible reduction programs"
  ON reduction_programs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = reduction_programs.employee_id
      AND (is_admin() OR has_department_access(e.department))
    )
  );

-- Only admins can modify reduction programs
CREATE POLICY "Admins can manage reduction programs"
  ON reduction_programs FOR ALL
  USING (is_admin());

-- ============================================================================
-- PROFILE CREATION TRIGGER
-- ============================================================================
-- Automatically creates a profile when a new user signs up

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, email, role, departments)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'departments')),
      ARRAY[]::TEXT[]
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- INITIAL ADMIN USER SETUP (Optional - run separately if needed)
-- ============================================================================
-- This is a template. After running auth.signUp() for your admin user,
-- update their profile:
--
-- UPDATE profiles
-- SET role = 'admin', departments = ARRAY['ALL']
-- WHERE email = 'admin@yourcompany.com';
