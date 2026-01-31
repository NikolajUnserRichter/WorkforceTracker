/**
 * IndexedDB Service Layer
 * High-performance database operations for handling 110,000+ employee records
 * Uses the 'idb' library for promise-based IndexedDB access
 */

import { openDB } from 'idb';

const DB_NAME = 'WorkforceTrackerDB';
const DB_VERSION = 1;

// Database initialization
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Employees store
      if (!db.objectStoreNames.contains('employees')) {
        const employeeStore = db.createObjectStore('employees', {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indices for fast lookups
        employeeStore.createIndex('employeeId', 'employeeId', { unique: true });
        employeeStore.createIndex('email', 'email');
        employeeStore.createIndex('department', 'department');
        employeeStore.createIndex('status', 'status');
        employeeStore.createIndex('role', 'role');
        employeeStore.createIndex('name', 'name');
      }

      // Reduction Programs store
      if (!db.objectStoreNames.contains('reductionPrograms')) {
        const programStore = db.createObjectStore('reductionPrograms', {
          keyPath: 'id',
          autoIncrement: true
        });

        programStore.createIndex('employeeId', 'employeeId');
        programStore.createIndex('status', 'status');
        programStore.createIndex('startDate', 'startDate');
        programStore.createIndex('endDate', 'endDate');
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true
        });

        projectStore.createIndex('status', 'status');
        projectStore.createIndex('startDate', 'startDate');
        projectStore.createIndex('endDate', 'endDate');
      }

      // Assignments store
      if (!db.objectStoreNames.contains('assignments')) {
        const assignmentStore = db.createObjectStore('assignments', {
          keyPath: 'id',
          autoIncrement: true
        });

        assignmentStore.createIndex('employeeId', 'employeeId');
        assignmentStore.createIndex('projectId', 'projectId');
        assignmentStore.createIndex('employeeProject', ['employeeId', 'projectId'], { unique: false });
      }

      // Import Mappings store
      if (!db.objectStoreNames.contains('importMappings')) {
        const mappingStore = db.createObjectStore('importMappings', {
          keyPath: 'id',
          autoIncrement: true
        });

        mappingStore.createIndex('name', 'name', { unique: true });
        mappingStore.createIndex('lastUsed', 'lastUsed');
      }

      // Import History store
      if (!db.objectStoreNames.contains('importHistory')) {
        const historyStore = db.createObjectStore('importHistory', {
          keyPath: 'id',
          autoIncrement: true
        });

        historyStore.createIndex('timestamp', 'timestamp');
        historyStore.createIndex('fileName', 'fileName');
      }
    },
  });
};

// Employee Operations
export const employeeDB = {
  // Add single employee
  async add(employee) {
    const db = await initDB();
    return db.add('employees', employee);
  },

  // Replace all employees with new data (full snapshot import)
  // Each import is a complete snapshot - old data is cleared and replaced
  async bulkAdd(employees, onProgress) {
    const db = await initDB();
    const chunkSize = 500;
    let processed = 0;

    // Deduplicate incoming data - keep last occurrence of each employeeId
    // Also filter out any employees without a valid employeeId
    const deduplicatedMap = new Map();
    employees.forEach(emp => {
      if (emp.employeeId && emp.employeeId.toString().trim() !== '') {
        deduplicatedMap.set(emp.employeeId.toString().trim(), emp);
      }
    });
    const uniqueEmployees = Array.from(deduplicatedMap.values());

    console.log(`bulkAdd: Starting import of ${uniqueEmployees.length} unique employees (from ${employees.length} total)`);

    // Clear all existing employees first (this is a full snapshot replacement)
    // Use a single transaction to ensure atomicity
    console.log('bulkAdd: Clearing existing employees...');
    await db.clear('employees');
    console.log('bulkAdd: Clear complete, starting inserts...');

    // Insert all new employees
    for (let i = 0; i < uniqueEmployees.length; i += chunkSize) {
      const chunk = uniqueEmployees.slice(i, i + chunkSize);

      const tx = db.transaction('employees', 'readwrite');
      const store = tx.objectStore('employees');

      // Add each employee, ensuring employeeId is a trimmed string
      const promises = chunk.map((employee) => {
        const cleanEmployee = {
          ...employee,
          employeeId: employee.employeeId.toString().trim(),
        };
        return store.add(cleanEmployee);
      });

      await Promise.all(promises);
      await tx.done;

      processed += chunk.length;
      console.log(`bulkAdd: Processed ${processed}/${uniqueEmployees.length} employees`);

      if (onProgress) {
        onProgress(processed, uniqueEmployees.length);
      }
    }

    console.log('Full snapshot import complete: ' + uniqueEmployees.length + ' employees imported');
    return uniqueEmployees.length;
  },

  // Get employee by ID
  async get(id) {
    const db = await initDB();
    return db.get('employees', id);
  },

  // Get employee by employee ID (unique identifier)
  async getByEmployeeId(employeeId) {
    const db = await initDB();
    return db.getFromIndex('employees', 'employeeId', employeeId);
  },

  // Get all employees
  async getAll() {
    const db = await initDB();
    return db.getAll('employees');
  },

  // Get employees with pagination
  async getPaginated(offset = 0, limit = 50) {
    const db = await initDB();
    const tx = db.transaction('employees', 'readonly');
    const store = tx.objectStore('employees');

    let cursor = await store.openCursor();
    let skipped = 0;
    let results = [];

    while (cursor && results.length < limit) {
      if (skipped >= offset) {
        results.push(cursor.value);
      } else {
        skipped++;
      }
      cursor = await cursor.continue();
    }

    return results;
  },

  // Search employees by name
  async searchByName(query) {
    const db = await initDB();
    const allEmployees = await db.getAll('employees');

    const lowerQuery = query.toLowerCase();
    return allEmployees.filter(emp =>
      emp.name.toLowerCase().includes(lowerQuery)
    );
  },

  // Filter employees
  async filter(criteria) {
    const db = await initDB();
    const allEmployees = await db.getAll('employees');

    return allEmployees.filter(emp => {
      let matches = true;

      if (criteria.department && emp.department !== criteria.department) {
        matches = false;
      }
      if (criteria.role && emp.role !== criteria.role) {
        matches = false;
      }
      if (criteria.status && emp.status !== criteria.status) {
        matches = false;
      }
      if (criteria.hasReductionProgram !== undefined) {
        const hasProgram = emp.reductionProgram && emp.reductionProgram.status === 'active';
        if (hasProgram !== criteria.hasReductionProgram) {
          matches = false;
        }
      }

      return matches;
    });
  },

  // Update employee
  async update(id, updates) {
    const db = await initDB();
    const employee = await db.get('employees', id);
    if (!employee) throw new Error('Employee not found');

    const updated = { ...employee, ...updates };
    return db.put('employees', updated);
  },

  // Delete employee
  async delete(id) {
    const db = await initDB();
    return db.delete('employees', id);
  },

  // Bulk delete
  async bulkDelete(ids) {
    const db = await initDB();
    const tx = db.transaction('employees', 'readwrite');

    await Promise.all(
      ids.map(id => tx.store.delete(id))
    );

    await tx.done;
  },

  // Get count
  async count() {
    const db = await initDB();
    return db.count('employees');
  },

  // Get distinct departments
  async getUniqueDepartments() {
    const db = await initDB();
    const tx = db.transaction('employees', 'readonly');
    const index = tx.store.index('department');
    let cursor = await index.openKeyCursor(null, 'nextunique');

    const departments = [];
    while (cursor) {
      if (cursor.key) departments.push(cursor.key);
      cursor = await cursor.continue();
    }
    return departments;
  },

  // Calculate aggregation stats efficiently using cursors
  async getStats() {
    const db = await initDB();
    const tx = db.transaction('employees', 'readonly');
    const store = tx.objectStore('employees');
    let cursor = await store.openCursor();

    let totalEmployees = 0;
    let totalCapacity = 0;
    let availableEmployees = 0;

    // Distributions
    const departmentCounts = {};
    const departmentDetails = {}; // Extended with FTE and salary per department
    const statusCounts = {};
    const roleCounts = {};
    const costCenterCounts = {};
    const locationCounts = {};
    let totalFTE = 0;
    let totalSalary = 0;
    let reductionImpactSum = 0;
    let employeesWithReduction = 0;

    // Use cursor to iterate without keeping all objects in memory
    while (cursor) {
      const emp = cursor.value;
      totalEmployees++;

      // FTE
      const fte = emp.fte || 100;
      totalFTE += fte;

      // Salary (baseSalary or salary field)
      const salary = parseFloat(emp.baseSalary) || parseFloat(emp.salary) || 0;
      totalSalary += salary;

      // Reduction
      const reduction = emp.reductionProgram?.reductionPercentage || 0;
      reductionImpactSum += reduction;
      if (reduction > 0) employeesWithReduction++;
      totalCapacity += (fte * (1 - reduction / 100));

      // Availability calculation
      if (emp.availability === 'available' || emp.availability === 'part-time') {
        availableEmployees++;
      }

      // Department breakdown with extended details
      const dept = emp.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      if (!departmentDetails[dept]) {
        departmentDetails[dept] = { count: 0, totalFTE: 0, totalSalary: 0, reductionCount: 0 };
      }
      departmentDetails[dept].count += 1;
      departmentDetails[dept].totalFTE += fte;
      departmentDetails[dept].totalSalary += salary;
      if (reduction > 0) departmentDetails[dept].reductionCount += 1;

      // Status counts
      const status = emp.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Role counts
      const role = emp.role || 'Unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;

      // Cost center counts
      const costCenter = emp.costCenter || emp.cost_center || null;
      if (costCenter) {
        costCenterCounts[costCenter] = (costCenterCounts[costCenter] || 0) + 1;
      }

      // Location counts
      const location = emp.plant || emp.location || emp.city || null;
      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }

      cursor = await cursor.continue();
    }

    return {
      totalEmployees,
      totalCapacity,
      availableEmployees,
      departmentCounts,
      departmentDetails,
      statusCounts,
      roleCounts,
      costCenterCounts,
      locationCounts,
      totalFTE,
      totalSalary,
      reductionImpactSum,
      employeesWithReduction
    };
  },

  // Clear all employees
  async clear() {
    const db = await initDB();
    return db.clear('employees');
  },
};

// Reduction Program Operations
export const reductionProgramDB = {
  async add(program) {
    const db = await initDB();
    return db.add('reductionPrograms', program);
  },

  async getByEmployeeId(employeeId) {
    const db = await initDB();
    return db.getAllFromIndex('reductionPrograms', 'employeeId', employeeId);
  },

  async getActive() {
    const db = await initDB();
    const allPrograms = await db.getAll('reductionPrograms');
    return allPrograms.filter(p => p.status === 'active');
  },

  async update(id, updates) {
    const db = await initDB();
    const program = await db.get('reductionPrograms', id);
    if (!program) throw new Error('Program not found');

    const updated = { ...program, ...updates };
    return db.put('reductionPrograms', updated);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('reductionPrograms', id);
  },
};

// Project Operations
export const projectDB = {
  async add(project) {
    const db = await initDB();
    return db.add('projects', project);
  },

  async get(id) {
    const db = await initDB();
    return db.get('projects', id);
  },

  async getAll() {
    const db = await initDB();
    return db.getAll('projects');
  },

  async update(id, updates) {
    const db = await initDB();
    const project = await db.get('projects', id);
    if (!project) throw new Error('Project not found');

    const updated = { ...project, ...updates };
    return db.put('projects', updated);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('projects', id);
  },

  async getActive() {
    const db = await initDB();
    return db.getAllFromIndex('projects', 'status', 'active');
  },
};

// Assignment Operations
export const assignmentDB = {
  async add(assignment) {
    const db = await initDB();
    return db.add('assignments', assignment);
  },

  async getByEmployee(employeeId) {
    const db = await initDB();
    return db.getAllFromIndex('assignments', 'employeeId', employeeId);
  },

  async getByProject(projectId) {
    const db = await initDB();
    return db.getAllFromIndex('assignments', 'projectId', projectId);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('assignments', id);
  },

  async deleteByEmployee(employeeId) {
    const db = await initDB();
    const assignments = await db.getAllFromIndex('assignments', 'employeeId', employeeId);
    const tx = db.transaction('assignments', 'readwrite');

    await Promise.all(
      assignments.map(a => tx.store.delete(a.id))
    );

    await tx.done;
  },

  async getStats() {
    const db = await initDB();
    const tx = db.transaction('assignments', 'readonly');
    const store = tx.objectStore('assignments');
    let cursor = await store.openCursor();

    let totalAllocated = 0;

    while (cursor) {
      const assign = cursor.value;
      totalAllocated += (assign.allocationPercentage || 0);
      cursor = await cursor.continue();
    }

    return { totalAllocated };
  },
};

// Import Mapping Operations
export const importMappingDB = {
  async add(mapping) {
    const db = await initDB();
    return db.add('importMappings', mapping);
  },

  async getAll() {
    const db = await initDB();
    return db.getAll('importMappings');
  },

  async getByName(name) {
    const db = await initDB();
    return db.getFromIndex('importMappings', 'name', name);
  },

  async update(id, updates) {
    const db = await initDB();
    const mapping = await db.get('importMappings', id);
    if (!mapping) throw new Error('Mapping not found');

    const updated = { ...mapping, ...updates };
    return db.put('importMappings', updated);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('importMappings', id);
  },
};

// Import History Operations
export const importHistoryDB = {
  async add(history) {
    const db = await initDB();
    return db.add('importHistory', history);
  },

  // Add import with snapshot statistics (GDPR-compliant aggregated data only)
  async addWithSnapshot(history, stats) {
    const db = await initDB();
    const enrichedHistory = {
      ...history,
      snapshot: {
        totalEmployees: stats.totalEmployees || 0,
        totalFTE: stats.totalFTE || 0,
        totalSalary: stats.totalSalary || 0,
        departmentCounts: stats.departmentCounts || {},
        departmentDetails: stats.departmentDetails || {},
        statusCounts: stats.statusCounts || {},
        costCenterCounts: stats.costCenterCounts || {},
        locationCounts: stats.locationCounts || {},
        employeesWithReduction: stats.employeesWithReduction || 0
      }
    };
    return db.add('importHistory', enrichedHistory);
  },

  async getAll() {
    const db = await initDB();
    const tx = db.transaction('importHistory', 'readonly');
    const index = tx.store.index('timestamp');
    return index.getAll();
  },

  async getRecent(limit = 10) {
    const db = await initDB();
    const tx = db.transaction('importHistory', 'readonly');
    const index = tx.store.index('timestamp');

    let cursor = await index.openCursor(null, 'prev');
    let results = [];

    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }

    return results;
  },

  async get(id) {
    const db = await initDB();
    return db.get('importHistory', id);
  },

  // Get imports with snapshots for comparison
  async getWithSnapshots(limit = 10) {
    const all = await this.getRecent(limit);
    return all.filter(h => h.snapshot);
  },

  async delete(id) {
    const db = await initDB();
    return db.delete('importHistory', id);
  },
};

// System Operations
export const systemDB = {
  async clearAllData() {
    const db = await initDB();
    const stores = ['employees', 'projects', 'assignments', 'reductionPrograms', 'importMappings', 'importHistory'];

    // Create one transaction for all stores if possible, or clear sequentially
    // idb's openDB returns a db instance we can use to start a transaction
    const tx = db.transaction(stores, 'readwrite');

    await Promise.all(stores.map(store => tx.objectStore(store).clear()));
    await tx.done;

    return true;
  }
};

export default {
  initDB,
  employeeDB,
  reductionProgramDB,
  projectDB,
  assignmentDB,
  importMappingDB,
  importHistoryDB,
  systemDB,
};
