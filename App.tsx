import React, { useState, useEffect } from 'react';
import { Student, ClassMetadata } from './types';
import FileUpload from './components/FileUpload';
import StudentTracking from './components/StudentTracking';
import SubjectAnalysis from './components/SubjectAnalysis';
import GeneralSubjectSummary from './components/GeneralSubjectSummary';
import CategoryAnalysis from './components/CategoryAnalysis';
import RepeaterAnalysis from './components/RepeaterAnalysis';
import RemedialList from './components/RemedialList';
import PastRemedialAnalysis from './components/PastRemedialAnalysis';
import Footer from './components/Footer';
import { LayoutDashboard, Users, PieChart, GraduationCap, RotateCcw, Settings, X, CheckSquare, Square, ClipboardList, History, Table2 } from 'lucide-react';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<ClassMetadata | undefined>(undefined);
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);
  const [showSubjectSettings, setShowSubjectSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'students' | 'subjects' | 'subject_summary' | 'categories' | 'repeaters' | 'remedial' | 'past_remedial'>('upload');

  const handleDataLoaded = (loadedStudents: Student[], loadedSubjects: string[], loadedMetadata: ClassMetadata) => {
    setStudents(loadedStudents);
    setSubjects(loadedSubjects);
    setMetadata(loadedMetadata);
    
    // Auto-detect common optional subjects based on keywords
    const commonOptionalKeywords = ['تشكيلية', 'رسم', 'موسيقى', 'موسيقية', 'أمازيغية', 'امازيغية', 'بدنية', 'رياضة'];
    const detectedOptional = loadedSubjects.filter(subj => 
      commonOptionalKeywords.some(keyword => subj.includes(keyword))
    );
    setOptionalSubjects(detectedOptional);

    setActiveTab('students'); // Switch to students tab after upload
  };

  const toggleOptionalSubject = (subject: string) => {
    setOptionalSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const tabs = [
    { id: 'students', label: 'متابعة التلاميذ', icon: Users },
    { id: 'subjects', label: 'تحليل المواد', icon: PieChart },
    { id: 'subject_summary', label: 'ملخص المواد', icon: Table2 },
    { id: 'categories', label: 'تحليل الفئات', icon: LayoutDashboard },
    { id: 'repeaters', label: 'تحليل المعيدين', icon: RotateCcw },
    { id: 'remedial', label: 'المعنيين بالمعالجة والمتابعة', icon: ClipboardList },
    { id: 'past_remedial', label: 'مستدركو الماضي', icon: History },
  ];

  if (students.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-700 text-white p-6 shadow-lg">
          <div className="container mx-auto flex items-center gap-3">
             <GraduationCap size={32} />
             <h1 className="text-2xl font-bold">نظام تحليل البيانات المتقدمة</h1>
          </div>
        </header>
        <main className="flex-grow container mx-auto px-4">
          <FileUpload onDataLoaded={handleDataLoaded} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
               <GraduationCap size={28} />
               <h1 className="text-xl font-bold hidden md:block">نظام تحليل البيانات المتقدمة</h1>
               {metadata?.className && (
                   <span className="bg-blue-800 text-blue-100 text-sm px-2 py-1 rounded border border-blue-600 md:inline-block hidden">
                       {metadata.className} | {metadata.schoolYear}
                   </span>
               )}
            </div>
            
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowSubjectSettings(true)}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border border-blue-500"
                >
                  <Settings size={16} />
                  <span>تحديد المواد الاختيارية</span>
                </button>

                <button 
                  onClick={() => { setStudents([]); setSubjects([]); setMetadata(undefined); setActiveTab('upload'); }}
                  className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-lg transition-colors"
                >
                  تحميل ملف جديد
                </button>
            </div>
          </div>

          <div className="flex gap-1 mt-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap
                    ${isActive 
                      ? 'bg-slate-50 text-blue-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                      : 'text-blue-100 hover:bg-blue-600/50'}`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
               );
            })}
          </div>
        </div>
      </header>

      {/* Optional Subjects Modal */}
      {showSubjectSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-blue-700 p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings size={20} />
                تحديد المواد الاختيارية
              </h3>
              <button onClick={() => setShowSubjectSettings(false)} className="hover:bg-blue-600 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-4">
                قم بتحديد المواد التي تعتبر "اختيارية" أو "أنشطة" (مثل: التربية التشكيلية، الموسيقية، الأمازيغية).
                سيتم عرض إحصائيات خاصة لهذه المواد في قسم "تحليل الفئات".
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjects.map(subject => {
                  const isSelected = optionalSubjects.includes(subject);
                  return (
                    <div 
                      key={subject}
                      onClick={() => toggleOptionalSubject(subject)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}
                      `}
                    >
                      {isSelected 
                        ? <CheckSquare size={20} className="text-blue-600" />
                        : <Square size={20} className="text-slate-400" />
                      }
                      <span className="font-medium">{subject}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowSubjectSettings(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'students' && <StudentTracking students={students} subjects={subjects} metadata={metadata} />}
        {activeTab === 'subjects' && <SubjectAnalysis students={students} subjects={subjects} metadata={metadata} />}
        {activeTab === 'subject_summary' && <GeneralSubjectSummary students={students} subjects={subjects} metadata={metadata} />}
        {activeTab === 'categories' && <CategoryAnalysis students={students} subjects={subjects} optionalSubjects={optionalSubjects} metadata={metadata} />}
        {activeTab === 'repeaters' && <RepeaterAnalysis students={students} subjects={subjects} metadata={metadata} />}
        {activeTab === 'remedial' && <RemedialList students={students} subjects={subjects} metadata={metadata} />}
        {activeTab === 'past_remedial' && <PastRemedialAnalysis students={students} subjects={subjects} metadata={metadata} />}
      </main>

      <Footer />
    </div>
  );
};

export default App;