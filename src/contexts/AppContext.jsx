
/**
 * App Context
 * Global application state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  employeeDB,
  projectDB,
  reductionProgramDB,
  assignmentDB
} from '../services/unifiedDB';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children, currentUser }) => {
  // We keep projects and active reduction programs in memory as they are smaller datasets
  const [projects, setProjects] = useState([]);
  const [reductionPrograms, setReductionPrograms] = useState([]);

  // Employees are no longer fully loaded into memory.
  // We expose an empty array for compatibility where strict array access isn't used,
  // but components should use the DB service for lists/filtering.
  const [employees, setEmployees] = useState([]); // Kept empty or sparse

  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Load initial light/heavy data
  useEffect(() => {
    loadAllData();
  }, []);

  // Theme Management
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projectsData, programsData] = await Promise.all([
        projectDB.getAll().catch(() => []),
        reductionProgramDB.getActive().catch(() => []),
      ]);
      setProjects(projectsData || []);
      setReductionPrograms(programsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't show error toast on initial load - DB might not be initialized yet
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // --- CRUD Wrappers ---

  // Employee Operations
  const addEmployee = async (employee) => {
    try {
      await employeeDB.add(employee);
      // We don't update local state 'employees' to avoid memory bloat
      toast.success('Employee added successfully');
      return true;
    } catch (error) {
      console.error('Add employee error:', error);
      toast.error('Failed to add employee');
      return false;
    }
  };

  const updateEmployee = async (id, updates) => {
    try {
      await employeeDB.update(id, updates);
      toast.success('Employee updated successfully');
      return true;
    } catch (error) {
      console.error('Update employee error:', error);
      toast.error('Failed to update employee');
      return false;
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await employeeDB.delete(id);
      // clean up assignments
      // Note: In a real app we might want to cascade delete or warn
      toast.success('Employee deleted successfully');
      return true;
    } catch (error) {
      console.error('Delete employee error:', error);
      toast.error('Failed to delete employee');
      return false;
    }
  };

  const bulkDeleteEmployees = async (ids) => {
    try {
      await employeeDB.bulkDelete(ids);
      toast.success(`${ids.length} employees deleted`);
      return true;
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete employees');
      return false;
    }
  };

  // Helper for components that might still try to refresh "all" employees
  const refreshEmployees = async () => {
    // No-op for memory safety. 
    // Components should trigger their own DB re-fetch.
    console.log('refreshEmployees called - operating in optimized mode');
  };

  // Project Operations
  const addProject = async (project) => {
    try {
      const id = await projectDB.add(project);
      setProjects(prev => [...prev, { ...project, id }]);
      toast.success('Project added');
      return true;
    } catch (error) {
      console.error('Add project error:', error);
      toast.error('Failed to add project: ' + (error.message || 'Unknown error'));
      return false;
    }
  };

  const updateProject = async (id, updates) => {
    try {
      await projectDB.update(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Project updated');
      return true;
    } catch (error) {
      console.error('Update project error:', error);
      toast.error('Failed to update project');
      return false;
    }
  };

  const deleteProject = async (id) => {
    try {
      await projectDB.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
      return true;
    } catch (error) {
      console.error('Delete project error:', error);
      toast.error('Failed to delete project: ' + (error.message || 'Unknown error'));
      return false;
    }
  };

  // Assignment Operations
  const assignEmployeeToProject = async (assignment) => {
    try {
      await assignmentDB.add(assignment);
      toast.success('Assignment created');
      return true;
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to create assignment');
      return false;
    }
  };

  const removeAssignment = async (id) => {
    try {
      await assignmentDB.delete(id);
      toast.success('Assignment removed');
      return true;
    } catch (error) {
      console.error('Remove assignment error:', error);
      toast.error('Failed to remove assignment');
      return false;
    }
  };

  // Reduction Programs
  const addReductionProgram = async (program) => {
    try {
      const id = await reductionProgramDB.add(program);
      if (program.status === 'active') {
        setReductionPrograms(prev => [...prev, { ...program, id }]);
      }
      toast.success('Reduction program added');
      return true;
    } catch (error) {
      console.error('Add reduction program error:', error);
      toast.error('Failed to add reduction program');
      return false;
    }
  };

  const updateReductionProgram = async (id, updates) => {
    try {
      await reductionProgramDB.update(id, updates);
      loadAllData(); // Refresh active programs list
      toast.success('Reduction program updated');
      return true;
    } catch (error) {
      console.error('Update reduction program error:', error);
      toast.error('Failed to update reduction program');
      return false;
    }
  };

  // --- Metrics & Dashboard ---

  const getDashboardMetrics = useCallback(async () => {
    const [empStats, assignStats] = await Promise.all([
      employeeDB.getStats(),
      assignmentDB.getStats()
    ]);

    const activeProjects = projects.filter(p => p.status === 'active').length;
    const activeReductions = reductionPrograms.filter(p => p.status === 'active').length;

    // Check if empStats returned the full detailed object or just the basic one
    // We assume the DB service is updated to return detailed stats

    const totalAllocated = assignStats.totalAllocated;

    const utilizationRate = empStats.totalCapacity > 0
      ? (totalAllocated / empStats.totalCapacity) * 100
      : 0;

    const avgFTE = empStats.totalEmployees > 0 ? (empStats.totalFTE / empStats.totalEmployees) : 0;
    const avgReductionInpact = empStats.totalEmployees > 0 ? (empStats.reductionImpactSum / empStats.totalEmployees) : 0;

    return {
      totalEmployees: empStats.totalEmployees,
      activeProjects,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      availableEmployees: empStats.availableEmployees,
      activeReductions,

      // Detailed stats for Reports
      departmentCounts: empStats.departmentCounts || {},
      statusCounts: empStats.statusCounts || {},
      roleCounts: empStats.roleCounts || {},
      totalFTE: Math.round((empStats.totalFTE || 0) * 10) / 10,
      avgFTE: Math.round(avgFTE * 10) / 10,
      reductionImpact: Math.round(avgReductionInpact * 10) / 10,
    };
  }, [projects, reductionPrograms]);

  const value = {
    // State
    employees, // Exposed but empty/sparse
    projects,
    reductionPrograms,
    loading,
    darkMode,
    currentView,

    // Actions
    addEmployee,
    updateEmployee,
    deleteEmployee,
    bulkDeleteEmployees,
    refreshEmployees,
    addProject,
    updateProject,
    deleteProject,
    assignEmployeeToProject,
    removeAssignment,
    addReductionProgram,
    updateReductionProgram,
    toggleDarkMode,
    setCurrentView,
    loadAllData,
    getDashboardMetrics,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
