import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Calculator,
  Gauge,
  Wallet,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Zap,
  Target
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DepartmentPieChart, StatusBarChart } from './charts/DepartmentChart';

// Enterprise KPI Card Component
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  highlight = false,
  onClick
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

  const content = (
    <>
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
    </>
  );

  const baseClasses = `
    bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800
    p-5 transition-all duration-200
    ${getVariantStyles()}
    ${highlight ? 'ring-2 ring-accent/30 bg-accent/5' : ''}
  `;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} hover:shadow-enterprise-md hover:border-p3-electric text-left w-full`}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

// Quick Action Card Component
const QuickAction = ({ icon: Icon, title, description, onClick, badge }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-p3-electric dark:hover:border-p3-electric hover:shadow-enterprise-md transition-all duration-200 text-left w-full group"
  >
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-p3-electric transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-p3-midnight dark:text-white">
          {title}
        </p>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-p3-electric/10 text-p3-electric rounded">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {description}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-p3-electric transition-colors" />
  </button>
);

// Alert Component
const Alert = ({ type = 'info', title, message, onDismiss, action, actionLabel }) => {
  const styles = {
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-500'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-500'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Info,
      iconColor: 'text-blue-500'
    }
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-p3-midnight dark:text-white">{title}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{message}</p>
          {action && (
            <button
              onClick={action}
              className="text-xs font-medium text-p3-electric hover:text-primary-600 mt-2"
            >
              {actionLabel || 'View Details'} →
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

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

// Goal Progress Card
const GoalProgress = ({ title, current, target, unit = '', variant = 'default' }) => {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const colors = {
    default: 'bg-p3-electric',
    success: 'bg-green-500',
    warning: 'bg-amber-500'
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</span>
        <span className="text-xs text-p3-midnight dark:text-white">
          {current.toLocaleString()}{unit} / {target.toLocaleString()}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[variant]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { getDashboardMetrics } = useApp();
  const { setShowImportWizard } = useOutletContext();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

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

  // Generate alerts based on metrics
  const alerts = useMemo(() => {
    if (!metrics || metrics.totalEmployees === 0) return [];

    const alertList = [];

    // Check for high reduction rate
    if (metrics.employeesWithReduction > 0) {
      const reductionRate = (metrics.employeesWithReduction / metrics.totalEmployees) * 100;
      if (reductionRate > 10) {
        alertList.push({
          id: 'high-reduction',
          type: 'warning',
          title: 'Hohe Reduktionsquote',
          message: `${reductionRate.toFixed(1)}% der Belegschaft sind in Reduktionsprogrammen. Prüfen Sie die Kapazitätsplanung.`,
          action: () => navigate('/capacity'),
          actionLabel: 'Kapazität prüfen'
        });
      }
    }

    // Check for data freshness
    if (metrics.lastImportTime) {
      const daysSinceImport = Math.floor((Date.now() - new Date(metrics.lastImportTime)) / 86400000);
      if (daysSinceImport > 30) {
        alertList.push({
          id: 'stale-data',
          type: 'info',
          title: 'Daten aktualisieren',
          message: `Der letzte Import ist ${daysSinceImport} Tage her. Aktualisierte Daten verbessern die Prognosequalität.`,
          action: () => setShowImportWizard(true),
          actionLabel: 'Daten importieren'
        });
      }
    }

    // Check for uneven department distribution
    if (metrics.departmentDetails) {
      const depts = Object.values(metrics.departmentDetails);
      if (depts.length > 1) {
        const avgSize = metrics.totalEmployees / depts.length;
        const largestDept = Math.max(...depts.map(d => d.count));
        if (largestDept > avgSize * 3) {
          alertList.push({
            id: 'uneven-distribution',
            type: 'info',
            title: 'Ungleiche Verteilung',
            message: 'Eine Abteilung ist deutlich größer als der Durchschnitt. Dies kann auf Strukturoptimierungspotenzial hinweisen.',
            action: () => navigate('/analytics'),
            actionLabel: 'Analyse anzeigen'
          });
        }
      }
    }

    return alertList.filter(a => !dismissedAlerts.has(a.id));
  }, [metrics, dismissedAlerts, navigate, setShowImportWizard]);

  const dismissAlert = (id) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  };

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

  // Generate department data from real metrics
  const departmentData = Object.entries(metrics.departmentDetails || metrics.departmentCounts || {})
    .map(([department, data]) => {
      const headcount = typeof data === 'object' ? data.count : data;
      const percentage = metrics.totalEmployees > 0
        ? Math.round((headcount / metrics.totalEmployees) * 100)
        : 0;
      const reductionCount = typeof data === 'object' ? (data.reductionCount || 0) : 0;
      const costReduction = headcount > 0 ? Math.round((reductionCount / headcount) * 100) : 0;
      return { department, headcount, percentage, costReduction };
    })
    .sort((a, b) => b.headcount - a.headcount)
    .slice(0, 8); // Show top 8 departments

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value.toFixed(0)}`;
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              action={alert.action}
              actionLabel={alert.actionLabel}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Headcount"
          value={metrics.totalEmployees.toLocaleString()}
          subtitle={`${metrics.totalFTE} FTE`}
          icon={Users}
          variant="primary"
          onClick={() => navigate('/employees')}
        />
        <KPICard
          title="Total Workforce Cost"
          value={metrics.totalSalary > 0 ? formatCurrency(metrics.totalSalary) : '—'}
          subtitle="Annual cost basis"
          icon={DollarSign}
          onClick={() => navigate('/budget')}
        />
        <KPICard
          title="Cost Reduction"
          value={metrics.potentialReduction > 0 ? formatCurrency(metrics.potentialReduction) : '—'}
          subtitle={metrics.employeesWithReduction > 0 ? `${metrics.employeesWithReduction} employees affected` : 'No active reductions'}
          icon={TrendingDown}
          trend={metrics.reductionImpact > 0 ? -metrics.reductionImpact : undefined}
          trendLabel={metrics.reductionImpact > 0 ? 'avg. reduction' : undefined}
          variant="success"
          highlight={metrics.potentialReduction > 0}
          onClick={() => navigate('/comparison')}
        />
        <KPICard
          title="Active Scenarios"
          value={metrics.activeProjects}
          subtitle="In analysis"
          icon={Briefcase}
          variant="analysis"
          onClick={() => navigate('/simulation')}
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
          <p className="text-lg font-semibold text-p3-midnight dark:text-white">{metrics.departmentCount}</p>
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
                onClick={() => navigate('/analytics')}
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

        {/* Quick Actions & Tools */}
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
                icon={Calculator}
                title="Simulation"
                description="What-if Szenarien erstellen"
                onClick={() => navigate('/simulation')}
                badge="NEU"
              />
              <QuickAction
                icon={Gauge}
                title="Kapazität"
                description="FTE-Bedarf vs. Ist"
                onClick={() => navigate('/capacity')}
                badge="NEU"
              />
              <QuickAction
                icon={Wallet}
                title="Budget-Prognose"
                description="Kostenentwicklung planen"
                onClick={() => navigate('/budget')}
                badge="NEU"
              />
            </div>
          </div>

          {/* Planning Goals */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                Planungsziele
              </h3>
              <button
                onClick={() => navigate('/capacity')}
                className="text-xs text-p3-electric hover:text-primary-600"
              >
                Bearbeiten
              </button>
            </div>
            <div className="space-y-3">
              <GoalProgress
                title="Kapazitätsauslastung"
                current={metrics.utilizationRate}
                target={100}
                unit="%"
                variant={metrics.utilizationRate > 95 ? 'success' : 'default'}
              />
              {metrics.employeesWithReduction > 0 && (
                <GoalProgress
                  title="Reduktionsprogramm"
                  current={metrics.employeesWithReduction}
                  target={Math.ceil(metrics.totalEmployees * 0.1)}
                  unit=" MA"
                  variant="warning"
                />
              )}
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
                <span className="text-p3-midnight dark:text-white">{formatRelativeTime(metrics.lastImportTime)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Record Capacity</span>
                <span className="text-p3-midnight dark:text-white">110,000+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {metrics.departmentCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                Department Distribution
              </h3>
              <button
                onClick={() => navigate('/analytics')}
                className="text-xs font-medium text-p3-electric hover:text-primary-600 transition-colors"
              >
                View Analytics
              </button>
            </div>
            <DepartmentPieChart
              data={departmentData.map(d => ({ name: d.department, count: d.headcount }))}
              height={220}
              showLegend={false}
            />
          </div>

          {/* Status Distribution */}
          {metrics.statusCounts && Object.keys(metrics.statusCounts).length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
                Employee Status
              </h3>
              <StatusBarChart data={metrics.statusCounts} height={220} />
            </div>
          )}
        </div>
      )}

      {/* More Tools Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-4">
          Weitere Analyse-Tools
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-p3-electric hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
          >
            <BarChart3 className="w-6 h-6 text-p3-electric" />
            <span className="text-xs font-medium text-p3-midnight dark:text-white">Analytics</span>
          </button>
          <button
            onClick={() => navigate('/comparison')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-p3-electric hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
          >
            <TrendingDown className="w-6 h-6 text-p3-electric" />
            <span className="text-xs font-medium text-p3-midnight dark:text-white">Cost Tracking</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-p3-electric hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
          >
            <Briefcase className="w-6 h-6 text-p3-electric" />
            <span className="text-xs font-medium text-p3-midnight dark:text-white">Reports</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-p3-electric hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
          >
            <Zap className="w-6 h-6 text-p3-electric" />
            <span className="text-xs font-medium text-p3-midnight dark:text-white">AI Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
