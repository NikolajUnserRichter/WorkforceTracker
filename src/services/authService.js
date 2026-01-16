/**
 * Authentication Service
 * Handles user authentication and department-based access control
 */

import { openDB } from 'idb';

const AUTH_DB_NAME = 'WorkforceAuthDB';
const AUTH_DB_VERSION = 1;

// Initialize Auth Database
export const initAuthDB = async () => {
  return openDB(AUTH_DB_NAME, AUTH_DB_VERSION, {
    upgrade(db) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        });
        userStore.createIndex('username', 'username', { unique: true });
        userStore.createIndex('email', 'email', { unique: true });
      }

      // Current session store
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
    },
  });
};

// User Management
export const authService = {
  // Create initial admin user if none exists
  async initializeAdmin() {
    const db = await initAuthDB();
    const users = await db.getAll('users');

    if (users.length === 0) {
      // Create default admin user
      await db.add('users', {
        username: 'admin',
        password: 'admin123', // In production, this should be hashed
        email: 'admin@company.com',
        role: 'admin',
        departments: ['ALL'], // Admin has access to all departments
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  },

  // Login
  async login(username, password) {
    const db = await initAuthDB();
    const user = await db.getFromIndex('users', 'username', username);

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // In production, use proper password hashing (bcrypt, etc.)
    if (user.password !== password) {
      throw new Error('Invalid username or password');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Create session
    await db.put('session', {
      key: 'currentUser',
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departments: user.departments,
      loginTime: new Date().toISOString(),
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departments: user.departments,
    };
  },

  // Logout
  async logout() {
    const db = await initAuthDB();
    await db.delete('session', 'currentUser');
  },

  // Get current session
  async getCurrentUser() {
    const db = await initAuthDB();
    const session = await db.get('session', 'currentUser');
    return session || null;
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const session = await this.getCurrentUser();
    return !!session;
  },

  // Get all users (admin only)
  async getAllUsers() {
    const db = await initAuthDB();
    return db.getAll('users');
  },

  // Add new user
  async addUser(userData) {
    const db = await initAuthDB();

    // Check if username or email already exists
    const existingUsername = await db.getFromIndex('users', 'username', userData.username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const existingEmail = await db.getFromIndex('users', 'email', userData.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const user = {
      ...userData,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const id = await db.add('users', user);
    return { ...user, id };
  },

  // Update user
  async updateUser(id, updates) {
    const db = await initAuthDB();
    const user = await db.get('users', id);

    if (!user) {
      throw new Error('User not found');
    }

    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('users', updated);
    return updated;
  },

  // Delete user
  async deleteUser(id) {
    const db = await initAuthDB();
    await db.delete('users', id);
  },

  // Check if user has access to department
  hasAccessToDepartment(userDepartments, targetDepartment) {
    if (!userDepartments || userDepartments.length === 0) {
      return false;
    }

    // Admin has access to all departments
    if (userDepartments.includes('ALL')) {
      return true;
    }

    // Check if user has access to specific department
    return userDepartments.includes(targetDepartment);
  },

  // Filter employees based on user's department access
  filterEmployeesByDepartment(employees, userDepartments) {
    if (!userDepartments || userDepartments.length === 0) {
      return [];
    }

    // Admin sees all employees
    if (userDepartments.includes('ALL')) {
      return employees;
    }

    // Filter employees by user's accessible departments
    return employees.filter(emp =>
      userDepartments.includes(emp.department)
    );
  },
};

// Standard department list based on your requirements
export const DEPARTMENTS = [
  'IT/SD-ED',
  'IT/CR-A',
  'IT/OER-KS',
  'IT/ITR-O',
  'IT/SKW',
  'IT/OKT-AB',
  'IT/SPN-H',
  'IT/SDU-CU',
  'IT/SBU-CV',
  'IT/SDU-CL',
  'IT/ONK-CV',
  'IT/MIA',
  'TH/CGX-S',
  'IT/SDS-PS',
  'IT/SDS-PG',
  'IT/SCX-PG',
  'IT/MTP',
  'TE/SBU-U',
  'IT/I',
  'IT/BLJ-F',
  'IT/SP-TM1',
  'TE/SML',
  'IT/PVK-1',
  'TE/SMZ-H',
];

export default authService;
