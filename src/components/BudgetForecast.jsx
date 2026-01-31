/**
 * Budget Forecast Component
 * Budget projections based on workforce trends and reduction programs
 * GDPR-compliant: Uses only aggregated cost data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Target,
  Download, Settings2, ChevronDown, ChevronUp, Info, PiggyBank,
  ArrowRight, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-p3-midnight dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
          {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
            €{typeof entry.value === 'number' ? entry.value.toLocaleString('de-DE') : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// Format currency helper
const formatCurrency = (value, compact = false) => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(compact ? 1 : 2)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(compact ? 0 : 1)}K`;
  return `€${value.toLocaleString('de-DE')}`;
};

// Metric Card Component
const MetricCard = ({ title, value, change, changeLabel, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-p3-midnight dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const BudgetForecast = () => {
  const { getDashboardMetrics } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastMonths, setForecastMonths] = useState(12);
  const [assumedGrowthRate, setAssumedGrowthRate] = useState(2); // Annual % growth
  const [assumedReductionRate, setAssumedReductionRate] = useState(0); // Monthly reduction %
  const [showSettings, setShowSettings] = useState(false);

  // Load metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [getDashboardMetrics]);

  // Current monthly cost calculation
  const currentMonthlyCost = useMemo(() => {
    if (!metrics?.totalSalary) return 0;
    // Assuming totalSalary is annual, divide by 12
    return metrics.totalSalary / 12;
  }, [metrics]);

  // Generate forecast data
  const forecastData = useMemo(() => {
    if (!currentMonthlyCost) return [];

    const data = [];
    const today = new Date();
    const monthlyGrowthRate = (1 + assumedGrowthRate / 100) ** (1/12) - 1;
    const monthlyReduction = assumedReductionRate / 100;

    let baseCost = currentMonthlyCost;
    let withReductionCost = currentMonthlyCost;
    let cumulativeSavings = 0;

    for (let i = 0; i <= forecastMonths; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthLabel = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });

      // Base projection (with only natural growth)
      const baseProjection = baseCost * (1 + monthlyGrowthRate) ** i;

      // With reduction program
      const effectiveReduction = i === 0 ? 0 : monthlyReduction;
      withReductionCost = i === 0 ? currentMonthlyCost : withReductionCost * (1 + monthlyGrowthRate - effectiveReduction);

      const monthlySavings = baseProjection - withReductionCost;
      cumulativeSavings += monthlySavings;

      data.push({
        month: monthLabel,
        monthIndex: i,
        'Basis-Projektion': Math.round(baseProjection),
        'Mit Reduktion': Math.round(withReductionCost),
        'Einsparung': Math.round(monthlySavings),
        cumulativeSavings: Math.round(cumulativeSavings)
      });
    }

    return data;
  }, [currentMonthlyCost, forecastMonths, assumedGrowthRate, assumedReductionRate]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!forecastData.length || !currentMonthlyCost) return null;

    const lastMonth = forecastData[forecastData.length - 1];
    const baseTotal = forecastData.reduce((sum, d) => sum + d['Basis-Projektion'], 0);
    const withReductionTotal = forecastData.reduce((sum, d) => sum + d['Mit Reduktion'], 0);
    const totalSavings = baseTotal - withReductionTotal;
    const savingsPercent = (totalSavings / baseTotal) * 100;

    return {
      currentMonthly: currentMonthlyCost,
      projectedMonthly: lastMonth['Basis-Projektion'],
      withReductionMonthly: lastMonth['Mit Reduktion'],
      projectedAnnual: forecastData.slice(0, 12).reduce((sum, d) => sum + d['Basis-Projektion'], 0),
      withReductionAnnual: forecastData.slice(0, 12).reduce((sum, d) => sum + d['Mit Reduktion'], 0),
      totalSavings,
      savingsPercent,
      cumulativeSavings: lastMonth.cumulativeSavings,
      growthPercent: ((lastMonth['Basis-Projektion'] / currentMonthlyCost) - 1) * 100
    };
  }, [forecastData, currentMonthlyCost]);

  // Department cost breakdown
  const departmentCosts = useMemo(() => {
    if (!metrics?.departmentDetails) return [];

    return Object.entries(metrics.departmentDetails)
      .map(([name, details]) => ({
        name,
        monthlyCost: details.totalSalary / 12,
        headcount: details.count,
        avgCost: (details.totalSalary / 12) / (details.count || 1),
        percentOfTotal: (details.totalSalary / (metrics.totalSalary || 1)) * 100
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 10);
  }, [metrics]);

  // Export forecast to Excel
  const exportToExcel = () => {
    const exportData = forecastData.map(d => ({
      'Monat': d.month,
      'Basis-Projektion': `€${d['Basis-Projektion'].toLocaleString('de-DE')}`,
      'Mit Reduktion': `€${d['Mit Reduktion'].toLocaleString('de-DE')}`,
      'Monatl. Einsparung': `€${d['Einsparung'].toLocaleString('de-DE')}`,
      'Kumul. Einsparung': `€${d.cumulativeSavings.toLocaleString('de-DE')}`
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Budget-Prognose');

    // Add department breakdown sheet
    if (departmentCosts.length > 0) {
      const deptData = departmentCosts.map(d => ({
        'Abteilung': d.name,
        'Monatliche Kosten': `€${d.monthlyCost.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`,
        'Mitarbeiter': d.headcount,
        'Ø Kosten/MA': `€${d.avgCost.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`,
        'Anteil Gesamt': `${d.percentOfTotal.toFixed(1)}%`
      }));
      const wsDept = XLSX.utils.json_to_sheet(deptData);
      wsDept['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsDept, 'Abteilungskosten');
    }

    XLSX.writeFile(wb, `Budget_Prognose_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-p3-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics?.totalSalary) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
        <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-p3-midnight dark:text-white mb-2">
          Keine Gehaltsdaten verfügbar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Importieren Sie Mitarbeiterdaten mit Gehaltsinformationen, um Budget-Prognosen zu erstellen.
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
            Budget-Prognose
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kostenentwicklung und Einsparungspotenzial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showSettings
                ? 'bg-p3-electric text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Annahmen
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-p3-midnight dark:text-white rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
            Prognose-Annahmen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Prognosezeitraum
              </label>
              <select
                value={forecastMonths}
                onChange={(e) => setForecastMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
              >
                <option value={6}>6 Monate</option>
                <option value={12}>12 Monate</option>
                <option value={24}>24 Monate</option>
                <option value={36}>36 Monate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Jährl. Kostensteigerung (%)
              </label>
              <input
                type="number"
                value={assumedGrowthRate}
                onChange={(e) => setAssumedGrowthRate(parseFloat(e.target.value) || 0)}
                step="0.5"
                min="0"
                max="20"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Monatl. Reduktionsziel (%)
              </label>
              <input
                type="number"
                value={assumedReductionRate}
                onChange={(e) => setAssumedReductionRate(parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                max="10"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Diese Werte dienen der Szenario-Planung und basieren nicht auf Echtzeit-Daten.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Aktuelle Monatskosten"
          value={formatCurrency(summaryStats?.currentMonthly || 0)}
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          title={`Prognose in ${forecastMonths} Mon.`}
          value={formatCurrency(summaryStats?.projectedMonthly || 0)}
          change={summaryStats?.growthPercent}
          changeLabel="Wachstum"
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          title="Mit Reduktionsprogramm"
          value={formatCurrency(summaryStats?.withReductionMonthly || 0)}
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Kumul. Einsparung"
          value={formatCurrency(summaryStats?.cumulativeSavings || 0)}
          icon={PiggyBank}
          color="purple"
        />
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-p3-midnight dark:text-white">
            Kostenentwicklung ({forecastMonths} Monate)
          </h3>
          {assumedReductionRate > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Reduktionsprogramm aktiv: {assumedReductionRate}%/Monat
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reductionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value, true)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine
              y={currentMonthlyCost}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{ value: 'Aktuell', fontSize: 10, fill: '#6b7280' }}
            />
            <Area
              type="monotone"
              dataKey="Basis-Projektion"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#baseGradient)"
            />
            {assumedReductionRate > 0 && (
              <Area
                type="monotone"
                dataKey="Mit Reduktion"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#reductionGradient)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Savings Over Time */}
        {assumedReductionRate > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
              Monatliche Einsparungen
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="Einsparung" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeSavings"
                  name="Kumuliert"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Gesamteinsparung über {forecastMonths} Monate:</strong>{' '}
                {formatCurrency(summaryStats?.cumulativeSavings || 0)}
                <span className="text-xs ml-2">({summaryStats?.savingsPercent.toFixed(1)}% der Basiskosten)</span>
              </p>
            </div>
          </div>
        )}

        {/* Department Cost Breakdown */}
        <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 ${assumedReductionRate === 0 ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
            Kosten nach Abteilung (Top 10)
          </h3>
          <div className="space-y-3">
            {departmentCosts.map((dept, index) => (
              <div key={dept.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-p3-midnight dark:text-white truncate max-w-[150px]">
                      {dept.name}
                    </span>
                    <span className="text-sm font-medium text-p3-midnight dark:text-white">
                      {formatCurrency(dept.monthlyCost)}/Monat
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-p3-electric rounded-full transition-all"
                      style={{ width: `${dept.percentOfTotal}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                  {dept.percentOfTotal.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-4">
          Schnellvergleich: Reduktionsszenarien
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 0.5, 1, 2].map(rate => {
            const monthlyRate = rate / 100;
            let cost = currentMonthlyCost;
            let total = 0;
            for (let i = 0; i < 12; i++) {
              cost = cost * (1 - monthlyRate);
              total += cost;
            }
            const savings = (currentMonthlyCost * 12) - total;

            return (
              <div
                key={rate}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  assumedReductionRate === rate
                    ? 'border-p3-electric bg-p3-electric/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setAssumedReductionRate(rate)}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rate === 0 ? 'Ohne Reduktion' : `${rate}% monatlich`}
                </p>
                <p className="text-lg font-semibold text-p3-midnight dark:text-white mt-1">
                  {formatCurrency(total)}
                </p>
                <p className={`text-xs mt-1 ${rate > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {rate > 0 ? `Einsparung: ${formatCurrency(savings)}` : 'Jahreskosten'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Hinweis zur Prognose
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Diese Prognosen basieren auf den angegebenen Annahmen und den aktuellen Gehaltsdaten.
              Für genaue Planungen sollten unternehmensSpezifische Faktoren wie Tariferhöhungen,
              Bonuszahlungen und saisonale Schwankungen berücksichtigt werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetForecast;
