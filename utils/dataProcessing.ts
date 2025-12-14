import { Student, SubjectStats, GlobalStats, GeneralSubjectStats, RepeaterStats } from '../types';
import { 
  calculateAverage, 
  calculatePassPercentage, 
  calculateStandardDeviation, 
  calculateMode, 
  calculateCV 
} from './statistics';

// Simple memoization helper to cache results based on argument reference equality
function memoize<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
  let lastArgs: any[] | null = null;
  let lastResult: T | null = null;

  return (...args: any[]) => {
    if (lastArgs && 
        args.length === lastArgs.length && 
        args.every((arg, i) => arg === lastArgs![i])) {
      return lastResult!;
    }
    lastResult = fn(...args);
    lastArgs = args;
    return lastResult!;
  };
}

/**
 * Calculates detailed statistics for all subjects.
 * Cached to avoid recalculation on tab switches.
 */
export const getSubjectAnalysis = memoize((students: Student[], subjects: string[]): SubjectStats[] => {
    // Calculate global class average (Average of Semester Averages) for comparison
    const globalAverage = calculateAverage(students.map(s => s.semesterAverage));

    return subjects.map(subject => {
      const grades = students.map(s => s.grades[subject]).filter(g => typeof g === 'number');
      const average = calculateAverage(grades);
      const stdDev = calculateStandardDeviation(grades);

      return {
        subject,
        average,
        passPercentage: calculatePassPercentage(grades, 10),
        stdDev,
        cv: calculateCV(average, stdDev),
        mode: calculateMode(grades),
        countAbove15: grades.filter(g => g >= 15).length,
        count10to14: grades.filter(g => g >= 10 && g < 15).length,
        count8to9: grades.filter(g => g >= 8 && g < 10).length,
        countBelow8: grades.filter(g => g < 8).length,
        countAbove10: grades.filter(g => g >= 10).length,
        comparison: average > globalAverage ? 'أعلى من المعدل العام' : average < globalAverage ? 'أقل من المعدل العام' : 'مساوي للمعدل العام'
      };
    });
});

/**
 * Calculates global semester statistics (average, pass rate, etc.).
 */
export const getGlobalSemesterStats = memoize((students: Student[]) => {
    const semesterAverages = students.map(s => s.semesterAverage);
    return {
        average: calculateAverage(semesterAverages),
        passPercentage: calculatePassPercentage(semesterAverages, 10),
        countAbove10: semesterAverages.filter(a => a >= 10).length,
        stdDev: calculateStandardDeviation(semesterAverages),
        mode: calculateMode(semesterAverages)
    };
});

/**
 * Calculates global category statistics (Gender breakdown, overall success).
 */
export const getCategoryGlobalStats = memoize((students: Student[]): GlobalStats => {
    const totalStudents = students.length;
    const totalFemales = students.filter(s => s.gender === 'أنثى').length;
    
    const successfulStudents = students.filter(s => s.semesterAverage >= 10).length;
    const successfulFemales = students.filter(s => s.semesterAverage >= 10 && s.gender === 'أنثى').length;
    const successfulMales = students.filter(s => s.semesterAverage >= 10 && s.gender === 'ذكر').length;

    const totalMales = totalStudents - totalFemales;

    return {
      totalStudents,
      totalFemales,
      amazighStudents: 0, 
      artStudents: 0, 
      musicStudents: 0, 
      successfulStudents,
      successfulFemales,
      successfulMales,
      overallSuccessRate: totalStudents ? (successfulStudents / totalStudents) * 100 : 0,
      femaleSuccessRate: totalFemales ? (successfulFemales / totalFemales) * 100 : 0,
      maleSuccessRate: totalMales ? (successfulMales / totalMales) * 100 : 0
    };
});

/**
 * Calculates statistics for optional subjects.
 */
export const getOptionalSubjectsStats = memoize((students: Student[], optionalSubjects: string[]) => {
    return optionalSubjects.map(subject => {
        const grades = students
            .map(s => s.grades[subject])
            .filter(g => typeof g === 'number' && !isNaN(g));
        
        const count = grades.length;
        const average = calculateAverage(grades);
        const passPercentage = calculatePassPercentage(grades, 10);

        return { subject, count, average, passPercentage };
    });
});

/**
 * Calculates simplified stats for the grade distribution table.
 */
export const getDistributionStats = memoize((students: Student[], subjects: string[]) => {
    return subjects.map(subject => {
      const grades = students.map(s => s.grades[subject]).filter(g => typeof g === 'number');
      return {
        subject,
        average: calculateAverage(grades),
        passPercentage: calculatePassPercentage(grades, 10),
        stdDev: 0, cv: 0, mode: 0, comparison: '', // Not used in distribution table
        countAbove15: grades.filter(g => g >= 15).length,
        count10to14: grades.filter(g => g >= 10 && g < 15).length,
        count8to9: grades.filter(g => g >= 8 && g < 10).length,
        countBelow8: grades.filter(g => g < 8).length,
        countAbove10: grades.filter(g => g >= 10).length,
      };
    });
});

/**
 * Calculates summary statistics for general subject summary report.
 */
export const getGeneralSubjectSummary = memoize((students: Student[], subjects: string[]): GeneralSubjectStats[] => {
    return subjects.map(subject => {
      const grades = students
        .map(s => s.grades[subject])
        .filter(g => typeof g === 'number');

      const average = calculateAverage(grades);
      const highest = grades.length > 0 ? Math.max(...grades) : 0;
      const lowest = grades.length > 0 ? Math.min(...grades) : 0;
      const countAbove15 = grades.filter(g => g >= 15).length;
      const countBelow10 = grades.filter(g => g < 10).length;

      return {
        subject,
        average,
        highest,
        lowest,
        countAbove15,
        countBelow10,
        studentCount: grades.length
      };
    });
});

/**
 * Calculates statistics for repeaters analysis.
 */
export const getRepeaterStats = memoize((students: Student[], subjects: string[]): RepeaterStats => {
    const repeaters = students.filter(s => s.isRepeater);
    const nonRepeaters = students.filter(s => !s.isRepeater);
    
    // Stats calculation
    const totalRepeaters = repeaters.length;
    const femaleRepeaters = repeaters.filter(s => s.gender === 'أنثى').length;
    const maleRepeaters = totalRepeaters - femaleRepeaters;
    
    const repeaterAverage = calculateAverage(repeaters.map(s => s.semesterAverage));
    const nonRepeaterAverage = calculateAverage(nonRepeaters.map(s => s.semesterAverage));
    
    const successfulRepeaters = repeaters.filter(s => s.semesterAverage >= 10).length;
    const successRate = totalRepeaters ? (successfulRepeaters / totalRepeaters) * 100 : 0;

    // Calculate average for each subject for repeaters and sort ascending (worst first)
    const subjectPerformance = subjects.map(subject => {
        const grades = repeaters.map(s => s.grades[subject]).filter(g => typeof g === 'number');
        return {
            subject,
            average: calculateAverage(grades)
        };
    }).sort((a, b) => a.average - b.average);

    return {
      repeaters,
      totalRepeaters,
      femaleRepeaters,
      maleRepeaters,
      repeaterAverage,
      nonRepeaterAverage,
      successRate,
      subjectPerformance
    };
});