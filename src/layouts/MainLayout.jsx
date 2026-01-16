
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Moon, Sun, LayoutDashboard, Users, Briefcase,
    Upload, FileText, LogOut, UserCog, TrendingDown,
    Menu, X
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Toaster } from 'react-hot-toast';
import { ImportProvider } from '../contexts/ImportContext';
import ImportWizard from '../components/import/ImportWizard';
import toast from 'react-hot-toast';

const MainLayout = ({ currentUser, onLogout }) => {
    const { darkMode, toggleDarkMode } = useApp();
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await onLogout();
        navigate('/');
        toast.success('Logged out successfully');
    };

    const navigation = [
        { id: '/', label: 'Dashboard', icon: LayoutDashboard },
        { id: '/employees', label: 'Employees', icon: Users },
        { id: '/projects', label: 'Projects', icon: Briefcase },
        { id: '/comparison', label: 'Cost Tracking', icon: TrendingDown },
        { id: '/reports', label: 'Reports', icon: FileText },
    ];

    if (currentUser && currentUser.role === 'admin') {
        navigation.push({ id: '/users', label: 'Users', icon: UserCog });
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans">
            <Toaster position="top-right" toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
                style: {
                    background: darkMode ? '#1f2937' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                },
            }} />

            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Workforce Tracker
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    High-Performance HR
                                </p>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1 mx-4">
                            {navigation.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.id || (item.id !== '/' && location.pathname.startsWith(item.id));
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(item.id)}
                                        className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                      ${isActive
                                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                            }
                    `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* User Info */}
                            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-full border border-gray-200/50 dark:border-gray-700/50">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {currentUser.username}
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

                            <button
                                onClick={() => setShowImportWizard(true)}
                                className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-primary-500/20 active:scale-95"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Import</span>
                            </button>

                            <button
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                                title={darkMode ? 'Light Mode' : 'Dark Mode'}
                            >
                                {darkMode ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </button>

                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>

                            <button
                                className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X /> : <Menu />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 absolute w-full pb-4 shadow-xl">
                        <div className="p-4 space-y-2">
                            {navigation.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            navigate(item.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors
                        ${isActive
                                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }
                      `}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.label}
                                    </button>
                                );
                            })}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 mt-2">
                                <button
                                    onClick={() => {
                                        setShowImportWizard(true);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 dark:text-primary-400 font-medium"
                                >
                                    <Upload className="w-5 h-5" />
                                    Import Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in min-h-[calc(100vh-140px)]">
                <Outlet context={{ setShowImportWizard }} />
            </main>

            {/* Import Wizard Modal */}
            {showImportWizard && (
                <ImportProvider>
                    <ImportWizard onClose={() => setShowImportWizard(false)} />
                </ImportProvider>
            )}

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
                            <p className="font-semibold text-gray-900 dark:text-gray-200">Workforce Tracker</p>
                            <p className="mt-1">High-Performance HR Management System</p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            Handles 110,000+ employee records optimized with IndexedDB
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
