/**
 * Application Context for global state management
 * Manages employees, projects, assignments, and app settings
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { sampleEmployees, sampleProjects, sampleAssignments } from '../data/sampleData';
import storage from '../utils/storage';
import { generateId } from '../utils/helpers';

const AppContext = createContext();

// Action types
const ACTIONS = {
  // Employee actions
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',

  // Project actions
  ADD_PROJECT: 'ADD_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  DELETE_PROJECT: 'DELETE_PROJECT',

  // Assignment actions
  ADD_ASSIGNMENT: 'ADD_ASSIGNMENT',
  UPDATE_ASSIGNMENT: 'UPDATE_ASSIGNMENT',
  DELETE_ASSIGNMENT: 'DELETE_ASSIGNMENT',

  // App settings
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_NOTIFICATION: 'SET_NOTIFICATION',
  CLEAR_NOTIFICATION: 'CLEAR_NOTIFICATION',

  // Data management
  LOAD_DATA: 'LOAD_DATA',
  RESET_DATA: 'RESET_DATA'
};

// Initial state
const initialState = {
  employees: storage.get('EMPLOYEES') || sampleEmployees,
  projects: storage.get('PROJECTS') || sampleProjects,
  assignments: storage.get('ASSIGNMENTS') || sampleAssignments,
  darkMode: storage.get('THEME') || false,
  notification: null
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    // Employee actions
    case ACTIONS.ADD_EMPLOYEE:
      return {
        ...state,
        employees: [...state.employees, { ...action.payload, id: generateId('emp') }]
      };

    case ACTIONS.UPDATE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp.id === action.payload.id ? action.payload : emp
        )
      };

    case ACTIONS.DELETE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.filter(emp => emp.id !== action.payload),
        assignments: state.assignments.filter(assign => assign.employeeId !== action.payload)
      };

    // Project actions
    case ACTIONS.ADD_PROJECT:
      return {
        ...state,
        projects: [...state.projects, { ...action.payload, id: generateId('proj') }]
      };

    case ACTIONS.UPDATE_PROJECT:
      return {
        ...state,
        projects: state.projects.map(proj =>
          proj.id === action.payload.id ? action.payload : proj
        )
      };

    case ACTIONS.DELETE_PROJECT:
      return {
        ...state,
        projects: state.projects.filter(proj => proj.id !== action.payload),
        assignments: state.assignments.filter(assign => assign.projectId !== action.payload)
      };

    // Assignment actions
    case ACTIONS.ADD_ASSIGNMENT:
      return {
        ...state,
        assignments: [...state.assignments, { ...action.payload, id: generateId('assign') }]
      };

    case ACTIONS.UPDATE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.map(assign =>
          assign.id === action.payload.id ? action.payload : assign
        )
      };

    case ACTIONS.DELETE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.filter(assign => assign.id !== action.payload)
      };

    // App settings
    case ACTIONS.TOGGLE_THEME:
      return {
        ...state,
        darkMode: !state.darkMode
      };

    case ACTIONS.SET_NOTIFICATION:
      return {
        ...state,
        notification: action.payload
      };

    case ACTIONS.CLEAR_NOTIFICATION:
      return {
        ...state,
        notification: null
      };

    // Data management
    case ACTIONS.LOAD_DATA:
      return {
        ...state,
        ...action.payload
      };

    case ACTIONS.RESET_DATA:
      return {
        ...state,
        employees: sampleEmployees,
        projects: sampleProjects,
        assignments: sampleAssignments
      };

    default:
      return state;
  }
};

// Context Provider Component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    storage.set('EMPLOYEES', state.employees);
  }, [state.employees]);

  useEffect(() => {
    storage.set('PROJECTS', state.projects);
  }, [state.projects]);

  useEffect(() => {
    storage.set('ASSIGNMENTS', state.assignments);
  }, [state.assignments]);

  useEffect(() => {
    storage.set('THEME', state.darkMode);

    // Apply dark mode class to document
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => {
        dispatch({ type: ACTIONS.CLEAR_NOTIFICATION });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  // Helper function to show notifications
  const showNotification = (message, type = 'success') => {
    dispatch({
      type: ACTIONS.SET_NOTIFICATION,
      payload: { message, type }
    });
  };

  // Employee methods
  const addEmployee = (employee) => {
    dispatch({ type: ACTIONS.ADD_EMPLOYEE, payload: employee });
    showNotification('Employee added successfully', 'success');
  };

  const updateEmployee = (employee) => {
    dispatch({ type: ACTIONS.UPDATE_EMPLOYEE, payload: employee });
    showNotification('Employee updated successfully', 'success');
  };

  const deleteEmployee = (employeeId) => {
    dispatch({ type: ACTIONS.DELETE_EMPLOYEE, payload: employeeId });
    showNotification('Employee deleted successfully', 'success');
  };

  // Project methods
  const addProject = (project) => {
    dispatch({ type: ACTIONS.ADD_PROJECT, payload: project });
    showNotification('Project added successfully', 'success');
  };

  const updateProject = (project) => {
    dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: project });
    showNotification('Project updated successfully', 'success');
  };

  const deleteProject = (projectId) => {
    dispatch({ type: ACTIONS.DELETE_PROJECT, payload: projectId });
    showNotification('Project deleted successfully', 'success');
  };

  // Assignment methods
  const addAssignment = (assignment) => {
    dispatch({ type: ACTIONS.ADD_ASSIGNMENT, payload: assignment });
    showNotification('Assignment created successfully', 'success');
  };

  const updateAssignment = (assignment) => {
    dispatch({ type: ACTIONS.UPDATE_ASSIGNMENT, payload: assignment });
    showNotification('Assignment updated successfully', 'success');
  };

  const deleteAssignment = (assignmentId) => {
    dispatch({ type: ACTIONS.DELETE_ASSIGNMENT, payload: assignmentId });
    showNotification('Assignment removed successfully', 'success');
  };

  // Theme toggle
  const toggleTheme = () => {
    dispatch({ type: ACTIONS.TOGGLE_THEME });
  };

  // Reset all data
  const resetData = () => {
    dispatch({ type: ACTIONS.RESET_DATA });
    showNotification('Data reset to defaults', 'info');
  };

  const value = {
    // State
    employees: state.employees,
    projects: state.projects,
    assignments: state.assignments,
    darkMode: state.darkMode,
    notification: state.notification,

    // Methods
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addProject,
    updateProject,
    deleteProject,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleTheme,
    resetData,
    showNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
