/**
 * Admin Settings Component
 * Database management and system configurations
 * P3 Enterprise Design System
 */

import React, { useState } from 'react';
import {
    Database,
    Trash2,
    AlertTriangle,
    Server,
    ShieldAlert,
    Info
} from 'lucide-react';
import { systemDB, employeeDB, assignmentDB } from '../services/db';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const { loadAllData } = useApp();
    const [isResetting, setIsResetting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(null);

    const handleReset = async (type) => {
        setIsResetting(true);
        try {
            if (type === 'all') {
                await systemDB.clearAllData();
                toast.success('System database completely reset');
            } else if (type === 'employees') {
                await employeeDB.clear();
                await assignmentDB.deleteByEmployee && await assignmentDB.clear();
                toast.success('Employee database cleared');
            }

            await loadAllData();
            setShowConfirm(null);
        } catch (error) {
            console.error('Reset failed:', error);
            toast.error('Failed to reset database');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
                    Settings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Database management and system configuration
                </p>
            </div>

            {/* Database Status */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <Server className="w-5 h-5 text-p3-electric" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                            Database Status
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            System storage and performance metrics
                        </p>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-400">Storage Type</p>
                                <p className="text-sm font-medium text-p3-midnight dark:text-white">IndexedDB</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Status</p>
                                <p className="text-sm font-medium text-success flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-success rounded-full" />
                                    Operational
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Capacity</p>
                                <p className="text-sm font-medium text-p3-midnight dark:text-white">110,000+ rows</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Performance</p>
                                <p className="text-sm font-medium text-p3-midnight dark:text-white">Optimized</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-warning/30 overflow-hidden">
                <div className="bg-warning/5 px-5 py-3 border-b border-warning/20 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-warning" />
                    <h2 className="text-sm font-semibold text-warning">
                        Danger Zone
                    </h2>
                </div>

                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-warning/10 rounded-lg">
                            <Database className="w-5 h-5 text-warning" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white">
                                Reset Database
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Permanently delete ALL data including employees, projects, assignments, and import history. This action cannot be undone.
                            </p>

                            <div className="mt-4">
                                {!showConfirm ? (
                                    <button
                                        onClick={() => setShowConfirm('all')}
                                        className="btn btn-danger btn-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear All Data
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                                        <p className="text-sm text-warning flex-1">
                                            This will permanently delete all data. Are you sure?
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowConfirm(null)}
                                                disabled={isResetting}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleReset('all')}
                                                disabled={isResetting}
                                                className="btn btn-danger btn-sm"
                                            >
                                                {isResetting ? (
                                                    <>
                                                        <div className="spinner" />
                                                        Clearing...
                                                    </>
                                                ) : (
                                                    'Yes, Delete Everything'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Database operations are performed locally using IndexedDB. Your data is stored securely in your browser and is not transmitted to external servers unless configured with Supabase integration.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
