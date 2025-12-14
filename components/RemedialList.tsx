import React, { useState, useMemo } from 'react';
import { Student, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, Filter, AlertCircle, FileText, ClipboardList, BookOpen } from 'lucide-react';
import { downloadPDF } from '../utils/pdfGenerator';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';

interface RemedialListProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

const RemedialList: React.FC<RemedialListProps> = ({ students, subjects, metadata }) => {
  const [minAvg, setMinAvg] = useState<number>(9);
  const [maxAvg, setMaxAvg] = useState<number>(9.99);
  const [minFailedSubjects, setMinFailedSubjects] = useState<number>(0);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const remedialStudents = useMemo(() => {
    return students.filter(s => {
      // Average condition
      const avgCondition = s.semesterAverage >= minAvg && s.semesterAverage <= maxAvg;
      
      // Failed subjects count condition
      const failedCount = subjects.filter(subj => (s.grades[subj] || 0) < 10).length;
      const subjectCondition = failedCount >= minFailedSubjects;

      return avgCondition && subjectCondition;
    }).sort((a, b) => b.semesterAverage - a.semesterAverage);
  }, [students, minAvg, maxAvg, minFailedSubjects, subjects]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(remedialStudents.map(s => {
      const failedSubjects = subjects.filter(subj => (s.grades[subj] || 0) < 10);
      return {
        'الاسم واللقب': s.name,
        'الجنس': s.gender,
        'المعدل الفصلي': s.semesterAverage,
        'المواد المعنية بالمعالجة': failedSubjects.join('، '),
        'عدد المواد': failedSubjects.length
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المعنيين بالمعالجة والمتابعة");
    XLSX.writeFile(wb, 'قائمة_المعنيين_بالمعالجة_والمتابعة.xlsx');
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setTimeout(async () => {
        await downloadPDF('remedial-report', 'قائمة_المعنيين_بالمعالجة_والمتابعة.pdf');
        setIsPdfGenerating(false);
    }, 100);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <style>
        {`
          @media print {
            @page { margin: 15mm; }
          }
        `}
      </style>

      <div id="remedial-report" className={`${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="قائمة التلاميذ المعنيين بالمعالجة والمتابعة" 
            metadata={metadata}
            subtitle={
              <span>
                 المعدل المحصور بين <strong>{minAvg}</strong> و <strong>{maxAvg}</strong>
                 {minFailedSubjects > 0 && ` - عدد المواد الراسب فيها ≥ ${minFailedSubjects}`}
              </span>
            }
        />

        {/* Controls Section (Hidden in Print) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-slate-800">
                    <Filter className="text-blue-600" />
                    <h2 className="text-xl font-bold">تحديد معايير المعالجة والمتابعة</h2>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExport} disabled={remedialStudents.length === 0} className="flex-1 md:flex-none btn-icon bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={handlePdfExport} disabled={remedialStudents.length === 0} className="flex-1 md:flex-none btn-icon bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileText size={16} /> PDF
                    </button>
                    <button onClick={handlePrint} disabled={remedialStudents.length === 0} className="flex-1 md:flex-none btn-icon bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Printer size={16} /> طباعة
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأدنى للمعدل</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="20"
                        value={minAvg}
                        onChange={(e) => setMinAvg(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأقصى للمعدل</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="20"
                        value={maxAvg}
                        onChange={(e) => setMaxAvg(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="w-full md:w-1/4">
                     <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأدنى للمواد الراسب فيها</label>
                     <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="number" 
                            min="0" 
                            max={subjects.length}
                            value={minFailedSubjects}
                            onChange={(e) => setMinFailedSubjects(parseInt(e.target.value) || 0)}
                            className="w-full pr-4 pl-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>
                </div>
                <div className="w-full md:w-1/4 pb-2 text-slate-600 font-medium">
                    عدد التلاميذ المطابقين: <span className="text-blue-700 text-lg font-bold mx-1">{remedialStudents.length}</span>
                </div>
            </div>
        </div>

        {/* Results Table */}
        {remedialStudents.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-800">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center print:bg-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 print:text-xl print:text-black">
                        <ClipboardList className="text-blue-600 print:hidden" size={20} />
                        قائمة التلاميذ المعنيين بالمعالجة والمتابعة
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm print:text-lg text-right border border-slate-200 print:border-slate-900">
                        <thead className="bg-slate-50 print:bg-slate-200 text-slate-600 print:text-black font-medium border-b border-slate-200 print:border-slate-900">
                            <tr>
                                <th className="p-3 w-10 font-bold print:text-black">#</th>
                                <th className="p-3 font-bold print:text-black">الاسم واللقب</th>
                                <th className="p-3 w-24 font-bold print:text-black">الجنس</th>
                                <th className="p-3 w-24 font-bold print:text-black">المعدل</th>
                                <th className="p-3 font-bold print:text-black">المواد المعنية (أقل من 10)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {remedialStudents.map((s, i) => {
                                const failedSubjects = subjects.filter(subj => (s.grades[subj] || 0) < 10);
                                return (
                                    <tr key={i} className="hover:bg-slate-50 border-b print:border-slate-300">
                                        <td className="p-3 text-slate-500 print:text-black">{i + 1}</td>
                                        <td className="p-3 font-medium text-slate-900 print:text-black print:font-bold">{s.name}</td>
                                        <td className="p-3 text-slate-500 print:text-black">{s.gender}</td>
                                        <td className="p-3 font-bold text-blue-700 print:text-black dir-ltr text-left">{s.semesterAverage.toFixed(2)}</td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {failedSubjects.length > 0 ? (
                                                    failedSubjects.map(subj => (
                                                        <span key={subj} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs print:text-base print:bg-transparent print:border print:border-slate-900 print:text-black border border-red-100">
                                                            {subj} <span className="text-red-400 print:text-black text-[10px] print:text-sm font-bold">({s.grades[subj]})</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-green-600 text-xs print:text-base print:text-black">- لا توجد مواد -</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <AlertCircle size={48} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">لا توجد نتائج</h3>
                <p className="text-slate-500">
                    لا يوجد تلاميذ ضمن المعايير المحددة.
                    <br />
                    جرب توسيع مجال المعدل أو تقليل عدد المواد الراسب فيها.
                </p>
            </div>
        )}

        <ReportSignatures />
      </div>
    </div>
  );
};

export default RemedialList;