
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Trash2, UserCircle, Clock, ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { employeeDB } from '../services/db';
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
  const itemsPerPage = 20; // Smaller chunks for better perceived perf

  // Initial Data Load
  useEffect(() => {
    loadDepartments();
    loadEmployees(); // Load initial page
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
    try {
      let data = [];
      let count = 0;

      const isFiltering = searchQuery || filterDepartment !== 'all' || filterStatus !== 'all';

      if (isFiltering) {
        // Optimized Filter Strategy could go here.
        // For now, we use the existing filter method but we should be careful with 110k records.
        // Ideally we would push this logic to the DB service with optimized indices.
        // Since employeeDB.filter returns ALL matches, we slice it here for pagination.
        // This is the bottleneck for searching 110k records but prevents the main thread freeze of loading ALL 110k at startup.

        let allMatches = [];

        if (searchQuery) {
          allMatches = await employeeDB.searchByName(searchQuery);
          // Then apply other filters in memory on the search results (usually much smaller set)
          if (filterDepartment !== 'all') {
            allMatches = allMatches.filter(e => e.department === filterDepartment);
          }
          if (filterStatus !== 'all') {
            allMatches = allMatches.filter(e => e.status === filterStatus);
          }
        } else {
          // Use filter criteria
          const criteria = {};
          if (filterDepartment !== 'all') criteria.department = filterDepartment;
          if (filterStatus !== 'all') criteria.status = filterStatus;
          allMatches = await employeeDB.filter(criteria);
        }

        count = allMatches.length;
        const start = (currentPage - 1) * itemsPerPage;
        data = allMatches.slice(start, start + itemsPerPage);

      } else {
        // Fast Path: Direct Pagination from DB
        // We need total count first
        count = await employeeDB.count();
        const offset = (currentPage - 1) * itemsPerPage;
        data = await employeeDB.getPaginated(offset, itemsPerPage);
      }

      setEmployees(data);
      setTotalCount(count);

    } catch (error) {
      console.error('Error loading employees:', error);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Employees
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
              {totalCount.toLocaleString()} Total
            </span>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Manage your workforce directory
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadEmployees()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card p-5 bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 lg:col-span-5">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={handleSearch}
                className="input-field pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-all font-medium"
              />
            </div>
          </div>

          <div className="md:col-span-3 lg:col-span-3">
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterDepartment}
                onChange={(e) => {
                  setFilterDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field pl-10 appearance-none bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 lg:col-span-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field pl-10 appearance-none bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="card overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  Employee
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  Role
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  Department
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  FTE
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 dark:text-gray-400">
                  Reduction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                // Loading Skeletons
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                employees.map(employee => (
                  <tr key={employee.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 shadow-sm">
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {employee.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {employee.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {employee.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${employee.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                          : employee.status === 'inactive'
                            ? 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                        }
                        `}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'active' ? 'bg-emerald-500' :
                            employee.status === 'inactive' ? 'bg-gray-400' : 'bg-rose-500'
                          }`}></span>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {employee.fte}%
                    </td>
                    <td className="px-6 py-4">
                      {employee.reductionProgram?.status === 'active' ? (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md w-fit">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            {employee.reductionProgram.reductionPercentage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700 text-lg">·</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount > 0 ? (
              <>Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results</>
            ) : 'No results'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page {currentPage}</span>
              <span className="text-sm text-gray-400">/ {totalPages || 1}</span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
