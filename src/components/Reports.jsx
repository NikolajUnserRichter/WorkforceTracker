import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  PieChart,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Reports = () => {
  const { employees, projects, reductionPrograms, assignments } = useApp();
  const [generating, setGenerating] = useState(false);

  const metrics = useMemo(() => {
    const totalEmployees = employees.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const activeReductions = reductionPrograms.filter(p => p.status === 'active').length;

    const departmentCounts = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const statusCounts = employees.reduce((acc, emp) => {
      const status = emp.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const roleCounts = employees.reduce((acc, emp) => {
      const role = emp.role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const totalFTE = employees.reduce((sum, emp) => sum + (emp.fte || 100), 0) / 100;
    const avgFTE = totalEmployees > 0 ? totalFTE / totalEmployees : 0;

    const totalCapacity = employees.reduce((sum, emp) => {
      const fte = emp.fte || 100;
      const reduction = emp.reductionProgram?.reductionPercentage || 0;
      return sum + (fte * (1 - reduction / 100));
    }, 0);

    const totalAllocated = assignments.reduce((sum, assignment) => {
      return sum + (assignment.allocationPercentage || 0);
    }, 0);

    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    const reductionImpact = employees.reduce((sum, emp) => {
      return sum + (emp.reductionProgram?.reductionPercentage || 0);
    }, 0);

    return {
      totalEmployees,
      activeProjects,
      activeReductions,
      departmentCounts,
      statusCounts,
      roleCounts,
      totalFTE: Math.round(totalFTE * 10) / 10,
      avgFTE: Math.round(avgFTE * 100 * 10) / 10,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      reductionImpact: totalEmployees > 0 ? Math.round(reductionImpact / totalEmployees * 10) / 10 : 0,
    };
  }, [employees, projects, reductionPrograms, assignments]);

  const generateManagementSummaryPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Workforce Management Report', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated on ' + new Date().toLocaleDateString(), pageWidth / 2, 30, { align: 'center' });

      let yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryLines = [
        'This report provides a comprehensive overview of the current workforce status as of ' + new Date().toLocaleDateString() + '.',
        'The organization currently manages ' + metrics.totalEmployees + ' employees across ' + Object.keys(metrics.departmentCounts).length + ' departments,',
        'with ' + metrics.activeProjects + ' active projects and a utilization rate of ' + metrics.utilizationRate + '%.'
      ];

      summaryLines.forEach(text => {
        doc.text(text, 20, yPos, { maxWidth: pageWidth - 40 });
        yPos += 6;
      });

      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Metrics', 20, yPos);
      yPos += 8;

      const keyMetrics = [
        ['Metric', 'Value'],
        ['Total Employees', metrics.totalEmployees.toString()],
        ['Total FTE', metrics.totalFTE + ' FTE'],
        ['Average FTE per Employee', metrics.avgFTE + '%'],
        ['Active Projects', metrics.activeProjects.toString()],
        ['Utilization Rate', metrics.utilizationRate + '%'],
        ['Active Reduction Programs', metrics.activeReductions.toString()],
        ['Avg. Reduction Impact', metrics.reductionImpact + '%'],
      ];

      doc.autoTable({
        startY: yPos,
        head: [keyMetrics[0]],
        body: keyMetrics.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Department Breakdown', 20, yPos);
      yPos += 8;

      const deptData = Object.entries(metrics.departmentCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([dept, count]) => [
          dept,
          count.toString(),
          Math.round((count / metrics.totalEmployees) * 100) + '%'
        ]);

      doc.autoTable({
        startY: yPos,
        head: [['Department', 'Employees', 'Percentage']],
        body: deptData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 },
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          'Page ' + i + ' of ' + totalPages + ' | Workforce Tracker © ' + new Date().getFullYear(),
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save('workforce-management-summary-' + new Date().toISOString().split('T')[0] + '.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateDetailedEmployeeListPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Employee List', pageWidth / 2, 18, { align: 'center' });

      const employeeData = employees.map(emp => [
        emp.employeeId || '',
        emp.name || '',
        emp.department || '',
        emp.role || '',
        emp.status || '',
        (emp.fte || 100) + '%',
        emp.reductionProgram?.status === 'active' ? 'Yes' : 'No',
      ]);

      doc.autoTable({
        startY: 40,
        head: [['ID', 'Name', 'Department', 'Role', 'Status', 'FTE', 'Reduction']],
        body: employeeData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          'Page ' + i + ' of ' + totalPages + ' | Total Employees: ' + employees.length,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save('employee-list-' + new Date().toISOString().split('T')[0] + '.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    setGenerating(true);
    try {
      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ['Workforce Management Report'],
        ['Generated: ' + new Date().toLocaleString()],
        [''],
        ['Key Metrics'],
        ['Total Employees', metrics.totalEmployees],
        ['Total FTE', metrics.totalFTE],
        ['Active Projects', metrics.activeProjects],
        ['Utilization Rate', metrics.utilizationRate + '%'],
        ['Active Reduction Programs', metrics.activeReductions],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      const employeeData = [
        ['Employee ID', 'Name', 'Email', 'Department', 'Role', 'Status', 'FTE', 'Reduction Program'],
        ...employees.map(emp => [
          emp.employeeId || '',
          emp.name || '',
          emp.email || '',
          emp.department || '',
          emp.role || '',
          emp.status || '',
          (emp.fte || 100) + '%',
          emp.reductionProgram?.status === 'active' ? 'Yes' : 'No',
        ]),
      ];

      const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employees');

      XLSX.writeFile(workbook, 'workforce-report-' + new Date().toISOString().split('T')[0] + '.xlsx');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const reports = [
    {
      id: 'management-summary',
      title: 'Management Summary',
      description: 'Executive overview with key metrics and charts',
      icon: FileText,
      color: 'blue',
      action: generateManagementSummaryPDF,
    },
    {
      id: 'employee-list',
      title: 'Detailed Employee List',
      description: 'Complete list of all employees with details',
      icon: Users,
      color: 'green',
      action: generateDetailedEmployeeListPDF,
    },
    {
      id: 'excel-export',
      title: 'Excel Export',
      description: 'Export all data to Excel spreadsheet',
      icon: FileSpreadsheet,
      color: 'purple',
      action: exportToExcel,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Reports & Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate comprehensive reports with charts and export to PDF or Excel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {metrics.totalEmployees}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Utilization Rate</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                {metrics.utilizationRate}%
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400">Departments</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {Object.keys(metrics.departmentCounts).length}
              </p>
            </div>
            <PieChart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400">Active Programs</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                {metrics.activeReductions}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const colorClasses = {
            blue: 'bg-blue-600 hover:bg-blue-700',
            green: 'bg-green-600 hover:bg-green-700',
            purple: 'bg-purple-600 hover:bg-purple-700',
          };

          return (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${colorClasses[report.color]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {report.description}
                  </p>
                  <button
                    onClick={report.action}
                    disabled={generating}
                    className={`
                      flex items-center gap-2 px-4 py-2 ${colorClasses[report.color]}
                      text-white rounded-lg font-medium transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Download className="w-4 h-4" />
                    {generating ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;
