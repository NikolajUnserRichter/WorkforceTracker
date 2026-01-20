/**
 * Unified Database Service
 * Automatically uses Supabase when configured, falls back to IndexedDB
 *
 * This provides a single interface for all components to use,
 * abstracting away the backend choice.
 */

import * as indexedDB from './db';
import * as supabaseDB from './supabaseDB';
import { supabase } from '../lib/supabase';

// Check if Supabase is configured
// TEMPORARILY DISABLED - using IndexedDB for now due to Supabase RLS issues
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const configured = !!url && url !== 'https://placeholder.supabase.co';
  if (!configured) {
    console.log('[unifiedDB] Using IndexedDB (Supabase not configured)');
  }
  return configured;
};

/**
 * Transform Supabase snake_case employee to camelCase for UI compatibility
 */
const transformEmployeeFromSupabase = (emp) => {
  if (!emp) return emp;
  return {
    id: emp.id,
    employeeId: emp.employee_id || emp.employeeId,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    role: emp.role,
    status: emp.status,
    fte: emp.fte,
    startDate: emp.start_date || emp.startDate,
    salary: emp.salary || emp.base_salary || emp.baseSalary,
    baseSalary: emp.base_salary || emp.baseSalary || emp.salary,
    hourlyRate: emp.hourly_rate || emp.hourlyRate,
    reductionProgram: emp.reduction_program || emp.reductionProgram || null,
    reductionPercentage: emp.reduction_percentage || emp.reductionPercentage || 0,
    uploadId: emp.upload_id || emp.uploadId,
    createdAt: emp.created_at || emp.createdAt,
    // Keep original fields too for any direct access
    ...emp,
  };
};

/**
 * Transform array of employees from Supabase
 */
const transformEmployeesFromSupabase = (employees) => {
  if (!employees) return [];
  return employees.map(transformEmployeeFromSupabase);
};

/**
 * Transform Supabase snake_case upload record to camelCase
 */
const transformUploadFromSupabase = (upload) => {
  if (!upload) return upload;
  return {
    id: upload.id,
    fileName: upload.file_name,
    fileSize: upload.file_size,
    totalRecords: upload.total_records,
    recordsSuccessful: upload.records_successful,
    recordsFailed: upload.records_failed,
    recordsSkipped: upload.records_skipped,
    processingTime: upload.processing_time_ms,
    createdAt: upload.created_at,
    timestamp: upload.created_at, // Access alias
    departmentBreakdown: upload.department_breakdown || {},
    errorLog: upload.error_log || [],
    totalSalary: upload.total_salary,
    userId: upload.user_id,
    status: upload.status,
    profiles: upload.profiles,
    // Keep original fields for backward compatibility during migration
    ...upload,
  };
};

/**
 * Transform array of uploads from Supabase
 */
const transformUploadsFromSupabase = (uploads) => {
  if (!uploads) return [];
  return uploads.map(transformUploadFromSupabase);
};

/**
 * Unified Employee Operations
 */
export const employeeDB = {
  async add(employee) {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.add(employee);
    }
    return indexedDB.employeeDB.add(employee);
  },

  async bulkAdd(employees, onProgress) {
    if (isSupabaseConfigured()) {
      // For Supabase, we need an uploadId - this is typically handled by ImportContext
      // This method is mainly used by IndexedDB path
      console.warn('bulkAdd called without uploadId - using IndexedDB path');
      return indexedDB.employeeDB.bulkAdd(employees, onProgress);
    }
    return indexedDB.employeeDB.bulkAdd(employees, onProgress);
  },

  async get(id) {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.employeesDB.get(id);
      return transformEmployeeFromSupabase(data);
    }
    return indexedDB.employeeDB.get(id);
  },

  async getByEmployeeId(employeeId) {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.employeesDB.getByEmployeeId(employeeId);
      return transformEmployeeFromSupabase(data);
    }
    return indexedDB.employeeDB.getByEmployeeId(employeeId);
  },

  async getAll() {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.employeesDB.getAll();
      return transformEmployeesFromSupabase(data);
    }
    return indexedDB.employeeDB.getAll();
  },

  async getPaginated(offset = 0, limit = 50) {
    if (isSupabaseConfigured()) {
      const page = Math.floor(offset / limit) + 1;
      console.log('[unifiedDB] getPaginated from Supabase, page:', page, 'limit:', limit);
      try {
        const result = await supabaseDB.employeesDB.getPaginated({ page, limit });
        console.log('[unifiedDB] getPaginated result:', result);
        console.log('[unifiedDB] getPaginated result.data length:', result?.data?.length);
        const transformed = transformEmployeesFromSupabase(result?.data || []);
        console.log('[unifiedDB] transformed employees:', transformed?.length, transformed?.[0]);
        return transformed;
      } catch (err) {
        console.error('[unifiedDB] getPaginated error:', err);
        return [];
      }
    }
    return indexedDB.employeeDB.getPaginated(offset, limit);
  },

  async searchByName(query) {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.employeesDB.searchByName(query);
      return transformEmployeesFromSupabase(data);
    }
    return indexedDB.employeeDB.searchByName(query);
  },

  async filter(criteria) {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.employeesDB.filter(criteria);
      return transformEmployeesFromSupabase(data);
    }
    return indexedDB.employeeDB.filter(criteria);
  },

  async update(id, updates) {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.update(id, updates);
    }
    return indexedDB.employeeDB.update(id, updates);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.delete(id);
    }
    return indexedDB.employeeDB.delete(id);
  },

  async bulkDelete(ids) {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.bulkDelete(ids);
    }
    return indexedDB.employeeDB.bulkDelete(ids);
  },

  async count() {
    if (isSupabaseConfigured()) {
      try {
        const count = await supabaseDB.employeesDB.count();
        console.log('[unifiedDB] count from Supabase:', count);
        return count || 0;
      } catch (err) {
        console.error('[unifiedDB] count error:', err);
        return 0;
      }
    }
    return indexedDB.employeeDB.count();
  },

  async getUniqueDepartments() {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.getUniqueDepartments();
    }
    return indexedDB.employeeDB.getUniqueDepartments();
  },

  async getStats() {
    if (isSupabaseConfigured()) {
      return supabaseDB.employeesDB.getStats();
    }
    return indexedDB.employeeDB.getStats();
  },

  async clear() {
    if (isSupabaseConfigured()) {
      // For Supabase, clearing requires knowing the upload ID
      console.warn('clear() not directly supported for Supabase - use clearByUpload()');
      return;
    }
    return indexedDB.employeeDB.clear();
  },
};

/**
 * Unified Project Operations
 */
export const projectDB = {
  async add(project) {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.add(project);
    }
    return indexedDB.projectDB.add(project);
  },

  async get(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.get(id);
    }
    return indexedDB.projectDB.get(id);
  },

  async getAll() {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.getAll();
    }
    return indexedDB.projectDB.getAll();
  },

  async getActive() {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.getActive();
    }
    return indexedDB.projectDB.getActive();
  },

  async update(id, updates) {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.update(id, updates);
    }
    return indexedDB.projectDB.update(id, updates);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.projectsDB.delete(id);
    }
    return indexedDB.projectDB.delete(id);
  },
};

/**
 * Unified Assignment Operations
 */
export const assignmentDB = {
  async add(assignment) {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.add(assignment);
    }
    return indexedDB.assignmentDB.add(assignment);
  },

  async getByEmployee(employeeId) {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.getByEmployee(employeeId);
    }
    return indexedDB.assignmentDB.getByEmployee(employeeId);
  },

  async getByProject(projectId) {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.getByProject(projectId);
    }
    return indexedDB.assignmentDB.getByProject(projectId);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.delete(id);
    }
    return indexedDB.assignmentDB.delete(id);
  },

  async deleteByEmployee(employeeId) {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.deleteByEmployee(employeeId);
    }
    return indexedDB.assignmentDB.deleteByEmployee(employeeId);
  },

  async getStats() {
    if (isSupabaseConfigured()) {
      return supabaseDB.assignmentsDB.getStats();
    }
    return indexedDB.assignmentDB.getStats();
  },
};

/**
 * Unified Reduction Program Operations
 */
export const reductionProgramDB = {
  async add(program) {
    if (isSupabaseConfigured()) {
      return supabaseDB.reductionProgramsDB.add(program);
    }
    return indexedDB.reductionProgramDB.add(program);
  },

  async getByEmployeeId(employeeId) {
    if (isSupabaseConfigured()) {
      return supabaseDB.reductionProgramsDB.getByEmployeeId(employeeId);
    }
    return indexedDB.reductionProgramDB.getByEmployeeId(employeeId);
  },

  async getActive() {
    if (isSupabaseConfigured()) {
      return supabaseDB.reductionProgramsDB.getActive();
    }
    return indexedDB.reductionProgramDB.getActive();
  },

  async update(id, updates) {
    if (isSupabaseConfigured()) {
      return supabaseDB.reductionProgramsDB.update(id, updates);
    }
    return indexedDB.reductionProgramDB.update(id, updates);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.reductionProgramsDB.delete(id);
    }
    return indexedDB.reductionProgramDB.delete(id);
  },
};

/**
 * Unified Import History/Uploads Operations
 */
export const importHistoryDB = {
  async add(history) {
    if (isSupabaseConfigured()) {
      // Convert to Supabase format
      return supabaseDB.uploadsDB.create({
        file_name: history.fileName,
        file_size: history.fileSize,
        total_records: history.totalRecords,
        records_successful: history.recordsSuccessful,
        records_failed: history.recordsFailed,
        records_skipped: history.recordsSkipped,
        processing_time_ms: history.processingTime,
        error_log: history.errorLog || [],
        department_breakdown: history.departmentBreakdown || {},
        total_salary: history.totalSalary,
        status: 'completed',
      });
    }
    return indexedDB.importHistoryDB.add(history);
  },

  async getAll() {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.uploadsDB.getAll();
      return transformUploadsFromSupabase(data);
    }
    return indexedDB.importHistoryDB.getAll();
  },

  async getRecent(limit = 10) {
    if (isSupabaseConfigured()) {
      const data = await supabaseDB.uploadsDB.getRecent(limit);
      return transformUploadsFromSupabase(data);
    }
    return indexedDB.importHistoryDB.getRecent(limit);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.uploadsDB.delete(id);
    }
    return indexedDB.importHistoryDB.delete(id);
  },
};

/**
 * Unified Import Mapping Operations
 */
export const importMappingDB = {
  async add(mapping) {
    if (isSupabaseConfigured()) {
      return supabaseDB.importMappingsDB.add(mapping);
    }
    return indexedDB.importMappingDB.add(mapping);
  },

  async getAll() {
    if (isSupabaseConfigured()) {
      return supabaseDB.importMappingsDB.getAll();
    }
    return indexedDB.importMappingDB.getAll();
  },

  async getByName(name) {
    if (isSupabaseConfigured()) {
      return supabaseDB.importMappingsDB.getByName(name);
    }
    return indexedDB.importMappingDB.getByName(name);
  },

  async update(id, updates) {
    if (isSupabaseConfigured()) {
      return supabaseDB.importMappingsDB.update(id, updates);
    }
    return indexedDB.importMappingDB.update(id, updates);
  },

  async delete(id) {
    if (isSupabaseConfigured()) {
      return supabaseDB.importMappingsDB.delete(id);
    }
    return indexedDB.importMappingDB.delete(id);
  },
};

/**
 * Unified System Operations
 */
export const systemDB = {
  async clearAllData() {
    if (isSupabaseConfigured()) {
      return supabaseDB.systemDB.clearAllData();
    }
    return indexedDB.systemDB.clearAllData();
  },

  async getHealth() {
    if (isSupabaseConfigured()) {
      return supabaseDB.systemDB.getHealth();
    }
    // IndexedDB doesn't have a health check, so return a basic status
    try {
      const count = await indexedDB.employeeDB.count();
      return {
        status: 'healthy',
        employeeCount: count,
        backend: 'indexeddb',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        backend: 'indexeddb',
        timestamp: new Date().toISOString(),
      };
    }
  },

  async diagnoseConnection() {
    if (!isSupabaseConfigured()) {
      return { status: 'ok', message: 'Using IndexedDB (Supabase not configured)', details: {} };
    }

    const results = {
      auth: { status: 'unknown', details: null },
      readEmployees: { status: 'unknown', error: null },
      readProjects: { status: 'unknown', error: null },
      writeTest: { status: 'skipped', message: 'Write test not performed' }
    };

    try {
      // 1. Check Auth
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        results.auth = { status: 'error', error: authError.message };
      } else if (!session) {
        results.auth = { status: 'warning', message: 'No active session' };
      } else {
        results.auth = { status: 'ok', user: session.user.email, id: session.user.id };

        // 1b. Check Profile (RLS often depends on this)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          results.auth.profile = { status: 'warning', message: 'Profile missing - Attempting fix...' };

          // Attempt to create profile
          const { error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              username: session.user.email.split('@')[0],
              role: 'admin', // Default to admin for first user/fix
              is_active: true,
              departments: ['ALL']
            });

          if (createError) {
            results.auth.profile = { status: 'error', message: 'Failed to create profile', details: createError };
          } else {
            results.auth.profile = { status: 'ok', message: 'Profile created (Fix applied)' };
          }
        } else {
          results.auth.profile = { status: 'ok', role: profile.role };
        }
      }

      // 2. Check Read Access (Employees)
      // Use direct supabase call to avoid transformation masking errors
      const { count: empCount, data: sampleEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, name, department, upload_id', { count: 'exact' })
        .limit(3);

      if (empError) {
        results.readEmployees = { status: 'error', error: empError.message, code: empError.code, details: empError };
      } else {
        results.readEmployees = { status: 'ok', count: empCount, sample: sampleEmployees };
      }

      // 2b. Check Uploads with employee counts
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('id, file_name, total_records, records_successful, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (uploadsError) {
        results.uploads = { status: 'error', error: uploadsError.message };
      } else {
        results.uploads = { status: 'ok', recent: uploadsData };
      }

      // 3. Check Read Access (Projects)
      const { count: projCount, error: projError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (projError) {
        results.readProjects = { status: 'error', error: projError.message, code: projError.code, details: projError };
      } else {
        results.readProjects = { status: 'ok', count: projCount };
      }

      // 4. Check Write Access (Test Project)
      // Attempt to insert and then delete a dummy record to verify RLS policies
      try {
        const testProject = {
          name: `__diag_test_${Date.now()}`,
          status: 'active',
          start_date: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
          .from('projects')
          .insert(testProject)
          .select()
          .single();

        if (insertError) {
          results.writeTest = { status: 'error', error: insertError.message, code: insertError.code };
        } else {
          // Clean up
          await supabase.from('projects').delete().eq('id', insertData.id);
          results.writeTest = { status: 'ok', message: 'Insert/Delete successful' };
        }
      } catch (writeErr) {
        results.writeTest = { status: 'error', error: writeErr.message };
      }

      // 5. Check Employee Write Access (this is the critical one for imports)
      results.employeeWriteTest = { status: 'unknown' };
      try {
        // First we need an upload to reference
        const testUpload = {
          user_id: session.user.id,
          file_name: '__diag_test.csv',
          file_size: 100,
          total_records: 1,
          records_successful: 0,
          records_failed: 0,
          records_skipped: 0,
          status: 'processing'
        };

        const { data: uploadData, error: uploadError } = await supabase
          .from('uploads')
          .insert(testUpload)
          .select()
          .single();

        if (uploadError) {
          results.employeeWriteTest = {
            status: 'error',
            stage: 'upload_create',
            error: uploadError.message,
            code: uploadError.code,
            hint: uploadError.hint
          };
        } else {
          // Try to insert an employee
          const testEmployee = {
            upload_id: uploadData.id,
            employee_id: '__diag_test_' + Date.now(),
            name: 'Diagnostic Test Employee',
            department: 'Test',
            status: 'active'
          };

          const { data: empData, error: empError } = await supabase
            .from('employees')
            .insert(testEmployee)
            .select()
            .single();

          if (empError) {
            results.employeeWriteTest = {
              status: 'error',
              stage: 'employee_insert',
              error: empError.message,
              code: empError.code,
              hint: empError.hint,
              details: empError.details
            };
          } else {
            // Clean up employee
            await supabase.from('employees').delete().eq('id', empData.id);
            results.employeeWriteTest = { status: 'ok', message: 'Employee Insert/Delete successful' };
          }

          // Clean up upload
          await supabase.from('uploads').delete().eq('id', uploadData.id);
        }
      } catch (empWriteErr) {
        results.employeeWriteTest = { status: 'error', error: empWriteErr.message };
      }

      return results;
    } catch (err) {
      return { status: 'critical_failure', error: err.message };
    }
  }
};

// Export backend info for debugging
export const getBackendInfo = () => ({
  isSupabase: isSupabaseConfigured(),
  backend: isSupabaseConfigured() ? 'supabase' : 'indexeddb',
});

/**
 * Fix user profile - ensures the current user has admin role
 * This is needed because RLS policies require admin role for data imports
 */
export const fixUserProfile = async () => {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', message: 'IndexedDB mode - no profile needed' };
  }

  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return { status: 'error', message: 'No active session' };
    }

    // Check current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError?.code === 'PGRST116' || !profile) {
      // Profile doesn't exist - create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          username: session.user.email?.split('@')[0] || 'user',
          email: session.user.email,
          role: 'admin',
          is_active: true,
          departments: ['ALL']
        })
        .select()
        .single();

      if (createError) {
        return { status: 'error', message: 'Failed to create profile', details: createError };
      }
      return { status: 'created', message: 'Profile created with admin role', profile: newProfile };
    }

    // Profile exists but may not be admin
    if (profile.role !== 'admin') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin', departments: ['ALL'], is_active: true })
        .eq('id', session.user.id)
        .select()
        .single();

      if (updateError) {
        return { status: 'error', message: 'Failed to update profile to admin', details: updateError };
      }
      return { status: 'updated', message: 'Profile updated to admin role', profile: updatedProfile };
    }

    return { status: 'ok', message: 'Profile already has admin role', profile };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
};

export default {
  employeeDB,
  projectDB,
  assignmentDB,
  reductionProgramDB,
  importHistoryDB,
  importMappingDB,
  systemDB,
  getBackendInfo,
};
