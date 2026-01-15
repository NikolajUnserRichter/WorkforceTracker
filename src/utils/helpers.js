/**
 * Helper utility functions for calculations and data manipulation
 */

import { format, parseISO, isWithinInterval, differenceInDays } from 'date-fns';

// Calculate overall utilization rate across all employees
export const calculateUtilizationRate = (employees, assignments) => {
  const activeEmployees = employees.filter(e => e.availability !== 'On Leave');
  if (activeEmployees.length === 0) return 0;

  const totalAllocation = assignments.reduce((sum, assignment) => {
    const employee = employees.find(e => e.id === assignment.employeeId);
    if (employee && employee.availability !== 'On Leave') {
      return sum + assignment.allocationPercentage;
    }
    return sum;
  }, 0);

  return Math.round((totalAllocation / (activeEmployees.length * 100)) * 100);
};

// Calculate utilization for a specific employee
export const calculateEmployeeUtilization = (employeeId, assignments) => {
  const employeeAssignments = assignments.filter(a => a.employeeId === employeeId);
  const totalAllocation = employeeAssignments.reduce(
    (sum, a) => sum + a.allocationPercentage,
    0
  );
  return Math.min(totalAllocation, 100);
};

// Calculate skills match between employee and project
export const calculateSkillsMatch = (employeeSkills, requiredSkills) => {
  if (!requiredSkills || requiredSkills.length === 0) return 100;

  const employeeSkillNames = employeeSkills.map(s => s.name.toLowerCase());
  const matchingSkills = requiredSkills.filter(skill =>
    employeeSkillNames.includes(skill.toLowerCase())
  );

  return Math.round((matchingSkills.length / requiredSkills.length) * 100);
};

// Find best matching employees for a project based on skills
export const findBestMatches = (project, employees, assignments) => {
  return employees
    .map(employee => {
      const skillsMatch = calculateSkillsMatch(employee.skills, project.requiredSkills);
      const utilization = calculateEmployeeUtilization(employee.id, assignments);
      const availability = employee.availability;

      // Calculate overall score
      let score = skillsMatch * 0.6; // Skills are 60% of score

      // Availability scoring (40% of score)
      if (availability === 'Available') {
        score += 40;
      } else if (availability === 'Part-time') {
        score += 20;
      } else if (availability === 'Busy' && utilization < 100) {
        score += 10;
      }

      // Penalize over-utilization
      if (utilization >= 100) {
        score = score * 0.3;
      }

      return {
        employee,
        score: Math.round(score),
        skillsMatch,
        utilization,
        hasConflict: utilization >= 100
      };
    })
    .sort((a, b) => b.score - a.score);
};

// Check if there's a date overlap between two date ranges
export const hasDateOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  return s1 <= e2 && e1 >= s2;
};

// Check for allocation conflicts
export const checkAllocationConflicts = (employeeId, newAssignment, existingAssignments) => {
  const conflicts = [];

  existingAssignments.forEach(assignment => {
    if (assignment.employeeId === employeeId && assignment.id !== newAssignment.id) {
      const hasOverlap = hasDateOverlap(
        assignment.startDate,
        assignment.endDate,
        newAssignment.startDate,
        newAssignment.endDate
      );

      if (hasOverlap) {
        const totalAllocation = assignment.allocationPercentage + newAssignment.allocationPercentage;
        if (totalAllocation > 100) {
          conflicts.push({
            assignment,
            overAllocation: totalAllocation - 100
          });
        }
      }
    }
  });

  return conflicts;
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

// Get availability color
export const getAvailabilityColor = (availability) => {
  const colors = {
    'Available': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Busy': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Part-time': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'On Leave': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };
  return colors[availability] || 'bg-gray-100 text-gray-800';
};

// Get project status color
export const getStatusColor = (status) => {
  const colors = {
    'Planning': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Completed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get utilization color based on percentage
export const getUtilizationColor = (percentage) => {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  if (percentage >= 40) return 'text-green-600 dark:text-green-400';
  return 'text-blue-600 dark:text-blue-400';
};

// Generate unique ID
export const generateId = (prefix = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get all unique skills from employees
export const getAllSkills = (employees) => {
  const skillsSet = new Set();
  employees.forEach(emp => {
    emp.skills.forEach(skill => skillsSet.add(skill.name));
  });
  return Array.from(skillsSet).sort();
};

// Get all unique departments
export const getAllDepartments = (employees) => {
  const departments = new Set(employees.map(emp => emp.department));
  return Array.from(departments).sort();
};

// Calculate project progress
export const calculateProjectProgress = (project) => {
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  const now = new Date();

  if (now < start) return 0;
  if (now > end) return 100;

  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);

  return Math.round((elapsedDays / totalDays) * 100);
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Filter employees by search term
export const filterEmployees = (employees, searchTerm, filters = {}) => {
  let filtered = employees;

  // Apply search term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      emp.role.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term) ||
      emp.skills.some(s => s.name.toLowerCase().includes(term))
    );
  }

  // Apply availability filter
  if (filters.availability && filters.availability !== 'All') {
    filtered = filtered.filter(emp => emp.availability === filters.availability);
  }

  // Apply department filter
  if (filters.department && filters.department !== 'All') {
    filtered = filtered.filter(emp => emp.department === filters.department);
  }

  // Apply skill filter
  if (filters.skill && filters.skill !== 'All') {
    filtered = filtered.filter(emp =>
      emp.skills.some(s => s.name === filters.skill)
    );
  }

  return filtered;
};

// Filter projects by criteria
export const filterProjects = (projects, filters = {}) => {
  let filtered = projects;

  // Apply status filter
  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter(proj => proj.status === filters.status);
  }

  // Apply date range filter
  if (filters.startDate && filters.endDate) {
    filtered = filtered.filter(proj => {
      const projStart = new Date(proj.startDate);
      const projEnd = new Date(proj.endDate);
      const filterStart = new Date(filters.startDate);
      const filterEnd = new Date(filters.endDate);

      return hasDateOverlap(
        projStart, projEnd,
        filterStart, filterEnd
      );
    });
  }

  return filtered;
};
