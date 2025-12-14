import React, { useMemo, useState } from 'react';
import { Student, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, FileText, Table2, Settings, X } from 'lucide-react';
import { downloadPDF } from '../utils/pdfGenerator';
import { getGeneralSubjectSummary } from '../utils/dataProcessing';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';

interface GeneralSubjectSummaryProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: {
    average: boolean;
    highest: boolean;
    lowest: boolean;
    count15: boolean;
    count10: boolean;
  };
}

const GeneralSubjectSummary: React.FC<GeneralSubjectSummaryProps> = ({ students, subjects, metadata }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'landscape',
    columns: {
      average: true,
      highest: true,
      lowest: true,
      count15: true,
      count10: true,
    }
  });

  const summaryData = useMemo(() => {
    return getGeneralSubjectSummary(students, subjects);
  }, [students, subjects]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(summaryData.map(row => ({
      'المادة': row.subject,
      'المتوسط العام': row.average.toFixed(2),
      'أعلى علامة': row.highest,
      'أدنى علامة': row.lowest,
      'عدد التلاميذ (≥15)': row.countAbove15,
      'عدد التلاميذ (<10)': row.countBelow10,
      'عدد الممتحنين': row.studentCount
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ملخص المواد");
    XLSX.writeFile(wb, 'ملخص_نتائج_المواد.xlsx');
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    setTimeout(async () => {
      await downloadPDF('subject-summary-report', 'ملخص_نتائج_المواد.pdf', printOptions.orientation);
      setIsPdfGenerating(false);
    }, 100);
  };

  const executePrint = () => {
    setShowPrintSettings(false);
    setTimeout(() => window.print(), 100);
  };

  const toggleColumn = (key: keyof PrintOptions['columns']) => {
    setPrintOptions(prev => ({
      ...prev,
      columns: { ...prev.columns, [key]: !prev.columns[key] }
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <style>
        {`
          @media print {
            @page { size: ${printOptions.orientation}; margin: 15mm; }
          }
        `}
      </style>

      {/* Print Settings Modal */}
      {showPrintSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-700 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings size={20} />
                إعدادات الطباعة
              </h3>
              <button onClick={() => setShowPrintSettings(false)} className="hover:bg-blue-600 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Orientation */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">اتجاه الصفحة</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="orientation" 
                      checked={printOptions.orientation === 'portrait'} 
                      onChange={() => setPrintOptions(p => ({...p, orientation: 'portrait'}))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>طولي (Portrait)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="orientation" 
                      checked={printOptions.orientation === 'landscape'} 
                      onChange={() => setPrintOptions(p => ({...p, orientation: 'landscape'}))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>عرضي (Landscape)</span>
                  </label>
                </div>
              </div>

              {/* Columns */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">الأعمدة الظاهرة</h4>
                <div className="space-y-2">
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.average} onChange={() => toggleColumn('average')} className="w-4 h-4 rounded text-blue-600" />
                     <span>المتوسط العام</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.highest} onChange={() => toggleColumn('highest')} className="w-4 h-4 rounded text-blue-600" />
                     <span>أعلى علامة</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.lowest} onChange={() => toggleColumn('lowest')} className="w-4 h-4 rounded text-blue-600" />
                     <span>أدنى علامة</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.count15} onChange={() => toggleColumn('count15')} className="w-4 h-4 rounded text-blue-600" />
                     <span>عدد المتفوقين (≥15)</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.count10} onChange={() => toggleColumn('count10')} className="w-4 h-4 rounded text-blue-600" />
                     <span>عدد دون المتوسط (&lt;10)</span>
                   </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={executePrint}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer size={20} />
                  طباعة
                </button>
                <button 
                  onClick={handlePdfExport}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileText size={20} />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center no-print">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Table2 className="text-blue-600" />
            الملخص العام للمواد
        </h2>
        <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Download size={16} /> Excel
            </button>
            <button onClick={() => setShowPrintSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors">
                <Settings size={16} /> إعدادات التقرير
            </button>
        </div>
      </div>

      <div id="subject-summary-report" className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none ${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="الملخص العام لنتائج المواد" 
            metadata={metadata}
            subtitle="جدول إحصائي شامل للدرجات والمعدلات" 
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm print:text-base text-center text-slate-600 border border-slate-200 print:border-slate-900">
            <thead className="text-xs print:text-lg text-slate-700 print:text-black uppercase bg-slate-100 print:bg-slate-200 border-b border-slate-200 print:border-slate-900">
              <tr>
                <th className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-right print:text-black">المادة</th>
                <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.average ? 'hidden' : ''}`}>المتوسط العام</th>
                <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-green-700 print:text-black ${!printOptions.columns.highest ? 'hidden' : ''}`}>أعلى علامة</th>
                <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-red-700 print:text-black ${!printOptions.columns.lowest ? 'hidden' : ''}`}>أدنى علامة</th>
                <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold bg-blue-50 print:bg-white print:text-black ${!printOptions.columns.count15 ? 'hidden' : ''}`}>
                    عدد المتفوقين (≥15)
                </th>
                <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold bg-orange-50 print:bg-white print:text-black ${!printOptions.columns.count10 ? 'hidden' : ''}`}>
                    عدد دون المتوسط (&lt;10)
                </th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((row, index) => (
                <tr key={index} className="border-b print:border-slate-300 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-slate-900 print:text-black text-right">
                    {row.subject}
                  </td>
                  <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${row.average >= 10 ? 'text-green-700' : 'text-red-700'} ${!printOptions.columns.average ? 'hidden' : ''}`}>
                    {row.average.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-green-600 print:text-black ${!printOptions.columns.highest ? 'hidden' : ''}`}>
                    {row.highest}
                  </td>
                  <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-red-600 print:text-black ${!printOptions.columns.lowest ? 'hidden' : ''}`}>
                    {row.lowest}
                  </td>
                  <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-medium bg-blue-50/30 print:bg-transparent print:text-black ${!printOptions.columns.count15 ? 'hidden' : ''}`}>
                    {row.countAbove15}
                  </td>
                  <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-medium bg-orange-50/30 print:bg-transparent print:text-black ${!printOptions.columns.count10 ? 'hidden' : ''}`}>
                    {row.countBelow10}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportSignatures />
      </div>
    </div>
  );
};

export default GeneralSubjectSummary;