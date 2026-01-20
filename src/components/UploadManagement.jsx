/**
 * Upload Management Component (Admin Only)
 * View and manage all data uploads/imports
 * P3 Enterprise Design System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { importHistoryDB } from '../services/unifiedDB';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const UploadManagement = () => {
  const { user, isAdmin } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedUpload, setExpandedUpload] = useState(null);
  const [error, setError] = useState(null);

  const fetchUploads = useCallback(async () => {
    // Check local admin status or if user has permission
    // Note: unifiedDB handles the actual data fetch source
    setLoading(true);
    setError(null);

    try {
      const data = await importHistoryDB.getAll();
      setUploads(data || []);
    } catch (err) {
      console.error('Error fetching uploads:', err);
      // Only show error if we're supposed to have access or if it's a real effective error
      if (isAdmin()) {
        setError('Failed to load uploads. Please try again.');
        toast.error('Failed to load uploads');
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleDelete = async (uploadId) => {
    const previousUploads = [...uploads];
    const uploadToDelete = uploads.find((u) => u.id === uploadId);

    if (!uploadToDelete) {
      toast.error('Upload not found');
      return;
    }

    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    setDeleting(uploadId);
    setConfirmDelete(null);

    try {
      await importHistoryDB.delete(uploadId);
      toast.success(`Deleted upload: ${uploadToDelete.fileName}`);
    } catch (err) {
      console.error('Error deleting upload:', err);
      setUploads(previousUploads);
      toast.error('Failed to delete upload. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return { badge: 'badge-active', icon: CheckCircle, label: 'Completed' };
      case 'processing':
        return { badge: 'badge-analysis', icon: RefreshCw, label: 'Processing' };
      case 'failed':
        return { badge: 'badge-warning', icon: XCircle, label: 'Failed' };
      default:
        return { badge: 'badge-inactive', icon: AlertCircle, label: status || 'Unknown' };
    }
  };

  if (!isAdmin()) {
    return (
      <div className="empty-state">
        <AlertCircle className="empty-state-icon" />
        <p className="empty-state-title">Access Denied</p>
        <p className="empty-state-description">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
              Uploads
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
              {uploads.length}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage imported workforce data
          </p>
        </div>
        <button
          onClick={fetchUploads}
          disabled={loading}
          className="btn btn-secondary btn-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-warning">{error}</p>
            <button
              onClick={fetchUploads}
              className="text-xs text-warning underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 border-p3-electric" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && uploads.length === 0 && (
        <div className="empty-state">
          <Upload className="empty-state-icon" />
          <p className="empty-state-title">No uploads yet</p>
          <p className="empty-state-description">
            Import workforce data to see uploads here.
          </p>
        </div>
      )}

      {/* Uploads List */}
      {!loading && uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload) => {
            const status = getStatusDisplay(upload.status);
            const StatusIcon = status.icon;
            const isExpanded = expandedUpload === upload.id;
            const isDeleting = deleting === upload.id;
            const isConfirming = confirmDelete === upload.id;

            return (
              <div
                key={upload.id}
                className={`bg-white dark:bg-gray-900 rounded-lg border transition-all ${isDeleting
                  ? 'border-warning/50 opacity-50'
                  : 'border-gray-200 dark:border-gray-800'
                  }`}
              >
                {/* Main Row */}
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-p3-electric" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-p3-midnight dark:text-white truncate">
                        {upload.fileName}
                      </h3>
                      <span className={`badge ${status.badge}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(upload.createdAt || upload.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {upload.recordsSuccessful?.toLocaleString() || 0} records
                      </span>
                      <span>{formatFileSize(upload.fileSize)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedUpload(isExpanded ? null : upload.id)}
                      className="btn btn-ghost btn-icon btn-sm"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-warning">Delete?</span>
                        <button
                          onClick={() => handleDelete(upload.id)}
                          disabled={isDeleting}
                          className="btn btn-danger btn-sm"
                        >
                          {isDeleting ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          disabled={isDeleting}
                          className="btn btn-secondary btn-sm"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(upload.id)}
                        disabled={isDeleting}
                        className="btn btn-ghost btn-sm text-warning hover:bg-warning/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total Records</p>
                        <p className="text-sm font-medium text-p3-midnight dark:text-white">
                          {upload.totalRecords?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Successful</p>
                        <p className="text-sm font-medium text-success">
                          {upload.recordsSuccessful?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Failed</p>
                        <p className="text-sm font-medium text-warning">
                          {upload.recordsFailed?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Processing Time</p>
                        <p className="text-sm font-medium text-p3-midnight dark:text-white">
                          {formatDuration(upload.processingTime)}
                        </p>
                      </div>
                    </div>

                    {upload.departmentBreakdown &&
                      Object.keys(upload.departmentBreakdown).length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-400 mb-2">Department Breakdown</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(upload.departmentBreakdown)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 10)
                              .map(([dept, count]) => (
                                <span
                                  key={dept}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                                >
                                  {dept}: {count}
                                </span>
                              ))}
                            {Object.keys(upload.departmentBreakdown).length > 10 && (
                              <span className="px-2 py-1 text-xs text-gray-400">
                                +{Object.keys(upload.departmentBreakdown).length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    {upload.profiles && (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-400">
                          Uploaded by{' '}
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            {upload.profiles.username || upload.profiles.email}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warning Notice */}
      <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong className="text-warning">Warning:</strong> Deleting an upload will permanently remove all associated employee records. This action cannot be undone.
        </p>
      </div>
    </div>
  );
};

export default UploadManagement;
