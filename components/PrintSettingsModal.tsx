import React from 'react';
import { Settings, X, Printer, FileText } from 'lucide-react';

export interface BasePrintOptions {
  orientation: 'portrait' | 'landscape';
  columns: Record<string, boolean>;
  [key: string]: any;
}

interface ColumnOption {
    key: string;
    label: string;
}

interface PrintSettingsModalProps<T extends BasePrintOptions> {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onPdf: () => void;
  isPdfGenerating: boolean;
  printOptions: T;
  setPrintOptions: React.Dispatch<React.SetStateAction<T>>;
  columnOptions: ColumnOption[];
  children?: React.ReactNode; 
  title?: string;
}

const PrintSettingsModal = <T extends BasePrintOptions>({
    isOpen, onClose, onPrint, onPdf, isPdfGenerating,
    printOptions, setPrintOptions, columnOptions, children, title
}: PrintSettingsModalProps<T>) => {
    if (!isOpen) return null;

    const toggleColumn = (key: string) => {
        setPrintOptions(prev => ({
            ...prev,
            columns: {
                ...prev.columns,
                [key]: !prev.columns[key]
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-blue-700 p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Settings size={20} />
                        {title || "إعدادات الطباعة"}
                    </h3>
                    <button onClick={onClose} className="hover:bg-blue-600 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Orientation */}
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">اتجاه الصفحة</h4>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={printOptions.orientation === 'portrait'}
                                    onChange={() => setPrintOptions(p => ({ ...p, orientation: 'portrait' }))}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span>طولي (Portrait)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={printOptions.orientation === 'landscape'}
                                    onChange={() => setPrintOptions(p => ({ ...p, orientation: 'landscape' }))}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span>عرضي (Landscape)</span>
                            </label>
                        </div>
                    </div>

                    {/* Additional Settings (e.g. Charts) */}
                    {children}

                    {/* Columns */}
                    {columnOptions.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">الأعمدة الظاهرة</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {columnOptions.map((opt) => (
                                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={printOptions.columns[opt.key]}
                                            onChange={() => toggleColumn(opt.key)}
                                            className="w-4 h-4 rounded text-blue-600"
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0">
                    <button
                        onClick={onPrint}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Printer size={20} />
                        طباعة
                    </button>
                    <button
                        onClick={onPdf}
                        disabled={isPdfGenerating}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <FileText size={20} />
                        PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintSettingsModal;