/**
 * Capacity Planning Component
 * FTE demand vs. actual analysis, resource utilization, gap analysis
 * GDPR-compliant: Uses only aggregated department/role data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Users, TrendingUp, TrendingDown, AlertTriangle, Check, Target,
  Plus, Trash2, Edit2, Save, X, Download, RefreshCw, ChevronDown,
  ChevronUp, BarChart3, PieChart, Layers, Calendar, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Line, PieChart as RechartsPieChart,
  Pie
} from 'recharts';
import * as XLSX from 'xlsx';

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-p3-midnight dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
          {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    overstaffed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    balanced: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    understaffed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    critical: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'
  };

  const labels = {
    overstaffed: 'Überbesetzt',
    balanced: 'Ausgeglichen',
    understaffed: 'Unterbesetzt',
    critical: 'Kritisch'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.balanced}`}>
      {labels[status] || status}
    </span>
  );
};

const CapacityPlanning = () => {
  const { getDashboardMetrics, projects } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [demandTargets, setDemandTargets] = useState({});
  const [editingDept, setEditingDept] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedDept, setExpandedDept] = useState(null);

  // Load metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await getDashboardMetrics();
        setMetrics(data);

        // Initialize demand targets from localStorage or with current values
        const savedTargets = localStorage.getItem('capacityDemandTargets');
        if (savedTargets) {
          setDemandTargets(JSON.parse(savedTargets));
        } else if (data?.departmentDetails) {
          // Default: target = current headcount
          const defaultTargets = {};
          Object.entries(data.departmentDetails).forEach(([dept, details]) => {
            defaultTargets[dept] = details.count;
          });
          setDemandTargets(defaultTargets);
        }
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [getDashboardMetrics]);

  // Save targets to localStorage
  const saveTargets = useCallback((newTargets) => {
    setDemandTargets(newTargets);
    localStorage.setItem('capacityDemandTargets', JSON.stringify(newTargets));
  }, []);

  // Calculate department capacity data
  const departmentCapacity = useMemo(() => {
    if (!metrics?.departmentDetails) return [];

    return Object.entries(metrics.departmentDetails)
      .map(([name, details]) => {
        const target = demandTargets[name] || details.count;
        const actual = details.count;
        const gap = actual - target;
        const gapPercent = target > 0 ? ((gap / target) * 100) : 0;
        const avgFTE = details.totalFTE / (details.count || 1);
        const effectiveFTE = details.totalFTE * (1 - (details.reductionCount / details.count) * 0.1);

        let status = 'balanced';
        if (gapPercent > 10) status = 'overstaffed';
        else if (gapPercent < -20) status = 'critical';
        else if (gapPercent < -5) status = 'understaffed';

        return {
          name,
          actual,
          target,
          gap,
          gapPercent,
          avgFTE,
          effectiveFTE,
          totalFTE: details.totalFTE,
          totalSalary: details.totalSalary,
          reductionCount: details.reductionCount,
          status,
          avgSalary: details.totalSalary / (details.count || 1)
        };
      })
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  }, [metrics, demandTargets]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!departmentCapacity.length) return null;

    const totalActual = departmentCapacity.reduce((sum, d) => sum + d.actual, 0);
    const totalTarget = departmentCapacity.reduce((sum, d) => sum + d.target, 0);
    const totalGap = totalActual - totalTarget;
    const understaffed = departmentCapacity.filter(d => d.gap < -2).length;
    const overstaffed = departmentCapacity.filter(d => d.gap > 2).length;
    const balanced = departmentCapacity.filter(d => Math.abs(d.gap) <= 2).length;
    const criticalDepts = departmentCapacity.filter(d => d.status === 'critical');

    return {
      totalActual,
      totalTarget,
      totalGap,
      understaffed,
      overstaffed,
      balanced,
      criticalDepts,
      utilizationRate: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 100
    };
  }, [departmentCapacity]);

  // Handle target edit
  const handleStartEdit = (dept, currentTarget) => {
    setEditingDept(dept);
    setEditValue(currentTarget.toString());
  };

  const handleSaveEdit = (dept) => {
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue) && newValue >= 0) {
      const newTargets = { ...demandTargets, [dept]: newValue };
      saveTargets(newTargets);
    }
    setEditingDept(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingDept(null);
    setEditValue('');
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = departmentCapacity.map(dept => ({
      'Abteilung': dept.name,
      'Ist-Besetzung': dept.actual,
      'Soll-Besetzung': dept.target,
      'Differenz': dept.gap,
      'Differenz %': `${dept.gapPercent.toFixed(1)}%`,
      'Status': dept.status === 'overstaffed' ? 'Überbesetzt' :
                dept.status === 'understaffed' ? 'Unterbesetzt' :
                dept.status === 'critical' ? 'Kritisch' : 'Ausgeglichen',
      'Durchschn. FTE': dept.avgFTE.toFixed(1),
      'Gesamtgehalt': `€${dept.totalSalary.toLocaleString('de-DE')}`
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Kapazitätsplanung');
    XLSX.writeFile(wb, `Kapazitaetsplanung_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Chart data for gap visualization
  const gapChartData = useMemo(() => {
    return departmentCapacity.slice(0, 10).map(dept => ({
      name: dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name,
      fullName: dept.name,
      'Ist': dept.actual,
      'Soll': dept.target,
      'Differenz': dept.gap
    }));
  }, [departmentCapacity]);

  // Pie chart data for status distribution
  const statusDistribution = useMemo(() => {
    if (!summaryStats) return [];

    return [
      { name: 'Ausgeglichen', value: summaryStats.balanced, color: '#10b981' },
      { name: 'Unterbesetzt', value: summaryStats.understaffed, color: '#ef4444' },
      { name: 'Überbesetzt', value: summaryStats.overstaffed, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [summaryStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-p3-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics?.departmentDetails || Object.keys(metrics.departmentDetails).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-p3-midnight dark:text-white mb-2">
          Keine Daten verfügbar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Importieren Sie Mitarbeiterdaten, um die Kapazitätsplanung zu nutzen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-p3-midnight dark:text-white">
            Kapazitätsplanung
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            FTE-Bedarf vs. Ist-Besetzung nach Abteilungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ist-Besetzung</p>
              <p className="text-xl font-semibold text-p3-midnight dark:text-white">
                {summaryStats?.totalActual.toLocaleString('de-DE')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-p3-teal/10 rounded-lg">
              <Target className="w-5 h-5 text-p3-teal" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Soll-Besetzung</p>
              <p className="text-xl font-semibold text-p3-midnight dark:text-white">
                {summaryStats?.totalTarget.toLocaleString('de-DE')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summaryStats?.totalGap >= 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {summaryStats?.totalGap >= 0 ? (
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gesamtdifferenz</p>
              <p className={`text-xl font-semibold ${summaryStats?.totalGap >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {summaryStats?.totalGap >= 0 ? '+' : ''}{summaryStats?.totalGap.toLocaleString('de-DE')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Auslastungsgrad</p>
              <p className="text-xl font-semibold text-p3-midnight dark:text-white">
                {summaryStats?.utilizationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {summaryStats?.criticalDepts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Kritische Unterbesetzung
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {summaryStats.criticalDepts.map(d => d.name).join(', ')} - Diese Abteilungen sind mehr als 20% unterbesetzt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Übersicht', icon: BarChart3 },
            { id: 'details', label: 'Details', icon: Layers },
            { id: 'planning', label: 'Planung', icon: Calendar }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-p3-electric text-p3-electric'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-p3-midnight dark:hover:text-white'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Gap Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
              Ist vs. Soll nach Abteilung (Top 10)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={gapChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Ist" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Soll" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="Differenz" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
              Status-Verteilung
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                  </div>
                  <span className="font-medium text-p3-midnight dark:text-white">
                    {item.value} Abt.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Abteilung
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ist
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Soll
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Differenz
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ø FTE
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    In Reduktion
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {departmentCapacity.map(dept => (
                  <React.Fragment key={dept.name}>
                    <tr
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedDept(expandedDept === dept.name ? null : dept.name)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-p3-midnight dark:text-white">
                            {dept.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-p3-midnight dark:text-white">
                        {dept.actual.toLocaleString('de-DE')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-p3-midnight dark:text-white">
                        {dept.target.toLocaleString('de-DE')}
                      </td>
                      <td className={`py-3 px-4 text-right text-sm font-medium ${
                        dept.gap > 0 ? 'text-amber-600 dark:text-amber-400' :
                        dept.gap < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {dept.gap > 0 ? '+' : ''}{dept.gap.toLocaleString('de-DE')}
                        <span className="text-xs ml-1">({dept.gapPercent.toFixed(1)}%)</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={dept.status} />
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {dept.avgFTE.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {dept.reductionCount}
                      </td>
                      <td className="py-3 px-4">
                        {expandedDept === dept.name ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    </tr>
                    {expandedDept === dept.name && (
                      <tr className="bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={8} className="py-4 px-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Gesamtgehalt</p>
                              <p className="text-sm font-medium text-p3-midnight dark:text-white">
                                €{dept.totalSalary.toLocaleString('de-DE')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Ø Gehalt</p>
                              <p className="text-sm font-medium text-p3-midnight dark:text-white">
                                €{dept.avgSalary.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Gesamt-FTE</p>
                              <p className="text-sm font-medium text-p3-midnight dark:text-white">
                                {dept.totalFTE.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Effektive FTE</p>
                              <p className="text-sm font-medium text-p3-midnight dark:text-white">
                                {dept.effectiveFTE.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tipp:</strong> Klicken Sie auf das Bearbeiten-Symbol, um die Soll-Besetzung für eine Abteilung anzupassen.
              Die Änderungen werden automatisch gespeichert.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Abteilung
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ist-Besetzung
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Soll-Besetzung
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Anpassung
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Erwarteter Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {departmentCapacity.map(dept => (
                    <tr key={dept.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-p3-midnight dark:text-white">
                          {dept.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-p3-midnight dark:text-white">
                        {dept.actual.toLocaleString('de-DE')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingDept === dept.name ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(dept.name);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit(dept.name)}
                              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-p3-midnight dark:text-white">
                              {dept.target.toLocaleString('de-DE')}
                            </span>
                            <button
                              onClick={() => handleStartEdit(dept.name, dept.target)}
                              className="p-1 text-gray-400 hover:text-p3-electric hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                dept.gap > 0 ? 'bg-amber-500' :
                                dept.gap < 0 ? 'bg-red-500' :
                                'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(Math.abs(dept.gapPercent), 100)}%`,
                                marginLeft: dept.gap < 0 ? 'auto' : 0
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-12 text-right ${
                            dept.gap > 0 ? 'text-amber-600 dark:text-amber-400' :
                            dept.gap < 0 ? 'text-red-600 dark:text-red-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {dept.gap > 0 ? '+' : ''}{dept.gap}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={dept.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const newTargets = {};
                departmentCapacity.forEach(d => {
                  newTargets[d.name] = d.actual;
                });
                saveTargets(newTargets);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Soll = Ist setzen
            </button>
            <button
              onClick={() => {
                const newTargets = {};
                departmentCapacity.forEach(d => {
                  newTargets[d.name] = Math.round(d.actual * 0.95);
                });
                saveTargets(newTargets);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              5% Reduktionsziel
            </button>
            <button
              onClick={() => {
                const newTargets = {};
                departmentCapacity.forEach(d => {
                  newTargets[d.name] = Math.round(d.actual * 0.9);
                });
                saveTargets(newTargets);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              10% Reduktionsziel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityPlanning;
