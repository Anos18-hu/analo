import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Layers, FileText } from 'lucide-react';
import { Student, ClassMetadata } from '../types';

interface FileUploadProps {
  onDataLoaded: (students: Student[], subjects: string[], metadata: ClassMetadata) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'multi'>('single');

  // Helper: Parse a single file and return data promise
  const parseExcelFile = (file: File): Promise<{ students: Student[], subjects: string[], metadata: ClassMetadata }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (rawData.length === 0) throw new Error("الملف فارغ.");

          // --- Metadata Extraction ---
          let metadata: ClassMetadata = {
              semester: '',
              schoolYear: '',
              className: '',
              level: '',
              stream: '',
              classNumber: '',
              directorate: '',
              schoolName: ''
          };

          if (rawData.length > 2) {
              const row3 = rawData[2];
              if (row3 && Array.isArray(row3)) metadata.directorate = row3.join(' ').replace(/\s+/g, ' ').trim();
          }
          if (rawData.length > 3) {
              const row4 = rawData[3];
              if (row4 && Array.isArray(row4)) metadata.schoolName = row4.join(' ').replace(/\s+/g, ' ').trim();
          }
          if (rawData.length > 4) {
              const row5 = rawData[4];
              if (row5 && Array.isArray(row5)) {
                  const fullText = row5.filter(c => c).join(' ').replace(/\s+/g, ' ').trim();
                  const words = fullText.split(' ');
                  if (words.length >= 7) {
                       metadata.semester = `${words[2] || ''} ${words[3] || ''}`.trim();
                       metadata.schoolYear = `${words[4] || ''}`.trim();
                       const level = `${words[5] || ''} ${words[6] || ''}`.trim();
                       metadata.level = level;
                       const classNum = words[words.length - 1] || '';
                       metadata.classNumber = classNum;
                       if (words.length > 8) {
                          const streamWords = words.slice(7, words.length - 1);
                          metadata.stream = streamWords.join(' ').trim();
                       } else {
                          metadata.stream = '';
                       }
                       metadata.className = `${level} ${metadata.stream} ${classNum}`.replace(/\s+/g, ' ').trim();
                  }
              }
          }

          // Header Row Detection
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(rawData.length, 20); i++) {
              const row = rawData[i];
              if (!row) continue;
              const rowString = row.slice(0, 10).join(' ').toLowerCase();
              if (rowString.includes('الاسم') || rowString.includes('اللقب') || rowString.includes('nom') || rowString.includes('prénom')) {
                  headerRowIndex = i;
                  break;
              }
          }
          if (headerRowIndex === -1) {
               if (rawData.length > 5 && rawData[5] && rawData[5].some(c => typeof c === 'string')) {
                   headerRowIndex = 5;
               } else {
                   headerRowIndex = 0;
               }
          }

          const jsonData = rawData.slice(headerRowIndex);
          while (jsonData.length > 0 && (!jsonData[jsonData.length - 1] || jsonData[jsonData.length - 1].every((cell) => !cell))) {
            jsonData.pop();
          }
          if (jsonData.length > 1) {
              const lastRow = jsonData[jsonData.length - 1];
              if (!lastRow[1]) jsonData.pop();
              else jsonData.pop(); // Remove summary row
          }

          if (jsonData.length < 1) throw new Error("الملف لا يحتوي على بيانات كافية.");

          const headerRow = jsonData[0];
          if (!headerRow || headerRow.length < 3) throw new Error("تنسيق الملف غير مدعوم.");

          let subjects: string[] = [];
          if (headerRow.length > 5) {
               const rawColumns = headerRow.slice(5) as string[];
               if (rawColumns.length > 0) subjects = rawColumns.slice(0, -1);
          }

          const students: Student[] = jsonData.slice(1).map((row, index): Student | null => {
              const name = row[1];
              if (!name) return null;
              const gender = row[3] || 'غير محدد';
              const repeaterVal = row[4];
              const isRepeater = String(repeaterVal || '').trim() === 'نعم';
              const gradesData = row.slice(5);
              const grades: { [subject: string]: number } = {};
              
              subjects.forEach((subj, i) => {
                  const val = gradesData[i];
                  let numVal = val;
                  if (typeof val === 'string') numVal = parseFloat(val.replace(',', '.'));
                  if (typeof numVal === 'number' && !isNaN(numVal)) grades[subj] = numVal;
              });

              let semesterAverage = 0;
              if (gradesData.length > 0) {
                  const avgVal = gradesData[gradesData.length - 1];
                  let numAvg = avgVal;
                  if (typeof avgVal === 'string') numAvg = parseFloat(avgVal.replace(',', '.'));
                  semesterAverage = (typeof numAvg === 'number' && !isNaN(numAvg)) ? numAvg : 0;
              }

              return {
                  id: `temp-${index}`, // Temporary ID
                  name,
                  gender,
                  grades,
                  semesterAverage,
                  originalRow: row,
                  isRepeater,
                  sourceClass: metadata.classNumber // Track origin class
              };
          }).filter((s): s is Student => s !== null);

          // Subject Filtering
          const activeSubjects = subjects.filter(subject => {
              return students.some(s => {
                  const grade = s.grades[subject];
                  return typeof grade === 'number' && grade > 0;
              });
          });

          resolve({ students, subjects: activeSubjects, metadata });

        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    setSuccess(null);
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    if (uploadMode === 'single' && fileArray.length > 1) {
        setError("لقد اخترت 'تحليل قسم واحد'، يرجى رفع ملف واحد فقط أو التبديل للوضع المتعدد.");
        return;
    }

    try {
        if (uploadMode === 'single') {
            // --- Single Mode ---
            const result = await parseExcelFile(fileArray[0]);
            // Finalize IDs
            const finalStudents = result.students.map((s, i) => ({ ...s, id: `student-${i}` }));
            setSuccess(`تم تحميل الملف بنجاح! (${finalStudents.length} تلميذ)`);
            setTimeout(() => {
                onDataLoaded(finalStudents, result.subjects, result.metadata);
            }, 1000);

        } else {
            // --- Multi Mode ---
            let combinedStudents: Student[] = [];
            let masterSubjects: string[] = [];
            let masterMetadata: ClassMetadata | null = null;
            let processedCount = 0;

            for (const [fileIndex, file] of fileArray.entries()) {
                const result = await parseExcelFile(file);
                
                // Validation: Check Level/Stream consistency
                if (masterMetadata) {
                    if (result.metadata.level !== masterMetadata.level) {
                         throw new Error(`خطأ: الملف "${file.name}" يختلف في المستوى الدراسي (${result.metadata.level}) عن الملف الأول (${masterMetadata.level}). يجب تحميل ملفات لنفس المستوى.`);
                    }
                    if (result.metadata.stream !== masterMetadata.stream) {
                         throw new Error(`خطأ: الملف "${file.name}" يختلف في الشعبة (${result.metadata.stream}) عن الملف الأول (${masterMetadata.stream}). يجب تحميل ملفات لنفس الشعبة.`);
                    }
                } else {
                    masterMetadata = result.metadata;
                    masterSubjects = result.subjects; // Use first valid file's subjects as master
                }

                // Merge Logic
                // Prefix IDs to prevent collision: fileIndex-studentIndex
                const studentsWithIds = result.students.map((s, i) => ({
                    ...s,
                    id: `f${fileIndex}-s${i}`,
                    // Ensure sourceClass is set
                    sourceClass: result.metadata.classNumber || '?' 
                }));

                combinedStudents.push(...studentsWithIds);
                processedCount++;
            }

            if (!masterMetadata) throw new Error("لم يتم استخراج بيانات صالحة.");

            // Update Metadata for Aggregated View
            const aggregatedMetadata: ClassMetadata = {
                ...masterMetadata,
                classNumber: 'كل الأقسام', // Override specific class number
                className: `${masterMetadata.level} ${masterMetadata.stream} (مجمع)`,
                isAggregated: true
            };

            setSuccess(`تم دمج ${processedCount} ملفات بنجاح! (الإجمالي: ${combinedStudents.length} تلميذ)`);
            setTimeout(() => {
                onDataLoaded(combinedStudents, masterSubjects, aggregatedMetadata);
            }, 1500);
        }

    } catch (err: any) {
        console.error(err);
        setError(err.message || "حدث خطأ غير متوقع.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [uploadMode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      
      {/* Mode Selection Toggle */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex mb-8">
          <button 
            onClick={() => setUploadMode('single')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                uploadMode === 'single' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
             <FileText size={20} />
             تحليل قسم واحد
          </button>
          <button 
            onClick={() => setUploadMode('multi')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                uploadMode === 'multi' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
             <Layers size={20} />
             تحليل مستوى / شعبة (متعدد)
          </button>
      </div>

      <div 
        className={`w-full max-w-2xl p-12 bg-white rounded-2xl shadow-xl border-2 border-dashed transition-all duration-300 relative overflow-hidden 
            ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : uploadMode === 'multi' ? 'border-purple-300 hover:border-purple-400' : 'border-gray-300 hover:border-blue-400'
            }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Decorative background icon */}
        {uploadMode === 'multi' && (
             <Layers className="absolute -right-10 -bottom-10 text-purple-50 w-64 h-64 pointer-events-none" />
        )}

        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className={`p-4 rounded-full ${uploadMode === 'multi' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            {uploadMode === 'multi' ? <Layers size={48} /> : <FileSpreadsheet size={48} />}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800">
              {uploadMode === 'multi' ? 'تحليل شامل (مستوى / شعبة)' : 'تحليل بيانات القسم'}
          </h2>
          
          <p className="text-gray-500 max-w-md">
            {uploadMode === 'multi' 
                ? 'قم بتحديد وسحب جميع ملفات الأقسام (Excel) الخاصة بنفس المستوى والشعبة لدمجها وتحليلها.' 
                : 'قم بسحب وإفلات ملف Excel للقسم هنا، أو انقر للاختيار.'}
            <br />
            <span className="text-sm text-gray-400">(.xlsx, .xls)</span>
          </p>
          
          <label className="cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              multiple={uploadMode === 'multi'}
            />
            <span className={`inline-flex items-center px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm
                ${uploadMode === 'multi' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
            `}>
              <Upload className="ml-2 w-5 h-5" />
              {uploadMode === 'multi' ? 'اختيار ملفات الأقسام' : 'اختيار ملف القسم'}
            </span>
          </label>

          {error && (
            <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg mt-4 w-full text-right dir-rtl">
              <AlertCircle className="w-5 h-5 ml-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg mt-4 w-full text-right dir-rtl">
              <AlertCircle className="w-5 h-5 ml-2 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;