/**
 * Import Wizard - Step 3: Data Validation Preview
 * Shows validation results with detailed error/warning reporting
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';

const Step3Validation = () => {
  const {
    validateData,
    validationResults,
    isProcessing,
    importProgress,
    goToStep,
    allData,
  } = useImport();

  const [expandedErrors, setExpandedErrors] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState(false);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  useEffect(() => {
    // Start validation when component mounts
    if (!validationResults && allData.length > 0) {
      validateData();
    }
  }, []);

  const handleContinue = () => {
    goToStep(4);
  };

  const downloadValidationReport = () => {
    if (!validationResults) return;

    const report = {
      summary: {
        totalRows: validationResults.totalRows,
        validRows: validationResults.validRows,
        rowsWithWarnings: validationResults.rowsWithWarnings,
        rowsWithErrors: validationResults.rowsWithErrors,
      },
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      duplicateIds: validationResults.duplicateIds,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getErrorsByType = () => {
    if (!validationResults) return {};

    const grouped = {};
    validationResults.errors.forEach(error => {
      if (!grouped[error.type]) {
        grouped[error.type] = [];
      }
      grouped[error.type].push(error);
    });
    return grouped;
  };

  const getWarningsByType = () => {
    if (!validationResults) return {};

    const grouped = {};
    validationResults.warnings.forEach(warning => {
      if (!grouped[warning.type]) {
        grouped[warning.type] = [];
      }
      grouped[warning.type].push(warning);
    });
    return grouped;
  };

  const errorsByType = getErrorsByType();
  const warningsByType = getWarningsByType();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Data Validation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review validation results before importing. Errors must be addressed or skipped.
        </p>
      </div>

      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {importProgress.message}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Phase: {importProgress.phase}
            </p>
            <div className="max-w-md mx-auto">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {importProgress.progress}% complete
              </p>
            </div>
          </div>
        </div>
      )}

      {validationResults && !isProcessing && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Records</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {validationResults.totalRows.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>Valid Records</span>
              </div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {validationResults.validRows.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {((validationResults.validRows / validationResults.totalRows) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Warnings</span>
              </div>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {validationResults.rowsWithWarnings.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
                <XCircle className="w-4 h-4" />
                <span>Errors</span>
              </div>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {validationResults.rowsWithErrors.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Errors Section */}
          {validationResults.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <button
                onClick={() => setExpandedErrors(!expandedErrors)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                      Errors Found ({validationResults.errors.length})
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      These records have critical issues
                    </p>
                  </div>
                </div>
                {expandedErrors ? (
                  <ChevronDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </button>

              {expandedErrors && (
                <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(errorsByType).map(([type, errors]) => (
                    <div key={type} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2 capitalize">
                        {type.replace(/_/g, ' ')} ({errors.length})
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {errors.slice(0, 10).map((error, idx) => (
                          <div key={idx} className="text-sm text-red-700 dark:text-red-300">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                        {errors.length > 10 && (
                          <div className="text-sm text-red-600 dark:text-red-400 italic">
                            ... and {errors.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings Section */}
          {validationResults.warnings.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 mb-6">
              <button
                onClick={() => setExpandedWarnings(!expandedWarnings)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-200">
                      Warnings ({validationResults.warnings.length})
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      These records have minor issues but can be imported
                    </p>
                  </div>
                </div>
                {expandedWarnings ? (
                  <ChevronDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
              </button>

              {expandedWarnings && (
                <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(warningsByType).map(([type, warnings]) => (
                    <div key={type} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2 capitalize">
                        {type.replace(/_/g, ' ')} ({warnings.length})
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {warnings.slice(0, 10).map((warning, idx) => (
                          <div key={idx} className="text-sm text-orange-700 dark:text-orange-300">
                            Row {warning.row}: {warning.message}
                          </div>
                        ))}
                        {warnings.length > 10 && (
                          <div className="text-sm text-orange-600 dark:text-orange-400 italic">
                            ... and {warnings.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {validationResults.errors.length === 0 && validationResults.warnings.length === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-200">
                    All Records Valid
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    No errors or warnings found. Ready to import!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {validationResults.errors.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Import Options
              </h3>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipInvalidRows}
                  onChange={(e) => setSkipInvalidRows(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Skip Invalid Rows
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Continue import and skip rows with errors.
                    {validationResults.errors.length > 0 && (
                      <span className="font-semibold">
                        {' '}({validationResults.rowsWithErrors} rows will be skipped)
                      </span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => goToStep(2)}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Back to Mapping
              </button>

              <button
                onClick={downloadValidationReport}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>

            <button
              onClick={handleContinue}
              disabled={validationResults.errors.length > 0 && !skipInvalidRows}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${(validationResults.errors.length === 0 || skipInvalidRows)
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {validationResults.errors.length > 0
                ? `Import ${validationResults.validRows} Valid Records`
                : 'Continue to Import'
              }
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Step3Validation;
