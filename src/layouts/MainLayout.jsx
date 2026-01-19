import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Moon, Sun, LayoutDashboard, Users, Briefcase,
    Upload, FileText, LogOut, UserCog, TrendingDown,
    Menu, X, Settings, Database, ChevronLeft, Bell
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Toaster } from 'react-hot-toast';
import { ImportProvider } from '../contexts/ImportContext';
import ImportWizard from '../components/import/ImportWizard';
import toast from 'react-hot-toast';

const MainLayout = ({ currentUser, onLogout }) => {
    const { darkMode, toggleDarkMode } = useApp();
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await onLogout();
        navigate('/');
        toast.success('Logged out successfully');
    };

    // Main navigation items
    const mainNavigation = [
        { id: '/', label: 'Dashboard', icon: LayoutDashboard },
        { id: '/employees', label: 'Employees', icon: Users },
        { id: '/projects', label: 'Projects', icon: Briefcase },
        { id: '/comparison', label: 'Cost Tracking', icon: TrendingDown },
        { id: '/reports', label: 'Reports', icon: FileText },
    ];

    // Admin navigation items
    const adminNavigation = currentUser?.role === 'admin' ? [
        { id: '/users', label: 'User Management', icon: UserCog },
        { id: '/uploads', label: 'Uploads', icon: Database },
        { id: '/settings', label: 'Settings', icon: Settings },
    ] : [];

    const NavItem = ({ item, collapsed }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.id ||
            (item.id !== '/' && location.pathname.startsWith(item.id));

        return (
            <button
                onClick={() => {
                    navigate(item.id);
                    setIsMobileMenuOpen(false);
                }}
                className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                    transition-all duration-150 group relative
                    ${isActive
                        ? 'bg-p3-electric/10 text-p3-electric'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-p3-midnight dark:hover:text-white'
                    }
                `}
                title={collapsed ? item.label : undefined}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-p3-electric' : ''}`} />
                {!collapsed && (
                    <span className="truncate">{item.label}</span>
                )}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-p3-electric rounded-r" />
                )}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            <Toaster
                position="top-right"
                toastOptions={{
                    className: '',
                    style: {
                        background: darkMode ? '#171717' : '#fff',
                        color: darkMode ? '#fff' : '#00002d',
                        border: `1px solid ${darkMode ? '#262626' : '#e5e5e5'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#005b4c',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ff7f6a',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            {/* Sidebar - Desktop */}
            <aside className={`
                hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-gray-950
                border-r border-gray-200 dark:border-gray-800 z-40 transition-all duration-200
                ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
            `}>
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-p3-midnight rounded-md flex items-center justify-center">
                                <span className="text-white font-bold text-sm">P3</span>
                            </div>
                            <div>
                                <h1 className="text-sm font-semibold text-p3-midnight dark:text-white leading-tight">
                                    Workforce Tracker
                                </h1>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Cost Management
                                </p>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div className="w-8 h-8 bg-p3-midnight rounded-md flex items-center justify-center mx-auto">
                            <span className="text-white font-bold text-sm">P3</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {/* Main Navigation */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Main
                            </p>
                        )}
                        {mainNavigation.map(item => (
                            <NavItem key={item.id} item={item} collapsed={sidebarCollapsed} />
                        ))}
                    </div>

                    {/* Admin Navigation */}
                    {adminNavigation.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-1">
                            {!sidebarCollapsed && (
                                <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Administration
                                </p>
                            )}
                            {adminNavigation.map(item => (
                                <NavItem key={item.id} item={item} collapsed={sidebarCollapsed} />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Import Button */}
                <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => setShowImportWizard(true)}
                        className={`
                            w-full flex items-center justify-center gap-2 px-4 py-2.5
                            bg-p3-electric hover:bg-primary-600 text-white rounded-md
                            font-medium text-sm transition-colors duration-150
                            ${sidebarCollapsed ? 'px-2' : ''}
                        `}
                    >
                        <Upload className="w-4 h-4" />
                        {!sidebarCollapsed && <span>Import Data</span>}
                    </button>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </aside>

            {/* Header - Fixed */}
            <header className={`
                fixed top-0 right-0 h-16 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm
                border-b border-gray-200 dark:border-gray-800 z-30 transition-all duration-200
                ${sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-64'} left-0
            `}>
                <div className="h-full px-4 lg:px-6 flex items-center justify-between">
                    {/* Mobile Menu Button */}
                    <button
                        className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2">
                        <div className="w-7 h-7 bg-p3-midnight rounded-md flex items-center justify-center">
                            <span className="text-white font-bold text-xs">P3</span>
                        </div>
                        <span className="font-semibold text-p3-midnight dark:text-white text-sm">
                            Workforce Tracker
                        </span>
                    </div>

                    {/* Page Title - Desktop */}
                    <div className="hidden lg:block">
                        <h2 className="text-lg font-semibold text-p3-midnight dark:text-white">
                            {[...mainNavigation, ...adminNavigation].find(n =>
                                n.id === location.pathname ||
                                (n.id !== '/' && location.pathname.startsWith(n.id))
                            )?.label || 'Dashboard'}
                        </h2>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                            title={darkMode ? 'Light Mode' : 'Dark Mode'}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Divider */}
                        <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* User Info */}
                        <div className="hidden sm:flex items-center gap-3 pl-2">
                            <div className="text-right">
                                <p className="text-sm font-medium text-p3-midnight dark:text-white leading-tight">
                                    {currentUser.username}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">
                                    {currentUser.role}
                                </p>
                            </div>
                            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-p3-midnight dark:text-white">
                                    {currentUser.username?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-md hover:bg-warning/10 text-gray-500 dark:text-gray-400 hover:text-warning transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Overlay */}
            {isMobileMenuOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 bg-p3-midnight/50 backdrop-blur-sm z-40"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-950 z-50 shadow-xl animate-slide-in-right">
                        {/* Mobile Sidebar Header */}
                        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-p3-midnight rounded-md flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">P3</span>
                                </div>
                                <span className="font-semibold text-p3-midnight dark:text-white">
                                    Workforce Tracker
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Mobile Navigation */}
                        <nav className="flex-1 overflow-y-auto py-4 px-3">
                            <div className="space-y-1">
                                <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Main
                                </p>
                                {mainNavigation.map(item => (
                                    <NavItem key={item.id} item={item} collapsed={false} />
                                ))}
                            </div>

                            {adminNavigation.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-1">
                                    <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Administration
                                    </p>
                                    {adminNavigation.map(item => (
                                        <NavItem key={item.id} item={item} collapsed={false} />
                                    ))}
                                </div>
                            )}
                        </nav>

                        {/* Mobile Import Button */}
                        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    setShowImportWizard(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-p3-electric hover:bg-primary-600 text-white rounded-md font-medium text-sm transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Import Data</span>
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content */}
            <main className={`
                pt-16 min-h-screen transition-all duration-200
                ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}
            `}>
                <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
                    <Outlet context={{ setShowImportWizard }} />
                </div>
            </main>

            {/* Import Wizard Modal */}
            {showImportWizard && (
                <ImportProvider>
                    <ImportWizard onClose={() => setShowImportWizard(false)} />
                </ImportProvider>
            )}
        </div>
    );
};

export default MainLayout;
