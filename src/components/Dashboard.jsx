
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  TrendingUp,
  UserCheck,
  Clock,
  Upload,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const StatCard = ({ title, value, label, icon: Icon, colorClass, gradientClass, trend }) => (
  <div className="card p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none ring-1 ring-gray-200 dark:ring-gray-800">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientClass} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500`}></div>

    <div className="flex items-start justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 backdrop-blur-sm`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>

    <div className="relative z-10">
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
        {value}
      </h3>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  </div>
);

const Dashboard = () => {
  const { getDashboardMetrics } = useApp();
  const { setShowImportWizard } = useOutletContext();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [getDashboardMetrics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Analyzing workforce data...</p>
      </div>
    );
  }

  if (!metrics || metrics.totalEmployees === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center max-w-lg mx-auto p-8 animate-fade-in">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-8 shadow-inner transform rotate-12">
          <Upload className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          No Data Available
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
          Get started by importing your HR data. Our system can handle <span className="font-semibold text-primary-600 dark:text-primary-400">110,000+ records</span> with zero lag.
        </p>
        <button
          onClick={() => setShowImportWizard(true)}
          className="btn-primary flex items-center gap-2 text-lg px-8 py-3 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40"
        >
          <Upload className="w-5 h-5" />
          Import HR Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
            Real-time workforce insights and performance
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/50"
          >
            View All Employees
          </button>
          <button
            onClick={() => setShowImportWizard(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          value={metrics.totalEmployees.toLocaleString()}
          label="Total Employees"
          icon={Users}
          colorClass="bg-blue-500 text-blue-500"
          gradientClass="from-blue-500 to-blue-600"
        />
        <StatCard
          value={metrics.activeProjects}
          label="Active Projects"
          icon={Briefcase}
          colorClass="bg-violet-500 text-violet-500"
          gradientClass="from-violet-500 to-violet-600"
        />
        <StatCard
          value={`${metrics.utilizationRate}%`}
          label="Utilization Rate"
          icon={TrendingUp}
          colorClass="bg-emerald-500 text-emerald-500"
          gradientClass="from-emerald-500 to-emerald-600"
          trend={2.5}
        />
        <StatCard
          value={metrics.availableEmployees}
          label="Available Staff"
          icon={UserCheck}
          colorClass="bg-amber-500 text-amber-500"
          gradientClass="from-amber-500 to-amber-600"
        />
        <StatCard
          value={metrics.activeReductions}
          label="Reductions"
          icon={Clock}
          colorClass="bg-rose-500 text-rose-500"
          gradientClass="from-rose-500 to-rose-600"
        />
      </div>

      {/* Decorative Chart Placeholder */}
      <div className="card p-8 min-h-[300px] flex items-center justify-center border-dashed border-2 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Detailed analytics charts coming in Phase 2</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
