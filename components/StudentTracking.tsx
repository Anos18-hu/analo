import React, { useState, useMemo } from 'react';
import { Student, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, User, Settings, X, FileText, Trophy, Target, Users, BarChart2 } from 'lucide-react';
import { calculateAverage } from '../utils/statistics';
import { getSubjectAnalysis } from '../utils/dataProcessing';
import { downloadPDF } from '../utils/pdfGenerator';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';
import PrintSettingsModal from './PrintSettingsModal';

interface StudentTrackingProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: {
    studentGrade: boolean;
    classAverage: boolean;
    comparison: boolean;
  };
}

const StudentTracking: React.FC<StudentTrackingProps> = ({ students, subjects, metadata }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'portrait',
    columns: {
      studentGrade: true,
      classAverage: true,
      comparison: true,
    }
  });

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
  [students, selectedStudentId]);

  // Use memoized subject analysis to get class averages quickly
  const subjectAnalysis = useMemo(() => {
    return getSubjectAnalysis(students, subjects);
  }, [students, subjects]);

  // Calculate summary stats for the dashboard section
  const summaryStats = useMemo(() => {
    if (!selectedStudent || students.length === 0) return null;
    
    const allAverages = students.map(s => s.semesterAverage);
    const classAvg = calculateAverage(allAverages);
    
    // Calculate Rank (filter checks how many students have a higher average)
    const rank = students.filter(s => s.semesterAverage > selectedStudent.semesterAverage).length + 1;

    return {
        studentAvg: selectedStudent.semesterAverage,
        classAvg,
        rank,
        totalStudents: students.length,
        highest: Math.max(...allAverages),
        lowest: Math.min(...allAverages)
    };
  }, [selectedStudent, students]);

  const tableData = useMemo(() => {
    if (!selectedStudent) return [];

    const rows = subjects.map(subject => {
      const studentGrade = selectedStudent.grades[subject];
      
      // Get class average from cached analysis instead of recalculating
      const stat = subjectAnalysis.find(s => s.subject === subject);
      const classAverage = stat ? stat.average : 0;
      
      let comparison = 'مساوي للمعدل';
      if (typeof studentGrade === 'number') {
        if (studentGrade > classAverage) comparison = 'أعلى من المعدل';
        else if (studentGrade < classAverage) comparison = 'أقل من المعدل';
      }

      return {
        subject,
        studentGrade: typeof studentGrade === 'number' ? studentGrade : '-',
        classAverage: classAverage.toFixed(2),
        comparison,
        isTotal: false
      };
    });

    // Add Semester Average Row
    const classAvgOfAvgs = calculateAverage(students.map(s => s.semesterAverage));
    const studentAvg = selectedStudent.semesterAverage;
    let totalComparison = 'مساوي للمعدل';
    if (studentAvg > classAvgOfAvgs) totalComparison = 'أعلى من المعدل';
    else if (studentAvg < classAvgOfAvgs) totalComparison = 'أقل من المعدل';

    rows.push({
        subject: 'المعدل الفصلي',
        studentGrade: studentAvg,
        classAverage: classAvgOfAvgs.toFixed(2),
        comparison: totalComparison,
        isTotal: true
    });

    return rows;
  }, [selectedStudent, subjects, students, subjectAnalysis]);

  const handleExport = () => {
    if (!selectedStudent) return;
    const ws = XLSX.utils.json_to_sheet(tableData.map(row => ({
      'المادة': row.subject,
      'معدل التلميذ': row.studentGrade,
      'متوسط الفصل': row.classAverage,
      'المقارنة': row.comparison
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تفاصيل التلميذ");
    XLSX.writeFile(wb, `تقرير_${selectedStudent.name}.xlsx`);
  };

  const handlePdfExport = async () => {
    if (!selectedStudent) return;
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    // Timeout to allow state update and DOM render of PDF-specific styles
    setTimeout(async () => {
        await downloadPDF('student-report', `تقرير_${selectedStudent.name}.pdf`, printOptions.orientation);
        setIsPdfGenerating(false);
    }, 100);
  };

  const executePrint = () => {
    setShowPrintSettings(false);
    setTimeout(() => window.print(), 100);
  };

  const columnOptions = [
    { key: 'studentGrade', label: 'معدل التلميذ' },
    { key: 'classAverage', label: 'متوسط الفصل' },
    { key: 'comparison', label: 'المقارنة' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <style>
        {`
          @media print {
            @page { size: ${printOptions.orientation}; margin: 15mm; }
          }
        `}
      </style>

      {/* Print Settings Modal */}
      <PrintSettingsModal
        isOpen={showPrintSettings}
        onClose={() => setShowPrintSettings(false)}
        onPrint={executePrint}
        onPdf={handlePdfExport}
        isPdfGenerating={isPdfGenerating}
        printOptions={printOptions}
        setPrintOptions={setPrintOptions}
        columnOptions={columnOptions}
      />

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print">
        <label className="block text-sm font-medium text-slate-700 mb-2">اختر التلميذ</label>
        <div className="flex gap-4">
          <div className="relative flex-grow max-w-md">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">-- اختر تلميذ --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedStudent && (
        <div 
          id="student-report" 
          className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 ${isPdfGenerating ? 'pdf-export-mode' : ''}`}
        >
          
          <ReportHeader 
            title="كشف نقاط التلميذ" 
            metadata={metadata}
            subtitle={
              <div className="flex justify-center gap-12 text-xl font-bold mt-2">
                 <span>الاسم واللقب: {selectedStudent.name}</span>
                 <span> | </span>
                 <span>الجنس: {selectedStudent.gender}</span>
              </div>
            }
          />

          {/* Performance Summary Cards - Fixed Grid for Print */}
          {summaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-4 mb-10">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm print:bg-white print:border-slate-800 print:border-2">
                <div>
                   <p className="text-blue-600 print:text-black text-xs print:text-base font-bold uppercase mb-1">معدل التلميذ</p>
                   <p className="text-2xl print:text-3xl font-black text-blue-900 print:text-black">{summaryStats.studentAvg.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 print:hidden">
                    <Target size={20} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm print:bg-white print:border-slate-800 print:border-2">
                <div>
                   <p className="text-slate-500 print:text-black text-xs print:text-base font-bold uppercase mb-1">معدل القسم</p>
                   <p className="text-2xl print:text-3xl font-black text-slate-800 print:text-black">{summaryStats.classAvg.toFixed(2)}</p>
                </div>
                 <div className="p-3 bg-slate-200 rounded-full text-slate-600 print:hidden">
                    <Users size={20} />
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-sm print:bg-white print:border-slate-800 print:border-2">
                <div>
                   <p className="text-amber-600 print:text-black text-xs print:text-base font-bold uppercase mb-1">الترتيب</p>
                   <p className="text-2xl print:text-3xl font-black text-amber-900 print:text-black">{summaryStats.rank} <span className="text-sm print:text-xl font-medium text-amber-700 print:text-black">/ {summaryStats.totalStudents}</span></p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full text-amber-600 print:hidden">
                    <Trophy size={20} />
                </div>
              </div>

               <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between shadow-sm print:bg-white print:border-slate-800 print:border-2">
                <div>
                   <p className="text-purple-600 print:text-black text-xs print:text-base font-bold uppercase mb-1">إحصائيات القسم</p>
                   <div className="flex flex-col text-xs print:text-sm text-purple-800 print:text-black font-bold">
                        <span>أعلى معدل: {summaryStats.highest.toFixed(2)}</span>
                        <span>أدنى معدل: {summaryStats.lowest.toFixed(2)}</span>
                   </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full text-purple-600 print:hidden">
                    <BarChart2 size={20} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6 print:hidden">
            <h3 className="text-xl font-bold text-slate-800">
              تقرير التلميذ: <span className="text-blue-600">{selectedStudent.name}</span>
            </h3>
            <div className="flex gap-2 no-print">
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={16} />
                تصدير Excel
              </button>
              <button 
                onClick={handlePdfExport}
                disabled={isPdfGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                <FileText size={16} />
                {isPdfGenerating ? 'جاري التصدير...' : 'تصدير PDF'}
              </button>
              <button 
                onClick={() => setShowPrintSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Printer size={16} />
                إعدادات الطباعة
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-lg text-right text-slate-600 border border-slate-200 print:border-slate-900">
              <thead className="text-xs print:text-xl text-slate-700 print:text-black uppercase bg-slate-100 print:bg-slate-200 border-b border-slate-200 print:border-slate-900">
                <tr>
                  <th className="px-6 py-4 border-l border-slate-200 print:border-slate-900 font-bold print:text-black">المادة</th>
                  <th className={`px-6 py-4 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.studentGrade ? 'print:hidden' : ''}`}>معدل التلميذ</th>
                  <th className={`px-6 py-4 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.classAverage ? 'print:hidden' : ''}`}>متوسط الفصل</th>
                  <th className={`px-6 py-4 font-bold print:text-black ${!printOptions.columns.comparison ? 'print:hidden' : ''}`}>المقارنة</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className={`border-b print:border-slate-300 hover:bg-slate-50 ${row.isTotal ? 'bg-blue-50 font-bold print:bg-slate-100 print:border-t-2 print:border-slate-900' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-bold text-slate-900 print:text-black border-l border-slate-200 print:border-slate-900">
                        {row.subject}
                    </td>
                    <td className={`px-6 py-4 border-l border-slate-200 print:border-slate-900 font-black ${row.isTotal ? 'text-blue-800' : 'text-blue-600'} print:text-black ${!printOptions.columns.studentGrade ? 'print:hidden' : ''}`}>
                        {row.studentGrade}
                    </td>
                    <td className={`px-6 py-4 border-l border-slate-200 print:border-slate-900 print:text-black font-semibold ${!printOptions.columns.classAverage ? 'print:hidden' : ''}`}>
                        {row.classAverage}
                    </td>
                    <td className={`px-6 py-4 ${!printOptions.columns.comparison ? 'print:hidden' : ''}`}>
                      <span className={`px-2 py-1 rounded-full text-xs print:text-lg font-bold print:border print:border-slate-800 print:bg-transparent print:text-black
                        ${row.comparison === 'أعلى من المعدل' ? 'bg-green-100 text-green-700' : 
                          row.comparison === 'أقل من المعدل' ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {row.comparison}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <ReportSignatures />
        </div>
      )}
    </div>
  );
};

export default StudentTracking;