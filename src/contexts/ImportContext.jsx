/**
 * Import Context
 * Manages state for the multi-step import wizard
 *
 * Supports both IndexedDB (legacy) and Supabase (new) backends.
 * Uses Supabase when VITE_SUPABASE_URL is configured, falls back to IndexedDB otherwise.
 *
 * Performance Optimizations:
 * - Web Worker for file parsing (non-blocking UI)
 * - Batch database inserts (500 records per batch)
 * - Progress callbacks for real-time UI updates
 * - Performance instrumentation for monitoring
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { importHistoryDB, employeeDB } from '../services/db';
import { uploadsDB, employeesDB } from '../services/supabaseDB';
import { useAuth } from '../contexts/AuthContext';

const ImportContext = createContext();

// Check if Supabase is configured
const useSupabase = () => {
  return !!import.meta.env.VITE_SUPABASE_URL;
};

export const useImport = () => {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within ImportProvider');
  }
  return context;
};

export const ImportProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [fileInfo, setFileInfo] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [importProgress, setImportProgress] = useState({
    phase: '',
    progress: 0,
    message: '',
    processedCount: 0,
    totalCount: 0,
    speed: 0,
  });
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef(null);
  const startTimeRef = useRef(null);
  const fileInfoRef = useRef(null);
  const performanceMetrics = useRef({
    parseTime: 0,
    validationTime: 0,
    transformTime: 0,
    dbInsertTime: 0,
    totalTime: 0,
  });

  // Initialize Web Worker
  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker('/import-worker.js');

    worker.onmessage = (event) => {
      const { type, ...payload } = event.data;

      switch (type) {
        case 'READY':
          console.log('Worker ready');
          break;

        case 'PROGRESS':
          setImportProgress({
            phase: payload.phase,
            progress: payload.progress,
            message: payload.message,
            processedCount: payload.processedCount || 0,
            totalCount: payload.totalCount || 0,
            speed: payload.speed || 0,
          });
          break;

        case 'PARSE_COMPLETE':
          performanceMetrics.current.parseTime = payload.parseTime || 0;
          console.log(`[Performance] File parse: ${performanceMetrics.current.parseTime}ms`);
          setHeaders(payload.headers);
          setSampleData(payload.sampleData);
          setAllData(payload.allData);
          setIsProcessing(false);
          setCurrentStep(2); // Move to column mapping
          break;

        case 'VALIDATION_COMPLETE':
          performanceMetrics.current.validationTime = payload.validationTime || 0;
          console.log(`[Performance] Validation: ${performanceMetrics.current.validationTime}ms`);
          setValidationResults(payload.results);
          setIsProcessing(false);
          break;

        case 'IMPORT_COMPLETE':
          performanceMetrics.current.transformTime = payload.transformTime || 0;
          console.log(`[Performance] Transform: ${performanceMetrics.current.transformTime}ms`);
          handleImportComplete(payload.results);
          break;

        case 'ERROR':
          console.error('Worker error:', payload.error);
          setIsProcessing(false);
          alert(`Import error: ${payload.error}`);
          break;

        default:
          console.warn('Unknown worker message type:', type);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setIsProcessing(false);
      alert('Worker error occurred. Please try again.');
    };

    workerRef.current = worker;
    return worker;
  }, []);

  // Parse uploaded file
  const parseFile = useCallback((file) => {
    setIsProcessing(true);
    const info = {
      name: file.name,
      size: file.size,
      type: file.type,
    };
    setFileInfo(info);
    fileInfoRef.current = info;

    const worker = initWorker();
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = e.target.result;
      const fileType = file.name.endsWith('.csv') ? 'csv' : 'excel';

      worker.postMessage({
        type: 'PARSE_FILE',
        data: {
          fileData: fileType === 'csv' ? fileData : new Uint8Array(fileData),
          fileName: file.name,
          fileType,
        },
      });
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [initWorker]);

  // Validate data - only employeeId is required
  const validateData = useCallback((mapping, requiredFields = ['employeeId']) => {
    setIsProcessing(true);
    const worker = initWorker();

    worker.postMessage({
      type: 'VALIDATE_DATA',
      data: {
        rows: allData,
        columnMapping: mapping || columnMapping,
        requiredFields,
      },
    });
  }, [allData, columnMapping, initWorker]);

  // Start import process
  const startImport = useCallback((skipInvalidRows = false) => {
    setIsProcessing(true);
    startTimeRef.current = Date.now();
    performanceMetrics.current = {
      parseTime: performanceMetrics.current.parseTime,
      validationTime: performanceMetrics.current.validationTime,
      transformTime: 0,
      dbInsertTime: 0,
      totalTime: 0,
    };

    const worker = initWorker();

    worker.postMessage({
      type: 'PROCESS_IMPORT',
      data: {
        rows: allData,
        columnMapping,
        transformRules: {},
        skipInvalidRows,
      },
    });
  }, [allData, columnMapping, initWorker]);

  /**
   * Handle import completion - save to database
   *
   * Performance bottlenecks addressed:
   * 1. Network: Uses batch inserts (500 records) to minimize round trips
   * 2. Parsing: Already done in Web Worker (non-blocking)
   * 3. DB Inserts: Batched with progress reporting
   * 4. UI Blocking: Progress callbacks keep UI responsive
   */
  const handleImportComplete = useCallback(async (results) => {
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;

    setImportProgress({
      phase: 'finalizing',
      progress: 90,
      message: 'Preparing database write...',
      processedCount: results.processedRows,
      totalCount: results.totalRows,
      speed: Math.floor(results.processedRows / (duration / 1000)),
    });

    try {
      const currentFileInfo = fileInfoRef.current || fileInfo;
      const dbStartTime = performance.now();

      // Calculate cost and department breakdown
      const departmentBreakdown = {};
      let totalSalary = 0;

      results.employees.forEach(emp => {
        const dept = emp.department || 'Unknown';
        const salary = emp.baseSalary || emp.hourlyRate * 2080 || 0;

        if (!departmentBreakdown[dept]) {
          departmentBreakdown[dept] = { count: 0, totalSalary: 0 };
        }
        departmentBreakdown[dept].count += 1;
        departmentBreakdown[dept].totalSalary += salary;
        totalSalary += salary;
      });

      // Convert department breakdown for storage
      const deptCounts = {};
      Object.entries(departmentBreakdown).forEach(([k, v]) => {
        deptCounts[k] = v.count;
      });

      if (useSupabase()) {
        // ===== SUPABASE PATH =====
        console.log('[Import] Using Supabase backend');

        setImportProgress(prev => ({
          ...prev,
          progress: 91,
          message: 'Creating upload record...',
        }));

        // 1. Create upload record first
        const upload = await uploadsDB.create({
          user_id: user?.id,
          file_name: currentFileInfo?.name || 'Unknown',
          file_size: currentFileInfo?.size || 0,
          total_records: results.totalRows,
          records_successful: 0, // Will update after insert
          records_failed: results.failedRows,
          records_skipped: results.skippedRows,
          processing_time_ms: duration,
          error_log: results.errors || [],
          department_breakdown: deptCounts,
          total_salary: Math.round(totalSalary),
          status: 'processing',
        });

        setImportProgress(prev => ({
          ...prev,
          progress: 92,
          message: `Inserting ${results.employees.length.toLocaleString()} employees...`,
        }));

        // 2. Bulk insert employees with progress callback
        const insertResult = await employeesDB.bulkAdd(
          results.employees,
          upload.id,
          (processed, total) => {
            const insertProgress = 92 + Math.floor((processed / total) * 7);
            setImportProgress(prev => ({
              ...prev,
              progress: insertProgress,
              message: `Inserted ${processed.toLocaleString()} of ${total.toLocaleString()} employees...`,
              processedCount: processed,
              speed: Math.floor(processed / ((performance.now() - dbStartTime) / 1000)),
            }));
          },
          500 // Batch size
        );

        // 3. Update upload record with final counts
        await uploadsDB.update(upload.id, {
          records_successful: insertResult.successful,
          records_failed: results.failedRows + insertResult.failed,
          status: insertResult.failed > 0 ? 'completed' : 'completed',
        });

        performanceMetrics.current.dbInsertTime = performance.now() - dbStartTime;

      } else {
        // ===== INDEXEDDB PATH (Legacy fallback) =====
        console.log('[Import] Using IndexedDB backend (Supabase not configured)');

        // Save employees to IndexedDB
        await employeeDB.bulkAdd(results.employees, (processed, total) => {
          const progress = 92 + Math.floor((processed / total) * 7);
          setImportProgress(prev => ({
            ...prev,
            progress,
            message: `Saving ${processed.toLocaleString()} of ${total.toLocaleString()} employees...`,
          }));
        });

        // Save import history
        await importHistoryDB.add({
          fileName: currentFileInfo?.name || 'Unknown',
          fileSize: currentFileInfo?.size || 0,
          totalRecords: results.totalRows,
          recordsProcessed: results.processedRows,
          recordsSuccessful: results.successfulRows,
          recordsFailed: results.failedRows,
          recordsSkipped: results.skippedRows,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          errorLog: results.errors,
          totalSalary: Math.round(totalSalary),
          departmentBreakdown: deptCounts,
        });

        performanceMetrics.current.dbInsertTime = performance.now() - dbStartTime;
      }

      // Calculate final metrics
      performanceMetrics.current.totalTime = performance.now() - (startTimeRef.current ? startTimeRef.current : performance.now());

      // Log performance summary
      console.log('=== Import Performance Summary ===');
      console.log(`Parse time: ${performanceMetrics.current.parseTime}ms`);
      console.log(`Validation time: ${performanceMetrics.current.validationTime}ms`);
      console.log(`Transform time: ${performanceMetrics.current.transformTime}ms`);
      console.log(`DB insert time: ${performanceMetrics.current.dbInsertTime.toFixed(0)}ms`);
      console.log(`Total time: ${duration}ms`);
      console.log(`Records: ${results.employees.length}`);
      console.log(`Rate: ${(results.employees.length / (duration / 1000)).toFixed(0)} records/second`);
      console.log('=================================');

      setImportResults({
        ...results,
        duration,
        performanceMetrics: { ...performanceMetrics.current },
      });

      setImportProgress({
        phase: 'complete',
        progress: 100,
        message: 'Import complete!',
        processedCount: results.processedRows,
        totalCount: results.totalRows,
        speed: Math.floor(results.processedRows / (duration / 1000)),
      });

      setIsProcessing(false);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error saving import:', error);
      alert('Error saving import results: ' + error.message);
      setIsProcessing(false);
    }
  }, [fileInfo, user]);

  // Reset import wizard
  const resetImport = useCallback(() => {
    setCurrentStep(1);
    setFileInfo(null);
    setHeaders([]);
    setSampleData([]);
    setAllData([]);
    setColumnMapping({});
    setValidationResults(null);
    setImportProgress({
      phase: '',
      progress: 0,
      message: '',
      processedCount: 0,
      totalCount: 0,
      speed: 0,
    });
    setImportResults(null);
    setIsProcessing(false);
    performanceMetrics.current = {
      parseTime: 0,
      validationTime: 0,
      transformTime: 0,
      dbInsertTime: 0,
      totalTime: 0,
    };

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Go to specific step
  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }, []);

  const value = {
    // State
    currentStep,
    fileInfo,
    headers,
    sampleData,
    allData,
    columnMapping,
    validationResults,
    importProgress,
    importResults,
    isProcessing,

    // Actions
    parseFile,
    validateData,
    startImport,
    resetImport,
    goToStep,
    setColumnMapping,
  };

  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
};
