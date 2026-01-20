-- ============================================================================
-- Workforce Tracker - Fix RLS Policies for Data Import
-- ============================================================================
-- Run this migration in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This fixes RLS policies to allow authenticated users to manage their data
-- ============================================================================

-- ============================================================================
-- FIX PROFILES TABLE POLICIES
-- ============================================================================
-- Allow authenticated users to insert their own profile if it doesn't exist
-- This is critical for the auto-profile creation to work

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Recreate with more permissive insert policy
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- ============================================================================
-- FIX UPLOADS TABLE POLICIES
-- ============================================================================
-- Allow authenticated users to create uploads (not just admins)

DROP POLICY IF EXISTS "Admins can view all uploads" ON uploads;
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Admins can create uploads" ON uploads;
DROP POLICY IF EXISTS "Admins can delete uploads" ON uploads;

-- Anyone authenticated can create uploads
CREATE POLICY "Authenticated users can create uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- Users can update their own uploads
CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON uploads FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================================
-- FIX EMPLOYEES TABLE POLICIES
-- ============================================================================
-- Allow users to insert employees for uploads they own

DROP POLICY IF EXISTS "Admins full access to employees" ON employees;
DROP POLICY IF EXISTS "Users can view department employees" ON employees;

-- Users can insert employees for their own uploads
CREATE POLICY "Users can insert employees for own uploads"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploads u
      WHERE u.id = upload_id
      AND (u.user_id = auth.uid() OR is_admin())
    )
  );

-- Users can view employees from their uploads or if admin
CREATE POLICY "Users can view own upload employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM uploads u
      WHERE u.id = upload_id
      AND (u.user_id = auth.uid() OR is_admin())
    )
    OR is_admin()
    OR has_department_access(department)
  );

-- Users can update employees from their uploads
CREATE POLICY "Users can update own upload employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM uploads u
      WHERE u.id = upload_id
      AND (u.user_id = auth.uid() OR is_admin())
    )
  );

-- Users can delete employees from their uploads
CREATE POLICY "Users can delete own upload employees"
  ON employees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM uploads u
      WHERE u.id = upload_id
      AND (u.user_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================================
-- FIX PROJECTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "All users can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;

-- Anyone authenticated can view projects
CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Anyone authenticated can create projects
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update projects they created or if admin
CREATE POLICY "Users can update own or admin projects"
  ON projects FOR UPDATE
  USING (created_by = auth.uid() OR is_admin());

-- Users can delete projects they created or if admin
CREATE POLICY "Users can delete own or admin projects"
  ON projects FOR DELETE
  USING (created_by = auth.uid() OR is_admin());

-- ============================================================================
-- GRANT USAGE ON SEQUENCES
-- ============================================================================
-- Ensure authenticated users can use auto-generated IDs

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================================
-- VERIFY is_admin FUNCTION HANDLES MISSING PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- ============================================================================
-- After running this migration:
-- 1. Go to Settings > Connection Diagnostics in the app
-- 2. Click "Fix User Profile (Set Admin)" to ensure your profile exists
-- 3. Click "Test Connection & Permissions" to verify everything works
-- 4. Try importing data again
