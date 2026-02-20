import { Day, Teacher, Subject, ClassInfo, TimeSlot, TimetableEntry, TimetableVersion, SubstitutionSuggestion } from '@/types/school';

export const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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

export const mockTeachers: Teacher[] = [
  { teacherId: 't1', schoolId: 's1', name: 'Mrs. Sharma', teacherRole: 'ClassTeacher', subjectsCanTeach: ['Mathematics'], classesHandled: ['c1'], maxPeriodsPerDay: 6, maxPeriodsPerWeek: 30, availableDays: DAYS, isAbsent: false },
  { teacherId: 't2', schoolId: 's1', name: 'Mr. Patel', teacherRole: 'SubjectTeacher', subjectsCanTeach: ['Science', 'Physics'], classesHandled: ['c1', 'c2'], maxPeriodsPerDay: 6, maxPeriodsPerWeek: 28, availableDays: DAYS, isAbsent: false },
  { teacherId: 't3', schoolId: 's1', name: 'Ms. Gupta', teacherRole: 'SubjectTeacher', subjectsCanTeach: ['English', 'Literature'], classesHandled: ['c1', 'c2', 'c3'], maxPeriodsPerDay: 7, maxPeriodsPerWeek: 32, availableDays: DAYS, isAbsent: true },
  { teacherId: 't4', schoolId: 's1', name: 'Mr. Kumar', teacherRole: 'ClassTeacher', subjectsCanTeach: ['Hindi', 'Sanskrit'], classesHandled: ['c2'], maxPeriodsPerDay: 6, maxPeriodsPerWeek: 30, availableDays: WEEKDAYS, isAbsent: false },
  { teacherId: 't5', schoolId: 's1', name: 'Mrs. Reddy', teacherRole: 'SubjectTeacher', subjectsCanTeach: ['Social Science', 'History'], classesHandled: ['c1', 'c3'], maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, availableDays: DAYS, isAbsent: false },
  { teacherId: 't6', schoolId: 's1', name: 'Mr. Singh', teacherRole: 'SubjectTeacher', subjectsCanTeach: ['Physical Education'], classesHandled: ['c1', 'c2', 'c3'], maxPeriodsPerDay: 8, maxPeriodsPerWeek: 35, availableDays: DAYS, isAbsent: false },
  { teacherId: 't7', schoolId: 's1', name: 'Ms. Iyer', teacherRole: 'ClassTeacher', subjectsCanTeach: ['Computer Science'], classesHandled: ['c3'], maxPeriodsPerDay: 6, maxPeriodsPerWeek: 28, availableDays: DAYS, isAbsent: false },
];

export const mockClasses: ClassInfo[] = [
  { classId: 'c1', schoolId: 's1', grade: 'X', section: 'A', classTeacherId: 't1' },
  { classId: 'c2', schoolId: 's1', grade: 'X', section: 'B', classTeacherId: 't4' },
  { classId: 'c3', schoolId: 's1', grade: 'IX', section: 'A', classTeacherId: 't7' },
];

export const mockSubjects: Subject[] = [
  { subjectId: 's_math', classId: 'c1', subjectName: 'Mathematics', periodsPerWeek: 6, maxPerDay: 2, isLab: false, allowDoublePeriod: false, priority: 'Core', qualifiedTeacherIds: ['t1'] },
  { subjectId: 's_sci', classId: 'c1', subjectName: 'Science', periodsPerWeek: 6, maxPerDay: 2, isLab: false, allowDoublePeriod: true, priority: 'Core', qualifiedTeacherIds: ['t2'] },
  { subjectId: 's_eng', classId: 'c1', subjectName: 'English', periodsPerWeek: 6, maxPerDay: 2, isLab: false, allowDoublePeriod: false, priority: 'Core', qualifiedTeacherIds: ['t3'] },
  { subjectId: 's_hin', classId: 'c1', subjectName: 'Hindi', periodsPerWeek: 5, maxPerDay: 1, isLab: false, allowDoublePeriod: false, priority: 'Core', qualifiedTeacherIds: ['t4'] },
  { subjectId: 's_sst', classId: 'c1', subjectName: 'Social Science', periodsPerWeek: 5, maxPerDay: 1, isLab: false, allowDoublePeriod: false, priority: 'Core', qualifiedTeacherIds: ['t5'] },
  { subjectId: 's_pe', classId: 'c1', subjectName: 'Physical Education', periodsPerWeek: 3, maxPerDay: 1, isLab: false, allowDoublePeriod: false, priority: 'Activity', qualifiedTeacherIds: ['t6'] },
  { subjectId: 's_cs', classId: 'c1', subjectName: 'Computer Science', periodsPerWeek: 3, maxPerDay: 1, isLab: true, allowDoublePeriod: true, priority: 'Elective', qualifiedTeacherIds: ['t7'] },
];

const subjectColors: Record<string, string> = {
  'Mathematics': 'bg-info/10 text-info border-info/20',
  'Science': 'bg-success/10 text-success border-success/20',
  'English': 'bg-accent/10 text-accent border-accent/20',
  'Hindi': 'bg-warning/10 text-warning border-warning/20',
  'Social Science': 'bg-primary/10 text-primary border-primary/20',
  'Physical Education': 'bg-destructive/10 text-destructive border-destructive/20',
  'Computer Science': 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20',
};

export const getSubjectColor = (subjectName: string) => subjectColors[subjectName] || 'bg-muted text-muted-foreground border-border';

// Generate mock timetable
const generateEntries = (): TimetableEntry[] => {
  const entries: TimetableEntry[] = [];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const subjectRotation = mockSubjects;

  WEEKDAYS.forEach((day) => {
    let si = 0;
    periods.forEach((period) => {
      const subj = subjectRotation[si % subjectRotation.length];
      const teacher = mockTeachers.find(t => subj.qualifiedTeacherIds.includes(t.teacherId));
      entries.push({
        timetableId: `tt_${day}_${period}`,
        schoolId: 's1',
        classId: 'c1',
        day,
        period,
        timeSlot: `${mockWeekdaySlots.find(s => s.periodNumber === period)?.startTime || ''} - ${mockWeekdaySlots.find(s => s.periodNumber === period)?.endTime || ''}`,
        subjectId: subj.subjectId,
        teacherId: teacher?.teacherId || '',
        room: period === 7 && subj.isLab ? 'Lab 1' : `Room ${Math.ceil(period / 3)}`,
        status: 'approved',
        score: 92,
        generatedAt: '2025-02-20T10:30:00Z',
      });
      si++;
    });
  });

  // Saturday (fewer periods)
  [1, 2, 3, 4, 5].forEach((period, i) => {
    const subj = subjectRotation[i % subjectRotation.length];
    const teacher = mockTeachers.find(t => subj.qualifiedTeacherIds.includes(t.teacherId));
    entries.push({
      timetableId: `tt_Saturday_${period}`,
      schoolId: 's1',
      classId: 'c1',
      day: 'Saturday',
      period,
      timeSlot: `${mockSaturdaySlots.find(s => s.periodNumber === period)?.startTime || ''} - ${mockSaturdaySlots.find(s => s.periodNumber === period)?.endTime || ''}`,
      subjectId: subj.subjectId,
      teacherId: teacher?.teacherId || '',
      room: `Room 1`,
      status: 'approved',
      generatedAt: '2025-02-20T10:30:00Z',
    });
  });

  return entries;
};

export const mockTimetableVersion: TimetableVersion = {
  versionId: 'v1',
  schoolId: 's1',
  classId: 'c1',
  generatedAt: '2025-02-20T10:30:00Z',
  score: 92,
  status: 'approved',
  isActive: true,
  entries: generateEntries(),
};

export const mockSubstitutionSuggestions: SubstitutionSuggestion[] = [
  { teacherId: 't5', teacherName: 'Mrs. Reddy', reason: 'Free this period, familiar with class', compatibility: 85, currentLoad: 4 },
  { teacherId: 't6', teacherName: 'Mr. Singh', reason: 'Available, low workload today', compatibility: 60, currentLoad: 2 },
  { teacherId: 't7', teacherName: 'Ms. Iyer', reason: 'Can cover, different subject area', compatibility: 45, currentLoad: 5 },
];
