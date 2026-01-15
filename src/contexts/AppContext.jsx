/**
 * App Context
 * Global application state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { employeeDB, projectDB, reductionProgramDB, assignmentDB } from '../services/db';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reductionPrograms, setReductionPrograms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Apply dark mode
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
      const [employeesData, projectsData, programsData, assignmentsData] = await Promise.all([
        employeeDB.getAll(),
        projectDB.getAll(),
        reductionProgramDB.getActive(),
        assignmentDB.getAll(),
      ]);

      setEmployees(employeesData);
      setProjects(projectsData);
      setReductionPrograms(programsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Employee operations
  const addEmployee = useCallback(async (employee) => {
    try {
      const id = await employeeDB.add(employee);
      const newEmployee = { ...employee, id };
      setEmployees(prev => [...prev, newEmployee]);
      return id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }, []);

  const updateEmployee = useCallback(async (id, updates) => {
    try {
      await employeeDB.update(id, updates);
      setEmployees(prev => prev.map(emp =>
        emp.id === id ? { ...emp, ...updates } : emp
      ));
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }, []);

  const deleteEmployee = useCallback(async (id) => {
    try {
      await employeeDB.delete(id);
      await assignmentDB.deleteByEmployee(id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }, []);

  const bulkDeleteEmployees = useCallback(async (ids) => {
    try {
      await employeeDB.bulkDelete(ids);
      setEmployees(prev => prev.filter(emp => !ids.includes(emp.id)));
    } catch (error) {
      console.error('Error bulk deleting employees:', error);
      throw error;
    }
  }, []);

  const refreshEmployees = useCallback(async () => {
    try {
      const employeesData = await employeeDB.getAll();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error refreshing employees:', error);
    }
  }, []);

  // Project operations
  const addProject = useCallback(async (project) => {
    try {
      const id = await projectDB.add(project);
      const newProject = { ...project, id };
      setProjects(prev => [...prev, newProject]);
      return id;
    } catch (error) {
      console.error('Error adding project:', error);
      throw error;
    }
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    try {
      await projectDB.update(id, updates);
      setProjects(prev => prev.map(proj =>
        proj.id === id ? { ...proj, ...updates } : proj
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    try {
      await projectDB.delete(id);
      setProjects(prev => prev.filter(proj => proj.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }, []);

  // Assignment operations
  const assignEmployeeToProject = useCallback(async (employeeId, projectId, allocationPercentage = 100) => {
    try {
      const assignment = {
        employeeId,
        projectId,
        allocationPercentage,
        startDate: new Date().toISOString().split('T')[0],
        adjustedForReduction: false,
      };

      const id = await assignmentDB.add(assignment);
      const newAssignment = { ...assignment, id };
      setAssignments(prev => [...prev, newAssignment]);
      return id;
    } catch (error) {
      console.error('Error assigning employee:', error);
      throw error;
    }
  }, []);

  const removeAssignment = useCallback(async (id) => {
    try {
      await assignmentDB.delete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error removing assignment:', error);
      throw error;
    }
  }, []);

  // Reduction program operations
  const addReductionProgram = useCallback(async (program) => {
    try {
      const id = await reductionProgramDB.add(program);

      // Update employee record
      await employeeDB.update(program.employeeId, {
        reductionProgram: { ...program, id },
      });

      setReductionPrograms(prev => [...prev, { ...program, id }]);
      await refreshEmployees();
      return id;
    } catch (error) {
      console.error('Error adding reduction program:', error);
      throw error;
    }
  }, [refreshEmployees]);

  const updateReductionProgram = useCallback(async (id, updates) => {
    try {
      await reductionProgramDB.update(id, updates);
      setReductionPrograms(prev => prev.map(prog =>
        prog.id === id ? { ...prog, ...updates } : prog
      ));
      await refreshEmployees();
    } catch (error) {
      console.error('Error updating reduction program:', error);
      throw error;
    }
  }, [refreshEmployees]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Get dashboard metrics
  const getDashboardMetrics = useCallback(() => {
    const totalEmployees = employees.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const activeReductions = reductionPrograms.filter(p => p.status === 'active').length;

    // Calculate utilization rate
    const totalCapacity = employees.reduce((sum, emp) => {
      const fte = emp.fte || 100;
      const reduction = emp.reductionProgram?.reductionPercentage || 0;
      return sum + (fte * (1 - reduction / 100));
    }, 0);

    const totalAllocated = assignments.reduce((sum, assignment) => {
      return sum + (assignment.allocationPercentage || 0);
    }, 0);

    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Calculate availability
    const availableEmployees = employees.filter(emp =>
      emp.availability === 'available' || emp.availability === 'part-time'
    ).length;

    return {
      totalEmployees,
      activeProjects,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      availableEmployees,
      activeReductions,
    };
  }, [employees, projects, reductionPrograms, assignments]);

  const value = {
    // State
    employees,
    projects,
    reductionPrograms,
    assignments,
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
