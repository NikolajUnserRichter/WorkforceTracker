import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  UserCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { employeeDB } from '../services/unifiedDB';
import toast from 'react-hot-toast';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [departments, setDepartments] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Initial Data Load
  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, []);

  // Reload when page or filters change
  useEffect(() => {
    loadEmployees();
  }, [currentPage, filterDepartment, filterStatus, searchQuery]);

  const loadDepartments = async () => {
    try {
      const depts = await employeeDB.getUniqueDepartments();
      setDepartments(['all', ...depts.sort()]);
    } catch (error) {
      console.error('Failed to load departments', error);
    }
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    console.log('[EmployeeList] loadEmployees called, page:', currentPage);
    try {
      let data = [];
      let count = 0;

      const isFiltering = searchQuery || filterDepartment !== 'all' || filterStatus !== 'all';

      if (isFiltering) {
        let allMatches = [];

        if (searchQuery) {
          allMatches = await employeeDB.searchByName(searchQuery);
          if (filterDepartment !== 'all') {
            allMatches = allMatches.filter(e => e.department === filterDepartment);
          }
          if (filterStatus !== 'all') {
            allMatches = allMatches.filter(e => e.status === filterStatus);
          }
        } else {
          const criteria = {};
          if (filterDepartment !== 'all') criteria.department = filterDepartment;
          if (filterStatus !== 'all') criteria.status = filterStatus;
          allMatches = await employeeDB.filter(criteria);
        }

        count = allMatches.length;
        const start = (currentPage - 1) * itemsPerPage;
        data = allMatches.slice(start, start + itemsPerPage);

      } else {
        count = await employeeDB.count();
        console.log('[EmployeeList] count result:', count);
        const offset = (currentPage - 1) * itemsPerPage;
        data = await employeeDB.getPaginated(offset, itemsPerPage);
        console.log('[EmployeeList] getPaginated result:', data?.length, 'employees');
      }

      setEmployees(data);
      setTotalCount(count);
      console.log('[EmployeeList] state updated, count:', count, 'employees:', data?.length);

    } catch (error) {
      console.error('[EmployeeList] Error loading employees:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterDepartment, filterStatus, itemsPerPage]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge badge-active">
            <span className="status-dot status-dot-active" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="badge badge-inactive">
            <span className="status-dot status-dot-inactive" />
            Inactive
          </span>
        );
      case 'terminated':
        return (
          <span className="badge badge-warning">
            <span className="status-dot status-dot-warning" />
            Terminated
          </span>
        );
      default:
        return (
          <span className="badge badge-inactive">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
              Employees
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
              {totalCount.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Browse and manage workforce directory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadEmployees()}
            className="btn btn-ghost btn-icon"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={handleSearch}
              className="input pl-9"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:w-48">
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="select"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:w-36">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="table-container">
          <table className="table table-sticky">
            <thead>
              <tr>
                <th className="w-[280px]">Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th className="w-[100px]">Status</th>
                <th className="w-[80px] text-right">FTE</th>
                <th className="w-[100px] text-right">Reduction</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading Skeletons
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="skeleton w-9 h-9 rounded-full" />
                        <div className="space-y-1.5">
                          <div className="skeleton h-4 w-32" />
                          <div className="skeleton h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td><div className="skeleton h-4 w-24" /></td>
                    <td><div className="skeleton h-4 w-20" /></td>
                    <td><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td><div className="skeleton h-4 w-10 ml-auto" /></td>
                    <td><div className="skeleton h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12">
                    <div className="empty-state">
                      <UserCircle className="empty-state-icon" />
                      <p className="empty-state-title">No employees found</p>
                      <p className="empty-state-description">
                        {searchQuery || filterDepartment !== 'all' || filterStatus !== 'all'
                          ? 'Try adjusting your filters to find what you are looking for.'
                          : 'Import HR data to populate your employee directory.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map(employee => (
                  <tr key={employee.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-p3-midnight dark:text-white">
                            {employee.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-p3-midnight dark:text-white truncate">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {employee.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {employee.role || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.department || '—'}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(employee.status)}
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {employee.fte}%
                      </span>
                    </td>
                    <td className="text-right">
                      {employee.reductionProgram?.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-warning/10 text-warning rounded">
                          <Clock className="w-3 h-3" />
                          {employee.reductionProgram.reductionPercentage}%
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalCount > 0 ? (
              <>
                Showing{' '}
                <span className="font-medium text-p3-midnight dark:text-white">
                  {((currentPage - 1) * itemsPerPage) + 1}
                </span>
                {' '}to{' '}
                <span className="font-medium text-p3-midnight dark:text-white">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>
                {' '}of{' '}
                <span className="font-medium text-p3-midnight dark:text-white">
                  {totalCount.toLocaleString()}
                </span>
                {' '}employees
              </>
            ) : (
              'No results'
            )}
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="btn btn-ghost btn-sm btn-icon disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {totalPages <= 7 ? (
                [...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`
                      min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors
                      ${currentPage === i + 1
                        ? 'bg-p3-electric text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {i + 1}
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className={`
                      min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors
                      ${currentPage === 1
                        ? 'bg-p3-electric text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    1
                  </button>

                  {currentPage > 3 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}

                  {[...Array(3)].map((_, i) => {
                    const page = Math.max(2, Math.min(currentPage - 1 + i, totalPages - 1));
                    if (page === 1 || page === totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`
                          min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors
                          ${currentPage === page
                            ? 'bg-p3-electric text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        {page}
                      </button>
                    );
                  })}

                  {currentPage < totalPages - 2 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`
                      min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors
                      ${currentPage === totalPages
                        ? 'bg-p3-electric text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading || totalPages === 0}
              className="btn btn-ghost btn-sm btn-icon disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
