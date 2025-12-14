import React from 'react';

const ReportSignatures: React.FC = () => {
  return (
    <div className="hidden print:flex justify-between items-start mt-16 print:mt-12 pt-8 px-8 page-break-inside-avoid break-inside-avoid">
      {/* Right Side: Counselor */}
      <div className="text-center w-1/3">
        <p className="font-bold text-slate-900 mb-20">مستشار التوجيه والإرشاد المدرسي والمهني</p>
        <div className="border-t border-slate-300 w-3/4 mx-auto"></div>
      </div>

      {/* Left Side: Principal */}
      <div className="text-center w-1/3">
        <p className="font-bold text-slate-900 mb-20">مدير المؤسسة</p>
        <div className="border-t border-slate-300 w-3/4 mx-auto"></div>
      </div>
    </div>
  );
};

export default ReportSignatures;