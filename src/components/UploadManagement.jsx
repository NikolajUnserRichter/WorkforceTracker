/**
 * Upload Management Component (Admin Only)
 * View and manage all data uploads/imports
 *
 * Features:
 * - View all uploads with metadata
 * - Delete selected uploads (cascades to employees)
 * - Optimistic UI updates with rollback on error
 * - Handles concurrent deletions gracefully
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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const UploadManagement = () => {
  const { user, isAdmin } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // ID of upload being deleted
  const [confirmDelete, setConfirmDelete] = useState(null); // ID of upload to confirm delete
  const [expandedUpload, setExpandedUpload] = useState(null); // ID of expanded upload for details
  const [error, setError] = useState(null);

  /**
   * Fetch all uploads from Supabase
   */
  const fetchUploads = useCallback(async () => {
    if (!isAdmin()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('uploads')
        .select(`
          *,
          profiles:user_id (username, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUploads(data || []);
    } catch (err) {
      console.error('Error fetching uploads:', err);
      setError('Failed to load uploads. Please try again.');
      toast.error('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  /**
   * Delete an upload and all associated employees
   * Uses optimistic update with rollback on failure
   */
  const handleDelete = async (uploadId) => {
    // Store current state for rollback
    const previousUploads = [...uploads];
    const uploadToDelete = uploads.find((u) => u.id === uploadId);

    if (!uploadToDelete) {
      toast.error('Upload not found');
      return;
    }

    // Optimistic update
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    setDeleting(uploadId);
    setConfirmDelete(null);

    try {
      // Delete from Supabase (cascade will delete employees)
      const { error: deleteError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (deleteError) {
        // Handle specific error cases
        if (deleteError.code === 'PGRST116') {
          // Record already deleted (concurrent deletion)
          toast.success('Upload already removed');
          return;
        }
        throw deleteError;
      }

      toast.success(`Deleted upload: ${uploadToDelete.file_name}`);
    } catch (err) {
      console.error('Error deleting upload:', err);

      // Rollback optimistic update
      setUploads(previousUploads);

      // Handle permission errors
      if (err.message?.includes('permission') || err.code === '42501') {
        toast.error('You do not have permission to delete uploads');
      } else {
        toast.error('Failed to delete upload. Please try again.');
      }
    } finally {
      setDeleting(null);
    }
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  /**
   * Format processing time
   */
  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  /**
   * Get status color and icon
   */
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          icon: CheckCircle,
          label: 'Completed',
        };
      case 'processing':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          icon: RefreshCw,
          label: 'Processing',
        };
      case 'failed':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: XCircle,
          label: 'Failed',
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          icon: AlertCircle,
          label: status || 'Unknown',
        };
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Upload Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage all data imports
          </p>
        </div>
        <button
          onClick={fetchUploads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchUploads}
              className="text-sm text-red-700 dark:text-red-300 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && uploads.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No uploads yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Import workforce data to see uploads here.
          </p>
        </div>
      )}

      {/* Uploads List */}
      {!loading && uploads.length > 0 && (
        <div className="space-y-4">
          {uploads.map((upload) => {
            const status = getStatusDisplay(upload.status);
            const StatusIcon = status.icon;
            const isExpanded = expandedUpload === upload.id;
            const isDeleting = deleting === upload.id;
            const isConfirming = confirmDelete === upload.id;

            return (
              <div
                key={upload.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border transition-all ${
                  isDeleting
                    ? 'border-red-300 dark:border-red-700 opacity-50'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Main Row */}
                <div className="p-4 flex items-center gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Upload Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {upload.file_name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(upload.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {upload.records_successful?.toLocaleString() || 0} records
                      </span>
                      <span>{formatFileSize(upload.file_size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Expand Button */}
                    <button
                      onClick={() =>
                        setExpandedUpload(isExpanded ? null : upload.id)
                      }
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>

                    {/* Delete Button */}
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-600 dark:text-red-400">
                          Confirm?
                        </span>
                        <button
                          onClick={() => handleDelete(upload.id)}
                          disabled={isDeleting}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          disabled={isDeleting}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(upload.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Total Records
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {upload.total_records?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Successful
                        </p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {upload.records_successful?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Failed
                        </p>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          {upload.records_failed?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Processing Time
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDuration(upload.processing_time_ms)}
                        </p>
                      </div>
                    </div>

                    {/* Department Breakdown */}
                    {upload.department_breakdown &&
                      Object.keys(upload.department_breakdown).length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Department Breakdown
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(upload.department_breakdown)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 10)
                              .map(([dept, count]) => (
                                <span
                                  key={dept}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
                                >
                                  {dept}: {count}
                                </span>
                              ))}
                            {Object.keys(upload.department_breakdown).length > 10 && (
                              <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                +{Object.keys(upload.department_breakdown).length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Uploaded By */}
                    {upload.profiles && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Uploaded by{' '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
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
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Warning:</strong> Deleting an upload will permanently remove all
            associated employee records. This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadManagement;
