import React, { useMemo, useState } from 'react';
import { Student, GlobalStats, SubjectStats, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, Users, FileText, Settings, X, PieChart } from 'lucide-react';
import { getCategoryGlobalStats, getOptionalSubjectsStats, getDistributionStats } from '../utils/dataProcessing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { downloadPDF } from '../utils/pdfGenerator';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';
import PrintSettingsModal from './PrintSettingsModal';

interface CategoryAnalysisProps {
  students: Student[];
  subjects: string[];
  optionalSubjects?: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  showCharts: boolean;
  columns: {
    excellent: boolean; // >= 15
    good: boolean; // 10-14.99
    average: boolean; // 8-9.99
    poor: boolean; // < 8
    classAvg: boolean;
    passedCount: boolean;
    passRate: boolean;
  };
}

const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({ students, subjects, optionalSubjects = [], metadata }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'portrait',
    showCharts: true,
    columns: {
      excellent: true,
      good: true,
      average: true,
      poor: true,
      classAvg: true,
      passedCount: true,
      passRate: true,
    }
  });

  const globalStats: GlobalStats = useMemo(() => {
    return getCategoryGlobalStats(students);
  }, [students]);

  const optionalSubjectsStats = useMemo(() => {
    return getOptionalSubjectsStats(students, optionalSubjects);
  }, [students, optionalSubjects]);

  const distributionStats: SubjectStats[] = useMemo(() => {
    return getDistributionStats(students, subjects);
  }, [students, subjects]);

  const chartData = useMemo(() => {
    return distributionStats.map(stat => ({
        subject: stat.subject,
        passPercentage: parseFloat(stat.passPercentage.toFixed(2))
    }));
  }, [distributionStats]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Stats Sheet
    const ws1Data: any = {
      'العدد الإجمالي': globalStats.totalStudents,
      'منهم الإناث': globalStats.totalFemales,
      'ناجحون (مجموع)': globalStats.successfulStudents,
      'نسبة النجاح': `${globalStats.overallSuccessRate.toFixed(2)}%`,
      'ناجحات (إناث)': globalStats.successfulFemales,
      'نسبة نجاح الإناث': `${globalStats.femaleSuccessRate.toFixed(2)}%`,
      'ناجحون (ذكور)': globalStats.successfulMales,
      'نسبة نجاح الذكور': `${globalStats.maleSuccessRate.toFixed(2)}%`
    };

    optionalSubjectsStats.forEach(stat => {
        ws1Data[`${stat.subject} (العدد)`] = stat.count;
        ws1Data[`${stat.subject} (المعدل)`] = stat.average.toFixed(2);
        ws1Data[`${stat.subject} (نسبة النجاح)`] = `${stat.passPercentage.toFixed(2)}%`;
    });

    const ws1 = XLSX.utils.json_to_sheet([ws1Data]);
    XLSX.utils.book_append_sheet(wb, ws1, "إحصائيات عامة");

    // Distribution Sheet
    const ws2 = XLSX.utils.json_to_sheet(distributionStats.map(d => ({
      'المادة': d.subject,
      'فئة ≥ 15': d.countAbove15,
      'فئة 10-14.99': d.count10to14,
      'فئة 8-9.99': d.count8to9,
      'فئة أقل من 8': d.countBelow8,
      'معدل القسم': d.average.toFixed(2),
      'عدد ≥ 10': d.countAbove10,
      'نسبة النجاح': `${d.passPercentage.toFixed(2)}%`
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "توزيع الدرجات");

    XLSX.writeFile(wb, 'تحليل_الفئات_الشامل.xlsx');
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    setTimeout(async () => {
        await downloadPDF('category-report', 'تحليل_الفئات.pdf', printOptions.orientation);
        setIsPdfGenerating(false);
    }, 100);
  };

  const executePrint = () => {
    setShowPrintSettings(false);
    setTimeout(() => window.print(), 100);
  };

  const columnOptions = [
    { key: 'excellent', label: 'فئة ≥ 15' },
    { key: 'good', label: 'فئة 10-14.99' },
    { key: 'average', label: 'فئة 8-9.99' },
    { key: 'poor', label: 'فئة أقل من 8' },
    { key: 'classAvg', label: 'معدل القسم' },
    { key: 'passedCount', label: 'عدد الناجحين' },
    { key: 'passRate', label: 'نسبة النجاح' },
  ];

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
      <PrintSettingsModal
        isOpen={showPrintSettings}
        onClose={() => setShowPrintSettings(false)}
        onPrint={executePrint}
        onPdf={handlePdfExport}
        isPdfGenerating={isPdfGenerating}
        printOptions={printOptions}
        setPrintOptions={setPrintOptions}
        columnOptions={columnOptions}
        title="إعدادات الطباعة والتقرير"
      >
          <div>
            <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">عناصر التقرير</h4>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                <input 
                  type="checkbox" 
                  checked={printOptions.showCharts} 
                  onChange={() => setPrintOptions(p => ({...p, showCharts: !p.showCharts}))} 
                  className="w-4 h-4 rounded text-blue-600" 
                />
                <span>إظهار الرسومات البيانية</span>
            </label>
          </div>
      </PrintSettingsModal>
      
      {/* Container for PDF Generation */}
      <div id="category-report" className={`${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="تحليل الفئات و النتائج" 
            metadata={metadata}
            subtitle="تقرير إحصائي شامل" 
        />

        <div className="flex justify-end gap-2 no-print">
           <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download size={16} />
            تصدير Excel
          </button>
          <button 
            onClick={() => setShowPrintSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Settings size={16} />
            إعدادات التقرير
          </button>
        </div>

        {/* General Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4 mt-6">
          <StatCard title="العدد الإجمالي" value={globalStats.totalStudents} icon={<Users size={20} className="text-blue-500" />} />
          <StatCard title="عدد الإناث" value={globalStats.totalFemales} subValue={`${globalStats.totalStudents > 0 ? ((globalStats.totalFemales/globalStats.totalStudents)*100).toFixed(1) : 0}%`} />
          <StatCard title="نسبة النجاح العامة" value={`${globalStats.overallSuccessRate.toFixed(2)}%`} color="text-green-600" />
          <StatCard title="عدد الناجحين" value={globalStats.successfulStudents} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 print:text-xl print:text-black">تفاصيل النجاح حسب الجنس</h4>
            <div className="space-y-4">
              <ProgressBar label="إناث" percentage={globalStats.femaleSuccessRate} count={globalStats.successfulFemales} total={globalStats.totalFemales} color="bg-pink-500" />
              <ProgressBar label="ذكور" percentage={globalStats.maleSuccessRate} count={globalStats.successfulMales} total={globalStats.totalStudents - globalStats.totalFemales} color="bg-blue-500" />
            </div>
          </div>
          
          {/* Optional Subjects Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 print:text-xl print:text-black">مواد اختيارية / أنشطة</h4>
            {optionalSubjectsStats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-4">
                    {optionalSubjectsStats.map(stat => (
                        <div key={stat.subject} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2 transition-all hover:shadow-md print:border-slate-900">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-700 truncate print:text-lg print:text-black">{stat.subject}</span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full shrink-0 print:border print:border-slate-900 print:text-black print:text-sm print:bg-transparent">{stat.count} تلميذ</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 print:border-slate-400">
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-500 block print:text-black print:text-sm">المعدل</span>
                                    <span className={`text-sm font-bold ${stat.average >= 10 ? 'text-green-600' : 'text-red-600'} print:text-lg print:text-black`}>
                                        {stat.average.toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-500 block print:text-black print:text-sm">النجاح</span>
                                    <span className={`text-sm font-bold ${stat.passPercentage >= 50 ? 'text-green-600' : 'text-red-600'} print:text-lg print:text-black`}>
                                        {stat.passPercentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p>لم يتم تحديد مواد اختيارية</p>
                    <p className="text-xs mt-1">يمكنك تحديد المواد من الإعدادات في أعلى الصفحة</p>
                </div>
            )}
          </div>
        </div>
        
        {/* Pass Percentage Chart */}
        {printOptions.showCharts && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 print:border-slate-800 page-break-inside-avoid">
            <h3 className="text-xl font-bold text-slate-800 mb-6 print:text-3xl print:text-black flex items-center gap-2">
                <PieChart className="text-blue-600 print:hidden" />
                نسب النجاح حسب المادة
            </h3>
            <div className="w-full min-w-0" style={{ height: 300 }} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                    dataKey="subject" 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0} 
                    height={80} 
                    tick={{fontSize: 12}}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                    <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" />
                    <Bar dataKey="passPercentage" fill="#10b981" radius={[4, 4, 0, 0]} name="نسبة النجاح %" isAnimationActive={false} />
                </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Grade Distribution Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 print:border-slate-800">
          <h3 className="text-xl font-bold text-slate-800 mb-6 print:text-3xl print:text-black">توزيع الدرجات حسب الفئات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-lg text-center text-slate-600 border border-slate-200 print:border-slate-900">
              <thead className="text-xs print:text-xl text-slate-700 print:text-black uppercase bg-slate-100 print:bg-slate-200 border-b border-slate-200 print:border-slate-900">
                <tr>
                  <th className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-right print:text-black">المادة</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-green-50 print:bg-white font-bold print:text-black ${!printOptions.columns.excellent ? 'hidden' : ''}`}>فئة ≥ 15</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-blue-50 print:bg-white font-bold print:text-black ${!printOptions.columns.good ? 'hidden' : ''}`}>فئة 10-14.99</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-orange-50 print:bg-white font-bold print:text-black ${!printOptions.columns.average ? 'hidden' : ''}`}>فئة 8-9.99</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-red-50 print:bg-white font-bold print:text-black ${!printOptions.columns.poor ? 'hidden' : ''}`}>فئة أقل من 8</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.classAvg ? 'hidden' : ''}`}>معدل القسم</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 print:text-black ${!printOptions.columns.passedCount ? 'hidden' : ''}`}>عدد ≥ 10</th>
                  <th className={`px-4 py-3 font-bold print:text-black ${!printOptions.columns.passRate ? 'hidden' : ''}`}>نسبة النجاح</th>
                </tr>
              </thead>
              <tbody>
                {distributionStats.map((row, index) => (
                  <tr key={index} className="bg-white border-b print:border-slate-300 hover:bg-slate-50">
                    <td className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-medium text-slate-900 print:text-black print:font-bold text-right">{row.subject}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-green-50/50 print:bg-transparent print:text-black ${!printOptions.columns.excellent ? 'hidden' : ''}`}>{row.countAbove15}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-blue-50/50 print:bg-transparent print:text-black ${!printOptions.columns.good ? 'hidden' : ''}`}>{row.count10to14}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-orange-50/50 print:bg-transparent print:text-black ${!printOptions.columns.average ? 'hidden' : ''}`}>{row.count8to9}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 bg-red-50/50 print:bg-transparent print:text-black ${!printOptions.columns.poor ? 'hidden' : ''}`}>{row.countBelow8}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.classAvg ? 'hidden' : ''}`}>{row.average.toFixed(2)}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 print:text-black ${!printOptions.columns.passedCount ? 'hidden' : ''}`}>{row.countAbove10}</td>
                    <td className={`px-4 py-3 font-bold ${row.passPercentage >= 50 ? 'text-green-600' : 'text-red-600'} print:text-black ${!printOptions.columns.passRate ? 'hidden' : ''}`}>
                      {row.passPercentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ReportSignatures />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon, color = 'text-slate-800' }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between print:border-slate-800 print:border-2">
    <div>
      <p className="text-sm font-medium text-slate-500 print:text-black mb-1 print:text-lg print:font-bold">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={`text-2xl font-bold ${color} print:text-black print:text-3xl`}>{value}</h3>
        {subValue && <span className="text-sm text-slate-400 print:text-black print:text-lg">({subValue})</span>}
      </div>
    </div>
    {icon && <div className="p-3 bg-slate-50 rounded-full print:hidden">{icon}</div>}
  </div>
);

const ProgressBar = ({ label, percentage, count, total, color }: any) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm font-medium text-slate-700 print:text-black print:text-lg print:font-bold">{label}</span>
      <span className="text-sm font-medium text-slate-500 print:text-black print:text-lg">{count} / {total} ({percentage.toFixed(1)}%)</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200 print:border-slate-800">
      <div className={`h-2.5 rounded-full ${color} print:bg-slate-800`} style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

export default CategoryAnalysis;