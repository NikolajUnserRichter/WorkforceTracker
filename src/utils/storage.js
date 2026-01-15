/**
 * LocalStorage utility functions for data persistence
 */

const STORAGE_KEYS = {
  EMPLOYEES: 'workforce_employees',
  PROJECTS: 'workforce_projects',
  ASSIGNMENTS: 'workforce_assignments',
  THEME: 'workforce_theme'
};

export const storage = {
  // Get data from localStorage
  get: (key) => {
    try {
      const item = localStorage.getItem(STORAGE_KEYS[key]);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  },

  // Set data to localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      return false;
    }
  },

  // Remove data from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  },

  // Clear all app data from localStorage
  clear: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

export default storage;
