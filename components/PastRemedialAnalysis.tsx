import React, { useState, useMemo } from 'react';
import { Student, ClassMetadata } from '../types';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  BarChart2, 
  Trash2, 
  Download,
  Printer,
  FileText,
  ArrowLeft,
  CheckCircle,
  ListPlus,
  CheckSquare,
  Settings
} from 'lucide-react';
import { calculateAverage } from '../utils/statistics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { downloadPDF } from '../utils/pdfGenerator';
import ReportHeader from './ReportHeader';
import ReportSignatures from './ReportSignatures';

interface PastRemedialAnalysisProps {
  students: Student[];
  subjects: string[];
  metadata?: ClassMetadata;
}

interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: {
    gender: boolean;
    currentAvg: boolean;
    result: boolean;
    notes: boolean;
  };
}

const PastRemedialAnalysis: React.FC<PastRemedialAnalysisProps> = ({ students, subjects, metadata }) => {
  // State for selected student IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    orientation: 'portrait',
    columns: {
      gender: true,
      currentAvg: true,
      result: true,
      notes: true,
    }
  });

  // Filter students for the selection list
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      !selectedIds.includes(s.id) && 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, selectedIds, searchTerm]);

  // Get the actual student objects for the selected IDs
  const selectedGroup = useMemo(() => {
    return students.filter(s => selectedIds.includes(s.id));
  }, [students, selectedIds]);

  // Analysis Statistics
  const stats = useMemo(() => {
    if (selectedGroup.length === 0) return null;

    const groupAverage = calculateAverage(selectedGroup.map(s => s.semesterAverage));
    const classAverage = calculateAverage(students.map(s => s.semesterAverage));
    
    const passedCount = selectedGroup.filter(s => s.semesterAverage >= 10).length;
    const successRate = (passedCount / selectedGroup.length) * 100;

    // Subject breakdown
    const subjectAnalysis = subjects.map(subject => {
        const groupGrades = selectedGroup.map(s => s.grades[subject]).filter(g => typeof g === 'number');
        const classGrades = students.map(s => s.grades[subject]).filter(g => typeof g === 'number');

        return {
            subject,
            groupAvg: calculateAverage(groupGrades),
            classAvg: calculateAverage(classGrades),
            diff: calculateAverage(groupGrades) - calculateAverage(classGrades)
        };
    });

    return {
        groupAverage,
        classAverage,
        passedCount,
        successRate,
        subjectAnalysis
    };
  }, [selectedGroup, students, subjects]);

  const toggleStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSelectAllFiltered = () => {
      const newIds = filteredStudents.map(s => s.id);
      setSelectedIds(prev => [...prev, ...newIds]);
  };

  const handleClearSelection = () => {
      setSelectedIds([]);
  };

  const handleAddRepeaters = () => {
    const repeaters = students.filter(s => s.isRepeater).map(s => s.id);
    setSelectedIds(prev => Array.from(new Set([...prev, ...repeaters])));
  };

  const handleAddRemedialRange = () => {
    const remedial = students.filter(s => s.semesterAverage >= 9 && s.semesterAverage < 10).map(s => s.id);
    setSelectedIds(prev => Array.from(new Set([...prev, ...remedial])));
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(selectedGroup.map(s => ({
      'الاسم واللقب': s.name,
      'الجنس': s.gender,
      'المعدل الحالي': s.semesterAverage,
      'النتيجة': s.semesterAverage >= 10 ? 'ناجح' : 'راسب',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "مستدركو السنة الماضية");
    XLSX.writeFile(wb, 'تحليل_مستدركي_الماضي.xlsx');
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    setShowPrintSettings(false);
    setTimeout(async () => {
        await downloadPDF('past-remedial-report', 'تحليل_مستدركي_الماضي.pdf', printOptions.orientation);
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

  // --- Render Selection Mode ---
  if (isSelectionMode) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-600" />
                    اختيار قائمة المستدركين (السنة الماضية)
                </h2>
                <p className="text-slate-500 text-sm mt-1">قم باختيار التلاميذ الذين كانوا معنيين بالاستدراك السنة الماضية لتحليل نتائجهم الحالية.</p>
            </div>
            {selectedGroup.length > 0 && (
                <button 
                    onClick={() => setIsSelectionMode(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                    <BarChart2 size={20} />
                    تحليل النتائج ({selectedGroup.length})
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 h-[600px]">
            {/* Left Column: Available Students */}
            <div className="p-4 border-l border-slate-200 flex flex-col h-full">
                <div className="mb-4">
                    <h3 className="font-bold text-slate-700 mb-2">البحث والإضافة السريعة</h3>
                    
                    {/* Quick Select Buttons */}
                    <div className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <ListPlus size={14} />
                             إضافة مجموعات من الملف:
                        </span>
                        <div className="flex gap-2 flex-wrap">
                            <button 
                                onClick={handleSelectAllFiltered}
                                className="text-xs px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
                                title="إضافة جميع التلاميذ الظاهرين حالياً"
                            >
                                <CheckSquare size={14} /> إضافة الكل
                            </button>
                            <button 
                                onClick={handleAddRemedialRange}
                                className="text-xs px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 font-medium"
                                title="إضافة جميع التلاميذ الذين معدلهم بين 9.00 و 9.99"
                            >
                                <Plus size={14} /> إضافة المستدركين (9-9.99)
                            </button>
                            <button 
                                onClick={handleAddRepeaters}
                                className="text-xs px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1 font-medium"
                                title="إضافة جميع التلاميذ المعيدين"
                            >
                                <Plus size={14} /> إضافة المعيدين
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث بالاسم..." 
                            className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                        <span>العدد المتاح: {filteredStudents.length}</span>
                        {searchTerm && (
                            <button onClick={handleSelectAllFiltered} className="text-blue-600 hover:underline">
                                إضافة كل نتائج البحث
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredStudents.map(student => (
                        <div 
                            key={student.id} 
                            onClick={() => toggleStudent(student.id)}
                            className="flex justify-between items-center p-3 bg-slate-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200 group"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${student.semesterAverage >= 10 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="font-medium text-slate-700">{student.name}</span>
                            </div>
                            <button className="text-slate-400 group-hover:text-blue-600">
                                <Plus size={18} />
                            </button>
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <p className="text-center text-slate-400 py-8">لا توجد نتائج</p>
                    )}
                </div>
            </div>

            {/* Right Column: Selected Students */}
            <div className="p-4 flex flex-col h-full bg-slate-50/50">
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-blue-800">القائمة المختارة ({selectedGroup.length})</h3>
                    {selectedGroup.length > 0 && (
                        <button onClick={handleClearSelection} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                            <Trash2 size={12} />
                            إفراغ القائمة
                        </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {selectedGroup.map(student => (
                        <div 
                            key={student.id} 
                            className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-slate-200"
                        >
                            <span className="font-medium text-slate-800">{student.name}</span>
                            <button 
                                onClick={() => toggleStudent(student.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                    {selectedGroup.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                            <Users size={48} className="mb-2 opacity-50" />
                            <p>لم يتم اختيار أي تلميذ بعد</p>
                            <p className="text-xs mt-2 text-center max-w-xs">استخدم أزرار الإضافة السريعة أو البحث لإضافة تلاميذ</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- Render Analysis Mode ---
  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
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
                     <input type="checkbox" checked={printOptions.columns.currentAvg} onChange={() => toggleColumn('currentAvg')} className="w-4 h-4 rounded text-blue-600" />
                     <span>المعدل الحالي</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.result} onChange={() => toggleColumn('result')} className="w-4 h-4 rounded text-blue-600" />
                     <span>النتيجة</span>
                   </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                     <input type="checkbox" checked={printOptions.columns.notes} onChange={() => toggleColumn('notes')} className="w-4 h-4 rounded text-blue-600" />
                     <span>ملاحظات</span>
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

      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center no-print">
        <button 
            onClick={() => setIsSelectionMode(true)}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium transition-colors"
        >
            <ArrowLeft size={20} />
            العودة لتعديل القائمة
        </button>

        <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                <Download size={16} /> Excel
            </button>
            <button onClick={() => setShowPrintSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
                <Settings size={16} /> إعدادات التقرير
            </button>
        </div>
      </div>

      <div id="past-remedial-report" className={`${isPdfGenerating ? 'pdf-export-mode' : ''}`}>
        
        <ReportHeader 
            title="تقرير متابعة مستدركي السنة الماضية" 
            metadata={metadata}
            subtitle={`تحليل نتائج المجموعة المختارة (${selectedGroup.length} تلميذ)`} 
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-slate-800 print:border-2">
                <p className="text-slate-500 print:text-black text-sm font-medium mb-1 print:text-lg">عدد التلاميذ في القائمة</p>
                <h3 className="text-3xl font-bold text-slate-800 print:text-black print:text-4xl">{selectedGroup.length}</h3>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-slate-800 print:border-2">
                <p className="text-slate-500 print:text-black text-sm font-medium mb-1 print:text-lg">نسبة النجاح الحالية</p>
                <h3 className={`text-3xl font-bold ${stats.successRate >= 50 ? 'text-green-600' : 'text-red-600'} print:text-black print:text-4xl`}>
                    {stats.successRate.toFixed(1)}%
                </h3>
                <p className="text-xs text-slate-400 print:text-black mt-1 print:text-lg">{stats.passedCount} ناجح من {selectedGroup.length}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden print:border-slate-300 print:border-slate-800 print:border-2">
                <div className={`absolute top-0 right-0 w-2 h-full ${stats.groupAverage >= 10 ? 'bg-green-500' : 'bg-red-500'} print:hidden`}></div>
                <p className="text-slate-500 print:text-black text-sm font-medium mb-1 print:text-lg">معدل المجموعة</p>
                <h3 className="text-3xl font-bold text-slate-800 print:text-black print:text-4xl">{stats.groupAverage.toFixed(2)}</h3>
                <p className="text-xs text-slate-400 print:text-black mt-1 print:text-lg">المعدل العام للقسم: {stats.classAverage.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-slate-800 print:border-2">
                 <p className="text-slate-500 print:text-black text-sm font-medium mb-1 print:text-lg">الفارق عن القسم</p>
                 <h3 className={`text-3xl font-bold dir-ltr text-right ${stats.groupAverage >= stats.classAverage ? 'text-green-600' : 'text-red-500'} print:text-black print:text-4xl`}>
                    {stats.groupAverage >= stats.classAverage ? '+' : ''}{(stats.groupAverage - stats.classAverage).toFixed(2)}
                 </h3>
                 <p className="text-xs text-slate-400 print:text-black mt-1 print:text-lg">نقطة</p>
            </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 print:border-slate-800 page-break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-2xl print:mb-6 print:text-black">
                <BarChart2 className="text-blue-600 print:hidden" />
                مقارنة أداء المجموعة مع معدل القسم (حسب المواد)
            </h3>
            <div className="w-full min-w-0" style={{ height: 400 }} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.subjectAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <ReferenceLine y={10} stroke="#94a3b8" strokeDasharray="3 3" />
                        <Bar dataKey="groupAvg" name="معدل المجموعة" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="classAvg" name="معدل القسم العام" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-800">
            <div className="p-4 border-b border-slate-100 bg-slate-50 print:bg-slate-200">
                <h3 className="font-bold text-slate-800 print:text-xl print:text-black">تفاصيل نتائج التلاميذ المختارين</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm print:text-lg text-right border border-slate-200 print:border-slate-900">
                    <thead className="bg-slate-50 print:bg-slate-200 text-slate-600 print:text-black font-medium border-b border-slate-200 print:border-slate-900">
                        <tr>
                            <th className="p-3 font-bold print:text-black">#</th>
                            <th className="p-3 font-bold print:text-black">الاسم واللقب</th>
                            <th className={`p-3 font-bold print:text-black ${!printOptions.columns.gender ? 'hidden' : ''}`}>الجنس</th>
                            <th className={`p-3 font-bold print:text-black ${!printOptions.columns.currentAvg ? 'hidden' : ''}`}>المعدل الحالي</th>
                            <th className={`p-3 font-bold print:text-black ${!printOptions.columns.result ? 'hidden' : ''}`}>النتيجة</th>
                            <th className={`p-3 font-bold print:text-black ${!printOptions.columns.notes ? 'hidden' : ''}`}>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {selectedGroup.sort((a,b) => a.semesterAverage - b.semesterAverage).map((s, i) => (
                            <tr key={s.id} className="hover:bg-slate-50 border-b print:border-slate-300">
                                <td className="p-3 text-slate-500 print:text-black">{i + 1}</td>
                                <td className="p-3 font-medium text-slate-900 print:text-black print:font-bold">{s.name}</td>
                                <td className={`p-3 text-slate-500 print:text-black ${!printOptions.columns.gender ? 'hidden' : ''}`}>{s.gender}</td>
                                <td className={`p-3 font-bold ${s.semesterAverage < 10 ? 'text-red-600' : 'text-green-600'} print:text-black ${!printOptions.columns.currentAvg ? 'hidden' : ''}`}>
                                    {s.semesterAverage.toFixed(2)}
                                </td>
                                <td className={`p-3 ${!printOptions.columns.result ? 'hidden' : ''}`}>
                                    {s.semesterAverage >= 10 ? (
                                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs print:text-base print:bg-transparent print:border print:border-slate-900 print:text-black w-fit">
                                            <CheckCircle size={12} /> ناجح
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs print:text-base print:bg-transparent print:border print:border-slate-900 print:text-black w-fit">
                                            راسب
                                        </span>
                                    )}
                                </td>
                                <td className={`p-3 text-xs print:text-base text-slate-500 print:text-black ${!printOptions.columns.notes ? 'hidden' : ''}`}>
                                    {s.semesterAverage >= stats.classAverage ? 'أعلى من معدل القسم' : 'أقل من معدل القسم'}
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

export default PastRemedialAnalysis;