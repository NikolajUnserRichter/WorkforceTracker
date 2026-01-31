/**
 * Scenario Simulation
 * What-if analysis for workforce reduction programs
 * GDPR compliant - uses only aggregated data
 * P3 Enterprise Design System
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  TrendingDown,
  Users,
  DollarSign,
  Building2,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { DepartmentBarChart } from './charts/DepartmentChart';

// Scenario Card Component
const ScenarioCard = ({ scenario, isActive, onSelect, onDelete, canDelete }) => {
  const savings = scenario.totalSavings || 0;
  const headcountReduction = scenario.totalHeadcountReduction || 0;

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${isActive
          ? 'border-p3-electric bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-p3-midnight dark:text-white">{scenario.name}</h4>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Savings</span>
          <span className={`font-medium ${savings > 0 ? 'text-success' : 'text-gray-600 dark:text-gray-400'}`}>
            {savings > 0 ? `€${(savings / 1000).toFixed(0)}K` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Headcount</span>
          <span className={`font-medium ${headcountReduction > 0 ? 'text-warning' : 'text-gray-600 dark:text-gray-400'}`}>
            {headcountReduction > 0 ? `-${headcountReduction}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Department Slider Row
const DepartmentSlider = ({ dept, reduction, avgSalary, onChange }) => {
  const estimatedSavings = (dept.count * (reduction / 100) * avgSalary);
  const affectedCount = Math.round(dept.count * (reduction / 100));

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-p3-midnight dark:text-white truncate">
            {dept.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {dept.count.toLocaleString()} employees
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm font-medium text-p3-midnight dark:text-white">
            {reduction}%
          </p>
          {reduction > 0 && (
            <p className="text-xs text-warning">
              -{affectedCount} ({estimatedSavings > 0 ? `€${(estimatedSavings / 1000).toFixed(0)}K` : ''})
            </p>
          )}
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="50"
        step="5"
        value={reduction}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-p3-electric"
      />
    </div>
  );
};

const ScenarioSimulation = () => {
  const { getDashboardMetrics } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scenarios state
  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Baseline (Current)', reductions: {}, isBaseline: true }
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(1);
  const [showComparison, setShowComparison] = useState(false);

  // Default average salary if not available from data
  const DEFAULT_AVG_SALARY = 55000;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
        toast.error('Failed to load workforce data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getDashboardMetrics]);

  // Get department list with details
  const departments = useMemo(() => {
    if (!metrics?.departmentDetails) return [];

    return Object.entries(metrics.departmentDetails)
      .map(([name, data]) => ({
        name,
        count: data.count || 0,
        totalSalary: data.totalSalary || 0,
        avgSalary: data.count > 0 && data.totalSalary > 0
          ? data.totalSalary / data.count
          : DEFAULT_AVG_SALARY,
      }))
      .sort((a, b) => b.count - a.count);
  }, [metrics]);

  // Calculate overall average salary
  const avgSalary = useMemo(() => {
    if (!metrics || metrics.totalEmployees === 0) return DEFAULT_AVG_SALARY;
    if (metrics.totalSalary > 0) {
      return metrics.totalSalary / metrics.totalEmployees;
    }
    return DEFAULT_AVG_SALARY;
  }, [metrics]);

  // Get active scenario
  const activeScenario = useMemo(() => {
    return scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  // Calculate scenario results
  const scenarioResults = useMemo(() => {
    return scenarios.map(scenario => {
      let totalHeadcountReduction = 0;
      let totalSavings = 0;

      const departmentImpacts = departments.map(dept => {
        const reductionPct = scenario.reductions[dept.name] || 0;
        const headcountReduction = Math.round(dept.count * (reductionPct / 100));
        const savings = headcountReduction * dept.avgSalary;

        totalHeadcountReduction += headcountReduction;
        totalSavings += savings;

        return {
          name: dept.name,
          originalCount: dept.count,
          reductionPct,
          headcountReduction,
          newCount: dept.count - headcountReduction,
          savings,
        };
      });

      return {
        ...scenario,
        totalHeadcountReduction,
        totalSavings,
        departmentImpacts,
        newTotalHeadcount: metrics?.totalEmployees - totalHeadcountReduction || 0,
        savingsPercent: metrics?.totalSalary > 0
          ? (totalSavings / metrics.totalSalary * 100).toFixed(1)
          : 0,
      };
    });
  }, [scenarios, departments, metrics]);

  // Get active scenario results
  const activeResults = useMemo(() => {
    return scenarioResults.find(r => r.id === activeScenarioId) || scenarioResults[0];
  }, [scenarioResults, activeScenarioId]);

  // Update reduction for a department in active scenario
  const updateReduction = useCallback((deptName, value) => {
    setScenarios(prev => prev.map(s => {
      if (s.id === activeScenarioId && !s.isBaseline) {
        return {
          ...s,
          reductions: { ...s.reductions, [deptName]: value }
        };
      }
      return s;
    }));
  }, [activeScenarioId]);

  // Add new scenario
  const addScenario = () => {
    const newId = Math.max(...scenarios.map(s => s.id)) + 1;
    const newScenario = {
      id: newId,
      name: `Scenario ${newId}`,
      reductions: {},
      isBaseline: false,
    };
    setScenarios(prev => [...prev, newScenario]);
    setActiveScenarioId(newId);
    toast.success('New scenario created');
  };

  // Delete scenario
  const deleteScenario = (id) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios[0].id);
    }
    toast.success('Scenario deleted');
  };

  // Apply preset reduction
  const applyPreset = (preset) => {
    if (activeScenario.isBaseline) {
      toast.error('Cannot modify baseline scenario');
      return;
    }

    let newReductions = {};
    switch (preset) {
      case 'uniform-5':
        departments.forEach(d => { newReductions[d.name] = 5; });
        break;
      case 'uniform-10':
        departments.forEach(d => { newReductions[d.name] = 10; });
        break;
      case 'top-heavy':
        departments.forEach((d, i) => {
          newReductions[d.name] = i < 3 ? 15 : 5;
        });
        break;
      case 'clear':
        newReductions = {};
        break;
    }

    setScenarios(prev => prev.map(s => {
      if (s.id === activeScenarioId) {
        return { ...s, reductions: newReductions };
      }
      return s;
    }));
  };

  // Export to Excel
  const exportToExcel = () => {
    const summaryData = scenarioResults.map(s => ({
      'Scenario': s.name,
      'Total Headcount Reduction': s.totalHeadcountReduction,
      'New Headcount': s.newTotalHeadcount,
      'Total Savings (€)': Math.round(s.totalSavings),
      'Savings %': s.savingsPercent + '%',
    }));

    const detailData = activeResults.departmentImpacts.map(d => ({
      'Department': d.name,
      'Original Count': d.originalCount,
      'Reduction %': d.reductionPct + '%',
      'Headcount Reduction': d.headcountReduction,
      'New Count': d.newCount,
      'Savings (€)': Math.round(d.savings),
    }));

    const wb = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const detailSheet = XLSX.utils.json_to_sheet(detailData);

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Scenario Summary');
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Department Details');

    XLSX.writeFile(wb, `scenario-simulation-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export completed');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-p3-electric border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading simulation...</p>
      </div>
    );
  }

  if (!metrics || metrics.totalEmployees === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-p3-midnight dark:text-white mb-2">No Data Available</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Import employee data to run simulations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-p3-midnight dark:text-white">Scenario Simulation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Model workforce reduction scenarios and analyze cost impacts
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Current Headcount</span>
          </div>
          <p className="text-2xl font-semibold text-p3-midnight dark:text-white">
            {metrics.totalEmployees.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 rounded-md">
              <TrendingDown className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Simulated Reduction</span>
          </div>
          <p className="text-2xl font-semibold text-warning">
            -{activeResults.totalHeadcountReduction}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            New: {activeResults.newTotalHeadcount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-md">
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Estimated Savings</span>
          </div>
          <p className="text-2xl font-semibold text-success">
            {activeResults.totalSavings > 0
              ? `€${(activeResults.totalSavings / 1000000).toFixed(2)}M`
              : '—'
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeResults.savingsPercent}% of total cost
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-md">
              <Building2 className="w-4 h-4 text-p3-electric" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Departments</span>
          </div>
          <p className="text-2xl font-semibold text-p3-midnight dark:text-white">
            {departments.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(activeScenario.reductions).filter(k => activeScenario.reductions[k] > 0).length} with reductions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenarios List */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">Scenarios</h3>
            <button
              onClick={addScenario}
              className="p-1.5 text-p3-electric hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {scenarioResults.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={scenario.id === activeScenarioId}
                onSelect={() => setActiveScenarioId(scenario.id)}
                onDelete={() => deleteScenario(scenario.id)}
                canDelete={!scenario.isBaseline && scenarios.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Department Sliders */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                {activeScenario.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeScenario.isBaseline
                  ? 'Baseline scenario cannot be modified'
                  : 'Adjust reduction percentage per department'
                }
              </p>
            </div>
            {!activeScenario.isBaseline && (
              <div className="flex gap-2">
                <select
                  onChange={(e) => applyPreset(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
                  defaultValue=""
                >
                  <option value="" disabled>Apply Preset...</option>
                  <option value="uniform-5">Uniform 5%</option>
                  <option value="uniform-10">Uniform 10%</option>
                  <option value="top-heavy">Top 3 Depts 15%</option>
                  <option value="clear">Clear All</option>
                </select>
              </div>
            )}
          </div>

          {activeScenario.isBaseline ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Select or create a scenario to configure reductions</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              {departments.map(dept => (
                <DepartmentSlider
                  key={dept.name}
                  dept={dept}
                  reduction={activeScenario.reductions[dept.name] || 0}
                  avgSalary={dept.avgSalary}
                  onChange={(value) => updateReduction(dept.name, value)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Impact Chart */}
      {activeResults.totalHeadcountReduction > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
            Impact by Department
          </h3>
          <DepartmentBarChart
            data={activeResults.departmentImpacts
              .filter(d => d.headcountReduction > 0)
              .map(d => ({
                name: d.name,
                count: d.headcountReduction,
                totalSalary: d.savings,
              }))}
            height={250}
          />
        </div>
      )}

      {/* Comparison Table */}
      {scenarios.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
              Scenario Comparison
            </h3>
            {showComparison ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showComparison && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Scenario</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Reduction</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">New Headcount</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Savings</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Savings %</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResults.map(s => (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                        s.id === activeScenarioId ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-medium text-p3-midnight dark:text-white">
                        {s.name}
                      </td>
                      <td className="py-2 px-3 text-right text-warning">
                        {s.totalHeadcountReduction > 0 ? `-${s.totalHeadcountReduction}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-p3-midnight dark:text-white">
                        {s.newTotalHeadcount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-success">
                        {s.totalSavings > 0 ? `€${(s.totalSavings / 1000).toFixed(0)}K` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                        {s.savingsPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioSimulation;
