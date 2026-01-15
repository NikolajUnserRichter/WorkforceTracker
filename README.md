# Workforce Tracker - High-Performance HR Management System

A complete workforce tracking and management web application with advanced HR data import capabilities designed to handle 110,000+ employee records efficiently.

## Features

### 1. High-Performance Data Import Wizard

A robust 4-step import wizard that handles massive datasets with ease:

#### Step 1: File Upload
- Support for Excel (.xlsx, .xls) and CSV files
- Drag-and-drop file upload
- File size validation (up to 200MB)
- Chunked file reading for large datasets
- Real-time progress indication

#### Step 2: Column Mapping
- Auto-detection of common column headers
- Intuitive drag-and-drop or dropdown mapping interface
- Support for 40+ standard HR fields including:
  - Basic Information (Employee ID, Name, Email, etc.)
  - Employment Details (Role, Status, FTE, Start/End Dates)
  - Organizational Data (Department, Division, Company, Country, etc.)
  - Compensation (Salary, Pay Scale, Hourly Rate)
- Field type validation (text, number, date, percentage, boolean)
- Save/load mapping templates
- Preview of sample data
- Category-based filtering

#### Step 3: Data Validation
- Comprehensive validation of all records
- Error categorization and detailed reporting
- Warning detection for non-critical issues
- Duplicate detection
- Field format validation
- Option to skip invalid rows
- Downloadable validation report

#### Step 4: Import Execution
- Real-time progress tracking with:
  - Overall progress percentage
  - Records processed counter
  - Processing speed (records/second)
  - Estimated time remaining
- Phase-by-phase breakdown:
  - Reading File (20%)
  - Parsing Data (30%)
  - Validating Records (20%)
  - Importing to Database (25%)
  - Finalizing & Indexing (5%)
- Animated progress bars and live updates
- Detailed completion summary
- Error log download
- Background processing (non-blocking UI)

### 2. Dashboard

Interactive dashboard showing key workforce metrics:
- Total employees count
- Active projects
- Utilization rate
- Available employees
- Active reduction programs
- Department breakdown
- Employment status distribution
- Quick statistics

### 3. Employee Management

- Advanced search and filtering
- Filter by department, status, and more
- Pagination (50 employees per page)
- Employee details display
- Reduction program indicators
- Responsive table layout

### 4. Personal Reduction Programs

- Track reduced working hours
- Monitor impact on capacity
- Program status indicators
- Historical tracking

### 5. Technical Features

- **IndexedDB Storage**: Efficient client-side database for 110,000+ records
- **Web Workers**: Background processing for non-blocking imports
- **Chunked Processing**: 2,000 rows per chunk for optimal performance
- **Virtual Scrolling**: Smooth rendering of large datasets
- **Dark/Light Mode**: Full theme support
- **Responsive Design**: Mobile and desktop optimized
- **TypeScript-Ready**: Structured for easy TypeScript migration

## Technology Stack

- **Frontend**: React 19
- **Styling**: Tailwind CSS
- **Database**: IndexedDB (via idb library)
- **File Parsing**:
  - SheetJS (XLSX) for Excel files
  - PapaParse for CSV files
- **Background Processing**: Web Workers
- **Charts**: Chart.js & Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
workforce-tracker/
├── public/
│   └── import-worker.js          # Web Worker for background import processing
├── src/
│   ├── components/
│   │   ├── import/
│   │   │   ├── ImportWizard.jsx            # Main wizard container
│   │   │   ├── Step1FileUpload.jsx         # File upload step
│   │   │   ├── Step2ColumnMapping.jsx      # Column mapping step
│   │   │   ├── Step3Validation.jsx         # Data validation step
│   │   │   └── Step4ImportExecution.jsx    # Import execution step
│   │   ├── Dashboard.jsx                   # Main dashboard
│   │   └── EmployeeList.jsx               # Employee management
│   ├── contexts/
│   │   ├── AppContext.jsx         # Global app state
│   │   └── ImportContext.jsx      # Import wizard state
│   ├── services/
│   │   └── db.js                  # IndexedDB service layer
│   ├── App.jsx                    # Main app component
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## Performance Capabilities

- **Import Speed**: 350+ records/second average
- **File Size**: Up to 200MB
- **Record Capacity**: 110,000+ employee records
- **Memory Usage**: < 500MB for entire dataset
- **UI Responsiveness**: Non-blocking imports via Web Workers
- **Search Performance**: < 500ms for filtered results

## Import Data Format

The system supports flexible column mapping and can handle various HR data formats including:

### Required Fields
- Employee ID
- Full Name

### Supported Optional Fields
- Personal: First Name, Last Name, Email, Birth Date, Gender, Nationality
- Employment: Role, Job Title, Status, Employment Type, Start/End Dates, FTE
- Organizational: Department, Division, Company, Country, Plant, Cost Center, Management Level, Reporting Manager
- Compensation: Hourly Rate, Base Salary, Pay Scale

### Example CSV Format

```csv
Employee ID,Full Name,Email,Role,Department,Status,FTE,Start Date
EMP001,John Doe,john.doe@company.com,Software Engineer,Engineering,active,100,2023-01-15
EMP002,Jane Smith,jane.smith@company.com,Product Manager,Product,active,80,2023-02-01
```

### Example Excel Format

The system auto-detects common column headers in multiple languages including:
- English: "Employee ID", "Full Name", "Email", etc.
- German: "Mitarbeiternummer", "Name", "E-Mail", etc.
- And many more...

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Features Coming Soon

- Project management and assignment
- Capacity planning view
- Advanced reporting and analytics
- Export to PDF/Excel
- Bulk employee operations
- Smart matching for project assignments
- Timeline/Gantt chart view

## Contributing

This is a demonstration project showcasing high-performance HR data management. Feel free to use it as a reference or starting point for your own projects.

## License

ISC

## Support

For questions or issues, please create an issue in the project repository.

---

**Built with performance in mind** - Designed to handle enterprise-scale HR datasets with 110,000+ employees efficiently.
