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

  // Bulk add or update employees (upsert - chunked for performance)
  // Uses employeeId as the unique identifier to check for existing records
  async bulkAdd(employees, onProgress) {
    const db = await initDB();
    const chunkSize = 500;
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // First, get all existing employee IDs for efficient lookup
    const existingEmployees = await db.getAll('employees');
    const existingMap = new Map();
    existingEmployees.forEach(emp => {
      if (emp.employeeId) {
        existingMap.set(emp.employeeId, emp.id);
      }
    });

    // Deduplicate incoming data - keep last occurrence of each employeeId
    const deduplicatedMap = new Map();
    employees.forEach(emp => {
      if (emp.employeeId) {
        deduplicatedMap.set(emp.employeeId, emp);
      }
    });
    const uniqueEmployees = Array.from(deduplicatedMap.values());
    skipped = employees.length - uniqueEmployees.length;

    for (let i = 0; i < uniqueEmployees.length; i += chunkSize) {
      const chunk = uniqueEmployees.slice(i, i + chunkSize);

      // Process each chunk in a transaction
      const tx = db.transaction('employees', 'readwrite');
      const store = tx.objectStore('employees');

      const promises = chunk.map((employee) => {
        const existingId = existingMap.get(employee.employeeId);

        if (existingId) {
          // Update existing record - preserve the internal id
          updated++;
          return store.put({ ...employee, id: existingId });
        } else {
          // Insert new record - no id means auto-generate
          inserted++;
          return store.add(employee);
        }
      });

      await Promise.all(promises);
      await tx.done;

      processed += chunk.length;

      if (onProgress) {
        onProgress(processed, uniqueEmployees.length);
      }
    }

    console.log('Bulk import: ' + inserted + ' inserted, ' + updated + ' updated, ' + skipped + ' duplicates skipped');
    return employees.length; // Return original count for progress display
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

  async delete(id) {
    const db = await initDB();
    return db.delete('importHistory', id);
  },
};

export default {
  initDB,
  employeeDB,
  reductionProgramDB,
  projectDB,
  assignmentDB,
  importMappingDB,
  importHistoryDB,
};
