/**
 * Confirm Dialog Component
 * Reusable confirmation modal for destructive actions
 * P3 Enterprise Design System
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';

/**
 * ConfirmDialog - A reusable confirmation modal
 *
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {function} onClose - Called when dialog is dismissed
 * @param {function} onConfirm - Called when user confirms the action
 * @param {string} title - Dialog title
 * @param {string} message - Main message/description
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - 'danger' | 'warning' | 'info' (default: 'danger')
 * @param {boolean} loading - Show loading state on confirm button
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      // Focus cancel button by default for safety
      dialogRef.current?.querySelector('button[data-cancel]')?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-warning/10',
          iconColor: 'text-warning',
          Icon: AlertCircle,
          buttonBg: 'bg-warning hover:bg-warning/90',
        };
      case 'info':
        return {
          iconBg: 'bg-primary-100 dark:bg-primary-900/30',
          iconColor: 'text-p3-electric',
          Icon: Info,
          buttonBg: 'bg-p3-electric hover:bg-primary-600',
        };
      case 'danger':
      default:
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          Icon: AlertTriangle,
          buttonBg: 'bg-red-600 hover:bg-red-700',
        };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.Icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl transition-all animate-fade-in"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 p-3 rounded-full ${styles.iconBg}`}>
                <Icon className={`w-6 h-6 ${styles.iconColor}`} />
              </div>

              {/* Text */}
              <div className="flex-1 pt-1">
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-p3-midnight dark:text-white"
                >
                  {title}
                </h3>
                <p
                  id="confirm-dialog-description"
                  className="mt-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                data-cancel
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                disabled={loading}
                className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing confirm dialog state
 *
 * Usage:
 * const { isOpen, show, hide, confirm } = useConfirmDialog();
 *
 * // Later:
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'This action cannot be undone.',
 *     variant: 'danger'
 *   });
 *   if (confirmed) {
 *     // perform delete
 *   }
 * };
 */
export const useConfirmDialog = () => {
  const [state, setState] = useState({
    isOpen: false,
    config: {},
    resolve: null,
  });

  const show = (config = {}) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        config,
        resolve,
      });
    });
  };

  const hide = () => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState({ isOpen: false, config: {}, resolve: null });
  };

  const handleConfirm = () => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState({ isOpen: false, config: {}, resolve: null });
  };

  return {
    isOpen: state.isOpen,
    config: state.config,
    show,
    hide,
    confirm: show,
    onConfirm: handleConfirm,
    onClose: hide,
  };
};

export default ConfirmDialog;
