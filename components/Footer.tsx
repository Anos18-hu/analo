import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-6 mt-12 no-print">
      <div className="container mx-auto px-4 text-center">
        <p className="text-slate-600 text-sm">
          برمجة و تصميم: <strong className="text-blue-600">عمار بولطيف</strong> - جميع الحقوق محفوظة &copy; 2025
        </p>
      </div>
    </footer>
  );
};

export default Footer;
