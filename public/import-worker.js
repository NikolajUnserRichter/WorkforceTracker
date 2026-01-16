/**
 * Web Worker for High-Performance Import Processing
 * Handles chunked file parsing, data transformation, and validation
 * Runs in background thread to keep UI responsive
 */

// Import libraries (loaded via importScripts in worker context)
self.importScripts(
  'https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
);

const CHUNK_SIZE = 2000; // Process 2000 rows at a time

// Helper function to normalize data values
function normalizeValue(value, fieldType) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const strValue = String(value).trim();

  if (strValue === '' || strValue.toLowerCase() === 'n/a' || strValue.toLowerCase() === 'null') {
    return null;
  }

  switch (fieldType) {
    case 'date':
      return normalizeDateValue(strValue);
    case 'number':
      return parseFloat(strValue) || null;
    case 'percentage':
      return normalizePercentage(strValue);
    case 'boolean':
      return normalizeBoolean(strValue);
    default:
      return strValue;
  }
}

function normalizeDateValue(value) {
  if (!value) return null;

  // Try parsing various date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      return value; // Return as-is if it matches a valid format
    }
  }

  // Try Excel date serial number
  if (/^\d+(\.\d+)?$/.test(value)) {
    const excelDate = parseFloat(value);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  return value;
}

function normalizePercentage(value) {
  if (!value) return null;

  const strValue = String(value).replace('%', '').trim();
  const num = parseFloat(strValue);

  if (isNaN(num)) return null;

  // If value is > 1, assume it's in percentage form (80 = 80%)
  // If value is <= 1, assume it's in decimal form (0.8 = 80%)
  return num > 1 ? num : num * 100;
}

function normalizeBoolean(value) {
  if (!value) return false;

  const strValue = String(value).toLowerCase().trim();

  const trueValues = ['true', 't', 'yes', 'y', '1', 'active', 'a'];
  const falseValues = ['false', 'f', 'no', 'n', '0', 'inactive', 'i'];

  if (trueValues.includes(strValue)) return true;
  if (falseValues.includes(strValue)) return false;

  return null;
}

// Transform row data based on column mapping
function transformRow(row, columnMapping, transformRules = {}) {
  const transformed = {};

  for (const [targetField, sourceColumn] of Object.entries(columnMapping)) {
    if (!sourceColumn || sourceColumn === '') continue;

    let value = row[sourceColumn];

    // Apply field-specific transformation
    const fieldConfig = transformRules[targetField] || {};
    const fieldType = fieldConfig.type || 'text';

    value = normalizeValue(value, fieldType);

    // Handle special transformations
    if (targetField === 'name' && fieldConfig.split && value) {
      // Split full name into first and last
      const parts = value.split(' ');
      transformed.firstName = parts[0];
      transformed.lastName = parts.slice(1).join(' ');
      transformed.name = value;
    } else if (targetField === 'status' && value) {
      // Normalize status values
      const statusMap = {
        'active': 'active',
        'a': 'active',
        '1': 'active',
        'inactive': 'inactive',
        'i': 'inactive',
        '0': 'inactive',
        'terminated': 'terminated',
        't': 'terminated',
        '9': 'terminated',
      };
      transformed[targetField] = statusMap[value.toLowerCase()] || value;
    } else {
      transformed[targetField] = value;
    }
  }

  return transformed;
}

// Validate row data
function validateRow(row, requiredFields, rowIndex) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!row[field] || row[field] === '') {
      errors.push({
        type: 'missing_required',
        field,
        message: `Missing required field: ${field}`,
        row: rowIndex,
      });
    }
  }

  // Validate email format
  if (row.email && row.email !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      warnings.push({
        type: 'invalid_email',
        field: 'email',
        message: 'Invalid email format',
        row: rowIndex,
      });
    }
  }

  // Validate date fields
  const dateFields = ['startDate', 'endDate', 'birthdate'];
  for (const field of dateFields) {
    if (row[field] && row[field] !== '') {
      const dateValue = new Date(row[field]);
      if (isNaN(dateValue.getTime())) {
        errors.push({
          type: 'invalid_date',
          field,
          message: `Invalid date format in ${field}`,
          row: rowIndex,
        });
      }
    }
  }

  // Validate FTE/percentage fields
  if (row.fte !== null && row.fte !== undefined) {
    if (row.fte < 0 || row.fte > 100) {
      warnings.push({
        type: 'out_of_range',
        field: 'fte',
        message: 'FTE should be between 0 and 100',
        row: rowIndex,
      });
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

// Main message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'PARSE_FILE':
        await parseFile(data);
        break;

      case 'VALIDATE_DATA':
        await validateData(data);
        break;

      case 'PROCESS_IMPORT':
        await processImport(data);
        break;

      default:
        self.postMessage({
          type: 'ERROR',
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      stack: error.stack,
    });
  }
});

// Parse file (Excel or CSV)
async function parseFile(data) {
  const { fileData, fileName, fileType } = data;

  self.postMessage({
    type: 'PROGRESS',
    phase: 'reading',
    progress: 10,
    message: 'Reading file...',
  });

  let rows = [];
  let headers = [];

  if (fileType === 'csv') {
    // Parse CSV
    const result = Papa.parse(fileData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all as strings for consistent handling
    });

    rows = result.data;
    headers = result.meta.fields || [];
  } else {
    // Parse Excel
    const workbook = XLSX.read(fileData, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false, // Convert dates to strings
    });

    if (jsonData.length > 0) {
      headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      // Convert array format to object format
      rows = dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    }
  }

  self.postMessage({
    type: 'PROGRESS',
    phase: 'parsing',
    progress: 30,
    message: `Parsed ${rows.length} rows`,
  });

  self.postMessage({
    type: 'PARSE_COMPLETE',
    headers,
    totalRows: rows.length,
    sampleData: rows.slice(0, 10),
    allData: rows, // Send all data for processing
  });
}

// Validate data sample
async function validateData(data) {
  const { rows, columnMapping, requiredFields } = data;

  self.postMessage({
    type: 'PROGRESS',
    phase: 'validating',
    progress: 0,
    message: 'Starting validation...',
  });

  const validationResults = {
    totalRows: rows.length,
    validRows: 0,
    rowsWithWarnings: 0,
    rowsWithErrors: 0,
    errors: [],
    warnings: [],
    duplicateIds: new Set(),
  };

  const seenIds = new Map();

  // Validate in chunks
  const chunkSize = 1000;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, Math.min(i + chunkSize, rows.length));

    for (let j = 0; j < chunk.length; j++) {
      const rowIndex = i + j;
      const row = chunk[j];

      // Transform row
      const transformedRow = transformRow(row, columnMapping);

      // Validate row
      const validation = validateRow(transformedRow, requiredFields, rowIndex + 2); // +2 for header and 0-index

      if (validation.isValid) {
        validationResults.validRows++;
      }

      if (validation.errors.length > 0) {
        validationResults.rowsWithErrors++;
        validationResults.errors.push(...validation.errors);
      }

      if (validation.warnings.length > 0) {
        validationResults.rowsWithWarnings++;
        validationResults.warnings.push(...validation.warnings);
      }

      // Check for duplicate IDs
      if (transformedRow.employeeId) {
        if (seenIds.has(transformedRow.employeeId)) {
          validationResults.duplicateIds.add(transformedRow.employeeId);
          validationResults.errors.push({
            type: 'duplicate_id',
            field: 'employeeId',
            message: `Duplicate employee ID: ${transformedRow.employeeId}`,
            row: rowIndex + 2,
          });
          validationResults.rowsWithErrors++;
        } else {
          seenIds.set(transformedRow.employeeId, rowIndex);
        }
      }
    }

    // Update progress
    const progress = Math.floor((i + chunk.length) / rows.length * 100);
    self.postMessage({
      type: 'PROGRESS',
      phase: 'validating',
      progress,
      message: `Validated ${i + chunk.length} of ${rows.length} rows`,
    });
  }

  self.postMessage({
    type: 'VALIDATION_COMPLETE',
    results: {
      ...validationResults,
      duplicateIds: Array.from(validationResults.duplicateIds),
    },
  });
}

// Process import with real-time progress
async function processImport(data) {
  const { rows, columnMapping, transformRules, skipInvalidRows } = data;

  const results = {
    totalRows: rows.length,
    processedRows: 0,
    successfulRows: 0,
    skippedRows: 0,
    failedRows: 0,
    employees: [],
    errors: [],
  };

  // Only employeeId is required - name is optional
  const requiredFields = ['employeeId'];
  const seenIds = new Set();

  // Process in chunks for better performance
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, Math.min(i + CHUNK_SIZE, rows.length));

    self.postMessage({
      type: 'PROGRESS',
      phase: 'importing',
      progress: Math.floor((i / rows.length) * 100),
      message: `Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(rows.length / CHUNK_SIZE)}`,
      processedCount: i,
      totalCount: rows.length,
      speed: i > 0 ? Math.floor(i / ((Date.now() - results.startTime) / 1000)) : 0,
    });

    for (let j = 0; j < chunk.length; j++) {
      const rowIndex = i + j;
      const row = chunk[j];

      try {
        // Transform row
        const transformedRow = transformRow(row, columnMapping, transformRules);

        // Validate row
        const validation = validateRow(transformedRow, requiredFields, rowIndex + 2);

        if (!validation.isValid && skipInvalidRows) {
          results.skippedRows++;
          results.errors.push(...validation.errors);
          continue;
        }

        // Check for duplicates
        if (seenIds.has(transformedRow.employeeId)) {
          if (skipInvalidRows) {
            results.skippedRows++;
            continue;
          }
        } else {
          seenIds.add(transformedRow.employeeId);
        }

        // Create employee record
        const employee = {
          employeeId: transformedRow.employeeId || `EMP${Date.now()}${rowIndex}`,
          name: transformedRow.name || 'Unknown',
          email: transformedRow.email || '',
          role: transformedRow.role || transformedRow.jobTitle || '',
          department: transformedRow.department || '',
          status: transformedRow.status || 'active',
          fte: transformedRow.fte || 100,
          startDate: transformedRow.startDate || new Date().toISOString().split('T')[0],
          skills: [],
          availability: transformedRow.status === 'active' ? 'available' : 'inactive',
          photo: null,
          hourlyRate: transformedRow.hourlyRate || transformedRow.baseSalary || 0,
          reductionProgram: null,
          importMetadata: {
            importDate: new Date().toISOString(),
            sourceRow: rowIndex + 2,
            rawData: transformedRow,
          },
          organizationalData: {
            company: transformedRow.company || '',
            country: transformedRow.country || '',
            plant: transformedRow.plant || '',
            division: transformedRow.division || '',
            costCenter: transformedRow.costCenter || '',
            managementLevel: transformedRow.managementLevel || '',
            reportingManager: transformedRow.reportingManager || '',
          },
        };

        results.employees.push(employee);
        results.successfulRows++;
      } catch (error) {
        results.failedRows++;
        results.errors.push({
          type: 'processing_error',
          message: error.message,
          row: rowIndex + 2,
        });
      }

      results.processedRows++;
    }
  }

  self.postMessage({
    type: 'IMPORT_COMPLETE',
    results,
  });
}

// Signal that worker is ready
self.postMessage({ type: 'READY' });
