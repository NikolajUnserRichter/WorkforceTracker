import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Clock,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Building2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

// Enterprise KPI Card Component
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  highlight = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-l-4 border-l-p3-electric';
      case 'success':
        return 'border-l-4 border-l-success';
      case 'warning':
        return 'border-l-4 border-l-warning';
      case 'analysis':
        return 'border-l-4 border-l-analysis';
      default:
        return '';
    }
  };

  return (
    <div className={`
      bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800
      p-5 transition-all duration-200 hover:shadow-enterprise-md
      ${getVariantStyles()}
      ${highlight ? 'ring-2 ring-accent/30 bg-accent/5' : ''}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        {trend !== undefined && (
          <div className={`
            flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${trend >= 0
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning'
            }
          `}>
            {trend >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-semibold text-p3-midnight dark:text-white">
          {value}
        </p>
        {(subtitle || trendLabel) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {trendLabel || subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickAction = ({ icon: Icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-p3-electric dark:hover:border-p3-electric hover:shadow-enterprise-md transition-all duration-200 text-left w-full group"
  >
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-p3-electric transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-p3-midnight dark:text-white">
        {title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {description}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-p3-electric transition-colors" />
  </button>
);

// Department Breakdown Row
const DepartmentRow = ({ department, headcount, percentage, costReduction }) => (
  <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-p3-midnight dark:text-white truncate">
        {department}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {headcount.toLocaleString()} employees
      </p>
    </div>
    <div className="w-24 mx-4">
      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-p3-electric rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
    <div className="text-right">
      <p className={`text-sm font-medium ${costReduction > 0 ? 'text-success' : 'text-gray-600 dark:text-gray-400'}`}>
        {costReduction > 0 ? `-${costReduction}%` : '—'}
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
        <div className="w-10 h-10 border-2 border-p3-electric border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!metrics || metrics.totalEmployees === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center max-w-md mx-auto animate-fade-in">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-6">
          <Upload className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-p3-midnight dark:text-white mb-2">
          No Data Available
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Import your HR data to get started with workforce cost analysis.
          The system handles 110,000+ records efficiently.
        </p>
        <button
          onClick={() => setShowImportWizard(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-p3-electric hover:bg-primary-600 text-white rounded-md font-medium text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import HR Data
        </button>
      </div>
    );
  }

  // Sample department data (would come from API in production)
  const departmentData = [
    { department: 'Engineering', headcount: 450, percentage: 35, costReduction: 12 },
    { department: 'Operations', headcount: 280, percentage: 22, costReduction: 8 },
    { department: 'Sales', headcount: 200, percentage: 15, costReduction: 5 },
    { department: 'Finance', headcount: 150, percentage: 12, costReduction: 0 },
    { department: 'HR', headcount: 100, percentage: 8, costReduction: 3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Headcount"
          value={metrics.totalEmployees.toLocaleString()}
          subtitle="Active employees"
          icon={Users}
          variant="primary"
        />
        <KPICard
          title="Total Workforce Cost"
          value="€12.4M"
          subtitle="Annual cost basis"
          icon={DollarSign}
        />
        <KPICard
          title="Cost Reduction"
          value="€1.2M"
          subtitle="Potential annual savings"
          icon={TrendingDown}
          trend={-8.5}
          trendLabel="vs. last period"
          variant="success"
          highlight
        />
        <KPICard
          title="Active Scenarios"
          value={metrics.activeProjects}
          subtitle="In analysis"
          icon={Briefcase}
          variant="analysis"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Utilization Rate</p>
          <p className="text-lg font-semibold text-p3-midnight dark:text-white">{metrics.utilizationRate}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available Staff</p>
          <p className="text-lg font-semibold text-p3-midnight dark:text-white">{metrics.availableEmployees}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Reductions</p>
          <p className="text-lg font-semibold text-warning">{metrics.activeReductions}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Departments</p>
          <p className="text-lg font-semibold text-p3-midnight dark:text-white">24</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                  Department Breakdown
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Headcount distribution and cost reduction potential
                </p>
              </div>
              <button
                onClick={() => navigate('/employees')}
                className="text-xs font-medium text-p3-electric hover:text-primary-600 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
          <div className="px-5 py-2">
            {departmentData.map((dept, idx) => (
              <DepartmentRow key={idx} {...dept} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <QuickAction
                icon={Upload}
                title="Import Data"
                description="Upload HR data file"
                onClick={() => setShowImportWizard(true)}
              />
              <QuickAction
                icon={Users}
                title="View Employees"
                description="Browse workforce directory"
                onClick={() => navigate('/employees')}
              />
              <QuickAction
                icon={TrendingDown}
                title="Cost Analysis"
                description="Compare scenarios"
                onClick={() => navigate('/comparison')}
              />
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-3">
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Database</span>
                <span className="flex items-center gap-1.5 text-success">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Last Import</span>
                <span className="text-p3-midnight dark:text-white">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Record Capacity</span>
                <span className="text-p3-midnight dark:text-white">110,000+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
