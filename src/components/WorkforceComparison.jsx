/**
 * Workforce Comparison Component
 * Track workforce reduction over time - comparing headcount and costs between versions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  Download,
  RefreshCw,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { importHistoryDB } from '../services/unifiedDB';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const WorkforceComparison = () => {
  const { } = useApp();
  const [importHistory, setImportHistory] = useState([]);
  const [selectedBaseline, setSelectedBaseline] = useState(null);
  const [selectedCurrent, setSelectedCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImportHistory();
  }, []);

  const loadImportHistory = async () => {
    try {
      setLoading(true);
      const history = await importHistoryDB.getAll();

      // Sort by timestamp descending (newest first)
      // Handle both IndexedDB (timestamp) and Supabase (created_at) formats
      const sorted = (history || []).sort((a, b) =>
        new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at)
      );

      setImportHistory(sorted);

      // Auto-select most recent two versions if available
      if (sorted.length >= 2) {
        setSelectedCurrent(sorted[0].id);
        setSelectedBaseline(sorted[1].id);
      } else if (sorted.length === 1) {
        setSelectedCurrent(sorted[0].id);
      }
    } catch (error) {
      console.error('Error loading import history:', error);
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  // Helper to normalize field names between IndexedDB and Supabase formats
  const normalizeRecord = (record) => ({
    ...record,
    totalRecords: record.totalRecords || record.total_records || 0,
    totalSalary: record.totalSalary || record.total_salary || 0,
    departmentBreakdown: record.departmentBreakdown || record.department_breakdown || {},
    fileName: record.fileName || record.file_name || 'Unknown',
    timestamp: record.timestamp || record.created_at,
  });

  // Calculate comparison metrics
  const comparison = useMemo(() => {
    if (!selectedBaseline || !selectedCurrent) {
      return null;
    }

    const baselineRaw = importHistory.find(h => h.id === selectedBaseline);
    const currentRaw = importHistory.find(h => h.id === selectedCurrent);

    if (!baselineRaw || !currentRaw) {
      return null;
    }

    const baseline = normalizeRecord(baselineRaw);
    const current = normalizeRecord(currentRaw);

    // Calculate headcount changes
    const headcountChange = current.totalRecords - baseline.totalRecords;
    const headcountChangePercent = baseline.totalRecords > 0
      ? ((headcountChange / baseline.totalRecords) * 100).toFixed(1)
      : 0;

    // Calculate cost changes
    const baselineCost = baseline.totalSalary || 0;
    const currentCost = current.totalSalary || 0;
    const costChange = currentCost - baselineCost;
    const costChangePercent = baselineCost > 0
      ? ((costChange / baselineCost) * 100).toFixed(1)
      : 0;

    // Department-level changes
    const baselineDepts = baseline.departmentBreakdown || {};
    const currentDepts = current.departmentBreakdown || {};
    const allDepts = new Set([...Object.keys(baselineDepts), ...Object.keys(currentDepts)]);

    const departmentChanges = Array.from(allDepts).map(dept => {
      const baselineCount = baselineDepts[dept]?.count || 0;
      const currentCount = currentDepts[dept]?.count || 0;
      const change = currentCount - baselineCount;
      const changePercent = baselineCount > 0 ? ((change / baselineCount) * 100).toFixed(1) : 0;

      const baselineSalary = baselineDepts[dept]?.totalSalary || 0;
      const currentSalary = currentDepts[dept]?.totalSalary || 0;
      const salaryChange = currentSalary - baselineSalary;

      return {
        department: dept,
        baselineCount,
        currentCount,
        change,
        changePercent,
        baselineSalary,
        currentSalary,
        salaryChange,
      };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
      baseline,
      current,
      headcountChange,
      headcountChangePercent,
      costChange,
      costChangePercent,
      departmentChanges,
      savingsAchieved: costChange < 0,
    };
  }, [selectedBaseline, selectedCurrent, importHistory]);

  const exportComparison = () => {
    if (!comparison) return;

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Workforce Reduction Analysis'],
      ['Generated: ' + new Date().toLocaleString()],
      [''],
      ['Baseline Version'],
      ['Date', new Date(comparison.baseline.timestamp).toLocaleDateString()],
      ['File', comparison.baseline.fileName],
      ['Total Employees', comparison.baseline.totalRecords],
      ['Total Cost', comparison.baseline.totalSalary ? '$' + comparison.baseline.totalSalary.toLocaleString() : 'N/A'],
      [''],
      ['Current Version'],
      ['Date', new Date(comparison.current.timestamp).toLocaleDateString()],
      ['File', comparison.current.fileName],
      ['Total Employees', comparison.current.totalRecords],
      ['Total Cost', comparison.current.totalSalary ? '$' + comparison.current.totalSalary.toLocaleString() : 'N/A'],
      [''],
      ['Changes'],
      ['Headcount Change', comparison.headcountChange + ' (' + comparison.headcountChangePercent + '%)'],
      ['Cost Change', '$' + comparison.costChange.toLocaleString() + ' (' + comparison.costChangePercent + '%)'],
      ['Status', comparison.savingsAchieved ? 'Cost Savings Achieved' : 'Cost Increase'],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Department changes sheet
    const deptData = [
      ['Department', 'Baseline Count', 'Current Count', 'Change', 'Change %', 'Baseline Cost', 'Current Cost', 'Cost Change'],
      ...comparison.departmentChanges.map(d => [
        d.department,
        d.baselineCount,
        d.currentCount,
        d.change,
        d.changePercent + '%',
        d.baselineSalary ? '$' + d.baselineSalary.toLocaleString() : 'N/A',
        d.currentSalary ? '$' + d.currentSalary.toLocaleString() : 'N/A',
        d.salaryChange ? '$' + d.salaryChange.toLocaleString() : 'N/A',
      ]),
    ];

    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Department Changes');

    XLSX.writeFile(workbook, 'workforce-reduction-analysis-' + new Date().toISOString().split('T')[0] + '.xlsx');
    toast.success('Comparison report exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (importHistory.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Import History
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Import employee data at least twice to compare workforce changes over time
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Workforce Reduction Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Compare headcount and cost changes between data versions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadImportHistory}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {comparison && (
            <button
              onClick={exportComparison}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Analysis
            </button>
          )}
        </div>
      </div>

      {/* Version Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Versions to Compare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baseline Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Baseline Version (Older)
            </label>
            <select
              value={selectedBaseline || ''}
              onChange={(e) => setSelectedBaseline(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="">Select baseline version...</option>
              {importHistory.map((history) => (
                <option key={history.id} value={history.id}>
                  {new Date(history.timestamp).toLocaleDateString()} - {history.fileName} ({history.totalRecords} employees)
                </option>
              ))}
            </select>
          </div>

          {/* Current Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Version (Newer)
            </label>
            <select
              value={selectedCurrent || ''}
              onChange={(e) => setSelectedCurrent(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="">Select current version...</option>
              {importHistory.map((history) => (
                <option key={history.id} value={history.id}>
                  {new Date(history.timestamp).toLocaleDateString()} - {history.fileName} ({history.totalRecords} employees)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Headcount Change */}
            <div className={
              (comparison.headcountChange < 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : comparison.headcountChange > 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600') + ' rounded-lg p-6 border'
            }>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Headcount Change
                </span>
                {comparison.headcountChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : comparison.headcountChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {comparison.headcountChange > 0 ? '+' : ''}{comparison.headcountChange}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {comparison.headcountChangePercent > 0 ? '+' : ''}{comparison.headcountChangePercent}% from baseline
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Baseline: {comparison.baseline.totalRecords}</span>
                  <span>Current: {comparison.current.totalRecords}</span>
                </div>
              </div>
            </div>

            {/* Cost Change */}
            <div className={
              (comparison.costChange < 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : comparison.costChange > 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600') + ' rounded-lg p-6 border'
            }>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cost Change
                </span>
                <DollarSign className={
                  comparison.costChange < 0
                    ? 'w-5 h-5 text-green-600 dark:text-green-400'
                    : 'w-5 h-5 text-red-600 dark:text-red-400'
                } />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {comparison.costChange > 0 ? '+' : ''}${Math.abs(comparison.costChange).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {comparison.costChangePercent > 0 ? '+' : ''}{comparison.costChangePercent}% from baseline
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {comparison.savingsAchieved ? (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Cost savings achieved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Cost increase detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Time Period */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Analysis Period
                </span>
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {Math.ceil(
                  (new Date(comparison.current.timestamp) - new Date(comparison.baseline.timestamp)) /
                  (1000 * 60 * 60 * 24)
                )} days
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Between data versions
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{new Date(comparison.baseline.timestamp).toLocaleDateString()}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{new Date(comparison.current.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department-Level Changes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Department-Level Changes
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Headcount and cost changes by department
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Baseline Count
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Current Count
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cost Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {comparison.departmentChanges.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {dept.department}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600 dark:text-gray-400">
                        {dept.baselineCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600 dark:text-gray-400">
                        {dept.currentCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={
                          dept.change < 0
                            ? 'inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded'
                            : dept.change > 0
                              ? 'inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-medium rounded'
                              : 'inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded'
                        }>
                          {dept.change > 0 && <TrendingUp className="w-3 h-3" />}
                          {dept.change < 0 && <TrendingDown className="w-3 h-3" />}
                          {dept.change > 0 ? '+' : ''}{dept.change} ({dept.changePercent}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={
                          dept.salaryChange < 0
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : dept.salaryChange > 0
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
                        }>
                          {dept.salaryChange > 0 ? '+' : ''}${dept.salaryChange.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Info Banner */}
      {importHistory.length < 2 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Need more data versions</p>
            <p>Import employee data multiple times to track workforce reduction progress over time. Each import creates a snapshot for comparison.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceComparison;
