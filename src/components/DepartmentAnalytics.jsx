/**
 * Department Analytics
 * Aggregated analysis by department - GDPR compliant (no personal data)
 * P3 Enterprise Design System
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { employeeDB } from '../services/unifiedDB';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { DepartmentBarChart, DepartmentPieChart, StatusBarChart } from './charts/DepartmentChart';
import { HeadcountTrendChart, CostTrendChart } from './charts/TrendChart';
import { importHistoryDB } from '../services/unifiedDB';

// Summary Card Component
const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary': return 'border-l-4 border-l-p3-electric';
      case 'success': return 'border-l-4 border-l-success';
      case 'warning': return 'border-l-4 border-l-warning';
      default: return '';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 ${getVariantStyles()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${trend >= 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-semibold text-p3-midnight dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

// Department Row Component
const DepartmentRow = ({ dept, isExpanded, onToggle, totalEmployees }) => {
  const percentage = totalEmployees > 0 ? ((dept.count / totalEmployees) * 100).toFixed(1) : 0;
  const avgFTE = dept.count > 0 ? (dept.totalFTE / dept.count).toFixed(1) : 0;
  const reductionPercent = dept.count > 0 ? ((dept.reductionCount / dept.count) * 100).toFixed(0) : 0;

  const formatCurrency = (value) => {
    if (!value || value === 0) return '—';
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center py-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-p3-midnight dark:text-white truncate">
              {dept.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {dept.count.toLocaleString()} employees
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-32 mx-4 hidden sm:block">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-p3-electric rounded-full transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage}%</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-right">
          <div className="hidden md:block">
            <p className="text-sm font-medium text-p3-midnight dark:text-white">{avgFTE}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg FTE</p>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-p3-midnight dark:text-white">{formatCurrency(dept.totalSalary)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
          </div>
          <div className="w-16">
            <p className={`text-sm font-medium ${dept.reductionCount > 0 ? 'text-warning' : 'text-gray-400'}`}>
              {dept.reductionCount > 0 ? `${reductionPercent}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reduction</p>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-11 bg-gray-50 dark:bg-gray-800/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Headcount</p>
              <p className="text-lg font-semibold text-p3-midnight dark:text-white">{dept.count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total FTE</p>
              <p className="text-lg font-semibold text-p3-midnight dark:text-white">{dept.totalFTE.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
              <p className="text-lg font-semibold text-p3-midnight dark:text-white">{formatCurrency(dept.totalSalary)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Reduction</p>
              <p className={`text-lg font-semibold ${dept.reductionCount > 0 ? 'text-warning' : 'text-gray-400'}`}>
                {dept.reductionCount}
              </p>
            </div>
          </div>

          {dept.totalSalary > 0 && dept.count > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Average cost per employee: <span className="font-medium text-p3-midnight dark:text-white">{formatCurrency(dept.totalSalary / dept.count)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DepartmentAnalytics = () => {
  const { getDashboardMetrics } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [sortBy, setSortBy] = useState('headcount'); // headcount, cost, name, reduction
  const [filterMinHeadcount, setFilterMinHeadcount] = useState(0);
  const [activeTab, setActiveTab] = useState('departments'); // departments, costcenters, locations, trends
  const [importHistory, setImportHistory] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [data, history] = await Promise.all([
          getDashboardMetrics(),
          importHistoryDB.getAll().catch(() => [])
        ]);
        setMetrics(data);
        // Sort history by timestamp descending
        const sortedHistory = (history || []).sort((a, b) => {
          const dateA = new Date(a.timestamp || a.created_at);
          const dateB = new Date(b.timestamp || b.created_at);
          return dateB - dateA;
        });
        setImportHistory(sortedHistory);
      } catch (error) {
        console.error('Failed to load metrics:', error);
        toast.error('Failed to load department data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getDashboardMetrics]);

  // Process department data
  const departmentList = useMemo(() => {
    if (!metrics?.departmentDetails) return [];

    return Object.entries(metrics.departmentDetails)
      .map(([name, data]) => ({
        name,
        count: data.count || 0,
        totalFTE: data.totalFTE || 0,
        totalSalary: data.totalSalary || 0,
        reductionCount: data.reductionCount || 0,
      }))
      .filter(d => d.count >= filterMinHeadcount)
      .sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          case 'cost': return b.totalSalary - a.totalSalary;
          case 'reduction': return b.reductionCount - a.reductionCount;
          default: return b.count - a.count;
        }
      });
  }, [metrics, sortBy, filterMinHeadcount]);

  // Process cost center data
  const costCenterList = useMemo(() => {
    if (!metrics?.costCenterCounts) return [];

    return Object.entries(metrics.costCenterCounts)
      .map(([name, count]) => ({
        name,
        count,
        totalFTE: 0, // Not tracked per cost center yet
        totalSalary: 0,
        reductionCount: 0,
      }))
      .filter(d => d.count >= filterMinHeadcount)
      .sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          default: return b.count - a.count;
        }
      });
  }, [metrics, sortBy, filterMinHeadcount]);

  // Process location data
  const locationList = useMemo(() => {
    if (!metrics?.locationCounts) return [];

    return Object.entries(metrics.locationCounts)
      .map(([name, count]) => ({
        name,
        count,
        totalFTE: 0,
        totalSalary: 0,
        reductionCount: 0,
      }))
      .filter(d => d.count >= filterMinHeadcount)
      .sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          default: return b.count - a.count;
        }
      });
  }, [metrics, sortBy, filterMinHeadcount]);

  // Get active list based on tab
  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'costcenters': return costCenterList;
      case 'locations': return locationList;
      default: return departmentList;
    }
  }, [activeTab, departmentList, costCenterList, locationList]);

  // Process trend data from import history
  const trendData = useMemo(() => {
    if (!importHistory || importHistory.length === 0) return [];

    return importHistory
      .slice(0, 20) // Limit to last 20 imports
      .reverse() // Oldest first for chart
      .map(h => {
        const date = new Date(h.timestamp || h.created_at);
        return {
          date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
          fullDate: date.toLocaleDateString('de-DE'),
          headcount: h.totalRecords || h.total_records || 0,
          cost: h.totalSalary || h.total_salary || 0,
        };
      });
  }, [importHistory]);

  const toggleExpand = (deptName) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptName)) {
        newSet.delete(deptName);
      } else {
        newSet.add(deptName);
      }
      return newSet;
    });
  };

  const exportToExcel = () => {
    if (!departmentList.length) return;

    const data = departmentList.map(d => ({
      'Department': d.name,
      'Headcount': d.count,
      'Total FTE': d.totalFTE.toFixed(1),
      'Average FTE': d.count > 0 ? (d.totalFTE / d.count).toFixed(1) : 0,
      'Total Cost': d.totalSalary,
      'Average Cost': d.count > 0 ? Math.round(d.totalSalary / d.count) : 0,
      'In Reduction': d.reductionCount,
      'Reduction %': d.count > 0 ? ((d.reductionCount / d.count) * 100).toFixed(1) : 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Department Analysis');
    XLSX.writeFile(wb, `department-analysis-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export completed');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-p3-electric border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  if (!metrics || metrics.totalEmployees === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-p3-midnight dark:text-white mb-2">No Data Available</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Import employee data to see department analytics.</p>
      </div>
    );
  }

  const totalWithReduction = departmentList.reduce((sum, d) => sum + d.reductionCount, 0);
  const totalCost = departmentList.reduce((sum, d) => sum + d.totalSalary, 0);

  // Tab configuration
  const tabs = [
    { id: 'departments', label: 'Departments', count: Object.keys(metrics?.departmentDetails || {}).length },
    { id: 'costcenters', label: 'Cost Centers', count: Object.keys(metrics?.costCenterCounts || {}).length },
    { id: 'locations', label: 'Locations', count: Object.keys(metrics?.locationCounts || {}).length },
    { id: 'trends', label: 'Trends', count: importHistory.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-p3-midnight dark:text-white">Workforce Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Aggregated workforce analysis - GDPR compliant (no personal data)
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-p3-midnight dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.count === 0}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-900 text-p3-midnight dark:text-white shadow-sm'
                : tab.count === 0
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-p3-midnight dark:hover:text-white'
              }
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Departments"
          value={metrics.departmentCount}
          subtitle={`${departmentList.length} shown`}
          icon={Building2}
          variant="primary"
        />
        <SummaryCard
          title="Total Headcount"
          value={metrics.totalEmployees.toLocaleString()}
          subtitle={`${metrics.totalFTE} FTE`}
          icon={Users}
        />
        <SummaryCard
          title="Total Workforce Cost"
          value={totalCost > 0 ? (totalCost >= 1000000 ? `€${(totalCost/1000000).toFixed(1)}M` : `€${(totalCost/1000).toFixed(0)}K`) : '—'}
          icon={BarChart3}
        />
        <SummaryCard
          title="In Reduction Programs"
          value={totalWithReduction}
          subtitle={metrics.totalEmployees > 0 ? `${((totalWithReduction / metrics.totalEmployees) * 100).toFixed(1)}% of workforce` : ''}
          icon={TrendingDown}
          variant={totalWithReduction > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Charts Section - Trends Tab */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Headcount Trend */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Headcount Over Time
            </h3>
            {trendData.length > 1 ? (
              <HeadcountTrendChart data={trendData} height={280} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                At least 2 imports needed for trend analysis
              </div>
            )}
          </div>

          {/* Cost Trend */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Cost vs. Headcount Trend
            </h3>
            {trendData.length > 1 && trendData.some(d => d.cost > 0) ? (
              <CostTrendChart data={trendData} height={280} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                {trendData.length < 2 ? 'At least 2 imports needed for trend analysis' : 'No cost data available'}
              </div>
            )}
          </div>

          {/* Import History Table */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Import History ({importHistory.length} snapshots)
            </h3>
            {importHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">File</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Records</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Total Cost</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Departments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importHistory.slice(0, 10).map((h, idx) => {
                      const date = new Date(h.timestamp || h.created_at);
                      const records = h.totalRecords || h.total_records || 0;
                      const cost = h.totalSalary || h.total_salary || 0;
                      const depts = Object.keys(h.departmentBreakdown || h.department_breakdown || {}).length;
                      return (
                        <tr key={h.id || idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <td className="py-2 px-3 text-p3-midnight dark:text-white">
                            {date.toLocaleDateString('de-DE')}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {h.fileName || h.file_name || '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-p3-midnight dark:text-white">
                            {records.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-p3-midnight dark:text-white">
                            {cost > 0 ? (cost >= 1000000 ? `€${(cost/1000000).toFixed(1)}M` : `€${(cost/1000).toFixed(0)}K`) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                            {depts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                No import history available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Section - Other Tabs */}
      {activeTab !== 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Headcount by {activeTab === 'departments' ? 'Department' : activeTab === 'costcenters' ? 'Cost Center' : 'Location'} (Top 10)
            </h3>
            <DepartmentBarChart data={activeList} height={280} />
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              {activeTab === 'departments' ? 'Department' : activeTab === 'costcenters' ? 'Cost Center' : 'Location'} Distribution
            </h3>
            <DepartmentPieChart data={activeList} height={280} />
          </div>

          {/* Status Distribution - only on departments tab */}
        {activeTab === 'departments' && metrics.statusCounts && Object.keys(metrics.statusCounts).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Employee Status Distribution
            </h3>
            <StatusBarChart data={metrics.statusCounts} height={180} />
          </div>
        )}

        {/* Cross-reference chart based on tab */}
        {activeTab === 'departments' && metrics.locationCounts && Object.keys(metrics.locationCounts).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Location Distribution
            </h3>
            <DepartmentBarChart data={locationList} height={180} />
          </div>
        )}

        {activeTab !== 'departments' && departmentList.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Department Distribution
            </h3>
            <DepartmentBarChart data={departmentList} height={180} />
          </div>
        )}
        </div>
      )}

      {/* Filters and Sort - hide on trends tab */}
      {activeTab !== 'trends' && (
      <>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
            >
              <option value="headcount">Headcount</option>
              <option value="cost">Total Cost</option>
              <option value="reduction">Reduction Count</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Min. headcount:</span>
            <input
              type="number"
              min="0"
              value={filterMinHeadcount}
              onChange={(e) => setFilterMinHeadcount(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
            />
          </div>
        </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                {activeTab === 'departments' ? 'Departments' : activeTab === 'costcenters' ? 'Cost Centers' : 'Locations'} ({activeList.length})
              </h3>
              <button
                onClick={() => setExpandedDepts(new Set(activeList.map(d => d.name)))}
                className="text-xs text-p3-electric hover:text-primary-600 transition-colors"
              >
                Expand All
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeList.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No {activeTab === 'departments' ? 'departments' : activeTab === 'costcenters' ? 'cost centers' : 'locations'} match the current filter.
                </p>
              </div>
            ) : (
              activeList.map((dept) => (
                <DepartmentRow
                  key={dept.name}
                  dept={dept}
                  isExpanded={expandedDepts.has(dept.name)}
                  onToggle={() => toggleExpand(dept.name)}
                  totalEmployees={metrics.totalEmployees}
                />
              ))
            )}
          </div>
        </div>
      </>
      )}
    </div>
  );
};

export default DepartmentAnalytics;
