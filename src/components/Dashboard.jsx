/**
 * Dashboard Component
 * Main dashboard showing key workforce metrics and overview
 */

import React, { useMemo } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  UserCheck,
  Clock,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const Dashboard = ({ onOpenImport }) => {
  const { employees, projects, reductionPrograms, assignments, loading } = useApp();

  // Calculate metrics
  const metrics = useMemo(() => {
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

    // Department breakdown
    const departmentCounts = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    // Status breakdown
    const statusCounts = employees.reduce((acc, emp) => {
      const status = emp.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEmployees,
      activeProjects,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      availableEmployees,
      activeReductions,
      departmentCounts,
      statusCounts,
    };
  }, [employees, projects, reductionPrograms, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Upload className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Data Available
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Get started by importing your HR data. Our system can handle 110,000+ employee records efficiently.
        </p>
        <button
          onClick={onOpenImport}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Import HR Data
        </button>
      </div>
    );
  }

  const topDepartments = Object.entries(metrics.departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Workforce Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your workforce metrics and key performance indicators
          </p>
        </div>
        <button
          onClick={onOpenImport}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Import Data
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.totalEmployees.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Employees
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.activeProjects}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Active Projects
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.utilizationRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Utilization Rate
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.availableEmployees}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Available
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.activeReductions}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Reduction Programs
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
