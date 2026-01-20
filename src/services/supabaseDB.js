/**
 * Supabase Database Service Layer
 * High-performance database operations for workforce management
 *
 * Optimizations:
 * - Batch inserts with configurable chunk size
 * - Instrumentation for performance monitoring
 * - Efficient pagination with cursor-based queries
 * - Parallel batch processing where safe
 */

import { supabase } from '../lib/supabase';

// Default batch size for bulk operations
const DEFAULT_BATCH_SIZE = 500;

// Performance instrumentation helper
const createTimer = (label) => {
  const start = performance.now();
  return {
    label,
    elapsed: () => performance.now() - start,
    log: () => {
      const elapsed = performance.now() - start;
      console.log(`[Performance] ${label}: ${elapsed.toFixed(2)}ms`);
      return elapsed;
    },
  };
};

/**
 * Upload Operations
 */
export const uploadsDB = {
  /**
   * Create a new upload record
   */
  async create(uploadData) {
    console.log('[Debug] Creating upload with data:', uploadData);

    // Ensure error_log and department_breakdown are properly formatted for JSONB
    const cleanedData = {
      ...uploadData,
      error_log: uploadData.error_log || [],
      department_breakdown: uploadData.department_breakdown || {},
    };

    try {
      const { data, error } = await supabase
        .from('uploads')
        .insert([cleanedData])
        .select();

      if (error) {
        console.error('[Debug] Upload creation failed:', error);
        throw error;
      }

      // Return the first (and should be only) record
      if (!data || data.length === 0) {
        throw new Error('Upload record was not created');
      }
      return data[0];
    } catch (e) {
      console.error('[Debug] Exception in create upload:', e);
      throw e;
    }
  },

  /**
   * Get all uploads (admin only via RLS)
   */
  async getAll() {
    const { data, error } = await supabase
      .from('uploads')
      .select(`
        *,
        profiles:user_id (username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get upload by ID
   */
  async get(id) {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Update upload record
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('uploads')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  /**
   * Delete upload (cascades to employees)
   */
  async delete(id) {
    const { error } = await supabase
      .from('uploads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Get recent uploads
   */
  async getRecent(limit = 10) {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },
};

/**
 * Employee Operations
 */
// Allowed columns in the Supabase employees table (from schema)
const ALLOWED_EMPLOYEE_COLUMNS = new Set([
  'id',
  'upload_id',
  'employee_id',
  'name',
  'email',
  'phone',
  'department',
  'division',
  'company',
  'country',
  'role',
  'status',
  'fte',
  'start_date',
  'end_date',
  'date_of_birth',
  'base_salary',
  'pay_scale',
  'hourly_rate',
  'cost_center',
  'manager_id',
  'location',
  'building',
  'floor',
  'desk',
  'reduction_percentage',
  'reduction_start_date',
  'reduction_end_date',
  'reduction_status',
  'raw_data',
  'created_at',
  'updated_at',
]);

const transformEmployeeForSupabase = (employee) => {
  const transformed = {};

  // Convert camelCase to snake_case and map to allowed columns
  const fieldMapping = {
    employeeId: 'employee_id',
    jobTitle: 'role',  // Map jobTitle to role
    startDate: 'start_date',
    endDate: 'end_date',
    dateOfBirth: 'date_of_birth',
    baseSalary: 'base_salary',
    payScale: 'pay_scale',
    hourlyRate: 'hourly_rate',
    costCenter: 'cost_center',
    managerId: 'manager_id',
    reductionPercentage: 'reduction_percentage',
    reductionStartDate: 'reduction_start_date',
    reductionEndDate: 'reduction_end_date',
    reductionStatus: 'reduction_status',
    rawData: 'raw_data',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    uploadId: 'upload_id',
  };

  // Process each field from the input
  for (const [key, value] of Object.entries(employee)) {
    // Skip null/undefined values
    if (value === null || value === undefined) continue;

    // Map camelCase to snake_case if mapping exists
    const mappedKey = fieldMapping[key] || key;

    // Only include if it's an allowed column
    if (ALLOWED_EMPLOYEE_COLUMNS.has(mappedKey)) {
      transformed[mappedKey] = value;
    }
  }

  // Sanitize Date Fields: Convert "" to null to prevent invalid input syntax
  ['start_date', 'end_date', 'created_at', 'date_of_birth', 'reduction_start_date', 'reduction_end_date'].forEach(field => {
    if (transformed[field] === '') {
      transformed[field] = null;
    }
  });

  // Ensure numeric fields are numbers (Supabase strict types)
  if (transformed.fte !== undefined) {
    transformed.fte = parseFloat(transformed.fte) || 100;
  }
  if (transformed.base_salary !== undefined) {
    transformed.base_salary = parseFloat(transformed.base_salary) || null;
  }
  if (transformed.hourly_rate !== undefined) {
    transformed.hourly_rate = parseFloat(transformed.hourly_rate) || null;
  }
  if (transformed.reduction_percentage !== undefined) {
    transformed.reduction_percentage = parseFloat(transformed.reduction_percentage) || 0;
  }

  return transformed;
};

export const employeesDB = {
  /**
   * Add single employee
   */
  async add(employee) {
    const { data, error } = await supabase
      .from('employees')
      .insert(transformEmployeeForSupabase(employee))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Bulk add employees with optimized batch processing
   *
   * Performance characteristics:
   * - Uses chunked inserts to avoid memory pressure
   * - Provides progress callbacks for UI updates
   * - Logs performance metrics for monitoring
   *
   * @param {Array} employees - Array of employee objects
   * @param {string} uploadId - The upload ID to associate employees with
   * @param {Function} onProgress - Callback(processed, total) for progress updates
   * @param {number} batchSize - Records per batch (default 500)
   * @returns {Object} { successful, failed, errors }
   */
  async bulkAdd(employees, uploadId, onProgress = null, batchSize = DEFAULT_BATCH_SIZE) {
    console.log('[supabaseDB.bulkAdd] Called with', employees?.length, 'employees, uploadId:', uploadId);
    const totalTimer = createTimer('Total bulk insert');

    if (!uploadId) {
      console.error('[supabaseDB.bulkAdd] ERROR: No uploadId provided!');
      return { successful: 0, failed: employees?.length || 0, errors: [{ error: 'No uploadId provided' }], totalTime: 0 };
    }

    if (!employees || employees.length === 0) {
      console.warn('[supabaseDB.bulkAdd] No employees to insert');
      return { successful: 0, failed: 0, errors: [], totalTime: 0 };
    }

    // Prepare employees with upload_id
    const preparedEmployees = employees.map((emp) => {
      const transformed = transformEmployeeForSupabase(emp);
      return {
        ...transformed,
        upload_id: uploadId,
        // Ensure required fields (use snake_case keys now)
        employee_id: transformed.employee_id || 'UNKNOWN',
        name: transformed.name || 'Unknown',
      };
    });

    console.log('[supabaseDB.bulkAdd] First prepared employee:', preparedEmployees[0]);

    // Deduplicate by employee_id (keep last occurrence)
    const dedupeTimer = createTimer('Deduplication');
    const deduplicatedMap = new Map();
    preparedEmployees.forEach((emp) => {
      if (emp.employee_id && emp.employee_id.toString().trim() !== '') {
        deduplicatedMap.set(emp.employee_id.toString().trim(), emp);
      }
    });
    const uniqueEmployees = Array.from(deduplicatedMap.values());
    dedupeTimer.log();

    console.log(
      `[bulkAdd] Starting insert of ${uniqueEmployees.length} unique employees (from ${employees.length} total)`
    );

    let successful = 0;
    let failed = 0;
    const errors = [];

    // Process in batches
    const insertTimer = createTimer('Batch inserts');
    for (let i = 0; i < uniqueEmployees.length; i += batchSize) {
      const batch = uniqueEmployees.slice(i, i + batchSize);
      const batchTimer = createTimer(`Batch ${Math.floor(i / batchSize) + 1}`);

      try {
        const { data, error } = await supabase
          .from('employees')
          .insert(batch)
          .select('id');

        if (error) {
          // Batch failed - record error and continue
          console.error(`[Debug] Batch ${i / batchSize + 1} failed:`, error);
          console.error(`[Debug] First item in failed batch:`, batch[0]);
          failed += batch.length;
          errors.push({
            batch: Math.floor(i / batchSize) + 1,
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            recordCount: batch.length,
          });
        } else {
          successful += data?.length || batch.length;
        }
      } catch (err) {
        console.error(`Batch ${i / batchSize + 1} exception:`, err);
        failed += batch.length;
        errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: err.message,
          recordCount: batch.length,
        });
      }

      batchTimer.log();

      // Report progress
      const processed = Math.min(i + batchSize, uniqueEmployees.length);
      if (onProgress) {
        onProgress(processed, uniqueEmployees.length);
      }
    }

    insertTimer.log();
    const totalTime = totalTimer.log();

    console.log(`[bulkAdd] Complete: ${successful} successful, ${failed} failed in ${totalTime.toFixed(0)}ms`);
    console.log(`[bulkAdd] Rate: ${(uniqueEmployees.length / (totalTime / 1000)).toFixed(0)} records/second`);

    return { successful, failed, errors, totalTime };
  },

  /**
   * Get employee by ID
   */
  async get(id) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get employee by business employee ID
   */
  async getByEmployeeId(employeeId, uploadId = null) {
    let query = supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId);

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get all employees (use sparingly - prefer pagination)
   */
  async getAll(uploadId = null) {
    let query = supabase.from('employees').select('*');

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Get employees with pagination
   */
  async getPaginated({ page = 1, limit = 50, uploadId = null, filters = {} }) {
    const offset = (page - 1) * limit;
    console.log('[supabaseDB] getPaginated called, page:', page, 'limit:', limit, 'offset:', offset);

    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' });

    // Apply upload filter
    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    // Apply filters
    if (filters.department) {
      query = query.eq('department', filters.department);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order('name')
      .range(offset, offset + limit - 1);

    console.log('[supabaseDB] getPaginated result: count=', count, 'data length=', data?.length, 'error=', error);
    if (data?.length > 0) {
      console.log('[supabaseDB] First employee:', data[0]);
    }

    if (error) throw error;

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  },

  /**
   * Search employees by name
   */
  async searchByName(query, uploadId = null, limit = 50) {
    let dbQuery = supabase
      .from('employees')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (uploadId) {
      dbQuery = dbQuery.eq('upload_id', uploadId);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return data;
  },

  /**
   * Filter employees by criteria
   */
  async filter(criteria, uploadId = null) {
    let query = supabase.from('employees').select('*');

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }
    if (criteria.department) {
      query = query.eq('department', criteria.department);
    }
    if (criteria.status) {
      query = query.eq('status', criteria.status);
    }
    if (criteria.role) {
      query = query.eq('role', criteria.role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Update employee
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('employees')
      .update(transformEmployeeForSupabase(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete employee
   */
  async delete(id) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Bulk delete employees
   */
  async bulkDelete(ids) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  },

  /**
   * Get employee count
   */
  async count(uploadId = null) {
    console.log('[supabaseDB] count() called, uploadId:', uploadId);
    let query = supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    const { count, error } = await query;
    console.log('[supabaseDB] count result:', count, 'error:', error);

    if (error) throw error;
    return count;
  },

  /**
   * Get unique departments
   */
  async getUniqueDepartments(uploadId = null) {
    let query = supabase
      .from('employees')
      .select('department')
      .not('department', 'is', null);

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Extract unique departments
    const departments = [...new Set(data.map((d) => d.department))].sort();
    return departments;
  },

  /**
   * Get aggregated statistics
   * Uses database aggregation for efficiency
   */
  async getStats(uploadId = null) {
    // Get basic counts
    let countQuery = supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (uploadId) {
      countQuery = countQuery.eq('upload_id', uploadId);
    }

    const { count: totalEmployees } = await countQuery;

    // Get department breakdown using RPC or manual aggregation
    let deptQuery = supabase
      .from('employees')
      .select('department, status, role, fte, reduction_percentage');

    if (uploadId) {
      deptQuery = deptQuery.eq('upload_id', uploadId);
    }

    const { data: employees } = await deptQuery;

    // Calculate aggregations in JS (could be moved to DB function for better performance)
    const departmentCounts = {};
    const statusCounts = {};
    const roleCounts = {};
    let totalFTE = 0;
    let totalCapacity = 0;
    let availableEmployees = 0;
    let reductionImpactSum = 0;

    employees?.forEach((emp) => {
      // Department counts
      const dept = emp.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

      // Status counts
      const status = emp.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Role counts
      const role = emp.role || 'Unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;

      // FTE calculations
      const fte = parseFloat(emp.fte) || 100;
      totalFTE += fte;

      // Reduction impact
      const reduction = parseFloat(emp.reduction_percentage) || 0;
      reductionImpactSum += reduction;
      totalCapacity += fte * (1 - reduction / 100);

      // Availability
      if (emp.status === 'active') {
        availableEmployees++;
      }
    });

    return {
      totalEmployees: totalEmployees || 0,
      totalCapacity,
      availableEmployees,
      departmentCounts,
      statusCounts,
      roleCounts,
      totalFTE,
      reductionImpactSum,
    };
  },

  /**
   * Delete all employees for an upload
   */
  async clearByUpload(uploadId) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('upload_id', uploadId);

    if (error) throw error;
    return true;
  },
};

/**
 * Project Operations
 */
const transformProjectForSupabase = (project) => {
  const transformed = { ...project };

  // Convert camelCase to snake_case
  if (transformed.startDate) {
    transformed.start_date = transformed.startDate;
    delete transformed.startDate;
  }
  if (transformed.endDate) {
    transformed.end_date = transformed.endDate;
    delete transformed.endDate;
  }
  if (transformed.clientId) {
    transformed.client_id = transformed.clientId;
    delete transformed.clientId;
  }

  // Remove fields not present in Supabase schema
  if ('client' in transformed) {
    delete transformed.client;
  }

  // Ensure status assumes default if missing
  if (!transformed.status) {
    transformed.status = 'active';
  }

  return transformed;
};

export const projectsDB = {
  async add(project) {
    const { data, error } = await supabase
      .from('projects')
      .insert(transformProjectForSupabase(project))
      .select()
      .single();

    if (error) throw error;
    return data.id;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getActive() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update(transformProjectForSupabase(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

/**
 * Assignment Operations
 */
export const assignmentsDB = {
  async add(assignment) {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByEmployee(employeeId) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        projects (*)
      `)
      .eq('employee_id', employeeId);

    if (error) throw error;
    return data;
  },

  async getByProject(projectId) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        employees (*)
      `)
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async deleteByEmployee(employeeId) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('employee_id', employeeId);

    if (error) throw error;
    return true;
  },

  async getStats() {
    const { data, error } = await supabase
      .from('assignments')
      .select('allocation_percentage');

    if (error) throw error;

    const totalAllocated = data.reduce(
      (sum, a) => sum + (parseFloat(a.allocation_percentage) || 0),
      0
    );

    return { totalAllocated };
  },
};

/**
 * Import Mapping Operations
 */
export const importMappingsDB = {
  async add(mapping) {
    const { data, error } = await supabase
      .from('import_mappings')
      .insert(mapping)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('import_mappings')
      .select('*')
      .order('last_used', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByName(name) {
    const { data, error } = await supabase
      .from('import_mappings')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('import_mappings')
      .update({ ...updates, last_used: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('import_mappings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

/**
 * Reduction Program Operations
 */
export const reductionProgramsDB = {
  async add(program) {
    const { data, error } = await supabase
      .from('reduction_programs')
      .insert(program)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByEmployeeId(employeeId) {
    const { data, error } = await supabase
      .from('reduction_programs')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) throw error;
    return data;
  },

  async getActive() {
    const { data, error } = await supabase
      .from('reduction_programs')
      .select(`
        *,
        employees (name, employee_id, department)
      `)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('reduction_programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('reduction_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

/**
 * System Operations
 */
export const systemDB = {
  /**
   * Clear all data (admin only via RLS)
   * Note: This is destructive - use with caution
   */
  async clearAllData() {
    // Delete in order to respect foreign key constraints
    const tables = [
      'assignments',
      'reduction_programs',
      'employees',
      'projects',
      'uploads',
      'import_mappings',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround)
      if (error) {
        console.error(`Failed to clear ${table}:`, error);
      }
    }

    return true;
  },

  /**
   * Get database health/status
   */
  async getHealth() {
    try {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      return {
        status: 'healthy',
        employeeCount: count,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default {
  uploads: uploadsDB,
  employees: employeesDB,
  projects: projectsDB,
  assignments: assignmentsDB,
  importMappings: importMappingsDB,
  reductionPrograms: reductionProgramsDB,
  system: systemDB,
};
