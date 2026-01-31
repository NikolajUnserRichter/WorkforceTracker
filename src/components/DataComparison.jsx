/**
 * Data Comparison Component
 * Compare workforce metrics between different import snapshots
 * GDPR-compliant: Uses only aggregated snapshot data
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare, Calendar, TrendingUp, TrendingDown, Minus,
  Users, DollarSign, Building2, MapPin, ChevronDown, ChevronUp,
  Download, RefreshCw, AlertCircle, ArrowRight, Info
} from 'lucide-react';
import { importHistoryDB } from '../services/db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

// Change indicator component
const ChangeIndicator = ({ current, previous, format = 'number', inverted = false }) => {
  if (previous === undefined || previous === null) {
    return <span className="text-gray-400">—</span>;
  }

  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;

  // For costs, decrease is good (green), increase is bad (red)
  // inverted reverses this logic
  const isPositive = inverted ? diff < 0 : diff > 0;
  const isNegative = inverted ? diff > 0 : diff < 0;

  const formatValue = (val) => {
    if (format === 'currency') {
      if (Math.abs(val) >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `€${(val / 1000).toFixed(0)}K`;
      return `€${val.toLocaleString('de-DE')}`;
    }
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString('de-DE');
  };

  if (diff === 0) {
    return (
      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <Minus className="w-3 h-3" />
        <span className="text-xs">Keine Änderung</span>
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-medium">
        {diff > 0 ? '+' : ''}{formatValue(diff)}
        <span className="text-gray-400 ml-1">({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)</span>
      </span>
    </span>
  );
};

// Metric comparison card
const ComparisonCard = ({ title, icon: Icon, currentValue, previousValue, format = 'number', inverted = false }) => {
  const formatDisplay = (val) => {
    if (format === 'currency') {
      if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `€${(val / 1000).toFixed(0)}K`;
      return `€${val.toLocaleString('de-DE')}`;
    }
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString('de-DE');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</span>
      </div>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-p3-midnight dark:text-white">
          {formatDisplay(currentValue)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Vorher: {formatDisplay(previousValue)}
          </span>
          <ChangeIndicator
            current={currentValue}
            previous={previousValue}
            format={format}
            inverted={inverted}
          />
        </div>
      </div>
    </div>
  );
};

// Department comparison row
const DepartmentComparisonRow = ({ name, current, previous, isExpanded, onToggle }) => {
  const diff = (current?.count || 0) - (previous?.count || 0);
  const salaryDiff = (current?.totalSalary || 0) - (previous?.totalSalary || 0);

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-p3-midnight dark:text-white">{name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-right text-sm text-gray-500 dark:text-gray-400">
          {previous?.count?.toLocaleString('de-DE') || '—'}
        </td>
        <td className="py-3 px-4 text-right text-sm text-p3-midnight dark:text-white">
          {current?.count?.toLocaleString('de-DE') || '—'}
        </td>
        <td className="py-3 px-4 text-right">
          <span className={`text-sm font-medium ${
            diff > 0 ? 'text-green-600 dark:text-green-400' :
            diff < 0 ? 'text-red-600 dark:text-red-400' :
            'text-gray-400'
          }`}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50 dark:bg-gray-800/30">
          <td colSpan={4} className="py-3 px-6">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">FTE Vorher:</span>
                <span className="ml-2 text-p3-midnight dark:text-white">
                  {previous?.totalFTE?.toFixed(0) || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">FTE Aktuell:</span>
                <span className="ml-2 text-p3-midnight dark:text-white">
                  {current?.totalFTE?.toFixed(0) || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Gehaltsdifferenz:</span>
                <span className={`ml-2 font-medium ${
                  salaryDiff > 0 ? 'text-red-600' : salaryDiff < 0 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {salaryDiff !== 0 ? (
                    `${salaryDiff > 0 ? '+' : ''}€${(salaryDiff / 1000).toFixed(0)}K`
                  ) : '—'}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const DataComparison = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrent, setSelectedCurrent] = useState(null);
  const [selectedPrevious, setSelectedPrevious] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set());

  // Load import history
  useEffect(() => {
    const loadImports = async () => {
      try {
        setLoading(true);
        const history = await importHistoryDB.getRecent(20);
        setImports(history);

        // Auto-select most recent and second most recent with snapshots
        const withSnapshots = history.filter(h => h.snapshot);
        if (withSnapshots.length >= 2) {
          setSelectedCurrent(withSnapshots[0]);
          setSelectedPrevious(withSnapshots[1]);
        } else if (withSnapshots.length === 1) {
          setSelectedCurrent(withSnapshots[0]);
        }
      } catch (error) {
        console.error('Error loading imports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImports();
  }, []);

  // Calculate comparison data
  const comparison = useMemo(() => {
    if (!selectedCurrent?.snapshot) return null;

    const current = selectedCurrent.snapshot;
    const previous = selectedPrevious?.snapshot || {};

    // Merge department keys from both snapshots
    const allDepts = new Set([
      ...Object.keys(current.departmentDetails || current.departmentCounts || {}),
      ...Object.keys(previous.departmentDetails || previous.departmentCounts || {})
    ]);

    const departmentComparison = Array.from(allDepts).map(dept => {
      const currData = (current.departmentDetails || current.departmentCounts || {})[dept];
      const prevData = (previous.departmentDetails || previous.departmentCounts || {})[dept];

      return {
        name: dept,
        current: typeof currData === 'object' ? currData : { count: currData || 0 },
        previous: typeof prevData === 'object' ? prevData : { count: prevData || 0 }
      };
    }).sort((a, b) => (b.current.count || 0) - (a.current.count || 0));

    return {
      current,
      previous,
      departmentComparison,
      hasPrevious: !!selectedPrevious?.snapshot
    };
  }, [selectedCurrent, selectedPrevious]);

  // Chart data for department comparison
  const chartData = useMemo(() => {
    if (!comparison) return [];

    return comparison.departmentComparison.slice(0, 8).map(dept => ({
      name: dept.name.length > 12 ? dept.name.substring(0, 12) + '...' : dept.name,
      Vorher: dept.previous.count || 0,
      Aktuell: dept.current.count || 0
    }));
  }, [comparison]);

  // Export comparison to Excel
  const exportToExcel = () => {
    if (!comparison) return;

    const summaryData = [
      { Metrik: 'Mitarbeiter', Vorher: comparison.previous.totalEmployees || '—', Aktuell: comparison.current.totalEmployees, Differenz: (comparison.current.totalEmployees || 0) - (comparison.previous.totalEmployees || 0) },
      { Metrik: 'Gesamt-FTE', Vorher: comparison.previous.totalFTE || '—', Aktuell: comparison.current.totalFTE, Differenz: ((comparison.current.totalFTE || 0) - (comparison.previous.totalFTE || 0)).toFixed(1) },
      { Metrik: 'Gesamtgehalt', Vorher: comparison.previous.totalSalary ? `€${comparison.previous.totalSalary.toLocaleString()}` : '—', Aktuell: `€${comparison.current.totalSalary?.toLocaleString() || 0}`, Differenz: `€${((comparison.current.totalSalary || 0) - (comparison.previous.totalSalary || 0)).toLocaleString()}` }
    ];

    const deptData = comparison.departmentComparison.map(dept => ({
      Abteilung: dept.name,
      'Vorher (MA)': dept.previous.count || 0,
      'Aktuell (MA)': dept.current.count || 0,
      'Differenz (MA)': (dept.current.count || 0) - (dept.previous.count || 0),
      'Vorher (FTE)': dept.previous.totalFTE?.toFixed(1) || '—',
      'Aktuell (FTE)': dept.current.totalFTE?.toFixed(1) || '—'
    }));

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Zusammenfassung');

    const wsDept = XLSX.utils.json_to_sheet(deptData);
    wsDept['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDept, 'Abteilungen');

    XLSX.writeFile(wb, `Datenvergleich_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleDept = (name) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-p3-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const importsWithSnapshots = imports.filter(i => i.snapshot);

  if (importsWithSnapshots.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
        <GitCompare className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-p3-midnight dark:text-white mb-2">
          Keine Vergleichsdaten verfügbar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Für den Datenvergleich werden mindestens zwei Importe mit Snapshot-Daten benötigt.
          Neue Importe speichern automatisch Snapshot-Statistiken.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-p3-electric hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-p3-midnight dark:text-white">
            Datenvergleich
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vergleichen Sie Kennzahlen zwischen verschiedenen Datenständen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            disabled={!comparison}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
            Vergleichsbasis (Vorher)
          </label>
          <select
            value={selectedPrevious?.id || ''}
            onChange={(e) => {
              const imp = importsWithSnapshots.find(i => i.id === parseInt(e.target.value));
              setSelectedPrevious(imp || null);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
          >
            <option value="">Kein Vergleich</option>
            {importsWithSnapshots.map(imp => (
              <option key={imp.id} value={imp.id} disabled={imp.id === selectedCurrent?.id}>
                {formatDate(imp.timestamp)} - {imp.fileName || 'Import'} ({imp.snapshot?.totalEmployees || 0} MA)
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
            Aktueller Stand
          </label>
          <select
            value={selectedCurrent?.id || ''}
            onChange={(e) => {
              const imp = importsWithSnapshots.find(i => i.id === parseInt(e.target.value));
              setSelectedCurrent(imp || null);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
          >
            <option value="">Auswählen...</option>
            {importsWithSnapshots.map(imp => (
              <option key={imp.id} value={imp.id} disabled={imp.id === selectedPrevious?.id}>
                {formatDate(imp.timestamp)} - {imp.fileName || 'Import'} ({imp.snapshot?.totalEmployees || 0} MA)
              </option>
            ))}
          </select>
        </div>
      </div>

      {comparison && (
        <>
          {/* Info Banner */}
          {!comparison.hasPrevious && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Wählen Sie eine Vergleichsbasis, um Änderungen zwischen den Datenständen zu sehen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* KPI Comparison */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ComparisonCard
              title="Mitarbeiter"
              icon={Users}
              currentValue={comparison.current.totalEmployees || 0}
              previousValue={comparison.previous.totalEmployees}
            />
            <ComparisonCard
              title="Gesamt-FTE"
              icon={Users}
              currentValue={comparison.current.totalFTE || 0}
              previousValue={comparison.previous.totalFTE}
            />
            <ComparisonCard
              title="Personalkosten"
              icon={DollarSign}
              currentValue={comparison.current.totalSalary || 0}
              previousValue={comparison.previous.totalSalary}
              format="currency"
              inverted={true}
            />
            <ComparisonCard
              title="In Reduktion"
              icon={TrendingDown}
              currentValue={comparison.current.employeesWithReduction || 0}
              previousValue={comparison.previous.employeesWithReduction}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && comparison.hasPrevious && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
                Abteilungsvergleich (Top 8)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Vorher" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Aktuell" fill="#0066FF" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                Detailvergleich nach Abteilung
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Abteilung
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Vorher
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Aktuell
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Differenz
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {comparison.departmentComparison.map(dept => (
                    <DepartmentComparisonRow
                      key={dept.name}
                      name={dept.name}
                      current={dept.current}
                      previous={dept.previous}
                      isExpanded={expandedDepts.has(dept.name)}
                      onToggle={() => toggleDept(dept.name)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DataComparison;
