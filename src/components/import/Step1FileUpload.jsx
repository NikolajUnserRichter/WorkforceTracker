/**
 * Import Wizard - Step 1: File Upload
 * Handles file selection and initial upload with progress indication
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';

const Step1FileUpload = () => {
  const { parseFile, fileInfo, isProcessing, importProgress } = useImport();
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 200MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload .xlsx, .xls, or .csv files.');
      } else {
        setError('Error uploading file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      parseFile(file);
    }
  }, [parseFile]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 200 * 1024 * 1024, // 200MB
    multiple: false,
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Upload HR Data File
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your employee data file in Excel (.xlsx, .xls) or CSV format.
          Our system can handle files with 110,000+ rows efficiently.
        </p>
      </div>

      {!fileInfo && !isProcessing && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            }
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center">
            <Upload
              className={`w-16 h-16 mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'
                }`}
            />

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragActive ? 'Drop file here' : 'Drag & drop your file here'}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              or click to browse
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel, CSV</span>
              </div>
              <div>
                Maximum file size: 200MB
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">
              Upload Error
            </h4>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {fileInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                {fileInfo.name}
              </h3>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{formatFileSize(fileInfo.size)}</span>
                <span className="capitalize">{fileInfo.type.split('/').pop()} file</span>
              </div>

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {importProgress.message}
                    </span>
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {importProgress.progress}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${importProgress.progress}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Phase: {importProgress.phase}
                  </p>
                </div>
              )}

              {!isProcessing && importProgress.phase === 'parsing' && (
                <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">File parsed successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Supported File Formats
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Excel 2007+ (.xlsx)</li>
          <li>• Excel 97-2003 (.xls)</li>
          <li>• Comma-separated values (.csv)</li>
        </ul>

        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mt-4 mb-2">
          Performance Capabilities
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Processes 110,000+ employee records</li>
          <li>• Chunked processing (2,000 rows per chunk)</li>
          <li>• Background processing keeps UI responsive</li>
          <li>• Estimated processing: 350+ records/second</li>
        </ul>
      </div>
    </div>
  );
};

export default Step1FileUpload;
