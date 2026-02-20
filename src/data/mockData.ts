import { Day, Teacher, Subject, ClassInfo, TimeSlot, TimetableVersion, SubstitutionSuggestion } from '@/types/school';

export const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ALL_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const DEFAULT_SECTIONS = ['A', 'B'];

export const AVAILABLE_SUBJECTS = [
  'English', 'Mathematics', 'Hindi', 'Marathi', 'Science', 'Social Science',
  'Computer Science', 'Physical Education', 'Art', 'EVS', 'Sanskrit',
  'Music', 'Geography', 'History', 'Physics', 'Chemistry', 'Biology',
  'Moral Science', 'General Knowledge', 'Environmental Science',
];

export const DEFAULT_SUBJECTS_PRIMARY = ['English', 'Mathematics', 'Hindi', 'Marathi', 'EVS', 'Art', 'Physical Education'];
export const DEFAULT_SUBJECTS_MIDDLE = ['English', 'Mathematics', 'Hindi', 'Marathi', 'Science', 'Social Science', 'Computer Science', 'Art', 'Physical Education'];
export const DEFAULT_SUBJECTS_SECONDARY = ['English', 'Mathematics', 'Hindi', 'Marathi', 'Science', 'Social Science', 'Computer Science', 'Physical Education', 'Sanskrit'];

export const getDefaultSubjectsForGrade = (grade: string): string[] => {
  const g = parseInt(grade);
  if (g <= 4) return DEFAULT_SUBJECTS_PRIMARY;
  if (g <= 8) return DEFAULT_SUBJECTS_MIDDLE;
  return DEFAULT_SUBJECTS_SECONDARY;
};

export const mockWeekdaySlots: TimeSlot[] = [
  { periodNumber: 1, startTime: '08:00', endTime: '08:40' },
  { periodNumber: 2, startTime: '08:40', endTime: '09:20' },
  { periodNumber: 3, startTime: '09:20', endTime: '10:00' },
  { periodNumber: 0, startTime: '10:00', endTime: '10:20', isBreak: true, label: 'Short Break' },
  { periodNumber: 4, startTime: '10:20', endTime: '11:00' },
  { periodNumber: 5, startTime: '11:00', endTime: '11:40' },
  { periodNumber: 6, startTime: '11:40', endTime: '12:20' },
  { periodNumber: 0, startTime: '12:20', endTime: '13:00', isBreak: true, label: 'Lunch Break' },
  { periodNumber: 7, startTime: '13:00', endTime: '13:40' },
  { periodNumber: 8, startTime: '13:40', endTime: '14:20' },
];

export const mockSaturdaySlots: TimeSlot[] = [
  { periodNumber: 1, startTime: '08:00', endTime: '08:40' },
  { periodNumber: 2, startTime: '08:40', endTime: '09:20' },
  { periodNumber: 3, startTime: '09:20', endTime: '10:00' },
  { periodNumber: 0, startTime: '10:00', endTime: '10:20', isBreak: true, label: 'Short Break' },
  { periodNumber: 4, startTime: '10:20', endTime: '11:00' },
  { periodNumber: 5, startTime: '11:00', endTime: '11:40' },
];

// Default divisions
export const defaultDivisionsPerGrade: Record<string, string[]> = {};
ALL_GRADES.forEach(g => { defaultDivisionsPerGrade[g] = ['A', 'B']; });

// Generate classes for all grades with default divisions
export const generateClasses = (divisionsPerGrade: Record<string, string[]>): ClassInfo[] => {
  const classes: ClassInfo[] = [];
  ALL_GRADES.forEach(grade => {
    const sections = divisionsPerGrade[grade] || ['A', 'B'];
    sections.forEach(section => {
      classes.push({
        classId: `c_${grade}_${section}`,
        schoolId: 's1',
        grade,
        section,
        classTeacherId: '',
        isEnabled: true,
      });
    });
  });
  return classes;
};

export const mockClasses: ClassInfo[] = generateClasses(defaultDivisionsPerGrade);

export const mockTeachers: Teacher[] = [];

// Generate default subjects for each class
export const generateSubjectsForClasses = (classes: ClassInfo[]): Subject[] => {
  return classes.flatMap(cls => {
    const subjectNames = getDefaultSubjectsForGrade(cls.grade);
    return subjectNames.map((name) => ({
      subjectId: `s_${cls.classId}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      classId: cls.classId,
      subjectName: name,
      periodsPerWeek: ['Mathematics', 'English', 'Science', 'Hindi'].includes(name) ? 6 : ['Social Science', 'Sanskrit', 'EVS', 'Marathi'].includes(name) ? 5 : 3,
      maxPerDay: ['Mathematics', 'English', 'Science'].includes(name) ? 2 : 1,
      isLab: name === 'Computer Science',
      allowDoublePeriod: name === 'Computer Science' || name === 'Science',
      priority: ['Art', 'Physical Education', 'Music'].includes(name) ? 'Activity' as const : ['Computer Science', 'Sanskrit'].includes(name) ? 'Elective' as const : 'Core' as const,
      qualifiedTeacherIds: [],
      needsPlayground: name === 'Physical Education',
    }));
  });
};

export const mockSubjects: Subject[] = generateSubjectsForClasses(mockClasses);

const subjectColors: Record<string, string> = {
  'Mathematics': 'bg-info/10 text-info border-info/20',
  'Science': 'bg-success/10 text-success border-success/20',
  'English': 'bg-accent/10 text-accent border-accent/20',
  'Hindi': 'bg-warning/10 text-warning border-warning/20',
  'Marathi': 'bg-primary/10 text-primary border-primary/20',
  'Social Science': 'bg-primary/10 text-primary border-primary/20',
  'Physical Education': 'bg-destructive/10 text-destructive border-destructive/20',
  'Computer Science': 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20',
  'Art': 'bg-accent/10 text-accent border-accent/20',
  'EVS': 'bg-success/10 text-success border-success/20',
  'Sanskrit': 'bg-primary/10 text-primary border-primary/20',
  'Music': 'bg-accent/10 text-accent border-accent/20',
};

export const getSubjectColor = (subjectName: string) => subjectColors[subjectName] || 'bg-muted text-muted-foreground border-border';

export const mockTimetableVersion: TimetableVersion = {
  versionId: 'v0',
  schoolId: 's1',
  classId: 'all',
  generatedAt: new Date().toISOString(),
  score: 0,
  status: 'draft',
  isActive: false,
  entries: [],
};

export const mockSubstitutionSuggestions: SubstitutionSuggestion[] = [];
