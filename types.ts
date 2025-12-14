export interface Student {
  id: string;
  name: string;
  gender: string;
  grades: { [subject: string]: number };
  semesterAverage: number;
  originalRow: any[];
  isRepeater: boolean;
  sourceClass?: string; // To track which class the student belongs to in multi-upload mode
}

export interface ClassMetadata {
  schoolYear: string;
  semester: string;
  className: string;
  level?: string;
  stream?: string;
  classNumber?: string;
  directorate?: string;
  schoolName?: string;
  isAggregated?: boolean; // Flag to indicate if this is a multi-file analysis
}

export interface SubjectStats {
  subject: string;
  average: number;
  passPercentage: number;
  stdDev: number;
  cv: number; // Coefficient of Variation
  mode: number;
  countAbove15: number;
  count10to14: number;
  count8to9: number;
  countBelow8: number;
  countAbove10: number;
  comparison: string;
}

export interface GlobalStats {
  totalStudents: number;
  totalFemales: number;
  amazighStudents: number;
  artStudents: number;
  musicStudents: number;
  successfulStudents: number;
  successfulFemales: number;
  successfulMales: number;
  overallSuccessRate: number;
  femaleSuccessRate: number;
  maleSuccessRate: number;
}

export interface GeneralSubjectStats {
  subject: string;
  average: number;
  highest: number;
  lowest: number;
  countAbove15: number;
  countBelow10: number;
  studentCount: number;
}

export interface RepeaterStats {
  repeaters: Student[];
  totalRepeaters: number;
  femaleRepeaters: number;
  maleRepeaters: number;
  repeaterAverage: number;
  nonRepeaterAverage: number;
  successRate: number;
  subjectPerformance: { subject: string; average: number; }[];
}