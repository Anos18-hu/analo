import React, { useState, useMemo } from 'react';
import { Student, SubjectStats, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { Download, Printer, BarChart2, Settings, X, FileText, Scale } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { calculateCorrelation } from '../utils/statistics';
import { getSubjectAnalysis, getGlobalSemesterStats } from '../utils/dataProcessing';
import { downloadPDF } from '../utils/pdfGenerator';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';
import PrintSettingsModal from './PrintSettingsModal';

interface SubjectAnalysisProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: {
    average: boolean;
    passPercentage: boolean;
    stdDev: boolean;
    cv: boolean;
    mode: boolean;
    comparison: boolean;
  };
  chart: {
    showStudentNames: boolean;
    xAxisMode: 'names' | 'intervals';
  };
}

const SubjectAnalysis: React.FC<SubjectAnalysisProps> = ({ students, subjects, metadata }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [compareSubject1, setCompareSubject1] = useState<string>('');
  const [compareSubject2, setCompareSubject2] = useState<string>('');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'portrait',
    columns: {
      average: true,
      passPercentage: true,
      stdDev: true,
      cv: true,
      mode: true,
      comparison: true,
    },
    chart: {
      showStudentNames: true,
      xAxisMode: 'names'
    }
  });

  // Calculate detailed stats for ALL subjects (Memoized via util)
  const allSubjectsStats: SubjectStats[] = useMemo(() => {
    return getSubjectAnalysis(students, subjects);
  }, [students, subjects]);

  // Calculate Global Semester Statistics for Comparison (Memoized via util)
  const globalSemesterStats = useMemo(() => {
    return getGlobalSemesterStats(students);
  }, [students]);

  // Data for the All Subjects Comparison chart
  const subjectsComparisonChartData = useMemo(() => {
    return allSubjectsStats.map(stat => ({
      subject: stat.subject,
      average: stat.average,
      isHigher: stat.average >= globalSemesterStats.average
    }));
  }, [allSubjectsStats, globalSemesterStats]);

  const selectedSubjectData = useMemo(() => {
    if (!selectedSubject) return null;
    return allSubjectsStats.find(s => s.subject === selectedSubject);
  }, [selectedSubject, allSubjectsStats]);

  const comparisonData = useMemo(() => {
    if (!compareSubject1 || !compareSubject2) return null;
    
    // Get stats from pre-calculated array
    const s1 = allSubjectsStats.find(s => s.subject === compareSubject1);
    const s2 = allSubjectsStats.find(s => s.subject === compareSubject2);

    // Calculate Correlation: Need aligned arrays of grades where student has BOTH subjects
    const grades1: number[] = [];
    const grades2: number[] = [];

    students.forEach(s => {
      const g1 = s.grades[compareSubject1];
      const g2 = s.grades[compareSubject2];
      if (typeof g1 === 'number' && typeof g2 === 'number') {
        grades1.push(g1);
        grades2.push(g2);
      }
    });

    const correlation = calculateCorrelation(grades1, grades2);
    let correlationDesc = 'لا يوجد ارتباط';
    if (Math.abs(correlation) >= 0.7) correlationDesc = 'ارتباط قوي';
    else if (Math.abs(correlation) >= 0.3) correlationDesc = 'ارتباط متوسط';
    else if (Math.abs(correlation) > 0) correlationDesc = 'ارتباط ضعيف';

    return { s1, s2, correlation, correlationDesc };
  }, [compareSubject1, compareSubject2, allSubjectsStats, students]);

  // Data for "Names" mode (Individual Students)
  const chartData = useMemo(() => {
    if (!selectedSubject) return [];
    return students.map(student => ({
      name: student.name,
      grade: student.grades[selectedSubject] || 0
    })).filter(d => d.grade !== undefined);
  }, [selectedSubject, students]);

  // Data for "Intervals" mode (Distribution Histogram)
  const distributionChartData = useMemo(() => {
    if (!selectedSubject) return [];
    const grades = students.map(s => s.grades[selectedSubject]).filter(g => typeof g === 'number') as number[];
    
    const ranges = [
        { label: '< 8', min: 0, max: 8, color: '#ef4444' },
        { label: '8 - 10', min: 8, max: 10, color: '#f97316' }, 
        { label: '10 - 12', min: 10, max: 12, color: '#eab308' },
        { label: '12 - 15', min: 12, max: 15, color: '#84cc16' }, 
        { label: '15 - 20', min: 15, max: 21, color: '#10b981' }, 
    ];

    return ranges.map(range => ({
        name: range.label,
        count: grades.filter(g => g >= range.min && g < range.max).length,
        fill: range.color
    }));
  }, [selectedSubject, students]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(allSubjectsStats.map((row, idx) => ({
      '#': idx + 1,
      'المادة': row.subject,
      'المتوسط': row.average.toFixed(2),
      'نسبة النجاح': `${row.passPercentage.toFixed(2)}%`,
      'الانحراف المعياري': row.stdDev.toFixed(2),
      'معامل التشتت': `${row.cv.toFixed(2)}%`,
      'المنوال': row.mode,
      'عدد ≥ 15': row.countAbove15,
      'عدد 10-14': row.count10to14,
      'عدد 8-9': row.count8to9,
      'عدد < 8': row.countBelow8,
      'المقارنة مع المعدل العام': row.comparison
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تحليل المواد");
    XLSX.writeFile(wb, `تحليل_المواد.xlsx`);
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    setTimeout(async () => {
      await downloadPDF('subject-report', 'تحليل_المواد.pdf', printOptions.orientation);
      setIsPdfGenerating(false);
    }, 100);
  };

  const executePrint = () => {
    setShowPrintSettings(false);
    setTimeout(() => window.print(), 100);
  };

  const toggleChartOption = () => {
    setPrintOptions(prev => ({
      ...prev,
      chart: { ...prev.chart, showStudentNames: !prev.chart.showStudentNames }
    }));
  };

  const columnOptions = [
    { key: 'average', label: 'المتوسط' },
    { key: 'passPercentage', label: 'نسبة النجاح' },
    { key: 'stdDev', label: 'الانحراف المعياري' },
    { key: 'cv', label: 'معامل التشتت' },
    { key: 'mode', label: 'المنوال' },
    { key: 'comparison', label: 'المقارنة مع المعدل العام' },
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
        title="إعدادات التقرير (طباعة / PDF)"
      >
          {/* Custom Chart Settings */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">إعدادات الرسم البياني</h4>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-600 font-medium">نوع المحور الأفقي (العرض):</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="xAxisMode" 
                      checked={printOptions.chart.xAxisMode === 'names'} 
                      onChange={() => setPrintOptions(p => ({...p, chart: {...p.chart, xAxisMode: 'names'}}))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>أسماء التلاميذ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="xAxisMode" 
                      checked={printOptions.chart.xAxisMode === 'intervals'} 
                      onChange={() => setPrintOptions(p => ({...p, chart: {...p.chart, xAxisMode: 'intervals'}}))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>مجالات النقاط (فئات)</span>
                  </label>
                </div>
              </div>

              {printOptions.chart.xAxisMode === 'names' && (
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors border border-slate-100">
                  <input type="checkbox" checked={printOptions.chart.showStudentNames} onChange={toggleChartOption} className="w-4 h-4 rounded text-blue-600" />
                  <span>عرض الأسماء على المحور</span>
                </label>
              )}
            </div>
          </div>
      </PrintSettingsModal>
      
      {/* Container to capture for PDF/Print */}
      <div id="subject-report" className={`${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="تحليل نتائج المواد" 
            metadata={metadata}
            subtitle={selectedSubject ? `تفاصيل مادة: ${selectedSubject}` : 'تقرير شامل للمواد'} 
        />

        {/* Subject Selection & Detailed View */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print">
          <label className="block text-sm font-medium text-slate-700 mb-2">اختر مادة للتحليل التفصيلي</label>
          <div className="relative max-w-md">
            <BarChart2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">-- اختر مادة --</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Subject Details & Chart - Fix Grid for Print */}
        {selectedSubjectData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
               <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 print:text-2xl print:mb-6 print:text-black">إحصائيات {selectedSubject}</h3>
               <div className="space-y-3 print:space-y-4">
                 <StatRow 
                   label="المعدل" 
                   value={selectedSubjectData.average.toFixed(2)} 
                   color={selectedSubjectData.average >= 10 ? 'text-green-600' : 'text-red-600'} 
                 />
                 <StatRow 
                   label="نسبة النجاح" 
                   value={`${selectedSubjectData.passPercentage.toFixed(2)}%`} 
                   color={selectedSubjectData.passPercentage >= 50 ? 'text-green-600' : 'text-red-600'} 
                 />
                 <StatRow label="الانحراف المعياري" value={selectedSubjectData.stdDev.toFixed(2)} />
                 <StatRow label="معامل التشتت" value={`${selectedSubjectData.cv.toFixed(2)}%`} />
                 <StatRow label="المنوال" value={selectedSubjectData.mode.toString()} />
                 <div className="pt-2 mt-2 border-t text-sm print:text-lg">
                   <span className="text-slate-500 block mb-1 print:text-black">المقارنة مع المعدل العام:</span>
                   <span className={`font-bold ${
                     selectedSubjectData.comparison.includes('أعلى') ? 'text-green-600' : 
                     selectedSubjectData.comparison.includes('أقل') ? 'text-red-600' : 'text-slate-600'
                   } print:text-black`}>
                     {selectedSubjectData.comparison}
                   </span>
                 </div>
               </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px] print:border-slate-800 print:block">
              <h3 className="text-lg font-bold text-slate-800 mb-4 print:text-2xl print:mb-6 print:text-black">
                {printOptions.chart.xAxisMode === 'intervals' ? 'توزيع الفئات (Histogram)' : 'توزيع درجات التلاميذ'}
              </h3>
              <div className="w-full min-w-0" style={{ height: 320 }} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {printOptions.chart.xAxisMode === 'intervals' ? (
                     <BarChart data={distributionChartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          height={50}
                          tick={{fontSize: 12}}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="count" name="عدد التلاميذ" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {distributionChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                     </BarChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0} 
                        height={printOptions.chart.showStudentNames ? 80 : 30}
                        tick={printOptions.chart.showStudentNames ? {fontSize: 10} : false}
                      />
                      <YAxis domain={[0, 20]} />
                      <Tooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                      />
                      <ReferenceLine y={10} stroke="red" strokeDasharray="3 3" label="المعدل (10)" />
                      <Bar dataKey="grade" fill="#3b82f6" radius={[4, 4, 0, 0]} name="الدرجة" isAnimationActive={false} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* NEW COMPARISON SECTION */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 no-print">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Scale size={24} className="text-blue-600"/>
                مقارنة بين مادتين مع المعدل الفصلي
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">المادة الأولى</label>
                    <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={compareSubject1}
                        onChange={(e) => setCompareSubject1(e.target.value)}
                    >
                        <option value="">-- اختر مادة --</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">المادة الثانية</label>
                    <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={compareSubject2}
                        onChange={(e) => setCompareSubject2(e.target.value)}
                    >
                        <option value="">-- اختر مادة --</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {comparisonData && comparisonData.s1 && comparisonData.s2 && (
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-center">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="py-3 px-4 w-1/4">المعيار</th>
                                <th className="py-3 px-4 w-1/4 text-blue-700 text-lg border-l border-white">{comparisonData.s1.subject}</th>
                                <th className="py-3 px-4 w-1/4 text-purple-700 text-lg border-l border-white">{comparisonData.s2.subject}</th>
                                <th className="py-3 px-4 w-1/4 text-slate-700 text-lg border-l border-white bg-slate-200">المعدل العام</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <ComparisonRow 
                                label="المعدل" 
                                v1={comparisonData.s1.average.toFixed(2)} 
                                v2={comparisonData.s2.average.toFixed(2)} 
                                vGeneral={globalSemesterStats.average.toFixed(2)}
                                highlightHigher 
                            />
                            <ComparisonRow 
                                label="نسبة النجاح" 
                                v1={comparisonData.s1.passPercentage.toFixed(2) + '%'} 
                                v2={comparisonData.s2.passPercentage.toFixed(2) + '%'} 
                                vGeneral={globalSemesterStats.passPercentage.toFixed(2) + '%'}
                                highlightHigher 
                            />
                             <ComparisonRow 
                                label="معامل الارتباط"
                                v1={comparisonData.correlation.toFixed(3)}
                                v2={comparisonData.correlationDesc}
                                vGeneral="-"
                                customStyleV1={comparisonData.correlation > 0.5 ? 'text-green-600 font-bold' : 'text-slate-600'}
                            />
                            <ComparisonRow 
                                label="الانحراف المعياري" 
                                v1={comparisonData.s1.stdDev.toFixed(2)} 
                                v2={comparisonData.s2.stdDev.toFixed(2)} 
                                vGeneral={globalSemesterStats.stdDev.toFixed(2)}
                                highlightLower 
                            />
                            <ComparisonRow 
                                label="عدد الناجحين (≥10)" 
                                v1={comparisonData.s1.countAbove10} 
                                v2={comparisonData.s2.countAbove10} 
                                vGeneral={globalSemesterStats.countAbove10}
                                highlightHigher 
                            />
                            <ComparisonRow 
                                label="المنوال" 
                                v1={comparisonData.s1.mode} 
                                v2={comparisonData.s2.mode} 
                                vGeneral={globalSemesterStats.mode}
                            />
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Comparison of All Subjects Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 print:border-slate-800 page-break-inside-avoid">
           <h3 className="text-xl font-bold text-slate-800 mb-6 print:text-3xl flex items-center gap-2 print:text-black">
              <BarChart2 className="text-blue-600 print:hidden" />
              مقارنة متوسطات المواد مع المعدل العام
           </h3>
           <div className="w-full min-w-0" style={{ height: 350 }} dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={subjectsComparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis 
                   dataKey="subject" 
                   angle={-45} 
                   textAnchor="end" 
                   interval={0} 
                   height={80} 
                   tick={{fontSize: 12}} 
                 />
                 <YAxis domain={[0, 20]} />
                 <Tooltip 
                   cursor={{fill: '#f3f4f6'}}
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                 />
                 <ReferenceLine y={globalSemesterStats.average} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `المعدل العام (${globalSemesterStats.average.toFixed(2)})`, position: 'top', fill: '#f59e0b', fontSize: 12 }} />
                 <Bar dataKey="average" name="المتوسط" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {subjectsComparisonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isHigher ? '#10b981' : '#ef4444'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Full Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800 page-break-inside-avoid">
          <div className="flex justify-between items-center mb-6 no-print">
            <h3 className="text-xl font-bold text-slate-800">جدول متوسطات المواد</h3>
            <div className="flex gap-2">
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
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Settings size={16} />
                إعدادات التقرير
              </button>
            </div>
          </div>
          
          {/* Header visible in print */}
          <h3 className="text-xl font-bold text-slate-800 hidden print:block print:text-3xl print:mb-6 print:text-black">جدول متوسطات المواد</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-base text-center text-slate-600 border border-slate-200 print:border-slate-900">
              <thead className="text-xs print:text-lg text-slate-700 print:text-black uppercase bg-slate-100 print:bg-slate-200 border-b border-slate-200 print:border-slate-900">
                <tr>
                  <th className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black">#</th>
                  <th className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold text-right print:text-black">المادة</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.average ? 'print:hidden' : ''}`}>المتوسط</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold print:text-black ${!printOptions.columns.passPercentage ? 'print:hidden' : ''}`}>نسبة النجاح</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.stdDev ? 'print:hidden' : ''}`}>الانحراف</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.cv ? 'print:hidden' : ''}`}>التشتت</th>
                  <th className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.mode ? 'print:hidden' : ''}`}>المنوال</th>
                  <th className={`px-4 py-3 text-xs print:text-lg font-bold print:text-black ${!printOptions.columns.comparison ? 'print:hidden' : ''}`}>المقارنة مع المعدل العام</th>
                </tr>
              </thead>
              <tbody>
                {allSubjectsStats.map((row, index) => (
                  <tr key={index} className="bg-white border-b print:border-slate-300 hover:bg-slate-50">
                    <td className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-medium print:font-bold text-slate-900 print:text-black">{index + 1}</td>
                    <td className="px-4 py-3 border-l border-slate-200 print:border-slate-900 font-medium print:font-bold text-slate-900 print:text-black text-right">{row.subject}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold ${row.average >= 10 ? 'text-green-600' : 'text-red-600'} print:text-black ${!printOptions.columns.average ? 'print:hidden' : ''}`}>
                      {row.average.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 font-bold ${row.passPercentage >= 50 ? 'text-green-600' : 'text-red-600'} print:text-black ${!printOptions.columns.passPercentage ? 'print:hidden' : ''}`}>
                      {row.passPercentage.toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.stdDev ? 'print:hidden' : ''}`}>{row.stdDev.toFixed(2)}</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.cv ? 'print:hidden' : ''}`}>{row.cv.toFixed(2)}%</td>
                    <td className={`px-4 py-3 border-l border-slate-200 print:border-slate-900 hidden md:table-cell print:table-cell print:text-black ${!printOptions.columns.mode ? 'print:hidden' : ''}`}>{row.mode}</td>
                    <td className={`px-4 py-3 text-xs print:text-lg ${!printOptions.columns.comparison ? 'print:hidden' : ''}`}>
                      <span className={`px-2 py-1 rounded-full font-semibold print:border print:border-slate-800 print:bg-transparent print:text-black
                        ${row.comparison.includes('أعلى') ? 'bg-green-100 text-green-700' : 
                          row.comparison.includes('أقل') ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {row.comparison}
                      </span>
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

const StatRow = ({ label, value, color = 'text-slate-900' }: { label: string, value: string, color?: string }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-slate-500 text-sm print:text-lg print:text-black">{label}</span>
    <span className={`font-semibold text-lg print:text-black ${color}`}>{value}</span>
  </div>
);

const ComparisonRow = ({ label, v1, v2, vGeneral, highlightHigher, highlightLower, customStyleV1 }: { 
    label: string, 
    v1: string | number, 
    v2: string | number, 
    vGeneral?: string | number,
    highlightHigher?: boolean, 
    highlightLower?: boolean,
    customStyleV1?: string
}) => {
    let c1 = customStyleV1 || "text-slate-700 font-medium";
    let c2 = "text-slate-700 font-medium";
    const num1 = parseFloat(String(v1).replace('%',''));
    const num2 = parseFloat(String(v2).replace('%',''));

    if (!isNaN(num1) && !isNaN(num2) && num1 !== num2 && !customStyleV1) {
        if (highlightHigher) {
            if (num1 > num2) { c1 = "text-green-600 font-bold bg-green-50"; c2 = "text-red-500 bg-red-50"; }
            else if (num2 > num1) { c2 = "text-green-600 font-bold bg-green-50"; c1 = "text-red-500 bg-red-50"; }
        } else if (highlightLower) {
             if (num1 < num2) { c1 = "text-green-600 font-bold bg-green-50"; c2 = "text-red-500 bg-red-50"; }
            else if (num2 < num1) { c2 = "text-green-600 font-bold bg-green-50"; c1 = "text-red-500 bg-red-50"; }
        }
    }

    return (
        <tr className="hover:bg-slate-50 transition-colors border-b border-slate-50">
            <td className="py-3 px-4 font-medium text-slate-600 bg-slate-50/50">{label}</td>
            <td className={`py-3 px-4 ${c1} border-l border-slate-100`}>{v1}</td>
            <td className={`py-3 px-4 ${c2} border-l border-slate-100`}>{v2}</td>
            <td className="py-3 px-4 text-slate-700 font-bold bg-slate-50 border-l border-slate-200">{vGeneral}</td>
        </tr>
    );
}

export default SubjectAnalysis;