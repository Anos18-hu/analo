import React, { useMemo, useState } from 'react';
import { Student, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, UserX, AlertTriangle, FileText, TrendingDown, Settings, X } from 'lucide-react';
import { downloadPDF } from '../utils/pdfGenerator';
import { getRepeaterStats } from '../utils/dataProcessing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';

interface RepeaterAnalysisProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: {
    gender: boolean;
    average: boolean;
    failedCount: boolean;
    status: boolean;
  };
}

const RepeaterAnalysis: React.FC<RepeaterAnalysisProps> = ({ students, subjects, metadata }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'portrait',
    columns: {
      gender: true,
      average: true,
      failedCount: true,
      status: true,
    }
  });

  const repeaterStats = useMemo(() => {
    return getRepeaterStats(students, subjects);
  }, [students, subjects]);

  const chartData = useMemo(() => {
    return [
      { name: 'المعدل العام', repeaters: repeaterStats.repeaterAverage, others: repeaterStats.nonRepeaterAverage },
    ];
  }, [repeaterStats]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(repeaterStats.repeaters.map(s => ({
      'الاسم': s.name,
      'الجنس': s.gender,
      'المعدل الفصلي': s.semesterAverage,
      'النتيجة': s.semesterAverage >= 10 ? 'ناجح' : 'راسب',
      'عدد المواد الراسب فيها': Object.values(s.grades).filter(g => g < 10).length
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قائمة المعيدين");
    XLSX.writeFile(wb, 'تحليل_المعيدين.xlsx');
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    setTimeout(async () => {
        await downloadPDF('repeater-report', 'تحليل_المعيدين.pdf', printOptions.orientation);
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

  if (repeaterStats.totalRepeaters === 0) {
      return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
              <div className="p-4 bg-green-50 rounded-full mb-4">
                  <UserX size={48} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">لا يوجد معيدين</h3>
              <p className="text-slate-500 max-w-md">
                  لم يتم العثور على أي تلميذ مسجل كـ "معيد" في الملف.
                  <br/>
                  <span className="text-xs mt-2 block bg-slate-100 p-2 rounded">
                      ملاحظة: يبحث النظام عن كلمات "معيد"، "مكرر"، أو "Doublant" في بيانات التلميذ.
                  </span>
              </p>
          </div>
      );
  }

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
                     <input type="checkbox" checked={printOptions.columns.gender} onChange={() => toggleColumn('gender')} className="w-4 h-4 rounded text-blue-600" />
                     <span>الجنس</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.average} onChange={() => toggleColumn('average')} className="w-4 h-4 rounded text-blue-600" />
                     <span>المعدل الفصلي</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.failedCount} onChange={() => toggleColumn('failedCount')} className="w-4 h-4 rounded text-blue-600" />
                     <span>عدد المواد الراسب فيها</span>
                   </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.status} onChange={() => toggleColumn('status')} className="w-4 h-4 rounded text-blue-600" />
                     <span>الوضعية</span>
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

      <div id="repeater-report" className={`${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="تحليل نتائج المعيدين" 
            metadata={metadata}
            subtitle={`إجمالي المعيدين: ${repeaterStats.totalRepeaters}`}
        />

        <div className="flex justify-between items-center no-print mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" />
                تحليل وضعية المعيدين
            </h2>
            <div className="flex gap-2">
                <button onClick={handleExport} className="btn-icon bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex gap-2">
                    <Download size={16} /> Excel
                </button>
                <button onClick={() => setShowPrintSettings(true)} className="btn-icon bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex gap-2">
                    <Settings size={16} /> إعدادات التقرير
                </button>
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 print:bg-white print:border-slate-800 print:border-2">
                <h4 className="text-red-800 print:text-black font-medium text-sm print:text-lg">عدد المعيدين</h4>
                <p className="text-3xl font-bold text-red-900 print:text-black print:text-4xl">{repeaterStats.totalRepeaters}</p>
                <p className="text-xs text-red-600 print:text-black mt-1 print:text-base">من أصل {students.length} تلميذ</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 print:border-slate-800 print:border-2">
                <h4 className="text-slate-500 print:text-black font-medium text-sm print:text-lg">معدل المعيدين</h4>
                <p className={`text-3xl font-bold ${repeaterStats.repeaterAverage >= 10 ? 'text-green-600' : 'text-red-600'} print:text-black print:text-4xl`}>
                    {repeaterStats.repeaterAverage.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 print:text-black mt-1 print:text-base">مقارنة بـ {repeaterStats.nonRepeaterAverage.toFixed(2)} للبقية</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 print:border-slate-800 print:border-2">
                <h4 className="text-slate-500 print:text-black font-medium text-sm print:text-lg">نسبة النجاح بينهم</h4>
                <p className="text-3xl font-bold text-slate-800 print:text-black print:text-4xl">{repeaterStats.successRate.toFixed(1)}%</p>
                <div className="flex gap-2 text-xs mt-1 print:text-black print:text-base">
                    <span className="text-pink-500 print:text-black">{repeaterStats.femaleRepeaters} إناث</span>
                    <span className="text-blue-500 print:text-black">{repeaterStats.maleRepeaters} ذكور</span>
                </div>
            </div>
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 print:bg-white print:border-slate-800 print:border-2">
                <h4 className="text-amber-800 print:text-black font-medium text-sm print:text-lg">المواد الأكثر ضعفاً</h4>
                <div className="text-xs text-amber-900 print:text-black mt-2 space-y-1 print:text-base print:font-bold">
                    {repeaterStats.subjectPerformance.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex justify-between">
                            <span className="truncate ml-2">{s.subject}</span>
                            <span className={`font-bold ${s.average < 10 ? 'text-red-600' : 'text-amber-700'} print:text-black`}>{s.average.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Subject Performance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 print:border-slate-800 page-break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-2xl print:mb-6 print:text-black">
                <TrendingDown className="text-red-500 print:hidden" size={20} />
                ترتيب المواد حسب معدل المعيدين (من الأضعف للأقوى)
            </h3>
            <div className="w-full min-w-0" style={{ height: 300 }} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={repeaterStats.subjectPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="subject" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0} 
                            height={80} 
                            tick={{fontSize: 11}}
                        />
                        <YAxis domain={[0, 20]} />
                        <Tooltip 
                            cursor={{fill: '#f3f4f6'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'المعدل 10', position: 'right', fill: '#ef4444', fontSize: 12 }} />
                        <Bar dataKey="average" name="معدل المعيدين" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                            {
                                repeaterStats.subjectPerformance.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.average < 10 ? '#ef4444' : '#10b981'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800 page-break-inside-avoid">
                <h3 className="font-bold text-slate-800 mb-4 print:text-2xl print:mb-6 print:text-black">مقارنة الأداء العام</h3>
                <div className="w-full min-w-0" style={{ height: 250 }} dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis domain={[0, 20]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="repeaters" name="معدل المعيدين" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="others" name="معدل غير المعيدين" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Students List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-800">
                <div className="p-4 border-b border-slate-100 bg-slate-50 print:bg-slate-200">
                    <h3 className="font-bold text-slate-800 print:text-xl print:text-black">قائمة التلاميذ المعيدين</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm print:text-lg text-right border border-slate-200 print:border-slate-900">
                        <thead className="bg-slate-50 text-slate-600 print:text-black font-medium border-b border-slate-200 print:border-slate-900">
                            <tr>
                                <th className="p-3 font-bold print:text-black">الاسم واللقب</th>
                                <th className={`p-3 font-bold print:text-black ${!printOptions.columns.gender ? 'hidden' : ''}`}>الجنس</th>
                                <th className={`p-3 font-bold print:text-black ${!printOptions.columns.average ? 'hidden' : ''}`}>المعدل الفصلي</th>
                                <th className={`p-3 font-bold print:text-black ${!printOptions.columns.failedCount ? 'hidden' : ''}`}>عدد المواد (أقل من 10)</th>
                                <th className={`p-3 font-bold print:text-black ${!printOptions.columns.status ? 'hidden' : ''}`}>الوضعية</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {repeaterStats.repeaters.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50 border-b print:border-slate-300">
                                    <td className="p-3 font-medium text-slate-900 print:text-black print:font-bold">{s.name}</td>
                                    <td className={`p-3 text-slate-500 print:text-black ${!printOptions.columns.gender ? 'hidden' : ''}`}>{s.gender}</td>
                                    <td className={`p-3 font-bold ${s.semesterAverage < 10 ? 'text-red-600' : 'text-green-600'} print:text-black ${!printOptions.columns.average ? 'hidden' : ''}`}>
                                        {s.semesterAverage.toFixed(2)}
                                    </td>
                                    <td className={`p-3 text-slate-600 print:text-black ${!printOptions.columns.failedCount ? 'hidden' : ''}`}>
                                        {Object.values(s.grades).filter(g => g < 10).length}
                                    </td>
                                    <td className={`p-3 ${!printOptions.columns.status ? 'hidden' : ''}`}>
                                        <span className={`px-2 py-1 rounded text-xs print:text-base font-bold print:border print:border-slate-900 print:bg-transparent print:text-black ${s.semesterAverage < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {s.semesterAverage < 10 ? 'راسب' : 'ناجح'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <ReportSignatures />
      </div>
    </div>
  );
};

export default RepeaterAnalysis;