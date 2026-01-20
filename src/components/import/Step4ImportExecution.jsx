/**
 * Import Wizard - Step 4: Import Execution with Real-Time Progress
 * Shows detailed progress tracking with phase breakdown and live updates
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Download, Home, Eye, Upload } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';
import { useApp } from '../../contexts/AppContext';

const Step4ImportExecution = ({ onClose }) => {
  const {
    startImport,
    importProgress,
    importResults,
    isProcessing,
    validationResults,
    resetImport,
  } = useImport();

  const { refreshEmployees, setCurrentView } = useApp();

  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    // Start import when component mounts
    if (!importResults && !isProcessing) {
      setStartTime(Date.now());
      const skipInvalid = validationResults?.errors?.length > 0;
      startImport(skipInvalid);
    }
  }, []);

  // Calculate estimated time remaining
  useEffect(() => {
    if (isProcessing && importProgress.speed > 0 && startTime) {
      const remaining = importProgress.totalCount - importProgress.processedCount;
      const secondsRemaining = Math.ceil(remaining / importProgress.speed);
      setEstimatedTimeRemaining(secondsRemaining);
    }
  }, [importProgress, isProcessing, startTime]);

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '...';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins} minute${mins > 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
    }
    return `${secs} second${secs !== 1 ? 's' : ''}`;
  };

  const getPhaseDescription = (phase) => {
    const phases = {
      reading: { label: 'Reading File', progress: 20 },
      parsing: { label: 'Parsing Data', progress: 30 },
      validating: { label: 'Validating Records', progress: 20 },
      importing: { label: 'Importing to Database', progress: 25 },
      finalizing: { label: 'Finalizing & Indexing', progress: 5 },
      complete: { label: 'Complete', progress: 100 },
    };

    return phases[phase] || { label: phase, progress: 0 };
  };

  const navigate = useNavigate();

  const handleViewEmployees = async () => {
    await refreshEmployees();
    resetImport();
    if (onClose) onClose();
    navigate('/employees');
  };

  const handleNewImport = () => {
    resetImport();
  };

  const downloadErrorLog = () => {
    if (!importResults) return;

    const errorLog = {
      summary: {
        totalRows: importResults.totalRows,
        successfulRows: importResults.successfulRows,
        failedRows: importResults.failedRows,
        skippedRows: importResults.skippedRows,
      },
      errors: importResults.errors,
    };

    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isProcessing ? 'Importing Data...' : 'Import Complete'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isProcessing
            ? 'Please wait while we process your data. This may take a few minutes.'
            : 'Your data has been successfully imported into the system.'
          }
        </p>
      </div>

      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {importProgress.progress}%
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-4 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${importProgress.progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse-slow"></div>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {importProgress.message}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Phase: {getPhaseDescription(importProgress.phase).label}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Records Processed</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {importProgress.processedCount?.toLocaleString() || 0}
                <span className="text-lg text-gray-500 dark:text-gray-400">
                  {' '}/ {importProgress.totalCount?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Processing Speed</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {importProgress.speed?.toLocaleString() || 0}
                <span className="text-lg text-gray-500 dark:text-gray-400"> /sec</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Remaining</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(estimatedTimeRemaining)}
              </div>
            </div>
          </div>

          {/* Phase Breakdown */}
          <div className="space-y-2">
            {[
              { key: 'reading', label: 'Reading File', weight: 20 },
              { key: 'parsing', label: 'Parsing Data', weight: 30 },
              { key: 'validating', label: 'Validating Records', weight: 20 },
              { key: 'importing', label: 'Importing to Database', weight: 25 },
              { key: 'finalizing', label: 'Finalizing & Indexing', weight: 5 },
            ].map((phase, index) => {
              const isComplete = importProgress.progress >= (index + 1) * 20;
              const isCurrent = importProgress.phase === phase.key;

              return (
                <div
                  key={phase.key}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-colors
                    ${isCurrent
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                      : 'bg-gray-50 dark:bg-gray-900'
                    }
                  `}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"></div>
                  )}

                  <span className={`flex-1 text-sm font-medium ${isCurrent
                    ? 'text-gray-900 dark:text-white'
                    : isComplete
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-500 dark:text-gray-500'
                    }`}>
                    {phase.label}
                  </span>

                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {phase.weight}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {importResults && !isProcessing && (
        <>
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-8 mb-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Import Successful!</h3>
                <p className="text-green-100">
                  Your data has been processed and saved to the database.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-green-100 mb-1">Total Time</div>
                <div className="text-xl font-bold">
                  {formatDuration(importResults.duration)}
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-green-100 mb-1">Avg Speed</div>
                <div className="text-xl font-bold">
                  {Math.floor(importResults.processedRows / (importResults.duration / 1000))} /sec
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-green-100 mb-1">Records</div>
                <div className="text-xl font-bold">
                  {importResults.totalRows.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-green-100 mb-1">Success Rate</div>
                <div className="text-xl font-bold">
                  {((importResults.successfulRows / importResults.totalRows) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Successful</h4>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {importResults.successfulRows.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                employees imported
              </div>
            </div>

            {importResults.skippedRows > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Skipped</h4>
                </div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {importResults.skippedRows.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  invalid records
                </div>
              </div>
            )}

            {importResults.failedRows > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Failed</h4>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {importResults.failedRows.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  processing errors
                </div>
              </div>
            )}
          </div>

          {/* Error Log */}
          {importResults.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-red-900 dark:text-red-200">
                  Import Errors ({importResults.errors.length})
                </h4>
                <button
                  onClick={downloadErrorLog}
                  className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importResults.errors.slice(0, 20).map((error, idx) => (
                  <div key={idx} className="text-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 p-2 rounded">
                    {error.row && `Row ${error.row}: `}{error.message}
                  </div>
                ))}
                {importResults.errors.length > 20 && (
                  <div className="text-sm text-red-600 dark:text-red-400 italic text-center">
                    ... and {importResults.errors.length - 20} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleViewEmployees}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
            >
              <Eye className="w-5 h-5" />
              View Imported Employees
            </button>

            <button
              onClick={handleNewImport}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              New Import
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Step4ImportExecution;
