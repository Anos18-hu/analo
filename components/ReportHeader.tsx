import React from 'react';
import { ClassMetadata } from '../types';

interface ReportHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  metadata?: ClassMetadata;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, subtitle, metadata }) => {
  return (
    <div className="hidden print:block w-full mb-8 print:mb-6 font-sans text-black">
      {/* 1. Top Section: Republic & Ministry (Centered) */}
      <div className="flex flex-col items-center justify-center mb-6 space-y-2">
         <h5 className="text-xl font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h5>
         <h4 className="text-3xl font-black">وزارة التربية الوطنية</h4>
      </div>

      {/* 2. Middle Section: School Info (Right) & Class Info (Left) */}
      <div className="flex justify-between items-start border-b-[3px] border-black pb-4 mb-8 print:mb-6">
         
         {/* RIGHT: Directorate & School */}
         <div className="w-1/2 text-right space-y-2">
             {metadata?.directorate ? (
                <p className="text-xl font-bold">{metadata.directorate}</p>
             ) : (
                <p className="text-xl font-bold text-slate-400 border-b border-dashed border-slate-300 inline-block">مديرية التربية (غير محددة)</p>
             )}
             
             {metadata?.schoolName ? (
                <p className="text-xl font-bold">{metadata.schoolName}</p>
             ) : (
                <p className="text-xl font-bold text-slate-400 border-b border-dashed border-slate-300 inline-block">اسم المؤسسة (غير محدد)</p>
             )}
         </div>
         
         {/* LEFT: Academic Details */}
         <div className="w-1/2 text-left flex flex-col items-end space-y-2">
             {metadata?.schoolYear && (
                 <div className="text-xl font-bold">
                     السنة الدراسية: <span className="dir-ltr inline-block font-black">{metadata.schoolYear}</span>
                 </div>
             )}

             {/* Class Info */}
             {metadata?.level ? (
               <div className="flex flex-col items-end gap-1">
                  <div className="text-xl font-bold">
                    {metadata.level}
                  </div>
                  {metadata.stream && (
                    <div className="text-xl font-bold">
                      {metadata.stream}
                    </div>
                  )}
                  {/* Show Class Number ONLY if NOT aggregated */}
                  {metadata.classNumber && !metadata.isAggregated && (
                    <div className="text-xl font-bold mt-1 border-2 border-black px-3 py-1 rounded-lg">
                      القسم: {metadata.classNumber}
                    </div>
                  )}
                  {/* Show "All Classes" badge if aggregated */}
                  {metadata.isAggregated && (
                    <div className="text-xl font-bold mt-1 border-2 border-black bg-black text-white px-3 py-1 rounded-lg print:border-black print:text-black print:bg-transparent">
                      تحليل شامل (كل الأقسام)
                    </div>
                  )}
               </div>
             ) : (
               // Fallback
               metadata?.className && (
                 <div className="text-xl font-bold">
                     القسم: {metadata.className}
                 </div>
               )
             )}
         </div>
      </div>
      
      {/* 3. Title Section */}
      <div className="text-center mb-8 print:mb-6 mt-4">
          <div className="inline-block border-[3px] border-black py-3 px-12 bg-white rounded-xl">
             <h1 className="text-4xl font-black uppercase tracking-wide leading-tight">{title}</h1>
          </div>
          
          {(metadata?.semester || subtitle) && (
            <div className="mt-4 flex flex-col items-center gap-2">
                {metadata?.semester && (
                    <span className="font-bold text-2xl border-b-2 border-slate-400 pb-1 px-6">{metadata.semester}</span>
                )}
                {subtitle && (
                    <div className="text-xl font-bold text-slate-800 mt-2">
                        {subtitle}
                    </div>
                )}
            </div>
          )}
      </div>
    </div>
  );
};

export default ReportHeader;