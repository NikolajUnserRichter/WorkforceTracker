/**
 * Department Distribution Charts
 * Reusable chart components for workforce analytics
 * Uses Recharts library
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// P3 Design System Colors
const COLORS = [
  '#3b82f6', // p3-electric / primary blue
  '#10b981', // success green
  '#f59e0b', // warning amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#14b8a6', // teal
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-p3-midnight dark:text-white mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
          {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
};

/**
 * Bar Chart for Department Headcount
 */
export const DepartmentBarChart = ({ data, height = 300, showCost = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        No data available
      </div>
    );
  }

  // Sort and limit to top 10
  const chartData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(d => ({
      name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
      fullName: d.name,
      Headcount: d.count,
      Cost: d.totalSalary || 0,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="Headcount"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
        {showCost && (
          <Bar
            dataKey="Cost"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart for Department Distribution
 */
export const DepartmentPieChart = ({ data, height = 300, showLegend = true }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        No data available
      </div>
    );
  }

  // Group smaller departments into "Others"
  const threshold = data.reduce((sum, d) => sum + d.count, 0) * 0.03; // 3% threshold
  const mainDepts = data.filter(d => d.count >= threshold);
  const otherDepts = data.filter(d => d.count < threshold);

  let chartData = mainDepts.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    value: d.count,
  }));

  if (otherDepts.length > 0) {
    chartData.push({
      name: `Others (${otherDepts.length})`,
      value: otherDepts.reduce((sum, d) => sum + d.count, 0),
    });
  }

  // Limit to 10 slices max
  chartData = chartData.slice(0, 10);

  const renderLabel = ({ name, percent }) => {
    if (percent < 0.05) return null; // Hide labels for small slices
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={height / 3}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const data = payload[0];
            return (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium text-p3-midnight dark:text-white">{data.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {data.value.toLocaleString()} employees
                </p>
              </div>
            );
          }}
        />
        {showLegend && (
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Horizontal Bar Chart for Status Distribution
 */
export const StatusBarChart = ({ data, height = 200 }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
        No data available
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })).sort((a, b) => b.value - a.value);

  const statusColors = {
    Active: '#10b981',
    Inactive: '#6b7280',
    'On-leave': '#f59e0b',
    Terminated: '#ef4444',
    Unknown: '#9ca3af',
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={25}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={statusColors[entry.name] || COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Mini Sparkline-style Bar Chart
 */
export const MiniBarChart = ({ data, color = '#3b82f6', height = 60 }) => {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default {
  DepartmentBarChart,
  DepartmentPieChart,
  StatusBarChart,
  MiniBarChart,
};
